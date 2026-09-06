-- ===========================================================================
--  Rattrapage des colonnes — à exécuter une fois
-- ===========================================================================
--  À coller dans Supabase → SQL Editor. Idempotent : relançable sans risque,
--  n'ajoute que ce qui manque et ne touche à AUCUNE donnée.
--
--  POURQUOI CE FICHIER
--  -------------------
--  Trois fois déjà, une colonne attendue par l'application manquait en base
--  parce que `SETUP.sql` avait été exécuté dans une version antérieure à son
--  ajout : `wantedClassIds`, `isExtra`, puis `note` sur les paiements.
--
--  À chaque fois, la panne est SILENCIEUSE : la file d'écriture retire le champ
--  que la base ne connaît pas et enregistre le reste. L'application affiche un
--  succès, et la donnée est perdue. Pour `note`, c'est le commentaire saisi à
--  l'encaissement qui disparaissait.
--
--  Ce fichier est engendré depuis `src/lib/types.ts` : il contient TOUTES les
--  colonnes que l'application peut écrire, pas une liste tenue à la main.
-- ===========================================================================

-- users
alter table public."users" add column if not exists "role" text;
alter table public."users" add column if not exists "displayName" text;
alter table public."users" add column if not exists "email" text;
alter table public."users" add column if not exists "phone" text;
alter table public."users" add column if not exists "linkedStudentId" text;
alter table public."users" add column if not exists "teacherId" text;
alter table public."users" add column if not exists "fcmTokens" jsonb;
alter table public."users" add column if not exists "createdAt" double precision;

-- students
alter table public."students" add column if not exists "name" text;
alter table public."students" add column if not exists "level" text;
alter table public."students" add column if not exists "phone" text;
alter table public."students" add column if not exists "parentName" text;
alter table public."students" add column if not exists "parentPhone" text;
alter table public."students" add column if not exists "status" text;
alter table public."students" add column if not exists "enrolledSubjects" jsonb;
alter table public."students" add column if not exists "linkedAccountId" text;
alter table public."students" add column if not exists "createdAt" double precision;

-- teachers
alter table public."teachers" add column if not exists "name" text;
alter table public."teachers" add column if not exists "phone" text;
alter table public."teachers" add column if not exists "subjects" jsonb;
alter table public."teachers" add column if not exists "paymentMode" text;
alter table public."teachers" add column if not exists "schoolCutValue" double precision;
alter table public."teachers" add column if not exists "negotiatedRate" double precision;
alter table public."teachers" add column if not exists "createdAt" double precision;

-- subjects
alter table public."subjects" add column if not exists "name" text;
alter table public."subjects" add column if not exists "isCustom" boolean;
alter table public."subjects" add column if not exists "teachersByLevel" jsonb;
alter table public."subjects" add column if not exists "createdAt" double precision;

-- rooms
alter table public."rooms" add column if not exists "name" text;
alter table public."rooms" add column if not exists "capacity" double precision;
alter table public."rooms" add column if not exists "kind" text;

-- classes
alter table public."classes" add column if not exists "subjectId" text;
alter table public."classes" add column if not exists "teacherId" text;
alter table public."classes" add column if not exists "roomId" text;
alter table public."classes" add column if not exists "level" text;
alter table public."classes" add column if not exists "sessionType" text;
alter table public."classes" add column if not exists "dayOfWeek" text;
alter table public."classes" add column if not exists "timeSlot" text;
alter table public."classes" add column if not exists "maxStudents" double precision;
alter table public."classes" add column if not exists "pricePerSession" double precision;
alter table public."classes" add column if not exists "schoolCutMode" text;
alter table public."classes" add column if not exists "schoolCutValue" double precision;
alter table public."classes" add column if not exists "currentStudents" double precision;
alter table public."classes" add column if not exists "isLocked" boolean;
alter table public."classes" add column if not exists "waitingList" jsonb;
alter table public."classes" add column if not exists "createdAt" double precision;

-- enrollments
alter table public."enrollments" add column if not exists "studentId" text;
alter table public."enrollments" add column if not exists "classId" text;
alter table public."enrollments" add column if not exists "subjectId" text;
alter table public."enrollments" add column if not exists "teacherId" text;
alter table public."enrollments" add column if not exists "pricePerSession" double precision;
alter table public."enrollments" add column if not exists "startDate" double precision;
alter table public."enrollments" add column if not exists "status" text;

