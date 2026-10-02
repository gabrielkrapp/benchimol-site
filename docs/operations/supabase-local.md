# Supabase local com Docker

**Estado em 01/10/2026:** Gabriel pediu continuar sem executar containers devido ao consumo de memória. O daemon Docker já estava inacessível ao aplicar essa decisão; nenhum container foi iniciado para verificar, testar ou limpar dados. Os comandos abaixo são uma opção manual futura. Agentes não devem reabrir Docker/Supabase local até nova instrução expressa de Gabriel.

Continue com `npm run dev`, sem envs do Supabase, para revisar o site público. `npm test` executa os arquivos em sequência sem containers. O backend administrativo permanece protegido; não substituir Auth/Storage por um login simulado.

A fixture descartável de QA e seus registros locais ainda aguardam limpeza; o logout não foi executado. Eles estão em arquivos privados ignorados pelo Git e nos volumes locais; a stack não será iniciada só para removê-los. Somente após nova autorização expressa de Gabriel para executar Docker, conferir a identidade exata da fixture, o possível upload parcial e os settings originais; então executar `supabase:local:qa:clean` antes de retomar testes com pessoas reais nesse ambiente. Nenhuma credencial deve ser copiada para docs ou Brain.

O Supabase hospedado da clínica é independente dos volumes Docker. A preparação/importação nesse recurso não limpa a fixture local, e sua conta ou dados descartáveis não devem ser migrados. Nunca apontar o comando de limpeza local para o projeto hospedado. As evidências e pendências estão em [login e posts](../validation/admin-posts-local-qa.md) e [aviso, contato, prompts e mídia](../validation/admin-local-qa.md).

Pedido de Gabriel em 30/09/2026: testar banco, login e mídias no computador antes de criar o projeto hospedado. Este ambiente usa serviços reais do Supabase em containers Docker, orquestrados pela CLI oficial. Não precisa de conta Supabase, Vercel, `supabase login`, link remoto ou deploy.

## Uso básico

Pré-requisitos: Node compatível com `package.json`, dependências instaladas com `npm ci` e Docker Desktop aberto. A CLI está fixada como dependência de desenvolvimento em **2.95.0**; os comandos usam a cópia do projeto e preservam a instalação global.

Na raiz do repositório:

```bash
npm run supabase:local:start
npm run supabase:local:import
npm run dev:supabase -- --port 3001
```

Abra o site em <http://127.0.0.1:3001> e o painel em <http://127.0.0.1:3001/admin/>. O primeiro start baixa imagens Docker; os próximos aproveitam as imagens e os dados locais. Os comandos não iniciam a versão hospedada.

| Serviço | Endereço local |
| --- | --- |
| Supabase API, Auth e Storage | `http://127.0.0.1:54351` |
| PostgreSQL | `127.0.0.1:54352` |
| Supabase Studio | `http://127.0.0.1:54353` |
| Mailpit, caixa de e-mail de teste | `http://127.0.0.1:54354` |

Os e-mails locais ficam no Mailpit. Não são enviados para destinatários reais. Analytics, Realtime, Edge Functions, imgproxy e pooler não são necessários ao escopo e ficam desativados. O Next.js continua executando diretamente no computador; Docker contém o backend Supabase.

## Criar seu acesso local ao painel

Nenhuma senha ou conta real é criada pelo start, seed ou import. Abra o Studio local, crie um usuário em **Authentication → Users**, defina sua senha e marque o e-mail como confirmado. Anote apenas o UUID do usuário para este comando no **SQL Editor local**:

```sql
insert into public.administrators(user_id, display_name, active)
values ('UUID_DO_USUARIO_AUTH_LOCAL', 'Gabriel Krapp', true)
on conflict (user_id) do nothing;
```

Use esse usuário e a senha escolhida no `/admin/`. Signup público e login anônimo estão desativados. Esta conta é independente da conta que será criada no Supabase exclusivo da clínica; não reutilize a senha WordPress.

## Iniciar, conferir e parar

```bash
npm run supabase:local:status
npm run supabase:local:stop
npm run supabase:local:start
```

`stop` para **somente** o projeto `benchimol-local` e preserva volumes, posts, usuários e mídias. Não existe script de reset ou exclusão de volumes. Nenhum comando usa `--all`, `--linked`, `db push` ou bancos LifeWallet.

Os containers pertencem à rede `benchimol-local-loopback`. As portas publicadas são verificadas em `127.0.0.1`; se a configuração da rede ou as portas divergir, o script recusa o ambiente. Se outra aplicação ocupar uma porta reservada, ela não será encerrada.

