alter table public.profiles
  add column if not exists admin_previous_role text;

comment on column public.profiles.admin_previous_role is
  'Role to restore when an account promoted to admin is demoted by an administrator.';