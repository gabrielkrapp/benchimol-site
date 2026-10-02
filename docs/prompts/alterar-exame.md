# P02 — Alterar exame ou especialidade

**Meu pedido:** [exame/especialidade], página [URL], alteração [texto/imagem/inclusão/retirada] e conteúdo aprovado [material].

Leia `docs/research/pages.csv`, `docs/research/site-audit.md` e `docs/migration/content-and-seo.md`. Identifique todos os lugares que mencionam esse item: página, cards, FAQ, menu, metadados e links internos. Não reescrever orientação médica por conta própria.

Peça texto validado pela clínica e esclareça se muda apenas apresentação ou serviço oferecido. Se retirar uma página ou mudar slug, explique impactos e proponha destino equivalente sem apagar histórico; aguarde a decisão. Diferencie post do blog e página institucional, especialmente colisões já registradas como `/cirurgia-refrativa/`.

Mostre conteúdo antes/depois e URLs afetadas, aguarde aprovação, preserve o padrão visual e atualize só o escopo autorizado. Valide links, metadados, menu mobile e destino de rotas. Documente a mudança e reversão; entregue código para revisão sem merge/deploy.

## Arquivos na aplicação implementada

Leia `docs/implementation/plan.md`, `docs/implementation/progress.md`, `docs/operations/local-setup.md` e o relatório do módulo antes de alterar código. Site público: `src/lib/public/`, `src/components/public/`, `src/app/(public)/[[...path]]/`. Admin: `src/app/admin/`, `src/components/admin/`. Banco/servidor: `supabase/` e `src/lib/server/`. Os modelos canônicos estão em `src/lib/domain/types.ts`.

`data/wordpress/` é evidência de origem e importação; não alterar silenciosamente o baseline nem regenerar hashes para esconder diferenças. Mudanças institucionais aprovadas usam `content/site-overrides.json` e os componentes públicos, preservando a captura original. Páginas adicionais entram em `additionalPages` com HTML/metadata/estilos e links rastreáveis; confirmar slug/menu/texto antes de salvar. Posts, aviso e WhatsApp usam o admin/banco.

Pergunte os detalhes da mudança e obtenha confirmação do conteúdo/visual proposto. Entregue diff e validações. **Não realizar merge, push que dispare hosting ou deploy.** Comentários e formulário estão removidos por decisão de Gabriel; não recriar sem novo pedido. Supabase deve ser exclusivo da clínica; nunca LifeWallet.
