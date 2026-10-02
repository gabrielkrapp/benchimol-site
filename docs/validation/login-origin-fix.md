# Login local: origem recusada — 01/10/2026

Gabriel reportou HTTP 403 `origin_denied` em `http://127.0.0.1:3000/admin/login/`. O servidor da porta 3000 pertence a Gabriel; o agente não o iniciou, interrompeu ou reiniciou. Não houve Docker ou deploy.

## Reprodução e correção

O guard em `src/lib/server/http.ts` comparava Origin com o domínio configurado e apenas um hostname loopback de `Request.url`. O Next possui mais de um caminho de construção da URL; não se deduziu a URL efetiva somente pelo binding da CLI.

No servidor real, antes de editar código, POST com corpo `{}`, Host `127.0.0.1:3000` e Origin `http://127.0.0.1:3000` retornou 403. Com Origin `http://localhost:3000`, a chamada retornou 422, inclusive mantendo Host IP. Isso isolou a diferença dos aliases no guard, antes de validar credenciais ou chamar o login Supabase.

Agora `localhost` e `127.0.0.1` são equivalentes somente quando a URL da requisição é loopback, mantendo protocolo e porta. Host e X-Forwarded-Host arbitrários não autorizam origens. Origin ausente/externo/inválido, outras portas/protocolos e Sec-Fetch-Site `cross-site` continuam recusados; a regra do domínio de produção permanece.

| Probe no servidor de Gabriel | Antes | Depois |
|---|---|---|
| IP/IP, same-origin, corpo vazio | 403 origin_denied | 422 validation |
| localhost/localhost, same-origin, corpo vazio | 422 validation | 422 validation |
| IP/IP, cross-site | 403 origin_denied | 403 origin_denied |
| Origem externa, metadata same-origin | não coletado | 403 origin_denied |

422 confirma passagem pelo guard e recusa do corpo vazio; **não comprova senha, sessão ou login bem-sucedido**. Nenhuma credencial foi enviada. Revisão independente não encontrou bloqueadores.

## Verificação

- RED: 22 casos novos, três aliases recusados indevidamente, exit 1.
- GREEN focal: 32 testes em dois arquivos, zero falhas, exit 0.
- Suite completa: **196 testes em 30 arquivos**, zero falhas, exit 0; início `2026-10-01T23:52:22.603Z`, duração 91,764s. [Relatório próprio](tests-origin-fix.json).
- `npm run typecheck`: exit 0.
- Build/HTTP HUHe e `final-summary.json` são evidências **anteriores** ao patch. Não se recompilou `.next` enquanto Gabriel roda seu dev; gerar e validar novo build antes de `next start` ou publicação manual.

Context7 continuou indisponível. Consultados [NextRequest oficial](https://nextjs.org/docs/app/api-reference/functions/next-request), guia/adaptadores instalados Next16.3.8 e [changelog Supabase](https://supabase.com/changelog.md). Nenhuma mudança de SDK/Auth/schema foi necessária para o guard.

## Conta ainda pendente

Consulta somente leitura em `2026-10-01T23:53:54.892Z` confirmou ref/API/TLS do projeto exclusivo `jjrzmuuwuvxcsnwqzvxf` e encontrou **zero usuários Auth com o email aprovado** `gabriel.krapp@hotmail.com`. A correção não cria conta nem concede acesso por metadata. Gabriel precisa criá-la com senha própria/e-mail confirmado; depois conferir UUID/email e vincular `administrators`, conforme [roteiro](../operations/clinic-integration.md). Nenhuma conta, senha, convite ou alteração de banco foi criado nesta correção.

**Rodada posterior:** Gabriel criou e autorizou especificamente a conta da clínica `benchimol@benchimolclinic.com.br`; vínculo ativo aplicado e login/dashboard/recarga/logout confirmados. Essa identidade é separada da conta pessoal ausente nesta rodada. Consulte [provas posteriores](clinic-admin-login.md); este relatório preserva o estado histórico do teste de origem.
