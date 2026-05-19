import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, TimestampMixin, GUID

class QuarterOverride(Base, TimestampMixin):
    """
    Admin override exceptions for deadline extensions.
    """
    __tablename__ = "quarter_overrides"

    quarter_label: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    extended_until: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
