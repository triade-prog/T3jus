# Portal: Comercial e Contratos · notas

> **Aprovado pela Carol em 19/11/2026, às 0h36 (Brasília).** Ela já tinha pedido 4 ajustes, todos aplicados antes da aprovação: o tipo "Outro" na Agenda, "Mensagens" no lugar de "Caixa" em Conversas, o funil redesenhado e mais de um tipo de honorário no contrato e na proposta. À 1h01 ela confirmou que as perguntas do fim seguem a recomendação ("pode seguir"): valem como decisões.

As áreas Comercial e Contratos do Portal do advogado, para a Carol aprovar antes de virar código. É a primeira rodada destas áreas: mostra a estrutura, a tela principal de cada seção, as fichas e os formulários, e só os estados que mudam decisão (primeiro uso, um erro de formulário e o acesso parcial). Elas atendem:

- **Comercial:**
  - AP-02: histórico de atendimento, visto pelo escritório inteiro (o registro continua na ficha do cliente);
  - AP-03: funil simples de atendimentos e propostas;
  - AP-04: origem dos contatos;
  - AP-05: propostas com situação e responsável;
  - AP-06: acompanhamento e próximo contato;
  - IN-01: conversão de atendimentos e propostas em contratos;
  - PD-02: propostas e atendimentos que precisam de retorno;
  - VA-07 (a validar): regras da OAB sobre publicidade no atendimento e no funil.
- **Contratos:**
  - CH-01: contrato ligado ao cliente;
  - CH-02 e CH-06: condições de honorário, com vários tipos no mesmo contrato (fixo, parcelado, mensal, êxito em percentual, sucumbência, por ato ou consulta e percentual recorrente sobre base que muda todo mês, com lembrete para pedir a base);
  - CH-03: responsáveis pelo contrato;
  - CH-04: programação dos recebimentos, a mesma que o Financeiro vê;
  - CH-05: contrato ligado aos casos;
  - CH-07: uma etapa do caso gera a cobrança e avisa o Financeiro;
  - CH-08 (a validar): procuração, contrato e declaração de hipossuficiência gerados com os dados do cliente e dos advogados (OAB), no timbrado, em arquivo editável;
  - CH-09 (a validar): assinatura eletrônica, só com lugar reservado.

Pesam também PA-01 e PA-02 (áreas liberadas pela sócia dona), PT-03 (nada é apagado), PT-09 (dinheiro exato), PT-10 (WCAG 2.2 AA, celular, estados), PT-11 (finalidade por campo), PT-25 (lista, ficha, criar e editar no mesmo padrão) e EX-10 (ninguém fica sem dono). EX-01, EX-07 e EX-12 aparecem como dependência: casos e etapas vêm do Jurídico, e a OAB vem da Equipe.

As telas partem do Portal v1 e de Clientes, ambos aprovados: moldura, barra de seções da área, barra de baixo no celular, CSS e peças. O `comum.py` é a cópia sem mudança. O cabeçalho das fichas é o da ficha aprovada do Console. As peças novas têm os prefixos `hn-` (comuns às duas áreas, como as condições de honorário), `cm-` (Comercial) e `ct-` (Contratos).

## Como abrir

- `index.html` mostra os 26 estados em computador (1440) e celular (412), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- `comercial.html` e `contratos.html` abrem sozinhos, com as fontes, o CSS e os ícones embutidos. O `index.html` usa o Google Fonts.
- O estado vem do endereço, por exemplo `comercial.html?estado=proposta`, `contratos.html?estado=novo` ou `contratos.html?estado=novo-erros`. No celular, `&mais=1` abre a folha Mais.
- A barra de seções de cada área leva às outras seções. Os links "Abrir a ficha" levam à ficha aprovada de Clientes (`../portal-clientes/clientes.html`).
- Abaixo de 760 px, o HTML vira a versão de celular. Funcionam os botões que abrem e fecham janelas, o Esc e o Mais. O resto é desenho.
- A pasta `_fonte/` guarda os scripts, e `sh _fonte/gerar.sh` refaz tudo:
  - `comum.py`: cópia sem mudança do Portal v1;
  - `pecas.py`: peças das duas áreas (campos, dinheiro em centavos, condições de honorário, tabela que vira cartões, montagem da página);
  - `comercial.py` e `contratos.py`: geram os HTML;
  - `casos.py`: gera a lista de estados e o `index.html`;
  - `fotos.cjs`: faz as capturas com deviceScaleFactor 2 e roda as conferências;
  - `webp.py`: converte as capturas para WebP.
