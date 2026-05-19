import json
from typing import Any, Dict, List
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.goal import Goal
from app.models.user import User
from app.models.department import Department
from app.db.redis import redis_client


class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.cache_ttl = 3600  # 1 hour

    async def get_dashboard_summary(self, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Aggregated summary for the main admin dashboard.
        Cached in Redis to avoid hitting DB on every load.
        """
        cache_key = "analytics:dashboard_summary"
        
        if not force_refresh and redis_client.redis:
            cached = await redis_client.redis.get(cache_key)
            if cached:
                return json.loads(cached)

        # 1. Total Stats
        total_goals = await self.db.scalar(select(func.count(Goal.id)))
        avg_progress = await self.db.scalar(select(func.avg(Goal.progress))) or 0
        total_users = await self.db.scalar(select(func.count(User.id)))

        # 2. Status Distribution
        from app.models.enums import GoalStatus
        status_query = select(Goal.status, func.count(Goal.id)).group_by(Goal.status)
        status_res = await self.db.execute(status_query)
        status_dist = {status.value: count for status, count in status_res.all()}

        # 3. Department Completion (Top 5)
        dept_query = (
            select(Department.name, func.avg(Goal.progress))
            .join(User, User.department_id == Department.id)
            .join(Goal, Goal.owner_id == User.id)
            .group_by(Department.name)
            .order_by(func.avg(Goal.progress).desc())
            .limit(5)
        )
        dept_res = await self.db.execute(dept_query)
        dept_analytics = [{"name": name, "avg_progress": float(prog)} for name, prog in dept_res.all()]

        result = {
            "total_goals": total_goals,
            "avg_progress": round(float(avg_progress), 2),
            "total_users": total_users,
            "status_distribution": status_dist,
            "department_completion": dept_analytics,
            "last_updated": str(func.now()) # Placeholder
        }

        # Cache the result
        if redis_client.redis:
            await redis_client.redis.setex(cache_key, self.cache_ttl, json.dumps(result))
        
        return result

    async def get_qoq_trends(self) -> List[Dict[str, Any]]:
        """Quarter over Quarter progress trends."""
        query = (
            select(Goal.quarter, func.avg(Goal.progress))
            .group_by(Goal.quarter)
            .order_by(Goal.quarter.asc())
        )
        result = await self.db.execute(query)
        return [{"quarter": q, "avg_progress": float(prog)} for q, prog in result.all()]

    async def get_manager_summary(self, manager_id: Any, quarter: str = None) -> Dict[str, Any]:
        """
        Summary stats for a manager's dashboard regarding their team.
        """
        from app.models.enums import GoalStatus, UserRole
        
        manager = await self.db.get(User, manager_id)
        if not manager:
            return {
                "pending_approvals": 0,
                "team_avg_progress": 0,
                "submission_rate": 0,
                "total_subordinates": 0,
                "top_thrust_area": "Revenue Growth"
            }

        if manager.role == UserRole.admin:
            # Admin sees platform-wide stats
            filters = [Goal.deleted_at.is_(None)]
            if quarter:
                filters.append(Goal.quarter == quarter)

            pending_count = await self.db.scalar(
                select(func.count(Goal.id))
                .where(
                    Goal.status == GoalStatus.submitted,
                    *filters
                )
            ) or 0
            
            avg_prog = await self.db.scalar(
                select(func.avg(Goal.progress))
                .where(*filters)
            ) or 0
            
            total_users = await self.db.scalar(select(func.count(User.id)).where(User.id != manager_id)) or 0
            
            submitted_users_count = await self.db.scalar(
                select(func.count(func.distinct(Goal.owner_id)))
                .where(
                    Goal.owner_id != manager_id,
                    Goal.status.in_([GoalStatus.submitted, GoalStatus.approved]),
                    *filters
                )
            ) or 0

            top_area_query = (
                select(Goal.thrust_area)
                .where(*filters)
                .group_by(Goal.thrust_area)
                .order_by(func.count(Goal.id).desc())
                .limit(1)
            )
            top_area = await self.db.scalar(top_area_query) or "Revenue Growth"
            
            return {
                "pending_approvals": pending_count,
                "team_avg_progress": round(float(avg_prog), 1),
                "submission_rate": round((submitted_users_count / total_users) * 100, 1) if total_users else 0,
                "total_subordinates": total_users,
                "top_thrust_area": top_area
            }
            
        # 1. Get subordinates for a regular manager
        sub_query = select(User.id).where(User.manager_id == manager_id)
        sub_res = await self.db.execute(sub_query)
        subordinate_ids = [row[0] for row in sub_res.fetchall()]
        
        if not subordinate_ids:
            return {
                "pending_approvals": 0,
                "team_avg_progress": 0,
                "submission_rate": 0,
                "total_subordinates": 0,
                "top_thrust_area": "Revenue Growth"
            }
            
        filters = [Goal.owner_id.in_(subordinate_ids), Goal.deleted_at.is_(None)]
        if quarter:
            filters.append(Goal.quarter == quarter)

        # 2. Pending Approvals count
        pending_count = await self.db.scalar(
            select(func.count(Goal.id))
            .where(
                Goal.status == GoalStatus.submitted,
                *filters
            )
        ) or 0
        
        # 3. Team Avg Progress
        avg_prog = await self.db.scalar(
            select(func.avg(Goal.progress))
            .where(*filters)
        ) or 0
        
        # 4. Submission Rate
        # A user is 'submitted' if they have at least one SUBMITTED/APPROVED goal for the current quarter
        # For simplicity, we'll just check if they have any SUBMITTED goals
        submitted_users_count = await self.db.scalar(
            select(func.count(func.distinct(Goal.owner_id)))
            .where(
                Goal.status.in_([GoalStatus.submitted, GoalStatus.approved]),
                *filters
            )
        ) or 0

        top_area_query = (
            select(Goal.thrust_area)
            .where(*filters)
            .group_by(Goal.thrust_area)
            .order_by(func.count(Goal.id).desc())
            .limit(1)
        )
        top_area = await self.db.scalar(top_area_query) or "Revenue Growth"
        
        return {
            "pending_approvals": pending_count,
            "team_avg_progress": round(float(avg_prog), 1),
            "submission_rate": round((submitted_users_count / len(subordinate_ids)) * 100, 1) if subordinate_ids else 0,
            "total_subordinates": len(subordinate_ids),
            "top_thrust_area": top_area
        }

