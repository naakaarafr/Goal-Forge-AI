import pytest
from fastapi import status
from sqlalchemy import select
from tests.factories import create_user, create_goal
from app.models.user import UserRole
from app.models.audit import AuditLog
from app.models.enums import GoalStatus
from app.core.security import create_access_token
from app.core.config import settings
from app.services.audit_service import register_audit_listeners

@pytest.mark.asyncio
async def test_get_audit_logs_admin(client, db_session):
    register_audit_listeners()
    user = await create_user(db_session, role=UserRole.admin)
    token = create_access_token(subject=user.id)
    
    # Create some activity to log
    await create_goal(db_session, owner_id=user.id)
    
    response = await client.get(
        f"{settings.API_V1_STR}/audit/",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)

@pytest.mark.asyncio
async def test_get_audit_logs_unauthorized(client, db_session):
    register_audit_listeners()
    user = await create_user(db_session, role=UserRole.manager)
    token = create_access_token(subject=user.id)
    
    response = await client.get(
        f"{settings.API_V1_STR}/audit/",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.asyncio
async def test_automated_audit_on_goal_create_and_update(client, db_session):
    register_audit_listeners()
    admin = await create_user(db_session, role=UserRole.admin)
    token = create_access_token(subject=admin.id)
    
    # 1. Create a goal via client request to verify request context variables are correctly populated
    payload = {
        "title": "API Test Goal",
        "thrust_area": "Growth",
        "uom": "percentage",
        "target_value": 100.0,
        "current_value": 0.0,
        "weightage": 20,
        "quarter": "2024-Q3"
    }
    
    response = await client.post(
        f"{settings.API_V1_STR}/goals/",
        headers={"Authorization": f"Bearer {token}"},
        json=payload
    )
    assert response.status_code == status.HTTP_200_OK
    goal_id = response.json()["id"]
    
    # Verify AuditLog created automatically for CREATE action with correct actor_id
    res = await db_session.execute(select(AuditLog).where(AuditLog.entity_id == goal_id, AuditLog.action == "CREATE"))
    log = res.scalars().first()
    assert log is not None
    assert str(log.actor_id) == str(admin.id)
    
    # 2. Update the goal to trigger UPDATE log
    update_payload = {
        "title": "API Test Goal - Updated"
    }
    response = await client.patch(
        f"{settings.API_V1_STR}/goals/{goal_id}",
        headers={"Authorization": f"Bearer {token}"},
        json=update_payload
    )
    assert response.status_code == status.HTTP_200_OK
    
    # Verify AuditLog created automatically for UPDATE
    res = await db_session.execute(select(AuditLog).where(AuditLog.entity_id == goal_id, AuditLog.action == "UPDATE"))
    log = res.scalars().first()
    assert log is not None
    assert str(log.actor_id) == str(admin.id)
    assert log.old_values.get("title") == "API Test Goal"
    assert log.new_values.get("title") == "API Test Goal - Updated"

@pytest.mark.asyncio
async def test_audit_logs_immutability(db_session):
    register_audit_listeners()
    # Ensure attempting to update or delete AuditLog triggers a PermissionError
    log = AuditLog(
        entity_name="Goal",
        entity_id="11111111-1111-1111-1111-111111111111",
        action="UPDATE"
    )
    db_session.add(log)
    await db_session.commit()
    
    # Attempt update
    log.action = "HACKED"
    with pytest.raises(PermissionError):
        await db_session.commit()
        
    await db_session.rollback()
    
    # Attempt delete
    await db_session.delete(log)
    with pytest.raises(PermissionError):
        await db_session.commit()
    
    await db_session.rollback()

@pytest.mark.asyncio
async def test_audit_after_lock_date(client, db_session):
    register_audit_listeners()
    admin = await create_user(db_session, role=UserRole.admin)
    
    # Create goal directly, mark it as locked (or approved/submitted)
    goal = await create_goal(db_session, owner_id=admin.id, status=GoalStatus.approved, thrust_area="Test")
    
    # Make a direct DB modification to trigger listener
    goal.title = "Updated After Lock"
    await db_session.flush()
    await db_session.commit()
    
    # Verify AuditLog has after_lock flag in new_values
    res = await db_session.execute(select(AuditLog).where(AuditLog.entity_id == goal.id, AuditLog.action == "UPDATE"))
    log = res.scalars().first()
    assert log is not None
    assert "after_lock" in log.new_values
    assert log.new_values["after_lock"] is True

@pytest.mark.asyncio
async def test_audit_wildcard_search(client, db_session):
    register_audit_listeners()
    admin = await create_user(db_session, role=UserRole.admin)
    token = create_access_token(subject=admin.id)
    
    # Create some logs with specific content
    goal1 = await create_goal(db_session, owner_id=admin.id, title="UniqueXyz123")
    goal2 = await create_goal(db_session, owner_id=admin.id, title="StandardTitle")
    
    response = await client.get(
        f"{settings.API_V1_STR}/audit/?search=UniqueXyz123",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    # At least one log should match the UniqueXyz123 wildcard query
    assert len(data) >= 1
    assert any("UniqueXyz123" in str(log["new_values"]) for log in data)
