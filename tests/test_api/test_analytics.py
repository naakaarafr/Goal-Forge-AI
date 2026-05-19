import pytest
from fastapi import status
from tests.factories import create_user
from app.models.user import UserRole
from app.core.security import create_access_token
from app.core.config import settings

@pytest.mark.asyncio
async def test_get_dashboard_summary_manager(client, db_session):
    user = await create_user(db_session, role=UserRole.manager)
    token = create_access_token(subject=user.id)
    
    response = await client.get(
        f"{settings.API_V1_STR}/analytics/summary",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "total_goals" in data

@pytest.mark.asyncio
async def test_get_dashboard_summary_unauthorized(client, db_session):
    user = await create_user(db_session, role=UserRole.employee)
    token = create_access_token(subject=user.id)
    
    response = await client.get(
        f"{settings.API_V1_STR}/analytics/summary",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
async def test_get_manager_stats_with_quarter(client, db_session):
    from tests.factories import create_goal
    from app.models.enums import GoalStatus
    
    manager = await create_user(db_session, role=UserRole.manager)
    subordinate = await create_user(db_session, role=UserRole.employee, manager_id=manager.id)
    token = create_access_token(subject=manager.id)
    
    # Create goals for subordinate in different quarters
    await create_goal(db_session, owner_id=subordinate.id, quarter="2024-Q3", progress=80, thrust_area="Revenue Growth", status=GoalStatus.submitted)
    await create_goal(db_session, owner_id=subordinate.id, quarter="2024-Q4", progress=20, thrust_area="Product Innovation", status=GoalStatus.submitted)
    
    # 1. Fetch manager stats without quarter
    res_no_q = await client.get(
        f"{settings.API_V1_STR}/analytics/manager",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_no_q.status_code == status.HTTP_200_OK
    data_no_q = res_no_q.json()
    assert data_no_q["pending_approvals"] == 2
    assert data_no_q["team_avg_progress"] == 50.0  # Average of 80 and 20
    assert "top_thrust_area" in data_no_q
    
    # 2. Fetch manager stats with quarter 2024-Q3
    res_q3 = await client.get(
        f"{settings.API_V1_STR}/analytics/manager?quarter=2024-Q3",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_q3.status_code == status.HTTP_200_OK
    data_q3 = res_q3.json()
    assert data_q3["pending_approvals"] == 1
    assert data_q3["team_avg_progress"] == 80.0
    assert data_q3["top_thrust_area"] == "Revenue Growth"
    
    # 3. Fetch manager stats with quarter 2024-Q4
    res_q4 = await client.get(
        f"{settings.API_V1_STR}/analytics/manager?quarter=2024-Q4",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_q4.status_code == status.HTTP_200_OK
    data_q4 = res_q4.json()
    assert data_q4["pending_approvals"] == 1
    assert data_q4["team_avg_progress"] == 20.0
    assert data_q4["top_thrust_area"] == "Product Innovation"
