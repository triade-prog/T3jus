# Êxito baixado na divisão do alvará (F3.174) e "Baixado sem receber" nos Relatórios (F3.173) · plano (v2)

**Aprovado pela Carol em 26/11/2026 às 18h44 (Bahia), com as recomendações das perguntas A1 (não registrar com o êxito baixado: desfazer ou manter e tirar os honorários; renegociada só desfazer), A2 (sim, as custas baixadas junto voltam como reembolso) e F3.192 (sim). Na cópia aprovada, os pendentes propostos viraram F3.191 a F3.193 e os pgTAP 146 e 147, porque F3.178 a F3.190 e o pgTAP 144 foram tomados por outras frentes.**

**Situação.** Esta é a versão 2, de 25/11/2026, sobre o `main` em `a9136be` (branch `claude/project-thread-uovozs`). Ela aplica a `revisao.md` (22 notas, 8 médias). O que fiz com cada nota está na tabela "Revisão aplicada", no fim.

Nada foi programado, nenhuma migration foi aplicada e nada foi publicado. As duas entregas vão em PRs separados, **F3.174 primeiro**. Antes do código, cada uma passa pelo desenho (agente de frontend, `docs/IDENTIDADE.md`, `docs/design/conceito-gabinete.md`) e pelo ok da Carol, como manda o `CLAUDE.md`.

**O que mudou da v1:**
- **O desfazer e o registrar viram uma transação só** (nota 4). O desfazer deixa de abrir outra janela: a escolha fica dentro da própria janela de registrar.
- **O escopo encolheu ao que a decisão 38 pede**, mais o que torna a escolha rastreável (nota 8). A tela da Parte A passa de 13 estados para 6.
- **A pergunta A2 foi reescrita com a consequência**, e a recomendação virou "sim" (nota 2).
- **A renegociada virou subitem da A1** (nota 3).
- **A antiga pergunta B1 (Rendeu) saiu desta frente** e virou um item pendente próprio (nota 7).
- **As linhas erradas e a data no futuro foram corrigidas** (notas 5 e 9).

**De onde vem.** Do plano aprovado da baixa sem receber (`docs/design/aprovadas/portal-baixa-parcela-motivo/PLANO.md`):
- **decisão 34 e nota 11:** um relatório não reescreve um mês passado quando a baixa é desfeita. O número "Baixado sem receber" nos Relatórios ficou pendente, citando IN-04 e IN-07 (seção 7);
- **decisão 38 e nota 13:** com o êxito do cliente baixado sem receber e um alvará chegando depois, a proposta de divisão mostra o êxito baixado, com "Desfazer a baixa antes de dividir";
- **seção 3, item 15:** o recheck depois da trava em `exito_parcelas_abertas`, que a 1010 já faz (`1010_baixa_parcela.sql:942-951`).

Nas referências curtas, `0651:21` quer dizer `sistema/supabase/migrations/0651_exito_pela_divisao_do_alvara.sql`, linha 21. Os `.tsx` e `.ts` ficam em `sistema/packages/`, e as rotas em `sistema/supabase/functions/api-portal/`.

---

# Parte A · F3.174: o êxito baixado na divisão do alvará

## A1. O que acontece hoje

1. **Os honorários saem do percentual do contrato, e não da parcela.** `repasse_proposta` (criada em `0280:244`, refeita em `0511:131-180`) calcula os honorários pelo `EXITO` do contrato (`0511:146-158`). Por isso a linha "Honorários de êxito" aparece mesmo quando a parcela do êxito está baixada.
2. **A 0651 embrulhou a proposta e o registrar.**
   - A proposta ganhou `exito`, lido de `exito_parcelas_abertas` (`0651:35-44`).
   - No registrar, cada parte `HONORARIOS` paga as parcelas do êxito em aberto, com um recebimento de caixa `TERCEIROS` (`0651:47-80`). A chamada do corpo fica no `declare` (`0651:54`).
3. **A parcela baixada some da proposta.** `exito_parcelas_abertas` filtra `cancelado_em is null` (`0651:30`), e a baixa é um cancelamento marcado com `baixa_id` (`1010:80-81`). O resultado:
   - a proposta volta com `exito: []`, e a tela não mostra o "Dá baixa na parcela…" (`FinanceiroRepasses.tsx:521-524`);
   - o registrar não paga nada;
   - os honorários entram no caixa na transferência (`caixa_entradas`, `0650:14-23`);
   - a parcela continua "baixa sem receber", e nada no registro diz que isso foi uma escolha.
4. **A cadeia de nomes do registrar.** O embrulho da 0651 → `financeiro_levantamento_registrar_sem_exito` (o embrulho da 0554, `0554:174-198`, que trata `requisicaoId`) → `financeiro_levantamento_registrar_base` (o corpo da 0280, `0280:331-398`).
   - A 1010 troca trechos em dois desses três níveis: no corpo (`1010:924-926`) e no embrulho da 0651 (`1010:942-951`). Troca também na proposta (`1010:921-923`).
   - Como em produção as funções podem ter entrado em outra ordem, a 1100 acha a função pelo conteúdo, como faz a 1010 em `1010:500-505`.
5. **Quem pode.**
   - O registrar pede `financeiro.editar` (`0280:346`).
   - O desfazer pede a área Financeiro, `financeiro.editar` e `portal_exigir_escrita` (`parcela_baixa_entrar`, `1010:240-249`).
   - Quem registra sempre pode desfazer, a não ser que o Portal esteja só para consulta. Nesse caso, os dois são recusados pelo gatilho da `0690:408-415`.
6. **Uma parcela de êxito por caso e cliente:** `exitos_conferir` tem `unique (caso_id, cliente_id)` (`0640:42`).
7. **O desfazer que já existe** (`portal_financeiro_parcela_baixa_desfazer`, `1010:415-474`):
   - trava a parcela (`1010:432`);
   - recusa a importação desfeita (`1010:440-444`) e o contrato fora de `ATIVO` e `ENCERRADO` (`1010:445-447`);
   - pede a explicação, de 3 a 1.000 letras (`1010:448`);
   - desfaz também as custas que foram juntas (`1010:453-457`);
   - cria a anotação de cobrança "Falar com {cliente}" para amanhã (`1010:461-467`).

## A2. Decisões

### A2.1 A proposta passa a mostrar o êxito baixado

1. **Peça nova `exito_parcelas_baixadas(p_escritorio, p_caso, p_cliente) returns jsonb`.** É uma lista com as parcelas do êxito do cliente no caso que estão com baixa sem receber em vigor (`baixa_id is not null`).
   - O recorte é o de `exito_parcelas_abertas` (`0651:26-29`), sem a importação desfeita.
   - Cada item traz `parcelaId`, `descricao`, `vencimento`, `valor` e `contrato` (`id`, `numero`, `estado`).
   - Traz também `baixa`, que é o `parcela_baixa_json` que já existe (`1010:138-150`): motivo, explicação, valor que faltava, recebido antes, quem, quando e as custas que foram juntas (`reembolsos`).
   - A explicação vai porque só quem tem a área Financeiro abre a proposta (`0280:323`), e a 1010 mostra a explicação a quem tem o Financeiro.
