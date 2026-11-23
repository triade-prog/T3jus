# Portal: fechamento do caso sem levantamento · plano do desenho (v2)

**Situação.** Esta é a versão 2 do plano. Ela incorpora a `REVISAO.md` de 23/11/2026 (veredito "aprovar com ajustes", 13 ajustes) e volta para revisão. Ainda não há `index.html` nem capturas.

**O que pede.** É o item **F3.132** do painel. Atende as ideias **EX-16**, **EX-17** e **FI-08** do `IDEIAS.md`, e também pesam:
- **EX-01**: caso com vários clientes;
- **PT-02**: cada pessoa vê o mínimo;
- **PT-03**: nada é apagado;
- **PT-10**: WCAG 2.2 AA, celular, vazio e erro.

**De onde vem.** É a resposta à pergunta 5 de `portal-jornada-fechamento`, que a Carol aprovou: uma folha "Fechamento do caso" na ficha do contrato do Financeiro, com o mesmo quadro e a mesma janela do fechamento da ficha do repasse, para os casos sem levantamento. O botão "Ver o acerto" leva para lá.

Conferi cada ajuste contra o código. Aceito 12 dos 13 inteiros. No ajuste 7, discordo de uma parte (o estado `contrato-so-ver`); o motivo está na seção 7.

## 1. Os casos fictícios

O elenco e o "hoje" são os de sempre: Ribeiro & Matos, Marina Ribeiro (sócia dona), quarta-feira, 18/11/2026. Na equipe, Diego Almeida tem as áreas Comercial e Financeiro e não tem Contratos; Larissa Costa só tem Jurídico; Felipe Matos é advogado e tem Contratos.

**A. A perda: "Carvalho x Construtora Lume"** (cível, vício construtivo). É o caso principal; os nomes são novos e não aparecem nos aprovados.
- **O caso:**
  - Felipe Matos é o responsável; o caso abriu em 02/06/2026, na assinatura.
  - A sentença foi de improcedência, em 04/11/2026, e não houve recurso.
  - Felipe encerrou o caso com **perda** em 06/11/2026.
  - Nenhum dinheiro entrou pelo escritório: não houve levantamento, repasse nem prestação de contas.
- **Noemi Bastos Carvalho, contrato C-2026-012:**
  - honorário contratual de R$ 6.000,00, em 6 parcelas de R$ 1.000,00, que vencem no dia 10, de junho a novembro;
  - mais 20% do êxito, que não se aplica: com a perda, a base é zero e o servidor não cria o registro do êxito (`0640_exito_conferir.sql:207`);
  - as parcelas 1 a 5 estão pagas; a **6/6 venceu em 10/11** e está há 8 dias em atraso.
- **Cláudio Carvalho, contrato C-2026-013:**
  - R$ 1.500,00 à vista, pagos em 02/06;
  - **Felipe já encerrou este contrato em 12/11, direto em Contratos.** É o caso do contrato encerrado antes do financeiro (ajuste 10).
- **Adiantado pelo escritório:** custas iniciais e a diligência do oficial, R$ 412,30, pagas em 06/2026. O reembolso ainda não entrou e vai junto com a parcela 6/6 de Noemi (`conta_parcela_reembolso`, `0511:39`).
- **Total que segura o fechamento:** R$ 1.412,30.
- **Nos estados "pronto":** Noemi pagou a parcela e o reembolso em 17/11, e Marina encerra o caso em 18/11.

**B. O acordo pago direto ao cliente, com êxito: "Pereira x Mercado Bom Preço"** (ajuste 7). É a história aprovada em `portal-exito-conferir`, continuada.
- O êxito de Joana foi lançado: R$ 8.400,00, que vencem em 15/12.
- O êxito de Carlos foi **não cobrado** hoje, 18/11, às 16h10, por Diego. O motivo foi "Perdoado", com a explicação "Carlos ficou com a parte menor do acordo; combinado com Marina".
- Não há nada em atraso; o fechamento só espera a parcela de 15/12. Este é o caso "a vencer".

## 2. Estados (cada um no computador 1440 e no celular 390)

