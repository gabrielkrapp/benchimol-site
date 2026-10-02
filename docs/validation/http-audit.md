# Auditoria HTTP local — 01/10/2026

## Rodada final confirmada: build HUHe

O [relatório HUHe](local-html-HUHevW-DGRcC9RbS-5oQu.json) confirma **PASS**, com `completed: true`, `passed: true` e **zero falhas**, exclusivamente em `http://127.0.0.1:3002`, build **`HUHevW-DGRcC9RbS-5oQu`**. A leitura usa o HTML inicial e CSS como dados, sem executar JavaScript. O [relatório LT5 anterior](local-html-LT5XtX2XqdFBQDKFelcC9.json) permanece preservado com seus próprios horários e build.

| Item | Resultado confirmado |
| --- | --- |
| Início UTC | 01/10/2026, 22:30:12.082 |
| Término UTC | 01/10/2026, 22:31:45.588 |
| Duração calculada pelos timestamps | 93,506 segundos (1 min 33,506 s) |
| Artigos e páginas | 153 artigos + 38 páginas; 191 solicitações HTML tentadas |
| Rotas extras capturadas | 106 descobertas e tentadas; 297 resultados de rotas no total |
| Assets locais | 478 descobertos e 478 tentados |
| CSS | 42 stylesheets descobertos e tentados; 98 assets locais referenciados pelo CSS |
| Referências CSS sem requisição | 86 ignoradas; zero referências ou origens externas |
| Maior HTML | 263.358 bytes |
| Sitemap | HTTP 200 |
| Endpoint administrativo sem sessão | HTTP 401 após um salto de normalização da barra final |
| Transporte | `Connection: close`, timeout de 60 segundos, zero retries automáticos |

O 401 confirma a negação sem sessão no endpoint auditado; não certifica login/refresh, upload gerido ou uma sessão administrativa real. O relatório também não substitui comparação visual, funcionamento com JavaScript ou validação de Vercel/CDN publicada. Nenhum container, recurso hospedado ou deploy é iniciado por esta auditoria HTTP local.

Esta aprovação pertence ao **build HUHe e aos horários acima**. Um build posterior só pode receber aprovação pelo próprio relatório concluído; não herda este PASS. A rodada LT5 histórica ocorreu em 21:35:42.179→21:38:11.899 UTC (149,720s) e também concluiu sem falhas.

## Histórico de transporte e fixtures — 30/09/2026

A desconexão inicial foi reproduzida sem alterar a aplicação: o servidor Next.js retornou `200` e `Keep-Alive: timeout=5`; após bloquear o event loop do cliente por 6,5 segundos, a próxima chamada `fetch` falhou com `ECONNRESET`. O mesmo ensaio com `Connection: close` retornou `200` nas duas solicitações. A análise síncrona de DOM no auditor expunha essa corrida de reutilização de conexão; não foi necessário reiniciar o servidor.

O auditor agora abre uma conexão por solicitação, usa timeout de 60 segundos e **não repete solicitações que falharam**. Fecha os dois DOMs de cada artigo em `finally`, consome as respostas e salva checkpoints atômicos. Cada erro conserva URL e fase; uma execução interrompida permanece `completed: false`. Redirecionamentos são verificados em até oito saltos, com detecção de ciclos e recusa de destino fora do mesmo origin local. Rotas legadas precisam terminar em `200` no endereço esperado e usar somente saltos permanentes `301`/`308`. Os saltos ficam registrados no relatório.

A primeira execução completa corrigida para transporte verificou 153 artigos, 38 páginas, 106 outras rotas capturadas e 359 assets, sem erro de conexão, divergência de texto/imagens/canônica ou asset ausente. Terminou **reprovada** por duas checagens de redirecionamento ainda anteriores ao ajuste: `/convenios-nv` primeiro normaliza a barra final antes de chegar a `/convenios/`, e `/api/admin/dashboard` normaliza a barra antes de retornar o status final. O maior HTML observado tinha 253.656 bytes. O código passou a registrar e validar essas cadeias; o `local-html.json` daquela coleta registrava a reprovação. O resultado aprovado LT5 está identificado separadamente acima. O status `503` de configuração incompleta da rodada antiga não comprova autenticação hospedada.

Fixtures temporárias, separadas do repositório e do relatório real, confirmaram: servidor local inacessível gera cinco falhas identificadas, relatório completo reprovado e exit code `1`, sem retries; uma cadeia local de dois `308` até o destino correto e a normalização do endpoint privado até `503` são registradas e passam. A conferência de tipos do arquivo foi independente das edições concorrentes da aplicação. Esse histórico não foi reexecutado para atualizar este documento. Após qualquer novo build/ajuste visual, executar a auditoria local e registrar sua proveniência; somente o relatório correspondente com `completed: true`, `passed: true` e nenhuma falha aprova aquela rodada.

A cobertura de recursos inclui o HTML final das rotas extras (blog, taxonomias e galerias), além dos 191 documentos iniciais. O auditor lê os arquivos CSS locais como texto e extrai tokens `url()`, respeitando comentários, strings e escapes; resolve fontes e backgrounds em relação ao endereço do CSS e verifica esses arquivos por `HEAD`. CSS local referenciado também é lido, sem executar estilos ou JavaScript. Destinos externos, `data:`, `blob:` e fragmentos não são requisitados. O relatório informa estilos tentados, referências CSS locais e contadores das referências ignoradas/externas. Fixtures específicas cobriram CSS relativo, escape de espaço, fonte com query, CSS importado, imagem de arquivo extra e exemplos `url()` em comentários/strings: nove recursos locais passaram; uma fonte propositalmente ausente gerou a falha `404` esperada e reprovou a segunda execução. A extensão teve verificação real nas rodadas LT5 histórica e HUHe final; builds posteriores continuam exigindo relatório próprio.
