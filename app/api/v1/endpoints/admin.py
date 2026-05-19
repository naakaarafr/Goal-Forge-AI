from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel

from app.api import deps
from app.db.session import get_db
from app.models.user import UserRole, User
from app.models.quarter import Quarter
from app.models.goal import Goal
from app.models.enums import GoalStatus, QuarterState
from app.schemas.quarter import QuarterRead, QuarterUpdate
from app.schemas.user import UserRead
from app.schemas.goal import GoalRead
from app.schemas.audit import AuditLogRead
from app.services.audit_service import AuditService

router = APIRouter()

class AdminUserRead(UserRead):
    manager_id: Optional[uuid.UUID] = None
    department_id: Optional[uuid.UUID] = None

class ManagerAssignPayload(BaseModel):
    manager_id: Optional[uuid.UUID] = None

class UnlockGoalPayload(BaseModel):
    reason: str

# ---------------------------------------------------------
# RBAC Verification Endpoints
# ---------------------------------------------------------
@router.get("/admin-only")
async def admin_only(
    current_user: User = Depends(deps.RoleChecker([UserRole.admin]))
):
    return {"message": "Hello Admin"}

@router.get("/manager-only")
async def manager_only(
    current_user: User = Depends(deps.RoleChecker([UserRole.manager, UserRole.admin]))
):
    return {"message": "Hello Manager"}

# ---------------------------------------------------------
# Cycle Management
# ---------------------------------------------------------
@router.get("/quarters", response_model=List[QuarterRead])
async def get_all_quarters(
    current_user: User = Depends(deps.RoleChecker([UserRole.admin])),
    db: AsyncSession = Depends(get_db)
):
    """List all quarters for cycle management."""
    q = select(Quarter).order_by(Quarter.start_date.desc())
    res = await db.execute(q)
    return res.scalars().all()

@router.patch("/quarters/{quarter_id}/state", response_model=QuarterRead)
async def update_quarter_state(
    quarter_id: uuid.UUID,
    payload: QuarterUpdate,
    current_user: User = Depends(deps.RoleChecker([UserRole.admin])),
    db: AsyncSession = Depends(get_db)
):
    """Change the state of a quarter (Planning -> Active -> Review -> Closed)."""
    q = select(Quarter).where(Quarter.id == quarter_id)
    res = await db.execute(q)
    quarter = res.scalars().first()
    
    if not quarter:
        raise HTTPException(status_code=404, detail="Quarter not found")
        
    old_state = quarter.state
    
    if payload.state:
        quarter.state = payload.state
    if payload.is_immutable is not None:
        quarter.is_immutable = payload.is_immutable
        
    await db.commit()
    await db.refresh(quarter)
    
    # Audit Logging
    audit = AuditService(db)
    await audit.log_action(
        entity_name="Quarter",
        entity_id=quarter.id,
        action="UPDATE_STATE",
        actor_id=current_user.id,
        old_values={"state": old_state},
        new_values={"state": quarter.state}
    )
    
    return quarter

# ---------------------------------------------------------
# Hierarchy Management
# ---------------------------------------------------------
@router.get("/users", response_model=List[AdminUserRead])
async def list_all_users(
    current_user: User = Depends(deps.RoleChecker([UserRole.admin])),
    db: AsyncSession = Depends(get_db)
):
    """View all users across the hierarchy."""
    q = select(User).order_by(User.email)
    res = await db.execute(q)
    return res.scalars().all()

@router.patch("/users/{user_id}/manager", response_model=AdminUserRead)
async def reassign_manager(
    user_id: uuid.UUID,
    payload: ManagerAssignPayload,
    current_user: User = Depends(deps.RoleChecker([UserRole.admin])),
    db: AsyncSession = Depends(get_db)
):
    """Reassign an employee's manager."""
    q = select(User).where(User.id == user_id)
    res = await db.execute(q)
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    old_manager_id = user.manager_id
    
    if payload.manager_id:
        mgr_q = select(User).where(User.id == payload.manager_id)
        mgr_res = await db.execute(mgr_q)
        mgr = mgr_res.scalars().first()
        if not mgr:
            raise HTTPException(status_code=404, detail="Target manager not found")
            
    user.manager_id = payload.manager_id
    await db.commit()
    await db.refresh(user)
    
    # Audit Logging
    audit = AuditService(db)
    await audit.log_action(
        entity_name="User",
        entity_id=user.id,
        action="REASSIGN_MANAGER",
        actor_id=current_user.id,
        old_values={"manager_id": str(old_manager_id) if old_manager_id else None},
        new_values={"manager_id": str(user.manager_id) if user.manager_id else None}
    )
    
    return user

