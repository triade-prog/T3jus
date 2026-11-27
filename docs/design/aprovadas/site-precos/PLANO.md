# Site comercial · página "Planos e preços": plano

Versão 1, 27/11/2026. Plano para a Carol aprovar **antes do desenho**. Não é o desenho nem o código. Depois da aprovação, o agente de frontend desenha seguindo `docs/IDENTIDADE.md` e `docs/design/conceito-gabinete.md`, a Carol aprova o desenho, e só então a página é programada em `sistema/apps/site`.

Base lida: `docs/IDENTIDADE.md`, `docs/design/conceito-gabinete.md`, `docs/CONTEXTO.md` (DC12), `IDEIAS.md` (seções 9 e 10), o site em `sistema/apps/site` (páginas, `Topo.astro`, `Rodape.astro`, `site.css`, `paginas.css`, `config.ts`, `Base.astro`), os desenhos aprovados `site-comercial`, `site-abertura-v3` e `textos-tom`, `t3jus/precos/proposta.md` e `revisao.md`, `t3jus/co-09/plano-v2.md`, `t3jus/co-08/plano-v2.md`, o painel (`docs/painel/dados/`) e o cálculo da fatura no banco (`0690_cobranca_escritorios.sql:478-505` e `1170_carne_desconto_por_parcela.sql:108-110`).

---

## 0. Resumo em cinco linhas

1. Página nova em `/precos`, com o título "Planos e preços", no menu entre "Para quem é" e "Entrar", e ligada a partir do Início, de Para quem é, de Como funciona e de Demonstração.
2. Três cartões (Essencial, Escritório e Banca), com o **Escritório em destaque visual, sem selo de "mais escolhido"**, porque ainda não há cliente para dizer isso. Cada cartão diz para quantas pessoas ele sai mais barato.
3. Uma calculadora de pessoas que escolhe o plano mais barato e mostra a conta, com uma tabela que funciona sem JavaScript.
4. Tudo o que muda o preço fica à vista na própria página: pessoa a mais, desconto de entrada, implantação (valor e isenção), custo das mensagens da Meta, reajuste pelo IPCA e troca de plano. Nada em letra miúda.
5. Cada bloco que depende de algo ainda não ligado (teste grátis, Fundador, WhatsApp, formulário) tem uma chave em `src/config.ts` e um texto para cada situação.

---

## 1. Objetivo e lugar no site

### 1.1 Objetivo

Responder, numa página só, à pergunta que hoje o site adia ("Os planos ainda estão sendo definidos"): **quanto custa o T3jus para o meu escritório, o que está incluído e o que pode mudar o valor**. A página serve a quem já entendeu o produto (vem do Início ou de Como funciona) e a quem chega pela busca procurando preço de sistema jurídico.

Sucesso é o sócio sair sabendo o valor exato para a equipe dele, o que já funciona hoje e qual é o próximo passo (testar 7 dias ou falar com a equipe), sem precisar perguntar nada disso na demonstração.

### 1.2 Endereço e nome

- Endereço: `/precos` (curto, sem acento, igual ao que se busca). Título visível: "Planos e preços".
- `Base.astro`: `titulo="Planos e preços · T3jus"`, `rota="/precos"`.
- `public/sitemap.xml` ganha a linha de `/precos` (o sitemap é estático).

### 1.3 Menu e rodapé

- **Topo, computador:** "O sistema · Como funciona · Para quem é · **Preços** · Entrar · Pedir demonstração". No menu, o rótulo curto "Preços" cabe melhor; o título da página continua "Planos e preços". Entre 761 e 1020 px o menu já esconde os links de texto (`site.css:84-86`), então nada muda ali. O desenho confere se o menu cabe em 1021 px sem quebrar linha; se não couber, o "O sistema" sai do topo nessa faixa.
- **Topo, celular (`menu-cel`):** "Planos e preços" entre "Para quem é" e "Entrar no T3jus", com `aria-current` quando for a página atual.
- **Rodapé, coluna "O T3jus":** "Planos e preços" depois de "Para quem é".
- `Topo.astro` e `Rodape.astro` recebem `atual="/precos"`.

### 1.4 Chamadas nas outras páginas (o que muda em cada uma)

| Página | Hoje | Passa a ser |
|---|---|---|
| Início, chamada final (`index.astro:179`) | "O valor é combinado na demonstração: os planos ainda estão sendo definidos." | "Planos a partir de R$ 299 por mês, com todas as áreas. [Ver planos e preços]" e o botão de demonstração continua. |
| Início, "Na demonstração, você vê" (`index.astro:194`) | "O valor para o tamanho da sua equipe" | "Quanto fica para o tamanho da sua equipe" (link para `/precos#calculadora`) |
| Para quem é, pergunta "Quanto custa?" e o FAQPage (`para-quem-e.astro:6` e `:38`) | "O valor é combinado na demonstração... Os planos ainda estão sendo definidos." | "De R$ 299 a R$ 749 por mês, conforme o número de pessoas, com todas as áreas em todos os planos. Pessoa a mais custa R$ 69 por mês. Veja os detalhes em Planos e preços." (o texto do JSON-LD muda junto) |
| Como funciona, "Para começar", passo 1 (`como-funciona.astro:71`) | "...e combinar o valor." | "...e tirar as dúvidas. Os valores estão em Planos e preços." |
| Demonstração, "O que acontece depois", passo 3 (`demonstracao.astro:21`) | "Valor combinado antes" | "Valor conhecido antes" / "Os preços estão em Planos e preços. Você decide depois de ver, sem compromisso." |

O "a partir de" só aparece fora da página de preços, como resumo, e sempre com o link para a tabela completa. Na própria página de preços, todo valor é exato.

---

## 2. Seções, em ordem, com os textos

Regras de forma para todas as seções: as mesmas peças do site (abertura interna vinho com a coluna tom sobre tom, `sobretitulo` + título Alegreya + `fio` âmbar, folhas brancas sobre sal, selos `st-pronto`, `st-prep` e `st-plan`, botões `btn-pri`, `btn-sec` e `btn-claro`). O movimento é o das páginas internas: o topo encolhe e a barra âmbar de progresso acompanha a leitura. As seções podem subir ao aparecer com o mesmo `data-revelar` do Início, desde que a regra saia de `inicio.css` para `site.css`; com "menos movimento", tudo aparece pronto. Nenhum preço ou condição fica escondido atrás de animação.

