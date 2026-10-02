# Correções de segurança de 02/10/2026

Correções autorizadas por Gabriel após a auditoria. O [relatório original](../audit-2026-10-01/security.md) permanece como evidência anterior. Nenhum Docker, servidor, build, merge ou deploy foi iniciado/reiniciado pelo agente desta frente. Não foram realizadas tentativas reais de login, força bruta ou alteração de usuários.

## SEC-01: privilégios explícitos

`supabase/schemas/05_least_privilege.sql` redefine os grants das onze tabelas públicas e do limitador privado. O arquivo de migração `20261002032930_benchimol_least_privilege.sql`, criado pelo CLI `supabase migration new` 2.95.0, é cópia exata. A alteração é idempotente, não altera linhas, policies, autores, conteúdo, versões, timestamps ou schemas geridos `auth/storage`.

- Anônimo: SELECT em posts, redirects, taxonomias, configurações e rotas reservadas, mantendo os predicados RLS.
- Autenticado: SELECT necessário, com RLS; edição somente nas colunas usadas pelos RPCs e biblioteca de mídias. Não pode alterar vínculo admin, histórico, eventos, fontes WP, identificadores de posts ou apagar permanentemente posts.
- Media: INSERT dos campos geridos; UPDATE somente de alt/caption; DELETE continua protegido contra referências em posts e revisões.
- Intenções: INSERT e DELETE próprios com RLS; sem UPDATE/alteração de vencimento pelo cliente.
- Service role: sem privilégios em tabelas da aplicação; mantém somente RPC do limitador e acesso gerido pelo Storage, sem alterar permissões do provedor.
- TRUNCATE, REFERENCES, TRIGGER e outros grants integrais saem dos papéis de cliente. TRUNCATE não é protegido por RLS; o teste verifica privilégio e **não executa TRUNCATE**, nem local nem remoto.

Objetos futuros criados pelo proprietário `postgres` exigem grants explícitos: tabelas/sequências/funções em `public/private`. Para remover o EXECUTE implícito de `PUBLIC` em funções, o default de `postgres` precisa de REVOKE global: um REVOKE apenas por schema não remove o default global do PostgreSQL. Portanto, **novas funções criadas por postgres deixam de herdar EXECUTE de PUBLIC em qualquer schema**. Grants/defaults explícitos por schema fora de public/private, como os existentes do Storage, continuam válidos; funções novas da aplicação precisam conceder EXECUTE aos papéis necessários. Os proprietários geridos `supabase_auth_admin/supabase_storage_admin` e funções existentes do provedor permanecem intactos. Esse efeito deve ser considerado em futuras migrações.

Os testes PGlite modelam grants herdados do provedor **antes** da correção, incluindo um cenário conservador de `GRANT ALL`, e aplicam a migração duas vezes. Validam anon, não administrador, administrador e service role; todos os fluxos editoriais exercitados continuam autorizados. A existência de TRUNCATE no modelo conservador não comprova esse privilégio no banco real; confirmar o catálogo remoto. A aplicação remota cabe ao root após preflight do destino exclusivo, TLS, hash e revisão; esta frente não executou SQL remoto.

## SEC-03: cabeçalhos

