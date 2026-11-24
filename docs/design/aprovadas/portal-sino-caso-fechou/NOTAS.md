# Sino: caso encerrado no financeiro · notas

É o item **F3.150** do painel (EX-16 e EX-17).

**Aprovado pela Carol em 24/11/2026 às 11h33 (Bahia), com "aprovado com as recomendações"**: valem as recomendações das 6 perguntas (quem cuida dos contratos só recebe quando sobra contrato para encerrar; a responsável que tem o Financeiro só recebe se algum contrato ficou aberto; o aviso vale também para o caso com RPV ou alvará; a responsável é avisada quando as parcelas seguem com outro caso; voltam as duas frases que prometem o aviso; a Bianca entra na lista de quem encerra contratos). As capturas desta cópia estão em `.webp`; os `.png` originais ficam na pasta de telas do projeto.

**Revisão do desenho aplicada** (`REVISAO-DESENHO.md`, 24/11/2026). Entraram os 6 ajustes obrigatórios e as sugestões 7 a 11. A sugestão 10 entrou em parte. Os detalhes estão na seção "Revisão do desenho", no fim.

Quando o caso é encerrado no financeiro, duas pessoas podem receber um aviso no sino:

- quem encerra contratos (área Contratos), se algum contrato ficou aberto;
- quem é responsável pelo caso.

O aviso cumpre a promessa da decisão 16 da jornada do cliente ("recebe o aviso quando fechar"). Só o item novo do sino foi desenhado. O painel, os filtros, o vazio, o erro e as fichas de destino são os aprovados e não mudam. O desenho segue o `PLANO.md` (v2) desta pasta, que também recebeu as mudanças da revisão do desenho.

## Como abrir

- `index.html` abre sozinho, sem internet.
  - O botão **Estados**, embaixo, troca de estado.
  - O endereço também aceita `?estado=sf-contrato` (ou outro nome da tabela).
  - No celular, feche o painel (X) para chegar ao botão Estados.
- Os dois estados da pergunta 5 ficam em `fechamento.html`, porque são as telas aprovadas do fechamento (F3.132), e não o sino.
  - O mesmo botão Estados leva de uma página à outra.
  - `index.html?estado=fecha-larissa` também abre a página certa.
- `<estado>-computador.png` (1440) e `<estado>-celular.png` (390) são as capturas de cada estado, em escala 2.
- `_conferencia.json` guarda o resultado da conferência automática.
- `sh _fonte/gerar.sh ..` refaz tudo. Para isso, `APROV` aponta para `docs/design/aprovadas/` e `AXE_CORE` para um `axe.min.js`.

## O elenco

O escritório e o "hoje" são os de sempre: Ribeiro & Matos, quarta-feira, 18/11/2026.

- **Quem encerra contratos:** a regra do grupo A (área Contratos e `contratos.editar`, que toda a equipe tem pela 0200) dá **Bianca, Felipe e Marina**. Os nomes vêm em ordem alfabética, como o `quemContratos` da 0900 (`order by p.nome`).
- **Felipe Matos:** Comercial, Contratos e Jurídico, sem Financeiro. É o elenco de `portal-nao-paga-logo`.
  - O elenco aprovado não é um só: `portal-peticoes` dá a ele as quatro áreas, e o pgTAP 135 o convida só com Contratos e Comercial.
  - Aqui ele precisa do Jurídico, porque encerrou o caso Carvalho com perda e o destino "Ver o caso" depende disso. **O pgTAP 137 deve convidá-lo com o Jurídico.**
- **Caso Carvalho x Construtora Lume** (o do fechamento aprovado):
  - Diego (sem Contratos) encerra no financeiro hoje, às 10h05;
  - o C-2026-012, de Noemi, fica aberto (estado aprovado `encerrar-sem-contratos`);
  - o C-2026-013, de Cláudio, já estava encerrado desde 12/11;
  - Felipe é o responsável pelo caso.
- **Nogueira x Transportes Serra** (os três clientes do F3.147): o C-2026-010, de Rui Nogueira, já estava encerrado. O C-2026-025 (Lúcia) e o C-2026-026 (Paulo) ficam abertos.
- **Inventário de Augusto Viana** (novo): três contratos abertos, o C-2026-028 (Clara), o C-2026-029 (Rafael) e o C-2026-030 (Sônia).
- **Fontes x Hospital São Lucas** (novo): Larissa (só Jurídico) é a responsável. O caso tem o C-2026-032, de Márcia Fontes.
- **Martins x INSS · auxílio-doença** (o do F3.147): o C-2026-007, de Ivone Martins, segue com o caso Martins x INSS · aposentadoria.

