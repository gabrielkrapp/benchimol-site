# Revisão de segurança — 01/10/2026

O Supabase da clínica tem **RLS ativo nas 12 tabelas da aplicação**. A revisão não encontrou uma exposição anônima de escrita demonstrada nem um achado P0/P1 dentro do escopo examinado. Há **três ajustes P2 e dois P3** documentados abaixo. Isso não é uma certificação de inviolabilidade.

O usuário confirmou que a aplicação Next.js ainda não tem deploy. A auditoria examinou código, dependências e catálogos do projeto exclusivo `jjrzmuuwuvxcsnwqzvxf`; não alterou banco, Auth, usuários, arquivos de produção, Docker ou servidor. Datas UTC das capturas estão nos JSONs; esta rodada ocorreu na noite de 01/10 em `America/Sao_Paulo`.

## Evidência e método

- [Catálogo efetivo](security-catalog.json): conexão PostgreSQL com `assertClinicTarget` e `pgConnectionConfig`, destino explícito, CA/hostname TLS verificados, sessão `BEGIN READ ONLY`, somente consultas de metadados e configuração de bucket. Nenhuma linha de usuário/Auth foi lida. [Script de captura](security-readonly.mjs).
- `GET /auth/v1/settings` com chave publicável: cadastro público desativado e provider email habilitado. Nenhuma senha/token foi registrado ou usado para tentar login nesta rodada.
- **97 testes / 9 arquivos passaram**, exit 0, 28,14 s: grants/RLS em PGlite, admin revogado, concorrência, referências privadas de Storage, limites compartilhados de login, sanitização, origens e conexão TLS/binding. Execução de 01/10 às 23:55:07 BRT, detalhada em [security.json](security.json). A [saída original capturada](security-tests.log) concatena os dois chunks retornados pelas ferramentas, sem reexecução ou linhas individuais reconstruídas; SHA256/proveniência estão no JSON. O PGlite não herda automaticamente os grants padrão da plataforma; essa diferença está no SEC-01.
- [npm audit de produção](security-npm-audit.json): **zero advisories conhecidos**, exit 0, sem instalação/upgrade. Isso não cobre falhas inéditas nem configurações de cloud.
- [Scan de fronteira de segredos](security-secret-boundaries.json): 305 arquivos textuais públicos/`.next/static` existentes; nenhum dos nove valores privados selecionados do ambiente apareceu. Nenhuma variável com nome de segredo/chave privilegiada/senha/URL de banco tem prefixo `NEXT_PUBLIC_`. `.env.prod` e `.env.local` estão com modo `0600` e ignorados. Não foi feito build novo; não extrapolar o scan para assets futuros.
- [Checks HTTP iniciais](security-http.json): o servidor local `127.0.0.1:3000` estava indisponível (`ECONNREFUSED`). As onze verificações preparadas foram classificadas **não executadas**, sem iniciar servidor. A captura histórica foi preservada. Após o usuário iniciar o servidor, o [suplemento HTTP atual](security-http-live.json) passou **16/16 checks de status/negação** em 02/10 às 00:12:52 BRT: público/login 200, admin/prévia privados redirecionam ao login, cinco APIs privadas recusam com 401, mídia QA já excluída/arquivos internos retornam 404, origem ausente/externa retorna 403 e JSON inválido same-origin retorna 422. Nenhuma credencial/cookie/tentativa real de login foi usada; os três POST inválidos param antes do limitador/Auth. SHA256 e limites estão em `security.json`.

