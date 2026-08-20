import json
import logging
import asyncio
from typing import Dict, Any
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from redis.asyncio import Redis
from app.core.database import get_redis
from app.services.redis_service import RedisService
from app.services.groq_service import groq_service
from app.services.db_service import db_service
from app.services.caller_profiles import caller_profile_service
from app.core.connection_manager import manager

router = APIRouter()
logger = logging.getLogger("app.api.endpoints.websocket")

# Buffer storage for customer utterances to debounce Groq API calls
# Dict structure: call_id -> {"texts": [str], "task": asyncio.Task or None}
customer_buffers: Dict[str, Dict[str, Any]] = {}

async def process_buffered_customer_utterance(call_id: str):
    """
    Debounced worker function. Waits for 1.2 seconds of natural silence/inactivity from customer,
    then combines all buffered speech fragments into a single cohesive utterance
    and evaluates it through the Gatekeeper before executing Groq LLM inference.
    """
    try:
        await asyncio.sleep(1.2)  # 1.2s debounce window for natural conversational pause
        
        buffer_data = customer_buffers.get(call_id)
        if not buffer_data or not buffer_data.get("texts"):
            return
            
        combined_text = " ".join(buffer_data["texts"]).strip()
        buffer_data["texts"] = []  # Reset buffer
        
        if not combined_text:
            return

        timestamp = datetime.utcnow().isoformat()
        logger.info(f"Processing customer buffered turn for room {call_id}: '{combined_text}'")
        
        # 1 Single Groq API call evaluated through the Gatekeeper!
        emotion_result = await groq_service.analyze_emotion(combined_text)
        
        if emotion_result.get("skipped_ai"):
            logger.info(f"[GATEKEEPER] Skipped Groq LLM inference & DB save for low-semantic utterance: '{combined_text}'")
            return

        analysis_record = {
            "text": combined_text,
            "detected_emotion": emotion_result.get("detected_emotion", emotion_result.get("emocion_detectada", "neutral")),
            "intensity": emotion_result.get("intensity", emotion_result.get("intensidad", 0.0)),
            "operator_alert": emotion_result.get("operator_alert", emotion_result.get("alerta_operador", "Mantener escucha empática y contención activa.")),
            "reason": emotion_result.get("reason", emotion_result.get("razon", "")),
            "primary_motive": emotion_result.get("primary_motive", emotion_result.get("motivo_principal")),
            "friction_points": emotion_result.get("friction_points", emotion_result.get("puntos_friccion")),
            "timestamp": timestamp
        }
        manager.add_emotion(call_id, analysis_record)
        
        # Persist real-time emotion telemetry point to MongoDB Atlas 'emotion_telemetry' collection
        session_data = manager.get_session(call_id)
        cust_id = session_data.get("customer_id") or "00112233"
        asyncio.create_task(db_service.save_emotion_telemetry(call_id, cust_id, analysis_record))

        # Broadcast the high-quality analysis result to all connected clients
        await manager.broadcast(call_id, {
            "type": "emotion_analysis",
            "texto_procesado": combined_text,
            **emotion_result
        })

        # Extract profile data once on full turn completion
        session = manager.get_session(call_id)
        session_history = session.get("messages", session.get("mensajes", []))
        extracted_data = await groq_service.extract_profile_data(session_history)
        
        await manager.broadcast(call_id, {
            "type": "profile_update",
            "extracted_profile": extracted_data
        })
        
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error(f"Error processing customer buffer for room {call_id}: {e}", exc_info=True)


