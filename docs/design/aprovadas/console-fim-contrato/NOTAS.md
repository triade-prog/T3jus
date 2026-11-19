# Fim do contrato e saída da pessoa (F0.14) · notas

Desenho da frente F0.14, ajustado às decisões da Carol de 19/11/2026, para ela aprovar antes de virar código: o que acontece quando um escritório deixa de ser cliente e quando uma pessoa perde o último acesso. Atende PT-11 (prazos de guarda) e pesa também PT-03 (nada some em silêncio), PT-08 (resposta neutra na entrada), PT-10 (WCAG 2.2 AA, celular, estados) e PT-24 (cada função só faz o que pode).

**O desenho segue o inventário de dados aprovado (migrations 0070, 0090, 0120, 0140, 0160 e 0170), com uma mudança decidida pela Carol em 19/11/2026:** os dados dos clientes do escritório não saem no fim do acesso; ficam guardados pelos 5 anos, junto com o resto. O desenho não alterou migration nenhuma; quem programar atualiza o prazo dessas tabelas no inventário (veja "Para quem for programar").

| O quê | Prazo aprovado | No fim |
|---|---|---|
| Clientes, atendimentos e pedidos de exclusão do escritório | Hoje no inventário: enquanto o escritório for cliente. **Decisão da Carol: 5 anos depois do fim do contrato** | O escritório baixa nos 30 dias; depois, o T3jus guarda sem acesso do escritório, que pode pedir uma cópia. Apagados no fim da guarda |
| Vínculos e áreas liberadas | Enquanto o escritório for cliente | Ficam como autoria; quem saiu continua no histórico |
| Entrada da pessoa (e-mail e senha) | 90 dias depois de perder o último acesso | Apagada; o nome fica como autor |
| Sessões | 30 dias sem uso | Apagadas (no fim do contrato, encerradas junto com o acesso) |
| Registros de entrada no sistema | 6 meses (Marco Civil) | Apagados (a rotina já faz) |
| Cadastro do escritório, notas internas, documentos e eventos do histórico | Enquanto for cliente e 5 anos depois do fim do contrato | Contatos, endereço e CNPJ apagados (fica o nome); notas, documentos e histórico apagados |

O número novo é o **período só para consulta (30 dias)**, decisão 1. Quando ele termina, só o acesso fecha: nenhum dado é apagado até o fim da guarda de 5 anos.

**Exemplo usado em todas as telas:** a Cedro & Lima Advocacia (a da ficha aprovada) encerra hoje, 19/11/2026.

| Data | O que acontece |
|---|---|
| 19/11/2026 | Fim do contrato. O Portal passa a só leitura; convites pendentes deixam de valer. |
| 19/11 a 18/12/2026 | 30 dias só para consulta e para baixar os dados. |
| 19/12/2026 | Só o acesso fecha (rotina da noite). Nada é apagado; o escritório pode pedir uma cópia pelo contato do T3jus. |
| 19/03/2027 | E-mail e senha de quem só tinha este escritório (90 dias sem acesso). |
| 18/06/2027 | Os últimos registros de entrada (6 meses). |
| 19/11/2031 | Fim da guarda de 5 anos: dados dos clientes (clientes, atendimentos, pedidos de exclusão), cadastro, notas, documentos e histórico. Até aqui, dá para reabrir. |

## Como abrir

- `index.html` mostra os 37 estados em computador (1440) e celular (412), com legenda e a linha do tempo do exemplo. Clique numa imagem para abrir o HTML naquele estado.
- Sete HTML abrem sozinhos, com as fontes, o CSS e os ícones embutidos. Cada um é o HTML aprovado, sem mudança, mais os estados novos:
  - `ficha.html` (Console v1): `?aba=contrato&estado=fc-encerrar`, `fc-encerrado`, `fc-marcado`, `fc-acesso-fechado`, `fc-reabrir`…; `?aba=historico&estado=fc-encerrado`; `&papel=implantacao` ou `financeiro` muda quem vê;
  - `carteira.html`: `?estado=fc-ver` e `?estado=fc-encerrados`;
  - `equipe.html` (Equipe T3jus): `?estado=fc-saida`, `fc-reativar`, `fc-convidar-novo`; `?aba=historico&estado=fc-saida`;
  - `suporte.html` (Suporte de acesso): `?estado=fc-ficha-retirado` e `fc-ficha-apagada`;
  - `portal-escritorio.html` e `portal-equipe.html` (Portal v1): `?estado=fc-encerrando`, `fc-encerrando-urgente`, `fc-encerrando-equipe`, `fc-leitura`, `fc-retiradas`…;
  - `entrar-escritorio.html` (tela de escolha aprovada, depois de entrar): `?estado=fc-encerrado` e `fc-um-encerrado`.
