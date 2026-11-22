# Portal: jornada do cliente, da assinatura ao fechamento · notas

**Aprovado pela Carol em 22/11/2026 às 20h22 (Bahia), com "pode seguir": valem as 11 recomendações das perguntas.** A pergunta 5 (fechamento no financeiro de caso sem RPV nem alvará) foi aprovada sem desenho: a folha "Fechamento do caso" na ficha do contrato ainda vai ser desenhada, e fica pendente no painel. Fecha as lacunas da jornada do cliente no Portal com as 8 mudanças que a Carol aprovou em 22/11/2026. As ideias são AP-07, CH-11, CH-12, CH-13, EX-16 e EX-17 do `IDEIAS.md`. O grupo 9, pedido depois pela Carol, trata dos documentos para começar o processo (AP-08 e EX-18): “anexar rg/cpf, comprovante de residência, etc.. todos os documentos que são necessários para dar início ao processo”. Pesam também CH-10 (a assinatura abre o caso), EX-01 (caso com vários clientes), FI-08 (fechamento do caso no financeiro), PT-02 (cada pessoa vê o mínimo), PT-03 (nada é apagado) e PT-10 (WCAG 2.2 AA, celular, vazio e erro).

A base são os desenhos aprovados, sem mudança no que já existe: a ficha ligada (`portal-ficha-cliente-ligada`: o âmbar "Próximo passo", a janela da assinatura com o caso e "Abrir o caso"), os botões do Histórico (`portal-historico-botoes`), o Jurídico (`portal-juridico`), o Financeiro (`portal-financeiro`, ficha do repasse e fechamento), o êxito para conferir (`portal-exito-conferir`), Procurações e modelos (`portal-procuracoes`, "Anexar os assinados"), Conversas e Agenda (`portal-agenda-conversas`) e a lista de Contratos (`portal-comercial-contratos`). O elenco e o "hoje" são os de sempre: Ribeiro & Matos, Marina Ribeiro como sócia dona, quarta-feira, 18/11/2026, a cliente Antônia Ferreira Prado e o caso "Ferreira Prado x INSS". As peças novas têm o prefixo `jf-`.

**Sobre as datas.** Os estados do fechamento (grupos 4 e 5) contam a mesma cliente mais adiante na história: o caso terminou com ganho e a RPV entrou. Para não trocar o "hoje" aprovado, nesses estados Antônia é cliente desde 10/03/2025 e o contrato é o `C-2025-047`. Nos outros grupos vale a história de sempre (contrato `C-2026-031`, em elaboração desde 16/11). Os valores da RPV são os do repasse aprovado no Financeiro. Para o contrato sem caso entra uma cliente nova, a **Auto Peças Moreira Ltda.** (consultoria trabalhista mensal), porque a Farmácia Bom Jesus, que seria a candidata, já tem três casos no contrato aprovado.

## Como abrir

- `index.html` abre sozinho, com o CSS, as fontes e os ícones embutidos. Funciona publicado como página única.
- O botão **Estados**, no canto de baixo, troca de estado. O estado também vem do endereço, por exemplo `index.html?estado=assinar-juntar`. Valem os atalhos de sempre (`&quem=juridico`, `&mais=1`).
- Abaixo de 760 px, a página vira a versão de celular, com a barra de baixo.
- Funcionam: abrir e fechar as janelas (pelo botão, pelo X e pelo Esc) e os links entre os estados principais. O resto é desenho.
- As capturas `<estado>-computador.png` (1440) e `<estado>-celular.png` (390) ficam na pasta. As de janela crescem até caber a janela inteira; as de celular mostram a página inteira, com a barra de baixo no fim.
- `_fonte/gerar.sh <pasta>` refaz tudo:
  - `comum.py`, `clientes.py`, `juridico.py` e `ficha_ligada.py` são cópias sem mudança das aprovadas;
  - `jornada.py` lê o `ficha_ligada.py` até o começo dos estados e lê, só para ler, o HTML aprovado de Contratos, Procurações e modelos, Financeiro, Conversas, Agenda e Clientes em `docs/design/aprovadas/` (variável `APROV`). Dali vêm o CSS, as barras de área e as telas de fundo; o texto e as janelas novas são montados em cima delas;
  - `fotos.cjs` faz as capturas e roda as conferências. O resultado fica em `_conferencia.json`.
- Todos os dados são fictícios.

## Estados (40)

