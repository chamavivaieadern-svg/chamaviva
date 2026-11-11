-- Autoriza gestores delegados de chamadas/checklists a listar apenas a igreja vinculada.
drop policy if exists "trip managers read assigned church trips" on public.trips;
create policy "trip managers read assigned church trips" on public.trips for select to authenticated using (
 has_aal2() and is_active_member(church_id) and exists(
  select 1 from public.profiles p where p.id=auth.uid() and p.role='trip_manager' and p.status='active'
  and (p.can_manage_trips or p.can_manage_participants or p.can_manage_program or p.can_manage_locations or p.can_manage_roll_calls or p.can_manage_checklists)
 )
);
drop policy if exists "groups visible after MFA" on public.evangelism_groups;
create policy "groups visible after MFA" on public.evangelism_groups for select to authenticated using (
 has_aal2() and (
  is_admin() or leader_id=auth.uid()
  or (is_active_member(church_id) and has_role(array['pastor']::text[]))
  or private.is_trip_driver_for_group(id)
  or (is_active_member(church_id) and exists(
    select 1 from public.profiles p where p.id=auth.uid() and p.role='trip_manager' and p.status='active'
      and (p.can_manage_locations or p.can_manage_roll_calls or p.can_manage_checklists)
  ))
 )
);
drop policy if exists "trip managers read passengers for delegated roll calls" on public.trip_passengers;
create policy "trip managers read passengers for delegated roll calls" on public.trip_passengers for select to authenticated using (
 has_aal2() and exists(
  select 1 from public.trips t where t.id=trip_passengers.trip_id
  and is_active_member(t.church_id)
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='trip_manager' and p.status='active'
    and (p.can_manage_roll_calls or p.can_manage_checklists))
 )
);
