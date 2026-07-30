// Firestore write helpers used by the store's actions.
// No-ops in DEMO_MODE (local store only). In Firebase mode they persist to Firestore;
// the onSnapshot listeners (firebaseSync) then reflect the change back into the store.
// Firebase modules are imported dynamically so DEMO_MODE never loads Firebase.
import { DEMO_MODE } from "../lib/config";
import type { UpdateData, DocumentData } from "firebase/firestore"; // type-only: erased at build

async function firestore() {
  const { db } = await import("../lib/firebase");
  const fs = await import("firebase/firestore");
  return { db, ...fs };
}

/** Create or replace a document (id preserved). */
export function fbWrite<T extends { id: string }>(collection: string, docObj: T): void {
  if (DEMO_MODE) return;
  void (async () => {
    try {
      const { db, doc, setDoc } = await firestore();
      const { id, ...data } = docObj;
      await setDoc(doc(db, collection, id), data as Parameters<typeof setDoc>[1], { merge: true });
    } catch (e) {
      console.error(`fbWrite ${collection}`, e);
    }
  })();
}

/** Patch fields of an existing document. */
export function fbPatch(collection: string, id: string, patch: Record<string, unknown>): void {
  if (DEMO_MODE) return;
  void (async () => {
    try {
      const { db, doc, updateDoc } = await firestore();
      await updateDoc(doc(db, collection, id), patch as UpdateData<DocumentData>);
    } catch (e) {
      console.error(`fbPatch ${collection}/${id}`, e);
    }
  })();
}

/** Delete a document. */
export function fbDelete(collection: string, id: string): void {
  if (DEMO_MODE) return;
  void (async () => {
    try {
      const { db, doc, deleteDoc } = await firestore();
      await deleteDoc(doc(db, collection, id));
    } catch (e) {
      console.error(`fbDelete ${collection}/${id}`, e);
    }
  })();
}

/** Write many documents at once (used for seeding). */
export function fbWriteMany<T extends { id: string }>(collection: string, docs: T[]): void {
  if (DEMO_MODE) return;
  void (async () => {
    try {
      const { db, doc, writeBatch } = await firestore();
      const batch = writeBatch(db);
      for (const d of docs) {
        const { id, ...data } = d;
        batch.set(doc(db, collection, id), data as Parameters<typeof batch.set>[1], { merge: true });
      }
      await batch.commit();
    } catch (e) {
      console.error(`fbWriteMany ${collection}`, e);
    }
  })();
}