| Grupo | Estado | Quem | O que mostra |
|---|---|---|---|
| 1. Uma porta só (CH-11) | `anexar-caso` | Marina | "Anexar os assinados" com o contrato em elaboração: a mesma pergunta do caso da assinatura, com o caso novo já marcado e preenchido |
| | `anexar-erro` | Marina | Não registrou a assinatura nem abriu o caso; os arquivos ficaram guardados |
| | `anexar-sem-juridico` | Bianca | Sem a área Jurídico: "O caso abre em Jurídico" com os dados do contrato, sem escolha |
| | `anexado-caso` | Marina | Depois de anexar: contrato ativo, o âmbar do contrato mostra o caso aberto e o aviso traz "Ver o caso" |
| 2. Assinados sem caso (CH-11) | `contratos-sem-caso` | Marina | Lista de Contratos com o filtro "Assinados sem caso (2)" e "Abrir o caso" em cada linha |
| | `contratos-sem-caso-abrir` | Marina | A janela do caso aberta da lista, com as três escolhas (inclui "não tem caso") |
| | `contratos-sem-caso-vazio` | Marina | O filtro sem nenhum contrato |
| | `casos-sem-caso` | Marina | Jurídico › Casos e processos com o aviso dos 2 contratos e "Abrir o caso" |
| 3. Juntar (CH-12) | `assinar-juntar` | Marina | Antônia já tem "Ferreira Prado x INSS" em andamento, sem contrato: "Juntar a este caso" vem marcado; "Abrir um caso novo" é a segunda escolha |
| 4. Fechamento (EX-16) | `fecha-exito` | Marina | Âmbar "Fechar o caso", passo 1: "Conferir o êxito" |
| | `fecha-repasse` | Marina | Passo 2: "Registrar o repasse" a Antônia |
| | `fecha-financeiro` | Marina | Passo 3: "Ver o acerto" (faltam parceiro e perito) |
| | `fecha-contrato` | Marina | Passo 4: o financeiro fechou sem o contrato; "Encerrar o contrato" |
| | `fecha-larissa` | Larissa | Sem a área Financeiro: o texto diz quem faz, e o botão é só "Ver o caso" |
| | `atendido` | Marina | Tudo feito: "Cliente atendido", com "Gerar proposta" como secundário |
| | `lista-passos` | Marina | Lista de Clientes: "Fechar o caso", "Cliente atendido" e "Contrato ativo" na coluna Próximo passo |
| 5. Em cadeia (EX-17) | `caso-acerto` | Marina | Ficha do caso "Encerrado · acerto pendente", com "Ver o acerto" e o quadro "Acerto no Financeiro" |
| | `caso-acerto-larissa` | Larissa | O mesmo caso sem valores e sem link para o Financeiro |
| | `acerto` | Marina | Financeiro › Repasses › Antônia: o fechamento com as 2 pendências (a tela aprovada) |
| | `encerrar-cadeia` | Marina | Tudo pago: a janela "Encerrar o caso no financeiro" com "Encerrar também os contratos ligados" marcado |
| | `encerrar-cadeia-erro` | Marina | Nada foi encerrado (o contrato mudou no meio) |
| | `encerrado-cadeia` | Marina | Confirmação: caso e contrato encerrados, com o link para a ficha de Antônia |
| 6. Contrato sem caso (CH-13) | `contrato-ativo` | Marina | Ficha da Auto Peças: o âmbar diz "Contrato ativo", com "Ver o contrato", e não "Gerar proposta" |
| | `contrato-sem-caso` | Marina | Ficha do contrato: a folha "Caso" diz que não tem caso, quem marcou e quando, com "Abrir um caso para este contrato" |
| | `contrato-abrir-caso` | Marina | A janela: abrir um caso novo ou juntar a um que existe; a marca sai |
| 7. Pela conversa (AP-07) | `conversa-nova` | Marina | Número novo: "Cadastrar como cliente" e "Marcar primeira reunião" |
| | `cadastro-conversa` | Marina | Novo cliente já com o nome e o telefone da conversa; "Cadastrar e voltar à conversa" |
| | `conversa-ligada` | Marina | De volta à conversa, ligada à ficha de Rafaela, com o aviso |
| | `reuniao-conversa` | Marina | "Novo compromisso" aberto em cima da conversa, já com Rafaela e o número |
| 8. Uma vez só | `passo-uma-vez` | Marina | O passo ("Registrar assinatura") só no âmbar; ao lado do Histórico, só "Registrar atendimento" |
| 9. Documentos para começar (AP-08, EX-18) | `docs-ficha` | Marina | Ficha de Antônia: a folha nova "Documentos pessoais" (2 em dia, comprovante com mais de 90 dias, certidão de casamento faltando) e o âmbar "Juntar os documentos, 3 de 6" |
| | `docs-anexar` | Marina | Janela "Anexar documento": qual documento, "Tirar foto" ou "Escolher arquivo", 2 fotos que viram um PDF, a data do documento e "Marcar como chegou" no caso |
| | `docs-anexar-erro` | Marina | Nada guardado: 11 fotos (o limite é 10) e a data depois de hoje |
| | `docs-ficha-vazio` | Marina | Rafaela Moura, cadastrada hoje: nenhum documento, com os que quase todo caso pede, "Anexar documento" e "Pedir pelo WhatsApp" |
| | `docs-lista` | Marina | Jurídico › Documentos para começar: a lista de previdenciário (7), cada um "Pessoal · fica na ficha" ou "Do caso", "Se houver", um item em edição |
| | `docs-lista-vazia` | Marina | Família sem lista: "Usar a sugestão do T3jus" ou "Começar do zero", com a sugestão à vista |
| | `docs-abrir-caso` | Marina | "Abrir o caso" com a seção "Documentos para começar": 2 "Já temos", 4 a pedir, 1 tirado, mais um documento e o aviso a Joana com a prévia |
| | `docs-abrir-sem-lista` | Marina | Abrir o caso de Irene (família, sem lista): nada é pedido sozinho; o RG da ficha vai junto e dá para pedir um a um |
| | `docs-caso` | Marina | Ficha do caso: o âmbar diz "Antes de seguir: juntar os documentos, 3 de 6" e a folha nova mostra o que falta e o que já temos |
| | `docs-completo` | Marina | Tudo chegou: o âmbar da ficha volta a "Caso em andamento", os 4 documentos pessoais em dia, e o aviso diz que o lembrete parou |

## Decisões de design

### 1. Uma porta só para a assinatura (CH-11)

