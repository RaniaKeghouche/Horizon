import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Banknote, Wallet, CircleCheck, Hourglass } from "lucide-react";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { teacherFinance, teacherStudentBreakdown } from "../../lib/billing";
import { formatDA, formatDate, billingMonth } from "../../lib/format";
import Modal from "../../components/Modal";
import type { Teacher } from "../../lib/types";

export default function PayrollPage() {
  const { role, profile } = useAuth();
  if (role === "teacher") return <TeacherPayroll teacherId={profile?.teacherId} />;
  return <AdminPayroll />;
}

// ---- Admin: pay teachers, paid/unpaid list ----
function AdminPayroll() {
  const { t } = useTranslation();
  const { teachers, students, subjects, enrollments, payments, teacherPayouts } = useData();
  const payTeacher = useData((s) => s.payTeacher);
  const [detail, setDetail] = useState<Teacher | null>(null);
  const month = billingMonth();

  const rows = useMemo(
    () => teachers.map((t) => ({ teacher: t, fin: teacherFinance(t.id, enrollments, payments, teacherPayouts) })),
    [teachers, enrollments, payments, teacherPayouts]
  );

  const totalToPay = rows.reduce((s, r) => s + r.fin.remaining, 0);

  function pay(teacherId: string, amount: number) {
    if (amount <= 0) return;
    if (confirm(`Verser ${formatDA(amount)} à cet enseignant ?`)) payTeacher(teacherId, amount, month);
  }

  return (
    <div className="stack">
      <header className="page-head">
        <div className="page-title">
          <h1>{t("pay.title_admin")}</h1>
          <p>{t("pay.subtitle_admin")}</p>
        </div>
      </header>

      <div className="grid-cards">
        <div className="card stat-card">
          <span className="stat-icon badge-amber"><Banknote size={20} /></span>
          <div className="stat-body">
            <span className="stat-value text-danger">{formatDA(totalToPay)}</span>
            <span className="stat-label">{t("pay.total_to_pay")}</span>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon"><Banknote size={24} /></span>
            <strong>{t("tea.none")}</strong>
            <p>{t("tea.none_hint")}</p>
          </div>
        </div>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t("nav.teachers")}</th>
                <th>{t("pay.earned")}</th>
                <th>{t("pay.paid_out")}</th>
                <th>{t("pay.remaining")}</th>
                <th>{t("stu.status")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ teacher, fin }) => (
                <tr key={teacher.id}>
                  <td><strong>{teacher.name}</strong></td>
                  <td>{formatDA(fin.earned)}</td>
                  <td className="text-ok">{formatDA(fin.paidOut)}</td>
                  <td>{fin.remaining > 0 ? <span className="text-danger">{formatDA(fin.remaining)}</span> : "—"}</td>
                  <td>
                    {fin.remaining > 0
                      ? <span className="pill pill-danger">{t("pay.to_pay")}</span>
                      : <span className="pill pill-ok">{t("stu.up_to_date")}</span>}
                  </td>
                  <td className="row-actions">
                    <button className="btn btn-ghost sm" onClick={() => setDetail(teacher)}>{t("stu.details")}</button>
                    <button className="btn btn-primary sm" disabled={fin.remaining <= 0} onClick={() => pay(teacher.id, fin.remaining)}>
                      <Banknote size={15} /> {t("pay.pay_btn")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <Modal title={`${t("stu.details")} — ${detail.name}`} onClose={() => setDetail(null)}>
          <p className="muted small">{t("pay.detail_hint")}</p>
          <div className="card table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("nav.students")}</th>
                  <th>{t("nav.subjects")}</th>
                  <th>{t("tea.collected")}</th>
                  <th>{t("tea.pending")}</th>
                </tr>
              </thead>
              <tbody>
                {teacherStudentBreakdown(detail.id, students, enrollments, payments, subjects).map((b) => (
                  <tr key={b.student.id + b.subjectName}>
                    <td>{b.student.name}</td>
                    <td>{b.subjectName}</td>
                    <td className="text-ok">{formatDA(b.paidToTeacher)}</td>
                    <td>{b.pendingToTeacher > 0 ? <span className="text-danger">{formatDA(b.pendingToTeacher)}</span> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="section-title">{t("pay.history")}</h3>
          <div className="stack">
            {teacherPayouts.filter((p) => p.teacherId === detail.id).map((p) => (
              <div key={p.id} className="billing-row">
                <div><strong>{formatDA(p.amount)}</strong><div className="muted small">{p.month} · {formatDate(p.paidAt)}</div></div>
                <span className={"pill " + (p.confirmedByTeacher ? "pill-ok" : "pill-warn")}>
                  {p.confirmedByTeacher ? t("pay.confirmed") : t("pay.awaiting_confirm")}
                </span>
              </div>
            ))}
            {teacherPayouts.filter((p) => p.teacherId === detail.id).length === 0 && (
              <p className="muted">{t("pay.none_paid")}</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---- Teacher: my pay + confirm receipt ----
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