- Todos os dados são fictícios, com o mesmo elenco de Clientes. As OAB são inventadas, os CPFs têm dígitos válidos e os números de processo seguem só o formato.

## Decisões de design

### Comercial

1. **Atendimentos é a visão do escritório inteiro, não um segundo lugar de registro.**
   - A pergunta da tela é "quem precisa de retorno". Ela mostra quatro números (vencidos, hoje, próximos 7 dias, sem próximo contato) e a lista agrupada nessa ordem.
   - Cada linha tem a data no Disco (vinho 3 para vencido, âmbar para hoje), o cliente, o que fazer, o responsável e o último atendimento.
   - O botão é "Abrir a ficha", que leva à aba Atendimentos da ficha aprovada. Registrar, ver o histórico e mudar o próximo contato acontecem lá. Assim o registro não se repete.
   - O filtro é por responsável. Ao lado ficam as propostas esperando resposta (PD-02) e o retrato por responsável. A linha "quem saiu da equipe já não aparece" lembra o EX-10.
2. **Proposta é ficha com o mesmo cabeçalho das outras.** No vinho ficam o número, o serviço, a situação, o cliente e o valor. No âmbar fica o retorno, com "Registrar resposta". Abaixo vêm as condições de honorário, o que está incluído e o histórico da proposta.
3. **O retorno da proposta é o próximo contato do cliente.** É uma data só: marcar o retorno na proposta muda o próximo contato da ficha, e vice-versa. Assim, Atendimentos e a ficha mostram a mesma coisa.
4. **Situações da proposta:** rascunho, enviada, em negociação, aceita, virou contrato e recusada. A validade passa a ser mostrada como "vencida" na lista quando a data passa.
   - "Enviada" é marcada à mão. O T3jus gera o arquivo (.docx no timbrado), e o escritório envia como já envia. Não há envio de proposta pelo sistema.
5. **Registrar resposta é uma janela com três saídas.**
   - Aceitou: leva a gerar o contrato.
   - Pediu mudança: volta para editar a proposta.
   - Recusou: o motivo é obrigatório, de uma lista curta, e alimenta o Funil (estado `resposta-erro`).
   - A resposta fica no histórico da proposta e no atendimento do cliente.
6. **A proposta aceita vira contrato sem redigitar (IN-01).** "Gerar o contrato" abre o formulário de Contratos com o cliente, o objeto, o responsável e as condições já preenchidos, e uma faixa diz de qual proposta veio. As condições da proposta usam as mesmas peças do contrato.
7. **Quem tem Comercial e não tem Contratos** (o exemplo é Diego) vê a proposta aceita, mas o botão vira "Pedir o contrato". Quem tem Contratos recebe o aviso com o link (estado `proposta-sem-contratos`).
8. **O funil não se arrasta.**
   - A etapa sai do que foi registrado: primeiro contato (atendimento sem proposta enviada), proposta enviada, em negociação, aceita, contrato.
   - O alto é um funil de verdade: três faixas centralizadas que estreitam (24 primeiros contatos → 14 receberam proposta → 9 viraram contrato), do vinho para o vinho 2 e o vinho 3, com o número grande em branco (no vinho, em sal).
   - Entre uma faixa e a seguinte vai a taxa de passagem ("58% passam", "64% passam"). Ao lado, quem ficou de fora naquela passagem e por quê: antes da proposta (o escritório não pegou o caso, não voltou, ainda em atendimento) e depois dela (proposta em andamento, fechou com outro escritório). Embaixo, a conversão total (38%).
   - No celular, cada faixa leva a linha do que conta embaixo, e os de fora entram numa caixa logo depois da taxa. Cabe em 412 px sem rolagem lateral.
   - "Agora no funil" ficou mais leve: as colunas não têm fundo, só um filete no alto (vinho na coluna de contratos). A linha que explica a etapa tem a mesma altura nas cinco colunas, então os cartões começam alinhados, e cada coluna acaba no último cartão.
   - Não há pontuação de "chance de fechar".
