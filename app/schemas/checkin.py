import uuid
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.enums import TrackingStatus

class CheckInCreate(BaseModel):
    value: float
    comment: Optional[str] = None
    tracking_status: Optional[TrackingStatus] = None
    is_manager_review: bool = False

class CheckInRead(BaseModel):
    id: uuid.UUID
    goal_id: uuid.UUID
    author_id: uuid.UUID
    value: float
    comment: Optional[str] = None
    is_manager_review: bool
    tracking_status_update: Optional[TrackingStatus] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
