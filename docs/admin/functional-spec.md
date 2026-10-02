# Admin — especificação funcional v0.4

Estado: implementado localmente conforme spec v0.9, conectado ao Supabase exclusivo da clínica. A conta clínica criada/autorizada por Gabriel tem login confirmado; a rodada manual de gravações e mídias foi encerrada com restauração ao baseline. Passaram 229 testes em 38 arquivos e typecheck. Contratos, regressões e limites atuais em [admin.md](../implementation/admin.md), [backend.md](../implementation/backend.md), [relatório de acesso](../validation/clinic-admin-login.md) e [QA consolidada](../validation/hosted-manual-qa.md). Mobile autenticado atual, playback externo de vídeo, SMTP, expiração/refresh reais, revogação global e ambiente publicado seguem sem aceite; o build HUHe antecede os patches desta rodada. Não existe conta demonstrativa, login falso ou deploy.

## Navegação

| Rota | Uso |
|---|---|
| `/admin/login` | Email/senha Supabase; recuperação desabilitada até SMTP/redirects/entrega validados |
| `/admin` | Resumo e atalhos |
| `/admin/posts` | Buscar/listar publicados, rascunhos e lixeira |
| `/admin/posts/novo` | Criar rascunho |
| `/admin/posts/[id]` | Editar, pré-visualizar, publicar e ver revisões |
| `/admin/midias` | Biblioteca, uploads e indicação de uso |
| `/admin/aviso` | Popup de aviso |
| `/admin/contato` | WhatsApp e mensagem |
| `/admin/prompts` | Prompts prontos, contexto e copiar |

Rotas podem ser ajustadas no plano, mantendo `/admin` e as funções acordadas. Implementação local autorizada; acompanhamento em `docs/implementation/progress.md`.

## Acesso

- Admins criados/autorizados por Gabriel ou responsável definido; sem signup público. Não reutilizar login WordPress.
- Login verificado no servidor, sessão por cookie seguro, logout e expiração. Cada endpoint de leitura privada e gravação verifica admin ativo.
- Papel único de admin ativo na v1. Primeiro aprovado: Gabriel Krapp, gabriel.krapp@hotmail.com; essa conta pessoal permanece uma autorização separada. Gabriel criou e autorizou especificamente `benchimol@benchimolclinic.com.br`, vinculada como **Clínica Benchimol** no recurso da clínica. Separar editor/administrador e UI de gestão de usuários somente se a clínica precisar.
- Visitante pode ler conteúdo público; usuário autenticado não autorizado recebe acesso negado. Rascunho, revisão, logs e biblioteca privada não podem vazar pelo endpoint ou Storage.
- Erro de login genérico, proteção contra excesso de tentativas e mensagens claras de sessão expirada. Login deve permitir colar senha e usar gerenciador de senhas.
- Recuperação por email depende de SMTP validado. Não declarar recuperação funcional até completar essa integração.

## Início: informações úteis ao cliente

| Bloco | Informação real | Ação |
|---|---|---|
| Conteúdo | Contagem de publicados, rascunhos e lixeira | Abrir lista filtrada/criar post |
| Últimas alterações | Últimos cinco posts editados, responsável/data | Retomar edição |
| Aviso | Desativado, agendado, em exibição ou encerrado; período | Editar/prévia |
| WhatsApp | Número formatado e mensagem atual | Testar link/editar |
| Atenção | Post sem capa/alt, falha de revalidação, aviso vencido | Resolver item identificado |
| Armazenamento | Bytes de mídias geridas pelo app e limite conhecido | Ver biblioteca |
| Backup | Última exportação/restauração registrada e sua fonte | Consultar instruções |

Quota do provedor não pode ser inferida apenas pela soma da biblioteca. Se não houver leitura real do consumo, mostrar “mídias cadastradas no aplicativo” e data. Backup não vira “OK” só porque um cron foi configurado. Evitar “site online” sem monitor com verificação recente.

**Analytics opcional:** visitantes/páginas/postagens mais vistas e cliques WhatsApp nos últimos 7/30 dias, com integração e definição de evento aprovadas. O site atual expõe Burst Statistics; export/histórico devem ser avaliados. Não prometemos trazer histórico completo antes de acessar WordPress. Sem coleta, mostrar estado vazio. Cliques são intenção de contato, não consulta marcada.

