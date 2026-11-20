# Cobrança dos escritórios (CO-06) · notas

Este é o desenho da frente CO-06, para a Carol aprovar antes de virar código. Ele mostra como o T3jus cobra os escritórios que o assinam:

- os planos;
- a assinatura na ficha;
- as faturas mensais com Pix, boleto ou carnê;
- a régua de lembretes;
- o tratamento do atraso;
- a parte do Portal em que o sócio dono vê e paga as faturas.

Também pesa PT-03 (nada some em silêncio), PT-10 (WCAG 2.2 AA, celular e estados) e PT-24 (cada função só faz o que pode).

**Todos os preços são de exemplo** e aparecem com o selo "Valores de exemplo". O meio de pagamento e a nota fiscal não foram escolhidos: as telas deixam um lugar reservado para eles (veja "Depende de").

**Exemplos, com hoje em 20/11/2026:**

| Escritório | Papel no desenho |
|---|---|
| Cedro & Lima Advocacia | A ficha aprovada. Passou para Ativo em 18/11/2026, quando a cobrança começou. Plano Escritório, 9 pessoas (1 a mais) e desconto de implantação de 20% nas 3 primeiras faturas. A fatura de dezembro sai assim: R$ 490,00 + R$ 39,00 − R$ 98,00 = **R$ 431,00**, com vencimento em 10/12/2026. |
| Bacuri Advocacia Trabalhista | O atraso. Plano Fundador, arquivado; o Bacuri continua nele pelo preço de R$ 190,00. Tem outubro (41 dias) e novembro (10 dias) em aberto, total de R$ 380,00. Passa por aviso, só consulta e volta. |
| Mangaba Advocacia | Encerrado em 02/08/2026, com a fatura de julho em aberto (133 dias). |
| Ribeiro & Matos Advocacia | O Portal, o mesmo escritório dos desenhos aprovados. Sócia dona: Marina Ribeiro. No estado do carnê, paga por carnê desde outubro (todo dia 10) e pagou adiantada a parcela de janeiro. |
| Pequi Advocacia | O carnê no Console. Ativo desde 15/09/2026, plano Escritório, todo dia 5. Carnê 2026/2027: 12 parcelas de R$ 490,00, de outubro de 2026 a setembro de 2027; parcelas 1 e 2 pagas, a 3 (dezembro) emitida. Desde 18/11 tem 9 pessoas, o que leva ao carnê novo de R$ 529,00. |

**Planos de exemplo:**

| Plano | Preço | Pessoas incluídas |
|---|---|---|
| Essencial | R$ 290,00 | até 3 |
| Escritório | R$ 490,00 | até 8 |
| Banca | R$ 890,00 | até 15 |
| Fundador | R$ 190,00 | até 5 (arquivado) |

Em todos os planos, cada pessoa a mais custa R$ 39,00, e todas as áreas do Portal estão incluídas.

Os números do resumo fecham entre si:

- **A receber em novembro:** R$ 1.738,00.
- **Recebido em novembro:** R$ 1.380,00. Somado ao que falta receber, dá os R$ 3.118,00 que vencem no mês.
- **Em atraso:** R$ 1.928,00 em 5 faturas de 4 escritórios. Por idade:
  - até 30 dias: R$ 1.448,00;
  - 31 a 60 dias: R$ 190,00;
  - 61 a 90 dias: R$ 0,00;
  - mais de 90 dias: R$ 290,00.

## Como abrir

- `index.html` mostra os **51 estados** em computador (1440 px) e celular (412 px). Clique numa imagem para abrir o HTML naquele estado.
- Os quatro HTML abrem sozinhos, com as fontes, o CSS e os ícones embutidos:
  - **`cobranca.html` (novo).** Console › Cobrança, montado sobre a moldura aprovada da Equipe T3jus.
    - Abas: `?aba=faturas`, `fatura`, `planos` e `regua`, com `&estado=…`.
    - `&papel=financeiro`, `implantacao` ou `suporte` muda quem vê.
  - **`ficha.html`.** A ficha aprovada com a aba nova Assinatura: `?aba=assinatura&estado=cb-em-dia`, `cb-sem`, `cb-atraso`, `cb-so-consulta`, `cb-carne`…
  - **`carteira.html`.** `?estado=cb-ver` e `?estado=cb-atraso`.
  - **`portal-escritorio.html`.** `?estado=cb-plano`, `cb-carne`, `cb-atraso`, `cb-so-consulta`, `cb-so-consulta-equipe`…
