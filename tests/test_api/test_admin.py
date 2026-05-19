import pytest
from fastapi import status
from tests.factories import create_user
from app.models.user import UserRole
from app.core.security import create_access_token
from app.core.config import settings

@pytest.mark.asyncio
async def test_admin_only_success(client, db_session):
    user = await create_user(db_session, role=UserRole.admin)
    token = create_access_token(subject=user.id)
    
    response = await client.get(
        f"{settings.API_V1_STR}/admin/admin-only",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"message": "Hello Admin"}

@pytest.mark.asyncio
async def test_admin_only_forbidden(client, db_session):
    user = await create_user(db_session, role=UserRole.manager)
    token = create_access_token(subject=user.id)
    
    response = await client.get(
        f"{settings.API_V1_STR}/admin/admin-only",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.asyncio
async def test_manager_only_success(client, db_session):
    user = await create_user(db_session, role=UserRole.manager)
    token = create_access_token(subject=user.id)
    
    response = await client.get(
        f"{settings.API_V1_STR}/admin/manager-only",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"message": "Hello Manager"}

@pytest.mark.asyncio
async def test_admin_unlock_goal(client, db_session):
    admin = await create_user(db_session, role=UserRole.admin)
    token = create_access_token(subject=admin.id)
    
    from tests.factories import create_goal
    from app.models.enums import GoalStatus
    
    goal = await create_goal(db_session, owner_id=admin.id, status=GoalStatus.approved, thrust_area="Test")
    
    payload = {"reason": "Testing force unlock"}
    response = await client.post(
        f"{settings.API_V1_STR}/admin/goals/{str(goal.id)}/unlock",
        headers={"Authorization": f"Bearer {token}"},
        json=payload
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["message"] == "Goal unlocked successfully"