| # | Estado | Quem | Onde | O que mostra |
|---|---|---|---|---|
| 1 | `fecha-financeiro` | Marina | Ficha de Noemi | Variação do aprovado. O âmbar "Fechar o caso" mostra só os passos que se aplicam: **1. Encerrar no financeiro** ("Faltam R$ 1.412,30: parcela 6/6 e custas") e **2. Encerrar o contrato**. O botão "Ver o acerto" leva à folha da ficha do C-2026-012. Embaixo: "Quem faz: a área Financeiro (Marina, Diego e Bianca)." |
| 2 | `fecha-larissa` | Larissa, sem Financeiro | Ficha de Noemi | Sem valores e sem link. O texto diz quem faz, e o botão é só "Ver o caso". A frase "recebe o aviso quando fechar" sai (ajuste 11) |
| 3 | `caso-acerto` | Marina | Jurídico › ficha do caso | O selo passa a "Encerrado · acerto pendente". "Ver o acerto" leva ao C-2026-012. O quadro "Acerto no Financeiro" ganha textos novos para o caso sem levantamento: "Nenhum valor de terceiros entrou", as parcelas e as custas. Saem "pagar … e encerrar" e "Faltam pagamentos a terceiros" |
| 4 | `caso-acerto-larissa` | Larissa | O mesmo caso | O quadro sem valores, com o texto novo "Falta receber do cliente", no lugar de "Faltam pagamentos a terceiros", que fica errado sem levantamento |
| 5 | `contrato-pendente` | Marina | Financeiro › A receber › C-2026-012 | O âmbar segue o aprovado: em atraso, R$ 1.000,00, "Registrar recebimento". **Logo depois do âmbar vem a folha "Fechamento do caso", larga**, com as pendências e o botão secundário "Encerrar o caso no financeiro" |
| 6 | `fechar-bloqueado` | Marina | Janela sobre o estado 5 | A janela `alertdialog` "Ainda não dá para encerrar", com a lista e os valores. O foco vai para "Voltar ao contrato". O atalho é "Registrar recebimento da parcela 6/6", que abre a janela aprovada **como está**: com a faixa "parcela + reembolso" e a caixa do reembolso **desmarcada** (ajuste 9) |
| 7 | `contrato-pronto` | Marina | C-2026-012, tudo pago | O âmbar passa a "Encerrar o caso no financeiro", e a folha perde o botão (ele fica uma vez só, como na decisão 23 da jornada) |
| 8 | `encerrar` | Marina | Janela | Mostra o recebido no caso (R$ 7.500,00 · 2 contratos), o reembolsado (R$ 412,30) e "nada falta". A seção "Contratos ligados ao caso" traz: "Encerrar também este contrato", **marcado**, com o C-2026-012; a linha "C-2026-013 · Cláudio · já encerrado em 12/11", sem caixa; e o motivo fixo. O botão é "Encerrar o caso e o contrato" |
| 9 | `encerrar-sem-contratos` | Diego, sem Contratos | Janela | A seção aparece, mas sem caixa: "O C-2026-012 fica aberto. Quem encerra é a área Contratos (Marina e Felipe), no passo 'Encerrar o contrato' da ficha de Noemi." O botão é "Encerrar o caso". **A janela da ficha do repasse muda junto**, porque o componente é comum |
| 10 | `encerrar-erro` | Marina | Janela | "Nada foi encerrado": o C-2026-012 mudou agora há pouco. A mensagem é `role="alert"` e traz o código para o suporte |
| 11 | `encerrado` | Marina | C-2026-012 | Um aviso confirma o encerramento. A folha volta para a lateral, abaixo de "De onde veio", e diz "Encerrado no financeiro em 18/11/2026, por Marina Ribeiro · C-2026-012 encerrado junto". O âmbar mostra "Ver a ficha de Noemi" |
| 12 | `contrato-claudio` | Marina | C-2026-013, encerrado (EX-01) | A mesma folha larga, com o caso inteiro: "Deste contrato: tudo recebido" e "Do contrato de Noemi: parcela 6/6 e custas", com o link "Abrir o contrato de Noemi". O botão para encerrar também fica aqui |
| 13 | `contrato-so-exito` | Marina | Outro contrato, só de êxito, num caso perdido | **O vazio.** A tabela diz "Nenhuma parcela: o contrato era só de êxito e o caso terminou com perda". A folha diz "Nada a receber neste caso", e o âmbar já é "Encerrar o caso no financeiro" |
| 14 | `contrato-com-levantamento` | Marina | C-2025-047, de Antônia (caso com RPV) | **Variação nova**, não é o aprovado. A folha, só para ler, fica na lateral e diz "O fechamento deste caso fica na ficha do repasse", com o link "Ver o fechamento". Não tem botão |
| 15 | `fecha-a-vencer` | Marina | Ficha de Joana (caso B) | O âmbar "Fechar o caso" tem três passos. "Conferir o êxito" está feito. "Encerrar no financeiro" diz "Esperando o êxito de Joana, em 15/12", **sem tom de atraso**. "Encerrar o contrato" vem depois. O botão é "Ver o acerto" |
| 16 | `contrato-acordo` | Marina | Ficha do contrato de Joana (caso B) | É a base do `conferido-contrato` aprovado, continuada. A folha larga mostra: o êxito de Joana lançado, a vencer em 15/12; "Êxito de Carlos não cobrado · perdoado, por Diego em 18/11", com a explicação; e "Nenhum valor de terceiros entrou". A folha diz **"Pronto para encerrar depois do êxito de Joana, em 15/12"**, sem atalho, e o botão continua lá (nunca desabilitado) |

