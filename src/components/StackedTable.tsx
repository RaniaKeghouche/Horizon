import { useEffect, useRef } from "react";

/**
 * Tableau de données qui se replie en cartes sur téléphone.
 *
 * Sur mobile, un tableau à cinq colonnes ne tient pas : le mettre dans une
 * boîte qui défile horizontalement le rend lisible « techniquement » mais
 * impraticable — il faut balayer ligne par ligne pour lire une seule fiche.
 * Sous 760 px, la feuille de style (.stack-sm dans global.css) empile donc
 * chaque ligne en carte, chaque cellule sur sa propre ligne, précédée du nom
 * de sa colonne.
 *
 * Ce nom vient du <thead> réel, recopié ici dans `data-label` : les libellés
 * suivent donc la langue active sans qu'on ait à les répéter à la main sur
 * chaque <td> — et une colonne ajoutée ou renommée reste automatiquement
 * juste. L'effet tourne à chaque rendu ; il ne parcourt que quelques dizaines
 * de cellules, et c'est ce qui le garde synchrone avec les données, le tri et
 * le changement de langue.
 */
export default function StackedTable({
  className = "",
  wrapClassName = "",
  children,
}: {
  /** Classes ajoutées au <table>, après "table". */
  className?: string;
  /** Classes ajoutées au conteneur, après "table-wrap stack-sm". */
  wrapClassName?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLTableElement>(null);

  useEffect(() => {
    const table = ref.current;
    if (!table) return;
    const heads = Array.from(table.querySelectorAll("thead th")).map(
      (th) => th.textContent?.trim() ?? ""
    );
    for (const row of Array.from(table.querySelectorAll("tbody tr"))) {
      Array.from(row.children).forEach((cell, i) => {
        const label = heads[i] ?? "";
        // Une colonne sans en-tête (celle des actions) ne reçoit pas
        // d'étiquette : la cellule s'affiche seule, sans intitulé vide.
        if (label) cell.setAttribute("data-label", label);
        else cell.removeAttribute("data-label");
      });
    }
  });

  return (
    <div className={`${wrapClassName} table-wrap stack-sm`.trim()}>
      <table ref={ref} className={`table ${className}`.trim()}>
        {children}
      </table>
    </div>
  );
}