`next.config.ts` adiciona `nosniff`, `strict-origin-when-cross-origin` e Permissions-Policy a todas as respostas. Admin recebe `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `base-uri 'self'`, `object-src 'none'` e `no-referrer`, além do no-store/noindex existente. O público pode continuar usando os iframes de mapas e vídeos.

A política ampla inicia em **CSP Report-Only**, preservando scripts/estilos inline Next/Elementor, imagens, fontes, vídeos, mapas, iframes permitidos e conexão ao Supabase exclusivo. Não é proteção de bloqueio contra scripts nessa etapa; violações ficam no console do navegador. Não há endpoint coletor novo. Endereços dev de HMR e Supabase local entram apenas fora de produção, sem iniciar a stack. O allowlist de produção inclui somente o projeto Supabase público já confirmado `jjrzmuuwuvxcsnwqzvxf`.

O teste carrega a configuração e verifica as políticas. O dev de Gabriel recarregou a configuração automaticamente pelo próprio Next e o executor principal confirmou headers HTTP novos, conforme evidências do consolidado. **Se o dev não recarregar a configuração automaticamente, Gabriel faz o reinício manual**; nenhum agente comandou restart de processo. O comportamento da futura Vercel, HTTPS, cookies e CSP de bloqueio completa ainda precisa ser validado após publicação pelo usuário. HSTS/preload de subdomínios não foi inventado sem domínio/CDN confirmado.

## SEC-04: validação integral dos novos uploads

Os dois caminhos, multipart e envio direto/finalização, passam por `validateManagedImage`. `sharp` 0.35.5, já instalado pelo Next, é declarado como dependência de produção direta e fixa. A validação mantém assinatura/MIME/10 MB, verifica limites do container, identifica formato/dimensões e **decodifica todos os pixels e quadros** com `failOn: warning`. Metadata sozinha não faz esse decode.

Limites de uploads novos: 8192 pixels por lado, 20 milhões de pixels somando os quadros, no máximo 100 quadros e timeout de processamento de 10 segundos. Saída raw com quatro canais é descartada por um consumidor com limite de 80 MB. O sharp ainda pode montar esse buffer internamente e ter alocações adicionais; o limite de pixels evita expansão ilimitada, sem prometer memória total constante. Arquivos excessivos, truncados, dados corrompidos ou MIME incompatível retornam 422. PNG/WebP/GIF/JPEG com lixo após o fim do container são recusados. Isso não é uma promessa de detectar todo conteúdo arbitrário escondido em metadata de um formato válido.

Bytes enviados permanecem exatamente os originais; não há reencode, conversão ou varredura de mídias legadas. Dimensões verificadas entram no registro para o admin; orientações EXIF 5–8 trocam largura/altura persistidas para corresponder à exibição do navegador, preservando o raster/EXIF original. Upload direto inválido continua privado e segue a limpeza existente de intenção/objeto; nada é exposto antes do decode. GIF animado válido permanece animado. Timeout de sharp protege o processamento, sem prometer prazo absoluto de fila do provedor.

Testes cobrem quatro formatos, GIF animado, frames excessivos, tamanho/dimensões, pixel bomb sintético, truncamento, lixo no fim, corrupção de pixels, assinatura isolada e persistência literal de alt/caption. O teste de GIF inicialmente gerou 52 quadros por quantização; a fixture foi corrigida para RGB alternado, sem mudar o algoritmo. Logs dessa tentativa e da rodada verde permanecem separados.

## SEC-02: controles dependentes do provedor

O limitador existente continua atômico e fail closed: 8 tentativas por email e 24 por origem/IP confiável em 15 minutos, com HMAC. Ele cobre somente `/api/auth/login`; Supabase Auth tem endpoint público próprio. Não é correto apresentar o limitador da aplicação como cobertura de todo endpoint do provedor.

Antes de mudar Authentication no projeto da clínica:

1. Confirmar o projeto `jjrzmuuwuvxcsnwqzvxf` e revisar limites Auth, proteção de senhas vazadas e sessões/JWT no painel; registrar somente os valores não secretos e efeitos.
2. Se usar CAPTCHA, escolher Turnstile ou hCaptcha, provisionar a configuração pelo usuário, integrar o desafio no formulário e enviar `options.captchaToken` no `signInWithPassword`. Testar sucesso, erro/expiração e acessibilidade **antes de ativar a exigência no provedor**. Nenhum CAPTCHA incompleto foi ativado ou adicionado ao fluxo atual.
3. Se usar MFA, implementar enrollment, challenge, verify e recuperação no admin, exigir AAL2 na autorização/RLS e testar a continuidade de acesso antes de exigir MFA do usuário real. Apenas cadastrar TOTP no provedor sem suporte da app poderia impedir login.
4. Testar manualmente as configurações completas em janela acordada; não executar tentativas massivas ou usar dados/senhas da conversa como fixture.

As configurações sensíveis do Auth não estão confirmadas pelo endpoint público settings nem pelo catálogo SQL. A implementação não afirma MFA/CAPTCHA/proteção de senha vazada ativos. Cadastro público segue desativado por Gabriel. Conta/usuário atual não foram modificados.

## SEC-05: expurgo de envios abandonados

`scripts/migration/cleanup-expired-uploads.ts` é o comando manual com plano por padrão e opt-in de execução/hash do plano. Sem scheduler, endpoint novo ou limpeza automática. Seleciona apenas intenções de mais de quatro horas (duas horas de margem além da validade do envio), paths/UUID/MIME/tamanho válidos e sem registro de mídia por ID, path ou URL gerida equivalente, nem referência em qualquer campo de post/histórico. Preserva registros sem uso atual e legados.

Na execução, locks de posts, post_revisions, media e media_uploads congelam as fontes de referência antes da segunda leitura/aprovação; timeout de lock ou plano diferente aborta antes do Storage. Lote acima de 25 requer revisão manual separada. Objetos ausentes dispensam a chamada Storage. O destino é fixo da clínica e a conexão PostgreSQL exige TLS verificado. Plano privado não exige chave privilegiada; execução do Storage exige a chave apenas no servidor. O CLI imprime contagens/hash/local do manifesto, sem IDs/chaves.

SQL e Storage não são atômicos: bytes apagados pelo Storage não retornam por rollback SQL. Falha parcial conserva intenções para diagnosticar/refazer o plano; não há promessa de rollback físico. Nenhum expurgo remoto foi realizado por esta frente; o relatório consolidado registra a validação readonly do plano pelo root.

## Evidência e fontes

`security-focused-tests.log`: 23/24 na primeira rodada, falha somente na fixture de quantidade de frames. `security-image-tests.log`: 13/13 após corrigir a fixture. `security-review-tests.log`: **29/29** em 02/10 às 01:02 BRT, cobrindo decoder 20 (incluindo EXIF) e comando de expurgo 9. Testes adicionais de finalização e a rodada integrada final são registrados pelo root no consolidado. Esses testes são embutidos/local; não equivalem a probes autenticados de escrita no banco real nem a headers efetivos de produção.

`scripts/migration/verify-audit-corrections.ts` prepara a aceitação hospedada após a migração: API anônima com 153 artigos/SEO reconciliados, catálogo negado, signup desativado, identidade/TLS PostgreSQL e bucket privado. O padrão é somente leitura; `--transactional-probes` habilita fixtures SQL de draft/edição/lixeira/restauração, contato/aviso com o mesmo valor, mídia apenas como metadata, intenções e limitador sintético. Todas as fixtures ficam dentro de savepoint/rollback, sem publicação, Storage bytes, login ou contas novas. A identidade do admin ativo é usada somente em memória. Contagens/hashes das 12 relações precisam ser idênticos após a restauração antes do rollback final. A execução e evidência remota são responsabilidade do executor principal; esta frente não rodou esse script hospedado.

Context7 não estava exposto. Foram lidos guias instalados do Next 16.3.8 para headers/CSP e consultados [segurança Data API](https://supabase.com/docs/guides/api/securing-your-api), [changelog Supabase](https://supabase.com/changelog.md), [REVOKE PostgreSQL](https://www.postgresql.org/docs/17/sql-revoke.html), [limites Auth](https://supabase.com/docs/guides/auth/rate-limits), [CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha), [construtor sharp](https://sharp.pixelplumbing.com/api-constructor/), [metadata sharp](https://sharp.pixelplumbing.com/api-input/) e [timeout sharp](https://sharp.pixelplumbing.com/api-output/#timeout).
