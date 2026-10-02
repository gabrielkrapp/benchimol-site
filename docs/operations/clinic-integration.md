# Conectar o projeto exclusivo da clínica e validar

Fonte canônica: **spec v0.9**, atualizada em 01/10/2026. Arquitetura confirmada: Next.js completo na Vercel e Supabase pelo Marketplace, exclusivamente no projeto **`jjrzmuuwuvxcsnwqzvxf`**. Este roteiro não autoriza publicação, merge, push ou alteração de DNS. Os projetos LifeWallet são proibidos e Docker permanece sem execução por decisão de Gabriel.

**Estado confirmado em 01/10/2026:** Gabriel forneceu `.env.prod` e autorizou usar o recurso da clínica. O [preflight somente leitura](../validation/clinic-preflight.json) conferiu API/identidade do banco, TLS com CA e hostname, zero tabelas da aplicação em `public/private`, zero buckets e zero usuários Auth antes da escrita. A [inicialização transacional](../validation/clinic-initialization.json) foi confirmada em **20:35:50.204 UTC**: 154 registros de posts, 153 artigos canônicos, 551 mídias e dois redirects; corpos/hashes/slugs/caminhos reconciliados, RLS nas tabelas da aplicação e bucket privado de 10 MB. Nenhum usuário Auth foi criado e nenhum e-mail foi enviado pelo agente. A QA manual editorial com a conta real da clínica foi concluída posteriormente, com restauração conferida; [resultados e limites](../validation/hosted-manual-qa.md).

## 1. Identificar o recurso correto

O destino autorizado é `jjrzmuuwuvxcsnwqzvxf`, com API em `https://jjrzmuuwuvxcsnwqzvxf.supabase.co`. Conferir esse ref em qualquer nova operação; não usar o perfil do conector MCP, que não tem acesso a este recurso, como destino alternativo. Não conectar Git com deploy automático durante esta etapa. Ler as condições atuais do plano de hosting para uso comercial antes da publicação manual.

`.env.prod` é privado, ignorado pelo Git, e recebeu os aliases canônicos e `SUPABASE_CLINIC_PROJECT_REF` explícito. A integração do Marketplace pode fornecer outros nomes; manter correspondência com os nomes efetivamente lidos pelo aplicativo, sem expor chave secreta como `NEXT_PUBLIC`. `DATABASE_URL` é somente para scripts confiáveis. A CA pública oficial está em `supabase/certificates/`, com origem/hash registrados; TLS remoto verifica CA e hostname.

**Next.js não carrega `.env.prod` por padrão.** Para executar o Next localmente contra este projeto, preparar `.env.local` mínimo privado conforme [setup](local-setup.md), com URL/publishable key, ref, chave de servidor, limite de login e flags necessárias. O arquivo mínimo foi preparado com permissão 0600; a execução do preview conectado fica registrada no ledger de validação. Definir `ALLOW_PUBLIC_SNAPSHOT=false` no ambiente editorial conectado; falha/configuração parcial não recupera posts antigos do snapshot. A aplicação local usa o recurso hospedado sem containers.

## 2. Inicialização transacional do banco

As fontes declarativas continuam em `supabase/schemas/01_editorial.sql` a `04_login_limit.sql`, `supabase/seed.sql` e nos [contratos do backend](../implementation/backend.md). O pacote nativo é `supabase/migrations/20261001202736_benchimol_editorial_initial.sql`. O inicializador aplica migration, seed e importação na mesma transação, reconcilia conteúdo/rotas e registra a migration no histórico nativo. Esta operação já foi confirmada no relatório acima; não reaplicar arquivos SQL isolados sobre essa base.

Para revisar o plano antes de qualquer futura execução:

```sh
node --env-file=.env.prod --import tsx scripts/migration/initialize-clinic.ts
```

Comando de execução, somente no destino aprovado e após revisar o plano:

```sh
node --env-file=.env.prod --import tsx scripts/migration/initialize-clinic.ts --execute --expected-ref=jjrzmuuwuvxcsnwqzvxf
```

O script exige ref explícito igual à configuração/API, TLS verificado e destino fora do loopback. Recusa banco/Storage ocupados ou histórico divergente, sem reset. A repetição com a mesma migration já registrada retorna `already-initialized` sem alterar dados; não é uma reimportação que sobrescreve edições. Mudanças posteriores exigem migration própria revisada. O plano apenas lê o pacote/acervo local; não inicializa o banco.

Não importar o XML bruto, comentários, rascunhos ou contatos privados da exportação. Assets legados continuam em `public/`, independentes do WordPress desligado; somente uploads novos usam Storage.

## 3. Contas autorizadas e vínculo administrativo

