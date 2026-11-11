-- Permite que líderes de grupos consultem a chamada principal e sincroniza ausências.
drop policy if exists "group leaders read departure roll call sessions" on public.roll_call_sessions;
create policy "group leaders read departure roll call sessions" on public.roll_call_sessions
for select to authenticated
using (has_aal2() and group_id is null and phase='departure' and private.is_group_leader_for_trip(trip_id));

create or replace function public.remove_absent_passenger_from_group_calls()
returns trigger language plpgsql security definer set search_path=pg_catalog,public
as $$
declare
  target_trip uuid;
begin
  if new.status='absent' and old.status is distinct from new.status then
    select s.trip_id into target_trip
    from public.roll_call_sessions s
    where s.id=new.session_id and s.phase='departure' and s.group_id is null;
    if target_trip is not null then
      delete from public.roll_call_entries e
      using public.roll_call_sessions s
      where e.session_id=s.id and s.trip_id=target_trip and s.phase='group'
        and e.passenger_id=new.passenger_id;
      delete from public.evangelism_group_passengers gp
      where gp.trip_id=target_trip and gp.passenger_id=new.passenger_id;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists remove_absent_passenger_from_group_calls on public.roll_call_entries;
create trigger remove_absent_passenger_from_group_calls
after update of status on public.roll_call_entries
for each row execute function public.remove_absent_passenger_from_group_calls();
