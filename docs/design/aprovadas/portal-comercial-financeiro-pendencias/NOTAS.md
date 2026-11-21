# Portal: pendências do Comercial e do Financeiro · notas

> **Aprovado pela Carol em 21/11/2026, às 13h01 (Bahia).** Ela respondeu "aprovado" sem mudar nada, e as 12 perguntas do fim seguem a recomendação. Antes, às 12h11, ela trocou o funil de trapézios pela opção B, "três números e uma barra" (as três opções que ela comparou ficam em `funil-opcoes.html`).

Seis acréscimos em telas já aprovadas, para a Carol aprovar antes do código. Cada um atende um item do painel que esperava desenho:

- **1. Por que não recebeu proposta** (item F3.8, ideia AP-03). O banco já guarda o motivo (`clientes.funil_motivo` e `funil_encerrado_em`) e o Funil já conta "o escritório não pegou o caso" e "não voltou". Falta onde marcar e como desfazer.
- **2. Quem cuida do repasse** (item F3.71, ideias PD-06 e PD-07). A rota que troca o responsável já existe. Falta a tela: quem pode ser escolhido, o motivo, o aviso e o histórico.
- **3. Prazo e atraso do repasse** (item F3.46, ideia FI-05). Hoje o prazo é fixo em 3 dias úteis. Falta ajustar o prazo e anotar o motivo do atraso, com a próxima ação.
- **4. RPV e precatório a caminho** (itens F3.48 e F3.72, ideias FI-09 e IN-05). Registrar o requisitório expedido antes de o dinheiro entrar, levar a parte do escritório à previsão do Caixa e ao Falta receber dos Relatórios, e virar levantamento quando entra.
- **5. Contador e saldo de abertura** (item F3.50, ideias FI-21 e FI-09). Onde cadastrar o contador e o saldo de abertura do caixa, a exportação por e-mail e os comprovantes num .zip.
- **6. Meta do mês** (item F3.49, ideia IN-09). A meta de receita, de todo mês ou de um mês só, comparada no Resumo do Financeiro.

Pesam também PA-01 (cada pessoa só vê o que pode abrir), PT-03 (nada é apagado), PT-09 (dinheiro em centavos) e PT-10 (WCAG 2.2 AA, celular, vazio e erros).

A base é o Portal v1 aprovado: a moldura, a barra de baixo no celular (Início, Conversas, Agenda, Mais), o CSS e as peças, pelo `comum.py` sem mudança. As telas de partida são as aprovadas de `portal-comercial-contratos` (Funil e Atendimentos), `portal-clientes` (ficha), `portal-financeiro` (Repasses, Caixa, Resumo, exportação), `portal-relatorios` (Visão geral do sócio) e `portal-inicio-areas` (Escritório). O elenco e o "hoje" são os de sempre: Ribeiro & Matos, Marina Ribeiro como sócia dona, quarta-feira, 18/11/2026, às 10h12. Entram com elas Bianca Torres (Contratos e Financeiro), Diego Almeida (Comercial e Financeiro) e Larissa (só Jurídico), para ver as permissões. As peças novas têm prefixo `pd-` (comuns), `fu-` (funil), `rp-` (responsável), `pz-` (prazo e atraso), `rv-` (RPV a caminho), `ct-` (contador), `mt-` (meta) e `es-` (Escritório).

## Como abrir

- `index.html` mostra os 54 estados em computador (1440) e celular (412), com legenda, em seis seções. Clique numa imagem para abrir o HTML naquele estado.
- `index-publicar.html` é a mesma página com as capturas de computador embutidas (4,5 MB), para publicar. As de celular e os HTML ficam nesta pasta.
- Cinco HTML abrem sozinhos, com o CSS e os ícones embutidos. O estado vem do endereço:
  - `comercial.html?estado=fu-funil` (e `fu-marcar`, `fu-erros`, `fu-falha`, `fu-marcado`, `fu-voltar`, `fu-vazio`, `fu-atendimentos`);
  - `clientes.html?estado=fu-ficha-aberta` (e `fu-ficha-marcar`, `fu-ficha`, `fu-ficha-larissa`);
  - `financeiro.html?estado=rp-ficha` (e os estados `rp-`, `pz-`, `rv-`, `mt-`, `ct-` e `fi-sem-area`);
  - `escritorio.html?estado=es-ajustes` (e os estados `es-`);
  - `relatorios.html?estado=re-visao`.
  Os estados aprovados continuam nos mesmos arquivos, para comparar.
