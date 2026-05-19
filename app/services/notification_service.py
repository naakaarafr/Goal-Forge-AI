import uuid
from typing import Optional
from app.core.notifications import manager
from app.services.email_service import EmailService
from app.models.user import User
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

class NotificationService:
    def __init__(self, db: Optional[AsyncSession] = None):
        self.db = db
        self.email_service = EmailService()

    async def notify_user(self, user_id: uuid.UUID, title: str, content: str, send_email: bool = False):
        """Sends a notification via WebSocket and optionally Email."""
        
        # 1. Real-time WebSocket notification
        await manager.send_personal_message({
            "title": title,
            "content": content,
            "type": "notification"
        }, str(user_id))

        # 2. Email notification (if requested and user exists)
        if send_email and self.db:
            user_query = await self.db.execute(select(User).where(User.id == user_id))
            user = user_query.scalar_one_or_none()
            if user and user.email:
                await self.email_service.send_email(
                    to_email=user.email,
                    subject=title,
                    body_text=content
                )

    async def notify_manager_of_approval(self, employee_name: str, manager_id: uuid.UUID):
        await self.notify_user(
            user_id=manager_id,
            title="Goal Submission for Approval",
            content=f"{employee_name} has submitted their goals for the quarter. Please review.",
            send_email=True
        )
