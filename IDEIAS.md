# T3jus — todas as ideias

Fonte única do que vale construir (DC9). Cada ideia tem um código por seção. Cada entrega do painel de execução cita em `refs` os códigos que atende, e cada regra vira teste automático com o código no nome (ex.: `PT-01: usuário do escritório A não vê nada do B`).

As ideias das seções 1 a 6 saíram do `docs/01-ideias-e-direcionamento.md` (primeira versão, 06/11/2026). As da seção 7 são hipóteses da análise crítica (`docs/03-analise-critica.md`, 10/11/2026) que precisam dos pilotos antes de virar construção. As da seção 8 são os princípios técnicos que vieram da fundação do TRÍADE Condo (17/11/2026). As da seção 9 são do site comercial e da entrada de clientes (Carol, 17/11/2026). As da seção 10 são do Console T3jus, o sistema interno da equipe, e vieram do passo 1 do TRÍADE Condo (18/11/2026). As da seção 11 são do Portal do advogado e saíram das decisões da Carol sobre os três sistemas (17/11/2026); PA-03 veio de uma referência de editor de fluxos que a Carol enviou (19/11/2026); PA-04 (ligar o WhatsApp do escritório e configurar a IA) a Carol aprovou desenhar em 19/11/2026. FI-22 (DRE) a Carol pediu para registrar em 19/11/2026, a partir de um post sobre o CPC 51/IFRS 18. IN-15 (quanto rendeu cada cliente) a Carol aprovou com o desenho dos relatórios do sócio (20/11/2026). FI-23 (carnê dos honorários no Portal) a Carol pediu em 20/11/2026. PA-06 (gatilhos cliente novo e documento pendente) a Carol pediu em 21/11/2026. PA-07 (dados do escritório para os documentos) a Carol pediu em 22/11/2026. As ideias CH-06 a CH-09, FI-07 a FI-21, EX-06 a EX-14, IN-07 a IN-14, VA-08, PT-25 e PT-26 vieram da análise de dois TCCs (Carol aprovou em 18/11/2026; ver `docs/04-analise-tccs.md`).

Etiquetas: [V1] primeira versão proposta; [VAL] hipótese a validar; [BASE] princípio técnico que vale para tudo.

## 1. Painel do dia

| Código | Ideia | Etiquetas |
|---|---|---|
| PD-01 | Ao abrir, o usuário entende o que cobrar, o que acompanhar e o que entregar | [V1] |
| PD-02 | Propostas e atendimentos que precisam de retorno | [V1] |
| PD-03 | Parcelas vencidas e próximos recebimentos | [V1] |
| PD-04 | Tarefas com vencimento próximo ou em atraso | [V1] |
| PD-05 | Demandas bloqueadas por documentos ou respostas | [V1] |
| PD-06 | Obrigações de repasse pendentes | [V1] |
| PD-07 | Responsável e próxima ação de cada item; cada alerta leva ao registro que o explica | [V1] |

## 2. Atendimento e propostas

| Código | Ideia | Etiquetas |
|---|---|---|
| AP-01 | Cadastro único de clientes e contatos, com a qualificação usada nos documentos (CPF, RG, estado civil, profissão, endereço) e a situação (ativo ou inativo) | [V1] |
| AP-02 | Histórico de atendimento | [V1] |
| AP-03 | Funil simples de atendimentos e propostas | [V1] |
| AP-04 | Origem dos contatos | [V1] |
| AP-05 | Propostas com situação e responsável | [V1] |
| AP-06 | Acompanhamento e próximo contato | [V1] |
| AP-07 | Cadastro que nasce da conversa: "Cadastrar como cliente" no WhatsApp já traz o nome e o telefone, liga a conversa ao cliente novo e a primeira reunião já sai com ele (Carol pediu em 22/11/2026) | [V1] |

## 3. Contratos e honorários

