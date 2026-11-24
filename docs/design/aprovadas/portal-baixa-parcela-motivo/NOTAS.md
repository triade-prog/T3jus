# Portal: baixa de parcela vencida sem receber, com motivo · notas

**Aprovado pela Carol em 24/11/2026 às 15h14 (Bahia), com "ok" à mensagem que dizia que, com o aprovo, valiam as recomendações das 6 perguntas** (quem tem a área Financeiro dá a baixa; em Contratos, quem não tem Financeiro vê só "Fora da cobrança, por decisão do Financeiro."; a renegociada sai do Contratado e avisa no sino quem tem Contratos, com o combinado; a baixa pode levar junto o reembolso das custas, numa caixa desmarcada, ideia FI-25; para a IA, a parcela baixada é assunto da equipe; depois de desfazer, a próxima ação fica com quem desfez). Ainda não é código. É o item **F3.139** do painel ("Baixa de parcela vencida sem receber, com motivo, para que o caso que não vai receber feche no financeiro"). Atende a ideia **FI-24** e cita **FI-08** (o fechamento passa a valer com "tudo recebido ou baixado com motivo") e **EX-16** (o passo "Encerrar no financeiro" deixa de travar para sempre). Também pesam **FI-02** (no T3jus, "baixa" sozinha quer dizer recebido, por isso todo botão e aviso diz "sem receber"), **FI-04** (a cobrança fica no histórico), **IN-04** e **IN-07** (os relatórios não reescrevem o passado), **PT-02** (cada pessoa vê o mínimo), **PT-03** (nada é apagado) e **PT-10** (WCAG 2.2 AA, celular, vazio e erro).

É a resposta à pergunta 2 de `portal-fechamento-sem-levantamento`, aprovada pela Carol em 22/11/2026 às 23h28: "Dar baixa sem receber", com motivo (perdoada, inadimplência ou renegociada), só para quem tem `financeiro.editar`. O desenho segue o `PLANO.md` (v2) desta pasta, que já aplica as 21 notas da `REVISAO.md`, e já aplica a segunda leitura do desenho (`REVISAO-DESENHO.md`, 23 notas). Onde o desenho saiu do plano e o que foi feito com cada nota da segunda leitura estão no fim.

## Como abrir

- `index.html` abre sozinho (CSS, fontes e ícones dentro do arquivo). O botão **Estados**, no canto de baixo, troca de estado; o endereço aceita `?estado=…` (por exemplo `?estado=bx-janela`). Abaixo de 760 px vira celular. As janelas abrem e fecham (pelo botão, pelo X e pelo Esc), e os links principais entre os estados funcionam: o botão "Dar baixa sem receber" da linha abre a janela; o botão de confirmar leva ao erro, ao envio e à baixa feita; "Desfazer a baixa sem receber" leva à desfeita; "Tentar de novo" e "Ver como ficou" são botões que trocam de estado. O resto é desenho.
- `<estado>-computador.webp` (1440) e `<estado>-celular.webp` (390) (as capturas originais em PNG ficam em `t3jus/telas/portal-baixa-parcela-motivo/` nos arquivos do projeto): as capturas de cada estado. Com janela aberta, a captura cresce até caber a janela inteira.
- `_conferencia.json`: axe (WCAG 2.0, 2.1 e 2.2, A e AA), rolagem lateral, alvos pequenos e erros de script, por estado e tamanho.
- `_fonte/gerar.sh <pasta>` refaz tudo:
  - `baixa.py`: os 20 estados. Lê o `fechamento.py` aprovado até a parte "página", sem mudança (dali vêm a ficha do contrato, a folha "Fechamento do caso", as janelas de pendência e de encerrar e todo o CSS aprovado). Lê, só para ler, o HTML aprovado de `portal-nao-paga-logo` (o CSS `np-` da janela "Não foi paga", que é o padrão desta janela, e o ícone "desfazer") e de `portal-sino-caso-encerrado` (o painel do sino, o CSS `si-` e o script do painel);
  - `fechamento.py`, `jornada.py`, `ficha_ligada.py`, `clientes.py`, `juridico.py`, `comum.py` e `fotos.cjs`: cópias sem mudança das de `portal-fechamento-sem-levantamento`. A pasta das telas aprovadas vem de `APROV`, e o `axe.min.js` de `AXE_CORE`.

As peças novas têm o prefixo `bx-`.

## Os casos fictícios

O elenco e o "hoje" são os de sempre: Ribeiro & Matos, quarta-feira, 18/11/2026, 10h12. Com Financeiro: Marina Ribeiro (sócia dona), Diego Almeida (Comercial e Financeiro, sem Contratos) e Bianca Torres. Sem Financeiro: Felipe Matos (Comercial, Contratos e Jurídico) e Larissa Costa.