Context7 não estava exposto no inventário desta sessão. Foram consultados os guias instalados do Next 16.3.8 e documentação oficial atual. O índice [changelog Supabase](https://supabase.com/changelog.md) foi consultado; o PostgreSQL da clínica é **17.11**, versão mencionada na atualização de segurança de [25/09/2026](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes). Não há `ltree`/`btree_gist` nas extensões listadas nem operadores próprios em `public/private`; o código da aplicação não usa PGP de cifras legadas. Nenhuma atualização/reindex foi executada.

## Tabelas e políticas

| Tabela | RLS efetivo | Acesso previsto pela política |
|---|---|---|
| `public.administrators` | Ativo | Usuário autenticado lê somente seu próprio vínculo; não há política de escrita de cliente |
| `public.posts` | Ativo | Público lê somente publicado, caminho público e data já alcançada; edição exige admin ativo |
| `public.post_revisions` | Ativo | Somente admin ativo lê; escrita por trigger protegido |
| `public.redirects` | Ativo | Público vê somente destino ligado a post publicado; alteração exige admin ativo |
| `public.media` | Ativo | Catálogo/alterações somente admin ativo |
| `public.media_uploads` | Ativo | Admin ativo e `user_id=auth.uid()` para a intenção própria |
| `public.settings` | Ativo | Leitura pública de aviso/contato; atualização exige admin ativo |
| `public.settings_revisions` | Ativo | Somente admin ativo lê; escrita por trigger protegido |
| `public.taxonomies` | Ativo | Leitura pública; nenhuma política de escrita de cliente |
| `public.reserved_routes` | Ativo | Leitura pública; nenhuma política de escrita de cliente |
| `public.operation_events` | Ativo | Somente admin ativo lê; nenhuma política de escrita de cliente |
| `private.login_windows` | Ativo | Sem grants para `anon/authenticated`; função restrita ao servidor/service role |

`anon/authenticated` não são superusers nem têm `BYPASSRLS`. O proprietário `postgres` e `service_role` têm bypass: a chave privilegiada permanece em `privileged.ts` com `import 'server-only'`, cliente não exportado e operações estreitas de assinatura/limite. Nenhuma das 19 funções da aplicação tem `search_path` mutável. Funções públicas de edição são `SECURITY INVOKER` e conferem admin; os definers necessários ficam em `private`, com EXECUTE restrito e predicados próprios. Não há views `public/private` que possam contornar RLS.

Há onze tabelas internas geridas pelo Supabase em `auth` sem RLS; todas estão sem SELECT/INSERT/UPDATE/DELETE para `anon/authenticated`. Isso não é uma tabela pública desprotegida da aplicação e não autoriza alterar schemas do provedor. O catálogo não confirmou os schemas expostos no painel Data API: consulta de configuração de role não retornou `pgrst.db_schemas`. Manter `private` fora da lista exposta e conferir essa configuração no painel.

## Achados

| ID / prioridade | Evidência, impacto e próximo ajuste |
|---|---|
| **SEC-01 / P2** — grants excessivos herdados | As onze tabelas `public` têm CRUD integral para `anon/authenticated`, apesar dos grants estreitos escritos no schema. RLS ainda bloqueia operações/linhas indevidas; não foi demonstrado bypass. Retirar grants herdados e default privileges numa migração separada, conceder somente operações/colunas necessárias e repetir testes no modelo de grants reais. Não basta acrescentar grants de coluna. |
| **SEC-02 / P2** — alcance da proteção de login | O limite da app é 8 tentativas/email e 24/IP por 15 minutos, HMAC sem email/IP puro no banco, atômico e fail closed. Ele cobre `/api/auth/login`; o endpoint direto Supabase Auth permanece público e tem limites próprios. Conferir limites reais, proteção de senha vazada/CAPTCHA e considerar MFA admin com AAL2; o login precisa enviar o desafio antes de ativar CAPTCHA. Não se tentou força bruta. |
| **SEC-03 / P2** — cabeçalhos incompletos | Config só define `nosniff` para API, cache privado e noindex. Faltam CSP/anti-frame, Referrer-Policy e política de permissões explícitas; a captura HTTP atual confirma a ausência em Home/login locais. Preparar anti-frame para admin e demais headers compatíveis; começar CSP em Report-Only com inventário de scripts/estilos Next/Elementor/mapas/embeds para preservar o layout. Headers da Vercel continuam pendentes. |
| **SEC-04 / P3** — imagem validada por assinatura | PNG/JPEG/GIF/WebP são conferidos por assinatura inicial e tamanho, sem decode integral/dimensões. Pode aceitar arquivo truncado/poliglota como cadastro, sem execução de código demonstrada. Melhoria separada: validar estrutura/pixels com decoder e limite de memória antes da exposição pública, mantendo legados intactos. |
| **SEC-05 / P3** — upload abandonado | Expiração em duas horas impede finalizar intenção antiga; não há rotina de expurgo demonstrada para abandono antes/depois do PUT. Pode acumular objetos/intentos privados e consumir quota gratuita; exige admin autorizado. Documentar revisão/limpeza segura com guarda de referências; automatização depende de autorização futura. |

Nenhum desses ajustes foi aplicado por esta auditoria. Dados de pacientes não fazem parte da aplicação nem foram consultados.

## Controles já presentes

`requireAdmin` usa `auth.getUser()` remoto e consulta vínculo ativo em cada operação privada; autorização não se apoia apenas em UI, cookie ou `user_metadata`. RPCs são parametrizadas, sem SQL montado com texto de usuário. Todas as mutações HTTP usam `assertOrigin`; origens ausentes, externas, `cross-site`, portas diferentes e spoof por Host/forwarded-host estão cobertos nos testes. Cookies são configurados HttpOnly/SameSite=Lax, Secure em produção, e resposta privada usa no-store/noindex. Os flags efetivamente enviados pela hospedagem ainda precisam de validação após publicação pelo usuário.

HTML de posts/WordPress é sanitizado ao gravar e ao renderizar; scripts, handlers, forms e embeds arbitrários são removidos. Texto literal de aviso/contato é escapado no consumidor; JSON-LD escapa `<`. Há allowlist de embed HTTPS. O backend não busca URL arbitrária de imagem fornecida pelo editor: uploads passam pelo bucket fixo e assinatura valida caminho gerido, reduzindo superfície SSRF.

O bucket `editorial-media` é privado, máximo 10 MB, quatro MIME raster e sem policy UPDATE/upsert. Upload exige admin e pasta própria. Remoção de referência em post/histórico é barrada por banco e Storage. Download público só é assinado por 60 s se `get_public_media` confirmar referência em post publicado, caminho público e data já alcançada; anônimo não lista catálogo/bucket. **Liberar crawl em `/api/media/` no robots não muda essa autorização** e pode ser feito na revisão SEO mantendo API/Auth privados.

`x-vercel-forwarded-for` só é usado quando `VERCEL` está presente, conforme [documentação de request headers da Vercel](https://vercel.com/docs/headers/request-headers); fora dela todos compartilham um bucket conservador `local`. Sem deploy, a sanitização efetiva de IP e regras WAF/DDoS não foram verificadas.

## Limites e aceite posterior

Não foram realizadas tentativas massivas, scanners intrusivos, cargas, criação de fixtures/usuários ou alterações de senha/MFA. A evidência de RLS remoto é catálogo/policies/grants, complementada por testes SQL embutidos; não se repetiram probes de escrita no banco real. Conta/organização Vercel, configurações WAF/bot, limites específicos Auth, backup/recuperação, MFA individual, SMTP, headers TLS/CDN e cookies publicados dependem de acesso/URL futura. O endpoint público settings não comprova CAPTCHA nem proteção contra senha vazada.

O suplemento HTTP é **desenvolvimento local**, sem sessão autenticada e sem inspeção de cookies. APIs privadas responderam `private, no-store`, `noindex, nofollow` e `nosniff`; Home/login apresentaram `no-cache, must-revalidate` do Next dev. Não usar esses headers/timings de compilação local como prova de cache privado, performance, Secure cookie ou TLS da futura produção. Nenhum servidor foi iniciado, reiniciado ou parado pelo agente.

Logout limpa sessão do navegador, mas não se promete invalidar imediatamente todo JWT já emitido: tokens podem sobreviver até expiração; uma garantia mais estrita precisa checar `session_id` ou política adicional. Desativação do vínculo admin é consultada novamente no servidor/RLS e está coberta pelo teste embutido, sem alterar o usuário real.

As recomendações seguem o [modelo de segurança de produtos](https://supabase.com/docs/guides/security/product-security), [grants + RLS](https://supabase.com/docs/guides/api/securing-your-api), [verificação SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs), [limites Auth](https://supabase.com/docs/guides/auth/rate-limits), [CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha), [sessões](https://supabase.com/docs/guides/auth/sessions) e [CSP Next](https://nextjs.org/docs/app/guides/content-security-policy). Proteção da plataforma não substitui autorização da aplicação.
