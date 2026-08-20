/**
 * Centralized formatting and utility helpers for Emotion AI Frontend
 */

/**
 * Formats total seconds into HH:MM:SS string
 * @param {number} totalSec 
 * @returns {string} HH:MM:SS
 */
export const formatTime = (totalSec = 0) => {
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = Math.floor(totalSec % 60);
  return `${hrs.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

/**
 * Normalizes an emotion string into one of the 4 canonical Spanish groups
 * @param {string} emo 
 * @returns {"FRUSTRACIÓN" | "ANSIEDAD" | "SATISFACCIÓN" | "NEUTRAL"}
 */
export const formatEmotionName = (emo) => {
  const norm = (emo || "").toLowerCase();
  if (
    norm.includes("frustra") ||
    norm.includes("enojo") ||
    norm.includes("ira") ||
    norm.includes("agresiv") ||
    norm.includes("anger") ||
    norm.includes("dissatis") ||
    norm.includes("insatis") ||
    norm.includes("decep")
  ) {
    return "FRUSTRACIÓN";
  }
  if (
    norm.includes("ansied") ||
    norm.includes("anxiet") ||
    norm.includes("duda") ||
    norm.includes("doubt") ||
    norm.includes("confus") ||
    norm.includes("incerti") ||
    norm.includes("uncert") ||
    norm.includes("escepti") ||
    norm.includes("urgen")
  ) {
    return "ANSIEDAD";
  }
  if (
    norm.includes("satisfa") ||
    norm.includes("alivi") ||
    norm.includes("relie") ||
    norm.includes("alegr") ||
    norm.includes("grati") ||
    norm.includes("joy") ||
    norm.includes("happi") ||
    norm.includes("felic")
  ) {
    return "SATISFACCIÓN";
  }
  return "NEUTRAL";
};

/**
 * Returns Tailwind text color class for an emotion name
 * @param {string} emoName 
 * @returns {string} Tailwind text color class
 */
export const getEmotionTextColor = (emoName) => {
  const norm = formatEmotionName(emoName).toLowerCase();
  if (norm.includes("frustra")) return "text-rose-600";
  if (norm.includes("ansied")) return "text-amber-600";
  if (norm.includes("satisfa")) return "text-emerald-600";
  return "text-blue-600";
};

/**
 * Returns complete color styling object { text, stroke, fill } for SVG and badges
 * @param {string} emoName 
 * @returns {{ text: string, stroke: string, fill: string }}
 */
export const getEmotionColor = (emoName) => {
  const norm = formatEmotionName(emoName).toLowerCase();
  if (norm.includes("frustra")) {
    return {
      text: "text-rose-600",
      stroke: "stroke-rose-500",
      fill: "#EF4444",
    };
  }
  if (norm.includes("ansied")) {
    return {
      text: "text-amber-600",
      stroke: "stroke-amber-500",
      fill: "#F59E0B",
    };
  }
  if (norm.includes("satisfa")) {
    return {
      text: "text-emerald-600",
      stroke: "stroke-emerald-500",
      fill: "#10B981",
    };
  }
  return {
    text: "text-blue-600",
    stroke: "stroke-blue-500",
    fill: "#3B82F6",
  };
};
