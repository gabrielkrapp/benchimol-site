# Implementação e validação — 01/10/2026

Escopo canônico: **spec v0.9**. Aplicação Next.js oficial implementada e banco exclusivo da clínica inicializado/importado; QA manual editorial concluída no dev de Gabriel com Supabase hospedado, com restauração conferida. **Nenhum release, deploy ou alteração de DNS foi executado.** A integração GitHub inicial tem autorização específica para commit/push/PR/merge, registrada no final deste ledger. Gabriel forneceu o projeto Supabase `jjrzmuuwuvxcsnwqzvxf`; nenhum recurso LifeWallet foi usado. Docker permanece fechado por decisão do usuário.

## Decisões confirmadas

Site, painel e APIs no mesmo Next.js/TypeScript/App Router, preparado para Vercel; Supabase pelo Marketplace para PostgreSQL/Auth/Storage. Primeiro admin aprovado: Gabriel Krapp, `gabriel.krapp@hotmail.com`; a senha será definida por ele. A verificação hospedada às 20:43:25 UTC não encontrou esse usuário; o agente não criou contas/senhas reais ou enviou convites. Gabriel desativou signup, confirmado pela API. Recuperação por email permanece desabilitada até SMTP/redirects/entrega validados.

Comentários/formulário removidos por decisão expressa. WP34 e WP1966 usam aliases aprovados; WP1959/1963 preservam ambos os IDs e redirect existente, totalizando 154 registros/153 artigos canônicos. Referência visual: layout completo esperado do Elementor. Publicação e aceite cloud permanecem com Gabriel. Não há evidência de contrato assinado/pagamento.

Sem URL/key do Supabase, o site público abre com acervo migrado e imagens estáticas. Admin e uploads exigem backend real. Configuração parcial ou erro do banco nunca recupera conteúdo retirado; `ALLOW_PUBLIC_SNAPSHOT=false` protege o ambiente conectado. O `.env.local` privado preparado agora usa o banco real da clínica: mudanças editoriais nesse preview afetam esse destino. Arquivos env têm permissão 0600 e permanecem ignorados pelo Git.

## Implementado

- Captura restaurada/WXR público reconciliados: 154 posts, 38 páginas, 551 mídias, duas galerias e 1.377 registros de assets conferidos por hash/tamanho. Corpos e evidências originais preservados.
- SSR de todos os artigos, páginas/templates originais, CSS isolado, slugs legados, taxonomias, paginação rastreável, metadata/JSON-LD/sitemap/robots/llms públicos.
- Admin com login protegido, dashboard factual, editor de posts/imagens/YouTube, preview privado, histórico/versionamento/lixeira/restore, biblioteca de mídias, aviso, WhatsApp/histórico e oito prompts vinculados aos docs.
- Banco/API com admin ativo verificado no servidor e RLS, controle de concorrência, Storage privado, upload direto/finalização, referências de mídia e limite de login.
- Round-trip semântico dos 154 corpos no editor, importação idempotente por WP ID e teste de backup+restore de banco/bytes geridos.
- Correções de paridade: mapas no rodapé, ícones/HFE, capa proporcional, avaliações capturadas, índice Elementor e links sem anchors aninhados, miniaturas/carrossel/lightbox com especificidade correta e fullscreen em elemento permitido. Carregar Mais mantém seis posts iniciais e acrescenta três por acionamento, com buffer e links SSR de paginação. HFE aplica as classes/posições da fonte e preserva a expansão do submenu ao fechar e reabrir o pai.
- Correções editoriais: publicação sem data usa default do servidor; campos de texto literal mantêm `&`, `<`, `>` com escape no destino. HTML rico continua sanitizado.
- Binding remoto obrigatório e conexão PostgreSQL explícita, sem overrides por query/herança PG*, com CA/hostname verificados.

## Evidências integradas

