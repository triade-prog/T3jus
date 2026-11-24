# Portal: baixa de parcela vencida sem receber, com motivo · plano do desenho (v2)

**Situação.** Esta é a versão 2. Ela incorpora a `REVISAO.md` de 24/11/2026 (veredito "seguir para o desenho depois de um plano v2", 21 notas, 4 que bloqueiam). Conferi cada nota no código: aplico 18 inteiras e 3 com mudança, e não recuso nenhuma. O que fiz com cada uma está na seção 8. Ainda não há `index.html` nem capturas.

**O que pede.** É o item **F3.139** do painel ("Baixa de parcela vencida sem receber, com motivo, para que o caso que não vai receber feche no financeiro"). Atende a ideia **FI-24** e cita **FI-08** (o fechamento passa a valer com "tudo recebido ou baixado com motivo") e **EX-16** (o passo "Encerrar no financeiro" deixa de travar para sempre). Também pesam:
- **FI-02**: recebimentos e baixas. No T3jus, "baixa" já quer dizer "recebido", por isso o texto diz sempre "baixa **sem receber**" (nota 9);
- **FI-04**: a cobrança da parcela (motivo do atraso, próxima ação) fica no histórico;
- **IN-04** e **IN-07**: os relatórios de vencidos e de atraso por idade não podem reescrever o passado;
- **PT-02**: cada pessoa vê o mínimo; **PT-03**: nada é apagado; **PT-10**: WCAG 2.2 AA, celular, vazio e erro.

**De onde vem.** Da pergunta 2 de `docs/design/aprovadas/portal-fechamento-sem-levantamento/NOTAS.md`, aprovada pela Carol em 22/11/2026 às 23h28: "Dar baixa sem receber", com motivo (perdoada, inadimplência ou renegociada), só para quem tem `financeiro.editar`. Hoje não há como tirar uma parcela vencida de "Em atraso" sem dinheiro:
- `contrato_cancelar_futuros` só cancela a partir de uma data e nunca a parcela com recebimento (`0220_portal_financeiro_receber.sql:98-112`);
- encerrar o contrato cancela só as parcelas de amanhã em diante (`0200_portal_contratos.sql:547`).

O texto aprovado da janela de pendência diz isso com todas as letras, e terá de mudar (`packages/ui/src/portal/fechamento.ts:44-46`).

**Base do desenho.** A ficha do contrato em Financeiro › A receber, como ficou em `portal-fechamento-sem-levantamento` (estados `contrato-pendente`, `fechar-bloqueado`, `contrato-pronto` e `encerrar`), e o padrão da janela "Não foi paga" de `portal-nao-paga-logo`: o que vai acontecer antes de pedir, motivo obrigatório, conflito com quem e quando, e o caminho de volta com motivo e anotação de cobrança. As peças novas levam o prefixo `bx-`.

Nas referências curtas, `0220:308` quer dizer `sistema/supabase/migrations/0220_portal_financeiro_receber.sql`, linha 308. Os `.tsx` e `.ts` estão em `sistema/packages/`.

## 1. Os casos fictícios

O elenco e o "hoje" são os de sempre: Ribeiro & Matos, quarta-feira, 18/11/2026, 10h12.
- **Com Financeiro:** Marina Ribeiro (sócia dona, também com Contratos), Diego Almeida (Comercial e Financeiro, sem Contratos) e Bianca Torres (Financeiro).
- **Sem Financeiro:** Felipe Matos (Comercial, Contratos e Jurídico) e Larissa Costa (só Jurídico).

**A. A perda, continuada: "Carvalho x Construtora Lume"** (o caso aprovado em `portal-fechamento-sem-levantamento`).
- **Noemi Bastos Carvalho, C-2026-012:** as parcelas 1 a 5 estão pagas. A **6/6, de R$ 1.000,00, venceu em 10/11**, há 8 dias. Felipe encerrou o caso com perda em 06/11.
- **A cobrança da 6/6:** Diego anotou em 13/11 "Noemi disse que não vai pagar porque perdeu a ação", com a próxima ação "Falar com Marina", hoje. A parcela está na régua "Parcela em atraso" do escritório, esperando o passo de 15 dias.
- **As custas adiantadas:** R$ 412,30, que vão junto com a 6/6. Como é a última parcela de Noemi, com a baixa as custas ficam sem parcela, "a reembolsar, em A pagar" (nota 5).
- **Cláudio Carvalho, C-2026-013:** tudo pago, e o contrato foi encerrado em 12/11.
- **A história:** Marina decide não cobrar a 6/6. Escolhe "Inadimplência" e escreve "Noemi recusou pagar depois da perda; não vamos cobrar na Justiça". Com o sim da pergunta 4, as custas vão juntas na mesma baixa, e o caso fica pronto para encerrar.

**B. A parcela paga em parte, renegociada: Sebastião Lopes, C-2026-019** (nome novo). O contrato está vigente e não tem caso encerrado.
- **A parcela:** mensalidade de outubro, de R$ 900,00, que venceu em 05/10. Ele pagou R$ 400,00 em 20/10 (recibo 2026-061), e faltam R$ 500,00.
- **As custas:** R$ 86,40 de cópias e autenticações iam junto com a mensalidade de outubro. Com a baixa, passam a ir com a de novembro (nota 5).
- **A combinação:** Diego combina com Sebastião, por telefone, um parcelamento novo de "2 × R$ 250,00, em dezembro e janeiro". No T3jus, isso é uma **condição nova** do contrato, "Parcelado", criada em Contratos (nota 10b).
- **A baixa:** Diego dá baixa do saldo com "Renegociada". Ele não tem Contratos; quem muda as condições é Marina ou Felipe.

## 2. Decisões

### 2.1 Onde a ação aparece, quem vê e o nome

1. **Na linha da parcela vencida, na tabela "Parcelas" da ficha do contrato** em Financeiro › A receber › contrato.
   - **A coluna das ações (nota 8).** Hoje a última coluna se chama "Recibo", com 17% da largura (`Financeiro.tsx:1143`). Ela mostra o recibo e o comprovante quando a parcela tem pagamento, e só mostra o "Registrar" compacto quando não tem nenhum (`Financeiro.tsx:1164-1184`). A coluna passa a se chamar **"Recibo e ações"** e ganha largura (Situação de 28% para 24%, a última coluna de 17% para 21%). Nela, uma abaixo da outra, ficam: o recibo e o comprovante, "Registrar" (quando já existe hoje) e **"Dar baixa sem receber"**. No celular, a tabela vira cartões (`data-cartoes="560"`), e cada botão ocupa a largura do cartão.
   - **Quando o botão aparece:** só na parcela vencida, que é a situação `VENCIDA`. Ela inclui a vencida paga em parte, porque `parcela_situacao` põe `VENCIDA` antes de `PARCIAL` (`0220:123-133`).
   - **A parcela a vencer não tem o botão.** Para parar de cobrar o futuro, o caminho é encerrar o contrato ou mudar as condições, em Contratos. As duas coisas já cancelam as futuras com motivo (`0200:516`, `0200:547`).
   - **Tamanho:** este desenho usa 44 px nos botões novos. O **F3.165**, que leva as ações das tabelas de 36 px para 44 px, ainda está pendente. As notas do desenho dirão que o resto da tabela segue a 36 px até lá (nota 20).
2. **Na janela de pendência do fechamento** (o `fechar-bloqueado` aprovado).
   - Na linha `PARCELA` deste contrato, o atalho principal continua "Registrar recebimento da parcela 6/6". Entra um segundo atalho, secundário, **"Dar baixa sem receber"**, que abre a mesma janela.
   - Na linha `PARCELA` de outro contrato, o atalho continua "Abrir o contrato de Noemi".
   - O texto de ajuda muda (seção 5).
