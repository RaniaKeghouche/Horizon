// Runtime configuration.
//
// DEMO_MODE is on when no Firebase API key is provided. In that case the app runs
// entirely on a local, seeded store (localStorage) so every feature works and is
// demoable without any backend. Fill `.env` with Firebase creds to switch it off.
export const DEMO_MODE = !import.meta.env.VITE_FIREBASE_API_KEY;

// The e-mail that becomes the school owner (admin) when it first signs up.
export const OWNER_EMAIL = (import.meta.env.VITE_OWNER_EMAIL ?? "").toLowerCase().trim();

// EmailJS — client-side e-mail sending (verification code + accept/reject).
// When these are empty, the app falls back to showing the code on screen and logging
// "e-mails" as in-app notifications, so the whole flow stays testable.
export const EMAILJS = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID ?? "",
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY ?? "",
  templateCode: import.meta.env.VITE_EMAILJS_TEMPLATE_CODE ?? "", // verification code template
  templateDecision: import.meta.env.VITE_EMAILJS_TEMPLATE_DECISION ?? "", // accept/reject template
};
export const EMAIL_ENABLED = !!(EMAILJS.serviceId && EMAILJS.publicKey);
