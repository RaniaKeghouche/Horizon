-- ============================================================================
-- Horizon Skills Academy — durcissement des Row Level Security
-- À exécuter dans Supabase → SQL Editor → Run.
--
-- POURQUOI
-- schema.sql posait, pour la quasi-totalité des tables :
--     create policy sel_<t> on public.<t> for select to authenticated using (true);
-- soit « tout utilisateur connecté lit tout ». Un compte élève pouvait donc lire
-- la fiche de chaque élève (nom, téléphone, nom et téléphone du parent, niveau),
-- l'intégralité des paiements de l'école et les rémunérations des enseignants.
-- patch.sql allait plus loin en ouvrant students/classes/teachers en lecture ANONYME.
--
-- Ce script remplace ces politiques par un accès scopé au rôle. Il est idempotent :
-- réexécutable sans risque.
--
-- IMPACT APPLICATIF : aucun changement de code requis.
-- Les RLS filtrent des LIGNES, elles ne lèvent pas d'erreur ; et startSync()
-- (src/data/firebaseSync.ts) tolère déjà les échecs table par table. Chaque rôle
-- reçoit simplement moins de lignes — ce qui est le but.
-- Seule exception : fetchPublicCatalog() ne doit plus demander teachers/classes
-- avant connexion (voir la note en fin de fichier).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Fonctions d'aide
--    SECURITY DEFINER : elles contournent les RLS pour éviter une récursion
--    infinie (une policy sur users qui interrogerait users). search_path figé
--    pour qu'un schéma malveillant ne puisse pas détourner la résolution.
-- ---------------------------------------------------------------------------

create or replace function public.is_admin() returns boolean
  language sql security definer stable
  set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()::text and role = 'admin'
  );
$$;

-- Identifiant de la fiche élève rattachée au compte connecté (null si non élève).
create or replace function public.my_student_id() returns text
  language sql security definer stable
  set search_path = public, pg_temp
as $$
  select "linkedStudentId" from public.users where id = auth.uid()::text;
$$;

-- Identifiant de la fiche enseignant rattachée au compte connecté (null sinon).
create or replace function public.my_teacher_id() returns text
  language sql security definer stable
  set search_path = public, pg_temp
as $$
  select "teacherId" from public.users where id = auth.uid()::text;
$$;

-- ---------------------------------------------------------------------------
-- 2. Purge des politiques permissives héritées
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['students','teachers','subjects','classes','enrollments',
                           'sessions','payments','notifications','activityLog',
                           'slotRequests','registrationRequests','teacherPayouts'] loop
    execute format('drop policy if exists sel_%1$s on public.%1$I;', t);
  end loop;
end $$;