2. **`repasse_proposta` ganha `exitoBaixado`.** É uma troca de trecho no embrulho da 0651, com o âncora `from exito_parcelas_abertas(p_escritorio, p_caso, p_cliente) e))` (`0651:43`, que aparece uma vez só). Quem já chama a proposta lê só `linhas` (`requisicao_parte`, `0554:77-82`; `seguiuProposta`, `0280:393-395`), então nada mais muda.
3. **Saem da v1 (nota 8):**
   - `podeDesfazerBaixa` e `quemDesfaz`, porque quem registra sempre pode desfazer (A1.5);
   - a linha no "A caminho", porque a decisão acontece no "Entrou na conta", que é o mesmo registrar, com a mesma recusa;
   - os estados próprios da parcela paga em parte e das custas, que viram variações do estado 1.

### A2.2 A escolha, no próprio registrar, em uma transação (nota 4)

4. **A janela de registrar ganha um grupo de rádio obrigatório, sem nada marcado:** "O que fazer com o êxito de Rita". O grupo só aparece quando a proposta traz `exitoBaixado`. As opções:
   - **"Desfazer a baixa antes de dividir"** (o nome da decisão 38). Abre o campo "Por que desfazer", já preenchido com "O alvará de R$ 16.000,00 entrou em 18/11 e paga o êxito." e editável. Os honorários continuam na divisão, e a linha deles passa a dizer "Paga a parcela do êxito (falta R$ 4.800,00)";
   - **"Manter a baixa e tirar os honorários"**. Tira a linha de honorários da divisão, e o valor fica com o cliente. Escolher a outra opção depois põe a linha de volta, com o valor proposto.
5. **Por que uma transação só (nota 4):**
   - **é mais simples:** não precisa guardar o rascunho fora da janela, nem de outra janela, de uma falha ao abrir, de uma volta ou de foco posto à mão;
   - **protege melhor o dinheiro:** ou o desfazer e o pagamento pela divisão entram juntos, ou nada entra. A parcela nunca fica "Em atraso" entre um e outro, a régua não a pega, e o sino do caso pronto, que é adiado para o commit (`caso_pronto_fim`), vê só o estado final;
   - **é seguro porque o registrar chama o desfazer que já existe** (`portal_financeiro_parcela_baixa_desfazer`) dentro da mesma transação, com todas as conferências dele (permissão, escrita, importação, contrato, explicação). Não há lógica nova de desfazer.
   - **O que fica:** a anotação "Falar com Rita amanhã" que o desfazer cria. Quando a divisão paga a parcela inteira, ela some das listas, que filtram as pagas (`0500_portal_inicio_completo.sql:43`). Quando paga só em parte, ela é o que se quer: alguém cuida do resto.
6. **O servidor.** Troca de trecho no embrulho da 0651, achado pelo conteúdo (`prosrc` com `exito_parcelas_abertas(p_escritorio, l.caso_id, l.cliente_id)`, exigindo uma função só). A ordem passa a ser esta:
   1. **No `declare`,** `v jsonb := financeiro_levantamento_registrar_sem_exito(...)` (`0651:54`) vira só `v jsonb;`, com as variáveis novas.
   2. **No começo do `begin`,** antes do corpo:
      - lê o caso e o cliente de `p_dados`, com conversão protegida. Se não forem válidos, pula este passo, e o corpo recusa como hoje;
      - trava `for update`, em ordem de `id`, as parcelas do êxito desse caso e cliente. É a mesma linha que a baixa (`1010:344`) e o desfazer (`1010:432`) travam: a corrida termina numa ordem só;
      - lê `exito_parcelas_baixadas` **depois** da trava;
      - **a corrida:** o conjunto de `baixa.id` precisa ser igual a `exitoBaixadoVisto`. Senão, recusa com `TC409` e `motivo = 'EXITO_MUDOU'`, e o detalhe traz a última linha de `parcela_baixas` da parcela (`tipo` `BAIXA` ou `DESFEITA`, quem e quando). O cliente novo **manda o campo sempre**, com `[]` quando não viu baixa (nota 12). Sem o campo (cliente antigo), esse passo é pulado;
      - **o desfazer:** com `desfazerBaixa: { baixaId, explicacao }`, o `baixaId` precisa estar no conjunto em vigor (senão, `EXITO_MUDOU`). O registrar então chama `portal_financeiro_parcela_baixa_desfazer(p_pessoa, p_escritorio, parcelaId, {explicacao})`. Com isso, as custas que foram juntas também deixam de estar baixadas antes do corpo conferir as linhas `REEMBOLSO` (`1010:924-926`), e é isso que torna possível a resposta "sim" da pergunta A2.
   3. **Depois, o corpo:** `v := financeiro_levantamento_registrar_sem_exito(...)`, e então `select * into l` (`0651:63`).
   4. **A rede.** Se ainda há êxito baixado e alguma parte `HONORARIOS` de valor maior que zero, recusa com `TC409` e `motivo = 'EXITO_BAIXADO'`. Vale também para a parte de honorários mandada à mão, fora da proposta (nota 16).
   5. **O rastro.** Se ainda há êxito baixado e não há honorários, grava `financeiro.levantamento_exito_mantido` (entidade `levantamentos`), com as baixas, as parcelas e o motivo, **sem a explicação**. Se houve desfazer, o histórico do levantamento leva `baixaDesfeita`.
   6. **O pagamento,** pelo laço de honorários de hoje (`0651:64-78`, com o recheck da 1010).

   A recusa em qualquer passo desfaz tudo, inclusive o desfazer da baixa.
7. **`registrarLevantamentoSchema`** (`domain/src/financeiro.ts:578-588`) ganha `exitoBaixadoVisto` (lista de até 5 uuid) e `desfazerBaixa` (`baixaId` e `explicacao`). Sem isso, o zod tira os campos antes de chegar ao banco (`_shared/validar.ts:7-13`).
8. **O botão "Registrar"** deixa `disabled={enviando}` (`FinanceiroRepasses.tsx:445`) e passa ao padrão aprovado: `aria-disabled` e `aria-busy`, com uma guarda contra o segundo envio (`BaixaParcela.tsx:127`). A troca vale sempre, e não só com o êxito baixado (nota 13).

### A2.3 Os casos de borda

