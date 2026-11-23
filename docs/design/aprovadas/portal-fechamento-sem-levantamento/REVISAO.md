# Revisão do plano · fechamento do caso sem levantamento (F3.132)

Revisão feita em 23/11/2026, antes do desenho. Conferi o `PLANO.md` contra o `CLAUDE.md`, `docs/IDENTIDADE.md`, `docs/design/conceito-gabinete.md`, as notas aprovadas (`portal-jornada-fechamento`, `portal-financeiro`, `portal-exito-conferir`, com o `_fonte/exito.py` deste último), as migrações 0200, 0220, 0230, 0512, 0640, 0851 e 0852, a rota `app.ts` e os componentes `FinanceiroRepasses.tsx`, `Financeiro.tsx`, `AcertoCaso.tsx`, `fichaLigada.ts` e `Juridico.tsx`.

## Veredito: aprovar com ajustes

A ideia central está certa e segue o que a Carol aprovou: a mesma folha e a mesma janela na ficha do contrato, um lugar só para encerrar cada caso, e o botão que nunca fica desabilitado. O caso fictício é bom: tem dois clientes, perda, parcela em atraso e custas. Mas o plano tem quatro tipos de problema que precisam ser resolvidos antes de desenhar:

- afirmações sobre o servidor que não batem com o SQL;
- três buracos de regra que deixariam casos encerrados para sempre como "acerto pendente";
- uma leitura errada do aprovado `conferido-contrato`;
- estados que faltam (quem só tem `financeiro.ver`, parcela que ainda vai vencer, acordo direto com êxito).

Nada disso pede refazer o plano.

## Ajustes obrigatórios

1. **O `conferido-contrato` aprovado é justamente o caso sem levantamento, não o caso com RPV.**
   - **Trecho:** estado 14 ("A folha é a do aprovado (`conferido-contrato`), só para ler… o fechamento deste caso fica na ficha do repasse") e decisão 1.
   - **Problema:** no aprovado, a folha é do caso "Pereira x Mercado Bom Preço", um acordo pago direto, e diz "Nenhum valor de terceiros entrou neste caso · se vier alvará, a divisão aparece em Repasses" (`portal-exito-conferir/_fonte/exito.py:282-288`; NOTAS decisão 10).
   - **Correção:** a base dos estados 5, 12 e 13 é o `conferido-contrato`. O estado 14 (caso com RPV) é uma **variação nova**, e as notas devem dizer isso. Diga também que, no aprovado, a folha fica **abaixo** de "De onde veio" e que subir para o topo é uma mudança, válida só com o caso encerrado. Registre ainda que a folha aprovada nunca foi programada: a ficha de hoje (`Financeiro.tsx:1007-1091`) não tem "Fechamento do caso" nem "De onde veio". A entrega constrói as duas peças.

2. **"Cancelar a parcela em Contratos, com o motivo" não existe no servidor.**
   - **Trecho:** decisão 8 (último item) e pergunta 2.
   - **Problema:** não há função para cancelar uma parcela solta. Só existem dois caminhos, e os dois cancelam parcelas futuras em bloco:
     - `contrato_cancelar_futuros` pelo "Mudar condição", a partir de hoje (`0200_portal_contratos.sql:516`);
     - o mesmo pelo "Encerrar contrato", a partir de amanhã (`0200:547`).

     Uma parcela **já vencida** (a 6/6, de 10/11) não tem como sair, a não ser paga. Se Noemi não pagar, o caso fica "Encerrado · acerto pendente" para sempre. Depois de uma perda, o cliente parar de pagar é um caso comum.
   - **Correção:** tire a frase da janela e das perguntas, ou troque por um caminho que existe. "Dar baixa como não recebida, com motivo" (perdão ou inadimplência) é ideia nova. Pela regra do `CLAUDE.md`, ela entra primeiro no `IDEIAS.md`, na seção FI e com código. Como muda o FI-08 ("só encerra com tudo recebido"), a decisão é da Carol (veja a pergunta revisada 2). Sem ela, a entrega deixa a EX-16 e o FI-08 com um item "pendente" no painel.

