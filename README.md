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
- Mantenha RLS habilitado; AAL2 é exigido também pelas políticas do banco e pelas rotas administrativas. Revise as políticas antes de produção.
- GPS somente durante viagem/evangelismo ativo e após consentimento explícito.
- Não publique com dados demonstrativos como se fossem dados reais.

## Estado
O repositório contém o painel inicial protegido, login e MFA TOTP, convites e gestão administrativa de usuários, páginas de módulos com leitura/criação inicial de registros, migrations com RLS, formulários de igrejas/eventos/músicas/viagens/grupos/mensagens/documentos, mapa OpenStreetMap com rota estimada, envio de GPS mediante consentimento, lista de passageiros e estados de embarque, relatórios operacionais iniciais, notificações internas e Edge Function de e-mails importantes. A programação permite organizar participações e exportar PDF para ADM/dirigente com logos carregadas. E-mail depende de publicar a Edge Function, configurar Resend e criar o Database Webhook; módulos e regras ainda precisam ser validados em ambiente real. O GPS pelo navegador exige a tela aberta; rastreamento confiável em segundo plano requer app móvel próprio.
