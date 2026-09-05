import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CalendarDays, Users, Wallet, CircleCheck, ArrowRight, LayoutGrid, BookOpen,
  Languages, FlaskConical, Monitor, Shapes, ArrowUpDown, CalendarClock,
  ShieldCheck, Trophy, UsersRound,
} from "lucide-react";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { defaultPrice } from "../../lib/payments";
import { formatDA } from "../../lib/format";
import { LEVEL_LABEL } from "../../lib/labels";
import { useLabels } from "../../lib/useLabels";
import { subjectFamily, subjectTint, tintStyle, type SubjectFamily } from "../../lib/subjectLook";
import type { ClassRoom } from "../../lib/types";
import "./courses.css";

/**
 * Les cours ouverts au niveau de l'eleve.
 *
 * Le filtre par niveau n'est pas un confort d'affichage : un eleve de 1AS ne
 * peut pas s'inscrire dans un groupe de 3AS, et lui montrer ces groupes ne
 * ferait que produire des demandes que l'administration devrait refuser une a
 * une. La page ne liste donc que les groupes de son niveau, et le dit quand il
 * n'y en a aucun — plutot que d'afficher une grille vide sans explication.
 *
 * Aucune donnee inventee : places restantes, horaires et tarifs sortent des
 * groupes reels. Pas de note ni de favori, rien de tel n'est enregistre.
 */

const FAMILY_ICON: Record<SubjectFamily, typeof BookOpen> = {
  maths: Shapes,
  langues: Languages,
  sciences: FlaskConical,
  info: Monitor,
  autres: BookOpen,
};

/** Ordre d'affichage des familles, du plus courant au plus rare. */
const FAMILY_ORDER: SubjectFamily[] = ["maths", "langues", "sciences", "info", "autres"];

type Sort = "az" | "places" | "price";

