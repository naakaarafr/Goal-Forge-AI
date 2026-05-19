import pytest
from fastapi import status
from tests.factories import create_user, create_goal
from app.models.enums import GoalStatus, UoMType
from app.core.config import settings
from app.core.security import create_access_token

@pytest.mark.asyncio
async def test_checkin_numeric_progress(client, db_session):
    user = await create_user(db_session)
    token = create_access_token(subject=user.id)
    
    goal = await create_goal(db_session, owner_id=user.id, uom=UoMType.numeric_min, target_value=200.0)
    
    response = await client.post(
        f"{settings.API_V1_STR}/check-ins/{goal.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"value": 100.0, "comment": "Halfway there!"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["current_value"] == 100.0
    assert data["progress"] == 50 # (100/200) * 100

@pytest.mark.asyncio
async def test_checkin_zero_based_progress(client, db_session):
    user = await create_user(db_session)
    token = create_access_token(subject=user.id)
    
    goal = await create_goal(db_session, owner_id=user.id, uom=UoMType.zero, target_value=1.0)
    
    # Check-in with 0.5 -> Should still be 0% progress
    await client.post(
        f"{settings.API_V1_STR}/check-ins/{goal.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"value": 0.5}
    )
    await db_session.refresh(goal)
    assert goal.progress == 0
    
    # Check-in with 1.0 -> Should be 100% progress
    await client.post(
        f"{settings.API_V1_STR}/check-ins/{goal.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"value": 1.0}
    )
    await db_session.refresh(goal)
    assert goal.progress == 100

@pytest.mark.asyncio
async def test_checkin_unauthorized_fails(client, db_session):
    user1 = await create_user(db_session)
    user2 = await create_user(db_session)
    goal = await create_goal(db_session, owner_id=user1.id)
    
    token = create_access_token(subject=user2.id)
    
    response = await client.post(
        f"{settings.API_V1_STR}/check-ins/{goal.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"value": 50.0}
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.asyncio
async def test_checkin_history_logged(client, db_session):
    user = await create_user(db_session)
    token = create_access_token(subject=user.id)
    goal = await create_goal(db_session, owner_id=user.id)
    
    import asyncio
    await client.post(
        f"{settings.API_V1_STR}/check-ins/{goal.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"value": 10.0, "comment": "First update"}
    )
    await asyncio.sleep(1.1)
    await client.post(
        f"{settings.API_V1_STR}/check-ins/{goal.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"value": 20.0, "comment": "Second update"}
    )
    
    response = await client.get(
        f"{settings.API_V1_STR}/check-ins/{goal.id}/history",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 2
    assert data[0]["value"] == 20.0
    assert data[1]["value"] == 10.0

@pytest.mark.asyncio
async def test_checkin_min_formula_edge_case(client, db_session):
    # This tests the new Strategy-pattern calculation formulas
    from app.core.calculations.formulas import MinFormula, MaxFormula
    
    min_formula = MinFormula()
    # Target 100 (Higher is better), Actual 50 -> 50%
    assert min_formula.calculate(100.0, 50.0) == 50.0
    # Target 100, Actual 120 -> 100% (Capped)
    assert min_formula.calculate(100.0, 120.0) == 100.0
    
    max_formula = MaxFormula()
    # Target 100 (Lower is better), Actual 200 -> 50%
    assert max_formula.calculate(100.0, 200.0) == 50.0
    # Target 100, Actual 50 -> 100% (Capped)
    assert max_formula.calculate(100.0, 50.0) == 100.0
