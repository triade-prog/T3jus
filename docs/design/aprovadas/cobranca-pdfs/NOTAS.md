# Cobrança em PDF: fatura, recibo e carnê (CO-06, F1.21) · notas

> **Aprovado pela Carol em 22/11/2026 às 13h17 (Bahia), com "aprovado" e sem mudanças: as recomendações das 10 perguntas valem como decisões.** Desenho dos três documentos A4 que o T3jus manda aos escritórios que o assinam, e de onde cada um nasce nas telas já aprovadas.

O ponto de partida é a cobrança aprovada em 20/11/2026 (`docs/design/aprovadas/console-cobranca`). Lá, os botões "Baixar a fatura", "Recibo", "Baixar o recibo" e "Baixar o carnê (PDF)" existem, mas levam a "#". Este desenho faz os próprios documentos. Os precedentes são o carnê A4 aprovado do Portal (`portal-carne`), o recibo A4 aprovado (`portal-recibo-recorrente`) e os estados "preparando" e "erro" do PDF do contrato (`portal-contrato-pdf`).

Atende CO-06 em parte: o desenho dos PDFs da fatura, do recibo e do carnê. Pesam também PT-03 (nada some: a fatura paga ou cancelada continua baixável, com a situação) e PT-10 (WCAG 2.2 AA, celular e estados).

**Exemplos** (os mesmos do desenho aprovado, com "hoje" em 20/11/2026):

| Documento | Exemplo |
|---|---|
| Fatura | Cedro & Lima Advocacia, nº 2026/0187, dezembro de 2026: R$ 490,00 + R$ 39,00 − R$ 98,00 = **R$ 431,00**, vence em 10/12/2026. Em atraso: Bacuri, nº 2026/0121, outubro, R$ 190,00, 41 dias. Parcela de carnê: Pequi, nº 2026/0179, dezembro, parcela 3 de 12. |
| Recibo | Ribeiro & Matos (sócia dona Marina Ribeiro), novembro, R$ 490,00, pago por Pix em 09/11/2026. Pequi, parcela 2 de 12, boleto em 04/11. Cedro & Lima, Pix fora da cobrança, registrado à mão por Carol Andrade em 20/11, às 15h02. |
| Carnê | Pequi Advocacia, carnê 2026/2027: 12 × R$ 490,00, de outubro de 2026 a setembro de 2027, todo dia 5, gerado em 15/09/2026. |

**Decidido em 22/11/2026 pela Carol, e já neste desenho:**

- **Meio de pagamento: Inter Empresas, boleto com Pix.** Os documentos dizem que o boleto e o Pix são emitidos pelo Banco Inter (banco 077), e os códigos continuam marcados como exemplo. É uma cobrança só: pagou pelo Pix ou pelo boleto, a fatura fica paga.
- **Sem nota fiscal por agora.** Saiu a variação "recibo com nota fiscal" e toda promessa de nota nos PDFs. O recibo é o comprovante do pagamento. Nas telas aprovadas, o lugar "Nota: em breve" fica como está, sem novo destaque.
- **Endereço de cobrança.** O boleto registrado do Inter exige o endereço do pagador. Ele entra na aba Assinatura da ficha do escritório (Console) e no bloco do pagador da fatura.

Os preços são de exemplo e levam o selo "Valores de exemplo", como no Portal aprovado. Os dados do T3jus como emissor (razão social, CNPJ, endereço e cidade), o remetente (`cobranca@exemplo.com.br`) e o contato (`atendimento@exemplo.com.br`) **não foram decididos**: aparecem com o marcador tracejado "A DEFINIR" (pergunta 1).

## Como abrir

- **`index.html`** apresenta o desenho, nesta ordem:
  - os três modelos, cada estado com a miniatura da primeira folha, a prévia no celular e o link para a captura do computador;
  - onde cada PDF nasce, com capturas de computador (1440) e celular (390);
  - o endereço de cobrança na aba Assinatura, também nos dois tamanhos;
  - as perguntas.

  Funciona publicado junto com os arquivos desta pasta, porque os caminhos são relativos.
- **`fatura-a4.html`, `recibo-a4.html` e `carne-a4.html`** são os modelos imprimíveis, com CSS de impressão real: `@page { size: A4; margin: 0 }`, uma folha por página e quebra depois de cada folha.
  - Na tela, cada um tem a barra "Baixar PDF ou imprimir" e a faixa de variações (`?estado=…`), e as duas somem na impressão.
  - No celular, a folha aparece inteira, reduzida, porque o documento é o PDF.
