import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from app.repositories.quarter_repository import QuarterRepository
from app.models.quarter import Quarter
from app.models.enums import QuarterState
from app.schemas.quarter import QuarterCreate, QuarterUpdate


class QuarterService:
    def __init__(self, quarter_repo: QuarterRepository):
        self.quarter_repo = quarter_repo

    async def create_quarter(self, quarter_in: QuarterCreate) -> Quarter:
        existing = await self.quarter_repo.get_by_label(quarter_in.label)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Quarter {quarter_in.label} already exists."
            )
        return await self.quarter_repo.create(obj_in=quarter_in)

    async def update_quarter_state(self, quarter_id: uuid.UUID, state: QuarterState) -> Quarter:
        quarter = await self.quarter_repo.get(quarter_id)
        if not quarter:
            raise HTTPException(status_code=404, detail="Quarter not found")
        
        if quarter.is_immutable:
            raise HTTPException(
                status_code=400, 
                detail="Closed quarters are immutable and cannot change state."
            )

        # Basic state transition logic
        if state == QuarterState.CLOSED:
            quarter.is_immutable = True
        
        quarter.state = state
        await self.quarter_repo.db.flush()
        await self.quarter_repo.db.refresh(quarter)
        return quarter

    async def get_all_quarters(self) -> List[Quarter]:
        return await self.quarter_repo.get_multi()

    async def get_active_quarter(self) -> Quarter:
        quarter = await self.quarter_repo.get_active_quarter()
        if not quarter:
            raise HTTPException(status_code=404, detail="No active quarter found.")
        return quarter

    async def close_expired_quarters(self):
        """
        Background task to close quarters that have passed their end_date.
        """
        from datetime import datetime, timezone
        from sqlalchemy import select
        
        now = datetime.now(timezone.utc)
        query = select(Quarter).where(
            Quarter.end_date < now,
            Quarter.state != QuarterState.CLOSED
        )
        result = await self.quarter_repo.db.execute(query)
        expired = result.scalars().all()
        
        for q in expired:
            q.state = QuarterState.CLOSED
            q.is_immutable = True
            
        await self.quarter_repo.db.flush()
        return len(expired)
