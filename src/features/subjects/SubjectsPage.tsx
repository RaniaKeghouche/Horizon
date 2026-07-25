import { useState } from "react";
import { useTranslation } from "react-i18next";
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
      <h1>{t("nav.subjects")}</h1>

      <div className="card add-row">
        <input
          className="input"
          placeholder="Nom de la matière (ex : Espagnol)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button className="btn btn-primary" onClick={add}>
          ＋ {t("common.add")}
        </button>
      </div>

      <div className="chip-grid">
        {subjects.map((s) => {
          const count = usedBy(s.id);
          return (
            <div key={s.id} className="chip-card">
              <div>
                <strong>{s.name}</strong>
                <div className="muted small">
                  {s.isCustom ? "Personnalisée" : "Par défaut"} · {formatDate(s.createdAt)}
                </div>
              </div>
              <button
                className="icon-btn danger"
                title={count > 0 ? `Utilisée par ${count} classe(s)` : t("common.delete")}
                disabled={count > 0}
                onClick={() => deleteSubject(s.id)}
              >
                🗑
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
