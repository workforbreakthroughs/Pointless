
import React from 'react';

interface KeyboardProps {
  guessedLetters: string[];
  removedLetters: string[];
  onGuess: (letter: string) => void;
  disabled: boolean;
}

const Keyboard: React.FC<KeyboardProps> = ({ guessedLetters, removedLetters, onGuess, disabled }) => {
  const rows = [
    'QWERTYUIOP'.split(''),
    'ASDFGHJKL'.split(''),
    'ZXCVBNM'.split('')
  ];

  return (
    <div className="flex flex-col gap-1.5 sm:gap-2 lg:gap-3 w-full max-w-4xl mx-auto px-1 sm:px-2">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-1 sm:gap-1.5 md:gap-2">
          {row.map((letter) => {
            const isGuessed = guessedLetters.includes(letter);
            const isRemoved = removedLetters.includes(letter);
            
            return (
              <button
                key={letter}
                onClick={() => onGuess(letter)}
                disabled={disabled || isGuessed || isRemoved}
                className={`
                  h-11 sm:h-12 md:h-14 lg:h-16 flex-1 min-w-0 max-w-[36px] sm:max-w-[48px] md:max-w-[56px] lg:max-w-[64px] flex items-center justify-center rounded-lg sm:rounded-xl lg:rounded-2xl font-bold text-sm sm:text-base md:text-xl lg:text-2xl transition-all duration-150 select-none
                  ${isGuessed 
                    ? 'bg-slate-100 text-slate-300 opacity-50 border-b-0' 
                    : isRemoved
                    ? 'bg-red-50 text-red-200 opacity-20 border-b-0'
                    : 'bg-white text-emerald-800 shadow-md border-b-2 sm:border-b-4 border-emerald-300 hover:bg-emerald-50 active:border-b-0 active:translate-y-0.5'
                  }
                `}
              >
                {isRemoved ? '✕' : letter}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default Keyboard;
