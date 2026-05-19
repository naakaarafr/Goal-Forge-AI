import asyncio
import os
import sys

# Setup Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole
from app.models.goal import Goal
from app.models.enums import GoalStatus
from app.services.audit_service import AuditService
from sqlalchemy import select

async def test_unlock():
    async with AsyncSessionLocal() as db:
        # Fetch an admin user and a goal
        user_res = await db.execute(select(User).where(User.role == UserRole.admin))
        admin = user_res.scalars().first()
        
        goal_res = await db.execute(select(Goal).limit(1))
        goal = goal_res.scalars().first()
        
        if not admin or not goal:
            print("Admin or Goal not found in database.")
            return
            
        print(f"Testing unlock for goal: {goal.title} (Status: {goal.status})")
        
        # Test the unlock logic directly
        old_status = goal.status
        goal.status = GoalStatus.draft
        goal.is_locked = False
        
        try:
            audit = AuditService(db)
            await audit.log_action(
                entity_name="Goal",
                entity_id=goal.id,
                action="FORCE_UNLOCK",
                actor_id=admin.id,
                old_values={"status": old_status.value if hasattr(old_status, 'value') else old_status},
                new_values={"status": goal.status.value if hasattr(goal.status, 'value') else goal.status, "reason": "Testing unlock"}
            )
            await db.commit()
            print("Unlock database operation successful!")
        except Exception as e:
            print(f"Error during unlock: {e}")
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(test_unlock())
