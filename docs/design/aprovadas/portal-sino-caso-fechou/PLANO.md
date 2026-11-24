# Plano do F3.150: aviso no sino quando o caso é encerrado no financeiro

**v2, 24/11/2026, com a revisão aplicada** (`REVISAO.md` desta pasta). Conferi cada ajuste no código antes de aceitar.

**v2.1, 24/11/2026: com as mudanças da revisão do desenho** (`REVISAO-DESENHO.md` e seção "Revisão do desenho" do `NOTAS.md`). Estão nas linhas D1 a D10 da tabela abaixo.

## Revisão aplicada

| Ajuste da revisão | Onde ficou |
|---|---|
| 1. O teste 135 do F3.147 quebra | 7.4 (o 135 filtra o tipo; suíte inteira) |
| 2. O nome do campo de "agora" | 3.2 e 7.2 (o servidor grava `agoraFechou`) |
| 3. "O fechamento do caso terminou" contra a ficha do cliente | 4.2 (só sem `abertos` e sem `seguem`) e 7.4 (teste contra `cliente_fechamento`) |
| 4. A promessa da pergunta 5 | 6, 7.3 e pergunta 5 (dois textos, na terceira pessoa) |
| 5. O pgTAP mantém a restrição nova adiada | 7.4 (`pg_temp.fim()` e o teste da ordem) |
| 6. O commit de verdade como `service_role` | 7.4 |
| 7. O e2e com a API simulada | 7.4 |
| 8. Um gatilho só, lendo `NEW` | 1.1 e 7.1 |
| 9. `juntos` pela data exata | 3.1 |
| 10. A responsável com Financeiro e contrato aberto | 2.3 e pergunta 2 |
| 11. Política irmã do histórico | 1.1 e 7.1 |
| 12. O destino do grupo A pelas áreas da sessão | 5 |
| 13. O "agora" confere o escritório e o contrato que passou a seguir com outro caso | 3.2 e 4.1 |
| 14. A data sem hora numa função própria | 4.1 e 7.2 |
| 15. Textos | 4 (frases novas; o título fica para a especialista) e 0 (a origem `casos`) |
| 16. Elenco | 6 (caso Nogueira para vários contratos) |
| Perguntas 2 e 5 | 9 |
| D1. Desenho, ajuste 1: a Bianca está no grupo A; nomes em ordem alfabética | 4.2, 6, 7.4 e pergunta 6 |
| D2. Desenho, ajuste 2: o nome do link traz o estado também sem `agoraFechou` | 4.3 e 7.4 (Vitest) |
| D3. Desenho, ajuste 3: a frase da ficha do cliente vale sempre | 6 (estado 10) e pergunta 5 |
| D4. Desenho, ajuste 4: a pergunta 5 com as frases exatas | 9 |
| D5. Desenho, ajuste 6: o Felipe com o Jurídico no pgTAP | 7.4 |
| D6. Desenho, sugestão 7: a linha "Agora:" diz quem encerrou o contrato | 3.2 e 4 |
| D7. Desenho, sugestão 8: o "Agora" parcial diz o que mudou | 4.1 |
| D8. Desenho, sugestão 9: selos "Fechamento feito" e "Segue com outro caso" | 4.1 e 4.2 |
| D9. Desenho, sugestão 10 (em parte): o cliente ao lado do contrato no grupo B | 4.2 |
| D10. Estados: `sf-agora-encerrado` em dois, `.si-nr`, selo no plural, números dos contratos | 4.1, 6 e `NOTAS.md` |

Item do painel: `docs/painel/dados/fases/F3/F3.150.json` (peça S4, refs EX-16 e EX-17, ordem 1065.5, pendente). Ele cumpre a promessa da **decisão 16** da jornada (`docs/design/aprovadas/portal-jornada-fechamento/NOTAS.md`): "quem não tem a área do passo [...] recebe o aviso quando fechar". Essa promessa saiu dos textos do fechamento sem levantamento (`fecha-larissa` e a janela `encerrar-sem-contratos`, ajuste 11 daquela revisão) porque o aviso não existia.

Este documento é o plano. Não há código nem migration aqui. Antes de programar, o aviso passa pela especialista de frontend (seção 6) e pela aprovação da Carol (seção 9).

Base lida: o plano, as notas e as revisões do irmão F3.147 (`docs/design/aprovadas/portal-sino-caso-encerrado/`; `PLANO-CODIGO.md` e `REVISAO-CODIGO.md` em `t3jus/telas/portal-sino-caso-encerrado/`); as migrations 0003 (`app_now`), 0140 (áreas), 0160 (`clientes.ver`), 0200 (`portal_contrato_encerrar`), 0240 (`casos.responsavel_id`), 0390 (sino), 0512, 0852 e 0900 (encerrar, cadeia e `quemContratos`), 0851 (passos do fechamento) e 0990 (o F3.147); `Sino.tsx`, `avisos.ts`, `fechamento.ts`, `fichaLigada.ts`; o pgTAP 135 e o e2e `portal-sino-caso-pronto.spec.ts`.

## 0. O que existe hoje

