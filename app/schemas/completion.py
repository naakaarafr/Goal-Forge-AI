import uuid
from datetime import datetime
from typing import List, Dict, Optional
from pydantic import BaseModel, ConfigDict


class OverdueCheckinRead(BaseModel):
    goal_id: uuid.UUID
    goal_title: str
    owner_name: str
    owner_email: str
    days_since_last_checkin: int
    last_checkin_value: Optional[float] = None
    last_checkin_date: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class EmployeeCompletionStats(BaseModel):
    user_id: uuid.UUID
    full_name: str
    email: str
    department_name: Optional[str] = None
    total_goals: int
    completed_goals: int
    average_progress: float
    last_active: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ManagerCompletionStats(BaseModel):
    user_id: uuid.UUID
    full_name: str
    email: str
    subordinate_count: int
    total_goals: int
    average_team_progress: float
    pending_approvals: int

    model_config = ConfigDict(from_attributes=True)


class CompletionDashboardSummary(BaseModel):
    total_goals: int
    completed_goals: int
    overall_avg_progress: float
    weighted_strategic_achievement: float
    overall_completion_rate: float
    status_distribution: Dict[str, int]
    tracking_status_distribution: Dict[str, int]
    overdue_checkins: List[OverdueCheckinRead]
    employee_stats: List[EmployeeCompletionStats]
    manager_stats: List[ManagerCompletionStats]
    quarter: str
    last_updated: datetime

    model_config = ConfigDict(from_attributes=True)