3. **Não entra na lista de A receber nem no âmbar "Em atraso".** A lista serve para registrar e cobrar em série. Dar baixa é a decisão sobre uma parcela, com o contrato à vista. O âmbar (`Financeiro.tsx:888-905`) segue com um só botão principal.
4. **Quem vê o botão:** quem tem a área Financeiro e `financeiro.editar`. Hoje `SOCIO` e `EQUIPE` têm `financeiro.editar` (`0220:12-14`), então são Marina, Diego e Bianca (pergunta 1).
   - **Quem não tem a área Financeiro** (Felipe, Larissa) não entra na ficha do Financeiro (`0220:241`).
   - **Em Contratos › contrato › Recebimentos**, a aba de hoje mostra o motivo do cancelamento **a todos**: o servidor manda `cancelado.motivo` sem olhar a área (`0600_nao_foi_paga.sql:370`), e a tela risca a linha e escreve "Cancelado: {motivo}" (`FichaContrato.tsx:506`, `:523`). A decisão 26 trata isso (nota 2).
   - **Quem tivesse `financeiro.ver` sem `financeiro.editar`:** não existe hoje, como explicado no plano do fechamento, seção 7. Se um dia existir, a linha mostra a baixa sem os botões, e o pé da tabela diz "Quem dá baixa: Marina Ribeiro, Diego Almeida ou Bianca Torres". Fica só nas notas.
5. **Nomes** (nota 9: "sem receber" vai sempre junto).
   - Botão da linha: **"Dar baixa sem receber"**, com o texto escondido ": parcela 6/6, de 10/11/2026".
   - Atalho na janela de pendência: "Dar baixa sem receber".
   - Janela: sobretítulo "A receber" e título **"Dar baixa sem receber"**.
   - Botão de confirmar: **"Dar baixa sem receber na parcela 6/6"**.
   - Situação depois: selo neutro **"Baixa sem receber"**.

### 2.2 A janela "Dar baixa sem receber"

6. **Primeiro, a parcela e o que vai acontecer**, como na janela "Não foi paga":
   - **a parcela:** "Parcela 6/6 · R$ 1.000,00 · venceu em 10/11/2026, há 8 dias", com o contrato e o cliente. Se paga em parte: "Recebido R$ 400,00 de R$ 900,00. A baixa é só dos R$ 500,00 que faltam.";
   - **a última anotação de cobrança**, se houver ("Diego anotou em 13/11: Noemi disse que não vai pagar porque perdeu a ação"), para quem decide ver o que já se tentou;
   - **a lista do que acontece:**
     - sai de "Em atraso" e de A receber;
     - não conta como recebido em lugar nenhum;
     - a régua de cobrança desta parcela para, sem mandar mais nada;
     - fica na tabela do contrato, com o motivo, quem e quando;
     - o que já entrou continua recebido;
     - se a parcela segura o fechamento de um caso, "O caso Carvalho x Construtora Lume deixa de esperar por ela";
   - **para onde vão as custas ligadas a ela** (nota 5), calculado pelo servidor no momento: "As custas de R$ 86,40 passam a ir junto com a mensalidade de novembro." ou "As custas de R$ 412,30 ficam a reembolsar, em A pagar."
7. **O motivo** é um grupo de rádio obrigatório, sem nada marcado. A legenda é "Por que a parcela sai de Em atraso sem receber". A ajuda de cada motivo:
   - **Perdoada:** "O escritório decidiu abrir mão deste valor.";
   - **Inadimplência:** "O cliente não pagou, e o escritório parou de cobrar pelo T3jus.";
   - **Renegociada:** "O valor vai entrar em outra combinação com o cliente." **Não aparece no contrato encerrado** (nota 10d). No lugar, uma linha diz: "Com o contrato encerrado, não há nova cobrança pelo T3jus. Se o cliente ainda vai pagar, deixe a parcela em atraso e registre quando entrar."
8. **A explicação é obrigatória sempre**, de 3 a 1.000 caracteres. É o mesmo padrão da explicação do êxito não cobrado (`0640_exito_conferir.sql:37`, `:47`, `:347`) e do motivo do "Não foi paga" (`0600:29`). O rótulo muda com o motivo:
   - Perdoada: "Por que e quem decidiu";
   - Inadimplência: "O que aconteceu";
   - Renegociada: "O que foi combinado", com o exemplo "Parcelado: 2 × R$ 250,00, em dezembro e janeiro".

   Uma baixa de dinheiro sem uma frase de por quê é o "sumir em silêncio" que a PT-03 proíbe.
9. **Valor e data não são campos.**
   - O valor é sempre o que falta na parcela no momento da baixa; o servidor confere (decisão 13).
   - A data é a de hoje, gravada pelo servidor. Baixa com data passada mexeria em relatório de mês fechado.
10. **Parcela paga em parte:** a baixa é só do que falta. O que entrou continua recebido, com o recibo que tiver, na ficha, no acerto do caso e em "Recebido no mês" de A receber. A seção 3, item 6, corrige os lugares que hoje tirariam esse dinheiro (nota 3). A linha passa a dizer "Recebido R$ 400,00 · baixa sem receber de R$ 500,00".
11. **Renegociada** (seção 2.4): a janela diz como a nova cobrança se faz.
    - Para quem tem Contratos (Marina): "Depois da baixa, mude as condições do contrato em Contratos", com o atalho "Mudar as condições do contrato", que aparece no aviso de confirmação, nunca antes da baixa.
    - Para quem não tem (Diego): "Quem muda as condições é a área Contratos (Marina e Felipe)". Com o sim da pergunta 3, segue a frase: "Eles recebem um aviso com o que foi combinado."
12. **As custas, com o sim da pergunta 4.** Quando há reembolso ligado a esta parcela no momento da baixa (`conta_parcela_reembolso`, `0511_reembolso_caso_parcela.sql:39-45`), a janela mostra a caixa **"Dar baixa também no reembolso das custas (R$ 412,30)"**, **desmarcada**, com o mesmo motivo e a mesma explicação.
    - Fica desmarcada porque perdoar o honorário não é perdoar a despesa que o escritório pagou.
    - Com a caixa desmarcada, a linha da decisão 6 diz para onde as custas vão.
    - Se a pergunta 4 for não, a caixa não existe, e só fica a linha.
13. **Confirmação e envio.**
    - A janela já é a confirmação: não há uma segunda janela "Tem certeza?". O botão diz o que faz.
    - O botão nunca fica desabilitado. Sem motivo ou sem explicação, o resumo de erros aparece no topo, cada erro fica preso ao campo, e o foco vai ao primeiro.
    - **Enquanto envia** (nota 13), o botão fica `aria-busy`, diz "Dando baixa…" e não aceita um segundo envio.
    - O servidor trata como sucesso a repetição pela mesma pessoa, com o mesmo saldo e o mesmo motivo, de uma baixa ainda em vigor.
14. **Erros do servidor**, cada um no padrão do tom: o que aconteceu, o que continua igual, o que fazer.
    - **Falha** (rede ou erro interno): `role="alert"`, com "Nada mudou: a parcela continua em atraso. O que você escreveu continua aqui.", "Tentar de novo" e o código para o suporte.
    - **Outra pessoa registrou um recebimento** com a janela aberta (`PARCELA_MUDOU`): "Diego Almeida registrou R$ 500,00 nesta parcela às 10h13. Nada foi baixado." O botão é "Ver como ficou", que recarrega. A hora em que a janela foi aberta sai (nota 19).
    - **Outra pessoa já deu baixa** (`PARCELA_JA_BAIXADA`): "Bianca Torres já deu baixa nesta parcela às 10h13.", com o mesmo "Ver como ficou".
    - **Já paga:** `PARCELA_JA_PAGA`, que já existe (`packages/domain/src/textos.ts:105`).
    - **Ainda não venceu** (`PARCELA_NAO_VENCIDA`, para link velho): "Esta parcela ainda não venceu. Para parar de cobrar as próximas, mude as condições ou encerre o contrato, em Contratos."
    - **Sem permissão** (nota 12): os códigos que já existem. `AREA_NAO_LIBERADA` vem de quem perdeu a área (`0140_portal_equipe.sql:106-108`), e o 401 genérico de quem perdeu a ação (`0010:207-208`). O escritório só para consulta é recusado por `portal_exigir_escrita` (`0210:382`, `0690:420`). Não entra nenhum `SEM_PERMISSAO` novo: o que existe tem outro texto (`textos.ts:62`).
    - **Contrato em elaboração ou parcela de outro escritório:** 404, o "não encontrado" de sempre.
