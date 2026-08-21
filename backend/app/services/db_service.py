import random
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import db_manager

logger = logging.getLogger("app.services.db_service")

# 4 Initial Customer Personas (Domain Data Only - Pure Domain Schema)
INITIAL_CUSTOMERS_SEED = [
    {
        "customer_id": "00112233",
        "phone": "3513178256",
        "full_name": "Kata Slovenko",
        "email": "k.slovenko@gmail.com",
        "account_type": "PREMIUM +",
        "active_services": ["Fibra 300Mbps", "Línea Voz Pro", "Almacenamiento Cloud 1TB"],
        "dominant_emotion": "FRUSTRATION",
        "total_calls": 14,
        "summary": "Cliente de alto valor que contacta frecuentemente por diferencias en el ciclo de facturación y cobros no reconocidos. Estilo de comunicación directo, suele solicitar escalamiento a supervisores.",
        "operator_notes": "Reconocer su paciencia de inmediato ante reclamos de facturación. Brindar plazos claros de resolución y verificar correo de facturación antes de transferir o generar notas de crédito.",
        "emotional_distribution": {
            "frustration": 0.85,
            "anxiety": 0.5,
            "satisfaction": 0.15,
            "neutral": 0.2
        }
    },
    {
        "customer_id": "00445566",
        "phone": "3514982210",
        "full_name": "Esteban Rossi",
        "email": "e.rossi@outlook.com",
        "account_type": "RESIDENTIAL",
        "active_services": ["Fibra 100Mbps", "Pack TV HD"],
        "dominant_emotion": "ANXIETY",
        "total_calls": 4,
        "summary": "Cliente adulto mayor que experimenta confusión con facturas digitales y configuración de equipos Wi-Fi. Requiere guía pausada paso a paso sin modismos técnicos.",
        "operator_notes": "Utilizar un tono paciente, cálido y didáctico. Guiar paso a paso por las opciones de autogestión y confirmar comprensión antes de finalizar la llamada.",
        "emotional_distribution": {
            "frustration": 0.25,
            "anxiety": 0.8,
            "satisfaction": 0.3,
            "neutral": 0.45
        }
    },
    {
        "customer_id": "00889911",
        "phone": "1140928833",
        "full_name": "Valeria Mendoza",
        "email": "v.mendoza@techcorp.io",
        "account_type": "CORPORATE VIP",
        "active_services": ["Fibra Dedicada 1Gbps", "SLA 99.9%", "Protección de Seguridad"],
        "dominant_emotion": "SATISFACTION",
        "total_calls": 22,
        "summary": "Ejecutiva corporativa con infraestructura dedicada de alta velocidad. Excelente historial de pagos y alta receptividad a ofertas de fidelización.",
        "operator_notes": "Brindar atención ejecutiva prioritaria VIP. Saludar por su nombre y ofrecer proactivamente actualización de hardware Wi-Fi 6 sin cargo.",
        "emotional_distribution": {
            "frustration": 0.1,
            "anxiety": 0.15,
            "satisfaction": 0.9,
            "neutral": 0.3
        }
    },
    {
        "customer_id": "00773322",
        "phone": "3516091188",
        "full_name": "Lucas Benítez",
        "email": "l.benitez@devstudio.com",
        "account_type": "BUSINESS PRO",
        "active_services": ["Fibra 500Mbps Business", "IP Fija", "Pasarela VPN"],
        "dominant_emotion": "NEUTRAL",
        "total_calls": 8,
        "summary": "Desarrollador de software que consulta sobre reenvío de puertos, enrutamiento de IP fija y latencia de red. Espera respuestas técnicas directas sin guiones estándar.",
        "operator_notes": "Omitir guiones básicos de reinicio de módem. Verificar de inmediato diagnóstico de nodo y estado de enrutamiento de la IP fija.",
        "emotional_distribution": {
            "frustration": 0.35,
            "anxiety": 0.2,
            "satisfaction": 0.5,
            "neutral": 0.85
        }
    }
]

