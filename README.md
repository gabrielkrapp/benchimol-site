# Clínica de Olhos Benchimol

Projeto freelancer de Gabriel Krapp. Migração do [site WordPress/Elementor](https://clinicadeolhosbenchimol.com.br/) para uma aplicação moderna, preservando aparência, textos, imagens, URLs e funcionalidades públicas, com administração simples de conteúdo.

**Estado técnico em 02/10/2026:** aplicação Next.js oficial/TypeScript/App Router implementada conforme spec v0.9, com QA manual editorial anterior restaurada e correções da auditoria aplicadas. **301 testes em 51 arquivos e typecheck passaram**; os 15 testes que receberam ajuste posterior de tipagem também foram retestados com sucesso. Site, admin e APIs no mesmo projeto; Supabase exclusivo da clínica pelo Marketplace já inicializado/importado, com cadastro público desabilitado. Captura restaurada/WXR público reconciliados. Nenhum deploy executado. A integração GitHub tem autorização específica registrada abaixo. Nenhuma conta/senha real criada pelo agente. Não há assinatura/pagamento comprovados nesta documentação.

**Patches posteriores ao build HUHe:** login local reconhece `localhost` e `127.0.0.1` na mesma porta/protocolo; editor, texto/SEO e confirmação de publicação têm correções comprovadas. [Origem do login](docs/validation/login-origin-fix.md) e [QA manual completa](docs/validation/hosted-manual-qa.md). Build/pacote servidor/HTTP amplo HUHe são evidências históricas e não comprovam esses patches; recompilar antes de usar `next start` ou publicar manualmente. O servidor local atual é iniciado e controlado por Gabriel.

**Acesso da clínica confirmado:** Gabriel criou `benchimol@benchimolclinic.com.br` e autorizou especificamente seu vínculo ativo em `administrators`, aplicado somente no Supabase da clínica. Login, dashboard com 153 publicados, persistência por recarga e logout passaram no servidor local de Gabriel; senha e conteúdo preservados. [Provas de acesso](docs/validation/clinic-admin-login.md). A conta pessoal de Gabriel permanece uma aprovação separada.

**QA autenticada e restauração:** posts, quatro formatos de imagem, aviso, WhatsApp, histórico, conflitos e prompts exercitados pelo navegador. Fixtures removidas; 12 relações iguais ao baseline por contagem/hash e sessão encerrada. A primeira tentativa WebP falhou e o retry passou, sem causa determinada. [Resultados, correções e limites](docs/validation/hosted-manual-qa.md).

**Correções da auditoria:** rastreamento das imagens públicas, HTML inicial de aviso, metadados e dados estruturados corrigidos; 118 registros legados de SEO reparados no banco, sem alterar os corpos dos posts. Privilégios SQL mínimos e RLS em 12/12 tabelas confirmados; headers e validação integral de imagens reforçados. Banner lossless 35,23% menor e CSS bruto da Home 15,33% menor. HTTP local 22/22 e 11 verificações hospedadas passaram; os probes SQL foram revertidos. [Relatório atual, provas e pendências](docs/validation/corrections-2026-10-02/README.md). [Auditoria anterior](docs/validation/audit-2026-10-01/README.md) preservada. PageSpeed/CWV, controles adicionais de Auth e decisões editoriais continuam pendentes. Limpeza anterior removeu apenas 14 arquivos regeneráveis.

**Repositório GitHub privado:** em02/10 Gabriel substituiu a decisão de armazenamento somente local e indicou [gabrielkrapp/benchimol-site](https://github.com/gabrielkrapp/benchimol-site), autorizando commits, push, PR e merge desta integração inicial. Credenciais, contratos, backups, comentários antigos, memória pessoal do Brain e capturas administrativas permanecem somente na máquina. O contexto técnico acompanha o clone. `vercel.json` bloqueia deployments Git em todas as branches; a preparação da Vercel continua sem publicação. [Integração e limites](docs/operations/github-integration.md).

## Comece aqui

1. [Regras para agentes](AGENTS.md).
2. [Spec inicial](docs/specs/2026-09-30-initial-spec.md).
3. [Auditoria e inventário do site](docs/research/site-audit.md).
4. [Arquitetura, alternativas e custos](docs/architecture/decisions.md).
5. [Admin: telas e regras](docs/admin/functional-spec.md).
6. [Migração de conteúdo, aparência e SEO](docs/migration/content-and-seo.md).
7. [Biblioteca inicial de prompts](docs/prompts/README.md).
8. [Informações e decisões pendentes](docs/discovery/client-inputs.md).
9. [Contexto técnico do projeto](docs/context/project-context.md); a ponte pessoal do Brain permanece local em `docs/context/gabriel-brain-project.md`.
10. Minuta e documentos comerciais em `docs/contracts/`, disponíveis somente na máquina de Gabriel e excluídos do clone.

## Referência coletada

O diretório `docs/research/baseline-2026-09-30/` contém respostas públicas originais e seu manifesto com URLs, horário UTC, status e hashes. Foram inventariados **154 posts publicados, 38 páginas e 289 URLs solicitadas**. Não equivale a um backup completo do WordPress. Capturas brutas `.body/.headers` ficam privadas via `.gitignore`; resumos, CSV, JSON e manifestos acompanham o repositório local.

CSV para consulta: [posts](docs/research/posts.csv), [páginas](docs/research/pages.csv), [rotas](docs/research/routes.csv), [mídias](docs/research/media.csv) e [redirecionamentos observados](docs/research/redirects.csv).

## Executar e validar

Leia [setup local](docs/operations/local-setup.md), [plano](docs/implementation/plan.md) e [progresso com evidências](docs/implementation/progress.md). `npm ci` e `npm run dev` já abrem o site público e suas imagens migradas, sem envs do Supabase. Antes da conexão, o conteúdo vem do acervo público versionado; login, gravações e uploads geridos exigem o backend real. Para conectá-lo, use arquivo privado conforme `.env.example` e o roteiro local/da clínica.

Para uma máquina nova, clone `https://github.com/gabrielkrapp/benchimol-site.git`, use Node24.x (configurado na Vercel) ou22.21.1 (validado localmente) e execute `npm ci` com dependências de desenvolvimento. CSS público gerado fica fora do Git e é reconstruído automaticamente no predev/prebuild/pretest. Não copiar envs, snapshots privados ou conta Docker para outra máquina por meio do Git. Links históricos a arquivos privados/capturas locais são evidências disponíveis só na máquina de Gabriel.

**Fluxo atual, por decisão de Gabriel em 01/10/2026: sem Docker.** Execute `npm run dev` para revisar o site público. O arquivo privado `.env.local` preparado usa o Supabase real da clínica; alterações administrativas afetam esse banco. Sem URL/key e sem opt-out, o site continua usando o acervo migrado. Os testes usam um arquivo por vez para reduzir o consumo de memória; nenhum teste comum inicia containers. A conta da clínica já criada está vinculada como administrador; novas contas exigem autorização e vínculo explícitos.

Os scripts de [Supabase local](docs/operations/supabase-local.md) continuam disponíveis para uso manual futuro, com dados preservados e env privado separado. Não iniciar essa stack durante a implementação atual nem reabri-la para concluir QA ou limpeza sem nova autorização. Docker já estava fechado quando essa decisão foi aplicada.

Checks: `npm run typecheck`, `node node_modules/vitest/vitest.mjs run`, `npm run verify:inventory`, `npm run build` e `python3 scripts/migration/verify-runtime-package.py`. Para validar com o dev ativo, use Vitest diretamente: `npm test` também regenera CSS no pretest; não executar build/geração concorrentes ao servidor sem coordenar seu uso. Auditoria HTTP somente local: `node --import tsx scripts/migration/audit-local-html.ts`, com servidor em execução. O inventário inclui 154 registros de posts (153 artigos canônicos), 38 páginas, 551 mídias públicas reconciliados por WP ID e **1.377 registros de assets** com hash/tamanho conferidos. [Captura restaurada](docs/research/restored-source-capture.md) e [recuperação da origem](docs/operations/source-recovery.md).

Conexão/importação/admin: [roteiro do projeto exclusivo da clínica](docs/operations/clinic-integration.md). Módulos: [site público](docs/implementation/public.md), [painel](docs/implementation/admin.md) e [banco/API](docs/implementation/backend.md). A [auditoria HTTP final](docs/validation/http-audit.md) passou no build HUHe: 297 rotas, 478 assets e 42 CSS, zero falhas. Os resultados finais e limitações estão no [ledger de validação](docs/implementation/progress.md).

## Limites atuais

- Implementação e testes autorizados; merge permitido somente nesta integração GitHub inicial. Deploy e futuras operações de merge mantêm os limites de `AGENTS.md`.
- Next.js oficial preparado para Vercel sem publicação. Elegibilidade de plano gratuito comercial pendente; não foi contratada hospedagem.
- Supabase da clínica inicializado em `jjrzmuuwuvxcsnwqzvxf`, com 154 posts/153 canônicos/551 mídias/dois redirects. Login, CRUD, uploads, configurações e logout testados com a conta da clínica; base editorial restaurada. Expiração/refresh, revogação global e hospedagem publicada permanecem sem prova. Nunca LifeWallet.
- Comentários e formulário removidos por aprovação explícita; WordPress não alterado.
- Layout restaurado Elementor é a referência. Há 24 comparações de oito famílias em 390/768/1440px, com proveniência de cada build; ajustes finais têm provas suplementares. Isso não equivale a conferir visualmente cada URL nem a medir igualdade de pixels.
- A QA autenticada anterior não conseguiu aplicar o viewport móvel. Nesta rodada, quatro famílias públicas foram revistas em 390/768/1440px, com suplementos finais de depoimentos e interações móveis; não se repetiu toda a QA autenticada em mobile. Build e aceite publicado permanecem separados dos testes locais.
- Credenciais, contratos e export bruto privado ficam fora do Git e da aplicação pública. Não são assets do site.

## Atualização da documentação

Registrar cada decisão aprovada em `docs/architecture/decisions.md`, com data e responsável. Atualizar spec, runbooks e prompts na mesma alteração que modificar o comportamento correspondente. Evidências históricas não devem ser sobrescritas por uma nova coleta.

O script `scripts/capture-public-baseline.py` é uma ferramenta de descoberta por GET, não um importador nem backup. Ele usa uma pasta datada fixa nesta versão: antes de repetir a coleta, ajustar a pasta para uma nova data e preservar a anterior.
