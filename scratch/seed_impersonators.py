import asyncio
import os
import sys
import uuid
sys.path.append(os.getcwd())

from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from sqlalchemy import select

async def seed_impersonators():
    async with AsyncSessionLocal() as db:
        print("\n--- SEEDING DEMO IMPERSONATION USERS ---")
        
        # 1. Dev Admin
        admin_email = "dev@goalforge.ai"
        res = await db.execute(select(User).where(User.email == admin_email))
        existing_admin = res.scalar_one_or_none()
        
        if not existing_admin:
            admin = User(
                id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
                email=admin_email,
                full_name="Dev Admin",
                hashed_password=get_password_hash("dev-password-local-only"),
                role=UserRole.admin,
                is_active=True,
                is_superuser=True
            )
            db.add(admin)
            await db.commit()
            print("Seeded dev@goalforge.ai (Admin)")
        else:
            print("dev@goalforge.ai already exists")

        # 2. Demo Manager
        manager_email = "manager@goalforge.ai"
        res = await db.execute(select(User).where(User.email == manager_email))
        existing_mgr = res.scalar_one_or_none()
        
        if not existing_mgr:
            manager = User(
                id=uuid.UUID("22222222-2222-2222-2222-222222222222"),
                email=manager_email,
                full_name="Demo Manager",
                hashed_password=get_password_hash("dev-password-local-only"),
                role=UserRole.manager,
                is_active=True,
                manager_id=uuid.UUID("11111111-1111-1111-1111-111111111111")
            )
            db.add(manager)
            await db.commit()
            print("Seeded manager@goalforge.ai (Manager)")
        else:
            print("manager@goalforge.ai already exists")

        # 3. Demo Employee
        employee_email = "employee@goalforge.ai"
        res = await db.execute(select(User).where(User.email == employee_email))
        existing_emp = res.scalar_one_or_none()
        
        if not existing_emp:
            employee = User(
                id=uuid.UUID("33333333-3333-3333-3333-333333333333"),
                email=employee_email,
                full_name="Demo Employee",
                hashed_password=get_password_hash("dev-password-local-only"),
                role=UserRole.employee,
                is_active=True,
                manager_id=uuid.UUID("22222222-2222-2222-2222-222222222222")
            )
            db.add(employee)
            await db.commit()
            print("Seeded employee@goalforge.ai (Employee)")
        else:
            print("employee@goalforge.ai already exists")

        print("----------------------------------------\n")

if __name__ == "__main__":
    asyncio.run(seed_impersonators())