@router.websocket("/ws/call/{call_id}")
@router.websocket("/ws/llamada/{call_id}")
async def websocket_endpoint(websocket: WebSocket, call_id: str, redis_client: Redis = Depends(get_redis)):
    """
    Real-time WebSocket endpoint managing live voice call telemetry events.
    Handles transcript broadcasting, customer turn debounced emotion analysis,
    manual profile searches, and Copilot AI queries.
    """
    await websocket.accept()
    manager.connect(websocket, call_id)
    
    if len(manager.active_connections[call_id]) == 2:
        await manager.broadcast(call_id, {
            "type": "call_status_update",
            "status": "active",
            "message": "Operator online. Voice channel established."
        })
    
    redis_service = RedisService(redis_client)
    
    try:
        initial_profile = await caller_profile_service.get_profile_async(call_id)
        if initial_profile and initial_profile.get("customer_id"):
            session_data = manager.get_session(call_id)
            session_data["customer_id"] = initial_profile.get("customer_id")

        await websocket.send_json({
            "type": "connection_status",
            "status": "connected",
            "call_id": call_id,
            "message": "Online connection synchronized.",
            "initial_profile": initial_profile
        })

        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON format."})
                continue

            msg_type = payload.get("type")

            if msg_type == "transcript":
                role = payload.get("role", "customer")  # 'customer' or 'operator'
                text = payload.get("text", "").strip()

                if not text:
                    continue

                timestamp = datetime.utcnow().isoformat()
                
                msg_record = {"role": role, "text": text, "timestamp": timestamp}
                manager.add_message(call_id, msg_record)
                
                await redis_service.add_message(call_id, role, text)

                # Persist turn message to 'call_messages' collection
                session_data = manager.get_session(call_id)
                cust_id = session_data.get("customer_id") or "00112233"
                asyncio.create_task(db_service.save_call_message(call_id, cust_id, role, text, timestamp))

                await manager.broadcast(call_id, {
                    "type": "transcript_broadcast",
                    "role": role,
                    "text": text,
                    "timestamp": timestamp
                })

                if role in ["cliente", "user", "customer"]:
                    if call_id not in customer_buffers:
                        customer_buffers[call_id] = {"texts": [], "task": None}
                    
                    buf = customer_buffers[call_id]
                    buf["texts"].append(text)
                    
                    if buf["task"] and not buf["task"].done():
                        buf["task"].cancel()
                    
                    buf["task"] = asyncio.create_task(process_buffered_customer_utterance(call_id))

            elif msg_type == "profile_search":
                query = payload.get("query", "").strip()
                logger.info(f"Manual profile search for query: {query}")
                matched_profile = await caller_profile_service.get_profile_async(query)
                
                await websocket.send_json({
                    "type": "profile_search_result",
                    "historical_profile": matched_profile,
                    "query": query
                })

            elif msg_type == "copilot_query":
                query = payload.get("query")
                logger.info(f"Copilot query received for room {call_id}")
                
                history = await redis_service.get_context_window(call_id)
                if not history:
                    session = manager.get_session(call_id)
                    history = session.get("messages", session.get("mensajes", []))

                suggestion = await groq_service.get_copilot_suggestion(history, query)
                
                manager.add_copilot(call_id, {
                    "operator_query": query,
                    "suggested_response": suggestion,
                    "timestamp": datetime.utcnow().isoformat()
                })

                # Persist copilot log interaction to 'copilot_logs' collection
                session_data = manager.get_session(call_id)
                cust_id = session_data.get("customer_id") or "00112233"
                asyncio.create_task(db_service.save_copilot_log(call_id, cust_id, query, suggestion))

                await manager.broadcast(call_id, {
                    "type": "copilot_suggestion",
                    "suggestion": suggestion,
                    "suggested_response": suggestion
                })

            elif msg_type == "mic_state":
                role = payload.get("role")
                active = payload.get("active", False)
                await manager.broadcast(call_id, {
                    "type": "mic_state_update",
                    "active_role": role if active else None
                })

    except WebSocketDisconnect:
        is_empty = manager.disconnect(websocket, call_id)
        
        if not is_empty:
            await manager.broadcast(call_id, {
                "type": "call_ended",
                "message": "The call has been ended by counterparty."
            })

        session = manager.get_session(call_id)
        messages = session.get("messages", session.get("mensajes", []))
        cust_id = session.get("customer_id") or "00112233"

        if messages:
            await db_service.save_session(
                call_id=call_id,
                messages=messages,
                emotion_records=session.get("emotion_records", session.get("registro_emociones", [])),
                copilot_records=session.get("copilot_records", session.get("registro_copilot", [])),
                customer_id=cust_id
            )

        if is_empty:
            logger.info(f"Room {call_id} is empty. Cleaning session state...")
            manager.clear_session_data(call_id)
            await redis_service.clear_session(call_id)
            buf = customer_buffers.pop(call_id, None)
            if buf and buf.get("task") and not buf["task"].done():
                buf["task"].cancel()

    except Exception as e:
        logger.error(f"Exception in websocket handler: {e}", exc_info=True)