- **A. "Carvalho x Construtora Lume"**, o caso aprovado do fechamento, continuado. Noemi Bastos Carvalho, C-2026-012: parcelas 1 a 5 pagas; a **6/6, de R$ 1.000,00, venceu em 10/11**. Diego anotou em 13/11 "Noemi disse que não vai pagar porque perdeu a ação", com a próxima ação "falar com Marina", hoje. As custas de R$ 412,30 vão junto com a 6/6, a última parcela. Marina dá baixa com "Inadimplência" e "Noemi recusou pagar depois da perda; não vamos cobrar na Justiça." Cláudio (C-2026-013) está todo pago e encerrado.
- **B. Sebastião Lopes, C-2026-029**, caso "Lopes x Transportadora Rota Sul", em andamento: 6 mensalidades de R$ 900,00, dia 5, de agosto a janeiro, responsável Marina. A **3/6, de outubro, venceu em 05/10**; ele pagou R$ 400,00 em 20/10 (recibo 2026-061) e faltam R$ 500,00. Novembro foi pago em dia. As custas de R$ 86,40 (cópias e autenticações) iam com outubro. Diego combina por telefone "Parcelado: 2 × R$ 250,00, em dezembro e janeiro" e dá baixa do saldo com "Renegociada".

## Estados (20, cada um em computador e celular)