-- sessions
alter table public."sessions" add column if not exists "classId" text;
alter table public."sessions" add column if not exists "teacherId" text;
alter table public."sessions" add column if not exists "date" double precision;
alter table public."sessions" add column if not exists "sessionNumber" double precision;
alter table public."sessions" add column if not exists "notes" text;
alter table public."sessions" add column if not exists "attendance" jsonb;
alter table public."sessions" add column if not exists "isExtra" boolean;

-- payments
alter table public."payments" add column if not exists "studentId" text;
alter table public."payments" add column if not exists "enrollmentId" text;
alter table public."payments" add column if not exists "sessionId" text;
alter table public."payments" add column if not exists "amount" double precision;
alter table public."payments" add column if not exists "status" text;
alter table public."payments" add column if not exists "month" text;
alter table public."payments" add column if not exists "paidAt" double precision;
alter table public."payments" add column if not exists "schoolCut" double precision;
alter table public."payments" add column if not exists "teacherCut" double precision;
alter table public."payments" add column if not exists "reminderCount" double precision;
alter table public."payments" add column if not exists "lastReminderAt" double precision;
alter table public."payments" add column if not exists "note" text;

-- notifications
alter table public."notifications" add column if not exists "userId" text;
alter table public."notifications" add column if not exists "type" text;
alter table public."notifications" add column if not exists "message" text;
alter table public."notifications" add column if not exists "msgKey" text;
alter table public."notifications" add column if not exists "msgParams" jsonb;
alter table public."notifications" add column if not exists "read" boolean;
alter table public."notifications" add column if not exists "createdAt" double precision;

-- activityLog
alter table public."activityLog" add column if not exists "userId" text;
alter table public."activityLog" add column if not exists "action" text;
alter table public."activityLog" add column if not exists "msgKey" text;
alter table public."activityLog" add column if not exists "msgParams" jsonb;
alter table public."activityLog" add column if not exists "details" text;
alter table public."activityLog" add column if not exists "createdAt" double precision;

-- slotRequests
alter table public."slotRequests" add column if not exists "teacherId" text;
alter table public."slotRequests" add column if not exists "subjectId" text;
alter table public."slotRequests" add column if not exists "dayOfWeek" text;
alter table public."slotRequests" add column if not exists "timeSlot" text;
alter table public."slotRequests" add column if not exists "status" text;
alter table public."slotRequests" add column if not exists "createdAt" double precision;

-- registrationRequests
alter table public."registrationRequests" add column if not exists "role" text;
alter table public."registrationRequests" add column if not exists "email" text;
alter table public."registrationRequests" add column if not exists "name" text;
alter table public."registrationRequests" add column if not exists "phone" text;
alter table public."registrationRequests" add column if not exists "level" text;
alter table public."registrationRequests" add column if not exists "parentName" text;
alter table public."registrationRequests" add column if not exists "parentPhone" text;
alter table public."registrationRequests" add column if not exists "subjects" jsonb;
alter table public."registrationRequests" add column if not exists "preferredClassId" text;
alter table public."registrationRequests" add column if not exists "wantedClassIds" jsonb;
alter table public."registrationRequests" add column if not exists "status" text;
alter table public."registrationRequests" add column if not exists "createdAt" double precision;
alter table public."registrationRequests" add column if not exists "reviewedAt" double precision;

-- enrollmentRequests
alter table public."enrollmentRequests" add column if not exists "studentId" text;
alter table public."enrollmentRequests" add column if not exists "subjectId" text;
alter table public."enrollmentRequests" add column if not exists "teacherId" text;
alter table public."enrollmentRequests" add column if not exists "status" text;
alter table public."enrollmentRequests" add column if not exists "classId" text;
alter table public."enrollmentRequests" add column if not exists "createdAt" double precision;
alter table public."enrollmentRequests" add column if not exists "reviewedAt" double precision;

-- teacherPayouts
alter table public."teacherPayouts" add column if not exists "teacherId" text;
alter table public."teacherPayouts" add column if not exists "amount" double precision;
alter table public."teacherPayouts" add column if not exists "month" text;
alter table public."teacherPayouts" add column if not exists "paidAt" double precision;
alter table public."teacherPayouts" add column if not exists "confirmedByTeacher" boolean;
alter table public."teacherPayouts" add column if not exists "confirmedAt" double precision;

-- ---------------------------------------------------------------------------
-- Vérification : exécutez ensuite VERIFY.sql, tout doit afficher « OK ».
-- ---------------------------------------------------------------------------
