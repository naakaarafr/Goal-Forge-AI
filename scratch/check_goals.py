import asyncio
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.goal import Goal
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        users_result = await db.execute(select(User))
        users = users_result.scalars().all()
        
        for u in users:
            print(f"User: {u.email} (ID: {u.id})")
            goals_result = await db.execute(select(Goal).where(Goal.owner_id == u.id))
            goals = goals_result.scalars().all()
            print(f"  Goals count: {len(goals)}")
            for g in goals:
                print(f"    - [{g.quarter}] {g.title}")

if __name__ == "__main__":
    asyncio.run(main())
