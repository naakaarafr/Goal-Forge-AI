import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Boolean, Enum
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, TimestampMixin
from app.models.enums import QuarterState


class Quarter(Base, TimestampMixin):
    """
    Quarter entity to manage the lifecycle of goal planning and achievement tracking.
    """
    __tablename__ = "quarters"

    label: Mapped[str] = mapped_column(String(20), nullable=False, unique=True, index=True)
    state: Mapped[QuarterState] = mapped_column(
        Enum(QuarterState), default=QuarterState.PLANNING, nullable=False, index=True
    )
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_immutable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    def __repr__(self) -> str:
        return f"<Quarter {self.label} ({self.state})>"
