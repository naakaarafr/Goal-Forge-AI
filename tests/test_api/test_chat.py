import pytest
from fastapi import status
from tests.factories import create_user
from app.core.security import create_access_token
from app.core.config import settings

@pytest.mark.asyncio
async def test_chat_actual(client, db_session):
    user = await create_user(db_session)
    token = create_access_token(subject=user.id)
    
    # Real call to Gemini
    response = await client.post(
        f"{settings.API_V1_STR}/chat/",
        headers={"Authorization": f"Bearer {token}"},
        json={"message": "What is GoalForge AI?"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "response" in data
    assert len(data["response"]) > 0
