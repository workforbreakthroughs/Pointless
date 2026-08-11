import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';
import { db, getOrCreatePlayerId, getStoredPlayerName, getStoredCountryCode } from './firebaseService';
import { fetchWordNetWord } from './wordNetService';
import { GameData } from '../types';

export interface DuelWord {
  word: string;
  category: string;
  clue: string;
  extraClue: string;
}

export interface DuelWordResult {
  word: string;
  category: string;
  clue: string;
  solved: boolean;
  mistakes: number;
  timeSeconds: number;
  hintsUsed: {
    revealLetter: boolean;
    extraHint: boolean;
    removeWrong: boolean;
  };
  score: number;
}

export interface DuelPlayerResult {
  completed: boolean;
  completedAt: string;
  wordResults: DuelWordResult[];
  totalScore: number;
}

export type DuelStatus = 'pending' | 'active' | 'completed' | 'declined' | 'expired';

export interface DecisiveWordInfo {
  word: string;
  category: string;
  clue: string;
  extraClue: string;
  scoreDiff: number;
  playerAMistakes: number;
  playerBMistakes: number;
  playerAScore: number;
  playerBScore: number;
  playerASolved: boolean;
  playerBSolved: boolean;
}

export interface DuelRecord {
  id: string;
  playerAId: string;
  playerBId: string;
  playerAHandle: string;
  playerBHandle: string;
  playerACountry: string;
  playerBCountry: string;
  playerARating: number;
  playerBRating: number;
  words: DuelWord[];
  status: DuelStatus;
  createdAt: string;
  acceptedAt?: string | null;
  completedAt?: string | null;
  playerAResult?: DuelPlayerResult | null;
  playerBResult?: DuelPlayerResult | null;
  winnerId?: string | 'DRAW' | null;
  ratingDeltaA?: number | null;
  ratingDeltaB?: number | null;
  decisiveWord?: DecisiveWordInfo | null;
  isBotMatch?: boolean;
}

export interface PlayerDuelStats {
  id: string;
  playerName: string;
  countryCode: string;
  rating: number;
  highestRating: number;
  wins: number;
  losses: number;
  draws: number;
  streak: number;
  level: number;
  updatedAt: string;
}

const DUELS_COLLECTION = 'duels';
const DUEL_STATS_COLLECTION = 'duel_stats';

/**
 * Centralized Duel Word Scoring Calculation
 */
export function calculateWordScore(
  solved: boolean,
  mistakes: number,
  timeSeconds: number,
  hintsUsed: { revealLetter?: boolean; extraHint?: boolean; removeWrong?: boolean }
): number {
  if (!solved) return 0;

  let score = 100; // Base points for correct answer

  // Mistake penalties:
  // 1 mistake: -10, 2: -20, 3: -35, 4: -50, 5: -65, 6: -80, 7+: -100
  const mistakePenalties = [0, 10, 20, 35, 50, 65, 80, 100];
  const penalty = mistakePenalties[Math.min(mistakes, 7)] || 100;
  score -= penalty;

  // Speed bonus
  if (timeSeconds < 10) {
    score += 30;
  } else if (timeSeconds < 20) {
    score += 20;
  } else if (timeSeconds < 30) {
    score += 10;
  }

  // Hint penalties
  if (hintsUsed.revealLetter) score -= 15;
  if (hintsUsed.extraHint) score -= 10;
  if (hintsUsed.removeWrong) score -= 10;

  return Math.max(0, score);
}

/**
 * Fetch or initialize local player duel stats
 */
export async function getPlayerDuelStats(playerId?: string): Promise<PlayerDuelStats> {
  const finalId = playerId || getOrCreatePlayerId();
  const name = getStoredPlayerName();
  const country = getStoredCountryCode();

  try {
    const docRef = doc(db, DUEL_STATS_COLLECTION, finalId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        playerName: data.playerName || name,
        countryCode: data.countryCode || country,
        rating: Number(data.rating) || 1000,
        highestRating: Number(data.highestRating) || Math.max(1000, Number(data.rating) || 1000),
        wins: Number(data.wins) || 0,
        losses: Number(data.losses) || 0,
        draws: Number(data.draws) || 0,
        streak: Number(data.streak) || 0,
        level: Number(data.level) || 1,
        updatedAt: data.updatedAt || new Date().toISOString()
      };
    }
  } catch (e) {
    console.warn("Failed to fetch player duel stats:", e);
  }

  // Default fallback stats
  const defaultStats: PlayerDuelStats = {
    id: finalId,
    playerName: name,
    countryCode: country,
    rating: 1000,
    highestRating: 1000,
    wins: 0,
    losses: 0,
    draws: 0,
    streak: 0,
    level: 1,
    updatedAt: new Date().toISOString()
  };

  // Create initial profile in Firestore
  try {
    await setDoc(doc(db, DUEL_STATS_COLLECTION, finalId), defaultStats, { merge: true });
  } catch (err) {
    // ignore
  }

  return defaultStats;
}

