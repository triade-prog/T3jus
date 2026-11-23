> **Aprovado pela Carol em 23/11/2026, 10h57 (Bahia), com todas as recomendações** (as perguntas do desenho e as do PLANO.md).

# Razão social: o que sobrou · notas do desenho (F3.146)

> Desenho para a aprovação da Carol, feito em 23/11/2026 sobre a `origin/main` (PR #155). Item **F3.146** do painel, ideia **PA-07**. Segue o `PLANO.md` desta pasta, inclusive a seção 12 (resposta à revisão). Nada foi programado e nada mudou no repositório.

São quatro peças pequenas dentro de desenhos já aprovados, que não mudam no resto:

- **D1 · Marca e timbrado** (`portal-nao-paga-logo`, `escritorio-dados-documentos` decisão 28): a prévia do carnê e do recibo.
- **D2 · janela "Gerar carnê"** (`portal-carne`): uma linha de aviso.
- **D3 · janela "Registrar recebimento"** (`portal-recibo-recorrente`): a mesma linha.
- **D4 · o alto do .docx** da proposta e dos documentos do modelo padrão (`escritorio-dados-documentos`, linha "Timbrado"; `carne-recibo-razao-social`, decisões 3 e 13).

A base de tudo é o timbrado aprovado em 22/11/2026 (`carne-recibo-razao-social`) e as funções que já existem em `packages/domain/src/timbrado.ts`. O desenho não cria regra nova de linhas: só leva a mesma regra para os lugares que ainda usam a antiga.

## O que muda e o que não muda

| Onde | Muda | Não muda |
|---|---|---|
| Marca e timbrado, prévia do carnê | Embaixo da marca, no lugar de "CNPJ · OAB", a linha da identificação da via: **razão social** · CNPJ · OAB, em texto corrido. O "Advocacia" pequeno quando o nome curto não diz isso | A marca, o "Via do cliente 4 de 6", o fio, a prévia em cores e em preto e branco |
| Marca e timbrado, prévia do recibo | As 4 linhas da folha do recibo (e o WhatsApp numa 5ª), com a razão social em destaque | A marca à esquerda, o fio |
| Marca e timbrado, razão social em branco | Uma linha de aviso embaixo da prévia, com "Completar em Escritório › Dados do escritório" | O resto da folha: o nome em letra ou o logo, a conferência do logo, o registro na OAB só para ler |
| Marca e timbrado, só para ler | A miniatura do carnê com a linha da identificação. Sem sociedade, para quem não tem Financeiro nem Contratos, a miniatura vem sem a linha e com uma frase | O resto da leitura |
| Janela "Gerar carnê" | Uma linha de aviso, logo abaixo da descrição (e do quadro da chave Pix, quando ele existe) | As parcelas, o formato, a capa, o Pix, a miniatura, os botões. O carnê impresso |
| Janela "Registrar recebimento" | A mesma linha, embaixo de "Gerar o recibo" e "Mandar o recibo pelo WhatsApp" | Todos os campos. O recibo impresso |
| .docx da proposta e dos documentos | As 4 linhas do timbrado no cabeçalho; com logo, o logo e as 4 linhas embaixo; o cabeçalho a 10 mm da borda; a caixa do logo de 92 × 12 mm; a 1ª linha em 11 pt com mais de 90 letras | As margens, a letra e o corpo do documento. O modelo enviado pelo escritório. As marcas de falta no corpo do contrato |

## Como abrir

- `index.html` mostra os 35 estados em computador (1440) e em celular (412), em 70 capturas. Clique numa imagem para abrir a página naquele estado.
- As páginas abrem sozinhas e o estado vem do endereço:
  - `marca.html?estado=` com `hoje`, `letra`, `logo`, `quadrado`, `sem-sociedade`, `razao-vazia`, `tipo-vazio`, `sem-advocacia`, `razao-longa`, `razao-longa-logo`, `leitura`, `leitura-letra`, `leitura-sem-sociedade` ou `leitura-sem-sociedade-sem-area`;
  - `carne.html?estado=` com `razao-dona`, `razao-equipe`, `tipo-dona`, `tipo-equipe`, `sem-pix-equipe`, `sem-sociedade` ou `completa`;
  - `recibo.html?estado=` com `razao-dona`, `razao-equipe`, `tipo-equipe`, `sem-recibo` ou `sem-sociedade`. Marcar e desmarcar "Gerar o recibo" funciona na página;
  - `docx.html?estado=` com `hoje`, `sem-logo`, `logo`, `logo-nome`, `sem-sociedade`, `razao-vazia-logo`, `razao-longa`, `razao-longa-logo` ou `endereco-antigo`. Também aceita `&cab=12.5` (distância do cabeçalho à borda, em mm) e `&logo=18` (altura da caixa do logo), para ver a folha sem as propostas 15 e 16. A caixa "Mostrar as medidas na folha" liga e desliga as marcas azuis.
- `escritorio.html` é a cópia sem mudança de `escritorio-dados-documentos/escritorio.html`: é para onde a linha de aviso leva.
- **Para refazer tudo:** `sh _fonte/gerar.sh <pasta>`. Precisa de python3 com Pillow, node com `playwright` e o `axe-core` (a variável `AXE_DIR` aponta a pasta). O gerador lê as telas aprovadas em `docs/design/aprovadas/` e o `portal.css` da `origin/main` sem mudar nada lá.
  - **Fidelidade ao código.** A moldura e os outros cartões vêm das páginas aprovadas (como em todos os pacotes). As peças que este desenho toca foram montadas como estão no código de hoje: a folha "Marca e timbrado" como o `MarcaTimbrado.tsx`, a janela "Gerar carnê" como a `JanelaCarne` (`Carne.tsx`) e a janela de registrar como a `JanelaRegistrar` (`Financeiro.tsx`). O CSS dessas peças é o real: o `css_real.py` lê do `portal.css` o bloco da Marca e timbrado, o `.lg-oab-ler` e o `.cn-chave` na hora de gerar.
  - **Peças novas:** prefixo `rz-` nas telas e `dx-` na folha do .docx. Conferi na `origin/main`: nenhuma classe `rz-` existe no `portal.css` nem no `console.css`. A linha de aviso usa a classe `.cn-chave` que já existe, mais `.rz-linha` e `.rz-ir`.
  - `rz_dados.py` repete em Python as funções de `timbrado.ts` e as duas novas do plano (`timbradoDoDocx` e `razaoSocialEmBranco`, que devolve `"TIPO"`, `"RAZAO"` ou nada).
  - `medir.cjs` mede o cabeçalho do .docx em cada estado e em 4 combinações; o resultado fica em `_fonte/_medidas.json`.

## Elenco

O de `carne-recibo-razao-social` (`rs_dados.py`, sem mudança): **Santana Advocacia, em Salvador**, razão social "SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS", CNPJ 47.318.552/0001-06, OAB/BA 4.217, sede na Av. Tancredo Neves, 1.632, sala 1.208, Caminho das Árvores, CEP 41820-020, (71) 3352-4180, `contato@santana.adv.br`, `santana.adv.br`, WhatsApp (71) 99187-4402. A sócia dona é Carol Santana (Carolina Soares Santana, OAB/BA 63.876-S). Os casos `sem-sociedade` (Carol Santana Advocacia), `razao-vazia`, `razao-longa` (150 letras) e `sem-advocacia` (Ribeiro & Matos, São Paulo, sócia dona Marina Ribeiro) são os de lá.

A mais, aqui:
- **Tipo em branco:** o `razao-vazia` com o tipo nulo (escritório migrado que ainda não escolheu o tipo).
- **Endereço antigo:** o texto do cadastro antigo de `escritorio-dados-documentos` ("Av. Tancredo Neves 1632 sl 1208 - Caminho das Arvores"), sem CEP.
- **Logo quadrado:** o monograma do logo fictício do Santana, para "o logo e o nome ao lado".
- **Bruna Teixeira**, da equipe, com Contratos e Financeiro (inventada aqui: o elenco do Santana não tinha alguém com Financeiro). Paula Nunes, só com as partes comuns, é a do elenco aprovado.
- **A proposta P-2026-021**, para Gabriela Teixeira Nunes, e o contrato de Hélio Batista Corrêa, no corpo das folhas do .docx.

## Estados (35, cada um em computador e celular)

| # | Estado | Página | O que mostra |
|---|---|---|---|
| 1 | `mt-hoje` | marca | A prévia como o código desenha hoje |
| 2 | `mt-letra` | marca | Nome em letra: a linha da identificação no carnê e as 4 linhas no recibo |
| 3 | `mt-logo` | marca | Com o logo largo |
| 4 | `mt-quadrado` | marca | Logo e o nome ao lado |
| 5 | `mt-sem-sociedade` | marca | "Carolina Soares Santana · OAB/BA 63.876-S · sem CNPJ" |
| 6 | `mt-razao-vazia` | marca | A linha só com o CNPJ e o aviso embaixo da prévia |
| 7 | `mt-tipo-vazio` | marca | O aviso com o texto do tipo em branco |
| 8 | `mt-sem-advocacia` | marca | "ADVOCACIA" pequeno, no carnê e no recibo |
| 9 | `mt-razao-longa` | marca | 150 letras, em letra um pouco menor |
| 10 | `mt-razao-longa-logo` | marca | 150 letras e logo |
| 11 | `mt-leitura` | marca | Só para ler (Bruna), com o logo |
| 12 | `mt-leitura-letra` | marca | Só para ler, nome em letra |
| 13 | `mt-leitura-sem-sociedade` | marca | Só para ler, sem sociedade, quem tem Financeiro: com o nome completo |
| 14 | `mt-leitura-sem-sociedade-sem-area` | marca | Só para ler, sem sociedade, sem área: sem a linha, com a frase |
| 15 | `cn-razao-dona` | carne | A linha e "Completar em Escritório › Dados do escritório" |
| 16 | `cn-razao-equipe` | carne | A linha, quem completa e "Ver em Escritório › Dados do escritório" |
| 17 | `cn-tipo-dona` | carne | O texto do tipo em branco |
| 18 | `cn-tipo-equipe` | carne | O mesmo, para a equipe |
| 19 | `cn-sem-pix-equipe` | carne | O quadro da chave Pix e a linha, juntos |
| 20 | `cn-sem-sociedade` | carne | Sem aviso |
| 21 | `cn-completa` | carne | Sem aviso |
| 22 | `rg-razao-dona` | recibo | A linha embaixo das opções do recibo |
| 23 | `rg-razao-equipe` | recibo | Para a equipe |
| 24 | `rg-tipo-equipe` | recibo | O texto do tipo em branco |
| 25 | `rg-sem-recibo` | recibo | "Gerar o recibo" desmarcado: sem aviso |
| 26 | `rg-sem-sociedade` | recibo | Sem aviso |
| 27 | `dx-hoje` | docx | O .docx de hoje (3 linhas) |
| 28 | `dx-sem-logo` | docx | 4 linhas, sem logo |
| 29 | `dx-logo` | docx | Logo e 4 linhas |
| 30 | `dx-logo-nome` | docx | Logo, o nome curto ao lado e 4 linhas |
| 31 | `dx-sem-sociedade` | docx | A advogada, sem CPF |
| 32 | `dx-razao-vazia-logo` | docx | Com logo, a 1ª linha sai |
| 33 | `dx-razao-longa` | docx | 150 letras, sem logo |
| 34 | `dx-razao-longa-logo` | docx | 150 letras e logo, o pior caso |
| 35 | `dx-endereco-antigo` | docx | O contrato com o endereço antigo |

## A medida do cabeçalho do .docx

Hoje o cabeçalho começa a 12,5 mm da borda (`w:header="709"`) e o texto a 30 mm (`w:top="1701"`): o cabeçalho tem **17,5 mm**. Quando passa disso, o Word empurra o texto para baixo em toda página. Medi na folha (Liberation Serif, com as medidas da Times New Roman), em 4 combinações. "Perde" é quanto o texto desce em cada página (uma linha do corpo, com espaço de 1,5, tem cerca de 6,4 mm).

| Estado | Cabeçalho | Hoje (12,5 mm; logo 18 mm) | Só o cabeçalho a 10 mm | Só o logo de 12 mm | **As duas propostas** |
|---|---:|---:|---:|---:|---:|
| Como sai hoje (3 linhas) | 15,1 mm | cabe | | | |
| Sem logo (4 linhas) | 18,5 mm | perde 1,0 mm | cabe | perde 1,0 mm | **cabe** |
| Sem sociedade | 18,5 mm | perde 1,0 mm | cabe | perde 1,0 mm | **cabe** |
| Endereço antigo | 18,5 mm | perde 1,0 mm | cabe | perde 1,0 mm | **cabe** |
| Logo, ou logo e nome | 37,6 / 31,8 mm | perde 20,1 mm | perde 17,6 mm | perde 14,3 mm | **perde 11,8 mm** |
| Razão vazia, com logo | 32,3 / 26,5 mm | perde 14,8 mm | perde 12,3 mm | perde 9,0 mm | **perde 6,5 mm** |
| 150 letras, sem logo | 26,7 mm | perde 9,2 mm | perde 6,7 mm | perde 9,2 mm | **perde 6,7 mm** |
| 150 letras e logo | 45,8 / 39,7 mm | perde 28,3 mm | perde 25,8 mm | perde 22,2 mm | **perde 19,7 mm** |

(Onde há duas alturas, a primeira é com o logo de 18 mm e a segunda com o de 12 mm.) A conta do plano (seção 9) estava certa: com 4 linhas e sem logo, o cabeçalho passa 1 mm do espaço de hoje.

## Decisões de design

### D1 · Marca e timbrado

1. **A prévia mostra o papel como ele sai** (pergunta 2 do plano). A miniatura do carnê usa `identificacaoDoCarne` e a do recibo `linhasDoTimbreRecibo`, as mesmas funções do papel. Hoje a prévia mostra "CNPJ · OAB" e, no recibo, o nome curto no lugar da razão social e o endereço antigo (estado `mt-hoje`), diferente do papel que sai desde a F3.133.
2. **A linha da identificação vai embaixo da marca, com o número da parcela à direita**, como na via (decisão 8 do carnê): razão social em negrito, "CNPJ · OAB" em cinza, em texto corrido na letra de 9 px da miniatura. CNPJ, OAB, CEP e telefones não quebram no meio. Se a razão social é igual ao nome curto, ou está vazia, ela não se repete (decisão 3); sem nada para mostrar, a linha some.
3. **O "Advocacia" pequeno** entra embaixo do nome em letra quando o nome curto não diz isso, nas duas miniaturas (decisão 4 do carnê; estado `mt-sem-advocacia`).
4. **A miniatura segue as medidas do papel.** O logo da miniatura do carnê fica um pouco menor (32 px de altura, 29 px com mais de 90 letras, no lugar de 38 px), na mesma proporção da caixa do logo da via, que passou de 12 para 10 mm (decisão 9 do carnê). Com mais de 90 letras, a linha do carnê e a 1ª linha do recibo ficam um pouco menores (decisão 13). O bloco do recibo ocupa até 56% da largura, como a coluna de 96 mm da folha (no código de hoje, 48%).
5. **A miniatura cresce para baixo**, como o papel, sem cortar nem resumir: com 150 letras, a do carnê ganha uma linha e a do recibo fica mais alta. É o caso raro e é o que vai sair.
6. **Com a razão social em branco, a mesma linha de aviso das janelas aparece embaixo da prévia** (estados `mt-razao-vazia` e `mt-tipo-vazio`). É onde a sócia dona olha o papel; a folha só é editada por ela, então o caminho é sempre "Completar". Não estava no plano (veja a pergunta 3).
7. **Só para ler, sem sociedade** (seção 12 do plano, ponto A1). A prévia com o nome completo e a OAB da advogada aparece para quem tem Financeiro ou Contratos, o mesmo público que já recebe esses dados no carnê. Para os outros, a miniatura vem **sem a linha** e com uma frase embaixo: "Embaixo da marca, o carnê leva o nome completo e a OAB da advogada. Essa linha aparece aqui para quem tem Financeiro ou Contratos." Assim ninguém acha que o papel sai sem identificação, e o dado não chega a quem não precisa. Num escritório com sociedade a linha aparece para todos, porque razão social, CNPJ e OAB da sociedade já são de toda a equipe.
8. **O texto para leitor de tela** de cada miniatura passa a dizer a identificação inteira ("…com o nome em letra e a identificação do escritório: SANTANA, LIMA E OLIVEIRA… · CNPJ … · OAB/BA 4.217…").

### D2 e D3 · a linha de aviso

9. **Uma linha, não um quadro**, no padrão da linha da chave Pix (`.cn-chave`: fundo sal, ícone de alerta vinho, texto de 13 px). Só na tela; o papel continua saindo com o nome curto, sem "[falta]" (pergunta 3 de `carne-recibo-razao-social`).
10. **Dois textos, pela resposta de `razaoSocialEmBranco`** (seção 12 do plano):
    - `"RAZAO"` (sociedade sem razão social): "**A razão social do escritório está em branco.** O carnê sai com o nome Santana Advocacia no lugar dela."
    - `"TIPO"` (tipo em branco, escritório migrado, que pode ser de advogada sozinha): "**Falta dizer em Dados do escritório se ele é uma sociedade.** O carnê sai com o nome Santana Advocacia, sem razão social. Se a advogada atua sem sociedade, é só marcar isso lá, e o aviso some."
    - No recibo, "O recibo sai…"; na Marca e timbrado, "O carnê e o recibo saem…".
11. **O caminho depende de quem vê.** A sócia dona vê "Completar em Escritório › Dados do escritório" (abre o editar). Os outros leem "Quem completa é Carol Santana, a sócia dona." e "Ver em Escritório › Dados do escritório" (abre só para ler, decisão 19 de `escritorio-dados-documentos`). Sem botão de "pedir" (pergunta 5 do plano).
12. **O caminho fica numa linha própria, com 44 px de altura**, embaixo do texto, com ícone (lápis para completar, olho para ver). No `.cn-chave` de hoje não há link; aqui ele é a ação, e no celular precisa de alvo de toque inteiro.
13. **Onde a linha fica:**
    - **Gerar carnê:** logo abaixo da descrição da janela, antes das parcelas. Se o escritório também não tem chave Pix, o quadro aprovado do Pix vem primeiro e a linha embaixo (estado `cn-sem-pix-equipe`): o Pix muda o carnê mais.
    - **Registrar recebimento:** embaixo de "Gerar o recibo" e de "Mandar o recibo pelo WhatsApp", que é a opção de dentro do recibo. Com "Gerar o recibo" desmarcado não há papel, então a linha some (estado `rg-sem-recibo`; funciona na página).
14. **Sem sociedade e com a razão social preenchida, nada aparece**: a janela é a de hoje.

### D4 · o alto do .docx

15. **O cabeçalho passa a começar a 10 mm da borda** (`w:header="567"`, no lugar de 709). Com isso as 4 linhas sem logo (18,5 mm) cabem no espaço e o texto continua começando a 30 mm, como hoje. É a única forma de as 4 linhas caberem sem mexer na letra nem na margem do documento. 10 mm ainda fica dentro da área que qualquer impressora imprime.
16. **No .docx, a caixa do logo passa de 92 × 18 mm para 92 × 12 mm.** Com 18 mm, o logo e as 4 linhas empurram o texto 20 mm em toda página (mais de 3 linhas de texto). Com 12 mm, 11,8 mm. É a mesma altura do logo na via de 1 parcela por folha do carnê. O recibo continua com a caixa de 92 × 20 mm: lá a marca fica ao lado do timbrado, e não em cima.
17. **A ordem com logo é: o logo (com o nome curto ao lado, quando o jeito é "logo e nome"), depois as 4 linhas** (pergunta 4 do plano). A 1ª linha sai só quando é igual ao nome curto (decisão 3 do carnê): é o caso da razão social vazia.
18. **Letras:** a 1ª linha em negrito de 13 pt; com mais de 90 letras, 11 pt (`razaoLonga`), e 150 letras ocupam 3 linhas. As outras em 9 pt cinza. O fio vinho continua embaixo da última linha. Tudo centralizado, como hoje.
19. **O que sobra de cabeçalho grande é caso raro e fica assim:** com 150 letras o texto desce 6,7 mm (sem logo) ou 19,7 mm (com logo). Testei 10 pt para a razão social longa: ganha uma linha (cerca de 4 mm), mas fica do tamanho do resto e perde o destaque. Não recomendo.
20. **Nunca "[falta]" nem "confira" no cabeçalho.** Com o endereço antigo, o cabeçalho leva o texto antigo e a cidade/UF; a marca `[ENDEREÇO: confira]` continua no corpo do contrato, como aprovado (decisão 7 de `escritorio-dados-documentos`). O pedido citava `[ENDEREÇO DO ESCRITÓRIO: confira]`; a marca aprovada para o endereço antigo é `[ENDEREÇO: confira]` (`[ENDEREÇO DO ESCRITÓRIO: falta]` é a do endereço vazio).
21. **A OAB da sociedade no cabeçalho vem de Dados do escritório** (seção 12, ponto M7), e não mais da marca: é o mesmo número que aparece em Marca e timbrado, só para ler.
22. **O corpo não muda.** "Apresentamos a proposta de Santana Advocacia…" e a assinatura com o nome curto ficam como estão (seção 6 do plano).

## Para quem programar

- **`docx.ts`:** `w:header="567"` em `criarDocx`; `logoXml` com a caixa de 92 × 12 mm (`12 * EMU_MM`); `cabecalhoXml` com o logo num parágrafo próprio (o nome curto ao lado, no jeito "logo e nome") e as linhas de `timbradoDoDocx` depois, a 1ª em `sz 26` (ou `sz 22` com `longa`). O texto alternativo do logo (`descr`) continua o nome curto. Conferir se o `documento_pdf.ts` lê a distância do cabeçalho ou usa uma fixa: o PDF do contrato deve seguir a mesma conta.
- **`MarcaTimbrado.tsx`:** `MiniCarne` com a marca, `subMarcaAdvocacia` e `identificacaoDoCarne` numa coluna (`.rz-marca`, `.rz-sub`, `.rz-ident`), o número à direita; `MiniRecibo` com `linhasDoTimbreRecibo` (`.rz-ender`). `.rz-longo` com `razaoLonga`. A linha de aviso embaixo de `PreviaMarca` quando `razaoSocialEmBranco` não é nulo. `MarcaParaLer` sem a linha e com a frase (`.rz-nota`) quando o timbrado não vem (sem sociedade, sem Financeiro nem Contratos).
- **A linha de aviso** é um componente só (`LinhaRazaoSocial`?), com `papel` ("O carnê", "O recibo", "O carnê e o recibo"), o motivo, `dono` e o nome da sócia dona. As classes estão no CSS do `paginas.py` (`CSS_RZ`).
- **Testes de tela** (e2e): os estados 15 a 26 e 6, 7, 13 e 14; o link com 44 px; a linha some ao desmarcar "Gerar o recibo".

## Acessibilidade (WCAG 2.2 AA)

- **axe-core 4.10** (WCAG 2.0, 2.1 e 2.2, A e AA, inclusive contraste) nas 70 capturas: o resultado está em `_conferencia.json` e no resumo abaixo.
- **Resultado: nenhuma violação nas 70 capturas** e nenhuma rolagem lateral, em 1440 e em 412. Nenhum erro de script. A conferência de alvos menores que 44 px achou só duas coisas que não são deste desenho: a palavra "T3jus" no alto do trilho (204 × 24 px, da moldura aprovada) e o campo de arquivo escondido do "Trocar o logo" (1 × 1 px, `.sr`, como no código: o alvo é o botão "Trocar o logo", de 44 px). Os links da linha de aviso têm 44 px.
- A linha de aviso é um parágrafo com o ícone escondido do leitor de tela; o título em negrito vem primeiro. O caminho é um link de verdade, com texto que diz para onde vai, e alvo de 44 px.
- As miniaturas são `role="img"` com o texto inteiro da identificação. A folha do .docx é `role="img"` com a medida no texto. As marcas azuis da folha são só visuais (`aria-hidden`) e a caixa "Mostrar as medidas na folha" as tira.
- Contraste: o texto da linha é a tinta sobre o sal 2 (mais de 13:1); o link é o vinho sobre o sal 2 (mais de 9:1).

## O que precisei supor

- **Bruna Teixeira**, da equipe com Contratos e Financeiro, e a proposta de Gabriela Teixeira Nunes são inventadas.
- **O tamanho do texto no Word.** Usei espaço simples de 1,15 para a Times New Roman e as medidas da Liberation Serif. No Word de verdade a diferença deve ser de décimos de milímetro; o teste do plano (`timbrado_docx_test.ts`) mede no PDF do contrato.
- **A miniatura do carnê na janela** é uma captura da folha aprovada de `carne-recibo-razao-social` no estado do escritório (no código, é a folha de verdade reduzida).
- **A janela "Registrar recebimento"** foi montada do código de hoje, sem o reembolso e o comprovante, que não mudam.

## Perguntas para a Carol

1. **O cabeçalho do .docx passa a começar a 10 mm da borda, para as 4 linhas caberem sem empurrar o texto?** Recomendado: **sim** (decisão 15). Sem isso, toda proposta e todo contrato sem logo perdem 1 mm por página e o texto deixa de começar na margem de 30 mm.
2. **No .docx, o logo fica numa caixa de até 12 mm de altura, no lugar de 18 mm?** Recomendado: **sim** (decisão 16). Com 18 mm e as 4 linhas, cada página perde mais de 3 linhas de texto; com 12 mm, menos de 2. O logo continua nítido e com a largura de até 92 mm.
3. **A linha de aviso aparece também em Marca e timbrado, embaixo da prévia, quando a razão social está em branco?** Recomendado: **sim** (decisão 6). É onde a sócia dona olha como o papel sai; a prévia mostra o nome curto e a linha explica por quê, com o caminho para completar. Não estava no plano.
4. **Sem sociedade, quem não tem Financeiro nem Contratos vê a miniatura sem a linha da advogada, com uma frase dizendo que ela existe?** Recomendado: **sim** (decisão 7), com a opção (a) da pergunta 1 do plano. Se a Carol escolher a opção (b) (o nome e a OAB para toda a equipe), a frase sai e todos veem a linha.
5. **As perguntas 2 a 5 do plano** (a prévia do recibo com as 4 linhas, o aviso só na hora de gerar, a razão social embaixo do logo no .docx, o aviso sem botão de "pedir"): o desenho segue as quatro recomendações.
