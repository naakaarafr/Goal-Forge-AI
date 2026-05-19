import pytest
from fastapi import status
from tests.factories import create_user, create_goal
from app.models.user import UserRole
from app.core.security import create_access_token
from app.core.config import settings

@pytest.mark.asyncio
async def test_push_goal_success(client, db_session):
    manager = await create_user(db_session, role=UserRole.manager)
    employee = await create_user(db_session, role=UserRole.employee, manager_id=manager.id)
    token = create_access_token(subject=manager.id)
    
    goal = await create_goal(db_session, owner_id=manager.id)
    
    response = await client.post(
        f"{settings.API_V1_STR}/sharing/push/{goal.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"weightage": 20}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0

@pytest.mark.asyncio
async def test_sync_goal_success(client, db_session):
    user = await create_user(db_session)
    token = create_access_token(subject=user.id)
    goal = await create_goal(db_session, owner_id=user.id)
    
    response = await client.post(
        f"{settings.API_V1_STR}/sharing/sync/{goal.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"message": "Synchronization complete."}