- Os estados aprovados continuam lá, com os mesmos endereços. Abaixo de 760 px, tudo vira a versão de celular.
- Os links "Equipe" do trilho e o logo do Portal apontam para as páginas aprovadas (`equipe.html` e `moldura.html`), que não estão nesta pasta.
- `_fonte/` guarda os scripts, e `sh _fonte/gerar.sh <pasta>` refaz tudo. Os HTML aprovados são **lidos** de `docs/design/aprovadas/console-fim-contrato/` e nada lá foi alterado.
  - `comum_cb.py` tem o CSS novo, os ícones e as peças.
  - `dados_cb.py` tem os planos e as faturas, em centavos, com as somas conferidas por `assert`.
  - `cobranca_cb.py`, `ficha_cb.py`, `carteira_cb.py` e `portal_cb.py` geram as páginas.
  - `casos_cb.py` gera a lista e o índice.
  - `fotos_cb.cjs` faz as capturas e a conferência.
  - `webp.py` converte as capturas.
- **A marca é a de hoje:** o `LogoCompacto` das telas aprovadas. O logo não foi redesenhado.
- **Conferência** (`_conferencia.json`): 92 capturas com 0 violação do axe-core 4.10 (WCAG 2.0, 2.1 e 2.2, A e AA), 0 rolagem lateral, 0 alvo menor que 44 px e 0 erro de script. As exceções são as mesmas dos desenhos aprovados:
  - links dentro de texto e links de nome nas tabelas, com 24 px ou mais (WCAG 2.5.8);
  - o campo de arquivo escondido, cujo alvo é o rótulo "Escolher arquivo";
  - os botões compactos "Copiar", também com 24 px ou mais.
- Os dados são fictícios. Os e-mails estão em `exemplo.com.br`. O Pix copia e cola, o QR e a linha do boleto são de exemplo.

### Os 51 estados

