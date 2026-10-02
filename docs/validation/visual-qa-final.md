# QA visual independente — rodada após correções

**Estado em 01/10/2026:** 24 combinações percorridas e documentadas: 18 por este agente e seis Blog/Galeria pela sessão CUA do integrador, revisadas por este agente. A matriz reúne quatro builds com proveniência explícita: Home/Equipe/Exames/Catarata/Artigo/FAQ em b3NM/etY, Blog em `LT5XtX2XqdFBQDKFelcC9` e Galeria nas três larguras em `HUHevW-DGRcC9RbS-5oQu`. As diferenças materiais encontradas receberam correção e provas específicas, incluindo o carregamento de posts e o menu/submenu do rodapé. A regra de hover da foto foi portada, com limites de interação descritos abaixo. Não é evidência de igualdade de pixels nem de aceite global de todos os URLs. A rodada histórica permanece em `visual-qa.md`.

## Método e cobertura

CUA/IAB, navegador selecionado ID 2, uma aba de QA; sem automação de navegador alternativa. Foram comparadas Home, Blog, Equipe, Exames, Catarata, artigo de mapeamento da retina, FAQ e galeria Copacabana em 390×1000, 768×1000 e 1440×1000. As 24 referências de origem já percorridas foram reutilizadas. A barra WordPress de 32/46 px das capturas de origem é descontada; não pertence à aplicação pública.

Cada versão local foi percorrida até o rodapé para carregar imagens/animações. Capturas usam `visual-qa/after-fix-<família>-<largura>-top|middle|footer|full.png`; métricas ficam em `visual-qa/metrics-after-fix.json`, sem sobrescrever a primeira rodada. O `innerWidth` está registrado em cada combinação. A comparação avalia conteúdo, hierarquia, fontes, larguras, espaçamentos, recortes e interações; não é uma medição automática de diferença de pixels.

As seções de tentativas e diagnósticos descrevem o estado histórico de cada etapa. O estado consolidado está no início e no fechamento; os arquivos antigos não foram relabelados como provas finais.

## Referência adicional da galeria

Conferência direta da origem em 1440×1000: três painéis; imagens das miniaturas 55×46 px, com passo de 59 px/intervalo visual de 4 px. A prova posterior `source-final-controls.json`, capturada pelo integrador no navegador, detalhou a hierarquia: wrapper 59×50 px/padding 2 px, imagem 55×46 px, camada de borda branca de 2 px nas selecionadas e overlay preto rgba(0,0,0,0.5) nas inativas. Seleção e hover retiram o overlay. Portanto 55×46 descreve a imagem, e não a caixa clicável completa; não aceitar outline azul como reprodução desse estado. A miniatura 11 leva ao último grupo, com os índices 9/10 visíveis nas duas primeiras colunas e a terceira vazia. A seta próxima retorna ao grupo 0/1/2 após a animação. Evidências: `visual-qa/source-gallery-last-thumbnail-final.png` e `visual-qa/source-gallery-last-next-final.png`. A captura anterior em 768 px também mostra três painéis; 390 px usa um.

O botão Share da origem abre um overlay escuro sem opções, conforme flags públicas desabilitadas; Escape fecha esse overlay e mantém o lightbox. Referências adicionais coletadas pelo implementador: `source-gallery-share-root.png`, `source-gallery-zoom-root.png` e `source-gallery-fullscreen-root.png`. Validar o estado real da viewport após Fullscreen, pois o bridge DOM do IAB não refletiu `fullscreenElement` consistentemente na origem.

## Escopo de revalidação

- Revalidar V01–V07 e R01/R02 da primeira rodada/revisão independente.
- Conferir mapas e medidas do rodapé em todas as famílias/larguras, avaliações realmente visíveis, capa proporcional e seleção do índice.
- Exercitar menu/submenu, FAQ, índice, miniaturas, swipe seguido de seta, última miniatura seguida de próxima, lightbox/caption/Share/Escape/Zoom/Fullscreen.
- Esta QA cobre somente o público; não valida login, Auth ou Storage. O integrador registra a validação administrativa em documentação separada. As seis coletas finais foram realizadas pela sessão do integrador após a conexão ao Supabase exclusivo da clínica; este agente revisou os arquivos porque sua própria superfície CUA ficou indisponível.

Nenhum deploy, merge, push, alteração no WordPress, envio de mensagem ou criação de recurso externo faz parte da QA.

## Primeira tentativa preservada

