# Auditoria de leitura e descoberta por IA — 01/10/2026

O conteúdo principal está preparado para extração sem JavaScript, mas há um bloqueio de crawl das imagens editoriais novas, um aviso público dependente de hidratação e decisões de política ainda incompletas. Esta auditoria não comprova indexação ou citação em IA: Gabriel confirmou que o Next.js não foi publicado.

Escopo: spec v0.9, seção 7.1; código atual; renderização offline do acervo público versionado. Nenhum runtime, dado, RLS, credencial, WordPress ou recurso externo foi alterado. Sem Docker, build, início/reinício de servidor ou deploy. Context7 não estava exposto; foram consultadas fontes oficiais. [Resultados estruturados e páginas verificadas](ai-discovery.json).

## Verificações realizadas

| Verificação | Resultado e natureza da prova |
|---|---|
| Corpo dos artigos | **153/153** artigos canônicos preservam o texto completo ao passar pelo renderer/sanitização; todos possuem elemento `article`, autoria e datas no schema. Comparação offline com fonte pública, sem banco conectado. |
| Descoberta do blog | **26 páginas**, links reais `href`/`rel=next`, **153 caminhos únicos** alcançados sem executar JavaScript. |
| Páginas institucionais e galerias | **38 + 2** corpos renderizados. Home: 6.336 caracteres de texto; FAQ: 2.591; equipe: 1.245; exames: 3.651. Fonte local, não resposta HTTP atual. |
| Estrutura | `lang=pt-BR`, `header`, `main`, `footer`, headings, `time`, links reais e JSON-LD `MedicalClinic`, `BreadcrumbList`, `BlogPosting` no código. `PublicShell.tsx:18` acrescenta título acessível quando o corpo não tem H1. Não é versão exclusiva para bots. |
| Identidade | Clínica e duas unidades identificadas por `@id`; endereços coincidem com conteúdo público capturado e `/llms.txt`. Sem autoria médica ou avaliações inventadas. Não constitui validação clínica do conteúdo. |
| Política de crawl | Pesquisa/consulta pública permitida para Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot e Perplexity-User. GPTBot, ClaudeBot, Google-Extended e CCBot bloqueados globalmente. Ressalvas abaixo. |
| Índice complementar | `/llms.txt` retorna `text/plain; charset=utf-8`, só **10 links públicos**; todos resolvidos no catálogo ou sitemap. Não lista Brain, documentos internos, admin, prompts, backups ou segredos. |
| Privacidade | Sitemap usa repositório de posts públicos; admin possui autorização e `noindex`. `robots.txt` orienta crawlers cooperativos e não protege recursos privados. Revisão completa de autorização/RLS está na auditoria de segurança. |
| HTTP atual | GET autorizado em `http://127.0.0.1:3000/robots.txt`: conexão recusada (`errno 61`). O servidor do usuário não foi iniciado/reiniciado. Sem URL Next.js hospedada. |

Código principal: `src/app/(public)/[[...path]]/page.tsx:32-66`, `src/components/public/PublicShell.tsx:17-24`, `src/lib/public/render.ts:48-57`, `src/app/sitemap.ts:6-11`, `src/lib/public/seo.ts:26-47`, `src/app/llms.txt/route.ts:3`.

## Achados

| ID / prioridade | Evidência | Efeito e proposta mínima |
|---|---|---|
| **SEO-01 / P1**, compartilhado com auditoria Google | `src/lib/public/seo.ts:42-45` bloqueia `/api/`; `src/lib/server/media.ts:16,57` gera `/api/media/{id}` para imagens geridas. | Crawlers cooperativos também ficam impedidos de acessar capa/corpo/OG públicos novos. Proposta: exceção exata para `/api/media/` nos grupos públicos, preservando bloqueio de APIs privadas e a regra publicada → acessível / rascunho → 404. Assets legados `/wp-content/uploads/` já são permitidos. Não aplicado nesta auditoria. |
| **AI-01 / P2**, decisão de política | `src/lib/public/seo.ts:46` bloqueia Google-Extended. | O token também controla grounding de Gemini Apps/Vertex AI. Mantém a decisão de restringir treinamento, mas limita essa modalidade de descoberta. Documentar trade-off; não liberar treinamento por inferência. |
| **AI-02 / P2**, decisão de política | Bingbot permitido em `src/lib/public/seo.ts:45`; nenhuma diretiva pública `nocache`/`noarchive` encontrada. | A separação pesquisa/treinamento está incompleta para Microsoft. Registrar decisão e controles vigentes antes da publicação. Adicionar essas diretivas automaticamente prejudicaria a profundidade ou inclusão de referências em Copilot. Não há prova de treinamento efetivo. |
| **AI-03 / P3**, limite de política | `src/lib/public/seo.ts:44` permite `/` ao wildcard. | Agentes não enumerados herdam permissão. A lista não representa proibição universal de treinamento. Manter inventário de agentes/finalidades; não bloquear toda busca por padrão. |
| **AI-04 / P2**, HTML de aviso | `src/components/public/Interactions.tsx:14,18,180`: `notice=false`, título/texto entram somente após `useEffect`. Renderização React com aviso sintético ativo gerou dialog vazio. | Avisos de feriado não são extraíveis por leitor sem JS. Se informarem operação/horários, servir a informação ativa também no HTML para pessoas e bots, respeitando período e preservando o modal. Não inserir texto exclusivo para crawler ou ativar aviso real de teste. |
| **AI-05 / P3**, validação hospedada | Spec `docs/specs/2026-09-30-initial-spec.md:140`; nenhum deploy e servidor local inacessível. | Acesso real de crawler, CDN/WAF, snippets, indexação e citação continuam pendentes. GET com user-agent falsificado não comprova visita de bot real. |
| **AI-06 / P3**, estado Search Console desconhecido | Requisito externo de inclusão em Search generative AI; nenhuma propriedade Search Console acessada. | Conferir configuração efetiva e herança da propriedade quando Gabriel disponibilizar acesso, sem presumir exclusão. Default documentado é inclusão. Não é alteração necessária no código. |

