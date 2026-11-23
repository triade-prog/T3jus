# Timbrado no carnê e no recibo · notas

> **Aprovado pela Carol em 22/11/2026, 23h41 (Bahia), com as 4 recomendações.** As 4 perguntas do fim seguem a recomendação. Na programação, a migration é a `0890_carne_recibo_timbrado.sql` (faixa 0890 a 0899).

Item **F3.133** do painel (ideia **PA-07**): o carnê e o recibo passam a usar a razão social e os contatos do escritório, no timbrado que a Carol aprovou em 22/11/2026 em `escritorio-dados-documentos` (decisões 6 a 9 e 13, e a linha "Timbrado" da tabela para quem programar). Hoje os dois papéis ainda mostram o nome curto ("Santana Advocacia") onde deveria estar a identificação legal.

É uma mudança pequena dentro de três desenhos aprovados, que não mudam no resto:

- **Carnê** (`portal-carne`, aprovado em 20/11/2026): a via do cliente, o canhoto e a capa.
- **Recibo** (`portal-recibo-recorrente`): a folha A4 do recibo.
- **Logo no carnê e no recibo** (`portal-nao-paga-logo`, aprovado em 21/11/2026): o logo entra no lugar do nome em letra.

## O que muda e o que não muda

| Onde | Muda | Não muda |
|---|---|---|
| Recibo, alto | O bloco da direita passa a ter as 4 linhas aprovadas, com a razão social em destaque na 1ª. A sede vai numa linha própria, com CEP. O "Advocacia" pequeno embaixo da marca só aparece quando o nome curto não diz isso | A marca à esquerda (logo ou nome curto em letra), o filete, o título, o valor |
| Recibo, assinatura | Assina a razão social, com "CNPJ · OAB" | A linha para assinar, a cidade e a data, o "Recebimento registrado por…" |
| Carnê, via do cliente | Embaixo da marca, onde hoje está só "CNPJ · OAB", entra a linha da identificação: **razão social** · CNPJ · OAB, num texto corrido. Na via de 3 por folha e na capa, a caixa do logo passa de 56 × 12 mm para 56 × 10 mm (decisão 9) | O número da parcela, o corpo, o Pix, o identificador, o pé, as faixas de corte |
| Carnê, capa | A marca fica sozinha no alto. O campo "Escritório" passa a ter o timbrado: razão social, "CNPJ · OAB", a sede com CEP, telefone e e-mail | A tabela das parcelas, o "Como pagar", a caixa do recibo pelo WhatsApp |
| Carnê, canhoto | Nada | Continua com o nome curto (decisão 7 e pergunta 1) |
| Texto, Pix, QR, rodapé "Modelo T3jus" | Nada | — |

## Como abrir

- `index.html` mostra os 16 estados em computador (1440) e em celular (412), em 32 capturas. Clique numa imagem para abrir a página naquele estado.
- As páginas abrem sozinhas e o estado vem do endereço:
  - `antes-depois.html`: o alto e a assinatura do recibo, a via com o canhoto e a capa do carnê, lado a lado, como o T3jus gera hoje e com o timbrado;
  - `recibo-a4.html?estado=` com `completa`, `sem-sociedade`, `logo`, `razao-vazia`, `sem-advocacia`, `razao-longa` ou `razao-longa-logo`;
  - `carne-a4.html?estado=` com `completa`, `uma`, `sem-sociedade`, `logo`, `razao-vazia`, `sem-advocacia`, `razao-longa` ou `razao-longa-logo`.

  Abaixo de 760 px, a folha aparece inteira e reduzida, como nos aprovados.