15. **Depois de dar baixa:**
    - a janela fecha;
    - o foco volta à linha da parcela, no botão "Desfazer a baixa", que passa a existir ali;
    - o aviso diz "A parcela 6/6 de Noemi saiu de Em atraso sem receber." Se o caso ficou pronto, acrescenta "O caso Carvalho x Construtora Lume já pode ser encerrado no financeiro.", com "Ver o fechamento". Na renegociada, com Contratos, traz "Mudar as condições do contrato".

### 2.3 Desfazer (decisão, não pergunta)

16. **Dá para desfazer, com motivo, a qualquer tempo**, por quem tem `financeiro.editar`. É o mesmo padrão aprovado do "Foi paga, sim".
    - Na linha baixada, o botão secundário **"Desfazer a baixa"** abre uma janela curta. Ela mostra o que foi baixado, por quem e quando, e pede "Por que desfazer", obrigatório (ex.: "Noemi pagou afinal").
    - A parcela volta para "Em atraso" com o valor que faltava.
17. **Desfazer põe alguém cuidando da parcela** (nota 14).
    - Entra uma anotação de cobrança, como no "Não foi paga" (`0600:147-149`): tipo `ANOTACAO`, texto "Baixa desfeita: <explicação>", próxima ação "Falar com <cliente>" amanhã, para quem cuida do contrato.
    - A régua não manda de uma vez os passos que venceram durante a baixa: vale `avisos_desde = app_now()` (`0600:14`, `0721:252-254`).
    - O aviso de confirmação diz: "A parcela 6/6 voltou para Em atraso. A próxima ação é falar com Noemi amanhã, com Felipe Matos." Traz também "Registrar recebimento".
    - O foco vai ao botão "Dar baixa sem receber", que volta a existir na linha (nota 20).
18. **O que a janela de desfazer avisa:**
    - **Caso já encerrado no financeiro:** "O caso Carvalho x Construtora Lume continua encerrado no financeiro desde 18/11. A parcela volta para A receber deste contrato." O encerramento é o registro de um momento e não é reaberto (PT-03).
    - **Renegociada** (nota 10c): "Se o combinado já virou parcelas novas em Contratos, desfazer cobra o valor duas vezes. Confira as condições do contrato antes."
    - **Custas** (nota 5): "As custas de R$ 86,40 voltam a ir junto com esta parcela." Se a baixa das custas foi junto (pergunta 4), ela também se desfaz.
19. **Desfazer nunca apaga a baixa.** Ficam uma linha de baixa e outra de desfeita, cada uma com quem, quando e por quê.
20. **O desfazer é recusado** quando o contrato não está `ATIVO` nem `ENCERRADO`, ou quando a importação dele foi desfeita (nota 12).

### 2.4 Renegociada: o mínimo que cabe agora (pergunta 3)

21. **"Renegociada" é a baixa com o combinado escrito.** A nova cobrança é outra coisa, e já existe: mudar as condições do contrato, em Contratos, com motivo. Isso refaz a programação dos tipos que mudaram, a partir de hoje (`portal_contrato_condicoes`, `0200:478-523`). Só vale com o contrato vigente (`0200:498`), por isso "Renegociada" não aparece no contrato encerrado (decisão 7).
22. **Não conta no Contratado nem em "Baixado sem receber"** (nota 10a). O valor volta como parcelas novas, que contam. Se contasse também a baixada, o contrato passaria a valer R$ 500,00 a mais, e uma perda apareceria onde vai entrar dinheiro. Na ficha, a renegociada aparece só na linha e numa nota sob o número "Baixado sem receber": "mais R$ 500,00 renegociados".
23. **Aviso a Contratos, com o sim da pergunta 3.** Quando quem dá a baixa renegociada não tem Contratos, cada pessoa com Contratos e `contratos.editar` recebe no sino: "Diego Almeida combinou uma condição nova com Sebastião Lopes: ‹o que foi combinado›. Mude as condições do C-2026-019." Isso mostra a quem não tem Financeiro só o combinado, que é dado do contrato, e não o atraso nem o motivo. Quando quem dá a baixa tem Contratos, não há aviso, porque o atalho da decisão 15 basta.
24. **Sem ligação automática** entre a parcela baixada e as parcelas novas. A explicação guarda essa ligação para quem lê. Ligar as duas fica como ideia para depois, se a Carol quiser, e entra primeiro no `IDEIAS.md`.

### 2.5 Como a parcela baixada aparece depois

25. **Na tabela "Parcelas" da ficha do Financeiro:**
    - a linha fica, sem o tom de atraso, com o selo neutro "Baixa sem receber" e a nota "Inadimplência · por Marina Ribeiro em 18/11";
    - a explicação vem entre aspas, em Alegreya itálico, como o motivo do "Não foi paga";
    - em "Recibo e ações" fica "Desfazer a baixa";
    - o cabeçalho continua contando a parcela: "6 parcelas · R$ 6.000,00" (`Financeiro.tsx:1071`, `:1106`).
26. **Em Contratos › contrato › Recebimentos** (nota 2, pergunta 2):
    - **Quem tem Financeiro** vê o selo "Baixa sem receber" na coluna Situação (`0750:18-28`, `FichaContrato.tsx:494-495`), com o motivo, quem e quando.
    - **Quem não tem Financeiro** (Felipe) vê a linha **sem risco**, com a nota neutra "Fora da cobrança, por decisão do Financeiro." Não vê o motivo, nem quem fez, nem a explicação. O servidor não manda esses dados.
    - As contagens por condição (`FichaContrato.tsx:44`, `:379`) passam a contar a baixada, como já contam a "paga antes".
27. **Os números da ficha do Financeiro** (`Financeiro.tsx:1133-1138`, `0220:255-259`):
    - "Contratado" continua contando a parcela baixada por Perdoada ou Inadimplência. Hoje soma só as não canceladas (`0220:256`);
    - "Recebido" não muda;
    - "Em atraso" cai;
    - entra um quinto número, **"Baixado sem receber"**, só quando houver baixa no contrato. Ocupa a largura toda, no computador e no celular (nota 20), e traz "mais R$ X renegociados" quando houver.
28. **Em "Em atraso", em A receber e na Início:** a parcela sai do âmbar (`Financeiro.tsx:876`), dos números do alto e da lista de A receber (`0220:193-199`), e das contas da Início (`0400_portal_inicio_areas.sql:254`, `:311`). "Recebido no mês" mantém o que entrou nela (nota 3). A receber não ganha filtro de baixadas.
29. **Na cobrança:** a folha "Cobrança" passa para a próxima parcela em aberto (`Financeiro.tsx:1067`). O histórico de cobrança da baixada não se perde (`cobranca_eventos` só aceita inserção, `0220:83-84`) e volta a aparecer se a baixa for desfeita. "Anotar cobrança" na baixada é recusado com `PARCELA_BAIXADA` (nota 17).
30. **Na régua de WhatsApp** (nota 1):
    - a parcela baixada **nunca** vai ao ramo "Pagou" e não recebe mais nenhuma mensagem;
    - a execução que estiver no meio de uma espera termina como "ficou de fora", com o texto "A parcela teve baixa sem receber";
    - nenhuma mensagem sai ao cliente por causa da baixa. Se o escritório quiser avisar, quem avisa é a pessoa, pela Conversa.
31. **Na IA do escritório** (nota 16, pergunta 5). Hoje a IA lista ao cliente só as parcelas `VENCIDA`, `PARCIAL` e `A_VENCER` (`0330_portal_ia_atende.sql:90-99`), e a baixada sumiria da conversa. Proposta:
    - a IA recebe a parcela baixada como "assunto da equipe", sem valor nem motivo;
    - se o cliente perguntar se deve algo, ela passa a conversa para uma pessoa, em vez de dizer que nada está em aberto.