/**
 * Generate 5 words for a duel using WordNet
 */
export async function generateDuelWords(): Promise<DuelWord[]> {
  const words: DuelWord[] = [];
  const excluded: string[] = [];
  // Levels 1, 2, 3, 5, 8 to give a nice balanced curve
  const levels = [1, 2, 3, 5, 8];

  for (const level of levels) {
    const item: GameData = await fetchWordNetWord(level, excluded);
    words.push({
      word: item.word.toUpperCase(),
      category: item.category,
      clue: item.clue,
      extraClue: item.extraClue
    });
    excluded.push(item.word.toUpperCase());
  }

  return words;
}

/**
 * Create a new duel challenge
 */
export async function createDuelChallenge(options: {
  playerBId?: string;
  playerBHandle?: string;
  playerBCountry?: string;
  isBotMatch?: boolean;
}): Promise<DuelRecord> {
  const playerAStats = await getPlayerDuelStats();
  const words = await generateDuelWords();
  const duelId = 'duel_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);

  let status: DuelStatus = 'pending';
  let botResult: DuelPlayerResult | null = null;

  // If this is a bot/AI quick duel simulation
  if (options.isBotMatch) {
    status = 'active';
    // Generate simulated bot results
    const botWordResults: DuelWordResult[] = words.map((w, idx) => {
      const solved = Math.random() > 0.15;
      const mistakes = solved ? Math.floor(Math.random() * 3) : 7;
      const timeSeconds = Math.floor(12 + Math.random() * 20);
      const hintsUsed = { revealLetter: false, extraHint: false, removeWrong: false };
      const score = calculateWordScore(solved, mistakes, timeSeconds, hintsUsed);
      return {
        word: w.word,
        category: w.category,
        clue: w.clue,
        solved,
        mistakes,
        timeSeconds,
        hintsUsed,
        score
      };
    });

    const botTotalScore = botWordResults.reduce((sum, r) => sum + r.score, 0);
    botResult = {
      completed: true,
      completedAt: new Date().toISOString(),
      wordResults: botWordResults,
      totalScore: botTotalScore
    };
  } else if (options.playerBId) {
    status = 'active';
  }

  const record: DuelRecord = {
    id: duelId,
    playerAId: playerAStats.id,
    playerBId: options.playerBId || (options.isBotMatch ? 'bot_pencil_hero' : ''),
    playerAHandle: playerAStats.playerName,
    playerBHandle: options.playerBHandle || (options.isBotMatch ? 'WordSmith Bot 🤖' : 'Waiting for Opponent...'),
    playerACountry: playerAStats.countryCode,
    playerBCountry: options.playerBCountry || (options.isBotMatch ? 'UN' : 'UN'),
    playerARating: playerAStats.rating,
    playerBRating: options.isBotMatch ? 1020 : 1000,
    words,
    status,
    createdAt: new Date().toISOString(),
    acceptedAt: options.playerBId ? new Date().toISOString() : null,
    playerBResult: botResult,
    isBotMatch: !!options.isBotMatch
  };

  try {
    await setDoc(doc(db, DUELS_COLLECTION, duelId), record);
  } catch (err) {
    console.warn("Failed to create duel in Firestore:", err);
  }

  return record;
}

/**
 * Fetch a single duel by ID
 */
export async function fetchDuelById(duelId: string): Promise<DuelRecord | null> {
  try {
    const docRef = doc(db, DUELS_COLLECTION, duelId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as DuelRecord;
    }
  } catch (err) {
    console.warn("Error fetching duel by ID:", err);
  }
  return null;
}

/**
 * Subscribe to real-time changes on a specific duel
 */
export function subscribeToDuel(duelId: string, callback: (duel: DuelRecord | null) => void): Unsubscribe {
  const docRef = doc(db, DUELS_COLLECTION, duelId);
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() } as DuelRecord);
    } else {
      callback(null);
    }
  }, (err) => {
    console.warn("Error subscribing to duel:", err);
    callback(null);
  });
}

/**
 * Accept a duel challenge as Player B
 */