## Orientações oficiais e política aplicada

**Google Search:** HTML rastreável, texto útil, links internos e metadata coerente continuam sendo a base. Não há schema especial obrigatório, reescrita para IA ou necessidade de `llms.txt`; o Google declara ignorá-lo para visibilidade/ranking. O guia atual também remete à inclusão em Search generative AI no Search Console. [Guia oficial atual](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).

O controle Search generative AI passou a ter rollout mundial em 31/08/2026, segundo a ajuda: inclusão é o padrão, podendo existir herança/exclusão na propriedade. O controle de visibilidade é distinto de treinamento. Seu estado para a clínica não foi verificado. [Controle oficial](https://support.google.com/webmasters/answer/16908024). Há também relatório específico de impressões por páginas, dispositivos, países e datas; não foi acessado para a clínica. [Relatório oficial](https://support.google.com/webmasters/answer/16984139).

**Google-Extended:** controla treinamento Gemini e grounding em Gemini Apps/Vertex AI; o bloqueio não muda inclusão/ranking no Google Search. Manter restrição de treinamento e desejar grounding Gemini envolve uma decisão de produto que este token não separa nas orientações consultadas. [Lista oficial de crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers#google-extended).

**OpenAI:** OAI-SearchBot é o crawler de Search; GPTBot é independente e pode coletar para treinamento. A política local separa ambos corretamente. ChatGPT-User atende algumas consultas iniciadas por usuários, não define elegibilidade em Search, e robots pode não se aplicar a essas consultas. Validar identidade/faixas oficiais em qualquer futura exceção WAF; user-agent sozinho pode ser falsificado. [Documentação oficial](https://developers.openai.com/api/docs/bots).

**Anthropic:** Claude-SearchBot serve busca, Claude-User consultas iniciadas por usuários e ClaudeBot coleta potencial para treinamento. A separação atual coincide com a finalidade documentada; a Anthropic declara respeitar robots e CAPTCHA. [Documentação oficial](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler).

**Perplexity:** PerplexityBot serve busca; Perplexity-User atende consultas. As duas finalidades documentadas não são treinamento de modelos fundacionais. O fetcher de usuário geralmente ignora robots. A política local permite ambos, sem usar robots como proteção privada. [Documentação oficial](https://docs.perplexity.ai/docs/resources/perplexity-crawlers).

**Bing/Copilot:** orientações atuais associam crawl/indexação/conteúdo à presença em Copilot e explicam que `NOARCHIVE` impede uso em respostas/grounding, enquanto `NOCACHE` limita ao URL/título/snippet. O corpo da página exige JavaScript nesta ferramenta; estes pontos foram conferidos nos trechos indexados da fonte oficial. [Guidelines atuais](https://www.bing.com/webmasters/help/bing-webmaster-guidelines-30fba23a). A política primária de 22/09/2023 relaciona ausência dos controles ao possível treinamento; `NOCACHE` ainda permite treinamento de URL/título/snippet. É evidência datada, não prova de aplicação concreta hoje à clínica. [Anúncio oficial de controles](https://blogs.bing.com/webmaster/2023/9/Announcing-new-options-for-webmasters-to-control-usage-of-their-content-in-Bing-Chat/).

**`llms.txt`:** proposta comunitária complementar de índice/contexto, sem contrato universal de consumo. A versão local tem nome, contexto e links públicos; manter conteúdo coerente e curto. Não criar espelho irrestrito do repositório nem afirmar ganho comprovado. [Proposta original](https://llmstxt.org/).

## Aceite ainda necessário

Após publicação manual por Gabriel, conferir HTML inicial/metadata/robots/sitemap e imagens públicas novas, redirects e retirada de rascunhos; inspeção de URL/Search generative AI no Search Console e, se houver acesso, Bing Webmaster. Conferir proteção Vercel/WAF e identidade oficial de requisições sem desativar proteção privada. Amostrar Home, unidades, equipe/bio, exames, FAQ, arquivo e artigo em leitores reais, registrando hora/consulta/fonte e sem tratar uma resposta eventual como cobertura universal.

O [HTTP HUHe histórico](../http-audit.md) e a [QA autenticada anterior](../hosted-manual-qa.md) permanecem evidências separadas: não foram repetidos nem convertidos em prova de indexação desta rodada. O render offline usa o snapshot público versionado e não valida o estado atual do banco ou o servidor Next.js completo. As informações foram extraídas como dados; nenhum script do conteúdo WordPress foi executado.

## Suplemento após Gabriel iniciar o servidor

Em 02/10 às **03:14:25–03:14:33 UTC**, o coordenador confirmou [13/13 status HTTP esperados](public-http-live.json) no dev iniciado pelo usuário: nove páginas/artigos HTML, robots/sitemap/llms e uma URL inexistente 404. As nove respostas HTML 200 têm conteúdo no servidor, pt-BR, H1 único, canonical do domínio aprovado e JSON-LD sintaticamente parseável. Sitemap com 216 URLs, sem caminhos privados; os dois aliases aprovados responderam 200. Robots real mantém o bloqueio `/api/`; três artigos da amostra apresentam entidades legadas na description/schema. Isso complementa a indisponibilidade inicial, preservada nos registros anteriores; não substitui validação de schema/RichResults, visita de crawler real, indexação ou ambiente Vercel. Não houve novo login, gravação ou controle de servidor. [Consolidação](README.md).
