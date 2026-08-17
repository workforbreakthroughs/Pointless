export interface PlayedWordRecord {
  word: string;
  category: string;
  clue: string;
  extraClue?: string;
  status: 'WON' | 'LOST';
  level: number;
  timestamp: number;
  favorite?: boolean;
}

export interface CompactJournalRecord {
  w: string;       // word
  c: string;       // category
  d: string;       // clue/definition
  s: 1 | 0;        // 1 = WON, 0 = LOST
  l: number;       // level
  t: number;       // timestamp in ms
  f?: 1;           // 1 = favorite
}

const STORAGE_KEY = 'pointless_played_words_codex';

/**
 * Converts rich client-side word records into ultra-compact Firestore-friendly tuples
 */
export function toCompactJournal(records: PlayedWordRecord[]): CompactJournalRecord[] {
  return records.map(r => ({
    w: r.word.toUpperCase().trim(),
    c: r.category || 'General',
    d: r.clue || '',
    s: r.status === 'WON' ? 1 : 0,
    l: Math.max(1, r.level || 1),
    t: r.timestamp || Date.now(),
    ...(r.favorite ? { f: 1 as const } : {})
  }));
}

/**
 * Hydrates compact Firestore records into full client-side journal records
 */
export function fromCompactJournal(compactList: CompactJournalRecord[]): PlayedWordRecord[] {
  if (!Array.isArray(compactList)) return [];
  return compactList.map(c => ({
    word: c.w.toUpperCase(),
    category: c.c || 'General',
    clue: c.d || 'A word from the Princeton WordNet lexicon.',
    status: c.s === 1 ? 'WON' : 'LOST',
    level: Math.max(1, c.l || 1),
    timestamp: c.t || Date.now(),
    favorite: c.f === 1
  }));
}

/**
 * Retrieves all played word records from browser storage
 */
export function getStoredPlayedWords(): PlayedWordRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.warn("Failed to load played words from storage:", err);
  }
  return [];
}

/**
 * Saves or updates a played word entry
 */
export function recordPlayedWord(entry: {
  word: string;
  category: string;
  clue: string;
  extraClue?: string;
  status: 'WON' | 'LOST';
  level: number;
}): PlayedWordRecord[] {
  try {
    const existing = getStoredPlayedWords();
    const upper = entry.word.toUpperCase().trim();
    
    const existingIndex = existing.findIndex(item => item.word.toUpperCase() === upper);
    let updated: PlayedWordRecord[];

    if (existingIndex >= 0) {
      const prev = existing[existingIndex];
      // If previously lost but now won, upgrade status to WON
      const finalStatus = (prev.status === 'WON' || entry.status === 'WON') ? 'WON' : 'LOST';
      const updatedItem: PlayedWordRecord = {
        ...prev,
        category: entry.category || prev.category,
        clue: entry.clue || prev.clue,
        extraClue: entry.extraClue || prev.extraClue,
        status: finalStatus,
        level: Math.max(prev.level, entry.level),
        timestamp: Date.now(),
        favorite: prev.favorite
      };
      updated = [
        updatedItem,
        ...existing.filter((_, idx) => idx !== existingIndex)
      ];
    } else {
      const newItem: PlayedWordRecord = {
        word: upper,
        category: entry.category || 'General',
        clue: entry.clue || 'A word from the Princeton WordNet lexicon.',
        extraClue: entry.extraClue,
        status: entry.status,
        level: Math.max(1, entry.level),
        timestamp: Date.now(),
        favorite: false
      };
      updated = [newItem, ...existing];
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn("Failed to record played word:", err);
    return getStoredPlayedWords();
  }
}

/**
 * Toggles favorite/bookmark for a word
 */
export function toggleFavoriteWord(word: string): PlayedWordRecord[] {
  try {
    const existing = getStoredPlayedWords();
    const upper = word.toUpperCase().trim();
    const updated = existing.map(item => {
      if (item.word.toUpperCase() === upper) {
        return { ...item, favorite: !item.favorite };
      }
      return item;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn("Failed to toggle favorite:", err);
    return getStoredPlayedWords();
  }
}

/**
 * Replaces or merges cloud journal records into local storage
 */
export function mergeCloudJournal(cloudRecords: CompactJournalRecord[]): PlayedWordRecord[] {
  try {
    const local = getStoredPlayedWords();
    const localMap = new Map<string, PlayedWordRecord>();
    local.forEach(item => localMap.set(item.word.toUpperCase(), item));

    const cloudHydrated = fromCompactJournal(cloudRecords);
    cloudHydrated.forEach(item => {
      const key = item.word.toUpperCase();
      if (localMap.has(key)) {
        const existing = localMap.get(key)!;
        localMap.set(key, {
          ...existing,
          status: (existing.status === 'WON' || item.status === 'WON') ? 'WON' : 'LOST',
          level: Math.max(existing.level, item.level),
          favorite: existing.favorite || item.favorite,
          timestamp: Math.max(existing.timestamp, item.timestamp)
        });
      } else {
        localMap.set(key, item);
      }
    });

    const merged = Array.from(localMap.values()).sort((a, b) => b.timestamp - a.timestamp);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch (err) {
    console.warn("Failed to merge cloud journal:", err);
    return getStoredPlayedWords();
  }
}
