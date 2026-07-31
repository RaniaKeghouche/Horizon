import { useState } from "react";
import { useData } from "../../data/store";
import { useAuth } from "./AuthContext";
import { DEMO_MODE } from "../../lib/config";
import { generateCode, sendCodeEmail } from "../../lib/email";
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
 * mode "signup": email → 6-digit code → details + password.
 * mode "complete": (already signed in via Google, e-mail verified) details only.
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
  const { registerAccount, uid, email: authEmail } = useAuth();

  const [step, setStep] = useState<"email" | "code" | "details">(
    mode === "complete" ? "details" : "email"
  );
  const [email, setEmail] = useState(authEmail ?? "");
  const [password, setPassword] = useState("");
  const [sentCode, setSentCode] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [v, setV] = useState<RegData>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const set = <K extends keyof RegData>(k: K, val: RegData[K]) => setV((p) => ({ ...p, [k]: val }));

  async function sendCode() {
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("E-mail invalide.");
    setBusy(true);
    const code = generateCode();
    setSentCode(code);
    const sent = await sendCodeEmail(email, code, v.name);
    setBusy(false);
    setStep("code");
    setInfo(sent ? `Un code a été envoyé à ${email}.` : `Mode test : votre code est ${code}`);
  }

  function verifyCode() {
    setError("");
    if (codeInput.trim() === sentCode) {
      setInfo("");
      setStep("details");
    } else {
      setError("Code incorrect.");
    }
  }

  function toggleSubject(id: string) {
    set("subjects", v.subjects.includes(id) ? v.subjects.filter((x) => x !== id) : [...v.subjects, id]);
  }

  const detailsValid =
    v.name.trim() &&
    v.phone.trim() &&
    (v.role === "teacher" ? v.subjects.length > 0 : v.parentPhone.trim()) &&
    (mode === "complete" || password.length >= 6);

  async function submit() {
    setError("");
    setBusy(true);
    try {
      let id: string;
      let usedEmail = email;
      if (mode === "complete") {
        id = uid ?? crypto.randomUUID();
        usedEmail = authEmail ?? email;
      } else if (DEMO_MODE) {
        id = crypto.randomUUID();
      } else {
        id = await registerAccount(email, password);
      }
      addRegistrationRequest({
        id,
        role: v.role,
        email: usedEmail,
        name: v.name.trim(),
        phone: v.phone.trim(),
        ...(v.role === "student"
          ? { level: v.level, parentName: v.parentName.trim(), parentPhone: v.parentPhone.trim() }
          : { subjects: v.subjects }),
      });
      onDone();
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Erreur lors de l'inscription.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <h2 className="login-title">Créer un compte</h2>

      {step === "email" && (
        <>
          <p className="demo-hint">Confirmez d'abord votre e-mail par un code.</p>
          <label className="field">
            <span>E-mail</span>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-primary btn-lg" onClick={sendCode} disabled={busy}>
            {busy ? "Envoi…" : "Envoyer le code"}
          </button>
          {onCancel && <button className="link-btn" onClick={onCancel}>Retour</button>}
        </>
      )}

      {step === "code" && (
        <>
          {info && <p className="preview-box">{info}</p>}
          <label className="field">
            <span>Code de confirmation (6 chiffres)</span>
            <input className="input" inputMode="numeric" maxLength={6} value={codeInput} onChange={(e) => setCodeInput(e.target.value)} />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-primary btn-lg" onClick={verifyCode}>Vérifier</button>
          <button className="link-btn" onClick={sendCode} disabled={busy}>Renvoyer le code</button>
        </>
      )}

      {step === "details" && (
        <>
          <div className="seg" style={{ alignSelf: "center" }}>
            {(["student", "teacher"] as const).map((r) => (
              <button key={r} className={"seg-btn " + (v.role === r ? "on pill-ok" : "")} onClick={() => set("role", r as Role as RegData["role"])}>
                {r === "student" ? "Étudiant / Parent" : "Enseignant"}
              </button>
            ))}
          </div>

          <label className="field">
            <span>Nom complet</span>
            <input className="input" value={v.name} onChange={(e) => set("name", e.target.value)} />
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
              <span>Matières enseignées</span>
              <div className="checkbox-list">
                {allSubjects.map((s) => (
                  <label key={s.id} className={"chip-toggle" + (v.subjects.includes(s.id) ? " on" : "")}>
                    <input type="checkbox" checked={v.subjects.includes(s.id)} onChange={() => toggleSubject(s.id)} />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {mode !== "complete" && (
            <label className="field">
              <span>Mot de passe (6+ caractères)</span>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} />
            </label>
          )}

          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-primary btn-lg" onClick={submit} disabled={!detailsValid || busy}>
            {busy ? "Envoi…" : "Envoyer ma demande"}
          </button>
        </>
      )}
    </div>
  );
}
