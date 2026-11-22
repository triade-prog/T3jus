# Portal: ficha do cliente ligada a propostas, contratos e casos · notas

**Aprovado pela Carol em 22/11/2026 às 8h02 (Bahia), com as 7 recomendações das perguntas abaixo ("pode seguir as recomendações").** A ideia nova CH-10 entrou no IDEIAS.md. Atende quatro pedidos dela, com as palavras dela:

- "dentro de clientes nao temos botao de gerar proposta, precisamos ter um botão de atalho para gerar proposta";
- "Vamos substituir o botão de 'Registrar atendimento' que fica ao lado de 'Histórico de atendimento' por um botao de ação de estado, se ainda nao gerou proposta ser um botao de gerar, se ainda nao gerou contrato ser um botao de gerar";
- "dentro da ficha ao lado de atendimento, temos que ter proposta, contrato, tudo...";
- "ao assinar o contrato o cliente tem que ir direto para Jurídico > Casos e processos".

Ideias que pesam: AP-01 (cadastro único), AP-02 (histórico de atendimento), AP-05 (propostas com situação), AP-06 (próximo contato), CH-01 (contrato ligado ao cliente), EX-01 (caso com vários clientes, cada um com o próprio contrato), IN-01 (atendimento e proposta viram contrato), PT-02 (cada pessoa vê o mínimo), PT-03 (nada é apagado) e PT-10 (WCAG 2.2 AA, celular, vazio e erro).

A base é a ficha aprovada de Clientes (`portal-clientes`) e a ficha do caso aprovada no Jurídico (`portal-juridico`), sem mudança no que já existe. O elenco e o "hoje" são os de sempre: Ribeiro & Matos, Marina Ribeiro como sócia dona, quarta-feira, 18/11/2026. A cliente é Antônia Ferreira Prado, e o caso é o "Ferreira Prado x INSS", que já está na lista aprovada de Casos e processos. Os estados são momentos da mesma história, da primeira reunião ao caso aberto. As peças novas têm o prefixo `fl-`.

## Como abrir

- `index.html` abre sozinho, com o CSS, as fontes e os ícones embutidos. Ele funciona publicado como página única.
- O botão **Estados**, no canto de baixo, troca de estado. O estado também vem do endereço, por exemplo `index.html?estado=assinar`. Com `&quem=juridico` ou `&mais=1`, valem os atalhos de sempre.
- Abaixo de 760 px, a página vira a versão de celular, com a barra de baixo (Início, Conversas, Agenda e Mais).
- Funcionam: as abas (entre os estados), abrir e fechar as janelas (pelo botão, pelo X e pelo Esc) e "Registrar atendimento". O resto é desenho.
- As capturas `<estado>-computador.webp` (1440) e `<estado>-celular.webp` (412) ficam na pasta. As de janela crescem até caber a janela inteira.
- `_fonte/gerar.sh <pasta>` refaz tudo:
  - `comum.py`, `clientes.py` e `juridico.py` são cópias sem mudança das aprovadas. O script novo lê `clientes.py` e `juridico.py` até o começo dos estados, sem gerar os HTML deles;
  - `ficha_ligada.py` gera o `index.html` e o `casos.json`;
  - `fotos.cjs` faz as capturas e roda as conferências; `webp.py` converte para WebP.
- Todos os dados são fictícios.

## Estados (22)

