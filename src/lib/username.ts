// Username-based accounts. Supabase Auth needs an e-mail, so each username is mapped to
// a hidden internal e-mail `username@horizon.app`. Users only ever see their username.
export const SYNTHETIC_DOMAIN = "horizon.app";

/**
 * Identifiant tire du NOM COMPLET, et de rien d'autre.
 * "Kettab Abdelmalek" -> "kettab.abdelmalek".
 *
 * Tous les mots du nom sont conserves. Les points remplacent les espaces et les
 * accents tombent parce que l'identifiant sert de partie locale d'une adresse
 * e-mail (Supabase Auth en exige une) : un espace ou un accent y est refuse.
 * Aucun chiffre n'est ajoute — voir nextVariant pour le seul cas ou un suffixe
 * devient inevitable.
 */
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

/**
 * Deuxieme porteur du meme nom : "kettab.abdelmalek" -> "kettab.abdelmalek.2".
 *
 * Un suffixe LISIBLE et sequentiel, et seulement quand le nom est deja pris.
 * L'inscription tirait auparavant trois chiffres au hasard des le premier
 * conflit (« kettab.abdelmalek395 »), ce qui donnait un identifiant que
 * personne ne reconnaissait comme son nom.
 */
export function nextVariant(base: string, attempt: number): string {
  return attempt <= 1 ? base : `${base}.${attempt}`;
}

/** Resolve a login identifier (username OR real e-mail) to the auth e-mail. */
export function toLoginEmail(identifier: string): string {
  // Insensible a la casse : l'identifiant est affiche en minuscules, mais on
  // ne veut pas qu'une majuscule saisie a la connexion fasse echouer le login.
  const id = identifier.trim().toLowerCase();
  return id.includes("@") ? id : `${id}@${SYNTHETIC_DOMAIN}`;
}

/** Get the display username from a stored e-mail (strips the internal domain). */
export function usernameFromEmail(email?: string | null): string {
  if (!email) return "";
  return email.endsWith(`@${SYNTHETIC_DOMAIN}`) ? email.split("@")[0] : email;
}
