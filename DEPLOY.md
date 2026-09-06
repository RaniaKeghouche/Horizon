# Mise en ligne

Le site est une application d'une seule page (Vite + React). `npm run build`
produit un dossier `dist/` fait de fichiers statiques : n'importe quel
hébergeur statique convient.

## 1. Avant de publier — les variables d'environnement

`.env` **n'est pas** dans le dépôt (voir `.gitignore`), et c'est voulu : il
contient les identifiants du projet Supabase. L'hébergeur ne les aura donc pas
tant que vous ne les y aurez pas saisies vous-même.

**C'est le point qui décide de tout :** sans `VITE_SUPABASE_URL` et
`VITE_SUPABASE_ANON_KEY`, l'application démarre en **mode démonstration** — les
données vivent dans le navigateur de chaque visiteur et rien n'est enregistré.
Un site en ligne dans cet état ressemble à une vraie application mais ne
conserve aucune inscription.

À renseigner dans le tableau de bord de l'hébergeur :

| Variable | Obligatoire | Rôle |
|---|---|---|
| `VITE_SUPABASE_URL` | **oui** | sans elle, mode démonstration |
| `VITE_SUPABASE_ANON_KEY` | **oui** | clé publique (jamais la `service_role`) |
| `VITE_OWNER_EMAIL` | oui | l'adresse qui devient administratrice |
| `VITE_SHEET_WEBHOOK_URL` | non | sauvegarde Google Sheets |
| `VITE_EMAILJS_*` | non | courriels de confirmation |
| `VITE_SCHOOL_*` | non | coordonnées affichées (défauts dans `src/lib/school.ts`) |

> La clé `anon` est faite pour être publique : c'est la sécurité au niveau des
> lignes (RLS) qui protège les données, pas le secret de cette clé. Ne mettez
> **jamais** la clé `service_role` dans une variable `VITE_*` : tout ce qui
> commence par `VITE_` est intégré au code envoyé au navigateur.

## 2. Les migrations SQL

À exécuter une fois dans **Supabase → SQL Editor**, dans cet ordre :

1. `supabase/schema.sql` — les tables et les règles de base
2. `supabase/SETUP.sql` — colonnes et tables ajoutées depuis
3. `supabase/self-service.sql` — inscription par l'élève, paiements par l'enseignant
4. `supabase/self-service-2.sql` — réservations d'un compte en attente
5. `supabase/i18n-columns.sql` — notifications et journal dans la langue du lecteur
6. `supabase/columns-catchup.sql` — **filet de sécurité** : ajoute toute colonne
   manquante, engendré depuis `src/lib/types.ts` donc complet par construction.
   À relancer après chaque mise à jour de l'application.

Puis `supabase/VERIFY.sql` : tout doit afficher « OK ».

Sans 3 et 4, l'application fonctionne pour l'administration mais les élèves ne
peuvent rien enregistrer : les écritures sont refusées et l'inscription
disparaît au rechargement.

## 3. Publier

Le dépôt contient déjà les règles de réécriture (`vercel.json`,
`netlify.toml`, `public/_redirects`). Elles sont indispensables : sans elles,
ouvrir `/payments` directement — ou simplement rafraîchir la page — renvoie une
erreur 404, car aucun fichier de ce nom n'existe sur le serveur.

### Vercel
1. <https://vercel.com/new> → importer `RaniaKeghouche/Horizon`
2. Framework **Vite**, build `npm run build`, dossier `dist` (détecté seul)
3. *Environment Variables* → coller celles du tableau ci-dessus
4. **Deploy**

### Netlify
1. <https://app.netlify.com/start> → choisir le dépôt
2. Build `npm run build`, publish `dist` (lu dans `netlify.toml`)
3. *Site settings → Environment variables*
4. **Deploy site**

### Cloudflare Pages
Même principe ; `public/_redirects` est pris en compte automatiquement.

## 4. Après la première mise en ligne

- Connectez-vous avec `VITE_OWNER_EMAIL` : ce compte devient administrateur
  automatiquement (voir `src/data/bootstrap.ts`).
- Vérifiez qu'aucun bandeau orange de synchronisation n'apparaît en haut : il
  signalerait une migration oubliée.
- Testez une inscription depuis un compte élève, puis vérifiez qu'elle apparaît
  bien dans le groupe de l'enseignant.

## 5. Le contrôle qui compte vraiment

`npm test` (176 vérifications) s'exécute en **mode démonstration**, où les
écritures vers Supabase ne font rien. Ces tests ne disent donc rien des règles
de sécurité, de la file d'attente hors-ligne ni de la synchronisation — or
c'est exactement là que se logent les pannes silencieuses : une écriture
refusée, et l'interface affiche quand même un succès.

Après la première mise en ligne, faites **une fois** le parcours décrit dans
`supabase/CHECK-PRODUCTION.sql` : créer un enseignant → un groupe → inscrire un
élève → faire l'appel → encaisser. Le fichier donne, à chaque étape, la requête
qui prouve que la ligne est bien en base. Comptez dix minutes.

C'est le seul moyen de savoir que l'application écrit vraiment.

## 6. Point d'attention connu

`public/` pèse une trentaine de mégaoctets d'images et une vidéo (`climb.png`
fait 4 Mo à lui seul). Le site fonctionnera, mais la première visite sera lente
sur une connexion mobile. Les compresser — ou les servir en WebP — est le
gain le plus simple à obtenir avant d'ouvrir le site aux familles.
