import asyncio
from app.db.session import AsyncSessionLocal
from app.models.user import User
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        users = (await db.execute(select(User))).scalars().all()
        for u in users:
            print(f"{u.email} ({u.role.value if hasattr(u.role, 'value') else u.role})")

if __name__ == "__main__":
    asyncio.run(main())
