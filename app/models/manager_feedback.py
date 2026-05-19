import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, ForeignKey, DateTime, Enum, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, GUID
from app.models.enums import PerformanceRating

class ManagerFeedback(Base, TimestampMixin):
    """Stores structured performance feedback left by managers for employees."""
    __tablename__ = "manager_feedback"

    employee_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    manager_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id"), nullable=False
    )
    
    quarter: Mapped[str] = mapped_column(String, nullable=False, index=True)
    
    performance_rating: Mapped[PerformanceRating] = mapped_column(
        Enum(PerformanceRating), nullable=False
    )
    
    strengths: Mapped[str] = mapped_column(Text, nullable=False)
    development_areas: Mapped[str] = mapped_column(Text, nullable=False)
    discussion_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    is_finalized: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    finalized_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    employee: Mapped["User"] = relationship(
        "User", 
        foreign_keys=[employee_id], 
        back_populates="received_feedback"
    )
    manager: Mapped["User"] = relationship(
        "User", 
        foreign_keys=[manager_id], 
        back_populates="given_feedback"
    )