Build `EhGjKhWh3MrOAe7ctJREj`, origem local `http://127.0.0.1:3002/`, sem banco nem flags de snapshot. A Home pública foi exibida e percorrida. As primeiras capturas foram arquivadas com prefixo `attempt1`, e o registro está em `visual-qa/metrics-attempt1.json`. Elas não pertencem à matriz final corrigida.

1. **V02 ainda aberto:** zero iframe no DOM, espaços dos dois mapas vazios. A revisão independente reproduziu a perda do segundo `src` causada por `navigationState` antes da sanitização. Evidência: `attempt1-home-1440-footer.png`.
2. **V07 parcialmente corrigido:** oito destinos corretos, mas sem numeração e com links azuis. A origem usa os wrappers/classes Elementor para o contador e a cor cinza. Evidências: `attempt1-artigo-1440-toc.png` e `source-artigo-1440-toc-detail.png`, recorte derivado da captura histórica, sem modificar a original.
3. **V06 parcialmente corrigido:** avaliações visíveis, mas sem “Leia mais” e sem “12 meses atrás”. A origem mostra esses elementos; o widget local tem 238 px versus aproximadamente 257,6 px da origem. Evidências: `attempt1-home-1440-reviews-detail.png` e `source-home-1440-reviews.jpg`.

A capa do artigo foi confirmada proporcional, 730,5×804,328 px no desktop, encerrando a causa de recorte de V03 nessa largura. A coleta das outras 23 combinações foi adiada para o build que corrige os três pontos acima. As métricas finais serão obtidas **antes** da captura `fullPage`, registrando também `clientWidth`, para evitar atribuir à aplicação diferenças de scrollbar de 15 px observadas no IAB.

## Revalidação parcial após mapas, sumário e avaliações

As 18 coletas em `metrics-after-fix.json` contêm duas iframes de mapas por documento, sem overflow horizontal. Os arquivos `after-fix-<família>-<largura>-top|middle|footer|full.png` preservam os estados reais observados. A Home desktop tem header, corpo e footer com alturas iguais à referência, descontando a barra WordPress; o widget de avaliações voltou a 257,6015625 px. Os oito autores/datas e os cinco controles “Leia mais” estão presentes.

Interações verificadas pelo navegador:

- Menu móvel abre e fecha com ícones visíveis; Especialidades revela seus seis links.
- FAQ abre a resposta “Vocês atendem apenas pacientes com catarata?” por Enter, com `aria-expanded=true`.
- Avaliação longa: Enter em “Leia mais” mostra texto completo e “Esconder”; Enter novamente recolhe. A fonte permanece 13,5 px, e `aria-expanded` acompanha o estado.
- Índice: oito destinos, numeração do counter e cor cinza do Elementor restauradas. Primeiro link chega a `#artigo-titulo`; o último chega a `#artigo-secao-13` com o título no topo da viewport. Recolher/reabrir funciona, mas o controle ainda conserva label/ícone de fechar quando recolhido; o integrador foi informado.

Os comparativos derivados `comparison-six-<largura>-top|footer.jpg` usam capturas existentes e não substituem originais. A captura `fullPage` do IAB pode alterar a largura útil e compor elementos fixos; a inspeção de top/middle/footer e as métricas anteriores ao fullPage são a referência para aparência.

### Largura útil e proveniência

A matriz local tem largura útil 375/753/1425 px nas viewports 390/768/1440 px, pois o IAB mantém scrollbar de 15 px. Parte da referência histórica foi medida sem essa scrollbar. O suplemento `metrics-home-client390-supplement.json` usa viewport 405 px/clientWidth 390 px para isolar essa variável: as duas alturas de headings com quebra adicional voltam exatamente às da fonte (151,1953125 e 16,796875 px), e header/corpo/footer também coincidem. Esse suplemento não entra como combinação 390 px da matriz.

A Home 1440 foi capturada no build `b3NMV1hZcISrGiyjLVZmH`. As coletas posteriores foram realizadas após o integrador confirmar `etYURM_X04FT_4vH5XDex` em 3002; o código público permaneceu igual nessa troca, que isolou somente o diretório de desenvolvimento do Supabase local. A closure antiga do REPL conservou a tag anterior em JSON, corrigida documentalmente com nota de proveniência. As capturas e medidas não foram alteradas.

## Segunda tentativa preservada — diferenças descobertas

Os dois registros desktop e arquivos Blog/Galeria do build `etYURM_X04FT_4vH5XDex` foram arquivados em `metrics-attempt2.json` e `attempt2-*`, sem entrar na matriz final corrigida.

