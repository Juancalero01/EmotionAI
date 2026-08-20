import os
import logging
from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from redis.asyncio import Redis
from app.core.database import get_redis
from app.core.config import settings
from app.services.db_service import db_service
from app.services.groq_service import groq_service
from app.services.redis_service import RedisService
from app.schemas.session import CopilotRequest, CopilotResponse, SessionSaveRequest
from app.core.connection_manager import manager

router = APIRouter()
logger = logging.getLogger("app.api.endpoints.sessions")

@router.get("/", response_model=List[Dict[str, Any]])
async def get_all_sessions():
    """
    Fetches historical call sessions list stored in database.
    """
    return await db_service.list_sessions()

@router.get("/active", response_model=List[str])
async def get_active_ringing_sessions():
    """
    Fetches active ringing sessions awaiting operator answer.
    """
    ringing_calls = [
        call_id for call_id, conns in manager.active_connections.items()
        if len(conns) == 1
    ]
    return ringing_calls

@router.get("/{call_id}", response_model=Dict[str, Any])
async def get_session_by_id(call_id: str):
    """
    Fetches specific call session by its unique ID.
    """
    session = await db_service.get_session(call_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return session

@router.post("/{call_id}/copilot", response_model=CopilotResponse)
async def ask_copilot(
    call_id: str,
    payload: CopilotRequest,
    redis_client: Redis = Depends(get_redis)
):
    """
    Requests contextual AI Copilot suggestion using sliding window conversation context.
    """
    redis_service = RedisService(redis_client)
    history = await redis_service.get_context_window(call_id)
    
    if not history:
        session = manager.get_session(call_id)
        history = session.get("messages", session.get("mensajes", []))
        if not history:
            db_session = await db_service.get_session(call_id)
            if db_session:
                history = db_session.get("messages", db_session.get("mensajes", []))

    if not history:
        raise HTTPException(
            status_code=400, 
            detail="No active context found for this call. Please start the call first."
        )

    suggestion = await groq_service.get_copilot_suggestion(history, payload.query)
    return CopilotResponse(suggestion=suggestion)

@router.post("/{call_id}/save")
async def save_session_manually(call_id: str, payload: SessionSaveRequest):
    """
    Manually persists session telemetry to database.
    """
    messages = [m.model_dump() for m in payload.messages]
    emotion_records = [e.model_dump() for e in payload.emotion_records]
    copilot_records = [c.model_dump() for c in payload.copilot_records]

    success = await db_service.save_session(
        call_id=call_id,
        messages=messages,
        emotion_records=emotion_records,
        copilot_records=copilot_records
    )
    if not success:
        raise HTTPException(status_code=500, detail="Error saving session in database.")
    return {"status": "success", "message": "Session saved successfully."}

@router.post("/{call_id}/transcribe")
async def transcribe_session_audio(
    call_id: str,
    role: str = Query(..., description="Role of speaking participant: 'customer' or 'operator'"),
    file: UploadFile = File(...),
    redis_client: Redis = Depends(get_redis)
):
    """
    Receives audio fragment, transcribes with Groq Whisper, updates Redis context window and broadcasts result.
    """
    try:
        audio_bytes = await file.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Audio file is empty.")
        
        text = await groq_service.transcribe_audio(file.filename, audio_bytes)
        text = text.strip()
        
        if not text:
            return {"status": "success", "transcript": "", "message": "Silence detected."}
        
        timestamp = datetime.utcnow().isoformat()
        redis_service = RedisService(redis_client)
        
        if call_id not in manager.session_data:
            manager.session_data[call_id] = {
                "messages": [],
                "emotion_records": [],
                "copilot_records": []
            }
            
        msg_record = {"role": role, "text": text, "timestamp": timestamp}
        manager.add_message(call_id, msg_record)
        
        await redis_service.add_message(call_id, role, text)
        
        await manager.broadcast(call_id, {
            "type": "transcript_broadcast",
            "role": role,
            "text": text,
            "timestamp": timestamp
        })
        
        emotion_analysis = None
        if role in ["cliente", "user", "customer"]:
            emotion_result = await groq_service.analyze_emotion(text)
            analysis_record = {
                "text": text,
                "detected_emotion": emotion_result.get("detected_emotion", emotion_result.get("emocion_detectada", "neutral")),
                "intensity": emotion_result.get("intensity", emotion_result.get("intensidad", 0.0)),
                "operator_alert": emotion_result.get("operator_alert", emotion_result.get("alerta_operador", "Maintain active empathetic listening.")),
                "reason": emotion_result.get("reason", emotion_result.get("razon", "")),
                "timestamp": timestamp
            }
            manager.add_emotion(call_id, analysis_record)
            
            await manager.broadcast(call_id, {
                "type": "emotion_analysis",
                "texto_procesado": text,
                **emotion_result
            })
            emotion_analysis = emotion_result
            
        return {
            "status": "success",
            "transcript": text,
            "emotion_analysis": emotion_analysis
        }
        
    except Exception as e:
        logger.error(f"Error in transcribe_session_audio for call {call_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error transcribing audio: {str(e)}")

@router.post("/{call_id}/reject")
async def reject_ringing_session(call_id: str):
    """
    Rejects ringing call session and notifies caller.
    """
    if call_id in manager.active_connections:
        await manager.reject_session(call_id)
        manager.clear_session_data(call_id)
        return {"status": "success", "message": f"Call {call_id} rejected successfully."}
    else:
        raise HTTPException(status_code=404, detail="Call is not ringing or already disconnected.")

@router.post("/{call_id}/summary")
async def generate_session_summary(call_id: str, payload: Dict[str, Any] = None):
    """
    Generates post-call executive summary with Llama 70B for preview without polluting MongoDB Atlas.
    """
    session = manager.get_session(call_id)
    messages = (payload and payload.get("messages")) or (payload and payload.get("mensajes")) or session.get("messages", session.get("mensajes", []))
    emotion_records = (payload and payload.get("emotion_records")) or (payload and payload.get("registro_emociones")) or session.get("emotion_records", session.get("registro_emociones", []))
    
    if not messages:
        db_session = await db_service.get_session(call_id)
        if db_session:
            messages = db_session.get("messages", db_session.get("mensajes", []))
            emotion_records = db_session.get("emotion_records", db_session.get("registro_emociones", []))
            
    summary_data = await groq_service.generate_call_summary(messages, emotion_records)
    return summary_data

@router.post("/{call_id}/save_confirmed")
async def save_confirmed_session(call_id: str, payload: Dict[str, Any]):
    """
    Explicitly persists confirmed session to MongoDB Atlas 'call_sessions' and updates 'customers' collection.
    """
    session = manager.get_session(call_id)
    messages = payload.get("messages") or session.get("messages", [])
    emotion_records = payload.get("emotion_records") or session.get("emotion_records", [])
    summary_data = payload.get("summary_analytics", {})
    customer_id = payload.get("customer_id", "00112233")
    session_id = f"session_{call_id}_{int(datetime.utcnow().timestamp())}"

    customer_msgs = [m for m in messages if m.get("role") in ["cliente", "user", "customer"]]
    operator_msgs = [m for m in messages if m.get("role") in ["operador", "operator"]]
    total_msgs = max(len(messages), 1)
    cust_pct = int(round((len(customer_msgs) / total_msgs) * 100)) if total_msgs > 0 else 65
    op_pct = 100 - cust_pct if total_msgs > 0 else 35
    talk_ratio = {"customer": cust_pct, "operator": op_pct}

    # Persist session to MongoDB Atlas 'call_sessions'
    success = await db_service.save_call_session(
        session_id=session_id,
        call_id=call_id,
        customer_id=customer_id,
        messages=messages,
        emotion_records=emotion_records,
        summary_analytics=summary_data,
        talk_ratio=talk_ratio
    )

    if not success:
        raise HTTPException(status_code=500, detail="Unable to persist session to MongoDB Atlas.")

    return {"status": "success", "session_id": session_id, "message": f"Call {call_id} saved to MongoDB Atlas!"}

@router.post("/{call_id}/recording")
async def upload_session_recording(call_id: str, file: UploadFile = File(...)):
    """
    Receives compiled audio recording file (.webm/.mp3/.wav), saves to backend recordings directory,
    and updates MongoDB session record if session exists.
    """
    try:
        os.makedirs(settings.RECORDINGS_DIR, exist_ok=True)
        file_bytes = await file.read()
        if not file_bytes or len(file_bytes) < 1000:
            return {"status": "ignored", "message": "Audio file empty or too small (less than 1KB)."}
        
        filename = f"call_{call_id}.webm"
        file_path = os.path.join(settings.RECORDINGS_DIR, filename)
        with open(file_path, "wb") as f:
            f.write(file_bytes)
        
        relative_url = f"/recordings/{filename}"
        
        # Update MongoDB Atlas session audio_url if session exists
        await db_service.update_session_audio_url(call_id, relative_url)
        
        logger.info(f"Call recording saved for session {call_id}: {relative_url} ({len(file_bytes)} bytes)")
        
        return {
            "status": "success",
            "recording_url": relative_url,
            "size_bytes": len(file_bytes),
            "message": "Call recording uploaded and stored successfully."
        }
    except Exception as e:
        logger.error(f"Error saving call recording for {call_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error saving recording: {str(e)}")
