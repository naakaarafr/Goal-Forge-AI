import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import select, func, and_, or_, cast, String
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.goal import Goal
from app.models.user import User
from app.models.checkin import CheckIn
from app.models.department import Department
from app.models.enums import GoalStatus, TrackingStatus, UserRole
from app.db.redis import redis_client


class CompletionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.cache_ttl = 1800  # 30 minutes cache

    async def get_completion_summary(
        self, quarter: str, days_overdue: int = 7, force_refresh: bool = False
    ) -> Dict[str, Any]:
        """
        Retrieves high-performance aggregated metrics, employee stats,
        manager stats, and overdue check-ins for the specified quarter.
        Cached in Redis for fast rendering.
        """
        cache_key = f"completion:summary:{quarter}:{days_overdue}"

        if not force_refresh and redis_client.redis:
            cached = await redis_client.redis.get(cache_key)
            if cached:
                try:
                    data = json.loads(cached)
                    # Convert string representations back to datetime if necessary
                    return data
                except Exception:
                    pass

        # Calculate time threshold for overdue check-ins
        now = datetime.now(timezone.utc)

        # -------------------------------------------------------------
        # 1. Overdue Check-ins Scanner (Run First to get overdue_goal_ids)
        # -------------------------------------------------------------
        # Subquery for maximum check-in dates
        max_checkin_sub = (
            select(
                CheckIn.goal_id,
                func.max(CheckIn.created_at).label("max_created_at")
            )
            .group_by(CheckIn.goal_id)
        ).subquery()

        # Join to get the latest checkin value and date
        latest_checkin_query = (
            select(
                CheckIn.goal_id,
                CheckIn.value,
                CheckIn.created_at
            )
            .join(
                max_checkin_sub,
                and_(
                    CheckIn.goal_id == max_checkin_sub.c.goal_id,
                    CheckIn.created_at == max_checkin_sub.c.max_created_at
                )
            )
        ).subquery()

        # Fetch active goals with owner info and their latest checkin (if any)
        overdue_goals_query = (
            select(
                Goal.id,
                Goal.title,
                Goal.created_at.label("goal_created_at"),
                User.full_name,
                User.email,
                latest_checkin_query.c.value.label("last_value"),
                latest_checkin_query.c.created_at.label("last_date")
            )
            .join(User, User.id == Goal.owner_id)
            .outerjoin(latest_checkin_query, latest_checkin_query.c.goal_id == Goal.id)
            .where(
                Goal.quarter == quarter,
                Goal.deleted_at.is_(None)
            )
        )
        
        overdue_res = await self.db.execute(overdue_goals_query)
        overdue_checkins = []
        overdue_goal_ids = []

        for row in overdue_res.all():
            last_date = row.last_date
            goal_created = row.goal_created_at
            is_overdue = False

            # If there was a check-in, compute delta from that date
            if last_date:
                # Handle tzinfo difference
                if last_date.tzinfo is None:
                    last_date = last_date.replace(tzinfo=timezone.utc)
                delta = (now - last_date).days
                
                if delta >= days_overdue:
                    is_overdue = True
                    overdue_checkins.append({
                        "goal_id": str(row.id),
                        "goal_title": row.title,
                        "owner_name": row.full_name or "Unknown User",
                        "owner_email": row.email,
                        "days_since_last_checkin": delta,
                        "last_checkin_value": float(row.last_value),
                        "last_checkin_date": last_date.isoformat()
                    })
            else:
                # No checkins logged. Compute delta from goal creation date
                if goal_created.tzinfo is None:
                    goal_created = goal_created.replace(tzinfo=timezone.utc)
                delta = (now - goal_created).days
                
                if delta >= days_overdue:
                    is_overdue = True
                    overdue_checkins.append({
                        "goal_id": str(row.id),
                        "goal_title": row.title,
                        "owner_name": row.full_name or "Unknown User",
                        "owner_email": row.email,
                        "days_since_last_checkin": delta,
                        "last_checkin_value": None,
                        "last_checkin_date": None
                    })
            
            if is_overdue:
                overdue_goal_ids.append(row.id)

        # Sort by maximum delay first
        overdue_checkins.sort(key=lambda x: x["days_since_last_checkin"], reverse=True)

        # -------------------------------------------------------------
        # 2. Base Goal Queries (Overall Quarter Progress Overview)
        # -------------------------------------------------------------
        goals_filter = [Goal.quarter == quarter, Goal.deleted_at.is_(None)]
        
        total_goals = await self.db.scalar(
            select(func.count(Goal.id)).where(*goals_filter)
        ) or 0
        
        if total_goals == 0:
            result = {
                "total_goals": 0,
                "completed_goals": 0,
                "overall_avg_progress": 0.0,
                "weighted_strategic_achievement": 0.0,
                "overall_completion_rate": 0.0,
                "status_distribution": {},
                "tracking_status_distribution": {},
                "overdue_checkins": [],
                "employee_stats": [],
                "manager_stats": [],
                "quarter": quarter,
                "last_updated": now.isoformat()
            }
            if redis_client.redis:
                try:
                    await redis_client.redis.setex(
                        cache_key,
                        self.cache_ttl,
                        json.dumps(result)
                    )
                except Exception:
                    pass
            return result
        
        total_goals = await self.db.scalar(
            select(func.count(Goal.id)).where(*goals_filter)
        ) or 0
        
        completed_goals = await self.db.scalar(
            select(func.count(Goal.id)).where(Goal.progress == 100, *goals_filter)
        ) or 0
        
        overall_avg_progress = await self.db.scalar(
            select(func.avg(Goal.progress)).where(*goals_filter)
        ) or 0.0

        # Weighted Strategic Achievement: sum(progress * weightage) / sum(weightage)
        weighted_sum = await self.db.execute(
            select(
                func.sum(Goal.progress * Goal.weightage),
                func.sum(Goal.weightage)
            ).where(*goals_filter)
        )
        total_weighted_progress, total_weightage = weighted_sum.first() or (0, 0)
        weighted_strategic_achievement = (
            float(total_weighted_progress) / float(total_weightage)
            if total_weightage and total_weighted_progress
            else 0.0
        )

        overall_completion_rate = (
            (completed_goals / total_goals) * 100.0 if total_goals > 0 else 0.0
        )

        # Status and Tracking Status Distributions
        status_res = await self.db.execute(
            select(Goal.status, func.count(Goal.id))
            .where(*goals_filter)
            .group_by(Goal.status)
        )
        status_dist = {status.value: count for status, count in status_res.all()}

        tracking_res = await self.db.execute(
            select(Goal.tracking_status, func.count(Goal.id))
            .where(*goals_filter)
            .group_by(Goal.tracking_status)
        )
        tracking_dist = {status.value: count for status, count in tracking_res.all()}

        # -------------------------------------------------------------
        # 3. Employee Completion Stats (Filtered by overdue_goal_ids)
        # -------------------------------------------------------------
        employees_query = (
            select(
                User.id,
                User.full_name,
                User.email,
                Department.name.label("department_name")
            )
            .outerjoin(Department, Department.id == User.department_id)
            .where(User.role != UserRole.admin, User.deleted_at.is_(None))
        )
        emp_res = await self.db.execute(employees_query)
        employee_stats = []

        for row in emp_res.all():
            # Get goals specifically for this user
            user_goals_res = await self.db.execute(
                select(Goal.progress, Goal.updated_at)
                .where(Goal.owner_id == row.id, Goal.quarter == quarter, Goal.deleted_at.is_(None))
            )
            user_goals = user_goals_res.all()
            
            ug_count = len(user_goals)
            
            # Exclude employee if they have no goals in this quarter
            if ug_count == 0:
                continue

            ug_completed = sum(1 for g in user_goals if g.progress == 100)
            ug_avg_progress = (sum(g.progress for g in user_goals) / ug_count) if ug_count > 0 else 0.0
            
            # Find last active timestamp from user checkins
            last_checkin_time = await self.db.scalar(
                select(func.max(CheckIn.created_at)).where(CheckIn.author_id == row.id)
            )

            employee_stats.append({
                "user_id": str(row.id),
                "full_name": row.full_name or "Unknown Employee",
                "email": row.email,
                "department_name": row.department_name,
                "total_goals": ug_count,
                "completed_goals": ug_completed,
                "average_progress": round(float(ug_avg_progress), 2),
                "last_active": last_checkin_time.isoformat() if last_checkin_time else None
            })

        employee_stats.sort(key=lambda x: x["average_progress"], reverse=True)

        # -------------------------------------------------------------
        # 4. Manager Completion Stats (Filtered by overdue_goal_ids)
        # -------------------------------------------------------------
        managers_query = (
            select(User.id, User.full_name, User.email)
            .where(User.role == UserRole.manager, User.deleted_at.is_(None))
        )
        mngr_res = await self.db.execute(managers_query)
        manager_stats = []

        for row in mngr_res.all():
            # Subordinates list
            sub_ids_res = await self.db.execute(
                select(User.id).where(User.manager_id == row.id, User.deleted_at.is_(None))
            )
            sub_ids = [r[0] for r in sub_ids_res.all()]
            sub_count = len(sub_ids)

            if sub_count > 0:
                # Subordinate Goals details (Filtered by active quarter)
                team_goals_res = await self.db.execute(
                    select(Goal.progress, Goal.status)
                    .where(Goal.owner_id.in_(sub_ids), Goal.quarter == quarter, Goal.deleted_at.is_(None))
                )
                team_goals = team_goals_res.all()
                team_goals_count = len(team_goals)
                
                if team_goals_count == 0:
                    continue # Skip managers with no team goals

                team_avg_progress = (
                    sum(g.progress for g in team_goals) / team_goals_count
                    if team_goals_count > 0
                    else 0.0
                )
                pending_approvals = sum(1 for g in team_goals if g.status == GoalStatus.submitted)
            else:
                continue # Skip managers with no subordinates

            manager_stats.append({
                "user_id": str(row.id),
                "full_name": row.full_name or "Unknown Manager",
                "email": row.email,
                "subordinate_count": sub_count,
                "total_goals": team_goals_count,
                "average_team_progress": round(float(team_avg_progress), 2),
                "pending_approvals": pending_approvals
            })

        manager_stats.sort(key=lambda x: x["average_team_progress"], reverse=True)

        # Final Dashboard Payload
        result = {
            "total_goals": total_goals,
            "completed_goals": completed_goals,
            "overall_avg_progress": round(float(overall_avg_progress), 2),
            "weighted_strategic_achievement": round(weighted_strategic_achievement, 2),
            "overall_completion_rate": round(overall_completion_rate, 2),
            "status_distribution": status_dist,
            "tracking_status_distribution": tracking_dist,
            "overdue_checkins": overdue_checkins,
            "employee_stats": employee_stats,
            "manager_stats": manager_stats,
            "quarter": quarter,
            "last_updated": now.isoformat()
        }

        # Cache summary payload in Redis
        if redis_client.redis:
            try:
                await redis_client.redis.setex(
                    cache_key,
                    self.cache_ttl,
                    json.dumps(result)
                )
            except Exception:
                pass

        return result

    @staticmethod
    async def invalidate_completion_cache():
        """
        Clears all completion:summary:* cache records in Redis.
        Triggered dynamically on check-in creations or goal progress mutations.
        """
        if redis_client.redis:
            try:
                keys = await redis_client.redis.keys("completion:summary:*")
                if keys:
                    await redis_client.redis.delete(*keys)
            except Exception:
                pass
