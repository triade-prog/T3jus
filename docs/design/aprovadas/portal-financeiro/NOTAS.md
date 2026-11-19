# Portal: Financeiro · notas

> **Aprovado pela Carol em 19/11/2026, às 0h36 (Brasília).** Ela já tinha pedido 4 ajustes, todos aplicados antes da aprovação: o tipo "Outro" na Agenda, "Mensagens" no lugar de "Caixa" em Conversas, o funil redesenhado e mais de um tipo de honorário no contrato e na proposta. As perguntas do fim seguem a recomendação até a Carol dizer o contrário.

A área Financeiro do Portal do advogado, para a Carol aprovar antes de virar código. É a promessa do T3jus: do honorário contratado ao dinheiro recebido e repassado, sem escapar nada. Ela atende:

- FI-01 a FI-09, FI-12, FI-13, FI-14, FI-17, FI-18, FI-20 e FI-21: a receber e a pagar, baixas por mês de referência, parcelas, atrasos com motivo e próxima ação, repasses, separação do dinheiro de terceiros, reembolso de despesa adiantada, fechamento do caso, previsão de caixa, prestação de contas pelo WhatsApp, contas recorrentes, recibo, cobrança Pix e boleto, comprovante anexado, categorias e exportação para o contador;
- PD-03 e PD-06: parcelas vencidas, próximos recebimentos e repasses pendentes;
- IN-02 a IN-05, IN-07, IN-09, IN-10 e IN-14: contratado, recebido, vencido, previsto, receita por tipo, atraso por idade, comparação com os meses anteriores e alerta de queda, cobertura das despesas fixas e volume repassado;
- VA-01: êxito, alvará, RPV e precatório com o repasse ao cliente.

As ideias marcadas [VAL] só ganham lugar reservado, com o texto "ainda está em validação com os pilotos": FI-10 (aprovação pela sócia, em A pagar), FI-15 (atualização do valor do precatório, em Caixa) e FI-16 (conferência com o extrato, em Caixa). FI-11 (divisão de honorários entre sócios) e FI-19 (acompanhamento do levantamento) não aparecem: são a pergunta 5.

A tela parte do Portal v1 aprovado (moldura, barra de seções, barra de baixo no celular) e segue a área Clientes aprovada: o mesmo `comum.py`, sem mudança, o cabeçalho da ficha aprovada do Console v1, o mesmo elenco e os mesmos clientes. As peças novas têm o prefixo `fi-`.

## Como abrir

- `index.html` mostra os 16 estados em computador (1440) e celular (412), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- `financeiro.html` abre sozinho, com as fontes, o CSS e os ícones embutidos. O `index.html` usa o Google Fonts.
- O estado vem do endereço, por exemplo `financeiro.html?estado=repasse` ou `?estado=registrar-erro`. No celular, `&mais=1` abre a folha Mais. A barra de seções leva às cinco seções.
- Abaixo de 760 px, o HTML vira a versão de celular. Funcionam as janelas (abrir, fechar, Esc), o Mais e a barra de seções. O resto é desenho.
- As capturas de celular mostram a página inteira, com a barra de baixo no fim. Com janela aberta, a captura mostra só a tela.
- A pasta `_fonte/` guarda os scripts, e `sh _fonte/gerar.sh` refaz tudo:
  - `comum.py` é a cópia sem mudança do Portal v1 (a mesma da área Clientes);
  - `financeiro.py` gera o HTML;
  - `casos.py` gera a lista de estados e o `index.html`;
  - `fotos.cjs` faz as capturas com deviceScaleFactor 2 e roda as conferências;
  - `webp.py` converte as capturas para WebP.
- Todos os dados são fictícios. Os valores fecham entre as telas: o previsto do mês (R$ 48.300,00) é a soma do recebido, do vencido no mês e do que vence até 30/11; o saldo de terceiros (R$ 30.284,96) é a soma do que falta repassar e transferir; cada divisão de alvará ou RPV soma o valor levantado.

## Decisões de design

