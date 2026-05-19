import redis.asyncio as redis
from app.core.config import settings
from app.core.logging import logger

class RedisClient:
    def __init__(self):
        self.redis = None
        self._connection_failed = False

    async def connect(self):
        if self._connection_failed:
            return # Don't hang the backend trying to connect on every request if it failed once
        
        if not self.redis:
            try:
                self.redis = await redis.from_url(
                    settings.REDIS_URL,
                    encoding="utf-8",
                    decode_responses=True,
                    socket_timeout=1.0,
                    socket_connect_timeout=1.0
                )
                import asyncio
                await asyncio.wait_for(self.redis.ping(), timeout=1.0)
                logger.info("Connected to Redis")
            except Exception as e:
                logger.error(f"Failed to connect to Redis: {e}. Continuing without Redis.")
                self.redis = None
                self._connection_failed = True

    async def close(self):
        if self.redis:
            await self.redis.close()
            logger.info("Redis connection closed")

    async def blacklist_token(self, jti: str, expire_seconds: int):
        """Blacklist a token by its JTI (unique identifier) or the token string itself."""
        if self.redis:
            await self.redis.setex(f"blacklist:{jti}", expire_seconds, "true")

    async def is_token_blacklisted(self, jti: str) -> bool:
        """Check if a token is blacklisted."""
        if self.redis:
            return await self.redis.exists(f"blacklist:{jti}") > 0
        return False

redis_client = RedisClient()

async def get_redis():
    """Dependency for getting redis client."""
    if not redis_client.redis:
        await redis_client.connect()
    return redis_client.redis
