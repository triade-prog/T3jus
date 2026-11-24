# Documentos marcados conforme a área · notas do desenho (D35, CH-14)

> **Aprovado pela Carol em 24/11/2026, às 15h13 (Bahia).** No painel, este desenho virou o **D36**, e as entregas, **F3.170** (servidor e configuração) e **F3.171** (Gerar abrindo marcado): o D35, o F3.168 e o F3.169 citados abaixo foram ocupados por outros itens antes da entrega. Esta cópia não leva o `index.html` (10 MB); as telas estão em `telas.html` e nos `.webp`.

> Desenho para a aprovação da Carol, feito em 24/11/2026. Item **D35** do painel, ideia **CH-14**. Segue o `PLANO.md` da pasta de cima com os ajustes da `REVISAO.md`. Onde os dois divergem, vale a revisão. Também adota os ajustes opcionais 7, 8, 9, 10 e 12. Nada foi programado e nada mudou no repositório.

Hoje, Gerar documentos abre sempre com o contrato, a procuração e a declaração de hipossuficiência marcados, e os modelos próprios do escritório desmarcados. Com este desenho:

- o escritório diz uma vez, para cada área, o que vem marcado. Isso fica numa folha nova, **“Documentos por área”**, em Contratos › Procurações e modelos › Modelos de documento, embaixo da lista dos modelos;
- Gerar documentos abre com esses documentos marcados. No grupo “Documentos”, o seletor **“Sugestão para: [área]”** diz de onde veio a área, e cada caixa sugerida diz “sugerido” em texto. A pessoa sempre pode mudar antes de gerar.

Parte de desenhos aprovados, sem mudá-los:

- **Procurações e modelos** (`portal-procuracoes`): Gerar, Gerar de novo, Modelos de documento e a empresa (declaração de PJ com o aviso da Súmula 481).
- **Quem assina pelo cliente menor** (D25, `portal-responsavel-legal`): Gerar de Pedro, com o quadro de quem assina.
- **Documentos para começar** (EX-18): a versão aprovada mais nova, a de `portal-prazo-comprovante`, com a folha “Prazo do comprovante”.

É coerente com o desenho em andamento do **F3.160** (`telas/editar-vindo-de-gerar/desenho/`). Nas telas de Pedro, o aviso de falta, o “Completar na ficha” (que leva às telas do F3.160), o “Ficha de Pedro salva.” e o resultado de Documentos gerados são os de lá, sem mudança. Este desenho só acrescenta o grupo “Documentos” e as frases da área.

## Como abrir

- **`index.html`** é a galeria para a Carol: uma página só, autossuficiente (fontes e capturas embutidas), com as 5 perguntas no alto. Cada estado aparece com o computador e o celular lado a lado. Clique numa imagem para ampliar.
- **`telas.html`** são as telas vivas. O botão **Estados**, no canto de baixo, troca de estado, e o estado também vem do endereço, por exemplo `telas.html?estado=gerar-trocou-area`. Abaixo de 760 px, vira a versão de celular. Funcionam as abas da prévia e as janelas; o resto é desenho. Os links “Completar na ficha” de Pedro abrem o desenho do F3.160, na pasta vizinha.
- **`<estado>-computador.webp`** (1440 px) e **`<estado>-celular.webp`** (390 px), em escala 2.
- **`_conferencia.json`**: o axe, a rolagem lateral, os alvos pequenos e os erros de script de cada captura.
- **Para refazer:** `sh _fonte/gerar.sh <pasta>`. Precisa de python3 com Pillow, node com `playwright` e o pacote `axe-core` 4.10.3 (a variável `AXE_DIR` aponta a pasta).
  - Cópias sem mudança do `_fonte` do F3.160: `clientes.py`, `juridico.py`, `ficha_ligada.py`, `procuracoes.py`, `contratos.py`, `pecas.py`, `peticoes_css.txt`, `responsavel.py`, `editar_gerar.py`, `comum.py`, `fotos.cjs` e `webp.py`.
  - Cópias sem mudança de `portal-prazo-comprovante/_fonte`: `jornada.py` e `prazo.py`.
  - Deste desenho: `documentos_area.py`, que lê `editar_gerar.py` até os estados e `prazo.py` até o reflexo na ficha; `estados.py`, com as descrições; e `galeria.py`, adaptada da do F3.160. As peças novas têm o prefixo `da-`.

