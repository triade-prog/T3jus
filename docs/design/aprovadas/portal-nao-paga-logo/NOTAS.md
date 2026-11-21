# Portal: "Não foi paga" no Pago antes do T3jus e logo do escritório no carnê e no recibo · notas

> **Aprovado pela Carol em 21/11/2026, às 17h16 (Bahia).** Ela respondeu "aprovado" sem mudar nada. As 10 perguntas do fim seguem a recomendação. Na programação, as migrations usam a faixa 0600 a 0609 (a 0590 a 0599 ficou com outra frente): `0600_nao_foi_paga.sql` e `0601_marca_logo_oab.sql`.

Desenho para a Carol aprovar antes do código. São dois acréscimos em telas já aprovadas:

- **A. "Não foi paga"** (item F3.84, ideia VA-05). Na ficha do contrato, aba Recebimentos, a folha aprovada "Pago antes do T3jus" (`portal-pendencias-pequenas`, tela B) ganha um botão por parcela. Ele passa a parcela para A receber sem desfazer a importação. Segue a pergunta 5 aprovada: só quem tem Financeiro, com motivo obrigatório e no histórico.
- **B. Logo do escritório no carnê e no recibo** (itens F3.81 e o resto do F3.19, ideias FI-23 e FI-14). Em Escritório › Recebimento (`portal-carne`), a folha "Marca no carnê" vira "Marca e timbrado". Ela traz a escolha entre o nome em letra e o logo, o envio do logo com a conferência para impressão, a prévia e o registro da sociedade na OAB. O logo entra no alto do carnê (`portal-carne`) e no timbrado do recibo (`portal-recibo-recorrente`), no mesmo lugar do nome em letra, como as duas notas aprovadas previam.

Pesam também PT-03 (nada é apagado), PT-09 (dinheiro em centavos), PT-10 (WCAG 2.2 AA, celular, erros) e PA-01 (cada pessoa só vê e faz o que pode).

A base são as telas aprovadas, sem mudança. O gerador lê ou importa os scripts aprovados: `contrato_pago_antes.py` e `contratos.py` (ficha do contrato), `financeiro.py` (A receber), `carne.py` (Escritório › Recebimento), `carne_a4.py` (carnê) e `recibo_a4.py` (recibo). Por cima, acrescenta só as peças novas, com prefixo `np-` (não foi paga) e `lg-` (logo).

O elenco e o "hoje" são os de sempre: Ribeiro & Matos, Marina Ribeiro como sócia dona, quarta-feira, 18/11/2026, às 10h12. O contrato é o da Rosa Almeida (C-2026-041), importado da planilha em 17/11, às 15h42: 6 parcelas de R$ 800,00, 2 pagas antes, desfazer até 24/11. O carnê e o recibo são os de Hélio (C-2026-014). Diego Almeida tem Comercial e Financeiro. Felipe Matos tem Comercial, Contratos e Jurídico.

## Como abrir

- `index.html` mostra os 25 estados em computador (1440) e celular (412), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- Os HTML abrem sozinhos, com o CSS, as fontes, os ícones e os logos embutidos. O estado vem do endereço:
  - `contrato-nao-paga.html?estado=` com `folha`, `janela`, `erros`, `falha`, `conflito`, `feito`, `voltar` ou `sem-financeiro`;
  - `financeiro-nao-paga.html?estado=a-receber`;
  - `escritorio-logo.html?estado=` com `escolher`, `largo`, `quadrado`, `claro`, `recusa`, `salvo`, `remover`, `letra` ou `equipe`;
  - `carne-logo-a4.html?estado=` com `largo`, `quadrado`, `pb` ou `uma-cor`;
  - `recibo-logo-a4.html?estado=` com `largo`, `quadrado` ou `pb`.
