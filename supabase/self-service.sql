-- ===========================================================================
--  Inscriptions faites par l'eleve, et paiements generes par l'enseignant
-- ===========================================================================
--  A executer une fois dans Supabase → SQL Editor. Idempotent : relancable.
--
--  LE PROBLEME
--  -----------
--  Les regles d'ecriture (schema.sql) reservent a l'administration l'insertion
--  dans `enrollments` et `payments`, ainsi que la mise a jour de `classes` :
--
--      create policy ins_enrollments ... with check (public.is_admin());
--      create policy upd_classes     ... using      (public.is_admin());
--      create policy ins_payments    ... with check (public.is_admin());
--
--  Consequences observees :
--
--   1. Un eleve qui reserve un groupe voyait « Inscrit(e) » a l'ecran, mais les
--      deux ecritures — la ligne d'inscription et le compteur de places du
--      groupe — etaient refusees par la base. La file d'attente hors ligne
--      abandonne une ecriture refusee (sinon elle bloquerait toute la file),
--      si bien que l'inscription disparaissait au rechargement et n'apparaissait
--      jamais dans le groupe de l'enseignant.
--
--   2. Un enseignant qui fait l'appel cree bien la seance (autorisee), mais les
--      lignes de paiement engendrees par cette seance etaient refusees. La
--      seance existait sans sa facturation.
--
--  LA CORRECTION
--  -------------
--  On n'ouvre PAS `classes` en ecriture aux eleves : ils pourraient alors
--  changer le prix, la capacite ou l'enseignant d'un groupe. On passe par une
--  fonction `security definer` qui fait le travail cote serveur, en une seule
--  transaction, et qui verifie elle-meme les conditions.
--
--  C'est aussi la seule facon correcte de compter les places : deux eleves qui
--  cliquent en meme temps sur le dernier siege doivent etre departages par la
--  base, pas par leurs navigateurs.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Inscription d'un eleve a un groupe
-- ---------------------------------------------------------------------------
create or replace function public.self_enroll(p_class_id text)
  returns public.enrollments
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_student_id text;
  v_class      public.classes%rowtype;
  v_existing   public.enrollments%rowtype;
  v_new        public.enrollments%rowtype;
  v_price      numeric;
begin
  -- Qui appelle ? La fiche eleve rattachee au compte connecte.
  v_student_id := public.my_student_id();
  if v_student_id is null then
    raise exception 'aucune fiche eleve rattachee a ce compte'
      using errcode = '42501';
  end if;

  -- `for update` verrouille la ligne du groupe : deux inscriptions simultanees
  -- sur le dernier siege sont serialisees, la seconde voit le compteur a jour.
  select * into v_class from public.classes where id = p_class_id for update;
  if not found then
    raise exception 'groupe introuvable' using errcode = 'P0002';
  end if;

  -- Deja inscrit : on renvoie l'inscription existante plutot qu'une erreur,
  -- pour qu'un double-clic reste sans effet.
  select * into v_existing
  from public.enrollments
  where "studentId" = v_student_id and "classId" = p_class_id;
  if found then
    return v_existing;
  end if;

  if v_class."currentStudents" >= v_class."maxStudents" then
    raise exception 'groupe complet' using errcode = '23514';
  end if;

  -- Le niveau doit correspondre : la page ne propose que les groupes du niveau
  -- de l'eleve, mais la regle ne doit pas dependre de l'interface.
  if not exists (
    select 1 from public.students
    where id = v_student_id and level = v_class.level
  ) then
    raise exception 'le niveau de l''eleve ne correspond pas a celui du groupe'
      using errcode = '23514';
  end if;

  v_price := coalesce(nullif(v_class."pricePerSession", 0), 2000);

  insert into public.enrollments
    (id, "studentId", "classId", "subjectId", "teacherId", "pricePerSession", "startDate", status)
  values
    (gen_random_uuid()::text, v_student_id, p_class_id, v_class."subjectId",
     v_class."teacherId", v_price, (extract(epoch from now()) * 1000)::bigint, 'active')
  returning * into v_new;

  -- Le compteur de places et le verrou du groupe suivent, dans la meme
  -- transaction : jamais d'inscription sans place decomptee.
  update public.classes
  set "currentStudents" = v_class."currentStudents" + 1,
      "isLocked"        = (v_class."currentStudents" + 1) >= v_class."maxStudents"
  where id = p_class_id;

  -- La matiere rejoint la liste de l'eleve si elle n'y est pas deja.
  update public.students
  set "enrolledSubjects" =
        case when "enrolledSubjects" @> to_jsonb(array[v_class."subjectId"])
             then "enrolledSubjects"
             else coalesce("enrolledSubjects", '[]'::jsonb) || to_jsonb(array[v_class."subjectId"])
        end
  where id = v_student_id;

  return v_new;
end;
$$;

revoke all on function public.self_enroll(text) from public;
grant execute on function public.self_enroll(text) to authenticated;

comment on function public.self_enroll(text) is
  'Inscrit l''eleve du compte appelant au groupe donne : verifie la place, le '
  'niveau et l''absence de doublon, puis met a jour le compteur du groupe dans '
  'la meme transaction.';

-- ---------------------------------------------------------------------------
-- 2. Paiements engendres par l'appel de l'enseignant
-- ---------------------------------------------------------------------------
-- Un enseignant peut creer une ligne de paiement UNIQUEMENT pour une
-- inscription de l'un de ses propres groupes. Il ne peut ni la marquer payee
-- ensuite (cela reste `upd_payments`, reserve a l'administration), ni toucher
-- aux paiements des autres enseignants.
drop policy if exists ins_payments on public.payments;
create policy ins_payments on public.payments for insert to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1 from public.enrollments e
      where e.id = "enrollmentId"
        and e."teacherId" = public.my_teacher_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Verification
-- ---------------------------------------------------------------------------
-- Attendu : une ligne pour self_enroll, et la politique ins_payments recreee.
select 'fonction' as objet, proname as nom
from pg_proc where proname = 'self_enroll'
union all
select 'politique', polname
from pg_policy where polname = 'ins_payments';