| Código | Ideia | Etiquetas |
|---|---|---|
| CH-01 | Contrato ligado ao cliente | [V1] |
| CH-02 | Condições de honorários e parcelamento | [V1] |
| CH-03 | Responsáveis pelo contrato | [V1] |
| CH-04 | Programação dos recebimentos | [V1] |
| CH-05 | Contrato ligado às demandas e tarefas | [V1] |
| CH-06 | Vários tipos de honorário no mesmo contrato: fixo, parcelado, mensal, êxito em percentual, sucumbência, por ato ou consulta e percentual recorrente, inclusive sobre uma base que muda todo mês (ex.: contracheque), com lembrete para pedir a base | [V1] |
| CH-07 | Uma etapa do caso gera a cobrança e avisa o financeiro (ex.: requisição expedida vira valor a receber com data prevista) | [V1] |
| CH-08 | Procuração e contrato de honorários gerados com os dados do cliente e dos advogados (nome, OAB), com a declaração de hipossuficiência quando houver, no papel timbrado do escritório, em arquivo editável | [VAL] |
| CH-09 | Assinatura eletrônica do contrato de honorários e da procuração | [VAL] |
| CH-10 | Ao registrar a assinatura do contrato, o cliente vai direto para Jurídico › Casos e processos: o caso abre já preenchido com os dados do contrato (ou o cliente entra num caso que já existe), e o contrato de consultoria pode dizer que não tem caso (Carol pediu em 21/11/2026) | [V1] |
| CH-11 | Toda assinatura passa pela mesma pergunta do caso, inclusive ao anexar o contrato assinado; a lista de Contratos e o Jurídico mostram os contratos assinados que ficaram sem caso (Carol pediu em 22/11/2026) | [V1] |
| CH-12 | Na assinatura, se o cliente já tem um caso em andamento sem contrato, a sugestão é juntar o contrato a esse caso, para o mesmo processo não virar dois casos (Carol pediu em 22/11/2026) | [V1] |
| CH-13 | Contrato ativo sem caso (consultoria, mensal) aparece como contrato ativo na ficha do cliente, sem pedir proposta nova, e pode ganhar um caso depois (Carol pediu em 22/11/2026) | [V1] |

## 4. Financeiro e repasses

| Código | Ideia | Etiquetas |
|---|---|---|
| FI-01 | Contas a receber e a pagar | [V1] |
| FI-02 | Recebimentos, despesas e baixas; cada recebimento baixa a parcela e o mês a que se refere, mesmo pago com atraso | [V1] |
| FI-03 | Parcelas e vencimentos | [V1] |
| FI-04 | Pendências e atrasos, com o motivo do atraso e a próxima ação de cobrança | [V1] |
| FI-05 | Registro e acompanhamento de repasses ao cliente, ao perito e ao escritório parceiro | [V1] |
| FI-06 | Separação entre dinheiro próprio e valores de terceiros | [V1] |
| FI-07 | Despesa adiantada pelo escritório (custas, sucumbência) vira valor a reembolsar, por cliente e por caso | [V1] |
| FI-08 | Fechamento financeiro do caso: só encerra com tudo recebido e tudo repassado; o caso mostra quanto entrou, quanto foi repassado e quanto falta destinar | [V1] |
| FI-09 | Previsão de caixa, prevista contra realizada, incluindo precatórios e RPVs com data estimada | [V1] |
| FI-10 | Aprovação de pagamentos pelo sócio (lista da semana) e separação entre quem lança e quem paga; pedidos urgentes do dia (como custas) entram na mesma aprovação | [VAL] |
| FI-11 | Divisão de honorários entre sócios ou advogados por caso, conforme a participação de cada um na data de entrada do caso, com adiantamento e acerto | [VAL] |
| FI-12 | Prestação de contas ao cliente gerada no recebimento: valor levantado, honorários, custas reembolsadas, repasses e o que fica para ele, enviada pelo WhatsApp | [V1] |
| FI-13 | Contas recorrentes previsíveis (aluguel, folha, impostos) lançadas sozinhas todo mês | [V1] |
| FI-14 | Recibo gerado a cada pagamento recebido | [V1] |
| FI-15 | Valor de precatório ou RPV atualizado entre a requisição e o pagamento, com a diferença entre o previsto e o recebido | [VAL] |
| FI-16 | Conferência com o extrato do banco, apontando o que saiu sem lançamento ou sem aprovação | [VAL] |
| FI-17 | Cobrança emitida pelo sistema (Pix ou boleto) com baixa automática ao pagar; cada parcela guarda a forma de pagamento (Pix, boleto, cartão, débito automático, dinheiro, cheque pré-datado) | [V1] |
| FI-18 | Comprovante, nota fiscal ou guia anexados a cada lançamento | [V1] |
| FI-19 | Acompanhamento do levantamento: documentos exigidos (procuração com poderes para receber), situação da conta judicial e data de liberação | [VAL] |
| FI-20 | Categorias simples de entradas e saídas: honorários por tipo, valores de terceiros, reembolso de custas, fornecedores, impostos, pessoal, retiradas dos sócios, taxas bancárias, empréstimos | [V1] |
| FI-21 | Exportação mensal para o contador (recebimentos, despesas, notas e comprovantes) | [V1] |
| FI-22 | DRE no formato do CPC 51/IFRS 18 (grupos Operacional, Investimento, Financiamento e Tributos, com os dois subtotais obrigatórios), por competência a partir do mês de referência de cada parcela, como relatório no Caixa ou junto da exportação ao contador. Conferir o mapeamento das categorias com o contador de um piloto antes de desenhar | [VAL] |
| FI-23 | Carnê de pagamento dos honorários parcelados, num modelo do T3jus: o escritório gera no Portal, a partir das parcelas do contrato, um PDF em A4 com várias parcelas destacáveis (canhoto do escritório e via do cliente), com o Pix do próprio escritório, para imprimir ou mandar ao cliente pelo WhatsApp, sem depender de boleto registrado nem de provedor de pagamento | [V1] |

