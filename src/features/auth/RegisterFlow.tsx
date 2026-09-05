import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useData } from "../../data/store";
import { useAuth } from "./AuthContext";
import { DEMO_MODE } from "../../lib/config";
import { slugName, toLoginEmail, nextVariant } from "../../lib/username";
import RequestSent from "./RequestSent";
import { LEVEL_LABEL } from "../../lib/labels";
import { useLabels } from "../../lib/useLabels";
import type { StudentLevel } from "../../lib/types";
import { GraduationCap, User, Eye, EyeOff, Check, ArrowRight, X, Info } from "lucide-react";

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
  const { t } = useTranslation();
  const L = useLabels();
  const allSubjects = useData((s) => s.subjects);
  const addRegistrationRequest = useData((s) => s.addRegistrationRequest);
  const addSubject = useData((s) => s.addSubject);
  const subjName = (id: string) => allSubjects.find((x) => x.id === id)?.name ?? "?";
  const { registerAccount, loginWithProvider, uid, email: authEmail } = useAuth();

  const [v, setV] = useState<RegData>(EMPTY);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [createdUsername, setCreatedUsername] = useState("");
  // Subjects the teacher typed in that are not in the catalogue yet. They are
  // created for real on submit, once the account exists and may write.
  const [newSubjects, setNewSubjects] = useState<string[]>([]);
  const [newSubjectDraft, setNewSubjectDraft] = useState("");
  const [addingSubject, setAddingSubject] = useState(false);

  const set = <K extends keyof RegData>(k: K, val: RegData[K]) => setV((p) => ({ ...p, [k]: val }));
  function toggleSubject(id: string) {
    set("subjects", v.subjects.includes(id) ? v.subjects.filter((x) => x !== id) : [...v.subjects, id]);
  }

  // Une seule regle de mot de passe : la longueur minimale.
  //
  // L'ecran en affichait quatre (8 caracteres, un chiffre, une majuscule, un
  // caractere special) alors que le code n'en imposait aucune : seuls 6
  // caracteres etaient reellement exiges. Une liste d'exigences decoratives
  // decourage sans rien proteger.
  //
  // 6 est le plancher reel : c'est le minimum applique par Supabase Auth cote
  // serveur. En accepter moins ferait echouer l'inscription avec un message
  // d'erreur anglais incomprehensible.
  const MIN_PASSWORD = 6;
  const hasMinLength = password.length >= MIN_PASSWORD;

  // No e-mail is collected: the login identifier is derived from the full name.
  /**
   * Les chiffres d'un numero, ramenes a la forme locale algerienne.
   *
   * +213 6 12 34 56 78 et 06 12 34 56 78 sont le meme numero : l'indicatif est
   * donc converti au lieu d'etre refuse. Le compte de dix chiffres, lui, reste
   * la regle — c'est la longueur d'un numero algerien.
   */
  function phoneDigits(raw: string): string {
    const d = raw.replace(/\D/g, "");
    if (d.startsWith("00213")) return "0" + d.slice(5);
    if (d.startsWith("213")) return "0" + d.slice(3);
    return d;
  }

  /** Un numero algerien s'ecrit sur dix chiffres : 0X XX XX XX XX. */
  function okPhone(raw: string): boolean {
    return phoneDigits(raw).length === 10;
  }

  // Le bouton reste inerte tant que le contact n'est pas complet : c'est la
  // seule facon de joindre la famille (relances, absences, place liberee), et
  // l'inscription enregistrait jusqu'ici un faux numero pour tout le monde.
  const contactOk =
    okPhone(v.phone) &&
    (v.role !== "student" || (!!v.parentName.trim() && okPhone(v.parentPhone)));
  const valid =
    !!v.name.trim() && contactOk && (mode === "complete" || hasMinLength);

  /**
   * Ce qui manque encore, en clair.
   *
   * Un bouton grise sans explication est une impasse : la personne relit son
   * formulaire, ne voit rien d'anormal, et abandonne. La liste ci-dessous dit
   * exactement quel champ retient l'inscription.
   */
  const missing: string[] = [];
  if (!v.name.trim()) missing.push(t("auth.need_name"));
  if (!okPhone(v.phone)) missing.push(t("auth.need_phone"));
  if (v.role === "student" && !v.parentName.trim()) missing.push(t("auth.need_parent_name"));
  if (v.role === "student" && !okPhone(v.parentPhone)) missing.push(t("auth.need_parent_phone"));
  if (mode !== "complete" && !hasMinLength) missing.push(t("auth.need_password", { n: MIN_PASSWORD }));

  /** Add a typed subject to the pending list, reusing an existing one when the
   *  name already exists so the catalogue does not fill up with duplicates. */
  function commitNewSubject() {
    const name = newSubjectDraft.trim();
    if (!name) return;
    const existing = allSubjects.find((s) => s.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!v.subjects.includes(existing.id)) set("subjects", [...v.subjects, existing.id]);
    } else if (!newSubjects.some((n) => n.toLowerCase() === name.toLowerCase())) {
      setNewSubjects((p) => [...p, name]);
    }
    setNewSubjectDraft("");
    setAddingSubject(false);
  }

  async function createUnique(base: string): Promise<{ id: string; email: string; username: string }> {
    for (let i = 0; i < 6; i++) {
      // Le nom complet d'abord ; un suffixe sequentiel seulement si un homonyme
      // occupe deja l'identifiant.
      const username = nextVariant(base, i + 1);
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
    // Le telephone est la seule facon de joindre la famille : relances de
    // paiement, absences, place liberee. Il etait declare dans l'etat du
    // formulaire mais aucun champ ne le demandait, et l'inscription
    // enregistrait un faux numero (« 0550000000 ») pour tout le monde.
    if (!v.phone.trim()) { setError(t("auth.phone_required")); return; }
    if (!okPhone(v.phone)) { setError(t("auth.phone_invalid")); return; }
    if (v.role === "student") {
      if (!v.parentName.trim() || !v.parentPhone.trim()) {
        setError(t("auth.parent_required"));
        return;
      }
      if (!okPhone(v.parentPhone)) { setError(t("auth.phone_invalid")); return; }
    }
    setBusy(true);
    try {
      let id: string;
      let email: string;
      let username: string;

      if (mode === "complete") {
        username = slugName(v.name);
        id = uid ?? crypto.randomUUID();
        email = authEmail ?? toLoginEmail(username);
        username = email.split("@")[0] || username;
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

      // Any subject the teacher typed in is created now — the account exists at
      // this point, so the write is allowed.
      const createdIds = v.role === "teacher" ? newSubjects.map((n) => addSubject(n).id) : [];
      const chosen = [...v.subjects, ...createdIds];

      const request = {
        id,
        role: v.role,
        email,
        name: v.name.trim(),
        phone: phoneDigits(v.phone),
        ...(v.role === "student"
          ? { level: v.level, parentName: v.parentName.trim(), parentPhone: phoneDigits(v.parentPhone) }
          : { subjects: chosen.length > 0 ? chosen : (allSubjects[0] ? [allSubjects[0].id] : []) }),
      };

      // This write decides whether the person exists in the system at all: if it
      // is lost, the account signs in but has no request, and PendingGate just
      // shows the sign-up form again with no explanation. So it is sent
      // directly and awaited rather than through the fire-and-forget outbox,
      // and any rejection is reported instead of swallowed.
      if (!DEMO_MODE) {
        const { supabase } = await import("../../lib/supabase");
        const { error: insErr } = await supabase
          .from("registrationRequests")
          .upsert({ ...request, status: "pending", createdAt: Date.now() });
        if (insErr) {
          throw new Error(
            "Votre compte a bien été créé, mais la demande n'a pas pu être enregistrée : " +
              insErr.message +
              " — prévenez l'administration."
          );
        }
      }

      addRegistrationRequest(request);

      // With no e-mail collected, this username is the only way back in, so the
      // confirmation screen is shown in both modes rather than demo only.
      setCreatedUsername(username);
      setBusy(false);
    } catch (err) {
      setError((err as { message?: string })?.message ?? "Erreur lors de l'inscription.");
    } finally {
      setBusy(false);
    }
  }


  if (createdUsername) {
    return (
      <RequestSent
        username={createdUsername}
        action={{ label: t("auth.sent_back"), onClick: () => { onDone(); onCancel?.(); } }}
      />
    );
  }

  return (
    <div className="au-reg">
      <h2 className="au-title">
        <span className="au-title-bar" />
        <span>Inscription</span>
      </h2>
      <p className="au-subtitle">{t("auth.reg_subtitle")}</p>

      {/* Role Switcher */}
      <div className="reg-role-section">
        <span className="reg-role-label">{t("auth.i_am")}</span>
        <div className="reg-role-switch">
          <button
            type="button"
            className={"reg-role-btn" + (v.role === "student" ? " on" : "")}
            onClick={() => set("role", "student")}
          >
            <GraduationCap size={18} />
            <span>{t("roles.student")}</span>
            {v.role === "student" && <span className="reg-role-radio" />}
          </button>
          <button
            type="button"
            className={"reg-role-btn" + (v.role === "teacher" ? " on" : "")}
            onClick={() => set("role", "teacher")}
          >
            <User size={18} />
            <span>{t("roles.teacher")}</span>
            {v.role === "teacher" && <span className="reg-role-radio" />}
          </button>
        </div>
      </div>

      <div className="au-field">
        <label>
          <span>{t("auth.full_name")}</span>
        </label>
        <div className="au-input">
          <input
            value={v.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder={t("auth.full_name_ph")}
            required
          />
        </div>
      </div>

      <div className="au-field">
        <label>
          <span>{t("auth.phone")}</span>
        </label>
        <div className="au-input">
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={v.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder={t("auth.phone_ph")}
            required
          />
        </div>
      </div>

      {v.role === "student" && (
        <div className="au-field">
          <label>
            <span>{t("stu.level")}</span>
          </label>
          <div className="au-input">
            <select
              className="reg-select"
              value={v.level}
              onChange={(e) => set("level", e.target.value as StudentLevel)}
            >
              {L.levelGroups().map((g) => (
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

      {/* Le parent est le contact de secours de l'ecole pour un eleve : sans
          lui, les relances de paiement et les absences n'atteignent personne. */}
      {v.role === "student" && (
        <>
          <div className="au-field">
            <label>
              <span>{t("auth.parent_name")}</span>
            </label>
            <div className="au-input">
              <input
                value={v.parentName}
                onChange={(e) => set("parentName", e.target.value)}
                placeholder={t("auth.parent_name_ph")}
                required
              />
            </div>
          </div>
          <div className="au-field">
            <label>
              <span>{t("auth.parent_phone")}</span>
            </label>
            <div className="au-input">
              <input
                type="tel"
                inputMode="tel"
                value={v.parentPhone}
                onChange={(e) => set("parentPhone", e.target.value)}
                placeholder={t("auth.phone_ph")}
                required
              />
            </div>
          </div>
        </>
      )}

      {v.role === "teacher" && (
        <div className="au-field">
          <label>
            <span>{t("auth.subjects_taught")}</span>
          </label>
          <div className="au-input">
            <select
              className="reg-select"
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (id === "__new") { setAddingSubject(true); return; }
                if (id && !v.subjects.includes(id)) set("subjects", [...v.subjects, id]);
              }}
            >
              <option value="">{t("auth.pick_subject")}</option>
              {allSubjects.filter((s) => !v.subjects.includes(s.id)).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
              <option value="__new">{t("auth.other_subject")}</option>
            </select>
          </div>

          {/* Escape hatch: the catalogue never covers every subject a teacher
              offers, so let them name one instead of dropping the sign-up. */}
          {addingSubject && (
            <div className="reg-newsubject">
              <input
                className="au-input-plain"
                value={newSubjectDraft}
                onChange={(e) => setNewSubjectDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); commitNewSubject(); }
                  if (e.key === "Escape") { setAddingSubject(false); setNewSubjectDraft(""); }
                }}
                placeholder={t("auth.subject_name_ph")}
                autoFocus
              />
              <button type="button" className="btn btn-primary sm" onClick={commitNewSubject}>
                Ajouter
              </button>
              <button
                type="button"
                className="btn btn-ghost sm"
                onClick={() => { setAddingSubject(false); setNewSubjectDraft(""); }}
              >
                Annuler
              </button>
            </div>
          )}
          {(v.subjects.length > 0 || newSubjects.length > 0) && (
            <div className="reg-chips-row">
              {v.subjects.map((id) => (
                <span key={id} className="reg-chip">
                  {subjName(id)}
                  <button type="button" onClick={() => toggleSubject(id)}><X size={13} /></button>
                </span>
              ))}
              {newSubjects.map((name) => (
                <span key={name} className="reg-chip reg-chip-new">
                  {name}
                  <button
                    type="button"
                    onClick={() => setNewSubjects((p) => p.filter((n) => n !== name))}
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {mode !== "complete" && (
        <div className="au-field">
          <label>
            <span>{t("auth.password")}</span>
          </label>
          <div className="au-input">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.pwd_create_ph")}
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

          <div className="reg-pwd-rules">
            <div className={"reg-rule" + (hasMinLength ? " passed" : "")}>
              <span className="reg-rule-icon"><Check size={13} /></span>
              <span>{t("auth.pwd_min", { n: MIN_PASSWORD })}</span>
            </div>
          </div>
        </div>
      )}

      {error && <p className="au-error">{error}</p>}

      {/* Affichee seulement quand la personne a commence a remplir : la faire
          apparaitre sur un formulaire vierge se lirait comme une reprimande. */}
      {missing.length > 0 && v.name.trim().length > 0 && (
        <div className="reg-missing" role="status">
          <span className="reg-missing-icon" aria-hidden="true"><Info size={15} /></span>
          <div>
            <strong>{t("auth.need_title")}</strong>
            <ul>
              {missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <button
        type="button"
        className="au-submit"
        onClick={submit}
        disabled={!valid || busy}
      >
        <span>{busy ? t("auth.creating") : t("auth.create_account")}</span>
        <ArrowRight size={18} />
      </button>

      <div className="au-divider">
        <span>{t("auth.or_continue")}</span>
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


