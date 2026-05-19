import uuid
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.goal import Goal
from app.models.checkin import CheckIn
from app.core.calculations.engine import CalculationEngine


class CheckInService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def perform_checkin(self, goal_id: uuid.UUID, user_id: uuid.UUID, value: float, comment: str = None, tracking_status: str = None, is_manager_review: bool = False):
        goal = await self.db.get(Goal, goal_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        if goal.owner_id != user_id:
            raise HTTPException(status_code=403, detail="Only the owner can check-in to this goal.")
            
        # Enforcement: Quarter Window
        from app.models.user import User
        from app.services.quarter_enforcement_service import QuarterEnforcementService
        user = await self.db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        await QuarterEnforcementService.validate_tracking_operation(
            self.db, goal.quarter, user, operation_name="checkin"
        )
            
        if goal.status != "approved":
            # Some orgs allow checkins in 'submitted' or 'draft', 
            # but usually 'approved' is the standard for tracking.
            pass

        goal.current_value = value
        goal.progress = int(CalculationEngine.calculate(goal.uom, goal.target_value, value))
        if tracking_status:
            goal.tracking_status = tracking_status
        
        # Create check-in log
        checkin = CheckIn(
            goal_id=goal.id,
            author_id=user_id,
            value=value,
            comment=comment,
            is_manager_review=is_manager_review,
            tracking_status_update=tracking_status
        )
        self.db.add(checkin)
        
        await self.db.flush()
        
        # Trigger synchronization if this is a parent goal
        from app.services.goal_sharing_service import GoalSharingService
        sharing_service = GoalSharingService(self.db)
        await sharing_service.sync_children_with_parent(goal.id)
        
        await self.db.refresh(goal)

        # Invalidate completion dashboard cache dynamically
        from app.services.completion_service import CompletionService
        await CompletionService.invalidate_completion_cache()

        return goal

    async def get_goal_history(self, goal_id: uuid.UUID):
        from sqlalchemy import select
        query = select(CheckIn).where(CheckIn.goal_id == goal_id).order_by(CheckIn.created_at.desc(), CheckIn.id.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())
