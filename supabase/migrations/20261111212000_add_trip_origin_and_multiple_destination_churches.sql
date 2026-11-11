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

update public.churches c
set latitude = t.origin_latitude,
    longitude = t.origin_longitude
from public.trips t
where c.id = t.origin_church_id
  and c.latitude is null
  and t.origin_latitude is not null
  and t.origin_longitude is not null;

update public.trips t
set destination_church_ids = array(
  select c.id
  from public.churches c
  where c.city is not null
    and length(trim(c.city)) > 2
    and position(lower(trim(c.city)) in lower(coalesce(t.destination, ''))) > 0
  order by c.name
)
where cardinality(t.destination_church_ids) = 0
  and exists (
    select 1
    from public.churches c
    where c.city is not null
      and length(trim(c.city)) > 2
      and position(lower(trim(c.city)) in lower(coalesce(t.destination, ''))) > 0
  );
