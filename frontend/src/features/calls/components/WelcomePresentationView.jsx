import { useState, useEffect } from "react";
import { Play } from "lucide-react";
import { FaceIcon } from "../../../components/common/FaceIcon";

export const WelcomePresentationView = ({ onStartDemo }) => {
  const [activeIdx, setActiveIdx] = useState(0);

  const emotionsList = [
    {
      key: "ansiedad",
      label: "Confusión e Incertidumbre",
      underlineColor: "border-amber-400",
    },
    {
      key: "frustracion",
      label: "Frustración y Descontento",
      underlineColor: "border-rose-500",
    },
    {
      key: "satisfaccion",
      label: "Satisfacción y Alegría",
      underlineColor: "border-emerald-500",
    },
    {
      key: "neutral",
      label: "Estabilidad y Neutralidad",
      underlineColor: "border-blue-500",
    },
  ];

  // Auto-cycle emotion slide states every 2.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % emotionsList.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const currentItem = emotionsList[activeIdx];

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#0B0F17] z-50 flex flex-col items-center justify-center p-6 sm:p-12 md:p-16 select-none overflow-hidden animate-view-fade">
      
      {/* Google Slides Presentation Stage (Matching simulation dark background #0B0F17) */}
      <div className="w-full flex-1 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 my-auto max-w-6xl">
        
        {/* Interactive Dynamic Face Icon (Acts as the Start Demo Trigger on Hover/Click) */}
        <div
          onClick={onStartDemo}
          className="relative group cursor-pointer shrink-0 select-none flex flex-col items-center gap-3"
          title="Haz clic para comenzar la simulación de la llamada"
        >
          <div className="relative flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
            {/* SVG Line-Art Face Icon */}
            <div
              key={`face-${activeIdx}`}
              className="transition-all duration-300 group-hover:opacity-25 group-hover:scale-95"
            >
              <FaceIcon emotion={currentItem.key} className="w-40 h-40 sm:w-52 sm:h-52 md:w-64 md:h-64 text-slate-100 shrink-0" />
            </div>

            {/* Hover Play Button Overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-100 flex items-center justify-center text-slate-900 shadow-2xl shadow-white/10 group-hover:scale-110 transition-transform duration-300">
                <Play className="w-10 h-10 sm:w-12 sm:h-12 fill-current text-slate-900 ml-1" />
              </div>
            </div>
          </div>

          {/* Clean Hint Text underneath the Face */}
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-100 transition-colors pt-1">
            Haz clic para comenzar demo
          </span>
        </div>

        {/* Title & Subtitle Stack */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-3">
          <h1 className="text-6xl sm:text-7xl md:text-9xl font-extrabold text-slate-100 tracking-tight font-sans">
            EmotionAI
          </h1>

          {/* Subtitle with Hand-drawn Underline Bar matching ref.png */}
          <div key={`text-${activeIdx}`} className="animate-view-fade flex flex-col items-center md:items-start space-y-2">
            <p className="text-lg sm:text-xl md:text-2xl font-medium text-slate-300 tracking-tight font-sans">
              Analítica emocional en tiempo real:{" "}
              <span className="font-semibold text-slate-100">{currentItem.label}</span>
            </p>
            {/* Colored Accent Underline */}
            <div className={`w-52 sm:w-72 md:w-96 h-1.5 rounded-full border-b-4 ${currentItem.underlineColor} transition-all duration-500`} />
          </div>
        </div>
      </div>
    </div>
  );
};
