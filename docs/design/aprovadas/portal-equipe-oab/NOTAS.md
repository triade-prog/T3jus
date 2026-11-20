# Equipe: a OAB de cada advogado · notas

**Aprovado pela Carol em 20/11/2026 (10h54, horário da Bahia), como está (revisão v2).** Programado em F3.15 (Equipe, convite e Sua conta); a escolha das inscrições no contrato fica para F3.74.

Um acréscimo pequeno às telas aprovadas da Equipe (`portal-v1`) e de Contratos (`portal-comercial-contratos`), para a Carol aprovar antes de virar código.

**O que resolve:** o contrato de honorários e a procuração listam os advogados como "Nome, OAB/UF nº". A Carol decidiu que a OAB e a UF ficam na Equipe, uma vez por pessoa, e não são escritas em cada contrato. O campo é opcional, porque nem todo mundo da equipe é advogado (recepção, estágio, financeiro). Uma pessoa pode ter mais de uma inscrição, como a principal e uma suplementar em outra UF. Só a sócia dona vê e muda a equipe; cada pessoa confere a própria OAB em "Sua conta". Em cada contrato, quem o cria escolhe quais inscrições de cada advogado vão no documento (o padrão é todas).

**Revisão de 19/11/2026:** ajustada com as respostas da Carol às 4 perguntas (veja "Decisões da Carol", no fim). Saiu o estado `equipe-leitura`; entraram `conta`, `conta-sem-oab`, `conta-mais` (só celular), `novo-inscricoes`, `novo-inscricao-erro`, `contrato-inscricoes` e `contrato-inscricoes-mudar`; o `novo-sem-oab` passou a mostrar as caixas das inscrições.

Atende a dependência que Contratos já citava: "a OAB vem da Equipe" (EX-12, `contrato_advogado`). Pesam também CH-03, CH-08, PA-02, PT-03 (nada é apagado), PT-10 (WCAG 2.2 AA e celular) e PT-11 (finalidade por campo).

## Como abrir

- O `index.html` mostra os 21 estados em computador (1440) e em celular (412), em 41 capturas (o `conta-mais` é só de celular). Clique numa imagem para abrir o HTML naquele estado.
- O `equipe.html`, o `conta.html` (novo) e o `contratos.html` abrem sozinhos e trazem as fontes, o CSS e os ícones embutidos. O estado vem do endereço, por exemplo `equipe.html?estado=pessoa`, `equipe.html?estado=inscricao-erros`, `conta.html?estado=conta` e `contratos.html?estado=novo-inscricoes`. No celular, `&mais=1` abre a folha Mais.
- Abaixo de 760 px, as páginas mudam para a versão de celular, com a barra de baixo (Início, Conversas, Agenda e Mais).
- Para refazer tudo, rode `sh _fonte/gerar.sh <pasta>`.
  - A base vem sem mudança: `comum.py` e `equipe.py` são do Portal v1; `pecas.py` e `contratos.py` são de Comercial e Contratos.
  - O acréscimo fica em `oab.py` (UFs, formato, dados fictícios e a entrada de Sua conta no menu), `oab_equipe.py` (que também gera o `conta.html`) e `oab_contratos.py`. Esses dois arquivos carregam as definições aprovadas e trocam só as peças que mudam. As peças novas têm o prefixo `oe-`.
  - `casos.py` gera a lista de estados e o index (um estado pode pedir só celular). `fotos.cjs` faz as capturas e roda o axe. `webp.py` converte as capturas.
- Os dados são fictícios e usam o mesmo elenco das telas aprovadas. Os números de OAB são inventados.

## Decisões de design

### Equipe

1. **A OAB aparece na lista aprovada, embaixo do nome, e não ganha uma coluna nova.**
   - Ela fica numa linha pequena em vinho, com o ícone da balança. Quando a pessoa tem duas inscrições, aparecem as duas: "OAB/SP 287.104 · OAB/RJ 245.880-S".
   - Quem não tem OAB não ganha nada na linha: nem "pendente", nem alerta. Para a recepção e o financeiro, a falta da OAB é o normal.
   - Não criei coluna porque a tabela já está no limite com as ações ("Cancelar convite" já encosta na borda em 1440). O cabeçalho da coluna passou a se chamar "Pessoa e OAB".
   - Um pé novo na lista diz para que serve a OAB e onde ela é cadastrada.
