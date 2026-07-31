// First-run bootstrap (Supabase). Only the OWNER e-mail becomes admin automatically;
// everyone else goes through the registration-request flow.
import { OWNER_EMAIL } from "../lib/config";

const DEFAULT_SUBJECTS = [
  { id: "sub_math", name: "Mathématiques" },
  { id: "sub_arabic", name: "العربية" },
  { id: "sub_english", name: "English" },
  { id: "sub_french", name: "Français" },
  { id: "sub_science", name: "Sciences" },
  { id: "sub_physics", name: "Physique" },
];

/** If the signed-in user is the owner, ensure their admin profile exists. Returns true if owner. */
export async function provisionOwner(uid: string, email: string | null): Promise<boolean> {
  if (!email || email.toLowerCase().trim() !== OWNER_EMAIL) return false;
  const { supabase } = await import("../lib/supabase");
  const { data } = await supabase.from("users").select("id").eq("id", uid).maybeSingle();
  if (!data) {
    await supabase.from("users").upsert({
      id: uid,
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
  const { supabase } = await import("../lib/supabase");
  const { data } = await supabase.from("subjects").select("id").limit(1);
  if (data && data.length > 0) return;
  await supabase.from("subjects").upsert(
    DEFAULT_SUBJECTS.map((s) => ({ id: s.id, name: s.name, isCustom: false, createdAt: Date.now() }))
  );
}