1. **"Anexar os assinados" ganha a seção "O caso em Jurídico" quando o contrato está em elaboração.** É a mesma seção da janela "Registrar assinatura" (as três escolhas, o caso novo já marcado e preenchido com nome, área, responsável e papel). Ela fica no fim da janela, depois dos documentos, para os documentos continuarem juntos. A frase do bloco do contrato passa a dizer que o caso abre "como você escolher logo abaixo".
2. **O botão diz tudo o que acontece: "Anexar, ativar e abrir o caso".** Com "Juntar" ele vira "Anexar, ativar e juntar ao caso"; com "não tem caso", "Anexar e ativar o contrato".
3. **Quem anexa continua na página do contrato** (aba Documentos), e o aviso de sucesso traz "Ver o caso". O âmbar do contrato passa a mostrar o caso aberto. Quem anexa está no meio de uma tarefa de documentos; levar a pessoa para o Jurídico no meio dela seria um salto. Na "Registrar assinatura" da ficha do cliente, a ida ao caso continua como aprovada. Esta é a pergunta 1.
4. **Sem a área Jurídico (Bianca), o caso abre sozinho com os dados do contrato**, como na assinatura aprovada (decisão 19 da ficha ligada). A janela mostra o caso, a área, a responsável e a etapa, e diz que Larissa recebe o aviso no sino.
5. **A seção só aparece quando o anexo ativa o contrato.** Anexar só a procuração, ou o assinado de um contrato que já está ativo, não pergunta nada.
6. **Erro:** assinatura e caso andam juntos. Os arquivos já enviados ficam guardados (como hoje) e a janela diz que o contrato continua em elaboração, com o código para o suporte.

### 2. Assinados sem caso (CH-11)

7. **Na lista de Contratos, o filtro novo "Assinados sem caso"**, com a contagem num disco âmbar (só aparece quando há algum). Ele mostra os contratos ativos sem caso ligado e sem a marca "não tem caso". As colunas trocam "Próximo recebimento" e "Situação" por "Assinado em" e "Caso", e cada linha tem "Abrir o caso".
8. **"Abrir o caso" aberto destas listas oferece também "Este contrato não tem caso".** A janela curta aprovada não tinha essa escolha; sem ela, um contrato de consultoria assinado antes ficaria na lista para sempre. O título passa a "O caso deste contrato".
9. **No Jurídico, o aviso fica no alto de Casos e processos**, entre a busca e "Onde estão os casos", com os contratos e "Abrir o caso" em cada um, e o link para a lista de Contratos. Some quando não há nenhum. A escolha pela lista de Casos (e não pelo Início) é a pergunta 2.
10. **Quem não tem a área Jurídico vê o filtro, mas não o botão**: a linha diz quem abre (quem tem Jurídico). A rota de abrir o caso de contrato já assinado continua pedindo `juridico.editar`, como aprovado.

### 3. Juntar ao caso que já existe (CH-12)

11. **Se o cliente tem um caso em andamento sem contrato dele, a primeira escolha é "Juntar a este caso", já marcada**, com o nome do caso no rótulo, a etapa, a responsável e quem abriu, e o papel do cliente como já está no caso. "Abrir um caso novo" vem em segundo, com a ajuda "Só se este contrato for de outro processo". "Não tem caso" continua por último.
12. **Com mais de um caso assim**, a mesma escolha vem marcada e mostra uma lista para escolher o caso, sem nenhum pré-escolhido. Este estado não ganhou captura.
13. O âmbar da ficha já avisa antes: "Ao registrar, o contrato entra no caso Ferreira Prado x INSS, que já existe."

### 4. O passo do fechamento (EX-16)

14. **Depois da etapa final do caso, o âmbar passa a "Fechar o caso"**, com o sobretítulo "Próximo passo · fechamento". No lugar da trilha Proposta → Caso, que já está toda feita, vem a lista dos 4 passos do fechamento: conferir o êxito, repassar ao cliente, encerrar no financeiro e encerrar o contrato. Cada passo diz o que foi feito e quando, ou o que falta e quanto. O feito tem ✓ em vinho; o próximo tem o número em destaque; o resto, o número com contorno.
15. **O botão é o da próxima coisa:** "Conferir o êxito" (A receber, com o êxito aberto), "Registrar o repasse" (ficha do repasse), "Ver o acerto" (fechamento do caso no Financeiro) e "Encerrar o contrato" (ficha do contrato com a janela aberta). Embaixo, **"Quem faz"** diz a área e as pessoas.
16. **Quem não tem a área do passo não ganha o botão**: o texto diz quem faz e que a pessoa recebe o aviso quando fechar. Para Larissa, o botão é "Ver o caso" (secundário). Para quem tem Comercial, vale a regra aprovada: o principal vira "Registrar atendimento".
17. **Passos que não se aplicam somem.** Sem êxito no contrato, não há "Conferir o êxito"; sem dinheiro de terceiros (sem RPV ou alvará), não há "Repassar"; caso com perda vai direto para "Encerrar no financeiro" (o que já foi recebido) e "Encerrar o contrato".
18. **Só quando tudo acabou** o âmbar diz "Cliente atendido", com os 4 passos feitos, "Gerar proposta" como secundário e "Ver o caso" ao lado.
19. **A situação do cliente continua "Ativo"; não há situação nova.** Recomendação da Carol mantida, por três motivos: (a) a situação hoje é sobre a relação e a LGPD (ativo, inativo, arquivado), e o cliente atendido continua cliente; (b) uma situação nova precisaria de regra para sair dela quando chega proposta nova, atendimento ou caso, e o passo já faz isso sozinho; (c) a lista de Clientes já mostra o passo na coluna "Próximo passo", então "Cliente atendido" fica visível sem mudar filtros, relatórios e inativação. Esta é a pergunta 3.
20. **A regra do passo ganha estes tipos, em ordem**, depois de proposta, contrato em elaboração e contrato sem caso: `CASO` (em andamento), `FECHAMENTO` (caso encerrado com algo do acerto ou contrato ainda aberto), `CONTRATO_ATIVO` (contrato ativo marcado "não tem caso", veja a parte 6) e, só depois, `ATENDIDO` (teve caso ou contrato e está tudo encerrado). `SEM_PROPOSTA` fica só para quem nunca teve nada.

