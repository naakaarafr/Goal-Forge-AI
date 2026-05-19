from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from app.api import deps
from app.services.auth_service import AuthService
from app.schemas.user import UserCreate, UserRead
from app.schemas.token import Token
from app.models.user import User
from app.core.config import settings
from app.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

@router.post("/signup", response_model=UserRead)
async def signup(
    user_in: UserCreate,
    auth_service: AuthService = Depends(deps.get_auth_service)
):
    """Register a new user."""
    return await auth_service.register_user(user_in)


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    auth_service: AuthService = Depends(deps.get_auth_service)
):
    """OAuth2 compatible token login."""
    user = await auth_service.authenticate(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    return auth_service.create_tokens(user)


@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token: str = Body(..., embed=True),
    auth_service: AuthService = Depends(deps.get_auth_service)
):
    """Refresh access token using a refresh token."""
    return await auth_service.refresh_access_token(refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    token: str = Depends(deps.reusable_oauth2),
    auth_service: AuthService = Depends(deps.get_auth_service)
):
    """Invalidate the current token."""
    await auth_service.logout(token)
    return None


@router.get("/me", response_model=UserRead)
async def read_user_me(
    current_user: User = Depends(deps.get_current_user),
):
    """Get current user information."""
    return current_user


@router.post("/dev-login", response_model=Token)
async def dev_login(
    db: AsyncSession = Depends(get_db),
    auth_service: AuthService = Depends(deps.get_auth_service)
):
    """
    DEV ONLY: Auto-login as a dev admin user.
    Creates the dev user if they don't exist. Disabled in production.
    """
    if not settings.DEBUG:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found",  # Don't reveal the endpoint exists in production
        )

    DEV_EMAIL = "dev@goalforge.ai"
    DEV_NAME = "Dev Admin"
    DEV_PASSWORD = "dev-password-local-only"

    from app.repositories.user_repository import UserRepository
    from app.models.enums import UserRole
    from app.core.security import get_password_hash
    user_repo = UserRepository(User, db)

    user = await user_repo.get_by_email(DEV_EMAIL)
    if not user:
        new_user = User(
            email=DEV_EMAIL,
            full_name=DEV_NAME,
            hashed_password=get_password_hash(DEV_PASSWORD),
            role=UserRole.admin,
            is_active=True,
            is_superuser=True,
        )
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        user = new_user

    return auth_service.create_tokens(user)


from pydantic import BaseModel

class ImpersonateRequest(BaseModel):
    email: str

@router.post("/impersonate", response_model=Token)
async def impersonate(
    req: ImpersonateRequest,
    db: AsyncSession = Depends(get_db),
    auth_service: AuthService = Depends(deps.get_auth_service),
    current_user: User = Depends(deps.get_current_user_or_none)
):
    """
    Impersonate another user by email.
    Generates a valid JWT for the target email without requiring password.
    Restricted to Admins, or bypasses authorization checks in DEBUG mode.
    """
    is_authorized = settings.DEBUG or (current_user and (current_user.is_superuser or current_user.role == "admin"))
    
    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to impersonate users"
        )
        
    from app.repositories.user_repository import UserRepository
    user_repo = UserRepository(User, db)
    
    target_user = await user_repo.get_by_email(req.email)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_444_CONNECTION_CLOSED if hasattr(status, 'HTTP_444_CONNECTION_CLOSED') else status.HTTP_404_NOT_FOUND,
            detail=f"User with email '{req.email}' not found"
        )
        
    return auth_service.create_tokens(target_user)
