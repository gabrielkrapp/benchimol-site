# Presença pública no Google — amostra de 01/10/2026

**O domínio da clínica aparece na busca Google nesta amostra.** A consulta pela marca apresentou a Home e sitelinks para áreas do site; o operador site encontrou também artigos e serviços. Esses resultados pertencem ao WordPress original: Gabriel confirmou que a aplicação Next.js ainda não teve deploy.

Coleta somente leitura na própria interface Google, pelo navegador integrado, em português. O Google mostrou resultados personalizados e região Rio de Janeiro. Não houve login, alteração de perfil, envio de avaliação, solicitação de indexação ou acesso ao Search Console. Identidade da sessão e avaliações de pessoas não foram copiadas para a documentação.

Evidência estruturada: [`google-presence.json`](google-presence.json). Horário de coleta em UTC preservado no JSON; data de referência do relatório no fuso de Gabriel: 01/10/2026.

## Consultas realizadas

| Consulta | Observação |
|---|---|
| [site:clinicadeolhosbenchimol.com.br](https://www.google.com/search?q=site%3Aclinicadeolhosbenchimol.com.br&hl=pt-BR) | Primeira página apresentou dez resultados do domínio: Home, Blog, páginas de serviços e artigos. Isso é uma amostra, não contagem de todo o índice ou classificação de desempenho. |
| [Clínica de Olhos Benchimol](https://www.google.com/search?q=Cl%C3%ADnica+de+Olhos+Benchimol&hl=pt-BR) | Resultado do domínio atual com sitelinks para Convênios, Equipe, galeria de Copacabana, Especialidades e perfil médico. Também apareceu o Perfil da Empresa de Copacabana. |

O `site:` não retorna necessariamente todas as URLs indexadas e sua ordem não mede ranking. Uma URL ausente nessa consulta não prova desindexação. O diagnóstico de cobertura e canonical escolhido exige Search Console/inspeção. [Limites oficiais do operador site](https://developers.google.com/search/docs/monitor-debug/search-operators/all-search-site).

## GOOGLE-01 — P2 — Perfil da Empresa aponta outro domínio e CEP

Na consulta pela marca, o Perfil da Empresa associou o botão Site a `https://benchimolclinic.com.br/`. O resultado orgânico da Home usa `https://clinicadeolhosbenchimol.com.br/`. O endereço do perfil traz CEP `22050-001`; a Home capturada e o JSON-LD atual do Next usam `22020-001` para Copacabana (`src/lib/public/seo.ts:33`). O número público exibido no perfil foi `(21) 3816-7000`, coerente com o site.

Há uma divergência a confirmar com a clínica, não uma autorização para substituir o CEP preservado. O GET do domínio alternativo pela ferramenta web não foi acessível; não foi estabelecido se ele redireciona, qual seu proprietário ou qual configuração é a correta. Não há evidência suficiente para afirmar que o botão é quebrado.

**Ação proposta:** o proprietário confirma o domínio oficial e o CEP correto de cada unidade; depois alinha o Perfil da Empresa, site e schema. Registrar eventual alteração editorial separadamente da migração fiel. A atualização é feita pelo proprietário ou com autorização específica de escrita. Google recomenda manter informações locais atuais também para suas experiências de IA. [Orientação oficial Google para IA](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).

## Pendências que esta amostra não resolve

- Search Console: propriedade, volume de indexação, sitemap aceito, desempenho, canonical escolhido, ações manuais, problemas de segurança e histórico antes/depois da troca.
- Perfil da unidade Campo Grande: não foi feita inspeção separada nesta rodada; não inferir ausência.
- Visibilidade por termos não relacionados à marca, mapas/local pack em outras regiões e sessões sem personalização.
- Reconhecimento e indexação do Next.js após publicação manual; regras de CDN/WAF e visitas reais de crawlers.
- Resultado de IA Google: não foi executada consulta em Modo IA nem usada eventual indicação como prova universal.

A lista de presença encontrada é positiva para o legado. O aceite de SEO da aplicação requer os ajustes e checks técnicos registrados em [`google-seo.md`](google-seo.md), depois conferência publicada pelo usuário.
