from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class MessageSchema(BaseModel):
    """
    Pydantic schema representing a single diarized speech turn in a call transcript.
    """
    role: str = Field(..., description="Role of sender: 'customer' or 'operator'")
    text: str = Field(..., description="Message text content")
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)

class EmotionRecordSchema(BaseModel):
    """
    Pydantic schema representing a real-time emotion telemetry point evaluated by Groq Llama 8B.
    """
    text: str
    detected_emotion: str
    intensity: float
    operator_alert: str
    reason: str
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)

class CopilotRecordSchema(BaseModel):
    """
    Pydantic schema representing an AI Copilot intervention record.
    """
    operator_query: Optional[str] = None
    suggested_response: str
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)

class CopilotRequest(BaseModel):
    """
    Pydantic request payload for querying the AI Copilot during an active call session.
    """
    query: Optional[str] = None

class CopilotResponse(BaseModel):
    """
    Pydantic response payload containing AI Copilot recommendation.
    """
    suggestion: str

class SessionSaveRequest(BaseModel):
    """
    Pydantic payload for persisting call session telemetry (messages, emotions, copilot interactions).
    """
    messages: List[MessageSchema]
    emotion_records: List[EmotionRecordSchema]
    copilot_records: List[CopilotRecordSchema]
