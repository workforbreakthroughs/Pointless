
import React, { useState, useCallback, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { GameState, GameStatus, QuestState } from './types';
import { fetchNewWord } from './services/geminiService';
import { getTierForLevel } from './services/wordNetService';
import { fetchEtymologyDetails, EtymologyDetails } from './services/etymologyService';
import PencilVisual from './components/KangarooVisual';
import Keyboard from './components/Keyboard';
import WordDisplay from './components/PhraseDisplay';
import { GlobalLeaderboardModal } from './components/GlobalLeaderboardModal';
import { subscribeToGlobalTopScore, updatePlayerGlobalScore, getFlagEmoji, GlobalScoreRecord } from './services/firebaseService';

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

const getWordDetails = (word: string, clue: string, extraClue: string, category: string) => {
  const uWord = word.toUpperCase();
  
  // 1. Definition
  const definition = clue || "A word from the Princeton WordNet lexicon.";

  // 2. Etymology / Origin
  let origin = "";
  if (uWord === 'PETRICHOR') {
    origin = "Greek petra — stone + ichor — fluid flowing in the veins of the gods.";
  } else if (uWord === 'OBSIDIAN') {
    origin = "Latin obsidianus — named after Obsius who discovered a similar dark volcanic stone in Ethiopia.";
  } else if (uWord === 'PENDULUM') {
    origin = "Latin pendulus — hanging down, from pendere — to hang.";
  } else if (uWord === 'CHAMELEON') {
    origin = "Greek khamaileon — dwarf lion, from khamai (on the ground) + leon (lion).";
  } else if (uWord === 'ARCHIPELAGO') {
    origin = "Italian arcipelago — chief sea, from Greek arkhi- (chief) + pelagos (sea).";
  } else if (uWord === 'LABYRINTH') {
    origin = "Greek labyrinthos — referring to the mythical maze of Crete constructed by Daedalus.";
  } else if (uWord === 'SOLSTICE') {
    origin = "Latin solstitium — sun standing still, from sol (sun) + sistere (to stand still).";
  } else if (uWord === 'PARADOX') {
    origin = "Greek paradoxon — contrary to expectation, from para- (distinct from) + doxa (opinion).";
  } else if (uWord === 'SERENDIPITY') {
    origin = "Coined by Horace Walpole in 1754, inspired by the Persian fairy tale The Three Princes of Serendip.";
  } else {
    const catLower = category.toLowerCase();
    if (catLower.includes('myth') || catLower.includes('greek') || catLower.includes('astro') || catLower.includes('geo')) {
      origin = `Derived from ancient Greek lexical roots associated with ${category}.`;
    } else if (catLower.includes('latin') || catLower.includes('law') || catLower.includes('plant') || catLower.includes('animal') || catLower.includes('nature') || catLower.includes('fauna') || catLower.includes('flora')) {
      origin = `Rooted in classical Latin vocabulary and natural taxonomy.`;
    } else if (catLower.includes('french') || catLower.includes('art') || catLower.includes('cuisine') || catLower.includes('fashion')) {
      origin = `Entered the English language via Middle French and Anglo-Norman lexicon.`;
    } else {
      origin = `Evolved into Modern English from historical Germanic and Old English linguistic roots.`;
    }
  }

  // 3. Fun Fact
  let funFact = "";
  if (uWord === 'PETRICHOR') {
    funFact = "The word was coined in 1964 by Australian researchers Isabel Bear and Richard Thomas.";
  } else if (extraClue && !extraClue.startsWith("Category:") && !extraClue.includes("letters,")) {
    funFact = extraClue;
  } else {
    const vowels = uWord.split('').filter(c => 'AEIOU'.includes(c)).length;
    const consonants = uWord.length - vowels;
    const unique = new Set(uWord.split('')).size;
    funFact = `Spelled with ${uWord.length} letters (${vowels} vowel${vowels === 1 ? '' : 's'}, ${consonants} consonant${consonants === 1 ? '' : 's'}) containing ${unique} unique letter${unique === 1 ? '' : 's'}.`;
  }

  return { definition, origin, funFact };
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
  const [showLossModal, setShowLossModal] = useState(true);
  const [showWinModal, setShowWinModal] = useState(true);
  const [etymologyInfo, setEtymologyInfo] = useState<EtymologyDetails | null>(null);
  const [globalTopScore, setGlobalTopScore] = useState<GlobalScoreRecord | null>(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Subscribe to real-time global top score
  useEffect(() => {
    const unsub = subscribeToGlobalTopScore((record) => {
      setGlobalTopScore(record);
    });
    return () => unsub();
  }, []);

  // Update global player level on Firestore whenever level or streak changes
  useEffect(() => {
    if (game.level >= 1) {
      updatePlayerGlobalScore(game.level, game.currentStreak);
    }
  }, [game.level, game.currentStreak]);

  // Confetti helper for victory celebration
  const triggerConfettiAnimation = useCallback(() => {
    // Left burst
    confetti({
      particleCount: 80,
      angle: 60,
      spread: 60,
      origin: { x: 0.1, y: 0.7 },
      colors: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6']
    });
    // Right burst
    confetti({
      particleCount: 80,
      angle: 120,
      spread: 60,
      origin: { x: 0.9, y: 0.7 },
      colors: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6']
    });
    // Center shower
    setTimeout(() => {
      confetti({
        particleCount: 70,
        spread: 100,
        origin: { x: 0.5, y: 0.4 },
        colors: ['#fef08a', '#34d399', '#38bdf8', '#f472b6']
      });
    }, 250);
  }, []);

  // Trigger celebratory confetti on victory
  useEffect(() => {
    if (game.status === 'WON') {
      triggerConfettiAnimation();
    }
  }, [game.status, triggerConfettiAnimation]);

  // Fetch etymology when game is won or lost
  useEffect(() => {
    if ((game.status === 'LOST' || game.status === 'WON') && game.word) {
      fetchEtymologyDetails(game.word, game.clue, game.extraClue, game.category).then(data => {
        setEtymologyInfo(data);
      });
    } else {
      setEtymologyInfo(null);
    }
  }, [game.status, game.word, game.clue, game.extraClue, game.category]);

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
    setShowLossModal(true);
    setShowWinModal(true);
    
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
    <div className={`min-h-dvh flex flex-col items-center py-2 sm:py-4 px-2 sm:px-4 md:px-6 lg:px-8 max-w-6xl mx-auto transition-all duration-300 ${isShaking ? 'bg-red-100/50' : ''}`}>
      
      {showToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[150] glass-pill-dark text-white px-5 py-2.5 rounded-2xl flex flex-col items-center animate-in slide-in-from-top-full duration-300 border border-amber-400/50 max-w-md w-11/12 shadow-2xl">
           <span className="font-black text-amber-400 text-xs tracking-widest uppercase">{showToast.title}</span>
           <span className="font-bold text-sm text-center text-slate-100">{showToast.msg}</span>
        </div>
      )}

      {isQuestModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-slate-950/40 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-lg rounded-3xl shadow-2xl p-4 sm:p-7 border border-white/80 relative h-[520px] sm:h-[580px] max-h-[88vh] flex flex-col">
             <button onClick={() => setIsQuestModalOpen(false)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-800 transition-colors text-xl font-black p-2 rounded-full hover:bg-white/50">✕</button>
             
             {/* Header & Stats Banner */}
             <div className="mb-3 border-b border-slate-200/80 pb-3 pr-8">
               <h3 className="font-heading text-xl sm:text-2xl text-slate-900 flex items-center gap-2">
                 <span>📖</span> Graphite's Journal
               </h3>
               <div className="flex items-center gap-3 mt-2 text-xs font-bold text-slate-700 glass-pill p-2 rounded-xl">
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
             <div className="flex gap-2 mb-3 glass-pill p-1 rounded-2xl shrink-0">
               <button 
                 onClick={() => setJournalTab('powers')}
                 className={`flex-1 py-1.5 px-3 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                   journalTab === 'powers' 
                     ? 'glass-pill-dark text-white shadow-md' 
                     : 'text-slate-700 hover:bg-white/60'
                 }`}
               >
                 <span>⚡</span> Abilities
               </button>
               <button 
                 onClick={() => setJournalTab('trophies')}
                 className={`flex-1 py-1.5 px-3 rounded-lg text-xs sm:text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                   journalTab === 'trophies' 
                     ? 'glass-pill-dark text-white shadow-md' 
                     : 'text-slate-700 hover:bg-white/60'
                 }`}
               >
                 <span>🏆</span> Trophies
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

             <button onClick={() => setIsQuestModalOpen(false)} className="w-full mt-4 glass-pill-dark text-white py-2.5 rounded-2xl font-bold uppercase tracking-wider hover:bg-black transition-colors text-xs sm:text-sm shrink-0 shadow-md">
               Close Journal
             </button>
          </div>
        </div>
      )}

      <header className="w-full flex justify-between items-center mb-2 sm:mb-3 px-1 sm:px-2 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <h1 className="text-lg sm:text-2xl md:text-3xl font-heading text-slate-800 tracking-tight drop-shadow-xs">Pointless ✏️</h1>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="glass-pill-dark text-white text-[10px] sm:text-xs md:text-sm px-2 sm:px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">LV {game.level}</span>
            {game.currentStreak > 0 && <span className="text-orange-500 font-black text-[10px] sm:text-xs md:text-sm animate-pulse glass-pill px-2 sm:px-2.5 py-0.5 rounded-full">🔥 {game.currentStreak}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button 
            onClick={() => setIsLeaderboardOpen(true)} 
            className="glass-pill-dark text-amber-300 hover:text-amber-200 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-xs hover:bg-slate-800 transition-all flex items-center gap-1 border border-amber-400/40"
            title="View Global High Score Leaderboard"
          >
            <span>👑</span> Peak: Lv {globalTopScore ? globalTopScore.level : 1}
          </button>
          <button onClick={() => setIsQuestModalOpen(true)} className="glass-button text-slate-800 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-sm font-bold uppercase tracking-wider shadow-xs hover:bg-white transition-all">Journal</button>
          {game.status !== 'IDLE' && (
            <button onClick={() => setGame(prev => ({...prev, status: 'IDLE'}))} className="glass-pill text-slate-600 hover:text-slate-900 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-sm font-bold uppercase transition-all">Menu</button>
          )}
        </div>
      </header>

      <main className={`w-full flex-1 glass-panel rounded-3xl p-2.5 sm:p-4 md:p-5 transition-all flex flex-col justify-between overflow-y-auto max-h-full ${isShaking ? 'animate-shake border-red-300 bg-red-50/50' : ''}`}>
        {game.status === 'IDLE' ? (
          <div className="animate-pop text-center w-full max-w-2xl mx-auto flex flex-col items-center justify-center my-auto py-6 px-2 gap-4">
            <div className="text-6xl sm:text-8xl mb-1 animate-bounce" style={{ animationDuration: '3s' }}>✏️</div>
            <h2 className="text-3xl sm:text-5xl font-heading text-slate-900 tracking-tight">Help Graphite.</h2>
            
            <div className="glass-card p-5 sm:p-8 rounded-2xl w-full flex flex-col items-center gap-3">
               <p className="text-slate-700 text-base sm:text-xl leading-relaxed italic">
                 "Meet Graphite. He's a humble HB pencil. Solve the dictionary trivia to keep his lead sharp."
               </p>
               <div className="inline-flex items-center gap-2 bg-emerald-100/80 text-emerald-900 border border-emerald-200/80 px-3.5 py-1 rounded-full text-xs font-bold shadow-2xs">
                 <span>📚</span> Powered by Princeton WordNet® (73,000+ Words)
               </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full mt-2">
              <button onClick={() => startNewGame()} className="w-full sm:w-auto glass-pill-dark text-white text-base sm:text-xl px-8 py-3.5 rounded-full font-heading shadow-xl btn-press hover:bg-slate-800 transition-all">
                 Play Level {game.level}
              </button>
              <button onClick={() => setIsLeaderboardOpen(true)} className="w-full sm:w-auto glass-button text-slate-800 text-sm sm:text-base px-6 py-3.5 rounded-full font-bold shadow-xs hover:bg-white transition-all flex items-center justify-center gap-1.5">
                👑 Global Scores
              </button>
            </div>

            {/* Global High Score Showcase Banner */}
            <div 
              onClick={() => setIsLeaderboardOpen(true)}
              className="w-full bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-yellow-500/10 border border-amber-300/80 hover:border-amber-400/90 rounded-2xl p-3.5 sm:p-4 text-slate-900 cursor-pointer transition-all hover:scale-[1.01] shadow-xs flex items-center justify-between gap-3 mt-1"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-400 text-amber-950 font-black text-xl flex items-center justify-center shadow-xs shrink-0 ring-2 ring-amber-300">
                  👑
                </div>
                <div className="text-left min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 block">Global Record Holder</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 leading-tight flex items-center gap-1.5 truncate">
                    <span className="text-base shrink-0" title={globalTopScore?.countryCode || 'US'}>
                      {getFlagEmoji(globalTopScore?.countryCode)}
                    </span>
                    <span className="truncate max-w-[150px] sm:max-w-[240px]">
                      {globalTopScore ? globalTopScore.playerName : 'Anonymous Hero'}
                    </span>
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">Highest Level</span>
                <span className="text-lg sm:text-xl font-black text-amber-600 tracking-tight leading-none block">
                  Level {globalTopScore ? globalTopScore.level : 1}
                </span>
              </div>
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
          <div className="flex flex-col flex-1 justify-between gap-2.5 sm:gap-3 animate-pop">
            
            {/* Top Game Space (Clue & Visual) */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px] md:grid-cols-[1fr_180px] gap-2.5 items-stretch shrink-0">
              <div className="glass-card p-2.5 sm:p-3.5 rounded-2xl flex flex-col items-center justify-center text-center">
                <span className="inline-flex items-center gap-1 glass-pill-dark text-white px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider mb-1 shadow-2xs">
                  <span className="text-yellow-400 font-extrabold">{getTierForLevel(game.level).toUpperCase()}</span>
                  <span className="text-slate-500">•</span>
                  <span>{game.category}</span>
                </span>
                <h2 className="text-xs sm:text-sm md:text-base font-bold text-slate-800 italic leading-snug px-2">"{game.clue}"</h2>
                {game.powers.extraHintUsed && (
                  <div className="mt-1.5 p-1.5 bg-yellow-100/90 border border-yellow-300 rounded-xl text-yellow-950 font-bold text-xs animate-in zoom-in shadow-2xs">
                    💡 HINT: {game.extraClue}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center h-24 sm:h-auto min-h-[85px] max-h-[135px] glass-pill rounded-2xl">
                 <PencilVisual mistakes={game.mistakes} maxMistakes={game.maxMistakes} status={game.status} isWrongGuess={lastGuessWasWrong} />
              </div>
            </div>

            {/* Bottom Interactive Area */}
            <div className="flex flex-col gap-2.5 sm:gap-3 flex-1 justify-between border-t border-white/60 pt-2.5">
              
              {/* Timer Bar */}
              <div className="shrink-0">
                <div className="w-full h-2 sm:h-2.5 bg-slate-200/60 rounded-full overflow-hidden border border-white/80 p-0.5 glass-pill">
                  <div className={`h-full rounded-full transition-all duration-1000 ${game.timeLeft < 10 ? 'bg-red-500' : 'bg-slate-800'}`} style={{ width: `${timerPercentage}%` }} />
                </div>
              </div>

              {/* Word Letters Display */}
              <div className="my-auto py-1 px-1 flex items-center justify-center overflow-x-auto">
                <WordDisplay word={game.word} guessedLetters={game.guessedLetters} revealAll={game.status === 'LOST'} />
              </div>

              {/* Power-up buttons */}
              <div className="flex justify-center gap-3 sm:gap-6 items-center shrink-0 my-0.5">
                {[
                  { q: 'streakMaster', i: '🔍', c: 'blue', a: () => {
                      const unrevealed = game.word.split('').filter(c => !game.guessedLetters.includes(c) && /[A-Z]/.test(c));
                      if (unrevealed.length > 0) {
                        const chosen = unrevealed[Math.floor(Math.random() * unrevealed.length)];
                        handleGuess(chosen);
                        triggerToast("LETTER REVEALED 🔍", `Revealed the letter "${chosen}"!`);
                      }
                      setGame(prev => ({ ...prev, powers: { ...prev.powers, revealLetterUsed: true } }));
                  }, used: game.powers.revealLetterUsed, label: 'Reveal' },
                  { q: 'speedDemon', i: '💡', c: 'amber', a: () => {
                      setGame(prev => ({ ...prev, powers: { ...prev.powers, extraHintUsed: true } }));
                      let hintMsg = game.extraClue;
                      if (!hintMsg || hintMsg.startsWith('Category:') || hintMsg.toLowerCase().includes(game.category.toLowerCase())) {
                        const uWord = game.word.toUpperCase();
                        const vowels = uWord.split('').filter(c => 'AEIOU'.includes(c)).length;
                        const startChar = uWord.charAt(0);
                        const endChar = uWord.charAt(uWord.length - 1);
                        hintMsg = `${uWord.length} letters, ${vowels} vowel${vowels === 1 ? '' : 's'} (Starts with '${startChar}', ends with '${endChar}')`;
                      }
                      triggerToast("HINT 💡", hintMsg);
                  }, used: game.powers.extraHintUsed, label: 'Hint' },
                  { q: 'perfectionist', i: '🧹', c: 'pink', a: () => {
                      const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(l => !game.word.includes(l) && !game.guessedLetters.includes(l) && !game.removedLetters.includes(l));
                      const toRem: string[] = [];
                      for(let i=0; i<3 && alpha.length > 0; i++) {
                        toRem.push(alpha.splice(Math.floor(Math.random()*alpha.length), 1)[0]);
                      }
                      if (toRem.length > 0) {
                        setGame(prev => ({ ...prev, removedLetters: [...prev.removedLetters, ...toRem], powers: { ...prev.powers, removeWrongUsed: true } }));
                        triggerToast("ERASER ACTIVATED 🧹", `Erased 3 wrong letters from keyboard: ${toRem.join(', ')}`);
                      } else {
                        triggerToast("ERASER 🧹", "No more wrong letters left to erase!");
                      }
                  }, used: game.powers.removeWrongUsed, label: 'Eraser' }
                ].map(p => (
                  <div key={p.label} className="flex flex-col items-center">
                    <button 
                      onClick={p.a}
                      disabled={!game.quests[p.q as keyof QuestState] || p.used || game.status !== 'PLAYING'}
                      className={`w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-2xl flex items-center justify-center text-base sm:text-xl shadow-md transition-all btn-press
                        ${!game.quests[p.q as keyof QuestState] ? 'bg-slate-200/60 grayscale opacity-30 border border-slate-300/40' : 
                          p.used ? 'bg-slate-200/80 text-slate-400' : 
                          p.c === 'blue' ? 'bg-blue-500 text-white shadow-blue-500/20' :
                          p.c === 'amber' ? 'bg-amber-400 text-white shadow-amber-400/20' : 'bg-pink-500 text-white shadow-pink-500/20'}
                      `}
                    >{p.i}</button>
                    <span className="text-[10px] font-bold text-slate-500 uppercase mt-0.5 tracking-wider">{p.label}</span>
                  </div>
                ))}
              </div>

              {/* Keyboard OR Win/Loss Bottom State */}
              <div className="shrink-0 mt-1">
                {game.status === 'WON' ? (
                  <div className="glass-panel text-slate-900 rounded-3xl p-4 sm:p-6 text-center animate-in zoom-in shadow-2xl my-2 max-w-xl mx-auto border border-white/90">
                    <span className="text-xs sm:text-sm font-black uppercase text-emerald-600 tracking-widest block mb-1">LEVEL {game.level} COMPLETE</span>
                    <h3 className="text-2xl sm:text-3xl font-heading text-slate-900 mb-1">Well Done! 🎉</h3>
                    <p className="text-slate-700 mb-3 text-sm sm:text-base font-bold">
                      Answer: <span className="text-emerald-600 font-black uppercase tracking-wider">{game.word}</span>
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button onClick={() => startNewGame(true)} className="glass-pill-dark text-white px-5 py-2.5 rounded-2xl font-heading text-xs sm:text-sm shadow-xl btn-press flex items-center gap-1.5">
                        <span>🚀</span> Next Level ({game.level + 1})
                      </button>
                      <button onClick={() => { setShowWinModal(true); triggerConfettiAnimation(); }} className="glass-button text-slate-800 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm uppercase tracking-wider shadow-xs hover:bg-white transition-all flex items-center gap-1.5">
                        <span>💡</span> Word Info
                      </button>
                      <button onClick={() => setIsQuestModalOpen(true)} className="glass-button text-slate-800 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm uppercase tracking-wider shadow-xs hover:bg-white transition-all flex items-center gap-1.5">
                        <span>📖</span> Journal
                      </button>
                      <button onClick={() => setGame(prev => ({ ...prev, status: 'IDLE' }))} className="glass-pill text-slate-700 hover:text-slate-900 bg-slate-200/80 hover:bg-slate-300/80 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center gap-1.5">
                        <span>🏠</span> Menu
                      </button>
                    </div>
                  </div>
                ) : game.status === 'LOST' ? (
                  <div className="glass-panel text-slate-900 rounded-3xl p-4 sm:p-6 text-center animate-in zoom-in shadow-2xl my-2 max-w-xl mx-auto border border-white/90">
                    <h3 className="text-2xl sm:text-3xl font-heading text-red-500 mb-1">Snapped! ✏️</h3>
                    <p className="text-slate-700 mb-3 text-sm sm:text-base font-bold">
                      Answer: <span className="text-amber-600 font-black uppercase tracking-wider">{game.word}</span>
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button onClick={() => startNewGame(false)} className="glass-pill-dark text-white px-5 py-2.5 rounded-2xl font-heading text-xs sm:text-sm shadow-xl btn-press flex items-center gap-1.5">
                        <span>🔄</span> Retry Level {game.level}
                      </button>
                      <button onClick={() => setShowLossModal(true)} className="glass-button text-slate-800 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm uppercase tracking-wider shadow-xs hover:bg-white transition-all flex items-center gap-1.5">
                        <span>💡</span> Word Info
                      </button>
                      <button onClick={() => setIsQuestModalOpen(true)} className="glass-button text-slate-800 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm uppercase tracking-wider shadow-xs hover:bg-white transition-all flex items-center gap-1.5">
                        <span>📖</span> Journal
                      </button>
                      <button onClick={() => setGame(prev => ({ ...prev, status: 'IDLE' }))} className="glass-pill text-slate-700 hover:text-slate-900 bg-slate-200/80 hover:bg-slate-300/80 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center gap-1.5">
                        <span>🏠</span> Menu
                      </button>
                    </div>
                  </div>
                ) : (
                  <Keyboard guessedLetters={game.guessedLetters} removedLetters={game.removedLetters} onGuess={handleGuess} disabled={false} />
                )}
              </div>
            </div>

            {/* News Ticker */}
            <div className="hidden sm:flex shrink-0 w-full glass-pill-dark text-yellow-300 rounded-xl border border-slate-700/60 shadow-xs relative h-8 items-center overflow-hidden mt-1">
              <div className="animate-marquee whitespace-nowrap min-w-full inline-block px-3">
                  <span className="font-bold text-xs uppercase tracking-widest">{NEWS_HEADLINES[newsIndex]}</span>
              </div>
            </div>
          </div>
        )}

        {/* Full-Screen Translucent Victory Modal for Won State */}
        {game.status === 'WON' && showWinModal && (() => {
          const fallbackDetails = getWordDetails(game.word, game.clue, game.extraClue, game.category);
          const definition = game.clue || etymologyInfo?.definition || fallbackDetails.definition;
          const origin = etymologyInfo?.origin || fallbackDetails.origin;
          const funFact = etymologyInfo?.funFact || fallbackDetails.funFact;
          const phonetic = etymologyInfo?.phonetic;
          const source = etymologyInfo?.source || "Princeton WordNet 3.1 Lexicon";

          return (
            <div 
              onClick={(e) => { if (e.target === e.currentTarget) setShowWinModal(false); }}
              className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300"
            >
              <div className="w-full max-w-xl glass-panel bg-white/85 backdrop-blur-md text-slate-900 rounded-3xl p-3.5 sm:p-6 shadow-2xl border border-white/90 my-auto text-left flex flex-col gap-2 sm:gap-3.5 animate-in zoom-in-95 max-h-[calc(100dvh-3.5rem)] sm:max-h-[82vh] overflow-hidden relative">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5 sm:pb-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={triggerConfettiAnimation}
                      className="text-2.5xl sm:text-4xl hover:scale-125 transition-transform cursor-pointer active:scale-90 shrink-0"
                      title="Click for confetti!"
                      aria-label="Celebrate with confetti"
                    >
                      🎉
                    </button>
                    <div>
                      <h3 className="text-xl sm:text-3xl font-heading text-emerald-600 leading-none">Well Done!</h3>
                      <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 mt-0.5 block">Level {game.level} Cleared!</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="glass-pill-dark text-amber-400 text-[10px] sm:text-xs font-extrabold px-2.5 sm:px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">
                      {game.category}
                    </span>
                    <button 
                      onClick={() => setShowWinModal(false)}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200/80 hover:bg-slate-300/90 text-slate-600 hover:text-slate-900 font-bold text-xs sm:text-sm flex items-center justify-center transition-all btn-press shadow-2xs"
                      title="Close to review board"
                      aria-label="Close"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Scrollable Word Info Body */}
                <div className="flex-1 overflow-y-auto min-h-0 pr-1 flex flex-col gap-2.5 sm:gap-3.5">
                  {/* Answer Banner */}
                  <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-2xl p-2.5 sm:p-4 text-center shadow-xs shrink-0 relative overflow-hidden">
                    <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-emerald-800/80 block">Correct Word</span>
                    <div className="flex items-center justify-center gap-2 mt-0.5">
                      <span className="text-emerald-600 font-black text-xl sm:text-4xl uppercase tracking-widest">{game.word}</span>
                      {phonetic && (
                        <span className="text-slate-500 font-serif italic text-xs sm:text-sm bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200/60">{phonetic}</span>
                      )}
                    </div>
                  </div>

                  {/* Word Information Sections */}
                  <div className="flex flex-col gap-2 sm:gap-2.5">
                    {/* DEFINITION */}
                    <div className="bg-slate-100/90 p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                      <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><span>📖</span> GAME DEFINITION</span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-slate-800 italic leading-snug">"{definition}"</p>

                      {/* OTHER MEANINGS & DEFINITIONS */}
                      {etymologyInfo?.otherDefinitions && etymologyInfo.otherDefinitions.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200/80">
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
                            <span>📚</span> OTHER MEANINGS & DEFINITIONS
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {etymologyInfo.otherDefinitions.slice(0, 2).map((defItem, idx) => (
                              <div key={idx} className="text-xs text-slate-700 font-medium flex items-start gap-1.5 bg-white/60 p-1.5 sm:p-2 rounded-xl border border-slate-200/60">
                                {defItem.partOfSpeech && (
                                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-slate-200/90 text-slate-600 rounded-md shrink-0 mt-0.5">
                                    {defItem.partOfSpeech}
                                  </span>
                                )}
                                <span className="italic leading-snug">"{defItem.definition}"</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ORIGIN / ETYMOLOGY */}
                    <div className="bg-slate-100/90 p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                      <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><span>🏛️</span> ORIGIN & ETYMOLOGY</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{source}</span>
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed">{origin}</p>
                    </div>

                    {/* FUN FACT */}
                    <div className="bg-emerald-100/70 p-2.5 sm:p-3.5 rounded-2xl border border-emerald-200/90 shadow-2xs">
                      <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-800 mb-1 flex items-center gap-1.5">
                        <span>💡</span> FUN FACT
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-emerald-950 leading-relaxed">{funFact}</p>
                    </div>
                  </div>
                </div>

                {/* Navigation & Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2 mt-auto pt-2.5 sm:pt-3 border-t border-slate-200/80 w-full shrink-0">
                  <button 
                    onClick={() => startNewGame(true)} 
                    className="w-full sm:flex-1 glass-pill-dark text-white px-3.5 py-2 sm:py-2.5 rounded-2xl font-heading text-xs sm:text-sm shadow-xl btn-press flex items-center justify-center gap-1.5 hover:bg-slate-800 transition-all"
                  >
                    <span>🚀</span> Next Level ({game.level + 1})
                  </button>
                  
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <button 
                      onClick={() => setShowWinModal(false)} 
                      className="flex-1 sm:flex-initial glass-button text-slate-800 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-2xl font-bold text-[11px] sm:text-xs uppercase tracking-wider shadow-xs hover:bg-white transition-all flex items-center justify-center gap-1"
                      title="Close modal to review board"
                    >
                      <span>👁️</span> Board
                    </button>
                    <button 
                      onClick={() => setIsQuestModalOpen(true)} 
                      className="flex-1 sm:flex-initial glass-button text-slate-800 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-2xl font-bold text-[11px] sm:text-xs uppercase tracking-wider shadow-xs hover:bg-white transition-all flex items-center justify-center gap-1"
                    >
                      <span>📖</span> Journal
                    </button>
                    <button 
                      onClick={() => setGame(prev => ({ ...prev, status: 'IDLE' }))} 
                      className="flex-1 sm:flex-initial glass-pill text-slate-700 hover:text-slate-900 bg-slate-200/80 hover:bg-slate-300/80 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-2xl font-bold text-[11px] sm:text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1"
                    >
                      <span>🏠</span> Menu
                    </button>
                  </div>
                </div>

              </div>
            </div>
          );
        })()}

        {/* Full-Screen Translucent Snapped Modal for Lost State */}
        {game.status === 'LOST' && showLossModal && (() => {
          const fallbackDetails = getWordDetails(game.word, game.clue, game.extraClue, game.category);
          const definition = game.clue || etymologyInfo?.definition || fallbackDetails.definition;
          const origin = etymologyInfo?.origin || fallbackDetails.origin;
          const funFact = etymologyInfo?.funFact || fallbackDetails.funFact;
          const phonetic = etymologyInfo?.phonetic;
          const source = etymologyInfo?.source || "Princeton WordNet 3.1 Lexicon";

          return (
            <div 
              onClick={(e) => { if (e.target === e.currentTarget) setShowLossModal(false); }}
              className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300"
            >
              <div className="w-full max-w-xl glass-panel bg-white/85 backdrop-blur-md text-slate-900 rounded-3xl p-3.5 sm:p-6 shadow-2xl border border-white/90 my-auto text-left flex flex-col gap-2 sm:gap-3.5 animate-in zoom-in-95 max-h-[calc(100dvh-3.5rem)] sm:max-h-[82vh] overflow-hidden relative">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5 sm:pb-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-2.5xl sm:text-4xl shrink-0">✏️</span>
                    <div>
                      <h3 className="text-xl sm:text-3xl font-heading text-red-500 leading-none">Snapped!</h3>
                      <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 mt-0.5 block">Level {game.level} Unsuccessful</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="glass-pill-dark text-amber-400 text-[10px] sm:text-xs font-extrabold px-2.5 sm:px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">
                      {game.category}
                    </span>
                    <button 
                      onClick={() => setShowLossModal(false)}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200/80 hover:bg-slate-300/90 text-slate-600 hover:text-slate-900 font-bold text-xs sm:text-sm flex items-center justify-center transition-all btn-press shadow-2xs"
                      title="Close to review board"
                      aria-label="Close"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Scrollable Word Info Body */}
                <div className="flex-1 overflow-y-auto min-h-0 pr-1 flex flex-col gap-2.5 sm:gap-3.5">
                  {/* Answer Banner */}
                  <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-2.5 sm:p-4 text-center shadow-xs shrink-0 relative overflow-hidden">
                    <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-amber-800/80 block">Answer Word</span>
                    <div className="flex items-center justify-center gap-2 mt-0.5">
                      <span className="text-amber-600 font-black text-xl sm:text-4xl uppercase tracking-widest">{game.word}</span>
                      {phonetic && (
                        <span className="text-slate-500 font-serif italic text-xs sm:text-sm bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-200/60">{phonetic}</span>
                      )}
                    </div>
                  </div>

                  {/* Word Information Sections */}
                  <div className="flex flex-col gap-2 sm:gap-2.5">
                    {/* DEFINITION */}
                    <div className="bg-slate-100/90 p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                      <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><span>📖</span> GAME DEFINITION</span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-slate-800 italic leading-snug">"{definition}"</p>

                      {/* OTHER MEANINGS & DEFINITIONS */}
                      {etymologyInfo?.otherDefinitions && etymologyInfo.otherDefinitions.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200/80">
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
                            <span>📚</span> OTHER MEANINGS & DEFINITIONS
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {etymologyInfo.otherDefinitions.slice(0, 2).map((defItem, idx) => (
                              <div key={idx} className="text-xs text-slate-700 font-medium flex items-start gap-1.5 bg-white/60 p-1.5 sm:p-2 rounded-xl border border-slate-200/60">
                                {defItem.partOfSpeech && (
                                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-slate-200/90 text-slate-600 rounded-md shrink-0 mt-0.5">
                                    {defItem.partOfSpeech}
                                  </span>
                                )}
                                <span className="italic leading-snug">"{defItem.definition}"</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ORIGIN / ETYMOLOGY */}
                    <div className="bg-slate-100/90 p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                      <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><span>🏛️</span> ORIGIN & ETYMOLOGY</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{source}</span>
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed">{origin}</p>
                    </div>

                    {/* FUN FACT */}
                    <div className="bg-amber-100/70 p-2.5 sm:p-3.5 rounded-2xl border border-amber-200/90 shadow-2xs">
                      <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-800 mb-1 flex items-center gap-1.5">
                        <span>💡</span> FUN FACT
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-amber-950 leading-relaxed">{funFact}</p>
                    </div>
                  </div>
                </div>

                {/* Navigation & Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2 mt-auto pt-2.5 sm:pt-3 border-t border-slate-200/80 w-full shrink-0">
                  <button 
                    onClick={() => startNewGame(false)} 
                    className="w-full sm:flex-1 glass-pill-dark text-white px-3.5 py-2 sm:py-2.5 rounded-2xl font-heading text-xs sm:text-sm shadow-xl btn-press flex items-center justify-center gap-1.5 hover:bg-slate-800 transition-all"
                  >
                    <span>🔄</span> Retry Level {game.level}
                  </button>
                  
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <button 
                      onClick={() => setShowLossModal(false)} 
                      className="flex-1 sm:flex-initial glass-button text-slate-800 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-2xl font-bold text-[11px] sm:text-xs uppercase tracking-wider shadow-xs hover:bg-white transition-all flex items-center justify-center gap-1"
                      title="Close modal to review board"
                    >
                      <span>👁️</span> Board
                    </button>
                    <button 
                      onClick={() => setIsQuestModalOpen(true)} 
                      className="flex-1 sm:flex-initial glass-button text-slate-800 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-2xl font-bold text-[11px] sm:text-xs uppercase tracking-wider shadow-xs hover:bg-white transition-all flex items-center justify-center gap-1"
                    >
                      <span>📖</span> Journal
                    </button>
                    <button 
                      onClick={() => setGame(prev => ({ ...prev, status: 'IDLE' }))} 
                      className="flex-1 sm:flex-initial glass-pill text-slate-700 hover:text-slate-900 bg-slate-200/80 hover:bg-slate-300/80 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-2xl font-bold text-[11px] sm:text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1"
                    >
                      <span>🏠</span> Menu
                    </button>
                  </div>
                </div>

              </div>
            </div>
          );
        })()}
      </main>
      
      <GlobalLeaderboardModal 
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        userCurrentLevel={game.level}
        userCurrentStreak={game.currentStreak}
      />

      <footer className="mt-auto py-1 text-slate-400 font-bold text-[10px] sm:text-xs uppercase tracking-widest shrink-0 text-center">
        Pointless Studios © 2025 • WordNet 3.1 Copyright © Princeton University
      </footer>
    </div>
  );
};

export default App;