- `funil-opcoes.html` guarda as três opções do bloco "Quanto vira contrato" que a Carol comparou em 21/11 (a B foi a escolhida), com as capturas `funil-opcao-a/b/c-*.webp`, o `funil-opcoes-publicar.html` e a conferência em `_conferencia-funil.json`. `sh _fonte/gerar-funil.sh <pasta>` refaz essas opções.
- Abaixo de 760 px, o HTML vira a versão de celular. Funcionam abrir e fechar as janelas (pelo botão, pelo X e pelo Esc) e os links entre os estados. O resto é desenho.
- A pasta `_fonte/` guarda os scripts, e `sh _fonte/gerar.sh <pasta>` refaz tudo:
  - `comum.py`, `financeiro.py`, `webp.py`, `comercial.py`, `pecas.py`, `clientes.py`, `relatorios.py` e `dados.py` são cópias sem mudança das aprovadas. Os scripts novos as importam e acrescentam os estados;
  - `pend.py` tem as peças comuns (erros, falha, rádios, aviso com desfazer);
  - `comercial_pend.py`, `financeiro_pend.py`, `escritorio_pend.py` e `relatorios_pend.py` geram os HTML. A ordem do `gerar.sh` importa: `escritorio_pend.py` importa `financeiro.py`, que reescreve `financeiro.html`, e por isso roda antes;
  - `casos.py` gera a lista de estados, o `index.html` e o `index-publicar.html`; `fotos.cjs` (o mesmo de `portal-pendencias-pequenas`) faz as capturas e as conferências; `webp.py` converte para WebP.
- Todos os dados são fictícios.

## Decisões de design: 1. Por que não recebeu proposta (Comercial)

1. **Dois motivos só, os mesmos que o Funil já conta:** "O escritório não pegou o caso" (fora da área, sem viabilidade, conflito, falta de agenda) e "O cliente não voltou" (atendido e sem retorno). Uma anotação opcional diz o resto. Mais motivos espalhariam o número sem mudar o que se faz (pergunta 1).
2. **O botão "Encerrar sem proposta" fica onde a pessoa já olha:** em cada cartão da coluna "Primeiro contato" do Funil (estado `fu-funil`), no grupo aprovado "Sem próximo contato" de Atendimentos (`fu-atendimentos`) e numa folha nova da ficha do cliente, "No funil do Comercial" (`fu-ficha-aberta`). No quadro "Quanto vira contrato", a linha "ainda em atendimento, sem motivo" ganha o link "marcar o motivo", que desce até os cartões.
3. **A janela diz o que muda** (`fu-marcar`): o cliente sai de "Primeiro contato" e passa a contar no motivo; a ficha continua ativa e ele pode voltar. Nada mais muda: nenhum contrato, nenhuma mensagem ao cliente.
4. **Marcado** (`fu-marcado`): aviso com "Desfazer" por alguns segundos; na barra e na legenda do quadro, as saídas passam de 5/3/2 para 5/4/1; Eduardo sai da coluna e entra no alto da folha nova **"Saíram sem proposta"**, com o motivo, quem marcou, quando e a anotação. A folha mostra os mais recentes e "Mostrar os outros N".
5. **Voltar ao funil** (`fu-voltar`): uma janela curta, sem campo obrigatório. Ele volta a "Primeiro contato"; o motivo de antes fica no histórico de atendimento. Nada é apagado (PT-03).
6. **Na ficha** (`fu-ficha`), a situação vem em âmbar claro com texto tinta: "Fora do funil: não voltou", com quem marcou e quando. A marcação entra no histórico de atendimento, como uma linha da equipe.
7. **Quem não tem Comercial** (Larissa, `fu-ficha-larissa`) vê a ficha aprovada sem o histórico de atendimento, sem a folha e sem o botão.
8. **Rascunho de proposta não impede encerrar.** Marcos tem uma proposta em rascunho, que nunca foi enviada; ele ainda conta como "não recebeu proposta". Ao encerrar, o rascunho fica guardado, sem envio (pergunta 2).
9. **Erros:** sem motivo escolhido (`fu-erros`), resumo no topo e o erro preso ao grupo; falha do servidor (`fu-falha`), nada salvo, o que se escolheu continua, código COM-7B30-1811.

