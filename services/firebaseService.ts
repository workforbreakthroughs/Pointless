import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  collection, 
  doc, 
  setDoc, 
  getDoc,
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  Unsubscribe 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Get Firestore instance using long-polling fallback auto-detection
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  }, firebaseConfig.firestoreDatabaseId || undefined);
} catch (e) {
  firestoreDb = firebaseConfig.firestoreDatabaseId 
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
}

export const db = firestoreDb;

export interface GlobalScoreRecord {
  id: string;
  playerName: string;
  countryCode: string;
  level: number;
  streak: number;
  updatedAt: string;
}

const GLOBAL_SCORES_COLLECTION = 'global_scores';

/**
 * Converts 2-letter ISO country code into regional indicator flag emoji
 */
export function getFlagEmoji(countryCode?: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const code = countryCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return '🌐';
  const codePoints = code
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/**
 * Popular countries list for player country selector
 */
export const POPULAR_COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹 font' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'UN', name: 'Global', flag: '🌐' },
];

/**
 * Auto-detect user country code based on browser locale/timezone
 */
export function detectUserCountryCode(): string {
  try {
    const languages = navigator.languages || [navigator.language];
    for (const lang of languages) {
      if (lang && lang.includes('-')) {
        const parts = lang.split('-');
        const region = parts[parts.length - 1].toUpperCase();
        if (region.length === 2 && /^[A-Z]{2}$/.test(region)) {
          return region;
        }
      }
    }
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      if (tz.includes('Manila')) return 'PH';
      if (tz.includes('New_York') || tz.includes('Los_Angeles') || tz.includes('Chicago')) return 'US';
      if (tz.includes('London')) return 'GB';
      if (tz.includes('Tokyo')) return 'JP';
      if (tz.includes('Sydney')) return 'AU';
      if (tz.includes('Toronto')) return 'CA';
    }
  } catch (e) {
    // fallback
  }
  return 'US';
}

// Helper to get or create a persistent Player ID for local browser
export function getOrCreatePlayerId(): string {
  const STORAGE_KEY = 'pointless_player_id';
  let playerId = localStorage.getItem(STORAGE_KEY);
  if (!playerId) {
    playerId = 'player_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    localStorage.setItem(STORAGE_KEY, playerId);
  }
  return playerId;
}

// Helper to get local Player Name
export function getStoredPlayerName(): string {
  const STORAGE_KEY = 'pointless_player_name';
  let name = localStorage.getItem(STORAGE_KEY);
  if (!name) {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    name = `Pencil Hero #${randomNum}`;
    localStorage.setItem(STORAGE_KEY, name);
  }
  return name;
}

// Helper to save local Player Name
export function setStoredPlayerName(name: string): string {
  const cleanName = name.trim().slice(0, 24) || 'Pencil Hero';
  localStorage.setItem('pointless_player_name', cleanName);
  return cleanName;
}

// Helper to get local Player Country Code
export function getStoredCountryCode(): string {
  const STORAGE_KEY = 'pointless_player_country';
  let country = localStorage.getItem(STORAGE_KEY);
  if (!country) {
    country = detectUserCountryCode();
    localStorage.setItem(STORAGE_KEY, country);
  }
  return country;
}

// Helper to save local Player Country Code
export function setStoredCountryCode(code: string): string {
  const cleanCode = (code.trim().toUpperCase().slice(0, 2)) || 'US';
  localStorage.setItem('pointless_player_country', cleanCode);
  return cleanCode;
}

/**
 * Returns the player's unique device sync key
 */
export function getUserSyncKey(): string {
  return getOrCreatePlayerId();
}

/**
 * Restores player progress from a unique sync key saved in Firestore
 */