## 5. Execução jurídica

| Código | Ideia | Etiquetas |
|---|---|---|
| EX-01 | Cadastro de casos e processos, com área, parte contrária, tribunal e sistema (ex.: PJe); um processo pode ter vários clientes, cada um com os próprios honorários | [V1] |
| EX-02 | Tarefas e responsáveis | [V1] |
| EX-03 | Etapas e pendências | [V1] |
| EX-04 | Prazos cadastrados à mão (monitoramento de tribunais é integração posterior) | [V1] |
| EX-05 | Documentos ligados ao caso e documentos que faltam | [V1] |
| EX-06 | Audiências como compromisso na agenda, com visão de mês, semana e dia, com modalidade (presencial ou virtual) e link da sala, criadas clicando no dia; as próximas aparecem na tela inicial | [V1] |
| EX-07 | Etapas do caso definidas pelo escritório (não uma lista fixa); a lista de casos mostra número, cliente e etapa sem precisar abrir | [V1] |
| EX-08 | Ao chegar à etapa final, o sistema pede o resultado (ganho, perda, acordo), que alimenta a cobrança do êxito (CH-07) e os indicadores | [V1] |
| EX-09 | Gerador de petições: modelos do escritório preenchidos com os dados do cliente, do caso e dos advogados, mais um breve formulário (endereçamento, valor da causa), gerando arquivo editável | [VAL] |
| EX-10 | Quando alguém sai da equipe, as tarefas e cobranças dessa pessoa passam para um responsável; nada fica sem dono | [V1] |
| EX-11 | Lembrete da audiência para o cliente pelo WhatsApp (faltar à conciliação pode gerar multa, CPC art. 334, § 8º) | [V1] |
| EX-12 | Ficha de cada advogado da equipe com OAB e UF, usada nos documentos gerados | [V1] |
| EX-13 | Agenda sincronizada com Google Agenda ou Outlook | [VAL] |
| EX-14 | Aviso ao cliente pelo WhatsApp quando o caso muda de etapa, explicado em linguagem simples | [V1] |
| EX-15 | Qualificação completa de cada advogado (nome completo, nacionalidade, estado civil, CPF, RG, endereço profissional e contatos), como a do cliente, preenchida em Sua conta e usada em todos os documentos gerados | [V1] |
| EX-16 | Fechamento do caso de ponta a ponta: depois da etapa final, a ficha do cliente mostra o que falta (conferir o êxito, repassar, encerrar no financeiro, encerrar o contrato) e só no fim volta a sugerir proposta nova (Carol pediu em 22/11/2026) | [V1] |
| EX-17 | Encerrar em cadeia: a ficha do caso leva ao acerto no financeiro, e encerrar o caso no financeiro oferece encerrar junto os contratos ligados a ele (Carol pediu em 22/11/2026) | [V1] |

