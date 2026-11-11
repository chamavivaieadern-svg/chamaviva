drop policy if exists "trip managers read assigned church vehicles" on public.vehicles;
create policy "trip managers read assigned church vehicles" on public.vehicles for select to authenticated using (
 has_aal2() and is_active_member(church_id)
 and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='trip_manager' and p.status='active' and (p.can_manage_trips or p.can_manage_participants))
);