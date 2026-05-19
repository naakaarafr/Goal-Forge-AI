from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response
from jose import jwt, JWTError
from app.core.config import settings
from app.core.audit_context import set_actor_context, current_actor_context
from app.schemas.token import TokenPayload
from app.core.logging import logger
import uuid

class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        actor_id = None
        
        # 1. Extract actor_id from JWT token in Authorization header
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]
            try:
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
                token_data = TokenPayload(**payload)
                if token_data.sub:
                    actor_id = uuid.UUID(str(token_data.sub))
            except (JWTError, ValueError) as e:
                # Log warning but do not crash the request; other dependencies can handle auth validation
                logger.debug(f"AuditMiddleware JWT decode failed: {e}")

        # 2. Extract Client IP
        # Safely parse X-Forwarded-For if behind a proxy like Nginx or Render, fallback to client host
        x_forwarded_for = request.headers.get("X-Forwarded-For")
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(",")[0].strip()
        else:
            ip_address = request.client.host if request.client else None

        # 3. Set actor contextvars and proceed
        token = set_actor_context(actor_id=actor_id, ip_address=ip_address)
        try:
            response = await call_next(request)
            return response
        finally:
            current_actor_context.reset(token)
