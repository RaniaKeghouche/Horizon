import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CreditCard, CalendarDays, Repeat, ChevronDown, Check, Clock, CircleAlert,
  Receipt, Wallet, GraduationCap, Info,
} from "lucide-react";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { formatDA, formatDate } from "../../lib/format";
import { schoolYear } from "../../lib/dossier";
import { SESSIONS_PER_PERIOD, computeStudentBilling } from "../../lib/billing";
import { printInvoice } from "../../lib/invoice";
import { subjectIcon, tintStyle } from "../../lib/subjectLook";
import ContactCard from "../discover/ContactCard";
import type { Payment } from "../../lib/types";
import "./payments.css";

/**
 * Trois etats, tires des lignes de paiement reelles :
 *   paid    — tout ce qui a ete facture est regle ;
 *   due     — il reste au moins une ligne impayee ;
 *   pending — aucune seance facturee pour l'instant. Ce n'est pas une dette :
 *             le groupe n'a pas encore tourne, ou l'eleve vient d'arriver.
 * Le troisieme etat n'existe pas en base ; il se deduit de l'absence de lignes,
 * ce qui evite d'afficher « a jour » a quelqu'un qui n'a simplement rien recu.
 */
type Status = "paid" | "due" | "pending";
type Tab = "all" | Status;

interface Row {
  enrollmentId: string;
  subjectId: string;
  subjectName: string;
  teacherName: string;
  level: string;
  /** Identite reelle du groupe dans l'application : son jour et son creneau. */
  slot: string;
  perWeek: number;
  price: number;
  paid: number;
  due: number;
  status: Status;
  session: number;
  archived: boolean;
}

const STATUS_ICON = { paid: Check, due: CircleAlert, pending: Clock };