9. **Paga em parte:** o detalhe diz "Recebido R$ 1.000,00 de R$ 4.800,00. A baixa sem receber foi dos R$ 3.800,00 que faltavam." Depois do desfazer, a divisão paga até R$ 3.800,00, e o que sobrar dos honorários vai ao caixa, como hoje.
10. **Renegociada:** segue a pergunta A1, item b.
11. **Contrato encerrado:** o êxito baixado aparece, e o desfazer aceita `ENCERRADO`. A renegociada só nasce com o contrato ativo (`1010:368-371`). Se o contrato foi encerrado depois, o aviso é o mesmo da renegociada.
12. **Caso já encerrado no financeiro:** o encerramento não se reabre (decisão 18 da baixa). O levantamento depois do fechamento já é aceito hoje.
13. **Custas que tiveram baixa junto (FI-25):** seguem a pergunta A2.
14. **Importação desfeita:** a parcela não entra em `exitoBaixado` e não segura o registrar.
15. **Sucumbência:** não vai na linha de honorários. Quem aumentar essa linha para somar a sucumbência é recusado enquanto o êxito estiver baixado. A sucumbência entra como "Outro", como hoje.
16. **"A caminho" (0554):** a parte do escritório da requisição e a previsão do Caixa não mudam. O "Entrou na conta" usa o mesmo registrar, com a mesma escolha.
17. **Relatórios e caixa:** nada conta duas vezes.
    - O recebimento da 0651 é `TERCEIROS` (`0651:70-71`) e fica fora de `relatorio_entradas` (`0410:155`).
    - Os honorários entram em "Entrou" no dia da transferência (`0410:158-165`).
    - `relatorio_abertas` não reescreve os dias em que a parcela esteve baixada (`1010:113-121`, `:903-906`).
    - No F3.173, a baixa fica no mês dela e o desfazer aparece no mês dele.
18. **A exportação ao contador não muda:** a baixa não é entrada de caixa (`0650:14-23`).

## A3. O que muda, por camada

**Servidor: migration `1100_exito_baixado_na_divisao.sql`** (faixa 1100-1109, livre; a última hoje é a 1093)
- **Seção 0.** `t1100_trocar`, cópia da `t1010_trocar` (`1010:30-39`), apagada no fim.
- **Seção 1.** `exito_parcelas_baixadas`: `sql stable`, `search_path = public`, sem `security definer`.
- **Seção 2.** A troca em `repasse_proposta(uuid,uuid,uuid,bigint)`.
- **Seção 3.** As trocas no embrulho do registrar (decisão 6).
- **Seção 4.** Nenhuma tabela, coluna ou gatilho novo. O escritório continua vindo da sessão (`quem(c)`). A migration fecha com `call fechar_acesso();`.

**api-portal.** Nenhuma rota nova: a proposta (`app.ts:1159-1162`) e o registrar (`app.ts:1164-1167`) já repassam. O 409 com detalhe vira `VERSION_CONFLICT` com `detalhes` (`_shared/banco.ts:43-53`).

**domain.**
- `PropostaRepasse` (`financeiro.ts:594-601`) ganha `exitoBaixado?`, que reaproveita `BaixaSemReceber` (`financeiro.ts:125`).
- O schema ganha os dois campos (decisão 7).
- `textos.ts`, em `TEXTOS_MOTIVO`, ganha os textos de reserva de `EXITO_BAIXADO` e `EXITO_MUDOU` (seção A5).

**ui.**
- **`FinanceiroRepasses.tsx`, `JanelaRegistrar`:**
  - **na célula de honorários,** só a linha curta "Êxito com baixa sem receber · veja abaixo" (nota 1);
  - **o aviso e o grupo de rádio** vão **depois da tabela, dentro do `fieldset.rp-div`** (`:502`), e o id do aviso entra no `aria-describedby` do `fieldset` **junto** do erro (`descritoPor(…, tem("divisao") && "rp-div-er")`);
  - **o corpo do `POST`** leva sempre `exitoBaixadoVisto` e, quando for o caso, `desfazerBaixa`;
  - **o conflito** ganha "Ver a divisão refeita", que busca a proposta de novo e mantém o resto do que foi preenchido.
- **A ficha do repasse:** o texto do histórico de `financeiro.levantamento_exito_mantido` (junto de `FinanceiroRepasses.tsx:834-846`).
- **`ui/src/portal/baixa.ts`:** duas funções puras, `textoExitoBaixado(item, cliente)` e `conflitoDoExito(detalhes, hoje)`, esta no molde de `conflitoDaBaixa` (`baixa.ts:125`).
- **Botões:** a área de toque das tabelas já vem do F3.165 (feito). Os rádios são cartões de 44 px de altura, no padrão da janela da baixa. No celular, ficam empilhados na largura toda.
- **README do sistema**, seção "Financeiro do Portal, Repasses": um parágrafo sobre o êxito baixado e a escolha.

## A4. Estados para a especialista de frontend (prefixo `eb-`)

**Base.** A janela aprovada "Registrar alvará ou RPV" (`FinanceiroRepasses.tsx:438-560`), em Ribeiro & Matos, na quarta-feira, 18/11/2026, às 10h12.

**O caso de exemplo:**
- **Rita Fonseca, C-2026-021**, caso "Fonseca x Banco Aurora", com êxito de 30% sobre o acordo;
- a parcela "Êxito · Fonseca x Banco Aurora" é de R$ 4.800,00 e venceu em 20/10;
- **Marina** deu baixa sem receber por Inadimplência em 05/11, com a explicação: "Rita disse que o banco não pagou o acordo; não vamos cobrar agora.";
- hoje **Diego** (Financeiro, `financeiro.editar`) registra um **alvará de R$ 16.000,00**.

**Onde fica o aviso.** O aviso e o grupo de rádio ficam **abaixo da tabela da divisão, dentro do quadro "Divisão"**, e nunca dentro de uma célula. Na célula de honorários fica só a linha curta.

Cada estado vai no computador (1440) e no celular (390).

1. **`eb-proposta`** (Diego). A divisão, com "Honorários de êxito · 30% · acordo · contrato C-2026-021 · R$ 4.800,00" e, na célula, "Êxito com baixa sem receber · veja abaixo". Abaixo da tabela, o aviso âmbar:
   - **Título:** "O êxito de Rita está com baixa sem receber."
   - **Detalhe:** "Êxito · Fonseca x Banco Aurora · R$ 4.800,00 · inadimplência, por Marina Ribeiro em 05/11/2026." e, abaixo, entre aspas, "Rita disse que o banco não pagou o acordo; não vamos cobrar agora."
   - **Texto:** "Se os honorários deste alvará pagam esse êxito, desfaça a baixa antes de dividir. Se o escritório decidiu não cobrar, mantenha a baixa e tire os honorários: o valor fica com Rita."
   - **Grupo de rádio** "O que fazer com o êxito de Rita", sem nada marcado:
     - "Desfazer a baixa antes de dividir", com a ajuda "A parcela volta a ser cobrada e os honorários deste alvará a pagam.";
     - "Manter a baixa e tirar os honorários", com a ajuda "Os R$ 4.800,00 ficam com Rita. A escolha fica no histórico do repasse."
   - **Rita:** R$ 11.200,00.
   - **Variações, só nas notas do desenho:**
     - paga em parte: "Recebido R$ 1.000,00 de R$ 4.800,00. A baixa sem receber foi dos R$ 3.800,00 que faltavam.";
     - custas junto: a frase da pergunta A2, conforme a resposta.