| Grupo | Estado | O que mostra |
|---|---|---|
| Lista | `lista` | Coluna nova "Próximo passo" e "Gerar proposta" na linha de quem não tem proposta |
| Lista | `lista-sem-comercial` | Larissa (só Jurídico): a coluna aparece, sem o botão |
| Passo | `sem-proposta` | Âmbar e Histórico com "Gerar proposta"; "Registrar atendimento" fica ao lado |
| Passo | `propostas-vazio` | Aba Propostas vazia, com "Gerar proposta" |
| Passo | `proposta-enviada` | "Registrar resposta" e "Ver a proposta"; aba Propostas com a enviada e uma recusada |
| Passo | `proposta-aceita` | "Gerar contrato"; aba Contratos vazia, com "Gerar contrato da P-2026-014" |
| Passo | `contrato-elaboracao` | "Registrar assinatura" no âmbar e ao lado do Histórico |
| Passo | `contrato-aba` | Aba Contratos com o contrato em elaboração |
| Passo | `com-caso` | Tudo pronto: "Ver o caso"; aba Casos com a etapa |
| Passo | `ficha-ligada` | Aba Ficha: "No escritório" no lugar do quadro tracejado "Contratos e casos" |
| Assinatura | `assinar` | A janela: data, arquivo e o caso novo já preenchido |
| Assinatura | `assinar-erro` | Não registrou: nem a assinatura, nem o caso |
| Assinatura | `assinar-com-caso` | O contrato já está num caso: não abre outro, leva a ele |
| Assinatura | `caso-aberto` | Depois de assinar: a ficha do caso novo, em Jurídico › Casos e processos |
| Assinatura | `assinado-sem-caso` | Contrato assinado antes desta mudança: "Abrir o caso"; aba Casos vazia |
| Assinatura | `abrir-caso` | A janela curta de abrir o caso |
| Sem a área | `assinar-sem-juridico` | Bianca (Contratos e Financeiro) assina: o caso abre com os dados do contrato |
| Sem a área | `assinado-sem-juridico` | Bianca depois de assinar: continua na ficha, sem link para o caso |
| Sem a área | `ficha-juridico` | Larissa (só Jurídico): abas Ficha e Casos, com "Ver o caso" |
| Sem a área | `ficha-comercial` | Diego (Comercial e Financeiro): o passo é de Contratos e não é dele |
| Estados | `aba-carregando` | Aba carregando (Propostas) |
| Estados | `aba-erro` | Aba com erro (Casos) |

## Decisões de design

### O botão do próximo passo

1. **O âmbar do topo passa de "Próximo contato" para "Próximo passo".** O âmbar é o ponto de ação da ficha, e a Carol pediu um botão que siga o estado do cliente. Por isso o botão do passo é o principal do âmbar. Em cima dele vem uma trilha curta de quatro passos (Proposta, Contrato, Assinatura e Caso), com o feito em vinho com ✓ e o próximo em branco com contorno. Cada passo também tem o texto para leitor de tela.
2. **O próximo contato continua no âmbar, numa linha de baixo**, com a data, o selo de vencido e "Registrar atendimento" como botão secundário. O contato vencido continua à vista no topo, como na ficha aprovada, mas não disputa com o passo. Esta é a pergunta 1.
3. **Ao lado de "Histórico de atendimento" vai o mesmo botão do passo**, como a Carol pediu, e "Registrar atendimento" fica ao lado, como secundário. Na aba Atendimentos, registrar ainda é a ação mais comum, e tirá-lo dali faria a pessoa subir até o topo.
4. **Os estados e os botões**, do mais novo para o mais antigo:

   | Momento do cliente | Título no âmbar | Botão principal | Para onde vai |
   |---|---|---|---|
   | Sem proposta (ou só recusadas) | Fazer a proposta | Gerar proposta | `/comercial/propostas/nova?cliente=<id>` (já existe) |
   | Proposta em rascunho | Enviar a proposta | Ver a proposta | Ficha da proposta, onde está "Marcar como enviada" |
   | Proposta enviada ou em negociação | Resposta da proposta | Registrar resposta, e "Ver a proposta" ao lado | Ficha da proposta com a janela "Registrar resposta" aberta (`?responder=1`, novo) |
   | Proposta aceita, sem contrato | Gerar o contrato | Gerar contrato | `/contratos/contratos/novo?proposta=<id>` (já existe) |
   | Contrato em elaboração | Colher a assinatura | Registrar assinatura | A janela abre na própria ficha do cliente |
   | Contrato assinado, sem caso | Abrir o caso | Abrir o caso | A janela curta abre na própria ficha |
   | Caso em andamento | Caso em andamento (com o nome do caso e a etapa) | Ver o caso | `/juridico/casos/<id>` |

   O rascunho não ganhou captura: ele é igual ao "Resposta da proposta", com outro título e outro botão.
5. **Quando há mais de uma coisa aberta**, o passo segue a que pede ação primeiro: proposta aberta, depois contrato em elaboração, depois contrato sem caso, e só então o caso. Por exemplo, a cliente que tem um caso e recebeu uma proposta nova mostra "Resposta da proposta". A aba de cada área continua listando tudo.
6. **Se a pessoa não pode dar o passo, o botão principal vira "Registrar atendimento"**, e o texto diz quem pode (estado `ficha-comercial`: "Quem registra a assinatura tem a área Contratos: Marina e Felipe"). O botão nunca aparece desabilitado. Para quem tem Comercial e não tem Contratos, com proposta aceita, vale o "Pedir o contrato" que já existe na proposta (IN-01).

