import uuid
from typing import List
from fastapi import APIRouter, Depends, Query
from app.api import deps
from app.services.goal_service import GoalService
from app.repositories.goal_repository import GoalRepository
from app.schemas.goal import GoalCreate, GoalUpdate, GoalRead
from app.models.user import User
from app.db.session import get_db

router = APIRouter()

async def get_goal_repository(db = Depends(get_db)):
    return GoalRepository(db)

async def get_goal_service(repo = Depends(get_goal_repository)):
    return GoalService(repo)

@router.post("/", response_model=GoalRead)
async def create_goal(
    goal_in: GoalCreate,
    current_user: User = Depends(deps.get_current_user),
    goal_service: GoalService = Depends(get_goal_service)
):
    """Create a new goal."""
    return await goal_service.create_goal(current_user.id, goal_in)

@router.get("/", response_model=List[GoalRead])
async def list_goals(
    quarter: str = Query(..., pattern=r"^\d{4}-Q[1-4]$"),
    scope: str = Query("personal"),
    current_user: User = Depends(deps.get_current_user),
    goal_repo: GoalRepository = Depends(get_goal_repository),
    db = Depends(get_db)
):
    """List goals based on role and scope."""
    from app.models.user import UserRole, User
    from sqlalchemy import select
    
    if scope == "team" and current_user.role in [UserRole.manager, UserRole.admin]:
        if current_user.role == UserRole.admin:
            # Admin sees all goals
            return await goal_repo.get_all_by_quarter(quarter)
        else:
            # Manager sees all subordinate goals
            # Fetch subordinate IDs
            sub_query = select(User.id).where(User.manager_id == current_user.id)
            sub_res = await db.execute(sub_query)
            subordinate_ids = [row[0] for row in sub_res.fetchall()]
            if not subordinate_ids:
                return []
            return await goal_repo.get_by_owners_and_quarter(subordinate_ids, quarter)
            
    return await goal_repo.get_by_owner_and_quarter(current_user.id, quarter)

@router.get("/{goal_id}", response_model=GoalRead)
async def get_goal(
    goal_id: uuid.UUID,
    current_user: User = Depends(deps.get_current_user),
    goal_repo: GoalRepository = Depends(get_goal_repository)
):
    """Retrieve a single goal by ID."""
    from fastapi import HTTPException
    goal = await goal_repo.get(goal_id)
    if not goal or goal.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal

@router.patch("/{goal_id}", response_model=GoalRead)
async def update_goal(
    goal_id: uuid.UUID,
    goal_in: GoalUpdate,
    current_user: User = Depends(deps.get_current_user),
    goal_service: GoalService = Depends(get_goal_service)
):
    return await goal_service.update_goal(goal_id, current_user.id, goal_in)

@router.delete("/{goal_id}", status_code=204)
async def delete_goal(
    goal_id: uuid.UUID,
    current_user: User = Depends(deps.get_current_user),
    goal_service: GoalService = Depends(get_goal_service)
):
    """Delete a DRAFT goal."""
    await goal_service.delete_goal(goal_id, current_user.id)
    return None

@router.post("/submit", response_model=dict)
async def submit_quarter(
    quarter: str = Query(..., pattern=r"^\d{4}-Q[1-4]$"),
    current_user: User = Depends(deps.get_current_user),
    goal_service: GoalService = Depends(get_goal_service)
):
    """Submit and lock all goals for the quarter."""
    return await goal_service.submit_quarter(current_user.id, quarter)