## Posts

### Listagem

Busca por título, filtros de status/categoria, ordenação por publicação/alteração e paginação. Cada linha mostra título, status, publicação original, atualização, categoria e ações. Lista contém todos os itens acessíveis; não depender só dos cards da Home.

### Editor e mídia

Título, slug, resumo, capa, autoria exibida, categorias/tags, corpo e SEO. Editor visual simples com parágrafos, H2/H3, negrito/itálico, listas, links, imagens com alt/legenda e vídeo por URL autorizada. Evitar exigir que a clínica escreva HTML.

Link, vídeo e alt/legenda usam diálogos HTML com formulário React e o visual administrativo existente: título acessível único, labels visíveis, foco no primeiro campo, Cancelar/Escape e retorno de foco. Não depender de `window.prompt` nem de placeholder como rótulo. Validar links http/https/mailto/tel/caminhos locais seguros e somente vídeos HTTPS incorporáveis do YouTube; URL inválida fica aberta com erro e mantém a entrada para correção. Alt/legenda preservam texto literal e legenda multilinha.

Abrir um post salvo ou alternar temporariamente o editor para somente leitura não pode marcar alteração sem edição real. O resumo precisa preservar cada caractere durante a digitação, incluindo espaço final, Enter e parágrafos ainda vazios, e conservar suas quebras após salvar/reabrir. Converter entidades uma vez, mantendo `&`, `<`, `>` e texto literal como `&lt;`. Ler o campo não modifica seu HTML salvo. Esses critérios têm regressões focadas registradas em [admin.md](../implementation/admin.md).

O HTML legado preservado é uma fonte de referência. A conversão para blocos editáveis não pode apagar tabela, vídeo, PDF, galerias, links ou formatação. Se um conteúdo não converter com fidelidade, manter sua renderização original sanitizada, indicar “conversão de corpo pendente” e bloquear sobrescrita pelo editor simples. Metadados podem ser editados separadamente quando seguro. A edição do corpo só libera após conversão revisada; a entrega final precisa resolver todos os casos ou registrar exceção aprovada. Não ampliar o editor para reproduzir todo Elementor.

Sanitizar HTML e conteúdo recebido no servidor: sem scripts, eventos executáveis ou iframes arbitrários. Embeds permitidos usam provedores definidos. Detecção de extensão/MIME e limites de imagem propostos de 10 MB para uploads novos. Exibir erro antes de consumir quota desnecessária. Excluir mídia ainda utilizada deve ser bloqueado, com lista de usos.

Para importação, preservar datas históricas e slugs. Para post novo, gerar slug com revisão do usuário. Slugs colidem com páginas institucionais/admin: impedir publicação de conflito. Editar slug publicado exige explicar impacto e criar redirect permanente; nunca quebrar a URL antiga silenciosamente.

### Estados e confirmação

`rascunho → publicado → rascunho/lixeira → restauração`. Agendamento como fluxo editorial dedicado é opção posterior; período do popup faz parte da v1. Só publicados com data vigente ficam visíveis. Se a data editável de um post ficar no futuro, RLS/servidor o mantêm privado até essa data e o painel informa a condição; não precisa de cron/deploy.

- Salvar rascunho informa sucesso, erro ou “há alterações não salvas”; recuperação/autosave limitado deve ser validado sem gravar a cada tecla.
- Prévia usa o mesmo renderer público em rota privada com `noindex`, sem link público permanente que exponha rascunho.
- “Publicar” confirma título/URL/data e salva uma revisão. Após sucesso, informa quando a versão pública foi atualizada.
- Edição de publicado pede ação explícita “Atualizar publicação”. Revisão permite restaurar erro.
- Exclusão vai para lixeira, com confirmação contextual e restauração. Purga definitiva não faz parte da v1.
- Duas pessoas editando: versão/data evita sobrescrita; conflito pede recarregar ou comparar mudanças.
- Se salvar deu certo e cache falhou, informar “conteúdo salvo; atualização pública pendente” e permitir tentar novamente **a invalidação**, sem deploy e sem duplicar post.

