import pytest
from datetime import datetime, timedelta, timezone
from fastapi import status
from sqlalchemy import select
from tests.factories import create_user, create_goal, create_department
from app.models.user import UserRole
from app.models.enums import GoalStatus, TrackingStatus
from app.models.checkin import CheckIn
from app.core.security import create_access_token
from app.core.config import settings
from app.db.redis import redis_client
from app.services.completion_service import CompletionService
from app.services.checkin_service import CheckInService


@pytest.mark.asyncio
async def test_get_completion_summary_admin(client, db_session):
    admin = await create_user(db_session, role=UserRole.admin)
    token = create_access_token(subject=admin.id)

    dept = await create_department(db_session, name="Engineering")
    employee = await create_user(
        db_session,
        role=UserRole.employee,
        full_name="John Doe",
        department_id=dept.id
    )

    # Create active goals for John Doe in 2026-Q1
    goal = await create_goal(
        db_session,
        owner_id=employee.id,
        quarter="2026-Q1",
        weightage=30,
        progress=100,
        status=GoalStatus.approved
    )

    response = await client.get(
        f"{settings.API_V1_STR}/completion/summary?quarter=2026-Q1",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["total_goals"] == 1
    assert data["completed_goals"] == 1
    assert data["overall_avg_progress"] == 100.0
    assert data["overall_completion_rate"] == 100.0
    assert len(data["employee_stats"]) >= 1

    # Verify John Doe details in employee stats
    emp_stats = [e for e in data["employee_stats"] if e["user_id"] == str(employee.id)][0]
    assert emp_stats["full_name"] == "John Doe"
    assert emp_stats["department_name"] == "Engineering"
    assert emp_stats["total_goals"] == 1
    assert emp_stats["completed_goals"] == 1
    assert emp_stats["average_progress"] == 100.0


@pytest.mark.asyncio
async def test_get_completion_summary_unauthorized_employee(client, db_session):
    employee = await create_user(db_session, role=UserRole.employee)
    token = create_access_token(subject=employee.id)

    response = await client.get(
        f"{settings.API_V1_STR}/completion/summary?quarter=2026-Q1",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
async def test_get_completion_summary_manager(client, db_session):
    manager = await create_user(db_session, role=UserRole.manager)
    token = create_access_token(subject=manager.id)

    response = await client.get(
        f"{settings.API_V1_STR}/completion/summary?quarter=2026-Q1",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_200_OK


@pytest.mark.asyncio
async def test_overdue_checkins_calculation(client, db_session):
    admin = await create_user(db_session, role=UserRole.admin)
    token = create_access_token(subject=admin.id)

    employee = await create_user(db_session, role=UserRole.employee, full_name="Inactive Joe")

    # Create a goal that was created 10 days ago and has NO check-ins
    ten_days_ago = datetime.now(timezone.utc) - timedelta(days=10)
    goal = await create_goal(
        db_session,
        owner_id=employee.id,
        quarter="2026-Q1",
        created_at=ten_days_ago,
        title="Inactive Goal"
    )

    response = await client.get(
        f"{settings.API_V1_STR}/completion/summary?quarter=2026-Q1&days_overdue=7",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    # Verify that Inactive Goal is listed in overdue_checkins
    assert len(data["overdue_checkins"]) >= 1
    overdue_item = [o for o in data["overdue_checkins"] if o["goal_id"] == str(goal.id)][0]
    assert overdue_item["goal_title"] == "Inactive Goal"
    assert overdue_item["owner_name"] == "Inactive Joe"
    assert overdue_item["days_since_last_checkin"] >= 10
    assert overdue_item["last_checkin_value"] is None


@pytest.mark.asyncio
async def test_completion_cache_invalidation_workflow(client, db_session):
    admin = await create_user(db_session, role=UserRole.admin)
    token = create_access_token(subject=admin.id)

    employee = await create_user(db_session, role=UserRole.employee, full_name="Active Jane")
    goal = await create_goal(
        db_session,
        owner_id=employee.id,
        quarter="2026-Q1",
        title="Jane Goal",
        target_value=100.0,
        current_value=0.0,
        status=GoalStatus.approved
    )

    # 1. Warm cache
    service = CompletionService(db_session)
    await service.get_completion_summary(quarter="2026-Q1", days_overdue=7)

    # Verify Redis has keys
    if redis_client.redis:
        keys = await redis_client.redis.keys("completion:summary:*")
        assert len(keys) >= 1

    # 2. Perform a checkin to trigger automatic invalidation
    checkin_service = CheckInService(db_session)
    await checkin_service.perform_checkin(
        goal_id=goal.id,
        user_id=employee.id,
        value=50.0,
        comment="Doing great!"
    )
    await db_session.commit()

    # 3. Verify Redis keys are invalidated/cleared
    if redis_client.redis:
        keys = await redis_client.redis.keys("completion:summary:*")
        assert len(keys) == 0
