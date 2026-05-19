import uuid
from sqlalchemy import ForeignKey, Enum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, GUID
from app.models.enums import AccessLevel
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.goal import Goal
    from app.models.user import User

class GoalShare(Base, TimestampMixin):
    """Bridge table for sharing goals between users."""
    __tablename__ = "goal_shares"

    goal_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("goals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    access_level: Mapped[AccessLevel] = mapped_column(
        Enum(AccessLevel), default=AccessLevel.VIEW, nullable=False
    )

    # Relationships
    goal: Mapped["Goal"] = relationship("Goal", back_populates="shares")
    user: Mapped["User"] = relationship("User", back_populates="shared_goals")

    # Constraints: One share per user per goal
    __table_args__ = (
        UniqueConstraint("goal_id", "user_id", name="uq_goal_user_share"),
    )
