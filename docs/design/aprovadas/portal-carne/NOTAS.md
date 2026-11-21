# Portal: carnê de pagamento · notas

**Aprovado pela Carol em 20/11/2026 às 22h20 (Bahia), com "aprovado" e sem mudanças: as recomendações das 12 perguntas valem como decisões.** Atende a **FI-23**: o escritório gera no Portal, a partir das parcelas do contrato, um PDF em A4 com as parcelas destacáveis (canhoto do escritório e via do cliente), com o Pix do próprio escritório, para imprimir ou mandar ao cliente pelo WhatsApp. Não depende de boleto registrado nem de provedor de pagamento.

O ponto de partida é o Financeiro aprovado (ficha do contrato de Hélio Batista Corrêa em A receber) e a ficha do contrato em Contratos. As peças aprovadas não mudaram: o gerador importa o `financeiro.py`, o `contratos.py`, o `pecas.py` e o `comum.py` aprovados, sem mudança, e acrescenta os estados novos com peças de prefixo `cn-`.

## Como abrir

- `index.html` apresenta o desenho para aprovação: primeiro o modelo A4 (a peça principal), depois o fluxo, com as capturas de computador (1440) e celular (390) e os links para os HTML. Funciona publicado junto com os arquivos desta pasta (caminhos relativos).
- `carne-a4.html` é o modelo imprimível, com CSS de impressão real (`@page { size: A4 }`, uma folha por página, quebra depois de cada folha). Na tela mostra as folhas e uma barra com as variações (`?estado=padrao`, `vencida`, `uma`, `sem-pix`, `pb`) e o botão Imprimir, que some na impressão. No celular a folha aparece inteira, reduzida.
- `carne-exemplo.pdf` é o PDF real do estado padrão, gerado pelo Chromium com `page.pdf({format:'A4'})`: 2 páginas A4, sem página em branco. Os QR Codes do PDF foram lidos de volta (jsQR) e devolvem o Pix copia e cola certo.
- `financeiro.html?estado=…`, `contratos.html?estado=contrato-carne` e `escritorio.html?estado=…` seguem o padrão das telas aprovadas (`<template data-est>`). Abaixo de 760 px viram celular. Funcionam as janelas (abrir, fechar, Esc) e os links entre os estados principais; o resto é desenho.
- `_fonte/gerar.sh` refaz tudo (HTML, PDF, miniaturas, capturas WebP, axe):
  - `carne_dados.py`: dados fictícios, o BR Code do Pix (EMV com CRC16) e o QR em SVG (biblioteca `segno`, instalada numa pasta temporária pelo `gerar.sh`);
  - `carne_a4.py`: o modelo A4;
  - `carne.py`: os estados novos do Financeiro, de Contratos e de Escritório › Recebimento;
  - `casos_cn.py`: a lista de estados e o `index.html`;
  - `fotos.cjs`: miniaturas da primeira folha (usadas na janela), o PDF, as capturas e as conferências;
  - `comum.py`, `financeiro.py`, `contratos.py`, `pecas.py`, `webp.py`: cópias sem mudança das aprovadas. O `comum.py` lê o CSS das telas aprovadas em `/home/claude/t3just/docs/design/aprovadas/`, como no Financeiro aprovado.

## Estados (22, cada um em computador e celular)

