export interface FallbackWord {
  word: string;
  category: string;
  clue: string;
  extraClue: string;
  levelRange: [number, number]; // [minLevel, maxLevel]
}

export const FALLBACK_WORDS: FallbackWord[] = [
  {
    word: "OBSIDIAN",
    category: "Volcanic Wonders",
    clue: "Nature's sharpest glass, forged in the heat of a volcano.",
    extraClue: "A dark volcanic glass formed when lava cools rapidly.",
    levelRange: [1, 3]
  },
  {
    word: "PENDULUM",
    category: "Physics & Time",
    clue: "I swing back and forth, keeping steady rhythm for ancient clocks.",
    extraClue: "A weight suspended from a pivot so that it can swing freely.",
    levelRange: [1, 3]
  },
  {
    word: "CHAMELEON",
    category: "Curious Creatures",
    clue: "A master of disguise that looks two directions at once.",
    extraClue: "A specialized lizard known for changing skin colors.",
    levelRange: [1, 3]
  },
  {
    word: "ARCHIPELAGO",
    category: "Geography",
    clue: "A vast cluster or chain of islands scattered across the blue.",
    extraClue: "Think of places like Hawaii or the Philippines.",
    levelRange: [1, 4]
  },
  {
    word: "LABYRINTH",
    category: "Ancient Lore",
    clue: "A complex network of winding paths where it's easy to lose your way.",
    extraClue: "The mythical maze that held the Minotaur.",
    levelRange: [1, 4]
  },
  {
    word: "SOLSTICE",
    category: "Astronomy",
    clue: "The time of year when the sun reaches its highest or lowest point.",
    extraClue: "Occurs twice a year, marking the longest and shortest days.",
    levelRange: [2, 5]
  },
  {
    word: "PARADOX",
    category: "Philosophical Puzzle",
    clue: "A statement that seems self-contradictory yet expresses a truth.",
    extraClue: "For example: 'This statement is false.'",
    levelRange: [2, 5]
  },
  {
    word: "SPECTRUM",
    category: "Optics & Light",
    clue: "A band of colors produced when light is split through a prism.",
    extraClue: "Red, orange, yellow, green, blue, indigo, violet.",
    levelRange: [2, 5]
  },
  {
    word: "METAMORPHOSIS",
    category: "Biology",
    clue: "A profound change of form from caterpillar to butterfly.",
    extraClue: "The process of transformation from immature to adult form.",
    levelRange: [3, 8]
  },
  {
    word: "KALEIDOSCOPE",
    category: "Visual Magic",
    clue: "A cylinder of mirrors containing loose, colorful glass pieces.",
    extraClue: "Rotate it to see endlessly shifting symmetrical patterns.",
    levelRange: [3, 8]
  },
  {
    word: "QUICKSILVER",
    category: "Elements",
    clue: "An ancient name for liquid metal that flows like water.",
    extraClue: "Another name for the chemical element mercury.",
    levelRange: [3, 8]
  },
  {
    word: "ALGORITHM",
    category: "Computer Science",
    clue: "A step-by-step set of rules to solve a specific problem.",
    extraClue: "The foundation of all computer software.",
    levelRange: [2, 6]
  },
  {
    word: "GIGAWATT",
    category: "Energy & Tech",
    clue: "One billion watts of electric power.",
    extraClue: "Doc Brown needed 1.21 of these to power the DeLorean.",
    levelRange: [2, 6]
  },
  {
    word: "PETRICHOR",
    category: "Earthy Aromas",
    clue: "The pleasant, earthy smell that accompanies the first rain after dry weather.",
    extraClue: "Derived from Greek words for 'stone' and 'fluid of gods'.",
    levelRange: [4, 10]
  },
  {
    word: "CALLIGRAPHY",
    category: "Arts & Ink",
    clue: "The art of giving form to signs in an expressive and harmonious manner.",
    extraClue: "Decorative handwriting or handwritten lettering.",
    levelRange: [2, 6]
  },
  {
    word: "CONSTELATION",
    category: "Night Sky",
    clue: "A group of stars forming a recognizable pattern in the night sky.",
    extraClue: "Orion, Ursa Major, and Cassiopeia are examples.",
    levelRange: [2, 6]
  },
  {
    word: "CATACOMB",
    category: "Underground History",
    clue: "An underground cemetery consisting of subterranean tunnels.",
    extraClue: "Famous examples exist beneath Paris and Rome.",
    levelRange: [3, 7]
  },
  {
    word: "HELIOSPHERE",
    category: "Deep Space",
    clue: "The vast bubble-like region of space dominated by the solar wind.",
    extraClue: "It protects our solar system from cosmic radiation.",
    levelRange: [4, 10]
  },
  {
    word: "CREPUSCULAR",
    category: "Zoology",
    clue: "Describing animals that are primarily active during twilight hours.",
    extraClue: "Rabbits, deer, and fireflies are active at dawn and dusk.",
    levelRange: [5, 12]
  },
  {
    word: "SERENDIPITY",
    category: "Happy Accidents",
    clue: "Finding valuable or agreeable things not sought for by chance.",
    extraClue: "Making a fortunate discovery entirely by accident.",
    levelRange: [3, 8]
  }
];

export const getRandomFallbackWord = (level: number, excludeWords: string[] = []) => {
  const eligible = FALLBACK_WORDS.filter(
    item => !excludeWords.includes(item.word)
  );

  const pool = eligible.length > 0 ? eligible : FALLBACK_WORDS;
  
  // Prefer words matching level range if possible
  const levelMatching = pool.filter(
    item => level >= item.levelRange[0] && level <= item.levelRange[1]
  );

  const finalPool = levelMatching.length > 0 ? levelMatching : pool;
  const picked = finalPool[Math.floor(Math.random() * finalPool.length)];

  return {
    word: picked.word,
    category: picked.category,
    clue: picked.clue,
    extraClue: picked.extraClue,
  };
};
