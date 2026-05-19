import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.models.enums import TrackingStatus


class AchievementBase(BaseModel):
    goal_id: uuid.UUID
    quarter_id: uuid.UUID
    actual_value: float = Field(..., ge=0)
    status: TrackingStatus
    employee_summary: str = Field('', min_length=0)


class AchievementCreate(AchievementBase):
    """Used for draft saves - employee_summary is optional and can be empty."""
    employee_summary: str = Field('', min_length=0)  # No min_length for drafts
    version_id: Optional[int] = None


class AchievementUpdate(BaseModel):
    actual_value: Optional[float] = Field(None, ge=0)
    status: Optional[TrackingStatus] = None
    employee_summary: Optional[str] = None
    manager_feedback: Optional[str] = None
    version_id: Optional[int] = None


class AchievementRead(AchievementBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    planned_value: float
    manager_feedback: Optional[str] = None
    score: float
    is_submitted: bool
    version_id: int
    finalized_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
