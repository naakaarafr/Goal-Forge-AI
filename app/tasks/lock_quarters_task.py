import asyncio
import sys
import os
from datetime import datetime, timezone
from sqlalchemy import select, update

# Add current directory to path to enable standalone imports
sys.path.append(os.getcwd())

from app.db.session import AsyncSessionLocal
from app.models.quarter import Quarter
from app.models.goal import Goal
from app.models.enums import QuarterState

async def run_lock_quarters():
    """
    Stand-alone automation script.
    Checks all active quarters. If a quarter has expired (its end_date is in the past),
    automatically sets its state to CLOSED, marks it immutable,
    and locks all goals belonging to that quarter.
    """
    print(f"[{datetime.now(timezone.utc).isoformat()}] Starting Quarter Window Locking task...")
    
    async with AsyncSessionLocal() as session:
        try:
            now = datetime.now(timezone.utc)
            
            # 1. Fetch expired quarters
            query = select(Quarter).where(
                Quarter.end_date < now,
                Quarter.state != QuarterState.CLOSED
            )
            result = await session.execute(query)
            expired_quarters = result.scalars().all()
            
            if not expired_quarters:
                print("No expired quarters found. Nothing to lock.")
                return
            
            for q in expired_quarters:
                print(f"Processing expired quarter: {q.label} (expired on {q.end_date})")
                
                # Update quarter state
                q.state = QuarterState.CLOSED
                q.is_immutable = True
                
                # Lock all goals in this quarter
                goal_update_query = (
                    update(Goal)
                    .where(Goal.quarter == q.label)
                    .values(is_locked=True)
                )
                goal_result = await session.execute(goal_update_query)
                print(f"Locked goals for quarter {q.label}. Affected goals count: {goal_result.rowcount}")
                
            await session.commit()
            print("Successfully processed and committed all locks.")
        except Exception as e:
            await session.rollback()
            print(f"Error during locking task: {e}")
            raise

if __name__ == "__main__":
    asyncio.run(run_lock_quarters())