| # | Estado | Quem | Onde | O que mostra |
|---|---|---|---|---|
| 1 | `bx-ficha` | Marina | Financeiro › A receber › C-2026-012 | A base aprovada `contrato-pendente`. A última coluna vira **"Recibo e ações"**; na 6/6, "Registrar" (36 px, como hoje) e, abaixo, **"Dar baixa sem receber"** (44 px, sem ícone e sem fundo, mais leve que "Registrar"). No celular, os dois na largura do cartão. A cobrança traz a anotação de 13/11 |
| 2 | `bx-parcial` | Diego | C-2026-029, Sebastião | A linha paga em parte **antes** da baixa: "Recebido R$ 400,00 em 20/10. Faltam R$ 500,00.", o recibo 2026-061, o comprovante e "Dar baixa sem receber" (não há "Registrar" na linha, como no código). Sem "Ver o contrato", porque Diego não tem Contratos |
| 3 | `bx-janela` | Marina | Janela sobre o 1 | A parcela (6/6, venceu em 10/11/2026, há 8 dias, falta R$ 1.000,00), a última cobrança, o que vai acontecer, "As custas de R$ 412,30 ficam a reembolsar, em A pagar.", os três motivos sem nada marcado, a explicação e, com a pergunta 4, a caixa das custas **desmarcada** (aparece porque as custas de Noemi ficam sem parcela). O foco vai ao primeiro motivo |
| 4 | `bx-erros` | Marina | Janela | O resumo no topo ("Faltam 2 coisas para dar baixa sem receber. A parcela continua em atraso.", com um link para cada campo), o erro preso a cada campo (o do grupo de motivos logo depois da `legend`) e o foco no primeiro motivo |
| 5 | `bx-enviando` | Marina | Janela | Motivo e explicação preenchidos; o botão diz "Dando baixa sem receber…", com `aria-busy`, fica com o foco e não aceita um segundo envio. Um `role="status"` escondido diz o mesmo ao leitor de tela |
| 6 | `bx-renegociada` | Diego | Janela sobre o 2 | "Recebido R$ 400,00 de R$ 900,00. A baixa é só dos R$ 500,00 que faltam.", "O que já entrou continua recebido, com o recibo 2026-061.", "As custas de R$ 86,40 passam a ir junto com a mensalidade de dezembro.", "Renegociada" marcada, sem a caixa das custas, o rótulo "O que foi combinado" com a ajuda "Marina e Felipe vão ler este texto no aviso de Contratos: escreva só o que foi combinado.", e "Quem muda as condições é a área Contratos (Marina e Felipe). Eles recebem um aviso com o que foi combinado." |
| 7 | `bx-falha` | Marina | Janela | `role="alert"`: "Não deu para dar baixa sem receber. Nada mudou: a parcela continua em atraso. O que você escreveu continua aqui.", o código PTL-7B31-2204 e o botão "Tentar de novo" |
| 8 | `bx-conflito` | Marina | Janela | A descrição "Nada mudou por aqui. Confira a parcela antes de decidir."; "Diego Almeida registrou R$ 500,00 nesta parcela às 10h13. A baixa sem receber não foi feita. Veja como ficou antes de decidir."; sem o quadro de três números, só "Quando você abriu: faltavam R$ 1.000,00", quem mudou e como ficou; os campos saem e o foco vai ao botão "Ver como ficou". A variação `PARCELA_JA_BAIXADA` ("Bianca Torres já deu baixa nesta parcela às 10h13. Nada mais mudou.") usa a mesma janela e o mesmo botão |
| 9 | `bx-feita` | Marina | C-2026-012, sem a pergunta 4 | O aviso "A parcela 6/6 de Noemi saiu de Em atraso sem receber."; a linha sem o tom de atraso, com o selo neutro "Baixa sem receber" e "Desfazer a baixa sem receber", que recebe o foco; no computador, logo abaixo, uma linha de detalhe da coluna Situação até o fim, com "Inadimplência · por Marina Ribeiro em 18/11", a explicação em Alegreya itálico e as custas; "Em atraso R$ 0,00" e o quinto número "Baixado sem receber R$ 1.000,00" na largura toda. O âmbar diz como as coisas estão: "Falta o reembolso das custas, R$ 412,30. Sem parcela de Noemi para ir junto, ficou a reembolsar em A pagar." A cobrança diz que nenhuma parcela de Noemi está em cobrança, e o histórico fica |
| 10 | `bx-pronto` | Marina | C-2026-012, com a pergunta 4 | As custas tiveram baixa junto. O âmbar vira "Encerrar o caso no financeiro"; o quadro diz "5 de 6 parcelas recebidas · R$ 5.000,00 · parcela 6/6 baixada sem receber (inadimplência), por Marina em 18/11", as custas "reembolso baixado sem receber" e "Falta: nada · tudo recebido ou baixado sem receber: R$ 1.000,00 da parcela 6/6". O aviso traz "Ver o fechamento" |
| 11 | `bx-encerrar` | Marina | Janela de encerrar | A janela aprovada, com "Recebido no caso R$ 6.500,00 · 2 contratos", **"Baixado sem receber R$ 1.000,00 · parcela 6/6 de Noemi, inadimplência"** e "Reembolsado R$ 0,00 · as custas de R$ 412,30 tiveram baixa sem receber". A descrição diz "Tudo foi recebido ou baixado com motivo." |
| 12 | `bx-pendencia` | Marina | Janela `fechar-bloqueado` | "O financeiro do caso só encerra com tudo recebido ou baixado com motivo." e o texto de ajuda novo, que termina em "As custas de R$ 412,30 saem junto só se você marcar isso na mesma janela."; no pé, o atalho secundário "Dar baixa sem receber" ao lado de "Registrar recebimento da parcela 6/6" |
| 13 | `bx-desfazer` | Marina | Janela sobre o 9 | O que foi baixado, por quem e quando, com a explicação; "As custas de R$ 412,30 voltam a ir junto com esta parcela."; o que acontece (volta para Em atraso, a anotação "Baixa desfeita" com a próxima ação amanhã para quem desfez, Marina, porque Felipe não tem Financeiro, a régua só daqui para a frente, as duas linhas no histórico); "Por que desfazer", obrigatório |
| 14 | `bx-desfazer-renegociada` | Diego | Janela, C-2026-029 | "Se o combinado já virou parcelas novas em Contratos, desfazer cobra o valor duas vezes. Confira as condições do contrato antes." e "As custas de R$ 86,40 voltam a ir junto com esta parcela.". No fundo, a ficha depois da baixa: Contratado R$ 4.900,00 "sem os R$ 500,00 renegociados" e o bloco "Renegociado R$ 500,00 · vira parcelas novas em Contratos" (pergunta 3a) |
| 15 | `bx-desfazer-encerrado` | Marina | Janela, C-2026-012 encerrado | "O caso Carvalho x Construtora Lume continua encerrado no financeiro desde 18/11. A parcela volta para A receber deste contrato.", e a baixa das custas que se desfaz junto |
| 16 | `bx-desfeita` | Marina | C-2026-012 | A parcela de volta em "Em atraso", com a nota "Baixa sem receber desfeita hoje, por Marina Ribeiro"; o âmbar "Próxima ação: amanhã, falar com Noemi."; o aviso "A parcela 6/6 voltou para Em atraso. A próxima ação é falar com Noemi amanhã, com você.", com "Registrar recebimento"; na cobrança, "Última anotação" e a responsável Marina; o foco em "Dar baixa sem receber"; na cobrança e em "De onde veio", a baixa e o desfazer, cada um com quem, quando e por quê |
| 17 | `bx-contratos` | Marina | Contratos › C-2026-012 › Recebimentos | O selo "Baixa sem receber" na coluna Situação; em "O quê", o motivo, quem, quando e a explicação; o âmbar "Parcela 6 de 6: baixa sem receber em 18/11"; o pé "Pagamentos, atrasos e baixas sem receber são registrados lá."; a aba diz "Recebimentos 6" e o programado, "Parcelado · 6 recebimentos programados · 1 com baixa sem receber" |
| 18 | `bx-sem-financeiro` | Felipe | O mesmo, sem Financeiro | A linha **sem risco**, com "Fora da cobrança, por decisão do Financeiro.": sem motivo, sem quem, sem explicação e sem botão. A coluna Situação não existe para ele, como hoje. A contagem continua 6 |
| 19 | `bx-sino` | Diego | Sino | O item aprovado do F3.147 com o motivo novo `BAIXA`: "Marina Ribeiro deu baixa sem receber na parcela 6/6, e nada falta receber de Noemi Bastos Carvalho. Confira o acerto e encerre." Marina, que deu a baixa, não recebe |
| 20 | `bx-sino-contratos` | Felipe | Sino | **Só com o sim da pergunta 3b.** "Condição nova a registrar no C-2026-029, de Sebastião Lopes": "Diego Almeida combinou uma condição nova com Sebastião Lopes: Parcelado: 2 × R$ 250,00, em dezembro e janeiro, combinado com Sebastião por telefone hoje. Mude as condições do C-2026-029." (o texto exato gravado, sem quebra em "R$ 250,00" nem no número do contrato), selo de atenção "Mudar as condições" |

