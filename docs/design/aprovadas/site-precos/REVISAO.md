# Site comercial · página "Planos e preços": revisão do plano

Revisão independente de `t3jus/telas/site-precos/plano.md` (versão 1, 27/11/2026), feita em 27/11/2026. Conferi as contas de novo, o código do banco (`0690_cobranca_escritorios.sql`, `1170_carne_desconto_por_parcela.sql`), o painel (`docs/painel/dados/`, inclusive `situacao.json`, F1.21, F1.24, F1.28, F1.29, F1.31, F1.38, F1.44, F1.48, DC12 e DC14), o `IDEIAS.md` (seções 9 e 10), o site em `sistema/apps/site`, os desenhos aprovados (`site-comercial`, `textos-tom`, `portal-whatsapp`), a proposta e a revisão de preços, os planos v2 do CO-08 e do CO-09, o texto do Decreto 7.962/2013 no Planalto e o Provimento 205/2021 no site da OAB.

## Veredito: aprovar com mudanças

O plano é sério, honesto na maior parte e bem amarrado ao painel. As contas dos planos, das faixas e do desconto estão certas. Mas ele tem um erro de fato sobre o servidor, algumas promessas que o sistema ainda não cumpre, citações legais trocadas, uma resposta sobre a assistente virtual que contradiz o desenho aprovado do WhatsApp e, sobretudo, é longo demais para o sócio de um escritório pequeno decidir sozinho. Nada disso pede refazer: pede cortar, corrigir e decidir pela recomendação a maior parte das 13 perguntas.

---

## 1. Contas refeitas

### 1.1 O que confere

| Conta | Resultado | Confere |
|---|---|---|
| Essencial com 4 e 5 pessoas | R$ 299 + R$ 69 = R$ 368; R$ 299 + R$ 138 = R$ 437 | Sim |
| Essencial com 6 pessoas contra Escritório | R$ 506 contra R$ 499 | Sim, o Escritório ganha a partir de 6 |
| Escritório com 7, 8 e 9 pessoas | R$ 568, R$ 637, R$ 706 | Sim |
| Escritório com 10 pessoas contra Banca | R$ 775 contra R$ 749 | Sim, a Banca ganha a partir de 10 |
| Escritório com 11 contra Banca com 11 | R$ 844 contra R$ 818 | Sim, a Banca segue mais barata |
| Banca com 11 e 12 | R$ 818 e R$ 887 | Sim |
| Diferença para quem tem 4 pessoas e contrata o Escritório | R$ 499 − R$ 368 = R$ 131 | Sim |
| Desconto de 20% | R$ 239,20, R$ 399,20 e R$ 599,20 | Sim |
| Desconto de 30% | R$ 209,30, R$ 349,30 e R$ 524,30 | Sim |
| 4 pessoas com desconto | R$ 239,20 + R$ 69 = R$ 308,20; R$ 209,30 + R$ 69 = R$ 278,30 | Sim |
| Exemplo do desconto (Escritório, 6 pessoas, 30%) | R$ 349,30 nos meses 1 a 3 e R$ 499,00 depois | Sim |
| Desconto só sobre o plano, arredondado por centavo | `round(p_preco * p_desconto_pct / 100.0)` sobre o preço do plano, sem tocar na pessoa a mais (`0690:497`, `1170:108`) | Sim |

Com R$ 69 por pessoa a mais, os pontos de virada caem exatamente em 6 e 10 pessoas, os mesmos limites dos planos de cima. É uma tabela coerente.

### 1.2 O que não confere

