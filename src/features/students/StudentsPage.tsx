import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Search, Pencil, Trash2, Phone, GraduationCap } from "lucide-react";
import { useData } from "../../data/store";
import { computeStudentBilling } from "../../lib/billing";
import { formatDA } from "../../lib/format";
import { LEVELS, LEVEL_LABEL } from "../../lib/labels";
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
      <header className="page-head">
        <div className="page-title">
          <h1>{t("nav.students")}</h1>
          <p>{t("stu.count", { n: filtered.length })}</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={17} /> {t("stu.new")}
          </button>
        )}
      </header>

      <div className="toolbar">
        <div className="toolbar-search">
          <Search size={16} aria-hidden="true" />
          <input
            className="input"
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value as StudentLevel | "")}>
          <option value="">{t("stu.all_levels")}</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {LEVEL_LABEL[l]}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon"><GraduationCap size={24} /></span>
            <strong>{t("stu.none")}</strong>
            <p>{search || levelFilter ? t("stu.none_filtered") : t("stu.none_hint")}</p>
          </div>
        </div>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t("stu.name")}</th>
                <th>{t("stu.level")}</th>
                <th>{t("stu.parent")}</th>
                <th>{t("stu.status")}</th>
                <th>{t("payments.totalDue")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const due = dueFor(s);
                return (
                  <tr key={s.id}>
                    <td>
                      <div className="cell-id">
                        <span className="cell-avatar">{initials(s.name)}</span>
                        <div>
                          <strong>{s.name}</strong>
                          <a className="muted small cell-phone" href={`tel:${s.phone}`}>
                            <Phone size={12} /> {s.phone}
                          </a>
                        </div>
                      </div>
                    </td>
                    <td>{LEVEL_LABEL[s.level]}</td>
                    <td>
                      {s.parentName}
                      <a className="muted small cell-phone" href={`tel:${s.parentPhone}`}>
                        <Phone size={12} /> {s.parentPhone}
                      </a>
                    </td>
                    <td><span className={"pill " + statusClass(s.status)}>{t(`status.${s.status}`)}</span></td>
                    <td>
                      {due > 0
                        ? <span className="text-danger">{formatDA(due)}</span>
                        : <span className="text-ok">{t("stu.up_to_date")}</span>}
                    </td>
                    <td className="row-actions">
                      <button className="btn btn-ghost sm" onClick={() => setDetail(s)}>{t("stu.details")}</button>
                      {isAdmin && (
                        <>
                          <button className="icon-btn" title={t("common.edit")} onClick={() => { setEditing(s); setShowForm(true); }}>
                            <Pencil size={16} />
                          </button>
                          <button
                            className="icon-btn danger"
                            title={t("common.delete")}
                            onClick={() => confirm(t("stu.confirm_delete", { name: s.name })) && deleteStudent(s.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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

function statusClass(status: Student["status"]) {
  return status === "active" ? "pill-ok" : status === "paused" ? "pill-warn" : "pill-danger";
}

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}
