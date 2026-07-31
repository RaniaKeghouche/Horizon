import { useAuth } from "./AuthContext";
import { usernameFromEmail } from "../../lib/username";
import RegisterFlow from "./RegisterFlow";

// Shown when a user is signed in but has no approved account yet.
export default function PendingGate() {
  const { requestStatus, email, logout } = useAuth();
  const username = usernameFromEmail(email);

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
            <div className="pending-icon">✅</div>
            <h2 className="login-title">Votre demande a été envoyée</h2>
            {username && (
              <>
                <p className="muted">Votre identifiant de connexion :</p>
                <p className="username-badge">{username}</p>
              </>
            )}
            <p className="muted small">
              ⏳ En attente de validation par l'administration. Une fois votre compte accepté,
              reconnectez-vous avec cet identifiant.
            </p>
            <button className="btn btn-ghost" onClick={logout}>Se déconnecter</button>
          </div>
        )}
      </div>
    </div>
  );
}
