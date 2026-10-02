# Executor restrito de grants e SEO legado — 02/10/2026

`scripts/migration/apply-audit-corrections.ts` prepara/aplica somente a migration `20261002032930_benchimol_least_privilege.sql` e o reparo de metadados importados. A execution remota desta etapa é feita pelo coordenador após revisão/testes; este documento descreve o contrato do executor. Não é rotina de deploy, reset ou reimportação.

## Planejamento

```sh
node --import tsx scripts/migration/apply-audit-corrections.ts --expected-ref=jjrzmuuwuvxcsnwqzvxf
```

O default inicia uma transação `REPEATABLE READ READ ONLY`, lê catálogo e fingerprints das 12 relações da aplicação e termina com rollback. Não grava Auth, Storage, conteúdo, grants ou ledger. Produz JSON datado em `docs/validation/corrections-2026-10-02/` contendo o `planHash`, hashes das migrations, contagens, catálogo de permissões/RLS/triggers e IDs de posts editados excluídos do reparo. Dados completos das tabelas não entram nessa evidência pública.

O script lê o arquivo privado `.env.local` com parser Node, exige permissões restritas e recusa envs ambientes divergentes. Ref/API/PostgreSQL precisam identificar o projeto exclusivo `jjrzmuuwuvxcsnwqzvxf`; loopback/LifeWallet são recusados. `pgConnectionConfig` fixa destino/banco e exige TLS com CA/hostname. O socket TLS deve estar autorizado; `pg_stat_ssl` registra separadamente o hop visto pelo PostgreSQL, que pode ser o pooler. A identidade observada deve ser database/role `postgres`. O único GET externo de aplicação é `/auth/v1/settings`, com publishable key e sem retorno do payload no relatório; signup deve continuar desativado.

## Aplicação revisada

```sh
node --import tsx scripts/migration/apply-audit-corrections.ts --expected-ref=jjrzmuuwuvxcsnwqzvxf --execute --confirm-plan=HASH_DO_PLANO_REVISADO
```

Esse comando exige a autorização já concedida ao coordenador para aplicar as correções; não representa autorização genérica para outros destinos ou futuras mudanças. O hash cobre migration05/schema05 byte a byte, histórico inicial exato, catálogo, fingerprints do estado editorial e o plano SEO anterior/posterior. Se o banco ou os arquivos mudarem depois da revisão, a execução aborta com `approval_plan_changed` e exige novo plano. O ledger recusa migrations desconhecidas ou SQL diferente para uma versão conhecida.

A transação adquire lock consultivo, locks de escrita nas relações da aplicação/ledger e `ACCESS EXCLUSIVE` em posts. Guarda um snapshot privado de tabelas/ACLs em `backups/audit-corrections/` (diretórios novos `0700`, arquivo `0600`). Não é backup dos arquivos Storage nem de Auth: esses recursos não são alterados pelo executor. O snapshot é persistido antes das mutações.

Grants/default privileges vêm apenas do SQL declarativo05 idêntico à migration revisada. O reparo SEO exige ID/WP ID, source hash, versão1 e SEO completo exatamente igual ao estado anterior ou ao já corrigido. WP IDs são lidos como inteiro explícito. Versões maiores que1, de mesma origem/identidade, são preservadas e listadas; versão1 divergente aborta. A atualização usa parâmetros JSONB e modifica exclusivamente `seo`. Somente o trigger `audit_post_change`, originalmente `O`, é suspenso dentro da transação; é reativado antes do commit. Qualquer erro causa rollback de grants, ledger, metadados e suspensão do trigger.

Antes do commit, o executor verifica:

- Todos os campos de posts exceto SEO permanecem iguais por hash, incluindo corpo, autor, datas, source hash e versão.
- As outras 11 relações permanecem iguais por contagem/hash.
- Apenas os SEO exatos planejados mudaram; posts editados e demais registros não mudaram.
- RLS, políticas, definições/estado dos triggers, definição das funções, schemas, bucket e ACLs existentes de Auth/Storage permanecem iguais.
- As permissões finais correspondem ao contrato mínimo de tabelas/colunas/RPCs. `TRUNCATE`, `REFERENCES`, `TRIGGER` e `MAINTAIN` são negados aos três papéis clientes. Defaults de clientes são revogados para os futuros objetos da aplicação.
- Histórico inclui o SQL exato05 e não sobra reparo SEO elegível pendente.

Idempotência: repetir com um plano atual e o mesmo SQL registrado retorna `changed:false` quando grants/SEO já correspondem, sem criar novo backup ou edição. Um SQL alterado para a versão05 é conflito. Se grants driftarem, um novo plano precisa cobrir esse estado antes de reassertá-los. O script não inicia/reinicia serviços; a notificação transacional PostgREST atualiza seu schema cache após commit, sem publicar código.

## Validação local

`tests/backend/audit-corrections-executor.test.ts` usa PostgreSQL PGlite real, em sequência, sem Docker. Cobre reparo/idempotência, dados/data/versão/trigger preservados, confirmação obsoleta recusada, rollback de erro depois de suspender o trigger, skip de edição versão2, conflito versão1 e histórico SQL divergente. O adapter de teste usa `exec` em SQL sem parâmetros, equivalendo ao protocolo simple do driver `pg` para a migration de vários statements; queries parametrizadas continuam reais.

As provas remotas e o resultado da suíte final são documentos separados gerados pelo coordenador. Credenciais, linhas Auth e dados privados nunca são impressos. Não houve execução remota por este subagente, nem Docker, build, merge, push ou deploy.
