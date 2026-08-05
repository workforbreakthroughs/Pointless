import { GameData } from '../types';
import { getRandomFallbackWord } from '../data/fallbackWords';

export interface WordNetManifest {
  version: string;
  source: string;
  attribution: string;
  totalWords: number;
  tiers: {
    easy: { totalWords: number; totalChunks: number; files: string[] };
    medium: { totalWords: number; totalChunks: number; files: string[] };
    hard: { totalWords: number; totalChunks: number; files: string[] };
  };
}

// In-memory cache for loaded JSON chunks
const chunkCache = new Map<string, GameData[]>();
let manifestCache: WordNetManifest | null = null;

const getAssetUrl = (relativePath: string) => {
  const baseUrl = import.meta.env.BASE_URL || '/';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const cleanRelative = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  return `${cleanBase}${cleanRelative}`;
};

/**
 * Fetch the WordNet manifest metadata
 */
export const getWordNetManifest = async (): Promise<WordNetManifest | null> => {
  if (manifestCache) return manifestCache;
  try {
    const url = getAssetUrl('data/wordnet/manifest.json');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status} loading manifest`);
    manifestCache = await response.json();
    return manifestCache;
  } catch (err) {
    console.warn("Failed to load WordNet manifest:", err);
    return null;
  }
};

/**
 * Determine difficulty tier based on game level
 * Level 1-3: Easy (6k+ common words)
 * Level 4-7: Medium (21k+ words)
 * Level 8+: Hard (45k+ specialized words)
 */
export const getTierForLevel = (level: number): 'easy' | 'medium' | 'hard' => {
  if (level <= 3) return 'easy';
  if (level <= 7) return 'medium';
  return 'hard';
};

/**
 * Fetch a chunk of WordNet dictionary entries
 */
const loadChunk = async (fileName: string): Promise<GameData[]> => {
  if (chunkCache.has(fileName)) {
    return chunkCache.get(fileName)!;
  }

  const url = getAssetUrl(`data/wordnet/${fileName}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} loading ${fileName}`);
  const data: GameData[] = await response.json();
  chunkCache.set(fileName, data);
  return data;
};

/**
 * Select a random WordNet word for the given game level
 */
export const fetchWordNetWord = async (level: number, excludeWords: string[] = []): Promise<GameData> => {
  try {
    const manifest = await getWordNetManifest();
    
    if (!manifest) {
      console.warn("Using offline fallback dictionary.");
      return getRandomFallbackWord(level, excludeWords);
    }

    const tier = getTierForLevel(level);
    const tierMeta = manifest.tiers[tier];

    if (!tierMeta || !tierMeta.files || tierMeta.files.length === 0) {
      return getRandomFallbackWord(level, excludeWords);
    }

    // Pick a random chunk from the selected tier
    const randomChunkFile = tierMeta.files[Math.floor(Math.random() * tierMeta.files.length)];
    const words = await loadChunk(randomChunkFile);

    // Filter out already solved words in current session
    const upperExcluded = excludeWords.map(w => w.toUpperCase());
    const available = words.filter(item => !upperExcluded.includes(item.word.toUpperCase()));

    const pool = available.length > 0 ? available : words;
    const picked = pool[Math.floor(Math.random() * pool.length)];

    return {
      word: picked.word.toUpperCase(),
      category: picked.category,
      clue: picked.clue,
      extraClue: picked.extraClue
    };
  } catch (err) {
    console.warn("WordNet word fetch failed, falling back:", err);
    return getRandomFallbackWord(level, excludeWords);
  }
};
