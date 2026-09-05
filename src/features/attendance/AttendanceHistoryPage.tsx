import { useEffect, Fragment, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import {
  CalendarDays, Download, CircleCheck, CircleX, Clock, Search, X, ChevronRight,
  Wallet, TriangleAlert, BellRing, Check, History, Banknote, Hourglass, CircleDollarSign,
  ChevronLeft,
} from "lucide-react";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { formatDate, formatDA, billingMonth } from "../../lib/format";
import { teacherFinance } from "../../lib/billing";
import { cycleBalance, type Cycle } from "../../lib/cycles";
import { isBillable } from "../../lib/payments";
import { roomsOrDefault } from "../../lib/rooms";
import type { AttendanceState, Session } from "../../lib/types";
import "./attendance.css";

/** Attendance marks, as the centre writes them on paper. */
const MARK: Record<AttendanceState, string> = {
  present: "P",
  absent_free: "A",
  absent_paid: "AP",
};
const MARK_CLASS: Record<AttendanceState, string> = {
  present: "ok",
  absent_free: "no",
  absent_paid: "warn",
};

/**
 * Payment state of one session for one student. Billing is still every 4
 * countable sessions — this column simply shows where each session sits inside
 * the cycle it belongs to, so nothing about the rule changes.
 */
type PayState = "paid" | "unpaid" | "not_billed" | "na";

const longDay = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};
const initials = (n: string) =>
  n.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

type Tab = "overview" | "register" | "students" | "teacher";
type StatusFilter = "all" | "due" | "clear";
type SortBy = "name" | "debt" | "progress";

