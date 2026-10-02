# Auditoria de SEO, IA, segurança, performance e repositório

**Atualização de 02/10/2026:** Gabriel autorizou aplicar as correções técnicas. A implementação e suas provas posteriores estão no [relatório próprio](../corrections-2026-10-02/README.md); os achados abaixo representam o estado observado antes dos patches.

**Coleta:** 01–02/10/2026, America/Sao_Paulo; horários UTC nos JSONs. A pasta conserva a data de início. Gabriel confirmou que **a aplicação Next.js ainda não tem deploy** e que o item 6 é presença na busca Google. Foram delegadas cinco frentes independentes; SEO Google e presença na busca compartilharam um agente. O coordenador revisou as evidências e complementou o HTTP local depois que Gabriel iniciou seu servidor.

**Resultado:** base técnica e controles importantes confirmados, com correções propostas antes da publicação. O principal bloqueio de SEO é o `robots.txt` impedir rastreamento das novas imagens públicas em `/api/media/`. Performance ainda exige medição de produção; há CSS e imagens grandes comprovados. Nenhum patch de comportamento foi aplicado nesta auditoria.

## Resultado das seis frentes

| Frente | Evidência atual | Achados e limite |
|---|---|---|
| 1. SEO Google | 153 artigos canônicos e 40 páginas/galerias renderizados offline; links em 26 páginas do blog; amostra HTTP atual com títulos/canonicals/JSON-LD parseável | Bloqueio de mídia, controles de imagem grande ausentes, entidades codificadas em 117 descrições, schema local e autoria a revisar. [Relatório](google-seo.md) |
| 2. Leitura por IA | Conteúdo principal no HTML do servidor; idioma, semântica, links e índice público `llms.txt` | Mesmo bloqueio de mídia; aviso de feriado entra após hidratação. Políticas Google-Extended/Bing precisam de decisão consciente. Citação não demonstrada. [Relatório](ai-discovery.md) |
| 3. Segurança | Catálogo hospedado da clínica: **12/12 tabelas da aplicação com RLS**, bucket privado, signup desativado; **97 testes/9 arquivos passaram**; npm audit de produção com zero advisories | Três achados P2: grants SQL excessivos, login direto do provedor e headers/anti-frame. Nenhuma falha P0/P1 demonstrada no escopo examinado; não é garantia de ausência de vulnerabilidades. [Relatório](security.md) |
| 4. Performance | Hashes/tamanhos reais dos arquivos e quatro GETs locais. CSS Home: **2.292.204 B bruto / 251.445 B gzip observado**; banner: **1.309.507 B** | CSS, descoberta do banner, dimensões/prioridade de imagens e consultas de taxonomia. **PageSpeed, CWV e TTFB de produção não medidos.** [Relatório](performance.md) |
| 5. Repositório local | Inventário, referências runtime e assets conferidos; sem remote Git | **14 arquivos regeneráveis removidos, 216.034 B**, mais dois diretórios vazios. Código, mídia, fontes, histórico, documentação, evidências e privados preservados. [Relatório e manifesto](repository.md) |
| 6. Presença Google | Consultas públicas pela marca e pelo operador `site:` | Domínio WordPress aparece com Home, sitelinks, serviços e artigos. Perfil de Copacabana usa outro domínio/CEP. Search Console e presença do Next ainda não avaliados. [Relatório](google-presence.md) |

## Suplemento HTTP atual

Gabriel iniciou `http://127.0.0.1:3000`; o agente não iniciou, parou ou reiniciou o processo. Foram feitas requisições sequenciais, sem cookies/credenciais ou dados de pacientes, entre **03:12 e 03:14 UTC de 02/10**. Isso é desenvolvimento local conectado ao banco editorial, não Vercel em produção.

