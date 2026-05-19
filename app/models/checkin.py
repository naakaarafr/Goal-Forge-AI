import uuid
from typing import Optional
from sqlalchemy import String, Text, ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, GUID
from app.models.enums import TrackingStatus
from sqlalchemy import Enum, Boolean

class CheckIn(Base, TimestampMixin):
    """Tracking progress updates for a specific goal."""
    __tablename__ = "check_ins"

    goal_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("goals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id"), nullable=False
    )
    
    value: Mapped[float] = mapped_column(Float, nullable=False)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    is_manager_review: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    tracking_status_update: Mapped[Optional[TrackingStatus]] = mapped_column(
        Enum(TrackingStatus), nullable=True
    )
    
    # Relationships
    goal: Mapped["Goal"] = relationship("Goal")
    author: Mapped["User"] = relationship("User")
