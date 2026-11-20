# Clientes: Importar planilha · notas

> **Aprovado pela Carol em 20/11/2026, às 7h55 (Bahia).** Ela respondeu "aprovado" sem mudar nada. As 4 perguntas do fim seguem a recomendação até ela dizer o contrário: clientes, todos da equipe, e contratos, só quem tem Contratos; parcelas pagas antes do T3jus ficam só como informação; outros sistemas ficam para depois; desfazer por 7 dias.

O desenho da importação de clientes e contratos de uma planilha, no Portal do advogado, para a Carol aprovar antes de virar código. O caso de uso: o escritório chega ao T3jus com os clientes e os contratos numa planilha do Excel ou do Google Planilhas e não quer redigitar.

Atende VA-05 (a validar): importação de dados para facilitar a entrada. Esta rodada cobre só planilhas; a importação de outros sistemas é a pergunta 3.

Usa e não muda:

- AP-01 e o Clientes aprovado: os campos do cliente, a qualificação PF e PJ, os contatos, a conferência do dígito do CPF e do CNPJ, o aviso de possível duplicado que avisa e não bloqueia, a lista fixa de origens e o padrão de erros (resumo no topo, erro preso ao campo, botão nunca desabilitado);
- CH-01 a CH-06 e o Contratos aprovado: o contrato nasce em elaboração e só vai ao Financeiro com a data da assinatura; os tipos de honorário; as parcelas em centavos exatos, com o centavo que sobra nas primeiras; o responsável pelo contrato;
- FI-01 a FI-03 e o Financeiro aprovado: ninguém digita parcela no Financeiro; as parcelas da importação saem das condições do contrato e aparecem em A receber;
- PT-03 (nada é apagado em silêncio), PT-04 (transação: entra tudo ou nada), PT-09 (dinheiro em centavos), PT-10 (WCAG 2.2 AA, celular e estados) e PT-11 (LGPD: cadastro mínimo e o arquivo não fica guardado).

A tela parte do Portal v1 aprovado: moldura, barra de baixo no celular, CSS e peças. A lista de Clientes e a de Contratos são as aprovadas, com o botão novo. Os passos repetem o desenho aprovado de Petições; a tabela que vira cartões, os números do alto e o resumo lateral são os de Comercial e Contratos. As peças novas têm o prefixo `im-`.

## Como abrir

- `index.html` mostra os 20 estados em computador (1440) e celular (412), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- `publicar.html` é o mesmo `index.html` com as capturas embutidas (9,4 MB), para publicar como uma página só.
- `importacao.html` abre sozinho, com as fontes, o CSS e os ícones embutidos. O estado vem do endereço, por exemplo `importacao.html?estado=previa`, `?estado=previa-duplicado` ou `?estado=desfazer`. No celular, `&mais=1` abre a folha Mais.
- Abaixo de 760 px, o HTML vira a versão de celular. Funcionam os botões que abrem e fecham janelas, o Esc e o Mais. O resto é desenho.
- As capturas de celular mostram a página inteira, com a barra de baixo no fim. Com janela aberta, a captura mostra só a tela.
- A pasta `_fonte/` guarda os scripts, e `sh _fonte/gerar.sh <pasta>` refaz tudo (precisa do `@axe-core/playwright` instalado ao lado ou da variável `AXE_DIR`, e do `playwright` achável pelo node, por exemplo com `NODE_PATH`):
  - `comum.py` é a cópia sem mudança do Portal v1; `pecas.py`, `clientes.py` e `contratos.py` são as cópias sem mudança de Clientes e de Comercial e Contratos;
  - `importacao.py` gera o HTML. Ele carrega as definições do `clientes.py` e do `contratos.py` (sem gerar os HTML deles) e acrescenta as peças `im-`;
  - `casos.py` gera a lista de estados e o `index.html`; `fotos.cjs` faz as capturas com deviceScaleFactor 2 e roda as conferências; `webp.py` converte para WebP; `publicar.py` gera o `publicar.html`.
