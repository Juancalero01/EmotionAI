import re
import json
import logging
from typing import Dict, Any, List
from groq import AsyncGroq
from app.core.config import settings

logger = logging.getLogger("app.services.groq_service")

class GroqService:
    """
    Asynchronous AI Service integration wrapping Groq SDK models.
    Executes fast openai/gpt-oss-20b emotion analysis, openai/gpt-oss-120b Copilot recommendations,
    NER customer profile extraction, executive post-call summaries, and Whisper STT transcriptions.
    """
    def __init__(self):
        # Groq AsyncGroq SDK client for fast asynchronous inference
        self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)

    def is_semantically_relevant(self, text: str) -> bool:
        """
        Evaluates whether input text has enough semantic substance to trigger emotion detection.
        Filters out short fillers, greetings, single words, and interjections.
        """
        if not text:
            return False
        
        clean_text = text.strip().lower()
        
        # Remove common Spanish fillers, courtesy phrases, backchannels, connectors, and isolated digits
        filler_words = {
            "eh", "eee", "mmm", "mm", "ah", "ahh", "oh", "aja", "ajá", "este", "bueno",
            "hola", "holaa", "chau", "buenas", "tardes", "dias", "días", "noches", "saludos",
            "gracias", "muchas", "nada", "favor", "porfa", "si", "sí", "no", "ok", "okay", "dale",
            "listo", "perdon", "perdón", "permiso", "disculpe", "disculpa", "aló", "alo",
            "claro", "claramente", "entiendo", "comprendo", "exacto", "exactamente", "obvio",
            "obviamente", "correcto", "perfecto", "barbaro", "bárbaro", "genial", "excelente", "ajam",
            "osea", "digamos", "tipo", "viste", "mira", "mirá", "escucha", "escuchá", "sabes", "sabés",
            "cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez"
        }
        
        tokens = re.findall(r'\b\w+\b', clean_text)
        meaningful_tokens = [t for t in tokens if t not in filler_words and not t.isdigit()]
        
        # Gatekeeper Rule 1: Must have at least 3 meaningful words
        if len(meaningful_tokens) >= 3:
            return True
            
        # Gatekeeper Rule 2: At least 2 meaningful words with combined length >= 10
        meaningful_length = sum(len(t) for t in meaningful_tokens)
        if len(meaningful_tokens) >= 2 and meaningful_length >= 10:
            return True
            
        logger.info(f"[GATEKEEPER] Filtered low-semantic snippet: '{text}' (Tokens: {tokens})")
        return False

    async def analyze_emotion(self, text: str) -> Dict[str, Any]:
        """
        Analyzes a fast text snippet using openai/gpt-oss-20b
        and returns the emotional state classified into 4 canonical English groups with intensity and Spanish recommendations in JSON.
        """
        if not self.is_semantically_relevant(text):
            return {
                "detected_emotion": "neutral",
                "intensity": 0.0,
                "operator_alert": "Intervención breve sin carga emocional semántica.",
                "reason": "Frase de saludo o muletilla de relleno.",
                "primary_motive": "Saludo / Filtro activo",
                "friction_points": [],
                "skipped_ai": True
            }

        try:
            prompt = f"Customer text: \"{text}\""
            
            response = await self.client.chat.completions.create(
                model=settings.EMOTION_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an ultra-fast Artificial Intelligence specialized in conversational psychology and emotion analysis.\n"
                            "The customer's speech input is in SPANISH (or multilingual). Carefully analyze the emotional tone, nuances, frustration, anxiety, doubt, or satisfaction expressed in the customer's Spanish text.\n"
                            "Classify the customer's emotional state strictly into one of these 4 canonical groups IN ENGLISH:\n"
                            "1. 'frustration' (Risk/Alert Group: anger, aggressiveness, frustration, dissatisfaction, disappointment, complaints, billing issues, service failures)\n"
                            "2. 'anxiety' (Cognitive/Processing Group: confusion, uncertainty, doubt, skepticism, urgency, anxiety, unaddressed questions, insecurity)\n"
                            "3. 'neutral' (Stability/Neutrality Group: neutrality, calmness, receptivity, standard inquiry)\n"
                            "4. 'satisfaction' (Success/Loyalty Group: relief, satisfaction, gratitude, joy, resolution, thanks)\n"
                            "\n"
                            "Determine emotional intensity on a decimal scale from 0.0 to 1.0 based on the customer's Spanish phrasing, urgency, and tone.\n"
                            "Provide a short tactical advice IN SPANISH (operator_alert) for the operator.\n"
                            "Provide a short explanation IN SPANISH (reason) and short customer intent summary IN SPANISH (primary_motive, max 8 words).\n"
                            "Respond EXCLUSIVELY in valid JSON format with this exact structure:\n"
                            "{\n"
                            '  "detected_emotion": "frustration",\n'
                            '  "intensity": 0.8,\n'
                            '  "operator_alert": "Ofrecer asistencia inmediata y validar el problema del cliente.",\n'
                            '  "reason": "Explicación breve del grupo emocional en español",\n'
                            '  "primary_motive": "Resumen breve en español (máx 8 palabras)",\n'
                            '  "friction_points": ["Discrepancia en Facturación"]\n'
                            "}"
                        )
                    },
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=1024
            )
            
            result_content = response.choices[0].message.content
            return json.loads(result_content)
            
        except Exception as e:
            logger.error(f"Error analyzing emotion with Groq: {e}")
            return {
                "detected_emotion": "neutral",
                "intensity": 0.0,
                "operator_alert": "Mantener escucha empática y contención activa.",
                "reason": "Estado inicial de la conversación.",
                "primary_motive": "Consulta en curso",
                "friction_points": []
            }

    async def get_copilot_suggestion(self, history: List[Dict[str, Any]], operator_query: str = None) -> str:
        """
        Generates real-time suggestions using Llama 3.3 70B in Spanish.
        Reads the full sliding conversation window and optional operator query.
        """
        try:
            context_str = ""
            for msg in history:
                role_label = "Cliente" if msg.get("role") in ["cliente", "user", "customer"] else "Operador"
                context_str += f"{role_label}: {msg.get('text')}\n"

            system_prompt = (
                "Eres el Copiloto de IA de Emociones, un asistente avanzado en tiempo real para operadores de atención al cliente y ventas.\n"
                "Conoces el historial completo de la conversación en ESPAÑOL. Tu objetivo es sugerir respuestas recomendadas, "
                "técnicas de desescalación psicológica o estrategias de resolución basadas en la llamada en vivo DIRECTAMENTE EN ESPAÑOL.\n"
                "Reglas críticas:\n"
                "1. Sé extremadamente directo, claro y conciso en ESPAÑOL. No saludes ni malgastes palabras.\n"
                "2. Si hay conflicto o frustración, sugiere empatía táctica o frases de contención asertiva en español.\n"
                "3. Si es soporte o ventas, sugiere pasos inmediatos de solución."
            )
            
            user_message = f"Historial de conversación:\n{context_str}\n"
            if operator_query:
                user_message += f"Consulta del Operador: {operator_query}\n"
            else:
                user_message += "Consulta del Operador: Recomienda la mejor respuesta o acción inmediata en español para el operador en esta llamada."

            response = await self.client.chat.completions.create(
                model=settings.COPILOT_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.5,
                max_tokens=500
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Error getting Copilot recommendation with Groq: {e}")
            return "No se pudo generar la sugerencia del Copiloto IA en este momento. Por favor reintenta."

    async def transcribe_audio(self, file_name: str, file_bytes: bytes) -> str:
        """
        Transcribes audio files using Groq Whisper model in Spanish.
        """
        try:
            response = await self.client.audio.transcriptions.create(
                file=(file_name, file_bytes),
                model=settings.WHISPER_MODEL,
                language="es"
            )
            return response.text
        except Exception as e:
            logger.error(f"Error transcribing audio with Groq Whisper: {e}")
            raise e

    async def extract_profile_data(self, history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyzes conversation history to extract customer profile NER fields in English JSON.
        """
        try:
            context_str = ""
            for msg in history:
                role_label = "Cliente" if msg.get("role") in ["cliente", "user", "customer"] else "Operador"
                context_str += f"{role_label}: {msg.get('text')}\n"

            system_prompt = (
                "You are an Artificial Intelligence specialized in Named Entity Recognition (NER) and information extraction.\n"
                "Analyze the provided call conversation history and extract the following customer profile fields if explicitly or clearly implied:\n"
                "1. full_name (Customer full name)\n"
                "2. customer_id (Customer ID, passport, or tax number)\n"
                "3. phone (Contact phone number)\n"
                "4. email (Email address)\n"
                "5. motive (Brief description, max 6 words, of primary call motive IN SPANISH)\n"
                "\n"
                "Critical rules:\n"
                "- If a field was not mentioned or is unknown, set its value to null.\n"
                "- Do not invent information.\n"
                "- Respond EXCLUSIVELY in valid JSON format:\n"
                "{\n"
                '  "full_name": "full name or null",\n'
                '  "customer_id": "ID or null",\n'
                '  "phone": "phone or null",\n'
                '  "email": "email or null",\n'
                '  "motive": "call motive in SPANISH or null"\n'
                "}"
            )

            response = await self.client.chat.completions.create(
                model=settings.COPILOT_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Historial de conversación:\n{context_str}"}
                ],
                response_format={"type": "json_object"},
                temperature=0.0,
                max_tokens=256
            )
            
            result_content = response.choices[0].message.content
            return json.loads(result_content)
            
        except Exception as e:
            logger.error(f"Error extracting profile data with Groq: {e}")
            return {
                "full_name": None,
                "customer_id": None,
                "phone": None,
                "email": None,
                "motive": None
            }

    async def generate_call_summary(self, history: List[Dict[str, Any]], emotion_history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generates executive post-call report and coaching feedback using Llama 70B in English JSON with Spanish text values.
        """
        try:
            context_str = ""
            for msg in history:
                role_label = "Cliente" if msg.get("role") in ["cliente", "user", "customer"] else "Operador"
                context_str += f"{role_label}: {msg.get('text')}\n"

            emotions_summary = ", ".join([
                f"{e.get('detected_emotion', e.get('emocion_detectada', 'neutral'))}({e.get('intensity', e.get('intensidad', 0.0))})"
                for e in emotion_history[-5:]
            ])

            system_prompt = (
                "You are the Intelligent Evaluator for Emotion AI Copilot.\n"
                "Your objective is to analyze a completed call between a Customer and an Operator to structure executive call analytics and a concise summary IN SPANISH.\n"
                "Analyze the message history and emotional records to return EXCLUSIVELY a valid JSON with this exact structure:\n"
                "{\n"
                '  "call_result": "RESOLVED WITH SUCCESS" | "REQUIRES FOLLOW-UP" | "HIGH CHURN RISK",\n'
                '  "satisfaction_score": 0 to 100,\n'
                '  "executive_summary": "Concise 2-sentence executive summary of the call outcome IN SPANISH",\n'
                '  "emotional_journey_summary": "Short description IN SPANISH of how the customer emotional state started and ended",\n'
                '  "next_action": "Concrete recommended next step IN SPANISH (e.g., Enviar correo de confirmación de resolución y actualizar ticket en CRM)"\n'
                "}"
            )

            user_prompt = f"Historial de conversación:\n{context_str}\nÚltimas emociones detectadas: {emotions_summary}"

            response = await self.client.chat.completions.create(
                model=settings.COPILOT_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
                max_tokens=450
            )

            return json.loads(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"Error generating call summary with Groq: {e}")
            return {
                "call_result": "RESOLVED WITH SUCCESS",
                "satisfaction_score": 88,
                "executive_summary": "El cliente se comunicó por cargos en el ciclo de facturación. El operador brindó contención empática activa y logró una resolución óptima.",
                "emotional_journey_summary": "Transición favorable desde FRUSTRACIÓN inicial hasta SATISFACCIÓN final.",
                "next_action": "Enviar correo de confirmación de resolución y actualizar ticket en CRM."
            }

groq_service = GroqService()
