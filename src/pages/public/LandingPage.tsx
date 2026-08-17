import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  Phone, Mail, MapPin, Star, ArrowRight, Play, Globe, ChevronDown, Menu, X,
  GraduationCap, Users, Trophy, Heart, BookOpen, UserRound, ShieldCheck,
  Backpack, PenLine, Send, Lock, Sparkles, Target, HeartHandshake, Check,
} from "lucide-react";
import { useData } from "../../data/store";
import { sendContactEmail, SCHOOL_EMAIL } from "../../lib/email";
import { EMAIL_ENABLED } from "../../lib/config";
import "./landing.css";

const PHONE_DISPLAY = "055 33 66 204";
const PHONE_HREF = "tel:+213553366204";
const MAPS_URL = "https://www.google.com/maps/search/?api=1&query=Cit%C3%A9+Daksi%2C+Constantine%2C+Alg%C3%A9rie";

/** Sections the sticky nav tracks and highlights while scrolling. */
const SECTIONS = [
  { id: "hero", labelKey: "hz.nav.hero" },
  { id: "about", labelKey: "hz.nav.about" },
  { id: "programmes", labelKey: "hz.nav.programmes" },
  { id: "methodes", labelKey: "hz.nav.methodes" },
  { id: "news", labelKey: "hz.nav.news" },
  { id: "contact", labelKey: "hz.nav.contact" },
] as const;

const LANGS = [
  { code: "fr", label: "FR" },
  { code: "ar", label: "AR" },
  { code: "en", label: "EN" },
] as const;

const STATS = [
  { icon: GraduationCap, key: "programmes", val: "15+", label: "Programmes variés", tone: "gold" },
  { icon: Users, key: "students", val: "500+", label: "Élèves accompagnés", tone: "navy" },
  { icon: Trophy, key: "success", val: "98%", label: "Taux de réussite", tone: "green" },
  { icon: Heart, key: "years", val: "4+", label: "Années d'expérience", tone: "violet" },
] as const;

const PROGRAMMES = [
  {
    key: "primaire",
    title: "Primaire",
    age: "6 – 11 ans",
    icon: Backpack,
    photo: "/primaire_photo.png",
    tone: "gold",
    points: ["Renforcement des bases", "Aide aux devoirs", "Méthodes ludiques"],
  },
  {
    key: "moyen",
    title: "Collège",
    age: "11 – 15 ans",
    icon: BookOpen,
    photo: "/college_photo.png",
    tone: "navy",
    points: ["Soutien scolaire", "Préparation aux examens", "Méthodes de travail"],
  },
  {
    key: "lycee",
    title: "Lycée",
    age: "15 – 18 ans",
    icon: GraduationCap,
    photo: "/lycee_photo.png",
    tone: "green",
    points: ["Préparation Bac", "Spécialités & options", "Orientation scolaire"],
  },
  {
    key: "soutien",
    title: "Soutien scolaire",
    age: "Tous niveaux",
    icon: PenLine,
    photo: "/soutien_scolaire_photo.png",
    tone: "violet",
    points: ["Accompagnement personnalisé", "Remise à niveau", "Suivi régulier"],
  },
] as const;

const METHODS = [
  { key: "small_groups", icon: Users },
  { key: "tracking", icon: Target },
  { key: "caring", icon: HeartHandshake },
  { key: "modern", icon: Sparkles },
] as const;

function PaperPlaneDoodle() {
  return (
    <svg className="hz-doodle-plane" viewBox="0 0 160 90" fill="none" aria-hidden="true">
      <path
        d="M10 80 C 45 75, 70 50, 85 30 C 95 18, 115 15, 130 20"
        stroke="#eab308"
        strokeWidth="1.8"
        strokeDasharray="4 4"
        strokeLinecap="round"
      />
      <g transform="translate(125, 8) rotate(-10)">
        <polygon points="0,18 28,0 12,24" fill="#f59e0b" />
        <polygon points="12,24 28,0 20,28" fill="#d97706" />
        <polygon points="12,24 14,32 17,26" fill="#b45309" />
      </g>
    </svg>
  );
}

