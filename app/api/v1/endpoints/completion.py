from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from pydantic import BaseModel
from app.api import deps
from app.db.session import get_db
from app.schemas.completion import CompletionDashboardSummary
from app.services.completion_service import CompletionService

router = APIRouter()


# ---------------------------------------------------------------------------
# Heatmap visual-configuration schema
# ---------------------------------------------------------------------------

class HeatmapColorBand(BaseModel):
    """A progress band with its associated Tailwind class string and legend label."""
    min_progress: int  # inclusive lower bound
    max_progress: int  # inclusive upper bound
    tile_class: str    # space-separated Tailwind classes for the tile
    bg_class: str      # single bg-* class for the legend swatch
    label: str         # human-readable legend label


class HeatmapConfig(BaseModel):
    default_days_overdue: int
    days_overdue_min: int
    days_overdue_max: int
    page_title: str
    page_subtitle: str
    matrix_title: str
    matrix_subtitle: str
    department_section_title: str
    department_section_subtitle: str
    overdue_section_title: str
    overdue_section_subtitle: str
    manager_section_title: str
    manager_section_subtitle: str
    color_bands: List[HeatmapColorBand]


_HEATMAP_CONFIG = HeatmapConfig(
    default_days_overdue=7,
    days_overdue_min=1,
    days_overdue_max=30,
    page_title="Completion Heatmap & Analytics",
    page_subtitle="Real-time visibility into organization-wide execution progress, metrics, and overdue updates.",
    matrix_title="Organization Progress Matrix",
    matrix_subtitle="Each block represents an employee colored by average goal progress level.",
    department_section_title="Department Progress",
    department_section_subtitle="Compare average completion scores categorized by business divisions.",
    overdue_section_title="Inactive Check-ins",
    overdue_section_subtitle="Goals without check-ins within the selected threshold.",
    manager_section_title="Manager Team Performance Comparisons",
    manager_section_subtitle="Compare average team completion progress rates and review pipeline bottlenecks.",
    color_bands=[
        HeatmapColorBand(
            min_progress=0, max_progress=0,
            tile_class="bg-slate-100 text-slate-400 border-slate-200 hover:ring-slate-300",
            bg_class="bg-slate-100",
            label="0% (Not Started)",
        ),
        HeatmapColorBand(
            min_progress=1, max_progress=25,
            tile_class="bg-blue-50 text-blue-700 border-blue-100 hover:ring-blue-300",
            bg_class="bg-blue-50",
            label="1 – 25%",
        ),
        HeatmapColorBand(
            min_progress=26, max_progress=50,
            tile_class="bg-indigo-50 text-indigo-700 border-indigo-100 hover:ring-indigo-300",
            bg_class="bg-indigo-50",
            label="26 – 50%",
        ),
        HeatmapColorBand(
            min_progress=51, max_progress=75,
            tile_class="bg-purple-50 text-purple-700 border-purple-100 hover:ring-purple-300",
            bg_class="bg-purple-50",
            label="51 – 75%",
        ),
        HeatmapColorBand(
            min_progress=76, max_progress=99,
            tile_class="bg-emerald-50 text-emerald-700 border-emerald-100 hover:ring-emerald-300",
            bg_class="bg-emerald-50",
            label="76 – 99%",
        ),
        HeatmapColorBand(
            min_progress=100, max_progress=100,
            tile_class="bg-teal-500 text-white border-teal-600 shadow-teal-500/20 hover:ring-teal-400 font-bold",
            bg_class="bg-teal-500",
            label="100% (Completed)",
        ),
    ],
)


@router.get("/config", response_model=HeatmapConfig)
async def get_heatmap_config(
    _current_user=Depends(deps.RoleChecker(["admin", "manager"]))
):
    """
    Return visual configuration for the Completion Heatmap dashboard.
    All thresholds, colors, labels, and default filter values are served
    from here so the frontend requires zero hard-coded values.
    """
    return _HEATMAP_CONFIG

@router.get("/summary", response_model=CompletionDashboardSummary)
async def get_completion_summary(
    quarter: str = Query(..., description="Target quarter in YYYY-QN format (e.g., 2026-Q1)"),
    days_overdue: int = Query(7, ge=1, description="Days threshold to mark check-ins as overdue"),
    force_refresh: bool = Query(False, description="Bypass Redis cache and force DB refresh"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.RoleChecker(["admin", "manager"]))
):
    """
    Retrieve real-time completion analytics, KPIs, employee progress, manager pipeline,
    and overdue check-in lists. Restricted to Admins and Managers.
    """
    service = CompletionService(db)
    try:
        summary = await service.get_completion_summary(
            quarter=quarter,
            days_overdue=days_overdue,
            force_refresh=force_refresh
        )
        return summary
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate completion summary: {str(e)}"
        )
