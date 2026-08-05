
import React from 'react';

interface WordDisplayProps {
  word: string;
  guessedLetters: string[];
  revealAll?: boolean;
}

const WordDisplay: React.FC<WordDisplayProps> = ({ word, guessedLetters, revealAll = false }) => {
  const wordLength = word.length;
  
  const getResponsiveSizeClasses = () => {
    if (wordLength <= 6) {
      return {
        box: "w-10 h-14 sm:w-16 sm:h-20 md:w-20 md:h-24 lg:w-24 lg:h-30 xl:w-28 xl:h-34",
        text: "text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl leading-none"
      };
    } else if (wordLength <= 9) {
      return {
        box: "w-8 h-12 sm:w-12 sm:h-16 md:w-14 md:h-20 lg:w-18 lg:h-24 xl:w-20 xl:h-28",
        text: "text-xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl leading-none"
      };
    } else {
      return {
        box: "w-7 h-10 sm:w-10 sm:h-14 md:w-12 md:h-16 lg:w-14 lg:h-18 xl:w-16 xl:h-22",
        text: "text-lg sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl leading-none"
      };
    }
  };

  const sizes = getResponsiveSizeClasses();

  return (
    <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2.5 md:gap-3 lg:gap-4 max-w-full mx-auto px-2 py-1 items-center">
      {word.split('').map((char, charIndex) => {
        const isLetter = /[A-Z]/.test(char);
        const isRevealed = guessedLetters.includes(char) || revealAll || !isLetter;

        return (
          <div
            key={charIndex}
            className={`
              ${sizes.box} flex items-center justify-center 
              ${sizes.text} font-heading shrink-0 box-border overflow-hidden
              rounded-xl sm:rounded-2xl lg:rounded-3xl border-2 sm:border-4 lg:border-[5px]
              ${isRevealed && isLetter ? 'text-emerald-800 bg-emerald-50 border-emerald-300 shadow-md' : 'text-transparent bg-white border-slate-200 shadow-sm'}
              ${!isLetter ? 'bg-transparent border-transparent text-slate-400' : ''}
              transition-all duration-300 transform hover:scale-105 relative select-none
            `}
          >
            {isRevealed ? char : ''}
            {!isRevealed && isLetter && (
              <div className="absolute bottom-1.5 sm:bottom-2.5 lg:bottom-4 w-1/3 h-1 sm:h-1.5 lg:h-2 bg-slate-200 rounded-full" />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default WordDisplay;