| # | Estado | Endereço | O que mostra |
|---|---|---|---|
| 1 | faturas | `cobranca.html?aba=faturas&estado=ver` | Resumo (a receber, recebido, em atraso, atraso por idade) e lista filtrável por situação e forma (Pix, Boleto, Carnê), com as mais urgentes primeiro |
| 2 | faturas-atraso | `…aba=faturas&estado=atraso` | Filtro "Em atraso" ligado |
| 3 | faturas-financeiro | `…aba=faturas&estado=ver&papel=financeiro` | Financeiro vê e age igual à Administração |
| 4 | faturas-vazio | `…aba=faturas&estado=vazio` | Nenhuma fatura ainda |
| 5 | faturas-carregando | `…aba=faturas&estado=carregando` | Esqueleto com `aria-busy` |
| 6 | faturas-erro | `…aba=faturas&estado=erro` | Falha ao carregar, com código e "Tentar de novo" |
| 7 | sem-permissao | `…aba=faturas&papel=suporte` | "Esta página é de Administração e Financeiro" (igual para Implantação) |
| 8 | fatura | `…aba=fatura&estado=ver` | Fatura aberta da Cedro & Lima: itens, Pix e boleto, histórico, ações, nota fiscal reservada |
| 9 | fatura-atraso | `…aba=fatura&estado=atraso` | Bacuri, 41 dias, com o quadro de atraso e "Passar o Portal para só consulta" |
| 10 | fatura-lembrete | `…aba=fatura&estado=lembrete&papel=financeiro` | Lembrete manual enviado; o histórico ganha a linha |
| 11 | fatura-pagar | `…aba=fatura&estado=pagar` | Janela "Registrar pagamento" (data, valor, forma, comprovante, motivo) |
| 12 | fatura-pagar-erros | `…estado=pagar-erros` | Erro de campo: resumo no topo e erro em cada campo |
| 13 | fatura-pagar-enviando | `…estado=pagar-enviando` | "Registrando…" com `aria-busy` |
| 14 | fatura-pagar-falha | `…estado=pagar-falha` | Falha de rede: nada mudou, o texto fica, código para o suporte |
| 15 | fatura-pagar-conflito | `…estado=pagar-conflito` | Marta Quintela registrou às 14h32: comparação e "Fechar e conferir" |
| 16 | fatura-paga | `…estado=paga` | Paga, com o registro manual no histórico e o recibo enviado |
| 17 | fatura-cancelar | `…estado=cancelar` | `alertdialog` com motivo: a fatura não é apagada |
| 18 | fatura-cancelada | `…estado=cancelada` | Cancelada, com o motivo e quem cancelou |
| 19 | fatura-carne | `…aba=fatura&estado=carne` | Pequi, dezembro: "Parcela 3 de 12 do carnê 2026/2027", com o link do carnê; o Pix e o boleto são os da página 3 |
| 20 | planos | `…aba=planos&estado=ver` | Catálogo, pessoa a mais, arquivados e quantos escritórios assinam cada plano |
| 21 | planos-editar | `…aba=planos&estado=editar` | Editar plano: o preço novo vale só para assinaturas novas |
| 22 | planos-criar-erros | `…aba=planos&estado=criar-erros` | Criar plano com erros de campo |
| 23 | planos-arquivar | `…aba=planos&estado=arquivar` | Arquivar em vez de apagar; quem assina continua |
| 24 | planos-financeiro | `…aba=planos&estado=ver&papel=financeiro` | Só leitura: "Quem cria, muda e arquiva planos é a Administração." |
| 25 | planos-vazio | `…aba=planos&estado=vazio` | Nenhum plano criado |
| 26 | regua | `…aba=regua&estado=ver` | A régua (−20, −3, 0, +3, +7, +15, +30), o e-mail de exemplo e o que nunca acontece sozinho |
| 27 | assinatura | `ficha.html?aba=assinatura&estado=cb-em-dia` | Cedro & Lima em dia: plano, pessoas, dia, forma, desconto, faturas |
| 28 | assinatura-suporte | `…cb-em-dia&papel=suporte` | Implantação e Suporte: plano e situação, sem valores nem faturas |
| 29 | assinatura-sem | `…estado=cb-sem` | Em implantação: sem assinatura, "Preparar a assinatura" |
| 30 | assinatura-editar | `…estado=cb-editar` | Editar a assinatura (dia, forma: Pix, Boleto ou Carnê, e-mail de cobrança, desconto) |
| 31 | assinatura-editar-erros | `…estado=cb-editar-erros` | Erros de campo |
| 32 | assinatura-conflito | `…estado=cb-conflito` | Conflito de versão |
| 33 | assinatura-mudar-plano | `…estado=cb-mudar-plano` | Escritório → Banca: vale na fatura de janeiro, que sai por R$ 712,00, sem proporcional |
| 34 | assinatura-atraso | `…estado=cb-atraso` | Bacuri, 41 dias: aviso já no Portal, proposta de só consulta |
| 35 | assinatura-consulta-confirmar | `…estado=cb-so-consulta-confirmar` | `alertdialog`: Portal normal → só consulta, motivo obrigatório |
| 36 | assinatura-consulta | `…estado=cb-so-consulta` | Só consulta desde hoje; faixa em todas as abas; "Devolver o acesso agora" |
| 37 | assinatura-encerrado | `…estado=cb-encerrado` | Mangaba encerrado com fatura em aberto: régua parada, lembretes só manuais |
| 38 | assinatura-carne | `…estado=cb-carne` | Pequi paga por carnê: o carnê atual (período, parcelas pagas e a vencer), "Baixar o carnê (PDF)", "Gerar novo carnê" e o aviso de que o valor mudou |
| 39 | assinatura-editar-carne | `…estado=cb-editar-carne` | Editar com a forma Carnê (Pix, Boleto ou Carnê) e a regra do carnê novo |
| 40 | assinatura-carne-novo | `…estado=cb-carne-novo` | `alertdialog` "Gerar um carnê novo": 12 × R$ 490,00 → 12 × R$ 529,00; parcelas 4 a 12 canceladas com motivo |
| 41 | assinatura-erro | `…estado=cb-erro` | Falha ao carregar a aba |
| 42 | carteira | `carteira.html?estado=cb-ver` | "Fatura em atraso · N dias" na lista e nos cartões, mais o filtro |
| 43 | carteira-atraso | `…estado=cb-atraso` | Filtro ligado: só os 3 em atraso, do maior atraso para o menor |
| 44 | portal-plano | `portal-escritorio.html?estado=cb-plano` | Plano e faturas (só a sócia dona) |
| 45 | portal-pagar | `…estado=cb-pagar` | Janela de pagar: Pix e boleto |
| 46 | portal-carne | `…estado=cb-carne` | Pago por carnê, visto pela dona: próxima parcela, o carnê com as parcelas, "Baixar o carnê" e uma parcela paga adiantada |
| 47 | portal-atraso | `…estado=cb-atraso` | Faixa de atraso só para a dona, no alto de todas as páginas |
| 48 | portal-consulta | `…estado=cb-so-consulta` | Só consulta, visto pela dona: pagar devolve o normal |
| 49 | portal-consulta-equipe | `…estado=cb-so-consulta-equipe` | Só consulta, visto pela equipe: "fale com Marina Ribeiro, a sócia dona" |
| 50 | portal-vazio | `…estado=cb-vazio` | Nenhuma fatura ainda |
| 51 | portal-erro | `…estado=cb-erro` | Falha ao carregar as faturas |

A contagem é de 48 estados desenhados e mais 3 que mostram os desenhos a outra função (3, 24 e 28). Os estados 19, 38, 39, 40 e 46 são do carnê, pedido pela Carol depois da primeira versão. Cada um tem a captura em computador e em celular. O celular está em todos. O modo escuro não foi desenhado, como nos desenhos aprovados.

## Quem vê o quê

