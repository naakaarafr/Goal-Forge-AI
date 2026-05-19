import asyncio
import os
import sys

# Setup Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        # Check if user already exists
        res = await db.execute(select(User).where(User.email == "admin_test@goalforge.ai"))
        existing = res.scalars().first()
        if existing:
            print("Admin user already exists!")
            return
            
        hashed_password = get_password_hash("Admin123!")
        user = User(
            email="admin_test@goalforge.ai",
            full_name="Test Admin",
            hashed_password=hashed_password,
            role=UserRole.admin,
            is_active=True,
            is_superuser=True
        )
        db.add(user)
        await db.commit()
        print("Created test admin user: admin_test@goalforge.ai / Admin123!")

if __name__ == "__main__":
    asyncio.run(main())
