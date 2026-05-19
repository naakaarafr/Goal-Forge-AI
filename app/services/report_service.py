import io
import csv
import uuid
from typing import AsyncGenerator, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from openpyxl import Workbook

from app.models.goal import Goal
from app.models.user import User

class ReportService:
    @staticmethod
    def _build_query(
        quarter: Optional[str] = None,
        department_id: Optional[uuid.UUID] = None,
        manager_id: Optional[uuid.UUID] = None,
        employee_id: Optional[uuid.UUID] = None,
    ):
        q = (
            select(Goal, User)
            .join(User, Goal.owner_id == User.id)
            .order_by(User.email, Goal.title)
        )
        
        if quarter:
            q = q.where(Goal.quarter == quarter)
        if employee_id:
            q = q.where(User.id == employee_id)
        if manager_id:
            q = q.where(User.manager_id == manager_id)
        if department_id:
            q = q.where(User.department_id == department_id)
            
        return q

    @staticmethod
    async def generate_csv_report(
        db: AsyncSession,
        quarter: Optional[str] = None,
        department_id: Optional[uuid.UUID] = None,
        manager_id: Optional[uuid.UUID] = None,
        employee_id: Optional[uuid.UUID] = None,
    ) -> AsyncGenerator[str, None]:
        """Generator yielding CSV rows for streaming response."""
        
        # Yield the header
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Employee Email", "Employee Name", "Goal Title", "Quarter",
            "Weightage (%)", "Target Value", "Current Value", 
            "Progress (%)", "Status"
        ])
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

        # Build and execute chunked query
        q = ReportService._build_query(quarter, department_id, manager_id, employee_id)
        
        # Async execution with yield_per for memory efficiency
        stream = await db.stream(q.execution_options(yield_per=100))
        async for row in stream:
            goal, user = row
            writer.writerow([
                user.email,
                user.full_name or "N/A",
                goal.title,
                goal.quarter,
                goal.weightage,
                goal.target_value,
                goal.current_value,
                goal.progress,
                goal.status.value if hasattr(goal.status, "value") else str(goal.status)
            ])
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

    @staticmethod
    async def generate_excel_report(
        db: AsyncSession,
        quarter: Optional[str] = None,
        department_id: Optional[uuid.UUID] = None,
        manager_id: Optional[uuid.UUID] = None,
        employee_id: Optional[uuid.UUID] = None,
    ) -> bytes:
        """Generates an entire Excel workbook in memory."""
        wb = Workbook()
        ws = wb.active
        ws.title = "Achievement Report"

        # Headers
        ws.append([
            "Employee Email", "Employee Name", "Goal Title", "Quarter",
            "Weightage (%)", "Target Value", "Current Value", 
            "Progress (%)", "Status"
        ])
        
        # Apply bold to headers
        for cell in ws[1]:
            cell.font = cell.font.copy(bold=True)

        q = ReportService._build_query(quarter, department_id, manager_id, employee_id)
        
        # Stream rows
        stream = await db.stream(q.execution_options(yield_per=500))
        async for row in stream:
            goal, user = row
            ws.append([
                user.email,
                user.full_name or "N/A",
                goal.title,
                goal.quarter,
                goal.weightage,
                goal.target_value,
                goal.current_value,
                goal.progress,
                goal.status.value if hasattr(goal.status, "value") else str(goal.status)
            ])

        # Save to bytes
        virtual_workbook = io.BytesIO()
        wb.save(virtual_workbook)
        return virtual_workbook.getvalue()