| # | Estado | Onde | Quem | O que mostra |
|---|---|---|---|---|
| 1 | `a4-padrao` | carne-a4 | — | Capa e parcelas 4/6 a 6/6, 3 por folha, 2 folhas A4 |
| 2 | `a4-vencida` | carne-a4 | — | A 3/6 escolhida à mão: "vencida em 25/10", encargos a combinar, Pix sem valor |
| 3 | `a4-uma` | carne-a4 | — | 1 parcela por folha: via grande com passo a passo, canhoto embaixo |
| 4 | `a4-sem-pix` | carne-a4 | — | Sem chave Pix: as instruções de pagamento do escritório no lugar do Pix |
| 5 | `a4-pb` | carne-a4 | — | Prévia em preto e branco |
| 6 | `contrato-carne` | Financeiro | Diego | Ficha do contrato com "Gerar carnê" e a folha "Carnê" vazia |
| 7 | `carne` | Financeiro | Diego | Janela "Gerar carnê" no padrão |
| 8 | `carne-escolher` | Financeiro | Diego | Escolher as parcelas (pagas sem poder marcar; a vencida pode entrar) |
| 9 | `carne-gerando` | Financeiro | Diego | Gerando o PDF |
| 10 | `carne-erro` | Financeiro | Diego | Erro ao gerar, com "Tentar de novo" |
| 11 | `carne-whats` | Financeiro | Diego | Prévia da mensagem a Marta Corrêa, com o PDF |
| 12 | `carne-gerado` | Financeiro | Diego | Aviso de sucesso e o histórico do carnê na ficha |
| 13 | `carne-desatualizado` | Financeiro | Diego | A 5/6 mudou depois do carnê: aviso e "Gerar de novo" |
| 14 | `carne-sem-pix` | Financeiro | Marina | Sem chave: aviso com o caminho para cadastrar |
| 15 | `carne-sem-pix-equipe` | Financeiro | Diego | Sem chave: "Quem cadastra é Marina Ribeiro" e "Pedir a Marina Ribeiro" |
| 16 | `contratos-carne` | Contratos | Marina | O mesmo atalho na ficha do contrato, aba Recebimentos |
| 17 | `recebimento` | Escritório | Marina | Chave Pix, recebedor, cidade, Pix de teste, instruções e marca |
| 18 | `recebimento-vazio` | Escritório | Marina | Sem chave cadastrada |
| 19 | `recebimento-erros` | Escritório | Marina | CNPJ inválido, nome com mais de 25 letras, cidade em branco |
| 20 | `recebimento-trocar` | Escritório | Marina | Confirmação antes de trocar a chave (`alertdialog`) |
| 21 | `recebimento-salvo` | Escritório | Marina | Chave trocada: aviso de sucesso e o carnê que ficou desatualizado |
| 22 | `recebimento-equipe` | Escritório | Diego | Só para ler |

## Decisões de design

1. **O carnê é do escritório.** No alto de cada via vem o nome do escritório em serifa vinho, com CNPJ e registro na OAB. O T3jus aparece só no rodapé de cada via, com o símbolo oficial em vinho (versão de impressão do `LEIA-ME` da marca) e "Modelo T3jus", em letra pequena. O logo do T3jus não foi redesenhado.
2. **3 parcelas por folha.** Cada faixa tem o canhoto (47 mm) à esquerda e a via do cliente à direita, separados por linha pontilhada vertical. Cada faixa é cercada por linhas pontilhadas de corte, com a tesoura. A capa ocupa a primeira faixa, também destacável. As faixas têm altura fixa (277 mm ÷ 3), e o gerador confere que nada passa da faixa.
3. **Via do cliente:** escritório, "parcela 4 de 6", cliente com CPF parcial, contrato e objeto, mês de referência, vencimento, valor em destaque, QR, chave e recebedor, Pix copia e cola, identificador da parcela e, no pé, a multa e os juros do contrato e o WhatsApp do escritório para o recibo.
4. **Canhoto:** escritório, parcela, cliente, contrato, vencimento, valor, identificador e as linhas "pago em ___/___/___", forma e visto.
5. **Capa:** as parcelas do carnê com o total, como pagar com Pix em 3 passos (inclui conferir o nome do recebedor), o aviso de que o recibo chega pelo WhatsApp, o número do escritório e a regra de multa e juros.
6. **Preto e branco.** Todo texto que informa é tinta ou vinho escuro; o âmbar é só o filete sob o nome e o fundo da caixa do recibo. O QR é preto no branco. A prévia `a4-pb` mostra a folha em tons de cinza.
7. **Pix estático do escritório (BR Code).** O T3jus monta o copia e cola pelo padrão do Banco Central (EMV-MPM): chave do escritório, valor da parcela, nome do recebedor (até 25 letras) e cidade (até 15), o identificador da parcela no campo txid (`C2026014P04`: contrato sem traço, P e o número da parcela) e "Parcela 4/6 C-2026-014" na informação adicional. O CRC16 confere. O QR é gerado do mesmo texto. A baixa continua manual, em "Registrar recebimento".
8. **Parcela vencida** só entra se alguém escolher. Sai com o selo "Vencida em 25/10", "multa e juros, valor a combinar com o escritório" e o Pix **sem valor** (o app do banco pede o valor), com o mesmo identificador.
9. **Sem chave Pix,** o carnê sai do mesmo jeito, com as instruções de pagamento em texto do escritório no lugar do Pix e o pedido de escrever o identificador na descrição. Quem é dono vê o caminho para cadastrar; quem não é vê "Quem cadastra é Marina Ribeiro" e pode pedir (aviso no sino dela).
10. **A janela "Gerar carnê"** traz o padrão pronto (parcelas a vencer, 3 por folha, com capa), mostra a chave em uso e a prévia real da primeira folha, que muda com as escolhas. As três ações ficam no pé: Baixar PDF, Imprimir e Mandar pelo WhatsApp. Mandar abre a prévia da mensagem antes de enviar, como na prestação de contas aprovada.
11. **O carnê fica guardado na ficha** (folha "Carnê"), com quem gerou, quando, quais parcelas, para quem foi e se foi lido. Gerar de novo cria outro carnê; o anterior continua no histórico.
12. **Carnê desatualizado.** Se uma parcela do carnê muda (vencimento ou valor) ou é cancelada, ou se a chave Pix é trocada, a folha "Carnê" avisa o que mudou, quem mudou e quando, e oferece "Gerar de novo". O carnê novo, mandado pelo WhatsApp, diz que substitui o anterior. A linha da parcela mostra "era 25/12".
13. **Escritório › Recebimento** é uma seção nova do Escritório, ao lado de "Dados do escritório" e "WhatsApp e IA" (aprovadas). Tem tipo e chave Pix, nome do recebedor e cidade como o banco mostra (com contador de letras), um **Pix de teste** para a sócia escanear no app do banco e conferir o nome antes de mandar carnês, as instruções de pagamento em texto e a marca no carnê (nome em letra ou logo). Erros: CNPJ ou CPF com dígito errado, e-mail ou celular inválido, nome com mais de 25 letras, cidade em branco. Trocar a chave pede confirmação e diz quais carnês ficam desatualizados.
14. **Celular.** As janelas sobem de baixo, com Baixar PDF e Imprimir lado a lado e Mandar pelo WhatsApp embaixo. O Financeiro mora no Mais (barra de baixo: Início, Conversas, Agenda, Mais), como no aprovado.