1. **Dinheiro do escritório e de terceiros nunca dividem a mesma folha (FI-06).** A regra visual é fixa em toda a área:
   - o do escritório fica na família vinho (campo vinho, números em vinho);
   - o de terceiros fica sempre num campo âmbar ou numa folha com a faixa âmbar-3 no alto, com o escudo e o rótulo "De terceiros · não é do escritório";
   - os dois nunca são somados. No Resumo, a abertura é cortada em diagonal, como a ficha aprovada: à esquerda o mês do escritório, à direita o que é de terceiros. No Caixa, são dois saldos lado a lado, e o de terceiros diz que não entra na previsão;
   - o registro de recebimento diz em que caixa o dinheiro entra. A parcela de honorário vai sempre para o do escritório; alvará, RPV e acordo entram como terceiros, e só a parte do escritório passa para o caixa dele quando é transferida.
2. **Resumo.** Responde três perguntas, nesta ordem: o que está atrasado e o que fazer, quanto entrou contra o previsto, e o que falta repassar.
   - "Vencido" mostra o atraso por idade (até 30, 31 a 60, 61 a 90, mais de 90 dias, IN-07) e cada parcela com o motivo, a próxima ação, a data e o responsável (FI-04, PD-07). O pé diz "todas têm responsável e próxima ação", que é a regra (EX-10);
   - "Previsto e realizado" traz a barra do mês, igual à do Início aprovado, e a comparação de agosto a novembro (IN-09). O alerta de queda do êxito diz quanto caiu e a causa provável;
   - à direita: o que entra em 7 dias (PD-03), os repasses pendentes na folha de terceiros (PD-06) e "Novembro em números" (contratado, clientes que receberam, recebido por tipo e a cobertura das despesas fixas, IN-02, IN-07, IN-10, IN-14).
3. **Gráficos.** São poucos e todos de barras horizontais, nas cores do Gabinete. O valor em reais, com centavos, fica escrito ao lado de cada barra. Previsto é âmbar-3 com contorno vinho-4 (como no Início aprovado); realizado é vinho; atraso é vinho-3; RPV com data estimada é âmbar. A legenda imita o quadradinho Pantone. Cada grupo tem `role="group"` e rótulo; as barras são decorativas, porque o número já está escrito.
4. **A receber é uma lista por vencimento.** Os quatro números do alto são também os filtros (em aberto, vencidas, 7 dias, recebido no mês). As parcelas vêm em três grupos (vencidas, 7 dias, até o fim do mês), com o total de cada grupo. Cada linha mostra o mês da parcela, a forma de pagamento e a situação da cobrança (FI-17): "Pix enviado 3 vezes", "Boleto emitido", "Recusado pelo banco", "Cheque guardado no cofre". As seis formas do FI-17 aparecem. "Por cliente" agrupa por cliente e contrato.
5. **As parcelas nascem dos contratos.** Ninguém digita parcela no Financeiro: elas saem das condições do contrato (área Contratos, CH-02 e CH-04). O primeiro uso diz isso e leva a Contratos.
6. **Parcelas de um contrato.** É a ficha aprovada: no vinho, o cliente e as condições; no âmbar, o atraso e "Registrar recebimento". A tabela mostra cada parcela com o mês de referência, recibo e comprovante (FI-14, FI-18). Os totais dizem contratado, recebido, em atraso e a vencer. Ao lado ficam:
   - a cobrança: motivo, próxima ação e o histórico, com os lembretes automáticos do WhatsApp e as ligações (FI-04);
   - o Pix copia e cola da parcela, com baixa sozinha (FI-17);
   - o que o escritório adiantou no caso e como volta (FI-07).
7. **Registrar recebimento é uma janela.** Ela traz a parcela no alto e pede:
   - o valor e o dia em que o dinheiro entrou;
   - a forma de pagamento e, se houver, multa e juros, com a conta do contrato na ajuda;
   - o comprovante (opcional) e o recibo pelo WhatsApp, marcado por padrão.

   Uma faixa diz que o recebimento **baixa a parcela de outubro, mesmo pago em novembro**, e que no caixa ele entra no dia em que entrou (FI-02). Erros: valor acima do que falta na parcela e data depois de hoje, cada um dizendo o que fazer. O erro ocupa o lugar da ajuda.
