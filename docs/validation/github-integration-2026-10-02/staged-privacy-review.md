# Revisão final do índice — 02/10/2026

**Aprovado no escopo desta revisão.** Foram examinados os objetos reais do índice (`git ls-files --stage -z` e `git cat-file --batch`), sem confiar apenas nas cópias do workspace: **2310 arquivos** no índice, incluindo o `vercel.json` de base, **704 textos** e **1606 binários**. Hash do manifesto, modos e resultados estão em [staged-privacy-review.json](staged-privacy-review.json).

- As **31 exclusões recomendadas** estão fora do índice, com todas as cópias locais preservadas: Brain, comentário legado e29 screenshots administrativos/de conta.
- Nenhum `.env` real, backup, export privado ou contrato está no índice; o único basename de env incluído é `.env.example`.
- Não há symlinks, submodules ou stages de conflito. Os modos são arquivos regulares Git.
- Não foram detectados padrões fortes de chave privada, chave Supabase secreta, JWT, token GitHub/provedor, chave AWS/Google, signed URL, cookie de sessão, nonce WP ou CPF pessoal nos textos staged.
- Permanecem20 ocorrências de email de operador/contato público em documentos/fontes; são dados de contato, não chaves de autenticação. A recomendação de minimizar repetições continua válida.

Não houve leitura de envs reais, backups, contratos ou exports privados, nem staging, operação remota ou alteração de runtime por esta frente. Nenhum valor suspeito foi copiado para os relatórios. Binários públicos não foram visualmente inspecionados; screenshots administrativos foram excluídos. A busca por padrões não constitui garantia universal sobre todos os formatos de segredo.

O resultado refere-se ao manifesto capturado. Qualquer mudança posterior no índice exige revisão dos caminhos alterados; estes dois novos relatórios precisam ser adicionados pelo executor principal se forem incluídos no commit.