1. **R06:** Blog usava números 1/2/3/26 e botão branco contornado, enquanto a fonte mostra somente “Carregar Mais” azul. Evidência: `attempt2-blog-1440-footer.png` e `source-blog-1440-pagination-detail.png`. O integrador delegou a restauração visual mantendo links SSR rastreáveis.
2. **R01/V04:** o CSS do kit impôs padding 20px 40px às miniaturas, dando largura 80 px e imagens internas 0×6 px. O código declarava 55×46, mas a aparência real era de botões azuis vazios. Evidência: `attempt2-galeria-1440-thumbs-bug.png`. A faixa e as setas aguardam regras com especificidade correta. A conferência posterior da hierarquia fonte também revelou o wrapper 59×50/padding2, borda branca selecionada e overlay das inativas, em vez do outline azul que o código inicial introduziu.
3. **V04:** o lightbox mostrou imagem e legenda corretas, porém as setas receberam o mesmo padding/azul e mediram 80×50; o foco da toolbar ficou rosa. Zoom expandiu 980×523 para 1960×1046, Share abriu overlay vazio, Escape fechou somente Share e depois fechou o viewer/restaurou foco. Fullscreen não mudou viewport nem `aria-pressed` por clique ou Enter. O integrador identificou a recusa da API para o elemento `dialog` e corrigirá seu alvo.
4. **R07/V01:** caret de Especialidades no rodapé desktop ausente; o integrador identificou a classe dinâmica HFE faltante e restaurará a classe que ativa o glifo original.

## Retomada interrompida por indisponibilidade do navegador

O integrador anunciou o build `8avMsteJQGzH1vdwdY1Ev` em `http://127.0.0.1:3002/`, sem Docker, conectado ao banco exclusivo da clínica. Esse anúncio não é revalidação visual. A tentativa de retomar CUA reescreveu sua documentação e conferiu a superfície previamente selecionada ID 2. O navegador já não estava disponível; o inventário retornou `apps: []` e `browsers: []`. Nenhuma captura foi criada para essa compilação e nenhuma automação de navegador alternativa foi utilizada.

Naquele momento ficaram pendentes as seis combinações Blog/Galeria × 390/768/1440 e os estados finais. As 18 coletas anteriores, os suplementos e as duas tentativas foram preservados com proveniência; a retomada posterior abaixo fecha a cobertura com autoria distinta, sem apresentar as 24 combinações como uma única execução ou compilação.

A conferência adicional da origem de FAQ em clientWidth 1425 px manteve o header em 140,9296875 px, enquanto a coleta local anterior tem 133,9296875 px. Os corpos/rodapés têm alturas correspondentes; a diferença de 7 px no header não foi explicada somente pela scrollbar e permanece documentada sem causa confirmada. A origem e o build novo não foram modificados por esta QA.

Roteiro utilizado para a retomada, sem repetir as 18 combinações:

1. Percorrer Blog e galeria nas três larguras, salvar top/middle/footer/full e métricas antes do fullPage, anexando o build observado.
2. Blog: conferir “Carregar Mais” azul como controle visível, seguir o link SSR para a página seguinte e conferir alteração dos artigos.
3. Galeria: medir wrapper das miniaturas 59×50/padding2 e imagens 55×46/passo59, selecionadas com borda branca e inativas com overlay preto; setas 50×50 com SVG original. Escolher a última miniatura e avançar uma vez até o primeiro grupo. Rolar horizontalmente pelo input nativo e conferir o próximo grupo.
4. Lightbox: legenda, setas 55×50 pretas, foco sem rosa, Zoom/arraste, Share vazio/Escape, Fullscreen e restauração de foco.
5. Conferir caret Especialidades no rodapé desktop e label/ícone de abrir/fechar no índice, preservando os oito destinos.

### Diagnósticos concretos antes da nova compilação

As métricas preservadas isolam a diferença do header FAQ: a logo tem dimensões idênticas, mas a origem usa `display:inline`, enquanto a versão local usa `inline-block`. Somente FAQ apresenta esse estado inline da logo nas referências; as outras famílias usam inline-block. O integrador confirmou a diferença pelo CUA atual e restaurará a baseline inline exclusivamente para o template 3067, sem compensar por padding fixo. Em tablet, outro item limita a altura do header e a mudança não causa o mesmo delta.