export default function AttendanceHistoryPage() {
  const { t } = useTranslation();
  const { role, profile } = useAuth();
  const {
    classes, subjects, students, teachers, enrollments, sessions, payments,
    teacherPayouts, rooms: dbRooms,
  } = useData();
  const markPaid = useData((st) => st.markPaid);
  const markUnpaid = useData((st) => st.markUnpaid);
  const saveAttendance = useData((st) => st.saveAttendance);
  const payTeacher = useData((st) => st.payTeacher);

  const myClasses = useMemo(
    () =>
      role === "teacher" && profile?.teacherId
        ? classes.filter((c) => c.teacherId === profile.teacherId)
        : classes,
    [classes, role, profile]
  );

  const [params] = useSearchParams();
  const wanted = params.get("class");
  const [classId, setClassId] = useState(
    (wanted && myClasses.some((c) => c.id === wanted) ? wanted : myClasses[0]?.id) ?? ""
  );
  // In Supabase mode the store is still empty on the first render, so a classId
  // initialised from myClasses[0] stays "" forever and the page looks empty even
  // though groups exist. Adopt the first group as soon as the data arrives, and
  // re-adopt if the selected group disappears.
  useEffect(() => {
    if (myClasses.length === 0) return;
    if (myClasses.some((c) => c.id === classId)) return;
    setClassId(myClasses[0].id);
  }, [myClasses, classId]);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tab, setTab] = useState<Tab>("register");
  const [page, setPage] = useState(1);
  const [pickedId, setPickedId] = useState("");
  const [flash, setFlash] = useState("");
  // Teachers are often paid in instalments, so the amount stays editable.
  const [payAmount, setPayAmount] = useState("");
  // Who to list on the student-payments tab: everyone, or only those who owe.
  // Student-payments tab: find, narrow and order the roster.
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("name");

  const klass = classes.find((c) => c.id === classId);
  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "?";
  const cyclePrice = klass?.pricePerSession ?? 0;
  const room = roomsOrDefault(dbRooms).find((r) => r.id === klass?.roomId);
  const teacher = teachers.find((x) => x.id === klass?.teacherId);

  const groupSessions = useMemo(
    () => sessions.filter((s) => s.classId === classId),
    [sessions, classId]
  );

  const roster = useMemo(
    () =>
      enrollments
        .filter((e) => e.classId === classId)
        .map((e) => students.find((s) => s.id === e.studentId))
        .filter((s): s is NonNullable<typeof s> => !!s),
    [enrollments, students, classId]
  );

  const cols: Session[] = useMemo(() => {
    const min = from ? new Date(from).getTime() : -Infinity;
    const max = to ? new Date(to).getTime() + 86_400_000 : Infinity;
    return groupSessions
      .filter((s) => s.date >= min && s.date <= max)
      .sort((a, b) => a.date - b.date);
  }, [groupSessions, from, to]);

  function balanceOf(studentId: string) {
    const enrIds = enrollments
      .filter((e) => e.studentId === studentId && e.classId === classId)
      .map((e) => e.id);
    const mine = payments.filter((p) => enrIds.includes(p.enrollmentId));
    return { bal: cycleBalance(groupSessions, studentId, cyclePrice, mine), mine };
  }

  /**
   * One row per student: mark + payment state for every column, plus the
   * running "x / y" counters shown on the Résumé étudiant line beneath.
   */
  const matrix = useMemo(() => {
    return roster.map((student) => {
      const { bal } = balanceOf(student.id);
      const cycleOf = new Map<string, Cycle>();
      for (const c of bal.cycles) for (const s of c.sessions) cycleOf.set(s.sessionId, c);

      let presCum = 0, sessCum = 0, paidCum = 0, billCum = 0;
      const cells = cols.map((col) => {
        const st = col.attendance[student.id];
        let pay: PayState = "na";
        if (st) {
          sessCum++;
          if (st === "present") presCum++;
          if (isBillable(st)) {
            billCum++;
            // Payable from the cycle's first session, so an unsettled cycle
            // reads "Non payé" straight away — there is no waiting state.
            const cy = cycleOf.get(col.id);
            if (cy?.paid) {
              pay = "paid";
              paidCum++;
            } else {
              pay = "unpaid";
            }
          } else {
            pay = "not_billed";
          }
        }
        return { st, pay, presCum, sessCum, paidCum, billCum };
      });
      return { student, bal, cells };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster, cols, payments, groupSessions, cyclePrice]);

  /** Column footer: presence and payment rate for each session. */
  const colTotals = useMemo(
    () =>
      cols.map((_, i) => {
        let present = 0, marked = 0, paid = 0, billable = 0;
        for (const row of matrix) {
          const c = row.cells[i];
          if (!c.st) continue;
          marked++;
          if (c.st === "present") present++;
          if (c.pay !== "not_billed" && c.pay !== "na") {
            billable++;
            if (c.pay === "paid") paid++;
          }
        }
        return { present, marked, paid, billable };
      }),
    [cols, matrix]
  );

  const teacherFin = teacher
    ? teacherFinance(teacher.id, enrollments, payments, teacherPayouts)
    : null;
  const myPayouts = useMemo(
    () => teacherPayouts.filter((p) => p.teacherId === teacher?.id).sort((a, b) => b.paidAt - a.paidAt),
    [teacherPayouts, teacher]
  );

  /** Group money, entirely from the cycles. */
  /** Le registre se pagine : une classe de vingt eleves donnait une grille
   *  interminable, alors que les totaux, eux, restent calcules sur tout le
   *  groupe (matrix) et non sur la page visible. */
  const PER_PAGE = 8;
  const pages = Math.max(1, Math.ceil(matrix.length / PER_PAGE));
  const pageRows = matrix.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const firstRow = matrix.length === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const lastRow = Math.min(page * PER_PAGE, matrix.length);
  useEffect(() => { setPage(1); }, [classId, from, to]);

  const money = useMemo(() => {
    let paid = 0, due = 0;
    for (const row of matrix) {
      due += row.bal.totalDue;
      paid += row.bal.cycles.filter((c) => c.paid).reduce((s, c) => s + c.amount, 0);
    }
    const total = paid + due;
    return { paid, due, total, rate: total ? Math.round((paid / total) * 100) : 0 };
  }, [matrix]);

  /** Levels actually present in this group, so the filter never offers an
   *  option that would return nothing. */
  const levelsPresent = useMemo(() => [...new Set(roster.map((s) => s.level))].sort(), [roster]);

  /** Search + level + payment status + ordering, applied to the roster. */
  const visibleStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = matrix.filter((r) => {
      if (q && !r.student.name.toLowerCase().includes(q) && !(r.student.phone ?? "").includes(q))
        return false;
      if (levelFilter && r.student.level !== levelFilter) return false;
      if (statusFilter === "due" && r.bal.totalDue <= 0) return false;
      if (statusFilter === "clear" && r.bal.totalDue > 0) return false;
      return true;
    });
    const sorted = [...out];
    if (sortBy === "debt") sorted.sort((a, b) => b.bal.totalDue - a.bal.totalDue);
    else if (sortBy === "progress") sorted.sort((a, b) => b.bal.progress - a.bal.progress);
    else sorted.sort((a, b) => a.student.name.localeCompare(b.student.name));
    return sorted;
  }, [matrix, search, levelFilter, statusFilter, sortBy]);

  const picked = roster.find((s) => s.id === pickedId) ?? roster[0];

  function collect(studentId: string, name: string, howMany?: number) {
    const { bal, mine } = balanceOf(studentId);
    const target = bal.unpaidCycles.slice(0, howMany ?? bal.unpaidCycles.length);
    if (target.length === 0) return;
    const total = target.reduce((sum, c) => sum + c.amount, 0);
    if (!confirm(t("hist.confirm_collect", { name, amount: formatDA(total), n: target.length }))) return;
    const ids = new Set(target.flatMap((c) => c.sessions.map((x) => x.sessionId)));
    mine.filter((p) => ids.has(p.sessionId) && p.status === "unpaid").forEach((p) => markPaid(p.id));
    setFlash(t("hist.collected", { name, amount: formatDA(total) }));
  }

  /**
   * Tick / untick one cycle by hand. This is the manual control: the admin
   * decides, and unticking reverses a mistake instead of leaving it stuck paid.
   */
  function toggleCycle(studentId: string, cycle: Cycle) {
    const { mine } = balanceOf(studentId);
    const ids = new Set(cycle.sessions.map((x) => x.sessionId));
    const rows = mine.filter((p) => ids.has(p.sessionId));
    if (rows.length === 0) return;
    if (cycle.paid) rows.forEach((p) => markUnpaid(p.id));
    else rows.forEach((p) => markPaid(p.id));
  }

  /**
   * Change a mark straight from the register. Cycles Présent → Absent (non payé)
   * → Absent (payé) → Présent, and writes the session back so the cycles and the
   * money re-derive immediately. A charge already PAID is never touched.
   */
  function cycleMark(session: Session, studentId: string) {
    if (!klass) return;
    const order: AttendanceState[] = ["present", "absent_free", "absent_paid"];
    const cur = session.attendance[studentId];
    const next = cur === undefined ? "present" : order[(order.indexOf(cur) + 1) % order.length];
    saveAttendance(
      klass.id,
      klass.teacherId,
      session.date,
      { ...session.attendance, [studentId]: next },
      session.notes,
      session.id
    );
  }

  function payTheTeacher() {
    if (!teacher || !teacherFin || teacherFin.remaining <= 0) return;
    const asked = payAmount.trim() === "" ? teacherFin.remaining : Number(payAmount);
    if (!Number.isFinite(asked) || asked <= 0) return;
    const amount = Math.min(asked, teacherFin.remaining);
    if (!confirm(t("hist.confirm_pay_teacher", { name: teacher.name, amount: formatDA(amount) }))) return;
    payTeacher(teacher.id, amount, billingMonth());
    setPayAmount("");
    setFlash(t("hist.teacher_paid_flash", { name: teacher.name, amount: formatDA(amount) }));
  }

  function exportCsv() {
    const head = [
      t("att.col_name"), t("stu.level"), t("att.col_phone"),
      ...cols.flatMap((c) => [longDay(c.date), t("hist.payment_short")]),
      t("hist.balance"),
    ].join(";");
    const body = matrix
      .map((row) =>
        [
          row.student.name,
          row.student.level.toUpperCase(),
          row.student.phone ?? "",
          ...row.cells.flatMap((c) => [c.st ? MARK[c.st] : "-", c.pay === "na" ? "-" : c.pay]),
          row.bal.totalDue,
        ].join(";")
      )
      .join("\n");
    const blob = new Blob([head + "\n" + body], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "historique-seances.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const PAY_ICON: Record<PayState, React.ReactNode> = {
    paid: <CircleCheck size={14} />,
    unpaid: <CircleX size={14} />,
    not_billed: <Clock size={14} />,
    na: null,
  };

  /** What the desk should act on today. */
  const alerts = useMemo(() => {
    const list: { kind: string; text: string }[] = [];
    for (const row of matrix)
      if (row.bal.totalDue > 0) {
        // How many sessions the debt actually covers — more useful at the desk
        // than "which month", since the family pays per block of sessions.
        const n = row.bal.unpaidCycles.reduce((sum, c) => sum + c.sessions.length, 0);
        list.push({
          kind: "due",
          text: t("hist.alert_owes", {
            name: row.student.name,
            n,
            cycles: row.bal.unpaidCycles.length,
            amount: formatDA(row.bal.totalDue),
          }),
        });
      }
    if (teacherFin && teacherFin.remaining > 0)
      list.push({
        kind: "teacher",
        text: t("hist.alert_teacher", { amount: formatDA(teacherFin.remaining) }),
      });
    return list;
  }, [matrix, teacherFin, t]);

  const empty = !klass || cols.length === 0 || roster.length === 0;

  return (
    <div className="stack">
      <header className="page-head hist-head">
        <span className="hist-head-icon" aria-hidden="true"><History size={24} /></span>
        <div className="page-title">
          <h1>{t("hist.title")}</h1>
          <p>{t("hist.subtitle")}</p>
        </div>
        <div className="row-actions">
          <div className="att-range">
            <span className="hist-date">
              <CalendarDays size={15} aria-hidden="true" />
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </span>
            <span className="hist-arrow" aria-hidden="true">→</span>
            <span className="hist-date">
              <CalendarDays size={15} aria-hidden="true" />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </span>
          </div>
          <button className="btn btn-primary" onClick={exportCsv} disabled={empty}>
            <Download size={16} /> {t("hist.export")}
          </button>
        </div>
      </header>

      {flash && <p className="att-flash">{flash}</p>}

      {/* Which group we are looking at, and its headline numbers. */}
      <div className="card att-group-head">
        <span className="att-group-avatar" aria-hidden="true">
          {initials(klass ? subjName(klass.subjectId) : "?")}
        </span>
        <div className="att-group-id">
          <select className="att-group-select" value={classId} onChange={(e) => setClassId(e.target.value)}>
            {myClasses.map((c) => (
              <option key={c.id} value={c.id}>{subjName(c.subjectId)}</option>
            ))}
          </select>
          <span className="muted small">
            {klass ? `${t(`days.${klass.dayOfWeek}`)} ${klass.timeSlot}` : "—"}
          </span>
          <span className="muted small">{room?.name ?? "—"}</span>
        </div>

        <div className="att-group-teacher">
          <span className="muted small">{t("hist.teacher_word")}</span>
          <div className="att-teacher-id">
            <span className="att-initials" aria-hidden="true">{initials(teacher?.name ?? "?")}</span>
            <div className="att-name-col">
              <strong>{teacher?.name ?? "—"}</strong>
              <span className="muted small">{teacher?.phone ?? "—"}</span>
            </div>
          </div>
        </div>

        {/* L'argent est desormais porte par le bandeau de vignettes juste
            dessous : le repeter ici donnait deux fois les memes chiffres. */}
        <div className="att-group-stats">
          <div>
            <b>{roster.length}<i> / {klass?.maxStudents ?? "—"}</i></b>
            <span>{t("hist.enrolled")}</span>
          </div>
          <div><b>{groupSessions.length}</b><span>{t("hist.sessions_held")}</span></div>
        </div>
      </div>

      {/* Cinq indicateurs : les trois premiers portent sur les eleves du groupe
          affiche, les deux derniers sur l'enseignant qui l'anime. */}
      <div className="hist-kpis">
        <div className="card hist-kpi" style={hTile(0)}>
          <span className="hist-kpi-icon"><Wallet size={19} /></span>
          <div className="hist-kpi-body">
            <span className="hist-kpi-label">{t("hist.k_billed")}</span>
            <strong>{formatDA(money.total)}</strong>
            <span className="muted small">{t("hist.k_billed_sub")}</span>
          </div>
        </div>
        <div className="card hist-kpi" style={hTile(1)}>
          <span className="hist-kpi-icon"><CircleCheck size={19} /></span>
          <div className="hist-kpi-body">
            <span className="hist-kpi-label">{t("hist.already_paid")}</span>
            <strong className="text-ok">{formatDA(money.paid)}</strong>
            <span className="muted small">{t("hist.k_rate", { pct: money.rate })}</span>
          </div>
        </div>
        <div className="card hist-kpi" style={hTile(2)}>
          <span className="hist-kpi-icon"><Hourglass size={19} /></span>
          <div className="hist-kpi-body">
            <span className="hist-kpi-label">{t("payments.unpaid")}</span>
            <strong className={money.due > 0 ? "text-danger" : ""}>{formatDA(money.due)}</strong>
            <span className="muted small">
              {money.due > 0 && <TriangleAlert size={12} />} {t("hist.k_due_sub")}
            </span>
          </div>
        </div>
        <div className="card hist-kpi" style={hTile(3)}>
          <span className="hist-kpi-icon"><Banknote size={19} /></span>
          <div className="hist-kpi-body">
            <span className="hist-kpi-label">{t("pay.k_ready")}</span>
            <strong>{formatDA(teacherFin?.remaining ?? 0)}</strong>
            <span className="muted small">{t("hist.k_teacher_sub")}</span>
          </div>
        </div>
        <div className="card hist-kpi" style={hTile(4)}>
          <span className="hist-kpi-icon"><CircleDollarSign size={19} /></span>
          <div className="hist-kpi-body">
            <span className="hist-kpi-label">{t("pay.k_paid")}</span>
            <strong>{formatDA(teacherFin?.paidOut ?? 0)}</strong>
            <span className="muted small">{t("hist.k_teacher_sub")}</span>
          </div>
        </div>
      </div>

      <nav className="tabs" role="tablist">
        {(
          [
            ["overview", t("hist.tab_overview")],
            ["register", t("hist.tab_register")],
            ["students", t("hist.tab_student_pay")],
            ["teacher", t("hist.tab_teacher_pay")],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={"tab" + (tab === key ? " on" : "")}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      {empty ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon"><CalendarDays size={24} /></span>
            <strong>{t("att.no_session")}</strong>
            <p>{t("att.no_session_hint")}</p>
          </div>
        </div>
      ) : (
        <>
          {/* ------------------------------------------------ register */}
          {tab === "register" && (
            <div className="card stack">
              <div className="att-legend">
                <span className="att-legend-title">{t("att.legend")}</span>
                <span><b className="att-key ok">P</b> {t("attendance.present")}</span>
                <span><b className="att-key no">A</b> {t("attendance.absent_free")}</span>
                <span><b className="att-key warn">AP</b> {t("attendance.absent_paid")}</span>
                <span><b className="att-key na">—</b> {t("att.not_applicable")}</span>
                <span className="pay-ok"><CircleCheck size={14} /> {t("payments.paid")}</span>
                <span className="pay-no"><CircleX size={14} /> {t("payments.unpaid")}</span>
                <span className="pay-nb"><Clock size={14} /> {t("hist.not_billed")}</span>
              </div>

              <div className="table-wrap att-grid-wrap">
                <table className="table att-grid att-grid2">
                  <thead>
                    <tr>
                      <th className="att-sticky" rowSpan={2}>#</th>
                      <th className="att-sticky att-sticky-2" rowSpan={2}>{t("hist.students_col")}</th>
                      <th rowSpan={2}>{t("stu.level")}</th>
                      <th rowSpan={2}>{t("att.col_phone")}</th>
                      {cols.map((c, i) => (
                        <th key={c.id} colSpan={2} className="att-col att-col-group">
                          <b>{longDay(c.date)}</b>
                          <em>
                            {c.isExtra ? t("att.extra_short") : t("att.session_n", { n: c.sessionNumber ?? i + 1 })}
                          </em>
                        </th>
                      ))}
                    </tr>
                    <tr>
                      {cols.map((c) => (
                        <Fragment key={c.id}>
                          <th className="att-sub">{t("hist.presence_short")}</th>
                          <th className="att-sub">{t("hist.payment_short")}</th>
                        </Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((row, i) => (
                      <Fragment key={row.student.id}>
                        <tr
                          className={row.student.id === picked?.id ? "on" : ""}
                          onClick={() => setPickedId(row.student.id)}
                        >
                          <td className="att-sticky muted">{(page - 1) * PER_PAGE + i + 1}</td>
                          <td className="att-sticky att-sticky-2">
                            <span className="att-initials" aria-hidden="true">{initials(row.student.name)}</span>
                            <span className="att-name-col"><strong>{row.student.name}</strong></span>
                          </td>
                          <td>{row.student.level.toUpperCase()}</td>
                          <td className="muted num">{row.student.phone || "—"}</td>
                          {row.cells.map((c, i) => (
                            <Fragment key={cols[i].id}>
                              <td className="att-cell">
                                <button
                                  className={"att-key att-key-btn " + (c.st ? MARK_CLASS[c.st] : "na")}
                                  title={t("hist.change_mark")}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cycleMark(cols[i], row.student.id);
                                  }}
                                >
                                  {c.st ? MARK[c.st] : "–"}
                                </button>
                              </td>
                              <td className="att-cell">
                                {c.pay === "na" ? (
                                  <span className="muted">–</span>
                                ) : (
                                  <span className={"att-pay-cell " + c.pay}>
                                    {PAY_ICON[c.pay]}
                                    <em>{t(`hist.pay_${c.pay}`)}</em>
                                  </span>
                                )}
                              </td>
                            </Fragment>
                          ))}
                        </tr>
                        <tr className="att-substat">
                          <td className="att-sticky" />
                          <td className="att-sticky att-sticky-2 muted small" colSpan={3}>
                            {t("hist.student_running")}
                          </td>
                          {row.cells.map((c, i) => (
                            <Fragment key={cols[i].id}>
                              <td className="att-cell small">
                                {c.sessCum ? `${c.presCum} / ${c.sessCum}` : "–"}
                              </td>
                              <td
                                className={
                                  "att-cell small " +
                                  (c.billCum && c.paidCum < c.billCum ? "text-danger" : "")
                                }
                              >
                                {c.billCum ? `${c.paidCum} / ${c.billCum}` : "–"}
                              </td>
                            </Fragment>
                          ))}
                        </tr>
                      </Fragment>
                    ))}

                    <tr className="att-teacher-row">
                      <td className="att-sticky" />
                      <td className="att-sticky att-sticky-2" colSpan={3}>
                        <strong>{t("hist.session_totals")}</strong>
                      </td>
                      {colTotals.map((ct, i) => (
                        <Fragment key={cols[i].id}>
                          <td className="att-cell small">
                            {ct.marked ? `${ct.present} / ${ct.marked}` : "–"}
                          </td>
                          <td className="att-cell small">
                            {ct.billable ? (
                              <>
                                {ct.paid} / {ct.billable}
                                <em className={ct.paid === ct.billable ? "text-ok" : "text-danger"}>
                                  {Math.round((ct.paid / ct.billable) * 100)}%
                                </em>
                              </>
                            ) : (
                              "–"
                            )}
                          </td>
                        </Fragment>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="hist-foot">
                <span className="muted small">
                  <CalendarDays size={14} aria-hidden="true" />{" "}
                  {t("hist.showing", { from: firstRow, to: lastRow, total: matrix.length })}
                </span>
                {pages > 1 && (
                  <div className="dir-pager">
                    <button
                      className="dir-page-btn"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      aria-label={t("stu.prev_page")}
                    >
                      <ChevronLeft size={15} />
                    </button>
                    {Array.from({ length: pages }, (_, n) => n + 1).map((n) => (
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

              <p className="muted small">{t("hist.pct_note")}</p>
            </div>
          )}

          {/* ------------------------------------------------ overview */}
          {tab === "overview" && (
            <div className="att-three">
              <div className="card att-period">
                <strong>{t("hist.group_finance")}</strong>
                <div className="att-period-grid">
                  <div className="tot"><b>{formatDA(money.total)}</b><span>{t("hist.grand_total")}</span></div>
                  <div className="ok"><b>{formatDA(money.paid)}</b><span>{t("hist.already_paid")}</span></div>
                  <div className="due"><b>{formatDA(money.due)}</b><span>{t("hist.left_to_pay")}</span></div>
                  <div><b>{money.rate}%</b><span>{t("hist.pay_rate")}</span></div>
                </div>
              </div>

              <div className="card att-period">
                <strong>{t("hist.teacher_payments")}</strong>
                {teacher && teacherFin && (
                  <>
                    <div className="att-teacher-id">
                      <span className="att-initials" aria-hidden="true">{initials(teacher.name)}</span>
                      <div className="att-name-col"><strong>{teacher.name}</strong></div>
                    </div>
                    <div className="att-period-grid">
                      <div><b>{formatDA(teacherFin.earned)}</b><span>{t("hist.earned")}</span></div>
                      <div className="ok">
                        <b>{formatDA(teacherFin.paidOut)}</b><span>{t("hist.already_paid")}</span>
                      </div>
                      <div className="due">
                        <b>{formatDA(teacherFin.remaining)}</b><span>{t("hist.left_to_pay")}</span>
                      </div>
                      <div><b>{groupSessions.length}</b><span>{t("hist.sessions_held")}</span></div>
                    </div>
                    <button className="btn btn-ghost sm" onClick={() => setTab("teacher")}>
                      {t("hist.see_details")}
                    </button>
                  </>
                )}
              </div>

              <div className="card att-period">
                <strong><BellRing size={15} /> {t("hist.alerts")}</strong>
                {alerts.length === 0 ? (
                  <p className="att-note ok"><CircleCheck size={14} /> {t("hist.no_alerts")}</p>
                ) : (
                  <ul className="att-alerts">
                    {alerts.map((a, i) => (
                      <li key={i} className={a.kind}>
                        {a.kind === "due" ? <TriangleAlert size={14} /> : <Wallet size={14} />}
                        <span>{a.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* ------------------------------------------------ student payments */}
          {tab === "students" && (
            <div className="stack">
              {/* Find one student fast, or narrow the whole list. */}
              <div className="card att-filters">
                <label className="field att-search">
                  <span>{t("hist.search")}</span>
                  <div className="att-search-box">
                    <Search size={15} aria-hidden="true" />
                    <input
                      className="input"
                      value={search}
                      placeholder={t("hist.search_ph")}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                      <button
                        className="att-search-clear"
                        onClick={() => setSearch("")}
                        aria-label={t("hist.clear_search")}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </label>
                <label className="field">
                  <span>{t("stu.level")}</span>
                  <select className="input" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
                    <option value="">{t("hist.filter_all")}</option>
                    {levelsPresent.map((l) => (
                      <option key={l} value={l}>{l.toUpperCase()}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>{t("hist.pay_status")}</span>
                  <select
                    className="input"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  >
                    <option value="all">{t("hist.filter_all")}</option>
                    <option value="due">{t("hist.filter_due")}</option>
                    <option value="clear">{t("hist.filter_clear")}</option>
                  </select>
                </label>
                <label className="field">
                  <span>{t("hist.sort_by")}</span>
                  <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
                    <option value="name">{t("hist.sort_name")}</option>
                    <option value="debt">{t("hist.sort_debt")}</option>
                    <option value="progress">{t("hist.sort_progress")}</option>
                  </select>
                </label>
                <div className="att-filter-count">
                  <strong>{visibleStudents.length}</strong>
                  <span className="muted small">
                    {t("hist.owing_count", {
                      n: matrix.filter((r) => r.bal.totalDue > 0).length,
                      total: matrix.length,
                      amount: formatDA(money.due),
                    })}
                  </span>
                </div>
              </div>

              {visibleStudents.length === 0 ? (
                <div className="card">
                  <div className="empty-state">
                    <span className="empty-state-icon"><CircleCheck size={24} /></span>
                    <strong>
                      {search || levelFilter || statusFilter !== "all"
                        ? t("hist.no_match")
                        : t("hist.everyone_paid")}
                    </strong>
                  </div>
                </div>
              ) : (
                /* One scroll area, so a long roster never pushes the filters away. */
                <div className="att-scroll">
                  {visibleStudents.map((row) => (
                    <details
                      key={row.student.id}
                      className="card att-studentpay"
                      open={visibleStudents.length <= 3}
                    >
                      <summary className="att-student-sum">
                        <ChevronRight size={16} className="att-caret" aria-hidden="true" />
                        <span className="att-initials" aria-hidden="true">{initials(row.student.name)}</span>
                        <span className="att-name-col">
                          <strong>{row.student.name}</strong>
                          <span className="muted small">
                            {row.student.level.toUpperCase()} ·{" "}
                            {t("hist.cycle_progress", { done: row.bal.progress })}
                            {row.student.phone ? ` · ${row.student.phone}` : ""}
                          </span>
                        </span>
                        <span className="att-cycle-count muted small">
                          {t("hist.cycles_count", { n: row.bal.cycles.length })}
                        </span>
                        <span className={"att-badge " + (row.bal.totalDue > 0 ? "due" : "ok")}>
                          {row.bal.totalDue > 0 ? formatDA(row.bal.totalDue) : t("hist.badge_clear")}
                        </span>
                      </summary>

                      <div className="att-student-body">
                        {row.bal.unpaidCycles.length > 0 && (
                          <div className="att-student-actions">
                            <p className="att-unpaid-line">
                              <TriangleAlert size={14} />
                              {t("hist.unpaid_detail", {
                                n: row.bal.unpaidCycles.reduce((sum, c) => sum + c.sessions.length, 0),
                                cycles: row.bal.unpaidCycles.length,
                                amount: formatDA(row.bal.totalDue),
                                first: row.bal.unpaidCycles[0].sessions[0].number,
                                last: row.bal.unpaidCycles[row.bal.unpaidCycles.length - 1].sessions.slice(-1)[0]
                                  .number,
                              })}
                            </p>
                            <button
                              className="btn btn-primary sm"
                              onClick={() => collect(row.student.id, row.student.name, 1)}
                            >
                              {t("hist.collect_cycle", { amount: formatDA(row.bal.unpaidCycles[0].amount) })}
                            </button>
                            {row.bal.unpaidCycles.length > 1 && (
                              <button
                                className="btn btn-ghost sm"
                                onClick={() => collect(row.student.id, row.student.name)}
                              >
                                {t("hist.collect_all", { amount: formatDA(row.bal.totalDue) })}
                              </button>
                            )}
                          </div>
                        )}

                        <ul className="att-cycles">
                          {row.bal.cycles.map((c) => (
                            <li key={c.index} className={c.paid ? "paid" : "due"}>
                              <input
                                type="checkbox"
                                className="att-cycle-check"
                                checked={c.paid}
                                title={c.paid ? t("hist.untick_hint") : t("hist.tick_hint")}
                                onChange={() => toggleCycle(row.student.id, c)}
                              />
                              <span className="att-cycle-label">
                                <b>
                                  {t("hist.cycle_n", {
                                    n: c.index,
                                    a: c.sessions[0].number,
                                    b: c.sessions[c.sessions.length - 1].number,
                                  })}
                                  {!c.complete && (
                                    <em className="att-chip">
                                      {t("hist.running", { done: c.sessions.length })}
                                    </em>
                                  )}
                                </b>
                                <em>
                                  {t("hist.due_since", { date: formatDate(c.dueSince) })} ·{" "}
                                  {c.months.join(" · ")}
                                  {c.paidAtSessionNumber
                                    ? ` · ${t("hist.paid_at_session", { n: c.paidAtSessionNumber })}`
                                    : ""}
                                </em>
                              </span>
                              <strong className="att-cycle-amount">
                                {c.paid ? (
                                  <>
                                    <Check size={13} aria-hidden="true" />{" "}
                                    {c.paidAt ? formatDate(c.paidAt) : ""}
                                  </>
                                ) : (
                                  formatDA(c.amount)
                                )}
                              </strong>
                            </li>
                          ))}
                          {row.bal.cycles.length === 0 && (
                            <li className="running"><span>{t("hist.no_cycle_yet")}</span></li>
                          )}
                        </ul>
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------ teacher payments */}
          {tab === "teacher" && teacher && teacherFin && (
            <div className="card att-teacherpay">
              <strong>{t("hist.teacher_pay_period")}</strong>
              <div className="att-teacherpay-row">
                <span className="att-initials" aria-hidden="true">{initials(teacher.name)}</span>
                <div className="att-name-col">
                  <strong>{teacher.name}</strong>
                  <span className="muted small">
                    {klass
                      ? `${subjName(klass.subjectId)} · ${t(`days.${klass.dayOfWeek}`)} ${klass.timeSlot}`
                      : ""}
                  </span>
                </div>
                <div className="att-teacherpay-figs">
                  <div><span>{t("hist.sessions_done")}</span><b>{groupSessions.length}</b></div>
                  <div><span>{t("hist.earned")}</span><b>{formatDA(teacherFin.earned)}</b></div>
                  <div>
                    <span>{t("hist.teacher_already_paid")}</span><b>{formatDA(teacherFin.paidOut)}</b>
                  </div>
                  <div>
                    <span>{t("hist.left_to_pay")}</span>
                    <b className={teacherFin.remaining > 0 ? "text-danger" : "text-ok"}>
                      {formatDA(teacherFin.remaining)}
                    </b>
                  </div>
                </div>
                {teacherFin.remaining > 0 ? (
                  <div className="att-payin">
                    <label className="field">
                      <span>{t("hist.pay_amount")}</span>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        max={teacherFin.remaining}
                        value={payAmount}
                        placeholder={String(teacherFin.remaining)}
                        onChange={(e) => setPayAmount(e.target.value)}
                      />
                    </label>
                    <div className="att-payin-quick">
                      <button
                        className="btn btn-ghost sm"
                        onClick={() => setPayAmount(String(Math.round(teacherFin.remaining / 2)))}
                      >
                        {t("hist.half")}
                      </button>
                      <button className="btn btn-ghost sm" onClick={() => setPayAmount("")}>
                        {t("hist.everything")}
                      </button>
                    </div>
                    <button className="btn btn-primary" onClick={payTheTeacher}>
                      {t("hist.pay_teacher", {
                        amount: formatDA(
                          payAmount.trim() === ""
                            ? teacherFin.remaining
                            : Math.min(Number(payAmount) || 0, teacherFin.remaining)
                        ),
                      })}
                    </button>
                  </div>
                ) : (
                  <span className="att-badge ok">{t("stu.up_to_date")}</span>
                )}
              </div>

              <span className="att-bar-track lg">
                <span
                  className="att-bar-fill ok"
                  style={{
                    width: `${
                      teacherFin.earned ? Math.round((teacherFin.paidOut / teacherFin.earned) * 100) : 0
                    }%`,
                  }}
                />
              </span>
              <span className="muted small">
                {t("hist.paid_progress", {
                  paid: formatDA(teacherFin.paidOut),
                  total: formatDA(teacherFin.earned),
                  left: formatDA(teacherFin.remaining),
                })}
              </span>

              {myPayouts.length > 0 && (
                <ul className="att-cycles">
                  {myPayouts.map((po) => (
                    <li key={po.id} className="paid">
                      <span className="att-cycle-label">
                        <b>{formatDate(po.paidAt)}</b>
                        <em>
                          {po.month} ·{" "}
                          {po.confirmedByTeacher ? t("hist.confirmed") : t("hist.awaiting_confirm")}
                        </em>
                      </span>
                      <strong>{formatDA(po.amount)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* Teintes des vignettes : navy, vert, or, ciel, sarcelle — la gamme de la
   page vitrine. */
const H_TILES = [
  { bg: "#dbe6f6", fg: "#1e3f75" },
  { bg: "#d7ece0", fg: "#0a6c46" },
  { bg: "#fbeac4", fg: "#8a6410" },
  { bg: "#d5eaf8", fg: "#17638f" },
  { bg: "#cfeaee", fg: "#12697a" },
];
const hTile = (i: number) =>
  ({ "--tile-bg": H_TILES[i].bg, "--tile-fg": H_TILES[i].fg } as React.CSSProperties);