3. **Contrato ligado a vários casos: as parcelas não são do caso.**
   - **Trecho:** decisão 5 e seção 5.
   - **Problema:** `caso_acerto` soma **todas** as parcelas dos contratos ligados ao caso, sem filtro de caso (`0640_exito_conferir.sql:503-509`), porque `recebimentos_previstos` não tem `caso_id`. Num contrato com três casos (a Farmácia Bom Jesus do aprovado) ou de mensalidade, o caso A só fecha quando o contrato inteiro estiver pago, mesmo com o caso B em andamento. Hoje isso quase não aparece, porque só o caso com levantamento fica pendente (`0852:99`). Com a regra nova (seção 5.3), **todo** caso encerrado de um contrato assim passa a "acerto pendente" sem saída.
   - **Correção:** o plano precisa de uma regra. Recomendo: parcela de contrato que também está em outro caso em andamento não segura o fechamento, e o quadro mostra a linha "Contrato C-… segue no caso X: as parcelas ficam com ele". Pode ser outra regra, mas ela vale para os dois lugares (repasse e contrato) e entra na seção 5. Como mexe no FI-08, vai à Carol (pergunta revisada 3).

4. **Caso sem contrato e com despesa adiantada não tem onde fechar.**
   - **Trecho:** seção 5.1 ("entra quando o caso tem contrato ligado ao cliente ou despesa adiantada no caso") e pergunta 3.
   - **Problema:** a folha mora na ficha do contrato. Sem contrato, o `contratoId` vem nulo, e `botaoDoFechamento` devolve `href: null` (`fichaLigada.ts:268`): fica um passo sem botão para quem pode fazê-lo. Acontece o mesmo num caso com vários clientes em que um deles não tem contrato. Ele entra no caso com `caso_clientes.contrato_id` nulo, e o passo dele leva a lugar nenhum.
   - **Correção:** defina para onde vai o link quando o próprio cliente não tem contrato no caso. Recomendo o contrato do caso com a primeira pendência; sem pendência, o de menor número. Defina também o que acontece quando o caso não tem contrato nenhum. Recomendo que o passo e o "acerto pendente" só existam quando o caso tem ao menos um contrato, e que a despesa sem contrato siga em A pagar, em "A reembolsar", onde já se marca o reembolso (`portal_financeiro_conta_reembolsada`, `0230:313`). Escreva isso nas seções 3 e 5, e tire a "despesa adiantada" da condição da seção 5.1 e da 5.3.

5. **A afirmação sobre o `caso_resumo_acerto` está incompleta, e falta escolher o contrato.**
   - **Trecho:** seção 5.3 ("Hoje um caso encerrado sem levantamento nunca fica 'acerto pendente'").
   - **Problema:** o caso sem levantamento já fica pendente quando há êxito `PARA_CONFERIR` (`0852:99-100`). A ficha do caso é do caso inteiro, não de um cliente, e o plano não diz qual `contratoId` vai no resumo quando há dois.
   - **Correção:** escreva a regra completa: pendente quando não há `fechamentos_caso` e há (a) levantamento, (b) êxito para conferir ou (c) contrato ligado em estado `ATIVO` ou `ENCERRADO`. O `contratoId` segue a regra do ajuste 4. Mantenha de fora o caso com `encerrado_por = 'IMPORTACAO_DESFEITA'` (`0852:94`). A folha também não aparece nesse caso (decisão 2).

