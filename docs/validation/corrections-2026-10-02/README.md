# Correções da auditoria — 02/10/2026

Gabriel pediu “Aplique as correções” após as seis revisões. Os patches técnicos estão no código local, com ajuste restrito no Supabase exclusivo `jjrzmuuwuvxcsnwqzvxf`. O relatório original de [auditoria](../audit-2026-10-01/README.md) descreve o estado anterior. Não houve Docker, merge, push ou deploy, nem início/parada/reinício manual do servidor pelo agente. Gabriel mantém o dev na porta3000; o Next recarregou os arquivos/configuração.

## Correções efetivas

| Área | Resultado e evidência |
|---|---|
| Rastreamento Google/IA | Exceção estrita de robots para `/api/media/`; APIs/admin privados e treinamento mantêm restrições. Permissão de prévia grande de imagem, WebSite na Home, organização médica e duas unidades com endereços reais; breadcrumb interno. [SEO/IA](seo-ai.md) |
| HTML inicial | Aviso vigente tem o mesmo título/texto no dialog SSR e em noscript; sessão/agenda/hidratação preservadas. Nenhum aviso real ativado para testar. |
| SEO importado | 118 registros/117 URLs canônicas reconciliados por WP ID/hash/version1/SEO anterior exato. Somente campos SEO mudaram; textos novos do admin continuam literais. [Executor e contrato](clinic-executor.md) |
| Privilégios SQL | Migration05 aplicada na clínica; anônimo conserva apenas leituras públicas com RLS; admin mantém colunas/RPCs necessários. TRUNCATE/TRIGGER/REFERENCES/MAINTAIN retirados dos três papéis de cliente, incluindo132 concessões efetivas anteriores. Defaults da aplicação restritos; ACLs existentes Auth/Storage preservadas. [Segurança](security.md) |
| Headers | nosniff, políticas de referência/permissões e proteção contra iframe do admin. CSP ampla em Report-Only; anti-framing do admin é obrigatório. Cache imutável somente para CSS/imagens derivados com hash. |
| Uploads | Decode integral de quatro formatos com limite10MB,8192px/lado,20 milhões de pixels somando quadros,100frames e timeout10s. Truncamento/MIME/corrupção/lixo após container recusados; bytes originais e GIF animado preservados. Dimensões consideram EXIF. |
| Manutenção | Comando manual de expurgo com plano por padrão, ref/hash exatos, carência4h, proteção de vínculos/histórico e locks; sem scheduler/endpoint. Plano hospedado encontrou zero candidatos, nenhuma exclusão. Storage e SQL não são atômicos. |
| Imagens públicas | Banner WebP lossless com RGBA idêntico:1.309.507→848.150 B, redução35,23%. Dimensões reais em1024 arquivos, capa prioritária/preload, srcset sem recortes incompatíveis e espaço da sidebar reservado desde o primeiro render. [Performance](performance.md) |
| CSS/consultas | Remoção AST somente de duplicação idêntica/contexto igual e compactação validada;45 entradas por hash com manifesto atômico, hashes antigos preservados. Home2.292.204→1.940.707 B bruto (-15,33%); Brotli offline186.659→173.540 B (-7,03%). Taxonomias consultam só IDs e têm cache por request. |
| Repositório | Originais, fontes, dados privados e evidências históricas preservados. Limpeza anterior removeu14 arquivos regeneráveis; nesta rodada não se apagaram assets legados ou fixtures Docker. Docs, runbooks e biblioteca de prompts0.11 atualizados. |

## Banco: preservação e limites

O plano somente leitura confirmou API/ref/PostgreSQL e TLS autorizado antes da alteração. SQL da migration05 e schema05 tinham SHA-256 idêntico; histórico inicial foi comparado à fonte exata. Hash aprovado incluiu conteúdo, catálogo e plano de reparo. Backup privado0600 dentro de diretório0700 antes da gravação. O executor usou transação/locks, suspendeu apenas `audit_post_change` durante o reparo e reativou antes do commit.

[Execução](clinic-execution-2026-10-02T04-17-34-160Z.json):118 reparos, migration05 registrada, bodies/datas/versões preservados por SHA-256 de todos os campos de posts excetoSEO; demais11 relações da aplicação com contagem/hash iguais. Policies, RLS12/12, triggers, definições de funções e permissões existentes dos schemas geridos preservados. Nenhum usuário/Auth/senha/Storage bytes alterado. Conteúdo inicial:154 registros/153 URLs canônicas/551 mídias/dois redirects, settingsv1. O reparo recusa versão1 divergente e preserva posts já editados na versão2 ou superior.