- Abaixo de 760 px, as telas viram a versão de celular, com a barra embaixo. Funcionam abrir e fechar as janelas (pelo botão, pelo X e pelo Esc) e os links entre os estados principais. O resto é desenho.
- `carne-exemplo.pdf` (2 páginas A4) e `recibo-exemplo.pdf` (1 página A4) são PDFs reais, gerados pelo Chromium com `page.pdf({format:'A4'})` a partir dos modelos com o logo largo.
- Os três logos fictícios do escritório estão em `_fonte/logos/` (`logo-largo.png`, `logo-quadrado.png` e `logo-claro.png`). Usam as cores do próprio escritório, azul-marinho e ouro, e não as do T3jus: o logo é dele.
- `_fonte/gerar.sh <pasta>` refaz tudo:
  - **cópias sem mudança das aprovadas:**
    - de `portal-pendencias-pequenas`: `comum.py`, `extra.py`, `contratos.py`, `pecas.py`, `contrato_pago_antes.py`, `fotos.cjs` e `webp.py`;
    - de `portal-carne`: `carne.py`, `carne_dados.py`, `carne_a4.py` e `financeiro.py`;
    - de `portal-recibo-recorrente`: `recibo_a4.py` e `rr_dados.py`;
  - **scripts novos:**
    - `logos.py` e `logos.cjs` desenham os logos fictícios e tiram deles um PNG transparente;
    - `logo_dados.py` faz a conferência de verdade nos PNG: corta a margem vazia, mede, calcula o contraste da borda do desenho com o papel e monta a versão "em uma cor só";
    - `nao_paga.py` gera a ficha do contrato e A receber;
    - `logo_receb.py` gera Escritório › Recebimento;
    - `logo_a4.py` gera o carnê e o recibo com o logo;
    - `casos.py` gera a lista de estados e o `index.html`;
    - `pdf.cjs` gera os PDFs;
  - o `fotos.cjs` aprovado faz as capturas e as conferências.
- Todos os dados são fictícios.

## Estados (25, cada um em computador e celular)

| # | Estado | Onde | Quem | O que mostra |
|---|---|---|---|---|
| 1 | `np-folha` | Contrato › Recebimentos | Marina | A folha "Pago antes do T3jus" com "Não foi paga" em cada linha e os dois caminhos (uma parcela ou desfazer a importação) |
| 2 | `np-janela` | idem | Marina | A janela: a parcela, o que vai acontecer, o vencimento, o motivo e o aviso sobre os avisos automáticos |
| 3 | `np-erros` | idem | Marina | Sem o motivo |
| 4 | `np-falha` | idem | Marina | Falha do servidor: nada mudou, "Tentar de novo" e o código |
| 5 | `np-conflito` | idem | Marina | Diego mudou a mesma parcela às 10h13, com a janela de Marina aberta desde 10h11 |
| 6 | `np-feito` | idem | Marina | A parcela na programação, vencida, os totais novos, a folha com 1 parcela e o histórico |
| 7 | `np-voltar` | idem | Marina | "Foi paga, sim": volta para "Pago antes do T3jus", com motivo |
| 8 | `np-sem-financeiro` | idem | Felipe | A folha sem o botão, dizendo quem pode |
| 9 | `np-a-receber` | Financeiro › A receber | Marina | A parcela de Rosa entre as vencidas, com a marca "Era paga antes do T3jus" |
| 10 | `lg-escolher` | Escritório › Recebimento | Marina | "O logo" marcado, área de envio, como o T3jus confere e o registro na OAB vazio |
| 11 | `lg-largo` | idem | Marina | Logo largo enviado: conferência que passa e prévia do carnê e do recibo, em cores e em preto e branco |
| 12 | `lg-quadrado` | idem | Marina | Logo quadrado: "O logo e o nome ao lado" |
| 13 | `lg-claro` | idem | Marina | Logo claro demais (1,2:1): a marca não é salva; a saída "em uma cor só" |
| 14 | `lg-recusa` | idem | Marina | Arquivo recusado (240 × 80 px) e os outros motivos de recusa |
| 15 | `lg-salvo` | idem | Marina | Marca salva: o aviso, "Trocar o logo", "Remover o logo" e a linha no histórico |
| 16 | `lg-remover` | idem | Marina | Confirmação para remover o logo (`alertdialog`) |
| 17 | `lg-letra` | idem | Marina | Depois de remover: o nome em letra de novo |
| 18 | `lg-equipe` | idem | Diego | Só para ler: a marca em uso, com a prévia, e o registro na OAB |
| 19 | `a4c-largo` | Carnê A4 | — | O carnê com o logo largo |
| 20 | `a4c-quadrado` | Carnê A4 | — | Logo quadrado com o nome ao lado |
| 21 | `a4c-pb` | Carnê A4 | — | Em preto e branco |
| 22 | `a4c-uma-cor` | Carnê A4 | — | O logo claro impresso em uma cor só |
| 23 | `a4r-largo` | Recibo A4 | — | O recibo com o logo largo no timbrado |
| 24 | `a4r-quadrado` | Recibo A4 | — | Logo quadrado com o nome ao lado |
| 25 | `a4r-pb` | Recibo A4 | — | Em preto e branco |

## Decisões de design: A. "Não foi paga"

