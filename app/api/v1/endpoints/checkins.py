from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Body
from app.api import deps
from app.services.checkin_service import CheckInService
from app.models.user import User
from app.db.session import get_db
from app.schemas.checkin import CheckInCreate, CheckInRead
from app.schemas.goal import GoalRead

router = APIRouter()

async def get_checkin_service(db = Depends(get_db)):
    return CheckInService(db)

@router.post("/{goal_id}", response_model=GoalRead)
async def create_checkin(
    goal_id: uuid.UUID,
    payload: CheckInCreate,
    current_user: User = Depends(deps.get_current_user),
    service: CheckInService = Depends(get_checkin_service)
):
    """Update progress for a goal."""
    return await service.perform_checkin(
        goal_id, 
        current_user.id, 
        payload.value, 
        payload.comment,
        payload.tracking_status,
        payload.is_manager_review
    )

@router.get("/{goal_id}/history", response_model=List[CheckInRead])
async def get_checkin_history(
    goal_id: uuid.UUID,
    service: CheckInService = Depends(get_checkin_service)
):
    """Get all progress updates for a goal."""
    return await service.get_goal_history(goal_id)
