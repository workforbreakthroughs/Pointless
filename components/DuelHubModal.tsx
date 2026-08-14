import React, { useState, useEffect } from 'react';
import { 
  DuelRecord, 
  PlayerDuelStats, 
  getPlayerDuelStats, 
  createDuelChallenge, 
  searchPlayersForDuel, 
  subscribeToTopDuelLeaderboard,
  fetchDuelById,
  acceptDuelChallenge
} from '../services/duelService';
import { getFlagEmoji, getOrCreatePlayerId } from '../services/firebaseService';

interface DuelHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDuel: (duel: DuelRecord) => void;
  onViewDuelResult: (duel: DuelRecord) => void;
  initialChallengeDuelId?: string | null;
}

type TabType = 'QUICK' | 'CHALLENGE' | 'INVITE' | 'LEADERBOARD' | 'MY_DUELS';

const DuelHubModal: React.FC<DuelHubModalProps> = ({
  isOpen,
  onClose,
  onStartDuel,
  onViewDuelResult,
  initialChallengeDuelId
}) => {
  if (!isOpen) return null;

  const localPlayerId = getOrCreatePlayerId();
  const [activeTab, setActiveTab] = useState<TabType>('QUICK');
  const [playerStats, setPlayerStats] = useState<PlayerDuelStats | null>(null);

  // Challenge Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<PlayerDuelStats[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Invite Link State
  const [createdInviteDuel, setCreatedInviteDuel] = useState<DuelRecord | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState<boolean>(false);

  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState<PlayerDuelStats[]>([]);

  // Incoming / Direct Duel State
  const [directDuel, setDirectDuel] = useState<DuelRecord | null>(null);
  const [isAccepting, setIsAccepting] = useState<boolean>(false);
  const [isLoadingDirect, setIsLoadingDirect] = useState<boolean>(false);

  // Load stats and setup subscriptions
  useEffect(() => {
    getPlayerDuelStats().then(setPlayerStats);

    const unsubLeaderboard = subscribeToTopDuelLeaderboard(setLeaderboard);

    // If opened via URL challenge parameter
    if (initialChallengeDuelId) {
      setIsLoadingDirect(true);
      fetchDuelById(initialChallengeDuelId).then(d => {
        setDirectDuel(d);
        setIsLoadingDirect(false);
      });
    }

    return () => {
      unsubLeaderboard();
    };
  }, [initialChallengeDuelId]);

  // Handle Quick Duel Start
  const handleStartQuickDuel = async (vsBot: boolean = false) => {
    const duel = await createDuelChallenge({ isBotMatch: vsBot });
    onStartDuel(duel);
  };

  // Handle Challenge Search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const res = await searchPlayersForDuel(searchQuery);
    setSearchResults(res);
    setIsSearching(false);
  };

  // Handle Challenge Specific Player
  const handleChallengePlayer = async (targetPlayer: PlayerDuelStats) => {
    const duel = await createDuelChallenge({
      playerBId: targetPlayer.id,
      playerBHandle: targetPlayer.playerName,
      playerBCountry: targetPlayer.countryCode
    });
    onStartDuel(duel);
  };

  // Handle Generate Invite Link
  const handleGenerateInvite = async () => {
    setIsCreatingInvite(true);
    const duel = await createDuelChallenge({});
    setCreatedInviteDuel(duel);
    setIsCreatingInvite(false);
  };

  const getInviteUrl = (duelId: string) => {
    const origin = window.location.origin + window.location.pathname;
    return `${origin}?duel=${duelId}`;
  };

  const handleCopyInviteLink = () => {
    if (!createdInviteDuel) return;
    const url = getInviteUrl(createdInviteDuel.id);
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Handle Accept Direct Challenge
  const handleAcceptDirect = async () => {
    if (!directDuel) return;
    setIsAccepting(true);
    const updated = await acceptDuelChallenge(directDuel.id);
    setIsAccepting(false);
    if (updated) {
      onStartDuel(updated);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-800 dark:border-slate-700 rounded-3xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden my-auto max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white p-4 border-b-2 border-slate-800 dark:border-slate-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🥊</span>
            <div>
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-amber-400">POINTLESS DUEL</h2>
              <p className="text-[11px] font-semibold text-slate-400">1v1 Asynchronous Word Battle</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {playerStats && (
              <div className="bg-slate-800 dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-700/80 text-right">
                <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Rating</span>
                <span className="font-mono text-xs font-black text-amber-400">{playerStats.rating}</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white font-black text-sm bg-slate-800 dark:bg-slate-800 hover:bg-slate-700 dark:hover:bg-slate-700 w-8 h-8 rounded-full transition-all flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Incoming Challenge Banner (if opened via share link) */}
        {directDuel && directDuel.status !== 'completed' && directDuel.playerAId !== localPlayerId && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border-b-2 border-amber-200 dark:border-amber-800 p-4 text-center flex flex-col gap-2 shrink-0">
            <div className="text-amber-900 dark:text-amber-300 font-extrabold text-xs uppercase tracking-wider">
              🥊 DIRECT CHALLENGE RECEIVED
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              <span className="text-base">{getFlagEmoji(directDuel.playerACountry)}</span> {directDuel.playerAHandle} has challenged you to a 5-Word Duel!
            </p>
            <div className="flex items-center justify-center gap-2 mt-1">
              <button
                onClick={handleAcceptDirect}
                disabled={isAccepting}
                className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-extrabold text-xs px-5 py-2 rounded-xl transition-all shadow-sm"
              >
                {isAccepting ? 'Accepting...' : '⚔️ ACCEPT DUEL'}
              </button>
              <button
                onClick={() => setDirectDuel(null)}
                className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        {/* Tab Selector */}
        <div className="bg-slate-100 dark:bg-slate-800/80 p-1.5 border-b border-slate-200 dark:border-slate-700 flex items-center gap-1 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('QUICK')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
              activeTab === 'QUICK' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs border border-slate-200 dark:border-slate-700' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            ⚔️ Quick Duel
          </button>
          <button
            onClick={() => setActiveTab('CHALLENGE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
              activeTab === 'CHALLENGE' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs border border-slate-200 dark:border-slate-700' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            🎯 Challenge
          </button>
          <button
            onClick={() => setActiveTab('INVITE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
              activeTab === 'INVITE' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs border border-slate-200 dark:border-slate-700' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            🔗 Invite Friend
          </button>
          <button
            onClick={() => setActiveTab('LEADERBOARD')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
              activeTab === 'LEADERBOARD' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs border border-slate-200 dark:border-slate-700' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            🏆 Leaderboard
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto min-h-0 text-slate-900 dark:text-slate-100">
          
          {/* TAB 1: QUICK DUEL */}
          {activeTab === 'QUICK' && (
            <div className="flex flex-col gap-4 text-center items-center py-2">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-300 dark:border-amber-700 flex items-center justify-center text-3xl shadow-inner">
                🥊
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Quick Matchmaking</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium max-w-sm mt-1">
                  Compete in an asynchronous 5-word word battle against an eligible player of similar Duel Rating.
                </p>
              </div>

              <div className="w-full max-w-sm flex flex-col gap-2 pt-2">
                <button
                  onClick={() => handleStartQuickDuel(false)}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm py-3 rounded-2xl transition-all shadow-md active:scale-98 flex items-center justify-center gap-2"
                >
                  <span>⚔️ FIND MATCH & PLAY NOW</span>
                </button>

                <button
                  onClick={() => handleStartQuickDuel(true)}
                  className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>🤖 PRACTICE VS WORDSMITH BOT</span>
                </button>
              </div>

              {/* Player Record Footer */}
              {playerStats && (
                <div className="grid grid-cols-4 gap-2 w-full bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-center mt-3">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 dark:text-slate-500 block">Wins</span>
                    <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">{playerStats.wins}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 dark:text-slate-500 block">Losses</span>
                    <span className="font-mono font-black text-sm text-rose-600 dark:text-rose-400">{playerStats.losses}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 dark:text-slate-500 block">Draws</span>
                    <span className="font-mono font-black text-sm text-slate-600 dark:text-slate-400">{playerStats.draws}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 dark:text-slate-500 block">Streak</span>
                    <span className="font-mono font-black text-sm text-amber-600 dark:text-amber-400">🔥 {playerStats.streak}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CHALLENGE PLAYER */}
          {activeTab === 'CHALLENGE' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search player handle or ID..."
                  className="flex-1 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shrink-0"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>

              {searchResults.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-6">
                  {searchQuery ? 'No players found matching your search.' : 'Type a player name or handle to search.'}
                </p>
              ) : (
                <div className="flex flex-col gap-2 mt-1">
                  {searchResults.map(p => (
                    <div key={p.id} className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 p-3 rounded-2xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl shrink-0">{getFlagEmoji(p.countryCode)}</span>
                        <div className="min-w-0">
                          <span className="text-xs font-black text-slate-900 dark:text-white block truncate">{p.playerName}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            Level {p.level} • Rating: <strong className="font-mono text-amber-700 dark:text-amber-400">{p.rating}</strong>
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleChallengePlayer(p)}
                        className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-black text-xs px-3.5 py-1.5 rounded-xl transition-all shrink-0"
                      >
                        ⚔️ CHALLENGE
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: INVITE A FRIEND */}
          {activeTab === 'INVITE' && (
            <div className="flex flex-col gap-4 text-center items-center py-2">
              <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-300 dark:border-amber-700 flex items-center justify-center text-2xl shadow-inner">
                🔗
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Create Custom Challenge</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium max-w-sm mt-1">
                  Generate a unique shareable link. Anyone with the link can play the exact same 5-word duel with you!
                </p>
              </div>

              {!createdInviteDuel ? (
                <button
                  onClick={handleGenerateInvite}
                  disabled={isCreatingInvite}
                  className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-extrabold text-xs px-6 py-3 rounded-2xl transition-all shadow-md active:scale-98 mt-2"
                >
                  {isCreatingInvite ? 'Generating Link...' : '✨ GENERATE CHALLENGE LINK'}
                </button>
              ) : (
                <div className="w-full bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border-2 border-amber-200 dark:border-amber-800 flex flex-col gap-3 animate-in fade-in">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-800 dark:text-amber-400 block">Your Shareable Duel Link</span>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={getInviteUrl(createdInviteDuel.id)}
                      className="flex-1 font-mono text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 select-all"
                    />
                    <button
                      onClick={handleCopyInviteLink}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shrink-0"
                    >
                      {isCopied ? '✓ Copied!' : '📋 Copy Link'}
                    </button>
                  </div>

                  <p className="text-xs italic text-slate-500 dark:text-slate-400 font-medium bg-amber-100/50 dark:bg-amber-950/40 p-2 rounded-xl border border-amber-200/50 dark:border-amber-800/50">
                    "Pointless was already fun. Now I want to beat my ugly friend. :)"
                  </p>

                  <button
                    onClick={() => onStartDuel(createdInviteDuel)}
                    className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600 text-white font-black text-xs py-2.5 rounded-xl transition-all shadow-xs"
                  >
                    ▶ PLAY YOUR 5 WORDS NOW
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: LEADERBOARD */}
          {activeTab === 'LEADERBOARD' && (
            <div className="flex flex-col gap-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 px-1 flex justify-between items-center">
                <span>Rank & Player</span>
                <span>Duel Rating</span>
              </div>

              {leaderboard.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-6">Loading Duel Leaderboard...</p>
              ) : (
                leaderboard.map((item, index) => {
                  const isMe = item.id === localPlayerId;
                  return (
                    <div 
                      key={item.id}
                      className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all ${
                        isMe ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 shadow-2xs' : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                          index === 0 ? 'bg-amber-400 text-slate-950 shadow-2xs' :
                          index === 1 ? 'bg-slate-300 dark:bg-slate-600 text-slate-900 dark:text-white' :
                          index === 2 ? 'bg-amber-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="text-base shrink-0">{getFlagEmoji(item.countryCode)}</span>
                        <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {item.playerName} {isMe && <span className="text-[9px] text-amber-700 dark:text-amber-400 font-extrabold">(YOU)</span>}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 font-mono">
                        <span className="text-xs font-black text-amber-700 dark:text-amber-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {item.rating}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                          ({item.wins}W / {item.losses}L)
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default DuelHubModal;
