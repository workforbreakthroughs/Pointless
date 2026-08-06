import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve directory paths in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dictPath = path.join(__dirname, '../node_modules/wordnet-db/dict');
const outputDir = path.join(__dirname, '../public/data/wordnet');

// Ensure output directory exists
fs.mkdirSync(outputDir, { recursive: true });

// Semantic category mapping for WordNet lexicographer files
const LEX_NAMES = {
  '00': 'Descriptive Terms', // adj.all
  '01': 'Relational Terms',  // adj.pert
  '02': 'Modifiers',         // adv.all
  '03': 'General Concepts',  // noun.Tops
  '04': 'Actions & Acts',    // noun.act
  '05': 'Animals & Wildlife',// noun.animal
  '06': 'Tools & Inventions',// noun.artifact
  '07': 'Traits & Qualities',// noun.attribute
  '08': 'Anatomy & Body',    // noun.body
  '09': 'Mind & Science',    // noun.cognition
  '10': 'Language & Terms',  // noun.communication
  '11': 'Events & Phenomena',// noun.event
  '12': 'Emotions & Feelings',// noun.feeling
  '13': 'Food & Culinary',   // noun.food
  '14': 'Groups & Collectives',// noun.group
  '15': 'Geography & Places',// noun.location
  '16': 'Motives & Intentions',// noun.motive
  '17': 'Objects & Nature',  // noun.object
  '18': 'People & Roles',    // noun.person
  '19': 'Natural Phenomena', // noun.phenomenon
  '20': 'Plants & Botany',   // noun.plant
  '21': 'Wealth & Commerce', // noun.possession
  '22': 'Processes & Science',// noun.process
  '23': 'Math & Measurement',// noun.quantity
  '24': 'Relations & Logic', // noun.relation
  '25': 'Shapes & Forms',    // noun.shape
  '26': 'States & Conditions',// noun.state
  '27': 'Materials & Elements',// noun.substance
  '28': 'Time & Seasons',    // noun.time
  '29': 'Body Actions',      // verb.body
  '30': 'Changes & Effects', // verb.change
  '31': 'Mind & Thought',    // verb.cognition
  '32': 'Communication',     // verb.communication
  '33': 'Competition & Sport',// verb.competition
  '34': 'Consumption & Food',// verb.consumption
  '35': 'Contact & Touch',   // verb.contact
  '36': 'Creation & Craft',  // verb.creation
  '37': 'Motion & Movement', // verb.motion
  '38': 'Perception & Sight',// verb.perception
  '39': 'Possession & Trade',// verb.possession
  '40': 'Social Behavior',   // verb.social
  '41': 'Stances & States',  // verb.stative
  '42': 'Weather & Sky'      // verb.weather
};

// Profanity / Offensive blocklist
const OFFENSIVE_TERMS = new Set([
  'ass', 'asshole', 'bitch', 'bastard', 'crap', 'cunt', 'dick', 'fuck', 'fucked',
  'fucker', 'fuckin', 'fucking', 'nigger', 'nigga', 'piss', 'pussy', 'shit', 'shitty',
  'slut', 'whore', 'twat', 'cock', 'penis', 'vagina', 'clitoris', 'ejaculation', 'orgasm',
  'porn', 'pornography', 'prostitute', 'prostitution', 'rape', 'raped', 'rapist',
  'semen', 'sperm', 'testicle', 'bitchy', 'bollocks', 'bugger', 'dildo', 'fetish',
  'intercourse', 'masturbate', 'masturbation', 'nude', 'nudity', 'pedophile', 'scum'
]);

// Read index files to gather frequency metrics
console.log('Reading WordNet index files for frequency analysis...');
const indexFiles = ['index.noun', 'index.verb', 'index.adj', 'index.adv'];
const wordStats = new Map();

indexFiles.forEach(file => {
  const filePath = path.join(dictPath, file);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  content.split('\n').forEach(line => {
    if (line.startsWith('  ') || !line.trim()) return;
    const parts = line.trim().split(/\s+/);
    if (parts.length < 4) return;
    const word = parts[0];
    
    // Filter out proper nouns (capitalized in index), abbreviations, multi-word or non-alpha
    if (!/^[a-z]{4,14}$/.test(word)) return;
    if (OFFENSIVE_TERMS.has(word)) return;
    
    const synsetCnt = parseInt(parts[2], 10) || 0;
    const pCnt = parseInt(parts[3], 10) || 0;
    const senseIdx = 4 + pCnt;
    const tagSenseCnt = parts[senseIdx + 1] ? (parseInt(parts[senseIdx + 1], 10) || 0) : 0;
    
    const existing = wordStats.get(word) || { synsetCnt: 0, tagSenseCnt: 0 };
    wordStats.set(word, {
      synsetCnt: existing.synsetCnt + synsetCnt,
      tagSenseCnt: existing.tagSenseCnt + tagSenseCnt
    });
  });
});

console.log(`Indexed ${wordStats.size} valid single-word lemmas.`);

// Read data files to extract definitions & clues
console.log('Parsing WordNet data synsets...');
const dataFiles = ['data.noun', 'data.verb', 'data.adj', 'data.adv'];

// Map of word -> candidate entries [{word, category, clue, extraClue, score}]
const wordCandidates = new Map();

