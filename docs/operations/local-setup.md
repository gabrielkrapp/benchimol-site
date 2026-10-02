# Setup local e preparação de hospedagem

Fonte canônica: spec v0.9 e `../implementation/plan.md`. Next.js oficial com App Router, Node 22 LTS, Supabase exclusivo da clínica. Nenhuma publicação foi executada.

**GitHub autorizado em02/10:** clone privado de `https://github.com/gabrielkrapp/benchimol-site.git`, conforme [runbook](github-integration.md). Use Node24.x (Vercel configurada) ou22.21.1 (testado); `npm ci` deve incluir devDependencies. O mínimo22.12 da faixa histórica não cobre o requisito22.13 do jsdom29 usado nos testes; prefira as versões indicadas. CSS gerado é ignorado e reconstruído nos hooks predev/prebuild/pretest. Env, contratos, snapshots/Brain pessoais e capturas administrativas não acompanham o clone. Todos os deployments Git estão desligados no `vercel.json`; esta integração não publica o site.

**Estado em 01/10/2026:** recurso hospedado `jjrzmuuwuvxcsnwqzvxf` identificado e inicializado, com importação transacional confirmada em [clinic-initialization.json](../validation/clinic-initialization.json). Há 154 registros de posts, 153 artigos canônicos, 551 mídias e dois redirects. Signup público está desabilitado. Gabriel criou a conta `benchimol@benchimolclinic.com.br` e autorizou especificamente seu acesso administrativo; o vínculo ativo foi confirmado. Login, dashboard, manutenção da sessão após recarregar e logout foram observados no servidor local de Gabriel conectado à clínica, conforme [relatório de acesso](../validation/clinic-admin-login.md). Refresh de token, revogação, CRUD e upload/finalização continuam pendentes de aceite. Docker permanece sem execução por decisão de Gabriel.

## Iniciar localmente

1. Use Node `22.21.1` ou LTS compatível com `package.json`. Rode `npm ci` na pasta do projeto.
2. O site público abre sem arquivo de env: URL/key do Supabase inteiramente ausentes usam o acervo público migrado. Isso inclui páginas, blog e imagens originais estáticas; não simula login ou gravações no admin.
3. Para conectar o backend, use um arquivo privado conforme `.env.example`. `.env.prod` já tem os aliases canônicos e o ref explícito, mas **esse nome não é carregado automaticamente pelo Next.js**. O `.env.local` mínimo privado já foi preparado para o runtime, com permissão 0600; conferir o preview conectado no ledger de validação. Nunca versionar envs, tokens ou credenciais WordPress.
4. Rode `npm run dev` e abra `http://127.0.0.1:3000`. `localhost` também é aceito pelo guard local na mesma porta/protocolo, mesmo se o Next normalizar esse hostname. O admin informa o setup pendente enquanto não há Supabase da clínica configurado. No ambiente conectado atual, `benchimol@benchimolclinic.com.br` já tem conta Auth e vínculo ativo; não recriá-la. Para outra identidade aprovada, ter as envs não cria conta nem concede acesso: seguir o roteiro da clínica e exigir autorização específica antes de vincular `administrators`.
5. Execute `npm run typecheck`, `npm test`, `npm run verify:inventory` e `npm run build` em sequência. Com o dev em uso, rode Vitest direto após CSS já gerado; `npm test` regenera CSS. Não executar build concorrente ao servidor de Gabriel. `npm run start` também abre o acervo público sem envs quando não existe backend configurado.

Com Supabase configurado, o site usa o banco. Falha ou configuração parcial não libera fallback para posts antigos do snapshot. Ao exigir o backend editorial real em um ambiente, definir `ALLOW_PUBLIC_SNAPSHOT=false`; assim a ausência acidental de ambas as variáveis também falha em vez de recuperar o acervo inicial. O nome antigo `ALLOW_LOCAL_SNAPSHOT` permanece como compatibilidade quando o novo não está definido.

## Supabase da clínica

