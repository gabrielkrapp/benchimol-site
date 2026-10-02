# Revisão independente de aderência à spec — 30/09/2026

Revisão estática de AGENTS, README, spec v0.5, admin, migração e código. Sem alteração de produto, acesso cloud, merge, push ou deploy. Build e UI de produção local ainda em validação pela implementação raiz; este relatório não afirma aceite visual ou CRUD hospedado. Os achados descrevem o estado lido e devem ser reavaliados depois das correções.

## Achados materiais

1. **P2 — URL canônica editável não chega ao HTML.** `src/lib/public/seo.ts:14–16` usa exclusivamente `canonicalPostPath(post)`, embora `PostEditor.tsx:58` ofereça canônica aprovada, `helpers.ts:87` a envie e o banco a persista. Os 154 canonicals da fonte são iguais às URLs originais; os aliases aprovados já têm regra específica. Uma canônica diferente salva no admin fica ignorada. Respeitar o campo validado, preservando canônica própria e aliases como defaults; conferir metadata e JSON-LD coerentes.

2. **P2 — Imagem usada somente no compartilhamento não tem referência protegida.** `supabase/schemas/03_storage.sql:5,10–11`, `01_editorial.sql:133–145` e `src/lib/server/admin-repository.ts:37–39` consideram apenas capa/corpo e suas revisões. Se uma mídia nova for usada apenas em `seo.ogImage`, sua URL pública é negada e a exclusão não é bloqueada. Incluir imagem SEO na referência publicada, validação/lock, histórico e lista de usos; não liberar a biblioteca inteira.

3. **P2 — Arquivo público `/simply_galleries/` fica sem destino.** `data/wordpress/routes.json` registra status 200 e título “Arquivo SimpLy Galleries”; o HTML bruto `docs/research/restored-2026-09-30-public/html/e9c9f848e881fa013226.body` apresenta o mesmo arquivo Blog com seis artigos, sem lista de galerias. `catalog.ts:36–49` não resolve esse caminho e o catchall procura um post até 404. Preservar esse arquivo equivalente ou registrar destino específico aprovado; não inventar conteúdo de galeria.

4. **P2 — Contato anterior não pode ser recuperado.** `docs/admin/functional-spec.md:90` exige recuperar a configuração anterior. `supabase/schemas/02_mutations.sql:71` substitui o valor atual sem revisão, e `SettingsForms.tsx:21–30` não oferece histórico/restauração. A versão otimista protege concorrência, mas não recupera número/mensagem errados já salvos. Preservar snapshots privados das alterações e permitir restaurar uma versão de contato.

5. **P2 — Override institucional da Home é ignorado no corpo.** `catalog.ts:20` combina `pageOverrides` e a metadata lê essa página combinada, mas `render.ts:109` obtém `site.homeHtml` diretamente. O caminho de manutenção documentado em `docs/prompts/base.md:19` permite editar páginas institucionais via override; aplicado a `/`, o texto visível permanece original. Fazer Home usar sua página combinada ou documentar/implementar uma fonte própria explícita para esse override.

6. **P2 — Documento ativo de migração mantém pendências já resolvidas.** `docs/migration/content-and-seo.md:3,21,28` ainda apresenta implementação/importação proibida sem distinguir execução remota, comentários sem decisão e 24 mídias faltantes. A spec autoriza implementação, remove comentários e reconcilia 551 mídias. Como os prompts apontam esse documento, sincronizar instruções atuais e manter os fatos antigos somente como histórico datado. README/setup ainda citam v0.4.

## Lacuna a reproduzir no ambiente administrativo

`src/components/admin/ui.tsx:16–28` protege links, fechamento da aba e evento de saída do painel, mas não Back/Forward do navegador. O editor mantém mudanças apenas em `useState`. Navegação de histórico do App Router pode descartar trabalho sem os avisos existentes. Confirmar em UI autenticada e completar proteção/recuperação se reproduzido; nenhum teste UI desse caso foi executado nesta revisão.

## Cobertura observada e pendências externas

- JSON de origem: 154 posts, 38 páginas e 551 mídias; os aliases/duplicata têm decisões centralizadas. O inventário de integridade existente é uma evidência da implementação raiz, não foi reexecutado aqui.
- O catálogo possui oito prompts e todas as referências de arquivo existem. Base/tarefas pedem confirmação do conteúdo e proíbem publicação; não executam IA pelo painel.
- Renderização pública é do servidor; sitemap/canonicals/robots/JSON-LD e remoção de comentários têm implementação. Conferência de HTML completo, rotas/assets, semântica e comparação visual por famílias continuam no aceite integrado.
- CRUD de posts, editor, revisão/lixeira, imagens, YouTube, popup e contato têm código. Não foram criados recursos da clínica; login real, sessão, Storage/CORS, importação remota, SMTP e resposta da CDN/WAF continuam dependências externas explícitas. Esses limites não justificam considerar concluído um requisito local faltante acima.

Não acrescenta agendamento, analytics, CRM ou qualquer requisito fora da spec. A publicação permanece exclusivamente com Gabriel.

## Correções verificadas após a revisão

Os achados acima ficam preservados como registro do estado revisado. A implementação posterior resolveu os seis pontos:

| Achado | Correção e evidência local |
|---|---|
| Canônica editável | `postCanonicalUrl` respeita URL validada; metadata/JSON-LD têm testes. Default acompanha slug renomeado/restaurado sem substituir canônica customizada; regressões PostgreSQL em `tests/backend/database.test.ts`. |
| Mídia usada somente no SEO | Lookup público, referências, locks e bloqueio de exclusão incluem `seo.ogImage` e revisões. Testes de SQL e validação em `tests/backend/database.test.ts` e `domain.test.ts`. |
| `/simply_galleries/` | Catálogo resolve o arquivo Blog equivalente observado, com renderer e links rastreáveis; `tests/public/render.test.ts`. |
| Histórico do contato | `settings_revisions` privado/imutável, restauração otimista e tela de histórico; testes SQL, backup/restore e API. |
| Override da Home | `homeTemplate` usa o override combinado quando fornecido; regressão de conteúdo em `tests/public/render.test.ts`. |
| Documentação desatualizada | Migração, spec v0.5, setup e prompts agora registram implementação autorizada, comentários removidos, 551 mídias reconciliadas e execução remota ainda pendente. |

A lacuna de Voltar/Avançar recebeu um guard de histórico sem armazenamento de conteúdo privado. Os seis testes React/JSDOM em `tests/admin/navigation.test.ts` passaram; a inspeção com sessão Supabase real continua no aceite conectado. Testes de `tests/admin/api.test.ts` também conferem que gravação HTTP 200 com confirmação pública pendente não vira uma alegação de publicação concluída.

O aceite visual e HTTP integrado tem relatórios próprios em `docs/validation/`; esta resolução dos achados estáticos não implica paridade visual total nem validação de Auth/Storage/CDN hospedados.