## Quem pode o quê

| Ação | Quem |
|---|---|
| Gerar, baixar, imprimir e mandar o carnê | Quem tem a área Financeiro (em A receber) ou Contratos (na ficha do contrato) |
| Ver a chave em uso | Quem gera o carnê (na janela) e quem abre Escritório › Recebimento |
| Cadastrar, trocar ou apagar a chave Pix, as instruções e a marca | Só a sócia dona |
| Pedir a chave à sócia dona | Quem gera o carnê e não é dono |

## Acessibilidade (WCAG 2.2 AA)

- **axe-core 4.10** (WCAG 2.0, 2.1 e 2.2, A e AA) em 44 capturas (22 estados × computador e celular): **nenhuma violação**. Nenhuma tela tem rolagem lateral e não houve erro de script. O resultado fica em `_conferencia.json`.
- **Alvos:** todos com 44 px ou mais; os botões compactos da folha "Carnê" têm 36 px, como nas tabelas aprovadas. A única exceção é a palavra-marca "T3jus" da moldura aprovada (24 px), igual às outras áreas.
- **Janelas:** `<dialog>` com `showModal()`; o foco vai para a primeira opção, para "Tentar de novo" no erro, para "Enviar a Marta" na prévia e para "Voltar" na troca de chave (`alertdialog`).
- **Formulários:** cada campo com `label`, grupos em `fieldset` e `legend`, erros ligados por `aria-describedby` com `aria-invalid` e um resumo no topo. O contador de letras fica vermelho quando passa do limite e o erro diz o que fazer.
- **No A4:** cada folha é uma região com rótulo ("Folha 1 de 2"), cada via tem rótulo ("Via do cliente, parcela 4 de 6") e cada QR tem texto alternativo com a parcela e o valor.

## O que precisa de dado novo no servidor

Todas as tabelas têm `escritorio_id` e passam por `proteger_tabela_escritorio`. O escritório vem da sessão, nunca do navegador. Dinheiro em centavos.

