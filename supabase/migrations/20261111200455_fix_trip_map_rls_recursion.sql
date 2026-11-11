create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_group_leader_for_trip(target_trip uuid)
returns boolean language sql stable security definer set search_path = pg_catalog
as $$
  select auth.uid() is not null and exists (
    select 1 from public.evangelism_groups g
    where g.trip_id = target_trip and g.leader_id = auth.uid()
  );
$$;

create or replace function private.is_trip_driver_for_group(target_group uuid)
returns boolean language sql stable security definer set search_path = pg_catalog
as $$
  select auth.uid() is not null and exists (
    select 1 from public.evangelism_groups g
    join public.trips t on t.id = g.trip_id
    where g.id = target_group and t.driver_id = auth.uid()
  );
$$;

create or replace function private.can_view_live_location(target_trip uuid, target_group uuid)
returns boolean language sql stable security definer set search_path = pg_catalog
as $$
  select auth.uid() is not null and (
    public.is_admin()
    or (target_trip is not null and exists (
      select 1 from public.trips t
      where t.id = target_trip and (
        t.driver_id = auth.uid()
        or (public.is_active_member(t.church_id) and public.has_role(array['pastor']::text[]))
        or private.is_group_leader_for_trip(t.id)
        or exists (select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'trip_manager' and p.status = 'active'
            and p.can_manage_locations and public.is_active_member(t.church_id))
      )
    ))
    or (target_group is not null and exists (
      select 1 from public.evangelism_groups g
      where g.id = target_group and (
        g.leader_id = auth.uid()
        or (public.is_active_member(g.church_id) and public.has_role(array['pastor']::text[]))
        or private.is_trip_driver_for_group(g.id)
        or exists (select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'trip_manager' and p.status = 'active'
            and p.can_manage_locations and public.is_active_member(g.church_id))
      )
    ))
  );
$$;

revoke all on function private.is_group_leader_for_trip(uuid) from public, anon;
revoke all on function private.is_trip_driver_for_group(uuid) from public, anon;
revoke all on function private.can_view_live_location(uuid, uuid) from public, anon;
grant execute on function private.is_group_leader_for_trip(uuid) to authenticated;
grant execute on function private.is_trip_driver_for_group(uuid) to authenticated;
grant execute on function private.can_view_live_location(uuid, uuid) to authenticated;

drop policy if exists "trips read by authorized users with MFA" on public.trips;
create policy "trips read by authorized users with MFA" on public.trips
for select to authenticated using (
  public.has_aal2() and (
    public.is_admin() or driver_id = auth.uid()
    or (public.is_active_member(church_id) and public.has_role(array['pastor']::text[]))
    or private.is_group_leader_for_trip(id)
  )
);

drop policy if exists "groups visible after MFA" on public.evangelism_groups;
create policy "groups visible after MFA" on public.evangelism_groups
for select to authenticated using (
  public.has_aal2() and (
    public.is_admin() or leader_id = auth.uid()
    or (public.is_active_member(church_id) and public.has_role(array['pastor']::text[]))
    or private.is_trip_driver_for_group(id)
    or (public.is_active_member(church_id) and exists (
      select 1 from public.profiles p where p.id = auth.uid()
        and p.role = 'trip_manager' and p.status = 'active' and p.can_manage_locations
    ))
  )
);

drop policy if exists "locations visible after MFA" on public.live_locations;
create policy "locations visible after MFA" on public.live_locations
for select to authenticated using (
  public.has_aal2() and private.can_view_live_location(trip_id, group_id)
);
