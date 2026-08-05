
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
  streakMaster: boolean;    // 20 letters in a row (cumulative)
  speedDemon: boolean;      // Solve 7+ letter word in < 15s
  perfectionist: boolean;   // 3 perfect games in a row
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
