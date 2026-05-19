import uuid
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserUpdate(UserBase):
    password: Optional[str] = None


class UserRead(UserBase):
    id: uuid.UUID
    role: str
    is_superuser: bool

    model_config = ConfigDict(from_attributes=True)
