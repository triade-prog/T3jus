# Importação: lembretes de contrato e caso importado · notas

> **Aprovado pela Carol em 23/11/2026.** As 3 perguntas seguem a recomendação: quem tem Contratos dispensa, com motivo e nome no histórico; dispensar se desfaz sem prazo por “Trazer de volta”; o caso que veio encerrado fica em Encerrados com selo próprio, fora das contas de ganho, perda e acordo e do acerto até alguém registrar o resultado. O `publicar.html` (8 MB) não foi copiado.

O que faltava no desenho aprovado da importação do Astrea e do ADVBOX (`docs/design/aprovadas/portal-importacao-sistemas/`, aprovado em 21/11/2026), para a Carol aprovar antes de virar código. São três peças:

1. a lista dos lembretes de contrato, para onde leva o “Ver lembretes” do resultado da importação;
2. dispensar um lembrete à mão, na lista e na folha “Do Astrea” da ficha do cliente;
3. no Jurídico, a linha “Veio da importação” na ficha do caso e o caso que veio encerrado (a opção “Importar como encerrados” dos processos arquivados, já aprovada).

Atende F3.56 (pendente no painel) e VA-05 (a validar). Usa e não muda:

- a importação aprovada do Astrea e do ADVBOX (decisões 7, 18, 20, 23, 26 e 28 de lá: processos como casos, sem contrato; o em aberto vira lembrete; o selo da origem escrito em tudo; o desfazer tira os lembretes);
- o que já está no código: `ImportacaoFinanceiro.tsx` (a folha “Do Astrea” na ficha do cliente, com o lembrete e “Criar o contrato”), a tabela `lembrete_contrato` e o gatilho que a resolve quando um contrato do cliente é criado (migração `0820`);
- a área Contratos aprovada (`portal-comercial-contratos/`): a lista de contratos, “Novo contrato” e a lista `.ct-lembretes` de Honorários;
- o Jurídico aprovado (`portal-juridico/`): a ficha do caso, as 8 etapas, a lista com “Em andamento” e “Encerrados”;
- o tom aprovado em 21/11/2026: sem exclamação, sem código técnico na tela, erro dizendo o que houve, o que continua igual e o que fazer.

A moldura, o CSS e as peças são os aprovados, sem mudança. As peças novas têm o prefixo `il-`.

## Como abrir

- `index.html` mostra os 20 estados em computador (1440) e celular (412), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- `publicar.html` é o mesmo `index.html` com as capturas embutidas (8,0 MB), para publicar como uma página só.
- Três HTML, um por conjunto de estados. Cada um abre sozinho, com as fontes, o CSS e os ícones embutidos. O estado vem do endereço:
  - `lembretes.html?estado=` `lista`, `entrada`, `viraram`, `dispensados`, `busca-vazia`, `vazio`, `carregando`, `erro`;
  - `dispensar.html?estado=` `dispensar`, `dispensar-erro`, `dispensar-conflito`, `dispensado`, `dispensados-hoje`, `ficha`, `ficha-dispensar`, `ficha-dispensado`;
  - `caso-importado.html?estado=` `caso-importado`, `caso-advbox`, `encerrados`, `encerrado-importado`.
- Abaixo de 760 px, o HTML vira a versão de celular. Funcionam os botões que abrem e fecham janelas, o Esc e o Mais. O resto é desenho.
- As capturas de celular mostram a página inteira, com a barra de baixo no fim. Com janela aberta, a captura mostra só a tela.
- A pasta `_fonte/` guarda os scripts, e `sh _fonte/gerar.sh <pasta>` refaz tudo (precisa do `@axe-core/playwright` na pasta de `AXE_DIR`, do `playwright` achável pelo node, por exemplo com `NODE_PATH`, e do repositório: `T3JUS_APROV` aponta para `docs/design/aprovadas/`):
  - `sistemas.py`, `importacao.py`, `clientes.py`, `contratos.py`, `pecas.py`, `fotos.cjs`, `webp.py` e `publicar.py` são cópias da importação aprovada; `juridico.py` é a cópia do Jurídico aprovado. A única mudança é no `comum.py`: o caminho das telas aprovadas vem da variável `T3JUS_APROV`;
  - `sobras.py` gera os três HTML. Ele carrega as definições do `sistemas.py` e do `juridico.py` (sem gerar o HTML deles) e acrescenta as peças `il-`;
  - `casos.py` é o `casos.py` aprovado com os estados e textos desta rodada.
