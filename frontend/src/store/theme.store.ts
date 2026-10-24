import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeState {
  theme: ThemeMode;
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
    // Explicitly add 'light' so our CSS selectors work
    root.classList.add('light');
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',   // ← default is now light (soft lavender design)
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
    }),
    {
      name: 'equilibrium-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme);
        } else {
          // No stored preference → apply light
          applyTheme('light');
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
