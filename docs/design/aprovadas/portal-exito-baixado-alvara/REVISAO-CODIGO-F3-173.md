# Revisão do código · F3.173, "Baixado sem receber" nos Relatórios

Revisor independente. Commit `360d859` (branch `claude/f3-173-baixado-relatorios`), diff contra `8e35f5b`. Comparado com o `PLANO.md` (parte B e "Revisão aplicada"), o `NOTAS.md` e o gerador do desenho (`_fonte/exito_baixado.py`, estados `rb-`).

## O que rodei

- **Banco na ordem de produção.** Apliquei todas as migrations menos a 1101, depois a 1101 por último, depois da 1110 à 1120, como a P23 manda. A 1101 aplicou sem erro, e as duas trocas por trecho acharam o trecho uma vez só.
- **pgTAP:** o `147_relatorio_baixado_sem_receber_test.sql` (46 testes) e o `041_portal_relatorios_socio_test.sql` passam. A suíte inteira passa: 131 arquivos e 4.101 testes. O `005` e o `048` só falharam com `-j4`, porque disputam o mesmo banco; rodados um por vez, passam.
- **Vitest:** `relatorios.test.ts` passa (12 testes). O `tsc` do pacote ui não acusa nada em arquivo de relatório.
- **e2e:** `next build` do portal, e depois `portal-relatorios.spec.ts` (37 passam, 1 pulado) e `portal-tabelas.spec.ts -g relatorios` (3 passam, 3 pulados), em celular e computador.

## O que está certo (conferido)

- **Regra de data.** `relatorio_baixas` corta por `feito_em` entre `p_de` e `p_ate + 1`, os dois à meia-noite de `America/Sao_Paulo`. O `dia` é o de Brasília, como em `parcela_baixada_no_dia`. A `DESFEITA` conta no dia dela, e o selo `desfeita_em` não mexe no número. O pgTAP confere outubro antes e depois do desfazer, e as 23h30 de 31/10.
- **Soma.** Só entram as linhas `BAIXA` sem custas com motivo `PERDOADA` ou `INADIMPLENCIA` (`1101:67`). A `DESFEITA` herda o motivo e a marca de custas por `desfaz_id` (`1101:57`). Renegociada e custas ficam em grupos próprios, com as desfeitas de cada um (`1101:82-92`).
- **Isolamento.**
  - Tudo filtra por `p_escritorio`: `1101:62`, `:103`, `:146` e `:149-150`.
  - Os embrulhos chamam a base primeiro, e a base faz `relatorio_entrar` (`SO_SOCIO_DONO`).
  - A api-portal passa o escritório da sessão (`app.ts:1480`, `:1490`).
  - O pgTAP confere o escritório B e o `TC404`.
- **search_path e permissões.**
  - Toda função nova tem `set search_path = public`. Só a `t1101_trocar` não tem, e ela é apagada no fim.
  - `relatorio_baixas` e `relatorio_baixado_json` não são `security definer`, e o `fechar_acesso()` tira o `service_role` delas.
  - Os embrulhos e as bases renomeadas são `security definer` e ficam com o `service_role`, no mesmo padrão da `relatorio_resumo_base` da 0555.
- **Retorno das funções.** Nenhum retorno muda: todas continuam `jsonb`, os nomes dos parâmetros e os defaults são os mesmos, e a rota da api-portal com parâmetros nomeados continua batendo. `portal_relatorio_exportar` lê `portal_relatorio_resumo` e `relatorio_por_cliente` pelo nome, já trocados.
- **Explicação.**
  - Vem só em Um cliente, só na `BAIXA`, e é nula para `EXCLUIDO` (`1101:146`, `:160`).
  - A exportação não tem o campo.
  - A exclusão (`0170:486`) já troca o nome por "Cliente excluído", então a planilha não leva o nome.
- **Tela sem a 1101.** Conferi lendo o código: a folha depende de `r.baixado?.algum`, a coluna de `c.baixado !== undefined`, o quinto número e a lista de `n.baixado` e `d.baixas?.length`, e a aba de `d.baixas`. Tudo some quando o campo não vem. Só o "Como contamos" fica, como declarado.
- **Textos.** Batem com o gerador do desenho, palavra por palavra:
  - subtítulo, pé, "Nenhuma baixa sem receber de …" e as três linhas ao lado;
  - "R$ 412,30 desfeitos" e "não tira de 15/10";
  - a frase das custas, a ordem "Baixado sem receber, do maior" e "do que mais teve baixa sem receber para o que menos teve";
  - o pé de Por cliente, o cartão ("inadimplência · não soma") e a regra do "Como contamos".
