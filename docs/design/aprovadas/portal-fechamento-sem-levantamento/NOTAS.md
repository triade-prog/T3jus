# Portal: fechamento do caso sem levantamento · notas

**Aprovado pela Carol em 22/11/2026 às 23h28 (Bahia), com "Aprovo": valem as recomendações das 3 perguntas** (a parcela a vencer segura o fechamento; a baixa de parcela vencida com motivo entra como ideia FI-24, pendente; num contrato com outro caso em andamento, as parcelas não seguram este caso). É o item **F3.132** do painel e atende as ideias **EX-16** (o passo do fechamento leva a um lugar que funciona), **EX-17** (caso e contrato se encerram juntos) e **FI-08** (só encerra com tudo recebido), no caso em que nenhum dinheiro de terceiros entrou. Também pesam **EX-01** (caso com vários clientes), **PT-02** (cada pessoa vê o mínimo), **PT-03** (nada é apagado) e **PT-10** (WCAG 2.2 AA, celular, vazio e erro).

É a resposta à pergunta 5 de `portal-jornada-fechamento`, que a Carol aprovou: uma folha "Fechamento do caso" na ficha do contrato do Financeiro, com o mesmo quadro e a mesma janela do fechamento da ficha do repasse, para os casos sem levantamento. O desenho segue o `PLANO.md` (v2) desta pasta e a `REVISAO.md`, com as 4 notas da segunda leitura aplicadas.

## Como abrir

- `index.html` abre sozinho (CSS, fontes e ícones dentro do arquivo). O botão **Estados**, no canto de baixo, troca de estado; o endereço aceita `?estado=…`. Abaixo de 760 px vira celular. As janelas abrem e fecham (Esc também), e os links principais entre os estados funcionam; o resto é desenho.
- `<estado>-computador.webp` (1440) e `<estado>-celular.webp` (390): as capturas de cada estado.
- `_conferencia.json`: axe (WCAG 2.0, 2.1 e 2.2, A e AA), rolagem lateral, alvos pequenos e erros de script, por estado e tamanho.
- `_fonte/gerar.sh` refaz tudo:
  - `fechamento.py`: os 16 estados. Lê o `jornada.py` aprovado até a parte "página", sem mudança, e lê só para ler o HTML aprovado de `portal-exito-conferir` (o CSS `ex-` e a janela "Registrar recebimento" com reembolso);
  - `jornada.py`, `ficha_ligada.py`, `clientes.py`, `juridico.py`: cópias sem mudança de `portal-jornada-fechamento`;
  - `comum.py`: a mesma cópia, com uma linha a mais (a pasta das telas aprovadas vem da variável `APROV`, porque o caminho fixo do aprovado não existe nesta máquina);
  - `fotos.cjs`: a mesma cópia; o axe entra como script na página (`AXE_CORE` aponta para o `axe.min.js` do `axe-core`), sem trocar o Playwright.

As peças novas têm o prefixo `fs-`.

## Os casos fictícios

O elenco e o "hoje" são os de sempre: Ribeiro & Matos, Marina Ribeiro (sócia dona), quarta-feira, 18/11/2026.

- **A. "Carvalho x Construtora Lume"** (cível, vício construtivo), responsável Felipe Matos. Sentença de improcedência em 04/11, sem recurso; Felipe encerrou com **perda** em 06/11. Nenhum dinheiro entrou pelo escritório.
  - **Noemi Bastos Carvalho, C-2026-012:** 6 × R$ 1.000,00 (dia 10, junho a novembro) + 20% do êxito, que não se aplica (base zero). Parcelas 1 a 5 pagas; a **6/6 venceu em 10/11**, 8 dias de atraso.
  - **Cláudio Carvalho, C-2026-013:** R$ 1.500,00 à vista, pagos em 02/06. **Felipe já encerrou este contrato em 12/11**, direto em Contratos.
  - **Adiantado pelo escritório:** custas iniciais e diligência do oficial, R$ 412,30, que vão junto com a parcela 6/6.
  - **Nos estados "pronto":** Noemi pagou a parcela e o reembolso em 17/11 e Marina encerra em 18/11.