32. **No carnê** (nota 7):
    - a parcela baixada não entra em carnê novo (`0450_portal_carne.sql:140`; no `ui`, `podeEntrar` também tira `BAIXADA`, `Carne.tsx:744`);
    - no carnê já emitido, a lista "o que mudou" e o aviso no sino dizem "a parcela 6/6 teve baixa sem receber";
    - no desfazer, dizem "a parcela 6/6 voltou para A receber", e não que o valor mudou.
33. **No recibo:** a baixa não gera recibo. O recibo do que foi pago em parte continua como saiu.
34. **Nos relatórios** (nota 11):
    - a baixa nunca conta como recebido, porque o recebido sai de `pagamentos_recebidos` (`relatorio_entradas`, `0410_portal_relatorios_socio.sql:143`);
    - em "em aberto" e "vencido", a parcela não conta **nos dias em que estava baixada**, lidos de `parcela_baixas`, e conta nos outros. Uma baixa desfeita depois não reescreve o relatório de um mês já passado;
    - "Contratado" segue a regra da decisão 27;
    - um número próprio de "Baixado sem receber" nos Relatórios fica pendente, citando IN-04 e IN-07 (seção 7).
35. **No quadro "Fechamento do caso"** (a folha `fs-` aprovada), com a correção da nota 3:
    - a linha do contrato diz "5 de 6 parcelas recebidas · R$ 5.000,00 · parcela 6/6 baixada sem receber (inadimplência), por Marina em 18/11";
    - "Recebido no caso" mantém o que entrou nas parcelas baixadas;
    - "Falta" deixa de contar a parcela;
    - na janela de encerrar, abaixo de "Recebido no caso", entra "Baixado sem receber: R$ 1.000,00 · parcela 6/6 de Noemi, inadimplência";
    - o texto "tudo recebido" (`fechamento.ts:39-41`) vira "tudo recebido ou baixado com motivo" quando houver baixa no caso.
36. **No sino "caso pronto para encerrar"** (F3.147): a baixa que deixa o caso sem pendência avisa o resto do Financeiro, menos quem deu a baixa: "Marina Ribeiro deu baixa sem receber na parcela 6/6, e nada falta receber de Noemi Bastos Carvalho. Confira o acerto e encerre."
37. **No passo "Encerrar no financeiro" da ficha do cliente** (`cliente_fechamento`, `0900:243`): o "Faltam R$ 1.412,30" passa a não contar a parcela, sem mudança de texto.
38. **Na divisão do alvará** (nota 13), que fica só nas notas:
    - se o êxito do cliente teve baixa sem receber e um alvará chega depois, a proposta de divisão mostra o êxito baixado, com "Desfazer a baixa antes de dividir";
    - sem isso, os honorários entram no caixa, e a parcela continua "baixa sem receber".

## 3. O que muda no servidor e no `ui` (em linhas gerais)

Migration **`1010_baixa_parcela.sql`**, na faixa 1010 a 1019. Se a pergunta 4 ou a 3 for sim e crescer demais, a parte delas vai para a `1011_baixa_parcela_custas_avisos.sql`.

1. **A baixa é um cancelamento marcado, com uma tabela própria só de inserção.** É o mesmo jeito da parcela "paga antes do T3jus", que nasce cancelada com a marca `pago_antes` (`0420_portal_importacao.sql:79-80`).
   - **Por quê:** mais de 30 lugares já filtram `cancelado_em is null`: A receber, a ficha, as pendências do acerto (`0900:39`), a régua (`0721:250`), a IA, o carnê, a Início e os relatórios. Com uma situação fora do cancelamento, cada um teria de mudar.
   - **O que não vem de graça e muda de forma explícita:** os itens 4 a 16 abaixo. A revisão achou quatro deles graves (régua, Contratos, acerto e "Não foi paga"), e cada um tem teste próprio (item 17).
2. **Tabela nova `parcela_baixas`**, só de inserção (gatilho `financeiro_so_acrescenta`, `0220:73-85`), com `escritorio_id` e `proteger_tabela_escritorio`:
   - colunas: `parcela_id`, `tipo` (`BAIXA` ou `DESFEITA`), `motivo` (`PERDOADA`, `INADIMPLENCIA` ou `RENEGOCIADA`, obrigatório só em `BAIXA`), `explicacao` (de 3 a 1.000 caracteres, obrigatória nos dois tipos), `valor` (o que faltava, em centavos), `recebido_antes`, `reembolso_conta_id` (só com o sim da pergunta 4), `feito_por` e `feito_em`;
   - uma `DESFEITA` aponta para a `BAIXA` que desfaz. Os períodos em que a parcela esteve baixada saem dessas duas linhas (item 12);
   - entra no `inventario_dados` como dado pessoal, porque a explicação fala do cliente e do dinheiro dele, com a mesma base legal da `cobranca_eventos` (`0220:87-95`).
3. **`recebimentos_previstos` ganha `baixa_id`**, a `BAIXA` em vigor, com `check (baixa_id is null or cancelado_em is not null)`.
   - **Ao dar baixa:** `cancelado_em = app_now()`, `cancelado_motivo = 'Baixa sem receber'` (texto fixo, sem o motivo; nota 2) e `baixa_id`.
   - **Ao desfazer:** os três voltam a nulo, e `avisos_desde = app_now()`.
4. **A situação e a linha.**
   - `parcela_situacao` ganha `BAIXADA`, antes de `CANCELADA` (`0220:123-133`).
   - `parcela_linha` ganha `baixa`: o motivo, a explicação, o valor, quem, quando e se dá para desfazer.
   - No `domain`, `SituacaoParcela` ganha `BAIXADA` (`packages/domain/src/financeiro.ts:33`). `seloParcela` ganha o caso neutro "Baixa sem receber" (`packages/ui/src/portal/financeiro.ts:38-59`).
   - **No `ui`** (nota 8):
     - a classe da linha (`Financeiro.tsx:1155`);
     - o filtro do botão do carnê (`Financeiro.tsx:1129`, que hoje contaria a baixada como aberta);
     - a coluna "Recibo e ações" (`:1143`, `:1164-1184`);
     - a revisão das comparações com `"CANCELADA"` no `ui` que tratam parcela. A revisão contou 32 ocorrências; parte delas é de contas a pagar e empréstimos e não muda.
5. **As funções de entrada**, `security definer`, entram como o "Não foi paga" (`pago_antes_entrar`, `0600:72-79`): `entrar_area(..., 'FINANCEIRO')`, `entrar_escritorio(..., 'financeiro.editar')` e `portal_exigir_escrita` (nota 12). O escritório vem da sessão, nunca do corpo.
   - **`portal_financeiro_parcela_baixar(p_pessoa, p_escritorio, p_parcela, p_dados)`**
     - Recebe `motivo`, `explicacao`, `falta` (o saldo que a tela mostrou) e `reembolso` (pergunta 4).
     - Trava a linha (`for update`) e recusa, nesta ordem: 404; `PARCELA_JA_BAIXADA` (menos a repetição da mesma pessoa, que é sucesso: decisão 13); `PARCELA_CANCELADA`; `PARCELA_JA_PAGA`; `PARCELA_NAO_VENCIDA`; `PARCELA_MUDOU` (o saldo não é o da tela; a recusa traz quem registrou e quando); `RENEGOCIADA_CONTRATO_ENCERRADO`; e os campos `motivo` e `explicacao`.
     - Grava a baixa e registra `financeiro.parcela_baixada` no histórico da **entidade `recebimentos_previstos`**, como o recebimento (`0220:334`). Nunca na entidade `contratos`, cujo histórico Contratos mostra a quem não tem Financeiro (`0600:373-376`). O histórico leva a parcela, o contrato, o motivo e o valor; a explicação fica só em `parcela_baixas` (nota 17).
   - **`portal_financeiro_parcela_baixa_desfazer(p_pessoa, p_escritorio, p_parcela, p_dados)`**
     - Recebe `explicacao`.
     - Recusa `PARCELA_NAO_BAIXADA`, o contrato fora de `ATIVO` e `ENCERRADO`, e a importação desfeita.
     - Grava a `DESFEITA`, a anotação de cobrança (decisão 17) e `financeiro.parcela_baixa_desfeita`.
   - **Rotas:** `POST /v1/escritorio/financeiro/parcelas/:id/baixa` e `POST /v1/escritorio/financeiro/parcelas/:id/baixa/desfazer`, ao lado de `/recebimentos` e `/cobranca` (`supabase/functions/api-portal/app.ts:1005`, `:1055`). Os códigos novos entram em `TEXTOS_MOTIVO` (`packages/domain/src/textos.ts`).
