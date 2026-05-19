import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from app.repositories.org_repository import OrgRepository
from app.models.user import User


class OrgService:
    def __init__(self, org_repo: OrgRepository):
        self.org_repo = org_repo

    async def get_org_tree(self, user_id: uuid.UUID):
        """
        Builds a nested reporting structure for a user.
        Note: For very large orgs, this should be done with a more efficient 
        tree representation or fetched level-by-level.
        """
        user = await self.org_repo.get(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        subs = await self.org_repo.get_subordinates_recursive(user_id)
        
        # Simple tree construction
        user_map = {str(u.id): {"user": u, "subordinates": []} for u in subs}
        user_map[str(user.id)] = {"user": user, "subordinates": []}
        
        root = user_map[str(user.id)]
        
        for u in subs:
            manager_id = str(u.manager_id)
            if manager_id in user_map:
                user_map[manager_id]["subordinates"].append(user_map[str(u.id)])
        
        return root

    async def reassign_manager(self, user_id: uuid.UUID, new_manager_id: Optional[uuid.UUID]):
        """
        Reassigns a user's manager with cycle detection.
        """
        if user_id == new_manager_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user cannot be their own manager."
            )

        if new_manager_id:
            # Cycle detection: Check if the new manager is currently a subordinate of the user
            subs = await self.org_repo.get_subordinates_recursive(user_id)
            sub_ids = [s.id for s in subs]
            if new_manager_id in sub_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Hierarchy cycle detected: New manager is a subordinate of the user."
                )

        # Update manager
        user = await self.org_repo.get(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        user.manager_id = new_manager_id
        await self.org_repo.db.flush()
        await self.org_repo.db.refresh(user)
        return user
