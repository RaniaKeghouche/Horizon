import { useState } from "react";
import { useData } from "../../data/store";
import { useAuth } from "./AuthContext";
import { DEMO_MODE } from "../../lib/config";
import { slugName, toLoginEmail } from "../../lib/username";
import { LEVEL_LABEL, LEVEL_GROUPS } from "../../lib/labels";
import type { StudentLevel } from "../../lib/types";
import { GraduationCap, User, Eye, EyeOff, Check, ArrowRight } from "lucide-react";

interface RegData {
  role: "student" | "teacher";
  name: string;
  email: string;
  phone: string;
  level: StudentLevel;
  parentName: string;
  parentPhone: string;
  subjects: string[];
}

const EMPTY: RegData = {
  role: "student",
  name: "",
  email: "",
  phone: "",
  level: "1as",
  parentName: "",
  parentPhone: "",
  subjects: [],
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"/>
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 23 23">
      <path fill="#f35325" d="M1 1h10v10H1z"/>
      <path fill="#81bc06" d="M12 1h10v10H12z"/>
      <path fill="#05a6f0" d="M1 12h10v10H1z"/>
      <path fill="#ffba08" d="M12 12h10v10H12z"/>
    </svg>
  );
}

export default function RegisterFlow({
  mode,
  onDone,
  onCancel,
}: {
  mode: "signup" | "complete";
  onDone: () => void;
  onCancel?: () => void;
}) {
  const allSubjects = useData((s) => s.subjects);
  const addRegistrationRequest = useData((s) => s.addRegistrationRequest);
  const subjName = (id: string) => allSubjects.find((x) => x.id === id)?.name ?? "?";
  const { registerAccount, loginWithProvider, uid, email: authEmail } = useAuth();

  const [v, setV] = useState<RegData>(EMPTY);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [createdUsername, setCreatedUsername] = useState("");

  const set = <K extends keyof RegData>(k: K, val: RegData[K]) => setV((p) => ({ ...p, [k]: val }));
  function toggleSubject(id: string) {
    set("subjects", v.subjects.includes(id) ? v.subjects.filter((x) => x !== id) : [...v.subjects, id]);
  }

  // Password rules
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const valid =
    v.name.trim() &&
    (v.email.trim() || DEMO_MODE) &&
    (mode === "complete" || password.length >= 6);

  async function createUnique(base: string): Promise<{ id: string; email: string; username: string }> {
    for (let i = 0; i < 6; i++) {
      const username = i === 0 ? base : `${base}${Math.floor(100 + Math.random() * 900)}`;
      const email = v.email.trim() || toLoginEmail(username);
      try {
        const id = await registerAccount(email, password);
        return { id, email, username };
      } catch (e) {
        const msg = String((e as { message?: string })?.message ?? "").toLowerCase();
        if (msg.includes("registered") || msg.includes("already") || msg.includes("exists")) continue;
        throw e;
      }
    }
    throw new Error("Impossible de générer un identifiant unique, réessayez.");
  }

  /** Redirige vers le fournisseur externe. En cas d'échec (fournisseur non
   *  activé côté Supabase, réseau), l'erreur remonte dans le bandeau du
   *  formulaire — l'utilisateur n'est jamais laissé sans explication. */
  async function oauth(provider: "google" | "azure") {
    setError("");
    setBusy(true);
    try {
      await loginWithProvider(provider);
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Connexion externe indisponible.");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setError("");
    setBusy(true);
    try {
      let id: string;
      let email: string;
      let username: string;

      if (mode === "complete") {
        id = uid ?? crypto.randomUUID();
        email = authEmail ?? v.email.trim();
        username = email.split("@")[0] || slugName(v.name);
      } else if (DEMO_MODE) {
        username = slugName(v.name);
        email = v.email.trim() || toLoginEmail(username);
        id = crypto.randomUUID();
      } else {
        const res = await createUnique(slugName(v.name));
        id = res.id;
        email = res.email;
        username = res.username;
      }

      addRegistrationRequest({
        id,
        role: v.role,
        email,
        name: v.name.trim(),
        phone: v.phone.trim() || "0550000000",
        ...(v.role === "student"
          ? { level: v.level, parentName: v.parentName.trim() || "Parent", parentPhone: v.parentPhone.trim() || "0550000000" }
          : { subjects: v.subjects.length > 0 ? v.subjects : (allSubjects[0] ? [allSubjects[0].id] : []) }),
      });

      setCreatedUsername(username);
      if (DEMO_MODE) {
        setBusy(false);
        return;
      }
      onDone();
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Erreur lors de l'inscription.");
    } finally {
      setBusy(false);
    }
  }

  if (createdUsername && DEMO_MODE) {
    return (
      <div className="reg-done">
        <div className="reg-done-mark"><Check size={34} strokeWidth={3} /></div>
        <h2 className="au-title">Demande envoyée</h2>
        <p className="reg-muted">Votre identifiant de connexion :</p>
        <p className="reg-username">{createdUsername}</p>
        <p className="reg-muted small" style={{ marginTop: "1rem", marginBottom: "2rem" }}>
          Notez-le. L'administration doit valider votre compte.
        </p>
        {onCancel && (
          <button className="au-submit" onClick={onCancel}>← Retour à la connexion</button>
        )}
      </div>
    );
  }

  return (
    <div className="au-reg">
      <h2 className="au-title">
        <span className="au-title-bar" />
        <span>Inscription</span>
      </h2>
      <p className="au-subtitle">Créez votre compte en quelques étapes</p>

      {/* Role Switcher */}
      <div className="reg-role-section">
        <span className="reg-role-label">Je suis</span>
        <div className="reg-role-switch">
          <button
            type="button"
            className={"reg-role-btn" + (v.role === "student" ? " on" : "")}
            onClick={() => set("role", "student")}
          >
            <GraduationCap size={18} />
            <span>Étudiant</span>
            {v.role === "student" && <span className="reg-role-radio" />}
          </button>
          <button
            type="button"
            className={"reg-role-btn" + (v.role === "teacher" ? " on" : "")}
            onClick={() => set("role", "teacher")}
          >
            <User size={18} />
            <span>Enseignant</span>
            {v.role === "teacher" && <span className="reg-role-radio" />}
          </button>
        </div>
      </div>

      <div className="au-field">
        <label>
          <span>Nom complet</span>
        </label>
        <div className="au-input">
          <input
            value={v.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Votre nom complet"
            required
          />
        </div>
      </div>

      <div className="au-field">
        <label>
          <span>Email</span>
        </label>
        <div className="au-input">
          <input
            type="email"
            value={v.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="Votre email"
            required
          />
        </div>
      </div>

      {v.role === "student" && (
        <div className="au-field">
          <label>
            <span>Niveau scolaire</span>
          </label>
          <div className="au-input">
            <select
              className="reg-select"
              value={v.level}
              onChange={(e) => set("level", e.target.value as StudentLevel)}
            >
              {LEVEL_GROUPS.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.levels.map((l) => (
                    <option key={l} value={l}>{LEVEL_LABEL[l]}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
      )}

      {v.role === "teacher" && (
        <div className="au-field">
          <label>
            <span>Matières enseignées</span>
          </label>
          <div className="au-input">
            <select
              className="reg-select"
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (id && !v.subjects.includes(id)) set("subjects", [...v.subjects, id]);
              }}
            >
              <option value="">Sélectionnez une matière...</option>
              {allSubjects.filter((s) => !v.subjects.includes(s.id)).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          {v.subjects.length > 0 && (
            <div className="reg-chips-row">
              {v.subjects.map((id) => (
                <span key={id} className="reg-chip">
                  {subjName(id)}
                  <button type="button" onClick={() => toggleSubject(id)}>✕</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {mode !== "complete" && (
        <div className="au-field">
          <label>
            <span>Mot de passe</span>
          </label>
          <div className="au-input">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Créez un mot de passe"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="au-eye"
              onClick={() => setShowPassword((s) => !s)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Password Security Rules Checklist */}
          <div className="reg-pwd-rules">
            <div className={"reg-rule" + (hasMinLength ? " passed" : "")}>
              <span className="reg-rule-icon"><Check size={13} /></span>
              <span>Au moins 8 caractères</span>
            </div>
            <div className={"reg-rule" + (hasNumber ? " passed" : "")}>
              <span className="reg-rule-icon"><Check size={13} /></span>
              <span>Un chiffre</span>
            </div>
            <div className={"reg-rule" + (hasUppercase ? " passed" : "")}>
              <span className="reg-rule-icon"><Check size={13} /></span>
              <span>Une lettre majuscule</span>
            </div>
            <div className={"reg-rule" + (hasSpecial ? " passed" : "")}>
              <span className="reg-rule-icon"><Check size={13} /></span>
              <span>Un caractère spécial</span>
            </div>
          </div>
        </div>
      )}

      {error && <p className="au-error">{error}</p>}

      <button
        type="button"
        className="au-submit"
        onClick={submit}
        disabled={!valid || busy}
      >
        <span>{busy ? "Création en cours..." : "Créer mon compte"}</span>
        <ArrowRight size={18} />
      </button>

      <div className="au-divider">
        <span>ou continuer avec</span>
      </div>

      {/* Vraie redirection OAuth. Ces boutons appelaient `submit`, c'est-à-dire
          la création d'un compte mot de passe ordinaire : cliquer « Google » ne
          lançait aucune authentification Google. Le fournisseur doit être activé
          dans Supabase → Authentication → Providers, sinon l'erreur s'affiche
          au-dessus au lieu d'échouer en silence. */}
      <div className="au-social-grid">
        <button type="button" className="au-social-btn" onClick={() => oauth("google")} disabled={busy}>
          <GoogleIcon />
          <span>Google</span>
        </button>
        <button type="button" className="au-social-btn" onClick={() => oauth("azure")} disabled={busy}>
          <MicrosoftIcon />
          <span>Microsoft</span>
        </button>
      </div>

      {onCancel && (
        <p className="au-alt">
          Vous avez déjà un compte ?{" "}
          <button type="button" onClick={onCancel}>Se connecter</button>
        </p>
      )}
    </div>
  );
}