6. **Os dados do quadro que o plano dá como prontos não existem.**
   - **Trecho:** decisão 6 ("Resultado e êxito… com o motivo"), seção 1 ("perdoado, por Diego em 12/11") e seção 5.5.
   - **Problema:** o `caso_acerto` não traz o resultado do caso nem a lista de êxitos (só o êxito pendente, `0640:518`). O motivo de não cobrar fica em `exitos_conferir.motivo_nao_cobrar` e `explicacao` (`0640:36`), e nem o `caso_resumo_acerto` o devolve (`0852:105-107`).
   - **Correção:** acrescente à seção 5.5:
     - `resultado` e `encerradoEm` do caso;
     - `exitos[]` com cliente, situação, valor, quem e quando, e `motivoNaoCobrar` e `explicacao` só para quem tem Financeiro.

     Corrija também a rota: é `GET /v1/escritorio/financeiro/contratos/:id` (`app.ts:934`), não "…/contratos/:id/parcelas".

7. **Faltam estados.** Hoje são 15. Junte ou tire dois (veja a sugestão 1) e acrescente estes:
   - **`contrato-so-ver`**: quem tem Financeiro mas não tem `financeiro.editar`. Encerrar exige `financeiro.editar` (`0512:106`), e "Registrar recebimento" também. "Nunca desabilitado" não pode virar uma recusa do servidor. A folha mostra o quadro sem o botão e diz "Quem encerra: Marina e Diego". O servidor devolve `podeEncerrar` e a lista de quem pode.
   - **`contrato-a-vencer`**: o caso perdido com parcelas que ainda vão vencer, sem nada em atraso. Se a pergunta 2 ficar com "segura", esse vai ser o estado mais comum e mais longo. A folha diz "Pronto para encerrar depois da última parcela, em 10/03/2027" e não oferece um atalho que não resolve nada. O âmbar do cliente (estado 1) também muda: "esperando a última parcela" no lugar de "falta R$ …", sem tom de atraso.
   - **Acordo pago direto ao cliente, com êxito** (lançado ou não cobrado): foi pedido junto com a perda e é o caso sem levantamento que tem dinheiro. As notas sozinhas não bastam: falta o quadro com a parcela do êxito e a linha "Êxito não cobrado · perdoado, por Diego em 12/11", com a explicação. Pode ser uma variação do estado 12 ou do 13.

8. **Pendências sem atalho, ou com atalho errado.**
   - **Trecho:** decisão 8 e estado 6.
   - **Problema:** o plano só fala de `PARCELA`, mas o `caso_acerto` devolve cinco tipos (`0640:515-533`). A parcela **sem valor** (`PARCELA_SEM_VALOR`) segura o caso e nem aparece na tabela da ficha, que só lista parcelas com valor (`0220:248,275`, só o contador `aguardandoBase`). Num contrato de base mensal, um caso perdido fica preso sem que a pessoa veja por quê.
   - **Correção:** escreva na decisão 8 o atalho de cada tipo e a linha do quadro de cada um:

     | Tipo | Atalho |
     |---|---|
     | `PARCELA` deste contrato | Registrar recebimento |
     | `PARCELA` de outro contrato | Abrir o contrato de … |
     | `PARCELA_SEM_VALOR` | Informar a base, em Contratos › Honorários |
     | `EXITO` | Conferir o êxito, em A receber |
     | `REEMBOLSO` sem parcela que o leve | Ver em A pagar › A reembolsar |

     O `parcelaId` da seção 5.5 está certo. Acrescente a parcela que leva o reembolso (`conta_parcela_reembolso`), para o atalho saber se o reembolso vai junto.

9. **A caixa do reembolso vem desmarcada no aprovado.**
   - **Trecho:** estado 6 ("abre a janela aprovada já com o reembolso junto").
   - **Problema:** a decisão 11 do `portal-exito-conferir` diz que "O reembolso também foi pago" vem **desmarcada**. Já vir marcada facilita registrar um reembolso que não entrou.
   - **Correção:** abra a janela aprovada como está, com a faixa "parcela + reembolso", e deixe a pessoa marcar. Se quiser mudar o padrão nesse atalho, faça disso uma pergunta à Carol.