9. **Origem dos contatos** mostra, por origem: contatos, propostas, contratos, quanto vira contrato e o valor certo contratado.
   - Abaixo de 5 contatos, a porcentagem leva o selo "poucos dados".
   - O valor certo soma fixo, parcelas e 12 meses de mensalidade. Êxito e sucumbência só entram quando viram cobrança.
   - A origem vem do cadastro do cliente (lista fixa, pergunta 4 de Clientes).
10. **Regras da OAB (VA-07) à vista, sem recurso de marketing.**
    - No Funil, na Origem e na nova proposta, uma nota diz que o T3jus não faz anúncio, envio em massa nem lista de contatos comprada, e cita o Provimento 205/2021.
    - A proposta é só para quem já está em Clientes.
    - Como VA-07 é hipótese a validar, a pergunta 5 pede a conferência de uma advogada.

### Contratos

11. **O formulário de criar contrato é uma página em quatro passos numerados, não um assistente.**
    - Os passos são: cliente e casos, responsáveis, condições de honorário e cláusulas do escritório. Cada passo leva o número dentro do Disco vinho.
    - Tudo fica numa página porque a pessoa precisa ver as condições juntas para não se confundir, e porque voltar e avançar num assistente esconde o que já foi preenchido.
12. **Cada condição de honorário é um bloco próprio.**
    - O cabeçalho do bloco traz o número, o tipo e uma linha do que o tipo é.
    - Há um bloco por tipo marcado, na ordem da lista de tipos. Desmarcar o tipo tira o bloco; se o bloco já tem dado, uma janela pede confirmação antes.
    - Os campos são só os daquele tipo. Por exemplo: o parcelado pede valor total, parcelas e primeiro vencimento; o êxito pede percentual, sobre o quê, a etapa que vira cobrança e quantos dias depois.
    - O bloco termina com a faixa âmbar "Gera:", que diz em uma frase o que aquela condição produz. É o antídoto contra a confusão: a pessoa lê o efeito de cada condição antes de criar.
13. **Os sete tipos (CH-06):**
    - Fixo: um valor só, com uma data de pagamento.
    - Parcelado: um valor dividido em parcelas com dia certo. As parcelas são divididas em centavos exatos. A soma fecha no total, e o resto do centavo vai para as primeiras parcelas (R$ 2.000,00 em 3 = 2 de R$ 666,67 e 1 de R$ 666,66).
    - Mensal: o mesmo valor todo mês, com ou sem prazo, e reajuste.
    - Êxito em percentual: um percentual do que o cliente ganhar, com a etapa do caso que gera a cobrança.
    - Sucumbência: quem fica com ela e a etapa do pagamento.
    - Por ato ou consulta: um valor por audiência, diligência ou consulta, cobrado quando o ato é marcado como feito no caso.
    - Percentual recorrente: percentual sobre uma base que muda todo mês. Tem a etapa em que começa, o dia de cobrar, por quantos meses, o dia de pedir a base e quem recebe o lembrete. Uma opção, desmarcada por padrão, pede a base também ao cliente pelo WhatsApp do escritório (pergunta 3).
14. **Escolher os tipos** é um grupo de sete caixas de marcar em cartões, com o texto "Marque todos os tipos deste contrato". Cada cartão tem ícone, nome e uma linha do que é; o marcado ganha borda vinho e fundo âmbar claro, e o título do grupo conta quantos estão marcados.
    - Marcar um tipo abre o bloco dele logo abaixo, na ordem da lista. O resumo "O que este contrato gera" soma todos os blocos.
    - Estado `novo-tipos`: Eduardo, sem proposta, com Fixo (R$ 1.500,00 de entrada) e Parcelado (6 de R$ 1.000,00) marcados; o resumo dá R$ 7.500,00 e a programação junta a entrada e as parcelas.
    - Estados `novo` e `novo-erros`: Benedito, vindo da proposta, com Parcelado, Êxito em percentual e Percentual recorrente marcados.
    - Um contrato tem no máximo um bloco de cada tipo. Dois valores fixos em datas diferentes se fazem com o Parcelado. A nova proposta usa o mesmo grupo de caixas.
15. **O resumo "O que este contrato gera"** acompanha o formulário.
    - Mostra o valor certo, o que depende do caso e a programação dos recebimentos mês a mês. O que é variável aparece como "a definir", em itálico.
    - No computador fica fixo ao lado. No celular entra dentro do formulário, logo antes do botão Criar, para ninguém criar sem ver o resumo.