1. **O botão fica na linha da parcela**, na folha "Pago antes do T3jus", como botão secundário compacto. O rótulo é "Não foi paga". Para o leitor de tela, ele diz a parcela e a data ("Não foi paga: parcela 2 de 6, de 10/11/2026"). No celular, o botão ocupa a largura do cartão.
2. **Os dois caminhos ficam juntos, no pé da folha**, no lugar da frase aprovada:
   - "Uma parcela não foi paga? Use 'Não foi paga' na linha dela." Esse caminho não mexe no resto da importação.
   - "A planilha inteira estava errada? Até 24/11 dá para desfazer a importação…", com "Ver a importação" e "Desfazer a importação", que levam às telas aprovadas da Importação.

   Depois dos 7 dias, a segunda linha some e fica só o botão.
3. **A janela diz o que vai acontecer antes de pedir qualquer coisa** (estado `np-janela`):
   - a parcela (2 de 6, vencimento na planilha 10/11/2026, R$ 800,00);
   - uma lista: a parcela sai da folha e entra na programação e em A receber, com a marca "era paga antes do T3jus"; o programado passa de R$ 3.200,00 para R$ 4.000,00, e o recebido até hoje não muda; a cobrança fica com quem cuida do contrato, com a próxima ação "Falar com Rosa Almeida" amanhã; a importação continua como está e nada se apaga.
4. **O vencimento** (pergunta 1). Vem marcado **"Manter 10/11/2026, o da planilha"**: a parcela entra já vencida, há 8 dias. A outra opção é **"Outra data, combinada com a cliente"**, com o campo de data. É para quando o escritório já falou com a cliente. A parcela então entra como a vencer.

   Manter a data é o mais honesto: é a data do contrato, e o atraso aparece em Vencidas, com o motivo. Multa e juros não são calculados sozinhos. Eles só entram se alguém preencher "Multa e juros" ao registrar o recebimento (tela aprovada). Por isso, manter a data não cobra nada a mais da cliente pelo erro da planilha.
5. **O motivo é obrigatório** e vai para o histórico. É texto livre, com exemplos na ajuda ("a planilha estava errada", "a cliente diz que não pagou"). Uma lista fechada não ajuda aqui: os casos são poucos e cada um tem a sua história.
6. **Avisos automáticos** (pergunta 3). Uma faixa âmbar-clara, com o sino riscado, diz: "Nenhum aviso automático sai para Rosa por esta parcela."
   - Até hoje, a parcela constava como paga. Um "sua parcela venceu há 8 dias" automático, sem ninguém ter falado com a cliente, soa como cobrança indevida.
   - Ele também pode disparar de uma vez todos os passos atrasados da automação.
   - Quem cobra é a pessoa, com a próxima ação que já entra marcada.
   - Se a parcela ganhar outra data, os lembretes de antes do vencimento voltam a valer a partir dela.
7. **Erros:**
   - **motivo vazio** (`np-erros`): resumo no topo e o erro preso ao campo, que recebe o foco. O botão nunca fica desabilitado;
   - **falha do servidor** (`np-falha`): "Nada mudou", a parcela continua na folha, o que se escreveu fica na janela, "Tentar de novo" e o código para o suporte (`role="alert"`);
   - **conflito** (`np-conflito`): se outra pessoa mudou a mesma parcela enquanto a janela estava aberta, a janela diz quem, a hora e como ficou (Diego Almeida, às 10h13, em A receber, vencida desde 10/11). Mostra também a hora em que a janela foi aberta (10h11). Nada é gravado duas vezes. "Ver como ficou" recarrega a ficha. O mesmo vale se alguém desfez a importação nesse meio-tempo ("Marina Ribeiro desfez a importação às 10h13; a parcela foi cancelada com as outras").
8. **Depois** (`np-feito`):
   - o aviso de sucesso;
   - a parcela sai da folha (agora 1 parcela, soma R$ 800,00, "A parcela 2 passou para A receber hoje");
   - na programação, ela entra como "Vencida há 8 dias", com "Era 'paga antes do T3jus' até hoje" e o botão "Foi paga, sim";
   - os totais mudam: programado R$ 4.000,00 ("5 parcelas · 1 vencida, R$ 800,00"), "Os R$ 800,00 pagos antes ficam fora" e a aba "Recebimentos 5";
   - o cabeçalho troca "Próximo recebimento" por "Recebimento em atraso", com "Ver em A receber";
   - uma folha nova, "Histórico dos recebimentos", diz quem, quando, o vencimento escolhido, o motivo (entre aspas, em Alegreya itálico) e que nenhum aviso saiu.