**O que saiu e por quê:**
- `atendido` saiu: é o aprovado sem mudança (sugestão 1).
- `contrato-so-ver` não entra; o motivo está na seção 7.

**O que fica para as notas, sem estado próprio:**
- a pendência `PARCELA_SEM_VALOR` e o reembolso sem parcela, que estão descritos na decisão 8;
- o `CASO_JA_ENCERRADO`, que está na decisão 12.

## 3. Decisões propostas

1. **A base e a posição da folha.**
   - **A base é o `conferido-contrato` aprovado.** Ele já é um caso sem levantamento: "Nenhum valor de terceiros entrou neste caso" (`portal-exito-conferir/_fonte/exito.py:282-288`). Os estados 5, 12, 13 e 16 partem dele.
   - **No aprovado, a folha fica na lateral, abaixo de "De onde veio".** Este desenho muda isso só enquanto há o que fazer (caso encerrado e ainda não fechado): há **uma folha só, logo depois do âmbar no DOM**, larga no computador (o quadro à esquerda e os três números à direita) e na mesma posição no celular. Nada é reordenado por CSS (1.3.2 e 2.4.3) e nenhum `id` se repete.
   - **Depois do fechamento**, e no caso com levantamento, a folha volta para a lateral, como no aprovado.
   - **Nada disso existe hoje.** A ficha de hoje (`Financeiro.tsx:1007-1091`) não tem "Fechamento do caso" nem "De onde veio". A entrega constrói as duas peças.
2. **Quando a folha aparece.**
   - Só com o contrato ligado a um caso **encerrado**, sem levantamento.
   - Não aparece se o caso foi encerrado por `IMPORTACAO_DESFEITA` (`0852:94`).
   - Enquanto o caso está em andamento, não aparece.
   - Depois do fechamento, fica, com quem encerrou e quando (PT-03).
3. **Um lugar só para encerrar cada caso.**
   - O caso com levantamento continua na ficha do repasse; a ficha do contrato só aponta para lá (estado 14). Isso já decorre da pergunta 5 aprovada.
   - **O caso sem contrato nenhum não tem passo "Encerrar no financeiro" nem fica "acerto pendente"** (ajuste 4). A despesa que o escritório adiantou nesse caso segue em A pagar › "A reembolsar por clientes" (`FinanceiroPagar.tsx:149`), onde já se marca o reembolso (`portal_financeiro_conta_reembolsada`, `0230:313`).
4. **Caso com vários clientes (EX-01).**
   - A folha aparece em cada contrato ligado, com o **caso inteiro**, porque o fechamento é um por caso.
   - O quadro separa "Deste contrato" de "Dos outros contratos do caso", com um link para cada um.
   - Quem tem Financeiro já vê todos os contratos, então isso não fere a PT-02.
   - **Para onde vai "Ver o acerto"** (ajuste 4):
     - para o contrato do próprio cliente no caso;
     - se o cliente não tem contrato no caso, para o contrato com a primeira pendência;
     - se nenhum tem pendência, para o contrato de menor número.
