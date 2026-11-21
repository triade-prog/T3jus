# Portal: recibo em PDF, contas que repetem e pedidos de contrato · notas

Desenho para a Carol aprovar antes de virar código. São três peças pequenas, todas sobre telas já aprovadas:

1. **Recibo em PDF** (FI-14, item F3.19).
2. **Mudar o valor ou encerrar uma conta que repete todo mês** (FI-13, item F3.24).
3. **Pedidos de contrato em Contratos** (IN-01, item F3.11).

As telas aprovadas não mudaram. O gerador importa sem mudança o `financeiro.py`, o `contratos.py`, o `comercial.py`, o `pecas.py` e o `comum.py` aprovados, lê em partes o `sino.py` aprovado (o painel de avisos) e acrescenta os estados novos com peças de prefixo `rb-` (recibo), `rc-` (recorrente) e `pc-` (pedidos de contrato).

## Como abrir

- `index.html` apresenta o desenho para aprovação: as três peças, cada estado com a captura de computador (1440) e de celular (390), e o link para o HTML. Funciona publicado junto com os arquivos desta pasta (caminhos relativos).
- `recibo-a4.html` é o modelo imprimível do recibo, com CSS de impressão real (`@page { size: A4 }`, uma página). Na tela mostra a barra do produto ("Voltar ao contrato" e "Baixar PDF ou imprimir") e, só no desenho, as variações (`?estado=padrao`, `multa`, `terceiro`, `pb`). As duas barras somem na impressão. No celular, a folha aparece inteira, reduzida.
- `recibo-exemplo.pdf` é o PDF real do estado padrão, gerado pelo Chromium com `page.pdf({format:'A4'})`, que é o mesmo caminho do "Salvar como PDF" do navegador. Tem 1 página A4.
- `financeiro.html?estado=…`, `contratos.html?estado=…` e `comercial.html?estado=pc-pedido-feito` seguem o padrão das telas aprovadas (`<template data-est>`). Abaixo de 760 px viram celular. Funcionam as janelas (abrir, fechar, Esc), o sino e os links entre os estados principais; o resto é desenho.
- `_fonte/gerar.sh` refaz tudo (HTML, PDF, capturas WebP e axe):
  - `rr_dados.py`: dados fictícios e o valor por extenso;
  - `recibo_a4.py`: o modelo A4 do recibo;
  - `telas.py`: os estados novos do Financeiro, de Contratos e do Comercial;
  - `casos_rr.py`: a lista de estados e o `index.html`;
  - `fotos.cjs`: o PDF, as capturas e as conferências;
  - `comum.py`, `financeiro.py`, `contratos.py`, `comercial.py`, `pecas.py`, `sino.py` e `webp.py`: cópias sem mudança das aprovadas.

## Estados (22, cada um em computador e celular)