export async function acceptDuelChallenge(duelId: string): Promise<DuelRecord | null> {
  const playerBStats = await getPlayerDuelStats();
  const docRef = doc(db, DUELS_COLLECTION, duelId);

  try {
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;

    const currentData = docSnap.data() as DuelRecord;
    
    // Don't overwrite if already completed or declined
    if (currentData.status === 'completed' || currentData.status === 'declined') {
      return currentData;
    }

    const updatedData: Partial<DuelRecord> = {
      playerBId: playerBStats.id,
      playerBHandle: playerBStats.playerName,
      playerBCountry: playerBStats.countryCode,
      playerBRating: playerBStats.rating,
      status: 'active',
      acceptedAt: new Date().toISOString()
    };

    await setDoc(docRef, updatedData, { merge: true });
    return { ...currentData, ...updatedData } as DuelRecord;
  } catch (err) {
    console.warn("Error accepting duel challenge:", err);
    return null;
  }
}

/**
 * Submit a player's 5-word duel result
 */
export async function submitDuelResult(
  duelId: string,
  wordResults: DuelWordResult[]
): Promise<DuelRecord | null> {
  const localPlayerId = getOrCreatePlayerId();
  const docRef = doc(db, DUELS_COLLECTION, duelId);

  try {
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;

    const duel = { id: docSnap.id, ...docSnap.data() } as DuelRecord;
    const isPlayerA = duel.playerAId === localPlayerId;
    const isPlayerB = duel.playerBId === localPlayerId || (!duel.playerBId && !isPlayerA);

    const totalScore = wordResults.reduce((sum, r) => sum + r.score, 0);
    const resultObj: DuelPlayerResult = {
      completed: true,
      completedAt: new Date().toISOString(),
      wordResults,
      totalScore
    };

    let updatedA = duel.playerAResult;
    let updatedB = duel.playerBResult;

    if (isPlayerA) {
      updatedA = resultObj;
    } else {
      updatedB = resultObj;
    }

    const bothCompleted = !!(updatedA?.completed && updatedB?.completed);
    let newStatus: DuelStatus = duel.status;
    let winnerId: string | 'DRAW' | null = duel.winnerId || null;
    let ratingDeltaA = duel.ratingDeltaA || null;
    let ratingDeltaB = duel.ratingDeltaB || null;
    let decisiveWord: DecisiveWordInfo | null = duel.decisiveWord || null;

    if (bothCompleted) {
      newStatus = 'completed';
      const scoreA = updatedA!.totalScore;
      const scoreB = updatedB!.totalScore;

      if (scoreA > scoreB) {
        winnerId = duel.playerAId;
        ratingDeltaA = 25;
        ratingDeltaB = -20;
      } else if (scoreB > scoreA) {
        winnerId = duel.playerBId;
        ratingDeltaA = -20;
        ratingDeltaB = 25;
      } else {
        winnerId = 'DRAW';
        ratingDeltaA = 0;
        ratingDeltaB = 0;
      }

      // Calculate Decisive Word (word with largest score difference)
      let maxDiff = -1;
      let topDiffWord: DecisiveWordInfo | null = null;

      duel.words.forEach((w, idx) => {
        const resA = updatedA!.wordResults[idx];
        const resB = updatedB!.wordResults[idx];
        if (resA && resB) {
          const diff = Math.abs(resA.score - resB.score);
          if (diff > maxDiff) {
            maxDiff = diff;
            topDiffWord = {
              word: w.word,
              category: w.category,
              clue: w.clue,
              extraClue: w.extraClue,
              scoreDiff: diff,
              playerAMistakes: resA.mistakes,
              playerBMistakes: resB.mistakes,
              playerAScore: resA.score,
              playerBScore: resB.score,
              playerASolved: resA.solved,
              playerBSolved: resB.solved
            };
          }
        }
      });

      decisiveWord = topDiffWord;

      // Update ratings & stats in Firestore for both players if not a bot match
      await updatePlayerRatingAfterDuel(duel.playerAId, ratingDeltaA, winnerId === duel.playerAId, winnerId === 'DRAW');
      if (duel.playerBId && !duel.isBotMatch) {
        await updatePlayerRatingAfterDuel(duel.playerBId, ratingDeltaB, winnerId === duel.playerBId, winnerId === 'DRAW');
      }
    }

    const payload: Partial<DuelRecord> = {
      status: newStatus,
      completedAt: bothCompleted ? new Date().toISOString() : null,
      playerAResult: updatedA,
      playerBResult: updatedB,
      winnerId,
      ratingDeltaA,
      ratingDeltaB,
      decisiveWord
    };

    if (isPlayerB && !duel.playerBId) {
      const stats = await getPlayerDuelStats();
      payload.playerBId = stats.id;
      payload.playerBHandle = stats.playerName;
      payload.playerBCountry = stats.countryCode;
    }

    await setDoc(docRef, payload, { merge: true });
    return { ...duel, ...payload } as DuelRecord;

  } catch (err) {
    console.warn("Error submitting duel result:", err);
    return null;
  }
}

