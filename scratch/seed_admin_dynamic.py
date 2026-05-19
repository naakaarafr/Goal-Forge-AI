import asyncio
import os
import sys
import uuid

# Setup Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole
from app.models.goal import Goal
from app.models.enums import GoalStatus
from app.services.audit_service import AuditService

async def seed_dynamic_data():
    async with AsyncSessionLocal() as db:
        print("Fetching existing users...")
        # Get users to build hierarchy
        from sqlalchemy import select
        res = await db.execute(select(User))
        users = res.scalars().all()
        
        if not users:
            print("No users found. Please run tests or create users first.")
            return

        admin_user = next((u for u in users if u.role == UserRole.admin), users[0])
        manager_user = next((u for u in users if u.role == UserRole.manager), None)
        employee_user = next((u for u in users if u.role == UserRole.employee), None)
        
        # 1. Create Escalations
        print("Creating Escalated Goals...")
        if employee_user:
            escalated_goal = Goal(
                owner_id=employee_user.id,
                title="Q3 Strategy Refresh (Escalated)",
                description="This goal is stuck in submitted state",
                thrust_area="Revenue Growth",
                quarter="2024-Q3",
                weightage=20,
                target_value=100.0,
                current_value=100.0,
                progress=100.0,
                status=GoalStatus.submitted, # This makes it show in Escalations!
                is_locked=False
            )
            db.add(escalated_goal)
            
            escalated_goal_2 = Goal(
                owner_id=employee_user.id,
                title="Enterprise Architecture Deployment",
                description="Pending manager review for 3 weeks",
                thrust_area="Operational Excellence",
                quarter="2024-Q3",
                weightage=30,
                target_value=10.0,
                current_value=10.0,
                progress=100.0,
                status=GoalStatus.submitted,
                is_locked=False
            )
            db.add(escalated_goal_2)
            await db.flush()

            # 2. Create Audit Logs
            print("Generating System Audit Logs...")
            audit = AuditService(db)
            await audit.log_action(
                entity_name="Goal",
                entity_id=escalated_goal.id,
                action="SUBMIT_FOR_APPROVAL",
                actor_id=employee_user.id,
                old_values={"status": "draft"},
                new_values={"status": "submitted"}
            )
            
            await audit.log_action(
                entity_name="User",
                entity_id=employee_user.id,
                action="REASSIGN_MANAGER",
                actor_id=admin_user.id,
                old_values={"manager_id": None},
                new_values={"manager_id": str(manager_user.id) if manager_user else None}
            )

            await audit.log_action(
                entity_name="Quarter",
                entity_id=uuid.uuid4(),
                action="UPDATE_STATE",
                actor_id=admin_user.id,
                old_values={"state": "active"},
                new_values={"state": "review"}
            )

        await db.commit()
        print("Successfully seeded dynamic Admin Hub data (Escalations & Audit Logs)!")

if __name__ == "__main__":
    asyncio.run(seed_dynamic_data())
