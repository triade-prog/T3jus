# T3jus — todas as ideias

Fonte única do que vale construir (DC9). Cada ideia tem um código por seção. Cada entrega do painel de execução cita em `refs` os códigos que atende, e cada regra vira teste automático com o código no nome (ex.: `PT-01: usuário do escritório A não vê nada do B`).

As ideias das seções 1 a 6 saíram do `docs/01-ideias-e-direcionamento.md` (primeira versão, 06/11/2026). As da seção 7 são hipóteses da análise crítica (`docs/03-analise-critica.md`, 10/11/2026) que precisam dos pilotos antes de virar construção. As da seção 8 são os princípios técnicos que vieram da fundação do TRÍADE Condo (17/11/2026). As da seção 9 são do site comercial e da entrada de clientes (Carol, 17/11/2026). As da seção 10 são do Console T3jus, o sistema interno da equipe, e vieram do passo 1 do TRÍADE Condo (18/11/2026). As ideias CH-06 a CH-08, FI-07 a FI-16, EX-06 a EX-11 e IN-07 a IN-11 vieram da análise de dois TCCs (Carol aprovou em 18/11/2026; ver `docs/04-analise-tccs.md`).

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
| AP-01 | Cadastro único de clientes e contatos, com a qualificação usada nos documentos (CPF, RG, estado civil, profissão, endereço) | [V1] |
| AP-02 | Histórico de atendimento | [V1] |
| AP-03 | Funil simples de atendimentos e propostas | [V1] |
| AP-04 | Origem dos contatos | [V1] |
| AP-05 | Propostas com situação e responsável | [V1] |
| AP-06 | Acompanhamento e próximo contato | [V1] |

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
| CH-08 | Procuração e contrato de honorários gerados com os dados do cadastro, em arquivo editável para o escritório pôr o timbre | [VAL] |

## 4. Financeiro e repasses

| Código | Ideia | Etiquetas |
|---|---|---|
| FI-01 | Contas a receber e a pagar | [V1] |
| FI-02 | Recebimentos, despesas e baixas; cada recebimento baixa a parcela e o mês a que se refere, mesmo pago com atraso | [V1] |
| FI-03 | Parcelas e vencimentos | [V1] |
| FI-04 | Pendências e atrasos | [V1] |
| FI-05 | Registro e acompanhamento de repasses ao cliente, ao perito e ao escritório parceiro | [V1] |
| FI-06 | Separação entre dinheiro próprio e valores de terceiros | [V1] |
| FI-07 | Despesa adiantada pelo escritório (custas, sucumbência) vira valor a reembolsar, por cliente e por caso | [V1] |
| FI-08 | Fechamento financeiro do caso: só encerra com tudo recebido e tudo repassado | [V1] |
| FI-09 | Previsão de caixa, prevista contra realizada, incluindo precatórios e RPVs com data estimada | [V1] |
| FI-10 | Aprovação de pagamentos pelo sócio (lista da semana) e separação entre quem lança e quem paga | [VAL] |
| FI-11 | Divisão de honorários entre sócios ou advogados por caso, com adiantamento e acerto | [VAL] |
| FI-12 | Prestação de contas ao cliente gerada no recebimento: valor levantado, honorários, custas reembolsadas, repasses e o que fica para ele, enviada pelo WhatsApp | [V1] |
| FI-13 | Contas recorrentes previsíveis (aluguel, folha, impostos) lançadas sozinhas todo mês | [V1] |
| FI-14 | Recibo gerado a cada pagamento recebido | [V1] |
| FI-15 | Valor de precatório ou RPV atualizado entre a requisição e o pagamento, com a diferença entre o previsto e o recebido | [VAL] |
| FI-16 | Conferência com o extrato do banco, apontando o que saiu sem lançamento ou sem aprovação | [VAL] |

## 5. Execução jurídica

| Código | Ideia | Etiquetas |
|---|---|---|
| EX-01 | Cadastro de casos e processos, com área, parte contrária e tribunal; um processo pode ter vários clientes, cada um com os próprios honorários | [V1] |
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

## Contagem

| Seção | Ideias |
|---|---|
| 1. Painel do dia | 7 |
| 2. Atendimento e propostas | 6 |
| 3. Contratos e honorários | 8 |
| 4. Financeiro e repasses | 16 |
| 5. Execução jurídica | 11 |
| 6. Indicadores | 11 |
| 7. A validar com os pilotos | 7 |
| 8. Princípios técnicos e de qualidade | 24 |
| 9. Site comercial e entrada de clientes | 6 |
| 10. Console T3jus | 4 |
| **Total** | **100** |
