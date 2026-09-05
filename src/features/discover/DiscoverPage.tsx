import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useSearchParams } from "react-router-dom";
import {
  Users, CalendarDays, ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Megaphone,
  Sparkles, CheckCircle2, BookOpen, ArrowUpDown, GraduationCap, Layers,
  Bookmark, BookmarkCheck, Star, Search, Armchair,
} from "lucide-react";
import { useData } from "../../data/store";
import { useAuth } from "../auth/AuthContext";
import { defaultPrice } from "../../lib/payments";
import { formatDA } from "../../lib/format";
import { dayEnum } from "../../lib/digest";
import { subjectIcon, subjectTint, tintStyle } from "../../lib/subjectLook";
import ContactCard from "./ContactCard";
import type { ClassRoom, StudentLevel } from "../../lib/types";
import "./discover.css";

/**
 * Page de decouverte : les enseignants, puis l'offre de cours, avec le bouton
 * qui reserve une place.
 *
 * Elle sert deux publics avec le meme ecran :
 *   - mode="student" : eleve valide. « Reserver » l'inscrit reellement.
 *   - mode="guest"   : compte encore en attente de validation. Il n'a pas de
 *     fiche eleve, donc pas d'inscription possible ; sa selection est gardee
 *     sur sa demande d'inscription et devient une inscription des que
 *     l'administration valide le compte. C'est ce qui permet de consulter les
 *     matieres et les enseignants, et de choisir ses groupes, sans attendre.
 *
 * Aucune donnee n'est inventee : ni note ni nombre d'avis, la reputation d'un
 * enseignant n'est mesuree nulle part dans l'application. Les chiffres affiches
 * (creneaux, places restantes, prix de depart) sortent des groupes reels.
 */

/** Les quatre familles du filtre : les trois cycles algeriens, puis tout ce qui
 *  n'est pas un groupe ordinaire (cours particulier, groupe special, ete). */
type Cycle = "all" | "ap" | "am" | "as" | "special";

const CYCLES: { key: Cycle; labelKey: string }[] = [
  { key: "all", labelKey: "disc.cycle_all" },
  { key: "ap", labelKey: "disc.cycle_ap" },
  { key: "am", labelKey: "disc.cycle_am" },
  { key: "as", labelKey: "disc.cycle_as" },
  { key: "special", labelKey: "disc.cycle_special" },
];

function cycleOf(c: ClassRoom): Cycle {
  if (c.sessionType !== "group") return "special";
  return c.level.slice(1) as Cycle;
}

type Sort = "places" | "price" | "new";

/**
 * Une offre = une matiere, avec un enseignant, a un niveau.
 *
 * C'est l'unite que choisit un eleve : il veut « les maths de 2AS avec
 * M. Ahmed », puis il regarde quel horaire lui convient. Les groupes de la base
 * sont donc regroupes ici, et chacun devient une pastille de creneau sur la
 * ligne — un meme cours ouvert lundi ET mercredi se lit d'un coup d'oeil, au
 * lieu d'occuper deux lignes presque identiques.
 */
interface Offer {
  key: string;
  subjectId: string;
  teacherId: string;
  level: StudentLevel;
  cycle: Cycle;
  slots: ClassRoom[];
  seatsLeft: number;
  seatsTotal: number;
  price: number;
  newest: number;
}

/** Depuis combien de temps, en une ou deux lettres : 3h, 2j, 1sem. */
function ago(t: (k: string, o?: Record<string, unknown>) => string, ms: number): string {
  const mins = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (mins < 60) return t("disc.ago_now");
  const h = Math.round(mins / 60);
  if (h < 24) return t("disc.ago_h", { n: h });
  const d = Math.round(h / 24);
  if (d < 7) return t("disc.ago_d", { n: d });
  return t("disc.ago_w", { n: Math.round(d / 7) });
}

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