## 6. Indicadores

| Código | Ideia | Etiquetas |
|---|---|---|
| IN-01 | Conversão de atendimentos e propostas em contratos | [V1] |
| IN-02 | Valores contratados | [V1] |
| IN-03 | Valores recebidos | [V1] |
| IN-04 | Valores vencidos e pendentes | [V1] |
| IN-05 | Próximas obrigações e recebimentos previstos | [V1] |
| IN-06 | Tarefas, entregas e bloqueios que pedem ação | [V1] |
| IN-07 | Receita por tipo de honorário e atrasos por idade (até 30, 60 e 90 dias) | [V1] |
| IN-08 | Carga de cada advogado (casos por responsável) e casos por etapa, para ver onde o trabalho para | [V1] |
| IN-09 | Comparação com os meses anteriores e com a meta, com alerta quando um tipo de receita cai de repente | [V1] |
| IN-10 | Quanto das despesas fixas é coberto pela receita recorrente (mensalidades e parcelas) | [V1] |
| IN-11 | Recebido e repassado por escritório parceiro ou correspondente | [VAL] |
| IN-12 | Receita e casos por área de atuação e por responsável | [V1] |
| IN-13 | Esforço dedicado a cada cliente de mensalidade (tarefas e horas) comparado ao valor pago, para negociar reajuste | [VAL] |
| IN-14 | Volume do período: quantos clientes receberam valores e quanto foi repassado | [V1] |
| IN-15 | Quanto rendeu cada cliente, área e responsável no período: o que entrou menos as despesas de caso adiantadas que não voltaram, sem ratear despesa fixa | [V1] |

## 7. A validar com os pilotos

| Código | Ideia | Etiquetas |
|---|---|---|
| VA-01 | Honorários de êxito, alvarás, RPV e precatório, com o repasse ao cliente (onde o dinheiro escapa) | [VAL] |
| VA-02 | Monitoramento de publicações, mínimo esperado para ser o sistema principal do escritório | [VAL] |
| VA-03 | IA para eliminar cadastro: conversa de WhatsApp ou contrato em PDF viram cliente, parcelas e tarefas | [VAL] |
| VA-04 | Substituir o sistema atual ou integrar de verdade, em vez de entrar ao lado dele | [VAL] |
| VA-05 | Importação de dados para facilitar a entrada (planilhas e outros sistemas) | [VAL] |
| VA-06 | Nota fiscal de serviço e reforma tributária | [VAL] |
| VA-07 | Regras da OAB sobre publicidade (Provimento 205/2021) no atendimento e no funil | [VAL] |
| VA-08 | Modelo de preço: por módulo, por volume de processos acompanhados ou por usuário, com ou sem período grátis | [VAL] |

## 8. Princípios técnicos e de qualidade

