import uuid
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, field_serializer, ConfigDict
from app.models.enums import GoalStatus, GoalPriority, UoMType, TrackingStatus


class GoalBase(BaseModel):
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    thrust_area: str = Field(..., max_length=100)
    uom: UoMType = UoMType.numeric_min
    priority: GoalPriority = GoalPriority.medium
    weightage: int = Field(default=10, ge=10, le=100)
    quarter: str = Field(..., pattern=r"^\d{4}-Q[1-4]$")
    target_date: Optional[datetime] = None
    target_value: float = Field(default=0.0, ge=0)
    current_value: float = Field(default=0.0, ge=0)

    @field_validator("uom", mode="before")
    @classmethod
    def validate_uom(cls, v):
        if isinstance(v, str):
            mapping = {
                "numeric": UoMType.numeric_min,
                "percentage": UoMType.percentage_min,
                "timeline": UoMType.timeline,
                "zero_based": UoMType.zero
            }
            if v in mapping:
                return mapping[v]
        return v

    @field_serializer("uom", when_used="json")
    def serialize_uom(self, uom: UoMType) -> str:
        mapping = {
            UoMType.numeric_min: "numeric",
            UoMType.numeric_max: "numeric",
            UoMType.percentage_min: "percentage",
            UoMType.percentage_max: "percentage",
            UoMType.timeline: "timeline",
            UoMType.zero: "zero_based"
        }
        return mapping.get(uom, "numeric")


class GoalCreate(GoalBase):
    pass


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    thrust_area: Optional[str] = None
    uom: Optional[UoMType] = None
    priority: Optional[GoalPriority] = None
    weightage: Optional[int] = Field(None, ge=10, le=100)
    progress: Optional[int] = Field(None, ge=0, le=100)
    target_date: Optional[datetime] = None
    target_value: Optional[float] = Field(None, ge=0)
    current_value: Optional[float] = Field(None, ge=0)

    @field_validator("uom", mode="before")
    @classmethod
    def validate_uom(cls, v):
        if isinstance(v, str):
            mapping = {
                "numeric": UoMType.numeric_min,
                "percentage": UoMType.percentage_min,
                "timeline": UoMType.timeline,
                "zero_based": UoMType.zero
            }
            if v in mapping:
                return mapping[v]
        return v


class GoalRead(GoalBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    status: GoalStatus
    tracking_status: TrackingStatus
    progress: int
    is_locked: bool
    parent_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