5. **Contrato ligado a mais de um caso** (ajuste 3, pergunta 3). Hoje `caso_acerto` soma todas as parcelas do contrato, sem olhar o caso (`0640_exito_conferir.sql:503-509`). A proposta tem três partes:
   - **Regra:** enquanto o contrato tiver outro caso em andamento, as parcelas dele não seguram o fechamento deste caso.
   - **No quadro:** a linha "Contrato C-… segue no caso X: as parcelas ficam com ele".
   - **No fim:** o último caso a fechar leva as parcelas que faltarem.

   A regra vale nos dois lugares (repasse e contrato), porque está no `caso_acerto`. Na janela, segue o aprovado (decisão 24 da jornada): o contrato com outro caso em andamento **não aparece** em "Encerrar também" (`0852:13-24`).
6. **O quadro, de cima para baixo.**
   - **Resultado e êxito**, com uma linha por cliente:
     - na perda: "Sem êxito a cobrar: o caso terminou com perda em 06/11";
     - no êxito lançado: o valor e o vencimento;
     - no êxito não cobrado: o motivo, quem e quando, e a explicação.
   - **Honorários de cada contrato:** "5 de 6 parcelas recebidas · R$ 5.000,00", com o que falta e o vencimento.
   - **O adiantado pelo escritório no caso:** cada despesa, reembolsada ou não. As canceladas não entram.
   - **"Nenhum valor de terceiros entrou neste caso"**, com ✓: não há repasse nem prestação de contas.
   - **Três números**, cada um dito também em texto, não só pela cor:
     - "Recebido no caso · 2 contratos";
     - "Reembolsado";
     - "Falta", que diz "nada" ou o valor.
   - **O estado do caso no Jurídico:** a última linha diz que, lá, o caso fica "Encerrado · acerto pendente" até este fechamento.
   - **O caso a vencer:** quando nada está atrasado e só falta o que ainda vai vencer, o quadro diz "Pronto para encerrar depois de …, em dd/mm", sem atalho.
7. **O botão "Encerrar o caso no financeiro" nunca fica desabilitado.**
   - Com pendência, é secundário na folha, e o âmbar continua com "Registrar recebimento".
   - Com tudo pago, vira o principal do âmbar e sai da folha.
8. **A janela com pendência** é o `alertdialog` aprovado, com o foco em "Voltar ao contrato". Ela tem uma linha e um atalho para cada tipo de pendência do `caso_acerto` (`0640:515-533`), e o atalho principal é o da primeira:

   | Tipo | Linha | Atalho |
   |---|---|---|
   | `PARCELA` deste contrato | "Parcela 6/6 · R$ 1.000,00 · venceu 10/11" | "Registrar recebimento da parcela 6/6" (a caixa do reembolso vem desmarcada) |
   | `PARCELA` de outro contrato | "Noemi · parcela 6/6 · R$ 1.000,00" | "Abrir o contrato de Noemi" |
   | `PARCELA_SEM_VALOR` | "Parcela de novembro · sem valor: falta a base do mês" | "Informar a base", em Contratos › Honorários |
   | `EXITO` | "Êxito de … · falta conferir" | "Conferir o êxito", em A receber |
   | `REEMBOLSO` que vai junto com uma parcela | "Custas · R$ 412,30 · vai junto com a parcela 6/6" | O mesmo da parcela |
   | `REEMBOLSO` sem parcela | "Custas · R$ 412,30 · a reembolsar" | "Ver em A pagar" |

   A frase "cancelar a parcela em Contratos, com o motivo" **sai** (ajuste 2): não existe cancelamento de uma parcela vencida (`0200_portal_contratos.sql:516` e `:547` só cancelam parcelas futuras, em bloco). No lugar dela, a janela diz: "Se Noemi não vai pagar, fale com Marina". A baixa sem receber é a pergunta 2 e uma ideia nova (seção 6).
