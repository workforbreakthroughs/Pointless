import React, { useState, useEffect } from 'react';
import { 
  GlobalScoreRecord, 
  subscribeToTopLeaderboard, 
  getOrCreatePlayerId, 
  getStoredPlayerName, 
  setStoredPlayerName, 
  updatePlayerGlobalScore 
} from '../services/firebaseService';

interface GlobalLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCurrentLevel: number;
  userCurrentStreak: number;
}

export const GlobalLeaderboardModal: React.FC<GlobalLeaderboardModalProps> = ({
  isOpen,
  onClose,
  userCurrentLevel,
  userCurrentStreak,
}) => {
  const [leaderboard, setLeaderboard] = useState<GlobalScoreRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playerName, setPlayerName] = useState(getStoredPlayerName());
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(playerName);
  const [isSavingName, setIsSavingName] = useState(false);

  const localPlayerId = getOrCreatePlayerId();

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    const unsubscribe = subscribeToTopLeaderboard((records) => {
      setLeaderboard(records);
      setIsLoading(false);
    }, 10);

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const topRecord = leaderboard.length > 0 ? leaderboard[0] : null;

  const handleSaveName = async () => {
    if (!tempName.trim()) return;
    setIsSavingName(true);
    const updated = setStoredPlayerName(tempName);
    setPlayerName(updated);
    setIsEditingName(false);
    
    // Sync to Firestore
    await updatePlayerGlobalScore(userCurrentLevel, userCurrentStreak, updated);
    setIsSavingName(false);
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300"
    >
      <div className="w-full max-w-xl glass-panel bg-white/90 backdrop-blur-md text-slate-900 rounded-3xl p-4 sm:p-6 shadow-2xl border border-white/90 my-auto text-left flex flex-col gap-3.5 max-h-[calc(100dvh-2rem)] sm:max-h-[85vh] overflow-hidden relative animate-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl sm:text-4xl">👑</span>
            <div>
              <h3 className="text-xl sm:text-2xl font-heading text-amber-600 leading-none">Global High Score</h3>
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 mt-1 block">
                World's Highest Achieved Level
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300/90 text-slate-600 hover:text-slate-900 font-bold text-sm flex items-center justify-center transition-all btn-press shadow-2xs"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Global Peak Hero Box */}
        {topRecord ? (
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-yellow-500/10 border border-amber-300/80 rounded-2xl p-3.5 sm:p-4 shrink-0 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-amber-400 text-amber-950 font-black text-xl sm:text-2xl flex items-center justify-center shadow-md shrink-0 ring-2 ring-amber-300">
                🏆
              </div>
              <div>
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-700 block">
                  Global Record Holder
                </span>
                <span className="text-base sm:text-lg font-bold text-slate-900 leading-tight block truncate max-w-[160px] sm:max-w-[240px]">
                  {topRecord.playerName}
                </span>
                {topRecord.updatedAt && (
                  <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                    Updated {new Date(topRecord.updatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">Peak Level</span>
              <span className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight leading-none block">
                Level {topRecord.level}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-100/80 border border-slate-200 rounded-2xl p-4 text-center text-slate-500 text-xs font-semibold shrink-0">
            Fetching global top score...
          </div>
        )}

        {/* Player Name Profile Bar */}
        <div className="bg-slate-100/90 border border-slate-200/80 rounded-2xl p-3 shrink-0 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg shrink-0">👤</span>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Your Handle</span>
              {isEditingName ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <input 
                    type="text" 
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    maxLength={24}
                    className="text-xs sm:text-sm font-bold bg-white text-slate-900 border border-slate-300 px-2 py-0.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 w-36 sm:w-48"
                    placeholder="Enter handle..."
                  />
                  <button 
                    onClick={handleSaveName}
                    disabled={isSavingName}
                    className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold px-2.5 py-1 rounded-lg transition-all"
                  >
                    Save
                  </button>
                  <button 
                    onClick={() => { setTempName(playerName); setIsEditingName(false); }}
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-1 py-1"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <span className="text-xs sm:text-sm font-bold text-slate-800 truncate block">
                  {playerName}
                </span>
              )}
            </div>
          </div>

          {!isEditingName && (
            <button 
              onClick={() => { setTempName(playerName); setIsEditingName(true); }}
              className="text-[11px] font-extrabold text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-300/80 px-2.5 py-1 rounded-xl transition-all shrink-0"
            >
              ✏️ Edit
            </button>
          )}
        </div>

        {/* Top 10 Leaderboard List */}
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-1.5 pr-1">
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1 px-1 flex justify-between items-center">
            <span>Rank & Player</span>
            <span>Highest Level</span>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-slate-400 text-xs font-semibold animate-pulse">
              Loading leaderboard data...
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs font-semibold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No global scores recorded yet. Be the first to claim Level 1!
            </div>
          ) : (
            leaderboard.map((item, index) => {
              const rank = index + 1;
              const isLocalUser = item.id === localPlayerId;
              
              let rankBadge = `#${rank}`;
              let rankBg = 'bg-slate-200 text-slate-700';
              if (rank === 1) {
                rankBadge = '🥇 #1';
                rankBg = 'bg-amber-400 text-amber-950 font-black shadow-xs';
              } else if (rank === 2) {
                rankBadge = '🥈 #2';
                rankBg = 'bg-slate-300 text-slate-900 font-bold';
              } else if (rank === 3) {
                rankBadge = '🥉 #3';
                rankBg = 'bg-amber-700/20 text-amber-900 font-bold';
              }

              return (
                <div 
                  key={item.id}
                  className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all ${
                    isLocalUser 
                      ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400/40 shadow-xs' 
                      : 'bg-white/70 border-slate-200/80 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full ${rankBg} shrink-0`}>
                      {rankBadge}
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 truncate block">
                        {item.playerName} {isLocalUser && <span className="text-[10px] text-amber-600 font-extrabold uppercase">(You)</span>}
                      </span>
                      {item.streak > 0 && (
                        <span className="text-[10px] font-bold text-amber-600 block">
                          🔥 {item.streak} Win Streak
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs sm:text-sm font-black text-slate-800 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200/80">
                      Level {item.level}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-200/80 text-center shrink-0">
          <p className="text-[11px] font-semibold text-slate-400">
            Play and clear higher levels to climb the real-time global leaderboard!
          </p>
        </div>
      </div>
    </div>
  );
};
