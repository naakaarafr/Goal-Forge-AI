import uuid
from sqlalchemy import String, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, GUID
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.goal import Goal

class AIInsight(Base, TimestampMixin):
    """AI-generated analysis and predictions for goals."""
    __tablename__ = "ai_insights"

    goal_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("goals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    insight_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    content: Mapped[dict] = mapped_column(JSON, nullable=False)

    # Relationships
    goal: Mapped["Goal"] = relationship("Goal", back_populates="ai_insights")
