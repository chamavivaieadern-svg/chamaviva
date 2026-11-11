drop policy if exists "groups visible after MFA" on public.evangelism_groups;
create policy "groups visible after MFA" on public.evangelism_groups for select to authenticated using (
 has_aal2() and (
  is_admin() or leader_id=auth.uid() or (is_active_member(church_id) and has_role(array['pastor']::text[]))
  or exists(select 1 from public.trips t where t.id=evangelism_groups.trip_id and t.driver_id=auth.uid())
  or (is_active_member(church_id) and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='trip_manager' and p.status='active' and p.can_manage_locations))
 )
);