- **B. "Pereira x Mercado Bom Preço"**: a história aprovada em `portal-exito-conferir`, continuada. O êxito de Joana foi lançado (R$ 8.400,00, vence 15/12); o de Carlos foi **não cobrado** hoje, às 16h10, por Diego: "Perdoado", com a explicação "Carlos ficou com a parte menor do acordo; combinado com Marina". Nada em atraso.
- **O vazio:** Rosângela Teixeira, C-2026-018, contrato só de 30% do êxito, caso "Teixeira x Banco Aurora" perdido em 30/10.
- **Com levantamento:** Antônia Ferreira Prado, C-2025-047 (a RPV da jornada aprovada).

## Estados (16, cada um em computador e celular)

| # | Estado | Quem | Onde | O que mostra |
|---|---|---|---|---|
| 1 | `fecha-financeiro` | Marina | Ficha de Noemi | O âmbar "Fechar o caso" com só os passos que se aplicam: **1. Encerrar no financeiro** ("Faltam R$ 1.412,30: parcela 6/6 e custas") e **2. Encerrar o contrato**. "Ver o acerto" leva à folha do C-2026-012. "Quem faz: a área Financeiro (Marina, Diego e Bianca)." |
| 2 | `fecha-larissa` | Larissa | Ficha de Noemi | Sem valores e sem link: o texto diz quem faz e o botão é só "Ver o caso". Sem a promessa de aviso |
| 3 | `caso-acerto` | Marina | Jurídico › ficha do caso | "Encerrado · acerto pendente", "Ver o acerto" para o C-2026-012 e o quadro "Acerto no Financeiro" com os textos do caso sem levantamento: nenhum valor de terceiros, sem êxito, Cláudio pago, a parcela e as custas que faltam |
| 4 | `caso-acerto-larissa` | Larissa | O mesmo caso | O quadro sem valores, com "O acerto está com o Financeiro" no lugar de "Faltam pagamentos a terceiros" |
| 5 | `contrato-pendente` | Marina | Financeiro › A receber › C-2026-012 | O âmbar aprovado (em atraso, R$ 1.000,00, "Registrar recebimento") e, **logo depois dele**, a folha larga "Fechamento do caso": o quadro à esquerda, os três números e o botão secundário "Encerrar o caso no financeiro" à direita |
| 6 | `fechar-bloqueado` | Marina | Janela sobre o 5 | `alertdialog` "Ainda não dá para encerrar", com a parcela e as custas. O foco vai para "Voltar ao contrato". O atalho "Registrar recebimento da parcela 6/6" abre a janela aprovada como está (faixa "parcela + reembolso", caixa do reembolso desmarcada) |
| 7 | `contrato-pronto` | Marina | C-2026-012, tudo pago | O âmbar passa a "Encerrar o caso no financeiro"; a folha perde o botão (uma vez só) |
| 8 | `encerrar` | Marina | Janela | Recebido no caso R$ 7.500,00 · 2 contratos, reembolsado R$ 412,30, falta nada. "Encerrar também este contrato" **marcado**, com o C-2026-012; o C-2026-013 aparece "já encerrado em 12/11", sem caixa; o motivo fixo. Botão "Encerrar o caso e o contrato" |
| 9 | `encerrar-sem-contratos` | Diego | Janela | A seção aparece sem caixa: "O C-2026-012 fica aberto. Quem encerra é a área Contratos (Marina e Felipe), no passo 'Encerrar o contrato' da ficha de Noemi." Botão "Encerrar o caso" |
| 10 | `encerrar-erro` | Marina | Janela | "Nada foi encerrado": o C-2026-012 mudou agora há pouco. `role="alert"`, com o código para o suporte |
| 11 | `encerrado` | Marina | C-2026-012 | O aviso de confirmação; a folha volta para a lateral, abaixo de "De onde veio": "Encerrado no financeiro em 18/11/2026, por Marina Ribeiro · C-2026-012 encerrado junto". O âmbar mostra "Ver a ficha de Noemi" |
| 12 | `contrato-claudio` | Marina | C-2026-013, encerrado (EX-01) | A mesma folha larga, com o caso inteiro: "Deste contrato: tudo recebido" e "Dos outros contratos do caso: Noemi · parcela 6/6", com "Abrir o contrato de Noemi". O botão de encerrar também fica aqui; a janela de pendência traz o atalho "Abrir o contrato de Noemi" |
| 13 | `contrato-so-exito` | Marina | C-2026-018 | **O vazio.** A tabela diz "Nenhuma parcela: o contrato era só de êxito e o caso terminou com perda". A folha diz "Nada a receber neste caso", e o âmbar já é "Encerrar o caso no financeiro" |
| 14 | `contrato-com-levantamento` | Marina | C-2025-047 (caso com RPV) | **Variação nova.** A folha, só para ler, fica na lateral: "O fechamento deste caso fica na ficha do repasse", com "Ver o fechamento". Sem botão |
| 15 | `fecha-a-vencer` | Marina | Ficha de Joana | Três passos: "Conferir o êxito" feito; "Encerrar no financeiro" diz "Esperando o êxito de Joana, em 15/12", **sem tom de atraso**; "Encerrar o contrato" depois. Botão "Ver o acerto" |
| 16 | `contrato-acordo` | Marina | Ficha do contrato de Joana | Base do `conferido-contrato` aprovado, continuada: êxito de Joana lançado, a vencer; "Êxito de Carlos não cobrado · perdoado, por Diego em 18/11", com a explicação; "Nenhum valor de terceiros entrou". "Pronto para encerrar depois do êxito de Joana, em 15/12", sem atalho; o botão continua lá, nunca desabilitado |

