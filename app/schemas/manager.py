import uuid
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr
from app.models.enums import PerformanceRating, TrackingStatus, UserRole

class TeamMemberCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: UserRole = UserRole.employee
    department_id: Optional[uuid.UUID] = None

class ManagerFeedbackCreate(BaseModel):
    employee_id: uuid.UUID
    quarter: str
    performance_rating: PerformanceRating
    strengths: str
    development_areas: str
    discussion_summary: Optional[str] = None
    is_finalized: bool = False

class ManagerFeedbackUpdate(BaseModel):
    performance_rating: Optional[PerformanceRating] = None
    strengths: Optional[str] = None
    development_areas: Optional[str] = None
    discussion_summary: Optional[str] = None
    is_finalized: Optional[bool] = None

class ManagerFeedbackRead(BaseModel):
    id: uuid.UUID
    employee_id: uuid.UUID
    manager_id: uuid.UUID
    quarter: str
    performance_rating: PerformanceRating
    strengths: str
    development_areas: str
    discussion_summary: Optional[str] = None
    is_finalized: bool
    finalized_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class GoalSummaryRead(BaseModel):
    id: uuid.UUID
    title: str
    weightage: float
    progress: float
    status: str
    target_date: Optional[datetime] = None

class EmployeeQuarterlySummary(BaseModel):
    employee_id: uuid.UUID
    full_name: Optional[str] = None
    quarter: str
    total_goals: int
    total_weightage: float
    weighted_achievement_score: float
    goals: List[GoalSummaryRead]
    feedback: Optional[ManagerFeedbackRead] = None

class TeamMemberSummary(BaseModel):
    id: uuid.UUID
    full_name: Optional[str] = None
    email: str
    department_name: Optional[str] = None
    total_goals: int
    avg_progress: float
    submission_status: str # e.g. "Submitted", "Approved", "Draft"
    last_checkin_date: Optional[datetime] = None
