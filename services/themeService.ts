export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'pointless_theme_mode';

type ThemeListener = (resolved: ResolvedTheme, mode: ThemeMode) => void;

class ThemeService {
  private mode: ThemeMode = 'system';
  private listeners: Set<ThemeListener> = new Set();
  private mediaQuery: MediaQueryList | null = null;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    // Retrieve stored theme
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      this.mode = stored;
    } else {
      this.mode = 'system';
    }

    // Media query listener
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaQuery.addEventListener('change', () => {
      if (this.mode === 'system') {
        this.applyTheme();
      }
    });

    this.applyTheme();
  }

  public getMode(): ThemeMode {
    return this.mode;
  }

  public getResolvedTheme(): ResolvedTheme {
    if (this.mode === 'system') {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'light';
    }
    return this.mode;
  }

  public setMode(mode: ThemeMode) {
    this.mode = mode;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // ignore
    }
    this.applyTheme();
  }

  public toggleTheme(): ResolvedTheme {
    const current = this.getResolvedTheme();
    const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
    this.setMode(next);
    return this.getResolvedTheme();
  }

  private applyTheme() {
    if (typeof document === 'undefined') return;
    const resolved = this.getResolvedTheme();
    const root = document.documentElement;
    const body = document.body;

    if (resolved === 'dark') {
      root.classList.add('dark');
      body?.classList.add('dark');
    } else {
      root.classList.remove('dark');
      body?.classList.remove('dark');
    }

    this.notify();
  }

  public subscribe(listener: ThemeListener): () => void {
    this.listeners.add(listener);
    listener(this.getResolvedTheme(), this.mode);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const resolved = this.getResolvedTheme();
    this.listeners.forEach((listener) => listener(resolved, this.mode));
  }
}

export const themeService = new ThemeService();
