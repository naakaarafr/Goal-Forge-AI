from typing import AsyncGenerator, List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.db.session import get_db
from app.db.redis import get_redis, redis_client
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService
from app.models.user import User, UserRole
from app.schemas.token import TokenPayload
import redis.asyncio as redis_async
from app.core.logging import logger

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

# Repositories & Services DI
async def get_user_repository(db: AsyncSession = Depends(get_db)) -> UserRepository:
    return UserRepository(User, db)

async def get_auth_service(
    repo: UserRepository = Depends(get_user_repository),
    cache: redis_async.Redis = Depends(get_redis)
) -> AuthService:
    return AuthService(repo, cache)

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: Optional[str] = Depends(OAuth2PasswordBearer(
        tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False
    )),
    cache: redis_async.Redis = Depends(get_redis)
) -> User:
    # 1. Check if token is missing
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    # --- From this point on, a token WAS provided.  ---
    # --- We must honour it: never silently swap to a different user. ---

    # 2. Check Redis Blacklist first (only if Redis is available)
    if cache and await cache.exists(f"blacklist:{token}"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
        )

    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=["HS256"]
        )
        token_data = TokenPayload(**payload)
        if token_data.sub is None:
            raise ValueError("No subject in token")
    except (JWTError, ValueError) as e:
        logger.error(f"JWT validation failed: {e}")
        # Token was provided but is invalid — always reject, even in DEBUG.
        # The frontend should handle 403 by redirecting to login / refreshing.
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Could not validate credentials: {e}",
        )
    
    user_repo = await get_user_repository(db)
    import uuid
    user = await user_repo.get(uuid.UUID(token_data.sub))
    
    if not user:
        logger.warning(f"User with ID {token_data.sub} not found in database.")
        # Token is valid but the user was deleted — always reject, even in DEBUG.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    return user


async def get_current_user_or_none(
    db: AsyncSession = Depends(get_db),
    token: Optional[str] = Depends(OAuth2PasswordBearer(
        tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False
    )),
    cache: redis_async.Redis = Depends(get_redis)
) -> Optional[User]:
    """
    Like get_current_user but returns None instead of raising 401.
    Used for endpoints that are also accessible in dev/mock-auth mode.
    In DEBUG mode, if no token is provided, returns None gracefully.
    """
    if not token:
        # Allow unauthenticated access in debug/dev mode
        if settings.DEBUG:
            return None
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    try:
        if cache and await cache.exists(f"blacklist:{token}"):
            return None
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        token_data = TokenPayload(**payload)
        if token_data.sub is None:
            return None
    except (JWTError, ValueError) as e:
        logger.error(f"JWT validation failed in or_none: {e}")
        if settings.DEBUG:
            return None
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Could not validate credentials: {e}",
        )
    user_repo = await get_user_repository(db)
    import uuid
    user = await user_repo.get(uuid.UUID(token_data.sub))
    return user


class RoleChecker:
    """RBAC Dependency to check user roles."""
    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)):
        if user.role not in self.allowed_roles and not user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The user doesn't have enough privileges",
            )
        return user
