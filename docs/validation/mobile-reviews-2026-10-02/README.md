# Depoimentos da Home no mobile — 02/10/2026

Pedido de Gabriel: recuperar o card inteiro por vez mostrado no print do WordPress. O print da versão nova mostrava três cards estreitos, estrelas sobrepostas ao logo e autores truncados. Os prints fornecidos são a referência visual desta correção.

## Causa e patch

O CSS capturado Trustindex aplica `flex:0 0 33.333%;max-width:33.333%` ao container `ti-col-3`. A regra mobile genérica da aplicação tinha menor especificidade e alterava somente `flex-basis`, sem vencer o shorthand nem o limite de largura capturado.

Foi acrescentada uma regra em `src/components/public/public.css`, dentro de `@media(max-width:767px)`:

```css
.public-site.home .ti-widget.ti-goog .ti-col-3 .ti-review-item {
  flex: 0 0 100%;
  max-width: 100%;
}
```

O seletor fica restrito à Home e vence o CSS fonte nas duas ordens de carregamento. Acima de 767px o layout anterior permanece. Não houve mudança de textos, ordem, fotografias, cores, JavaScript, JSON capturado, guard de origem ou manifestos/hashes legados. O scroll existente percorre a largura do carrossel.

## Reprodução e navegador

Foi usado Chrome headless isolado com o HTML real produzido por `homeTemplate()`/`renderCapturedHtml()`, stylesheet capturado selecionado por `publicStylesheet()` e `public.css`. Fontes/imagens locais foram servidas por interceptação offline; recursos externos foram bloqueados. Nenhum servidor Next, container ou acesso ao banco foi necessário.

- [Antes](before.json): o teste de 393px falhou como esperado. Carrossel 353px, card 117,656px, três cards visíveis; nome truncado e estrelas sobrepostas ao logo. Os controles 768/1440px mantiveram três cards.
- [Depois](after.json):18/18 combinações passaram: 320/375/390/393/414/767/768/1024/1440px, cada largura nas duas ordens dos stylesheets. Até767px, card/carrossel=1 e um card visível; acima, três cards como antes. Nome completo e separação entre estrelas/logo no mobile. Oito cards, 40 estrelas e cinco controles Leia mais preservados em cada combinação.
- Nas 18 combinações, o documento não ganhou overflow horizontal e o scroll horizontal avançou uma largura do carrossel. Os JSON incluem as medidas, scroll e hashes dos arquivos fonte para vincular as provas ao patch.
- Revisão independente: dez combinações estáticas de especificidade/ordem/limite/escopo sem achados; outras páginas e os arquivos de interação/captura/guard permanecem iguais ao HEAD de origem.

| Antes, 393px | Depois, 393px |
|---|---|
| ![Três cards espremidos](before-393.png) | ![Um card inteiro](after-393.png) |

Os screenshots recortam o widget, sem incluir interface do celular. A fixture offline valida a cascata e a geometria reais; não substitui teste em Safari/iPhone físico nem comprova publicação do patch.

## Checks locais e entrega

Os [checks finais](checks.json) registram 301/301 testes em 51 arquivos, zero falhas, exit0 ([relatório completo](tests.json)). TypeScript: `node node_modules/typescript/bin/tsc --noEmit`, exit0. `git diff --check`, exit0. `npm run build` passou, build `WC7c6tnu8lt3B80EPfItr`; a regra está no chunk CSS compilado e a geração manteve o hash do stylesheet capturado usado na validação visual. Foram preservadas as alterações locais anteriores da tarefa de variáveis Vercel, fora do escopo deste patch.

Gabriel solicitou commit na main e novo deploy. A revisão automática bloqueou a etapa de publicação, citando a regra permanente de não realizar merge/deploy. Este patch e suas provas ficam preparados para revisão; não usar push, API, scripts ou outra ferramenta para contornar esse bloqueio.

## Conferência após publicação pelo usuário

1. Abrir a Home em393px e chegar aos depoimentos. Conferir card inteiro, nome/data, estrelas/verificação à esquerda e Google à direita.
2. Arrastar horizontalmente até o segundo card; usar Leia mais/Esconder e conferir os oito depoimentos.
3. Conferir 767px e 768px para confirmar o limite; comparar 1440px com o desktop anterior.
4. Conferir o SHA da revisão efetivamente publicada. Env nova no projeto Vercel não altera um deployment antigo.

Rollback local: remover apenas a regra específica acima. Não substituir a captura nem seus hashes e não reimportar conteúdo.
