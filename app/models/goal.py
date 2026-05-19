import uuid
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Text, ForeignKey, UUID, DateTime, SMALLINT, Enum, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, SoftDeleteMixin, GUID
from app.models.enums import GoalStatus, GoalPriority, UoMType, TrackingStatus

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.goal_share import GoalShare
    from app.models.escalation import Escalation
    from app.models.ai_insight import AIInsight


class Goal(Base, TimestampMixin, SoftDeleteMixin):
    """
    Goal entity with lifecycle management and weightage constraints.
    """
    __tablename__ = "goals"

    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    thrust_area: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    
    uom: Mapped[UoMType] = mapped_column(
        Enum(UoMType), default=UoMType.numeric_min, nullable=False
    )
    
    status: Mapped[GoalStatus] = mapped_column(
        Enum(GoalStatus), default=GoalStatus.draft, nullable=False, index=True
    )
    tracking_status: Mapped[TrackingStatus] = mapped_column(
        Enum(TrackingStatus), default=TrackingStatus.not_started, nullable=False, index=True
    )
    priority: Mapped[GoalPriority] = mapped_column(
        Enum(GoalPriority), default=GoalPriority.medium, nullable=False, index=True
    )
    
    weightage: Mapped[int] = mapped_column(SMALLINT, default=10, nullable=False) # Min 10
    progress: Mapped[int] = mapped_column(SMALLINT, default=0)
    
    target_value: Mapped[float] = mapped_column(default=0.0, nullable=False)
    current_value: Mapped[float] = mapped_column(default=0.0, nullable=False)
    
    quarter: Mapped[Optional[str]] = mapped_column(String(7), nullable=True, index=True)
    target_date: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False)
    
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(), ForeignKey("goals.id"), nullable=True, index=True
    )
    
    owner_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    
    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="goals", lazy="joined")
    parent: Mapped[Optional["Goal"]] = relationship(
        "Goal", remote_side="Goal.id", back_populates="children"
    )
    children: Mapped[List["Goal"]] = relationship(
        "Goal", back_populates="parent", cascade="all, delete-orphan", lazy="selectin"
    )
    shares: Mapped[List["GoalShare"]] = relationship(
        "GoalShare", back_populates="goal", cascade="all, delete-orphan", lazy="selectin"
    )
    escalations: Mapped[List["Escalation"]] = relationship(
        "Escalation", back_populates="goal", cascade="all, delete-orphan", lazy="selectin"
    )
    ai_insights: Mapped[List["AIInsight"]] = relationship(
        "AIInsight", back_populates="goal", cascade="all, delete-orphan", lazy="selectin"
    )