| Verificação | Resultado e prova |
|---|---|
| Suite final, início 01/10 22:17:38.582 UTC | **29 arquivos, 174 testes passaram**, zero falhas, 91,108s; um arquivo por vez, sem Docker. `tests-final.json` |
| Typecheck e build | Passaram, exit 0. Next16.3.8, build `HUHevW-DGRcC9RbS-5oQu`, 13 rotas estáticas e demais rotas dinâmicas |
| Inventário | 154/38/551 IDs e 1.377 registros de assets com hash/tamanho; `inventory.json` |
| Captura/filtro Python | Oito testes passaram na rodada anterior; parser não alterado |
| Pacote servidor | 36 manifests, 345 arquivos únicos, dez Markdown + catálogo; nenhum arquivo privado fora da allowlist. `runtime-package.json`, mesmo build |
| Supabase da clínica | Inicialização transacional confirmada20:35:50 UTC, migration20261001202736, 154/153/551/2, 154 corpos/paths/hash exatos, RLS e bucket privado10MB. `clinic-initialization.json` |
| SDK/SQL hospedados | Sete checagens passaram20:43:25 UTC:153artigos com corpo/data/URL,551mídias no banco, catálogo admin privado, signupdesabilitado, bucketprivado e anon/nãoadmin sem ler rascunho/revisão ou escrever. Probes sempre revertidos, nenhum QA persistido. `clinic-connected.json` |
| QA visual final | 24 combinações de oito famílias em 390/768/1440px, com cada build identificado. No HUHe, galeria recapturada nas três larguras, 24/24 imagens carregadas e sem overflow; HFE verificado em 390/768px; Blog confirmado 6→9 por clique→12 por Espaço→15 por Enter. Relatório independente `visual-qa-final.md` |
| Auditoria HTTP final | **PASS HUHe**, completed/passed true, zero falhas, 22:30:12.082→22:31:45.588 UTC (93,506s). 153 artigos+38 páginas+106 extras=297 rotas; 478 assets, 42 CSS e 98 recursos CSS locais; sitemap200 e admin sem sessão401 após normalização308. `local-html-HUHevW-DGRcC9RbS-5oQu.json`; LT5 preservado separadamente |
| Docs e Brain | Nota freelancer do Gabriel Brain atualizada e idêntica à ponte canônica por SHA256. Consolidação de relatórios/build/matriz em [final-summary.json](../validation/final-summary.json); não certifica sessão admin real nem hospedagem publicada |

Detalhes em `backend.md`, `admin.md`, `public.md` e relatórios de `docs/validation/`. Evidências anteriores não comprovam mudanças posteriores. Context7 não estava exposto; documentação oficial atual, MCP Supabase docs e guias da versão Next instalada foram consultados.

## Correção posterior: origem do login local

Gabriel passou a executar seu próprio dev em3000; o servidor do agente em3002 foi encerrado a pedido dele. O login em `127.0.0.1:3000` apresentou 403 `origin_denied`, reproduzido sem credenciais. O guard foi corrigido para equivalência restrita dos aliases locais, mantendo porta/protocolo e proteções de origem. IP/IP agora chega à validação 422 do corpo vazio; origens externas/cross-site continuam403. **196 testes em30arquivos e typecheck passaram**, zero falhas; [prova própria](../validation/login-origin-fix.md).

Essa alteração é posterior ao build HUHe/relatórios acima; não se iniciou servidor, Docker ou build concorrente ao dev de Gabriel. Recompilar antes de usar `next start` ou publicar manualmente. Consulta somente leitura na clínica às23:53:54.892UTC confirmou que `gabriel.krapp@hotmail.com` ainda não existe no Auth; criação pessoal e vínculo admin permanecem pendentes. O êxito de origem não foi tratado como login autenticado.

## Diagnóstico posterior: conta Auth sem vínculo administrativo

Gabriel criou `benchimol@benchimolclinic.com.br` e pediu o teste do login. Em seu servidor na porta 3000, o formulário reproduziu a recusa; Auth aceitou as credenciais às `2026-10-02T00:09:49.470Z` (noite de 01/10 em São Paulo), mas faltava o vínculo administrativo. Depois da confirmação específica **“Autorizo”**, foi inserido um vínculo ativo **Clínica Benchimol**, ao UUID conferido, no ref/API/TLS verificados da clínica, commit00:27:58.137UTC. Login/dashboard153, recarga e logout passaram; nova navegação ao admin sem sessão voltou ao login. [Relatório próprio](../validation/clinic-admin-login.md). A rejeição automática inicial e o estado anterior foram preservados. Não se mudou código, senha, conteúdo, schema ou políticas, nem se iniciou servidor/Docker/deploy. Recarga não prova refresh de token e logout não prova revogação global.

## Evidência Docker anterior e limites de QA