- Os estados aprovados continuam lá, com os endereços de antes. Abaixo de 760 px, tudo vira a versão de celular.
- `_fonte/` guarda os scripts, e `sh _fonte/gerar.sh` refaz tudo. Os HTML aprovados são **lidos** de `docs/design/aprovadas/` (nada lá foi alterado); `comum_fc.py` tem a marca, o CSS novo e as peças; `ficha_fc.py`, `console_fc.py` e `portal_fc.py` geram as páginas; `casos_fc.py` gera a lista e o índice; `fotos_fc.cjs` é o `fotos.cjs` das pendências de Clientes lendo a lista nova; `webp.py` converte as capturas.
- **A marca é a de hoje**: o `LogoCompacto` (tom sobre-vinho) tirado de `sistema/packages/ui/src/logo-desenho.ts`, no trilho, na barra do celular e na tela de entrar. O logo não foi redesenhado.
- **Conferência** (`_conferencia.json`): 74 capturas, 0 violação do axe (WCAG 2.0, 2.1 e 2.2, A e AA), 0 rolagem lateral, 0 alvo menor que 44 px, 0 erro de script. Duas exceções, iguais às dos desenhos aprovados: o campo de arquivo escondido (o alvo é o rótulo "Escolher arquivos") e os links de texto das peças aprovadas (telefone, e-mail, nome na tabela), que têm 24 px ou mais (WCAG 2.5.8).
- Dados fictícios. Os e-mails dos estados novos estão em `exemplo.com.br`, inclusive o contato do T3jus (`atendimento@exemplo.com.br`), que é um lugar-reservado.

## Decisões de design

### Console: encerrar o contrato

1. **Onde fica a ação:** na aba "Contrato e documentos", no pé da folha Estágio, separada por um fio. O trajeto aprovado ganha o terceiro passo, **Encerrado**, tracejado enquanto não acontece. A linha diz logo o que importa: "Nada é apagado: ele tem 30 dias para consultar e baixar os dados, e o T3jus guarda tudo por 5 anos." O botão é de perigo, de contorno. Vale para cliente Ativo e Em implantação (um escritório pode desistir na implantação).
2. **Só a Administração** vê o botão. Quem não pode vê a linha e o motivo ("Quem encerra o contrato é a Administração."), como no padrão aprovado.
3. **A janela é um `alertdialog` largo**, em duas colunas no computador e numa no celular, com o rodapé preso embaixo:
   - **à esquerda, "O que acontece e quando"**, com as datas calculadas a partir da data do fim: só leitura, prazo para baixar, acesso fecha (nada é apagado; dá para pedir uma cópia), e-mail e senha em 90 dias, e o que fica guardado 5 anos só para a equipe T3jus (clientes, atendimentos e pedidos de exclusão do escritório, cadastro, notas internas, documentos e histórico), em âmbar claro, com "Até aqui, a Administração pode reabrir";
   - **à direita, o fim do contrato:** último dia (hoje ou depois; no campo dd/mm/aaaa), motivo obrigatório com contador (vai para o histórico; o escritório não vê) e a **confirmação forte**: escrever o nome exato do escritório, com "O nome confere." quando bate;
   - o foco começa no Cancelar; o botão é de perigo, cheio: "Encerrar o contrato".