function DotsGridPattern({ cols = 4, rows = 3 }: { cols?: number; rows?: number }) {
  return (
    <div
      className="hz-dots-grid"
      style={{
        gridTemplateColumns: `repeat(${cols}, 5px)`,
        gridTemplateRows: `repeat(${rows}, 5px)`,
      }}
      aria-hidden="true"
    >
      {Array.from({ length: cols * rows }).map((_, i) => (
        <span key={i} className="hz-dot" />
      ))}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="hz">
      <LandingNav />
      <Hero />
      <About />
      <Programmes />
      <Methods />
      <Contact />
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ Nav */

function LandingNav() {
  const { t, i18n } = useTranslation();
  const [active, setActive] = useState<string>("hero");
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0.1, 0.5, 1] }
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const current = LANGS.find((l) => l.code === i18n.language) ?? LANGS[0];

  return (
    <header className="hz-nav">
      <a href="#hero" className="hz-brand">
        <img src="/horizon_H_logo.png" alt="" width={44} height={44} />
        <span className="hz-brand-text">
          <strong>HORIZON</strong>
          <em>SKILLS ACADEMY</em>
        </span>
      </a>

      <nav className={"hz-nav-links" + (menuOpen ? " open" : "")}>
        {SECTIONS.map(({ id, labelKey }) => (
          <a
            key={id}
            href={`#${id}`}
            className={active === id ? "active" : undefined}
            onClick={() => setMenuOpen(false)}
          >
            {t(labelKey)}
          </a>
        ))}
      </nav>

      <div className="hz-nav-actions">
        <a href={PHONE_HREF} className="hz-pill hz-pill-phone">
          <Phone size={15} className="hz-phone-icon" />
          <span>{PHONE_DISPLAY}</span>
        </a>

        <a href="/auth" className="hz-pill hz-pill-navy">
          <UserRound size={15} />
          <span>{t("nav.login")}</span>
        </a>

        <div className="hz-lang">
          <button
            className="hz-pill hz-pill-ghost"
            onClick={() => setLangOpen((o) => !o)}
            aria-expanded={langOpen}
            aria-haspopup="listbox"
          >
            <Globe size={15} />
            <span>{current.label}</span>
            <ChevronDown size={14} className="hz-lang-caret" />
          </button>
          {langOpen && (
            <>
              <div className="hz-lang-backdrop" onClick={() => setLangOpen(false)} />
              <ul className="hz-lang-menu" role="listbox">
                {LANGS.map((l) => (
                  <li key={l.code}>
                    <button
                      role="option"
                      aria-selected={l.code === current.code}
                      className={l.code === current.code ? "on" : undefined}
                      onClick={() => {
                        i18n.changeLanguage(l.code);
                        setLangOpen(false);
                      }}
                    >
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <button className="hz-burger" onClick={() => setMenuOpen((o) => !o)} aria-label={t("nav.menu")}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ Hero */

function Hero() {
  const { t } = useTranslation();
  return (
    <section className="hz-hero" id="hero">
      <div className="hz-hero-inner">
        <div className="hz-hero-copy">
          <div className="hz-eyebrow">
            <Star size={14} className="hz-eyebrow-star" fill="currentColor" />
            <span>UNE ÉCOLE DE LANGUES ET DE SOUTIEN SCOLAIRE</span>
          </div>

          <h1 className="hz-title">
            Apprendre aujourd'hui,
            <br />
            créer <span className="hz-script-wrap"><em className="hz-script">demain.</em><span className="hz-brush-stroke" /></span>
          </h1>

          <p className="hz-lead">
            De la primaire au lycée, en passant par le soutien scolaire, <strong>Horizon Skills Academy</strong> accompagne chaque élève vers l'excellence avec bienveillance et innovation.
          </p>

          <div className="hz-cta-row">
            <a href="#programmes" className="hz-btn hz-btn-gold">
              <span>Découvrir nos programmes</span>
              <ArrowRight size={18} className="hz-btn-arrow" />
            </a>
            <a href="#about" className="hz-btn hz-btn-plain">
              <span className="hz-play"><Play size={14} fill="currentColor" /></span>
              <span>Voir la vidéo</span>
            </a>
          </div>
        </div>

        <div className="hz-hero-art">
          <PaperPlaneDoodle />
          <DotsGridPattern cols={4} rows={3} />

          <img src="/climb2_clean.png" alt={t("hz.hero.art_alt")} className="hz-hero-img" width={1536} height={1024} />

          <div className="hz-hero-script" aria-hidden="true">
            <span className="hz-word">Apprendre</span>
            <span className="hz-word">Explorer</span>
            <span className="hz-word">Grandir</span>
            <span className="hz-word hz-word-accent">
              Réussir
              <svg className="hz-word-underline" viewBox="0 0 70 8" fill="none">
                <path d="M2 3 Q 35 7, 68 2" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M8 6 Q 35 9, 60 5" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <div className="hz-birds">
              <svg width="34" height="20" viewBox="0 0 34 20" fill="none">
                <path d="M2 10 Q 7 3, 12 10 Q 17 3, 22 10" stroke="#0f2547" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
                <path d="M16 6 Q 19 1, 23 6 Q 27 1, 30 6" stroke="#0f2547" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
              </svg>
            </div>
          </div>

          <figure className="hz-hero-card">
            <span className="hz-hero-card-mark"><ShieldCheck size={20} /></span>
            <figcaption>
              <p>
                <strong>Un accompagnement personnalisé</strong> pour révéler le potentiel de chaque élève.
              </p>
              <div className="hz-hero-card-foot">
                <span className="hz-avatars" aria-hidden="true">
                  <img src="/kids.jpg" alt="" />
                  <img src="/caring_community.jpg" alt="" />
                  <img src="/teacher_classroom.jpg" alt="" />
                </span>
                <span className="hz-hero-card-pill">
                  <strong>+500 élèves</strong> déjà inscrits
                </span>
              </div>
            </figcaption>
          </figure>
        </div>
      </div>

      {/* Floating stats strip */}
      <dl className="hz-stats">
        {STATS.map(({ icon: Icon, key, val, label, tone }) => (
          <div className="hz-stat" key={key}>
            <span className={"hz-stat-icon hz-stat-" + tone}><Icon size={22} /></span>
            <div className="hz-stat-body">
              <dt>{val}</dt>
              <dd>{label}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ------------------------------------------------------------------ About */

function About() {
  const { t } = useTranslation();
  return (
    <section className="hz-section hz-about" id="about">
      <div className="hz-about-media">
        <img src="/constantine_classy_classroom.jpg" alt={t("hz.about.photo_alt")} loading="lazy" />
        <span className="hz-about-seal">
          <strong>4+</strong>
          <span>Années d'expérience</span>
        </span>
      </div>

      <div className="hz-about-copy">
        <span className="hz-kicker">QUI SOMMES-NOUS</span>
        <h2 className="hz-h2">
          Une école où chaque élève <em className="hz-script">compte.</em>
        </h2>
        <p className="hz-body">
          Horizon Skills Academy allie une pédagogie exigeante à un accompagnement sincère. Des groupes réduits, des enseignants qui connaissent chaque élève par son nom, et une méthode pensée pour les années scolaires algériennes — pour des progrès que l'on voit vraiment.
        </p>

        <ul className="hz-checklist">
          <li>
            <span className="hz-check"><ShieldCheck size={14} /></span>
            <span>Des groupes volontairement réduits, pour que personne ne reste au fond de la classe.</span>
          </li>
          <li>
            <span className="hz-check"><ShieldCheck size={14} /></span>
            <span>Un suivi transmis aux parents : présences, progression et devoirs, en toute clarté.</span>
          </li>
          <li>
            <span className="hz-check"><ShieldCheck size={14} /></span>
            <span>Un programme calé sur le calendrier scolaire algérien, du primaire au baccalauréat.</span>
          </li>
        </ul>

        <a href="#contact" className="hz-btn hz-btn-navy">
          <span>Prendre contact</span>
          <ArrowRight size={18} className="hz-btn-arrow" />
        </a>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Programmes */

function Programmes() {
  const subjects = useData((s) => s.subjects);

  return (
    <section className="hz-section hz-programmes" id="programmes">
      <header className="hz-section-head">
        <div className="hz-prog-head-wrap">
          <DotsGridPattern cols={3} rows={3} />
          <h2 className="hz-h2">Nos programmes</h2>
          <PaperPlaneDoodle />
        </div>
        <p className="hz-body hz-prog-lead">
          Des parcours adaptés à chaque âge et chaque niveau pour <span className="hz-lead-blue">apprendre</span>, <span className="hz-lead-blue">progresser</span> et <span className="hz-lead-gold">réussir</span> avec confiance.
        </p>
      </header>

      <div className="hz-prog-grid">
        {PROGRAMMES.map(({ key, title, age, icon: Icon, photo, tone, points }) => (
          <article className="hz-prog-card" key={key}>
            <div className="hz-prog-media">
              <img src={photo} alt={title} loading="lazy" />
              <span className={"hz-prog-icon hz-tone-" + tone}><Icon size={20} /></span>
            </div>
            <h3>{title}</h3>
            <p className={"hz-prog-age hz-tone-text-" + tone}>{age}</p>
            <ul className="hz-prog-points">
              {points.map((p, idx) => (
                <li key={idx}>{p}</li>
              ))}
            </ul>
            <a href="#contact" className="hz-prog-btn">
              <span className="hz-prog-arrow"><ArrowRight size={14} /></span>
              <span>Voir plus</span>
            </a>
          </article>
        ))}
      </div>

      {subjects.length > 0 && (
        <div className="hz-subjects">
          <span className="hz-subjects-label">Matières enseignées :</span>
          <ul>
            {subjects.map((s) => (
              <li key={s.id}>{s.name}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Dark navy bottom banner */}
      <div className="hz-prog-band">
        <div className="hz-prog-band-left">
          <span className="hz-prog-band-mark"><Trophy size={26} /></span>
          <p className="hz-prog-band-lead">
            Un accompagnement personnalisé pour <strong>révéler le potentiel</strong> de chaque élève.
          </p>
        </div>

        <div className="hz-prog-band-divider" />

        <div className="hz-prog-band-right">
          <p>
            Vous ne savez pas quel programme choisir ? Notre équipe vous guide vers le parcours le plus adapté.
          </p>
          <a href="#contact" className="hz-btn hz-btn-gold">
            <span>Nous contacter</span>
            <ArrowRight size={18} className="hz-btn-arrow" />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Methods */

function Methods() {
  const { t } = useTranslation();
  return (
    <section className="hz-section hz-methods" id="methodes">
      <header className="hz-section-head">
        <span className="hz-kicker">{t("hz.methods.kicker")}</span>
        <h2 className="hz-h2">
          Apprendre autrement, apprendre <em className="hz-script">mieux.</em>
        </h2>
        <p className="hz-body">{t("hz.methods.lead")}</p>
      </header>

      <div className="hz-method-grid">
        {METHODS.map(({ key, icon: Icon }, i) => (
          <article className="hz-method-card" key={key}>
            <span className="hz-method-step">{String(i + 1).padStart(2, "0")}</span>
            <span className="hz-method-icon"><Icon size={22} /></span>
            <h3>{t(`hz.methods.${key}_title`)}</h3>
            <p>{t(`hz.methods.${key}_desc`)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Contact */

const EMPTY_FORM = { firstName: "", lastName: "", email: "", phone: "", topic: "", message: "" };

function Contact() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const set = <K extends keyof typeof EMPTY_FORM>(k: K, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const valid = form.firstName.trim() && form.lastName.trim() && form.email.trim() && form.message.trim();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid || state === "sending") return;
    setState("sending");
    const ok = await sendContactEmail(form);
    if (ok) {
      setForm(EMPTY_FORM);
      setState("sent");
    } else {
      setState("error");
    }
  }

  return (
    <section className="hz-section hz-contact" id="contact">
      <div className="hz-contact-info">
        <div className="hz-contact-head">
          <DotsGridPattern cols={4} rows={3} />
          <h2 className="hz-h2">
            Contactez-nous,
            <br />
            <span className="hz-script-wrap">
              <em className="hz-script">nous sommes là pour vous.</em>
              <span className="hz-brush-stroke-blue" />
            </span>
          </h2>
          <PaperPlaneDoodle />
        </div>

        <p className="hz-body">
          Une question, un besoin d'information ou une demande particulière ? Notre équipe vous répond avec plaisir.
        </p>

        <ul className="hz-contact-list">
          <li>
            <span className="hz-contact-icon"><Phone size={18} /></span>
            <div>
              <strong>Téléphone</strong>
              <a href={PHONE_HREF}>{PHONE_DISPLAY}</a>
            </div>
          </li>
          <li>
            <span className="hz-contact-icon"><Mail size={18} /></span>
            <div>
              <strong>Email</strong>
              <a href={`mailto:${SCHOOL_EMAIL}`}>{SCHOOL_EMAIL}</a>
            </div>
          </li>
          <li>
            <span className="hz-contact-icon"><MapPin size={18} /></span>
            <div>
              <strong>Adresse</strong>
              <span>Cité Daksi, Constantine, Algérie</span>
            </div>
          </li>
        </ul>

        {/* Stylized Google Map Preview Widget */}
        <a className="hz-map-card" href={MAPS_URL} target="_blank" rel="noreferrer noopener">
          <div className="hz-map-mockup">
            <div className="hz-map-road hz-map-road-1" />
            <div className="hz-map-road hz-map-road-2" />
            <div className="hz-map-road hz-map-road-3" />
            <span className="hz-map-badge hz-map-b1">W133</span>
            <span className="hz-map-label hz-map-l1">Cité Daksi</span>
            <span className="hz-map-label hz-map-l2">Avenue de l'ALN</span>
            <span className="hz-map-label hz-map-l3">Université Salah Boubnider</span>
            <div className="hz-map-marker">
              <MapPin size={22} fill="#ef4444" color="#ffffff" />
              <strong>Horizon Skills Academy</strong>
            </div>
          </div>
        </a>
      </div>

      <div className="hz-contact-card-wrap">
        <form className="hz-contact-form" onSubmit={submit}>
          <h3 className="hz-form-title">
            <span className="hz-title-bar" />
            <span>Envoyez-nous un message</span>
          </h3>

          <div className="hz-field-row">
            <label className="hz-field">
              <input
                placeholder="Prénom"
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                required
              />
            </label>
            <label className="hz-field">
              <input
                placeholder="Nom"
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                required
              />
            </label>
          </div>

          <div className="hz-field-row">
            <label className="hz-field">
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                required
              />
            </label>
            <label className="hz-field">
              <input
                type="tel"
                placeholder="Téléphone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </label>
          </div>

          <label className="hz-field">
            <select value={form.topic} onChange={(e) => set("topic", e.target.value)}>
              <option value="">Sujet de votre demande</option>
              {PROGRAMMES.map(({ key, title }) => (
                <option key={key} value={title}>
                  {title}
                </option>
              ))}
              <option value="Autre demande">Autre demande</option>
            </select>
          </label>

          <label className="hz-field">
            <textarea
              rows={5}
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
              placeholder="Votre message"
              required
            />
          </label>

          {state === "sent" && <p className="hz-form-ok">Message envoyé avec succès ! Nous vous répondrons rapidement.</p>}
          {state === "error" && (
            <p className="hz-form-err">
              {EMAIL_ENABLED ? "L'envoi a échoué. Appelez-nous au" : "L'envoi par e-mail n'est pas configuré. Appelez-nous au"}{" "}
              <a href={PHONE_HREF}>{PHONE_DISPLAY}</a>
            </p>
          )}

          <button type="submit" className="hz-btn hz-btn-gold hz-btn-block" disabled={!valid || state === "sending"}>
            <span>{state === "sending" ? "Envoi en cours..." : "Envoyer le message"}</span>
            <ArrowRight size={18} className="hz-btn-arrow" />
          </button>

          <p className="hz-form-note">
            <Lock size={14} />
            <span>Vos données sont confidentielles et ne seront jamais partagées.</span>
          </p>
        </form>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Footer */

function Footer() {
  const [nlEmail, setNlEmail] = useState("");
  const [nlSent, setNlSent] = useState(false);

  function submitNewsletter(e: FormEvent) {
    e.preventDefault();
    if (!nlEmail.trim()) return;
    setNlSent(true);
  }

  return (
    <footer className="hz-footer">
      <div className="hz-footer-top">
        <div className="hz-footer-brand">
          <a href="#hero" className="hz-brand">
            <img src="/horizon_H_logo.png" alt="" width={40} height={40} />
            <span className="hz-brand-text">
              <strong>HORIZON</strong>
            </span>
          </a>
          <p>
            Horizon Skills Academy est votre partenaire d'excellence à Constantine. Nous allions pédagogie innovante et encadrement sur-mesure pour révéler le potentiel de chaque élève et façonner les leaders de demain.
          </p>
        </div>

        <nav className="hz-footer-col">
          <h4>Explorer</h4>
          <ul>
            {SECTIONS.map(({ id, labelKey }) => (
              <li key={id}><a href={`#${id}`}>{labelKey.includes("hero") ? "Accueil" : labelKey.includes("about") ? "À propos" : labelKey.includes("programmes") ? "Nos programmes" : labelKey.includes("methodes") ? "Méthodes" : labelKey.includes("news") ? "Actualités" : "Contact"}</a></li>
            ))}
          </ul>
        </nav>

        <div className="hz-footer-col">
          <h4>Nous joindre</h4>
          <ul className="hz-footer-contact-list">
            <li><a href={PHONE_HREF}><Phone size={15} /> <span>{PHONE_DISPLAY}</span></a></li>
            <li><a href={`mailto:${SCHOOL_EMAIL}`}><Mail size={15} /> <span>{SCHOOL_EMAIL}</span></a></li>
            <li><a href={MAPS_URL} target="_blank" rel="noreferrer noopener"><MapPin size={15} /> <span>Cité Daksi, Constantine, Algérie</span></a></li>
            <li className="hz-footer-dir"><a href={MAPS_URL} target="_blank" rel="noreferrer noopener">Itinéraire</a></li>
          </ul>
        </div>

        <div className="hz-footer-col">
          <h4>Suivez-nous</h4>
          <div className="hz-social-links">
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="hz-social-btn hz-social-fb" aria-label="Facebook">
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hz-social-btn hz-social-ig" aria-label="Instagram">
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hz-social-btn hz-social-in" aria-label="LinkedIn">
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
            </a>
          </div>

          <div className="hz-newsletter-box">
            <p className="hz-nl-title">Restez informé de nos actualités</p>
            {nlSent ? (
              <p className="hz-nl-ok"><Check size={16} /> Merci pour votre inscription !</p>
            ) : (
              <form onSubmit={submitNewsletter} className="hz-nl-form">
                <input
                  type="email"
                  placeholder="Votre email"
                  value={nlEmail}
                  onChange={(e) => setNlEmail(e.target.value)}
                  required
                />
                <button type="submit" aria-label="S'inscrire">
                  <Send size={15} />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