- **Encerrar no financeiro** (`portal_financeiro_caso_encerrar`, 0512): área Financeiro e `financeiro.editar`; só com `pendencias` vazia; grava **uma linha** em `fechamentos_caso` (`caso_id` é único) com `fechado_por` e `fechado_em`.
- **Encerrar em cadeia** (0852): a versão com `p_contratos` chama a de 0512 **primeiro** e só depois encerra cada contrato marcado, por `portal_contrato_encerrar` (área Contratos e `contratos.editar`), tudo na mesma transação (um `rpc` só na API). Os contratos que podem ir junto são os de `caso_contratos_encerraveis`: ativos, ligados ao caso e **sem outro caso em andamento**. Quem não tem Contratos (Diego) encerra o caso e o contrato fica aberto (estado aprovado `encerrar-sem-contratos`).
- **Não existe desfazer.** `fechamentos_caso` tem o gatilho `financeiro_so_acrescenta` (0512): não se muda nem se apaga.
- **Os passos da ficha do cliente** (`cliente_fechamento`, 0851/0900): depois do `FINANCEIRO` vem o `CONTRATO` (área `CONTRATOS`), feito quando não sobra **nenhum** contrato `ATIVO` do cliente no caso, mesmo o que segue com outro caso. O botão do passo leva a `/contratos/contratos/:id?encerrar=1` (`ROTAS_PASSO.encerrarContrato`), que abre a janela sozinha com o contrato ativo.
- **Quem encerra contratos, com nomes:** `caso_acerto` já devolve `quemContratos` (0900), com a regra área Contratos e `contratos.editar`.
- **A responsável pelo caso** é `casos.responsavel_id` (0240), obrigatória. Quem sai da equipe passa só os casos **em andamento**; o caso encerrado guarda a responsável antiga, mesmo com o vínculo revogado.
- **Áreas** (0140): todo `SOCIO` tem as quatro áreas; a equipe tem as liberadas. `clientes.ver` é das duas funções (0160), então a ficha do cliente abre para todos.
- **O sino** (0390): `aviso_sino(escritorio, pessoa, autor, …)` nunca grava para o autor. `portal_avisos` mostra os últimos 30 dias, até 200 por pessoa. A origem `casos` já existia (0640). O F3.147 (0990) criou o tipo `CASO_PRONTO_FECHAR` (só para quem tem Financeiro), as restrições adiadas `caso_pronto_fim*` (`security definer`) e a chave `agora` em `aviso_sino_linha`. Quando o caso é encerrado no financeiro, o aviso de "pronto" mostra "**Agora:** Marina Ribeiro encerrou no financeiro hoje, às 10h05.", sem dizer se sobrou contrato aberto.

## 1. Quando o aviso nasce

### 1.1 O momento

O aviso nasce **uma vez por caso**, quando a linha de `fechamentos_caso` é gravada, e é montado **no fim da transação**, depois da cadeia:

- **Por que no fim:** a 0852 grava o fechamento antes de encerrar os contratos. Um gatilho imediato veria o C-2026-012 ainda ativo e diria "falta encerrar o contrato" a quem acabou de encerrá-lo junto.
- **Como:** um único gatilho de restrição adiado, `create constraint trigger caso_fechou_fim after insert on fechamentos_caso deferrable initially deferred for each row execute function caso_fechou_fim()`. A função lê `NEW` (`caso_id`, `escritorio_id`, `fechado_por`, `fechado_em`) e chama `caso_fechou_avisar`. Sem anotação em configuração local: o evento é um só por caso, e `NEW` já traz tudo. É `security definer`, dono `dominio`, pelo mesmo motivo do `caso_pronto_fim` (no Postgres 17 o adiado roda com o papel ativo no commit, o `service_role`).
- **Nada derruba o encerramento.** `caso_fechou_avisar` roda num bloco de exceção que registra `financeiro.caso_fechou_falhou` no histórico interno e segue. O registro usa uma **política irmã**, `caso_fechou_historico`, com a marca própria `t3jus.caso_fechou_historico` e a função `caso_fechou_registrar`, no molde de `caso_pronto_registrar` (0990). A política do F3.147 fica intocada.
- **Contexto:** sai sem gravar se `contexto_escritorio()` não é o escritório de `NEW`, como `caso_pronto_conferir`.

### 1.2 Sem rotina diária

O fechamento é um evento único e não volta atrás. Não há período, rotina diária nem tabela nova. Se o aviso falhar, a falha fica no histórico interno (risco na seção 8).

### 1.3 Se o fechamento for desfeito

Hoje não há como desfazer. Se um dia existir um "reabrir o fechamento", essa entrega acrescenta um estado "reaberto" a este aviso e ao de "pronto". Fica escrito no README.

### 1.4 Caso com RPV ou alvará

O item fala do caso **sem levantamento**, mas o caso com levantamento é encerrado pela mesma função e grava a mesma linha. A decisão 16 nasceu na jornada, antes do F3.132, e valia para ele. Recomendo que o aviso saia **nos dois** (pergunta 3). Se a Carol disser não, `caso_fechou_avisar` sai cedo quando há levantamento. O texto não muda com o levantamento.

### 1.5 Casos antigos

**Sem aviso retroativo.** O gatilho novo não dispara para linhas que já existem, e a migration não grava aviso. Não há escritório em produção, então não há pergunta.

## 2. Quem recebe

Dois grupos, lidos no fim da transação, com vínculo `SOCIO` ou `EQUIPE` ativo no escritório do caso. Uma pessoa recebe **no máximo um aviso** por caso.

### 2.1 Grupo A: quem encerra os contratos

