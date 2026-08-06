
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, GameStatus, QuestState } from './types';
import { fetchNewWord } from './services/geminiService';
import { getTierForLevel } from './services/wordNetService';
import PencilVisual from './components/KangarooVisual';
import Keyboard from './components/Keyboard';
import WordDisplay from './components/PhraseDisplay';

const MAX_MISTAKES = 7;
const STORAGE_KEY = 'pointless_game_v11_pro';

const NEWS_HEADLINES = [
  "LOCAL NEWS: Eraser retires after long, rub-heavy career. 'I have no regrets,' he says.",
  "BREAKING: Pencil Sharpener 3000 recalled due to excessive lead-hunger.",
  "TECH: New 'Ever-Sharp' pencil discovered to just be a pen in disguise.",
  "CRIME: Mechanical pencil arrested for being too 'clicky' in a quiet library.",
  "CULTURE: Graphite declared the most versatile hero of the desk drawer.",
  "TRENDING: Why wood-casing is the new stainless steel.",
  "WEATHER: High humidity expected; watch out for lead-softening.",
  "LIFESTYLE: Local pen caught trying to 'cap-ture' Graphite's fame.",
  "SPORTS: 100m Dash results - Highlighter wins because he was 'brightest' off the block."
];

const DEFAULT_QUESTS: QuestState = {
  streakMaster: false,
  speedDemon: false,
  perfectionist: false,
  wordSmithNovice: false,
  wordSmithTitan: false,
  levelClimber: false,
  hardcoreScholar: false,
  comebackKid: false,
  pureInstinct: false,
};

