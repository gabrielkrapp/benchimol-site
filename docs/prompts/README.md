# Biblioteca inicial de prompts

Fonte canônica da tela implementada `/admin/prompts`. Biblioteca de instruções, sem execução de IA ou custo de API. Versão atual **0.12**: oito tarefas e uma base comum com o caminho público `src/app/(public)/[[...path]]/`, política pública sem envs, integração exclusiva da clínica e instrução de não executar Docker no fluxo atual. A base registra a equivalência restrita de origens loopback e o diagnóstico de conta Auth sem vínculo administrativo, preservando as proteções e exigindo autorização específica para concessão de acesso. Também protege as regressões do editor: diálogos acessíveis em lugar de prompts nativos, abertura sem falso aviso de alteração e resumo com espaços/quebras/literais preservados. Prompts de menu/mídia registram a estrutura HFE e as medidas/estados capturados das galerias para preservar a fidelidade. A versão0.11 incorporou as correções de SEO/IA, privilégios SQL mínimos, decode de uploads, manutenção manual e derivados de performance. A versão0.12 registra a integração GitHub autorizada e mantém o bloqueio de deploy e os limites para futuras tarefas.

## Como usar

1. Abrir a IA em um ambiente que tenha acesso ao repositório. Se não houver, fornecer os documentos relevantes; só colar o prompt não dá acesso ao projeto.
2. Copiar o conteúdo de [base.md](base.md) seguido do prompt da tarefa. O botão do admin faz essa composição automaticamente.
3. Preencher o pedido. A IA lê os docs, pergunta apenas os dados faltantes, apresenta uma proposta concreta e espera a confirmação da mudança antes de editar o produto.
4. Conferir o diff e a prévia local. Código pronto é entregue ao usuário; a IA não faz merge/deploy.

Prompts referenciam docs reais desta pasta. Eles não contêm credenciais, acesso WordPress ou dados de pacientes. Não apontar para a captura bruta inteira se a tarefa só precisar de um componente; usar contexto suficiente e específico.

## Catálogo

| ID | Tarefa | Arquivo | Contexto principal |
|---|---|---|---|
| P01 | Alterar cor | [alterar-cor.md](alterar-cor.md) | Spec + auditoria + documentação de estilos |
| P02 | Alterar exame/especialidade | [alterar-exame.md](alterar-exame.md) | Migração/SEO + inventário de páginas |
| P03 | Atualizar equipe | [alterar-equipe.md](alterar-equipe.md) | Inventário/bios + migração |
| P04 | Adicionar página | [adicionar-pagina.md](adicionar-pagina.md) | Spec + rotas/SEO |
| P05 | Alterar menu | [alterar-menu.md](alterar-menu.md) | Inventário + rotas + aparência |
| P06 | Melhorar SEO | [melhorar-seo.md](melhorar-seo.md) | Migração/SEO + metadados existentes |
| P07 | Atualizar imagem/PDF | [alterar-midia.md](alterar-midia.md) | Manifesto de assets + migração |
| P08 | Conferir origem e migração | [recolher-origem-publica.md](recolher-origem-publica.md) | Captura restaurada + plano + migração |

[catalog.json](catalog.json) define IDs, títulos, versões e caminhos lidos pelo admin no servidor. Os arquivos entram no pacote da rota privada por tracing restrito; não são publicados em `public/`.

## Manutenção

Cada prompt deve manter caminhos verificados de componentes/conteúdo, runbook de validação e política de rollback vigente. Se mover um documento ou mudar uma regra compartilhada, atualizar catálogo/base e tarefas afetadas na mesma mudança. Não usar evidência de teste local como prova de operação hospedada.

Antes de uma tarefa de SEO, mídia, segurança ou performance, consultar as [correções de02/10/2026](../validation/corrections-2026-10-02/README.md) e a [auditoria anterior](../validation/audit-2026-10-01/README.md). O relatório atual distingue patches aplicados e pendências; preservar texto literal novo ao tratar entidades de importação, manter autorização privada ao permitir crawl de mídia e conferir fidelidade antes de remover CSS. D-014 substituiu o repositório somente local por GitHub privado, com merge autorizado apenas para a integração inicial. Nenhuma tarefa desta biblioteca autoriza merge/deploy futuro.