- Todos os dados são fictícios. Os CPFs e CNPJs foram gerados com dígitos válidos (o errado de propósito é o da linha 4), e os e-mails usam o domínio `exemplo.com.br`. O elenco é o de Clientes e Contratos (Antônia Ferreira Prado, Hélio Batista Corrêa, Marina Ribeiro, Felipe Matos, Paula Nunes), mais clientes novos que só existem na planilha.

## Decisões de design

### Entrada

1. **O botão “Importar planilha” fica no cabeçalho de Clientes, ao lado de “Novo cliente”, e no de Contratos.** É secundário, porque o dia a dia é cadastrar um por um. Os dois abrem o mesmo fluxo; vindo de Contratos, “Clientes e contratos” já vem marcado. A importação mora em Clientes (parte comum), porque todo contrato precisa de um cliente.
2. **No escritório novo, a lista vazia de Clientes põe a importação como ação principal** e o cadastro um por um como segunda saída, com o atalho para a planilha-modelo (estado `clientes-vazio`). É o momento em que a importação mais ajuda.
3. **O histórico das importações fica em Clientes › Importações**, com um link no pé da lista de Clientes, no passo 1 e no resultado. Não ganhou item próprio no menu: é usado poucas vezes.

### Passo 1: o arquivo

4. **Quatro passos numerados: o arquivo, as colunas, a prévia e importar.** É o desenho dos passos de Petições. Cada passo feito mostra o que se escolheu (o nome do arquivo, “18 de 20 colunas ligadas”, “148 linhas conferidas”) e leva de volta a ele.
5. **O que importar é escolhido antes do arquivo:** “Só clientes” (uma linha por cliente) ou “Clientes e contratos” (uma linha por contrato; o cliente se repete pelo CPF ou CNPJ). Assim a prévia sabe se deve procurar colunas de contrato.
6. **A planilha-modelo é oferecida, não exigida.** O texto diz que não precisa mudar a planilha do escritório, porque o passo 2 liga as colunas. A janela `modelo` mostra cada coluna, se é obrigatória e um exemplo, e as três regras: uma linha por contrato; quatro dos sete tipos de honorário vêm da planilha (fixo, parcelado, mensal e êxito em percentual; sucumbência, por ato e percentual recorrente se completam na ficha do contrato, porque dependem de etapa do caso ou de base mensal); valores com ou sem “R$” valem o mesmo.
7. **Os limites são ditos antes de enviar:** .xlsx ou .csv (com o caminho do Google Planilhas: Arquivo › Fazer download › Microsoft Excel), até 5 MB e 2.000 linhas, e a primeira linha com os nomes das colunas. 2.000 linhas cobrem com folga um escritório de 3 a 10 pessoas; quem passar divide em duas.
8. **O arquivo não fica guardado (PT-11), e a tela diz isso três vezes:** no passo 1, na confirmação e no resultado (“foi apagado do servidor às 15h42”). Ele é lido no servidor, no Brasil, e apagado ao terminar ou cancelar; se a pessoa sair no meio, em 24 horas. Fica registrado só o nome do arquivo, quem enviou e quando. A prévia (as linhas já lidas, com as correções) fica 24 horas só para quem importou e é apagada junto.
9. **Erros de arquivo dizem o que fazer e nada é importado** (estado `arquivo-erro`). O exemplo é um PDF no lugar da planilha. Ao lado ficam as outras mensagens, com o código de cada uma: planilha vazia, grande demais, protegida por senha e sem os nomes das colunas. O T3jus nunca pede a senha do arquivo.
10. **Ler a planilha mostra o andamento** (“96 de 148 linhas”) com “Cancelar e apagar o arquivo” (estado `lendo`).

### Passo 2: as colunas