Os traçados das setas do carrossel fonte foram observados como polígonos SVG/viewBox512 em uma caixa de 40×40, dentro de controles 50×50/padding5, fundo branco/traçado #2a367a; hover ativa fundo #0099f9/traçado branco. `source-gallery-controls-final.json` preserva a coleta independente desse agente. O lightbox ainda tinha caracteres Arial ‹/› no código; o integrador informou que portará também o SVG original antes do próximo build. A aparência efetiva continuará dependendo das novas capturas CUA.

## Cobertura concluída com a sessão CUA do integrador

O navegador do integrador permaneceu disponível enquanto a superfície deste agente estava vazia. Ele capturou seis combinações reais de Blog/Galeria no build `7Nr270cFVGeZkuvIHvcQs`, preview 3002 conectado ao banco da clínica e sem Docker. Antes de substituir essas capturas, arquivou os seis registros e 24 PNGs em `visual-qa/before-css-layout-7Nr270cFVGeZkuvIHvcQs/`. Após corrigir duas regras de CSS, repetiu somente essas seis combinações no build `LT5XtX2XqdFBQDKFelcC9`.

`metrics-final-root.json` conserva os seis registros atuais com `collectorAgent: /root`; eles substituíram somente Blog/Galeria em `metrics-after-fix.json`, preservando semanticamente os 18 registros anteriores. A matriz tem 24 combinações únicas e 96 PNGs top/middle/footer/full. Não são 24 coletas do build novo, nem 24 operações de navegador deste agente.

A captura Galeria 390 de LT5 também foi preservada em `before-focus-fix-LT5XtX2XqdFBQDKFelcC9/`, antes da correção de foco. Somente esse registro e seus quatro PNGs foram substituídos por HPDT; os outros 23 registros permaneceram intactos naquela etapa. Depois, as três coletas de Galeria foram substituídas por HUHe para conferir a camada da foto principal. Os 12 PNGs e três registros anteriores estão em `before-main-hover-HPDTG2USRXNtqhWS5CzVn/`; apesar do nome da pasta, as métricas preservam seus IDs reais: HPDT em 390 e LT5 em 768/1440. A última integração preservou semanticamente os outros 21 registros, incluindo os 18 deste agente.

Os primeiros TOPs HUHe de 390/1440 capturaram uma transição entre fotos. Esses frames foram preservados em `after-fix-galeria-390-top-transition-HUHe.png` e `after-fix-galeria-1440-top-transition-HUHe.png`. Somente os dois TOPs canônicos foram recapturados com Enter na miniatura 0, foco pausando autoplay e scroll assentado. `final-gallery-settled-HUHe.json` confirma `scrollLeft=0`, primeira foto alinhada à faixa, seleções 0 no celular/0,1,2 no desktop e scroll vertical 0. A inspeção dos novos PNGs confirma um/três painéis inteiros. O outline branco 2 px é o foco de teclado intencional; não é prova de hover.

| Família | 390×1000 | 768×1000 | 1440×1000 | Proveniência |
|---|---|---|---|---|
| Home | registrada | registrada | registrada | agente QA, b3NM/etY |
| Equipe | registrada | registrada | registrada | agente QA, etY |
| Exames | registrada | registrada | registrada | agente QA, etY |
| Catarata | registrada | registrada | registrada | agente QA, etY |
| Artigo | registrada | registrada | registrada | agente QA, etY |
| FAQ | registrada | registrada | registrada | agente QA, etY; baseline final suplementar 7Nr |
| Blog | registrada | registrada | registrada | root, LT5; revisão independente de arquivos |
| Galeria | registrada | registrada | registrada | root, HUHe nas três larguras; revisão independente de arquivos |

As seis novas coletas têm largura útil 375/753/1425 px e duas iframes de mapas em cada documento. Todas as imagens registradas carregaram. Comparando headings por texto **e ordem de ocorrência** (há dois “Endereços”), não há diferenças de fonte, tamanho ou cor. O comparativo derivado fica em `metrics-final-root-comparison.json`; ele não modifica a fonte histórica.

Inspeção dos PNGs finais mostrou miniaturas com imagens reais, selecionadas claras/borda branca e inativas escurecidas; três painéis em tablet/desktop e um por grupo no celular. O foco rosa móvel foi corrigido e a evolução está preservada abaixo. O footer desktop mostra o caret Especialidades restaurado. Blog voltou a ter apenas “Carregar Mais” azul no estado inicial, eliminando os números e o contorno novos. A primeira restauração ainda apresentava fonte 14 px/linha 21 px/altura 61 px: uma regra do jkit, mais específica, superava os tokens originais. O seletor corrigido preserva os tokens e vence essa regra. `final-blog-button-computed.json` confirma Inter, 16 px/linha 16 px/padding 20×40 px/altura 56 px/largura 216,1484375 px, iguais à origem em `source-blog-button-computed.json`. O corpo desktop voltou a **2360,7109375 px**, igual à referência, encerrando R06.

