import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, BookOpen, Search, MoreHorizontal, Users, Sparkles } from "lucide-react";
import { useData } from "../../data/store";
import { formatDate } from "../../lib/format";
import { subjectIcon, tintStyle } from "../../lib/subjectLook";
import "./subjects.css";

// Subjects are not hardcoded — admin can add/remove any subject (cahier §7).
export default function SubjectsPage() {
  const { t } = useTranslation();
  const subjects = useData((s) => s.subjects);
  const classes = useData((s) => s.classes);
  const addSubject = useData((s) => s.addSubject);
  const deleteSubject = useData((s) => s.deleteSubject);

  const [name, setName] = useState("");
  const [menu, setMenu] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Un clic hors du menu le referme : sans ça il resterait ouvert en naviguant
  // d'une carte à l'autre.
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menu]);

  function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    addSubject(trimmed);
    setName("");
  }

  function usedBy(subjectId: string) {
    return classes.filter((c) => c.subjectId === subjectId).length;
  }

  return (
    <div className="stack">
      <header className="page-head sub-head">
        <span className="sub-head-icon" aria-hidden="true"><BookOpen size={24} /></span>
        <div className="page-title">
          <h1>
            {t("nav.subjects")}
            <Sparkles className="sub-spark" size={15} aria-hidden="true" />
          </h1>
          <p>{t("sub.subtitle")}</p>
        </div>
        <ShelfArt />
        <button className="btn btn-primary" onClick={() => inputRef.current?.focus()}>
          <Plus size={17} /> {t("sub.add_one")}
        </button>
      </header>

      <div className="card sub-add">
        <div className="att-search-box sub-add-field">
          <Search size={16} aria-hidden="true" />
          <input
            ref={inputRef}
            className="input"
            placeholder={t("sub.placeholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
        </div>
        <button className="btn btn-primary" onClick={add} disabled={!name.trim()}>
          <Plus size={17} /> {t("common.add")}
        </button>
      </div>

      {subjects.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon"><BookOpen size={24} /></span>
            <strong>{t("sub.none")}</strong>
            <p>{t("sub.none_hint")}</p>
          </div>
        </div>
      ) : (
        <div className="sub-grid">
          {subjects.map((s) => {
            const count = usedBy(s.id);
            const Icon = subjectIcon(s.name);
            return (
              <article
                key={s.id}
                className={"card sub-card" + (menu === s.id ? " menu-open" : "")}
                style={tintStyle(s.name)}
              >
                <span className="sub-icon" aria-hidden="true"><Icon size={22} /></span>
                <h2 className="sub-name">{s.name}</h2>
                <p className="sub-meta">
                  {s.isCustom ? t("sub.custom") : t("sub.default")}
                  <span className="sub-dot" aria-hidden="true" />
                  {formatDate(s.createdAt)}
                </p>

                <div className="sub-card-foot">
                  <span className={"sub-count" + (count === 0 ? " empty" : "")}>
                    <Users size={13} aria-hidden="true" />
                    {count > 0 ? t("sub.used_by", { n: count }) : t("sub.no_group")}
                  </span>

                  <div className="sub-menu-wrap">
                    <button
                      className="sub-menu-btn"
                      aria-label={t("common.actions")}
                      aria-expanded={menu === s.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenu((m) => (m === s.id ? null : s.id));
                      }}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {menu === s.id && (
                      <div className="sub-menu" onClick={(e) => e.stopPropagation()}>
                        {/* Une matière rattachée à des groupes n'est pas
                            supprimable : l'entrée inerte dit pourquoi. */}
                        <button
                          className="sub-menu-item danger"
                          disabled={count > 0}
                          title={count > 0 ? t("sub.cannot_delete", { n: count }) : undefined}
                          onClick={() => { deleteSubject(s.id); setMenu(null); }}
                        >
                          <Trash2 size={15} /> {t("common.delete")}
                        </button>
                        {count > 0 && (
                          <p className="sub-menu-note">{t("sub.cannot_delete", { n: count })}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <aside className="sub-banner">
        <ClipboardArt />
        <div className="sub-banner-text">
          <h3>{t("sub.banner_title")}</h3>
          <p>{t("sub.banner_text")}</p>
        </div>
        <PlantArt />
      </aside>
    </div>
  );
}

/* -------------------------------------------------------------- illustrations
   Dessinees en SVG plutot qu'en emoji ou en image : rendu identique partout, et
   elles suivent la palette navy + or de la page vitrine. */

/** Toque et pile de livres, pour l'en-tete. */
function ShelfArt() {
  return (
    <svg className="sub-art" viewBox="0 0 140 96" fill="none" aria-hidden="true">
      <rect x="34" y="60" width="66" height="11" rx="3" fill="var(--navy-600)" />
      <rect x="30" y="71" width="74" height="11" rx="3" fill="var(--gold-400)" />
      <rect x="38" y="82" width="58" height="10" rx="3" fill="var(--sky-500)" />

      <path d="M67 44l-25-10 25-10 25 10z" fill="var(--navy-800)" />
      <path d="M53 40v10c0 4 6 7 14 7s14-3 14-7V40" fill="var(--navy-700)" />
      <path d="M92 34v14" stroke="var(--gold-400)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="92" cy="50" r="3.5" fill="var(--gold-400)" />

      <path
        d="M108 60c8-2 14-9 14-18-9 1-15 8-14 18z"
        fill="var(--sky-500)"
        opacity="0.85"
      />
      <path d="M108 60c-2-8 1-16 8-21" stroke="var(--navy-600)" strokeWidth="2" strokeLinecap="round" />

      <path d="M18 26v8M14 30h8" stroke="var(--gold-400)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="128" cy="30" r="3" fill="var(--gold-300)" />
    </svg>
  );
}

/** Presse-papiers du bandeau de bas de page. */
function ClipboardArt() {
  return (
    <svg className="sub-banner-art" viewBox="0 0 84 84" fill="none" aria-hidden="true">
      <rect x="16" y="12" width="52" height="62" rx="8" fill="var(--navy-700)" />
      <rect x="22" y="18" width="40" height="50" rx="5" fill="#fff" opacity="0.94" />
      <rect x="30" y="6" width="24" height="12" rx="5" fill="var(--gold-400)" />
      <g stroke="var(--navy-500)" strokeWidth="3" strokeLinecap="round" opacity="0.55">
        <path d="M30 32h16M30 42h22M30 52h12" />
      </g>
      <circle cx="60" cy="58" r="13" fill="var(--gold-400)" />
      <path d="M54 58l4 4 8-9" stroke="var(--navy-900)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Petite plante, contrepoint a droite du bandeau. */
function PlantArt() {
  return (
    <svg className="sub-banner-art plant" viewBox="0 0 72 84" fill="none" aria-hidden="true">
      <path d="M36 52c-2-14-10-22-22-24 1 15 9 23 22 24z" fill="var(--sky-500)" />
      <path d="M36 52c2-16 11-25 24-27-1 17-10 26-24 27z" fill="var(--navy-500)" />
      <path d="M36 54V34" stroke="var(--navy-700)" strokeWidth="3" strokeLinecap="round" />
      <path d="M18 58h36l-5 22a4 4 0 01-4 3H27a4 4 0 01-4-3z" fill="var(--gold-400)" />
      <rect x="15" y="52" width="42" height="9" rx="4" fill="var(--gold-500)" />
    </svg>
  );
}
