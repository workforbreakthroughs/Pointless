
export interface GameData {
  word: string;
  category: string;
  clue: string;
  extraClue: string;
}

export type GameStatus = 'IDLE' | 'LOADING' | 'PLAYING' | 'WON' | 'LOST';

export interface PowerState {
  revealLetterUsed: boolean;
  extraHintUsed: boolean;
  removeWrongUsed: boolean;
}

export interface QuestState {
  streakMaster: boolean;    // 20 letters in a row (cumulative) - unlocks Lead Cinch
  speedDemon: boolean;      // Solve 7+ letter word in < 15s - unlocks Bright Idea
  perfectionist: boolean;   // 3 perfect games in a row - unlocks Eraser
  wordSmithNovice: boolean; // Solve 5 total words
  wordSmithTitan: boolean;  // Solve 20 total words
  levelClimber: boolean;    // Reach Level 5
  hardcoreScholar: boolean; // Solve a Hard Tier word (Level 8+)
  comebackKid: boolean;     // Win a game with only 1 mistake left
  pureInstinct: boolean;    // Win a game without using any power-ups
}

export interface GameState {
  status: GameStatus;
  word: string;
  category: string;
  clue: string;
  extraClue: string;
  guessedLetters: string[];
  mistakes: number;
  maxMistakes: number;
  level: number;
  powers: PowerState;
  quests: QuestState;
  removedLetters: string[];
  timeLeft: number;
  initialTime: number;
  currentStreak: number;     // For Streak Master
  perfectStreak: number;     // For Perfectionist (consecutive games)
}
