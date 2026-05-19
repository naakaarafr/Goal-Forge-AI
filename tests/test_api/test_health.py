import pytest
from fastapi import status
from app.core.config import settings

@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get(f"{settings.API_V1_STR}/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] in ["online", "degraded"]
    assert "database" in data
    assert "redis" in data
    assert data["version"] == "1.0.0"