Ficam só nas notas, sem estado próprio: a pendência `PARCELA_SEM_VALOR` e o reembolso sem parcela (decisão 8) e o `CASO_JA_ENCERRADO` (decisão 12). O `atendido` saiu (é o aprovado sem mudança) e o `contrato-so-ver` não entra (seção 7 do plano: com as funções de hoje, ninguém tem Financeiro sem `financeiro.editar`).

## Decisões de design

1. **A base e a posição da folha.**
   - A base é o `conferido-contrato` aprovado, que já é um caso sem levantamento. Os estados 5, 12, 13 e 16 partem dele.
   - No aprovado, a folha fica na lateral, abaixo de "De onde veio". Este desenho muda isso **só enquanto há o que fazer** (caso encerrado e ainda não fechado): uma folha só, **logo depois do âmbar no DOM**, larga no computador e na mesma posição no celular. Nada é reordenado por CSS (1.3.2 e 2.4.3) e nenhum `id` se repete.
   - Depois do fechamento (estado 11) e no caso com levantamento (14), a folha volta para a lateral.
   - Nada disso existe hoje: a ficha do contrato (`Financeiro.tsx:1007-1091`) não tem "Fechamento do caso" nem "De onde veio". A entrega constrói as duas peças.
2. **Quando a folha aparece.** Só com o contrato ligado a um caso **encerrado**, sem levantamento. Não aparece no caso encerrado por `IMPORTACAO_DESFEITA` nem com o caso em andamento. Depois do fechamento, fica, com quem encerrou e quando (PT-03).
3. **Um lugar só para encerrar cada caso.** O caso com levantamento continua na ficha do repasse; a ficha do contrato só aponta para lá (estado 14). O caso sem contrato nenhum não tem passo "Encerrar no financeiro" nem fica "acerto pendente": a despesa adiantada segue em A pagar › "A reembolsar por clientes".
4. **Caso com vários clientes (EX-01).** A folha aparece em cada contrato ligado, com o caso inteiro, porque o fechamento é um por caso. O quadro separa "Deste contrato" de "Dos outros contratos do caso", com um link para cada um. Quem tem Financeiro já vê todos os contratos (PT-02 não é ferida). "Ver o acerto" leva ao contrato do próprio cliente no caso; se o cliente não tem contrato no caso, ao contrato com a primeira pendência; se nenhum tem pendência, ao de menor número.
5. **Contrato ligado a mais de um caso.** Proposta: enquanto o contrato tiver outro caso em andamento, as parcelas dele não seguram o fechamento deste caso; o quadro mostra "Contrato C-… segue no caso X: as parcelas ficam com ele"; o último caso a fechar leva o que faltar. **Esta regra só vale com o sim da Carol na pergunta 3.** Por isso ela não tem estado desenhado: a linha "segue no caso X" é a peça `fs-` de linha de grupo, igual às outras do quadro. Na janela, segue o aprovado: o contrato com outro caso em andamento não aparece em "Encerrar também".
6. **O quadro, de cima para baixo.** Resultado e êxito (uma linha por cliente: perda, êxito lançado com valor e vencimento, êxito não cobrado com motivo, quem, quando e a explicação); honorários de cada contrato; o adiantado pelo escritório (sem as canceladas); "Nenhum valor de terceiros entrou neste caso"; os três números, cada um dito também em texto ("Recebido no caso · 2 contratos", "Reembolsado", "Falta", que diz "nada" ou o valor); a linha do Jurídico ("Encerrado · acerto pendente até este fechamento"). No caso a vencer, a faixa "Pronto para encerrar depois de …, em dd/mm", sem atalho, e o número "Falta" com contorno neutro, não de atraso.
7. **O botão "Encerrar o caso no financeiro" nunca fica desabilitado.** Com pendência, é secundário na folha, e o âmbar segue com "Registrar recebimento". Com tudo pago, vira o principal do âmbar e sai da folha.
8. **A janela com pendência** é o `alertdialog` aprovado, com o foco em "Voltar ao contrato". Uma linha e um atalho para cada tipo de pendência do `caso_acerto`; o atalho principal é o da primeira:

   | Tipo | Linha | Atalho |
   |---|---|---|
   | `PARCELA` deste contrato | "Parcela 6/6 · R$ 1.000,00 · venceu 10/11" | "Registrar recebimento da parcela 6/6" (a janela aprovada, com a caixa do reembolso desmarcada) |
   | `PARCELA` de outro contrato | "Noemi · parcela 6/6 · R$ 1.000,00" | "Abrir o contrato de Noemi" |
   | `PARCELA_SEM_VALOR` | "Parcela de novembro · sem valor: falta a base do mês" | "Informar a base", em Contratos › Honorários |
   | `EXITO` | "Êxito de … · falta conferir" | "Conferir o êxito", em A receber |
   | `REEMBOLSO` que vai junto com uma parcela | "Custas · R$ 412,30 · vai junto com a parcela 6/6" | O mesmo da parcela |
   | `REEMBOLSO` sem parcela | "Custas · R$ 412,30 · a reembolsar" | "Ver em A pagar" |

   A frase "cancelar a parcela em Contratos" não aparece: não existe cancelar uma parcela vencida. O texto de ajuda não depende de quem vê (nota 1 da segunda leitura): "Se Noemi não vai pagar, ainda não dá para dar baixa na parcela sem receber: anote a cobrança, e o caso segue 'acerto pendente' até a parcela ser paga."
