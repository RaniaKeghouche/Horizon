// Auth state + role, shared across the whole app.
//
//  - DEMO_MODE: pick a role; profile comes from the local seeded store.
//  - Supabase mode: owner e-mail => admin (auto). Everyone else self-registers and stays
//    "pending" until the admin approves. Profile & request status are derived live from the
//    synced store (users + registrationRequests), so approval unlocks access in real time.
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { DEMO_MODE } from "../../lib/config";
import { useData } from "../../data/store";
import { startSync, stopSync, fetchPublicCatalog } from "../../data/firebaseSync";
import { startSheetSync, stopSheetSync } from "../../data/sheetSync";
import { provisionOwner, seedDefaultSubjects } from "../../data/bootstrap";
import type { AppUser, Role } from "../../lib/types";

export type RequestStatus = "none" | "pending" | "approved" | "rejected";

interface AuthState {
  profile: AppUser | null;
  role: Role | null;
  authed: boolean;
  signedIn: boolean;
  uid: string | null;
  email: string | null;
  requestStatus: RequestStatus | null;
  loading: boolean;
  loginAs: (role: Role) => void; // demo
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  /** OAuth générique. Le fournisseur doit être activé dans Supabase →
   *  Authentication → Providers, sinon l'appel remonte une erreur explicite. */
  loginWithProvider: (provider: "google" | "azure") => Promise<void>;
  registerAccount: (email: string, password: string) => Promise<string>; // returns uid
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);
const DEMO_KEY = "horizon-demo-role";

export function AuthProvider({ children }: { children: ReactNode }) {
  const users = useData((s) => s.users);
  const requests = useData((s) => s.registrationRequests);

  const [demoProfile, setDemoProfile] = useState<AppUser | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  // ---- Demo mode ----
  useEffect(() => {
    if (!DEMO_MODE) return;
    const savedRole = localStorage.getItem(DEMO_KEY) as Role | null;
    if (savedRole) setDemoProfile(users.find((u) => u.role === savedRole) ?? null);
    setLoading(false);
  }, [users]);

  // ---- Supabase mode ----
  useEffect(() => {
    if (DEMO_MODE) return;
    let unsub = () => {};
    (async () => {
      const { supabase } = await import("../../lib/supabase");
      // Load the public catalogue so the registration screen has its dropdowns pre-login.
      fetchPublicCatalog().catch(() => {});

      async function handle(session: { user: { id: string; email?: string } } | null) {
        const user = session?.user ?? null;
        if (!user) {
          stopSync();
          setSignedIn(false);
          setUid(null);
          setEmail(null);
          setLoading(false);
          return;
        }
        setSignedIn(true);
        setUid(user.id);
        setEmail(user.email ?? null);
        // try/finally : sans lui, une erreur de provisionOwner ou du chargement
        // initial laissait `loading` a true pour toujours — un ecran de
        // chargement sans fin, et aucune trace de la cause.
        try {
          const isOwner = await provisionOwner(user.id, user.email ?? null);
          await startSync();
          if (isOwner) seedDefaultSubjects().catch(() => {});
        } catch (err) {
          console.error("[auth] chargement initial interrompu", err);
        } finally {
          setLoading(false);
        }
      }

      const { data } = await supabase.auth.getSession();
      await handle(data.session as never);
      const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
        handle(session as never);
      });
      unsub = () => listener.subscription.unsubscribe();
    })();
    return () => unsub();
  }, []);

  // Derive profile & request status from the live store (Supabase mode).
  const profile = DEMO_MODE ? demoProfile : uid ? users.find((u) => u.id === uid) ?? null : null;
  const requestStatus: RequestStatus | null = DEMO_MODE
    ? null
    : uid
    ? ((requests.find((r) => r.id === uid)?.status as RequestStatus) ?? "none")
    : null;

  // Only the admin app pushes the Google Sheet backup (it sees all the data).
  const currentRole = profile?.role ?? null;
  useEffect(() => {
    if (DEMO_MODE) return;
    if (currentRole === "admin") startSheetSync();
    else stopSheetSync();
    return () => stopSheetSync();
  }, [currentRole]);

  const loginAs = (role: Role) => {
    localStorage.setItem(DEMO_KEY, role);
    setDemoProfile(users.find((u) => u.role === role) ?? null);
  };

  const login = async (e: string, password: string) => {
    const { supabase } = await import("../../lib/supabase");
    const { error } = await supabase.auth.signInWithPassword({ email: e, password });
    if (error) throw error;
  };

  const loginWithProvider = async (provider: "google" | "azure") => {
    if (DEMO_MODE) throw new Error("Connexion externe indisponible en mode démo.");
    const { supabase } = await import("../../lib/supabase");
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const loginWithGoogle = async () => {
    await loginWithProvider("google");
  };

  const registerAccount = async (e: string, password: string): Promise<string> => {
    const { supabase } = await import("../../lib/supabase");
    const { data, error } = await supabase.auth.signUp({ email: e, password });
    if (error) throw error;
    return data.user?.id ?? "";
  };

  const logout = async () => {
    if (DEMO_MODE) {
      localStorage.removeItem(DEMO_KEY);
      setDemoProfile(null);
      return;
    }
    stopSync();
    const { supabase } = await import("../../lib/supabase");
    await supabase.auth.signOut();
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
        loginWithProvider,
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