| # | Estado | Onde | O que mostra |
|---|---|---|---|
| 1 | `rb-a4-padrao` | recibo-a4 | O recibo nº 2026-0187: parcela 3 de 6 de Hélio, R$ 850,00, Pix em 18/11 |
| 2 | `rb-a4-multa` | recibo-a4 | O mesmo, com multa (R$ 17,00) e juros (R$ 6,80): total R$ 873,80 |
| 3 | `rb-a4-terceiro` | recibo-a4 | Marta Corrêa pagou "em favor de" Hélio |
| 4 | `rb-a4-pb` | recibo-a4 | Prévia em preto e branco |
| 5 | `rb-ficha` | Financeiro › A receber | Na ficha do contrato, "Recibo 0187" (e os outros) abrem o recibo em outra aba; "Ver o recibo" no histórico |
| 6 | `rb-confirmacao` | Financeiro › A receber | "Recebimento registrado" com o botão "Ver o recibo" |
| 7 | `rb-confirmacao-sem-envio` | Financeiro › A receber | O mesmo, quando a opção do WhatsApp estava desmarcada |
| 8 | `rb-quem-pagou` | Financeiro › A receber | "Registrar recebimento" com a pergunta nova "Quem pagou" |
| 9 | `rc-lista` | Financeiro › A pagar | "Recorrentes do mês" aberto: as 8 contas, com "Mudar" e "Encerrar" em cada linha |
| 10 | `rc-ficha` | Financeiro › A pagar | Ficha da conta Aluguel da sala: próxima conta, contas lançadas e mudanças |
| 11 | `rc-mudar` | Financeiro › A pagar | Janela "Mudar valor ou dia", com "O que vai acontecer" |
| 12 | `rc-mudar-erros` | Financeiro › A pagar | Sem o mês e sem o valor |
| 13 | `rc-mudado` | Financeiro › A pagar | Mudança salva: R$ 3.780,00 a partir de dezembro |
| 14 | `rc-encerrar` | Financeiro › A pagar | Janela "Encerrar a recorrência" de Sistema de petições, com motivo |
| 15 | `rc-encerrar-erro` | Financeiro › A pagar | Sem o motivo |
| 16 | `rc-encerrada` | Financeiro › A pagar | Ficha "Encerrada em 18/11/2026" |
| 17 | `rc-lista-encerrada` | Financeiro › A pagar | Lista com 7 ativas e a encerrada embaixo, em "Encerradas" |
| 18 | `pc-um` | Contratos | Bloco "Pedidos de contrato" com 1 pedido (Benedito) |
| 19 | `pc-dois` | Contratos | O bloco com 2 pedidos (Benedito e Daniela) |
| 20 | `pc-sino` | Contratos | O aviso no sino: "Diego Almeida pediu o contrato de Benedito Souza Lima" |
| 21 | `pc-vazio` | Contratos | Sem pedidos: a lista aprovada, sem bloco |
| 22 | `pc-pedido-feito` | Comercial | O lado de Diego: "Contrato pedido" no lugar do botão |

## Decisões de design

### 1. Recibo em PDF

1. **O recibo é do escritório.** O timbrado traz o nome em serifa vinho (com "Advocacia"), a razão social, o CNPJ, o registro da sociedade na OAB, o endereço, o WhatsApp e o e-mail. O T3jus aparece só no rodapé, com o símbolo em vinho e "Modelo T3jus", como no carnê aprovado. A marca segue a decisão do carnê: o nome em letra agora e o logo depois, no mesmo lugar, quando o envio do logo existir (Escritório › Recebimento).
2. **Uma folha A4 por recibo**, sem canhoto e sem segunda via: o PDF é a via do cliente, e o escritório guarda o registro no sistema.
3. **O que vai no recibo:** número, valor em destaque, o texto corrido "Recebemos de… a quantia de R$ 850,00 (oitocentos e cinquenta reais), referente à parcela 3 de 6 dos honorários advocatícios do contrato C-2026-014 (ação revisional), mês de referência outubro de 2026, paga por Pix em 18/11/2026", a discriminação (parcela, multa e juros quando houver, total), os dados do pagamento (cliente, contrato, parcela, forma e data, e quem pagou quando não é o cliente), cidade e data, a assinatura do escritório e, embaixo dela, quem registrou e quando.
4. **Multa e juros** só aparecem quando quem registrou preencheu o campo aprovado "Multa e juros". O recibo soma ao valor, separa a multa (2%) e os juros (1% ao mês, 24 dias) e o extenso acompanha o total.
5. **Pago por outra pessoa.** "Recebemos de Marta Corrêa, CPF…, em favor de Hélio Batista Corrêa, CPF…". O cliente continua sendo Hélio, e a quitação é da parcela dele. Para isso, "Registrar recebimento" ganha a pergunta "Quem pagou": o cliente (padrão), o contato principal (com o CPF do cadastro) ou outra pessoa ou empresa (nome e CPF ou CNPJ).
6. **Quitação limitada:** "Este recibo dá quitação somente da parcela e dos valores descritos acima." Evita que um recibo de parcela pareça quitar o contrato.
7. **Preto e branco.** Tudo o que informa está em tinta ou em linha. O âmbar é só o filete do timbrado e o traço ao lado do registro.
8. **Onde baixar.** O PDF sai da impressão do navegador numa página própria (no produto, `/recibos/:id`), não do servidor. Os links "Recibo 0187" da tabela de parcelas (aprovada) abrem essa página em outra aba, e o mesmo vale para "Ver o recibo" no aviso "Recebimento registrado" e no histórico de cobrança. Na página, um botão só, "Baixar PDF ou imprimir", com a dica "Na janela que abrir, escolha Salvar como PDF". O título da página vira o nome do arquivo ("Recibo 2026-0187 · Hélio Batista Corrêa · Ribeiro & Matos").
9. **O número não se reaproveita.** Cada recebimento registrado tem o seu número, por escritório e ano, sem buracos. Desfazer um recebimento não está nesta peça; quando existir, o recibo deve ficar marcado como cancelado, e não ser apagado.
10. **WhatsApp:** nada muda. O envio aprovado ("Gerar o recibo e mandar pelo WhatsApp") continua como está, e o desenho não cria envio novo.

