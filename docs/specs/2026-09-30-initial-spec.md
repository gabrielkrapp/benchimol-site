# Spec inicial de desenvolvimento — Clínica de Olhos Benchimol

**Versão:** 0.9 · **Atualizada:** 01/10/2026 · **Estado:** implementação local autorizada, sem executar Docker; publicação pelo usuário · **Responsável:** Gabriel Krapp, freelancer.

## 1. Resultado esperado

Substituir WordPress/Elementor por um site moderno com a mesma experiência pública. Preservar todas as páginas úteis, textos, imagens, arquivos, posts, URLs e interações existentes. Acrescentar um `/admin` para a clínica gerenciar o blog, avisos de feriados e contato WhatsApp, além de consultar prompts de manutenção por IA.

A migração não é um redesign. Melhorias técnicas de desempenho, acessibilidade e SEO podem ser feitas sem mudar a aparência ou o sentido do conteúdo. Alterações editoriais e visuais precisam de aprovação específica. Next.js é a preferência inicial de Gabriel; banco gratuito é prioridade. Gabriel confirmou Next.js oficial preparado para Vercel, sem deploy nesta etapa. A elegibilidade do plano gratuito para este uso comercial continua pendente antes da publicação; não há promessa de Hobby elegível.

**Requisito adicional confirmado por Gabriel:** o site público precisa ser acessível e compreensível por IAs e seus mecanismos de busca, para identificar corretamente a clínica, unidades, médicos, serviços, exames, contato e artigos. Esse requisito deve ser validado na entrega, preservando o layout e os textos aprovados.

Gabriel autorizou a implementação e a leitura/exportação autenticada do WordPress. A autorização não inclui merge, deploy ou uso dos bancos LifeWallet. O projeto exclusivo da clínica foi fornecido por Gabriel em 01/10/2026 e inicializado/importado conforme as evidências de integração.

## 2. O que foi confirmado e o que falta confirmar

| Item | Estado |
|---|---|
| Origem WordPress + Elementor; réplica visual e editorial | Confirmado pelo briefing de Gabriel |
| Blog com CRUD, imagens e vídeos; login `/admin` | Confirmado pelo briefing |
| Popup de texto, número/mensagem WhatsApp, prompts vinculados ao repo | Confirmado pelo briefing |
| 154 posts publicados e 38 páginas públicas via REST | Observado em 30/09/2026; contagens públicas reconciliadas |
| 551 mídias públicas, com originais recuperados localmente | Captura restaurada e WXR público reconciliados por ID; 24 itens da descoberta inicial recuperados |
| 2 galerias e 1 comentário público na API | Observado; itens privados/moderados não acessíveis |
| Layout a preservar | Layout completo esperado do Elementor; site restaurado capturado com CSS/HTML/assets e referência visual em coleta |
| Hospedagem e banco | Next.js oficial preparado para Vercel, sem deploy; Supabase pelo Marketplace da Vercel, exclusivo da clínica, inicializado/importado em 01/10; nunca LifeWallet |
| Supabase local com Docker | Scripts implementados e integração real já exercitada. Em 01/10/2026 Gabriel pediu continuar sem executar containers por consumo de memória; não reabrir a stack por iniciativa própria. Preservar opção manual e dados |
| Site público sem envs do Supabase | Deve abrir com o acervo público migrado e as imagens estáticas; administração/gravações/uploads geridos dependem do backend |
| Usuários admin | Gabriel Krapp: gabriel.krapp@hotmail.com, aprovação pessoal anterior; conta clínica benchimol@benchimolclinic.com.br criada pelo usuário e autorizada especificamente em01/10, vinculada como “Clínica Benchimol”; email/senha Supabase sem signup público |
| Comentários | Gabriel confirmou remover formulário e comentários do app novo; origem WordPress não modificada |
| Preço e pagamento | Gabriel confirmou R$ 4.500,00, cartão de crédito, integral antecipado |
| Início, prazo e suporte | Início imediato após aprovação do pagamento; uma semana (7 dias corridos); um mês de suporte |
| Contrato e pessoa jurídica da clínica | Minuta simplificada; Centro de Microcirurgia Benchimol Ltda, CNPJ 31.512.502/0001-25, representada por Sergio Benchimol, confirmados por Gabriel; assinatura pendente |
| Campos completos Elementor, rascunhos, mídia original, redirects de plugin | Export autenticado obtido e reconciliado; rascunhos/privados fora do escopo público; avaliar exports específicos de plugins se necessários |

