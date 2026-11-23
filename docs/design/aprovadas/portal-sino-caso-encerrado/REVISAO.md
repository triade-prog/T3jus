# Revisão do plano · aviso no sino quando o caso sem levantamento fica pronto para encerrar (F3.147)

Revisão feita em 23/11/2026, antes do desenho e de qualquer código. Conferi o `PLANO.md` desta pasta contra o `CLAUDE.md`, o `docs/CONTEXTO.md`, o `sistema/README.md` (seções do F3.132 e do sino), o `IDEIAS.md`, o `docs/painel/LEIA-ME.md`, o item `F3.147.json`, a pasta do F3.132 (`PLANO.md`, `REVISAO.md`, `PLANO-CODIGO.md`, `REVISAO-CODIGO.md`, `NOTAS.md`) e o código: migrations 0002, 0140, 0200, 0210, 0220, 0280, 0390, 0512, 0534, 0540, 0550, 0551, 0553, 0600, 0640, 0810, 0851, 0852, 0854, 0900, 0901 e 0920; os testes em `sistema/supabase/tests` (pgTAP 130 e a pasta `concorrencia`); `Sino.tsx`, `Financeiro.tsx`, `FechamentoCaso.tsx`, `fechamento.ts`, `fichaLigada.ts`, `packages/domain/src/avisos.ts` e a rota `GET /v1/escritorio/avisos` (`api-portal/app.ts:743`). Os números de migration e de pgTAP foram conferidos no `main` e nas 74 branches remotas. Não consegui conferir a afirmação "o banco hoje tem 1 caso e nenhum encerrado": não abri o banco.

## Veredito: aprovar com ajustes

A leitura do item está certa, e a arquitetura geral é boa: a regra de "pronto" sai de `caso_acerto -> 'pendencias'`, a mesma do botão; há uma tabela de períodos para não repetir o aviso; o aviso não leva valor; o clique cai na folha que já existe. Mas o plano tem três problemas que, sem ajuste, fazem o sino mentir:

- os gatilhos imediatos (`after ... for each row`) avaliam o caso **no meio da transação**, e há caminho de hoje em que o caso parece pronto por um instante e não está (ajuste 1);
- a regra 1 deixa entrar o caso importado já encerrado, que a 0920 tirou do fechamento, e a rotina das 7h avisaria cada um deles (ajuste 2);
- o filtro barato antes de `caso_pronto_conferir` impede que o período aberto se feche quando o caso sai do escopo (ajuste 4).

Os outros ajustes são de robustez, de texto e de painel. Nada pede refazer o plano.

## Ajustes obrigatórios

1. **Gatilho imediato vê o caso pela metade: troque por gatilho de restrição adiado, avaliado uma vez por caso no fim da transação.**
   - **Trecho:** seção 1.3 ("Gatilhos (row-level, `after`...)") e seção 8 ("Corrida entre dois pagamentos").
   - **Problema:** o aviso não pode mudar com a ordem dos comandos dentro de cada função, mas hoje ele mudaria:
     - Ao encerrar o caso com ganho ou acordo, `portal_juridico_caso_etapa` primeiro chama `juridico_caso_etapa_sem_exito`, que muda `casos.situacao` (`0640_exito_conferir.sql:179`), e **só depois** insere os êxitos para conferir (`0640:208`). Um gatilho `after update` em `casos` roda entre os dois. Com as parcelas pagas (ou contrato só de êxito), ele vê `pendencias` vazia e manda "Nada falta receber neste caso", e um instante depois o êxito entra. O plano também não põe gatilho no **insert** de `exitos_conferir` (só no update de `situacao`), então o período ficaria aberto com um aviso falso. É exatamente o caso B do F3.132 (acordo pago direto com êxito).
     - Em `portal_financeiro_exito_lancar` a ordem hoje é a boa (insere a parcela em `0640:312` e só depois muda o êxito em `0640:316`), mas por sorte: inverter as duas linhas num ajuste futuro faria o aviso nascer errado sem nenhum teste quebrar.
     - `contrato_cancelar_futuros` cancela todas as parcelas futuras num `update` só (`0200_portal_contratos.sql:190-193`), e a importação insere parcelas e pagamentos em lote: o gatilho por linha roda `caso_acerto` uma vez para cada parcela.
     - O `pg_advisory_xact_lock` tomado no meio da transação fica preso até o commit. No registro de recebimento, o lock do recibo vem **depois** do insert do pagamento (`0220_portal_financeiro_receber.sql:325-331`): com o lock do caso no meio, abre-se uma ordem de locks nova que pode travar com outros caminhos que tocam dois casos.
   - **Correção:** use o padrão que o banco já tem em `destinacoes_fecham` (`0280_portal_financeiro_repasses.sql:82-83`): `create constraint trigger ... after insert or update of ... deferrable initially deferred for each row`. A função do gatilho só junta o `caso_id` (de `NEW` e de `OLD`, quando muda) e chama `caso_pronto_conferir` uma vez por caso por transação (guarde os casos já conferidos numa configuração local da transação, `set_config('t3jus.casos_conferidos', ..., true)`). No fim da transação, tudo já foi gravado, na ordem que for. O lock por caso passa a ser tomado no commit, por pouco tempo. Duas consequências que o plano precisa escrever:
     - o pgTAP roda numa transação que nunca faz commit, então cada passo do teste precisa de `set constraints all immediate` antes de conferir o sino (nenhum teste de hoje usa isso; `grep "set constraints"` em `tests/` não acha nada);
     - um erro no gatilho adiado derruba o commit do pagamento. O aviso não pode impedir o recebimento: a parte que grava (período e avisos) fica num bloco `begin ... exception when others` que registra a falha (`registrar_historico` ou uma linha de log) e deixa o pagamento seguir; a rotina diária (ajuste 7) refaz no dia seguinte.