**a) O servidor não escolhe o plano mais barato.** O plano diz, na seção 2.4, que a calculadora segue regras "iguais às do servidor: conta o plano mais barato para o número de pessoas". Não é verdade. `cobranca_itens` (`0690:478-505`, refeita em `1170:90-118`) cobra o preço do plano **contratado** mais as pessoas a mais acima do limite dele. Um escritório no Essencial que cresce para 6 pessoas paga R$ 506, e não R$ 499, até alguém trocar o plano. A proposta de preços já tinha apontado isso (risco 5: "o sistema não troca de plano sozinho"). A página precisa dizer a regra real, numa frase: "A fatura segue o plano que você contratou. Se a equipe crescer, você pode pedir a troca de plano." E não pode prometer aviso automático, porque ele não existe.

**b) Com o desconto ligado, a faixa de 9 pessoas vira.** Nos 3 primeiros meses, com 9 pessoas, o Escritório sai R$ 606,20 (20%) ou R$ 556,30 (30%), e a Banca sai R$ 599,20 ou R$ 524,30. Ou seja, nesses meses a Banca fica mais barata. Do 4º mês em diante o Escritório volta a ganhar (R$ 706 contra R$ 749), e em 12 meses ele continua mais em conta (R$ 8.172,60 contra R$ 8.538,60, com 20%). Se a página mostrar o valor com desconto ao lado do plano indicado, um leitor atento vê a contradição. Regra para o desenho: o plano indicado sai sempre do preço cheio, e o desconto aparece como frase à parte, sem recalcular a indicação.

**c) "De R$ 299 a R$ 749 por mês" está errado como faixa.** A chamada nova de Para quem é (seção 1.4) diz isso, mas com 11 pessoas o valor é R$ 818. Deve ser "A partir de R$ 299 por mês".

**d) Os preços ainda não estão no Console.** A migration 0690 grava a pessoa a mais em R$ 39 (`0690:86`), e o item F1.21 ainda lista "preços reais" como pendente. Como o preço publicado vincula a oferta (CDC, art. 30), a página só pode ir ao ar quando o catálogo do Console já tiver R$ 299, R$ 499, R$ 749 e R$ 69. Isso é condição de publicação, não pergunta.

**e) "Quem conta como pessoa".** `pessoas_ativas_portal` conta toda pessoa com vínculo do Portal não revogado, no momento em que os itens são calculados (a fatura sai 20 dias antes do vencimento, `0690:36`). Isso inclui quem foi convidado e ainda não entrou, se o vínculo já existe no convite. A resposta da pergunta frequente 1 deve dizer "toda pessoa com acesso liberado, mesmo quem ainda não entrou", ou o programador confirma antes que o convite pendente não conta.

---

## 2. Promessas sobre o que não está no ar

O plano acerta no principal: o teste fica atrás de chave, o WhatsApp leva "Em preparação", a nota fiscal não é prometida. Ainda sobram estes pontos:

1. **Troca de plano (CO-12) e reajuste (CO-11) não existem no sistema**, nem como item no painel. O reajuste só acontece 12 meses depois da primeira assinatura, então há tempo. A troca, não: pode ser pedida no primeiro mês, e a "diferença proporcional dos dias que faltavam" hoje teria de ser feita à mão. A página pode anunciar a regra como condição do contrato, mas a entrega precisa de um item pendente no painel citando CO-12 e o procedimento manual escrito para a equipe.
2. **Reajuste incompleto.** A CO-11 diz que sobem pelo IPCA "o preço do plano e o da pessoa a mais". O texto do plano fala só do preço. Precisa citar os dois.
3. **O critério dos 30% usa uma função "Em preparação".** O texto "para quem traz os dados de outro sistema jurídico, como o Astrea ou o ADVBOX, com a nossa ajuda" amarra o desconto à importação do Astrea e do ADVBOX, que o Início mostra como "Em preparação" (falta conferir com arquivos reais). O critério deve ser independente da importação: "para quem usa hoje outro sistema jurídico pago". Tirar os nomes dos concorrentes também resolve a contradição com a regra que o próprio plano escreve na seção 3.2.
4. **Pix e boleto pelo Inter (F1.21) estão desligados.** Em vez de pergunta à Carol, uma chave: a lista de formas de pagamento mostra só o que funciona no dia da publicação. A frase "O boleto é registrado pelo Banco Inter" sai até o boleto existir.
5. **"Os valores já incluem os impostos" na abertura** é afirmada antes da pergunta 13 e da nota fiscal (F1.24, pendente). Prometer imposto incluído enquanto não se emite nota é confuso para quem compra como empresa. A frase certa, que vale de qualquer jeito, é "É o valor final da fatura, sem nada somado."
6. **"Respondemos em até 1 dia útil"** já está no site (Demonstração), então pode ficar.
7. **"Avisaremos aqui o fim da oferta com pelo menos 30 dias de antecedência"** é uma promessa que depende de alguém mudar o site à mão. O sino do Console avisa a Administração 30 dias antes de `isencao_ate` (CO-08, `implantacao_rotina`), mas o site não. Ou o procedimento entra no `LEIA-ME.md` do site como passo obrigatório, ou a frase sai.
8. **Implantação "para quem começar até {data}".** Pela CO-08 v2, a condição congela quando a implantação abre, no primeiro acesso de um sócio. O texto precisa dizer isso: "para escritórios que fizerem o primeiro acesso até {data}".
9. **A linha "Na primeira fatura aparecem as duas linhas"** só entra com F1.44 e F1.48 no ar, como o próprio plano diz. Deve virar chave, e não nota de rodapé do plano.
10. **Teste: o que acontece depois do 8º dia.** O plano diz "o acesso de consulta dura 30 dias e depois fecha". Pela DC12, o Portal fica só para consulta a partir do 8º dia até a Administração encerrar, e só daí contam os 30 dias. O texto certo: "Sem assinatura, o Portal fica só para consulta. Quando a nossa equipe encerrar o teste, você tem 30 dias para baixar os dados. Depois, os dados ficam guardados por 12 meses e são apagados."
11. **Fundador citado fora do bloco do Fundador.** A nota do desconto (2.7) diz "nem junto com o plano Fundador". Sem aprovação da Carol, o Fundador não aparece em lugar nenhum da página, nem em nota.
12. **Backup.** O `situacao.json` lista "backup diário e produção separada (plano pago)" como pendente. O plano não promete backup, e está certo. O desenho não pode acrescentar "backup diário" ou "segurança de banco" na lista do que está incluído.

---

## 3. Publicidade para advogados (Código de Ética e Provimento 205/2021)

O enquadramento do plano está correto: o T3jus é fornecedor de software e não anuncia serviço jurídico, mas não pode vender ao advogado algo que o leve a infringir o Provimento. Conferi o texto do Provimento 205/2021 e do Anexo Único no site da OAB.

1. **A resposta "A assistente virtual atende novos clientes? Não." está errada.** O desenho aprovado do WhatsApp (`portal-whatsapp/NOTAS.md`, item 17) diz que, quando um número desconhecido escreve, "a IA se apresenta, pergunta nome e assunto, não fala de caso nenhum e passa para o Comercial". Ela atende, sim, o primeiro contato. E isso é permitido: o Anexo Único do Provimento admite o chatbot "para facilitar a comunicação", inclusive nas primeiras dúvidas de quem procura o escritório, desde que não substitua a pessoalidade nem o poder de decisão do advogado, e veda responder automaticamente consultas jurídicas de não clientes. O texto certo é: "Quando um número novo escreve, ela se apresenta, pergunta o nome e o assunto e passa a conversa para a equipe. Ela não responde consulta jurídica e não fala de caso. O T3jus não envia propaganda nem mensagem em massa."
2. **Mala direta e lista de transmissão.** O Anexo Único proíbe mala direta e só admite mensagem individual a cliente, contato pessoal ou quem pediu. Como as automações do Portal mandam lembretes a clientes, a frase "não envia mensagem em massa" precisa ser verdadeira no produto: lembrete a cliente da própria ficha não é massa, mas a página não deve sugerir "avisos para todos os contatos".
3. **Vocabulário.** O plano proíbe "captação", "funil" e "leads" na página, o que está certo. Atenção só ao nome da área "Comercial": ele aparece na lista do que está incluído e está bem. Não descrever a área com "atraia clientes" ou "converta".
4. **Revisão pela advogada parceira (VA-07)** antes de publicar: correto, manter.