| Tabela | Campos | Observação |
|---|---|---|
| `escritorio_recebimento` | `escritorio_id` (único), `pix_tipo` (CNPJ, CPF, EMAIL, CELULAR, ALEATORIA), `pix_chave`, `recebedor_nome` (1 a 25, maiúsculas sem acento), `cidade` (1 a 15), `instrucoes` (até 400), `marca` (LETRA, LOGO), `logo_arquivo_id`, `atualizado_por`, `atualizado_em` | Escrita só pela função que confere se a pessoa é a sócia dona. Cada mudança vai para o histórico do escritório |
| `carnes` | `id`, `escritorio_id`, `contrato_id`, `formato` (TRES, UM), `com_capa`, `pix_tipo` e `pix_chave` usados (cópia), `arquivo_id`, `gerado_por`, `gerado_em`, `substitui_id`, `desatualizado_em`, `desatualizado_motivo` | Só inserção, mais a marca de desatualizado. Nada se apaga |
| `carne_parcelas` | `escritorio_id`, `carne_id`, `recebimento_id` (→ `recebimentos_previstos`), `vencimento` e `valor` (cópia do momento), `txid`, `sem_valor` | Parcela paga ou cancelada não entra (checagem no servidor) |
| `carne_envios` | `escritorio_id`, `carne_id`, `contato_id`, `telefone`, `enviado_por`, `enviado_em`, `entregue_em`, `lido_em`, `mensagem_id` | O mesmo caminho da prestação de contas aprovada |

- **Desatualizado:** em `recebimentos_previstos` nada se apaga e mudar uma condição cancela as futuras e cria outras (0200). Uma rotina compara as parcelas de cada carnê ativo com a cópia guardada: parcela cancelada, vencimento ou valor diferente, ou chave Pix trocada, marca o carnê como desatualizado e avisa no sino quem gerou e o responsável do contrato.
- **O PDF** sai do servidor, do mesmo HTML e CSS do modelo, com o Chromium sem tela, e fica guardado. O BR Code também é montado no servidor.
- **A forma das parcelas** (`recebimentos_previstos.forma`, 0220) não muda ao gerar o carnê (pergunta 6).

### API

| Rota | O que faz | Erros |
|---|---|---|
| `GET` e `PUT /v1/escritorio/recebimento` | Lê e salva a chave, o recebedor, a cidade, as instruções e a marca | `SO_DONO`, `CHAVE_INVALIDA`, `RECEBEDOR_LONGO`, `CIDADE_OBRIGATORIA` |
| `POST /v1/escritorio/recebimento/pedido` | Quem não é dono pede a chave à sócia dona | — |
| `POST /v1/contratos/:id/carnes` | Gera o carnê das parcelas escolhidas e devolve o PDF | `SEM_PARCELAS`, `PARCELA_PAGA`, `PARCELA_CANCELADA`, `CARNE_PDF_FALHOU`, `AREA_NAO_LIBERADA` |
| `GET /v1/carnes/:id/pdf` | Baixa o PDF guardado | 404 de outro escritório |
| `POST /v1/carnes/:id/envios` | Manda pelo WhatsApp do escritório | `SEM_WHATSAPP`, `JANELA_FECHADA_SEM_MODELO` |

### Para o painel

- A entrega desta tela atende **FI-23**.
- Itens "pendente", citando FI-23:
  - o envio pelo WhatsApp depende do WhatsApp do escritório ligado e, fora da janela de 24 horas, de um aviso "Carnê de pagamento" aprovado pela Meta (hoje a lista aprovada tem 6 avisos e este não está nela);
  - o envio do logo próprio, se a Carol quiser já (pergunta 10);
  - conferir com os bancos dos pilotos se o identificador aparece no extrato (pergunta 9).

## Perguntas para a Carol