9. **A janela pronta** é a aprovada, com "Encerrar também" **marcado** (EX-17). O rótulo é "este contrato" com um só e "os contratos ligados" com mais de um. O contrato já encerrado aparece "já encerrado em dd/mm", sem caixa, e não conta no botão. O motivo é o fixo do servidor. Ou tudo se encerra junto, ou nada.
10. **Sem Contratos (Diego).** Encerra só o caso. A seção aparece sem caixa e diz quem encerra os contratos, e onde. Não há a promessa "recebem o aviso". **A janela da ficha do repasse muda junto**, porque o componente é comum: hoje ela esconde a seção para quem não encerra contratos (`FinanceiroRepasses.tsx:1181`).
11. **Quem não tem a área Financeiro não vê a folha.** Na ficha do cliente e na do caso, o texto diz quem faz, sem valores e sem dizer que o cliente deve: "O acerto está com o Financeiro" (nota 2 da segunda leitura).
12. **Acessibilidade e recarga.** Ao chegar por "Ver o acerto" (`#t-fecha`), o foco vai para o título da folha (`tabindex="-1"`, `scroll-margin-top`). Ao fechar uma janela aberta pelo atalho, o foco volta ao botão de onde ela saiu. Se o servidor responde `CASO_JA_ENCERRADO` (alguém encerrou pelo outro contrato), a janela fecha, a folha recarrega e um `role="status"` diz "Este caso já foi encerrado no financeiro por …, às …".

## Acessibilidade (WCAG 2.2 AA)

- axe sem violação nos 16 estados, no computador e no celular (`_conferencia.json`). Sem rolagem lateral e sem erro de script. O único alvo apontado é a marca "T3jus" do trilho (24 px de altura), o mesmo do aprovado.
- A folha larga é uma só no DOM, logo depois do âmbar; a ordem de leitura e de Tab é a mesma da tela.
- Pendência e espera não dependem só da cor: o ícone muda (alerta ou relógio) e há texto escondido "(pendente)" ou "(a vencer)"; "Falta" diz o valor ou "nada" em texto.
- O valor em reais nunca quebra entre o "R$" e o número.

## O que muda no servidor e no `ui`