2. **A regra 1 deixa entrar o caso importado já encerrado.**
   - **Trecho:** seção 1.1, item 1 ("`encerrado_por` diferente de `IMPORTACAO_DESFEITA`").
   - **Problema:** a 0920 criou `encerrado_por = 'IMPORTADO_ENCERRADO'` para os processos arquivados que vêm do Astrea ou do ADVBOX (`0920_importar_sobras.sql:4-10` e `:36-39`) e trocou a regra do fechamento e do resumo do acerto para `coalesce(encerrado_por, 'RESULTADO') = 'RESULTADO'` (`0920:70-77`). Esses casos entram por **insert** já encerrados (`0920:741-747`), sem passar pelo gatilho de update de `casos`. Com a regra do plano, a primeira rotina das 7h depois de uma importação avisaria o Financeiro de cada processo arquivado que tenha contrato ligado: dezenas de avisos de uma vez. A pergunta 3 à Carol ("os casos que já estiverem prontos ganham o aviso?") fica com resposta errada por causa disso.
   - **Correção:** a regra 1 passa a ser `situacao = 'ENCERRADO' and coalesce(encerrado_por, 'RESULTADO') = 'RESULTADO'`, igual à do `caso_resumo_acerto` depois da 0920. Um teste pgTAP com um caso `IMPORTADO_ENCERRADO` com contrato ligado e nada pendente, que não avisa nem pela rotina.
   - **Achado ao lado, fora do escopo:** `portal_financeiro_contrato_fechamentos` ainda filtra só `IMPORTACAO_DESFEITA` (`0901_fechamento_ficha_contrato.sql:83`), e o `cliente_fechamento` é chamado por um laço que também filtra assim (`0851_jornada_fechamento_passo.sql:166-168`, trocado pela 0920 só em `cliente_passo_sem_docs`). Ou seja, a ficha do contrato mostra a folha "Fechamento do caso" com o botão de encerrar para o caso importado encerrado, o que contradiz a 0920. Vale um item pendente (ou a correção na mesma migration, citando o F3.132), para o destino do clique e a regra do aviso não divergirem da folha.

