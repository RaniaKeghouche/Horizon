import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap, Users, Award, Lightbulb, Library, HeartHandshake,
  Phone, Mail, MapPin, User, Laptop, Check,
  UserPlus, ClipboardCheck, Rocket, Sparkles, X, Menu, Globe
} from "lucide-react";

const SECTIONS = ["hero", "features", "contact"] as const;

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<(typeof SECTIONS)[number]>("hero");

  // The nav is transparent over the hero art and gains a surface once past it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll-spy: mark the section currently filling the viewport so the nav
  // always says where you are, not just where you can go.
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id as (typeof SECTIONS)[number]);
      },
      { threshold: [0.35, 0.6], rootMargin: "-15% 0px -35% 0px" }
    );
    SECTIONS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  const cycleLang = () => {
    const nextLang = i18n.language === "ar" ? "fr" : i18n.language === "fr" ? "en" : "ar";
    i18n.changeLanguage(nextLang);
  };
  function scrollToLogin() {
    navigate("/auth");
  }
  /** Smooth-scrolls to a section and closes the mobile menu. */
  function goTo(e: React.MouseEvent, id: (typeof SECTIONS)[number]) {
    e.preventDefault();
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="landing">
      {/* Premium United Full-Page Ambient Background */}
      <div className="landing-united-bg">
         <div className="ambient-orb orb-1"></div>
         <div className="ambient-orb orb-2"></div>
         <div className="ambient-orb orb-3"></div>
         <div className="bg-grid"></div>
      </div>

      {/* --- MASTHEAD --- utility strip over a glass main bar; the strip
          retracts on scroll leaving a single compact sticky bar. */}
      <header className={"site-header" + (scrolled ? " is-stuck" : "")}>
        <div className="topstrip">
          <div className="topstrip-inner">
            <div className="topstrip-contact">
              <a href="tel:+213553366204"><Phone size={13} aria-hidden="true" /> 055 33 66 204</a>
              <span className="ts-sep" aria-hidden="true" />
              <a href="mailto:horizonskillsacademy@gmail.com" className="ts-mail">
                <Mail size={13} aria-hidden="true" /> horizonskillsacademy@gmail.com
              </a>
            </div>

            {/* Explicit 3-way switch beats a cycling button — you can see and
                pick your language instead of clicking until it lands. */}
            <div className="lang-switch" role="group" aria-label={t("nav.language")}>
              <Globe size={13} aria-hidden="true" className="lang-globe" />
              {(["fr", "en", "ar"] as const).map((lng) => (
                <button
                  key={lng}
                  className={i18n.language === lng ? "on" : undefined}
                  aria-pressed={i18n.language === lng}
                  onClick={() => i18n.changeLanguage(lng)}
                >
                  {lng.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mainbar">
          <div className="mainbar-inner">
            <a href="#hero" className="auth-brand" onClick={(e) => goTo(e, "hero")}>
              <img src="/horizon-logo.png" alt="Horizon" className="brand-logo-img" width={112} height={118} />
              <span className="brand-text">HORIZON</span>
            </a>

            <nav className="landing-links">
              {([
                ["hero", "nav.home"],
                ["features", "nav.about"],
                ["contact", "nav.contact"],
              ] as const).map(([id, key]) => (
                <a
                  key={id}
                  href={"#" + id}
                  className={"nav-link" + (active === id ? " is-active" : "")}
                  aria-current={active === id ? "page" : undefined}
                  onClick={(e) => goTo(e, id)}
                >
                  {t(key)}
                </a>
              ))}
            </nav>

            <div className="nav-actions">
              <a href="/auth" className="nav-cta">{t("nav.login")}</a>
              <button
                className="hamburger-btn"
                aria-label={t("nav.menu")}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
              >
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile navigation — the desktop links are hidden below 900px. */}
      {menuOpen && (
        <>
          <div className="mobile-nav-backdrop" onClick={() => setMenuOpen(false)} />
          <nav className="mobile-nav">
            <a href="#hero" onClick={(e) => goTo(e, "hero")}>{t("nav.home")}</a>
            <a href="#features" onClick={(e) => goTo(e, "features")}>{t("nav.about")}</a>
            <a href="#contact" onClick={(e) => goTo(e, "contact")}>{t("nav.contact")}</a>
            <button className="link-btn" onClick={cycleLang}>
              <Globe size={16} /> {i18n.language === "ar" ? "Français" : i18n.language === "fr" ? "English" : "العربية"}
            </button>
            <a href="/auth" className="nav-cta">{t("nav.login")}</a>
          </nav>
        </>
      )}

      {/* --- HERO --- artwork is a full-bleed background layer, copy sits clear of it */}
      <section className="landing-hero" id="hero">
        {/* Only the pencil/ladder side of the artwork is shown — the right of
            climb.png carries baked-in English text that would clash with the
            localized headline. */}
        <div className="hero-art" aria-hidden="true">
          <img src="/climb.png" alt="" width={535} height={654} fetchPriority="high" decoding="async" />
        </div>
        <div className="hero-scrim" aria-hidden="true" />

        <div className="hero-copy">
          <span className="hero-eyebrow">
            <i className="hero-eyebrow-dot" aria-hidden="true" />
            {t("hero.badge")}
          </span>

          <h1 className="hero-title">
            {t("hero.title_start")}
            <span className="hero-title-em">{t("hero.title_dreams")}</span>
          </h1>
          <span className="hero-rule" aria-hidden="true" />

          <p className="hero-subtitle">{t("hero.subtitle")}</p>

          <div className="hero-cta-block">
            <a href="/auth" className="btn-hero-primary">{t("hero.cta_btn")}</a>
            <a href="#features" className="btn-hero-ghost" onClick={(e) => goTo(e, "features")}>
              {t("hero.cta_secondary")}
            </a>
          </div>

          <figure className="hero-proof">
            <span className="hero-proof-figure">{t("hero.proof_figure")}</span>
            <figcaption className="hero-proof-body">
              <strong>{t("hero.proof_label")}</strong>
              <span className="hero-proof-quote">{t("hero.proof_quote")}</span>
            </figcaption>
          </figure>

          <dl className="hero-stats">
            <div className="hero-stat">
              <dt>{t("hero.stat1_val")}</dt>
              <dd>{t("hero.stat1_label")}</dd>
            </div>
            <div className="hero-stat">
              <dt>{t("hero.stat2_val")}</dt>
              <dd>{t("hero.stat2_label")}</dd>
            </div>
            <div className="hero-stat">
              <dt>{t("hero.stat3_val")}</dt>
              <dd>{t("hero.stat3_label")}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* --- WHO IS HORIZON --- gallery + copy, checkmarks, single CTA */}
      <section className="about-section" id="features">
        <div className="about-split">
          <div className="about-gallery">
            <img
              className="ag-back"
              src="/constantine_classy_classroom.jpg"
              alt={t("about.photo_alt_classroom")}
              width={1376}
              height={768}
              loading="lazy"
              decoding="async"
            />
            <img
              className="ag-front"
              src="/caring_community.jpg"
              alt={t("about.photo_alt_community")}
              width={1376}
              height={768}
              loading="lazy"
              decoding="async"
            />
            <div className="ag-seal" aria-hidden="true">
              <span className="ag-seal-num">{t("hero.stat1_val")}</span>
              <span className="ag-seal-label">{t("about.seal_years")}</span>
            </div>
          </div>

          <div className="about-copy">
            <span className="about-eyebrow">
              <Sparkles size={13} /> {t("about.eyebrow")}
            </span>
            <h2 className="about-headline">{t("about.headline")}</h2>
            <p className="about-lead">{t("about.lead")}</p>

            <ul className="about-checks">
              <li><span className="ac-box"><Check size={13} strokeWidth={3} /></span>{t("about.c1_title")}</li>
              <li><span className="ac-box"><Check size={13} strokeWidth={3} /></span>{t("about.c2_title")}</li>
              <li><span className="ac-box"><Check size={13} strokeWidth={3} /></span>{t("about.c3_title")}</li>
            </ul>

          </div>
        </div>

        {/* Enrolment: one slim bar under the About block rather than a card —
            three inline steps, a divider between each, action at the end. */}
        <div className="enrol-bar">
          <span className="enrol-badge">{t("cta_section.badge")}</span>
          <span className="enrol-sep" aria-hidden="true" />

          <ol className="enrol-steps">
            <li className="enrol-item">
              <span className="enrol-icon"><UserPlus size={16} /></span>
              <span className="enrol-text">
                <strong>{t("cta_section.step1_t")}</strong>
                <span>{t("cta_section.step1_s")}</span>
              </span>
            </li>
            <li className="enrol-item">
              <span className="enrol-icon"><ClipboardCheck size={16} /></span>
              <span className="enrol-text">
                <strong>{t("cta_section.step2_t")}</strong>
                <span>{t("cta_section.step2_s")}</span>
              </span>
            </li>
            <li className="enrol-item">
              <span className="enrol-icon"><Rocket size={16} /></span>
              <span className="enrol-text">
                <strong>{t("cta_section.step3_t")}</strong>
                <span>{t("cta_section.step3_s")}</span>
              </span>
            </li>
          </ol>

          <a href="/auth" className="enrol-cta" onClick={(e) => { e.preventDefault(); scrollToLogin(); }}>
            {t("cta_section.btn")} <span className="btn-arrow">&rarr;</span>
          </a>
        </div>
      </section>

      {/* --- NEW CONTACT SECTION --- */}
      <section className="contact-section-new" id="contact">
        <h2 className="section-title">{t("contact.section_label")}</h2>
        <div className="contact-split-new">
          
          {/* Left side: Info & Map */}
          <div className="contact-info-new">
            <h2 className="contact-title-new">{t("contact.title")}</h2>
            <p className="contact-desc-new">{t("contact.desc")}</p>
            
            <div className="contact-list-new">
              <div className="c-item-new">
                <div className="c-icon-new c-indigo"><Phone size={24} /></div>
                <div>
                  <strong>{t("contact.phone")}</strong>
                  <span>055 33 66 204</span>
                </div>
              </div>
              <div className="c-item-new">
                <div className="c-icon-new c-pink"><Mail size={24} /></div>
                <div>
                  <strong>{t("contact.email")}</strong>
                  <span>horizonskillsacademy@gmail.com</span>
                </div>
              </div>
              <div className="c-item-new">
                <div className="c-icon-new c-cyan"><MapPin size={24} /></div>
                <div>
                  <strong>{t("contact.location")}</strong>
                  <span>Horizon Academy, Cité Daksi, Constantine</span>
                </div>
              </div>
            </div>

            {/* Map embedded on the left, as requested */}
            <div className="c-map-container-new">
              <iframe 
                src="https://maps.google.com/maps?q=36.355332,6.637742&t=k&z=19&output=embed" 
                width="100%" 
                height="220" 
                style={{border:0}} 
                allowFullScreen 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade">
              </iframe>
            </div>
          </div>
          
          {/* Right side: Form Card */}
          <div className="contact-form-card-new">
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="form-row-new">
                <label>
                  {t("contact.lbl_fname")}
                  <input type="text" placeholder={t("contact.lbl_fname")} />
                </label>
                <label>
                  {t("contact.lbl_lname")}
                  <input type="text" placeholder={t("contact.lbl_lname")} />
                </label>
              </div>
              <label>
                {t("contact.lbl_email")}
                <input type="email" placeholder="jean.dupont@email.com" />
              </label>
              <label>
                {t("contact.lbl_program")}
                <select>
                  <option value="">{t("contact.program_placeholder")}</option>
                  <option value="math">Mathématiques</option>
                  <option value="physics">Physique</option>
                  <option value="languages">Langues</option>
                </select>
              </label>
              <label>
                {t("contact.lbl_message")}
                <textarea rows={4} placeholder={t("contact.message_placeholder")}></textarea>
              </label>
              <button type="submit" className="btn-contact-submit">{t("contact.submit")}</button>
            </form>
          </div>
          
        </div>
      </section>

      {/* --- FOOTER SECTION --- */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img src="/horizon-logo.png" alt="Horizon" className="footer-logo" width={112} height={118} />
              <span className="footer-brand-text">HORIZON</span>
            </div>
            <p className="footer-desc">
              {t("footer.desc")}
            </p>
          </div>
          
          <div className="footer-links-group">
            <h3>{t("nav.explore")}</h3>
            <a href="#hero" onClick={(e) => goTo(e, "hero")}>{t("nav.home")}</a>
            <a href="#features" onClick={(e) => goTo(e, "features")}>{t("nav.about")}</a>
            <a href="#contact" onClick={(e) => goTo(e, "contact")}>{t("nav.contact")}</a>
            <a href="/auth">{t("nav.login")}</a>
          </div>

          {/* Real, working destinations — these were dead href="#" placeholders. */}
          <div className="footer-links-group">
            <h3>{t("footer.reach")}</h3>
            <a href="tel:+213553366204">055 33 66 204</a>
            <a href="mailto:horizonskillsacademy@gmail.com">horizonskillsacademy@gmail.com</a>
            <a
              href="https://maps.google.com/?q=36.355332,6.637742"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("footer.directions")}
            </a>
          </div>

          <div className="footer-socials">
            <h3>{t("contact.follow")}</h3>
            <div className="f-social-icons">
              <a className="f-social-btn" href="mailto:horizonskillsacademy@gmail.com" aria-label={t("contact.email")}>
                <Mail size={18} />
              </a>
              <a className="f-social-btn" href="tel:+213553366204" aria-label={t("contact.phone")}>
                <Phone size={18} />
              </a>
              <a
                className="f-social-btn"
                href="https://maps.google.com/?q=36.355332,6.637742"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("contact.location")}
              >
                <MapPin size={18} />
              </a>
            </div>
            <p className="footer-note">{t("footer.social_note")}</p>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Horizon Skills Academy. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
