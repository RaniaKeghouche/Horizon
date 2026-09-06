import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { useData } from "../data/store";
import { LEVEL_LABEL } from "../lib/labels";
import { useLabels } from "../lib/useLabels";
import type { ClassRoom, StudentLevel } from "../lib/types";

export interface GroupFilters {
  teacherId: string; // "" = all
  level: string; // "" = all
  subjectId: string; // "" = all
}

export const EMPTY_FILTERS: GroupFilters = { teacherId: "", level: "", subjectId: "" };

/** Apply the filter triple to a list of groups. Exported so pages can reuse the
 *  same narrowing for things that hang off groups (students, payments...). */
export function filterClasses(classes: ClassRoom[], f: GroupFilters): ClassRoom[] {
  return classes.filter(
    (c) =>
      (!f.teacherId || c.teacherId === f.teacherId) &&
      (!f.level || c.level === f.level) &&
      (!f.subjectId || c.subjectId === f.subjectId)
  );
}

/**
 * One picker for every screen that works "per group": narrow by teacher, level
 * and subject, then choose the group. Each dropdown only offers values that
 * still have groups under the current filters, so you can never land on an
 * empty result by accident.
 */
export default function GroupPicker({
  classes,
  filters,
  onFilters,
  value,
  onChange,
  showGroups = true,
}: {
  classes: ClassRoom[];
  filters: GroupFilters;
  onFilters: (f: GroupFilters) => void;
  value?: string;
  onChange?: (classId: string) => void;
  /** Hide the group list when the page filters by something else (e.g. students). */
  showGroups?: boolean;
}) {
  const L = useLabels();
  const { t } = useTranslation();
  const { subjects, teachers } = useData();

  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "?";
  const teacherName = (id: string) => teachers.find((t) => t.id === id)?.name ?? "?";

  // Options are derived from the groups themselves — never show a teacher or a
  // level that has no groups at all.
  const opts = useMemo(() => {
    const t = new Set<string>();
    const l = new Set<string>();
    const s = new Set<string>();
    for (const c of classes) {
      // A value stays selectable if it would still match the OTHER filters.
      if ((!filters.level || c.level === filters.level) && (!filters.subjectId || c.subjectId === filters.subjectId))
        t.add(c.teacherId);
      if ((!filters.teacherId || c.teacherId === filters.teacherId) && (!filters.subjectId || c.subjectId === filters.subjectId))
        l.add(c.level);
      if ((!filters.teacherId || c.teacherId === filters.teacherId) && (!filters.level || c.level === filters.level))
        s.add(c.subjectId);
    }
    return { teachers: [...t], levels: [...l], subjects: [...s] };
  }, [classes, filters]);

  const matching = filterClasses(classes, filters);

  function set(patch: Partial<GroupFilters>) {
    const next = { ...filters, ...patch };
    onFilters(next);
    // Keep the selection valid: if the current group falls outside the new
    // filters, move to the first one that matches.
    if (onChange) {
      const still = filterClasses(classes, next);
      if (!still.some((c) => c.id === value)) onChange(still[0]?.id ?? "");
    }
  }

  const activeCount = [filters.teacherId, filters.level, filters.subjectId].filter(Boolean).length;
  const current = matching.find((c) => c.id === value);

  // Collapsed once something is selected: the picker is navigation, not the
  // content of the page, so it should not take up half the screen.
  const [open, setOpen] = useState(false);

  if (!open && current) {
    return (
      <div className="gp gp-collapsed">
        <div className="gp-current">
          <span className="gp-current-subject">{subjName(current.subjectId)}</span>
          <span className="muted small">
            {LEVEL_LABEL[current.level]} · {L.day(current.dayOfWeek)} {current.timeSlot} ·{" "}
            {teacherName(current.teacherId)}
          </span>
        </div>
        <button className="btn btn-ghost sm" onClick={() => setOpen(true)}>
          Changer de groupe ({matching.length})
        </button>
      </div>
    );
  }

  return (
    <div className="gp">
      <div className="gp-filters">
        <label className="field">
          <span className="muted small">{t("grp.teacher_label")}</span>
          <select className="input" value={filters.teacherId} onChange={(e) => set({ teacherId: e.target.value })}>
            <option value="">{t("common.all")} ({opts.teachers.length})</option>
            {opts.teachers.map((id) => (
              <option key={id} value={id}>{teacherName(id)}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="muted small">{t("stu.level")}</span>
          <select className="input" value={filters.level} onChange={(e) => set({ level: e.target.value })}>
            <option value="">Tous ({opts.levels.length})</option>
            {L.levelGroups().map((g) => {
              const avail = g.levels.filter((l) => opts.levels.includes(l));
              if (avail.length === 0) return null;
              return (
                <optgroup key={g.label} label={g.label}>
                  {avail.map((l) => (
                    <option key={l} value={l}>{LEVEL_LABEL[l as StudentLevel]}</option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </label>

        <label className="field">
          <span className="muted small">{t("nav.subjects")}</span>
          <select className="input" value={filters.subjectId} onChange={(e) => set({ subjectId: e.target.value })}>
            <option value="">{t("common.all_f")} ({opts.subjects.length})</option>
            {opts.subjects.map((id) => (
              <option key={id} value={id}>{subjName(id)}</option>
            ))}
          </select>
        </label>

        {activeCount > 0 && (
          <button className="btn btn-ghost sm gp-clear" onClick={() => set(EMPTY_FILTERS)}>
            {t("common.reset_filters")}
          </button>
        )}
      </div>

      {showGroups && (
        <div className="gp-groups">
          {matching.length === 0 ? (
            <span className="muted small">{t("att.no_group_match")}</span>
          ) : (
            matching.map((c) => (
              <button
                key={c.id}
                className={"gp-chip" + (c.id === value ? " on" : "")}
                onClick={() => {
                  onChange?.(c.id);
                  setOpen(false);
                }}
              >
                <strong>{subjName(c.subjectId)}</strong>
                <span>
                  {LEVEL_LABEL[c.level]} · {L.day(c.dayOfWeek)} {c.timeSlot}
                </span>
                <span className="gp-chip-teacher">{teacherName(c.teacherId)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
