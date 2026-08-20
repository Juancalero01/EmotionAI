import { useState, useRef, useEffect } from "react";
import { useSpeechToText } from "../../../hooks/useSpeechToText";
import { formatTime } from "../../../utils/formatters";
import { EmotionWidget } from "./EmotionWidget";
import { CustomerProfileWidget } from "./CustomerProfileWidget";
import { CopilotPanel } from "./CopilotPanel";
import { useCall } from "../../../contexts/CallContext";
import {
  ChevronLeft,
  Headset,
  Mic,
  MicOff,
  PhoneOff,
  BarChart2,
  User,
  FileText,
  Sparkles,
  LayoutGrid,
} from "lucide-react";

export const ActiveCallView = ({ onEndCall }) => {
  const {
    activeCallId,
    wsStatus,
    callState,
    callDurationSecs: callSeconds,
    transcript,
    currentEmotion,
    emotionHistory,
    copilotSuggestions,
    isCopilotResponding,
    isAnalyzing,
    activeMicrophone,
    extractedProfile,
    endCall,
    sendTranscript,
    askCopilot,
    sendMicState,
  } = useCall();
  const [isExpanded, setIsExpanded] = useState(false); // false: Operator Home In-Call, true: Expanded Analytics
  const [activeTab, setActiveTab] = useState("analytics"); // 'analytics' | 'profile' | 'transcript' | 'aichat'
  const [hasCopilotUpdate, setHasCopilotUpdate] = useState(false);
  const [hasAnalyticsAlert, setHasAnalyticsAlert] = useState(false);
  const logEndRef = useRef(null);

  // Reconocimiento de voz local del operador
  const { isListening, startListening, stopListening } = useSpeechToText(
    (text) => {
      sendTranscript("operador", text);
    },
  );

  // Alerta visual de nuevo mensaje en el Copilot
  useEffect(() => {
    if (copilotSuggestions.length > 0 && activeTab !== "aichat") {
      setHasCopilotUpdate(true);
    }
  }, [copilotSuggestions.length, activeTab]);

  // Critical emotion alert banner trigger (intensity >= 0.7)
  useEffect(() => {
    if (
      currentEmotion &&
      currentEmotion.intensidad >= 0.7 &&
      activeTab !== "analytics"
    ) {
      setHasAnalyticsAlert(true);
    }
  }, [currentEmotion, activeTab]);

  // Auto-scroll transcript container on new speech turns
  useEffect(() => {
    if (activeTab === "transcript") {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcript, activeTab]);

  // Auto-stop Operator mic if Customer mic becomes active
  useEffect(() => {
    if (callState === "active" && activeMicrophone === "cliente" && isListening) {
      stopListening();
    }
  }, [activeMicrophone, isListening, callState, stopListening]);

  const handleToggleMic = () => {
    if (isListening) {
      stopListening();
      sendMicState("operador", false);
    } else if (activeMicrophone !== "cliente") {
      sendMicState("operador", true);
      startListening();
    }
  };

  const handleEnd = () => {
    stopListening();
    if (onEndCall) onEndCall();
    else endCall();
  };

  const handleHeaderBack = () => {
    if (isExpanded) {
      setIsExpanded(false); // Collapse back to Operator Home
    } else {
      handleEnd();
    }
  };

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-[#F8FAFC]">
      {/* Top Header Card (Only visible when expanded in Analytics) */}
      {isExpanded && (
        <header className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm flex items-center justify-between mb-3 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={handleHeaderBack}
              className="p-1 rounded-lg text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Volver al inicio de llamada"
            >
              <ChevronLeft className="w-6 h-6 text-slate-800" />
            </button>

            <div className="flex flex-col">
              <span className="text-sm font-extrabold text-slate-900 tabular-nums">
                {activeCallId || "3513178256"}
              </span>
              <span className="text-slate-500 text-xs font-medium">
                Llamada en curso: <span className="font-mono tabular-nums font-semibold">{formatTime(callSeconds)}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleMic}
              disabled={callState !== "active" || activeMicrophone === "cliente"}
              className={`w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-white cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed`}
              title={
                activeMicrophone === "cliente"
                  ? "Turno del Cliente - Espera a que finalice"
                  : isListening
                  ? "Silenciar micrófono"
                  : "Activar micrófono"
              }
            >
              {isListening ? (
                <Mic className="w-5 h-5 text-emerald-400" />
              ) : (
                <MicOff className="w-5 h-5 text-white" />
              )}
            </button>
            <button
              onClick={handleEnd}
              className="w-10 h-10 rounded-xl bg-rose-700 hover:bg-rose-800 flex items-center justify-center text-white cursor-pointer active:scale-95 shadow-sm"
              title="Finalizar llamada"
            >
              <PhoneOff className="w-5 h-5 text-white" />
            </button>
          </div>
        </header>
      )}

      {/* COLLAPSED OPERATOR IN-CALL HOME VIEW */}
      {!isExpanded ? (
        <div className="flex-1 flex flex-col justify-between py-6 px-4 text-center bg-[#F8FAFC] animate-view-fade">
          
          {/* Centered Avatar, Title, Timer, Mic & Hang Up Controls */}
          <div className="my-auto flex flex-col items-center justify-center space-y-4">
            
            {/* White Rounded Square Avatar Card */}
            <div className="w-24 h-24 bg-white rounded-2xl border border-slate-100/80 shadow-xs flex items-center justify-center mx-auto">
              <Headset className="w-12 h-12 text-slate-800" />
            </div>

            {/* Call Status Details */}
            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Operador
              </h3>
              <span className="text-xs text-slate-500 font-medium block">
                Llamada en curso: <span className="font-mono font-semibold text-slate-800 tabular-nums">{formatTime(callSeconds)}</span>
              </span>
            </div>

            {/* Action Buttons: Dark Mic Button, Red Hang Up Button & Executive Navy Menu Button */}
            <div className="flex items-center justify-center gap-4 py-2">
              <button
                onClick={handleToggleMic}
                disabled={callState !== "active" || activeMicrophone === "cliente"}
                className={`w-12 h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-white cursor-pointer shadow-md active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed`}
                title={
                  activeMicrophone === "cliente"
                    ? "Turno del Cliente - Espera a que finalice"
                    : isListening
                    ? "Silenciar micrófono"
                    : "Activar micrófono"
                }
              >
                {isListening ? (
                  <Mic className="w-5 h-5 text-emerald-400" />
                ) : (
                  <MicOff className="w-5 h-5 text-white" />
                )}
              </button>

              <button
                onClick={handleEnd}
                className="w-12 h-12 rounded-2xl bg-rose-700 hover:bg-rose-800 flex items-center justify-center text-white cursor-pointer shadow-md active:scale-95 transition-all duration-200"
                title="Finalizar llamada"
              >
                <PhoneOff className="w-5 h-5 text-white" />
              </button>

              {/* Blue 900 Expand Menu Button */}
              <button
                onClick={() => {
                  setActiveTab("analytics");
                  setIsExpanded(true);
                }}
                className="w-12 h-12 rounded-2xl bg-blue-900 hover:bg-blue-800 text-white border border-blue-700/50 flex items-center justify-center cursor-pointer shadow-md active:scale-95 transition-all duration-200"
                title="Abrir menú de telemetría e IA"
              >
                <LayoutGrid className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

        </div>
      ) : (
        /* EXPANDED 4-TAB TELEMETRY VIEW */
        <main className="flex-1 overflow-y-auto min-h-0 bg-[#F8FAFC] py-1 scrollbar-none">
          <div key={activeTab} className="animate-view-fade h-full">
            {activeTab === "analytics" && (
              <EmotionWidget
                currentEmotion={currentEmotion}
                emotionHistory={emotionHistory}
                transcript={transcript}
                extractedProfile={extractedProfile}
              />
            )}

            {activeTab === "profile" && <CustomerProfileWidget />}

            {activeTab === "transcript" && (
              <div className="flex flex-col h-full select-none space-y-3.5 px-0 py-1">
                <div className="mb-1">
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    Transcripción de la Llamada
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Transcripción en vivo e identificación de hablantes
                  </p>
                </div>

                <div className="flex-1 space-y-4">
                  {transcript.length === 0 ? (
                    <span className="text-center text-xs text-slate-400 font-medium italic pt-8 block">
                      Esperando inicio de la conversación...
                    </span>
                  ) : (
                    transcript.map((msg, index) => {
                      const isOperator =
                        msg.role === "operador" || msg.role === "agente";
                      return (
                        <div key={index} className="space-y-1">
                          <span
                            className={`text-[10px] font-bold text-slate-400 tracking-wider uppercase block ${
                              isOperator ? "text-right pr-1" : "pl-1"
                            }`}
                          >
                            {isOperator ? "OPERADOR" : "CLIENTE"}
                          </span>
                          <div
                            className={`text-xs text-slate-800 font-medium leading-relaxed rounded-2xl p-4 ${
                              isOperator
                                ? "bg-slate-100/90 border border-slate-200/60"
                                : "bg-white border border-slate-200/80 shadow-sm"
                            }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {(isAnalyzing || activeMicrophone === "cliente" || activeMicrophone === "operador") && (
                    <span className="text-center text-xs text-slate-700 font-semibold italic pt-2 block animate-pulse">
                      Transcribiendo...
                    </span>
                  )}
                  <div ref={logEndRef} />
                </div>
              </div>
            )}

            {activeTab === "aichat" && (
              <CopilotPanel
                onAskCopilot={askCopilot}
                isCopilotResponding={isCopilotResponding}
              />
            )}
          </div>
        </main>
      )}

      {/* Bottom Navigation Bar */}
      {isExpanded && (
        <footer className="bg-white rounded-2xl py-2 px-3 border border-slate-200/80 shadow-sm flex items-center justify-around shrink-0 mt-2">
          <button
            onClick={() => {
              setActiveTab("analytics");
              setIsExpanded(true);
              setHasAnalyticsAlert(false);
            }}
            className="flex flex-col items-center justify-center cursor-pointer px-3 py-1 gap-1 relative"
          >
            <BarChart2
              className={`w-5 h-5 ${
                activeTab === "analytics" ? "text-slate-900" : "text-slate-500"
              }`}
            />
            <span
              className={`text-[11px] ${
                activeTab === "analytics"
                  ? "text-slate-900 font-bold"
                  : "text-slate-500 font-medium"
              }`}
            >
              Analítica
            </span>
            {hasAnalyticsAlert && activeTab !== "analytics" && (
              <span className="absolute top-1 right-2 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab("profile");
              setIsExpanded(true);
            }}
            className="flex flex-col items-center justify-center cursor-pointer px-3 py-1 gap-1"
          >
            <User
              className={`w-5 h-5 ${
                activeTab === "profile" ? "text-slate-900" : "text-slate-500"
              }`}
            />
            <span
              className={`text-[11px] ${
                activeTab === "profile"
                  ? "text-slate-900 font-bold"
                  : "text-slate-500 font-medium"
              }`}
            >
              Perfil
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("transcript");
              setIsExpanded(true);
            }}
            className="flex flex-col items-center justify-center cursor-pointer px-3 py-1 gap-1"
          >
            <FileText
              className={`w-5 h-5 ${
                activeTab === "transcript" ? "text-slate-900" : "text-slate-500"
              }`}
            />
            <span
              className={`text-[11px] ${
                activeTab === "transcript"
                  ? "text-slate-900 font-bold"
                  : "text-slate-500 font-medium"
              }`}
            >
              Transcripción
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("aichat");
              setIsExpanded(true);
              setHasCopilotUpdate(false);
            }}
            className="flex flex-col items-center justify-center cursor-pointer px-3 py-1 gap-1 relative"
          >
            <Sparkles
              className={`w-5 h-5 ${
                activeTab === "aichat" ? "text-slate-900" : "text-slate-500"
              }`}
            />
            <span
              className={`text-[11px] ${
                activeTab === "aichat"
                  ? "text-slate-900 font-bold"
                  : "text-slate-500 font-medium"
              }`}
            >
              Chat IA
            </span>
            {hasCopilotUpdate && activeTab !== "aichat" && (
              <span className="absolute top-1 right-2 w-2 h-2 bg-slate-900 rounded-full animate-ping" />
            )}
          </button>
        </footer>
      )}
    </div>
  );
};
