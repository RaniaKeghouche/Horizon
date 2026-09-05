-- ===========================================================================
--  Reservations d'un candidat encore en attente de validation
-- ===========================================================================
--  A executer apres self-service.sql, dans Supabase → SQL Editor. Idempotent.
--
--  LE PROBLEME
--  -----------
--  Un compte en attente choisit ses groupes depuis la page de decouverte ; le
--  choix est garde dans la colonne "wantedClassIds" de SA demande d'inscription.
--  Or la regle de mise a jour de cette table est reservee a l'administration :
--
--      create policy upd_reg ... using (public.is_admin());
--
--  Les reservations etaient donc refusees en silence, exactement comme les
--  inscriptions l'etaient avant self-service.sql : visibles a l'ecran, absentes
--  de la base, et perdues au rechargement — donc jamais converties en
--  inscriptions le jour de la validation.
--
--  LA CORRECTION
--  -------------
--  On autorise une personne a modifier SA PROPRE demande, mais uniquement la
--  colonne des reservations. Un declencheur rejette toute autre modification :
--  sans lui, un candidat pourrait passer son dossier a « approuve » lui-meme et
--  polluer la file de l'administration.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Le declencheur : hors administration, seul "wantedClassIds" peut bouger
-- ---------------------------------------------------------------------------
create or replace function public.reg_request_guard()
  returns trigger
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  -- Toutes les colonnes sauf "wantedClassIds" doivent rester identiques.
  if new.id is distinct from old.id
     or new.role is distinct from old.role
     or new.email is distinct from old.email
     or new.name is distinct from old.name
     or new.phone is distinct from old.phone
     or new.level is distinct from old.level
     or new."parentName" is distinct from old."parentName"
     or new."parentPhone" is distinct from old."parentPhone"
     or new.subjects is distinct from old.subjects
     or new."preferredClassId" is distinct from old."preferredClassId"
     or new.status is distinct from old.status
     or new."createdAt" is distinct from old."createdAt"
     or new."reviewedAt" is distinct from old."reviewedAt"
  then
    raise exception 'seule la liste des groupes reserves peut etre modifiee'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists reg_request_guard on public."registrationRequests";
create trigger reg_request_guard
  before update on public."registrationRequests"
  for each row execute function public.reg_request_guard();

-- ---------------------------------------------------------------------------
-- 2. La regle : modifier sa propre demande, ou etre administrateur
-- ---------------------------------------------------------------------------
drop policy if exists upd_reg on public."registrationRequests";
create policy upd_reg on public."registrationRequests" for update to authenticated
  using (public.is_admin() or id = auth.uid()::text)
  with check (public.is_admin() or id = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- 3. Verification
-- ---------------------------------------------------------------------------
select 'declencheur' as objet, tgname as nom
from pg_trigger where tgname = 'reg_request_guard'
union all
select 'politique', polname
from pg_policy where polname = 'upd_reg';