Ficam só nas notas, sem estado próprio (seção 4 do plano):
- o vazio de A receber depois da baixa, que é o aprovado sem mudança;
- `PARCELA_JA_BAIXADA`, como variação do estado 8;
- o texto do carnê: "a parcela 6/6 teve baixa sem receber" e "a parcela 6/6 voltou para A receber";
- `PARCELA_NAO_VENCIDA` ("Esta parcela ainda não venceu. Para parar de cobrar as próximas, mude as condições ou encerre o contrato, em Contratos."), `RENEGOCIADA_CONTRATO_ENCERRADO`, `PARCELA_NAO_BAIXADA`, os erros de permissão que já existem (`AREA_NAO_LIBERADA` e o 401 genérico) e `PARCELA_BAIXADA` em "Registrar recebimento", "Anotar cobrança" e "Foi paga, sim" ("Esta parcela teve baixa sem receber. Desfaça a baixa antes.");
- o contrato encerrado: "Renegociada" não aparece, e no lugar dela a janela diz "Com o contrato encerrado, não há nova cobrança pelo T3jus. Se o cliente ainda vai pagar, deixe a parcela em atraso e registre quando entrar." (o `radios(reneg=False)` do gerador já monta esse grupo);
- o êxito baixado na divisão do alvará ("Desfazer a baixa antes de dividir");
- a linha "Quem dá baixa: Marina Ribeiro, Diego Almeida ou Bianca Torres", para uma função só de leitura que não existe hoje.

## Decisões de design

1. **A ação mora na linha da parcela, em "Recibo e ações", e pesa menos que "Registrar".** A coluna "Recibo" do código (`Financeiro.tsx:1143`) muda de nome e ganha largura. No desenho, as larguras ficam 11, 10, 8, 24, 14 e 33%, porque a folha "Parcelas" tem 684 px a 1440 e o botão de 44 px com "Dar baixa sem receber" precisa de 193 px numa linha só (medido). Os botões ficam um abaixo do outro: recibo e comprovante, "Registrar" e "Dar baixa sem receber". O botão novo não tem ícone (o cifrão sugeria dinheiro entrando) e não tem fundo: contorno e texto vinho, para a altura maior não parecer a ação principal. O botão de confirmar da janela usa o ícone de visto. Só a parcela `VENCIDA` tem o botão (inclui a vencida paga em parte). A lista de A receber e o âmbar "Em atraso" não mudam: o âmbar segue com um botão principal só.
2. **Tamanho dos botões (F3.165 pendente).** Os botões novos ("Dar baixa sem receber" e "Desfazer a baixa sem receber") têm 44 px. "Desfazer a baixa sem receber" quebra em duas linhas na coluna, no computador. O "Registrar" compacto e o resto da tabela seguem a 36 px até o F3.165 ser aprovado; por isso, na mesma célula, os dois botões têm alturas diferentes. Não é erro: é a regra da nota 20 da revisão, para ninguém comparar telas diferentes.
3. **A janela é a confirmação** e segue o padrão aprovado do "Não foi paga" (`np-`): a parcela num quadro de três números, a última anotação de cobrança, a lista "o que vai acontecer" num fundo sal, a linha das custas com contorno, os motivos em cartões de rádio e a explicação obrigatória. Não há segunda pergunta "Tem certeza?". O botão de confirmar diz o que faz e nunca fica desabilitado. No celular, o pé fica empilhado na largura toda em todos os estados da janela. A frase "Só quem tem a área Financeiro dá baixa sem receber." saiu do pé.
4. **O rótulo da explicação muda com o motivo**: "Por que e quem decidiu" (perdoada), "O que aconteceu" (inadimplência) e "O que foi combinado" (renegociada, com o exemplo). Sem motivo escolhido, o rótulo é "Explicação". A ajuda é sempre "Escreva em uma ou duas frases. Fica no contrato para quem vier depois."
5. **Para onde vão as custas aparece sempre**, numa linha com contorno, antes dos motivos: na janela, no desfazer e na linha da parcela depois da baixa. A caixa da pergunta 4 fica no fim da janela, desmarcada, porque perdoar o honorário não é perdoar a despesa que o escritório pagou, e **só aparece quando as custas ficariam sem parcela** ("a reembolsar, em A pagar", como Noemi). Quando as custas passam para outra parcela (Sebastião) ou o motivo é "Renegociada", fica só a linha.
6. **A parcela baixada continua na tabela**, sem o tom de atraso: fundo branco e um fio à esquerda em #AC788D (o tom de "previsto", que nunca é texto), com o selo neutro. No computador, a nota, a explicação e as custas vão para uma linha de detalhe logo abaixo (da coluna Situação até o fim), com o mesmo fio à esquerda, e o "Desfazer" aponta para ela com `aria-describedby`; a linha da parcela fica da altura das outras. No celular, tudo fica no cartão. O cabeçalho continua contando 6 parcelas.
7. **O quinto número "Baixado sem receber"** só aparece quando há baixa no contrato, na largura toda e em fundo sal, para não deixar um número sozinho numa linha (nota 20). Quando só há renegociada, o bloco se chama "Renegociado R$ 500,00", com "vira parcelas novas em Contratos", e o Contratado ganha a linha "sem os R$ 500,00 renegociados" (pergunta 3a). No celular, o bloco tem 16 px até o primeiro cartão.
8. **O foco vai aonde a ação deixou a pessoa**: depois da baixa, ao "Desfazer a baixa sem receber" da linha; enquanto envia, no botão que enviou; depois do desfazer, ao "Dar baixa sem receber", que volta a existir; ao abrir a janela, ao primeiro motivo; no erro, ao primeiro motivo; no conflito, a "Ver como ficou"; na falha, a "Tentar de novo"; no desfazer, ao campo "Por que desfazer". Ao fechar uma janela, o foco volta ao botão de onde ela saiu.
9. **Em Contratos, quem tem Financeiro** vê o selo na coluna Situação e o motivo, quem e quando sob o "O quê". **Quem não tem** vê a linha sem risco, com a nota neutra, e sem nenhum dado da baixa. Nos dois casos a parcela conta nas 6.
10. **O sino não traz valor em reais** (como o aprovado do F3.147). O aviso a Contratos cita exatamente o combinado gravado, e não o atraso nem o motivo; a ajuda do campo avisa quem vai ler (pergunta 3b).
11. **Depois de desfazer, a próxima ação fica com quem cuida do contrato; se essa pessoa não tem Financeiro, fica com quem desfez** (pergunta 6). Na Noemi, Felipe cuida do contrato e não tem Financeiro, então a próxima ação fica com Marina. Na cobrança, o rótulo é "Última anotação", não "Motivo do atraso".
12. **O aviso de confirmação fica preso no pé da tela** e, no celular, a página reserva o espaço dele (`scroll-padding-bottom`) para o botão com foco nunca ficar por baixo (2.4.11). Um aviso com botão ("Ver o fechamento", "Registrar recebimento") não some sozinho: só fecha pelo X.
13. **Se a pessoa fechar a janela enquanto envia** (o X e "Voltar" continuam ali), a baixa segue no servidor e o aviso de confirmação ou de falha aparece na ficha, como em `bx-feita` ou `bx-falha`, para ninguém ficar sem saber se a baixa sem receber foi feita.

