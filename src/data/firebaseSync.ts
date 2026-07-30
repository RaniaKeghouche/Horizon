// Real-time sync: subscribe to every Firestore collection and mirror it into the
// Zustand store, so all components keep reading from `useData` unchanged.
// Store keys match Firestore collection names (see COLLECTIONS).
import { DEMO_MODE } from "../lib/config";
import { COLLECTIONS } from "../lib/types";
import { useData } from "./store";

// Store keys are identical to collection names; patch one array at a time.
const setCollection = useData.setState as (patch: Record<string, unknown>) => void;

let unsubscribers: Array<() => void> = [];

export async function startSync(): Promise<void> {
  if (DEMO_MODE || unsubscribers.length) return;
  const { db } = await import("../lib/firebase");
  const { collection, onSnapshot } = await import("firebase/firestore");

  for (const name of Object.values(COLLECTIONS)) {
    const unsub = onSnapshot(
      collection(db, name),
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCollection({ [name]: docs });
      },
      (err) => {
        // A role without read access to a collection just gets an empty view.
        console.warn(`sync ${name}:`, err.code ?? err.message);
      }
    );
    unsubscribers.push(unsub);
  }
}

export function stopSync(): void {
  unsubscribers.forEach((u) => u());
  unsubscribers = [];
}
