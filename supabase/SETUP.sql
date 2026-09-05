-- ============================================================================
-- SETUP.sql — Horizon Skills Academy
-- Colle TOUT ce fichier dans Supabase -> SQL Editor -> Run. Une seule fois.
--
-- Partie 1 : la migration (salles, matieres par niveau, prix par groupe,
--            demandes d inscription). Sans elle l app ne peut pas enregistrer
--            ces informations.
-- Partie 2 : les donnees de demonstration (4 profs, 8 eleves, 5 salles,
--            3 groupes, 4 seances, 9 paiements, 6 demandes).
--
-- Re-executable sans risque : la partie 1 est gardee, la partie 2 met a jour
-- les lignes existantes au lieu d echouer.
-- Pour retirer UNIQUEMENT la demo plus tard : supabase/DELETE-DEMO-DATA.sql
-- ============================================================================


-- ############################################################
-- PARTIE 1 — MIGRATION
-- ############################################################
-- Migration: rooms, per-level subject offerings, per-group pricing, enrolment queue.
-- Run this in the Supabase SQL editor BEFORE loading demo data or using the app,
-- otherwise the realtime sync will fail on the missing tables/columns.
--
-- Safe to re-run: every statement is guarded.

-- ---------------------------------------------------------------------------
-- 1. Rooms. The centre has several physical rooms, so a time slot is only
--    occupied for the room it belongs to, never globally.
-- ---------------------------------------------------------------------------
create table if not exists public.rooms (
  id text primary key,
  name text not null,
  capacity double precision default 12,
  kind text default 'standard'
);

-- ---------------------------------------------------------------------------
-- 2. Subjects: which teachers may teach the subject, per school level.
--    e.g. {"3as": ["t1","t2"], "4am": ["t1"]}
-- ---------------------------------------------------------------------------
alter table public.subjects
  add column if not exists "teachersByLevel" jsonb default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- 3. Classes: the room they occupy, plus price and the school's share, which
--    are now set per group rather than inherited from the teacher.
-- ---------------------------------------------------------------------------
alter table public.classes
  add column if not exists "roomId" text,
  add column if not exists "pricePerSession" double precision default 0,
  add column if not exists "schoolCutMode" text default 'percentage',
  add column if not exists "schoolCutValue" double precision default 25;

-- ---------------------------------------------------------------------------
-- 4. Enrolment requests (تسجيل): a student asks for a subject with a chosen
--    teacher; the admin groups several of these into a class.
-- ---------------------------------------------------------------------------
create table if not exists public."enrollmentRequests" (
  id text primary key,
  "studentId" text,
  "subjectId" text,
  "teacherId" text,
  status text default 'pending',
  "classId" text,
  "createdAt" double precision,
  "reviewedAt" double precision
);

-- ---------------------------------------------------------------------------
-- 5. Realtime + RLS, matching how the existing tables are exposed.
--    Adjust the policies to your own rules if schema.sql differs.
-- ---------------------------------------------------------------------------
-- `alter publication ... add table` errors if the table is already a member,
-- so guard it to keep this file re-runnable.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'enrollmentRequests'
  ) then
    alter publication supabase_realtime add table public."enrollmentRequests";
  end if;
end $$;

alter table public.rooms enable row level security;
alter table public."enrollmentRequests" enable row level security;

drop policy if exists "rooms read" on public.rooms;
create policy "rooms read" on public.rooms for select to authenticated using (true);
drop policy if exists "rooms write" on public.rooms;
create policy "rooms write" on public.rooms for all to authenticated using (true) with check (true);