9. **A janela pronta** é a aprovada, com "Encerrar também" **marcado** (EX-17).
   - O rótulo é "este contrato" quando há um só e "os contratos ligados" quando há mais de um.
   - O contrato que já foi encerrado aparece "já encerrado em dd/mm", sem caixa, e não conta no botão.
   - O motivo é o fixo do servidor.
   - Ou o caso e os contratos se encerram juntos, ou nada se encerra.
10. **Sem Contratos ou sem `contratos.editar` (Diego).**
    - A pessoa encerra só o caso. A seção aparece sem caixa e diz quem encerra os contratos, e onde (estado 9).
    - Não há a promessa "recebem o aviso": hoje nada avisa no sino quando o caso fecha (ajuste 11).
    - Hoje a janela do repasse esconde essa seção (`FinanceiroRepasses.tsx:1181`). Como o componente é comum, ela muda junto. Fica declarado nas notas.
11. **Quem não tem a área Financeiro não vê a folha.** Na ficha do cliente e na do caso, o texto diz quem faz e não mostra valores (estados 2 e 4).
12. **Acessibilidade e recarga.**
    - **Ao chegar por "Ver o acerto"** (`#t-fecha`), o foco vai para o título da folha (`tabindex="-1"`), com `scroll-margin-top` para não ficar sob a barra (2.4.11).
    - **Ao fechar uma janela aberta pelo atalho**, o foco volta ao botão da folha.
    - **Se o servidor responde `CASO_JA_ENCERRADO`** (alguém encerrou pelo outro contrato), a janela fecha, a folha recarrega, e um `role="status"` diz "Este caso já foi encerrado no financeiro por …, às …".

## 4. O que reaproveita

- **A base técnica é o `_fonte` de `portal-jornada-fechamento`.**
  - `jornada.py` é lido até a parte "página", sem mudança. Dali vêm `EST` (zerado), `add`, `janela`, `aviso`, `toast`, `dir_fecha`, `lista_fecha`, `cab_caso_enc`, `ficha_caso_enc` e `j_fechar`.
  - `comum.py`, `clientes.py`, `juridico.py` e `ficha_ligada.py` entram como cópias.
  - `fotos.cjs` e `gerar.sh` ficam como estão.
  - O axe vem por `AXE_PW`, instalado num rascunho à parte, porque `/tmp/claude-0/axe` não existe nesta máquina. O Playwright não é trocado.
- **Do `_fonte/exito.py` de `portal-exito-conferir`:** a ficha do contrato de Joana (`conferido-contrato`), a folha "Fechamento do caso" e a janela `registrar-reembolso-junto`.
- **HTML aprovado, só lido:**
  - Financeiro: os estados `contrato`, `repasse` e `fechar-bloqueado`;
  - Jornada: os estados `fecha-financeiro`, `fecha-larissa`, `caso-acerto`, `caso-acerto-larissa`, `encerrar-cadeia`, `encerrar-cadeia-erro` e `encerrado-cadeia`.
- **As peças novas têm o prefixo `fs-`:**
  - a folha larga;
  - o grupo "Deste contrato / Dos outros";
  - as linhas de êxito, a linha "segue no caso X" e o "Pronto para encerrar depois de …";
  - a linha do contrato já encerrado na janela.
- **O texto de "Quem faz"** segue o formato aprovado (`fichaLigada.ts:205-209`).

## 5. O que muda no servidor e no `ui` (curto, para quem for programar)

O `fechamentos_caso` não muda. O `portal_financeiro_caso_encerrar` (0512/0852) já funciona sem levantamento.

1. **`cliente_fechamento` (0851).**
   - O passo `FINANCEIRO` entra quando o caso teve levantamento **ou tem ao menos um contrato ligado, ativo ou encerrado**. A despesa adiantada sozinha não basta (ajuste 4).
   - Sem levantamento, o passo traz `contratoId`, só para quem tem Financeiro, pela regra da decisão 4.
   - Traz também `aVencer` (a data da última pendência que ainda não venceu, quando nada está atrasado), para o texto do estado 15.