16. **Erro do formulário** segue o padrão aprovado (estado `novo-erros`):
    - o resumo no topo lista cada ponto com um link para o campo;
    - o bloco da condição com erro ganha filete vinho 3 e o selo "2 pontos para acertar";
    - cada campo tem a mensagem dizendo o que fazer;
    - a faixa "Gera:" do bloco diz o que falta;
    - o resumo lateral mostra "falta o percentual e a etapa";
    - o botão Criar nunca fica desabilitado.

    Os erros de exemplo são: nenhum advogado marcado, primeiro vencimento no passado (com a explicação de que parcela já paga se registra no Financeiro), percentual vazio e etapa não escolhida.
17. **Responsáveis (CH-03):**
    - Um responsável pelo contrato. Ele recebe os lembretes (base do mês, etapa que gera cobrança, assinatura pendente) e, se sair da equipe, o contrato passa para outra pessoa (EX-10).
    - Os advogados no contrato e na procuração são marcados à parte, com a OAB, porque quem acompanha nem sempre é quem assina.
18. **Casos (CH-05):** o contrato liga um ou mais casos do cliente. O caso que ainda não existe pode ser ligado depois. Um processo com vários clientes tem um contrato por cliente (EX-01).
19. **O contrato nasce em elaboração** e fica ativo quando a assinatura é registrada (data e arquivo assinado). Só então a programação vai para o Financeiro (pergunta 1). A ficha recém-criada mostra no âmbar o próximo passo: gerar os documentos e registrar a assinatura.
20. **Ficha do contrato:**
    - âmbar com o próximo recebimento;
    - abas Contrato, Recebimentos e Documentos;
    - condições em leitura, cada uma com a linha do que gera;
    - casos com a etapa em que estão;
    - na lateral, os responsáveis com OAB, a assinatura (com o lugar reservado da assinatura eletrônica) e a situação.

    Mudar uma condição de contrato ativo pede motivo e refaz só os recebimentos futuros. Encerrar para as cobranças novas e não apaga nada.
21. **A programação dos recebimentos (CH-04)** é a mesma lista que o Financeiro vê em A receber, com vencimento, o quê, a condição que gerou, o valor e a situação.
    - Mostra três meses à frente, mais o que depende do caso.
    - Quem tem Contratos e não tem Financeiro (Felipe) vê a programação sem a coluna Situação e sem o "Recebido até hoje", com a linha que explica por quê (estado `contrato-sem-financeiro`).
22. **A etapa do caso gera a cobrança (CH-07).**
    - Quando alguém do Jurídico marca a etapa ligada a uma condição (audiência realizada, pagamento da RPV, pagamento da sucumbência), o valor entra em A receber e o Financeiro é avisado.
    - A ficha mostra o aviso ("Larissa Costa marcou a audiência como realizada… entrou R$ 450,00 a receber em 10/12"), e o recebimento novo ganha o selo Novo.
    - No êxito, quem marca a etapa informa o valor.
23. **Honorários é a seção do que depende de alguém para virar cobrança.**
    - A base do mês do percentual recorrente: a cobrança parada sem base fica em destaque, com "Informar a base".
    - As condições que esperam etapa, com onde o caso está.
    - O que virou cobrança no mês.
    - Os tipos em uso.
    - Informar a base é uma janela com o valor, de onde veio, o novo vencimento (o dia 10 já passou) e o comprovante opcional. A linha "Gera:" faz a conta: 30% de R$ 2.910,00 = R$ 873,00.
24. **Procurações e modelos (CH-08, a validar):**
    - documentos gerados, com a situação da assinatura e Baixar;
    - os três modelos do escritório (contrato, procuração, declaração de hipossuficiência), com Baixar e Trocar;
    - os advogados que podem ser outorgados (só quem tem OAB na Equipe).
25. **Gerar documentos:**
    - escolher o contrato, os documentos, os advogados outorgados e os poderes especiais;
    - a declaração de hipossuficiência é uma caixa com a explicação de para que serve;
    - ao lado fica a prévia da procuração em papel timbrado, com os dados do cadastro marcados e o que falta em destaque ("[RG: falta]");
    - dado faltando avisa e não bloqueia: gera com o espaço marcado, ou "Completar na ficha";
    - o resultado é um .docx por documento, para revisar no Word.
