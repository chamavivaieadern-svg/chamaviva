# CHAMA VIVA

Plataforma de gestão de igrejas, cultos, viagens e equipes de evangelismo.

## Stack aprovada
- Next.js (App Router), React e TypeScript
- CSS e Motion
- Supabase (Auth, Postgres, Storage e Realtime)
- Vercel para hospedagem

## Desenvolvimento local
1. Instale Node.js LTS.
2. Execute `npm install`.
3. Copie `.env.example` para `.env.local`.
4. Preencha as credenciais do projeto Supabase quando ele for provisionado.
5. Execute `npm run dev`.

## Estado atual
O primeiro commit inicia a estrutura visual do painel administrativo. A interface inicial usa dados demonstrativos; autenticação, banco de dados, permissões RLS, notificações, e-mails, PDFs e GPS ainda precisam ser conectados e testados antes de uso real.

## Segurança planejada
- Convite seguro para o primeiro ADM.
- Contas individuais e 2FA obrigatória.
- Autorização no servidor e políticas RLS por igreja e função.
- Rastreamento GPS somente durante viagens/evangelismos ativos e autorizados.
- Histórico de auditoria e proteção de uploads.
