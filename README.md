# CHAMA VIVA

Sistema de gestão de igrejas, cultos, viagens, comunicação e equipes de evangelismo.

## Tecnologias

- Next.js 15 (App Router), React 19 e TypeScript
- CSS e Motion
- Supabase Auth, PostgreSQL, Storage e Realtime
- Leaflet / OpenStreetMap para mapas
- Vercel para hospedagem

## Requisitos

- Node.js 22.x
- npm

## Desenvolvimento local

1. Instale as dependências: `npm install`
2. Copie `.env.example` para `.env.local`.
3. Preencha as variáveis do Supabase no arquivo local.
4. Aplique as migrations existentes em `supabase/migrations` no projeto Supabase correto.
5. Inicie o ambiente: `npm run dev`

Comandos de validação:

- `npm run lint` — verifica padrões e erros do ESLint.
- `npm run build` — executa a compilação de produção.

## Variáveis de ambiente

Configure na Vercel, nos ambientes necessários:

| Variável | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública anon do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave privilegiada, somente no servidor |
| `NEXT_PUBLIC_ROUTING_URL` | Serviço de cálculo de rotas (opcional) |

Nunca coloque a service role key em variável `NEXT_PUBLIC_*`, no navegador, no GitHub ou em arquivos versionados. Os segredos de e-mail devem ser configurados como secrets da Edge Function no Supabase.

## Acesso e segurança

- O login da aplicação aceita e-mail ou matrícula; contas por matrícula usam um endereço técnico interno no Auth.
- A criação e a administração de usuários são feitas por rotas administrativas que verificam sessão, função e status.
- Contas sem liberação ou bloqueadas não devem acessar os módulos.
- As políticas RLS do Supabase são uma camada obrigatória de proteção e precisam permanecer habilitadas.
- A chave service role deve ser usada exclusivamente em código server-side.
- O GPS deve ser iniciado somente durante a atividade autorizada e com consentimento do motorista.

### Requisito de 2FA

A exigência do projeto é que todos os usuários usem autenticação de dois fatores por aplicativo autenticador (TOTP). **Essa exigência ainda precisa ser implementada e validada ponta a ponta antes de considerar o sistema pronto para produção.** Não trate a autenticação atual como se já obrigasse todos os usuários a concluir o MFA.

## Implantação na Vercel

- Framework: Next.js (detecção automática).
- Build command: `npm run build`.
- Configure as variáveis de ambiente acima em Project Settings → Environment Variables.
- Valide o preview e os fluxos de autenticação antes de promover uma versão para produção.

## Funcionalidades presentes no repositório

O código inclui painel protegido, login por e-mail/matrícula, gestão administrativa de usuários, vínculo com igrejas, páginas de módulos, formulários operacionais, programação e exportação PDF, notificações, mapas e recursos de viagens/localização. A presença de uma tela ou formulário não significa que todos os cenários de gravação, permissões e integrações externas já foram validados em produção.

Dependências externas, como envio de e-mail, precisam das respectivas Edge Functions, secrets e webhooks configurados no Supabase. O rastreamento pelo navegador depende de conexão e da tela permanecer aberta; rastreamento confiável em segundo plano exige um aplicativo móvel.

## Checklist antes da produção

- [ ] Tornar o TOTP obrigatório para todos os perfis e testar recuperação/novo dispositivo.
- [ ] Revisar RLS tabela por tabela e testar isolamento entre igrejas e funções.
- [ ] Testar criar, editar, bloquear e excluir usuários.
- [ ] Testar salvar, editar e excluir em cada módulo, confirmando persistência no banco.
- [ ] Testar mensagens com liberação explícita pelo ADM.
- [ ] Validar mapas, rotas, pontos, raios e localização com consentimento.
- [ ] Validar PDF, logos, relatórios e envio de e-mails.
- [ ] Testar em celular e desktop e conferir acessibilidade.
- [ ] Confirmar CI e preview da Vercel antes de promover para produção.