---

## 4. Consumidor (CDC e Decreto 7.962/2013)

1. **As citações do Decreto estão trocadas.** No texto do Planalto, o art. 2º tem: I nome empresarial e CNPJ; II endereço físico e eletrônico; III características essenciais do serviço; IV discriminação, no preço, das despesas adicionais; V condições integrais da oferta, com pagamento, disponibilidade, forma e prazo de execução; VI informações claras e ostensivas sobre restrições à fruição da oferta. O plano cita o inciso V para as despesas adicionais (é o IV), "IV e V" para características e preço (são III e IV) e o VI para condições e pagamento (é o V). O VI, que o plano não usa, é justamente o que cobre o limite de pessoas, o custo da Meta e o que ainda está "Em preparação". Corrigir na seção 2.10 e na 4.3.
2. **O escritório nem sempre é consumidor.** Quem contrata software para a atividade costuma não ser consumidor final (teoria finalista), salvo vulnerabilidade comprovada. O plano faz bem em seguir o CDC "como se valesse", mas a página não deve afirmar um direito legal ("o direito de desistir em 7 dias da contratação a distância"). Melhor oferecer como condição própria, mais simples e mais generosa: a revisão de preços já sugeriu "garantia de desistência antes do primeiro vencimento". Isso fica na pergunta do cancelamento.
3. **Preço de referência da implantação.** Mostrar "R$ 1.490,00" ao lado de "grátis" é exigência da CO-08 e da DC14, então fica. Mas um serviço que nunca foi vendido pelo valor cheio, anunciado como "provisório", vira âncora de preço. Para não ser lido como desconto fictício (CDC, art. 37, §1º): o valor só vai ao site quando deixar de ser provisório, sem riscado e com a frase do que acontece quando a oferta acabar ("depois da oferta, o valor é cobrado à vista na primeira fatura", que é a regra da DC14).
4. **"Carnê de 12 parcelas".** Para o leitor, "parcelas" sugere financiamento ou compromisso de 12 meses. O carnê é só a emissão antecipada das 12 mensalidades. Escrever "carnê com as 12 mensalidades do ano, cada uma com Pix e boleto", e a pergunta do cancelamento precisa dizer o que acontece com as parcelas futuras se o escritório sair.
5. **Uso razoável da IA.** Se houver qualquer limite que possa bloquear ou cobrar, ele é restrição à fruição (art. 2º, VI) e precisa estar na página. Se o limite é só um alerta interno, a página não fala de limite. Recomendo decidir assim, sem perguntar: "sem cobrança por resposta da assistente", e nenhum limite que bloqueie.
6. **Rodapé com razão social, CNPJ e endereço.** Correto e barato. Não é pergunta: é pedido de dados à Carol, e a página não sai sem eles.

---

## 5. Clareza para o sócio decidir sozinho

O sócio de um escritório de 3 a 10 pessoas precisa de três respostas: quanto fica para a minha equipe, o que está incluído e o que pode mudar o valor. O plano responde às três, mas espalha a resposta em 13 seções, 11 perguntas frequentes, uma calculadora e uma tabela. Pontos de clareza:

1. **A tabela basta; a calculadora é redundante.** São 11 linhas (1 a 3, 4, 5 e assim por diante até 12). Ela responde à pergunta principal sem script, sem `aria-live`, sem estado de erro, sem CLS e sem os estados 5, 6, 7 e 8 do desenho. Recomendo trocar a calculadora pela tabela sempre visível, com uma linha abaixo para o desconto ("Nos 3 primeiros meses, o plano sai 20% mais barato: Essencial R$ 239,20, Escritório R$ 399,20, Banca R$ 599,20"). Se a Carol quiser a calculadora, ela entra depois, como melhoria. Além disso, o `<details>` aberto sem script e fechado quando o script carrega empurra o conteúdo, o que contradiz a meta de CLS 0 do próprio plano.
2. **Dois números por cartão confundem.** "Até 6 pessoas" e "sai mais em conta para 6 a 9" no mesmo cartão parecem contradição. Manter as duas informações, mas com hierarquia: o fato grande ("R$ 499 por mês, 6 pessoas incluídas") e, menor, "Mais em conta para equipes de 6 a 9 pessoas". A tabela logo abaixo explica.
3. **Sem destaque de plano.** O plano destaca o Escritório com faixa vinho, campo âmbar e botão principal, mas a tabela indica o Essencial para equipes de 3 a 5, que é boa parte do público. Destacar o plano do meio sem dado de escolha é empurrar o leitor, e o motivo dado ("é onde o WhatsApp pesa mais na comparação com o mercado") é interno. Recomendo os três cartões iguais, com o mesmo botão, e o ponto de atmosfera do Gabinete no bloco da implantação ou na chamada final. Isso também tira a pergunta 12.
4. **Ordem no celular:** a natural (Essencial, Escritório, Banca), em ordem de tamanho. Não pôr o Escritório primeiro.
5. **Botões "Começar com o Essencial".** Como a assinatura é confirmada pela equipe (DC12) e hoje o botão abre o e-mail, "Começar" promete mais do que entrega. Usar "Quero o Essencial" (ou "Falar sobre o Essencial"), e mostrar o endereço `contato@t3jus.pro` escrito ao lado, porque no celular muitas pessoas não têm aplicativo de e-mail configurado e o `mailto` não abre nada.
6. **"Todos os planos têm o mesmo atendimento".** "Atendimento" no T3jus é o nome do WhatsApp com a assistente. Para não confundir com suporte, escrever "as mesmas áreas e o mesmo suporte da nossa equipe".
7. **Lista do que está incluído coerente com o Início.** O Início mostra "Início por áreas" e "Petições a partir de modelos" como "No T3jus", e "Trazer os dados do Astrea e do ADVBOX" como "Em preparação". A lista da página de preços deve trazer os mesmos itens com os mesmos selos, sem inventar agrupamentos novos.

---

## 6. Tamanho da página: o que cortar

### 6.1 Seções

| Seção do plano | Recomendação |
|---|---|
| 2.1 Abertura | Manter. Tirar "já incluem os impostos" e usar "valor final". |
| 2.2 Três planos | Manter, sem destaque. |
| 2.3 O que todo plano inclui | Manter, igual ao Início. |
| 2.4 Calculadora | Trocar pela tabela fixa (ver 5.1). |
| 2.5 Teste de 7 dias | Manter atrás da chave; hoje some. |
| 2.6 Implantação | Manter, curta: um parágrafo e o bloco de valor. |
| 2.7 Desconto de entrada | Encolher para uma faixa só, com as duas condições e o exemplo, sem duas folhas. |
| 2.8 Fundador | **Tirar do plano e do desenho**, inclusive a chave e o estado 12. Não tem aprovação da Carol. Se ela aprovar um dia, entra como plano novo da página. |
| 2.9 e 2.10 Pagamento, condições e Meta | Juntar numa seção só, "Como você paga e o que pode mudar". Tirar "Sem plano anual por enquanto" (anuncia o que não existe). |
| 2.11 Perguntas frequentes | Cortar de 11 para 6 (abaixo). |
| 2.12 Chamada final | Manter. |

### 6.2 Perguntas frequentes: de 11 para 6

