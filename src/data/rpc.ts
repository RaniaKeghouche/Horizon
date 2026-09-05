import { DEMO_MODE } from "../lib/config";
import { reportRejectedWrite } from "./syncStatus";

/**
 * Appels de fonctions cote base (RPC Supabase).
 *
 * Le reste des ecritures passe par la file d'attente hors ligne (outbox), qui
 * envoie des lignes table par table. Certaines operations ne peuvent pas
 * s'ecrire ainsi : inscrire un eleve, c'est ajouter une ligne ET decrementer
 * une place, sous une regle de securite que l'eleve n'a pas le droit
 * d'appliquer lui-meme. Ces operations vivent dans une fonction en base, et
 * cette couche-ci les appelle.
 *
 * A la difference de l'outbox, un echec n'est PAS avale : l'appelant est
 * prevenu et l'interface peut revenir en arriere, au lieu d'afficher un succes
 * que la base ne connait pas.
 */
export interface RpcResult<T> {
  ok: boolean;
  data?: T;
  /** Message lisible, deja extrait de l'erreur Postgres. */
  error?: string;
}

export async function callRpc<T>(
  fn: string,
  args: Record<string, unknown>
): Promise<RpcResult<T>> {
  if (DEMO_MODE) return { ok: true };
  try {
    const { supabase } = await import("../lib/supabase");
    const { data, error } = await supabase.rpc(fn, args);
    if (error) {
      // Visible dans le bandeau de synchro : une inscription refusee ne doit
      // pas disparaitre en silence dans la console.
      reportRejectedWrite(fn, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true, data: data as T };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    reportRejectedWrite(fn, message);
    return { ok: false, error: message };
  }
}
