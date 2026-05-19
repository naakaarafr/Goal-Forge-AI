import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

from app.models.user import User
from app.models.goal import Goal
from app.models.checkin import CheckIn
from app.models.workflow import GoalComment, ApprovalHistory
from app.models.manager_feedback import ManagerFeedback
from app.models.enums import PerformanceRating
from app.schemas.manager import ManagerFeedbackCreate, ManagerFeedbackUpdate, TeamMemberCreate
from app.core.security import get_password_hash
from fastapi import HTTPException, status

class ManagerService:
    @staticmethod
    async def get_team_members(
        manager_id: uuid.UUID, 
        db: AsyncSession, 
        quarter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieve all direct subordinates of a manager with optimized subquery/selectinload
        to prevent N+1 queries. Optionally filters goals and progress metrics by quarter.
        """
        # Fetch direct subordinates with department joined and goals loaded
        query = (
            select(User)
            .options(joinedload(User.department), selectinload(User.goals))
            .where(User.manager_id == manager_id)
        )
        result = await db.execute(query)
        subordinates = result.scalars().all()
        
        team_summaries = []
        for sub in subordinates:
            # Filter goals for this user in the specified quarter if provided
            sub_goals = [g for g in sub.goals if g.quarter == quarter] if quarter else sub.goals
            total_goals = len(sub_goals)
            avg_progress = 0.0
            
            if total_goals > 0:
                avg_progress = sum(g.progress for g in sub_goals) / total_goals
            
            # Determine submission status based on goal states
            if any(g.status == "approved" for g in sub_goals):
                submission_status = "Approved"
            elif any(g.status == "submitted" for g in sub_goals):
                submission_status = "Submitted"
            else:
                submission_status = "Draft"
                
            # Get last checkin date
            last_checkin = None
            if total_goals > 0:
                # Find the check-ins for all goals of this employee
                goal_ids = [g.id for g in sub_goals]
                if goal_ids:
                    checkin_query = (
                        select(CheckIn)
                        .where(CheckIn.goal_id.in_(goal_ids))
                        .order_by(desc(CheckIn.created_at))
                        .limit(1)
                    )
                    checkin_res = await db.execute(checkin_query)
                    checkin_obj = checkin_res.scalar_one_or_none()
                    if checkin_obj:
                        last_checkin = checkin_obj.created_at

            team_summaries.append({
                "id": sub.id,
                "full_name": sub.full_name,
                "email": sub.email,
                "department_name": sub.department.name if sub.department else None,
                "total_goals": total_goals,
                "avg_progress": avg_progress,
                "submission_status": submission_status,
                "last_checkin_date": last_checkin
            })
            
        return team_summaries

    @staticmethod
    async def get_employee_quarterly_summary(
        employee_id: uuid.UUID, 
        quarter: str, 
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Compile an employee's quarterly progress, goal status, weightages, and structured feedback.
        """
        # Fetch user
        user_res = await db.execute(select(User).where(User.id == employee_id))
        user = user_res.scalar_one_or_none()
        if not user:
            raise ValueError("Employee not found")

        # Fetch goals for employee in the selected quarter
        goals_query = (
            select(Goal)
            .where(and_(Goal.owner_id == employee_id, Goal.quarter == quarter))
        )
        goals_res = await db.execute(goals_query)
        goals = goals_res.scalars().all()
        
        total_goals = len(goals)
        total_weightage = sum(g.weightage for g in goals)
        
        # Weighted Achievement Score calculation
        weighted_achievement_score = 0.0
        if total_weightage > 0:
            weighted_achievement_score = sum(g.progress * g.weightage for g in goals) / total_weightage

        # Fetch existing manager feedback if any
        feedback_query = (
            select(ManagerFeedback)
            .where(and_(ManagerFeedback.employee_id == employee_id, ManagerFeedback.quarter == quarter))
        )
        feedback_res = await db.execute(feedback_query)
        feedback = feedback_res.scalar_one_or_none()

        return {
            "employee_id": employee_id,
            "full_name": user.full_name,
            "quarter": quarter,
            "total_goals": total_goals,
            "total_weightage": total_weightage,
            "weighted_achievement_score": weighted_achievement_score,
            "goals": [
                {
                    "id": g.id,
                    "title": g.title,
                    "weightage": g.weightage,
                    "progress": g.progress,
                    "status": g.status,
                    "target_date": g.target_date
                } for g in goals
            ],
            "feedback": feedback
        }

    @staticmethod
    async def create_structured_feedback(
        manager_id: uuid.UUID,
        employee_id: uuid.UUID,
        feedback_in: ManagerFeedbackCreate,
        db: AsyncSession
    ) -> ManagerFeedback:
        """
        Create or update structured review feedback for an employee's quarter.
        """
        # Verify employee exists and matches manager
        emp_res = await db.execute(select(User).where(User.id == employee_id))
        employee = emp_res.scalar_one_or_none()
        if not employee:
            raise ValueError("Employee not found")
        
        if employee.manager_id != manager_id:
            # Let's check if manager is admin
            mgr_res = await db.execute(select(User).where(User.id == manager_id))
            manager = mgr_res.scalar_one_or_none()
            if not manager or manager.role != "admin":
                raise PermissionError("Actor is not authorized to manage this employee")

        # Check if feedback already exists
        feedback_query = (
            select(ManagerFeedback)
            .where(and_(
                ManagerFeedback.employee_id == employee_id, 
                ManagerFeedback.quarter == feedback_in.quarter
            ))
        )
        res = await db.execute(feedback_query)
        feedback = res.scalar_one_or_none()

        finalized_at = datetime.now(timezone.utc) if feedback_in.is_finalized else None

        if feedback:
            feedback.performance_rating = feedback_in.performance_rating
            feedback.strengths = feedback_in.strengths
            feedback.development_areas = feedback_in.development_areas
            feedback.discussion_summary = feedback_in.discussion_summary
            feedback.is_finalized = feedback_in.is_finalized
            if feedback_in.is_finalized:
                feedback.finalized_at = finalized_at
        else:
            feedback = ManagerFeedback(
                employee_id=employee_id,
                manager_id=manager_id,
                quarter=feedback_in.quarter,
                performance_rating=feedback_in.performance_rating,
                strengths=feedback_in.strengths,
                development_areas=feedback_in.development_areas,
                discussion_summary=feedback_in.discussion_summary,
                is_finalized=feedback_in.is_finalized,
                finalized_at=finalized_at
            )
            db.add(feedback)
            
        await db.commit()
        await db.refresh(feedback)
        return feedback

    @staticmethod
    async def get_discussion_history(
        employee_id: uuid.UUID,
        quarter: str,
        db: AsyncSession
    ) -> List[Dict[str, Any]]:
        """
        Aggregate chronological feedback, check-ins, and workflow comments.
        """
        # Fetch goals for this employee and quarter
        goals_query = (
            select(Goal)
            .where(and_(Goal.owner_id == employee_id, Goal.quarter == quarter))
        )
        goals_res = await db.execute(goals_query)
        goals = goals_res.scalars().all()
        goal_map = {g.id: g.title for g in goals}
        goal_ids = list(goal_map.keys())

        events = []

        if goal_ids:
            # 1. Fetch check-ins
            checkins_query = (
                select(CheckIn)
                .options(joinedload(CheckIn.author))
                .where(CheckIn.goal_id.in_(goal_ids))
            )
            checkins_res = await db.execute(checkins_query)
            for c in checkins_res.scalars().all():
                events.append({
                    "id": c.id,
                    "type": "checkin",
                    "goal_title": goal_map.get(c.goal_id),
                    "author_name": c.author.full_name if c.author else "System",
                    "timestamp": c.created_at,
                    "details": {
                        "value": c.value,
                        "comment": c.comment,
                        "is_manager_review": c.is_manager_review
                    }
                })

            # 2. Fetch comments
            comments_query = (
                select(GoalComment)
                .options(joinedload(GoalComment.author))
                .where(GoalComment.goal_id.in_(goal_ids))
            )
            comments_res = await db.execute(comments_query)
            for comment in comments_res.scalars().all():
                events.append({
                    "id": comment.id,
                    "type": "comment",
                    "goal_title": goal_map.get(comment.goal_id),
                    "author_name": comment.author.full_name if comment.author else "System",
                    "timestamp": comment.created_at,
                    "details": {
                        "content": comment.content
                    }
                })

            # 3. Fetch workflow status history
            history_query = (
                select(ApprovalHistory)
                .options(joinedload(ApprovalHistory.actor))
                .where(ApprovalHistory.goal_id.in_(goal_ids))
            )
            history_res = await db.execute(history_query)
            for h in history_res.scalars().all():
                events.append({
                    "id": h.id,
                    "type": "approval",
                    "goal_title": goal_map.get(h.goal_id),
                    "author_name": h.actor.full_name if h.actor else "System",
                    "timestamp": h.created_at,
                    "details": {
                        "from_status": h.from_status,
                        "to_status": h.to_status,
                        "comment": h.comment
                    }
                })

        # 4. Fetch structured feedback
        feedback_query = (
            select(ManagerFeedback)
            .options(joinedload(ManagerFeedback.manager))
            .where(and_(
                ManagerFeedback.employee_id == employee_id,
                ManagerFeedback.quarter == quarter
            ))
        )
        feedback_res = await db.execute(feedback_query)
        for fb in feedback_res.scalars().all():
            events.append({
                "id": fb.id,
                "type": "feedback",
                "goal_title": "Quarterly Performance",
                "author_name": fb.manager.full_name if fb.manager else "Manager",
                "timestamp": fb.created_at,
                "details": {
                    "performance_rating": fb.performance_rating,
                    "strengths": fb.strengths,
                    "development_areas": fb.development_areas,
                    "discussion_summary": fb.discussion_summary,
                    "is_finalized": fb.is_finalized
                }
            })

        # Sort all aggregated events in chronological order (newest first)
        events.sort(key=lambda x: x["timestamp"], reverse=True)
        return events

    @staticmethod
    async def add_team_member(
        manager_id: uuid.UUID,
        member_in: TeamMemberCreate,
        db: AsyncSession
    ) -> User:
        """
        Create a new employee user account and assign them to the manager's team.
        """
        # Check if email is already taken
        query = select(User).where(User.email == member_in.email)
        res = await db.execute(query)
        existing = res.scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists."
            )

        hashed_password = get_password_hash(member_in.password)
        new_user = User(
            email=member_in.email,
            full_name=member_in.full_name,
            hashed_password=hashed_password,
            role=member_in.role,
            manager_id=manager_id,
            department_id=member_in.department_id,
            is_active=True
        )
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        return new_user

    @staticmethod
    async def get_assignable_employees(manager_id: uuid.UUID, db: AsyncSession) -> List[User]:
        """
        Get all active employees in the company who are not currently assigned to this manager.
        """
        from app.models.user import UserRole
        from sqlalchemy import or_
        query = (
            select(User)
            .options(joinedload(User.department))
            .where(and_(
                User.role == UserRole.employee,
                User.is_active == True,
                or_(User.manager_id == None, User.manager_id != manager_id)
            ))
        )
        res = await db.execute(query)
        return res.scalars().all()

    @staticmethod
    async def assign_team_member(
        manager_id: uuid.UUID,
        employee_id: uuid.UUID,
        db: AsyncSession
    ) -> User:
        """
        Assign an existing active employee to the manager's team.
        """
        from app.models.user import UserRole
        query = select(User).where(User.id == employee_id)
        res = await db.execute(query)
        employee = res.scalar_one_or_none()
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found."
            )
        if employee.role != UserRole.employee:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected user is not an employee."
            )
        
        employee.manager_id = manager_id
        await db.commit()
        await db.refresh(employee)
        return employee
