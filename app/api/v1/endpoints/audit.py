import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from app.api import deps
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogRead
from app.db.session import get_db

router = APIRouter()

@router.get("/", response_model=List[AuditLogRead])
async def get_audit_logs(
    entity_name: Optional[str] = Query(None),
    entity_id: Optional[uuid.UUID] = Query(None),
    actor_id: Optional[uuid.UUID] = Query(None),
    action: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db = Depends(get_db),
    current_user = Depends(deps.RoleChecker(["admin"]))
):
    """
    Searchable audit logs with advanced filters, pagination, and JSON deep search. Restricted to Admins.
    """
    query = select(AuditLog).order_by(AuditLog.created_at.desc())
    
    if entity_name:
        query = query.where(AuditLog.entity_name == entity_name)
    if entity_id:
        query = query.where(AuditLog.entity_id == entity_id)
    if actor_id:
        query = query.where(AuditLog.actor_id == actor_id)
    if action:
        query = query.where(AuditLog.action == action)
    if start_date:
        query = query.where(AuditLog.created_at >= start_date)
    if end_date:
        query = query.where(AuditLog.created_at <= end_date)
        
    if search:
        search_pattern = f"%{search}%"
        from sqlalchemy import cast, String, or_
        query = query.where(
            or_(
                AuditLog.action.ilike(search_pattern),
                AuditLog.entity_name.ilike(search_pattern),
                cast(AuditLog.old_values, String).ilike(search_pattern),
                cast(AuditLog.new_values, String).ilike(search_pattern),
                cast(AuditLog.ip_address, String).ilike(search_pattern)
            )
        )
        
    offset = (page - 1) * size
    query = query.offset(offset).limit(size)
    result = await db.execute(query)
    return list(result.scalars().all())
