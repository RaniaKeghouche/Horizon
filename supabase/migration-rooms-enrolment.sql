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


-- ---------------------------------------------------------------------------
-- 7. Rollback for the demo data (see DELETE-DEMO-DATA.sql) — kept separate so
--    you can drop the mock rows without touching the schema.
-- ---------------------------------------------------------------------------