## Acessibilidade (WCAG 2.2 AA)

- axe sem violação nos 20 estados, no computador e no celular (`_conferencia.json`). Sem rolagem lateral e sem erro de script. O único alvo apontado é a marca "T3jus" do trilho (24 px de altura), o mesmo do aprovado.
- O grupo de motivos é um `fieldset` com `legend`; no erro, a mensagem vem logo depois da `legend`, antes das opções, o grupo tem `aria-describedby` para a mensagem e cada rádio tem `aria-invalid`. A explicação tem `aria-describedby` para a ajuda e para o erro.
- O resumo de erros é `role="alert"`, com um link de 44 px para cada campo.
- A falha e o conflito são `role="alert"`; o aviso de confirmação, `role="status"`.
- Enquanto envia, o botão usa `aria-busy` e um `role="status"` escondido diz "Dando baixa sem receber na parcela 6/6."
- Cada botão da linha tem texto escondido com a parcela e a data ("Dar baixa sem receber: parcela 6/6, de 10/11/2026"; "Desfazer a baixa sem receber: parcela 6/6"). O "Desfazer" tem `aria-describedby` para a linha de detalhe.
- "Tentar de novo", "Ver como ficou" e os botões de confirmar são `<button>`, não links.
- O selo "Baixa sem receber" tem texto, não só cor. O valor em reais nunca quebra entre o "R$" e o número.
- A janela de desfazer é um `dialog` comum, porque não destrói nada: a baixa fica no histórico.
- Testado no navegador: os botões das janelas trocam de estado; o botão da linha abre a janela, o Esc fecha e devolve o foco ao botão; o atalho da janela de pendência fecha uma e abre a outra; o Esc fecha o painel do sino.

## O que muda no servidor e no `ui` (resumo da seção 3 do plano)

Migration **`1010_baixa_parcela.sql`** (se crescer, a parte das perguntas 3 e 4 vai para a `1011`).

