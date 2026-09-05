import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Phone, MessageCircle, Mail, MapPin, Copy, Check, ExternalLink, Headset,
} from "lucide-react";
import Modal from "../../components/Modal";
import { schoolContacts, type ContactKind } from "../../lib/school";

const ICON: Record<ContactKind, typeof Phone> = {
  phone: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  address: MapPin,
};

/**
 * Carte d'aide : un bouton, et les coordonnees dans une fenetre.
 *
 * Les quatre canaux depliés en permanence prenaient toute la colonne de droite
 * pour une information qu'on ne consulte qu'une fois. Le bouton revient donc,
 * et ouvre une fenetre qui, elle, montre tout : on lit le numero avant de
 * decider d'appeler, au lieu de declencher un lien tel: a l'aveugle — sur un
 * ordinateur, celui-ci ouvre un avertissement systeme au lieu d'appeler.
 */
export default function ContactCard() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const contacts = schoolContacts();

  if (contacts.length === 0) return null;

  return (
    <>
      <section className="disc-help">
        <span className="disc-help-art" aria-hidden="true"><Headset size={26} /></span>
        <h3>{t("disc.help_title")}</h3>
        <p>{t("disc.help_body")}</p>
        <button type="button" className="disc-help-btn" onClick={() => setOpen(true)}>
          <Headset size={16} aria-hidden="true" />
          <span>{t("disc.help_cta")}</span>
        </button>
      </section>

      {open && <ContactModal onClose={() => setOpen(false)} />}
    </>
  );
}

function ContactModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const contacts = schoolContacts();
  const [copied, setCopied] = useState<string | null>(null);

  // Echap ferme la fenetre : Modal ne gere que le clic sur le fond.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setTimeout(() => setCopied((c) => (c === value ? null : c)), 2000);
    } catch {
      // Presse-papiers refuse : la valeur reste lisible a l'ecran.
    }
  }

  return (
    <Modal title={t("disc.help_title")} onClose={onClose}>
      <p className="ct-lead">{t("disc.help_body")}</p>

      <ul className="ct-list">
        {contacts.map((c) => {
          const Icon = ICON[c.kind];
          return (
            <li key={c.kind}>
              <a
                href={c.href}
                className="ct-row"
                {...(c.external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
              >
                <span className={"ct-icon " + c.kind} aria-hidden="true"><Icon size={17} /></span>
                <span className="ct-text">
                  <em>{t("disc.ct_" + c.kind)}</em>
                  <b>{c.value}</b>
                </span>
                {c.external && <ExternalLink size={14} className="ct-out" aria-hidden="true" />}
              </a>
              {c.copyable && (
                <button
                  type="button"
                  className="ct-copy"
                  onClick={() => copy(c.value)}
                  aria-label={t("disc.ct_copy")}
                  title={t("disc.ct_copy")}
                >
                  {copied === c.value ? <Check size={15} /> : <Copy size={15} />}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <p className="ct-hours">{t("disc.ct_hours")}</p>
    </Modal>
  );
}
