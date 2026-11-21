# Cadastrar interessado à mão e o sino do Console · notas

**Aprovado pela Carol em 21/11/2026 às 17h05 (Bahia), com "aprovado" e sem mudanças: as recomendações das 9 perguntas valem como decisões.**

Duas telas pequenas para a Carol aprovar antes do código. As duas mudam o mínimo no que já foi aprovado.

- **Tela 1, cadastrar interessado à mão** (item F2.5, ideia SC-05; pesa também PT-11). O botão "Cadastrar interessado", que já estava no desenho aprovado de Interessados sem formulário, agora abre a janela. Ela serve para quem chegou por indicação, evento ou contato direto (telefone, WhatsApp, e-mail, visita). O pedido do site continua entrando sozinho.
- **Tela 2, o sino do Console** (item F2.6, ideias SC-02 e SC-05). O sino que já estava desenhado na moldura aprovada do Console passa a abrir o painel de avisos, no mesmo padrão do sino aprovado do Portal. Nesta primeira versão, ele avisa de três coisas: pedido novo do site, interessado passado para você e próximo passo vencido de um interessado seu.

Pesam também PT-03 (nada se apaga), PT-10 (WCAG 2.2 AA, celular, vazio, erro e carregando) e PT-19 (edição simultânea).

A base são as telas aprovadas, lidas sem mudança:

- Interessados do pacote `site-comercial`: o `_fonte/montar.py` roda o `interessados.py` aprovado numa pasta temporária, confere que o HTML saiu igual ao aprovado e reaproveita a moldura, o CSS e as peças dele e da Cobrança (`cab`, `pedido`, `notas`, `historico`, `janela`, `campo`, `aviso`);
- a Cobrança aprovada (`console-cobranca/cobranca.html`), para mostrar o que vê o Financeiro;
- o CSS do sino do Portal (`portal-sem-avisos-sino/_fonte/sino.py`, prefixo `si-`), copiado do arquivo sem mudança.

O CSS novo tem o prefixo `ci-` (cadastrar interessado) e `cs-` (sino do Console). O elenco é o de sempre: Carol Andrade (Administração), Rafael Teles (Implantação), Marta Quintela (Financeiro), Bruno Seixas (Suporte). Hoje é sábado, 21/11/2026. Todos os dados são fictícios.

## Como abrir

- `index.html` mostra os 14 estados em computador (1440) e celular (390), com legenda. Clique numa imagem para abrir o HTML naquele estado. Publique a pasta inteira: os caminhos são relativos.
- `interessados.html` é o Interessados aprovado com os estados novos:
  - cadastrar: `?aba=lista&estado=cadastrar`, `cadastrar-erros`, `cadastrar-salvando`, `cadastrar-repetido`, `cadastrar-falha`; a ficha nova: `?aba=ficha&estado=cadastrado`. Acrescente `&papel=implantacao` para ver como Rafael Teles;
  - sem permissão: `?papel=financeiro` ou `?papel=suporte`;
  - sino: `?sino=aberto`, `nao-lidos`, `lidos`, `vazio`, `erro`. Sem `?sino=`, o painel fica fechado com o ponto de novo, e clicar no sino abre a lista.
- `cobranca.html?papel=financeiro&sino=sem-interessados` é a Cobrança aprovada com o sino aberto como a Marta (Financeiro) o vê.
- Funcionam: abrir e fechar a janela de cadastro (pelo botão do cabeçalho, pelo X, por Cancelar e pelo Esc) e abrir e fechar o sino (pelo sino, pelo X e pelo Esc), com os filtros do painel. O resto é desenho.
- `sh _fonte/gerar.sh` refaz tudo (HTML, index, capturas WebP, axe e `_conferencia.json`):
  - `montar.py` gera os dois HTML;
  - `casos.json` lista os estados e `casos.py` monta o `index.html`;
  - `fotos.cjs` faz as capturas e as conferências. Ele é o mesmo do site-comercial, com duas mudanças: acrescenta `.si-link` às exceções de alvo (o aviso inteiro é o alvo, como no sino do Portal) e, quando uma janela é mais alta que a tela, aumenta a altura da captura para mostrar a janela inteira;
  - `webp.py` converte as capturas.

