# Integração GitHub autorizada — 02/10/2026

Gabriel indicou `https://github.com/gabrielkrapp/benchimol-site.git` e autorizou commit, push, abertura de PR e merge da integração inicial. Isso substitui o armazenamento exclusivamente local (D-013) e permite o merge neste escopo; deploy, release, Docker e publicação/reinício de serviços continuam proibidos. [Decisão D-014](../../architecture/decisions.md) e [runbook](../../operations/github-integration.md).

## Prévia e proteção de publicação

- [GitHub inicial](remote-preflight.json): repositório privado/vazio, default main, zero workflows/hooks/deployments, Pages ausente. Leitura de rulesets por CLI devolveu403 e não é tratada como prova de ausência de regras; checks/estado do PR devem ser conferidos antes do merge.
- [Vercel Benchimol](vercel-preflight.json): projeto confirmado, Node24.x, sem ligação Git/framework/produção/deployhooks. Somente leitura; nenhum recurso alterado ou deployment disparado.
- `vercel.json` usa `git.deploymentEnabled=false` para todas as branches, desde a base. [Controle oficial Vercel](https://vercel.com/docs/project-configuration/git-configuration#turning-off-all-automatic-deployments). Não usar chave deprecated nem ignorar build depois de já iniciar deploy.
- A revisão automática rejeitou push direto da base para main; essa operação não executou. Alternativa indicada aplicada: base em `codex/repository-base`, commit `8a851a4`, contendo exclusivamente `vercel.json`. Essa passou a ser a default observada do remoto. A aplicação inteira entra via PR `codex/benchimol-migration`→`codex/repository-base`; renomear a branch integrada para main depois do merge se permitido. [Registro da rejeição e alternativa](bootstrap-review.json).

## Verificações locais desta integração

| Prova | Resultado |
|---|---|
| [Suíte integral](full-tests.log) |301 testes /51 arquivos, exit0,230,75s; executada sem pretest/geração CSS concorrente ao dev |
| [Typecheck](typecheck.log) |exit0 |
| [Inventário novo](inventory.json) |154 posts,38 páginas,551 mídias,1.377 assets, zero erro de integridade;404s de origem continuam classificados e preservados |
| [Ledger](validation.json) |hashes dos logs e41 caminhos da biblioteca0.12 conferidos |
| [Privacidade inicial](privacy-review.md) e [índice](staged-privacy-review.md) |zero padrões fortes de segredo;31 exclusões preservadas locais, só.env.example como exemplo; zero symlinks/submodules/conflitos |
| [Pacote inicial](package-review.md) e [índice](staged-package-review.md) |índice revisado2310 arquivos/314,38MiB, zero arquivo>50/100MiB;100% dos1.377 assets,197 fontes CSS,19 imports JSON e biblioteca/derivado WebP presentes |
| [Documentação](doc-review.md) |autorização inicial, limites e contexto portátil; versões anteriores históricas preservadas |

Os números de índice são snapshots identificados por manifesto/hash antes de adicionar os próprios relatórios e os documentos de fechamento. A árvore final deve ser conferida antes do commit; recibos locais posteriores registram SHA/tree/PR sem incorporar um recibo que contenha o próprio hash ao commit. Não houve build novo concorrente ao dev; HUHe continua histórico. Não se gravou no Supabase nesta integração e não se executou clone/npm ci/build em outra máquina.

## Privados e clonabilidade

Env reais, contratos, backups, export autenticado bruto, memória pessoal do Brain, comentário antigo e29 capturas administrativas ficam fora do Git e preservados na máquina. Fontes, assets públicos, lockfile, conteúdo filtrado, inventários, hashes, migrations/testes, prompts e resumos técnicos acompanham o clone. Emails de operador/contatos públicos não são credenciais; as provas não publicam senhas, JWTs, cookies, chaves ou URLs assinadas. A varredura de padrões não é garantia universal e binários não foram inspecionados visualmente nesta rodada.

[Contexto técnico portátil](../../context/project-context.md) substitui a nota pessoal no clone. Usar Node24.x ou22.21.1 validado e `npm ci` incluindo devDependencies. O CSS gerado não acompanha o Git: predev/prebuild/pretest o reconstrói com as197 fontes locais. Imagens/manifestos e WebP já estão presentes. Não copiar `.next` antiga, env ou fixture Docker para simular integração pronta.

O resultado do PR é verificável no GitHub. Recibos `*-receipt.local.json`, posteriores aos commits/merge, permanecem ignorados na máquina de Gabriel. Merge não comprova site publicado, aceite clínico, ranking, citações IA ou PageSpeed/CWV de produção. Essas pendências continuam nos relatórios da aplicação.
