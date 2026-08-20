import logging
from typing import Dict, Any
from fastapi import APIRouter, HTTPException
from app.services.db_service import db_service

router = APIRouter()
logger = logging.getLogger("app.api.endpoints.customers")

@router.get("/random", response_model=Dict[str, Any])
async def get_random_customer_profile():
    """
    Fetches a random customer profile from MongoDB Atlas 'customers' collection.
    """
    customer = await db_service.get_random_customer()
    if not customer:
        # Fallback query if aggregate sample returns empty
        customer = await db_service.get_customer_profile("00112233")
        if not customer:
            raise HTTPException(status_code=404, detail="No customer profiles found in MongoDB Atlas.")
    return customer

@router.get("/{identifier}", response_model=Dict[str, Any])
async def get_customer_profile_by_identifier(identifier: str):
    """
    Fetches customer profile from MongoDB Atlas by phone, customer_id, or full_name.
    """
    customer = await db_service.get_customer_profile(identifier)
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer '{identifier}' not found in MongoDB Atlas.")
    return customer
