# Portal: Início por áreas · notas

> **Aprovado pela Carol em 19/11/2026, às 18h47 (Bahia).** Ela respondeu as 4 perguntas do fim: 1) ordem fixa; 2), 3) e 4) como recomendado. As respostas valem como decisões (ver "Decisões da Carol").

O pedido da Carol: *"Sobre isso Painel do dia (Início do Portal), pensei em um dashboard por Áreas: Comercial, Contratos, Financeiro, Jurídico."* Desenho para ela aprovar antes de virar código.

**Leitura do pedido (seguida sem divergir):** o Início do Portal do advogado vira um painel com um bloco por área, cada um com os números e as pendências do dia daquela área, levando ao registro que explica cada item. Cada pessoa vê só as áreas que a sócia dona liberou para ela, sem bloco travado e sem contagem da área que não tem (PT-02). A sócia dona vê os seus por padrão, com a opção de ver os da equipe (decisão 1 do bloco de contatos, F1.14). A única escolha minha dentro da leitura: **blocos empilhados**, não abas (decisão 1, abaixo).

Atende:

- **Painel do dia:** PD-01 (o que cobrar, acompanhar e entregar), PD-02 (contatos e propostas com retorno), PD-03 (parcelas vencidas e próximos recebimentos), PD-04 (prazos e tarefas atrasadas ou de hoje), PD-05 (o que está esperando alguém), PD-06 (repasses pendentes) e PD-07 (responsável e próxima ação em cada item, e cada item leva ao registro);
- **Portal em áreas:** PA-01 e PA-02 (cada área só para quem a sócia dona liberou);
- **Indicadores, só como número do dia:** IN-04 (vencidos e pendentes) e IN-06 (tarefas e bloqueios que pedem ação). Os indicadores do mês (IN-02, IN-03, IN-07, IN-09 etc.) ficam no Resumo do Financeiro e no Funil, de propósito (decisão 4).

Pesam também PT-02 (cada pessoa vê o mínimo), PT-10 (WCAG 2.2 AA, celular e estados), FI-06 (dinheiro de terceiros separado) e EX-10 (nada sem responsável).

A base é o **Início aprovado mais recente** (`portal-clientes-pendencias`, F1.14, já programado): o mesmo `comum.py`, `clientes.py` e `pendencias.py`, **copiados sem mudança**. O `inicio_areas.py` lê as peças deles (hero, item de contato, `.pd-grupo`, `.pd-chips`, esqueleto, janela "Registrar atendimento", marca de hoje com o `LogoCompacto` sobre-vinho). A Agenda de hoje e o Esperando alguém são os do Início aprovado (`portal-inicio.html`), sem mudança. A folha de terceiros usa as mesmas regras `fi-terc` do Financeiro aprovado. As peças novas têm o prefixo `ar-`. Os dados são os das telas aprovadas: o mesmo elenco (Marina Ribeiro, sócia dona; Bianca Torres, Contratos e Financeiro; Larissa Costa, só Jurídico; Paula Nunes, sem área; Diego e Felipe como responsáveis), os mesmos clientes, casos, valores e a mesma data (quarta, 18/11/2026, 10h12).

## Como abrir

