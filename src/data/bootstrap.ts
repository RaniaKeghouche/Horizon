// First-run bootstrap for Firebase mode.
// Only the OWNER e-mail is auto-provisioned as admin. Everyone else goes through the
// registration-request flow (no users doc until the admin approves).
import { OWNER_EMAIL } from "../lib/config";
import { COLLECTIONS, type Subject } from "../lib/types";

const DEFAULT_SUBJECTS: Array<Pick<Subject, "id" | "name">> = [
  { id: "sub_math", name: "Mathématiques" },
  { id: "sub_arabic", name: "العربية" },
  { id: "sub_english", name: "English" },
  { id: "sub_french", name: "Français" },
  { id: "sub_science", name: "Sciences" },
  { id: "sub_physics", name: "Physique" },
];

/** If the signed-in user is the owner, ensure their admin users doc exists. Returns true if owner. */
export async function provisionOwner(uid: string, email: string | null): Promise<boolean> {
  if (!email || email.toLowerCase().trim() !== OWNER_EMAIL) return false;
  const { db } = await import("../lib/firebase");
  const { doc, getDoc, setDoc } = await import("firebase/firestore");
  const ref = doc(db, COLLECTIONS.users, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      role: "admin",
      displayName: email.split("@")[0],
      email,
      createdAt: Date.now(),
    });
  }
  return true;
}

/** Seed the default subjects the first time an admin signs in (if none exist). */
export async function seedDefaultSubjects(): Promise<void> {
  const { db } = await import("../lib/firebase");
  const { collection, getDocs, writeBatch, doc } = await import("firebase/firestore");
  const existing = await getDocs(collection(db, COLLECTIONS.subjects));
  if (!existing.empty) return;
  const batch = writeBatch(db);
  for (const s of DEFAULT_SUBJECTS) {
    batch.set(doc(db, COLLECTIONS.subjects, s.id), { name: s.name, isCustom: false, createdAt: Date.now() });
  }
  await batch.commit();
}
