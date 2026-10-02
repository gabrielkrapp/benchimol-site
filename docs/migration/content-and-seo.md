# Migração fiel: conteúdo, aparência e SEO

Implementação local autorizada conforme spec v0.5. Importação e testes locais isolados estão autorizados; importação remota depende do projeto exclusivo da clínica pelo Marketplace da Vercel. DNS, merge e publicação ficam com Gabriel.

## Fonte de verdade e coleta

1. Gabriel confirmou o **layout completo esperado do Elementor** como referência. Obter capturas aprovadas em desktop e mobile, incluindo dropdown, FAQ aberta, galerias e popup. Comentários foram removidos no novo app por decisão de Gabriel. A Home simplificada inspecionada em 30/09 não é o alvo; não inventar o layout que os templates deveriam produzir.
2. Export WordPress completo e backup antes de qualquer intervenção; conteúdo WXR, banco e `wp-content/uploads` cumprem papéis diferentes. WXR não substitui arquivos/backup.
3. Export de Elementor/site kit: templates, estilos globais, breakpoints, menu/header/footer e custom CSS. Registrar fontes/licenças, plugins e configurações de popup, SEO e redirects.
4. Sitemap, REST público, rastreio dos links, Search Console e export autenticado reconciliados. A descoberta histórica está em `docs/research/baseline-2026-09-30/`; dados reconciliados em `data/wordpress/`, captura restaurada e complemento Elementor em `docs/research/restored-*`.

## Conteúdo e importação

- Importador repetível e rastreável por ID WordPress. Rodar em modo de conferência antes de gravar; não duplicar artigo ao reprocessar.
- Manter mapa por registro: ID WP, corpo/hash original, tipo, URL antiga, destino novo, regra aplicada e aprovação de exceção. Post 34 e página 3216 compartilham `/cirurgia-refrativa/`; a página é o conteúdo servido atualmente. Gabriel aprovou o artigo antigo em `/cirurgia-refrativa-artigo/`. Também aprovou `/por-que-piscamos-os-olhos-artigo-2020/`; o redirect anterior permanece. As decisões por ID estão em `data/wordpress/route-decisions.json`.
- Preservar corpo completo, título, autor exibido, publicação original, modificação, resumo, capa, mídia interna, alt, legenda, links, categorias/tags e SEO.
- HTML/shortcodes/embeds não suportados precisam de mapeamento e revisão. Converter em blocos editáveis conservando semântica e aparência. Guardar original como evidência privada de migração.
- Posts com títulos iguais e slugs diferentes não devem ser deduplicados pelo título. Conferir IDs, conteúdo e redirects já existentes.
- Rascunhos, privados, páginas antigas e mídia não utilizada são inventariados no acesso autenticado. Definir destino com Gabriel, sem tornar privado em público.
- IDs/nomes de autor são editoriais; não criar acesso admin automaticamente a todo autor WordPress.
- Não importar nem exibir comentários/formulário no novo app, por decisão de Gabriel. Preservar WordPress original; emails e comentários privados nunca entram no repo/Brain.
- Taxonomias vazias sobre jogos/chips: há 8 categorias e 61 tags públicas sem uso pelos 154 posts. Preservar evidência e pedir decisão de destino antes de importar. Não afirmar invasão nem apagar por inferência.

## Assets e arquivos

Cada asset relevante precisa de URL antiga, arquivo original, variantes, bytes/hash, origem, tipo, usos e destino. Incluir imagens de fundo em CSS, `srcset`, logos, favicon, fontes, SVG, PDFs, galerias e mídias fora do WordPress.

A primeira descoberta recuperou 527 de 551 mídias; a captura restaurada recuperou as 551 e reconciliou todos os IDs com o export autenticado. Os 24 itens iniciais já foram resolvidos. Foram identificados 12 PDFs públicos. A soma de bytes dos originais com metadados não representa todo o tamanho de uploads. Não desligar a origem até conferir os arquivos necessários.

Conservar `/wp-content/uploads/...` como arquivos estáticos é a opção mais direta para links legados. Se houver mudança de caminho, mapear destino/redirect compatível por item. Assets editoriais novos podem usar Supabase Storage. Não deixar imagens dependerem do WordPress que será desativado.