- `index.html` mostra os 8 estados em computador (1440) e celular (412), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- `inicio.html` abre sozinho, com as fontes, o CSS e os ícones embutidos. O estado vem do endereço: `inicio.html?estado=dona`, `?estado=dona-equipe`, `?estado=bianca`, `?estado=larissa`, `?estado=paula`, `?estado=vazio`, `?estado=carregando` e `?estado=erro`. No celular, `&mais=1` abre a folha Mais.
- Os botões "Os meus" e "Da equipe" trocam entre `dona` e `dona-equipe`. Cada cartão da faixa leva ao bloco da área. Os títulos dos itens e os links "Abrir Comercial", "Prazos" etc. levam às telas aprovadas das áreas, que ficam ao lado desta pasta (`../portal-comercial-contratos/`, `../portal-financeiro/`, `../portal-juridico/`, `../portal-agenda-conversas/`, `../portal-clientes/`). "Registrar atendimento" de Antônia (em `dona-equipe`) abre a janela aprovada.
- Abaixo de 760 px, o HTML vira a versão de celular, com a barra de baixo aprovada (Início, Conversas, Agenda, Mais) e sem gaveta. As capturas de celular mostram a página inteira, com a barra no fim.
- A pasta `_fonte/` guarda os scripts, e `sh _fonte/gerar.sh <pasta>` refaz tudo:
  - `comum.py`, `clientes.py` e `pendencias.py`: cópias sem mudança do Início aprovado (F1.14);
  - `inicio_areas.py`: gera o `inicio.html`;
  - `casos_ia.py`: gera a lista de estados e o `index.html`;
  - `fotos_ia.cjs`: é o `fotos_pd.cjs` aprovado lendo a lista nova. Faz as capturas com deviceScaleFactor 2 e roda o axe (WCAG 2.0, 2.1 e 2.2, A e AA), a rolagem lateral, os alvos menores que 44 px e os erros de script. O axe vem do `@axe-core/playwright`: do `node_modules` do sistema, se houver, ou do caminho em `AXE_PLAYWRIGHT`;
  - `webp.py`: converte as capturas para WebP.
- **Conferência** (`_conferencia.json`): 16 capturas, 0 violação do axe, 0 rolagem lateral, 0 alvo pequeno, 0 erro de script.

## Decisões de design

1. **Blocos empilhados, não abas.** O Início serve para bater o olho às 8h e saber o que pede ação. Abas escondem três das quatro áreas e obrigam a clicar para descobrir que havia um prazo vencendo. O resumo por área fica numa **faixa de cartões** no alto ("Hoje nas suas áreas"); o detalhe fica nos blocos, logo abaixo. A faixa faz o papel de índice: cada cartão leva ao bloco (no celular, poupa a rolagem).
2. **Ordem fixa: a do menu.** Comercial, Contratos, Financeiro, Jurídico, igual ao trilho e ao pedido da Carol, para cada pessoa achar a área sempre no mesmo lugar. A urgência não muda a ordem: ela aparece no disco do cartão (vinho 3 quando há vencido, âmbar quando é hoje) e no número do hero. Pergunta 1.
3. **Cada cartão tem no máximo dois números.** O primeiro, no Disco, é o que pede ação ("1 cobrança parada", "4 contatos vencidos"); o segundo, numa linha embaixo, é o que acompanhar ("1 contrato esperando a assinatura"). No Financeiro, o segundo é sempre o de terceiros, na faixa âmbar com o escudo: os dois números nunca somam (FI-06).
4. **Só o que é do dia.** Entra o que vence hoje, o que já venceu e o que está esperando alguém, mais o que vence até o fim da semana quando precisa de preparo (assinatura na sexta, repasse até sexta). Os números do mês (recebido, previsto, funil, conversão) ficam nas áreas; o rodapé de cada bloco aponta para lá ("Os números do mês estão no Resumo").
5. **Dentro do bloco**, o desenho é o do bloco Contatos de hoje aprovado:
   - grupos com rótulo e contagem: **Vencidos**, **Para hoje**, **A acompanhar** ou **Esperando alguém** (PD-05);
   - cada item tem a data no Disco (vinho 3 vencido, âmbar hoje, âmbar claro depois), o registro como link (cliente e contrato, parcela, processo ou tarefa), **o verbo** em sobretítulo ("Cobrar", "Entregar", "Acompanhar", que é o PD-01 escrito), a próxima ação, uma linha de detalhe (motivo, número do processo), o valor quando é dinheiro e o selo escrito. Na visão da equipe, o responsável com a inicial (PD-07);
   - o que espera alguém mostra quem e desde quando, na faixa âmbar clara do Jurídico aprovado ("Esperando o cliente: procuração assinada, pedida em 11/11");
   - **limite de 5 itens por bloco**, o mesmo do bloco de contatos aprovado, os mais atrasados primeiro. O rodapé diz quantos faltam e de que tipo e leva à área ("Mostrando 5 de 9. Os outros 4: 2 tarefas para hoje e 2 esperando alguém").
