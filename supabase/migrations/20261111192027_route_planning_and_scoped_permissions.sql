-- CHAMA VIVA: location fields, route planning and explicit manager/message permissions.
alter table public.churches add column if not exists plus_code text, add column if not exists maps_url text;
alter table public.profiles
  add column if not exists can_manage_trips boolean not null default false,
  add column if not exists can_manage_participants boolean not null default false,
  add column if not exists can_manage_program boolean not null default false,
  add column if not exists can_manage_locations boolean not null default false,
  add column if not exists can_send_messages boolean not null default false,
  add column if not exists can_receive_messages boolean not null default false;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role = any (array['pending','admin','pastor','leader','driver','director','preacher','musician','trip_manager']::text[]));
alter table public.crossada_locations
  add column if not exists trip_id uuid references public.trips(id) on delete cascade,
  add column if not exists group_id uuid references public.evangelism_groups(id) on delete set null,
  add column if not exists plus_code text,
  add column if not exists maps_url text,
  add column if not exists radius_m integer not null default 500,
  add column if not exists is_route boolean not null default false,
  add column if not exists route_mode text,
  add column if not exists route_path jsonb not null default '[]'::jsonb;
do $$ begin
 if not exists (select 1 from pg_constraint where conname='crossada_locations_radius_m_check') then alter table public.crossada_locations add constraint crossada_locations_radius_m_check check (radius_m between 50 and 10000); end if;
 if not exists (select 1 from pg_constraint where conname='crossada_locations_route_mode_check') then alter table public.crossada_locations add constraint crossada_locations_route_mode_check check (route_mode is null or route_mode in ('automatic','manual')); end if;
end $$;
create unique index if not exists crossada_locations_one_route_per_trip on public.crossada_locations(trip_id) where is_route=true and trip_id is not null;
create index if not exists crossada_locations_trip_points_idx on public.crossada_locations(trip_id,is_route,created_at);
drop policy if exists "trip managers read assigned church trips" on public.trips;
create policy "trip managers read assigned church trips" on public.trips for select to authenticated using (
 has_aal2() and is_active_member(church_id) and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='trip_manager' and p.status='active' and (p.can_manage_trips or p.can_manage_participants or p.can_manage_program or p.can_manage_locations))
);
drop policy if exists "trip managers manage trips with permission" on public.trips;
create policy "trip managers manage trips with permission" on public.trips for all to authenticated
 using(has_aal2() and is_active_member(church_id) and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='trip_manager' and p.status='active' and p.can_manage_trips))
 with check(has_aal2() and is_active_member(church_id) and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='trip_manager' and p.status='active' and p.can_manage_trips));
drop policy if exists "trip managers manage route locations" on public.crossada_locations;
create policy "trip managers manage route locations" on public.crossada_locations for all to authenticated
 using(has_aal2() and is_active_member(church_id) and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='trip_manager' and p.status='active' and p.can_manage_locations))
 with check(has_aal2() and is_active_member(church_id) and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='trip_manager' and p.status='active' and p.can_manage_locations));
drop policy if exists "trip managers manage participants" on public.trip_passengers;
create policy "trip managers manage participants" on public.trip_passengers for all to authenticated
 using(has_aal2() and exists(select 1 from public.trips t join public.profiles p on p.id=auth.uid() where t.id=trip_passengers.trip_id and is_active_member(t.church_id) and p.role='trip_manager' and p.status='active' and p.can_manage_participants))
 with check(has_aal2() and exists(select 1 from public.trips t join public.profiles p on p.id=auth.uid() where t.id=trip_passengers.trip_id and is_active_member(t.church_id) and p.role='trip_manager' and p.status='active' and p.can_manage_participants));
drop policy if exists "trip managers manage program events" on public.events;
create policy "trip managers manage program events" on public.events for all to authenticated
 using(has_aal2() and is_active_member(church_id) and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='trip_manager' and p.status='active' and p.can_manage_program))
 with check(has_aal2() and is_active_member(church_id) and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='trip_manager' and p.status='active' and p.can_manage_program));
drop policy if exists "trip managers manage program items" on public.program_items;
create policy "trip managers manage program items" on public.program_items for all to authenticated
 using(has_aal2() and exists(select 1 from public.events e join public.profiles p on p.id=auth.uid() where e.id=program_items.event_id and is_active_member(e.church_id) and p.role='trip_manager' and p.status='active' and p.can_manage_program))
 with check(has_aal2() and exists(select 1 from public.events e join public.profiles p on p.id=auth.uid() where e.id=program_items.event_id and is_active_member(e.church_id) and p.role='trip_manager' and p.status='active' and p.can_manage_program));
drop policy if exists "messages only sender and recipient after MFA" on public.messages;
create policy "messages only sender and recipient after MFA" on public.messages for select to authenticated using (
 has_aal2() and (is_admin() or (sender_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.can_send_messages)) or (recipient_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.can_receive_messages)))
);
drop policy if exists "users message same church peers after MFA" on public.messages;
create policy "users message same church peers after MFA" on public.messages for insert to authenticated with check (
 has_aal2() and sender_id=auth.uid() and (is_admin() or (
  exists(select 1 from public.profiles s where s.id=auth.uid() and s.can_send_messages)
  and exists(select 1 from public.profiles r where r.id=recipient_id and r.can_receive_messages and r.status='active')
  and exists(select 1 from public.church_memberships s join public.church_memberships r on r.church_id=s.church_id where s.user_id=auth.uid() and r.user_id=messages.recipient_id)
 ))
);
grant select,insert,update,delete on public.crossada_locations,public.trip_passengers,public.events,public.program_items to authenticated;
