import uuid
from datetime import datetime, timezone, timedelta
from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.goal import Goal
from app.models.user import User
from app.models.escalation import Escalation, EscalationLevel, EscalationStatus
from app.models.notification import Notification


class EscalationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def run_escalation_checks(self):
        """
        Main engine task:
        1. Find overdue goals (DRAFT or SUBMITTED past target_date).
        2. Create Level 1 Escalations if none exist.
        3. Escalate Level 1 -> 2 if unresolved after 3 days.
        """
        now = datetime.now(timezone.utc)
        
        # 1. Find goals overdue for check-in or submission
        # For simplicity: Goals where target_date < now and progress < 100
        query = select(Goal).where(
            Goal.target_date < now,
            Goal.progress < 100,
            Goal.deleted_at == None
        )
        result = await self.db.execute(query)
        overdue_goals = result.scalars().all()

        for goal in overdue_goals:
            await self._process_goal_escalation(goal)
            
        await self.db.flush()

    async def _process_goal_escalation(self, goal: Goal):
        # Get latest escalation for this goal
        query = select(Escalation).where(
            Escalation.goal_id == goal.id,
            Escalation.status == EscalationStatus.PENDING
        ).order_by(Escalation.level.desc()).limit(1)
        
        result = await self.db.execute(query)
        latest = result.scalar_one_or_none()
        
        if not latest:
            # Create Level 1: Notify Manager
            owner_query = await self.db.execute(select(User).where(User.id == goal.owner_id))
            owner = owner_query.scalar_one()
            if owner.manager_id:
                await self._create_escalation(goal, owner.manager_id, EscalationLevel.LEVEL_1)
        else:
            # Check if we should bump level (e.g. after 3 days)
            age = datetime.now(timezone.utc) - latest.created_at.replace(tzinfo=timezone.utc)
            if age > timedelta(days=3):
                if latest.level == EscalationLevel.LEVEL_1:
                    # Level 2: Skip-level manager
                    manager_query = await self.db.execute(select(User).where(User.id == latest.target_user_id))
                    manager = manager_query.scalar_one()
                    if manager.manager_id:
                        await self._create_escalation(goal, manager.manager_id, EscalationLevel.LEVEL_2)

    async def _create_escalation(self, goal: Goal, target_id: uuid.UUID, level: EscalationLevel):
        escalation = Escalation(
            goal_id=goal.id,
            target_user_id=target_id,
            level=level,
            reason=f"Goal '{goal.title}' is overdue with {goal.progress}% progress."
        )
        self.db.add(escalation)
        
        # Also create a notification
        notification = Notification(
            user_id=target_id,
            title="Goal Escalation",
            content=f"Action Required: {escalation.reason}",
            type="escalation"
        )
        self.db.add(notification)
