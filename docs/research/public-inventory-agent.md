# Inventário público complementar — Clínica de Olhos Benchimol

Levantamento somente leitura em 30/09/2026. Fonte principal: páginas públicas de `https://clinicadeolhosbenchimol.com.br/` pelo extrator web e busca pública. Não foram enviados formulários, mensagens ou comentários, nem alterado o site. Este arquivo é um relatório de achados, não um export completo de WordPress.

## Cobertura e limites

- **Observado:** navegação da Home, Blog, Sobre Nós, Equipe, Especialidades, Convênios, Exames, diversas páginas de especialidade/bios, 31 URLs de artigos inicialmente pela web; atualização abaixo confrontada com os 154 registros REST públicos capturados pelo agente principal.
- **Observado:** `/blog/` apresenta seis artigos inicialmente e botão **Carregar Mais**. A coleta textual da primeira página não abrange o arquivo completo.
- **Atualização com evidência local:** o manifesto REST registra total/captura coincidentes para posts 154/154 (duas páginas), páginas 38/38, categorias 10/10 e tags 81/81. Mídia permanece incompleta: total reportado 551, captura 527 (diferença 24). O arquivo `routes.json` cobre 289 URLs, todas com resposta final 200, mas não registra nesta análise os códigos intermediários de redirect. Sitemap, arquivos de anexos e conteúdo administrativo não foram auditados integralmente por este agente.
- Tentativas via ferramenta web a `/robots.txt`, `/sitemap_index.xml` e `/wp-json/wp/v2/posts?per_page=100&page=1` não foram acessíveis. GET via Python no shell falhou por DNS no sandbox. Não se interpreta isso como falha do site.
- Categorias `/category/oftalmologia/` e `/category/blog/` são links publicados; o extrator web não conseguiu obtê-las. A captura HTTP do agente principal depois confirmou resposta final 200 para ambas. Não foi usado o navegador compartilhado.
- Resultados web podem vir de crawl anterior (entre hoje e alguns meses). Falhas de ferramenta, `Cache miss`, 406, 429 ou 500 retornados pelo extrator não comprovam indisponibilidade ao visitante normal.

## Navegação e páginas institucionais