10. **O contrato que já está encerrado e o contrato que fica fora da cadeia contradizem o aprovado ou o servidor.**
    - **Trecho:** decisão 5 ("A janela diz por quê: 'C-… continua…'") e estado 8.
    - **Problema:**
      - a decisão 24 da jornada diz que os contratos com outro caso em andamento "nem aparecem", e `caso_contratos_encerraveis` só devolve contratos `ATIVO` sem outro caso em andamento (`0852:13-24`). Nem a razão nem os contratos de fora chegam à tela;
      - o plano não trata o contrato que alguém já encerrou direto em Contratos antes do financeiro. O passo "Encerrar o contrato" fica livre, e `portal_contrato_encerrar` não olha o fechamento.
    - **Correção:** escolha uma das saídas para os contratos de fora: siga o aprovado (não aparecem), ou faça da linha "continua" uma mudança declarada nas duas janelas, com o servidor devolvendo `contratosFora` e o motivo. Na janela, mostre o contrato já encerrado como "C-2026-013 · já encerrado em 12/11", sem caixa, e conte só os ativos no botão ("Encerrar o caso e o contrato").

11. **"Eles recebem o aviso" é uma promessa sem servidor.**
    - **Trecho:** estado 9.
    - **Problema:** nem 0852 nem 0512 avisam alguém no sino quando o caso fecha. O servidor também não devolve quem tem Contratos: o `podeEncerrarContratos` (`0852:39`) é só um sim ou não. E hoje a janela esconde a seção inteira quando a pessoa não pode encerrar contratos (`FinanceiroRepasses.tsx`, `ligados = podeEncerrarContratos ? … : []`). Mostrá-la para o Diego muda também a janela aprovada do repasse.
    - **Correção:** escolha uma das saídas:
      - troque o texto por "O passo 'Encerrar o contrato' fica na ficha de Noemi, para Marina e Felipe", que já existe (`0851:70-80`);
      - ou ponha na seção 5 o aviso no sino e a lista `quemEncerraContratos`.

      Em qualquer caso, diga que a janela do repasse muda junto, porque o componente é comum. Essa promessa também já está, sem implementação, na decisão 16 aprovada ("recebe o aviso quando fechar") e no estado 2. Registre no `NOTAS.md`, na parte "o que o código de hoje não tem".

12. **A ordem da folha no celular e a âncora (WCAG 2.2 AA).**
    - **Trecho:** decisão 1 ("no celular, ela vem logo depois do âmbar, antes da tabela") e "Ver o acerto" com `#t-fecha`.
    - **Problema:**
      - no computador, a folha fica na lateral, que no DOM vem depois da tabela. Trocar a ordem só no CSS (`order`, grid) quebra 1.3.2 e 2.4.3, porque o leitor de tela e o Tab seguem outra ordem. Duplicar a folha repete `id` e botões;
      - a âncora vinda de outra página pode ficar sob a barra fixa (2.4.11);
      - depois de `CASO_JA_ENCERRADO`, a folha recarregada precisa ser anunciada.
    - **Correção:** escreva na decisão 1 que há uma folha só, numa posição do DOM que sirva aos dois tamanhos (logo depois do âmbar). Ao chegar por "Ver o acerto", o foco vai ao título da folha (`tabindex="-1"`), com `scroll-margin-top`. O recarregamento usa `role="status"` com "Este caso já foi encerrado no financeiro por …". Ao fechar uma janela aberta pelo atalho, o foco volta ao botão da folha. "Falta" nos três números diz o valor em texto, não só pela cor.

