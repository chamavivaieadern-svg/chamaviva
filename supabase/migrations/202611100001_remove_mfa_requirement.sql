-- O CHAMA VIVA usa login individual por e-mail e senha.
-- O ADM controla a criação, bloqueio e remoção de contas.
-- MFA/TOTP deixa de ser requisito; as políticas continuam exigindo usuário autenticado
-- e preservam os escopos por função, status e vínculo com a igreja.
create or replace function public.has_aal2()
returns boolean
language sql
stable
as $$
  select auth.uid() is not null
$$;

comment on function public.has_aal2() is
'Compatibilidade: retorna true para sessão autenticada. MFA não é obrigatório no CHAMA VIVA; RLS continua aplicando autenticação, função, status e vínculo com igreja.';
