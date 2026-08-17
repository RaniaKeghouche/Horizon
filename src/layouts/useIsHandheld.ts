import { useSyncExternalStore } from "react";
import { HANDHELD_QUERY } from "../app/platform";

/**
 * `true` quand l'écran est de taille téléphone.
 *
 * Dans son propre module plutôt que dans Shell.tsx : exporter un hook depuis un
 * fichier qui exporte aussi un composant désactive le Fast Refresh de Vite pour
 * ce fichier (« incompatible export »), ce qui force un rechargement complet à
 * chaque modification.
 *
 * On s'abonne à `change` ET à `resize`. La seule écoute de `change` sur la
 * MediaQueryList suffit en théorie ; `resize` est la ceinture de sécurité.
 * Le doublon ne coûte rien : useSyncExternalStore compare l'instantané avec
 * Object.is et ne redessine pas quand le booléen n'a pas bougé.
 */

const query = typeof window !== "undefined" ? window.matchMedia(HANDHELD_QUERY) : null;

function subscribe(onChange: () => void): () => void {
  query?.addEventListener("change", onChange);
  window.addEventListener("resize", onChange);
  return () => {
    query?.removeEventListener("change", onChange);
    window.removeEventListener("resize", onChange);
  };
}

const getSnapshot = () => query?.matches ?? false;

export function useIsHandheld(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