## Os estados e o texto de cada aviso

Todo aviso tem o mesmo título, no passado, como o aviso de "pronto": "O caso **‹nome do caso›** foi encerrado no financeiro". O ícone é o cadeado, o mesmo do aviso de "pronto". Nenhum estado mostra valor em reais.

Para quem usa leitor de tela, o nome do link termina sempre com o que o selo diz, e isso vale também nos estados sem "Agora:". A coluna "Leitor de tela" mostra esse trecho.

| Estado | Quem vê | Detalhe do aviso (texto exato) | Selo | Destino | Leitor de tela |
|---|---|---|---|---|---|
| `sf-contrato` | Felipe | "Diego Almeida encerrou o caso no financeiro, e o C-2026-012, de Noemi Bastos Carvalho, continua aberto. Encerre o contrato." Hoje, 10h05, novo, no meio da lista dele | Falta o contrato | Encerrar o C-2026-012 | ". Falta encerrar o C-2026-012." |
| `sf-varios` (dois) | Felipe | "Diego Almeida encerrou o caso no financeiro, e continuam abertos o C-2026-025, de Lúcia Nogueira, e o C-2026-026, de Paulo Nogueira. Encerre os contratos." | Faltam os contratos | Encerrar o C-2026-025 | ". Falta encerrar 2 contratos." |
| `sf-varios` (três, ontem) | Felipe | "Diego Almeida encerrou o caso no financeiro, e continuam abertos o C-2026-028, de Clara Viana, o C-2026-029, de Rafael Viana, e mais 1 contrato. Encerre os contratos." | Faltam os contratos | Encerrar o C-2026-028 | ". Falta encerrar 3 contratos." |
| `sf-socia` | Marina | Hoje, o aviso do `sf-contrato`, novo. Ontem, o aviso de "pronto" aprovado do mesmo caso, já lido: "…**Agora:** Diego Almeida encerrou no financeiro hoje, às 10h05." | Encerrado (no aviso de "pronto") | Ver o fechamento no C-2026-012 | O do F3.147 |
| `sf-responsavel` | Larissa | "Marina Ribeiro encerrou o caso no financeiro e, junto, o C-2026-032, de Márcia Fontes. O fechamento do caso terminou." | Fechamento feito | Ver o caso | ". O fechamento terminou." |
| `sf-responsavel-falta` | Larissa | Ontem, 16h10: "Diego Almeida encerrou o caso no financeiro. Quem encerra o C-2026-032, de Márcia Fontes, é a área Contratos (Bianca Torres, Felipe Matos e Marina Ribeiro)." | Falta o contrato | Ver o caso | ". Falta encerrar o C-2026-032, com a área Contratos." |
| `sf-segue` (pergunta 4) | Larissa | "Diego Almeida encerrou o caso no financeiro. O C-2026-007, de Ivone Martins, fica aberto, porque as parcelas seguem com o caso Martins x INSS · aposentadoria." | Segue com outro caso | Ver o caso | ". O contrato segue com outro caso." |
| `sf-agora-parcial` | Felipe | O aviso dos Nogueira, já lido, e depois "**Agora:** você encerrou o C-2026-025 hoje; falta o C-2026-026." | Falta o contrato | Encerrar o C-2026-026 | ". Agora: falta o C-2026-026." |
| `sf-agora-encerrado` (Carvalho) | Felipe | O detalhe sem "Encerre o contrato." e depois "**Agora:** você encerrou o C-2026-012 hoje." | Contrato encerrado | Ver o C-2026-012 | ". Agora: contrato encerrado." |
| `sf-agora-encerrado` (Nogueira) | Felipe | "**Agora:** você encerrou os contratos hoje." | Contratos encerrados | Ver o C-2026-025 | ". Agora: contratos encerrados." |
| `sf-agora-encerrado` (Viana, ontem) | Felipe | O aviso continua como estava, porque os contratos do Viana não foram encerrados | Faltam os contratos | Encerrar o C-2026-028 | — |
| `sf-agora-terminou` | Larissa | O aviso do `sf-responsavel-falta` e depois "**Agora:** Felipe Matos encerrou o C-2026-032 hoje, e o fechamento do caso terminou." | Fechamento feito | Ver o caso | ". Agora: fechamento terminou." |
| `sf-lido` | Felipe | O aviso do `sf-contrato` já aberto, sem o destaque. O contrato ainda está aberto | Falta o contrato | Encerrar o C-2026-012 | ". Falta encerrar o C-2026-012." |
| `fecha-larissa` (pergunta 5) | Larissa | Na ficha de Noemi (tela aprovada do F3.132), uma frase a mais no fim de "Quem faz": "Quem faz: a área Financeiro, que não está liberada para você. Marina, Diego e Bianca. **Quando o caso for encerrado no financeiro, quem é responsável por ele fica sabendo pelo sino.**" | — | — | — |
| `encerrar-sem-contratos` (pergunta 5) | Diego | Na janela aprovada de encerrar: "O C-2026-012 fica aberto. Quem encerra é a área Contratos (**Bianca, Felipe e Marina**), no passo “Encerrar o contrato” da ficha de Noemi. **Eles recebem um aviso no sino.**" | — | — | — |

