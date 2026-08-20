import asyncio
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.services.db_service import INITIAL_CUSTOMERS_SEED

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scripts.seed_normalized_db")

async def seed_normalized_database():
    """
    Executes database reset and setup script: drops legacy collections,
    creates the 5 normalized MongoDB collections, seeds initial customer personas,
    and builds primary/foreign key indexes.
    """
    logger.info(f"Connecting to MongoDB Atlas at {settings.MONGO_URI.split('@')[-1] if '@' in settings.MONGO_URI else settings.MONGO_URI}...")
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB_NAME]
    
    # 1. Clean existing collections
    existing_collections = await db.list_collection_names()
    logger.info(f"Existing collections in '{settings.MONGO_DB_NAME}': {existing_collections}")
    
    for col in ["calls", "call_sessions", "customers", "emotion_telemetry", "call_messages", "copilot_logs"]:
        if col in existing_collections:
            await db[col].drop()
            logger.info(f"Dropped legacy collection: '{col}'")
            
    # 2. Create the 5 Normalized Collections explicitly
    collections_to_create = ["customers", "call_sessions", "call_messages", "emotion_telemetry", "copilot_logs"]
    for col_name in collections_to_create:
        await db.create_collection(col_name)
        logger.info(f"Created normalized collection: '{col_name}'")
        
    # 3. Seed 'customers' collection with pure domain data
    res = await db["customers"].insert_many(INITIAL_CUSTOMERS_SEED)
    logger.info(f"✅ Successfully seeded 'customers' collection with {len(res.inserted_ids)} domain customer documents.")
    
    # 4. Create Indexes for relationships
    await db["customers"].create_index("customer_id", unique=True)
    await db["customers"].create_index("phone")
    await db["call_sessions"].create_index("session_id", unique=True)
    await db["call_sessions"].create_index("customer_id")
    await db["call_messages"].create_index("session_id")
    await db["emotion_telemetry"].create_index("session_id")
    await db["copilot_logs"].create_index("session_id")
    logger.info("✅ Database indexes created successfully on foreign and primary key fields.")
    
    client.close()
    logger.info("🚀 Normalized MongoDB Atlas Database Seeding Completed Successfully!")

if __name__ == "__main__":
    asyncio.run(seed_normalized_database())
