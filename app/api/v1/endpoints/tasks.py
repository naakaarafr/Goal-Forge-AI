from fastapi import APIRouter, Depends, Header, HTTPException, status
from app.api import deps
from app.services.escalation_service import EscalationService
from app.core.config import settings
from app.db.session import get_db

router = APIRouter()

async def verify_task_secret(x_task_secret: str = Header(...)):
    # In a real app, store this in env
    if x_task_secret != "super-secret-task-key":
        raise HTTPException(status_code=403, detail="Invalid task secret")

@router.post("/run-escalations", dependencies=[Depends(verify_task_secret)])
async def trigger_escalations(
    db = Depends(get_db)
):
    """
    Endpoint for external cron services to trigger periodic checks.
    Free-tier friendly: Keeps the app alive and runs background logic.
    """
    service = EscalationService(db)
    await service.run_escalation_checks()
    return {"status": "Escalation check completed"}
@router.post("/run-quarterly-maintenance", dependencies=[Depends(verify_task_secret)])
async def trigger_quarterly_maintenance(
    db = Depends(get_db)
):
    """
    Automated task to close expired quarters.
    """
    from app.services.quarter_service import QuarterService
    from app.repositories.quarter_repository import QuarterRepository
    
    service = QuarterService(QuarterRepository(db))
    closed_count = await service.close_expired_quarters()
    return {"status": "Quarterly maintenance completed", "quarters_closed": closed_count}