- **Os PDFs de exemplo** foram gerados pelo Chromium com `page.pdf({format:'A4'})`:
  - `fatura-exemplo.pdf` (1 página);
  - `recibo-exemplo.pdf` (1 página);
  - `carne-exemplo.pdf` (5 páginas).
- **`cobranca.html`, `ficha.html` e `portal-escritorio.html`** são **cópias** das telas aprovadas, mais um script curto no fim. O script só:
  - liga os botões que levavam a "#";
  - acrescenta "Baixar a fatura (PDF)" no Console › fatura;
  - com `&pdf=preparando` ou `&pdf=erro`, mostra os dois estados.

  Na `ficha.html`, além disso, entra o endereço de cobrança na aba Assinatura: uma linha na folha do estado 27 (`cb-em-dia`), um grupo de campos no editar do estado 30 (`cb-editar`) e dois estados novos (`cb-sem-endereco` e `cb-editar-endereco-erros`). O resto das duas telas e o estado 31 (`cb-editar-erros`) ficam como foram aprovados.

  Os links para páginas aprovadas que não estão nesta pasta (carteira, equipe) continuam como no aprovado.
- **`_fonte/gerar.sh <pasta>`** refaz tudo: os HTML, os PDFs, as miniaturas, as capturas WebP, a leitura dos QR, o axe e o `_conferencia.json`. O `segno`, o `axe-core`, o `jsQR` e o `pngjs` vão para uma pasta temporária.
  - `cob_dados.py` tem os dados, em centavos, e mais:
    - o valor por extenso;
    - o Pix (BR Code EMV com CRC16) e o QR em SVG;
    - o boleto: linha digitável e código de barras Interleaved 2 of 5, com os dígitos verificadores do padrão Febraban e o fator de vencimento.
  - `pecas_pdf.py` tem as peças comuns (prefixo `dp-`): timbre, marcador "a definir", selo, tabela, Pix, boleto, carimbo e rodapé.
  - `fatura_a4.py`, `recibo_a4.py` e `carne_a4.py` (prefixo `cr-`) geram os três modelos.
  - `ligar.py` faz as cópias das telas aprovadas com o script e acrescenta o endereço de cobrança na ficha.
  - `casos_cp.py` gera a lista de estados e o índice.
  - `fotos.cjs` faz os PDFs, as capturas e as conferências.
  - `comum.py` e `webp.py` são cópias sem mudança do carnê aprovado. O `comum.py` só fornece as fontes embutidas.

## Estados (30, cada um em computador e celular)