### 2.1 Abertura (vinho, igual à de Demonstração)

- Trilha: "Início / Planos e preços".
- Sobretítulo: "Planos e preços".
- Título (h1): "Todas as áreas em todos os planos. *Muda só o tamanho da equipe.*"
- Lede: "Você escolhe pelo número de pessoas que usam o T3jus. Os valores são por mês e já incluem os impostos."
- Linha de fatos (três itens com ícone, em sal sobre vinho), cada um com âncora para a seção:
  - "7 dias para usar sem pagar" (só com `testeGratisLigado`; sem a chave, o item some);
  - "Implantação assistida grátis até {data}" (ou "na oferta de lançamento", ver 2.6);
  - "Pix, boleto ou carnê de 12 parcelas".

### 2.2 Os três planos (folhas brancas que sobem sobre o corte, como o formulário de Demonstração)

Título da seção, só para leitor de tela e SEO (h2 visualmente escondido): "Os planos".

| | Essencial | **Escritório (destaque)** | Banca |
|---|---|---|---|
| Pessoas incluídas | Até 3 pessoas | Até 6 pessoas | Até 10 pessoas |
| Preço | R$ 299 por mês | R$ 499 por mês | R$ 749 por mês |
| Pessoa a mais | R$ 69 por mês cada | R$ 69 por mês cada | R$ 69 por mês cada |
| "Sai mais em conta para" | 1 a 5 pessoas | 6 a 9 pessoas | 10 pessoas ou mais |
| Frase | "Para o sócio com uma equipe pequena." | "Para o escritório que já divide o trabalho por áreas." | "Para a equipe maior, com mais gente em cada área." |
| Botão | "Começar com o Essencial" | "Começar com o Escritório" | "Começar com a Banca" |

Embaixo dos três, uma linha só: "Todos os planos têm as mesmas áreas e o mesmo atendimento. A diferença é o número de pessoas." e o link "Ver tudo o que está incluído".

**Por que "sai mais em conta para".** A conta da pessoa a mais faz o Essencial ser o mais barato até 5 pessoas (com 4 pessoas, R$ 368; com 5, R$ 437, contra R$ 499 do Escritório). O Escritório ganha a partir de 6 e até 9 (com 9, R$ 706, contra R$ 749 da Banca), e a Banca, a partir de 10. Escrever "até 6 pessoas" sem essa linha levaria um escritório de 4 pessoas a contratar o Escritório pagando R$ 131 a mais por mês. O cartão diz a verdade e a calculadora confirma.

**O destaque e por quê.** O Escritório fica em destaque visual: folha com a faixa vinho no alto, o campo âmbar com o padrão de ícones atrás do preço (o "ponto de atmosfera" da página) e o botão principal vinho; os outros dois têm botão `btn-sec`. Motivos: é o plano do meio, que serve de referência para os outros dois; é o que cobre o escritório de 6 a 9 pessoas, o centro do público de 3 a 10 pessoas (`docs/01`); e é o plano em que o WhatsApp com IA pesa mais na comparação com o mercado (`precos/proposta.md`, seção 2). **Não leva selo "mais escolhido", "mais vendido" ou "recomendado"**: não há cliente para sustentar isso (CDC, art. 37). Se o desenho precisar de um selo, ele diz um fato: "De 6 a 9 pessoas".

**Leitura do preço.** O preço aparece grande em Alegreya ("R$ 499"), com "por mês" em Poppins ao lado. Para o leitor de tela, o bloco tem o texto inteiro "499 reais por mês, até 6 pessoas incluídas" (ver 6.1).

**Destino do botão "Começar com..."** (ver 2.13): com o formulário fechado, abre o e-mail com o assunto "Quero começar com o plano Escritório"; com o formulário ligado, leva a `/demonstracao?plano=escritorio`, que já marca o tamanho da equipe.

### 2.3 O que todo plano inclui (sal, com os selos de situação do Início)

- Sobretítulo: "Em todos os planos". Título: "O mesmo T3jus, do Essencial à Banca."
- Legenda dos selos, igual à do Início: "No T3jus: construído e testado · Em preparação: construído; falta um passo de fora · Planejado: ainda não existe, sem data".
- Lista com selo "No T3jus" (o que o Início já mostra como pronto):
  - "Todas as áreas do Portal: Início, Clientes, Agenda, Comercial, Contratos, Financeiro e Jurídico"
  - "Áreas liberadas por pessoa: o sócio dono marca o que cada um vê"
  - "Proposta, contrato, procuração e declaração no timbrado, em Word e PDF"
  - "Carnê com o Pix do próprio escritório e recibo de cada pagamento"
  - "Repasses, caixa do mês e relatórios do sócio"
  - "Importação de clientes e contratos por planilha, com a nossa ajuda"
  - "Servidores no Brasil, em São Paulo, e exportação de tudo pelo sócio dono"
- Item com selo "Em preparação", à parte e no mesmo tamanho dos outros:
  - "Atendimento pelo WhatsApp do escritório com a assistente virtual. A tela está pronta e a assistente está testada. Falta a ligação oficial com a Meta para o número do escritório funcionar. Quando ficar pronta, entra no seu plano sem mudar o preço."
- Nota: "O que ainda é planejado está no Início, em 'O que tem no T3jus'." (link para `/#t-existe`).

Fica fora desta lista o que não existe: cobrança com baixa automática ao pagar, leitura de publicações, assinatura eletrônica e agenda ligada ao Google, que continuam "Planejado" no Início.

### 2.4 Quanto fica para a sua equipe (calculadora, `id="calculadora"`)

