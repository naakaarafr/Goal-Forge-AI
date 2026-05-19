import uuid
from typing import List, Any
from fastapi import APIRouter, Depends, Query
from app.api import deps
from app.services.org_service import OrgService
from app.repositories.org_repository import OrgRepository
from app.schemas.user import UserRead
from app.db.session import get_db

router = APIRouter()

async def get_org_repository(db = Depends(get_db)):
    return OrgRepository(db)

async def get_org_service(repo = Depends(get_org_repository)):
    return OrgService(repo)

@router.get("/tree/{user_id}", response_model=Any)
async def get_org_tree(
    user_id: uuid.UUID,
    org_service: OrgService = Depends(get_org_service)
):
    """Get the full reporting tree starting from a specific user."""
    return await org_service.get_org_tree(user_id)

@router.get("/subordinates/{user_id}", response_model=List[UserRead])
async def get_subordinates(
    user_id: uuid.UUID,
    org_repo: OrgRepository = Depends(get_org_repository)
):
    """Get all recursive subordinates of a user."""
    return await org_repo.get_subordinates_recursive(user_id)

@router.get("/reporting-line/{user_id}", response_model=List[UserRead])
async def get_reporting_line(
    user_id: uuid.UUID,
    org_repo: OrgRepository = Depends(get_org_repository)
):
    """Get the full line of managers for a user (up to the CEO/Root)."""
    return await org_repo.get_managers_recursive(user_id)

@router.post("/reassign/{user_id}")
async def reassign_manager(
    user_id: uuid.UUID,
    new_manager_id: uuid.UUID = Query(...),
    org_service: OrgService = Depends(get_org_service),
    current_user = Depends(deps.RoleChecker(["admin", "manager"]))
):
    """Reassign a user's manager. Requires Admin/Manager privileges."""
    return await org_service.reassign_manager(user_id, new_manager_id)