26. **Assinatura eletrônica (CH-09) só tem lugar reservado**, num quadro tracejado na ficha do contrato, em Procurações e no resultado da geração. Por enquanto, imprime-se, assina-se e anexa-se o assinado (pergunta 2).

### As duas áreas

27. **Tabela que vira cartões.** No celular, cada linha vira um cartão com o rótulo de cada coluna, sem duplicar o HTML. Valores em reais sempre com centavos.
28. **O que a pessoa não pode ver nem aparece**, como no Portal v1. O servidor manda a página já sem o que não é da área. Quem não tem Comercial nem Contratos não vê as áreas.
29. **Sugestão de seções, sem mudança:** mantive as seções do Portal v1. Em Contratos, "Honorários" ganhou o papel de "o que depende de alguém para virar cobrança". Se a Carol preferir, o nome pode ser "A acompanhar".

## Acessibilidade (WCAG 2.2 AA)

- **Conferência automática** em 52 capturas (26 estados × computador e celular), feita pelo `fotos.cjs`. O resultado completo fica em `_conferencia.json`:
  - o axe (WCAG 2.0, 2.1 e 2.2, A e AA) não achou nenhuma violação;
  - nenhuma tela tem rolagem lateral;
  - nenhum erro de script.
- **Alvos:**
  - no celular, todos os alvos têm 44 px ou mais;
  - no computador, os alvos têm 44 px, e os botões compactos de tabela e lista têm 36 px;
  - a única exceção é a palavra-marca "T3jus" da moldura aprovada (24 px), como em Clientes;
  - os links de nome nos cartões do Funil não contam como alvo pequeno, porque o `::after` cobre o cartão inteiro (padrão aprovado do Console).
- **Contraste.** Só entram pares do D2 e do conceito Gabinete:
  - Disco vencido: branco sobre #AC3F6B (5,7:1);
  - Disco de hoje: #4F1D35 sobre âmbar, como na correção do Portal v1;
  - a faixa "Gera:" e o selo de tipo: tinta ou vinho sobre #F2CDB3 e #F2ECE8.
- **Formulários:**
  - cada campo tem `label`;
  - grupos (casos, advogados, a base, documentos, poderes, a resposta) ficam em `fieldset` com `legend`;
  - cada condição é um `fieldset` nomeado ("Condição 2: Êxito em percentual");
  - os erros ficam ligados por `aria-describedby`, com `aria-invalid`, e o resumo no topo tem links para os campos;
  - "R$", "%", "dias" e "meses" ficam dentro do campo, só visuais; o rótulo diz o que é;
  - as datas são texto dd/mm/aaaa com `inputmode="numeric"`, e os valores usam `inputmode="decimal"`.
- **Janelas** são `<dialog>` com `showModal()`; o Esc fecha e o foco começa no primeiro campo, ou no campo com erro.
- **Cor.** Nada depende só dela: vencido, hoje, parado, falta e situação têm selo escrito e ícone.

## O que precisa de dado novo no servidor

Todas as tabelas têm `escritorio_id` e passam por `proteger_tabela_escritorio`. O escritório vem da sessão, nunca do navegador. Valores em centavos (inteiro) com a moeda.

### Tabelas

