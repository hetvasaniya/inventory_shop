import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      shop: null,
      isAuthenticated: false,

      login: (user, token, shop, refreshToken) =>
        set({
          user,
          token,
          refreshToken: refreshToken || null,
          shop,
          isAuthenticated: true,
        }),

      setTokens: (token, refreshToken) =>
        set({ token, refreshToken }),

      logout: () =>
        set({
          user: null,
          token: null,
          refreshToken: null,
          shop: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'auth-storage',
    }
  )
);