create or replace function public.validate_trip_assignments()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 if new.driver_id is not null and not exists(select 1 from public.church_memberships m where m.user_id=new.driver_id and m.church_id=new.church_id) then
  raise exception 'O motorista precisa estar vinculado à mesma igreja da viagem.';
 end if;
 if new.vehicle_id is not null and not exists(select 1 from public.vehicles v where v.id=new.vehicle_id and v.church_id=new.church_id) then
  raise exception 'O veículo precisa pertencer à mesma igreja da viagem.';
 end if;
 return new;
end $$;
drop trigger if exists chama_validate_trip_assignments on public.trips;
create trigger chama_validate_trip_assignments before insert or update of church_id,driver_id,vehicle_id on public.trips for each row execute function public.validate_trip_assignments();

create or replace function public.validate_group_assignments()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 if not exists(select 1 from public.church_memberships m where m.user_id=new.leader_id and m.church_id=new.church_id) then
  raise exception 'O líder precisa estar vinculado à mesma igreja do grupo.';
 end if;
 if new.trip_id is not null and not exists(select 1 from public.trips t where t.id=new.trip_id and t.church_id=new.church_id) then
  raise exception 'A viagem vinculada precisa pertencer à mesma igreja do grupo.';
 end if;
 return new;
end $$;
drop trigger if exists chama_validate_group_assignments on public.evangelism_groups;
create trigger chama_validate_group_assignments before insert or update of church_id,leader_id,trip_id on public.evangelism_groups for each row execute function public.validate_group_assignments();
