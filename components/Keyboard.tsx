
import React from 'react';
import { soundService } from '../services/soundService';

interface KeyboardProps {
  guessedLetters: string[];
  removedLetters?: string[];
  onGuess: (letter: string) => void;
  disabled: boolean;
  isHellMode?: boolean;
  onBackspace?: () => void;
  canBackspace?: boolean;
}

const Keyboard: React.FC<KeyboardProps> = ({ 
  guessedLetters, 
  removedLetters = [], 
  onGuess, 
  disabled,
  isHellMode = false,
  onBackspace,
  canBackspace = false,
}) => {
  const rows = [
    'QWERTYUIOP'.split(''),
    'ASDFGHJKL'.split(''),
    'ZXCVBNM'.split('')
  ];

  const handleKeyClick = (letter: string) => {
    soundService.playTap();
    onGuess(letter);
  };

  const handleBackspaceClick = () => {
    if (onBackspace && canBackspace) {
      soundService.playTap();
      onBackspace();
    }
  };

  return (
    <div className="flex flex-col gap-1.5 sm:gap-2 lg:gap-3 w-full max-w-4xl mx-auto px-1 sm:px-2">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-1 sm:gap-1.5 md:gap-2">
          {row.map((letter) => {
            const isGuessed = !isHellMode && guessedLetters.includes(letter);
            const isRemoved = removedLetters.includes(letter);
            
            return (
              <button
                key={letter}
                onClick={() => handleKeyClick(letter)}
                disabled={disabled || isGuessed || isRemoved}
                className={`
                  h-10 sm:h-11 md:h-12 lg:h-13 flex-1 min-w-0 max-w-[34px] sm:max-w-[44px] md:max-w-[52px] lg:max-w-[58px] flex items-center justify-center rounded-xl sm:rounded-2xl font-bold text-xs sm:text-base md:text-lg lg:text-xl transition-all duration-150 select-none
                  ${isGuessed 
                    ? 'bg-slate-200/50 dark:bg-slate-800/40 text-slate-300 dark:text-slate-600 opacity-40 border border-slate-200/40 dark:border-slate-800/40' 
                    : isRemoved
                    ? 'bg-red-100/30 dark:bg-red-950/20 text-red-300 dark:text-red-900 opacity-20 border border-red-200/30 dark:border-red-900/30'
                    : 'glass-button text-slate-900 dark:text-slate-100 font-black shadow-sm hover:brightness-105 active:scale-90 active:bg-slate-200/80 dark:active:bg-slate-800'
                  }
                `}
              >
                {isRemoved ? '✕' : letter}
              </button>
            );
          })}
          {isHellMode && rowIndex === 2 && (
            <button
              onClick={handleBackspaceClick}
              disabled={disabled || !canBackspace}
              className={`
                h-10 sm:h-11 md:h-12 lg:h-13 px-2 sm:px-3 flex items-center justify-center rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm md:text-base transition-all duration-150 select-none
                ${canBackspace 
                  ? 'glass-button text-slate-900 dark:text-slate-100 font-black shadow-sm hover:brightness-105 active:scale-90' 
                  : 'bg-slate-200/50 dark:bg-slate-800/40 text-slate-300 dark:text-slate-600 opacity-40 border border-slate-200/40 dark:border-slate-800/40'}
              `}
              title="Delete letter"
              aria-label="Backspace"
            >
              ⌫
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default Keyboard;