| | Administração | Financeiro | Implantação e Suporte | Portal: sócio dono | Portal: resto da equipe |
|---|---|---|---|---|---|
| Item "Cobrança" no trilho | sim | sim | não aparece (pelo endereço, "Esta página é de Administração e Financeiro") | — | — |
| Faturas: ver, registrar pagamento, lembrete, cancelar | sim | sim | não | vê e paga as suas | não |
| Planos: criar, editar, arquivar | sim | só vê | não | vê o seu plano | não |
| Aba Assinatura: plano e situação | sim | sim | **sim, sem valores nem faturas** | — | — |
| Assinatura: preparar, editar, mudar de plano | sim | sim | não | pede ao T3jus | — |
| Carnê: ver, baixar, gerar carnê novo | sim | sim | não (vê só a forma, Carnê, sem valores) | vê e baixa o seu | não |
| Passar o Portal para só consulta e devolver antes do pagamento | **só Administração**, com motivo | não | não | — | — |
| Carteira: situação "Fatura em atraso · N dias" | sim | sim | sim (só os dias, sem valor) | — | — |
| Faixa de atraso (7 dias ou mais) | — | — | — | sim | não vê |
| Faixa de só consulta | — | — | — | sim, com "Pagar" | sim, com "fale com a sócia dona" |

**Decisão sobre Implantação e Suporte.** As duas funções veem, na aba Assinatura, o plano, as pessoas, o dia e a situação: Em dia, Em atraso há N dias ou Só consulta. Isso basta para atender quem liga perguntando por que o Portal está só para consulta. Valores, faturas e o histórico de mudanças ficam escondidos, com a linha "Você vê o plano e a situação da cobrança. Valores, faturas e mudanças ficam com a Administração e o Financeiro." Se elas abrirem Cobrança pelo endereço, veem a página de sem permissão com o link para a carteira.

## Decisões de design

### Console › Cobrança

1. **Item novo no trilho**, depois de Clientes, com a contagem de faturas em atraso que pedem ação.
2. **Faturas.**
   - No alto, três números grandes: a receber no mês, recebido no mês e em atraso. Ao lado, o atraso por idade em quatro faixas, com valor e quantidade.
   - Embaixo, a lista com busca, escritório, vencimento e filtros por situação com a contagem.
   - A ordem é: em atraso (do mais antigo para o mais novo), vence hoje, a vencer, pagas e canceladas.
   - Cada situação tem texto e ícone, nunca só a cor: Em atraso · N dias, Vence hoje, A vencer, Paga e Cancelada. De 30 dias em diante, o selo muda de cor e de ícone.
3. **Fatura aberta.**
   - **Abertura:** o escritório, a competência, o selo, o plano, o vencimento e a forma. No lado âmbar, o total.
   - **Itens:** mensalidade, pessoa a mais (com a conta de quem estava ativo no dia da emissão) e desconto (com quem lançou e o motivo), em reais com os centavos exatos.
   - **"Como pagar":** QR, Pix copia e cola e boleto, com o aviso de que são exemplo.
   - **Histórico:** só cresce. "O sistema" aparece com o ponto vazado. No fim, os próximos lembretes da régua.
   - **Ao lado:** "O que fazer", "Para quem vai" e o link para a assinatura.
4. **Registrar pagamento manual** é para quem pagou fora da cobrança. A janela pede:
   - data, hoje ou antes;
   - valor, igual ao da fatura (sem pagamento parcial nesta versão);
   - forma;
   - comprovante, opcional;
   - **motivo obrigatório**, com contador.

   O rodapé diz o que acontece: a fatura passa a Paga e o recibo vai para o e-mail de cobrança. Enviando, falha e conflito seguem os padrões aprovados.
   - **Conflito:** diz quem registrou e a que horas, e avisa que registrar de novo contaria duas vezes.
   - **Falha:** diz que nada mudou e mostra o código para o suporte.
   - O botão nunca fica desabilitado.
5. **Cancelar** é um `alertdialog` com motivo. A fatura não é apagada: fica Cancelada, com o motivo e o nome de quem cancelou. O Pix e o boleto deixam de valer, a régua para e o escritório recebe um e-mail sem o motivo.
6. **Lembrete agora** manda na hora o e-mail da régua, com todas as faturas em aberto, e grava a linha no histórico.
7. **Nota fiscal** é um lugar reservado, tracejado, com o botão "Ver a nota fiscal" ainda sem uso e a linha "Ainda não emitimos nota pelo sistema". No Portal, cada fatura paga mostra "Nota: em breve".
8. **Planos.**
   - Cartões com preço, pessoas incluídas, áreas, quantos escritórios assinam e quais.
   - "Pessoa a mais" é um valor único para todos os planos.
   - **Arquivar em vez de apagar:** o plano arquivado some para novas assinaturas, mas quem assina continua nele, pelo mesmo preço. Dá para desarquivar.
   - **Mudar o preço vale só para novas assinaturas.** A regra aparece no alto da aba e na janela de edição, que nomeia quem continua no preço antigo.
   - Só a Administração cria, edita e arquiva. O Financeiro vê a aba só para leitura.
