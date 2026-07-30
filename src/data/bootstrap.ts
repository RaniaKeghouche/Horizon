// First-run bootstrap for Firebase mode: provision the signed-in user's profile doc,
// and seed the default subjects once, by the owner/admin.
import { OWNER_EMAIL } from "../lib/config";
import { COLLECTIONS, type AppUser, type Subject } from "../lib/types";

const DEFAULT_SUBJECTS: Array<Pick<Subject, "id" | "name">> = [
  { id: "sub_math", name: "Mathématiques" },
  { id: "sub_arabic", name: "العربية" },
  { id: "sub_english", name: "English" },
  { id: "sub_french", name: "Français" },
  { id: "sub_science", name: "Sciences" },
  { id: "sub_physics", name: "Physique" },
];

/** Read the user's profile doc; create it on first login (owner e-mail => admin). */
export async function provisionUser(uid: string, email: string | null): Promise<AppUser> {
  const { db } = await import("../lib/firebase");
  const { doc, getDoc, setDoc } = await import("firebase/firestore");
  const ref = doc(db, COLLECTIONS.users, uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return { id: uid, ...snap.data() } as AppUser;

  const isOwner = !!email && email.toLowerCase().trim() === OWNER_EMAIL;
  const profile: Omit<AppUser, "id"> = {
    role: isOwner ? "admin" : "student",
    displayName: email ? email.split("@")[0] : "Compte",
    email: email ?? undefined,
    createdAt: Date.now(),
  };
  await setDoc(ref, profile);
  return { id: uid, ...profile };
}

/** Seed the default subjects the first time an admin signs in (if none exist). */
export async function seedDefaultSubjects(): Promise<void> {
  const { db } = await import("../lib/firebase");
  const { collection, getDocs, writeBatch, doc } = await import("firebase/firestore");
  const existing = await getDocs(collection(db, COLLECTIONS.subjects));
  if (!existing.empty) return;
  const batch = writeBatch(db);
  for (const s of DEFAULT_SUBJECTS) {
    batch.set(doc(db, COLLECTIONS.subjects, s.id), {
      name: s.name,
      isCustom: false,
      createdAt: Date.now(),
    });
  }
  await batch.commit();
}