- `carne-exemplo.pdf` (2 páginas A4) e `recibo-exemplo.pdf` (1 página A4) são PDFs reais do estado `completa`, gerados pelo Chromium.
- **Para refazer tudo:** `sh _fonte/gerar.sh <pasta>`. Precisa de python3 com Pillow, node com `playwright` e o `axe-core` (a variável `AXE_DIR` aponta a pasta).
  - **Sem mudança, dos aprovados** (só o caminho das pastas trocado de `/home/claude` para `/home/user`): `comum.py`, `carne_a4.py`, `carne_dados.py` e `webp.py` (`portal-carne`); `recibo_a4.py` e `rr_dados.py` (`portal-recibo-recorrente`); `logo_dados.py` (`portal-nao-paga-logo`, só com o logo largo).
  - **O acréscimo:**
    - `rs_dados.py`: o escritório fictício e a regra das linhas, que é a função `timbrado()` aprovada, mais a regra de não repetir;
    - `rs_a4.py`: lê o `carne_a4.py` e o `recibo_a4.py` até o começo dos estados, como o `logo_a4.py` aprovado, e troca só a marca, a linha da identificação, o campo Escritório da capa e a assinatura. Peças novas com prefixo `tb-` (timbrado). Conferi na `origin/main` do `portal.css`: nenhuma classe `tb-` nem `ad-` existe lá. O prefixo `rs-` da primeira versão foi trocado, porque o portal já usa `rs-av`, `rs-rep` e `rs-tipo`. A linha da identificação se chama `tb-ident`, para não se confundir com `.ca-id`, que é o "Identificador da parcela";
    - `logos.py` e `logos.cjs`: o logo fictício do Santana;
    - `conferir.cjs`: mede a folga de cada via, canhoto e coluna da capa e da folha do recibo;
    - `casos.py` e `fotos.cjs`: o index, as capturas, os PDFs e o axe.

## Elenco

O mesmo escritório de `escritorio-dados-documentos`: **Santana Advocacia, em Salvador**, sede na Av. Tancredo Neves, 1.632, sala 1.208, Caminho das Árvores, CEP 41820-020, telefone (71) 3352-4180, `contato@santana.adv.br`, site `santana.adv.br`. A sócia dona é **Carolina Soares Santana** (Carol Santana), OAB/BA 63.876-S. O cliente, o contrato e as parcelas são os do carnê e do recibo aprovados: Hélio Batista Corrêa, C-2026-014, parcelas de R$ 850,00.

| Estado | Escritório |
|---|---|
| `completa` | Sociedade de advogados: "SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS", CNPJ 47.318.552/0001-06, OAB/BA 4.217, sede, telefone, e-mail e site |
| `sem-sociedade` | Advogada sem sociedade: marca "Carol Santana Advocacia", sem razão social, CNPJ nem OAB da sociedade, e-mail `carolina@santana.adv.br`, sem site |
| `logo` | O mesmo da `completa`, com o logo largo (fictício, nas cores do próprio escritório) |
| `razao-vazia` | Escritório migrado que ainda não completou: sem razão social, sem OAB da sociedade, sem telefone e e-mail do escritório (vai o primeiro contato, (71) 98877-1020 e `carol@santana.adv.br`) |
| `sem-advocacia` | Nome curto sem "Advocacia": o Ribeiro & Matos do carnê e do recibo aprovados (razão social, CNPJ, OAB/SP 31.874, sede em Pinheiros, WhatsApp e recebedor do Pix como lá). Inventados: telefone fixo (11) 3051-7720 e site `ribeiromatos.adv.br`. Registra Marina Ribeiro |
| `razao-longa` | Razão social com 150 letras, o máximo aceito em Dados do escritório |
| `razao-longa-logo` | O pior caso: 150 letras e o logo |

## Estados (16, cada um em computador e celular)

| # | Estado | Onde | O que mostra |
|---|---|---|---|
| 1 | `antes-depois` | antes-depois.html | Os 4 recortes, hoje e depois |
| 2 | `rb-completa` | recibo-a4 | As 4 linhas à direita, o WhatsApp por último e a assinatura com a razão social |
| 3 | `rb-sem-sociedade` | recibo-a4 | "Carolina Soares Santana" e "OAB/BA 63.876-S · sem CNPJ"; assina ela, sem CPF |
| 4 | `rb-logo` | recibo-a4 | O logo na caixa aprovada de 92 × 20 mm |
| 5 | `rb-razao-vazia` | recibo-a4 | Sem "[falta]"; a 1ª linha não se repete; assina o nome curto com o CNPJ |
| 6 | `rb-sem-advocacia` | recibo-a4 | "Ribeiro & Matos" com "ADVOCACIA" pequeno embaixo |
| 7 | `rb-razao-longa` | recibo-a4 | 150 letras: a folha continua em 1 página (3,8 mm de folga) |
| 8 | `rb-razao-longa-logo` | recibo-a4 | 150 letras e logo |
| 9 | `cn-completa` | carne-a4 | A linha da identificação na via e o timbrado na capa |
| 10 | `cn-uma` | carne-a4 | 1 parcela por folha: a mesma linha, em letra maior |
| 11 | `cn-sem-sociedade` | carne-a4 | "Carolina Soares Santana · OAB/BA 63.876-S · sem CNPJ" |
| 12 | `cn-logo` | carne-a4 | O logo (caixa de 56 × 10 mm na via) com a linha embaixo |
| 13 | `cn-razao-vazia` | carne-a4 | Sai o nome curto; a linha da via fica só com o CNPJ |
| 14 | `cn-sem-advocacia` | carne-a4 | "Ribeiro & Matos", "ADVOCACIA" pequeno e a linha da identificação embaixo |
| 15 | `cn-razao-longa` | carne-a4 | 150 letras: 3 linhas na via, 5 na capa, dentro da faixa |
| 16 | `cn-razao-longa-logo` | carne-a4 | 150 letras e logo |