- Sobretítulo: "Calcule". Título: "Quanto fica para a sua equipe."
- Texto: "Conte todas as pessoas que vão entrar no T3jus, inclusive estagiários e secretaria. Os clientes do escritório não contam."
- Controle: "Pessoas na equipe", com botões "Menos uma pessoa" e "Mais uma pessoa" de 48 px e o número no meio (campo numérico de 1 a 30, editável). Valor inicial: 4.
- Resultado (folha branca, atualiza a cada mudança):
  - "Para 4 pessoas, o plano mais em conta é o **Essencial**."
  - A conta em linhas: "Plano Essencial, até 3 pessoas · R$ 299,00" / "1 pessoa a mais × R$ 69,00 · R$ 69,00" / "**Total por mês · R$ 368,00**".
  - Quando houver desconto de entrada (chave `descontoEntradaNoSite`): "Nos 3 primeiros meses, com o desconto de entrada de 20%: R$ 308,20. Vindo de outro sistema, com 30%: R$ 278,30. O desconto vale sobre o plano, não sobre as pessoas a mais."
  - Quando o plano seguinte estiver perto: "Com mais 2 pessoas, o Escritório passa a sair mais em conta." (aparece com 4 e 5 pessoas no Essencial e com 8 e 9 no Escritório).
- Acima de 30: "Para mais de 30 pessoas, fale com a nossa equipe." (a regra continua a mesma, mas a página não promete atendimento a escritório desse porte sem conversa).
- **Sem JavaScript**, e também como apoio para quem prefere ler: a tabela "Preço por número de pessoas", recolhida num `<details>` aberto por padrão sem script e fechado quando a calculadora carrega.

| Pessoas | Plano mais em conta | Por mês |
|---|---|---|
| 1 a 3 | Essencial | R$ 299 |
| 4 | Essencial + 1 | R$ 368 |
| 5 | Essencial + 2 | R$ 437 |
| 6 | Escritório | R$ 499 |
| 7 | Escritório + 1 | R$ 568 |
| 8 | Escritório + 2 | R$ 637 |
| 9 | Escritório + 3 | R$ 706 |
| 10 | Banca | R$ 749 |
| 11 | Banca + 1 | R$ 818 |
| 12 | Banca + 2 | R$ 887 |
| Mais de 12 | Banca + R$ 69 por pessoa | |

Regras que a calculadora segue, iguais às do servidor (`0690:478-505`, `1170:108`): conta o plano mais barato para o número de pessoas; o desconto de entrada incide só no preço do plano; o arredondamento é por centavo. Valores do desconto por plano: Essencial R$ 239,20 (20%) e R$ 209,30 (30%); Escritório R$ 399,20 e R$ 349,30; Banca R$ 599,20 e R$ 524,30.

### 2.5 Teste de 7 dias (só com `testeGratisLigado`)

- Sobretítulo: "Para experimentar". Título: "Use o T3jus por 7 dias antes de assinar."
- Três passos com `disco` numerado:
  1. "**Combinamos o começo.** A nossa equipe cadastra o escritório e manda o convite ao sócio."
  2. "**Os 7 dias contam do primeiro acesso.** Nenhuma fatura sai nesse prazo. Ninguém pede cartão."
  3. "**Você decide.** Se assinar, a primeira mensalidade é a do mês seguinte ao fim do teste. Se não assinar, a partir do 8º dia o Portal fica só para consulta: você vê e baixa tudo, mas não cria nem muda nada. Nada é apagado nesse momento."
- Nota: "Se o escritório não assinar, o acesso de consulta dura 30 dias e depois fecha. Os dados ficam guardados por 12 meses e então são apagados, como dizem os Termos de uso." (link para os Termos, que precisam estar publicados antes de a chave ligar; ver 3.2).
- Sem a chave: a seção inteira some, e a abertura e as perguntas frequentes não falam em teste. **O site nunca anuncia um teste que o Portal ainda não dá** (hoje a chave `teste_gratis_ligado` está desligada e as telas do teste, F1.32 a F1.36, estão pendentes).

### 2.6 Implantação assistida

- Sobretítulo: "Para começar bem". Título: "A nossa equipe treina todas as pessoas do escritório."
- Texto: "Na implantação assistida, a equipe T3jus ajuda a trazer os clientes e contratos da sua planilha, treina cada pessoa que vai usar o T3jus e acompanha o escritório nos primeiros 30 dias. Quem entrar na equipe depois também é treinado, sem custo."
- Bloco de valor (folha com o canto âmbar, como o cartão de preço aprovado `paginas.css:139-141`):
  - "Implantação assistida · R$ 1.490,00" (riscado não: o valor aparece inteiro e legível)
  - "Oferta de lançamento · grátis para quem começar até {data}" e a frase "Na primeira fatura aparecem as duas linhas: o valor e a isenção."
  - Sem data gravada: "Oferta de lançamento · grátis. Avisaremos aqui o fim da oferta com pelo menos 30 dias de antecedência."
- Por que mostrar o valor: a ideia CO-08 pede "valor anunciado" e "a isenção também", e a fatura (F1.44) vai trazer as duas linhas. O site e a fatura dizem a mesma coisa.

### 2.7 Desconto de entrada (só com `descontoEntradaNoSite`)

- Sobretítulo: "Para quem chega". Título: "Desconto nas 3 primeiras mensalidades."
- Duas folhas lado a lado:
  - "**20% para escritório novo.** Vale no preço do plano nas 3 primeiras mensalidades. Depois, o valor volta ao normal."
  - "**30% para quem vem de outro sistema.** Para quem traz os dados de outro sistema jurídico, como o Astrea ou o ADVBOX, com a nossa ajuda." (o critério exato depende da pergunta 7.3)
- Nota: "O desconto conta a partir da primeira fatura, mesmo que a implantação ainda não tenha terminado. No carnê, ele vale só nas 3 primeiras parcelas. O desconto não vale para as pessoas a mais nem junto com o plano Fundador."
- Exemplo concreto, num quadro `rebaixado`: "Escritório com 6 pessoas, vindo de outro sistema: R$ 349,30 nos meses 1, 2 e 3, e R$ 499,00 a partir do 4º."

### 2.8 Plano Fundador (bloco opcional, só com `fundador.mostrar`)

Só entra se a Carol aprovar (pergunta 7.1). Fica depois do desconto de entrada, porque é a outra forma de entrar com preço menor, e as duas não se somam.

- Faixa em campo âmbar com o padrão vinho (texto em tinta e vinho-escuro, nunca branco).
- Sobretítulo: "Para os primeiros escritórios". Título: "Plano Fundador: R$ 249 por mês, até 6 pessoas."
- Texto: "Para os 10 primeiros escritórios que entrarem no T3jus. O preço fica garantido por 24 meses a partir da assinatura. Em troca, pedimos uma conversa de 30 minutos por mês para ouvir o que funciona e o que falta."
- Lista de condições, visível, sem asterisco:
  - "Até 6 pessoas incluídas. Pessoa a mais: R$ 69 por mês."
  - "Sem desconto de entrada: o preço do Fundador já é o desconto."
  - "Sem os 7 dias de teste: a nossa equipe acompanha o escritório desde o primeiro dia."
  - "Depois dos 24 meses: {regra que a Carol decidir, pergunta 7.1}."
  - "Reajuste pelo IPCA só depois dos 24 meses."
