from fastapi import APIRouter
from app.api.endpoints import sessions, websocket, customers

api_router = APIRouter()

# REST routes for session management and call history
api_router.include_router(sessions.router, prefix="/sessions", tags=["sessions"])

# REST routes for MongoDB Atlas customer domain profiles
api_router.include_router(customers.router, prefix="/customers", tags=["customers"])

# WebSocket route for real-time telemetry and audio streaming
api_router.include_router(websocket.router, tags=["websocket"])