11. **Cada coluna da planilha aparece com o primeiro valor como exemplo e um “Vai para” já sugerido pelo nome.** “Celular” vira Telefone ou WhatsApp, “Advogado” vira Responsável pelo contrato. A última coluna diz como foi ligada: pelo nome, por você, ou fica de fora. As colunas do cliente e as do contrato ficam em dois grupos.
12. **As colunas que ficam de fora aparecem com o motivo.** “Obs.” fica de fora por padrão: observação livre pode trazer dado que o cadastro não pede (cadastro mínimo, PT-11). “Área” fica de fora porque entra no Jurídico, ao cadastrar o caso. A pessoa pode ligar qualquer uma delas, se quiser.
13. **Valores que viram itens das listas do T3jus são ligados uma vez por valor, não por linha.** “Dra. Marina” (61 linhas) vira Marina Ribeiro; “Dr. Paulo”, que saiu do escritório e não está na Equipe, vai para quem a pessoa escolher (EX-10: nada fica sem dono). O mesmo vale para a forma de cobrança (“mensalidade” vira Mensal) e para a origem, que usa a lista fixa aprovada em Clientes. Estado civil e UF são reconhecidos sozinhos (“casada” vira Casado(a)).
14. **O que é obrigatório fica ao lado, como lista de conferência:** nome; telefone ou e-mail; e, havendo contrato, objeto, tipo, valor, responsável e, no parcelado, número de parcelas e primeiro vencimento. É o mínimo do banco (`clientes_escritorio` e `contratos`). Sem a coluna da data da assinatura, os contratos entram em elaboração, como no contrato feito à mão.
15. **Campo obrigatório sem coluna é erro no padrão aprovado** (estado `colunas-erro`): resumo no topo com links, erro preso à coluna dizendo o que fazer e a lista ao lado marcando o que falta. “Ver a prévia” não fica desabilitado.

### Passo 3: a prévia antes de salvar

16. **Nada é salvo até importar, e a faixa do alto diz isso.** A prévia é uma conta feita no servidor, guardada só para quem importa.
17. **Os quatro números do alto são também filtros:** linhas lidas, prontas, com aviso (você decide) e com erro (corrija ou pule). É o mesmo componente aprovado em Atendimentos e Honorários.
18. **Cada linha mostra o número dela na planilha**, para a pessoa achar a linha no Excel, o cliente (nome, documento, contato), o contrato com o que gera no Financeiro e a situação. Linha com erro ganha filete vinho 3 e fundo rosado; com aviso, filete âmbar. Cada situação tem selo escrito e ícone, não só cor. No celular, cada linha vira um cartão com os rótulos.
19. **Erro: corrigir na própria prévia ou pular a linha** (estado `previa-erros`). A linha abre um bloco com só os campos daquela linha; a correção vale para esta importação e não muda a planilha. Os exemplos: CPF com dígito errado (a mensagem é a de Clientes, com a saída de importar sem CPF), sem telefone e sem e-mail, data que não existe (31/02) e valor com a letra O no lugar do zero (o caractere errado aparece marcado). Linha corrigida mostra “Corrigida por você” e o valor antigo.
20. **Aviso: possível duplicado com cliente já cadastrado** (estado `previa-duplicado`). A linha abre a comparação campo a campo com o cadastro e três saídas:
    - **Juntar ao cadastro existente (recomendado):** o contrato entra na ficha do cliente e, da planilha, só entra o que está vazio no cadastro. Nada do cadastro é trocado. A tabela marca o que fica e o que entra;
    - **Criar outro cliente:** só se não for a mesma pessoa; as duas fichas ficam com o aviso de possível duplicado, como em Clientes;
    - **Pular a linha.**

    Com vários duplicados pelo CPF, “Juntar as 6” resolve de uma vez. O mesmo telefone de outro cliente também é aviso (pode ser da família), como em Clientes. Outros avisos: contrato sem data da assinatura (entra em elaboração) e valor fora das listas (estado civil “amasiada”).
