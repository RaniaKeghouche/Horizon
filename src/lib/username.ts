// Username-based accounts. Supabase Auth needs an e-mail, so each username is mapped to
// a hidden internal e-mail `username@horizon.app`. Users only ever see their username.
export const SYNTHETIC_DOMAIN = "horizon.app";

/** Turn a full name into a base username, e.g. "Rania Keghouche" -> "rania.keghouche". */
export function slugName(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  return s || "user";
}

/** Resolve a login identifier (username OR real e-mail) to the auth e-mail. */
export function toLoginEmail(identifier: string): string {
  const id = identifier.trim();
  return id.includes("@") ? id : `${id}@${SYNTHETIC_DOMAIN}`;
}

/** Get the display username from a stored e-mail (strips the internal domain). */
export function usernameFromEmail(email?: string | null): string {
  if (!email) return "";
  return email.endsWith(`@${SYNTHETIC_DOMAIN}`) ? email.split("@")[0] : email;
}
