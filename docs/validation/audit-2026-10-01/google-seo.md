# Revisão de SEO Google — 01/10/2026

O SEO técnico da aplicação tem uma base adequada: conteúdo renderizado no servidor, URLs legadas preservadas, canonicals por página, paginação com links e separação do admin. **Há um bloqueio a corrigir antes da publicação: as imagens novas do admin usam uma rota que o próprio robots.txt proíbe rastrear.** A auditoria não comprova indexação, ranking ou notas do PageSpeed da aplicação Next.js, que ainda não foi publicada.

Auditoria somente leitura. Nenhum código, conteúdo, banco, configuração externa ou processo foi alterado. Não houve Docker, build, merge ou deploy. Fontes: spec v0.9, seção 7/7.1, documentação de migração e documentação oficial Google consultada nesta rodada. Context7 não está exposto nesta sessão; a revisão de código usou também os guias da versão instalada em `node_modules/next/dist/docs/`, especialmente `generate-metadata.md` e `not-found.md`.

## Evidências e alcance

[`google-seo.json`](google-seo.json) contém os resultados atuais da execução offline dos renderers e geradores de metadata reais, sem carregar envs privadas ou consultar o Supabase:

| Verificação | Resultado observado |
|---|---|
| Páginas institucionais/galerias | 40 renderizadas a partir do acervo público |
| Artigos canônicos | 153 renderizados; corpo completo presente; menor corpo com 487 caracteres |
| Título, descrição, canonical e datas dos artigos | Nenhum título/descrição vazio, data inválida ou canonical divergente do destino aprovado |
| H1 e autoria visível dos artigos | 153 com um H1; autoria visível igual ao registro |
| Descoberta pelo Blog | 26 páginas de seis artigos; 153 caminhos únicos em `<a href>` e sequência de próxima página |
| Imagens no corpo dos artigos | 129; 15 sem atributo alt e 111 com alt vazio; avaliar função decorativa antes de corrigir |
| Robots do código | Googlebot permitido no site; admin/API/prévias bloqueados; treinamento separado |
| Metadata privada no código | Admin `noindex,nofollow`, cabeçalho `X-Robots-Tag` e autorização; buscas internas `noindex,follow` |

Foi tentado GET sem JavaScript ao servidor de Gabriel em `127.0.0.1:3000`; o sandbox retornou `EPERM`. A coordenação depois constatou que o processo local havia parado. Ele não foi iniciado ou reiniciado. Portanto esta rodada **não confirmou status HTTP, serialização final da metadata, headers ou sitemap de uma aplicação em execução**. Os relatórios anteriores de HTTP/QA continuam históricos, com suas próprias versões e limitações.

O comportamento real da Vercel, CDN/WAF, Googlebot autenticado por IP, Search Console e resultados enriquecidos publicados permanece pendente. A documentação Next instalada admite metadata transmitida no corpo para bots capazes de ler o DOM, incluindo Googlebot; encontrar metadata fora do head em uma captura de visitante, isoladamente, não justifica declarar erro. Conferir o resultado efetivo depois que Gabriel iniciar a aplicação e após a publicação feita por ele.

## Achados

### SEO-01 — P1 — Robots bloqueia as imagens públicas criadas pelo admin

**Evidência:** `src/lib/public/seo.ts:42` inclui `/api/` em disallow para `*` e Googlebot. `src/lib/server/media.ts:16` e `:57` geram URLs `/api/media/<id>`, que podem virar capa, corpo, Open Graph e imagem de BlogPosting. `src/app/api/media/[id]/route.ts:11` entrega uma imagem a visitante somente se `get_public_media` reconhecer uso público; o resto continua privado. Os assets migrados em `/wp-content/uploads/` não têm esse bloqueio.

