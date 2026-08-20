export const AudioWave = ({ isActive, color = 'indigo', variant = 'default' }) => {
  // Tailwind color mapping
  const colorStyles = {
    indigo: "bg-indigo-500",
    emerald: "bg-emerald-500",
    rose: "bg-rose-500",
    slate: "bg-slate-600"
  };

  const activeColor = colorStyles[color] || colorStyles.indigo;

  if (variant === 'background') {
    // 42 equalizer bars to span container width
    const barsCount = 42;
    const bars = Array.from({ length: barsCount });
    
    return (
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center gap-[5px] px-2 w-full pointer-events-none z-0 opacity-8 blur-[1.5px] h-36">
        {bars.map((_, i) => {
          // Height multiplier for bell curve distribution
          const distanceFromCenter = Math.abs(i - (barsCount - 1) / 2);
          const maxMultiplier = Math.max(1, 14 - distanceFromCenter * 0.62); 
          const delay = `${(i * 0.035).toFixed(3)}s`;
          
          return (
            <span 
              key={i} 
              className={`w-[4px] rounded-full transition-all duration-300 ${activeColor} ${
                isActive ? 'voice-wave-bar-bg' : 'h-1.5 opacity-40'
              }`}
              style={{ 
                animationDelay: isActive ? delay : '0s',
                animationDuration: '1.1s',
                maxHeight: `${maxMultiplier * 9}px`,
                height: isActive ? '100%' : '6px'
              }}
            ></span>
          );
        })}
      </div>
    );
  }

  // Default 8-bar audio equalizer behavior
  const bars = [1, 2, 3, 4, 5, 6, 7, 8];
  return (
    <div className="flex items-center gap-1 h-6 px-2">
      {bars.map((bar, i) => {
        const baseHeight = "h-1";
        const delays = ["0.1s", "0.3s", "0.5s", "0.2s", "0.4s", "0.6s", "0.15s", "0.35s"];
        
        return (
          <span 
            key={i} 
            className={`w-[3px] rounded-full transition-all duration-300 ${activeColor} ${
              isActive ? 'voice-wave-bar' : baseHeight
            }`}
            style={{ 
              animationDelay: isActive ? delays[i] : '0s',
              animationDuration: '0.8s'
            }}
          ></span>
        );
      })}
    </div>
  );
};
