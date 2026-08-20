import logging

logger = logging.getLogger("app.core.connection_manager")

class ConnectionManager:
    """
    Manages active WebSocket connections grouped by call_id rooms.
    Tracks live call telemetry data (transcript turns, emotion records, copilot logs) in memory.
    """
    def __init__(self):
        # Maps call_id -> list of active WebSocket connections
        self.active_connections: dict[str, list] = {}
        # Maps call_id -> accumulated session telemetry data
        self.session_data: dict[str, dict] = {}

    def connect(self, websocket, call_id: str):
        """
        Registers a new WebSocket connection to the room matching call_id.
        Initializes session telemetry accumulators if room is newly created.
        """
        if call_id not in self.active_connections:
            self.active_connections[call_id] = []
            self.session_data[call_id] = {
                "messages": [],
                "emotion_records": [],
                "copilot_records": []
            }
        self.active_connections[call_id].append(websocket)
        logger.info(f"Connection added to room {call_id}. Total active: {len(self.active_connections[call_id])}")

    def disconnect(self, websocket, call_id: str) -> bool:
        """
        Removes a connection. Returns True if the room becomes empty.
        """
        if call_id in self.active_connections:
            if websocket in self.active_connections[call_id]:
                self.active_connections[call_id].remove(websocket)
            logger.info(f"Connection removed from room {call_id}. Remaining: {len(self.active_connections[call_id])}")
            if not self.active_connections[call_id]:
                del self.active_connections[call_id]
                return True
        return False

    async def broadcast(self, call_id: str, message: dict):
        """
        Broadcasts a JSON message to all connected clients in the specified room.
        """
        if call_id in self.active_connections:
            for connection in self.active_connections[call_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.warning(f"Error broadcasting message to room {call_id}: {e}")

    def add_message(self, call_id: str, message: dict):
        """
        Appends a diarized transcript turn to the in-memory room session telemetry.
        """
        if call_id in self.session_data:
            session = self.session_data[call_id]
            target_list = session.get("messages")
            if target_list is not None:
                target_list.append(message)

    def add_emotion(self, call_id: str, emotion: dict):
        """
        Appends an emotion analysis record to the in-memory room session telemetry.
        """
        if call_id in self.session_data:
            session = self.session_data[call_id]
            target_list = session.get("emotion_records")
            if target_list is not None:
                target_list.append(emotion)

    def add_copilot(self, call_id: str, copilot: dict):
        """
        Appends an AI Copilot interaction to the in-memory room session telemetry.
        """
        if call_id in self.session_data:
            session = self.session_data[call_id]
            target_list = session.get("copilot_records")
            if target_list is not None:
                target_list.append(copilot)

    def get_session(self, call_id: str) -> dict:
        """
        Retrieves accumulated session telemetry data for call_id or default empty structure.
        """
        return self.session_data.get(call_id, {
            "messages": [],
            "emotion_records": [],
            "copilot_records": []
        })

    async def reject_session(self, call_id: str):
        """
        Ends the call room and notifies caller of rejection, closing active WebSocket connections.
        """
        if call_id in self.active_connections:
            await self.broadcast(call_id, {
                "type": "call_ended",
                "message": "The call has been rejected by the operator."
            })
            connections = list(self.active_connections[call_id])
            for connection in connections:
                try:
                    await connection.close()
                except Exception as e:
                    logger.warning(f"Error closing websocket when rejecting call {call_id}: {e}")

    def clear_session_data(self, call_id: str):
        """
        Clears accumulated in-memory room session data for call_id upon call end.
        """
        if call_id in self.session_data:
            del self.session_data[call_id]

manager = ConnectionManager()
