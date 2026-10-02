# Auditoria inicial do site público

**Data:** 30/09/2026, timezone de trabalho America/Sao_Paulo. Origem: [clinicadeolhosbenchimol.com.br](https://clinicadeolhosbenchimol.com.br/). Somente leitura pública, sem login e sem submissão de formulários. Nenhuma alteração no WordPress.

## Cobertura e evidência

Coleta por GET de Home, robots, índice de sitemaps, cinco sitemaps referenciados, índice REST e listas paginadas de posts/páginas/termos/mídias. Sementes provenientes dessas fontes e links da Home produziram **289 URLs solicitadas**, com corpo e headers preservados. Todas terminaram em HTTP 200; isso não prova que todas são páginas válidas, pois soft 404 precisam de análise de conteúdo.

Não foi um crawler recursivo de toda URL/link/paginação possível. Capturou HTML/API/XML e CSS, mas não bytes de imagens/PDFs/vídeos ou todas as fontes/assets. Não acessou rascunhos, privados, backup, configuração interna ou export Elementor. A referência visual correta ainda depende dos artefatos Elementor.

| Tipo | API informa | Coletado | Limite |
|---|---:|---:|---|
| Posts publicados | 154 | 154 | Rascunhos/privados/revisões não incluídos |
| Páginas públicas | 38 | 38 | Inclui Sample Page e páginas antigas |
| Categorias | 10 | 10 | 8 sem uso e alheias ao tema |
| Tags | 81 | 81 | 59 sem uso e relacionadas a jogos |
| Mídias | 551 | 527 IDs únicos | 24 faltantes; bytes/variantes não coletados |
| Galerias | 2 | 2 | Configuração exportada ainda necessária |
| Comentários aprovados | 1 | 1 amostra | Não inclui fila privada/moderação |

Faixa de publicação dos posts: **22/10/2018 a 07/01/2026**, conforme campo `date` retornado pelo WordPress, cuja timezone interna ainda deve ser confirmada. O inventário preserva também `date_gmt`; não confundir horário do servidor com horário de edição.

Arquivos: [manifest.json](baseline-2026-09-30/manifest.json), [posts.csv](posts.csv), [pages.csv](pages.csv), [routes.csv](routes.csv), [media.csv](media.csv), [redirects.csv](redirects.csv). Relatório completo de títulos, páginas e PDFs: [public-inventory-agent.md](public-inventory-agent.md). As respostas adicionais de galerias/comentário estão em `baseline-2026-09-30/api/`.

Fontes públicas de contagem: [posts REST](https://clinicadeolhosbenchimol.com.br/wp-json/wp/v2/posts?per_page=100), [páginas REST](https://clinicadeolhosbenchimol.com.br/wp-json/wp/v2/pages?per_page=100), [mídias REST](https://clinicadeolhosbenchimol.com.br/wp-json/wp/v2/media?per_page=100), [sitemap](https://clinicadeolhosbenchimol.com.br/sitemap_index.xml). Contagem total vem dos headers `X-WP-Total`; não da quantidade de cards da Home.

## Navegação e páginas além do menu

Menu observado: Home, Sobre Nós, Equipe, Especialidades, Exames, Serviços, Convênios e Blog. Especialidades tem Catarata, Retinopatia diabética, Glaucoma, Degeneração Macular, Olho seco e Cirurgia refrativa. Exames usa `/exames-e-procedimentos/`, não `/exames/`.

Há página de FAQ, instalações, equipamentos, certificações, uma página internacional com slug legado `/insternacional/`, bios de médicos fora do menu e bio antiga de Sergio. Há dois registros de galeria. A rota Sample Page é conteúdo padrão que exige decisão, não exclusão automática.

Home: apresentação/história, serviços, depoimentos Trustindex, CTA WhatsApp, unidades/Maps, FAQ em acordeão, três posts recentes, convênios e contato. Blog possui listagem e paginação/carregamento adicional; posts têm formulário de comentário. Estados mobile/menu/galeria completos devem ser capturados no layout Elementor restaurado/validado.

## Contato e unidades

- Copacabana: Av. N. Sra. de Copacabana, 680, 5º andar, CEP 22020-001; referência ao metrô Siqueira Campos.
- Campo Grande: Rua Ivo do Prado, 79, 6º andar, CEP 23080-200; referência à estação de trem.
- Fixos públicos: `(21) 3816-7000` e `(21) 3179-5098`.
- WhatsApp: `(21) 98560-1000`, normalizado `5521985601000`.
- Mensagem pré-preenchida atual: “Olá, encontrei o site da Clínica de Olhos Benchimol em uma busca e gostaria de mais informações”.
- Links Google Maps específicos de cada unidade; preservar destino correto, não usar uma localização genérica.

Esses dados são observados, não recém-validados pela clínica. Diretor técnico e CRMs aparecem no conteúdo; qualquer correção precisa de confirmação.

## Integrações/dependências observadas

HTML/API indicam Elementor/Hello Elementor, Yoast, LiteSpeed, Trustindex, Click to Chat, Popup Maker, Burst Statistics, galerias Simply Gallery e plugin Redirection, entre outros namespaces. A presença no índice API não prova uso de cada plugin em cada página; export autenticado fechará a lista efetiva.

Trustindex usa assets próprios e fotos Google externas. Também existem assets de `static.wixstatic.com`; o acervo não está todo em uploads WordPress. Foram identificados **12 PDFs** públicos de currículos, cartas/certificados. Ver relatório completo e manifesto.

## Achados que afetam a migração

1. **Visual:** Home aberta no navegador em 1280×720 mostrou “Home”, fontes de sistema e seções em sequência, com aparência simplificada. O CSS agregado referenciado respondeu 200; a causa dessa renderização não foi determinada. Gabriel confirmou que o alvo é o **layout completo esperado do Elementor**, portanto esse estado simplificado não define a réplica. Obter export e capturas corretas antes de implementar.
2. **Colisão de registros:** post WP 34 e página WP 3216 têm a mesma URL `/cirurgia-refrativa/`. São 192 registros post/página e 191 URLs distintas. A página é servida atualmente; preservar os dois corpos e decidir destino do post antigo sem sobrescrita.
3. **Aliases de artigos:** 154 links de posts resolvem 152 destinos distintos por redirects; três pares de títulos repetidos não autorizam deduplicação por título. Manter mapa por ID e URL.
4. **Mídia incompleta:** páginas REST entregaram menos itens que o total anunciado; não inferir que os 24 faltantes são desnecessários ou explicar a causa sem acesso autenticado. Metadados de 526 itens somam 102.999.087 bytes (~98,2 MiB) de originais, excluindo volume desconhecido de variantes/faltantes.
5. **Termos alheios:** 8 categorias e 59 tags relacionadas a jogos/chips, com count zero e sem referência pelos posts coletados. Essas 67 rotas responderam 200 com canonical próprio e `index, follow`. Pode haver resíduo indevido; **não foi determinada a origem nem comprovada invasão**. Não importar/retirar automaticamente sem decisão.
6. **Divergência médica:** CRM de Adriana difere entre `/equipe/` e bio antiga. Preservar evidência, obter fonte clínica e aprovação; não padronizar por inferência.
7. **SEO:** Yoast fornece canonicals e OG. Meta descriptions faltam em parte das rotas, inclusive Home. Há oportunidades técnicas/editoriais a propor; não reescrever o site na migração sem aprovação.
8. **Links legados:** FAQ da Home aponta aliases `convenios-nv` e `servicos-nv`; redirects observados constam no CSV. Há links `edit post` para wp-admin expostos no HTML público; não transportar esses controles ao novo site público.
9. **Popup e comentários:** origem usa plugin de popup e tem mídias com nomes de avisos/feriados. Briefing pede popup de texto novo; exportar configuração visual/periodicidade. Formulário de comentário existente exige decisão de continuidade/moderação.

## O que abrir o link não permite provar

Fidelidade do layout Elementor completo; total de privados/rascunhos; completude dos uploads; SEO do plugin além do HTML; redirects não referenciados; versões/licenças/configurações; métricas históricas; contas/roles; backups restauráveis; volume de tráfego ou capacidade de plano gratuito. Essas dependências constam em [client-inputs.md](../discovery/client-inputs.md).