Antes da instrução de parar Docker, oito grupos de integração real Auth/PostgreSQL/REST/Storage passaram em `supabase-local.json`: login/sessão, signup recusado, RLS, CRUD/revisões/redirect/lixeira, assinaturas e bytes de mídia, configurações. A UI local confirmou login/dashboard, criação/publicação/retirada/restauração do artigo descartável, aviso/recusa de período, WhatsApp/histórico/restauração e prompts/cópia. Nenhum post WordPress foi editado.

O upload daquela UI ficou em **Preparando envio…**, sem finalização observada; os normalizadores e uploads foram posteriormente retestados com sucesso na rodada hospedada abaixo. Cancelar o diálogo nativo de saída não foi controlável no IAB; seis testes de histórico passaram, mas aceite desse diálogo no navegador do usuário permanece pendente. Logout e limpeza da fixture Docker não foram realizados; possível intenção/arquivo parcial deve ser conferida futuramente. Não reabrir containers nem tentar limpar essa fixture via produção. Relatórios `admin-posts-local-qa.md`, `admin-local-qa.md` e runbook local preservam as evidências.

## QA manual editorial e restauração hospedada

Rodada **QA-20261002-003846**, noite de 01/10 BRT. A conta real da clínica exercitou criação/edição/publicação/retirada/lixeira/restauração de post, histórico, prévia, slug/redirect, resumo, imagem/YouTube, concorrência, upload/edição/exclusão de quatro imagens, aviso/agenda, seis links WhatsApp da Home e seleção/cópia de prompts. Os defeitos de estado do editor, resumo, diálogos, entidades SEO/índice, confirmação de publicação e recusa de versão antiga foram corrigidos e retestados. A primeira tentativa WebP falhou; retry passou e a causa do evento não foi determinada.

| Verificação atual | Prova |
|---|---|
| Fluxos manuais | [Matriz, capturas e limites](../validation/hosted-manual-qa.md); servidor 127.0.0.1:3000 controlado por Gabriel, sem Docker |
| Suíte após patches | **229 testes / 38 arquivos**, exit 0, 171,46 s; início 01/10 às 22:35:23 BRT. [Saídas e manifesto](../validation/hosted-manual-qa-automated.json) |
| Typecheck após patches | Exit 0, em sequência após a suíte. Não foi repetido build concorrente; HUHe permanece histórico |
| Publicação automática | Post QA v19 confirmado `current` e disponível na visita pública; v20 colocado na lixeira antes da limpeza |
| Exclusão/restauração | Post + 19 revisões + um redirect de QA removidos às01:38:09.506Z; quatro imagens excluídas pela UI com autorização específica; somente intenção WebP vazia + oito revisões QA removidas no fechamento às01:40:07.684Z |
| Oráculo do baseline | **12 contagens/hashes iguais**, verificação somente de leitura às01:40:37.711Z. [Prova](../validation/hosted-manual-qa-verify.json); baseline canônico derivado do snapshot privado original |
| Estado final | 154 registros/153 públicos/551 mídias/2 redirects, zero fixtures/revisões/intenção/objeto gerido; contato e aviso originais v1; sessão encerrada |
| HTTP final | 13 checks passaram às01:41:26.030Z: Home/blog/sitemap, slugs e mídias QA404, APIs reais401 e preview→login. [Prova](../validation/hosted-manual-qa-http-final.json) |

Os valores/versões/autoria/timestamps originais de settings foram repostos; triggers reativados antes do commit. Auth, logs de segurança, sessões e limites de login não foram apagados. O hash inicial de tabelas usava outra ordem de serialização: conferir baseline canônico e relatório, em vez de comparar esse resumo inicial diretamente aos finais. O código permanece local, sem publicação. Biblioteca de prompts0.10 e nota do Brain registram o fechamento; [sincronização externa conferida por SHA-256](../validation/hosted-manual-qa-brain-sync.json), byte idêntica à ponte canônica. Revisão independente das provas/documentação não encontrou achados materiais.

## Pendências de aceite

