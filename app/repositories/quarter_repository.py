import uuid
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.quarter import Quarter
from app.models.enums import QuarterState
from app.schemas.quarter import QuarterCreate, QuarterUpdate
from app.repositories.base import BaseRepository


class QuarterRepository(BaseRepository[Quarter, QuarterCreate, QuarterUpdate]):
    def __init__(self, db: AsyncSession):
        super().__init__(Quarter, db)

    async def get_by_label(self, label: str) -> Optional[Quarter]:
        query = select(self.model).where(self.model.label == label)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_active_quarter(self) -> Optional[Quarter]:
        query = select(self.model).where(self.model.state == QuarterState.ACTIVE)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