dataFiles.forEach(file => {
  const filePath = path.join(dictPath, file);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach(line => {
    if (line.startsWith('  ') || !line.trim()) return;
    const parts = line.split('|');
    if (parts.length < 2) return;
    
    const header = parts[0].trim().split(/\s+/);
    const rawGloss = parts[1].trim();
    if (header.length < 5) return;
    
    const lexFile = header[1];
    const wCnt = parseInt(header[3], 16);
    let idx = 4;
    
    for (let i = 0; i < wCnt; i++) {
      const word = header[idx].toLowerCase();
      idx += 2;
      
      // Strict word format checking
      if (!/^[a-z]{4,14}$/.test(word)) continue;
      if (OFFENSIVE_TERMS.has(word)) continue;
      
      // Parse gloss
      const glossParts = rawGloss.split(';');
      let def = glossParts[0].trim();
      
      // Clean definition (strip parenthetical notes like "(biology)")
      def = def.replace(/\([^)]*\)/g, '').trim();
      def = def.replace(/^(a|an|the|of|to|in|for)\s+/i, (m) => m); // normalize start
      
      // Find example sentence if present
      const examplePart = glossParts.slice(1).find(p => p.includes('"'));
      let example = examplePart ? examplePart.trim().replace(/"/g, '') : '';
      
      // Mask target word in clue & example
      const regex = new RegExp(`\\b${word}(?:s|es|d|ed|ing)?\\b`, 'gi');
      const cleanClue = def.replace(regex, '___');
      
      // Validate clue quality
      if (cleanClue.length < 8 || cleanClue.length > 180) continue;
      if (cleanClue.includes('___')) {
        // Word was directly in the definition, ensure remaining text makes sense
        if (cleanClue.replace(/___/g, '').trim().length < 6) continue;
      }
      
      // Prepare extra clue
      let cleanExtra = '';
      if (example) {
        cleanExtra = `Example: "${example.replace(regex, '___')}"`;
      } else {
        const uWord = word.toUpperCase();
        const vowels = uWord.split('').filter(c => 'AEIOU'.includes(c)).length;
        const startChar = uWord.charAt(0);
        const endChar = uWord.charAt(uWord.length - 1);
        cleanExtra = `${uWord.length} letters, ${vowels} vowel${vowels === 1 ? '' : 's'} (Starts with '${startChar}', ends with '${endChar}')`;
      }
      
      const category = LEX_NAMES[lexFile] || 'General Vocabulary';
      const stats = wordStats.get(word) || { synsetCnt: 1, tagSenseCnt: 0 };
      
      // Candidate score (higher is better for selecting the primary definition)
      const score = (stats.tagSenseCnt * 10) + (stats.synsetCnt * 2) + (example ? 5 : 0) + (cleanClue.length > 20 ? 3 : 0);
      
      const candidate = {
        word: word.toUpperCase(),
        category,
        clue: cleanClue.charAt(0).toUpperCase() + cleanClue.slice(1),
        extraClue: cleanExtra,
        score,
        tagSenseCnt: stats.tagSenseCnt,
        synsetCnt: stats.synsetCnt
      };
      
      const existing = wordCandidates.get(word.toUpperCase());
      if (!existing || candidate.score > existing.score) {
        wordCandidates.set(word.toUpperCase(), candidate);
      }
    }
  });
});

console.log(`Extracted ${wordCandidates.size} unique, high-quality entries.`);

// Categorize into Easy, Medium, Hard tiers based on frequency and word traits
const easyList = [];
const mediumList = [];
const hardList = [];

wordCandidates.forEach(item => {
  const wordLen = item.word.length;
  const isHighFreq = item.tagSenseCnt >= 2 || (item.tagSenseCnt >= 1 && item.synsetCnt >= 3);
  const isMedFreq = item.tagSenseCnt >= 1 || item.synsetCnt >= 2;
  
  if (isHighFreq && wordLen >= 4 && wordLen <= 9) {
    easyList.push(item);
  } else if (isMedFreq || (isHighFreq && wordLen > 9)) {
    mediumList.push(item);
  } else {
    hardList.push(item);
  }
});

console.log(`Categorization Results:`);
console.log(`- Easy: ${easyList.length} words`);
console.log(`- Medium: ${mediumList.length} words`);
console.log(`- Hard: ${hardList.length} words`);

// Function to chunk list and save JSON files
function saveTierChunks(tierName, items, chunkSize = 1500) {
  const totalChunks = Math.ceil(items.length / chunkSize);
  const chunkPaths = [];

  for (let i = 0; i < totalChunks; i++) {
    const chunkData = items.slice(i * chunkSize, (i + 1) * chunkSize).map(({ word, category, clue, extraClue }) => ({
      word, category, clue, extraClue
    }));
    
    const fileName = `${tierName}-${i + 1}.json`;
    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(chunkData));
    chunkPaths.push(fileName);
  }

  return { totalWords: items.length, totalChunks, files: chunkPaths };
}

const easyMeta = saveTierChunks('easy', easyList);
const mediumMeta = saveTierChunks('medium', mediumList);
const hardMeta = saveTierChunks('hard', hardList);

const manifest = {
  version: "1.0.0",
  source: "Princeton University WordNet 3.1",
  attribution: "WordNet 3.1 Copyright 2011 by Princeton University. All rights reserved.",
  totalWords: wordCandidates.size,
  tiers: {
    easy: easyMeta,
    medium: mediumMeta,
    hard: hardMeta
  }
};

fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

console.log('WordNet preprocessing complete!');
console.log(`Saved manifest and JSON chunks to ${outputDir}`);
