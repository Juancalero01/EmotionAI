import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import db_manager
from app.api.router import api_router

# Professional logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("app.main")

# Ensure recordings directory exists for audio archiving
os.makedirs(settings.RECORDINGS_DIR, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Asynchronous lifespan context manager handling startup resource initialization 
    (MongoDB Atlas and Redis connections, initial data seeding) and graceful shutdown resource cleanup.
    """
    # Startup tasks
    logger.info("Initializing database connections...")
    try:
        await db_manager.connect()
        from app.services.db_service import db_service
        await db_service.seed_customers_if_empty()
        logger.info("Data infrastructure ready.")
    except Exception as e:
        logger.error(f"Critical error during database startup: {e}")
    
    yield
    
    # Shutdown tasks
    logger.info("Closing database resources...")
    await db_manager.close()
    logger.info("Resources closed successfully. Shutdown complete.")

app = FastAPI(
    title="Emotion AI Real-Time Backend",
    description="Asynchronous, scalable backend for real-time emotion detection with Groq, Redis, and MongoDB.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve stored call recording audio files statically
app.mount("/recordings", StaticFiles(directory=settings.RECORDINGS_DIR), name="recordings")

# Include all API routes (REST and WebSocket)
app.include_router(api_router, prefix="/api")

@app.get("/")
async def health_check():
    """
    Performs a lightweight health check and returns application environment status.
    """
    return {
        "status": "online",
        "app_env": settings.APP_ENV,
        "message": "Emotion AI Backend operational & scalable under Docker."
    }