### 5. Encerrar em cadeia (EX-17)

21. **Na ficha do caso "Encerrado · acerto pendente", o âmbar da etapa troca "Mudar etapa" por "Ver o acerto"**, que leva à ficha do repasse no Financeiro, onde está o fechamento. Na lateral, o quadro novo **"Acerto no Financeiro"** diz o que já foi feito e o que falta, com valores, e lembra que o financeiro e o contrato se encerram de uma vez.
22. **Quem não tem a área Financeiro (Larissa)** vê o quadro sem valores, sem o botão, com quem cuida, como na ficha aprovada sem Financeiro.
23. **Com tudo pago, o âmbar da ficha do repasse passa a "Encerrar o caso no financeiro"** (antes era "Registrar repasse"), e o botão secundário da folha "Fechamento do caso" sai: o botão fica uma vez só. Com pendência, vale o aprovado: a janela diz o que falta.
24. **A janela "Encerrar o caso no financeiro" ganha a seção "Contratos ligados ao caso"**, com "Encerrar também os contratos ligados" já marcado, a lista dos contratos e o motivo que fica em cada um: "Caso Ferreira Prado x INSS encerrado no financeiro em 18/11/2026." Só entram contratos que não têm outro caso em andamento (EX-01); os outros nem aparecem. O botão vira "Encerrar o caso e o contrato" (ou "…e os contratos"); desmarcado, volta a "Encerrar o caso".
25. **Caso e contratos andam juntos**: se algo falha, nada é encerrado (`encerrar-cadeia-erro`).
26. **Depois:** o aviso diz o que foi encerrado, o quadro "Fechamento do caso" mostra quem encerrou e quando, e o âmbar leva à ficha de Antônia, que agora diz "Cliente atendido".

### 6. Contrato sem caso (CH-13)

27. **Cliente com contrato ativo marcado "não tem caso" mostra "Contrato ativo" no âmbar**, com o número, o objeto e a próxima mensalidade, e o botão "Ver o contrato". A trilha mostra Proposta, Contrato e Assinatura feitos e o último passo como "Sem caso". Não aparece "Gerar proposta".
28. **Na ficha do contrato, a folha "Casos deste contrato" vira "Caso"**, que diz quem marcou "não tem caso" e quando, e oferece **"Abrir um caso para este contrato"**. A janela tem "Abrir um caso novo" e "Juntar a um caso que já existe"; ao confirmar, a marca sai e fica no histórico do contrato.
29. Na aba Contratos da ficha do cliente, a coluna Caso diz "Não tem caso · consultoria", sem botão: a ação mora na ficha do contrato.

### 7. Cadastro pela conversa (AP-07)

30. **"Cadastrar como cliente" abre o Novo cliente com o nome e o telefone da conversa**, cada um com a marca "da conversa", e uma faixa no alto: "Veio da conversa com (11) 97640-2281…", com "Voltar sem cadastrar". O botão vira **"Cadastrar e voltar à conversa"**. A IA continua sem cadastrar sozinha.
31. **Ao salvar, a pessoa volta à conversa, já ligada à ficha**: o cabeçalho diz "Cliente desde hoje", a lateral troca "A IA anotou" por "Cliente" (com "Marcar primeira reunião" e "Abrir a ficha"), e o aviso confirma. O que foi dito de saúde continua só na conversa.
32. **"Marcar primeira reunião" abre o "Novo compromisso" em cima da conversa**, sem sair dela: tipo "Reunião com cliente", "Primeira reunião · Rafaela Moura", o responsável da conversa (Diego) e, no lugar do campo Cliente, o quadro **"Com quem"**, com o nome e o número. O lembrete pelo WhatsApp vai para o número da conversa. Quando a pessoa for cadastrada, o compromisso passa para a ficha. Esta é a pergunta 4.

### 8. O botão do passo uma vez só

33. **O botão do próximo passo fica só no quadro âmbar.** Ao lado de "Histórico de atendimento" fica só "Registrar atendimento" (primário, como no desenho aprovado de um botão só, em `portal-historico-botoes`). O "Registrar atendimento" da linha do próximo contato, no âmbar, continua como estava aprovado.

### 9. Documentos para começar (AP-08, EX-18)

