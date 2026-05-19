from pydantic import BaseModel
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Body
from app.api import deps
from app.services.workflow_service import WorkflowService
from app.services.goal_service import GoalService
from app.repositories.goal_repository import GoalRepository
from app.schemas.goal import GoalRead
from app.models.user import User
from app.models.enums import UserRole
from app.db.session import get_db

router = APIRouter()

async def get_workflow_service(db = Depends(get_db)):
    return WorkflowService(db)

async def get_goal_service(db = Depends(get_db)):
    repo = GoalRepository(db)
    return GoalService(repo)


class ApprovalAction(BaseModel):
    comment: Optional[str] = None


@router.get("/pending", response_model=List[GoalRead])
async def get_pending_approvals(
    current_user: User = Depends(deps.get_current_user),
    workflow_service: WorkflowService = Depends(get_workflow_service)
):
    """
    Get all submitted goals pending approval for the current manager.
    Returns goals owned by direct subordinates.
    """
    return await workflow_service.get_pending_approvals(current_user.id)


@router.post("/{goal_id}/approve", response_model=GoalRead)
async def approve_goal(
    goal_id: uuid.UUID,
    action: Optional[ApprovalAction] = Body(default=None),
    current_user: User = Depends(deps.get_current_user),
    workflow_service: WorkflowService = Depends(get_workflow_service)
):
    """Approve a goal. Only the direct manager can perform this."""
    comment = action.comment if action else None
    return await workflow_service.approve_goal(goal_id, current_user, comment)


@router.post("/{goal_id}/rework", response_model=GoalRead)
async def rework_goal(
    goal_id: uuid.UUID,
    action: ApprovalAction = Body(...),
    current_user: User = Depends(deps.get_current_user),
    workflow_service: WorkflowService = Depends(get_workflow_service)
):
    """Return a goal for rework. Requires a comment explaining what needs to change."""
    if not action.comment:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Comment is required when returning for rework.")
    return await workflow_service.reject_to_rework(goal_id, current_user, action.comment)


@router.get("/{goal_id}/history")
async def get_history(
    goal_id: uuid.UUID,
    workflow_service: WorkflowService = Depends(get_workflow_service)
):
    """Get the full approval history for a goal."""
    return await workflow_service.get_approval_history(goal_id)


@router.patch("/{goal_id}/manager-review", response_model=GoalRead)
async def manager_review_edit(
    goal_id: uuid.UUID,
    weightage: Optional[int] = Body(None),
    target_value: Optional[float] = Body(None),
    current_user: User = Depends(deps.get_current_user),
    goal_service: GoalService = Depends(get_goal_service),
):
    """
    Manager inline-edit: adjust weightage and/or target_value during review.
    Only allowed on SUBMITTED goals owned by the manager's direct subordinates.
    """
    return await goal_service.manager_update_goal(
        goal_id=goal_id,
        manager_id=current_user.id,
        weightage=weightage,
        target_value=target_value,
    )
