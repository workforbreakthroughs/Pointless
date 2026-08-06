
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
        box: "w-8 h-12 sm:w-12 sm:h-16 md:w-14 md:h-20 lg:w-18 lg:h-24 xl:w-20 xl:h-26",
        text: "text-xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl leading-none",
        rounded: "rounded-xl sm:rounded-2xl lg:rounded-3xl border-2 sm:border-4 lg:border-[5px]",
        underline: "bottom-1 sm:bottom-2 lg:bottom-3 w-1/3 h-0.5 sm:h-1 lg:h-1.5"
      };
    } else if (wordLength <= 11) {
      return {
        container: "gap-1 sm:gap-1.5 md:gap-2 lg:gap-2.5 max-w-full flex-nowrap sm:flex-wrap overflow-x-auto sm:overflow-visible py-1 px-1",
        box: "w-7 h-11 sm:w-10 sm:h-14 md:w-12 md:h-16 lg:w-14 lg:h-18 xl:w-16 xl:h-22",
        text: "text-base sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl leading-none",
        rounded: "rounded-lg sm:rounded-xl lg:rounded-2xl border-2 sm:border-3 lg:border-4",
        underline: "bottom-1 sm:bottom-1.5 w-1/3 h-0.5 sm:h-1"
      };
    } else if (wordLength <= 14) {
      // 12-14 letters - scaled down for mobile portrait view so all letters fit without scrolling
      return {
        container: "gap-[2px] sm:gap-1.5 md:gap-2 lg:gap-2.5 max-w-full flex-nowrap sm:flex-wrap overflow-x-auto sm:overflow-visible py-1 px-0.5",
        box: "w-[20px] h-[32px] xs:w-[22px] xs:h-[35px] sm:w-9 sm:h-13 md:w-11 md:h-15 lg:w-13 lg:h-17 xl:w-15 xl:h-20",
        text: "text-xs sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl leading-none font-bold",
        rounded: "rounded border sm:border-2 lg:border-3",
        underline: "bottom-0.5 sm:bottom-1 w-1/3 h-0.5 sm:h-1"
      };
    } else {
      // 15+ letters
      return {
        container: "gap-[1.5px] sm:gap-1 md:gap-2 lg:gap-2.5 max-w-full flex-nowrap sm:flex-wrap overflow-x-auto sm:overflow-visible py-1 px-0.5",
        box: "w-[17px] h-[28px] xs:w-[19px] xs:h-[30px] sm:w-8 sm:h-12 md:w-10 md:h-14 lg:w-12 lg:h-16 xl:w-14 xl:h-18",
        text: "text-[10px] xs:text-[11px] sm:text-lg md:text-xl lg:text-2xl xl:text-3xl leading-none font-bold",
        rounded: "rounded-[3px] border sm:border-2 lg:border-3",
        underline: "bottom-0.5 sm:bottom-1 w-1/3 h-[1px]"
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