Inventário e limites detalhados em [site-audit.md](../research/site-audit.md). A contagem pública não inclui rascunhos, revisões, posts privados ou todas as variantes de imagem.

## 3. Público e escopo

**Visitantes:** pacientes e pessoas buscando informação sobre a clínica, médicos, exames, especialidades, convênios e contato. **Admin:** pessoas autorizadas da clínica que publicam conteúdo e atualizam avisos/WhatsApp. **Manutenção:** Gabriel e uma IA com acesso ao repositório.

### Incluído na primeira versão proposta

- Site público fiel em desktop e mobile, com navegação e interações equivalentes.
- Migração integral dos 154 posts públicos identificados, mais qualquer conteúdo legítimo adicional encontrado no export autenticado. Preserve data original, slug, autoria, corpo, imagem de capa, imagens internas, categorias, tags, links e metadados.
- Preservação das páginas institucionais, especialidades, biografias antigas, galerias, arquivos PDF e URLs fora do menu. Cada URL recebe um destino ou uma decisão explícita.
- `/admin/login`, início, posts, editor de post, mídias, popup, contato e prompts.
- Rascunho, prévia protegida, publicação editorial, edição, lixeira e restauração de posts; revisão mínima para recuperar edição incorreta.
- Aviso de texto com ativação, prévia e período; configuração central de WhatsApp aplicada a todos os pontos relacionados.
- Biblioteca de prompts versionados e documentação para qualquer IA entender o projeto.
- SEO técnico, validação de URLs/conteúdo/assets e comparação visual com uma referência aprovada.
- Leitura por IAs: conteúdo público em HTML acessível, estrutura semântica, dados estruturados coerentes e acesso permitido aos mecanismos de busca/consulta por IA.

### Fora da primeira versão

Agendamento médico, prontuário, cadastro de paciente, pagamentos, CRM, chatbot, execução de IA dentro do admin, construtor visual de páginas e upload/streaming de vídeos grandes. Mudanças de páginas institucionais serão feitas pelo repositório com os prompts, enquanto posts/avisos/contato são editáveis no admin.

**Comentários removidos por decisão explícita de Gabriel:** o app novo não exibirá comentários nem formulário e não coletará comentários. Não apagar o histórico do WordPress. Comentários privados, dados de pacientes e export bruto não entram no repositório/Brain.

## 4. Arquitetura definida

Uma aplicação Next.js com TypeScript e App Router, site público renderizado no servidor/pré-renderizado e admin autenticado. CSS existente serve como referência; estilos públicos serão portados de forma explícita, sem redesenhar nem importar indiscriminadamente toda a árvore de plugins WordPress.

Supabase pelo Marketplace nativo da Vercel foi escolhido para PostgreSQL, Auth e Storage. As páginas institucionais, estrutura do menu, tokens de estilo e catálogo de prompts ficam versionados no repositório. Posts, revisões, estado dos avisos, contato e registros administrativos ficam no banco. Assets institucionais originais podem ser servidos como arquivos estáticos; mídia nova de posts usa Storage. O manifesto liga cada URL antiga ao arquivo/destino novo.

Publicar/editar um post é uma operação editorial no banco. Deve atualizar blog, Home, página do post e sitemap por invalidação de cache, **sem deploy de código**. Alterações por IA no repositório são entregues como diff para revisão; a publicação do código cabe ao usuário conforme `AGENTS.md`.

Cache deve reduzir consultas; eventual continuidade de conteúdo já gerado durante falha temporária é capacidade a demonstrar na hospedagem escolhida. Conteúdo jamais gerado, login e gravações ainda podem falhar se o banco estiver pausado. Essa limitação do plano gratuito precisa ser aceita ou mitigada com plano pago; não prometer disponibilidade permanente de um backend Free. Cache privado nunca se mistura com público.

Comparação de três abordagens e custos em [decisions.md](../architecture/decisions.md). Versões compatíveis estão fixadas em `package.json` e `package-lock.json`; documentação oficial e limitações de acesso a Context7 em `docs/implementation/runtime-references.md`.

## 5. Painel administrativo

O painel deve ajudar a clínica a responder: “o que está publicado?”, “qual aviso está no ar?”, “qual contato o visitante recebe?” e “o que precisa da minha atenção?”.

