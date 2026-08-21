# EmotionAI - Real-Time Conversational Emotional Intelligence & Copilot

<p align="center">
  <img src="./docs/images/emotionai_header.svg" alt="EmotionAI Banner" width="100%" />
</p>

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110.0-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.2.0-61DAFB.svg?style=flat&logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.1.0-646CFF.svg?style=flat&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.0.0-06B6D4.svg?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Groq API](https://img.shields.io/badge/Groq_Llama_3.3_70B-Powered-orange.svg?style=flat)](https://groq.com/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB_Atlas-Cloud_DB-47A248.svg?style=flat&logo=mongodb)](https://www.mongodb.com/cloud/atlas)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg?style=flat&logo=docker)](https://www.docker.com/)

---

## Problemática

En los **contact centers y centros de atención al cliente actuales**, los operadores enfrentan escenarios de alta tensión y llamadas conflictivas sin contar con visibilidad en tiempo real sobre el estado emocional del cliente. 

### Principales Desafíos:
* **Atención Reactiva**: La falta de detección temprana provoca que las conversaciones escalen a conflicto antes de que el operador pueda aplicar contención psicológica.
* **Tiempos de Operación Elevados**: Búsqueda manual de manuales, políticas de reembolso y fichas de clientes mientras se atiende la llamada.
* **Alta Tasa de Churn**: Clientes insatisfechos por reclamos no resueltos o falta de empatía táctica durante la comunicación.
* **Carga Manual Post-Llamada**: Elaboración lenta de reportes de llamada, lo que reduce la disponibilidad del personal de soporte.

---

## Solución: EmotionAI Copilot

**EmotionAI** es una plataforma integral de inteligencia conversacional que procesa el flujo de voz en vivo en ventanas de **1.2 segundos**, analiza la trayectoria emocional del cliente mediante modelos de lenguaje avanzadas (**Groq Llama 8B / 70B & Whisper STT**), asiste al operador en tiempo real con un **Copiloto IA** y genera reportes ejecutivos automáticos almacenados en **MongoDB Atlas**.

### Características Principales:
1. **Detección Emocional Canónica**: Clasificación en vivo en 4 grupos emocionales (*Frustración, Ansiedad, Satisfacción, Neutralidad*) con cálculo de intensidad (0.0 a 1.0) y nivel de urgencia.
2. **Filtro Semántico (Gatekeeper)**: Inteligencia que descarta saludos, muletillas y frases cortas sin contenido emocional para optimizar las llamadas a la API de IA.
3. **Copiloto IA en Tiempo Real**: Sugerencias tácticas de desescalación y respuestas basadas en políticas corporativas.
4. **Grabación y Transcripción Diarizada**: Transcripción precisa de voz a texto con Whisper en español y captura local/remota de audio `.webm`.
5. **Reporte y Analítica Post-Llamada**: Visualización de trayectoria emocional (Emoción Inicial vs. Final), ratio de habla (*Customer % vs. Operator %*), puntaje CSAT y guardado confirmado en la nube.

---

## Arquitectura Tecnológica

```mermaid
graph TD
    Client[React + Vite Frontend] <-->|WebSocket / REST| Gateway[FastAPI Backend]
    Gateway <-->|Sliding Window Context| Redis[(Redis Cache)]
    Gateway <-->|Async Motor Driver| Mongo[(MongoDB Atlas)]
    Gateway <-->|Fast Llama 8B / 70B & Whisper| Groq[Groq Cloud AI API]
```

### Stack Técnico:
* **Frontend**: React 18, Vite, Tailwind CSS 4, Lucide Icons, Context API (`useCall`).
* **Backend**: Python 3.11, FastAPI, WebSockets, Motor Async, Pydantic v2.
* **Inteligencia Artificial**: Groq Async SDK (`llama-3.1-8b-instant`, `llama-3.3-70b-versatile`, `whisper-large-v3`).
* **Caché y Base de Datos**: Redis Async (`redis-py`), MongoDB Atlas (Colecciones normalizadas: `customers`, `call_sessions`, `call_messages`, `emotion_telemetry`, `copilot_logs`).
* **Despliegue**: Docker & Docker Compose.

---

## Instalación y Despliegue Rápido con Docker

### Prerrequisitos:
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y en ejecución.
* Cuenta y API Key en [Groq Cloud](https://console.groq.com/).

### Pasos de Despliegue:

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/tu-usuario/EmotionAI.git
   cd EmotionAI
   ```

2. **Configurar Variables de Entorno en Backend**:
   Crea el archivo `backend/.env` basándote en `.env.example`:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Edita `backend/.env` e ingresa tu API Key de Groq y tu URI de MongoDB Atlas:
   ```env
   APP_ENV=development
   GROQ_API_KEY=gsk_tu_api_key_de_groq_aqui
   MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/emotion_db
   MONGO_DB_NAME=emotion_ai_copilot
   REDIS_HOST=redis
   REDIS_PORT=6379
   ```

3. **Iniciar los servicios con Docker Compose**:
   ```bash
   cd backend
   docker compose up -d --build
   ```

4. **Iniciar el Frontend (Modo Desarrollo)**:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

5. **Acceder a la Aplicación**:
   * **Frontend Interface**: `http://localhost:5173/`
   * **Backend Health Check**: `http://localhost:8000/`
   * **Documentación Swagger API**: `http://localhost:8000/docs`

---

## Licencia y Reconocimientos

Desarrollado por **Juan Calero**.