9. **Em A receber** (`np-a-receber`), a parcela entra em Vencidas, na ordem do vencimento, com o selo de atraso aprovado e o selo neutro "Era paga antes do T3jus". O motivo e a próxima ação seguem a regra aprovada: toda vencida tem responsável e próxima ação. A cobrança diz "Sem aviso automático". Os números do alto mudam: Em aberto R$ 19.910,00 (13 parcelas) e Vencidas R$ 7.850,00 (5 parcelas).
10. **"Foi paga, sim"** (pergunta 2, estado `np-voltar`). Desfaz o engano ao contrário: a parcela volta para "Pago antes do T3jus", fora dos totais, com motivo obrigatório.
    - Só dá para voltar enquanto nada foi feito nela em A receber: nenhum recebimento, carnê ou cobrança enviada. Depois disso, o caminho é o de sempre (registrar o recebimento, ou cancelar com motivo).
    - As duas mudanças ficam no histórico.
11. **Quem não tem Financeiro** (`np-sem-financeiro`, Felipe) vê a folha como a aprovada, sem o botão. O pé diz quem pode: "Quem tem a área Financeiro passa a parcela para A receber: Marina Ribeiro ou Diego Almeida". Desfazer a importação é com Marina, que importou.
12. **Desfazer a importação depois de um "Não foi paga".** A parcela passada para A receber conta como mexida depois da importação. Ela entra na lista do fim do desfazer aprovado, para decidir uma por uma. Se já tiver recebimento, fica como está.

## Decisões de design: B. Logo do escritório

13. **A folha "Marca no carnê" vira "Marca e timbrado"**, no mesmo lugar de Escritório › Recebimento.
    - A pergunta é "O que vai no alto do carnê e do recibo": "O nome do escritório em letra" ou "O logo do escritório". A escolha vale para os dois documentos.
    - O subtítulo diz que o T3jus aparece só no rodapé ("Modelo T3jus") e que carnês e recibos já emitidos ficam como saíram.
    - "Onde isso aparece" ganha a linha do recibo. O logo do T3jus não muda.
14. **O envio** (`lg-escolher`) é uma área de soltar com "Escolher o arquivo".
    - Aceita PNG, JPG ou SVG, até 1 MB (pergunta 6). O melhor é fundo transparente ou branco.
    - Embaixo, em três linhas, o que o T3jus confere: corta a margem vazia, mede o tamanho e confere o contraste com o papel, em cores e em preto e branco.
    - Enquanto não há logo, a prévia mostra como sai hoje, com o nome em letra.
15. **A conferência para impressão** aparece logo depois do envio, item por item, com ✓ ou ⚠ e o número (estados `lg-largo`, `lg-quadrado` e `lg-claro`). As contas dos três logos de exemplo foram feitas de verdade, pelo `logo_dados.py`:
    - **formato e peso**;
    - **tamanho depois do corte da margem vazia** (por exemplo, 1800 × 420 px viram 1425 × 366 px), com o mínimo de 600 px no lado maior;
    - **contraste com o papel da parte mais clara da borda do desenho**, que é o que encosta no papel. O mínimo é 3:1, a régua da WCAG para gráficos. O logo largo tem 5,0:1 (o ouro), o quadrado 11,4:1 e o claro 1,2:1;
    - **preto e branco**: a impressora troca cada cor por um cinza de mesma luminância, então o contraste é o mesmo e a prévia mostra.
16. **Recorte.** O T3jus corta sozinho só a margem vazia em volta. Não há ferramenta para recortar o logo à mão: cortar um logo muda a marca do escritório. A caixa do documento acomoda qualquer proporção sem esticar:
    - no carnê, até 56 × 12 mm;
    - no recibo, até 92 × 20 mm.
17. **A prévia "Como vai sair"** mostra o alto da via do carnê e o timbrado do recibo, cada um em cores e em preto e branco, sobre papel branco. Leva também ao carnê e ao recibo inteiros (`carne-logo-a4.html`, `recibo-logo-a4.html`).
18. **Logo quadrado** (`lg-quadrado`, pergunta 8). Na altura do alto do carnê, um monograma sozinho fica pequeno e não diz o nome. Para logo quase quadrado (menos de 2:1), aparece "Como o logo entra", e o padrão é **"O logo e o nome ao lado"**, com o nome em letra, como hoje. "Só o logo" continua possível.
19. **Logo claro demais** (`lg-claro`, pergunta 7). A conferência marca o contraste e o preto e branco com ⚠, e a prévia mostra o logo sumindo.
    - Ao salvar, o resto da página é salvo e a marca não. O aviso diz por quê, com o número, e o grupo "Como imprimir o logo" mostra o erro preso a ele.
    - As saídas: **"Em uma cor só, na cor da tinta"** (o mesmo desenho, só a cor muda, e só no papel, com a prévia ao lado), outro arquivo ou o nome em letra.
    - No A4, o estado `a4c-uma-cor` mostra o resultado.
