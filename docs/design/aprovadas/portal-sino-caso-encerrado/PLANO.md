# Plano do F3.147: aviso no sino quando o caso sem levantamento fica pronto para encerrar no financeiro

**v3, alinhado ao desenho** (`NOTAS.md`, seção "Revisão do desenho", e `REVISAO-DESENHO.md` desta pasta). O desenho tem os nove estados da seção 5.3, com axe sem violações nas 18 capturas.

| O desenho mudou | Onde no plano |
|---|---|
| Título no passado ("ficou pronto"); "ficou pronto de novo" vai no título | 3.2 |
| O número do contrato vai no destino ("Ver o acerto no C-…"); com vários contratos, o de menor número | 3.2 e 3.3 |
| Um molde só para "nada falta receber de ‹cliente›"; frase exata do êxito pago | 3.2 |
| Estado novo `{ "depois": true }` (aviso antigo de caso que tem período mais novo), buscado antes de `pendente`; textos novos de `pendente` e `fora`; selo "Fecha no repasse" | 3.4 |
| `descreverAviso` devolve a linha de agora e o trecho para leitor de tela | 5.2 |
| Vitest dos quatro estados de agora e do nome do link; pgTAP do `depois` | 6.2 |

A v2 aplicou a revisão do plano (`REVISAO.md`, veredito "aprovar com ajustes"); a tabela dela segue abaixo.

**v2, com a revisão aplicada** (`REVISAO.md` desta pasta, de 23/11/2026, veredito "aprovar com ajustes"). Conferi cada ajuste no código antes de aceitar. Os que não aceitei estão no fim, em "Ajustes não aceitos".

| Ajuste da revisão | O que mudou no plano |
|---|---|
| 1. Gatilho imediato vê o caso pela metade | Os gatilhos viram gatilhos de restrição adiados (`deferrable initially deferred`), uma conferência por caso no fim da transação; a gravação do aviso nunca derruba o pagamento (seção 1.3) |
| 2. Caso importado já encerrado | A regra 1 passa a `coalesce(encerrado_por, 'RESULTADO') = 'RESULTADO'`; a folha da ficha do contrato é corrigida na mesma migration (seções 1.1 e 6.1) |
| 3. Gatilhos e leque dos outros casos do contrato | Entram `exitos_conferir` (insert), `levantamentos` (insert) e `caso_clientes` (delete); `casos` e `caso_clientes` conferem também os casos que dividem contrato; lista fechada no README (seção 1.3) |
| 4. Filtro barato não fecha o período | O filtro só pula caso sem período aberto; saída nova `FORA` (seção 1.4) |
| 5. Contexto do escritório | `caso_pronto_conferir` sai sem gravar se o contexto não é o do caso (seção 1.3) |
| 6. Quem recebe | Regra com `financeiro.editar`; o sócio não dono só recebe com a área liberada; o autor fica de fora só em ação de Financeiro (seção 2) |
| 7. Rotina diária | Pula escritório em `CONSULTA` ou `FECHADO`, um bloco de exceção por escritório, custo escrito (seção 1.3) |
| 8. O que deixou o caso pronto | `dados` ganha `motivo` e `periodoId`; uma frase por motivo (seção 3) |
| 9. `agora` do período do aviso | Lê o período pelo `periodoId` e `fechamentos_caso`, nunca `caso_acerto`; índice novo (seção 3.4) |
| 10. Aviso de quando o caso fecha | Vira item pendente proposto nesta entrega (seção 6.4) |
| 11. Numeração | Conferir migration e pgTAP livres no dia do commit (seção 6) |
| 12 a 14. Menores | `dado_pessoal = true`; `on conflict` com o predicado; teste das 24 horas dos dois lados |
| 16. Pergunta dos casos antigos | Decidida no plano, sem pergunta (seção 4) |
| Testes que faltam | Todos entram na seção 6.2, com o teste de concorrência |
| Perguntas revisadas | Cinco perguntas, com a nova sobre as parcelas que seguem com outro caso (seção 7) |

