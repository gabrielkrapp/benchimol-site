# Correções da auditoria: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. O pedido de Gabriel “Aplique as correções” aprova executar as propostas técnicas da auditoria já apresentada.

**Goal:** Corrigir rastreamento/metadata, HTML de aviso, privilégios/headers/upload e gargalos verificáveis, preservando conteúdo, visual e isolamento editorial.

**Architecture:** Três frentes com arquivos separados e integração pelo coordenador. Reparos remotos só no Supabase exclusivo da clínica, com preflight, transação, reconciliação e validação; nenhuma publicação de código.

**Tech Stack:** Next16.3.8, React19.3.0, Supabase JS2.117.2, PostgreSQL17.11 hospedado, Sharp0.35.5 declarado diretamente, Vitest/PGlite sem Docker.

**Spec:** [Spec v0.9](../specs/2026-09-30-initial-spec.md), seção7/7.1, e [propostas da auditoria](../validation/audit-2026-10-01/README.md).

## Global Constraints

- Nunca merge, push, deploy, restart de hospedagem ou ação indireta de publicação; execução manual cabe a Gabriel.
- Não iniciar Docker nem iniciar/parar/reiniciar o servidor do usuário.
- Preservar textos, imagens originais, URLs e layout Elementor; não mudar informação médica por inferência.
- Nenhuma alteração automática de autoria, CEP, domínio do Perfil da Empresa, treinamento ou destino de `/sample-page/`.
- Banco exclusivo `jjrzmuuwuvxcsnwqzvxf`, binding explícito, TLS verificado, nunca LifeWallet nem reset de base ocupada.
- Context7 indisponível: usar guias Next instalados e fontes oficiais atuais, registrando a limitação.
- Testes/geração em sequência para memória; não executar `npm test` com pretest concorrente ao dev.

## Review Focus

- Texto literal editado com `&`, `<` ou `>` não pode ser decodificado como se fosse metadata importada.
- Exceção de robots para mídia não pode tornar arquivo de rascunho ou catálogo privado acessível.
- Redução de CSS conserva ordem efetiva de cascata, estados interativos e viewports; nenhum purge heurístico.
- Grants após correção devem aceitar as operações legítimas do admin e recusar visitante/não-admin, com defaults iguais aos hospedados nos testes.
- Aviso inativo/agendado não aparece antecipadamente; aviso ativo continua respeitando sessão e tem conteúdo inicial/noscript.

## Tarefa 1: SEO e aviso

**Files:** `src/lib/public/seo.ts`, `src/app/layout.tsx`, `src/components/public/Interactions.tsx`, `src/components/public/PublicShell.tsx`; helper de metadata legada, `src/lib/server/snapshot.ts`, `scripts/migration/import-database.ts`, testes públicos/import.

- [x] Regressão: `publicRobots()` permite `/api/media/` para grupos de pesquisa, mantendo `/api/` bloqueado e grupos de treinamento restritos.
- [x] Regressão: metadata pública contém `max-image-preview:large`; schema principal médico geral, unidades físicas e WebSite coerentes; Home sem breadcrumb de item único.
- [x] Regressão: decodificar somente description/title vindos do export codificado uma vez; novos inputs literais permanecem literais.
- [x] Regressão: renderização SSR do aviso ativo contém título/texto; inativo não contém; horário/sessão/modal e fallback noscript preservados.
- [x] Executar testes focados, implementar, repetir; preparar reparo da base apenas para registros importados exatamente iguais à origem, `source_hash` correspondente e versão1.

## Tarefa 2: Segurança

**Files:** `next.config.ts`, novo schema declarativo05 e migration com cópia exata, decoder gerido/`media.ts`, testes de grants/imagem/header; comando manual de limpeza em `scripts/migration/` e helper testável.

- [x] Testar grants herdados amplos do provedor, aplicar menor privilégio e demonstrar negação de TRUNCATE/TRIGGER/REFERENCES/CRUD anônimo; SELECT público continua limitado por RLS.
- [x] Testar que admin mantém CRUD/RPC necessários e não-admin não ganha privilégio por metadata de usuário.
- [x] Aplicar nosniff, política de referência/permissões, proteção contra iframe do admin e CSP Report-Only compatível; não ativar enforcement amplo sem provas de embeds.
- [x] Testar imagem truncada/MIME falso/limites de pixels e animação; decodificar integralmente com limites e preservar bytes originais válidos.
- [x] Preparar limpeza manual `--plan` por padrão: intenção com TTL vencido e carência, sem referência em mídia/post/revisão; execução exige destino e confirmação concreta de IDs/hash. Nunca executar expurgo automático nesta rodada.
- [x] Documentar configuração Auth direta/MFA/CAPTCHA dependente do painel/integração, sem bloquear o login atual com configuração incompleta.
- [x] Validar migration localmente antes de preflight/reparo transacional hospedado pelo coordenador; preservar corpo/datas/conteúdo e história anterior.

## Tarefa 3: Performance

**Files:** pipeline CSS público, render/HTML/imagem, JSON de dimensões/derivados, `public-repository.ts`; testes públicos/repositório. `PublicShell.tsx` compartilhado por seções com coordenação explícita.

- [x] Testar ASTs com strings/calc/contextos e remover só duplicação semanticamente redundante; compactar representação sem mudar cascata.
- [x] Publicar CSS por hash e manifesto por rename atômico; preservar hashes antigos para abas/dev existentes.
- [x] Gerar derivado lossless do banner e comprovar pixels iguais; preservar original e reservar dimensões dos arquivos locais reais.
- [x] Corrigir prioridade da capa acima da dobra e `sizes` conforme caixas/breakpoints, mantendo lazy para conteúdo abaixo da dobra.
- [x] Taxonomias usam somente IDs necessários; cache React por request, sem persistir conteúdo público retirado ou falha do banco.
- [x] Medir bytes antes/depois; comparar visual/caixas e interações no servidor do usuário, sem alegar score/CWV de produção.

## Integração e entrega

- [x] Revisar patches das três frentes e aplicar apenas migration/reparo restritos após preflight explícito e provas locais.
- [x] Suíte completa em sequência, typecheck, integridade de conteúdo/arquivos e HTTP atual. Não build concorrente ao dev.
- [x] Atualizar prompts/docs/Brain com implementação, evidências e pendências; preservar auditoria original como histórico.
- [x] Entregar resumo com correções efetivas, resultados e dependências reais do painel/publicação; nenhum pedido de confirmação repetido para ações já aprovadas.


**Entrega:** `docs/validation/corrections-2026-10-02/README.md` e `summary.json` distinguem patches efetivos, testes executados, regressão corrigida e dependências de configuração/publicação. A suíte final/typecheck constam no ledger, sem inferir aceite publicado.