1. **A baixa é um cancelamento marcado**, com a tabela nova **`parcela_baixas`**, só de inserção, com `escritorio_id` e `proteger_tabela_escritorio`: `tipo` (`BAIXA` ou `DESFEITA`), `motivo`, `explicacao` (3 a 1.000 caracteres, obrigatória nos dois tipos), `valor` (o que faltava), `recebido_antes`, `reembolso_conta_id` (pergunta 4), `feito_por` e `feito_em`. Entra no `inventario_dados`. `recebimentos_previstos` ganha `baixa_id`; na baixa, `cancelado_em = app_now()` e `cancelado_motivo = 'Baixa sem receber'` (texto fixo, sem o motivo).
2. **Situação `BAIXADA`** em `parcela_situacao`, `parcela_linha.baixa`, `SituacaoParcela` e `seloParcela` ("Baixa sem receber", neutro). No `ui`: a classe da linha, o filtro do botão do carnê, a coluna "Recibo e ações" e a revisão das comparações com `"CANCELADA"`.
3. **Duas funções** `security definer`, como o "Não foi paga" (área, ação e `portal_exigir_escrita`): `portal_financeiro_parcela_baixar` e `portal_financeiro_parcela_baixa_desfazer`, com trava da linha e as recusas da decisão 14. Rotas `POST …/parcelas/:id/baixa` e `…/baixa/desfazer`. No desfazer, a próxima ação vai para quem cuida do contrato só se essa pessoa tiver Financeiro; senão, para quem desfez (pergunta 6). O histórico vai para a entidade `recebimentos_previstos`, nunca para `contratos`.
4. **O que já entrou não some:** `caso_acerto_parcelas` separa pendências (sem as canceladas) de totais (com as baixadas); "Recebido no mês" de A receber sai de `pagamentos_recebidos`.
5. **"Contratado"** conta Perdoada e Inadimplência, não Renegociada; a ficha ganha `totais.baixado` e `totais.renegociado`.
6. **Régua de WhatsApp:** `automacao_pagou` só conta dinheiro recebido; a parcela cancelada encerra a execução como `FICOU_DE_FORA` ("A parcela teve baixa sem receber" ou "A parcela foi cancelada no contrato"). Corrige também o caso de hoje da condição mudada.
7. **Sino do caso pronto** (0990) ganha o motivo `BAIXA`; **carnê** ganha `BAIXADA` e `BAIXA_DESFEITA`; **"Não foi paga"**: a regra "em vigor" passa a `cancelado_em is null or baixa_id is not null` no índice, em `JA_MUDADA` e em `corrigida`.
8. **Relatórios:** `relatorio_abertas` lê os períodos de `parcela_baixas`, e o desfazer não reescreve um mês passado.
9. **Pergunta 4:** a baixa das custas fica só em `parcela_baixas.reembolso_conta_id`, lida por `conta_reembolso_baixado(c)` em todos os leitores do "a reembolsar". A caixa só é oferecida quando o reembolso ficaria sem parcela, e nunca com "Renegociada". **Pergunta 3:** o tipo de sino `BAIXA_RENEGOCIADA`, com o texto gravado.
10a. **Para o aviso de cobrança em dobro** (estado 14): o servidor sabe se as condições do contrato mudaram depois da baixa; com isso, a janela pode dizer "As condições do C-2026-029 mudaram em 18/11, depois da baixa. Desfazer cobra os R$ 500,00 duas vezes." ou "As condições ainda não mudaram." (nota 20 da segunda leitura).
10. **Recusas novas** em "Registrar recebimento", "Anotar cobrança" e "Foi paga, sim" (`PARCELA_BAIXADA`); a divisão do alvará confere de novo depois da trava.
11. **Testes pgTAP** das quatro notas que bloqueavam (régua, Contratos sem Financeiro, recebido parcial no acerto, "Não foi paga") e do relatório de um mês passado.

## Para o painel

- **Muda um texto aprovado:** o pé de Contratos › Recebimentos passa de "Pagamentos, atrasos e baixas são registrados lá." para "…baixas sem receber…", nas telas que o mostram (nota 18 da segunda leitura).
- **Esta entrega atende a FI-24 inteira.** O F3.139 continua citando FI-24, FI-08 e EX-16 em `refs`. No mesmo commit, o texto da FI-08 no `IDEIAS.md` passa a "só encerra com tudo recebido ou baixado com motivo, e tudo repassado", sem mudar o código da ideia.
- **Com o sim da pergunta 4**, a baixa do reembolso entra na mesma entrega e o F3.139 cita também a **FI-25**, criada no `IDEIAS.md` no mesmo commit (o total passa de 139 para 140). **Com o não**, entra o pendente "Reembolso de despesa que o cliente não vai pagar", citando FI-08 e EX-16.
- **Item pendente proposto:** o número "Baixado sem receber" nos Relatórios, por período e por cliente, citando IN-04 e IN-07.
- **Ideia para depois, se a Carol pedir:** ligar a parcela renegociada às parcelas novas (entra primeiro no `IDEIAS.md`).
- **Depois do sim da Carol**, a pasta vai para `docs/design/aprovadas/portal-baixa-parcela-motivo/`.

## Perguntas para a Carol

1. **Quem pode dar baixa sem receber?**
   - **Recomendo:** quem tem a área Financeiro (Marina, Diego e Bianca). Quem, quando e por quê ficam à vista, e dá para desfazer.
   - Alternativa: só a sócia, com uma ação nova `financeiro.baixar`.
2. **O que vê em Contratos quem não tem Financeiro?** (estado 18)
   - **Recomendo:** a linha neutra "Fora da cobrança, por decisão do Financeiro.", sem motivo, quem nem explicação.
   - Alternativa: o selo "Baixa sem receber", que já conta que o cliente não pagou.
