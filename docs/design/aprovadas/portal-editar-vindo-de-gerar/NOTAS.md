# Editar a ficha vindo de Gerar documentos · notas do desenho (F3.160)

**Aprovado pela Carol em 24/11/2026 com as recomendações D1, D2, D6-D10; D3, D4 e D5 em itens novos** (às 11h38, horário da Bahia). D3 foi para o F3.166 e D4 com D5 para o F3.167, no painel. Programado no F3.160. A galeria `index.html` (7 MB) ficou fora desta cópia; as telas vivas estão em `telas.html` e as capturas nos `.webp`.

> Desenho para a aprovação da Carol, feito em 24/11/2026. Item **F3.160** do painel, ideias **AP-01** e **CH-08**. Segue o `PLANO.md` desta pasta com os ajustes da `REVISAO.md` (onde as duas divergem, vale a revisão). Nada foi programado e nada mudou no repositório.

Hoje, em Gerar documentos, “Mudar na ficha” e “Completar na ficha” abrem a ficha em leitura numa aba nova. A pessoa precisa achar o “Editar”, salvar, voltar para a outra aba e recarregar, e as escolhas que tinha feito em Gerar se perdem. Este desenho leva o estado `editar` do D25 para o sistema: os links abrem o editar **na mesma aba**, com o aviso “Você veio de Gerar documentos.”, e “Salvar e voltar” leva de volta para Gerar, com a prévia já com os dados novos e as escolhas como estavam.

Parte de desenhos aprovados, sem mudá-los:

- **Quem assina pelo cliente menor ou sob curatela** (D25, `portal-responsavel-legal`): o estado `editar`, a página de Gerar com o quadro de quem assina, a janela dos 18 anos.
- **Clientes** (`portal-clientes`): o editar, a comparação do conflito, a ficha inativa, “Cliente não encontrado”.
- **Procurações e modelos** (`portal-procuracoes`): Gerar, Gerar de novo, Documentos gerados, o quadro de quem assina pela empresa.

## Como abrir

- **`index.html`** é a galeria para a Carol: uma página só, autossuficiente (fontes e capturas embutidas, 7 MB), que funciona publicada sozinha. Mostra cada estado com o computador e o celular lado a lado, a descrição e a conferência; clique numa imagem para ampliar. As perguntas estão no alto.
- **`telas.html`** são as telas vivas (o mesmo formato do `index.html` do D25): o botão **Estados**, no canto de baixo, troca de estado, e o estado também vem do endereço, por exemplo `telas.html?estado=gerar-voltou-salvo`. Abaixo de 760 px, vira a versão de celular. Funcionam as abas da prévia, as janelas (abrir, fechar, Esc) e os links entre os estados do fluxo (por exemplo, “Cancelar” no editar leva a `gerar-voltou-cancelou`). O resto é desenho.
- **`<estado>-computador.webp`** (1440 px) e **`<estado>-celular.webp`** (390 px), em escala 2. A do celular mostra a página inteira; com janela aberta, a captura cresce até caber a janela.
- **`_conferencia.json`**: o resultado do axe, da rolagem lateral, dos alvos pequenos e dos erros de script em cada captura.
- **Para refazer tudo:** `sh _fonte/gerar.sh <pasta>`. Precisa de python3 com Pillow, node com `playwright` (o Chromium que já está instalado) e o pacote `axe-core` (a variável `AXE_DIR` aponta a pasta). O gerador lê as telas aprovadas em `docs/design/aprovadas/` (variável `APROV`) sem mudar nada lá.
  - Cópias sem mudança do `_fonte` do D25: `clientes.py`, `juridico.py`, `ficha_ligada.py`, `procuracoes.py`, `contratos.py`, `pecas.py`, `peticoes_css.txt`, `responsavel.py` e `webp.py`. Em `comum.py`, só o caminho das aprovadas mudou (era o de outra máquina).
  - `fotos.cjs` é o do D25, com o axe injetado do pacote `axe-core` 4.10.3, como no desenho F3.146 (o `@axe-core/playwright` não está instalado aqui).
  - Deste desenho: `editar_gerar.py` (lê o `responsavel.py` até o começo dos estados e desenha só o que este item acrescenta), `estados.py` (as descrições) e `galeria.py` (o `index.html`). As peças novas têm o prefixo `eg-`.

