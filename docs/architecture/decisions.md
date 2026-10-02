# Decisões e pesquisa de arquitetura

Data da pesquisa: **30/09/2026**. Nenhuma conta ou infraestrutura foi criada. Valores em USD, sem impostos, domínio ou excedentes; revalidar na contratação. Context7 não estava exposto nesta sessão; foram consultadas fontes oficiais atuais. A pesquisa aplicou as skills de Context7 e Supabase; a alternativa Cloudflare foi pesquisada com sua skill.

As decisões posteriores de Gabriel abaixo substituem as alternativas da descoberta: **Next.js oficial na Vercel + Supabase pelo Marketplace**, sem deploy, com primeiro admin aprovado. As comparações de custo permanecem como histórico de pesquisa; não autorizam trocar a stack nem contratar plano.

## D-001 — Next.js e fidelidade

**Estado:** confirmado e implementado localmente. Next.js oficial + TypeScript + App Router, site/admin/API no mesmo projeto, HTML público do servidor e metadados por rota. Versões exatas estão fixadas em `package.json`/lockfile; preparação Vercel sem publicação.

O framework não replica Elementor sozinho. A fidelidade exige conteúdo exportado, assets locais, CSS real, estados de interação e conferência em múltiplas larguras. Não usar um template novo de landing page.

