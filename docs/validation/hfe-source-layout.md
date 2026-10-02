# Menu HFE: estados da origem e correção focal

Registro de 01/10/2026, atualizado em **22:14:12 UTC**. Escopo: menu HFE do rodapé; o menu Elementor do cabeçalho conserva seu próprio comportamento. Não houve alteração de CSS, textos, cores ou conteúdo.

## Evidência da origem

- [Submenu aberto, JSON](visual-qa/source-hfe-mobile-submenu.json), capturado em `2026-10-01T22:00:59.218Z`, e [imagem correspondente](visual-qa/source-hfe-mobile-submenu.png): viewport 390×1000, largura útil 375px. O nav possui `hfe-dropdown menu-is-active`, posição absoluta, largura 335px, altura 554px e inline `width: 335px; left: 0px; z-index: 9999;`. O UL possui `sub-menu-open`, `position: relative`, `height: auto`, visibilidade/opacidade ativas e `transition: 0.3s`; sua altura observada é 250px. Os links comuns têm cor `#343434`, padding vertical 8px e fundo transparente. Esses estilos pertencem à origem, inclusive quando sobrepõem visualmente os blocos seguintes.
- [Nav recolhido, JSON](visual-qa/source-hfe-mobile-closed.json), capturado em `2026-10-01T22:01:33.078Z`: nav sem `menu-is-active`, altura zero e inline `width: auto; left: 0px; z-index: 0;`. O UL continua com `sub-menu-open` e os estilos de expansão. Portanto, recolher o nav não deve apagar a expansão de Especialidades.
- [Estado anterior HPDT](visual-qa/final-hfe-states-HPDT.json) e [imagem anterior em 390px](visual-qa/final-hfe-390-open-HPDT.png) mostravam nav no fluxo normal, com 256px, e submenu absoluto sobre os links seguintes. As classes HFE necessárias não estavam sendo aplicadas.

O recorte JSON não contém a classe do toggle. A regra capturada em `public/legacy-assets/elementor-restored/9cdc8e6687798628/frontend.css` associa `.hfe-active-menu.hfe-active-menu-full-width + nav` à posição absoluta e a `top: 100%`. Essa classe foi usada para ativar o mecanismo existente. A folha original `elementor-restored/8af7a853ff04c8f7/post-55.css` aplica cor e padding aos links de `nav.hfe-dropdown`; não foi criada uma regra visual alternativa.

## Desenho aplicado

`Interactions.tsx` aplica `hfe-dropdown` apenas no layout recolhido e `menu-is-active`/`hfe-active-menu-full-width` apenas quando aberto nesse layout. A largura vem da medida do contêiner do menu, recalculada ao redimensionar; 335px não foi fixado no código. Nav fechado mantém width auto e z-index zero. Acima do breakpoint, width/left/z-index inline originais são restaurados e as classes de dropdown são removidas.

Especialidades aberto no layout recolhido recebe `sub-menu-open`, posição relativa e transição de 0,3s. Recolher o nav preserva essa expansão, mas marca o conteúdo oculto com ARIA e remove seus links do Tab; reabrir o nav devolve o acesso. O controle devolve o foco ao toggle se o foco estava dentro do nav recolhido. Ao sair do layout recolhido, posição/transição originais do UL voltam a governar sua geometria; a expansão de conteúdo e o acesso por teclado são preservados. Não existe captura de UL aberto no desktop neste recorte, portanto não foi imposta a geometria móvel ao desktop.

O cleanup restaura os inline capturados para que a remontagem de efeitos do React StrictMode não trate estilos móveis temporários como os originais do desktop. O fechamento do menu Elementor do cabeçalho continua recolhendo seus próprios submenus.

## Verificação focal

Comando executado diretamente, sem pretest/global build:

```sh
npm exec vitest -- run tests/public/navigation.test.ts tests/public/interactions.test.ts
```

