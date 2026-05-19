import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from app.repositories.goal_repository import GoalRepository
from app.schemas.goal import GoalCreate, GoalUpdate
from app.models.goal import Goal
from app.models.enums import GoalStatus
from app.services.audit_service import AuditService
from app.core.calculations.engine import CalculationEngine


class GoalService:
    def __init__(self, goal_repo: GoalRepository):
        self.goal_repo = goal_repo

    async def create_goal(self, owner_id: uuid.UUID, goal_in: GoalCreate) -> Goal:
        """
        Create a new goal with BRD constraints:
        - Max 8 goals per quarter.
        - Total weightage must not exceed 100% (though we validate final 100% on submission).
        """
        from app.models.user import User
        from app.services.quarter_enforcement_service import QuarterEnforcementService
        
        owner = await self.goal_repo.db.get(User, owner_id)
        if not owner:
            raise HTTPException(status_code=404, detail="User not found")
            
        await QuarterEnforcementService.validate_goal_operation(
            self.goal_repo.db, goal_in.quarter, owner, action_type="create"
        )

        existing_goals = await self.goal_repo.get_by_owner_and_quarter(owner_id, goal_in.quarter)
        
        if len(existing_goals) >= 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum of 8 goals allowed per quarter."
            )
            
        current_weight = sum(g.weightage for g in existing_goals)
        if current_weight + goal_in.weightage > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Total weightage would exceed 100%. Remaining allowed: {100 - current_weight}%"
            )

        # Create goal
        goal = await self.goal_repo.create(obj_in=goal_in, owner_id=owner_id)
        
        # Calculate initial progress
        goal.progress = int(CalculationEngine.calculate(goal.uom, goal.target_value, goal.current_value))
        await self.goal_repo.db.flush()
        await self.goal_repo.db.refresh(goal)
            
        # Invalidate completion cache dynamically
        from app.services.completion_service import CompletionService
        await CompletionService.invalidate_completion_cache()

        return goal

    async def update_goal(self, goal_id: uuid.UUID, owner_id: uuid.UUID, goal_in: GoalUpdate) -> Goal:
        goal = await self.goal_repo.get(goal_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        if goal.owner_id != owner_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this goal")
            
        from app.models.user import User
        from app.services.quarter_enforcement_service import QuarterEnforcementService
        
        owner = await self.goal_repo.db.get(User, owner_id)
        if not owner:
            raise HTTPException(status_code=404, detail="User not found")
            
        await QuarterEnforcementService.validate_goal_operation(
            self.goal_repo.db, goal.quarter, owner, action_type="update"
        )

        if goal.is_locked:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Locked goals cannot be edited."
            )

        if goal_in.weightage is not None:
            # Re-validate total weightage
            existing_goals = await self.goal_repo.get_by_owner_and_quarter(owner_id, goal.quarter)
            other_weight = sum(g.weightage for g in existing_goals if g.id != goal.id)
            if other_weight + goal_in.weightage > 100:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Total weightage would exceed 100%. Max allowed for this goal: {100 - other_weight}%"
                )

        # Audit: Capture old state
        old_values = {
            "title": goal.title,
            "weightage": goal.weightage,
            "progress": goal.progress,
            "status": goal.status.value if goal.status else None
        }

        # Perform update
        update_data = goal_in.model_dump(exclude_unset=True)
        
        # BRD: Shared Goal Restrictions
        # Recipients (children) may adjust weightage/priority only; Title and Target are read-only.
        if goal.parent_id is not None:
            restricted_fields = {"title", "thrust_area", "uom", "target_value"}
            attempted_restrictions = [f for f in update_data.keys() if f in restricted_fields]
            if attempted_restrictions:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Shared goals cannot have their core definition modified: {', '.join(attempted_restrictions)}. These are managed by the goal owner."
                )

        for field, value in update_data.items():
            setattr(goal, field, value)
            
        # Dynamic progress calculation
        goal.progress = int(CalculationEngine.calculate(goal.uom, goal.target_value, goal.current_value))
            
        await self.goal_repo.db.flush()
        
        # Audit: Log action
        from app.services.audit_service import AuditService
        audit = AuditService(self.goal_repo.db)
        await audit.log_action(
            entity_name="Goal",
            entity_id=goal.id,
            action="UPDATE",
            actor_id=owner_id,
            old_values=old_values,
            new_values=goal_in.model_dump(mode='json', exclude_unset=True)
        )
        
        # Trigger synchronization if this is a parent goal
        from app.services.goal_sharing_service import GoalSharingService
        sharing_service = GoalSharingService(self.goal_repo.db)
        await sharing_service.sync_children_with_parent(goal.id)
        
        await self.goal_repo.db.refresh(goal)

        # Invalidate completion cache dynamically
        from app.services.completion_service import CompletionService
        await CompletionService.invalidate_completion_cache()

        return goal

    async def delete_goal(self, goal_id: uuid.UUID, owner_id: uuid.UUID) -> None:
        goal = await self.goal_repo.get(goal_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        if goal.owner_id != owner_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this goal")
        if goal.status != GoalStatus.draft:
            raise HTTPException(status_code=400, detail="Only DRAFT goals can be deleted")
            
        await self.goal_repo.remove(id=goal_id)
        
        # Audit: Log action
        audit = AuditService(self.goal_repo.db)
        await audit.log_action(
            entity_name="Goal",
            entity_id=goal_id,
            action="DELETE",
            actor_id=owner_id,
            old_values={"title": goal.title}
        )

        # Invalidate completion cache dynamically
        from app.services.completion_service import CompletionService
        await CompletionService.invalidate_completion_cache()

    async def submit_quarter(self, owner_id: uuid.UUID, quarter: str):
        """
        Submits and locks all goals for a quarter.
        - Must total exactly 100% weightage.
        - Must have at least 1 goal.
        """
        from app.models.user import User
        from app.services.quarter_enforcement_service import QuarterEnforcementService
        
        owner = await self.goal_repo.db.get(User, owner_id)
        if not owner:
            raise HTTPException(status_code=404, detail="User not found")
            
        await QuarterEnforcementService.validate_goal_operation(
            self.goal_repo.db, quarter, owner, action_type="submit"
        )

        goals = await self.goal_repo.get_by_owner_and_quarter(owner_id, quarter)
        if not goals:
            raise HTTPException(status_code=400, detail="No goals found for this quarter.")
            
        total_weight = sum(g.weightage for g in goals)
        if total_weight != 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Total weightage must be exactly 100%. Current total: {total_weight}%"
            )

        for goal in goals:
            goal.status = GoalStatus.submitted
            goal.is_locked = True
            
        await self.goal_repo.db.flush()

        # Invalidate completion cache dynamically
        from app.services.completion_service import CompletionService
        await CompletionService.invalidate_completion_cache()

        return {"message": f"Successfully submitted {len(goals)} goals for {quarter}. All goals are now locked."}

    async def manager_update_goal(
        self,
        goal_id: uuid.UUID,
        manager_id: uuid.UUID,
        weightage: int | None,
        target_value: float | None,
    ):
        """
        Manager inline-edit: allows a manager to adjust weightage and target_value
        on a SUBMITTED goal owned by one of their subordinates.
        """
        from sqlalchemy import select
        from app.models.user import User

        goal = await self.goal_repo.get(goal_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")

        if goal.status != GoalStatus.submitted:
            raise HTTPException(
                status_code=400,
                detail="Only SUBMITTED goals can be edited by the manager during review."
            )

        # Verify manager authority
        owner_result = await self.goal_repo.db.execute(
            select(User).where(User.id == goal.owner_id)
        )
        owner = owner_result.scalar_one_or_none()
        if not owner:
            raise HTTPException(status_code=404, detail="Goal owner not found")

        if owner.manager_id != manager_id:
            raise HTTPException(
                status_code=403,
                detail="Only the direct manager of the goal owner can perform inline edits."
            )

        if weightage is not None:
            if weightage < 10 or weightage > 100:
                raise HTTPException(status_code=400, detail="Weightage must be between 10 and 100.")
            goal.weightage = weightage

        if target_value is not None:
            if target_value < 0:
                raise HTTPException(status_code=400, detail="Target value must be non-negative.")
            goal.target_value = target_value
            # Recalculate progress against new target
            goal.progress = int(CalculationEngine.calculate(goal.uom, goal.target_value, goal.current_value))

        await self.goal_repo.db.flush()
        await self.goal_repo.db.refresh(goal)
        return goal

