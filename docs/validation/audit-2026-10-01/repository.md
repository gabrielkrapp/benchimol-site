# Revisão e limpeza do repositório local

**Rodada:** iniciada em 01/10/2026 no horário de São Paulo; limpeza executada em **02/10/2026 às 00:08 BRT (03:08 UTC)**, com validações posteriores. **Escopo:** computador local, sem GitHub, publicação, banco remoto ou controle de serviços.

## Resultado observado

Foram removidos **14 arquivos regeneráveis: seis `.DS_Store` e oito bytecodes `.pyc`**, totalizando **216.034 bytes (210,97 KiB)**. Dois diretórios `__pycache__` ficaram vazios e foram removidos. Cada arquivo foi validado com caminho permitido, ausência de symlink, tamanho, SHA-256, inode e data de modificação antes da exclusão. Para os bytecodes, a respectiva fonte Python existia e foi preservada.

O [manifesto da revisão](repository.json) foi salvo antes do primeiro `unlink` e atualizado com o resultado. O [inventário local](local-inventory.json), de 8.024 arquivos/741.078.002 bytes fora dos diretórios de runtime excluídos, permanece como snapshot **anterior à limpeza**; seu campo `deleted: false` não descreve o resultado posterior.

## O que pertence a cada fronteira

| Fronteira | Arquivos e finalidade | Decisão |
|---|---|---|
| Runtime e conteúdo público | `src/`, `public/`, JSONs selecionados de `data/wordpress/`, configuração e dependências declaradas | Preservados |
| Mapa dinâmico de assets | `asset-map.json`, `assets.json`, rotas, mídias, CSS e manifesto de estilos | Preservados; uma busca textual isolada não demonstra desuso |
| Biblioteca editorial | `docs/prompts/`, incluída explicitamente para `/admin/prompts` | Preservada; não é documentação descartável |
| Evidência e origem | Baselines/restored, resumos, manifests/hashes, diffs/capturas visuais, validações e acervo filtrado | Preservados; captura e transformação têm papéis diferentes |
| Material privado | Envs, exports brutos, contratos, backups e snapshots/rollback de QA | Preservados; conteúdo não foi lido nem incluído na aplicação |
| Artefatos locais | `.next/`, `.next-supabase-local/`, `node_modules/`, `public/site-styles/` | Preservados, inclusive com o dev parado; Gabriel controla o processo |
| Histórico e recuperação | `.git/` e histórico local | Preservados |

`src/lib/server/snapshot.ts` importa o acervo público; `src/lib/public/catalog.ts`, `html.ts` e `render.ts` usam dados de páginas, rotas, galerias e mapas. O carregador de CSS lê assets pelo caminho contido nos manifests. `next.config.ts` inclui somente a biblioteca de prompts de `docs` no tracing explícito de `/admin/prompts`.

O espaço observado por metadados também inclui aproximadamente 220 MiB de `.git`, 1.022 MiB de `.next`, 560 MiB de `.next-supabase-local` e 611 MiB de dependências. Tamanho sozinho não torna esses diretórios inúteis. Nenhum deles foi alterado.

## Privacidade e estado local

`.env.local` e `.env.prod` estavam com permissão `0600` e cobertos por `.gitignore`; `.local-supabase` estava com `0700`. Conteúdo e valores das variáveis não foram lidos. Backups, contratos, exports privados e capturas HTTP brutas permanecem ignorados. Ignorar no Git não substitui autenticação nem a revisão de um pacote publicado.

`git remote -v` não apresentou remotes. Não foram observados `.github/`, `.openai/` ou `vercel.json` na raiz. Isso confirma apenas a configuração local examinada; não constitui consulta nem alteração do estado de serviços externos. A revisão não requer criar GitHub, apagar `.git` ou inicializar outra infraestrutura.

## Candidatos preservados

- `backups/hosted-manual-qa/acima-10mb.png` tem 10.485.769 bytes e é uma fixture privada ligada à validação histórica de limite de upload. Ficou preservada junto às rotinas e snapshots de restauração; não é um asset público.
- Cópias em `docs/research/`, `data/wordpress/` e `public/` representam evidência capturada, conteúdo transformado e arquivos servidos. Não foram tratadas como duplicatas removíveis por nome ou hash isolado.
- `public/site-styles/` é regenerável, mas serve os hashes referenciados pelo manifesto e pode pertencer ao dev/build existente. `styles:public` não foi executado, pois regrava o manifesto e remove CSS não corrente.
- Scripts de descoberta, reconciliação, importação, backup e restauração permanecem para reprodução e recuperação. Não executar uma ferramenta não a torna descartável.

## Validação após a exclusão

- Os 14 arquivos estavam ausentes; as quatro fontes Python estavam presentes com os mesmos hashes.
- Nove arquivos públicos de conteúdo/manifestos protegidos continuaram com tamanho e SHA-256 iguais; metadados dos caminhos privados conferidos permaneceram iguais.
- A lógica de `verify:inventory` foi executada offline em memória: **154 posts, 38 páginas, 551 mídias e 1.377 assets verificáveis passaram**, sem erro de conteúdo, reconciliação, tamanho ou hash. Há 1.397 registros totais de assets; uma falha de origem e 19 CSS suplementares continuam registrados historicamente.
- O manifesto CSS tem 45 entradas para 42 arquivos; todos os arquivos referenciados passaram por tamanho/hash, sem regeneração.

O comando npm original regrava `docs/validation/inventory.json`; a execução equivalente registrou a prova apenas neste relatório, preservando a evidência anterior. Não houve testes abrangentes, build, servidor, Docker, migração, chamada ao banco, alteração de Auth, merge, push, release ou deploy.

## Revisão manual futura

Se Gabriel decidir usar GitHub depois, revisar o conjunto concreto proposto para inclusão, mantendo envs/exports/contratos/backups e capturas brutas fora dele. A ausência de remote hoje não torna toda a pasta apta a publicar. No pacote preparado para hospedagem, conferir separadamente tracing do servidor, assets públicos e geração CSS; um inventário offline não comprova comportamento publicado.

A otimização dos arquivos do site exige medir uso pelos manifests/HTML e preservar os originais e a referência visual. Build e aceite dos patches atuais permanecem uma atividade separada; a regra permanente de **não merge/deploy** continua vigente e a publicação fica com Gabriel.
