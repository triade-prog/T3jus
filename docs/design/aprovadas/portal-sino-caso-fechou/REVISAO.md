# Revisão do plano do F3.150 (aviso no sino quando o caso é encerrado no financeiro)

**Revisão independente do `PLANO.md` v1, 24/11/2026.** Conferi cada afirmação no código do `main` (último merge em 24/11, 08h32) e nas branches abertas. Item: `docs/painel/dados/fases/F3/F3.150.json`.

## Resumo

O plano está bem fundamentado. O momento de nascer (fim da transação), a ordem fechamento → contratos, os grupos de quem recebe, as permissões e os destinos do clique batem com o código. Há **7 ajustes obrigatórios**:

- o teste 135 do F3.147 quebra;
- o nome do campo "agora" não bate entre o servidor e a tela;
- "O fechamento do caso terminou" contradiz a ficha do cliente;
- a pergunta 5 promete aviso a quem não vai receber;
- o padrão de teste do pgTAP precisa adiar a restrição nova;
- falta o teste do commit como `service_role`;
- o e2e foge do padrão do repositório.

Há também 9 sugestões. A principal: dispensar a anotação em dois tempos, porque aqui basta um único gatilho adiado com `NEW`.

## O que confere (sem ajuste)

- **A ordem fechamento → contratos.** A versão com `p_contratos` chama a de 0512 primeiro (`0852_jornada_encerrar_cadeia.sql:59`) e só depois encerra cada contrato (`0852:65-73`). Um gatilho imediato em `fechamentos_caso` veria o contrato ainda ativo. O adiado resolve, e a chamada pela API é uma transação só (`app.ts:1190-1196`, um `rpc`).
- **Grupo A = a mesma regra de quem encerra.** `'CONTRATOS' = any(areas_da_pessoa(...)) and pode(..., 'contratos.editar')` aparece em `0852:39` e em `0900:190-191` (`quemEncerraContratos`). `contratos.editar` vale para `SOCIO` e `EQUIPE` (`0200_portal_contratos.sql:15-16`), então a área é o que de fato separa. Todo sócio tem as quatro áreas (`0140_portal_equipe.sql:86-96`).
- **Grupo B.** `casos.responsavel_id` é obrigatório (`0240:71`). Quem sai passa só os casos em andamento (`0240:537-538`), então o caso encerrado guarda a responsável antiga. Faz sentido conferir o vínculo ativo.
- **Os destinos abrem.**
  - `ROTAS_PASSO.encerrarContrato` = `/contratos/contratos/:id?encerrar=1` (`fichaLigada.ts:27`), e a ficha abre a janela sozinha quando o contrato está `ATIVO` (`FichaContrato.tsx:650-657`).
  - `ROTAS_JURIDICO.caso` existe (`juridico.ts:14`).
  - `clientes.ver` vale para as duas funções (`0160:12-13`).
  - A Moldura já tem `escritorio.areas` (`Moldura.tsx:307`) e monta o `PainelSino` (`Moldura.tsx:458`).
- **PT-02.** Os números dos contratos e "encerrado no financeiro, por quem, quando" já chegam a todos pelo passo da ficha do cliente. Em `cliente_fechamento`, `contratos`, `em` e `por` não dependem de `p_valores` (`0900:300-302` e `0900:326-336`). O aviso não acrescenta nada que a pessoa não veja.
- **Não existe desfazer.** `fechamentos_caso_so_acrescenta` está em `0512:19-20`, e nenhuma função apaga a linha.
- **Casos antigos.** Um gatilho novo não dispara para linhas que já existem, então não há aviso retroativo. A migration não precisa de nada a mais.
- **Numeração.** Nenhuma branch tem migration acima da 1000 nem pgTAP acima do 136, e o 132 está vago. A 1020 e o 137 estão livres hoje. As threads abertas junto (F3.139, F3.155, F3.160, F3.162, F3.165) podem disputar o pgTAP 137, porque o pgTAP não tem faixa reservada. Por isso é preciso conferir no dia do commit, como o plano já diz.
- **"Agora:" sem recalcular é viável.** São buscas em `contratos` pela chave primária, com ids gravados em `dados`, dentro de `portal_avisos`, que é `security definer` (`0390:131-148`). Nada chama `caso_acerto`.

