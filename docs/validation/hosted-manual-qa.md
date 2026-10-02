# QA manual do painel e restauração — 01/10/2026

Rodada **QA-20261002-003846**, iniciada às **2026-10-02T00:38:46.471Z** (noite de 01/10 em São Paulo). Foram exercitados os fluxos administrativos pelo navegador, no servidor de Gabriel em `http://127.0.0.1:3000`, com Auth/PostgreSQL/Storage reais do projeto exclusivo da clínica **`jjrzmuuwuvxcsnwqzvxf`**. A sessão foi encerrada ao final.

**Resultado:** criar, editar, publicar, retirar e excluir posts; enviar, editar e excluir imagens; aviso; WhatsApp; prompts; histórico e proteção de acesso passaram nas reproduções finais. Os defeitos encontrados foram corrigidos e retestados. A primeira tentativa WebP falhou e o retry passou; a causa desse evento isolado continua indeterminada. O estado editorial foi reposto e conferido por **12 contagens e hashes**, incluindo configurações, históricos e inventário de Storage. Nenhum original WordPress foi editado ou excluído.

Os testes usaram somente um post e quatro imagens sintéticas de QA. Não houve Docker, início/reinício do servidor, build concorrente, merge, push ou deploy. O uso do Supabase da clínica estava autorizado; nenhum recurso LifeWallet foi utilizado. A exclusão permanente das quatro imagens teve confirmação específica de Gabriel.

## Matriz de testes manuais

| Fluxo | Resultado observado |
|---|---|
| Login/sessão | Login real da clínica e navegação protegida passaram. Ao finalizar, logout e acesso direto ao admin retornaram ao login |
| Criar post | Rascunho com título, autoria, resumo, categoria, tag, capa, imagem SEO e corpo rico salvo e reaberto. Título/slug vazios e slug reservado `admin` recusados |
| Prévia | Conteúdo e imagens salvos presentes; `noindex,nofollow`. Rascunho privado na URL pública e ausente do sitemap |
| Publicar | Artigo e imagem acessíveis; entrada no blog/Home; título SEO, descrição e índice preservando `&`, `<`, `>`, acentos. Publicação automática final v19 confirmou `current` e apareceu em visita pública nova |
| Editar | Título, slug e conteúdo persistiram; URL anterior redirecionou para o novo slug. Resumo digitado incrementalmente manteve espaço, Enter e duas linhas após reabertura |
| Editor | Parágrafo, H2, negrito, lista, imagem, alt e legenda multilinha preservados. Diálogos de link/vídeo/alt funcionaram; link `javascript:` e vídeo fora do formato permitido recusados |
| Vídeo | URL HTTPS incorporável do YouTube salva e iframe público em `youtube-nocookie.com` observado. Reprodução externa do vídeo não foi testada |
| Histórico/agendamento | Histórico disponível; restauração trouxe conteúdo antigo como rascunho, preservando slug atual. Data futura deixou artigo privado. Retirar publicação manteve conteúdo |
| Concorrência | Após correção, versão antiga 14 contra 15 recusada em menos de cinco segundos, formulário conservado e comparação com versão atual disponível. Nenhuma sobrescrita observada |
| Excluir/restaurar post | Cancelar conservou o post; confirmar lixeira retirou publicação e bloqueou edição. Restaurar trouxe rascunho editável. Purga final removeu exclusivamente a fixture e suas referências |
| Listar posts | Paginação ida/volta, busca, categoria, status e ordenação combinados funcionaram |
| Subir mídia | PNG, JPEG, WebP e GIF finalizados na biblioteca e carregados com dimensões 320×180. WebP precisou de retry após a primeira falha |
| Validar mídia | Arquivo `.txt` e tamanho acima de 10 MB recusados. PNG com bytes de texto recusado pelo servidor; nenhum arquivo inválido persistiu |
| Editar mídia | Alt/legenda com literais, acentos e duas linhas salvos e reabertos exatamente |
| Excluir mídia | Cancelar conservou JPEG; confirmação excluiu JPEG, WebP, GIF e, após liberar as referências de QA, PNG. Toast de sucesso em cada caso; inventário final vazio e quatro URLs 404 |
| Proteção de mídia | Imagem usada no post/histórico teve exclusão bloqueada. Imagem legada tinha exclusão indisponível e foi apenas consultada |
| Aviso | Ativo vazio e período invertido recusados; prévia e exibição pública com texto literal/quebras passaram. Escape/Fechar funcionaram; recarga da mesma versão/sessão não reapresentou o aviso. Datas futura e expirada ocultaram o aviso |
| WhatsApp | Número inválido recusado; número formatado normalizado. Os seis links da Home receberam a mensagem literal/multilinha corretamente codificada; histórico recuperou contato anterior. Nenhuma mensagem foi enviada |
| Prompts | Oito opções e arquivos de contexto disponíveis; seleção e cópia integral conferidas. Nenhum prompt foi executado em IA |
| Dashboard final | 153 publicados, zero rascunhos, zero na lixeira e 551 mídias. Alertas de alt ausente já existentes na origem preservados |

