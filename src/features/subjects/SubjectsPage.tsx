import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, BookOpen } from "lucide-react";
import { useData } from "../../data/store";
import { formatDate } from "../../lib/format";

// Subjects are not hardcoded — admin can add/remove any subject (cahier §7).
export default function SubjectsPage() {
  const { t } = useTranslation();
  const subjects = useData((s) => s.subjects);
  const classes = useData((s) => s.classes);
  const addSubject = useData((s) => s.addSubject);
  const deleteSubject = useData((s) => s.deleteSubject);
  const [name, setName] = useState("");

  function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    addSubject(trimmed);
    setName("");
  }

  function usedBy(subjectId: string) {
    return classes.filter((c) => c.subjectId === subjectId).length;
  }

  return (
    <div className="stack">
      <header className="page-head">
        <div className="page-title">
          <h1>{t("nav.subjects")}</h1>
          <p>{t("sub.subtitle")}</p>
        </div>
      </header>

      <div className="card add-row">
        <input
          className="input"
          placeholder={t("sub.placeholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button className="btn btn-primary" onClick={add} disabled={!name.trim()}>
          <Plus size={17} /> {t("common.add")}
        </button>
      </div>

      {subjects.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon"><BookOpen size={24} /></span>
            <strong>{t("sub.none")}</strong>
            <p>{t("sub.none_hint")}</p>
          </div>
        </div>
      ) : (
        <div className="chip-grid">
          {subjects.map((s) => {
            const count = usedBy(s.id);
            return (
              <div key={s.id} className="chip-card">
                <div>
                  <strong>{s.name}</strong>
                  <div className="muted small">
                    {s.isCustom ? t("sub.custom") : t("sub.default")} · {formatDate(s.createdAt)}
                  </div>
                  {count > 0 && (
                    <span className="pill pill-soft">{t("sub.used_by", { n: count })}</span>
                  )}
                </div>
                {/* Une matière rattachée à des groupes n'est pas supprimable :
                    l'infobulle explique pourquoi le bouton est inerte. */}
                <button
                  className="icon-btn danger"
                  title={count > 0 ? t("sub.cannot_delete", { n: count }) : t("common.delete")}
                  disabled={count > 0}
                  onClick={() => deleteSubject(s.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
