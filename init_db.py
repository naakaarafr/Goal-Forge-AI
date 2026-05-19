import asyncio
import sys
import os

# Add the current directory to sys.path to import app
sys.path.append(os.getcwd())

from app.db.base import Base
from app.db.session import engine
from app.models import *  # This ensures all models are registered with Base.metadata

async def init_db():
    print("Creating database tables...")
    async with engine.begin() as conn:
        # Import all models here or ensure they are imported before run_sync
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created successfully.")

if __name__ == "__main__":
    asyncio.run(init_db())