## Conferência

- axe-core 4.10.3 (WCAG 2.0, 2.1 e 2.2, A e AA) em **28 capturas** (14 estados × computador e celular): **nenhuma violação**, nenhuma rolagem lateral, nenhum erro de script e nenhum alvo abaixo de 40 px fora das exceções da WCAG 2.5.8. Resultado em `_conferencia.json`.
- Contraste: só os pares da IDENTIDADE.md e do Gabinete. Por exemplo: o selo "Sem responsável" é tinta sobre `#E9AE90` (8,6:1); "Vencido" é branco sobre `#AC3F6B` (5,7:1); a dica do primeiro contato é tinta sobre `#F2CDB3` (11,2:1); "Novo" é `#AC3F6B` sobre branco (5,7:1).

## Estados

| Tela | Estado | O que mostra |
|---|---|---|
| Cadastrar | em branco | A janela aberta, com responsável ("você") e próximo passo já sugeridos |
| Cadastrar | erros | 5 pontos: escritório vazio, WhatsApp incompleto, "como chegou" sem escolha, detalhe da origem vazio e "a pessoa sabe" sem escolha |
| Cadastrar | salvando | "Cadastrando…", campos travados |
| Cadastrar | possível repetido | E-mail igual ao do Sucupira: juntar, abrir o existente ou cadastrar mesmo assim |
| Cadastrar | falha de rede | O que foi escrito continua; "Tentar de novo" e código |
| Cadastrar | cadastrado | A ficha nova do Aroeira & Lins, "cadastrado à mão por Rafael Teles" |
| Cadastrar | sem permissão | Financeiro e Suporte: a página aprovada "Esta página é da Administração e da Implantação" |
| Sino | fechado | O ponto de novo; rótulo "Avisos, 3 novos" |
| Sino | aberto | Carol: 3 novos (pedido do Jatobá, passo vencido do Sucupira, Umbu passado para ela) e 3 lidos |
| Sino | só não lidos | Filtro "Não lidos" |
| Sino | todos lidos | Depois de "Marcar todos como lidos": aviso de sucesso, "Tudo lido", o ponto some |
| Sino | vazio | Luísa Matos, recém-chegada na Implantação: o que chega aqui |
| Sino | erro | "Tentar de novo", código; o ponto mantém a última contagem |
| Sino | sem Interessados | Marta (Financeiro), na Cobrança: não recebe aviso de interessado e o painel diz o porquê |

## Decisões de design: tela 1 (cadastrar à mão)