8. **A pagar.** Cada conta tem categoria (FI-20), origem e nota ou guia (FI-18).
   - A origem diz "Recorrente · todo dia 20, lançada sozinha em 01/11" (FI-13) ou "Adiantada pelo escritório, vira reembolso de Daniela" (FI-07);
   - conta sem nota ganha o selo de atenção, e a exportação aponta a falta;
   - "Adiantado por cliente" lista o que volta, por cliente e caso, e como volta: na próxima parcela, descontado do levantamento ou cobrado à parte;
   - as saídas do mês por categoria usam as mesmas categorias da exportação. Repasse a terceiros não é despesa e não entra ali.
9. **Lançar conta é uma janela curta**, com duas caixas: "Repete todo mês" e "Foi adiantada para um cliente". A segunda abre cliente, caso e como o dinheiro volta.
10. **Repasses: um bloco por valor recebido (FI-05, VA-01).** Cada bloco mostra o que entrou (RPV, depósito de acordo, alvará), quem recebe quanto e a situação de cada parte, com o atraso e o motivo (ex.: a cliente trocou de banco). O bloco diz "0 de 2 feitos" ou "3 de 5 feitos". A folha "Como funciona" explica as quatro regras.
11. **Registrar alvará ou RPV propõe a divisão pelo contrato.** São os honorários (30%, com a cláusula), os reembolsos do caso, o parceiro, o perito e o que fica para o cliente. A soma tem de fechar com o valor levantado, e a janela mostra "Falta destinar: R$ 0,00". A parcela em atraso do cliente **não** é descontada sem o aceite dele (pergunta 3).
12. **Prestação de contas pelo WhatsApp (FI-12).** É uma prévia da mensagem, com valor pago, honorários, reembolsos e o que fica para o cliente, em linguagem simples. Os números vêm do registro e não se editam ali; para mudar, corrige-se o registro. O envio é sempre depois de alguém revisar. A ficha do repasse mostra a mensagem enviada e quando foi lida.
13. **Fechamento do caso (FI-08).** A ficha do repasse mostra quanto entrou, quanto foi destinado e pago, e quanto falta, com a lista do que está pronto e do que falta. O botão "Encerrar o caso no financeiro" nunca fica desabilitado: com pendência, a janela (`alertdialog`) diz o que falta, com valores, e leva a registrar o repasse. Se um repasse não vai acontecer, registra-se isso no repasse, com o motivo. Nada some sem explicação (PT-03).
14. **Caixa (FI-09).** Mostra:
    - os dois saldos, nunca somados;
    - de setembro a fevereiro, as entradas previstas e realizadas com o valor ao lado. O RPV de janeiro aparece em âmbar, com o valor;
    - a tabela mês a mês (entradas e saídas, previstas e realizadas, e o saldo);
    - os RPVs e precatórios a caminho, com a data estimada e só a parte do escritório. O precatório de 2027 fica fora do gráfico, e isso está escrito.
15. **Exportação para o contador (FI-21).** A janela diz o mês e o que vai no arquivo: recebimentos, despesas, recibos e comprovantes. Terceiros vão numa aba à parte, porque não são receita do escritório. As despesas sem nota vêm listadas. A janela oferece o formato e o envio por e-mail ao contador, e a exportação fica no histórico.
16. **Seções da área:** ficam as cinco atuais (Resumo, A receber, A pagar, Repasses, Caixa). Não proponho mudar.
17. **Quem vê.** Quem tem a área Financeiro vê tudo nela. Quem não tem não vê a área, como decidido no Portal v1. Não desenhei visão parcial dentro do Financeiro; a pergunta 4 trata das retiradas e salários.
18. **Celular.** O Financeiro mora no Mais, que fica marcado. As tabelas viram cartões, e as barras dos gráficos descem para baixo do rótulo, com o valor sempre visível. As janelas sobem de baixo, com os botões no rodapé.

