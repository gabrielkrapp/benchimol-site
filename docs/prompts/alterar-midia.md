# P07 — Atualizar imagem ou PDF

**Meu pedido:** arquivo/elemento [qual], páginas afetadas [URLs], material autorizado [arquivo/origem] e objetivo [troca/correção].

Leia `docs/research/media.csv` e `docs/migration/content-and-seo.md`. Identifique usos, URL pública antiga, arquivo real e variantes. Peça o material aprovado se não estiver disponível; não substituir por foto gerada ou placeholder sem autorização.

Mostre novo recorte/proporção, alt/legenda e destino da URL antiga. PDFs com links externos/indexação não podem desaparecer. Verifique se mudança é só visual ou também documental e se todos os usos devem ser atualizados.

Após aprovação, preserve formato visual e continuidade dos links, valide qualidade/tamanho/legibilidade, mobile e referências. Não excluir arquivo ainda utilizado; guarde versão anterior ou manifesto de recuperação. Atualize documentação de assets e entregue diff, sem publicar código.

## Arquivos na aplicação implementada

Leia `docs/implementation/plan.md`, `docs/implementation/progress.md`, `docs/operations/local-setup.md` e o relatório do módulo antes de alterar código. Site público: `src/lib/public/`, `src/components/public/`, `src/app/(public)/[[...path]]/`. Admin: `src/app/admin/`, `src/components/admin/`. Banco/servidor: `supabase/` e `src/lib/server/`. Os modelos canônicos estão em `src/lib/domain/types.ts`.

`data/wordpress/` é evidência de origem e importação; não alterar silenciosamente o baseline nem regenerar hashes para esconder diferenças. Mudanças institucionais aprovadas usam `content/site-overrides.json` e os componentes públicos, preservando a captura original. Páginas adicionais entram em `additionalPages` com HTML/metadata/estilos e links rastreáveis; confirmar slug/menu/texto antes de salvar. Posts, aviso e WhatsApp usam o admin/banco.

Pergunte os detalhes da mudança e obtenha confirmação do conteúdo/visual proposto. Entregue diff e validações. **Não realizar merge, push que dispare hosting ou deploy.** Comentários e formulário estão removidos por decisão de Gabriel; não recriar sem novo pedido. Supabase deve ser exclusivo da clínica; nunca LifeWallet.

Na galeria SimplyGallery migrada, preserve agrupamento por largura, recorte, espaçamento, faixa de miniaturas e controles. A caixa clicável da miniatura é 59×50 px; a imagem interna é 55×46 px, com borda branca nas selecionadas e overlay escuro nas inativas. Confira também hover/foco: regras globais do kit não podem substituir esse estado por fundo rosa ou padding dos botões comuns. As evidências e medidas da origem estão em `docs/validation/visual-qa-final.md` e `docs/validation/visual-qa/`.


Preserve as correções de imagens e uploads de 02/10/2026 descritas em `docs/validation/corrections-2026-10-02/performance.md` e `security.md`: variantes de srcset com proporção coerente, dimensões reais, cache só para derivados imutáveis, decode integral com limites e bytes originais conservados. Não transformar uma operação editorial de mídia em expurgo de Storage.