## Ajustes obrigatórios

### 1. O teste 135 do F3.147 quebra

- **Problema.** O teste 135 encerra o caso "Carvalho x Construtora Lume" com a versão sem contratos e conta todos os avisos do caso, sem filtrar por tipo. Com o F3.150, Felipe (Contratos, contrato ainda ativo) e Larissa (responsável, sem Financeiro) passam a receber o aviso novo. A contagem sobe de 2 para 4. O plano diz só que "o pgTAP 135 precisa continuar passando" e cita apenas a política do histórico.
- **Evidência.**
  - `tests/pgtap/135_sino_caso_pronto_fechar_test.sql:156`: `count(*) from avisos_sino s, cs where s.origem_id = cs.a` = 2, "encerrar não manda aviso novo";
  - o encerramento em `135:150` usa a versão sem `p_contratos`;
  - Larissa é a responsável do caso (`135:57`), e Felipe tem `CONTRATOS` (`135:26`).
- **Correção.**
  - Na seção 7.4, acrescentar a mudança no 135: o teste da linha 156 passa a filtrar `tipo = 'CASO_PRONTO_FECHAR'`, mantendo a intenção ("encerrar não manda aviso de pronto novo").
  - Rodar a suíte inteira, não só o 137.
  - Procurar outras contagens sem filtro de tipo depois de encerrar o caso. Hoje só o 135 lê `avisos_sino` entre os testes que encerram caso (053, 120, 121, 130, 131, 135).

### 2. O campo do "agora": o servidor e a tela usam nomes diferentes

- **Problema.** A seção 3.2 diz que `aviso_sino_linha` ganha "o `agora`" para o tipo novo. A seção 7.2 diz que `AvisoSino` ganha `agoraFechou?`, "separado do `agora` do F3.147". A chave do JSON que o servidor manda tem de ser a que o TypeScript lê.
- **Evidência.** `0990:678-682` grava a chave `agora`. `domain/src/avisos.ts:120` tipa `agora?: AgoraCasoPronto`.
- **Correção.** Escolher uma das duas saídas e escrever no plano:
  - o servidor grava `agoraFechou` (recomendado: os tipos não se misturam e o `AgoraCasoPronto` fica intacto);
  - ou o servidor grava `agora`, e o TypeScript vira uma união conforme o `tipo`.

  O Vitest e o `app_test.ts` cobrem a chave escolhida.

### 3. "O fechamento do caso terminou" pode contradizer a ficha do cliente

- **Problema.** No grupo B, a frase "O fechamento do caso terminou." e o selo `ok` "Fechado" saem quando não há contrato em `abertos`. Mas `abertos` usa `caso_contratos_encerraveis`, que **exclui** o contrato ativo que segue com outro caso em andamento (`0852:18-24`). O passo "Encerrar o contrato" da ficha do cliente conta **todo** contrato `ATIVO` do cliente no caso. Assim, com um contrato em `seguem`, o aviso diz "terminou" e a ficha continua mostrando "Encerrar o contrato" pendente e `pendente: true`.
- **Evidência.**
  - `0900:300-305`: `feito = jsonb_array_length(v_cts) = 0`, com `v_cts` = contratos `ATIVO` do cliente no caso, sem olhar outro caso;
  - `0900:338`: `pendente`.
- **Correção.**
  - "O fechamento do caso terminou." e o selo "Fechado" só saem quando `abertos` **e** `seguem` estão vazios.
  - Com `seguem`, a frase da pergunta 4 fica no lugar de "terminou", com selo neutro (por exemplo, "Contrato segue").
  - O `agora` do grupo B só diz "o fechamento do caso terminou" quando os de `abertos` foram encerrados **e** não há `seguem`.
  - No pgTAP, conferir com `cliente_fechamento(...) ->> 'pendente'` que o aviso e a ficha concordam.