34. **Os documentos pessoais ficam numa folha nova da aba Ficha, "Documentos pessoais"**, logo abaixo de "Dados e qualificação". Servem a todos os casos do cliente. A folha separa "Precisa de atenção" (falta ou passou do prazo) de "Em dia", e cada linha diz o que é, a data do papel, quem anexou e quando. As ações são "Abrir", "Anexar um novo" e, no que falta, "Pedir de novo", que abre a conversa do contato principal com o texto pronto, como o "Pedir de novo" aprovado em Documentos do caso.
35. **Os tipos são fixos e poucos:** RG e CPF, CNH, comprovante de residência, certidão de casamento, de nascimento, de óbito e "Outro documento pessoal". Documento só do processo (CNIS, carta do INSS, laudos, holerites) continua em Documentos do caso.
36. **O comprovante de residência com mais de 90 dias ganha o selo "Mais de 90 dias"** e sobe para "Precisa de atenção". Os 90 dias contam da data que está no papel, não da data do anexo, e por isso a janela pede "Data do documento". O prazo de 90 dias é a recomendação (é o que INSS, cartórios e a maioria dos juízos aceitam) e muda em Ajustes do escritório. Esta é a pergunta 7.
37. **"Anexar documento" segue o padrão aprovado das fotos (F3.99):** "Tirar foto" (no celular abre a câmera) ou "Escolher arquivo"; PDF ou foto, até 10 MB; várias páginas num PDF só ou até 10 fotos, que viram um PDF na ordem da lista. Anexar um novo guarda o anterior, porque nada se apaga. O número do RG não sai da foto: a folha lembra de completar em Dados e qualificação.
38. **Quando há um pedido aberto do mesmo documento, a janela traz "Marcar como chegou em Ferreira Prado x INSS" já marcado.** Um anexo só resolve a ficha e o pedido do caso, e o próximo passo anda.
39. **Erro:** nada é guardado, as fotos ficam na janela, e o aviso no alto leva a cada ponto (11 fotos; data depois de hoje), como no "Anexar os assinados" aprovado.
40. **Ficha sem documentos (vazio):** diz para que serve a folha e mostra os que quase todo caso pede (RG e CPF ou CNH, comprovante de até 90 dias, certidão de casamento ou nascimento), com "Anexar documento" e "Pedir pelo WhatsApp".
41. **A lista por área fica em Jurídico › Casos e processos › "Documentos para começar"**, ao lado de "Etapas do escritório" e com o mesmo desenho: só a sócia dona edita, e a equipe vê. As áreas ficam em fichas no alto, com a contagem ou "sem lista". Cada documento tem nome, "Como pedir ao cliente" (o texto que vai no WhatsApp), "Onde fica" (pessoal, na ficha, ou do caso) e "Só se houver". O comprovante mostra "Vale 90 dias". Mudar a lista vale do próximo caso em diante.
42. **Área sem lista não pede nada sozinha.** A folha oferece "Usar a sugestão do T3jus" (o primário) ou "Começar do zero", com a sugestão à vista. As sugestões:
    - previdenciário: RG e CPF, comprovante, certidão de casamento ou nascimento, CNIS, carta do INSS, laudos e exames, certidão de óbito na pensão;
    - trabalhista: RG e CPF, comprovante, CTPS, holerites, TRCT, extrato do FGTS;
    - cível e consumidor: RG e CPF, comprovante, contrato ou nota fiscal, prints e protocolos;
    - família: RG e CPF, comprovante, certidões de casamento e dos filhos, comprovantes de renda, lista de bens e dívidas;
    - saúde: RG e CPF, carteirinha do plano, negativa do plano, relatório médico;
    - tributário: cartão CNPJ, contrato social, notas e guias.
43. **Na abertura do caso, a lista da área vem pronta numa seção "Documentos para começar"**, depois dos campos do caso. O que está na ficha e em dia vem como "Já temos", sem caixa de marcar. O comprovante vencido vem marcado para pedir de novo, com o motivo. "Se houver" vem marcado, e quem abre desmarca o que não serve (os laudos na pensão por morte). "Pedir mais um documento" aceita texto livre, como o "Pedir documento" de hoje. Trocar a área troca a lista.
44. **"Avisar Joana Prado pelo WhatsApp com a lista" vem marcado**, para o contato principal, com a prévia da mensagem (só os que faltam, com o "Como pedir" de cada um). Desmarcado, os pedidos ficam registrados do mesmo jeito.
45. **A mesma seção aparece nas quatro portas do caso:** "Registrar assinatura", "Anexar os assinados", "Abrir o caso" e Novo caso. Sem a área Jurídico (Bianca), a lista entra inteira, sem conferir, e a responsável confere em Documentos do caso. A captura é só a de "Abrir o caso"; as outras portas recebem a mesma seção.
46. **Próximo passo:** com o caso aberto e documento faltando, o âmbar da ficha do cliente vira **"Juntar os documentos"**. Ele mostra a trilha em "Caso", "3 de 6", uma barra de 6 partes, a lista do que falta, "Anexar o que chegou" e "Pedir de novo". Embaixo, diz quando o lembrete automático volta a pedir. Na ficha do caso, o âmbar da etapa continua e ganha "Antes de seguir: juntar os documentos, 3 de 6", com "Ver o que falta". "Mudar etapa" fica como secundário e **não é bloqueado** (pergunta 8).
47. **Na ficha do caso, a folha "Documentos para começar" fica em primeiro** enquanto falta algo. Ela mostra "Faltam", com "Já chegou" e "Pedir de novo", e "Já temos", com o que chegou e o que veio da ficha (selo "Da ficha"). Com tudo junto, ela volta ao lugar de "Documentos" aprovado.
48. **Quando o último chega**, o âmbar volta a "Caso em andamento", a responsável recebe o aviso no sino e a automação "Documento pendente" para de lembrar.

## Acessibilidade (WCAG 2.2 AA)

