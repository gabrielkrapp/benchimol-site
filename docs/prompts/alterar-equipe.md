# P03 — Atualizar equipe médica

**Meu pedido:** [adicionar/editar/retirar] [nome], dados aprovados [nome, especialidade, CRM, biografia, foto, ordem].

Leia `docs/research/site-audit.md`, `docs/research/pages.csv` e `docs/migration/content-and-seo.md`. Localize elenco, card, biografia, links e referências institucionais. Há biografias antigas fora do menu: não removê-las porque deixaram de aparecer no elenco.

Solicite dados e foto autorizados ausentes. CRM e informação médica precisam vir da clínica. A divergência de Adriana entre elenco e bio deve ser confirmada com a clínica; não copiar número de outro médico nem corrigir por palpite.

Mostre proposta de card/biografia e destino de URL antiga quando houver retirada. Espere aprovação, preserve estilos/recorte/ordem fora do pedido e atualize referências pertinentes. Confira link da bio, mobile, alt da foto e SEO. Registre autoria/data da alteração e como reverter; entregue diff sem publicar código.

## Arquivos na aplicação implementada

Leia `docs/implementation/plan.md`, `docs/implementation/progress.md`, `docs/operations/local-setup.md` e o relatório do módulo antes de alterar código. Site público: `src/lib/public/`, `src/components/public/`, `src/app/(public)/[[...path]]/`. Admin: `src/app/admin/`, `src/components/admin/`. Banco/servidor: `supabase/` e `src/lib/server/`. Os modelos canônicos estão em `src/lib/domain/types.ts`.

`data/wordpress/` é evidência de origem e importação; não alterar silenciosamente o baseline nem regenerar hashes para esconder diferenças. Mudanças institucionais aprovadas usam `content/site-overrides.json` e os componentes públicos, preservando a captura original. Páginas adicionais entram em `additionalPages` com HTML/metadata/estilos e links rastreáveis; confirmar slug/menu/texto antes de salvar. Posts, aviso e WhatsApp usam o admin/banco.

Pergunte os detalhes da mudança e obtenha confirmação do conteúdo/visual proposto. Entregue diff e validações. **Não realizar merge, push que dispare hosting ou deploy.** Comentários e formulário estão removidos por decisão de Gabriel; não recriar sem novo pedido. Supabase deve ser exclusivo da clínica; nunca LifeWallet.