- Expiração real/refresh e revogação global continuam sem prova; CRUD/upload/configurações/login/logout passaram na QA hospedada acima. A aprovação anterior da conta pessoal de Gabriel permanece separada. Não copiar a conta QA local para produção.
- Recompilar os patches antes de `next start`/publicação manual e validar mobile atual: o pedido de viewport390px não se aplicou no IAB desta rodada. Backup/restore integral em outro projeto hospedado, playback externo YouTube e corrida exata entre preflight e gravação SQL não foram exercitados.
- Revisar a matriz visual representativa com a clínica; ela não comprova fidelidade de pixels ou conferência visual de todas as URLs. Transição de hover e gestos nativos não tiveram aceite real no navegador do usuário.
- Validar cookies, CORS, SMTP se ativado, CDN/WAF/crawlers reais, SEO e retirada editorial após publicação manual. A validação do Supabase e preview não certifica Vercel publicada.
- `/cataratacatar/`, `/equipe-medica-old/` e um PDF já retornavam404 na origem. Taxonomias vazias ficam preservadas/noindex. Avaliações são captura pública, sem atualização contínua. Um emoji de avaliação e embeds de mapas/vídeos dependem dos provedores externos.
- Resolver elegibilidade comercial do plano Vercel antes da publicação; nenhum plano pago contratado. Não prometer ranking/citação IA/performance/tráfego sem medir.

## Auditoria dividida em agentes — 01–02/10/2026

SEO Google, leitura por IA, segurança Vercel/Supabase, performance, limpeza local e presença na busca Google foram revisados em frentes independentes. Gabriel confirmou ausência de URL Next hospedada e iniciou seu servidor na porta 3000 para o suplemento HTTP. [Resultado consolidado, evidências e prioridades](../validation/audit-2026-10-01/README.md).

Catálogo hospedado somente leitura no ref exclusivo da clínica: **12/12 tabelas da aplicação com RLS**, signup desabilitado, bucket privado; **97 testes focados/9 arquivos** passaram e npm audit de produção retornou zero advisories. Proteções HTTP passaram em 16/16 checks; amostra pública passou em 13/13 status esperados, com HTML/metadata/JSON-LD, robots, sitemap216 URLs e llms.txt. Nenhuma tentativa real de login ou mudança no banco nesta rodada.

Achados permanecem abertos: bloqueio de crawl de mídias novas em `/api/media/` (P1); controles de imagem/entidades SEO legadas; autoria/schema/identidade a confirmar; grants excessivos, proteção de Auth direto e headers; aviso dependente de hidratação; CSS/imagens/consultas a otimizar após medidas e comparação visual. CSS Home 2.292.204 B bruto/251.445 B gzip observado; banner 1.309.507 B. Não são scores ou CWV medidos. Perfil público de Copacabana tem domínio/CEP divergentes; conferir com a clínica sem alterar automaticamente.

Limpeza autorizada: 14 arquivos regeneráveis/216.034 B e dois diretórios vazios; inventário 1.377 assets, conteúdo e hashes CSS preservados. Repositório permanece somente local (D-013). Nenhum patch runtime, Docker, build, servidor iniciado/parado, conteúdo/schema/Auth/Storage gravado, push/merge/deploy. Suíte integral 229 histórica preservada; não repetida sem alteração de código. PageSpeed e aceite Vercel/SearchConsole continuam dependentes de ambiente publicado por Gabriel e acessos específicos.

## Correções aprovadas após auditoria — 02/10/2026

Gabriel pediu “Aplique as correções”. Três agentes implementaram SEO/IA, segurança e performance, com revisões cruzadas e integração pelo coordenador. [Relatório e provas atuais](../validation/corrections-2026-10-02/README.md). A auditoria anterior permanece como histórico, sem reescrever seus achados como se já estivessem corrigidos naquele momento.

