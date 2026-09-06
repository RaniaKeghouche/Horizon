-- ===========================================================================
--  Notifications et journal traduits dans la langue du lecteur
-- ===========================================================================
--  À coller dans Supabase → SQL Editor. Idempotent : relançable sans risque.
--  Ce fichier REMPLACE `notifications-i18n.sql` (il en reprend le contenu) :
--  si vous avez déjà exécuté ce dernier, exécutez celui-ci quand même, les
--  deux colonnes existantes seront simplement laissées en place.
--
--  POURQUOI
--  --------
--  Une notification et une ligne de journal sont écrites par une personne et
--  lues par une autre. En stockant la phrase déjà rédigée, on la figeait dans
--  la langue de celui qui l'a déclenchée : un parent en interface arabe
--  recevait « Ahmed Saïdi a été marqué Présent. », et l'administration voyait
--  un journal en français quelle que soit sa langue.
--
--  L'application enregistre désormais, en plus du texte, la CLÉ du message et
--  ses paramètres. La phrase est composée à l'affichage.
--
--  SANS CETTE MIGRATION
--  --------------------
--  Les colonnes n'existent pas : la file d'écriture retire les champs que la
--  base ne connaît pas et enregistre le reste. L'application continuerait de
--  fonctionner, mais ces textes resteraient en français, sans aucun message
--  d'erreur — le même défaut silencieux que `wantedClassIds`.
--
--  Les colonnes `message` et `details` sont conservées : elles servent de repli
--  pour les lignes créées avant cette migration, et gardent la sauvegarde
--  Google Sheets lisible.
-- ===========================================================================

alter table public.notifications
  add column if not exists "msgKey" text;

alter table public.notifications
  add column if not exists "msgParams" jsonb;

alter table public."activityLog"
  add column if not exists "msgKey" text;

alter table public."activityLog"
  add column if not exists "msgParams" jsonb;

-- ---------------------------------------------------------------------------
-- Vérification : les quatre lignes doivent afficher « OK ».
-- ---------------------------------------------------------------------------
with attendu(t, c) as (
  values ('notifications', 'msgKey'),
         ('notifications', 'msgParams'),
         ('activityLog',   'msgKey'),
         ('activityLog',   'msgParams')
)
select
  a.t || '.' || a.c as colonne,
  case when exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = a.t and column_name = a.c
  ) then 'OK' else 'MANQUANT' end as etat
from attendu a
order by 1;
