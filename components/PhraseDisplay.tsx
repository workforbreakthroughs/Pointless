
import React from 'react';

interface WordDisplayProps {
  word: string;
  guessedLetters: string[];
  revealAll?: boolean;
}

const WordDisplay: React.FC<WordDisplayProps> = ({ word, guessedLetters, revealAll = false }) => {
  const wordLength = word.length;
  
  const getResponsiveClasses = () => {
    if (wordLength <= 6) {
      return {
        container: "gap-2 sm:gap-3 lg:gap-4",
        box: "w-10 h-14 sm:w-16 sm:h-20 md:w-20 md:h-24 lg:w-24 lg:h-28 xl:w-28 xl:h-32",
        text: "text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl leading-none",
        rounded: "rounded-xl sm:rounded-2xl lg:rounded-3xl border-2 sm:border-4 lg:border-[5px]",
        underline: "bottom-1.5 sm:bottom-2.5 lg:bottom-4 w-1/3 h-1 sm:h-1.5 lg:h-2"
      };
    } else if (wordLength <= 9) {
      return {
        container: "gap-1.5 sm:gap-2.5 lg:gap-3",
        box: "w-7 sm:w-12 h-11 sm:h-16 md:w-14 md:h-20 lg:w-18 lg:h-24 xl:w-20 xl:h-26",
        text: "text-xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl leading-none",
        rounded: "rounded-lg sm:rounded-2xl lg:rounded-3xl border-2 sm:border-4 lg:border-[5px]",
        underline: "bottom-1 sm:bottom-2 lg:bottom-3 w-1/3 h-0.5 sm:h-1 lg:h-1.5"
      };
    } else {
      // 10 to 14 letters - auto-scale box & gap to keep strictly on 1 row on mobile screens
      return {
        container: "gap-1 sm:gap-1.5 md:gap-2 lg:gap-2.5 max-w-full flex-nowrap sm:flex-wrap overflow-x-auto sm:overflow-visible py-1 px-1",
        box: "w-5 sm:w-8 md:w-11 lg:w-13 xl:w-16 h-8 sm:h-12 md:h-16 lg:h-18 xl:h-22",
        text: "text-xs sm:text-lg md:text-2xl lg:text-3xl xl:text-4xl leading-none",
        rounded: "rounded-md sm:rounded-xl lg:rounded-2xl border sm:border-2 md:border-3 lg:border-4",
        underline: "bottom-0.5 sm:bottom-1.5 w-1/3 h-0.5 sm:h-1"
      };
    }
  };

  const sizes = getResponsiveClasses();

  return (
    <div className={`flex justify-center items-center ${sizes.container} max-w-full mx-auto px-1 py-1`}>
      {word.split('').map((char, charIndex) => {
        const isLetter = /[A-Z]/.test(char);
        const isRevealed = guessedLetters.includes(char) || revealAll || !isLetter;

        return (
          <div
            key={charIndex}
            className={`
              ${sizes.box} flex items-center justify-center 
              ${sizes.text} font-heading shrink-0 box-border overflow-hidden
              ${sizes.rounded}
              ${isRevealed && isLetter ? 'text-slate-900 glass-card border-white/90 shadow-md' : 'text-transparent glass-card border-white/60 shadow-xs'}
              ${!isLetter ? 'bg-transparent border-transparent text-slate-400' : ''}
              transition-all duration-300 transform hover:scale-105 relative select-none
            `}
          >
            {isRevealed ? char : ''}
            {!isRevealed && isLetter && (
              <div className={`absolute ${sizes.underline} bg-slate-200 rounded-full`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default WordDisplay;