## Elenco

O do D25, sem mudança. Escritório Ribeiro & Matos; Marina Ribeiro, sócia dona, é quem está usando. “Hoje” é 22/11/2026, como no D25.

| Quem | Para mostrar |
|---|---|
| **Pedro Henrique Alves Souza**, 12 anos, e a mãe, **Joana Alves Souza** | O fluxo principal: em Gerar, faltam o CPF e o RG de Joana (`gerar-falta` do D25) |
| **Lucas Ferreira Moura**, 16 anos, e o pai, **Marcos** | A decisão D1 (quadro do assistido) |
| **Sebastião Ramos Filho** e a curadora, **Helena Ramos Castro** | A ficha salva com o termo de curatela recusado |
| **Rafaela Nunes Torres**, que fez 18 anos, e a avó, **Cleusa** | A janela “Rafaela agora assina por si” aberta por Gerar |
| **Farmácia Bom Jesus Ltda.** e **Rita de Cássia Moura** | Cliente pessoa jurídica (o quadro de Procurações aprovado) |
| **Diego Almeida** e **Larissa Costa**, da equipe | Quem salvou antes (conflito), quem inativou, quem já confirmou o fez 18 |

Todos os dados são fictícios. “Salvo às 15h48”, “inativado às 15h40” e “versão 1 às 15h10” são horas inventadas do mesmo dia.

## Estados (22, cada um em computador e celular)

