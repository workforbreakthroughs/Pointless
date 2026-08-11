import React, { useState, useEffect } from 'react';
import { 
  GlobalScoreRecord, 
  subscribeToTopLeaderboard, 
  getOrCreatePlayerId, 
  getStoredPlayerName, 
  setStoredPlayerName,
  getStoredCountryCode,
  setStoredCountryCode,
  getFlagEmoji,
  POPULAR_COUNTRIES,
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
  const [countryCode, setCountryCode] = useState(getStoredCountryCode());
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempName, setTempName] = useState(playerName);
  const [tempCountry, setTempCountry] = useState(countryCode);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

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

  const handleSaveProfile = async () => {
    if (!tempName.trim()) return;
    setIsSavingProfile(true);
    const updatedName = setStoredPlayerName(tempName);
    const updatedCountry = setStoredCountryCode(tempCountry);
    setPlayerName(updatedName);
    setCountryCode(updatedCountry);
    setIsEditingProfile(false);
    
    // Sync to Firestore
    await updatePlayerGlobalScore(userCurrentLevel, userCurrentStreak, updatedName, updatedCountry);
    setIsSavingProfile(false);
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300"
    >
      <div className="w-full max-w-xl glass-panel bg-white/95 backdrop-blur-md text-slate-900 rounded-3xl p-4 sm:p-6 shadow-2xl border border-white/90 my-auto text-left flex flex-col gap-3.5 max-h-[calc(100dvh-2rem)] sm:max-h-[85vh] overflow-hidden relative animate-in zoom-in-95">
        
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
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-amber-400 text-amber-950 font-black text-xl sm:text-2xl flex items-center justify-center shadow-md shrink-0 ring-2 ring-amber-300">
                🏆
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-700 block">
                  Global Record Holder
                </span>
                <span className="text-base sm:text-lg font-bold text-slate-900 leading-tight flex items-center gap-1.5 truncate">
                  <span className="text-xl shrink-0" title={topRecord.countryCode}>
                    {getFlagEmoji(topRecord.countryCode)}
                  </span>
                  <span className="truncate max-w-[140px] sm:max-w-[220px]">
                    {topRecord.playerName}
                  </span>
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

        {/* Player Profile Bar with Handle & Country Selection */}
        <div className="bg-slate-100/90 border border-slate-200/80 rounded-2xl p-3 shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto">
            <span className="text-xl shrink-0" title={`Country: ${countryCode}`}>
              {getFlagEmoji(countryCode)}
            </span>
            <div className="min-w-0 flex-1 sm:flex-initial">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Your Profile & Flag</span>
              {isEditingProfile ? (
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <input 
                    type="text" 
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    maxLength={24}
                    className="text-xs font-bold bg-white text-slate-900 border border-slate-300 px-2.5 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 w-32 sm:w-40"
                    placeholder="Enter handle..."
                  />
                  
                  <select
                    value={tempCountry}
                    onChange={(e) => setTempCountry(e.target.value)}
                    className="text-xs font-bold bg-white text-slate-900 border border-slate-300 px-2 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 max-w-[130px]"
                  >
                    {POPULAR_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>

                  <button 
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold px-2.5 py-1 rounded-lg transition-all"
                  >
                    Save
                  </button>
                  <button 
                    onClick={() => { setTempName(playerName); setTempCountry(countryCode); setIsEditingProfile(false); }}
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-1 py-1"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold text-slate-800 truncate block">
                    {playerName}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-200/80 px-1.5 py-0.5 rounded-md">
                    {countryCode}
                  </span>
                </div>
              )}
            </div>
          </div>

          {!isEditingProfile && (
            <button 
              onClick={() => { setTempName(playerName); setTempCountry(countryCode); setIsEditingProfile(true); }}
              className="text-[11px] font-extrabold text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-300/80 px-2.5 py-1 rounded-xl transition-all shrink-0 self-end sm:self-center"
            >
              ✏️ Edit Profile
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
              Loading global scores...
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
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${rankBg} shrink-0`}>
                      {rankBadge}
                    </span>
                    <span className="text-base sm:text-lg shrink-0" title={item.countryCode}>
                      {getFlagEmoji(item.countryCode)}
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
