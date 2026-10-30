-- O líder também pode acompanhar a localização do ônibus ligado ao seu grupo.
drop policy if exists "locations visible to pastor driver or group leader" on public.live_locations;
create policy "locations visible to pastor driver or linked group leader" on public.live_locations for select to authenticated using(
 public.is_admin()
 or exists(select 1 from public.trips t where t.id=trip_id and (
   t.driver_id=auth.uid()
   or (public.is_active_member(t.church_id) and public.has_role(array['pastor']))
   or exists(select 1 from public.evangelism_groups g where g.trip_id=t.id and g.leader_id=auth.uid())
 ))
 or exists(select 1 from public.evangelism_groups g where g.id=group_id and (
   g.leader_id=auth.uid()
   or (public.is_active_member(g.church_id) and public.has_role(array['pastor']))
   or exists(select 1 from public.trips t where t.id=g.trip_id and t.driver_id=auth.uid())
 ))
);
