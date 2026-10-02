# Fonte, recuperação e limites da cópia local

## Preservação da origem

A coleta não modificou WordPress, Elementor, posts, comentários ou plugins. Depois da exportação autorizada, a sessão usada na pesquisa foi encerrada. Credenciais não foram persistidas.

WXR em Downloads: backup nativo de conteúdo, não cópia completa de banco/configuração/arquivos WordPress. Ele contém material privado e não pode ser copiado para `public`, Git, Brain ou prompts. O script `scripts/migration/reconcile-authenticated-export.py` filtra uma allowlist pública e gera reconciliação por ID; oito testes Python cobrem captura e filtro inicial.

Inventário restaurado: 154 posts, 38 páginas, 551 mídias públicas e duas galerias. A captura principal recuperou 1.288 assets locais (~201,5 MB), com originais/variantes, 112 CSS, 103 fontes e 12 PDFs. O complemento Elementor posterior acrescentou 89 registros de CSS/fontes; o inventário integrado verifica **1.377 registros de assets**. `npm run verify:inventory` confere corpo normalizado contra baseline de transformação e tamanho/hash de cada arquivo. CSS tem hash original e hash local após substituir URLs por arquivos locais; não comparar os dois como se fossem os mesmos bytes. Os 19 probes de CSS não gerado pelo Elementor são registrados separadamente, sem tratá-los como mídias perdidas.

`record-content-integrity.py` foi usado uma vez para provar que cada corpo é a transformação exata do REST capturado, removendo markup executável e localizando URLs. **Não regenerar os hashes para fazer um teste passar.** Nova coleta exige novo snapshot e revisão do diff; o baseline anterior permanece histórico.

## Falhas anteriores à migração

- `/cataratacatar/`: 404 na origem.
- `/equipe-medica/`: encaminha para `/equipe-medica-old/`, que retorna 404.
- Um PDF antigo de `www.clinicadeolhosbenchimol.com.br/_files/ugd/0715b5_46a61730b34a48208a2d7dea19a792c0.pdf`: 404 na origem. Não fabricar arquivo substituto ou redirecionar para outro PDF sem confirmar equivalência.

Esses itens ficam no relatório de exceções; a ausência na origem não se transforma em recuperação bem-sucedida. Novos arquivos/destinos precisam de confirmação quando alterarem o conteúdo.

## Restaurar a aplicação

A restauração completa exige **banco editorial e bytes dos arquivos de Storage**, além do repo/lockfile/assets institucionais. Um dump PostgreSQL sozinho não restaura imagens novas. Backup e restore usam projeto da clínica confirmado e ambiente isolado de teste; nunca testar sobre o banco real ou LifeWallet.

Runbook e scripts específicos em `../implementation/backend.md`. Registrar horário, origem, hashes/contagens e teste de leitura no destino. Só informar “restauração verificada” após reproduzir posts/rascunhos/revisões/settings/arquivos e confirmar autorização no banco. Até isso ocorrer, o dashboard deve mostrar ausência de evidência.
