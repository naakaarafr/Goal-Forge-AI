
import asyncio
from app.db.session import SessionLocal
from app.models.goal import Goal
from app.models.enums import GoalStatus
from sqlalchemy import select

async def run():
    async with SessionLocal() as db:
        res = await db.execute(select(Goal.id).where(Goal.status == GoalStatus.SUBMITTED).limit(1))
        goal_id = res.scalar()
        if goal_id:
            print(f"FOUND_GOAL_ID:{goal_id}")
        else:
            print("NO_PENDING_GOALS")

if __name__ == "__main__":
    asyncio.run(run())