Na linha "Agora:", quem encerrou o contrato aparece assim:

- **"você"**, quando foi a própria pessoa que lê o aviso;
- **o nome**, quando foi outra pessoa;
- **"os contratos foram encerrados hoje"**, sem nome, quando cada contrato foi encerrado por uma pessoa diferente.

Estes ficam só nas notas, sem captura (seção 6 do plano):

- **Destino de quem perdeu a área depois do aviso:** "Ver a ficha de Noemi Bastos Carvalho" (`/clientes/:id`), no lugar de "Encerrar o C-2026-012" ou de "Ver o caso". O selo e a linha "Agora:" não mudam.
- **"Já estava encerrado"** (grupo B, sem contrato encerrado junto): "Marina Ribeiro encerrou o caso no financeiro. O C-2026-033, de ‹cliente›, já estava encerrado. O fechamento do caso terminou." Com vários: "Os contratos já estavam encerrados."
- **O contrato passou a seguir com outro caso depois do aviso** (grupo A):
  - "Encerre o contrato." sai, e entra "**Agora:** o C-2026-012 passou a seguir com o caso Martins x INSS · aposentadoria; não precisa encerrar.";
  - selo "Segue com outro caso";
  - destino "Ver o C-2026-012";
  - leitor de tela: ". Agora: contrato segue com outro caso."
- **Caso com RPV ou alvará:** o texto é o mesmo (pergunta 3).

## Perguntas para a Carol

São as do `PLANO.md` (seção 9). O desenho segue as recomendações.

1. **Quem cuida dos contratos só recebe o aviso quando sobra contrato para encerrar?**
   - Recomendo que sim. Se o contrato já foi encerrado junto com o caso, essa pessoa não tem nada a fazer, e o aviso só atrapalharia.
2. **A responsável pelo caso que também cuida do Financeiro já foi avisada quando o caso ficou pronto. Ela recebe outro aviso quando o caso é encerrado?**
   - Exemplo: a Marina cuida do Financeiro e é a responsável. No aviso de "pronto", ela já vê "Agora: Diego Almeida encerrou no financeiro hoje".
   - Recomendo que ela só receba o aviso novo se algum contrato tiver ficado aberto, porque isso o primeiro aviso não conta.
3. **O aviso vale também para o caso com RPV ou alvará, encerrado na ficha do repasse?**
   - Recomendo que sim. A promessa de avisar quando o caso fecha nasceu nesse caso, e o texto do aviso é o mesmo.
4. **Quando o contrato fica aberto porque as parcelas seguem com outro caso, o aviso conta isso à responsável?**
   - Recomendo que sim, com a frase "O C-…, de ‹cliente›, fica aberto, porque as parcelas seguem com o caso …" (estado `sf-segue`).
   - Quem cuida dos contratos não é avisado, porque não há o que encerrar.