- **Conferência automática** em 80 capturas (40 estados × computador 1440 e celular 390), pelo `fotos.cjs`. O resultado está em `_conferencia.json`:
  - o axe (WCAG 2.0, 2.1 e 2.2, A e AA) não achou nenhuma violação (conferi antes que o axe acusa erros numa página de teste);
  - nenhuma tela tem rolagem lateral e não houve erro de script;
  - todos os alvos têm 44 px ou mais, com as exceções já aprovadas: a palavra-marca "T3jus" no trilho (24 px), os nomes na lista de Conversas (o cartão inteiro é o alvo, como no aprovado) e os botões compactos das tabelas no computador (36 px).
- **Os 4 passos do fechamento** são uma lista `ol` com rótulo. Cada passo diz em texto se está feito, se é o próximo ou se vem depois; a cor não é o único sinal (✓ e número).
- **As escolhas do caso** ficam num `fieldset` com `legend`; "Encerrar também os contratos ligados" é um `checkbox` com rótulo e ajuda. A falha usa `role="alert"`, e o que acontece depois de confirmar está escrito antes do botão.
- **Botões de linha** dizem de quem são ("Abrir o caso: contrato C-2026-022, Hélio Batista Corrêa").
- **Documentos:** a contagem "3 de 6" está em texto; a barra de 6 partes é só enfeite (`aria-hidden`). Cada botão de linha diz de qual documento é ("Anexar um novo: comprovante de residência"). Na janela, as fotos são uma lista ordenada com rótulo, "Tirar" diz qual foto, e os erros ficam ligados ao campo por `aria-describedby`. "Já temos" é texto, não só o ✓.
- **Contraste:** só pares do Gabinete. Sobre o âmbar vão tinta e `#4F1D35`; o passo feito é branco sobre vinho; o disco de contagem do filtro é tinta sobre `#E9AE90`.

## O que muda no servidor

As tabelas têm `escritorio_id` e passam por `proteger_tabela_escritorio`. O escritório vem da sessão, nunca do navegador. Nada se apaga.

1. **Anexar os assinados** (`JanelaAssinados`): quando o anexo ativa o contrato, a chamada a `POST /v1/escritorio/contratos/:id/assinatura` passa o mesmo `caso` da janela da assinatura (`NOVO`, `JUNTAR` ou `SEM`). A janela carrega `GET /v1/escritorio/contratos/:id/caso`, como a `JanelaAssinaturaCaso`. Hoje ela manda só `versao` e `assinadoEm`.
2. **Assinados sem caso:** filtro `?situacao=sem_caso` na lista de Contratos (ativos, `not sem_caso`, sem `caso_clientes.contrato_id`) e a contagem no resumo da lista; a mesma consulta alimenta o aviso de Casos e processos (só para quem tem Jurídico). `POST /v1/escritorio/contratos/:id/caso` passa a aceitar `{ modo: "SEM" }`, que grava `contratos.sem_caso = true`.
3. **Juntar (CH-12):** `OpcoesCasoContrato` ganha `casosDoCliente` (casos em andamento do cliente em que ele não tem contrato) e `sugestao.modo` (`JUNTAR` quando há um, `NOVO` quando não há). `JUNTAR` com um caso em que o cliente já está **atualiza** o `contrato_id` da linha de `caso_clientes` em vez de criar outra.
4. **Passo do fechamento (EX-16):** `cliente_passo` (0740) ganha os tipos `FECHAMENTO`, `CONTRATO_ATIVO` e `ATENDIDO` (decisão 20). Para `FECHAMENTO`, o item traz a lista dos passos com `feito`, a data, a pessoa, o valor que falta e a área de cada um, a partir de `exitos_conferir`, `caso_acerto` (0512/0640), `fechamentos_caso` e a situação dos contratos ligados. Hoje, caso encerrado e contrato `sem_caso` caem em `SEM_PROPOSTA`.
5. **Encerrar em cadeia (EX-17):** `POST /v1/escritorio/financeiro/casos/:id/encerrar` passa a receber `{ contratos: [ids] }`. Numa transação só: grava `fechamentos_caso` e encerra cada contrato com o motivo fixo (a mesma regra de `contratos/:id/encerrar`). Só aceita contratos ligados ao caso e sem outro caso em andamento; precisa de `contratos.editar` para os contratos. O `caso_acerto` ganha `contratosLigados` para a janela.
6. **Ver o acerto:** a ficha do caso (Jurídico) traz o resumo do acerto e o id do levantamento, para o link à ficha do repasse; valores só para quem tem Financeiro.
7. **Cadastro pela conversa (AP-07):** `/clientes/novo?conversa=<id>` preenche o nome (`conversas.nome_contato`) e o telefone; o `POST` do cliente aceita `conversaId` e liga a conversa (`conversas.cliente_id`) na mesma transação; a tela volta para `/conversas?c=<id>`.
8. **Primeira reunião pela conversa:** `compromissos` ganha `conversa_id` (opcional). O lembrete ao cliente passa a aceitar compromisso sem `cliente_id` quando há `conversa_id`, e vai para o telefone da conversa. Ao cadastrar o cliente pela conversa, os compromissos dela ganham o `cliente_id`. Depende da pergunta 4.
9. **Histórico do escritório:** os eventos de assinatura por anexo, de "não tem caso" desfeito, de encerramento em cadeia, de cadastro pela conversa, de documento pessoal anexado e de mudança na lista por área entram como os que já existem.
10. **Documentos pessoais (AP-08):** tabela nova `cliente_documentos`, passando por `proteger_tabela_escritorio`. Ela tem:
    - `escritorio_id`, `cliente_id`, `descricao`, `data_documento`, o arquivo, `enviado_por` e `criado_em`;
    - `tipo`, que pode ser `RG_CPF`, `CNH`, `COMPROVANTE_RESIDENCIA`, `CERTIDAO_CASAMENTO`, `CERTIDAO_NASCIMENTO`, `CERTIDAO_OBITO` ou `OUTRO`;
    - `substituido_por`: nada se apaga, e anexar um novo aponta o anterior.

    As rotas são `GET/POST /v1/escritorio/clientes/:id/documentos`, com a mesma permissão de ver e editar o cliente. O envio aceita até 10 fotos e junta com `pdf_fotos` (`packages/domain`), como em Procurações. O prazo do comprovante vem de `escritorios` (campo novo, padrão 90).
