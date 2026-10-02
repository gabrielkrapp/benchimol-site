# Login da conta da clínica — 01/10/2026

Gabriel criou `benchimol@benchimolclinic.com.br` e autorizou testar o login no seu servidor `http://127.0.0.1:3000/admin/login/`. A senha foi usada somente no formulário, sem registro em arquivos, relatórios, Brain ou prompts. O servidor pertence ao usuário; não se iniciou ou reiniciou Next, Docker ou deploy.

## Diagnóstico confirmado

A consulta somente leitura, com ref/API/identidade PostgreSQL e TLS verificados, encontrou a conta confirmada, sem bloqueio ou exclusão, no projeto exclusivo `jjrzmuuwuvxcsnwqzvxf`. O formulário reproduziu a mensagem genérica de login recusado. A conferência posterior registrou `last_sign_in_at=2026-10-02T00:09:49.470Z`: o Supabase aceitou as credenciais, mas **não existe registro dessa identidade em `public.administrators`**. Evidência sem credenciais em [clinic-admin-access.json](clinic-admin-access.json).

Captura da reprodução, com campo de senha vazio: [clinic-admin-login-before.png](clinic-admin-login-before.png).

`src/app/api/auth/login/route.ts` retorna o mesmo 401 para credenciais inválidas e para ausência de vínculo administrativo ativo; nesse segundo caso encerra a sessão. `requireAdmin` e RLS exigem o vínculo real por UUID, sem autorização por metadata. O diagnóstico é de provisionamento da conta, sem necessidade de alterar senha, guard de origem, schema ou políticas. Revisão independente confirmou esses requisitos e o limite de oito tentativas por email em 15 minutos.

## Vínculo autorizado e aplicado

Gabriel respondeu **“Autorizo”** à confirmação específica de conceder acesso administrativo a `benchimol@benchimolclinic.com.br` no projeto da clínica. O vínculo foi aplicado com `display_name='Clínica Benchimol'` e `active=true`, somente para a identidade Auth conferida. SQL parametrizado em transação reconferiu UUID/email/confirmação/ausência de bloqueio ou exclusão e de vínculo anterior, exigiu exatamente uma inserção e confirmou a leitura após commit em **`2026-10-02T00:27:58.137Z`**. [Relatório de concessão](clinic-admin-binding.json). Não houve upsert, mudança de senha, conta Auth nova, email enviado ou alteração de schema/políticas.

A revisão automática havia rejeitado a primeira execução por exigir autorização explícita e específica para conceder privilégios em produção. A tentativa inicial não foi executada; a operação só ocorreu depois da confirmação do usuário. O [relatório anterior](clinic-admin-access.json) foi preservado como evidência do estado antes da concessão.

## Login e sessão verificados

No servidor já iniciado por Gabriel, o login com a mesma conta abriu `/admin/`, exibiu a identidade **Clínica Benchimol** e **153 publicados, zero rascunhos e zero itens na lixeira**. Ao recarregar, o dashboard carregou novamente com a mesma identidade e contagens. “Sair” retornou ao formulário; uma nova navegação a `/admin/` sem sessão também retornou ao login. A sessão de teste foi deixada encerrada.

Provas: [relatório de interface](clinic-admin-login.json), [dashboard carregado após recarga](clinic-admin-login-after.png) e [logout](clinic-admin-logout.png). O primeiro frame capturado logo após uma recarga ainda mostrava carregamento; foi preservado separadamente em [frame transitório](clinic-admin-login-reload-transition.png), sem usá-lo como prova do dashboard completo.

Este teste confirma login, persistência por recarga e logout. Não comprova refresh de token/revogação global, CRUD, upload gerido ou Vercel publicada. Nenhum conteúdo clínico foi alterado e nenhum servidor, Docker ou deploy foi iniciado.

Datas dos relatórios usam UTC: `2026-10-02T00:…Z` corresponde à noite de 01/10/2026 em São Paulo.