| Código | Ideia | Etiquetas |
|---|---|---|
| PT-01 | Isolamento total entre escritórios, verificado no servidor em toda leitura, escrita, busca, anexo, fila e notificação. O escritório vem da sessão, nunca do que o navegador envia; testes negativos de acesso cruzado | [BASE] |
| PT-02 | Permissão = pessoa + função + escritório + ação; negar por padrão. Cada perfil vê o mínimo | [BASE] |
| PT-03 | Histórico e auditoria: nada é apagado em silêncio | [BASE] |
| PT-04 | Banco relacional com transações; alteração e intenção de envio salvas juntas (outbox) e um worker envia | [BASE] |
| PT-05 | Aplicação modular única antes de microsserviços, em TypeScript e PostgreSQL. Camadas separadas (interface, API, domínio, adaptadores); configuração por ambiente e segredos fora do código | [BASE] |
| PT-06 | Row Level Security no banco como defesa extra | [BASE] |
| PT-07 | Arquivos privados com validação de tipo e tamanho e links temporários; o nome dado pelo usuário não define onde o arquivo é guardado | [BASE] |
| PT-08 | Login com e-mail verificado, recuperação por token de uso único, autenticador obrigatório para a equipe interna, sessões revogáveis. Resposta neutra na recuperação; senha e token nunca aparecem no histórico | [BASE] |
| PT-09 | Valores em dinheiro exatos (nunca ponto flutuante), com moeda explícita | [BASE] |
| PT-10 | Acessibilidade WCAG 2.2 AA, uso no celular, estados vazio, erro e carregando | [BASE] |
| PT-11 | LGPD e sigilo profissional: cadastro mínimo, finalidade por campo, retenção e exclusão; o escritório é o controlador e o T3jus o operador. Inventário por tipo de dado | [BASE] |
| PT-12 | Cópias de segurança cifradas, com restauração testada; monitoramento e alertas com responsável | [BASE] |
| PT-13 | Logs sem senhas, tokens nem conteúdo pessoal desnecessário | [BASE] |
| PT-14 | Ambientes separados; dados fictícios em desenvolvimento | [BASE] |
| PT-15 | Exportação completa dos dados do escritório, e API para integrações quando houver parceiro | [BASE] |
| PT-16 | Servidores no Brasil | [BASE] |
| PT-17 | Contratos de API com validação de esquema, paginação, erros padronizados e versão | [BASE] |
| PT-18 | Testes automáticos de domínio, concorrência e isolamento rodando em integração contínua | [BASE] |
| PT-19 | Controle de edição simultânea: cada alteração leva a versão que a pessoa leu; no conflito, mostra a versão nova sem perder o que a pessoa escreveu | [BASE] |
| PT-20 | Cada pessoa com acesso próprio, por convite; nada de conta compartilhada | [BASE] |
| PT-21 | Vínculo ativo ou revogado; revogado não age mais, mas a autoria antiga fica | [BASE] |
| PT-22 | Uma pessoa pode ter vínculo com mais de um escritório | [BASE] |
| PT-23 | Suporte de acesso: a equipe nunca vê nem escolhe a senha; a redefinição vai só para o canal já verificado | [BASE] |
| PT-24 | Funções da equipe interna, cada uma só com os escritórios atribuídos | [BASE] |
| PT-25 | Padrão único de telas: lista, ficha, criar e editar iguais em todos os módulos, com trilha de navegação e formulário de edição já preenchido | [BASE] |
| PT-26 | Entrar com a conta Google, além de e-mail e senha | [VAL] |

## 9. Site comercial e entrada de clientes

| Código | Ideia | Etiquetas |
|---|---|---|
| SC-01 | Site comercial em `t3jus.pro`: início, como funciona, para quem é e contato, para divulgar o sistema e atrair escritórios | [V1] |
| SC-02 | Pedido de demonstração pelo site entra sozinho no Console como interessado, com data, origem e a autorização LGPD que a pessoa marcou | [V1] |
| SC-03 | Oferta honesta: o site diz o que já existe e o que é planejado, sem prometer o que o sistema ainda não faz | [V1] |
| SC-04 | Termos de uso e política de privacidade do T3jus, com o escritório como controlador e o T3jus como operador dos dados | [V1] |
| SC-05 | Console comercial: interessados com responsável, próximo passo e data, do pedido de demonstração até virar escritório cliente sem redigitar | [V1] |
| SC-06 | Site rápido e encontrável: carrega bem no celular, com título, descrição e prévia de compartilhamento em cada página | [V1] |

## 10. Console T3jus

| Código | Ideia | Etiquetas |
|---|---|---|
| CO-01 | Carteira de escritórios clientes, com estágio (em implantação ou ativo; ativo só com o sócio convidado) e as situações a tratar de cada um (sem sócio, sem contato, sem contrato) | [V1] |
| CO-02 | Ficha do escritório: nome, cidade, UF, endereço, CNPJ conferido e contatos; a referência do contrato só a administração muda | [V1] |
| CO-03 | Carteira e notas internas que o escritório nunca vê | [V1] |
| CO-04 | Histórico administrativo de cada cliente e da equipe interna, com quem fez o quê e quando | [V1] |
| CO-05 | Contrato e documentos do escritório cliente anexados na ficha do Console (PDF e imagem), guardados sem apagar, com quem enviou e quando; arquivo privado, aberto só por link temporário | [V1] |
| CO-06 | Cobrança dos escritórios que assinam o T3jus, no Console: planos com valor e limite de pessoas, assinatura na ficha do escritório, faturas mensais com Pix, boleto ou carnê de 12 parcelas, régua de lembretes e tratamento do atraso (aviso ao sócio dono e Portal só para consulta com confirmação da Administração, sem apagar dados); o sócio dono vê e paga as faturas no Portal | [V1] |