3. **Como fica a "Renegociada"?** (estados 6, 14 e 20)
   - **a. Conta no Contratado?** Sebastião tem 6 × R$ 900,00 = R$ 5.400,00, pagou R$ 400,00 da 3/6 e renegociou R$ 500,00. **Recomendo que não:** Contratado R$ 4.900,00 "sem os R$ 500,00 renegociados", e o bloco "Renegociado R$ 500,00". Alternativa: Contratado continua R$ 5.400,00, e a soma passa a ter R$ 500,00 que não foram recebidos nem estão em atraso.
   - **b. Quem dá a baixa sem ter Contratos (Diego) avisa como?** **Recomendo:** o sino para quem tem Contratos, com o texto do combinado, e a ajuda do campo dizendo que Marina e Felipe vão ler. Alternativa: o aviso sem o texto ("Diego Almeida combinou uma condição nova com Sebastião Lopes. Veja com ele."), que não leva nada escrito à mão para quem não tem Financeiro.
4. **A baixa pode levar junto o reembolso das custas?** A caixa só aparece quando as custas ficariam sem parcela, como as de Noemi, que hoje seguram o fechamento para sempre (estado 9).
   - **Recomendo que sim**, desmarcada, com o mesmo motivo e a mesma explicação (estados 3 e 10). É a ideia nova FI-25.
   - Se for não, a caixa sai e fica só a linha que diz para onde as custas vão.
5. **O que a IA do escritório diz ao cliente sobre uma parcela baixada?**
   - **Recomendo:** "assunto da equipe", sem valor nem motivo; se o cliente perguntar, a IA passa para uma pessoa.
   - Alternativa: a IA não saber dela, e responder "nada em aberto".
6. **Depois de desfazer, quem fica com a próxima ação quando quem cuida do contrato não tem Financeiro?** (estados 13, 15 e 16)
   - **Recomendo:** quem desfez (aqui, Marina), que acabou de decidir voltar a cobrar.
   - Alternativa: quem cuidava da cobrança antes da baixa (aqui, Diego).

## Onde o desenho saiu do plano

- **O contrato de Sebastião é o C-2026-029, não o C-2026-019.** O C-2026-019 já é a Farmácia Bom Jesus nas telas aprovadas de Contratos (e virou a Auto Peças na jornada). O C-2026-029 não aparece em nenhuma tela aprovada.
- **As custas de Sebastião passam a ir com dezembro, não com novembro.** No caso fictício, novembro foi pago em dia, então a próxima parcela em aberto é a de dezembro. **Para quem programar:** conferir se `conta_parcela_reembolso` (`0511:21-45`) pula a parcela já paga; se não pular, as custas iriam para uma parcela paga e ficariam sem cobrança, e a janela teria de dizer isso.
- **Contratado de Sebastião depois da renegociada: R$ 4.900,00.** O plano diz que a renegociada não conta no Contratado, mas não diz o que fazer com a parte já recebida de uma parcela paga em parte. O desenho conta os R$ 400,00 que entraram e tira os R$ 500,00 renegociados; assim "Recebido" (R$ 3.100,00) nunca passa de "Contratado". Agora é a pergunta 3a.
- **Textos do plano com "sem receber":** o plano (seção 5) tinha "Dando baixa…" e "Desfazer a baixa"; o desenho diz "Dando baixa sem receber…" e "Desfazer a baixa sem receber" (FI-02). O plano precisa mudar junto.
- **A caixa das custas** (decisão 12 do plano) só aparece quando as custas ficariam sem parcela, e nunca com "Renegociada".
- **Próxima ação depois de desfazer:** a regra "quem cuida do contrato", do aprovado `portal-nao-paga-logo`, ganha a reserva "se não tem Financeiro, quem desfez" (pergunta 6).
- **Larguras da tabela.** O plano propunha Situação 24% e a última coluna 21% (sobre as larguras do código). No desenho a última coluna fica com 33%, porque com 21% o botão de 44 px quebraria em duas linhas. Parcela, Vence e Forma ficam mais estreitas.
- **"Por que e quem decidiu" e "O que aconteceu" só aparecem quando o motivo está marcado.** Sem motivo, o rótulo é "Explicação" (o plano não dizia o rótulo antes da escolha).
- **No conflito, os campos saem da janela**, como no "Não foi paga" aprovado; o texto diz "O que você escreveu não foi salvo." O plano não dizia se o texto escrito ficava.
- **No estado 9 (sem a pergunta 4)**, o âmbar passa a mostrar o que falta no fechamento ("Falta o reembolso das custas, R$ 412,30…", com "Ver em A pagar"), porque não há mais nada em atraso; a janela de pendência desse estado lista só as custas, com o atalho "Ver em A pagar".
- **No estado 15**, o desfazer aparece sobre o caso encerrado com a pergunta 4 (custas baixadas junto), porque é o único jeito de o caso de Noemi ter fechado; a janela diz que a baixa das custas também se desfaz.
- **No estado 17**, a contagem por condição aparece no programado ("Parcelado · 6 recebimentos programados"), porque a frase "Gera:" fica na aba Contrato, que não foi desenhada.
- **O sino de Felipe (estado 20)** tem título próprio, "Condição nova a registrar no C-2026-029, de Sebastião Lopes", ícone de pena e o destino "Abrir o C-2026-029 em Contratos"; o plano só dava o texto do detalhe.
- **Capturas em PNG**, como pedido para esta entrega (os aprovados usam WebP).

