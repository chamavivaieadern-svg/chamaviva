-- Endurecer o escopo de dados pessoais e operacionais por função.
alter table public.profiles drop column if exists phone;

drop policy if exists "trips read by church and driver" on public.trips;
create policy "trips read by pastor driver or linked leader" on public.trips for select to authenticated using(
 public.is_admin()
 or driver_id=auth.uid()
 or (public.is_active_member(church_id) and public.has_role(array['pastor']))
 or exists(select 1 from public.evangelism_groups g where g.trip_id=trips.id and g.leader_id=auth.uid())
);

drop policy if exists "vehicles read by church" on public.vehicles;
create policy "vehicles read by pastor or assigned driver" on public.vehicles for select to authenticated using(
 public.is_admin()
 or (public.is_active_member(church_id) and public.has_role(array['pastor']))
 or exists(select 1 from public.trips t where t.vehicle_id=vehicles.id and t.driver_id=auth.uid())
);

drop policy if exists "passengers read by trip participants" on public.trip_passengers;
create policy "passengers read by pastor driver or passenger" on public.trip_passengers for select to authenticated using(
 public.is_admin()
 or church_member_id=auth.uid()
 or exists(select 1 from public.trips t where t.id=trip_id and (t.driver_id=auth.uid() or (public.is_active_member(t.church_id) and public.has_role(array['pastor']))))
);

drop policy if exists "groups visible by church leader or assigned driver" on public.evangelism_groups;
create policy "groups visible by pastor leader or assigned driver" on public.evangelism_groups for select to authenticated using(
 public.is_admin()
 or leader_id=auth.uid()
 or (public.is_active_member(church_id) and public.has_role(array['pastor']))
 or exists(select 1 from public.trips t where t.id=trip_id and t.driver_id=auth.uid())
);

drop policy if exists "locations visible to authorized church users" on public.live_locations;
create policy "locations visible to pastor driver or group leader" on public.live_locations for select to authenticated using(
 public.is_admin()
 or exists(select 1 from public.trips t where t.id=trip_id and (t.driver_id=auth.uid() or (public.is_active_member(t.church_id) and public.has_role(array['pastor']))))
 or exists(select 1 from public.evangelism_groups g where g.id=group_id and (g.leader_id=auth.uid() or (public.is_active_member(g.church_id) and public.has_role(array['pastor'])) or exists(select 1 from public.trips t where t.id=g.trip_id and t.driver_id=auth.uid())))
);

drop policy if exists "messages only sender recipient" on public.messages;
create policy "messages only sender and recipient" on public.messages for select to authenticated using(sender_id=auth.uid() or recipient_id=auth.uid());
drop policy if exists "users send own messages" on public.messages;
create policy "users message same church peers" on public.messages for insert to authenticated with check(
 sender_id=auth.uid()
 and (
  public.is_admin()
  or exists(select 1 from public.church_memberships s join public.church_memberships r on r.church_id=s.church_id where s.user_id=auth.uid() and r.user_id=recipient_id)
 )
);
drop policy if exists "recipient marks messages read" on public.messages;
create policy "recipient marks own messages read" on public.messages for update to authenticated using(recipient_id=auth.uid()) with check(recipient_id=auth.uid());
