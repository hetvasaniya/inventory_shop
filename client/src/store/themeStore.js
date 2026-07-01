import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useThemeStore = create(
  persist(
    (set) => ({
      mode: 'dark',
      toggleMode: () =>
        set((state) => ({
          mode: state.mode === 'dark' ? 'light' : 'dark',
        })),
    }),
    {
      name: 'theme-storage',
    }
  )
);