## Elenco

O do D25 e do F3.160, sem mudança. Escritório Ribeiro & Matos. Marina Ribeiro, sócia dona, é quem está usando. “Hoje” é 22/11/2026.

| Quem | Para mostrar |
|---|---|
| **Benedito Souza Lima**, C-2026-033, aposentadoria por idade, em elaboração | A área vem do contrato (Previdenciário). Primeira geração e Gerar de novo (versão 1 às 15h10) |
| **Pedro Henrique Alves Souza**, 12 anos, e a mãe, **Joana**, C-2026-034, alimentos, em elaboração, **sem área e sem caso** | O seletor, a troca de área, a área gravada no contrato e a volta da ficha (F3.160) |
| **Farmácia Bom Jesus Ltda.**, C-2026-019, ativo desde 02/09/2026, com o caso “Cobrança de duplicatas” | A área vem do caso (Cível). Contrato já assinado. Declaração de PJ com o aviso da Súmula 481 |
| **Diego Almeida**, da equipe, com a área Contratos | Quem salvou antes (conflito) e a outra resposta da pergunta 3 |

**O que o escritório configurou** (fictício):

| Área | Vem marcado | Quem mudou |
|---|---|---|
| Previdenciário | contrato, procuração, declaração de hipossuficiência e declaração de residência; às 15h20 de hoje, Marina acrescenta o requerimento ao INSS | Marina, 10/11 e hoje |
| Trabalhista | contrato, procuração, declaração de hipossuficiência e declaração de residência | Marina, 10/11 |
| Outra ou sem área | nada | Felipe Matos, 10/11 |
| As outras 5 | a sugestão do T3jus: contrato, procuração e declaração de hipossuficiência | ninguém |

Os modelos próprios são “Declaração de residência” (enviado em 10/11) e “Requerimento ao INSS” (enviado hoje, às 15h05). Todos os dados são fictícios.

## Estados (24, cada um em computador e celular)

