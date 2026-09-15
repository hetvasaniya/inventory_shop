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
      sessionMode: 'owner', // 'owner' (full access) or 'worker' (billing only)

      login: (user, token, shop, refreshToken, sessionMode = 'owner') =>
        set({
          user,
          token,
          refreshToken: refreshToken || null,
          shop,
          isAuthenticated: true,
          sessionMode: user?.role === 'employee' ? 'worker' : sessionMode,
        }),

      setSessionMode: (sessionMode) => set({ sessionMode }),

      setTokens: (token, refreshToken) =>
        set({ token, refreshToken }),

      setUser: (user) => set({ user }),

      setShop: (shop) => set({ shop }),

      logout: () =>
        set({
          user: null,
          token: null,
          refreshToken: null,
          shop: null,
          isAuthenticated: false,
          sessionMode: 'owner',
        }),
    }),
    {
      name: 'auth-storage',
    }
  )
);