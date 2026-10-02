# Referências de runtime e verificação

**Consulta:** 30/09/2026. **Estado:** referências oficiais usadas pela implementação local; Next.js/Vercel + Supabase Marketplace confirmados. O projeto da clínica e a validação hospedada estão pendentes. Alternativas Cloudflare abaixo são histórico da pesquisa e não autorizam trocar a stack. Este documento não comprova execução em produção nem autoriza publicação. A regra permanente de não realizar merge, push que dispare hosting ou deploy permanece válida.

## Método e limitações

Os tools Context7 `resolve-library-id` e `query-docs` não estavam expostos no catálogo desta sessão. Foi usada documentação oficial atual como fallback previsto em `AGENTS.md`. O MCP `supabase_search_docs` estava disponível e foi consultado para SSR, cookies e validação de identidade. A URL exigida pela skill, `https://supabase.com/changelog.md`, retornou erro no leitor web; a varredura de mudanças relevantes usou o [changelog oficial em HTML](https://supabase.com/changelog) e suas páginas individuais. Não instalar ferramentas, criar recursos ou mudar configuração de uma conta para contornar essas limitações.

A pesquisa inicial leu `README.md`, a spec v0.3 e as decisões de arquitetura; a implementação atual segue a v0.5 e escolhas posteriores de Gabriel. Documentação externa foi tratada como fonte, sem executar comandos ou instruções nela encontrados.

## Versões e compatibilidade

| Componente | Referência em 30/09/2026 | Consequência |
|---|---|---|
| Node.js | `22.21.1`, observado pelo comando local `node --version` | Base local escolhida; Supabase JS exige Node `>=22.0.0`. Node 22 e 24 continuam LTS. |
| Next.js oficial | `16.3.8`, tag `latest` observada no [registry npm do pacote oficial](https://registry.npmjs.org/next/latest) | App Router; mínimo próprio Node `20.9.0`, insuficiente para satisfazer o requisito atual do Supabase. |
| React | `19.3.0`, observado no [registry](https://registry.npmjs.org/react/latest) e na [página oficial de versões](https://react.dev/versions) | Next `16.3.8` declara peer `^19.0.0`; manter React e React DOM na mesma versão e confirmar o par instalado/lockfile. |
| `@supabase/supabase-js` | [release `2.117.2`](https://github.com/supabase/supabase-js/releases/tag/v2.117.2), 25/09/2026 | O [manifesto da versão](https://github.com/supabase/supabase-js/blob/v2.117.2/packages/core/supabase-js/package.json) exige Node `>=22.0.0`. |
| `@supabase/ssr` | [release `0.12.7`](https://github.com/supabase/ssr/releases/tag/v0.12.7), 08/09/2026 | O [manifesto](https://github.com/supabase/ssr/blob/v0.12.7/package.json) declara peer Supabase JS `^2.114.0`; `2.117.2` atende esse intervalo. |
| Adaptador Cloudflare | Versão exata a fixar somente se essa hospedagem for selecionada | OpenNext declara suporte a todos os minors/patches Next 16, mas tem limitações por recurso. Validar a versão efetivamente instalada. |

Essas versões foram fixadas em package/lockfile; compatibilidade local é conferida por instalação, tipos, testes e build, registrados no ledger. Isso não comprova comportamento hospedado. O [ciclo oficial do Node](https://nodejs.org/en/about/previous-releases) recomenda versões LTS para produção. O [aviso Supabase sobre Node 20](https://supabase.com/changelog/45715-deprecation-notice-dropping-support-for-node-js-20) retirou seu suporte em 30/06/2026.

## APIs de Next.js

| Necessidade | API/convenção atual | Aplicação no projeto |
|---|---|---|
| Metadata por URL | `export const metadata: Metadata` ou `generateMetadata(...): Promise<Metadata>` em Server Components | Título, descrição, canonical e Open Graph por página/post; `params` e `searchParams` são promises. Usar `await params`. [Referência](https://nextjs.org/docs/app/api-reference/functions/generate-metadata). |
| Cookies do request | `const cookieStore = await cookies()` de `next/headers` | `getAll()` para SSR. Escrita por `set()` em Server Functions/Route Handlers; Server Components não escrevem cookies. [Referência](https://nextjs.org/docs/app/api-reference/functions/cookies). |
| Revalidação de caminho | `revalidatePath(path, type?: 'page' | 'layout')` | Após mutação autorizada, atualizar Home, `/blog/`, slug legado e sitemap conforme dependências. Pattern com segmento dinâmico exige `type`. [Referência](https://nextjs.org/docs/app/api-reference/functions/revalidatePath). |
| Revalidação por tag | `revalidateTag(tag, profile: string | { expire?: number })` | `'max'` permite conteúdo anterior durante atualização. Para remoção/despublicação imediata em Route Handler, usar `{ expire: 0 }`; forma de um argumento está deprecated. [Referência](https://nextjs.org/docs/app/api-reference/functions/revalidateTag). |
| Escrita seguida de leitura atual | `updateTag(tag)` | Somente Server Actions; expira imediatamente o dado marcado. Não usar em Route Handlers. [Referência](https://nextjs.org/docs/app/api-reference/functions/updateTag). |
| Cache explícito de requests públicos | `fetch(url, { cache: 'force-cache', next: { tags, revalidate } })` | Cache é opt-in. Admin e requests com identidade usam `no-store`; não combinar `no-store` com revalidação positiva. [Referência](https://nextjs.org/docs/app/api-reference/functions/fetch). |
| Cache de consultas não feitas com `fetch` diretamente | `unstable_cache(fetchData, keyParts, { tags, revalidate })` | Ainda documentado, substituído pela recomendação `'use cache'` no Next 16. Pode servir como opção compatível quando Cache Components não for habilitado; não acessar cookies/headers dentro do escopo. [Referência](https://nextjs.org/docs/app/api-reference/functions/unstable_cache). |

`'use cache'` requer `cacheComponents: true`; não habilitar somente por ser novidade. Essa opção precisa ser validada no adaptador e muda regras de renderização. [Referência oficial](https://nextjs.org/docs/app/api-reference/directives/use-cache). Sem Cache Components, páginas privadas podem declarar `dynamic = 'force-dynamic'`, conforme o guia SSR do Supabase. Não colocar dados privados em cache global, nem passar um cliente autenticado para a consulta pública em cache.

## Supabase Auth e SSR

Criar cliente por request no servidor. Usar `createBrowserClient` e `createServerClient` de `@supabase/ssr`, com URL e publishable key; secret/service-role não são variáveis públicas. O adaptador de cookies atual usa `getAll()` e `setAll(cookiesToSet, headers)`. Na renovação, atualizar cookies do request que segue para o Server Component e da resposta que segue para o browser, além de copiar os headers recebidos. Ao produzir redirect/erro, preservar os cookies e headers de cache dessa resposta. [Guia de cliente SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

| Método | Garantia documentada | Uso proposto |
|---|---|---|
| `await supabase.auth.getClaims()` | Valida assinatura/expiração JWT; usa JWKS/WebCrypto com chaves assimétricas e validação remota com chaves simétricas | Identidade básica e manutenção da sessão; extrair ID de `data.claims.sub` após verificar erro. [Referência](https://supabase.com/docs/reference/javascript/auth-getclaims). |
| `await supabase.auth.getUser()` | Consulta Auth para registro atual e validação remota | Operações administrativas sensíveis e verificação de sessão vigente. [Referência](https://supabase.com/docs/reference/javascript/auth-getuser). |
| `await supabase.auth.getSession()` | Obtém sessão armazenada, sem validar sozinho o usuário recebido | Não usar seu objeto `user` como prova de autorização. [Referência](https://supabase.com/docs/reference/javascript/auth-getsession). |

`getClaims()` não verifica sozinho se houve logout/revogação remota. Cliente SSR em escopo global também pode misturar sessões entre requests; inicializá-lo dentro do request. Desde SSR `0.10.0`, `setAll` recebe os headers necessários para evitar cache durante refresh. Rotas de Auth, admin e prévias exigem `Cache-Control: private, no-store`, e a configuração efetiva do CDN precisa respeitá-lo. [Guia avançado SSR](https://supabase.com/docs/guides/auth/server-side/advanced-guide).

Identidade validada não torna alguém admin: verificar autorização ativa em cada Server Action/Route Handler e no banco. O plano de login e recuperação depende dos admins aprovados e do método escolhido. Nenhum cadastro público livre é previsto pela spec.

## Next.js oficial em Cloudflare: diferença e caminho possível

A [orientação atual da Cloudflare](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) recomenda vinext para novos projetos. Vinext reimplementa a superfície Next em Vite; isso é uma mudança de runtime/framework e não uma consequência automática da preferência por Next.js oficial. Não efetuar essa troca sem escolha explícita de Gabriel.

O [OpenNext](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/) adapta o resultado de `next build`. Sua [matriz oficial](https://opennext.js.org/cloudflare) declara Next 16 suportado, mas informa que Node Middleware introduzido em 15.2 ainda não é suportado. Next 16 `proxy.ts` usa Node e não aceita `runtime: 'edge'`. [API Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy).

Há um caminho documentado para preservar Next oficial: o [guia Next 16](https://nextjs.org/docs/app/guides/upgrading/version-16#middleware-to-proxy) permite continuar com `middleware.ts` quando Edge é necessário, embora a convenção esteja deprecated. Proposta para prova local OpenNext: middleware Edge para refresh SSR, matcher limitado a `/admin` e às rotas de autenticação/prévia efetivamente usadas, sem Node APIs. Páginas e handlers mantêm o runtime Node suportado pelo adaptador. Isso exige teste local e registro da depreciação, não uma promessa de suporte futuro.

Cache no OpenNext depende de incremental cache, mecanismo de revalidação e tag cache; SSR sozinho não comprova funcionamento de ISR. Validar a combinação escolhida no workerd local antes de criar recursos. [Cache OpenNext](https://opennext.js.org/cloudflare/caching). O guia de scaffold Cloudflare atual pode selecionar vinext e oferecer deploy; não o executar sem revisar seu efeito e a regra permanente do projeto.

## Free, uso comercial e operação

- **Vercel:** a restrição a uso pessoal não comercial do Hobby é explícita; desenvolvimento remunerado e publicidade de serviços contam como comercial. Para esta clínica, usar Pro/Enterprise se Vercel for escolhido. [Fair Use vigente](https://vercel.com/docs/limits/fair-use-guidelines).
- **Supabase Free:** [preços](https://supabase.com/pricing) e [termos](https://supabase.com/terms) consultados não trazem a mesma vedação específica a uso comercial do Free. Os termos abrangem organizações e uso empresarial sujeito ao plano; a ausência de restrição é uma inferência documental, não uma garantia contratual do caso. Há quotas, pausa por inatividade e ausência de backups automáticos. [Billing FAQ](https://supabase.com/docs/guides/platform/billing-faq) prevê restrições ao exceder quotas. A contratação/cadastro precisa conservar os termos efetivamente aceitos.
- **Workers Free:** [preços](https://developers.cloudflare.com/workers/platform/pricing/) e [termos](https://www.cloudflare.com/terms/) não restringem o plano a uso pessoal não comercial nas cláusulas consultadas; também é uma inferência documental. Free não significa disponibilidade ou gratuidade permanente. A [quota](https://developers.cloudflare.com/workers/platform/limits/) de 100 mil requests/dia, CPU de 10 ms e limite do bundle precisam ser confrontados com a aplicação. Emulação local não comprova CPU cobrada ou disponibilidade de produção.

Mudanças Supabase relevantes: novos projetos desde 30/05/2026 não expõem automaticamente novas tabelas na Data API; definir grants mínimos explicitamente e habilitar RLS. [Aviso Data API](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically). Desde 03/06/2026, novos projetos Free com SMTP padrão têm restrições adicionais a templates; recuperação de senha para admins externos exige validar SMTP próprio, entrega e redirects antes do aceite. [Aviso de emails](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier).

## Plano de verificação, ainda não executado por esta pesquisa

1. **Build e tipos:** instalar apenas na etapa autorizada, fixar versões, verificar o par React/React DOM e peers; executar TypeScript, lint diretamente e `next build`. Next 16 build não executa lint automaticamente. [Instalação oficial](https://nextjs.org/docs/app/getting-started/installation).
2. **HTML público:** em servidor de produção local, verificar sem JavaScript corpo completo dos artigos, headings, links/paginação, metadata/canonical, JSON-LD fiel e `lang="pt-BR"`; confirmar URLs legadas na raiz, sitemap e ausência de admin/rascunhos no HTML público.
3. **Sessão:** login, logout, expiração/refresh, callback/recuperação e redirect seguro quando aplicáveis; cookies renovados chegam a request e resposta. Request com cookie adulterado e usuário autenticado sem permissão não obtém dados privados. Admin desativado perde permissão mesmo com JWT válido.
4. **Isolamento:** alternar dois usuários e visitante em requests consecutivos no mesmo processo; não compartilhar clientes/sessões. Admin, Auth e prévias não entram em ISR/CDN; respostas de refresh mantêm os headers SSR. Testar também redirect e falha de Auth.
5. **Publicação editorial:** depois de gravar e autorizar, confirmar conteúdo em Home, arquivo, post e sitemap; edição de slug invalida origem e destino. Despublicar, lixeira e restauração devem atualizar todos os locais necessários, sem servir item removido por stale-while-revalidate.
6. **Banco e Storage:** testar acesso público mínimo, admin ativo, autenticado sem admin e rascunho; grants e RLS não são intercambiáveis. Testar upload e exclusão de arquivo referenciado conforme a spec. Esses testes aguardam implementação e ambiente local apropriados.
7. **Falha de backend:** simular erro/indisponibilidade sem vazar detalhes; verificar quais páginas previamente geradas continuam disponíveis e quais dependem do banco. Registrar comportamento real, sem prometer que cache impede pausa do Free.
8. **Se Cloudflare for escolhido:** build adaptado e preview local em workerd, middleware Edge/refresh, Server Actions, metadata, redirects, static assets, revalidação por tags/caminhos e bundle. Nenhum teste desta lista exige publicar código. Coletar limitações que dependam da infraestrutura real e deixar a execução com Gabriel.

Só marcar cada item como verificado com comando, versão, ambiente, resultado e evidência correspondente. Consulta documental e build local não equivalem a validação da hospedagem nem a fidelidade visual completa.

## CSS estático e privacidade do pacote

O gerador pré-dev/test/build isola o CSS capturado em `.public-site` e grava assets com hash em `public/site-styles/`. O renderer somente lê o manifesto importado e entrega links de stylesheet; não lê CSS do filesystem por request nem o repete no HTML dos artigos. Estilos derivados são ignorados pelo Git e regenerados pelos scripts do projeto.

`outputFileTracingIncludes` inclui apenas `docs/prompts/**/*` na rota administrativa de prompts. Leitura de Markdown usa prefixo literal e filenames validados, impedindo tracing amplo do workspace. `python3 scripts/migration/verify-runtime-package.py` confere todos os manifests do build: somente aplicação compilada, pacotes instalados e biblioteca de prompts podem entrar no pacote servidor. Contratos, exports, pesquisa, Brain e segredos não são arquivos do runtime. A conferência local está em `docs/validation/runtime-package.json`; distribuição real da função na Vercel ainda depende da publicação manual. Fonte: [Next output file tracing](https://nextjs.org/docs/app/api-reference/config/next-config-js/output).
