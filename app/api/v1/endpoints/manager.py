import uuid
from typing import List, Any, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.db.session import get_db
from app.models.user import User, UserRole
from app.services.manager_service import ManagerService
from app.schemas.manager import (
    TeamMemberSummary, 
    EmployeeQuarterlySummary, 
    ManagerFeedbackCreate, 
    ManagerFeedbackRead,
    TeamMemberCreate
)
from app.schemas.user import UserRead

router = APIRouter()

def require_manager_or_admin(current_user: User = Depends(deps.get_current_user)):
    if current_user.role not in [UserRole.manager, UserRole.admin]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers or administrators are authorized to access team tracking modules."
        )
    return current_user

@router.get("/team", response_model=List[TeamMemberSummary])
async def list_team_members(
    quarter: Optional[str] = Query(None, pattern=r"^\d{4}-Q[1-4]$"),
    current_user: User = Depends(require_manager_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    List all direct subordinates under the current manager with high-level summaries.
    """
    try:
        return await ManagerService.get_team_members(current_user.id, db, quarter=quarter)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while compiling team summaries: {str(e)}"
        )

@router.get("/team/{employee_id}/summary", response_model=EmployeeQuarterlySummary)
async def get_employee_summary(
    employee_id: uuid.UUID,
    quarter: str = Query(..., pattern=r"^\d{4}-Q[1-4]$"),
    current_user: User = Depends(require_manager_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Compile planned vs achievements quarterly performance metrics for a direct report.
    """
    try:
        # Fetch subordinate details first
        summary = await ManagerService.get_employee_quarterly_summary(employee_id, quarter, db)
        return summary
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_442_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/team/{employee_id}/feedback", response_model=ManagerFeedbackRead)
async def submit_quarterly_feedback(
    employee_id: uuid.UUID,
    feedback_in: ManagerFeedbackCreate,
    current_user: User = Depends(require_manager_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Create or update structured review feedback for a direct subordinate's quarter.
    """
    if employee_id != feedback_in.employee_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee ID mismatch in URI and request payload"
        )
        
    try:
        feedback = await ManagerService.create_structured_feedback(
            manager_id=current_user.id,
            employee_id=employee_id,
            feedback_in=feedback_in,
            db=db
        )
        return feedback
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/team/{employee_id}/discussion-history", response_model=List[Any])
async def get_team_member_discussion_history(
    employee_id: uuid.UUID,
    quarter: str = Query(..., pattern=r"^\d{4}-Q[1-4]$"),
    current_user: User = Depends(require_manager_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Aggregate chronological logs of check-ins, action comment timelines, and state submissions.
    """
    try:
        return await ManagerService.get_discussion_history(employee_id, quarter, db)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/team/member", response_model=UserRead)
async def add_team_member(
    member_in: TeamMemberCreate,
    current_user: User = Depends(require_manager_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new employee user account and assign them to the manager's team.
    """
    # Restrict roles: Standard managers can ONLY add team members with the 'employee' role.
    if current_user.role != UserRole.admin and member_in.role != UserRole.employee:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Managers are only authorized to add team members with the 'employee' role."
        )
    try:
        return await ManagerService.add_team_member(
            manager_id=current_user.id,
            member_in=member_in,
            db=db
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while adding the team member: {str(e)}"
        )

@router.get("/assignable-employees", response_model=List[UserRead])
async def get_assignable_employees(
    current_user: User = Depends(require_manager_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all active employees in the company who are not currently assigned to this manager.
    """
    try:
        return await ManagerService.get_assignable_employees(
            manager_id=current_user.id,
            db=db
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving assignable employees: {str(e)}"
        )

from pydantic import BaseModel

class TeamMemberAssign(BaseModel):
    employee_id: uuid.UUID

@router.post("/team/member/assign", response_model=UserRead)
async def assign_team_member(
    payload: TeamMemberAssign,
    current_user: User = Depends(require_manager_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Assign an existing employee to the manager's team.
    """
    try:
        return await ManagerService.assign_team_member(
            manager_id=current_user.id,
            employee_id=payload.employee_id,
            db=db
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while assigning the team member: {str(e)}"
        )
