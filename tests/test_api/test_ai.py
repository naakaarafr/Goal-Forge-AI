import pytest
from fastapi import status
from tests.factories import create_user
from app.core.security import create_access_token
from app.core.config import settings

@pytest.mark.asyncio
async def test_generate_goals_actual(client, db_session):
    user = await create_user(db_session)
    token = create_access_token(subject=user.id)
    
    # Real call to Gemini
    response = await client.post(
        f"{settings.API_V1_STR}/ai/generate-goals",
        headers={"Authorization": f"Bearer {token}"},
        json={"role": "Backend Developer", "context": "Focus on high-availability FastAPI systems"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "title" in data[0]

@pytest.mark.asyncio
async def test_analyze_goal_actual(client, db_session):
    user = await create_user(db_session)
    token = create_access_token(subject=user.id)
    
    # Real call to Gemini
    response = await client.post(
        f"{settings.API_V1_STR}/ai/analyze-goal",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Implement 100% test coverage", "target_value": 100, "uom": "PERCENTAGE"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "score" in data
    assert "feedback" in data