| # | Estado | Endereço | O que mostra |
|---|---|---|---|
| 1 | fatura-padrao | `fatura-a4.html?estado=padrao` | Cedro & Lima, dezembro: pagador com CNPJ, e-mail e endereço de cobrança; itens com o motivo do desconto; boleto com Pix do Banco Inter (QR e copia e cola, linha e código de barras), todos de exemplo |
| 2 | fatura-sem-codigos | `…?estado=sem-codigos` | **Como sai hoje**, até a cobrança pelo Inter ficar ligada: os 3 passos para pagar falando com o T3jus, sem prometer Pix, boleto ou baixa automática |
| 3 | fatura-sem-endereco | `…?estado=sem-endereco` | Sem endereço de cobrança: "Falta o endereço" no pagador, forma "Só Pix", o Pix valendo e, no lugar do boleto, a faixa que explica por que ele não saiu e como mandar o endereço |
| 4 | fatura-atraso | `…?estado=atraso` | Bacuri, 41 dias: selo "Em atraso · 41 dias", "se já pagou, desconsidere", a outra fatura em aberto e a 2ª via (códigos novos, vencem em 27/11, sem multa nem juros) |
| 5 | fatura-paga | `…?estado=paga` | Carimbo "Paga", data, forma e o número do recibo, sem códigos |
| 6 | fatura-cancelada | `…?estado=cancelada` | Valor riscado, "Cancelada · não pague", sem códigos e sem o motivo interno |
| 7 | fatura-carne | `…?estado=carne` | Pequi, "Parcela 3 de 12 do carnê 2026/2027", com os mesmos códigos da parcela no carnê |
| 8 | fatura-pb | `…?estado=pb` | Prévia em preto e branco |
| 9 | recibo-padrao | `recibo-a4.html?estado=padrao` | Ribeiro & Matos, novembro, pelo Pix do boleto: valor por extenso, discriminação, pagamento ("Pix do boleto da fatura, Banco Inter; baixa automática") e "este recibo é o comprovante do pagamento" |
| 10 | recibo-carne | `…?estado=carne` | Pequi, parcela 2 de 12, boleto do Banco Inter |
| 11 | recibo-manual | `…?estado=manual` | Pix fora da cobrança, "registrado à mão por Carol Andrade… a partir do comprovante" |
| 12 | recibo-pb | `…?estado=pb` | Prévia em preto e branco |
| 13 | carne-padrao | `carne-a4.html?estado=padrao` | Capa e as 12 parcelas, 3 faixas por folha, em 5 folhas; cada parcela com "Pix · Banco Inter" e "Boleto · Banco Inter (077)" |
| 14 | carne-hoje | `…?estado=hoje` | O mesmo carnê baixado em 20/11: parcelas 1 e 2 pagas, sem códigos |
| 15 | carne-trocado | `…?estado=trocado` | 1 e 2 pagas, a 3 ainda vale, 4 a 12 "Cancelada em 20/11/2026. Não pague", com o carnê 2027 que vale no lugar |
| 16 | carne-sem-codigos | `…?estado=sem-codigos` | Como sairia hoje: cada parcela sem códigos, com o caminho de pagar falando com o T3jus |
| 17 | carne-pb | `…?estado=pb` | Prévia em preto e branco |
| 18 | nasce-console-fatura | `cobranca.html?aba=fatura&estado=ver` | "Baixar a fatura (PDF)" em "O que fazer" |
| 19 | nasce-console-paga | `…aba=fatura&estado=paga` | "Baixar o recibo" ligado (recibo registrado à mão) |
| 20 | nasce-console-carne | `ficha.html?aba=assinatura&estado=cb-carne` | "Baixar o carnê (PDF)" ligado |
| 21 | nasce-console-carne-preparando | `…&pdf=preparando` | "Preparando o PDF" com indicador e linha `role=status` |
| 22 | nasce-portal-plano | `portal-escritorio.html?estado=cb-plano` | "Baixar a fatura" e "Recibo" ligados |
| 23 | nasce-portal-preparando | `…&pdf=preparando` | O mesmo padrão aprovado na próxima fatura |
| 24 | nasce-portal-erro | `…&pdf=erro` | "Não deu para preparar o PDF da fatura de dezembro.", "Tentar de novo" e `FATURA_PDF_INDISPONIVEL` |
| 25 | nasce-portal-carne | `portal-escritorio.html?estado=cb-carne` | "Baixar o carnê" e "Baixar o carnê (PDF)" ligados |
| 26 | endereco-ver | `ficha.html?aba=assinatura&estado=cb-em-dia` | Estado 27 com a linha inteira "Endereço de cobrança" entre o e-mail de cobrança e o CNPJ: "Rua da Aurora, 295, sala 1102 · Boa Vista · Recife, PE · CEP 50050-000", "vai no boleto como endereço do pagador · o mesmo da ficha" |
| 27 | endereco-falta | `…&estado=cb-sem-endereco` | Aviso de atenção "Falta o endereço: sem ele o boleto não sai, só o Pix." com "Preencher o endereço"; na linha, selo "Falta o endereço" com ícone e o motivo; forma de pagamento "Só Pix por enquanto" |
| 28 | endereco-editar | `…&estado=cb-editar` | Estado 30 com o grupo "Endereço de cobrança" logo depois do e-mail e do CNPJ: CEP, rua, número, complemento (opcional), bairro, cidade e UF, já preenchidos da ficha |
| 29 | endereco-erros | `…&estado=cb-editar-endereco-erros` | Resumo "Falta acertar 2 pontos do endereço, marcados abaixo. Nada foi salvo." e erros de campo: CEP com 7 números, número em branco ("Se não houver, escreva S/N.") |
| 30 | endereco-suporte | `…&estado=cb-em-dia&papel=suporte` | A mesma aba vista pelo Suporte (e pela Implantação): sem e-mail, CNPJ nem endereço, com a linha aprovada "Valores, faturas e mudanças ficam com a Administração e o Financeiro" |

Para onde cada botão leva no desenho:

| Botão | Abre |
|---|---|
| Console › fatura: "Baixar a fatura (PDF)" | A fatura no estado dela (a vencer, em atraso, paga, cancelada ou parcela) |
| Console › fatura paga: "Baixar o recibo" | `recibo-a4.html?estado=manual` |
| Console › ficha e Portal: "Baixar o carnê" | `carne-a4.html?estado=hoje` |
| Portal: "Baixar a fatura" | `fatura-a4.html?estado=padrao` |
| Portal: "Recibo" | `recibo-a4.html?estado=padrao` |

No produto, cada botão baixa o PDF.

## Decisões de design

1. **O documento é do T3jus para o escritório.**
   - No alto vai o logo completo oficial em vinho. É a versão de impressão do `LEIA-ME` da marca, sem redesenho.
   - À direita, os dados do emissor (por enquanto "a definir").
   - Embaixo, o fio vinho com o toque âmbar, como no recibo aprovado.
   - O rodapé tem o número do documento, quem emitiu, quando, o remetente e o símbolo com "T3jus · Sistema jurídico".
2. **Fatura em uma página só**, na ordem em que se lê:
   - número e competência;
   - a situação (selo com texto e ícone);
   - o total e o vencimento, em caixa à direita;
   - para quem vai (o pagador com CNPJ, o e-mail de cobrança com a cópia e o endereço de cobrança);
   - os itens, com o motivo do desconto em citação, como no Console;
   - como pagar e as três notas do pé (quando pagar, recibo, dúvidas).
3. **Boleto com Pix do Banco Inter**, com a frase "é uma cobrança só. Pague por um dos dois."
   - **Pix · Banco Inter:** QR de 28 mm, o pedido de conferir o recebedor e o valor, e o copia e cola.
   - **Boleto · Banco Inter (077):** linha digitável em fonte de largura fixa e o código de barras no tamanho do padrão bancário (103 × 12 mm). A nota diz que o boleto completo, do banco, vai junto no e-mail e fica no Portal: a fatura não imita a ficha de compensação, que é do banco.
   - Os dois levam a etiqueta "Código de exemplo".
4. **Paga ou cancelada, os códigos não saem.** Assim, um PDF antigo não vira cobrança de novo.
   - **Paga:** carimbo "Paga", com data, forma e o número do recibo.
   - **Cancelada:** valor riscado, selo e carimbo "Cancelada · não pague", e a frase "se alguém pagar por engano, o valor é devolvido". O motivo é interno e fica fora, como no e-mail aprovado.
   - O carimbo é decorativo (`aria-hidden`): a mesma informação está na faixa em texto.
5. **Em atraso:**
   - A fatura sai como 2ª via, com códigos novos que valem 7 dias e o mesmo valor, sem multa nem juros, no tom da régua aprovada ("se já pagou, desconsidere").
   - A outra fatura em aberto é lembrada, mas tem o próprio documento.
6. **Sem códigos (hoje, até a cobrança pelo Inter ficar ligada)**, a fatura não promete o que não existe. O texto é: "Os códigos de pagamento ainda não saem nesta fatura." Em seguida vêm 3 passos (escrever ao T3jus com o número da fatura, pagar e mandar o comprovante, a equipe registra) e uma caixa "Fale com o T3jus".
   - Não manda pagar pelo Portal, porque a janela de pagar do Portal também depende dos códigos.
   - Não fala em baixa automática.
7. **Sem endereço de cobrança, a fatura sai só com o Pix.** O Inter não registra o boleto sem o endereço do pagador, e a fatura não deve atrasar por isso (pergunta 4).
   - No pagador, "Falta o endereço" no lugar do endereço; na forma, "Só Pix · falta o endereço para o boleto".
   - O Pix sai inteiro. No lugar do boleto, uma faixa em texto: o boleto não saiu porque falta o endereço; quem quiser boleto manda o endereço e recebe a fatura de novo.
8. **Parcela de carnê:** a fatura do mês diz de que carnê e de que parcela ela é, e os códigos são **os mesmos** da parcela no carnê. O gerador usa a mesma função nos dois.
9. **O recibo segue o aprovado do Portal**, com quem emite trocado:
   - o texto em serifa: "Recebemos de … a quantia de R$ 490,00 (quatrocentos e noventa reais), referente à fatura nº … da assinatura do T3jus… Damos quitação desse valor.";
   - a discriminação e o pagamento;
   - a frase "Este recibo é o comprovante do pagamento e dá quitação somente da fatura e do valor descritos acima";
   - o local e a data, e o emissor.

   O número do recibo é o da fatura, como no Console aprovado ("Recibo nº 2026/0187"). Não leva assinatura à mão: "Emitido eletronicamente pelo T3jus; dispensa assinatura" (pergunta 6).
