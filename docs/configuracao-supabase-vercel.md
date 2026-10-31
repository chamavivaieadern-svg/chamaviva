# Configuração do Supabase e Vercel — CHAMA VIVA

## 1. Configurar o Supabase
No projeto Supabase, abra Project Settings > API e copie:
- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- service_role key → `SUPABASE_SERVICE_ROLE_KEY` (somente nas Environment Variables da Vercel; nunca envie ao navegador ou ao GitHub).

No SQL Editor, execute as migrations em ordem:
1. `202610300001_initial_schema.sql`
2. `202610300002_tracking_and_storage.sql`
3. `202610300003_driver_group_visibility.sql`
4. `202610300004_realtime_locations.sql`
5. `202610300005_privacy_and_role_scoping.sql`
6. `202610300006_notifications.sql`
7. `202610300007_linked_group_bus_visibility.sql`
8. `202610300008_email_alerts.sql`
9. `202610300009_trip_route_coordinates.sql`
10. `202610300010_realtime_crusade_locations.sql`
11. `202610300011_passenger_capacity.sql`
12. `202610300012_enforce_mfa_in_database.sql`
13. `202610300013_approved_song_lyrics_in_program.sql`
14. `202610300014_atomic_song_review.sql`
15. `202610300015_notify_approved_music.sql`
16. `202610300016_director_program_permissions.sql`
17. `202610300017_validate_song_event_scope.sql`
18. `202610300018_publish_program_visibility.sql`
19. `202610300019_revoke_blocked_user_access.sql`
20. `202610300020_realtime_operational_modules.sql`
21. `202610300021_validate_trip_and_group_assignments.sql`

Confirme que as tabelas estão com RLS habilitado. Em Authentication > Providers, habilite e-mail. Em Authentication > Multi-Factor Authentication, habilite TOTP. Defina a URL do site e as Redirect URLs para o domínio Vercel de produção e para o domínio de preview que você realmente utilizar.

## 2. Criar o primeiro ADM
Não existe cadastro público e a API de convite só aceita um usuário já autenticado com role admin e MFA AAL2. Para evitar que alguém se torne ADM por auto cadastro:
1. Crie/invite o primeiro usuário confiável em Supabase Authentication > Users.
2. Aguarde o trigger criar a linha correspondente em public.profiles.
3. No SQL Editor, substitua o e-mail abaixo pelo e-mail exato da conta criada e execute uma única vez:

```sql
update public.profiles p
set role='admin', status='active', full_name='Administrador CHAMA VIVA'
from auth.users u
where p.id=u.id and lower(u.email)=lower('SEU-EMAIL-ADMIN@EXEMPLO.COM');
```

4. Entre em `/login`, cadastre e confirme o aplicativo autenticador TOTP. Só depois de estar com MFA ativo o ADM poderá convidar as demais contas em Usuários e equipes.
5. Remova ou substitua o texto de nome de exemplo pelo nome real do administrador.

Nunca compartilhe a service role key, códigos TOTP ou links de convite.

## 3. Configurar a Vercel
1. Na Vercel, escolha **Add New > Project** e importe o repositório `chamavivaieadern-svg/chamaviva`.
2. Selecione a branch de produção `main` e mantenha o Root Directory como `./`.
3. Framework Preset: **Next.js**. Build Command: `npm run build`. Não defina uma pasta de publicação estática.
4. Em Project Settings > Environment Variables, configure para Production, Preview e Development conforme necessário:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_ROUTING_URL` (opcional; configure um serviço OSRM compatível próprio para produção).
5. Salve as variáveis e faça um novo deploy. As variáveis públicas são lidas no navegador; a service role key deve existir somente no ambiente servidor.
6. No Supabase Authentication > URL Configuration, configure o Site URL e Redirect URLs com o domínio `*.vercel.app` real do projeto e os domínios de preview efetivamente usados.
7. Mantenha o GitHub como fonte principal do código. Commits na branch `main` devem disparar deploys automáticos depois de conectar a integração GitHub.


## 4. E-mails de avisos importantes
O repositório inclui a Edge Function `send-notification-email`. Para ativá-la:
1. Verifique um domínio de envio no Resend.
2. Instale e autentique a Supabase CLI no seu computador.
3. Execute `supabase functions deploy send-notification-email`.
4. Cadastre os secrets da função: `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM` (por exemplo, `CHAMA VIVA <avisos@seudominio.com>`) e `EMAIL_WEBHOOK_SECRET` (uma senha aleatória longa).
5. No Supabase Dashboard > Database > Webhooks, crie um webhook para INSERT em `public.notifications`, apontando para `https://SEU-PROJETO.supabase.co/functions/v1/send-notification-email`. Envie o header `x-webhook-secret` com o mesmo valor de `EMAIL_WEBHOOK_SECRET`.
6. Faça um teste com uma notificação marcada `send_email=true`. Alertas importantes de novas letras, revisão de letras, viagens atribuídas e programação publicada estão marcados para e-mail. Mensagens particulares permanecem somente internas.

## 5. Testes antes de produção
Crie contas de teste para cada perfil e confirme:
- Usuário não autenticado não acessa /painel.
- Usuário pendente/bloqueado não entra.
- Sem TOTP não acessa os módulos.
- ADM consegue convidar, bloquear e remover; demais perfis recebem 403.
- Pastor só vê registros de igrejas vinculadas.
- Dirigente só aprova letras da igreja autorizada.
- Motorista só inicia GPS de viagem atribuída a ele.
- Líder só inicia GPS de grupo atribuído a ele.
- Motorista, pastor e líder veem somente os locais autorizados.
- PDF, e-mail e upload são testados com arquivos e contas reais antes de liberar.

## 6. Limites conhecidos da localização web
A página de mapa usa OpenStreetMap e recebe novos registros por Supabase Realtime. O compartilhamento de localização usa a Geolocation API do navegador e exige HTTPS, permissão explícita e a página aberta. O cálculo de rota usa um endpoint compatível com OSRM configurável por `NEXT_PUBLIC_ROUTING_URL`; o endereço público de demonstração no `.env.example` serve apenas para desenvolvimento e não oferece garantia de produção. Navegadores móveis podem suspender a página quando o aparelho bloqueia a tela ou o sistema economiza bateria. Para rastreamento confiável em segundo plano durante longos trajetos, será necessário um aplicativo móvel nativo ou PWA com suporte específico de background location, além de testes em Android/iOS.
