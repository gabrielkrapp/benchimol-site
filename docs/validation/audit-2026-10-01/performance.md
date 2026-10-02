# Auditoria de performance — aplicação Next Benchimol

Coleta em **02/10/2026 UTC**, pasta da auditoria iniciada em 01/10. Resultado: existem oportunidades concretas em CSS, imagens e consultas, mas **não há nota PageSpeed/Lighthouse nem Core Web Vitals medidos da aplicação Next**.

Escopo: Next 16.3.8/React 19.3.0; spec v0.9; código atual e acervo público canônico importado. O domínio público ainda é WordPress; suas notas não seriam notas do Next. O servidor local estava indisponível na coleta inicial. Após Gabriel iniciá-lo, houve suplemento HTTP em **02/10/2026 03:13 UTC**, preservando a coleta offline das 03:06 UTC. O servidor não foi iniciado/reiniciado pelo agente. Não executei build, gerador de CSS, Docker, escrita no banco, push, merge ou deploy. Apenas os arquivos desta auditoria foram escritos.

Ferramentas: skill web-perf; inventário `ALL_TOOLS` sem trace Chrome DevTools/Lighthouse e sem Context7. Foram consultadas fontes oficiais atuais e os guias Next instalados. A análise de DOM usa JSDOM **offline**, sem executar scripts nem carregar subrecursos. Evidência reproduzível: [performance-offline.ts](./performance-offline.ts), executado com `node --import tsx docs/validation/audit-2026-10-01/performance-offline.ts`; resultado em [performance.json](./performance.json), incluindo hashes das fontes. Não chamar esse DOM reconstruído de resposta HTTP ou estado editorial atual do banco.

| Métrica | Resultado Next | Critério de referência |
|---|---|---|
| Performance Lighthouse mobile/desktop | Não medido | 90–100 é a faixa boa; 100 é uma aspiração, não uma entrega comprovada |
| LCP | Não medido | Bom ≤ 2,5 s no percentil 75 das visitas |
| INP | Não medido | Bom ≤ 200 ms no percentil 75; exige interação real |
| CLS | Não medido | Bom ≤ 0,1 no percentil 75 |
| TTFB, FCP, TBT e Speed Index | Não medidos | Coletar no ambiente de produção e nos traces |