- Estado **com vagas**: selo âmbar-3 com texto tinta "Vagas abertas" e, se a Carol quiser mostrar a contagem, "{n} de 10 vagas abertas". Botão `btn-pri`: "Quero ser fundador".
- Estado **esgotado**: selo neutro "As 10 vagas foram preenchidas"; o texto passa a "O plano Fundador foi para os 10 primeiros escritórios e não aceita novas entradas."; o botão sai. Depois de um tempo combinado, o bloco sai da página.
- O número de vagas vem de `config.ts` e muda à mão a cada fundador que assina (o sistema não conta, `revisao.md`, seção 2). Por isso recomendo não mostrar a contagem (ver 7.1): uma contagem desatualizada é informação falsa sobre a oferta.

### 2.9 Formas de pagamento e condições (folha branca, em duas colunas)

- Sobretítulo: "Pagamento". Título: "Como você paga."
- Coluna 1, "Formas":
  - "**Pix ou boleto**, uma fatura por mês."
  - "**Carnê de 12 parcelas**, com o Pix e o boleto em cada uma." Nota: "As pessoas a mais entram no carnê pelo número do dia em que ele é gerado. Se a equipe mudar, geramos um carnê novo, com o motivo."
  - "Os pagamentos são pelo Banco Inter, em nome do T3jus."
- Coluna 2, "Condições" (cada uma em uma frase):
  - "**Reajuste uma vez por ano, pelo IPCA** acumulado em 12 meses, no aniversário da assinatura. Você recebe o aviso 30 dias antes, com o valor de hoje, o novo e o índice, e pode cancelar sem multa antes de o novo valor valer. Se o índice for negativo, o preço não muda."
  - "**Trocar de plano.** Subir vale na hora, e a fatura seguinte traz a diferença dos dias que faltavam no mês. Descer vale a partir do mês seguinte, sem crédito nem devolução, e pode ser desfeito até lá. Você vê o que muda e quanto vai pagar antes de confirmar."
  - "**Sem plano anual por enquanto.** Todos os planos são mensais."
  - "**Preço final**, com os impostos incluídos."
  - "**Cancelar:** {texto que depende da pergunta 7.6}."
- Aviso de transparência no fim da seção: "As condições completas estão no contrato e nos Termos de uso, que você recebe e aceita antes de assinar."

### 2.10 Custo das mensagens do WhatsApp (dentro de 2.9 ou logo depois, nunca só nas perguntas)

O preço da Meta por mensagem é uma despesa que não é do T3jus e muda com a regra da Meta. Ele precisa aparecer junto do preço (Decreto 7.962/2013, art. 2º, V: despesas adicionais discriminadas). O texto depende da pergunta 7.4:

- Se o escritório paga a Meta (recomendado): "**Mensagens do WhatsApp.** A Meta cobra por mensagem, direto do escritório, na conta do WhatsApp Business do número dele. O valor depende de quantas conversas o escritório tem e da tabela da Meta, que pode mudar. A assistente virtual do T3jus está no plano, sem cobrança por resposta." (com link para a página de preços da Meta)
- Se o T3jus paga a Meta: "**Mensagens do WhatsApp.** Estão incluídas no plano até {limite} por mês. Acima disso, {regra}."
- Enquanto a ligação com a Meta não existir (F3.58 pendente), o bloco leva o selo "Em preparação" e a frase "Nada é cobrado por mensagens até o WhatsApp do escritório estar ligado."

A frase "sem cobrança por resposta" só entra se a Carol confirmar que o uso razoável da IA não tem excedente cobrado (pergunta 7.5).

### 2.11 Perguntas frequentes (`details`, como em Para quem é)

Sobretítulo: "Perguntas". Título: "Antes de escolher."

1. **Quem conta como pessoa?** "Toda pessoa com acesso ativo ao Portal do escritório no dia em que a fatura é emitida: sócios, advogados, estagiários e secretaria. Os clientes do escritório não contam. Quem sai da equipe deixa de contar quando o acesso é desativado."
2. **O WhatsApp com a assistente virtual já funciona?** "A tela e a assistente estão prontas e testadas. Falta a ligação oficial do número do escritório com a Meta, que está em preparação. Quando ficar pronta, ela entra no seu plano sem mudar o preço. Até lá, todas as outras áreas funcionam normalmente."
3. **Quem paga as mensagens do WhatsApp?** (texto da seção 2.10, conforme a pergunta 7.4)
4. **A assistente virtual atende novos clientes ou faz propaganda?** "Não. Ela responde a quem escreve para o escritório, com o que está no T3jus, como a etapa do caso ou a data da parcela, e passa para uma pessoa da equipe o que pede um advogado. O T3jus não envia propaganda nem mensagem em massa. As regras do atendimento são do escritório, que segue o Código de Ética da OAB." (ver 4.1)
5. **Quando pago a primeira mensalidade?** Com teste: "No mês seguinte ao fim dos 7 dias de teste, e só se você assinar." Sem teste: "No mês seguinte ao começo da assinatura."
6. **Posso trocar de plano depois?** (o texto de troca de 2.9, resumido)
7. **O preço sobe?** (o texto do reajuste de 2.9)
8. **Tem nota fiscal?** (texto conforme a pergunta 7.7; enquanto não houver decisão, a pergunta não entra na página, e não entra nenhuma frase que prometa nota)
9. **O T3jus recebe o dinheiro dos meus clientes?** "Não. O carnê dos seus clientes leva o Pix do próprio escritório, e o dinheiro cai direto na sua conta. O que o T3jus cobra é só a mensalidade." (igual à de Para quem é)
10. **E se eu desistir?** (texto conforme a pergunta 7.6, com o direito de desistir em 7 dias quando a contratação for a distância, ver 4.3)
11. **Os meus dados ficam presos se eu sair?** "Não. O sócio dono exporta tudo do escritório quando quiser, também no período só de consulta."

