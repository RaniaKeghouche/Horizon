// Runtime configuration.
//
// DEMO_MODE is on when no Firebase API key is provided. In that case the app runs
// entirely on a local, seeded store (localStorage) so every feature works and is
// demoable without any backend. Fill `.env` with Firebase creds to switch it off.
export const DEMO_MODE = !import.meta.env.VITE_FIREBASE_API_KEY;

// The e-mail that becomes the school owner (admin) when it first signs up.
export const OWNER_EMAIL = (import.meta.env.VITE_OWNER_EMAIL ?? "").toLowerCase().trim();