6. **O Início mostra e leva; a ação acontece no registro.** A única ação direta continua sendo "Registrar atendimento", que a Carol aprovou no F1.14. Informar a base, registrar recebimento, marcar prazo como cumprido e repassar ficam na tela da área, que tem o contexto e as confirmações.
7. **Os contatos vencidos e do dia são o bloco Comercial.** O bloco aprovado (F1.14) já só aparecia para quem tem a área Comercial; agora ele é o miolo do bloco Comercial, sem mudança: os mesmos grupos, a linha "Nenhum contato seu está vencido. Na equipe há…", o botão e a janela. O rodapé ganhou as propostas esperando resposta (PD-02). A proposta de Gabriela não vira um segundo item, porque o retorno dela é o próprio contato de hoje (decisão 3 do Comercial aprovado), e o rodapé diz isso.
8. **Financeiro em duas folhas.** "Do escritório" (parcelas vencidas e o que entra) e, colada embaixo, a folha **"De terceiros · não é do escritório"**, com a faixa âmbar e o escudo, para os repasses (PD-06). Os valores de uma nunca somam com os da outra, nem no cartão, nem no hero.
9. **"Os meus" e "Da equipe": um botão só, para a página toda.** Fica ao lado do título da faixa e troca os cartões e os blocos ao mesmo tempo. Só a sócia dona vê. O hero continua sendo dela nos dois modos ("8 pedem você hoje"). Pergunta 2.
10. **O hero aprovado fica, com dois números:** quantos itens pedem a pessoa hoje, somando as áreas dela (contagem de itens, nunca dinheiro), e os compromissos de hoje. Os atalhos seguem as áreas: Novo cliente e Registrar recebimento para Marina; Registrar recebimento e Abrir Clientes para Bianca; Novo prazo e Abrir Clientes para Larissa; Novo cliente e Abrir Clientes para Paula.
11. **A parte comum fica à direita**, com o rótulo "Todo o escritório": Agenda de hoje (da equipe toda, como aprovada) e Esperando alguém (as conversas que a IA passou para a equipe; mostra 2 e diz quantas faltam). No celular, vem depois dos blocos, porque Agenda e Conversas já estão na barra de baixo.
12. **Quem tem só algumas áreas** vê só os cartões e os blocos delas. Bianca (Contratos e Financeiro) vê dois. **Com uma área só, a faixa sai** (Larissa): o bloco já é o painel e o cartão repetiria o que está logo abaixo. **Sem nenhuma área** (Paula), o Início mostra a parte comum lado a lado e uma linha que diz quem libera o resto, sem nomear nem contar as áreas.
13. **Bloco sem pendência não some: encolhe para uma linha** ("Nada seu em Contratos hoje.") com o próximo item. Assim a pessoa sabe que a área foi conferida, e a página não muda de forma de um dia para o outro. Quando todas estão em dia, uma linha no alto confirma ("Tudo em dia nas suas 4 áreas") e os cartões dizem "Em dia" com o próximo.
14. **Carregando e erro por bloco.** Cada área chega numa consulta própria. Enquanto uma carrega, o cartão e o bloco dela mostram o esqueleto (`aria-busy` e aviso para leitor de tela), e o número do hero diz que ela ainda está chegando. Se uma falha, o erro fica dentro do bloco (Tentar de novo, o caminho alternativo e o código para o suporte), o cartão diz "Não carregou" e o hero avisa que não conta aquela área. O resto do Início continua.
15. **O aviso de pedido de exclusão (LGPD) continua** onde foi aprovado, entre o hero e a faixa, só para a sócia dona. Não foi desenhado de novo aqui.
16. **Celular:** a faixa vira uma grade de 2 por 2; os blocos empilham na mesma ordem; cada item vira duas colunas (disco e texto), com o valor, o selo e o botão embaixo; o rodapé dos blocos põe o link embaixo do texto. A barra de baixo aprovada fica com Início marcado.