10. **Como o pagamento chegou** aparece no recibo:
   - **pela cobrança do Inter:** "Pagamento confirmado pelo Banco Inter e registrado pelo sistema em …", com a forma "Pix do boleto da fatura, Banco Inter; baixa automática" (ou "Boleto…");
   - **à mão:** "Pagamento registrado à mão por Carol Andrade, da equipe do T3jus, em 20/11/2026, às 15h02, a partir do comprovante enviado pelo escritório".

   O motivo escrito no Console não vai.
11. **Sem nota fiscal, o recibo não promete nota.** A caixa "Nota fiscal: em breve" saiu do recibo e o estado "com nota" deixou de existir. O lugar "Nota: em breve" das telas aprovadas fica como está, sem destaque novo.
12. **O carnê segue o aprovado do Portal:**
    - 3 faixas destacáveis por folha, com linha de corte e tesoura;
    - o canhoto à esquerda ("fica com o escritório", com "Pago em ___/___/___" e "Forma") e a via à direita;
    - a capa na primeira faixa;
    - a altura fixa de 277 mm ÷ 3.

    Capa e 12 parcelas dão 13 faixas, em 5 folhas; a última tem uma faixa só, sem página em branco.
13. **Cada parcela do carnê** tem escritório e CNPJ, referência, vencimento, valor, o Pix (QR de 24 mm e copia e cola) **e** o boleto (linha e código de barras de 103 mm), além do identificador `C20262027P03` no canhoto. Os títulos dizem "Pix · Banco Inter" e "Boleto · Banco Inter (077)". O pé diz: "Boleto com Pix do Banco Inter: uma cobrança só. Pague pelo Pix **ou** pelo boleto… Uns 20 dias antes, a fatura deste mês chega por e-mail com estes mesmos códigos."
14. **A capa do carnê** traz:
    - escritório e CNPJ, plano e dia, período e valor, com o selo de exemplo;
    - as 12 parcelas numa tabela, com o mês, o vencimento, o valor e a situação (texto e ícone), o total e, quando há, o "Pago até 20/11/2026";
    - como pagar em 3 passos;
    - a caixa "Cada parcela é a fatura do mês".
15. **Carnê baixado depois sai como está hoje** (pergunta 8). As parcelas pagas aparecem como "Paga em 02/10/2026, por Pix", e as canceladas como "Cancelada em 20/11/2026. Não pague esta parcela.", com o carnê que vale no lugar. Nos dois casos, a parcela sai **sem códigos**, e a linha da tabela da capa fica riscada.
16. **Preto e branco.** Tudo o que informa está em tinta ou em vinho escuro. O âmbar é só filete e fundo. QR e código de barras são pretos no branco. As prévias `pb` mostram a folha em tons de cinza.
17. **Onde nasce: nada é redesenhado.**
    - Os botões aprovados que levavam a "#" passam a abrir o documento.
    - No Console › fatura, entra um botão secundário, "Baixar a fatura (PDF)", em "O que fazer", logo depois de "Mandar lembrete agora" (pergunta 7).
    - Preparando e erro reusam o padrão aprovado do PDF do contrato. **Preparando:** o botão vira "Preparando o PDF" com o indicador, com `aria-disabled` e não `disabled`, e a linha `role=status` diz que "o arquivo baixa sozinho". **Erro:** aviso `role=alert` preso ao botão, "Nada mudou na fatura, e o botão Pagar continua funcionando", "Tentar de novo" e o código.

