/**
 * Minimalist line-art face SVG matching 4 distinct facial expressions:
 * 'frustracion' | 'ansiedad' | 'satisfaccion' | 'neutral'
 */
export const FaceIcon = ({ emotion, className = "", colorClass }) => {
  const norm = (emotion || "").toLowerCase();

  const getColor = () => {
    if (colorClass) return colorClass;
    if (norm.includes("frustra")) return "text-rose-600";
    if (norm.includes("ansied")) return "text-amber-500";
    if (norm.includes("satisfa")) return "text-emerald-500";
    return "text-blue-500";
  };

  const finalColor = getColor();
  const defaultClass = className || `w-28 h-28 sm:w-36 sm:h-36 ${finalColor} shrink-0 transition-colors duration-500`;

  // 1. FRUSTRACIÓN: Angled angry eyebrows + inverted mouth curve
  if (norm.includes("frustra")) {
    return (
      <svg
        className={defaultClass}
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      >
        <circle cx="50" cy="50" r="42" strokeWidth="5" />
        <line x1="26" y1="30" x2="42" y2="36" strokeWidth="4.5" />
        <line x1="74" y1="30" x2="58" y2="36" strokeWidth="4.5" />
        <circle cx="35" cy="43" r="4" fill="currentColor" stroke="none" />
        <circle cx="65" cy="43" r="4" fill="currentColor" stroke="none" />
        <path d="M 28,68 Q 50,52 72,68" strokeWidth="5" fill="none" />
      </svg>
    );
  }

  // 2. ANSIEDAD: Worried eyebrows + wavy mouth
  if (norm.includes("ansied")) {
    return (
      <svg
        className={defaultClass}
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      >
        <circle cx="50" cy="50" r="42" strokeWidth="5" />
        <line x1="28" y1="35" x2="42" y2="29" strokeWidth="4" />
        <line x1="72" y1="35" x2="58" y2="29" strokeWidth="4" />
        <circle cx="35" cy="43" r="4" fill="currentColor" stroke="none" />
        <circle cx="65" cy="43" r="4" fill="currentColor" stroke="none" />
        <path d="M 28,60 Q 38,52 50,60 T 72,60" strokeWidth="5" fill="none" />
      </svg>
    );
  }

  // 3. SATISFACCIÓN: Happy smile curve
  if (norm.includes("satisfa")) {
    return (
      <svg
        className={defaultClass}
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      >
        <circle cx="50" cy="50" r="42" strokeWidth="5" />
        <circle cx="35" cy="38" r="4" fill="currentColor" stroke="none" />
        <circle cx="65" cy="38" r="4" fill="currentColor" stroke="none" />
        <path d="M 28,56 Q 50,78 72,56" strokeWidth="5" fill="none" />
      </svg>
    );
  }

  // 4. NEUTRAL: Straight horizontal line mouth
  return (
    <svg
      className={defaultClass}
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
    >
      <circle cx="50" cy="50" r="42" strokeWidth="5" />
      <circle cx="35" cy="38" r="4" fill="currentColor" stroke="none" />
      <circle cx="65" cy="38" r="4" fill="currentColor" stroke="none" />
      <line x1="30" y1="60" x2="70" y2="60" strokeWidth="5" />
    </svg>
  );
};
