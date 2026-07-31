-- Horizon — automatisation (relances de paiement + digest quotidien) via pg_cron.
-- PRÉ-REQUIS : activer l'extension pg_cron dans Supabase
--   Dashboard → Database → Extensions → chercher "pg_cron" → Enable.
-- Puis coller ce fichier dans SQL Editor → Run.

-- ---------- Relances de paiement ----------
-- Pour chaque élève avec une dette (et pas relancé depuis 2 jours), crée une notif in-app
-- au compte parent et incrémente le compteur de relances. (WhatsApp/SMS = étape séparée.)
create or replace function public.send_payment_reminders() returns void
language plpgsql security definer as $$
declare
  r record;
  ms double precision := extract(epoch from now()) * 1000;
begin
  for r in
    select p."studentId" as sid, s."linkedAccountId" as acc, sum(p.amount) as due
    from payments p
    join students s on s.id = p."studentId"
    where p.status = 'unpaid'
      and (p."lastReminderAt" is null or p."lastReminderAt" < ms - 2 * 86400000)
    group by p."studentId", s."linkedAccountId"
  loop
    if r.acc is not null then
      insert into notifications(id, "userId", type, message, read, "createdAt")
      values (gen_random_uuid()::text, r.acc, 'payment_reminder',
              'Rappel : paiement en attente — ' || r.due::bigint || ' DA.', false, ms);
    end if;
    update payments set "reminderCount" = "reminderCount" + 1, "lastReminderAt" = ms
      where "studentId" = r.sid and status = 'unpaid';
  end loop;
end $$;

-- ---------- Digest quotidien "Aujourd'hui & Demain" ----------
create or replace function public.send_daily_digest() returns void
language plpgsql security definer as $$
declare
  days text[] := array['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  today text := days[extract(dow from now())::int + 1];
  tomo  text := days[extract(dow from (now() + interval '1 day'))::int + 1];
  today_list text;
  tomo_list text;
  msg text;
  a record;
  ms double precision := extract(epoch from now()) * 1000;
begin
  select coalesce(string_agg(c."timeSlot" || ' ' || coalesce(sub.name,'?') || ' (' || coalesce(t.name,'?') || ')', ' · ' order by c."timeSlot"), 'aucune classe')
    into today_list
    from classes c
    left join subjects sub on sub.id = c."subjectId"
    left join teachers t on t.id = c."teacherId"
    where c."dayOfWeek" = today;

  select coalesce(string_agg(c."timeSlot" || ' ' || coalesce(sub.name,'?') || ' (' || coalesce(t.name,'?') || ')', ' · ' order by c."timeSlot"), 'aucune classe')
    into tomo_list
    from classes c
    left join subjects sub on sub.id = c."subjectId"
    left join teachers t on t.id = c."teacherId"
    where c."dayOfWeek" = tomo;

  msg := 'Aujourd''hui : ' || today_list || '. Demain : ' || tomo_list || '.';

  for a in select id from users where role = 'admin' loop
    insert into notifications(id, "userId", type, message, read, "createdAt")
    values (gen_random_uuid()::text, a.id, 'daily_digest', msg, false, ms);
  end loop;
end $$;

-- ---------- Planification (heures en UTC ; Algérie = UTC+1) ----------
-- Relances chaque jour à 08:00 UTC (09:00 Algérie).
select cron.schedule('horizon-reminders', '0 8 * * *', $$ select public.send_payment_reminders(); $$);
-- Digest chaque soir à 18:00 UTC (19:00 Algérie).
select cron.schedule('horizon-digest', '0 18 * * *', $$ select public.send_daily_digest(); $$);

-- Pour tester tout de suite (facultatif) :
--   select public.send_daily_digest();
--   select public.send_payment_reminders();
-- Pour voir/supprimer les tâches planifiées :
--   select * from cron.job;
--   select cron.unschedule('horizon-reminders');
