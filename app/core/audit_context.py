import contextvars
from typing import Optional, Dict, Any

current_actor_context: contextvars.ContextVar[Optional[Dict[str, Any]]] = contextvars.ContextVar(
    "current_actor_context", default=None
)

def set_actor_context(actor_id: Optional[Any], ip_address: Optional[str] = None):
    """Sets the actor context variable."""
    actor_data = {
        "actor_id": actor_id,
        "ip_address": ip_address
    }
    return current_actor_context.set(actor_data)

def get_actor_context() -> Optional[Dict[str, Any]]:
    """Gets the current actor context."""
    return current_actor_context.get()

def clear_actor_context(token: contextvars.Token):
    """Resets the context variable to its previous value using the token."""
    current_actor_context.reset(token)