3. **Faltam gatilhos e o "leque" para os outros casos do mesmo contrato.**
   - **Trecho:** seção 1.3, lista de tabelas, e a frase "a parcela que sai da conta do caso porque outro caso do mesmo contrato encerrou".
   - **Problema:** `caso_acerto_parcelas` deixa de fora as parcelas do contrato que tem **outro** caso em andamento (`0900_fechamento_sem_levantamento.sql:28-33` e `:46`). Então o estado de um caso muda por ação em outro caso:
     - quando o outro caso **encerra**, as parcelas **voltam** para este (ele deixa de estar pronto);
     - quando um caso novo em andamento é ligado ao mesmo contrato (insert em `caso_clientes` de **outro** caso), as parcelas **saem** deste (ele pode ficar pronto).
     O plano descreve o primeiro ao contrário e deixa os dois para a rotina, com até um dia de atraso. Faltam também:
     - o **insert** em `exitos_conferir` (ajuste 1);
     - o insert em `levantamentos` do caso (ajuste 4);
     - o update de `contratos.estado` não é necessário (a ativação insere as parcelas, o encerramento as cancela; os dois já estão cobertos), e o plano pode dizer isso para ninguém acrescentar depois.
   - **Correção:** o gatilho em `casos` (update de `situacao`) e o de `caso_clientes` (insert, update de `contrato_id`, delete) conferem o próprio caso **e** os casos encerrados sem fechamento que dividem algum contrato com ele (`caso_clientes` por `contrato_id`, que já tem índice: `0240_portal_juridico_casos.sql:99`). Acrescente `exitos_conferir` (insert) e `levantamentos` (insert). Escreva no README a lista fechada das tabelas que entram no `caso_acerto` e a regra "tabela nova no acerto ganha o gatilho", e cite o F3.139 (FI-24, baixa sem receber), que vai mudar o acerto: quem entregar por último acrescenta o gatilho da coluna nova.

4. **O filtro barato não pode impedir que o período aberto se feche.**
   - **Trecho:** seção 1.3 ("depois de filtrar barato (caso encerrado, sem fechamento, sem levantamento)") e seção 1.4 (as quatro saídas de `caso_pronto_conferir`).
   - **Problema:** se o caso tem período aberto e depois ganha um levantamento (a RPV que chega depois do encerramento é comum), ou passa a `IMPORTACAO_DESFEITA`, o filtro o descarta antes da conferência, e o período fica aberto para sempre. O `agora` do aviso continua dizendo "pronto" para um caso que agora fecha pela ficha do repasse.
   - **Correção:** o filtro barato só pula quando o caso **não** tem período aberto. Com período aberto, `caso_pronto_conferir` sempre roda e fecha o período com `PENDENCIA` (ou com um terceiro valor, `FORA`, para "saiu do escopo": levantamento, importação desfeita), sem aviso. Teste: caso pronto, entra levantamento, período fecha.

5. **Conferir sem o contexto certo do escritório lê "nada pendente".**
   - **Trecho:** seção 1.3 (gatilhos "rodam com o contexto de quem fez a ação") e seção 2 ("Escritório").
   - **Problema:** todas as tabelas do acerto têm RLS forçado com `escritorio_id = contexto_escritorio()` (`0002_acesso.sql:111-116`, e na versão atual `0550_funil_sem_proposta.sql:34-39`). Com o contexto vazio ou de outro escritório, `caso_acerto` não dá erro: devolve `pendencias` vazia. Num gatilho adiado isso é real: a rotina `lembrar_repasses` termina com `limpar_contexto()` (`0553_repasse_atraso.sql:193`), e qualquer rotina que percorra escritórios numa transação só deixa o contexto do último no commit.
   - **Correção:** `caso_pronto_conferir` começa com `if contexto_escritorio() is distinct from p_escritorio then return; end if;` e confere que enxerga o caso (`select ... from casos where id = p_caso and escritorio_id = p_escritorio`). O `p_escritorio` vem de `NEW.escritorio_id`, nunca do navegador. Teste pgTAP: a conferência chamada com o contexto de outro escritório não abre período nem avisa.

6. **Quem recebe: a frase sobre o sócio está errada, e falta a permissão de encerrar.**
   - **Trecho:** seção 2, primeiro item ("A sócia dona entra, porque `areas_da_pessoa` dá todas as áreas ao sócio").
   - **Problema:**
     - `areas_da_pessoa` dá todas as áreas só ao **sócio dono** (`e_socio_dono`); o sócio que não é dono só tem áreas por `areas_liberadas` de um vínculo `EQUIPE` (`0140_portal_equipe.sql:86-95`). Um sócio com vínculo `SOCIO` e sem ser dono não recebe nada. Pode ser o certo, mas o texto precisa dizer o que acontece.
     - O aviso pede uma ação ("Confira o acerto e encerre"), e encerrar exige `financeiro.editar` (`0512_caso_fechamento_financeiro.sql:106`). As notas do F3.132 dizem que hoje ninguém tem Financeiro sem `financeiro.editar`, mas isso é configuração, não regra.
     - Excluir o autor faz sentido quando a ação foi no Financeiro (ele está vendo o âmbar). Quando é a sócia dona que encerra o caso **no Jurídico** e o caso já está sem nada pendente, ela não viu a folha do Financeiro e fica sem aviso.
   - **Correção:** escreva a regra como "vínculo `SOCIO` ou `EQUIPE` ativo, área Financeiro e `pode(..., 'financeiro.editar')`". Exclua o autor só quando a ação que deixou o caso pronto foi de Financeiro (pagamento, reembolso, êxito, contrato encerrado pela cadeia); quando foi o encerramento do caso no Jurídico, o autor também recebe se tiver Financeiro. Leve esse último ponto à Carol junto com a pergunta 1.

