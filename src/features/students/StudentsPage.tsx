import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useData } from "../../data/store";
import { computeStudentBilling } from "../../lib/billing";
import { formatDA } from "../../lib/format";
import { LEVELS, LEVEL_LABEL, STATUS_LABEL } from "../../lib/labels";
import { useAuth } from "../auth/AuthContext";
import StudentForm, { type StudentFormValues } from "./StudentForm";
import StudentDetail from "./StudentDetail";
import type { Student, StudentLevel } from "../../lib/types";

export default function StudentsPage() {
  const { t } = useTranslation();
  const { role, profile } = useAuth();
  const { students, subjects, teachers, classes, enrollments, sessions, payments } = useData();
  const addStudent = useData((s) => s.addStudent);
  const updateStudent = useData((s) => s.updateStudent);
  const deleteStudent = useData((s) => s.deleteStudent);

  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [levelFilter, setLevelFilter] = useState<StudentLevel | "">("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [detail, setDetail] = useState<Student | null>(null);

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

  function dueFor(student: Student) {
    return computeStudentBilling(student, enrollments, sessions, payments, { subjects, teachers })
      .totalDue;
  }

  function onSave(values: StudentFormValues) {
    if (editing) updateStudent(editing.id, values);
    else addStudent(values);
    setShowForm(false);
    setEditing(null);
  }

  return (
    <div className="stack">
      <div className="page-head">
        <h1>{t("nav.students")}</h1>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
            ＋ Nouvel étudiant
          </button>
        )}
      </div>

      <div className="toolbar">
        <input
          className="input"
          placeholder={t("common.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value as StudentLevel | "")}>
          <option value="">Tous les niveaux</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {LEVEL_LABEL[l]}
            </option>
          ))}
        </select>
      </div>

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Niveau</th>
              <th>Parent</th>
              <th>Statut</th>
              <th>Total dû</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const due = dueFor(s);
              return (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong><div className="muted small">📞 {s.phone}</div></td>
                  <td>{LEVEL_LABEL[s.level]}</td>
                  <td>{s.parentName}<div className="muted small">{s.parentPhone}</div></td>
                  <td><span className={"pill " + statusClass(s.status)}>{STATUS_LABEL[s.status]}</span></td>
                  <td>{due > 0 ? <span className="text-danger">{formatDA(due)}</span> : <span className="text-ok">À jour</span>}</td>
                  <td className="row-actions">
                    <button className="btn btn-ghost sm" onClick={() => setDetail(s)}>Détails</button>
                    {isAdmin && (
                      <>
                        <button className="icon-btn" title={t("common.edit")} onClick={() => { setEditing(s); setShowForm(true); }}>✏️</button>
                        <button className="icon-btn danger" title={t("common.delete")} onClick={() => confirm(`Supprimer ${s.name} ?`) && deleteStudent(s.id)}>🗑</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="muted center">Aucun étudiant.</td></tr>
            )}
          </tbody>
        </table>
      </div>

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

function statusClass(status: Student["status"]) {
  return status === "active" ? "pill-ok" : status === "paused" ? "pill-warn" : "pill-danger";
}