2. **`eb-desfazer-escolhido`** (Diego). "Desfazer a baixa antes de dividir" marcado. Aparece o campo **"Por que desfazer"**, já preenchido com "O alvará de R$ 16.000,00 entrou em 18/11 e paga o êxito.", com a ajuda "Fica no histórico da parcela." A célula de honorários passa a dizer "Paga a parcela do êxito (falta R$ 4.800,00)". Com o sim da pergunta A2, entra a linha proposta "Reembolso: custas · R$ 412,30", com a regra "Tinham baixa junto com o êxito; voltam a ser cobradas".
3. **`eb-mantida`** (Diego). "Manter a baixa e tirar os honorários" marcado. A linha de honorários sai, e Rita fica com R$ 16.000,00. Uma nota sob o grupo diz: "Os honorários saíram da divisão. O êxito de Rita continua com baixa sem receber, e isso fica no histórico do repasse."
4. **`eb-erro`** (Diego). Clicou em "Registrar" sem escolher.
   - **Resumo no topo:** "Falta acertar 1 coisa. Nada foi registrado ainda."
   - **Erro do grupo:** "Escolha o que fazer com o êxito de Rita: desfazer a baixa sem receber ou tirar os honorários."
   - **Foco:** no primeiro rádio.
   - **Variação, nas notas:** "Desfazer" marcado com o campo vazio dá "Escreva por que desfazer, com pelo menos 3 letras."
5. **`eb-conflito`** (Diego). A recusa `EXITO_MUDOU`, em `role="alert"`, com o botão "Ver a divisão refeita":
   - **com desfazer:** "Bianca Torres desfez a baixa sem receber do êxito de Rita às 10h13. Nada foi registrado. Veja a divisão refeita antes de registrar.";
   - **com baixa:** "Bianca Torres deu baixa sem receber no êxito de Rita às 10h13. Nada foi registrado. Veja a divisão refeita antes de registrar."
6. **`eb-historico`** (Marina). Na ficha do repasse, a linha do histórico: "Registrado sem os honorários do êxito: a parcela de Rita continua com baixa sem receber (inadimplência, por Marina Ribeiro em 05/11)."

**Sem estado próprio:**
- a confirmação depois do desfazer é o aviso de hoje, com o texto que diz que a parcela foi paga (seção A5);
- a renegociada depende da pergunta A1, item b, e entra como variação do estado 1 depois da resposta.

**Acessibilidade (PT-10, WCAG 2.2 AA):**
- **o aviso** é uma região com `h3`, ligada ao `fieldset` por `aria-describedby`, junto do erro;
- **o grupo de rádio** é `fieldset` com `legend`. No erro, o grupo leva `aria-describedby` para a mensagem e cada rádio leva `aria-invalid`, como no grupo de motivos aprovado da baixa;
- **o resumo de erros** é `role="alert"`, com link de 44 px para o grupo;
- **o conflito** é `role="alert"`, e o foco vai a "Ver a divisão refeita";
- **o botão "Registrar"** usa `aria-busy` e `aria-disabled`, nunca `disabled`;
- **sem rolagem lateral em 390,** e o "R$" nunca quebra do número.

## A5. Textos (no tom de `docs/design/aprovadas/textos-tom`)

Os textos novos dizem "**paga a parcela do êxito**" e nunca "dá baixa", para não se confundir com "baixa sem receber" na mesma janela (nota 15).

- **Os textos exatos** estão nos estados 1 a 6.
- **Confirmação depois do registrar com desfazer:** "Alvará registrado. R$ 16.000,00 de terceiros. R$ 10.787,70 para Rita (com o sim da A2; R$ 11.200,00 sem as custas), até {prazo}. A baixa sem receber do êxito foi desfeita, e os honorários pagam a parcela." O texto de hoje (`FinanceiroRepasses.tsx:424-428`) continua valendo para o caso sem baixa.
- **Textos de reserva em `textos.ts`:**
  - `EXITO_BAIXADO`: "O êxito deste cliente está com baixa sem receber. Desfaça a baixa antes de dividir ou tire os honorários da divisão.";
  - `EXITO_MUDOU`: "O êxito deste cliente mudou enquanto você dividia. Nada foi registrado. Veja a divisão refeita."

## A6. Testes

**pgTAP `sistema/supabase/tests/pgtap/146_exito_baixado_divisao_test.sql`** (os nomes levam FI-24 e FI-05)
1. A proposta traz `exitoBaixado` com a baixa inteira, `exito: []` e as linhas iguais às de antes.
2. Registrar com honorários e o êxito baixado recusa com `EXITO_BAIXADO`. Também recusa a parte `HONORARIOS` mandada à mão, e não sobra levantamento, parte nem recebimento.
3. Com `desfazerBaixa`, numa transação: nasce a linha `DESFEITA`, a parcela fica `PAGA` por um recebimento `TERCEIROS` com `destinacao_id`, e a anotação de cobrança existe, mas a parcela some de `inicio` e de A receber.
4. Paga em parte: R$ 1.000,00 recebidos e baixa de R$ 3.800,00. O desfazer junto paga R$ 3.800,00.
5. A explicação com menos de 3 letras recusa, e nada é gravado: a baixa continua em vigor.
6. "Manter": sem honorários, com `exitoBaixadoVisto = [b]`, o registrar passa, a parcela continua `BAIXADA`, e o histórico tem `exito_mantido` sem a explicação. O cliente antigo, sem `exitoBaixadoVisto` e sem honorários, também passa e grava o histórico.
7. `EXITO_MUDOU`: a baixa feita depois da proposta (`visto = []`) e a baixa desfeita depois (`visto = [b]`), cada uma com quem e quando. Um `desfazerBaixa.baixaId` velho também recusa.
8. A renegociada, e o contrato encerrado depois de uma renegociada, aparecem com o motivo. A importação desfeita não aparece.
9. "Entrou na conta" com `requisicaoId` e "Manter": a requisição passa a `ENTROU` (`0554:193-200`), e o histórico grava o `exito_mantido`.
10. Depois do "Manter", a parte do cliente e as outras partes continuam podendo ser dispensadas. A parte de honorários que pagou o êxito continua sem poder (`BAIXOU_EXITO`, `0651:92-94`).
11. FI-25, conforme a pergunta A2:
    - **com o sim:** as custas entram na divisão, e o `caso_acerto` fica sem pendência de reembolso;
    - **com o não:** o teste registra que o `caso_acerto` volta a ter a pendência de reembolso.
12. Relatórios: depois de registrar e transferir, `relatorio_entradas` conta os honorários uma vez, e `relatorio_abertas` dos dias em que a parcela estava baixada não muda.
13. Isolamento: o escritório B recebe 404 e não vê o `exitoBaixado` do A.