- SEO/HTML: crawl estrito das imagens públicas, prévia grande, organização/unidades/WebSite/breadcrumb, decoder somente legado e aviso vigente SSR/noscript. Autoria/CEP/domínio/sample-page/política de treinamento preservados para decisão clínica.
- Supabase da clínica: migration05 +118 reparos de SEO confirmados no relatório criado em `2026-10-02T04:17:34.160Z`; bodies/datas/versões e outras11 relações iguais por SHA-256/contagem, trigger reativado, RLS12/12 e ACLs existentes Auth/Storage preservados. Preflight conferiu132 concessões excessivas de TRUNCATE/TRIGGER/REFERENCES/MAINTAIN; final recusa essas operações nos papéis de cliente. Consulta independente posterior encontrou zero reparos pendentes.
- Probes hospedados posteriores passaram11 checks de SDK/SQL, incluindo draftCRUD, settings, registros de mídia/intenção, serviço limitador e negações anon/não-admin. Sempre rollback; todas12 relações iguais após probes, sem Storage bytes, contas, login real ou publicação. Não equivalem a repetir a QA manual autenticada anterior.
- Segurança de código: headers efetivos no dev, CSP ampla Report-Only/admin anti-framing obrigatória, decode integral/limites/EXIF em uploads e expurgo manual com plano/hash/ref. Planejamento remoto encontrou zero candidatos; nenhuma exclusão.
- Performance: banner lossless RGBA idêntico, -35,23% em bytes; CSS Home -15,33% bruto/-7,03% Brotli offline.45 entradas/42 novos arquivos CSS, manifesto atômico/hashes antigos preservados. Dimensões/capas/preload, srcset proporcional e sidebar estável; taxonomias sóIDs/cacheporrequest.
- Regressão detectada na primeira suíte completa:295/300 passaram; cinco falhas em depoimentos. Dimensões automáticas nos avatares alteravam o hash de reconhecimento do widget. A correção exclui somente esses avatares já dimensionados pelo CSS, mantendo guard/hash/captura literal e overrides.27/27 focados passaram; Home e Leia mais/Esconder retestados em390/768/1440px. A suíte final e typecheck constam no ledger da rodada.
- Verificações:1.377 assets/conteúdo íntegros; HTTP22/22 posterior passou, inclusive SSR de depoimentos, metadata corrigida, dados privados recusados e cache imutável.12 combinações visuais sem overflow; interações móveis de menu, FAQ, blog e galeria passaram. As medições transitórias e o primeiro teste antecipado de Carregar Mais permanecem registrados; reteste esperou a resposta completa.

**Fechamento automatizado:** 301 testes em51 arquivos passaram, exit0,285,60s; typecheck final exit0. O primeiro typecheck apontou somente retorno numérico de callbacks PostCSS e inferência de union na fixture SEO. Ajustes restritos a três arquivos de teste, sem runtime, com15/15 retestados e typecheck repetido. Logs anteriores preservados. [Ledger atual com hashes das provas](../validation/corrections-2026-10-02/summary.json).

Não houve Docker/build/servidor iniciado ou reiniciado manualmente pelo agente, merge/push/deploy ou uso LifeWallet. Biblioteca de prompts0.11, runbooks e contexto freelancer atualizados. Build HUHe permanece histórico; recompilar antes de next start/publicação manual. PageSpeed/CWV/Vercel/SearchConsole/SEO publicado, Auth direto/CAPTCHA/MFA e decisões editoriais continuam pendentes nos limites descritos no relatório.

## Integração GitHub inicial autorizada — 02/10/2026

Gabriel substituiu a decisão de repositório somente local e autorizou commit/push/PR/merge para `gabrielkrapp/benchimol-site`, privado. A exceção fica restrita a esta integração inicial; deploy, release, Docker e reinício/publicação de serviços continuam proibidos. D-014, [runbook](../operations/github-integration.md) e [contexto técnico portátil](../context/project-context.md) acompanham o clone; Brain pessoal, comentário antigo e capturas administrativas permanecem locais/ignorados, junto dos envs, contratos e backups já protegidos.

O GitHub vazio tinha default main, zero hooks/workflows/deployments/Pages; Vercel Benchimol sem ligação Git/framework/produção/deployhooks. Revisão automática rejeitou o bootstrap por push direto para main, que não executou. A alternativa indicada foi aplicada: commit base `8a851a4`, somente `vercel.json`, enviado a `codex/repository-base` (default observado após o primeiro push). O projeto inteiro será integrado por PR de `codex/benchimol-migration` para essa base; depois do merge a branch padrão poderá ser renomeada para main, sem push direto de código. `git.deploymentEnabled=false` bloqueia todas as branches.

Verificação desta integração: **301 testes/51 arquivos**, exit0,230,75s, e **typecheck exit0**. Biblioteca0.12 tem41 caminhos de arquivos conferidos; inventário de assets/conteúdo validado separadamente. Revisões finais do índice conferem segredos/privados e completude, sem modificar runtime, instalar dependências, executar Docker/build ou gravar no Supabase. [Provas e limites](../validation/github-integration-2026-10-02/README.md). CI/deploy externo não criado; build HUHe continua histórico. Resultado GitHub e recibos locais de commit/merge não comprovam publicação ou aceite da clínica.