Fontes: [Metadata e OG](https://nextjs.org/docs/app/getting-started/metadata-and-og-images), [revalidação por caminho](https://nextjs.org/docs/app/api-reference/functions/revalidatePath).

## D-002 — Hospedagem comercial

**Estado:** pendente. A hipótese “Vercel gratuitamente” precisa ser corrigida. Hobby é apenas pessoal/não comercial; anunciar os serviços da clínica e desenvolver um site remunerado enquadram-se no uso comercial descrito pela Vercel. [Fair Use](https://vercel.com/docs/limits/fair-use-guidelines).

| Abordagem | Custo base | Vantagem | Limitação/decisão |
|---|---:|---|---|
| Next.js na Vercel Pro + Supabase Free | US$20/mês | Integração mais simples com Next.js; banco grátis | Hospedagem paga; banco pode pausar |
| Next.js/compatibilidade Next na Cloudflare Workers Free + Supabase Free | US$0 dentro das quotas | Caminho para hosting comercial sem mensalidade base | Validar adaptador/runtime, cache e CPU antes de escolher |
| WordPress como CMS headless + frontend novo | Custo legado ainda desconhecido | Reduz necessidade de migrar editor inicialmente | Mantém WordPress/plugins e foge do admin/substituição pretendidos; não recomendado para este briefing |

**Recomendação:** Vercel Pro se a clínica aceitar mensalidade de hosting e quiser a integração mais direta com Next.js. Se custo zero for requisito absoluto, fazer uma prova **local** de compatibilidade Cloudflare antes de aprovar arquitetura. Não prometer hospedagem gratuita definitiva antes de medir uso. Não trocar de framework sem informar Gabriel.

Vercel Pro: US$20/mês de base, um assento que publica e US$20 de crédito de uso; adicionais/excedentes podem aumentar a fatura. Editores do `/admin` não precisam de assentos Vercel. [Plano Pro](https://vercel.com/docs/plans/pro-plan).

Workers Free: 100 mil requests/dia e 10 ms de CPU por execução; assets estáticos têm requests gratuitas e ilimitadas. Espera de rede não equivale a CPU, mas renderização Next pode exceder 10 ms. Workers Paid começa em US$5/mês, com quotas maiores e excedentes possíveis. [Pricing Workers](https://developers.cloudflare.com/workers/platform/pricing/), [assets estáticos](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/).

As docs Cloudflare consultadas atualmente apontam vinext, ainda beta, para apps novos, e mantêm OpenNext documentado para apps existentes. Portanto não assumir que Next.js oficial, vinext e OpenNext são intercambiáveis. Fidelidade, Auth, SSR, cache e invalidação editorial precisam ser demonstrados no caminho escolhido. [Next.js Cloudflare](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/), [OpenNext](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/).

## D-003 — Banco, autenticação e mídias

**Estado:** confirmado por Gabriel; recurso da clínica ainda a conectar pelo Marketplace nativo da Vercel. Supabase reúne PostgreSQL, Auth e Storage. Na pesquisa, o plano Free inclui 500 MB de PostgreSQL, 1 GB Storage, 50 mil usuários ativos mensais Auth e limites de transferência de 5 GB egress + 5 GB cached egress. Há até dois projetos ativos gratuitos e limite de 50 MB por arquivo. Revalidar limites no recurso contratado. [Preços](https://supabase.com/pricing).

O conteúdo HTML dos 154 posts coletados soma aproximadamente 804 KiB, sem índices, revisões e metadados. A pesquisa inicial de 526 metadados de mídia estimava **98,2 MiB de arquivos** e não media variantes/tráfego. A reconciliação posterior recuperou todos os 551 originais públicos e 1.377 registros de assets com CSS/fontes/variantes locais; o verificador registra hashes/tamanhos. Assets legados serão estáticos em `public/`; somente uploads novos consomem o Storage gerido. Não assumir quota/tráfego do provedor a partir dessa soma.

**Risco de continuidade:** projetos Free podem pausar por baixa atividade durante sete dias. Uma Home em cache não mantém necessariamente atividade de banco. Não usar ping artificial como promessa de disponibilidade. Plano pago remove a pausa automática. [Project Pausing](https://supabase.com/docs/guides/platform/free-project-pausing).

**Backup:** Free não inclui backup automático. Planejar exportação regular e antes de operações importantes, com teste de restauração; cópia de mídias é separada. Backup do banco contém metadados Storage, não os bytes dos arquivos. Supabase Pro começa em US$25/mês e oferece backups diários com histórico de sete dias. [Backups](https://supabase.com/docs/guides/platform/backups).

**Login implementado:** email/senha e usuários previamente autorizados; primeiro admin Gabriel Krapp, `gabriel.krapp@hotmail.com`. Recuperação desabilitada até SMTP/redirects/entrega validados. Na pesquisa, o SMTP padrão é restrito à equipe da organização e a dois emails/hora. Não prometer emails operacionais sem configurar/validar provedor. [SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

**Autorização:** grants mínimos + RLS em todas as tabelas expostas; ser autenticado não torna alguém admin. Escrita limitada a admins ativos. Secret/service-role apenas no servidor, sem uso em variáveis públicas. [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [cliente SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs).

D1 é alternativa gratuita com 5 GB totais, cinco milhões de linhas lidas/dia, 100 mil escritas/dia e Time Travel de sete dias. Exige escolher autenticação e mídias separadas; não é a primeira opção para reduzir trabalho. [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/).

## D-004 — Conteúdo institucional e prompts no repositório

**Estado:** implementado localmente conforme briefing. Institucional, menu, estilos, assets e prompts ficam versionados. Overrides revisáveis em `content/site-overrides.json`; admin altera posts, popup e contato no banco. Não construir um Elementor novo nem editor genérico de todo o site.

Prompts são arquivos curados, com contexto e confirmação de mudanças, expostos como biblioteca de leitura no admin. Nenhuma API de LLM é necessária. A IA externa precisa ter acesso ao repo/documentos: copiar texto em um chat sem esses arquivos não modifica o site.

## D-005 — Vídeos e custos de mídia

**Estado:** implementado localmente. Vídeo HTTPS do YouTube por URL, imagem PNG/JPEG/WebP/GIF até 10 MB com conferência binária no servidor e upload direto ao Storage. Preservação de embeds legados seguros; originais já existentes não são descartados por esse limite.

Upload direto de vídeo fica fora da v1: arquivos e transferência consomem rapidamente planos gratuitos. Não baixar ou re-hospedar mídia de terceiros sem verificar origem/permissão. Assets vindos de `static.wixstatic.com` existem na coleta e precisam de tratamento, pois a origem não é somente WordPress.

## D-006 — Publicação editorial e regra de deploy

**Estado:** requisito. Ação do cliente “Publicar post” salva conteúdo, verifica autorização e invalida cache. Não usa Git, build ou deploy. Editor de popup e contato segue o mesmo princípio.

Mudança de código por prompt exige perguntas, proposta, aprovação da mudança, diff e validações. A IA entrega para revisão. Proibição de merge/deploy permanece; executar publicação de código cabe ao usuário. Integração Git→hosting não deve provocar deploy por uma ação indireta do agente.

## Registro das próximas decisões

Para cada decisão aprovada: registrar data, quem aprovou, alternativa selecionada, motivo e impacto no custo/escopo. As perguntas abertas estão em [client-inputs.md](../discovery/client-inputs.md). Ausência de resposta não transforma proposta em decisão aprovada.

## D-007 — decisões posteriores, implementação local autorizada

Em 30/09/2026 Gabriel autorizou migrar conforme a spec. Escolheu **Next.js oficial preparado para Vercel**, sem deploy; pediu plano grátis, com elegibilidade comercial a resolver antes de publicação. Escolheu conectar/criar **organização Supabase separada da clínica**, proibido usar LifeWallet. Confirmou **remover formulário e comentários** do app novo. A origem WordPress permanece intacta.

Captura restaurada e WXR público reconciliados: 154 posts, 38 páginas, 551 mídias públicas e 2 galerias, com todos os originais públicos recuperados. Dependências exatas em package/lockfile. Implementação, testes e limitações em `../implementation/`. Nenhuma infraestrutura de hospedagem/banco foi criada nesta etapa.

Gabriel aprovou `/cirurgia-refrativa-artigo/` para o post WP34, mantendo página WP3216 na URL original. O mapa canônico está em `data/wordpress/route-decisions.json`, sem alterar os exports de origem. Redirecionamentos existentes e sombras de posts são conferidos por ID/corpo; nenhuma perda silenciosa.

## Confirmação de infraestrutura e admin — 30/09/2026

Gabriel escolheu **Next.js completo na Vercel + Supabase através do Marketplace nativo da Vercel**, reunindo PostgreSQL, Auth e Storage e centralizando criação/gestão/cobrança no fluxo da Vercel. Não criaremos backend hospedado separadamente. Organização/projeto exclusivos da clínica; LifeWallet continua proibido. Integração/recurso ainda não criados; não executar deploy nem conectar Git com publicação automática.

Primeiro administrador aprovado: `gabriel.krapp@hotmail.com`, Gabriel Krapp. Não há usuário Auth/senha criado nem email enviado nesta etapa. A senha será definida por fluxo seguro pelo próprio usuário. A integração do banco não remove a restrição comercial do Hobby.

Documentação atual: [integrações nativas Vercel](https://vercel.com/docs/integrations), [Supabase Marketplace](https://supabase.com/docs/guides/integrations/vercel-marketplace). Os projetos são recursos do Supabase, com conta vinculada e gestão via Vercel; a documentação consultada identifica a integração como Public Alpha. O runtime usa os mesmos clientes/Supabase APIs.

## D-008 — Supabase real em Docker para desenvolvimento

**Confirmado por Gabriel em 30/09/2026.** Usar a CLI oficial fixa do projeto para orquestrar PostgreSQL, Auth, Storage, Studio e e-mail de teste locais. Identidade, rede e portas exclusivas `benchimol-local`, restritas a `127.0.0.1`; banco e volumes preservados ao parar. Arquivo `.env.supabase.local` privado e separado de `.env.local`. Bootstrap transacional dos schemas/seed e importador idempotente reutilizado; nenhum vínculo cloud ou recurso de outro cliente. Comandos e evidências em [supabase-local.md](../operations/supabase-local.md).

## D-009 — Site público disponível antes da configuração do backend

**Confirmado por Gabriel em 30/09/2026, spec v0.7.** URL/key do Supabase inteiramente ausentes não bloqueiam Home, páginas, blog ou imagens migradas: usar o acervo público versionado. Administração e novos uploads continuam exigindo backend real. Isso substitui a decisão anterior de snapshot exclusivamente local e opt-in.

Com banco conectado, ler o conteúdo editorial atual; configuração parcial ou falha do provedor não recupera a captura antiga. Definir `ALLOW_PUBLIC_SNAPSHOT=false` no ambiente editorial conectado para também impedir recuperação se suas variáveis forem removidas. Regressões do servidor em `tests/backend/public-source.test.ts` e inspeção real sem envs ficam no ledger de validação.

## D-010 — Continuar implementação sem executar Docker

**Confirmado por Gabriel em 01/10/2026, spec v0.8.** Não iniciar containers durante a implementação atual devido ao consumo de memória do notebook. O Docker já estava fechado quando a decisão foi aplicada; nenhuma stack foi reaberta. Preservar volumes, env privado e comandos como opção manual futura. QA de Auth/Storage que exigir backend, logout e limpeza dos registros descartáveis aguardam nova instrução para esse ambiente ou o projeto exclusivo da clínica.

O fluxo habitual é `npm run dev`, com acervo público e imagens disponíveis sem Supabase. Testes usam `fileParallelism:false`, mantendo um arquivo por vez; builds, testes e preview são executados em sequência. Os testes embutidos não iniciam Docker. Context7 estava indisponível; configuração confirmada na [documentação oficial Vitest](https://vitest.dev/config/fileparallelism.html) e fluxo Next nas guias oficiais da versão instalada em `node_modules/next/dist/docs/`.

## D-011 — Integração autorizada com o Supabase da clínica

**Confirmado por Gabriel em 01/10/2026, spec v0.9.** Gabriel forneceu `.env.prod` e autorizou usar produção quando necessário. Ref explícito `jjrzmuuwuvxcsnwqzvxf`; API e identidade do pooler correspondem ao mesmo projeto, fora dos dois refs LifeWallet bloqueados. O preflight TLS verificado encontrou banco da aplicação e buckets vazios. O conector Supabase atual não tem acesso a esse recurso; não usar seu perfil/default como alternativa. O acesso Studio pelo Marketplace está documentado oficialmente em https://supabase.com/docs/guides/integrations/vercel-marketplace.

O arquivo recebido usa nomes do Marketplace. Os aliases da aplicação, binding obrigatório, segredo de limite de login e CA oficial foram preparados em arquivo privado, sem imprimir valores. `.env.prod` não é carregado automaticamente pelo Next. Gabriel desabilitou o cadastro público; a API confirmou `disable_signup=true`. Criar a senha/conta do administrador real cabe a ele; o agente pode vincular somente a identidade aprovada e conferida. Nunca reutilizar senha WordPress.

Pacote inicial versionado pela CLI, com os quatro schemas + seed e registro de migration nativo. Executar somente sobre destino vazio explicitamente confirmado, com transação e reconciliação antes de commit; nunca resetar/recriar uma base ocupada. Estado efetivo e evidências em `docs/validation/clinic-*.json`. A autorização de banco não altera a proibição de Docker atual, merge/deploy ou limpeza de fixtures locais via produção.

## D-012 — Conta da clínica com autorização administrativa explícita

**Confirmado por Gabriel em01/10/2026.** Gabriel criou `benchimol@benchimolclinic.com.br`, pediu testar seu login e respondeu “Autorizo” à confirmação específica da concessão de privilégio. Vincular somente o UUID Auth real conferido no projeto `jjrzmuuwuvxcsnwqzvxf`, com nome **Clínica Benchimol** e `active=true`. A conta pessoal de Gabriel permanece uma aprovação anterior separada; não recriar a conta da clínica nem alterar senha, schema, RLS ou metadata.

A ausência desse vínculo causava401 mesmo com credenciais aceitas pelo Auth. A inserção parametrizada/transacional confirmou exatamente um registro ativo após commit00:27:58.137UTC02/10 (noite01/10 em São Paulo). Login/dashboard153, persistência por recarga e logout passaram no dev do usuário; sessão de teste encerrada. [Provas e limites](../validation/clinic-admin-login.md). Recarga não comprova refresh de token e logout não comprova revogação global; aceite de CRUD/upload e Vercel continua separado. Nenhum servidor, Docker, merge ou deploy iniciado.

## D-013 — Repositório somente na máquina local

**Decisão histórica, substituída por D-014 em02/10/2026.** O texto abaixo registra o estado no momento da auditoria.

**Confirmado por Gabriel na revisão de 01–02/10/2026.** O repositório não será hospedado no GitHub. Manter fontes, documentação, evidências, scripts e histórico Git local; não criar remote/CI externa por inferência. Isso não altera a arquitetura preparada para Vercel nem autoriza publicação. A auditoria local encontrou zero remotes; `.git` permanece para recuperação.

Limpeza limitada a seis `.DS_Store`, oito bytecodes Python com fontes existentes e dois diretórios que ficaram vazios; 216.034 bytes removidos. Referências runtime, originais, snapshots, contratos, envs privados, rollback e artefatos do dev foram preservados e conferidos. [Manifesto e validação](../validation/audit-2026-10-01/repository.md). Os achados de SEO/IA/segurança/performance são propostas registradas no [relatório consolidado](../validation/audit-2026-10-01/README.md), sem alteração de comportamento nesta auditoria.

## D-014 — Integração GitHub inicial com merge autorizado, sem deploy

**Confirmado por Gabriel em02/10/2026.** Repositório privado `https://github.com/gabrielkrapp/benchimol-site.git`. Autorização explícita para commit, push, abertura de PR e merge desta integração inicial; substitui D-013 e a restrição de merge apenas neste escopo. Deploy, release, Docker e publicação/reinício de serviços continuam proibidos. Não habilitar auto-merge nem concluir merges futuros por inferência.

Remoto observado vazio e default branch `main`. Inicializar somente a proteção `vercel.json` na base de trabalho `codex/repository-base`, com `git.deploymentEnabled=false` em todas as branches; a aplicação entra em `codex/benchimol-migration` e via PR para essa base. A revisão automática rejeitou o push inicial direto para main, que não foi executado. Depois do merge, renomear a branch integrada para main se permitido; todo o código entra por PR, sem push direto para main. Workflows, hooks, Pages, deployments e Vercel verificados antes do envio, sem execução de automações. Não se realizou deploy para demonstrar integração.

Env, contratos, backups/export autenticado, comentário antigo, memória pessoal do Brain e capturas administrativas permanecem locais/ignorados. Fontes, assets públicos, inventários, documentação técnica portátil, prompts e resumos de validação entram no Git. [Runbook](../operations/github-integration.md) e [contexto técnico](../context/project-context.md). GitHub não comprova aceite da clínica, métricas de produção ou resultados profissionais.
