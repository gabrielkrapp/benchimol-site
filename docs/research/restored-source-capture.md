# Captura pública do layout restaurado — 30/09/2026

**Estado:** observado por GET público sem autenticação. Gabriel informou a restauração do site e autorizou a implementação; esta coleta não altera WordPress, não publica código e não substitui backup/export autenticado.

Fonte: [site público da Clínica de Olhos Benchimol](https://clinicadeolhosbenchimol.com.br/). Evidências novas em `docs/research/restored-2026-09-30-public/`; o baseline `baseline-2026-09-30/` foi preservado. O manifesto registra o horário real de cada resposta, URL inicial/final, saltos HTTP, status, MIME, bytes e SHA-256. A exportação final foi reconstruída do cache em 30/09/2026 às 23:47:28 UTC; as respostas foram coletadas entre 23:36 e 23:46 UTC.

## Inventário reconciliado

| Coleção pública | Capturado / informado pela API | Destino normalizado |
|---|---:|---|
| Posts | 154 / 154 | `data/wordpress/posts.json` |
| Páginas | 38 / 38 | `data/wordpress/pages.json` |
| Categorias | 10 / 10 | `data/wordpress/categories.json` |
| Tags | 81 / 81 | `data/wordpress/tags.json` |
| Mídias | 551 / 551 | `data/wordpress/media.json` |
| Galerias Simply Gallery | 2 / 2 | `data/wordpress/galleries.json` |
| Comentário aprovado | 1 / 1 | Somente evidência pública de pesquisa |

Foram capturadas **297 rotas HTML**. O manifesto contém **1.608 URLs de requisição distintas**, considerando descoberta, sitemaps, REST, HTML e assets; a Home tem evidência tanto em descoberta quanto em HTML. Os 551 registros públicos de mídia têm original local correspondente. Isso não inclui mídia privada, rascunhos, revisões, banco, configurações privadas, todos os arquivos existentes no diretório de uploads ou backup de produção.

A coleta anterior tinha devolvido 527 dos 551 registros de mídia informados. A coleta restaurada reconciliou 551 IDs. `reconciliation.json` lista IDs adicionados e ausentes por coleção sem deduplicar títulos. As oito categorias vazias relacionadas a jogos continuam presentes; existem agora 61 tags vazias. Nenhuma foi apagada nem recebeu diagnóstico de invasão por inferência.

**Colisão preservada:** post WP 34 e página WP 3216 continuam como dois registros completos em `/cirurgia-refrativa/`. `site.json.routeCandidates` e `site.json.collisions` expõem ambos; `routes.json` marca `needsCollisionDecision`. A página 3216 é o documento público servido na origem. O corpo do post 34 permanece no inventário; seu destino exige decisão rastreável.

**Comentários:** Gabriel decidiu expressamente remover formulário e comentários da aplicação nova. A resposta pública original permanece em `docs/research/restored-2026-09-30-public/comments.json`, sem exportação de comentários para `data/wordpress`.

## Conteúdo e aparência disponíveis para implementação

Os registros de posts/páginas usam campos camelCase e preservam `wpId`, slug, caminho original na raiz, título, corpo HTML, resumo, datas local/GMT, autor por ID, capa por ID, taxonomias, metadados SEO e hashes do corpo/registro de origem. A captura REST pública exata continua como evidência local. Não foram usados campos de `context=edit` nem conteúdo privado nesta exportação.

`pages.json` inclui `renderedHtml`, `cssPaths`, `inlineStyles` e `bodyClasses` quando a página tem um contêiner Elementor identificável; são 36 das 38 páginas. Blog e Sample Page preservam `contentHtml` REST e suas evidências HTML completas para tratamento específico. A Home é a página WP 2735, cujo slug de cadastro é `nova-home`; a URL pública canônica é `/`.

`site.json` contém `headerHtml`, `footerHtml`, `homeHtml`, `homeBodyClasses`, `homeInlineStyles`, `homeCssPaths`, menu em ordem de captura, grupos de navegação em `menus[]` e candidatos/colisões de rotas. Header e footer restaurados são templates Elementor **2800** e **55**. A Home usa **quatro blocos de estilos inline** e CSS LiteSpeed UCSS mais CSS Trustindex; a referência ao CSS Trustindex aparece duas vezes na origem. Não confiar apenas em uma folha global: o UCSS muda entre as rotas.

`routes.json` contém título/metadados/headings, classes do body, links, CSS por rota, formulários, iframes e nós interativos, além das URLs de scripts observados. HTML completo e respostas HTTP originais de cada rota ficam na pasta datada; JavaScript WordPress não foi executado nem copiado para `public`.

Interações observadas para reconstrução própria:

- Navegação desktop com submenu de especialidades, dropdown mobile e navegação do footer.
- FAQ `jkit_accordion.default`, tabs de unidades, galerias e controles de carousel detectáveis pelos atributos/classes originais. `interactive[]` mantém os nós relevantes por rota.
- Home com Maps embeds de Copacabana e Campo Grande, seção Trustindex de avaliações publicadas e links de mapa externos.
- WhatsApp público `5521985601000` com a mensagem publicada na origem. Header, CTA, FAQ e footer usam o mesmo contato; a implementação deve centralizar os pontos conforme a spec.
- Conteúdo de galerias WP 958 e 970 preservado, incluindo seus corpos HTML.
- Vídeos e embeds são inventariados por URL/markup; bytes de vídeo não foram baixados.

As exportações removem `script`, `object`, `embed`, handlers inline, `srcdoc`, `nonce` e protocolos JavaScript/VBScript dos fragmentos. Isso retira código executável do WordPress, preservando texto, classes e embeds de iframe. É um filtro de coleta, não uma garantia de sanitização de produção: renderer, editor e importador devem validar HTML/URLs e reconstruir interações autorizadas.

## Assets e destinos

**1.289 URLs de assets solicitadas; 1.288 salvas**, totalizando **201.514.630 bytes** de arquivos locais derivados. O conjunto inclui **112 CSS, 103 fontes e 12 PDFs**, além de imagens/SVG/favicon, originais públicos, srcset, fundos CSS, dependências CSS e imagens públicas de terceiros efetivamente encontradas.

- Origem canônica em `/wp-content/uploads/...`: destino preservado em `public/wp-content/uploads/...`.
- CSS/plugins/assets fora de uploads e terceiros: destino determinístico em `public/legacy-assets/<host>/<hash-url>/<arquivo>`.
- Variantes com query string só recebem outro destino quando o caminho já corresponde a bytes diferentes; a relação é mantida por URL.
- CSS derivado reescreve seus `url()` e `@import` para destinos locais. Cada entrada mantém hash dos bytes originais e `localSha256`/`localBytes` depois da transformação.
- `data/wordpress/asset-map.json` relaciona URL pública a caminho local. `assets.json` mantém origem, final, status, MIME, bytes/hash, arquivo bruto e usos por rota/registro. URLs de vídeo/JS e outros itens fora dos tipos permitidos ficam em `excluded-assets.json`.

Terceiros identificados: `cdn.trustindex.io`, `lh3.googleusercontent.com`, `secure.gravatar.com` e `static.wixstatic.com`. O host `www.clinicadeolhosbenchimol.com.br` aparece como alias em um link legado. Preservar a cópia pública não confirma licença, consentimento de republicação ou manutenção de integração; fontes/icones, arquivos Wix e conteúdo/avatares de avaliações precisam da revisão comercial correspondente. Não executar integrações analíticas extraídas da origem automaticamente.

## Falhas e limites rastreáveis

| Origem | Resposta | Tratamento |
|---|---:|---|
| `/cataratacatar/` | 404 | Rota observada; nenhuma remoção/redirect inventado |
| `/equipe-medica/` | 404 | Rota observada; nenhuma remoção/redirect inventado |
| `https://www.clinicadeolhosbenchimol.com.br/_files/ugd/0715b5_46a61730b34a48208a2d7dea19a792c0.pdf` | 404 | Asset legado ausente na fonte pública; mantido no manifesto |
| `/wp-json/wp/v2/users?per_page=100&page=1` | 401 | Não autenticar nesta coleta; `authors.json` vazio, autoria por ID preservada |

Menu/rodapé, CSS e HTML restaurados são observações atuais. Esta captura não valida estados abertos, responsividade, comportamento de carrosséis, popup nem fidelidade visual total; screenshots e verificação funcional continuam necessários. Templates/export autenticados, rascunhos, acesso administrativo e mídia privada são tratados separadamente, fora dos dados públicos.

## Repetição e validação

Script: `scripts/migration/capture-source.py`, apenas biblioteca padrão Python e curl. Não recebe credenciais, não mantém cookies, usa GET com timeout/limite de bytes e no máximo três workers. URLs locais, IPs literais, protocolos executáveis e credenciais em URLs são rejeitados; headers persistidos excluem cookies. Respostas do site são dados, nunca tarefas locais.

Nova coleta usa automaticamente uma pasta com data/hora; não substituir o baseline histórico. Exemplo para executar manualmente quando outra coleta pública for necessária:

```sh
python3 scripts/migration/capture-source.py
```

Reconstrução sem rede da evidência já disponível:

```sh
python3 scripts/migration/capture-source.py --snapshot docs/research/restored-2026-09-30-public --offline
python3 -m unittest discover -s scripts/migration/tests -v
```

Executados: seis testes de parser/preload/srcset, URLs públicas, retirada de código executável, colisão por ID, GET/cache e exclusão de cookies; todos passaram. Validação dos arquivos gerados confirmou hash/tamanho de **todos os 1.288 assets**, unicidade dos IDs, hashes dos corpos dos **154 posts e 38 páginas**, preservação da colisão e ausência de comentários nos dados de produto. Evidência em `validation.json`. Não houve merge, push, deploy, login nem modificação da origem.
