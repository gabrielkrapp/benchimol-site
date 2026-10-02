# Revisão documental da integração GitHub — 02/10/2026

Revisão somente leitura de AGENTS, README, D-014, runbook, contexto técnico portátil, biblioteca de prompts0.12, exclusões e preflights existentes. O [registro detalhado](doc-review.json) distingue observações e verificações estáticas. Os três ajustes documentais apontados foram resolvidos pelo coordenador e conferidos novamente: **nenhum achado documental aberto**. Nenhum teste, instalação, build, operação remota, mutação Git ou leitura de env/backup/export privado foi realizado por esta frente. Somente estes dois relatórios próprios foram criados/atualizados.

## Autorização e publicação

A documentação registra a autorização expressa para commit/push/PR/merge apenas da integração inicial com `gabrielkrapp/benchimol-site`. D-013 está identificada como histórica e substituída por D-014. Deploy, release, Docker, reinício/publicação de serviços e merges futuros não são autorizados por essa exceção. A rejeição do push direto para main é registrada como ação não executada; o fluxo de base `codex/repository-base`, PR `codex/benchimol-migration` e eventual rename após merge é descrito separadamente.

A árvore local do commit base `8a851a4` contém somente `vercel.json`, que define `git.deploymentEnabled=false`. Os preflights existentes documentam GitHub privado/vazio e ausência observada de workflows/hooks/Pages/deployments, além de Vercel sem Git link/framework/produção/deploy hooks. Não foi feita nova consulta remota. O 403 de rulesets não é tratado como ausência de regras. Verificar o estado novamente cabe ao executor principal antes do envio/merge.

## Privados e clone

O contexto técnico acompanha o clone em `docs/context/project-context.md`. Brain pessoal/comercial, contratos, envs, backups, comentário antigo e capturas administrativas permanecem locais/ignorados. Nenhum dos **41 caminhos do catálogo0.12** está ausente ou exige esses documentos privados. CSS gerado ignorado tem preparação no predev/prebuild/pretest; originais, dados e manifestos necessários estão sujeitos à [revisão estática do pacote](package-review.md). Isso não comprova um clone limpo instalado, novo build ou Vercel publicada.

Links históricos para evidências privadas são explicados no README/runbook. Os dois links de contrato no índice do README são intencionalmente locais; acrescentar o rótulo no próprio item é melhoria de clareza, sem incluir o contrato no Git. Não há promessa de nota100, desempenho de produção, projeto publicado ou aceite da clínica decorrente do GitHub.

## Ajustes resolvidos e conferidos

- `docs/implementation/progress.md:3` agora declara ausência de release/deploy/DNS e aponta a autorização específica da integração inicial, sem contradizer o push base. AGENTS qualifica a frase antiga como pertencente à rodada de correções anterior.
- `README.md:28` agora usa o caminho textual `docs/contracts/` e declara que os documentos ficam somente na máquina de Gabriel, excluídos do clone.
- O [consolidado da integração](README.md) foi criado. A segunda leitura não encontrou nenhum link Markdown local inexistente entre README, AGENTS, decisões, contexto portátil, runbook, progresso, prompts e relatórios da integração.

Esta é uma revisão anterior à criação do PR. URL, SHA final, merge e rename não são comprovados por este relatório; serão registrados pelo coordenador sem converter a autorização limitada em permissão de deploy. O pacote documental está coerente para essa próxima etapa autorizada.