2. **O nome leva a uma ficha da pessoa, que é nova.**
   - Antes, a Equipe era só a lista com janelas. A OAB precisa de lugar para listar, editar e remover mais de uma inscrição, e uma janela dentro de outra seria pior.
   - O cabeçalho é o da ficha aprovada do Console: vinho com o nome e a situação.
   - O âmbar mostra **como a pessoa sai no contrato e na procuração** ("Felipe Matos, OAB/SP nº 287.104 e OAB/RJ nº 245.880-S"). É a pergunta que importa, respondida antes de qualquer campo.
   - Sem OAB, o âmbar diz "Sem OAB cadastrada" e explica a consequência: a pessoa não aparece como advogada nos contratos. Também oferece "Adicionar inscrição".
   - O miolo tem as inscrições, cada uma com UF, número, tipo e os botões Editar e Remover, e "Onde Felipe assina como advogado", que lista os contratos ligados.
   - A lateral leva as áreas e o acesso (e-mail, data de entrada, Retirar). As ações da lista aprovada continuam iguais.
3. **Adicionar e editar usam a mesma janela,** com quatro campos:
   - UF da seccional;
   - número;
   - letra (opcional);
   - tipo: principal ou suplementar, em botões de opção.

   Embaixo, a linha âmbar "No contrato e na procuração: …" mostra o resultado enquanto a pessoa digita.
4. **Principal e suplementar:**
   - cada pessoa tem uma principal só, e ela vem primeiro nos documentos;
   - a primeira inscrição já vem marcada como principal;
   - ao marcar outra inscrição como principal, a antiga passa a suplementar, e o texto avisa isso antes de salvar.
5. **Remover usa `alertdialog`, com o foco no Voltar.**
   - A janela diz como os documentos novos vão sair.
   - Contratos e procurações já gerados não mudam, porque cada arquivo guarda a OAB do dia em que foi gerado (PT-03).
   - A inclusão, a mudança (com o antes e o depois) e a remoção entram no histórico da equipe.
6. **O convite já pede a OAB principal, que é opcional.**
   - Vai num grupo "OAB (opcional)" com UF, número e letra, mais a linha âmbar de prévia.
   - A suplementar se cadastra depois, na ficha.
   - A OAB fica guardada com o convite. Se o convite for cancelado ou vencer sem uso, ela não entra em lugar nenhum.
7. **A Equipe continua só da sócia dona; cada pessoa confere a própria OAB em "Sua conta"** (decisão 1 da Carol). Estados `conta`, `conta-sem-oab` e `conta-mais`, numa página nova, `conta.html`.
   - O item Equipe continua fora do menu e do Mais para quem não é dona, como no Portal v1 (decisão 7 de lá, sem mudança).
   - **Entrada:** no computador, o nome no pé do menu (que já dizia quem está entrando) vira link para Sua conta e fica marcado quando ela está aberta. No celular, o grupo "Sua conta" do Mais ganha o item "Seus dados e sua OAB", logo abaixo do nome.
   - **O topo** é o mesmo da ficha da pessoa, sem o "voltar para Equipe": vinho com o nome e, no âmbar, "Como você sai no contrato e na procuração". O âmbar avisa que é o padrão e que, em cada contrato, quem o cria pode deixar uma inscrição de fora.
   - **Suas inscrições na OAB:** as mesmas linhas da ficha, sem Editar nem Remover. O pé diz com quem falar se um número estiver diferente da carteira (Marina Ribeiro, sócia dona) e que os documentos já gerados não mudam.
   - **Onde você assina como advogado:** os contratos da pessoa, com as inscrições que vão em cada um ("só OAB/SP 287.104"). Só aparece para quem tem OAB.
   - **Seu acesso:** e-mail, data de entrada e áreas, só para ler.
   - **Sem OAB** (Paula Nunes): o âmbar diz "Sem OAB cadastrada", que é o normal para quem não é advogado, e, se for, quem cadastra. Sem botão.
   - Ninguém vê a OAB de outra pessoa por aqui: o servidor devolve só as inscrições de quem está na sessão.

### Validação

