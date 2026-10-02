# Login e posts — navegador com Supabase Docker

Revisão em **01/10/2026**, exclusivamente em `127.0.0.1:3001`, conectada aos serviços reais de Auth/PostgreSQL/REST/Storage do Docker Benchimol. Uma conta descartável `.test` criada pelo fluxo local de QA foi usada; seus valores ficam em arquivo privado ignorado pelo Git. Nenhum usuário real da clínica foi criado e nenhum post WordPress foi editado.

| Fluxo observado | Resultado |
| --- | --- |
| Login por e-mail/senha e sessão autenticada | Acesso ao dashboard real, identificado como QA local descartável |
| Dashboard | 153 artigos públicos e 551 mídias importadas; contagens, bytes e alertas reais, sem métricas inventadas |
| Criar post | Primeiro salvamento gera rascunho versão1; texto, resumo, autoria e categoria preservados |
| Publicar sem data preenchida | Encontrado bug de `publishedAt:null` que impedia o default do RPC. Corrigido na validação do servidor; atualização versão3 recebeu data01/10/2026,00:46BRT e apareceu na rota pública |
| Editar | Resumo alterado, estado de alterações pendentes visível e confirmação antes de atualizar a publicação |
| Leitura pública | H1, corpo, autoria e data publicados; item aparece nas últimas postagens; comentários e formulário ausentes |
| Revisões | Versões1(rascunho) e2(publicação anterior) consultadas no histórico privado |
| Lixeira | Confirmação contextual, versão4, statusLixeira e mensagem de retirada confirmada; rota pública mostra Página não encontrada |
| Restaurar | Confirmação contextual, versão5, statusRascunho; conteúdo e metadados preservados, publicação não automática |

Evidências em `admin-local/dashboard-desktop.png`, `post-published-public.png`, `post-trashed.png`, `post-withdrawn-public.png` e `post-restored-draft.png`. As capturas mostram um artigo descartável de QA; ele não faz parte do acervo migrado. Sua remoção aguarda a retomada e a limpeza local autorizadas, conforme a interrupção abaixo.

Os três testes de `tests/backend/publication-date.test.ts` reproduziram o bug antes do ajuste e confirmam data padrão do servidor, preservação de agendamento explícito e possibilidade de limpar a data de um rascunho. O SQL declarativo e o bootstrap Docker não foram alterados para esse ajuste. A interface também evita declarar atualização pública de um registro sem data.

A indicação de alterações não salvas foi observada no navegador. A confirmação nativa de saída não foi controlável nesta sessão IAB: as tentativas não entregaram um diálogo inspecionável e a navegação ocorreu. **Não contar isso como prova de cancelamento real no navegador.** Os seis testes de histórico exercitam cancelamento/restauração do formulário em Voltar/Avançar e preservação de estado do Next; a confirmação nativa deve ser conferida pelo usuário em seu navegador durante o aceite.

Aviso, WhatsApp, histórico de contato, prompts e upload têm relatório próprio em `admin-local-qa.md`. A integração SDK/SQL real é registrada em `supabase-local.json`. Essas evidências locais não certificam SMTP, cookies/refresh hospedados ou CDN da Vercel. O reteste no navegador das correções dos normalizadores de texto literal, após a falha de `&amp;` identificada no contato, também continua pendente; não inferir sua aprovação a partir dos fluxos de posts acima.

## Interrupção por pedido de Gabriel — 01/10/2026

Gabriel pediu continuar sem Docker por consumo de memória. A revisão em 3001 foi interrompida; o daemon estava inacessível e não foi reaberto para encerrar sessões, confirmar upload ou limpar dados. **Logout e limpeza da conta, artigo e demais registros descartáveis não foram executados.** As evidências anteriores foram preservadas.

O upload pela interface chegou apenas a “Preparando envio…” no relatório de mídias, sem confirmação de finalização. Ao retomar voluntariamente o Docker com nova autorização de Gabriel, conferir o estado dessa intenção/arquivo e a identidade exata da fixture antes de executar a limpeza local. Não iniciar containers só para resolver essa pendência, apagar volumes ou remover conteúdo importado.

O projeto Supabase hospedado da clínica é independente. Configurá-lo ou importar o acervo nele não remove a fixture e os dados preservados nos volumes Docker locais; nenhuma limpeza local pode ser direcionada ao banco hospedado.