10. **Funil em três números e uma barra (escolha da Carol em 21/11, 12h11, Bahia), no lugar dos trapézios aprovados antes.** Das três opções de `funil-opcoes.html`, a Carol escolheu a B. O bloco "Quanto vira contrato" passa a ser:
    - uma linha com os três números em Alegreya (24 primeiros contatos, 14 receberam proposta, 9 viraram contrato), separados por setas finas com a taxa (58% e 64%);
    - embaixo, "Onde os 24 pararam": uma barra só, dividida em quem virou contrato (vinho), está com proposta em andamento (vinho-4), fechou com outro escritório (contorno), e quem saiu sem proposta: o escritório não pegou (âmbar), o cliente não voltou (âmbar-2) e ainda em atendimento (tracejado). Sob a barra, os dois grupos: "receberam proposta · 14" e "sem proposta · 10";
    - a legenda em dois grupos, com cada número escrito, e "marcar o motivo" sob "ainda em atendimento".

    Âmbar entra só como cor de barra e de marca, nunca como texto. A barra tem `role="img"` com a frase completa, e a legenda diz tudo em texto. Os números seguem o estado: depois de marcar Eduardo, 5/4/1; sem ninguém fora do funil (`fu-vazio`), 14 → 14 → 9, a barra só com quem recebeu proposta e "Ninguém no período" em "Saíram sem proposta". O estado aprovado `funil`, que fica em `comercial.html` para comparar, também troca de forma. As três opções e as capturas delas continuam na pasta (`funil-opcoes.html`, `funil-opcao-*.webp`).

## Decisões de design: 2. Quem cuida do repasse

1. **A folha "Quem cuida deste repasse"** fica na ficha do repasse (`rp-ficha`), logo abaixo das partes. Mostra quem cuida, de onde veio ("Era de Marina Ribeiro, a responsável pelo contrato de Irene") e a última troca. O nome também aparece no cabeçalho da ficha e em cada bloco da lista de Repasses ("Cuida: Bianca").
2. **O padrão é o responsável pelo contrato**, como já faz o servidor. Trocar vale para o repasse inteiro (todas as partes do levantamento), não para cada parte (pergunta 3).
3. **Só aparece quem tem a área Financeiro** (`rp-trocar`): Marina, Bianca ("responsável agora") e Diego. Quem não tem Financeiro não pode transferir dinheiro, então não pode cuidar do repasse (pergunta 4).
4. **Motivo opcional**, que vai para o histórico e para o aviso a quem entra. A janela diz que quem entra passa a receber os avisos do sino sobre este repasse, e quem sai deixa de receber.
5. **Trocado** (`rp-trocado`): aviso de sucesso, cabeçalho e folha atualizados, e a linha nova no histórico do repasse ("Marina Ribeiro passou para Diego Almeida · motivo").
6. **Erros:** Diego perdeu a área Financeiro enquanto a janela estava aberta (`rp-trocar-erro`), resumo e erro preso ao grupo, com o porquê; falha do servidor (`rp-trocar-falha`), Bianca continua, código FIN-3C82-1811.
7. **Na lista de Repasses**, um filtro novo "Todos · Os meus · Bianca" (chips), para cada pessoa achar o que é dela.

## Decisões de design: 3. Prazo e atraso do repasse