## Configuração e reprodução dos dados

`supabase/config.toml` define portas, versão principal do PostgreSQL e serviços. `supabase/schemas/01_editorial.sql` até `04_login_limit.sql` continuam sendo as definições revistas do aplicativo. `schema_paths` é entrada do fluxo declarativo de diff; **não aplica schemas durante `supabase start`**.

O wrapper inicia a infraestrutura e aplica os quatro arquivos e `supabase/seed.sql` em uma transação, exclusivamente no banco local vazio. Uma tabela privada local, `private.local_schema_bootstrap`, guarda o hash dos arquivos. Repetir o start com os mesmos schemas não refaz a aplicação. Se os schemas mudarem, o comando recusa alterar o banco existente e pede uma migração revista; não apaga dados para resolver a diferença. Esse bootstrap é uma ferramenta de desenvolvimento, não uma migração para produção.

`supabase:local:import` reutiliza o importador existente e só aceita a URL exata deste Docker. Preserva 154 registros WordPress, 153 artigos com URL canônica, 551 mídias e as decisões de redirects; pode ser repetido sem duplicar registros. As imagens legadas continuam em `public/legacy-assets/`; novos uploads usam o bucket privado `editorial-media` no volume Docker.

O start gera **`.env.supabase.local`**, ignorado pelo Git e com permissão `0600`. As chaves e a URL com senha permanecem nesse arquivo e não são exibidas no status ou nos relatórios. `.env.local`, se existir com configuração hospedada, não é alterado nem copiado. `dev:supabase` passa explicitamente o env Docker ao subprocesso Next.js, que prevalece sobre o dotenv hospedado, e confirma os destinos antes de iniciar. O snapshot público fica desativado nesse modo para que falhas do banco apareçam durante o teste.

O wrapper usa o diretório gerado **`.next-supabase-local/`**, também ignorado pelo Git, e ajusta a URL pública à porta informada. O marcador `BENCHIMOL_LOCAL_SUPABASE=true` vale somente no subprocesso de desenvolvimento: build, preview e comandos habituais continuam em `.next/`. Isso permite testar o Docker na porta 3001 enquanto outro Next dev do mesmo repositório usa o cache padrão, sem encerrá-lo ou disputar seu lock. Não iniciar duas sessões `dev:supabase` simultâneas com o mesmo diretório gerado.

Uma configuração local já existente não é sobrescrita silenciosamente. Caso você recrie voluntariamente volumes e chaves depois de guardar seus dados, regenere o env local; os comandos deste projeto não fazem essa destruição por conta própria. O projeto Supabase hospedado da clínica continua separado; sua preparação e seu estado atual são registrados no [roteiro de integração](clinic-integration.md), sem usar este fluxo Docker como evidência de validação hospedada.

## Verificação real e revisão no navegador

```bash
npm run supabase:local:test
```

Esse comando usa Auth, REST, PostgreSQL e Storage reais do Docker; verifica o import repetido, RLS, permissões, CRUD/revisões/redirects, upload assinado, bytes do download e recusas de assinatura/exclusão indevidas. Cria usuários descartáveis com domínio `.test`, não envia mensagens e remove os registros de teste que ele criou. Os dados importados são preservados. O resultado sem segredos fica em `docs/validation/supabase-local.json`.

Para uma revisão assistida do painel, há o modo explícito:

```bash
npm run supabase:local:qa
# Fazer a revisão local no navegador.
npm run supabase:local:qa:clean
```

Esse modo mantém somente um admin descartável para QA e grava seus dados em `.local-supabase/qa-fixture.json`, com permissão `0600`, fora do Git. Não imprime senha ou tokens. A limpeza exige a identidade exata da fixture e remove apenas a conta e os registros vinculados a ela; nunca substitui um usuário real. Não rode os testes enquanto outra pessoa estiver editando posts/configurações nesse mesmo ambiente local. Na interrupção de 01/10/2026, essa limpeza não foi executada; os comandos acima descrevem a retomada futura autorizada, não uma operação concluída.

## Versões, diagnóstico e limites

