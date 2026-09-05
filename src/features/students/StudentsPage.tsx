import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Plus, Search, Pencil, Trash2, Phone, GraduationCap, Download, LayoutGrid, List,
  CircleCheck, TriangleAlert, Clock, Users, CalendarDays, Wallet, CreditCard,
  ChevronLeft, ChevronRight, RotateCcw,
} from "lucide-react";
import { useData } from "../../data/store";
import { cycleBalance } from "../../lib/cycles";
import "./directory.css";
import "../attendance/attendance.css";
import { formatDA, billingMonth } from "../../lib/format";
import Sparkline from "../../components/Sparkline";
import { LEVELS, LEVEL_LABEL } from "../../lib/labels";
import { useAuth } from "../auth/AuthContext";
import StudentForm, { type StudentFormValues } from "./StudentForm";
import StudentDetail from "./StudentDetail";
import type { Student, StudentLevel } from "../../lib/types";
import StackedTable from "../../components/StackedTable";

type PayFilter = "all" | "paid" | "pending" | "overdue" | "none";
type SortKey = "az" | "za" | "due" | "recent";

/** Combien de fiches par page dans la vue cartes. */
const PER_PAGE = 8;

/** Pastilles des indicateurs, dans la gamme bleue de l'identite. */
const TILES = [
  { bg: "#e7edf8", fg: "#2d5490" },
  { bg: "#e3f0fb", fg: "#1f6fa8" },
  { bg: "#e2f4f6", fg: "#17798a" },
  { bg: "#e6f1fd", fg: "#3667b5" },
  { bg: "#e9ecfa", fg: "#4257a8" },
];
const tile = (i: number) =>
  ({ "--tile-bg": TILES[i].bg, "--tile-fg": TILES[i].fg } as React.CSSProperties);