As perguntas 6 (troca) e 7 (reajuste) repetem a seção de condições. A 8 (nota fiscal) nem entra enquanto não houver decisão. A 2 e a 3 viram uma só. A 10 e a 11 viram uma só. Ficam:

1. Quem conta como pessoa?
2. O WhatsApp com a assistente já funciona, e quem paga as mensagens?
3. A assistente atende quem ainda não é cliente? (com o texto corrigido da seção 3.1 desta revisão)
4. Quando pago a primeira mensalidade? (com teste: "vence no mês seguinte ao fim do teste, no dia que você escolher"; sem teste: "vence no mês seguinte ao começo")
5. E se eu quiser sair? (cancelamento, carnê e exportação dos dados)
6. O T3jus recebe o dinheiro dos meus clientes?

O FAQPage em JSON-LD pode ficar por coerência com Para quem é, mas sem expectativa de ganho: o Google deixou de mostrar resultado rico de perguntas frequentes para a maior parte dos sites em 2023.

### 6.3 Perguntas à Carol: de 13 para 4, mais um pedido de dados

| # | Pergunta do plano | Recomendação |
|---|---|---|
| 1 | Mostrar o Fundador | Decidido pelo que ela já disse: não aparece. Sai. |
| 2 | Mostrar o desconto de entrada | Decidir pela recomendação: mostrar, atrás da chave, quando P32 estiver publicado. Sai. |
| 3 | Critério dos 30% | **Fica.** Proponho "usa hoje outro sistema jurídico pago, conferido pela equipe", sem depender da importação. |
| 4 | Quem paga a Meta | **Fica.** É decisão de negócio com custo sem teto. |
| 5 | Limite da IA | Decidir pela recomendação: sem cobrança por resposta e sem limite que bloqueie. Sai. |
| 6 | Fidelidade e cancelamento | **Fica**, juntando o carnê e a garantia de desistência antes do primeiro vencimento. |
| 7 | Nota fiscal | **Fica**, com o contador. Até a resposta, a página não fala de nota nem de imposto. |
| 8 | Publicar antes do Inter | Vira chave das formas de pagamento. Sai. |
| 9 | CNPJ no rodapé | Decidir pela recomendação: sim. Vira pedido de dados (razão social, CNPJ, endereço). |
| 10 | Mostrar o R$ 1.490 | Já decidido na CO-08 e na DC14. Vira condição: só quando o valor deixar de ser provisório. Sai. |
| 11 | Data do fim da isenção | Já decidido na DC14 (data de lançamento gravada no Console; sem data, grátis). Sai. |
| 12 | Destaque do Escritório | Decidir pela recomendação desta revisão: sem destaque. A Carol vê no desenho. Sai. |
| 13 | Impostos incluídos | Decidir: a página diz "valor final, sem nada somado". Sai. |

### 6.4 Estados do desenho: de 18 para 10

Com a tabela no lugar da calculadora e sem o Fundador, saem os estados 5, 6, 7, 8 e 12. Os estados 9, 10, 11 e 13 cabem numa única prancha "blocos com chave, ligados e desligados". Ficam: página de hoje, página completa, cartões e abertura de perto, incluído de perto, tabela, blocos com chave, perguntas frequentes, chamada final, menu (1440 px, 1021 px e celular) e as chamadas nas outras páginas. O "menos movimento" entra como verificação, sem prancha própria.

---

## 7. Coerência com o site e a identidade