## Decisões de design

### A marca e a identificação

1. **A marca continua sendo a marca.** O logo, ou o nome curto em letra, fica no mesmo lugar e com o mesmo tamanho dos aprovados. Ela é como o cliente reconhece o escritório. A identificação legal vem junto dela, em letra pequena, e não no lugar dela.
2. **A identificação é o timbrado aprovado, sem mudar a regra.** As linhas saem da função `timbrado()` aprovada:
   - (1) a razão social; sem sociedade, o nome completo da sócia dona; sem razão social, o nome curto;
   - (2) "CNPJ · OAB da sociedade"; sem sociedade, "OAB/BA 63.876-S · sem CNPJ";
   - (3) a sede numa linha, com cidade/UF e CEP;
   - (4) "telefone · e-mail · site" do escritório; sem telefone e e-mail, o primeiro contato, como hoje.

   O CPF da sócia dona não aparece em lugar nenhum. CNPJ, OAB, CEP e telefones não quebram no meio.
3. **Não repetir o que a marca já diz.** Quando a 1ª linha é igual ao nome curto, ela sai. Na comparação não contam maiúsculas, acentos e pontuação, e "&" vale "e". Com logo, a comparação é com o nome curto (é o texto alternativo do logo). É o que acontece com a razão social vazia: a 1ª linha seria o nome curto, que já está na marca.
4. **O "Advocacia" pequeno embaixo do nome em letra só aparece quando o nome curto não diz isso.** O código de hoje imprime "Santana Advocacia" com "ADVOCACIA" embaixo (veja o antes e depois). A regra vale para o recibo e para o carnê. O estado `sem-advocacia` desenha e mede essa linha. Na via vencida, ela custa 0,1 mm: sobram 3,2 mm, contra 3,3 mm no carnê aprovado. Sem Pix sobram 9,7 mm e, em 1 por folha, 28,4 mm. Nada precisou ceder. Na `origin/main`, o `portal.css` já tem `.ca-esc-sub` (6 pt, e 7,5 pt em 1 por folha), mas o `Carne.tsx` não usa a classe: hoje o carnê nunca mostra essa linha.

### No recibo

5. **O bloco da direita tem as 4 linhas, com a razão social em destaque** (Poppins 600, 9 pt, tinta; as outras continuam em 7,8 pt). O desenho aprovado do recibo já tinha a razão social aí; o código pulou essa linha e juntou a sede com o CNPJ. Por último, o **WhatsApp**, numa 5ª linha, só quando é diferente do telefone: é por onde o recibo chega (pergunta 4).
6. **Assina a razão social, com "CNPJ · OAB"**, como o desenho aprovado do recibo (pergunta 1 de lá) já previa. Sem sociedade, assina a sócia dona, com a OAB dela e sem CPF. Sem razão social, o nome curto, com o CNPJ.

### No carnê

7. **O canhoto continua com o nome curto** (pergunta 1). Esta é a única mudança em relação à proposta inicial. O canhoto fica com o escritório, para o controle em papel. Quem lê é a equipe, que conhece o escritório pelo nome curto. Além disso, a razão social de 150 letras ocuparia seis linhas nos 47 mm do canhoto e passaria da faixa. A via e a capa, que ficam com o cliente, levam a razão social.
8. **Na via, a linha da identificação fica no lugar do "CNPJ · OAB" aprovado.** Ela fica embaixo da marca, ao lado do número da parcela, em texto corrido: **razão social** em negrito · CNPJ · OAB, em 6,6 pt. Testei três jeitos e medi cada um:
   - razão social e "CNPJ · OAB" em linhas separadas: gasta uma linha a mais em quase todo escritório;
   - uma linha de lado a lado da via, embaixo da marca e do número: na parcela vencida, o selo "Vencida em 25/10" deixa o número mais alto que a marca, e a via passava 0,5 mm da faixa;
   - texto corrido embaixo da marca: a via vencida fica com 3,3 mm de folga, a mesma do carnê aprovado. **Foi o escolhido.**