| # | Estado | Grupo | O que mostra |
|---|---|---|---|
| 1 | `por-area-sugestao` | Configuração | Primeiro uso: as 8 áreas com “Sugestão do T3jus”, todas iguais a hoje, sem selo “em revisão” |
| 2 | `modelo-enviado-areas` | Configuração | Depois de enviar o requerimento ao INSS: o aviso diz que ele vem desmarcado e leva a Documentos por área |
| 3 | `por-area-mudar` | Configuração | Previdenciário aberto: as caixas dos 5 modelos ativos, “Salvar”, “Cancelar” e “Voltar à sugestão do T3jus” |
| 4 | `por-area-salvando` | Configuração | “Salvando…”, com tudo desabilitado |
| 5 | `por-area-salva` | Configuração | O aviso de salvo, “Do escritório” e “Mudada por Marina Ribeiro hoje, às 15h20” |
| 6 | `por-area-conflito` | Configuração | Diego salvou antes. A comparação, com as duas saídas |
| 7 | `por-area-erro` | Configuração | Erro ao salvar: nada mudou, as caixas continuam |
| 8 | `por-area-erro-carregar` | Configuração | A folha não carregou. “Tentar de novo” |
| 9 | `por-area-leitura` | Configuração | Portal só para consulta: a folha só para ler |
| 10 | `arquivar-modelo-com-areas` | Configuração | A janela de arquivar com “Ela também deixa de vir marcada em Previdenciário e Trabalhista.” |
| 11 | `gerar-sugerido-contrato` | Gerar | Benedito: “Sugestão para: Previdenciário”, “a área do contrato”, 4 marcados com “sugerido” e a aba da residência na prévia |
| 12 | `gerar-sugerido-caso-pj` | Gerar | Farmácia: a área vem do caso; o contrato assinado vem desmarcado; a declaração de PJ com a Súmula 481 |
| 13 | `gerar-sem-area` | Gerar | Pedro, contrato sem área: “Outra ou sem área”, que o escritório deixou sem nada marcado (o estado vazio) |
| 14 | `gerar-trocou-area` | Gerar | Escolheu Família sem ter mexido: a lista entra, com o aviso de status. O pé diz que a área fica no contrato |
| 15 | `gerar-trocou-area-mexida` | Gerar | Tinha mexido: nada muda, e aparece “A sugestão de Família é: … [Usar a sugestão]” |
| 16 | `gerar-de-novo-tambem-tem` | Gerar | Benedito, Gerar de novo: as escolhas da versão 1, e “Previdenciário também tem: requerimento ao INSS” com “Marcar” |
| 17 | `gerado-area-gravada` | Gerar | Documentos gerados de Pedro: “A área Família ficou no contrato C-2026-034.” |
| 18 | `gerar-voltou-da-ficha` | Gerar | A volta do F3.160: o seletor em Família e as caixas como estavam, sem aplicar a sugestão de novo |
| 19 | `ex18-frase` | EX-18 | Documentos para começar, com a frase que aponta para Documentos por área |
| 20 | `decisao-p1` | Pergunta | A área ou subtipos |
| 21 | `decisao-p2` | Pergunta | A área fica no contrato ou vale só para as caixas |
| 22 | `decisao-p3` | Pergunta | A outra resposta (só a sócia dona), vista por Diego |
| 23 | `decisao-p4` | Pergunta | O que vem marcado até o escritório mudar |
| 24 | `decisao-p5` | Pergunta | Quando avisar em Gerar de novo |

## Decisões de design

### Modelos de documento › Documentos por área

1. **Folha embaixo da lista dos modelos.** Os modelos próprios entram na lista como “Do escritório”, com “Baixar”, “Trocar” e “Arquivar”. Uma linha por área, na ordem de Documentos para começar, com “Outra ou sem área” no fim.
2. **Cada linha diz o que vem marcado em texto**, com o selo “Sugestão do T3jus” (neutro) ou “Do escritório” (o mesmo selo dos modelos) e quem mudou e quando.
3. **“Mudar” abre a área ali mesmo, com as caixas de todos os modelos ativos.** Cada caixa diz de onde é o modelo (do escritório, padrão do T3jus, outro documento). “Voltar à sugestão do T3jus” só marca as caixas da sugestão; ainda é preciso salvar. O foco vai para a primeira caixa.
4. **Dois nomes, duas frases cruzadas.** O subtítulo diz: “O que o cliente entrega para o processo começar fica em Jurídico › Documentos para começar”. Documentos para começar ganha o outro lado (revisão, ajuste 12).
5. **Salvar, conflito e erro** seguem o padrão da casa: “Salvando…” desabilitado, a comparação com “Salvar a minha versão” e “Ficar com a versão salva”, e “Nada mudou” no erro.
6. **Modelo próprio novo vem desmarcado** em todas as áreas, e o aviso depois de enviar leva a Documentos por área. **Arquivar** avisa de quais áreas o modelo sai, e o motivo continua obrigatório.

### Gerar documentos

7. **Um seletor só, sempre visível** (revisão, ajuste 7): “Sugestão para: [área]”, já preenchido, com a origem ao lado: “a área do contrato C-2026-033”, “a área do caso …”, “O contrato … ainda não tem área e não tem caso. A área que você escolher fica nele ao gerar.” ou “Você escolheu.”. Tem as 8 áreas. Com casos de áreas diferentes, começa no caso mais antigo, e a pessoa troca.
8. **“sugerido” em texto**, num selo ao lado do nome, e não só em cor.
9. **Trocar a área** (revisão, ajuste 8):
   - sem ter mexido em nenhuma caixa, a lista nova entra, e uma frase em região de status avisa;
   - tendo mexido, nada muda, e aparece “A sugestão de Família é: … [Usar a sugestão]”.
   - O foco fica no seletor.
