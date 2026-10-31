# CHAMA VIVA — requisitos aprovados

Este documento registra as decisões confirmadas durante o planejamento. Ele orienta a implementação e não significa que os módulos descritos já estejam funcionais.

## Produto e tecnologia
- Aplicação web responsiva e simples de operar, com módulos completos.
- Next.js App Router, React, TypeScript, CSS e Motion.
- Supabase para autenticação, PostgreSQL, armazenamento e atualizações em tempo real.
- Vercel para hospedagem.
- Identidade visual: amarelo, laranja, branco e vermelho.
- Idioma principal: português do Brasil.

## Perfis e acesso
- ADM: visão global de todas as páginas, igrejas, regiões, usuários e operações. Único perfil autorizado a criar, convidar, bloquear e remover usuários, além de administrar logos e identidade visual.
- Pastor: vê somente sua igreja/região; acompanha programação, pregador, avisos, mapa e relatórios de viagens relacionados à sua igreja, limitados ao necessário para sua função.
- Dirigente: organiza a programação do culto, ordena participações, define horários e duração, analisa envios de letras e pode baixar o PDF da programação.
- Pregador: visualiza a programação e as informações autorizadas para sua participação.
- Músico/cantor: visualiza a programação e envia letras para análise do dirigente.
- Líder de grupo: acompanha ônibus autorizado e compartilha localização do grupo durante evangelismo ativo, mediante autorização.
- Motorista: vê viagens atribuídas, rota e localização dos grupos vinculados; compartilha GPS durante viagem ativa, mediante autorização.
- Participantes e outros perfis: acesso mínimo necessário às próprias atividades.
- O acesso deve ser aplicado no servidor e no banco de dados (RLS), nunca somente ocultando elementos da interface.
- Contas individuais por e-mail e senha. 2FA obrigatória com aplicativo autenticador. Primeiro ADM por convite seguro.

## Igrejas e regiões
- O ADM cadastra e administra todas as igrejas e regiões.
- Cada pastor acessa somente a igreja/região atribuída.
- O ADM pode alternar e consultar todas as igrejas.
- Dirigentes, equipes e viagens devem estar associados às igrejas/regiões corretas.

## Cultos e programação
- Dirigente organiza a sequência de abertura, louvor, saudações, participações, pregação e encerramento.
- Cada item pode ter responsável, horário, duração e observações.
- Reordenar itens por arrastar e soltar.
- Pastor, pregador, músicos e perfis autorizados podem visualizar a programação.
- Exportação PDF permitida somente para ADM e dirigente.
- Todos os PDFs incluem a logo oficial CHAMA VIVA. O ADM pode enviar logos adicionais e escolher quais exibir em cada documento.

## Músicas e repertório
- Músicos enviam título, intérprete/cantor, letra e observações.
- Envios ficam pendentes até aprovação do dirigente.
- Só depois da aprovação entram na programação oficial e são divulgados aos usuários autorizados.
- Registrar remetente, data, status, aprovador e horário da decisão.
- Notificar sobre aprovação ou rejeição.

## Comunicação
- Central de notificações dentro do sistema, com contador e estado de leitura.
- E-mails para avisos importantes, convites e eventos relevantes.
- Mensagens e observações direcionadas a pessoas específicas.
- Registrar remetente, destinatário, data, leitura e histórico.
- Visibilidade das mensagens deve respeitar privacidade e permissões; não presumir que toda conversa particular seja visível a todos os administradores.

## Viagens, ônibus e passageiros
- Cadastro de viagens com origem, destino, data, horários, motorista, veículo, igreja/região, passageiros e vagas.
- Estados de viagem: aguardando saída, em deslocamento, chegada ao destino, concluída e problema/imprevisto.
- Registro de embarque, desembarque, ausência e ocorrências.
- Relatório de viagem com rota planejada, horários, responsável e ocorrências.
- ADM vê todas as viagens; pastor vê somente as relacionadas à sua igreja; motorista vê viagens atribuídas.

## GPS, evangelismo e cruzadas
- Motorista pode iniciar rastreamento manualmente ou confirmar uma viagem programada; ambas as opções exigem autorização explícita.
- GPS do ônibus é compartilhado somente durante viagem ativa.
- Líder pode iniciar compartilhamento do grupo ao começar o evangelismo, mediante autorização.
- Motorista vê os grupos vinculados à sua viagem; líder vê o ônibus e os grupos autorizados; pastor vê as operações da sua igreja; ADM vê todas as operações.
- O mapa também permite cadastrar o ponto da cruzada por endereço ou seleção no mapa.
- Exibir estado de conexão e horário da última posição. Nunca apresentar posição antiga como atual.
- Sem internet, guardar a última posição conhecida e retomar o envio quando a conexão voltar.
- Encerrar compartilhamento ao finalizar a viagem/evangelismo.
- Implementação móvel deve considerar permissões de localização, consentimento, consumo de bateria e limitações reais de GPS em segundo plano no navegador.

## Painel e facilidade de uso
- Painel inicial adaptado ao perfil.
- Menu por módulos, pesquisa, calendário, atalhos e central de notificações.
- Interface responsiva para computador, tablet e celular.
- Ações importantes com confirmação, estados claros e mensagens de erro úteis.
- Auditoria de alterações sensíveis.

## Segurança e operação
- RLS em todas as tabelas com dados de igrejas, usuários, viagens e mensagens.
- Validar permissões no servidor em cada operação.
- Não expor chaves privilegiadas no navegador.
- Uploads com validação de tipo/tamanho e armazenamento privado quando necessário.
- 2FA obrigatória, recuperação de conta segura, rate limiting e logs de auditoria.
- Backups e política de retenção para dados de localização.
- Localização é dado sensível: coletar somente durante atividade ativa e autorizada, informar o usuário e limitar retenção/acesso.

## Estado da implementação
- Iniciado: estrutura Next.js/TypeScript, layout base, identidade visual inicial e painel administrativo demonstrativo.
- Implementado em parte: autenticação Supabase, fluxo de MFA TOTP, rotas administrativas, módulos de igrejas, programação, usuários, viagens, passageiros, grupos, mapa/GPS, mensagens, notificações, PDF e migrations com RLS.
- Ainda depende de configuração e validação real: variáveis e migrações no projeto Supabase, primeiro ADM, secrets/webhook de e-mail, domínio/redirects, teste de cada perfil e revisão de segurança antes da produção. GPS em segundo plano continua limitado pelos navegadores móveis.
