import pytest
from fastapi import status
from tests.factories import create_user, create_department
from app.models.user import UserRole
from app.core.config import settings
from app.core.security import create_access_token

@pytest.mark.asyncio
async def test_create_department(client, db_session):
    admin = await create_user(db_session, role=UserRole.admin)
    token = create_access_token(subject=admin.id)
    
    # Assuming we have a department creation endpoint (let's add a basic test for the concept)
    # Since I haven't added a dedicated POST /departments, I'll focus on hierarchy first
    pass

@pytest.mark.asyncio
async def test_hierarchy_traversal(client, db_session):
    """
    Test 3-level hierarchy:
    CEO -> Manager -> Employee
    """
    ceo = await create_user(db_session, full_name="CEO", role=UserRole.admin)
    manager = await create_user(db_session, full_name="Manager", manager_id=ceo.id, role=UserRole.manager)
    emp = await create_user(db_session, full_name="Employee", manager_id=manager.id)
    
    token = create_access_token(subject=ceo.id)
    
    # Test subordinates recursive
    response = await client.get(
        f"{settings.API_V1_STR}/org/subordinates/{ceo.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 2
    names = [u["full_name"] for u in data]
    assert "Manager" in names
    assert "Employee" in names

@pytest.mark.asyncio
async def test_reporting_line(client, db_session):
    ceo = await create_user(db_session, full_name="CEO")
    manager = await create_user(db_session, full_name="Manager", manager_id=ceo.id)
    emp = await create_user(db_session, full_name="Employee", manager_id=manager.id)
    
    token = create_access_token(subject=emp.id)
    
    response = await client.get(
        f"{settings.API_V1_STR}/org/reporting-line/{emp.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 2
    assert data[0]["full_name"] == "Manager"
    assert data[1]["full_name"] == "CEO"

@pytest.mark.asyncio
async def test_cycle_prevention(client, db_session):
    """
    Test that assigning a manager as a subordinate of their own subordinate fails.
    """
    ceo = await create_user(db_session, role=UserRole.admin)
    manager = await create_user(db_session, manager_id=ceo.id)
    emp = await create_user(db_session, manager_id=manager.id)
    
    token = create_access_token(subject=ceo.id)
    
    # Try to make 'emp' the manager of 'ceo' -> Should fail
    response = await client.post(
        f"{settings.API_V1_STR}/org/reassign/{ceo.id}?new_manager_id={emp.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "cycle" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_reassign_manager_success(client, db_session):
    admin = await create_user(db_session, role=UserRole.admin)
    manager1 = await create_user(db_session)
    manager2 = await create_user(db_session)
    emp = await create_user(db_session, manager_id=manager1.id)
    
    token = create_access_token(subject=admin.id)
    
    response = await client.post(
        f"{settings.API_V1_STR}/org/reassign/{emp.id}?new_manager_id={manager2.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    
    # Verify change
    await db_session.refresh(emp)
    assert emp.manager_id == manager2.id

@pytest.mark.asyncio
async def test_rbac_org_reassign_fails_for_employee(client, db_session):
    emp1 = await create_user(db_session, role=UserRole.employee)
    emp2 = await create_user(db_session)
    manager = await create_user(db_session)
    
    token = create_access_token(subject=emp1.id)
    
    response = await client.post(
        f"{settings.API_V1_STR}/org/reassign/{emp2.id}?new_manager_id={manager.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
