// Firebase initialization — single source of truth for the whole app.
// All config comes from environment variables (see .env.example). Never commit real keys.
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { getMessaging, isSupported, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app: FirebaseApp = initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);

// Offline-first: Firestore keeps a local cache so the app works with no internet
// and syncs automatically when the connection returns (cahier des charges §Attendance offline).
export const db: Firestore = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

// FCM is only available in browser/PWA contexts that support service workers.
export async function getMessagingIfSupported(): Promise<Messaging | null> {
  try {
    if (await isSupported()) return getMessaging(app);
  } catch {
    // ignore — not supported (e.g. desktop webview without SW)
  }
  return null;
}