- **Quem:** área `CONTRATOS` e `pode(pessoa, escritorio, 'contratos.editar')`, a mesma regra de `portal_contrato_encerrar`, do `podeEncerrarContratos` (0852) e do `quemContratos` (0900). No elenco, são Bianca, Felipe e Marina (a Bianca tem Contratos, e toda a equipe tem `contratos.editar` pela 0200).
- **Só quando sobrou contrato para encerrar:** `caso_contratos_encerraveis(escritorio, caso)` não está vazia no fim da transação. Se a cadeia já encerrou tudo, se os contratos já estavam encerrados ou se o contrato segue com outro caso em andamento, ninguém de Contratos tem o que fazer (pergunta 1).

### 2.2 Grupo B: a responsável pelo caso

- **Quem:** `casos.responsavel_id`, se o vínculo dela ainda está ativo. Se ela saiu da equipe, ninguém do grupo B recebe; o README registra isso.
- **Sempre que o caso fecha**, com a exceção da seção 2.3.
- **Se ela também está no grupo A**, recebe só o aviso do grupo A, que pede a ação.

### 2.3 Quem fica de fora, e por quê

| Pessoa | O que acontece | Por quê |
|---|---|---|
| Quem encerrou (`fechado_por`) | Não recebe | `aviso_sino` já tira o autor; ela acabou de ver a confirmação |
| Quem só tem o Financeiro, sem ser responsável nem ter Contratos | Não recebe | O aviso de "pronto" dela já mostra o encerramento, e ela não tem passo a fazer |
| A responsável só do grupo B que tem aviso `CASO_PRONTO_FECHAR` deste caso nos últimos 30 dias **e** não sobrou contrato aberto | Não recebe | O "Agora: encerrado" do aviso de "pronto" já conta tudo o que há de novo (pergunta 2) |
| A mesma responsável, com contrato aberto | **Recebe** | O aviso de "pronto" não diz que o contrato ficou aberto: é informação nova |
| A responsável que fez a última ação no Financeiro (foi autora do "pronto", `autorFora`) | Recebe | Ela não recebeu o aviso de "pronto", então a exceção acima não vale |
| Quem está no grupo A e tem o aviso de "pronto" (a sócia dona) | **Recebe** | O aviso de "pronto" não pede encerrar o contrato |
| Responsável com vínculo revogado | Não recebe | Só vínculo ativo |
| Quem ganha a área Contratos depois do fechamento | Não recebe | O aviso nasce uma vez; o passo da ficha do cliente mostra o que falta |

### 2.4 PT-02: nenhum valor em reais

Os `dados` não levam valor, saldo nem "tudo recebido". O número dos contratos e "encerrado no financeiro, por quem e quando" já chegam a todos pelo passo da ficha do cliente (`cliente_fechamento` não esconde esses campos sem Financeiro). O aviso não acrescenta nada que a pessoa não veja lá.

## 3. O tipo novo no sino

### 3.1 Nome, origem, dados

- Tipo **`CASO_ENCERRADO_FINANCEIRO`**, somado ao `avisos_sino_tipo_check` pelo padrão de 0854/0990. Origem `casos`, `origem_id` = o caso. Índice parcial `avisos_sino (origem_id, pessoa_id) where tipo = 'CASO_ENCERRADO_FINANCEIRO'`, para o `not exists` de "uma vez por pessoa".
- `dados`, gravados no nascimento, por pessoa, sem valor em reais:
  - `papel`: `CONTRATOS` (grupo A) ou `RESPONSAVEL` (grupo B);
  - `caso`: o nome; `quem`: o nome de `fechado_por`;
  - `clienteId` e `cliente`: o primeiro cliente do caso, para o destino de quem não abre a área (seção 5);
  - `abertos`: os de `caso_contratos_encerraveis`, `[{id, numero, cliente}]`, em ordem de número;
  - `juntos`: os números dos contratos ligados ao caso com `encerrado_em = NEW.fechado_em`. A cadeia corre na mesma transação e `app_now()` é `now()` mais o ajuste do relógio (0003), então a data é **igual**;
  - `jaEncerrados`: os números dos ligados com `encerrado_em < NEW.fechado_em`;
  - `seguem`: os contratos ativos ligados ao caso que ficam com outro caso em andamento, `[{numero, outroCaso}]`;
  - `quemContratos`: os nomes de quem encerra contratos (a regra do grupo A), para a frase do grupo B.

### 3.2 O estado de agora

O aviso não muda (guardião de 0390). `aviso_sino_linha` ganha um segundo ramo, para este tipo, que grava a chave **`agoraFechou`**, separada da `agora` do F3.147, para os tipos não se misturarem e o `AgoraCasoPronto` ficar intacto. `caso_fechou_agora(a)` lê os contratos de `dados.abertos` pela chave primária, com `escritorio_id = a.escritorio_id`, e o índice de `caso_clientes` por `contrato_id` (sem `caso_acerto`):

- `{ "abertos": [{id, numero}] }`: os que ainda estão ativos e podem ser encerrados, quando algum saiu da lista;
- `{ "seguem": [{id, numero, outroCaso}] }`: os que ainda estão ativos mas ganharam outro caso em andamento depois do aviso;
- `{ "encerrados": { "em": <o encerrado_em mais novo>, "por": <nome, quando foi uma pessoa só> } }`: quando todos os de `abertos` foram encerrados;
- em `abertos`, cada contrato que saiu da lista vai também em `{ "saiu": [{numero, por}] }`, para a linha dizer o que mudou.