8. **UF:** é obrigatória quando há número. A lista tem as 27 UFs (26 estados e o DF), em ordem de sigla, no formato "SP · São Paulo", para que digitar a sigla já leve à UF certa. O servidor recusa o que estiver fora da lista (`UF_INVALIDA`).
9. **Número:**
   - O servidor tira pontos, espaços e traços e guarda só os dígitos.
   - Precisa ter de 1 a 6 dígitos e não pode ser só zeros. Zeros à esquerda são tirados.
   - Na tela, o número aparece com o ponto de milhar (287.104), que o T3jus põe sozinho.
   - Uma letra no meio do número, como "51290A", dá erro (`NUMERO_INVALIDO`), e a mensagem manda a letra para o campo Letra.
   - Uso 6 dígitos porque as maiores seccionais ainda estão na casa das centenas de milhar.
10. **Letra, num campo à parte e opcional:**
    - aceita uma letra só, de A a Z, que vira maiúscula (`LETRA_INVALIDA`);
    - algumas carteiras trazem uma letra depois do número (como "-A", "-B" ou "-S"), e o uso muda de uma seccional para outra;
    - por isso o T3jus **só repete o que está na carteira** e não tira nenhuma conclusão da letra: o tipo (principal ou suplementar) é o campo que manda;
    - a letra também não entra na conferência de repetição: SP 245.880 e SP 245.880-A contam como a mesma inscrição.
11. **UF e número andam juntos.** No convite e na ficha, UF sem número dá erro, e número sem UF também. A mensagem diz como sair: escrever o número, ou voltar a UF para "Escolha" se a pessoa não é advogada.
12. **Repetições recusadas pelo servidor:**
    - a mesma UF e o mesmo número em duas pessoas do escritório (`OAB_DE_OUTRA_PESSOA`). A mensagem diz de quem é, porque quem vê é a sócia dona, que já vê a equipe inteira;
    - duas inscrições da mesma pessoa na mesma UF (`UF_REPETIDA`);
    - duas principais na mesma pessoa (`PRINCIPAL_JA_EXISTE`). Pela tela isso não acontece, porque ela troca a antiga para suplementar.
13. **Os erros seguem o padrão aprovado:**
    - o resumo no topo traz links para os campos;
    - cada erro fica preso ao campo, com `aria-invalid` e `aria-describedby`;
    - o foco vai para o primeiro campo com erro;
    - o botão Salvar nunca fica desabilitado.

### Contratos

14. **No Novo contrato, só quem tem OAB pode ser marcado como advogado,** e de quem tem mais de uma inscrição se escolhem as que vão (decisão 2 da Carol).
    - Cada advogado é um cartão com a caixa do nome. Ao marcar quem tem mais de uma inscrição, o cartão abre "Inscrições de Felipe que vão no documento", com uma caixa por inscrição: **todas já marcadas**, a principal primeiro ("Principal · vem primeiro").
    - Quem tem uma inscrição só não ganha caixa: o cartão diz "única inscrição, vai sempre". Uma caixa que não pode ser desmarcada não levaria a nada.
    - A linha âmbar "No contrato e na procuração: …" mostra a frase de cada advogado marcado e muda enquanto se marca (`aria-live`).
    - **Pelo menos uma inscrição por advogado marcado** (estado `novo-inscricao-erro`). Ao criar o contrato com Felipe marcado e nenhuma inscrição dele, o resumo de erros no topo leva à primeira caixa; o cartão fica com a borda de erro, as caixas com `aria-invalid` e a mensagem diz como sair: marcar uma inscrição ou desmarcar o nome. Na prévia, a falta aparece como "[falta escolher a inscrição]".
    - Logo abaixo dos cartões vem a faixa "Sem OAB cadastrada: Diego Almeida, Gustavo Lima e Paula Nunes. Quem é advogado entra nesta lista quando a OAB estiver na Equipe". A sócia dona vê o link "Cadastrar a OAB na Equipe". Quem não é dona lê "Quem cadastra é Marina Ribeiro, sócia dona".
    - Não mostrei caixas desabilitadas: ocupariam espaço com gente que não é advogada e não levariam a nada (é o mesmo motivo da decisão 6 do Portal v1).
15. **O responsável pelo contrato continua sem precisar de OAB.** O responsável recebe os lembretes, e o advogado assina. Isso já estava separado no aprovado (decisão 17 de Contratos).
16. **Um advogado já marcado num contrato pode ficar sem OAB depois,** se a inscrição for removida na Equipe (estado `contrato-sem-oab`).
    - Em Responsáveis, a pessoa aparece com o selo "Sem OAB".
    - Uma faixa âmbar explica: a OAB foi removida em tal data; os documentos gerados daqui em diante saem com "[OAB: falta]" ao lado do nome; os já gerados não mudam.
    - Isso segue a regra aprovada para dado faltando: avisa e não bloqueia, como o "[RG: falta]".
    - A sócia dona tem o link "Cadastrar na Equipe". Para os outros, a faixa diz quem cadastra (estado `contrato-sem-oab-pessoa`).