export default function StudentPayments() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const { students, subjects, teachers, classes, enrollments, sessions, payments } = useData();
  const [tab, setTab] = useState<Tab>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const student = students.find((s) => s.id === profile?.linkedStudentId);

  const rows = useMemo<Row[]>(() => {
    if (!student) return [];
    const mine = enrollments.filter((e) => e.studentId === student.id);
    return mine.map((enr) => {
      const klass = classes.find((c) => c.id === enr.classId);
      const lines = payments.filter((p) => p.enrollmentId === enr.id);
      const paid = lines.filter((p) => p.status === "paid").reduce((n, p) => n + p.amount, 0);
      const due = lines.filter((p) => p.status === "unpaid").reduce((n, p) => n + p.amount, 0);
      const status: Status = lines.length === 0 ? "pending" : due > 0 ? "due" : "paid";
      return {
        enrollmentId: enr.id,
        subjectId: enr.subjectId,
        subjectName: subjects.find((s) => s.id === enr.subjectId)?.name ?? "—",
        teacherName: teachers.find((x) => x.id === enr.teacherId)?.name ?? "—",
        level: klass?.level ?? "",
        slot: klass ? `${t("days." + klass.dayOfWeek)} ${klass.timeSlot}` : "—",
        // Un groupe se reunit une fois par semaine : la frequence d'une matiere
        // est donc le nombre de groupes suivis dans cette matiere.
        perWeek: mine.filter((e) => e.subjectId === enr.subjectId).length,
        price: enr.pricePerSession,
        paid,
        due,
        status,
        session: lines.length,
        archived: enr.status !== "active",
      };
    });
  }, [student, enrollments, classes, subjects, teachers, payments, t]);

  const active = rows.filter((r) => !r.archived);
  const archived = rows.filter((r) => r.archived);
  const count = (s: Status) => active.filter((r) => r.status === s).length;
  const shown = (tab === "all" ? active : active.filter((r) => r.status === tab)).concat(
    showArchived ? archived : []
  );

  const totalPaid = active.reduce((n, r) => n + r.paid, 0);
  const totalDue = active.reduce((n, r) => n + r.due, 0);
  const grand = totalPaid + totalDue;

  /** Les dernieres lignes de paiement, tous cours confondus. */
  const recent = useMemo(() => {
    if (!student) return [] as (Payment & { subjectName: string })[];
    const mineIds = new Set(enrollments.filter((e) => e.studentId === student.id).map((e) => e.id));
    return payments
      .filter((p) => mineIds.has(p.enrollmentId))
      .sort((a, b) => (b.paidAt ?? 0) - (a.paidAt ?? 0))
      .slice(0, 4)
      .map((p) => ({
        ...p,
        subjectName:
          subjects.find(
            (s) => s.id === enrollments.find((e) => e.id === p.enrollmentId)?.subjectId
          )?.name ?? "—",
      }));
  }, [student, enrollments, payments, subjects]);

  if (!student) return <p className="muted">{t("dash.no_student_link")}</p>;

  return (
    <div className="pay">
      <header className="pay-head">
        <span className="pay-head-icon" aria-hidden="true"><CreditCard size={20} /></span>
        <div>
          <h1>{t("pmt.title_student")}</h1>
          <p>{t("pay.subtitle")}</p>
        </div>
        <button
          className="btn btn-ghost pay-invoice"
          onClick={() =>
            printInvoice(
              computeStudentBilling(student!, enrollments, sessions, payments, { subjects, teachers }),
              t,
              i18n.language
            )
          }
        >
          <Receipt size={16} /> {t("pmt.invoice")}
        </button>
      </header>

      <div className="pay-body">
        <div className="pay-main">
          <div className="pay-tabs" role="tablist">
            {([
              ["all", t("pay.tab_all"), active.length],
              ["due", t("pay.tab_due"), count("due")],
              ["paid", t("pay.tab_paid"), count("paid")],
              ["pending", t("pay.tab_pending"), count("pending")],
            ] as const).map(([key, label, n]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                className={"pay-tab" + (tab === key ? " on" : "")}
                onClick={() => setTab(key as Tab)}
              >
                <span>{label}</span>
                <em>{n}</em>
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <span className="empty-state-icon"><Wallet size={24} /></span>
                <strong>{t(active.length === 0 ? "pmt.no_enrolment" : "pay.none_here")}</strong>
                <p>{t(active.length === 0 ? "pmt.no_enrolment_hint" : "pay.none_here_hint")}</p>
              </div>
            </div>
          ) : (
            <div className="pay-rows">
              {shown.map((r) => {
                const Icon = subjectIcon(r.subjectName);
                const Mark = STATUS_ICON[r.status];
                const isOpen = open === r.enrollmentId;
                return (
                  <article
                    key={r.enrollmentId}
                    className={"pay-row" + (r.archived ? " archived" : "")}
                    style={tintStyle(r.subjectName)}
                  >
                    <span className="pay-tile"><Icon size={22} /></span>

                    <div className="pay-id">
                      <strong>{r.subjectName}{r.level && ` — ${r.level.toUpperCase()}`}</strong>
                      <span className="pay-teacher">
                        <GraduationCap size={13} /> {r.teacherName}
                      </span>
                      <span className="pay-chips">
                        <em>{t("disc.year_" + (r.level[0] ?? "1"))}</em>
                        <em className="ghost">{r.slot}</em>
                      </span>
                    </div>

                    <div className="pay-facts">
                      <span>
                        <CalendarDays size={13} />
                        <b>{t("pay.period")}</b>
                        {t("gp.year")} {schoolYear()}
                      </span>
                      <span>
                        <Repeat size={13} />
                        <b>{t("pay.frequency")}</b>
                        {t("pay.per_week", { n: r.perWeek })}
                      </span>
                    </div>

                    <div className="pay-price">
                      <b>{formatDA(r.price)}</b>
                      <span>{t("pmt.per_session")}</span>
                    </div>

                    <div className="pay-actions">
                      <span className={"pay-status " + r.status}>
                        <Mark size={13} /> {t("pay.st_" + r.status)}
                      </span>
                      <button
                        className="pay-details"
                        aria-expanded={isOpen}
                        onClick={() => setOpen(isOpen ? null : r.enrollmentId)}
                      >
                        {t("pay.details")} <ChevronDown size={14} className={isOpen ? "up" : ""} />
                      </button>
                    </div>

                    {isOpen && (
                      <dl className="pay-detail">
                        <div><dt>{t("payments.session")}</dt><dd>{r.session} / {SESSIONS_PER_PERIOD}</dd></div>
                        <div><dt>{t("pay.paid")}</dt><dd className="ok">{formatDA(r.paid)}</dd></div>
                        <div><dt>{t("pmt.due")}</dt><dd className={r.due > 0 ? "no" : ""}>{formatDA(r.due)}</dd></div>
                        <div><dt>{t("pay.slot")}</dt><dd>{r.slot}</dd></div>
                      </dl>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {archived.length > 0 && (
            <button className="pay-more" onClick={() => setShowArchived((v) => !v)}>
              <span>{showArchived ? t("pay.hide_old") : t("pay.show_old", { n: archived.length })}</span>
              <ChevronDown size={16} className={showArchived ? "up" : ""} />
            </button>
          )}
        </div>

        <aside className="pay-side">
          <section className="pay-summary">
            <header>
              <span className="pay-sum-icon" aria-hidden="true"><Receipt size={16} /></span>
              <h3>{t("pay.summary")}</h3>
              <span className="pay-year">{t("gp.year")} {schoolYear()}</span>
            </header>
            <div className="pay-sum-grid">
              <div>
                <span>{t("pay.total_courses")}</span>
                <b>{active.length}</b>
              </div>
              <div>
                <span>{t("pay.total_paid")}</span>
                <b className="ok">{formatDA(totalPaid)}</b>
              </div>
              <div>
                <span>{t("pay.total_due")}</span>
                <b className="warn">{formatDA(totalDue)}</b>
              </div>
            </div>
            <div className="pay-sum-total">
              <span>{t("pay.grand_total")}</span>
              <strong>{formatDA(grand)}</strong>
            </div>
          </section>

          <section className="card pay-panel">
            <h3>{t("pay.by_status")}</h3>
            <div className="pay-donut-wrap">
              <Donut paid={totalPaid} due={totalDue} />
              <ul className="pay-legend">
                <li><i className="ok" />{t("pay.st_paid")}<b>{formatDA(totalPaid)}</b></li>
                <li><i className="warn" />{t("pay.st_due")}<b>{formatDA(totalDue)}</b></li>
                {/* Un cours en attente n'a pas de montant : rien ne lui a encore
                    ete facture. On en donne donc le nombre, pas une somme. */}
                <li><i className="idle" />{t("pay.st_pending")}<b>{t("pay.n_courses", { n: count("pending") })}</b></li>
                <li className="total">{t("pay.grand_total")}<b>{formatDA(grand)}</b></li>
              </ul>
            </div>
          </section>

          <section className="card pay-panel">
            <h3>{t("pay.recent")}</h3>
            {recent.length === 0 ? (
              <p className="pay-empty">{t("pay.recent_empty")}</p>
            ) : (
              <ul className="pay-recent">
                {recent.map((p) => (
                  <li key={p.id} style={tintStyle(p.subjectName)}>
                    <span className="pay-recent-tile">
                      {(() => {
                        const I = subjectIcon(p.subjectName);
                        return <I size={15} />;
                      })()}
                    </span>
                    <div>
                      <strong>{p.subjectName}</strong>
                      <span>
                        {p.status === "paid" && p.paidAt
                          ? t("pay.paid_on", { date: formatDate(p.paidAt) })
                          : t("pay.awaiting")}
                      </span>
                    </div>
                    <div className="pay-recent-end">
                      <b>{formatDA(p.amount)}</b>
                      <em className={p.status === "paid" ? "ok" : "warn"}>
                        {t(p.status === "paid" ? "pay.st_paid" : "pay.st_due")}
                      </em>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Il n'y a pas de paiement en ligne dans l'application : le reglement
              se fait au secretariat. Un bouton « Payer » ne menerait nulle part,
              on donne donc ce qui sert vraiment — comment et ou regler. */}
          <div className="pay-howto">
            <Info size={15} aria-hidden="true" />
            <p>{t("pay.howto")}</p>
          </div>
          <ContactCard />
        </aside>
      </div>
    </div>
  );

  function Donut({ paid, due }: { paid: number; due: number }) {
    const total = paid + due;
    // Sans rien de facture, un anneau vide vaut mieux qu'un cercle plein qui
    // laisserait croire a un solde regle.
    const share = total > 0 ? paid / total : 0;
    const R = 42;
    const C = 2 * Math.PI * R;
    const rtl = i18n.dir() === "rtl";
    return (
      <svg className="pay-donut" viewBox="0 0 110 110" role="img" aria-label={t("pay.by_status")}>
        <circle cx="55" cy="55" r={R} className="pay-donut-bg" />
        {total > 0 && (
          <circle
            cx="55"
            cy="55"
            r={R}
            className="pay-donut-paid"
            strokeDasharray={`${C * share} ${C}`}
            transform={rtl ? "rotate(-90 55 55) scale(-1 1) translate(-110 0)" : "rotate(-90 55 55)"}
          />
        )}
        <text x="55" y="52" className="pay-donut-n">{total > 0 ? Math.round(share * 100) : 0}%</text>
        <text x="55" y="68" className="pay-donut-k">{t("pay.st_paid")}</text>
      </svg>
    );
  }
}
