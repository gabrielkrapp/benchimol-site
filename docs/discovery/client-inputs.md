# Decisões confirmadas e dependências restantes

Estado em **01/10/2026**, conforme **spec v0.9**: aplicação implementada, Supabase exclusivo da clínica inicializado/importado e QA manual editorial concluída no dev de Gabriel, com fixtures removidas e baseline restaurado, sem Docker ou publicação. Esta lista substitui as perguntas da descoberta inicial; decisões já respondidas não devem ser reabertas por outra IA.

## Concluído ou definido

| Item | Evidência/decisão |
|---|---|
| Stack/hospedagem | Next.js oficial preparado para Vercel, sem deploy/merge/push |
| DB/login/mídias | Supabase pelo Marketplace, projeto exclusivo `jjrzmuuwuvxcsnwqzvxf`; inicialização transacional confirmada em `clinic-initialization.json` |
| Importação hospedada | 154 registros, 153 artigos canônicos, 551 mídias e dois redirects; corpos/hashes/slugs/caminhos reconciliados, RLS em todas as tabelas da aplicação e bucket privado de 10 MB |
| Verificações conectadas | Sete checagens SDK/SQL passaram em `clinic-connected.json`; probes revertidos, sem QA persistido. Isso não certifica sessão admin/upload autenticado ou Vercel publicada |
| Primeiro admin | Gabriel Krapp, gabriel.krapp@hotmail.com; email/senha. Signup público desabilitado por Gabriel e confirmado pela API. Usuário real ausente na conferência de 01/10 às 20:43:25 UTC; senha definida pessoalmente por Gabriel, sem conta/convite criado pelo agente |
| Conta da clínica | Gabriel criou benchimol@benchimolclinic.com.br e autorizou especificamente o vínculo ativo como “Clínica Benchimol”, aplicado ao UUID conferido somente no projeto da clínica. Login/dashboard153, recarga e logout verificados; senha preservada. [Provas](../validation/clinic-admin-login.md) |
| QA manual editorial | Posts/histórico/lixeira/conflitos, quatro formatos de imagem/edição/exclusão, aviso, WhatsApp e prompts testados. Defeitos corrigidos e retestados; 229 testes/38 arquivos e typecheck passaram. Fixtures removidas; 12 contagens/hashes iguais ao baseline. [Resultados e limites](../validation/hosted-manual-qa.md) |
| Execução atual | `.env.local` privado preparado, permissão `0600`; `npm run dev` usa o Supabase real da clínica. Sem Docker, por decisão de Gabriel; mudanças editoriais afetam esse banco |
| Origem | Acesso e export WordPress autorizados; WXR/REST/HTML reconciliados: 154 posts, 38 páginas, 551 mídias |
| Referência | Layout completo esperado do Elementor; HTML/assets/fontes/CSS recuperados e comparação em 390/768/1440 px |
| Comentários | Remover todos os comentários e o formulário no app novo; WordPress preservado |
| Aliases | WP34 `/cirurgia-refrativa-artigo/`; WP1966 `/por-que-piscamos-os-olhos-artigo-2020/`; manter os redirects aprovados |
| Duplicata exata | WP1959/1963: preservar ambos os IDs e o redirect; 154 registros, 153 canônicos |
| Contato inicial | Número e mensagem observados preservados; campo da v1 é mensagem pré-preenchida no WhatsApp |
| Admin da v1 | Posts/revisões/lixeira, imagens/YouTube, popup de texto, WhatsApp/histórico, prompts; sem analytics fictício |
| Comercial | R$4.500, cartão integral antecipado, início após aprovação do pagamento, 7 dias corridos, um mês de suporte; sem prova de assinatura/pagamento |

## Dependências reais para concluir o aceite

