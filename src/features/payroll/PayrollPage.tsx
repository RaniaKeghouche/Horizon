import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Banknote, Wallet, CircleCheck, Hourglass, Download, TriangleAlert, Users, ChevronRight,
  CalendarDays,
} from "lucide-react";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { teacherFinance } from "../../lib/billing";
import { teacherLedger, payrollTotals } from "../../lib/payroll";
import { formatDA, formatDate, billingMonth } from "../../lib/format";
import StackedTable from "../../components/StackedTable";

export default function PayrollPage() {
  const { role, profile } = useAuth();
  if (role === "teacher") return <TeacherPayroll teacherId={profile?.teacherId} />;
  return <AdminPayroll />;
}

// ---- Admin: pay teachers, paid/unpaid list ----
/** "Amine Belkacem" -> "AB", for the small avatar chips. */
function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function AdminPayroll() {
  const { t, i18n } = useTranslation();
  const { teachers, students, subjects, enrollments, payments, teacherPayouts } = useData();
  const payTeacher = useData((s) => s.payTeacher);

  const [pickedId, setPickedId] = useState("");
  const [month, setMonth] = useState(() => billingMonth());
  const [payAmount, setPayAmount] = useState("");
  const [flash, setFlash] = useState("");

  const ledgers = useMemo(
    () =>
      teachers
        .map((te) => teacherLedger(te, students, subjects, enrollments, payments, teacherPayouts))
        .sort((a, b) => b.readyForPayout - a.readyForPayout),
    [teachers, students, subjects, enrollments, payments, teacherPayouts]
  );
  const totals = useMemo(() => payrollTotals(ledgers), [ledgers]);

  /** Les douze derniers mois de facturation, pour le selecteur d'en-tete. */
  const monthOptions = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) =>
      billingMonth(new Date(now.getFullYear(), now.getMonth() - i, 1))
    );
  }, []);

  /** Six mois de series reelles, tirees des paiements et des versements : les
   *  courbes des cartes montrent donc l'historique, pas une decoration. */
  const series = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) =>
      billingMonth(new Date(now.getFullYear(), now.getMonth() - (5 - i), 1))
    );
    const sum = (arr: { teacherCut: number }[]) => arr.reduce((a, p) => a + p.teacherCut, 0);
    return {
      liability: months.map((m) => sum(payments.filter((p) => p.month === m))),
      ready: months.map((m) => sum(payments.filter((p) => p.month === m && p.status === "paid"))),
      pending: months.map((m) => sum(payments.filter((p) => p.month === m && p.status !== "paid"))),
      paidOut: months.map((m) =>
        teacherPayouts.filter((p) => p.month === m).reduce((a, p) => a + p.amount, 0)
      ),
    };
  }, [payments, teacherPayouts]);


  const picked = ledgers.find((l) => l.teacher.id === pickedId) ?? ledgers[0];
  const myPayouts = useMemo(
    () =>
      teacherPayouts
        .filter((p) => p.teacherId === picked?.teacher.id)
        .sort((a, b) => b.paidAt - a.paidAt),
    [teacherPayouts, picked]
  );

  function execute() {
    if (!picked || picked.readyForPayout <= 0) return;
    const asked = payAmount.trim() === "" ? picked.readyForPayout : Number(payAmount);
    if (!Number.isFinite(asked) || asked <= 0) return;
    // Capped at what is actually payable, so a typo cannot overpay.
    const amount = Math.min(asked, picked.readyForPayout);
    if (!confirm(t("hist.confirm_pay_teacher", { name: picked.teacher.name, amount: formatDA(amount) })))
      return;
    payTeacher(picked.teacher.id, amount, month);
    setPayAmount("");
    setFlash(t("hist.teacher_paid_flash", { name: picked.teacher.name, amount: formatDA(amount) }));
  }

  function exportCsv() {
    const head = [t("nav.teachers"), t("pay.k_liability"), t("pay.k_ready"), t("pay.k_pending"), t("hist.teacher_already_paid")].join(";");
    const body = ledgers
      .map((l) => [l.teacher.name, l.liability, l.readyForPayout, l.pending, l.paidOut].join(";"))
      .join("\n");
    const blob = new Blob([head + "\n" + body], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "paie-enseignants.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="stack">
      <header className="page-head pay-head">
        <span className="pay-head-icon" aria-hidden="true"><Wallet size={24} /></span>
        <div className="page-title">
          <h1>{t("pay.ledger_title")}</h1>
          <p>{t("pay.ledger_sub")}</p>
        </div>
        <div className="row-actions">
          {/* Le mois choisi est celui sous lequel le versement sera enregistre. */}
          <label className="pay-month">
            <CalendarDays size={16} aria-hidden="true" />
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              {monthOptions.map((m) => (
                <option key={m} value={m}>{monthLabel(i18n.language, m)}</option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary" onClick={exportCsv} disabled={ledgers.length === 0}>
            <Download size={16} /> {t("pay.export")}
          </button>
        </div>
      </header>

      {flash && <p className="att-flash">{flash}</p>}

      <div className="pay-kpis">
        <div className="card pay-kpi" style={tile(0)}>
          <span className="pay-kpi-icon"><Wallet size={20} /></span>
          <div className="pay-kpi-body">
            <span className="pay-kpi-label">{t("pay.k_liability")}</span>
            <strong>{formatDA(totals.liability)}</strong>
            <span className="muted small">{t("pay.k_liability_sub")}</span>
          </div>
          <Spark values={series.liability} />
        </div>
        <div className="card pay-kpi" style={tile(1)}>
          <span className="pay-kpi-icon"><Banknote size={20} /></span>
          <div className="pay-kpi-body">
            <span className="pay-kpi-label">{t("pay.k_ready")}</span>
            <strong className="text-ok">{formatDA(totals.ready)}</strong>
            <span className="muted small">{t("pay.k_ready_sub")}</span>
          </div>
          <Spark values={series.ready} tone="var(--success)" />
        </div>
        <div className="card pay-kpi" style={tile(2)}>
          <span className="pay-kpi-icon"><Hourglass size={20} /></span>
          <div className="pay-kpi-body">
            <span className="pay-kpi-label">{t("pay.k_pending")}</span>
            <strong className={totals.pending > 0 ? "text-danger" : ""}>{formatDA(totals.pending)}</strong>
            <span className="muted small">
              <TriangleAlert size={12} /> {t("pay.k_pending_sub")}
            </span>
          </div>
          <Spark values={series.pending} tone="var(--gold)" />
        </div>
        <div className="card pay-kpi" style={tile(3)}>
          <span className="pay-kpi-icon"><CircleCheck size={20} /></span>
          <div className="pay-kpi-body">
            <span className="pay-kpi-label">{t("pay.k_paid")}</span>
            <strong>{formatDA(totals.paidOut)}</strong>
            <span className="muted small">{t("pay.k_paid_sub")}</span>
          </div>
          <Spark values={series.paidOut} />
        </div>
      </div>

      <div className="pay-board">
        {/* ------------------------------------------------ every teacher */}
        <div className="card stack">
          <h2 className="pay-ledger-title">{t("pay.overview")}</h2>
          {ledgers.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon"><Banknote size={24} /></span>
              <strong>{t("tea.none")}</strong>
            </div>
          ) : (
            <StackedTable className="pay-teachers">
                <thead>
                  <tr>
                    <th>{t("pay.col_educator")}</th>
                    <th>{t("pay.col_earned")}</th>
                    <th>{t("pay.col_breakdown")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {ledgers.map((l) => {
                    const total = l.readyForPayout + l.pending;
                    const readyPct = total ? Math.round((l.readyForPayout / total) * 100) : 0;
                    const on = l.teacher.id === picked?.teacher.id;
                    return (
                      <tr key={l.teacher.id} className={on ? "on" : ""} onClick={() => setPickedId(l.teacher.id)}>
                        <td>
                          <div className="cell-id">
                            <span className="att-initials" aria-hidden="true">{initials(l.teacher.name)}</span>
                            <span className="att-name-col">
                              <strong>{l.teacher.name}</strong>
                              <span className="muted small">
                                {l.teacher.subjects
                                  .map((id) => subjects.find((s) => s.id === id)?.name)
                                  .filter(Boolean)
                                  .join(" · ") || "—"}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="att-name-col">
                            <strong>{formatDA(l.liability)}</strong>
                            <span className="muted small">{t("pay.n_sessions", { n: l.sessions })}</span>
                          </span>
                        </td>
                        <td>
                          <div className="pay-breakdown">
                            <span>
                              <b className="text-ok">{t("pay.ready_n", { amount: formatDA(l.readyForPayout) })}</b>
                              <b className="text-danger">{t("pay.pending_n", { amount: formatDA(l.pending) })}</b>
                            </span>
                            <span className="pay-splitbar">
                              <span className="ready" style={{ width: `${readyPct}%` }} />
                              <span className="locked" style={{ width: `${100 - readyPct}%` }} />
                            </span>
                          </div>
                        </td>
                        <td>
                          <button
                            className={"pay-review" + (on ? " on" : "")}
                            /* Deplie, le bouton n'affiche qu'un chevron : sans nom
                               explicite un lecteur d'ecran n'annoncerait que
                               « bouton ». */
                            aria-label={t("pay.review")}
                            aria-expanded={on}
                            onClick={(e) => { e.stopPropagation(); setPickedId(l.teacher.id); }}
                          >
                            {on ? <ChevronRight size={14} /> : t("pay.review")}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
            </StackedTable>
          )}
        </div>

        {/* ------------------------------------------ the selected teacher */}
        <aside className="card pay-detail-panel">
          {!picked ? (
            <div className="empty-state">
              <span className="empty-state-icon"><Users size={24} /></span>
              <strong>{t("tea.none")}</strong>
            </div>
          ) : (
            <>
              <div className="pay-detail-head">
                <span className="att-initials lg" aria-hidden="true">{initials(picked.teacher.name)}</span>
                <div className="att-name-col">
                  <strong>{picked.teacher.name}</strong>
                  <span className="muted small">{t("pay.ledger_details")}</span>
                </div>
              </div>

              <span className="pay-kpi-label">{t("pay.cleared_for_payout")}</span>
              <strong className="pay-cleared">{formatDA(picked.readyForPayout)}</strong>

              {picked.readyForPayout > 0 ? (
                <div className="att-payin">
                  <label className="field">
                    <span>{t("hist.pay_amount")}</span>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      max={picked.readyForPayout}
                      value={payAmount}
                      placeholder={String(picked.readyForPayout)}
                      onChange={(e) => setPayAmount(e.target.value)}
                    />
                  </label>
                  <div className="att-payin-quick">
                    <button
                      className="btn btn-ghost sm"
                      onClick={() => setPayAmount(String(Math.round(picked.readyForPayout / 2)))}
                    >
                      {t("hist.half")}
                    </button>
                    <button className="btn btn-ghost sm" onClick={() => setPayAmount("")}>
                      {t("hist.everything")}
                    </button>
                  </div>
                  <button className="btn btn-primary pay-execute" onClick={execute}>
                    <Banknote size={16} />
                    {t("pay.execute", {
                      amount: formatDA(
                        payAmount.trim() === ""
                          ? picked.readyForPayout
                          : Math.min(Number(payAmount) || 0, picked.readyForPayout)
                      ),
                    })}
                  </button>
                </div>
              ) : (
                <p className="att-note ok">
                  <CircleCheck size={14} /> {t("pay.all_settled")}
                </p>
              )}

              {/* Per student: what they generate, and whether the teacher has
                  already been paid for them. */}
              <h3 className="att-aside-title">{t("pay.student_status")}</h3>
              <p className="muted small">{t("pay.locked_note")}</p>
              <ul className="pay-students">
                {picked.lines.map((l) => {
                  const state =
                    l.pending > 0 && l.earned === 0
                      ? "locked"
                      : l.outstanding > 0
                      ? "owed"
                      : "settled";
                  return (
                    <li key={l.enrollmentId} className={state}>
                      <span className="att-initials" aria-hidden="true">{initials(l.student.name)}</span>
                      <span className="att-name-col">
                        <strong>{l.student.name}</strong>
                        <span className="muted small">
                          {l.subjectName} · {t("pay.n_sessions", { n: l.sessions })}
                        </span>
                      </span>
                      <span className="pay-student-figs">
                        <strong>{formatDA(l.earned + l.pending)}</strong>
                        <em className={"pay-tag " + state}>
                          {state === "locked"
                            ? t("pay.tag_locked")
                            : state === "owed"
                            ? t("pay.tag_owed", { amount: formatDA(l.outstanding) })
                            : t("pay.tag_settled")}
                        </em>
                      </span>
                    </li>
                  );
                })}
                {picked.lines.length === 0 && <li className="muted small">{t("pay.no_students")}</li>}
              </ul>

              {myPayouts.length > 0 && (
                <>
                  <h3 className="att-aside-title">{t("pay.payout_history")}</h3>
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
                </>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

/* Pastilles des vignettes : la gamme bleue + or de la page vitrine. */
const TILES = [
  { bg: "#dbe6f6", fg: "#1e3f75" },
  { bg: "#d7ece0", fg: "#0a6c46" },
  { bg: "#fbeac4", fg: "#8a6410" },
  { bg: "#d5eaf8", fg: "#17638f" },
];
const tile = (i: number) =>
  ({ "--tile-bg": TILES[i % TILES.length].bg, "--tile-fg": TILES[i % TILES.length].fg } as React.CSSProperties);

/** "2026-09" -> "Septembre 2026", dans la langue active. */
function monthLabel(lang: string, month: string) {
  const d = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1);
  const s = new Intl.DateTimeFormat(lang, { month: "long", year: "numeric" }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Courbe des six derniers mois, tracee a la main : deux douzaines de pixels ne
 *  justifient pas d'embarquer une librairie de graphes. */
function Spark({ values, tone = "var(--primary)" }: { values: number[]; tone?: string }) {
  if (values.length < 2 || values.every((v) => v === 0)) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100;
    const y = 26 - ((v - min) / span) * 22;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg className="pay-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts.join(" ")} fill="none" stroke={tone} strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function TeacherPayroll({ teacherId }: { teacherId?: string }) {
  const { t } = useTranslation();
  const { enrollments, payments, teacherPayouts } = useData();
  const confirmPayout = useData((s) => s.confirmPayout);
  if (!teacherId) return <p className="muted">{t("dash.no_teacher_link")}</p>;

  const fin = teacherFinance(teacherId, enrollments, payments, teacherPayouts);
  const mine = teacherPayouts.filter((p) => p.teacherId === teacherId).sort((a, b) => b.paidAt - a.paidAt);

  return (
    <div className="stack">
      <header className="page-head">
        <div className="page-title">
          <h1>{t("pay.title_teacher")}</h1>
          <p>{t("pay.subtitle_teacher")}</p>
        </div>
      </header>

      <div className="grid-cards">
        <div className="card stat-card">
          <span className="stat-icon badge-green"><Wallet size={20} /></span>
          <div className="stat-body">
            <span className="stat-value text-ok">{formatDA(fin.earned)}</span>
            <span className="stat-label">{t("pay.earned_collected")}</span>
          </div>
        </div>
        <div className="card stat-card">
          <span className="stat-icon badge-blue"><CircleCheck size={20} /></span>
          <div className="stat-body">
            <span className="stat-value">{formatDA(fin.paidOut)}</span>
            <span className="stat-label">{t("pay.received")}</span>
          </div>
        </div>
        <div className="card stat-card">
          <span className="stat-icon badge-amber"><Hourglass size={20} /></span>
          <div className="stat-body">
            <span className="stat-value text-danger">{formatDA(fin.remaining)}</span>
            <span className="stat-label">{t("tea.pending")}</span>
          </div>
        </div>
      </div>

      <h3 className="section-title">{t("pay.received_list")}</h3>
      <div className="stack">
        {mine.map((p) => (
          <div key={p.id} className="card billing-row">
            <div><strong>{formatDA(p.amount)}</strong><div className="muted small">{p.month} · {formatDate(p.paidAt)}</div></div>
            {p.confirmedByTeacher ? (
              <span className="pill pill-ok"><CircleCheck size={13} /> {t("pay.confirmed_short")}</span>
            ) : (
              <button className="btn btn-primary sm" onClick={() => confirmPayout(p.id)}>
                {t("pay.confirm_receipt")}
              </button>
            )}
          </div>
        ))}
        {mine.length === 0 && (
          <div className="card">
            <div className="empty-state">
              <span className="empty-state-icon"><Banknote size={24} /></span>
              <strong>{t("pay.none_received")}</strong>
              <p>{t("pay.none_received_hint")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
