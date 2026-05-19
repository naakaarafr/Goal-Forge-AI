import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Body
from app.api import deps
from app.services.goal_sharing_service import GoalSharingService
from app.models.user import User
from app.db.session import get_db

router = APIRouter()

async def get_sharing_service(db = Depends(get_db)):
    return GoalSharingService(db)

@router.post("/push/{goal_id}")
async def push_goal(
    goal_id: uuid.UUID,
    weightage: int = Body(10, embed=True),
    current_user: User = Depends(deps.get_current_user),
    service: GoalSharingService = Depends(get_sharing_service)
):
    """
    Push a goal to all direct subordinates. 
    Only managers can push their own goals.
    """
    return await service.push_goal_to_subordinates(goal_id, current_user.id, weightage)

@router.post("/sync/{goal_id}")
async def sync_goal(
    goal_id: uuid.UUID,
    service: GoalSharingService = Depends(get_sharing_service)
):
    """Manually trigger synchronization for a shared goal hierarchy."""
    await service.sync_children_with_parent(goal_id)
    return {"message": "Synchronization complete."}