Pode vir mais de uma chave. Sem nada em `abertos` no nascimento, não há `agoraFechou`. A tabela de contratos não guarda quem encerrou (0200), mas o histórico guarda: `por` sai dele, pelo índice do histórico por contrato, como o `encerradoPor` de `caso_acerto` (0900). `caso_acerto` continua de fora. A tela escreve "você" quando `por` é a pessoa da sessão.

## 4. O texto

Título igual para todos, no passado, como no F3.147: "O caso **‹nome do caso›** foi encerrado no financeiro". No grupo A, a especialista pode testar a variação de título que diz o que fazer ("Falta encerrar o C-2026-012: o caso **‹nome›** foi encerrado no financeiro") ou manter o título e confiar no selo "Falta o contrato". A escolha fica com ela e com a Carol.

As frases abaixo usam o elenco de sempre e são propostas: a especialista pode afinar, e a Carol aprova. Os nomes dos clientes aparecem só ao lado do contrato ("o C-2026-012, de Noemi Bastos Carvalho").

### 4.1 Grupo A (`papel = CONTRATOS`)

Selo de tom `andamento`, "Falta o contrato" (com mais de um aberto, "Faltam os contratos"). Destino "Encerrar o ‹contrato›", o aberto de menor número.

- **Um contrato aberto:** "Diego Almeida encerrou o caso no financeiro, e o C-2026-012, de Noemi Bastos Carvalho, continua aberto. Encerre o contrato."
- **Dois abertos:** "Diego Almeida encerrou o caso no financeiro, e continuam abertos o C-2026-025, de Lúcia Nogueira, e o C-2026-026, de Paulo Nogueira. Encerre os contratos."
- **Três ou mais:** "…, e continuam abertos o C-2026-028, de Clara Viana, o C-2026-029, de Rafael Viana, e mais 1 contrato. Encerre os contratos."
- **Agora, parte encerrada:** segunda linha "**Agora:** você encerrou o C-2026-025 hoje; falta o C-2026-026." (com outra pessoa: "Felipe Matos encerrou o C-2026-025 hoje; …"). O selo fica "Falta o contrato", e o destino passa a "Encerrar o C-2026-026".
- **Agora, todos encerrados:** "Encerre o(s) contrato(s)." sai. Linha "**Agora:** você encerrou o C-2026-012 hoje." (outra pessoa: "Felipe Matos encerrou o C-2026-012 hoje."; vários: "você encerrou os contratos hoje."; vários, por pessoas diferentes: "os contratos foram encerrados hoje."). Selo neutro "Contrato encerrado" (ou "Contratos encerrados"). Destino "Ver o C-2026-012".
- **Agora, o contrato passou a seguir com outro caso:** "Encerre…" sai. Linha "**Agora:** o C-2026-012 passou a seguir com o caso Martins x INSS · aposentadoria; não precisa encerrar." Selo neutro "Segue com outro caso". Destino "Ver o C-2026-012".
- **A data sem hora** ("hoje", "ontem", "em 19/11") sai de uma função nova do domínio, `quandoDia`, irmã de `quandoEncerrouNoFinanceiro`, com teste.

### 4.2 Grupo B (`papel = RESPONSAVEL`)

Destino "Ver o caso" (seção 5). As frases se juntam nesta ordem:

- **Abertura:**
  - com contrato encerrado junto: "Marina Ribeiro encerrou o caso no financeiro e, junto, o C-2026-032, de Márcia Fontes." (vários: "…e, junto, os contratos C-2026-032 e C-2026-034.");
  - sem contrato junto: "Marina Ribeiro encerrou o caso no financeiro." e, se havia encerrados antes, "O C-2026-033 já estava encerrado." (vários: "Os contratos já estavam encerrados.").
- **Contrato aberto (a responsável não tem Contratos):** "Quem encerra o C-2026-032, de Márcia Fontes, é a área Contratos (Bianca Torres, Felipe Matos e Marina Ribeiro)." Selo `andamento` "Falta o contrato". Os nomes vêm de `quemContratos`, em ordem alfabética, como na 0900.
- **Contrato que segue com outro caso:** "O C-2026-007, de Ivone Martins, fica aberto, porque as parcelas seguem com o caso Martins x INSS · aposentadoria." Selo neutro "Segue com outro caso" (pergunta 4).
- **Fim:** "O fechamento do caso terminou." e o selo `ok` "Fechamento feito" saem **só quando `abertos` e `seguem` estão vazios**. É o mesmo momento em que o passo "Encerrar o contrato" da ficha do cliente fica feito, porque a ficha conta todo contrato ativo.
- **Agora:** quando os de `abertos` são encerrados e não há `seguem`, "**Agora:** Felipe Matos encerrou o C-2026-032 hoje, e o fechamento do caso terminou." Selo `ok` "Fechamento feito". Com `seguem`, "**Agora:** Felipe Matos encerrou o C-2026-032 hoje." e o selo fica "Segue com outro caso".

Exemplos inteiros:
- Larissa, responsável sem Financeiro, cadeia completa: "Marina Ribeiro encerrou o caso no financeiro e, junto, o C-2026-032, de Márcia Fontes. O fechamento do caso terminou."
- Larissa, contrato aberto: "Diego Almeida encerrou o caso no financeiro. Quem encerra o C-2026-032, de Márcia Fontes, é a área Contratos (Bianca Torres, Felipe Matos e Marina Ribeiro)."

