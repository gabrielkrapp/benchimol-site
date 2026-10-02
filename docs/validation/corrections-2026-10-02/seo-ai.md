# Correções SEO e leitura por IA — 02/10/2026

Gabriel autorizou aplicar as propostas técnicas da [auditoria Google](../audit-2026-10-01/google-seo.md) e [auditoria IA](../audit-2026-10-01/ai-discovery.md). As correções preservam conteúdo, aparência, autores, datas, URLs e política de treinamento. Markup validado localmente e reparo SQL aplicado/verificado na clínica; isso não comprova ranking, indexação, citação ou comportamento da Vercel.

## Alterações

| Achado | Correção |
|---|---|
| SEO-01 | Os dois grupos públicos permitem o caminho específico `/api/media/`, mantendo `/api/`, `/admin/` e `/preview/` bloqueados. Grupos de treinamento continuam bloqueados globalmente. A autorização da rota/banco permanece obrigatória. |
| SEO-02 | Root, páginas e artigos recebem `max-image-preview:large`, `max-snippet:-1` e `max-video-preview:-1`, presentes nos 154 registros da origem. Overrides privados mantidos. |
| SEO-04 | Entidade geral alterada para `MedicalOrganization`; duas unidades continuam `MedicalClinic` com endereços originais e vínculo `parentOrganization`. Nenhum endereço principal inventado. |
| SEO-06, parte técnica | `WebSite` com nome/domínio reais na Home. A trilha de um único item deixa de ser publicada na Home; páginas internas mantêm breadcrumb. |
| SEO-07 | Decoder de uma passagem usado somente em SEO de origem WordPress na importação/snapshot. Texto novo de admin não passa por decode. Export e corpos originais intactos. |
| AI-04 | Aviso vigente já contém título/texto no dialog do HTML inicial, que permanece fechado até o efeito de sessão. `noscript` mostra o mesmo aviso para visitantes sem JS. Agenda e versão de sessão preservadas; inativo/futuro/expirado não exposto. |

Código: `src/lib/public/seo.ts`, `src/app/layout.tsx`, `src/components/public/PublicShell.tsx`, `src/components/public/Interactions.tsx`, `src/lib/domain/popup.ts`, `src/lib/domain/imported-seo.ts`, `src/lib/server/snapshot.ts` e `scripts/migration/import-database.ts`. Documentação de migração e prompt P06 atualizados junto com os patches.

O aviso é o mesmo texto para pessoas e crawlers. O servidor avalia a vigência e passa o resultado inicial ao client; a hidratação não usa um novo relógio para decidir o HTML inicial. O client reavalia o período a cada 15 segundos, como antes, preserva a chave `benchimol-popup:{version}` e retira o texto quando o período termina. Nenhum aviso real foi ativado para estes testes.

## Metadados de uma base já importada

`buildLegacySeoRepairPlan()` retorna 118 registros codificados, incluindo a duplicata histórica: 117 URLs canônicas. Cada entrada contém `id`, `wpId`, `sourceHash`, `version:1`, `before` e `after`. Somente title/description mudam; canonical mantém seu valor aprovado. `legacySeoRepairState()` aceita apenas identidade, origem, versão e objeto SEO completos correspondentes, classificando `pending`, `already_repaired` ou `conflict`. Chaves extras ou mudança editorial são conflito.

Esse helper é um plano puro: não conecta nem grava no banco quando importado ou executado em modo plano. A coordenação aplicou118 reparos na clínica com destino explícito, transação e prova de preservação; a [consulta posterior](clinic-plan-2026-10-02T04-18-38-250Z.json) confirmou zero pendentes e118 já reparados. O trigger `audit_post_change` exige incremento de versão e reescreve `updated_at`; o reparo preservou essas colunas suspendendo só esse trigger dentro da transação/lock, seguido de reativação antes commit. Qualquer erro causa rollback, incluindo o estado do trigger. Não desligar todos os triggers, RLS ou proteção de mídias. Não reimportar a base ocupada para efetuar esse reparo. [Executor e evidências](clinic-executor.md).

## Testes e evidências

Antes do patch, testes observaram falhas de comportamento em crawl de mídia, robots de imagem grande, entidade principal, Home WebSite/breadcrumb, descrição WP e aviso inicial. A entidade WP usa o campo `og_description` quando `description` não existe; esse fallback foi confirmado antes de corrigir o código.

Primeiro green: **35 testes em oito arquivos passaram**, exit 0, duração 28,86 segundos. Comando direto Vitest, sem hook `pretest`, gerador CSS ou PGlite:

```sh
node node_modules/vitest/vitest.mjs run tests/public/seo-audit-regressions.test.ts tests/public/notice-ssr.test.ts tests/public/text-encoding.test.ts tests/public/popup.test.ts tests/public/shell.test.ts tests/public/content.test.ts tests/public/interactions.test.ts tests/backend/legacy-seo-plan.test.ts --reporter=dot
```

Há suplemento em `tests/public/notice-session.test.ts` e na regressão SEO para decode-once versus entidade literal nova. A coordenação os incluiu na suíte integral:301 testes/51 arquivos passaram, exit0,285,60s. [Ledger consolidado](summary.json) também registra typecheck e os retestes após ajuste de tipagem dos testes. Nenhum Docker, build, início/reinício de servidor, login real, merge, push ou deploy foi feito por este subagente.

## Decisões e limites

Não foram alterados “Johny”, CEP, domínios, informações médicas, alt/descrições editoriais, `/sample-page/`, cadastro de Perfil da Empresa ou políticas Google-Extended/Bing. Esses itens dependem de confirmação clínica/editorial ou política separada. Search Console/grounding/indexação, acesso de crawlers reais, CDN/WAF e rich results de uma versão publicada permanecem sem comprovação. A validação da exceção robots é independente da validação de mídia publicada versus rascunho feita na frente de segurança.

Context7 não está exposto nesta sessão. Foram lidos os guias instalados Next 16.3.8 (`generate-metadata.md` e `robots.md`) e consultadas fontes oficiais atuais:

- [Interpretação de robots e precedência de caminhos](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec).
- [Controles de robots em metadata](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag).
- [WebSite e nome do site](https://developers.google.com/search/docs/appearance/site-names).
- [Breadcrumb Google](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb).
- [MedicalOrganization](https://schema.org/MedicalOrganization) e [MedicalClinic](https://schema.org/MedicalClinic).
- [ALTER TABLE/trigger](https://www.postgresql.org/docs/17/sql-altertable.html) e [locks PostgreSQL](https://www.postgresql.org/docs/17/explicit-locking.html).

O fetch web de `supabase.com/changelog.md` retornou content-type não suportado nesta frente; não foi implementada API nova do Supabase. O helper usa apenas dados de origem e comparação local; aplicação remota continua controlada pela coordenação.
