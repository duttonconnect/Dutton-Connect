import { createContext, useContext, useEffect, useState } from "react";

export type Role = "pro" | "customer";

const DUAL_KEY = "dutton_dual_role";
const LEGACY_KEY = "dutton_account_role";

type DualState = { roles: Role[]; currentMode: Role | null };

function readState(): DualState {
  try {
    const raw = localStorage.getItem(DUAL_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (Array.isArray(p.roles) && p.roles.length > 0) return p;
    }
    // Migrate legacy single-role key
    const leg = localStorage.getItem(LEGACY_KEY);
    if (leg === "pro" || leg === "customer") {
      return { roles: [leg], currentMode: leg };
    }
  } catch { /* intentional */ }
  return { roles: [], currentMode: null };
}

type RoleContextValue = {
  /** Backward-compat: same as currentMode */
  role: Role | null;
  roles: Role[];
  currentMode: Role | null;
  /** Backward-compat: sets a single role as the only role */
  setRole: (r: Role) => void;
  /** Set multiple roles at once, optionally specifying the active mode */
  setRoles: (roles: Role[], mode?: Role) => void;
  /** Switch active mode (must already be in roles) */
  setCurrentMode: (mode: Role) => void;
  /** Add a role without removing existing ones */
  addRole: (r: Role) => void;
  /** Back to account picker */
  clearRole: () => void;
  hasRole: (r: Role) => boolean;
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DualState>(() => readState());

  useEffect(() => {
    localStorage.setItem(DUAL_KEY, JSON.stringify(state));
    // Keep legacy key in sync for any consumers that read it directly
    if (state.currentMode) {
      localStorage.setItem(LEGACY_KEY, state.currentMode);
    } else {
      localStorage.removeItem(LEGACY_KEY);
    }
  }, [state]);

  const value: RoleContextValue = {
    role: state.currentMode,
    roles: state.roles,
    currentMode: state.currentMode,
    setRole: (r) =>
      setState((s) => ({
        roles: s.roles.includes(r) ? s.roles : [r],
        currentMode: r,
      })),
    setRoles: (roles, mode) =>
      setState({ roles, currentMode: mode ?? roles[0] ?? null }),
    setCurrentMode: (mode) =>
      setState((s) => ({ ...s, currentMode: mode })),
    addRole: (r) =>
      setState((s) => ({
        roles: s.roles.includes(r) ? s.roles : [...s.roles, r],
        currentMode: s.currentMode ?? r,
      })),
    clearRole: () => setState({ roles: [], currentMode: null }),
    hasRole: (r) => state.roles.includes(r),
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within a RoleProvider");
  return ctx;
}