-- Lecture anonyme : seul le catalogue des matières reste ouvert (l'écran
-- d'inscription en a besoin avant connexion). teachers exposait le téléphone,
-- paymentMode, schoolCutValue et negotiatedRate à toute personne détenant la
-- clé anon — laquelle est embarquée en clair dans le bundle web et dans l'APK.
-- Vérifié : ni AuthPage ni RegisterFlow ne lisent teachers ou classes.
drop policy if exists pub_teachers on public.teachers;
drop policy if exists pub_classes  on public.classes;
-- (pub_subjects est conservée volontairement.)

-- ---------------------------------------------------------------------------
-- 3. Lecture — scopée par rôle
-- ---------------------------------------------------------------------------

-- users : sa propre ligne, ou admin. (Déjà correct dans schema.sql, réaffirmé ici.)
drop policy if exists sel_users on public.users;
create policy sel_users on public.users for select to authenticated
  using (id = auth.uid()::text or public.is_admin());

-- students : admin | sa propre fiche | les élèves inscrits dans un groupe que
-- l'enseignant connecté anime.
create policy sel_students on public.students for select to authenticated
  using (
    public.is_admin()
    or id = public.my_student_id()
    or exists (
      select 1 from public.enrollments e
      where e."studentId" = students.id
        and e."teacherId" = public.my_teacher_id()
    )
  );

-- teachers : lisible par tout compte connecté.
-- StudentCoursesPage affiche le nom de l'enseignant de CHAQUE groupe du
-- catalogue (src/features/courses/StudentCoursesPage.tsx:18) — restreindre les
-- lignes casserait la page. Le risque résiduel porte sur les COLONNES
-- schoolCutValue / negotiatedRate / phone, que les RLS ne savent pas filtrer.
-- Correctif recommandé en suivi : déplacer ces trois colonnes dans une table
-- teacher_terms réservée à l'admin. Voir la note finale.
create policy sel_teachers on public.teachers for select to authenticated
  using (true);

-- subjects / classes : catalogue de cours, non sensible, nécessaire à tous.
create policy sel_subjects on public.subjects for select to authenticated
  using (true);
create policy sel_classes on public.classes for select to authenticated
  using (true);

-- enrollments : admin | ses propres inscriptions | celles de ses groupes.
create policy sel_enrollments on public.enrollments for select to authenticated
  using (
    public.is_admin()
    or "studentId" = public.my_student_id()
    or "teacherId" = public.my_teacher_id()
  );

-- sessions : admin | l'enseignant de la séance | l'élève inscrit à ce groupe.
create policy sel_sessions on public.sessions for select to authenticated
  using (
    public.is_admin()
    or "teacherId" = public.my_teacher_id()
    or exists (
      select 1 from public.enrollments e
      where e."classId" = sessions."classId"
        and e."studentId" = public.my_student_id()
    )
  );

-- payments : admin | ses propres paiements | ceux issus de ses groupes
-- (l'enseignant a besoin de teacherCut pour sa page Paie).
create policy sel_payments on public.payments for select to authenticated
  using (
    public.is_admin()
    or "studentId" = public.my_student_id()
    or exists (
      select 1 from public.enrollments e
      where e.id = payments."enrollmentId"
        and e."teacherId" = public.my_teacher_id()
    )
  );

-- notifications : les siennes uniquement. (Auparavant : chacun lisait celles de tous.)
create policy sel_notifications on public.notifications for select to authenticated
  using ("userId" = auth.uid()::text or public.is_admin());

-- activityLog : journal d'audit, réservé à l'admin.
create policy sel_activitylog on public."activityLog" for select to authenticated
  using (public.is_admin());

-- slotRequests : admin | ses propres demandes de créneau.
create policy sel_slotrequests on public."slotRequests" for select to authenticated
  using (public.is_admin() or "teacherId" = public.my_teacher_id());

-- registrationRequests : admin | sa propre demande.
-- Auparavant tout compte connecté lisait les nom / téléphone / téléphone du
-- parent de chaque personne ayant demandé une inscription.
create policy sel_registrationrequests on public."registrationRequests" for select to authenticated
  using (public.is_admin() or id = auth.uid()::text);

-- teacherPayouts : admin | ses propres versements.
create policy sel_teacherpayouts on public."teacherPayouts" for select to authenticated
  using (public.is_admin() or "teacherId" = public.my_teacher_id());

-- ---------------------------------------------------------------------------
-- 4. Écriture — les trous les plus graves
--    schema.sql posait `with check (true)` / `using (true)` sur sessions,
--    notifications, activityLog, slotRequests et teacherPayouts : n'importe
--    quel compte connecté pouvait écrire n'importe quoi dans ces tables.
-- ---------------------------------------------------------------------------

-- sessions : c'est ici que se jouent les présences. saveAttendance génère
-- automatiquement des lignes Payment pour les états facturables — un élève
-- capable d'écrire une séance pouvait donc fabriquer des présences et donc
-- des dettes ou des crédits. Réservé à l'admin et à l'enseignant du groupe.
drop policy if exists ins_sessions on public.sessions;
drop policy if exists upd_sessions on public.sessions;
drop policy if exists del_sessions on public.sessions;

create policy ins_sessions on public.sessions for insert to authenticated
  with check (public.is_admin() or "teacherId" = public.my_teacher_id());
create policy upd_sessions on public.sessions for update to authenticated
  using (public.is_admin() or "teacherId" = public.my_teacher_id());
create policy del_sessions on public.sessions for delete to authenticated
  using (public.is_admin());

-- notifications : l'insertion reste ouverte — l'app notifie légitimement
-- d'autres utilisateurs (un élève qui s'inscrit prévient les admins).
-- En revanche la modification est restreinte aux siennes (« marquer comme lu »).
drop policy if exists upd_notifications on public.notifications;
create policy upd_notifications on public.notifications for update to authenticated
  using ("userId" = auth.uid()::text or public.is_admin());

-- activityLog : journal d'audit. On peut y ajouter, jamais réécrire l'historique.
drop policy if exists upd_activitylog on public."activityLog";
drop policy if exists "upd_activityLog" on public."activityLog";

-- slotRequests : un enseignant crée ses propres demandes ; l'admin seul tranche.
drop policy if exists ins_slotrequests on public."slotRequests";
drop policy if exists "ins_slotRequests" on public."slotRequests";
drop policy if exists upd_slotrequests on public."slotRequests";
drop policy if exists "upd_slotRequests" on public."slotRequests";

create policy ins_slotrequests on public."slotRequests" for insert to authenticated
  with check (public.is_admin() or "teacherId" = public.my_teacher_id());
create policy upd_slotrequests on public."slotRequests" for update to authenticated
  using (public.is_admin());

-- teacherPayouts : l'admin verse ; l'enseignant confirme uniquement les siens.
drop policy if exists ins_teacherpayouts on public."teacherPayouts";
drop policy if exists "ins_teacherPayouts" on public."teacherPayouts";
drop policy if exists upd_teacherpayouts on public."teacherPayouts";
drop policy if exists "upd_teacherPayouts" on public."teacherPayouts";

create policy ins_teacherpayouts on public."teacherPayouts" for insert to authenticated
  with check (public.is_admin());
create policy upd_teacherpayouts on public."teacherPayouts" for update to authenticated
  using (public.is_admin() or "teacherId" = public.my_teacher_id());

-- ---------------------------------------------------------------------------
-- 5. Index de soutien
--    Les policies ci-dessus interrogent enrollments à chaque ligne lue de
--    students / sessions / payments. Sans index, le coût devient quadratique
--    à mesure que l'école grandit.
-- ---------------------------------------------------------------------------

create index if not exists idx_enrollments_student on public.enrollments ("studentId");
create index if not exists idx_enrollments_teacher on public.enrollments ("teacherId");
create index if not exists idx_enrollments_class   on public.enrollments ("classId");
create index if not exists idx_sessions_class      on public.sessions ("classId");
create index if not exists idx_sessions_teacher    on public.sessions ("teacherId");
create index if not exists idx_payments_enrollment on public.payments ("enrollmentId");
create index if not exists idx_payments_student    on public.payments ("studentId");
create index if not exists idx_notifications_user  on public.notifications ("userId");

-- ============================================================================
-- NOTES DE SUIVI — points volontairement NON traités ici
--
-- 1. Colonnes de rémunération des enseignants.
--    schoolCutValue, negotiatedRate et phone restent lisibles par tout compte
--    connecté, parce que les RLS filtrent des lignes et non des colonnes, et
--    que StudentCoursesPage a besoin du nom de chaque enseignant.
--    Correctif propre : créer public.teacher_terms (teacherId, paymentMode,
--    schoolCutValue, negotiatedRate) réservée à l'admin, retirer ces colonnes
--    de teachers, et adapter TeachersPage, TeacherForm, store.ts et
--    lib/payments.ts. Nécessite une modification applicative — à décider.
--
-- 2. selfEnroll est inopérant en mode Supabase, et l'était déjà avant ce script.
--    ins_enrollments exige public.is_admin() ; l'écriture d'un élève est donc
--    rejetée puis abandonnée par l'outbox (comportement documenté dans
--    CLAUDE.md). L'état local Zustand est bien mis à jour : l'élève CROIT être
--    inscrit, mais rien n'est persisté. Je n'ai délibérément pas ouvert cette
--    écriture : selfEnroll fixe pricePerSession côté client, un élève pourrait
--    donc s'inscrire à 0 DA. Deux issues possibles :
--      a) masquer le bouton « S'inscrire » et passer par l'admin ;
--      b) faire transiter la demande par une table d'approbation, comme pour
--         registrationRequests.
--
-- 3. Le webhook Google Sheets (VITE_SHEET_WEBHOOK_URL) est hors du périmètre
--    des RLS. Son URL est embarquée dans le bundle : vérifier que le script
--    Apps Script rejette les requêtes non authentifiées.
-- ============================================================================
