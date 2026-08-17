import React, { useState, useMemo } from 'react';
import { PlayedWordRecord } from '../types';

interface JournalCodexViewProps {
  records: PlayedWordRecord[];
  onToggleFavorite: (word: string) => void;
}

const TOTAL_DICTIONARY_WORDS = 73517;

export const JournalCodexView: React.FC<JournalCodexViewProps> = ({
  records,
  onToggleFavorite,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'won' | 'lost' | 'favorites'>('all');
  const [expandedWord, setExpandedWord] = useState<string | null>(null);

  const wonCount = useMemo(() => records.filter(r => r.status === 'WON').length, [records]);
  const lostCount = useMemo(() => records.filter(r => r.status === 'LOST').length, [records]);
  const favCount = useMemo(() => records.filter(r => r.favorite).length, [records]);
  const winRate = useMemo(() => records.length > 0 ? Math.round((wonCount / records.length) * 100) : 0, [records, wonCount]);

  const filteredRecords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return records.filter(item => {
      // Filter by tab
      if (filterTab === 'won' && item.status !== 'WON') return false;
      if (filterTab === 'lost' && item.status !== 'LOST') return false;
      if (filterTab === 'favorites' && !item.favorite) return false;

      // Filter by search text
      if (!query) return true;
      const wordMatch = item.word.toLowerCase().includes(query);
      const catMatch = item.category.toLowerCase().includes(query);
      const clueMatch = item.clue.toLowerCase().includes(query);
      return wordMatch || catMatch || clueMatch;
    });
  }, [records, filterTab, searchQuery]);

  const toggleExpand = (word: string) => {
    setExpandedWord(prev => prev === word ? null : word);
  };

  return (
    <div className="flex flex-col h-full space-y-2.5">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-3 gap-2 shrink-0">
        <div className="bg-white/80 dark:bg-slate-800/80 p-2 sm:p-2.5 rounded-2xl border border-amber-200/80 dark:border-slate-700/80 shadow-2xs flex flex-col items-center text-center">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Discovered</span>
          <span className="text-sm sm:text-base font-black text-slate-800 dark:text-white mt-0.5">
            {records.length} <span className="text-[10px] font-bold text-slate-400 font-sans">/ 73.5k</span>
          </span>
        </div>

        <div className="bg-white/80 dark:bg-slate-800/80 p-2 sm:p-2.5 rounded-2xl border border-amber-200/80 dark:border-slate-700/80 shadow-2xs flex flex-col items-center text-center">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Cleared</span>
          <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            {wonCount} <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-sans">({winRate}%)</span>
          </span>
        </div>

        <div className="bg-white/80 dark:bg-slate-800/80 p-2 sm:p-2.5 rounded-2xl border border-amber-200/80 dark:border-slate-700/80 shadow-2xs flex flex-col items-center text-center">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">Starred</span>
          <span className="text-sm sm:text-base font-black text-amber-500 mt-0.5">
            ★ {favCount}
          </span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative shrink-0">
        <input 
          type="text" 
          placeholder="Search words, definitions, categories..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-8 pr-8 py-1.5 sm:py-2 text-xs sm:text-sm bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-white placeholder-slate-400 border border-slate-200/90 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-400/50 shadow-2xs font-medium"
        />
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">🔍</span>
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold p-1"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 shrink-0 overflow-x-auto pb-0.5 scrollbar-none">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all shrink-0 ${
            filterTab === 'all'
              ? 'bg-slate-800 dark:bg-amber-400 text-white dark:text-slate-950 shadow-xs'
              : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
          }`}
        >
          All ({records.length})
        </button>
        <button
          onClick={() => setFilterTab('won')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all shrink-0 flex items-center gap-1 ${
            filterTab === 'won'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
          }`}
        >
          <span>🟢</span> Cleared ({wonCount})
        </button>
        <button
          onClick={() => setFilterTab('lost')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all shrink-0 flex items-center gap-1 ${
            filterTab === 'lost'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
          }`}
        >
          <span>🔴</span> Snapped ({lostCount})
        </button>
        <button
          onClick={() => setFilterTab('favorites')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all shrink-0 flex items-center gap-1 ${
            filterTab === 'favorites'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
          }`}
        >
          <span>★</span> Starred ({favCount})
        </button>
      </div>

      {/* Words List */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-0">
        {filteredRecords.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center p-4 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700">
            <span className="text-3xl mb-1.5">📖</span>
            <h4 className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200">
              {records.length === 0 ? 'Your Journal is Empty' : 'No matching words found'}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mt-0.5">
              {records.length === 0 
                ? 'Play game rounds to automatically record and catalog Princeton WordNet words and definitions in Graphite’s Journal!' 
                : 'Try adjusting your search query or filter to find recorded lexicon words.'}
            </p>
          </div>
        ) : (
          filteredRecords.map((item) => {
            const isExpanded = expandedWord === item.word;
            const formattedDate = new Date(item.timestamp).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            });

            return (
              <div 
                key={item.word}
                className={`bg-white/85 dark:bg-slate-800/85 rounded-xl border transition-all duration-200 shadow-2xs overflow-hidden ${
                  item.status === 'WON' 
                    ? 'border-emerald-200/80 dark:border-slate-700' 
                    : 'border-rose-200/80 dark:border-slate-700'
                }`}
              >
                {/* Main Card Header */}
                <div 
                  onClick={() => toggleExpand(item.word)}
                  className="p-2.5 sm:p-3 flex items-start gap-2.5 cursor-pointer select-none hover:bg-amber-50/40 dark:hover:bg-slate-700/40 transition-colors"
                >
                  {/* Status Indicator Icon */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0 ${
                    item.status === 'WON' 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300' 
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                  }`}>
                    {item.status === 'WON' ? '✓' : '✗'}
                  </div>

                  {/* Word & Subtitle */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-black text-sm sm:text-base tracking-wider uppercase text-slate-900 dark:text-white font-mono">
                          {item.word}
                        </h4>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {item.word.length}L
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100/80 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300">
                          Lv {item.level}
                        </span>
                      </div>

                      {/* Favorite Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(item.word);
                        }}
                        className={`p-1 text-sm transition-transform active:scale-125 ${
                          item.favorite ? 'text-amber-500 drop-shadow-xs' : 'text-slate-300 dark:text-slate-600 hover:text-amber-400'
                        }`}
                        title={item.favorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        {item.favorite ? '★' : '☆'}
                      </button>
                    </div>

                    {/* Category & Definition preview */}
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-amber-700 dark:text-amber-400">{item.category}</span>
                      <span>•</span>
                      <span>{formattedDate}</span>
                    </div>

                    <p className={`text-xs text-slate-700 dark:text-slate-300 mt-1 leading-snug ${isExpanded ? '' : 'line-clamp-2'}`}>
                      {item.clue || 'A word from the Princeton WordNet lexicon.'}
                    </p>
                  </div>
                </div>

                {/* Expanded Details Panel */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-slate-700/60 bg-amber-50/30 dark:bg-slate-900/30 space-y-2 text-xs">
                    {item.extraClue && (
                      <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-800/70 border border-amber-200/50 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                        <strong className="text-amber-800 dark:text-amber-300 block text-[10px] uppercase font-black tracking-wider mb-0.5">
                          💡 Word Fact
                        </strong>
                        {item.extraClue}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                      <span>Source: Princeton WordNet 3.1 Lexicon</span>
                      <span className="font-bold text-slate-500 dark:text-slate-400">
                        Status: {item.status === 'WON' ? '🟢 Solved & Cleared' : '🔴 Pencil Snapped'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
