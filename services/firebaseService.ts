import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
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

// Get Firestore instance using the custom database ID from config if present
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export interface GlobalScoreRecord {
  id: string;
  playerName: string;
  level: number;
  streak: number;
  updatedAt: string;
}

const GLOBAL_SCORES_COLLECTION = 'global_scores';

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
export async function updatePlayerGlobalScore(level: number, streak: number = 0, playerName?: string): Promise<boolean> {
  try {
    const playerId = getOrCreatePlayerId();
    const finalName = playerName || getStoredPlayerName();
    const docRef = doc(db, GLOBAL_SCORES_COLLECTION, playerId);

    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const existingLevel = Number(docSnap.data().level) || 0;
      // Only update if current level is higher, OR level is equal (to update streak/name)
      if (level >= existingLevel) {
        await setDoc(docRef, {
          playerName: finalName,
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