A CLI global **2.75.0** deste computador usa Storage **1.35.3**, que não possui `storage.allow_any_operation(text[])`. A primeira aplicação detectou essa incompatibilidade e reverteu a transação inteira. A CLI do projeto **2.95.0** usa Storage **1.54.1**, compatível com a política do bucket. A política de segurança não foi enfraquecida para acomodar uma imagem antiga. Nessa CLI, `auth.email.enable_signup=false` desativa também o provider de login por senha; o arquivo mantém esse provider habilitado e bloqueia novas contas pela opção global `auth.enable_signup=false`. A verificação real cobre login/getUser e a recusa do signup público, além da exigência de um administrador ativo. A CLI mais recente 2.119 mudou a execução local; atualizar a versão fixa requer nova validação das imagens, comandos e guardas, sem atualizar a CLI global automaticamente.

O instalador da CLI depende de `tar`. O override **`supabase.tar=7.5.22`** corrige os avisos concretos de segurança de 7.5.13; o lock fixa a correção. Não usar `npm audit fix --force`, que mudaria outras versões do projeto.

O changelog de PostgreSQL de 25/09/2026 foi consultado: as alterações de `ltree`, índices `btree_gist`, cifras legadas de pgcrypto e operadores customizados não correspondem ao schema editorial existente. A stack local é de desenvolvimento, sem TLS externo e com credenciais próprias locais; mantê-la restrita ao loopback. Ela não certifica configuração SMTP, domínios, CDN, cache e operação do recurso hospedado.

Em uma retomada autorizada, se Docker estiver fechado, abra-o e repita o start. A decisão vigente de Gabriel impede agentes de fazer essa retomada sem nova instrução expressa. Se uma porta estiver ocupada, identifique o dono antes de alterar `config.toml` e as guardas; não encerre serviços de outros projetos. Na primeira inicialização, a CLI clássica encerrou Storage/Studio ainda aquecendo após o primeiro probe; o Storage registrava inicialização normal e depois passava no probe real. O wrapper permite esse aquecimento por até 120 segundos e exige os oito serviços em execução e **todos os probes reais saudáveis** antes de aplicar schemas, gerar env ou liberar a aplicação. A opção interna da CLI para manter os containers durante essa espera não vale como aprovação de saúde. Se um serviço continuar não saudável, o wrapper retorna falha e para somente a stack Benchimol, preservando volumes, sem revelar credenciais. Não usar `--ignore-health-check` diretamente para considerar o ambiente pronto.

## Validação executada

Validação executada em **01/10/2026 (UTC)**, antes da interrupção: oito grupos da integração real passaram, conforme `docs/validation/supabase-local.json`; importação repetida reconciliou 154 registros/153 artigos/551 mídias. Login por senha, `getUser`, recusa de signup, RLS, RPCs editoriais, redirects, revisões, Storage assinado e preservação de bytes foram confirmados. Os oito serviços estavam em execução, com todos os probes existentes saudáveis e bindings efetivos no loopback. `npm audit` completo retornou zero vulnerabilidades depois do override e nenhuma versão anterior da aplicação mudou. Guardas locais: três testes passaram; typecheck passou; Next dev conectado iniciou em 3001 com cache isolado.

A revisão posterior no navegador confirmou os fluxos documentados nos dois relatórios administrativos: posts, aviso inativo, restauração de contato e prompts. O upload pela UI chegou apenas a “Preparando envio…” e não teve sucesso observado; esse resultado é diferente da verificação SDK/Storage acima. Foi encontrado `&amp;` literal na mensagem do contato, cuja correção dos normalizadores ainda exige reteste real no navegador. A fixture temporária, o logout e a limpeza dos registros permanecem pendentes até a retomada local expressamente autorizada. Nenhuma dessas evidências confirma o projeto hospedado, entrega de e-mails, cache/CDN ou publicação.

## Fontes consultadas

Context7 não estava exposto nesta sessão. Foram consultados `supabase_search_docs`, os helps das versões locais e fontes oficiais:

- [CLI e stack Docker local](https://supabase.com/docs/guides/local-development/cli/getting-started).
- [Fluxo de desenvolvimento local](https://supabase.com/docs/guides/local-development/cli-workflows).
- [Schemas declarativos e limites do diff](https://supabase.com/docs/guides/local-development/declarative-database-schemas).
- [Release CLI 2.95.0 e catálogo Docker](https://github.com/supabase/cli/releases/tag/v2.95.0).
- [Binding de portas na rede bridge Docker](https://docs.docker.com/engine/network/drivers/bridge/#default-host-binding-address).
- [Changelog PostgreSQL 15.19/17.11](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes).
- [Diagnóstico Supabase](https://supabase.com/docs/guides/monitoring-and-debugging).