5. **Com o aviso pronto, voltam as frases que prometem o aviso?** São estas duas, exatamente como aparecem nas telas:
   - Na ficha do cliente, para quem não tem o Financeiro (`fecha-larissa`): "Quando o caso for encerrado no financeiro, quem é responsável por ele fica sabendo pelo sino."
   - Na janela de encerrar, para quem não cuida dos contratos (`encerrar-sem-contratos`): "Quem encerra é a área Contratos (Bianca, Felipe e Marina), no passo “Encerrar o contrato” da ficha de Noemi. Eles recebem um aviso no sino."
   - Recomendo que sim: elas saíram só porque o aviso ainda não existia, e cumprem o que a Carol já aprovou na jornada do cliente.
   - A primeira frase mudou em relação ao plano por três motivos:
     - "A responsável" não serve quando o responsável é um homem, como o Felipe;
     - um cliente pode ter mais de um caso;
     - a responsável nem sempre recebe um aviso **novo**: às vezes ela fica sabendo pela linha "Agora:" do aviso que já tinha.
6. **A Bianca entra na lista de quem encerra contratos?** (pergunta nova, do desenho)
   - No elenco aprovado, ela tem a área Contratos, e toda a equipe pode editar contratos. Por isso a regra do sistema a coloca no grupo, e o desenho escreve "Bianca, Felipe e Marina".
   - A tela aprovada do fechamento dizia só "Marina e Felipe". A frase foi corrigida junto, porque já estava sendo mexida pela pergunta 5.
   - Recomendo seguir a regra do sistema, como está no desenho. Se a Carol preferir a Bianca fora da área Contratos, o elenco dos testes muda, e os textos voltam para "Felipe e Marina".

### Pontos novos, do desenho

São quatro:

- **A. A frase da ficha do cliente.**
  - A ficha mostra o nome do responsável na tabela Casos. Mas o passo do fechamento não recebe esse nome de `cliente_fechamento`, e um cliente pode ter mais de um caso.
  - A frase sem nome serve para todos e é sempre verdadeira, pelos motivos da pergunta 5.
- **B. A Bianca na área Contratos** (pergunta 6).
- **C. Selo no plural:** com mais de um contrato aberto, o selo diz "Faltam os contratos", coerente com "Contratos encerrados".
- **D. A regra `.si-nr`.** O número do contrato não quebra no hífen. No celular aparecia "C-2026-" numa linha e "025" na outra. O código deve fazer o mesmo onde o detalhe cita contratos.

## Decisões de design

1. **Mesma família.** O item é o do sino aprovado: ícone no círculo, título com o nome em negrito, detalhe, linha com "Novo", selo, hora e destino, e o aviso inteiro como link. A linha "Agora:" e o trecho para o leitor de tela são os do F3.147. O `sino_caso.py` do F3.147 é lido sem mudança.
2. **Peças novas: duas regras pequenas.**
   - `.si-det .si-nr` (ponto D).
   - Em `fechamento.html`, o "Quem faz" do campo âmbar fica sobre um retalho liso da cor do campo, acima do padrão decorativo do canto (`.fl-passo .jf-quem`). O `conceito-gabinete.md` diz que o padrão nunca fica atrás de texto, e a frase nova deixou o "Quem faz" mais comprido. No código, a máscara do padrão deve deixar a área do texto limpa em todas as fichas com esse passo.
3. **O título não muda no grupo A.** Não usei a variação "Falta encerrar o C-2026-012: o caso … foi encerrado no financeiro". Os motivos:
   - o selo "Falta o contrato" e o destino "Encerrar o C-2026-012" já dizem o que fazer, e quem usa leitor de tela ouve isso no nome do link;
   - o título no passado é o padrão aprovado no F3.147;
   - a variação soma cerca de 30 caracteres a um título que já ocupa duas linhas no celular.

   A variação não foi desenhada. Se a Carol preferir, é só trocar o título.
4. **O cadeado é o mesmo ícone do aviso de "pronto"**, como o plano propõe. No `sf-socia`, os dois avisos do mesmo caso ficam juntos sem confusão, porque um diz "ficou pronto" e o outro "foi encerrado".
5. **Selos**, nos tons que o sino já usa:
   - "Falta o contrato" e "Faltam os contratos" (andamento);
   - "Contrato encerrado", "Contratos encerrados" e "Segue com outro caso" (neutro);
   - "Fechamento feito" (ok). Ao lado do título "foi encerrado", um selo "Fechado" seria lido como sinônimo de encerrado.

   Nenhum estado depende só da cor: o detalhe, a linha "Agora:" e o nome do link dizem o mesmo em palavras.