1. **Janela, não página.** É o mesmo padrão do "Cadastrar escritório" aprovado, só que mais larga (760 px), porque tem quatro partes: **Quem é**, **De onde veio o contato**, **Dados pessoais** e **Quem cuida**. Cada parte tem um título curto com ícone. No celular, a janela ocupa a tela, e os botões ficam presos no pé.
2. **Os mesmos campos do pedido do site**, para a ficha ficar igual: nome, escritório, e-mail, WhatsApp, tamanho (os 4 do site, em cartões), área (opcional), cidade e UF (opcionais) e "O que a pessoa quer" (opcional; vai para a `mensagem`).
3. **E-mail ou WhatsApp, pelo menos um.** Quem chega por telefone ou evento muitas vezes deixa só um. A frase embaixo dos dois explica isso e diz que é por eles que o T3jus confere se já existe. Isso pede mudança no banco (veja "O que o servidor precisará" e a pergunta 1).
4. **De onde veio o contato é obrigatório**, em duas partes: "Como chegou" (Indicação, Evento, Contato direto, os valores que o banco já aceita além de Site) e "De onde veio, em detalhe" (texto: "Indicação de Patrícia Nóbrega, da Umbu Advocacia de Família"). A ajuda diz por quê: esse texto explica, a qualquer tempo, por que o T3jus tem aquele contato. Há também a **data do contato**, que começa em hoje e pode ser anterior (o evento foi na quinta e o cadastro saiu no sábado), nunca depois de hoje.
5. **Base legal (LGPD), sem caixinha de autorização.** Quem cadastra à mão não tem o aceite da pessoa. A janela mostra, num quadro fixo, a base **legítimo interesse (LGPD, art. 7º, IX)**, a finalidade (apresentar o T3jus e marcar uma demonstração, nada de propaganda) e o mesmo prazo de guarda do pedido do site (12 meses depois do último contato, ou antes, se a pessoa pedir). A equipe responde a uma pergunta obrigatória: **"A pessoa sabe que vamos procurá-la?"** ("Sim, ela pediu ou aceitou" ou "Ainda não"). Com "Ainda não", a dica âmbar diz o que fazer no primeiro contato: contar de onde veio o contato e que a pessoa pode pedir para não ser mais procurada (transparência e direito de oposição, LGPD art. 10, § 2º, e art. 18, § 2º). Na ficha, essa resposta e a origem ficam na folha **"De onde veio o contato"**, no lugar da "Autorização de dados" do pedido do site. Ela não se edita.
6. **Quem cuida já vem preenchido**: o responsável é quem cadastra ("Rafael Teles (você)") e o próximo passo é "Fazer o primeiro contato", em 1 dia útil, como no pedido do site (sábado → segunda, 23/11). Se o responsável for outra pessoa, ela recebe o aviso "passou para você" no sino.
7. **Erros no padrão aprovado.** O resumo fica no topo ("Falta acertar 5 pontos, marcados abaixo. Nada foi cadastrado ainda.") e recebe o foco. Cada erro fica preso ao campo, com `aria-invalid` e `aria-describedby`; nos grupos de cartões, o erro fica no `fieldset`. O botão nunca fica desabilitado.
8. **Salvando**: "Cadastrando…" com o giro, campos só para leitura e anúncio para o leitor de tela.
9. **Possível repetido.** Ao cadastrar, o servidor confere o e-mail e o WhatsApp contra os interessados que existem. Se acha um igual, nada é cadastrado ainda e a janela mostra o existente (nome, pessoa, cidade, estágio e responsável) com três saídas:
   - **"Juntar ao existente"** (a principal): o que foi escrito vira uma nota no interessado que já existe, conta como novo contato (renova o prazo de 12 meses) e não cria outro;
   - **"Abrir o existente"**;
   - **"É outro escritório: cadastrar mesmo assim"**, no pé. Fica no histórico que havia outro com o mesmo e-mail.

   O campo igual ganha a marca "Igual ao de Sucupira Advogados Associados", que não é erro. Se o existente estiver Perdido ou Descartado, a saída principal vira "Reabrir o existente", com motivo, como já é na ficha. Se a pessoa da equipe não pode ver o existente, isso não acontece aqui: só Administração e Implantação cadastram, e as duas veem todos.
10. **Falha de rede**: aviso de urgência ("Não deu para cadastrar agora."), tudo o que foi escrito continua na janela, "Tentar de novo" e o código para o suporte. Não há conflito de versão (PT-19) porque o registro ainda não existe; o "repetido" é o que faz esse papel.
11. **Cadastrado**: a janela fecha e a pessoa cai direto na **ficha do interessado novo**. A ficha é a aprovada, com quatro diferenças: o sobretítulo diz "cadastrado à mão por Rafael Teles hoje, às 10h20"; a primeira folha se chama "Contato" (como o código já faz para origem diferente de Site); "De onde veio o contato" entra no lugar da autorização; e a Origem, na lateral, mostra quem indicou, "À mão, por Rafael Teles" e a data do contato. O histórico começa com "Rafael Teles cadastrou o interessado à mão · Indicação".
12. **Quem não pode**: Financeiro e Suporte não veem Interessados e, por isso, não veem o botão. Abrindo o endereço, aparece a página aprovada "Esta página é da Administração e da Implantação".
13. **Sem resposta automática por e-mail.** No pedido do site, a pessoa recebe "recebemos seu pedido". No cadastro à mão, ela não pediu nada pelo site, e o primeiro contato é de quem cadastrou (pergunta 4).

