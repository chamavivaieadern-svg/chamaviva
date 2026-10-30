alter table public.trips
 add column if not exists origin_latitude double precision,
 add column if not exists origin_longitude double precision,
 add column if not exists destination_latitude double precision,
 add column if not exists destination_longitude double precision;
