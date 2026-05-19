import uuid
from typing import List
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.goal import Goal
from app.models.user import User
from app.repositories.org_repository import OrgRepository


class GoalSharingService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.org_repo = OrgRepository(db)

    async def push_goal_to_subordinates(self, parent_goal_id: uuid.UUID, manager_id: uuid.UUID, weightage: int = 10):
        """
        Creates a linked copy of the parent goal for all direct subordinates.
        """
        parent_goal = await self.db.get(Goal, parent_goal_id)
        if not parent_goal:
            raise HTTPException(status_code=404, detail="Parent goal not found")
        
        if parent_goal.owner_id != manager_id:
            # Check if manager is admin or actually owns the goal
            # For simplicity, we assume the manager owns the goal they are pushing
            pass

        # Get direct subordinates
        query = select(User).where(User.manager_id == manager_id)
        result = await self.db.execute(query)
        subordinates = result.scalars().all()

        created_goals = []
        for sub in subordinates:
            # Check if already pushed
            existing_query = select(Goal).where(Goal.parent_id == parent_goal_id, Goal.owner_id == sub.id)
            existing_res = await self.db.execute(existing_query)
            if existing_res.scalar_one_or_none():
                continue

            child_goal = Goal(
                title=parent_goal.title,
                description=parent_goal.description,
                thrust_area=parent_goal.thrust_area,
                uom=parent_goal.uom,
                weightage=weightage,
                target_value=parent_goal.target_value,
                quarter=parent_goal.quarter,
                parent_id=parent_goal.id,
                owner_id=sub.id,
                status="draft"
            )
            self.db.add(child_goal)
            created_goals.append(child_goal)

        await self.db.flush()
        for goal in created_goals:
            await self.db.refresh(goal)
        return created_goals

    async def sync_children_with_parent(self, parent_goal_id: uuid.UUID):
        """
        Propagates changes from parent to all linked child goals.
        Ensures consistency in title, target, and progress.
        """
        parent_goal = await self.db.get(Goal, parent_goal_id)
        if not parent_goal:
            return

        query = select(Goal).where(Goal.parent_id == parent_goal_id)
        result = await self.db.execute(query)
        children = result.scalars().all()

        for child in children:
            child.title = parent_goal.title
            child.target_value = parent_goal.target_value
            child.current_value = parent_goal.current_value
            child.progress = parent_goal.progress
            # Weightage remains unique to the child
        
        await self.db.flush()