export default function StudentsPage() {
  const { t } = useTranslation();
  const { role, profile } = useAuth();
  const { students, subjects, classes, enrollments, sessions, payments } = useData();
  const addStudent = useData((s) => s.addStudent);
  const updateStudent = useData((s) => s.updateStudent);
  const deleteStudent = useData((s) => s.deleteStudent);

  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [levelFilter, setLevelFilter] = useState<StudentLevel | "">("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [detail, setDetail] = useState<Student | null>(null);
  const [payFilter, setPayFilter] = useState<PayFilter>("all");
  const [groupFilter, setGroupFilter] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<SortKey>("az");
  const [page, setPage] = useState(1);

  const isAdmin = role === "admin";

  // Pick up the topbar search (?q=...) when navigating in.
  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) setSearch(q);
  }, [searchParams]);

  // A teacher only sees students enrolled in their own classes (cahier §2).
  const teacherStudentIds = useMemo(() => {
    if (role !== "teacher" || !profile?.teacherId) return null;
    const myClasses = new Set(classes.filter((c) => c.teacherId === profile.teacherId).map((c) => c.id));
    return new Set(enrollments.filter((e) => myClasses.has(e.classId)).map((e) => e.studentId));
  }, [role, profile, classes, enrollments]);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (teacherStudentIds && !teacherStudentIds.has(s.id)) return false;
      if (levelFilter && s.level !== levelFilter) return false;
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [students, search, levelFilter, teacherStudentIds]);

  function onSave(values: StudentFormValues) {
    if (editing) updateStudent(editing.id, values);
    else addStudent(values);
    setShowForm(false);
    setEditing(null);
  }

  /** Payment standing of one student, from the 4-session cycles. */
  function standing(student: Student) {
    const mine = enrollments.filter((e) => e.studentId === student.id);
    let due = 0, cycles = 0, paidCycles = 0;
    for (const e of mine) {
      const klass = classes.find((c) => c.id === e.classId);
      const bal = cycleBalance(
        sessions.filter((x) => x.classId === e.classId),
        student.id,
        klass?.pricePerSession ?? 0,
        payments.filter((p) => p.enrollmentId === e.id)
      );
      due += bal.totalDue;
      cycles += bal.cycles.length;
      paidCycles += bal.cycles.filter((c) => c.paid).length;
    }
    const state: "paid" | "overdue" | "pending" | "none" =
      cycles === 0 ? "none" : due === 0 ? "paid" : paidCycles > 0 ? "pending" : "overdue";
    return { due, state, groups: mine.length };
  }

  /** The groups a student is enrolled in, as readable labels. */
  function groupsOf(student: Student) {
    return enrollments
      .filter((e) => e.studentId === student.id)
      .map((e) => {
        const c = classes.find((x) => x.id === e.classId);
        return c ? subjects.find((s) => s.id === c.subjectId)?.name ?? "—" : null;
      })
      .filter((x): x is string => !!x);
  }

  const rows = useMemo(
    () =>
      filtered.filter((s) => {
        if (groupFilter && !enrollments.some((e) => e.studentId === s.id && e.classId === groupFilter))
          return false;
        if (payFilter !== "all" && standing(s).state !== payFilter) return false;
        return true;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, groupFilter, payFilter, enrollments, payments, sessions, classes]
  );

  /** Tri demande par la barre de filtres. */
  const sorted = useMemo(() => {
    const out = [...rows];
    if (sort === "az") out.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "za") out.sort((a, b) => b.name.localeCompare(a.name));
    else if (sort === "recent") out.sort((a, b) => b.createdAt - a.createdAt);
    else out.sort((a, b) => standing(b).due - standing(a).due);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort, payments, sessions]);

  const pages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  // Un filtre qui reduit la liste ne doit pas laisser l'ecran sur une page vide.
  useEffect(() => { setPage(1); }, [search, levelFilter, payFilter, groupFilter, sort]);
  const shown = view === "grid" ? sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE) : sorted;
  const first = sorted.length === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const last = Math.min(page * PER_PAGE, sorted.length);

  /** Chiffres de l'en-tete, calcules sur les eleves visibles. */
  const stats = useMemo(() => {
    const states = filtered.map((st) => standing(st).state);
    const groupIds = new Set(
      enrollments.filter((e) => filtered.some((st) => st.id === e.studentId)).map((e) => e.classId)
    );
    const teacherIds = new Set(
      classes.filter((c) => groupIds.has(c.id)).map((c) => c.teacherId)
    );
    const active = filtered.filter((st) => st.status === "active").length;
    return {
      total: filtered.length,
      activePct: filtered.length ? Math.round((active / filtered.length) * 100) : 0,
      groups: groupIds.size,
      teachers: teacherIds.size,
      upToDate: states.filter((x) => x === "paid").length,
      toBill: states.filter((x) => x === "overdue" || x === "pending").length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, enrollments, classes, payments, sessions]);

  /** Six mois d'historique reel, pour les courbes des vignettes. */
  const series = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) =>
      new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    );
    const endOf = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();
    const billed = (month: string, paid: boolean) =>
      payments.filter((p) => p.month === month && (p.status === "paid") === paid).length;
    return {
      students: months.map((d) => students.filter((st) => st.createdAt <= endOf(d)).length),
      groups: months.map((d) => classes.filter((c) => c.createdAt <= endOf(d)).length),
      teachers: months.map((d) => classes.filter((c) => c.createdAt <= endOf(d)).length),
      paid: months.map((d) => billed(billingMonth(d), true)),
      due: months.map((d) => billed(billingMonth(d), false)),
    };
  }, [students, classes, payments]);

  /** Un filtre est-il actif ? Pilote le bouton de reinitialisation. */
  const anyFilter = !!search || !!levelFilter || payFilter !== "all" || !!groupFilter;
  function resetFilters() {
    setSearch("");
    setLevelFilter("");
    setPayFilter("all");
    setGroupFilter("");
  }

  function exportCsv() {
    const head = [t("stu.name"), t("stu.level"), t("stu.parent"), t("stu.status"), t("payments.totalDue")].join(";");
    const body = sorted
      .map((s) => [s.name, LEVEL_LABEL[s.level], s.parentName ?? "", s.status, standing(s).due].join(";"))
      .join("\n");
    const blob = new Blob([head + "\n" + body], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "eleves.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="stack">
      <header className="page-head dir-head">
        <div className="page-title">
          <h1>{t("stu.dir_title")}</h1>
          <p>{t("stu.dir_sub")}</p>
        </div>
        <DeskArt />
        <div className="row-actions">
          <button className="btn btn-ghost" onClick={exportCsv} disabled={sorted.length === 0}>
            <Download size={16} /> {t("hist.export")}
          </button>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus size={17} /> {t("stu.new")}
            </button>
          )}
        </div>
      </header>

      <div className="dir-kpis">
        <div className="card dir-kpi" style={tile(0)}>
          <span className="dir-kpi-icon"><Users size={19} /></span>
          <div className="dir-kpi-body">
            <span className="dir-kpi-value">{stats.total}</span>
            <span className="dir-kpi-label">{t("stu.k_enrolled")}</span>
            <span className="dir-kpi-foot">{t("stu.k_active", { pct: stats.activePct })}</span>
          </div>
          <Sparkline values={series.students} tone="#1e3f75" />
        </div>
        <div className="card dir-kpi" style={tile(1)}>
          <span className="dir-kpi-icon"><CalendarDays size={19} /></span>
          <div className="dir-kpi-body">
            <span className="dir-kpi-value">{stats.groups}</span>
            <span className="dir-kpi-label">{t("nav.sessions")}</span>
            <span className="dir-kpi-foot">{t("stu.k_followed")}</span>
          </div>
          <Sparkline values={series.groups} tone="#17638f" />
        </div>
        <div className="card dir-kpi" style={tile(2)}>
          <span className="dir-kpi-icon"><GraduationCap size={19} /></span>
          <div className="dir-kpi-body">
            <span className="dir-kpi-value">{stats.teachers}</span>
            <span className="dir-kpi-label">{t("nav.teachers")}</span>
            <span className="dir-kpi-foot">{t("stu.k_assigned")}</span>
          </div>
          <Sparkline values={series.teachers} tone="#12697a" />
        </div>
        <div className="card dir-kpi" style={tile(3)}>
          <span className="dir-kpi-icon"><Wallet size={19} /></span>
          <div className="dir-kpi-body">
            <span className="dir-kpi-value text-ok">{stats.upToDate}</span>
            <span className="dir-kpi-label">{t("stu.pay_paid")}</span>
            <span className="dir-kpi-foot">{t("nav.payments")}</span>
          </div>
          <Sparkline values={series.paid} tone="var(--success)" />
        </div>
        <div className="card dir-kpi" style={tile(4)}>
          <span className="dir-kpi-icon"><CreditCard size={19} /></span>
          <div className="dir-kpi-body">
            <span className={"dir-kpi-value " + (stats.toBill > 0 ? "text-danger" : "")}>
              {stats.toBill}
            </span>
            <span className="dir-kpi-label">{t("stu.k_to_bill")}</span>
            <span className="dir-kpi-foot">{t("nav.payments")}</span>
          </div>
          <Sparkline values={series.due} tone="var(--gold)" />
        </div>
      </div>

      <div className="card dir-filters">
        <label className="field dir-search">
          <span>{t("hist.search")}</span>
          <div className="att-search-box">
            <Search size={15} aria-hidden="true" />
            <input
              className="input"
              placeholder={t("hist.search_ph")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </label>
        <label className="field">
          <span>{t("stu.level")}</span>
          <select
            className="input"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as StudentLevel | "")}
          >
            <option value="">{t("stu.all_levels")}</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>{LEVEL_LABEL[l]}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t("nav.payments")}</span>
          <select
            className="input"
            value={payFilter}
            onChange={(e) => setPayFilter(e.target.value as PayFilter)}
          >
            <option value="all">{t("hist.filter_all")}</option>
            <option value="paid">{t("stu.pay_paid")}</option>
            <option value="pending">{t("stu.pay_pending")}</option>
            <option value="overdue">{t("stu.pay_overdue")}</option>
            <option value="none">{t("stu.pay_none")}</option>
          </select>
        </label>
        <label className="field">
          <span>{t("att.group")}</span>
          <select className="input" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
            <option value="">{t("hist.filter_all")}</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {subjects.find((s) => s.id === c.subjectId)?.name ?? "—"} · {t(`days.${c.dayOfWeek}`)} {c.timeSlot}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t("stu.sort_by")}</span>
          <select className="input" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="az">{t("stu.sort_az")}</option>
            <option value="za">{t("stu.sort_za")}</option>
            <option value="due">{t("stu.sort_due")}</option>
            <option value="recent">{t("stu.sort_recent")}</option>
          </select>
        </label>
        <div className="dir-count">
          <div className="dir-view">
            <button
              className={"dir-view-btn" + (view === "grid" ? " on" : "")}
              onClick={() => setView("grid")}
              aria-label={t("stu.view_grid")}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              className={"dir-view-btn" + (view === "list" ? " on" : "")}
              onClick={() => setView("list")}
              aria-label={t("stu.view_list")}
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="card dir-empty">
          <StudentEmptyArt />
          <strong>{t("stu.none")}</strong>
          <p>{t("stu.none_filtered")}</p>
          {anyFilter && (
            <button className="btn btn-ghost" onClick={resetFilters}>
              <RotateCcw size={16} /> {t("common.reset_filters")}
            </button>
          )}
        </div>
      ) : view === "grid" ? (
        <div className="dir-grid">
          {shown.map((s) => {
            const st = standing(s);
            const groups = groupsOf(s);
            return (
              <article key={s.id} className="card dir-card" onClick={() => setDetail(s)}>
                <div className="dir-card-head">
                  <span className="att-initials lg" aria-hidden="true">{initials(s.name)}</span>
                  <div className="att-name-col">
                    <strong>{s.name}</strong>
                    <span className="muted small">{s.phone || "—"}</span>
                  </div>
                  <span className={"dir-grade" + (s.status !== "active" ? " off" : "")}>
                    {s.status === "active" ? LEVEL_LABEL[s.level] : t(`status.${s.status}`)}
                  </span>
                </div>

                <div className="dir-card-block">
                  <span className="dir-label">{t("stu.enrolled_groups")}</span>
                  <span className="dir-groups">
                    {groups.length ? groups.join(" · ") : <em className="muted">{t("stu.no_group")}</em>}
                  </span>
                </div>

                <div className="dir-card-block">
                  <span className="dir-label">{t("stu.term_payment")}</span>
                  <span className={"dir-pay " + st.state}>
                    {st.state === "paid" && <><CircleCheck size={12} /> {t("stu.pay_paid")}</>}
                    {st.state === "overdue" && <><TriangleAlert size={12} /> {t("stu.pay_overdue_n", { amount: formatDA(st.due) })}</>}
                    {st.state === "pending" && <><Clock size={12} /> {t("stu.pay_pending_n", { amount: formatDA(st.due) })}</>}
                    {st.state === "none" && <>{t("stu.pay_none")}</>}
                  </span>
                </div>

                {isAdmin && (
                  <div className="dir-card-actions">
                    <button
                      className="icon-btn"
                      title={t("common.edit")}
                      onClick={(e) => { e.stopPropagation(); setEditing(s); setShowForm(true); }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="icon-btn"
                      title={t("common.delete")}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(t("stu.confirm_delete", { name: s.name }))) deleteStudent(s.id);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <StackedTable wrapClassName="card">
            <thead>
              <tr>
                <th>{t("stu.name")}</th>
                <th>{t("stu.level")}</th>
                <th>{t("stu.enrolled_groups")}</th>
                <th>{t("stu.term_payment")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => {
                const st = standing(s);
                return (
                  <tr key={s.id} onClick={() => setDetail(s)} className="dir-row">
                    <td>
                      <div className="cell-id">
                        <span className="cell-avatar">{initials(s.name)}</span>
                        <div>
                          <strong>{s.name}</strong>
                          <a className="muted small cell-phone" href={`tel:${s.phone}`}>
                            <Phone size={12} /> {s.phone || "—"}
                          </a>
                        </div>
                      </div>
                    </td>
                    <td>{LEVEL_LABEL[s.level]}</td>
                    <td className="muted">{groupsOf(s).join(" · ") || "—"}</td>
                    <td>
                      <span className={"dir-pay " + st.state}>
                        {st.state === "paid"
                          ? t("stu.pay_paid")
                          : st.state === "none"
                          ? t("stu.pay_none")
                          : formatDA(st.due)}
                      </span>
                    </td>
                    <td className="row-actions">
                      {isAdmin && (
                        <>
                          <button
                            className="icon-btn"
                            onClick={(e) => { e.stopPropagation(); setEditing(s); setShowForm(true); }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="icon-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(t("stu.confirm_delete", { name: s.name }))) deleteStudent(s.id);
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
        </StackedTable>
      )}

      {sorted.length > 0 && (
        <div className="dir-foot">
          <span className="muted small">
            {t("stu.showing", { from: first, to: last, total: sorted.length })}
          </span>
          {view === "grid" && pages > 1 && (
            <div className="dir-pager">
              <button
                className="dir-page-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label={t("stu.prev_page")}
              >
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  className={"dir-page-btn" + (n === page ? " on" : "")}
                  onClick={() => setPage(n)}
                  aria-current={n === page ? "page" : undefined}
                >
                  {n}
                </button>
              ))}
              <button
                className="dir-page-btn"
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                aria-label={t("stu.next_page")}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <StudentForm
          initial={editing ?? undefined}
          onSave={onSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
      {detail && <StudentDetail student={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}


function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

/** Cartable et pile de livres de l'en-tete. Trace en SVG plutot qu'en emoji :
 *  rendu identique partout, et la palette suit celle de l'application. */
function DeskArt() {
  return (
    <svg className="dir-art" viewBox="0 0 132 96" fill="none" aria-hidden="true">
      {/* pile de livres */}
      <rect x="8" y="58" width="48" height="9" rx="2.5" fill="var(--navy-700)" opacity="0.32" />
      <rect x="4" y="67" width="56" height="9" rx="2.5" fill="var(--gold)" opacity="0.8" />
      <rect x="10" y="76" width="44" height="9" rx="2.5" fill="var(--navy-700)" opacity="0.2" />

      {/* bretelles, derriere le corps */}
      <rect x="74" y="42" width="7" height="44" rx="3.5" fill="var(--navy-800)" opacity="0.55" />
      <rect x="105" y="42" width="7" height="44" rx="3.5" fill="var(--navy-800)" opacity="0.55" />

      {/* poignee */}
      <path d="M87 44v-5a6 6 0 0112 0v5" stroke="var(--navy-700)" strokeWidth="3.5" strokeLinecap="round" />

      {/* corps du cartable */}
      <rect x="70" y="44" width="46" height="44" rx="12" fill="var(--primary)" />
      {/* rabat */}
      <path d="M70 62v-6a12 12 0 0112-12h22a12 12 0 0112 12v6z" fill="var(--navy-800)" opacity="0.4" />
      <rect x="88" y="57" width="10" height="7" rx="2" fill="var(--gold)" />
      {/* poche avant */}
      <rect x="82" y="69" width="22" height="15" rx="4.5" fill="#fff" opacity="0.93" />
      <path d="M88 76.5h10" stroke="var(--primary)" strokeWidth="2.6" strokeLinecap="round" />

      {/* etincelles */}
      <path d="M46 20v9M41.5 24.5h9" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="124" cy="28" r="3.5" fill="var(--gold)" />
      <circle cx="24" cy="44" r="2.5" fill="var(--primary)" opacity="0.4" />
    </svg>
  );
}

/** Illustration de l'etat vide : toque, livres et plante. */
function StudentEmptyArt() {
  return (
    <svg className="dir-empty-art" viewBox="0 0 200 130" fill="none" aria-hidden="true">
      <circle cx="108" cy="62" r="52" fill="var(--primary-soft)" />
      <path
        d="M6 108c14 6 26 2 30-8 3-8-6-14-12-9-7 6 1 18 14 21 12 3 24-3 30-12"
        stroke="var(--primary)" strokeWidth="2" strokeDasharray="4 5" strokeLinecap="round" opacity="0.45"
      />
      <path d="M72 74l24-10-9 22-4-9z" fill="var(--sky-500)" />
      <rect x="78" y="82" width="52" height="9" rx="2.5" fill="var(--gold-400)" />
      <rect x="82" y="73" width="44" height="9" rx="2.5" fill="var(--sky-500)" />
      <rect x="86" y="64" width="36" height="9" rx="2.5" fill="var(--navy-600)" />
      <path d="M104 46l-22-9 22-9 22 9z" fill="var(--navy-800)" />
      <path d="M92 42v8c0 4 5 6 12 6s12-2 12-6v-8" fill="var(--navy-700)" />
      <path d="M126 37v11" stroke="var(--gold-400)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M148 78c-1-9-6-14-14-15 1 9 6 14 14 15z" fill="var(--success)" opacity="0.55" />
      <path d="M148 78c1-10 7-16 16-17-1 11-7 17-16 17z" fill="var(--success)" opacity="0.75" />
      <path d="M139 84h20l-3 14a3 3 0 01-3 2h-8a3 3 0 01-3-2z" fill="var(--gold-400)" />
      <circle cx="150" cy="26" r="3" fill="var(--gold-300)" />
      <circle cx="64" cy="34" r="2.5" fill="var(--sky-500)" />
    </svg>
  );
}
