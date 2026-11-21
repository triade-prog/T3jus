# Portal: pendências pequenas (não receber avisos pela conversa e pago antes do T3jus) · notas

> **Aprovado pela Carol em 21/11/2026, às 9h02 (Bahia).** Ela respondeu "aprovado" sem mudar nada. As 7 perguntas do fim seguem a recomendação: mudar e retirar na conversa; a mensagem do cliente fica ligada ao registro; sem confirmação automática ao cliente; a IA perceber o pedido fica para uma próxima entrega; parcela que não foi paga se corrige desfazendo a importação nesta versão; quem tem Contratos vê a folha; 6 parcelas e "Mostrar as outras N".

Dois acréscimos pequenos em telas já aprovadas, para a Carol aprovar antes do código. Os dois mudam o mínimo.

- **Tela A, conversa do cliente: não receber avisos** (item F3.65, ideia PA-03). É o atalho que faltava, citado nas notas aprovadas de `portal-sem-avisos-sino` ("o registro pela conversa usa a mesma janela, com 'pelo WhatsApp' já marcado e origem CONVERSA"). Na conversa, a equipe registra o pedido na hora em que o cliente pede, sem ir à ficha.
- **Tela B, ficha do contrato, aba Recebimentos: pago antes do T3jus** (item F3.73, ideia VA-05). Mostra as parcelas que a importação de planilha trouxe como já pagas. Segue a decisão 23 e a pergunta 2 aprovadas na Importação: a parcela paga antes do T3jus não vira recebimento, fica no contrato como informação, fora do Caixa, fora dos totais e sem recibo.

Pesam também PA-01 (cada pessoa só vê o que pode abrir), PT-03 (nada é apagado), PT-09 (dinheiro em centavos) e PT-10 (WCAG 2.2 AA, celular, vazio e erros).

A base é o Portal v1 aprovado: a moldura, a barra de baixo no celular, o CSS e as peças, pelo `comum.py` e o `extra.py` sem mudança. A conversa é a de `portal-agenda-conversas` (Hélio, Marta, Joana, Antônia), com a barra de Conversas de três seções de `portal-conversas-automacoes`. A janela é a da ficha aprovada em `portal-sem-avisos-sino`. O contrato é o de `portal-comercial-contratos`, e os dados do contrato importado são os da Importação aprovada (Rosa Almeida, linha 2, 6 parcelas de R$ 800,00, 2 pagas antes). O elenco e o "hoje" são os de sempre: Ribeiro & Matos, Marina Ribeiro como sócia dona, quarta-feira, 18/11/2026, às 10h12. As peças novas têm prefixo `ca-` (conversa, avisos) e `pg-` (pago antes).

## Como abrir

- `index.html` mostra os 7 estados em computador (1440) e celular (412), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- `conversa-avisos.html` e `contrato-pago-antes.html` abrem sozinhos, com o CSS e os ícones embutidos. O estado vem do endereço, por exemplo `conversa-avisos.html?estado=janela` ou `contrato-pago-antes.html?estado=rosa`.
- Abaixo de 760 px, o HTML vira a versão de celular. Funcionam abrir e fechar as janelas (pelo botão, pelo X e pelo Esc), o "Sobre ..." do celular e o link "R$ 1.600,00 pagos antes", que desce até a folha. O resto é desenho.
- A pasta `_fonte/` guarda os scripts, e `sh _fonte/gerar.sh <pasta>` refaz tudo:
  - `comum.py` e `extra.py` são cópias sem mudança das aprovadas; `conversas.py`, `contratos.py` e `pecas.py` também. Os scripts novos leem `conversas.py` e `contratos.py` até o começo dos estados, sem gerar os HTML deles;
  - `sem_avisos.py` e `base.py` são as cópias sem mudança da ficha aprovada. São lidos só como texto, para reusar o CSS da janela (`sa-`) e os ícones do sino riscado;
  - `conversa_avisos.py` e `contrato_pago_antes.py` geram os dois HTML;
  - `casos.py` gera a lista de estados e o `index.html`; `fotos.cjs` (o mesmo do `portal-sem-avisos-sino`) faz as capturas e as conferências; `webp.py` converte para WebP.
- Todos os dados são fictícios.

## Decisões de design: tela A (conversa)

