import uuid
import functools
import json
from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import event, inspect
from sqlalchemy.sql import insert
from app.models.audit import AuditLog
from app.core.audit_context import get_actor_context

class AuditService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log_action(
        self,
        entity_name: str,
        entity_id: uuid.UUID,
        action: str,
        actor_id: Optional[uuid.UUID] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None
    ):
        """Creates an immutable audit log entry manually."""
        log = AuditLog(
            entity_name=entity_name,
            entity_id=entity_id,
            action=action,
            actor_id=actor_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address
        )
        self.db.add(log)
        await self.db.flush()
        await self.db.refresh(log)
        return log


def serialize_val(val):
    if val is None:
        return None
    if isinstance(val, uuid.UUID):
        return str(val)
    if isinstance(val, Enum):
        return val.value
    if isinstance(val, datetime):
        return val.isoformat()
    return val


_listeners_registered = False

def register_audit_listeners():
    global _listeners_registered
    if _listeners_registered:
        return
        
    from app.models.goal import Goal
    from app.models.achievement import Achievement
    
    def get_diff(target):
        state = inspect(target)
        old_values = {}
        new_values = {}
        for attr in state.mapper.column_attrs:
            history = state.get_history(attr.key, passive=True)
            if history.has_changes():
                old_val = history.deleted[0] if history.deleted else None
                new_val = history.added[0] if history.added else None
                old_values[attr.key] = serialize_val(old_val)
                new_values[attr.key] = serialize_val(new_val)
        return old_values, new_values

    # GOAL LISTENERS
    @event.listens_for(Goal, 'after_insert')
    def goal_after_insert(mapper, connection, target):
        context = get_actor_context()
        actor_id = context.get("actor_id") if context else None
        ip_address = context.get("ip_address") if context else None
        
        new_values = {}
        state = inspect(target)
        for attr in state.mapper.column_attrs:
            new_values[attr.key] = serialize_val(getattr(target, attr.key))
            
        connection.execute(
            AuditLog.__table__.insert().values(
                id=str(uuid.uuid4()),
                entity_name="Goal",
                entity_id=str(target.id),
                action="CREATE",
                old_values={},
                new_values=new_values,
                actor_id=str(actor_id) if actor_id else None,
                ip_address=ip_address,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
        )

    @event.listens_for(Goal, 'before_update')
    def goal_before_update(mapper, connection, target):
        context = get_actor_context()
        actor_id = context.get("actor_id") if context else None
        ip_address = context.get("ip_address") if context else None
        
        old_values, new_values = get_diff(target)
        if not old_values and not new_values:
            return
            
        # Check if modified after lock date
        state = inspect(target)
        is_locked_before = False
        is_locked_history = state.get_history('is_locked', passive=True)
        if is_locked_history.deleted:
            is_locked_before = bool(is_locked_history.deleted[0])
        else:
            is_locked_before = bool(target.is_locked)
            
        status_history = state.get_history('status', passive=True)
        status_before = status_history.deleted[0] if status_history.deleted else target.status
        if hasattr(status_before, 'value'):
            status_before = status_before.value
        elif isinstance(status_before, str):
            status_before = status_before
            
        was_locked = is_locked_before or status_before in ('submitted', 'approved', 'locked')
        if was_locked:
            new_values["after_lock"] = True
            
        connection.execute(
            AuditLog.__table__.insert().values(
                id=str(uuid.uuid4()),
                entity_name="Goal",
                entity_id=str(target.id),
                action="UPDATE",
                old_values=old_values,
                new_values=new_values,
                actor_id=str(actor_id) if actor_id else None,
                ip_address=ip_address,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
        )

    @event.listens_for(Goal, 'before_delete')
    def goal_before_delete(mapper, connection, target):
        context = get_actor_context()
        actor_id = context.get("actor_id") if context else None
        ip_address = context.get("ip_address") if context else None
        
        old_values = {}
        state = inspect(target)
        for attr in state.mapper.column_attrs:
            old_values[attr.key] = serialize_val(getattr(target, attr.key))
            
        connection.execute(
            AuditLog.__table__.insert().values(
                id=str(uuid.uuid4()),
                entity_name="Goal",
                entity_id=str(target.id),
                action="DELETE",
                old_values=old_values,
                new_values={},
                actor_id=str(actor_id) if actor_id else None,
                ip_address=ip_address,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
        )

    # ACHIEVEMENT LISTENERS
    @event.listens_for(Achievement, 'after_insert')
    def achievement_after_insert(mapper, connection, target):
        context = get_actor_context()
        actor_id = context.get("actor_id") if context else None
        ip_address = context.get("ip_address") if context else None
        
        new_values = {}
        state = inspect(target)
        for attr in state.mapper.column_attrs:
            new_values[attr.key] = serialize_val(getattr(target, attr.key))
            
        connection.execute(
            AuditLog.__table__.insert().values(
                id=str(uuid.uuid4()),
                entity_name="Achievement",
                entity_id=str(target.id),
                action="CREATE",
                old_values={},
                new_values=new_values,
                actor_id=str(actor_id) if actor_id else None,
                ip_address=ip_address,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
        )

    @event.listens_for(Achievement, 'before_update')
    def achievement_before_update(mapper, connection, target):
        context = get_actor_context()
        actor_id = context.get("actor_id") if context else None
        ip_address = context.get("ip_address") if context else None
        
        old_values, new_values = get_diff(target)
        if not old_values and not new_values:
            return
            
        connection.execute(
            AuditLog.__table__.insert().values(
                id=str(uuid.uuid4()),
                entity_name="Achievement",
                entity_id=str(target.id),
                action="UPDATE",
                old_values=old_values,
                new_values=new_values,
                actor_id=str(actor_id) if actor_id else None,
                ip_address=ip_address,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
        )

    @event.listens_for(Achievement, 'before_delete')
    def achievement_before_delete(mapper, connection, target):
        context = get_actor_context()
        actor_id = context.get("actor_id") if context else None
        ip_address = context.get("ip_address") if context else None
        
        old_values = {}
        state = inspect(target)
        for attr in state.mapper.column_attrs:
            old_values[attr.key] = serialize_val(getattr(target, attr.key))
            
        connection.execute(
            AuditLog.__table__.insert().values(
                id=str(uuid.uuid4()),
                entity_name="Achievement",
                entity_id=str(target.id),
                action="DELETE",
                old_values=old_values,
                new_values={},
                actor_id=str(actor_id) if actor_id else None,
                ip_address=ip_address,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
        )

    _listeners_registered = True