11. **Lista por área (EX-18):** tabela nova `documentos_inicio` (`escritorio_id`, `area`, `ordem`, `nome`, `como_pedir`, `pessoal` com o tipo da ficha, `se_houver`). Só a sócia dona edita, como `etapas_escritorio`. A sugestão do T3jus é um conjunto fixo no código, copiado para o escritório quando ele escolhe "Usar a sugestão".
12. **Na abertura do caso:** as quatro portas passam a aceitar `documentos: { pedir: [...], mais: [textos], avisar: boolean }`. São elas `contratos/:id/assinatura`, o anexo dos assinados, `contratos/:id/caso` e `POST casos`. Elas criam os `documento_pedidos` na mesma transação do caso. `documento_pedidos` ganha `tipo_pessoal` (opcional, para o "já temos" e para o anexo da ficha resolver o pedido) e `item_id`. A mensagem a Joana sai pela fila do WhatsApp, como os avisos de etapa; se ela falhar, o caso e os pedidos ficam.
13. **Próximo passo:** `cliente_passo` (0740) ganha o tipo `DOCUMENTOS` (caso em andamento com pedido aberto), antes de `CASO`. O item traz `chegaram`, `total` e a lista do que falta.

## O que o código de hoje contradiz ou não tem

- **`JanelaAssinados` (`Procuracoes.tsx`, ~1340–1420)** registra a assinatura sem perguntar pelo caso: manda só `versao` e `assinadoEm` para `/assinatura`. É exatamente a lacuna da CH-11.
- **`cliente_passo` (0740)** só reconhece caso `ANDAMENTO`; caso encerrado e contrato ativo `sem_caso` caem em `SEM_PROPOSTA` ("Gerar proposta"). É a lacuna de EX-16 e CH-13.
- **O "Encerrar o caso no financeiro" só existe na ficha do repasse** (`FinanceiroRepasses.tsx`, ~1060–1240), que depende de um levantamento (RPV, alvará). **Um caso que não teve dinheiro entrando pelo escritório não tem onde ser encerrado no financeiro**, e "Ver o acerto" não teria para onde ir. Esta é a pergunta 5.
- **`casos.situacao` só tem `ANDAMENTO` e `ENCERRADO`** (0240); "Encerrado · acerto pendente" é calculado (encerrado sem `fechamentos_caso`). O desenho segue isso.
- **`compromissos` não tem onde guardar um contato que não é cliente** (0180: só `cliente_id`, e o lembrete exige `cliente_id`). "Marcar primeira reunião já com esse contato" precisa do campo novo (pergunta 4).
- **Em Conversas (`Conversas.tsx`, ~554–558)**, "Cadastrar como cliente" vai para `/clientes/novo` sem nada preenchido e "Marcar primeira reunião" vai para a Agenda sem o contato. O desenho aprovado de Conversas já dizia que o cadastro abre preenchido; o código não chegou lá.
- **A janela curta "Abrir o caso" (`CasoDaAssinatura.tsx`) não tem "não tem caso"** (`semOpcaoSem`). A decisão 8 pede essa escolha quando a janela é aberta das listas de assinados sem caso.
- **O botão do passo ainda aparece duas vezes** na ficha (âmbar e Histórico, `FichaCliente.tsx` ~563–580, prop `acoes`), como foi aprovado antes; a mudança 8 tira o do Histórico.

- **Não há onde guardar documento do cliente fora de um caso.** `documentos_caso` (0270) exige `caso_id`, e a categoria `DOCUMENTO_CLIENTE` é por caso: o RG de Antônia anexado em dois casos fica duas vezes. As categorias de `anexos` (0520/0620/0680) também não têm documento pessoal. Falta a tabela da AP-08.
- **`documento_pedidos` (0270) também exige `caso_id`** e guarda só `descricao` em texto livre (3 a 160 letras), sem tipo e sem ligação com uma lista. Por isso hoje não dá para dizer "já temos", nem pedir documento a quem ainda não tem caso (como Rafaela). No desenho, o "Pedir pelo WhatsApp" da ficha sem caso só abre a conversa com o texto, sem registrar pedido (pergunta 9).
- **Não existe lista por área.** O único jeito de pedir é "Pedir documento" (`JuridicoDocumentos.tsx`, janela `j-pedir`, ~185), um a um, na ficha do caso.
- **Abrir o caso não cria pedido nenhum**, por nenhuma das quatro portas (assinatura, anexo dos assinados, `contratos/:id/caso` e Novo caso).
- **Não existe data do documento nem prazo de validade** em lugar nenhum. O "mais de 90 dias" precisa da data do papel (`data_documento`).
- **Juntar fotos num PDF existe, mas só em Procurações.** `pdf_fotos.ts` (`packages/domain`, `MAX_FOTOS_ASSINADO = 10`) e `portal/fotos.ts` já fazem o F3.99, e dá para reaproveitar. Já o envio de `JuridicoDocumentos.tsx` (~306) aceita um arquivo só, sem foto da câmera.
- **O que já serve:** a automação `DOCUMENTO_PENDENTE` (0570) já lembra o cliente pelo WhatsApp de tudo o que falta. Ela junta os pedidos de cada cliente, para quando tudo chega e tem os dias configuráveis (1 a 30). Os pedidos criados na abertura entram nela sem mudança. Ela só olha pedidos de caso em andamento, o que combina com o desenho.