## Acessibilidade (WCAG 2.2 AA)

- **Conferência automática** em 32 capturas (16 estados × computador e celular), feita pelo `fotos.cjs`. O resultado completo fica em `_conferencia.json`:
  - o axe (WCAG 2.0, 2.1 e 2.2, A e AA) não achou nenhuma violação;
  - nenhuma tela tem rolagem lateral;
  - nenhum erro de script.
- **Alvos.** Todos têm 44 px ou mais, e os botões compactos das tabelas no computador têm 36 px. A única exceção é a palavra-marca "T3jus" da moldura aprovada (24 px), igual à da área Clientes.
- **Contraste.** Só entram pares do D2 e do conceito Gabinete:
  - texto tinta sobre âmbar e sobre âmbar-3;
  - vinho escuro #4F1D35 nos números grandes sobre âmbar;
  - o dia "amanhã" no disco âmbar em vinho escuro, como no Portal v1;
  - branco sobre #AC3F6B nos selos de atraso.
- **Cor.** Nada depende só da cor. O atraso tem selo escrito com ícone e o filete; o dinheiro de terceiros tem escudo e rótulo; cada barra tem o valor escrito; previsto e realizado ficam em posições fixas (barra de cima e de baixo), com legenda.
- **Formulários.** Cada campo tem `label`, e os grupos ficam em `fieldset` com `legend`. Os erros ficam ligados por `aria-describedby`, com `aria-invalid` e um resumo no topo. Valores usam `inputmode="decimal"`, e as datas são texto dd/mm/aaaa.
- **Janelas.** São `<dialog>` com `showModal()`, e o Esc fecha. O foco vai para o primeiro campo, para o campo com erro, ou para a ação certa (Enviar, na prestação de contas; Voltar ao caso, no fechamento bloqueado). O fechamento bloqueado é `alertdialog`.
- **Tabelas.** Têm `caption` e `th` com `scope`. Os grupos de parcelas usam `scope="rowgroup"`.

## O que precisa de dado novo no servidor

Todas as tabelas têm `escritorio_id` e passam por `proteger_tabela_escritorio`. O escritório vem da sessão, nunca do navegador. Dinheiro sempre em centavos (inteiro).

### Tabelas

