import { useState, useEffect, useRef } from "react";
import { Sparkles, MapPin, Users, Play, Pause, Compass } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ClassroomExperience() {
  const { i18n } = useTranslation();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      const totalDist = rect.height - windowHeight;
      if (totalDist <= 0) return;
      
      const currentScroll = -rect.top;
      const progress = Math.min(Math.max(currentScroll / totalDist, 0), 1);
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setScrollProgress((prev) => (prev >= 1 ? 0 : prev + 0.015));
      }, 40);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const scale = 1 + scrollProgress * 0.12;
  const panY = -scrollProgress * 20;
  const activeSpot = scrollProgress < 0.35 ? 0 : scrollProgress < 0.7 ? 1 : 2;

  const spots = [
    {
      icon: <Users size={18} />,
      title: i18n.language === "ar" ? "مشاركة فعالة وحيوية" : i18n.language === "en" ? "Active Student Participation" : "Participation Active & Enthousiaste",
      desc: i18n.language === "ar" ? "تفاعل مستمر وشغف بالتعلم في أجواء محفزة" : i18n.language === "en" ? "Engaged students raising hands eagerly in an inspiring atmosphere" : "Des élèves motivés qui lèvent la main dans un cadre stimulant",
      top: "32%",
      left: "25%"
    },
    {
      icon: <Sparkles size={18} />,
      title: i18n.language === "ar" ? "تكنولوجيا تعليمية حديثة" : i18n.language === "en" ? "Modern Interactive Pedagogy" : "Pédagogie Interactive Moderne",
      desc: i18n.language === "ar" ? "أدوات ذكية وتجهيزات عصرية تعزز الفهم" : i18n.language === "en" ? "Interactive smartboards & digital tools driving excellence" : "Équipements numériques et tableaux interactifs de haute technologie",
      top: "20%",
      left: "70%"
    },
    {
      icon: <MapPin size={18} />,
      title: i18n.language === "ar" ? "حرم مدرسي راقٍ بقسنطينة" : i18n.language === "en" ? "Classy Campus in Constantine" : "Campus Élégant à Constantine",
      desc: i18n.language === "ar" ? "بيئة آمنة ومريحة مصممة لراحة ونجاح أبنائكم" : i18n.language === "en" ? "A safe, premium environment for your child's bright future" : "Un environnement prestigieux et sécurisé pour l'épanouissement des enfants",
      top: "62%",
      left: "48%"
    }
  ];

  return (
    <section className="scroll-showcase-wrap" ref={sectionRef}>
      <div className="showcase-sticky-container">
        
        <div className="showcase-header">
          <div className="showcase-badge">
            <Compass size={16} className="spin-icon" />
            <span>{i18n.language === "ar" ? "تجربة تفاعلية حية" : i18n.language === "en" ? "Interactive Classroom Experience" : "Expérience Immensive en Classe"}</span>
          </div>
          <h2 className="showcase-title">
            {i18n.language === "ar" ? "شاهد الحياة اليومية في أكاديمية هورايزون بقسنطينة" : i18n.language === "en" ? "Experience Modern Learning at Horizon Constantine" : "Plongez au Cœur d'une Classe Élégante à Constantine"}
          </h2>
          <p className="showcase-subtitle">
            {i18n.language === "ar" ? "مرر الأسفل لاستكشاف التفاعل والتميز الحقيقي داخل قاعات الدراسة" : i18n.language === "en" ? "Scroll down to explore our interactive classroom ambiance & eager participation" : "Faites défiler vers le bas pour explorer l'ambiance stimulante et la participation de nos élèves"}
          </p>
        </div>

        <div className="showcase-stage">
          <div 
            className="showcase-media-box"
            style={{
              transform: `scale(${scale}) translateY(${panY}px)`
            }}
          >
            <img 
              src="/constantine_classy_classroom.jpg" 
              alt={t("media.classroom_alt")} 
              className="showcase-img"
            />
            <div className="showcase-overlay-gradient" />
          </div>

          {spots.map((spot, idx) => (
            <div 
              key={idx}
              className={`showcase-hotspot ${activeSpot === idx ? "active" : ""}`}
              style={{ top: spot.top, left: spot.left }}
            >
              <div className="hotspot-pulse-ring" />
              <div className="hotspot-dot">
                {spot.icon}
              </div>

              <div className="hotspot-card">
                <div className="hotspot-card-header">
                  {spot.icon}
                  <h4>{spot.title}</h4>
                </div>
                <p>{spot.desc}</p>
              </div>
            </div>
          ))}

          <div className="showcase-controls">
            <button 
              className="showcase-play-btn"
              onClick={() => setIsPlaying(!isPlaying)}
              aria-label={t("media.toggle_autoplay")}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              <span>{isPlaying ? "Pause" : (i18n.language === "ar" ? "تشغيل تلقائي" : i18n.language === "en" ? "Auto Tour" : "Mode Cinéma")}</span>
            </button>

            <div className="showcase-progress-bar">
              <div 
                className="showcase-progress-fill" 
                style={{ width: `${scrollProgress * 100}%` }}
              />
            </div>

            <div className="showcase-step-indicator">
              <span>{activeSpot + 1} / 3</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