18. **Endereço de cobrança na aba Assinatura: junto do e-mail de cobrança e do CNPJ.**
    - **Na folha** (estado 27), uma linha inteira entre o e-mail de cobrança e o CNPJ, com o endereço numa linha só e a explicação "vai no boleto como endereço do pagador · o mesmo da ficha". Nada mais muda na folha aprovada.
    - **Sem endereço**, o aviso de atenção (o mesmo padrão de "Falta o sócio para passar para Ativo") diz exatamente "Falta o endereço: sem ele o boleto não sai, só o Pix.", com o que acontece com a próxima fatura e "Preencher o endereço". Na linha, selo "Falta o endereço" com ícone, um link e o motivo (a ficha tem a rua, mas não o CEP). A forma de pagamento diz "Só Pix por enquanto". O selo da situação da cobrança não muda: em dia continua em dia.
    - **No editar** (estado 30), um grupo `fieldset` "Endereço de cobrança" logo depois do e-mail e do CNPJ, com fundo sal e borda, para ler como uma coisa só. Ajuda: vai no boleto; sem ele o Inter não registra o boleto e a fatura sai só com o Pix; veio da ficha, mude só se a cobrança é em outro endereço. Campos: CEP (2/6), rua, avenida ou travessa (4/6), número (1/6), complemento (opcional, 2/6), bairro (3/6), cidade (4/6), UF (2/6, lista). No celular, um embaixo do outro. Os campos usam `autocomplete` de endereço (`postal-code`, `address-line1`, `address-line2`, `address-level3`, `address-level2`, `address-level1`).
    - **Erros de campo** seguem o estado 31: resumo `role=alert` "Falta acertar 2 pontos do endereço, marcados abaixo. Nada foi salvo.", e em cada campo a mensagem com ícone, `aria-invalid` e `aria-describedby`, com o foco no primeiro (CEP). Textos: "O CEP tem 8 números; aqui há 7. Confira, como em 50050-000." e "Escreva o número. Se não houver, escreva S/N." O estado 31 aprovado fica como está.
    - **Quem vê o quê:** Administração e Financeiro veem e editam (o editar já é só delas). Implantação e Suporte não veem o endereço, como já não veem o e-mail de cobrança e o CNPJ (classe aprovada `so-fin`).
    - **O rótulo "CNPJ da nota"** ficou como foi aprovado (pergunta 9).

## Acessibilidade e conferência (`_conferencia.json`)

- **axe-core 4.10** (WCAG 2.0, 2.1 e 2.2, A e AA) em 62 capturas: 30 estados em computador e celular, mais o `index.html` nos dois tamanhos.
  - Resultado: **0 violação**, 0 rolagem lateral em 390 px, 0 erro de script e 0 alvo menor que 44 px.
  - As exceções são as dos desenhos aprovados: links dentro de texto e os botões compactos das tabelas, com 36 px.
- **PDFs:**

  | PDF | Páginas A4 | Folhas no HTML | Páginas em branco | QR lidos de volta |
  |---|---|---|---|---|
  | `fatura-exemplo.pdf` | 1 | 1 | 0 | 1 de 1, igual ao copia e cola |
  | `recibo-exemplo.pdf` | 1 | 1 | 0 | não tem QR |
  | `carne-exemplo.pdf` | 5 | 5 | 0 | 12 de 12, cada um igual ao copia e cola da sua parcela |

  - As páginas foram contadas com o `pdfinfo` (594,96 × 841,92 pt, A4).
  - "Sem página em branco" foi conferido com o texto de cada página, pelo `pdftotext`.
  - Os QR foram lidos com o jsQR na página em 200 dpi, gerada pelo `pdftoppm`.
- **Nas páginas A4:**
  - cada folha é uma região com rótulo ("Folha 2 de 5"), e cada via tem rótulo ("Via do escritório, parcela 3 de 12");
  - cada QR e cada código de barras tem texto alternativo, com "exemplo" quando é o caso;
  - as variações ficam numa `nav` com `aria-current`;
  - a dica "Salvar como PDF" está ligada ao botão por `aria-describedby`.
- **No endereço:** o grupo é um `fieldset` com `legend` e ajuda ligada por `aria-describedby`; cada erro está ligado ao campo e o campo tem `aria-invalid`; o selo "Falta o endereço" tem texto e ícone, não só cor.
- **Nas telas:** o "Preparando" usa `aria-disabled`, `aria-describedby` e `role=status`, e o indicador para de girar com movimento reduzido. O erro usa `role=alert`, com a ação dentro do aviso.

## O que precisa no servidor

