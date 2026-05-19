import uuid
from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.goal import Goal
from app.schemas.goal import GoalCreate, GoalUpdate
from app.repositories.base import BaseRepository


class GoalRepository(BaseRepository[Goal, GoalCreate, GoalUpdate]):
    def __init__(self, db: AsyncSession):
        super().__init__(Goal, db)

    async def get_by_owner_and_quarter(self, owner_id: uuid.UUID, quarter: str) -> List[Goal]:
        query = select(self.model).where(
            self.model.owner_id == owner_id,
            self.model.quarter == quarter,
            self.model.deleted_at == None
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_total_weightage(self, owner_id: uuid.UUID, quarter: str) -> int:
        query = select(func.sum(self.model.weightage)).where(
            self.model.owner_id == owner_id,
            self.model.quarter == quarter,
            self.model.deleted_at == None
        )
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def get_by_owners_and_quarter(self, owner_ids: List[uuid.UUID], quarter: str) -> List[Goal]:
        query = select(self.model).where(
            self.model.owner_id.in_(owner_ids),
            self.model.quarter == quarter,
            self.model.deleted_at == None
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_all_by_quarter(self, quarter: str) -> List[Goal]:
        query = select(self.model).where(
            self.model.quarter == quarter,
            self.model.deleted_at == None
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())