## Acessibilidade (WCAG 2.2 AA)

- **Conferência automática** em 16 capturas (8 estados × computador e celular), feita pelo `fotos_ia.cjs`. O resultado completo fica em `_conferencia.json`:
  - o axe (WCAG 2.0, 2.1 e 2.2, A e AA) não achou nenhuma violação;
  - nenhuma tela tem rolagem lateral;
  - nenhum alvo menor que 44 px (o botão compacto "Registrar atendimento" tem 36 px no computador, como no aprovado);
  - nenhum erro de script.
- **Estrutura:** um `h1` (a saudação); `h2` para a faixa, cada área, a agenda e as conversas; `h3` para os repasses dentro do Financeiro. Cada bloco é uma `section` com `aria-labelledby`; cada grupo é uma lista ordenada ligada ao rótulo. A parte comum é um `aside` com nome.
- **Cartões:** cada cartão é um link só, com o nome da área, o número e o texto, que leva ao bloco. O número do Disco é decorativo e tem o texto para leitor de tela.
- **Botões "Os meus" e "Da equipe":** grupo com `aria-pressed`.
- **Datas:** o Disco é decorativo e cada item tem a data por extenso para leitor de tela.
- **Contraste:** só pares do D2 e do Gabinete. Disco vencido: branco sobre #AC3F6B (5,7:1). Disco de hoje: #4F1D35 sobre âmbar. Faixa de terceiros: #4F1D35 sobre #F2CDB3. Verbo em #87335B sobre branco (7,9:1).
- **Cor:** nada depende só dela. Vencido, hoje, esperando, em dia e erro têm selo ou texto e ícone; terceiros tem escudo e rótulo.
- **Carregando e erro:** `aria-busy` no bloco que carrega e aviso `role="status"`; o erro tem `role="alert"` e fica preso ao bloco.

## O que precisa de dado novo no servidor

Nenhuma tabela nova: tudo sai das tabelas das áreas aprovadas, que já têm `escritorio_id` e passam por `proteger_tabela_escritorio`. O escritório e a pessoa vêm sempre da sessão, nunca do navegador. O que é novo são as **consultas do Início, uma por área**, para cada bloco carregar e falhar sozinho:

| Rota | O que devolve | Quem pode |
|---|---|---|
| `GET /v1/inicio/resumo` | O hero: quantos itens pedem a pessoa hoje (soma das áreas dela) e os compromissos de hoje. A lista das áreas liberadas (o servidor decide quais cartões e blocos existem) | Todos. As contagens de área que a pessoa não tem nem são calculadas |
| `GET /v1/escritorio/inicio/contatos?de=meus\|equipe` | A aprovada no F1.14, sem mudança, mais a contagem de propostas esperando resposta para o rodapé | Comercial. Sem a área: 403 `AREA_NAO_LIBERADA`, e a tela nem chama |
| `GET /v1/inicio/contratos?de=` | Cobranças paradas sem a base do mês (`base_mensal` faltando depois do dia do lembrete), contratos em elaboração com assinatura marcada até o fim da semana, e o total de condições esperando etapa | Contratos |
| `GET /v1/inicio/financeiro?de=` | **Duas listas separadas, sem total comum:** `escritorio` (parcelas vencidas com motivo, próxima ação e responsável; o que entra em 2 dias úteis) e `terceiros` (repasses pendentes e atrasados, com o responsável). Valores em centavos | Financeiro |
| `GET /v1/inicio/juridico?de=` | Prazos com "fazer até" ou prazo final hoje, tarefas atrasadas e de hoje, tarefas com `esperando` preenchido | Jurídico |
| Agenda e Conversas | As rotas aprovadas de Agenda (`?dia=hoje`) e de Conversas (fila "esperando alguém") | Todos |