1. **O atalho fica no contexto da conversa**, numa seção "Avisos automáticos", logo depois de Cliente. É a seção aprovada "Avisos enviados", que muda de nome e sobe: em cima, o que vale ("Recebe os avisos automáticos. Saem para Marta, o contato principal.") e o botão "Não receber avisos"; embaixo, a lista aprovada dos avisos enviados. O pedido é sobre o cliente, e o contexto é onde a conversa fala do cliente. O cabeçalho da conversa e a barra de situação não mudam.
2. **No celular, a seção fica dentro de "Sobre ...", que passa a se chamar "Sobre Hélio, o caso e os avisos".** O nome diz que os avisos estão ali sem abrir. As capturas de celular mostram o "Sobre" aberto, para ver a seção.
3. **A janela é a aprovada da ficha, com quatro coisas já preenchidas pela conversa** (estado `ca-janela`):
   - em cima, **a mensagem que originou o pedido**, em Alegreya itálico, com quem escreveu e a hora. Ela fica ligada ao registro, como prova do pedido (pergunta 2);
   - **"Pelo WhatsApp", com "Nesta conversa"**, já marcado;
   - **quem pediu já sugerido: o contato que está escrevendo** (Marta, esposa, contato principal), com a marca "Escrevendo nesta conversa". Se quem escreve é o próprio cliente, vem o titular; se o número não é de um contato da ficha, vem "Outra pessoa" com o campo do nome;
   - **a data de hoje.**

   O tipo vem em "Só os avisos de cobrança", como na ficha. Tudo pode ser trocado: a pessoa pode estar registrando, na conversa, um pedido que chegou por telefone.
4. **Erros** (estado `ca-erro`): o desenhado é a falha do servidor. O aviso diz que nada foi salvo, que o que se escolheu continua na janela e dá o código para o suporte. Os erros de campo ("Outra pessoa" sem nome e data depois de hoje) são os aprovados da ficha (`sa-marcar-erros`), com resumo no topo e o erro preso ao campo. O botão nunca fica desabilitado.
5. **Registrado** (estado `ca-registrado`), três sinais, nenhum para o cliente:
   - o aviso de sucesso, com o que continua ("Lembretes e avisos de etapa continuam");
   - **o selo "Sem avisos de cobrança" no cabeçalho da conversa**, abaixo do nome. É o mesmo selo da ficha (âmbar claro, texto tinta, sino riscado). Quem abre a conversa vê na hora, antes de responder sobre parcela;
   - **uma linha da equipe na conversa**, como as linhas aprovadas de "A IA passou" e "Você assumiu", em âmbar claro: "Você registrou o pedido de Marta: sem avisos de cobrança." com a hora e "Só a equipe vê esta linha. Marta não recebe nada sozinha; se quiser, responda a ela abaixo." O T3jus não manda confirmação ao cliente (pergunta 3).

   A seção passa para a faixa "Fora dos avisos de cobrança desde 18/11/2026", com quem pediu, como e quem registrou ("Registrado por você, nesta conversa, hoje às 10h21"), o que continua, "Mudar o pedido", "Retirar o pedido" e "Ver o histórico na ficha". O lembrete de audiência de hoje continua na lista, como "Marcado": o pedido é só de cobrança.
6. **Cliente já fora dos avisos** (estado `ca-ja-fora`, Antônia): o selo fica no cabeçalho, e a seção mostra o pedido de 03/11 (Joana, pelo WhatsApp, registrado por Diego nesta conversa). O atalho vira **"Mudar o pedido" e "Retirar o pedido", que abrem as janelas aprovadas da ficha** ali mesmo, com Joana sugerida e "Pelo WhatsApp" marcado. O histórico completo fica só na ficha, pelo link. É a pergunta 1.
7. **Quem não tem a área.** Conversas é de toda a equipe (todos têm `conversas.ver` e `conversas.editar`), e a regra aprovada é que toda a equipe registra o pedido (pergunta 1 da tela aprovada). Por isso o estado `ca-ja-fora` é visto por Larissa, que só tem Jurídico: ela vê e usa o mesmo atalho. A seção não mostra valor nem parcela, só o tipo de aviso.
8. **Contato novo, que não está em Clientes** (como Rafaela): a seção não aparece. Nenhum aviso automático sai para quem não é cliente, e o pedido é guardado no cliente. Não ganhou estado, porque a tela é a aprovada (`novo-contato`) sem mudança.
9. **A lista de conversas não muda.** O selo fica só no cabeçalho e no contexto da conversa aberta, para a lista não ganhar mais um sinal.

## Decisões de design: tela B (contrato)