1. **Contraste.** Os pares citados conferem com o Gabinete: `#6E5562` é o texto secundário de 5,5:1 (`conceito-gabinete.md:61` e `site.css:14`); tinta 6,83:1 e `#4F1D35` 5,56:1 sobre âmbar; vinho só em texto grande sobre âmbar (4,38:1). Nada a corrigir.
2. **Tom.** Seguir `textos-tom`: sem exclamação, sem travessão, sem seta, "você", palavras sem gênero. O plano já segue. "Sócio dono" é o uso do site e pode ficar.
3. **Menu.** A ordem "O sistema, Como funciona, Para quem é, Preços, Entrar, Pedir demonstração" encaixa no `Topo.astro` atual. O desenho confere a largura de 1021 px, como o plano diz.
4. **Formulário de demonstração.** O plano diz que `/demonstracao?plano=escritorio` "já marca o tamanho da equipe". Os botões de tamanho aprovados são "Só eu", "2 a 5", "6 a 10" e "Mais de 10", que não batem com as faixas dos planos (1 a 5, 6 a 9, 10 ou mais). O plano não deve pré-marcar o tamanho: grava só o plano como origem, quando o formulário ligar.
5. **Para quem é está desatualizado.** A resposta "Preciso largar o sistema que uso hoje?" diz que importar de outros sistemas "ainda é planejado", mas o Início já mostra Astrea e ADVBOX como "Em preparação". Como a entrega já mexe em Para quem é, corrigir no mesmo commit (SC-03).
6. **Selos.** A legenda e os três selos são os do Início. Correto.

---

## 8. Acessibilidade e celular

1. **Preço lido pelo leitor de tela.** Esconder o preço visível com `aria-hidden` e repetir num texto escondido funciona, mas quebra o controle por voz e a tradução automática. Prefiro deixar o preço visível legível ("R$ 499 por mês") e acrescentar, escondido, só o que falta ("6 pessoas incluídas, R$ 69 por pessoa a mais"). Os leitores de tela em português leem "R$ 499" como valor em reais na maior parte das vozes; o desenho confere com NVDA e VoiceOver.
2. **Tabela no celular.** Três colunas (Pessoas, Plano, Por mês) cabem em 390 px. Uma quarta coluna de desconto não cabe sem rolagem lateral; por isso o desconto vai em frase abaixo da tabela.
3. **Zoom a 200%** e alvos de 44 px: corretos no plano, manter.
4. **Cartões empilhados no celular** ficam longos. Cada cartão deve caber em uma tela de 390 por 844 px: nome, preço, pessoas incluídas, a linha "mais em conta para" e o botão, sem a frase de perfil ("Para o sócio com uma equipe pequena."), que pode sair.
5. **`mailto` no celular:** mostrar o endereço escrito e selecionável perto de cada botão (ver 5.5).

---

## 9. SEO e dados estruturados

1. `referenceQuantity` é para preço por unidade e não descreve "até 3 pessoas". Usar `eligibleQuantity` (`maxValue` 3, `unitText` "pessoas") em cada `Offer`, com `priceSpecification` de `billingDuration` P1M.
2. `SoftwareApplication` sem avaliação não ganha resultado rico, como o plano já diz. Manter assim, sem avaliação inventada.
3. A descrição "R$ 299, R$ 499 ou R$ 749 por mês, conforme a equipe" está certa, porque fala dos planos e não de faixa de preço total.

---

## 10. Ideia SC-07 e painel

A SC-07 está bem escrita e a contagem de 147 para 148 confere (seção 9 de 6 para 7). Tirar do texto da ideia a calculadora (se a Carol aceitar a tabela) e acrescentar "a fatura segue o plano contratado". No painel, além dos itens que o plano já lista, entram dois pendentes: o procedimento manual da troca de plano até a CO-12 existir, citando CO-12 e SC-07; e o catálogo do Console com os preços reais antes de publicar, citando SC-07 e CO-06.

---

## Mudanças que o desenho deve seguir