### 4.3 Leitor de tela

Como no F3.147: com `agoraFechou`, o link ganha o trecho `paraLeitor` (". Agora: falta o C-2026-026.", ". Agora: contrato encerrado.", ". Agora: contrato segue com outro caso.", ". Agora: fechamento terminou."). **Sem `agoraFechou`, o trecho diz o que o selo diz**, porque o selo e o destino ficam fora do link e o título é igual para todos: ". Falta encerrar o C-2026-012.", ". Falta encerrar 2 contratos.", ". Falta encerrar o C-2026-032, com a área Contratos.", ". O contrato segue com outro caso.", ". O fechamento terminou.". Nenhum estado depende só da cor.

### 4.4 Ícone

Proposta: o `cadeado` do aviso de "pronto", da mesma família. A especialista decide se o caso fechado pede outro ícone já existente.

## 5. Para onde o clique leva

A tela escolhe o destino pelas **áreas da sessão** (`escritorio.areas`, que a Moldura já tem e passa ao `PainelSino`). `descreverAviso` ganha o parâmetro opcional `areas`. Uma regra só para os dois grupos: quem não abre a área do destino vai para a ficha do cliente, que todos abrem (`clientes.ver`).

| Quem | Tem a área | Destino escrito | Link |
|---|---|---|---|
| Grupo A, com contrato a encerrar | Contratos | "Encerrar o C-2026-012" | `ROTAS_PASSO.encerrarContrato(id)` (`?encerrar=1`, a janela abre sozinha), o aberto de menor número segundo o `agoraFechou` |
| Grupo A, tudo encerrado ou o contrato segue | Contratos | "Ver o C-2026-012" | `ROTAS_CONTRATOS.contrato(id)` |
| Grupo B | Jurídico | "Ver o caso" | `ROTAS_JURIDICO.caso(casoId)`; o "Acerto no Financeiro" mostra valores só a quem tem Financeiro (`caso_resumo_acerto`, PT-02) |
| Qualquer um, sem a área acima (perdeu a área depois) | — | "Ver a ficha de Noemi Bastos Carvalho" | `/clientes/:clienteId`; a ficha mostra os passos do fechamento sem valores |

A janela "Encerrar contrato" pede o motivo, como hoje. O motivo **não** vem preenchido: isso mudaria a tela aprovada do contrato e fica fora deste item.

## 6. Estados para a especialista de frontend

Só o item novo do sino muda; o painel, os filtros, o vazio, o erro e as fichas de destino são os aprovados. Cada estado no computador (1440) e no celular (390), seguindo `docs/IDENTIDADE.md`, `docs/design/conceito-gabinete.md` e o sino aprovado (`portal-sem-avisos-sino`, `portal-sino-caso-encerrado`), com axe e alvo de toque de 44 px.

Elenco sugerido: Ribeiro & Matos, quarta-feira, 18/11/2026.
- No caso "Carvalho x Construtora Lume", **Diego** (sem Contratos) encerra no financeiro às 10h05. O C-2026-012, de Noemi, fica aberto (estado aprovado `encerrar-sem-contratos`). O C-2026-013, de Cláudio, já estava encerrado desde 12/11, como no aprovado. Felipe é o responsável e tem Contratos.
- Para vários contratos, um caso fictício novo dos **Nogueira** (C-2026-025 e C-2026-026 abertos; o C-2026-010 já encerrado) e, para três ou mais, o Inventário de Augusto Viana (C-2026-028 a 030).
- Para a responsável sem Financeiro, um caso fictício novo com **Larissa** como responsável (C-2026-032, de Márcia Fontes).

1. `sf-contrato`: Felipe vê o aviso do grupo A, com um contrato aberto (C-2026-012), no meio da lista dele.
2. `sf-varios`: grupo A no caso Nogueira, com dois contratos abertos e, abaixo, a variação com três ou mais.
3. `sf-socia`: Marina (sócia, todas as áreas) vê o aviso novo do grupo A **e**, mais abaixo, o aviso de "pronto" do mesmo caso com "Agora: Diego Almeida encerrou no financeiro hoje, às 10h05." Os dois convivem sem repetir a mesma coisa.
4. `sf-responsavel`: Larissa, só Jurídico, com o contrato encerrado junto: "O fechamento do caso terminou.", selo "Fechamento feito", destino "Ver o caso".
5. `sf-responsavel-falta`: Larissa, com o contrato aberto: "Quem encerra o C-2026-032, de Márcia Fontes, é a área Contratos (Bianca Torres, Felipe Matos e Marina Ribeiro)."
6. `sf-segue`: Larissa, com um contrato que segue com outro caso, selo "Segue com outro caso" (só se a Carol disser sim à pergunta 4).
7. `sf-agora-parcial`: Nogueira, depois de Felipe encerrar o C-2026-025: "Agora: você encerrou o C-2026-025 hoje; falta o C-2026-026."
8. `sf-agora-encerrado`: Felipe depois de encerrar tudo (selo "Contrato encerrado", destino "Ver o C-2026-012"), e Larissa ("Agora: Felipe Matos encerrou o C-2026-032 hoje, e o fechamento do caso terminou.").
9. `sf-lido`: o aviso do `sf-contrato` já aberto, sem o destaque.

Só nas notas, sem captura: o destino "Ver a ficha de ‹cliente›" de quem perdeu a área; "já estava encerrado"; o contrato que passou a seguir com outro caso depois do aviso; a variação com levantamento (texto igual).

