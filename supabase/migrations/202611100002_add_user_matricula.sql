-- Matrícula única para acesso sem e-mail pessoal.
alter table public.profiles add column if not exists matricula text;
create unique index if not exists profiles_matricula_unique on public.profiles (upper(matricula)) where matricula is not null and btrim(matricula) <> '';