6. **O que já entrou na parcela baixada não some** (nota 3).
   - **`caso_acerto_parcelas`** se divide em dois:
     - as **pendências** continuam só com as não canceladas (`0900:39`);
     - os **totais** contam as não canceladas **mais as baixadas**. São eles `parcelas.total`, `pagas`, `ultima` e `falta` de `caso_acerto` (`0900:113-117`), e `parcelas`, `recebido`, `recebidoNoCaso` e `ultimaRecebidaEm` de `caso_acerto_quadro` (`0900:134`, `:167-171`, `:178`).
   - **A receber, "Recebido no mês":** sai de `pagamentos_recebidos` do mês, sem olhar o cancelamento. Hoje vem de `ps`, que filtra `cancelado_em is null` (`0220:194-199`, `:221`).
   - A ficha do contrato não muda nisso, porque já soma o recebido sem filtro (`0220:257`).
7. **"Contratado"** conta as baixadas por Perdoada ou Inadimplência, e não as renegociadas (nota 10a). Isso vale em `portal_financeiro_contrato` (`0220:256`) e em `relatorio_contratado` (`0410:225-233`).
   - A ficha ganha `totais.baixado` e `totais.renegociado`.
   - `parcelas_validas` (`0290_portal_financeiro_resumo_caixa.sql:39-46`) não muda, porque serve também à previsão do caixa.
8. **A régua de WhatsApp** (nota 1). Hoje `automacao_pagou` conta como "Pagou" a parcela cancelada (`0570_automacoes_gatilhos_novos.sql:194-203`), e o motor em vigor (`automacao_andar`, `0670_lembrete_audiencia_envio.sql:309-327`, `:447-455`) manda a execução ao ramo "Pagou" ou a encerra com "Pagou: a parcela saiu da automação." (`0670:324`).
   - `automacao_pagou` passa a contar só o dinheiro recebido.
   - Antes de cada passo, a parcela cancelada encerra a execução como `FICOU_DE_FORA` (situação que já existe, `0320_portal_automacoes.sql:151`). O texto é "A parcela teve baixa sem receber" com `baixa_id`, e "A parcela foi cancelada no contrato" sem ele.
   - Isso corrige também o caso de hoje, em que mudar a condição de um contrato manda ao ramo "Pagou" uma parcela que foi cancelada.
9. **O sino do caso pronto** (`0990_sino_caso_pronto_fechar.sql`).
   - O gatilho já dispara quando `cancelado_em` muda (`0990:514-519`). Hoje, a baixa seria chamada de `ROTINA`, ou de `CONTRATO_ENCERRADO` se o contrato estiver encerrado (`0990:366-367`), e o texto sairia errado.
   - Entra o motivo `BAIXA` (na lista de `0990:72` e na ordem de `0990:297`), com quem deu a baixa e a parcela, e com `autorFora`.
   - Com o sim da pergunta 4, entra um gatilho em `parcela_baixas` para a baixa das custas, que não muda `contas_pagar` (item 13).
10. **O carnê** (nota 7). O gatilho `avisos_sino_parcela_do_carne` (`0623_sino_documento_carne.sql:110-127`) hoje manda `CANCELADA` na baixa e, no desfazer, cai no `else 'VALOR'`.
    - Entram os motivos `BAIXADA` e `BAIXA_DESFEITA` em `carne_avisar_desatualizado`, nas mudanças do carnê (`0450:149-151`) e em `textoMudanca` (`Carne.tsx:104-110`).
11. **O "Não foi paga"** (nota 4). A correção baixada continua valendo como correção. A regra "em vigor" passa a ser `cancelado_em is null or baixa_id is not null` em três lugares:
    - o índice único `recebimentos_previstos_correcao` (`0600:16-17`), refeito na migration;
    - a recusa `JA_MUDADA` (`0600:107-108`);
    - o `corrigida` de Contratos (`0600:365`).

    O "Foi paga, sim" na baixada recusa com `PARCELA_BAIXADA`, antes do `JA_VOLTOU` (`0600:172`). Com o índice refeito, não pode nascer uma segunda correção enquanto a primeira está baixada, e o desfazer nunca bate no índice.
12. **Os relatórios** (nota 11). `relatorio_abertas` (`0410:185`) passa a ignorar o cancelamento de uma parcela com baixa e a ler os períodos de `parcela_baixas`: a parcela não está aberta no dia D se D cai entre uma `BAIXA` e a `DESFEITA` seguinte (ou hoje).
13. **As custas, com o sim da pergunta 4** (nota 6).
    - A baixa das custas fica **só** em `parcela_baixas.reembolso_conta_id`, sem coluna nova em `contas_pagar`. Assim o guardião de `contas_pagar` (`0534_recorrencia_mudancas.sql:56-65`) não muda.
    - Uma função única, `conta_reembolso_baixado(c)`, diz se a conta tem uma baixa em vigor, que não foi desfeita.
    - Os leitores do "a reembolsar" passam a usá-la:
      - `caso_acerto` (`0900:64-68`);
      - A pagar (`0230`, três filtros `reembolsado_em is null`);
      - repasses (`0280`, três);
      - `relatorio_adiantadas` (`0410:197-209`);
      - `0512`;
      - a divisão do alvará (`0640`, dois);
      - `conta_linha` e `conta_parcela_reembolso` (`0511:39-57`).
    - Na conta, a situação "Reembolso baixado sem receber" aparece com o motivo e quem fez.
14. **Recusas nas outras escritas:**
    - "Registrar recebimento" na baixada recusa com `PARCELA_BAIXADA`, no lugar de `PARCELA_CANCELADA` (`0220:308`);
    - "Anotar cobrança" recusa do mesmo jeito (`0220:365`).
15. **A divisão do alvará** (nota 13). `exito_parcelas_abertas` lê fora da trava e depois trava sem conferir de novo (`0651_exito_pela_divisao_do_alvara.sql:21-32`, `:66-69`). Passa a conferir de novo depois do `for update`, e pula a parcela que mudou.
16. **O aviso a Contratos, com o sim da pergunta 3.** Entra o tipo novo de sino `BAIXA_RENEGOCIADA`, para quem tem Contratos e `contratos.editar`, com o combinado e o número do contrato. O texto está na decisão 23.
17. **Testes pgTAP mínimos**, um por nota que bloqueia:
    - execução da régua no meio da espera, baixa, e o próximo passo não manda nada e termina `FICOU_DE_FORA`;
    - Contratos sem Financeiro não recebe o motivo nem quem fez;
    - parcela paga em parte e depois baixada mantém o recebido no acerto, no quadro e em "Recebido no mês";
    - correção do "Não foi paga" baixada: não nasce uma segunda correção, o desfazer funciona, e o "Foi paga, sim" recusa com `PARCELA_BAIXADA`;
    - relatório: baixa em outubro, desfeita em dezembro, e o relatório de novembro não muda.
