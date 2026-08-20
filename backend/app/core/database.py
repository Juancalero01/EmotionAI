import logging
from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger("app.core.database")

class DatabaseManager:
    """
    Asynchronous connection manager coordinating MongoDB Atlas (Motor driver) 
    and Redis cache client instances.
    """
    def __init__(self):
        self.mongo_client: AsyncIOMotorClient = None
        self.db = None
        self.redis = None

    async def connect(self):
        """
        Establishes asynchronous connections to MongoDB Atlas and Redis.
        Pings both instances to verify operational readiness.
        """
        # 1. MongoDB Atlas Connection (Motor)
        try:
            logger.info(f"Connecting to MongoDB: {settings.MONGO_URI.split('@')[-1] if '@' in settings.MONGO_URI else settings.MONGO_URI}")
            self.mongo_client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=2000)
            self.db = self.mongo_client[settings.MONGO_DB_NAME]
            await self.db.command("ping")
            logger.info("Connected successfully to MongoDB Atlas.")
        except Exception as e:
            self.db = None
            logger.warning(f"⚠️ Unable to connect to MongoDB Atlas. Session persistence will be inactive. Details: {e}")

        # 2. Redis Connection
        try:
            logger.info(f"Connecting to Redis at {settings.REDIS_HOST}:{settings.REDIS_PORT}")
            self.redis = aioredis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                decode_responses=True
            )
            await self.redis.ping()
            logger.info("Connected successfully to Redis.")
        except Exception as e:
            logger.error(f"Error connecting to Redis: {e}")
            raise e

    async def close(self):
        """
        Gracefully closes active MongoDB Atlas and Redis client connection pools.
        """
        if self.mongo_client:
            self.mongo_client.close()
            logger.info("MongoDB connection closed.")
        if self.redis:
            await self.redis.close()
            logger.info("Redis connection closed.")

db_manager = DatabaseManager()

def get_db():
    """
    Dependency provider returning active MongoDB Atlas database instance.
    """
    return db_manager.db

def get_redis():
    """
    Dependency provider returning active Redis client connection instance.
    """
    return db_manager.redis
