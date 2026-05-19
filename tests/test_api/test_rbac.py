import pytest
from fastapi import status
from tests.factories import create_user
from app.models.enums import UserRole
from app.core.config import settings
from app.core.security import create_access_token

@pytest.mark.asyncio
async def test_admin_route_access_as_admin(client, db_session):
    admin = await create_user(db_session, role=UserRole.admin)
    token = create_access_token(subject=admin.id)
    
    # Try an admin endpoint
    response = await client.get(
        f"{settings.API_V1_STR}/audit/",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_200_OK

@pytest.mark.asyncio
async def test_admin_route_access_as_employee_fails(client, db_session):
    emp = await create_user(db_session, role=UserRole.employee)
    token = create_access_token(subject=emp.id)
    
    # Try an admin endpoint
    response = await client.get(
        f"{settings.API_V1_STR}/audit/",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.asyncio
async def test_manager_route_access_as_employee_fails(client, db_session):
    emp = await create_user(db_session, role=UserRole.employee)
    token = create_access_token(subject=emp.id)
    
    # Try an analytics endpoint restricted to Manager/Admin
    response = await client.get(
        f"{settings.API_V1_STR}/analytics/summary",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.asyncio
async def test_public_health_check_works(client):
    response = await client.get(f"{settings.API_V1_STR}/health")
    assert response.status_code == status.HTTP_200_OK