7. **A rotina diária: mesma regra, sem abortar por um escritório e com custo dito.**
   - **Trecho:** seção 1.3 ("Rotina diária") e seção 4.
   - **Problema:**
     - `lembrar_repasses` não pula o escritório em fase só de consulta. Na nova tabela e em `avisos_sino`, o gatilho `contrato_aceita_escrita` (`0210_fim_contrato.sql:321-324`, posto em toda tabela por `proteger_tabela_escritorio`, `0550_funil_sem_proposta.sql:48-49`) levanta `TC401` no escritório com contrato `CONSULTA` ou `FECHADO`, e a rotina inteira para, sem avisar nenhum outro escritório. `lancar_recorrentes` já faz o certo (`0534_recorrencia_mudancas.sql:110`).
     - A rotina roda `caso_acerto` para todo caso encerrado sem fechamento, todo dia. Enquanto o F3.139 (baixa sem receber) não existe, o caso perdido com cliente que não paga fica pendente para sempre, e esse conjunto só cresce.
     - Com o ajuste 1 a corrida entre dois pagamentos deixa de depender da rotina (veja "O que está bom", item 5). Ela vira só rede de segurança para gatilho esquecido.
   - **Correção:** a rotina usa `caso_pronto_conferir` com a mesma regra (ajuste 2), pula o escritório cujo `contrato_situacao` não é `ABERTO` nem `MARCADO`, e põe cada escritório num bloco `begin ... exception` para um erro não parar os outros. Escreva no plano o custo esperado (número de casos encerrados sem fechamento por escritório) e que, se crescer, a rotina passa a olhar só os casos com alguma mudança nas tabelas do acerto desde a última execução.

8. **O texto do aviso precisa saber o que deixou o caso pronto.**
   - **Trecho:** seções 3.1 e 3.2 ("Marina Ribeiro registrou a última parcela." e "As 6 parcelas ... foram pagas").
   - **Problema:** o caso fica pronto por pagamento, por reembolso marcado, por êxito não cobrado, pelo encerramento do contrato (parcelas futuras canceladas, `0200:547`), pelo encerramento do caso no Jurídico ou por um caso novo que levou as parcelas do contrato (ajuste 3). Com só `quem` nos dados, a tela diz "registrou a última parcela" para todos. E, quando as parcelas ficaram com outro caso, `parcelas.total` é 0 e o texto vira "Nada falta receber neste caso", com o contrato ainda cobrando.
   - **Correção:** `dados` ganha `motivo` (`PAGAMENTO`, `REEMBOLSO`, `EXITO`, `CONTRATO_ENCERRADO`, `CASO_ENCERRADO`, `OUTRO_CASO`, `ROTINA`), guardado pelo gatilho na configuração local da transação, e `periodoId` (o período de `casos_prontos_fechar` que o aviso abriu, para o `agora` do ajuste 9). Quando as parcelas seguem com outro caso, o detalhe diz "As parcelas do C-… seguem com o caso …". A especialista de frontend desenha uma frase por motivo.

9. **O `agora` precisa ser do período do próprio aviso, e barato.**
   - **Trecho:** seção 3.4.
   - **Problema:** "pendente quando o período fechou com `PENDENCIA` e não abriu outro" olha o caso, não o aviso. Um aviso do primeiro período, lido, mostraria "pronto" depois de um segundo período aberto e fechado. O custo é baixo só se o `agora` fizer duas buscas por índice; se alguém chamar `caso_acerto` ali, o sino (conferido de novo a cada 15 s, `Sino.tsx:226` e `:253`, até 200 avisos por pessoa, `0390_portal_sino_avisos.sql:143`) fica caro.
   - **Correção:** o `agora` lê o período do aviso (`dados ->> 'periodoId'`) e `fechamentos_caso` pelo `caso_id` (único). Índice novo em `casos_prontos_fechar (caso_id, pronto_em desc)`. Escreva no plano que o `agora` nunca chama `caso_acerto`. Um teste pgTAP que confere o plano da consulta (ou o tempo) de `portal_avisos` com 200 avisos do tipo novo.

