-- CHAMA VIVA: esquema inicial. Revise e aplique no SQL Editor do projeto Supabase.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  role text not null default 'pending' check (role in ('pending','admin','pastor','leader','driver','director','preacher','musician')),
  status text not null default 'active' check (status in ('active','blocked','invited')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.churches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text,
  address text,
  city text,
  state text,
  pastor_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.church_memberships (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  membership_role text not null,
  created_at timestamptz not null default now(),
  unique(church_id,user_id)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  title text not null,
  event_type text not null default 'service',
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue text,
  latitude double precision,
  longitude double precision,
  status text not null default 'draft' check(status in ('draft','published','cancelled','completed')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.program_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  participant_name text,
  participant_user_id uuid references public.profiles(id) on delete set null,
  item_type text not null default 'other',
  starts_at timestamptz,
  duration_minutes integer check(duration_minutes is null or duration_minutes > 0),
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  submitted_by uuid not null references public.profiles(id),
  title text not null,
  artist text,
  lyrics text not null,
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  reviewed_by uuid references public.profiles(id),
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  name text not null,
  plate text,
  capacity integer not null default 1 check(capacity > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  driver_id uuid references public.profiles(id) on delete set null,
  title text not null,
  origin text,
  destination text,
  departure_at timestamptz,
  expected_arrival_at timestamptz,
  status text not null default 'scheduled' check(status in ('scheduled','awaiting_departure','in_progress','arrived','completed','issue','cancelled')),
  tracking_consent_at timestamptz,
  tracking_started_at timestamptz,
  tracking_ended_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.trip_passengers (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  full_name text not null,
  church_member_id uuid references public.profiles(id) on delete set null,
  boarding_status text not null default 'expected' check(boarding_status in ('expected','boarded','disembarked','absent')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.evangelism_groups (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete set null,
  leader_id uuid not null references public.profiles(id),
  name text not null,
  status text not null default 'planned' check(status in ('planned','active','completed')),
  sharing_consent_at timestamptz,
  sharing_started_at timestamptz,
  sharing_ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.live_locations (
  id bigint generated always as identity primary key,
  trip_id uuid references public.trips(id) on delete cascade,
  group_id uuid references public.evangelism_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  latitude double precision not null check(latitude between -90 and 90),
  longitude double precision not null check(longitude between -180 and 180),
  accuracy_m double precision,
  recorded_at timestamptz not null default now(),
  check ((trip_id is not null)::int + (group_id is not null)::int = 1)
);
create index if not exists live_locations_trip_time on public.live_locations(trip_id,recorded_at desc);
create index if not exists live_locations_group_time on public.live_locations(group_id,recorded_at desc);

create table if not exists public.crossada_locations (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  name text not null,
  address text,
  latitude double precision,
  longitude double precision,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references public.churches(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  recipient_id uuid not null references public.profiles(id),
  subject text,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.brand_assets (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  storage_path text not null,
  is_official boolean not null default false,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  target_table text,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and p.status='active') $$;

create or replace function public.is_active_member(target_church uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select public.is_admin() or exists(select 1 from public.church_memberships m join public.profiles p on p.id=m.user_id where m.church_id=target_church and m.user_id=auth.uid() and p.status='active') $$;

create or replace function public.has_role(allowed text[])
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role=any(allowed) and p.status='active') $$;

create or replace function public.bootstrap_profile()
returns trigger language plpgsql security definer set search_path=public
as $$ begin
  insert into public.profiles(id,full_name,role,status)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),'pending','invited')
  on conflict(id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created_chama on auth.users;
create trigger on_auth_user_created_chama after insert on auth.users for each row execute procedure public.bootstrap_profile();

alter table public.profiles enable row level security;
alter table public.churches enable row level security;
alter table public.church_memberships enable row level security;
alter table public.events enable row level security;
alter table public.program_items enable row level security;
alter table public.songs enable row level security;
alter table public.vehicles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_passengers enable row level security;
alter table public.evangelism_groups enable row level security;
alter table public.live_locations enable row level security;
alter table public.crossada_locations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.brand_assets enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles read self or admin or church peer" on public.profiles for select to authenticated using (
 id=auth.uid() or public.is_admin() or exists(select 1 from public.church_memberships mine join public.church_memberships theirs on mine.church_id=theirs.church_id where mine.user_id=auth.uid() and theirs.user_id=profiles.id)
);
create policy "admin manages profiles" on public.profiles for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "churches visible to members" on public.churches for select to authenticated using(public.is_active_member(id));
create policy "admin manages churches" on public.churches for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "memberships visible to self or admin" on public.church_memberships for select to authenticated using(user_id=auth.uid() or public.is_admin() or public.is_active_member(church_id));
create policy "admin manages memberships" on public.church_memberships for all to authenticated using(public.is_admin()) with check(public.is_admin());

create policy "events read by church" on public.events for select to authenticated using(public.is_active_member(church_id));
create policy "admin and church leaders manage events" on public.events for all to authenticated using(public.is_admin() or (public.is_active_member(church_id) and public.has_role(array['pastor','director']))) with check(public.is_admin() or (public.is_active_member(church_id) and public.has_role(array['pastor','director'])));
create policy "program items read by event church" on public.program_items for select to authenticated using(exists(select 1 from public.events e where e.id=event_id and public.is_active_member(e.church_id)));
create policy "program items manage by leaders" on public.program_items for all to authenticated using(public.is_admin() or exists(select 1 from public.events e where e.id=event_id and public.is_active_member(e.church_id) and public.has_role(array['pastor','director']))) with check(public.is_admin() or exists(select 1 from public.events e where e.id=event_id and public.is_active_member(e.church_id) and public.has_role(array['pastor','director'])));

create policy "songs read for church" on public.songs for select to authenticated using(public.is_active_member(church_id) and (status='approved' or submitted_by=auth.uid() or public.has_role(array['pastor','director'])));
create policy "musicians submit songs" on public.songs for insert to authenticated with check(submitted_by=auth.uid() and public.is_active_member(church_id) and public.has_role(array['musician']));
create policy "director reviews songs" on public.songs for update to authenticated using(public.is_admin() or (public.is_active_member(church_id) and public.has_role(array['director','pastor']))) with check(public.is_admin() or (public.is_active_member(church_id) and public.has_role(array['director','pastor'])));

create policy "vehicles read by church" on public.vehicles for select to authenticated using(public.is_active_member(church_id));
create policy "admin manages vehicles" on public.vehicles for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "trips read by church and driver" on public.trips for select to authenticated using(public.is_active_member(church_id) or driver_id=auth.uid());
create policy "admin and pastor manage trips" on public.trips for all to authenticated using(public.is_admin() or (public.is_active_member(church_id) and public.has_role(array['pastor']))) with check(public.is_admin() or (public.is_active_member(church_id) and public.has_role(array['pastor'])));
create policy "passengers read by trip participants" on public.trip_passengers for select to authenticated using(exists(select 1 from public.trips t where t.id=trip_id and (public.is_active_member(t.church_id) or t.driver_id=auth.uid())));
create policy "admin pastor driver update passengers" on public.trip_passengers for all to authenticated using(public.is_admin() or exists(select 1 from public.trips t where t.id=trip_id and (t.driver_id=auth.uid() or (public.is_active_member(t.church_id) and public.has_role(array['pastor']))))) with check(public.is_admin() or exists(select 1 from public.trips t where t.id=trip_id and (t.driver_id=auth.uid() or (public.is_active_member(t.church_id) and public.has_role(array['pastor'])))));

create policy "groups visible by church" on public.evangelism_groups for select to authenticated using(public.is_active_member(church_id) or leader_id=auth.uid());
create policy "pastor admin manage groups" on public.evangelism_groups for all to authenticated using(public.is_admin() or (public.is_active_member(church_id) and public.has_role(array['pastor']))) with check(public.is_admin() or (public.is_active_member(church_id) and public.has_role(array['pastor'])));
create policy "locations visible to authorized church users" on public.live_locations for select to authenticated using(
 public.is_admin()
 or exists(select 1 from public.trips t where t.id=trip_id and (public.is_active_member(t.church_id) or t.driver_id=auth.uid()))
 or exists(select 1 from public.evangelism_groups g where g.id=group_id and (public.is_active_member(g.church_id) or g.leader_id=auth.uid() or exists(select 1 from public.trips t where t.id=g.trip_id and t.driver_id=auth.uid())))
);
create policy "consented driver or group leader inserts location" on public.live_locations for insert to authenticated with check(
 user_id=auth.uid()
 and ((trip_id is not null and exists(select 1 from public.trips t where t.id=trip_id and t.driver_id=auth.uid() and t.status='in_progress' and t.tracking_consent_at is not null and t.tracking_ended_at is null))
 or (group_id is not null and exists(select 1 from public.evangelism_groups g where g.id=group_id and g.leader_id=auth.uid() and g.status='active' and g.sharing_consent_at is not null and g.sharing_ended_at is null)))
);

create policy "crossada visible to church" on public.crossada_locations for select to authenticated using(public.is_active_member(church_id));
create policy "admin pastor manage crossada" on public.crossada_locations for all to authenticated using(public.is_admin() or (public.is_active_member(church_id) and public.has_role(array['pastor']))) with check(public.is_admin() or (public.is_active_member(church_id) and public.has_role(array['pastor'])));

create policy "messages only sender recipient" on public.messages for select to authenticated using(sender_id=auth.uid() or recipient_id=auth.uid() or public.is_admin());
create policy "users send own messages" on public.messages for insert to authenticated with check(sender_id=auth.uid());
create policy "recipient marks messages read" on public.messages for update to authenticated using(recipient_id=auth.uid() or public.is_admin()) with check(recipient_id=auth.uid() or public.is_admin());
create policy "notifications only owner" on public.notifications for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy "user marks own notifications" on public.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "admin creates notifications" on public.notifications for insert to authenticated with check(public.is_admin());
create policy "assets visible to signed in users" on public.brand_assets for select to authenticated using(true);
create policy "admin manages assets" on public.brand_assets for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "audit visible to admin" on public.audit_logs for select to authenticated using(public.is_admin());
create policy "authenticated audit insert" on public.audit_logs for insert to authenticated with check(actor_id=auth.uid());

-- A role 'admin' só deve ser atribuída pelo primeiro administrador via procedimento seguro no servidor.
-- Não conceda acesso anônimo às tabelas. Armazene GPS apenas durante atividades ativas.
