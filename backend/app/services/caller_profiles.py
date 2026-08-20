import logging
from typing import Dict, Any, Optional
from app.services.db_service import db_service

logger = logging.getLogger("app.services.caller_profiles")

class CallerProfileService:
    """
    Service wrapper for fetching customer profiles from MongoDB Atlas during live call connections.
    """
    @staticmethod
    async def get_profile_async(query: str) -> Optional[Dict[str, Any]]:
        """
        Asynchronously fetches customer profile directly from MongoDB Atlas 'customers' collection.
        """
        try:
            db_prof = await db_service.get_customer_profile(query)
            if db_prof:
                logger.info(f"Customer profile fetched dynamically from MongoDB Atlas: {db_prof.get('full_name')}")
                return db_prof
        except Exception as e:
            logger.error(f"Error querying MongoDB Atlas for customer profile ({e}).")
            
        return None

caller_profile_service = CallerProfileService()
