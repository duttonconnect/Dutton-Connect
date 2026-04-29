import { createContext, useContext, useEffect, useState } from "react";

export type Role = "pro" | "customer";
const STORAGE_KEY = "dutton_account_role";

type RoleContextValue = {
  role: Role | null;
  setRole: (r: Role) => void;
  clearRole: () => void;
};

const RoleContext = createContext<RoleContextValue | null>(null);

function readRole(): Role | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "pro" || v === "customer" ? v : null;
  } catch {
    return null;
  }
}

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role | null>(() => readRole());

  useEffect(() => {
    if (role) {
      localStorage.setItem(STORAGE_KEY, role);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [role]);

  const value: RoleContextValue = {
    role,
    setRole: (r) => setRoleState(r),
    clearRole: () => setRoleState(null),
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within a RoleProvider");
  return ctx;
}
