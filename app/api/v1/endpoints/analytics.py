from fastapi import APIRouter, Depends, Query
from app.api import deps
from app.services.analytics_service import AnalyticsService
from app.models.user import UserRole
from app.db.session import get_db
from app.models.enums import UoMType
from app.core.calculations.engine import CalculationEngine
from pydantic import BaseModel

class ScoreCalculationRequest(BaseModel):
    uom: UoMType
    target_value: float
    current_value: float

class ScoreCalculationResponse(BaseModel):
    score: float
    uom: UoMType


router = APIRouter()

async def get_analytics_service(db = Depends(get_db)):
    return AnalyticsService(db)

@router.get("/summary")
async def get_summary(
    refresh: bool = Query(False),
    current_user = Depends(deps.RoleChecker([UserRole.admin, UserRole.manager])),
    service: AnalyticsService = Depends(get_analytics_service)
):
    """Get high-level dashboard analytics. Cached for 1 hour."""
    return await service.get_dashboard_summary(force_refresh=refresh)

@router.get("/trends/qoq")
async def get_trends(
    current_user = Depends(deps.RoleChecker([UserRole.admin, UserRole.manager, UserRole.employee])),
    service: AnalyticsService = Depends(get_analytics_service)
):
    """Get Quarter-over-Quarter progress trends."""
    return await service.get_qoq_trends()

@router.get("/manager")
async def get_manager_stats(
    quarter: str = Query(None, pattern=r"^\d{4}-Q[1-4]$"),
    current_user = Depends(deps.RoleChecker([UserRole.manager, UserRole.admin])),
    service: AnalyticsService = Depends(get_analytics_service)
):
    """Get manager-specific team analytics."""
    return await service.get_manager_summary(current_user.id, quarter=quarter)

@router.post("/calculate-score", response_model=ScoreCalculationResponse)
async def calculate_score(
    request: ScoreCalculationRequest,
    current_user = Depends(deps.get_current_user)
):
    """Ad-hoc endpoint to preview a normalized progress score."""
    score = CalculationEngine.calculate(request.uom, request.target_value, request.current_value)
    return ScoreCalculationResponse(score=score, uom=request.uom)