| Tabela | Campos | Observação |
|---|---|---|
| `proposta` | `id`, `escritorio_id`, `numero` (P-AAAA-NNN por escritório), `cliente_id`, `servico`, `escopo`, `responsavel_id`, `situacao` (rascunho, enviada, negociacao, aceita, recusada), `valida_ate`, `enviada_em`, `respondida_em`, `resposta_canal`, `motivo_recusa`, `contrato_id`, `criado_por`, `criado_em`, `versao` | "Vencida" e "virou contrato" são calculadas. O retorno é o `prox_contato_*` do cliente, não um campo da proposta |
| Campos novos em `cliente` (Clientes) | `funil_encerrado_em`, `funil_motivo` (escritório não pegou o caso, não voltou, outro) | Para o Funil contar quem ficou de fora antes da proposta e por quê. Quem não tem proposta nem motivo conta como "ainda em atendimento" |
| `honorario_condicao` | `id`, `escritorio_id`, `dono_tipo` (proposta, contrato), `dono_id`, `ordem`, `tipo` (fixo, parcelado, mensal, exito, sucumbencia, ato, recorrente), `params` (JSON validado por tipo: valor, parcelas, primeiro vencimento, dia, meses, percentual em pontos-base, sobre o quê, etapa, dias depois, base variável, dia do lembrete, quem recebe, pedir pelo WhatsApp, lista de atos) | A mesma tabela para proposta e contrato: gerar o contrato copia as linhas |
| `contrato` | `id`, `escritorio_id`, `numero`, `cliente_id`, `objeto`, `observacoes`, `responsavel_id`, `situacao` (elaboracao, ativo, encerrado), `assinado_em`, `assinatura_arquivo_id`, `proposta_id`, `encerrado_em`, `motivo_encerramento`, `criado_por`, `criado_em`, `versao` | Sem DELETE. Encerrar pede motivo |
| `contrato_caso` | `contrato_id`, `caso_id`, `escritorio_id` | Depende dos casos do Jurídico (EX-01) |
| `contrato_advogado` | `contrato_id`, `pessoa_id`, `escritorio_id` | A pessoa precisa ter OAB na Equipe (EX-12) |
| `recebimento_previsto` | `id`, `escritorio_id`, `contrato_id`, `condicao_id`, `descricao`, `vencimento`, `valor_centavos` (nulo se a definir), `origem` (programado, etapa, base_informada, ato), `evento_caso_id`, `situacao_prevista` | É o que o Financeiro lê em A receber. Pago, atraso e baixa são do Financeiro (FI-02) |
| `base_mensal` | `id`, `escritorio_id`, `condicao_id`, `mes_ref`, `valor_centavos`, `fonte`, `comprovante_id`, `informado_por`, `informado_em` | Gera o `recebimento_previsto` do mês na mesma transação |
| `documento_gerado` | `id`, `escritorio_id`, `contrato_id`, `tipo` (contrato, procuracao, hipossuficiencia), `arquivo_id`, `modelo_versao`, `outorgados`, `poderes`, `dados_faltando`, `gerado_por`, `gerado_em`, `assinado_arquivo_id` | Arquivo privado, aberto só por link temporário (PT-07) |
| `modelo_documento` | `id`, `escritorio_id` (nulo no padrão T3jus), `tipo`, `arquivo_id`, `atualizado_por`, `atualizado_em` | Depende da pergunta 2 de modelos próprios |
| Histórico do escritório | Eventos de proposta (criada, editada com antes e depois, enviada, resposta) e de contrato (criado, condição mudada com motivo, assinatura registrada, encerrado), base informada, cobrança gerada por etapa e documento gerado | Na mesma tabela de eventos da Equipe e de Clientes |

### API

