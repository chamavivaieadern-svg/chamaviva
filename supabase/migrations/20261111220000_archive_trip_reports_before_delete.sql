-- Arquiva um relatório completo antes da exclusão de viagens antigas.
create table if not exists public.trip_reports_archive (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null unique,
  church_id uuid not null references public.churches(id) on delete restrict,
  trip_title text not null,
  report jsonb not null,
  archive_reason text not null default 'completed_trip',
  archived_by uuid references auth.users(id) on delete set null,
  archived_at timestamptz not null default now()
);
create index if not exists trip_reports_archive_church_date_idx on public.trip_reports_archive(church_id,archived_at desc);
alter table public.trip_reports_archive enable row level security;
drop policy if exists "admins and pastors read archived trip reports" on public.trip_reports_archive;
create policy "admins and pastors read archived trip reports" on public.trip_reports_archive
for select to authenticated using (
 has_aal2() and (public.is_admin() or (public.is_active_member(church_id) and public.has_role(array['pastor']::text[])))
);

create or replace function private.capture_trip_report_snapshot(target_trip uuid, actor uuid, reason text)
returns uuid language plpgsql security definer set search_path=pg_catalog,public
as $$
declare
  trip_row public.trips%rowtype;
  snapshot jsonb;
  archive_id uuid;
begin
  select * into trip_row from public.trips where id=target_trip;
  if not found then
    select id into archive_id from public.trip_reports_archive where trip_id=target_trip;
    return archive_id;
  end if;
  select jsonb_build_object(
    'trip',to_jsonb(t),
    'passengers',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at) from public.trip_passengers p where p.trip_id=t.id),'[]'::jsonb),
    'groups',coalesce((select jsonb_agg(
      to_jsonb(g) ||
      jsonb_build_object(
        'participants',coalesce((select jsonb_agg(to_jsonb(gp) || jsonb_build_object('passenger',to_jsonb(p))) from public.evangelism_group_passengers gp join public.trip_passengers p on p.id=gp.passenger_id where gp.group_id=g.id),'[]'::jsonb),
        'checklist',coalesce((select jsonb_agg(to_jsonb(gc) order by gc.sort_order) from public.evangelism_group_checklists gc where gc.group_id=g.id),'[]'::jsonb)
      ) order by g.created_at
    ) from public.evangelism_groups g where g.trip_id=t.id),'[]'::jsonb),
    'roll_calls',coalesce((select jsonb_agg(
      to_jsonb(s) || jsonb_build_object(
        'entries',coalesce((select jsonb_agg(to_jsonb(e) || jsonb_build_object('passenger_name',p.full_name) order by p.full_name)
          from public.roll_call_entries e join public.trip_passengers p on p.id=e.passenger_id where e.session_id=s.id),'[]'::jsonb)
      ) order by s.created_at
    ) from public.roll_call_sessions s where s.trip_id=t.id),'[]'::jsonb),
    'gps_summary',jsonb_build_object(
      'points', (select count(*) from public.live_locations l where l.trip_id=t.id),
      'last_recorded_at',(select max(l.recorded_at) from public.live_locations l where l.trip_id=t.id)
    ),
    'generated_at',now()
  ) into snapshot from public.trips t where t.id=target_trip;

  insert into public.trip_reports_archive(trip_id,church_id,trip_title,report,archive_reason,archived_by,archived_at)
  values(target_trip,trip_row.church_id,trip_row.title,snapshot,reason,actor,now())
  on conflict(trip_id) do update set
    church_id=excluded.church_id,trip_title=excluded.trip_title,report=excluded.report,
    archive_reason=excluded.archive_reason,archived_by=excluded.archived_by,archived_at=excluded.archived_at
  returning id into archive_id;
  return archive_id;
end;
$$;

create or replace function public.archive_completed_trip_report()
returns trigger language plpgsql security definer set search_path=pg_catalog,public
as $$
begin
  if new.status='completed' and old.status is distinct from new.status then
    perform private.capture_trip_report_snapshot(new.id,auth.uid(),'trip_completed');
  end if;
  return new;
end;
$$;
drop trigger if exists archive_completed_trip_report on public.trips;
create trigger archive_completed_trip_report after update of status on public.trips
for each row execute function public.archive_completed_trip_report();

create or replace function public.archive_trip_before_delete()
returns trigger language plpgsql security definer set search_path=pg_catalog,public
as $$
begin
  perform private.capture_trip_report_snapshot(old.id,auth.uid(),'archived_before_trip_delete');
  return old;
end;
$$;
drop trigger if exists archive_trip_before_delete on public.trips;
create trigger archive_trip_before_delete before delete on public.trips
for each row execute function public.archive_trip_before_delete();

create or replace function public.archive_and_delete_trip(target_trip uuid)
returns uuid language plpgsql security definer set search_path=pg_catalog,public
as $$
declare archive_id uuid;
begin
  if not public.is_admin() then raise exception 'Somente o ADM pode arquivar e excluir viagens.' using errcode='42501'; end if;
  archive_id:=private.capture_trip_report_snapshot(target_trip,auth.uid(),'manual_archive_before_trip_delete');
  if archive_id is null then raise exception 'Viagem não encontrada.' using errcode='P0002'; end if;
  delete from public.trips where id=target_trip;
  return archive_id;
end;
$$;
revoke all on function public.archive_and_delete_trip(uuid) from public;
grant execute on function public.archive_and_delete_trip(uuid) to authenticated;
grant select on public.trip_reports_archive to authenticated;