### 2. Contas que repetem todo mês

1. **Onde fica.** O número "Recorrentes do mês", que já existe em A pagar, abre a lista das contas que repetem. Cada linha mostra a categoria, o dia, o valor, desde quando a conta repete, o que aconteceu em novembro e dois botões: "Mudar" e "Encerrar". O nome abre a ficha da conta.
2. **A ficha da conta** usa o cabeçalho das fichas aprovadas: à esquerda, a conta (vinho); à direita, a próxima conta (âmbar), com "Mudar valor ou dia" e "Encerrar". Embaixo ficam as contas já lançadas, mês a mês, e ao lado as mudanças, com quem fez, quando e o motivo.
3. **Mudar valor ou dia** pede o mês a partir do qual vale (vem marcado o próximo, dezembro), o valor novo, o dia e o motivo, que é opcional. O quadro "O que vai acontecer" diz mês a mês o que muda e o que não muda. Dias de 1 a 28 ou "No último dia do mês", para não haver mês sem o dia escolhido.
4. **Encerrar** pede o mês a partir do qual nenhuma conta nasce e o motivo, que é obrigatório (lista fechada e um detalhe opcional). O quadro diz o que acontece. Encerrar não apaga nada: as contas lançadas e pagas ficam como estão, no histórico e na exportação para o contador.
5. **A conta do mês já lançada e ainda não paga** (recomendação, pergunta 3):
   - ao **mudar o valor**, ela muda só se a pessoa escolher o mês dela em "A partir de". O padrão é o mês seguinte, e a ajuda do campo explica: "Se o reajuste já vale para novembro, escolha novembro";
   - ao **encerrar**, ela continua a pagar. Só é cancelada se a pessoa marcar "Cancelar também a de novembro" (desmarcado), e nesse caso fica no histórico como cancelada, com o motivo;
   - **conta paga nunca muda.**
6. **Encerrada** aparece na ficha como "Encerrada em 18/11/2026", sem os botões de mudar. A conta de novembro aparece como "a última desta conta". Na lista, ela desce para "Encerradas", com a data, quem encerrou e o motivo. Voltar a repetir não está nesta peça: quem quiser lança a conta de novo com "Repete todo mês".
7. **O DAS**, cujo valor muda todo mês, continua com o valor do mês ajustado na própria conta, como no aprovado. "Mudar" serve para quando o valor de referência muda.
8. **Quem pode:** quem tem a área Financeiro, como lançar conta.

### 3. Pedidos de contrato

1. **Bloco discreto** no alto da lista de Contratos, entre o cabeçalho âmbar e a lista, só quando há pedido. É uma folha branca com filete âmbar à esquerda, o título "Pedidos de contrato" e a contagem. Cada pedido mostra o cliente (que leva à proposta), o número e o serviço, quando foi aceita, os honorários (o valor e os selos de tipo da lista aprovada), quem pediu e quando, e "Gerar o contrato".
2. **"Gerar o contrato"** abre o Novo contrato aprovado já preenchido com a proposta ("Veio da proposta P-2026-014, aceita em 17/11"). O botão é secundário, para não disputar com "Novo contrato".
3. **O pedido some** quando o contrato é gerado a partir daquela proposta (ou quando a proposta deixa de estar aceita no Comercial). Sem pedido, não há bloco: é a lista aprovada, sem mudança (`pc-vazio`).
4. **O aviso no sino** chega a todos que têm a área Contratos (Marina e Felipe), no sino aprovado, com o resumo da proposta e o link "Gerar o contrato". Quem pediu (Diego) recebe um aviso quando o contrato é gerado.
5. **O lado do Comercial.** Depois de pedir, a proposta de Diego mostra "Contrato pedido" no lugar do botão, quem recebeu o aviso e a linha no histórico. Não dá para pedir duas vezes.
6. **Ordem:** do pedido mais antigo para o mais novo.
7. Nos pedidos, o contrato de Benedito (C-2026-033) ainda não existe. Por isso a lista desses estados tem 14 contratos, e não 15 como na aprovada.