### 4. Pergunta 5: a promessa "você recebe um aviso" seria falsa para parte de quem a lê

- **Problema.** A pergunta 5 propõe devolver "Você recebe um aviso no sino quando o caso fechar." à ficha do cliente "para quem não tem o Financeiro". Mas o aviso vai só para a responsável e para quem tem Contratos. Uma advogada do Jurídico que não é a responsável lê a promessa e não recebe nada. A ficha também não sabe quem é a responsável: `cliente_fechamento` não devolve `responsavel` (`0900:336-340`). Falta ainda o outro texto que perdeu a promessa: a janela do Diego (`encerrar-sem-contratos`), comum à ficha do repasse e à do contrato. Ver `docs/design/aprovadas/portal-fechamento-sem-levantamento/NOTAS.md:82`, decisão 10: "Não há a promessa 'recebem o aviso'", e `REVISAO.md:88-95` dessa pasta, ajuste 11.
- **Correção.**
  - Escrever a promessa na terceira pessoa, sem depender de quem lê:
    - ficha do cliente: "A responsável pelo caso recebe um aviso no sino quando ele for encerrado no financeiro.";
    - janela do Diego: "Quem encerra é a área Contratos (Marina e Felipe), no passo 'Encerrar o contrato' da ficha de Noemi. Eles recebem um aviso no sino."
  - Deixar a pergunta à Carol cobrindo os dois textos.
  - Se ela disser sim, os estados são dois (`fecha-larissa` e `encerrar-sem-contratos`, este na janela comum), e o e2e da ficha do repasse muda junto. Escrever isso nas seções 6 e 7.3.

### 5. O pgTAP 137 precisa manter a restrição nova adiada

- **Problema.** O plano diz "cada passo chama `set constraints all immediate` antes de ler o sino". O padrão do repositório faz mais: depois de `all immediate`, **volta a adiar** as restrições nomeadas (`135:31-35`, `pg_temp.fim()`). Sem incluir `caso_fechou_fim` nessa lista, depois do primeiro `fim()` a restrição nova fica imediata. Ela então dispara na inserção do fechamento, **antes** de a cadeia encerrar os contratos. O teste reproduziria o defeito que o plano quer evitar, ou passaria por acaso.
- **Correção.**
  - O `pg_temp.fim()` do 137 volta a adiar `caso_fechou_fim`, junto com as de 0990.
  - Escrever um teste que **prova** a ordem: encerrar em cadeia e, só depois do `fim()`, conferir que ninguém do grupo A recebeu e que `juntos` traz o contrato.
  - O 135 não precisa adiar a restrição nova (ele não usa a cadeia), mas o ajuste 1 vale.

### 6. Falta o teste do commit de verdade como `service_role`

- **Problema.** `caso_fechou_fim` é `security definer` pelo mesmo motivo do `caso_pronto_fim`: no Postgres 17, o adiado roda com o papel ativo no commit. O F3.147 provou isso com um commit real como `service_role` (teste 22 do 135, `135:429`; README, `sistema/README.md:360`). O F3.163 está pendente justamente porque outra restrição adiada (`destinacoes_fecham`) falha nesse caminho (`F3.163.json`). A seção 7.4 não traz esse teste.
- **Correção.** Acrescentar ao 137 o teste no molde do 22 do 135: encerrar em cadeia pela função da API como `service_role`, com commit, e conferir os avisos e o histórico interno sem `financeiro.caso_fechou_falhou`.

### 7. O e2e foge do padrão do repositório