O `fechamentos_caso` não muda. O `portal_financeiro_caso_encerrar` (0512/0852) já funciona sem levantamento.

1. **`cliente_fechamento` (0851).** O passo `FINANCEIRO` entra quando o caso teve levantamento **ou tem ao menos um contrato ligado, ativo ou encerrado** (a despesa sozinha não basta). Sem levantamento, traz `contratoId` (só para quem tem Financeiro, pela regra da decisão 4) e `aVencer` (para o estado 15).
2. **`fichaLigada.ts`.** Rota nova `ROTAS_PASSO.acertoContrato(id)` → `/financeiro/a-receber/contratos/:id#t-fecha`; `botaoDoFechamento` usa o `levantamentoId` ou, sem ele, o `contratoId` (hoje `href: null`, `:268`); textos sem levantamento: "Tudo recebido" e "Falta receber" (`:229`).
3. **`caso_resumo_acerto` (0852:99).** `pendente` quando não há `fechamentos_caso` e há (a) levantamento, (b) êxito para conferir ou (c) contrato ligado ativo ou encerrado; `IMPORTACAO_DESFEITA` continua fora. Ganha `contratoId` (decisão 4); com ele mudam `hrefDoAcerto` (`AcertoCaso.tsx:34`) e o link de `Juridico.tsx` (~1251).
4. **`GET /v1/escritorio/financeiro/contratos/:id`** (`app.ts:934`) ganha `fechamentos[]`, um por caso encerrado ligado: sem levantamento, o acerto completo, com `contratosLigados`, `podeEncerrarContratos` e `motivoContratos`; com levantamento, só o `levantamentoId` e o resumo.
5. **`caso_acerto` ganha:** `caso` (`nome`, `resultado`, `encerradoEm`); `exitos[]` (cliente, situação, valor, quem e quando, `motivoNaoCobrar` e `explicacao`, só para quem tem Financeiro); `contratos[]` (cliente, situação, total, parcelas pagas, recebido, falta, `seguePor`); `reembolsos` (adiantado e reembolsado, sem as canceladas); `parcelaId` em `PARCELA` e a parcela que leva o reembolso em `REEMBOLSO`; `contratosJaEncerrados` (número e data); `quemContratos` (`quem_tem_area(…, 'CONTRATOS')`); e, **só se a Carol aprovar a pergunta 3**, o filtro que deixa de fora os contratos com outro caso em andamento.
6. **O `ui`.** O quadro e a janela saem de `FinanceiroRepasses.tsx` (~1060–1240) para um componente comum às duas fichas; a janela passa a mostrar a seção de contratos também para quem não encerra contratos, e o contrato já encerrado; a ficha do contrato (`Financeiro.tsx`, ~1000) ganha a folha e "De onde veio".
7. **O histórico.** O `financeiro.caso_encerrado` de hoje basta. Não entra `origem` vinda do navegador.
8. **Os casos já encerrados antes desta entrega** passam a "acerto pendente" com a regra nova. Sem escritório em produção, é só nota; com dado de piloto, decidir antes de publicar.

## O que o código de hoje contradiz ou não tem

- `AcertoCaso.tsx:26` ("pagar … e encerrar"), `:56` ("Faltam pagamentos a terceiros") e `:76` (a linha "Depois", só com `entrou`);
- `fichaLigada.ts:229` ("Tudo recebido e repassado", "Falta pagar terceiros");
- `FinanceiroRepasses.tsx`: "tudo recebido e repassado" e "Voltar ao caso"; a seção dos contratos escondida (`:1181`);
- `Juridico.tsx:777`: na perda, o texto passa a ser "fica 'acerto pendente' até o Financeiro encerrar";
- não há cancelamento de parcela vencida (`0200:516`, `:547`);
- as parcelas são somadas sem olhar o caso (`0640:503-509`);
- **o aviso no sino quando o caso fecha não existe** (nem em 0512 nem em 0852), embora a decisão 16 aprovada da jornada e o estado `fecha-larissa` aprovado prometam "recebe o aviso quando fechar". Este desenho tira a promessa dos textos.

## Para o painel

