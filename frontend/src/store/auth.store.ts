import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

/**
 * Decode a JWT payload without a library.
 * Returns null if the token is malformed or expired.
 */
const isTokenExpired = (token: string | null): boolean => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // exp is in seconds; give 30-second grace window
    return Date.now() / 1000 > (payload.exp ?? 0) - 30;
  } catch {
    return true; // malformed token → treat as expired
  }
};

/** Clears all equilibrium keys from localStorage */
const clearStorage = () => {
  try {
    localStorage.removeItem('equilibrium-auth');
    localStorage.removeItem('equilibrium-theme');
  } catch (_) { /* noop */ }
};

const LOGGED_OUT_STATE = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...LOGGED_OUT_STATE,

      setUser: (user) => set({ user }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, isAuthenticated: true }),

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),

      logout: () => {
        clearStorage();
        set(LOGGED_OUT_STATE);
      },
    }),
    {
      name: 'equilibrium-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      // On rehydration: if the access token is expired AND we have no refresh
      // token, clear everything immediately so the app starts fresh at /login
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const accessExpired  = isTokenExpired(state.accessToken);
        const refreshExpired = isTokenExpired(state.refreshToken);

        if (accessExpired && refreshExpired) {
          // Both tokens are dead — hard-clear and redirect
          clearStorage();
          state.isAuthenticated = false;
          state.user            = null;
          state.accessToken     = null;
          state.refreshToken    = null;
        }
      },
    }
  )
);
