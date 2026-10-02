# P06 — Melhorar SEO de uma página

**Meu pedido:** página [URL], objetivo [problema/tema], dados aprovados [conteúdo] e fonte de desempenho [Search Console, se disponível].

Leia `docs/migration/content-and-seo.md`, auditoria e metadados do inventário. Compare estado atual do código com a origem e identifique problemas concretos. Verifique documentação oficial atual de framework e Google para qualquer recurso específico recomendado.

Inclua o requisito de leitura por IAs da seção 7.1 da spec: HTML textual sem dependência de JavaScript, semântica, JSON-LD coerente, descoberta por links/sitemap/paginação e acesso para crawlers legítimos de pesquisa/consulta. Diferencie pesquisa de treinamento. Não liberar bots de treinamento, alterar CDN/WAF ou publicar arquivos internos como consequência implícita de “melhorar SEO”. `/llms.txt` é complemento opcional, sem garantia de uso pelas plataformas.

O blog inicia com seis artigos e “Carregar Mais” acrescenta três por clique com JavaScript, conforme a origem. Preserve os links SSR, os marcadores de arquivo/página e o fallback de navegação em `src/lib/public/render.ts` e `src/components/public/load-more.ts`. O acervo precisa continuar descoberto sem executar esse enhancement; não substituir a paginação por uma lista disponível somente após clique/fetch.

Preserve as correções técnicas de 02/10/2026 em `docs/validation/corrections-2026-10-02/seo-ai.md`: exceção de crawl estrita `/api/media/` com APIs privadas ainda bloqueadas; `max-image-preview:large`; entidade geral `MedicalOrganization` e unidades `MedicalClinic`; `WebSite` na Home e breadcrumb de pelo menos dois itens nas páginas internas. Robots orienta crawlers e nunca substitui autorização/RLS. Não alterar políticas de treinamento para obter visibilidade em IA.

`src/lib/domain/imported-seo.ts` decodifica uma vez apenas campos comprovados do export WordPress em importação/snapshot. SEO escrito no admin é texto literal: manter `&`, `<`, `>` e sequências como `&hellip;` se assim digitadas. Não mover decode para `metadataForPost`/mappers genéricos nem aplicar correção em massa a posts já editados. O plano `buildLegacySeoRepairPlan` guarda ID WP, hash da origem, versão 1 e SEO anterior exato; qualquer reconciliação no banco exige o projeto exclusivo da clínica e evidência de que corpo, datas, versão e demais relações foram preservados.

O aviso ativo e dentro da agenda precisa constar no HTML inicial do dialog fechado e no fallback `noscript`, com o mesmo texto para visitantes e leitores automáticos. Preserve a regra de sessão por versão, modal, Escape/foco e término do período. Não expor aviso desativado, futuro ou expirado nem ativar aviso real para testar SEO.

Apresente title/description/canonical/structured data antes e depois e explique motivo. Não mudar texto visível, slug ou informação médica como consequência implícita de “melhorar SEO”. Pergunte quais mudanças editoriais são autorizadas. Não prometer posições, estrelas ou rich results.

Espere aprovação e valide HTML/meta/status/sitemap/links das rotas afetadas. Use dados reais das duas unidades e dos artigos. Documente decisões e o que precisa de acompanhamento futuro; não criar monitor/agendamento sem solicitação. Entregue diff e limites da validação sem merge/deploy.

## Arquivos na aplicação implementada

Leia `docs/implementation/plan.md`, `docs/implementation/progress.md`, `docs/operations/local-setup.md` e o relatório do módulo antes de alterar código. Site público: `src/lib/public/`, `src/components/public/`, `src/app/(public)/[[...path]]/`. Admin: `src/app/admin/`, `src/components/admin/`. Banco/servidor: `supabase/` e `src/lib/server/`. Os modelos canônicos estão em `src/lib/domain/types.ts`.

`data/wordpress/` é evidência de origem e importação; não alterar silenciosamente o baseline nem regenerar hashes para esconder diferenças. Mudanças institucionais aprovadas usam `content/site-overrides.json` e os componentes públicos, preservando a captura original. Páginas adicionais entram em `additionalPages` com HTML/metadata/estilos e links rastreáveis; confirmar slug/menu/texto antes de salvar. Posts, aviso e WhatsApp usam o admin/banco.

Pergunte os detalhes da mudança e obtenha confirmação do conteúdo/visual proposto. Entregue diff e validações. **Não realizar merge, push que dispare hosting ou deploy.** Comentários e formulário estão removidos por decisão de Gabriel; não recriar sem novo pedido. Supabase deve ser exclusivo da clínica; nunca LifeWallet.