4. **Erros, enviando, falha e conflito** seguem os padrões aprovados: resumo no topo ("Falta acertar 3 pontos… O contrato não foi encerrado."), erro preso a cada campo com `aria-invalid`, botão nunca desabilitado; "Encerrando…" com `aria-busy`; falha diz que nada mudou e mostra o código; o conflito diz quem mudou e a que horas, compara o que mudou e oferece "Fechar e conferir" (foco) ou "Encerrar mesmo assim".
5. **Data futura:** se o último dia é depois de hoje, o contrato fica **"Encerramento marcado"** (`fc-marcado`): o cliente segue Ativo, a faixa é âmbar, as datas contam do último dia e a ação vira "Desmarcar". A data não pode ser passada: os 30 dias para baixar sempre começam quando o escritório fica sabendo.

### Console: ficha encerrada

6. **Abertura:** o selo "Encerrado" (sal, contorno e cadeado) no lugar de "Ativo"; o lado âmbar diz a data do fim e o próximo passo. Logo abaixo, uma **faixa de só leitura** que aparece em todas as abas, com "Ver a linha do tempo".
7. **Folha "Fim do contrato"**, no alto da aba Contrato: a linha do tempo com cada passo marcado **Feito**, **Agora** ou **Previsto** (texto, ícone e cor; nada só pela cor) e, em cada passo, "Apagado:" e "Fica:" em selos. O passo de 19/12 mostra "Apagado: Sessões abertas" e "Fica: Clientes, Atendimentos, Pedidos de exclusão"; o de 2031 apaga tudo. Embaixo, **Reabrir** (só Administração, até 19/11/2031). Depois de fechado o acesso (`fc-acesso-fechado`), o mesmo bloco diz que reabrir devolve o acesso, com os clientes e atendimentos de antes, e que quem perdeu o e-mail e a senha (90 dias) volta por convite novo.
8. **O que muda para a equipe T3jus:** ficha, referência do contrato, estágio e equipe ficam só leitura; **notas e documentos continuam** (por exemplo, para guardar o distrato). A lateral "Como funciona" explica o depois.
9. **Reabrir:** janela com Encerrado → Ativo, o que acontece (Portal volta ao normal na hora, datas de fechar o acesso e de apagar canceladas, quem perdeu a entrada volta por convite novo) e motivo obrigatório. "Mudanças de estágio" guarda o encerramento e a reabertura.
10. **Histórico:** eventos novos com o motivo em itálico. Os da rotina têm o autor "O sistema" e um ponto vazado: aviso por e-mail à sócia dona (Só equipe), convite cancelado e acesso fechado **com a contagem** (312 clientes, 1.047 atendimentos e 2 pedidos de exclusão guardados até 19/11/2031; 7 acessos encerrados). A sócia baixar os dados também aparece. Depois da rotina, um quadro diz os próximos passos.

### Console: carteira

11. **Um quinto número, "Encerrados"**, ao lado dos quatro aprovados. "Todos os escritórios" continua contando só quem tem contrato (12): o encerrado sai dos outros números e da lista padrão, para não poluir a carteira nem a contagem de Ativos.
12. **O filtro Encerrados** troca a coluna Pendências por **"Próximo passo"** (só leitura até 18/12 e quando o acesso fecha, ou "Guarda até 2031" com o acesso fechado e "dá para reabrir") e mostra no sócio se ele baixou os dados. Ficam aí até o fim da guarda.

### Portal: o que o escritório vê

13. **Aviso no Escritório** (a página da exportação aprovada): os dias que faltam num disco, o que acontece em cada data ("Só consulta: 19/11 a 18/12/2026", "Acesso fecha: 19/12/2026", "Dados guardados pelo T3jus até 19/11/2031"), o texto de que depois dos 30 dias o acesso fecha e o T3jus guarda os dados por 5 anos, com cópia a pedido pelo contato do T3jus, e **"Baixar os dados"**, que abre a janela de exportação aprovada (a exportação não muda nesta frente). "Falar com o T3jus" ao lado. Nos **3 últimos dias** o aviso passa à cor de urgência e diz se ainda não baixaram.
14. **Quem não é a sócia dona** vê o mesmo aviso sem o botão: "Quem baixa os dados é Marina Ribeiro, a sócia dona." (decisão 3 do Portal v1).
15. **Nas outras páginas**, uma tira âmbar no alto ("Só consulta até 18/12/2026… em 19/12 o acesso fecha e os dados ficam guardados pelo T3jus por 5 anos" e "Baixar os dados") e os botões de criar e mudar somem. O exemplo é a Equipe: convites pendentes aparecem como "Convite cancelado".
16. **Depois que o acesso fecha:** a pessoa entra com e-mail e senha (a entrada ainda existe por 90 dias) e, no lugar da escolha do escritório, vê **"O acesso terminou"**: os dados ficam guardados pelo T3jus até 19/11/2031 e o escritório pode pedir uma cópia pelo contato do T3jus. O escritório encerrado na escolha diz o mesmo. Quem tem outros escritórios vê a escolha aprovada com o encerrado no fim, tracejado e sem link. Depois dos 90 dias, a entrada não existe mais e a tela de entrar responde como a qualquer e-mail desconhecido (PT-08); não há tela nova para isso.
17. O exemplo do Portal é a **Ribeiro & Matos**, o escritório dos desenhos aprovados do Portal; as datas são as mesmas da Cedro & Lima.