Os limiares de campo vêm de [Core Web Vitals](https://web.dev/articles/vitals). A nota Lighthouse é calculada a partir das métricas, varia conforme condições e não é prevista por inspeção de arquivos; 100 é difícil e não esperado como requisito universal. [Scoring oficial](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring). O PSI distingue laboratório de campo; o CrUX usa uma janela de 28 dias, portanto dados do domínio após uma troca ainda podem incluir a versão WordPress. [PSI](https://developers.google.com/speed/docs/insights/v5/about).

## Evidências por rota

Cada rota seleciona **um** CSS capturado pelo manifesto em [PublicShell.tsx](/Users/gabrielkrapp/Desktop/Gabriel/Benchimol/src/components/public/PublicShell.tsx:13), além dos três CSS pequenos próprios importados ali. O catálogo tem 45 entradas que compartilham 42 arquivos, somando **94.858.927 bytes** em disco; não são 42 downloads por página. Maior arquivo: 4.226.908 bytes, Brotli Q5 local 217.931 bytes. A tabela mede apenas o CSS capturado associado à rota, sem CSS próprio do Next, JS ou HTML.

| Família/rota reconstruída | CSS bruto, bytes | Brotli Q5 local, bytes | Regras CSS | Entradas de seletor |
|---|---:|---:|---:|---:|
| Home `/` | 2.292.204 | 186.659 | 17.373 | 21.134 |
| Blog `/blog/` | 2.162.061 | 179.739 | 16.638 | 20.300 |
| `/sobre-nos/` | 2.158.166 | 179.365 | 16.610 | 20.273 |
| `/equipe/` | 2.136.169 | 177.351 | 16.494 | 20.144 |
| `/exames-e-procedimentos/` | 2.129.266 | 177.014 | 16.447 | 20.100 |
| Artigo de mapeamento da retina e artigo com mais imagens | 2.154.806 | 178.936 | 16.596 | 20.258 |
| Galeria `/pgc_simply_gallery/copacabana/` | 2.085.107 | 173.554 | 16.162 | 19.788 |

Brotli Q5 é cálculo local de potencial de compressão, **não** `Content-Encoding` observado na Vercel nem bytes efetivamente transferidos. Compressão reduz transferência; o CSS descomprimido ainda precisa ser analisado pelo navegador. Nenhum valor acima equivale a uma estimativa de atraso em milissegundos.

## Suplemento HTTP do servidor dev iniciado por Gabriel

Quatro GETs públicos sequenciais em `http://127.0.0.1:3000`, com `Accept-Encoding: br, gzip`, sem cookies/login. O sandbox bloqueou a primeira conexão com EPERM; a mesma coleta somente de leitura passou com acesso loopback autorizado. [performance-http-live.json](./performance-http-live.json) contém horários, headers permitidos, tamanhos e hashes; [performance-http-live.mjs](./performance-http-live.mjs) reproduz a coleta. Não foram coletadas credenciais, cookies ou headers de autenticação.

| Recurso servido | Status | Content-Encoding | Corpo recebido, bytes | Corpo descompactado, bytes | Cache-Control observado |
|---|---:|---|---:|---:|---|
| HTML Home `/` | 200 | gzip | 39.339 | 269.056 | `no-cache, must-revalidate` |
| CSS Home `9b9649a1…606ded3.css` | 200 | gzip | 251.445 | 2.292.204 | `public, max-age=31536000, immutable` |
| Banner `/wp-content/uploads/2025/08/slide.png` | 200 | Ausente | 1.309.507 | 1.309.507 | `public, max-age=0` |
| CSS artigo `7c6b3350…50e51ed.css` | 200 | gzip | 236.663 | 2.154.806 | `public, max-age=31536000, immutable` |

O HTML Home declarou `data-content-source="database"`, selecionou o CSS exato da auditoria offline e não continha preload do banner. O CSS entregue referencia `slide.png`; CSS Home, CSS artigo e PNG tiveram hashes idênticos aos arquivos locais. O PNG é **1920×1000**, tem `Content-Length: 1309507` e ETag; o `max-age=0` requer revalidação para reutilização, não prova ausência total de cache. As respostas gzip são chunked/sem Content-Length. Os tamanhos recebidos são apenas o corpo HTTP, excluindo headers e framing; não são a soma de uma navegação de browser. Não foi solicitado HTML de artigo nesta coleta.

Agora há confirmação de entrega e compressão **do servidor de desenvolvimento**, mas continuam sem medição LCP/INP/CLS, atraso de CSS, consumo de CPU, waterfall do navegador, score PSI, TTFB de produção e política efetiva da CDN Vercel. O gzip observado não valida a estimativa Brotli Q5 como transferência real. Antes de propor cache prolongado de imagens, definir quais URLs são imutáveis e testar atualização editorial para não reter conteúdo alterado.

## Achados e propostas para revisão

**P1 — CSS capturado grande no caminho de renderização.** O link de stylesheet em [PublicShell.tsx:15](/Users/gabrielkrapp/Desktop/Gabriel/Benchimol/src/components/public/PublicShell.tsx:15) é necessário para renderizar o layout restaurado. A Home fornece 2,29 MB/17.373 regras; até a galeria tem 2,09 MB. [styles.ts:38](/Users/gabrielkrapp/Desktop/Gabriel/Benchimol/src/lib/public/styles.ts:38) concatena os arquivos selecionados e CSS inline; escopo e seleção não fazem análise de cobertura. O manifesto permite cache do arquivo por hash; isso não elimina o custo inicial.

Proposta: medir cobertura e custo de estilo em 390/768/1440 px e em estados menu/FAQ/tabs/galerias/popups; identificar regras e arquivos realmente dispensáveis por família. Separar, quando comprovado, uma base compartilhada e estilos de família para reduzir duplicação entre navegações. A Home inclui, por exemplo, fontes CSS de 470.844 bytes (`frontend.min.css` restaurado) e 283.190 bytes (`main.css`); a lista completa está no JSON. **Não há prova de que esses arquivos inteiros sejam dispensáveis, nem quantidade segura de bytes removíveis.** Não aplicar purge indiscriminado ou alterar cascata/visual. Impacto comprovado: volume e regras; impacto em FCP/LCP/TBT pendente de trace.

**P1 — Banner institucional de 1.309.507 bytes com descoberta por CSS.** O seletor `.elementor-2735 … .elementor-repeater-item-7edda30 .swiper-slide-bg` encontra um elemento real no DOM Home reconstruído e referencia `/wp-content/uploads/2025/08/slide.png`. Não existe preload desse banner em `layout.tsx`/`PublicShell.tsx`. Sobre nós, equipe e exames referenciam outro caminho PNG também de 1.309.507 bytes. O arquivo original permanece como referência de fidelidade.

Proposta: confirmar o elemento LCP em trace mobile/desktop. Se for o banner, avaliar uma derivação WebP/AVIF/resoluções responsivas com comparação visual do mesmo enquadramento; testar preload apenas da imagem inicial selecionada, evitando duplicar downloads ou antecipar slides invisíveis. Se o LCP for texto, diagnosticar também CSS/fontes antes de alterar prioridade do banner. Descoberta de background CSS pode atrasar seu pedido; preload/descoberta antecipada são opções condicionadas à identificação do LCP. [Guia oficial de LCP](https://web.dev/articles/optimize-lcp). Economia de bytes e de tempo ainda não medida.

**P2 — Corpos antigos mantêm imagens grandes e sem espaço intrínseco declarado.** Nos 153 artigos canônicos, a saída sanitizada tem 129 elementos `img`; **17 sem width/height**, 112 com `srcset`, 105 lazy. Há 65 referências cujo `src` local excede 200.000 bytes; esse número não é soma de downloads, pois `srcset`, lazy e viewport podem selecionar/adquirir outros arquivos. Exemplo inequívoco sem `srcset` nem dimensões: `/cuidados-com-os-olhos-no-outono/`, imagem `/legacy-assets/static.wixstatic.com/a88230c8b3918aae/file.png`, **1.594.322 bytes**. Outros casos no JSON chegam a 1.563.049 e 1.514.439 bytes.

Proposta: extrair dimensões dos arquivos, reservar o espaço no HTML e avaliar variantes responsivas sem substituir o original ou quebrar a URL legada; conferir layout e nitidez antes de aprovação. `public-article-body img` limita largura/usa altura automática, mas não define proporção para essas imagens. Falta de dimensões é um risco de CLS, não prova de deslocamento ocorrido; verificar contêiner e trace. [Orientação oficial de CLS](https://web.dev/articles/optimize-cls). A Home também tem nove imagens sem dimensões, sendo oito avatares e um emoji; como CSS pode reservar sua área, não foram tratadas como nove culpadas comprovadas.

**P2 — Capa de artigo sempre lazy e `sizes` único para capas/cards.** [render.ts:17–26](/Users/gabrielkrapp/Desktop/Gabriel/Benchimol/src/lib/public/render.ts:17) usa `loading="lazy"` até quando `featured=true`, sem prioridade alta, e `sizes="(max-width: 800px) 100vw, 800px"`. O artigo de mapeamento da retina contém uma capa 930×1024/79.706 bytes nessa condição. Isso pode atrasar uma capa acima da dobra e escolher variantes maiores que o card; posição/LCP e variante realmente solicitada não foram medidos.

Proposta: medir caixa/viewport e conferir `currentSrc`; se a capa for LCP, usar carregamento imediato/prioridade adequada só para ela. Ajustar `sizes` conforme os breakpoints reais de cards e artigo, mantendo lazy abaixo da dobra. Não promover todas as imagens a high nem declarar 749.230 bytes transferidos pelo card PNG da Home: o `srcset` existente pode selecionar outro arquivo. [LCP: prioridade da imagem](https://web.dev/articles/optimize-lcp).

**P2 — Leitura de taxonomias transfere todos os corpos dos posts ao servidor.** [public-repository.ts:50–54](/Users/gabrielkrapp/Desktop/Gabriel/Benchimol/src/lib/server/public-repository.ts:50) chama `getAllPublicPosts()` só para contar categorias/tags; este usa `getPublicPosts()` com `select('*')`/contagem exata e lotes de 100. Com o acervo de 153 canônicos, isso corresponde a dois lotes contendo corpos, embora as contagens precisem apenas de relações. O acervo offline tem **798.229 bytes de bodyHtml**; não são bytes medidos da API nem download do navegador.

Blog, busca e artigos chamam esse caminho em [page.tsx:46](/Users/gabrielkrapp/Desktop/Gabriel/Benchimol/src/app/(public)/[[...path]]/page.tsx:46) e [page.tsx:63](/Users/gabrielkrapp/Desktop/Gabriel/Benchimol/src/app/(public)/[[...path]]/page.tsx:63). Taxonomias também o chamam no metadata. O segmento é `force-dynamic`; o cliente aplica fetch `no-store` em [supabase.ts:5](/Users/gabrielkrapp/Desktop/Gabriel/Benchimol/src/lib/server/supabase.ts:5). Não há memoização explícita dessas funções; eventual deduplicação automática não foi observada. [Comportamento de cache Next atual](https://nextjs.org/docs/app/guides/caching-without-cache-components).

Proposta: projetar contagens e leituras menores usando somente campos necessários, preservando filtro de publicados/data/RLS; compartilhar leitura por request quando adequado. Avaliar cache público com invalidação editorial de até 60 s somente depois de testar publicação/retirada, falha de backend e isolamento privado. A política dinâmica atual protege atualização editorial; não trocar por conteúdo estático sem provar essas regras. Impacto em TTFB/consultas é hipótese verificável; nenhuma latência foi estimada.

## Aspectos positivos e limites de bundle/fontes

- Conteúdo público já é renderizado no servidor; interações próprias ficam em Client Components. O grafo direto de `Interactions` importa galerias, load-more, lightbox e ícones próprios. Esses cinco fontes somam **38.013 bytes de código-fonte**, não bytes de bundle/transporte/TBT. Não existe import direto de Tiptap nesse grafo; o editor fica no admin. Falta inspeção de chunks de um build atual para quantificar o bundle público real.
- CSS do manifesto usa URL por hash e `Cache-Control: public, max-age=31536000, immutable` em `next.config.ts:10`. Confirmar resposta CDN depois da publicação pelo usuário; não atribuir esse header aos demais assets que a configuração não cobre.
- Capas/cards com metadados preservam dimensões e `srcset`; galerias reservam dimensões; iframes permitidos recebem `loading="lazy"` no sanitizador. Sem trace/rede, nenhum embed foi considerado gargalo comprovado.
- Na Home há 292 declarações `@font-face`/288 únicas; isso **não significa 292 downloads**: peso, família e `unicode-range` condicionam o carregamento. As fontes de texto capturadas usam `swap`; a família `eicons` não declara `font-display` e alguns ícones usam `block`. Não recomendar exclusão de fontes/preconnect sem comprovar utilização e fidelidade. Não há `@import` CSS no arquivo compilado analisado.

## Medição necessária para fechar PageSpeed e prioridade real

Após Gabriel disponibilizar **uma URL Next em produção**, executar três medições PSI mobile e três desktop por rota representativa: Home, blog, um artigo moderno, `/cuidados-com-os-olhos-no-outono/`, equipe/exames e galeria. Registrar URL, data, commit/build, versão Lighthouse, dispositivo, região, cache frio/quente, mediana e intervalo; guardar JSON/HTML originais. Não publicar uma build para realizar esta auditoria.

No trace, identificar elemento LCP e decompor TTFB/descoberta/download/render; coletar `Content-Encoding`, cache headers, bytes transferidos, `currentSrc`, fontes solicitadas, cobertura CSS e long tasks. Exercitar menu, FAQ, tabs, load-more, galeria/lightbox e popup para observar estabilidade e interação; TBT de laboratório não comprova INP de usuários. Comparar qualquer proposta ao mesmo conteúdo e aos viewports 390/768/1440 antes/depois. Alvo inicial: faixa verde e bons CWV; perseguir 100 apenas onde as métricas e a fidelidade permitirem, sem prometê-lo.

Essa medição deve distinguir CrUX da URL de CrUX da origem e registrar ausência de amostra como “sem dados”, não como aprovação. Scores, CWV, delays de CSS, economia de imagem, backend TTFB, cache da Vercel e tamanho do JS em produção permanecem **pendências de validação**, não falhas quantificadas ou resultados aprovados.
