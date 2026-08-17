import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;
// @ts-expect-error process is a nodejs global
const target = (process.env.VITE_TARGET ?? "web") as "web" | "mobile" | "desktop";

/**
 * public/ pèse ~11 Mo de photos, et Vite copie ce dossier tel quel dans dist/.
 * Sans élagage, l'APK Android embarquerait toute l'imagerie du site vitrine —
 * que personne n'ouvrira jamais depuis l'application installée.
 *
 * La liste des fichiers à conserver est DÉDUITE du bundle, pas écrite à la main :
 * on lit le code réellement expédié et on garde tout fichier dont le nom y
 * apparaît. Une première version reposait sur une liste manuelle, qui a aussitôt
 * supprimé l'image de fond de l'écran de connexion (référencée depuis
 * global.css, donc invisible à l'œil nu). Déduire supprime cette classe de bug.
 *
 * Les chunks de la landing sont exclus de l'analyse : Rollup les émet toujours,
 * mais la cible mobile ne les charge jamais (voir HAS_PUBLIC_SITE dans
 * src/app/platform.ts), donc leurs images n'ont pas à être conservées.
 */
function prunePublicAssetsForMobile(): Plugin {
  return {
    name: "horizon-prune-public-assets",
    apply: "build",
    closeBundle() {
      if (target !== "mobile") return;
      const dist = join(process.cwd(), "dist");
      const assets = join(dist, "assets");

      // Tout le code expédié et effectivement atteignable sur mobile.
      let shipped = readFileSync(join(dist, "index.html"), "utf8");
      for (const name of readdirSync(assets)) {
        if (name.startsWith("LandingPage")) continue;
        if (!/\.(js|css)$/.test(name)) continue;
        shipped += readFileSync(join(assets, name), "utf8");
      }

      let removed = 0;
      let bytes = 0;
      for (const name of readdirSync(dist)) {
        const p = join(dist, name);
        if (!statSync(p).isFile()) continue;
        if (name === "index.html" || shipped.includes(name)) continue;
        bytes += statSync(p).size;
        rmSync(p);
        removed++;
      }

      if (removed > 0) {
        // eslint-disable-next-line no-console
        console.log(
          `\n  cible mobile : ${removed} fichiers de public/ retirés du bundle ` +
            `(${(bytes / 1024 / 1024).toFixed(1)} Mo)\n`
        );
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), prunePublicAssetsForMobile()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      //
      // public/ est également exclu : sous Windows, déposer une image dans ce
      // dossier pendant que le serveur démarre fait échouer fs.watch avec EBUSY
      // (le fichier est encore verrouillé par le programme qui l'écrit), et
      // chokidar propage l'erreur — le serveur de dev meurt au démarrage.
      // Contrepartie assumée : ajouter ou remplacer une image de public/ ne
      // déclenche plus de rechargement automatique, un F5 suffit.
      ignored: ["**/src-tauri/**", "**/public/**"],
    },
  },
}));
