import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "./firebase";
import { type Role } from "./role";

export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  isConfigured: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, roles?: Role[]) => Promise<void>;
  logout: () => Promise<void>;
  /** Legacy single-role save (also writes roles array) */
  saveRoleToCloud: (role: Role) => Promise<void>;
  /** Legacy single-role load — migrates roles array if present */
  loadRoleFromCloud: () => Promise<Role | null>;
  /** Save full dual-role state */
  saveRolesToCloud: (roles: Role[], currentMode: Role) => Promise<void>;
  /** Load dual-role state — returns null if not set */
  loadRolesFromCloud: () => Promise<{ roles: Role[]; currentMode: Role } | null>;
  /** Add a single role without overwriting other roles */
  addRoleToCloud: (role: Role) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(u: User): AuthUser {
  return { uid: u.uid, email: u.email, displayName: u.displayName };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ? toAuthUser(firebaseUser) : null);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Load isAdmin flag whenever the logged-in user changes.
  useEffect(() => {
    if (!user || !db) {
      setIsAdmin(false);
      return;
    }
    getDoc(doc(db, "users", user.uid))
      .then((snap) => {
        setIsAdmin(snap.exists() ? Boolean(snap.data()?.isAdmin) : false);
      })
      .catch(() => setIsAdmin(false));
  }, [user?.uid]);

  const login = async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase is not configured.");
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (
    email: string,
    password: string,
    name: string,
    roles: Role[] = ["customer"],
  ) => {
    if (!auth) throw new Error("Firebase is not configured.");
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name.trim()) {
      await updateProfile(cred.user, { displayName: name.trim() });
    }
    if (db) {
      const currentMode = roles[0] ?? "customer";
      // Write both legacy `role` field and new `roles` array for migration safety
      await setDoc(
        doc(db, "users", cred.user.uid),
        {
          email: cred.user.email,
          displayName: name.trim(),
          role: currentMode,
          roles,
          currentMode,
          createdAt: new Date().toISOString(),
        },
        { merge: true },
      );
    }
  };

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
  };

  const saveRoleToCloud = async (role: Role) => {
    if (!db || !user) return;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      const existing: Role[] = snap.exists() ? (snap.data()?.roles ?? [snap.data()?.role].filter(Boolean)) : [];
      const roles: Role[] = existing.includes(role) ? existing : [...existing, role];
      await setDoc(
        doc(db, "users", user.uid),
        { role, roles, currentMode: role },
        { merge: true },
      );
    } catch {
      // Fallback: just save the single role
      await setDoc(doc(db, "users", user.uid), { role }, { merge: true });
    }
  };

  const loadRoleFromCloud = async (): Promise<Role | null> => {
    if (!db || !user) return null;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) return null;
      const data = snap.data();
      // Prefer currentMode if present
      const cm = data?.currentMode;
      if (cm === "pro" || cm === "customer") return cm;
      const r = data?.role;
      return r === "pro" || r === "customer" ? r : null;
    } catch {
      return null;
    }
  };

  const saveRolesToCloud = async (roles: Role[], currentMode: Role) => {
    if (!db || !user) return;
    await setDoc(
      doc(db, "users", user.uid),
      { roles, currentMode, role: currentMode },
      { merge: true },
    );
  };

  const loadRolesFromCloud = async (): Promise<{ roles: Role[]; currentMode: Role } | null> => {
    if (!db || !user) return null;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) return null;
      const data = snap.data();
      // New format: roles array + currentMode
      if (Array.isArray(data?.roles) && data.roles.length > 0) {
        const cm = (data.currentMode === "pro" || data.currentMode === "customer")
          ? data.currentMode
          : data.roles[0];
        return { roles: data.roles as Role[], currentMode: cm };
      }
      // Legacy: single role field
      const r = data?.role;
      if (r === "pro" || r === "customer") {
        return { roles: [r], currentMode: r };
      }
      return null;
    } catch {
      return null;
    }
  };

  const addRoleToCloud = async (role: Role) => {
    if (!db || !user) return;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      const existing: Role[] = snap.exists() ? (snap.data()?.roles ?? []) : [];
      const roles: Role[] = existing.includes(role) ? existing : [...existing, role];
      await setDoc(doc(db, "users", user.uid), { roles }, { merge: true });
    } catch {}
  };

  const value: AuthContextValue = {
    user,
    loading,
    isConfigured: isFirebaseConfigured,
    isAdmin,
    login,
    signup,
    logout,
    saveRoleToCloud,
    loadRoleFromCloud,
    saveRolesToCloud,
    loadRolesFromCloud,
    addRoleToCloud,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
