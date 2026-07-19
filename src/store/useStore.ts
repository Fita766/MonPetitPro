import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '../types/domain';

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
  isLoadingAuth: boolean;
  setIsLoadingAuth: (isLoading: boolean) => void;
  isLoadingProfile: boolean;
  setIsLoadingProfile: (isLoading: boolean) => void;
  schemaMessage: string | null;
  setSchemaMessage: (message: string | null) => void;
  toastMessage: string | null;
  setToastMessage: (msg: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set((state) => ({
    user,
    profile: user?.id === state.user?.id ? state.profile : null,
  })),
  profile: null,
  setProfile: (profile) => set({ profile }),
  isLoadingAuth: true,
  setIsLoadingAuth: (isLoading) => set({ isLoadingAuth: isLoading }),
  isLoadingProfile: false,
  setIsLoadingProfile: (isLoading) => set({ isLoadingProfile: isLoading }),
  schemaMessage: null,
  setSchemaMessage: (schemaMessage) => set({ schemaMessage }),
  toastMessage: null,
  setToastMessage: (msg) => set({ toastMessage: msg }),
}));