1. **3 parcelas por folha ou 1 por folha, como padrão?** (Recomendo 3 por folha: economiza papel, é o carnê que o cliente reconhece e cabe tudo com folga. 1 por folha fica como opção.)
2. **A capa vem marcada por padrão?** (Recomendo sim. Ela explica como pagar e lembra o WhatsApp do escritório. Custo: com a capa, um carnê de 3 parcelas ocupa 2 folhas em vez de 1.)
3. **O carnê leva a marca do escritório e o T3jus só no rodapé?** (Recomendo sim: o documento é do escritório para o cliente dele. "Modelo T3jus" em letra pequena no pé de cada via.)
4. **Parcela vencida entra no carnê?** (Recomendo: só se alguém escolher, marcada como vencida, com o Pix sem valor, para o valor com multa e juros combinado com o escritório. Por padrão, só as que vão vencer.)
5. **O envio pelo WhatsApp entra já no desenho?** (Recomendo sim, com a prévia da mensagem antes de enviar, para o contato principal, pelo número do escritório. Fora da janela de 24 horas depende de um aviso novo aprovado pela Meta, que entra no painel como pendente.)
6. **Gerar o carnê muda a forma das parcelas para "Carnê"?** (Recomendo não. "Carnê" é o papel, não a forma de pagamento: a forma continua Pix, ou transferência quando o escritório não tem chave. O carnê fica no histórico da ficha, e a lista de formas não muda.)
7. **Quem fica com o canhoto?** (Recomendo: o escritório, quando entrega o carnê em mãos, para o controle em papel e para o pagamento em dinheiro. No PDF pelo WhatsApp vai o mesmo arquivo, com o canhoto; fazer um PDF sem canhoto só para o WhatsApp complica sem ganho.)
8. **A ficha aprovada mostra a folha "Pix da parcela" dizendo que "dá baixa sozinho quando o banco confirmar"** (FI-17, que depende de um banco ou intermediário). Sem provedor, essa folha deveria mostrar o Pix estático da parcela, o mesmo do carnê, sem prometer baixa sozinha. Não mexi na peça aprovada. (Recomendo ajustar esse texto ao programar, enquanto não houver provedor.)
9. **Pix depois do vencimento.** O Pix estático tem valor fixo: se o cliente pagar atrasado pelo QR, paga R$ 850,00, sem multa. (Recomendo deixar assim e dizer no carnê "fale antes com o escritório"; Pix com cálculo de encargos exige provedor.) O identificador vai no txid e na informação adicional, mas nem todo banco mostra isso no extrato. (Recomendo testar com os bancos dos pilotos antes de prometer.)
10. **Logo do escritório já na primeira entrega?** (Recomendo começar com o nome em letra, que sai bem em qualquer impressora, e liberar o envio do logo depois, com conferência de tamanho e contraste.)
11. **Recebimento fica em Escritório (seção nova) ou dentro do Financeiro?** (Recomendo Escritório: é dado do escritório, só a sócia dona muda, e vai servir também ao recibo e a outras cobranças.)
12. **Trocar a chave Pix marca os carnês já entregues como desatualizados?** (Recomendo sim, com o aviso no sino de quem gerou. O QR antigo continua pagando enquanto a chave antiga existir no banco, mas o cliente deve receber o carnê novo.)

## O que precisei supor

- O contrato de Hélio é o **C-2026-014**, como no pedido. Outro desenho aprovado (Equipe e OAB) usa C-2026-022 para Hélio, com outras condições; aqui vale a ficha do Financeiro aprovado (6 parcelas de R$ 850,00, Pix, dia 25).
- **Diego Almeida** tem as áreas Comercial e Financeiro (no Contratos aprovado ele aparece só com Comercial; no Financeiro aprovado ele é o responsável pela cobrança de Hélio). A pessoa nova entra só nestas páginas, sem mudar o `comum.py`.
- A ficha de Hélio em **Contratos** não existia; montei com as peças aprovadas da ficha de Contratos (cabeçalho, abas, programação dos recebimentos).
- Dados fictícios: CPF parcial `***.482.617-**`, registro da sociedade na OAB `OAB/SP 31.874`, banco e conta das instruções, telefone de Hélio. O WhatsApp do escritório, (11) 97405-2210, é o do desenho aprovado de WhatsApp e IA; Marta Corrêa, (11) 98114-3059, é a contato principal de Clientes.
- A chave Pix do escritório é o CNPJ; o recebedor como o banco mostra é "RIBEIRO E MATOS SOC ADV" e a cidade "SAO PAULO".
- O carnê desatualizado acontece no mesmo dia (18/11, às 16h40), para manter o "hoje" do Financeiro aprovado.
- O celular foi capturado em 390 px, como pedido (o Financeiro aprovado usou 412).
