import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { 
  GraduationCap, Users, Award, Lightbulb, Library, HeartHandshake, 
  Book, Telescope, Palette, Music, Trophy, Monitor, 
  FlaskConical, Dna, Theater, Globe, Languages, Ruler,
  Phone, Mail, MapPin, User, Laptop
} from "lucide-react";

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const cycleLang = () => {
    const nextLang = i18n.language === "ar" ? "fr" : i18n.language === "fr" ? "en" : "ar";
    i18n.changeLanguage(nextLang);
  };
  function scrollToLogin() {
    navigate("/auth");
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

      <header className="landing-nav">
        <div className="auth-brand">
          <img src="/horizon-logo.png" alt="Horizon" className="brand-logo-img" />
          <span className="brand-text">HORIZON</span>
        </div>
        <nav className="landing-links">
          <a href="#hero" className="nav-link" onClick={(e) => { e.preventDefault(); document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' }); }}>Accueil</a>
          <a href="#features" className="nav-link" onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}>À propos</a>
          <a href="#contact" className="nav-link" onClick={(e) => { e.preventDefault(); document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }); }}>Contact</a>
          <button className="link-btn" onClick={cycleLang}>
            {i18n.language === "ar" ? "FR" : i18n.language === "fr" ? "EN" : "AR"}
          </button>
          <a href="/auth" className="nav-cta">
            Connexion
          </a>
        </nav>
        <button className="hamburger-btn">☰</button>
      </header>

      <section className="landing-hero" id="hero">
        <div className="hero-copy">
          <h1 className="hero-title">{t("hero.title_start")} <br/><span className="magic-text">{t("hero.title_dreams")}</span></h1>
          <p className="hero-subtitle">
            {t("hero.subtitle")}
          </p>
          
          <div className="hero-cta-block">
            <a href="/auth" className="btn-hero-primary">
              {t("hero.cta_btn")} <span style={{marginLeft: '0.5rem'}}>&rarr;</span>
            </a>
            <div className="hero-trust">
              <div className="avatar-group">
                <div className="avatar bg-indigo"><GraduationCap size={20} color="white" /></div>
                <div className="avatar bg-pink"><User size={20} color="white" /></div>
                <div className="avatar bg-cyan"><Laptop size={20} color="white" /></div>
              </div>
              <span className="trust-text">{t("hero.trust_text1")} <strong>+500</strong> {t("hero.trust_text2")}</span>
            </div>
          </div>

          <div className="hero-benefits">
            <div className="benefit-stat">
              <span className="stat-val">{t("hero.stat1_val")}</span>
              <span className="stat-label">{t("hero.stat1_label")}</span>
            </div>
            <div className="benefit-stat">
              <span className="stat-val">{t("hero.stat2_val")}</span>
              <span className="stat-label">{t("hero.stat2_label")}</span>
            </div>
            <div className="benefit-stat">
              <span className="stat-val">{t("hero.stat3_val")}</span>
              <span className="stat-label">{t("hero.stat3_label")}</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="spark spark-1">✦</div>
          <div className="spark spark-2">✦</div>
          <img 
            src="/dreams.png" 
            alt="Education Dreams" 
            className="dreams-image" 
          />
          {/* Premium Desktop Magic Spark - sweeps elegantly from behind the image */}
          <svg className="desktop-spark" viewBox="0 0 400 200" preserveAspectRatio="none">
            <defs>
              <linearGradient id="sparkDesktopCore" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0" />
                <stop offset="20%" stopColor="#0ea5e9" />
                <stop offset="50%" stopColor="#4f46e5" />
                <stop offset="80%" stopColor="#f02fc2" />
                <stop offset="100%" stopColor="#f02fc2" stopOpacity="0" />
              </linearGradient>
              <filter id="glowHeavy" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <filter id="glowLight" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <path id="magic-star" d="M 0,-8 Q 0,0 8,0 Q 0,0 0,8 Q 0,0 -8,0 Q 0,0 0,-8" fill="#fff" />
            </defs>
            <path id="d-path-core" d="M 400,80 C 250,180 150,0 0,100" fill="none" stroke="url(#sparkDesktopCore)" strokeWidth="6" filter="url(#glowHeavy)" className="spark-line-thick" />
            <path d="M 400,80 C 250,180 150,0 0,100" fill="none" stroke="#fff" strokeWidth="1.5" filter="url(#glowLight)" className="spark-line-thin" />
            
            {/* Lead Star */}
            <g>
              <animateMotion dur="4s" repeatCount="indefinite"><mpath href="#d-path-core" /></animateMotion>
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="4s" repeatCount="indefinite" />
              <g>
                <animateTransform attributeName="transform" type="rotate" values="0;360" dur="2s" repeatCount="indefinite" />
                <use href="#magic-star" transform="scale(1.2)" filter="url(#glowLight)" />
              </g>
            </g>
            
            {/* Trailing Star 1 */}
            <g>
              <animateMotion dur="4s" begin="0.25s" repeatCount="indefinite"><mpath href="#d-path-core" /></animateMotion>
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="4s" repeatCount="indefinite" />
              <g>
                <animateTransform attributeName="transform" type="rotate" values="360;0" dur="3s" repeatCount="indefinite" />
                <use href="#magic-star" transform="scale(0.7)" fill="#0ea5e9" filter="url(#glowLight)" />
              </g>
            </g>

            {/* Trailing Star 2 */}
            <g>
              <animateMotion dur="4s" begin="0.5s" repeatCount="indefinite"><mpath href="#d-path-core" /></animateMotion>
              <animate attributeName="opacity" values="0;1;0.5;0" keyTimes="0;0.1;0.9;1" dur="4s" repeatCount="indefinite" />
              <g>
                <animateTransform attributeName="transform" type="rotate" values="0;360" dur="1.5s" repeatCount="indefinite" />
                <use href="#magic-star" transform="scale(0.4)" fill="#f02fc2" filter="url(#glowLight)" />
              </g>
            </g>
          </svg>
          <svg className="mobile-spark" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="sparkMobile" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f02fc2" />
                <stop offset="50%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#0ea5e9" />
              </linearGradient>
              <filter id="sparkMobileGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <path id="m-path" className="mobile-spark-line" d="M 20,0 C 0,50 50,70 50,100" fill="none" stroke="url(#sparkMobile)" strokeWidth="3" filter="url(#sparkMobileGlow)" />
            <circle r="4" fill="#0ea5e9" filter="url(#sparkMobileGlow)">
              <animateMotion dur="2.5s" repeatCount="indefinite">
                <mpath href="#m-path" />
              </animateMotion>
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="2.5s" repeatCount="indefinite" />
            </circle>
          </svg>
          
          {/* Drifting magic stars that float across the screen */}
          <div className="drifting-spark ds-1">✦</div>
          <div className="drifting-spark ds-2">✦</div>
          <div className="drifting-spark ds-3">★</div>
        </div>
      </section>

      <section className="about-section" id="features">
        <h2 className="section-title">{t("about.title")}</h2>
        
        <div className="landing-cards">
          {/* Card 1 */}
          <div className="info-card bg-pink">
            <div className="card-floating-icon"><GraduationCap size={28} /></div>
            <h4>{t("about.c1_title")}</h4>
            <p>{t("about.c1_desc")}</p>
          </div>
          
          {/* Card 2 (Middle - Pushed Down) */}
          <div className="info-card bg-indigo">
            <div className="card-floating-icon"><Users size={28} /></div>
            <h4>{t("about.c2_title")}</h4>
            <p>{t("about.c2_desc")}</p>
          </div>

          {/* Card 3 */}
          <div className="info-card bg-cyan">
            <div className="card-floating-icon"><Award size={28} /></div>
            <h4>{t("about.c3_title")}</h4>
            <p>{t("about.c3_desc")}</p>
          </div>

          {/* Card 4 */}
          <div className="info-card bg-green">
            <div className="card-floating-icon"><Lightbulb size={28} /></div>
            <h4>{t("about.c4_title")}</h4>
            <p>{t("about.c4_desc")}</p>
          </div>

          {/* Card 5 (Middle - Pushed Down) */}
          <div className="info-card bg-yellow">
            <div className="card-floating-icon"><Library size={28} /></div>
            <h4>{t("about.c5_title")}</h4>
            <p>{t("about.c5_desc")}</p>
          </div>

          {/* Card 6 */}
          <div className="info-card bg-purple">
            <div className="card-floating-icon"><HeartHandshake size={28} /></div>
            <h4>{t("about.c6_title")}</h4>
            <p>{t("about.c6_desc")}</p>
          </div>
        </div>



      </section>

      {/* --- CTA SECTION --- */}
      <section className="cta-section">
        <div className="cta-container">
          <h2>{t("cta_section.title")}</h2>
          <p>{t("cta_section.desc")}</p>
          <a href="/auth" className="btn-chic btn-large" onClick={(e) => { e.preventDefault(); scrollToLogin(); }}>
            {t("cta_section.btn")} <span style={{marginLeft: '0.5rem'}}>&rarr;</span>
          </a>
        </div>
      </section>

      {/* --- CONTACT SECTION --- */}
      <section className="contact-section" id="contact">
        <h2 className="contact-title">{t("contact.title")}</h2>
        
        <div className="contact-cloud-wrapper">
          {/* Cloud SVG Divider behind cards */}
          <svg className="contact-cloud-svg" viewBox="0 0 1440 320" preserveAspectRatio="none">
            <path fill="#eef2ff" fillOpacity="1" d="M0,192L48,176C96,160,192,128,288,138.7C384,149,480,203,576,218.7C672,235,768,213,864,186.7C960,160,1056,128,1152,128C1248,128,1344,160,1392,176L1440,192L1440,0L0,0Z"></path>
          </svg>
          
          <div className="contact-cards-row">
            <a href="tel:0553366204" className="c-card bg-indigo">
              <div className="c-icon"><Phone size={24} /></div>
              <p>{t("contact.phone")}</p>
              <span className="muted small">055 33 66 204</span>
            </a>
            
            <a href="mailto:horizonskillsacademy@gmail.com" className="c-card bg-indigo">
              <div className="c-icon"><Mail size={24} /></div>
              <p>{t("contact.email")}</p>
              <span className="muted small">horizonskillsacademy@gmail.com</span>
            </a>

            <a href="https://www.google.com/maps?q=36.355332,6.637742" target="_blank" rel="noreferrer" className="c-card bg-indigo">
              <div className="c-icon"><MapPin size={24} /></div>
              <p>Horizon Academy</p>
              <span className="muted small">Cité Daksi, Constantine</span>
            </a>

            <a href="https://www.instagram.com/horizon_academy_constantine/?hl=ar" target="_blank" rel="noreferrer" className="c-card bg-indigo">
              <div className="c-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </div>
              <p>Instagram</p>
              <span className="muted small">@horizon_academy_constantine</span>
            </a>
          </div>
        </div>

        <div className="contact-split">
          <div className="contact-form-side">
            <form className="contact-form">
              <label>
                {t("contact.lbl_email")}
                <input type="email" placeholder={t("contact.lbl_email")} />
              </label>
              <label>
                {t("contact.lbl_name")}
                <input type="text" placeholder={t("contact.lbl_name")} />
              </label>
              <label>
                {t("contact.lbl_subject")}
                <input type="text" placeholder={t("contact.lbl_subject")} />
              </label>
              <label>
                {t("contact.lbl_message")}
                <textarea placeholder={t("contact.lbl_message")} rows={4}></textarea>
              </label>
              <button type="button" className="btn-chic btn-submit-form">{t("contact.submit")}</button>
            </form>
          </div>
          
          <div className="contact-info-side">
            <h3 className="c-info-title">{t("contact.form_title")}</h3>
            <p className="c-info-desc">{t("contact.form_desc")}</p>
            
            <div className="c-map-container">
              <iframe 
                src="https://maps.google.com/maps?q=36.355332,6.637742&t=k&z=19&output=embed" 
                width="100%" 
                height="220" 
                style={{border:0, borderRadius: '16px'}} 
                allowFullScreen 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade">
              </iframe>
            </div>
            
            <div className="c-socials">
              <span className="c-social-text">{t("contact.follow")}</span>
              <div className="c-social-icons">
                 <div className="c-social-btn">
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3.81l.53-4H14V7a1 1 0 0 1 1-1h3z"></path></svg>
                 </div>
                 <div className="c-social-btn">
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                 </div>
                 <div className="c-social-btn">
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER SECTION --- */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img src="/horizon-logo.png" alt="Horizon" className="footer-logo" />
              <span className="footer-brand-text">HORIZON</span>
            </div>
            <p className="footer-desc">
              {t("footer.desc")}
            </p>
          </div>
          
          <div className="footer-links-group">
            <h4>{t("nav.explore")}</h4>
            <a href="#hero" onClick={(e) => { e.preventDefault(); document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' }); }}>{t("nav.home")}</a>
            <a href="#features" onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}>{t("nav.schedule")}</a>
            <a href="#features" onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}>{t("nav.payments")}</a>
            <a href="#contact" onClick={(e) => { e.preventDefault(); document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }); }}>{t("nav.contact")}</a>
          </div>

          <div className="footer-links-group">
            <h4>{t("nav.legal")}</h4>
            <a href="#">{t("footer.terms")}</a>
            <a href="#">{t("footer.privacy")}</a>
            <a href="#">{t("footer.legal")}</a>
          </div>

          <div className="footer-socials">
            <h4>{t("contact.follow") || "Suivez-nous"}</h4>
            <div className="f-social-icons">
               <a href="#" className="f-social-btn">
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3.81l.53-4H14V7a1 1 0 0 1 1-1h3z"></path></svg>
               </a>
               <a href="#" className="f-social-btn">
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
               </a>
               <a href="#" className="f-social-btn">
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
               </a>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Horizon Skills Academy. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
