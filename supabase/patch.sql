-- Horizon — patch à exécuter dans Supabase (SQL Editor → Run).
-- 1) Colonne "groupe souhaité" pour les demandes d'inscription des élèves.
-- 2) Lecture PUBLIQUE du catalogue (matières / groupes / enseignants) pour que l'écran
--    d'inscription (utilisateur pas encore connecté) puisse afficher ses listes déroulantes.

alter table public."registrationRequests" add column if not exists "preferredClassId" text;

-- Lecture publique (anon) — infos non sensibles nécessaires à l'inscription.
drop policy if exists pub_subjects on public.subjects;
create policy pub_subjects on public.subjects for select to anon using (true);

drop policy if exists pub_classes on public.classes;
create policy pub_classes on public.classes for select to anon using (true);

drop policy if exists pub_teachers on public.teachers;
create policy pub_teachers on public.teachers for select to anon using (true);