- **Acessibilidade.**
  - As linhas ao lado são `dl`, a lista é uma `ul` com `aria-label`, e os dias usam `time dateTime`.
  - "não soma" e "desfeita em" estão sempre em texto, e a coluna nova tem `aria-sort` e `data-r`.
  - O axe passou nos estados do e2e.
- **Painel.** `conferir` dá 0 erros. Os 2 avisos de ordem repetida já existiam e não são desta entrega. O F3.173 tem `refs` IN-04, IN-07 e FI-24, como pede a B7, e a P23 cobre a publicação.

## Notas

Não achei nada grave. Ficaram 2 médias e 6 baixas.

### 1. Média · O caminho de publicação (Portal antes da 1101) não tem teste

- **Evidência:**
  - `P23.json` e o `README.md` (seção "Relatórios do sócio", linha "Banco velho") publicam o Portal **antes** da 1101. Por um tempo, produção vai rodar o Portal novo sem os campos novos.
  - Os fixtures do e2e passaram a trazer sempre os campos novos: `portal-relatorios.spec.ts:51-54` (`RESUMO.baixado`) e `:58` (`cli(...)` com `baixado: 0, baixadoMotivos: []`).
  - O `portal-tabelas-telas.json` de `/financeiro/relatorios/clientes` foi trocado pela versão com a coluna.
  - Com isso, nenhum teste abre a tela sem `baixado`, sem `baixas` e sem `numeros.baixado`. As faixas antigas (`880/760/640`, `Relatorios.tsx`, a `table` de `relatorio-clientes`) também deixaram de ser medidas.
  - O único teste de "esconder" (`:341-357`) usa `algum: false`, que é outro caso.
- **Correção:**
  - Um teste e2e "banco sem a 1101", que apaga `baixado` do `RESUMO`, `baixado` e `baixadoMotivos` dos clientes, e `baixas`, `numeros.baixado` e `numeros.baixadoDesfeitas` de `UM`. Ele confere que a folha não aparece, que a tabela tem 6 colunas e não tem a opção "Baixado sem receber, do maior", que não há quinto número nem lista, e que a planilha não tem a aba nova nem as linhas da aba Números.
  - Uma entrada a mais em `portal-tabelas-telas.json`, sem a coluna, para que as faixas antigas continuem medidas.

### 2. Média · "N parcelas" conta baixas, e a mesma parcela baixada duas vezes no período conta em dobro

- **Evidência:**
  - `1101:96`: `'n', (select count(*) from b where soma)`.
  - `1101:95`, `:131` e `:152`: a soma de todas as linhas `BAIXA`.
  - `Relatorios.tsx`, `FolhaBaixado`: `contar(b.n, "parcela", "parcelas")`.
  - Se a parcela tem baixa, é desfeita e tem baixa de novo no mesmo período, a folha mostra "R$ 2.000,00 · 2 parcelas" para uma parcela de R$ 1.000,00, com "Baixas desfeitas R$ 1.000,00" ao lado. A coluna de Por cliente e o quinto número de Um cliente também dobram.
  - O valor bruto segue a decisão B2.2 ("soma do valor das linhas BAIXA… nunca fica negativo"). O que engana é o rótulo "parcelas", e ninguém decidiu o caso de baixa feita de novo.
- **Correção (a menor):**
  - `n` passa a contar as parcelas distintas: `count(distinct parcela_id) filter (where soma)`, também no `grupo`.
  - Um caso no pgTAP 147: baixa, desfazer e baixa de novo no mesmo mês.
  - Levar à Carol se o valor dobrado deve ficar, porque é a regra do plano, ou se deve contar só a última baixa em vigor. Enquanto isso, o mínimo é o texto não dizer "2 parcelas".

### 3. Baixa · Cliente só com baixa: sem área, sem responsável, e contado como "com contrato no período"

- **Evidência:**
  - `1101:126` põe o cliente em `ids` só pela baixa.
  - Em `relatorio_por_cliente` (`0410:388-397`), `areas`, `responsaveis` e `contratos` vêm de `ent`, `ab` e `ctr`. Para o Xavier do pgTAP 147, isso dá `[]`, `[]` e `0`.
  - Na tela, o filtro "Área" esconde esse cliente (`filtrarClientes`).
  - O status diz "N clientes com contrato no período" (`Relatorios.tsx`, `re-cont`) contando ele.
- **Correção:**
  - Em `areas`, acrescentar `union select area from bx where soma and cliente_id = k.id`.
  - Em `responsaveis`, acrescentar o `responsavel_id` de `bx`.
  - Ou trocar o texto para "no período" quando a lista tem cliente sem contrato.

