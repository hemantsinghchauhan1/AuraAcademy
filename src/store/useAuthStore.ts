import { create } from "zustand";

interface UserSession {
  id: string;
  email: string;
  role: string;
  name: string;
  avatarUrl: string | null;
  streak: number;
  xp: number;
}

interface AuthState {
  user: UserSession | null;
  isAuthenticated: boolean;
  setUser: (user: UserSession | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));