10. **A área vai ao contrato só com ele em elaboração, sem área e sem caso** (revisão, ajuste 2). Aí, o pé ao lado do botão diz “A área Família fica no contrato C-2026-034. O caso que abrir na assinatura já nasce em Família.”, e o resultado repete. No contrato ativo ou encerrado, a frase não aparece. “Outra ou sem área” nunca grava nada.
11. **Gerar de novo começa com as escolhas da última vez** (decisão 19 aprovada). A linha “Previdenciário também tem: … [Marcar]” só aparece quando o escritório salvou a lista da área e o documento entrou nela depois da última geração (revisão, ajuste 4). Nada se marca sozinho.
12. **Já assinado vem desmarcado**, mesmo sugerido (Farmácia). **Empresa:** a declaração sai na versão de PJ, com o aviso da Súmula 481, como hoje.
13. **Lista vazia:** “Para contrato sem área, o escritório não marca nenhum documento. Escolha a área acima, ou marque os que vão sair.” O erro “Marque ao menos um documento” continua como está.
14. **Sem link “Mudar a sugestão” em Gerar** (revisão, ajuste 9): a configuração fica só em Modelos de documento. Quem configura não faz isso no meio de uma geração, e o F3.160 tirou as abas novas de Gerar.
15. **Modelos próprios ganham aba na prévia só quando marcados** (a declaração de residência de Benedito). Os três de sempre continuam com aba, mesmo desmarcados, como no aprovado.
16. **Volta da ficha (F3.160):** a área escolhida e as caixas voltam como estavam. A sugestão só é usada ao montar o formulário pela primeira vez.

### O que não aparece na tela

- **Histórico** (revisão, ajuste 10): sai a linha `documento.sugestao_usada` em toda geração. Ficam `documento.area_salva` (ao salvar uma área) e `contrato.area_definida` (quando a área vai ao contrato).
- **Fez 18** (F3.167, quando existir): a regra “só a procuração” vem antes da sugestão.
- **Curatela e tutela:** o termo não é documento gerado, e nada muda.

## Textos novos

| Onde | Texto |
|---|---|
| Folha, título e subtítulo | **Documentos por área** · O que vem marcado em Gerar documentos, conforme a área do contrato ou do caso. O que o cliente entrega para o processo começar fica em Jurídico › Documentos para começar. |
| Linha sem mudança | Selo **Sugestão do T3jus** · “O escritório ainda não mudou.” |
| Linha vazia | “Nenhum documento. Nada vem marcado; quem gera escolhe.” |
| Área aberta | **O que vem marcado em Gerar documentos, nos contratos de previdenciário** · “Modelo do escritório enviado depois vem desmarcado, até alguém marcar aqui. Quem gera sempre pode mudar antes de gerar.” · **Voltar à sugestão do T3jus** · **Cancelar** · **Salvar Previdenciário** |
| Salvo | **Previdenciário salvo.** Da próxima vez que alguém abrir Gerar documentos num contrato de previdenciário, vêm marcados … |
| Conflito | **Diego Almeida mudou Previdenciário às 15h18, enquanto você editava.** Nada do que você marcou se perdeu. … · **Salvar a minha versão** · **Ficar com a versão salva** |
| Erro ao salvar | **Previdenciário não foi salvo. Nada mudou.** O T3jus não respondeu a tempo. O que você marcou continua aqui: salve de novo em instantes. |
| Só para consulta | **O Portal está só para consulta.** Dá para ver o que vem marcado em cada área, mas não para mudar. … |
| Pé da folha | Vale da próxima vez que alguém abrir Gerar documentos. Os documentos já gerados não mudam, e “Gerar de novo” continua com as escolhas da última vez. … |
| Modelo enviado | **Requerimento ao INSS salvo.** Ele já aparece em Gerar documentos, desmarcado. Para vir marcado nos contratos de alguma área, mude em Documentos por área. · **Ir para Documentos por área** |
| Arquivar | **Ela também deixa de vir marcada em Previdenciário e Trabalhista.** As outras escolhas dessas duas áreas continuam como estão. |
| Gerar, seletor | **Sugestão para** [Previdenciário] · a área do contrato C-2026-033 · “Vêm marcados os documentos que o escritório escolheu para Previdenciário. Mude o que precisar antes de gerar; vale só para estes documentos.” |
| Gerar, troca aplicada (status) | A sugestão mudou para Família: vêm marcados o contrato, a procuração e a declaração de hipossuficiência. |
| Gerar, troca com caixa mexida | **A sugestão de Família é: contrato de honorários, procuração e declaração de hipossuficiência.** Você já tinha marcado à mão, então nada mudou sozinho. · **Usar a sugestão** |
| Gerar, pé | **A área Família fica no contrato C-2026-034.** O caso que abrir na assinatura já nasce em Família. |
| Gerar de novo | “Vieram as escolhas da versão 1, e não a lista da área.” · **Previdenciário também tem: requerimento ao INSS.** Entrou na lista do escritório hoje, às 15h20, depois da versão 1. · **Marcar** |
| Documentos gerados | **A área Família ficou no contrato C-2026-034.** O caso que abrir quando o contrato assinado for anexado já nasce em Família. … |
| Documentos para começar | “… O que vem marcado em Gerar documentos fica em Contratos › Modelos de documento › Documentos por área.” |

