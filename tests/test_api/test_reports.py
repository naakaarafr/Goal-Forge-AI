import pytest
from httpx import AsyncClient
from fastapi import status
from app.core.config import settings
from app.core.security import create_access_token
from tests.factories import create_user, create_goal
from app.models.user import UserRole

pytestmark = pytest.mark.asyncio

async def test_export_csv_success(client: AsyncClient, db_session):
    admin = await create_user(db_session, role=UserRole.admin)
    token = create_access_token(subject=admin.id)
    
    # Create test goal
    await create_goal(db_session, owner_id=admin.id, title="Test Report Goal")
    
    res = await client.get(
        f"{settings.API_V1_STR}/reports/achievements/csv",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == status.HTTP_200_OK
    assert "text/csv" in res.headers["Content-Type"]
    assert "Test Report Goal" in res.text

async def test_export_excel_success(client: AsyncClient, db_session):
    admin = await create_user(db_session, role=UserRole.admin)
    token = create_access_token(subject=admin.id)
    
    # Create test goal
    await create_goal(db_session, owner_id=admin.id, title="Test Excel Goal")
    
    res = await client.get(
        f"{settings.API_V1_STR}/reports/achievements/excel",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == status.HTTP_200_OK
    assert res.headers["Content-Type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    # Should be bytes content, difficult to parse without loading openpyxl in test, but size > 0 indicates success
    assert len(res.content) > 0

async def test_employee_cannot_export(client: AsyncClient, db_session):
    emp = await create_user(db_session, role=UserRole.employee)
    token = create_access_token(subject=emp.id)
    
    res = await client.get(
        f"{settings.API_V1_STR}/reports/achievements/csv",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == status.HTTP_403_FORBIDDEN