class DBService:
    """
    Database persistence service executing asynchronous Motor operations against MongoDB Atlas collections
    ('customers', 'call_sessions', 'call_messages', 'emotion_telemetry', 'copilot_logs').
    """
    def __init__(self):
        pass

    @property
    def db(self) -> AsyncIOMotorDatabase:
        """
        Accessor property returning the active Motor AsyncIOMotorDatabase client instance.
        """
        return db_manager.db

    async def seed_customers_if_empty(self):
        """
        Seeds initial customer personas into MongoDB Atlas 'customers' collection if empty.
        """
        try:
            if self.db is None:
                logger.warning("MongoDB db instance is None. Skipping seed.")
                return
            count = await self.db["customers"].count_documents({})
            if count == 0:
                result = await self.db["customers"].insert_many(INITIAL_CUSTOMERS_SEED)
                logger.info(f"✅ MongoDB Atlas 'customers' collection seeded with {len(result.inserted_ids)} customer personas.")
            else:
                logger.info(f"MongoDB Atlas 'customers' collection ready ({count} documents).")
        except Exception as e:
            logger.error(f"Error seeding MongoDB Atlas 'customers' collection: {e}")

    def _get_seed_fallback(self, query: str = None) -> Dict[str, Any]:
        """
        Internal fallback resolver returning in-memory customer persona match if MongoDB Atlas is disconnected.
        """
        clean_query = (query or "").strip().lower()
        if not clean_query:
            return random.choice(INITIAL_CUSTOMERS_SEED).copy()
        for cust in INITIAL_CUSTOMERS_SEED:
            if (clean_query in cust.get("customer_id", "").lower() or
                clean_query in cust.get("phone", "").lower() or
                clean_query in cust.get("full_name", "").lower()):
                return cust.copy()
        return INITIAL_CUSTOMERS_SEED[0].copy()

    async def get_customer_profile(self, query: str) -> Optional[Dict[str, Any]]:
        """
        Fetches customer domain profile from MongoDB Atlas 'customers' collection by customer_id, phone, or full_name.
        Falls back to in-memory INITIAL_CUSTOMERS_SEED if MongoDB is inactive or document not found.
        """
        try:
            if self.db is not None:
                clean_query = (query or "").strip().lower()
                if not clean_query:
                    doc = await self.db["customers"].find_one({"customer_id": "00112233"})
                else:
                    doc = await self.db["customers"].find_one({
                        "$or": [
                            {"customer_id": {"$regex": clean_query, "$options": "i"}},
                            {"phone": {"$regex": clean_query, "$options": "i"}},
                            {"full_name": {"$regex": clean_query, "$options": "i"}}
                        ]
                    })
                
                if doc:
                    doc["_id"] = str(doc["_id"])
                    return doc
        except Exception as e:
            logger.error(f"Error fetching customer profile from MongoDB Atlas: {e}")
        
        return self._get_seed_fallback(query)

    async def get_random_customer(self) -> Optional[Dict[str, Any]]:
        """
        Executes aggregation pipeline in MongoDB Atlas to sample a random customer document.
        Falls back to in-memory INITIAL_CUSTOMERS_SEED if MongoDB is inactive.
        """
        try:
            if self.db is not None:
                cursor = self.db["customers"].aggregate([{"$sample": {"size": 1}}])
                docs = await cursor.to_list(length=1)
                if docs:
                    doc = docs[0]
                    doc["_id"] = str(doc["_id"])
                    return doc
        except Exception as e:
            logger.error(f"Error fetching random customer from MongoDB Atlas: {e}")
        
        return random.choice(INITIAL_CUSTOMERS_SEED).copy()

    async def save_call_message(self, session_id: str, customer_id: str, role: str, text: str, timestamp: str):
        """
        Inserts a diarized transcript turn into 'call_messages' collection.
        """
        try:
            if self.db is None:
                return
            doc = {
                "session_id": session_id,
                "customer_id": customer_id,
                "role": role,
                "text": text,
                "timestamp": timestamp
            }
            await self.db["call_messages"].insert_one(doc)
        except Exception as e:
            logger.error(f"Error saving message turn to MongoDB Atlas: {e}")

    async def save_emotion_telemetry(self, session_id: str, customer_id: str, record: Dict[str, Any]) -> bool:
        """
        Inserts a real-time emotion telemetry point into 'emotion_telemetry' collection.
        """
        try:
            if self.db is None:
                return False

            telemetry_doc = {
                "session_id": session_id,
                "customer_id": customer_id,
                "text": record.get("text", record.get("texto", "")),
                "detected_emotion": record.get("detected_emotion", record.get("emocion_detectada", "neutral")),
                "intensity": record.get("intensity", record.get("intensidad", 0.0)),
                "operator_alert": record.get("operator_alert", record.get("alerta_operador", "")),
                "reason": record.get("reason", record.get("razon", "")),
                "primary_motive": record.get("primary_motive", record.get("motivo_principal")),
                "friction_points": record.get("friction_points", record.get("puntos_friccion", [])),
                "timestamp": record.get("timestamp", datetime.utcnow().isoformat())
            }
            await self.db["emotion_telemetry"].insert_one(telemetry_doc)
            return True
        except Exception as e:
            logger.error(f"Error saving emotion telemetry to MongoDB Atlas: {e}")
            return False

    async def save_copilot_log(self, session_id: str, customer_id: str, operator_query: str, suggested_response: str):
        """
        Inserts an AI Copilot interaction into 'copilot_logs' collection.
        """
        try:
            if self.db is None:
                return
            doc = {
                "session_id": session_id,
                "customer_id": customer_id,
                "operator_query": operator_query,
                "suggested_response": suggested_response,
                "timestamp": datetime.utcnow().isoformat()
            }
            await self.db["copilot_logs"].insert_one(doc)
        except Exception as e:
            logger.error(f"Error saving copilot log to MongoDB Atlas: {e}")

    async def save_session(
        self,
        call_id: str,
        messages: List[Dict[str, Any]],
        emotion_records: List[Dict[str, Any]] = None,
        copilot_records: List[Dict[str, Any]] = None,
        customer_id: str = "00112233"
    ) -> bool:
        """
        Alias/Wrapper method for persisting call session data to MongoDB Atlas.
        """
        session_id = f"session_{call_id}_{int(datetime.utcnow().timestamp())}"
        return await self.save_call_session(
            session_id=session_id,
            call_id=call_id,
            customer_id=customer_id,
            messages=messages or [],
            emotion_records=emotion_records or [],
            summary_analytics={},
            talk_ratio={"customer": 65, "operator": 35}
        )

    async def save_call_session(
        self,
        session_id: str,
        call_id: str,
        customer_id: str,
        messages: List[Dict[str, Any]],
        emotion_records: List[Dict[str, Any]],
        summary_analytics: Dict[str, Any] = None,
        talk_ratio: Dict[str, int] = None,
        audio_url: str = None
    ) -> bool:
        """
        Persists confirmed session header to 'call_sessions' and updates customer call counter in MongoDB Atlas.
        """
        try:
            if self.db is None:
                logger.error("MongoDB connection inactive. Unable to persist session.")
                return False

            session_doc = {
                "session_id": session_id,
                "call_id": call_id,
                "customer_id": customer_id,
                "date": datetime.utcnow().isoformat(),
                "duration_seconds": len(messages) * 15,
                "status": "completed",
                "talk_ratio": talk_ratio or {"customer": 65, "operator": 35},
                "summary_analytics": summary_analytics or {},
                "audio_url": audio_url or f"/recordings/call_{call_id}.webm"
            }
            
            # Insert session header document into 'call_sessions'
            await self.db["call_sessions"].insert_one(session_doc)

            # Update customer total_calls counter in 'customers'
            await self.db["customers"].update_one(
                {
                    "$or": [
                        {"customer_id": customer_id},
                        {"phone": customer_id},
                        {"full_name": customer_id}
                    ]
                },
                {"$inc": {"total_calls": 1}}
            )

            logger.info(f"Call session {session_id} saved successfully to MongoDB Atlas ('call_sessions').")
            return True
        except Exception as e:
            logger.error(f"Error saving call session to MongoDB Atlas: {e}")
            return False

    async def update_session_audio_url(self, call_id: str, audio_url: str) -> bool:
        """
        Updates the audio_url property of a session in MongoDB Atlas 'call_sessions' collection.
        """
        try:
            if self.db is None:
                return False
            await self.db["call_sessions"].update_one(
                {"call_id": call_id},
                {"$set": {"audio_url": audio_url}},
                upsert=False
            )
            return True
        except Exception as e:
            logger.error(f"Error updating audio_url in MongoDB Atlas: {e}")
            return False

    async def get_unified_session(self, identifier: str) -> Optional[Dict[str, Any]]:
        """
        Performs MongoDB Aggregation Pipeline ($lookup Joins) to build a unified DTO
        joining 'call_sessions', 'customers', 'call_messages', 'emotion_telemetry', and 'copilot_logs'.
        """
        try:
            if self.db is None:
                return None
            
            pipeline = [
                {
                    "$match": {
                        "$or": [
                            {"session_id": identifier},
                            {"call_id": identifier}
                        ]
                    }
                },
                {
                    "$lookup": {
                        "from": "customers",
                        "localField": "customer_id",
                        "foreignField": "customer_id",
                        "as": "customer"
                    }
                },
                {
                    "$lookup": {
                        "from": "call_messages",
                        "localField": "session_id",
                        "foreignField": "session_id",
                        "as": "messages"
                    }
                },
                {
                    "$lookup": {
                        "from": "emotion_telemetry",
                        "localField": "session_id",
                        "foreignField": "session_id",
                        "as": "emotion_records"
                    }
                },
                {
                    "$lookup": {
                        "from": "copilot_logs",
                        "localField": "session_id",
                        "foreignField": "session_id",
                        "as": "copilot_records"
                    }
                }
            ]
            
            cursor = self.db["call_sessions"].aggregate(pipeline)
            results = await cursor.to_list(length=1)
            if results:
                doc = results[0]
                doc["_id"] = str(doc["_id"])
                if doc.get("customer") and len(doc["customer"]) > 0:
                    doc["customer"] = doc["customer"][0]
                    doc["customer"]["_id"] = str(doc["customer"]["_id"])
                return doc
            return None
        except Exception as e:
            logger.error(f"Error executing unified session aggregation lookup: {e}")
            return None

    # Backward compatibility helper for legacy calls
    async def get_session(self, call_id: str) -> Optional[Dict[str, Any]]:
        return await self.get_unified_session(call_id)

    async def list_sessions(self, limit: int = 20) -> List[Dict[str, Any]]:
        try:
            if self.db is None:
                return []
            cursor = self.db["call_sessions"].find().sort("date", -1).limit(limit)
            sessions = []
            async for doc in cursor:
                doc["_id"] = str(doc["_id"])
                sessions.append(doc)
            return sessions
        except Exception as e:
            logger.error(f"Error listing sessions from MongoDB: {e}")
            return []

db_service = DBService()
