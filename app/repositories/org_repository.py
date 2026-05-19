import uuid
from typing import List, Optional, Any
from sqlalchemy import select, literal, union_all
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.repositories.base import BaseRepository
from app.schemas.user import UserCreate, UserUpdate


class OrgRepository(BaseRepository[User, UserCreate, UserUpdate]):
    def __init__(self, db: AsyncSession):
        super().__init__(User, db)

    async def get_subordinates_recursive(self, user_id: uuid.UUID) -> List[User]:
        """
        Recursive CTE to find all subordinates at all levels.
        """
        # Base case
        base_query = (
            select(User.id, User.manager_id, literal(1).label("level"))
            .where(User.manager_id == user_id)
            .cte(name="subs", recursive=True)
        )

        # Recursive case
        recursive_query = base_query.union_all(
            select(User.id, User.manager_id, (base_query.c.level + 1).label("level"))
            .join(base_query, User.manager_id == base_query.c.id)
        )

        # Final select
        query = select(User).join(recursive_query, User.id == recursive_query.c.id)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_managers_recursive(self, user_id: uuid.UUID) -> List[User]:
        """
        Recursive CTE to find the reporting line (all managers up to the root).
        """
        # First, get the immediate manager_id of the target user
        target_user_query = select(User.manager_id).where(User.id == user_id)
        target_user_res = await self.db.execute(target_user_query)
        start_manager_id = target_user_res.scalar_one_or_none()

        if not start_manager_id:
            return []

        # Base case: the immediate manager
        base_query = (
            select(User.id, User.manager_id, literal(1).label("level"))
            .where(User.id == start_manager_id)
            .cte(name="managers", recursive=True)
        )

        # Recursive case: the manager's manager
        recursive_query = base_query.union_all(
            select(User.id, User.manager_id, (base_query.c.level + 1).label("level"))
            .join(base_query, User.id == base_query.c.manager_id)
        )

        # Final select
        query = select(User).join(recursive_query, User.id == recursive_query.c.id).order_by(recursive_query.c.level)
        result = await self.db.execute(query)
        return list(result.scalars().all())