18. **Para quem programar, conferir também:**
    - que o "desfazer a importação" (`0420`) conta o contrato com parcela baixada como mexido, como faz com o "Não foi paga";
    - que a parcela de êxito vencida (`origem = 'ENCERRAMENTO'`) aceita a baixa como as outras;
    - nota à parte: a pendência `PARCELA_SEM_VALOR` também segura para sempre um caso perdido se a base nunca vier, e esta baixa não resolve isso (a ficha nem lista parcela sem valor, `0220:275`).

## 4. Estados do desenho (cada um no computador 1440 e no celular 390)

| # | Estado | Quem | Onde | O que mostra |
|---|---|---|---|---|
| 1 | `bx-ficha` | Marina | Financeiro › A receber › C-2026-012 | Base `contrato-pendente` aprovada. A coluna "Recibo e ações", com "Registrar" e "Dar baixa sem receber" na 6/6. No celular, os dois no cartão, na largura toda |
| 2 | `bx-parcial` | Diego | C-2026-019, Sebastião | A linha paga em parte **antes** da baixa: o recibo 2026-061, o comprovante e "Dar baixa sem receber" (não há "Registrar" na linha) |
| 3 | `bx-janela` | Marina | Janela sobre o 1 | A parcela, a última cobrança, o que vai acontecer, "As custas de R$ 412,30 ficam a reembolsar, em A pagar", os três motivos sem nada marcado, a explicação e, com a pergunta 4, a caixa das custas desmarcada |
| 4 | `bx-erros` | Marina | Janela | Sem motivo e sem explicação: o resumo no topo, o erro em cada campo e o foco no primeiro |
| 5 | `bx-enviando` | Marina | Janela | "Dando baixa…", com `aria-busy`, sem aceitar um segundo envio |
| 6 | `bx-renegociada` | Diego | Janela sobre o 2 | "Recebido R$ 400,00 de R$ 900,00…", "Renegociada" marcada, o rótulo "O que foi combinado" com "Parcelado: 2 × R$ 250,00…", as custas que passam a ir com novembro e "Quem muda as condições é a área Contratos (Marina e Felipe)" |
| 7 | `bx-falha` | Marina | Janela | Falha do servidor: "Nada mudou", o que foi escrito continua, "Tentar de novo" e o código |
| 8 | `bx-conflito` | Marina | Janela | Diego registrou R$ 500,00 às 10h13, com "Ver como ficou". As notas mostram a variação "Bianca Torres já deu baixa", com o mesmo botão |
| 9 | `bx-feita` | Marina | C-2026-012 | O aviso "saiu de Em atraso sem receber"; a linha com o selo, a nota, a explicação e "Desfazer a baixa"; "Em atraso" R$ 0,00 e "Baixado sem receber" na largura toda; sem a pergunta 4, a folha de fechamento ainda espera as custas, agora "a reembolsar, em A pagar" |
| 10 | `bx-pronto` | Marina | C-2026-012 | Com a pergunta 4 (custas junto): o âmbar vira "Encerrar o caso no financeiro"; o quadro mostra "5 de 6 parcelas recebidas · … baixada sem receber" e "Falta: nada" |
| 11 | `bx-encerrar` | Marina | Janela de encerrar | "Recebido no caso R$ 6.500,00" e "Baixado sem receber R$ 1.000,00 · parcela 6/6 de Noemi, inadimplência", com o resto da janela aprovada |
| 12 | `bx-pendencia` | Marina | Janela `fechar-bloqueado` | O texto de ajuda novo e o atalho secundário "Dar baixa sem receber" ao lado de "Registrar recebimento da parcela 6/6" |
| 13 | `bx-desfazer` | Marina | Janela | O que foi baixado, quem e quando, "Por que desfazer" e a próxima ação que vai nascer |
| 14 | `bx-desfazer-renegociada` | Diego | Janela, C-2026-019 | O aviso "desfazer cobra o valor duas vezes" e "As custas de R$ 86,40 voltam a ir junto com esta parcela" |
| 15 | `bx-desfazer-encerrado` | Marina | Janela, C-2026-012 | O caso já encerrado no financeiro: o aviso de que ele continua encerrado |
| 16 | `bx-desfeita` | Marina | C-2026-012 | A parcela de volta em "Em atraso"; o aviso com a próxima ação ("falar com Noemi amanhã, com Felipe Matos") e "Registrar recebimento"; o foco em "Dar baixa sem receber"; as duas linhas no histórico |
| 17 | `bx-contratos` | Marina | Contratos › C-2026-012 › Recebimentos | O selo "Baixa sem receber" na coluna Situação, com o motivo, quem e quando; a contagem por condição mostra 6 parcelas |
| 18 | `bx-sem-financeiro` | Felipe | O mesmo, sem Financeiro | A linha **sem risco**, com "Fora da cobrança, por decisão do Financeiro.", sem motivo, sem quem e sem botão; a contagem mostra 6 parcelas |
| 19 | `bx-sino` | Diego | Sino | O aviso do caso pronto com o motivo `BAIXA` |
| 20 | `bx-sino-contratos` | Felipe | Sino | Só com o sim da pergunta 3: "Diego Almeida combinou uma condição nova com Sebastião Lopes: … Mude as condições do C-2026-019." |

**Saíram ou ficam só nas notas** (nota 18):
- o vazio de A receber depois da baixa, que é o aprovado sem mudança;
- `PARCELA_JA_BAIXADA`, como variação do estado 8;
- o texto do carnê ("a parcela 6/6 teve baixa sem receber" e "voltou para A receber");
- `PARCELA_NAO_VENCIDA`, os erros de permissão de hoje e `PARCELA_BAIXADA` em "Registrar recebimento" e "Anotar cobrança";
- o êxito baixado na divisão do alvará;
- a linha "Quem dá baixa" da função só de leitura, que não existe hoje.

**Acessibilidade (PT-10):**
- O grupo de motivos é um `fieldset` com `legend`, e o erro do grupo fica ligado por `aria-describedby`.
- O selo "Baixa sem receber" tem texto, não só cor. A nota e a explicação ficam dentro da célula, lidas depois do selo.
- A janela de desfazer é um `dialog` comum, porque não destrói nada.
- O foco volta à linha da parcela ao fechar qualquer janela: ao "Desfazer a baixa", depois da baixa, e ao "Dar baixa sem receber", depois do desfazer.
- O valor em reais não quebra entre "R$" e o número.
- Nenhum botão fica desabilitado. Enquanto envia, o botão usa `aria-busy`.

## 5. Textos (no tom aprovado em `textos-tom`)

**Janela "Dar baixa sem receber"**
- **Descrição:** "A parcela sai de Em atraso sem que o dinheiro tenha entrado. Fica na tabela do contrato, com o motivo, e dá para desfazer depois."
- **Lista:**
  - "Sai de Em atraso e de A receber."
  - "Não conta como recebido no caixa nem nos relatórios."
  - "A régua de cobrança desta parcela para, sem mandar mais nada."
  - "O caso Carvalho x Construtora Lume deixa de esperar por ela."
- **Custas:** "As custas de R$ 412,30 ficam a reembolsar, em A pagar." ou "As custas de R$ 86,40 passam a ir junto com a mensalidade de novembro."
- **Legenda:** "Por que a parcela sai de Em atraso sem receber".
- **Ajuda dos motivos:** "O escritório decidiu abrir mão deste valor." · "O cliente não pagou, e o escritório parou de cobrar pelo T3jus." · "O valor vai entrar em outra combinação com o cliente."
- **Ajuda da explicação:** "Escreva em uma ou duas frases. Fica no contrato para quem vier depois."
- **Paga em parte:** "Recebido R$ 400,00 de R$ 900,00. A baixa é só dos R$ 500,00 que faltam."
- **Renegociada, com Contratos:** "Depois da baixa, mude as condições do contrato em Contratos."
- **Renegociada, sem Contratos:** "Quem muda as condições é a área Contratos (Marina e Felipe). Eles recebem um aviso com o que foi combinado." A segunda frase só entra com o sim da pergunta 3.
- **Contrato encerrado, no lugar de "Renegociada":** "Com o contrato encerrado, não há nova cobrança pelo T3jus. Se o cliente ainda vai pagar, deixe a parcela em atraso e registre quando entrar."
- **Custas (pergunta 4):** "Dar baixa também no reembolso das custas (R$ 412,30)". Ajuda: "Marque só se o escritório também não vai receber essa despesa de volta."
- **Botões:** "Dar baixa sem receber na parcela 6/6", "Dando baixa…" e "Voltar".
- **Erros de campo:** "Escolha o motivo." · "Escreva a explicação, com pelo menos 3 letras."

