create or replace function public.has_aal2()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select auth.uid() is not null;
$$;

revoke all on function public.has_aal2() from public, anon;
grant execute on function public.has_aal2() to authenticated;

comment on function public.has_aal2() is
'Compatibility helper: returns true for an authenticated session. CHAMA VIVA login uses password without mandatory MFA, as explicitly requested.';