export default function DiscoverPage({ mode = "student" }: { mode?: "student" | "guest" }) {
  const { t, i18n } = useTranslation();
  const { profile, uid } = useAuth();
  const { students, subjects, teachers, classes, enrollments, notifications, registrationRequests } = useData();
  const selfEnroll = useData((s) => s.selfEnroll);
  const toggleWantedClass = useData((s) => s.toggleWantedClass);

  const [params, setParams] = useSearchParams();
  /** Amorcee par ?q= (lien entrant), puis pilotee par le champ de la carte. */
  const [term, setTerm] = useState(params.get("q") ?? "");

  /**
   * La recherche de la barre du haut navigue vers /?q=... Sans cette
   * synchronisation, une recherche lancee alors qu'on est DEJA sur cette page
   * ne changeait rien : le composant n'etant pas remonte, l'etat initial
   * restait celui du premier rendu. C'est le cas normal sur telephone, ou la
   * recherche de l'en-tete est le seul champ disponible.
   */
  const urlQuery = params.get("q") ?? "";
  useEffect(() => {
    setTerm(urlQuery);
  }, [urlQuery]);
  const q = term.trim().toLowerCase();
  const [cycle, setCycle] = useState<Cycle>("all");
  const [subjectId, setSubjectId] = useState("all");
  const [sort, setSort] = useState<Sort>("places");
  /** Pose par « Voir ses groupes » : la liste du bas se replie sur un enseignant. */
  const [onlyTeacher, setOnlyTeacher] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  /** Creneau retenu sur chaque ligne, quand l'offre en propose plusieurs. */
  const [picked, setPicked] = useState<Record<string, string>>({});
  /** Creneau en cours de reservation, et message d'echec le cas echeant. */
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState("");
  const rail = useRef<HTMLDivElement>(null);
  /** Le bouton de defilement n'a de sens que si la rangee deborde vraiment. */
  const [railOverflows, setRailOverflows] = useState(false);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const check = () => setRailOverflows(el.scrollWidth > el.clientWidth + 4);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  });

  const student = students.find((s) => s.id === profile?.linkedStudentId);
  const myRequest = registrationRequests.find((r) => r.id === uid);
  const wanted = myRequest?.wantedClassIds ?? [];

  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "—";
  const teacherName = (id: string) => teachers.find((x) => x.id === id)?.name ?? "—";
  const priceOf = (c: ClassRoom) => c.pricePerSession || defaultPrice(c.sessionType, c.level) || 0;
  const seatsOf = (c: ClassRoom) => Math.max(0, c.maxStudents - c.currentStudents);

  const myClassIds = useMemo(
    () => new Set(enrollments.filter((e) => e.studentId === student?.id).map((e) => e.classId)),
    [enrollments, student]
  );
  const takenIds = mode === "guest" ? new Set(wanted) : myClassIds;

  /** Groupes retenus par les filtres, avant regroupement en offres. */
  const visible = useMemo(
    () =>
      classes.filter((c) => {
        if (cycle !== "all" && cycleOf(c) !== cycle) return false;
        if (subjectId !== "all" && c.subjectId !== subjectId) return false;
        if (onlyTeacher && c.teacherId !== onlyTeacher) return false;
        if (q) {
          const hay = `${subjName(c.subjectId)} ${teacherName(c.teacherId)}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [classes, cycle, subjectId, onlyTeacher, q, subjects, teachers]
  );

  const offers = useMemo(() => {
    const by = new Map<string, ClassRoom[]>();
    for (const c of visible) {
      const key = `${c.subjectId}|${c.teacherId}|${c.level}`;
      by.set(key, [...(by.get(key) ?? []), c]);
    }
    const list: Offer[] = [...by.entries()].map(([key, slots]) => ({
      key,
      subjectId: slots[0].subjectId,
      teacherId: slots[0].teacherId,
      level: slots[0].level,
      cycle: cycleOf(slots[0]),
      slots: [...slots].sort((a, b) => a.timeSlot.localeCompare(b.timeSlot)),
      seatsLeft: slots.reduce((n, c) => n + seatsOf(c), 0),
      seatsTotal: slots.reduce((n, c) => n + c.maxStudents, 0),
      price: Math.min(...slots.map(priceOf)),
      newest: Math.max(...slots.map((c) => c.createdAt)),
    }));
    return list.sort((a, b) => {
      if (sort === "price") return a.price - b.price;
      if (sort === "new") return b.newest - a.newest;
      return b.seatsLeft - a.seatsLeft;
    });
  }, [visible, sort]);

  const shown = showAll ? offers : offers.slice(0, 4);

  /** Un enseignant n'apparait que s'il anime au moins un groupe visible :
   *  une fiche sans aucun creneau derriere serait une impasse. */
  const teacherCards = useMemo(() => {
    const by = new Map<string, ClassRoom[]>();
    for (const c of visible) by.set(c.teacherId, [...(by.get(c.teacherId) ?? []), c]);
    return [...by.entries()]
      .map(([id, list]) => ({
        id,
        name: teachers.find((x) => x.id === id)?.name ?? "—",
        subjects: [...new Set(list.map((c) => subjName(c.subjectId)))],
        groups: list.length,
        seats: list.reduce((n, c) => n + seatsOf(c), 0),
        from: Math.min(...list.map(priceOf)),
      }))
      .sort((a, b) => b.groups - a.groups);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, teachers, subjects]);

  /** Agenda reel : les sept prochains jours, a partir des groupes suivis. */
  const agenda = useMemo(() => {
    if (!student) return [];
    const mine = classes.filter((c) => myClassIds.has(c.id));
    const out: { key: string; when: string; c: ClassRoom }[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today.getTime() + i * 86_400_000);
      const day = dayEnum(d);
      const when =
        i === 0
          ? t("disc.today")
          : i === 1
          ? t("disc.tomorrow")
          : new Intl.DateTimeFormat(i18n.language, { weekday: "long", day: "numeric", month: "short" }).format(d);
      for (const c of mine.filter((x) => x.dayOfWeek === day).sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))) {
        out.push({ key: `${i}-${c.id}`, when, c });
      }
    }
    return out.slice(0, 5);
  }, [student, classes, myClassIds, i18n.language, t]);

  /** Annonces : les messages recus, completes par les groupes ouverts
   *  recemment. Rien de scripte — sans rien a annoncer, la carte le dit. */
  const annonces = useMemo(() => {
    const mine = notifications
      .filter((n) => n.userId === profile?.id)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 2)
      .map((n) => ({ id: n.id, tone: "gold" as const, title: t("disc.ann_message"), body: n.message, at: n.createdAt }));
    const fresh = [...classes]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 3 - mine.length)
      .map((c) => ({
        id: "c" + c.id,
        tone: "sky" as const,
        title: t("disc.ann_new_group"),
        body: `${subjName(c.subjectId)} · ${t("days." + c.dayOfWeek)} ${c.timeSlot}`,
        at: c.createdAt,
      }));
    return [...mine, ...fresh];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications, profile?.id, classes, subjects, t]);

  /** Le creneau retenu sur une ligne : celui choisi, sinon le premier ou il
   *  reste de la place, sinon le premier tout court. */
  function slotOf(o: Offer): ClassRoom {
    return o.slots.find((c) => c.id === picked[o.key]) ?? o.slots.find((c) => seatsOf(c) > 0) ?? o.slots[0];
  }

  async function reserve(c: ClassRoom) {
    if (mode === "guest") {
      if (uid) toggleWantedClass(uid, c.id);
      return;
    }
    if (!student) return;
    // On attend la reponse de la base plutot que d'afficher « Inscrit(e) » sur
    // la foi d'une ecriture locale : c'est elle qui compte les places.
    setBusy(c.id);
    setFailed("");
    const ok = await selfEnroll(student.id, c.id);
    setBusy(null);
    if (!ok) setFailed(t("crs.enrol_failed"));
  }

  const hasFilter = cycle !== "all" || subjectId !== "all" || !!onlyTeacher || !!q;
  function clearFilters() {
    setCycle("all");
    setSubjectId("all");
    setOnlyTeacher(null);
    setTerm("");
    if (params.get("q")) {
      params.delete("q");
      setParams(params, { replace: true });
    }
  }

  return (
    <div className="disc">
      {/* ---------------------------------------------------------- filtres */}
      {/* Deux lignes, comme un formulaire de recherche administratif : le cycle
          et le texte d'abord, la matiere et le tri ensuite. */}
      <div className="disc-filters card">
        <div className="disc-filter-row">
          <div className="disc-chips">
            {CYCLES.map((c) => (
              <button
                key={c.key}
                className={"disc-chip" + (cycle === c.key ? " on" : "")}
                onClick={() => setCycle(c.key)}
              >
                {c.key === "special" ? <Sparkles size={15} /> : c.key === "all" ? <Users size={15} /> : <GraduationCap size={15} />}
                <span>{t(c.labelKey)}</span>
                {c.key === "all" && <em className="disc-chip-n">{classes.length}</em>}
              </button>
            ))}
          </div>

          <label className="disc-search">
            <Search size={15} aria-hidden="true" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder={t("disc.search_ph")}
              aria-label={t("disc.search_ph")}
            />
          </label>
        </div>

        <div className="disc-filter-row">
          <span className="disc-filter-k">{t("disc.subjects_k")}</span>
          <div className="disc-chips subjects">
            <button
              className={"disc-pill" + (subjectId === "all" ? " on" : "")}
              onClick={() => setSubjectId("all")}
            >
              {t("disc.all_subjects")}
            </button>
            {subjects.map((sub) => (
              <button
                key={sub.id}
                className={"disc-pill" + (subjectId === sub.id ? " on" : "")}
                style={tintStyle(sub.name)}
                onClick={() => setSubjectId(subjectId === sub.id ? "all" : sub.id)}
              >
                {sub.name}
              </button>
            ))}
          </div>

          <label className="disc-select">
            <ArrowUpDown size={15} aria-hidden="true" />
            <span className="disc-select-k">{t("disc.sort_by")}</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label={t("disc.sort")}>
              <option value="places">{t("disc.sort_places")}</option>
              <option value="price">{t("disc.sort_price")}</option>
              <option value="new">{t("disc.sort_new")}</option>
            </select>
          </label>
        </div>
      </div>

      {failed && (
        <p className="disc-failed" role="alert">{failed}</p>
      )}

      <div className="disc-body">
        <div className="disc-main">
          {/* ------------------------------------------------- enseignants */}
          <div className="disc-sec-head">
            <span className="disc-sec-icon"><Users size={18} /></span>
            <div>
              <h2>{t("disc.teachers_title")}</h2>
              <p>
                {t("disc.teachers_sub")}
                <Star size={13} className="disc-twinkle" aria-hidden="true" />
              </p>
            </div>
            <div className="disc-sec-end">
              {onlyTeacher && (
                <button className="disc-clear" onClick={() => setOnlyTeacher(null)}>{t("disc.all_teachers")}</button>
              )}
              {railOverflows && (
                <>
                  <button
                    className="disc-rail-btn"
                    onClick={() => rail.current?.scrollBy({ left: -rail.current.clientWidth * 0.8, behavior: "smooth" })}
                    aria-label={t("disc.prev_teachers")}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    className="disc-rail-btn"
                    onClick={() => rail.current?.scrollBy({ left: rail.current.clientWidth * 0.8, behavior: "smooth" })}
                    aria-label={t("disc.more_teachers")}
                  >
                    <ChevronRight size={16} />
                  </button>
                </>
              )}
            </div>
          </div>

          {teacherCards.length === 0 ? (
            <div className="card disc-empty">
              <BookOpen size={22} />
              <strong>{t("disc.none_title")}</strong>
              <p>{t("disc.none_body")}</p>
              {hasFilter && (
                <button className="btn btn-primary sm" onClick={clearFilters}>{t("disc.reset")}</button>
              )}
            </div>
          ) : (
            <div className="disc-rail">
              <div className="disc-teachers" ref={rail}>
                {teacherCards.map((tc) => {
                  const tone = subjectTint(tc.subjects[0] ?? tc.name);
                  const on = onlyTeacher === tc.id;
                  return (
                    <article
                      key={tc.id}
                      className={"disc-teacher" + (on ? " on" : "")}
                      style={tintStyle(tc.subjects[0] ?? tc.name)}
                    >
                      <div className="disc-teacher-top">
                        <span className="disc-ava">{initials(tc.name)}</span>
                        <em className="disc-teacher-badge">{t("disc.n_groups", { n: tc.groups })}</em>
                      </div>
                      <strong className="disc-teacher-name">{tc.name}</strong>
                      <span className="disc-teacher-subj">{tc.subjects.slice(0, 2).join(" · ")}</span>
                      <div className="disc-teacher-facts">
                        <span><Users size={13} /> {t("disc.n_seats", { n: tc.seats })}</span>
                      </div>
                      <span className="disc-teacher-price">
                        {t("disc.from")} <b>{formatDA(tc.from)}</b>{t("pmt.per_session")}
                      </span>
                      <button
                        className={"disc-teacher-btn" + (on ? " on" : "")}
                        style={on ? { background: tone.fg } : undefined}
                        onClick={() => setOnlyTeacher(on ? null : tc.id)}
                      >
                        <span>{t("disc.see_groups")}</span>
                        <ArrowRight size={14} />
                      </button>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------ groupes */}
          {offers.length > 0 && (
            <>
              <div className="disc-sec-head">
                <span className="disc-sec-icon gold"><Layers size={18} /></span>
                <div>
                  <h2>{t("disc.groups_title")}</h2>
                  <p>{t("disc.groups_sub")}</p>
                </div>
                {offers.length > shown.length && (
                  <button className="disc-clear" onClick={() => setShowAll(true)}>
                    {t("dash.see_all")} <ArrowRight size={13} />
                  </button>
                )}
              </div>

              <div className="disc-groups">
                {shown.map((o) => {
                  const name = subjName(o.subjectId);
                  const Icon = subjectIcon(name);
                  const tone = subjectTint(name);
                  const slot = slotOf(o);
                  const enrolled = o.slots.some((c) => takenIds.has(c.id));
                  const full = o.seatsLeft === 0;
                  return (
                    <article key={o.key} className="disc-group" style={tintStyle(name)}>
                      <span className="disc-group-tile"><Icon size={24} /></span>

                      <div className="disc-group-id">
                        <strong>{name} — {t("disc.year_" + o.level[0])}</strong>
                        <span className="disc-group-teacher">
                          <span className="disc-mini-ava">{initials(teacherName(o.teacherId))}</span>
                          {t("disc.with")} {teacherName(o.teacherId)}
                        </span>
                        <span className="disc-group-level">{t("disc.cycle_" + o.cycle)}</span>
                      </div>

                      <div className="disc-group-fact disc-fact-level">
                        <span className="disc-fact-k">{t("disc.level")}</span>
                        <b>{t("disc.year_" + o.level[0])}</b>
                      </div>

                      <div className="disc-group-fact disc-fact-seats">
                        <span className="disc-fact-k">{t("disc.seats_left")}</span>
                        <b className={full ? "is-full" : o.seatsLeft <= 2 ? "is-low" : ""}>
                          {o.seatsLeft} / {o.seatsTotal}
                        </b>
                      </div>

                      {/* Un cours ouvert plusieurs fois dans la semaine se choisit
                          ici : chaque pastille est un groupe reel, et celle qui est
                          complete le dit au lieu d'echouer au clic. */}
                      <div className="disc-group-fact disc-fact-slot">
                        <span className="disc-fact-k">{t("disc.slots")}</span>
                        <div className="disc-slots">
                          {o.slots.map((c) => {
                            const left = seatsOf(c);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                disabled={left === 0 && !takenIds.has(c.id)}
                                className={
                                  "disc-slot" + (c.id === slot.id ? " on" : "") + (left === 0 ? " full" : "")
                                }
                                onClick={() => setPicked((p) => ({ ...p, [o.key]: c.id }))}
                                title={left === 0 ? t("crs.full") : t("disc.n_seats", { n: left })}
                              >
                                <em>{t("days." + c.dayOfWeek).slice(0, 3)}</em>
                                {c.timeSlot}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="disc-group-price">
                        <b>{formatDA(o.price)}</b>
                        <span>{t("pmt.per_session")}</span>
                      </div>

                      {enrolled ? (
                        <span className="disc-book done">
                          {mode === "guest" ? <BookmarkCheck size={15} /> : <CheckCircle2 size={15} />}
                          {mode === "guest" ? t("disc.reserved") : t("crs.enrolled")}
                        </span>
                      ) : full ? (
                        <span className="disc-book full">{t("crs.full")}</span>
                      ) : (
                        // Le bouton prend la teinte de la matiere : la ligne se lit
                        // d'un bloc, pastille et action de la meme couleur.
                        <button
                          className="disc-book"
                          style={{ background: tone.fg }}
                          disabled={busy === slot.id}
                          onClick={() => reserve(slot)}
                        >
                          {mode === "guest" ? <Bookmark size={15} /> : <CheckCircle2 size={15} />}
                          {busy === slot.id ? t("crs.enrolling") : t("disc.book")}
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>

              {offers.length > shown.length && (
                <button className="disc-more" onClick={() => setShowAll(true)}>
                  <span>{t("disc.see_more")}</span>
                  <ChevronDown size={16} />
                </button>
              )}
            </>
          )}
        </div>

        {/* ------------------------------------------------ colonne de droite */}
        <aside className="disc-side">
          <section className="card disc-panel">
            <header className="disc-panel-head">
              <span className="disc-panel-icon"><CalendarDays size={16} /></span>
              <h3>{mode === "guest" ? t("disc.my_picks") : t("disc.my_agenda")}</h3>
              {mode === "guest" ? (
                <span className="disc-panel-n">{t("disc.n_groups", { n: wanted.length })}</span>
              ) : (
                <NavLink to="/attendance">{t("dash.see_all")}</NavLink>
              )}
            </header>

            {mode === "guest" ? (
              wanted.length === 0 ? (
                <div className="disc-picks-empty">
                  <span className="disc-picks-icon" aria-hidden="true"><Armchair size={22} /></span>
                  <strong>{t("disc.picks_empty")}</strong>
                  <p>{t("disc.picks_empty_hint")}</p>
                </div>
              ) : (
                <div className="disc-agenda">
                  {wanted.map((id) => {
                    const c = classes.find((x) => x.id === id);
                    if (!c) return null;
                    return (
                      <div className="disc-ag-row" key={id} style={tintStyle(subjName(c.subjectId))}>
                        <span className="disc-ag-time">{c.timeSlot.split("-")[0]}</span>
                        <span className="disc-ag-dot" />
                        <div>
                          <strong>{subjName(c.subjectId)} — {t("disc.year_" + c.level[0])}</strong>
                          <span>{t("days." + c.dayOfWeek)} · {teacherName(c.teacherId)}</span>
                        </div>
                      </div>
                    );
                  })}
                  <p className="disc-panel-note">{t("disc.picks_note")}</p>
                </div>
              )
            ) : agenda.length === 0 ? (
              <p className="disc-panel-empty">{t("disc.agenda_empty")}</p>
            ) : (
              <div className="disc-agenda">
                {agenda.map((a, i) => (
                  <div key={a.key}>
                    {(i === 0 || agenda[i - 1].when !== a.when) && <h4 className="disc-ag-day">{a.when}</h4>}
                    <div className="disc-ag-row" style={tintStyle(subjName(a.c.subjectId))}>
                      <span className="disc-ag-time">{a.c.timeSlot.split("-")[0]}</span>
                      <span className="disc-ag-dot" />
                      <div>
                        <strong>{subjName(a.c.subjectId)} — {t("disc.year_" + a.c.level[0])}</strong>
                        <span>{teacherName(a.c.teacherId)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <NavLink to="/attendance" className="disc-panel-btn">{t("disc.my_attendance")}</NavLink>
              </div>
            )}
          </section>

          <section className="card disc-panel">
            <header className="disc-panel-head">
              <span className="disc-panel-icon gold"><Megaphone size={16} /></span>
              <h3>{t("disc.news")}</h3>
              {mode === "student" && <NavLink to="/notifications">{t("dash.see_all")}</NavLink>}
            </header>
            {annonces.length === 0 ? (
              <p className="disc-panel-empty">{t("disc.news_empty")}</p>
            ) : (
              <div className="disc-news">
                {annonces.map((a) => (
                  <div className={"disc-news-row tone-" + a.tone} key={a.id}>
                    <span className="disc-news-icon">
                      {a.tone === "gold" ? <Megaphone size={15} /> : <Sparkles size={15} />}
                    </span>
                    <div>
                      <strong>{a.title}</strong>
                      <p>{a.body}</p>
                    </div>
                    <span className="disc-news-age">{ago(t, a.at)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Les coordonnees de l'ecole, listees et cliquables : voir le
              commentaire de ContactCard. */}
          <ContactCard />
        </aside>
      </div>
    </div>
  );
}

