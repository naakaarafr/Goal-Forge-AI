import uuid
import json
from typing import List, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.goal import Goal
from app.models.user import User, UserRole
from app.services.analytics_service import AnalyticsService

class ContextService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def build_user_context(self, user: User) -> str:
        """
        Gathers relevant data for the AI context based on user role.
        Ensures data privacy by only fetching authorized records.
        """
        context = []
        
        # 1. Personal Goals
        goal_query = select(Goal).where(Goal.owner_id == user.id, Goal.deleted_at == None)
        goal_res = await self.db.execute(goal_query)
        goals = goal_res.scalars().all()
        
        context.append("### Your Goals:")
        for g in goals:
            context.append(f"- {g.title}: {g.progress}% progress, status: {g.status}, weightage: {g.weightage}%")

        # 2. Manager/Admin Context (Team Data)
        if user.role in [UserRole.manager, UserRole.admin]:
            analytics = AnalyticsService(self.db)
            summary = await analytics.get_dashboard_summary()
            context.append("\n### Team/Org Overview:")
            context.append(f"- Total Managed Goals: {summary.get('total_goals')}")
            context.append(f"- Org Avg Progress: {summary.get('avg_progress')}%")
            
            # Subordinates (if Manager)
            if user.role == UserRole.manager:
                sub_query = select(User.full_name, User.id).where(User.manager_id == user.id)
                sub_res = await self.db.execute(sub_query)
                subs = sub_res.all()
                context.append("\n### Your Team:")
                for name, _id in subs:
                    context.append(f"- {name}")

        return "\n".join(context)