| Tabela | Campos | Observação |
|---|---|---|
| `parcela` | `id`, `escritorio_id`, `contrato_id`, `cliente_id`, `caso_id`, `numero`, `total`, `mes_referencia` (aaaa-mm), `vencimento`, `valor_centavos`, `forma` (pix, boleto, cartao, debito_automatico, dinheiro, cheque_pre, transferencia), `tipo_honorario` (contratual, mensal, exito, consulta…), `situacao` (aberta, paga, parcial, cancelada), `responsavel_id`, `versao` | Nasce do contrato (CH-02, CH-04). Sem edição de valor fora do contrato |
| `cobranca` | `id`, `escritorio_id`, `parcela_id`, `meio` (pix, boleto, link_cartao), `codigo`, `emitida_em`, `situacao`, `id_externo` | Baixa automática pelo aviso do banco (FI-17), registrada como recebimento com autor "sistema" |
| `cobranca_evento` | `id`, `escritorio_id`, `parcela_id`, `tipo` (lembrete_auto, ligacao, mensagem, anotacao), `motivo_atraso`, `prox_data`, `prox_oque`, `prox_responsavel_id`, `autor_id`, `criado_em` | Só inserção. A parcela vencida sem próxima ação aparece como pendência (FI-04, EX-10) |
| `recebimento` | `id`, `escritorio_id`, `parcela_id`, `valor_centavos`, `multa_juros_centavos`, `recebido_em` (dia em que entrou), `forma`, `caixa` (escritorio, terceiros), `autor_id`, `criado_em` | Baixa a parcela do `mes_referencia` dela; no caixa, conta em `recebido_em` (FI-02). Estorno é outro registro, nunca DELETE |
| `recibo` | `id`, `escritorio_id`, `recebimento_id`, `numero` (sequência por escritório e ano), `arquivo_id`, `enviado_whatsapp_em` | FI-14 |
| `anexo` | `id`, `escritorio_id`, `dono_tipo`, `dono_id`, `tipo` (comprovante, nota, guia, boleto, alvara), `arquivo`, `tamanho`, `criado_por`, `criado_em` | FI-18; entra na exportação |
| `conta_pagar` | `id`, `escritorio_id`, `descricao`, `fornecedor`, `categoria`, `valor_centavos`, `vencimento`, `forma`, `paga_em`, `recorrencia_id`, `cliente_id`, `caso_id`, `reembolso_como` (proxima_parcela, levantamento, a_parte), `versao` | Com `cliente_id` e `caso_id`, vira reembolso (FI-07) |
| `recorrencia` | `id`, `escritorio_id`, `modelo` (descrição, categoria, valor, dia), `ativa` | Rotina diária lança as contas do mês no dia 1º (FI-13), com o relógio da aplicação |
| `reembolso` | `id`, `escritorio_id`, `conta_pagar_id`, `cliente_id`, `caso_id`, `valor_centavos`, `situacao` (a_reembolsar, cobrado, reembolsado), `parcela_id` ou `levantamento_id` | Volta na parcela ou no levantamento |
| `levantamento` | `id`, `escritorio_id`, `caso_id`, `cliente_id`, `tipo` (alvara, rpv, precatorio, acordo, exito), `valor_centavos`, `entrou_em`, `data_estimada` (para os que ainda vão chegar), `situacao` (previsto, recebido, fechado) | Entra no caixa de terceiros. Os previstos alimentam a previsão de caixa (FI-09) |
| `destinacao` | `id`, `escritorio_id`, `levantamento_id`, `para` (cliente, escritorio_honorarios, escritorio_reembolso, perito, parceiro), `pessoa`, `regra` (texto da cláusula), `valor_centavos`, `prazo`, `situacao` (pendente, feito, dispensado), `motivo_dispensa`, `feito_em`, `comprovante_id` | A soma tem de ser igual ao `valor_centavos` do levantamento (checagem no banco). Dispensar exige motivo |
| `prestacao_contas` | `id`, `escritorio_id`, `levantamento_id`, `texto`, `valores` (o que foi mostrado), `enviada_em`, `lida_em`, `enviada_por` | Só inserção. O texto sai do registro, não é editável (FI-12) |
| `fechamento_caso` | `id`, `escritorio_id`, `caso_id`, `fechado_em`, `fechado_por` | Só grava com todas as parcelas pagas ou canceladas e todas as destinações feitas ou dispensadas (FI-08) |
| `exportacao_contador` | `id`, `escritorio_id`, `mes`, `formato`, `arquivo_id`, `enviada_para`, `gerada_por`, `gerada_em` | Também vai para o histórico do escritório |
| `escritorio` (acréscimo) | `contador_nome`, `contador_email`, `prazo_repasse_dias_uteis` | O prazo padrão de repasse é a pergunta 2 |

### API