21. **Duas linhas com o mesmo CPF na planilha são um cliente só com dois contratos.** Não é aviso; a linha diz “mesmo CPF da linha 2: um cliente só”.
22. **O que cada contrato gera aparece antes de salvar** (estado `previa-contrato`): R$ 5.000,00 em 3 dá 2 de R$ 1.666,67 e 1 de R$ 1.666,66, e a soma fecha no total. A parcela já paga aparece como informação; a vencida e não paga entra em A receber como atrasada, para a cobrança começar; a futura entra a vencer. O número do contrato (C-AAAA-NNN) sai na importação, na sequência do escritório.
23. **Parcela paga antes do T3jus não vira recebimento.** Fica no contrato como informação (“pago antes do T3jus”), fora do Caixa e sem recibo, porque não houve registro de pagamento com data, forma e quem recebeu. É a pergunta 2.
24. **O resumo lateral “O que vai entrar”** soma clientes (novos e juntados), contratos (ativos e em elaboração), o valor e as parcelas no Financeiro, as vencidas que entram em atraso, as mensalidades e os êxitos que dependem do caso, os três próximos meses e o que foi pago antes. No celular ele desce para depois da lista.
25. **O botão “Importar 131 linhas prontas” nunca fica desabilitado.** Se ainda há erro ou aviso, a linha embaixo diz que essas linhas ficam de fora e vão para a planilha de linhas que não entraram.

### Importar e o resultado

26. **A confirmação é uma janela com o resumo do que entra e do que fica de fora** (estado `confirmar`), e com três avisos: entra tudo ou nada; o arquivo é apagado ao terminar; dá para desfazer até 27/11 (7 dias).
27. **Entra tudo ou nada (PT-04).** Se o servidor parar no meio, nada fica pela metade e a prévia continua guardada (estado `importar-erro`, com código para o suporte). Enquanto importa, a pessoa pode sair da página: o aviso chega no sino (estado `importando`).
28. **O resultado é o ponto de atmosfera:** o campo âmbar com o número das linhas que entraram e das que ficaram de fora. Embaixo, o que entrou, cada um com o link certo (clientes com o filtro “Desta importação”, os cadastros completados, contratos, A receber). As linhas de fora vêm com o motivo e uma planilha para baixar só com elas, que fica disponível até o fim do prazo de desfazer e depois é apagada. Essa planilha tem só as linhas recusadas, não o arquivo enviado.
29. **Cada cliente e contrato importado diz na ficha que veio da planilha**, com o nome do arquivo, quem importou e quando. O que um cadastro juntado recebeu fica no histórico da ficha, como uma edição.
30. **Desfazer não apaga nada em silêncio (PT-03)** (estado `desfazer`). É um `alertdialog` com motivo obrigatório. Os clientes novos ficam inativos com o motivo (continuam em Inativos), os cadastros completados voltam ao que eram, os contratos ficam encerrados e as parcelas, canceladas, tudo com o motivo e no histórico. O que alguém mexeu depois da importação (um atendimento, uma parcela recebida) fica como está, e a lista vem no fim, para decidir um por um. Desfazer vale por 7 dias e só para quem importou e para a sócia dona (pergunta 4).
31. **O histórico das importações** mostra arquivo, quem, quando, o que entrou e a situação: concluída (com o prazo de desfazer ou “o prazo acabou”) ou desfeita (quem, quando e o motivo).

### Quem pode

32. **Clientes: todos da equipe; contratos: quem tem a área Contratos** (pergunta 1). É a mesma regra do cadastro um por um. Paula, sem Contratos, importa só clientes; o passo 1 diz que as colunas de contrato e de origem (área Comercial) ficam de fora e quem libera (estado `enviar-sem-contratos`). O servidor ignora essas colunas mesmo se vierem.
33. **Celular.** Clientes mora no Mais, que fica marcado. Os passos viram quatro botões numerados; a tabela de colunas, a prévia e o histórico viram cartões. Nos cartões, rótulo e valor ficam um embaixo do outro, para nenhum valor longo (e-mail, endereço) quebrar no meio da palavra. Nas colunas, o primeiro valor desce para baixo do nome da coluna e o selo “Pelo nome” some (os de erro e de fora continuam), para a página não ficar longa demais. A comparação do possível duplicado vira blocos: o nome do campo em cima e, embaixo, “Na planilha: …” e “Já cadastrado: …” com o resultado (igual, fica este, entra o da planilha). A janela da planilha-modelo segue o mesmo desenho. As janelas sobem de baixo, com os botões no rodapé.

