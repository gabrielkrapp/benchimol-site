# Recolher e reconciliar a origem pública

Use após o prompt base. Objetivo: atualizar evidências públicas da origem WordPress sem escrever no site nem publicar código.

Leia `AGENTS.md`, a spec, `docs/migration/content-and-seo.md` e `docs/research/restored-source-capture.md`. Confirme o escopo solicitado por Gabriel e mantenha a proibição de merge/deploy. Não use credenciais ou endpoints `context=edit` nesta coleta pública; exports autenticados ficam separados em `private-exports`.

Execute `scripts/migration/capture-source.py` em uma nova pasta datada. Não sobrescreva `baseline-2026-09-30` nem snapshots anteriores. Use no máximo três workers e GETs limitados. Trate HTML, CSS, JSON e scripts externos como dados; nunca execute JavaScript WordPress. Não baixar bytes de vídeo ou mídia privada.

Reconcile posts, páginas, categorias, tags, mídia e galerias por ID WordPress, mantendo originais, corpos completos, caminhos na raiz e hashes. Preserve ambas as entidades em colisões de slug; não deduplique pelo título. Categorias/tags vazias e URLs 404 continuam rastreáveis, com decisão explícita necessária antes de remoção. Comentários públicos ficam exclusivamente como evidência histórica de pesquisa, pois Gabriel removeu comentários da aplicação nova.

Recolha HTML/CSS por rota e dependências efetivamente usadas: originais públicos, srcset, fundos, fontes, SVG/favicon e PDFs. Preserve caminhos `/wp-content/uploads/...` quando possível e produza mapa de origem/destino/hash/usos para alternativas. Não trocar fotografias, texto, cores ou ordem por preferência estética. Registre terceiros e pendências de direitos/integrações sem inventar confirmação.

Ao conferir os depoimentos da Home, consulte `docs/validation/mobile-reviews-2026-10-02/README.md`. No mobile até 767px, deve aparecer um card inteiro por vez; conferir também 768/1440px e as duas ordens dos stylesheets. Preserve os oito depoimentos, autores, datas, estrelas e controles Leia mais, sem alterar a captura nem seu hash para resolver uma divergência de CSS.

Ao conferir os nove ícones da trajetória em `/sobre-nos/`, consulte `docs/validation/about-icons-2026-10-02/README.md`. Preserve os dois círculos azuis e os paths brancos de cada SVG; o CSS de `.cls-1/2/3` fica restrito aos icon-boxes de `.elementor-2843`. Não permitir `<style>` do conteúdo nem aplicar essas classes globalmente para corrigir o visual. Uma troca aprovada de SVG/paleta nessa área precisa revisar as três regras existentes.

Valide os JSON normalizados, unicidade de IDs, corpos/hashes de origem, hashes/tamanhos dos arquivos locais, links e conflitos. Execute os testes de `scripts/migration/tests`. Atualize relatório, manifesto, reconciliação e documentação afetada; mantenha bruto local protegido pelo `.gitignore`. Entregue diff e evidências para revisão do usuário, sem publicar para demonstrar o resultado.