10. **O aviso de quando o caso fecha não pode depender da Carol para virar item.**
    - **Trecho:** seção 6.3 (último item) e pergunta 5.
    - **Problema:** o `PLANO-CODIGO.md` do F3.132 (linhas 845-848) previa um item pendente para "o aviso no sino quando o caso fecha", prometido na decisão 16 aprovada da jornada. O item que nasceu, o F3.147, é outro aviso ("pronto para encerrar", para o Financeiro). Hoje nenhum item do painel guarda aquela promessa (`grep` em `docs/painel/dados/fases` não acha). Pelo `CLAUDE.md`, o que falta de uma ideia citada fica num item pendente.
    - **Correção:** crie o item pendente nesta entrega, sem esperar a resposta, citando EX-16 e EX-17. A pergunta 5 passa a ser só sobre a prioridade. O número F3.150 pode estar tomado por outra thread no dia do commit: confira o próximo livre no `main` e nas branches abertas antes de gravar.

11. **Numeração: confirme no dia do commit.**
    - **Trecho:** seções 6.1 e 6.2.
    - **Problema:** hoje 0990 e o pgTAP 131 estão livres no `main` e nas 74 branches remotas. Mas a pasta já tem números repetidos de threads paralelas (`125_acesso_portal_sessao_test.sql` e `125_ponte_auth_test.sql`; `126_emprestimos_test.sql` e `126_termo_curatela_test.sql`).
    - **Correção:** use a faixa 0990-0999 como reservada (0990 serve). Para o pgTAP, confira `git ls-tree` do `main` e das branches abertas logo antes do commit e use o próximo livre; escreva isso no plano.

## Ajustes menores

12. **`inventario_dados` com `dado_pessoal = true`.** A tabela liga o caso de um cliente a datas da vida financeira dele; `fechamentos_caso`, que guarda o mesmo tipo de dado, está como `true` (`0512:22-25`). Use `true`, com a mesma base legal.
13. **`on conflict` com índice parcial.** O `insert ... on conflict do nothing` só usa o índice único parcial se repetir o predicado: `on conflict (caso_id) where saiu_em is null do nothing`. Escreva assim no plano para não virar `on conflict do nothing` genérico.
14. **A regra das 24 horas precisa de teste dos dois lados:** quem tem aviso não lido de 23 h não recebe outro; quem tem aviso lido, ou não lido de 25 h, recebe. Use `ajustar_relogio`, como o pgTAP 130.
15. **`refs` do item.** O aviso no sino que "leva ao registro que o explica" é a PD-07 (`IDEIAS.md:19`, citada na 0390). Avalie citar PD-07 junto de EX-16 e EX-17.
16. **Pergunta 3 fica quase vazia** depois do ajuste 2: o caso importado nunca avisa, e não há escritório em produção. Mantenha, mas diga que vale só para caso encerrado no próprio T3jus antes da publicação.

## Testes que faltam

- O acordo com êxito encerrado no Jurídico, com as parcelas pagas: **não** avisa no encerramento; avisa só quando o êxito é conferido e pago, ou não cobrado (ajuste 1).
- O caso `IMPORTADO_ENCERRADO` com contrato ligado não avisa, nem pelo gatilho nem pela rotina (ajuste 2).
- Dois casos no mesmo contrato: o caso A encerrado fica pronto quando o caso B é aberto e ligado ao contrato; deixa de estar pronto quando o caso B encerra (ajuste 3).
- Caso pronto que ganha levantamento: o período fecha (ajuste 4).
- Conferência com contexto de outro escritório não grava nada (ajuste 5).
- Pessoa com Financeiro sem `financeiro.editar` (se a função existir) e sócio não dono (ajuste 6).
- Rotina com um escritório em `CONSULTA`: os outros escritórios recebem os avisos (ajuste 7).
- `contrato_cancelar_futuros` com 10 parcelas: um aviso só, e `caso_acerto` chamado uma vez (conte por uma tabela temporária ou pelo `pg_stat_user_functions`).
- Um erro forçado na gravação do aviso não desfaz o pagamento (ajuste 1).
- **Concorrência de verdade**, em `sistema/supabase/tests/concorrencia/` (como `edicao-simultanea.sh`): duas conexões registram as duas últimas parcelas do mesmo caso ao mesmo tempo; sai exatamente um aviso por pessoa, na hora, sem esperar a rotina.
- Vitest do `descreverAviso`: além das variações, uma frase por `motivo` (ajuste 8).