17. **Quais inscrições vão no documento:** as marcadas no contrato, na ordem principal e depois suplementar, no formato "OAB/SP nº 287.104 e OAB/RJ nº 245.880-S". O campo `[ADVOGADOS_OAB]` do modelo recebe essa frase. Se ninguém mexeu, vão todas.
18. **A ficha do contrato mostra a escolha** (estado `contrato-inscricoes`). Em Responsáveis, cada advogado tem a linha "No documento: OAB/SP 287.104" e, quando sobrou alguma, "OAB/RJ 245.880-S fica fora deste contrato". O pé explica que as inscrições foram escolhidas ao criar o contrato e valem para os documentos gerados daqui em diante.
19. **Mudar inscrições** (estado `contrato-inscricoes-mudar`) abre uma janela com os mesmos cartões, só com as caixas das inscrições: quem é advogado no contrato não muda por ali. Vale a mesma regra de pelo menos uma. A mudança entra no histórico do contrato; os documentos já gerados não mudam.
20. **O que acontece depois, na Equipe:**
    - uma inscrição **nova** de alguém não entra sozinha nos contratos que já existem, porque cada contrato guarda as inscrições escolhidas. Entra nos contratos novos, onde vem marcada;
    - se a sócia dona **remove** uma inscrição escolhida num contrato, ela sai dos documentos novos daquele contrato. Se era a única escolhida e a pessoa ainda tem outra, o contrato passa a usar todas as que restam e a ficha avisa. Se a pessoa fica sem nenhuma, vale a decisão 16 ("[OAB: falta]").
21. **Gerar documentos** (tela aprovada de Contratos) usa as inscrições escolhidas no contrato. Não desenhei uma segunda escolha ali, para a frase não poder sair diferente da ficha. Se a Carol quiser escolher também na hora de gerar, a mesma caixa entra em "Advogados outorgados".

## Acessibilidade (WCAG 2.2 AA)

- **Conferência automática** em 41 capturas (21 estados, 20 deles em computador e celular, e o `conta-mais` só em celular), feita pelo `fotos.cjs`. O resultado fica em `_conferencia.json`:
  - o axe (WCAG 2.0, 2.1 e 2.2, A e AA) não achou nenhuma violação;
  - nenhuma tela tem rolagem lateral;
  - nenhum erro de script.
- **Alvos:**
  - no celular, os alvos têm 44 px ou mais, menos os links do resumo de erros dentro das janelas, que têm 24 px, como no computador;
  - no computador, os nomes da lista e os links do resumo de erros das janelas têm 24 px de altura, que é o mínimo da 2.5.8; os do resumo de erros do Novo contrato têm 44 px; os botões compactos têm 36 px, como no aprovado;
  - a palavra-marca "T3jus" continua como no aprovado.
- **Campos:**
  - UF, número e letra têm `label` próprio;
  - o tipo é um `fieldset` com `legend` e botões de opção;
  - as inscrições de cada advogado, no Novo contrato e na janela, são um `fieldset` próprio, com `legend` "Inscrições de Felipe que vão no documento", ajuda e erro ligados por `aria-describedby`;
  - o número usa `inputmode="numeric"` e não usa `maxlength`, para que o erro apareça escrito em vez de o campo cortar a digitação.
- **Leitor de tela:**
  - a prévia "No contrato e na procuração" é `aria-live="polite"`, na janela da inscrição e no Novo contrato;
  - as duas inscrições na lista têm uma vírgula só para leitor de tela entre elas;
  - o link do nome diz ", abrir a ficha";
  - o nome no pé do menu diz ", sua conta e sua OAB".
- **Cor:** nada depende só dela. O "Sem OAB" tem selo escrito e ícone.

## O que precisa de dado novo no servidor