| # | Estado | Grupo | O que mostra |
|---|---|---|---|
| 1 | `editar-de-gerar` | Ficha | Pedro, vindo de “Completar na ficha”. O aviso diz de onde veio e o que falta: “Faltam o CPF e o RG de Joana: o cursor já está no CPF.”. O foco já está no CPF de Joana (D9), e os dois campos têm o selo “Falta”. “Salvar e voltar” e “Cancelar” voltam para Gerar. O âmbar do cabeçalho fica sem “Gerar documentos”, como no D25 |
| 2 | `editar-de-gerar-mudou` | Ficha | Depois de escrever o CPF, o RG e o órgão, cada campo ganha “Mudou”, comparado com a ficha como estava ao abrir (D10) |
| 3 | `editar-de-gerar-salvando` | Ficha | “Salvando…” no primário, “Cancelar” desabilitado, e a frase do pé “Salvando a ficha. Em seguida, você volta para Gerar documentos.”, lida pelo leitor de tela |
| 4 | `editar-de-gerar-erros` | Ficha | O CPF de Joana não confere: o resumo no alto (com o foco e o link para o campo) e o erro preso ao campo, no texto já aprovado. A pessoa fica no editar |
| 5 | `editar-de-gerar-conflito` | Ficha | Diego salvou antes com outro RG. A comparação aprovada, com “Salvar a minha versão e voltar” e “Ficar com a versão salva e voltar”. O foco fica no aviso; o “Mudou” aqui é o do conflito, como hoje |
| 6 | `editar-de-gerar-pj` | Ficha | Farmácia Bom Jesus Ltda., vindo de “Mudar na ficha” de quem assina pela empresa: a qualificação abre aberta e o cursor vai para o nome de quem assina. O nome da empresa sai inteiro |
| 7 | `ficha-salva-termo-recusado` | Ficha | Sebastião: a ficha salvou, o termo de curatela não. A ficha fica em leitura com o aviso aprovado (“Ficha salva.” em atenção) e uma **faixa fixa** acima das folhas: “Você veio de Gerar documentos.” com “Voltar para Gerar documentos”. A faixa fica mesmo depois de fechar o aviso (revisão, ajuste 8) |
| 8 | `ficha-inativa-de-gerar` | Ficha | Pedro foi inativado em outra aba. Com `?editar=1`, a ficha abre **em leitura** (corrige a falha do `editarAoAbrir`), com a faixa de volta, a faixa de inativo aprovada e “Reativar” |
| 9 | `ficha-nao-encontrada-de-gerar` | Ficha | “Cliente não encontrado” ganha “Voltar para Gerar documentos” como primário (com o foco); “Ir para Clientes” fica como secundário |
| 10 | `fez-18-janela-de-gerar` | Fez 18 | Rafaela: “Completar na ficha” do fez 18 abre a janela “Rafaela agora assina por si” já aberta (D6), com o aviso de volta. “Salvar e voltar”; “Agora não”, o X e o Esc voltam para Gerar sem salvar |
| 11 | `fez-18-ja-resolvido` | Fez 18 | O link chega, mas Larissa já confirmou: a janela não abre vazia. A ficha em leitura com a faixa “Rafaela já assina por si.” (com o foco) e a volta |
| 12 | `gerar-voltou-salvo` | Gerar | “Ficha de Pedro salva.” no alto de “O que gerar”, com o foco. A prévia sem falta e as escolhas de antes: Felipe marcado, “Desistir da ação”, o outro poder e a aba Contrato da prévia |
| 13 | `gerar-voltou-ainda-falta` | Gerar | Salvou só o CPF: o aviso de salvo e, embaixo, o de falta, só com o RG de Joana |
| 14 | `gerar-voltou-cancelou` | Gerar | Depois de “Cancelar”: sem aviso. O foco volta para “Completar na ficha”, e as escolhas continuam. (A revisão dizia que bastava uma nota; ficou desenhado para mostrar o foco) |
| 15 | `gerar-voltou-ficou-com-a-salva` | Gerar | Depois de “Ficar com a versão salva e voltar”: não diz “Ficha salva.”, diz “A ficha ficou como Diego Almeida salvou.” |
| 16 | `gerar-voltou-pj` | Gerar | “Ficha de Farmácia Bom Jesus Ltda. salva.”, com o nome inteiro |
| 17 | `gerar-fez-18-agora-nao` | Gerar | Depois de “Agora não” na janela: Gerar como estava, sem aviso, com o foco em “Completar na ficha”. O aviso do fez 18 também diz “ao salvar, você volta para cá” |
| 18 | `gerados-completar` | Gerar | Documentos gerados com falta: “Completar na ficha” na mesma aba, e o texto diz que a volta é para Gerar de novo, com as mesmas escolhas |
| 19 | `gerar-de-novo-voltou` | Gerar | A volta de Documentos gerados: “Gerar de novo” com “Ficha de Pedro salva.” e o aviso da versão 1 reescrito (revisão, ajuste 10) |
| 20 | `decisao-d1` | Decisão | O quadro do assistido hoje e no desenho, lado a lado; a página abaixo, como no desenho |
| 21 | `decisao-d2` | Decisão | “· da ficha do cliente” no fim da linha do quadro |
| 22 | `decisao-d3` | Decisão | “Contratante: Pedro, representado por Joana.” na linha do contrato |

As telas de Gerar seguem o D25, que já tem as diferenças D1 a D3. Se a Carol disser não a alguma delas, fica como no sistema hoje, mostrado do lado esquerdo das telas de decisão. Os estados do fez 18 em Gerar mostram só a procuração marcada, como no D25; isso é a D4 e a D5, que vão para um item novo, e a volta funciona igual com ou sem elas.

## Decisões de design

### A ida

1. **Os seis links de ficha em Gerar abrem na mesma aba** (os dois “Mudar na ficha” do quadro, os três “Completar na ficha” dos avisos e o de Documentos gerados). Sai o “(abre numa aba nova)”. Cada um tem o nome completo para o leitor de tela: “Mudar quem assina por Pedro na ficha”, “Mudar quem assina pela empresa na ficha” e “Completar na ficha: CPF e RG de Joana”. O texto visível não muda.
2. **O endereço leva só o tipo fixo e o contrato** (`?editar=1&de=gerar&contrato=<uuid>&campo=rl`), nunca um caminho. Qualquer outra coisa abre o editar normal, com “Salvar ficha” e sem aviso.
3. **No escritório só de consulta, os links não aparecem** (`data-muda`), e `?editar=1` abre em leitura.

### Na ficha