### Abas da ficha

7. **Cinco abas, na ordem do caminho do cliente: Ficha, Atendimentos, Propostas, Contratos e Casos.** Cada uma traz a contagem. No celular, as abas viram botões em três colunas (duas linhas), sem rolagem lateral.
8. **Cada aba é uma tabela no computador e cartões no celular**, como a lista de Clientes. O número abre a ficha do item.
   - **Propostas:** número, quem criou e quando, situação com a data ("Enviada em 10/11 · retorno em 20/11, com Diego"), honorários e "Abrir". A proposta que pede ação ganha um filete âmbar.
   - **Contratos:** número e objeto, situação, honorários, recebimentos (o próximo valor e o vencimento) e o caso ligado. O pé diz que baixar o PDF ou o .docx fica na ficha do contrato.
   - **Casos:** nome e número, etapa com a trilha de 8, papel do cliente ("Autora · única cliente do caso"), responsável e próximo prazo. Se o processo tem outros clientes, a coluna diz quantos (EX-01).
9. **Recebimentos não vira aba.** A coluna Recebimentos, na aba Contratos, mostra o essencial e leva à aba Recebimentos do contrato, que já existe. Esta é a pergunta 2.
10. **Vazios com o atalho de criar:** Propostas leva a "Gerar proposta". Contratos leva a "Gerar contrato da P-…" quando há proposta aceita, ou a "Criar contrato sem proposta". Casos diz que o caso abre na assinatura, ou oferece "Abrir o caso" e "Juntar a um caso que já existe" quando o contrato já foi assinado.
11. **Carregando e erro são por aba.** A ficha e as outras abas continuam valendo, e o erro dá "Tentar de novo" e o código para o suporte.
12. **Na aba Ficha, o quadro tracejado "Contratos e casos" dá lugar a "No escritório"**, com uma linha para a proposta, o contrato e o caso, cada uma com "Ver", que abre a aba.

### "Gerar proposta" na lista de Clientes

13. **A lista ganha a coluna "Próximo passo"**, com o mesmo texto do âmbar ("Resposta da proposta · P-2026-014 · retorno 20/11"). Só a linha "Sem proposta" ganha o botão "Gerar proposta", porque é o único passo que começa na lista. Os outros abrem a ficha, onde o contexto está. No celular, o botão fica no fim do cartão, por cima da área de toque do cartão. Esta é a pergunta 3.
14. Para caber a coluna, as larguras foram refeitas, e o nome longo usa a correção que já está no código (o link quebra a linha sem cobrir o "Pessoa física").

### A assinatura leva ao caso

15. **A janela "Registrar assinatura" ganha a seção "O caso em Jurídico"**, com três escolhas:
    - **Abrir um caso novo** (já marcada), com nome, área, responsável e papel do cliente já preenchidos. O caso começa na primeira etapa do escritório;
    - **Juntar a um caso que já existe**, para o processo que já tem outro cliente (EX-01);
    - **Este contrato não tem caso**, para consultoria. Esta escolha é a pergunta 4.
16. **O botão diz o que acontece: "Registrar e abrir o caso".** Ao confirmar, a tela vai para a ficha do caso novo, em Jurídico › Casos e processos, com o aviso "Assinatura registrada e caso aberto". A ficha do caso é a aprovada, com o nome, a área, o responsável, o contrato e "aberto por Marina Ribeiro, na assinatura".
17. **A assinatura e o caso andam juntos.** Se algo falhar, nada fica: nem a assinatura, nem o caso. O arquivo assinado já guardado continua guardado, como hoje (estado `assinar-erro`).
18. **Se o contrato já está num caso** (`caso_clientes.contrato_id`), a seção vira um quadro com o caso, a etapa, o responsável e quem ligou. Nenhum caso novo é aberto, e o botão vira "Registrar e ir para o caso".
19. **Se quem assina não tem a área Jurídico** (Bianca, com Contratos e Financeiro), o caso abre do mesmo jeito, com os dados do contrato, sem que ela mude nada. A responsável (Larissa) recebe o aviso no sino. Bianca continua na ficha, e o âmbar diz "Caso aberto em Jurídico, com Larissa Costa", sem link. Esta é a pergunta 5.
20. **Contrato assinado antes desta mudança, ou com "não tem caso"**, mostra "Abrir o caso" no âmbar e na aba Casos. A janela curta é a mesma seção, sem a assinatura.
21. **A mesma janela vale na ficha do contrato.** O "Registrar assinatura" do âmbar do contrato abre esta janela, com o mesmo fim.

