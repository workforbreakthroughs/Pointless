import React from 'react';
import { DuelRecord } from '../services/duelService';
import { getFlagEmoji, getOrCreatePlayerId } from '../services/firebaseService';

interface DuelResultModalProps {
  duel: DuelRecord;
  onRematch: () => void;
  onDuelAgain: () => void;
  onReturnToGame: () => void;
}

const DuelResultModal: React.FC<DuelResultModalProps> = ({
  duel,
  onRematch,
  onDuelAgain,
  onReturnToGame
}) => {
  const localPlayerId = getOrCreatePlayerId();
  const isPlayerA = duel.playerAId === localPlayerId;

  const myHandle = isPlayerA ? duel.playerAHandle : duel.playerBHandle;
  const myCountry = isPlayerA ? duel.playerACountry : duel.playerBCountry;
  const myScore = isPlayerA ? (duel.playerAResult?.totalScore || 0) : (duel.playerBResult?.totalScore || 0);
  const myDelta = isPlayerA ? (duel.ratingDeltaA || 0) : (duel.ratingDeltaB || 0);

  const opponentHandle = isPlayerA ? duel.playerBHandle : duel.playerAHandle;
  const opponentCountry = isPlayerA ? duel.playerBCountry : duel.playerACountry;
  const opponentScore = isPlayerA ? (duel.playerBResult?.totalScore || 0) : (duel.playerAResult?.totalScore || 0);

  const isWon = duel.winnerId === localPlayerId;
  const isDraw = duel.winnerId === 'DRAW';
  const isLost = !isWon && !isDraw;

  const decisive = duel.decisiveWord;

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onReturnToGame();
        }
      }}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white border-2 border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-200"
      >
        
        {/* Banner Header */}
        <div className={`p-6 text-center border-b-2 border-slate-800 text-white relative overflow-hidden ${
          isWon ? 'bg-gradient-to-b from-amber-500 to-amber-600' :
          isDraw ? 'bg-gradient-to-b from-blue-500 to-blue-600' :
          'bg-gradient-to-b from-slate-800 to-slate-900'
        }`}>
          <div className="text-4xl sm:text-5xl mb-1 animate-bounce">
            {isWon ? '🏆' : isDraw ? '🤝' : '✏️'}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
            {isWon ? 'DUEL VICTORY!' : isDraw ? 'POINTLESS DUEL DRAW' : 'GRAPHITE HAS BEEN HUMBLED'}
          </h2>
          <p className="text-xs font-semibold opacity-90 mt-1">
            {isWon ? `You defeated ${opponentHandle}!` : isDraw ? 'An equally matched battle of words!' : `${opponentHandle} wins the duel.`}
          </p>

          {/* Rating Delta Badge */}
          {myDelta !== 0 && (
            <div className="inline-flex items-center gap-1 font-mono font-black text-xs bg-black/30 backdrop-blur px-3 py-1 rounded-full mt-3 border border-white/20">
              <span>{myDelta > 0 ? '↗' : '↘'}</span>
              <span>{myDelta > 0 ? `+${myDelta}` : myDelta} Duel Rating</span>
            </div>
          )}
        </div>

        {/* Score Battle Cards */}
        <div className="p-4 sm:p-6 flex flex-col gap-4 bg-slate-50">
          <div className="grid grid-cols-2 gap-3 bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-sm relative">
            {/* VS Badge */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 text-amber-400 font-black text-xs px-2.5 py-1 rounded-full border-2 border-slate-800 shadow-md">
              VS
            </div>

            {/* Local Player */}
            <div className="flex flex-col items-center text-center gap-1">
              <span className="text-2xl">{getFlagEmoji(myCountry)}</span>
              <span className="text-xs font-black text-slate-800 truncate max-w-full">{myHandle}</span>
              <div className="font-mono font-black text-xl text-emerald-600 mt-1">
                {myScore.toLocaleString()}
              </div>
              <span className="text-[10px] font-bold uppercase text-slate-400">POINTS</span>
            </div>

            {/* Opponent */}
            <div className="flex flex-col items-center text-center gap-1">
              <span className="text-2xl">{getFlagEmoji(opponentCountry)}</span>
              <span className="text-xs font-black text-slate-800 truncate max-w-full">{opponentHandle}</span>
              <div className="font-mono font-black text-xl text-rose-600 mt-1">
                {opponentScore.toLocaleString()}
              </div>
              <span className="text-[10px] font-bold uppercase text-slate-400">POINTS</span>
            </div>
          </div>

          {/* Decisive Word Section */}
          {decisive && (
            <div className="bg-amber-50/80 border-2 border-amber-200/80 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-amber-900 font-black text-xs uppercase tracking-wider">
                <span>🎯 THE WORD THAT DECIDED IT</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-amber-200 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-base sm:text-lg text-slate-900 tracking-wider">
                    {decisive.word}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                    {decisive.category}
                  </span>
                </div>
                <p className="text-xs text-slate-600 italic">
                  "{decisive.clue}"
                </p>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs font-bold mt-1">
                  <div className="text-slate-800">
                    You: {isPlayerA ? (decisive.playerASolved ? '✅ Solved' : '❌ Failed') : (decisive.playerBSolved ? '✅ Solved' : '❌ Failed')}
                    <span className="block text-[11px] font-mono text-slate-500 font-normal">
                      ({isPlayerA ? decisive.playerAMistakes : decisive.playerBMistakes} mistakes — {isPlayerA ? decisive.playerAScore : decisive.playerBScore} pts)
                    </span>
                  </div>
                  <div className="text-slate-800">
                    Opponent: {isPlayerA ? (decisive.playerBSolved ? '✅ Solved' : '❌ Failed') : (decisive.playerASolved ? '✅ Solved' : '❌ Failed')}
                    <span className="block text-[11px] font-mono text-slate-500 font-normal">
                      ({isPlayerA ? decisive.playerBMistakes : decisive.playerAMistakes} mistakes — {isPlayerA ? decisive.playerBScore : decisive.playerAScore} pts)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={onRematch}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black text-sm py-3 rounded-xl transition-all shadow-md active:scale-98 flex items-center justify-center gap-2"
            >
              <span>⚔️ REMATCH THIS OPPONENT</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onDuelAgain}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>🥊 DUEL LOBBY</span>
              </button>
              <button
                onClick={onReturnToGame}
                className="bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs py-2.5 rounded-xl border border-slate-300 transition-all shadow-2xs flex items-center justify-center gap-1.5"
              >
                <span>🏠 POINTLESS GAME</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DuelResultModal;
