import json
import logging
from typing import List, Dict, Any
from redis.asyncio import Redis

logger = logging.getLogger("app.services.redis_service")

class RedisService:
    """
    In-memory caching service managing sliding conversation window buffers in Redis.
    Enforces TTL expiration and context window limits for active call sessions.
    """
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        self.default_ttl = 7200  # 2 hours TTL for active sessions
        self.max_window_size = 20  # Sliding window size limit

    def _get_key(self, call_id: str) -> str:
        """
        Internal helper formatting Redis cache key namespace for call_id.
        """
        return f"call:{call_id}:history"

    async def add_message(self, call_id: str, role: str, text: str) -> List[Dict[str, Any]]:
        """
        Adds a message to Redis sliding window and returns updated context window.
        """
        key = self._get_key(call_id)
        message_data = {
            "role": role,
            "text": text
        }
        
        message_str = json.dumps(message_data)
        await self.redis.rpush(key, message_str)
        await self.redis.ltrim(key, -self.max_window_size, -1)
        await self.redis.expire(key, self.default_ttl)
        
        return await self.get_context_window(call_id)

    async def get_context_window(self, call_id: str) -> List[Dict[str, Any]]:
        """
        Retrieves all messages stored in Redis sliding window context.
        """
        key = self._get_key(call_id)
        messages_str = await self.redis.lrange(key, 0, -1)
        
        context = []
        for msg_str in messages_str:
            try:
                context.append(json.loads(msg_str))
            except json.JSONDecodeError:
                logger.error(f"Error decoding Redis message for call {call_id}: {msg_str}")
        
        return context

    async def clear_session(self, call_id: str):
        """
        Clears Redis history upon call completion and persistence.
        """
        key = self._get_key(call_id)
        await self.redis.delete(key)
        logger.info(f"Redis session history cleared for call: {call_id}")
