/**
 * Les coordonnees de l'ecole, en un seul endroit.
 *
 * Elles etaient ecrites en dur dans LandingPage.tsx (numero, adresse, lien
 * Maps) et dans email.ts (adresse e-mail). Un changement de numero obligeait
 * donc a le retrouver a quatre endroits, et le portail d'inscription, lui,
 * n'en avait aucun. Tout part maintenant d'ici, et chaque valeur peut etre
 * remplacee par une variable d'environnement sans toucher au code.
 */

const env = import.meta.env;

export const SCHOOL = {
  name: env.VITE_SCHOOL_NAME ?? "Horizon Skills Academy",
  city: env.VITE_SCHOOL_CITY ?? "Constantine",
  /* Le quartier est Daksi. « Sidi Mabrouk » est la route qui passe a cote,
     pas l'adresse : l'avoir lue sur la carte m'avait induit en erreur. */
  address: env.VITE_SCHOOL_ADDRESS ?? "Cité Daksi, Constantine 25000, Algérie",
  /** Plus code Google : une adresse postale utilisable telle quelle ici. */
  plusCode: env.VITE_SCHOOL_PLUS_CODE ?? "9J4Q+44 Constantine",
  /** Tel qu'on l'ecrit ici : groupes lisibles, sans indicatif. */
  phone: env.VITE_SCHOOL_PHONE ?? "0553 36 62 04",
  /** Format international, pour tel: et wa.me qui n'acceptent pas les espaces. */
  phoneE164: env.VITE_SCHOOL_PHONE_E164 ?? "+213553366204",
  email: env.VITE_SCHOOL_EMAIL ?? "horizonskillsacademy@gmail.com",
  /**
   * WhatsApp, presume sur la meme ligne — c'est le canal le plus utilise ici.
   * Mettre VITE_SCHOOL_WHATSAPP a une chaine vide retire simplement la ligne.
   */
  whatsapp: env.VITE_SCHOOL_WHATSAPP ?? env.VITE_SCHOOL_PHONE_E164 ?? "+213553366204",
};

/**
 * Coordonnees exactes du centre, relevees sur la carte.
 *
 * Le lien pointait auparavant sur une recherche par texte, qui tombait sur le
 * mauvais quartier : une adresse ecrite se resout au petit bonheur, un couple
 * latitude/longitude non. Le repere tombe donc desormais sur le batiment.
 */
export const SCHOOL_COORDS = env.VITE_SCHOOL_COORDS ?? "36.355275,6.637745";

/**
 * Le lien de la carte.
 *
 * Une recherche par coordonnees pose bien un repere au bon endroit, mais elle
 * ouvre un point anonyme : ni le nom, ni les horaires, ni le bouton d'appel de
 * la fiche de l'etablissement. On demande donc le LIEU par son nom, ancre sur
 * les coordonnees, ce qui ouvre la fiche « Horizon skills academy » elle-meme.
 *
 * VITE_SCHOOL_MAPS reste prioritaire : y coller le lien « Partager ce lieu »
 * de Google donne la correspondance exacte, sans dependre du nom.
 */
export const MAPS_URL =
  env.VITE_SCHOOL_MAPS ??
  `https://www.google.com/maps/place/${encodeURIComponent(SCHOOL.name)}/@${SCHOOL_COORDS},18z`;

export type ContactKind = "phone" | "whatsapp" | "email" | "address";

export interface Contact {
  kind: ContactKind;
  /** Ce qui est affiche : un numero, une adresse, une ville. */
  value: string;
  href: string;
  /** Ouvre un onglet plutot qu'une application (cas de la carte). */
  external?: boolean;
  /** Copiable : utile sur un ordinateur, ou `tel:` ne sert a rien. */
  copyable?: boolean;
}

/**
 * Les moyens de joindre l'ecole, dans l'ordre ou on les essaie.
 *
 * Une entree vide n'est pas listee : mieux vaut trois canaux reels qu'un
 * quatrieme qui ne mene nulle part.
 */
export function schoolContacts(): Contact[] {
  const list: Contact[] = [];
  if (SCHOOL.phone) {
    list.push({
      kind: "phone",
      value: SCHOOL.phone,
      href: `tel:${SCHOOL.phoneE164.replace(/\s/g, "")}`,
      copyable: true,
    });
  }
  if (SCHOOL.whatsapp) {
    list.push({
      kind: "whatsapp",
      value: SCHOOL.phone || SCHOOL.whatsapp,
      href: `https://wa.me/${SCHOOL.whatsapp.replace(/\D/g, "")}`,
      external: true,
    });
  }
  if (SCHOOL.email) {
    list.push({
      kind: "email",
      value: SCHOOL.email,
      href: `mailto:${SCHOOL.email}`,
      copyable: true,
    });
  }
  if (SCHOOL.address) {
    list.push({ kind: "address", value: SCHOOL.address, href: MAPS_URL, external: true });
  }
  return list;
}
