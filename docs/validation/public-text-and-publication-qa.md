# Correções encontradas no QA manual — 01/10/2026

## Texto público e SEO

O fixture editorial com `&`, `<`, `>` e acentos mostrou entidades HTML literais no título da aba e no índice do artigo, enquanto o título visível do artigo estava correto. A causa foi confirmada em teste: `sanitize-html` devolvia texto escapado em `publicText`; o consumidor escapava esse resultado novamente. Além disso, campos SEO e títulos editoriais são texto simples e não devem passar por remoção de tags, que descartava textos literais como `<termo>`.

`publicText` agora extrai texto decodificado dos nós após a sanitização. O índice e os resumos continuam escapando no ponto onde geram HTML. Metadados dos posts preservam os campos de texto simples; apenas o fallback do resumo HTML precisa dessa extração. JSON-LD segue o mesmo tratamento da descrição, mantendo o escape do documento na renderização.

A regressão em `tests/public/text-encoding.test.ts` reproduziu quatro falhas antes do patch. Depois passaram os quatro casos e os testes existentes de conteúdo/renderização: **28 testes em três arquivos**. A prova manual de recarga fica no relatório da rodada; esses testes não representam aceite visual de todo o site.

## Confirmação de atualização pública

Na publicação automática do fixture, sem preencher data, o painel informou confirmação pendente, embora uma visita pública nova já mostrasse a versão publicada. Uma edição seguinte confirmou a versão normalmente. Uma segunda publicação automática repetiu o comportamento. O diagnóstico posterior confirmou uma condição de fronteira temporal, descrita abaixo; não atribuir esse evento a uma falha da assinatura da API Next.js nem prometer eliminação de falhas transitórias do provedor.

A invalidação por padrão foi ajustada para o arquivo de rota realmente registrado, `/(public)/[[...path]]`, com tipo `page`. Os padrões anteriores de categoria, tag e autor não correspondiam a arquivos de páginas separados. Os caminhos concretos, inclusive sitemap e slug anterior, continuam na invalidação.

Falhas de confirmação agora registram somente fase e código no servidor. A mensagem do cliente continua genérica; não registrar mensagem/stack do provedor, URL, segredo ou conteúdo editorial. Isso distingue invalidação, leitura pública e divergência de versão em uma próxima ocorrência.

Os cinco testes de `tests/backend/publication-confirmation.test.ts` falharam antes e passaram depois. O typecheck passou após ambos os patches. A validação final após estabilizar todos os patches está registrada abaixo; build, hospedagem/CDN e deploy não foram executados nesta revisão.

## Referências técnicas

Context7 não estava exposto nos tools desta sessão. Foi lido o guia instalado `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md` da versão fixada no projeto, além das fontes primárias atuais:

- [Next.js — revalidatePath](https://nextjs.org/docs/app/api-reference/functions/revalidatePath): padrões devem representar a estrutura dos arquivos; Route Handlers marcam a próxima visita para revalidação.
- [html-react-parser — documentação oficial do projeto](https://github.com/remarkablemark/html-react-parser): parser de nós DOM disponível no servidor. Parsing não substitui sanitização.
- [sanitize-html — documentação oficial do projeto](https://github.com/apostrophecms/sanitize-html): sanitização produz HTML e preserva escapes necessários ao documento.

Os patches de texto e publicação acima não exigiram acesso ao Supabase. Não alteraram dados remotos nem iniciaram/reiniciaram servidor ou Docker. Os ajustes estão locais para revisão, sem merge/deploy.

## Diagnóstico posterior de edição concorrente

Uma segunda tela com versão antiga ficou em `Salvando…` durante o teste manual. Em consulta exclusivamente de leitura às **2026-10-02T01:19:15.170Z**, com binding/API/identidade PostgreSQL/TLS conferidos no projeto `jjrzmuuwuvxcsnwqzvxf`, não havia sessões bloqueadas (`pg_blocking_pids` vazio). As duas consultas ativas tinham duração arredondada de zero segundos. O fixture estava em versão 7, rascunho, com confirmação pública atual, atualizado às 01:18:29.760Z. Nenhum payload ou texto de consulta foi coletado.

O SQL versionado compara `expected_version` após obter o bloqueio da linha, antes de gravar. O mapeamento de erros transforma `40001` em HTTP 409. O SDK instalado não repete RPCs POST. Essa leitura isolada não determinou a causa da espera observada; não houve alteração SQL/remota.

A repetição em telas novas também demorou cerca de três minutos e terminou em erro genérico 503. A causa da espera no caminho remoto não foi determinada. A rota agora recusa uma versão já antiga na leitura administrativa inicial com HTTP 409, antes de chamar o RPC. O RPC continua recebendo `expected_version` e mantendo o bloqueio/verificação atômicos para alterações que ocorrerem entre leitura e gravação. Falhas RPC registram somente um código PostgreSQL/PostgREST validado no servidor.

Após o patch, a terceira reprodução manual, versão antiga 14 contra versão salva 15, retornou o aviso de conflito em menos de cinco segundos, manteve o título não enviado e ofereceu comparação com a versão atual. A coordenação registrou essa prova; a corrida exata entre a leitura inicial e o RPC não foi induzida no ambiente remoto. A regra atômica continua coberta pelos testes do SQL embutido.

As solicitações administrativas do navegador têm prazo de confirmação de 45 segundos, incluindo leitura do corpo da resposta, e preservam cancelamento pelo chamador. Não há repetição automática da gravação. Um timeout de mutação informa que ela pode ter sido salva e pede consultar a versão atual antes de reenviar; não afirma rollback nem perda do conteúdo. O editor conserva o formulário e encerra o estado ocupado pelo fluxo de erro já existente. Leituras recebem mensagem própria de carregamento.

Os testes novos de `post-save-version` e `api-timeout` reproduziram as falhas antes dos patches. Passaram **11 testes em três arquivos** junto da cobertura existente de respostas administrativas, e typecheck. Referência: [MDN — combinação de AbortSignals](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/any_static).

## Data de publicação durante a confirmação

Às **2026-10-02T01:29:32.344Z**, três leituras do relógio PostgreSQL com binding/TLS da clínica confirmado mediram o servidor entre **468 e 506 ms à frente** do relógio local; a latência de cada leitura foi de 32–35 ms. Apenas horários/latência e estado do fixture foram lidos.

O código público fixava `published_at <= agora` ao iniciar cada consulta, mas verificava `isPostPublic` novamente depois de aguardar as respostas. Uma data podia passar durante essas leituras: o resultado ainda correspondia ao limite antigo, enquanto a comparação já exigia a versão pública pelo relógio novo. Paginação também podia mudar de limite entre páginas.

A confirmação e todas as páginas da consulta agora usam **o mesmo instante UTC**. Os leitores públicos aceitam esse instante opcional, mantendo o comportamento padrão quando não informado. Snapshot, filtros SQL, comparação e mensagem de agendamento usam esse mesmo valor. Não foi adicionada espera, tolerância antecipando datas ou mudança de RLS; posts futuros continuam privados conforme o limite consultado.

Três regressões falharam antes: pendência artificial ao cruzar a data, instante explícito ignorado e duplicata ao paginar durante essa fronteira. Depois passaram **21 testes em quatro arquivos** de publicação/fonte pública e typecheck. Na reprodução manual posterior, a coordenação confirmou a versão 19 do fixture: data deixada vazia, primeira publicação atribuída pelo servidor, confirmação `current` e artigo visível em visita pública nova. A versão 20 foi movida para a lixeira antes da limpeza da rodada.

## Validação final do código

Depois de estabilizar os patches e encerrar os testes paralelos, `npm test` passou com **229 testes em 38 arquivos**, exit 0, duração de 171,46 segundos (início 22:35:23 BRT de 01/10). Em seguida, `npm run typecheck` terminou com exit 0. A suíte usa arquivos em sequência e não iniciou Docker. Esses comandos não equivalem a build novo ou aceite de hospedagem/CDN; o servidor local permaneceu sob controle do usuário.

As saídas completas retornadas pelos tools foram consolidadas depois da conclusão, sem executar novamente os comandos: [npm test](hosted-manual-qa-npm-test.log), [typecheck](hosted-manual-qa-typecheck.log) e [manifesto com exit codes, sessões e SHA-256](hosted-manual-qa-automated.json). Esses arquivos preservam a prova da execução original; não são uma nova rodada de testes.

A restauração final foi verificada às **2026-10-02T01:40:37.711Z**, com as 12 relações do baseline editorial iguais por hash: [conclusão com commit e comparação](hosted-manual-qa-finish.json) e [verificação posterior somente de leitura](hosted-manual-qa-verify.json). O oráculo preserva conteúdo original, dados de segurança/Auth e triggers de settings. A prova detalhada dos fluxos e arquivos de mídia está no relatório consolidado da rodada; este documento não substitui aquele oráculo nem declara remoção dos logs de segurança.