2. **`fichaLigada.ts`.**
   - Entra a rota `ROTAS_PASSO.acertoContrato(id)`, que leva a `/financeiro/a-receber/contratos/:id#t-fecha`.
   - `botaoDoFechamento` usa o `levantamentoId` e, se não houver, o `contratoId` (hoje devolve `href: null`, em `fichaLigada.ts:268`).
   - O texto de `detalheDoPassoFechamento` sem levantamento: "Tudo recebido" no lugar de "Tudo recebido e repassado", e "Falta receber" no lugar de "Falta pagar terceiros" (`:229`).
3. **`caso_resumo_acerto` (0852:99).** A regra completa de `pendente`:
   - não há `fechamentos_caso` **e** há (a) levantamento, (b) êxito para conferir **ou** (c) um contrato ligado, ativo ou encerrado;
   - o caso encerrado por `IMPORTACAO_DESFEITA` continua fora.

   O resumo ganha `contratoId`, com a regra da decisão 4. Com ele mudam `hrefDoAcerto` (`AcertoCaso.tsx:34`) e o link de `Juridico.tsx` (~1251).
4. **`GET /v1/escritorio/financeiro/contratos/:id`** (`app.ts:934`) ganha `fechamentos[]`, um por caso encerrado ligado ao contrato:
   - sem levantamento: o acerto completo, com `contratosLigados`, `podeEncerrarContratos` e `motivoContratos` (já em 0852);
   - com levantamento: só o `levantamentoId` e o resumo.
5. **`caso_acerto` ganha:**
   - `caso` (`nome`, `resultado`, `encerradoEm`);
   - `exitos[]`, com o cliente, a situação, o valor, quem conferiu e quando, mais `motivoNaoCobrar` e `explicacao` (de `exitos_conferir`, `0640:36`), só para quem tem Financeiro;
   - `contratos[]`, com o cliente, a situação, o total, as parcelas pagas, o recebido e o que falta, e `seguePor` (o outro caso em andamento, da regra da decisão 5);
   - `reembolsos` (adiantado e reembolsado, de `contas_pagar.reembolsado_em`, sem as canceladas);
   - nas pendências: o `parcelaId` em `PARCELA` e a parcela que leva o reembolso (`conta_parcela_reembolso`) em `REEMBOLSO`;
   - `contratosJaEncerrados` (o número e a data), para a janela;
   - `quemContratos` (`quem_tem_area(…, 'CONTRATOS')`, `0190:352`), para o texto do estado 9;
   - **a regra da decisão 5**, se a Carol aprovar: o filtro `ps` deixa de fora os contratos que têm outro caso em andamento.
6. **O `ui`.**
   - O quadro e a janela saem de `FinanceiroRepasses.tsx` (~1060–1240) para um componente comum às duas fichas.
   - A janela passa a mostrar a seção de contratos também para quem não encerra contratos, e o contrato já encerrado.
   - A ficha do contrato (`Financeiro.tsx`, ~1000) ganha a folha e "De onde veio".
7. **O histórico.** O `financeiro.caso_encerrado` de hoje já basta. **Não entra** `origem` vinda do navegador (sugestão 4): o histórico já diz quem e quando.
8. **Textos de hoje que ficam errados sem levantamento**, para quem programar (sugestão 2):
   - `AcertoCaso.tsx:26` ("pagar … e encerrar"), `:56` ("Faltam pagamentos a terceiros") e `:76` (a linha "Depois", que só aparece quando há `entrou`);
   - `fichaLigada.ts:229`;
   - em `FinanceiroRepasses.tsx`, "tudo recebido e repassado" e "Voltar ao caso";
   - `Juridico.tsx:777`: na perda, o texto passa a ser "fica 'acerto pendente' até o Financeiro encerrar".
9. **Os casos já encerrados antes desta entrega** passam a "acerto pendente" com a regra nova, e alguns clientes "Cliente atendido" voltam a "Fechar o caso". Não há escritório em produção, então isso fica só como nota. Se houver dado de piloto, é preciso decidir antes de publicar.

## 6. Para o painel