**Recarregue qualquer tela de edição aberta antes do reparo de SEO**, pois versões editoriais foram preservadas e uma aba antiga pode reenviar seus metadados antigos. Não repetir inicialização/reimportação para resolver isso. Os scripts não usam perfil MCP/CLI que aponta para LifeWallet.

## Validação

As provas da suíte completa, typecheck, HTTP posterior e probes hospedados são reunidas em [summary.json](summary.json). A suíte integral passou com **301 testes em 51 arquivos**, exit 0, 285,60s. A primeira rodada teve cinco falhas nos depoimentos; a causa, correção e 27 testes focados posteriores foram preservados. **Typecheck passou com exit 0** após ajustar a tipagem de fixtures/callbacks em três arquivos de teste, sem mudança de runtime. Todos os 15 testes afetados também passaram no reteste focado. [Log final de tipos](typecheck.log), [reteste de performance](performance-typecheck-fix-tests.log) e [reteste SEO](seo-typecheck-fix-tests.log). Testes iniciais e medições transitórias permanecem em arquivos separados.

- Inventário íntegro:154 posts,38 páginas,551 mídias e1.377 assets, zero erro em [inventory.json](inventory.json).
- Quatro famílias públicas em390/768/1440px:12/12 sem overflow e fontes/cores/display iguais. Na coleta de estabilização, Home/galeria mantiveram caixas iguais; blog/artigo passaram a reservar espaço mesmo com imagens ainda não carregadas. [Medidas](visual-stable.json), [comparação](visual-stable-comparison.json) e capturas em `screenshots/`. Essa coleta antecede a correção do guard de depoimentos: a Home final tem altura maior, pois recupera datas/quebras/controles da captura original. O suplemento [reviews-ui.json](reviews-ui.json) confirma os cinco controles, oito datas, quebras esperadas e ausência de overflow nas três larguras; [expansão/recolhimento pelo teclado](review-controls-ui.json) também passou. Não se afirma igualdade de caixas entre a Home com a regressão e a versão restaurada.
- Compactação CSS isolada teve11/12 amostras com caixas iguais; o artigo desktop inicialmente medido antes da imagem terminar voltou à medida original após carga. A estabilização posterior corrige esse salto, sem prometer CLS medido. As fontes de srcset respeitam proporção; arredondamentos podem produzir diferenças inferiores a1px.
- Menu móvel, FAQ expandir/fechar, miniatura/lightbox/fechar galeria e Blog6→9 passaram. A primeira leitura imediatamente após Carregar Mais ocorreu antes da resposta; reteste aguardou o nono título visível. [Checks manuais](ui-checks.json). Não corresponde a repetir toda a QA autenticada anterior.
- [HTTP posterior](http.json):22/22 checks passaram, incluindo leitura SSR dos depoimentos, metadados reparados, rotas privadas recusadas e bytes/cache imutável dos dois derivados. [Verificação hospedada posterior](clinic-verification-2026-10-02T04-23-38-611Z.json):11 checks SDK/SQL passaram; fixtures SQL revertidas, zero login real/conta/bytes Storage criados e todas12 relações iguais após rollback. CRUD de metadados de mídia não substitui um novo upload de bytes pelo navegador.
- A ponte canônica do projeto e a nota existente no Brain foram atualizadas e conferidas byte a byte, com hash anterior verificado antes da substituição atômica. [Prova de sincronização](brain-sync.json). Nenhum resultado local foi promovido a projeto publicado ou ganho profissional comprovado.
- Revisão independente final sem inconsistências materiais; conferência local verificou20 hashes de evidências,107 links e o espelho do Brain. [Prova documental](documentation-review.json).
- Não se fez build concorrente ao dev. O build HUHe é histórico; recompilar antes de `next start` ou publicação manual.

## Dependências reais restantes

- Autoria/revisão médica, CEP/domínio do Perfil da Empresa e destino de `/sample-page/` precisam de confirmação clínica/editorial; não foram inventados ou alterados.
- Proteção do endpoint direto Supabase Auth exige revisar limites/controles no provedor. CAPTCHA/MFA demandam configuração e fluxos completos antes de exigir desafio; não estão ativos nem foram simulados como proteção existente. [Checklist](security.md#sec-02-controles-dependentes-do-provedor).
- Políticas Google-Extended/Bing mantidas por privacidade; não há norma universal de IA nem promessa de citação/ranking. llms.txt é complementar.
- Sem URL Next publicada, PageSpeed/Lighthouse de produção, CWV, Search Console, rich results, crawlers/CDN/WAF e comportamento Vercel continuam sem prova. Elegibilidade comercial da hospedagem gratuita continua pendente. Publicação exclusivamente por Gabriel.