9. **A caixa do logo no carnê.** Na `origin/main`, o `portal.css` tem uma caixa só, `.ca-logo`, de 56 × 12 mm (`height:12mm`, imagem até 12 mm). Ela vale para a via, a capa e a via de 1 por folha. A caixa de 80 × 15 mm que a primeira versão destas notas citava estava só no desenho `portal-nao-paga-logo` e nunca chegou ao código. As caixas medidas aqui, e que valem, são estas:
    - **via de 3 por folha: 56 × 10 mm.** Com a linha nova embaixo, o logo de 12 mm deixava a via vencida 0,3 mm acima da faixa. O logo largo continua com 32 mm de largura;
    - **via de 3 por folha, razão social com mais de 90 letras: 56 × 9 mm** (decisão 13);
    - **capa: 56 × 10 mm**;
    - **via de 1 por folha: 56 × 12 mm**, igual à main. A imagem e a caixa têm a mesma altura, e a via grande sobra com folga (26,6 mm no pior caso, logo com 150 letras e a parcela vencida).

    Para programar: a `.ca-logo` passa a 10 mm de altura na via de 3 por folha e na capa (9 mm com mais de 90 letras), e fica com 12 mm em `.ca-uma`.
10. **Na capa, a marca fica sozinha e o campo "Escritório" ganha o timbrado:** a razão social em negrito, "CNPJ · OAB", a sede com CEP, e telefone e e-mail, em 6,8 pt. Hoje esse campo tem só o endereço, sem CEP. O "CNPJ · OAB" que ficava embaixo da marca na capa sai, porque agora está no campo.
11. **O site fica só no recibo**, como diz a ajuda aprovada do campo Site ("Só no timbrado do recibo"). No carnê, o cliente paga pelo Pix e fala pelo WhatsApp (pergunta 2).

### Casos à parte

12. **Razão social vazia: o papel do cliente sai com o nome curto, sem "[falta]".** A marca de falta aprovada (decisão 7 de Dados do escritório) serve a quem confere o contrato antes de assinar; no carnê e no recibo, ela iria para o cliente (pergunta 3).
13. **Razão social com mais de 90 letras.** A letra fica um pouco menor, para tudo caber:
    - na via do carnê, a linha da identificação passa a 6 pt e o logo a 56 × 9 mm;
    - no recibo, a 1ª linha do timbrado passa a 8,2 pt e a assinatura a 8,4 pt.

    Com 150 letras, a linha da via ocupa 3 linhas, a capa 5 e o recibo continua em 1 página. Em escritórios reais, quase nenhuma razão social passa de 90 letras.
14. **Nada passa da faixa.** O gerador (`conferir.cjs`) mede a folga de cada via, canhoto e coluna da capa e da folha do recibo, nos 15 estados das folhas e em mais 21 combinações que não vão para a galeria: cada escritório com a parcela vencida, sem Pix e 1 por folha. São 36 casos, todos com 1 mm de folga ou mais. O pior é o logo com 150 letras e a parcela vencida, com 1 mm. O resultado fica em `_fonte/_faixas.json`.
15. **Documentos já gerados não mudam** (PT-03). Carnês e recibos guardam a cópia do dia. Só os gerados depois da entrega saem com o timbrado.

## Para quem programar

- **A regra das linhas.** Hoje `linhasTimbrado` (`packages/domain/src/proposta_docx.ts`) devolve 3 linhas: o nome; "CNPJ · OAB · sede" juntos; e o contato. O carnê e o recibo precisam das 4 linhas aprovadas separadas, com a sede numa linha própria. Antes de mudar, confira quem mais usa a função (a proposta em .docx). A regra de não repetir (decisão 3) e a de mais de 90 letras (decisão 13) entram como funções pequenas, com teste.
- **`Recibo.tsx` (`FolhaRecibo`).** O "Advocacia" segue a decisão 4. `.rb-ender` mostra as 4 linhas, sem o `slice(1)`, e o WhatsApp só se for diferente do telefone. A assinatura segue a decisão 6.
- **`Carne.tsx`.**
  - `MarcaEscritorio` ganha a linha da identificação no lugar de `ca-doc`, a linha `.ca-esc-sub` pela decisão 4 e a caixa do logo da decisão 9.
  - A capa usa a marca sem a linha e o campo Escritório com o timbrado (sem site).
  - O `Canhoto` não muda.
  - `CarneParaImprimir.escritorio` e `previaDoCarne` (a prévia da janela) precisam de razão social, tipo, nome completo e OAB principal da sócia dona, telefone, e-mail, contatos e a sede em partes com CEP.
