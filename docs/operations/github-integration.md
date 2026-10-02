# Integração GitHub sem deploy

Em02/10/2026 Gabriel indicou `https://github.com/gabrielkrapp/benchimol-site.git` e autorizou commit, push, PR e merge desta integração inicial. D-014 substitui a decisão D-013 de armazenamento somente local; essa exceção não autoriza deploy, release, Docker, reinício de serviços ou merges futuros sem pedido expresso.

O remoto foi conferido privado/vazio, default branch `main`, sem workflows, hooks, deployments ou Pages. O projeto Vercel Benchimol foi consultado somente para evitar publicação indireta; não conectar/remover ligações por iniciativa própria. Preflight em `../validation/github-integration-2026-10-02/`.

## Fluxo desta integração

1. Criar a base mínima em `codex/repository-base` com **somente `vercel.json`**, bloqueando desde o primeiro commit deploy automático para todas as branches. Essa base é necessária para abrir PR em um remoto vazio; push direto para main foi rejeitado pela revisão automática e não executado.
2. Versionar na branch `codex/benchimol-migration` o projeto, assets públicos e documentação técnica, depois da revisão de segredos/privados e da suíte/typecheck. Env, contratos, backups, comentários antigos e capturas administrativas ficam fora do Git.
3. Enviar a branch, abrir PR contra `codex/repository-base`, conferir SHA/checks/automação e integrar com o merge autorizado. Não usar force-push, auto-merge, Actions ou CLI de deploy.
4. Após o PR integrado, renomear a branch padrão para main se permitido, confirmar o SHA integrado, fazer fetch e alinhar a main local sem sobrescrever arquivos privados/gerados. Recibos posteriores que referenciam o próprio commit permanecem locais e ignorados; resultado GitHub verificável no PR.

`git.deploymentEnabled=false` em `vercel.json` é o controle oficial de [desativação de deploys Git para todas as branches](https://vercel.com/docs/project-configuration/git-configuration#turning-off-all-automatic-deployments). Mantê-lo até autorização específica de publicação; não usar a opção deprecated `github.enabled` nem substituir por um ignored-build que já inicie uma tentativa de deploy.

## Clone e manutenção

Use Node24.x (projeto Vercel) ou22.21.1 (ambiente testado), `npm ci` com devDependencies e `npm run dev`. A raiz não leva `node_modules`, `.next`, `.vercel` ou CSS gerado; predev/prebuild/pretest recriam o CSS usando as fontes presentes. A aplicação pública abre sem Supabase; para editar, configurar env privada exclusivamente da clínica conforme `clinic-integration.md`. Nunca adicionar env pelo Git para resolver erro de login.

Histórico de QA local pode referenciar provas privadas excluídas do clone. O [contexto técnico](../context/project-context.md), spec, docs dos módulos, prompts, inventários e resumos públicos permanecem disponíveis. Confirmar workflows/hooks/Pages/integrações antes de cada push autorizado; push em branch de trabalho também pode publicar quando a proteção for alterada.

Context7 não estava exposto nesta sessão; conferimos documentação oficial [GitHub CLI PR](https://cli.github.com/manual/gh_pr_create), [merge](https://cli.github.com/manual/gh_pr_merge), [arquivos grandes](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github) e Vercel. Nenhum ganho SEO/performance/entrega profissional é inferido da criação do repositório.