**Concorrência.** O script `sistema/supabase/tests/concorrencia/exito-baixado-divisao.sh`, no molde de `levantamento-pela-api.sh`, faz o commit de verdade como `service_role`, porque o gatilho adiado da divisão e o `caso_pronto_fim` rodam no commit. Ele testa os dois lados:
- a baixa trava a parcela, e o registrar espera e recusa com `EXITO_MUDOU`;
- o registrar trava a parcela, e a baixa espera e recusa com `PARCELA_JA_PAGA` ou `PARCELA_MUDOU`.

**Deno (`api-portal/app_test.ts`).** Os dois campos chegam ao banco, inclusive `exitoBaixadoVisto: []`, e os dois 409 voltam com o detalhe.

**Vitest.**
- O schema aceita os campos e recusa mais de 5 itens.
- `baixa.test.ts` cobre `textoExitoBaixado` (inadimplência, perdoada, parcial e custas) e `conflitoDoExito`, com a hora de Brasília.

**e2e (`sistema/tests/e2e/portal-financeiro-repasses.spec.ts`).**
- Os estados 1 a 5 em 1440 e 390, com axe sem violação e sem rolagem lateral.
- Pelo teclado: escolher "Desfazer", registrar, e conferir que o corpo traz `desfazerBaixa` e `exitoBaixadoVisto`.
- "Manter": o corpo vai sem honorários.
- Sem êxito baixado: o corpo traz `exitoBaixadoVisto: []`.

## A7. Painel (no mesmo commit da entrega)

- **`D38`**, para o desenho dos estados `eb-` ("Desenho da escolha do êxito baixado na divisão do alvará"):
  - `peca` S4, `refs` FI-24 e FI-05, `ordem` 87 (o maior hoje é 86);
  - fica `andamento` no desenho e `feito` com o ok da Carol;
  - a pasta vai para `docs/design/aprovadas/portal-exito-baixado-divisao/`.
- **`F3.174` → `feito`:**
  - `refs`: FI-24 e FI-05, mais FI-25 com o sim da pergunta A2;
  - `evidencia`: a 1100, o pgTAP 146, o script de concorrência, o Deno, o vitest e o e2e;
  - apagar `proximo`;
  - a entrega fecha a decisão 38 inteira.
- **Itens pendentes novos,** criados no mesmo commit, cada um com a sua frente:
  - **`F3.191`** "Na divisão do alvará, avisar o êxito marcado como não cobrado na conferência", `refs` CH-07 e FI-05. O êxito `NAO_COBRADO` (`0640:32`, `:352`) também não aparece na proposta;
  - **`F3.192`** "Rendeu: a custa adiantada que teve baixa sem receber volta a descontar", `refs` FI-07, FI-25 e IN-15, com a pergunta à Carol (seção "Itens fora desta frente");
  - **`F3.193`** "Explicação da baixa sem receber na exclusão do cliente", `refs` PT-11 (nota 18).
- **Histórico:** `python3 docs/painel/painel.py novo-historico --refs F3.174 FI-24 FI-05 --texto "…"`, no horário de Brasília. Depois, `python3 docs/painel/painel.py conferir`, com 0 erro.
- **`IDEIAS.md`:** não muda. O total segue 141.

## A8. Riscos

1. **Troca de trecho em funções que outras frentes também mudam.** O `t1100_trocar` exige a contagem exata, e o registrar é achado pelo conteúdo.
   - **Antes de aplicar em produção (E1),** quem tiver acesso confere `pg_get_functiondef` de `repasse_proposta` e da cadeia do registrar.
   - **Na mesma conferência (nota 11),** roda esta consulta: os levantamentos com uma parte `HONORARIOS` cujo caso e cliente tinham a parcela do êxito com `baixa_id` em vigor no `criado_em` do levantamento (a 1010 está no ar desde 24/11/2026). Se achar algum, avise a Carol e não mude nada sozinho.
2. **Chamar o desfazer de dentro do registrar.** As duas funções entram no mesmo escritório, com as mesmas ações, e a recusa de qualquer uma desfaz as duas. O teste 5 e o script de concorrência cobrem isso.
3. **A recusa nova pode surpreender quem registra.** A tela resolve antes de enviar (estado 4). A recusa do servidor é a rede para o cliente antigo e para a corrida.

## A9. Perguntas à Carol

1. **Com o êxito do cliente baixado sem receber, o escritório pode registrar os honorários do alvará sem desfazer a baixa?**
   - **a. Perdoada ou inadimplência.**
     - **Recomendo que não.** A janela pede a escolha: "Desfazer a baixa antes de dividir", que paga o êxito com o alvará numa vez só, ou "Manter a baixa e tirar os honorários", em que o valor fica com o cliente e a escolha vai para o histórico. O caixa nunca recebe honorários de um êxito que continua "baixa sem receber".
     - **A alternativa** é um terceiro caminho, "Dividir mesmo assim", com explicação. O dinheiro entra no caixa com a parcela baixada, e os Relatórios mostram o mesmo valor em "Entrou" e em "Baixado sem receber".
   - **b. Renegociada.** O combinado virou, ou vai virar, parcelas novas em Contratos. Essas parcelas não têm a marca do êxito, e a divisão não as paga (`0651:27`, `0640:55-56`).
     - **Opção 1, recomendada:** só "Desfazer a baixa antes de dividir". Os honorários pagam o êxito, e o aviso lembra: "Se o combinado já virou parcelas novas em Contratos, tire essas parcelas mudando as condições do contrato, ou o valor vai ser cobrado duas vezes." Quem tem Contratos vê o link "Mudar as condições do contrato".
     - **Opção 2:** os honorários vão ao caixa sem desfazer, e o aviso diz que as parcelas novas precisam sair. Assim as parcelas novas ficam abertas com o dinheiro já no caixa, até alguém agir em Contratos.
     - **Opção 3** (a da v1, que não recomendo): tirar os honorários. O escritório repassa tudo ao cliente e depois o cobra em parcelas de um dinheiro que já estava na mão dele.
2. **Quando o êxito é desfeito na divisão, as custas que o escritório adiantou e que tiveram baixa junto (FI-25) entram na divisão como reembolso?**
   - **O que acontece se não entrarem.** O desfazer traz as custas de volta ligadas à parcela do êxito. A divisão paga essa parcela, as custas passam para a parcela seguinte do cliente e, num caso perdido ou encerrado, em geral não há parcela seguinte. As custas ficam "a reembolsar" sem parcela, o caso volta a ter pendência, e o "pronto para encerrar" só volta quando alguém reembolsar à mão. É exatamente o que a FI-25 resolveu, com o dinheiro para reembolsar ali, no alvará.
   - **Recomendo que sim.** Só essas custas, e só quando a pessoa escolhe desfazer. Elas entram como "Reembolso", já propostas e removíveis, e o caso fecha no repasse como hoje.
   - Isso não muda a regra geral de que só o reembolso "no levantamento" é proposto (F3.43).

---

# Parte B · F3.173: "Baixado sem receber" nos Relatórios

## B1. O que existe hoje