## Acessibilidade (WCAG 2.2 AA)

- **axe-core 4.10** (WCAG 2.0, 2.1 e 2.2, A e AA) em 44 capturas (22 estados × computador e celular): **nenhuma violação**. Nenhuma tela tem rolagem lateral e não houve erro de script. O resultado fica em `_conferencia.json`.
- **Alvos:** todos com 44 px ou mais; os botões compactos da tabela ("Mudar", "Encerrar") têm 36 px, como nas tabelas aprovadas. A única exceção é a palavra-marca "T3jus" da moldura aprovada (24 px), igual às outras áreas.
- **Links que abrem outra aba** dizem isso para o leitor de tela ("abre o recibo em outra aba").
- **Janelas:** `<dialog>` com `showModal()`; o foco vai para o primeiro campo, ou para o primeiro campo com erro. Erros ligados por `aria-describedby`, com `aria-invalid` e um resumo no topo.
- **No recibo:** a folha é um `article` com rótulo ("Recibo nº 2026-0187"), e a discriminação é uma tabela com cabeçalhos.

## Para o programador

Todas as tabelas novas têm `escritorio_id` e passam por `proteger_tabela_escritorio`. O escritório vem da sessão, nunca do navegador. Dinheiro em centavos.

### Recibo

- **Página** `/recibos/:id` (Portal, com sessão). Mostra o recibo em HTML com o CSS de impressão do modelo e só existe para quem tem a área Financeiro, ou Contratos para recibos de contrato. Recibo de outro escritório responde 404. O botão chama `window.print()`, e o `<title>` vira o nome do arquivo.
- `GET /v1/recibos/:id` devolve os dados do recibo **como estavam no registro** (cópia guardada, não montada de novo a cada vez): `numero`, `escritorio` (nome, razão, CNPJ, OAB, endereço, WhatsApp, e-mail, cidade), `cliente` (nome, CPF ou CNPJ), `pagador` (nome, CPF ou CNPJ, papel) ou nulo, `contrato` (número, objeto), `parcela` (n, total, mês de referência, vencimento), `valor_centavos`, `multa_centavos`, `juros_centavos`, `forma`, `pago_em`, `registrado_por` (nome, OAB), `registrado_em`. O valor por extenso pode sair no navegador.
- **Recebimento:** campos novos `pagador_tipo` (CLIENTE, CONTATO, OUTRO), `pagador_nome` e `pagador_doc` (CPF ou CNPJ com dígito conferido) em "Registrar recebimento". Erros: `PAGADOR_DOC_INVALIDO`, `PAGADOR_NOME_OBRIGATORIO`.
- **Cópia:** a tabela de recibos (a que já numera por escritório e ano) ganha `dados` (json com o que vai no papel), preenchido no mesmo momento do número.

### Contas que repetem

- Mudança e encerramento ficam numa tabela só de inserção, `recorrencia_mudancas`: `escritorio_id`, `recorrencia_id`, `tipo` (VALOR, ENCERRAR), `a_partir_de` (primeiro dia do mês), `valor_centavos` e `dia` (1 a 28, ou 0 para "último dia"), `motivo` (obrigatório em ENCERRAR, lista fechada), `detalhe`, `cancelou_conta_id`, `feito_por`, `feito_em`.
- A rotina do dia 1º lê a mudança que vale para o mês e não cria conta depois de um ENCERRAR.
- `POST /v1/recorrencias/:id/mudancas`: `{tipo, a_partir_de, valor, dia, motivo, detalhe, cancelar_lancada}`.
  - Se `a_partir_de` é o mês de uma conta já lançada e **não paga**, ela é atualizada (VALOR) ou cancelada se `cancelar_lancada` (ENCERRAR), com histórico.
  - Conta paga nunca muda.
  - Erros: `MES_PASSADO`, `VALOR_OBRIGATORIO`, `DIA_INVALIDO`, `MOTIVO_OBRIGATORIO`, `JA_ENCERRADA`, `AREA_NAO_LIBERADA`.