# ---------------------------------------------------------
# Goal Unlock Capability
# ---------------------------------------------------------
@router.post("/goals/{goal_id}/unlock")
async def unlock_goal(
    goal_id: uuid.UUID,
    payload: UnlockGoalPayload,
    current_user: User = Depends(deps.RoleChecker([UserRole.admin])),
    db: AsyncSession = Depends(get_db)
):
    """Force unlock a locked or approved goal."""
    q = select(Goal).where(Goal.id == goal_id)
    res = await db.execute(q)
    goal = res.scalars().first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
        
    if goal.status not in [GoalStatus.approved, GoalStatus.locked, GoalStatus.submitted]:
        raise HTTPException(status_code=400, detail="Only approved, locked, or submitted goals can be unlocked")
        
    old_status = goal.status
    goal.status = GoalStatus.draft
    goal.is_locked = False
    
    await db.commit()
    await db.refresh(goal)
    
    # Audit Logging
    audit = AuditService(db)
    await audit.log_action(
        entity_name="Goal",
        entity_id=goal.id,
        action="FORCE_UNLOCK",
        actor_id=current_user.id,
        old_values={"status": old_status.value if hasattr(old_status, 'value') else old_status},
        new_values={"status": goal.status.value if hasattr(goal.status, 'value') else goal.status, "reason": payload.reason}
    )
    
    return {"message": "Goal unlocked successfully", "goal_id": str(goal.id)}

# ---------------------------------------------------------
# Audit & Escalation Visibility
# ---------------------------------------------------------
@router.get("/audit-logs", response_model=List[AuditLogRead])
async def list_audit_logs(
    limit: int = 50,
    current_user: User = Depends(deps.RoleChecker([UserRole.admin])),
    db: AsyncSession = Depends(get_db)
):
    """Fetch system-wide audit logs."""
    from app.models.audit import AuditLog
    q = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    res = await db.execute(q)
    logs = res.scalars().all()
    return logs

@router.get("/escalations", response_model=List[GoalRead])
async def list_escalated_goals(
    current_user: User = Depends(deps.RoleChecker([UserRole.admin])),
    db: AsyncSession = Depends(get_db)
):
    """Fetch goals that can be force-unlocked (SUBMITTED, APPROVED, or LOCKED)."""
    q = select(Goal).where(
        Goal.status.in_([GoalStatus.submitted, GoalStatus.approved, GoalStatus.locked])
    ).order_by(Goal.created_at.asc()).limit(50)
    res = await db.execute(q)
    goals = res.scalars().all()
    return goals

# ---------------------------------------------------------
# Dynamic System Settings Management
# ---------------------------------------------------------
import os
import json
from app.schemas.settings import SystemSettingsSchema

SETTINGS_FILE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
    "app", "core", "settings.json"
)

DEFAULT_SETTINGS = {
    "orgName": "GoalForge AI Corp",
    "domainRestriction": "goalforge.ai",
    "defaultCurrency": "USD",
    "autoProvision": True,
    "maxGoals": "8",
    "minWeightage": "10",
    "requireManagerLock": True,
    "enableSelfEvaluation": True,
    "lateCheckinDays": "7",
    "escalationDays": "3",
    "autoPingManager": True,
    "webhookUrl": "https://outlook.office.com/webhook/example-entra-integration",
    "aiModel": "gemini-2.0-flash",
    "aiTemperature": 0.4,
    "aiSystemPrompt": "You are an elite enterprise goal coaching agent. Help employees construct SMART goals that align with their core thrust areas, ensuring precision, clarity, and metric relevance.",
    "enableEntraId": False,
    "clientId": "00000000-0000-0000-0000-000000000000",
    "tenantId": "11111111-1111-1111-1111-111111111111",
}

def load_settings_from_file():
    if os.path.exists(SETTINGS_FILE_PATH):
        try:
            with open(SETTINGS_FILE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return DEFAULT_SETTINGS

def save_settings_to_file(settings_data: dict):
    os.makedirs(os.path.dirname(SETTINGS_FILE_PATH), exist_ok=True)
    with open(SETTINGS_FILE_PATH, "w", encoding="utf-8") as f:
        json.dump(settings_data, f, indent=4, ensure_ascii=False)

@router.get("/settings", response_model=SystemSettingsSchema)
async def get_system_settings(
    current_user: User = Depends(deps.RoleChecker([UserRole.admin]))
):
    """Retrieve dynamic system settings from persistent storage."""
    return load_settings_from_file()

@router.put("/settings", response_model=SystemSettingsSchema)
async def update_system_settings(
    payload: SystemSettingsSchema,
    current_user: User = Depends(deps.RoleChecker([UserRole.admin]))
):
    """Update dynamic system settings in persistent storage."""
    save_settings_to_file(payload.dict())
    return payload