- **Quem vê:** só a sócia dona (`relatorio_entrar`, `0410:104-112`).
- **De onde saem os dados:**
  - **visão geral:** o corpo da 0410 (`0410:262-370`), embrulhado pela 0555 (`0555:80-97`);
  - **por cliente:** `relatorio_por_cliente` (`0410:375-406`);
  - **um cliente:** `portal_relatorio_cliente` (`0410:424-498`);
  - **exportação:** `portal_relatorio_exportar` (`0410:595-634`).
- **A 1010 já impede que "Falta receber" reescreva o passado** (`parcela_baixada_no_dia`, `1010:113-121`, trocada em `:903-906`).
- **`parcela_baixas`** (`1010:43-63`, inventário em `:71-78`) só aceita inserção.
  - Cada baixa é uma linha `BAIXA`, com `feito_em = app_now()` (a data nunca é escolhida) e `valor` igual ao que faltava.
  - O desfazer grava uma linha `DESFEITA`, com `desfaz_id`, também para cada custa que foi junto (`1010:453-457`).

## B2. Decisões

1. **A regra de data.**
   - A baixa conta no dia em que foi feita, `(feito_em at time zone 'America/Sao_Paulo')::date`. É a mesma conta de `parcela_baixada_no_dia`.
   - O desfazer conta no dia dele, como um movimento próprio, e nunca tira o valor do período da baixa.
2. **O número principal** é a soma do `valor` das linhas `BAIXA` de parcela (sem custas) com motivo Perdoada ou Inadimplência, feitas no período. É um valor bruto, que nunca fica negativo.
3. **O que fica ao lado, sem somar.** Cada linha `DESFEITA` herda o `motivo` e a marca de custas da baixa que desfaz, pelo `desfaz_id` (nota 20). A folha mostra:
   - "Baixas desfeitas no período": os desfazeres de baixas Perdoada ou Inadimplência;
   - "Renegociado no período": as baixas renegociadas e, abaixo, as desfeitas delas. A renegociada não soma (decisão 22 da baixa);
   - "Custas baixadas junto": as baixas de custas e as desfeitas delas. É despesa do escritório, não honorário.
4. **Comparação:** o mesmo cálculo no período de comparação, com `comparaTexto`.
5. **De quem é:** o cliente, o contrato, a área e o responsável vêm do contrato da parcela, com o mesmo recorte de `relatorio_abertas` (contrato `ATIVO` ou `ENCERRADO`, `0410:180-193`).
6. **Onde aparece.**
   - **Visão geral:** uma folha "Baixado sem receber" na coluna lateral, depois de "Falta receber". Ela só aparece se o escritório já teve alguma baixa.
   - **Por cliente:** uma coluna "Baixado sem receber". O cliente que só teve baixa no período entra na lista.
   - **Um cliente:**
     - o número na lista de números, só quando for maior que zero;
     - uma lista "Baixas sem receber no período", feita como `ul` e não como tabela (nota 6). Cada item tem dia, o quê, parcela, motivo, quem e valor;
     - a explicação aparece entre aspas, **menos para o cliente excluído** (`clientes_escritorio.estado = 'EXCLUIDO'`, a marca que a 1092 usa, `1092:157`).
   - **"Como contamos"** ganha a regra.
   - **Por área e Por responsável** ficam como estão.
7. **Exportação.**
   - **Aba "Números":** as linhas novas.
   - **Aba "Por cliente":** a coluna nova.
   - **Aba nova "Baixas sem receber":** dia, o quê, cliente, contrato, parcela, motivo, valor e quem. **Sem a explicação.**
8. **O que não muda:** Entrou, Falta receber, Rendeu, o Caixa e a exportação ao contador. A baixa não é entrada de caixa (`0650:14-23`).

## B3. O que muda, por camada

**Servidor: migration `1101_relatorio_baixado_sem_receber.sql`.**
- **Seção 0.** `t1101_trocar`.
- **Seção 1.** `create index parcela_baixas_dia on parcela_baixas (escritorio_id, feito_em);`. Hoje só há índices por parcela e por conta (`1010:64-66`).
- **Seção 2.** `relatorio_baixas(p_escritorio, p_de, p_ate)`: uma linha por movimento, com `id`, `dia`, `tipo`, `motivo` (herdado na `DESFEITA`), `custas`, `valor`, `parcela_id`, `contrato_id`, `cliente_id`, `caso_id`, `area`, `responsavel_id`, `descricao`, `por` e `desfeita_em` (na `BAIXA`).
- **Seção 3.** `relatorio_baixado_json(p_escritorio, de, ate, cde, cate)`. Devolve `valor`, `n`, `porMotivo`, `desfeitas`, `renegociado {valor, n, desfeitas}`, `custas {valor, n, desfeitas}`, `anterior` e `algum`.
- **Seção 4.** Visão geral: uma troca no embrulho da 0555, antes de `return jsonb_set(v, '{falta,aparte,caminho}'` (`0555:91`). As datas vêm de `v -> 'periodo'` (`0410:95-101`).
- **Seção 5.** Por cliente: duas trocas em `relatorio_por_cliente`. Uma acrescenta o CTE `bx` e o `union select cliente_id from bx` em `ids` (âncora `0410:387`); a outra acrescenta `'baixado'` depois de `'aparte'` (âncora `0410:398`).
- **Seção 6.** Um cliente e exportação: `portal_relatorio_cliente` e `portal_relatorio_exportar` são renomeadas e embrulhadas, na forma da 0555, porque a mudança só acrescenta e o corpo é grande.
- **Seção 7.** Nenhuma tabela nova. `parcela_baixas` já está no inventário com `exportar = true`. A migration fecha com `call fechar_acesso();`.

**api-portal.** Nenhuma rota nova (`app.ts:1473-1490`).

**domain (`relatorios.ts`).** Os tipos de `ResumoRelatorio`, `ClienteRelatorio`, `RelatorioCliente` e `DadosRelatorioExportado` ganham os campos novos.

**ui.**
- **`Relatorios.tsx`:**
  - a `FolhaBaixado`, que também entra no esqueleto de carregando (`:268-300`);
  - a coluna, o cartão e o total em Por cliente;
  - o número e a lista em Um cliente;
  - a regra em "Como contamos" (`:132-150`).
- **`relatorios.ts`:** `abasRelatorio` (`:180-238`) com as linhas, a coluna e a aba novas.
- **A tabela `relatorio-clientes`** (nota 6):
  - "Baixado sem receber" entra no nível `"3"` de `prioridades.json`, **depois** de "Despesas não reembolsadas" (`prioridades.json:23`). As duas saem juntas no primeiro degrau;
  - as faixas `data-sai3="880" data-sai2="760" data-cartoes="640"` (`Relatorios.tsx:732`) **são medidas de novo**, com dados longos, e o `portal-tabelas-alturas.json` é refeito se mudar;
  - a tela entra em `tests/e2e/portal-tabelas-telas.json`.