A prova suplementar `after-fix-faq-image-baseline.json` em 1440×1000/client1425 confirma display inline/baseline da logo e header **140,9296875 px**, iguais a `source-faq-image-baseline.json`, encerrando a causa dos 7 px. Os registros anteriores de FAQ permanecem como evidência anterior à correção.

A geometria adicional `source-gallery-geometry.json` separa a altura do elemento IMG da área efetivamente visível: coleção 520 px, spacing 9 px, miniaturas 50 px, área visível **456,5 px**; o IMG original arredonda para 457 px e é recortado pela área. O CSS foi corrigido a partir dessa fórmula (520−50−1,5×9), substituindo o cálculo que resultava em 454 px. As três coletas finais registram área visível **456,5 px**, encerrando a causa desse desvio sem inventar compensação fixa de 3 px. A redução maior da altura total de galeria/artigo vem da remoção de comentários/formulário expressamente aprovada; não é perda silenciosa de conteúdo.

`final-gallery-image-navigation.json`, coletado pelo integrador em 390 px, registra os 11 índices/fotos carregados após navegar pelas miniaturas. A rodada HUHe repetiu esse percurso nas três larguras antes de recolher a matriz: 24/24 elementos IMG carregados por página (incluindo miniaturas/logos), alturas totais 2322/1808/1243 px e `scrollWidth=clientWidth` 375/753/1425 px. Isso não equivale a uma validação de gesto nativo de swipe.

## Estados interativos finais — provas do integrador revisadas

As provas abaixo foram obtidas por CUA no build `7Nr270cFVGeZkuvIHvcQs`. As alterações posteriores de LT5 foram somente CSS do botão de blog e altura da galeria; os arquivos conservam o ID real, sem relabelar estados antigos como execução nova.

| Estado | Prova observada | Arquivo |
|---|---|---|
| Última miniatura → próxima | Seleção 9/10, depois 0/1/2; a leitura imediata de scroll captura animação, e a leitura posterior retorna a 0 | `after-fix-gallery-states.json`, `after-fix-lightbox-fullscreen.json` |
| Miniaturas | Wrapper 59×50; selecionadas com borda branca 2 px/overlay 0; inativas overlay 1 | `after-fix-gallery-states.json` |
| Lightbox e Fullscreen | Setas/SVG 55×50, entrada `:fullscreen=true` e `aria-pressed=true`; saída ambos false | `after-fix-lightbox-fullscreen.json`, `.png` |
| Zoom | Imagem com largura 1960 px e estado ativo | `after-fix-lightbox-other-states.json`, `after-fix-lightbox-zoom.png` |
| Share e Escape | Overlay sem links; primeiro Escape mantém viewer; segundo fecha e restaura foco em Consultorio 2 | `after-fix-lightbox-other-states.json` |
| Índice | Recolhido oculta corpo/controle de fechar e mostra abrir; expandido inverte; zero anchors aninhados | `after-fix-toc-states.json` |

O bridge DOM não representa `fullscreenElement` consistentemente nesse host; a prova usa pseudoclasse e ARIA, além da captura real. A screenshot fullscreen usa a superfície nativa do IAB e não demonstra igualdade física de viewport com a origem. A fronteira compacta da origem (<500 px de largura útil, setas ocultas) fica registrada em `source-lightbox-compact-boundary.json`.

`final-faq-header.json` revalida o header FAQ em LT5: **140,9296875 px** em viewport 1440/client1425, confirmando a correção suplementar. `final-footer-menu.json` registra o glifo desktop original U+F107/Font Awesome 5 Free/14 px.

## Últimos achados e evolução

