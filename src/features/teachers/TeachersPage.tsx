import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus, Pencil, Trash2, Phone, Users, Search, Download, LayoutGrid, List,
  CalendarPlus, UserPlus, Link2, CircleCheck, TriangleAlert,
  BookOpen, Banknote, Hourglass, RotateCcw,
} from "lucide-react";
import { useData } from "../../data/store";
import { teacherPayout } from "../../lib/billing";
import { formatDA, billingMonth } from "../../lib/format";
import Sparkline from "../../components/Sparkline";
import { roomsOrDefault } from "../../lib/rooms";
import { LEVEL_LABEL } from "../../lib/labels";
import { useLabels } from "../../lib/useLabels";
import TeacherForm, { type TeacherFormValues } from "./TeacherForm";
import ClassForm from "../schedule/ClassForm";
import "../students/directory.css";
import "../attendance/attendance.css";
import type { ClassRoom, Teacher } from "../../lib/types";
import StackedTable from "../../components/StackedTable";

type Availability = "all" | "available" | "full";

export default function TeachersPage() {
  const { t } = useTranslation();
  const L = useLabels();
  const { teachers, subjects, classes, enrollments, payments, rooms: dbRooms } = useData();
  const addTeacher = useData((s) => s.addTeacher);
  const updateTeacher = useData((s) => s.updateTeacher);
  const deleteTeacher = useData((s) => s.deleteTeacher);
  const updateClass = useData((s) => s.updateClass);
  const rooms = roomsOrDefault(dbRooms);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [availability, setAvailability] = useState<Availability>("all");
  const [view, setView] = useState<"grid" | "list">("list");
  const [pickedId, setPickedId] = useState("");
  const [assignId, setAssignId] = useState("");
  const [newClass, setNewClass] = useState<Partial<ClassRoom> | null>(null);
  const [flash, setFlash] = useState("");

  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "?";
  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? "—";

  /** Everything the directory shows about one teacher. */
  function profileOf(teacher: Teacher) {
    const groups = classes.filter((c) => c.teacherId === teacher.id);
    const seats = groups.reduce((n, c) => n + c.maxStudents, 0);
    const taken = groups.reduce((n, c) => n + c.currentStudents, 0);
    // "At capacity" = every one of their groups is full.
    const full = groups.length > 0 && groups.every((c) => c.currentStudents >= c.maxStudents);
    const money = teacherPayout(teacher.id, enrollments, payments);
    return { groups, seats, taken, full, money };
  }

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return teachers.filter((te) => {
      if (q && !te.name.toLowerCase().includes(q) && !te.phone.includes(q)) return false;
      if (subjectFilter && !te.subjects.includes(subjectFilter)) return false;
      if (availability !== "all") {
        const full = profileOf(te).full;
        if (availability === "full" ? !full : full) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teachers, search, subjectFilter, availability, classes]);

  /** Chiffres de l'en-tete, sur les enseignants visibles. */
  const stats = useMemo(() => {
    const profiles = rows.map(profileOf);
    const available = profiles.filter((p) => !p.full).length;
    const groups = profiles.reduce((n, p) => n + p.groups.length, 0);
    const subjectIds = new Set(rows.flatMap((te) => te.subjects));
    const ready = profiles.reduce((n, p) => n + p.money.earned, 0);
    const pending = profiles.reduce((n, p) => n + p.money.pending, 0);
    return {
      total: rows.length,
      activePct: rows.length ? Math.round((available / rows.length) * 100) : 0,
      groups,
      subjects: subjectIds.size,
      ready,
      pending,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, classes, enrollments, payments]);

  /** Six mois d'historique reel, pour les courbes des vignettes. */
  const series = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) =>
      new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    );
    const endOf = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();
    const cut = (month: string, paid: boolean) =>
      payments
        .filter((p) => p.month === month && (p.status === "paid") === paid)
        .reduce((a, p) => a + p.teacherCut, 0);
    return {
      teachers: months.map((d) => teachers.filter((te) => te.createdAt <= endOf(d)).length),
      groups: months.map((d) => classes.filter((c) => c.createdAt <= endOf(d)).length),
      subjects: months.map((d) => subjects.filter((x) => x.createdAt <= endOf(d)).length),
      ready: months.map((d) => cut(billingMonth(d), true)),
      pending: months.map((d) => cut(billingMonth(d), false)),
    };
  }, [teachers, classes, subjects, payments]);

  /** Y a-t-il un filtre actif ? Sert au bouton de reinitialisation. */
  const filtered = !!search || !!subjectFilter || availability !== "all";
  function resetFilters() {
    setSearch("");
    setSubjectFilter("");
    setAvailability("all");
  }

  const picked = teachers.find((te) => te.id === pickedId) ?? null;
  const pickedProfile = picked ? profileOf(picked) : null;

  /** Groups that are not this teacher's yet, so they can be handed over. */
  const assignable = useMemo(
    () => (picked ? classes.filter((c) => c.teacherId !== picked.id) : []),
    [classes, picked]
  );

  function onSave(values: TeacherFormValues) {
    if (editing) updateTeacher(editing.id, values);
    else addTeacher(values);
    setShowForm(false);
    setEditing(null);
  }

  function assign() {
    if (!picked || !assignId) return;
    const klass = classes.find((c) => c.id === assignId);
    if (!klass) return;
    updateClass(klass.id, { teacherId: picked.id });
    setAssignId("");
    setFlash(t("tea.assigned_flash", { group: subjName(klass.subjectId), name: picked.name }));
  }

  function exportCsv() {
    const head = [t("stu.name"), t("tea.department"), t("tea.active_groups"), t("tea.status")].join(";");
    const body = rows
      .map((te) => {
        const p = profileOf(te);
        return [
          te.name,
          te.subjects.map(subjName).join(" / "),
          p.groups.length,
          p.full ? t("tea.at_capacity") : t("tea.available"),
        ].join(";");
      })
      .join("\n");
    const blob = new Blob([head + "\n" + body], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "enseignants.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="stack">
      <header className="page-head">
        <div className="page-title">
          <h1>{t("tea.dir_title")}</h1>
          <p>{t("tea.dir_sub")}</p>
        </div>
        <div className="row-actions">
          <button className="btn btn-ghost" onClick={exportCsv} disabled={rows.length === 0}>
            <Download size={16} /> {t("hist.export")}
          </button>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={17} /> {t("tea.new")}
          </button>
        </div>
      </header>

      {flash && <p className="att-flash">{flash}</p>}

      <div className="dir-kpis">
        <div className="card dir-kpi" style={kTile(0)}>
          <div className="dir-kpi-head">
            <span className="dir-kpi-icon"><Users size={19} /></span>
            <div className="dir-kpi-body">
              <span className="dir-kpi-value">{stats.total}</span>
              <span className="dir-kpi-label">{t("nav.teachers")}</span>
              <span className="dir-kpi-foot">{t("tea.k_available", { pct: stats.activePct })}</span>
            </div>
          </div>
          <Sparkline values={series.teachers} tone="#1e3f75" />
        </div>

        <div className="card dir-kpi" style={kTile(1)}>
          <div className="dir-kpi-head">
            <span className="dir-kpi-icon"><CalendarPlus size={19} /></span>
            <div className="dir-kpi-body">
              <span className="dir-kpi-value">{stats.groups}</span>
              <span className="dir-kpi-label">{t("tea.active_groups")}</span>
              <span className="dir-kpi-foot">{t("tea.k_led")}</span>
            </div>
          </div>
          <Sparkline values={series.groups} tone="#17638f" />
        </div>

        <div className="card dir-kpi" style={kTile(2)}>
          <div className="dir-kpi-head">
            <span className="dir-kpi-icon"><BookOpen size={19} /></span>
            <div className="dir-kpi-body">
              <span className="dir-kpi-value">{stats.subjects}</span>
              <span className="dir-kpi-label">{t("nav.subjects")}</span>
              <span className="dir-kpi-foot">{t("tea.k_covered")}</span>
            </div>
          </div>
          <Sparkline values={series.subjects} tone="#12697a" />
        </div>

        <div className="card dir-kpi" style={kTile(3)}>
          <div className="dir-kpi-head">
            <span className="dir-kpi-icon"><Banknote size={19} /></span>
            <div className="dir-kpi-body">
              <span className="dir-kpi-value text-ok">{formatDA(stats.ready)}</span>
              <span className="dir-kpi-label">{t("pay.k_ready")}</span>
              <span className="dir-kpi-foot">{t("nav.payments")}</span>
            </div>
          </div>
          <Sparkline values={series.ready} tone="var(--success)" />
        </div>

        <div className="card dir-kpi" style={kTile(4)}>
          <div className="dir-kpi-head">
            <span className="dir-kpi-icon"><Hourglass size={19} /></span>
            <div className="dir-kpi-body">
              <span className={"dir-kpi-value " + (stats.pending > 0 ? "text-danger" : "")}>
                {formatDA(stats.pending)}
              </span>
              <span className="dir-kpi-label">{t("pay.k_pending")}</span>
              <span className="dir-kpi-foot">{t("nav.payments")}</span>
            </div>
          </div>
          <Sparkline values={series.pending} tone="var(--gold)" />
        </div>
      </div>

      <div className="card dir-filters">
        <label className="field dir-search">
          <span>{t("tea.search")}</span>
          <div className="att-search-box">
            <Search size={15} aria-hidden="true" />
            <input
              className="input"
              placeholder={t("tea.search_ph")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </label>
        <label className="field">
          <span>{t("tea.department")}</span>
          <select className="input" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
            <option value="">{t("hist.filter_all")}</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t("tea.status")}</span>
          <select
            className="input"
            value={availability}
            onChange={(e) => setAvailability(e.target.value as Availability)}
          >
            <option value="all">{t("hist.filter_all")}</option>
            <option value="available">{t("tea.available")}</option>
            <option value="full">{t("tea.at_capacity")}</option>
          </select>
        </label>
        <div className="dir-count">
          <strong>{rows.length}</strong>
          <span className="muted small">{t("tea.found")}</span>
          <div className="dir-view">
            <button
              className={"dir-view-btn" + (view === "list" ? " on" : "")}
              onClick={() => setView("list")}
              aria-label={t("stu.view_list")}
            >
              <List size={15} />
            </button>
            <button
              className={"dir-view-btn" + (view === "grid" ? " on" : "")}
              onClick={() => setView("grid")}
              aria-label={t("stu.view_grid")}
            >
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="tea-board">
        {/* ---------------------------------------------------- the directory */}
        {rows.length === 0 ? (
          <div className="card dir-empty">
            <EmptyArt />
            <strong>{t("tea.none")}</strong>
            <p>{filtered ? t("tea.none_filtered") : t("tea.none_hint")}</p>
            {filtered && (
              <button className="btn btn-ghost" onClick={resetFilters}>
                <RotateCcw size={16} /> {t("common.reset_filters")}
              </button>
            )}
          </div>
        ) : view === "list" ? (
          <StackedTable wrapClassName="card">
              <thead>
                <tr>
                  <th>{t("stu.name")}</th>
                  <th>{t("tea.department")}</th>
                  <th>{t("tea.active_groups")}</th>
                  <th>{t("tea.status")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((teacher) => {
                  const p = profileOf(teacher);
                  return (
                    <tr
                      key={teacher.id}
                      className={"dir-row" + (teacher.id === pickedId ? " on" : "")}
                      onClick={() => setPickedId(teacher.id)}
                    >
                      <td>
                        <div className="cell-id">
                          <span className="cell-avatar">{initials(teacher.name)}</span>
                          <div>
                            <strong>{teacher.name}</strong>
                            <a
                              className="muted small cell-phone"
                              href={`tel:${teacher.phone}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone size={12} /> {teacher.phone || "—"}
                            </a>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="cell-tags">
                          {teacher.subjects.length === 0
                            ? "—"
                            : teacher.subjects.map((id) => (
                                <span key={id} className="pill pill-soft">{subjName(id)}</span>
                              ))}
                        </div>
                      </td>
                      <td>
                        <span className="att-name-col">
                          <strong>{t("tea.n_groups", { n: p.groups.length })}</strong>
                          <span className="muted small">{t("tea.n_seats", { taken: p.taken, total: p.seats })}</span>
                        </span>
                      </td>
                      <td>
                        <span className={"dir-pay " + (p.full ? "overdue" : "paid")}>
                          {p.full
                            ? <><TriangleAlert size={12} /> {t("tea.at_capacity")}</>
                            : <><CircleCheck size={12} /> {t("tea.available")}</>}
                        </span>
                      </td>
                      <td className="row-actions">
                        <button
                          className="icon-btn"
                          title={t("common.edit")}
                          onClick={(e) => { e.stopPropagation(); setEditing(teacher); setShowForm(true); }}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="icon-btn danger"
                          title={t("common.delete")}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(t("stu.confirm_delete", { name: teacher.name }))) deleteTeacher(teacher.id);
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
          </StackedTable>
        ) : (
          <div className="dir-grid">
            {rows.map((teacher) => {
              const p = profileOf(teacher);
              return (
                <article key={teacher.id} className="card dir-card" onClick={() => setPickedId(teacher.id)}>
                  <div className="dir-card-head">
                    <span className="att-initials lg" aria-hidden="true">{initials(teacher.name)}</span>
                    <div className="att-name-col">
                      <strong>{teacher.name}</strong>
                      <span className="muted small">{teacher.phone || "—"}</span>
                    </div>
                    <span className={"dir-grade" + (p.full ? " off" : "")}>
                      {p.full ? t("tea.at_capacity") : t("tea.available")}
                    </span>
                  </div>

                  <div className="dir-card-block">
                    <span className="dir-label">{t("tea.department")}</span>
                    <span className="dir-groups">
                      {teacher.subjects.map(subjName).join(" · ") || "—"}
                    </span>
                  </div>

                  <div className="dir-card-block">
                    <span className="dir-label">{t("tea.active_groups")}</span>
                    <span className="dir-groups">
                      {t("tea.n_groups", { n: p.groups.length })} ·{" "}
                      {t("tea.n_seats", { taken: p.taken, total: p.seats })}
                    </span>
                  </div>

                  <div className="dir-card-block">
                    <span className="dir-label">{t("tea.collected")}</span>
                    <span className="dir-groups">
                      <b className="text-ok">{formatDA(p.money.earned)}</b>
                      {p.money.pending > 0 && (
                        <> · <b className="text-danger">{formatDA(p.money.pending)}</b></>
                      )}
                    </span>
                  </div>

                  <div className="dir-card-actions">
                    <button
                      className="icon-btn"
                      title={t("common.edit")}
                      onClick={(e) => { e.stopPropagation(); setEditing(teacher); setShowForm(true); }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="icon-btn danger"
                      title={t("common.delete")}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(t("stu.confirm_delete", { name: teacher.name }))) deleteTeacher(teacher.id);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* -------------------------------------------- teacher management */}
        <aside className="card tea-manage">
          <h2 className="pay-ledger-title">{t("tea.manage")}</h2>
          {!picked || !pickedProfile ? (
            <div className="empty-state">
              <span className="empty-state-icon"><Users size={24} /></span>
              <strong>{t("tea.pick_none")}</strong>
              <p>{t("tea.pick_hint")}</p>
            </div>
          ) : (
            <>
              <div className="pay-detail-head">
                <span className="att-initials lg" aria-hidden="true">{initials(picked.name)}</span>
                <div className="att-name-col">
                  <strong>{picked.name}</strong>
                  <span className="muted small">
                    {picked.paymentMode === "percentage"
                      ? t("tea.rule_percent", { pct: 100 - picked.schoolCutValue })
                      : t("tea.rule_fixed", { amount: formatDA(picked.schoolCutValue) })}
                  </span>
                </div>
              </div>

              <h3 className="att-aside-title">{t("tea.current_groups")}</h3>
              <ul className="tea-groups">
                {pickedProfile.groups.map((c) => (
                  <li key={c.id}>
                    <span className="att-name-col">
                      <strong>{subjName(c.subjectId)}</strong>
                      <span className="muted small">
                        {t(`days.${c.dayOfWeek}`)} {c.timeSlot} · {roomName(c.roomId)} · {LEVEL_LABEL[c.level]}
                      </span>
                    </span>
                    <span className="tea-seats">
                      <b className={c.currentStudents >= c.maxStudents ? "text-danger" : "text-ok"}>
                        {c.currentStudents}/{c.maxStudents}
                      </b>
                      <em className="muted small">{L.sessionType(c.sessionType)}</em>
                    </span>
                  </li>
                ))}
                {pickedProfile.groups.length === 0 && (
                  <li className="muted small">{t("tea.no_groups")}</li>
                )}
              </ul>

              <h3 className="att-aside-title">{t("tea.assign_existing")}</h3>
              <div className="tea-assign">
                <select className="input" value={assignId} onChange={(e) => setAssignId(e.target.value)}>
                  <option value="">{t("tea.pick_group")}</option>
                  {assignable.map((c) => (
                    <option key={c.id} value={c.id}>
                      {subjName(c.subjectId)} · {t(`days.${c.dayOfWeek}`)} {c.timeSlot}
                    </option>
                  ))}
                </select>
                <button className="btn btn-ghost" onClick={assign} disabled={!assignId}>
                  <Link2 size={15} /> {t("tea.assign")}
                </button>
              </div>
              {assignable.length === 0 && <p className="muted small">{t("tea.nothing_to_assign")}</p>}

              <h3 className="att-aside-title">{t("tea.create_new")}</h3>
              <div className="tea-create">
                <button
                  className="btn btn-primary"
                  onClick={() => setNewClass({ teacherId: picked.id, sessionType: "group", maxStudents: 15 })}
                >
                  <CalendarPlus size={15} /> {t("tea.new_group")}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => setNewClass({ teacherId: picked.id, sessionType: "one_on_one", maxStudents: 1 })}
                >
                  <UserPlus size={15} /> {t("tea.new_one_on_one")}
                </button>
              </div>
            </>
          )}
        </aside>
      </div>

      {showForm && (
        <TeacherForm
          initial={editing ?? undefined}
          onSave={onSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
      {newClass && <ClassForm prefill={newClass} onClose={() => setNewClass(null)} />}
    </div>
  );
}

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

/* Teintes des vignettes : la gamme de la page vitrine. */
const K_TILES = [
  { bg: "#dbe6f6", fg: "#1e3f75" },
  { bg: "#d5eaf8", fg: "#17638f" },
  { bg: "#cfeaee", fg: "#12697a" },
  { bg: "#d7ece0", fg: "#0a6c46" },
  { bg: "#fbeac4", fg: "#8a6410" },
];
const kTile = (i: number) =>
  ({ "--tile-bg": K_TILES[i].bg, "--tile-fg": K_TILES[i].fg } as React.CSSProperties);

/** Illustration de l'etat vide : toque, livres et plante. */
function EmptyArt() {
  return (
    <svg className="dir-empty-art" viewBox="0 0 200 130" fill="none" aria-hidden="true">
      <circle cx="108" cy="62" r="52" fill="var(--primary-soft)" />

      {/* avion en papier et sa trajectoire */}
      <path
        d="M6 108c14 6 26 2 30-8 3-8-6-14-12-9-7 6 1 18 14 21 12 3 24-3 30-12"
        stroke="var(--primary)" strokeWidth="2" strokeDasharray="4 5" strokeLinecap="round" opacity="0.45"
      />
      <path d="M72 74l24-10-9 22-4-9z" fill="var(--sky-500)" />

      {/* pile de livres */}
      <rect x="78" y="82" width="52" height="9" rx="2.5" fill="var(--gold-400)" />
      <rect x="82" y="73" width="44" height="9" rx="2.5" fill="var(--sky-500)" />
      <rect x="86" y="64" width="36" height="9" rx="2.5" fill="var(--navy-600)" />

      {/* toque */}
      <path d="M104 46l-22-9 22-9 22 9z" fill="var(--navy-800)" />
      <path d="M92 42v8c0 4 5 6 12 6s12-2 12-6v-8" fill="var(--navy-700)" />
      <path d="M126 37v11" stroke="var(--gold-400)" strokeWidth="2.5" strokeLinecap="round" />

      {/* plante */}
      <path d="M148 78c-1-9-6-14-14-15 1 9 6 14 14 15z" fill="var(--success)" opacity="0.55" />
      <path d="M148 78c1-10 7-16 16-17-1 11-7 17-16 17z" fill="var(--success)" opacity="0.75" />
      <path d="M139 84h20l-3 14a3 3 0 01-3 2h-8a3 3 0 01-3-2z" fill="var(--gold-400)" />

      <circle cx="150" cy="26" r="3" fill="var(--gold-300)" />
      <circle cx="64" cy="34" r="2.5" fill="var(--sky-500)" />
    </svg>
  );
}
