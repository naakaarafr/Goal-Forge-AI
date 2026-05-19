import pytest
from fastapi import status
from app.core.config import settings

@pytest.mark.asyncio
async def test_trigger_escalations_success(client):
    response = await client.post(
        f"{settings.API_V1_STR}/tasks/run-escalations",
        headers={"X-Task-Secret": "super-secret-task-key"}
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "Escalation check completed"}

@pytest.mark.asyncio
async def test_trigger_escalations_unauthorized(client):
    response = await client.post(
        f"{settings.API_V1_STR}/tasks/run-escalations",
        headers={"X-Task-Secret": "wrong-secret"}
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