6. **O destino diz o número do contrato** ("Encerrar o C-2026-012", "Ver o C-2026-012"), como no F3.147. No grupo B, o destino é "Ver o caso".
7. **O cliente aparece ao lado do contrato** nos dois grupos ("o C-2026-032, de Márcia Fontes"), como a seção 4 do plano pede.
8. **`sf-socia` não repete nada.** O aviso de "pronto" conta quem encerrou e quando. O aviso novo conta que o contrato ficou aberto e pede a ação. O nome do Diego aparece nos dois, porque cada aviso é lido sozinho.
9. **Novo e lido.**
   - O aviso de "pronto" da Marina aparece lido no `sf-socia`, porque chegou ontem.
   - No `sf-agora-terminou`, o aviso da Larissa continua novo, porque ela ainda não o abriu. É a regra do F3.147: encerrar não marca o aviso dos outros como lido.
   - Os avisos ficam no painel por 30 dias. O aviso do Viana continua no `sf-agora-encerrado`, com o selo de antes, porque nada mudou nele.
10. **Alvos de toque:** o aviso inteiro é o alvo, como no sino aprovado, com bem mais de 44 px.

## O que mudou em relação ao plano

O `PLANO.md` foi corrigido junto, e a tabela "Revisão aplicada" dele cita esta revisão.

- **Números dos contratos.**
  - O C-2026-020 já é de Helena Freitas no F3.147, e o C-2026-031 já é usado nas telas aprovadas da jornada. Por isso os Nogueira ficaram com o C-2026-025 e o C-2026-026, e a Larissa com o C-2026-032.
  - O caso de três contratos é outro, o Inventário de Augusto Viana. Os Nogueira já tinham três clientes no F3.147, e um contrato deles já estava encerrado.
- **Quem encerra o caso Carvalho.** No F3.147 (`sp-encerrado`), quem encerra é a Marina, às 10h05. Aqui é o Diego, à mesma hora. A troca é necessária para o contrato ficar aberto: a Marina tem Contratos e o teria encerrado junto.
- **`sf-agora-encerrado` virou dois estados:** `sf-agora-encerrado` (Felipe) e `sf-agora-terminou` (Larissa), porque cada estado mostra o sino de uma pessoa só. Por isso são 12 estados, e não 11.
- **A Bianca entra no grupo A** (pergunta 6). No plano, o teste 7.4 dizia "Diego e Bianca não recebem". Agora ele diz que Felipe, Marina e Bianca recebem.
- **A linha "Agora:" diz quem encerrou o contrato.** O plano (3.2) dizia que "contratos não guardam quem encerrou". Mas a 0900 já lê isso no histórico (`encerradoPor`), e a janela aprovada mostra "Já encerrado em 12/11, por Felipe". O `agoraFechou.encerrados` ganha `por`.
- **O nome do link traz o estado também sem "Agora:"** (seção 4.3 do plano).
- **Textos:**
  - a frase da ficha (pergunta 5);
  - os selos "Fechamento feito" e "Segue com outro caso";
  - o selo no plural;
  - o cliente ao lado do contrato no grupo B;
  - o `sf-agora-parcial` diz o que mudou.

## O que ficou de fora

- O vazio, o erro e os filtros do sino, que são os aprovados.
- As fichas de destino, que são as aprovadas. A janela "Encerrar contrato" continua pedindo o motivo, que não vem preenchido (seção 5 do plano).
- Os estados que ficaram só nas notas, listados acima.
- `fechamento.html` mostra valores em reais, porque são as telas aprovadas do Financeiro, vistas por quem tem a área. O sino não mostra nenhum valor, e o gerador confere isso.
- **Pendência da tela de Clientes, fora deste item:** atrás do painel, no computador, "Ltda." de "Construtora Vale Alto Ltda." e de "Farmácia Bom Jesus Ltda." fica por cima de "Pessoa jurídica". O mesmo acontece no aprovado do F3.147. Não deve ser copiado para o código.

## Conferência

O `_conferencia.json` cobre 24 capturas (12 estados, cada um no computador e no celular).

