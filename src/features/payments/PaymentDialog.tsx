import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CircleCheck, StickyNote, Wallet } from "lucide-react";
import Modal from "../../components/Modal";
import { formatDA, formatDate } from "../../lib/format";
import type { Cycle } from "../../lib/cycles";
import type { Payment, Student } from "../../lib/types";

export interface PaymentTarget {
  student: Student;
  /** What the line is for, e.g. "English · Amine Belkacem". */
  label: string;
  unpaidCycles: Cycle[];
  /** The ledger rows behind those cycles, so the dialog can settle them. */
  rows: Payment[];
}

/**
 * Collecting money, deliberately explicit.
 *
 * A family often owes several cycles across several months, and rarely pays all
 * of it at once. So rather than a yes/no confirm, this lists every outstanding
 * cycle with its months and lets the desk tick exactly what is being settled —
 * all of it, one month, or whichever ones the money covers. The note is always
 * there, because "paid half, rest Friday" is the thing nobody remembers later.
 */
export default function PaymentDialog({
  target,
  onClose,
  onConfirm,
}: {
  target: PaymentTarget;
  onClose: () => void;
  /** Receives the session ids to settle and the note to store against them. */
  onConfirm: (sessionIds: string[], note: string) => void;
}) {
  const { t } = useTranslation();
  const { student, label, unpaidCycles } = target;

  // Everything is ticked by default: paying in full is the common case.
  const [chosen, setChosen] = useState<number[]>(unpaidCycles.map((c) => c.index));
  const [note, setNote] = useState("");

  const selected = unpaidCycles.filter((c) => chosen.includes(c.index));
  const total = selected.reduce((sum, c) => sum + c.amount, 0);
  const owed = unpaidCycles.reduce((sum, c) => sum + c.amount, 0);
  const remaining = owed - total;

  /** Months touched by the outstanding cycles, oldest first. */
  const months = useMemo(
    () => [...new Set(unpaidCycles.flatMap((c) => c.months))].sort(),
    [unpaidCycles]
  );

  const toggle = (i: number) =>
    setChosen((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));

  function confirm() {
    if (selected.length === 0) return;
    onConfirm(
      selected.flatMap((c) => c.sessions.map((s) => s.sessionId)),
      note.trim()
    );
  }

  return (
    <Modal
      title={t("pay.dialog_title", { name: student.name })}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button className="btn btn-primary" onClick={confirm} disabled={selected.length === 0}>
            <Wallet size={16} /> {t("pay.confirm_amount", { amount: formatDA(total) })}
          </button>
        </>
      }
    >
      <p className="muted small pay-dialog-sub">
        {label}
        {months.length > 1 && ` · ${t("pay.spans_months", { n: months.length })}`}
      </p>

      <div className="pay-dialog-head">
        <span>{t("pay.pick_cycles")}</span>
        <span className="row-actions">
          <button
            className="btn btn-ghost sm"
            onClick={() => setChosen(unpaidCycles.map((c) => c.index))}
          >
            {t("pay.select_all")}
          </button>
          <button className="btn btn-ghost sm" onClick={() => setChosen([])}>
            {t("pay.select_none")}
          </button>
        </span>
      </div>

      <ul className="pay-dialog-list">
        {unpaidCycles.map((c) => {
          const on = chosen.includes(c.index);
          return (
            <li key={c.index} className={on ? "on" : ""}>
              <input
                type="checkbox"
                id={`cyc-${c.index}`}
                checked={on}
                onChange={() => toggle(c.index)}
              />
              <label htmlFor={`cyc-${c.index}`}>
                <strong>
                  {t("hist.cycle_n", {
                    n: c.index,
                    a: c.sessions[0].number,
                    b: c.sessions[c.sessions.length - 1].number,
                  })}
                </strong>
                <span className="muted small">
                  {c.months.join(" · ")} · {t("hist.due_since", { date: formatDate(c.dueSince) })}
                  {!c.complete && ` · ${t("hist.running", { done: c.sessions.length })}`}
                </span>
              </label>
              <strong className="pay-dialog-amount">{formatDA(c.amount)}</strong>
            </li>
          );
        })}
      </ul>

      <label className="field pay-dialog-note">
        <span>
          <StickyNote size={13} /> {t("pay.note_label")}
        </span>
        <textarea
          className="input"
          rows={2}
          value={note}
          placeholder={t("pay.note_ph")}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      <div className="pay-dialog-total">
        <span>
          <CircleCheck size={14} />
          {t("pay.selected_n", { n: selected.length, total: unpaidCycles.length })}
        </span>
        <span className="pay-dialog-figures">
          <strong>{formatDA(total)}</strong>
          {remaining > 0 && (
            <em className="text-danger">{t("pay.will_remain", { amount: formatDA(remaining) })}</em>
          )}
        </span>
      </div>
    </Modal>
  );
}