## Acessibilidade (WCAG 2.2 AA)

- **Conferência automática** em 48 capturas (24 estados × computador e celular), em `_conferencia.json`:
  - o axe (`axe-core` 4.10.3; WCAG 2.0, 2.1 e 2.2, A e AA) não achou nenhuma violação;
  - nenhuma tela tem rolagem lateral, e não houve erro de script;
  - todos os alvos têm 44 px ou mais. A única exceção é a palavra-marca “T3jus” no trilho (24 px), a mesma da moldura aprovada.
- **Nomes:** o seletor tem rótulo (“Sugestão para”) e a origem em `aria-describedby`. Cada “Mudar” diz a área (“Mudar os documentos de Previdenciário”) e cada “Marcar” diz o documento, com o resto em `.sr`.
- **Foco:** na área aberta, a primeira caixa; no conflito e no erro, o aviso; ao trocar a área, o foco fica no seletor e não pula.
- **Contraste:** só pares aprovados. “sugerido” é vinho sobre #F2ECE8 (9,06:1). A linha de sugestão é tinta sobre #F2CDB3 (11,2:1).

## Onde me afastei do plano ou da revisão

- **Mais estados de configuração do que os ~6 do ajuste 14** (10, com salvando, erro ao carregar e o aviso depois de enviar modelo, que o próprio plano listava). São variações baratas e pedidas (“vazio, erro, salvando, conflito”).
- **Um estado de Gerar a mais** (`gerar-trocou-area-mexida`). Ele mostra o ajuste 8, que tem dois caminhos.
- **Os estados 9, 10, 11 e 17 do plano viraram 11, 13 e 14** (ajuste 7). A origem “caso” aparece na Farmácia, e “área vai ao contrato” aparece no pé do 14.
- **O estado vazio é “Outra ou sem área” salvo sem nada**, e não uma área como Tributário. Assim não foi preciso inventar outro contrato fora do elenco.
- **“Gerar de novo” de Benedito usa o texto aprovado** (“Vieram marcadas as mesmas escolhas da versão 1.”), e não o reescrito do F3.160, porque aqui a pessoa não veio da ficha.

## Para o painel

- **D35** (refs `CH-14`) recebe este desenho como evidência de “desenhado, esperando a Carol”. O `proximo` passa a ser: “Carol aprovar `documentos-por-tipo/desenho` e responder às 5 perguntas; depois, F3.168 e F3.169”.
- Com as recomendações, não há item pendente da advogada parceira (a D5 do plano caiu).