- `GET /v1/recorrencias` (ativas e encerradas, com o que aconteceu no mês) e `GET /v1/recorrencias/:id` (lançadas e mudanças).

### Pedidos de contrato

- Tabela `pedidos_contrato`: `escritorio_id`, `proposta_id` (único entre os abertos), `pedido_por`, `pedido_em`, `contrato_id` e `resolvido_em` (preenchidos quando o contrato é gerado da proposta), `encerrado_motivo` (PROPOSTA_MUDOU).
- `POST /v1/propostas/:id/pedido-contrato`: só a proposta aceita, só quem não tem Contratos. Erros: `PROPOSTA_NAO_ACEITA`, `JA_PEDIDO`, `JA_TEM_CONTRATO`. Cria o aviso no sino de cada pessoa com a área Contratos, com o link para o Novo contrato da proposta.
- `GET /v1/pedidos-contrato` (os abertos, para o bloco) só para quem tem Contratos.
- Ao criar o contrato a partir da proposta (`POST /v1/contratos` com `proposta_id`, que já existe), o pedido aberto se resolve na mesma transação, e quem pediu recebe o aviso "Contrato gerado".

### Para o painel

- O recibo atende **FI-14** (F3.19). As contas que repetem atendem **FI-13** (F3.24). Os pedidos de contrato atendem **IN-01** (F3.11).
- O logo do escritório no recibo depende do envio do logo, que ficou para depois no carnê. Se a entrega sair só com o nome em letra, vale um item "pendente" citando FI-14.

## Perguntas para a Carol

1. **Quem assina o recibo?** (Recomendo o escritório: razão social, CNPJ e registro na OAB, com a linha para assinar quando for impresso, e embaixo, pequeno, quem registrou e quando. Sem imagem de assinatura escaneada, que vira risco se o PDF circular.)
2. **CPF completo no recibo?** (Recomendo sim, completo. O recibo é a prova de pagamento do cliente e vai só para ele. O carnê, que circula mais, continua com o CPF parcial.)
3. **A conta do mês já lançada e não paga muda junto?** (Recomendo: ao mudar o valor, só se a pessoa escolher o mês dela em "A partir de", e o padrão é o mês seguinte. Ao encerrar, ela continua a pagar e só é cancelada se a pessoa marcar a opção, ficando no histórico como cancelada. Conta paga nunca muda.)
4. **Dá para dispensar um pedido de contrato sem gerar o contrato?** (Recomendo que não, por enquanto. O pedido sai só quando o contrato é gerado ou quando a proposta deixa de estar aceita no Comercial. Assim nenhum pedido some sem resposta.)

## O que precisei supor

- O recibo de exemplo é o nº 2026-0187, da parcela 3/6 de Hélio, registrado por Marina em 18/11, às 15h20, como no Financeiro aprovado. As variações (com multa e juros, pago por Marta) usam o mesmo recibo, só para comparar o desenho.
- Os CPFs de Hélio (318.482.617-13, com os números do meio iguais aos do carnê) e de Marta (205.771.384-99) são fictícios, com dígito certo. O CEP e o e-mail do escritório também são fictícios.
- Os links "Recibo 0098" e "Recibo 0131" abrem o mesmo modelo, só no desenho.
- As 8 contas que repetem foram montadas para bater com as categorias de "Saídas de novembro" do A pagar aprovado (Pessoal R$ 9.800,00; Aluguel e condomínio R$ 4.300,00; Fornecedores e sistemas R$ 355,00; Taxas bancárias R$ 210,00; Retiradas dos sócios R$ 22.000,00).
- O pedido de Daniela Rocha Mendes (P-2026-015) supõe que ela aceitou hoje. No Comercial aprovado, essa proposta está "Enviada".
- O celular foi capturado em 390 px, como no carnê.
