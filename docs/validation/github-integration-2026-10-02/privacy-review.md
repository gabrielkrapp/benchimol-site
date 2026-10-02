# Privacidade antes do primeiro commit — 02/10/2026

Revisão somente leitura dos candidatos retornados por `git ls-files --others --exclude-standard -z`: **2330 arquivos**, sendo **695 textos** e **1635 binários**. O manifesto/hash, padrões, caminhos e linhas estão em [privacy-review.json](privacy-review.json). Não houve staging, commit, operação remota ou mudança de evidências por esta frente.

Não foram encontrados padrões fortes de chave privada, chave Supabase secreta, JWT, token GitHub, signed URL ou cookie de sessão nos textos examinados. Isso é uma busca por padrões, sem garantia universal de ausência de segredos. Nenhum valor suspeito foi impresso ou copiado. `.env` reais, `private-exports`, `backups` e contratos não foram lidos; seus limites estão ignorados. `.env.example` é a exceção incluída, com exemplos. Não há symlinks nos candidatos dessa captura.

Há **22 ocorrências de email pessoal**, distribuídas entre documentação de operador, contatos/rotas já públicos do WordPress e uma evidência de comentário removido. Emails não são senhas ou chaves; sua classificação está no JSON sem reproduzir valores. Não foram identificados CPF pessoais pelo padrão pesquisado. `scripts/build-contract-document.py` contém vocabulário genérico de contrato, sem CPF/segredo detectado; os documentos comerciais estão fora dos candidatos.

Antes do primeiro commit, excluir do Git **sem apagar a cópia local**:

- `docs/context/gabriel-brain-project.md`: memória pessoal/comercial do freelancer, separada das documentações técnicas necessárias à aplicação.
- `docs/research/restored-2026-09-30-public/comments.json`: comentário legado com contato pessoal; comentários foram retirados do produto.
- Os **29 screenshots administrativos/de conta** listados no JSON, em `docs/validation/admin-local/`, `docs/validation/hosted-manual-qa/` e `docs/validation/clinic-admin-*.png`. Não foram visualmente liberados para publicação externa; as evidências permanecem locais. Capturas públicas de comparação visual são outra categoria, com conteúdo do site já público.

Revisar a necessidade de repetir o email do operador em documentação/código de verificação; configurar a identidade pela aplicação é preferível quando prático. Preservar os textos públicos, URLs e autoria WordPress usados pela migração. Não sugerir remoção silenciosa de assets/dados públicos necessários.

Os 1635 binários não foram inspecionados visualmente; imagens, PDFs e outros formatos podem conter informações que regex não identifica. Não houve scan de histórico remoto ou configuração do GitHub. A análise é do candidato **antes do stage** e não autoriza publicar indiscriminadamente todos os arquivos. A revisão final do índice preparado será feita separadamente, incluindo os limites ignorados e os arquivos efetivamente staged.
