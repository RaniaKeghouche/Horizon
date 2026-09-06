import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Receipt, Wallet, CircleCheck, Search, ChevronLeft, ChevronRight, FileText,
} from "lucide-react";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import StudentPayments from "./StudentPayments";
import { formatDA } from "../../lib/format";
import PaymentManage from "./PaymentManage";
import PaymentDialog, { type PaymentTarget } from "./PaymentDialog";
import { cycleBalance, SESSIONS_PER_CYCLE } from "../../lib/cycles";
import type { Student } from "../../lib/types";
import StackedTable from "../../components/StackedTable";

export default function PaymentsPage() {
  const { role } = useAuth();
  if (role === "student") return <StudentPayments />;
  return <AdminPayments />;
}

// ---- Admin: debt overview + per-student management ----
function AdminPayments() {
  const { t } = useTranslation();
  const {
    students, subjects, teachers, classes, enrollments, sessions, payments,
  } = useData();
  const markPaidMany = useData((s) => s.markPaidMany);

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "due" | "clear">("all");
  const [page, setPage] = useState(0);
  const [manage, setManage] = useState<Student | null>(null);
  const [collecting, setCollecting] = useState<PaymentTarget | null>(null);
  const PER_PAGE = 12;

  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "—";

  /**
   * One ledger line per enrolment — a student taking two subjects owes for each
   * separately, and each has its own 4-session cycle.
   */
  const ledger = useMemo(() => {
    return enrollments
      .map((e) => {
        const student = students.find((s) => s.id === e.studentId);
        const klass = classes.find((c) => c.id === e.classId);
        if (!student || !klass) return null;
        const mine = payments.filter((p) => p.enrollmentId === e.id);
        const bal = cycleBalance(
          sessions.filter((x) => x.classId === e.classId),
          student.id,
          klass.pricePerSession ?? 0,
          mine
        );
        return {
          key: e.id,
          student,
          klass,
          bal,
          mine,
          teacher: teachers.find((x) => x.id === klass.teacherId),
          price: klass.pricePerSession ?? 0,
        };
      })
      .filter((r): r is NonNullable<typeof r> => !!r);
  }, [enrollments, students, classes, teachers, sessions, payments]);

  /** Teachers that actually run one of the groups on screen. */
  const teachersPresent = useMemo(
    () => [...new Set(ledger.map((r) => r.klass.teacherId))],
    [ledger]
  );
  const classesPresent = useMemo(
    () =>
      [...new Set(ledger.map((r) => r.klass.id))]
        .map((id) => classes.find((c) => c.id === id))
        .filter((c): c is NonNullable<typeof c> => !!c)
        .filter((c) => !teacherFilter || c.teacherId === teacherFilter),
    [ledger, classes, teacherFilter]
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ledger.filter((r) => {
      if (q && !r.student.name.toLowerCase().includes(q) && !(r.student.phone ?? "").includes(q))
        return false;
      if (teacherFilter && r.klass.teacherId !== teacherFilter) return false;
      if (classFilter && r.klass.id !== classFilter) return false;
      if (statusFilter === "due" && r.bal.totalDue <= 0) return false;
      if (statusFilter === "clear" && r.bal.totalDue > 0) return false;
      return true;
    });
  }, [ledger, search, teacherFilter, classFilter, statusFilter]);

  /** Money for whatever the filters are currently showing. */
  const money = useMemo(() => {
    let collected = 0, due = 0, school = 0, teacher = 0;
    for (const r of rows) {
      due += r.bal.totalDue;
      collected += r.bal.cycles.filter((c) => c.paid).reduce((s, c) => s + c.amount, 0);
      for (const p of r.mine.filter((p) => p.status === "paid")) {
        school += p.schoolCut;
        teacher += p.teacherCut;
      }
    }
    const expected = collected + due;
    const split = school + teacher;
    return {
      expected,
      collected,
      due,
      rate: expected ? Math.round((collected / expected) * 100) : 0,
      school,
      teacher,
      schoolPct: split ? Math.round((school / split) * 100) : 0,
      teacherPct: split ? Math.round((teacher / split) * 100) : 0,
    };
  }, [rows]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const shown = rows.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  /** Open the collection dialog for one ledger line. */
  function record(r: (typeof ledger)[number]) {
    if (r.bal.unpaidCycles.length === 0) return;
    setCollecting({
      student: r.student,
      label: `${subjName(r.klass.subjectId)} · ${r.teacher?.name ?? "—"}`,
      unpaidCycles: r.bal.unpaidCycles,
      rows: r.mine,
    });
  }

  /** Apply what the dialog decided: settle those sessions, carrying the note. */
  function applyPayment(sessionIds: string[], note: string) {
    if (!collecting) return;
    const ids = new Set(sessionIds);
    // Un seul appel pour tout le cycle : la famille recoit un accuse portant le
    // total, et non un par facture.
    const aEncaisser = collecting.rows
      .filter((p) => ids.has(p.sessionId) && p.status === "unpaid")
      .map((p) => p.id);
    markPaidMany(aEncaisser, note || undefined);
    setCollecting(null);
  }

  const owingVisible = shown.filter((r) => r.bal.totalDue > 0).length;

  return (
    <div className="stack">
      <header className="page-head">
        <div className="page-title">
          <h1>{t("pmt.title_admin")}</h1>
          <p>{t("pmt.ledger_sub")}</p>
        </div>
      </header>

      {/* ------------------------------------------------ money at a glance */}
      <div className="pay-kpis">
        <div className="card pay-kpi">
          <span className="pay-kpi-label">{t("pmt.expected")}</span>
          <strong>{formatDA(money.expected)}</strong>
          <span className="muted small">{t("pmt.cycle_note")}</span>
        </div>

        <div className="card pay-kpi">
          <span className="pay-kpi-label">{t("pmt.collection")}</span>
          <strong>{money.rate}%</strong>
          <span className="pay-progress">
            <span className="pay-progress-fill" style={{ width: `${money.rate}%` }} />
          </span>
          <span className="pay-kpi-foot">
            <span className="text-ok">{t("pmt.collected_n", { amount: formatDA(money.collected) })}</span>
            <span className="text-danger">{t("pmt.outstanding_n", { amount: formatDA(money.due) })}</span>
          </span>
        </div>

        <div className="card pay-kpi">
          <span className="pay-kpi-label">{t("pmt.split")}</span>
          <div className="pay-split-figs">
            <div>
              <strong>{formatDA(money.school)}</strong>
              <span className="muted small">
                <b className="pay-dot school" /> {t("pmt.school_share", { pct: money.schoolPct })}
              </span>
            </div>
            <div>
              <strong>{formatDA(money.teacher)}</strong>
              <span className="muted small">
                <b className="pay-dot teacher" /> {t("pmt.teacher_share", { pct: money.teacherPct })}
              </span>
            </div>
          </div>
          <span className="pay-splitbar">
            <span className="school" style={{ width: `${money.schoolPct}%` }} />
            <span className="teacher" style={{ width: `${money.teacherPct}%` }} />
          </span>
        </div>
      </div>

      {/* ------------------------------------------------ the ledger itself */}
      <div className="card stack">
        <div className="pay-ledger-head">
          <div>
            <h2 className="pay-ledger-title">{t("pmt.ledger")}</h2>
            <p className="muted small">{t("pmt.ledger_hint")}</p>
          </div>
          <span className="muted small pay-owing-note">
            {t("pmt.owing_visible", { n: owingVisible })}
          </span>
        </div>

        {/* Narrow by teacher, then by their group — the two questions the desk asks. */}
        <div className="pay-filters">
          <label className="field pay-search">
            <span>{t("hist.search")}</span>
            <div className="att-search-box">
              <Search size={15} aria-hidden="true" />
              <input
                className="input"
                value={search}
                placeholder={t("hist.search_ph")}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              />
            </div>
          </label>
          <label className="field">
            <span>{t("hist.teacher_word")}</span>
            <select
              className="input"
              value={teacherFilter}
              onChange={(e) => { setTeacherFilter(e.target.value); setClassFilter(""); setPage(0); }}
            >
              <option value="">{t("hist.filter_all")}</option>
              {teachersPresent.map((id) => (
                <option key={id} value={id}>{teachers.find((x) => x.id === id)?.name ?? "—"}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t("att.group")}</span>
            <select
              className="input"
              value={classFilter}
              onChange={(e) => { setClassFilter(e.target.value); setPage(0); }}
            >
              <option value="">{t("hist.filter_all")}</option>
              {classesPresent.map((c) => (
                <option key={c.id} value={c.id}>
                  {subjName(c.subjectId)} · {t(`days.${c.dayOfWeek}`)} {c.timeSlot}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t("hist.pay_status")}</span>
            <select
              className="input"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as "all" | "due" | "clear"); setPage(0); }}
            >
              <option value="all">{t("hist.filter_all")}</option>
              <option value="due">{t("hist.filter_due")}</option>
              <option value="clear">{t("hist.filter_clear")}</option>
            </select>
          </label>
        </div>

        {rows.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon"><Wallet size={24} /></span>
            <strong>{t("hist.no_match")}</strong>
          </div>
        ) : (
          <>
            <StackedTable className="pay-ledger">
                <thead>
                  <tr>
                    <th>{t("pmt.col_student")}</th>
                    <th>{t("pmt.col_progress")}</th>
                    <th>{t("pmt.col_tuition")}</th>
                    <th>{t("pmt.col_debt")}</th>
                    <th>{t("pmt.col_action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => {
                    const owes = r.bal.totalDue > 0;
                    const late = r.bal.unpaidCycles.length > 1;
                    const cur = r.bal.current;
                    const done = cur ? cur.sessions.length : SESSIONS_PER_CYCLE;
                    const cycleNo = r.bal.cycles.length || 1;
                    return (
                      <tr key={r.key} className={late ? "late" : owes ? "" : "settled"}>
                        <td>
                          <div className="cell-id">
                            <span className="att-initials" aria-hidden="true">{initials(r.student.name)}</span>
                            <span className="att-name-col">
                              <strong>{r.student.name}</strong>
                              <span className="muted small">
                                {subjName(r.klass.subjectId)} · {r.teacher?.name ?? "—"}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td>
                          {/* Four dots = the 4 sessions of the running cycle. */}
                          <div className="pay-dots" title={t("pmt.cycle_of", { n: cycleNo })}>
                            {Array.from({ length: SESSIONS_PER_CYCLE }).map((_, i) => (
                              <span
                                key={i}
                                className={
                                  "pay-dot-step" +
                                  (i < done ? (owes ? " due" : " paid") : "")
                                }
                              />
                            ))}
                            <em>{t("pmt.week_of", { a: done, b: SESSIONS_PER_CYCLE })}</em>
                          </div>
                        </td>
                        <td>{formatDA(r.price)}</td>
                        <td>
                          {owes ? (
                            <span className="pay-debt">
                              <strong className="text-danger">{formatDA(r.bal.totalDue)}</strong>
                              {late && <em className="text-danger">{t("pmt.overdue")}</em>}
                            </span>
                          ) : (
                            <span className="pay-debt">
                              <strong className="muted">{formatDA(0)}</strong>
                              <em className="text-ok">
                                <CircleCheck size={11} /> {t("payments.paid")}
                              </em>
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="pay-actions">
                            <button
                              className={"pay-record" + (late ? " urgent" : "")}
                              disabled={!owes}
                              onClick={() => record(r)}
                            >
                              <Receipt size={13} /> {t("pmt.record")}
                            </button>
                            <button
                              className="pay-detail"
                              title={t("pmt.manage")}
                              onClick={() => setManage(r.student)}
                            >
                              <FileText size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
            </StackedTable>

            <div className="att-pager">
              <span className="muted small">
                {t("pmt.showing", {
                  a: page * PER_PAGE + 1,
                  b: Math.min((page + 1) * PER_PAGE, rows.length),
                  n: rows.length,
                })}
              </span>
              {pageCount > 1 && (
                <div className="row-actions">
                  <button
                    className="btn btn-ghost sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="att-page-n">{page + 1} / {pageCount}</span>
                  <button
                    className="btn btn-ghost sm"
                    disabled={page + 1 >= pageCount}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {manage && <PaymentManage student={manage} onClose={() => setManage(null)} />}
      {collecting && (
        <PaymentDialog
          target={collecting}
          onClose={() => setCollecting(null)}
          onConfirm={applyPayment}
        />
      )}
    </div>
  );
}


function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}
