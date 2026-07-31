-- Horizon Skills Academy — schéma Supabase (Postgres)
-- À coller dans Supabase → SQL Editor → Run.
-- Colonnes en camelCase (identifiants entre guillemets) pour coller aux types de l'app.
-- Dates en millisecondes (double precision) ; tableaux/maps en jsonb ; ids en text (générés côté app).

-- ---------- Tables ----------
create table if not exists public.users (
  id text primary key,                    -- = id utilisateur Supabase Auth
  role text not null default 'student',   -- admin | teacher | student
  "displayName" text,
  email text,
  "linkedStudentId" text,
  "teacherId" text,
  "createdAt" double precision
);

create table if not exists public.students (
  id text primary key,
  name text not null,
  level text,
  phone text,
  "parentName" text,
  "parentPhone" text,
  status text default 'active',
  "enrolledSubjects" jsonb default '[]',
  "linkedAccountId" text,
  "createdAt" double precision
);

create table if not exists public.teachers (
  id text primary key,
  name text not null,
  phone text,
  subjects jsonb default '[]',
  "paymentMode" text default 'percentage',
  "schoolCutValue" double precision default 0,
  "negotiatedRate" double precision,
  "createdAt" double precision
);

create table if not exists public.subjects (
  id text primary key,
  name text not null,
  "isCustom" boolean default true,
  "createdAt" double precision
);

create table if not exists public.classes (
  id text primary key,
  "subjectId" text,
  "teacherId" text,
  level text,
  "sessionType" text,
  "dayOfWeek" text,
  "timeSlot" text,
  "maxStudents" double precision default 15,
  "currentStudents" double precision default 0,
  "isLocked" boolean default false,
  "waitingList" jsonb default '[]',
  "createdAt" double precision
);

create table if not exists public.enrollments (
  id text primary key,
  "studentId" text,
  "classId" text,
  "subjectId" text,
  "teacherId" text,
  "pricePerSession" double precision default 0,
  "startDate" double precision,
  status text default 'active'
);

create table if not exists public.sessions (
  id text primary key,
  "classId" text,
  "teacherId" text,
  date double precision,
  "sessionNumber" double precision,
  notes text,
  attendance jsonb default '{}'
);

create table if not exists public.payments (
  id text primary key,
  "studentId" text,
  "enrollmentId" text,
  "sessionId" text,
  amount double precision default 0,
  status text default 'unpaid',
  month text,
  "paidAt" double precision,
  "schoolCut" double precision default 0,
  "teacherCut" double precision default 0,
  "reminderCount" double precision default 0,
  "lastReminderAt" double precision
);

create table if not exists public.notifications (
  id text primary key,
  "userId" text,
  type text,
  message text,
  read boolean default false,
  "createdAt" double precision
);

create table if not exists public."activityLog" (
  id text primary key,
  "userId" text,
  action text,
  details text,
  "createdAt" double precision
);

create table if not exists public."slotRequests" (
  id text primary key,
  "teacherId" text,
  "subjectId" text,
  "dayOfWeek" text,
  "timeSlot" text,
  status text default 'pending',
  "createdAt" double precision
);

create table if not exists public."registrationRequests" (
  id text primary key,                    -- = id utilisateur Supabase Auth
  role text,
  email text,
  name text,
  phone text,
  level text,
  "parentName" text,
  "parentPhone" text,
  subjects jsonb default '[]',
  status text default 'pending',
  "createdAt" double precision,
  "reviewedAt" double precision
);

create table if not exists public."teacherPayouts" (
  id text primary key,
  "teacherId" text,
  amount double precision default 0,
  month text,
  "paidAt" double precision,
  "confirmedByTeacher" boolean default false,
  "confirmedAt" double precision
);

-- ---------- Helper ----------
create or replace function public.is_admin() returns boolean
language sql security definer stable as $$
  select exists(select 1 from public.users where id = auth.uid()::text and role = 'admin');
$$;

-- ---------- Row Level Security ----------
alter table public.users              enable row level security;
alter table public.students              enable row level security;
alter table public.teachers              enable row level security;
alter table public.subjects              enable row level security;
alter table public.classes               enable row level security;
alter table public.enrollments           enable row level security;
alter table public.sessions              enable row level security;
alter table public.payments              enable row level security;
alter table public.notifications         enable row level security;
alter table public."activityLog"         enable row level security;
alter table public."slotRequests"        enable row level security;
alter table public."registrationRequests" enable row level security;
alter table public."teacherPayouts"      enable row level security;

-- Tout utilisateur connecté peut LIRE (à durcir plus tard si besoin).
do $$
declare t text;
begin
  foreach t in array array['students','teachers','subjects','classes','enrollments',
                           'sessions','payments','notifications','activityLog',
                           'slotRequests','registrationRequests','teacherPayouts'] loop
    execute format('drop policy if exists sel_%1$s on public.%2$I;', replace(t,'"',''), t);
    execute format('create policy sel_%1$s on public.%2$I for select to authenticated using (true);', replace(t,'"',''), t);
  end loop;
end $$;

-- users : lire le sien ou admin ; créer le sien (bootstrap) ou admin ; modifier/suppr admin.
drop policy if exists sel_users on public.users;
create policy sel_users on public.users for select to authenticated
  using (id = auth.uid()::text or public.is_admin());
create policy ins_users on public.users for insert to authenticated
  with check (id = auth.uid()::text or public.is_admin());
create policy upd_users on public.users for update to authenticated
  using (public.is_admin());
create policy del_users on public.users for delete to authenticated
  using (public.is_admin());

-- Entités gérées par l'admin (écriture admin).
do $$
declare t text;
begin
  foreach t in array array['students','teachers','subjects','classes','enrollments','payments'] loop
    execute format('create policy ins_%1$s on public.%1$s for insert to authenticated with check (public.is_admin());', t);
    execute format('create policy upd_%1$s on public.%1$s for update to authenticated using (public.is_admin());', t);
    execute format('create policy del_%1$s on public.%1$s for delete to authenticated using (public.is_admin());', t);
  end loop;
end $$;

-- Séances : prof ou admin écrivent ; suppression admin.
create policy ins_sessions on public.sessions for insert to authenticated with check (true);
create policy upd_sessions on public.sessions for update to authenticated using (true);
create policy del_sessions on public.sessions for delete to authenticated using (public.is_admin());

-- Notifications / journal / demandes / paies : insert par utilisateur connecté ; update souple ; delete admin.
do $$
declare t text;
begin
  foreach t in array array['notifications','activityLog','slotRequests','teacherPayouts'] loop
    execute format('create policy ins_%1$s on public.%2$I for insert to authenticated with check (true);', replace(t,'"',''), t);
    execute format('create policy upd_%1$s on public.%2$I for update to authenticated using (true);', replace(t,'"',''), t);
    execute format('create policy del_%1$s on public.%2$I for delete to authenticated using (public.is_admin());', replace(t,'"',''), t);
  end loop;
end $$;

-- Demandes d'inscription : créer la sienne (id = uid) ; modifier/suppr admin.
create policy ins_reg on public."registrationRequests" for insert to authenticated
  with check (id = auth.uid()::text);
create policy upd_reg on public."registrationRequests" for update to authenticated
  using (public.is_admin());
create policy del_reg on public."registrationRequests" for delete to authenticated
  using (public.is_admin());

-- ---------- Realtime (synchro temps réel) ----------
do $$
declare t text;
begin
  foreach t in array array['users','students','teachers','subjects','classes','enrollments',
                           'sessions','payments','notifications','activityLog',
                           'slotRequests','registrationRequests','teacherPayouts'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I;', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
