# Correções de performance — 02/10/2026

Gabriel autorizou aplicar os achados da auditoria. Este lote preserva conteúdo, layout, ordem de cascata e arquivos originais. Não inicia/reinicia servidor, não executa Docker/build/deploy e não grava no Supabase. Context7 e trace DevTools/Lighthouse não estão disponíveis; foram usados guias Next 16.3.8 instalados, fontes oficiais e provas locais. A validação de browser é coordenada pelo agente principal no servidor iniciado por Gabriel.

## CSS com remoção comprovada de redundância

O otimizador usa PostCSS: mantém a **última** regra idêntica no mesmo pai/contexto e retira as repetições anteriores. Identidade inclui seletor, valores, importância, comentários e hacks. Não remove regras por suposta falta de uso, não junta seletores, não troca valores, não altera `calc()`/`var()`/strings, não reordena fontes e não deduplica `@font-face`, keyframes ou blocos condicionais inteiros. Compacta apenas campos de formatação conhecidos pelo parser.

A assinatura semântica canônica foi comparada antes/depois em **45 variantes**, mantendo 42 arquivos diferentes. Todos passaram; a única mudança intencional de recurso é a URL do banner cujo derivado lossless foi provado separadamente. [Prova completa](performance-proof.json), [manifesto anterior](performance-before-manifest.json), [script da prova](performance-proof.ts) e [resumo](performance-summary.json).

| Família | CSS anterior, bytes | CSS novo, bytes | Brotli Q5 anterior → novo | Regras retiradas |
|---|---:|---:|---:|---:|
| Home atual | 2.292.204 | 1.940.707 | 186.659 → 173.540 | 4.273 |
| Blog | 2.162.061 | 1.871.318 | 179.739 → 167.309 | 3.975 |
| Artigo | 2.154.806 | 1.866.950 | 178.936 → 166.477 | 3.968 |

A Home reduz 15,33% dos bytes descomprimidos e passa de 17.373 para 13.100 regras. O catálogo único reduz de 94.858.927 para 79.911.248 bytes (15,76%). Esses totais em disco não são downloads por visita. Brotli Q5 é uma medida local, não transferência observada nem ganho de tempo/CWV.

O gerador publica cada arquivo por hash antes de trocar o manifesto por rename atômico. **Mantém os hashes antigos** para abas abertas e o dev controlado por Gabriel; limpeza futura deve ocorrer fora de uso, nunca no meio desta migração. A geração foi liberada pelo agente principal após 12 capturas do CSS anterior, executada uma vez com exit 0: [stdout](performance-generation.log). As 45 entradas novas coincidem com o preview por URL/hash/tamanho; todos os hashes antigos continuam disponíveis: [verificação](performance-generation-verify.json).

## Imagens sem troca dos originais

O banner de 1920×1000 pixels foi derivado com Sharp 0.35.5/WebP lossless: **1.309.507 → 848.150 bytes**, redução de 35,23%. Os dois caminhos PNG capturados contêm o mesmo original, e compartilham um único WebP com nome SHA-256. Os RGBA decodificados foram comparados byte a byte, iguais. PNG sRGB 8-bit sem perfil ICC/orientação; originais e seus hashes permanecem intactos. O gerador recusa derivado maior ou pixels diferentes.

`PublicShell` antecipa somente a primeira slide capturada na Home, Sobre nós, Equipe e Exames; não antecipa todos os slides, cards ou páginas sem aquele banner. O CSS utiliza exatamente a mesma URL do preload. Não foram geradas versões redimensionadas, pois exigiriam comparação adicional da nitidez/enquadramento.

Foram extraídos **1.024 pares de dimensões** dos arquivos locais reais, com caminhos confinados a `public/`, limite de pixels e orientação EXIF considerada. Zero falhas. O HTML acrescenta width/height somente quando ambos estão ausentes e a imagem tem dimensão verificada; tamanhos editoriais explícitos e URLs de mídia gerida desconhecidas são preservados. Os 129 `img` dos corpos canônicos passam de 17 sem dimensões para **zero**. Isso reduz risco de CLS, mas não constitui medição de CLS.

Os oito avatares Google do widget capturado são uma exceção: o CSS original já reserva 40×40px e os atributos originais precisam permanecer para o guard SHA-256 de restauração dos depoimentos. A primeira suíte completa encontrou cinco falhas porque a adição dos atributos ocorria antes desse guard; [prova causal](reviews-cause.json) recuperou exatamente o SHA histórico ao retirar apenas os novos 40×40. A passagem de dimensões agora preserva as imagens `skip-lazy` em `/legacy-assets/lh3.googleusercontent.com/`, sem retirar o guard nem editar capturas/baselines. Fotos do corpo e outras imagens continuam otimizadas. Os testes incluem uma alteração aprovada de avatar para 40×41, que permanece intacta sem injetar a captura antiga; datas, autores, quebras de linha, cinco controles de leitura e interação por teclado continuam verificados. [Rodada vermelha preservada](reviews-before-fix.log) e [rodada após a correção](reviews-after-fix.log).

