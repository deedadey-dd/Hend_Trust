import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  role: string;
  email: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  phone_number?: string;
  shop_name?: string;
  shop_category?: string;
  shop_categories?: string[];
  is_email_verified?: boolean;
  is_phone_verified?: boolean;
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
  updateUser: (user: Partial<User>) => void;
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

      updateUser: (partialUser) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partialUser } : null,
        })),
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