| Onde | O quê |
|---|---|
| Tabela `oab_inscricao` | `id`, `escritorio_id`, `pessoa_id`, `uf` (uma das 27), `numero` (texto só com dígitos, 1 a 6, sem zeros à esquerda), `letra` (nula ou uma letra A–Z), `tipo` (principal ou suplementar), `criado_por`, `criado_em`, `removido_em`, `removido_por`, `versao`. Passa por `proteger_tabela_escritorio`. Remover marca `removido_em` e não apaga. Tem três índices únicos, todos parciais por `removido_em is null`: (`escritorio_id`, `uf`, `numero`), (`pessoa_id`, `escritorio_id`, `uf`) e uma principal por pessoa e escritório |
| Equipe, convite | O `POST` do convite aceita `oab: {uf, numero, letra}`, que é opcional. A OAB vira a inscrição principal quando a pessoa aceita o convite |
| Equipe, ficha | `GET /v1/escritorio/equipe/:pessoa` devolve as inscrições e os contratos em que a pessoa é advogada. As rotas `POST`, `PATCH` (com `versao`) e `DELETE` (que marca a remoção) ficam em `/v1/escritorio/equipe/:pessoa/oab`. Só a sócia dona pode usar; os outros recebem 403 |
| Erros | `INSCRICAO_OBRIGATORIA` (advogado marcado sem nenhuma inscrição, com o nome), `INSCRICAO_DE_OUTRA_PESSOA`, `UF_INVALIDA`, `UF_OBRIGATORIA`, `NUMERO_OBRIGATORIO`, `NUMERO_INVALIDO`, `LETRA_INVALIDA`, `OAB_DE_OUTRA_PESSOA` (com o nome), `UF_REPETIDA`, `PRINCIPAL_JA_EXISTE` e 409 `CONFLITO_VERSAO` |
| Sua conta | `GET /v1/conta` devolve os dados e as inscrições ativas **só da pessoa da sessão**, mais os contratos em que ela é advogada com as inscrições de cada um. Não recebe `pessoa_id`: a pessoa vem da sessão no servidor. Sem rota de escrita |
| Tabela `contrato_advogado_oab` | Liga o contrato, a pessoa e a inscrição: `id`, `escritorio_id`, `contrato_id`, `pessoa_id`, `oab_inscricao_id`, `criado_por`, `criado_em`, `removido_em`, `removido_por`. Passa por `proteger_tabela_escritorio`. Índice único parcial (`contrato_id`, `oab_inscricao_id`) por `removido_em is null`. A inscrição precisa ser da mesma pessoa e do mesmo escritório, e a pessoa precisa estar em `contrato_advogado` daquele contrato. Mudar marca `removido_em` e cria linhas novas; nada é apagado |
| Contratos, rotas | O `POST` do contrato recebe, por advogado, `inscricoes: [id]`; se vier vazio ou faltar, o servidor põe todas as ativas. `PUT /v1/contratos/:id/advogados/:pessoa/inscricoes` (com `versao`) muda a escolha |
| Histórico | `equipe.oab_incluida`, `equipe.oab_mudada` (com o antes e o depois), `equipe.oab_removida` e `contrato.inscricoes_mudadas` (com o antes e o depois) |
| Contratos | `contrato_advogado` só aceita pessoa com inscrição ativa. A frase do documento sai das linhas ativas de `contrato_advogado_oab`, na ordem principal e suplementar; se todas as escolhidas de uma pessoa forem removidas na Equipe, usa as que restam. Os documentos gravam a frase da OAB do dia em `documento_gerado`. A ficha calcula "sem OAB" na hora de mostrar |

**Para o painel:** esta entrega atende a parte de EX-12 que guarda a OAB na Equipe, a conferência da própria OAB em Sua conta e a escolha das inscrições por contrato. A frase que vai no documento depende ainda da geração de documentos (CH-08, a validar). Se a entrega sair sem essa parte, ela entra como item pendente.

## Decisões da Carol (19/11/2026)

1. **Quem não é sócio dono passa a ver a Equipe, só para ler?** **Não.** A Equipe continua só da sócia dona, como no Portal v1. Cada pessoa confere a própria OAB, só para ler, em "Sua conta" (decisão 7). O estado `equipe-leitura` saiu.
2. **Quais inscrições vão no contrato e na procuração?** **Opcional, quando forem gerar o contrato e a procuração.** O padrão é todas, com a principal primeiro; quem cria o contrato pode desmarcar alguma, e fica pelo menos uma por advogado (decisões 14 e 17 a 21).
3. **A inscrição de estagiário entra?** **Não**, nesta versão. Só a principal e a suplementar de advogado. Nada mudou.
4. **A letra depois do número está certa como campo opcional à parte?** **Sim, conferido pela advogada parceira.** Nada mudou.