| Rota | O que faz | Erros |
|---|---|---|
| `GET /v1/financeiro/resumo?mes=` | Totais do mês, vencido por idade, próximos 7 dias, repasses pendentes, comparação com 3 meses, por tipo e cobertura das fixas, tudo calculado no servidor | `AREA_NAO_LIBERADA` |
| `GET /v1/financeiro/parcelas?situacao=&responsavel=&forma=&agrupar=` | Lista a receber | — |
| `GET /v1/financeiro/contratos/:id/parcelas` | Parcelas, cobranças, eventos e reembolsos do contrato | 404 de outro escritório |
| `POST /v1/financeiro/parcelas/:id/recebimentos` | Registra e baixa; gera recibo e envia, se pedido | `VALOR_ACIMA_DO_SALDO`, `DATA_NO_FUTURO`, `PARCELA_JA_PAGA` |
| `POST /v1/financeiro/parcelas/:id/cobranca` | Emite Pix ou boleto | `MEIO_NAO_CONFIGURADO` |
| `POST /v1/financeiro/parcelas/:id/eventos` | Anota cobrança, motivo e próxima ação | `PROXIMA_ACAO_OBRIGATORIA` |
| `GET` e `POST /v1/financeiro/contas` | Lista e lança contas, com recorrência e reembolso | `CASO_OBRIGATORIO` quando é adiantada |
| `POST /v1/financeiro/levantamentos` | Registra o valor de terceiros e devolve a divisão proposta pelo contrato | `DIVISAO_NAO_FECHA`, `CASO_SEM_CONTRATO` |
| `POST /v1/financeiro/destinacoes/:id/feito` ou `/dispensar` | Repasse feito, com comprovante, ou dispensado, com motivo | `MOTIVO_OBRIGATORIO` |
| `POST /v1/financeiro/levantamentos/:id/prestacao` | Envia a prestação de contas pelo WhatsApp do escritório | `SEM_WHATSAPP`, `JA_ENVIADA` |
| `POST /v1/casos/:id/fechamento-financeiro` | Encerra o caso | `PENDENCIAS` (com a lista e os valores) |
| `GET /v1/financeiro/caixa?de=&ate=` | Saldos separados, previsto e realizado por mês, levantamentos com data estimada | — |
| `POST /v1/financeiro/exportacoes` | Gera o arquivo do mês e envia ao contador | `MES_ABERTO` (aviso, não bloqueio) |

### Para o painel

- A entrega desta área atende FI-01 a FI-09, FI-12, FI-13, FI-14, FI-17, FI-18, FI-20, FI-21, PD-03, PD-06, IN-02 a IN-05, IN-07, IN-09, IN-10 e IN-14.
- VA-01 é [VAL]: a tela cobre o fluxo, mas a ideia só muda de status depois dos pilotos.
- FI-10, FI-15 e FI-16 só têm lugar reservado: não citar como atendidas.
- Itens "pendente" para o painel:
  - FI-17 depende de um banco ou intermediário para Pix e boleto com aviso de pagamento. Sem ele, a baixa é manual;
  - FI-12 e FI-14 dependem do WhatsApp do escritório (o mesmo número da IA);
  - o vencido sem próxima ação avisar no Início do responsável (FI-04, PD-07).

## Perguntas para a Carol

1. **O dinheiro de terceiros precisa de conta bancária separada?** Proposta: no sistema, a separação é obrigatória (dois caixas que nunca se somam), mesmo que o dinheiro esteja na mesma conta do banco. Na implantação, recomendamos a conta separada, sem exigir. **Recomendo a proposta**: muitos escritórios pequenos usam uma conta só, e o que escapa hoje é a falta de controle, não a conta.
2. **Qual o prazo padrão para repassar ao cliente depois que o dinheiro entra?** **Recomendo 3 dias úteis**, ajustável pela sócia dona. O repasse vencido vira atraso, com motivo e próxima ação, como as parcelas.
3. **O escritório pode descontar do levantamento o que o cliente deve (parcela atrasada, custas)?** **Recomendo: só os reembolsos do próprio caso entram sozinhos na divisão.** Parcela atrasada de honorário só é descontada com o aceite do cliente registrado (a mensagem dele no WhatsApp, por exemplo). Isso evita conflito ético e reclamação na OAB.
4. **Quem tem a área Financeiro vê as retiradas dos sócios e os salários?** Nesta proposta, vê tudo. A outra opção é deixar as categorias "Retiradas dos sócios" e "Pessoal" visíveis só para a sócia dona, com o total do mês para os outros. **Recomendo a outra opção** se os pilotos tiverem uma pessoa de financeiro que não é sócia; senão, fica como está.
5. **FI-11 (divisão de honorários entre sócios) e FI-19 (acompanhar o levantamento) entram já?** As duas são [VAL] e não aparecem nesta rodada. **Recomendo esperar os pilotos.** FI-19 é a mais provável de entrar primeiro: caberia na ficha do repasse, antes do dinheiro chegar, com os documentos exigidos e a data de liberação.
