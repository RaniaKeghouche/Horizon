// Auth state + role, shared across the whole app.
//
// Two modes:
//  - DEMO_MODE (no Firebase key): pick a role, profile comes from the local store.
//  - Firebase mode: real email/password or Google login; profile auto-provisioned in
//    Firestore on first login (owner e-mail => admin), then real-time sync starts.
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { DEMO_MODE } from "../../lib/config";
import { useData } from "../../data/store";
import { startSync, stopSync } from "../../data/firebaseSync";
import { provisionUser, seedDefaultSubjects } from "../../data/bootstrap";
import type { AppUser, Role } from "../../lib/types";

interface AuthState {
  profile: AppUser | null;
  role: Role | null;
  authed: boolean;
  loading: boolean;
  loginAs: (role: Role) => void; // demo mode
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);
const DEMO_KEY = "horizon-demo-role";

export function AuthProvider({ children }: { children: ReactNode }) {
  const users = useData((s) => s.users);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // ---- Demo mode ----
  useEffect(() => {
    if (!DEMO_MODE) return;
    const savedRole = localStorage.getItem(DEMO_KEY) as Role | null;
    if (savedRole) setProfile(users.find((u) => u.role === savedRole) ?? null);
    setLoading(false);
  }, [users]);

  // ---- Firebase mode ----
  useEffect(() => {
    if (DEMO_MODE) return;
    let unsub = () => {};
    (async () => {
      const { onAuthStateChanged } = await import("firebase/auth");
      const { auth } = await import("../../lib/firebase");
      unsub = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          const p = await provisionUser(fbUser.uid, fbUser.email);
          setProfile(p);
          await startSync();
          if (p.role === "admin") {
            try {
              await seedDefaultSubjects();
            } catch {
              /* rules may not be deployed yet — ignore */
            }
          }
        } else {
          stopSync();
          setProfile(null);
        }
        setLoading(false);
      });
    })();
    return () => unsub();
  }, []);

  const loginAs = (role: Role) => {
    localStorage.setItem(DEMO_KEY, role);
    setProfile(users.find((u) => u.role === role) ?? null);
  };

  const login = async (email: string, password: string) => {
    const { signInWithEmailAndPassword } = await import("firebase/auth");
    const { auth } = await import("../../lib/firebase");
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email: string, password: string) => {
    const { createUserWithEmailAndPassword } = await import("firebase/auth");
    const { auth } = await import("../../lib/firebase");
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
    const { auth } = await import("../../lib/firebase");
    await signInWithPopup(auth, new GoogleAuthProvider());
  };

  const logout = async () => {
    if (DEMO_MODE) {
      localStorage.removeItem(DEMO_KEY);
      setProfile(null);
      return;
    }
    stopSync();
    const { signOut } = await import("firebase/auth");
    const { auth } = await import("../../lib/firebase");
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        profile,
        role: profile?.role ?? null,
        authed: !!profile,
        loading,
        loginAs,
        login,
        signup,
        loginWithGoogle,
        logout,
      }}
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