9. **Régua de cobrança.** É fixa nesta versão e igual para todos os escritórios:

   | Dia | O que acontece |
   |---|---|
   | −20 | Fatura emitida: e-mail e Portal |
   | −3 | Lembrete |
   | 0 | Vence hoje |
   | +3 | "Se já pagou, desconsidere" |
   | +7 | E-mail e faixa no Portal, só para o sócio dono |
   | +15 | Último lembrete automático |
   | +30 | O Console propõe só consulta, e a Administração decide |

   Ao lado fica "O que nunca acontece sozinho": nada é apagado, o Portal só fica só para consulta com confirmação, a exportação fica sempre liberada e o contrato não é encerrado por atraso. O e-mail de exemplo é curto e educado, sem ameaça e sem juros.

### Console › ficha: aba Assinatura

10. **A aba nova** fica entre "Contrato e documentos" e "Equipe T3jus". Ela mostra:
    - **na folha principal:** plano, mensalidade, pessoas ativas hoje (por exemplo, "9 de 8, 1 a mais"), dia de vencimento, forma, início da cobrança, e-mail de cobrança, CNPJ da nota e desconto com o motivo;
    - **embaixo:** "Mudanças da assinatura" e "Faturas do escritório";
    - **ao lado:** "Situação da cobrança" e "Como funciona".
11. **Sem assinatura (em implantação):** dá para preparar o plano, o dia e o desconto, mas nenhuma fatura sai antes de o cliente passar para Ativo.
12. **Mudar de plano** mostra Hoje → Novo e a primeira fatura no plano novo, com os itens. A mudança vale na próxima fatura ainda não emitida, sem proporcional. A fatura já emitida não muda, e a assinatura guarda o preço do dia. O motivo é obrigatório.
13. **Em atraso:** um quadro com os dias num disco e as faturas em aberto com o total. Desde o dia 7, o aviso no Portal aparece para a sócia dona. Passados 30 dias, aparece a proposta "Passar o Portal para só consulta".
14. **Só consulta:**
    - A janela é um `alertdialog` (Portal normal → Só consulta) e diz o que muda: a equipe entra e vê, ninguém cria nem muda, nada é apagado, a dona continua baixando os dados e pagando, e pagar devolve o Portal ao normal sozinho.
    - O motivo é obrigatório.
    - Depois de confirmado, uma faixa aparece em todas as abas da ficha, e a Administração ganha "Devolver o acesso agora", com motivo, para quando a sócia já mandou o comprovante.
15. **Encerrado com fatura em aberto (Mangaba):** a faixa do encerrado aprovado continua, e a fatura fica Em atraso. Com o contrato encerrado, a régua para e os lembretes passam a ser só manuais. Ainda dá para registrar o pagamento ou cancelar a fatura.

### Carnê (pedido pela Carol)

16. **Leitura adotada:** o carnê é a terceira forma de pagamento da assinatura, ao lado de Pix e boleto. O escritório recebe de uma vez, em PDF, um carnê de **12 parcelas**, uma por mês, todas com o mesmo valor e vencimento no dia escolhido. Cada parcela tem o próprio Pix e boleto. **As faturas continuam uma por mês:** cada parcela é a fatura daquele mês, emitida 20 dias antes do vencimento, com os mesmos códigos da página do carnê. A régua de lembretes, o atraso e o só consulta valem igual.
17. **Na ficha (estado 38):** a forma aparece como "Carnê" e, embaixo da assinatura, a folha do carnê atual:
    - o nome e o período ("Carnê 2026/2027 · 12 parcelas de R$ 490,00 · outubro de 2026 a setembro de 2027 · todo dia 5");
    - pagas, a pagar e o total, com uma barra que também está em texto;
    - as 12 parcelas como canhotos: Paga (com a data), Próxima (com a fatura emitida) e A vencer, sempre com texto e ícone, nunca só pela cor;
    - "Baixar o carnê (PDF)" e "Gerar novo carnê" (Administração e Financeiro).
18. **Editar (estados 30 e 39):** Forma de pagamento passa a ter Pix, Boleto e Carnê. Com Carnê, aparecem "Parcelas por carnê" (12) e o carnê em uso, com a regra do carnê novo.
19. **Carnê novo (estado 40):** um `alertdialog` com o foco em Cancelar, Hoje → Novo, o que acontece com cada parcela e motivo obrigatório.
20. **Fatura aberta (estado 19):** a forma no alto é "Carnê · parcela 3 de 12". Uma faixa diz "Parcela 3 de 12 do carnê 2026/2027", com "Baixar o carnê (PDF)" e "Ver o carnê". "Como pagar" avisa que são os mesmos códigos da página do carnê.
21. **Lista de faturas:** "Carnê" na coluna Forma, com ícone próprio, e um filtro novo de forma (todas, Pix, Boleto, Carnê).
22. **Portal (estado 46):** a sócia dona vê "Próxima parcela 3 de 12" com "Pagar" e "Baixar o carnê", o carnê com as parcelas e a lista das faturas, que diz a parcela de cada uma. O exemplo tem a parcela de janeiro paga adiantada.

