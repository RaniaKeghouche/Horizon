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
    -- Liste engendree depuis src/lib/types.ts : elle couvre TOUT ce que
    -- l'application peut ecrire. Une liste tenue a la main avait deja
    -- laisse passer wantedClassIds, isExtra puis note.
    ('colonne',  'users', 'role', 'columns-catchup.sql'),
    ('colonne',  'users', 'displayName', 'columns-catchup.sql'),
    ('colonne',  'users', 'email', 'columns-catchup.sql'),
    ('colonne',  'users', 'phone', 'columns-catchup.sql'),
    ('colonne',  'users', 'linkedStudentId', 'columns-catchup.sql'),
    ('colonne',  'users', 'teacherId', 'columns-catchup.sql'),
    ('colonne',  'users', 'fcmTokens', 'columns-catchup.sql'),
    ('colonne',  'users', 'createdAt', 'columns-catchup.sql'),
    ('colonne',  'students', 'name', 'columns-catchup.sql'),
    ('colonne',  'students', 'level', 'columns-catchup.sql'),
    ('colonne',  'students', 'phone', 'columns-catchup.sql'),
    ('colonne',  'students', 'parentName', 'columns-catchup.sql'),
    ('colonne',  'students', 'parentPhone', 'columns-catchup.sql'),
    ('colonne',  'students', 'status', 'columns-catchup.sql'),
    ('colonne',  'students', 'enrolledSubjects', 'columns-catchup.sql'),
    ('colonne',  'students', 'linkedAccountId', 'columns-catchup.sql'),
    ('colonne',  'students', 'createdAt', 'columns-catchup.sql'),
    ('colonne',  'teachers', 'name', 'columns-catchup.sql'),
    ('colonne',  'teachers', 'phone', 'columns-catchup.sql'),
    ('colonne',  'teachers', 'subjects', 'columns-catchup.sql'),
    ('colonne',  'teachers', 'paymentMode', 'columns-catchup.sql'),
    ('colonne',  'teachers', 'schoolCutValue', 'columns-catchup.sql'),
    ('colonne',  'teachers', 'negotiatedRate', 'columns-catchup.sql'),
    ('colonne',  'teachers', 'createdAt', 'columns-catchup.sql'),
    ('colonne',  'subjects', 'name', 'columns-catchup.sql'),
    ('colonne',  'subjects', 'isCustom', 'columns-catchup.sql'),
    ('colonne',  'subjects', 'teachersByLevel', 'columns-catchup.sql'),
    ('colonne',  'subjects', 'createdAt', 'columns-catchup.sql'),
    ('colonne',  'rooms', 'name', 'columns-catchup.sql'),
    ('colonne',  'rooms', 'capacity', 'columns-catchup.sql'),
    ('colonne',  'rooms', 'kind', 'columns-catchup.sql'),
    ('colonne',  'classes', 'subjectId', 'columns-catchup.sql'),
    ('colonne',  'classes', 'teacherId', 'columns-catchup.sql'),
    ('colonne',  'classes', 'roomId', 'columns-catchup.sql'),
    ('colonne',  'classes', 'level', 'columns-catchup.sql'),
    ('colonne',  'classes', 'sessionType', 'columns-catchup.sql'),
    ('colonne',  'classes', 'dayOfWeek', 'columns-catchup.sql'),
    ('colonne',  'classes', 'timeSlot', 'columns-catchup.sql'),
    ('colonne',  'classes', 'maxStudents', 'columns-catchup.sql'),
    ('colonne',  'classes', 'pricePerSession', 'columns-catchup.sql'),
    ('colonne',  'classes', 'schoolCutMode', 'columns-catchup.sql'),
    ('colonne',  'classes', 'schoolCutValue', 'columns-catchup.sql'),
    ('colonne',  'classes', 'currentStudents', 'columns-catchup.sql'),
    ('colonne',  'classes', 'isLocked', 'columns-catchup.sql'),
    ('colonne',  'classes', 'waitingList', 'columns-catchup.sql'),
    ('colonne',  'classes', 'createdAt', 'columns-catchup.sql'),
    ('colonne',  'enrollments', 'studentId', 'columns-catchup.sql'),
    ('colonne',  'enrollments', 'classId', 'columns-catchup.sql'),
    ('colonne',  'enrollments', 'subjectId', 'columns-catchup.sql'),
    ('colonne',  'enrollments', 'teacherId', 'columns-catchup.sql'),
    ('colonne',  'enrollments', 'pricePerSession', 'columns-catchup.sql'),
    ('colonne',  'enrollments', 'startDate', 'columns-catchup.sql'),
    ('colonne',  'enrollments', 'status', 'columns-catchup.sql'),
    ('colonne',  'sessions', 'classId', 'columns-catchup.sql'),
    ('colonne',  'sessions', 'teacherId', 'columns-catchup.sql'),
    ('colonne',  'sessions', 'date', 'columns-catchup.sql'),
    ('colonne',  'sessions', 'sessionNumber', 'columns-catchup.sql'),
    ('colonne',  'sessions', 'notes', 'columns-catchup.sql'),
    ('colonne',  'sessions', 'attendance', 'columns-catchup.sql'),
    ('colonne',  'sessions', 'isExtra', 'columns-catchup.sql'),
    ('colonne',  'payments', 'studentId', 'columns-catchup.sql'),
    ('colonne',  'payments', 'enrollmentId', 'columns-catchup.sql'),
    ('colonne',  'payments', 'sessionId', 'columns-catchup.sql'),
    ('colonne',  'payments', 'amount', 'columns-catchup.sql'),
    ('colonne',  'payments', 'status', 'columns-catchup.sql'),
    ('colonne',  'payments', 'month', 'columns-catchup.sql'),
    ('colonne',  'payments', 'paidAt', 'columns-catchup.sql'),
    ('colonne',  'payments', 'schoolCut', 'columns-catchup.sql'),
    ('colonne',  'payments', 'teacherCut', 'columns-catchup.sql'),
    ('colonne',  'payments', 'reminderCount', 'columns-catchup.sql'),
    ('colonne',  'payments', 'lastReminderAt', 'columns-catchup.sql'),
    ('colonne',  'payments', 'note', 'columns-catchup.sql'),
    ('colonne',  'notifications', 'userId', 'columns-catchup.sql'),
    ('colonne',  'notifications', 'type', 'columns-catchup.sql'),
    ('colonne',  'notifications', 'message', 'columns-catchup.sql'),
    ('colonne',  'notifications', 'msgKey', 'columns-catchup.sql'),
    ('colonne',  'notifications', 'msgParams', 'columns-catchup.sql'),
    ('colonne',  'notifications', 'read', 'columns-catchup.sql'),
    ('colonne',  'notifications', 'createdAt', 'columns-catchup.sql'),
    ('colonne',  'activityLog', 'userId', 'columns-catchup.sql'),
    ('colonne',  'activityLog', 'action', 'columns-catchup.sql'),
    ('colonne',  'activityLog', 'msgKey', 'columns-catchup.sql'),
    ('colonne',  'activityLog', 'msgParams', 'columns-catchup.sql'),
    ('colonne',  'activityLog', 'details', 'columns-catchup.sql'),
    ('colonne',  'activityLog', 'createdAt', 'columns-catchup.sql'),
    ('colonne',  'slotRequests', 'teacherId', 'columns-catchup.sql'),
    ('colonne',  'slotRequests', 'subjectId', 'columns-catchup.sql'),
    ('colonne',  'slotRequests', 'dayOfWeek', 'columns-catchup.sql'),
    ('colonne',  'slotRequests', 'timeSlot', 'columns-catchup.sql'),
    ('colonne',  'slotRequests', 'status', 'columns-catchup.sql'),
    ('colonne',  'slotRequests', 'createdAt', 'columns-catchup.sql'),
    ('colonne',  'registrationRequests', 'role', 'columns-catchup.sql'),
    ('colonne',  'registrationRequests', 'email', 'columns-catchup.sql'),
    ('colonne',  'registrationRequests', 'name', 'columns-catchup.sql'),
    ('colonne',  'registrationRequests', 'phone', 'columns-catchup.sql'),
    ('colonne',  'registrationRequests', 'level', 'columns-catchup.sql'),
    ('colonne',  'registrationRequests', 'parentName', 'columns-catchup.sql'),
    ('colonne',  'registrationRequests', 'parentPhone', 'columns-catchup.sql'),
    ('colonne',  'registrationRequests', 'subjects', 'columns-catchup.sql'),
    ('colonne',  'registrationRequests', 'preferredClassId', 'columns-catchup.sql'),
    ('colonne',  'registrationRequests', 'wantedClassIds', 'columns-catchup.sql'),
    ('colonne',  'registrationRequests', 'status', 'columns-catchup.sql'),
    ('colonne',  'registrationRequests', 'createdAt', 'columns-catchup.sql'),
    ('colonne',  'registrationRequests', 'reviewedAt', 'columns-catchup.sql'),
    ('colonne',  'enrollmentRequests', 'studentId', 'columns-catchup.sql'),
    ('colonne',  'enrollmentRequests', 'subjectId', 'columns-catchup.sql'),
    ('colonne',  'enrollmentRequests', 'teacherId', 'columns-catchup.sql'),
    ('colonne',  'enrollmentRequests', 'status', 'columns-catchup.sql'),
    ('colonne',  'enrollmentRequests', 'classId', 'columns-catchup.sql'),
    ('colonne',  'enrollmentRequests', 'createdAt', 'columns-catchup.sql'),
    ('colonne',  'enrollmentRequests', 'reviewedAt', 'columns-catchup.sql'),
    ('colonne',  'teacherPayouts', 'teacherId', 'columns-catchup.sql'),
    ('colonne',  'teacherPayouts', 'amount', 'columns-catchup.sql'),
    ('colonne',  'teacherPayouts', 'month', 'columns-catchup.sql'),
    ('colonne',  'teacherPayouts', 'paidAt', 'columns-catchup.sql'),
    ('colonne',  'teacherPayouts', 'confirmedByTeacher', 'columns-catchup.sql'),
    ('colonne',  'teacherPayouts', 'confirmedAt', 'columns-catchup.sql'),
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
