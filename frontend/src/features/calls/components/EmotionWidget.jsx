import { useCall } from "../../../contexts/CallContext";
import { formatEmotionName, getEmotionColor } from "../../../utils/formatters";

export const EmotionWidget = ({
  currentEmotion: propEmotion,
  emotionHistory: propHistory,
  transcript: propTranscript,
  extractedProfile: propProfile,
}) => {
  const context = useCall();

  const currentEmotion = propEmotion || context?.currentEmotion || {};
  const emotionHistory =
    propHistory ||
    (context?.emotionHistory && context.emotionHistory.length > 0
      ? context.emotionHistory
      : []);
  const transcript =
    propTranscript ||
    (context?.transcript && context.transcript.length > 0
      ? context.transcript
      : []);
  const extractedProfile = propProfile || context?.extractedProfile || {};

  // Safe property resolution supporting both Spanish and English schemas
  const rawDetected =
    currentEmotion.detected_emotion || currentEmotion.emocion_detectada || "neutral";
  const rawIntensity =
    currentEmotion.intensity ?? currentEmotion.intensidad ?? 0.0;
  const operatorAlert =
    currentEmotion.operator_alert ||
    currentEmotion.alerta_operador ||
    "Esperando interacción de voz para iniciar análisis...";
  const emotionReason =
    currentEmotion.reason ||
    currentEmotion.razon ||
    "Conversación en estado inicial.";
  const primaryMotive =
    currentEmotion.primary_motive || currentEmotion.motivo_principal;
  const frictionPoints =
    currentEmotion.friction_points || currentEmotion.puntos_friccion;

  // Intensity percentage calculation
  const intensityPercentage = Math.round((rawIntensity ?? 0.0) * 100);
  const emotionName = formatEmotionName(rawDetected);
  const theme = getEmotionColor(emotionName);

  // Sentiment trend evaluation
  const getSentimentTrend = () => {
    if (!Array.isArray(emotionHistory) || emotionHistory.length < 2) {
      return {
        label: "ESTABLE",
        color: "text-slate-700 bg-slate-100 border-slate-200/80",
      };
    }
    const firstIntensity = emotionHistory[0]?.intensidad ?? emotionHistory[0]?.intensity ?? 0.0;
    const latestIntensity = rawIntensity ?? 0.0;

    if (latestIntensity < firstIntensity - 0.15) {
      return {
        label: "ESTABILIZANDO",
        color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      };
    } else if (latestIntensity > firstIntensity + 0.15) {
      return {
        label: "ESCALANDO",
        color: "text-rose-700 bg-rose-50 border-rose-200",
      };
    }
    return {
      label: "ESTABLE",
      color: "text-slate-700 bg-slate-100 border-slate-200/80",
    };
  };

  const trend = getSentimentTrend();

  // Dynamic extraction of Friction / Pain Points
  const getCustomerPainPoints = () => {
    if (!Array.isArray(transcript) || transcript.length === 0) {
      return ["Esperando Voz del Cliente"];
    }

    const customerText = transcript
      .filter((msg) => msg && (msg.role === "cliente" || msg.role === "user"))
      .map((msg) => (msg.text || "").toLowerCase())
      .join(" ");

    const points = new Set();

    if (
      customerText.includes("factura") ||
      customerText.includes("cobro") ||
      customerText.includes("cargo") ||
      customerText.includes("precio") ||
      customerText.includes("tarifa") ||
      customerText.includes("aumento") ||
      customerText.includes("pagar") ||
      customerText.includes("pago") ||
      customerText.includes("descuento") ||
      customerText.includes("caro") ||
      customerText.includes("billing") ||
      customerText.includes("charge")
    ) {
      points.add("Discrepancia en Facturación");
    }

    if (
      customerText.includes("intermiten") ||
      customerText.includes("corte") ||
      customerText.includes("caida") ||
      customerText.includes("sin servicio") ||
      customerText.includes("sin internet") ||
      customerText.includes("sin señal") ||
      customerText.includes("lento") ||
      customerText.includes("lenta") ||
      customerText.includes("velocidad") ||
      customerText.includes("error") ||
      customerText.includes("fallo") ||
      customerText.includes("funciona") ||
      customerText.includes("service")
    ) {
      points.add("Falla en Calidad de Servicio");
    }

    if (
      customerText.includes("modem") ||
      customerText.includes("router") ||
      customerText.includes("cable") ||
      customerText.includes("deco") ||
      customerText.includes("tecnico") ||
      customerText.includes("instalacion") ||
      customerText.includes("wifi")
    ) {
      points.add("Soporte Técnico");
    }

    if (
      customerText.includes("espera") ||
      customerText.includes("demora") ||
      customerText.includes("tardaron") ||
      customerText.includes("esperando") ||
      customerText.includes("atendian") ||
      customerText.includes("wait")
    ) {
      points.add("Demora en Respuesta");
    }

    if (
      customerText.includes("cancelar") ||
      customerText.includes("baja") ||
      customerText.includes("otra empresa") ||
      customerText.includes("competencia") ||
      customerText.includes("me voy") ||
      customerText.includes("cambiar de") ||
      customerText.includes("cancel")
    ) {
      points.add("Alto Riesgo de Cancelación");
    }

    if (intensityPercentage >= 70) {
      points.add("Alta Agitación");
    }

    if (points.size === 0) {
      return ["Consulta en Curso"];
    }

    return Array.from(points);
  };

  const frictionList = currentEmotion?.friction_points || currentEmotion?.puntos_friccion;
  const painPoints =
    Array.isArray(frictionList) && frictionList.length > 0
      ? frictionList
      : getCustomerPainPoints();

  // Dynamic extraction of Primary Intent
  const getCustomerPrimaryIntent = () => {
    if (currentEmotion?.primary_motive || currentEmotion?.motivo_principal) {
      return currentEmotion.primary_motive || currentEmotion.motivo_principal;
    }

    if (extractedProfile?.motive || extractedProfile?.motivo) {
      return extractedProfile.motive || extractedProfile.motivo;
    }

    if (!Array.isArray(transcript) || transcript.length === 0) {
      return "Esperando extracción de intención principal de la voz del cliente...";
    }

    const customerMsgs = transcript.filter(
      (msg) => msg && (msg.role === "cliente" || msg.role === "user")
    );

    if (customerMsgs.length === 0) {
      return "Esperando entrada de voz del cliente...";
    }

    const latestMsg = customerMsgs[customerMsgs.length - 1]?.text || "";
    return latestMsg.length > 85 ? latestMsg.slice(0, 85) + "..." : latestMsg;
  };

  const customerIntent = getCustomerPrimaryIntent();

  // Dynamic X-Axis timeline labels calculation from call start (00:00) to current duration
  const getXAxisLabels = () => {
    const formatMmSs = (totalSecs) => {
      const mins = Math.floor(totalSecs / 60);
      const secs = Math.floor(totalSecs % 60);
      return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    };

    const parseSecs = (str) => {
      if (!str || typeof str !== "string") return 0;
      const parts = str.split(":");
      if (parts.length === 2) {
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      }
      return 0;
    };

    const start = "00:00";
    let endSecs = 60;

    if (Array.isArray(emotionHistory) && emotionHistory.length > 0) {
      const lastItem = emotionHistory[emotionHistory.length - 1];
      const rawEnd = lastItem?.tiempo;
      endSecs = Math.max(30, parseSecs(rawEnd));
    }

    const midSecs = Math.floor(endSecs / 2);

    return {
      start,
      mid: formatMmSs(midSecs),
      end: formatMmSs(endSecs),
    };
  };

  const xLabels = getXAxisLabels();

  // Helper to extract 3 rows: Pinned Highest + Recent entries
  const getEmotionalTransitions = () => {
    if (!Array.isArray(emotionHistory) || emotionHistory.length === 0) {
      return [];
    }

    let highestIdx = 0;
    emotionHistory.forEach((item, idx) => {
      if ((item?.intensidad ?? 0) >= (emotionHistory[highestIdx]?.intensidad ?? 0)) {
        highestIdx = idx;
      }
    });

    const latestIdx = emotionHistory.length - 1;

    const selectedIndices = [highestIdx];

    for (let i = latestIdx; i >= 0; i--) {
      if (selectedIndices.length >= 3) break;
      if (!selectedIndices.includes(i)) {
        selectedIndices.push(i);
      }
    }

    return selectedIndices.map((idx) => ({
      ...emotionHistory[idx],
      isHighest: idx === highestIdx,
      isLatest: idx === latestIdx,
    }));
  };

  const transitions = getEmotionalTransitions();

  // Calculate dynamic single-line SVG curve from emotionHistory items
  const generateChartGeometry = () => {
    const defaultY = 110 - intensityPercentage;

    if (!Array.isArray(emotionHistory) || emotionHistory.length === 0) {
      return {
        curveD: `M 10,${defaultY} L 290,${defaultY}`,
        areaD: `M 10,${defaultY} L 290,${defaultY} L 290,110 L 10,110 Z`,
        nodeX: 150,
        nodeY: defaultY,
        peakVal: intensityPercentage,
        peakEmotion: emotionName,
        peakColor: theme.fill,
      };
    }

    if (emotionHistory.length === 1) {
      const val = Math.round((emotionHistory[0]?.intensidad ?? 0) * 100);
      const y = 110 - val;
      return {
        curveD: `M 10,110 Q 150,${y} 290,${y}`,
        areaD: `M 10,110 Q 150,${y} 290,${y} L 290,110 L 10,110 Z`,
        nodeX: 290,
        nodeY: Math.max(12, y),
        peakVal: val,
        peakEmotion: emotionName,
        peakColor: theme.fill,
      };
    }

    const points = emotionHistory.map((item, idx) => {
      const val = Math.round((item?.intensidad ?? 0) * 100);
      const x = 10 + (idx / (emotionHistory.length - 1)) * 280;
      const y = 110 - val;
      const emo = formatEmotionName(item?.emocion_detectada);
      return { x, y, val, emo, item };
    });

    let peak = points[0];
    points.forEach((p) => {
      if (p.y <= peak.y) peak = p;
    });

    const clampedX = Math.max(12, Math.min(288, peak.x));
    const clampedY = Math.max(12, Math.min(108, peak.y));

    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cpX = (curr.x + next.x) / 2;
      const cpY = (curr.y + next.y) / 2;
      d += ` Q ${curr.x},${curr.y} ${cpX},${cpY}`;
    }
    d += ` L ${points[points.length - 1].x},${points[points.length - 1].y}`;

    const area = `${d} L ${points[points.length - 1].x},110 L ${points[0].x},110 Z`;

    return {
      curveD: d,
      areaD: area,
      nodeX: clampedX,
      nodeY: clampedY,
      peakVal: peak.val,
      peakEmotion: peak.emo,
      peakColor: theme.fill,
    };
  };

  const chart = generateChartGeometry();

  return (
    <div className="flex flex-col h-full select-none space-y-3.5 px-0 py-1">
      {/* Title Header */}
      <div className="mb-1">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Analítica de la Llamada
        </h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Métricas de sentimiento e intención en tiempo real
        </p>
      </div>

      {/* Card 1: CURRENT SENTIMENT */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
            SENTIMIENTO ACTUAL
          </span>
        </div>

        <div className="flex flex-col items-center justify-center gap-3 py-2 text-center">
          {/* Circular Donut Ring Centered with Urgency below Percentage */}
          <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-full h-full transform -rotate-90"
              viewBox="0 0 36 36"
            >
              <path
                className="text-slate-100"
                strokeWidth="4"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={`${theme.stroke} transition-all duration-500`}
                strokeDasharray={`${intensityPercentage}, 100`}
                strokeWidth="4"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            
            {/* Percentage & Urgency Level inside Donut Ring */}
            <div className="absolute flex flex-col items-center justify-center select-none">
              <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
                {intensityPercentage}%
              </span>
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border mt-0.5 ${
                  intensityPercentage >= 70
                    ? "text-rose-700 bg-rose-50 border-rose-200"
                    : intensityPercentage >= 40
                    ? "text-amber-700 bg-amber-50 border-amber-200"
                    : "text-slate-700 bg-slate-100 border-slate-200/80"
                }`}
              >
                {intensityPercentage >= 70
                  ? "ALTA"
                  : intensityPercentage >= 40
                  ? "MEDIA"
                  : "BAJA"}
              </span>
            </div>
          </div>

          {/* Sentiment Text Label Centered */}
          <h3
            className={`text-xl font-extrabold tracking-wider uppercase ${theme.text}`}
          >
            {emotionName}
          </h3>
        </div>
      </div>

      {/* Card 2: CUSTOMER INTENT & PAIN POINTS (Clean & Un-nested) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
        <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 block">
          INTENCIÓN Y PUNTOS DE FRICCIÓN
        </span>

        {/* Intent Text Direct */}
        <div className="space-y-1">
          <p className="text-xs text-slate-800 font-medium leading-relaxed">
            {customerIntent}
          </p>
        </div>

        {/* Pain Points Direct Badges */}
        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            PUNTOS DE FRICCIÓN
          </span>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {painPoints.map((point, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 bg-slate-100 border border-slate-200/80 rounded-md text-[10.5px] font-bold text-slate-700 uppercase tracking-wider"
              >
                {point}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Card 3: AI SUGGESTION (Un-nested Direct Text) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-1.5">
        <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 block">
          RECOMENDACIÓN DE IA
        </span>
        <p className="text-xs text-slate-800 font-medium leading-relaxed">
          {operatorAlert ||
            "Esperando la primera respuesta del cliente para generar recomendaciones tácticas de IA..."}
        </p>
      </div>

      {/* Card 4: EMOTION HISTORY (Enhanced Chart & Spanish Table) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
            HISTORIAL EMOCIONAL
          </span>
          {/* Clean Trend Badge */}
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${trend.color}`}
          >
            {trend.label}
          </span>
        </div>

        {/* Smooth Area Line Chart SVG */}
        <div className="relative w-full pt-1">
          <div className="flex">
            {/* Y-Axis Scale */}
            <div className="flex flex-col justify-between text-[10px] text-slate-500 font-mono pr-2 py-1 select-none tabular-nums font-bold">
              <span>100%</span>
              <span>50%</span>
              <span>0%</span>
            </div>

            {/* SVG Chart */}
            <div className="flex-1 relative">
              <svg
                className="w-full h-44 overflow-visible"
                viewBox="0 0 300 120"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="areaDynamicGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={theme.fill} stopOpacity="0.30" />
                    <stop offset="100%" stopColor={theme.fill} stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Guide Lines */}
                <line
                  x1="0"
                  y1="10"
                  x2="300"
                  y2="10"
                  stroke="#F1F5F9"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <line
                  x1="0"
                  y1="60"
                  x2="300"
                  y2="60"
                  stroke="#F1F5F9"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <line
                  x1="0"
                  y1="110"
                  x2="300"
                  y2="110"
                  stroke="#CBD5E1"
                  strokeWidth="1"
                />

                {/* Area Fill */}
                <path
                  d={chart.areaD}
                  fill="url(#areaDynamicGradient)"
                />

                {/* Single Continuous Dynamic Curve Line */}
                <path
                  d={chart.curveD}
                  fill="none"
                  stroke={theme.fill}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>

              {/* Node Badge overlay */}
              <div
                className="absolute transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center shadow-md pointer-events-none transition-all duration-300 z-10"
                style={{
                  left: `${(chart.nodeX / 300) * 100}%`,
                  top: `${(chart.nodeY / 120) * 100}%`,
                  borderColor: chart.peakColor || theme.fill,
                }}
              >
                <span className="text-[10px] font-extrabold text-slate-800 leading-none tabular-nums font-mono">
                  {chart.peakVal}%
                </span>
              </div>

              {/* Dynamic X-Axis Timestamps */}
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1 px-1 tabular-nums font-bold">
                <span>{xLabels.start}</span>
                <span>{xLabels.mid}</span>
                <span>{xLabels.end}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Emotional Transition Rows */}
        {Array.isArray(emotionHistory) && emotionHistory.length > 0 && (
          <div className="pt-2.5 mt-1 border-t border-slate-100 flex flex-col space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              TRANSICIONES EMOCIONALES RECIENTES
            </span>

            <div className="flex flex-col space-y-1.5">
              {transitions.map((item, idx) => {
                const rawEmo = item?.emocion_detectada || item?.detected_emotion || item?.emotion || "NEUTRAL";
                const normEmo = formatEmotionName(rawEmo);
                let emoBadgeColor = "text-blue-700 bg-blue-50 border-blue-200";
                if (normEmo.includes("FRUSTRACIÓN")) {
                  emoBadgeColor = "text-rose-700 bg-rose-50 border-rose-200";
                } else if (normEmo.includes("ANSIEDAD")) {
                  emoBadgeColor = "text-amber-700 bg-amber-50 border-amber-200";
                } else if (normEmo.includes("SATISFACCIÓN")) {
                  emoBadgeColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
                }
                const pct = Math.round((item?.intensidad ?? item?.intensity ?? 0) * 100);

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl border border-slate-200/60 bg-slate-50/60 transition-all"
                  >
                    <span className="text-slate-800 font-semibold text-[11px] flex items-center gap-1.5 tabular-nums">
                      {item.isHighest && (
                        <svg
                          className="w-3.5 h-3.5 text-slate-600 flex-shrink-0"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          title="Pico más alto"
                        >
                          <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                        </svg>
                      )}
                      <span>{item?.tiempo || "00:00"}</span>
                      {item.isLatest && (
                        <span className="text-[8.5px] font-extrabold uppercase text-slate-700 bg-slate-200/80 px-1.5 py-0.5 rounded tracking-wider">
                          ÚLTIMO
                        </span>
                      )}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-extrabold uppercase border tabular-nums ${emoBadgeColor}`}>
                      {normEmo} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
