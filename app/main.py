from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.api import api_router
from app.db.redis import redis_client
from app.core.logging import logger
from app.middleware.security import SecurityHeadersMiddleware
from app.core.rate_limit import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

def create_application() -> FastAPI:
    application = FastAPI(
        title=settings.PROJECT_NAME,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # 1. Rate Limiting
    application.state.limiter = limiter
    application.add_middleware(SlowAPIMiddleware)
    application.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # 2. Security Headers
    # application.add_middleware(SecurityHeadersMiddleware)

    # 2b. Audit Middleware
    from app.middleware.audit_middleware import AuditMiddleware
    application.add_middleware(AuditMiddleware)

    # 3. CORS (Outermost)
    if settings.BACKEND_CORS_ORIGINS:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=[str(origin).rstrip("/") for origin in settings.BACKEND_CORS_ORIGINS],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # Startup event
    @application.on_event("startup")
    async def startup_event():
        logger.info("Starting up...")
        logger.info(f"CORS ORIGINS: {[str(origin).rstrip('/') for origin in settings.BACKEND_CORS_ORIGINS]}")
        await redis_client.connect()
        
        from app.services.audit_service import register_audit_listeners
        register_audit_listeners()
        
        if settings.DEBUG:
            import uuid
            from app.db.session import get_db
            from app.repositories.user_repository import UserRepository
            from app.models.user import User, UserRole
            from app.core.security import get_password_hash
            async for db in get_db():
                user_repo = UserRepository(User, db)
                
                # 1. Dev Admin
                dev_user = await user_repo.get_by_email("dev@goalforge.ai")
                if not dev_user:
                    logger.info("Creating dev admin user...")
                    dev_user = User(
                        id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
                        email="dev@goalforge.ai",
                        full_name="Dev Admin",
                        hashed_password=get_password_hash("dev-password-local-only"),
                        role=UserRole.admin,
                        is_active=True,
                        is_superuser=True
                    )
                    db.add(dev_user)
                    await db.commit()
                    await db.refresh(dev_user)
                
                # 2. Demo Manager
                manager_user = await user_repo.get_by_email("manager@goalforge.ai")
                if not manager_user:
                    logger.info("Creating demo manager user...")
                    manager_user = User(
                        id=uuid.UUID("22222222-2222-2222-2222-222222222222"),
                        email="manager@goalforge.ai",
                        full_name="Demo Manager",
                        hashed_password=get_password_hash("dev-password-local-only"),
                        role=UserRole.manager,
                        is_active=True,
                        manager_id=dev_user.id
                    )
                    db.add(manager_user)
                    await db.commit()
                    await db.refresh(manager_user)
                
                # 3. Demo Employee
                employee_user = await user_repo.get_by_email("employee@goalforge.ai")
                if not employee_user:
                    logger.info("Creating demo employee user...")
                    employee_user = User(
                        id=uuid.UUID("33333333-3333-3333-3333-333333333333"),
                        email="employee@goalforge.ai",
                        full_name="Demo Employee",
                        hashed_password=get_password_hash("dev-password-local-only"),
                        role=UserRole.employee,
                        is_active=True,
                        manager_id=manager_user.id
                    )
                    db.add(employee_user)
                    await db.commit()
                
                break # Only need to do this once

    # Shutdown event
    @application.on_event("shutdown")
    async def shutdown_event():
        logger.info("Shutting down...")
        await redis_client.close()

    # Include routers
    application.include_router(api_router, prefix=settings.API_V1_STR)

    return application

app = create_application()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