1. **O prazo é do escritório, não de cada repasse.** Fica em Escritório › Ajustes do financeiro, em dias úteis, de 1 a 30 (padrão 3). Mudar vale para o que entrar dali em diante; o prazo de cada parte é gravado quando o levantamento entra e não muda depois, como hoje (pergunta 5).
2. **Atrasado é estado, não alarme.** Passou do prazo, a parte fica "Atrasado · era 17/11" em vinho-3, até ser feita. Na lista de Repasses entra o número "Atrasados" (R$ 6.400,00) ao lado dos aprovados.
3. **Anotar o atraso** (`pz-anotar`), como a cobrança das parcelas: o motivo (esperando um documento, quem recebe não respondeu, esperando uma decisão, outro) e a **próxima ação**, com quando, com quem e o que fazer. A janela diz que o prazo não muda e que o sino lembra quem cuida no dia da próxima ação.
4. **Anotado** (`pz-anotado`): a linha mostra o motivo e a próxima ação, com "Mudar a anotação"; cada anotação fica no histórico. Gabriela mostra o atraso já anotado; o perito de Irene, o atraso sem motivo ("Sem motivo anotado").
5. **Bianca** (`pz-ficha`) vê a mesma ficha, porque cuida do repasse.
6. **Erros:** data da próxima ação antes de hoje e "O que fazer" em branco (`pz-anotar-erros`); falha do servidor (`pz-anotar-falha`), código FIN-5A10-1811.

## Decisões de design: 4. RPV e precatório a caminho

1. **Uma folha nova em Repasses, "A caminho"** (`rv-caminho`), abaixo dos repasses, e o botão "Registrar RPV expedido" no alto da página. Cada linha: tipo, cliente, tribunal e quem paga, valor requisitado, a parte do escritório e a data estimada, com "Mudar a data" e "Entrou na conta".
2. **Registrar o expedido** (`rv-registrar`): tipo (RPV ou precatório, com a regra de prazo em uma frase), caso, tribunal, quem paga, número, valor requisitado, data da expedição e data estimada. A data estimada vem sugerida pelo tipo (RPV: 2 meses; precatório: fim do ano seguinte, se apresentado até 2 de abril) e pode ser mudada. **A parte do escritório sai do contrato** (20% de êxito da Construtora Vale Alto: R$ 3.680,00), e a janela diz onde ela entra.
3. **No Caixa** (`rv-caixa`), a parte do escritório entra na previsão em âmbar, no mês estimado, com a legenda "RPV e precatório a caminho". Âmbar é só fundo de barra e de selo, com texto tinta, nunca texto.
4. **Passou da data estimada** (Irene, outubro), a requisição **sai da previsão do Caixa** e fica marcada em "A caminho" e nos Relatórios ("Passou da data estimada"), até alguém mudar a data ou registrar que entrou. Prever dinheiro que já atrasou engana mais do que ajuda (pergunta 6).
5. **Mudar a data** (`rv-data`): "Ainda vai entrar" com a nova data, ou "Não vai entrar" (por exemplo, cancelada), que tira da previsão. Motivo obrigatório; a data anterior fica no histórico.
6. **Entrou na conta** (`rv-entrou`): abre a janela aprovada de registrar o levantamento, já preenchida pelo RPV: o valor que entrou (corrigido, pode ser maior que o requisitado), a divisão do contrato e o aviso de que ele sai de "A caminho" e da previsão. Daí em diante é um repasse como os outros.
7. **Relatórios do sócio** (`re-visao`): o "Falta receber · à parte" aprovado passa a ter dois grupos, "Já entrou, falta transferir ao escritório" (Benedito) e "A caminho, com data estimada" (Eduardo, Irene marcada, Hélio), com a soma das duas partes. Continua fora da soma de cima.
8. **Vazio** (`rv-vazio`): a folha explica para que serve e oferece "Registrar expedido".
9. **Erros:** valor em branco e data estimada antes da expedição (`rv-registrar-erros`), com a parte do escritório em "—"; falha (`rv-registrar-falha`), a previsão do Caixa não mudou, código FIN-8E41-1811.

## Decisões de design: 5. Contador e saldo de abertura

