import { useAuth } from "./AuthContext";
import RegisterFlow from "./RegisterFlow";

// Shown when a Firebase user is signed in but has no approved account yet.
export default function PendingGate() {
  const { requestStatus, email, logout } = useAuth();

  return (
    <div className="login-screen">
      <div className="login-card2 card">
        {requestStatus === "none" ? (
          // Signed in (e.g. Google) but hasn't submitted the form yet.
          <RegisterFlow mode="complete" onDone={() => { /* status becomes pending live */ }} />
        ) : requestStatus === "rejected" ? (
          <div className="stack center">
            <div className="pending-icon">🚫</div>
            <h2 className="login-title">Demande refusée</h2>
            <p className="muted">Votre demande d'inscription a été refusée par l'administration.</p>
            <button className="btn btn-ghost" onClick={logout}>Se déconnecter</button>
          </div>
        ) : (
          <div className="stack center">
            <div className="pending-icon">⏳</div>
            <h2 className="login-title">En attente de validation</h2>
            <p className="muted">
              Votre demande a bien été envoyée{email ? ` (${email})` : ""}. L'administration doit
              l'accepter — vous recevrez un e-mail. Reconnectez-vous ensuite.
            </p>
            <button className="btn btn-ghost" onClick={logout}>Se déconnecter</button>
          </div>
        )}
      </div>
    </div>
  );
}
