import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Send, Copy, Check, Clock, Hourglass, ShieldCheck, ArrowRight } from "lucide-react";

/**
 * Écran « votre demande a été envoyée ».
 *
 * Partagé par deux chemins qui aboutissent au même état :
 *   - RegisterFlow, juste après la création du compte ;
 *   - PendingGate, quand la personne revient et attend toujours d'être validée.
 * Les deux montraient la même chose dans deux mises en page différentes, dont
 * une restée à l'état brut.
 *
 * L'identifiant est l'unique porte d'entrée (aucune adresse e-mail n'est
 * collectée), d'où sa place centrale et le bouton pour le copier.
 */
export default function RequestSent({
  username,
  action,
}: {
  username?: string;
  /** Bouton du bas : « retour à la connexion » ou « se déconnecter ». */
  action: { label: string; onClick: () => void };
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!username) return;
    try {
      await navigator.clipboard.writeText(username);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers refusé (contexte non sécurisé, permission) : l'identifiant
      // reste lisible à l'écran, on ne bloque donc rien.
    }
  }

  return (
    <div className="reg-done">
      <span className="reg-done-mark" aria-hidden="true">
        <Send size={30} />
        <Confetti />
      </span>

      <h2 className="reg-done-title">{t("auth.sent_title")}</h2>
      <span className="reg-done-bar" aria-hidden="true" />

      {username && (
        <>
          <p className="reg-muted">{t("auth.sent_id_label")}</p>
          <div className="reg-id">
            <strong>{username}</strong>
            <button
              type="button"
              className="reg-copy"
              onClick={copy}
              aria-label={t("auth.sent_copy")}
              title={t("auth.sent_copy")}
            >
              {copied ? <Check size={17} /> : <Copy size={17} />}
            </button>
          </div>
          <span className="reg-copied" role="status">{copied ? t("auth.sent_copied") : ""}</span>

          <div className="reg-link" aria-hidden="true">
            <span className="reg-link-dash" />
            <span className="reg-link-badge"><Clock size={14} /></span>
            <span className="reg-link-dash" />
          </div>
        </>
      )}

      <div className="reg-wait">
        <span className="reg-wait-icon" aria-hidden="true"><Hourglass size={18} /></span>
        <div>
          <strong>{t("auth.sent_wait_title")}</strong>
          <p>{t("auth.sent_wait_body")}</p>
        </div>
      </div>

      <InboxArt />

      <button className="au-submit reg-done-btn" onClick={action.onClick}>
        <span>{action.label}</span>
        <ArrowRight size={18} aria-hidden="true" />
      </button>

      <p className="reg-secure">
        <ShieldCheck size={15} aria-hidden="true" /> {t("auth.sent_secure")}
      </p>
    </div>
  );
}

/** Confettis autour de la pastille d'envoi. */
export function Confetti() {
  return (
    <svg className="reg-confetti" viewBox="0 0 220 90" fill="none" aria-hidden="true">
      <circle cx="24" cy="34" r="4" fill="var(--danger)" opacity="0.7" />
      <circle cx="196" cy="30" r="4" fill="var(--gold)" />
      <circle cx="62" cy="62" r="3" fill="var(--sky-500)" />
      <circle cx="166" cy="66" r="3" fill="var(--primary)" opacity="0.5" />
      <path d="M52 26l3 3 3-3-3-3z" fill="var(--success)" />
      <path d="M172 20l3 3 3-3-3-3z" fill="var(--gold)" />
      <path d="M84 14l2 2 2-2-2-2z" fill="var(--sky-500)" />
    </svg>
  );
}

/** Boîte de réception : la demande est bien arrivée côté administration. */
export function InboxArt() {
  return (
    <svg className="reg-inbox" viewBox="0 0 120 76" fill="none" aria-hidden="true">
      <path d="M20 34h22l6 10h24l6-10h22v26a6 6 0 01-6 6H26a6 6 0 01-6-6z" fill="var(--primary)" opacity="0.85" />
      <path d="M28 34V16a5 5 0 015-5h54a5 5 0 015 5v18" fill="var(--sky-300)" />
      <path d="M38 20h44M38 28h30" stroke="var(--navy-700)" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
      <circle cx="94" cy="56" r="12" fill="var(--success)" />
      <path d="M88 56l4 4 8-9" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 22l-6-3M14 34H6" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