### 4. Baixa · Num período sem baixa, a comparação some mesmo quando o período anterior teve baixa

- **Evidência:** `Relatorios.tsx`, `FolhaBaixado`: com `nada`, só aparece "Nenhuma baixa sem receber de …", e `b.anterior` é ignorado. Novembro sem baixa, comparado com outubro, que teve R$ 2.050,00, não mostra "R$ 2.050,00 em out.".
- **Correção:** mostrar a linha `rb-cmp` também no ramo `nada` quando `b.anterior` é maior que zero. O desenho (`rb-visao-nenhuma`) só mostra o caso com zero dos dois lados, então isso não contraria o desenho.

### 5. Baixa · Aba "Números": as desfeitas da renegociada e das custas não vão, e as linhas saem zeradas para quem nunca teve baixa

- **Evidência:** `relatorios.ts`, `linhasBaixado` e a chamada `...(r.baixado ? linhasBaixado(r.baixado) : [])`. Saem só `renegociado.valor` e `custas.valor`, sem `desfeitas`, que a folha mostra ("R$ 412,30 desfeitos"). Com a 1101, `r.baixado` sempre vem, e um escritório com `algum: false` ganha 4 linhas de R$ 0,00.
- **Correção:**
  - Condicionar a `r.baixado?.algum`, como a folha.
  - Acrescentar a coluna ou a linha "desfeitos" para a renegociada e as custas, ou registrar que a planilha não leva esse detalhe.

### 6. Baixa · Desvios declarados (`baixaEm` e `soma`): aceitos, com uma simplificação

- **`soma`** evita repetir a regra na tela e na planilha. Está certo.
- **`baixaEm`** é necessário para "não tira de 15/10" do desenho. Está certo.
- **Evidência:** `1101:158-159` refaz a autojunção `parcela_baixas d join parcela_baixas o` para cada linha, quando `relatorio_baixas` já tem `o` em mãos (`1101:61`).
- **Correção (opcional):** devolver `baixa_em` de `relatorio_baixas` (`case when b.tipo = 'DESFEITA' then (o.feito_em at time zone 'America/Sao_Paulo')::date end`) e usar `b.baixa_em` no embrulho.

### 7. Baixa · Desvios declarados: linhas zeradas escondidas e faixas 960/720/560 (aceitos)

- **Linhas com valor zero escondidas** (`FolhaBaixado`, as condições `b.desfeitas.n`, `b.renegociado.n || …` e `b.custas.n || …`). O desenho só tem o caso com as três linhas cheias, e o plano não pede linha de R$ 0,00. Cada linha que aparece continua com o texto do desenho e com "não soma" onde o desenho tem. Aceito.
- **Faixas 960/720/560** (`Relatorios.tsx`, `data-sai3`, `data-sai2` e `data-cartoes` quando há a coluna):
  - O `data-sai3` subiu de 880 para 960 por causa da sétima coluna.
  - O `sai2` e o `cartoes` desceram, porque `.rb-tab thead th{white-space:normal}` deixa os títulos quebrarem (decisão 9 do `NOTAS.md`). Com as duas colunas de nível 3 fora, a tabela tem as mesmas 5 colunas de antes, mas com títulos que quebram.
  - O `portal-tabelas.spec.ts` (função `faixas`) passa em N e em N − 1, com dados longos. As regras CSS dos três valores existem.
  - A ordem no `prioridades.json` segue a B3.
  - Ressalva: o teste confere que nada transborda, mas não confere se a faixa está justa. Aceito.

### 8. Baixa · Outros pontos pequenos

- **"Como contamos" sem a 1101.** Mostra a regra de um número que não aparece (declarado no README). Aceitável por pouco tempo, porque a P23 aplica a 1101 logo depois do Portal.
- **Esqueleto de carregando.** Sempre mostra a folha "Baixado sem receber" (`Carregando`, `t-c5`), e a folha some quando chega `algum: false`, o que mexe o layout. É o que o plano pede. Fica só o registro.
- **Desempenho.** `relatorio_baixas` é `language sql` com `set search_path`, e por isso não é expandida dentro de quem a chama. Em Um cliente, ela traz todas as baixas do escritório no período e só depois filtra pelo cliente (`1101:149-150`). Com o índice `parcela_baixas_dia`, isso é barato no tamanho de hoje, e não pede nada agora.

## Trocas por trecho e ordem em produção

