import { useState } from "react";
import { AlertTriangle, RefreshCw, ChevronDown } from "lucide-react";
import { DEMO_MODE } from "../lib/config";
import { useSyncIssues, isSchemaError } from "../data/syncStatus";
import { refetchAll } from "../data/firebaseSync";

/**
 * Shown on every page when the database cannot answer. Without it, a pending
 * migration looks exactly like "there is no data yet" — the failure is only in
 * the console, which nobody reads.
 */
export default function SyncBanner() {
  const issues = useSyncIssues();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (DEMO_MODE || issues.length === 0) return null;

  // A pending migration has a precise fix; anything else (RLS, network) does not.
  // A missing TABLE empties whole pages; a missing column only costs a field, so
  // the two deserve different wording.
  const missingTables = issues.filter((i) => i.kind === "table" && isSchemaError(i.reason));
  const droppedColumns = issues.filter((i) => i.kind === "column");
  const isMigration = missingTables.length > 0 || droppedColumns.length > 0;

  async function recheck() {
    setBusy(true);
    try {
      await refetchAll();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sync-banner">
      <AlertTriangle size={18} className="sync-banner-icon" aria-hidden />
      <div className="sync-banner-body">
        <strong>
          {missingTables.length > 0
            ? "La base de données n'est pas à jour — certaines pages resteront vides."
            : droppedColumns.length > 0
            ? "Enregistré, mais certains champs ne sont pas encore stockés."
            : "Certaines données n'ont pas pu être chargées."}
        </strong>
        {isMigration && (
          <p className="muted small">
            L'application fonctionne quand même : les champs que la base ne connaît pas encore
            sont ignorés à l'enregistrement. Pour tout activer, ouvrez Supabase → SQL Editor,
            collez le fichier <code>supabase/SETUP.sql</code>, cliquez sur Run, puis sur
            « Revérifier » ici.
          </p>
        )}
        <button className="btn btn-ghost sm sync-banner-toggle" onClick={() => setOpen((o) => !o)}>
          <ChevronDown size={14} className={open ? "rot" : ""} aria-hidden />
          {open ? "Masquer le détail" : `Voir le détail (${issues.length})`}
        </button>
        {open && (
          <ul className="sync-banner-list">
            {issues.map((i) => (
              <li key={i.kind + i.table + i.reason}>
                <code>{i.table}</code>
                <span className="muted small">
                  {i.kind === "write"
                    ? "écriture refusée : "
                    : i.kind === "column"
                    ? "enregistré sans la colonne : "
                    : "lecture impossible : "}
                  {i.kind === "column" ? <code>{i.reason}</code> : i.reason}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button className="btn btn-primary sm" onClick={recheck} disabled={busy}>
        <RefreshCw size={14} className={busy ? "spin" : ""} aria-hidden />
        {busy ? "Vérification…" : "Revérifier"}
      </button>
    </div>
  );
}