- **Esta entrega atende** a **EX-16** e a **EX-17** no caso sem levantamento e a **FI-08** no fechamento a partir da ficha do contrato. O F3.132 passa a citar as três em `refs` (hoje cita só EX-16 e EX-17).
- **Itens pendentes propostos**, cada um citando a mesma ideia:
  - **Baixa sem receber** de uma parcela vencida, com motivo (perdoada, inadimplência ou renegociada), só para quem tem `financeiro.editar`. **Ideia proposta, ainda não está no `IDEIAS.md`:** o código seria **FI-24**, na seção FI (o total passa de 138 para 139). Ela entra no `IDEIAS.md` no mesmo commit em que o item pendente for criado no painel, mesmo antes da resposta da Carol; se a Carol disser não, o item continua e registra a decisão. Cita FI-08 e EX-16. Sem ela, um caso perdido com cliente que não paga fica "acerto pendente" para sempre.
  - **O aviso no sino quando o caso fecha no financeiro**, para quem encerra os contratos e para a responsável do caso. Cita EX-16 e EX-17. Até lá, os textos não prometem aviso.
  - **A regra do contrato com vários casos** (decisão 5): depende da pergunta 3. Se a Carol decidir depois desta entrega, fica pendente citando FI-08.
- **Ideia para depois, se a Carol quiser:** um aviso em A receber, "2 casos encerrados prontos para fechar" (sem levantamento, o caso não aparece em Repasses).

## Perguntas para a Carol

1. **A parcela que ainda vai vencer segura o fechamento do caso perdido?** Exemplo: o caso perdeu no 4º mês de um contrato de 6 parcelas.
   - **Recomendo que sim, como manda o FI-08.** O caso fica "acerto pendente" até a última parcela, e a folha diz a data, sem tom de atraso (é o que os estados 15 e 16 mostram com o êxito de Joana).
   - Quem quiser parar de cobrar encerra o contrato em Contratos, e as parcelas futuras se cancelam sozinhas, com o motivo. Isso já existe.
2. **A parcela vencida que o cliente não vai pagar pode ter baixa com motivo, para o caso fechar?**
   - **Recomendo que sim:** "Dar baixa sem receber", com motivo (perdoada, inadimplência ou renegociada), só para quem tem `financeiro.editar`. A parcela sai de "Em atraso" e fica no histórico. Isso muda o FI-08 de "tudo recebido" para "tudo recebido ou baixado com motivo".
   - Se a resposta for não, um caso pode ficar pendente para sempre.
   - É a ideia proposta FI-24, que fica como item pendente nesta entrega.
3. **Num contrato que cobre mais de um caso, ou de mensalidade, as parcelas seguram o fechamento de cada caso?**
   - **Recomendo que não, enquanto o contrato tiver outro caso em andamento.** O quadro diz que as parcelas ficam com o outro caso, e o último caso a fechar leva o que faltar.
   - Sem essa regra, com o passo novo, todo caso encerrado de um contrato assim fica "acerto pendente" até o contrato inteiro ser pago.

## Onde o desenho saiu do plano

- **Texto da janela de pendência (decisão 8).** O plano dizia "Se Noemi não vai pagar, fale com Marina"; a nota 1 da segunda leitura pede um texto que não dependa de quem vê (no estado 6 é a própria Marina). Usei "Se Noemi não vai pagar, ainda não dá para dar baixa na parcela sem receber: anote a cobrança, e o caso segue 'acerto pendente' até a parcela ser paga." Não cita uma pessoa nem promete a baixa.
- **Estado 4: "Falta receber do cliente" virou "O acerto está com o Financeiro"**, o texto neutro aprovado (nota 2 da segunda leitura).
- **A linha "segue no caso X" (decisão 5) não tem estado próprio**, porque a regra depende da pergunta 3. O plano também não lhe dava estado.
- **Estado 12, o âmbar do contrato de Cláudio não tem botão.** O contrato está encerrado e nada falta nele; o que falta no caso está no contrato de Noemi, e o link fica uma vez só, dentro da folha. O mesmo no estado 14 (o âmbar só diz que o fechamento fica na ficha do repasse; o link fica na folha).
- **Estado 16, a janela de pendência** (aberta pelo botão da folha, sem estado próprio) traz o êxito de Joana com o ícone de relógio e o atalho "Registrar recebimento do êxito". O plano não detalha essa janela no caso a vencer.
- **Capturas em PNG**, como pedido para esta entrega (os aprovados usam WebP).
- **`comum.py` tem uma linha a mais** (a pasta `APROV`), e o `fotos.cjs` carrega o `axe-core` direto na página em vez do `@axe-core/playwright`. Nenhuma das duas muda o desenho.