**Depois**
- **Aviso:** "A parcela 6/6 de Noemi saiu de Em atraso sem receber." Se o caso ficou pronto: "O caso Carvalho x Construtora Lume já pode ser encerrado no financeiro."
- **Nota na linha:** "Inadimplência · por Marina Ribeiro em 18/11", com a explicação entre aspas.
- **Paga em parte:** "Recebido R$ 400,00 · baixa sem receber de R$ 500,00".
- **Em Contratos, sem Financeiro:** "Fora da cobrança, por decisão do Financeiro." (pergunta 2).
- **Número da ficha:** "Baixado sem receber", com "mais R$ 500,00 renegociados" quando houver.

**Desfazer**
- **Título:** "Desfazer a baixa".
- **Descrição:** "A parcela 6/6 volta para Em atraso, com R$ 1.000,00 a receber. Felipe Matos fica com a próxima ação: falar com Noemi amanhã. A baixa continua no histórico."
- **Campo e botão:** "Por que desfazer" · "Desfazer a baixa".
- **Caso encerrado:** "O caso Carvalho x Construtora Lume continua encerrado no financeiro desde 18/11. A parcela volta para A receber deste contrato."
- **Renegociada:** "Se o combinado já virou parcelas novas em Contratos, desfazer cobra o valor duas vezes. Confira as condições do contrato antes."
- **Custas:** "As custas de R$ 86,40 voltam a ir junto com esta parcela."
- **Aviso:** "A parcela 6/6 voltou para Em atraso. A próxima ação é falar com Noemi amanhã, com Felipe Matos."

**A janela de pendência do fechamento** (troca o texto de `fechamento.ts:44-46`)
- "Se Noemi não vai pagar, você pode dar baixa na parcela sem receber, com o motivo. Ela sai de Em atraso, fica no contrato, e o caso deixa de esperar por ela."

**Erros do servidor**
- **Falha:** "Não deu para dar baixa. Nada mudou: a parcela continua em atraso. O que você escreveu continua aqui."
- **`PARCELA_MUDOU`:** "Diego Almeida registrou R$ 500,00 nesta parcela às 10h13. Nada foi baixado. Veja como ficou antes de decidir."
- **`PARCELA_JA_BAIXADA`:** "Bianca Torres já deu baixa nesta parcela às 10h13. Nada mais mudou."
- **`PARCELA_NAO_VENCIDA`:** "Esta parcela ainda não venceu. Para parar de cobrar as próximas, mude as condições ou encerre o contrato, em Contratos."
- **`RENEGOCIADA_CONTRATO_ENCERRADO`:** "O contrato foi encerrado enquanto a janela estava aberta, e a renegociação não vale mais. Escolha outro motivo ou deixe a parcela em atraso."
- **`PARCELA_NAO_BAIXADA`:** "Esta parcela não está mais baixada. Recarregue a página para ver como ela está."
- **`PARCELA_BAIXADA`**, em "Registrar recebimento", "Anotar cobrança" e "Foi paga, sim": "Esta parcela teve baixa sem receber. Desfaça a baixa antes."

**Régua (histórico da automação):** "A parcela teve baixa sem receber." · "A parcela foi cancelada no contrato."

**Sinos:**
- **Caso pronto:** "Marina Ribeiro deu baixa sem receber na parcela 6/6, e nada falta receber de Noemi Bastos Carvalho. Confira o acerto e encerre."
- **Contratos (pergunta 3):** "Diego Almeida combinou uma condição nova com Sebastião Lopes: Parcelado: 2 × R$ 250,00, em dezembro e janeiro. Mude as condições do C-2026-019."

**Carnê:** "a parcela 6/6 teve baixa sem receber" · "a parcela 6/6 voltou para A receber".

## 6. Perguntas para a Carol

1. **Quem pode dar baixa sem receber?** Você aprovou "só com `financeiro.editar`". Hoje, isso quer dizer toda pessoa com a área Financeiro, sócias e equipe (`0220:12-14`). No elenco, Marina, Diego e Bianca poderiam perdoar uma parcela.
   - **Recomendo manter assim.** Quem, quando e por quê ficam sempre à vista na linha da parcela e no histórico, e dá para desfazer.
   - A alternativa é uma ação nova, `financeiro.baixar`, só da função `SOCIO`. A equipe então vê "Quem dá baixa: Marina Ribeiro".
2. **O que vê, em Contratos, quem não tem a área Financeiro?** Hoje a aba Recebimentos mostra a todos o motivo de cada cancelamento.
   - **Recomendo a linha neutra "Fora da cobrança, por decisão do Financeiro."**, sem risco, sem o motivo, sem quem e sem a explicação. A parcela continua contando nas parcelas do contrato.
   - A alternativa é mostrar só "Baixa sem receber", sem o motivo. Isso já diz a quem não tem Financeiro que o cliente não pagou.
3. **Como fica a "Renegociada"?**
   - **Recomendo:**
     - é só a baixa, com o combinado escrito, e a nova cobrança é uma condição nova em Contratos (que já existe);
     - não conta no Contratado nem em "Baixado sem receber";
     - não aparece no contrato encerrado.
   - **E quando quem dá a baixa não tem Contratos (Diego)?** Recomendo um aviso no sino para quem tem Contratos, só com o combinado e o número do contrato. Sem ele, ninguém avisa quem muda as condições. A alternativa é a janela pedir a Diego que avise pessoalmente.
   - Ligar a parcela baixada às parcelas novas fica para depois, como ideia nova, se você quiser.
4. **Quando a parcela leva junto o reembolso de uma despesa do escritório, a baixa pode levar o reembolso também?**
   - **O que acontece hoje:** a ligação do reembolso com a parcela é calculada. Quando a parcela sai, o reembolso **pula sozinho** para a próxima parcela do cliente (no exemplo, as custas de Sebastião passam para a mensalidade de novembro). Se não há próxima, fica "a reembolsar, em A pagar".
   - **No caso de Noemi:** sem a baixa das custas, os R$ 412,30 continuam segurando o fechamento, e hoje não há como tirá-los do "a reembolsar".
   - **Recomendo que sim**, na mesma janela, com uma caixa **desmarcada**, o mesmo motivo e a mesma explicação. A janela sempre diz para onde as custas vão.
   - **É ideia nova:** o código seria **FI-25** na seção FI do `IDEIAS.md`, e o total passa de 139 para 140. Se a resposta for não, a caixa sai, e fica só a linha que diz para onde as custas vão.
5. **O que a IA do escritório diz ao cliente sobre uma parcela baixada?** Hoje ela sumiria da conversa, e a IA responderia "nada em aberto". Isso pode atrapalhar uma cobrança judicial que o escritório ainda faça.
   - **Recomendo que a IA trate a parcela baixada como "assunto da equipe"**: sem valor nem motivo. Se o cliente perguntar, ela passa a conversa para uma pessoa.
   - A alternativa é a IA não saber dela, como se nunca tivesse existido.

O desfazer, que era a pergunta 1 do v1, virou a decisão 16, porque segue o padrão aprovado do "Foi paga, sim". O aviso da renegociada (decisão 18) está escrito lá.

## 7. Para o painel

- **Esta entrega atende a FI-24 inteira.** São a baixa com os três motivos, só com `financeiro.editar`, a saída de "Em atraso", o histórico e o fechamento que vale com "tudo recebido ou baixado com motivo".
  - O F3.139 continua citando FI-24, FI-08 e EX-16 em `refs`.
  - **No mesmo commit**, o texto da FI-08 no `IDEIAS.md` passa a "só encerra com tudo recebido ou baixado com motivo, e tudo repassado", sem mudar o código da ideia, para não contradizer a FI-24 (nota 21).