## 11. Portal do advogado

| Código | Ideia | Etiquetas |
|---|---|---|
| PA-01 | Portal em áreas: Início, Conversas, Clientes e Agenda comuns no alto; Comercial, Contratos, Financeiro e Jurídico no meio, cada uma com a sua barra de seções; Equipe, Escritório e Ajuda embaixo. Cada área aparece só para quem o sócio liberou | [V1] |
| PA-02 | Sem funções fixas no escritório: o sócio dono convida a equipe e marca, pessoa por pessoa, as áreas que cada uma acessa (Comercial, Contratos, Financeiro, Jurídico); pode mudar a qualquer momento, com registro no histórico; o sócio vê tudo | [V1] |
| PA-03 | Automações de mensagens do WhatsApp em Conversas, montadas num desenho de fluxo (gatilho, condições, mensagem do modelo, espera, ramos e passar para uma pessoa da equipe): a IA do escritório sugere o fluxo a partir de um pedido em linguagem simples, os passos sugeridos aparecem tracejados até a sócia dona revisar, testar sem enviar e ligar; nada liga sozinho, e cada execução fica no histórico | [V1] |
| PA-04 | Ligação do próprio número de WhatsApp do escritório pela sócia dona, no caminho oficial da Meta, passo a passo ou com ajuda da equipe T3jus, com a saúde do número em linguagem simples (nome aprovado, qualidade, limite por dia, modelos de mensagem); e as regras da IA que atende os clientes (se apresenta como assistente virtual, o que pode e o que nunca responde, quem pode falar, quando passa para uma pessoa, horário), testada sem enviar antes de ligar e com pausa a qualquer momento | [V1] |
| PA-05 | Conversas pelo WhatsApp do escritório: o cliente fala com a IA, que responde o que está no T3jus e passa para uma pessoa da equipe quando não sabe, com o motivo e um responsável escolhido pela regra (quem cuida do caso, o próximo contato, a área Comercial ou a sócia dona); a equipe vê a fila de quem espera, assume, escreve, devolve para a IA (com o atendimento na ficha) e passa para outra pessoa, tudo registrado na conversa (decisão da Carol, 18/11/2026; desenho aprovado em 19/11/2026) | [V1] |
| PA-06 | Dois gatilhos novos para as automações: "cliente novo" (quando um cliente entra no escritório, para a mensagem de boas-vindas) e "documento pendente" (quando falta um documento pedido ao cliente, para lembrar do que falta), que a IA também pode usar ao montar o fluxo (Carol pediu em 21/11/2026) | [V1] |
| PA-07 | Dados do escritório para os documentos, em Escritório no Portal: tipo (sociedade de advogados, sociedade individual ou sem sociedade), razão social, CNPJ, registro da sociedade na OAB, sede em partes (CEP, rua, número, bairro, cidade e UF), telefone, e-mail e site, que a sócia dona preenche e o contrato, a procuração, as petições e o timbrado usam; a qualificação de cada advogado também fica em Escritório, e Sua conta fica só com o que é do sistema | [V1] |

## Contagem

| Seção | Ideias |
|---|---|
| 1. Painel do dia | 7 |
| 2. Atendimento e propostas | 7 |
| 3. Contratos e honorários | 13 |
| 4. Financeiro e repasses | 23 |
| 5. Execução jurídica | 17 |
| 6. Indicadores | 15 |
| 7. A validar com os pilotos | 8 |
| 8. Princípios técnicos e de qualidade | 26 |
| 9. Site comercial e entrada de clientes | 6 |
| 10. Console T3jus | 6 |
| 11. Portal do advogado | 7 |
| **Total** | **135** |
