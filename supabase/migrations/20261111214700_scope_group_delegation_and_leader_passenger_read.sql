-- Corrige escopo das permissões delegadas e permite que líderes vejam passageiros da sua viagem.
create or replace function private.can_manage_group_records(target_group uuid, permission_name text)
returns boolean language sql stable security definer set search_path=pg_catalog
as $$
  select auth.uid() is not null and exists (
    select 1 from public.evangelism_groups g
    where g.id=target_group and (
      public.is_admin()
      or (public.is_active_member(g.church_id) and public.has_role(array['pastor']::text[]))
      or g.leader_id=auth.uid()
      or (public.is_active_member(g.church_id) and exists(
        select 1 from public.profiles p
        where p.id=auth.uid() and p.status='active' and
          ((permission_name='roll_calls' and p.can_manage_roll_calls) or
           (permission_name='checklists' and p.can_manage_checklists))
      ))
    )
  );
$$;
drop policy if exists "group leaders read trip passengers" on public.trip_passengers;
create policy "group leaders read trip passengers" on public.trip_passengers
for select to authenticated
using (has_aal2() and private.is_group_leader_for_trip(trip_id));