**Regras do carnê:**

- **Mudar de plano, de valor ou de dia com o carnê em uso gera um carnê novo** a partir da próxima parcela não paga. As parcelas antigas ainda não pagas são **canceladas com motivo, nunca apagadas**: ficam na assinatura como Canceladas.
  - Ajuste que o desenho fez: se a fatura dessa parcela já foi emitida, ela continua valendo com o valor dela, porque a regra aprovada é que a fatura emitida não muda. O carnê novo começa na parcela seguinte. No exemplo, dezembro (parcela 3, já emitida) continua por R$ 490,00, as parcelas 4 a 12 são canceladas e o carnê novo vai de janeiro a dezembro de 2027, a R$ 529,00.
- **Pagar parcela adiantada é permitido.** A parcela fica Paga e a fatura do mês já nasce paga. Se depois vier um carnê novo, a parcela paga continua paga, sem diferença a cobrar nem a devolver (a mesma regra de "sem proporcional").
- **O valor da parcela fica fixo.** Se o número de pessoas muda o valor, a mensalidade nova só entra com um carnê novo, a partir da próxima parcela sem fatura. O Console avisa na folha do carnê, e a Administração ou o Financeiro geram o carnê novo, com motivo. O mesmo vale para o fim de um desconto.
- **Renovação:** 20 dias antes da última parcela, sai o próximo carnê de 12, se a Carol confirmar (pergunta 6).
- Mudar só o e-mail ou o CNPJ não mexe no carnê.

### Console › carteira

23. **A situação nova "Fatura em atraso · N dias"** aparece no lugar de "Em dia" na lista e nos cartões, com selo de atenção até 29 dias e de urgência a partir de 30. Entra também o filtro "Fatura em atraso (3)".
    - **Não entra em "Com pendência"**, que conta só o que falta na implantação. Assim, os números aprovados da carteira não mudam.
    - Com o filtro ligado, o rodapé leva a "Ver as faturas em Cobrança", e só quem tem permissão vê esse link.

### Portal › Escritório › "Plano e faturas"

24. **Só o sócio dono vê** a folha nova no alto da página Escritório. Ela tem:
    - o plano e o preço;
    - as pessoas incluídas e as ativas hoje;
    - o dia e a forma de pagamento;
    - a próxima fatura com "Pagar" e "Baixar a fatura";
    - a lista das faturas, com "Pagar" nas abertas e "Recibo" nas pagas.

    Mudar de plano é "fale com o T3jus".
25. **Atraso (7 dias ou mais):** uma faixa no alto de todas as páginas, só para a dona: "A fatura de novembro venceu em 10/11/2026. Só você, a sócia dona, vê este aviso." Leva a "Ver e pagar".
26. **Só consulta:**
    - **A sócia dona** vê a tira em todas as páginas, com "Ver e pagar", e o lado da fatura vira "Portal só para consulta", com "Pagar outubro" e "Falar com o T3jus".
    - **O resto da equipe** vê a tira "O escritório tem uma pendência com o T3jus. Você continua vendo tudo, mas não cria nem muda nada. Para voltar ao normal, fale com Marina Ribeiro, a sócia dona." Não aparecem valores nem faturas.
    - Os botões de criar e mudar somem, como no só leitura aprovado.
27. **No celular**, a barra de baixo aprovada continua igual. As tiras ficam no alto, e "Plano e faturas" vira cartões, um por fatura, com "Pagar" na largura toda.

## Recomendação para o atraso (proposta para a Carol confirmar)

- **7 dias:** e-mail e faixa no Portal, só para o sócio dono. A equipe dele não vê.
- **15 dias:** último lembrete automático. Daí em diante, só manual.
- **30 dias:** o Console mostra "Passar o Portal para só consulta". **Nunca acontece sozinho:** a Administração confirma, com motivo. Ninguém cria nem muda nada, **nenhum dado é apagado** e a exportação continua aberta para o sócio dono.
- **Ao pagar:** quando o pagamento é confirmado, pelo meio de pagamento ou por registro manual, o Portal volta ao normal sozinho, a faixa some e a régua para.
- **Atraso não encerra o contrato.** Encerrar continua sendo a ação da aba Contrato.

## Para quem for programar (servidor)