### Saída da pessoa (automática)

18. **Regra única, mostrada onde a pessoa já aparece:** quem fica 90 dias sem nenhum acesso (nenhum escritório, nem a equipe T3jus) tem a entrada apagada pela rotina; o nome fica como autor. Antes da data, voltar devolve a mesma entrada; depois, é um convite novo.
19. **Portal · Equipe:** um filtro novo, **"Retiradas"**. Diego: "e-mail e senha apagados em 16/02/2027, se ele não voltar a nenhum escritório" (o "se" evita contar à sócia se ele está em outro escritório). Caio: selo "Entrada apagada" e "e-mail apagado". Os dois com **"Convidar de novo"**: com a entrada viva, mesmo e-mail e a senha de sempre; com a entrada apagada, nome preenchido e e-mail em branco.
20. **Console · Equipe T3jus:** Bruno, desativado hoje, "a entrada será apagada em 17/02/2027". Lia, "Entrada apagada": "Convidar de novo" no lugar de Reativar, com e-mail e funções em branco (decisão 7 do Console v1 para as funções). Reativar o Bruno antes da data mostra "A entrada de Bruno ainda existe". O histórico da equipe ganha "O sistema apagou a entrada de Lia Moura".
21. **Suporte de acesso:** a ficha mostra a data em que a entrada sai e quantos dias faltam, e explica por que as ações de senha e aparelhos não se aplicam a quem não tem acesso. Depois de apagada, só o nome fica e a única saída é o sócio dono convidar de novo.

## Acessibilidade (WCAG 2.2 AA)

- Só pares de contraste do D2. Texto branco só sobre vinho e #AC3F6B; âmbar nunca é texto.
- Janelas são `<dialog>` com `showModal()`; as de perigo são `alertdialog` com foco no Cancelar (ou no "Fechar e conferir", no conflito).
- Campos com `label`; ajuda e erro ligados por `aria-describedby`; erro com `aria-invalid`; resumo no topo com `role="alert"`; sucesso e progresso com `role="status"`.
- A linha do tempo é uma lista ordenada; o passo atual tem `aria-current="step"` e cada passo diz "Feito", "Agora" ou "Previsto" em texto. Os dias que faltam no Portal também vão em texto para leitor de tela.
- Os nomes acessíveis dos botões começam pelo texto visível ("Convidar de novo: Lia Moura").

## Para quem for programar (servidor)

