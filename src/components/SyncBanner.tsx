import { useState } from "react";
import { useTranslation } from "react-i18next";
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

  const { t } = useTranslation();

  return (
    <div className="sync-banner">
      <AlertTriangle size={18} className="sync-banner-icon" aria-hidden />
      <div className="sync-banner-body">
        <strong>
          {missingTables.length > 0
            ? t("sync.tables_missing")
            : droppedColumns.length > 0
            ? t("sync.columns_missing")
            : t("sync.load_failed")}
        </strong>
        {isMigration && (
          <p className="muted small">{t("sync.migration_hint", { file: "supabase/SETUP.sql" })}</p>
        )}
        <button className="btn btn-ghost sm sync-banner-toggle" onClick={() => setOpen((o) => !o)}>
          <ChevronDown size={14} className={open ? "rot" : ""} aria-hidden />
          {open ? t("sync.hide_detail") : t("sync.show_detail", { n: issues.length })}
        </button>
        {open && (
          <ul className="sync-banner-list">
            {issues.map((i) => (
              <li key={i.kind + i.table + i.reason}>
                <code>{i.table}</code>
                <span className="muted small">
                  {i.kind === "write"
                    ? t("sync.write_refused")
                    : i.kind === "column"
                    ? t("sync.column_dropped")
                    : t("sync.read_failed")}
                  {i.kind === "column" ? <code>{i.reason}</code> : i.reason}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button className="btn btn-primary sm" onClick={recheck} disabled={busy}>
        <RefreshCw size={14} className={busy ? "spin" : ""} aria-hidden />
        {busy ? t("sync.rechecking") : t("sync.recheck")}
      </button>
    </div>
  );
}