- **README do sistema,** seção "Relatórios do sócio": a regra.

## B4. Estados para a especialista de frontend (prefixo `rb-`)

**Base.** A tela aprovada `docs/design/aprovadas/portal-relatorios`. Quem vê é só **Marina** (sócia dona). Hoje é 18/11/2026.

**Os dados de exemplo:**
- Rita: R$ 4.800,00 baixados por inadimplência em 05/11;
- Noemi: a 6/6, de R$ 1.000,00, baixada por inadimplência em 15/10 e **desfeita em 12/11** por Marina;
- Sebastião: R$ 500,00 renegociados em 10/11;
- as custas de Noemi, R$ 412,30, baixadas junto em 15/10 e desfeitas em 12/11.

1. **`rb-visao`** (Marina, Visão geral, período de setembro a novembro, comparado com junho a agosto). A folha:
   - **Título e subtítulo:** "Baixado sem receber" · "Parcelas que saíram de Em atraso sem que o dinheiro entrasse, de set. a nov."
   - **Número:** "R$ 5.800,00 · 2 parcelas", com "Inadimplência R$ 5.800,00".
   - **Comparação:** "R$ 0,00 em jun. a ago."
   - **Linhas:**
     - "Baixas desfeitas no período · R$ 1.000,00 · voltaram para A receber";
     - "Renegociado no período · R$ 500,00 · vira parcelas novas em Contratos e não soma";
     - "Custas baixadas junto · R$ 412,30 · R$ 412,30 desfeitos · despesas do escritório e não soma".
   - **Pé:** "Não conta em Entrou nem em Falta receber. Cada baixa fica no mês em que foi feita. Se for desfeita depois, o desfazer aparece no mês dele."
2. **`rb-visao-nenhuma`** (Marina, período de junho a agosto). A folha só com "Nenhuma baixa sem receber de jun. a ago."
3. **`rb-mes-passado`** (Marina, Um cliente: Noemi Bastos Carvalho, período de 01/10 a 31/10).
   - **Número:** "Baixado sem receber · R$ 1.000,00".
   - **Item da lista:** "15/10 · Baixa sem receber · Parcela 6/6 · inadimplência · por Marina Ribeiro · R$ 1.000,00 · desfeita em 12/11", e a explicação entre aspas.
   - **Nas notas do desenho:** o mesmo período, visto depois do desfazer, continua igual.
4. **`rb-cliente`** (Marina, Um cliente: Noemi, período de setembro a novembro). A lista com dois itens: "15/10 · Baixa sem receber … R$ 1.000,00" e "12/11 · Baixa desfeita · Parcela 6/6 · por Marina Ribeiro · R$ 1.000,00". O número "Baixado sem receber · R$ 1.000,00" e a linha "R$ 1.000,00 de baixas desfeitas no período".
5. **`rb-clientes`** (Marina, Por cliente). A coluna "Baixado sem receber" (Rita R$ 4.800,00 e Noemi R$ 1.000,00), a ordenação por ela, a linha de totais e o campo no cartão do celular.
6. **`rb-como`** (Marina, "Como contamos" aberto). "Baixado sem receber: o que faltava nas parcelas que tiveram baixa sem receber no período, pelo dia da baixa. A renegociada e as custas não somam. Uma baixa desfeita depois não muda o período em que foi feita."

**Ficam nas notas:**
- o esqueleto de carregando com a folha a mais;
- a explicação escondida do cliente excluído;
- o arquivo exportado, que não tem tela.

**Acessibilidade:**
- as linhas da folha são `dl`, como "Rendeu" (`Relatorios.tsx:563-571`);
- "não soma" e "desfeita em" são texto, nunca só cor ou ícone;
- a coluna nova tem `data-r`;
- a lista de Um cliente é `ul`, com cada item lido como uma frase.

## B5. Textos

- **Estados:** os textos exatos estão nos estados 1 a 6.
- **Lista:** "Baixa sem receber" · "Baixa desfeita" · "desfeita em {dd/mm}".
- **Planilha, aba "Números":** "Baixado sem receber no período" · "baixas desfeitas no período (voltaram para A receber)" · "renegociado (não soma)" · "custas baixadas junto (não soma)".

## B6. Testes

**pgTAP `sistema/supabase/tests/pgtap/147_relatorio_baixado_sem_receber_test.sql`** (os nomes levam IN-04 e IN-07). Este teste adianta o relógio da aplicação.
1. Baixa em 15/10, desfeita em 02/12: outubro dá 1.000,00; novembro dá 0; dezembro dá `desfeitas` de 1.000,00.
2. **Nota 11:** o JSON de outubro guardado antes do desfazer é igual ao de depois.
3. A renegociada e as custas ficam fora de `valor`, e as desfeitas delas entram no grupo certo.
4. Paga em parte: o valor é só o que faltava.
5. Dia de Brasília: a baixa às 23h30 de 31/10 (02h30 UTC de 01/11) conta em outubro.
6. Por cliente:
   - o cliente só com baixa aparece;
   - a soma por cliente fecha com a visão geral;
   - a explicação não vem para o cliente excluído.
7. A comparação `anterior` sai certa.
8. A exportação traz `baixas` sem a explicação e grava `financeiro.relatorio_exportado`.
9. `SO_SOCIO_DONO` continua recusando, e o escritório B não vê as baixas do A.

**Vitest (`relatorios.test.ts`).** `abasRelatorio` com as linhas, a coluna e a aba novas, e o texto "desfeita em".

**e2e (`sistema/tests/e2e/portal-relatorios.spec.ts`).**
- Os estados 1 a 6 em 1440 e 390, com axe sem violação e sem rolagem lateral.
- O arquivo exportado tem a aba nova.
- O `portal-tabelas.spec.ts` confere as faixas novas de `relatorio-clientes`.

## B7. Painel

- **`D38`:** "Desenho do Baixado sem receber nos Relatórios", `refs` IN-04 e IN-07, `ordem` 88. A pasta vai para `docs/design/aprovadas/portal-relatorios-baixado/`.
- **`F3.173` → `feito`:**
  - `refs`: IN-04, IN-07 e FI-24;
  - `evidencia`: a 1101, o pgTAP 147, o vitest e o e2e;
  - apagar `proximo`;
  - a entrega atende o pendente inteiro.
- **Histórico novo e `conferir`.** O `IDEIAS.md` não muda.

## B8. Riscos

1. **Dois "Baixado sem receber" com sentidos diferentes.** O da ficha do contrato é o que está em vigor hoje; o dos Relatórios é o movimento do período. O subtítulo e o "Como contamos" dizem "no período".
2. **A troca em `relatorio_por_cliente`.** O corpo é SQL puro; a contagem exata para a migration se outra frente tiver mudado o trecho.
3. **As faixas da tabela.** A coluna nova muda a largura mínima, e é por isso que as faixas são medidas de novo.

---

## Itens fora desta frente

