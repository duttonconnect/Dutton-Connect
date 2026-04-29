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
  signup: (email: string, password: string, name: string, role?: "customer" | "pro") => Promise<void>;
  logout: () => Promise<void>;
  saveRoleToCloud: (role: Role) => Promise<void>;
  loadRoleFromCloud: () => Promise<Role | null>;
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

  const signup = async (email: string, password: string, name: string, role: "customer" | "pro" = "customer") => {
    if (!auth) throw new Error("Firebase is not configured.");
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name.trim()) {
      await updateProfile(cred.user, { displayName: name.trim() });
    }
    if (db) {
      await setDoc(
        doc(db, "users", cred.user.uid),
        { email: cred.user.email, displayName: name.trim(), role, createdAt: new Date().toISOString() },
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
    await setDoc(doc(db, "users", user.uid), { role }, { merge: true });
  };

  const loadRoleFromCloud = async (): Promise<Role | null> => {
    if (!db || !user) return null;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) return null;
      const data = snap.data();
      const r = data?.role;
      return r === "pro" || r === "customer" ? r : null;
    } catch {
      return null;
    }
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