Recorte/proporção de imagem devem continuar iguais. Otimização de formato ou imagem responsiva só após validar resultado. Não regenerar fotos por IA ou trocar imagem por placeholder. Arquivos de terceiros, inclusive Wix/Google/Trustindex, precisam de tratamento próprio, permissão e continuidade da integração.

## Rotas

`/simply_galleries/` preserva o arquivo público observado, que na origem apresenta o blog. Os 154 registros geram 153 artigos canônicos porque um par de corpos idênticos mantém os dois WP IDs e o redirect existente. Não confundir contagem de registros com páginas canônicas.

Preservar domínio, `/<slug>/` de artigos, `/blog/`, páginas institucionais, biografias e categorias/tags úteis. Cuidar de barra final, variantes antigas, PDFs e links fora do menu. Arquivos de categoria/tag e paginação também são URLs; validar páginas seguintes e formatos antigos após export.

Tabela de decisão por URL: manter, redirect permanente para equivalente, recurso privado, ou remoção aprovada com status apropriado. Nenhum redirect em massa para Home. `200` observado não prova conteúdo válido: checar título, canonical e corpo para detectar soft 404.

Aliases observados, para confirmar com plugin Redirection: `/convenios-nv → /convenios/`, `/servicos-nv/ → /servicos/`, dois artigos antigos com destino `-2/` e variantes sem barra. Captura de headers mantém o status original dos saltos; [redirects.csv](../research/redirects.csv) resume os casos.

## SEO técnico

- Baseline por URL de title, description, canonical, robots, H1, OG/Twitter, structured data, datas, links e status. Yoast aparece no HTML atual. Existem páginas sem meta description; oportunidades são propostas editoriais, não licença para reescrever conteúdo.
- Metadados Next por rota, HTML rastreável, sitemap só de conteúdos públicos canônicos e robots coerente. Não incluir admin/rascunho/preview; exigir autenticação para conteúdo privado.
- Structured data de organização/clínica e unidades com dados reais, mais Article/BlogPosting e breadcrumb onde fizer sentido. Evitar prometer estrelas, ranking ou rich results.
- SEO local: conferir endereços, telefones, nome e links Maps das duas unidades. Não alterar CRM ou informação clínica sem validação da clínica.
- Preservar e revisar redirects, PDFs e imagens indexadas. Manter sitemap/arquivos antigos acessíveis ou com destinos compatíveis.
- Search Console: obter propriedades, relatório de URLs/indexação, principais páginas/consultas e cliques/impressões de baseline. Monitoramento posterior à troca é responsabilidade a combinar; nenhum monitor foi agendado nesta etapa.

