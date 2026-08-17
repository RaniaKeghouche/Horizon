// Client-side e-mail via EmailJS (no backend). Falls back gracefully when not
// configured yet: the verification code is returned to be shown on screen, and
// decision e-mails are no-ops (the UI logs an in-app notification instead).
import { EMAILJS, EMAIL_ENABLED } from "./config";

export function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

async function send(templateId: string, params: Record<string, unknown>): Promise<boolean> {
  if (!EMAIL_ENABLED || !templateId) return false;
  try {
    const emailjs = (await import("@emailjs/browser")).default;
    await emailjs.send(EMAILJS.serviceId, templateId, params, { publicKey: EMAILJS.publicKey });
    return true;
  } catch (e) {
    console.error("emailjs send failed", e);
    return false;
  }
}

/** Send the verification code. Returns true if a real e-mail was sent. */
export async function sendCodeEmail(to: string, code: string, name = ""): Promise<boolean> {
  return send(EMAILJS.templateCode, {
    to_email: to,
    to_name: name || to,
    code,
    // Generic field so a single template can serve both e-mails via {{message}}.
    message: `Votre code de confirmation Horizon Skills Academy est : ${code}`,
    subject: "Votre code de confirmation — Horizon Skills Academy",
  });
}

/** School's own inbox — where public contact enquiries land. */
export const SCHOOL_EMAIL = "horizonskillsacademy@gmail.com";

export interface ContactEnquiry {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  topic: string;
  message: string;
}

/**
 * Public contact form → the school's inbox, through the same generic EmailJS
 * template as the code e-mail (it renders `{{message}}` verbatim).
 * Returns false when EmailJS isn't configured so the caller can fall back to
 * showing the phone number rather than pretending the message was sent.
 */
export async function sendContactEmail(e: ContactEnquiry): Promise<boolean> {
  const who = `${e.firstName} ${e.lastName}`.trim();
  return send(EMAILJS.templateCode, {
    to_email: SCHOOL_EMAIL,
    to_name: "Horizon Skills Academy",
    reply_to: e.email,
    subject: `Demande depuis le site — ${e.topic || "Information"}`,
    message: [
      `Nouvelle demande depuis le site.`,
      ``,
      `Nom      : ${who}`,
      `E-mail   : ${e.email}`,
      `Téléphone: ${e.phone || "—"}`,
      `Sujet    : ${e.topic || "—"}`,
      ``,
      e.message,
    ].join("\n"),
  });
}

/** Notify the applicant of the admin's decision. Returns true if sent. */
export async function sendDecisionEmail(
  to: string,
  name: string,
  approved: boolean
): Promise<boolean> {
  return send(EMAILJS.templateDecision, {
    to_email: to,
    to_name: name || to,
    decision: approved ? "acceptée" : "refusée",
    approved: approved ? "1" : "0",
    message: approved
      ? "Votre inscription a été acceptée. Vous pouvez maintenant vous connecter."
      : "Votre demande d'inscription a été refusée.",
    subject: "Votre inscription — Horizon Skills Academy",
  });
}
