import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'system' | 'light' | 'dark';

// ── Version stamp: bump this to force-reset stored theme preference ───────
// When the design system changes and old 'dark' preference should be wiped,
// increment this number. Users will be reset to 'light' automatically.
const THEME_VERSION = 2; // bumped from 1 (old dark default) → 2 (new light default)

interface ThemeState {
  theme: ThemeMode;
  _version: number;
  setTheme: (theme: ThemeMode) => void;
}

const applyTheme = (theme: ThemeMode) => {
  const root = document.documentElement;
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isDark) {
    root.classList.remove('light');
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',       // ← default: soft lavender light mode
      _version: THEME_VERSION,
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme, _version: THEME_VERSION });
      },
    }),
    {
      name: 'equilibrium-theme',
      onRehydrateStorage: () => (state) => {
        if (!state || state._version !== THEME_VERSION) {
          // Stale version (old dark preference) — reset to light and re-write
          try { localStorage.removeItem('equilibrium-theme'); } catch (_) { /* noop */ }
          applyTheme('light');
        } else {
          applyTheme(state.theme);
        }
      },
    }
  )
);

// Listen to system preference changes when in 'system' mode
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const currentTheme = useThemeStore.getState().theme;
    if (currentTheme === 'system') {
      applyTheme('system');
    }
  });
}
