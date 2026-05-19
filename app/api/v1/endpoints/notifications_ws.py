import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from app.core.notifications import manager
from app.api import deps
from app.models.user import User

router = APIRouter()

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: uuid.UUID):
    """
    WebSocket endpoint for real-time notifications.
    In a real app, validate the user_id with a token.
    """
    await manager.connect(str(user_id), websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(str(user_id), websocket)
