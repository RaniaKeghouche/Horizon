-- ===========================================================================
--  Remise a zero de la base — ne conserve que le compte administrateur
-- ===========================================================================
--  A coller dans Supabase → SQL Editor.
--
--  *** CETTE OPERATION EST IRREVERSIBLE. ***
--  Elle efface definitivement les eleves, les enseignants, les groupes, les
--  inscriptions, les seances et les paiements. Il n'y a pas d'annulation :
--  seule une sauvegarde prise AVANT permet de revenir en arriere.
--  Supabase → Database → Backups, ou un export, avant de continuer.
--
--  CE QUI EST EFFACE
--    students, teachers, classes, enrollments, sessions, payments,
--    notifications, activityLog, slotRequests, registrationRequests,
--    enrollmentRequests, teacherPayouts,
--    users (sauf les administrateurs),
--    et les comptes de connexion Auth des non-administrateurs.
--
--  CE QUI EST CONSERVE
--    subjects et rooms — la configuration du centre (6 matieres, 5 salles).
--    Sans elles, aucun groupe ne peut etre cree tant qu'on ne les a pas
--    ressaisies a la main.
--    Le ou les comptes de role 'admin', cote application ET cote Auth.
--
--  Les matieres gardent leur nom mais perdent leurs enseignants affectes
--  (`teachersByLevel`), qui pointeraient sinon vers des enseignants effaces.
-- ===========================================================================


-- ---------------------------------------------------------------------------
--  ETAPE 1 — A EXECUTER SEULE, D'ABORD. Ne modifie rien.
--
--  Elle montre les comptes qui vont SURVIVRE et le volume qui va disparaitre.
--  Si `compte_conserve` affiche « AUCUN ADMINISTRATEUR », ou s'il montre une
--  adresse que vous ne reconnaissez pas, ou si `comptes_auth_conserves` vaut
--  0, ARRETEZ-VOUS ICI : l'etape 2 est irreversible.
-- ---------------------------------------------------------------------------
--  L'editeur Supabase n'affiche que le resultat de la DERNIERE requete : tout
--  tient donc en une seule, qui renvoie toujours au moins une ligne.
select
  coalesce(u.email, '*** AUCUN ADMINISTRATEUR — NE PAS CONTINUER ***') as compte_conserve,
  u.id                                                as id_admin,
  u."displayName"                                     as nom_admin,
  (select count(*) from auth.users a
    where exists (select 1 from public.users x
                  where x.role = 'admin' and x.id = a.id::text)) as comptes_auth_conserves,
  (select count(*) from public.students)              as eleves_effaces,
  (select count(*) from public.teachers)              as enseignants_effaces,
  (select count(*) from public.classes)               as groupes_effaces,
  (select count(*) from public.enrollments)           as inscriptions_effacees,
  (select count(*) from public.sessions)              as seances_effacees,
  (select count(*) from public.payments)              as paiements_effaces,
  (select count(*) from public.users
    where coalesce(role, '') <> 'admin')              as autres_comptes_effaces,
  (select count(*) from auth.users)                   as comptes_auth_avant,
  (select count(*) from public.subjects)              as matieres_conservees,
  (select count(*) from public.rooms)                 as salles_conservees
from (select 1) d
left join public.users u on u.role = 'admin'
order by compte_conserve;


-- ---------------------------------------------------------------------------
--  ETAPE 2 — LA REMISE A ZERO. Tout ou rien : la moindre erreur annule tout.
--
--  Selectionnez tout le bloc ci-dessous (de `begin;` a `commit;`) et executez.
-- ---------------------------------------------------------------------------
begin;