1. **Uma seção nova em Escritório, "Ajustes do financeiro"** (`es-ajustes`), ao lado de Dados do escritório, WhatsApp e IA e Recebimento. Junta quatro coisas que valem para o escritório inteiro: o contador, o saldo de abertura, o prazo para repassar e a meta (esta só como resumo, com o caminho para o Resumo). Ao lado, "Onde isso aparece" e o histórico das mudanças.
2. **Contador:** nome, escritório de contabilidade (opcional), e-mail, telefone (opcional), "Mandar ao contador quando eu exportar o mês" e "Me lembrar no dia 5 de exportar o mês anterior". **O T3jus não manda sozinho**: quem exporta confere e manda (pergunta 7).
3. **Saldo de abertura:** a data e o saldo do caixa do escritório nesse dia (R$ 12.480,00 em 31/08/2026). O saldo do Caixa passa a começar dele. **Corrigir** (`es-abertura`) pede o valor certo e um motivo, e a janela diz quanto muda o saldo de hoje (de R$ 40.310,00 para R$ 41.010,00) e que as exportações já enviadas não mudam. A versão anterior fica no histórico.
4. **Só o dinheiro do escritório** entra no saldo de abertura. Dinheiro de cliente que já estava na conta entra como levantamento em Repasses (pergunta 8).
5. **No Caixa** (`ct-caixa`), o campo do saldo diz "Começa no saldo de abertura de 31/08/2026, R$ 12.480,00" com o caminho para Escritório. Sem saldo de abertura (`ct-sem-abertura`), o campo avisa que começa em R$ 0,00 e oferece lançar.
6. **Exportar** (`ct-exportar`): a janela aprovada ganha os comprovantes num .zip, o saldo do começo e do fim do mês e "Mandar por e-mail a Paulo Serra". A planilha vai anexada; o .zip vai por link que vale 30 dias (pergunta 9). Uma folha "Para o contador" no Caixa mostra os envios (entregue, quando, por quem) e o próximo lembrete.
7. **O e-mail não saiu** (`ct-exportar-falha`) é falha parcial: o arquivo foi gerado e baixado, só o envio falhou. "Mandar de novo" e o código FIN-2B95-1811.
8. **Sem contador** (`ct-sem-contador`): a exportação só baixa, e a janela leva a cadastrar.
9. **Quem pode:** só a sócia dona muda os ajustes; quem tem Financeiro vê (`es-equipe`, Bianca), com o aviso de quem muda. Quem não tem Financeiro (`es-sem-area`, Larissa) não vê a seção.
10. **Erros:** e-mail incompleto e prazo zero (`es-erros`); falha (`es-falha`), código ESC-4F63-1811. Salvo (`es-salvo`): aviso e linha no histórico.

## Decisões de design: 6. Meta do mês

1. **A meta fica no Resumo do Financeiro**, na folha aprovada "Previsto e realizado", que sobe para o alto da coluna (`mt-resumo`): "Meta de novembro: R$ 50.000,00", a barra com o recebido, o previsto e um traço da meta, e quanto falta. A meta é de receita do escritório (honorários e entradas do escritório), a mesma conta do "realizado".
2. **Comparação com os meses anteriores**, a aprovada, ganha o traço da meta em cada mês e "bateu" ou a porcentagem. Mês sem meta (agosto) diz "sem meta".
3. **Mudar a meta** (`mt-definir`): valor e "Vale para": "Todo mês, a partir de novembro" ou "Só em um mês" (`mt-um-mes`, dezembro, R$ 40.000,00 pelo recesso). Para ajudar, a média dos 3 meses e o previsto. A meta de um mês só vence a de todo mês naquele mês.
4. **Meses fechados não mudam.** A meta nova vale do mês atual em diante; setembro e outubro continuam comparados com R$ 45.000,00. O histórico guarda cada versão (pergunta 10).
5. **Só a sócia dona define** (pergunta 11). Quem tem Financeiro vê a meta e a comparação, sem botão (`mt-equipe`, Bianca: "Definida por Marina Ribeiro, a sócia dona"). Sem Financeiro (`fi-sem-area`, Larissa), o menu não mostra a área e o link direto explica.
6. **Sem meta** (`mt-sem-meta`): uma faixa tracejada diz o que a meta faz e oferece "Definir a meta". O resto do Resumo fica como o aprovado.
7. **Erros:** valor zero e mês já fechado (`mt-erros`); falha (`mt-falha`), novembro continua com a meta de antes, código FIN-6D27-1811.

