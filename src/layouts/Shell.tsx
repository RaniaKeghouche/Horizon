import AppLayout from "../app/AppLayout";
import MobileLayout from "./MobileLayout";
import { useIsHandheld } from "./useIsHandheld";

/**
 * Choisit la FORME de l'interface d'après la largeur de l'écran, pas d'après le
 * rôle : voir la note dans src/app/platform.ts. Le rôle décide déjà du contenu
 * via sectionsForRole() et les gardes de route.
 */
export default function Shell() {
  return useIsHandheld() ? <MobileLayout /> : <AppLayout />;
}
