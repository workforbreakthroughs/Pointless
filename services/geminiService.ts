
import { GameData } from "../types";
import { fetchWordNetWord } from "./wordNetService";

export const fetchNewWord = async (level: number, excludeWords: string[] = []): Promise<GameData> => {
  return fetchWordNetWord(level, excludeWords);
};

