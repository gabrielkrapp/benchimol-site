# QA visual independente — rodada 1

**Data:** 30/09/2026, concluída às 22:40 BRT (01/10/2026 01:40 UTC). **Resultado:** a produção local inicial ainda não atende ao aceite de fidelidade. Foram comprovadas sete diferenças materiais e encaminhadas ao implementador. Este relatório registra o build anterior às correções; precisa de revalidação após o próximo build.

## Ambiente e método

- Origem: `https://clinicadeolhosbenchimol.com.br/`; aplicação: `http://127.0.0.1:3000/`, servidor Next.js de produção local iniciado por Gabriel/Codex, com snapshot público explicitamente habilitado. Não houve deploy, merge, alteração do WordPress, login, envio de mensagem ou criação de recurso externo nesta QA.
- CUA/IAB, uma aba por vez, viewport **390×1000, 768×1000 e 1440×1000**. `innerWidth` foi conferido em cada registro. O uso inicial de duas abas revelou que o override só afetava a aba selecionada; as referências de artigo afetadas foram substituídas por capturas conferidas em uma única aba. O arquivo final tem zero divergência de viewport.
- Cada página foi percorrida em passos de uma tela para carregar imagens e animações. Foram salvos topo, bloco intermediário, rodapé e página inteira. A coleta final tem **48 registros de página percorrida** (8 famílias × 3 larguras × origem/local), **201 capturas JPEG**, métricas DOM e dois complementos públicos de widgets.
- A origem mostrou uma sessão WordPress existente com barra de ferramentas: 32 px em desktop e 46 px nos viewports menores. Essa barra não pertence ao site migrado e seu deslocamento foi descontado na análise. Imagens da barra administrativa foram excluídas das métricas persistidas. Nenhuma credencial foi registrada nos arquivos de QA.
- Comparação de hierarquia visível, identidade, texto, fontes, tamanhos, recortes, larguras, espaçamentos, cards, CTAs, blocos intermediários e rodapé. Estados de carrossel/galeria podem variar pelo autoplay. Não houve uma medição automatizada de diferença de pixels; não se declara equivalência pixel a pixel.

## Cobertura

Todas as linhas abaixo possuem referência e versão local nas três larguras, com percurso até o rodapé. Os arquivos usam `source|local-<família>-<largura>-top|middle|footer|full.jpg` em [visual-qa/](visual-qa/). As métricas estão em [metrics.json](visual-qa/metrics.json).

| Família | Caminho público | Observação da primeira rodada |
|---|---|---|
| Home | `/` | Hero, identidade e textos principais próximos da referência; avaliações invisíveis e rodapé comprimido |
| Blog | `/blog/` | Cards, imagens, textos e barra lateral presentes; ícones e rodapé divergem |
| Equipe | `/equipe/` | Fotos, perfis, ordem e blocos conferidos; ícones e mapas do rodapé divergem |
| Exames | `/exames-e-procedimentos/` | Lista, texto e imagem principal conferidos; ícones e mapas do rodapé divergem |
| Especialidade | `/catarata/` | Banner, conteúdo completo e fotografia conferidos; ícones e mapas do rodapé divergem |
| Artigo | `/o-que-e-o-mapeamento-da-retina-e-quando-esse-exame-oftalmologico-e-indicado/` | Corpo e autoria presentes; capa recortada e índice com itens diferentes |
| FAQ | `/faq-perguntas-frequentes/` | Perguntas, respostas e expansão conferidas; ícones e mapas do rodapé divergem |
| Galeria | `/pgc_simply_gallery/copacabana/` | Onze imagens preservadas e lightbox funcional; layout e controles divergem materialmente |

## Diferenças comprovadas