- **Dinheiro sempre em centavos** (inteiro), nunca em ponto flutuante. A soma dos itens é o total da fatura e é conferida no servidor. As datas de vencimento são datas sem hora, no horário de Brasília.
- **Tabelas novas.**
  - `planos` é o catálogo do T3jus e não é dado de escritório, por isso não tem `escritorio_id`. Campos: `nome`, `preco_centavos`, `pessoas_incluidas`, `arquivado_em` e `versao`.
  - O valor da pessoa a mais fica numa configuração (`pessoa_a_mais_centavos`).
  - Todas as outras tabelas têm `escritorio_id` e passam por `proteger_tabela_escritorio`:
    - `assinaturas`: uma ativa por escritório, com `plano_id`, `preco_centavos` (o preço de quando assinou), `pessoas_incluidas`, `dia_vencimento`, `forma` (`PIX`, `BOLETO` ou `CARNE`), `email_cobranca`, `desconto_pct`, `desconto_ate`, `desconto_motivo`, `inicio_cobranca`, `parcelas_por_carne` (quando a forma é `CARNE`), `portal_so_consulta_desde` e `versao`;
    - `faturas`: `numero`, `competencia`, `vencimento`, `total_centavos`, `situacao` (`A_VENCER`, `PAGA` ou `CANCELADA`; o atraso é calculado), `paga_em`, `forma_paga`, `cancelada_motivo` e `versao`;
    - `fatura_itens`: `tipo` (`MENSALIDADE`, `PESSOA_A_MAIS` ou `DESCONTO`), `descricao`, `quantidade`, `valor_centavos`;
    - `fatura_eventos`: **só inserção**, sem UPDATE nem DELETE, nem para o dono das tabelas. Guarda autor (pessoa ou "o sistema"), tipo, dados e hora;
    - `carnes`: `assinatura_id`, `numero` (como "2026/2027"), `primeira_competencia`, `parcelas` (12), `valor_parcela_centavos`, `dia_vencimento`, `pdf_path`, `gerado_em`, `substituido_por` e `motivo` quando é trocado por um carnê novo;
    - `carne_parcelas`: `carne_id`, `numero` (1 a 12), `competencia`, `vencimento`, `valor_centavos`, `pix_copia_cola`, `linha_boleto`, `situacao` (`A_VENCER`, `PAGA` ou `CANCELADA`), `fatura_id` (preenchido quando a fatura do mês é emitida ou quando a parcela é paga adiantada), `cancelada_motivo` e `cancelada_por`. Parcela não se apaga;
    - `pagamentos_manuais`: `fatura_id`, `pago_em`, `valor_centavos`, `forma`, `comprovante_path`, `motivo` e `registrado_por`.
  - No Portal, o escritório vem sempre da sessão.
- **Ações novas de permissão.**

  | Ação | Quem | O que libera |
  |---|---|---|
  | `console.cobranca.ver` | Administração e Financeiro | Faturas e valores |
  | `console.cobranca.editar` | Administração e Financeiro | Registrar pagamento, lembrete, cancelar, preparar e editar a assinatura, mudar de plano, gerar carnê novo |
  | `console.planos.editar` | só Administração | Criar, editar e arquivar planos |
  | `console.portal.so_consulta` | só Administração | Passar o Portal para só consulta e devolver antes do pagamento |
  | `portal.faturas.ver` | sócio dono | Ver e pagar as faturas do escritório |

  Implantação e Suporte recebem só o plano e a situação da assinatura, por um campo resumido.
- **Rotas, como proposta.**
  - `GET /v1/console/faturas` (filtros e resumo) e `GET /v1/console/faturas/:id`.
  - `POST …/faturas/:id/pagamento-manual`, `…/lembrete` e `…/cancelar`.
  - `GET|POST|PATCH /v1/console/planos` e `POST …/planos/:id/arquivar`.
  - `GET|PATCH /v1/console/escritorios/:id/assinatura`, `POST …/assinatura/mudar-plano`, `POST …/portal-so-consulta` e `…/portal-normal`.
  - `GET …/escritorios/:id/carnes/atual`, `GET …/carnes/:id/pdf` e `POST …/assinatura/carne-novo` (corpo `motivo` e `versao`; responde com as parcelas canceladas e o carnê novo).
  - `GET /v1/portal/escritorio/faturas` e `GET /v1/portal/escritorio/carne` (com o PDF), só para o sócio dono.
- **Códigos de erro:** `SEM_PERMISSAO`, `MOTIVO_OBRIGATORIO`, `DATA_NO_FUTURO`, `VALOR_DIFERENTE_DA_FATURA`, `FATURA_JA_PAGA`, `FATURA_CANCELADA`, `PLANO_ARQUIVADO`, `PRECO_INVALIDO`, `CARNE_SEM_PARCELA_A_TROCAR` e `CONFLITO_VERSAO`. O conflito vem com quem mudou e a que horas, como o conflito aprovado da ficha.
- **Rotina diária (F0.13):**
  - emite a fatura 20 dias antes do vencimento, contando quem está ativo no dia; a primeira sai no dia em que o cliente passa para Ativo;
  - manda os lembretes da régua e grava cada envio em `fatura_eventos`;
  - acende o aviso do Portal no dia 7;
  - lista na carteira e em Cobrança quem passou de 30 dias;
  - com carnê, emite a fatura do mês com os códigos da parcela, liga `fatura_id` e gera o próximo carnê 20 dias antes da última parcela.

  A rotina **não** passa o Portal para só consulta e **não** apaga nada. Com o contrato encerrado, não emite faturas novas nem manda lembretes.
