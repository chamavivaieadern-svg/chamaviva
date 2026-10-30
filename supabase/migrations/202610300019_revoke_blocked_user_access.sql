create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles p where p.id=auth.uid() and p.status='active') $$;

create or replace function public.has_aal2()
returns boolean language sql stable
as $$ select coalesce(auth.jwt()->>'aal','aal1')='aal2' and public.is_active_user() $$;
