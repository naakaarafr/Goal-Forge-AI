import asyncio
import os
import sys
sys.path.append(os.getcwd())

from app.db.session import AsyncSessionLocal
from app.models.user import User
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        users = (await db.execute(select(User))).scalars().all()
        print("\n--- DATABASE USERS ---")
        for u in users:
            print(f"ID: {u.id} | Email: {u.email} | Role: {u.role} | Manager ID: {u.manager_id}")
        print("----------------------\n")

if __name__ == "__main__":
    asyncio.run(main())
