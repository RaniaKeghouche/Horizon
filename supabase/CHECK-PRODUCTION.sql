-- ===========================================================================
--  Vérifier que l'application écrit VRAIMENT dans la base
-- ===========================================================================
--  À garder ouvert dans Supabase → SQL Editor pendant que vous faites le
--  parcours dans l'application. Chaque étape a sa requête : vous agissez dans
--  l'application, vous exécutez la requête ici, vous devez voir la ligne.
--
--  POURQUOI CE FICHIER EXISTE
--  --------------------------
--  Les tests automatiques (`npm test`) s'exécutent en mode démonstration, où
--  les écritures vers Supabase ne font rien. Ils ne disent donc RIEN des règles
--  de sécurité (RLS), de la file d'attente hors-ligne ni de la synchronisation.
--
--  Or c'est exactement là que se logent les pannes silencieuses : une écriture
--  refusée par une règle, ou une colonne inconnue retirée au passage, et
--  l'interface affiche quand même un succès. Ce parcours est le seul moyen de
--  s'en assurer.
--
--  RÈGLE D'OR : si une requête ne renvoie rien alors que l'application vous a
--  affiché un succès, l'écriture a été refusée. Ne continuez pas — regardez
--  d'abord si un bandeau orange s'affiche en haut de l'application.
-- ===========================================================================


-- ÉTAPE 0 ───────────────────────────────────────────────────────────────────
-- Avant de commencer : la base doit être à jour.
-- Attendu : que des « OK ». Sinon, exécutez le fichier nommé dans a_executer.
-- (C'est le contenu de VERIFY.sql — lancez-le d'abord.)


-- ÉTAPE 1 ───────────────────────────────────────────────────────────────────
-- Dans l'application : connectez-vous avec votre adresse d'administratrice.
-- Attendu ici : une ligne, role = 'admin'.
select id, role, "displayName", email
from public.users
where role = 'admin';


-- ÉTAPE 2 ───────────────────────────────────────────────────────────────────
-- Dans l'application : Enseignants → « Nouvel enseignant ».
-- Attendu : votre enseignant, créé il y a moins d'une minute.
select id, name, phone, subjects, "paymentMode", "schoolCutValue",
       to_timestamp("createdAt" / 1000) as cree_le
from public.teachers
order by "createdAt" desc
limit 3;


-- ÉTAPE 3 ───────────────────────────────────────────────────────────────────
-- Dans l'application : Planning → cliquez une case libre → créez le groupe.
-- Attendu : le groupe, avec currentStudents = 0 et isLocked = false.
-- ATTENTION au prix : c'est celui que verra l'élève ET celui qui sera facturé.
select c.id, s.name as matiere, t.name as enseignant, c.level, c."dayOfWeek",
       c."timeSlot", c."pricePerSession", c."maxStudents",
       c."currentStudents", c."isLocked"
from public.classes c
left join public.subjects s on s.id = c."subjectId"
left join public.teachers t on t.id = c."teacherId"
order by c."createdAt" desc
limit 3;


-- ÉTAPE 4 ───────────────────────────────────────────────────────────────────
-- Dans l'application : Élèves → « Nouvel élève », puis inscrivez-le au groupe.
-- Attendu : l'inscription, AU PRIX DU GROUPE affiché à l'étape 3.
-- Si pricePerSession diffère du prix du groupe, arrêtez-vous et dites-le moi.
select e.id, st.name as eleve, s.name as matiere, e."pricePerSession", e.status,
       to_timestamp(e."startDate" / 1000) as depuis
from public.enrollments e
left join public.students st on st.id = e."studentId"
left join public.subjects s on s.id = e."subjectId"
order by e."startDate" desc
limit 5;

-- Le compteur du groupe doit avoir suivi : currentStudents = 1.
select id, "currentStudents", "isLocked" from public.classes
order by "createdAt" desc limit 1;


-- ÉTAPE 5 ───────────────────────────────────────────────────────────────────
-- Dans l'application : Présences → cochez → « Enregistrer la séance ».
-- Attendu : UNE séance, avec sessionNumber = 1 et vos pointages.
select id, "classId", "sessionNumber",
       to_char(to_timestamp(date / 1000), 'DD/MM/YYYY') as jour,
       attendance, "isExtra", notes
from public.sessions
order by date desc
limit 5;


-- ÉTAPE 5 bis ───────────────────────────────────────────────────────────────
-- LE TEST QUI COMPTE. Dans l'application : ré-enregistrez la MÊME séance
-- (même groupe, même date), après avoir changé un pointage.
-- Attendu : TOUJOURS UNE SEULE LIGNE pour ce jour-là. Si vous en voyez deux,
-- la même leçon sera facturée deux fois — arrêtez-vous et dites-le moi.
select "classId",
       to_char(to_timestamp(date / 1000), 'DD/MM/YYYY') as jour,
       count(*) as nombre_de_seances
