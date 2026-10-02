# Plano de implementação — migração Benchimol

Plano iniciado com a spec v0.3 e atualizado conforme a **spec v0.9** e as decisões posteriores de Gabriel. Next.js oficial preparado para Vercel sem deploy; Supabase exclusivo da clínica pelo Marketplace da Vercel; remoção de comentários/formulário e aliases aprovados. Não há autorização de merge, push ou publicação. A implementação local e suas evidências estão em `progress.md`; schema/importação hospedados concluídos; conta do administrador e aceite Auth/Storage permanecem pendentes.

## Etapas e responsáveis

1. **Fonte e reconciliação:** captura pública restaurada, arquivos locais, WXR autenticado sanitizado, comparação por ID e manifesto de rotas/colisões. Nunca persistir comentários privados, credenciais ou export bruto no repo.
2. **Base local:** dependências fixadas, TypeScript/App Router, contratos de dados e validação automatizada. Branch local `codex/benchimol-migration`.
3. **Banco e servidor:** migrations PostgreSQL, Auth SSR, admins ativos e RLS/grants, CRUD com versões/revisões, mídia com referências, settings e APIs privadas. Testar autorização, concorrência, retirada e recuperação localmente. Gabriel forneceu o projeto em 01/10/2026 e a importação remota foi confirmada.
4. **Admin:** login, dashboard real, posts/editor/prévia/revisões/lixeira, mídia, aviso com horários São Paulo, contato e prompts canônicos. Sem signup público ou execução de IA.
5. **Site público:** HTML/CSS capturados com arquivos locais; interações portadas sem executar scripts WordPress. Página institucional, blog/paginação/taxonomias, artigos na raiz, dados completos sem JS, settings centrais, SEO/JSON-LD/sitemap/robots.
6. **Importação e operação:** importar por ID de modo idempotente, resolver colisões sem perder corpos, backup banco+arquivos/restauração, setup Vercel manual. Nenhum comando de deploy é executado pelo agente.
7. **Validação e revisão:** contagens/conteúdos/arquivos/links, segurança servidor+banco, publicação e retirada em todas as superfícies, famílias visuais 390/768/1440, teclado/mobile, tipos/build, revisão independente, docs e Brain.

## Contrato interno de integração

- Tipos canônicos em `src/lib/domain/types.ts`; funções públicas em `src/lib/server/public-repository.ts`.
- APIs administrativas em `/api/admin/{posts,posts/[id],posts/[id]/revisions,posts/[id]/restore,media,media/[id],settings/popup,settings/contact,dashboard}`; login/logout em `/api/auth/{login,logout}`.
- Resposta JSON de sucesso `{ data: ... }`; falha `{ error: { code, message } }`. Status 401/403 para identidade/permissão, 409 para versão/slug, 422 validação, 503 configuração/indisponibilidade. Nunca retornar token ou detalhe interno.
- Posts GET: `q`, `status`, `category`, `page`, `pageSize`; `{items,total,page,pageSize}`. POST cria rascunho. PATCH exige `version`, com conteúdo e status explícitos. DELETE move à lixeira e exige versão. Revisões privadas; restore exige versão e revisão alvo quando aplicável.
- Settings PATCH exige `version`; contato possui histórico/restauração. Mídia nova usa autorização de upload, PUT direto no Storage e finalização validada/idempotente, evitando enviar arquivos pelo limite de payload da função. DELETE bloqueia referências no corpo, capa, SEO e revisões. Dashboard mostra fatos do banco, não métricas inventadas.
- Sem URL/key do Supabase, o site público funciona com o acervo migrado identificado; admin e mídia gerida continuam exigindo backend real. Com banco configurado, falha retorna erro seguro e nunca recupera posts retirados. Em ambiente editorial conectado, `ALLOW_PUBLIC_SNAPSHOT=false` também impede recuperação se as variáveis forem removidas. Páginas editoriais dinâmicas sem cache compartilhado permitem alterações sem deploy; validar headers/CDN após publicação manual.
- O admin não terá autenticação simulada. Configuração ausente gera orientação de setup; testes locais de domínio/banco não comprovam Auth hospedado.

## Decisões de implementação para revisão

- Aviso aparece uma vez por sessão e versão, conforme proposta da spec, sem rastreamento de pessoa. Mudança futura é reversível.
- Novo editor visual preserva conteúdo legado; HTML que não puder converter fielmente mantém corpo bloqueado e metadados editáveis até revisão. Nenhuma conversão destrutiva automática.
- Colisões inventariadas foram decididas por Gabriel: WP34 em `/cirurgia-refrativa-artigo/`, preservando a página institucional; WP1966 em `/por-que-piscamos-os-olhos-artigo-2020/`, preservando o redirect original. WP1959/1963 conservam ambos os registros e o redirect existente para um canônico. Não reabrir essas decisões sem nova instrução.
- Projeto remoto fornecido por Gabriel em 01/10/2026, com schema, seed, bucket privado e importação confirmados, sem criação de projeto/organização pelo agente. A restrição comercial do Hobby continua documentada para decisão anterior à publicação.

Estado por etapa e evidências em `progress.md`; só marcar completa após validação correspondente.
