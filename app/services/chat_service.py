import json
from google import genai
from typing import List, Dict
from app.core.config import settings
from app.db.redis import redis_client
from app.services.context_service import ContextService
from app.models.user import User

# Configure Gemini
_client = genai.Client(api_key=settings.GEMINI_API_KEY)

class ChatService:
    def __init__(self, db):
        self.db = db
        self.context_builder = ContextService(db)
        self.client = _client
        self.model = 'gemini-2.0-flash'
        self.history_ttl = 3600 # 1 hour memory

    async def chat(self, user: User, message: str) -> str:
        """
        Main chat interface with role-awareness and memory.
        """
        # 1. Build context
        context = await self.context_builder.build_user_context(user)
        
        # 2. Get history from Redis
        history_key = f"chat_history:{user.id}"
        cached_history = None
        if redis_client.redis:
            cached_history = await redis_client.redis.get(history_key)
        history = json.loads(cached_history) if cached_history else []

        # 3. System Prompt
        system_prompt = f"""
        You are GoalForge AI Assistant. 
        Your goal is to help users manage their performance and objectives.
        User Role: {user.role}
        User Name: {user.full_name}
        
        {context}
        
        Be concise, professional, and data-driven.
        If a user asks about data they don't have access to, politely decline.
        """

        # 4. Invoke Gemini
        # We append system prompt to the first message or use it as a preamble
        full_prompt = f"{system_prompt}\n\nRecent History: {history[-5:]}\n\nUser: {message}\nAI:"
        
        response = self.client.models.generate_content(
            model=self.model,
            contents=full_prompt
        )
        ai_message = response.text.strip()

        # 5. Update history
        if redis_client.redis:
            history.append({"user": message, "ai": ai_message})
            await redis_client.redis.setex(history_key, self.history_ttl, json.dumps(history[-10:]))

        return ai_message