| Rota | O que faz | Erros |
|---|---|---|
| `GET /v1/comercial/retornos?responsavel=` | Clientes ativos com próximo contato, agrupados (vencido, hoje, 7 dias, depois, sem data), com o último atendimento | `AREA_NAO_LIBERADA` |
| `GET` e `POST /v1/propostas`, `GET` e `PATCH /v1/propostas/:id` | Lista com filtros, cria, lê e edita com `versao` | `CLIENTE_OBRIGATORIO`, `CONDICAO_INVALIDA`, 409 `CONFLITO_VERSAO` |
| `POST /v1/propostas/:id/resposta` | Aceitou, pediu mudança ou recusou. Encerra o próximo contato do cliente e grava o atendimento | `MOTIVO_OBRIGATORIO` |
| `POST /v1/propostas/:id/pedir-contrato` | Avisa quem tem Contratos (para quem só tem Comercial) | — |
| `GET /v1/comercial/funil?periodo=` e `/origem?periodo=` | Contagens por etapa, taxa de cada passagem, quem ficou de fora em cada passagem com o motivo e, por origem, contatos, propostas, contratos e valor certo | — |
| `POST /v1/contratos` (com `proposta_id` opcional) | Cria em elaboração, com as condições validadas por tipo, e devolve a programação calculada | `ADVOGADO_OBRIGATORIO`, `VENCIMENTO_NO_PASSADO`, `PERCENTUAL_INVALIDO`, `ETAPA_OBRIGATORIA`, `CONDICAO_OBRIGATORIA` |
| `POST /v1/contratos/previa-programacao` | Calcula o resumo "O que este contrato gera" enquanto a pessoa preenche (centavos exatos, sem gravar) | `CONDICAO_INVALIDA` |
| `POST /v1/contratos/:id/assinatura` | Registra data e arquivo; ativa o contrato e manda a programação ao Financeiro | `ARQUIVO_INVALIDO` |
| `PATCH /v1/contratos/:id/condicoes` | Muda condição de contrato ativo com motivo; refaz só os recebimentos futuros | `MOTIVO_OBRIGATORIO`, 409 `CONFLITO_VERSAO` |
| `POST /v1/contratos/:id/encerrar` | Encerra com motivo | `MOTIVO_OBRIGATORIO` |
| `GET /v1/contratos/:id/recebimentos` | Programação; sem Financeiro, vem sem situação de pagamento | — |
| `POST /v1/condicoes/:id/bases` | Informa a base do mês e gera o recebimento | `VALOR_INVALIDO`, `MES_JA_INFORMADO` |
| Evento do Jurídico "etapa marcada" | Gera o `recebimento_previsto` das condições ligadas àquela etapa, avisa o Financeiro e o responsável (CH-07) | Depende de EX-07 e EX-08 |
| Tarefa diária | Lembrete da base no dia marcado e, opcionalmente, a mensagem ao cliente pelo WhatsApp (outbox, PT-04) | — |
| `POST /v1/contratos/:id/documentos` | Gera os .docx com os dados do cliente, do contrato e dos advogados; devolve os arquivos e o que faltou | `SEM_OUTORGADO`, `MODELO_INVALIDO` |

### Para o painel

- A entrega de Comercial atende AP-02 (visão do escritório), AP-03, AP-04, AP-05, AP-06, IN-01 e PD-02. VA-07 só tem as notas: não citar como atendida.
- A entrega de Contratos atende CH-01 a CH-06. CH-07 depende das etapas do Jurídico (EX-07 e EX-08), e CH-08 e CH-09 são hipóteses: não citar como atendidas.
- Itens "pendente" para o painel:
  - CH-07 até o Jurídico marcar etapas;
  - CH-08, com a validação dos modelos com os pilotos;
  - o lembrete da base pelo WhatsApp, se a pergunta 3 for sim.

## Perguntas para a Carol

1. **Quando a programação dos recebimentos vai para o Financeiro: ao criar o contrato ou ao registrar a assinatura?** **Recomendo ao registrar a assinatura.** O contrato nasce "em elaboração", e o Financeiro só vê o que foi assinado. Assim não aparece cobrança de contrato que o cliente desistiu de assinar. O custo é um passo a mais (registrar a assinatura), que a ficha já pede no âmbar.
2. **Os modelos de documento são do escritório ou padrão do T3jus?** **Recomendo os dois:** o T3jus traz um modelo padrão de procuração, contrato e declaração, e o escritório pode trocar pelo dele (.docx com os campos entre colchetes). É o que está em "Modelos do escritório". A assinatura eletrônica (CH-09) fica só com o lugar reservado até os pilotos dizerem se usam e com qual serviço.
3. **O lembrete da base do mês pode ir também ao cliente pelo WhatsApp do escritório?** **Recomendo que sim, como opção desmarcada por padrão.** É o ponto em que o TCC mostrou a cobrança esquecida. A mensagem só pede o extrato do mês, e a resposta chega em Conversas. Precisa da IA do WhatsApp saber pedir e receber esse documento.
4. **Quem pode criar e mudar contratos?** **Recomendo quem tem a área Contratos, como está.** Quem só tem Comercial vê a proposta aceita e usa "Pedir o contrato". Mudar condição de contrato ativo pede motivo e fica no histórico. Se a Carol preferir mais cuidado, mudar contrato ativo pode ficar só com a sócia dona.
5. **As notas sobre o Provimento 205/2021 estão certas e no tom certo?** **Recomendo que uma advogada parceira leia as três notas (Funil, Origem e nova proposta) antes da aprovação.** VA-07 é hipótese, e o texto fala de regra da OAB. A proposta de design é não ter nenhum recurso de captação: sem anúncio, sem envio em massa, sem lista comprada e sem pontuação de lead.