## Decisões de design: tela 2 (o sino)

14. **O sino já estava na moldura aprovada do Console, e ela não muda.** No computador, ele fica no topo, à direita da busca; no celular, fica na barra vinho. O ponto vinho continua sendo o sinal de novo, e o número vai no rótulo ("Avisos, 3 novos"). O botão só ganha `aria-expanded`, `aria-controls`, `aria-haspopup` e o fundo âmbar claro quando o painel está aberto. **Atenção para o código:** a `Moldura.tsx` programada ainda não tem o sino nem a busca no topo; entra só o botão do sino, no topo e na barra do celular.
15. **O painel é o do Portal**, com o mesmo CSS: no computador, desce do sino (460 px), sem escurecer a página (`dialog` não modal), e fecha pelo X, pelo Esc ou por um novo clique no sino, com o foco voltando ao sino; no celular, ocupa a tela, com o cabeçalho vinho (`dialog` modal). Tem "Para você · Avisos" com a contagem ("3 novos · 6 nos últimos 30 dias"), os filtros **Todos** e **Não lidos (3)**, **Marcar todos como lidos**, a lista por dia (Hoje · sábado, 21/11; Ontem · 20/11; Antes) com o rótulo do dia preso no alto e, no pé, a regra dos 30 dias.
16. **Os três avisos desta versão:**
    - **Pedido de demonstração pelo site** (ícone maleta): vai para todos que veem Interessados (Administração e Implantação). Traz a fala da pessoa, o tamanho e, enquanto ninguém cuida, o selo "Sem responsável" e o prazo prometido. Leva a "Abrir o pedido";
    - **Interessado passado para você** (ícone pessoa com +): quando alguém atribui, troca o responsável ou cadastra à mão com você como responsável. Traz o recado de quem passou. Nunca chega para quem fez a ação (quem clica "Ficar com ele" não recebe aviso);
    - **Próximo passo vencido** (ícone relógio, selo "Vencido"): vai para o responsável pelo interessado (ou para quem faz o passo, se for outra pessoa), uma vez, às 07h00 do dia seguinte ao vencimento (pergunta 7).
17. **Cada aviso diz o que aconteceu, de quem, e leva ao lugar certo.** O aviso inteiro é o link, e abri-lo o marca como lido. O aviso é uma foto do momento ("Ninguém cuida ainda"); a ficha mostra a situação de agora. Quando alguém já ficou com o pedido, o aviso lido diz "Agora com Rafael Teles".
18. **Não lido não depende só de cor**: tem filete vinho, ponto, título em negrito, a palavra "Novo" escrita e "Novo:" para o leitor de tela.
19. **Todos lidos**: aviso de sucesso no painel, os avisos continuam sem o destaque, "Tudo lido" no lugar do botão, o ponto do sino some e o rótulo vira "Avisos, nenhum novo". Só se marcam os avisos mostrados; um que chegue no mesmo instante continua novo.
20. **Vazio** (Luísa Matos, que acabou de entrar na Implantação): diz o que chega ali, com os três tipos.
21. **Erro**: "Tentar de novo", código para o suporte e "nenhum aviso se perde". O ponto continua com a última contagem conhecida.
22. **Quem não vê Interessados** (Financeiro e Suporte): o sino aparece igual, para todos, mas sem ponto, porque nesta versão nada chega para eles. O painel explica: o pedido e o interessado têm dados pessoais de quem pediu, e os avisos do Financeiro e do Suporte estão em estudo. Desenhado sobre a Cobrança aprovada, como a Marta a vê. Se alguém perder o acesso a Interessados, os avisos antigos de interessado somem da lista dela (o servidor filtra pela permissão de agora).

