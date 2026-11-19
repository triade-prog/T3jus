# Portal: pendências de Clientes · notas

As duas pendências que ficaram da entrega de Clientes (F1.13), desenhadas para a Carol aprovar antes de virar código. A Carol respondeu às 5 perguntas em 18/11/2026; o desenho já segue as respostas (veja "Decisões da Carol", no fim).

- **F1.14 · Início com os contatos do dia** (AP-06): o próximo contato vencido e o de hoje aparecem no Início de quem é o responsável;
- **F1.15 · Pedido de exclusão do titular** (PT-11, LGPD): a sócia dona anonimiza os dados pessoais do cliente e guarda só o que a lei obriga e o registro de que a exclusão foi feita.

Pesam também PT-02 (cada pessoa vê o mínimo), PT-03 (nada é apagado em silêncio) e PT-10 (WCAG 2.2 AA, celular e estados vazio, erro e carregando).

A base é o desenho aprovado de Clientes (`docs/design/aprovadas/portal-clientes`) e o Portal v1. O hero e a lista do Início são peças do Início aprovado (`portal-inicio.html`: hero, `.dia`, `.prazo`, `.data`, `.resp`, `.ver`). A janela "Registrar atendimento", a ficha, a lista e os avisos são os aprovados, sem mudança. As peças novas têm o prefixo `pd-`. **A marca é a de hoje** (logo oficial do PR #11): o `LogoCompacto` no tom "sobre-vinho", com o desenho lido de `sistema/packages/ui/src/logo-desenho.ts`, no trilho e na barra do celular.

## Como abrir

- `index.html` mostra os 28 estados em computador (1440) e celular (412), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- `pendencias.html` abre sozinho, com as fontes, o CSS e os ícones embutidos. O estado vem do endereço, por exemplo `pendencias.html?estado=inicio`, `?estado=inicio-dona-equipe` ou `?estado=excluir`. No celular, `&mais=1` abre a folha Mais.
- "Ver todos" e "Abrir Clientes" levam ao desenho aprovado de Clientes, em `../portal-clientes/clientes.html`.
- Abaixo de 760 px, o HTML vira a versão de celular, com a barra de baixo aprovada (Início, Conversas, Agenda, Mais). As capturas de celular mostram a página inteira; com janela aberta, só a tela.
- A pasta `_fonte/` guarda os scripts, e `sh _fonte/gerar.sh` refaz tudo:
  - `comum.py` e `clientes.py` são as cópias sem mudança do desenho aprovado. O `pendencias.py` lê as peças do `clientes.py` em vez de copiá-las;
  - `pendencias.py` gera o HTML;
  - `casos_pd.py` gera a lista de estados e o `index.html`;
  - `fotos_pd.cjs` é o `fotos.cjs` aprovado, lendo a lista nova: capturas com deviceScaleFactor 2, axe (WCAG 2.0, 2.1 e 2.2, A e AA), rolagem lateral, alvos menores que 44 px e erros de script;
  - `webp.py` converte as capturas para WebP.
- **Conferência** (`_conferencia.json`): 56 capturas, 0 violação do axe, 0 rolagem lateral, 0 alvo pequeno, 0 erro de script.
- Todos os dados são fictícios. Os CPFs e o CNPJ vêm do gerador aprovado, com dígitos válidos, e os e-mails usam `exemplo.com.br`.

## Decisões de design

### Início: contatos de hoje

1. **Primeira versão do Início, pronta para ganhar vizinhos.** O Início de hoje é a página "em preparação". Esta versão usa o hero do Início aprovado ("Bom dia, Diego.", a data e os atalhos) e a grade de duas colunas. O bloco **Contatos de hoje** fica na coluna da esquerda.
   - No estado `inicio-encaixe`, uma anotação de desenho (que não vai para o produto) mostra onde entram os blocos do Início aprovado: Prazos da semana acima dos Contatos, Recebimentos abaixo, e Esperando alguém e Agenda de hoje na direita. Os nomes são os do desenho aprovado; nenhum conteúdo foi inventado.
   - Cada bloco entra quando a área dele tiver dados e só para quem tem a área. **Nenhum bloco aparece vazio ou bloqueado.**
   - Enquanto a coluna da direita não tem blocos, ela mostra uma explicação curta de como os contatos chegam ao Início. A explicação sai quando o primeiro vizinho chegar.
   - As contagens do hero (`.dia`) seguem a mesma regra: hoje só "contatos vencidos" e "contatos hoje"; prazos, compromissos e conversas entram com os blocos deles.
2. **O que o bloco mostra:** só os próximos contatos em que a pessoa logada é a responsável (o responsável vem do atendimento, `prox_responsavel`).
   - Dois grupos com rótulo: **Vencidos**, do mais antigo para o mais novo, e depois **Para hoje**.
   - Cada item: o disco com o dia (vinho-3 no vencido, âmbar no de hoje), o nome do cliente (link para a ficha), o que fazer, com quem falar (o contato principal, com o papel e o telefone) e o selo. O vencido tem o selo de urgência com os dias ("vencido há 8 dias", "vencido ontem") e o de hoje tem o selo de atenção "Hoje", como na lista aprovada. **Nada depende só de cor**: há grupo com rótulo, selo com texto e ícone.
   - A ação é **"Registrar atendimento"**, que abre a janela aprovada da ficha, já com o cliente e com a pessoa logada como quem atendeu. O botão tem nome acessível com o cliente ("Registrar atendimento de Antônia Ferreira Prado").
   - Ao registrar, o item sai do bloco e o aviso diz qual é o próximo contato e com quem (`inicio-registrado`).
3. **Limite de 5 itens**, os mais atrasados primeiro, para o bloco não empurrar os vizinhos para baixo. O pé diz quantos faltam e de que tipo ("Os outros 4: 3 vencidos e 1 de hoje") e leva a Clientes com o filtro Contato vencido. "Ver todos", no cabeçalho do bloco, leva ao mesmo lugar. O filtro aprovado mostra os vencidos de toda a equipe, ordenados; os de hoje que passarem do limite ficam só no Início, o que é raro, porque os vencidos vêm antes.
4. **A sócia dona vê os dela por padrão** e tem o botão "Da equipe" ao lado (`inicio-dona` e `inicio-dona-equipe`). Em "Da equipe", cada item mostra o responsável com a inicial. Quando nada dela está vencido mas a equipe tem atrasos, uma linha avisa quantos e com quem. Decisão 1.
   - Quando há pedido de exclusão esperando por ela, um aviso curto entre o hero e os blocos diz "1 pedido de exclusão esperando você", com a cliente e quem pediu, e leva à ficha (`inicio-dona-pedido`). Decisão 2.
5. **Estados:**
   - **vazio:** "Tudo em dia com os seus clientes.", com o próximo contato marcado ("sexta, 20/11, Benedito Souza Lima");
   - **carregando:** a saudação vem da sessão e aparece logo; as contagens e o bloco têm esqueleto, `aria-busy` e aviso para leitor de tela;
   - **erro:** fica dentro do bloco, para o resto do Início continuar funcionando. Ele oferece Tentar de novo, o caminho alternativo (Clientes) e o código para o suporte.
6. **Quem não tem a área Comercial** (Larissa, só Jurídico) não vê o bloco, nem bloqueado, nem as contagens de contatos (PT-02). O Início dela tem a saudação, os atalhos (Novo cliente e Abrir Clientes, que são parte comum) e uma linha que diz o que vai chegar com as áreas dela. Isso substitui o "em preparação" de hoje para todos que ainda não têm bloco.
7. **Celular:** a barra de baixo aprovada, com Início marcado. Cada item vira duas colunas (disco e texto); o selo e o botão vão para baixo, com o botão na largura toda e 44 px de altura.

### Pedido de exclusão do titular (LGPD)

8. **Onde fica a ação:** na folha Situação da ficha, abaixo de Inativar e separada por um fio: "Pedido de exclusão dos dados (LGPD)", uma linha que explica quando usar e o botão discreto (fantasma) "Atender pedido de exclusão". **Só a sócia dona vê.**
9. **Quem não é a dona não vê o botão de excluir, mas pede a exclusão à dona** (decisão 2):
   - **A linha** (`excluir-ficha-equipe`): no mesmo lugar, "A cliente pediu para apagar os dados? Quem atende o pedido (LGPD) é Marina Ribeiro, a sócia dona. Registre o pedido aqui: ela recebe no Início e decide.", com o botão discreto "Pedir a exclusão à sócia dona".
   - **A janela pequena** (`excluir-pedir`): data do pedido, como chegou (e-mail, WhatsApp, presencial, telefone ou carta) e uma observação opcional que avisa para não escrever dado pessoal. Uma linha diz que nada é apagado agora e que o prazo da LGPD conta da data do pedido. O botão é "Enviar o pedido".
   - **A faixa** (`excluir-pedido`): ao enviar, o pedido fica registrado e a ficha mostra, para todos, logo abaixo do cabeçalho, "Exclusão pedida em 18/11 por Diego Almeida, aguardando a sócia dona.", com o canal e a observação. Não há botão de repetir: a Situação passa a dizer "Pedido de exclusão enviado... Não precisa pedir de novo.". O aviso de sucesso diz que Marina vê o pedido no Início.
   - **A visão da dona** (`excluir-pedido-dona`): a mesma faixa, com "Excluir os dados" e "Recusar o pedido". O botão "Atender pedido de exclusão" da Situação dá lugar a uma linha que aponta para a faixa, para não haver dois caminhos.
   - **Excluir a partir do pedido** (`excluir-do-pedido`): abre a janela de exclusão do item 10, já com a data e o canal do pedido e uma linha "Pedido registrado por Diego Almeida em 18/11". O resto não muda: conferir quem pediu e escrever o nome.
   - **Recusar** (`excluir-recusar`): `alertdialog` com o motivo obrigatório (sem dado pessoal) e a lembrança de avisar a cliente pelo canal do pedido. Nada é apagado.
   - **Depois da recusa** (`excluir-recusado`): a faixa vira informativa, para todos, com quem recusou, quando e o motivo. A linha "Pedir a exclusão à sócia dona" volta, para um pedido novo.
10. **A janela de confirmação** é um `alertdialog` largo, em duas colunas no computador e numa coluna no celular. O rodapé fica preso embaixo, para o botão de perigo estar sempre à vista.
    - **À esquerda, o que acontece, com o porquê:**
      - **O que é apagado:** nome, CPF, RG e a qualificação; os contatos, com telefones e e-mails; quem indicou; com quem se falou em cada atendimento; o próximo contato, que sai também do Início do responsável.
      - **O que fica:** o registro da exclusão (quem fez, quando, como o pedido chegou e o protocolo), que prova que o pedido foi atendido; a data, o canal, quem atendeu e o resumo de cada atendimento, sem com quem se falou (decisão 3); a origem como categoria, sem quem indicou.
      - **Perto do resumo que fica**, uma dica curta: "O resumo fica como foi escrito. Resumo de atendimento não deve ter dado pessoal desnecessário, como CPF, endereço ou saúde."
      - **Hoje:** uma faixa diz que nada precisa ser guardado por lei, porque ainda não há contrato nem processo no T3jus (e que, se houvesse, o pedido seria atendido arquivando), e que documentos fora do T3jus ficam com o escritório, que é o controlador.
    - **À direita, o pedido:**
      - data do pedido;
      - como chegou (e-mail, WhatsApp, presencial, telefone ou carta);
      - quem pediu: a própria cliente ou alguém em nome dela, com documento;
      - uma caixa obrigatória "Conferi que o pedido veio da cliente ou de quem fala por ela";
      - uma observação opcional que avisa para não escrever dado pessoal.
    - **A confirmação:** "Não dá para desfazer. Nem a equipe do escritório nem o suporte T3jus conseguem recuperar os dados depois." Mostra o nome exato e pede para escrevê-lo, com "O nome confere" quando bate.
    - **O botão:** de perigo, cheio, "Excluir os dados para sempre". Os padrões aprovados continuam: erro preso ao campo, resumo no topo e botão nunca desabilitado.
11. **Falha:** a exclusão é uma transação só. Se o servidor falha, o aviso diz que **nada foi apagado** e que os dados estão como antes, com o código para o suporte. O que foi preenchido continua na janela.
12. **Depois da exclusão:**
    - **A ficha** vira "Cliente excluído", em itálico, com o selo "Excluído (LGPD)", "a pedido do titular em 18/11/2026" e, no âmbar, a data, o protocolo (`EXC-2026-0007`) e quem fez. Cada campo diz "Excluído". Ao lado, a folha **Registro da exclusão**, com "Copiar o protocolo" para informar o cliente. Não dá para editar, reativar nem registrar atendimento: se a pessoa voltar, é cadastro novo.
    - **Os atendimentos** (`excluido-atendimentos`) mantêm a data, o canal, quem atendeu e o resumo como foi escrito, com a linha "Com quem se falou e o próximo contato excluídos a pedido do titular (LGPD)". Decisão 3. Atenção: os resumos de exemplo citam "Joana" e "Rosa Almeida"; é exatamente o caso que a dica da janela quer evitar daqui para a frente, porque atendimento não se edita.
    - **Na lista**, o cliente sai de Ativos e de Contato vencido e aparece em **Inativos** como "Cliente excluído", com a data e o protocolo e sem nenhum dado pessoal. Sem isso, um cliente sumiria da lista sem rastro, o que vai contra PT-03. Decisão 4.
    - O aviso de sucesso não repete o nome da cliente.
13. **Com contrato ou processo, não exclui: arquiva** (`excluir-depois`, decisão 5). É desenho do futuro: hoje não há contratos nem processos, e a janela diz isso numa marca tracejada.
    - A ação da dona vira **"Arquivar a pedido (LGPD)"**, na Situação e na faixa do pedido.
    - **O que acontece:** nada é apagado; o cliente sai de Ativos, de Contato vencido, da busca e do Início e fica só em Inativos, como "Arquivado a pedido (LGPD)"; a ficha fica só leitura (ninguém edita, reativa nem registra atendimento); o próximo contato é encerrado; o pedido fica registrado com data, canal, quem pediu, quem arquivou e o protocolo.
    - **Por que não exclui:** lista o contrato e o processo e explica que os dados continuam necessários (LGPD, art. 16).
    - O pedido (data, canal, quem pediu e a conferência) é o mesmo da exclusão. Não pede para escrever o nome, porque nada se perde, e o botão é o principal, não o de perigo.

### Para quem for programar (servidor)

- `GET /v1/escritorio/inicio/contatos?de=meus|equipe`: os próximos contatos com `prox_em <= hoje_brasilia()` e `prox_responsavel = pessoa da sessão` (ou de todos, só para a dona), vencidos antes e mais antigos primeiro, com `limite=5` e o total por grupo. O cálculo usa a mesma `prox_contato()` da 0160: o contato do atendimento mais novo, de cliente ativo. Sem Comercial: 403 `AREA_NAO_LIBERADA`, e a tela nem chama.
- **Pedidos de exclusão (decisão 2)**: tabela nova `pedidos_exclusao` com `escritorio_id` e `proteger_tabela_escritorio`: `cliente_id`, `pedido_em`, `canal`, `observacao`, `registrado_por`, `registrado_em`, `situacao` (`ESPERANDO`, `ATENDIDO`, `RECUSADO`, e no futuro `ARQUIVADO`), `motivo_recusa`, `decidido_por`, `decidido_em`. Um índice único parcial garante um só pedido `ESPERANDO` por cliente.
  - `POST /v1/escritorio/clientes/:id/pedidos-exclusao`: qualquer pessoa que abre a ficha. Com outro esperando: 409 `PEDIDO_JA_EXISTE`. Para a sócia dona a tela nem mostra (ela atende direto).
  - `POST /v1/escritorio/pedidos-exclusao/:id/recusar`: só a sócia dona (`SEM_PERMISSAO`); `motivo` obrigatório (`MOTIVO_OBRIGATORIO`).
  - A ficha (`GET` do cliente) passa a trazer o pedido esperando ou a última recusa, para a faixa. O Início da dona traz a contagem de pedidos esperando (no mesmo `GET /inicio` ou em `GET /v1/escritorio/inicio/pedidos-exclusao`), só para a dona.
- `POST /v1/escritorio/clientes/:id/excluir-dados`, só para a sócia dona (`SEM_PERMISSAO` para os outros). O corpo leva `pedido_em`, `canal`, `quem_pediu`, `conferido=true`, `observacao`, `nome_confirmado`, que o servidor confere com o nome atual (`NOME_NAO_CONFERE`), e `pedido_id` opcional, quando vem de um pedido da equipe. Tudo numa transação:
  - nulifica ou troca nome, documento, qualificação, representante, `origem_indicacao` e contatos;
  - nos atendimentos, só `com_quem` e `prox_oque` (o **resumo fica**, decisão 3); o próximo contato do cliente é encerrado;
  - fecha o pedido (`ATENDIDO`), se houver;
  - muda a situação para `EXCLUIDO` (transição nova a partir de ATIVO e de INATIVO, sem volta);
  - grava o registro sem dado pessoal, com o protocolo.
- `atendimentos` tem o gatilho `somente_insercao`. A anonimização precisa de uma função `security definer` própria, a única que pode limpar `com_quem` e `prox_oque`, e que fica no histórico. Como o resumo fica, a ajuda do campo Resumo na janela "Registrar atendimento" (aprovada) pode ganhar a mesma dica de não pôr dado pessoal desnecessário; isso muda texto de tela aprovada e fica para a Carol decidir.
- **Futuro (decisão 5)**: com contrato ou processo, `excluir-dados` responde 409 `TEM_CONTRATO_OU_PROCESSO` e a tela usa `POST /v1/escritorio/clientes/:id/arquivar-lgpd`: situação nova `ARQUIVADO_LGPD` (sem volta pela tela, só leitura, fora da busca e do Início, visível em Inativos), sem apagar nada, com o registro do pedido e o protocolo.
- O inventário de dados (0160) passa a dizer, em `no_fim`, que o pedido do titular anonimiza e guarda o registro.

### Para o painel

- A entrega do Início atende o pendente F1.14 (AP-06). Os blocos vizinhos são de outras entregas.
- A entrega da exclusão atende F1.15 (PT-11) **para o caso de hoje**, sem contrato nem processo, incluindo o pedido pela equipe e a recusa. O arquivamento com contrato ou processo precisa de um item "pendente" que cite PT-11, para quando Contratos e Jurídico existirem.

## Decisões da Carol (18/11/2026)

1. **Início da sócia dona:** "Os dela, com um botão 'Da equipe' ao lado." Já era o desenho; ficou como estava (`inicio-dona` e `inicio-dona-equipe`).
2. **Quem não é a dona:** "Não vê o botão mas vê uma linha para solicitar a exclusão ao dono". Desenhado no item 9: a linha com "Pedir a exclusão à sócia dona" (`excluir-ficha-equipe`), a janela pequena (`excluir-pedir`), a faixa para todos sem botão de repetir (`excluir-pedido`), a visão da dona com Excluir e Recusar (`excluir-pedido-dona`), a exclusão já preenchida (`excluir-do-pedido`), a recusa com motivo obrigatório (`excluir-recusar` e `excluir-recusado`) e o aviso no Início da dona (`inicio-dona-pedido`). O estado `excluir-sem-permissao` saiu; virou `excluir-ficha-equipe`.
3. **Atendimentos de cliente excluído:** "a data, o canal e quem atendeu, com resumo." Fica o resumo; sai só com quem se falou (e o próximo contato). A janela mudou o "O que é apagado" e o "O que fica" e ganhou a dica sobre dado pessoal no resumo; `excluido-atendimentos` mostra os resumos.
4. **Lista:** "Só em Inativos, como 'Cliente excluído', com a data e o protocolo." Já era o desenho; ficou como estava (`excluido-lista`).
5. **Com contrato ou processo:** "Não exclui, só arquiva". `excluir-depois` virou "Arquivar a pedido (LGPD)": nada é apagado, o cliente sai das listas comuns, a ficha fica só leitura e o pedido fica registrado. É desenho do futuro, porque hoje não há contratos nem processos.