## Acessibilidade (WCAG 2.2 AA)

- **Conferência automática** em 108 capturas (54 estados × computador e celular), feita pelo `fotos.cjs`. O resultado fica em `_conferencia.json`:
  - o axe (WCAG 2.0, 2.1 e 2.2, A e AA) não achou nenhuma violação;
  - nenhuma tela tem rolagem lateral;
  - nenhum erro de script;
  - botões e campos têm 44 px ou mais. Ficam com 24 px, dentro do AA (2.5.8): a palavra-marca "T3jus" no trilho, da moldura aprovada; e os nomes nos cartões do Funil, que já eram assim no Funil aprovado. O link "marcar o motivo" fica dentro de um parágrafo e tem 24 px de altura.
- **Janelas:** `<dialog>` com rótulo e descrição; rádios em `fieldset` com `legend`; ajuda e erro ligados ao campo por `aria-describedby`. O resumo no topo diz quantos pontos faltam acertar; cada erro vem preso ao seu campo, e o foco vai ao primeiro. A falha do servidor usa `role="alert"`. O botão principal nunca fica desabilitado.
- **Estado não depende só de cor:** "Atrasado · era 17/11", "Passou da data estimada", "Fora do funil", "Responsável agora" e "Novo" vêm escritos. Na previsão do Caixa, o RPV em âmbar tem legenda em texto; no Resumo, a meta é dita em número além do traço.
- **Avisos com desfazer** usam `role="status"`; o "Desfazer" é um botão de 44 px.
- **Contraste:** só entram pares do D2 e do Gabinete. Âmbar (`#E9AE90`, `#F2CDB3`) é só fundo com texto tinta (8,6:1 e 11,2:1), nunca texto e nunca fundo de texto branco. O texto suave `#6E5562` passa de 5,5:1 nos fundos claros.

## O que muda no servidor

As tabelas novas têm `escritorio_id` e passam por `proteger_tabela_escritorio`. O escritório vem da sessão, nunca do navegador. Nada se apaga: o que muda guarda a versão anterior ou vira linha de histórico. Dinheiro em centavos. As migrações ficam na faixa 0550 a 0569.

### 1. Por que não recebeu proposta (0550)

- **O funil já programado no Comercial também troca de forma.** A tela real do Funil desenha hoje os trapézios aprovados antes. Ela passa a desenhar os três números e a barra, com as mesmas contagens que a rota do Funil já devolve (primeiros contatos, propostas, contratos, em andamento, fechou com outro, não pegou, não voltou, ainda em atendimento). A rota não muda; muda só a tela.
- **Nenhuma tabela nova.** Os campos `clientes.funil_motivo` e `funil_encerrado_em` (0190) bastam; entra `funil_encerrado_por` (pessoa) e `funil_nota` (texto, opcional).
- **Rotas novas:** `PUT /v1/escritorio/comercial/clientes/:id/funil` com `{ motivo: NAO_PEGOU | NAO_VOLTOU, nota? }` e `DELETE` (ou `PUT` com `motivo: null`) para voltar ao funil. Exigem a área COMERCIAL. Recusam cliente com proposta enviada ou contrato (já saiu de "Primeiro contato").
- **Histórico:** `historico` com `comercial.funil_encerrado` e `comercial.funil_reaberto`, com o motivo e a nota; a ficha mostra como linha de atendimento.
- **Leitura:** a lista "Saíram sem proposta" (paginada, mais recentes primeiro) e a situação do funil na ficha.

### 2. Quem cuida do repasse (0551)

- A rota `PUT /v1/escritorio/financeiro/repasses/:id/responsavel` já existe. Muda:
  - recusa pessoa sem a área FINANCEIRO (hoje confere só `pessoa_do_escritorio`), com o erro que a tela mostra;
  - aceita `motivo` opcional, gravado no `historico` 'financeiro.repasse_responsavel' com quem era e quem passa a ser;
  - avisa no sino quem entra (e quem sai, sem som).