Só entram no FAQPage do JSON-LD as perguntas visíveis na página, com o mesmo texto.

### 2.12 Chamada final (campo âmbar com o selo, igual à do Início)

- Sobretítulo: "Vamos começar". Título: "Escolha o plano e fale com a nossa equipe."
- Texto, com teste: "Cadastramos o escritório, mandamos o convite e os 7 dias começam no seu primeiro acesso." Sem teste: "Uma conversa com a nossa equipe, sem compromisso, para ver o T3jus com a rotina do seu escritório."
- Botões: "Pedir uma demonstração" (`btn-pri`) e o e-mail `contato@t3jus.pro` como saída.

### 2.13 Estado atual: sem formulário (`privacidadePronta = false`)

Hoje o pedido de demonstração está fechado até a política de privacidade (F2.4). Nesse estado:

- todos os botões "Começar com..." e "Quero ser fundador" abrem o e-mail (`mailto:contato@t3jus.pro?subject=Quero começar com o plano Escritório`), com o ícone de envelope e o texto do botão terminando em "por e-mail" no leitor de tela;
- abaixo dos cartões, uma linha: "Por enquanto, o contato é por e-mail. Respondemos em até 1 dia útil.";
- a chamada final mostra o e-mail como ação principal;
- nenhum campo pede dado pessoal nesta página. Quando `privacidadePronta` virar `true`, os botões passam a levar a `/demonstracao?plano=...`, e o formulário grava o plano como origem do interessado (SC-02).

### 2.14 Chaves em `src/config.ts` e a fonte única dos preços

- `src/precos.ts` (novo): planos, pessoas incluídas, preços em centavos, pessoa a mais, percentuais do desconto, implantação (valor e data do fim da isenção) e o Fundador. A página, a calculadora, a tabela sem script, o JSON-LD e as chamadas das outras páginas leem só daqui.
- `config.ts` ganha: `testeGratisLigado` (false), `descontoEntradaNoSite`, `fundador` (`{ mostrar, vagas }`), `whatsappLigado` (false) e `implantacaoGratisAte` (data ou nulo).
- O catálogo de verdade fica no Console (Cobrança › Planos). Mudar um preço é mudar os dois lugares no mesmo dia; o procedimento fica escrito no `LEIA-ME.md` do site. Um teste do site confere que `precos.ts` mantém o degrau (o Essencial com 6 pessoas custa mais que o Escritório; o Escritório com 10 custa mais que a Banca).

---

## 3. Oferta honesta (SC-03): o que existe, o que não existe

### 3.1 Situação conferida no painel em 27/11/2026

| Assunto | Situação | Onde | O que a página faz |
|---|---|---|---|
| Áreas do Portal | Feitas e publicadas | `situacao.json` | Lista com "No T3jus" |
| WhatsApp com IA | IA pronta e testada; ligação com a Meta pendente, depende de registrar o T3jus como parceiro de tecnologia | F3.58 (pendente), F3.53 | Selo "Em preparação", frase de que entra sem mudar o preço |
| Quem paga a Meta | Pergunta aberta | `precos/proposta.md` 5.1, `revisao.md` achado 11 | Texto condicional (2.10) e pergunta 7.4 |
| Teste de 7 dias | Servidor pronto com a chave desligada; telas, avisos e cobrança depois do teste pendentes | F1.31 feito; F1.32 a F1.37 pendentes; P34 (aplicar a 1160) | Seção só com `testeGratisLigado` |
| Implantação assistida | Decidida (DC14); valor e isenção na fatura pendentes | F1.42 a F1.49 pendentes | Pode anunciar o serviço: ele é feito pela equipe, não depende do sistema. A frase "na primeira fatura aparecem as duas linhas" só entra quando F1.44 e F1.48 estiverem no ar |
| Desconto de entrada | Feito no servidor e nas telas do carnê | F1.28 e F1.29 feitos; P32 (publicar) pendente | Pode anunciar depois de P32 |
| Pix e boleto pelo Inter | Porta pronta e desligada; baixa manual | F1.21 pendente | Ver abaixo |
| Reajuste pelo IPCA e troca de plano | Decididos (CO-11, CO-12); nenhum item no painel e nada construído | IDEIAS seção 10 | Anunciar como condição do contrato, não como função do Portal. Sem a tela de troca, a troca é feita pela equipe |
| Nota fiscal | A Carol decidiu não emitir pelo sistema por agora | F1.24 pendente, VA-06 | Não prometer nota (pergunta 7.7) |
| Termos e privacidade | Pendentes | F2.4 | Formulário fechado; teste não anuncia sem os Termos |

### 3.2 O que a página não pode dizer enquanto for assim

- Não pode dizer que o WhatsApp funciona, nem mostrar conversa como se fosse real sem o selo "Exemplo" e "Em preparação".
- Não pode anunciar o teste de 7 dias antes de a chave ligar. A chave só liga com os Termos publicados (DC12).
- Não pode dizer "assine pelo site" ou "comece agora": a assinatura é confirmada pela equipe no Console (DC12, decisão 2) e o teste é começado pelo Console (`co-09/plano-v2.md`, seção 10).
- **Pix e boleto:** hoje o T3jus ainda não emite o boleto pelo Inter (F1.21). A página pode listar Pix, boleto e carnê como formas de pagamento só quando o primeiro escritório puder de fato pagar assim. Até lá, recomendo publicar a página com as formas e a frase "O boleto é registrado pelo Banco Inter", e não publicar antes de o Inter estar ligado, ou trocar a linha por "Pix ou carnê" se o Pix manual já servir (pergunta 7.8).
- Não pode usar "ilimitado", "sem limite", "tudo incluído" ou "sem surpresas": há limite de pessoas, há custo da Meta e há reajuste.
- Não pode citar nem comparar concorrentes pelo nome com preço. A comparação da proposta é interna; na página, números de terceiros envelhecem e exigem prova.

---

## 4. Regras de publicidade e tom

### 4.1 Código de Ética e Disciplina da OAB e Provimento 205/2021

O T3jus é software, não escritório, e não está sujeito ao Provimento como anunciante. Mas o público é advogado e a página não pode sugerir que o produto ajuda o advogado a fazer o que as regras de publicidade dele vedam: captação de clientela, mercantilização da profissão, promessa de resultado e uso de mensagem para oferecer serviço a quem não pediu. Regras práticas:

- Não usar "conquiste mais clientes", "aumente seus honorários", "venda mais", "leads", "captação", "funil de vendas" ou "campanha" nesta página.
- O WhatsApp é apresentado como **atendimento de quem já procura o escritório** (clientes e contatos que escrevem primeiro), nunca como disparo, lista de transmissão ou abordagem. A pergunta 4 das frequentes diz isso em palavras.
- Nenhuma promessa de resultado: nada de "nunca mais perca um prazo", "zero inadimplência" ou "receba em dia". Usar o que o sistema faz ("mostra a parcela vencida e quem cobra").
- Nada de "mais barato que..." ou de selo de preço agressivo ("imperdível", "só hoje", contagem regressiva). O tom é o do manual: sóbrio e informativo.
- Antes de publicar, a advogada parceira lê a página com o olhar da OAB (é a ideia VA-07, ainda a validar).

### 4.2 Código de Defesa do Consumidor

O escritório contrata como empresa, mas o escritório pequeno pode ser tratado como consumidor vulnerável. A página segue o CDC como se valesse:

- **Art. 30 e 31:** o preço publicado vincula. Valores exatos, em reais, por mês, com o que está incluído e o que não está, em português claro.
- **Art. 37:** nada de dado sem prova ("mais escolhido", contagem de vagas desatualizada, "economize X%").
- **Art. 46 e 54:** as condições que limitam (reajuste, troca, cancelamento, contagem de pessoas, custo da Meta) aparecem na página no mesmo tamanho do resto do texto, nunca em nota de rodapé com asterisco.
- **Art. 49:** contratação feita a distância dá 7 dias para desistir. O teste de 7 dias não substitui esse direito; a pergunta "E se eu desistir?" diz como exercê-lo (pergunta 7.6).

### 4.3 Decreto 7.962/2013 (comércio eletrônico)

- **Art. 2º, I e II:** o site mostra o nome empresarial, o CNPJ e o endereço físico e eletrônico do T3jus. Hoje o rodapé mostra só o e-mail. **Recomendo pôr razão social, CNPJ e endereço no rodapé de todas as páginas** junto com esta entrega (pergunta 7.9).
- **Art. 2º, IV e V:** características do serviço e preço com as despesas adicionais discriminadas (pessoa a mais, implantação, mensagens da Meta).
- **Art. 2º, VI:** condições integrais da oferta, formas de pagamento, prazo de execução (o prazo de 30 dias da implantação está no texto).
- **Art. 4º e 5º:** antes de contratar, o resumo do contrato e o meio de desistir. Isso fica nos Termos de uso (F2.4) e no contrato; a página aponta para eles.

### 4.4 Tom (Personalidade e D5)

- Direto e educado, como um bom advogado escreveria. Frases curtas e completas, uma ideia por frase.
- Sem exclamação, sem emoji, sem travessão e sem seta. "Você" para o leitor; o T3jus fala na primeira pessoa do plural ("a nossa equipe").
- Números sempre com "R$", vírgula nos centavos quando houver centavos e "por mês" por extenso (nunca "/mês").
- Palavras sem gênero para quem lê quando possível ("Boas-vindas"); "sócio dono" segue o uso das páginas do site.

---

## 5. Estados e telas que o desenho precisa mostrar

Todas em computador (1440 px) e celular (390 px), com captura WebP, o HTML navegável e a conferência do axe, como em `site-comercial` e `site-abertura-v3`.

| # | Estado | Observação |
|---|---|---|
| 1 | Página inteira, estado de hoje: sem formulário, sem teste, sem Fundador, WhatsApp "Em preparação" | É o estado que vai ao ar primeiro |
| 2 | Página inteira, estado completo: teste ligado, desconto de entrada, Fundador com vagas, formulário ligado | Para a Carol ver o alvo |
| 3 | Abertura e os três cartões de perto | Com o destaque do Escritório; no celular, os cartões em coluna, com o Escritório primeiro ou na ordem natural (o desenho propõe e justifica) |
| 4 | "O que todo plano inclui" de perto | Com a legenda dos selos |
| 5 | Calculadora: 1, 4, 6, 10 e 31 pessoas | 4 mostra o aviso "com mais 2 pessoas"; 31 mostra "fale com a nossa equipe" |
| 6 | Calculadora com o desconto de entrada ligado | As três linhas do desconto |
| 7 | Calculadora com foco do teclado e com o campo editado à mão (valor vazio e valor 0) | Mensagem de erro no padrão D5: "Escreva um número de 1 a 30." |
| 8 | Tabela sem JavaScript | O `details` aberto |
| 9 | Teste de 7 dias | Só no estado 2 |
| 10 | Implantação: com data de fim e sem data | |
| 11 | Desconto de entrada | Com o exemplo |
| 12 | Fundador com vagas, Fundador esgotado | Se a Carol aprovar o bloco |
| 13 | Pagamento e condições, com o bloco das mensagens da Meta nas duas versões (escritório paga e T3jus paga) e no estado "Em preparação" | |
| 14 | Perguntas frequentes: todas fechadas, uma aberta, e o foco do teclado num `summary` | |
| 15 | Chamada final sem formulário (e-mail) e com formulário | |
| 16 | Menu do topo com "Preços" atual, em 1440 e 1021 px, e o menu do celular aberto | |
| 17 | Modo "menos movimento" | Captura da página inteira parada |
| 18 | Chamadas novas no Início, em Para quem é, em Como funciona e em Demonstração | Só os trechos que mudam, antes e depois |

O desenho segue o Gabinete: um só ponto de atmosfera (o campo âmbar com padrão atrás do preço do Escritório, ou a faixa do Fundador, nunca os dois disputando); folhas brancas sobre sal; âmbar só em fio, selo, ícone grande e campo com texto escuro; nenhum texto branco sobre âmbar e nenhum texto âmbar sobre fundo claro.

---

## 6. Acessibilidade, SEO e desempenho

### 6.1 Acessibilidade (WCAG 2.2 AA)

