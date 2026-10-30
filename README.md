# CHAMA VIVA

Sistema de gestão de igrejas, cultos, viagens, comunicação e equipes de evangelismo.

## Tecnologia
- Next.js App Router, React 19 e TypeScript
- CSS e Motion
- Supabase Auth, PostgreSQL, Storage e Realtime
- Netlify com plugin oficial para Next.js

## Rodar localmente
1. Node.js 20+
2. `npm install`
3. Copie `.env.example` para `.env.local` e configure as chaves do Supabase.
4. Aplique as migrations em `supabase/migrations` no SQL Editor do Supabase.
5. `npm run dev`

## Netlify
- Build command: `npm run build`
- Plugin: `@netlify/plugin-nextjs`
- Configure no painel do Netlify: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e, somente para rotas administrativas server-side, `SUPABASE_SERVICE_ROLE_KEY`.
- Não coloque a service role key em variáveis NEXT_PUBLIC nem no código do navegador.

## Segurança e implantação
- Usuários novos começam sem privilégios (role pending). O primeiro ADM deve ser provisionado manualmente e com identidade verificada.
- Convites administrativos exigem sessão ADM ativa e MFA AAL2.
- MFA TOTP está preparado; configure o provedor no Supabase Authentication > Multi-Factor Authentication.
- Mantenha RLS habilitado e revise as políticas antes de produção.
- GPS somente durante viagem/evangelismo ativo e após consentimento explícito.
- Não publique com dados demonstrativos como se fossem dados reais.

## Estado
O repositório contém a interface inicial, rotas de login/MFA, clientes Supabase e primeira migration de dados. Mapas/GPS, PDFs, e-mail transacional e telas CRUD ainda exigem implementação e validação com as credenciais do projeto.