1. **Manter o provisionamento explícito das contas:** a conta da clínica já criada e autorizada está vinculada, com login/recarga/logout verificados. Não recriar a conta nem mudar sua senha. A conta pessoal de Gabriel continua uma aprovação anterior separada, ainda ausente na última conferência. Novas identidades exigem autorização e UUID/email conferidos. Roteiro em [clinic-integration.md](../operations/clinic-integration.md).
2. **Concluir os casos sem prova própria:** expiração/refresh, revogação global e confirmação nativa de saída no navegador do usuário. CRUD/histórico/preview/lixeira, conflito já antigo, texto literal/multilinha e upload/finalização/retry/exclusão passaram na QA autenticada. A primeira tentativa WebP falhou sem causa determinada; retry funcionou e intenção vazia foi limpa. Backup/restore integral em outro projeto hospedado e corrida exata entre preflight e SQL continuam sem prova; a limpeza desta rodada não substitui esses casos. A antiga fixture Docker permanece intocada.
3. **Revisar as evidências e recompilar os patches:** suíte atual **229 testes/38 arquivos** e typecheck passaram; build HUHe/pacote servidor/HTTP amplo e matriz visual são históricos, anteriores aos patches desta QA. Recompilar antes de `next start`/publicação manual. Mobile atual também aguarda validação: viewport390px não se aplicou no IAB. A matriz histórica tem 24 combinações, proveniência por build e provas suplementares de Galeria/HFE/Carregar Mais; não equivale a conferir cada URL visualmente ou igualdade de pixels. Detalhes em [progresso](../implementation/progress.md). Popup permanece texto apenas, uma exibição por sessão/versão e datas em São Paulo; não importar automaticamente o popup de imagem antigo.
4. Antes da publicação **manual por Gabriel**, resolver elegibilidade/custo comercial da Vercel, domínio/DNS, baseline Search Console e validações reais de CDN/WAF/crawlers/retirada editorial. SMTP/recuperação continuam desabilitados até entrega e redirects testados.

## QA Docker interrompida e limpeza futura

As evidências locais anteriores foram preservadas: login/dashboard, fluxo do artigo descartável, aviso inativo/recusa de período e restauração, contato/histórico/restauração e prompts/cópia. O upload pela UI ficou em **“Preparando envio…”**, sem finalização confirmada. A ferramenta não comprovou o cancelamento nativo de saída; os testes de histórico não substituem essa observação.

Gabriel pediu continuar sem containers por memória em 01/10. **Logout e limpeza não foram executados.** A fixture privada, artigo e possível intenção/arquivo parcial aguardam retomada voluntária com nova autorização expressa para Docker. Não reiniciar containers para concluir essa etapa, remover volumes, migrar a fixture para o recurso da clínica ou rodar a limpeza local contra o banco hospedado. A inicialização/importação hospedada não limpa os dados dos volumes locais. Resultados e limites: [posts](../validation/admin-posts-local-qa.md), [demais módulos](../validation/admin-local-qa.md) e [roteiro local](../operations/supabase-local.md).

## Exceções da origem e alterações que exigem decisão própria

- Duas URLs já quebradas (`/cataratacatar/` e destino `/equipe-medica-old/`) e um PDF legado 404 estão documentados na captura. Backup original da hospedagem pode permitir recuperar esse PDF; não inventar um arquivo substituto nem redirecionar todos os erros para Home.
- Sample Page, oito categorias e 61 tags vazias de jogos são preservadas; arquivos vazios recebem noindex. Remoção/redirecionamento futuro exige autorização, sem concluir invasão por inferência.
- Divergência de CRM entre elenco e bio Adriana permanece como na fonte. Somente a clínica pode aprovar correção médica; não copiar o número de outro médico.
- Demais administradores precisam de identidade e autorização explícitas. Analytics/histórico Burst e monitoramento contínuo são opcionais; não foram contratados/implantados nesta etapa.

Credenciais, XML bruto, contratos e informações privadas ficam fora do Git/runtime/Brain. O inventário público não é backup completo do WordPress. A restrição permanente de merge/deploy continua em `AGENTS.md`.
