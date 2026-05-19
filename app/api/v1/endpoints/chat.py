from fastapi import APIRouter, Depends, Body
from app.api import deps
from app.services.chat_service import ChatService
from app.models.user import User
from app.db.session import get_db

router = APIRouter()

@router.post("/")
async def chat_with_ai(
    message: str = Body(..., embed=True),
    current_user: User = Depends(deps.get_current_user),
    db = Depends(get_db)
):
    """Interactive AI chatbot for goal and team insights."""
    service = ChatService(db)
    response = await service.chat(current_user, message)
    return {"response": response}