- **Esta entrega atende** a EX-16 e a EX-17 no caso sem levantamento, e a FI-08 no fechamento a partir da ficha do contrato. A entrega cita as três em `refs` (o F3.132 hoje cita só EX-16 e EX-17).
- **Itens pendentes propostos** (cada um cita a mesma ideia):
  - **Baixa sem receber** de uma parcela vencida, com motivo (perdoada, inadimplência ou renegociada), só para quem tem `financeiro.editar`. É uma **ideia nova**: proponho o código **FI-24** na seção FI do `IDEIAS.md` (o total passa de 138 para 139). Fica pendente, citando FI-08 e EX-16, até a pergunta 2. Sem ela, um caso perdido com cliente que não paga fica "acerto pendente" para sempre.
  - **O aviso no sino quando o caso fecha no financeiro**, para quem encerra os contratos e para a responsável do caso. É prometido na decisão 16 aprovada da jornada ("recebe o aviso quando fechar") e não existe em 0512 nem em 0852. Fica pendente, citando EX-16 e EX-17. Até lá, os textos não prometem aviso.
  - **A regra do contrato com vários casos** (decisão 5): pendente citando FI-08, se a Carol decidir depois desta entrega.
- **Fica para depois, como ideia, se a Carol quiser** (sugestão 5): um aviso em A receber, "2 casos encerrados prontos para fechar". Sem levantamento, o caso não aparece em Repasses.

## 7. Onde discordei da revisão

- **Ajuste 7, estado `contrato-so-ver` (quem tem Financeiro mas não tem `financeiro.editar`): não desenho.**
  - No Portal só existem as funções `SOCIO` e `EQUIPE` (`0010_escritorios_vinculos.sql:39`, `0140_portal_equipe.sql:13`), e as duas têm `financeiro.ver` e `financeiro.editar` (`0220_portal_financeiro_receber.sql:12-14`). Com as permissões de hoje, ninguém fica nessa situação.
  - A ficha do repasse aprovada também não trata isso.
  - Se um dia houver uma função só de leitura, o padrão vale para as duas fichas de uma vez: sem botão, com "Quem encerra: …". Desenhar agora seria desenhar um estado que não acontece.
- **No resto concordo, conferido no código:**
  - não há cancelamento de parcela vencida (`0200:516`, `:547`);
  - as parcelas são somadas sem olhar o caso (`0640:503-509`);
  - o `href` fica nulo (`fichaLigada.ts:268`);
  - a regra de `pendente` (`0852:99-100`);
  - a rota (`app.ts:934`);
  - não há folha nem "De onde veio" (`Financeiro.tsx:1007-1091`);
  - a seção escondida (`FinanceiroRepasses.tsx:1181`);
  - não há aviso no sino em 0512 nem em 0852.
- **A pergunta 4 da revisão** (a caixa do reembolso já vir marcada) não vai à Carol: mantenho o aprovado (desmarcada), e ela vira a decisão 8.

## 8. Perguntas para a Carol

1. **A parcela que ainda vai vencer segura o fechamento do caso perdido?** Exemplo: o caso perdeu no 4º mês de um contrato de 6 parcelas.
   - **Recomendo que sim, como manda o FI-08.** O caso fica "acerto pendente" até a última parcela, e a folha diz a data, sem tom de atraso.
   - Quem quiser parar de cobrar encerra o contrato em Contratos, e as parcelas futuras se cancelam sozinhas, com o motivo. Isso já existe (`0200:547`).
2. **A parcela vencida que o cliente não vai pagar pode ter baixa com motivo, para o caso fechar?**
   - **Recomendo que sim:** "Dar baixa sem receber", com motivo (perdoada, inadimplência ou renegociada), só para quem tem `financeiro.editar`.
   - A parcela sai de "Em atraso" e fica no histórico. Isso muda o FI-08 de "tudo recebido" para "tudo recebido ou baixado com motivo".
   - Se a resposta for não, um caso pode ficar pendente para sempre.
   - É ideia nova (FI-24) e fica como item pendente nesta entrega.
3. **Num contrato que cobre mais de um caso, ou de mensalidade, as parcelas seguram o fechamento de cada caso?**
   - **Recomendo que não, enquanto o contrato tiver outro caso em andamento.** O quadro diz que as parcelas ficam com o outro caso, e o último caso a fechar leva o que faltar.
   - Sem essa regra, com o passo novo, todo caso encerrado de um contrato assim fica "acerto pendente" até o contrato inteiro ser pago.
