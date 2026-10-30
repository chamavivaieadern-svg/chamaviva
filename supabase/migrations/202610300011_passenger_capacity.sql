create or replace function public.check_trip_passenger_capacity()
returns trigger language plpgsql security definer set search_path=public
as $$
declare vehicle_capacity integer;
declare passenger_count integer;
begin
 select v.capacity into vehicle_capacity
 from public.trips t left join public.vehicles v on v.id=t.vehicle_id
 where t.id=new.trip_id;
 if vehicle_capacity is not null then
  select count(*) into passenger_count from public.trip_passengers p where p.trip_id=new.trip_id;
  if passenger_count >= vehicle_capacity then
   raise exception 'A capacidade do veículo foi atingida (% vagas).',vehicle_capacity;
  end if;
 end if;
 return new;
end $$;
drop trigger if exists chama_passenger_capacity on public.trip_passengers;
create trigger chama_passenger_capacity before insert on public.trip_passengers for each row execute function public.check_trip_passenger_capacity();
