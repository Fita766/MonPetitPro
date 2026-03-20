import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoadingAuth: boolean;
  setIsLoadingAuth: (isLoading: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  isLoadingAuth: true,
  setIsLoadingAuth: (isLoading) => set({ isLoadingAuth: isLoading }),
}));