**Início recomendado:** quantidade de posts publicados/rascunhos/na lixeira, últimas edições, situação do popup e sua próxima data, número WhatsApp ativo com teste do link, mídia usada versus limite, data do último backup verificado e atalhos “Novo post”, “Editar aviso”, “Editar contato” e “Ver site”. Indicadores precisam informar sua fonte e horário de atualização.

**Métricas de acesso opcionais:** visitantes, páginas/posts mais acessados e cliques no WhatsApp nos últimos 7/30 dias, somente após escolher coleta real e privacidade. Clique não representa consulta marcada. Não mostrar faturamento, pacientes, agendamentos ou dados fictícios. Na falta de integração, exibir “métricas ainda não configuradas”.

Detalhes, estados, erros e permissões em [functional-spec.md](../admin/functional-spec.md).

## 6. Modelo de dados conceitual

Modelo refinado na implementação local e migrations testáveis. Aplicação remota somente no projeto separado da clínica após conexão. Os nomes abaixo orientam as entidades canônicas.

| Entidade | Conteúdo e restrições principais |
|---|---|
| Admin autorizado | ID Auth, nome, papel e ativo; sem registro público livre; regra de autorização controlada pelo servidor |
| Post | ID interno e WP, título, slug único, resumo, corpo estruturado/HTML importado, autor, status, datas originais/publicação, capa, SEO, versão |
| Revisão de post | Snapshot do conteúdo, autor da alteração e horário; usada para restauração, acesso privado |
| Categoria/tag | Slug, nome e relação N:N com posts; preservar arquivos úteis e destinos legados |
| Mídia | URL origem, destino, ID WP, tipo, bytes, dimensões, alt, legenda, hash e usos; exclusão bloqueada quando referenciada |
| Aviso | Título/texto, ativo, início/fim, versão e política de reapresentação |
| Contato | WhatsApp normalizado, mensagem, versão, atualização; configuração pública apenas dos campos necessários |
| Evento administrativo | Ator, operação, entidade e horário; sem senhas nem conteúdo sensível |
| Redirect | Origem, destino, status permanente e motivo; pode ficar em arquivo versionado |
| Prompt | Arquivo versionado, identificador, título, versão, categoria, parâmetros e documentos de contexto |

Rascunhos, revisões, usuários e logs não podem ser lidos por visitantes. A leitura pública de posts só admite publicados, não excluídos e com data de publicação vigente. Autenticação sozinha não concede administração. Políticas do banco e das mídias precisam restringir escrita aos admins ativos.

## 7. Fidelidade e SEO

- Mesmo domínio e mesmos caminhos sempre que possível. Posts atuais estão na raiz: `/<slug>/`. `/blog/` é o arquivo; não mover artigos para `/blog/<slug>/` por preferência técnica.
- Preservar barra final, canonicals válidos, títulos, descrições existentes, Open Graph, datas e relações entre conteúdo; corrigir divergências apenas com registro e decisão.
- Preservar URLs de `/wp-content/uploads/...` ou resolver cada uma para um destino permanente, incluindo PDFs/imagens indexadas. Não depender do WordPress antigo depois de desligado.
- Menu, rodapé, imagens de fundo, recortes, fontes, espaçamento, breakpoints, hover, carrosséis, FAQ, galerias, popup e WhatsApp entram na conferência.
- Structured data compatível com clínica/unidades, Breadcrumb e Article/BlogPosting onde adequado, somente com dados reais. Não inventar avaliação ou promessa de destaque no Google.
- Admin, login, prévias e rascunhos privados fora do sitemap e com `noindex`; privacidade depende de autenticação, não de robots.txt.
- Melhoria técnica não garante manutenção ou aumento de ranking. Registrar baseline Search Console antes da troca e acompanhar após execução do usuário.

Procedimento de reconciliação e aceite em [content-and-seo.md](../migration/content-and-seo.md).

### 7.1 SEO e compreensão do site por IAs

