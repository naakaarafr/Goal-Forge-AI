import pytest
from fastapi import status
from tests.factories import create_user, create_goal
from app.models.enums import GoalStatus
from app.core.config import settings
from app.core.security import create_access_token

@pytest.mark.asyncio
async def test_create_goal_success(client, db_session):
    user = await create_user(db_session)
    token = create_access_token(subject=user.id)
    
    response = await client.post(
        f"{settings.API_V1_STR}/goals/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Boost Revenue",
            "thrust_area": "Sales",
            "weightage": 20,
            "quarter": "2024-Q1",
            "uom": "numeric_min"
        }
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["title"] == "Boost Revenue"
    assert data["weightage"] == 20
    assert data["status"] == "draft"

@pytest.mark.asyncio
async def test_create_goal_invalid_weightage(client, db_session):
    user = await create_user(db_session)
    token = create_access_token(subject=user.id)
    
    # Below min (10)
    response = await client.post(
        f"{settings.API_V1_STR}/goals/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Tiny Goal",
            "thrust_area": "Internal",
            "weightage": 5,
            "quarter": "2024-Q1"
        }
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

@pytest.mark.asyncio
async def test_max_goals_exceeded(client, db_session):
    user = await create_user(db_session)
    token = create_access_token(subject=user.id)
    
    # Create 8 goals
    for i in range(8):
        await create_goal(db_session, owner_id=user.id, title=f"Goal {i}", weightage=10)
    
    # Try to create 9th goal
    response = await client.post(
        f"{settings.API_V1_STR}/goals/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Goal 9",
            "thrust_area": "Overload",
            "weightage": 10,
            "quarter": "2024-Q1"
        }
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "maximum" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_total_weightage_exceeded(client, db_session):
    user = await create_user(db_session)
    token = create_access_token(subject=user.id)
    
    await create_goal(db_session, owner_id=user.id, weightage=60)
    
    # Try to add another 50 (Total 110)
    response = await client.post(
        f"{settings.API_V1_STR}/goals/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Too Heavy",
            "thrust_area": "Sales",
            "weightage": 50,
            "quarter": "2024-Q1"
        }
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "exceed 100%" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_submit_quarter_success(client, db_session):
    user = await create_user(db_session)
    token = create_access_token(subject=user.id)
    
    # Create goals totalling 100%
    await create_goal(db_session, owner_id=user.id, weightage=50, quarter="2024-Q1")
    await create_goal(db_session, owner_id=user.id, weightage=50, quarter="2024-Q1")
    
    response = await client.post(
        f"{settings.API_V1_STR}/goals/submit?quarter=2024-Q1",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    assert "submitted" in response.json()["message"].lower()

@pytest.mark.asyncio
async def test_submit_quarter_invalid_weight(client, db_session):
    user = await create_user(db_session)
    token = create_access_token(subject=user.id)
    
    # Only 50%
    await create_goal(db_session, owner_id=user.id, weightage=50, quarter="2024-Q1")
    
    response = await client.post(
        f"{settings.API_V1_STR}/goals/submit?quarter=2024-Q1",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "exactly 100%" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_edit_locked_goal_fails(client, db_session):
    user = await create_user(db_session)
    token = create_access_token(subject=user.id)
    
    goal = await create_goal(db_session, owner_id=user.id, is_locked=True)
    
    response = await client.patch(
        f"{settings.API_V1_STR}/goals/{goal.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "New Title"}
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "locked" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_list_goals_by_quarter(client, db_session):
    user = await create_user(db_session)
    token = create_access_token(subject=user.id)
    
    await create_goal(db_session, owner_id=user.id, quarter="2024-Q1")
    await create_goal(db_session, owner_id=user.id, quarter="2024-Q2")
    
    response = await client.get(
        f"{settings.API_V1_STR}/goals/?quarter=2024-Q1",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["quarter"] == "2024-Q1"