Item do painel: `docs/painel/dados/fases/F3/F3.147.json` (peça S4, refs EX-16 e EX-17, ordem 1065). Vem do F3.132 (PRs #141, #147 e #150; migrations 0900 e 0901; folha "Fechamento do caso" na ficha do contrato em Financeiro › A receber).

Este documento é o plano. Não há código nem migration aqui. Antes de programar, o aviso passa pela especialista de frontend (seção 5) e pela aprovação da Carol (seção 7).

## 0. O que existe hoje

- **O acerto do caso** (`caso_acerto`, 0900) devolve a lista `pendencias` (repasse, êxito para conferir, parcela com saldo, parcela sem valor, reembolso de despesa adiantada) e `aVencer` (quando nada pede ação agora, o último vencimento que falta). `caso_acerto_parcelas` deixa de fora as parcelas do contrato que tem outro caso em andamento (pergunta 3 do F3.132).
- **Encerrar no financeiro** (`portal_financeiro_caso_encerrar`, 0512 e 0852) exige a área Financeiro e `financeiro.editar`, e só grava `fechamentos_caso` com `pendencias` vazia.
- **Pela resposta 1 aprovada no F3.132**, a parcela que ainda vai vencer segura o fechamento. A data só muda o campo `acao` e o `aVencer`; a parcela com saldo fica em `pendencias` até ser paga ou cancelada.
- **A 0920** criou `encerrado_por = 'IMPORTADO_ENCERRADO'` para os processos arquivados importados e os tirou do fechamento e do resumo do acerto (`coalesce(encerrado_por, 'RESULTADO') = 'RESULTADO'`). A folha da ficha do contrato (`portal_financeiro_contrato_fechamentos`, 0901) e o laço que chama `cliente_fechamento` (0851) ainda filtram só `IMPORTACAO_DESFEITA`.
- **Onde o fechamento aparece:** ficha do cliente, ficha do caso ("Encerrado · acerto pendente") e ficha do contrato (folha `#t-fecha-<caso>`). Ninguém é avisado. Sem levantamento, o caso não aparece em Repasses.
- **O sino** (`avisos_sino`, 0390): por pessoa, só acréscimo, muda só `lido_em`. `aviso_sino(...)` nunca grava para o autor passado. Os tipos ficam em `avisos_sino_tipo_check`, recriado a cada tipo novo lendo a lista atual (0531, 0640, 0854). A origem `casos` já existe (0640). O sino confere de novo a cada 15 segundos, com até 200 avisos por pessoa.
- **A tela** (`packages/ui/src/portal/Sino.tsx`): `descreverAviso` dá ícone, título, detalhe, destino escrito, link e selo. O tipo vem de `TipoAvisoSino` (`packages/domain/src/avisos.ts`). A rota `GET /v1/escritorio/avisos` só repassa `portal_avisos`.
- **Padrões que o plano reusa:** gatilho de restrição adiado (`destinacoes_fecham`, 0280); rotina diária por escritório (`lembrar_repasses`, 0553) e o pulo do escritório só de consulta (`lancar_recorrentes`, 0534); RLS forçado por `contexto_escritorio()` em toda tabela protegida (0550).

## 1. Quando o aviso nasce

### 1.1 A regra de "pronto"

Um caso está **pronto para encerrar no financeiro** quando tudo isto vale:

1. `situacao = 'ENCERRADO'` e `coalesce(encerrado_por, 'RESULTADO') = 'RESULTADO'` (fora o caso de importação desfeita e o importado já encerrado, como depois da 0920);
2. o caso não tem levantamento;
3. o caso tem ao menos um contrato ligado, ativo ou encerrado (a condição do passo `FINANCEIRO` em `cliente_fechamento`);
4. não há `fechamentos_caso` para o caso;
5. `caso_acerto(escritorio, caso) -> 'pendencias'` está vazia.

A regra 5 é a do botão de encerrar: o aviso nunca promete o que o servidor recusa. Tudo fica em `caso_pronto_fechar(p_escritorio, p_caso) returns boolean` (`language sql stable`, sem `security definer`).

### 1.2 "Tudo recebido" e "a última parcela a vencer chegou"

Pela resposta 1 aprovada, os dois momentos do texto do item viram um só:

- **O caso fica pronto quando a última pendência se resolve:** o pagamento que zera o acerto, o reembolso marcado, o êxito lançado e pago ou não cobrado, as parcelas futuras canceladas pelo encerramento do contrato, ou as parcelas do contrato que passam a outro caso em andamento.
- **A chegada do dia da última parcela, sozinha, não deixa o caso pronto.** Paga antes ou no dia, o caso ficou pronto no pagamento. Sem pagamento, a parcela vira atraso e entra na cobrança de A receber.
- **O caso encerrado no Jurídico já sem nada pendente** fica pronto no fim da transação que o encerrou, depois de os êxitos para conferir terem sido gravados (seção 1.3).

### 1.3 Gatilhos adiados e rotina diária

**Gatilhos de restrição adiados**, no padrão de `destinacoes_fecham` (0280): `create constraint trigger … after insert or update of … deferrable initially deferred for each row`. A função do gatilho só junta os casos afetados (de `NEW` e de `OLD`, quando muda) e chama `caso_pronto_conferir` **uma vez por caso por transação** (os casos já conferidos ficam em `set_config('t3jus.casos_conferidos', …, true)`). No fim da transação tudo já foi gravado, na ordem que for. Isso resolve:

- o encerramento com êxito: `portal_juridico_caso_etapa` muda `casos.situacao` antes de inserir os êxitos para conferir (0640); o gatilho imediato avisaria "Nada falta receber" por engano;
- os comandos em lote (`contrato_cancelar_futuros` cancela todas as parcelas futuras num `update` só; a importação insere em lote): uma conferência por caso, não por linha;
- a ordem de locks: o lock por caso é tomado no commit, por pouco tempo.

As tabelas e o que cada uma confere:

| Tabela | Quando | Casos conferidos |
|---|---|---|
| `pagamentos_recebidos` | insert | os casos encerrados ligados ao contrato da parcela |
| `recebimentos_previstos` | insert; update de `cancelado_em`, `valor` | idem |
| `exitos_conferir` | insert; update de `situacao` | o caso do êxito |
| `contas_pagar` | insert; update de `reembolsado_em`, `cancelada_em`, `caso_id` | o caso da conta (o novo e o antigo) |
| `levantamentos` | insert | o caso do levantamento (fecha o período com `FORA`) |
| `casos` | update de `situacao`, `encerrado_por` | o próprio caso **e** os casos encerrados sem fechamento que dividem algum contrato com ele |
| `caso_clientes` | insert; update de `contrato_id`; delete | idem |
| `fechamentos_caso` | insert | o caso (fecha o período com `ENCERRADO`) |

O update de `contratos.estado` não precisa de gatilho: a ativação insere as parcelas e o encerramento as cancela, e os dois já estão cobertos. O leque em `casos` e `caso_clientes` cobre a regra da pergunta 3 do F3.132: quando outro caso do mesmo contrato **encerra**, as parcelas **voltam** a este (ele deixa de estar pronto); quando um caso novo em andamento é ligado ao contrato, as parcelas **saem** deste (ele pode ficar pronto). A busca usa o índice de `caso_clientes` por `contrato_id` (0240).

**Regras de `caso_pronto_conferir(p_escritorio, p_caso, p_autor, p_motivo)`** (volátil):

- o `p_escritorio` vem sempre de `NEW.escritorio_id`, nunca do navegador;
- começa com `if contexto_escritorio() is distinct from p_escritorio then return; end if;` e confere que enxerga o caso. Com o contexto errado, `caso_acerto` não dá erro, devolve `pendencias` vazia; por isso sai sem gravar, e a rotina refaz no dia seguinte;
- toma `pg_advisory_xact_lock` pelo caso **antes** de ler. Em `read committed`, a segunda transação espera o lock e, quando ele sai, já enxerga o pagamento da primeira: dois pagamentos simultâneos das duas últimas parcelas dão exatamente um aviso, na hora;
- a gravação (período e avisos) fica num bloco `begin … exception when others` que registra a falha (`registrar_historico` com ação interna) e deixa o pagamento seguir. O aviso nunca impede o recebimento.

**Rotina diária** `avisar_casos_prontos_fechar()`, às 7h de Brasília (`'0 10 * * *'`, nome `t3jus-casos-prontos-fechar`), no molde de `lembrar_repasses`: política temporária em `escritorios`, `entrar_escritorio_servico` por escritório, `limpar_contexto()` no fim. Ela:

- pula o escritório cujo `contrato_situacao` é `CONSULTA` ou `FECHADO` (o gatilho `contrato_aceita_escrita` recusaria a escrita e pararia a rotina inteira), como `lancar_recorrentes` (0534);
- põe cada escritório num bloco de exceção, para um erro não parar os outros;
- chama a mesma `caso_pronto_conferir`, com `p_motivo = 'ROTINA'` e autor nulo.

Com os gatilhos adiados e o lock, a rotina é só rede de segurança para gatilho esquecido. **Custo:** ela roda `caso_acerto` para cada caso encerrado sem fechamento e sem levantamento, mais os que têm período aberto. Hoje são zero. Enquanto o F3.139 (FI-24, baixa sem receber) não existe, o caso perdido com cliente que não paga fica pendente para sempre, e esse conjunto só cresce. Esperado: dezenas por escritório no primeiro ano. Se passar de algumas centenas, a rotina passa a olhar só os casos com mudança nas tabelas do acerto desde a última execução.

### 1.4 Uma vez por caso, e o que acontece quando volta a ficar pendente

Tabela nova `casos_prontos_fechar`, um período por vez que o caso ficou pronto:

| Coluna | O que é |
|---|---|
| `id` | uuid |
| `escritorio_id` | o escritório (do contexto do servidor) |
| `caso_id` | o caso, com chave composta com o escritório |
| `pronto_em` | quando ficou pronto |
| `motivo` | o que o deixou pronto (seção 3.1) |
| `saiu_em` | quando deixou de estar pronto (nulo enquanto está) |
| `saiu_por` | `PENDENCIA` (voltou a ter pendência), `ENCERRADO` (encerrado no financeiro) ou `FORA` (saiu do escopo: ganhou levantamento, importação desfeita) |

- Índice único parcial `(caso_id) where saiu_em is null` (no máximo um período aberto por caso) e índice `(caso_id, pronto_em desc)` para o `agora`.
- O insert é `insert … on conflict (caso_id) where saiu_em is null do nothing returning id`, repetindo o predicado do índice parcial. Só se inseriu, grava os avisos.
- `call proteger_tabela_escritorio('casos_prontos_fechar')`; linha no `inventario_dados` com `dado_pessoal = true` e a mesma base legal de `fechamentos_caso`; guardião: só se acrescenta, e depois muda só `saiu_em` e `saiu_por`, uma vez.
- `caso_pronto_conferir`:
  - **sem período aberto e fora do escopo** (regras 1 a 4 falham): sai cedo, sem `caso_acerto`. É o filtro barato, e ele só vale para caso **sem** período aberto;
  - **com período aberto**: sempre confere; fora do escopo fecha com `FORA` (ou `ENCERRADO`, quando há fechamento); com pendência fecha com `PENDENCIA`. Nenhum aviso sai ao fechar;
  - **pronto e sem período aberto**: abre o período e grava os avisos;
  - **pronto e com período aberto**: nada.
- **Voltou a ficar pendente e ficou pronto de novo** (parcela nova, despesa adiantada lançada depois, "Não foi paga" na parcela paga antes do T3jus, outro caso do contrato encerrado): o período novo manda um aviso novo, com "Ficou pronto de novo". Quem ainda tem um aviso deste caso **não lido e de menos de 24 horas** não ganha outro.

## 2. Quem recebe

- **A regra:** vínculo `SOCIO` ou `EQUIPE` ativo, a área Financeiro (`areas_da_pessoa`) e `pode(pessoa, escritorio, 'financeiro.editar')`. O aviso pede uma ação que exige essa permissão.
- **Sócio:** `areas_da_pessoa` dá todas as áreas só ao **sócio dono**. O sócio que não é dono recebe só se tiver a área Financeiro liberada, como em qualquer outra tela do Financeiro.
- **O autor:** fica de fora quando a ação que deixou o caso pronto foi de Financeiro (pagamento, reembolso, êxito, contrato encerrado pela cadeia): ele está vendo o âmbar "Encerrar o caso no financeiro". Quando foi o **encerramento do caso no Jurídico**, ou um caso novo ligado ao contrato, o autor também recebe se tiver Financeiro: ele não viu a folha do Financeiro. Na rotina, o autor é nulo. Isso vai à Carol junto com a pergunta 1.
- **PT-02:** os `dados` não levam valor em reais, e o `agora` também não. Quem perde a área depois vê um aviso sem números, e o clique cai na recusa de área de sempre.
- **Escritório:** sempre o do caso, lido no servidor.

## 3. O tipo novo no sino

### 3.1 Nome, origem e dados

- Tipo **`CASO_PRONTO_FECHAR`**, somado ao `avisos_sino_tipo_check` pelo padrão de 0854. Origem `casos`, com `origem_id` = o caso. Índice parcial `avisos_sino (origem_id) where tipo = 'CASO_PRONTO_FECHAR'`, para a regra das 24 horas.
- `dados`, gravados no nascimento, sem valor em reais:
  - `caso`: o nome do caso;
  - `clientes` (até dois nomes) e `maisClientes`;
  - `contratoId` e `contrato` (número): o contrato do link;
  - `parcelas`: quantas parcelas contaram no acerto;
  - `motivo`: `PAGAMENTO`, `REEMBOLSO`, `EXITO`, `CONTRATO_ENCERRADO`, `CASO_ENCERRADO`, `OUTRO_CASO` ou `ROTINA`. O gatilho guarda o motivo da transação na configuração local; com mais de um, vale o primeiro desta ordem;
  - `outroCaso` e `contratoSegue`: o nome do caso em andamento e o número do contrato, no motivo `OUTRO_CASO`;
  - `denovo`: verdadeiro a partir do segundo período;
  - `periodoId`: o período de `casos_prontos_fechar` que o aviso abriu;
  - `quem`: quem fez a ação, quando houver;
  - `exito` (`NAO_COBRADO` ou `PAGO`) e `reembolso` (a descrição da conta), para as frases da seção 3.2.

### 3.2 O texto, uma frase por motivo

Textos exatos do desenho (`NOTAS.md`, "Os estados e o texto de cada aviso"). Nenhum cita valor em reais.

- **Título, no passado**, porque o aviso não muda: "O caso **‹nome do caso›** ficou pronto para encerrar no financeiro". No segundo período em diante (`denovo`): "O caso **‹nome›** ficou pronto de novo para encerrar no financeiro".
- **Destino escrito, com o contrato:** "Ver o acerto no ‹contrato›" (por exemplo, "Ver o acerto no C-2026-012"). Com o caso já encerrado ou com levantamento, "Ver o fechamento no ‹contrato›" (seção 3.4). O link é sempre o mesmo.
- **Ícone:** `cadeado`. **Selo** enquanto o período está aberto: tom `ok`, "Pronto".
- **Clientes:** um nome; dois nomes ("Noemi Bastos Carvalho e Cláudio Carvalho"); três ou mais, os dois primeiros e "mais N clientes".
- **Molde único de "nada a receber":** "nada falta receber de ‹cliente›", sem "mais" e sem "neste caso".
- **Detalhe**, sempre terminando com "Confira o acerto e encerre." enquanto o período está aberto:
  - `PAGAMENTO`: "Diego Almeida registrou a última parcela. As 7 parcelas de Noemi Bastos Carvalho e Cláudio Carvalho foram pagas.";
  - `REEMBOLSO`: "Bianca Torres marcou o último reembolso, e nada falta receber de Regina Souza.";
  - `EXITO`, não cobrado: "Bianca Torres marcou o êxito de Sérgio Gomes como não cobrado. As 4 parcelas já estavam pagas.";
  - `EXITO`, lançado e pago: "Bianca Torres registrou o pagamento do êxito de Sérgio Gomes.";
  - `CONTRATO_ENCERRADO`: "Felipe Matos encerrou o C-2026-016, e as parcelas que faltavam foram canceladas.";
  - `CASO_ENCERRADO`: "Larissa Costa encerrou o caso, e nada falta receber de Rosângela Teixeira.";
  - `OUTRO_CASO` (só se a Carol disser sim à pergunta 3): "Felipe Matos ligou o C-2026-007 ao caso Martins x INSS · aposentadoria, em andamento. As parcelas que faltam seguem com ele, e nada falta receber de Ivone Martins.";
  - `ROTINA`: "Nada falta receber de Paulo Henrique Dias.";
  - `denovo` (o título já diz "de novo"): "Bianca Torres marcou o reembolso da cópia do processo, e a pendência que tinha voltado foi resolvida."
- Para isso, `dados` precisa do que a frase cita: `quem`, `clientes` e `maisClientes`, `parcelas`, `contrato`, `outroCaso` e `contratoSegue`, e, no êxito, se foi não cobrado ou pago (`exito`: `NAO_COBRADO` ou `PAGO`); no reembolso, a descrição da conta (`reembolso`), quando houver.

### 3.3 Para onde o clique leva

- `ROTAS_FINANCEIRO.contrato(contratoId) + '#t-fecha-' + casoId` (o `linkContrato` de `fechamento.ts`). A folha já foca o título pelo hash e já mostra o âmbar "Encerrar o caso no financeiro".
- **Qual contrato (EX-01):** a regra da decisão 4 sem o cliente, a de `caso_resumo_acerto`. Sem pendência, fica o contrato ligado, ativo ou encerrado, de menor número. O número dele vai no destino escrito, para a pessoa saber antes do clique qual contrato abre; a folha desse contrato mostra o fechamento do caso inteiro, com as parcelas de todos os contratos. Um aviso por caso por pessoa, não por contrato.

### 3.4 O estado de agora

O aviso não muda nem se apaga (guardião de 0390). `aviso_sino_linha` ganha, só para este tipo, o campo `agora`, lido **do período do próprio aviso** (`dados ->> 'periodoId'`), de `fechamentos_caso` pelo `caso_id` (único) e do período mais novo do mesmo caso pelo índice `(caso_id, pronto_em desc)`. São buscas por índice; o `agora` **nunca** chama `caso_acerto`. A ordem de leitura é esta, e vale a primeira que bater:

1. `{ "encerrado": { "em", "por" } }`: há fechamento. Selo neutro "Encerrado". Linha "**Agora:** Marina Ribeiro encerrou no financeiro hoje, às 10h05." Destino "Ver o fechamento no ‹contrato›".
2. `{ "depois": true }`: existe um período **mais novo** do mesmo caso que o do aviso. Selo neutro "Aviso antigo". Linha "**Agora:** o caso ficou pronto de novo; veja o aviso mais novo." Destino "Ver o acerto no ‹contrato›". Vem antes de `pendente`, para o aviso antigo não mandar procurar uma pendência que já foi resolvida.
3. `{ "pendente": true }`: o período do aviso fechou com `PENDENCIA`. Selo de atenção "Voltou a ter pendência". Linha "**Agora:** depois deste aviso, o acerto voltou a ter pendência." Destino "Ver o acerto no ‹contrato›".
4. `{ "fora": true }`: o período fechou com `FORA`. Selo neutro "Fecha no repasse". Linha "**Agora:** entrou RPV ou alvará neste caso, e o fechamento passou para a ficha do repasse." Destino "Ver o fechamento no ‹contrato›", com as palavras da folha aprovada `contrato-com-levantamento`.
5. Período ainda aberto e sem período mais novo: sem `agora`, o aviso fica como nasceu, com o selo "Pronto".

Com `agora`, "Confira o acerto e encerre." sai do detalhe, porque deixou de valer; o resto do que o aviso contou continua escrito. A linha "Agora:" é a segunda linha do detalhe, com "Agora:" em vinho e negrito.

O aviso não é marcado como lido sozinho: lido quer dizer que a pessoa abriu (pergunta 4). No `sp-encerrado`, ele segue "Novo" para quem ainda não abriu.

## 4. Casos antigos

- A migration não manda aviso. A primeira rotina das 7h (ou o primeiro gatilho) avisa os casos já prontos, **só os encerrados no próprio T3jus**: o importado encerrado nunca entra (regra 1).
- Hoje não há escritório em produção nem caso encerrado no banco (segundo a thread do F3.132; a revisão não abriu o banco para conferir). Por isso não há pergunta à Carol sobre isso.

## 5. API e telas

### 5.1 API (api-portal)

- **Nenhuma rota nova.** O tipo e o campo `agora` chegam pelo `portal_avisos`.
- `packages/domain/src/avisos.ts`: `TipoAvisoSino` ganha `"CASO_PRONTO_FECHAR"`; `AvisoSino.dados` ganha `clientes`, `maisClientes`, `contratoId`, `parcelas`, `motivo`, `outroCaso`, `contratoSegue`, `denovo`, `periodoId`, `exito` e `reembolso`; `AvisoSino` ganha `agora?` (`encerrado`, `depois`, `pendente` ou `fora`).
- Deno (`app_test.ts`): a rota repassa `agora` sem mexer.

### 5.2 Tela

- `Sino.tsx`: `descreverAviso` ganha o `case "CASO_PRONTO_FECHAR"`, com o título e as frases de 3.2. Além de ícone, título, detalhe, destino, link e selo, ele passa a devolver:
  - `agora`: a linha "Agora: …" de 3.4 (ou nada), e o selo e o destino trocados por ela;
  - `paraLeitor`: o trecho só para leitor de tela que entra **dentro do link**, depois do título, quando há `agora` (". Agora: encerrado.", ". Agora: voltou a ter pendência.", ". Agora: aviso antigo, há um mais novo." e ". Agora: fecha no repasse."). Sem isso, quem navega pelos links ouve só o título, e o selo é a informação principal depois que o caso muda (WCAG 2.4.4).
- O item usa o mesmo HTML e CSS do sino aprovado; a linha "Agora:" é a única peça nova.
- Ficha do contrato: o caso importado encerrado deixa de mostrar a folha "Fechamento do caso" (correção da seção 6.1). É tirar uma folha que a regra aprovada da 0920 já excluía; não há desenho novo.
- Não mudam: a moldura, o painel do sino, os filtros, o vazio, o erro, a folha de destino e a recusa de área.

### 5.3 Estados para a especialista de frontend

Só o que muda de fato na tela: o item novo do sino. Cada estado em celular e computador, seguindo `docs/IDENTIDADE.md`, `docs/design/conceito-gabinete.md` e o sino aprovado (`portal-sem-avisos-sino/sino.html`):

1. `sp-novo`: Diego abre o sino; o aviso novo (motivo `PAGAMENTO`), no meio de avisos de outros tipos.
2. `sp-motivos`: os avisos lado a lado com as frases de `REEMBOLSO`, `EXITO`, `CONTRATO_ENCERRADO` e `CASO_ENCERRADO`.
3. `sp-outro-caso`: as parcelas seguem com outro caso (se a Carol escolher avisar, pergunta 3).
4. `sp-varios`: dois clientes e dois contratos.
5. `sp-denovo`: ficou pronto de novo.
6. `sp-lido`: o aviso já lido.
7. `sp-encerrado`: depois do encerramento no financeiro.
8. `sp-pendente`: voltou a ter pendência.
9. `sp-fora`: o caso ganhou levantamento.

## 6. Migration, testes e painel

### 6.1 Migration

`sistema/supabase/migrations/0990_sino_caso_pronto_fechar.sql` (a faixa 0990-0999 é a reservada; conferir no `main` e nas branches abertas no dia do commit). Conteúdo:

1. o tipo novo no check do sino (padrão de 0854);
2. a tabela `casos_prontos_fechar`, os índices, o guardião, `proteger_tabela_escritorio` e o `inventario_dados`;
3. `caso_pronto_fechar` e `caso_pronto_conferir`;
4. os gatilhos de restrição adiados da seção 1.3;
5. a rotina `avisar_casos_prontos_fechar`, a política temporária e o `cron.schedule` condicional;
6. `aviso_sino_linha` com `agora`;
7. a correção da folha: `portal_financeiro_contrato_fechamentos` (0901) e o laço de 0851 passam a filtrar `coalesce(encerrado_por, 'RESULTADO') = 'RESULTADO'`, citando o F3.132, para o destino do clique e a regra do aviso não divergirem da folha;
8. `call fechar_acesso()` no fim.

### 6.2 Testes

- **pgTAP** `sistema/supabase/tests/pgtap/131_sino_caso_pronto_fechar_test.sql` (o último é o 130; a pasta já tem números repetidos de threads paralelas, então conferir com `git ls-tree` do `main` e das branches abertas logo antes do commit). Como a transação do pgTAP nunca faz commit, cada passo chama `set constraints all immediate` antes de conferir o sino. Casos:
  - o último pagamento que zera o acerto avisa quem tem Financeiro e `financeiro.editar`, e não o autor, nem quem não tem a área, nem o sócio não dono sem a área;
  - a parcela a vencer aberta não avisa; o dia passar sem pagamento não avisa; o pagamento dela avisa;
  - o acordo com êxito encerrado no Jurídico, com as parcelas pagas: não avisa no encerramento; avisa quando o êxito é conferido (lançado e pago, ou não cobrado);
  - o caso encerrado no Jurídico já sem pendência avisa no fim da transação, e o autor com Financeiro também recebe;
  - o caso com levantamento, o de importação desfeita, o `IMPORTADO_ENCERRADO` com contrato e nada pendente (nem pelo gatilho nem pela rotina) e o caso sem contrato não avisam;
  - dois casos no mesmo contrato: o caso A fica pronto quando o caso B é aberto e ligado; deixa de estar pronto quando o B encerra;
  - caso pronto que ganha levantamento: o período fecha com `FORA`, e o `agora` diz "fora";
  - `contrato_cancelar_futuros` com 10 parcelas: um aviso só, e `caso_acerto` chamado uma vez (contado por `pg_stat_user_functions`);
  - um aviso por caso e pessoa com a rotina rodando duas vezes;
  - voltou a ter pendência fecha com `PENDENCIA`; pronto de novo avisa com `denovo`. Regra das 24 horas dos dois lados, com `ajustar_relogio`: aviso não lido de 23 h segura; lido, ou não lido de 25 h, não segura;
  - encerrar no financeiro fecha com `ENCERRADO`, e `portal_avisos` traz `agora.encerrado`; o `agora` é do período do aviso, não do caso;
  - o contrato do link é o de menor número; `dados` não tem valor em reais; cada `motivo` sai no caminho certo;
  - a conferência com o contexto de outro escritório não abre período nem avisa; o escritório B não vê nada do A; a tabela recusa acesso direto;
  - a rotina com um escritório em `CONSULTA`: os outros recebem os avisos;
  - um erro forçado na gravação do aviso não desfaz o pagamento;
  - `portal_avisos` com 200 avisos do tipo novo não chama `caso_acerto` (plano da consulta);
  - o guardião recusa apagar e mudar o período fechado;
  - o `depois`: com um segundo período aberto do mesmo caso, o aviso do primeiro período traz `agora.depois` (e não `pendente`), e o aviso do segundo não traz `agora`; com o caso encerrado, os dois trazem `encerrado`;
  - a folha da ficha do contrato não traz o caso `IMPORTADO_ENCERRADO`.
- **Concorrência**, em `sistema/supabase/tests/concorrencia/` (como `edicao-simultanea.sh`): duas conexões registram as duas últimas parcelas do mesmo caso ao mesmo tempo; sai exatamente um aviso por pessoa, na hora.
- **Vitest** `packages/ui/src/portal/sino.test.ts` (novo): `descreverAviso` com o título no passado (e "de novo" no título), uma frase por `motivo` (com o êxito não cobrado e o pago), o molde "nada falta receber de ‹cliente›", um, dois e três clientes, o destino com o número do contrato, o link `…/contratos/<id>#t-fecha-<caso>`, e os quatro estados de agora (`encerrado`, `depois`, `pendente`, `fora`), cada um com o selo, a linha "Agora:", o destino, a saída de "Confira o acerto e encerre." e o nome acessível do link (título mais o trecho `paraLeitor`).
- **e2e Playwright** `sistema/tests/e2e/portal-sino-caso-pronto.spec.ts`, celular e computador, com axe: Marina registra a última parcela; Diego vê o aviso, abre, chega na folha focada e encerra; o aviso aparece como "Encerrado"; Marina não recebeu aviso.

### 6.3 Painel e README

- `F3.147.json`: `status` `feito`, `evidencia` com a migration, os testes e o PR, sem `proximo`. `refs` continua EX-16 e EX-17.
- Linha nova do histórico com `python3 docs/painel/painel.py novo-historico` (`--refs F3.147 EX-16 EX-17`), e `python3 docs/painel/painel.py conferir` antes do commit.
- `sistema/README.md`: na seção do F3.132, a linha "Falta" vira a descrição do aviso (0990) e da correção da folha; na linha do sino, o tipo novo e a rotina; e a **lista fechada das tabelas que entram no `caso_acerto`**, com a regra "tabela ou coluna nova no acerto ganha o gatilho adiado". Cita o F3.139 (FI-24, baixa sem receber), que vai mudar o acerto: quem entregar por último acrescenta o gatilho.
- O desenho aprovado vai para `docs/design/aprovadas/portal-sino-caso-pronto`.

### 6.4 Item pendente proposto: o aviso de quando o caso fecha

A decisão 16 aprovada da jornada prometia "recebe o aviso quando fechar", e o `PLANO-CODIGO.md` do F3.132 previa um item para isso. O F3.147 é outro aviso, e hoje nenhum item do painel guarda essa promessa. Proposta, para criar no mesmo commit desta entrega (não criado agora):

- arquivo `docs/painel/dados/fases/F3/F3.150.json` (conferir no `main` e nas branches abertas o próximo id livre antes de gravar);
- `texto`: "Aviso no sino quando o caso fecha no financeiro, para quem encerra os contratos ligados e para a responsável do caso (decisão 16 da jornada)";
- `peca` S4, `refs` EX-16 e EX-17, `status` `pendente`, `ordem` logo depois de 1065;
- `proximo`: "Desenhar e programar o aviso de caso encerrado no financeiro; reusa o tipo de origem `casos` e o gatilho em `fechamentos_caso` do F3.147".

## 7. Perguntas para a Carol

1. **Quem recebe o aviso: todos com o Financeiro, ou só quem cuida do contrato? E, quando alguém encerra o caso no Jurídico e ele já está pronto, essa pessoa também recebe?** Recomendo todos com o Financeiro (menos quem fez a ação no Financeiro) e, no encerramento pelo Jurídico, que a pessoa também receba, se tiver o Financeiro.
2. **Quer também um lembrete no dia em que vence a última parcela?** Recomendo que não: a parcela a vencer segura até ser paga, e a vencida sem pagamento já entra na cobrança.
3. **Quando as parcelas do contrato ficam com outro caso em andamento, o caso encerrado fica pronto sem receber nada. O aviso sai, dizendo "As parcelas do C-… seguem com o caso …", ou espera o último caso do contrato?** Recomendo avisar com a frase, como já decidido na pergunta 3 do F3.132.
4. **Quando alguém encerra o caso no financeiro, o aviso dos outros fica como lido?** Recomendo que não: ele mostra "Encerrado, por quem e quando", e lido quer dizer que a pessoa abriu.
5. **O aviso de quando o caso fecha (item proposto na seção 6.4) vem logo depois deste ou mais tarde?** Recomendo logo depois: reusa o mesmo gatilho e a mesma origem.

O caso com levantamento fica fora deste aviso (é o escopo do item: ele já aparece em Repasses, com quem cuida e os avisos de atraso), e os casos antigos seguem a seção 4, sem pergunta.

## 8. Riscos

- **Gatilho esquecido:** a lista fechada no README, a regra de "tabela nova ganha gatilho" e a rotina diária como rede.
- **Erro no gatilho adiado derrubar o pagamento:** o bloco de exceção na gravação e o teste com erro forçado.
- **Contexto errado no commit lendo "nada pendente":** a saída sem gravar quando o contexto não é o do caso, e o teste.
- **Custo da rotina** com casos pendentes para sempre até o F3.139: o número escrito na seção 1.3 e a troca para "só casos com mudança" se crescer.
- **Custo do sino:** o `agora` faz duas buscas por índice, nunca `caso_acerto`, com teste.
- **Aviso que pisca:** a regra das 24 horas e o lote numa conferência só por transação.
- **Regra de "pronto" divergir do botão ou da folha:** a mesma `pendencias` do encerrar e a correção da folha para o importado encerrado. Se a decisão (a) do F3.132 mudar, o aviso muda junto.
- **Barulho para a sócia dona**, que tem todas as áreas: a pergunta 1 resolve.
- **pg_cron ausente** em teste: `cron.schedule` condicional, e o pgTAP chama a rotina direto.
- **Numeração em threads paralelas:** conferir migration, pgTAP e id do item no dia do commit.

## Ajustes não aceitos

- **15. Citar PD-07 nos `refs`.** Não aceito. A PD-07 ("responsável e próxima ação de cada item; cada alerta leva ao registro que o explica") é maior que este aviso: ela pede responsável e próxima ação em todos os itens do produto. Citá-la aqui seria dar como atendida uma ideia que esta entrega atende só em parte, e o `CLAUDE.md` exige, nesse caso, um item pendente com o resto, que não cabe num aviso de fechamento. O aviso segue o padrão do sino da 0390, que já trata da PD-07. Os `refs` ficam EX-16 e EX-17, como o item está.
- **Ajuste 10, parte "crie o item nesta entrega, sem esperar a resposta".** Aceito no conteúdo, com uma diferença na forma: o item fica proposto aqui (seção 6.4) e é criado no commit da entrega, não agora, por instrução da coordenação. A pergunta 5 é só sobre a prioridade, como a revisão pede.
- **Ajuste 2, "achado ao lado", opção de item pendente separado.** A revisão dá duas saídas; escolhi corrigir na mesma migration (seção 6.1, item 7), porque o destino do clique do aviso é essa folha, e deixar a folha mostrando o botão para o caso que o aviso exclui seria a divergência que o próprio plano quer evitar.
