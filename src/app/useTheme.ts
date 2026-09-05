import { useCallback, useEffect, useState } from "react";

/**
 * Thème clair / sombre.
 *
 * tokens.css sait déjà peindre les deux (`:root[data-theme="dark"]` et la
 * media query `prefers-color-scheme`) ; il manquait la commande. Ce hook
 * estampille l'attribut sur `<html>` et retient le choix, pour que la bascule
 * de la barre latérale change vraiment quelque chose plutôt que d'être un
 * interrupteur décoratif.
 *
 * Trois états et non deux : sans choix explicite on suit le système, ce qui est
 * le comportement par défaut de la feuille de style.
 */
export type Theme = "light" | "dark" | "system";

const KEY = "horizon-theme";

function read(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    // Navigation privée, stockage bloqué : on retombe sur le système.
    return "system";
  }
}

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

/** `dark` vaut ce qui est réellement affiché, choix explicite ou système. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(read);

  useEffect(() => {
    apply(theme);
    try {
      if (theme === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, theme);
    } catch {
      /* stockage indisponible : le thème reste actif pour la session */
    }
  }, [theme]);

  const systemDark =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && !!systemDark);

  const toggle = useCallback(() => setTheme(dark ? "light" : "dark"), [dark]);

  return { theme, dark, toggle };
}