**`F3.192`, o Rendeu e a custa baixada sem receber** (FI-07, FI-25 e IN-15; era a pergunta B1).
- **O problema.** A 1010 tirou a custa perdoada das "despesas que não voltaram" (`1010:907-910`). Com isso, perdoar R$ 412,30 de custas **aumenta** o Rendeu em R$ 412,30.
- **A pergunta à Carol:** a custa adiantada que teve baixa sem receber continua descontando do Rendeu? **Recomendo que sim.**
- **O que a mudança pede:** `relatorio_adiantadas` é `returns table` (`0410:197-208`). Uma coluna nova pede `drop` e `create`, e o item precisa listar quem a lê (`relatorio_por_cliente`, `0410:381`, o resumo, as áreas e os responsáveis) e ter um teste de que o Rendeu de um mês fechado não muda.

**Os outros dois itens pendentes novos:**
- **`F3.191`**, o êxito marcado como não cobrado na conferência, que também não aparece na divisão do alvará (CH-07 e FI-05);
- **`F3.193`**, a explicação da baixa sem receber, que hoje não é limpa na exclusão do cliente (PT-11; a 1092 limpa as despesas, `1092:440-458`).

## Ordem de trabalho

1. **Este plano (v2)** e as respostas da Carol às perguntas A1 e A2.
2. **`D38`:** o desenho dos 6 estados `eb-`, o ok da Carol e a pasta em `aprovadas`.
3. **PR 1 (F3.174):** a 1100, a api-portal, o domain, o ui, os testes, o README e o painel (com os pendentes F3.191, F3.192 e F3.193).
4. **`D38`:** o desenho dos 6 estados `rb-` e o ok da Carol.
5. **PR 2 (F3.173):** a 1101, os testes, o README e o painel.

Nenhuma migration é aplicada nem publicada por este trabalho.

---

## Revisão aplicada

| Nota | Situação | Por quê e onde |
|---|---|---|
| 1. Aviso dentro da célula | **Aplicada** | A célula `<td>` de honorários (`FinanceiroRepasses.tsx:510-525`) fica só com a linha curta. O aviso e o grupo vão depois da tabela, dentro do `fieldset.rp-div` (`:502`), com o `aria-describedby` somado ao do erro. Ver A3, ui, e A4, "Onde fica o aviso" |
| 2. A2 trava o caso de novo | **Aplicada, e a recomendação mudou para "sim"** | Conferi: as custas são `PROXIMA_PARCELA`, o desfazer as traz de volta (`1010:453-457`), e `reembolso_proxima_parcela` pula a parcela paga (`0640:366-380`). Com a transação única (nota 4), o desfazer roda antes do corpo conferir as linhas `REEMBOLSO` (`1010:924-926`), e o "sim" fica viável. Ver A9.2 e o teste 11 |
| 3. Renegociada | **Aplicada** | Virou o subitem b da A1, com três opções e a recomendação de desfazer, com o lembrete de mudar as condições. A 0651 só paga parcela com `exito_id` (`0651:27`) |
| 4. Uma transação só | **Aplicada (decisão minha)** | É o caminho mais simples que protege o dinheiro: o registrar chama o desfazer que já existe, depois da trava e antes do corpo. Tudo entra ou nada entra, sem uma janela de "Em atraso" no meio, e o sino adiado vê só o estado final. Saem o rascunho fora da janela, a segunda janela, a falha ao abrir, a volta e o foco à mão (estados 6 a 8 e riscos 3 e 5 da v1). A anotação de cobrança fica: ela some quando a parcela é paga (`0500:43`) e serve quando o pagamento é parcial. Ver A2.2 |
| 5. Data no futuro | **Aplicada** | Nos estados, o desfazer da Noemi passou para 12/11, antes do "hoje" de 18/11. O 02/12 fica só no pgTAP, que adianta o relógio |
| 6. Faixas da tabela | **Aplicada** | Medir de novo `data-sai3/sai2/cartoes` (`Relatorios.tsx:732`), a ordem no nível 3 depois de "Despesas não reembolsadas" (`prioridades.json:23`), e a lista de Um cliente como `ul`, não tabela. Ver B3 |
| 7. B1 fora desta frente | **Aplicada** | Virou o item pendente F3.192 (FI-07, FI-25, IN-15), com o `drop`/`create` de `relatorio_adiantadas` (`0410:197-208`) e a lista de quem a lê. Saiu a 1102 do PR 2 |
| 8. Escopo | **Aplicada** | Saíram `podeDesfazerBaixa`, `quemDesfaz` (o registrar `0280:346` e o desfazer `1010:247` pedem a mesma ação) e a linha do "A caminho". Parcial e custas viraram variações. A Parte A foi de 13 para 6 estados. A recusa e o "Manter" ficam, porque são o que torna a escolha rastreável |
| 9. Linhas da 1010 | **Aplicada** | Corrigidas: `1010:432`, `:440-444`, `:445-447`, `:448`, `:453-457`, `:461-467`, tabela `:43-63` e inventário `:71-78` |
| 10. "Três níveis" | **Aplicada** | A1.4 diz "dois dos três níveis, e a proposta" |
| 11. Dados que já existem | **Aplicada** | A consulta entrou na verificação antes de aplicar (A8.1); a Carol é avisada se houver algum caso |
| 12. `exitoBaixadoVisto` sempre | **Aplicada** | A2.2, decisão 6, passo 2; o Deno e o e2e conferem o `[]` |
| 13. `disabled` sempre | **Aplicada** | A2.2, decisão 8, com a linha certa (`BaixaParcela.tsx:127`) |
| 14. `eu` da janela de desfazer | **Aplicada com mudança** | A janela de desfazer não é mais usada (nota 4). A sugestão do texto já preenchido ficou na caixa "Por que desfazer" (estado 2) |
| 15. "dá baixa" e "paga" | **Aplicada** | Os textos novos dizem "paga a parcela do êxito". O texto de hoje do registrado continua para o caso sem baixa |
| 16. Sucumbência e linha manual | **Aplicada** | A2.3, item 15, e o pgTAP 2 com `HONORARIOS` mandado à mão |
| 17. Encerrado depois da renegociada | **Aplicada** | A2.3, item 11, e o pgTAP 8 |
| 18. LGPD | **Aplicada** | A explicação fica escondida para o cliente `EXCLUIDO` (`1092:157`) e fora da planilha; o histórico `exito_mantido` não a leva. Item pendente F3.193 (PT-11) |
| 19. Exportação ao contador | **Aplicada** | A2.3, item 18, e B2.8 |
| 20. Desfeitas por grupo | **Aplicada** | A `DESFEITA` herda o motivo e a marca de custas, e cada grupo tem as suas desfeitas. Ver B2.3, B3, seção 3, e o teste 3 |
| 21. Caminhos dos testes | **Aplicada** | Os caminhos completos a partir de `sistema/` |
| 22. Testes que faltavam | **Aplicada** | pgTAP 146, testes 6, 9 e 10, e o script com commit de verdade como `service_role` |
