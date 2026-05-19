import pytest
from fastapi import status
from tests.factories import create_user
from app.core.config import settings
from app.core.security import create_access_token, verify_password
from datetime import timedelta
import time

@pytest.mark.asyncio
async def test_signup_success(client):
    response = await client.post(
        f"{settings.API_V1_STR}/auth/signup",
        json={
            "email": "test@example.com",
            "password": "securepassword123",
            "full_name": "Test User"
        },
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "id" in data

@pytest.mark.asyncio
async def test_login_success(client, db_session):
    email = "login@example.com"
    password = "correctpassword"
    await create_user(db_session, email=email, password=password)
    
    response = await client.post(
        f"{settings.API_V1_STR}/auth/login",
        data={"username": email, "password": password},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_failure(client, db_session):
    await create_user(db_session, email="fail@example.com", password="password123")
    
    response = await client.post(
        f"{settings.API_V1_STR}/auth/login",
        data={"username": "fail@example.com", "password": "wrongpassword"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

@pytest.mark.asyncio
async def test_refresh_token(client, db_session):
    user = await create_user(db_session)
    login_res = await client.post(
        f"{settings.API_V1_STR}/auth/login",
        data={"username": user.email, "password": "testpassword"},
    )
    refresh_token = login_res.json()["refresh_token"]
    
    response = await client.post(
        f"{settings.API_V1_STR}/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert response.status_code == status.HTTP_200_OK
    assert "access_token" in response.json()

@pytest.mark.asyncio
async def test_invalid_refresh_token(client):
    response = await client.post(
        f"{settings.API_V1_STR}/auth/refresh",
        json={"refresh_token": "invalid_token_here"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

@pytest.mark.asyncio
async def test_expired_token(client, db_session):
    user = await create_user(db_session)
    # Create an already expired token
    expired_token = create_access_token(subject=user.id, expires_delta=timedelta(minutes=-1))
    
    response = await client.get(
        f"{settings.API_V1_STR}/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"}
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "credentials" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_logout_blacklisting(client, db_session, mock_redis):
    user = await create_user(db_session)
    login_res = await client.post(
        f"{settings.API_V1_STR}/auth/login",
        data={"username": user.email, "password": "testpassword"},
    )
    token = login_res.json()["access_token"]
    
    # Logout
    logout_res = await client.post(
        f"{settings.API_V1_STR}/auth/logout",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert logout_res.status_code == status.HTTP_204_NO_CONTENT
    
    # Verify blacklist_token was called
    mock_redis.setex.assert_called()
    
    # Mock redis to return True for blacklisted token
    # In deps.py, we call redis_client.is_token_blacklisted(token)
    # which calls self.redis.exists(f"blacklist:{token}")
    mock_redis.exists.return_value = 1
    
    # Try to access /me with blacklisted token
    me_res = await client.get(
        f"{settings.API_V1_STR}/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_res.status_code == status.HTTP_401_UNAUTHORIZED

@pytest.mark.asyncio
async def test_password_hashing_verification(db_session):
    password = "supersecretpassword"
    user = await create_user(db_session, password=password)
    
    assert user.hashed_password != password
    assert verify_password(password, user.hashed_password)
    assert not verify_password("wrongpassword", user.hashed_password)
