import { useTranslation } from "react-i18next";
import { Ban, LogOut } from "lucide-react";
import { useAuth } from "./AuthContext";
import { usernameFromEmail } from "../../lib/username";
import RegisterFlow from "./RegisterFlow";
import RequestSent from "./RequestSent";
import SyncBanner from "../../components/SyncBanner";
import "./auth.css";

// Shown when a user is signed in but has no approved account yet.
export default function PendingGate() {
  const { t } = useTranslation();
  const { requestStatus, email, logout } = useAuth();
  const username = usernameFromEmail(email);

  return (
    <div className="login-screen">
      <div className="login-card2 card">
        {/* AppLayout never renders here, so without this a database problem
            during sign-up is completely invisible to the person hitting it. */}
        <SyncBanner />
        {requestStatus === "none" ? (
          // Signed in (e.g. Google) but hasn't submitted the form yet.
          <RegisterFlow mode="complete" onDone={() => { /* status becomes pending live */ }} />
        ) : requestStatus === "rejected" ? (
          <div className="reg-done">
            <span className="reg-done-mark refused" aria-hidden="true"><Ban size={30} /></span>
            <h2 className="reg-done-title">{t("auth.refused_title")}</h2>
            <span className="reg-done-bar" aria-hidden="true" />
            <p className="reg-muted">{t("auth.refused_body")}</p>
            <button className="au-submit reg-done-btn" onClick={logout}>
              <LogOut size={17} aria-hidden="true" />
              <span>{t("nav.logout")}</span>
            </button>
          </div>
        ) : (
          // Même écran que juste après l'inscription : la personne revient et
          // attend toujours d'être validée, l'information est identique.
          <RequestSent username={username} action={{ label: t("nav.logout"), onClick: logout }} />
        )}
      </div>
    </div>
  );
}