from public.sessions
where "isExtra" is not true
group by 1, 2
having count(*) > 1;
-- Attendu : AUCUNE ligne.


-- ÉTAPE 6 ───────────────────────────────────────────────────────────────────
-- Les factures naissent de la séance, sans rien faire de plus.
-- Attendu : une facture par élève PRÉSENT ou ABSENT FACTURÉ — aucune pour une
-- absence justifiée. schoolCut + teacherCut doit égaler amount.
select p.id, st.name as eleve, p.amount, p.status,
       p."schoolCut", p."teacherCut",
       (p."schoolCut" + p."teacherCut" = p.amount) as repartition_coherente,
       p.month
from public.payments p
left join public.students st on st.id = p."studentId"
order by p.id desc
limit 10;


-- ÉTAPE 7 ───────────────────────────────────────────────────────────────────
-- Dans l'application : Paiements → « Encaisser ».
-- Attendu : status = 'paid' et paidAt renseigné.
select id, status, amount,
       to_timestamp("paidAt" / 1000) as encaisse_le, note
from public.payments
where status = 'paid'
order by "paidAt" desc nulls last
limit 5;

-- Un SEUL accusé doit être parti vers la famille, portant le TOTAL encaissé.
-- Attendu : une ligne, et msgParams contient le montant total.
select id, "userId", "msgKey", "msgParams",
       to_timestamp("createdAt" / 1000) as le
from public.notifications
where "msgKey" = 'notif.payment_received'
order by "createdAt" desc
limit 5;


-- ÉTAPE 8 ───────────────────────────────────────────────────────────────────
-- LE CONTRÔLE DE LA TRADUCTION. Les deux colonnes ajoutées par
-- i18n-columns.sql doivent être REMPLIES, pas vides.
-- Attendu : msgKey non nul sur les notifications récentes. Si tout est nul,
-- la migration n'a pas été prise en compte et les messages resteront français.
select
  count(*)                                          as total,
  count("msgKey")                                   as avec_cle,
  count(*) - count("msgKey")                        as sans_cle_donc_en_francais
from public.notifications;

select
  count(*)                                          as total,
  count("msgKey")                                   as avec_cle
from public."activityLog";


-- ÉTAPE 9 ───────────────────────────────────────────────────────────────────
-- Dans l'application : Paie → dépliez l'enseignant → « Verser ».
-- Puis reconnectez-vous en enseignant → « Confirmer la réception ».
-- Attendu : confirmedByTeacher = true.
select tp.id, t.name as enseignant, tp.amount, tp.month,
       tp."confirmedByTeacher",
       to_timestamp(tp."confirmedAt" / 1000) as confirme_le
from public."teacherPayouts" tp
left join public.teachers t on t.id = tp."teacherId"
order by tp."paidAt" desc
limit 5;


-- ÉTAPE 10 ──────────────────────────────────────────────────────────────────
-- Cohérence d'ensemble : le compteur affiché doit égaler les inscriptions
-- réelles. C'est ce couple qui, désaccordé, rend une place inutilisable.
-- Attendu : AUCUNE ligne.
select c.id, s.name as matiere, c."currentStudents" as compteur,
       count(e.id) as inscriptions_reelles, c."isLocked"
from public.classes c
left join public.subjects s on s.id = c."subjectId"
left join public.enrollments e on e."classId" = c.id and e.status = 'active'
group by c.id, s.name, c."currentStudents", c."isLocked"
having c."currentStudents" <> count(e.id);


-- ÉTAPE 11 ──────────────────────────────────────────────────────────────────
-- Aucun groupe ne doit désigner un enseignant qui n'existe plus.
-- Attendu : AUCUNE ligne.
select c.id, c."teacherId"
from public.classes c
left join public.teachers t on t.id = c."teacherId"
where t.id is null;

-- Aucune facture ne doit pointer vers une inscription disparue.
-- Attendu : AUCUNE ligne.
select p.id, p."enrollmentId"
from public.payments p
left join public.enrollments e on e.id = p."enrollmentId"
where p."enrollmentId" is not null and e.id is null;


-- ===========================================================================
--  SI TOUT EST CONFORME
--  --------------------
--  Les écritures passent les règles de sécurité, les colonnes de traduction
--  sont remplies, les compteurs sont d'accord avec la réalité et rien ne
--  pointe dans le vide. C'est ce que les tests automatiques ne pouvaient pas
--  vous dire.
-- ===========================================================================
