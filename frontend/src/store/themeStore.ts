import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: ThemeMode;
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
  initTheme: () => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
};

const applyThemeToDOM = (effectiveTheme: 'light' | 'dark') => {
  const root = document.documentElement;
  if (effectiveTheme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: (localStorage.getItem('hendaxis_theme_mode') as ThemeMode) || 'dark',
  effectiveTheme: 'dark',

  setTheme: (mode: ThemeMode) => {
    localStorage.setItem('hendaxis_theme_mode', mode);
    const effective = mode === 'system' ? getSystemTheme() : mode;
    applyThemeToDOM(effective);
    set({ theme: mode, effectiveTheme: effective });
  },

  initTheme: () => {
    const saved = (localStorage.getItem('hendaxis_theme_mode') as ThemeMode) || 'dark';
    const effective = saved === 'system' ? getSystemTheme() : saved;
    applyThemeToDOM(effective);
    set({ theme: saved, effectiveTheme: effective });

    // System theme listener
    if (typeof window !== 'undefined' && window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (get().theme === 'system') {
          const newEffective = e.matches ? 'dark' : 'light';
          applyThemeToDOM(newEffective);
          set({ effectiveTheme: newEffective });
        }
      });
    }
  }
}));