20. **Recusas com motivo claro** (`lg-recusa`). Cada recusa diz o que houve e o que fazer:
    - pequeno demais: "Ele tem 240 × 80 px e sairia borrado… Envie o arquivo original… a foto de perfil do WhatsApp é pequena demais";
    - formato: PDF, Word, HEIC ou WebP;
    - mais de 1 MB;
    - SVG com código ou fonte de fora;
    - comprido demais: mais de 8 vezes mais largo que alto.

    Na tela, a lista "Outros motivos de recusa" traz a frase de cada um.
21. **Trocar e remover** (`lg-salvo`, `lg-remover`, `lg-letra`).
    - "Trocar o logo" abre o envio de novo.
    - "Remover o logo" pede confirmação (`alertdialog`, foco em "Voltar"). Ela diz que volta o nome em letra, que o arquivo fica guardado no histórico (nada se apaga) e que carnês e recibos já emitidos não mudam.
    - Cada mudança entra no histórico do Recebimento, com o arquivo, o tamanho, o contraste e o registro na OAB.
22. **Só a sócia dona muda** (`lg-equipe`), como a chave Pix aprovada. Diego vê a página só para ler, com a marca em uso, a prévia e o registro na OAB.
23. **Registro da sociedade na OAB** (pergunta 5).
    - **O Escritório hoje não guarda esse dado.** A tabela `escritorios` tem nome, CNPJ, cidade, UF, endereço e contatos (0060). `recibo_montar` (0533) e `linhasTimbrado` não têm a OAB da sociedade. O painel do F3.19 diz "quando o Escritório guardar esses dados". Os desenhos aprovados do carnê e do recibo mostram "OAB/SP 31.874" só como dado fictício. A Equipe e OAB aprovada (0430) guarda a inscrição de cada advogado, não a da sociedade.
    - Por isso, a folha "Marca e timbrado" ganha o bloco **"Registro da sociedade na OAB (opcional)"**: seccional (UF) e número. A ajuda diz onde ele aparece e que o advogado sem sociedade deixa em branco, e então a linha sai só com o CNPJ.
    - Em "Dados do escritório" (aprovado, só para ler), ele passa a aparecer ao lado do CNPJ, sem outra mudança na tela.
24. **No papel.** O logo entra no lugar do nome em letra, nas duas peças aprovadas. O resto não muda:
    - **no carnê**, entra na via do cliente e na capa, com o CNPJ e o registro na OAB embaixo. **O canhoto continua com o nome em letra**: é do escritório e é estreito (47 mm), e o logo ali sairia pequeno demais para ler;
    - **no recibo**, entra no timbrado, à esquerda, com a razão social, o CNPJ, o registro, o endereço e os contatos à direita, como no aprovado;
    - o T3jus continua só no rodapé, com o símbolo em vinho e "Modelo T3jus".
25. **Documentos já emitidos ficam como foram** (pergunta 9). Cada carnê e cada recibo guarda a cópia da marca usada: nome em letra ou o logo (o arquivo daquele dia), e o registro na OAB. Trocar ou remover o logo não muda o que já foi entregue. O recibo aprovado já guarda a cópia do que foi no papel (0533), e o carnê guarda a chave Pix usada (0450). A marca entra na mesma cópia.
26. **Cores do logo.** O logo é do escritório e aparece nas cores dele, sempre sobre papel branco, como sai impresso. A interface em volta usa só os pares aprovados do Gabinete. O logo nunca vai sobre o vinho, o âmbar ou a areia.
27. **Celular.** As folhas viram uma coluna. A prévia passa a uma figura por linha. "Trocar o logo" e "Remover o logo" ocupam a largura. O A4 aparece inteiro, reduzido, como nos aprovados. O envio do logo funciona pelo seletor de arquivos do celular.

## Acessibilidade (WCAG 2.2 AA)

- **Conferência automática** em 50 capturas (25 estados × computador e celular), feita pelo `fotos.cjs` aprovado. O resultado fica em `_conferencia.json`:
  - o axe-core 4.10 (WCAG 2.0, 2.1 e 2.2, A e AA) não achou **nenhuma violação**;
  - nenhuma tela tem **rolagem lateral**;
  - não houve **erro de script**;
  - **alvos**: todos com 44 px ou mais. "Não foi paga" e "Foi paga, sim" são botões compactos de tabela (36 px), como nas tabelas aprovadas. As exceções são duas:
    - a palavra-marca "T3jus" da moldura aprovada (24 px), a mesma de sempre;
    - o `input type="file"` escondido (1 × 1 px), que só existe para o leitor de tela e o teclado. O alvo é o rótulo "Escolher o arquivo" ou "Trocar o logo", que tem 44 px, o mesmo padrão da Importação aprovada.