- **Com o sim da pergunta 4**, a baixa do reembolso entra na mesma entrega. O F3.139 passa a citar também a **FI-25**, criada no `IDEIAS.md` no mesmo commit.
- **Com o não da pergunta 4**, entra o item pendente "Reembolso de despesa que o cliente não vai pagar", citando FI-08 e EX-16, porque o caso com custas a reembolsar continua sem como fechar.
- **Item pendente proposto:** o número "Baixado sem receber" nos Relatórios, por período e por cliente, citando **IN-04** e **IN-07**, que já existem (nota 11).
- **Ideia para depois, se a Carol pedir:** ligar a parcela renegociada às parcelas novas (entra primeiro no `IDEIAS.md`).
- **A correção da régua (decisão 30, seção 3, item 8)** vale também para a parcela cancelada por mudança de condição, que hoje vai ao ramo "Pagou". Entra nesta entrega, com teste. Ela não muda o status de nenhuma ideia além das citadas.
- **Depois do desenho e do sim da Carol**, a pasta vai para `docs/design/aprovadas/portal-baixa-parcela-motivo/`.

## 8. Notas da revisão

| Nota | O que fiz | Onde |
|---|---|---|
| 1. Régua trata cancelada como "Pagou" | **Aplicada.** Conferi `0570:194-203`, `0670:309-327`, `:447-455` e `0721:250`. `automacao_pagou` só olha o dinheiro; a parcela cancelada encerra como `FICOU_DE_FORA`, com teste. O "conferir" do v1 saiu | Decisão 30; seção 3, itens 8 e 17 |
| 2. Motivo visível sem Financeiro | **Aplicada.** Conferi `0600:370`, `FichaContrato.tsx:44`, `:379`, `:506` e `:523`. O motivo vai em texto fixo, o servidor não manda os dados da baixa a quem não tem Financeiro, a linha fica neutra e sem risco, as contagens incluem a baixada, e o histórico fica na entidade `recebimentos_previstos`. O texto vai à Carol | Decisões 4 e 26; seção 3, itens 3 e 5; estado 18; pergunta 2 |
| 3. Recebido some do acerto e do mês | **Aplicada.** Conferi `0900:39`, `:113-117`, `:134`, `:167-178` e `0220:194-221`. `caso_acerto_parcelas` separa pendências de totais, e "Recebido no mês" vem de `pagamentos_recebidos`, com testes | Decisões 10, 28 e 35; seção 3, item 6 |
| 4. Quebra do "Não foi paga" | **Aplicada com mudança.** Conferi `0600:16-17`, `:107-108`, `:172` e `:365`. Refaço o índice com "não cancelada ou com baixa", e a mesma regra vale em `JA_MUDADA` e `corrigida`. Com isso o desfazer nunca bate no índice, e o "conferir o índice antes" que a nota pedia não é necessário | Seção 3, itens 11 e 17 |
| 5. O reembolso pula de parcela | **Aplicada.** Conferi `0511:5-8` e `:21-45`. A janela e o desfazer dizem para onde as custas vão; o caso B mostra o salto; a pergunta 4 conta isso | Decisões 6, 12 e 18; pergunta 4 |
| 6. A pergunta 4 mexe em mais lugares | **Aplicada.** Conferi `0534:56-65` e `0990:540-551`. A baixa das custas fica só em `parcela_baixas`, com `conta_reembolso_baixado` e um gatilho do sino; os leitores estão listados | Seção 3, itens 9 e 13 |
| 7. Sino do carnê com texto errado | **Aplicada.** Conferi `0623:110-127`. Entram `BAIXADA` e `BAIXA_DESFEITA`, e o `podeEntrar` | Decisão 32; seção 3, itens 4 e 10 |
| 8. Não há "Registrar" na linha paga em parte | **Aplicada.** Conferi `Financeiro.tsx:1129`, `:1143`, `:1155` e `:1164-1184`. A coluna vira "Recibo e ações", com larguras novas; o estado 2 mostra a parcial antes; a lista do `ui` está na seção 3 | Decisão 1; seção 3, item 4; estado 2 |
| 9. "Baixa" já quer dizer "recebido" | **Aplicada.** "Sem receber" está em todo botão e aviso; "Baixa feita" saiu | Decisões 5 e 15; seção 5 |
| 10. Renegociada | **Aplicada.** (a) Não conta no Contratado nem em "Baixado sem receber"; (b) o exemplo virou condição nova; (c) o desfazer avisa da cobrança em dobro; (d) não aparece no contrato encerrado; (e) o aviso a Contratos vai à Carol | Decisões 7, 18 e 21 a 23; pergunta 3 |
| 11. Relatórios e desfazer | **Aplicada.** Conferi `0410:185`. `relatorio_abertas` lê os períodos de `parcela_baixas`, com teste; o pendente cita IN-04 e IN-07 | Decisão 34; seção 3, itens 12 e 17; seção 7 |
| 12. Escrita e códigos | **Aplicada.** Conferi `0600:72-79`, `0140:106-108` e `textos.ts:62`. Entra `portal_exigir_escrita`, valem os códigos que já existem, e o desfazer recusa contrato fora de vigência ou importação desfeita | Decisões 14 e 20; seção 3, item 5 |
| 13. Concorrência | **Aplicada com mudança.** Entram o "Dando baixa…" e o recheck em `exito_parcelas_abertas` (conferi `0651:21-32` e `:66-69`). A repetição só é sucesso com a mesma pessoa, o mesmo saldo e o **mesmo motivo**, para não engolir uma segunda decisão diferente. O alvará depois da baixa fica nas notas, como a nota permite | Decisões 13 e 38; seção 3, itens 5 e 15; estado 5 |
| 14. Desfazer sem ninguém cuidando | **Aplicada.** Conferi `0600:147-149` e `0721:259`. O desfazer cria a anotação "Falar com <cliente>" amanhã, para quem cuida do contrato | Decisão 17; estado 16 |
| 15. Perguntas | **Aplicada.** Ficam 5: quem pode (com Bianca), o que vê quem não tem Financeiro, renegociada (com o aviso a Contratos), as custas (com o salto) e a IA. O desfazer virou decisão | Seção 6 |
| 16. A IA e a baixada | **Aplicada.** Conferi `0330:90-99`. A proposta "assunto da equipe" vai à Carol | Decisão 31; pergunta 5 |
| 17. Afirmações para corrigir | **Aplicada.** O motivo de deixar a explicação fora do histórico foi corrigido; `0220:365` é "Anotar cobrança", e ela também recusa; `cliente_fechamento` agora cita `0900:243`; a régua cita `0721` e `0670`; a parcela sem valor virou nota | Decisões 29 e 37; seção 3, itens 5, 14 e 18 |
| 18. Estados | **Aplicada.** Saíram o vazio de A receber, o "já baixada" (agora variação do 8) e o carnê; entraram a parcial antes, o enviando, o desfazer da renegociada e o estado 18 refeito; entrou também o sino de Contratos, condicionado à pergunta 3 | Seção 4 |
| 19. Textos | **Aplicada.** A legenda e as ajudas dos motivos estão novas; `PARCELA_JA_BAIXADA` usa "Ver como ficou"; a hora de abertura da janela saiu | Decisões 7 e 14; seção 5 |
| 20. Acessibilidade e celular | **Aplicada.** O F3.165 pendente está nas notas; o foco depois do desfazer vai ao "Dar baixa sem receber"; o quinto número ocupa a largura toda | Decisões 1, 17 e 27; seção 4 |
| 21. Painel e `IDEIAS.md` | **Aplicada com mudança.** O texto da FI-08 muda no commit da entrega, e o pendente dos Relatórios cita IN-04 e IN-07. A FI-25 só nasce com o sim da pergunta 4, e o total passa de 139 para 140 | Seção 7 |