drop policy if exists "enrolreq read" on public."enrollmentRequests";
create policy "enrolreq read" on public."enrollmentRequests" for select to authenticated using (true);
drop policy if exists "enrolreq write" on public."enrollmentRequests";
create policy "enrolreq write" on public."enrollmentRequests" for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 6. Per-student remarks on a session ("Remarque" column on Faire l'appel).
--    Shape: {"<studentId>": "arrivé en retard", ...}
-- ---------------------------------------------------------------------------
alter table public.sessions
  add column if not exists "studentNotes" jsonb default '{}'::jsonb;
-- ---------------------------------------------------------------------------
-- Note written when a payment is collected ("payé en 2 fois", "chèque"...).
-- ---------------------------------------------------------------------------
alter table public.payments
  add column if not exists "note" text;


-- Note : pour retirer UNIQUEMENT les donnees de demo plus tard, sans toucher
-- au schema, executez supabase/DELETE-DEMO-DATA.sql.


-- ############################################################
-- PARTIE 2 — DONNEES DE DEMONSTRATION
-- Ids fixes (t1-t4, s1-s8, rm_*, c1-c3, er*) pour pouvoir les supprimer.
-- ############################################################

-- subjects (6)
insert into public."subjects" ("id", "name", "isCustom", "teachersByLevel", "createdAt") values
  ('sub_math', 'Mathématiques', false, '{"5ap":["t3"],"4am":["t2","t4"],"3as":["t2"]}'::jsonb, 1786726753679),
  ('sub_arabic', 'العربية', false, '{"5ap":["t3"],"4am":["t3"]}'::jsonb, 1786726753679),
  ('sub_english', 'English', false, '{"4am":["t1"],"1as":["t1","t4"],"3as":["t1"]}'::jsonb, 1786726753679),
  ('sub_french', 'Français', false, '{"5ap":["t3"],"3as":["t1"]}'::jsonb, 1786726753679),
  ('sub_science', 'Sciences', false, '{"4am":["t4"]}'::jsonb, 1786726753679),
  ('sub_physics', 'Physique', false, '{"1as":["t2"],"3as":["t2","t4"]}'::jsonb, 1786726753679)
on conflict (id) do update set
  "name" = excluded."name",
  "isCustom" = excluded."isCustom",
  "teachersByLevel" = excluded."teachersByLevel",
  "createdAt" = excluded."createdAt";

-- teachers (4)
insert into public."teachers" ("id", "name", "phone", "subjects", "paymentMode", "schoolCutValue", "negotiatedRate", "createdAt") values
  ('t1', 'Amine Belkacem', '0550 11 22 33', '["sub_english","sub_french"]'::jsonb, 'percentage', 25, null, 1786726753679),
  ('t2', 'Sara Haddad', '0661 44 55 66', '["sub_math","sub_physics"]'::jsonb, 'fixed', 1500, null, 1786726753679),
  ('t3', 'Yacine Cherif', '0555 77 88 99', '["sub_arabic","sub_french","sub_math"]'::jsonb, 'percentage', 30, null, 1786726753679),
  ('t4', 'Nawal Bensalem', '0669 12 34 56', '["sub_science","sub_physics","sub_english","sub_math"]'::jsonb, 'percentage', 25, null, 1786726753679)
on conflict (id) do update set
  "name" = excluded."name",
  "phone" = excluded."phone",
  "subjects" = excluded."subjects",
  "paymentMode" = excluded."paymentMode",
  "schoolCutValue" = excluded."schoolCutValue",
  "negotiatedRate" = excluded."negotiatedRate",
  "createdAt" = excluded."createdAt";

-- rooms (5)
insert into public."rooms" ("id", "name", "capacity", "kind") values
  ('rm_big', 'Grande salle', 20, 'large'),
  ('rm_1', 'Classe 1', 12, 'standard'),
  ('rm_2', 'Classe 2', 12, 'standard'),
  ('rm_indiv', 'Salle individuelle', 2, 'individual'),
  ('rm_office', 'Bureau', 4, 'office')
on conflict (id) do update set
  "name" = excluded."name",
  "capacity" = excluded."capacity",
  "kind" = excluded."kind";

-- students (8)
insert into public."students" ("id", "name", "level", "phone", "parentName", "parentPhone", "status", "enrolledSubjects", "linkedAccountId", "createdAt") values
  ('s1', 'Ahmed Saïdi', '3as', '0770 10 20 30', 'Karim Saïdi', '0770 99 88 77', 'active', '["sub_english","sub_math"]'::jsonb, 'u_student', 1783270753679),
  ('s2', 'Lina Meziane', '3am', '0771 11 21 31', 'Nadia Meziane', '0771 91 81 71', 'active', '["sub_english"]'::jsonb, null, 1784134753679),
  ('s3', 'Yacine Boudiaf', '3as', '0772 12 22 32', 'Rachid Boudiaf', '0772 92 82 72', 'active', '["sub_english","sub_french"]'::jsonb, null, 1784998753679),
  ('s4', 'Yasmine Torki', '4am', '0772 12 22 32', 'Samir Torki', '0772 92 82 72', 'active', '[]'::jsonb, null, 1784998753679),
  ('s5', 'Rayan Belhadj', '4am', '0773 13 23 33', 'Hakim Belhadj', '0773 93 83 73', 'active', '[]'::jsonb, null, 1785171553679),
  ('s6', 'Imane Cherifi', '4am', '0774 14 24 34', 'Leila Cherifi', '0774 94 84 74', 'active', '[]'::jsonb, null, 1785430753679),
  ('s7', 'Mehdi Larbi', '5ap', '0775 15 25 35', 'Omar Larbi', '0775 95 85 75', 'active', '[]'::jsonb, null, 1785689953679),
  ('s8', 'Sirine Amrani', '1as', '0776 16 26 36', 'Fatima Amrani', '0776 96 86 76', 'active', '[]'::jsonb, null, 1785862753679)
on conflict (id) do update set
  "name" = excluded."name",
  "level" = excluded."level",
  "phone" = excluded."phone",
  "parentName" = excluded."parentName",
  "parentPhone" = excluded."parentPhone",
  "status" = excluded."status",
  "enrolledSubjects" = excluded."enrolledSubjects",
  "linkedAccountId" = excluded."linkedAccountId",
  "createdAt" = excluded."createdAt";

-- classes (3)
insert into public."classes" ("id", "subjectId", "teacherId", "level", "sessionType", "dayOfWeek", "timeSlot", "maxStudents", "currentStudents", "isLocked", "waitingList", "createdAt", "roomId", "pricePerSession", "schoolCutMode", "schoolCutValue") values
  ('c1', 'sub_english', 't1', '3as', 'group', 'monday', '17:00-18:30', 15, 2, false, null, 1782838753679, 'rm_big', 2700, 'percentage', 25),
  ('c2', 'sub_french', 't1', '3as', 'group_special', 'wednesday', '18:30-20:00', 12, 1, false, null, 1782838753679, 'rm_1', 2700, 'percentage', 25),
  ('c3', 'sub_math', 't2', '3as', 'one_on_one', 'tuesday', '15:30-17:00', 4, 1, false, null, 1782838753679, 'rm_indiv', 2700, 'percentage', 25)
on conflict (id) do update set
  "subjectId" = excluded."subjectId",
  "teacherId" = excluded."teacherId",
  "level" = excluded."level",
  "sessionType" = excluded."sessionType",
  "dayOfWeek" = excluded."dayOfWeek",
  "timeSlot" = excluded."timeSlot",
  "maxStudents" = excluded."maxStudents",
  "currentStudents" = excluded."currentStudents",
  "isLocked" = excluded."isLocked",
  "waitingList" = excluded."waitingList",
  "createdAt" = excluded."createdAt",
  "roomId" = excluded."roomId",
  "pricePerSession" = excluded."pricePerSession",
  "schoolCutMode" = excluded."schoolCutMode",
  "schoolCutValue" = excluded."schoolCutValue";

-- enrollments (5)
insert into public."enrollments" ("id", "studentId", "classId", "subjectId", "teacherId", "pricePerSession", "startDate", "status") values
  ('e1', 's1', 'c1', 'sub_english', 't1', 2700, 1783270753679, 'active'),
  ('e2', 's1', 'c3', 'sub_math', 't2', 5000, 1783270753679, 'active'),
  ('e3', 's2', 'c1', 'sub_english', 't1', 2700, 1784134753679, 'active'),
  ('e4', 's3', 'c1', 'sub_english', 't1', 2700, 1784998753679, 'active'),
  ('e5', 's3', 'c2', 'sub_french', 't1', 3000, 1784998753679, 'active')
on conflict (id) do update set
  "studentId" = excluded."studentId",
  "classId" = excluded."classId",
  "subjectId" = excluded."subjectId",
  "teacherId" = excluded."teacherId",
  "pricePerSession" = excluded."pricePerSession",
  "startDate" = excluded."startDate",
  "status" = excluded."status";

-- sessions (4)
insert into public."sessions" ("id", "classId", "teacherId", "date", "sessionNumber", "notes", "attendance") values
  ('sess_c1_1', 'c1', 't1', 1784912353679, 1, 'Révision des temps du présent.', '{"s1":"present","s2":"present","s3":"present"}'::jsonb),
  ('sess_c1_2', 'c1', 't1', 1785517153679, 2, null, '{"s1":"present","s2":"absent_free","s3":"present"}'::jsonb),
  ('sess_c1_3', 'c1', 't1', 1786121953679, 3, null, '{"s1":"absent_paid","s2":"present","s3":"present"}'::jsonb),
  ('sess_c3_1', 'c3', 't2', 1784998753679, 1, null, '{"s1":"present"}'::jsonb)
on conflict (id) do update set
  "classId" = excluded."classId",
  "teacherId" = excluded."teacherId",
  "date" = excluded."date",
  "sessionNumber" = excluded."sessionNumber",
  "notes" = excluded."notes",
  "attendance" = excluded."attendance";

-- payments (9)
insert into public."payments" ("id", "studentId", "enrollmentId", "sessionId", "amount", "status", "month", "paidAt", "schoolCut", "teacherCut", "reminderCount", "lastReminderAt") values
  ('p1', 's1', 'e1', 'sess_c1_1', 2700, 'paid', '2026-08', 1786294753679, 675, 2025, 0, null),
  ('p2', 's1', 'e1', 'sess_c1_2', 2700, 'unpaid', '2026-08', null, 675, 2025, 2, 1786553953679),
  ('p3', 's1', 'e1', 'sess_c1_3', 2700, 'unpaid', '2026-08', null, 675, 2025, 1, 1786553953679),
  ('p4', 's1', 'e2', 'sess_c3_1', 5000, 'paid', '2026-08', 1786294753679, 1500, 3500, 0, null),
  ('p5', 's2', 'e3', 'sess_c1_1', 2700, 'paid', '2026-08', 1786294753679, 675, 2025, 0, null),
  ('p6', 's2', 'e3', 'sess_c1_3', 2700, 'unpaid', '2026-08', null, 675, 2025, 1, 1786553953679),
  ('p7', 's3', 'e4', 'sess_c1_1', 2700, 'paid', '2026-08', 1786294753679, 675, 2025, 0, null),
  ('p8', 's3', 'e4', 'sess_c1_2', 2700, 'paid', '2026-08', 1786294753679, 675, 2025, 0, null),
  ('p9', 's3', 'e4', 'sess_c1_3', 2700, 'paid', '2026-08', 1786294753679, 675, 2025, 0, null)
on conflict (id) do update set
  "studentId" = excluded."studentId",
  "enrollmentId" = excluded."enrollmentId",
  "sessionId" = excluded."sessionId",
  "amount" = excluded."amount",
  "status" = excluded."status",
  "month" = excluded."month",
  "paidAt" = excluded."paidAt",
  "schoolCut" = excluded."schoolCut",
  "teacherCut" = excluded."teacherCut",
  "reminderCount" = excluded."reminderCount",
  "lastReminderAt" = excluded."lastReminderAt";

-- enrollmentRequests (6)
insert into public."enrollmentRequests" ("id", "studentId", "subjectId", "teacherId", "status", "classId", "createdAt", "reviewedAt") values
  ('er1', 's4', 'sub_math', 't2', 'pending', null, 1786208353679, null),
  ('er2', 's5', 'sub_math', 't2', 'pending', null, 1786294753679, null),
  ('er3', 's6', 'sub_math', 't2', 'pending', null, 1786294753679, null),
  ('er4', 's6', 'sub_science', 't4', 'pending', null, 1786381153679, null),
  ('er5', 's7', 'sub_arabic', 't3', 'pending', null, 1786467553679, null),
  ('er6', 's8', 'sub_english', 't4', 'pending', null, 1786553953679, null)
on conflict (id) do update set
  "studentId" = excluded."studentId",
  "subjectId" = excluded."subjectId",
  "teacherId" = excluded."teacherId",
  "status" = excluded."status",
  "classId" = excluded."classId",
  "createdAt" = excluded."createdAt",
  "reviewedAt" = excluded."reviewedAt";

-- ============================================================
-- Reservations faites avant la validation du compte
-- ============================================================
-- Un compte en attente n'a pas encore de fiche eleve : il ne peut donc pas
-- porter d'"enrollmentRequests", qui pointe sur un studentId. Les groupes qu'il
-- reserve depuis la page de decouverte attendent ici, sur sa propre demande
-- d'inscription, et approveRegistration() les transforme en vraies inscriptions
-- au moment de la validation.
alter table public."registrationRequests"
  add column if not exists "wantedClassIds" jsonb;

-- ============================================================
-- Seances supplementaires
-- ============================================================
-- Rattrapage, revision d'examen, cours ajoute a la demande des eleves : une
-- seance qui ne tombe pas sur le creneau hebdomadaire du groupe. Plusieurs
-- peuvent exister le meme jour, contrairement a une seance ordinaire.
alter table public.sessions
  add column if not exists "isExtra" boolean;
