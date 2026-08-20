import { Fragment, useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { useCall } from "../../../contexts/CallContext";

// Helper component to render Markdown formatted responses cleanly
const FormattedMarkdown = ({ content }) => {
  if (!content) return null;

  const blocks = content.split(/\n\s*\n/);

  return (
    <div className="space-y-2">
      {blocks.map((block, bIdx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        const lines = trimmed.split("\n");
        const isBulletList = lines.every(
          (l) => l.trim().startsWith("- ") || l.trim().startsWith("* ") || /^\d+[\.\)]/.test(l.trim())
        );

        if (isBulletList) {
          return (
            <ul key={bIdx} className="list-disc list-inside space-y-1 pl-1">
              {lines.map((line, lIdx) => {
                const cleanLine = line.replace(/^[-*\d.\)]+\s*/, "");
                return (
                  <li key={lIdx} className="text-xs text-slate-800 font-medium leading-relaxed">
                    {parseInlineMarkdown(cleanLine)}
                  </li>
                );
              })}
            </ul>
          );
        }

        return (
          <div key={bIdx} className="text-xs text-slate-800 font-medium leading-relaxed">
            {lines.map((line, lIdx) => (
              <Fragment key={lIdx}>
                {lIdx > 0 && <br />}
                {parseInlineMarkdown(line)}
              </Fragment>
            ))}
          </div>
        );
      })}
    </div>
  );
};

const parseInlineMarkdown = (text) => {
  if (!text) return "";
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={idx} className="italic text-slate-800">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={idx} className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[11px] text-slate-900 border border-slate-200/80">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
};

export const CopilotPanel = ({
  onAskCopilot: propOnAskCopilot,
  isCopilotResponding: propIsResponding,
}) => {
  const callContext = useCall();

  const copilotChat = callContext?.copilotChat || [];
  const onAskCopilot = propOnAskCopilot || callContext?.askCopilot;
  const isCopilotResponding = propIsResponding ?? callContext?.isCopilotResponding ?? false;

  const [queryText, setQueryText] = useState("");
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 50);
  };

  // Reliable Auto-scroll whenever messages change or AI is responding
  useEffect(() => {
    scrollToBottom();
  }, [copilotChat, isCopilotResponding]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!queryText.trim()) return;

    const userMessage = queryText.trim();
    if (onAskCopilot) {
      onAskCopilot(userMessage);
    }
    setQueryText("");
    scrollToBottom();
  };

  return (
    <div className="flex flex-col h-full select-none space-y-3.5 px-0 py-1">
      {/* Title Header */}
      <div className="mb-1">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Asistente IA Copilot
        </h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Copiloto en tiempo real, base de conocimiento y políticas de atención
        </p>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pr-0.5">
        {copilotChat.length === 0 ? (
          <span className="text-center text-xs text-slate-400 font-medium italic pt-8 block">
            Esperando consultas al Copiloto de IA o recomendaciones en vivo...
          </span>
        ) : (
          copilotChat.map((msg, index) => {
            const isOperator = msg.sender === "operator";
            return (
              <div key={index} className="space-y-1">
                <span
                  className={`text-[10px] font-bold text-slate-400 tracking-wider uppercase block ${
                    isOperator ? "text-right pr-1" : "pl-1"
                  }`}
                >
                  {isOperator ? "OPERADOR" : "COPILOTO IA"}
                </span>
                <div
                  className={`text-xs text-slate-800 font-medium leading-relaxed rounded-2xl p-4 ${
                    isOperator
                      ? "bg-slate-100/90 border border-slate-200/60"
                      : "bg-white border border-slate-200/80 shadow-sm"
                  }`}
                >
                  <FormattedMarkdown content={msg.text} />
                </div>
              </div>
            );
          })
        )}

        {/* Live Copilot Responding Status Indicator */}
        {isCopilotResponding && (
          <span className="text-center text-xs text-slate-700 font-semibold italic pt-2 block animate-pulse">
            Pensando...
          </span>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Floating Ask AI Assistant Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl p-3 px-4 border border-slate-200/80 shadow-sm flex items-center justify-between gap-3 shrink-0 mt-1"
      >
        <input
          type="text"
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          disabled={isCopilotResponding}
          placeholder="Consultar al Asistente IA (ej. manuales, políticas, historial de cliente o consejos)..."
          className="flex-1 bg-transparent border-none outline-none text-xs text-slate-900 placeholder-slate-400 font-medium truncate"
        />
        <button
          type="submit"
          disabled={!queryText.trim() || isCopilotResponding}
          className="p-1 text-slate-900 hover:text-slate-700 transition-colors disabled:opacity-30 cursor-pointer"
          title="Enviar mensaje"
        >
          <Send className="w-5 h-5 text-slate-900" />
        </button>
      </form>
    </div>
  );
};