Registro cronológico: [casos e retestes](hosted-manual-qa-cases.json). As falhas iniciais permanecem no registro; não foram apagadas para produzir um resultado artificialmente uniforme.

## Correções e retestes

- Editor marcava conteúdo salvo como alterado ao alternar editabilidade. `setEditable` passou a não emitir atualização de conteúdo; uma aba nova confirmou ausência do falso aviso.
- Resumo perdia quebras, espaço ou Enter durante digitação. Extração de texto agora conserva esses caracteres e decodifica entidades uma vez; digitação e reabertura foram retestadas.
- `window.prompt` não funcionava no navegador embutido. Link, vídeo e alt/legenda usam diálogos HTML/React acessíveis, testados manualmente.
- Metadados e índice exibiam entidades HTML duplicadas. Texto simples permanece literal e o resumo HTML é decodificado após sanitização; SEO/índice retestados.
- Confirmação de publicação podia ficar pendente ao cruzar a data durante consultas. Leitura, filtros, paginação e comparação usam um instante comum; padrão de invalidação corresponde à rota pública real. Publicação automática v19 passou.
- Edição de versão antiga demorou e retornou 503 nas primeiras tentativas, sem sobrescrever dados. O servidor agora rejeita versão já antiga antes do RPC e mantém a guarda SQL atômica. A repetição passou; a origem da demora remota inicial não foi determinada. O cliente limita a espera a 45 segundos e, numa mutação sem confirmação, avisa que ela pode ter sido salva antes de qualquer reenvio.

Regressões, diagnóstico, referências técnicas e limitações em [correções editoriais e de publicação](public-text-and-publication-qa.md) e [implementação do admin](../implementation/admin.md).

## Restauração verificável

O snapshot completo anterior fica privado/ignorado, com permissão `0600`, em `backups/hosted-manual-qa/before.json`. SHA-256 do arquivo: `7a9c52f44f3f1ba2bfb6e7111350714a8b334bc54b023e305201578e48f8d117`. A documentação pública contém somente contagens, hashes e identificadores de fixtures.

1. Às **01:38:09.506Z**, uma transação com guardas removeu apenas o post QA, 19 revisões e um redirect de QA. O post já estava na lixeira. Isso liberou a imagem PNG, cuja exclusão continuava protegida por referência no histórico.
2. As quatro imagens foram excluídas pela interface, com a confirmação específica do usuário. Nenhum `DELETE` direto em `storage.objects` foi usado.
3. Às **01:40:07.684Z**, o fechamento transacional retirou apenas a intenção WebP que não criou objeto e oito revisões de configurações de QA. Recolocou os valores, versão 1, autoria e timestamps originais de contato/aviso, conservando a precisão do timestamp SQL original. Os triggers de configurações foram reativados antes do commit; uma falha teria revertido toda essa transação.
4. Às **01:40:37.711Z**, uma conferência independente somente de leitura confirmou o baseline nas 12 relações abaixo. Às **01:41:26.030Z**, 13 verificações HTTP finais passaram: site/blog/sitemap disponíveis, nenhum link QA, dois slugs QA e quatro mídias 404, APIs reais sem sessão 401 e preview redirecionando ao login.

| Relação/inventário | Contagem final | Igual ao baseline |
|---|---:|---|
| Posts | 154 registros / 153 canônicos | Sim |
| Revisões de posts | 0 | Sim |
| Redirects | 2 | Sim |
| Mídias | 551 | Sim |
| Intenções de upload | 0 | Sim |
| Configurações | 2 | Sim |
| Revisões de configurações | 0 | Sim |
| Taxonomias | 91 | Sim |
| Rotas reservadas | 47 | Sim |
| Eventos operacionais editoriais | 1 | Sim |
| Administradores | 1 | Sim |
| Objetos no bucket editorial | 0 | Sim |