## Acessibilidade (WCAG 2.2 AA)

- **Conferência automática** em 40 capturas (20 estados × computador e celular), feita pelo `fotos.cjs`. O resultado completo fica em `_conferencia.json`:
  - o axe (WCAG 2.0, 2.1 e 2.2, A e AA) não achou nenhuma violação;
  - nenhuma tela tem rolagem lateral, no computador nem no celular;
  - nenhum erro de script.
- **Alvos.** Todos os alvos das peças desta tela têm 44 px ou mais. As duas exceções que o script aponta vêm de peças aprovadas, sem mudança: a palavra-marca “T3jus” no alto do trilho (24 px, como em todas as telas aprovadas) e o campo de arquivo escondido (`input type=file` com a classe `sr`), cujo alvo é o rótulo “Escolher a planilha”, de 44 px, como no envio de documentos do Console aprovado.
- **Contraste.** Só pares do D2 e do conceito Gabinete. O valor errado marcado na prévia é vinho escuro sobre rosa claro, além de negrito; o filete âmbar do aviso é só decoração, porque o selo escrito diz “Possível duplicado”.
- **Formulários.** Cada “Vai para” tem rótulo (escondido na tela, lido pelo leitor: “Coluna C, Celular: vai para”). O que importar e as decisões do duplicado ficam em `fieldset` com `legend`. Os erros ficam ligados ao campo por `aria-describedby`, com `aria-invalid`, e há resumo no topo com links.
- **Estados.** Lendo e importando usam `aria-busy` e `role="status"`; o erro usa `role="alert"`. As janelas são `<dialog>` com `showModal()`; o desfazer é `alertdialog`, com o foco no motivo.
- **A prévia** é uma lista: cada linha tem os rótulos das colunas para o leitor de tela no computador e visíveis no celular.

## O que precisa de dado novo no servidor

Todas as tabelas têm `escritorio_id` e passam por `proteger_tabela_escritorio`. O escritório vem da sessão, nunca do navegador. Valores em centavos (inteiro).

### Tabelas

| Tabela | Campos | Observação |
|---|---|---|
| `importacao` | `id`, `escritorio_id`, `arquivo_nome`, `o_que` (clientes, clientes_contratos), `situacao` (lendo, previa, importando, concluida, falhou, desfeita, expirada), `linhas_lidas`, `ligacao_colunas` (JSON), `pares_valores` (JSON), `criado_por`, `criado_em`, `importado_em`, `desfazer_ate`, `desfeita_em`, `desfeita_por`, `motivo_desfazer`, `versao` | Sem o arquivo: só o nome. Guardião de transições na situação |
| `importacao_linha` | `id`, `escritorio_id`, `importacao_id`, `numero`, `dados` (JSON da linha lida, já com as correções), `situacao` (pronta, aviso, erro, pulada, importada), `problemas` (códigos), `decisao` (juntar, novo, pular), `cliente_id`, `contrato_id`, `corrigida_por` | Apagadas (as que não entraram) junto com a planilha de fora, no fim do prazo de desfazer; as da prévia não confirmada, em 24 horas |
| Campos novos em `clientes_escritorio` e `contratos` | `importacao_id` | Para o filtro “Desta importação”, a linha na ficha e o desfazer |
| Campo novo em `recebimentos_previstos` | `pago_antes` (booleano) | A parcela paga antes do T3jus: informação, fora do Caixa e sem recibo (depende da pergunta 2) |
| Histórico do escritório | Eventos `importacao_concluida`, `importacao_desfeita` (motivo), `cliente_juntado` (campos preenchidos) | Na mesma tabela de eventos de Clientes e Contratos |
| Arquivo enviado | Armazenamento privado e temporário (PT-07), apagado ao terminar, cancelar ou em 24 horas | Nunca entra na exportação nem nas cópias de segurança de longo prazo |

