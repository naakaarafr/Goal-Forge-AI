import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.api import deps
from app.services.quarter_service import QuarterService
from app.repositories.quarter_repository import QuarterRepository
from app.schemas.quarter import QuarterCreate, QuarterRead, QuarterUpdate
from app.models.user import User
from app.models.enums import UserRole, QuarterState
from app.db.session import get_db

router = APIRouter()

async def get_quarter_repository(db = Depends(get_db)):
    return QuarterRepository(db)

async def get_quarter_service(repo = Depends(get_quarter_repository)):
    return QuarterService(repo)

@router.post("/", response_model=QuarterRead)
async def create_quarter(
    quarter_in: QuarterCreate,
    current_user: User = Depends(deps.get_current_user),
    service: QuarterService = Depends(get_quarter_service)
):
    """Create a new quarter (Admin only)."""
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Only admins can create quarters.")
    return await service.create_quarter(quarter_in)

@router.get("/", response_model=List[QuarterRead])
async def list_quarters(
    service: QuarterService = Depends(get_quarter_service)
):
    """List all quarters."""
    return await service.get_all_quarters()

@router.patch("/{quarter_id}/state", response_model=QuarterRead)
async def update_quarter_state(
    quarter_id: uuid.UUID,
    update_in: QuarterUpdate,
    current_user: User = Depends(deps.get_current_user),
    service: QuarterService = Depends(get_quarter_service)
):
    """Update quarter state (Admin only)."""
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Only admins can update quarter state.")
    if update_in.state:
        return await service.update_quarter_state(quarter_id, update_in.state)
    return await service.quarter_repo.update(id=quarter_id, obj_in=update_in)