4. **O aviso “Você veio de Gerar documentos.”** fica no topo do formulário, como no D25. Ao abrir, diz o que falta e onde está o cursor (D9); depois, “Ao salvar, volta para lá, com a prévia já com os dados novos.”.
5. **O foco vai para o primeiro campo que falta da parte de onde a pessoa veio** (D9): o CPF de Joana, no quadro do menor; o nome de quem assina, na empresa. O link leva `&campo=rl`, `cliente` ou `pj`, de uma lista fixa. Sem falta, vai para o primeiro campo daquela parte.
6. **Os campos que faltam levam o selo “Falta”** (contorno tracejado em #AC3F6B sobre branco, com o texto). É o par do quadro tracejado de Gerar.
7. **O selo “Mudou” passa a marcar o que a pessoa mudou** (D10), comparado com a ficha como estava ao abrir. Volta a sumir se a pessoa desfaz. No conflito, continua com o sentido de hoje: o que difere da versão salva.
8. **“Salvar e voltar” e “Cancelar”**, como no D25. Para o leitor de tela, “Salvar e voltar para Gerar documentos” e “Cancelar e voltar para Gerar documentos”. O título da folha diz “Editar ficha · você veio de Gerar documentos” (o resto em `.sr`) e o da aba do navegador, “Editar ficha de Pedro · vindo de Gerar documentos” (revisão, ajuste 17).
9. **Salvando:** o primário vira “Salvando…”, o “Cancelar” fica desabilitado e o pé diz o que vem depois.
10. **Erro de validação:** fica no editar, com o resumo e o foco nele. **Conflito:** fica no editar com a comparação; as duas saídas voltam.
11. **Termo recusado:** a ficha salvou, então não dá para ficar no formulário. Fica em leitura com o aviso aprovado e uma faixa de volta fixa, que não some ao fechar o aviso. A volta leva `ficha=salva`, porque a ficha foi salva.
12. **Ficha inativa ou escritório só de consulta:** abre em leitura, com a faixa de volta e o motivo. **Cliente não encontrado:** “Voltar para Gerar documentos” como primário.
13. **A volta usa `location.replace`** (revisão, ajuste 3): o “voltar” do navegador, depois de salvar, não reabre o formulário.

### Fez 18 (D6)

14. **“Completar na ficha” do fez 18 abre a janela direto**, com o aviso de volta dentro dela. “Salvar e voltar”; “Agora não”, o X e o Esc voltam para Gerar sem salvar.
15. **Se ela já assina por si**, a janela não abre: a ficha em leitura diz quem confirmou e quando, com a volta.

### Em Gerar, ao voltar

16. **Salvou:** “Ficha de Pedro salva.” no topo de “O que gerar”, com o foco nele e sem região viva (para o leitor de tela não falar duas vezes; revisão, ajuste 18). A prévia é pedida de novo.
17. **Ainda falta dado:** o aviso de falta continua embaixo, com o que sobrou.
18. **Cancelou ou “Agora não”:** sem aviso, foco no link de onde a pessoa saiu.
19. **Ficou com a versão salva:** não diz “Ficha salva.”; diz “A ficha ficou como Diego Almeida salvou.”.
20. **Nada mudou** (salvou sem mudar nenhum campo nem mandar termo): volta em silêncio, como no Cancelar.
21. **As escolhas continuam** (documentos, advogados e inscrições, poderes, outro poder, cidade e data, a aba da prévia), guardadas na aba do navegador só no clique do link, e lidas só com o marcador `escolhas=1` no endereço (revisão, ajuste 2). Um `ficha=salva` forjado, sem as escolhas guardadas, não mostra aviso nenhum.
22. **Gerar de novo:** o aviso da versão anterior perde “A página abre com as mesmas escolhas.”, que ia empilhar com o de salvo, e a frase sobre as escolhas passa para a linha do contrato (“Vieram as mesmas escolhas da versão 1.”, ou “Vieram as escolhas que você deixou aqui.” quando a pessoa saiu da própria página de Gerar de novo).
23. **Empresa:** o nome inteiro (“Ficha de Farmácia Bom Jesus Ltda. salva.”); pessoa física, o primeiro nome.

### No celular

24. Como o `editar-celular` do D25: os avisos no topo, os botões empilhados em largura total, alvos de 44 px. Nos avisos com botões de texto longo (conflito), o botão quebra a linha em vez de empurrar a tela. Nenhuma tela tem rolagem lateral.

## Textos novos

| Onde | Texto |
|---|---|
| Editar, aviso ao abrir (com falta) | **Você veio de Gerar documentos.** Faltam o CPF e o RG de Joana: o cursor já está no CPF. Ao salvar, você volta para lá, com a prévia já com os dados novos. |
| Editar, aviso (sem falta) | **Você veio de Gerar documentos.** Ao salvar, volta para lá, com a prévia já com os dados novos. *(do D25)* |
| Editar, empresa | **Você veio de Gerar documentos.** O cursor já está em “Quem assina pela empresa”. Ao salvar, você volta para lá, com a prévia já com os dados novos. |
| Editar, campo que falta | Selo **Falta** · ajuda: “Falta. Vai na procuração e no contrato.” |
| Editar, botões | **Salvar e voltar** (*para Gerar documentos*, só para o leitor de tela) · **Cancelar** (*e voltar para Gerar documentos*) |
| Editar, salvando | **Salvando…** · “Salvando a ficha. Em seguida, você volta para Gerar documentos.” |
| Editar, erro | **A ficha não foi salva. Falta acertar 1 ponto, marcado abaixo.** CPF de Joana. O que você escreveu continua aqui. Ao salvar, você volta para Gerar documentos. |
| Editar, conflito | **Diego Almeida salvou esta ficha às 15h48, enquanto você editava.** Nada do que você escreveu se perdeu. Compare o campo que mudou e escolha qual versão fica. Nas duas, você volta para Gerar documentos. · **Salvar a minha versão e voltar** · **Ficar com a versão salva e voltar** |
| Ficha, termo recusado (faixa) | **Você veio de Gerar documentos.** A ficha de Sebastião foi salva; só o termo de curatela não foi guardado. A prévia já vem com os dados novos e as suas escolhas continuam lá. · **Voltar para Gerar documentos** |
| Ficha, inativa (faixa) | **Você veio de Gerar documentos. A ficha de Pedro está inativa.** Para mudar, reative primeiro. Nada foi salvo; volte para gerar como está, com os dados marcados como falta. |
| Cliente não encontrado | Este endereço não é de um cliente deste escritório, ou o cliente foi excluído. Nada foi salvo. Volte para Gerar documentos e confira o contrato, ou busque o cliente pelo nome, CPF ou telefone. |
| Janela do fez 18 | **Você veio de Gerar documentos.** Ao salvar, volta para lá, com a procuração já assinada só por Rafaela. “Agora não” volta sem mudar nada. · **Salvar e voltar** · **Agora não** |
| Fez 18 já resolvido | **Rafaela já assina por si.** Larissa Costa confirmou hoje, às 15h20, com o estado civil e a profissão. Não há nada a completar aqui: a prévia em Gerar já sai assinada só por ela. |
| Gerar, voltou salvo (D8) | **Ficha de Pedro salva.** A prévia já está com os dados novos. As suas escolhas continuam aqui. |
| Gerar, voltou salvo, empresa | **Ficha de Farmácia Bom Jesus Ltda. salva.** *(o resto igual)* |
| Gerar, ficou com a versão salva (D8) | **A ficha ficou como Diego Almeida salvou.** Ele salvou às 15h48 o CPF e o RG de Joana; o que você escreveu não foi salvo. A prévia já está com os dados dele. As suas escolhas continuam aqui. |
| Gerar, avisos de falta (D7) | “… Ou complete a ficha antes: ao salvar, você volta para cá.” (falta de quem assina, falta do cliente e fez 18) |
| Documentos gerados (D7) | “Preencha à mão ou no Word. Ou complete a ficha e gere de novo: ao salvar, você volta para cá, em Gerar de novo, com as mesmas escolhas. A versão 1 fica guardada.” |
| Gerar de novo, ao voltar | **Ficha de Pedro salva.** A prévia já está com os dados novos. · **A versão 1 é de hoje, às 15h10, gerada por Marina Ribeiro.** Desde então mudaram 2 dados de Pedro: o CPF e o RG de Joana. Gerar de novo cria a versão 2 dos documentos marcados; a versão 1 fica guardada. Nenhum assinado foi anexado ainda. · Linha do contrato: “Vieram as mesmas escolhas da versão 1.” |

## Acessibilidade (WCAG 2.2 AA)

- **Conferência automática** em 44 capturas (22 estados × computador e celular), feita pelo `fotos.cjs`; o resultado está em `_conferencia.json`:
  - o axe (WCAG 2.0, 2.1 e 2.2, A e AA; `axe-core` 4.10.3) não achou **nenhuma violação**;
  - nenhuma tela tem rolagem lateral (1440 px e 390 px) e não houve erro de script;
  - todos os alvos têm 44 px ou mais; a única exceção é a palavra-marca “T3jus” no trilho (24 px), a mesma da moldura aprovada.
  - A galeria `index.html` também passou no axe, em 1440 e 390 px, sem violações.
- **Foco:** no editar, o primeiro campo que falta (D9); no erro e no conflito, o aviso; na volta salva, o aviso de salvo (`tabindex="-1"`, sem `role="status"`); no Cancelar e no “Agora não”, o link de origem, pelo `id` fixo (`volta-quadro`, `volta-falta-rl`, `volta-falta-cliente`, `volta-pj`, `volta-fez18`, `volta-resultado`). As capturas já mostram o foco onde ele fica.
- **Nomes:** os links e botões têm o nome completo (o resto em `.sr`); o “Mudou” e o “Falta” estão dentro do rótulo do campo, então o leitor de tela os lê junto (“RG, procuração, Mudou”).
- **A faixa de volta** é uma região com nome (“Volta para Gerar documentos”), sem região viva, para não falar sozinha.
- **Contraste:** só pares aprovados. O selo “Falta” é #AC3F6B sobre branco (5,71:1); “Mudou” é tinta sobre #E9AE90 (8,6:1); a faixa de decisão é tinta sobre branco e sobre #F2CDB3.

## Para quem for programar

O `PLANO.md` e a `REVISAO.md` desta pasta têm o encanamento (rota, `sessionStorage`, validação ao restaurar, `location.replace`, limpar as chaves ao sair, testes). O desenho acrescenta só:

- o `&campo=` no link, de uma lista fixa (`rl`, `cliente`, `pj`), se a Carol aprovar o D9;
- o “Mudou” ao vivo (D10): o formulário compara cada campo com o `inicial` e mostra o selo; no conflito, continua o de hoje;
- o selo “Falta” nos campos que o link levou a completar (as faltas já vêm de `faltasDeQuemAssina` e `faltasNoDocumento`);
- a faixa de volta (`eg-volta`) na ficha em leitura, enquanto existir `volta`;
- `?janela=por-si` só abre a janela com `ativo` e `assina.situacao === "FEZ_18"`; senão, leitura com a faixa “já assina por si”.

## Para o painel

- **F3.160** (refs AP-01 e CH-08) recebe este desenho como evidência de “desenhado, esperando a Carol”. O status continua pendente até o código e os testes. O `proximo` passa a ser: “Carol aprovar o desenho `editar-vindo-de-gerar` e responder às 10 perguntas; depois, programar”.
- **Itens novos**, se a Carol seguir as recomendações (os números são os próximos livres hoje; confira antes de criar):
  - D3 → item novo (F3.166), citando AP-01 e CH-08, esperando a pergunta 8 do D25;
  - D4 e D5 → um item novo (F3.167), citando CH-08.
- Como o F3.160 não vai atender toda a nota (D3, D4 e D5 ficam de fora), esses itens “pendente” precisam existir antes de o F3.160 sair “feito”, citando as mesmas ideias (CLAUDE.md).

## Perguntas para a Carol

**D1. No quadro do assistido, mostrar os dois nomes?** “Lucas e Marcos Ferreira Moura” / “Lucas assina, assistido pelo pai, Marcos · CPF … · da ficha do cliente”, no lugar de só “Marcos Ferreira Moura” com o selo “Assiste”. **Recomendo que sim.** No assistido, os dois assinam, e o quadro deve dizer isso sem a pessoa ter de saber o que é “assiste”. Custo baixo. **Cabe neste item**, mas não depende da volta; se pesar, vai para o mesmo item novo do D3. (Tela `decisao-d1`.)

**D2. Terminar a linha do quadro com “· da ficha do cliente”?** **Recomendo que sim.** Diz de onde vem o dado, como no quadro da empresa já aprovado, e combina com “Mudar na ficha” ao lado. Custo mínimo. **Cabe neste item.** (Tela `decisao-d2`.)

**D3. A linha do contrato em “Documentos” dizer quem contrata (“Contratante: Pedro, representado por Joana.”)?** **Recomendo que sim, com “representado(a)” e o primeiro nome, mas num item novo (hoje seria o F3.166).** Depende da pergunta 8 do D25 (o contratante é o menor, representado, e não a mãe em nome próprio), que ainda espera a advogada parceira; não deve segurar o F3.160. (Tela `decisao-d3`.)

**D4. Quem fez 18: só a procuração vem marcada, com “Vai sair 1 arquivo .docx: a procuração, assinada só por Rafaela.”, e “Gerar procuração nova” da ficha leva a isso?** **Recomendo que sim, num item novo (hoje seria o F3.167).** É o costume (procuração nova, assinada só por ela) e evita gerar de novo um contrato já assinado. Custo médio e sem relação com a volta.

**D5. Na linha do contrato já assinado, “Já assinado em 08/07/2026, por Rafaela e pela avó.”?** **Recomendo que sim, no mesmo item novo do D4.** Pode pedir um campo a mais em `documentos-dados`, sem migration.

**D6. No fez 18, “Completar na ficha” abre direto a janela “Rafaela agora assina por si”, com a volta?** **Recomendo que sim, como desenhado.** É o que o D25 já previa; a janela pede só os dois dados que faltam. “Agora não”, o X e o Esc voltam para Gerar sem salvar; se ela já assina por si, a janela não abre. **Cabe neste item.** (Telas `fez-18-janela-de-gerar`, `fez-18-ja-resolvido` e `gerar-fez-18-agora-nao`.)

**D7. Todos os links de ficha em Gerar voltam, e os avisos dizem “ao salvar, você volta para cá”?** **Recomendo que sim**, nos seis links e nos três avisos (falta de quem assina, falta do cliente e fez 18), e em Documentos gerados (“ao salvar, você volta para cá, em Gerar de novo”). Se só uns voltassem, a pessoa não saberia o que esperar. **Cabe neste item.**

**D8. Os textos da volta.** “Ficha de Pedro salva. A prévia já está com os dados novos. As suas escolhas continuam aqui.”; “Ficar com a versão salva e voltar”, que chega com “A ficha ficou como Diego Almeida salvou.” (e não “Ficha salva.”, porque a pessoa não salvou); o nome inteiro para empresa (“Ficha de Farmácia Bom Jesus Ltda. salva.”); e, quando nada mudou, voltar em silêncio. **Recomendo aprovar como desenhado.** **Cabe neste item.**

**D9. O editar abre com o cursor no primeiro campo que falta da parte de onde a pessoa veio** (o CPF de Joana, e não “Nome completo”)? **Recomendo que sim.** No celular, o RG de Joana fica a várias telas de rolagem do topo; com o cursor lá, a pessoa já começa onde precisa. É barato e não muda a segurança (o valor é de uma lista fixa). Se a Carol preferir o D25 como está, o foco fica no primeiro campo. **Cabe neste item.** (Tela `editar-de-gerar`.)

**D10. O selo “Mudou” marca, ao vivo, o que a pessoa acabou de mudar?** No D25 ele aparece no RG de Joana, mas no sistema hoje só existe no conflito. **Recomendo que sim, em todo editar da ficha (não só vindo de Gerar)**, comparado com a ficha como estava ao abrir; no conflito, continua com o sentido de hoje. Ajuda a conferir antes de salvar, e o leitor de tela ouve “Mudou” no rótulo. **Cabe neste item.** (Tela `editar-de-gerar-mudou`.)
