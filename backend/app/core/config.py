from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

# Determine absolute path to backend root directory
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE_PATH = BACKEND_DIR / ".env"

class Settings(BaseSettings):
    """
    Central application settings loaded from environment variables and local .env files.
    Defines connection URIs, Groq API credentials, model parameters, and storage paths.
    """
    # Environment
    APP_ENV: str = Field("development", validation_alias="APP_ENV")
    
    # MongoDB Atlas
    MONGO_URI: str = Field(
        "mongodb+srv://user:password@cluster.mongodb.net/emotion_db",
        validation_alias="MONGO_URI"
    )
    MONGO_DB_NAME: str = "emotion_ai_copilot"

    # Redis
    REDIS_HOST: str = Field("localhost", validation_alias="REDIS_HOST")
    REDIS_PORT: int = Field(6379, validation_alias="REDIS_PORT")
    
    # Groq API
    GROQ_API_KEY: str = Field("gsk_your_groq_api_key_here", validation_alias="GROQ_API_KEY")
    
    # Groq Model Specs
    EMOTION_MODEL: str = Field("llama-3.1-8b-instant", validation_alias="EMOTION_MODEL")
    COPILOT_MODEL: str = Field("llama-3.3-70b-versatile", validation_alias="COPILOT_MODEL")
    WHISPER_MODEL: str = Field("whisper-large-v3", validation_alias="WHISPER_MODEL")

    # Storage Paths
    RECORDINGS_DIR: str = str(BACKEND_DIR / "recordings")

    model_config = SettingsConfigDict(
        env_file=(".env", str(ENV_FILE_PATH), "/app/.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