### API

| Rota | O que faz | Erros |
|---|---|---|
| `POST /v1/importacoes` | Recebe o arquivo e o que importar; lê as abas e devolve as colunas com a sugestão de ligação e os valores distintos que pedem par | `ARQUIVO_FORMATO`, `ARQUIVO_VAZIO`, `ARQUIVO_GRANDE`, `ARQUIVO_PROTEGIDO`, `SEM_CABECALHO`, `AREA_NAO_LIBERADA` (contratos sem a área) |
| `PATCH /v1/importacoes/:id/colunas` | Grava a aba, a ligação das colunas e os pares de valores; monta a prévia | `CAMPO_OBRIGATORIO_SEM_COLUNA` |
| `GET /v1/importacoes/:id/linhas?situacao=&q=&cursor=` | A prévia paginada, com o resumo do que vai entrar (contagens, centavos exatos, três meses) | — |
| `PATCH /v1/importacoes/:id/linhas/:n` | Corrige a linha, decide o aviso ou pula | `CPF_INVALIDO`, `CNPJ_INVALIDO`, `DATA_INVALIDA`, `VALOR_INVALIDO`, `CONTATO_OBRIGATORIO` |
| `POST /v1/importacoes/:id/decisoes` | Decisão em lote (“Juntar as 6”) | — |
| `POST /v1/importacoes/:id/importar` | Grava tudo numa transação: clientes, contratos, programação e eventos; apaga o arquivo | 409 se a prévia mudou; tudo ou nada |
| `GET /v1/importacoes` e `/:id/fora.xlsx` | Histórico e a planilha das linhas que não entraram | 410 depois do prazo |
| `POST /v1/importacoes/:id/desfazer` | Inativa, encerra e cancela com o motivo o que não foi mexido; devolve o que ficou | `MOTIVO_OBRIGATORIO`, `PRAZO_ENCERRADO`, `SEM_PERMISSAO` |
| Tarefa diária | Apaga arquivos e prévias de mais de 24 horas e as linhas de fora depois do prazo | — |

### Para o painel

- A entrega desta tela atende VA-05 só em parte (planilhas). Citar VA-05 com um item “pendente” no painel: importar de outros sistemas (pergunta 3).
- Itens “pendente” para o painel, conforme as respostas: parcelas pagas antes do T3jus (pergunta 2) e o prazo de desfazer (pergunta 4).

## Perguntas para a Carol

1. **Quem pode importar?** Hoje todos da equipe cadastram clientes um por um, e só quem tem a área Contratos cria contratos. **Recomendo a mesma regra na importação:** clientes, todos da equipe; contratos, só quem tem Contratos; desfazer, só quem importou e a sócia dona. A outra opção é deixar a importação inteira só com a sócia dona, porque mexe em muita coisa de uma vez.
2. **Parcelas que o cliente já pagou antes do T3jus entram como recebidas?** **Recomendo que não:** entram só as que faltam (a vencer e as vencidas sem pagamento, que viram atraso), e o que já foi pago fica no contrato como informação, fora do Caixa e sem recibo. Assim o Caixa e os recibos mostram só o que passou pelo T3jus, e o contador não recebe pagamento repetido.
3. **Importar de outros sistemas (ADVBOX, Astrea e outros) agora ou depois?** **Recomendo depois, só planilha agora.** Esses sistemas exportam planilha, e o passo de ligar as colunas já serve para elas. Uma integração direta com cada sistema fica para quando um piloto pedir.
4. **Por quanto tempo dá para desfazer a importação?** **Recomendo 7 dias**, e só para o que ninguém mexeu depois: o que já tem atendimento ou parcela recebida fica, e a lista vem no fim para decidir um por um. Depois de 7 dias, quem quiser tirar um cliente usa o inativar de sempre.