- **Só consulta:** reusa o modo só leitura do fim do contrato. Toda escrita do escritório responde 403 `PORTAL_SO_CONSULTA`, menos a exportação e o pagamento. A moldura do Portal recebe `cobranca {atraso_dias, so_consulta_desde}` para as faixas, e o resto da equipe não recebe valores.
- **Carnê novo:** numa transação só, cancela as parcelas sem fatura e não pagas do carnê atual (com motivo e autor, sem apagar), gera o carnê novo a partir da próxima competência sem fatura e grava os eventos. A parcela já paga não muda. Uma parcela paga adiantada cria a fatura do mês já paga, com a parcela ligada.
- **Pagamento confirmado** (pelo meio de pagamento ou manual): a fatura passa a Paga e o evento é gravado. Se não sobrar fatura com mais de 30 dias em aberto, o servidor limpa `portal_so_consulta_desde` na mesma transação, com o evento "O sistema devolveu o acesso".

## Depende de

- **Meio de pagamento (gateway de Pix e boleto):** não foi escolhido. O QR, o Pix copia e cola, a linha do boleto, o PDF do boleto e a baixa automática são lugares reservados. As telas dizem "Exemplo: o código e o boleto de verdade vêm do meio de pagamento, que ainda não foi escolhido."
- **Carnê em PDF:** os códigos de cada parcela (Pix e boleto) e o PDF do carnê vêm do meio de pagamento. Falta saber se ele emite carnê ou se o T3jus monta o PDF com os boletos de cada parcela.
- **Emissor de nota fiscal:** não foi escolhido. O lugar da nota fica reservado na fatura do Console e no Portal ("Nota: em breve").
- **Remetente dos e-mails de cobrança** (`cobranca@exemplo.com.br`) e **contato do T3jus** (`atendimento@exemplo.com.br`): os dois são provisórios.
- **Preços reais dos planos:** os da tela são de exemplo.

## Para o painel

- A entrega que programar isto atende CO-06. Se o meio de pagamento, a nota fiscal ou o carnê ficarem para depois, cada um precisa de um item "pendente" que cite CO-06.
- A ideia CO-06 no `IDEIAS.md` ainda diz "faturas mensais com Pix ou boleto", sem o carnê. Quem atualizar o `IDEIAS.md` acrescenta "ou carnê". O desenho não mexeu no repositório.

## Decisões da Carol (20/11/2026)

Aprovado pela Carol em 20/11/2026 às 8h31 (Bahia), com o carnê pedido por ela às 7h56. Ela respondeu "aprovado" sem mudanças, então as 6 recomendações abaixo valem como decisões até ela dizer o contrário: faixas por número de pessoas com todas as áreas; cobrança a partir do dia em que o escritório passa para Ativo; sem período grátis (desconto de implantação com motivo); aviso aos 7 dias e só consulta aos 30 com confirmação da Administração; o sócio dono paga pelo Portal com Pix, boleto ou carnê; carnê de 12 parcelas, o próximo saindo 20 dias antes da última. Os preços continuam fictícios.

## Perguntas para a Carol (respondidas acima)

1. **Modelo de preço:** faixas por número de pessoas, com valor por pessoa a mais? (Recomendo três faixas, com todas as áreas incluídas e um valor único por pessoa a mais, contada no dia da emissão.)
2. **Quando a cobrança começa:** no dia em que o cliente passa para Ativo? (Recomendo que sim: a primeira fatura sai nesse dia e vence no dia escolhido do mês seguinte; nada é cobrado na implantação.)
3. **Período grátis:** vai haver? (Recomendo que não, e que se use um desconto de implantação por tempo limitado, lançado na assinatura com motivo, como o de 20% nas 3 primeiras faturas da Cedro & Lima.)
4. **Regra do atraso:** aviso ao sócio dono com 7 dias e só consulta com 30, sempre confirmado pela Administração? (Recomendo que sim, sem nada automático além do aviso, sem apagar dados e com a volta ao normal sozinha ao pagar.)
5. **Pagamento no Portal:** o sócio dono paga por lá? (Recomendo que sim, com Pix e boleto da própria fatura, só para o sócio dono; cartão fica para depois da escolha do meio de pagamento.)
6. **Carnê:** quantas parcelas por carnê? (Recomendo 12, renovado no fim: o próximo carnê sai 20 dias antes da última parcela.)
