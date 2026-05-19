import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.db.session import get_db
from app.models.user import UserRole, User
from app.services.report_service import ReportService

router = APIRouter()

@router.get("/achievements/csv")
async def export_achievements_csv(
    quarter: Optional[str] = Query(None),
    department_id: Optional[uuid.UUID] = Query(None),
    manager_id: Optional[uuid.UUID] = Query(None),
    employee_id: Optional[uuid.UUID] = Query(None),
    current_user: User = Depends(deps.RoleChecker([UserRole.admin, UserRole.manager])),
    db: AsyncSession = Depends(get_db)
):
    """
    Export an achievement report as a streaming CSV file.
    Manager role is restricted to exporting their own team, or organization if Admin.
    """
    # Enforce security boundaries
    safe_manager_id = manager_id
    if current_user.role == UserRole.manager and not current_user.is_superuser:
        safe_manager_id = current_user.id

    generator = ReportService.generate_csv_report(
        db=db,
        quarter=quarter,
        department_id=department_id,
        manager_id=safe_manager_id,
        employee_id=employee_id
    )
    
    # Configure headers for file download
    headers = {
        "Content-Disposition": "attachment; filename=achievements_export.csv",
        "Content-Type": "text/csv"
    }
    return StreamingResponse(generator, headers=headers)


@router.get("/achievements/excel")
async def export_achievements_excel(
    quarter: Optional[str] = Query(None),
    department_id: Optional[uuid.UUID] = Query(None),
    manager_id: Optional[uuid.UUID] = Query(None),
    employee_id: Optional[uuid.UUID] = Query(None),
    current_user: User = Depends(deps.RoleChecker([UserRole.admin, UserRole.manager])),
    db: AsyncSession = Depends(get_db)
):
    """
    Export an achievement report as an Excel (.xlsx) file.
    """
    # Enforce security boundaries
    safe_manager_id = manager_id
    if current_user.role == UserRole.manager and not current_user.is_superuser:
        safe_manager_id = current_user.id

    excel_bytes = await ReportService.generate_excel_report(
        db=db,
        quarter=quarter,
        department_id=department_id,
        manager_id=safe_manager_id,
        employee_id=employee_id
    )
    
    headers = {
        "Content-Disposition": "attachment; filename=achievements_export.xlsx",
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }
    return Response(content=excel_bytes, headers=headers)
