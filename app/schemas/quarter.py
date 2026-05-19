import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.models.enums import QuarterState


class QuarterBase(BaseModel):
    label: str = Field(..., pattern=r"^\d{4}-Q[1-4]$")
    start_date: datetime
    end_date: datetime


class QuarterCreate(QuarterBase):
    state: QuarterState = QuarterState.PLANNING


class QuarterUpdate(BaseModel):
    state: Optional[QuarterState] = None
    is_immutable: Optional[bool] = None


class QuarterRead(QuarterBase):
    id: uuid.UUID
    state: QuarterState
    is_immutable: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