13. **A ideia que fica pela metade precisa de item "pendente" no painel.**
    - **Trecho:** cabeçalho (EX-16, EX-17, FI-08).
    - **Problema:** o F3.132 hoje cita só EX-16 e EX-17. Se a baixa de parcela (ajuste 2), a regra do contrato com vários casos (ajuste 3) ou o aviso (ajuste 11) ficarem para depois, a entrega atende só parte dessas ideias.
    - **Correção:** acrescente às notas uma parte "Para o painel" com a lista: o que esta entrega atende; e, para cada lacuna que ficar, um item "pendente" citando a mesma ideia (EX-16, EX-17 ou FI-08), como o `CLAUDE.md` manda. A baixa de parcela também entra antes no `IDEIAS.md`, com código e com a contagem do fim do arquivo atualizada.

## Sugestões (opcionais)

1. **Menos estados repetidos.**
   - O estado 15 (`atendido`) é o aprovado sem mudança e pode sair.
   - O 4 (`caso-acerto-larissa`) só troca o texto "Faltam pagamentos a terceiros", que fica errado sem levantamento. Pode virar nota com o texto novo, ou ficar e mostrar essa troca.
2. **Os textos que já existem no código e ficam errados sem levantamento** entram nas notas, para quem for programar:
   - `AcertoCaso.tsx:56`: "Faltam pagamentos a terceiros";
   - `AcertoCaso.tsx:26`: "pagar … e encerrar";
   - `AcertoCaso.tsx:76`: a linha "Depois: encerrar no financeiro…", que só aparece quando há `entrou`;
   - `fichaLigada.ts:229`: "Tudo recebido e repassado" e "Falta pagar terceiros";
   - `FinanceiroRepasses.tsx`, `ItemParcelas` e `JanelaEncerrar`: "tudo recebido e repassado" e "Voltar ao caso";
   - `Juridico.tsx:777`: o texto da janela de encerrar o caso ("até o Financeiro conferir, receber e repassar"). Para a perda, ele deveria dizer que o caso fica "acerto pendente" até o Financeiro encerrar.
3. **Rótulos dos três números:** escreva "Recebido no caso · 2 contratos" para não parecer que os R$ 7.500,00 são só de Noemi. O "Reembolsado" sai de `contas_pagar.reembolsado_em` do caso, sem contar as canceladas.
4. **`origem: 'CONTRATO'` no histórico:** se vier do navegador, é só um rótulo e não pode decidir nada. Alternativa: duas rotas finas no servidor, ou nem gravar a origem. O histórico já diz quem e quando.
5. **Onde o Financeiro descobre o que tem para fechar:** sem levantamento, o caso não aparece em Repasses. Só se chega a ele pela ficha do cliente ou do caso. Um aviso em A receber ("2 casos encerrados prontos para fechar") ajudaria o Diego, que trabalha lá. Fica para depois, como ideia nova.
6. **Casos já encerrados antes desta entrega:** com a regra nova, eles passam a "acerto pendente", e clientes que hoje estão "Cliente atendido" voltam para "Fechar o caso". Como ainda não há escritório em produção, basta uma nota. Se já houver dado de piloto, é preciso decidir se esses casos ficam de fora.
7. **Texto de "Quem faz":** use o formato aprovado, "Quem faz: a área Financeiro (Marina, Diego e Bianca)." (`fichaLigada.ts:205-209`).

## Perguntas para a Carol, revisadas

**Viram decisão e saem das perguntas:**

- **A antiga 1 (ficha do contrato só aponta, no caso com RPV):** já decorre do que ela aprovou na pergunta 5 ("para os casos sem levantamento"). Fica como decisão 3.
- **A antiga 4 (mostrar os outros clientes):** quem tem Financeiro já vê todos os contratos, e a PT-02 não é ferida. Fica como decisão 4.
- **A antiga 3, na parte pro bono:** o caso sem contrato nenhum é resolvido pelo ajuste 4.

**Ficam para a Carol:**

