import uuid
import enum
from typing import Optional
from sqlalchemy import String, Text, ForeignKey, DateTime, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, GUID
from app.models.enums import GoalStatus

class ApprovalHistory(Base, TimestampMixin):
    """Tracks every state transition in the goal lifecycle."""
    __tablename__ = "approval_history"

    goal_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("goals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    actor_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id"), nullable=False
    )
    
    from_status: Mapped[GoalStatus] = mapped_column(Enum(GoalStatus), nullable=False)
    to_status: Mapped[GoalStatus] = mapped_column(Enum(GoalStatus), nullable=False)
    
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Relationships
    goal: Mapped["Goal"] = relationship("Goal")
    actor: Mapped["User"] = relationship("User")

class GoalComment(Base, TimestampMixin):
    """Comments left by managers or employees during the approval workflow."""
    __tablename__ = "goal_comments"

    goal_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("goals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id"), nullable=False
    )
    
    content: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Relationships
    goal: Mapped["Goal"] = relationship("Goal")
    author: Mapped["User"] = relationship("User")