10. **Uma folha própria, "Pago antes do T3jus", logo abaixo da programação**, só quando o contrato tem parcela paga antes (estado `pg-rosa`). Ficar fora da folha da programação deixa claro que os totais de cima não as contam. As parcelas não se misturam com as linhas da programação.
11. **A folha diz a regra antes da lista**, numa faixa rebaixada com o escudo: "Só informação. Não entram nos totais acima, nem em A receber, nem no Caixa, e não geram recibo: o pagamento foi feito antes do T3jus, e a planilha não diz quando, como nem a quem."
12. **A lista usa a mesma tabela da programação** (vencimento, o quê, condição, valor), com a última coluna "Como veio" e o selo neutro "Paga antes do T3jus" no lugar de "Situação". O texto fica em tinta suave e, no computador, cada linha tem um filete `#AC788D`, o contorno de "previsto" do Gabinete, para ler como registro e não como dinheiro do escritório. No celular, vira cartões, como a programação.
13. **A soma vem numa linha à parte, "fora dos totais"** (R$ 1.600,00), e não no alto da aba.
14. **A origem:** a planilha (nome e linha), quem importou e quando (Marina Ribeiro, 17/11/2026, às 15h42) e o que a planilha dizia ("Parcelas pagas: 2", as 2 primeiras de 6), com "Ver a importação", que leva ao histórico aprovado de Clientes › Importações.
15. **Se a planilha estava errada**, a folha diz o caminho que já existe: "Alguma não foi paga? Até 24/11 dá para desfazer a importação, corrigir a planilha e importar de novo." (desfazer por 7 dias, decisão aprovada). Não há botão para passar uma parcela para A receber nesta versão (pergunta 5).
16. **"Recebido até hoje" ganha uma linha** quando há parcela paga antes: "Só o que passou pelo T3jus. Os R$ 1.600,00 pagos antes ficam fora.", com o link que desce até a folha. O resto da aba é o aprovado. O número da aba ("Recebimentos 4") conta só as parcelas programadas.
17. **Sem parcela paga antes** (estado `pg-sem`, Oficina Irmãos Dias, também importada): a folha não aparece, e a aba fica igual à aprovada.

## Acessibilidade (WCAG 2.2 AA)

- **Conferência automática** em 14 capturas (7 estados × computador e celular), feita pelo `fotos.cjs`. O resultado fica em `_conferencia.json`:
  - o axe (WCAG 2.0, 2.1 e 2.2, A e AA) não achou nenhuma violação;
  - nenhuma tela tem rolagem lateral;
  - nenhum erro de script;
  - todos os alvos têm 44 px ou mais. A única exceção é a palavra-marca "T3jus" no trilho (24 px), da moldura aprovada, a mesma já registrada.
- **Janela:** `<dialog>` com rótulo e descrição; rádios em `fieldset` com `legend`; a mensagem do cliente vem num `q`, com quem e quando escrito ao lado. "Escrevendo nesta conversa" é texto, não só cor. O erro do servidor usa `role="alert"`.
- **Selo e linha da equipe:** o selo tem texto ("Sem avisos de cobrança") além do ícone; a linha da equipe diz em palavras que só a equipe a vê.
- **Contrato:** a folha nova é uma `section` com `h2` e `aria-labelledby`; a tabela tem `caption`. "Paga antes do T3jus" vem escrito em cada linha, e a regra vem em texto, não só no estilo da linha.
- **Contraste:** só entram pares do D2 e do Gabinete. A faixa "Fora" e a linha da equipe usam tinta e vinho sobre `#F2CDB3` (11,2:1 e 7,15:1); o selo usa tinta sobre `#E9AE90` (8,6:1); a faixa da regra usa tinta sobre `#F2ECE8`; o texto suave `#6E5562` passa de 5,5:1 nos fundos claros.

## O que muda no servidor

As tabelas têm `escritorio_id` e passam por `proteger_tabela_escritorio`. O escritório vem da sessão, nunca do navegador. Nada se apaga.

### Tela A

- **Rota que já existe:** `POST /v1/escritorio/clientes/:id/sem-avisos`, com `origem: "CONVERSA"`, `canal: "WHATSAPP"` (ou o que a pessoa escolher), `quem`, `contatoId` e `pedidoEm`. Exige `conversas.editar`, que toda a equipe tem. Mudar e retirar usam a mesma rota, como na ficha.
- **Campo novo em `clientes_sem_avisos`:** `mensagem_id` (opcional, referência à mensagem da conversa que originou o pedido), e `mensagemId` no `semAvisosSchema`. O banco confere que a mensagem é do mesmo escritório e de uma conversa desse cliente. Depende da pergunta 2; sem ele, a janela mostra a mensagem só como lembrete.
- **A conversa (`GET` da conversa, tipo `Conversa`) passa a trazer:**
  - `contatoId` de quem escreve (hoje vêm só `quemEscreve`, `papel` e `principal`), para a janela sugerir quem pediu;
  - `semAvisos`: o pedido ativo do cliente (`tipo`, `pedidoEm`, quem pediu, canal, quem registrou, `origem`), ou nulo, para o selo e a seção;
  - `podeMudarAvisos` (o mesmo `podeMudar` da ficha).
