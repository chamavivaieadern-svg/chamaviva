create or replace function public.has_aal2()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select auth.uid() is not null
     and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

revoke all on function public.has_aal2() from public, anon;
grant execute on function public.has_aal2() to authenticated;
