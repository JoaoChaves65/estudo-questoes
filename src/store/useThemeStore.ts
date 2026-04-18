import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'dark' | 'light';

type ThemeStore = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set({
          theme: get().theme === 'dark' ? 'light' : 'dark',
        }),
    }),
    {
      name: 'estudo-questoes-theme',
    },
  ),
);
