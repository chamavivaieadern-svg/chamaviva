alter table public.trips
  add column if not exists origin_church_id uuid references public.churches(id) on delete set null,
  add column if not exists destination_church_ids uuid[] not null default '{}'::uuid[];

create index if not exists trips_destination_church_ids_gin
  on public.trips using gin (destination_church_ids);

update public.trips t
set origin_church_id = c.id
from public.churches c
where t.origin_church_id is null
  and lower(coalesce(t.origin,'')) like '%sede%'
  and (lower(coalesce(c.region,'')) = 'sede' or lower(c.name) like '%sede%');
