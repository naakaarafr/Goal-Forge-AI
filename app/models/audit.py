import uuid
from typing import Optional, Any
from sqlalchemy import String, Text, ForeignKey, UUID, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, GUID

class AuditLog(Base, TimestampMixin):
    """
    Immutable audit trail for tracking sensitive changes.
    Old and new values are stored as JSON for detailed diffing.
    """
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    
    entity_name: Mapped[str] = mapped_column(String(50), nullable=False, index=True) # e.g. "Goal"
    entity_id: Mapped[uuid.UUID] = mapped_column(GUID(), nullable=False, index=True)
    
    action: Mapped[str] = mapped_column(String(20), nullable=False) # "CREATE", "UPDATE", "DELETE"
    
    old_values: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    new_values: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(GUID(), ForeignKey("users.id"), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True) # IPv6 support
    
    # Relationships
    actor: Mapped[Optional["User"]] = relationship("User")


from sqlalchemy import event

@event.listens_for(AuditLog, "before_update")
def prevent_audit_log_update(mapper, connection, target):
    raise PermissionError("AuditLog entries are strictly immutable and cannot be updated.")

@event.listens_for(AuditLog, "before_delete")
def prevent_audit_log_delete(mapper, connection, target):
    raise PermissionError("AuditLog entries are strictly immutable and cannot be deleted.")