export default function StudentCoursesPage() {
  const { t } = useTranslation();
  const L = useLabels();
  const { profile } = useAuth();
  const { students, subjects, teachers, classes, enrollments } = useData();
  const selfEnroll = useData((s) => s.selfEnroll);

  const [family, setFamily] = useState<SubjectFamily | "all">("all");
  /** Groupe en cours d'inscription, et message d'echec le cas echeant. */
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState("");
  const [sort, setSort] = useState<Sort>("az");

  const student = students.find((s) => s.id === profile?.linkedStudentId);

  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "—";
  const teacherName = (id: string) => teachers.find((x) => x.id === id)?.name ?? "—";
  const priceOf = (c: ClassRoom) => c.pricePerSession || defaultPrice(c.sessionType, c.level) || 0;
  const seatsOf = (c: ClassRoom) => Math.max(0, c.maxStudents - c.currentStudents);

  const myClassIds = useMemo(
    () => new Set(enrollments.filter((e) => e.studentId === student?.id).map((e) => e.classId)),
    [enrollments, student]
  );

  /** Tous les groupes du niveau de l'eleve, avant filtre par famille. */
  const atMyLevel = useMemo(
    () => (student ? classes.filter((c) => c.level === student.level) : []),
    [classes, student]
  );

  /** Les familles reellement representees : une puce sans cours derriere serait
   *  une impasse, on ne l'affiche donc pas. */
  const families = useMemo(() => {
    const present = new Set(atMyLevel.map((c) => subjectFamily(subjName(c.subjectId))));
    return FAMILY_ORDER.filter((f) => present.has(f));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atMyLevel, subjects]);

  const shown = useMemo(() => {
    const list = atMyLevel.filter(
      (c) => family === "all" || subjectFamily(subjName(c.subjectId)) === family
    );
    return [...list].sort((a, b) => {
      if (sort === "places") return seatsOf(b) - seatsOf(a);
      if (sort === "price") return priceOf(a) - priceOf(b);
      return subjName(a.subjectId).localeCompare(subjName(b.subjectId));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atMyLevel, family, sort, subjects]);

  if (!student) return <p className="muted">{t("dash.no_student_link")}</p>;

  return (
    <div className="crs">
      <header className="crs-hero">
        <div className="crs-hero-text">
          <h1>
            {t("crs.title")}
            <Sparkle />
          </h1>
          <p>{t("crs.subtitle")}</p>
          {/* Le niveau est dit en clair : sans cela, une grille courte passerait
              pour un catalogue pauvre au lieu d'une selection. */}
          <span className="crs-level">
            <ShieldCheck size={14} aria-hidden="true" />
            {t("crs.your_level", { level: LEVEL_LABEL[student.level] })}
          </span>
        </div>
        <HeroArt />
      </header>

      <div className="crs-filters card">
        <div className="crs-chips">
          <button
            className={"crs-chip" + (family === "all" ? " on" : "")}
            onClick={() => setFamily("all")}
          >
            <LayoutGrid size={15} />
            <span>{t("crs.all")}</span>
            <em>{atMyLevel.length}</em>
          </button>
          {families.map((f) => {
            const Icon = FAMILY_ICON[f];
            return (
              <button
                key={f}
                className={"crs-chip" + (family === f ? " on" : "")}
                onClick={() => setFamily(family === f ? "all" : f)}
              >
                <Icon size={15} />
                <span>{t("crs.fam_" + f)}</span>
              </button>
            );
          })}
        </div>

        <label className="crs-sort">
          <ArrowUpDown size={15} aria-hidden="true" />
          <span>{t("disc.sort_by")}</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label={t("disc.sort")}>
            <option value="az">A-Z</option>
            <option value="places">{t("disc.sort_places")}</option>
            <option value="price">{t("disc.sort_price")}</option>
          </select>
        </label>
      </div>

      {failed && (
        <p className="crs-failed" role="alert">
          <ShieldCheck size={15} aria-hidden="true" /> {failed}
        </p>
      )}

      {shown.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon"><BookOpen size={24} /></span>
            <strong>{t(atMyLevel.length === 0 ? "crs.none_level" : "crs.none_family")}</strong>
            <p>
              {atMyLevel.length === 0
                ? t("crs.none_level_hint", { level: LEVEL_LABEL[student.level] })
                : t("crs.none_family_hint")}
            </p>
            {atMyLevel.length > 0 && (
              <button className="btn btn-primary sm" onClick={() => setFamily("all")}>
                {t("crs.all")}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="crs-grid">
          {shown.map((c) => {
            const name = subjName(c.subjectId);
            const tone = subjectTint(name);
            const left = seatsOf(c);
            const enrolled = myClassIds.has(c.id);
            const full = left === 0;
            return (
              <article key={c.id} className="crs-card" style={tintStyle(name)}>
                <header className="crs-card-head">
                  <span className="crs-badge">{abbrev(name)}</span>
                  <div>
                    <strong>{name}</strong>
                    <span className="crs-card-sub">
                      {L.sessionType(c.sessionType)} · {teacherName(c.teacherId)}
                    </span>
                  </div>
                </header>

                <ul className="crs-facts">
                  <li>
                    <CalendarDays size={14} />
                    {t("days." + c.dayOfWeek)} {c.timeSlot.replace("-", " - ")}
                  </li>
                  <li>
                    <Users size={14} />
                    <span className={full ? "is-full" : left <= 2 ? "is-low" : ""}>
                      {left} / {c.maxStudents}
                    </span>{" "}
                    {t("crs.places")}
                  </li>
                  <li>
                    <Wallet size={14} />
                    {formatDA(priceOf(c))} {t("pmt.per_session")}
                  </li>
                </ul>

                {enrolled ? (
                  <span className="crs-btn done">
                    <CircleCheck size={15} /> {t("crs.enrolled")}
                  </span>
                ) : full ? (
                  <span className="crs-btn full">{t("crs.full")}</span>
                ) : (
                  <button
                    className="crs-btn"
                    style={{ background: tone.fg }}
                    disabled={busy === c.id}
                    onClick={async () => {
                      // On attend la base : elle seule sait s'il reste une
                      // place, et c'est elle qui enregistre l'inscription.
                      setBusy(c.id);
                      setFailed("");
                      const ok = await selfEnroll(student.id, c.id);
                      setBusy(null);
                      if (!ok) setFailed(t("crs.enrol_failed"));
                    }}
                  >
                    <span>{busy === c.id ? t("crs.enrolling") : t("crs.enrol")}</span>
                    <ArrowRight size={15} />
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Ce que l'ecole met en avant, comme sur la page vitrine. */}
      <section className="crs-promises">
        {[
          { icon: CalendarClock, key: "flex" },
          { icon: UsersRound, key: "small" },
          { icon: ShieldCheck, key: "quality" },
          { icon: Trophy, key: "goals" },
        ].map(({ icon: Icon, key }) => (
          <div className="crs-promise" key={key}>
            <span className="crs-promise-icon"><Icon size={18} /></span>
            <div>
              <strong>{t("crs.pr_" + key)}</strong>
              <p>{t("crs.pr_" + key + "_sub")}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

/** Deux lettres pour la pastille : « Mathématiques » -> « MA », « العربية » -> « ال ». */
function abbrev(name: string): string {
  const clean = name.trim();
  return clean.slice(0, 2).toUpperCase();
}

/** Petite etincelle a cote du titre. */
function Sparkle() {
  return (
    <svg className="crs-sparkle" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2l2.2 5.6L20 10l-5.8 2.4L12 18l-2.2-5.6L4 10l5.8-2.4z" fill="var(--gold-400)" />
      <path d="M19 15l.9 2.3L22 18l-2.1.8L19 21l-.9-2.2L16 18l2.1-.7z" fill="var(--sky-500)" />
    </svg>
  );
}

/** Toque posee sur une pile de livres, comme sur la page vitrine. */
function HeroArt() {
  return (
    <svg className="crs-hero-art" viewBox="0 0 220 130" fill="none" aria-hidden="true">
      <ellipse cx="120" cy="118" rx="70" ry="7" fill="var(--navy-800)" opacity="0.08" />

      {/* La plante, a gauche de la pile. */}
      <path d="M44 116V96" stroke="var(--color-success)" strokeWidth="3" strokeLinecap="round" />
      <path d="M44 100c-9-2-13-9-12-17 8 0 13 6 12 17z" fill="var(--color-success)" opacity="0.75" />
      <path d="M44 96c8-3 11-10 9-18-8 1-12 8-9 18z" fill="var(--color-success)" opacity="0.55" />
      <path d="M34 112h20l-2 12H36z" fill="var(--gold-400)" />

      {/* Les livres. */}
      <rect x="70" y="98" width="100" height="16" rx="5" fill="var(--sky-500)" />
      <rect x="70" y="98" width="12" height="16" rx="5" fill="var(--sky-300)" />
      <rect x="78" y="82" width="86" height="16" rx="5" fill="var(--gold-400)" />
      <rect x="78" y="82" width="12" height="16" rx="5" fill="var(--gold-300)" />
      <rect x="86" y="66" width="72" height="16" rx="5" fill="var(--navy-600)" />
      <rect x="86" y="66" width="12" height="16" rx="5" fill="var(--navy-500)" />

      {/* La toque. */}
      <path d="M122 24 82 40l40 16 40-16z" fill="var(--navy-800)" />
      <path d="M100 48v13c0 7 10 12 22 12s22-5 22-12V48l-22 9z" fill="var(--navy-700)" />
      <path d="M162 40v20" stroke="var(--gold-400)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="162" cy="63" r="5" fill="var(--gold-400)" />

      <path d="M196 46l2.4 6 6 2.4-6 2.4-2.4 6-2.4-6-6-2.4 6-2.4z" fill="var(--gold-300)" />
      <circle cx="190" cy="86" r="4" fill="var(--sky-500)" opacity="0.7" />
    </svg>
  );
}
