
import React from 'react';

interface WordDisplayProps {
  word?: string;
  phrase?: string;
  guessedLetters: string[];
  revealAll?: boolean;
  isLost?: boolean;
  compact?: boolean;
  isHellMode?: boolean;
  hellLetters?: string[];
  isHellError?: boolean;
}

const WordDisplay: React.FC<WordDisplayProps> = ({ 
  word, 
  phrase, 
  guessedLetters, 
  revealAll = false, 
  isLost = false, 
  compact = false,
  isHellMode = false,
  hellLetters = [],
  isHellError = false,
}) => {
  const targetWord = word || phrase || '';
  const shouldRevealAll = revealAll || isLost;
  const wordLength = targetWord.length;
  
  const getResponsiveClasses = () => {
    if (compact) {
      if (wordLength <= 6) {
        return {
          container: "gap-1.5 sm:gap-2",
          box: "w-9 h-12 sm:w-11 sm:h-14 md:w-12 md:h-15",
          text: "text-xl sm:text-2xl md:text-3xl leading-none",
          rounded: "rounded-lg sm:rounded-xl border-2",
          underline: "bottom-1 sm:bottom-1.5 w-1/3 h-0.5 sm:h-1"
        };
      } else if (wordLength <= 9) {
        return {
          container: "gap-1 sm:gap-1.5",
          box: "w-8 h-10 sm:w-9.5 sm:h-12 md:w-10.5 md:h-13",
          text: "text-lg sm:text-xl md:text-2xl leading-none",
          rounded: "rounded-lg sm:rounded-xl border-2",
          underline: "bottom-1 w-1/3 h-0.5"
        };
      } else if (wordLength <= 11) {
        return {
          container: "gap-0.5 sm:gap-1 flex-nowrap sm:flex-wrap overflow-x-auto py-0.5 px-0.5",
          box: "w-7 h-9 sm:w-8.5 sm:h-11 md:w-9.5 md:h-12",
          text: "text-base sm:text-lg md:text-xl leading-none",
          rounded: "rounded-md sm:rounded-lg border-2",
          underline: "bottom-0.5 w-1/3 h-0.5"
        };
      } else {
        return {
          container: "gap-0.5 sm:gap-1 flex-nowrap sm:flex-wrap overflow-x-auto py-0.5 px-0.5",
          box: "w-6 h-8 sm:w-7.5 sm:h-10 md:w-8.5 md:h-[40px]",
          text: "text-sm sm:text-base md:text-lg leading-none font-bold",
          rounded: "rounded-md border",
          underline: "bottom-0.5 w-1/3 h-0.5"
        };
      }
    }
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
    } else if (wordLength === 12) {
      // 12 letters - intermediate size between 11-letter (28px / 44px) and 13-14 letter (24px / 38px) words
      return {
        container: "gap-[2px] xs:gap-[3px] sm:gap-1.5 md:gap-2 lg:gap-2.5 max-w-full flex-nowrap sm:flex-wrap overflow-x-auto sm:overflow-visible py-1 px-0.5",
        box: "w-[26px] h-[41px] xs:w-[28px] xs:h-[44px] sm:w-9 sm:h-13 md:w-11 md:h-15 lg:w-13 lg:h-17 xl:w-15 xl:h-20",
        text: "text-[15px] xs:text-base sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl leading-none font-bold",
        rounded: "rounded-md sm:rounded-xl border sm:border-2 lg:border-3",
        underline: "bottom-[2px] sm:bottom-1 w-1/3 h-0.5 sm:h-1"
      };
    } else {
      // 13-14 letters - 24px by 38px box on mobile portrait
      return {
        container: "gap-[2px] xs:gap-[3px] sm:gap-1.5 md:gap-2 lg:gap-2.5 max-w-full flex-nowrap sm:flex-wrap overflow-x-auto sm:overflow-visible py-1 px-0.5",
        box: "w-[24px] h-[38px] xs:w-[27px] xs:h-[42px] sm:w-9 sm:h-13 md:w-11 md:h-15 lg:w-13 lg:h-17 xl:w-15 xl:h-20",
        text: "text-sm xs:text-base sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl leading-none font-bold",
        rounded: "rounded-md sm:rounded-xl border sm:border-2 lg:border-3",
        underline: "bottom-[2px] sm:bottom-1 w-1/3 h-0.5 sm:h-1"
      };
    }
  };

  const sizes = getResponsiveClasses();

  return (
    <div className={`flex justify-center items-center ${sizes.container} max-w-full mx-auto px-1 py-1 ${isHellError ? 'animate-shake' : ''}`}>
      {targetWord.split('').map((char, charIndex) => {
        const isLetter = /[A-Z]/.test(char);

        if (isHellMode && !shouldRevealAll) {
          const typedChar = hellLetters[charIndex] || '';
          const isFilled = Boolean(typedChar);
          const isCurrentActiveBox = charIndex === hellLetters.length;

          return (
            <div
              key={charIndex}
              className={`
                ${sizes.box} flex items-center justify-center 
                ${sizes.text} font-heading shrink-0 box-border overflow-hidden
                ${sizes.rounded}
                ${isHellError 
                  ? 'bg-red-500/20 border-red-500 text-red-500 shadow-md font-black' 
                  : isFilled 
                  ? 'text-slate-900 dark:text-white glass-card border-slate-400 dark:border-slate-500 shadow-md font-black' 
                  : isCurrentActiveBox 
                  ? 'text-transparent glass-card border-red-400/80 dark:border-red-500/80 shadow-xs ring-2 ring-red-400/40 animate-pulse' 
                  : 'text-transparent glass-card border-white/60 dark:border-slate-800/60 shadow-xs'}
                ${!isLetter ? 'bg-transparent border-transparent text-slate-400 dark:text-slate-500' : ''}
                transition-all duration-150 transform relative select-none
              `}
            >
              {typedChar}
              {!isFilled && isLetter && (
                <div className={`absolute ${sizes.underline} ${isCurrentActiveBox ? 'bg-red-500 dark:bg-red-400' : 'bg-slate-400/60 dark:bg-slate-600/60'} shadow-xs rounded-full`} />
              )}
            </div>
          );
        }

        const isGuessedByPlayer = guessedLetters.includes(char);
        const isRevealed = isGuessedByPlayer || shouldRevealAll || !isLetter;

        // Determine font color for revealed letters
        let textColor = 'text-transparent';
        if (isRevealed && isLetter) {
          if (isGuessedByPlayer) {
            textColor = 'text-emerald-600 dark:text-emerald-400 font-black';
          } else if (shouldRevealAll) {
            textColor = 'text-red-500 dark:text-red-400 font-black'; // Missed letters when game is lost
          } else {
            textColor = 'text-slate-900 dark:text-slate-100';
          }
        }

        return (
          <div
            key={charIndex}
            className={`
              ${sizes.box} flex items-center justify-center 
              ${sizes.text} font-heading shrink-0 box-border overflow-hidden
              ${sizes.rounded}
              ${isRevealed && isLetter ? `${textColor} glass-card border-white/90 dark:border-slate-700/80 shadow-md` : 'text-transparent glass-card border-white/60 dark:border-slate-800/60 shadow-xs'}
              ${!isLetter ? 'bg-transparent border-transparent text-slate-400 dark:text-slate-500' : ''}
              transition-all duration-300 transform hover:scale-105 relative select-none
            `}
          >
            {isRevealed ? char : ''}
            {!isRevealed && isLetter && (
              <div className={`absolute ${sizes.underline} bg-emerald-500 dark:bg-emerald-400 shadow-xs rounded-full`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default WordDisplay;