- **O PDF sai do servidor**, do mesmo HTML e CSS destes modelos, com o Chromium sem tela, e fica guardado num bucket privado, aberto por link temporário. É o mesmo caminho do carnê aprovado do Portal.
  - **A fatura** é gerada na emissão e de novo quando muda de situação (paga ou cancelada). A versão mandada por e-mail continua guardada.
  - **O recibo** é gerado quando o pagamento é confirmado.
  - **O carnê** é gerado na hora em que alguém baixa, com a situação do dia. O PDF do dia da geração continua guardado (`carnes.pdf_path`, aprovado).
- **Dinheiro em centavos.** O valor por extenso, o BR Code e a linha digitável são montados no servidor ou vêm do Banco Inter, nunca do navegador.
- **Tabelas aprovadas, com o que muda** (todas com `escritorio_id` e `proteger_tabela_escritorio`; o escritório vem da sessão):
  - `faturas`: `pdf_path` e `pdf_gerado_em`, e o recibo, com `recibo_pdf_path` e `recibo_gerado_em`. O número do recibo é o da fatura, então não precisa de outro número;
  - `assinaturas`: o endereço de cobrança, `end_cep`, `end_logradouro`, `end_numero`, `end_complemento`, `end_bairro`, `end_cidade` e `end_uf`. Nasce do endereço da ficha. O servidor valida CEP (8 números), número (obrigatório, aceita "S/N") e UF (uma das 27);
  - `faturas`: uma cópia do pagador (nome, CNPJ e endereço) no momento da emissão, para a fatura e o boleto não mudarem se a ficha mudar depois;
  - `fatura_eventos` (só inserção): "PDF baixado por…" não entra. Entram só "fatura gerada" e "recibo emitido".
- **Rotas, como proposta.** Todas respondem 404 para fatura de outro escritório, e só o sócio dono acessa as do Portal.
  - `GET /v1/console/faturas/:id/pdf`
  - `GET /v1/console/faturas/:id/recibo.pdf`
  - `GET /v1/console/carnes/:id/pdf?como=hoje|gerado`
  - `GET /v1/portal/escritorio/faturas/:id/pdf`
  - `GET /v1/portal/escritorio/faturas/:id/recibo.pdf`
  - `GET /v1/portal/escritorio/carne/pdf`
- **Erros novos:** `FATURA_PDF_INDISPONIVEL`, `RECIBO_PDF_INDISPONIVEL`, `CARNE_PDF_INDISPONIVEL` e `RECIBO_SO_DE_FATURA_PAGA`, com os textos do estado de erro. Para o endereço: `CEP_INVALIDO`, `NUMERO_OBRIGATORIO` e `UF_INVALIDA`, com os textos dos erros de campo, e `BOLETO_SEM_ENDERECO`, quando a fatura é emitida só com o Pix (fica no histórico da fatura, não é erro para o escritório).
- **Endereço vale da próxima fatura ainda não emitida**, como o resto da assinatura. As faturas já emitidas e as parcelas de carnê já registradas no Inter ficam com o endereço que tinham.

## Depende de

- **Integração com o Inter Empresas** (decidido; falta ligar): a conta PJ, as credenciais da API (certificado e chave, guardados no servidor) e o webhook de pagamento. Dela vêm:
  - os códigos de verdade: o boleto registrado com Pix (linha digitável, código de barras e o QR do Pix com vencimento) e o PDF do boleto do banco;
  - a baixa automática;
  - a 2ª via em atraso;
  - no carnê, os 12 boletos registrados na geração (pergunta 3).

  Até lá, a fatura sai como no estado "sem códigos".
- **O endereço de cobrança de cada escritório.** Sem ele, só o Pix (estado "sem endereço").
- **Dados do T3jus como emissor:** razão social, CNPJ, endereço e cidade, os mesmos da conta no Inter.
- **Remetente definitivo** (hoje `cobranca@exemplo.com.br`, pelo Resend com o contato provisório) e **contato** (hoje `atendimento@exemplo.com.br`).
- **Preços reais dos planos.** Os do desenho são de exemplo.

## Para o painel

- A entrega que programar isto atende **CO-06 em parte**.
- Cada dependência acima que ficar para depois precisa de um item "pendente" que cite CO-06: integração com o Inter (códigos e baixa automática), dados do emissor, remetente e preços. A nota fiscal saiu do escopo por agora (decisão de 22/11/2026).
- Este desenho não mexeu no repositório.

## Perguntas para a Carol