Regras comuns às quatro rotas de área:

- `de=equipe` só para a sócia dona; para os outros, 403 `SEM_PERMISSAO` (a tela nem mostra o botão). `de=meus` filtra pelo responsável = pessoa da sessão.
- Cada uma devolve no máximo 5 itens por bloco (os mais atrasados primeiro) e o total por grupo, para o rodapé "Mostrando 5 de 9".
- "Hoje" é sempre `hoje_brasilia()`, como no F1.14.
- **Responsável nos repasses:** o Financeiro aprovado não mostra quem é o responsável de cada repasse. Para "Os seus", o repasse precisa de `responsavel_id` (o padrão sugerido é o responsável do contrato do cliente, que pode ser trocado). É o único campo novo.

## Para o painel

- A entrega atende **PD-01, PD-02, PD-03, PD-04, PD-05, PD-06 e PD-07** no Início, com **PA-01** e **PA-02**, e **IN-04** e **IN-06** como número do dia.
- Ela depende das áreas programadas: cada bloco só pode ser entregue quando a área dele tiver os dados no servidor. Se o Início sair antes de todas as áreas, cada bloco que faltar precisa de um item "pendente" no painel citando o PD da área (PD-03 e PD-06 com o Financeiro, PD-04 e PD-05 com o Jurídico, PD-02 com Propostas).
- O campo `responsavel_id` em repasse precisa de um item "pendente" que cite PD-06 e PD-07, se não entrar junto.
- A ideia da Carol cabe no PD-01 como está escrito; não pede código novo no `IDEIAS.md`. Se ela quiser registrar o "por áreas", o lugar é uma linha a mais no PD-01 ou no PA-01.

## Perguntas para a Carol

1. **A ordem dos blocos é fixa (a do menu) ou muda com a urgência do dia?** **Recomendo fixa:** Comercial, Contratos, Financeiro, Jurídico, como no menu e no seu pedido. A pessoa aprende onde olhar, e a urgência já salta no cartão (disco vinho quando há vencido) e no número do hero. Mudar a ordem todo dia faz o prazo de hoje trocar de lugar com o repasse de ontem.
2. **"Os meus" e "Da equipe" trocam a página inteira ou cada bloco tem o seu?** **Recomendo um botão só, para a página inteira**, como está. É uma pergunta só ("estou vendo o meu dia ou o do escritório?"), e os números da faixa ficam coerentes com os blocos. O bloco de contatos aprovado tinha o botão dentro dele; ele passou para o alto, com o mesmo desenho.
3. **Cinco itens por bloco está bom, ou prefere menos no celular?** **Recomendo 5 nos dois**, o mesmo limite do bloco de contatos aprovado. Com as quatro áreas cheias, a página de Marina fica longa no celular; a faixa de cartões no alto serve de atalho para cada bloco. Se os pilotos acharem longa, o primeiro ajuste é mostrar 3 no celular, com o mesmo rodapé "Mostrando 3 de 5".
4. **Quem é o responsável por um repasse?** **Recomendo o responsável do contrato do cliente, com troca possível no repasse.** O Financeiro aprovado não diz de quem é cada repasse, e sem isso "Os seus" não sabe mostrá-lo. No desenho, os repasses de Benedito e Gabriela são de Marina (responsável pelos contratos) e os do parceiro e do perito são de Bianca, que cuida do Financeiro.

## Decisões da Carol (19/11/2026)

1. **Ordem dos blocos:** fixa, a do menu (Comercial, Contratos, Financeiro, Jurídico).
2. **Os meus / Da equipe:** um botão só, para a página inteira, visível só para a sócia dona.
3. **Itens por bloco:** 5 no computador e no celular.
4. **Responsável pelo repasse:** o responsável pelo contrato do cliente, com troca possível no repasse (campo novo `responsavel_id` no repasse).