Menu público observado na [Home](https://clinicadeolhosbenchimol.com.br/), repetido no cabeçalho/menu móvel e rodapé das páginas internas:

| Rótulo | Rota publicada | Observação |
|---|---|---|
| Home | `/` | Página de entrada e CTA para agendamento |
| Sobre Nós | `/sobre-nos/` | História da família/clínica e linha do tempo |
| Equipe | `/equipe/` | Elenco de médicos, CRM/RQE e quatro links explícitos de biografia |
| Especialidades | `/especialidades/` | Página agregadora com listas de consultas, exames e cirurgias |
| Catarata | `/catarata/` | Submenu de Especialidades |
| Retinopatia diabética | `/retinopatia-diabetica/` | Submenu de Especialidades |
| Glaucoma | `/glaucoma` | Extrator observou resolução para `/glaucoma/`; status do redirect não confirmado |
| DMRI | `/degeneracao-macular/` | Link observado; leitura pelo extrator retornou 406 |
| Olho seco | `/olho-seco` | Versão com `/` foi lida; confirmar normalização HTTP |
| Cirurgia refrativa | `/cirurgia-refrativa/` | Submenu de Especialidades |
| Exames | `/exames-e-procedimentos/` | Exames diagnósticos e procedimentos, não `/exames/` |
| Serviços | `/servicos/` | Página confirmada também por busca pública |
| Convênios | `/convenios/` | Listas diferentes por unidade |
| Blog | `/blog/` | Arquivo com seis cards iniciais e carga adicional |

Fontes individuais: [Sobre Nós](https://clinicadeolhosbenchimol.com.br/sobre-nos/), [Equipe](https://clinicadeolhosbenchimol.com.br/equipe/), [Especialidades](https://clinicadeolhosbenchimol.com.br/especialidades/), [Exames](https://clinicadeolhosbenchimol.com.br/exames-e-procedimentos/), [Serviços](https://clinicadeolhosbenchimol.com.br/servicos/), [Convênios](https://clinicadeolhosbenchimol.com.br/convenios/).

Páginas e arquivos adicionais encontrados fora do menu principal:

| URL | Evidência pública |
|---|---|
| [Equipamentos](https://clinicadeolhosbenchimol.com.br/equipamentos/) | Vários links de exames em Especialidades levam aqui; possui fotos, nomes e descrições de aparelhos |
| [Dr. Sergio Benchimol](https://clinicadeolhosbenchimol.com.br/dr-sergio-benchimol/) | Link “Saiba mais” em Equipe; leitura pelo extrator falhou |
| [Dra. Veronica Benchimol](https://clinicadeolhosbenchimol.com.br/dra-veronica-benchimol/) | Link em Equipe; biografia com formação e especialidades |
| [Dr. Raphael Lima Benchimol](https://clinicadeolhosbenchimol.com.br/dr-raphael-lima-benchimol/) | Link em Equipe; biografia pública |
| [Dr. Gabriel Benchimol](https://clinicadeolhosbenchimol.com.br/dr-gabriel-benchimol/) | Link em Equipe; biografia pública |
| [Dra. Adriana Benchimol](https://clinicadeolhosbenchimol.com.br/dra-adriana-benchimol/) | Link de Mapeamento de Retina em Especialidades; biografia pública antiga |
| [Dra. Liana Benchimol](https://clinicadeolhosbenchimol.com.br/dra-liana-benchimol/) | Página indexada e texto público encontrado por busca |
| [Dra. Nina Benchimol](https://clinicadeolhosbenchimol.com.br/dra-nina-benchimol/) | Página indexada e texto público encontrado por busca |
| [Dra. Mirelle Benchimol](https://clinicadeolhosbenchimol.com.br/dra-mirelle-benchimol/) | Página indexada e texto público encontrado por busca |
| [Dra. Mônica de Oliveira Coelho](https://clinicadeolhosbenchimol.com.br/dra-monica-de-oliveira-coelho/) | Página indexada e texto público encontrado por busca |
| [Dra. Amélia Gomes de Souza](https://clinicadeolhosbenchimol.com.br/dra-amelia-gomes-de-souza/) | Página indexada; apresenta link para currículo completo |
| [Currículo de Veronica em PDF](https://clinicadeolhosbenchimol.com.br/wp-content/uploads/2023/02/Curriculum-Veronica-Benchimol.pdf) | Arquivo PDF público indexado sob uploads; não é página WordPress |

**Implicação de migração (inferência):** a navegação atual não é a lista de URLs que precisam continuar funcionando. Bios antigas, equipamentos e PDFs podem receber tráfego direto ou de buscadores.

## Blog — registros REST e metadados

Inventário dos **154 registros de posts publicados** na captura [REST posts](https://clinicadeolhosbenchimol.com.br/wp-json/wp/v2/posts?per_page=100&page=1), completada pela [página 2](https://clinicadeolhosbenchimol.com.br/wp-json/wp/v2/posts?per_page=100&page=2). O manifesto local registra total reportado 154, 154 capturados e duas páginas solicitadas. Faixa das datas públicas: **22/10/2018–07/01/2026**. Todos têm autor ID 2 (Johny nos templates amostrados) e categoria Blog (7), Oftalmologia (1), ou ambas.

São 154 links de posts distintos, que resolvem **152 destinos únicos** na captura de rotas, devido a aliases observados. Há ainda uma colisão entre post e página para `/cirurgia-refrativa/`; portanto contagem de registros não equivale à contagem de páginas navegáveis independentes. Ver seção de conflitos abaixo.

| ID | Data pública | Título e URL (slug preservado no link) | Categorias |
|---|---|---|---|
| 3806 | 2026-01-07 | [O que é o mapeamento da retina e quando esse exame oftalmológico é indicado?](https://clinicadeolhosbenchimol.com.br/o-que-e-o-mapeamento-da-retina-e-quando-esse-exame-oftalmologico-e-indicado/) | Oftalmologia |
| 3778 | 2025-12-17 | [Os Marcos de Décadas da Clínica de Olhos Benchimol](https://clinicadeolhosbenchimol.com.br/os-marcos-de-decadas-da-clinica-de-olhos-benchimol/) | Oftalmologia |
| 3775 | 2025-12-17 | [Moscas volantes: sintoma comum ou alerta de perigo?](https://clinicadeolhosbenchimol.com.br/moscas-volantes-sintoma-comum-ou-alerta-de-perigo/) | Oftalmologia |
| 3736 | 2025-11-28 | [DMRI seca e úmida: saiba quais são as diferenças](https://clinicadeolhosbenchimol.com.br/dmri-seca-e-umida-saiba-quais-sao-as-diferencas/) | Blog, Oftalmologia |
| 3732 | 2025-11-28 | [Diabetes pode causar cegueira? Entenda os riscos e como evitar](https://clinicadeolhosbenchimol.com.br/diabetes-pode-causar-cegueira-entenda-os-riscos-e-como-evitar/) | Blog |
| 3636 | 2025-10-02 | [A importância dos exames oftalmológicos de rotina após os 50 anos](https://clinicadeolhosbenchimol.com.br/a-importancia-dos-exames-oftalmologicos-de-rotina-apos-os-50-anos/) | Oftalmologia |
| 3632 | 2025-10-02 | [Por que a acuidade visual pode piorar com o avanço da idade?](https://clinicadeolhosbenchimol.com.br/por-que-a-acuidade-visual-pode-piorar-com-o-avanco-da-idade/) | Oftalmologia |
| 3444 | 2025-09-03 | [Como funciona a injeção intravítrea para o tratamento de condições da mácula](https://clinicadeolhosbenchimol.com.br/como-funciona-a-injecao-intravitrea-para-o-tratamento-de-condicoes-da-macula/) | Oftalmologia |
| 3441 | 2025-09-03 | [A importância do OCT para pacientes com catarata](https://clinicadeolhosbenchimol.com.br/a-importancia-do-oct-para-pacientes-com-catarata/) | Oftalmologia |
| 2840 | 2025-08-06 | [5 Sinais de que sua visão precisa de atenção imediata](https://clinicadeolhosbenchimol.com.br/5-sinais-de-que-sua-visao-precisa-de-atencao-imediata/) | Oftalmologia |
| 2835 | 2025-08-06 | [Existe um oftalmologista especialista em mácula?](https://clinicadeolhosbenchimol.com.br/existe-um-oftalmologista-especialista-em-macula/) | Oftalmologia |
| 2831 | 2025-08-04 | [Como identificar os primeiros sinais de catarata](https://clinicadeolhosbenchimol.com.br/como-identificar-os-primeiros-sinais-de-catarata/) | Oftalmologia |
| 2599 | 2025-07-17 | [A importância dos exames oftalmológicos regulares](https://clinicadeolhosbenchimol.com.br/a-importancia-dos-exames-oftalmologicos-regulares/) | Oftalmologia |
| 2593 | 2025-07-02 | [Olho seco no inverno: causas, sintomas e como tratar](https://clinicadeolhosbenchimol.com.br/olho-seco-no-inverno-causas-sintomas-e-como-tratar/) | Oftalmologia |
| 2590 | 2025-07-02 | [Junho Violeta: por que prevenir o ceratocone é tão importante?](https://clinicadeolhosbenchimol.com.br/junho-violeta-por-que-prevenir-o-ceratocone/) | Oftalmologia |
| 2573 | 2025-05-27 | [Glaucoma: prevenção e diagnóstico precoce no Maio Verde](https://clinicadeolhosbenchimol.com.br/glaucoma-prevencao-e-diagnostico-precoce-no-maio-verde/) | Blog |
| 2568 | 2025-05-27 | [Tipos de Catarata: sintomas, causas e cirurgia](https://clinicadeolhosbenchimol.com.br/tipos-de-catarata-sintomas-causas-e-cirurgia/) | Blog |
| 2542 | 2025-04-28 | [Como o Transtorno do Espectro Autista (TEA) pode afetar a visão?](https://clinicadeolhosbenchimol.com.br/como-o-transtorno-do-espectro-autista-tea-pode-afetar-a-visao/) | Blog |
| 2538 | 2025-04-28 | [Abril Marrom: a importância de cuidar da visão](https://clinicadeolhosbenchimol.com.br/abril-marrom-a-importancia-de-cuidar-da-visao/) | Blog |
| 2515 | 2025-03-26 | [Mulheres e DMRI: qual é a relação após os 60 anos?](https://clinicadeolhosbenchimol.com.br/mulheres-e-dmri-qual-e-a-relacao-apos-os-60-anos/) | Blog |
| 2512 | 2025-03-26 | [Olho Seco na Menopausa: Há influência?](https://clinicadeolhosbenchimol.com.br/olho-seco-na-menopausa-ha-influencia/) | Blog |
| 2474 | 2025-02-06 | [Cirurgia Refrativa: O que é e Indicações](https://clinicadeolhosbenchimol.com.br/cirurgia-refrativa-o-que-e-e-indicacoes/) | Blog |
| 2468 | 2025-02-06 | [Cuidados com os Olhos no Carnaval](https://clinicadeolhosbenchimol.com.br/cuidados-com-os-olhos-no-carnaval/) | Blog |
| 2448 | 2025-01-31 | [Quando devo usar óculos?](https://clinicadeolhosbenchimol.com.br/quando-devo-usar-oculos/) | Blog |
| 2445 | 2025-01-31 | [Doenças Oculares mais Comuns](https://clinicadeolhosbenchimol.com.br/doencas-oculares-mais-comuns/) | Blog |
| 2363 | 2024-12-26 | [Cuidados com os Olhos no Verão](https://clinicadeolhosbenchimol.com.br/cuidados-com-os-olhos-no-verao-2/) | Oftalmologia |
| 2360 | 2024-12-26 | [Cuidados com a Visão Durante a Prática de Atividades Físicas](https://clinicadeolhosbenchimol.com.br/cuidados-com-a-visao-durante-a-pratica-de-atividades-fisicas/) | Oftalmologia |
| 2342 | 2024-11-22 | [Clínica de Olhos Benchimol: Tradição e Inovação em Oftalmologia](https://clinicadeolhosbenchimol.com.br/clinica-de-olhos-benchimol-tradicao-e-inovacao-em-oftalmologia/) | Oftalmologia |
| 2338 | 2024-11-22 | [O que é Glaucoma: Sintomas, Causas, Tipos e Tratamento](https://clinicadeolhosbenchimol.com.br/o-que-e-glaucoma-sintomas-causas-tipos-e-tratamento/) | Oftalmologia |
| 2305 | 2024-10-18 | [Degeneração Macular: Sintomas, Causas, Tipos e Tratamento](https://clinicadeolhosbenchimol.com.br/degeneracao-macular-sintomas-causas-tipos-e-tratamento/) | Oftalmologia |
| 2302 | 2024-10-18 | [Retinopatia Diabética: Sintomas, Causas, Tipos e Tratamento](https://clinicadeolhosbenchimol.com.br/retinopatia-diabetica-sintomas-causas-tipos-e-tratamento/) | Oftalmologia |
| 2285 | 2024-09-16 | [Clínica Benchimol: Oftalmologia e Centro de Tratamento de Catarata](https://clinicadeolhosbenchimol.com.br/clinica-benchimol-oftalmologia-e-centro-de-tratamento-de-catarata/) | Oftalmologia |
| 2271 | 2024-09-16 | [Catarata: Sintomas, Causas, Tipos e Tratamento](https://clinicadeolhosbenchimol.com.br/catarata-sintomas-causas-tipos-e-tratamento/) | Oftalmologia |
| 2258 | 2024-06-20 | [Dicas de cuidados com os olhos no frio](https://clinicadeolhosbenchimol.com.br/dicas_cuidado_olhos_frio/) | Oftalmologia |
| 2253 | 2024-05-21 | [Estrabismo: o que é, causas, sintomas e tratamentos](https://clinicadeolhosbenchimol.com.br/estrabismo-causas-sintomas-tratamentos/) | Oftalmologia |
| 2197 | 2024-04-16 | [Tudo sobre a cirurgia de catarata: vantagens e riscos do procedimento](https://clinicadeolhosbenchimol.com.br/tudo-sobre-a-cirurgia-de-catarata-vantagens-e-riscos-do-procedimento/) | Blog, Oftalmologia |
| 2168 | 2024-03-12 | [Quais diferenças entre miopia, hipermetropia e astigmatismo?](https://clinicadeolhosbenchimol.com.br/quais-diferencas-entre-miopia-hipermetropia-e-astigmatismo/) | Blog, Oftalmologia |
| 2158 | 2024-02-24 | [Desmistificando a Cirurgia de Catarata: 5 Mitos e Verdades Cruciais](https://clinicadeolhosbenchimol.com.br/desmistificando-a-cirurgia-de-catarata-5-mitos-e-verdades-cruciais/) | Blog, Oftalmologia |
| 2156 | 2024-01-19 | [Mitos e verdades sobre olhos claros: entenda os cuidados necessários para manter a saúde ocular.](https://clinicadeolhosbenchimol.com.br/mitos-e-verdades-sobre-olhos-claros-entenda-os-cuidados-necessarios-para-manter-a-saude-ocular-2/) | Blog, Oftalmologia |
| 17 | 2023-12-19 | [Cirurgia refrativa: quais as indicações, como é feita e quais os cuidados no pós-operatório](https://clinicadeolhosbenchimol.com.br/cirurgia-refrativa-quais-as-indicacoes-como-e-feita-e-quais-os-cuidados-no-pos-operatorio/) | Oftalmologia |
| 2152 | 2023-12-05 | [Dicas para prevenir a conjuntivite bacteriana.](https://clinicadeolhosbenchimol.com.br/dicas-para-prevenir-a-conjuntivite-bacteriana/) | Blog, Oftalmologia |
| 2148 | 2023-11-24 | [Cuidados com os olhos na menopausa](https://clinicadeolhosbenchimol.com.br/cuidados-com-os-olhos-na-menopausa/) | Blog, Oftalmologia |
| 2144 | 2023-10-23 | [Alerta de cuidado para maquiagens nos olhos no Halloween](https://clinicadeolhosbenchimol.com.br/alerta-de-cuidado-para-maquiagens-nos-olhos-no-halloween/) | Blog, Oftalmologia |
| 2140 | 2023-09-27 | [Claridade incomodando a visão? Conheça possíveis causas e como tratar](https://clinicadeolhosbenchimol.com.br/claridade-incomodando-a-visao-conheca-possiveis-causas-e-como-tratar/) | Blog, Oftalmologia |
| 2136 | 2023-08-22 | [Pterígio: o que é, como tratar, como prevenir](https://clinicadeolhosbenchimol.com.br/pterigio-o-que-e-como-tratar-como-prevenir/) | Blog, Oftalmologia |
| 2132 | 2023-07-24 | [Glaucoma congênito: o que é e por que o diagnóstico precoce é fundamental](https://clinicadeolhosbenchimol.com.br/glaucoma-congenito-o-que-e-e-por-que-o-diagnostico-precoce-e-fundamental/) | Blog, Oftalmologia |
| 2128 | 2023-06-28 | [Infecção ocular: o que o caso do ator de Game of Thrones pode nos ensinar sobre isso e como evitar](https://clinicadeolhosbenchimol.com.br/infeccao-ocular-o-que-o-caso-do-ator-de-game-of-thrones-pode-nos-ensinar-sobre-isso-e-como-evitar/) | Blog, Oftalmologia |
| 2124 | 2023-04-30 | [Glaucoma e catarata: quais as diferenças entre eles?](https://clinicadeolhosbenchimol.com.br/glaucoma-e-catarata-quais-as-diferencas-entre-eles/) | Blog, Oftalmologia |
| 2120 | 2023-04-25 | [Quais as consequências para os olhos da trend de passar protetor labial nas pálpebras?](https://clinicadeolhosbenchimol.com.br/quais-as-consequencias-para-os-olhos-da-trend-de-passar-protetor-labial-nas-palpebras/) | Blog, Oftalmologia |
| 2116 | 2023-02-15 | [Como você pode colaborar com a saúde dos seus olhos](https://clinicadeolhosbenchimol.com.br/como-voce-pode-colaborar-com-a-saude-dos-seus-olhos/) | Blog, Oftalmologia |
| 18 | 2022-12-02 | [Botox contra estrabismo e outros problemas oculares?](https://clinicadeolhosbenchimol.com.br/botox-contra-estrabismo-e-outros-problemas-oculares/) | Oftalmologia |
| 19 | 2022-10-24 | [Mais um motivo para combater a obesidade: a sua saúde ocular](https://clinicadeolhosbenchimol.com.br/mais-um-motivo-para-combater-a-obesidade-a-sua-saude-ocular/) | Blog |
| 20 | 2022-09-23 | [Catarata: quais os sintomas e a hora de procurar o médico?](https://clinicadeolhosbenchimol.com.br/catarata-quais-os-sintomas-e-a-hora-de-procurar-o-medico/) | Blog |
| 21 | 2022-07-21 | [Óculos escuros: como escolher os seus e outras dúvidas frequentes](https://clinicadeolhosbenchimol.com.br/oculos-escuros-como-escolher-os-seus-e-outras-duvidas-frequentes/) | Blog |
| 22 | 2022-06-28 | [Olhos vermelhos: o que pode ser?](https://clinicadeolhosbenchimol.com.br/olhos-vermelhos-o-que-pode-ser/) | Blog |
| 23 | 2022-05-30 | [Qualidade de sono e saúde ocular](https://clinicadeolhosbenchimol.com.br/qualidade-de-sono-e-saude-ocular/) | Blog |
| 24 | 2022-05-04 | [Cuidados com os olhos no outono](https://clinicadeolhosbenchimol.com.br/cuidados-com-os-olhos-no-outono/) | Oftalmologia |
| 25 | 2022-03-23 | [Hipermetropia](https://clinicadeolhosbenchimol.com.br/hipermetropia/) | Blog |
| 26 | 2022-02-14 | [Cuidados com os olhos no verão](https://clinicadeolhosbenchimol.com.br/cuidados-com-os-olhos-no-verao/) | Blog |
| 27 | 2022-02-03 | [Câncer no olho de crianças pequenas – Retinoblastoma](https://clinicadeolhosbenchimol.com.br/cancer-no-olho-de-criancas-pequenas-retinoblastoma/) | Blog |
| 28 | 2021-12-14 | [Lentes de contato coloridas: o que pode, o que não pode.](https://clinicadeolhosbenchimol.com.br/lentes-de-contato-coloridas-o-que-pode-o-que-nao-pode/) | Blog |
| 29 | 2021-11-17 | [Alimentos que fazem bem para os olhos](https://clinicadeolhosbenchimol.com.br/alimentos-que-fazem-bem-para-os-olhos/) | Blog |
| 30 | 2021-08-19 | [Trombose ocular: o que é e por que ficar atento](https://clinicadeolhosbenchimol.com.br/trombose-ocular-o-que-e-e-por-que-ficar-atento/) | Blog |
| 31 | 2021-07-22 | [Córnea sintética, uma esperança para quem aguarda há anos a doação da versão humana.](https://clinicadeolhosbenchimol.com.br/cornea-sintetica-uma-esperanca-para-quem-aguarda-ha-anos-a-doacao-da-versao-humana/) | Oftalmologia |
| 32 | 2021-06-17 | [Degeneração Macular Relacionada à Idade: o que é e como prevenir.](https://clinicadeolhosbenchimol.com.br/degeneracao-macular-relacionada-a-idade-o-que-e-e-como-prevenir/) | Oftalmologia |
| 33 | 2021-05-21 | [Tudo que o diabético precisa saber para evitar a cegueira pela retinopatia](https://clinicadeolhosbenchimol.com.br/tudo-que-o-diabetico-precisa-saber-para-evitar-a-cegueira-pela-retinopatia/) | Blog |
| 34 | 2021-04-09 | [Cirurgia Refrativa](https://clinicadeolhosbenchimol.com.br/cirurgia-refrativa/) | Blog |
| 35 | 2021-03-08 | [A Saúde Ocular da Mulher](https://clinicadeolhosbenchimol.com.br/a-saude-ocular-da-mulher/) | Blog |
| 36 | 2021-03-01 | [Alerta Para as Doenças Raras Oculares](https://clinicadeolhosbenchimol.com.br/alerta-para-as-doencas-raras-oculares/) | Blog |
| 2109 | 2021-02-24 | [“Mulheres podem ser daltônicas?”, “Como um daltônico enxerga?” e outras dúvidas frequentes sobre essa deficiência ocular](https://clinicadeolhosbenchimol.com.br/mulheres-podem-ser-daltonicas-como-um-daltonico-enxerga-e-outras-duvidas-frequentes-sobre-essa-doenca/) | Blog, Oftalmologia |
| 2104 | 2021-02-24 | [8 Dicas para Proteger a Saúde da sua Visão](https://clinicadeolhosbenchimol.com.br/8-dicas-para-proteger-a-saude-da-sua-visao/) | Blog, Oftalmologia |
| 2100 | 2021-02-23 | [Glaucoma de Ângulo Aberto: o que saber?](https://clinicadeolhosbenchimol.com.br/glaucoma-de-angulo-aberto-o-que-saber/) | Blog, Oftalmologia |
| 2096 | 2021-02-08 | [Cuidados com as Pálpebras](https://clinicadeolhosbenchimol.com.br/cuidados-com-as-palpebras/) | Blog, Oftalmologia |
| 2092 | 2021-02-03 | [Daltonismo](https://clinicadeolhosbenchimol.com.br/daltonismo/) | Blog, Oftalmologia |
| 2088 | 2021-01-27 | [Auto-Refrator](https://clinicadeolhosbenchimol.com.br/auto-refrator/) | Blog, Oftalmologia |
| 2084 | 2021-01-25 | [Check-Up Ocular Anual](https://clinicadeolhosbenchimol.com.br/check-up-ocular-anual/) | Blog, Oftalmologia |
| 2080 | 2021-01-21 | [4 Curiosidades Sobre a Visão](https://clinicadeolhosbenchimol.com.br/4-curiosidades-sobre-a-visao/) | Blog, Oftalmologia |
| 2076 | 2021-01-18 | [Automedicação pode afetar a sua Saúde Ocular](https://clinicadeolhosbenchimol.com.br/automedicacao-pode-afetar-a-sua-saude-ocular/) | Blog, Oftalmologia |
| 2072 | 2021-01-13 | [Verão X Conjuntivite](https://clinicadeolhosbenchimol.com.br/verao-x-conjuntivite/) | Blog, Oftalmologia |
| 2068 | 2021-01-07 | [Saúde Ocular X Carteira de Habilitação](https://clinicadeolhosbenchimol.com.br/saude-ocular-x-carteira-de-habilitacao/) | Blog, Oftalmologia |
| 2064 | 2021-01-05 | [Cuidados Oculares no Verão](https://clinicadeolhosbenchimol.com.br/cuidados-oculares-no-verao/) | Blog, Oftalmologia |
| 2060 | 2020-12-17 | [Quatro doenças oculares mais comuns em idosos](https://clinicadeolhosbenchimol.com.br/quatro-doencas-oculares-mais-comuns-em-idosos/) | Blog, Oftalmologia |
| 2056 | 2020-12-14 | [Causas da miopia vão além da genética](https://clinicadeolhosbenchimol.com.br/causas-da-miopia-vao-alem-da-genetica/) | Blog, Oftalmologia |
| 2052 | 2020-12-07 | [Mapeamento de retina: exame ocular que pode detectar doenças no corpo](https://clinicadeolhosbenchimol.com.br/mapeamento-de-retina-exame-ocular-que-pode-detectar-doencas-no-corpo/) | Blog, Oftalmologia |
| 2048 | 2020-12-07 | [Tireoide e Saúde Ocular](https://clinicadeolhosbenchimol.com.br/tireoide-e-saude-ocular/) | Blog, Oftalmologia |
| 2044 | 2020-12-02 | [Estresse Oxidativo pode comprometer a visão](https://clinicadeolhosbenchimol.com.br/estresse-oxidativo-pode-comprometer-a-visao/) | Blog, Oftalmologia |
| 2040 | 2020-11-30 | [Colírio: medicamento requer cuidados.](https://clinicadeolhosbenchimol.com.br/colirio-medicamento-requer-cuidados/) | Blog, Oftalmologia |
| 2036 | 2020-11-25 | [Por que o olho lacrimeja quando estamos com sono?](https://clinicadeolhosbenchimol.com.br/por-que-o-olho-lacrimeja-quando-estamos-com-sono/) | Blog, Oftalmologia |
| 2032 | 2020-11-23 | [Cuidados ao maquiar os olhos](https://clinicadeolhosbenchimol.com.br/cuidados-ao-maquiar-os-olhos/) | Blog, Oftalmologia |
| 2028 | 2020-11-19 | [Dicas naturais para a saúde da sua visão](https://clinicadeolhosbenchimol.com.br/dicas-naturais-para-a-saude-da-sua-visao/) | Blog, Oftalmologia |
| 2024 | 2020-11-16 | [Maioria dos diabéticos temem perda da visão](https://clinicadeolhosbenchimol.com.br/maioria-dos-diabeticos-temem-perda-da-visao/) | Blog, Oftalmologia |
| 2020 | 2020-11-11 | [Visão Subnormal](https://clinicadeolhosbenchimol.com.br/visao-subnormal/) | Blog, Oftalmologia |
| 2016 | 2020-11-09 | [Você cuida bem da sua visão?](https://clinicadeolhosbenchimol.com.br/voce-cuida-bem-da-sua-visao/) | Blog, Oftalmologia |
| 2012 | 2020-11-03 | [Melanose Primária](https://clinicadeolhosbenchimol.com.br/melanose-primaria/) | Blog, Oftalmologia |
| 2008 | 2020-10-28 | [Olhos Ressecados](https://clinicadeolhosbenchimol.com.br/olhos-ressecados/) | Blog, Oftalmologia |
| 2004 | 2020-10-27 | [Colesterol e Saúde Ocular](https://clinicadeolhosbenchimol.com.br/colesterol-e-saude-ocular/) | Blog, Oftalmologia |
| 2000 | 2020-10-21 | [Principais emergências ligadas à visão](https://clinicadeolhosbenchimol.com.br/principais-emergencias-ligadas-a-visao/) | Blog, Oftalmologia |
| 1996 | 2020-10-19 | [Insônia e Saúde Ocular](https://clinicadeolhosbenchimol.com.br/insonia-e-saude-ocular/) | Blog, Oftalmologia |
| 1992 | 2020-10-14 | [A importância dos exames oculares](https://clinicadeolhosbenchimol.com.br/a-importancia-dos-exames-oculares/) | Blog, Oftalmologia |
| 1988 | 2020-10-13 | [As aulas/ trabalhos virtuais e o estresse visual](https://clinicadeolhosbenchimol.com.br/as-aulas-trabalhos-virtuais-e-o-estresse-visual/) | Blog, Oftalmologia |
| 1984 | 2020-10-05 | [Cuidados com os Olhos ao Praticar Exercício Físico](https://clinicadeolhosbenchimol.com.br/cuidados-com-os-olhos-ao-praticar-exercicio-fisico/) | Blog, Oftalmologia |
| 1980 | 2020-09-30 | [Dicas para manter a visão saudável até a velhice](https://clinicadeolhosbenchimol.com.br/dicas-para-manter-a-visao-saudavel-ate-a-velhice/) | Blog, Oftalmologia |
| 1976 | 2020-09-29 | [Cuidados da Saúde Ocular na Primavera](https://clinicadeolhosbenchimol.com.br/cuidados-da-saude-ocular-na-primavera/) | Blog, Oftalmologia |
| 1970 | 2020-09-27 | [Dia Mundial da Retina](https://clinicadeolhosbenchimol.com.br/por-que-piscamos-os-olhos-2/) | Blog, Oftalmologia |
| 1966 | 2020-09-21 | [Por que piscamos os olhos?](https://clinicadeolhosbenchimol.com.br/por-que-piscamos-os-olhos/) | Blog, Oftalmologia |
| 1963 | 2020-09-16 | [Você sabe quais os cuidados básicos após a realização da cirurgia de catarata?](https://clinicadeolhosbenchimol.com.br/voce-sabe-quais-os-cuidados-basicos-apos-a-realizacao-da-cirurgia-de-catarata-2/) | Blog, Oftalmologia |
| 1955 | 2020-09-14 | [Verdades sobre sua visão](https://clinicadeolhosbenchimol.com.br/verdades-sobre-sua-visao/) | Blog, Oftalmologia |
| 1951 | 2020-09-08 | [Atividade Física e Saúde Ocular](https://clinicadeolhosbenchimol.com.br/atividade-fisica-e-saude-ocular/) | Blog, Oftalmologia |
| 1947 | 2020-08-31 | [Hipertensão: um risco para sua visão](https://clinicadeolhosbenchimol.com.br/hipertensao-um-risco-para-sua-visao/) | Blog, Oftalmologia |
| 1943 | 2020-08-26 | [Fotofobia](https://clinicadeolhosbenchimol.com.br/fotofobia/) | Blog, Oftalmologia |
| 1939 | 2020-08-24 | [Como higienizar corretamente as lentes do óculos.](https://clinicadeolhosbenchimol.com.br/como-higienizar-corretamente-as-lentes-do-oculos/) | Blog, Oftalmologia |
| 1935 | 2020-08-19 | [Hipermetropia](https://clinicadeolhosbenchimol.com.br/hipermetropia-2/) | Blog, Oftalmologia |
| 1959 | 2020-08-16 | [Você sabe quais os cuidados básicos após a realização da cirurgia de catarata?](https://clinicadeolhosbenchimol.com.br/voce-sabe-quais-os-cuidados-basicos-apos-a-realizacao-da-cirurgia-de-catarata/) | Blog, Oftalmologia |
| 1931 | 2020-08-13 | [Miopia](https://clinicadeolhosbenchimol.com.br/miopia/) | Blog, Oftalmologia |
| 1927 | 2020-08-11 | [Astigmatismo](https://clinicadeolhosbenchimol.com.br/astigmatismo/) | Blog, Oftalmologia |
| 1923 | 2020-08-05 | [Sintomas iniciais da Catarata](https://clinicadeolhosbenchimol.com.br/sintomas-iniciais-da-catarata/) | Blog, Oftalmologia |
| 1919 | 2020-08-05 | [O que são moscas volantes na visão?](https://clinicadeolhosbenchimol.com.br/o-que-sao-moscas-volantes-na-visao/) | Blog, Oftalmologia |
| 1915 | 2020-07-28 | [Como saber se a pressão ocular está alta?](https://clinicadeolhosbenchimol.com.br/como-saber-se-a-pressao-ocular-esta-alta/) | Blog, Oftalmologia |
| 1911 | 2020-07-27 | [Estresse pode aumentar risco de glaucoma](https://clinicadeolhosbenchimol.com.br/estresse-pode-aumentar-risco-de-glaucoma/) | Blog, Oftalmologia |
| 1907 | 2020-07-22 | [Presbiopia](https://clinicadeolhosbenchimol.com.br/presbiopia/) | Blog, Oftalmologia |
| 1901 | 2020-07-18 | [Ambliopia ou Olho Preguiçoso](https://clinicadeolhosbenchimol.com.br/ambliopia-ou-olho-preguicoso/) | Blog, Oftalmologia |
| 1897 | 2020-07-13 | [Sinais de alerta para troca de óculos.](https://clinicadeolhosbenchimol.com.br/sinais-de-alerta-para-troca-de-oculos/) | Blog, Oftalmologia |
| 1892 | 2020-07-07 | [Blefarite](https://clinicadeolhosbenchimol.com.br/blefarite/) | Blog, Oftalmologia |
| 1888 | 2020-07-01 | [Curiosidades sobre nossos cílios:](https://clinicadeolhosbenchimol.com.br/curiosidades-sobre-nossos-cilios/) | Blog, Oftalmologia |
| 1884 | 2020-06-30 | [Por que sinto tremor nas pálpebras?](https://clinicadeolhosbenchimol.com.br/por-que-sinto-tremor-nas-palpebras/) | Blog, Oftalmologia |
| 1880 | 2020-06-26 | [Terçol: O que é?](https://clinicadeolhosbenchimol.com.br/tercol-o-que-e/) | Blog, Oftalmologia |
| 1876 | 2020-06-25 | [Saúde Ocular no Inverno](https://clinicadeolhosbenchimol.com.br/saude-ocular-no-inverno/) | Blog, Oftalmologia |
| 1872 | 2020-02-10 | [Volta às Aulas: Atenção a Saúde Ocular Infantil.](https://clinicadeolhosbenchimol.com.br/volta-as-aulas-atencao-a-saude-ocular-infantil/) | Blog, Oftalmologia |
| 1868 | 2020-01-31 | [Maquiagem: Segurança e Cuidados](https://clinicadeolhosbenchimol.com.br/maquiagem-seguranca-e-cuidados/) | Blog, Oftalmologia |
| 1864 | 2020-01-30 | [Cuidados com a Visão no Verão:](https://clinicadeolhosbenchimol.com.br/cuidados-com-a-visao-no-verao/) | Blog, Oftalmologia |
| 1860 | 2020-01-29 | [A importância de se consultar com um oftalmologista](https://clinicadeolhosbenchimol.com.br/a-importancia-de-se-consultar-com-um-oftalmologista/) | Blog, Oftalmologia |
| 1856 | 2019-11-25 | [Análise de imagem da retina promete auxiliar no diagnóstico precoce do Alzheimer](https://clinicadeolhosbenchimol.com.br/analise-de-imagem-da-retina-promete-auxiliar-no-diagnostico-precoce-do-alzheimer/) | Blog, Oftalmologia |
| 1849 | 2019-11-14 | [14 de Novembro – Dia Mundial do Diabetes](https://clinicadeolhosbenchimol.com.br/14-de-novembro-dia-mundial-do-diabetes/) | Blog, Oftalmologia |
| 1844 | 2019-08-22 | [Uveíte: Doença pouco conhecida e que preocupa](https://clinicadeolhosbenchimol.com.br/uveite-doenca-pouco-conhecida-e-que-preocupa/) | Blog, Oftalmologia |
| 1838 | 2019-08-22 | [A Tela de Amsler e a detecção precoce da degeneração macular relacionada à idade](https://clinicadeolhosbenchimol.com.br/a-tela-de-amsler-e-a-deteccao-precoce-da-degeneracao-macular-relacionada-a-idade/) | Blog, Oftalmologia |
| 1834 | 2019-07-29 | [Novo estudo indica que cirurgia de catarata e aparelhos auditivos podem prevenir a demência](https://clinicadeolhosbenchimol.com.br/novo-estudo-indica-que-cirurgia-de-catarata-e-aparelhos-auditivos-podem-prevenir-a-demencia/) | Blog, Oftalmologia |
| 1813 | 2019-07-13 | [E aí doutor, vou sentir dor?](https://clinicadeolhosbenchimol.com.br/e-ai-doutor-vou-sentir-dor/) | Blog, Oftalmologia |
| 1822 | 2019-07-10 | [Os 5 principais fatores de risco da degeneração macular e o que fazer para evitá-los](https://clinicadeolhosbenchimol.com.br/os-5-principais-fatores-de-risco-da-degeneracao-macular-e-o-que-fazer-para-evita-los/) | Blog, Oftalmologia |
| 1821 | 2019-07-04 | [Estudo aponta que cirurgia de catarata pode melhorar o glaucoma](https://clinicadeolhosbenchimol.com.br/estudo-aponta-que-cirurgia-de-catarata-pode-melhorar-o-glaucoma/) | Blog, Oftalmologia |
| 1817 | 2019-06-21 | [Você sofre de pressão alta? Cuidado! Ela pode causar trombose ocular e até mesmo cegueira!](https://clinicadeolhosbenchimol.com.br/voce-sofre-de-pressao-alta-cuidado-ela-pode-causar-trombose-ocular-e-ate-mesmo-cegueira/) | Blog, Oftalmologia |
| 1808 | 2019-06-05 | [Fique atento: saiba identificar os quatro principais sintomas da Retinopatia Diabética](https://clinicadeolhosbenchimol.com.br/fique-atento-saiba-identificar-os-quatro-principais-sintomas-da-retinopatia-diabetica/) | Blog, Oftalmologia |
| 1797 | 2019-05-31 | [Como uma alimentação correta pode evitar o aparecimento de doenças oculares como DMRI e olho seco](https://clinicadeolhosbenchimol.com.br/como-uma-alimentacao-correta-pode-evitar-o-aparecimento-de-doencas-oculares-como-dmri-e-olho-seco/) | Blog, Oftalmologia |
| 1791 | 2019-05-31 | [Aparelho mais moderno do mundo para detecção de patologias da retina chega à Clínica Benchimol](https://clinicadeolhosbenchimol.com.br/aparelho-mais-moderno-do-mundo-para-deteccao-de-patologias-da-retina-chega-a-clinica-benchimol/) | Blog, Oftalmologia |
| 1787 | 2019-05-31 | [Lentes intraoculares: uma nova tendência para corrigir problemas da visão](https://clinicadeolhosbenchimol.com.br/lentes-intraoculares-uma-nova-tendencia-para-corrigir-problemas-da-visao/) | Blog, Oftalmologia |
| 1774 | 2019-05-31 | [Injeções intravítreas: a técnica revolucionária para o tratamento de DMRI e retinopatia diabética](https://clinicadeolhosbenchimol.com.br/injecoes-intravitreas-a-tecnica-revolucionaria-para-o-tratamento-de-dmri-e-retinopatia-diabetica/) | Blog, Oftalmologia |
| 1803 | 2019-05-30 | [OCT e antiangiogênicos: o equipamento e o medicamento que atuam no combate à retinopatia diabética](https://clinicadeolhosbenchimol.com.br/oct-e-antiangiogenicos-o-equipamento-e-o-medicamento-que-atuam-no-combate-a-retinopatia-diabetica/) | Blog, Oftalmologia |
| 1769 | 2019-05-26 | [Cuidado: o diabetes também pode causar cegueira](https://clinicadeolhosbenchimol.com.br/cuidado-o-diabetes-tambem-pode-causar-cegueira/) | Oftalmologia |
| 1783 | 2019-04-24 | [Ceratocone: causas, sintomas e tratamentos](https://clinicadeolhosbenchimol.com.br/ceratocone-causas-sintomas-e-tratamentos/) | Blog, Oftalmologia |
| 1778 | 2019-04-10 | [Olho Seco: sintomas, causas e tratamento](https://clinicadeolhosbenchimol.com.br/olho-seco-sintomas-causas-e-tratamento/) | Blog, Oftalmologia |
| 1765 | 2019-03-19 | [Relacionada à Idade ou DMRI?](https://clinicadeolhosbenchimol.com.br/relacionada-a-idade-ou-dmri/) | Blog, Oftalmologia |
| 1755 | 2018-11-06 | [Cirurgia de catarata pode prolongar a vida de mulheres](https://clinicadeolhosbenchimol.com.br/cirurgia-de-catarata-pode-prolongar-a-vida-de-mulheres/) | Blog, Oftalmologia |
| 1750 | 2018-10-22 | [Glaucoma é hereditário?](https://clinicadeolhosbenchimol.com.br/glaucoma-e-hereditario/) | Blog, Oftalmologia |
| 1745 | 2018-10-22 | [Catarata: tipos, causas, fatores de risco e sintomas](https://clinicadeolhosbenchimol.com.br/catarata-tipos-causas-fatores-de-risco-e-sintomas/) | Oftalmologia |
| 1741 | 2018-10-22 | [Comer verduras pode ajudar a prevenir a degeneração macular](https://clinicadeolhosbenchimol.com.br/comer-verduras-pode-ajudar-a-prevenir-a-degeneracao-macular/) | Oftalmologia |

Elementos de template observados nos artigos: imagem destacada/alt, título, autor, data, categoria, sumário “Navegue pela Matéria”, conteúdo em seções, referências externas, links para especialidades/outros posts, CTA WhatsApp, últimas postagens, sidebar de agendamento/categorias e formulário de comentários. [Exemplo recente](https://clinicadeolhosbenchimol.com.br/o-que-e-o-mapeamento-da-retina-e-quando-esse-exame-oftalmologico-e-indicado/).

## Contatos, agendamento e integrações

Contato e horários publicados no [rodapé de Sobre Nós](https://clinicadeolhosbenchimol.com.br/sobre-nos/): WhatsApp **(21) 98560-1000**, telefones **(21) 3816-7000** e **(21) 3179-5098**, e-mail **atendimento@benchimolclinic.com.br**; segunda a quinta **08h–18h**, sexta **08h–15h**. Registro institucional **CRM/RJ 972820**, diretor técnico Dr. Sergio Benchimol, **CRM/RJ 52385073**.

Unidades na [Home](https://clinicadeolhosbenchimol.com.br/): Copacabana, **Av. N. Sra. de Copacabana, 680, 5º andar, RJ, CEP 22020-001**, referência metrô Siqueira Campos; Campo Grande, **Rua Ivo do Prado, 79, 6º andar, RJ, CEP 23080-200**, referência estação de trem. Botões “Ver mapa” apontam ao Google Maps. O link de Copacabana inclui identificador de local `cid=2260767234566661811`; Campo Grande aponta para o endereço com coordenadas `-22.9022399,-43.5649271`.

- **Observado:** CTAs “Agendar”, “Agende sua consulta” e contato para preços levam a `wa.me`; alguns links públicos usam `api.whatsapp.com`.
- **Observado:** formulário de comentário em posts com comentário, nome e e-mail obrigatórios, site opcional e checkbox de guardar dados no navegador. Não foi testado envio; a captura HTML confirmou método POST para `/wp-comments-post.php`; moderação e antispam exigem configuração. [Fonte](https://clinicadeolhosbenchimol.com.br/os-marcos-de-decadas-da-clinica-de-olhos-benchimol/).
- **Não encontrado nas páginas lidas:** formulário próprio de marcar consulta. Isso não prova ausência em todo o site.
- **Observado:** depoimentos Google via **Trustindex**, com imagens em `cdn.trustindex.io` e fotos de perfil em `lh3.googleusercontent.com`. Quantidade total e regra de atualização não confirmadas. [Home](https://clinicadeolhosbenchimol.com.br/).
- **Observado:** redes [Facebook](https://facebook.com/clinicabenchimol) e [Instagram](https://www.instagram.com/clinicadeolhosbenchimol/), além do crédito externo [MarketMed](https://www.marketmed.com.br/), no rodapé de páginas internas. [Fonte interna](https://clinicadeolhosbenchimol.com.br/retinopatia-diabetica/).
- **Confirmado adicionalmente pelo conteúdo REST:** Simply Gallery em Instalações. **Não confirmado:** analytics, pixels, consentimento de cookies, reCAPTCHA e outras integrações. Dependem de inspeção de código/network/configuração.

## SEO e comportamento a preservar

**Observado:** artigos têm slugs na raiz; há slug com underscore (`/dicas_cuidado_olhos_frio/`) e outro com sufixo `-2`. Não normalizar esses nomes silenciosamente. O slug do artigo de daltonismo termina em `-doenca/`, enquanto o título usa “deficiência ocular”.

**Observado:** título SEO pode divergir do título editorial. O artigo de janeiro/2026 é retornado como “Exame oftalmológico para a retina – Clínica de Olhos Benchimol”; o artigo de exames após os 50 anos é retornado como “Por que exames oftalmológicos são vitais após os 50 anos”. O `<title>` literal deve ser conferido no HTML de origem.

**Inferência de migração:** preservar pathname, datas de publicação, metadados SEO, alt/legendas, anchors internos, links entre posts/especialidades, categorias e documentos. Para qualquer mudança de URL, mapear redirect individual para conteúdo equivalente. Capturar `canonical`, `robots`, OG/Twitter e schema por rota antes de formular o plano definitivo. Não assumir que todos os posts são de uma categoria.

**Atualização REST:** página própria de FAQ encontrada em `/faq-perguntas-frequentes/`, ID 3067. As 81 tags possuem URLs no inventário e o crawl as capturou. Não confirmado: política de privacidade, termos, página própria de Contato, arquivos de autor/data, feeds RSS e rotas específicas de anexos. Não encontrar via menu/busca não demonstra inexistência.

## Riscos de conteúdo perdido e pontos para validação

1. **Conteúdo fora da primeira página do blog:** o REST publicado preserva material desde 2018; migrar apenas os seis cards iniciais perde o acervo antigo.
2. **Bios antigas e documentos:** páginas fora do menu e PDFs de currículo continuam indexados. Mapear catálogo de páginas/mídias + crawl de links, não apenas menu atual.
3. **Cadastro profissional divergente:** [Equipe](https://clinicadeolhosbenchimol.com.br/equipe/) mostra Adriana com CRM-RJ **52.70353-2**; [bio antiga](https://clinicadeolhosbenchimol.com.br/dra-adriana-benchimol/) mostra **52559013**. O segundo coincide com o número de Amir no elenco. Observação de inconsistência, não autorização para escolher/corrigir o número; obter fonte clínica validada.
4. **Informações históricas com números diferentes:** a Home usa 80 anos no destaque e 79 anos na apresentação; posts/bios podem conter números ou informações de épocas distintas. Manter snapshot e submeter ajustes editoriais explicitamente.
5. **Artefatos de markup antigo:** textos de 2022 exibem `n`/`nn` avulsos e alguns posts contêm headings/espaçamentos irregulares. Definir tratamento de limpeza com rastreabilidade, sem cortar parágrafos.
6. **Comentários e sumário:** substituir template por simples texto perde comentários, anchors, navegação e CTAs. Validar necessidade de continuidade da funcionalidade, sem enviar comentários reais durante QA.
7. **Avaliações externas:** conteúdo Trustindex é dinâmico e tem fotos de perfil externas. Não tratar a captura de depoimentos como catálogo permanente completo.
8. **Links inconsistentes:** Especialidades associa Telemedicina à Home e Mapeamento de Retina à bio Adriana; esses destinos foram observados, porém precisam de decisão editorial antes de “corrigir” na migração.
9. **Categorias/arquivos SEO:** manter ou mapear URLs `/category/blog/` e `/category/oftalmologia/`; verificar páginas de paginação, autores, tags, feeds e anexos na coleta completa.
10. **Rota e redirects:** conferir protocolo/host, slash final, URLs antigas e recursos `/wp-content/uploads/` por GET. Este agente não estabeleceu códigos 301/302 reais.

## Próxima verificação mínima para fechar inventário

A captura REST pública de posts/páginas/categorias/tags já coincide com os totais reportados. Ainda é necessário reconciliar os 24 registros de mídia ausentes no snapshot, confrontar sitemap(s), investigar URLs adicionais de links legados e validar 404 reais/redirects intermediários. Registrar bytes/URLs dos documentos e mídia que serão mantidos, comentários existentes e configuração de seus formulários. Conteúdo privado, rascunhos, revisões, campos Elementor e configurações/plugins normalmente exigem export ou acesso administrativo autorizado — a disponibilidade pública desses dados não foi confirmada aqui.

## Atualização REST — classificação clínica e candidatos alheios

Fonte: captura do agente principal em `baseline-2026-09-30/`, manifesto `captured_at_utc=2026-09-30T11:38:37.211068+00:00`; arquivos `posts.json`, `pages.json`, `categories.json`, `tags.json`, `media.json` e `routes.json`. Somente leitura, sem excluir ou reclassificar objetos remotos.

| Conjunto | Observado no snapshot | Classificação para revisão |
|---|---|---|
| Posts | 154 publicados, 154 capturados | 154 títulos compatíveis com saúde ocular/clínica; nenhum candidato de jogos encontrado entre os posts publicados |
| Páginas | 38 publicadas | 37 clínicas/institucionais; 1 Sample Page padrão do WordPress, candidata a omissão editorial |
| Categorias | 10 | 2 clínicas; 8 de jogos/recompensas, candidatas alheias à clínica |
| Tags | 81 | 22 clínicas/institucionais; 59 de jogos/recompensas, candidatas alheias à clínica |
| Mídia | API reporta 551; arquivo contém 527 | Inventário incompleto; 24 registros ainda precisam ser reconciliados |

**Categorias:** Blog ID7 contém 123 posts, Oftalmologia ID1 contém 128. Interseção 97; somente Oftalmologia 31; somente Blog 26; união 154. As oito categorias abaixo têm `count=0`, e nenhum dos 154 posts usa seus IDs.

| ID | Nome/URL | count |
|---|---|---|
| 60 | [bingo bash free chips](https://clinicadeolhosbenchimol.com.br/category/bingo-bash-free-chips/) | 0 |
| 75 | [bingo drive free credits](https://clinicadeolhosbenchimol.com.br/category/bingo-drive-free-credits/) | 0 |
| 16 | [board kings free gems diamonds](https://clinicadeolhosbenchimol.com.br/category/board-kings-free-gems-diamonds/) | 0 |
| 38 | [coin master free spins](https://clinicadeolhosbenchimol.com.br/category/coin-master-free-spins/) | 0 |
| 79 | [Dice Dreams free rolls hack Deutsch](https://clinicadeolhosbenchimol.com.br/category/dice-dreams-free-rolls-hack-deutsch/) | 0 |
| 64 | [family island free energy](https://clinicadeolhosbenchimol.com.br/category/family-island-free-energy/) | 0 |
| 49 | [gaminator bonus coins](https://clinicadeolhosbenchimol.com.br/category/gaminator-bonus-coins/) | 0 |
| 27 | [solitaire grand harvest free coins](https://clinicadeolhosbenchimol.com.br/category/solitaire-grand-harvest-free-coins/) | 0 |

**Tags candidatas:** todas as 59 possuem `count=0`; nenhum dos 154 posts referencia seus IDs. Correspondem a bingo bash, bingo drive, board kings, coin master, Dice Dreams, family island, gaminator, solitaire grand harvest e termos de free coins ligados a gamehunters/levvvel/mosttechs. Registro exato de nomes/IDs preservado em `tags.json`. Tags de jogos são os IDs menores que 80 presentes nessa captura; usar essa regra apenas para identificar este snapshot, nunca como heurística permanente.

**Publicação SEO observada:** as 67 URLs dessas taxonomias (8 categorias + 59 tags) retornaram status final 200, canonical próprio e robots `index, follow` na captura. Mesmo com zero posts, os nomes de jogos são servidos sob a marca da clínica, por exemplo [bingo bash](https://clinicadeolhosbenchimol.com.br/category/bingo-bash-free-chips/).

**Limite da conclusão:** os termos são alheios ao propósito aparente do site e justificam revisão administrativa; não demonstram, por si, invasão nem autoria/origem. A triagem de títulos de todos os 154 posts e de termos específicos no texto renderizado de posts/páginas não encontrou conteúdo de jogos/casino. Isso não audita banco privado, plugins, arquivos PHP, logs ou conteúdo condicional. Scripts identificados no conteúdo de páginas correspondem ao loader Trustindex na Home e ao Simply Gallery em Instalações; a mera presença de script/markup oculto não foi tratada como prova de comprometimento. Preservar evidência e decidir explicitamente o destino dos termos antes de importá-los ao site novo.

**Datas por ano:** 2018:4; 2019:19; 2020:50; 2021:21; 2022:10; 2023:11; 2024:14; 2025:24; 2026:1. Todos os registros têm `status=publish` na resposta pública.

## Páginas REST completas — 38 registros

| ID | Título/URL | Slug REST |
|---|---|---|
| 3416 | [Convênios](https://clinicadeolhosbenchimol.com.br/convenios/) | `convenios` |
| 3368 | [Dr. Gabriel Benchimol](https://clinicadeolhosbenchimol.com.br/dr-gabriel-benchimol/) | `dr-gabriel-benchimol` |
| 3357 | [Dr. Raphael Lima Benchimol](https://clinicadeolhosbenchimol.com.br/dr-raphael-lima-benchimol/) | `dr-raphael-lima-benchimol` |
| 3342 | [Dra. Veronica Benchimol](https://clinicadeolhosbenchimol.com.br/dra-veronica-benchimol/) | `dra-veronica-benchimol` |
| 3300 | [Dr. Sergio Benchimol](https://clinicadeolhosbenchimol.com.br/dr-sergio-benchimol/) | `dr-sergio-benchimol` |
| 3241 | [Olho Seco](https://clinicadeolhosbenchimol.com.br/olho-seco/) | `olho-seco` |
| 3216 | [Cirurgia Refrativa](https://clinicadeolhosbenchimol.com.br/cirurgia-refrativa/) | `cirurgia-refrativa` |
| 3205 | [Glaucoma](https://clinicadeolhosbenchimol.com.br/glaucoma/) | `glaucoma` |
| 3198 | [Degeneração Macular Relacionada à Idade – DMRI](https://clinicadeolhosbenchimol.com.br/degeneracao-macular/) | `degeneracao-macular` |
| 3167 | [Retinopatia Diabética](https://clinicadeolhosbenchimol.com.br/retinopatia-diabetica/) | `retinopatia-diabetica` |
| 3156 | [Catarata](https://clinicadeolhosbenchimol.com.br/catarata/) | `catarata` |
| 3138 | [Exames e Procedimentos](https://clinicadeolhosbenchimol.com.br/exames-e-procedimentos/) | `exames-e-procedimentos` |
| 3067 | [FAQ – Dúvidas Frequentes](https://clinicadeolhosbenchimol.com.br/faq-perguntas-frequentes/) | `faq-perguntas-frequentes` |
| 2889 | [Equipe](https://clinicadeolhosbenchimol.com.br/equipe/) | `equipe` |
| 2876 | [Serviços](https://clinicadeolhosbenchimol.com.br/servicos/) | `servicos` |
| 2843 | [Sobre Nós](https://clinicadeolhosbenchimol.com.br/sobre-nos/) | `sobre-nos` |
| 2735 | [Home](https://clinicadeolhosbenchimol.com.br/) | `nova-home` |
| 1409 | [Internacional](https://clinicadeolhosbenchimol.com.br/insternacional/) | `insternacional` |
| 1095 | [Especialidades](https://clinicadeolhosbenchimol.com.br/especialidades/) | `especialidades` |
| 1079 | [certificações](https://clinicadeolhosbenchimol.com.br/certificacoes/) | `certificacoes` |
| 996 | [Equipamentos](https://clinicadeolhosbenchimol.com.br/equipamentos/) | `equipamentos` |
| 919 | [Instalações](https://clinicadeolhosbenchimol.com.br/instalacoes/) | `instalacoes` |
| 903 | [Dra. Francine Campos Hauck](https://clinicadeolhosbenchimol.com.br/dra-francine-campos-hauck/) | `dra-francine-campos-hauck` |
| 902 | [Dr. Paulo de Heráclito Lima Filho](https://clinicadeolhosbenchimol.com.br/dr-paulo-de-heraclito-lima-filho/) | `dr-paulo-de-heraclito-lima-filho` |
| 894 | [Dra. Dilma de Sá Cavalcanti do Vale](https://clinicadeolhosbenchimol.com.br/dra-dilma-de-sa-cavalcanti-do-vale/) | `dra-dilma-de-sa-cavalcanti-do-vale` |
| 886 | [Dra. Mônica de Oliveira Coelho](https://clinicadeolhosbenchimol.com.br/dra-monica-de-oliveira-coelho/) | `dra-monica-de-oliveira-coelho` |
| 875 | [Dra. Amélia Gomes de Souza](https://clinicadeolhosbenchimol.com.br/dra-amelia-gomes-de-souza/) | `dra-amelia-gomes-de-souza` |
| 857 | [Dr. Eduardo Lessa Martinez](https://clinicadeolhosbenchimol.com.br/dr-eduardo-lessa-martinez/) | `dr-eduardo-lessa-martinez` |
| 846 | [Dr. Amir Zisman](https://clinicadeolhosbenchimol.com.br/dr-amir-zisman/) | `dr-amir-zisman` |
| 834 | [Dr. Luciano Galhardo de Barros](https://clinicadeolhosbenchimol.com.br/dr-luciano-galhardo-de-barros/) | `dr-luciano-galhardo-de-barros` |
| 810 | [Dr. Eliezer Benchimol](https://clinicadeolhosbenchimol.com.br/dr-eliezer-benchimol/) | `dr-eliezer-benchimol` |
| 798 | [Dra. Liana Benchimol](https://clinicadeolhosbenchimol.com.br/dra-liana-benchimol/) | `dra-liana-benchimol` |
| 781 | [Dra. Adriana Benchimol](https://clinicadeolhosbenchimol.com.br/dra-adriana-benchimol/) | `dra-adriana-benchimol` |
| 770 | [Dra. Mirelle Benchimol](https://clinicadeolhosbenchimol.com.br/dra-mirelle-benchimol/) | `dra-mirelle-benchimol` |
| 762 | [Dra. Nina Benchimol](https://clinicadeolhosbenchimol.com.br/dra-nina-benchimol/) | `dra-nina-benchimol` |
| 659 | [Dr. Sérgio Benchimol](https://clinicadeolhosbenchimol.com.br/dr-sergio-benchimol-old/) | `dr-sergio-benchimol-old` |
| 307 | [Blog](https://clinicadeolhosbenchimol.com.br/blog/) | `blog` |
| 2 | [Sample Page](https://clinicadeolhosbenchimol.com.br/sample-page/) | `sample-page` |

A página Home tem slug REST `nova-home`, ID2735, mas seu link público é `/`. A página Internacional usa o slug publicado com erro de grafia `insternacional`; preservar ou mapear conscientemente. `/dr-sergio-benchimol-old/` permanece publicada junto da biografia nova. A Sample Page ID2 é texto demonstrativo em inglês, sem relação clínica; não foi removida.

## Conflitos de URL, aliases e metadados capturados

- Post **ID34** e página **ID3216** usam ambos `/cirurgia-refrativa/`, slug `cirurgia-refrativa` e título “Cirurgia Refrativa”. Os 192 registros de posts+páginas correspondem a **191 links distintos**. A implementação precisa resolver esse conflito com base no conteúdo servido atualmente e preservar o registro antigo no export; não criar duas rotas concorrentes nem descartar dados silenciosamente.
- Três pares de títulos iguais com slugs distintos: Cuidados com os olhos no verão (IDs2363/26); Hipermetropia (IDs25/1935); cuidados após cirurgia de catarata (IDs1963/1959). Títulos iguais não são prova de conteúdo duplicado.
- Destinos de redirects observados no `routes.json` (status final 200; códigos intermediários não estabelecidos nesta análise):

| Entrada | Destino final |
|---|---|
| `/convenios-nv` | `/convenios/` |
| `/glaucoma` | `/glaucoma/` |
| `/olho-seco` | `/olho-seco/` |
| `/por-que-piscamos-os-olhos/` | `/por-que-piscamos-os-olhos-2/` |
| `/servicos-nv/` | `/servicos/` |
| `/voce-sabe-quais-os-cuidados-basicos-apos-a-realizacao-da-cirurgia-de-catarata/` | `/voce-sabe-quais-os-cuidados-basicos-apos-a-realizacao-da-cirurgia-de-catarata-2/` |

Dos 191 links distintos de posts/páginas confrontados: canonical presente e igual ao destino final em191; robots index/follow em191; OG title/description em191; OG image em188; Twitter card em191; meta description dedicada em66. Esses números descrevem o snapshot e não são recomendação para copiar metadados ausentes. JSON-LD e respostas 404 reais exigem verificação separada.

## Arquivos e conteúdo legado adicional

Entre os 527 objetos de mídia capturados há **12 PDFs**, **135 JPEGs**, **79 PNGs**, **289 WebPs** e **12 SVGs**. Não foram baixados os bytes de imagem/PDF por este agente. Os PDFs incluem currículo de Veronica, cartas/convites/certificados de visitas médicas e confirmações de sociedades; preservar source URLs e documentos necessários.

| ID | PDF público |
|---|---|
| 733 | [Curriculum Veronica Benchimol](https://clinicadeolhosbenchimol.com.br/wp-content/uploads/2023/02/Curriculum-Veronica-Benchimol.pdf) |
| 720 | [Certificado ASRS](https://clinicadeolhosbenchimol.com.br/wp-content/uploads/2023/02/Certificado-ASRS.pdf) |
| 716 | [Carta_confirmação_Membro_Sociedade_Europeia_de_Retina](https://clinicadeolhosbenchimol.com.br/wp-content/uploads/2023/02/Carta_confirmacao_Membro_Sociedade_Europeia_de_Retina-1.pdf) |
| 712 | [Carta da Visita ao Anne Bates Leach Eye Hospital – Bascom Palmer Eye Institute](https://clinicadeolhosbenchimol.com.br/wp-content/uploads/2023/02/Carta-da-Visita-ao-Anne-Bates-Leach-Eye-Hospital-Bascom-Palmer-Eye-Institute.pdf) |
| 708 | [Carta de Visita ao Hospital Mimiya em Puerto Rico](https://clinicadeolhosbenchimol.com.br/wp-content/uploads/2023/02/Carta-de-Visita-ao-Hospital-Mimiya-em-Puerto-Rico.pdf) |
| 704 | [Carta de Visita ao Wilmer Institute of the Johns Hopkins University and Hospital](https://clinicadeolhosbenchimol.com.br/wp-content/uploads/2023/02/Carta-de-Visita-ao-Wilmer-Institute-of-the-Johns-Hopkins-University-and-Hospital.pdf) |
| 700 | [Carta_do_término_do_programa_de_residência_em_oftalmologia](https://clinicadeolhosbenchimol.com.br/wp-content/uploads/2023/02/Carta_do_termino_do_programa_de_residencia_em_oftalmologia.pdf) |
| 696 | [Certificado Visita Eye Research Institute od Retina Foundation Boston Massachusetts 1984](https://clinicadeolhosbenchimol.com.br/wp-content/uploads/2023/02/Certificado-Visita-Eye-Research-Institute-od-Retina-Foundation-Boston-Massachusetts-1984.pdf) |
| 692 | [Certificado de Visita ao Duke University Medical Center](https://clinicadeolhosbenchimol.com.br/wp-content/uploads/2023/02/Certificado-de-Visita-ao-Duke-University-Medical-Center.pdf) |
| 688 | [Carta Convite para Visita ao Wilmer Institute da John Hopkins University and Hospital em Porto Rico 1984](https://clinicadeolhosbenchimol.com.br/wp-content/uploads/2023/02/Carta-Convite-para-Visita-ao-Wilmer-Institute-da-John-Hopkins-University-and-Hospital-em-Porto-Rico-1984.pdf) |
| 681 | [Carta Convite para Visita ao Duke University Medical Center em 1984](https://clinicadeolhosbenchimol.com.br/wp-content/uploads/2023/02/Carta-Convite-para-Visita-ao-Duke-University-Medical-Center-em-1984.pdf) |
| 673 | [Carta_confirmação_Membro_Sociedade_Europeia_de_Retina](https://clinicadeolhosbenchimol.com.br/wp-content/uploads/2023/02/Carta_confirmacao_Membro_Sociedade_Europeia_de_Retina.pdf) |

Links e imagens de conteúdo ainda referenciam `www.benchimolclinic.com.br`, `www.clinicadeolhosbenchimol.com.br`, `clinicabenchimol.com.br` e `static.wixstatic.com`. Esses hosts precisam de mapeamento/checagem de disponibilidade; não substituir por inferência. `/instalacoes/` usa galeria Simply Gallery com imagens e duas seções de unidades, que perderia comportamento ao se importar só o texto.
