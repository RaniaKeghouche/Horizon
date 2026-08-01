import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useData } from "../../data/store";
import { useAuth } from "./AuthContext";
import { DEMO_MODE } from "../../lib/config";
import { slugName, toLoginEmail } from "../../lib/username";
import { LEVEL_LABEL, LEVEL_GROUPS } from "../../lib/labels";
import type { Role, StudentLevel } from "../../lib/types";
import { User, Phone, BookOpen, KeyRound } from "lucide-react";

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
  level: "1as",
  parentName: "",
  parentPhone: "",
  subjects: [],
};

export default function RegisterFlow({
  mode,
  onDone,
  onCancel,
}: {
  mode: "signup" | "complete";
  onDone: () => void;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();
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
        email, 
        name: v.name.trim(),
        phone: v.phone.trim(),
        ...(v.role === "student"
          ? { level: v.level, parentName: v.parentName.trim(), parentPhone: v.parentPhone.trim() }
          : { subjects: v.subjects }),
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
      <div className="auth-form-content" style={{textAlign: 'center', marginTop: '2rem'}}>
        <div style={{fontSize: '4rem', marginBottom: '1rem'}}>✅</div>
        <h2 className="auth-title" style={{fontSize: '1.8rem'}}>Demande envoyée</h2>
        <p style={{color: '#475569', marginBottom: '0.5rem'}}>Votre identifiant de connexion :</p>
        <p style={{fontSize: '1.3rem', fontWeight: 800, color: '#4f46e5', background: '#eef2ff', padding: '0.75rem', borderRadius: '12px', userSelect: 'all'}}>{createdUsername}</p>
        <p style={{color: '#64748b', fontSize: '0.85rem', marginTop: '1rem', marginBottom: '2rem'}}>Notez-le. L'administration doit valider votre compte.</p>
        {onCancel && <button className="auth-register-text button" onClick={onCancel} style={{border:'none', background:'none', color:'#4f46e5', fontWeight:600, cursor:'pointer'}}>← {t("reg.backBtn")}</button>}
      </div>
    );
  }

  return (
    <div className="auth-form-content" style={{marginTop: '1rem'}}>
      <h2 className="auth-title" style={{fontSize: '1.8rem', marginBottom: '1rem'}}>{t("reg.title")}</h2>
      <p style={{color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem'}}>{t("reg.hint")}</p>

      <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '999px'}}>
        {(["student", "teacher"] as const).map((r) => (
          <button 
            key={r} 
            style={{
              flex: 1, 
              border: 'none', 
              background: v.role === r ? 'white' : 'transparent',
              color: v.role === r ? '#0f172a' : '#64748b',
              fontWeight: v.role === r ? 700 : 500,
              padding: '0.6rem',
              borderRadius: '999px',
              cursor: 'pointer',
              boxShadow: v.role === r ? '0 2px 10px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s'
            }}
            onClick={() => set("role", r as Role as RegData["role"])}
          >
            {r === "student" ? t("reg.studentBtn") : t("reg.teacherBtn")}
          </button>
        ))}
      </div>

      <div className="auth-form-group">
        <label>{t("reg.nameLabel")}</label>
        <div className="auth-input-wrapper">
          <User size={18} className="auth-input-icon" />
          <input value={v.name} onChange={(e) => set("name", e.target.value)} placeholder={t("reg.namePlaceholder")} />
        </div>
      </div>

      <div className="auth-form-group">
        <label>{t("reg.phoneLabel")}</label>
        <div className="auth-input-wrapper">
          <Phone size={18} className="auth-input-icon" />
          <input value={v.phone} onChange={(e) => set("phone", e.target.value)} placeholder="05..." />
        </div>
      </div>

      {v.role === "student" ? (
        <>
          <div className="auth-form-group">
            <label>{t("reg.levelLabel")}</label>
            <div className="auth-input-wrapper">
              <BookOpen size={18} className="auth-input-icon" />
              <select style={{width:'100%', padding:'0.875rem 1rem 0.875rem 2.75rem', borderRadius:'12px', border:'1px solid #e2e8f0', background:'#f8fafc', fontSize:'1rem', appearance:'none'}} value={v.level} onChange={(e) => set("level", e.target.value as StudentLevel)}>
                {LEVEL_GROUPS.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.levels.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
          <div className="auth-form-group">
            <label>{t("reg.parentNameLabel")}</label>
            <div className="auth-input-wrapper">
              <User size={18} className="auth-input-icon" />
              <input value={v.parentName} onChange={(e) => set("parentName", e.target.value)} />
            </div>
          </div>
          <div className="auth-form-group">
            <label>{t("reg.parentPhoneLabel")}</label>
            <div className="auth-input-wrapper">
              <Phone size={18} className="auth-input-icon" />
              <input value={v.parentPhone} onChange={(e) => set("parentPhone", e.target.value)} />
            </div>
          </div>
        </>
      ) : (
        <div className="auth-form-group">
          <label>{t("reg.subjectsLabel")}</label>
          <div className="auth-input-wrapper" style={{marginBottom: '0.5rem'}}>
            <BookOpen size={18} className="auth-input-icon" />
            <select
              style={{width:'100%', padding:'0.875rem 1rem 0.875rem 2.75rem', borderRadius:'12px', border:'1px solid #e2e8f0', background:'#f8fafc', fontSize:'1rem', appearance:'none'}}
              value=""
              onChange={(e) => { const id = e.target.value; if (id && !v.subjects.includes(id)) set("subjects", [...v.subjects, id]); }}
            >
              <option value="">{t("reg.addSubjectOption")}</option>
              {allSubjects.filter((s) => !v.subjects.includes(s.id)).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          {v.subjects.length > 0 && (
            <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem'}}>
              {v.subjects.map((id) => (
                <span key={id} style={{display:'inline-flex', alignItems:'center', gap:'0.4rem', background:'#eef2ff', color:'#4f46e5', borderRadius:'999px', padding:'0.3rem 0.75rem', fontSize:'0.85rem', fontWeight:600}}>
                  {subjName(id)}
                  <button type="button" onClick={() => toggleSubject(id)} style={{background:'none', border:'none', color:'#4f46e5', cursor:'pointer', padding:0, fontSize:'1rem'}}>✕</button>
                </span>
              ))}
            </div>
          )}
          {allSubjects.length === 0 && (
            <span style={{color: '#64748b', fontSize: '0.85rem'}}>{t("reg.noSubjectsMsg")}</span>
          )}
        </div>
      )}

      {mode !== "complete" && (
        <div className="auth-form-group">
          <label>{t("reg.passwordHint")}</label>
          <div className="auth-input-wrapper">
            <KeyRound size={18} className="auth-input-icon" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} autoComplete="new-password" />
          </div>
        </div>
      )}

      {error && <p className="auth-error-message">{error}</p>}
      
      <button className="auth-submit-btn" onClick={submit} disabled={!valid || busy} style={{marginTop: '1rem'}}>
        {busy ? t("reg.sending") : t("reg.submitBtn")}
      </button>
      
      {onCancel && (
        <div className="auth-register-text" style={{marginTop: '1.5rem'}}>
          <button onClick={onCancel}>← {t("reg.backBtn")}</button>
        </div>
      )}
    </div>
  );
}
