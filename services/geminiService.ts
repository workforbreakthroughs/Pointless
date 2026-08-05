
import { GoogleGenAI, Type } from "@google/genai";
import { GameData } from "../types";
import { getRandomFallbackWord } from "../data/fallbackWords";

export const fetchNewWord = async (level: number, excludeWords: string[] = []): Promise<GameData> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

  if (!apiKey || apiKey === "undefined" || apiKey.trim() === "") {
    console.warn("No Gemini API key found, using curated fallback dictionary.");
    return getRandomFallbackWord(level, excludeWords);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Scale difficulty based on level
    const difficulty = level < 3 ? "straightforward but interesting" : level < 6 ? "moderately complex" : "highly obscure and specific";
    const lengthRange = level < 3 ? "5 to 7" : level < 6 ? "7 to 10" : "9 to 14";
    
    // Randomize a sub-topic to force variety
    const subTopics = [
      "Ancient Architecture", "Quantum Concepts", "Rare Fauna", "Culinary History", 
      "Mid-Century Tech", "Nautical Terms", "Musical Theory", "Geological Oddities",
      "Space Exploration (non-planets)", "Literary Movements", "Botany", "Mythology"
    ];
    const anchor = subTopics[Math.floor(Math.random() * subTopics.length)];

    const excludeListString = excludeWords.length > 0 
      ? `\nCRITICAL: DO NOT use any of these previously solved words: ${excludeWords.join(', ')}.` 
      : "";

    const forbiddenCliches = "MARS, OZONE, PIXEL, APPLE, PIZZA, PLATYPUS, EINSTEIN, ROBOT, COFFEE, PYTHON, GALAXY, ATOM";

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a single ${difficulty} general knowledge word of ${lengthRange} letters.
      
      Topic focus: ${anchor}.
      
      RULES:
      1. NEVER use these overused AI clichés: ${forbiddenCliches}.
      2. The word must be a real noun or specific name.
      3. The clue must be witty and engaging.
      4. Provide a direct extra clue for when the user is stuck.
      ${excludeListString}
      
      clue: A clever, slightly cryptic crossword-style hint.
      extraClue: A helpful, direct factual hint.
      category: A creative category name (e.g., 'Lost Civilizations', 'Synth-wave Vibes').`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: {
              type: Type.STRING,
              description: "The target word in uppercase.",
            },
            category: {
              type: Type.STRING,
              description: "A fun category name related to the trivia.",
            },
            clue: {
              type: Type.STRING,
              description: "The primary witty trivia clue.",
            },
            extraClue: {
              type: Type.STRING,
              description: "A more direct, helpful fact.",
            },
          },
          required: ["word", "category", "clue", "extraClue"],
        },
      },
    });

    if (!response.text) {
      throw new Error("Empty response from Gemini API");
    }

    const data = JSON.parse(response.text);
    return {
      word: data.word.toUpperCase().trim(),
      category: data.category,
      clue: data.clue,
      extraClue: data.extraClue,
    };
  } catch (error) {
    console.warn("Gemini API call or parsing failed, falling back to offline dictionary:", error);
    return getRandomFallbackWord(level, excludeWords);
  }
};
