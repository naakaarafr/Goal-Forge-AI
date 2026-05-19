import asyncio
import uuid
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.enums import UserRole
from app.models.department import Department
from app.core.security import get_password_hash

async def seed_data():
    async with AsyncSessionLocal() as session:
        # 1. Create Departments
        depts = ["Engineering", "Sales", "HR", "Marketing"]
        dept_map = {}
        for dept_name in depts:
            query = select(Department).where(Department.name == dept_name)
            res = await session.execute(query)
            dept = res.scalar_one_or_none()
            if not dept:
                dept = Department(name=dept_name)
                session.add(dept)
                await session.flush() # generate ID
            dept_map[dept_name] = dept
        
        await session.commit()
        
        # 2. Create Admin
        admin_email = "dev@goalforge.ai"
        query = select(User).where(User.email == admin_email)
        res = await session.execute(query)
        admin = res.scalar_one_or_none()
        if not admin:
            admin = User(
                email=admin_email,
                hashed_password=get_password_hash("dev-password-local-only"),
                full_name="Super Admin",
                role=UserRole.admin,
                is_active=True,
                is_superuser=True
            )
            session.add(admin)
            print(f"Admin user created: {admin_email}")
        
        # 3. Create Manager
        manager_email = "manager@goalforge.ai"
        query = select(User).where(User.email == manager_email)
        res = await session.execute(query)
        manager = res.scalar_one_or_none()
        if not manager:
            manager = User(
                email=manager_email,
                hashed_password=get_password_hash("dev-password-local-only"),
                full_name="John Manager",
                role=UserRole.manager,
                is_active=True,
                department_id=dept_map["Engineering"].id
            )
            session.add(manager)
            await session.flush()
            print(f"Manager user created: {manager_email}")
            
        # 4. Create Employee
        employee_email = "employee@goalforge.ai"
        query = select(User).where(User.email == employee_email)
        res = await session.execute(query)
        employee = res.scalar_one_or_none()
        if not employee:
            manager_id = manager.id if manager else None
            employee = User(
                email=employee_email,
                hashed_password=get_password_hash("dev-password-local-only"),
                full_name="Sarah Employee",
                role=UserRole.employee,
                is_active=True,
                manager_id=manager_id,
                department_id=dept_map["Engineering"].id
            )
            session.add(employee)
            print(f"Employee user created: {employee_email}")
            
        await session.commit()
        
        # 5. Create Default Quarter Window Configurations
        from app.models.quarter_window_config import QuarterWindowConfig, QuarterWindowPhase
        
        configs = [
            {"phase": QuarterWindowPhase.PLANNING, "start_month": 5, "start_day": 1, "end_month": 6, "end_day": 30},
            {"phase": QuarterWindowPhase.Q1, "start_month": 7, "start_day": 1, "end_month": 9, "end_day": 30},
            {"phase": QuarterWindowPhase.Q2, "start_month": 10, "start_day": 1, "end_month": 12, "end_day": 31},
            {"phase": QuarterWindowPhase.Q3, "start_month": 1, "start_day": 1, "end_month": 3, "end_day": 31},
            {"phase": QuarterWindowPhase.Q4, "start_month": 4, "start_day": 1, "end_month": 6, "end_day": 30},
        ]
        
        for cfg in configs:
            query = select(QuarterWindowConfig).where(QuarterWindowConfig.phase == cfg["phase"])
            res = await session.execute(query)
            if not res.scalar_one_or_none():
                session.add(QuarterWindowConfig(**cfg))
        
        await session.commit()
        print("Seeding completed successfully.")

if __name__ == "__main__":
    asyncio.run(seed_data())
