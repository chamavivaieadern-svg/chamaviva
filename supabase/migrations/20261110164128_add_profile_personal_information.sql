alter table public.profiles
  add column if not exists phone text,
  add column if not exists whatsapp text,
  add column if not exists birth_date date,
  add column if not exists address text;
