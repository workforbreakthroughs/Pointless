
import React, { useEffect, useState } from 'react';

interface PencilVisualProps {
  mistakes: number;
  maxMistakes: number;
  status: 'IDLE' | 'LOADING' | 'PLAYING' | 'WON' | 'LOST';
  isWrongGuess?: boolean;
}

const PencilVisual: React.FC<PencilVisualProps> = ({ mistakes, maxMistakes, status, isWrongGuess }) => {
  const progress = mistakes / maxMistakes;
  const isSharpening = status === 'LOADING' || status === 'LOST';
  
  const maxHeight = 80; 
  const currentHeight = isSharpening ? Math.max(24, maxHeight * 0.4) : Math.max(24, maxHeight * (1 - progress));
  const [impact, setImpact] = useState(false);

  useEffect(() => {
    if (isWrongGuess) {
      setImpact(true);
      const timer = setTimeout(() => setImpact(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isWrongGuess]);

  const getMood = () => {
    if (status === 'LOADING') return { face: '(>.<)', text: 'Zzzrt...' };
    if (status === 'WON') return { face: '(⌐■_■)', text: 'Sharp!' };
    if (status === 'LOST') return { face: '(x_x)', text: 'Snapped' };
    if (impact) return { face: '(>_<)', text: 'OUCH!' };
    if (progress > 0.8) return { face: '(╥﹏╥)', text: 'Help!' };
    return { face: '(•‿•)', text: "Write!" };
  };

  const mood = getMood();
  const remainingChances = maxMistakes - mistakes;

  const getBadgeStyle = () => {
    if (remainingChances <= 1) {
      return 'bg-red-500 text-white animate-pulse border border-red-400 shadow-sm';
    }
    if (remainingChances === 2) {
      return 'bg-amber-400 text-slate-950 font-black border border-amber-300 shadow-sm';
    }
    return 'bg-emerald-500 text-white border border-emerald-400 shadow-sm';
  };

  return (
    <div className={`relative w-full h-full min-h-[90px] sm:min-h-[110px] flex flex-col items-center justify-end overflow-hidden rounded-xl lg:rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 shadow-inner transition-colors duration-300 ${impact || isSharpening ? 'bg-red-50 dark:bg-red-950/40' : ''}`}>
      {/* Background - Blueprints vibe */}
      <div className="absolute inset-0 opacity-5 dark:opacity-10" style={{ 
        backgroundImage: 'linear-gradient(#0ea5e9 1px, transparent 1px), linear-gradient(90deg, #0ea5e9 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }} />

      {/* The Sharpener 3000 (Bottom) */}
      <div className="absolute bottom-0 w-full h-6 sm:h-8 bg-slate-700 dark:bg-slate-800 z-20 flex items-center justify-center border-t border-slate-800 dark:border-slate-950">
        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-900 border border-slate-600 shadow-inner flex items-center justify-center">
           <div className={`w-3 h-1 bg-slate-400 rounded-full ${(mistakes > 0 || isSharpening) ? 'animate-spin' : ''}`} style={{ animationDuration: '0.2s' }} />
        </div>
      </div>

      {/* Graphite the Pencil */}
      <div 
        className={`relative z-10 flex flex-col items-center transition-all duration-700 ease-in-out 
          ${impact ? 'animate-bounce' : ''} 
          ${isSharpening ? 'animate-sharpen-down' : ''}
        `}
        style={{ height: `${currentHeight}px`, marginBottom: '6px' }}
      >
        <div className="w-4 sm:w-6 h-2 sm:h-3 bg-pink-400 rounded-t border-x border-t border-pink-600" />
        <div className="w-4 sm:w-6 h-1 bg-slate-300 border-x border-slate-400" />
        <div className="w-4 sm:w-6 flex-grow bg-yellow-400 border-x border-yellow-600 relative flex items-center justify-center">
           <div className="text-[8px] sm:text-[10px] font-black text-slate-800 rotate-90 select-none">
              {mood.face}
           </div>
        </div>
        <div 
          className="w-4 sm:w-6 h-3 sm:h-4 bg-amber-100 relative" 
          style={{ clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)' }}
        >
           <div 
             className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-slate-800"
             style={{ clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)' }}
           />
        </div>
      </div>

      <div className="absolute top-1.5 left-1.5 bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded-md text-[9px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 z-30 shadow-xs">
         {mood.text}
      </div>

      {!isSharpening && (
        <div className={`absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full text-[9px] sm:text-xs font-extrabold z-30 transition-all duration-300 ${getBadgeStyle()}`}>
          {Math.round((1 - progress) * 100)}%
        </div>
      )}
    </div>
  );
};

export default PencilVisual;