**Impacto:** um crawler cooperativo não chega às novas imagens, mesmo quando seu artigo está publicado. A conclusão é estática; não houve upload de fixture nesta auditoria. Google exige acesso às imagens marcadas, inclusive nos artigos. [Google Images](https://developers.google.com/search/docs/appearance/google-images), [Article](https://developers.google.com/search/docs/appearance/structured-data/article).

**Proposta mínima:** permitir estritamente `/api/media/` nos grupos de pesquisa, preservando o bloqueio de Auth/admin e a autorização existente para mídia. Alternativa: criar um caminho de entrega pública fora de `/api/`. Depois testar: mídia usada em post publicado acessível anonimamente; mídia de rascunho continua 404; APIs privadas continuam protegidas. Não liberar Storage privado ou exceções gerais de WAF.

### SEO-02 — P2 — A migração não preserva a permissão de imagem grande

**Evidência:** os 153 artigos canônicos importados registram `max-image-preview:large` no SEO legado. `src/app/layout.tsx:7` define apenas index/follow; `metadataForPost` e `metadataForPage` em `src/lib/public/seo.ts:19`/`:24` não transportam esse controle. O resultado offline mostra 153 permissões legadas e nenhuma explícita na metadata nova.

**Impacto:** perde-se uma configuração de apresentação do WordPress, contrariando a preservação do SEO prevista na spec. Ausência não significa que o artigo fique desindexado; o tamanho padrão pode ser usado. Não foi demonstrada perda de tráfego. [Controles de robots](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag).

**Proposta mínima:** preservar `max-image-preview:large` nas páginas públicas apropriadas e os controles legados de snippet/vídeo quando aplicáveis; manter override restritivo de admin/prévias. Conferir metadata HTML e cabeçalhos depois, sem inferir garantia de miniatura.

### SEO-03 — P2 — Falta contexto verificável de autoria em conteúdo médico

**Evidência:** os 153 artigos atuais trazem a autoria legada “Johny”. Ela aparece no texto e no JSON-LD; não há `author.url`/`sameAs` ou vínculo comprovado com profissional médico no modelo. Origem: `src/lib/server/snapshot.ts:23`, `scripts/migration/import-database.ts:27`, `src/lib/public/seo.ts:28`. Isso preserva o material recebido; não é autorização para atribuir textos a um médico.

**Impacto:** conteúdo relacionado à saúde necessita confiança e conhecimento identificáveis. Google recomenda autoria clara, contexto sobre o autor e conteúdo alinhado ao consenso especializado em temas YMYL. E-E-A-T não é uma pontuação ou fator isolado que este check possa aprovar. [Conteúdo útil e confiável](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).

**Proposta mínima:** a clínica confirma quem escreveu cada conjunto e quem revisa o material médico; depois aprova perfis, vínculos e datas reais de revisão. Só então refletir essas informações no texto e schema. Não fabricar autoria, CRM, revisão ou referências; não mudar o acervo por iniciativa do agente.

### SEO-04 — P2 — Nó principal da clínica sem endereço para LocalBusiness

**Evidência:** `src/lib/public/seo.ts:32` define `#clinic` como MedicalClinic sem address. Os nós de Copacabana e Campo Grande em `:33`/`:34` têm endereços. MedicalClinic deriva de LocalBusiness; as propriedades exigidas por Google para esse recurso são name e address. [MedicalClinic](https://schema.org/MedicalClinic), [LocalBusiness Google](https://developers.google.com/search/docs/appearance/structured-data/local-business).

**Impacto:** o nó principal não satisfaz a exigência de endereço para ser elegível como negócio local nesse recurso; isso não impede indexar a página nem invalida automaticamente os dois nós de unidades. Não foi executado Rich Results Test da app.

**Proposta mínima:** representar a entidade geral como MedicalOrganization/Organization e manter as unidades físicas como MedicalClinic, com relação explícita entre elas. Alternativamente, identificar com a clínica qual unidade o nó principal representa antes de atribuir endereço. Aproveitar telefones/horários visíveis somente com correspondência real por unidade e validação dos dados.

### SEO-05 — P2 — Página de exemplo continua pública e no sitemap

**Evidência:** `data/wordpress/pages.json:5` contém `/sample-page/`, publicada, com texto genérico inglês de demonstração. `src/lib/public/catalog.ts:21` incorpora todas as páginas; `src/app/sitemap.ts:8` inclui essa URL. Foi preservada por fidelidade ao inventário.

**Impacto:** uma página sem relação com a clínica entra no conjunto de URLs canônicas sugeridas ao buscador. Não se constatou penalidade e não se confirmou sua indexação Google nesta amostra.

**Proposta mínima:** registrar uma decisão específica com Gabriel/cliente: conservar o arquivo histórico e remover a página da experiência pública com resposta apropriada, ou manter a URL fora do índice/sitemap. Não apagar silenciosamente página/backup ou redirecioná-la genericamente para a Home.

### SEO-06 — P3 — Oportunidades de apresentação e descrição, com aprovação editorial

**Evidência:** não há nó WebSite no JSON-LD novo (`src/components/public/PublicShell.tsx:21`), embora o legado tivesse. `WebSite.name/url` é a indicação recomendada para preferência de nome do site; OG e texto atual já informam a marca. [Nome do site](https://developers.google.com/search/docs/appearance/site-names).

Há 15 imagens de corpo sem alt e 111 com alt vazio; nem toda imagem vazia é defeito, pois pode ser decorativa. Há descrições herdadas genéricas/repetidas e duas galerias sem descrição. A Home herda um resumo longo. Google escolhe snippets/títulos automaticamente; descrições não possuem tamanho universal obrigatório. [Imagens](https://developers.google.com/search/docs/appearance/google-images).

**Proposta mínima:** adicionar WebSite coerente na Home; revisar alts das imagens informativas e descrições com o cliente, sem alterar a aparência ou inventar conteúdo médico. Não usar preenchimento massivo de keywords. Na Home, BreadcrumbList tem só um item; omitir esse breadcrumb dispensável evita marcar uma trilha incompleta para o recurso Google, mantendo breadcrumbs nas páginas internas. Google exige pelo menos dois itens para esse recurso. [Breadcrumb Google](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb).

### SEO-07 — P2 — Entidades do SEO importado chegam como texto literal

**Evidência:** 117 dos 153 artigos canônicos retornam entidades de origem, como `&hellip;`, nas descrições atuais de metadata e BlogPosting. A execução das funções reais comprova o exemplo WP17 no JSON de evidência. `scripts/migration/import-database.ts:29` e `src/lib/server/snapshot.ts:26` copiam description/og_description do WordPress; `src/lib/public/seo.ts:7` trata esses campos como texto literal, comportamento adequado para novos inputs editoriais, mas incompleto para esses valores codificados da importação.

**Impacto:** descrição/OG/JSON-LD podem apresentar a sequência da entidade em vez do caractere correspondente. Não se comprovou penalidade ou alteração de ranking. O ponto é a fidelidade do texto e coerência dos metadados públicos; Google considera texto e metadados da página na apresentação. [Imagens e metadados Google](https://developers.google.com/search/docs/appearance/google-images).

**Proposta mínima:** decodificar uma vez os metadados comprovadamente codificados na fronteira de importação/snapshot, preservando o export original e o texto literal editado no admin. Não fazer decode/sanitização indiscriminada de todo input, o que regressaria os casos de `&`, `<` e `>` já testados. Para o banco conectado, preparar reconciliação restrita por origem/versão e solicitar a decisão necessária antes de gravar; esta revisão não mudou registros.

## O que está correto no desenho atual

Os caminhos legados dos posts permanecem na raiz, com aliases WP34/WP1966 aprovados e duplicata preservada no inventário. As rotas chamam permanentRedirect para substituições específicas e notFound para conteúdo inexistente/páginas fora do arquivo. Canonicals de paginação são próprios, sem apontar todas as páginas para `/blog/`. O botão de carregar mais tem href rastreável; o HTML offline comprova a descoberta dos 153 artigos. Isso segue as recomendações de [paginação Google](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading) e [canonicalização](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).

HTML e schema preservam título, autoria e datas reais, sem inventar aggregateRating ou avaliações próprias para obter estrelas. A inclusão do admin fora do sitemap e seu noindex estão presentes, com privacidade tratada por autenticação/RLS, não pelo arquivo robots. Há idioma pt-BR, main/article, links de navegação e texto de FAQ no HTML. O H1 de fallback em seis páginas é acessível e descreve a página; não contém texto criado para manipular o buscador.

## Validação posterior, executada pelo usuário

1. Corrigir/revisar os achados técnicos aprovados; repetir GET de Home, serviço, equipe, artigo, arquivo, paginação, robots e sitemap na versão em execução.
2. Após publicação por Gabriel, conferir HTTPS/domínio www, canonicals absolutos, status 404/308, regras de Vercel/WAF e leitura anônima das imagens publicadas.
3. Usar Search Console para baseline, inspeção de URLs, sitemap, cobertura, segurança e ações manuais. Rodar Rich Results Test nas famílias adequadas; ele não valida todos os tipos schema nem garante destaque.
4. Confirmar autoria/contexto médico e CEP/unidades com a clínica; sincronizar o Perfil da Empresa por ação do proprietário. [Amostra de presença Google](google-presence.md).

Cumprir os requisitos não garante rastreamento, indexação, posição ou citação. Os mínimos técnicos oficiais são acesso por Googlebot, resposta de sucesso e conteúdo indexável. [Search Essentials](https://developers.google.com/search/docs/essentials), [Requisitos técnicos](https://developers.google.com/search/docs/essentials/technical).

## Suplemento após Gabriel iniciar o servidor

Em 02/10 às **03:14:25–03:14:33 UTC**, o coordenador confirmou [13/13 status HTTP esperados](public-http-live.json) no dev iniciado pelo usuário: nove páginas/artigos HTML, robots/sitemap/llms e uma URL inexistente 404. As nove respostas HTML 200 têm conteúdo no servidor, pt-BR, H1 único, canonical do domínio aprovado e JSON-LD sintaticamente parseável. Sitemap com 216 URLs, sem caminhos privados; os dois aliases aprovados responderam 200. Robots real mantém o bloqueio `/api/`; três artigos da amostra apresentam entidades legadas na description/schema. Isso complementa a indisponibilidade inicial, preservada nos registros anteriores; não substitui validação de schema/RichResults, visita de crawler real, indexação ou ambiente Vercel. Não houve novo login, gravação ou controle de servidor. [Consolidação](README.md).
