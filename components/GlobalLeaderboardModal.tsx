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
  updatePlayerGlobalScore,
  getUserSyncKey,
  restorePlayerProgressWithKey 
} from '../services/firebaseService';

interface GlobalLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCurrentLevel: number;
  userCurrentStreak: number;
  onProgressRestored?: (restoredLevel: number, restoredStreak: number, restoredKey: string) => void;
}

export const GlobalLeaderboardModal: React.FC<GlobalLeaderboardModalProps> = ({
  isOpen,
  onClose,
  userCurrentLevel,
  userCurrentStreak,
  onProgressRestored,
}) => {
  const [leaderboard, setLeaderboard] = useState<GlobalScoreRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playerName, setPlayerName] = useState(getStoredPlayerName());
  const [countryCode, setCountryCode] = useState(getStoredCountryCode());
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempName, setTempName] = useState(playerName);
  const [tempCountry, setTempCountry] = useState(countryCode);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Device Sync Key state
  const [syncKey, setSyncKey] = useState(getUserSyncKey());
  const [isCopied, setIsCopied] = useState(false);
  const [showSyncBox, setShowSyncBox] = useState(false);
  const [inputSyncKey, setInputSyncKey] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const localPlayerId = getOrCreatePlayerId();

  useEffect(() => {
    if (!isOpen) return;

    setSyncKey(getUserSyncKey());
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

  const handleCopySyncKey = async () => {
    try {
      await navigator.clipboard.writeText(syncKey);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      // Fallback
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleRestoreProgress = async () => {
    if (!inputSyncKey.trim()) return;
    setIsRestoring(true);
    setRestoreMessage(null);

    const result = await restorePlayerProgressWithKey(inputSyncKey);
    setIsRestoring(false);

    if (result.success && result.record) {
      const rec = result.record;
      setPlayerName(rec.playerName);
      setCountryCode(rec.countryCode);
      setSyncKey(rec.id);
      setRestoreMessage({
        type: 'success',
        text: `Progress restored! Logged in as ${rec.playerName} at Level ${rec.level}.`
      });
      setInputSyncKey('');
      
      if (onProgressRestored) {
        onProgressRestored(rec.level, rec.streak, rec.id);
      }
    } else {
      setRestoreMessage({
        type: 'error',
        text: result.message || 'Key not found.'
      });
    }
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-6 bg-slate-950/40 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-300"
    >
      <div className="w-full max-w-xl glass-panel bg-white/95 backdrop-blur-md text-slate-900 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-2xl border border-white/90 my-auto text-left flex flex-col max-h-[calc(100dvh-0.75rem)] sm:max-h-[88vh] overflow-hidden relative animate-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 sm:pb-3 shrink-0 mb-1.5 sm:mb-3">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <span className="text-2xl sm:text-4xl">👑</span>
            <div>
              <h3 className="text-lg sm:text-2xl font-heading text-amber-600 leading-none">Global High Score</h3>
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 mt-0.5 sm:mt-1 block">
                World's Highest Achieved Level
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300/90 text-slate-600 hover:text-slate-900 font-bold text-sm flex items-center justify-center transition-all btn-press shadow-2xs shrink-0"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Modal Content Body */}
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-2.5 sm:gap-3.5 px-3 sm:px-4 py-2 text-slate-900">
          {/* Global Peak Hero Box */}
          {topRecord ? (
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-yellow-500/10 border border-amber-300/80 rounded-2xl p-2.5 sm:p-4 shrink-0 shadow-xs flex items-center justify-between gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-13 sm:h-13 rounded-2xl bg-amber-400 text-amber-950 font-black text-base sm:text-2xl flex items-center justify-center shadow-md shrink-0 ring-2 ring-amber-300">
                  🏆
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-700 block">
                    Global Record Holder
                  </span>
                  <span className="text-xs sm:text-lg font-bold text-slate-900 leading-tight flex items-center gap-1.5 truncate">
                    <span className="text-base sm:text-xl shrink-0" title={topRecord.countryCode}>
                      {getFlagEmoji(topRecord.countryCode)}
                    </span>
                    <span className="truncate max-w-[120px] sm:max-w-[220px]">
                      {topRecord.playerName}
                    </span>
                  </span>
                  {topRecord.updatedAt && (
                    <span className="text-[9px] sm:text-[10px] text-slate-500 font-semibold block mt-0.5">
                      Updated {new Date(topRecord.updatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-amber-700 block">Peak Level</span>
                <span className="text-lg sm:text-3xl font-black text-amber-600 tracking-tight leading-none block">
                  Level {topRecord.level}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-100/80 border border-slate-200 rounded-2xl p-2.5 sm:p-4 text-center text-slate-500 text-xs font-semibold shrink-0">
              Fetching global top score...
            </div>
          )}

          {/* Player Profile Bar with Handle & Country Selection */}
          <div className="bg-slate-100/90 border border-slate-200/80 rounded-2xl p-2 sm:p-3 shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto">
              <span className="text-base sm:text-xl shrink-0" title={`Country: ${countryCode}`}>
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

          {/* Device Sync & Transfer Toggle Box */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2 sm:p-3 shrink-0 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base shrink-0">🔑</span>
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Your Device Sync Key</span>
                  <code className="text-[11px] font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 select-all block truncate max-w-[150px] sm:max-w-[280px]">
                    {syncKey}
                  </code>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleCopySyncKey}
                  className="text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded-xl transition-all shadow-2xs flex items-center gap-1"
                  title="Copy Unique Key"
                >
                  {isCopied ? '✓ Copied!' : '📋 Copy Key'}
                </button>
                <button
                  onClick={() => setShowSyncBox(!showSyncBox)}
                  className="text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded-xl transition-all shadow-2xs"
                >
                  {showSyncBox ? 'Close' : '🔄 Sync Device'}
                </button>
              </div>
            </div>

            {/* Sync Key Restore Sub-Panel */}
            {showSyncBox && (
              <div className="pt-2 border-t border-slate-200/80 flex flex-col gap-2 animate-in fade-in duration-200">
                <p className="text-[11px] text-slate-600 font-medium leading-tight">
                  Switching devices? Enter or paste your Unique Sync Key from another device to restore your level and rank:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputSyncKey}
                    onChange={(e) => setInputSyncKey(e.target.value)}
                    placeholder="Paste Unique Sync Key..."
                    className="flex-1 text-xs font-mono font-semibold bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <button
                    onClick={handleRestoreProgress}
                    disabled={isRestoring || !inputSyncKey.trim()}
                    className="text-xs bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-xl transition-all shrink-0"
                  >
                    {isRestoring ? 'Restoring...' : 'Restore Level'}
                  </button>
                </div>

                {restoreMessage && (
                  <div className={`text-xs font-bold p-2 rounded-xl text-center border ${
                    restoreMessage.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    {restoreMessage.text}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Top 10 Leaderboard List */}
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1 px-1 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur-sm py-1 z-10 border-b border-slate-100">
              <span>Rank & Player</span>
              <span>Highest Level</span>
            </div>

            {isLoading ? (
              <div className="py-6 text-center text-slate-400 text-xs font-semibold animate-pulse">
                Loading global scores...
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs font-semibold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
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
                    className={`flex items-center justify-between p-2 sm:p-3 rounded-2xl border transition-all ${
                      isLocalUser 
                        ? 'bg-amber-50/95 border-2 border-amber-400 shadow-2xs font-semibold' 
                        : 'bg-white/80 border-slate-200/80 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 pl-0.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${rankBg} shrink-0`}>
                        {rankBadge}
                      </span>
                      <span className="text-base sm:text-lg shrink-0" title={item.countryCode}>
                        {getFlagEmoji(item.countryCode)}
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 truncate block">
                          {item.playerName} {isLocalUser && <span className="text-[10px] text-amber-700 font-black uppercase">(You)</span>}
                        </span>
                        {item.streak > 0 && (
                          <span className="text-[10px] font-bold text-amber-600 block">
                            🔥 {item.streak} Win Streak
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 pr-0.5">
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
          <div className="pt-2 border-t border-slate-200/80 text-center shrink-0 mt-2">
            <p className="text-[11px] font-semibold text-slate-400">
              Play and clear higher levels to climb the real-time global leaderboard!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
