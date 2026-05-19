import uuid
import enum
from typing import Optional
from sqlalchemy import String, Text, ForeignKey, DateTime, Enum, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, GUID

class EscalationLevel(int, enum.Enum):
    LEVEL_1 = 1  # Manager
    LEVEL_2 = 2  # Skip-level
    LEVEL_3 = 3  # Admin

class EscalationStatus(str, enum.Enum):
    PENDING = "pending"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"

class Escalation(Base, TimestampMixin):
    """
    Tracks overdue goals and pushes them to higher management.
    """
    __tablename__ = "escalations"

    goal_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("goals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    
    level: Mapped[EscalationLevel] = mapped_column(
        Integer, default=EscalationLevel.LEVEL_1, nullable=False
    )
    status: Mapped[EscalationStatus] = mapped_column(
        Enum(EscalationStatus), default=EscalationStatus.PENDING, nullable=False, index=True
    )
    
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Who is being notified
    target_user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id"), nullable=False
    )

    # Relationships
    goal: Mapped["Goal"] = relationship("Goal", back_populates="escalations")
    target_user: Mapped["User"] = relationship("User")