- Todos os dados são fictícios e seguem a importação aprovada: backup do Astrea de 21/11/2026, às 16h52, por Marina Ribeiro (sócia dona), com 87 lembretes e R$ 48.900,00 em aberto. Hoje é 23/11: 4 lembretes viraram contrato (R$ 2.400,00), 2 foram dispensados (R$ 1.250,00) e sobram 81 abertos (R$ 45.250,00). Márcio Tavares (linha C7, caso Tavares x Metalúrgica Andrade, linha P14) é o mesmo da prévia aprovada. Números de processo com dígitos válidos (CNJ, módulo 97). O elenco é o de sempre (Ribeiro & Matos; Marina Ribeiro, sócia dona; Felipe Matos; Larissa Costa). Astrea e ADVBOX aparecem só como nome, em texto.

## Decisões de design

### A lista dos lembretes

1. **Mora em Contratos › Contratos, numa página própria: “Lembretes de contrato”.** A única ação que resolve um lembrete é criar o contrato, e quem cria contrato está em Contratos. Em Clientes, a lista misturaria cadastro com dinheiro e apareceria para quem não pode criar contrato. Em Honorários, que já tem a lista `.ct-lembretes`, a página fala de contratos que já existem (base do mês, etapa do caso); 81 linhas de sistema antigo engoliriam a base do mês, que é o que mais pesa no dia a dia. A página usa as mesmas peças de Honorários (cabeçalho, números, lateral com campo âmbar).
2. **Três portas:** o “Ver lembretes” do resultado da importação (que hoje leva à lista de contratos) passa a abrir esta página; a lista de contratos aprovada ganha uma faixa de atenção “81 clientes têm valor em aberto no Astrea e ainda não têm contrato”, com “Ver os lembretes”, que some quando não sobra nenhum (estado `entrada`); e a folha “Do Astrea” da ficha do cliente leva a Dispensados. Não ganha item no menu: a página existe só enquanto houver lembretes, e a faixa basta.
3. **Os três números no alto são os filtros** (Abertos, Viraram contrato, Dispensados), como os números da prévia aprovada (`aria-current`). “Abertos” traz a soma em reais. Sem chips repetindo os números.
4. **Filtros mínimos:** busca por cliente ou caso e a ordem (maior valor primeiro, que é o padrão; lançamento mais antigo; nome). Não há filtro por importação: com uma importação só, a lateral “De onde vieram” já diz qual é. Se o escritório importar duas vezes, entra um seletor “Importação” do lado da ordem.
5. **Cada linha:** o cliente (link para a ficha), o caso e o responsável dele, ou “Sem caso ligado”; o valor em aberto no Astrea em serifa, com a quantidade de lançamentos e a data do mais antigo; e as duas ações, “Criar o contrato” (principal) e “Dispensar” (secundário). Quando o cliente já tem contrato ativo (Construtora Vale Alto), a linha avisa, porque o gatilho só resolve o lembrete quando um contrato **novo** é criado.
6. **“Criar o contrato” abre o contrato novo aprovado com o cliente escolhido** (e o caso, quando o lembrete tem caso). O valor do Astrea **não** entra no contrato: as condições são as que a pessoa escreve. Criado o contrato, o lembrete sai da lista e da ficha sozinho e vai para “Viraram contrato”, com o número, quem criou e quando.
7. **Vazio, carregando e erro.** Vazio: “Nenhum lembrete aberto”, com os números levando aos outros dois grupos. Carregando: esqueleto das linhas e dos números, com a busca em `aria-busy`. Erro: “A conexão com o T3jus caiu no meio. Nada mudou… Tente de novo; se continuar, avise o suporte pela Ajuda.” Busca sem resultado: diz o que procurou, que a busca olha só os abertos, e oferece limpar.
8. **Quem vê:** quem tem a área Contratos (a página é da área). Na ficha do cliente, a folha “Do Astrea” segue o código: quem tem Financeiro ou Contratos vê; “Criar o contrato” só aparece para quem tem Contratos.
9. **Celular:** os números ficam um embaixo do outro, com a barra do atual à esquerda; a tabela vira cartões, como no aprovado; as duas ações ficam lado a lado, largura cheia.