Hash de tabela usa linhas ordenadas pela chave estável e chaves JSON ordenadas recursivamente. O [resumo inicial](hosted-manual-qa-before.json) foi produzido com outra ordem de serialização: seus hashes não devem ser comparados diretamente aos finais. O [baseline canônico](hosted-manual-qa-baseline-canonical.json) foi derivado do mesmo snapshot privado de hash conferido, usando a normalização da restauração. Todos os seus hashes/contagens coincidem com a [verificação final](hosted-manual-qa-verify.json).

Provas: [purga restrita do post](hosted-manual-qa-purge-post.json), [fechamento com commit](hosted-manual-qa-finish.json), [conferência posterior](hosted-manual-qa-verify.json) e [HTTP final](hosted-manual-qa-http-final.json). A rotina privada de uma única rodada tem guardas de destino, snapshots e IDs exatos; não é um comando genérico para apagar dados de produção. Logs de Auth/segurança, sessões e limites de login não foram apagados para simular ausência do teste.

## Verificação automatizada e limites

`npm test`: **229 testes em 38 arquivos**, exit 0, 171,46 s; início **01/10 às 22:35:23 BRT**. `npm run typecheck`: exit 0. [Manifesto e saídas completas](hosted-manual-qa-automated.json). Não houve mudança de schema/funções SQL/RLS para corrigir os defeitos dessa rodada.

Documentação técnica/funcional, ledger e prompts atualizados; catálogo **0.10**, oito prompts com referências existentes. A [nota canônica do freelancer](../context/gabriel-brain-project.md) foi espelhada no Brain Gabriel Krapp e conferida byte a byte: [prova de sincronização](hosted-manual-qa-brain-sync.json). Somente a nota desse projeto foi alterada; não houve promoção a projeto publicado/entregue ou alegação de ganho SEO/receita. [Conferência dos links, catálogo e padrões de segredo](hosted-manual-qa-docs-check.json). Revisão independente somente de leitura não encontrou divergência material entre alegações e provas.

- Não se executou build novo concorrente ao dev. O build HUHe, a auditoria HTTP ampla e as comparações visuais anteriores são históricos e precedem os patches atuais.
- Mobile desta rodada não foi validado: a solicitação de viewport 390px foi aceita pela API, mas a largura efetiva permaneceu desktop. O override foi removido. [Captura que mostra essa limitação](hosted-manual-qa/admin-viewport-not-applied.png).
- Não foram exercitados expiração real/refresh e revogação global de sessão, entrega SMTP/recuperação de senha, reprodução externa do YouTube, corrida exata entre preflight e gravação SQL, confirmação nativa de saída em todos os navegadores, restauração integral em outro projeto hospedado ou Vercel/CDN/WAF publicados. O cancelamento/exibição por nova versão do aviso tem cobertura local; a primeira captura pública após trocar a versão ficou ambígua durante hidratação, portanto não é uma prova isolada desse caso.
- A primeira falha WebP foi recuperada por retry; nenhuma causa específica ou eliminação de falhas transitórias do provedor foi comprovada.
- A fixture da rodada Docker anterior continua intocada nos volumes locais. Esta limpeza refere-se somente à rodada hospedada identificada acima.

## Evidências visuais

- [Quatro formatos carregados antes da exclusão](hosted-manual-qa/media-four-formats.png)
- [Prévia privada](hosted-manual-qa/post-private-preview.png), [post editado público](hosted-manual-qa/post-public-edited.png) e [vídeo incorporado](hosted-manual-qa/post-video-public.png)
- [Conflito recusado com comparação](hosted-manual-qa/post-conflict-guard.png)
- [Aviso público](hosted-manual-qa/popup-public.png) e [WhatsApp de QA](hosted-manual-qa/contact-edited.png)
- [Aviso restaurado](hosted-manual-qa/popup-restored.png) e [contato restaurado](hosted-manual-qa/contact-restored.png)
- [Dashboard após restauração](hosted-manual-qa/dashboard-restored.png) e [logout final](hosted-manual-qa/logout-final.png)