### Quem não tem a área

22. **A aba de uma área só aparece para quem tem a área**, como já é com Atendimentos. Embaixo, uma faixa diz o que falta e quem libera:

    | Pessoa | Abas | O botão do passo |
    |---|---|---|
    | Marina (sócia dona, tudo) | Ficha, Atendimentos, Propostas, Contratos, Casos | Sempre o do passo |
    | Diego (Comercial e Financeiro) | Ficha, Atendimentos, Propostas | Proposta: sim. Contrato, assinatura e caso: "Registrar atendimento" e quem pode |
    | Bianca (Contratos e Financeiro) | Ficha, Contratos | Contrato e assinatura: sim. Proposta: nenhum botão. Caso: só o texto |
    | Larissa (só Jurídico) | Ficha, Casos | "Abrir o caso" e "Ver o caso". Sem caso, o âmbar mostra a procuração, como no aprovado |
    | Paula (só as partes comuns) | Ficha | O âmbar mostra a procuração, como no aprovado |

23. **"No escritório", na aba Ficha, só lista o que a pessoa pode abrir.** Quem não tem a área não vê a linha.

## Acessibilidade (WCAG 2.2 AA)

- **Conferência automática** em 44 capturas (22 estados × computador e celular), feita pelo `fotos.cjs`. O resultado está em `_conferencia.json`:
  - o axe (WCAG 2.0, 2.1 e 2.2, A e AA) não achou nenhuma violação;
  - nenhuma tela tem rolagem lateral;
  - não houve nenhum erro de script;
  - todos os alvos têm 44 px ou mais. A única exceção é a palavra-marca "T3jus" no trilho (24 px), a mesma da moldura aprovada.
- **A trilha do caminho** é uma lista `ol` com rótulo. Cada passo diz em texto se está feito, se é o próximo ou se vem depois. A cor não é o único sinal: o feito tem ✓.
- **Os botões de linha** ("Gerar proposta", "Ver") têm o nome completo para o leitor de tela, por exemplo "Gerar proposta para Daniela Rocha Mendes" e "Ver a aba Contratos".
- **Na janela**, as escolhas ficam num `fieldset` com `legend`. A falha do servidor usa `role="alert"`, e o que acontece depois de confirmar está escrito antes do botão.
- **Contraste:** só entram pares do Gabinete. Sobre o âmbar vão tinta e vinho. O passo feito é branco sobre vinho (10,6:1), e o próximo é vinho sobre branco.

## O que muda no servidor

As tabelas têm `escritorio_id` e passam por `proteger_tabela_escritorio`. O escritório vem da sessão, nunca do navegador. Nada se apaga. Se precisar de migration, a faixa é 0740–0749.

1. **A ficha do cliente (`GET /v1/escritorio/clientes/:id`) passa a trazer:**
   - `passo`: o tipo (`SEM_PROPOSTA`, `PROPOSTA_RASCUNHO`, `PROPOSTA_ANDAMENTO`, `PROPOSTA_ACEITA`, `CONTRATO_ELABORACAO`, `CONTRATO_SEM_CASO` ou `CASO`), o id e o número do item, as datas do texto, `pode` (se a pessoa pode dar o passo) e `quemPode` (nomes, quando não pode). O servidor calcula o passo com a regra da decisão 5 e as áreas da sessão;
   - `contagens`: propostas, contratos e casos, só das áreas que a pessoa tem;
   - `noEscritorio`: as três linhas do resumo, também só das áreas que a pessoa tem.