- **PDF no servidor.** `carne_pdf.ts` (linhas 94 a 95 e 109) e `recibo_pdf.ts` (101 a 111 e 196 a 197) seguem o mesmo desenho. O `setAuthor` do PDF pode passar a ser a razão social.
- **No banco.** O item F3.133 pede a mudança em `portal_carne` e `recibo_montar`. A cópia guardada de cada carnê e recibo passa a levar esses campos, com migration nova e teste pgTAP, depois do ok da Carol na 0860. Casos para o teste:
  - sociedade, sociedade individual e sem sociedade;
  - razão social vazia;
  - razão social igual ao nome curto;
  - mais de 90 letras;
  - sem telefone e e-mail do escritório (vai o primeiro contato).
- **Para o painel:** a entrega cita **PA-07** em `refs` e fecha F3.133. Se o PDF do servidor ficar para depois, ele entra como item pendente, citando PA-07.

## Acessibilidade (WCAG 2.2 AA)

- **axe-core 4.10** (WCAG 2.0, 2.1 e 2.2, A e AA, inclusive contraste) nas 32 capturas: **nenhuma violação**. Nenhuma tela tem rolagem lateral, em 1440 e em 412. Não houve erro de script nem alvo menor que 44 px. O resultado fica em `_conferencia.json`.
- **Contraste no papel:** o texto pequeno da identificação é `#5E4A54` sobre branco (8,1:1). A razão social em negrito é a tinta `#2A1A22` (16,5:1). No preto e branco não se perde nada: tudo o que informa é tinta.
- O logo tem o texto alternativo "Santana Advocacia". No antes e depois, cada lado é um `figure` com legenda ("Antes · Como sai hoje" e "Depois · Com o timbrado aprovado"), e o selo tem texto, não só cor.

## O que precisei supor

- **A razão social de exemplo** é a do pedido, "SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS", escrita em maiúsculas como a sócia digitou. O timbrado mostra a razão social como está guardada, sem mudar maiúsculas. O aprovado usava "Santana Sociedade Individual de Advocacia".
- **Inventados:** o WhatsApp do escritório, (71) 99187-4402; o primeiro contato do estado `razao-vazia`; o recebedor do Pix ("SANTANA LIMA OLIVEIRA ADV"; sem sociedade, "CAROLINA SOARES SANTANA", com a chave CPF).
- **Quem registrou o recebimento** passa a ser Carol Santana. O recibo aprovado tinha Marina Ribeiro, do outro elenco.
- **O "antes" é o que o código faz hoje**, lido em `Recibo.tsx`, `Carne.tsx` e `linhasTimbrado`, e não o desenho aprovado. O desenho aprovado do recibo já tinha a razão social no timbrado e na assinatura.
- **Mais de 90 letras** (decisão 13) é um corte meu, medido: até aí, tudo cabe na letra aprovada.

## Perguntas para a Carol

1. **O canhoto do carnê continua com o nome curto?** Recomendado: **sim**. O canhoto fica com o escritório e quem lê é a equipe. A razão social longa não cabe nos 47 mm dele. A via e a capa, que ficam com o cliente, levam a razão social.
2. **O site fica só no recibo, e não no carnê?** Recomendado: **sim**, como diz a ajuda aprovada do campo Site. No carnê, o cliente paga pelo Pix e fala pelo WhatsApp; a capa leva telefone e e-mail.
3. **Com a razão social vazia, o carnê e o recibo saem com o nome curto, sem "[falta]"?** Recomendado: **sim**. A marca de falta é para quem confere o contrato, não para o cliente. Quando programar, quem gera o carnê ou o recibo pode ver, na tela, uma linha de aviso com o caminho para completar.
4. **No recibo, o WhatsApp continua no timbrado, depois das 4 linhas?** Recomendado: **sim**, numa 5ª linha e só quando é diferente do telefone: é por onde o recibo chega e o cliente responde.
