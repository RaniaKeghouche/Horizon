-- ===========================================================================
--  Les deux colonnes manquantes
-- ===========================================================================
--  A coller dans Supabase → SQL Editor. Idempotent : relancable sans risque.
--
--  POURQUOI CE FICHIER
--  -------------------
--  VERIFY.sql a montre que SETUP.sql avait bien ete execute — `rooms`,
--  `enrollmentRequests` et `classes.roomId` sont en place — mais dans une
--  version anterieure a l'ajout de ces deux colonnes. Plutot que de rejouer
--  tout SETUP.sql, on n'ajoute que ce qui manque.
--
--  CE QUE LEUR ABSENCE PROVOQUE
--  ----------------------------
--  wantedClassIds : un compte en attente de validation choisit ses groupes
--    depuis la page de decouverte. Sans cette colonne, la file d'ecriture
--    retire le champ inconnu et enregistre le reste : la reservation est donc
--    perdue en silence, et approveRegistration() ne convertit rien le jour de
--    la validation.
--
--  isExtra : une seance supplementaire (rattrapage, revision) s'enregistre
--    bien, mais sans son marqueur — elle devient indistinguable d'une seance
--    ordinaire dans l'historique et sur la page des groupes.
-- ===========================================================================

alter table public."registrationRequests"
  add column if not exists "wantedClassIds" jsonb;

alter table public.sessions
  add column if not exists "isExtra" boolean;

-- ---------------------------------------------------------------------------
-- Verification : les deux lignes doivent afficher « OK ».
-- ---------------------------------------------------------------------------
select
  'registrationRequests.wantedClassIds' as colonne,
  case when exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'registrationRequests'
      and column_name = 'wantedClassIds'
  ) then 'OK' else 'MANQUANT' end as etat
union all
select
  'sessions.isExtra',
  case when exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'sessions'
      and column_name = 'isExtra'
  ) then 'OK' else 'MANQUANT' end;