O ciclo RED inicial apresentou **6 falhas** por ausência das classes, posicionamento/medição e preservação de estado. Após a correção, os 15 testes existentes/expandidos passaram. A regressão adicional de StrictMode reproduziu **1 falha** (`width: auto` persistia ao voltar ao desktop); o cleanup corrigiu essa remontagem.

Resultado final: **2 arquivos, 16 testes, zero falhas**, exit 0; início `2026-10-01 19:13:56 America/Sao_Paulo` (`22:13:56 UTC`), duração **10,34s**. Navegação tem nove casos, incluindo 390/768px, CSS capturado, posição absoluta/relativa, cor/padding de link não selecionado, medição de largura, ciclo fechar/reabrir, Tab/foco/ARIA, resize e StrictMode. Interactions tem sete casos; o cabeçalho permanece coberto independentemente do rodapé.

JSDOM não mede layout nem aplica media queries automaticamente: o teste seleciona as regras reais compatíveis com cada viewport e fornece a largura medida do contêiner. Isso valida a cascata/estados e a acessibilidade, **não prova igualdade de pixels, altura real de 554px nem fidelidade visual final**. A conferência no navegador da aplicação corrigida fica com o agente principal. Não foram executados full suite, typecheck, build, Docker, escrita em Supabase ou deploy nesta tarefa.

## Complemento: conferência real do build HUHe

O integrador `/root` coletou [sete estados reais no navegador](visual-qa/final-hfe-states-HUHe.json) em `2026-10-01T22:22:31.146Z`, no build **`HUHevW-DGRcC9RbS-5oQu`**. O JSON completo e as imagens [390px](visual-qa/final-hfe-390-open-HUHe.png) e [768px](visual-qa/final-hfe-768-open-HUHe.png) foram lidos e inspecionados para este complemento. Esta evidência posterior encerra a pendência de geometria real dos estados móveis registrados acima; o resultado focal de 16 testes continua sendo o histórico daquela execução.

| Viewport / largura útil | Largura do nav | Nav aberto / com Especialidades / recolhido | UL expandido |
| --- | --- | --- | --- |
| 390 / 375px | 335px | 304 / 554 / 0px | 250px, posição relativa |
| 768 / 753px | 296,5px | 304 / 554 / 0px | 250px, posição relativa |

Nos dois tamanhos, o nav aberto é absoluto, com `hfe-dropdown menu-is-active`, left zero e z-index 9999. Abrir Especialidades acrescenta os 250px do UL ao próprio menu; seus itens seguem em sequência dentro dele. A expansão usa `sub-menu-open`, altura auto e transição de 0,3s. Os 14 links ficam com Tab zero quando o submenu está aberto.

Ao recolher, nos dois tamanhos o nav tem `aria-hidden=true`, todos os links têm Tab −1 e o foco está no toggle (`Menu`). O UL conserva `expanded=true`, sua classe e os estilos de expansão, mas recebe `aria-hidden=true`. A reabertura está capturada explicitamente em **390px**: nav volta a 554px, UL permanece expandido, ARIA volta a false e os 14 links voltam ao Tab zero. O JSON não contém um estado de reabertura em 768px, portanto não se atribui essa captura ao navegador. O ciclo fechar/reabrir também foi testado focalmente em 390px.

As imagens preservam o dropdown transparente e os links escuros `#343434` da origem. A sobreposição externa aos endereços e mapas, visível especialmente em 390px, pertence ao comportamento observado do site original. A correção eliminou a sobreposição entre os itens do próprio menu; não redesenhou o fundo ou as cores. Estas provas verificam os estados e medidas documentados, sem afirmar igualdade de pixels ou aceite visual de todas as páginas.

Resultado integrado comunicado pelo executor `/root`: **29 arquivos, 174 testes, zero falhas; typecheck e build HUHe PASS**. A tarefa deste complemento apenas anexou evidências existentes; não reexecutou checks nem alterou runtime, outros documentos, Docker ou backend.