- **`portal_relatorio_resumo`.** O trecho `  return jsonb_set(v, '{falta,aparte,caminho}'` aparece só no embrulho da 0555, e nenhuma migration depois dela muda essa função.
- **`relatorio_por_cliente`.** Os dois trechos (o CTE `ids` e a linha `'aparte'`) só existem na 0410, e nada depois a troca. A 1010 troca `relatorio_abertas`, `relatorio_adiantadas` e `relatorio_contratado`, mas não esta.
- **A 1100** não mexe em nenhuma dessas funções.
- **A ordem de produção.** Apliquei a 1101 depois da 1120, e ela passou. Se o trecho não aparecer exatamente uma vez, `t1101_trocar` para a migration inteira, porque ela roda numa transação. O `alter function … rename` também falha se `relatorio_cliente_base` ou `relatorio_exportar_base` já existirem, como a P23 manda conferir.

## O que foi aplicado

Aplicado pelo autor no branch `claude/f3-173-baixado-relatorios`, depois do merge da `origin/main` (P22 feita). A 1101, o pgTAP 147 e a P23 continuam livres na main.

- **Nota 1, aplicada:**
  - O e2e "banco sem a 1101" (`portal-relatorios.spec.ts`) tira os campos novos do resumo, dos clientes, de Um cliente e da exportação. Ele confere que a folha não aparece, que a tabela tem 6 colunas, que a ordem "Baixado sem receber" e o pé não aparecem, que não há quinto número nem lista, e que a planilha não leva a aba nova nem as linhas. Também confere que o "Como contamos" continua com a regra.
  - `portal-tabelas-telas.json` ganhou a tela "/financeiro/relatorios/clientes (banco sem a 1101)", que é a entrada da main sem a coluna, com as alturas da main (396 a 1024 e 413 a 1280). As faixas antigas, 880/760/640, voltam a ser medidas, e `portal-tabelas` e `portal-tabelas-toque` passam nela.
- **Nota 2, aplicada no rótulo. O valor ficou como manda o plano:**
  - O `n` agora conta parcelas distintas: `count(distinct parcela_id)`, no número e nos grupos.
  - O pgTAP 147 tem o caso de janeiro: baixa em 05/01, desfeita em 06/01 e baixa de novo em 07/01. Dá `n = 1`, valor R$ 2.000,00 e desfeitas `{n: 1, valor: R$ 1.000,00}`.
  - O valor segue bruto, como manda a B2.2, pelo mesmo motivo do desenho aprovado (`rb-cliente`): uma baixa desfeita dentro do próprio período também não sai do número. Ela fica ao lado, em "Baixas desfeitas no período · voltaram para A receber".
  - Por isso a folha mostra "R$ 2.000,00 · 1 parcela", com "Baixas desfeitas no período R$ 1.000,00" ao lado. O número não esconde nada: cada baixa feita está nele, e o desfazer aparece na mesma folha. Um cliente mostra o mesmo valor, com "R$ 1.000,00 de baixas desfeitas no período", e a lista tem as três linhas.
  - O que pode enganar é a coluna de Por cliente, que mostra só o bruto. Fica a pergunta à Carol: contar só a baixa em vigor no fim do período? Isso pede texto novo e mexe na regra aprovada, então não foi feito.
- **Nota 3, aplicada:**
  - Em `relatorio_por_cliente`, `responsaveis` e `areas` ganham o responsável e a área do contrato da baixa, com mais duas trocas por trecho exato que aparecem uma vez só na 0410. Xavier agora tem responsável e área, e o pgTAP confere os dois.
  - O "com contrato no período" ficou: o texto é do desenho, e o cliente só com baixa é raro.
- **Nota 4, aplicada.** Num período sem baixa, a linha `rb-cmp` aparece quando o período anterior teve baixa ("R$ 2.050,00 em out."), e não aparece quando os dois são zero (`rb-visao-nenhuma`). Há um e2e para cada caso.
- **Nota 5, aplicada:**
  - As linhas da aba Números dependem de `algum`.
  - A aba ganha "renegociado desfeito no período" e "custas desfeitas no período", só quando houve desfeita. O vitest cobre isso.
- **Nota 6, aplicada.** `relatorio_baixas` devolve `baixa_em`, e o embrulho de Um cliente usa esse campo sem refazer a autojunção.
- **Notas 7 e 8:** só registro, sem mudança.
- **Testes rodados de novo:**
  - pgTAP 147 (51 testes) e 041, num banco novo com todas as migrations: passam.
  - vitest `relatorios.test.ts`: 13 testes passam.
  - e2e `portal-relatorios`: 41 passam e 1 é pulado.
  - e2e `portal-tabelas` com `portal-tabelas-toque`: 160 passam e 68 são pulados.
  - lint dos arquivos mexidos: 0 erros.
  - `tsc` do ui: só os erros que já existiam, em `css.test.ts` e `agenda.test.ts`.
