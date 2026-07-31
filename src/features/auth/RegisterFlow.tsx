import { useState } from "react";
import { useData } from "../../data/store";
import { useAuth } from "./AuthContext";
import { DEMO_MODE } from "../../lib/config";
import { slugName, toLoginEmail } from "../../lib/username";
import { LEVELS, LEVEL_LABEL } from "../../lib/labels";
import type { Role, StudentLevel } from "../../lib/types";

interface RegData {
  role: "student" | "teacher";
  name: string;
  phone: string;
  level: StudentLevel;
  parentName: string;
  parentPhone: string;
  subjects: string[];
}

const EMPTY: RegData = {
  role: "student",
  name: "",
  phone: "",
  level: "high",
  parentName: "",
  parentPhone: "",
  subjects: [],
};

/**
 * mode "signup": name + password (+ role details). No e-mail, no code — the app generates
 * a unique username. mode "complete": user already signed in (Google), collect details only.
 */
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
  const { registerAccount, uid, email: authEmail } = useAuth();

  const [v, setV] = useState<RegData>(EMPTY);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [createdUsername, setCreatedUsername] = useState("");

  const set = <K extends keyof RegData>(k: K, val: RegData[K]) => setV((p) => ({ ...p, [k]: val }));
  function toggleSubject(id: string) {
    set("subjects", v.subjects.includes(id) ? v.subjects.filter((x) => x !== id) : [...v.subjects, id]);
  }

  const valid =
    v.name.trim() &&
    v.phone.trim() &&
    (v.role === "teacher" ? v.subjects.length > 0 : v.parentPhone.trim()) &&
    (mode === "complete" || password.length >= 6);

  // Create the auth account, retrying with a numeric suffix until the username is unique.
  async function createUnique(base: string): Promise<{ id: string; email: string; username: string }> {
    for (let i = 0; i < 6; i++) {
      const username = i === 0 ? base : `${base}${Math.floor(100 + Math.random() * 900)}`;
      const email = toLoginEmail(username);
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

  async function submit() {
    setError("");
    setBusy(true);
    try {
      let id: string;
      let email: string;
      let username: string;

      if (mode === "complete") {
        id = uid ?? crypto.randomUUID();
        email = authEmail ?? "";
        username = email.split("@")[0] || slugName(v.name);
      } else if (DEMO_MODE) {
        username = slugName(v.name);
        email = toLoginEmail(username);
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
        email, // internal auth e-mail (username@horizon.app)
        name: v.name.trim(),
        phone: v.phone.trim(),
        ...(v.role === "student"
          ? { level: v.level, parentName: v.parentName.trim(), parentPhone: v.parentPhone.trim() }
          : { subjects: v.subjects }),
      });

      setCreatedUsername(username);
      if (DEMO_MODE) {
        // In demo there's no session; just confirm and close.
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

  // Demo confirmation screen showing the generated username.
  if (createdUsername && DEMO_MODE) {
    return (
      <div className="stack center">
        <div className="pending-icon">✅</div>
        <h2 className="login-title">Demande envoyée</h2>
        <p className="muted">Votre identifiant de connexion :</p>
        <p className="username-badge">{createdUsername}</p>
        <p className="muted small">Notez-le. L'administration doit valider votre compte.</p>
        {onCancel && <button className="btn btn-ghost" onClick={onCancel}>Retour</button>}
      </div>
    );
  }

  return (
    <div className="stack">
      <h2 className="login-title">Créer un compte</h2>
      <p className="demo-hint">Pas d'e-mail nécessaire — un identifiant vous sera attribué.</p>

      <div className="seg" style={{ alignSelf: "center" }}>
        {(["student", "teacher"] as const).map((r) => (
          <button key={r} className={"seg-btn " + (v.role === r ? "on pill-ok" : "")} onClick={() => set("role", r as Role as RegData["role"])}>
            {r === "student" ? "Étudiant / Parent" : "Enseignant"}
          </button>
        ))}
      </div>

      <label className="field">
        <span>Nom et prénom</span>
        <input className="input" value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="ex : Rania Keghouche" />
      </label>
      <label className="field">
        <span>Téléphone</span>
        <input className="input" value={v.phone} onChange={(e) => set("phone", e.target.value)} />
      </label>

      {v.role === "student" ? (
        <>
          <label className="field">
            <span>Niveau</span>
            <select className="input" value={v.level} onChange={(e) => set("level", e.target.value as StudentLevel)}>
              {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Nom du parent</span>
            <input className="input" value={v.parentName} onChange={(e) => set("parentName", e.target.value)} />
          </label>
          <label className="field">
            <span>Téléphone parent</span>
            <input className="input" value={v.parentPhone} onChange={(e) => set("parentPhone", e.target.value)} />
          </label>
        </>
      ) : (
        <div className="field">
          <span>Matière(s) enseignée(s) — à choisir dans la liste</span>
          <select
            className="input"
            value=""
            onChange={(e) => { const id = e.target.value; if (id && !v.subjects.includes(id)) set("subjects", [...v.subjects, id]); }}
          >
            <option value="">— Ajouter une matière —</option>
            {allSubjects.filter((s) => !v.subjects.includes(s.id)).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {v.subjects.length > 0 && (
            <div className="chip-row">
              {v.subjects.map((id) => (
                <span key={id} className="chip-selected">
                  {subjName(id)}
                  <button type="button" onClick={() => toggleSubject(id)} aria-label="retirer">✕</button>
                </span>
              ))}
            </div>
          )}
          {allSubjects.length === 0 && (
            <span className="muted small">Aucune matière disponible — l'administration doit d'abord en créer.</span>
          )}
        </div>
      )}

      {mode !== "complete" && (
        <label className="field">
          <span>Mot de passe (6+ caractères)</span>
          <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} autoComplete="new-password" />
        </label>
      )}

      {error && <p className="error-text">{error}</p>}
      <button className="btn btn-primary btn-lg" onClick={submit} disabled={!valid || busy}>
        {busy ? "Envoi…" : "Envoyer ma demande"}
      </button>
      {onCancel && <button className="link-btn" onClick={onCancel}>Retour</button>}
    </div>
  );
}
