import uuid
from datetime import datetime
from typing import Optional, Any, Dict
from pydantic import BaseModel, ConfigDict

class AuditLogRead(BaseModel):
    id: uuid.UUID
    entity_name: str
    entity_id: uuid.UUID
    action: str
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    actor_id: Optional[uuid.UUID] = None
    ip_address: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditLogQueryParams(BaseModel):
    entity_name: Optional[str] = None
    entity_id: Optional[uuid.UUID] = None
    actor_id: Optional[uuid.UUID] = None
    action: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    search: Optional[str] = None
    page: Optional[int] = 1
    size: Optional[int] = 50