**Se a Carol disser sim à pergunta 5**, entram dois estados, variações de telas aprovadas em `portal-fechamento-sem-levantamento`:
10. `fecha-larissa`: na ficha do cliente, para quem não tem o Financeiro, a frase "Quando o caso for encerrado no financeiro, quem é responsável por ele fica sabendo pelo sino." (vale também para a responsável que só vê o "Agora:" no aviso de "pronto", seção 2.3).
11. `encerrar-sem-contratos`: na janela de encerrar de quem não tem Contratos (comum à ficha do repasse e à do contrato), "Quem encerra é a área Contratos (Bianca, Felipe e Marina), no passo 'Encerrar o contrato' da ficha de Noemi. Eles recebem um aviso no sino." Os nomes vêm de `quemContratos`, em ordem alfabética; o "(Marina e Felipe)" da tela aprovada do F3.132 deixava a Bianca de fora.

No desenho, o estado 8 virou dois (`sf-agora-encerrado`, do Felipe, e `sf-agora-terminou`, da Larissa), e os contratos novos são o C-2026-025/026 (Nogueira), o C-2026-028 a 030 (Viana) e o C-2026-032 (Larissa), porque o C-2026-020 e o C-2026-031 já existem em telas aprovadas (`NOTAS.md`).

## 7. O que muda no código

### 7.1 Servidor: migration na faixa 1020-1029

`sistema/supabase/migrations/1020_sino_caso_encerrado_financeiro.sql` (conferir no `main` e nas branches abertas, no dia do commit, que 1020 está livre; hoje a maior é a 1000). O cabeçalho cita F3.150, EX-16 e EX-17, e também PT-02 (sem valores) e PT-10, como a 0990.

1. O tipo novo no check do sino e o índice parcial.
2. `caso_fechou_dados(escritorio, caso, fechado_em, autor, papel)`: os `dados` da seção 3.1, sem valor.
3. `caso_fechou_avisar(escritorio, caso, autor, fechado_em)`:
   - confere o contexto e, se a resposta à pergunta 3 for não, o levantamento;
   - monta os grupos A e B (seção 2) e aplica as regras de quem fica de fora;
   - faz o `not exists` de aviso do mesmo tipo e caso para a pessoa;
   - grava com `aviso_sino(..., autor, 'CASO_ENCERRADO_FINANCEIRO', 'casos', caso, dados)`;
   - tudo num bloco de exceção.
4. O histórico interno: a política irmã `caso_fechou_historico` e `caso_fechou_registrar`.
5. O gatilho: `caso_fechou_fim()`, `security definer`, dono `dominio`, numa restrição adiada só (seção 1.1).
6. `caso_fechou_agora(a)` e `aviso_sino_linha` recriada com o ramo novo (`agoraFechou`). O ramo de `CASO_PRONTO_FECHAR` fica como está.
7. `call fechar_acesso()` no fim.

Nenhuma tabela nova de dado de escritório.

### 7.2 API e domínio

- Nenhuma rota nova: `portal_avisos` já repassa tudo.
- `packages/domain/src/avisos.ts`:
  - `TipoAvisoSino` ganha `"CASO_ENCERRADO_FINANCEIRO"`;
  - `AvisoSino.dados` ganha `papel`, `clienteId`, `abertos`, `juntos`, `jaEncerrados`, `seguem` e `quemContratos` (`caso`, `quem` e `cliente` já existem);
  - `AvisoSino` ganha `agoraFechou?: AgoraCasoFechou` (`abertos`, `seguem`, `encerrados`), separado de `agora`;
  - entra a função `quandoDia`.
- `app_test.ts` (Deno): a rota repassa `agoraFechou` sem mexer.

### 7.3 Tela

- `packages/ui/src/portal/Sino.tsx`: `case "CASO_ENCERRADO_FINANCEIRO"` em `descreverAviso`, com `fraseCasoFechou(d)` e `agoraCasoFechou(a, agora)` no molde de `fraseCasoPronto` e `agoraCasoPronto`, reusando `juntarComE`. O parâmetro opcional `areas` escolhe o destino (seção 5). O item usa o mesmo HTML e CSS; a linha "Agora:" e o `paraLeitor` já existem.
- O `PainelSino` recebe `escritorio.areas` da Moldura.
- **Se a resposta à pergunta 5 for sim:** os textos da ficha do cliente (`fichaLigada.ts`, passo `FINANCEIRO` para quem não tem Financeiro) e da janela comum de encerrar (seção "Contratos ligados ao caso", sem caixa) ganham as frases da seção 6, com os nomes de `quemContratos`. O e2e da ficha do repasse e o da ficha do contrato mudam junto.

### 7.4 Testes

