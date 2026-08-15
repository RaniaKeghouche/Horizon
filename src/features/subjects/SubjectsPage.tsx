import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Check, X } from "lucide-react";
import { useData } from "../../data/store";
import { formatDate } from "../../lib/format";
import { LEVEL_GROUPS, LEVEL_LABEL } from "../../lib/labels";
import type { StudentLevel, Subject } from "../../lib/types";

type ByLevel = Subject["teachersByLevel"];

// Subjects are not hardcoded (cahier §7). For each subject the admin picks the
// levels it is offered at, and for each of those levels which teachers may take
// it — a student only ever sees the teachers listed for their own level.
export default function SubjectsPage() {
  const { t } = useTranslation();
  const subjects = useData((s) => s.subjects);
  const teachers = useData((s) => s.teachers);
  const classes = useData((s) => s.classes);
  const addSubject = useData((s) => s.addSubject);
  const updateSubject = useData((s) => s.updateSubject);
  const deleteSubject = useData((s) => s.deleteSubject);

  const [name, setName] = useState("");
  const [draft, setDraft] = useState<ByLevel>({});
  const [editing, setEditing] = useState<string | null>(null);

  const teacherName = (id: string) => teachers.find((x) => x.id === id)?.name ?? "?";
  const usedBy = (subjectId: string) => classes.filter((c) => c.subjectId === subjectId).length;

  /** Toggle a level on/off. Turning it off drops its teachers too. */
  function toggleLevel(map: ByLevel, level: StudentLevel): ByLevel {
    const next = { ...map };
    if (level in next) delete next[level];
    else next[level] = [];
    return next;
  }
  /** Toggle one teacher within a level. */
  function toggleTeacher(map: ByLevel, level: StudentLevel, teacherId: string): ByLevel {
    const current = map[level] ?? [];
    const list = current.includes(teacherId)
      ? current.filter((x) => x !== teacherId)
      : [...current, teacherId];
    return { ...map, [level]: list };
  }

  function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    addSubject(trimmed, draft);
    setName("");
    setDraft({});
  }

  /** Level picker + a teacher row per chosen level. Shared by create and edit. */
  function LevelEditor({ value, onChange }: { value: ByLevel; onChange: (next: ByLevel) => void }) {
    const chosen = Object.keys(value) as StudentLevel[];
    return (
      <>
        <div className="field">
          <span className="muted small">{t("subjects.pickLevels")}</span>
          {LEVEL_GROUPS.map((g) => (
            <div key={g.label} className="level-row">
              <span className="level-cycle">{g.label}</span>
              <div className="checkbox-list">
                {g.levels.map((lv) => (
                  <label key={lv} className={"chip-toggle" + (lv in value ? " on" : "")}>
                    <input
                      type="checkbox"
                      checked={lv in value}
                      onChange={() => onChange(toggleLevel(value, lv))}
                    />
                    {LEVEL_LABEL[lv]}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {chosen.length > 0 && (
          <div className="field" style={{ marginTop: "0.75rem" }}>
            <span className="muted small">{t("subjects.pickTeachers")}</span>
            {teachers.length === 0 && <span className="muted small">{t("subjects.noTeachers")}</span>}
            {chosen.map((lv) => (
              <div key={lv} className="level-row">
                <span className="level-cycle">{LEVEL_LABEL[lv]}</span>
                <div className="checkbox-list">
                  {teachers.map((tc) => {
                    const on = (value[lv] ?? []).includes(tc.id);
                    return (
                      <label key={tc.id} className={"chip-toggle" + (on ? " on" : "")}>
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => onChange(toggleTeacher(value, lv, tc.id))}
                        />
                        {tc.name}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="stack">
      <h1>{t("nav.subjects")}</h1>

      <div className="card">
        <div className="add-row">
          <input
            className="input"
            placeholder="Nom de la matière (ex : Espagnol)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <button className="btn btn-primary" onClick={add} disabled={!name.trim()}>
            <Plus size={16} /> {t("common.add")}
          </button>
        </div>
        <LevelEditor value={draft} onChange={setDraft} />
      </div>

      <div className="stack">
        {subjects.map((s) => {
          const map = s.teachersByLevel ?? {};
          const levels = Object.keys(map) as StudentLevel[];
          const count = usedBy(s.id);
          const isEditing = editing === s.id;

          return (
            <div key={s.id} className="card subject-card">
              <div className="subject-head">
                <div>
                  <strong>{s.name}</strong>
                  <div className="muted small">
                    {s.isCustom ? "Personnalisée" : "Par défaut"} · {formatDate(s.createdAt)}
                  </div>
                </div>
                <div className="row-actions">
                  <button
                    className="icon-btn"
                    title={t("subjects.editLevels")}
                    onClick={() => setEditing(isEditing ? null : s.id)}
                  >
                    {isEditing ? <X size={16} /> : <Check size={16} />}
                  </button>
                  <button
                    className="icon-btn danger"
                    title={count > 0 ? `Utilisée par ${count} classe(s)` : t("common.delete")}
                    disabled={count > 0}
                    onClick={() => deleteSubject(s.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {isEditing ? (
                <LevelEditor
                  value={map}
                  onChange={(next) => updateSubject(s.id, { teachersByLevel: next })}
                />
              ) : levels.length === 0 ? (
                <span className="muted small">{t("subjects.noLevels")}</span>
              ) : (
                <div className="offer-list">
                  {levels.map((lv) => (
                    <div key={lv} className="offer-row">
                      <span className="pill pill-soft">{LEVEL_LABEL[lv]}</span>
                      <div className="chip-row">
                        {(map[lv] ?? []).length === 0 ? (
                          <span className="muted small">{t("subjects.noneAssigned")}</span>
                        ) : (
                          (map[lv] ?? []).map((id) => (
                            <span key={id} className="chip-selected">
                              {teacherName(id)}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
