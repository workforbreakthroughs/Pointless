import React, { useState, useEffect } from 'react';
import { 
  DuelRecord, 
  DuelWordResult, 
  calculateWordScore, 
  submitDuelResult, 
  PlayerDuelStats 
} from '../services/duelService';
import { getFlagEmoji, getOrCreatePlayerId } from '../services/firebaseService';
import PhraseDisplay from './PhraseDisplay';
import Keyboard from './Keyboard';
import PencilVisual from './KangarooVisual';

interface DuelGameScreenProps {
  duel: DuelRecord;
  playerStats: PlayerDuelStats;
  onComplete: (updatedDuel: DuelRecord) => void;
  onExit: () => void;
}

const DuelGameScreen: React.FC<DuelGameScreenProps> = ({
  duel,
  playerStats,
  onComplete,
  onExit
}) => {
  const localPlayerId = getOrCreatePlayerId();
  const isPlayerA = duel.playerAId === localPlayerId;

  const myHandle = isPlayerA ? duel.playerAHandle : duel.playerBHandle || playerStats.playerName;
  const myCountry = isPlayerA ? duel.playerACountry : duel.playerBCountry || playerStats.countryCode;
  const myRating = isPlayerA ? duel.playerARating : duel.playerBRating || playerStats.rating;

  const opponentHandle = isPlayerA ? duel.playerBHandle : duel.playerAHandle;
  const opponentCountry = isPlayerA ? duel.playerBCountry : duel.playerACountry;
  const opponentRating = isPlayerA ? duel.playerBRating : duel.playerARating;
  const opponentResult = isPlayerA ? duel.playerBResult : duel.playerAResult;

  // Game Progress State
  const [currentWordIdx, setCurrentWordIdx] = useState<number>(0);
  const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState<number>(0);
  const [removedLetters, setRemovedLetters] = useState<string[]>([]);
  const [extraClueShown, setExtraClueShown] = useState<boolean>(false);
  const [hintsUsed, setHintsUsed] = useState<{
    revealLetter: boolean;
    extraHint: boolean;
    removeWrong: boolean;
  }>({ revealLetter: false, extraHint: false, removeWrong: false });

  const [wordStartTime, setWordStartTime] = useState<number>(Date.now());
  const [wordResults, setWordResults] = useState<DuelWordResult[]>([]);
  const [wordStatus, setWordStatus] = useState<'PLAYING' | 'WON' | 'LOST'>('PLAYING');
  const [isWrongGuess, setIsWrongGuess] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const currentWordObj = duel.words[currentWordIdx];
  const targetWord = currentWordObj ? currentWordObj.word.toUpperCase() : '';

  // Calculate local player score so far
  const totalScoreSoFar = wordResults.reduce((sum, r) => sum + r.score, 0);

  // Opponent status for current word
  const opponentCurrentWordResult = opponentResult?.wordResults?.[currentWordIdx];
  const opponentMistakes = opponentCurrentWordResult ? opponentCurrentWordResult.mistakes : 0;
  const opponentScoreSoFar = opponentResult?.wordResults
    ?.slice(0, currentWordIdx + (wordStatus !== 'PLAYING' ? 1 : 0))
    .reduce((sum, r) => sum + r.score, 0) || 0;

  // Reset state on word change
  useEffect(() => {
    setGuessedLetters([]);
    setMistakes(0);
    setRemovedLetters([]);
    setExtraClueShown(false);
    setHintsUsed({ revealLetter: false, extraHint: false, removeWrong: false });
    setWordStartTime(Date.now());
    setWordStatus('PLAYING');
  }, [currentWordIdx]);

  // Handle Letter Guess
  const handleGuess = (letter: string) => {
    if (wordStatus !== 'PLAYING' || isSubmitting) return;

    const uppercaseLetter = letter.toUpperCase();
    if (guessedLetters.includes(uppercaseLetter)) return;

    const newGuessed = [...guessedLetters, uppercaseLetter];
    setGuessedLetters(newGuessed);

    if (targetWord.includes(uppercaseLetter)) {
      // Check if word solved
      const uniqueLettersInWord = Array.from(new Set(targetWord.split('').filter(c => /[A-Z]/.test(c))));
      const isSolved = uniqueLettersInWord.every(l => newGuessed.includes(l));

      if (isSolved) {
        const timeSpent = Math.max(1, Math.round((Date.now() - wordStartTime) / 1000));
        const score = calculateWordScore(true, mistakes, timeSpent, hintsUsed);
        
        const newResult: DuelWordResult = {
          word: targetWord,
          category: currentWordObj?.category || 'Vocabulary',
          clue: currentWordObj?.clue || '',
          solved: true,
          mistakes,
          timeSeconds: timeSpent,
          hintsUsed,
          score
        };

        const updatedResults = [...wordResults, newResult];
        setWordResults(updatedResults);
        setWordStatus('WON');

        if (currentWordIdx >= 4) {
          finishDuel(updatedResults);
        }
      }
    } else {
      // Wrong guess
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      setIsWrongGuess(true);
      setTimeout(() => setIsWrongGuess(false), 500);

      if (newMistakes >= 7) {
        const timeSpent = Math.max(1, Math.round((Date.now() - wordStartTime) / 1000));
        const score = 0; // Failed word

        const newResult: DuelWordResult = {
          word: targetWord,
          category: currentWordObj?.category || 'Vocabulary',
          clue: currentWordObj?.clue || '',
          solved: false,
          mistakes: 7,
          timeSeconds: timeSpent,
          hintsUsed,
          score
        };

        const updatedResults = [...wordResults, newResult];
        setWordResults(updatedResults);
        setWordStatus('LOST');

        if (currentWordIdx >= 4) {
          finishDuel(updatedResults);
        }
      }
    }
  };

  // Finish 5-word duel submission
  const finishDuel = async (finalResults: DuelWordResult[]) => {
    setIsSubmitting(true);
    const updated = await submitDuelResult(duel.id, finalResults);
    setIsSubmitting(false);
    if (updated) {
      onComplete(updated);
    }
  };

  // Advance to next word
  const handleNextWord = () => {
    if (currentWordIdx < 4) {
      setCurrentWordIdx(prev => prev + 1);
    }
  };

  // Power Hints
  const handleRevealLetter = () => {
    if (wordStatus !== 'PLAYING' || hintsUsed.revealLetter) return;
    const unrevealed = targetWord.split('').filter(c => /[A-Z]/.test(c) && !guessedLetters.includes(c));
    if (unrevealed.length > 0) {
      const pick = unrevealed[Math.floor(Math.random() * unrevealed.length)];
      setHintsUsed(prev => ({ ...prev, revealLetter: true }));
      handleGuess(pick);
    }
  };

  const handleExtraHint = () => {
    if (wordStatus !== 'PLAYING' || hintsUsed.extraHint) return;
    setExtraClueShown(true);
    setHintsUsed(prev => ({ ...prev, extraHint: true }));
  };

  const handleRemoveWrong = () => {
    if (wordStatus !== 'PLAYING' || hintsUsed.removeWrong) return;
    const allAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const wrongAlphabet = allAlphabet.filter(c => !targetWord.includes(c) && !guessedLetters.includes(c));
    // Pick 3 wrong letters to remove
    const shuffled = wrongAlphabet.sort(() => Math.random() - 0.5).slice(0, 3);
    setRemovedLetters(prev => [...prev, ...shuffled]);
    setHintsUsed(prev => ({ ...prev, removeWrong: true }));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-50 border-2 border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden my-auto max-h-[95vh]">
        
        {/* Top Header: VS Battle Visual */}
        <div className="bg-slate-900 text-white p-3 sm:p-4 border-b-2 border-slate-800 shrink-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xl">🥊</span>
              <span className="text-xs sm:text-sm font-black tracking-widest uppercase text-amber-400">POINTLESS DUEL</span>
            </div>
            <div className="text-xs font-black bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full border border-amber-500/30 tracking-wider uppercase">
              ROUND {currentWordIdx + 1} / 5
            </div>
            <button
              onClick={onExit}
              className="text-slate-400 hover:text-white font-black text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-xl transition-all"
            >
              ✕ Exit
            </button>
          </div>

          {/* Side by side Player vs Opponent */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4 bg-slate-800/80 rounded-2xl p-2.5 border border-slate-700/80">
            {/* Local Player */}
            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 truncate">
                  <span className="text-base">{getFlagEmoji(myCountry)}</span>
                  <span className="text-xs font-black text-emerald-400 truncate">{myHandle}</span>
                </div>
                <span className="text-[10px] font-mono text-amber-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                  {myRating}
                </span>
              </div>
              <div className="h-16 sm:h-20">
                <PencilVisual
                  mistakes={mistakes}
                  maxMistakes={7}
                  status={wordStatus}
                  isWrongGuess={isWrongGuess}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] font-black text-slate-300 px-1">
                <span>SCORE:</span>
                <span className="text-emerald-400 font-mono text-xs">{totalScoreSoFar} pts</span>
              </div>
            </div>

            {/* Opponent */}
            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 truncate">
                  <span className="text-base">{getFlagEmoji(opponentCountry)}</span>
                  <span className="text-xs font-black text-rose-400 truncate">{opponentHandle}</span>
                </div>
                <span className="text-[10px] font-mono text-amber-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                  {opponentRating}
                </span>
              </div>
              <div className="h-16 sm:h-20">
                <PencilVisual
                  mistakes={opponentMistakes}
                  maxMistakes={7}
                  status={opponentCurrentWordResult ? (opponentCurrentWordResult.solved ? 'WON' : 'LOST') : 'PLAYING'}
                  isWrongGuess={false}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] font-black text-slate-300 px-1">
                <span>OPPONENT:</span>
                <span className="text-rose-400 font-mono text-xs">
                  {opponentResult ? `${opponentScoreSoFar} pts` : 'Playing...'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Gameplay Board */}
        <div className="p-3 sm:p-5 flex-1 overflow-y-auto flex flex-col gap-3 min-h-0">
          {/* Category & Clue Card */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-3.5 shadow-sm text-center flex flex-col items-center gap-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              {currentWordObj?.category || 'Vocabulary'}
            </span>
            <p className="text-sm sm:text-base font-bold text-slate-800 leading-snug max-w-lg">
              "{currentWordObj?.clue}"
            </p>
            {extraClueShown && currentWordObj?.extraClue && (
              <p className="text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200 mt-1 animate-in fade-in">
                💡 Extra Clue: {currentWordObj.extraClue}
              </p>
            )}
          </div>

          {/* Word Display */}
          <div className="py-1 flex justify-center items-center shrink-0">
            <PhraseDisplay
              phrase={targetWord}
              guessedLetters={guessedLetters}
              isLost={wordStatus === 'LOST'}
              compact={true}
            />
          </div>

          {/* Word Solved / Failed Banner */}
          {wordStatus !== 'PLAYING' && (
            <div className={`p-3 rounded-2xl text-center border-2 flex flex-col items-center gap-2 animate-in zoom-in-95 duration-200 ${
              wordStatus === 'WON' 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}>
              <div className="flex items-center gap-2 font-black text-sm sm:text-base">
                <span>{wordStatus === 'WON' ? '🎉 Word Solved!' : '✏️ Word Failed!'}</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border shadow-2xs">
                  +{wordResults[wordResults.length - 1]?.score || 0} pts
                </span>
              </div>
              <p className="text-xs font-medium">
                Word: <strong className="font-mono uppercase tracking-wider">{targetWord}</strong>
              </p>

              {currentWordIdx < 4 ? (
                <button
                  onClick={handleNextWord}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-5 py-2 rounded-xl transition-all shadow-md active:scale-95"
                >
                  NEXT WORD (Round {currentWordIdx + 2} / 5) →
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-800 animate-pulse">
                    {isSubmitting ? 'Calculating Final Duel Score...' : 'All 5 Words Completed!'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Hint Buttons */}
          {wordStatus === 'PLAYING' && (
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleRevealLetter}
                disabled={hintsUsed.revealLetter}
                className="text-[11px] font-extrabold bg-amber-50 hover:bg-amber-100 disabled:opacity-40 text-amber-900 border border-amber-300 p-2 rounded-xl transition-all shadow-2xs flex flex-col items-center justify-center gap-0.5"
              >
                <span>🔍 Reveal Letter</span>
                <span className="text-[9px] text-amber-700 font-normal">-15 pts</span>
              </button>
              <button
                onClick={handleExtraHint}
                disabled={hintsUsed.extraHint || !currentWordObj?.extraClue}
                className="text-[11px] font-extrabold bg-blue-50 hover:bg-blue-100 disabled:opacity-40 text-blue-900 border border-blue-300 p-2 rounded-xl transition-all shadow-2xs flex flex-col items-center justify-center gap-0.5"
              >
                <span>💡 Extra Clue</span>
                <span className="text-[9px] text-blue-700 font-normal">-10 pts</span>
              </button>
              <button
                onClick={handleRemoveWrong}
                disabled={hintsUsed.removeWrong}
                className="text-[11px] font-extrabold bg-purple-50 hover:bg-purple-100 disabled:opacity-40 text-purple-900 border border-purple-300 p-2 rounded-xl transition-all shadow-2xs flex flex-col items-center justify-center gap-0.5"
              >
                <span>❌ Cut 3 Wrong</span>
                <span className="text-[9px] text-purple-700 font-normal">-10 pts</span>
              </button>
            </div>
          )}

          {/* Keyboard */}
          <div className="mt-auto">
            <Keyboard
              onGuess={handleGuess}
              guessedLetters={guessedLetters}
              disabled={wordStatus !== 'PLAYING' || isSubmitting}
              removedLetters={removedLetters}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default DuelGameScreen;
