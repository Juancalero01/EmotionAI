import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from "react";
import { config } from "../core/config";
import { useAudioRecorder } from "../hooks/useAudioRecorder";

const CallContext = createContext(null);

/**
 * Context Provider encapsulating WebSocket real-time voice call state,
 * MediaRecorder audio capture, speech transcription, emotion telemetry, and AI Copilot interaction logic.
 */
export const CallProvider = ({ children }) => {
  const [activeCallId, setActiveCallId] = useState(null);
  const [wsStatus, setWsStatus] = useState("disconnected"); // 'disconnected' | 'connecting' | 'connected'
  const [callState, setCallState] = useState("idle"); // 'idle' | 'ringing' | 'active' | 'ended'
  const [callDurationSecs, setCallDurationSecs] = useState(0);
  const [recordingUrl, setRecordingUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [currentEmotion, setCurrentEmotion] = useState({
    emocion_detectada: "neutral",
    intensidad: 0.0,
    alerta_operador: "Inicia la llamada para comenzar el análisis.",
    razon: "",
  });
  const [emotionHistory, setEmotionHistory] = useState([]);
  const [copilotSuggestions, setCopilotSuggestions] = useState([]);
  const [copilotChat, setCopilotChat] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCopilotResponding, setIsCopilotResponding] = useState(false);
  const [activeMicrophone, setActiveMicrophone] = useState(null); // null | 'cliente' | 'operador'
  const [extractedProfile, setExtractedProfile] = useState({
    nombre: null,
    identificacion: null,
    telefono: null,
    email: null,
    motivo: null,
  });
  const [historicalProfile, setHistoricalProfile] = useState(null);

  const wsRef = useRef(null);
  const callStartTimeRef = useRef(null);
  const { startRecording, pauseRecording, resumeRecording, stopRecording } = useAudioRecorder();

  // Timer for active call duration
  useEffect(() => {
    let interval = null;
    if (callState === "active") {
      interval = setInterval(() => {
        setCallDurationSecs((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState]);

  // Audio recording lifecycle: initialize on active call
  useEffect(() => {
    if (callState === "active") {
      setRecordingUrl(null);
      if (audioBlobUrl) {
        try { URL.revokeObjectURL(audioBlobUrl); } catch (e) {}
      }
      setAudioBlob(null);
      setAudioBlobUrl(null);
      startRecording();
    }
  }, [callState, startRecording]);

  // Pause or resume recording dynamically based on active microphone
  useEffect(() => {
    if (callState === "active") {
      if (activeMicrophone === "cliente" || activeMicrophone === "operador") {
        resumeRecording();
      } else {
        pauseRecording();
      }
    }
  }, [activeMicrophone, callState, resumeRecording, pauseRecording]);

  // Stop recording when call ends and create an in-memory Blob URL for local preview
  useEffect(() => {
    if (callState === "ended") {
      const captureMemoryBlob = async () => {
        const blob = await stopRecording();
        if (blob && blob.size >= 1000) {
          setAudioBlob(blob);
          const localUrl = URL.createObjectURL(blob);
          setAudioBlobUrl(localUrl);
        } else {
          setAudioBlob(null);
          setAudioBlobUrl(null);
        }
      };
      captureMemoryBlob();
    }
  }, [callState, stopRecording]);

  // Deferred upload helper called explicitly when operator confirms session save
  const uploadAudioRecording = async (targetCallId) => {
    if (!audioBlob) return null;
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, `recording_${targetCallId}.webm`);

      const res = await fetch(`${config.API_URL}/sessions/${targetCallId}/recording`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.recording_url) {
          setRecordingUrl(data.recording_url);
          return data.recording_url;
        }
      }
      return null;
    } catch (err) {
      console.error("Error uploading audio recording during session save:", err);
      return null;
    }
  };

  // Disconnect WebSocket on context unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const startCall = (callId) => {
    if (!callId) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    callStartTimeRef.current = Date.now();
    setWsStatus("connecting");
    setCallState("ringing"); // Start in ringing state
    setActiveCallId(callId);
    setCallDurationSecs(0);

    // Reset previous call session state variables
    setTranscript([]);
    setEmotionHistory([]);
    setCopilotSuggestions([]);
    setCopilotChat([]);
    setCurrentEmotion({
      emocion_detectada: "neutral",
      intensidad: 0.0,
      alerta_operador: "Esperando la primera intervención...",
      razon: "",
    });
    setActiveMicrophone(null);
    setExtractedProfile({
      nombre: null,
      identificacion: null,
      telefono: null,
      email: null,
      motivo: null,
    });
    setHistoricalProfile(null);

    const socketUrl = `${config.WS_URL}/${callId}`;

    const ws = new WebSocket(socketUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus("connected");
      setCallState("active");
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case "connection_status":
            if (message.initial_profile) {
              setHistoricalProfile(message.initial_profile);
            }
            break;

          case "call_status_update":
            if (message.status === "active") {
              setCallState("active");
            }
            break;

          case "call_ended":
            endCall();
            break;

          case "emotion_analysis":
            setIsAnalyzing(false);

            // Calculate elapsed time in MM:SS format since call start
            const elapsedMs = callStartTimeRef.current
              ? Date.now() - callStartTimeRef.current
              : 0;
            const elapsedTotalSecs = Math.floor(elapsedMs / 1000);
            const mins = Math.floor(elapsedTotalSecs / 60);
            const secs = elapsedTotalSecs % 60;
            const formattedMmSs = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

            const detected_emotion = message.detected_emotion || message.emocion_detectada || "neutral";
            const intensity = message.intensity ?? message.intensidad ?? 0.0;
            const operator_alert = message.operator_alert || message.alerta_operador || "";
            const reason = message.reason || message.razon || "";
            const primary_motive = message.primary_motive || message.motivo_principal || "";
            const friction_points = message.friction_points || message.puntos_friccion || [];

            const newRecord = {
              texto: message.texto_procesado || message.text || "",
              detected_emotion,
              emocion_detectada: detected_emotion,
              intensity,
              intensidad: intensity,
              operator_alert,
              alerta_operador: operator_alert,
              reason,
              razon: reason,
              primary_motive,
              motivo_principal: primary_motive,
              friction_points,
              puntos_friccion: friction_points,
              tiempo: formattedMmSs,
              timestamp: new Date().toISOString(),
            };

            setCurrentEmotion({
              detected_emotion,
              emocion_detectada: detected_emotion,
              intensity,
              intensidad: intensity,
              operator_alert,
              alerta_operador: operator_alert,
              reason,
              razon: reason,
              primary_motive,
              motivo_principal: primary_motive,
              friction_points,
              puntos_friccion: friction_points,
            });

            setEmotionHistory((prev) => [...prev, newRecord]);
            break;

          case "transcript_broadcast":
            setTranscript((prev) => {
              if (prev.length === 0) {
                return [{
                  role: message.role,
                  text: message.text,
                  timestamp: message.timestamp || new Date().toISOString(),
                }];
              }

              const lastItem = prev[prev.length - 1];

              // If the incoming fragment belongs to the active turn (same role), append to current card
              if (lastItem.role === message.role) {
                const updatedLastItem = {
                  ...lastItem,
                  text: `${lastItem.text} ${message.text}`.trim(),
                  timestamp: message.timestamp || lastItem.timestamp,
                };
                return [...prev.slice(0, -1), updatedLastItem];
              }

              // Otherwise (role changed), append a new turn card
              return [
                ...prev,
                {
                  role: message.role,
                  text: message.text,
                  timestamp: message.timestamp || new Date().toISOString(),
                },
              ];
            });

            if (message.role === "cliente") {
              setIsAnalyzing(true);
            }
            break;

          case "copilot_suggestion":
            setIsCopilotResponding(false);
            const sugText = message.suggestion || message.respuesta_sugerida || message.respuesta || message.text;
            if (sugText) {
              setCopilotSuggestions((prev) => [
                ...prev,
                {
                  respuesta_sugerida: sugText,
                  timestamp: new Date().toISOString(),
                },
              ]);
              setCopilotChat((prev) => [
                ...prev,
                {
                  sender: "copilot",
                  text: sugText,
                  timestamp: new Date().toISOString(),
                },
              ]);
            }
            break;

          case "mic_state_update":
            setActiveMicrophone(message.active_role);
            break;

          case "profile_update":
            if (message.extracted_profile) {
              setExtractedProfile(message.extracted_profile);
            }
            if (message.historical_profile) {
              setHistoricalProfile(message.historical_profile);
            }
            break;

          case "profile_search_result":
            if (message.historical_profile) {
              setHistoricalProfile(message.historical_profile);
            } else {
              setHistoricalProfile(null);
            }
            break;

          case "error":
            console.error("Error de WebSocket del backend:", message.message);
            break;

          default:
            console.warn("Tipo de mensaje no controlado:", message.type);
        }
      } catch (err) {
        console.error("Error procesando mensaje de WebSocket:", err);
      }
    };

    ws.onclose = () => {
      setWsStatus("disconnected");
    };

    ws.onerror = (error) => {
      console.error("Error en WebSocket:", error);
      setWsStatus("disconnected");
    };
  };

  const endCall = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setWsStatus("disconnected");
    setCallState("ended");
    setActiveMicrophone(null);
  };

  const resetCall = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (audioBlobUrl) {
      try {
        URL.revokeObjectURL(audioBlobUrl);
      } catch (e) {}
    }
    setWsStatus("disconnected");
    setCallState("idle");
    setActiveCallId(null);
    setCallDurationSecs(0);
    setAudioBlob(null);
    setAudioBlobUrl(null);
    setRecordingUrl(null);
    setTranscript([]);
    setEmotionHistory([]);
    setCopilotSuggestions([]);
    setCurrentEmotion({
      emocion_detectada: "neutral",
      intensidad: 0.0,
      alerta_operador: "Inicia la llamada para comenzar el análisis.",
      razon: "",
    });
    setActiveMicrophone(null);
    setExtractedProfile({
      nombre: null,
      identificacion: null,
      telefono: null,
      email: null,
      motivo: null,
    });
    setHistoricalProfile(null);
  };

  const sendTranscript = (role, text) => {
    if (!wsRef.current || wsStatus !== "connected") {
      console.warn("Imposible enviar transcripción: WebSocket desconectado.");
      return;
    }

    const payload = {
      type: "transcript",
      role, // 'cliente' o 'operador'
      text,
    };

    if (role === "cliente") {
      setIsAnalyzing(true);
    }

    wsRef.current.send(JSON.stringify(payload));
  };

  const askCopilot = (query) => {
    if (query) {
      setCopilotChat((prev) => [
        ...prev,
        {
          sender: "operator",
          text: query,
          timestamp: new Date().toISOString(),
        },
      ]);
    }

    if (!wsRef.current || wsStatus !== "connected") {
      console.warn("Imposible consultar al Copilot: WebSocket desconectado.");
      return;
    }

    const payload = {
      type: "copilot_query",
      query: query || null,
    };

    setIsCopilotResponding(true);
    wsRef.current.send(JSON.stringify(payload));
  };

  const sendMicState = (role, active) => {
    setActiveMicrophone(active ? role : null);
    if (!wsRef.current || wsStatus !== "connected") {
      return;
    }
    const payload = {
      type: "mic_state",
      role,
      active,
    };
    wsRef.current.send(JSON.stringify(payload));
  };

  const searchProfile = (query) => {
    if (!wsRef.current || wsStatus !== "connected") {
      console.warn("Imposible buscar perfil: WebSocket desconectado.");
      return;
    }
    const payload = {
      type: "profile_search",
      query: query,
    };
    wsRef.current.send(JSON.stringify(payload));
  };

  return (
    <CallContext.Provider
      value={{
        activeCallId,
        wsStatus,
        callState,
        callDurationSecs,
        recordingUrl,
        audioBlob,
        audioBlobUrl,
        uploadAudioRecording,
        transcript,
        currentEmotion,
        emotionHistory,
        copilotSuggestions,
        copilotChat,
        isAnalyzing,
        isCopilotResponding,
        activeMicrophone,
        extractedProfile,
        historicalProfile,
        startCall,
        endCall,
        resetCall,
        sendTranscript,
        askCopilot,
        sendMicState,
        searchProfile,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

/**
 * Custom React Hook consuming active CallContext.
 * @returns {Object} Call state parameters, telemetry accumulators, and call management handlers.
 */
export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
};
