# Contexto técnico do projeto Benchimol

Freelancer de migração do site público da Clínica de Olhos Benchimol de WordPress/Elementor para Next.js oficial, TypeScript e App Router. A referência é o layout Elementor restaurado, com conteúdo, cores, imagens, menus, contatos, ordem e URLs preservados. Não redesenhar nem alterar informação médica por iniciativa própria.

Leia `../../AGENTS.md`, `../../README.md`, `../specs/2026-09-30-initial-spec.md` (v0.9), `../architecture/decisions.md` e `../implementation/progress.md` antes de modificar o produto. Evidências de origem e hashes permanecem em `../research/` e `../../data/wordpress/`; inventário público não equivale a backup completo WordPress.

## Decisões atuais

- Site, painel `/admin` e APIs no mesmo aplicativo. Vercel preparada, sem deploy autorizado. A integração GitHub inicial foi autorizada em02/10/2026 para `gabrielkrapp/benchimol-site`; `vercel.json` mantém todos os deploys Git desligados. Futuras operações seguem os limites de AGENTS.
- Supabase Marketplace para PostgreSQL/Auth/Storage, somente no recurso da clínica explicitamente conferido pelos scripts. Nunca LifeWallet. Cadastro público desabilitado; contas existentes precisam de vínculo administrativo autorizado. Dados editoriais configurados não podem voltar a snapshot após falha do backend.
- Sem envs e sem opt-out, site público usa o acervo migrado. Admin e uploads exigem backend real. Não executar Docker durante este fluxo; scripts/volumes antigos permanecem para retomada expressamente autorizada.
- 153 artigos canônicos/154 registros importados,38 páginas,551 mídias e1.377 registros de assets. Posts mantêm slugs na raiz. WP34 usa `/cirurgia-refrativa-artigo/`; a página conserva `/cirurgia-refrativa/`. WP1966 foi recuperado em `/por-que-piscamos-os-olhos-artigo-2020/`. Duplicata WP1959/1963 e redirects preservados por decisão aprovada.
- Comentários e formulário removidos do produto por decisão do cliente. Não alterar WordPress nem publicar capturas/autenticação/comentários privados no Git.
- Painel gerencia posts, histórico/versões, mídia com imagem/vídeo permitido, aviso textual agendado, contato/WhatsApp e biblioteca de prompts. Autorização obrigatória no servidor e banco; ocultar controles não protege operações.
- Público deve conter HTML semântico legível por mecanismos de busca e IA, metadados/canonicals/JSON-LD/robots/sitemap e URLs estáveis. Permitir consulta pública não autoriza treinamento nem acesso a admin/rascunhos/documentos internos. Não prometer ranking, citação ou nota100.

## Implementação e validação

As [correções da auditoria](../validation/corrections-2026-10-02/README.md) incluem crawl específico de `/api/media/`, preview de imagem grande, schema médico/unidades, aviso SSR/noscript,118 metadados legados corrigidos e privilégio SQL mínimo/RLS12 tabelas. Uploads têm decode integral e limites; expurgo é manutenção manual com plano/ref/hash, sem scheduler. Scripts hospedados validam destino/TLS antes de qualquer operação e não reinicializam base ocupada.

Banner lossless e CSS derivados têm nome por hash; originais e hashes antigos preservados. Não editar hashes nem eliminar versões em uso. Dimensões/srcset proporcional/sidebar e guard dos depoimentos precisam ser preservados. `npm ci` inclui devDependencies; predev/prebuild/pretest regeneram CSS ignorado. Com dev em uso, Vitest direto evita regerar CSS; não construir produção concorrentemente sem coordenar com Gabriel.

Logs/testes, hashes e limites estão em `../validation/` e no ledger. QA editorial anterior foi restaurada; provas posteriores não equivalem a aceite de todas as URLs nem a Vercel publicada. Build HUHe é histórico e antecede patches; novo build é necessário antes de execução `next start`/publicação manual. CAPTCHA/MFA, Auth direto, autoria/CEP/domínio/sample-page e PageSpeed/Search Console hospedados permanecem pendentes conforme relatórios.

A memória pessoal/comercial do Brain, contratos, exports autenticados, backups, envs e capturas administrativas permanecem locais e ignorados. Este documento oferece o contexto técnico necessário ao clone sem transportar esses arquivos.
