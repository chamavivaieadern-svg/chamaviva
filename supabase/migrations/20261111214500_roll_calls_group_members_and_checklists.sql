-- CHAMA VIVA: chamadas por etapa, participantes dos grupos e checklist de preparação.
alter table public.profiles
  add column if not exists can_manage_roll_calls boolean not null default false,
  add column if not exists can_manage_checklists boolean not null default false;

create table if not exists public.evangelism_group_passengers (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.evangelism_groups(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  passenger_id uuid not null references public.trip_passengers(id) on delete cascade,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(group_id, passenger_id)
);
create index if not exists evangelism_group_passengers_trip_idx on public.evangelism_group_passengers(trip_id,group_id);

create table if not exists public.roll_call_sessions (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  group_id uuid references public.evangelism_groups(id) on delete cascade,
  phase text not null check (phase in ('departure','return','group')),
  title text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check ((phase='group' and group_id is not null) or (phase in ('departure','return') and group_id is null))
);
create unique index if not exists roll_call_trip_phase_unique on public.roll_call_sessions(trip_id,phase) where group_id is null;
create unique index if not exists roll_call_group_unique on public.roll_call_sessions(group_id) where group_id is not null;
create index if not exists roll_call_sessions_trip_idx on public.roll_call_sessions(trip_id,created_at desc);

create table if not exists public.roll_call_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.roll_call_sessions(id) on delete cascade,
  passenger_id uuid not null references public.trip_passengers(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','present','absent')),
  marked_by uuid references auth.users(id) on delete set null,
  marked_at timestamptz,
  created_at timestamptz not null default now(),
  unique(session_id,passenger_id)
);
create index if not exists roll_call_entries_session_idx on public.roll_call_entries(session_id,status);

create table if not exists public.group_checklist_templates (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references public.churches(id) on delete cascade,
  label text not null check (length(trim(label)) between 2 and 180),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists group_checklist_templates_active_idx on public.group_checklist_templates(active,church_id,sort_order);

create table if not exists public.evangelism_group_checklists (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.evangelism_groups(id) on delete cascade,
  template_id uuid references public.group_checklist_templates(id) on delete set null,
  label text not null,
  sort_order integer not null default 0,
  is_done boolean not null default false,
  done_by uuid references auth.users(id) on delete set null,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  unique(group_id,label)
);
create index if not exists evangelism_group_checklists_group_idx on public.evangelism_group_checklists(group_id,sort_order);

create or replace function private.can_manage_trip_roll_calls(target_trip uuid)
returns boolean language sql stable security definer set search_path=pg_catalog
as $$
  select auth.uid() is not null and (
    public.is_admin()
    or exists (
      select 1 from public.trips t
      where t.id=target_trip
        and public.is_active_member(t.church_id)
        and (
          public.has_role(array['pastor']::text[])
          or exists(select 1 from public.profiles p where p.id=auth.uid() and p.status='active' and p.can_manage_roll_calls)
        )
    )
  );
$$;

create or replace function private.can_manage_group_records(target_group uuid, permission_name text)
returns boolean language sql stable security definer set search_path=pg_catalog
as $$
  select auth.uid() is not null and exists (
    select 1 from public.evangelism_groups g
    where g.id=target_group and (
      public.is_admin()
      or (public.is_active_member(g.church_id) and public.has_role(array['pastor']::text[]))
      or g.leader_id=auth.uid()
      or exists(
        select 1 from public.profiles p
        where p.id=auth.uid() and p.status='active' and
          ((permission_name='roll_calls' and p.can_manage_roll_calls) or
           (permission_name='checklists' and p.can_manage_checklists))
      )
    )
  );
$$;

create or replace function private.can_read_roll_call(target_session uuid)
returns boolean language sql stable security definer set search_path=pg_catalog
as $$
  select auth.uid() is not null and exists (
    select 1 from public.roll_call_sessions s
    where s.id=target_session and (
      private.can_manage_trip_roll_calls(s.trip_id)
      or (s.group_id is not null and private.can_manage_group_records(s.group_id,'roll_calls'))
      or (s.group_id is null and private.is_group_leader_for_trip(s.trip_id))
    )
  );
$$;

create or replace function public.seed_group_checklist()
returns trigger language plpgsql security definer set search_path=pg_catalog,public
as $$
begin
  insert into public.evangelism_group_checklists(group_id,template_id,label,sort_order)
  select new.id,t.id,t.label,t.sort_order
  from public.group_checklist_templates t
  where t.active and (t.church_id is null or t.church_id=new.church_id)
  order by t.sort_order,t.created_at
  on conflict(group_id,label) do nothing;
  return new;
end;
$$;
drop trigger if exists seed_group_checklist_after_insert on public.evangelism_groups;
create trigger seed_group_checklist_after_insert
after insert on public.evangelism_groups
for each row execute function public.seed_group_checklist();

alter table public.evangelism_group_passengers enable row level security;
alter table public.roll_call_sessions enable row level security;
alter table public.roll_call_entries enable row level security;
alter table public.group_checklist_templates enable row level security;
alter table public.evangelism_group_checklists enable row level security;

drop policy if exists "group passenger membership access" on public.evangelism_group_passengers;
create policy "group passenger membership access" on public.evangelism_group_passengers
for all to authenticated
using (has_aal2() and private.can_manage_group_records(group_id,'roll_calls'))
with check (has_aal2() and private.can_manage_group_records(group_id,'roll_calls'));

drop policy if exists "roll call sessions scoped access" on public.roll_call_sessions;
create policy "roll call sessions scoped access" on public.roll_call_sessions
for all to authenticated
using (has_aal2() and (private.can_manage_trip_roll_calls(trip_id) or (group_id is not null and private.can_manage_group_records(group_id,'roll_calls'))))
with check (has_aal2() and (private.can_manage_trip_roll_calls(trip_id) or (group_id is not null and private.can_manage_group_records(group_id,'roll_calls'))));

drop policy if exists "roll call entries scoped access" on public.roll_call_entries;
create policy "roll call entries scoped access" on public.roll_call_entries
for all to authenticated
using (has_aal2() and private.can_read_roll_call(session_id))
with check (has_aal2() and private.can_read_roll_call(session_id));

drop policy if exists "admins manage group checklist templates" on public.group_checklist_templates;
create policy "admins manage group checklist templates" on public.group_checklist_templates
for all to authenticated
using (has_aal2() and (public.is_admin() or (church_id is not null and public.is_active_member(church_id) and public.has_role(array['pastor']::text[]))))
with check (has_aal2() and (public.is_admin() or (church_id is not null and public.is_active_member(church_id) and public.has_role(array['pastor']::text[]))));

drop policy if exists "group checklist scoped access" on public.evangelism_group_checklists;
create policy "group checklist scoped access" on public.evangelism_group_checklists
for all to authenticated
using (has_aal2() and private.can_manage_group_records(group_id,'checklists'))
with check (has_aal2() and private.can_manage_group_records(group_id,'checklists'));

grant select,insert,update,delete on public.evangelism_group_passengers,public.roll_call_sessions,public.roll_call_entries,public.group_checklist_templates,public.evangelism_group_checklists to authenticated;
grant execute on function private.can_manage_trip_roll_calls(uuid) to authenticated;
grant execute on function private.can_manage_group_records(uuid,text) to authenticated;
grant execute on function private.can_read_roll_call(uuid) to authenticated;
