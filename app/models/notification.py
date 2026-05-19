import uuid
from sqlalchemy import Text, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, GUID
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.user import User

class Notification(Base, TimestampMixin):
    """User notifications for goal updates and escalations."""
    __tablename__ = "notifications"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="notifications")