1. **A parcela que ainda vai vencer segura o fechamento do caso perdido?** Exemplo: perdeu no 4º mês de 6. Recomendo que sim, como manda o FI-08. O caso fica "acerto pendente" até a última parcela, e a folha diz a data. Quem quiser parar de cobrar encerra o contrato em Contratos, e as parcelas futuras se cancelam sozinhas, com o motivo (isso já existe).
2. **A parcela vencida que o cliente não vai pagar pode ser baixada com motivo, para o caso fechar?** Recomendo que sim: "Dar baixa sem receber", com motivo (perdoada, inadimplência, renegociada), só para quem tem `financeiro.editar`. A parcela sai do "Em atraso" e fica no histórico. Se a resposta for não, o caso pode ficar pendente para sempre. É ideia nova: entra no `IDEIAS.md`.
3. **Num contrato que cobre mais de um caso (ou de mensalidade), as parcelas seguram o fechamento de cada caso?** Recomendo que não, enquanto o contrato tiver outro caso em andamento. O quadro diz que as parcelas ficam com o outro caso, e o último caso a fechar leva as parcelas que faltarem.
4. **Pelo atalho "Registrar recebimento da parcela 6/6", a caixa do reembolso já vem marcada?** Só se quiser mudar o aprovado. Recomendo manter desmarcada, como foi aprovado.

## Segunda leitura (plano v2, 23/11/2026)

**Veredito: aprovar. Nada bloqueia a execução do desenho.**

Conferi o `PLANO.md` v2 contra os 13 ajustes e contra o código. Os 13 foram tratados: 12 incorporados e 1 com discordância justificada. As referências novas batem com o código:

| Referência | O que está lá |
|---|---|
| `0511:39` | `conta_parcela_reembolso` |
| `0640:207` | êxito com base zero não é criado |
| `0190:352` | `quem_tem_area` |
| `FinanceiroPagar.tsx:149` | "A reembolsar por clientes" |
| `FinanceiroRepasses.tsx:1181` | a seção dos contratos escondida |
| `IDEIAS.md` | último código FI-23, total de 138 |

**As duas discordâncias, conferidas:**

- **(a) Estado sem `financeiro.editar`: a especialista tem razão.** Só existem as funções `SOCIO` e `EQUIPE` (`0010:39`, `0140:13`), e as duas têm `financeiro.ver` e `financeiro.editar` (`0220:12-14`). O `pode` (`0210:209-221`) só olha a função do vínculo, sem permissão por pessoa. O único caso em que `financeiro.editar` falta é o contrato do escritório fechado. Aí falta também `financeiro.ver`, e a pessoa nem entra na ficha. Não há estado a desenhar. O padrão "sem botão, com 'Quem encerra: …'" fica anotado para quando houver uma função só de leitura.
- **(b) A caixa do reembolso desmarcada como decisão, e não como pergunta: concordo.** É o aprovado sem mudança e não precisava ir à Carol.

**Notas para a execução (não bloqueiam):**

1. **Decisão 8, frase "Se Noemi não vai pagar, fale com Marina".** Quem vê a janela no estado 6 é a própria Marina. Use um texto que não dependa de quem está vendo, por exemplo "Se Noemi não vai pagar, a baixa sem receber ainda não existe: veja com a sócia responsável", ou o nome tirado de quem tem `SOCIO`, sem ser a pessoa da sessão.
2. **Estado 4, texto "Falta receber do cliente" para Larissa.** Ele conta a quem não tem Financeiro que o cliente deve, e a PT-02 pede o mínimo. Prefira o texto neutro do aprovado, "O acerto está com o Financeiro", ou "Falta o acerto no Financeiro".
3. **A FI-24.** Ela entra no `IDEIAS.md` (seção FI, total 139) no mesmo commit em que o item "pendente" for criado no painel, como manda o `CLAUDE.md`, mesmo antes da resposta da Carol. Se a Carol disser não, o item continua e registra a decisão.
4. **As regras que dependem da Carol.** A regra do contrato com vários casos (decisão 5 e seção 5.5) depende da pergunta 3. O desenho pode mostrar a linha "segue no caso X", mas as notas devem dizer que ela só vale com o sim da Carol.