- **Janelas:** `<dialog>` com `showModal()`, rótulo e descrição. O foco vai:
  - para a opção marcada do vencimento;
  - para o motivo, quando falta;
  - para "Tentar de novo", na falha;
  - para "Ver como ficou", no conflito;
  - para "Voltar", ao remover o logo (`alertdialog`).

  O vencimento é um `fieldset` com `legend`. Os erros usam `aria-describedby` e `aria-invalid`, com resumo no topo. A falha e o conflito usam `role="alert"`.
- **Estado sem depender de cor:**
  - "Vencida há 8 dias", "Era paga antes do T3jus", "Paga antes do T3jus" e "Sem aviso automático" vêm escritos;
  - a conferência do logo usa ✓ ou ⚠ e o texto ("O logo some no papel"), além da cor;
  - o contraste vem em número.
- **Logo:** o `img` tem texto alternativo que descreve a marca. Nas prévias, cada figura é uma `role="img"` com rótulo ("Prévia do alto do carnê, em preto e branco, com o logo largo"). No A4, o logo tem o nome do escritório como alternativa. Com o nome ao lado, o logo é decorativo, porque o nome já está escrito.
- **Contraste:** só entram pares do D2 e do Gabinete. A faixa dos avisos automáticos usa tinta e vinho sobre `#F2CDB3` (11,2:1 e 7,15:1). O erro usa `#AC3F6B` sobre branco (5,71:1). O texto suave `#6E5562` passa de 5,5:1. Nas prévias, o texto pequeno é tinta suave sobre branco.
- **Valores:** "R$" e o número não se separam na quebra de linha (espaço que não quebra).

## O que muda no servidor

Todas as tabelas novas têm `escritorio_id` e passam por `proteger_tabela_escritorio`. O escritório vem sempre da sessão, nunca do navegador. Dinheiro em centavos. Nada se apaga.

**Migrations:** a maior hoje é a `0580_interessados.sql`. Proponho a faixa **0590 a 0599**:

- `0590_nao_foi_paga.sql` para a parte A;
- `0591_marca_logo_oab.sql` para a parte B.

Se outra entrega já tiver usado a 0590, use a próxima livre da faixa.

### A. "Não foi paga" (0590)

- **Como fica no banco.** A parcela paga antes nasce cancelada, com `pago_antes` (0420), e essa linha não muda. "Não foi paga" cria **uma linha nova** em `recebimentos_previstos`:
  - o mesmo contrato, tipo, descrição e valor (centavos);
  - o vencimento escolhido;
  - `corrige_pago_antes_id` apontando para a linha paga antes (coluna nova, com índice único parcial enquanto a nova não estiver cancelada).

  A folha lista as linhas `pago_antes` sem correção ativa. A programação, A receber e os totais passam a contar a linha nova como qualquer outra.
- **Coluna nova `avisos_desde timestamptz`** em `recebimentos_previstos`. O motor de automações (0340) não dispara para a parcela nenhum passo cujo momento seja anterior a ela. Com o vencimento original, nada sai. Com outra data, os lembretes de antes do vencimento seguem normais.
- **Tabela nova `pago_antes_mudancas`**, só de inserção, com o gatilho que recusa update e delete. Campos:
  - `id`, `escritorio_id` e `recebimento_pago_antes_id` (a linha da planilha);
  - `recebimento_novo_id`;
  - `tipo`: `NAO_PAGA` ou `FOI_PAGA`;
  - `vencimento_planilha`, `vencimento_escolhido` e `motivo` (3 a 500);
  - `feito_por` e `feito_em`.

  A tabela entra em `inventario_dados`.
- **Rotas:**
  - `POST /v1/escritorio/contratos/:id/pago-antes/:recebimentoId/nao-paga` recebe `{ vencimento: "ORIGINAL" | "aaaa-mm-dd", motivo }`. Exige a área Financeiro e `financeiro.editar`. Na mesma transação:
    - trava a linha paga antes (`for update`), confere que não há correção ativa e que a importação não foi desfeita;
    - cria a parcela nova, a próxima ação (responsável: quem cuida do contrato; "Falar com <cliente>"; amanhã) e a linha do histórico.

    Erros:
    - `MOTIVO_OBRIGATORIO`;
    - `VENCIMENTO_INVALIDO` (data antes do vencimento original menos 1 ano, ou depois do fim do contrato);
    - `NAO_E_PAGO_ANTES`;
    - `JA_MUDADA`, com `{ por: { nome }, em, como }` para a janela de conflito;
    - `IMPORTACAO_DESFEITA`, com quem e quando;
    - `AREA_NAO_LIBERADA`.
  - `POST /v1/escritorio/recebimentos/:id/foi-paga` recebe `{ motivo }`. Cancela a linha nova com o motivo e grava `FOI_PAGA`. Só se a parcela não tem pagamento, carnê nem cobrança enviada. Erros: `MOTIVO_OBRIGATORIO`, `JA_TEM_MOVIMENTO` (diz qual), `AREA_NAO_LIBERADA`.