| ID | Diferença | Evidência e condição para revalidação |
|---|---|---|
| V01 | Ícone mobile aparece como quadrado; seta de Especialidades desaparece | [Origem mobile](visual-qa/source-home-390-top.jpg) / [local mobile](visual-qa/local-home-390-top.jpg). `.eicon-menu-bar::before` usa U+E816, família `eicons`, peso 400. A origem apresenta hamburger branco e caret Font Awesome U+F0D7/peso 900. Conferir menu aberto/fechado, desktop e mobile após correção. |
| V02 | Os dois mapas do rodapé foram removidos do DOM local | [Rodapé origem](visual-qa/source-home-1440-footer.jpg) / [local](visual-qa/local-home-1440-footer.jpg). Origem tem dois iframes `https://maps.google.com/maps?...&output=embed`, 247×206 px no desktop; local tinha zero iframe em todas as famílias inspecionadas. Restaurar somente os embeds públicos permitidos e conferir seu espaço/links. |
| V03 | Capa do artigo é cortada por altura fixa | [Origem artigo](visual-qa/source-artigo-1440-top.jpg) / [local](visual-qa/local-artigo-1440-top.jpg). Origem: 730,5×804,3 px desktop; 713×785,1 tablet; 335×368,9 mobile. Local: mesmas larguras com alturas 500/400/300 px. O implementador identificou a classe `wp-post-image` extra ativando limites do tema Hello; revalidar a classe/foto proporcional nas três larguras. |
| V04 | Galeria perdeu título, tamanho, slider e miniaturas originais | [Origem galeria](visual-qa/source-galeria-1440-top.jpg) / [local](visual-qa/local-galeria-1440-top.jpg). Origem mostra título Copacabana, container 1140 px, três fotos grandes e miniaturas; local mostrava título oculto, faixa horizontal de imagens pequenas e grande espaço branco. Configuração pública em [gallery-public-settings.json](visual-qa/gallery-public-settings.json): altura máxima 520, espaçamento 9, cantos 5, autoplay, 11 imagens. O [lightbox original](visual-qa/source-galeria-1440-lightbox.jpg) também difere do [modal local](visual-qa/local-galeria-1440-lightbox.jpg): toolbar Zoom/Share/Fullscreen/Close, overlay escuro, setas nas laterais e contador desabilitado na configuração de origem. |
| V05 | Rodapé ficou mais estreito e mudou quebras de texto | Origem `.elementor-55 .elementor-container`: primeiro 1405 px/x=10/max-width none; interior 1285 px/x=70. Local primeiro 1170 px/x=127,5; interior 1050 px/x=187,5. Classes fonte: seção superior `elementor-element-47fbf64a`, interiores `elementor-element-21487e55` e `elementor-element-74e5068`, todas `elementor-section-full_width`. Revalidar larguras e colunas, além dos mapas, em todas as larguras. |
| V06 | Depoimentos existem no HTML mas estão invisíveis | [Origem carregada](visual-qa/source-home-1440-reviews.jpg) / [local](visual-qa/local-home-1440-reviews.jpg). Widget fonte remove o estado de carregamento e mostra três cards: container 257,6 px, card 233,6 px, texto Trustindex Poppins 15 px/21,75. Local preservou `opacity:0;height:0!important;overflow:hidden!important` no widget, mantendo altura zero. Markup público carregado em [reviews-public-widget.html](visual-qa/reviews-public-widget.html), tratado apenas como dado. Revalidar presença visual, fotos, estrelas, nomes, texto, leitura expandida e controles nas três larguras; existência na AX/HTML não comprova visibilidade. |
| V07 | Índice do artigo usa seleção e sequência diferentes | Origem: oito links úteis, incluindo o título do banner e sete H2 do corpo; o nono link para comentários deve ser removido conforme decisão aprovada. Local: treze links, incluindo seis H3, excluindo o título. Isso aumenta a altura do índice em aproximadamente 128 px e muda numeração. Respeitar a configuração Elementor de headings; a promoção semântica do título para H1 não autoriza excluí-lo do índice. Revalidar seleção, ordem, numeração, fechamento e destino dos links. |

Os sete problemas foram comunicados durante a coleta. As evidências acima são do build inicial, não confirmam a eficácia das correções em andamento. A remoção aprovada de comentários/formulário explica parte da redução de altura no final de artigos e galerias e não é classificada como bug.

## Interações verificadas no build inicial

- **Menu mobile:** Enter abre e fecha o toggle; Enter em Especialidades abre os seis destinos preservados. [Menu](visual-qa/local-home-390-menu-open.jpg) e [submenu](visual-qa/local-home-390-submenu-open.jpg). O defeito do glifo continua registrado em V01.
- **FAQ:** Enter em “Vocês atendem apenas pacientes com catarata?” produz `aria-expanded=true`, painel `display:block` e o texto original, começando por “Atendemos tanto pacientes com catarata quanto todas as demais demandas oftalmológicas”. [Estado mobile](visual-qa/local-faq-390-expanded.jpg).
- **Galeria:** Enter no primeiro link abre o diálogo com 1/11; ArrowRight avança para 2/11; Escape fecha e devolve o foco ao link `/wp-content/uploads/2023/02/consultorio2.webp`. A funcionalidade não elimina a diferença visual V04.
- **Blog:** clique em “Página 2” abre `/blog/page/2/`, título “Blog — Página 2 — Clínica de Olhos Benchimol”, iniciando por “Por que a acuidade visual pode piorar com o avanço da idade?”. [Captura mobile](visual-qa/local-blog-390-page2.jpg). Há seis cards do arquivo e três da barra lateral, com links reais.
- **WhatsApp:** CTAs e ícone apresentam o número/mensagem observados. Não foi enviado WhatsApp nem acionado compartilhamento externo. A atualização com dados novos do banco precisa do projeto real da clínica.

## Limites e próxima rodada

Admin autenticado, mídia do Storage, alteração real de contato e popup ativo dependem do Supabase exclusivo da clínica; esta QA não simula login nem cria configurações para aparentar funcionamento. A política de CDN/WAF e o comportamento dos provedores externos só poderão ser confirmados na hospedagem publicada pelo usuário. A QA visual local não substitui a auditoria HTTP, os testes de autorização, reconciliação de conteúdo ou backup/restore.

Após as correções e um novo build, repetir a comparação nas mesmas larguras: cabeçalho/menu, mapa e colunas do rodapé, capa/índice do artigo, galeria/toolbar e avaliações. Como o tratamento de UCSS influencia regras globais, percorrer também os blocos intermediários das oito famílias novamente. Reutilizar as referências originais sem sobrescrevê-las; salvar a nova versão local com identificação `after-fix`.

A viewport temporária foi restaurada e todas as abas desta QA foram fechadas ao finalizar a rodada.