- A lista de Repasses aceita filtro por responsável (`?responsavel=eu|<id>`).

### 3. Prazo e atraso (0552, 0553)

- **`escritorios.prazo_repasse_dias_uteis`** (inteiro, 1 a 30, padrão 3). `prazo_repasse_dias()` passa a ler dele. O prazo de cada destinação continua gravado na criação e imutável (o guardião não muda).
- **Feriados:** `somar_dias_uteis` hoje ignora feriados (20/11 é nacional). Recomendo contar os feriados nacionais (pergunta 12).
- **Tabela nova `repasse_atraso_anotacoes`:** `escritorio_id`, `destinacao_id`, `motivo` (DOCUMENTO, SEM_RESPOSTA, DECISAO, OUTRO), `texto`, `proxima_acao_em` (data), `proxima_acao_com`, `proxima_acao_o_que`, `criado_por`, `criado_em`. Só se acrescenta; a última é a que vale. `proteger_tabela_escritorio`.
- **Sino:** lembrete a quem cuida no dia da próxima ação; atrasado sem anotação entra no aviso diário de quem cuida.
- **Rotas:** `POST /v1/escritorio/financeiro/destinacoes/:id/atraso` (FINANCEIRO e financeiro.editar).

### 4. RPV e precatório a caminho (0554, 0555)

- **Tabela nova `requisicoes_a_caminho`:** `escritorio_id`, `contrato_id`, `cliente_id`, `tipo` (RPV, PRECATORIO), `tribunal`, `devedor`, `numero`, `valor_requisitado` (centavos), `parte_escritorio` (centavos, calculada do contrato na hora e guardada), `expedido_em`, `estimada_mes` (primeiro dia do mês), `situacao` (A_CAMINHO, ENTROU, NAO_VAI_ENTRAR), `levantamento_id` (quando entra), `criado_por`, `criado_em`. `proteger_tabela_escritorio`.
- **Histórico de datas:** `requisicao_datas` (ou `historico`), com a data anterior, a nova, o motivo, quem e quando.
- **Rotas:** criar, mudar a data (motivo obrigatório), "não vai entrar" e "entrou" (que cria o levantamento pela rota aprovada e liga `levantamento_id` na mesma transação).
- **Previsão do Caixa:** soma `parte_escritorio` das A_CAMINHO com `estimada_mes` de hoje em diante, numa série separada (âmbar). As que passaram da data ficam fora e vêm numa lista à parte.
- **Relatórios:** "Falta receber · à parte" passa a trazer os dois grupos (já entrou e a caminho).

### 5. Contador e saldo de abertura (0556, 0557, 0558)

- **Tabela nova `contadores`** (um por escritório): `escritorio_id`, `nome`, `firma`, `email`, `telefone`, `mandar_ao_exportar`, `lembrar_dia_5`, `atualizado_por`, `atualizado_em`, com versão anterior no `historico`. `proteger_tabela_escritorio`.
- **Tabela nova `saldos_abertura`:** `escritorio_id`, `data`, `valor` (centavos, pode ser negativo), `motivo`, `criado_por`, `criado_em`, `substituido_em`. Corrigir cria linha nova e marca a anterior; nunca apaga. O saldo do Caixa passa a ser saldo de abertura + entradas − saídas desde a data.
- **Exportação:** `exportacoes_contador` (0290) ganha `zip_caminho`, `zip_expira_em`, `enviado_para`, `envio_situacao` (ENVIADO, ENTREGUE, FALHOU) e `saldo_inicio`/`saldo_fim`. O .zip junta os anexos (F3.22) dos lançamentos do mês. O e-mail sai pelo Resend, de T3jus <nao-responda@t3jus.pro>, com responder-para o e-mail do escritório; o link do .zip é assinado e vale 30 dias.
- **Lembrete do dia 5:** no sino de quem pode exportar o mês ao contador, se o mês anterior não foi exportado.
- **Permissão:** mudar os ajustes só a sócia dona; ver, quem tem FINANCEIRO.