- **axe** (WCAG 2.0, 2.1 e 2.2, A e AA): nenhuma violação.
- **Rolagem lateral e erros de script:** nenhum, em nenhuma captura.
- **Alvos de toque:** nenhum alvo novo tem menos de 44 px. A única marca é a do logo "T3jus" da moldura aprovada (204×24 px), em `fecha-larissa` no computador. É a mesma do `_conferencia.json` aprovado do F3.132. Fica acima do mínimo de 24 px da WCAG 2.5.8 e não é deste item.
- **Nome do link:** conferido no Chromium em todos os avisos novos. Por exemplo, "Novo: O caso Carvalho x Construtora Lume foi encerrado no financeiro. Falta encerrar o C-2026-012."

## `_fonte/`

- `sino_fechou.py`: gera `index.html`, com os 10 estados do sino. Lê o `sino_caso.py` do F3.147 até o começo dos estados.
- `fecha_fechou.py`: gera `fechamento.html`.
  - Lê o `fechamento.py` do F3.132 até a parte "página" e troca só as duas frases, conferindo que cada uma aparece uma vez.
  - Acrescenta a regra do "Quem faz".
- `estados.py`: a lista de estados, a navegação comum às duas páginas e o `casos.json`.
- Cópias sem mudança:
  - do F3.147: `sino_caso.py`, `sino.py`, `base.py`, `extra.py`, `clientes.py`, `comum.py` e `fotos.cjs`;
  - do F3.132: `fechamento.py`, `jornada.py`, `ficha_ligada.py` e `juridico.py`.
- `gerar.sh`: refaz tudo.

## Revisão do desenho

Os 6 ajustes obrigatórios da `REVISAO-DESENHO.md` foram aplicados, e as sugestões 7, 8, 9 e 11 também. A 10 entrou em parte, e a 12 ficou registrada. As capturas e o `_conferencia.json` foram refeitos: o axe não achou nenhuma violação nas 24 capturas.

1. **Bianca na área Contratos, nomes em ordem alfabética:**
   - sino: "(Bianca Torres, Felipe Matos e Marina Ribeiro)";
   - janela: "(Bianca, Felipe e Marina)";
   - pergunta 6 nova;
   - o teste 7.4 do plano foi corrigido.
2. **Leitor de tela:** o nome do link sempre traz o que o selo diz, também sem "Agora:". Por exemplo, ". Falta encerrar o C-2026-012." Escrevi "Falta encerrar 2 contratos", e não "Faltam encerrar", porque com "falta" seguido de verbo no infinitivo o verbo fica no singular. A seção 4.3 do plano e o Vitest (7.4) foram atualizados.
3. **Frase da ficha:** "Quando o caso for encerrado no financeiro, quem é responsável por ele fica sabendo pelo sino." O motivo do ponto A foi corrigido.
4. **Pergunta 5:** traz as duas frases exatas das telas e diz, em uma linha, por que a primeira mudou.
5. **O aviso do Viana** continua no `sf-agora-encerrado`, lido, com "Faltam os contratos".
6. **NOTAS:**
   - de onde vem o elenco do Felipe, com o pedido de que o pgTAP 137 o convide com o Jurídico;
   - a troca de Marina por Diego no caso Carvalho;
   - quatro pontos novos (A a D).
7. **Sugestão aceita:** quem encerrou o contrato entra na linha "Agora:" ("você" para a própria pessoa). O plano 3.2 foi corrigido: `encerrados.por` sai do histórico do contrato, como o `encerradoPor` da 0900.
8. **Sugestão aceita:** "Agora: você encerrou o C-2026-025 hoje; falta o C-2026-026."
9. **Sugestão aceita:** os selos "Fechamento feito" e "Segue com outro caso".
10. **Sugestão aceita em parte.**
    - Aceito: o nome do cliente ao lado do contrato, no grupo B e no `sf-segue`.
    - Não aceito: o nome do responsável na ficha do cliente ("Felipe Matos, responsável pelo caso, fica sabendo pelo sino").
      - Pediria um campo novo em `cliente_fechamento` e uma frase diferente para quando o cliente tem mais de um caso.
      - A frase sem nome é sempre verdadeira, e o nome já aparece logo abaixo, na tabela Casos.
11. **Sugestão aceita:** o "Quem faz" fica limpo do padrão decorativo (decisão 2), com a nota para o código.
12. **Registrado** como pendência da tela de Clientes, em "O que ficou de fora".