/**
 * Update rating & stats after duel completion
 */
async function updatePlayerRatingAfterDuel(
  playerId: string,
  ratingDelta: number,
  isWin: boolean,
  isDraw: boolean
) {
  try {
    const stats = await getPlayerDuelStats(playerId);
    const newRating = Math.max(100, stats.rating + ratingDelta);
    const newHighest = Math.max(stats.highestRating, newRating);
    const wins = stats.wins + (isWin ? 1 : 0);
    const losses = stats.losses + (!isWin && !isDraw ? 1 : 0);
    const draws = stats.draws + (isDraw ? 1 : 0);
    const streak = isWin ? stats.streak + 1 : (isDraw ? stats.streak : 0);

    const docRef = doc(db, DUEL_STATS_COLLECTION, playerId);
    await setDoc(docRef, {
      rating: newRating,
      highestRating: newHighest,
      wins,
      losses,
      draws,
      streak,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn("Failed to update player duel rating:", err);
  }
}

/**
 * Search players for Challenge mode
 */
export async function searchPlayersForDuel(searchQuery: string): Promise<PlayerDuelStats[]> {
  const clean = searchQuery.trim().toLowerCase();
  if (!clean) return [];

  const results: PlayerDuelStats[] = [];
  const localPlayerId = getOrCreatePlayerId();

  try {
    const q = query(
      collection(db, DUEL_STATS_COLLECTION),
      limit(20)
    );
    const snapshot = await getDocs(q);

    snapshot.docs.forEach(docSnap => {
      if (docSnap.id === localPlayerId) return;
      const data = docSnap.data();
      const name = (data.playerName || '').toLowerCase();
      if (name.includes(clean) || docSnap.id.toLowerCase().includes(clean)) {
        results.push({
          id: docSnap.id,
          playerName: data.playerName || 'Anonymous',
          countryCode: data.countryCode || 'US',
          rating: Number(data.rating) || 1000,
          highestRating: Number(data.highestRating) || 1000,
          wins: Number(data.wins) || 0,
          losses: Number(data.losses) || 0,
          draws: Number(data.draws) || 0,
          streak: Number(data.streak) || 0,
          level: Number(data.level) || 1,
          updatedAt: data.updatedAt || ''
        });
      }
    });

    // If few results in duel_stats, search global_scores as well
    if (results.length < 5) {
      const gq = query(collection(db, 'global_scores'), limit(20));
      const gsnap = await getDocs(gq);
      gsnap.docs.forEach(docSnap => {
        if (docSnap.id === localPlayerId) return;
        if (results.some(r => r.id === docSnap.id)) return;
        const data = docSnap.data();
        const name = (data.playerName || '').toLowerCase();
        if (name.includes(clean) || docSnap.id.toLowerCase().includes(clean)) {
          results.push({
            id: docSnap.id,
            playerName: data.playerName || 'Anonymous',
            countryCode: data.countryCode || 'US',
            rating: 1000,
            highestRating: 1000,
            wins: 0,
            losses: 0,
            draws: 0,
            streak: 0,
            level: Number(data.level) || 1,
            updatedAt: data.updatedAt || ''
          });
        }
      });
    }

  } catch (err) {
    console.warn("Error searching players for duel:", err);
  }

  return results;
}

/**
 * Subscribe to Top 10 Duel Leaderboard
 */
export function subscribeToTopDuelLeaderboard(callback: (records: PlayerDuelStats[]) => void, topLimit = 10): Unsubscribe {
  const q = query(
    collection(db, DUEL_STATS_COLLECTION),
    orderBy('rating', 'desc'),
    limit(topLimit)
  );

  return onSnapshot(q, (snapshot) => {
    const records: PlayerDuelStats[] = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        playerName: data.playerName || 'Anonymous',
        countryCode: data.countryCode || 'US',
        rating: Number(data.rating) || 1000,
        highestRating: Number(data.highestRating) || 1000,
        wins: Number(data.wins) || 0,
        losses: Number(data.losses) || 0,
        draws: Number(data.draws) || 0,
        streak: Number(data.streak) || 0,
        level: Number(data.level) || 1,
        updatedAt: data.updatedAt || ''
      };
    });
    callback(records);
  }, (error) => {
    console.warn('Error listening to top duel leaderboard:', error);
    callback([]);
  });
}
