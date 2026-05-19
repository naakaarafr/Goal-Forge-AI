import pytest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException
from app.models.enums import UserRole, QuarterState
from app.models.user import User
from app.models.quarter import Quarter
from app.models.goal import Goal
from app.models.quarter_window_config import QuarterWindowConfig, QuarterWindowPhase
from app.models.quarter_override import QuarterOverride
from app.services.quarter_enforcement_service import QuarterEnforcementService
from app.tasks.lock_quarters_task import run_lock_quarters
from tests.factories import create_user, create_goal

@pytest.mark.asyncio
async def test_parse_quarter_label():
    year, q_str = QuarterEnforcementService.parse_quarter_label("2026-Q3")
    assert year == 2026
    assert q_str == "Q3"

    year, q_str = QuarterEnforcementService.parse_quarter_label("invalid-label")
    assert isinstance(year, int)
    assert q_str == "Q1"

@pytest.mark.asyncio
async def test_validate_goal_operation(db_session):
    # Create employee user
    user = await create_user(db_session, email="emp@test.com", role=UserRole.employee)
    
    # 1. Test PLANNING phase open standard window
    # Seed PLANNING window config
    config = QuarterWindowConfig(
        phase=QuarterWindowPhase.PLANNING,
        start_month=1, start_day=1,
        end_month=12, end_day=31
    )
    db_session.add(config)
    await db_session.flush()

    # Should succeed since now is in the window (Jan 1 to Dec 31)
    res = await QuarterEnforcementService.validate_goal_operation(
        db_session, "2026-Q1", user, action_type="create"
    )
    assert res is True

    # 2. PLANNING window closed (start in future)
    config.start_month = 12
    config.start_day = 30
    config.end_month = 12
    config.end_day = 31
    await db_session.flush()

    # Standard check should fail now
    # Wait, we mock datetime.now to ensure it fails, but wait, currently datetime.now() is 2026-05-19.
    # The start month is Dec, so now (May) is NOT inside the window. It should fail.
    with pytest.raises(HTTPException) as exc_info:
        await QuarterEnforcementService.validate_goal_operation(
            db_session, "2026-Q1", user, action_type="create"
        )
    assert exc_info.value.status_code == 400
    assert "not permitted" in exc_info.value.detail

    # 3. Test Admin override allows out-of-window action
    override = QuarterOverride(
        quarter_label="2026-Q1",
        user_id=user.id,
        extended_until=datetime.now(timezone.utc) + timedelta(days=2)
    )
    db_session.add(override)
    await db_session.flush()

    res = await QuarterEnforcementService.validate_goal_operation(
        db_session, "2026-Q1", user, action_type="create"
    )
    assert res is True

    # 4. Admin user bypasses restrictions
    admin_user = await create_user(db_session, email="admin@test.com", role=UserRole.admin)
    res = await QuarterEnforcementService.validate_goal_operation(
        db_session, "2026-Q2", admin_user, action_type="create"
    )
    assert res is True

@pytest.mark.asyncio
async def test_validate_tracking_operation(db_session):
    user = await create_user(db_session, email="emp2@test.com", role=UserRole.employee)
    
    # Standard tracking window closed (e.g. start in Dec, now is May)
    config = QuarterWindowConfig(
        phase=QuarterWindowPhase.Q1,
        start_month=12, start_day=30,
        end_month=12, end_day=31
    )
    db_session.add(config)
    await db_session.flush()

    with pytest.raises(HTTPException) as exc_info:
        await QuarterEnforcementService.validate_tracking_operation(
            db_session, "2026-Q1", user, operation_name="checkin"
        )
    assert exc_info.value.status_code == 400
    assert "not permitted" in exc_info.value.detail

    # Standard tracking window open (start Jan 1, end Dec 31)
    config.start_month = 1
    config.start_day = 1
    await db_session.flush()

    res = await QuarterEnforcementService.validate_tracking_operation(
        db_session, "2026-Q1", user, operation_name="checkin"
    )
    assert res is True

@pytest.mark.asyncio
async def test_run_lock_quarters_task(db_session):
    # Seed an expired quarter
    expired_q = Quarter(
        label="2026-Q1",
        state=QuarterState.ACTIVE,
        start_date=datetime.now(timezone.utc) - timedelta(days=10),
        end_date=datetime.now(timezone.utc) - timedelta(days=2),
        is_immutable=False
    )
    db_session.add(expired_q)
    await db_session.flush()

    # Seed a non-expired quarter
    active_q = Quarter(
        label="2026-Q2",
        state=QuarterState.ACTIVE,
        start_date=datetime.now(timezone.utc) - timedelta(days=2),
        end_date=datetime.now(timezone.utc) + timedelta(days=10),
        is_immutable=False
    )
    db_session.add(active_q)
    await db_session.flush()

    # Seed user and goals
    user = await create_user(db_session, email="emp3@test.com")
    goal1 = await create_goal(db_session, owner_id=user.id, quarter="2026-Q1", is_locked=False)
    goal2 = await create_goal(db_session, owner_id=user.id, quarter="2026-Q2", is_locked=False)
    
    await db_session.commit()

    # Run the locking task
    # Note: Since the locking task opens its own AsyncSessionLocal, we need to ensure the test database is committed/updated
    # and the standalone engine matches TestingSessionLocal. But since AsyncSessionLocal uses settings.DATABASE_URL,
    # let's mock AsyncSessionLocal inside test_run_lock_quarters_task to use db_session instead!
    from unittest.mock import patch
    from contextlib import asynccontextmanager

    @asynccontextmanager
    async def mock_session_local():
        yield db_session

    with patch("app.tasks.lock_quarters_task.AsyncSessionLocal", side_effect=mock_session_local):
        await run_lock_quarters()

    # Refresh objects from db_session
    await db_session.refresh(expired_q)
    await db_session.refresh(active_q)
    await db_session.refresh(goal1)
    await db_session.refresh(goal2)

    # Check results
    assert expired_q.state == QuarterState.CLOSED
    assert expired_q.is_immutable is True
    assert goal1.is_locked is True

    assert active_q.state == QuarterState.ACTIVE
    assert active_q.is_immutable is False
    assert goal2.is_locked is False
