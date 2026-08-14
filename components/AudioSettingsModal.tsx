import React, { useState, useEffect } from 'react';
import { soundService, BgmTrackId } from '../services/soundService';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState(soundService.settings);

  useEffect(() => {
    const unsub = soundService.subscribe(setSettings);
    return unsub;
  }, []);

  if (!isOpen) return null;

  const tracks: { id: BgmTrackId; name: string; icon: string; desc: string }[] = [
    { id: 'lofi', name: 'Lofi Study', icon: '☕', desc: 'Warm Rhodes chords & cozy sub-bass' },
    { id: 'library', name: 'Tranquil Library', icon: '📖', desc: 'Peaceful celesta & kalimba ambience' },
    { id: 'playful', name: 'Playful Focus', icon: '🎨', desc: 'Upbeat acoustic marimba pulse' },
    { id: 'off', name: 'Mute Music', icon: '🔇', desc: 'Only game sound effects' },
  ];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/40 backdrop-blur-xl animate-in fade-in duration-200">
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="glass-panel w-full max-w-md rounded-3xl shadow-2xl p-4 sm:p-6 border border-white/90 relative flex flex-col gap-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl sm:text-3xl">🎧</span>
            <div>
              <h3 className="font-heading text-lg sm:text-xl text-slate-900 leading-tight">Audio & Soundtrack</h3>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">100% Royalty-Free & Copyright-Free</p>
            </div>
          </div>
          <button 
            onClick={() => {
              soundService.playPop();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300/90 text-slate-600 hover:text-slate-900 font-bold text-xs sm:text-sm flex items-center justify-center transition-all btn-press shadow-2xs"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Royalty Free Badge */}
        <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-2.5 flex items-center gap-2.5 text-xs text-emerald-900">
          <span className="text-xl shrink-0">✨</span>
          <p className="leading-snug font-medium">
            <strong className="font-bold">Real-time Web Audio:</strong> All music and sound effects are procedurally generated in code. No external sample downloads, safe for streaming & sharing!
          </p>
        </div>

        {/* Sound Effects (SFX) Section */}
        <div className="glass-card p-3.5 rounded-2xl flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔊</span>
              <div>
                <h4 className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-800">Sound Effects</h4>
                <p className="text-[11px] text-slate-500">Letter taps, chime harmonies, clues</p>
              </div>
            </div>
            <button
              onClick={() => {
                soundService.toggleSfx();
                if (!settings.sfxEnabled) {
                  setTimeout(() => soundService.playCorrect(3), 50);
                }
              }}
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider transition-all btn-press ${
                settings.sfxEnabled 
                  ? 'bg-emerald-500 text-white shadow-emerald-500/20 shadow-sm' 
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {settings.sfxEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {settings.sfxEnabled && (
            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs text-slate-500 font-bold w-12 shrink-0">Volume</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.sfxVolume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  soundService.updateVolumeSettings({ sfxVolume: val });
                }}
                className="flex-1 accent-slate-800 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
              />
              <span className="text-xs font-black text-slate-700 w-8 text-right">
                {Math.round(settings.sfxVolume * 100)}%
              </span>
              <button
                onClick={() => soundService.playCorrect(2)}
                className="glass-button text-[10px] font-bold px-2 py-1 rounded-lg text-slate-700 hover:text-slate-950"
                title="Test SFX"
              >
                Test 🔔
              </button>
            </div>
          )}
        </div>

        {/* Background Music (BGM) Section */}
        <div className="glass-card p-3.5 rounded-2xl flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎵</span>
              <div>
                <h4 className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-800">Background Music</h4>
                <p className="text-[11px] text-slate-500">Procedural ambient melodies</p>
              </div>
            </div>
            <button
              onClick={() => {
                soundService.toggleBgm();
                soundService.playPop();
              }}
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider transition-all btn-press ${
                settings.bgmEnabled 
                  ? 'bg-amber-500 text-white shadow-amber-500/20 shadow-sm' 
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {settings.bgmEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {settings.bgmEnabled && (
            <>
              <div className="flex items-center gap-3 pt-1">
                <span className="text-xs text-slate-500 font-bold w-12 shrink-0">Volume</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.bgmVolume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    soundService.updateVolumeSettings({ bgmVolume: val });
                  }}
                  className="flex-1 accent-amber-500 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
                />
                <span className="text-xs font-black text-slate-700 w-8 text-right">
                  {Math.round(settings.bgmVolume * 100)}%
                </span>
              </div>

              {/* Track Selector */}
              <div className="flex flex-col gap-1.5 mt-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Soundtrack Theme</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {tracks.map((t) => {
                    const isSelected = settings.activeTrack === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          soundService.setTrack(t.id);
                          soundService.playPop();
                        }}
                        className={`p-2 rounded-xl text-left border transition-all flex items-center gap-2.5 ${
                          isSelected
                            ? 'bg-amber-100/90 border-amber-400 text-amber-950 font-bold shadow-xs'
                            : 'bg-white/60 hover:bg-white/90 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="text-lg">{t.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold leading-tight">{t.name}</div>
                          <div className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">{t.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Done Button */}
        <button
          onClick={() => {
            soundService.playPop();
            onClose();
          }}
          className="w-full glass-pill-dark text-white py-2.5 rounded-2xl font-bold uppercase tracking-wider hover:bg-black transition-colors text-xs sm:text-sm shadow-md"
        >
          Save & Return
        </button>
      </div>
    </div>
  );
};