- **Problema.** A seção 7.4 descreve um e2e de ponta a ponta: Diego encerra, Felipe abre o sino, encerra, e Larissa confere. Os e2e do Portal simulam a API com `page.route`, e quem recebe fica no pgTAP. O irmão faz assim (`tests/e2e/portal-sino-caso-pronto.spec.ts:1-6` e `:92`).
- **Correção.** Fazer o e2e com a API simulada, no molde do `portal-sino-caso-pronto.spec.ts`:
  - os estados `sf-*`, no celular e no computador, com axe;
  - o clique que marca lido e leva a `/contratos/contratos/:id?encerrar=1`, com a janela aberta;
  - o "Agora:" depois do encerramento;
  - o nome acessível com o `paraLeitor`;
  - o destino do grupo B com e sem Jurídico.

  Quem recebe e quem não recebe fica no pgTAP 137.

## Sugestões

### 8. Um gatilho só, sem anotação

- **Problema.** O molde em dois tempos do F3.147 existe porque lá vários eventos de várias tabelas viram uma conferência por caso (`0990:22-36`). Aqui o evento é um só: a inserção em `fechamentos_caso`, uma vez por caso (`caso_id` único, `0512:14`). Uma restrição adiada por linha já recebe `NEW`, com `caso_id`, `escritorio_id` e `fechado_por`. A anotação em `t3jus.casos_fechados` e o `caso_fechou_anotar` não fazem nada que `NEW` não faça.
- **Correção.** Usar só `create constraint trigger caso_fechou_fim after insert on fechamentos_caso deferrable initially deferred for each row execute function caso_fechou_fim()`, `security definer`, lendo `NEW`. Menos código, menos teste e nenhuma configuração local para esvaziar.

### 9. "Juntos" pela data exata, sem a regra de 1 minuto

- **Problema.** O plano dá duas regras alternativas para `juntos`: o histórico `contrato.encerrado_com_caso`, ou `encerrado_em` até 1 minuto depois. A cadeia corre na mesma transação, e `app_now()` é `now()` mais o ajuste do relógio (`0003:45-48`). Por isso `contratos.encerrado_em` (`0200:543`) é **igual** a `fechamentos_caso.fechado_em`.
- **Correção.**
  - `juntos` = contratos ligados ao caso com `encerrado_em = NEW.fechado_em`;
  - `jaEncerrados` = os com `encerrado_em < NEW.fechado_em`.

  É uma regra só, exata e sem ler o histórico.

### 10. A responsável com Financeiro e contrato aberto

- **Problema.** Pela regra da seção 2.3, a responsável só do grupo B que tem o aviso de "pronto" visível não recebe. O "Agora:" do aviso de "pronto" diz só "encerrou no financeiro" (`Sino.tsx:94-98`). Ele não diz que o C-… ficou aberto, então ela perde essa informação.
- **Correção.**
  - Aplicar a exceção só quando `abertos` está vazio.
  - Com contrato aberto, ela recebe, porque é informação nova. É a mesma lógica da pergunta 1.
  - No pgTAP, testar a pessoa que foi autora da última ação no Financeiro (`autorFora`, `0990:176`): ela não recebeu o aviso de "pronto", então recebe este.

### 11. A política do histórico: irmã, e não recriada

- **Problema.** Recriar `caso_pronto_historico` (`0990:197-200`) obriga a copiar o `with check` inteiro e mexe no F3.147.
- **Correção.** Criar uma política irmã (`caso_fechou_historico`), com marca própria (`t3jus.caso_fechou_historico`) e uma `caso_fechou_registrar` no molde de `0990:202-215`. O F3.147 fica intocado.

### 12. Destino do grupo A também pelas áreas da sessão

- **Problema.** No grupo B, o destino já sai das áreas da sessão. Quem perde Contratos depois do aviso cai na recusa de área.
- **Correção.** Com o mesmo parâmetro `areas`: sem `CONTRATOS`, o destino vira "Ver a ficha de ‹cliente›" (`/clientes/:id`), como no grupo B. Uma regra só para os dois grupos.

### 13. O "agora" confere o escritório e o contrato que passou a seguir com outro caso