const App: React.FC = () => {
  const [game, setGame] = useState<GameState>({
    status: 'IDLE',
    word: '',
    category: '',
    clue: '',
    extraClue: '',
    guessedLetters: [],
    mistakes: 0,
    maxMistakes: MAX_MISTAKES,
    level: 1,
    powers: { revealLetterUsed: false, extraHintUsed: false, removeWrongUsed: false },
    quests: DEFAULT_QUESTS,
    removedLetters: [],
    timeLeft: 60,
    initialTime: 60,
    currentStreak: 0,
    perfectStreak: 0,
  });

  const [bestLevel, setBestLevel] = useState(1);
  const [solvedWords, setSolvedWords] = useState<string[]>([]);
  const [isShaking, setIsShaking] = useState(false);
  const [lastGuessWasWrong, setLastGuessWasWrong] = useState(false);
  const [showToast, setShowToast] = useState<{title: string, msg: string} | null>(null);
  const [isQuestModalOpen, setIsQuestModalOpen] = useState(false);
  const [journalTab, setJournalTab] = useState<'powers' | 'trophies'>('powers');
  const timerRef = useRef<number | null>(null);

  const [newsIndex, setNewsIndex] = useState(0);
  useEffect(() => {
    const ticker = setInterval(() => {
      setNewsIndex(prev => (prev + 1) % NEWS_HEADLINES.length);
    }, 15000);
    return () => clearInterval(ticker);
  }, []);

  // Load persistence
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const d = JSON.parse(savedData);
        setBestLevel(d.topLevel || 1);
        setSolvedWords(d.solved || []);
        setGame(prev => ({ 
          ...prev, 
          level: d.currentLevel || 1,
          quests: { ...DEFAULT_QUESTS, ...(d.quests || {}) },
          currentStreak: d.currentStreak || 0,
          perfectStreak: d.perfectStreak || 0
        }));
      } catch (e) { console.error("Restore failed:", e); }
    }
  }, []);

  // Save persistence
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      currentLevel: game.level,
      topLevel: Math.max(bestLevel, game.level),
      solved: solvedWords,
      quests: game.quests,
      currentStreak: game.currentStreak,
      perfectStreak: game.perfectStreak
    }));
    if (game.level > bestLevel) setBestLevel(game.level);
  }, [game.level, bestLevel, solvedWords, game.quests, game.currentStreak, game.perfectStreak]);

  const triggerToast = (title: string, msg: string) => {
    setShowToast({ title, msg });
    setTimeout(() => setShowToast(null), 4000);
  };

  const startNewGame = useCallback(async (isLevelUp = false) => {
    const nextLevel = isLevelUp ? game.level + 1 : game.level;
    
    setGame(prev => ({ 
      ...prev, 
      status: 'LOADING',
      level: nextLevel 
    }));
    
    try {
      const data = await fetchNewWord(nextLevel, solvedWords);
      const baseTime = 30; 
      const calculatedTime = baseTime + (data.word.length * 4);

      setGame(prev => ({
        ...prev,
        status: 'PLAYING',
        level: nextLevel,
        word: data.word,
        category: data.category,
        clue: data.clue,
        extraClue: data.extraClue,
        guessedLetters: [],
        mistakes: 0,
        powers: { revealLetterUsed: false, extraHintUsed: false, removeWrongUsed: false },
        removedLetters: [],
        timeLeft: calculatedTime,
        initialTime: calculatedTime,
      }));
    } catch (err) {
      console.error("Game Start Error:", err);
      setGame(prev => ({ ...prev, status: 'IDLE' }));
    }
  }, [game.level, solvedWords]);

  useEffect(() => {
    if (game.status === 'PLAYING' && game.timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setGame(prev => {
          if (prev.timeLeft <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return { ...prev, timeLeft: 0, status: 'LOST', currentStreak: 0, perfectStreak: 0 };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [game.status]);

  const handleGuess = (letter: string) => {
    if (game.status !== 'PLAYING' || game.guessedLetters.includes(letter)) return;

    const isCorrect = game.word.includes(letter);
    let newCumulativeStreak = isCorrect ? game.currentStreak + 1 : 0;
    
    if (!isCorrect) {
      setIsShaking(true);
      setLastGuessWasWrong(true);
      setTimeout(() => {
        setIsShaking(false);
        setLastGuessWasWrong(false);
      }, 500);
    }

    let questUpdate: Partial<QuestState> = {};
    if (newCumulativeStreak >= 20 && !game.quests.streakMaster) {
      questUpdate.streakMaster = true;
      triggerToast("UNLOCKED: LEAD CINCH", "20 letters in a row! You're basically writing in steel.");
    }

    const newGuessed = [...game.guessedLetters, letter];
    const newMistakes = isCorrect ? game.mistakes : game.mistakes + 1;
    const allGuessed = game.word.split('').filter(c => /[A-Z]/.test(c)).every(c => newGuessed.includes(c));

    let newStatus: GameStatus = 'PLAYING';
    let newPerfectStreak = game.perfectStreak;

    if (allGuessed) {
      newStatus = 'WON';
      const timeTaken = game.initialTime - game.timeLeft;
      
      if (game.word.length >= 7 && timeTaken <= 15 && !game.quests.speedDemon) {
        questUpdate.speedDemon = true;
        triggerToast("UNLOCKED: BRIGHT IDEA", "Solved a long word in record time. Sharp!");
      }

      if (newMistakes === 0) {
        newPerfectStreak += 1;
        if (newPerfectStreak >= 3 && !game.quests.perfectionist) {
          questUpdate.perfectionist = true;
          triggerToast("UNLOCKED: ERASER", "3 perfect games! Graphite is feeling immortal.");
        }
      } else {
        newPerfectStreak = 0;
      }

      const updatedSolved = solvedWords.includes(game.word) ? solvedWords : [...solvedWords, game.word];
      if (!solvedWords.includes(game.word)) setSolvedWords(updatedSolved);

      // --- Non-Powerup Milestone Achievements ---
      if (updatedSolved.length >= 5 && !game.quests.wordSmithNovice) {
        questUpdate.wordSmithNovice = true;
        triggerToast("TROPHY: LEXICON SCHOLAR", "Solved 5 dictionary words!");
      }

      if (updatedSolved.length >= 20 && !game.quests.wordSmithTitan) {
        questUpdate.wordSmithTitan = true;
        triggerToast("TROPHY: DICTIONARY TITAN", "20 words mastered! A walking encyclopedia.");
      }

      if (game.level >= 5 && !game.quests.levelClimber) {
        questUpdate.levelClimber = true;
        triggerToast("TROPHY: HIGH CLIMBER", "Reached Level 5 in WordNet!");
      }

      if (getTierForLevel(game.level) === 'hard' && !game.quests.hardcoreScholar) {
        questUpdate.hardcoreScholar = true;
        triggerToast("TROPHY: HARDCORE SCHOLAR", "Conquered a Hard Tier WordNet word!");
      }

      if (newMistakes === MAX_MISTAKES - 1 && !game.quests.comebackKid) {
        questUpdate.comebackKid = true;
        triggerToast("TROPHY: COMEBACK KID", "Clutched the win with only 1 mistake remaining!");
      }

      const usedPower = game.powers.revealLetterUsed || game.powers.extraHintUsed || game.powers.removeWrongUsed;
      if (!usedPower && !game.quests.pureInstinct) {
        questUpdate.pureInstinct = true;
        triggerToast("TROPHY: PURE INSTINCT", "Solved a word without using any hints or power-ups!");
      }
    } else if (newMistakes >= game.maxMistakes) {
      newStatus = 'LOST';
      newCumulativeStreak = 0;
      newPerfectStreak = 0;
    }

    setGame(prev => ({
      ...prev,
      guessedLetters: newGuessed,
      mistakes: newMistakes,
      status: newStatus,
      currentStreak: newCumulativeStreak,
      perfectStreak: newPerfectStreak,
      quests: { ...prev.quests, ...questUpdate }
    }));
  };

  const timerPercentage = (game.timeLeft / game.initialTime) * 100;

  return (
    <div className={`min-h-dvh flex flex-col items-center py-2 sm:py-4 px-2 sm:px-4 md:px-6 lg:px-8 max-w-6xl mx-auto transition-all duration-300 ${isShaking ? 'bg-red-100' : 'bg-slate-50'}`}>
      
      {showToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[150] bg-slate-900 text-white px-5 py-2.5 rounded-2xl shadow-2xl flex flex-col items-center animate-in slide-in-from-top-full duration-300 border-2 border-yellow-400 max-w-md w-11/12">
           <span className="font-black text-yellow-400 text-xs tracking-widest uppercase">{showToast.title}</span>
           <span className="font-bold text-sm text-center">{showToast.msg}</span>
        </div>
      )}

      {isQuestModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#fff9e6] w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-7 border-4 border-slate-800 relative max-h-[92vh] flex flex-col">
             <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-8 bg-slate-200/50 -rotate-2 z-10 rounded" />
             <button onClick={() => setIsQuestModalOpen(false)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-800 transition-colors text-xl font-black p-2">✕</button>
             
             {/* Header & Stats Banner */}
             <div className="mb-3 border-b-2 border-slate-200/80 pb-3 pr-8">
               <h3 className="font-heading text-xl sm:text-2xl text-slate-900 flex items-center gap-2">
                 <span>📖</span> Graphite's Journal
               </h3>
               <div className="flex items-center gap-3 mt-2 text-xs font-bold text-slate-600 bg-amber-100/60 p-2 rounded-xl border border-amber-200/60">
                 <div className="flex items-center gap-1">
                   <span>🏆</span> <span>Unlocked: {Object.values(game.quests).filter(Boolean).length} / {Object.keys(game.quests).length}</span>
                 </div>
                 <span className="text-slate-300">•</span>
                 <div className="flex items-center gap-1">
                   <span>📚</span> <span>Solved: {solvedWords.length} words</span>
                 </div>
               </div>
             </div>

             {/* Tab Bar */}
             <div className="flex gap-2 mb-3 bg-amber-200/40 p-1 rounded-xl border border-amber-300/40 shrink-0">
               <button 
                 onClick={() => setJournalTab('powers')}
                 className={`flex-1 py-1.5 px-3 rounded-lg text-xs sm:text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                   journalTab === 'powers' 
                     ? 'bg-slate-900 text-white shadow-sm' 
                     : 'text-slate-700 hover:bg-amber-200/60'
                 }`}
               >
                 <span>⚡</span> Abilities ([3])
               </button>
               <button 
                 onClick={() => setJournalTab('trophies')}
                 className={`flex-1 py-1.5 px-3 rounded-lg text-xs sm:text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                   journalTab === 'trophies' 
                     ? 'bg-slate-900 text-white shadow-sm' 
                     : 'text-slate-700 hover:bg-amber-200/60'
                 }`}
               >
                 <span>🏆</span> Hall of Fame ([6])
               </button>
             </div>

             {/* Tab Content Area */}
             <div className="space-y-3 overflow-y-auto pr-1 flex-1">
               {journalTab === 'powers' ? (
                 <>
                   {/* Power-Up Quests */}
                   <div className="text-[11px] font-black uppercase text-amber-800 tracking-wider mb-1">
                     Power-Up Skill Unlocks
                   </div>

                   {/* Streak Master */}
                   <div className="bg-white/80 p-3 rounded-xl border border-amber-200/80 shadow-xs flex gap-3 items-center">
                     <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${game.quests.streakMaster ? 'bg-blue-500 text-white shadow-md' : 'bg-slate-200 text-slate-400 grayscale'}`}>🔍</div>
                     <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-baseline">
                         <h4 className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-800">Master of Momentum</h4>
                         {game.quests.streakMaster && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">UNLOCKED</span>}
                       </div>
                       <p className="text-xs text-slate-500 mt-0.5 leading-tight">Guess 20 letters in a row. Unlocks <strong className="text-slate-700">Lead Cinch</strong> power.</p>
                       <div className="mt-1.5 w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                         <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${Math.min(100, (game.currentStreak / 20) * 100)}%` }} />
                       </div>
                     </div>
                   </div>

                   {/* Speed Demon */}
                   <div className="bg-white/80 p-3 rounded-xl border border-amber-200/80 shadow-xs flex gap-3 items-center">
                     <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${game.quests.speedDemon ? 'bg-amber-400 text-white shadow-md' : 'bg-slate-200 text-slate-400 grayscale'}`}>💡</div>
                     <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-baseline">
                         <h4 className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-800">The Blitz Thinker</h4>
                         {game.quests.speedDemon && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">UNLOCKED</span>}
                       </div>
                       <p className="text-xs text-slate-500 mt-0.5 leading-tight">Solve a 7+ letter word in &lt;15s. Unlocks <strong className="text-slate-700">Bright Idea</strong> hint power.</p>
                     </div>
                   </div>

                   {/* Perfectionist */}
                   <div className="bg-white/80 p-3 rounded-xl border border-amber-200/80 shadow-xs flex gap-3 items-center">
                     <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${game.quests.perfectionist ? 'bg-pink-500 text-white shadow-md' : 'bg-slate-200 text-slate-400 grayscale'}`}>🛡️</div>
                     <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-baseline">
                         <h4 className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-800">Unbroken Chain</h4>
                         {game.quests.perfectionist && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">UNLOCKED</span>}
                       </div>
                       <p className="text-xs text-slate-500 mt-0.5 leading-tight">Achieve 3 perfect games in a row. Unlocks <strong className="text-slate-700">Eraser Armor</strong> shield.</p>
                       <div className="mt-1.5 w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                         <div className="h-full bg-pink-500 transition-all duration-300" style={{ width: `${(game.perfectStreak / 3) * 100}%` }} />
                       </div>
                     </div>
                   </div>
                 </>
               ) : (
                 <>
                   {/* Non-Powerup Trophies */}
                   <div className="text-[11px] font-black uppercase text-amber-800 tracking-wider mb-1">
                     Milestone Badges & Feats
                   </div>

                   {/* Lexicon Scholar */}
                   <div className="bg-white/80 p-3 rounded-xl border border-amber-200/80 shadow-xs flex gap-3 items-center">
                     <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${game.quests.wordSmithNovice ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-200 text-slate-400 grayscale'}`}>📚</div>
                     <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-baseline">
                         <h4 className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-800">Lexicon Scholar</h4>
                         {game.quests.wordSmithNovice ? (
                           <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">COMPLETED</span>
                         ) : (
                           <span className="text-[10px] font-bold text-slate-500">{solvedWords.length}/5 words</span>
                         )}
                       </div>
                       <p className="text-xs text-slate-500 mt-0.5 leading-tight">Solve 5 dictionary words in total.</p>
                       {!game.quests.wordSmithNovice && (
                         <div className="mt-1.5 w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                           <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${Math.min(100, (solvedWords.length / 5) * 100)}%` }} />
                         </div>
                       )}
                     </div>
                   </div>

                   {/* Dictionary Titan */}
                   <div className="bg-white/80 p-3 rounded-xl border border-amber-200/80 shadow-xs flex gap-3 items-center">
                     <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${game.quests.wordSmithTitan ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-200 text-slate-400 grayscale'}`}>🎓</div>
                     <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-baseline">
                         <h4 className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-800">Dictionary Titan</h4>
                         {game.quests.wordSmithTitan ? (
                           <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">COMPLETED</span>
                         ) : (
                           <span className="text-[10px] font-bold text-slate-500">{solvedWords.length}/20 words</span>
                         )}
                       </div>
                       <p className="text-xs text-slate-500 mt-0.5 leading-tight">Solve 20 dictionary words in total.</p>
                       {!game.quests.wordSmithTitan && (
                         <div className="mt-1.5 w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                           <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${Math.min(100, (solvedWords.length / 20) * 100)}%` }} />
                         </div>
                       )}
                     </div>
                   </div>

                   {/* High Climber */}
                   <div className="bg-white/80 p-3 rounded-xl border border-amber-200/80 shadow-xs flex gap-3 items-center">
                     <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${game.quests.levelClimber ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-200 text-slate-400 grayscale'}`}>⛰️</div>
                     <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-baseline">
                         <h4 className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-800">High Climber</h4>
                         {game.quests.levelClimber ? (
                           <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">COMPLETED</span>
                         ) : (
                           <span className="text-[10px] font-bold text-slate-500">Lv {Math.max(game.level, bestLevel)}/5</span>
                         )}
                       </div>
                       <p className="text-xs text-slate-500 mt-0.5 leading-tight">Reach Level 5 in WordNet.</p>
                       {!game.quests.levelClimber && (
                         <div className="mt-1.5 w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                           <div className="h-full bg-purple-600 transition-all duration-300" style={{ width: `${Math.min(100, (Math.max(game.level, bestLevel) / 5) * 100)}%` }} />
                         </div>
                       )}
                     </div>
                   </div>

                   {/* Hardcore Scholar */}
                   <div className="bg-white/80 p-3 rounded-xl border border-amber-200/80 shadow-xs flex gap-3 items-center">
                     <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${game.quests.hardcoreScholar ? 'bg-red-500 text-white shadow-md' : 'bg-slate-200 text-slate-400 grayscale'}`}>🔬</div>
                     <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-baseline">
                         <h4 className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-800">Hardcore Scholar</h4>
                         {game.quests.hardcoreScholar && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">COMPLETED</span>}
                       </div>
                       <p className="text-xs text-slate-500 mt-0.5 leading-tight">Solve a word in the Hard Tier (Level 8+).</p>
                     </div>
                   </div>

                   {/* Comeback Kid */}
                   <div className="bg-white/80 p-3 rounded-xl border border-amber-200/80 shadow-xs flex gap-3 items-center">
                     <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${game.quests.comebackKid ? 'bg-orange-500 text-white shadow-md' : 'bg-slate-200 text-slate-400 grayscale'}`}>🦸</div>
                     <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-baseline">
                         <h4 className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-800">Comeback Kid</h4>
                         {game.quests.comebackKid && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">COMPLETED</span>}
                       </div>
                       <p className="text-xs text-slate-500 mt-0.5 leading-tight">Win a word with only 1 mistake remaining.</p>
                     </div>
                   </div>

                   {/* Pure Instinct */}
                   <div className="bg-white/80 p-3 rounded-xl border border-amber-200/80 shadow-xs flex gap-3 items-center">
                     <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${game.quests.pureInstinct ? 'bg-teal-500 text-white shadow-md' : 'bg-slate-200 text-slate-400 grayscale'}`}>🎯</div>
                     <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-baseline">
                         <h4 className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-800">Pure Instinct</h4>
                         {game.quests.pureInstinct && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">COMPLETED</span>}
                       </div>
                       <p className="text-xs text-slate-500 mt-0.5 leading-tight">Solve a word without using any power-ups or extra hints.</p>
                     </div>
                   </div>
                 </>
               )}
             </div>

             <button onClick={() => setIsQuestModalOpen(false)} className="w-full mt-4 bg-slate-900 text-white py-2.5 rounded-xl font-bold uppercase tracking-wider hover:bg-black transition-colors text-xs sm:text-sm shrink-0 shadow-md">
               Close Journal
             </button>
          </div>
        </div>
      )}

      <header className="w-full flex justify-between items-center mb-2 sm:mb-3 px-1 sm:px-2 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-heading text-slate-800">Pointless ✏️</h1>
          <div className="flex items-center gap-1.5">
            <span className="bg-slate-800 text-white text-xs sm:text-sm px-2.5 py-0.5 rounded-full font-bold uppercase">LV {game.level}</span>
            {game.currentStreak > 0 && <span className="text-orange-500 font-black text-xs sm:text-sm animate-pulse">🔥 {game.currentStreak}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsQuestModalOpen(true)} className="bg-white text-slate-700 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold uppercase border border-slate-200 shadow-xs hover:bg-slate-50 transition-colors">Journal</button>
          {game.status !== 'IDLE' && (
            <button onClick={() => setGame(prev => ({...prev, status: 'IDLE'}))} className="text-slate-500 hover:text-slate-800 text-xs sm:text-sm font-bold uppercase ml-2">Menu</button>
          )}
        </div>
      </header>

      <main className={`w-full flex-1 bg-white rounded-2xl sm:rounded-3xl shadow-xl p-3 sm:p-5 border border-slate-200 transition-all flex flex-col justify-between overflow-x-hidden ${isShaking ? 'animate-shake' : ''}`}>
        {game.status === 'IDLE' ? (
          <div className="animate-pop text-center w-full max-w-2xl mx-auto flex flex-col items-center justify-center my-auto py-6 px-2 gap-4">
            <div className="text-6xl sm:text-8xl mb-1 animate-bounce" style={{ animationDuration: '3s' }}>✏️</div>
            <h2 className="text-3xl sm:text-5xl font-heading text-slate-900 tracking-tight">Help Graphite.</h2>
            <div className="bg-slate-50 p-5 sm:p-8 rounded-2xl border border-slate-200 w-full flex flex-col items-center gap-3">
               <p className="text-slate-600 text-base sm:text-xl leading-relaxed italic">
                 "Meet Graphite. He's a humble HB pencil. Solve the dictionary trivia to keep his lead sharp."
               </p>
               <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-1 rounded-full text-xs font-bold">
                 <span>📚</span> Powered by Princeton WordNet® (73,000+ Words)
               </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full mt-2">
              <button onClick={() => startNewGame()} className="w-full sm:w-auto bg-slate-900 text-white text-base sm:text-xl px-8 py-3.5 rounded-full font-heading shadow-xl btn-press border-b-4 border-black active:border-b-0 hover:bg-slate-800 transition-all">
                 Play Level {game.level}
              </button>
              <button onClick={() => setIsQuestModalOpen(true)} className="w-full sm:w-auto bg-white text-slate-800 text-sm sm:text-base px-6 py-3.5 rounded-full font-bold border-2 border-slate-200 shadow-xs hover:bg-slate-50 transition-all">
                🏆 Skill Quests
              </button>
            </div>
          </div>
        ) : game.status === 'LOADING' ? (
          <div className="flex-1 flex flex-col items-center justify-center animate-pop gap-4 py-12">
             <div className="h-32 w-32 sm:h-44 sm:w-44 flex items-center justify-center">
                <PencilVisual mistakes={0} maxMistakes={10} status="LOADING" />
             </div>
             <div className="text-center">
                <div className="text-4xl sm:text-6xl mb-2">✏️</div>
                <p className="text-xl sm:text-3xl font-heading text-slate-700 tracking-wide uppercase">Sharpening for Level {game.level}...</p>
             </div>
          </div>
        ) : (
          /* Playing & Game Space Layout */
          <div className="flex flex-col flex-1 justify-between gap-3 animate-pop">
            
            {/* Top Game Space (Clue & Visual) */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] md:grid-cols-[1fr_200px] gap-3 items-stretch shrink-0">
              <div className="bg-slate-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-inner flex flex-col items-center justify-center text-center">
                <span className="inline-flex items-center gap-1 bg-slate-800 text-white px-3 py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider mb-1.5">
                  <span className="text-yellow-400 font-extrabold">{getTierForLevel(game.level).toUpperCase()}</span>
                  <span className="text-slate-500">•</span>
                  <span>{game.category}</span>
                </span>
                <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-700 italic leading-snug px-2">"{game.clue}"</h2>
                {game.powers.extraHintUsed && (
                  <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-900 font-bold text-xs sm:text-sm animate-in zoom-in">
                    💡 HINT: {game.extraClue}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center h-28 sm:h-full min-h-[90px]">
                 <PencilVisual mistakes={game.mistakes} maxMistakes={game.maxMistakes} status={game.status} isWrongGuess={lastGuessWasWrong} />
              </div>
            </div>

            {/* Bottom Interactive Area */}
            <div className="flex flex-col gap-3 flex-1 justify-between border-t border-slate-100 pt-3">
              
              {/* Timer Bar */}
              <div className="shrink-0">
                <div className="w-full h-2.5 sm:h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div className={`h-full transition-all duration-1000 ${game.timeLeft < 10 ? 'bg-red-500' : 'bg-slate-800'}`} style={{ width: `${timerPercentage}%` }} />
                </div>
              </div>

              {/* Word Letters Display */}
              <div className="my-auto py-2 px-1 flex items-center justify-center">
                <WordDisplay word={game.word} guessedLetters={game.guessedLetters} revealAll={game.status === 'LOST'} />
              </div>

              {/* Power-up buttons */}
              <div className="flex justify-center gap-4 sm:gap-8 items-center shrink-0 my-1">
                {[
                  { q: 'streakMaster', i: '🔍', c: 'blue', a: () => {
                      const unrevealed = game.word.split('').filter(c => !game.guessedLetters.includes(c) && /[A-Z]/.test(c));
                      if (unrevealed.length > 0) handleGuess(unrevealed[Math.floor(Math.random() * unrevealed.length)]);
                      setGame(prev => ({ ...prev, powers: { ...prev.powers, revealLetterUsed: true } }));
                  }, used: game.powers.revealLetterUsed, label: 'Reveal' },
                  { q: 'speedDemon', i: '💡', c: 'amber', a: () => {
                      setGame(prev => ({ ...prev, powers: { ...prev.powers, extraHintUsed: true } }));
                  }, used: game.powers.extraHintUsed, label: 'Hint' },
                  { q: 'perfectionist', i: '🛡️', c: 'pink', a: () => {
                      const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(l => !game.word.includes(l) && !game.guessedLetters.includes(l));
                      const toRem = [];
                      for(let i=0; i<3 && alpha.length; i++) toRem.push(alpha.splice(Math.floor(Math.random()*alpha.length), 1)[0]);
                      setGame(prev => ({ ...prev, removedLetters: [...prev.removedLetters, ...toRem], powers: { ...prev.powers, removeWrongUsed: true } }));
                  }, used: game.powers.removeWrongUsed, label: 'Eraser' }
                ].map(p => (
                  <div key={p.label} className="flex flex-col items-center">
                    <button 
                      onClick={p.a}
                      disabled={!game.quests[p.q as keyof QuestState] || p.used || game.status !== 'PLAYING'}
                      className={`w-11 h-11 sm:w-13 sm:h-13 md:w-14 md:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-2xl shadow-md transition-all btn-press
                        ${!game.quests[p.q as keyof QuestState] ? 'bg-slate-100 grayscale opacity-20' : 
                          p.used ? 'bg-slate-100 text-slate-300' : 
                          p.c === 'blue' ? 'bg-blue-500 text-white' :
                          p.c === 'amber' ? 'bg-amber-400 text-white' : 'bg-pink-500 text-white'}
                      `}
                    >{p.i}</button>
                    <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase mt-1 tracking-wider">{p.label}</span>
                  </div>
                ))}
              </div>

              {/* Keyboard OR Win/Loss State */}
              <div className="shrink-0 mt-1">
                {game.status === 'PLAYING' ? (
                  <Keyboard guessedLetters={game.guessedLetters} removedLetters={game.removedLetters} onGuess={handleGuess} disabled={false} />
                ) : (
                  <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-6 text-center animate-in zoom-in shadow-2xl my-2 max-w-xl mx-auto border-2 border-slate-800">
                    {game.status === 'WON' ? (
                      <div>
                        <span className="text-xs sm:text-sm font-black uppercase text-emerald-400 tracking-widest block mb-1">LEVEL {game.level} COMPLETE</span>
                        <h3 className="text-2xl sm:text-4xl font-heading text-white mb-4">Well Done! 🎉</h3>
                        <button onClick={() => startNewGame(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-full font-heading text-base sm:text-xl shadow-lg btn-press border-b-4 border-emerald-700">Next Level ({game.level + 1})</button>
                      </div>
                    ) : (
                      <div>
                        <h3 className="text-2xl sm:text-4xl font-heading text-red-400 mb-2">Snapped! ✏️</h3>
                        <p className="text-slate-300 mb-4 text-sm sm:text-base font-bold">Answer: <span className="text-yellow-300 font-black uppercase">{game.word}</span></p>
                        <button onClick={() => startNewGame(false)} className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-3 rounded-full font-heading text-base sm:text-xl shadow-lg btn-press border-b-4 border-slate-800">Retry Level {game.level}</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* News Ticker */}
            <div className="hidden sm:flex shrink-0 w-full bg-slate-900 text-yellow-400 rounded-xl border border-slate-800 shadow-sm relative h-8 items-center overflow-hidden mt-1">
              <div className="animate-marquee whitespace-nowrap min-w-full inline-block px-3">
                  <span className="font-bold text-xs uppercase tracking-widest">{NEWS_HEADLINES[newsIndex]}</span>
              </div>
            </div>
          </div>
        )}
      </main>
      <footer className="mt-auto py-1 text-slate-400 font-bold text-[10px] sm:text-xs uppercase tracking-widest shrink-0 text-center">
        Pointless Studios © 2025 • WordNet 3.1 Copyright © Princeton University
      </footer>
    </div>
  );
};

export default App;
