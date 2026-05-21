import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: number;
  email: string;
  full_name: string;
  is_admin: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem("lexai_token", token);
        set({ user, token });
      },
      logout: () => {
        localStorage.removeItem("lexai_token");
        set({ user: null, token: null });
      },
      isAuthenticated: () => !!get().token,
    }),
    { name: "lexai_auth" }
  )
);