- **pgTAP novo** `sistema/supabase/tests/pgtap/137_sino_caso_encerrado_financeiro_test.sql`. Hoje o maior é o 136 e o 132 está vago, sem preencher. As threads abertas junto (F3.139, F3.155, F3.160, F3.162, F3.165) podem disputar o 137: conferir com `git ls-tree` do `main` e das branches abertas no dia do commit.
  - O `pg_temp.fim()` segue o do 135: `set constraints all immediate` e, logo depois, **volta a adiar** `caso_fechou_fim` junto com as de 0990 (`caso_pronto_fim`, `caso_pronto_fim_mudou`, `caso_pronto_fim_saiu`, `destinacoes_fecham`). Sem isso, a restrição nova ficaria imediata depois do primeiro `fim()` e dispararia antes da cadeia.
  - **A ordem:** encerrar em cadeia e, só depois do `fim()`, conferir que ninguém do grupo A recebeu e que `juntos` traz o contrato.
  - **Quem recebe:**
    - Diego encerra sem os contratos. Felipe, Marina e Bianca (Contratos, com `contratos.editar`) recebem `papel = CONTRATOS` com `abertos`. A responsável sem Contratos recebe `RESPONSAVEL`. Diego não recebe. O Felipe é convidado com `COMERCIAL`, `CONTRATOS` e `JURIDICO` (o 135 o convida sem Jurídico; aqui o destino "Ver o caso" e o encerramento com perda dependem dele).
    - Marina encerra com a cadeia. Ninguém do grupo A recebe. A responsável recebe com `juntos`. Marina não recebe.
    - A responsável que é autora não recebe. A responsável com vínculo revogado não recebe.
    - A responsável só do grupo B com aviso de "pronto" de menos de 30 dias, sem contrato aberto, não recebe. Com contrato aberto, recebe. Com o aviso de "pronto" de 31 dias (`ajustar_relogio`), recebe. A responsável que foi autora da última ação no Financeiro (sem aviso de "pronto") recebe.
    - A responsável com Contratos e contrato aberto recebe um aviso só, `papel = CONTRATOS`.
  - **Contratos:**
    - O contrato que segue com outro caso entra em `seguem` e não em `abertos`; ninguém do grupo A recebe por ele.
    - Com vários clientes e contratos, um aviso por pessoa, com `abertos` em ordem de número.
    - `juntos` pela data igual a `fechado_em`; `jaEncerrados` pela data anterior.
  - **O aviso e a ficha concordam:** quando os `dados` e o `agoraFechou` dariam "O fechamento do caso terminou" (sem `abertos` e sem `seguem`), `cliente_fechamento(...) ->> 'pendente'` é falso para cada cliente; com `seguem`, é verdadeiro e o aviso não diz "terminou".
  - **O `agoraFechou`:**
    - encerrar um de dois traz `abertos` com o que falta;
    - encerrar os dois traz `encerrados.em`;
    - ligar um caso novo em andamento ao contrato aberto traz `seguem`;
    - um contrato de outro escritório com o mesmo id em `dados` não é lido;
    - `portal_avisos` com 200 avisos do tipo não chama `caso_acerto`.
  - **PT-02:** os `dados` não têm valor em reais (nenhuma chave com centavos, nenhum texto com "R$").
  - **Com levantamento:** avisa ou não, conforme a pergunta 3.
  - **Escritórios:** a gravação com o contexto de outro escritório não grava. O escritório B não vê nada do A.
  - **Erro:** um erro forçado em `caso_fechou_avisar` não desfaz o fechamento nem a cadeia, e grava `financeiro.caso_fechou_falhou`.
  - **Commit de verdade como `service_role`**, no molde do teste 22 do 135: encerrar em cadeia pela função da API, com commit, e conferir os avisos e que o histórico interno não tem `financeiro.caso_fechou_falhou`.
  - A migration não cria aviso para fechamento antigo.
- **pgTAP 135, ajuste:** a contagem de `135:156` ("encerrar não manda aviso novo") passa a filtrar `tipo = 'CASO_PRONTO_FECHAR'`, mantendo a intenção. Com o F3.150, Felipe e Larissa recebem o aviso novo naquele encerramento. Rodar a suíte pgTAP inteira, não só o 137. Hoje só o 135 lê `avisos_sino` entre os testes que encerram caso (053, 120, 121, 130, 131, 135).
- **Vitest** `packages/ui/src/portal/sino.test.ts` (já existe):
  - o título;
  - as frases dos dois papéis (um, dois e três contratos; "e, junto"; "já estava encerrado"; o contrato que segue);
  - "terminou" só sem `abertos` e sem `seguem`;
  - os destinos com e sem cada área;
  - os três `agoraFechou` com selo, linha (com "você" ou o nome de quem encerrou), destino e nome acessível do link;
  - o nome acessível do link também sem `agoraFechou` (o trecho do selo, seção 4.3);
  - `quemContratos` em ordem alfabética;
  - `quandoDia` ("hoje", "ontem", "em 19/11") no fuso de Brasília.
- **e2e Playwright** `sistema/tests/e2e/portal-sino-caso-encerrado-financeiro.spec.ts`, com a **API simulada** (`page.route`), no molde do `portal-sino-caso-pronto.spec.ts`, relógio em 18/11/2026:
  - os estados `sf-*` no celular e no computador, com axe;
  - o clique que marca lido e leva a `/contratos/contratos/:id?encerrar=1`, com a janela aberta;
  - o "Agora:" depois do encerramento do contrato;
  - o nome acessível com o `paraLeitor`;
  - o destino do grupo B com e sem Jurídico.

  Quem recebe e quem não recebe fica no pgTAP 137.

### 7.5 Painel e README