- **Contraste:** só os pares conferidos da `IDENTIDADE.md` e do Gabinete. Preço em vinho sobre branco (cerca de 11:1) ou em tinta; "por mês" em tinta suave `#6E5562` (5,5:1). No campo âmbar: tinta (6,83:1) ou `#4F1D35` (5,56:1), nunca branco e nunca vinho em texto pequeno. Selos com ícone e texto, nunca só cor.
- **Preço no leitor de tela:** cada cartão é um `<article>` com `aria-labelledby` no nome do plano. O preço visual (`R$ 499` + `por mês`) fica `aria-hidden`, com um texto escondido ao lado: "499 reais por mês, até 6 pessoas incluídas, 69 reais por pessoa a mais". Assim o leitor não lê "R cifrão 499". Na tabela, cabeçalhos `<th scope>` e a mesma forma escrita.
- **Calculadora:** `<fieldset>` com `<legend>` "Pessoas na equipe"; campo `type="number"` com `inputmode="numeric"`, `min`, `max` e rótulo; botões "Menos uma pessoa" e "Mais uma pessoa" com rótulo próprio; o resultado num `<output>` com `aria-live="polite"`, anunciado só depois de uma pausa curta para não falar a cada clique. O erro fica preso ao campo (`aria-invalid`, `aria-describedby`).
- **Toque:** todo alvo com 44 px ou mais (botões da calculadora com 48 px), e 8 px entre alvos vizinhos.
- **Teclado:** ordem natural; `details` das perguntas abrem com Enter e Espaço; foco de 3 px `#AC3F6B` (`#F2CDB3` sobre vinho), como no resto do site; "Pular para o conteúdo".
- **Título e cabeçalhos:** um h1; h2 por seção; h3 nos cartões.
- **Zoom e texto grande:** até 200% sem rolagem lateral; os cartões quebram em coluna.
- **Conferência:** axe-core em cada estado da seção 5, nas duas larguras, com zero violações, como nos desenhos aprovados do site.

### 6.2 SEO

- **Título:** "Planos e preços · T3jus" (curto, no padrão das outras páginas).
- **Descrição (até cerca de 160 caracteres):** "Planos do T3jus para escritórios de advocacia: R$ 299, R$ 499 ou R$ 749 por mês, conforme a equipe, com todas as áreas. Veja o que está incluído."
- **Canônico** `https://t3jus.pro/precos` e a mesma `og.png` (a imagem por página fica para depois, como decidido em `site-comercial`, pergunta 7).
- **Dados estruturados:** um `Product` (ou `SoftwareApplication` com `applicationCategory: BusinessApplication`) chamado "T3jus", com três `Offer`, cada um com `priceCurrency: BRL`, `price` e `priceSpecification` do tipo `UnitPriceSpecification` com `billingDuration: P1M` e `referenceQuantity` de pessoas. Sem `aggregateRating` nem avaliação inventada. O FAQPage com as perguntas visíveis, como em Para quem é. Tudo gerado de `precos.ts`, para o JSON-LD nunca divergir da página. O Google mostra pouco resultado rico para software sem avaliações; o ganho aqui é a leitura correta do preço por buscadores e assistentes, não um selo na busca.
- **Texto que a busca lê:** os preços são HTML estático no build, não montados por script.
- `sitemap.xml` com `/precos`; `robots.txt` sem mudança.

### 6.3 Desempenho

- Página estática do Astro, como as outras; CSS embutido (`inlineStylesheets: "always"`).
- Sem foto nova na primeira dobra; a abertura é vinho com a coluna em SVG, então o maior elemento é o texto do h1 ou um cartão, sem imagem para esperar.
- A calculadora é um script pequeno, sem biblioteca (meta: menos de 3 KB comprimido), carregado como módulo do Astro; sem ele, a tabela já mostra tudo.
- Fontes: as mesmas duas pré-carregadas pelo `Base.astro`; nenhum peso novo.
- Metas: LCP abaixo de 2,0 s no celular em 4G, CLS 0 (os cartões têm altura reservada; a calculadora não empurra o conteúdo ao trocar o texto), INP abaixo de 100 ms na calculadora.

---

## 7. Perguntas para a Carol (cada uma com recomendação)

1. **Mostrar o plano Fundador no site?**
   A) Não mostrar; oferecer só na conversa, a quem a equipe escolher.
   B) Mostrar o bloco com "Vagas abertas", sem contagem, e trocar para "esgotado" quando fechar.
   C) Mostrar com a contagem "{n} de 10".
   **Recomendo A agora.** O Fundador dá margem negativa enquanto o escritório usa suporte de piloto (`revisao.md` 3.3), a regra do que vem depois dos 24 meses ainda não está escrita e a contagem é manual. Escolher os 10 primeiros na conversa permite escolher escritórios que darão retorno de verdade. Se a escolha for B, preciso da regra "depois dos 24 meses" (a revisão sugere passar ao Escritório com 30% de desconto, o que pede um plano não arquivado no Console).

2. **Mostrar o desconto de entrada (20% e 30%) no site?**
   **Recomendo mostrar**, depois de P32 publicado. É uma regra decidida e construída, vale para todo escritório novo, e escondê-la faria a demonstração parecer negociação de preço. Mostrar também a regra do carnê (só nas 3 primeiras parcelas).

3. **Como se prova que o escritório "vem de outro sistema" para ter os 30%?**
   **Recomendo:** vale quando a equipe importa os dados de outro sistema jurídico (Astrea, ADVBOX ou outro) na implantação, ou quando o escritório mostra que pagava outro sistema nos últimos 3 meses. A equipe registra o motivo na assinatura, como a CO-10 já pede.

4. **Quem paga as mensagens da Meta?**
   A) O escritório, com o cartão dele na conta do WhatsApp Business do próprio número.
   B) O T3jus, incluído no plano até um limite por mês.
   **Recomendo A**, como a proposta: o custo da Meta depende do volume de cada escritório e não tem teto. A página diz isso com clareza (2.10). Plano B escrito para quem não tem cartão empresarial: o T3jus paga e repassa na fatura, com teto por escritório. Ressalva: A pede o T3jus registrado como parceiro de tecnologia da Meta (F3.58).

5. **A assistente virtual tem limite de uso no plano?**
   **Recomendo** dizer "sem cobrança por resposta da assistente" e manter o limite interno de uso razoável só como alerta para a equipe, sem cobrar excedente, como a proposta sugere. Se houver limite que bloqueie ou cobre, ele precisa estar escrito na página.