Gabriel forneceu `.env.prod` e autorizou usar o projeto exclusivo **`jjrzmuuwuvxcsnwqzvxf`**. O [preflight somente leitura](../validation/clinic-preflight.json) confirmou a API, a identidade do banco, TLS com CA e hostname verificados, zero tabelas da aplicação em `public/private`, zero buckets e zero usuários Auth naquele momento. O conector MCP desta sessão não tem acesso ao projeto; não usar seu perfil ou um projeto alternativo para contornar essa ausência. Os refs LifeWallet conhecidos continuam bloqueados pela configuração e pelos scripts.

A inicialização foi confirmada em **01/10/2026, 20:35:50.204 UTC**: migration nativa `20261001202736_benchimol_editorial_initial.sql`, seeds e importação na mesma transação. O relatório reconciliou os 154 corpos/hashes/slugs/caminhos, conferiu RLS em todas as tabelas da aplicação e o bucket `editorial-media` privado de 10 MB. Nenhum usuário Auth foi criado e nenhum e-mail foi enviado pelo agente. O diretório `supabase/` continua sendo a fonte do modelo; leia [integração da clínica](clinic-integration.md) antes de qualquer nova operação. Não repetir essa inicialização como reset de uma base ocupada.

Configurar `NEXT_PUBLIC_SUPABASE_URL`, publishable key e `SUPABASE_CLINIC_PROJECT_REF`. `SUPABASE_SECRET_KEY` (ou service-role como compatibilidade) é privada e necessária no servidor para assinatura curta de mídias e limite de login; nunca usar prefixo `NEXT_PUBLIC`. `DATABASE_URL` fica somente nos scripts confiáveis. `LOGIN_RATE_SECRET` precisa de um valor aleatório com ao menos 32 caracteres, guardado somente no servidor, para limitar login sem persistir IP/email em claro. Não registrar seu valor na documentação. Se a conexão PostgreSQL exigir CA própria, usar `SUPABASE_DB_CA_FILE` com caminho de arquivo privado; TLS remoto verifica o certificado.

Gabriel desabilitou signup público no Auth hospedado e a conferência da API retornou `disable_signup=true`; `supabase/config.toml` local não configura o projeto remoto. A aprovação inicial da conta pessoal **Gabriel Krapp, `gabriel.krapp@hotmail.com`**, permanece separada: ela não existia na leitura de `2026-10-01T23:53:54.892Z`. Posteriormente, Gabriel criou e autorizou a conta `benchimol@benchimolclinic.com.br`. Após conferir UUID, e-mail, confirmação e ausência de bloqueio/exclusão no projeto correto, foi inserido seu vínculo com `display_name='Clínica Benchimol'` e `active=true`; commit em `2026-10-02T00:27:58.137Z`, noite de 01/10 em São Paulo. O agente não criou usuário, alterou senha, enviou convite ou mudou schema/políticas. Ter uma conta Auth não concede administração por si só. As instruções de acesso pelo Marketplace e vinculação estão no [roteiro da clínica](clinic-integration.md), e a prova atual no [relatório de acesso](../validation/clinic-admin-login.md). Não reutilizar a senha WordPress nem enviar senhas por chat.

Recuperação por email continua desabilitada até SMTP próprio, entrega e redirects serem testados. Não afirmar que o SMTP padrão Free entrega emails para qualquer pessoa. URLs de Auth e preview são privadas/no-store; não expor rascunhos em links públicos.

## Arquivos de env e execução sem Docker

`.env.prod` é privado e ignorado pelo Git. É a entrada explícita dos scripts confiáveis; não deve aparecer em comandos com URLs/senhas, logs, docs ou Brain. O Next lê os nomes próprios de env da sua convenção, como `.env.local`, e não infere este `.env.prod` arbitrário.