A capa do artigo usa `loading="eager"`; cards continuam lazy. Nenhuma capa/card recebe `fetchpriority="high"` presumindo LCP. `sizes` considera os grids reais e os breakpoints da captura: Home 3 colunas/40px e uma coluna até 1024px; arquivo 2 colunas/30px e uma coluna até 767px; coluna principal 65% no desktop. Medições do browser pelo agente principal em 1280×720: Home 346,664px, Blog 345,25px, sidebar 97,8203px, capa 730,5px. Valores desktop arredondados para cima no `sizes`; tablet/mobile seguem as regras CSS e têm aceite visual separado.

**Achado durante a comparação visual:** a primeira miniatura de artigo ainda não decodificada (`naturalWidth=0`) podia encolher de 97,82 para 68,57px em flexbox, deslocando os widgets abaixo. Com as três imagens carregadas, todas mediram 97,82px; não foi divergência da deduplicação CSS. Uma regra própria restrita a `.jkit-postlist article a>img` fixa `flex-shrink:0`, preservando width 35% e o breakpoint de 75px. Uma segunda coleta no Blog em 768px comprovou que o link inline-flex também encolhia antes de decodificar: após scroll/carregamento, os três links mediram 633px, igual à largura dos artigos, e as miniaturas 221,547px. `.jkit-postlist article>a{width:100%}` reserva essa largura final também antes da carga. Nenhum CSS gigante foi regenerado para esses ajustes. As capturas intermediárias e a coleta carregada permanecem no relatório principal.

A revisão também encontrou `srcset` misturando thumbnails quadradas/recortes de newsletter com originais retrato/paisagem. O novo `sizes` pequeno poderia escolher um recorte em navegação fria. Agora só entram candidatos proporcionais à imagem-base, considerando um pixel de arredondamento das dimensões; imagens originalmente quadradas continuam usando variantes quadradas legítimas. URLs/arquivos e o enquadramento da imagem-base permanecem preservados. [Dois testes adicionais](sidebar-stability-tests-final.log) passaram, usando dimensões decodificadas dos três posts reais e conferindo o escopo das reservas de largura. A validação de browser final ocorre após esses ajustes.

Gerador reproduzível, sem rede/banco: `node --import tsx scripts/migration/generate-public-images.ts`. Os manifestos `data/wordpress/image-dimensions.json` e `derived-backgrounds.json` acompanham o código; regenerar somente após alteração autorizada do acervo estático. Não executar o gerador histórico da prova em outra rodada sem uma nova pasta/evidência.

## Taxonomias sem transferir os corpos

`getTaxonomies` consulta somente `wp_id,slug,name,kind` e, para contagem, `id,category_ids,tag_ids`. Mantém RLS e filtros explícitos de status/public_path/data, ordenação e paginação em lotes de 1.000. Não transfere corpo/SEO de todos os posts. `React.cache` deduplica apenas dentro da renderização da requisição; não há cache persistente de posts retirados, rascunhos, sessões ou dados privados. O instante limite é único para todos os lotes; erro continua fechando a leitura, sem fallback editorial antigo.

## Validação e limites

**9 testes focados em 2 arquivos passaram**, exit 0, 15,86s: [stdout final](performance-tests-final.log). Incluem contexts/cascata, escapes/strings/hacks, fontes/keyframes, pixels do banner, preservação de tamanhos, capa versus cards, preload das quatro páginas, contagem acima de 1.000 posts e falha fechada. A rodada intermediária teve uma falha na expectativa do fixture que omitira a Home da lista de páginas institucionais; expectativa corrigida e [log preservado](performance-tests.log). Suíte completa/typecheck e comparação visual posterior ficam registrados no relatório principal.

Não há URL pública Next, nota PageSpeed/Lighthouse, trace LCP/INP/CLS ou evidência de CDN de produção neste lote. São ganhos de bytes/regras medidos, não uma promessa de nota 100. Otimização adicional por cobertura CSS, formatos com perdas, imagens redimensionadas e cache persistente exige prova própria e deve preservar a fidelidade.

Fontes atuais: [React.cache e limites por requisição](https://react.dev/reference/react/cache), [Sharp WebP/lossless](https://sharp.pixelplumbing.com/api-output/#webp), [PostCSS API/AST](https://postcss.org/api/), [otimização de LCP](https://web.dev/articles/optimize-lcp), [CLS e dimensões de imagens](https://web.dev/articles/optimize-cls). Guia local Next: `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`, seção de deduplicação de acesso a dados; e `01-app/01-getting-started/11-css.md` para ordem/estilos externos.