Gabriel desabilitou **Allow new users to sign up**; a conferência da API retornou `disable_signup=true`. `supabase/config.toml` local não altera essa opção no projeto remoto. Manter signup público e login anônimo desativados.

O primeiro administrador aprovado foi **Gabriel Krapp, `gabriel.krapp@hotmail.com`**. Essa conta pessoal ainda não existia na conferência de 01/10 às 23:53:54 UTC. Posteriormente, Gabriel criou `benchimol@benchimolclinic.com.br` e autorizou especificamente o acesso administrativo. O vínculo **Clínica Benchimol**, ativo, foi aplicado ao UUID Auth conferido em `2026-10-02T00:27:58.137Z`, somente neste projeto. Login/dashboard com 153 publicados, recarga e logout passaram no servidor local de Gabriel; a sessão de teste foi encerrada. [Diagnóstico e provas](../validation/clinic-admin-login.md). A rejeição automática inicial foi resolvida pela autorização explícita antes da escrita. Não atribuir a conta compartilhada da clínica a Gabriel Krapp nem criar novamente uma conta já existente.

Para provisionar a conta pessoal originalmente aprovada:

1. Na Vercel, abra **Storage**, selecione o recurso Supabase da clínica e use **Open in Supabase** para acessar o projeto/Studio. Confira o ref `jjrzmuuwuvxcsnwqzvxf` antes de prosseguir. O acesso pelo Marketplace está descrito no [guia oficial Supabase](https://supabase.com/docs/guides/integrations/vercel-marketplace).
2. Em **Authentication → Users**, use a criação administrativa de usuário, informe `gabriel.krapp@hotmail.com`, defina a senha pessoalmente no próprio painel e confirme o e-mail. Não usar cadastro público, senha WordPress, chat, repo, Brain ou arquivo de prompts para definir/transportar essa senha.
3. Copie apenas o **UUID do usuário Auth** e confira que o registro pertence ao e-mail aprovado e está confirmado. Informe UUID/e-mail ao responsável; a senha não é necessária para a vinculação.
4. Só depois dessa conferência, uma operação administrativa confiável vincula `public.administrators`: `user_id` é o UUID Auth conferido, `display_name` é Gabriel Krapp e `active` é true. Registrar o resultado sem credenciais. Não autorizar por `user_metadata` nem abrir escrita pública nessa tabela.
5. Gabriel entra no `/admin/` local conectado com o e-mail e a senha que definiu. A conta Auth isoladamente não concede acesso ao painel antes da vinculação explícita.

Na conferência da conta pessoal em 01/10 às23:53:54UTC, esse usuário ainda não existia; nenhuma conta/senha ou convite foi criado pelo agente. Recuperação por email continua desabilitada (`AUTH_RECOVERY_ENABLED=false`) até SMTP, redirects e entrega serem verificados. Não apresentar o SMTP padrão Free como entrega comprovada.

## 4. Aceite conectado, ainda sem deploy

Login, dashboard, persistência por recarga e logout foram confirmados com o Supabase hospedado. A rodada **QA-20261002-003846** concluiu os fluxos editoriais principais abaixo, com correções e retestes, exclusivamente no dev de Gabriel. [Matriz e provas](../validation/hosted-manual-qa.md). A recarga não comprova refresh de token e o logout não comprova revogação global; esses casos, o diálogo nativo de saída, mobile atual e backup/restore integral em outro destino hospedado continuam sem aceite próprio.

Roteiro de referência para futuras validações, preservando snapshot anterior e identificando somente fixtures novas:

- Login/logout, expiração/refresh, admin ativo e revogado. Visitante e conta Auth não autorizada recebem negação também por chamada direta à API.
- Criar rascunho, editar texto/imagem/YouTube, prévia privada, publicar, editar, retirar, lixeira/restaurar e histórico. Testar conflito de duas sessões e recusa de Voltar/Avançar com edição não salva.
- Upload direto, finalização e retry, alt/legenda, referência em capa/corpo/imagem SEO e bloqueio da exclusão utilizada. Conferir Storage privado, CORS e assinatura de download de 60 segundos.
- Popup em período de São Paulo, fechamento/teclado, reapresentação por versão, WhatsApp em todos os pontos e recuperação do contato anterior.
- Publicação/retirada aparece ou desaparece em Home/blog/artigo/taxonomia/sitemap; resposta de gravação pendente não deve ser tratada como confirmação pública. Post com data futura permanece privado até sua data.
- Exportação e restauração em destino de teste vazio, com banco e bytes de mídias geridas. A suíte local já exercita esse round-trip; a prova hospedada precisa de evidência própria. Backup não inclui Auth nem assets legados.

Não usar autenticação falsa ou a base LifeWallet para concluir esta lista. Registrar evidência em `docs/validation/` sem chaves, tokens, senhas ou dados privados. Remover apenas os dados de teste criados para essa validação, mediante revisão das referências.

O fechamento desta rodada preservou todos os originais: post QA/revisões/redirect removidos por transação limitada a IDs conferidos; quatro imagens excluídas pela UI com autorização específica; intenção WebP sem objeto e revisões QA de settings retiradas. Contato/aviso retornaram aos valores, versão, autoria e timestamps originais. **12 contagens/hashes coincidiram com o baseline** na [verificação posterior somente de leitura](../validation/hosted-manual-qa-verify.json). Triggers ativos ao commit, sem mudança de schema/funções/RLS e sem apagar Auth/logs de segurança. Rotina e snapshots dessa única rodada permanecem privados/ignorados em `backups/hosted-manual-qa/`, `0600`; não reutilizar essa purga como comando genérico em banco ocupado. A primeira tentativa de upload WebP falhou, retry passou; nenhuma causa específica foi comprovada.

Os resultados anteriores do Supabase Docker continuam históricos. Texto literal e upload completo pela interface foram retestados no destino hospedado, mas a fixture/conta/artigo e possível arquivo parcial antigos continuam nos volumes locais. Esta restauração hospedada **não os limpa**; não migrar fixtures nem direcionar `supabase:local:qa:clean` para produção. Docker só pode ser retomado após nova autorização expressa de Gabriel.

## 5. Publicação exclusivamente por Gabriel

O agente entrega código e evidências para revisão. Configuração Vercel, elegibilidade/custo, publicação, domínio/DNS e eventual merge são ações de Gabriel. A proibição permanente também inclui push que dispare deploy indireto.

Depois da publicação manual: conferir HTTPS, domínio/canonicals, acesso dos crawlers reais e CDN/WAF, cache/retirada editorial, cookies, limites do provedor, SMTP se ativado e Search Console. Testes locais não comprovam essa camada.

## 6. Manutenção após auditoria de 02/10/2026

As correções aprovadas têm [plano e evidências próprios](../validation/corrections-2026-10-02/README.md). A migration `20261002032930_benchimol_least_privilege.sql` corresponde a `supabase/schemas/05_least_privilege.sql`, restringindo privilégios da aplicação, sem alterar os schemas geridos pelo provedor. Não reescrever a migration inicial já aplicada. Uma instalação nova deve aplicar também a migration05 antes do aceite conectado.

O reparo de entidades em SEO legado só aceita versão1, hash de origem e objeto SEO anterior exatos; preserva edições posteriores, conteúdo e datas. O executor tem plano por padrão e confirmação do hash, destino exclusivo e TLS verificado:

```sh
npm run clinic:audit-corrections -- --expected-ref=jjrzmuuwuvxcsnwqzvxf
```

A execução exige `--execute --confirm-plan=HASH_DO_PLANO_CONFERIDO`, além do ref acima. Conferir o relatório atual antes de repetir; não há reset, reimportação ou publicação. Planos/backup privados ficam em `backups/`, com permissão0600; stdout e evidências públicas contêm somente contagens, hashes e propriedades técnicas. A validação hospedada efetiva, inclusive preservação, é registrada no relatório da rodada, não inferida da existência do script.

Para envios abandonados, o comando abaixo é **somente planejamento**, sem exclusão de banco ou Storage:

```sh
npm run clinic:cleanup-uploads -- --expected-ref=jjrzmuuwuvxcsnwqzvxf
```

`--execute --confirm-plan=HASH_DO_PLANO_CONFERIDO` torna o expurgo destrutivo; revisar cada candidato do manifesto privado antes de executar. Não está agendado nem é disparado ao iniciar o site. Elegibilidade: intenção de mais de quatro horas, identidade/path/tamanho/formato esperados, sem mídia registrada nem referência em post ou revisão. O comando congela as fontes de referência com locks e revalida o plano antes da exclusão. Lotes maiores que25 são recusados, falhas de lock abortam. **Storage e PostgreSQL são operações separadas: bytes apagados não retornam por rollback SQL.** Não usar como forma de excluir arquivos originais, mídias registradas, fixtures Docker ou dados de outros projetos.

Proteção contra abuso no endpoint direto do Supabase Auth, CAPTCHA, MFA e recuperação continuam dependentes de configuração/integração completa; seguir o [checklist específico](../validation/corrections-2026-10-02/security.md). Não exigir desafio/TOTP no provedor antes de suportar e testar o fluxo no admin. Não imprimir chaves para configurar o serviço.