-- Deux garde-fous, executes avant toute suppression : le script doit refuser
-- de commencer plutot que de s'arreter au milieu.
--
--  1. Sans compte administrateur, vider `users` rendrait la base inaccessible :
--     plus personne ne satisfait `is_admin()`, donc la securite au niveau des
--     lignes refuserait toute lecture et toute ecriture — y compris celles qui
--     permettraient de reparer.
--
--  2. Si l'identifiant de l'administrateur cote application ne correspond a
--     aucun compte Auth — le cas d'une ligne de demonstration laissee en place,
--     dont l'id est 'u_admin' et non un UUID — alors aucun compte Auth ne
--     serait epargne et la suppression emporterait le compte de connexion de
--     l'administrateur lui-meme.
do $$
begin
  if not exists (
    select 1 from public.users where role = 'admin' and id is not null
  ) then
    raise exception
      'Aucun compte administrateur trouve : remise a zero annulee. '
      'Connectez-vous d''abord avec l''adresse VITE_OWNER_EMAIL pour que le '
      'compte administrateur soit cree, puis relancez ce script.';
  end if;

  if not exists (
    select 1 from auth.users a
    join public.users u on u.id = a.id::text
    where u.role = 'admin'
  ) then
    raise exception
      'Aucun compte Auth ne correspond a un administrateur de public.users. '
      'Supprimer ici effacerait tous les comptes de connexion, y compris le '
      'votre : remise a zero annulee. Verifiez que public.users.id de '
      'l''administrateur est bien son identifiant Supabase Auth.';
  end if;
end $$;

-- Donnees d'exploitation, des feuilles vers la racine.
delete from public."enrollmentRequests";
delete from public."registrationRequests";
delete from public."slotRequests";
delete from public."teacherPayouts";
delete from public.payments;
delete from public.sessions;
delete from public.enrollments;
delete from public.classes;
delete from public.notifications;
delete from public."activityLog";
delete from public.students;
delete from public.teachers;

-- Les matieres survivent, mais leurs affectations d'enseignants non : elles
-- designeraient des enseignants qui n'existent plus.
update public.subjects set "teachersByLevel" = '{}'::jsonb;

-- Comptes applicatifs : tout sauf les administrateurs.
delete from public.users where coalesce(role, '') <> 'admin';

-- Comptes de connexion : tout sauf les administrateurs. Sans cela, un ancien
-- eleve peut encore se connecter — il arriverait sur l'ecran d'attente et
-- reapparaitrait comme demande d'inscription a valider.
-- Formule par NOT EXISTS plutot que NOT IN : avec `not in`, une sous-requete
-- vide est vraie pour tout le monde et supprimerait donc tout.
delete from auth.users a
where not exists (
  select 1 from public.users u
  where u.role = 'admin' and u.id = a.id::text
);

commit;


-- ---------------------------------------------------------------------------
--  ETAPE 3 — VERIFICATION. Tout doit afficher « OK ».
-- ---------------------------------------------------------------------------
select 'tables de donnees vides' as controle,
       case when (
         (select count(*) from public.students) +
         (select count(*) from public.teachers) +
         (select count(*) from public.classes) +
         (select count(*) from public.enrollments) +
         (select count(*) from public.sessions) +
         (select count(*) from public.payments) +
         (select count(*) from public.notifications) +
         (select count(*) from public."activityLog") +
         (select count(*) from public."slotRequests") +
         (select count(*) from public."registrationRequests") +
         (select count(*) from public."enrollmentRequests") +
         (select count(*) from public."teacherPayouts")
       ) = 0 then 'OK' else 'RESTE DES LIGNES' end as etat
union all
select 'compte administrateur conserve',
       case when (select count(*) from public.users where role = 'admin') > 0
            then 'OK' else 'PERDU' end
union all
select 'aucun autre compte applicatif',
       case when (select count(*) from public.users where coalesce(role,'') <> 'admin') = 0
            then 'OK' else 'RESTE DES COMPTES' end
union all
select 'Auth aligne sur les administrateurs',
       case when (select count(*) from auth.users) =
                 (select count(*) from public.users where role = 'admin')
            then 'OK' else 'ECART' end
union all
select 'matieres conservees',
       case when (select count(*) from public.subjects) > 0 then 'OK' else 'VIDE' end
union all
select 'salles conservees',
       case when (select count(*) from public.rooms) > 0 then 'OK' else 'VIDE' end;
