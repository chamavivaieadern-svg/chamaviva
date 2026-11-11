alter table public.churches add column if not exists latitude double precision, add column if not exists longitude double precision;
drop policy if exists "trip managers read live locations" on public.live_locations;
create policy "trip managers read live locations" on public.live_locations for select to authenticated using (
 has_aal2() and (
  exists(select 1 from public.trips t join public.profiles p on p.id=auth.uid() where t.id=live_locations.trip_id and is_active_member(t.church_id) and p.role='trip_manager' and p.status='active' and p.can_manage_locations)
  or exists(select 1 from public.evangelism_groups g join public.profiles p on p.id=auth.uid() where g.id=live_locations.group_id and is_active_member(g.church_id) and p.role='trip_manager' and p.status='active' and p.can_manage_locations)
 )
);