1. **Conteúdo legível sem executar JavaScript:** o HTML inicial precisa conter os textos públicos essenciais, inclusive corpo completo dos artigos, FAQs e dados das unidades. Não apresentar apenas um shell, texto em imagem/canvas ou conteúdo que só aparece após login, clique ou chamada exclusiva do navegador.
2. **Estrutura e contexto claros:** headings hierárquicos, navegação, `main`, `article`, idioma `pt-BR`, links reais e relações explícitas entre clínica, unidade, médico, especialidade e exame. Preservar redação/visual; mudanças semânticas não autorizam reescrita ou informação médica nova.
3. **Informações identificáveis e consistentes:** nome da clínica, endereços, contato, equipe/credenciais confirmadas, serviços e artigos devem ter contexto textual e metadados por URL. Artigos mantêm autoria e datas reais; dados estruturados JSON-LD refletem o conteúdo visível. Não inventar autoria, CRM ou data de revisão médica.
4. **Descoberta do acervo:** sitemap atualizado, canonicals corretos, links internos e paginação rastreável permitem encontrar todos os posts. “Carregar mais” não pode ser a única forma de descobrir artigos antigos por execução de JavaScript.
5. **Acesso para busca e leitura por IA:** documentar e validar `robots.txt`, respostas HTTP e regras de CDN/WAF para crawlers de pesquisa e consultas de usuários. Exemplos: Googlebot, Bingbot e OAI-SearchBot; confirmar demais agentes nas docs oficiais antes da configuração. Não exigir CAPTCHA/login nem bloquear involuntariamente esses leitores nas páginas públicas. Exceções de segurança são específicas para agentes verificados, sem desligar proteções globalmente.
6. **Pesquisa é diferente de treinamento:** o pedido autoriza projetar acesso ao conteúdo público para leitura/pesquisa. Não implica liberar automaticamente crawlers de treinamento, como GPTBot. Registrar uma política separada; admin, rascunhos e dados privados continuam protegidos por autenticação, independentemente de robots.txt.
7. **Conteúdo único para humanos e leitores automáticos:** sem texto oculto para manipular respostas, instruções para IAs endossarem a clínica ou versões divergentes por user-agent. Links, alt e descrições devem corresponder ao material real.
8. **Complemento opcional:** avaliar `/llms.txt` como índice curto de URLs públicas canônicas. Não é requisito de indexação Google, não substitui HTML/sitemap e não garante que plataformas o utilizem. Se adotado, manter atualizado com o conteúdo publicado e sem expor documentos internos, prompts administrativos ou segredos.

