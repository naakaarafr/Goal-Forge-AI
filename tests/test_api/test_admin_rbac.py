import pytest
from httpx import AsyncClient
from fastapi import status
from app.core.config import settings
from app.core.security import create_access_token
from tests.factories import create_user
from app.models.user import UserRole

pytestmark = pytest.mark.asyncio

async def test_employee_cannot_access_admin_hub(client: AsyncClient, db_session):
    emp = await create_user(db_session, role=UserRole.employee)
    token = create_access_token(subject=emp.id)
    res = await client.get(
        f"{settings.API_V1_STR}/admin/quarters",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == status.HTTP_403_FORBIDDEN

async def test_manager_cannot_access_admin_hub(client: AsyncClient, db_session):
    mgr = await create_user(db_session, role=UserRole.manager)
    token = create_access_token(subject=mgr.id)
    res = await client.get(
        f"{settings.API_V1_STR}/admin/quarters",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == status.HTTP_403_FORBIDDEN

async def test_admin_can_access_admin_hub(client: AsyncClient, db_session):
    admin = await create_user(db_session, role=UserRole.admin)
    token = create_access_token(subject=admin.id)
    res = await client.get(
        f"{settings.API_V1_STR}/admin/quarters",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == status.HTTP_200_OK

async def test_admin_hierarchy_reassign(client: AsyncClient, db_session):
    admin = await create_user(db_session, role=UserRole.admin)
    token = create_access_token(subject=admin.id)
    
    manager_user = await create_user(db_session, role=UserRole.manager)
    employee_user = await create_user(db_session, role=UserRole.employee)
    
    payload = {"manager_id": str(manager_user.id)}
    res = await client.patch(
        f"{settings.API_V1_STR}/admin/users/{str(employee_user.id)}/manager",
        headers={"Authorization": f"Bearer {token}"},
        json=payload
    )
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["manager_id"] == str(manager_user.id)