### 6. Meta do mês (0559)

- **Tabela nova `metas_receita`:** `escritorio_id`, `valor` (centavos), `de_mes` (primeiro dia do mês), `so_mes` (booleano), `criado_por`, `criado_em`, `substituida_em`. A meta de um mês é a `so_mes` daquele mês, se houver; senão, a de todo mês mais recente com `de_mes` até ele. `proteger_tabela_escritorio`.
- **Regras:** recusa valor ≤ 0 e mês já fechado; só a sócia dona grava.
- **Leitura:** o Resumo traz a meta do mês e a de cada mês da comparação.

### Para o painel

- 1 atende F3.8 (AP-03). A troca de forma do Funil já programado vai na mesma entrega.
- 2 atende F3.71 (PD-06, PD-07).
- 3 atende F3.46 (FI-05). Se a Carol pedir prazo por repasse (pergunta 5), vira item "pendente" de FI-05.
- 4 atende F3.48 (FI-09) e F3.72 (IN-05).
- 5 atende F3.50 (FI-21, FI-09). O envio automático no dia 5, se pedido (pergunta 7), vira item "pendente" de FI-21.
- 6 atende F3.49 (IN-09).

## Perguntas para a Carol

### 1. Por que não recebeu proposta

1. **Dois motivos bastam, ou o escritório quer escolher entre mais (fora da área, sem viabilidade, conflito, preço)?** **Recomendo dois**, os que o Funil já conta, com a anotação livre. Mais motivos mudam o banco e o Funil e dividem números pequenos.
2. **Quem tem proposta em rascunho (nunca enviada) pode ser encerrado sem proposta?** **Recomendo que sim.** Para o cliente, ele não recebeu proposta. O rascunho fica guardado.

### 2. Quem cuida do repasse

3. **A troca vale para o repasse inteiro ou para cada parte?** **Recomendo o repasse inteiro**, como o servidor já faz. Uma pessoa responde por tudo que saiu daquele dinheiro.
4. **Só quem tem a área Financeiro pode cuidar do repasse?** **Recomendo que sim.** Quem cuida faz a transferência e anota o atraso; sem a área, não abre a tela.

### 3. Prazo e atraso

5. **O prazo pode mudar em um repasse só (por exemplo, esperando nota fiscal)?** **Recomendo que não.** O prazo é do escritório; o caso especial se resolve anotando o atraso com a próxima ação. Assim "atrasado" quer dizer sempre a mesma coisa.

### 4. RPV e precatório

6. **RPV que passou da data estimada continua na previsão do Caixa?** **Recomendo tirar da previsão**, marcado em "A caminho" e nos Relatórios, até alguém mudar a data. Previsão com dinheiro atrasado engana.

### 5. Contador e saldo de abertura

7. **O T3jus manda o mês ao contador sozinho, todo dia 5?** **Recomendo que não, nesta versão:** quem exporta confere e manda, e o T3jus lembra no dia 5. Mandar sozinho um mês com lançamento errado é pior que mandar um dia depois.
8. **O saldo de abertura inclui dinheiro de cliente que estava na conta?** **Recomendo que não:** só o do escritório. Dinheiro de cliente entra como levantamento em Repasses, para ter quem recebe e prazo.
9. **Os comprovantes vão como anexo ou como link?** **Recomendo a planilha anexada e o .zip por link de 30 dias.** Anexos grandes voltam do e-mail do contador; o link pode ser gerado de novo pelo histórico.

### 6. Meta do mês

10. **Mudar a meta muda os meses que já fecharam?** **Recomendo que não.** Cada mês é comparado com a meta que valia nele; a mudança vale do mês atual em diante.
11. **Quem define a meta?** **Recomendo só a sócia dona**, como os outros ajustes do financeiro. Quem tem Financeiro vê.

### Também do servidor

12. **O prazo de repasse em dias úteis conta os feriados nacionais (20/11, 25/12)?** **Recomendo que sim, os nacionais.** Hoje o servidor não conta, e um levantamento de 19/11 venceria um dia antes do que o advogado espera. Municipais e estaduais ficam para depois.