- [HTML público](public-http-live.json): **13/13 status esperados**, sendo nove páginas/arquivos/artigos HTML, robots/sitemap/llms e uma URL inexistente 404. Conteúdo principal, H1 único, idioma pt-BR, canonicals do domínio aprovado e JSON-LD sintaticamente válido estão presentes nas nove respostas 200, sem executar JavaScript. Sitemap com **216 URLs**, todas no domínio aprovado, nenhuma de admin/API/prévia. Os dois aliases de artigos aprovados responderam 200.
- Robots real confirma `Disallow: /api/` sem exceção para a mídia; os três artigos da amostra confirmam entidades como `&hellip;` no texto de description/JSON-LD. Portanto os achados SEO-01 e SEO-07 também têm prova HTTP atual.
- [Proteções HTTP](security-http-live.json): **16/16 checks passaram**. Admin/prévias redirecionam ao login, cinco APIs privadas respondem 401, arquivos internos e mídia de QA removida retornam 404, origem ausente/externa é negada e JSON inválido chega a 422. Não houve tentativa real de login ou brute force; os POSTs inválidos terminam antes do limitador e de Auth.
- [Arquivos servidos](performance-http-live.json): quatro GETs 200; três assets coincidem por hash com os arquivos locais. O banner é PNG 1920×1000, sem compressão HTTP; CSS observado usa gzip. Brotli calculado offline no outro relatório é potencial de compressão, não transferência observada.

A tentativa inicial sem acesso loopback está preservada em [public-http-initial.json](public-http-initial.json); o script reproduzível [public-http-live.mjs](public-http-live.mjs) fez somente GETs. User-agent, parser offline e GET local não comprovam identidade de Googlebot, visita real de IA, funcionamento de WAF/CDN ou indexação.

## Ordem proposta de correção

P1 indica prioridade alta para o objetivo da frente; achados de performance não significam vulnerabilidade nem reprovação de CWV medida.

| Prioridade / ID | Mudança concreta proposta | Validação que deverá acompanhar |
|---|---|---|
| **P1 SEO-01** | Exceção estrita de crawl para `/api/media/`, mantendo autorização atual e demais APIs privadas | Mídia referenciada por post publicado acessível; rascunho/arquivo não publicado 404; admin protegido; robots por agente |
| **P1 performance** | Medir cobertura do CSS e LCP; reduzir somente regras comprovadamente dispensáveis e avaliar derivação responsiva do banner | Comparação visual de menu, galeria, FAQ, tabs e popup em 390/768/1440; trace antes/depois; preservar originais |
| **P2 SEO-02/07** | Preservar `max-image-preview:large`; decodificar uma vez apenas campos legados comprovadamente codificados | Metadata no HTML/OG/schema; literais novos `&`, `<`, `>` permanecem corretos; reconciliação restrita antes de eventual escrita no banco |
| **P2 SEC-01** | Migration separada de menor privilégio para grants/default privileges excessivos | Testes com grants iguais aos hospedados; visitante/não-admin continuam sem escrita/leitura privada; admin/editorial funcionam |
| **P2 SEC-02** | Revisar limites e proteção de Auth direto no Supabase; preparar MFA/CAPTCHA somente com fluxo compatível | Conferir configurações reais do provedor; não ativar CAPTCHA sem desafio no cliente nem afirmar que o limitador Next protege o endpoint direto |
| **P2 SEC-03** | Headers globais e proteção contra enquadramento; CSP compatível em Report-Only antes de enforcement | Admin impedido de ser enquadrado; mapas/vídeos/fontes/Next funcionam; inspeção posterior de HTTPS/Vercel |
| **P2 IA/performance** | Servir informação ativa de feriado também no HTML; dimensões/prioridade de imagens; consultas menores de taxonomias | Respeitar agenda e sessão do modal; manter fidelidade; publicação/retirada sem conteúdo privado ou antigo por cache |
| **P2 editorial/política** | Confirmar autoria/revisão médica, entidade/endereço, domínio/CEP do perfil e destino de `/sample-page/`; definir trade-offs de crawlers | Aprovação factual do cliente antes de mudar textos, identidade ou política de treinamento |

