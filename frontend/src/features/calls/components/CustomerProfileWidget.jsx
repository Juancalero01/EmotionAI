import { useState, useEffect } from "react";
import { useCall } from "../../../contexts/CallContext";
import { config } from "../../../core/config";
import { formatEmotionName, getEmotionTextColor } from "../../../utils/formatters";

export const CustomerProfileWidget = () => {
  const { activeCallId, extractedProfile, historicalProfile, currentEmotion } = useCall();
  const [fetchedAtlasProfile, setFetchedAtlasProfile] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchAtlasProfile = async () => {
      try {
        const query = activeCallId || "random";
        const res = await fetch(`${config.API_URL}/customers/${query}`);
        if (res.ok) {
          const doc = await res.json();
          if (isMounted) setFetchedAtlasProfile(doc);
        }
      } catch (err) {
        console.error("Error fetching profile from MongoDB Atlas:", err);
      }
    };

    if (!historicalProfile) {
      fetchAtlasProfile();
    }

    return () => {
      isMounted = false;
    };
  }, [activeCallId, historicalProfile]);

  const profile = historicalProfile || fetchedAtlasProfile || {};

  const fullName = extractedProfile?.full_name || extractedProfile?.nombre || profile.full_name || profile.nombre || "Kata Slovenko";
  const accountType = profile.account_type || profile.tipo_cuenta || "PREMIUM +";
  const accountColor = "text-slate-700 bg-slate-100 border-slate-200/80 font-semibold";
  const email = extractedProfile?.email || profile.email || "customer@telecom.com";
  const customerId = extractedProfile?.customer_id || extractedProfile?.identificacion || profile.customer_id || profile.phone || "00112233";

  const activeServices = profile.active_services || profile.servicios_activos || [
    "Fiber 300Mbps",
    "Voice Pro Line"
  ];

  const rawDominant =
    currentEmotion?.detected_emotion ||
    currentEmotion?.emocion_detectada ||
    profile.dominant_emotion ||
    profile.emocion_dominante ||
    "NEUTRAL";

  const dominantEmotion = formatEmotionName(rawDominant);
  const dominantTextColor = getEmotionTextColor(dominantEmotion);

  const totalCalls = profile.total_calls ?? profile.total_llamadas ?? 14;
  const profileSummary = profile.summary || profile.resumen || "Perfil de cliente corporativo de alto valor recuperado de MongoDB Atlas.";
  const handlingDirectives = profile.operator_notes || profile.notas_operador || "Saludar con escucha empática activa y validar saldo de cuenta.";

  // Emotional Radar distribution
  const emotionalDistribution = profile.emotional_distribution || profile.distribucion_emocional || {
    frustration: 0.5,
    anxiety: 0.3,
    satisfaction: 0.6,
    neutral: 0.4,
  };

  const valN = emotionalDistribution.frustration || 0.65;
  const valE = emotionalDistribution.anxiety || 0.4;
  const valS = emotionalDistribution.satisfaction || 0.2;
  const valW = emotionalDistribution.neutral || 0.35;

  // Radar SVG Geometry (Circular Radar Rings)
  const cx = 150;
  const cy = 95;
  const r = 68;

  const pN = `${cx},${cy - r * valN}`;
  const pE = `${cx + r * valE},${cy}`;
  const pS = `${cx},${cy + r * valS}`;
  const pW = `${cx - r * valW},${cy}`;
  const polygonPoints = `${pN} ${pE} ${pS} ${pW}`;

  return (
    <div className="flex flex-col h-full select-none space-y-3.5 px-0 py-1">
      {/* Title Header */}
      <div className="mb-1">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Perfil del Cliente
        </h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Perfil histórico del cliente y patrones de comportamiento emocional
        </p>
      </div>

      {/* Card 1: PROFILE INFORMATION */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
        <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 block">
          INFORMACIÓN DEL PERFIL
        </span>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs">
          {/* Full Name */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              NOMBRE COMPLETO
            </span>
            <span className="text-xs font-bold text-slate-900 mt-0.5">
              {fullName}
            </span>
          </div>

          {/* Account Type */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              TIPO DE CUENTA
            </span>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 px-2.5 py-0.5 rounded-md border w-fit ${accountColor}`}
            >
              {accountType}
            </span>
          </div>

          {/* Email */}
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              CORREO ELECTRÓNICO
            </span>
            <span className="text-xs font-bold text-slate-900 mt-0.5 truncate">
              {email}
            </span>
          </div>

          {/* ID */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              ID DE CLIENTE
            </span>
            <span className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
              {customerId}
            </span>
          </div>

          {/* Active Services */}
          <div className="flex flex-col col-span-2 pt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              SERVICIOS ACTIVOS
            </span>
            <div className="flex flex-wrap gap-1.5 pt-1.5">
              {activeServices.map((service, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-slate-100 border border-slate-200/80 rounded-md text-[10.5px] font-bold text-slate-700 uppercase tracking-wider"
                >
                  {service}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row of 2 Side-by-Side Cards (DOMINANT EMOTION & TOTAL CALLS) */}
      <div className="grid grid-cols-2 gap-3">
        {/* DOMINANT EMOTION (Direct Text without Badge) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500">
            EMOCIÓN DOMINANTE
          </span>
          <span className={`text-sm font-extrabold uppercase tracking-wide mt-2.5 ${dominantTextColor}`}>
            {dominantEmotion}
          </span>
        </div>

        {/* TOTAL CALLS */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500">
            TOTAL DE LLAMADAS
          </span>
          <span className="text-lg font-extrabold text-slate-900 tabular-nums mt-2">
            {totalCalls}
          </span>
        </div>
      </div>

      {/* Card 3: PROFILE SUMMARY */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-1.5">
        <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 block">
          RESUMEN DEL PERFIL
        </span>
        <p className="text-xs text-slate-800 leading-relaxed font-medium">
          {profileSummary}
        </p>
      </div>

      {/* Card 4: HANDLING DIRECTIVES (Un-nested Direct Text) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-1.5">
        <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 block">
          DIRECTIVAS DE ATENCIÓN
        </span>
        <p className="text-xs text-slate-800 font-medium leading-relaxed italic">
          "{handlingDirectives}"
        </p>
      </div>

      {/* Card 5: EMOTIONAL PATTERNS - Circular SVG Radar Chart */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-2">
        <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 block">
          PATRONES EMOCIONALES
        </span>

        {/* 4-Axis Circular SVG Radar Chart */}
        <div className="relative w-full flex flex-col items-center py-2">
          <svg className="w-full h-48 overflow-visible" viewBox="0 0 300 190">
            {/* Concentric Circular Radar Rings */}
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="#CBD5E1"
              strokeWidth="1.5"
            />
            <circle
              cx={cx}
              cy={cy}
              r={r * 0.66}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle
              cx={cx}
              cy={cy}
              r={r * 0.33}
              fill="none"
              stroke="#F1F5F9"
              strokeWidth="1"
            />

            {/* Axes Cross Lines */}
            <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="#CBD5E1" strokeWidth="1" />
            <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke="#CBD5E1" strokeWidth="1" />

            {/* Data Polygon Fill */}
            <polygon
              points={polygonPoints}
              fill="rgba(37, 99, 235, 0.18)"
              stroke="#2563EB"
              strokeWidth="2.5"
            />

            {/* Node Points */}
            <circle cx={cx} cy={cy - r * valN} r="4.5" fill="#2563EB" />
            <circle cx={cx + r * valE} cy={cy} r="4.5" fill="#2563EB" />
            <circle cx={cx} cy={cy + r * valS} r="4.5" fill="#2563EB" />
            <circle cx={cx - r * valW} cy={cy} r="4.5" fill="#2563EB" />

            {/* Labels on 4 Axes */}
            {/* North: Frustration */}
            <text
              x={cx}
              y={cy - r - 10}
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill="#EF4444"
            >
              FRUSTRACIÓN ({Math.round(valN * 100)}%)
            </text>

            {/* East: Anxiety */}
            <text
              x={cx + r + 10}
              y={cy + 4}
              textAnchor="start"
              fontSize="11"
              fontWeight="700"
              fill="#F59E0B"
            >
              ANSIEDAD ({Math.round(valE * 100)}%)
            </text>

            {/* South: Satisfaction */}
            <text
              x={cx}
              y={cy + r + 18}
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill="#10B981"
            >
              SATISFACCIÓN ({Math.round(valS * 100)}%)
            </text>

            {/* West: Neutral */}
            <text
              x={cx - r - 10}
              y={cy + 4}
              textAnchor="end"
              fontSize="11"
              fontWeight="700"
              fill="#3B82F6"
            >
              NEUTRAL ({Math.round(valW * 100)}%)
            </text>
          </svg>
        </div>
      </div>

      {/* Card 6: RECENT CALL HISTORY (Single Parent Card Container) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
            HISTORIAL RECIENTE DE LLAMADAS
          </span>
          <span className="text-[10.5px] font-medium text-slate-400 font-mono tabular-nums">
            {totalCalls} llamadas registradas
          </span>
        </div>

        <div className="space-y-3 pt-0.5">
          {(profile.call_history || profile.historico_llamadas || [
            {
              date: "14 de Agosto, 14:32hs",
              duration: "00:06:12",
              motive: "Discrepancia por Sobrecargo en Factura del Mes",
              outcome: "Derivado",
              isSuccess: false,
              emotion: "FRUSTRACIÓN",
              emotion_pct: 85,
            },
            {
              date: "09 de Agosto, 10:15hs",
              duration: "00:04:20",
              motive: "Consulta sobre Plan de Fibra Óptica 300Mbps",
              outcome: "Exitoso",
              isSuccess: true,
              emotion: "SATISFACCIÓN",
              emotion_pct: 90,
            },
            {
              date: "26 de Julio, 16:00hs",
              duration: "00:03:10",
              motive: "Soporte de Configuración de Módem Wi-Fi Dual Band",
              outcome: "Exitoso",
              isSuccess: true,
              emotion: "NEUTRAL",
              emotion_pct: 60,
            },
          ]).map((call, idx) => {
            const rawEmo = call.emotion || call.emocion || "NEUTRAL";
            const emoName = formatEmotionName(rawEmo);
            const pct = call.emotion_pct ?? 70;
            const isSuccess = call.isSuccess || (call.outcome || "").toLowerCase().includes("éxito") || (call.outcome || "").toLowerCase().includes("exito") || (call.outcome || "").toLowerCase().includes("exitoso");
            
            const rawOutcome = (call.outcome || call.resultado || "").toLowerCase();
            let statusLabel = "Exitoso";
            if (isSuccess || rawOutcome.includes("exito") || rawOutcome.includes("resuelto")) {
              statusLabel = "Exitoso";
            } else if (rawOutcome.includes("derivado") || rawOutcome.includes("finanza")) {
              statusLabel = "Derivado";
            } else {
              statusLabel = "Pendiente";
            }

            let emoTextColor = "text-blue-600";
            let emoPercentColor = "text-blue-600";
            let emoBarFill = "bg-blue-500";
            if (emoName === "FRUSTRACIÓN") {
              emoTextColor = "text-slate-900";
              emoPercentColor = "text-rose-700";
              emoBarFill = "bg-rose-500";
            } else if (emoName === "ANSIEDAD") {
              emoTextColor = "text-slate-900";
              emoPercentColor = "text-amber-700";
              emoBarFill = "bg-amber-500";
            } else if (emoName === "SATISFACCIÓN") {
              emoTextColor = "text-slate-900";
              emoPercentColor = "text-emerald-700";
              emoBarFill = "bg-emerald-500";
            }

            return (
              <div
                key={idx}
                className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70 space-y-3"
              >
                {/* Line 1: Natural Date on Left, Concise Dot Status Indicator on Right */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    {(call.date || call.fecha)}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        isSuccess ? "bg-emerald-500 shadow-xs" : "bg-amber-500 shadow-xs"
                      }`}
                    />
                    <span>{statusLabel}</span>
                  </div>
                </div>

                {/* Line 2: Duration Subtitle & Full Motive Block */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                    <span>MOTIVO DE LLAMADA • <span className="text-slate-500">DURACIÓN: {(call.duration || call.duracion)}</span></span>
                  </div>
                  <p className="text-xs font-medium text-slate-800 leading-relaxed">
                    {(call.motive || call.motivo)}
                  </p>
                </div>

                {/* Visual Emotion Progress Meter (Exact format from Incoming Call Preview) */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200/50">
                  <div className="flex items-end justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        EMOCIÓN FINAL
                      </span>
                      <span className={`text-xs font-extrabold uppercase tracking-wide mt-0.5 ${emoTextColor}`}>
                        {emoName}
                      </span>
                    </div>
                    <span className={`text-sm font-extrabold font-mono tabular-nums ${emoPercentColor}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200/60 rounded-full overflow-hidden border border-slate-200/40">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${emoBarFill}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