- `F3.150.json`: `status` `feito`, `evidencia` com a migration, os testes e o PR, sem `proximo`. `refs` EX-16 e EX-17: atende a parte "aviso quando fecha" das duas; o resto já foi entregue no F3.128, F3.132 e F3.147. Se a resposta à pergunta 3 for não, a nota diz que o caso com levantamento ficou fora por decisão.
- Linha nova do histórico com `python3 docs/painel/painel.py novo-historico` (`--refs F3.150 EX-16 EX-17`) e `python3 docs/painel/painel.py conferir` antes do commit.
- `sistema/README.md`:
  - na linha do sino, o tipo novo e a chave `agoraFechou`;
  - na seção do F3.132, "Falta" deixa de citar o F3.150;
  - a regra: se um dia houver desfazer o fechamento, este aviso e o de "pronto" ganham o estado "reaberto";
  - a responsável de caso encerrado que saiu da equipe não recebe.
- O desenho aprovado vai para `docs/design/aprovadas/portal-sino-caso-fechou/`.

## 8. Riscos

- **O gatilho vendo a cadeia pela metade:** a restrição adiada resolve, com o teste da ordem e o `fim()` que volta a adiar.
- **O adiado falhando no commit pela API:** é o defeito pendente no F3.163 para `destinacoes_fecham`. Aqui ele fica coberto por `security definer` e pelo teste com commit como `service_role`.
- **Erro no aviso derrubando o encerramento:** bloco de exceção e teste com erro forçado.
- **Aviso perdido sem rede:** não há rotina diária; a falha fica no histórico interno. Se aparecer na prática, a rotina entra depois.
- **Aviso e ficha do cliente discordando:** "terminou" só sem `abertos` e sem `seguem`, com o teste contra `cliente_fechamento`.
- **Contrato que passa a seguir com outro caso depois do aviso:** o `agoraFechou` tira o pedido de encerrar, para ninguém cancelar parcelas do outro caso.
- **Barulho para a sócia dona e para a responsável com Financeiro:** perguntas 1 e 2.
- **Quem perde a área depois do aviso:** o destino sai das áreas da sessão, com a ficha do cliente como saída.
- **O teste 135 do F3.147:** a contagem passa a filtrar o tipo; a suíte inteira roda.
- **O F3.139 (baixa de parcela com motivo) em paralelo** muda o acerto, não o fechamento. Só o README precisa ficar coerente.
- **Numeração em threads paralelas:** conferir a migration (faixa 1020-1029), o pgTAP (137) e o nome da pasta aprovada no dia do commit.

## 9. Perguntas para a Carol

1. **Quem cuida dos contratos só recebe o aviso quando sobra contrato para encerrar?** Recomendo que sim. Se o contrato já foi encerrado junto com o caso, essa pessoa não tem nada a fazer, e o aviso só atrapalharia.
2. **A responsável pelo caso que também cuida do Financeiro já foi avisada quando o caso ficou pronto, e esse aviso já mostra que ele foi encerrado. Ela recebe outro aviso?** Por exemplo: a Marina cuida do Financeiro e é a responsável; no aviso de "pronto" ela já vê "Agora: Diego Almeida encerrou no financeiro hoje". Recomendo que só receba se algum contrato tiver ficado aberto, porque isso o primeiro aviso não conta.
3. **O aviso vale também para o caso com RPV ou alvará, encerrado na ficha do repasse?** Recomendo que sim. A promessa de avisar quando o caso fecha nasceu nesse caso, e o texto do aviso é o mesmo.
4. **Quando o contrato fica aberto porque as parcelas seguem com outro caso, o aviso conta isso à responsável?** Recomendo que sim, com a frase "O C-… fica aberto, porque as parcelas seguem com o caso …". Quem cuida dos contratos não é avisado, porque não há o que encerrar.
5. **Com o aviso pronto, voltam as frases que prometem o aviso?** São duas. Na ficha do cliente: "Quando o caso for encerrado no financeiro, quem é responsável por ele fica sabendo pelo sino." Na janela de encerrar de quem não cuida dos contratos: "Quem encerra é a área Contratos (Bianca, Felipe e Marina), no passo 'Encerrar o contrato' da ficha de Noemi. Eles recebem um aviso no sino." Recomendo que sim: elas saíram só porque o aviso ainda não existia, e cumprem o que a Carol já aprovou na jornada do cliente. (A primeira mudou porque "a responsável" não serve para um responsável homem, um cliente pode ter mais de um caso, e às vezes a responsável fica sabendo pelo "Agora:" do aviso que já tinha, sem aviso novo.)
6. **A Bianca entra na lista de quem encerra contratos?** No elenco aprovado, ela tem a área Contratos, e toda a equipe pode editar contratos, então a regra do sistema a coloca no grupo: "Bianca, Felipe e Marina". A tela aprovada do fechamento dizia só "Marina e Felipe". Recomendo seguir a regra do sistema. Se a Carol preferir a Bianca fora da área Contratos, os testes mudam o convite dela e os textos voltam a "Felipe e Marina".

## Ajustes não aceitos

- **Citar PT-02 e PT-10 no histórico (nota de escopo da revisão).** Aceito em parte. Eles entram no cabeçalho da migration e nos nomes dos testes, como na 0990. Não entram em `refs`, nem no item nem na linha do histórico. São regras de base que esta entrega só segue, não entrega, e o `CLAUDE.md` pede um item pendente para cada ideia atendida só em parte. O F3.147 fez igual.
- **Sugestão 15, título do grupo A.** Não troquei o título no plano. A variação ficou registrada como opção para a especialista testar (seção 4), porque o título no passado igual para todos é o padrão aprovado no sino do F3.147.
- Os demais ajustes e sugestões foram aceitos como estão.