## Para o painel

- O desenho atende AP-07, AP-08, CH-11, CH-12, CH-13, EX-16, EX-17 e EX-18. A pergunta 5 pode deixar uma parte da EX-16/EX-17 pendente (caso sem levantamento); se for assim, a entrega precisa de um item "pendente" citando as duas.

## Perguntas para a Carol

1. **Depois de "Anexar os assinados", a pessoa continua na página do contrato, com "Ver o caso" no aviso, em vez de ir direto para a ficha do caso?** **Recomendo que sim.** Quem anexa costuma estar anexando também a procuração e a declaração; levar para o Jurídico no meio disso tira a pessoa do lugar. O caso abre do mesmo jeito, e o link fica no aviso e no âmbar do contrato. Na "Registrar assinatura" da ficha do cliente, a ida ao caso continua como aprovada.
2. **O aviso dos contratos assinados sem caso fica no alto de Jurídico › Casos e processos (e não no Início)?** **Recomendo que sim.** É onde quem abre caso trabalha, e o aviso some sozinho quando a lista zera. O Início já tem muitos quadros; se a Carol quiser, ele entra lá depois como contador.
3. **O cliente com tudo encerrado continua "Ativo", e só o próximo passo diz "Cliente atendido"?** **Recomendo que sim, sem situação nova.** A situação é sobre a relação e a LGPD; o passo já mostra o momento, aparece na lista de Clientes e muda sozinho quando chega proposta ou caso novo. Uma situação "Atendido" pediria regras para entrar e sair dela e mexeria em filtros e relatórios.
4. **"Marcar primeira reunião" na conversa marca o compromisso com o contato, antes do cadastro?** **Recomendo que sim**, com o campo novo `conversa_id` no compromisso e o lembrete indo para o número da conversa. A primeira reunião costuma vir antes de a pessoa decidir ser cliente; exigir o cadastro antes atrasaria a marcação. Quando ela for cadastrada, o compromisso passa para a ficha.
5. **Caso que terminou sem dinheiro entrando pelo escritório (sem RPV nem alvará) se encerra no financeiro onde?** Hoje o fechamento só existe na ficha do repasse. **Recomendo uma folha "Fechamento do caso" na ficha do contrato** (Financeiro › A receber › contrato), com o mesmo quadro e a mesma janela, para os casos sem levantamento. "Ver o acerto" leva para lá. Fica fora deste desenho até a resposta; se for sim, desenho a variação.
6. **"Encerrar também os contratos ligados" vem marcado?** **Recomendo que sim.** Depois de tudo recebido e repassado, o contrato de êxito não tem mais o que cobrar, e o motivo fica escrito. Quem quiser manter o contrato (por exemplo, porque vai virar outro caso) desmarca, e o passo 4 do fechamento lembra que ele ficou aberto.
7. **O comprovante de residência vale 90 dias, contados da data do papel, e o escritório pode mudar o prazo?** **Recomendo que sim.** 90 dias é o que INSS, cartórios e a maioria dos juízos aceitam; alguns pedem 60 ou 180. Um campo só, em Ajustes do escritório, resolve. Só o comprovante tem prazo; RG e certidões não vencem.
8. **Com documento faltando, "Mudar etapa" continua livre?** **Recomendo que sim, sem trava.** Às vezes o processo precisa sair antes (prazo, liminar) e o documento vem depois. O âmbar já mostra "Antes de seguir: juntar os documentos, 3 de 6", e o lembrete continua. Uma trava faria a equipe marcar "Já chegou" sem ter chegado.
9. **Dá para pedir documento a quem ainda não tem caso (antes da proposta, na ficha)?** **Recomendo que não se registre pedido agora:** "Pedir pelo WhatsApp" só abre a conversa com o texto pronto, para conferir e enviar. O pedido registrado, com lembrete e "3 de 6", começa quando o caso abre. Assim `documento_pedidos` continua sempre ligado a um caso, e a automação não lembra alguém que ainda nem decidiu ser cliente.
10. **Quem vê os documentos pessoais?** **Recomendo: quem vê a ficha do cliente**, como os dados e a qualificação (o CPF já está lá). Não vale criar uma permissão nova só para isso. O que é sensível de saúde (laudos) fica no caso, que já segue a permissão do Jurídico.
11. **E quando o cliente é réu ou interessado?** A lista é por área e pensa em quem entra com o processo. **Recomendo deixar uma lista só por área**, e quem abre desmarca o que não serve, como no "Se houver". Se a Carol vir que o escritório defende muito (no trabalhista, do lado da empresa, por exemplo), uma segunda lista "quando o cliente é réu" entra depois.