### Dispensar

10. **Onde:** em cada linha da lista e na folha “Do Astrea” da ficha do cliente, ao lado de “Criar o contrato”, como botão fantasma (é a ação menos comum).
11. **Janela de confirmação** (`<dialog>` com `showModal()` e `role="alertdialog"`): o lembrete (cliente, caso, lançamentos, valor), o motivo obrigatório e o que acontece. O título é uma pergunta (“Dispensar o lembrete de Osvaldo?”) e a frase de abertura diz quando usar: “quando o escritório não vai cobrar este valor pelo T3jus. Para cobrar, crie o contrato.”
12. **Motivo obrigatório, curto, em quatro opções:** “Já negociado ou recebido fora do T3jus”, “O escritório perdoou o valor”, “Já está em outro contrato”, “Outro motivo”. O detalhe tem até 140 caracteres; é opcional, menos em “Outro motivo”, quando passa a ser obrigatório. As opções deixam o histórico comparável e servem a um relatório depois.
13. **O que acontece, escrito na janela:** sai da lista e da ficha; fica em Dispensados e no histórico do cliente, com o motivo, quem e quando; **o histórico do Astrea não muda** (os lançamentos continuam na ficha como estavam, “em aberto lá”, e nada entra no Caixa nem em A receber); dá para trazer de volta.
14. **O botão é “Dispensar o lembrete”, no estilo principal, não no de perigo:** nada se perde e tudo volta com um clique. O perigo fica para o que não volta (como o desfazer da importação).
15. **Erros no tom aprovado.** Motivo faltando: no topo e preso ao campo, com o foco nele, dizendo que o lembrete continua aberto (estado `dispensar-erro`). Alguém criou o contrato enquanto a janela estava aberta: “Este lembrete já saiu da lista… Nada foi dispensado” e um só botão, “Ver a lista atualizada” (estado `dispensar-conflito`).
16. **Depois de dispensar:** um aviso com “Desfazer”, e o número de abertos e a soma mudam na hora (estado `dispensado`). Em Dispensados, o motivo, o detalhe em itálico, quem e quando, e “Trazer de volta” (estado `dispensados-hoje`).
17. **Na ficha, o lembrete sai** e fica uma linha discreta: “Lembrete de R$ 3.750,00 dispensado hoje por Marina Ribeiro: ‘Já negociado…’. Ver em Dispensados.” Sem ela, os lançamentos “em aberto lá” ficariam sem explicação. Ela não é aviso nem pede ação (estado `ficha-dispensado`).
18. **Desfazer: recomendo “Trazer de volta”, sem prazo** (pergunta 2), para quem tem a área Contratos. O lembrete volta à lista e à ficha como estava; o histórico do cliente guarda quem dispensou e quem trouxe de volta. Se um contrato do cliente tiver sido criado nesse meio-tempo, o lembrete volta já resolvido, em “Viraram contrato”.
19. **O desfazer da importação continua como aprovado:** tira os lembretes abertos e também os dispensados; o que virou contrato fica.

### O caso que veio de outro sistema

