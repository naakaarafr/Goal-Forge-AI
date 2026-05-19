import pytest
from fastapi import status
from tests.factories import create_user, create_goal
from app.models.user import UserRole
from app.models.enums import PerformanceRating
from app.core.security import create_access_token
from app.core.config import settings

@pytest.mark.asyncio
async def test_list_team_members_success(client, db_session):
    # Create a manager
    manager = await create_user(db_session, role=UserRole.manager)
    token = create_access_token(subject=manager.id)
    
    # Create subordinates
    emp1 = await create_user(db_session, manager_id=manager.id, email="emp1@example.com")
    emp2 = await create_user(db_session, manager_id=manager.id, email="emp2@example.com")
    
    # Create some goals for subordinates
    await create_goal(db_session, owner_id=emp1.id, title="Sub Goal 1", progress=50.0)
    await create_goal(db_session, owner_id=emp2.id, title="Sub Goal 2", progress=80.0)
    
    response = await client.get(
        f"{settings.API_V1_STR}/manager/team",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 2
    assert any(d["email"] == "emp1@example.com" for d in data)
    assert any(d["email"] == "emp2@example.com" for d in data)

@pytest.mark.asyncio
async def test_list_team_members_quarter_filter(client, db_session):
    # Create a manager
    manager = await create_user(db_session, role=UserRole.manager)
    token = create_access_token(subject=manager.id)
    
    # Create subordinate
    emp = await create_user(db_session, manager_id=manager.id, email="emp_filter@example.com")
    
    # Create goal in Q1 and goal in Q2
    await create_goal(db_session, owner_id=emp.id, title="Q1 Initiative", progress=100.0, quarter="2024-Q1")
    await create_goal(db_session, owner_id=emp.id, title="Q2 Initiative", progress=40.0, quarter="2024-Q2")
    
    # Force SQLAlchemy to expire the subordinate object's in-memory cached goals list
    db_session.expire_all()
    
    # Get Q1 team summaries
    response_q1 = await client.get(
        f"{settings.API_V1_STR}/manager/team?quarter=2024-Q1",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response_q1.status_code == status.HTTP_200_OK
    data_q1 = response_q1.json()
    assert len(data_q1) == 1
    assert data_q1[0]["total_goals"] == 1
    assert data_q1[0]["avg_progress"] == 100.0
    
    # Get Q2 team summaries
    response_q2 = await client.get(
        f"{settings.API_V1_STR}/manager/team?quarter=2024-Q2",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response_q2.status_code == status.HTTP_200_OK
    data_q2 = response_q2.json()
    assert len(data_q2) == 1
    assert data_q2[0]["total_goals"] == 1
    assert data_q2[0]["avg_progress"] == 40.0

@pytest.mark.asyncio
async def test_get_employee_summary(client, db_session):
    manager = await create_user(db_session, role=UserRole.manager)
    token = create_access_token(subject=manager.id)
    
    emp = await create_user(db_session, manager_id=manager.id, email="emp@example.com")
    await create_goal(db_session, owner_id=emp.id, title="Q1 Goal", progress=60.0, weightage=30.0, quarter="2024-Q1")
    await create_goal(db_session, owner_id=emp.id, title="Q1 Goal 2", progress=80.0, weightage=70.0, quarter="2024-Q1")
    
    response = await client.get(
        f"{settings.API_V1_STR}/manager/team/{emp.id}/summary?quarter=2024-Q1",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["employee_id"] == str(emp.id)
    assert data["total_goals"] == 2
    assert data["total_weightage"] == 100.0
    # weighted: (60*30 + 80*70)/100 = 74.0
    assert data["weighted_achievement_score"] == 74.0

@pytest.mark.asyncio
async def test_submit_quarterly_feedback(client, db_session):
    manager = await create_user(db_session, role=UserRole.manager)
    token = create_access_token(subject=manager.id)
    
    emp = await create_user(db_session, manager_id=manager.id)
    
    payload = {
        "employee_id": str(emp.id),
        "quarter": "2024-Q1",
        "performance_rating": PerformanceRating.exceeds_expectations.value,
        "strengths": "Great communication and excellent technical output.",
        "development_areas": "Time management under high load.",
        "discussion_summary": "Discussed roadmap and alignment.",
        "is_finalized": True
    }
    
    response = await client.post(
        f"{settings.API_V1_STR}/manager/team/{emp.id}/feedback",
        json=payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["performance_rating"] == "exceeds_expectations"
    assert data["is_finalized"] is True
    assert data["finalized_at"] is not None

@pytest.mark.asyncio
async def test_get_team_member_discussion_history(client, db_session):
    manager = await create_user(db_session, role=UserRole.manager)
    token = create_access_token(subject=manager.id)
    
    emp = await create_user(db_session, manager_id=manager.id)
    goal = await create_goal(db_session, owner_id=emp.id, quarter="2024-Q1")
    
    response = await client.get(
        f"{settings.API_V1_STR}/manager/team/{emp.id}/discussion-history?quarter=2024-Q1",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)

@pytest.mark.asyncio
async def test_manager_rbac_forbidden(client, db_session):
    emp_user = await create_user(db_session, role=UserRole.employee)
    token = create_access_token(subject=emp_user.id)
    
    response = await client.get(
        f"{settings.API_V1_STR}/manager/team",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.asyncio
async def test_add_team_member(client, db_session):
    manager = await create_user(db_session, role=UserRole.manager)
    token = create_access_token(subject=manager.id)
    
    payload = {
        "email": "new_team_member@example.com",
        "full_name": "New Subordinate",
        "password": "securepassword123",
        "role": UserRole.employee.value
    }
    
    response = await client.post(
        f"{settings.API_V1_STR}/manager/team/member",
        json=payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == "new_team_member@example.com"
    assert data["full_name"] == "New Subordinate"
    assert data["role"] == "employee"
    
    # Verify the user is created and correctly associated in database
    from app.models.user import User
    from sqlalchemy import select
    q = select(User).where(User.email == "new_team_member@example.com")
    res = await db_session.execute(q)
    user = res.scalar_one_or_none()
    assert user is not None
    assert user.manager_id == manager.id

@pytest.mark.asyncio
async def test_add_team_member_restricted_role(client, db_session):
    manager = await create_user(db_session, role=UserRole.manager)
    token = create_access_token(subject=manager.id)
    
    payload = {
        "email": "invalid_manager_role@example.com",
        "full_name": "Invalid Manager Role",
        "password": "securepassword123",
        "role": UserRole.manager.value
    }
    
    response = await client.post(
        f"{settings.API_V1_STR}/manager/team/member",
        json=payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    data = response.json()
    assert "only authorized to add team members with the 'employee' role" in data["detail"]

@pytest.mark.asyncio
async def test_get_assignable_employees(client, db_session):
    manager = await create_user(db_session, role=UserRole.manager)
    token = create_access_token(subject=manager.id)
    
    # Create an employee already assigned to this manager
    assigned_emp = await create_user(db_session, role=UserRole.employee, email="assigned@example.com")
    assigned_emp.manager_id = manager.id
    db_session.add(assigned_emp)
    
    # Create an unassigned active employee
    unassigned_emp = await create_user(db_session, role=UserRole.employee, email="unassigned@example.com")
    
    # Create another manager's employee
    other_manager = await create_user(db_session, role=UserRole.manager, email="other_m@example.com")
    other_emp = await create_user(db_session, role=UserRole.employee, email="other_emp@example.com")
    other_emp.manager_id = other_manager.id
    db_session.add(other_emp)
    
    await db_session.commit()
    db_session.expire_all()
    
    response = await client.get(
        f"{settings.API_V1_STR}/manager/assignable-employees",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    emails = [emp["email"] for emp in data]
    
    assert "unassigned@example.com" in emails
    assert "other_emp@example.com" in emails
    assert "assigned@example.com" not in emails

@pytest.mark.asyncio
async def test_assign_team_member(client, db_session):
    manager = await create_user(db_session, role=UserRole.manager)
    token = create_access_token(subject=manager.id)
    
    unassigned_emp = await create_user(db_session, role=UserRole.employee, email="to_assign@example.com")
    
    payload = {
        "employee_id": str(unassigned_emp.id)
    }
    
    response = await client.post(
        f"{settings.API_V1_STR}/manager/team/member/assign",
        json=payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == str(unassigned_emp.id)
    emp_id = unassigned_emp.id
    manager_id = manager.id
    # Double check database state
    db_session.expire_all()
    from app.models.user import User
    from sqlalchemy import select
    q = select(User).where(User.id == emp_id)
    res = await db_session.execute(q)
    user = res.scalar_one_or_none()
    assert user.manager_id == manager_id