export async function restorePlayerProgressWithKey(syncKey: string): Promise<{
  success: boolean;
  message?: string;
  record?: GlobalScoreRecord;
}> {
  const cleanKey = syncKey.trim();
  if (!cleanKey) {
    return { success: false, message: 'Please enter a valid unique key.' };
  }

  try {
    const docRef = doc(db, GLOBAL_SCORES_COLLECTION, cleanKey);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { 
        success: false, 
        message: 'No record found for this key. Please double-check your key.' 
      };
    }

    const data = docSnap.data();
    const record: GlobalScoreRecord = {
      id: docSnap.id,
      playerName: data.playerName || 'Pencil Hero',
      countryCode: data.countryCode || 'US',
      level: Math.max(1, Number(data.level) || 1),
      streak: Math.max(0, Number(data.streak) || 0),
      updatedAt: data.updatedAt || ''
    };

    // Update local browser identity and data to this restored sync key
    localStorage.setItem('pointless_player_id', record.id);
    setStoredPlayerName(record.playerName);
    setStoredCountryCode(record.countryCode);

    return {
      success: true,
      record
    };
  } catch (err) {
    console.error('Error restoring progress with key:', err);
    return {
      success: false,
      message: 'Failed to restore progress. Please check your network connection.'
    };
  }
}

/**
 * Real-time listener for the top global score (Highest Level reached globally)
 */
export function subscribeToGlobalTopScore(callback: (topRecord: GlobalScoreRecord | null) => void): Unsubscribe {
  const q = query(
    collection(db, GLOBAL_SCORES_COLLECTION),
    orderBy('level', 'desc'),
    limit(1)
  );

  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      const data = docSnap.data();
      callback({
        id: docSnap.id,
        playerName: data.playerName || 'Anonymous',
        countryCode: data.countryCode || 'US',
        level: Number(data.level) || 1,
        streak: Number(data.streak) || 0,
        updatedAt: data.updatedAt || ''
      });
    } else {
      callback(null);
    }
  }, (error) => {
    console.warn('Error listening to global top score:', error);
    callback(null);
  });
}

/**
 * Real-time listener for top 10 leaderboard
 */
export function subscribeToTopLeaderboard(callback: (records: GlobalScoreRecord[]) => void, topLimit = 10): Unsubscribe {
  const q = query(
    collection(db, GLOBAL_SCORES_COLLECTION),
    orderBy('level', 'desc'),
    limit(topLimit)
  );

  return onSnapshot(q, (snapshot) => {
    const records: GlobalScoreRecord[] = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        playerName: data.playerName || 'Anonymous',
        countryCode: data.countryCode || 'US',
        level: Number(data.level) || 1,
        streak: Number(data.streak) || 0,
        updatedAt: data.updatedAt || ''
      };
    });
    callback(records);
  }, (error) => {
    console.warn('Error listening to top leaderboard:', error);
    callback([]);
  });
}

/**
 * Submit or update a player's level to Firestore
 */
export async function updatePlayerGlobalScore(
  level: number, 
  streak: number = 0, 
  playerName?: string,
  countryCode?: string
): Promise<boolean> {
  try {
    const playerId = getOrCreatePlayerId();
    const finalName = playerName || getStoredPlayerName();
    const finalCountry = countryCode || getStoredCountryCode();
    const docRef = doc(db, GLOBAL_SCORES_COLLECTION, playerId);

    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const existingLevel = Number(docSnap.data().level) || 0;
      // Update if current level is higher or equal (to update handle/country)
      if (level >= existingLevel) {
        await setDoc(docRef, {
          playerName: finalName,
          countryCode: finalCountry,
          level: Math.max(level, existingLevel),
          streak: Math.max(streak, Number(docSnap.data().streak) || 0),
          updatedAt: new Date().toISOString()
        }, { merge: true });
        return true;
      }
    } else {
      // First submission
      await setDoc(docRef, {
        playerName: finalName,
        countryCode: finalCountry,
        level: Math.max(1, level),
        streak: Math.max(0, streak),
        updatedAt: new Date().toISOString()
      });
      return true;
    }
  } catch (err) {
    console.warn('Failed to update global score:', err);
  }
  return false;
}