Demais achados P3 e todos os caminhos de código estão nos relatórios de cada frente. Não remover fontes/CSS/assets por heurística de “arquivo sem import”: menus e conteúdo usam referências dinâmicas.

## Descoberta em IA e Google

Não há uma norma universal ou técnica que garanta aparecer nas IAs. Google recomenda os fundamentos de SEO e conteúdo confiável; não exige schema especial ou `llms.txt` para suas experiências generativas. O índice complementar continua útil conforme a spec, sem promessa de consumo. [Guia oficial Google](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide). As finalidades de cada crawler e os controles de visibilidade/treinamento estão detalhados no relatório de IA, com fontes primárias.

Google-Extended bloqueado conserva a restrição de treinamento, mas também limita grounding Gemini Apps/Vertex AI; não afeta Google Search da mesma forma. Bing tem controles com efeitos em Copilot. Não liberar treinamento nem restringir busca automaticamente. Estado de Search generative AI/Search Console não consultado.

O Perfil da Empresa de Copacabana usa `benchimolclinic.com.br` e CEP `22050-001`; o site preservado usa `clinicadeolhosbenchimol.com.br` e `22020-001`. O domínio alternativo não foi comprovado quebrado. Confirmar com a clínica antes de alinhar informações; nenhuma alteração no perfil foi feita.

## O que falta medir após publicação manual

Gabriel mantém a decisão de não publicar agora. Quando houver URL Next de produção, medir PSI mobile/desktop em rotas representativas, guardar relatórios e comparar medianas de três execuções. Core Web Vitals de campo precisam de amostra real; CrUX pode ainda refletir WordPress dentro da janela de 28 dias. Score 100 é uma aspiração, não um resultado previsto por análise de arquivos. [PSI](https://developers.google.com/speed/docs/insights/v5/about), [scoring Lighthouse](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring).

Ainda faltam configuração real Vercel/WAF/CDN/HTTPS, visita de crawlers, Rich Results Test, Search Console (cobertura, canonicals, ações manuais, desempenho), Auth avançado, expiração/refresh/revogação e aceite visual/mobile atual. Essas limitações não anulam a QA editorial anterior; cada prova tem sua versão e escopo.

## Integridade da rodada

Código/configuração/runtime não alterados; banco hospedado consultado somente leitura no ref exclusivo **`jjrzmuuwuvxcsnwqzvxf`**, com binding e TLS, sem usar LifeWallet. Não houve gravação de conteúdo/schema/Auth/Storage, upload, exclusão de conteúdo clínico, novo login real, Docker, build, servidor iniciado/parado pelo agente, push, merge ou deploy. Mudanças locais: relatórios/contexto e a limpeza documentada dos 14 arquivos regeneráveis.

O repositório permanece na máquina local por decisão de Gabriel; `.git` é histórico/recuperação local, não motivo para criar GitHub. Arquivos grandes de referência/rollback foram preservados. Credenciais e privados seguem ignorados e fora da fronteira pública. Npm audit com zero advisories cobre apenas o catálogo consultado, não lógica de autorização ou riscos desconhecidos.

O log original dos **97 testes focados** foi preservado em [security-tests.log](security-tests.log), SHA-256 e proveniência em `security.json`; não foi reconstruído por execução nova. A suíte integral histórica de 229 testes permanece em seu relatório próprio e não foi repetida nesta rodada. Context7 e trace DevTools/Lighthouse não estavam expostos; foram usados os guias Next instalados e documentação oficial atual, com a limitação registrada.

O [resumo estruturado](summary.json) guarda os hashes das nove evidências centrais. A [conferência final da documentação](documentation-check.json) passou: 17 JSONs parseados, 111 links locais, hashes/proveniência dos testes, fontes preservadas e limpeza conferidos. A nota existente do projeto no Brain Gabriel Krapp foi sincronizada com guarda do hash anterior e ficou byte a byte igual à ponte local; [prova de sincronização](brain-sync.json).