## O que está bom

1. **A regra de "pronto" é a do botão.** `portal_financeiro_caso_encerrar` grava o fechamento só com `pendencias` vazia (`0512:113-117`), e o plano usa exatamente `caso_acerto -> 'pendencias'`. As condições a mais (caso encerrado, sem levantamento, com contrato) só restringem: o aviso nunca promete o que o servidor recusa.
2. **A leitura de "a última parcela a vencer chegou" está certa.** Nada em `pendencias` depende da data: a data só muda o campo `acao` e o `aVencer` (`0900:84`, `:99` e `:122`), e a parcela com saldo fica em `pendencias` até ser paga ou cancelada. Pela resposta 1 aprovada (`0900:4-5`), a chegada do dia não deixa o caso pronto; o único momento é o pagamento. A pergunta 2 à Carol (lembrete no dia do vencimento) é a pergunta certa, e a recomendação de não fazer também.
3. **A tabela de períodos é necessária.** Sem ela não há como saber se o caso voltou a ter pendência; e gravar o estado em `casos` seria pior, porque `casos` tem controle de versão e um gatilho que mexesse nela daria conflito de versão a quem edita o caso no Jurídico. O índice único parcial impede a repetição mesmo sem o lock.
4. **PT-02 e escritório.** Sem valor em `dados`, a origem `casos` já existe, o escritório vem do caso no servidor, a tabela passa por `proteger_tabela_escritorio`, e o `aviso_sino` já descarta o autor (`0390:50-58`). A rota só repassa `portal_avisos` (`app.ts:743`), então o `agora` chega sem rota nova.
5. **O lock por caso resolve a corrida, mais do que o plano diz.** Em `read committed`, cada comando de uma função `plpgsql` volátil lê com uma fotografia nova: a segunda transação espera o lock, e quando ele sai a primeira já confirmou, então ela enxerga os dois pagamentos e avisa na hora. O risco da seção 8 ("o aviso pode não sair na hora") não existe se o lock vier antes da leitura e `caso_pronto_conferir` for volátil. Diga isso no plano e cubra com o teste de concorrência.
6. **O destino do clique.** `#t-fecha-<caso>` já foca o título da folha (`Financeiro.tsx:1033-1049`), o link é o mesmo `linkContrato` de `fechamento.ts:129`, e "o contrato de menor número" é a mesma regra de `caso_resumo_acerto` sem pendência (`0900:371-376`). Um aviso por caso, não por contrato, é o certo.
7. **O padrão do check do sino** (ler a lista atual e somar, como `0854:298-305`) não perde tipos de outras threads, e o `cron.schedule` condicional segue as outras rotinas.
8. **Não marcar como lido sozinho** e mostrar "Encerrado, por quem e quando" respeita o guardião do sino (`0390:27-38`) e o sentido de "lido". A pergunta 4 está bem posta.
9. **Os estados para a especialista** cobrem novo, vários clientes, nada a receber, de novo, lido, encerrado, pendente, chegada, sem área, vazio e erro. Com o ajuste 8, acrescente um estado por motivo que muda a frase (pelo menos "contrato encerrado" e "as parcelas seguem com outro caso").

## Perguntas à Carol, revisadas

1. **Quem recebe** (como está), acrescentando: quando a sócia encerra o caso no Jurídico e ele já está pronto, ela também recebe o aviso? Recomendo que sim (ajuste 6).
2. **Lembrete no dia do vencimento da última parcela** (como está).
3. **Casos já prontos na publicação** (como está, com a nota do ajuste 16).
4. **Marcar como lido quando alguém encerra** (como está).
5. **O aviso de quando o caso fecha:** o item pendente nasce nesta entrega (ajuste 10); a pergunta é só se ele vem logo depois deste ou mais tarde.
6. **Caso com levantamento** (como está).
7. **Nova:** quando as parcelas de um contrato ficam com outro caso em andamento, o caso encerrado fica pronto sem receber nada. O aviso deve dizer isso ("As parcelas do C-… seguem com o caso …") ou esperar o último caso do contrato? Recomendo avisar com a frase, que é o que a regra da pergunta 3 do F3.132 já decidiu.