1. **Quem é o T3jus no documento?** Faltam razão social, CNPJ, endereço e cidade do emissor, o remetente e o contato. (Recomendo usar exatamente os dados da conta PJ no Inter Empresas: o beneficiário do boleto e o recebedor do Pix saem de lá, e o escritório confere o nome antes de pagar. Até lá, os marcadores "a definir" ficam no modelo e nenhum PDF sai para escritório com eles.)
2. **O que a fatura diz até a cobrança pelo Inter ficar ligada?** (Recomendo o estado "sem códigos": escrever ao T3jus com o número da fatura, pagar e mandar o comprovante. A equipe registra no Console, e o recibo sai igual. Não promete Pix, boleto nem baixa automática. Sai de cena quando a integração estiver pronta.)
3. **Oferecemos o carnê antes de a cobrança pelo Inter estar ligada?** (Recomendo que não. Sem códigos, o carnê vira só um calendário, e a fatura do mês já faz esse papel. Quando ligar, recomendo registrar os 12 boletos no Inter no dia em que o carnê é gerado, para os códigos da folha e os da fatura do mês serem os mesmos, como no desenho.)
4. **Sem endereço de cobrança, a fatura sai só com o Pix?** (Recomendo que sim, como no estado "sem endereço": a fatura não atrasa por falta do endereço, o Pix vale e a Assinatura avisa a equipe. Na ativação, o endereço entra junto do e-mail de cobrança, para isso ser exceção.)
5. **Atraso: a 2ª via sai com códigos novos, o mesmo valor, sem multa nem juros, e vale 7 dias?** (Recomendo que sim, no tom da régua aprovada, com multa e juros desligados no boleto do Inter. Podem entrar depois, se a Carol quiser.)
6. **O recibo sai sem assinatura, "emitido eletronicamente", com o número da fatura?** (Recomendo que sim, dizendo quem registrou quando foi à mão. Sem nota fiscal por agora, ele é o comprovante do pagamento. Se o contador pedir, entra depois um código de conferência.)
7. **O Console ganha "Baixar a fatura (PDF)" na fatura aberta?** (Recomendo que sim: é um botão secundário em "O que fazer", para a equipe mandar o PDF por outro canal quando o escritório pedir. O resto da tela aprovada não muda.)
8. **Carnê baixado depois: como está hoje ou como foi gerado?** (Recomendo como está hoje: parcelas pagas e canceladas saem marcadas e sem códigos, para ninguém pagar duas vezes. O PDF do dia em que o carnê foi gerado continua guardado e pode ser baixado no histórico.)
9. **"CNPJ da nota" vira "CNPJ de cobrança"?** (Recomendo trocar só o rótulo e a ajuda, na Assinatura e no editar, já que não há nota por agora: o CNPJ é o do pagador no boleto. Não mexi nas telas aprovadas por isso.)
10. **O endereço de cobrança nasce do endereço da ficha?** (Recomendo que sim: ao preparar a assinatura, o que a ficha tem vem preenchido e a equipe completa o que falta, já que a ficha aprovada tem o endereço num campo só e sem CEP. Preencher rua, bairro e cidade a partir do CEP fica para depois, porque depende de um serviço de fora.)

## O que precisei supor

- **Números novos de fatura**, fictícios: Ribeiro & Matos, novembro, nº 2026/0163; Pequi, novembro (parcela 2), nº 2026/0148.
- **Formas de pagamento:** a parcela 2 da Pequi foi paga por boleto. A forma não aparece no desenho aprovado, que só diz "em 04/11".
- **Data do carnê novo:** o carnê 2027 da Pequi foi gerado em 20/11/2026. O desenho aprovado mostra a janela, sem data.
- **Pix e boleto de exemplo:**
  - **Pix:** os mesmos rótulos das telas aprovadas (chave `exemplo-0000-0000-0000-t3jus-exemplo`, recebedor `T3JUS EXEMPLO`, cidade `RECIFE`), agora com CRC certo.
  - **Boleto:** banco 077 (Banco Inter), com o resto do código de barras inventado, e fator de vencimento pela regra nova (22/02/2025 = 1000). Por isso, a linha digitável não é a das telas aprovadas, que era só ilustrativa.
- **Endereços de cobrança** dos escritórios de exemplo, fictícios. A Cedro & Lima usa a rua que já está na ficha aprovada (Rua da Aurora, 295, sala 1102, Boa Vista), com o CEP inventado.
- **Celular em 390 px**, como pedido. A cobrança aprovada usou 412.
