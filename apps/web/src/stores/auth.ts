import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthOrg {
  id: string;
  name: string;
  slug: string;
  roleKey: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  orgId: string | null;
  organizations: AuthOrg[];
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, token: string, organizations: AuthOrg[]) => void;
  setOrgId: (orgId: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      orgId: null,
      organizations: [],
      isAuthenticated: false,
      setAuth: (user, token, organizations) =>
        set({
          user,
          token,
          organizations,
          orgId: organizations[0]?.id ?? null,
          isAuthenticated: true,
        }),
      setOrgId: (orgId) => set({ orgId }),
      logout: () =>
        set({
          user: null,
          token: null,
          orgId: null,
          organizations: [],
          isAuthenticated: false,
        }),
    }),
    { name: "pb-auth-storage" }
  )
);