## Textos principais (para revisar)

- **Janela:** "Cadastrar interessado". "Para quem chegou por indicação, evento ou contato direto. O pedido do site entra sozinho e não passa por aqui."
- **Ajuda do e-mail e WhatsApp:** "Preencha pelo menos um dos dois, e-mail ou WhatsApp. É por eles que o T3jus confere se o interessado já existe."
- **Como chegou:** Indicação ("Alguém passou o contato"), Evento ("Feira, palestra, encontro da OAB"), Contato direto ("Ligou, escreveu ou veio falar com a gente").
- **Detalhe:** "Quem indicou, qual evento ou por onde a pessoa falou. Fica na ficha e explica, a qualquer tempo, por que temos este contato."
- **Dados pessoais:** "Legítimo interesse · sem a autorização do site". "Por quê: quem chega por indicação, evento ou contato direto não marcou a caixa de autorização. A base é o legítimo interesse (LGPD, art. 7º, IX), com a origem registrada." "Para quê: apresentar o T3jus e marcar uma demonstração. Nada de propaganda." "Até quando: se não virar cliente, os dados são apagados 12 meses depois do último contato, ou antes, se a pessoa pedir."
- **Dica, quando a pessoa ainda não sabe:** "No primeiro contato, conte à pessoa de onde veio o contato dela e que ela pode pedir para não ser mais procurada." Quando já sabe: "Se a pessoa pedir para não ser mais procurada, encerre como descartado: os dados saem no prazo."
- **Erros:** "Escreva o nome do escritório. Se ainda não tem, use o da pessoa, como “Tomás Lins Advocacia”." · "O WhatsApp tem DDD e 8 ou 9 números, como (86) 99561-2087." · "Escolha como o contato chegou." · "Escreva de onde veio o contato: quem indicou, qual evento ou por onde a pessoa falou." · "Diga se a pessoa sabe que vamos procurá-la. Isso muda o que dizer no primeiro contato." · O e-mail e o WhatsApp vazios juntos: "Preencha o e-mail ou o WhatsApp."
- **Repetido:** "Já existe um interessado com este e-mail. Nada foi cadastrado ainda. Confira se é o mesmo escritório." "“Juntar ao existente” guarda o que você escreveu como nota no Sucupira, conta como novo contato e não cria outro interessado."
- **Falha:** "Não deu para cadastrar agora. A conexão caiu antes de o servidor responder. Nada foi cadastrado, e o que você escreveu continua aqui."
- **Sucesso:** "Aroeira & Lins Advogados entrou em Interessados. Está em Novo, com você como responsável. O próximo passo é fazer o primeiro contato até segunda, 23/11."
- **Sino:** "Pedido de demonstração pelo site: **Jatobá Advocacia Previdenciária**" · "**Rafael Teles** passou para você o interessado **Umbu Advocacia de Família**" · "Próximo passo vencido: **Ligar para saber da proposta**" · pé: "Os avisos ficam aqui por 30 dias. Marcar como lido não apaga nada, e o que o aviso conta continua na ficha do interessado." · vazio: "Nenhum aviso por enquanto. Chega aqui o que pede você no Comercial."

## O que o servidor precisará (sem programar agora)

Os interessados são dado do T3jus, não de escritório: as tabelas são globais, sem `escritorio_id`, e passam por `proteger_tabela_global`, como as da migration 0580. Só as funções do Console leem e escrevem, conferindo a ação da pessoa da sessão (`console.interessados.editar` para cadastrar).

### Tela 1: mudanças em `interessados`

