// Procedural, 100% Royalty-Free & Copyright-Free Web Audio Sound Engine for Pointless
// Synthesizes all sound effects and generative ambient background music in real-time.

export type BgmTrackId = 'lofi' | 'library' | 'playful' | 'off';

interface SoundSettings {
  sfxEnabled: boolean;
  bgmEnabled: boolean;
  sfxVolume: number; // 0.0 to 1.0
  bgmVolume: number; // 0.0 to 1.0
  activeTrack: BgmTrackId;
}

const SETTINGS_KEY = 'pointless_audio_settings_v1';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  
  private isBgmPlaying = false;
  private bgmIntervalId: number | null = null;
  private bgmStep = 0;
  
  public settings: SoundSettings = {
    sfxEnabled: true,
    bgmEnabled: true,
    sfxVolume: 0.7,
    bgmVolume: 0.35,
    activeTrack: 'lofi'
  };

  private listeners: Array<(s: SoundSettings) => void> = [];

  constructor() {
    this.loadSettings();
    // Pre-attach browser interaction listener to resume AudioContext
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.initContext();
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        if (this.settings.bgmEnabled && !this.isBgmPlaying && this.settings.activeTrack !== 'off') {
          this.startBgm();
        }
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      };
      window.addEventListener('click', unlockAudio, { once: true });
      window.addEventListener('keydown', unlockAudio, { once: true });
      window.addEventListener('touchstart', unlockAudio, { once: true });
    }
  }

  private loadSettings() {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Could not load audio settings', e);
    }
  }

  public saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
      this.notifyListeners();
    } catch (e) {
      console.warn('Could not save audio settings', e);
    }
  }

  public subscribe(cb: (s: SoundSettings) => void): () => void {
    this.listeners.push(cb);
    cb(this.settings);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l({ ...this.settings }));
  }

  private initContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(this.settings.sfxEnabled ? this.settings.sfxVolume : 0, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.setValueAtTime(this.settings.bgmEnabled ? this.settings.bgmVolume : 0, this.ctx.currentTime);
        this.bgmGain.connect(this.masterGain);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public updateVolumeSettings(partial: Partial<SoundSettings>) {
    this.settings = { ...this.settings, ...partial };
    this.saveSettings();

    if (this.sfxGain && this.ctx) {
      const targetSfx = this.settings.sfxEnabled ? this.settings.sfxVolume : 0;
      this.sfxGain.gain.setTargetAtTime(targetSfx, this.ctx.currentTime, 0.05);
    }
    if (this.bgmGain && this.ctx) {
      const targetBgm = this.settings.bgmEnabled ? this.settings.bgmVolume : 0;
      this.bgmGain.gain.setTargetAtTime(targetBgm, this.ctx.currentTime, 0.1);
    }

    if (this.settings.bgmEnabled && this.settings.activeTrack !== 'off') {
      if (!this.isBgmPlaying) {
        this.startBgm();
      }
    } else {
      this.stopBgm();
    }
  }

  public toggleSfx() {
    this.updateVolumeSettings({ sfxEnabled: !this.settings.sfxEnabled });
  }

  public toggleBgm() {
    this.updateVolumeSettings({ bgmEnabled: !this.settings.bgmEnabled });
  }

  public setTrack(track: BgmTrackId) {
    this.settings.activeTrack = track;
    this.saveSettings();
    if (track === 'off') {
      this.stopBgm();
    } else {
      this.stopBgm();
      if (this.settings.bgmEnabled) {
        this.startBgm();
      }
    }
  }

  // ==========================================
  // PROCEDURAL SOUND EFFECTS (SFX)
  // ==========================================

  /**
   * Tactile typewriter / paper pencil tap
   */
  public playTap() {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.04);

    gain.gain.setValueAtTime(0.3 * this.settings.sfxVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  /**
   * Melodic bright chime tuned to pentatonic scale with streak modulation
   */
  public playCorrect(streak: number = 0) {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    // Pentatonic scale notes (Hz): C5, D5, E5, G5, A5, C6, D6, E6
    const scale = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51];
    const baseFreq = scale[Math.min(streak, scale.length - 1)];

    // Primary bell tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, t);

    gain1.gain.setValueAtTime(0.4 * this.settings.sfxVolume, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc1.connect(gain1);
    gain1.connect(this.sfxGain);

    // Sparkling overtone harmonic
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(baseFreq * 2, t);

    gain2.gain.setValueAtTime(0.18 * this.settings.sfxVolume, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc2.connect(gain2);
    gain2.connect(this.sfxGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.4);
    osc2.stop(t + 0.25);
  }

  /**
   * Gentle wooden thud / pencil dull wobble (non-abrasive)
   */
  public playWrong() {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    
    // Low wooden thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.18);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + 0.18);

    gain.gain.setValueAtTime(0.35 * this.settings.sfxVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.22);
  }

  /**
   * Joyful victorious arpeggio fanfare
   */
  public playWin() {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    // Victorious fanfare notes: C5, E5, G5, C6 (Major triad flourish)
    const notes = [523.25, 659.25, 783.99, 1046.50];

    notes.forEach((freq, idx) => {
      const noteTime = t + idx * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx === notes.length - 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      const duration = idx === notes.length - 1 ? 0.7 : 0.25;
      gain.gain.setValueAtTime(0.3 * this.settings.sfxVolume, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + duration);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(noteTime);
      osc.stop(noteTime + duration + 0.05);
    });
  }

  /**
   * Gentle, cozy descending harp (pencil snap / word lost)
   */
  public playLoss() {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const notes = [440, 392, 349.23, 293.66]; // A4, G4, F4, D4

    notes.forEach((freq, idx) => {
      const noteTime = t + idx * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.25 * this.settings.sfxVolume, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(noteTime);
      osc.stop(noteTime + 0.4);
    });
  }

  /**
   * Shimmering hint sparkle
   */
  public playHint() {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const sparkles = [783.99, 987.77, 1174.66, 1567.98];

    sparkles.forEach((freq, idx) => {
      const noteTime = t + idx * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.2 * this.settings.sfxVolume, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(noteTime);
      osc.stop(noteTime + 0.32);
    });
  }

  /**
   * Eraser powerup swoosh
   */
  public playEraser() {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    
    // Filtered noise swoosh
    const bufferSize = ctx.sampleRate * 0.25;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(2400, t + 0.12);
    filter.frequency.exponentialRampToValueAtTime(600, t + 0.24);
    filter.Q.setValueAtTime(3.0, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25 * this.settings.sfxVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    whiteNoise.start(t);
  }

  /**
   * Letter reveal chime
   */
  public playReveal() {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const notes = [659.25, 880.00, 1318.51]; // E5, A5, E6

    notes.forEach((freq, idx) => {
      const noteTime = t + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.22 * this.settings.sfxVolume, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(noteTime);
      osc.stop(noteTime + 0.38);
    });
  }

  /**
   * Trophy / quest unlock fanfare
   */
  public playAchievement() {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const notes = [587.33, 739.99, 880.00, 1174.66]; // D5, F#5, A5, D6

    notes.forEach((freq, idx) => {
      const noteTime = t + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      const dur = idx === notes.length - 1 ? 0.6 : 0.22;
      gain.gain.setValueAtTime(0.28 * this.settings.sfxVolume, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + dur);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(noteTime);
      osc.stop(noteTime + dur + 0.05);
    });
  }

  /**
   * Metronome click for countdowns / duel ticks
   */
  public playTick() {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.03);

    gain.gain.setValueAtTime(0.2 * this.settings.sfxVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  /**
   * Soft UI pop
   */
  public playPop() {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.04);

    gain.gain.setValueAtTime(0.18 * this.settings.sfxVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  // ==========================================
  // PROCEDURAL BACKGROUND MUSIC (BGM)
  // Generative chill acoustic and lofi progressions
  // ==========================================

  public startBgm() {
    if (this.isBgmPlaying || !this.settings.bgmEnabled || this.settings.activeTrack === 'off') return;
    const ctx = this.initContext();
    if (!ctx) return;

    this.isBgmPlaying = true;
    this.bgmStep = 0;

    // Tempo: 75 BPM -> ~800ms per beat
    const stepInterval = 400; // 8th note resolution

    this.bgmIntervalId = window.setInterval(() => {
      if (!this.isBgmPlaying || !this.settings.bgmEnabled) {
        this.stopBgm();
        return;
      }
      this.tickBgm();
    }, stepInterval);
  }

  public stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmIntervalId !== null) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
  }

  private tickBgm() {
    const ctx = this.ctx;
    if (!ctx || !this.bgmGain || ctx.state === 'suspended') return;

    const t = ctx.currentTime;
    const track = this.settings.activeTrack;
    const step = this.bgmStep % 32;

    if (track === 'lofi') {
      this.playLofiStep(t, step);
    } else if (track === 'library') {
      this.playLibraryStep(t, step);
    } else if (track === 'playful') {
      this.playPlayfulStep(t, step);
    }

    this.bgmStep++;
  }

  // Track 1: Lofi Study - Relaxed Rhodes Chords & Sub-Bass
  private playLofiStep(t: number, step: number) {
    const ctx = this.ctx!;
    // 4-chord progression: Dmaj7 (0-7), Bm7 (8-15), Gmaj7 (16-23), A6 (24-31)
    const chordIdx = Math.floor(step / 8);
    const chords = [
      [293.66, 369.99, 440.00, 554.37], // Dmaj7: D4, F#4, A4, C#5
      [246.94, 293.66, 369.99, 440.00], // Bm7: B3, D4, F#4, A4
      [196.00, 246.94, 293.66, 369.99], // Gmaj7: G3, B3, D4, F#4
      [220.00, 277.18, 329.63, 440.00]  // A6: A3, C#4, E4, A4
    ];
    const bassNotes = [146.83, 123.47, 98.00, 110.00]; // D3, B2, G2, A2

    // Play chord on beats 0 and 4 of each bar
    const barStep = step % 8;
    if (barStep === 0 || barStep === 4) {
      const currentChord = chords[chordIdx];
      currentChord.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, t);

        const chordGain = (barStep === 0 ? 0.08 : 0.05) * this.settings.bgmVolume;
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(chordGain, t + 0.08 + i * 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain!);

        osc.start(t);
        osc.stop(t + 1.5);
      });
    }

    // Play mellow sub-bass on beat 0, 3, 6
    if (barStep === 0 || barStep === 3 || barStep === 6) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(bassNotes[chordIdx], t);

      const bassGain = 0.12 * this.settings.bgmVolume;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(bassGain, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);

      osc.connect(gain);
      gain.connect(this.bgmGain!);

      osc.start(t);
      osc.stop(t + 0.75);
    }

    // Soft pentatonic melodic sparkle on odd syncopations
    if (barStep === 2 || barStep === 5 || barStep === 7) {
      const melodyNotes = [587.33, 659.25, 739.99, 880.00]; // D5, E5, F#5, A5
      const note = melodyNotes[(step * 3) % melodyNotes.length];
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note, t);

      const noteGain = 0.04 * this.settings.bgmVolume;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(noteGain, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);

      osc.connect(gain);
      gain.connect(this.bgmGain!);

      osc.start(t);
      osc.stop(t + 0.55);
    }
  }

  // Track 2: Tranquil Library - Celesta & Kalimba ambient waves
  private playLibraryStep(t: number, step: number) {
    const ctx = this.ctx!;
    // Peaceful F major / D minor arpeggio wave
    const arpeggios = [
      [349.23, 440.00, 523.25, 698.46], // F major: F4, A4, C5, F5
      [293.66, 349.23, 440.00, 587.33], // D minor: D4, F4, A4, D5
      [261.63, 329.63, 392.00, 523.25], // C major: C4, E4, G4, C5
      [220.00, 261.63, 329.63, 440.00]  // A minor: A3, C4, E4, A4
    ];

    const chordIdx = Math.floor(step / 8);
    const noteIdx = step % 4;
    const freq = arpeggios[chordIdx][noteIdx];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, t);

    const noteGain = 0.07 * this.settings.bgmVolume;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(noteGain, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain!);

    osc.start(t);
    osc.stop(t + 0.85);
  }

  // Track 3: Playful Focus - Light staccato marimba & acoustic pulse
  private playPlayfulStep(t: number, step: number) {
    const ctx = this.ctx!;
    const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; // C pentatonic
    const pattern = [0, 2, 4, 3, 1, 4, 2, 5];
    const noteFreq = scale[pattern[step % pattern.length]];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(noteFreq, t);

    const isAccent = step % 4 === 0;
    const noteGain = (isAccent ? 0.09 : 0.05) * this.settings.bgmVolume;

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(noteGain, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);

    osc.connect(gain);
    gain.connect(this.bgmGain!);

    osc.start(t);
    osc.stop(t + 0.3);
  }
}

export const soundService = new SoundEngine();
