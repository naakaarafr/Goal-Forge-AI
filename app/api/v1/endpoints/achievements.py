import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from app.api import deps
from app.services.achievement_service import AchievementService
from app.repositories.achievement_repository import AchievementRepository
from app.repositories.goal_repository import GoalRepository
from app.repositories.quarter_repository import QuarterRepository
from app.schemas.achievement import AchievementCreate, AchievementRead, AchievementUpdate
from app.models.user import User
from app.models.enums import UserRole
from app.db.session import get_db

router = APIRouter()

async def get_achievement_service(db = Depends(get_db)):
    return AchievementService(
        AchievementRepository(db),
        GoalRepository(db),
        QuarterRepository(db)
    )

@router.post("/draft", response_model=AchievementRead)
async def save_achievement_draft(
    achievement_in: AchievementCreate,
    current_user: User = Depends(deps.get_current_user),
    service: AchievementService = Depends(get_achievement_service)
):
    """Save or update a quarterly achievement draft."""
    return await service.save_achievement_draft(current_user.id, achievement_in)

@router.post("/{achievement_id}/submit", response_model=AchievementRead)
async def submit_achievement(
    achievement_id: uuid.UUID,
    current_user: User = Depends(deps.get_current_user),
    service: AchievementService = Depends(get_achievement_service)
):
    """Finalize and submit a quarterly achievement."""
    return await service.submit_achievement(current_user.id, achievement_id)

@router.get("/", response_model=List[AchievementRead])
async def list_achievements(
    quarter_id: uuid.UUID = Query(...),
    current_user: User = Depends(deps.get_current_user),
    service: AchievementService = Depends(get_achievement_service)
):
    """List achievements for the current user in a specific quarter."""
    return await service.get_user_achievements(current_user.id, quarter_id)

@router.get("/team", response_model=List[AchievementRead])
async def list_team_achievements(
    quarter_id: uuid.UUID = Query(...),
    current_user: User = Depends(deps.get_current_user),
    service: AchievementService = Depends(get_achievement_service)
):
    """List achievements for the manager's team in a specific quarter."""
    if current_user.role not in [UserRole.manager, UserRole.admin]:
        raise HTTPException(status_code=403, detail="Only managers and admins can view team achievements.")
    return await service.get_team_achievements(current_user.id, quarter_id)

@router.patch("/{achievement_id}/review", response_model=AchievementRead)
async def review_achievement(
    achievement_id: uuid.UUID,
    update_in: AchievementUpdate,
    current_user: User = Depends(deps.get_current_user),
    service: AchievementService = Depends(get_achievement_service)
):
    """Manager reviews and provides feedback on an achievement."""
    return await service.review_achievement(current_user.id, achievement_id, update_in)
