import { useState, useEffect } from "react";
import { useCall } from "../../../contexts/CallContext";
import { useSpeechToText } from "../../../hooks/useSpeechToText";
import { config } from "../../../core/config";
import { formatTime } from "../../../utils/formatters";
import { FaceIcon } from "../../../components/common/FaceIcon";
import { ActiveCallView } from "./ActiveCallView";
import { CallSummaryView } from "./CallSummaryView";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Headset,
  User,
  Play,
} from "lucide-react";

export const DualPhoneView = () => {
  const {
    activeCallId,
    wsStatus,
    callState,
    callDurationSecs,
    currentEmotion,
    emotionHistory,
    activeMicrophone,
    extractedProfile,
    startCall,
    endCall,
    resetCall,
    sendTranscript,
    sendMicState,
  } = useCall();

  const [isRinging, setIsRinging] = useState(false);
  const [activeFaceIdx, setActiveFaceIdx] = useState(0);
  const emotionsList = [
    {
      key: "ansiedad",
      label: "Confusión e Incertidumbre",
      underlineColor: "bg-amber-500",
      bgColor: "bg-amber-50",
      badgeColor: "bg-amber-100 text-amber-900 border-amber-300/80",
      textColor: "text-amber-500",
    },
    {
      key: "frustracion",
      label: "Frustración y Descontento",
      underlineColor: "bg-rose-500",
      bgColor: "bg-rose-50",
      badgeColor: "bg-rose-100 text-rose-900 border-rose-300/80",
      textColor: "text-rose-600",
    },
    {
      key: "satisfaccion",
      label: "Satisfacción y Alegría",
      underlineColor: "bg-emerald-500",
      bgColor: "bg-emerald-50",
      badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-300/80",
      textColor: "text-emerald-500",
    },
    {
      key: "neutral",
      label: "Estabilidad y Neutralidad",
      underlineColor: "bg-blue-500",
      bgColor: "bg-blue-50",
      badgeColor: "bg-blue-100 text-blue-900 border-blue-300/80",
      textColor: "text-blue-500",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFaceIdx((prev) => (prev + 1) % emotionsList.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const defaultCustomer = {
    phone: "3513178256",
    full_name: "Kata Slovenko",
    account_type: "PREMIUM +",
    dominant_emotion: "FRUSTRACIÓN",
    summary: "Consulta por sobrecargo en factura y plan de fibra",
    operator_notes: "Saludar con escucha empática activa y validar saldo de cuenta."
  };

  const [atlasCustomer, setAtlasCustomer] = useState(defaultCustomer);

  // Fetch initial random customer directly from MongoDB Atlas on mount
  useEffect(() => {
    let isMounted = true;
    const fetchInitialCustomer = async () => {
      try {
        const res = await fetch(`${config.API_URL}/customers/random`);
        if (res.ok) {
          const doc = await res.json();
          if (isMounted && doc && (doc.full_name || doc.nombre || doc.phone)) {
            setAtlasCustomer(doc);
          }
        }
      } catch (err) {
        console.error("Error fetching initial customer from MongoDB Atlas:", err);
      }
    };
    fetchInitialCustomer();
    return () => {
      isMounted = false;
    };
  }, []);

  const targetNumber = activeCallId || atlasCustomer.phone;

  // Speech recognition for Customer Voice
  const {
    isListening: isCustomerListening,
    startListening: startCustomerListening,
    stopListening: stopCustomerListening,
  } = useSpeechToText((text) => {
    sendTranscript("cliente", text);
  });

  // Stop customer listening when call becomes idle
  useEffect(() => {
    if (callState === "idle" && isCustomerListening) {
      stopCustomerListening();
    }
  }, [callState, isCustomerListening, stopCustomerListening]);

  // Auto-stop Customer mic if Operator mic becomes active
  useEffect(() => {
    if (callState === "active" && activeMicrophone === "operador" && isCustomerListening) {
      stopCustomerListening();
    }
  }, [activeMicrophone, isCustomerListening, callState]);

  const handleToggleCustomerMic = () => {
    if (isCustomerListening) {
      stopCustomerListening();
      sendMicState("cliente", false);
    } else if (activeMicrophone !== "operador") {
      sendMicState("cliente", true);
      startCustomerListening();
    }
  };

  // Central call launch handler (Queries MongoDB Atlas GET /api/customers/random)
  const handleCentralStartCall = async () => {
    try {
      const res = await fetch(`${config.API_URL}/customers/random`);
      if (res.ok) {
        const doc = await res.json();
        if (doc && (doc.full_name || doc.nombre || doc.phone)) {
          setAtlasCustomer(doc);
        }
      }
    } catch (err) {
      console.error("Error fetching random customer from MongoDB Atlas:", err);
    }
    setIsRinging(true);
  };

  const handleAnswerCall = () => {
    setIsRinging(false);
    startCall(atlasCustomer.phone);
  };

  const handleDeclineCall = () => {
    setIsRinging(false);
    stopCustomerListening();
  };

  const handleEndCall = () => {
    stopCustomerListening();
    setIsRinging(false);
    endCall();
  };

  const handleResetCall = () => {
    stopCustomerListening();
    setIsRinging(false);
    resetCall();
  };

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-4 select-none">
      {/* STATE 1: STANDBY LAUNCHER (1 Single Smartphone Frame Centered on Screen) */}
      {callState === "idle" && !isRinging ? (
        <div className="w-full flex flex-col items-center justify-center py-4 animate-view-fade">
          <div className={`w-[420px] md:w-[440px] h-[820px] md:h-[840px] rounded-[44px] border-[6px] border-slate-900 ring-1 ring-slate-700/50 shadow-2xl flex flex-col items-center justify-between p-4.5 pt-2.5 pb-2.5 text-center transition-colors duration-700 ${emotionsList[activeFaceIdx].bgColor}`}>
            {/* Top Camera Dynamic Island Notch Pill */}
            <div className="w-24 h-4 bg-slate-900 rounded-full mx-auto my-1 shrink-0 flex items-center justify-end px-2.5 shadow-xs">
              <div className="w-2 h-2 rounded-full bg-slate-800" />
            </div>

            {/* Top Header Label */}
            <div className="pt-2 space-y-0.5">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                EmotionAI
              </h2>
              <span className="text-[11px] font-semibold text-slate-500 tracking-wide uppercase block">
                Analítica emocional en tiempo real
              </span>
            </div>

            {/* Center Dynamic Face Icon with Hover Play Overlay */}
            <div className="my-auto space-y-6 flex flex-col items-center w-full px-4">
              <div
                onClick={handleCentralStartCall}
                className="relative group cursor-pointer shrink-0 select-none flex flex-col items-center gap-3"
                title="Haz clic para iniciar EmotionAI"
              >
                <div className="relative flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                  {/* Central Dynamic SVG Line-Art Face Icon */}
                  <div
                    key={`standby-face-${activeFaceIdx}`}
                    className="transition-all duration-300 group-hover:opacity-20 group-hover:scale-95"
                  >
                    <FaceIcon
                      emotion={emotionsList[activeFaceIdx].key}
                      colorClass={emotionsList[activeFaceIdx].textColor}
                    />
                  </div>

                  {/* Hover Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-black/30 group-hover:scale-110 transition-transform duration-300">
                      <Play className="w-8 h-8 fill-current text-white ml-0.5" />
                    </div>
                  </div>
                </div>

                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-900 transition-colors pt-1">
                  Haz clic para iniciar llamada
                </span>
              </div>

              {/* Dynamic Emotion Badge & Pill */}
              <div
                key={`standby-text-${activeFaceIdx}`}
                className="animate-view-fade flex flex-col items-center text-center space-y-2 max-w-[320px]"
              >
                <div className={`px-4 py-1.5 rounded-full text-xs font-extrabold tracking-tight border shadow-xs transition-all duration-500 ${emotionsList[activeFaceIdx].badgeColor}`}>
                  {emotionsList[activeFaceIdx].label}
                </div>
                <div
                  className={`w-28 h-1 rounded-full ${emotionsList[activeFaceIdx].underlineColor} transition-all duration-500 mt-0.5`}
                />
              </div>
            </div>

            {/* Bottom Home Indicator Bar */}
            <div className="pb-1 my-1">
              <div className="w-28 h-1 bg-slate-300 rounded-full mx-auto shrink-0" />
            </div>
          </div>
        </div>
      ) : (
        /* STATE 2: ACTIVE DUAL PHONE SIMULATION (2 Split Phones Side by Side, or 1 Centered Phone on Summary) */
        <div className="w-full flex flex-row items-center justify-center gap-4 sm:gap-6 md:gap-8 overflow-x-auto py-2 px-2 animate-view-fade">
          {/* PHONE 1: CLIENT DEVICE (LEFT - Only visible during active ringing or in-call state) */}
          {callState !== "ended" && (
            <div className="w-[420px] md:w-[440px] shrink-0 h-[820px] md:h-[840px] bg-[#F8FAFC] rounded-[44px] border-[6px] border-slate-900 ring-1 ring-slate-700/50 shadow-2xl flex flex-col relative overflow-hidden p-4.5 pt-2.5 pb-2.5">
              {/* Top Camera Dynamic Island Notch Pill */}
              <div className="w-24 h-4 bg-slate-900 rounded-full mx-auto mb-1.5 shrink-0 flex items-center justify-end px-2.5 shadow-xs">
                <div className="w-2 h-2 rounded-full bg-slate-800" />
              </div>
            {/* Customer Phone Content */}
            {isRinging ? (
              /* Clean Ringing Outgoing State for Client */
              <div className="flex-1 flex flex-col items-center justify-center py-6 px-2 text-center bg-[#F8FAFC] animate-view-fade">
                <div className="my-auto space-y-4">
                  <div className="w-24 h-24 bg-white rounded-2xl border border-slate-100/80 shadow-xs flex items-center justify-center mx-auto">
                    <User className="w-12 h-12 text-slate-800" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                      Cliente
                    </h3>
                    <p className="text-xs font-medium text-slate-500 pt-0.5">
                      Llamando al Operador...
                    </p>
                  </div>
                  <button
                    onClick={handleDeclineCall}
                    className="w-12 h-12 rounded-2xl bg-[#A81C1C] hover:bg-[#881313] flex items-center justify-center text-white cursor-pointer shadow-md mx-auto active:scale-95 mt-4 transition-all"
                    title="Cancelar llamada"
                  >
                    <PhoneOff className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            ) : (
              /* Active State: Customer In-Call Screen */
              <div className="flex-1 flex flex-col justify-center py-6 px-2 text-center bg-[#F8FAFC] animate-view-fade">
                {/* Centered Avatar, Title, Timer, Mic & Hang Up Controls */}
                <div className="my-auto flex flex-col items-center justify-center space-y-4">
                  {/* White Rounded Square Avatar Card */}
                  <div className="w-24 h-24 bg-white rounded-2xl border border-slate-100/80 shadow-xs flex items-center justify-center mx-auto">
                    <User className="w-12 h-12 text-slate-800" />
                  </div>

                  {/* Call Status Details */}
                  <div className="space-y-1">
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                      Cliente
                    </h3>
                    <span className="text-xs text-slate-500 font-medium block">
                      Llamada en curso: <span className="font-mono tabular-nums font-semibold text-slate-800">{formatTime(callDurationSecs)}</span>
                    </span>
                  </div>

                  {/* Action Buttons: Dark Mic Button & Red Hang Up Button */}
                  <div className="flex items-center justify-center gap-4 py-2">
                    <button
                      onClick={handleToggleCustomerMic}
                      disabled={callState !== "active" || activeMicrophone === "operador"}
                      className={`w-12 h-12 rounded-2xl bg-[#1F1F22] hover:bg-[#27272A] flex items-center justify-center text-white cursor-pointer shadow-md active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed`}
                      title={
                        activeMicrophone === "operador"
                          ? "Turno del Operador - Espera a que finalice"
                          : isCustomerListening
                          ? "Silenciar micrófono"
                          : "Activar micrófono"
                      }
                    >
                      {isCustomerListening ? (
                        <Mic className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <MicOff className="w-5 h-5 text-white" />
                      )}
                    </button>

                    <button
                      onClick={handleEndCall}
                      className="w-12 h-12 rounded-2xl bg-rose-700 hover:bg-rose-800 flex items-center justify-center text-white cursor-pointer shadow-md active:scale-95 transition-all duration-200"
                      title="Finalizar llamada"
                    >
                      <PhoneOff className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Security Footer & Home Indicator Bar */}
            <div className="pt-2 pb-1 text-center shrink-0">
              <span className="text-[11px] font-normal text-slate-500 block">
                Cifrado de extremo a extremo
              </span>
              <div className="w-28 h-1 bg-slate-300 rounded-full mx-auto mt-1.5 shrink-0" />
            </div>
          </div>
        )}

        {/* PHONE 2: OPERATOR COPILOT CONSOLE (RIGHT) */}
        <div className="w-[420px] md:w-[440px] shrink-0 h-[820px] md:h-[840px] bg-[#F8FAFC] rounded-[44px] border-[6px] border-slate-900 ring-1 ring-slate-700/50 shadow-2xl flex flex-col relative overflow-hidden p-4.5 pt-2.5 pb-2.5">
          {/* Top Camera Dynamic Island Notch Pill */}
          <div className="w-24 h-4 bg-slate-900 rounded-full mx-auto mb-1.5 shrink-0 flex items-center justify-end px-2.5 shadow-xs">
            <div className="w-2 h-2 rounded-full bg-slate-800" />
          </div>

          {/* Operator Phone Content */}
            {isRinging ? (
            /* Incoming Call Preview Card for Operator - Integrated Header Actions */
            <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col bg-[#F8FAFC] animate-view-fade">
              {/* Top Header Card - Call Info on Left, Action Buttons on Right */}
              <header className="bg-white rounded-2xl p-3 border border-slate-100/80 shadow-sm flex items-center justify-between mb-3 shrink-0">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-900 tabular-nums">
                    {targetNumber}
                  </span>
                  <span className="text-xs font-medium text-slate-500 mt-0.5">
                    Llamada Entrante
                  </span>
                </div>

                {/* Decline & Answer Buttons directly in Header Card */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDeclineCall}
                    className="w-10 h-10 rounded-xl bg-[#A81C1C] hover:bg-[#881313] flex items-center justify-center text-white cursor-pointer active:scale-95 transition-colors"
                    title="Rechazar llamada"
                  >
                    <PhoneOff className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={handleAnswerCall}
                    className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white cursor-pointer active:scale-95 transition-colors"
                    title="Atender llamada"
                  >
                    <Phone className="w-5 h-5 text-white" />
                  </button>
                </div>
              </header>

              {/* Scrollable Preview Body */}
              <main className="flex-1 overflow-y-auto min-h-0 py-1 pb-4 scrollbar-none space-y-3.5">
                {/* Title Header */}
                <div className="mb-1">
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    Vista Previa Entrante
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Perfil previo y análisis predictivo de riesgo
                  </p>
                </div>

                {/* CARD 1: CALLER IDENTIFICATION (With Initials Avatar) */}
                <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center font-bold text-slate-800 text-xs shrink-0 select-none">
                      {(atlasCustomer.full_name || atlasCustomer.nombre || "Kata Slovenko")
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-900">
                        {atlasCustomer.full_name || atlasCustomer.nombre || "Kata Slovenko"}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                        {targetNumber}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border bg-slate-100 text-slate-700 border-slate-200/80">
                    {atlasCustomer.account_type || atlasCustomer.tipo_cuenta || "PREMIUM +"}
                  </span>
                </div>

                {/* CARD 2: PREDICTIVE RISK & PROBABLE MOTIVE */}
                <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-sm space-y-3">
                  {/* Visual Risk Progress Meter */}
                  <div className="space-y-2">
                    <div className="flex items-end justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          RIESGO PREDICTIVO
                        </span>
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wide mt-0.5">
                          {(() => {
                            const rawEmo = (atlasCustomer.dominant_emotion || atlasCustomer.emocion_dominante || "FRUSTRACIÓN").toLowerCase();
                            if (rawEmo.includes("frustra") || rawEmo.includes("enojo")) return "FRUSTRACIÓN";
                            if (rawEmo.includes("ansied") || rawEmo.includes("duda")) return "ANSIEDAD";
                            if (rawEmo.includes("satisfa") || rawEmo.includes("alegri")) return "SATISFACCIÓN";
                            return "NEUTRAL";
                          })()}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-rose-700 font-mono tabular-nums">
                        80%
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                      <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{ width: "80%" }} />
                    </div>
                  </div>

                  {/* Direct Probable Motive Text (Un-nested) */}
                  <div className="space-y-1 pt-1.5 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      MOTIVO PROBABLE DE LLAMADA
                    </span>
                    <p className="text-xs font-medium text-slate-800 leading-relaxed">
                      {atlasCustomer.summary || atlasCustomer.resumen || atlasCustomer.last_call_outcome || "Consulta por sobrecargo en factura y plan de fibra"}
                    </p>
                  </div>
                </div>

                {/* CARD 3: RECOMMENDED GREETING DIRECTIVE (Un-nested) */}
                <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-sm space-y-1.5">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 block">
                    DIRECTIVA DE SALUDO RECOMENDADA
                  </span>
                  <p className="text-xs text-slate-800 font-medium leading-relaxed italic">
                    "{atlasCustomer.operator_notes || atlasCustomer.notas_operador || "Saludar con escucha empática activa y validar saldo de cuenta."}"
                  </p>
                </div>
              </main>
            </div>
          ) : callState === "idle" ? (
            /* Standby State for Operator */
            <div className="flex-1 flex flex-col items-center justify-center py-6 px-2 text-center bg-[#F8FAFC] animate-view-fade">
              <div className="my-auto space-y-4">
                <div className="w-24 h-24 bg-white rounded-2xl border border-slate-100/80 shadow-xs flex items-center justify-center mx-auto">
                  <Headset className="w-12 h-12 text-slate-800" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    Operador
                  </h3>
                  <p className="text-xs font-medium text-slate-500 pt-1">
                    En Espera
                  </p>
                </div>
              </div>
            </div>
          ) : callState === "ended" ? (
            /* Call Summary & Feedback View when call ends */
            <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col animate-view-fade">
              <CallSummaryView
                atlasCustomer={atlasCustomer}
                onResetCall={handleResetCall}
              />
            </div>
          ) : (
            /* Active State: ActiveCallView 4-Tab Console */
            <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col">
              <ActiveCallView onEndCall={handleEndCall} />
            </div>
          )}

          {/* Bottom Security Footer & Home Indicator Bar */}
          <div className="pt-2 pb-1 text-center shrink-0">
            <span className="text-[11px] font-normal text-slate-500 block">
              Cifrado de extremo a extremo
            </span>
            <div className="w-28 h-1 bg-slate-300 rounded-full mx-auto mt-1.5 shrink-0" />
          </div>
        </div>
      </div>
    )}
  </div>
);
};