- **A ficha do contrato (`FichaContrato`)** passa a trazer, em cada `RecebimentoPrevisto`, `eraPagoAntes` e `podeVoltar`. Na folha, traz `podeMarcarNaoPaga` (área Financeiro) e o histórico dos recebimentos, com as mudanças. Isso se soma ao `pagoAntes` e à `importacao` da tela aprovada.
- **A receber** traz `eraPagoAntes` na parcela, para o selo.
- **Desfazer a importação** (rota aprovada) lista a parcela corrigida entre o que foi mexido depois.

### B. Logo e registro na OAB (0591)

- **Tabela nova `escritorio_logos`**, só de inserção. Campos:
  - `id` e `escritorio_id`;
  - `arquivo`: o caminho no armazenamento privado, numa pasta por escritório;
  - `nome_original`, `formato_enviado` (PNG, JPG, SVG) e `bytes`;
  - `largura` e `altura` depois do corte, e `corte` (json com as margens tiradas);
  - `contraste_min` (numeric) e `passa`;
  - `enviado_por` e `enviado_em`.

  O SVG e o JPG são convertidos no servidor para PNG transparente, com até 2400 px no lado maior, e só o PNG é usado nos documentos. Assim nenhum código de SVG chega a uma página. A tabela entra em `inventario_dados`.
- **Colunas novas em `escritorio_recebimento`** (0450). A nota aprovada do carnê previa `marca` e `logo_arquivo_id`, que a 0450 deixou para depois:
  - `marca` (LETRA, LOGO; padrão LETRA) e `logo_id` (→ `escritorio_logos`);
  - `logo_jeito`: SO_LOGO ou LOGO_E_NOME;
  - `logo_cor`: ARQUIVO ou UMA_COR.

  Checagens: `marca = 'LOGO'` exige `logo_id`. Logo que não passa só vale com `logo_cor = 'UMA_COR'`. A escrita continua só pela função da sócia dona.
- **Colunas novas em `escritorios`:** `oab_sociedade_uf` (`uf_brasil`, da 0430) e `oab_sociedade_numero` (`^[1-9][0-9]{0,5}$`), os dois nulos ou os dois preenchidos. Ficam no Escritório porque são dados dele e servem a outros documentos. No Portal, só a sócia dona muda, por Escritório › Recebimento; o Console também pode, na ficha do cliente. Cada mudança vai para o histórico do escritório.
- **Cópia nos documentos.** Os documentos emitidos não mudam:
  - `carnes` ganha `marca` (json com `tipo`, `logo_id`, `jeito`, `cor` e a frase da OAB), gravado ao gerar;
  - `recibo_montar` (0533) passa a pôr `escritorio.marca` e `escritorio.oab` em `recibo_copias.dados`. Recibo com cópia sem `marca` sai com o nome em letra, como saiu;
  - o arquivo do logo nunca se apaga enquanto algum documento aponta para ele.
- **Rotas:**
  - `POST /v1/escritorio/recebimento/logo` (multipart). Só a sócia dona. Lê, converte, corta a margem, mede, confere e devolve `{ id, largura, altura, margem, contraste, passa, previa }`. Ainda não troca a marca. Erros:
    - `LOGO_FORMATO` (diz o formato recebido);
    - `LOGO_GRANDE` (diz o peso);
    - `LOGO_PEQUENO` (diz o tamanho);
    - `LOGO_SVG_INSEGURO`;
    - `LOGO_COMPRIDO`;
    - `SO_DONO`.
  - `PUT /v1/escritorio/recebimento` (a rota aprovada) ganha `marca`, `logoId`, `logoJeito`, `logoCor`, `oabUf` e `oabNumero`. Erros novos: `LOGO_SEM_CONTRASTE`, `LOGO_DE_OUTRO_ESCRITORIO` (404), `OAB_NUMERO_INVALIDO` e `OAB_INCOMPLETA`. O resto da página se salva mesmo quando a marca é recusada, e a resposta diz o que não foi salvo.
  - `GET /v1/escritorio/logos/:id` devolve o PNG, só para o mesmo escritório. É usado na prévia, na página `/carnes/:id` e em `/recibos/:id`.
  - `GET /v1/escritorio` traz `oabSociedade` para "Dados do escritório".