20. **A linha “Veio da importação” fica logo abaixo do cabeçalho da ficha**, numa folha de uma linha, em toda a largura. Mostra o selo da origem (“Astrea · backup”, “ADVBOX · planilha”), a data e a hora da importação, quem importou, a etapa no sistema antigo e a do escritório ligada a ela (“‘Audiência marcada’, ligada a 4. Instrução”) e onde achar o processo lá (“Linha P14 da aba Processos”, “Registro 48213”). O botão “Ver o resultado da importação” leva ao resultado aprovado. Ela fica para sempre, mesmo depois do prazo de desfazer, e só aparece em caso importado.
21. **O resto da ficha diz o mesmo, sem repetir:** a etapa diz “Desde 21/11, pela importação”; “Mudanças de etapa” começa com “Entrou em Instrução · pela importação do Astrea, por Marina Ribeiro”, com a etapa antiga e “Nenhum aviso foi ao cliente”; “Prazos e tarefas” traz o aviso “Nenhum prazo cadastrado. A importação não traz prazos…” com “Cadastrar o próximo prazo” (decisão 21 aprovada); “Contratos ligados” diz “Nenhum contrato ligado” e, se o cliente tem lembrete, mostra o valor com “Criar o contrato”; “Aviso ao cliente” diz que o primeiro aviso sai na próxima mudança de etapa.
22. **O caso que veio encerrado** fica em Encerrados, sem resultado e sem acerto, com o selo próprio “Veio encerrado” (tracejado, com ícone de pasta e texto, para não depender de cor). Na lista, a coluna “Resultado” vira “Como encerrou”: o resultado com o acerto, ou “Veio encerrado · sem resultado · arquivado no Astrea em 14/03/2025”, com o selo da origem. Entra o filtro “Como encerrou”: todos, com resultado, veio encerrado da importação, importação desfeita. Assim os 71 arquivados não escondem os 14 encerrados de verdade.
23. **Na ficha do encerrado importado:** a etapa em 8 de 8, sem botão (como todo encerrado), com “Arquivado no Astrea em 14/03/2025. Entrou encerrado, sem resultado e sem acerto.”; a linha da importação; e a folha “Resultado”: “Sem resultado”, fora das contas de ganho, perda e acordo, não pede acerto no Financeiro, com “Registrar o resultado” como opção (pergunta 3). Caso encerrado não ganha lembrete de contrato, mesmo que tenha valor em aberto no Astrea.
24. **Celular:** a linha da importação perde o ícone e empilha os dados, com o botão em largura cheia; os encerrados viram cartões, com o selo “Veio encerrado” e o da origem.

## Acessibilidade (WCAG 2.2 AA)

- **Conferência automática** em 40 capturas (20 estados × computador e celular), feita pelo `fotos.cjs` aprovado. O resultado completo fica em `_conferencia.json`:
  - o axe (WCAG 2.0, 2.1 e 2.2, A e AA) não achou nenhuma violação;
  - nenhuma tela tem rolagem lateral, no computador nem no celular;
  - nenhum erro de script.