| O quê | Por quê |
|---|---|
| `email` e `whats` passam a aceitar vazio, com `check (email is not null or whats is not null)`. Para o site, a função continua exigindo os dois | Pelo menos um dos dois (pergunta 1) |
| `autorizacao` passa a ser obrigatória só quando `origem = 'SITE'` | Quem é cadastrado à mão não tem aceite |
| Campo novo `base_legal` (`CONSENTIMENTO` no site, `LEGITIMO_INTERESSE` à mão) | Mostrar e exportar a base de cada contato (inventário de dados, PT-11) |
| Campo novo `sabe_do_contato` (boolean, obrigatório quando à mão) | "A pessoa sabe que vamos procurá-la?" |
| Campo novo `cadastrado_por` (pessoa, obrigatório quando à mão) | "Cadastrado à mão por Rafael Teles". O evento `interessado.cadastrado` também guarda isso |
| `origem_detalhe.referencia` (já existe) guarda "De onde veio, em detalhe" | Sem campo novo |
| `chegou_em` recebe a data do contato informada (hoje ou antes; `DATA_NO_FUTURO` se depois) e `ultimo_contato_em` começa nela | O prazo de 12 meses conta do contato |

- **Função nova** `console_interessado_cadastrar(p_pessoa, p_dados, p_forcar boolean default false)`: confere a permissão e os campos (erros por campo, como `recusar_campos`), procura outro interessado com o mesmo e-mail (sem diferenciar maiúsculas) ou o mesmo WhatsApp (só os números) e, se achar e `p_forcar` for falso, devolve `{repetido: {id, nome, escritorio, estagio, responsavel}}` sem gravar. Grava o interessado em `NOVO`, o responsável, o próximo passo e o evento `interessado.cadastrado` (com origem, detalhe e "sabe"), e manda o aviso "passou para você" quando o responsável é outra pessoa. Com `p_forcar`, o evento leva `repetido_de`.
- **Função nova** `console_interessado_juntar(p_pessoa, p_id, p_dados)`: grava a nota com o que foi escrito (com a origem), o evento `contato.repetido` e renova `ultimo_contato_em`.
- **Inventário de dados:** a linha de `interessados` passa a dizer as duas bases (consentimento no site, legítimo interesse à mão). A política de privacidade (F2.4) precisa de um trecho sobre contatos que chegam por indicação ou evento (pergunta 2).

### Tela 2: tabela nova para o sino do Console

O sino do Portal (`avisos_sino`, migration 0390) tem `escritorio_id` obrigatório e é dado do escritório. O do Console precisa de uma tabela global, no mesmo formato:

| Tabela | Campos | Observação |
|---|---|---|
| `avisos_console` | `id`, `pessoa_id` (para quem), `tipo` (`INTERESSADO_NOVO`, `INTERESSADO_ATRIBUIDO`, `INTERESSADO_VENCIDO`; depois, os da pergunta 6), `dados` (jsonb: nomes, trecho, recado, data do passo), `origem_tabela` (`interessados`), `origem_id`, `criado_em`, `lido_em` | Só inserção e a marca de lido (o mesmo guardião do Portal). Sem `escritorio_id`: `proteger_tabela_global`. Índice em `(pessoa_id, criado_em desc)` |

- **Quem gera:** `site_registrar_pedido` (pedido novo, para todas as pessoas com `console.interessados.ver`); `console_interessado_responsavel` e `console_interessado_cadastrar` (atribuído, nunca para quem fez a ação); a rotina diária (`aplicar_prazos`) às 07h00, uma vez por passo vencido.
- **Leitura:** `GET /v1/console/avisos?cursor=` traz os últimos 30 dias, **filtrando pela permissão de agora** (quem perdeu Interessados não vê mais avisos de interessado). A contagem de novos vem com a sessão (`console_sessao`), para o ponto aparecer sem abrir o painel.
- **Marcar:** `POST /v1/console/avisos/:id/lido` (abrir o aviso chama) e `POST /v1/console/avisos/lidos {ate}` (marca até o último aviso mostrado).
- **Moldura:** `Moldura.tsx` ganha o botão do sino no topo e na barra do celular, e o painel, reaproveitando o componente do sino do Portal.
- **Guarda:** os avisos ficam 30 dias no painel e continuam guardados; somem junto com o interessado quando ele é apagado no prazo de 12 meses (`apagar_interessados_vencidos`).