## Segunda leitura do desenho

O que foi feito com cada nota de `REVISAO-DESENHO.md`. Todas as capturas e o `_conferencia.json` foram refeitos: axe sem violação nos 40, sem rolagem lateral e sem erro de script.

**Bloqueia**
1. **Feito.** `bx-encerrar` diz "Recebido no caso R$ 6.500,00 · 2 contratos". Busquei outros números do aprovado no `index.html`: não sobrou nenhum R$ 7.500,00; Reembolsado, Falta e a descrição já estavam trocados.

**Ajustar**
2. **Feito.** Todos os textos da tabela dizem "sem receber": resumo do erro, título da falha, "Dando baixa sem receber…", "A baixa sem receber não foi feita.", a caixa das custas, o título e os botões "Desfazer a baixa sem receber" (também no texto escondido) e "R$ 500,00 com baixa sem receber". Também a lista do desfazer ("A baixa sem receber e o desfazer ficam no histórico"). Registrado em "Onde saiu do plano".
3. **Feito.** Enquanto envia, o foco fica no botão "Dando baixa sem receber…". No celular, o pé é empilhado na largura toda em todos os estados da janela. O que acontece ao fechar durante o envio está na decisão 13.
4. **Feito.** O conflito não tem mais o quadro de três números; tem "Quando você abriu: faltavam R$ 1.000,00, em atraso", quem mudou e como ficou, e a descrição "Nada mudou por aqui. Confira a parcela antes de decidir."
5. **Feito**, na versão do sim da pergunta 4: a ajuda da pendência termina em "As custas de R$ 412,30 saem junto só se você marcar isso na mesma janela." Na janela de baixa, a linha do caso diz que as custas continuam segurando o caso, a não ser que tenham baixa junto.
6. **Feito.** A caixa saiu da renegociada; só aparece quando as custas ficariam sem parcela (Noemi). Decisão 5 e pergunta 4 atualizadas.
7. **Feito.** O sino cita o texto exato gravado; "R$ 250,00" e "C-2026-029" não quebram. Na renegociada, a ajuda do campo diz "Marina e Felipe vão ler este texto no aviso de Contratos: escreva só o que foi combinado." A alternativa (aviso sem texto) está na pergunta 3b.
8. **Feito**, com a regra de reserva "quem desfez" e a pergunta 6. Os textos de `bx-desfazer`, `bx-desfazer-encerrado`, `bx-desfeita` (cobrança, "De onde veio", âmbar e aviso) dizem Marina.
9. **Feito.** `bx-feita`: "Falta o reembolso das custas, R$ 412,30. Sem parcela de Noemi para ir junto, ficou a reembolsar em A pagar." `bx-desfeita`: "Próxima ação: amanhã, falar com Noemi."
10. **Feito.** No computador, nota, explicação e custas vão para uma linha de detalhe (`colspan`) da coluna Situação até o fim, com o "Desfazer" ligado a ela por `aria-describedby`; a linha da parcela tem a altura das outras. A célula Valor ganhou 14 px de respiro à esquerda.
11. **Feito.** Sem o cifrão na linha, no atalho da pendência e no botão de confirmar (que usa o visto); "Dar baixa sem receber" sem fundo, abaixo de "Registrar".
12. **Feito.** "Renegociado R$ 500,00 · vira parcelas novas em Contratos", Contratado com "sem os R$ 500,00 renegociados", espaço antes do `<small>` e a pergunta 3a.
13. **Feito.** "Tentar de novo", "Ver como ficou" e os botões de confirmar e de desfazer das janelas são `<button>` (o desenho troca de estado por `data-ir`).
14. **Feito.** `scroll-padding-bottom` no celular quando há aviso; a decisão 12 diz que aviso com botão só fecha pelo X (no desenho nenhum aviso some sozinho).

**Sugestões**
15. **Aplicada.** O erro "Escolha o motivo." vem logo depois da `legend`.
16. **Aplicada.** A frase do pé saiu dos dois tamanhos. Se a pergunta 1 mudar a regra, volta como "Quem dá baixa…".
17. **Aplicada.** "Parcela 6 de 6: baixa sem receber em 18/11" / "no Financeiro, em A receber".
18. **Aplicada.** "Pagamentos, atrasos e baixas sem receber são registrados lá." É mudança em texto aprovado, anotada em "Para o painel".
19. **Aplicada** na forma curta: "Falta: nada · tudo recebido ou baixado sem receber: R$ 1.000,00 da parcela 6/6". Não pus um quarto bloco na folha, para não mudar a grade aprovada.
20. **Só nas notas**, para quem programar (item 10a do servidor). O desenho mantém a frase condicional, que vale para os dois casos.
21. **Aplicada.** O rótulo passa a "Última anotação".
22. **Aplicada**, dentro do limite de 6 perguntas: a 3 tem duas partes curtas (3a Contratado, 3b aviso), a 4 diz quando a caixa aparece e a 6 é nova. A 1, a 2 e a 5 ficaram mais curtas.
23. **Aplicada.** 16 px entre o bloco "Baixado sem receber" e o primeiro cartão, no celular.

