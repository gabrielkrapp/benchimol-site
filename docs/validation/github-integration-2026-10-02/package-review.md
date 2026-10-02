# Revisão de empacotamento e clonabilidade — 02/10/2026

Revisão somente leitura dos candidatos de `git ls-files --others --exclude-standard`, anterior à inclusão dos dois arquivos deste relatório. Nenhum env real, backup ou export privado foi aberto. Não houve instalação, build, testes, Docker, mutação Git ou operação remota. Fontes e resultado detalhado em [package-review.json](package-review.json).

## Tamanho e inclusão

**2,333 arquivos**, **331,234,858 bytes** (315.89 MiB), antes de compressão Git. Nenhum arquivo acima de 50 ou 100 MiB. Maior: `public/wp-content/uploads/2025/02/beautiful-girl-with-body-art.jpg`, 12,923,734 bytes (12.33 MiB). Esses números medem a cópia candidata, não tamanho de pack, transferência de clone ou armazenamento com histórico.

A [documentação oficial GitHub](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github) informa aviso acima de 50 MiB, bloqueio acima de 100 MiB e recomendação de repositórios menores que 1 GB. Não há necessidade de LFS por tamanho neste candidato.

| Grupo | Arquivos | Bytes |
|---|---:|---:|
| `public/` | 1378 | 204,713,830 |
| `docs/` | 730 | 103,537,674 |
| `data/` | 18 | 21,433,740 |
| `src/` | 108 | 805,463 |
| `scripts/` | 25 | 205,164 |
| `tests/` | 51 | 261,234 |
| `supabase/` | 11 | 75,277 |

Preservar fontes, lockfile, content, dados públicos filtrados, manifestos, originais em `public/wp-content` e `public/legacy-assets`, derivado em `public/site-images`, migrations/testes, prompts e provas históricas. Os 1.377 caminhos únicos do asset-map e as 197 fontes CSS constam dos candidatos; nenhum caminho faltante. Todos os imports JSON relativos do runtime e arquivos usados pelo catálogo de prompts constam dos candidatos. O WebP derivado único também está incluído.

A documentação/QA tem volume por capturas históricas, principalmente `docs/validation/visual-qa`. Manter essa evidência é adequado ao tamanho atual. Não excluir fotos/estilos ou arquivos originais pelo nome ou aparente falta de uso: inventário, hash e fidelidade dependem deles. Eventual arquivamento de evidências exigiria decisão separada e atualização de links/provas.

## Preparação após clone

`package-lock.json` v3 coincide com nome, versão, engines e dependências do `package.json`; não há resolved de dependência `file:`/Git local. Usar **Node 22.21.1** documentado no setup, ou LTS par compatível 24/26, e **`npm ci` incluindo dependências de desenvolvimento**. Há uma pequena divergência de metadata: o engine raiz aceita 22.12.0, enquanto jsdom 29.1.1 exige pelo menos 22.13 na linha 22. Não usar o mínimo 22.12.0; o Node 22.21.1 documentado satisfaz ambos. Nenhuma configuração foi alterada nesta revisão. `tsx` é uma devDependency e executa a preparação dos estilos; `npm ci --omit=dev` não é o fluxo de build validado.

A cadeia foi conferida estaticamente: `npm run dev` → `predev` → `styles:public`; `npm run build` → `prebuild` → `styles:public`; `npm test` → `pretest` → `styles:public`. A geração usa CSS original incluído em `public/`, dados/templates versionados, PostCSS e tsx; grava assets por hash antes de trocar o manifesto por rename atômico. `public/site-styles/` está corretamente ignorado e será gerado antes de dev/build. O manifesto `src/lib/public/style-manifest.json` permanece entre os candidatos. Não copiar manualmente uma `.next` antiga para simular clone pronto.

O gerador `images:public` é manual: os manifestos `image-dimensions.json`/`derived-backgrounds.json` e o WebP devem acompanhar o commit, como ocorre neste candidato. Não é necessário regenerá-los para um clone normal. Originais são preservados.

`next-env.d.ts` é gerado pelo Next e atualmente referencia tipos em `.next/dev`, ignorados. Dev/build recriam esses tipos. Esta revisão não certifica typecheck isolado numa cópia limpa antes dessa geração. O site público abre sem envs; admin e gravações exigem env privado próprio da clínica. Nunca clonar envs reais ou repetir importação/reset da base ocupada para iniciar o site.

O painel PROMPTS lê somente sua biblioteca: `next.config.ts` inclui `./docs/prompts/**/*` no trace de `/admin/prompts`. O script `verify-runtime-package.py` examina um build já existente e rejeita arquivos de projeto fora da biblioteca nos traces; não executa build e não comprova assets públicos. Ele deverá ser executado manualmente depois de um novo build local, fora do dev ativo e quando autorizado. O build HUHe registrado continua histórico.

## Exclusões e pendências

Os checks de ignore passaram para envs reais, exports/backups, contratos, node_modules, `.next`, CSS gerado e `.vercel`. Manter essas exclusões e fixtures/credenciais locais fora do Git. `.env.example` foi considerado apenas por caminho/tamanho; seu conteúdo e a varredura integral de segredos são responsabilidade da revisão principal.

README e setup ainda contêm a decisão anterior de repositório somente local/sem GitHub. O agente principal deve reconciliar a nova decisão autorizada sem alterar o histórico da auditoria. A revisão principal também controla visibilidade do repositório, credenciais, remoto e automações Vercel; este relatório não autoriza publicação nem atesta ausência de deploy por push.

**Limite:** estabelecida a completude estática necessária ao clone, sem executar clone limpo, `npm ci`, build, testes, push ou artifact Vercel. Instalação de binários por plataforma, pacote servidor novo e comportamento publicado continuam fora desta prova.