Para o runtime local conectado, preparar `.env.local` privado com os nomes efetivamente lidos pela aplicação: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_CLINIC_PROJECT_REF`, a chave privada de servidor correspondente, `LOGIN_RATE_SECRET`, `ALLOW_PUBLIC_SNAPSHOT=false` e `AUTH_RECOVERY_ENABLED=false`. Não colocar `DATABASE_URL`, senhas do banco ou chave de gerenciamento no bundle público. A URL/ref precisam continuar apontando exclusivamente para a clínica. O arquivo mínimo foi preparado com permissão 0600 em 01/10/2026; a evidência de execução do preview conectado fica no ledger de validação.

Depois da preparação privada, `npm run dev` executa o Next diretamente no computador com o Supabase hospedado; Docker não é necessário. Não iniciar o Docker para testar ou limpar a antiga fixture. Sua conta, artigo e possível upload parcial continuam nos arquivos/volumes locais e só podem ser tratados após nova autorização expressa de Gabriel, conforme [Supabase local](supabase-local.md). Preparar o projeto hospedado não limpa esses dados locais.

## Importação

O WXR bruto em Downloads contém comentários privados e permanece fora do repo. `data/wordpress/authenticated-public.json` é uma extração allowlist: 154 posts, 38 páginas, 551 anexos públicos, templates e menus; sem comentários, páginas privadas/rascunhos, emails de autores ou snippets executáveis.

Os dados REST normalizados e o manifesto de assets estão em `data/wordpress/`. A importação por WP ID depende das decisões de URL em `route-decisions.json`; a execução hospedada inicial está confirmada no relatório acima. O novo roteiro transacional usa `scripts/migration/initialize-clinic.ts`: plano primeiro, confirmação explícita do ref na execução e recusa de base ocupada, sem reset. Repetição com a migration idêntica retorna sem alterar dados. Não substituir posts já editados nem importar o XML bruto como parte de uma limpeza. O [roteiro da clínica](clinic-integration.md) contém os comandos e os critérios de aceite restantes.

## Vercel preparada, publicação manual

Projeto com `next build`, `next start`, trailing slash e variáveis compatíveis com Next oficial. O recurso Supabase do Marketplace e sua importação não publicam o site; nenhum deploy, merge ou push foi executado nesta etapa. Merge, push que provoque hospedagem, DNS e publicação ficam com Gabriel, conforme `AGENTS.md`.

Gabriel pediu plano grátis. A restrição comercial do Vercel Hobby continua relevante para este site de clínica e precisa ser resolvida antes da publicação. A escolha de preparar o código não comprova elegibilidade do plano nem contrata Pro automaticamente. Fonte atual em `../implementation/runtime-references.md`.

Depois da publicação executada pelo usuário: verificar HTTPS/domínio, headers privados, Auth/cookies, banco/Storage, retirada editorial em Home/blog/artigo/sitemap, SEO/robots, crawlers reais e cache da CDN. Build e testes locais não comprovam esses comportamentos de produção.

O roteiro de conexão, importação e aceite está em [integração da clínica](clinic-integration.md). Os scripts Node não carregam arquivos de env automaticamente: o fluxo hospedado usa explicitamente `node --env-file=.env.prod --import tsx ...`. Nunca colar URLs com senha em argumentos ou no histórico do terminal.

## Confirmação de infraestrutura e admin — 30/09/2026

Gabriel escolheu **Next.js completo na Vercel + Supabase através do Marketplace nativo da Vercel**, reunindo PostgreSQL, Auth e Storage e centralizando criação/gestão/cobrança no fluxo da Vercel. Essa escolha permanece. O estado de 30/09 foi substituído pela autorização e pelo recurso hospedado identificados em 01/10; LifeWallet continua proibido. Não executar deploy nem conectar Git com publicação automática.

Primeiro administrador aprovado em 30/09: `gabriel.krapp@hotmail.com`, Gabriel Krapp. Nenhum usuário Auth ou senha real foi criado nem e-mail enviado pelo agente. Essa aprovação pessoal permanece separada da conta da clínica criada e autorizada posteriormente por Gabriel, cujo vínculo e login estão confirmados acima. A integração do banco não remove a restrição comercial do Hobby.

Documentação atual: [integrações nativas Vercel](https://vercel.com/docs/integrations), [Supabase Marketplace](https://supabase.com/docs/guides/integrations/vercel-marketplace). Os projetos são recursos do Supabase, com conta vinculada e gestão via Vercel; a documentação consultada identifica a integração como Public Alpha. O runtime usa os mesmos clientes/Supabase APIs.

A convenção de env foi conferida no guia da versão instalada, `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`, e está descrita no [guia oficial Next.js](https://nextjs.org/docs/app/guides/environment-variables). Context7 não estava exposto nesta sessão; foi usado o fallback de documentação oficial/local previsto em `AGENTS.md`.
