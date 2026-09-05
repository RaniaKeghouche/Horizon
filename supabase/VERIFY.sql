-- ===========================================================================
--  Verification de l'etat de la base
-- ===========================================================================
--  A coller dans Supabase → SQL Editor et executer. Ne modifie rien.
--
--  Chaque ligne dit si un element attendu par l'application est en place.
--  Tout doit afficher « OK ». Une ligne « MANQUANT » indique le fichier a
--  executer, dans la colonne « a_executer ».
-- ===========================================================================

with attendu(categorie, nom, detail, fichier) as (
  values
    -- Tables ---------------------------------------------------------------
    ('table',    'users',                 null,               'schema.sql'),
    ('table',    'students',              null,               'schema.sql'),
    ('table',    'teachers',              null,               'schema.sql'),
    ('table',    'subjects',              null,               'schema.sql'),
    ('table',    'classes',               null,               'schema.sql'),
    ('table',    'enrollments',           null,               'schema.sql'),
    ('table',    'sessions',              null,               'schema.sql'),
    ('table',    'payments',              null,               'schema.sql'),
    ('table',    'notifications',         null,               'schema.sql'),
    ('table',    'activityLog',           null,               'schema.sql'),
    ('table',    'slotRequests',          null,               'schema.sql'),
    ('table',    'registrationRequests',  null,               'schema.sql'),
    ('table',    'teacherPayouts',        null,               'schema.sql'),
    ('table',    'rooms',                 null,               'SETUP.sql'),
    ('table',    'enrollmentRequests',    null,               'SETUP.sql'),
    -- Colonnes ajoutees apres coup -----------------------------------------
    ('colonne',  'registrationRequests',  'wantedClassIds',   'SETUP.sql'),
    ('colonne',  'sessions',              'isExtra',          'SETUP.sql'),
    ('colonne',  'classes',               'roomId',           'SETUP.sql'),
    -- Fonctions ------------------------------------------------------------
    ('fonction', 'is_admin',              null,               'schema.sql'),
    ('fonction', 'my_student_id',         null,               'rls-hardening.sql'),
    ('fonction', 'my_teacher_id',         null,               'rls-hardening.sql'),
    ('fonction', 'self_enroll',           null,               'self-service.sql'),
    ('fonction', 'reg_request_guard',     null,               'self-service-2.sql'),
    -- Regles d'ecriture ----------------------------------------------------
    ('politique','ins_payments',          null,               'self-service.sql'),
    ('politique','upd_reg',               null,               'self-service-2.sql'),
    -- Declencheur ----------------------------------------------------------
    ('declencheur','reg_request_guard',   null,               'self-service-2.sql')
)
select
  a.categorie,
  coalesce(a.nom || coalesce('.' || a.detail, ''), a.nom) as element,
  case
    when a.categorie = 'table' then
      case when exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = a.nom
      ) then 'OK' else 'MANQUANT' end
    when a.categorie = 'colonne' then
      case when exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = a.nom and column_name = a.detail
      ) then 'OK' else 'MANQUANT' end
    when a.categorie = 'fonction' then
      case when exists (
        select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = a.nom
      ) then 'OK' else 'MANQUANT' end
    when a.categorie = 'politique' then
      case when exists (
        select 1 from pg_policy where polname = a.nom
      ) then 'OK' else 'MANQUANT' end
    when a.categorie = 'declencheur' then
      case when exists (
        select 1 from pg_trigger where tgname = a.nom and not tgisinternal
      ) then 'OK' else 'MANQUANT' end
  end as etat,
  a.fichier as a_executer
from attendu a
order by
  case when (
    case
      when a.categorie = 'table' then exists (select 1 from information_schema.tables where table_schema='public' and table_name=a.nom)
      when a.categorie = 'colonne' then exists (select 1 from information_schema.columns where table_schema='public' and table_name=a.nom and column_name=a.detail)
      when a.categorie = 'fonction' then exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=a.nom)
      when a.categorie = 'politique' then exists (select 1 from pg_policy where polname=a.nom)
      when a.categorie = 'declencheur' then exists (select 1 from pg_trigger where tgname=a.nom and not tgisinternal)
    end
  ) then 1 else 0 end,          -- les manquants remontent en premier
  a.categorie, a.nom;
