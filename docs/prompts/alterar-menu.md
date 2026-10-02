# P05 — Alterar menu

**Meu pedido:** [inserir/remover/reordenar/renomear] item [rótulo], destino [URL], posição [local], submenu [se houver].

Leia `docs/research/site-audit.md`, `docs/research/routes.csv` e `docs/migration/content-and-seo.md`. Localize a única fonte real do menu e seu comportamento em desktop/mobile. Confirme o destino e verifique se a página existe antes de adicionar link.

Mostre a ordem/estrutura antes e depois, com dropdown e menu mobile. Pergunte se o pedido altera apenas o rótulo ou também a URL. Remover link do menu não significa apagar página; mudança de URL requer decisão própria e redirect.

Após aprovação, altere somente o necessário. Confira navegação, foco/teclado, touch, item ativo, links e todas as larguras relevantes. Atualize mapa de navegação e instruções de manutenção. Entregue diff e reversão, sem publicar código.

## Arquivos na aplicação implementada

Leia `docs/implementation/plan.md`, `docs/implementation/progress.md`, `docs/operations/local-setup.md` e o relatório do módulo antes de alterar código. Site público: `src/lib/public/`, `src/components/public/`, `src/app/(public)/[[...path]]/`. Admin: `src/app/admin/`, `src/components/admin/`. Banco/servidor: `supabase/` e `src/lib/server/`. Os modelos canônicos estão em `src/lib/domain/types.ts`.

`data/wordpress/` é evidência de origem e importação; não alterar silenciosamente o baseline nem regenerar hashes para esconder diferenças. Mudanças institucionais aprovadas usam `content/site-overrides.json` e os componentes públicos, preservando a captura original. Páginas adicionais entram em `additionalPages` com HTML/metadata/estilos e links rastreáveis; confirmar slug/menu/texto antes de salvar. Posts, aviso e WhatsApp usam o admin/banco.

Pergunte os detalhes da mudança e obtenha confirmação do conteúdo/visual proposto. Entregue diff e validações. **Não realizar merge, push que dispare hosting ou deploy.** Comentários e formulário estão removidos por decisão de Gabriel; não recriar sem novo pedido. Supabase deve ser exclusivo da clínica; nunca LifeWallet.

## Interações preservadas

O header usa Elementor Nav Menu; o rodapé usa HFE vertical e tem toggle também em tablet/mobile. Leia `src/components/public/Interactions.tsx`, `docs/validation/hfe-source-layout.md` e `docs/validation/visual-qa-final.md`. Preserve as classes originais de abertura/dropdown/submenu, ícones, posicionamento/altura e `aria-expanded`. Confira a geometria dos links após abrir: visibilidade ou mudança do botão sozinhas não comprovam um menu correto. Teste fechar/reabrir, estado do submenu, foco e Enter/Space em 390/768/1440px. A origem usa dropdown sobre os endereços, com fundo transparente; alterar esse desenho ou suas cores exige um pedido próprio, sem introduzir um redesign na migração.
