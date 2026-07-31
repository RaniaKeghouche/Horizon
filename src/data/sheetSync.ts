// Google Sheet backup: pushes a snapshot of the data to the Apps Script webhook whenever
// it changes (debounced). Only the admin app pushes (it sees all the data). Uses no-cors
// POST — Apps Script reads e.postData.contents regardless of content-type.
import { DEMO_MODE, SHEET_WEBHOOK_URL } from "../lib/config";
import { useData } from "./store";
import { formatDA, formatDate } from "../lib/format";
import { LEVEL_LABEL, STATUS_LABEL, DAY_LABEL, PAYMENT_MODE_LABEL } from "../lib/labels";

function buildSnapshot() {
  const s = useData.getState();
  const subjName = (id: string) => s.subjects.find((x) => x.id === id)?.name ?? "";
  const studentName = (id: string) => s.students.find((x) => x.id === id)?.name ?? "";

  return {
    tabs: {
      "Élèves": {
        headers: ["Nom", "Niveau", "Téléphone", "Parent", "Tél parent", "Statut", "Inscrit le"],
        rows: s.students.map((st) => [
          st.name, LEVEL_LABEL[st.level], st.phone, st.parentName, st.parentPhone, STATUS_LABEL[st.status], formatDate(st.createdAt),
        ]),
      },
      "Paiements": {
        headers: ["Élève", "Matière", "Montant", "Statut", "Mois", "Payé le"],
        rows: s.payments.map((p) => {
          const enr = s.enrollments.find((e) => e.id === p.enrollmentId);
          return [
            studentName(p.studentId), subjName(enr?.subjectId ?? ""), formatDA(p.amount),
            p.status === "paid" ? "payé" : "non payé", p.month, p.paidAt ? formatDate(p.paidAt) : "",
          ];
        }),
      },
      "Séances": {
        headers: ["Groupe", "Séance n°", "Date", "Présents"],
        rows: s.sessions
          .slice()
          .sort((a, b) => a.date - b.date)
          .map((se) => {
            const kl = s.classes.find((c) => c.id === se.classId);
            const present = Object.values(se.attendance).filter((a) => a !== "absent_free").length;
            const group = `${subjName(kl?.subjectId ?? "")}${kl ? " · " + DAY_LABEL[kl.dayOfWeek] + " " + kl.timeSlot : ""}`;
            return [group, se.sessionNumber ?? "", formatDate(se.date), present];
          }),
      },
      "Enseignants": {
        headers: ["Nom", "Matières", "Mode", "Part école"],
        rows: s.teachers.map((t) => [
          t.name, t.subjects.map(subjName).join(", "), PAYMENT_MODE_LABEL[t.paymentMode],
          t.paymentMode === "percentage" ? `${t.schoolCutValue} %` : formatDA(t.schoolCutValue),
        ]),
      },
    },
  };
}

async function push() {
  if (!SHEET_WEBHOOK_URL) return;
  try {
    await fetch(SHEET_WEBHOOK_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(buildSnapshot()) });
  } catch (e) {
    console.warn("sheet sync failed", e);
  }
}

let unsub: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let started = false;

export function startSheetSync(): void {
  if (started || DEMO_MODE || !SHEET_WEBHOOK_URL) return;
  started = true;
  void push(); // initial snapshot
  unsub = useData.subscribe(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void push(), 3000); // debounce bursts of changes
  });
}

export function stopSheetSync(): void {
  if (unsub) unsub();
  unsub = null;
  if (timer) clearTimeout(timer);
  started = false;
}