1. Trocar a calculadora por uma tabela fixa de 11 linhas (Pessoas, Plano mais em conta, Por mês), sempre visível, sem script, e uma frase abaixo com os valores do desconto de entrada.
2. O plano indicado sai sempre do preço cheio; o desconto nunca recalcula a indicação (com desconto, a Banca fica mais barata que o Escritório para 9 pessoas nos 3 primeiros meses).
3. Escrever na página que a fatura segue o plano contratado e que, se a equipe crescer, o escritório pode pedir a troca. Tirar do plano a frase de que o servidor "conta o plano mais barato".
4. Três cartões iguais, sem destaque visual de plano, em ordem natural também no celular; o ponto de atmosfera do Gabinete vai para a implantação ou para a chamada final.
5. Em cada cartão, o fato grande ("R$ 499 por mês, 6 pessoas incluídas") e, menor, "Mais em conta para equipes de 6 a 9 pessoas"; tirar a frase de perfil.
6. Botões "Quero o Essencial", "Quero o Escritório" e "Quero a Banca", com o e-mail `contato@t3jus.pro` escrito ao lado enquanto o formulário estiver fechado.
7. Tirar o Fundador do desenho e do texto inteiro, inclusive da nota do desconto, da chave `fundador` e do estado 12.
8. Corrigir a pergunta sobre a assistente: ela atende o primeiro contato, pergunta nome e assunto, passa para a equipe, não responde consulta jurídica e não fala de caso, como no desenho aprovado do WhatsApp e no Anexo Único do Provimento 205/2021.
9. Critério dos 30% sem citar concorrentes e sem depender da importação: "para quem usa hoje outro sistema jurídico pago" (a Carol confirma).
10. Trocar "os valores já incluem os impostos" por "é o valor final da fatura, sem nada somado", e não falar de nota fiscal até a decisão com o contador.
11. Reajuste pelo IPCA citando o preço do plano e o da pessoa a mais, como a CO-11.
12. Implantação: mostrar R$ 1.490,00 só quando o valor deixar de ser provisório, sem riscado, com "grátis para escritórios que fizerem o primeiro acesso até {data}" e o que acontece depois da oferta; a linha da primeira fatura só com F1.44 e F1.48 no ar.
13. Formas de pagamento por chave: listar só as que funcionam no dia (sem boleto do Inter enquanto F1.21 estiver pendente) e escrever "carnê com as 12 mensalidades do ano".
14. Juntar Pagamento, condições e mensagens da Meta numa seção só, e tirar "Sem plano anual por enquanto".
15. Perguntas frequentes reduzidas a 6 (seção 6.2), com o FAQPage igual ao texto visível.
16. Texto do fim do teste conforme a DC12: só consulta a partir do 8º dia, 30 dias para baixar os dados depois do encerramento, 12 meses de guarda.
17. Lista do que está incluído com os mesmos itens e selos do Início, inclusive "Petições a partir de modelos" e "Trazer os dados do Astrea e do ADVBOX" como "Em preparação"; nada sobre backup.
18. Chamadas nas outras páginas: "A partir de R$ 299 por mês" (nunca "de R$ 299 a R$ 749"), e corrigir no mesmo commit a resposta de Para quem é sobre importar de outros sistemas.
19. Não pré-marcar o tamanho da equipe no formulário pelo plano; gravar só o plano como origem quando o formulário ligar.
20. Corrigir as citações do Decreto 7.962/2013 (art. 2º, III, IV, V e VI) e tratar a desistência como condição própria do T3jus, não como direito do art. 49 do CDC.
21. Rodapé com razão social, CNPJ e endereço em todas as páginas; a página não vai ao ar sem esses dados nem sem o catálogo do Console com R$ 299, R$ 499, R$ 749 e R$ 69.
22. Reduzir as pranchas de 18 para 10 estados (seção 6.4) e as perguntas à Carol de 13 para 4 (critério dos 30%, quem paga a Meta, cancelamento com carnê e desistência, nota fiscal), mais o pedido dos dados do rodapé.
23. No JSON-LD, `eligibleQuantity` no lugar de `referenceQuantity`.
24. No painel, acrescentar os pendentes do procedimento manual da troca de plano (CO-12, SC-07) e do catálogo com os preços reais (SC-07, CO-06).