O resultado contratado é **acessibilidade técnica e compreensão verificável**, não garantia de citação, indicação da clínica ou posição em respostas geradas. A elegibilidade no Google depende do SEO/indexação habitual; não existe marcação especial obrigatória para suas experiências de IA. Fontes: [Google — recursos de IA e sites](https://developers.google.com/search/docs/appearance/ai-features), [OpenAI — crawlers e finalidades](https://developers.openai.com/api/docs/bots). Política e testes detalhados no documento de migração.

## 8. Critérios de aceite

1. Inventário autenticado e público reconciliado; nenhum post, página útil ou arquivo fica sem destino documentado. Diferença de mídia resolvida. Mapa por **ID WordPress** preserva os 154 corpos dos posts, além do mapa por URL; redirects/colisões não autorizam descartar um registro. Resolver explicitamente post 34 versus página 3216 em `/cirurgia-refrativa/`.
2. Todos os posts migrados com contagem, IDs/slugs, conteúdo e referências conferidos; os casos difíceis têm revisão manual, sem perda silenciosa.
3. Todas as URLs legadas aprovadas retornam conteúdo equivalente ou redirect específico. Não redirecionar erros em massa para a Home.
4. Comparação de todas as famílias de páginas nos mesmos viewports aprovados (proposta: 390, 768 e 1440 px), incluindo estados interativos. Zero diferença editorial e zero mudança visual perceptível não aprovada; divergências registradas e revisadas.
5. Admin sem cadastro público; visitante e usuário não autorizado não conseguem ler dados privados ou gravar mesmo chamando os endpoints diretamente.
6. Criar, editar, publicar, retirar, excluir para lixeira e restaurar posts funciona; mídia, links e preview funcionam. Não perder rascunho nem edição concorrente sem aviso.
7. Publicação/edição/retirada editorial atualiza todas as superfícies públicas dentro do prazo documentado (alvo de até 60 segundos em operação saudável), sem rebuild/deploy obrigatório. Falha deixa estado pendente visível no admin; não declarar retirada concluída enquanto versão anterior puder aparecer. Testar também Home/blog/sitemap e lixeira. Validar localmente e depois no ambiente da hospedagem publicado pelo usuário; não inferir comportamento cloud apenas da prova local.
8. Popup só aparece dentro de sua regra; fecha por teclado/toque e não impede navegação. WhatsApp usa a configuração atual em todos os locais.
9. Metadados, sitemap, robots, status HTTP e redirects corretos; sem broken assets ou links internos inesperados.
10. Backup do banco **e dos arquivos** restaurado em teste; documentação reproduz setup, importação e recuperação sem segredos.
11. Fluxos essenciais no mobile e com teclado; metas de desempenho definidas após baseline, sem pontuação prometida antes de medir.
12. Entrega para revisão com limitações explícitas. Merge, alteração DNS e deploy ficam com o usuário.
13. Leitura por IA validada: extrair o HTML sem JavaScript das famílias de páginas e confirmar nome/unidades/contato/serviços e corpo dos artigos; rastrear o acervo completo por links/sitemap/paginação. Metadados e JSON-LD devem concordar com o conteúdo visível. Conferir robots e respostas de CDN/WAF no ambiente publicado pelo usuário para os crawlers selecionados; trocar user-agent sozinho não prova acesso de um bot real. Registrar páginas testadas, resultados e limitações, sem usar eventual citação por uma IA como condição de aprovação.

## Histórico de revisão

- **0.1, 30/09/2026:** descoberta, inventário e spec inicial; confirmação do layout completo esperado do Elementor.
- **0.2, 30/09/2026:** requisito explícito de SEO/leitura por IAs, política separada para pesquisa e treinamento e critérios de validação correspondentes.
- **0.3, 30/09/2026:** termos comerciais confirmados e minuta contratual.
- **0.4, 30/09/2026:** autorização explícita de implementação, Next.js/Vercel preparado sem deploy, Supabase em organização separada e remoção de comentários/formulário. Captura restaurada reconciliou os 154 posts, 38 páginas e 551 mídias públicas com o WXR. Não registra assinatura/pagamento ou publicação.
- **0.5, 30/09/2026:** escolha de Supabase pelo Marketplace nativo da Vercel, primeiro admin e aliases aprovados; implementação local, segurança e evidências nos documentos de implementação/validação.
- **0.6, 30/09/2026:** ambiente Supabase local em Docker solicitado, separado da futura integração hospedada; Gabriel confirmou que ainda criará/conectará o projeto remoto.
- **0.7, 30/09/2026:** site público disponível sem envs do Supabase; backend ausente não bloqueia Home/páginas/blog/imagens originais. Proteção contra fallback após falha de banco configurado permanece.
- **0.8, 01/10/2026:** continuar a implementação sem executar Docker por consumo de memória; manter os comandos e dados locais para uso manual futuro.
- **0.9, 01/10/2026:** Gabriel forneceu `.env.prod` e autorizou usar o Supabase da clínica quando necessário. Conferir projeto/API/banco e recusar LifeWallet antes de qualquer escrita. Não executar deploy; cadastro público desabilitado pelo usuário e senha do administrador definida por ele.

## 9. Ordem de refinamento

Primeiro obter os artefatos do layout Elementor confirmado e fechar acessos, custo e escopo legado. Depois detalhar layout/rotas, migração, permissões e conteúdo do admin. O plano de implementação está em `docs/implementation/plan.md`; código e testes locais foram autorizados por Gabriel. A importação remota foi confirmada em 01/10/2026; login com o administrador real, uploads e aceite hospedado continuam separados, e a publicação permanece com o usuário.

Gabriel definiu o preço de **R$ 4.500,00**, pagamento **integral antecipado por cartão de crédito**, **início imediato após a aprovação do pagamento**, prazo de **uma semana (7 dias corridos)** e **um mês de suporte**. A [minuta do contrato](../contracts/contrato-benchimol.md) descreve os serviços, propõe suporte a partir do aceite expresso e registra o tratamento de impedimentos e diferenças materiais no acervo. Esses termos substituem a orientação inicial de adiar preço e prazo até a reconciliação; o inventário e a referência visual continuam necessários para executar com fidelidade. Não há evidência de assinatura ou pagamento.

## Confirmação de infraestrutura e admin — 30/09/2026

Gabriel escolheu **Next.js completo na Vercel + Supabase através do Marketplace nativo da Vercel**, reunindo PostgreSQL, Auth e Storage e centralizando criação/gestão/cobrança no fluxo da Vercel. Não criaremos backend hospedado separadamente. Organização/projeto exclusivos da clínica; LifeWallet continua proibido. Integração/recurso ainda não criados; não executar deploy nem conectar Git com publicação automática.

Primeiro administrador aprovado: `gabriel.krapp@hotmail.com`, Gabriel Krapp. Não há usuário Auth/senha criado nem email enviado nesta etapa. A senha será definida por fluxo seguro pelo próprio usuário. A integração do banco não remove a restrição comercial do Hobby.

Documentação atual: [integrações nativas Vercel](https://vercel.com/docs/integrations), [Supabase Marketplace](https://supabase.com/docs/guides/integrations/vercel-marketplace). Os projetos são recursos do Supabase, com conta vinculada e gestão via Vercel; a documentação consultada identifica a integração como Public Alpha. O runtime usa os mesmos clientes/Supabase APIs.

## Ambiente Supabase local em Docker — 30/09/2026

Gabriel pediu uma forma simples de testar o Supabase sem subir para produção. Preparar a stack oficial de desenvolvimento em contêineres Docker, com PostgreSQL, Auth, Storage e painel local, usando a Supabase CLI. Deve permitir inicializar o schema/seed versionados e importar o acervo público local, com comandos documentados de início/status/parada e dados preservados entre reinícios.

Usar identidade, rede e portas próprias da clínica; acesso somente no computador local. Configurações/chaves locais ficam em arquivo privado ignorado, sem sobrescrever credenciais de um ambiente remoto. Não vincular projeto cloud, copiar usuários de produção, criar senha do administrador real por iniciativa do agente ou apagar volumes/bases existentes no comando de início. Testes locais de Auth/Storage são evidências de desenvolvimento; CDN, SMTP e serviços hospedados mantêm aceite separado. Roteiro e limites em `docs/operations/supabase-local.md`.

## Site público independente do setup do backend — 30/09/2026

Gabriel confirmou que a falta de envs do Supabase não deve bloquear a visita normal. Com URL/key inteiramente ausentes, servir páginas, blog e imagens originais a partir do acervo público versionado, sem exigir opt-in local. Isso substitui a restrição anterior de snapshot exclusivamente local. Login, administração, mudanças de contato/avisos/posts e uploads novos continuam exigindo Supabase real.

Depois de configurado, o banco é a fonte editorial. Configuração parcial ou falha da conexão nunca recupera conteúdo antigo retirado. No ambiente que exigir o banco editorial, definir `ALLOW_PUBLIC_SNAPSHOT=false` para também recusar o acervo inicial se as variáveis forem removidas por acidente. Mídias originais estáticas permanecem independentes; essa disponibilidade não implica liberar bucket, rascunhos ou endpoints privados.

## Supabase da clínica conectado — 01/10/2026

Gabriel forneceu o arquivo privado `.env.prod` e autorizou o uso do recurso hospedado durante a implementação. O destino explícito é `jjrzmuuwuvxcsnwqzvxf`; os dois refs LifeWallet conhecidos continuam bloqueados. API, identidade do pooler e conexão PostgreSQL com CA/hostname verificados foram conferidos; o preflight encontrou banco da aplicação e Storage vazios. O conector MCP atual não tem acesso a esse projeto, portanto não usar seu perfil como destino alternativo. Inicialização/importação e resultados devem constar em `docs/validation/`. Essa autorização não altera a proibição de merge/deploy nem permite iniciar Docker.

As variáveis do Marketplace precisam de correspondência com os nomes da aplicação; `.env.prod` não é carregado automaticamente pelo Next.js. O setup local conectado usa arquivo privado ignorado e nomes canônicos, `SUPABASE_CLINIC_PROJECT_REF`, TLS verificado e `ALLOW_PUBLIC_SNAPSHOT=false`. A senha do usuário real não é criada pelo agente. Gabriel confirmou a desativação de Allow new users to sign up em 01/10; conferência API retornou `disable_signup=true`.

## Conta administrativa da clínica — confirmação de 01/10/2026

Gabriel criou `benchimol@benchimolclinic.com.br` e autorizou especificamente sua concessão de acesso administrativo no projeto `jjrzmuuwuvxcsnwqzvxf`. O vínculo ativo, identificado como **Clínica Benchimol**, foi aplicado ao UUID Auth conferido, sem criar conta ou mudar senha. Login/dashboard com153publicados, recarga e logout foram verificados no servidor local iniciado pelo usuário. A aprovação anterior da conta pessoal de Gabriel permanece separada. Esse registro operacional não altera o escopo funcional da spec v0.9, a proibição de Docker atual ou de merge/deploy. Evidências e limites em [clinic-admin-login.md](../validation/clinic-admin-login.md).
