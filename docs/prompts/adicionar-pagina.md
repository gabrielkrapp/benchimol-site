# P04 — Adicionar página e opcionalmente menu

**Meu pedido:** página [nome], objetivo [finalidade], conteúdo aprovado [texto/assets], caminho desejado [URL] e menu [onde inserir, se necessário].

Leia spec, `docs/research/routes.csv`, `docs/migration/content-and-seo.md` e `docs/architecture/decisions.md`. Verifique rotas existentes e reservadas, inclusive slugs de posts na raiz. Não sobrescrever conteúdo para usar o slug preferido.

Pergunte só sobre conteúdo, título, posição de navegação e assets que faltarem. Proponha estrutura usando componentes/estilos reais do site. Mostre caminho, canonical, title/description propostos, itens do menu afetados e como o sitemap será atualizado. Nenhum texto clínico novo é inventado.

Espere aprovação e então implemente a página e a entrada de menu somente se solicitada. Verifique desktop/mobile, teclado, links, sitemap e metadata. Atualize documentação de páginas/rotas e biblioteca pertinente. Entregue prévia local e diff para revisão; merge/deploy ficam com o usuário.

## Arquivos na aplicação implementada

Leia `docs/implementation/plan.md`, `docs/implementation/progress.md`, `docs/operations/local-setup.md` e o relatório do módulo antes de alterar código. Site público: `src/lib/public/`, `src/components/public/`, `src/app/(public)/[[...path]]/`. Admin: `src/app/admin/`, `src/components/admin/`. Banco/servidor: `supabase/` e `src/lib/server/`. Os modelos canônicos estão em `src/lib/domain/types.ts`.

`data/wordpress/` é evidência de origem e importação; não alterar silenciosamente o baseline nem regenerar hashes para esconder diferenças. Mudanças institucionais aprovadas usam `content/site-overrides.json` e os componentes públicos, preservando a captura original. Páginas adicionais entram em `additionalPages` com HTML/metadata/estilos e links rastreáveis; confirmar slug/menu/texto antes de salvar. Posts, aviso e WhatsApp usam o admin/banco.

Ao acrescentar uma URL institucional, conferir também os posts atuais do banco e preparar a atualização de `reserved_routes`/seeds no pacote revisável. O renderer institucional tem precedência: não permitir que um post existente desapareça por colisão, nem que o admin publique futuramente nesse caminho. Não aplicar SQL remoto por iniciativa própria; entregar o pacote e suas instruções junto ao diff para execução autorizada. Gerar os estilos derivados e testar sitemap/rota/menu da página nova.

Pergunte os detalhes da mudança e obtenha confirmação do conteúdo/visual proposto. Entregue diff e validações. **Não realizar merge, push que dispare hosting ou deploy.** Comentários e formulário estão removidos por decisão de Gabriel; não recriar sem novo pedido. Supabase deve ser exclusivo da clínica; nunca LifeWallet.
