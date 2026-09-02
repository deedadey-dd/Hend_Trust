import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  role: string;
  email: string;
  name?: string;
  username?: string;
  is_superuser?: boolean;
  is_staff?: boolean;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setHydrated: (state: boolean) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isHydrated: false,

      setHydrated: (isHydrated) => set({ isHydrated }),

      login: (token, user) => set({ token, user, isAuthenticated: true }),
      
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
      
      setToken: (token) => set({ token }),
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
