import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy import select
from app.repositories.achievement_repository import AchievementRepository
from app.repositories.goal_repository import GoalRepository
from app.repositories.quarter_repository import QuarterRepository
from app.models.achievement import Achievement
from app.models.enums import QuarterState, GoalStatus
from app.schemas.achievement import AchievementCreate, AchievementUpdate
from app.core.calculations.engine import CalculationEngine


class AchievementService:
    def __init__(
        self, 
        achievement_repo: AchievementRepository,
        goal_repo: GoalRepository,
        quarter_repo: QuarterRepository
    ):
        self.achievement_repo = achievement_repo
        self.goal_repo = goal_repo
        self.quarter_repo = quarter_repo

    async def save_achievement_draft(self, owner_id: uuid.UUID, achievement_in: AchievementCreate) -> Achievement:
        """
        Save or update an achievement draft.
        - Allowed in ACTIVE or REVIEW states.
        - Cannot update if already submitted.
        """
        quarter = await self.quarter_repo.get(achievement_in.quarter_id)
        if not quarter:
            raise HTTPException(status_code=404, detail="Quarter not found")
            
        from app.models.user import User
        from app.services.quarter_enforcement_service import QuarterEnforcementService
        user = await self.achievement_repo.db.get(User, owner_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        await QuarterEnforcementService.validate_tracking_operation(
            self.achievement_repo.db, quarter.label, user, operation_name="achievement_draft"
        )

        if quarter.state not in [QuarterState.ACTIVE, QuarterState.REVIEW]:
            raise HTTPException(
                status_code=400,
                detail="Achievements can only be updated during ACTIVE or REVIEW phases."
            )

        goal = await self.goal_repo.get(achievement_in.goal_id)
        if not goal or goal.owner_id != owner_id:
            raise HTTPException(status_code=403, detail="Not authorized for this goal.")

        achievement = await self.achievement_repo.get_by_goal(achievement_in.goal_id)
        
        if achievement:
            if achievement.is_submitted:
                raise HTTPException(status_code=400, detail="Cannot edit a submitted achievement.")
            
            if achievement_in.version_id is not None and achievement.version_id != achievement_in.version_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Optimistic lock failure: Achievement has been updated by another process."
                )
            
            # Audit old state
            old_values = {"actual_value": achievement.actual_value, "status": achievement.status.value if achievement.status else None}
            
            # Update
            achievement.actual_value = achievement_in.actual_value
            achievement.status = achievement_in.status
            achievement.employee_summary = achievement_in.employee_summary
            achievement.score = CalculationEngine.calculate(goal.uom, achievement.planned_value, achievement_in.actual_value)
            
            await self._log_audit(owner_id, achievement.id, "UPDATE_DRAFT", old_values, achievement_in.model_dump(mode='json'))
        else:
            # Create new draft
            achievement = Achievement(
                goal_id=goal.id,
                owner_id=owner_id,
                quarter_id=quarter.id,
                planned_value=goal.target_value,
                actual_value=achievement_in.actual_value,
                status=achievement_in.status,
                employee_summary=achievement_in.employee_summary,
                score=CalculationEngine.calculate(goal.uom, goal.target_value, achievement_in.actual_value),
                is_submitted=False
            )
            self.achievement_repo.db.add(achievement)
            await self.achievement_repo.db.flush()
            await self._log_audit(owner_id, achievement.id, "CREATE_DRAFT", None, achievement_in.model_dump(mode='json'))

        await self.achievement_repo.db.flush()
        await self.achievement_repo.db.refresh(achievement)
        return achievement

    async def submit_achievement(self, owner_id: uuid.UUID, achievement_id: uuid.UUID) -> Achievement:
        """
        Finalize and submit an achievement.
        - Quarter must be in REVIEW state.
        - Locked after submission.
        """
        achievement = await self.achievement_repo.get(achievement_id)
        if not achievement or achievement.owner_id != owner_id:
            raise HTTPException(status_code=404, detail="Achievement not found")

        if achievement.is_submitted:
            raise HTTPException(status_code=400, detail="Achievement already submitted.")

        quarter = await self.quarter_rel_check(achievement.quarter_id)
        
        from app.models.user import User
        from app.services.quarter_enforcement_service import QuarterEnforcementService
        user = await self.achievement_repo.db.get(User, owner_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        await QuarterEnforcementService.validate_tracking_operation(
            self.achievement_repo.db, quarter.label, user, operation_name="achievement_submit"
        )

        if quarter.state != QuarterState.REVIEW:
            raise HTTPException(status_code=400, detail="Submission only allowed during REVIEW phase.")

        achievement.is_submitted = True
        await self._log_audit(owner_id, achievement.id, "SUBMIT", {"is_submitted": False}, {"is_submitted": True})
        
        await self.achievement_repo.db.flush()
        await self.achievement_repo.db.refresh(achievement)
        return achievement

    async def quarter_rel_check(self, quarter_id: uuid.UUID):
        quarter = await self.quarter_repo.get(quarter_id)
        if not quarter:
             raise HTTPException(status_code=404, detail="Quarter not found")
        return quarter

    async def review_achievement(
        self, 
        manager_id: uuid.UUID, 
        achievement_id: uuid.UUID, 
        update_in: AchievementUpdate
    ) -> Achievement:
        """
        Manager reviews a SUBMITTED achievement.
        """
        achievement = await self.achievement_repo.get(achievement_id)
        if not achievement:
            raise HTTPException(status_code=404, detail="Achievement not found")

        if not achievement.is_submitted:
             raise HTTPException(status_code=400, detail="Cannot review a draft achievement.")

        # Verify manager authority
        from app.models.user import User
        owner_result = await self.achievement_repo.db.execute(
            select(User).where(User.id == achievement.owner_id)
        )
        owner = owner_result.scalar_one_or_none()
        if not owner or owner.manager_id != manager_id:
            raise HTTPException(status_code=403, detail="Only the direct manager can review this achievement.")

        if achievement.finalized_at:
            raise HTTPException(status_code=400, detail="Achievement already finalized.")

        # Update achievement
        old_values = {"manager_feedback": achievement.manager_feedback}
        update_data_json = update_in.model_dump(mode='json', exclude_unset=True)
        update_data = update_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(achievement, field, value)

        if achievement.manager_feedback:
            achievement.finalized_at = datetime.utcnow()

        await self._log_audit(manager_id, achievement.id, "REVIEW", old_values, update_data_json)
        await self.achievement_repo.db.flush()
        await self.achievement_repo.db.refresh(achievement)
        return achievement

    async def _log_audit(self, actor_id: uuid.UUID, entity_id: uuid.UUID, action: str, old_values: dict | None, new_values: dict | None):
        from app.services.audit_service import AuditService
        audit = AuditService(self.achievement_repo.db)
        await audit.log_action(
            entity_name="Achievement",
            entity_id=entity_id,
            action=action,
            actor_id=actor_id,
            old_values=old_values,
            new_values=new_values
        )

    async def get_user_achievements(self, user_id: uuid.UUID, quarter_id: uuid.UUID) -> List[Achievement]:
        return await self.achievement_repo.get_by_owner_and_quarter(user_id, quarter_id)

    async def get_team_achievements(self, manager_id: uuid.UUID, quarter_id: uuid.UUID) -> List[Achievement]:
        return await self.achievement_repo.get_team_achievements(manager_id, quarter_id)