1. **Foco da miniatura em 390 px — encerrado:** a captura LT5 preservada mostrou fundo/borda rosa na miniatura 0, confirmados em métricas rgb(204,51,102); também capturou uma transição parcial entre fotos. Uma regra de reset do tema para botão com foco/hover empatava com a regra base da miniatura. `final-gallery-focus-HPDT.json` confirma fundo transparente por clique e teclado, borda 0, foco visível com outline branco de 2 px; as 11 fotos carregaram. O painel assentado e a miniatura sem rosa foram conferidos em HPDT e novamente nos TOPs HUHe. A matriz conserva HUHe; a prova específica de clique/teclado conserva HPDT.
2. **Menu principal do rodapé móvel — causa corrigida:** a primeira prova tinha toggle expandido, `menuDisplay=null` e nenhum link visível. A origem usa NAV HFE **vertical**, enquanto o handler só reconhecia horizontal. `final-hfe-states-HPDT.json` registra abertura em 390/768, nav de altura 0→256 px, ARIA/foco dos links, fechamento e reabertura; o ícone muda para o close original. Os PNGs correspondentes comprovam que os links principais aparecem.
3. **Submenu do rodapé — encerrado com prova HUHe:** `final-hfe-390-open-HPDT.png` e `final-hfe-768-open-HPDT.png` mostravam Especialidades com itens sobrepostos aos links e endereços. A altura do nav permanecia 256 px quando a lista de 250 px abria; somente `visibility=visible` não comprovava o fluxo. A observação adicional `source-hfe-mobile-submenu.json` e `.png` confirmou NAV com classes `hfe-dropdown menu-is-active`, posição absoluta/z9999/altura 554 px e UL `sub-menu-open` com posição **relativa**/altura 250 px/transição 0,3s. `final-hfe-states-HUHe.json` e os dois PNGs 390/768 mostram nav 304→554 px, UL 250 relativa, itens seguindo o fluxo dentro do menu, abertura do menu/submenu e fechamento nas duas larguras, além de reabertura conservando o submenu em 390 px, com controle de ARIA/foco. A prova HUHe não inclui reabertura em 768 px. O dropdown fonte sobrepõe endereços/mapas, tem fundo transparente e texto #343434; a versão final preserva essas propriedades observadas, sem redesenhar a cor. A regressão era a sobreposição entre itens do próprio menu e as classes/medidas faltantes.
4. **Interação Carregar Mais — encerrada com prova HUHe:** a spec pede preservar interações existentes e também garantir descoberta SSR. `source-blog-load-more.json` comprova que um clique na origem mantém `/blog/` e os seis posts, anexando três novos na ordem original (6→9). O link SSR visível estava substituindo a lista por outra página. `final-blog-load-more-HUHe.json` e `.png` registram clique 6→9, Espaço 9→12 e Enter 12→15, sempre na mesma `/blog/`, mantendo os três posts recentes. Os primeiros nove títulos têm ordem idêntica à prova da origem. O controle conserva href rastreável, processa lotes de três e anuncia `role=button` na versão aprimorada; os links SSR continuam disponíveis. `enter-completed` significa conclusão daquela requisição, não esgotamento dos 153 artigos. Falha de rede e fim do acervo não foram exercitados no navegador desta QA; fallback/cleanup têm testes de código registrados pelo integrador.

O gesto horizontal nativo seguido de seta ainda não foi demonstrado por uma sequência de entrada real no navegador. Esta QA não o declara aprovado com base somente em testes de código. Não se afirma igualdade de pixels em todos os URLs, nem validação de autenticação ou publicação hospedada.

### Camada de hover da foto principal

O esbranquiçamento de uma captura histórica não foi tratado como prova de hover branco. `source-gallery-main-hover.json` mediu oito overlays reais: fundo rgba(0,0,0,0.4), opacity 0,01 no estado sem hover. O stylesheet original usa opacity 1 na classe hover e transição 0,45s. A versão HUHe porta essa regra em `::after` no link da foto, sem alterar sua geometria; o estado normal opacity 0,01 foi confirmado na coleta. Esses dados comprovam regra e estado, não uma sequência nativa de entrada/saída do mouse. Esta QA não declara o gesto de hover nem o arraste no Zoom aprovado sem a prova correspondente.

## Fechamento da rodada

O relatório consolida 24 combinações únicas, 96 PNGs canônicos e 48 iframes de mapas, com proveniência por registro. O comparativo das seis coletas do integrador não encontra diferença de fonte, tamanho ou cor dos headings; todas as imagens registradas nessas seis páginas carregaram e nenhuma página da matriz apresentou overflow horizontal. As correções foram conferidas por família e por provas suplementares, preservando as tentativas anteriores.

A cobertura visual é amostral por oito famílias e três larguras. Swipe nativo seguido de seta, entrada/saída de hover, arraste de Zoom, falha de rede/fim do acervo e aceite visual de cada URL não foram demonstrados por esta rodada. Auth, Storage, implantação hospedada e publicação ficam fora deste relatório. Nenhuma conclusão aqui autoriza merge ou deploy.
