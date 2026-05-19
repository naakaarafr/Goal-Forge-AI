from typing import Optional, Tuple
from fastapi import HTTPException, status
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate
from app.schemas.token import Token
from app.core.security import (
    verify_password, 
    get_password_hash, 
    create_access_token, 
    create_refresh_token,
    decode_token
)
from app.models.user import User
import redis.asyncio as redis


class AuthService:
    def __init__(self, user_repo: UserRepository, cache: redis.Redis):
        self.user_repo = user_repo
        self.cache = cache

    async def authenticate(self, email: str, password: str) -> Optional[User]:
        user = await self.user_repo.get_by_email(email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    async def register_user(self, user_in: UserCreate) -> User:
        user = await self.user_repo.get_by_email(user_in.email)
        if user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The user with this email already exists.",
            )
        
        user_data = user_in.model_dump()
        password = user_data.pop("password")
        user_data["hashed_password"] = get_password_hash(password)
        
        db_obj = User(**user_data)
        self.user_repo.db.add(db_obj)
        await self.user_repo.db.flush()
        await self.user_repo.db.refresh(db_obj)
        return db_obj

    def create_tokens(self, user: User) -> Token:
        access_token = create_access_token(subject=user.id)
        refresh_token = create_refresh_token(subject=user.id)
        return Token(
            access_token=access_token, 
            refresh_token=refresh_token,
            token_type="bearer"
        )

    async def refresh_access_token(self, refresh_token: str) -> Token:
        try:
            payload = decode_token(refresh_token)
            if payload.get("type") != "refresh":
                raise ValueError("Invalid token type")
            user_id = payload.get("sub")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        import uuid
        user = await self.user_repo.get(uuid.UUID(user_id))
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )

        # Token Rotation: Issue new tokens and blacklist the old refresh token
        # (Optional but recommended for high security)
        # For simplicity in this base, we just issue a new access token
        return self.create_tokens(user)

    async def logout(self, token: str):
        """Blacklist the token in Redis (if available)."""
        if self.cache:
            await self.cache.setex(f"blacklist:{token}", 86400, "true")