- **Linha da equipe na conversa:** eventos novos `SEM_AVISOS_REGISTRADO`, `SEM_AVISOS_MUDADO` e `SEM_AVISOS_RETIRADO` em `EventoConversa`, gravados quando o registro vem com `origem` CONVERSA. São só da equipe: nada sai pelo WhatsApp.

### Tela B

- **Nenhuma tabela nova.** Os dados já existem: `recebimentos_previstos.pago_antes`, `contratos.importacao_id`, `importacoes.arquivo_nome`, `criado_por` e `importado_em`, e `importacao_linhas.numero` com `contrato_id`.
- **A ficha do contrato (`GET` do contrato, `FichaContrato`) passa a trazer:**
  - `pagoAntes: boolean` em cada `RecebimentoPrevisto`. Hoje a linha vem como cancelada, com o motivo "Paga antes do T3jus (importação)", e a tela real a mostra na programação como cancelada. Com o campo, `janelaProgramacao` tira essas linhas de `mostrar`, e a folha nova as lista;
  - `importacao`: `{ id, arquivo, linha, por: { id, nome }, em, desfazerAte, desfeita }`, quando o contrato veio de uma importação.
- **Totais:** "Recebido até hoje", "Programado" e o número da aba continuam sem as linhas `pago_antes` (já estão canceladas). O Caixa, A receber e os recibos não mudam.
- **Permissão:** quem vê a aba Recebimentos vê a folha (pergunta 4).

### Para o painel

- A tela A atende o item pendente de PA-03 (o atalho na conversa), F3.65.
- A tela B atende F3.73 (VA-05). Corrigir uma parcela paga antes que não foi paga fica como item "pendente" de VA-05, se a Carol pedir (pergunta 5).

## Perguntas para a Carol

### Tela A: conversa

1. **Para cliente já fora dos avisos, a conversa deixa mudar e retirar ali mesmo, ou só leva à ficha?** **Recomendo mudar e retirar na conversa**, com as janelas aprovadas da ficha. O "pode voltar a mandar" chega pelo mesmo lugar que o "pare de mandar". O histórico completo continua só na ficha, pelo link.
2. **A mensagem do cliente que originou o pedido fica ligada ao registro?** **Recomendo que sim.** É a prova de quem pediu, quando e com que palavras, se o cliente disser depois que não pediu. Ela aparece na janela e no histórico da ficha. Pede o campo `mensagem_id`.
3. **O T3jus manda ao cliente uma confirmação automática do pedido?** **Recomendo que não.** A linha na conversa é só da equipe, e quem registrou responde com as próprias palavras, se quiser. Mensagem automática logo depois de o cliente pedir para não receber mensagem automática soa mal.
4. **A IA deve perceber o pedido ("parem de me mandar mensagem") e passar a conversa para a equipe, com o motivo "Pedido para não receber avisos"?** **Recomendo que sim, numa próxima entrega**, como mais um motivo de passar. A IA não registra sozinha: quem registra é sempre uma pessoa, com o atalho desta tela. Fica fora deste desenho.

### Tela B: contrato

5. **E se a planilha disse que a parcela foi paga e não foi?** **Recomendo, nesta versão, só o caminho que já existe:** desfazer a importação em até 7 dias, corrigir a planilha e importar de novo. Depois disso, entra um botão "Não foi paga: passar para A receber", só para quem tem Financeiro, com motivo e no histórico (item pendente de VA-05).
6. **Quem tem Contratos e não tem Financeiro (Felipe) vê a folha "Pago antes do T3jus"?** **Recomendo que sim.** É o que se combinou e o que a planilha trouxe, e quem importa contratos precisa ter Contratos. Não é dado do Caixa: não tem data, forma nem quem recebeu.
7. **Contrato com muitas parcelas pagas antes (uma mensalidade de anos):** **recomendo mostrar as 6 mais recentes e "Mostrar as outras N"**, com a soma sempre de todas.
