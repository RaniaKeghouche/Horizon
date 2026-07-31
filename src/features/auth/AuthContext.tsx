// Auth state + role, shared across the whole app.
//
//  - DEMO_MODE: pick a role; profile comes from the local store (no real auth).
//  - Firebase mode: owner e-mail => admin (auto). Everyone else self-registers and stays
//    "pending" until the admin approves (a users doc is created, watched live here).
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DEMO_MODE } from "../../lib/config";
import { useData } from "../../data/store";
import { startSync, stopSync } from "../../data/firebaseSync";
import { provisionOwner, seedDefaultSubjects } from "../../data/bootstrap";
import type { AppUser, Role } from "../../lib/types";

export type RequestStatus = "none" | "pending" | "approved" | "rejected";

interface AuthState {
  profile: AppUser | null;
  role: Role | null;
  authed: boolean; // approved account with a role
  signedIn: boolean; // Firebase user present (may still be pending)
  uid: string | null;
  email: string | null;
  requestStatus: RequestStatus | null;
  loading: boolean;
  loginAs: (role: Role) => void; // demo
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  registerAccount: (email: string, password: string) => Promise<string>; // returns uid
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);
const DEMO_KEY = "horizon-demo-role";

export function AuthProvider({ children }: { children: ReactNode }) {
  const users = useData((s) => s.users);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<RequestStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const docUnsubs = useRef<Array<() => void>>([]);

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
    let unsubAuth = () => {};
    (async () => {
      const { onAuthStateChanged } = await import("firebase/auth");
      const { auth, db } = await import("../../lib/firebase");
      const { doc, onSnapshot } = await import("firebase/firestore");

      unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
        docUnsubs.current.forEach((u) => u());
        docUnsubs.current = [];

        if (!fbUser) {
          stopSync();
          setSignedIn(false);
          setUid(null);
          setEmail(null);
          setProfile(null);
          setRequestStatus(null);
          setLoading(false);
          return;
        }

        setSignedIn(true);
        setUid(fbUser.uid);
        setEmail(fbUser.email);

        // Owner bootstrap (admin) — everyone else registers.
        const isOwner = await provisionOwner(fbUser.uid, fbUser.email);
        await startSync();
        if (isOwner) seedDefaultSubjects().catch(() => {});

        // Watch this user's own profile doc + registration request (rules allow "own").
        docUnsubs.current.push(
          onSnapshot(doc(db, "users", fbUser.uid), (snap) => {
            setProfile(snap.exists() ? ({ id: snap.id, ...snap.data() } as AppUser) : null);
            setLoading(false);
          })
        );
        docUnsubs.current.push(
          onSnapshot(doc(db, "registrationRequests", fbUser.uid), (snap) => {
            setRequestStatus(snap.exists() ? (snap.data().status as RequestStatus) : "none");
          })
        );
      });
    })();
    return () => {
      unsubAuth();
      docUnsubs.current.forEach((u) => u());
    };
  }, []);

  const loginAs = (role: Role) => {
    localStorage.setItem(DEMO_KEY, role);
    setProfile(users.find((u) => u.role === role) ?? null);
  };

  const login = async (e: string, password: string) => {
    const { signInWithEmailAndPassword } = await import("firebase/auth");
    const { auth } = await import("../../lib/firebase");
    await signInWithEmailAndPassword(auth, e, password);
  };

  const loginWithGoogle = async () => {
    const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
    const { auth } = await import("../../lib/firebase");
    await signInWithPopup(auth, new GoogleAuthProvider());
  };

  const registerAccount = async (e: string, password: string): Promise<string> => {
    const { createUserWithEmailAndPassword } = await import("firebase/auth");
    const { auth } = await import("../../lib/firebase");
    const cred = await createUserWithEmailAndPassword(auth, e, password);
    return cred.user.uid;
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
        signedIn,
        uid,
        email,
        requestStatus,
        loading,
        loginAs,
        login,
        loginWithGoogle,
        registerAccount,
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
