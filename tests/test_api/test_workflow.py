import pytest
from fastapi import status
from tests.factories import create_user, create_goal
from app.models.enums import GoalStatus, UserRole
from app.core.config import settings
from app.core.security import create_access_token

@pytest.mark.asyncio
async def test_approve_goal_success(client, db_session):
    manager = await create_user(db_session, role=UserRole.manager)
    emp = await create_user(db_session, manager_id=manager.id)
    goal = await create_goal(db_session, owner_id=emp.id, status=GoalStatus.submitted)
    
    token = create_access_token(subject=manager.id)
    
    response = await client.post(
        f"{settings.API_V1_STR}/workflow/{goal.id}/approve",
        headers={"Authorization": f"Bearer {token}"},
        json={"comment": "Great job, approved!"}
    )
    assert response.status_code == status.HTTP_200_OK
    
    await db_session.refresh(goal)
    assert goal.status == GoalStatus.approved
    assert goal.is_locked is True

@pytest.mark.asyncio
async def test_rework_goal_success(client, db_session):
    manager = await create_user(db_session, role=UserRole.manager)
    emp = await create_user(db_session, manager_id=manager.id)
    goal = await create_goal(db_session, owner_id=emp.id, status=GoalStatus.submitted)
    
    token = create_access_token(subject=manager.id)
    
    response = await client.post(
        f"{settings.API_V1_STR}/workflow/{goal.id}/rework",
        headers={"Authorization": f"Bearer {token}"},
        json={"comment": "Please add more metrics."}
    )
    assert response.status_code == status.HTTP_200_OK
    
    await db_session.refresh(goal)
    assert goal.status == GoalStatus.draft
    assert goal.is_locked is False

@pytest.mark.asyncio
async def test_unauthorized_approval_fails(client, db_session):
    manager1 = await create_user(db_session, role=UserRole.manager)
    manager2 = await create_user(db_session, role=UserRole.manager)
    emp = await create_user(db_session, manager_id=manager1.id)
    goal = await create_goal(db_session, owner_id=emp.id, status=GoalStatus.submitted)
    
    # Manager 2 tries to approve Manager 1's employee
    token = create_access_token(subject=manager2.id)
    
    response = await client.post(
        f"{settings.API_V1_STR}/workflow/{goal.id}/approve",
        headers={"Authorization": f"Bearer {token}"},
        json={"comment": "I am not your manager but I approve."}
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.asyncio
async def test_approve_draft_fails(client, db_session):
    manager = await create_user(db_session, role=UserRole.manager)
    emp = await create_user(db_session, manager_id=manager.id)
    goal = await create_goal(db_session, owner_id=emp.id, status=GoalStatus.draft)
    
    token = create_access_token(subject=manager.id)
    
    response = await client.post(
        f"{settings.API_V1_STR}/workflow/{goal.id}/approve",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST

@pytest.mark.asyncio
async def test_approval_history_logged(client, db_session):
    manager = await create_user(db_session, role=UserRole.manager)
    emp = await create_user(db_session, manager_id=manager.id)
    goal = await create_goal(db_session, owner_id=emp.id, status=GoalStatus.submitted)
    
    token = create_access_token(subject=manager.id)
    
    # Approve
    await client.post(
        f"{settings.API_V1_STR}/workflow/{goal.id}/approve",
        headers={"Authorization": f"Bearer {token}"},
        json={"comment": "History check."}
    )
    
    # Check history
    response = await client.get(
        f"{settings.API_V1_STR}/workflow/{goal.id}/history",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["from_status"] == "submitted"
    assert data[0]["to_status"] == "approved"
    assert data[0]["comment"] == "History check."
