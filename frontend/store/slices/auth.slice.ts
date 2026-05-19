import { StateCreator } from 'zustand';
import { authStorage } from '@/lib/api';

export interface AuthSlice {
  user: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  setUser: (user: any | null) => void;
  setLoading: (isLoading: boolean) => void;
  
  login: (accessToken: string, refreshToken?: string) => void;
  logout: () => void;
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
  user: null,
  isLoading: true, // Initial state assumes we might be loading
  isAuthenticated: false,

  setUser: (user) => set({ 
    user, 
    isAuthenticated: !!user,
    isLoading: false 
  }),
  
  setLoading: (isLoading) => set({ isLoading }),

  login: (accessToken: string, refreshToken?: string) => {
    authStorage.setTokens(accessToken, refreshToken);
    // Setting user to null forces a refetch or redirection depending on implementation
    // But typically we trigger a re-render or let React Query refetch
    // This slice just holds the current metadata.
  },

  logout: () => {
    authStorage.clearTokens();
    set({ user: null, isAuthenticated: false });
  },
});
