// Runtime configuration.
//
// DEMO_MODE is on when no Firebase API key is provided. In that case the app runs
// entirely on a local, seeded store (localStorage) so every feature works and is
// demoable without any backend. Fill `.env` with Firebase creds to switch it off.
export const DEMO_MODE = !import.meta.env.VITE_FIREBASE_API_KEY;
