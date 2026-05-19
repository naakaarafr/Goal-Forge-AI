import uuid
from typing import Optional, TYPE_CHECKING
from datetime import datetime
from sqlalchemy import String, Text, ForeignKey, UUID, DateTime, Float, Enum, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, GUID
from app.models.enums import TrackingStatus

if TYPE_CHECKING:
    from app.models.goal import Goal
    from app.models.user import User
    from app.models.quarter import Quarter


class Achievement(Base, TimestampMixin):
    """
    Achievement record for a goal in a specific quarter.
    Snapshots the planned value and tracks final actual achievement.
    """
    __tablename__ = "achievements"

    goal_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("goals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    quarter_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("quarters.id", ondelete="CASCADE"), nullable=False, index=True
    )

    planned_value: Mapped[float] = mapped_column(Float, nullable=False)
    actual_value: Mapped[float] = mapped_column(Float, nullable=False)
    
    status: Mapped[TrackingStatus] = mapped_column(
        Enum(TrackingStatus), default=TrackingStatus.not_started, nullable=False, index=True
    )
    
    employee_summary: Mapped[str] = mapped_column(Text, nullable=False)
    manager_feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    is_submitted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    version_id: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    
    finalized_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __mapper_args__ = {
        "version_id_col": version_id
    }

    # Relationships
    goal: Mapped["Goal"] = relationship("Goal")
    owner: Mapped["User"] = relationship("User")
    quarter_rel: Mapped["Quarter"] = relationship("Quarter")

    def __repr__(self) -> str:
        return f"<Achievement Goal:{self.goal_id} Quarter:{self.quarter_id} Score:{self.score}>"
