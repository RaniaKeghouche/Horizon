// Auth state + role, shared across the whole app.
// Role is read from the `users/{uid}` Firestore document (RBAC, cahier §9).
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
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { COLLECTIONS, type AppUser, type Role } from "../../lib/types";

interface AuthState {
  user: User | null;
  profile: AppUser | null;
  role: Role | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        const snap = await getDoc(doc(db, COLLECTIONS.users, fbUser.uid));
        setProfile(snap.exists() ? ({ id: snap.id, ...snap.data() } as AppUser) : null);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, role: profile?.role ?? null, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
