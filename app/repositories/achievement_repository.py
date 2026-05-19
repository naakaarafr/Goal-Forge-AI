import uuid
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.achievement import Achievement
from app.schemas.achievement import AchievementCreate, AchievementUpdate
from app.repositories.base import BaseRepository


class AchievementRepository(BaseRepository[Achievement, AchievementCreate, AchievementUpdate]):
    def __init__(self, db: AsyncSession):
        super().__init__(Achievement, db)

    async def get_by_owner_and_quarter(self, owner_id: uuid.UUID, quarter_id: uuid.UUID) -> List[Achievement]:
        query = select(self.model).where(
            self.model.owner_id == owner_id,
            self.model.quarter_id == quarter_id
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_by_goal(self, goal_id: uuid.UUID) -> Optional[Achievement]:
        query = select(self.model).where(self.model.goal_id == goal_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_team_achievements(self, manager_id: uuid.UUID, quarter_id: uuid.UUID) -> List[Achievement]:
        from app.models.user import User
        query = select(self.model).join(User, self.model.owner_id == User.id).where(
            User.manager_id == manager_id,
            self.model.quarter_id == quarter_id
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())
