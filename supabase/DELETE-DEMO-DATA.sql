-- Removes ONLY the demonstration rows inserted by SETUP.sql (partie 2).
-- Every id is listed explicitly rather than matched with LIKE, so a real row
-- can never be caught by accident.
--
-- Run top-to-bottom: children first, then parents.

delete from public."enrollmentRequests" where id in ('er1','er2','er3','er4','er5','er6');
delete from public.payments    where id in ('p1','p2','p3','p4','p5','p6','p7','p8','p9');
delete from public.sessions    where id in ('sess_c1_1','sess_c1_2','sess_c1_3','sess_c3_1');
delete from public.enrollments where id in ('e1','e2','e3','e4','e5');
delete from public.classes     where id in ('c1','c2','c3');
delete from public.students    where id in ('s1','s2','s3','s4','s5','s6','s7','s8');
delete from public.teachers    where id in ('t1','t2','t3','t4');
delete from public.rooms       where id in ('rm_big','rm_1','rm_2','rm_indiv','rm_office');

-- Subjects are NOT deleted: sub_math, sub_arabic… are the app's default subject
-- list and exist independently of the demo. Only the demo teacher assignments
-- (which point at t1..t4) are cleared, so the subjects stay usable.
update public.subjects set "teachersByLevel" = '{}'::jsonb
where id in ('sub_math','sub_arabic','sub_english','sub_french','sub_science','sub_physics');

-- Rooms are also part of the real setup (the centre really has 5 rooms).
-- If you want to KEEP them, comment out the `delete from public.rooms` line above.

-- Sanity check — every count below should be 0.
-- select
--   (select count(*) from public.teachers where id in ('t1','t2','t3','t4')) as teachers,
--   (select count(*) from public.students where id in ('s1','s2','s3','s4','s5','s6','s7','s8')) as students,
--   (select count(*) from public.classes  where id in ('c1','c2','c3')) as classes,
--   (select count(*) from public.payments where id in ('p1','p2','p3','p4','p5','p6','p7','p8','p9')) as payments;