- **Alvos.** Todos os alvos das peças novas têm 44 px ou mais, inclusive os botões das linhas da lista (“Criar o contrato”, “Dispensar”, “Trazer de volta”, “Ver o contrato”), que não usam o botão compacto. A única exceção que o script aponta vem de peça aprovada, sem mudança: a palavra-marca “T3jus” no alto do trilho.
- **Contraste.** Só pares do D2 e do conceito Gabinete: o selo da origem é vinho-escuro sobre âmbar claro (#F2CDB3) ou vinho sobre sal; “Veio encerrado” é vinho sobre sal, com contorno tracejado #AC788D só de borda; o valor é vinho sobre branco.
- **Nomes.** Cada botão de linha leva o cliente no nome lido (“Dispensar o lembrete de Márcio Tavares”, texto escondido para o leitor). Os números do alto são links com `aria-current` e o número lido por extenso. A linha da importação tem título só para o leitor (“Origem do caso”).
- **Janela.** `<dialog>` com `showModal()`, `role="alertdialog"`, título e descrição ligados (`aria-labelledby`, `aria-describedby`), o foco na primeira opção do motivo e o Esc fecha. As opções são rádios num `fieldset` com `legend`. No erro, o campo do motivo recebe o foco, com `aria-invalid` e a mensagem ligada por `aria-describedby`; o resumo do erro usa `role="alert"`.
- **Estados.** O carregando usa `aria-busy`; a contagem da lista e os avisos de sucesso usam `role="status"`; os erros, `role="alert"`.

## O que precisa de dado novo no servidor

Em cima da migração `0820`. A tabela `lembrete_contrato` já tem `escritorio_id` e passa por `proteger_tabela_escritorio`. O escritório vem sempre da sessão no servidor, nunca do navegador. Valores em centavos.

### Tabelas e campos

| Tabela | Campos | Observação |
|---|---|---|
| `lembrete_contrato` (campos novos) | `dispensado_em`, `dispensado_por` (pessoa), `dispensa_motivo` (JA_NEGOCIADO, PERDOADO, OUTRO_CONTRATO, OUTRO), `dispensa_detalhe` (até 140, obrigatório em OUTRO), `trazido_em`, `trazido_por` | `check`: o motivo existe quando `dispensado_em` existe. “Aberto” passa a ser `resolvido_em`, `dispensado_em` e `desfeito_em` vazios: o índice `lembrete_contrato_aberto` e o gatilho `lembrete_contrato_resolver` mudam junto. Ao trazer de volta, os campos da dispensa se apagam e o histórico guarda a dispensa |
| `lembrete_contrato` (consulta) | o mais antigo dos lançamentos em aberto (de `historico_financeiro_anterior`) | Para a linha “o mais antigo venceu em” e a ordem “lançamento mais antigo”. Pode ser calculado na leitura |
| Histórico do cliente | Eventos `lembrete_dispensado` (motivo, detalhe, valor) e `lembrete_trazido` | Na mesma tabela de eventos de Clientes |
| `casos` (campos novos) | `importacao_id` (já previsto no aprovado), `etapa_origem` (o nome da etapa no sistema antigo), `id_origem` (a linha do backup ou o registro do ADVBOX), `arquivado_origem_em` | Para a linha “Veio da importação”. `etapa_origem` e `id_origem` vêm de `importacao_linhas` no momento de importar |
| `casos` (situação) | `encerrado_por` ganha IMPORTADO_ENCERRADO (o aprovado já tem RESULTADO e IMPORTACAO_DESFEITA) | Sem resultado e sem acerto; fora das contas de resultado. “Registrar o resultado” troca para RESULTADO (pergunta 3) |
| Gatilho de lembrete | O caso importado como encerrado não gera lembrete | Na função de importar o financeiro da `0820` |

### API

| Rota | O que faz | Erros |
|---|---|---|
| `GET /v1/escritorio/contratos/lembretes?situacao=ABERTO\|CONTRATO\|DISPENSADO&q=&ordem=` | A lista, com os totais dos três grupos e a soma em aberto | `SEM_PERMISSAO` (sem a área Contratos) |
| `POST /v1/escritorio/contratos/lembretes/:id/dispensar` | Recebe o motivo e o detalhe; grava e escreve o evento | `MOTIVO_OBRIGATORIO`, `JA_RESOLVIDO` (virou contrato ou já foi dispensado: a tela mostra quem e quando), `SEM_PERMISSAO` |
| `POST /v1/escritorio/contratos/lembretes/:id/trazer` | Desfaz a dispensa, sem prazo | `NAO_DISPENSADO`, `SEM_PERMISSAO` |
| `GET /v1/escritorio/clientes/:id/anterior` | A rota do código ganha o lembrete dispensado (para a linha discreta da ficha) | — |
| `GET /v1/escritorio/juridico/casos/:id` | A ficha ganha `origem` (sistema, importação, data, quem, etapa antiga, id de origem) | — |
| `GET /v1/escritorio/juridico/casos?situacao=ENCERRADO&como=` | O filtro “Como encerrou” | — |

## Para o painel

- Esta entrega é só desenho. Quando virar código, cita F3.56 e VA-05.
- Itens “pendente” novos, conforme as respostas: a lista dos lembretes e dispensar (F3.56); a linha da importação e o encerrado importado no Jurídico (F3.56).

## Perguntas para a Carol

1. **Quem pode dispensar um lembrete?** **Recomendo quem tem a área Contratos**, as mesmas pessoas que podem criar o contrato, sempre com o motivo e o nome no histórico. Dispensar não mexe em dinheiro do T3jus nem no histórico do Astrea, e volta com um clique. A outra opção é só a sócia dona, se o escritório preferir que perdoar valor seja decisão dela.
2. **Dispensar se desfaz?** **Recomendo que sim, sem prazo**, por “Trazer de volta” em Dispensados, também para quem tem Contratos. Nada se perde no meio, e o histórico guarda as duas coisas. A outra opção é um prazo de 7 dias, como no desfazer da importação, mas aqui não há motivo para travar.
3. **O caso que veio encerrado conta como encerrado do escritório?** **Recomendo que apareça em Encerrados, com o selo “Veio encerrado” e o filtro próprio, mas fique fora das contas de resultado** (ganho, perda e acordo) e do acerto. Quem quiser pode registrar o resultado na ficha, e aí ele entra nas contas. A outra opção é deixar esses casos só no filtro, fora da contagem de Encerrados.