6. **Há prazo mínimo (fidelidade) ou multa para cancelar?**
   **Recomendo** sem fidelidade e sem multa no plano mensal: cancelar vale a partir da competência seguinte, com 30 dias de consulta para baixar os dados, como o fim de contrato que já existe. Mais o direito de desistir em 7 dias da contratação a distância (CDC, art. 49). A página só fala em cancelamento depois desta resposta.

7. **Tem nota fiscal?**
   A decisão de 22/11 foi não emitir nota pelo sistema por agora (F1.24), e a revisão de preços põe a nota como bloqueio da primeira fatura paga. **Recomendo** resolver com o contador antes de publicar os preços e então escrever a resposta; até lá, a pergunta fica fora da página e nada promete nota.

8. **A página pode ir ao ar antes de o Pix e o boleto pelo Inter funcionarem (F1.21)?**
   **Recomendo** publicar quando o primeiro escritório puder pagar de fato pelas formas listadas. Se a Carol quiser publicar antes, a linha de pagamento fica só com o que já funciona.

9. **Pôr razão social, CNPJ e endereço do T3jus no rodapé?**
   **Recomendo sim**, em todas as páginas, junto com esta entrega. O Decreto 7.962/2013 pede isso de quem oferta serviço com preço pela internet, e dá confiança a quem vai contratar. Preciso dos dados exatos.

10. **O valor da implantação (R$ 1.490, provisório) pode aparecer?**
    **Recomendo mostrar** o valor e a isenção, como a CO-08 pede e como a fatura vai mostrar. O valor anunciado vincula a oferta enquanto estiver no site (CDC, art. 30): se ele mudar, muda para quem começar depois da mudança, e a isenção já cobre os primeiros meses. Confirmar antes de publicar.

11. **Qual é a data do fim da isenção da implantação ("6 primeiros meses do T3jus rodando")?**
    **Recomendo** a data de lançamento gravada no Console (`co-08/plano-v2.md`, pergunta 2) e a página dizendo "grátis para quem começar até {data}". Sem data, a página diz "oferta de lançamento" e promete avisar com 30 dias.

12. **O Escritório fica em destaque?**
    **Recomendo sim**, só com destaque visual e a linha "sai mais em conta de 6 a 9 pessoas", sem selo de popularidade. A outra opção é nenhum destaque, deixando a calculadora indicar o plano.

13. **Os preços são com impostos incluídos?**
    **Recomendo sim**, como a proposta e a revisão, e a página diz "preço final, com impostos". Confirmar com o contador junto com a pergunta 7.

---

## 8. Fora desta entrega e ideia nova

### 8.1 Fica fora

- Assinar ou começar o teste sozinho pelo site, sem a equipe (o teste começa pelo Console; o sócio assinar sozinho é o F1.38).
- Pagamento no site e cartão de crédito.
- Plano anual (CO-07, a validar).
- Comparação com concorrentes.
- Preço lido do Console ao vivo (o site é estático; os valores vêm de `precos.ts`).
- Uma imagem de compartilhamento própria da página.
- A página de Termos de uso e a de política de privacidade (F2.4), das quais esta página depende para o teste e o formulário.
- O "perfil de apoio" para estagiário e secretaria contado de outro jeito (sugerido em `revisao.md`, achado 8); a página conta todo acesso ativo, como o sistema faz hoje.

### 8.2 Ideia nova para o `IDEIAS.md`, seção 9

A página não tem código próprio: SC-01 cobre as páginas iniciais e SC-03 a honestidade, mas nenhuma das duas fala de preço. Proposta de texto:

| Código | Ideia | Etiquetas |
|---|---|---|
| SC-07 | Página de planos e preços em `t3jus.pro/precos`: os três planos com o preço por mês e o número de pessoas, a pessoa a mais, uma calculadora que escolhe o plano mais em conta para o tamanho da equipe (com tabela que funciona sem script), o que todo plano inclui com a situação de cada parte, o teste de 7 dias, a implantação assistida com o valor e a isenção, o desconto de entrada, as formas de pagamento, o reajuste, a troca de plano e o custo das mensagens da Meta, tudo à vista e sem letra miúda; os valores saem de uma fonte única no site, iguais aos do Console, e cada bloco que depende de algo ainda não ligado só aparece quando ele estiver ligado (Carol, 27/11/2026) | [V1] |

Ao entrar, a contagem do fim do `IDEIAS.md` muda: seção 9 de 6 para 7 e o total de 147 para 148. A linha de origem no topo do arquivo ganha "SC-07 (página de planos e preços) a Carol pediu em 27/11/2026".

### 8.3 Painel, quando for construir

- `D` novo: desenho da página de preços e das chamadas nas outras páginas, citando SC-07, SC-03 e SC-06.
- `F2` novo: a página programada, citando SC-07, SC-03, SC-06, CO-08, CO-09 e CO-10.
- `F2` novo, pendente: rodapé com razão social, CNPJ e endereço (pergunta 7.9), citando SC-07.
- Enquanto o teste, o WhatsApp ou o Fundador estiverem fora da página por chave, um item "pendente" cita SC-07 com o que falta mostrar, como pede o `CLAUDE.md`.

---

## 9. O que este plano decide e o que fica em aberto

**Decide:** a página `/precos` com o rótulo "Preços" no menu; a ordem das seções e os textos; o Escritório em destaque só visual, com a linha "sai mais em conta para" em cada cartão (o Essencial ganha até 5 pessoas, o Escritório de 6 a 9 e a Banca a partir de 10); a calculadora com tabela sem script; todo custo extra à vista, inclusive a Meta e o reajuste; chaves em `config.ts` para teste, Fundador, desconto e WhatsApp; fonte única `precos.ts`; nenhum selo de popularidade, nenhuma comparação com concorrentes e nenhuma linguagem de captação; a ideia SC-07.

**Em aberto para a Carol:** mostrar o Fundador (recomendo não, por agora); mostrar o desconto de entrada (recomendo sim) e o critério dos 30%; quem paga a Meta (recomendo o escritório); limite da IA; fidelidade e cancelamento; nota fiscal; publicar antes do Inter; razão social e CNPJ no rodapé; o valor provisório de R$ 1.490 e a data do fim da isenção; o destaque do Escritório; impostos incluídos.