- **No papel:** `CarneImprimir` e `FolhaRecibo` leem a marca da cópia e trocam `ca-esc`/`rb-esc` pelo `img`, nas caixas de 56 × 12 mm e 92 × 20 mm. O canhoto não muda. `linhasTimbrado` ganha a frase da OAB depois do CNPJ.

### Para o painel

- A parte A atende **F3.84** (VA-05). O texto "passar para A receber sem desfazer a importação" fica inteiro com o botão, o "Foi paga, sim" e a regra dos avisos. Se a primeira entrega sair sem "Foi paga, sim", vale um item "pendente" citando VA-05.
- A parte B atende **F3.81** (FI-23) e o resto do **F3.19** (FI-14), que é o logo e o registro da sociedade na OAB no timbrado. O envio do recibo pelo WhatsApp continua pendente no F3.19, como está.
- Itens novos sugeridos, se a Carol quiser (pergunta 10):
  - "a marca do escritório também na proposta em Word", citando AP-05;
  - "a OAB da sociedade nos outros documentos do escritório".

## Perguntas para a Carol

1. **Que vencimento a parcela ganha quando não foi paga?** **Recomendo manter o da planilha (10/11/2026), já vencida**, com a opção "Outra data, combinada com a cliente". É a data do contrato, o atraso fica à vista em Vencidas, e nada de multa entra sozinho.
2. **Dá para voltar atrás ("Foi paga, sim")?** **Recomendo que sim, com motivo, enquanto nada foi feito na parcela em A receber** (nenhum recebimento, carnê ou cobrança enviada). Depois disso, vale o caminho de sempre.
3. **Os avisos automáticos de cobrança disparam para a parcela que já nasce vencida?** **Recomendo que não disparem sozinhos.** Até ontem a parcela constava como paga, e um "sua parcela venceu" automático, sem conversa, soa como cobrança indevida e pode soltar vários passos de uma vez. Quem cobra é a pessoa, com a próxima ação já marcada. Com nova data, os lembretes normais voltam a valer.
4. **A parcela entra em A receber já com responsável e próxima ação?** **Recomendo que sim:** quem cuida do contrato, "Falar com <cliente>", para amanhã, mudável em A receber. É a regra aprovada de toda vencida ter responsável e próxima ação.
5. **Onde fica o registro da sociedade na OAB, que o Escritório ainda não guarda?** **Recomendo guardar no Escritório e deixar a sócia dona preencher em Escritório › Recebimento, na folha "Marca e timbrado"**, opcional, e mostrar em "Dados do escritório". A outra opção é a equipe T3jus preencher no Console, na implantação, como o CNPJ.
6. **Que arquivos aceitar?** **Recomendo PNG, JPG e SVG, até 1 MB**, com o SVG e o JPG convertidos em PNG no servidor. A nota aprovada dizia só "PNG ou SVG", mas muito escritório só tem o logo em JPG.
7. **Logo claro demais para o papel:** **recomendo não salvar nas cores do arquivo e oferecer "Em uma cor só, na cor da tinta"**, além de outro arquivo ou o nome em letra. O resto da página se salva.
8. **Logo quadrado:** **recomendo "o logo e o nome ao lado" como padrão**, com "Só o logo" possível. Sozinho, na altura do carnê, o monograma fica pequeno e não diz quem é o escritório.
9. **Carnês e recibos já emitidos mudam quando o logo muda?** **Recomendo que não: ficam como foram**, com a cópia da marca guardada junto da cópia que já existe. O que foi entregue ao cliente não muda depois.
10. **O logo vai também para a proposta em Word e outros documentos do escritório?** **Recomendo que sim, numa próxima entrega**, como item novo no painel (AP-05). Esta entrega fica no carnê e no recibo.

## O que precisei supor

- **Diego Almeida** tem Comercial e Financeiro, como no carnê aprovado. **Felipe Matos** tem Contratos e não tem Financeiro, como na pergunta 6 aprovada da tela B.
- **O conflito:** Diego mudou a mesma parcela às 10h13. Ele é o único além de Marina com Financeiro.
- **A cobrança da parcela de Rosa** fica com Marina, que importou e cuida do contrato. A forma de pagamento é Pix.
- **Os logos são fictícios**, desenhados para o exemplo (monograma R|M, azul-marinho e ouro). Os nomes de arquivo também são fictícios ("logo-ribeiro-matos.png", "rm-monograma.png", "logo-dourado.png", "logo-whatsapp.jpg"). O registro OAB/SP 31.874 é o fictício dos desenhos aprovados.
- **Os limites** são propostas para a Carol ou o programador ajustarem:
  - 600 px no lado maior;
  - 8:1 de proporção;
  - 3:1 de contraste;
  - as caixas de 56 × 12 mm no carnê e 92 × 20 mm no recibo.
