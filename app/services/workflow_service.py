import uuid
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.goal import Goal
from app.models.enums import GoalStatus, UserRole
from app.models.workflow import ApprovalHistory, GoalComment
from app.models.user import User


class WorkflowService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _add_history(self, goal: Goal, actor_id: uuid.UUID, from_status: GoalStatus, to_status: GoalStatus, comment: str = None):
        history = ApprovalHistory(
            goal_id=goal.id,
            actor_id=actor_id,
            from_status=from_status,
            to_status=to_status,
            comment=comment
        )
        self.db.add(history)

    async def approve_goal(self, goal_id: uuid.UUID, manager: User, comment: str = None):
        """Transition: SUBMITTED -> APPROVED"""
        goal = await self.db.get(Goal, goal_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        # Security: Only the manager of the goal owner (or Admin) can approve
        owner_query = await self.db.execute(select(User).where(User.id == goal.owner_id))
        owner = owner_query.scalar_one()
        
        if manager.id != owner.manager_id and manager.role != UserRole.admin:
            raise HTTPException(status_code=403, detail="Only the assigned manager can approve this goal.")

        if goal.status != GoalStatus.submitted:
            raise HTTPException(status_code=400, detail=f"Cannot approve goal in {goal.status} status.")

        old_status = goal.status
        goal.status = GoalStatus.approved
        goal.is_locked = True # Hard lock after approval
        
        await self._add_history(goal, manager.id, old_status, GoalStatus.approved, comment)
        await self.db.flush()
        await self.db.refresh(goal)

        # Invalidate completion cache dynamically
        from app.services.completion_service import CompletionService
        await CompletionService.invalidate_completion_cache()

        return goal

    async def reject_to_rework(self, goal_id: uuid.UUID, manager: User, comment: str):
        """Transition: SUBMITTED -> DRAFT (Return for rework)"""
        if not comment:
            raise HTTPException(status_code=400, detail="Comment is required when returning for rework.")
            
        goal = await self.db.get(Goal, goal_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")

        # Security check
        owner_query = await self.db.execute(select(User).where(User.id == goal.owner_id))
        owner = owner_query.scalar_one()
        if manager.id != owner.manager_id and manager.role != UserRole.admin:
            raise HTTPException(status_code=403, detail="Not authorized.")

        if goal.status != GoalStatus.submitted:
            raise HTTPException(status_code=400, detail="Only submitted goals can be returned for rework.")

        old_status = goal.status
        goal.status = GoalStatus.draft
        goal.is_locked = False # Unlock for editing
        
        await self._add_history(goal, manager.id, old_status, GoalStatus.draft, comment)
        
        # Also add as a formal comment
        new_comment = GoalComment(goal_id=goal.id, author_id=manager.id, content=comment)
        self.db.add(new_comment)
        
        await self.db.flush()
        await self.db.refresh(goal)

        # Invalidate completion cache dynamically
        from app.services.completion_service import CompletionService
        await CompletionService.invalidate_completion_cache()

        return goal

    async def get_approval_history(self, goal_id: uuid.UUID) -> List[ApprovalHistory]:
        query = select(ApprovalHistory).where(ApprovalHistory.goal_id == goal_id).order_by(ApprovalHistory.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_pending_approvals(self, manager_id: uuid.UUID) -> List[Goal]:
        """Return all SUBMITTED goals. Admins see all, managers see subordinates'."""
        manager = await self.db.get(User, manager_id)
        if not manager:
            return []

        if manager.role == UserRole.admin:
            # Admin sees all submitted goals
            goal_query = (
                select(Goal)
                .options(selectinload(Goal.owner))
                .where(
                    Goal.status == GoalStatus.submitted,
                    Goal.deleted_at.is_(None),
                )
                .order_by(Goal.updated_at.desc())
            )
        else:
            # Find all subordinate user IDs
            sub_query = select(User.id).where(User.manager_id == manager_id)
            sub_result = await self.db.execute(sub_query)
            subordinate_ids = [row[0] for row in sub_result.fetchall()]

            if not subordinate_ids:
                return []

            # Fetch SUBMITTED goals owned by those subordinates
            goal_query = (
                select(Goal)
                .options(selectinload(Goal.owner))
                .where(
                    Goal.owner_id.in_(subordinate_ids),
                    Goal.status == GoalStatus.submitted,
                    Goal.deleted_at.is_(None),
                )
                .order_by(Goal.updated_at.desc())
            )

        result = await self.db.execute(goal_query)
        return list(result.scalars().all())