Para retirar publicação ou mover à lixeira, o admin precisa distinguir pedido salvo de retirada pública confirmada. Alvo de atualização de até 60 segundos em operação saudável; falha mantém alerta explícito de que a versão anterior pode aparecer. Documentar TTL/invalidação no runtime escolhido, impedir cache privado em superfícies públicas e não servir conteúdo retirado indefinidamente por fallback. Se não for possível verificar a versão vigente após expiração, a rota entra em erro temporário seguro. Testar retirada/edição de Home, arquivo, post e sitemap no ambiente local e na hospedagem publicada pelo usuário. O limite de 60 segundos não é garantia de disponibilidade durante pausa/falha do provedor.

## Popup de aviso

Uma configuração ativa por vez. Campos: título opcional, texto, ativo, início e fim opcionais, e prévia. Texto preserva parágrafos; links podem ser aceitos se fizerem parte do editor aprovado. Não aceitar código/script no aviso.

Horários informados e exibidos em `America/Sao_Paulo`, armazenamento UTC. Regra: ativo e `início <= agora < fim` quando limites existirem. Sem datas, exibe até desativação manual; início deve preceder fim. O site avalia o período sem depender de deploy ou tarefa agendada paga. Cache não pode prolongar aviso vencido.

Padrão técnico adotado na v1: uma vez por sessão de navegação e por versão do aviso; fechar não reaparece em cada página, nova versão pode reaparecer. Persistência somente da marca de versão, sem rastreamento de paciente ou texto privado. Preferência diferente da clínica deve ser aprovada antes de alterar essa regra.

Modal com foco controlado, fechar por botão e Escape, restauração de foco e texto legível no celular. Não exibir no admin. Mantém aparência de popup aprovada; não adicionar banners/campanhas por iniciativa própria. Popup atual é operado por plugin WordPress e pode usar imagem: exportar regra atual e obter aprovação para o novo aviso somente de texto previsto no briefing.

## Contato WhatsApp

Campos da v1: **número WhatsApp** e **mensagem pré-preenchida**. Não criar campo adicional de rótulo visível sem novo pedido. A carga inicial preserva número e mensagem da origem.

Normalizar número internacional: apenas dígitos com país, por exemplo `5521985601000`. Validar formato e limites; não inferir número correto só por comprimento. Gerar `https://wa.me/{numero}?text={mensagem-codificada}`. Mostrar link e botão de teste com `rel` seguro em nova aba.

Aplicar uma fonte de configuração ao ícone flutuante, CTAs, FAQ e rodapé relacionados a WhatsApp. Telefones fixos e endereços das duas unidades continuam conforme origem; não substituí-los automaticamente. Registrar versão/autor/data e permitir recuperar a configuração anterior.

Na fonte observada: WhatsApp `(21) 98560-1000`; mensagem existente registrada no inventário. Conferir com clínica antes da carga inicial.

Histórico/restauração foi implementado com snapshots privados imutáveis, autor/data e versão otimista. A gravação e a restauração apresentam explicitamente confirmação pública pendente quando o servidor ainda não confirmou a leitura atual; HTTP 200 sozinho não é prova de atualização pública.

## Prompts

Cards por tarefa, título, finalidade, versão, campos que o cliente deve preencher, instruções sobre acesso ao repo e botão “Copiar prompt com contexto”. O texto copiado reúne o prompt base, tarefa e referências dos documentos. Mostrar quais docs são necessários; a IA precisa conseguir lê-los.

Biblioteca inicial: cor, exame/especialidade, equipe, nova página, menu, SEO e imagem/PDF. Fonte canônica em `docs/prompts/`; catálogo não editável pela clínica na v1. Mudanças no catálogo seguem revisão do repositório. Não incluir chaves nem login WordPress; não executar prompt, instalar dependência, fazer merge ou deploy a partir de um card.

## Comentários legados

Gabriel confirmou a remoção do formulário e de todos os comentários na aplicação migrada. Não haverá coleta nem moderação no novo admin. Não modificar o histórico do WordPress e nunca incluir comentários privados/dados de pacientes no repo, Brain ou prompts.
