// Runtime configuration.
//
// SUPABASE_MODE is on when Supabase URL + anon key are provided → the app uses the
// real backend (Postgres + Auth + Realtime). Otherwise DEMO_MODE runs everything on a
// local seeded store (localStorage) — fully working, no backend.
export const SUPABASE = {
  url: import.meta.env.VITE_SUPABASE_URL ?? "",
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
};
export const SUPABASE_MODE = !!(SUPABASE.url && SUPABASE.anonKey);
export const DEMO_MODE = !SUPABASE_MODE;

// The e-mail that becomes the school owner (admin) on first sign-in.
export const OWNER_EMAIL = (import.meta.env.VITE_OWNER_EMAIL ?? "").toLowerCase().trim();

// EmailJS — client-side e-mail (verification code + accept/reject). Falls back to
// showing the code on screen when not configured.
export const EMAILJS = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID ?? "",
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY ?? "",
  templateCode: import.meta.env.VITE_EMAILJS_TEMPLATE_CODE ?? "",
  templateDecision: import.meta.env.VITE_EMAILJS_TEMPLATE_DECISION ?? "",
};
export const EMAIL_ENABLED = !!(EMAILJS.serviceId && EMAILJS.publicKey);

// Google Sheet backup — Apps Script Web App URL (empty = disabled).
export const SHEET_WEBHOOK_URL = import.meta.env.VITE_SHEET_WEBHOOK_URL ?? "";

