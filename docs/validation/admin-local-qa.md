# QA administrativo no Supabase Docker

Revisão local iniciada em 01/10/2026. Destino exclusivo: `http://127.0.0.1:3001/admin/`, conectado ao Supabase Docker Benchimol. Sem alterações no WordPress, recursos cloud, posts importados ou credenciais reais.

## Escopo desta revisão

- Aviso: prévia, texto com parágrafos, período inválido e gravação inativa; restaurar a configuração original.
- WhatsApp: preservar o número original, salvar mensagem marcada como QA, conferir histórico e restaurar pelo painel; não abrir nem enviar mensagem externa.
- Prompts: catálogo, contexto, referências e cópia; nenhuma execução de IA.
- Mídia: selecionar e enviar uma única cópia do logo público da clínica (`public/wp-content/uploads/2023/01/logo-N5XYWG.png`, 6.471 bytes), conferir imagem/detalhes e biblioteca. Sem pacientes ou pessoas na fixture.

Login usa somente a conta descartável mantida em arquivo privado com permissão `0600`. Senhas e tokens não são registrados neste relatório nem nas capturas. A limpeza da fixture ficou pendente após a interrupção; só poderá ser retomada com nova autorização de Gabriel para executar o Docker local.

## Resultados efetivamente observados

A primeira abertura retornou `net::ERR_CONNECTION_REFUSED`, pois o dev local anterior já tinha terminado. Depois que o responsável iniciou novamente o wrapper local, o painel abriu com a sessão real da conta descartável. Os resultados abaixo são da interface desse ambiente; não usam autenticação simulada.

| Fluxo | Resultado observado |
| --- | --- |
| Aviso de texto | Título e dois parágrafos foram salvos com o aviso **inativo**, na versão 2. A prévia mostrou os parágrafos; Escape fechou o diálogo. O aviso não foi ativado. |
| Período inválido | Pela entrada nativa, início `02/10/2026 09:00` e fim `01/10/2026 09:00` foram recusados com “O início do aviso deve ser anterior ao fim.” O texto permaneceu no formulário. O fill genérico da ferramenta não alterava `datetime-local`; isso foi resolvido pela entrada nativa e não foi tratado como falha do produto. |
| Restauração do aviso | Título/texto vazios, datas vazias e estado inativo originais foram gravados na versão 3. A tela confirmou “Aviso salvo” e “Sem alterações não salvas”. |
| WhatsApp | O número original foi preservado. A mensagem QA foi gravada na versão 2 e o histórico exibiu a versão 1, autor descartável e data. O botão gerou o link codificado; nenhum link externo foi aberto e nenhuma mensagem foi enviada. Foi encontrada a falha de texto literal descrita abaixo. |
| Restauração do contato | A versão 1 foi selecionada no histórico e restaurada mediante diálogo contextual. A tela confirmou “Contato restaurado”, exibiu número/mensagem originais na versão 3 e manteve o histórico. |
| Prompts | As oito tarefas do catálogo foram selecionadas. Cada uma mostrou o texto base, a instrução correspondente e os caminhos dos documentos de contexto. P04 exibiu versão 0.2 e a orientação de conferir colisões com posts/rotas reservadas. A cópia de P04 foi confirmada por mensagem na tela e igualdade exata entre clipboard e textarea. Nenhum prompt foi executado. |
| Biblioteca de mídias | A interface listou 551 itens, paginação, dimensões/tamanhos, indicação de uso e links de arquivos legados. Nenhum registro importado foi modificado. |
| Upload da fixture | O seletor recebeu o logo público de 6.471 bytes; alt e legenda foram preenchidos como QA. O envio chegou a **“Preparando envio…”**, com os campos desabilitados. Não foi observada confirmação de finalização, nova mídia na lista, download, preview nem edição de detalhes. **O upload permanece sem aprovação**; pode ter deixado uma intenção/arquivo parcial a conferir futuramente. |

O viewport não foi modificado para preservar a coleta visual pública em andamento. Fluxos de posts/editor/publicação/lixeira e navegação ficaram com o responsável e não são certificados por este relatório.

## Falha encontrada: `&` convertido em entidade literal

Antes de salvar a mensagem QA contendo `&`, o link de teste gerado pelo formulário codificava o caractere como `%26`. Depois do salvamento, o campo e o histórico passaram a mostrar `&amp;` literalmente; o link passou a conter `%26amp%3B`. Isso altera a mensagem que o visitante levaria ao WhatsApp. A falha foi comunicada ao responsável antes de qualquer ajuste. O contato original foi efetivamente restaurado pela UI.

A correção dos normalizadores ficou com o responsável da implementação; seus resultados de testes locais não substituem este reteste. **Não foi realizada nova validação no navegador depois dessa correção**; não apresentar este caso como aprovado até o reteste com backend real. Avisos e outros campos de texto literal também devem ser abrangidos nesse reteste.

## Interrupção pedida por Gabriel — 01/10/2026

Gabriel pediu continuar sem containers por consumo de memória. A revisão dependente de Docker/dev3001 foi interrompida. Após essa instrução, não houve nova interação com o painel, API, upload, gravação, logout ou limpeza por este revisor. O daemon estava inacessível e não foi reaberto para verificar ou limpar dados. Este relatório não iniciou ou reiniciou Docker.

A fixture privada e eventuais dados de QA **não foram limpos**, e o logout não foi executado. Sua limpeza deve ser retomada somente com nova autorização de Gabriel para executar o Docker, após conferir a identidade da fixture e o estado do upload pendente. Não executar reset, apagar volumes nem alterar usuários/posts importados para resolver essa pendência.

O Supabase hospedado da clínica é outro destino. Preparar seu banco, Auth ou Storage não limpa essa fixture nem os dados nos volumes locais. Não copiar a conta descartável, suas credenciais ou registros de QA para o projeto hospedado, nem executar a limpeza local contra ele.

## Evidências locais

- [Prévia do aviso](admin-local/settings-popup-preview.png).
- [Recusa do período inválido](admin-local/settings-popup-period-error.png).
- [Aviso original restaurado](admin-local/settings-popup-restored.png).
- [Contato QA salvo, mostrando a entidade literal](admin-local/settings-contact-saved.png).
- [Contato original restaurado](admin-local/settings-contact-restored.png).
- [Prompt completo copiado](admin-local/settings-prompts-copy.png).

Nenhuma captura de sucesso de upload foi produzida. Conta hospedada, SMTP real, CORS/Storage hospedado e funcionamento de produção não foram validados neste ambiente.
