/**
 * Cible de build et forme d'interface.
 *
 * Le projet produit trois bundles depuis une seule base de code :
 *   VITE_TARGET=web      → site public + espaces élève/enseignant   (défaut)
 *   VITE_TARGET=mobile   → app Tauri Android, élèves et enseignants
 *   VITE_TARGET=desktop  → app Tauri de bureau, administration
 *
 * Deux notions distinctes, à ne pas confondre :
 *
 *   TARGET  — décidé au build. Détermine ce qui entre dans le bundle
 *             (le mobile n'embarque pas le site vitrine ni ses ~10 Mo de photos).
 *   FORME   — décidée à l'exécution, d'après la largeur de l'écran. Détermine
 *             quel layout s'affiche.
 *
 * Séparer les deux évite de se peindre dans un coin : un enseignant qui ouvre
 * son planning sur un PC de l'école obtient la mise en page dense, et l'admin
 * qui consulte un paiement depuis son téléphone obtient la mise en page tactile.
 * Le RÔLE décide du contenu (sectionsForRole, RoleGuard) ; la LARGEUR décide de
 * la forme. Les deux axes restent indépendants.
 */

export type Target = "web" | "mobile" | "desktop";

const raw = (import.meta.env.VITE_TARGET ?? "web") as string;

export const TARGET: Target =
  raw === "mobile" || raw === "desktop" ? raw : "web";

export const IS_MOBILE_BUILD = TARGET === "mobile";
export const IS_DESKTOP_BUILD = TARGET === "desktop";
export const IS_WEB_BUILD = TARGET === "web";

/** Le site vitrine public n'existe que dans le bundle web. */
export const HAS_PUBLIC_SITE = IS_WEB_BUILD;

/** Seuil de bascule vers la forme tactile. Aligné sur le point de rupture
 *  `max-width: 760px` déjà utilisé partout dans global.css. */
export const HANDHELD_QUERY = "(max-width: 760px)";
