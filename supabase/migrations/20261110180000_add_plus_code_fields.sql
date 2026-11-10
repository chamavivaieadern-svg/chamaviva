alter table public.trips
  add column if not exists origin_plus_code text,
  add column if not exists destination_plus_code text;

alter table public.crossada_locations
  add column if not exists plus_code text;
