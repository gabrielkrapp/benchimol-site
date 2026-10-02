# P01 — Alterar cor do site

**Meu pedido:** [elemento/área], de [cor atual se conhecida] para [cor desejada ou referência]. Abrangência: [uma área ou todo o site].

Leia `docs/research/site-audit.md` e `docs/migration/content-and-seo.md`, além das instruções base. Localize no código real onde a cor é definida e quais componentes a reutilizam. Se existir documentação de estilos, leia-a; caso contrário, descreva os tokens reais encontrados, sem inventar caminhos.

Pergunte qual cor/abrangência falta. Mostre onde a mudança aparecerá, estados hover/foco e implicação de contraste. Confirme se logotipo, fotografias e imagens com cor embutida ficam como estão; não recolorir esses assets por inferência.

Apresente prévia local ou proposta visual verificável e aguarde aprovação. Depois altere apenas as cores autorizadas, mantendo tipografia, layout e textos. Confira mobile/desktop e legibilidade, atualize documentação de estilos e entregue diff/reversão. Aplicam-se todas as proibições de publicação do prompt base.

## Arquivos na aplicação implementada

Leia `docs/implementation/plan.md`, `docs/implementation/progress.md`, `docs/operations/local-setup.md` e o relatório do módulo antes de alterar código. Site público: `src/lib/public/`, `src/components/public/`, `src/app/(public)/[[...path]]/`. Admin: `src/app/admin/`, `src/components/admin/`. Banco/servidor: `supabase/` e `src/lib/server/`. Os modelos canônicos estão em `src/lib/domain/types.ts`.

`data/wordpress/` é evidência de origem e importação; não alterar silenciosamente o baseline nem regenerar hashes para esconder diferenças. Mudanças institucionais aprovadas usam `content/site-overrides.json` e os componentes públicos, preservando a captura original. Páginas adicionais entram em `additionalPages` com HTML/metadata/estilos e links rastreáveis; confirmar slug/menu/texto antes de salvar. Posts, aviso e WhatsApp usam o admin/banco.

Pergunte os detalhes da mudança e obtenha confirmação do conteúdo/visual proposto. Entregue diff e validações. **Não realizar merge, push que dispare hosting ou deploy.** Comentários e formulário estão removidos por decisão de Gabriel; não recriar sem novo pedido. Supabase deve ser exclusivo da clínica; nunca LifeWallet.