### Para o painel de execução

- A tela 1 atende F2.5 (SC-05). A tela 2 atende F2.6 (SC-02 e SC-05) só para os três avisos de interessado; os outros avisos do Console (pergunta 6) ficam como item "pendente", se a Carol quiser.

## Perguntas para a Carol

### Tela 1: cadastrar à mão

1. **E-mail e WhatsApp: os dois obrigatórios ou pelo menos um?** **Recomendo: pelo menos um.** Quem chega por telefone ou evento muitas vezes deixa só um, e exigir os dois faz a equipe inventar dado ou desistir do cadastro. Pede uma mudança pequena no banco (o site continua pedindo os dois).
2. **A base legal do contato cadastrado à mão pode ser o legítimo interesse, como está?** **Recomendo que sim**, com o que o desenho já registra: de onde veio o contato, quem cadastrou, se a pessoa sabe e a dica do primeiro contato (dizer de onde veio e que ela pode pedir para sair). Recomendo também acrescentar à política de privacidade (F2.4) um trecho sobre contatos que chegam por indicação ou evento, revisado por quem cuida da parte jurídica, antes de a função ir ao ar.
3. **No possível repetido, deixar "cadastrar mesmo assim"?** **Recomendo que sim**, como saída secundária e registrada no histórico, porque dois escritórios podem dividir um e-mail ou um telefone (a secretária de um prédio, por exemplo). A saída principal é "Juntar ao existente", que não perde o que foi escrito.
4. **O cadastrado à mão recebe e-mail automático ("recebemos seu contato")?** **Recomendo que não.** A pessoa não pediu nada pelo site; um e-mail automático de um sistema que ela não conhece parece propaganda. O primeiro contato é pessoal, de quem cadastrou, no prazo do próximo passo.
5. **Pode registrar um contato com data anterior?** **Recomendo que sim, até hoje e nunca depois**, porque o evento pode ter sido na quinta e o cadastro só no sábado. O prazo de 12 meses conta da data do contato, e a hora do cadastro fica separada, no histórico.

### Tela 2: o sino

6. **Quais outros avisos do Console fariam sentido depois?** Não desenhei; são as candidatas, para você escolher:
   - **fatura de escritório em atraso** (Financeiro e Administração), no dia seguinte ao vencimento;
   - **pedido de suporte novo** ou respondido pelo escritório (Suporte);
   - **fim de contrato chegando** (Administração e Implantação), 30 dias antes;
   - **escritório parado na implantação** há mais de 7 dias (Implantação);
   - **sócio que não aceitou o convite** em 3 dias (Implantação).

   **Recomendo começar pelos dois primeiros**, para que o Financeiro e o Suporte também tenham o sino com uso, e deixar os outros para quando a carteira crescer.
7. **O próximo passo vencido avisa uma vez ou todo dia?** **Recomendo uma vez**, na manhã seguinte ao vencimento. Depois disso, o vencido continua em destaque na lista e no contador de Comercial, sem encher o sino.
8. **O pedido novo do site avisa todos que veem Interessados ou uma pessoa só?** **Recomendo todos (Administração e Implantação)** nesta versão, porque são poucas pessoas e o site promete resposta em 1 dia útil. Quando alguém fica com o pedido, o aviso dos outros continua, mas a ficha já mostra quem cuida. Uma "pessoa de plantão" só faz sentido com uma equipe comercial maior.
9. **O aviso também vai por e-mail?** **Recomendo só no sino nesta versão**, como no Portal. A exceção que vale pensar é o pedido novo do site num fim de semana (como hoje, sábado): se você quiser, um e-mail para a Administração entra junto com o envio de e-mails do Console.