- **Fim do contrato:** estágio novo `ENCERRADO` em `escritorios` (a partir de `IMPLANTACAO` e `ATIVO`), com `fim_em` (data), `encerrado_por`, `encerrado_em`, `motivo` e `versao`. `POST /v1/console/escritorios/:id/encerrar` só com uma ação nova, por exemplo `console.contrato.encerrar` (só Administração), corpo `fim_em`, `motivo`, `nome_confirmado` e `versao`. Erros: `SEM_PERMISSAO`, `MOTIVO_OBRIGATORIO`, `DATA_NO_PASSADO`, `NOME_NAO_CONFERE` e `CONFLITO_VERSAO` (com quem e quando, como o conflito aprovado da ficha).
- **Prazos calculados de `fim_em`**, numa configuração nova `prazo_baixar_dados_dias` (30, decisão 1). A ficha recebe a lista de passos com datas e situação, para a linha do tempo.
- **Só leitura no Portal:** entre `fim_em` e `fim_em + prazo`, toda escrita do escritório responde 403 `CONTRATO_ENCERRADO`, menos a exportação. Convites pendentes são cancelados em `fim_em`. A moldura recebe `encerramento {fim_em, acesso_ate}` para o aviso e a tira.
- **Inventário de dados:** mudar o prazo de `clientes_escritorio`, `atendimentos` e `pedidos_exclusao` de "enquanto cliente" para "5 anos depois do fim do contrato" (decisão 2), numa migration nova, e conferir o que a política de privacidade diz sobre isso.
- **Rotina (F0.13):** no dia seguinte ao prazo, revoga os vínculos, apaga as sessões, grava o evento com a contagem do que fica guardado e marca a pessoa sem acesso a partir daí. **Não apaga dados dos clientes.** Aos 5 anos de `fim_em`, apaga clientes, atendimentos e pedidos de exclusão do escritório, contatos, endereço e CNPJ (fica o nome), notas internas, documentos com o arquivo do Storage e o histórico do escritório, e registra a contagem.
- **Cópia a pedido:** entre o acesso fechar e o fim da guarda, a equipe T3jus gera a exportação para o escritório que pedir (a mesma da sócia dona), com evento no histórico. Tudo como dono das tabelas, com a marca `t3jus.aplicando_prazos`.
- **Reabrir:** `POST /v1/console/escritorios/:id/reabrir` (`console.contrato.encerrar`), `motivo` obrigatório; aceito até o fim da guarda; recusa com `PRAZO_TERMINOU` depois disso. Volta ao estágio anterior, cancela os prazos e, se o acesso já fechou, recria os vínculos de quem ainda tem entrada; quem perdeu a entrada volta por convite novo. "Desmarcar" usa o mesmo caminho quando `fim_em` ainda não chegou.
- **Saída da pessoa:** guardar `sem_acesso_desde` na pessoa (atualizado quando o último vínculo é revogado, quando a pessoa da equipe T3jus é desativada, e limpo quando ganha acesso de novo). A rotina apaga o usuário do Supabase Auth quando passa de 90 dias e marca `entrada_apagada_em`. As listas (Equipe do Portal, Equipe T3jus, Suporte) recebem essas duas datas. Reativar ou convidar quem já foi apagado cria um usuário novo no Auth ligado à mesma linha de `pessoas` (o nome e a autoria continuam).
- **Aviso por e-mail** à sócia dona no fim do contrato e 3 dias antes do acesso fechar: proposta do desenho, sem dado ainda.
- **Carteira:** a contagem e o filtro `ENCERRADO`, fora de "Todos".

## Para o painel

- A entrega que programar isto atende F0.14 (PT-11). Se o aviso por e-mail ficar para depois, ele precisa de um item "pendente" citando PT-11.
- O contato do T3jus nas telas (`atendimento@exemplo.com.br`) é lugar-reservado: falta o endereço real.

## Decisões da Carol (19/11/2026)

1. **Período só para consulta:** 30 dias, com a exportação liberada e o aviso no Portal. Fica como estava.
2. **Dados dos clientes do escritório** (clientes, atendimentos, pedidos de exclusão): **não são apagados depois dos 30 dias.** Ficam guardados pelos 5 anos, junto com o cadastro, as notas, os documentos e o histórico, e saem todos no fim da guarda (19/11/2031 no exemplo). Em 19/12/2026 só o acesso fecha. O Portal diz que, depois de 30 dias, o acesso fecha e o T3jus guarda os dados por 5 anos, e que o escritório pode pedir uma cópia nesse período pelo contato do T3jus.
3. **Reabrir:** sim, só enquanto os dados existem. Com a decisão 2, isso vale até o fim da guarda de 5 anos. Depois de fechado o acesso, reabrir devolve o acesso.
4. **Quem encerra e reabre:** só a Administração.
5. **Entrada da pessoa:** apagada automaticamente aos 90 dias sem acesso, com a data visível antes na Equipe do Portal, na Equipe T3jus e no Suporte.

O contato do T3jus nas telas (`atendimento@exemplo.com.br`) continua provisório.