Fontes: [Metadata Next](https://nextjs.org/docs/app/getting-started/metadata-and-og-images), [migração com URLs alteradas — Google](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes), [LocalBusiness — Google](https://developers.google.com/search/docs/appearance/structured-data/local-business). Mudança de URL deve ser minimizada; ranking pode oscilar e não é resultado garantido.

## SEO para leitura e compreensão por IAs

Requisito confirmado por Gabriel em 30/09/2026, incorporado à spec v0.2. O site deve fornecer conteúdo público que leitores automatizados consigam acessar, extrair e contextualizar, mantendo a mesma experiência visual e editorial.

### Contrato de conteúdo

- HTML inicial completo para conteúdo relevante, sem depender de JavaScript, login ou interação para revelar texto. FAQ recolhida pode permanecer no DOM/HTML com conteúdo real; não criar texto oculto exclusivo para bots.
- Semântica de página/artigo, idioma, headings e links com destino rastreável. Dados de clínica/unidade/médico/exame devem ter associação clara nos textos existentes e em JSON-LD coerente.
- Corpo dos posts, autoria/data reais, nomes de serviços, endereços/contato e demais informações públicas extraíveis. Texto importante em banners/imagens precisa de equivalente acessível fiel, sem alterar informação ou inventar descrições clínicas.
- Arquivo de blog com links/paginação rastreáveis para todo o acervo. Sitemap, canonical e metadata continuam atualizados após publicação/retirada; não depender apenas de “Carregar mais” por JavaScript.
- Melhorias editoriais como novos resumos, respostas ou transcrições de vídeos exigem material validado e autorização; não são inseridas automaticamente por este requisito técnico.

### Política de acesso

Documentar, por agente/finalidade, o que pode ser lido. Permitir pesquisa/indexação e consultas ao conteúdo público pelos leitores selecionados; autorização para treinamento é uma decisão separada. `robots.txt` orienta crawlers cooperativos e não protege conteúdo privado. Não bloquear rastreamento de uma página contando que o crawler lerá seu `noindex`; admin/prévias exigem autenticação.

Para Google Search e seus recursos de IA, usar controles Googlebot/SEO habituais. Para busca ChatGPT, OAI-SearchBot é o agente relevante; GPTBot tem finalidade de treinamento independente. ChatGPT-User realiza algumas consultas iniciadas por usuários e não controla elegibilidade em Search; robots.txt pode não se aplicar a essas consultas. Consultar identificação e IPs oficiais antes de exceções específicas de CDN/WAF, preservando as proteções do site. [Google AI Search](https://developers.google.com/search/docs/appearance/ai-features), [OpenAI crawlers](https://developers.openai.com/api/docs/bots).

Não cadastrar allowlist só por string de user-agent, que pode ser falsificada. Na hospedagem escolhida, conferir se proteção de bots, limites de taxa ou CAPTCHA bloqueiam inadvertidamente agentes legítimos. Não mudar CDN/WAF nesta etapa: apenas especificar configuração e validação futura.

Agentes adicionais verificados nas fontes oficiais em 30/09/2026:

| Plataforma | Pesquisa/consulta pública a permitir | Finalidade de treinamento separada |
|---|---|---|
| Anthropic/Claude | `Claude-SearchBot` e `Claude-User` | `ClaudeBot` |
| Perplexity | `PerplexityBot` e `Perplexity-User` | Os dois agentes documentados não têm finalidade de treinamento de modelos fundacionais |

Revalidar nomes e regras na implementação. Anthropic declara respeitar robots/CAPTCHA; Perplexity informa que consultas `Perplexity-User` geralmente ignoram robots.txt. Isso reforça que acesso privado depende de autenticação. Para WAF, conferir identificação/IPs oficiais atualizados e não criar exceção global por nome declarado. Fontes: [Anthropic crawlers](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler), [Perplexity crawlers](https://docs.perplexity.ai/docs/resources/perplexity-crawlers).

`/llms.txt` pode ser avaliado como índice complementar de páginas públicas; não é requisito especial Google nem substitui sitemap/HTML. Não publicar `/llms-full.txt` ou espelho de arquivos internos por padrão. Nenhuma dessas medidas garante indexação, citação ou recomendação por uma plataforma.

### Evidência de aceite

1. Fazer GET/extrair HTML sem JavaScript de Home, unidade/localização, elenco/bio, especialidade/exame, convênios, FAQ, arquivo e posts representativos. As informações correspondentes devem estar presentes, legíveis e iguais ao conteúdo aprovado.
2. Rastrear links, sitemap e paginação; reconciliar todas as URLs públicas aprovadas e os posts por ID. Não aceitar que um artigo antigo só seja encontrado por clique executando JavaScript.
3. Validar metadata/JSON-LD e sua concordância com texto visível. Verificar fontes, datas e distinção entre unidades, sem confundir contatos ou informação médica.
4. Testar regras robots e respostas HTTP locais. Após publicação pelo usuário, verificar também CDN/WAF e, quando disponível, logs/ferramentas oficiais de inspeção de crawlers. Um GET com user-agent simulado não prova visita de um crawler real.
5. Confirmar que login, rascunhos, revisões, prompts privados e dados internos permanecem inacessíveis a visitante e bots. Registrar evidências e limitações; teste em uma IA externa é complementar e não comprova cobertura universal.

## Conferência antes de entregar para revisão

| Dimensão | Evidência de aceite |
|---|---|
| Conteúdo | Contagens/IDs, slugs, diffs de texto, casos complexos revisados |
| Mídia | Manifesto reconciliado, hashes/arquivos, links e variantes válidos |
| Rotas | Rastreio completo, redirects sem loops, sem soft 404 inesperada |
| Aparência | Mesmas larguras/fontes/estado; screenshots antes/depois de cada família e diferenças revisadas |
| Interação | Menu mobile/dropdown, FAQ, carrossel, galerias, WhatsApp, popup e fluxo de comentário decidido |
| Admin | Testes allow/deny de endpoints/banco, CRUD e upload, conflito/revisão/restauração |
| Cache | Edição/retirada de conteúdo atualiza Home/blog/post/sitemap e não expõe rascunho |
| Leitura por IA | HTML sem JS legível, contexto/JSON-LD coerente, acervo descoberto e política de crawlers verificada |
| Operação | Falha de banco, limite de mídia, backup/restauração e runbooks verificados |

Proposta de larguras: 390 px, 768 px e 1440 px; completar com breakpoints reais Elementor. Congelar elementos voláteis (avaliações/datas) para comparar visual sem ruído. Revisão manual continua necessária mesmo com comparação automática.

## Transição de produção — apenas roteiro para o usuário

Quando implementação e aceite forem concluídos, documentar backup final, pausa combinada de edição, export incremental, conferência final de inventário, DNS/hosting, preservação de MX/TXT de email, plano de retorno e verificações após troca. O usuário executa merge, deploy e DNS. O agente não dispara, cancela ou reinicia deploys. Não apagar/desligar o WordPress antes de o usuário validar migração e retenção do backup.

## Implementação e evidências atuais

Admin, backend, estilos e runbooks em `docs/implementation/`. O CSS LiteSpeed da coleta anônima estava desatualizado: o complemento recuperou arquivos Elementor públicos corretos, fontes e estilos observados, sem sobrescrever evidência antiga. `npm run styles:public` gera CSS escopado com hash em `public/site-styles/`; predev/pretest/prebuild executam o gerador. O runtime usa links de stylesheet; não embute toda a biblioteca em cada HTML. Ao mudar overrides/CSS, regenere antes de conferir o site.

Conteúdo, assets e HTML sem JavaScript são verificados pelos scripts em `scripts/migration/`. Relatórios em `docs/validation/`; distinguir teste local de Auth/Storage/CDN hospedados ainda pendentes. Não declarar fidelidade total com base apenas na Home.

## Correções técnicas autorizadas em 02/10/2026

Gabriel pediu aplicar as correções do relatório de 01–02/10. O detalhamento e os testes de SEO/leitura estão em [seo-ai.md](../validation/corrections-2026-10-02/seo-ai.md); a auditoria anterior permanece evidência histórica.

- `robots.txt` permite `/api/media/` nos grupos públicos de pesquisa, por precedência do caminho mais específico, e mantém `/api/`, `/admin/` e `/preview/` bloqueados. Somente mídias reconhecidas como públicas pelo servidor/banco são entregues anonimamente; a permissão de crawler não libera rascunhos, Storage ou APIs privadas.
- Metadados públicos restauram `max-image-preview:large`, `max-snippet:-1` e `max-video-preview:-1`, observados nos 154 registros WordPress. Admin, busca interna e rotas não indexáveis mantêm seus overrides restritivos.
- O JSON-LD usa a entidade geral `MedicalOrganization`, sem inventar um endereço principal, ligada às duas unidades `MedicalClinic`. Os endereços originais e a autoria continuam iguais. A Home informa `WebSite` e não gera a trilha incompleta de um item; páginas internas mantêm `BreadcrumbList` de dois itens.
- `importedSeoText` decodifica uma vez apenas metadados de origem WordPress na importação e no snapshot. O export original é preservado. Texto editorial novo é literal e continua escapado pelo consumidor; não decodificar genericamente o que foi escrito no admin. A reconciliação de uma base já importada é separada e restrita por ID, WP ID, hash da origem, versão 1 e objeto SEO anterior exato.
- Avisos vigentes entram no HTML inicial do dialog fechado, preservando seu comportamento de modal após hidratação e a regra de sessão por versão. Um bloco `noscript` mostra a mesma informação a quem desabilitou JavaScript. Avisos inativos, futuros, expirados ou com datas inválidas ficam fora desses textos. O servidor passa sua avaliação inicial ao client para evitar uma decisão de horário diferente na hidratação.

Autoria médica/revisão, divergência de CEP/domínio do Perfil da Empresa, descrições editoriais/alt, destino de `/sample-page/` e política de Google-Extended/Bing continuam decisões específicas. A aplicação técnica não atribui autoria, muda informações da clínica, remove páginas preservadas ou libera treinamento por inferência. Search Console, resultados enriquecidos, indexação/citação e PageSpeed publicado continuam validações externas.