- **Problema.** Um contrato de `abertos` pode ganhar depois outro caso em andamento. O aviso continuaria pedindo "Encerre o contrato", e encerrar cancelaria parcelas que agora pertencem ao outro caso.
- **Correção.**
  - Em `caso_fechou_agora`, ler cada contrato com `escritorio_id = a.escritorio_id` (defesa).
  - Quando o contrato tem outro caso em andamento, tratá-lo como "segue": tira a frase "Encerre", põe um selo neutro e leva a "Ver o C-…". É uma busca por índice em `caso_clientes`.

### 14. Data sem hora: função nova

- **Problema.** `quandoEncerrouNoFinanceiro` sempre põe a hora (`domain/src/avisos.ts:153-164`). O plano diz "sem a hora", mas não diz onde a regra fica.
- **Correção.** Criar uma função irmã no domínio (por exemplo, `quandoDia`: "hoje", "ontem", "em 19/11"), com teste. Sem ela, cada tela escreve a sua.

### 15. Textos para advogados leigos

- "Falta encerrar o C-2026-031, com a área Contratos." soa estranho. Usar o texto já aprovado na janela do Diego: "Quem encerra o C-2026-031 é a área Contratos (Marina e Felipe)." Os nomes saem da regra do grupo A, gravados em `dados`, como o `quemEncerraContratos` de `0900:186-191`.
- No grupo A, o título não diz o que fazer, e é o título que se lê ao passar os olhos pela lista. Sugerir à especialista: "Falta encerrar o C-2026-012: o caso ‹nome› foi encerrado no financeiro". Ou manter o título e confiar no selo "Falta o contrato". Fica para a especialista e a Carol.
- "e o C-2026-012 junto" pede vírgula e verbo: "Marina Ribeiro encerrou o caso no financeiro e, junto, o contrato C-2026-012."
- Detalhes do plano:
  - a seção 4 cita `nomesClientes`, mas nenhuma frase das seções 4.1 e 4.2 usa os nomes dos clientes do caso, e `clientes`/`maisClientes` não estão nos `dados` da seção 3.1. Tirar a menção, ou dizer onde entram;
  - a seção 0 diz que o F3.147 criou a origem `casos`, mas ela já existia (`0640:114`, `0740:31`).

### 16. Elenco: o C-2026-013 já está encerrado na história aprovada

- **Problema.** No estado `sf-varios`, o plano usa o caso Carvalho com o C-2026-013 aberto, "se a história deixar". Ela não deixa: no aprovado, o C-2026-013 aparece "já encerrado em 12/11" (`portal-fechamento-sem-levantamento/NOTAS.md`, estado 8).
- **Correção.** Usar um caso fictício novo para dois e para três contratos (o plano já tem os Nogueira) e deixar o Carvalho com um contrato aberto.

## Perguntas para a Carol

As perguntas 1, 3 e 4 estão certas e em linguagem simples. Ajustes:

- **Pergunta 2:** reescrever sem "aviso visível nos 30 dias", que é detalhe técnico. Sugestão: "A responsável pelo caso que também cuida do Financeiro já foi avisada quando o caso ficou pronto, e esse aviso já mostra que ele foi encerrado. Ela recebe outro aviso? Recomendo que só receba se algum contrato ficou aberto." Isso junta o ajuste 10.
- **Pergunta 5:** reescrever pelo ajuste 4. Sugestão: "Com o aviso pronto, voltam as frases que prometem o aviso, na ficha do cliente ('A responsável pelo caso recebe um aviso…') e na janela de encerrar de quem não tem Contratos ('Eles recebem um aviso no sino')? Recomendo que sim."

## Escopo

O plano não infla o item. Não cria tabela nova, não cria rotina diária, não muda o motivo da janela do contrato, e a variação com levantamento fica para a Carol decidir. Só a pergunta 5 mexe em telas aprovadas, e ela vem da decisão 16. Se a Carol disser sim, essas telas entram neste item, com desenho e e2e (ajuste 4). Os `refs` EX-16 e EX-17 estão certos. Pelo cabeçalho da 0990, cabe citar também PT-02 e PT-10 no histórico.