2. **As listas das abas:** as listas que já existem de propostas (Comercial), contratos (Contratos) e casos (Jurídico) recebem o filtro `?cliente=<id>`. Cada rota confere a área, como hoje. A de casos usa `caso_clientes.cliente_id`. A linha de contrato traz o caso ligado (pelo `caso_clientes.contrato_id`) e o próximo recebimento.
3. **A lista de Clientes** traz o `passo` resumido em cada linha (tipo e texto curto), na mesma consulta.
4. **A ficha da proposta** aceita `?responder=1` para abrir a janela "Registrar resposta". Isso é só tela.
5. **`POST /v1/escritorio/contratos/:id/assinatura` passa a receber `caso`:**
   - `{ modo: "NOVO", nome, area, responsavelId, papel }`, `{ modo: "JUNTAR", casoId, papel }` ou `{ modo: "SEM" }`;
   - tudo numa transação só: registra a assinatura, cria o caso (`casos` na primeira etapa do escritório, mais `caso_clientes` com `contrato_id`) ou acrescenta o cliente ao caso escolhido;
   - devolve `{ recebimentos, casoId }`, e a tela vai para o caso;
   - se o contrato já está em `caso_clientes.contrato_id`, o `caso` é ignorado e volta o `casoId` existente;
   - **quem tem só `contratos.editar`** pode mandar `modo: "NOVO"` com os valores sugeridos, sem trocá-los (o servidor usa os dele). O responsável recebe no sino o evento novo `CASO_ABERTO_NA_ASSINATURA`. Para `JUNTAR`, o servidor pede `juridico.editar`;
   - se o responsável do contrato não tem a área Jurídico, a sugestão vai para a sócia dona, e quem tem Jurídico pode trocar.
6. **Rota para abrir o caso de um contrato já assinado:** `POST /v1/escritorio/contratos/:id/caso`, com o mesmo `caso` (só `NOVO` e `JUNTAR`). Exige `juridico.editar`.
7. **Campo novo `contratos.area`** (opcional, `area_direito_valida`), pedido no formulário do contrato e copiado da proposta, se ela tiver. Hoje o contrato só guarda o `objeto` em texto, e a área do caso não teria de onde vir. Sem o campo, a janela pede a área, e quem não tem Jurídico precisaria escolher. Esta é a pergunta 6.
8. **Contrato com "não tem caso":** `contratos.sem_caso` (boolean, opcional), para o passo não pedir "Abrir o caso" para sempre. Depende da pergunta 4.
9. **Histórico do escritório:** o evento de assinatura passa a dizer o caso aberto ou o caso ao qual o cliente foi juntado.

### Para o painel

- O desenho atende os quatro pedidos da Carol. As ideias citadas são AP-01, AP-02, AP-05, AP-06, CH-01, EX-01 e IN-01.
- **Recomendo uma ideia nova no IDEIAS.md, na seção de integração: "a assinatura do contrato abre o caso no Jurídico".** Hoje nenhuma ideia diz isso com todas as letras.

## Perguntas para a Carol

1. **O âmbar do topo vira "Próximo passo", e o próximo contato desce para uma linha de baixo, ainda no âmbar. Pode ser?** **Recomendo que sim.** O botão que você pediu fica no lugar de mais destaque, e o contato vencido continua à vista, com o selo e o "Registrar atendimento" ao lado.
2. **Recebimentos vira uma aba na ficha do cliente?** **Recomendo que não, por agora.** A coluna Recebimentos na aba Contratos mostra o próximo valor e leva à aba Recebimentos do contrato. Uma aba a mais, com o mesmo dado, pesa no celular. Se o cliente tiver muitos contratos, ela volta à mesa.
3. **Na lista de Clientes, "Gerar proposta" fica na linha de quem não tem proposta?** **Recomendo que sim, só nessa linha**, com a coluna "Próximo passo" para os outros. Um menu de "…" em cada linha esconde a ação que você quer à mão.
4. **A janela da assinatura oferece "Este contrato não tem caso", para consultoria?** **Recomendo que sim, como a última escolha.** Sem ela, todo contrato de mensalidade de empresa abriria um caso vazio. Com ela, o passo do cliente para de pedir "Abrir o caso".
5. **Quem assina sem ter a área Jurídico (Bianca) abre o caso mesmo assim?** **Recomendo que sim**, com os dados do contrato, sem poder mudar, e com aviso no sino da responsável. A Carol pediu que o cliente vá direto para o Jurídico, e esperar alguém do Jurídico deixaria cliente assinado sem caso.
6. **O contrato passa a guardar a área do direito (Previdenciário, Trabalhista…)?** **Recomendo que sim, como campo opcional no formulário do contrato.** Assim a área do caso já vem certa na assinatura. Sem ele, a janela pede a área toda vez.
7. **Ao abrir o caso na assinatura, o cliente recebe algum aviso pelo WhatsApp?** **Recomendo que não.** O primeiro aviso sai na primeira mudança de etapa, como já é. A ficha do caso diz isso em "Aviso ao cliente".
