# Textos no tom do T3jus · notas (D5)

> **Aprovado pela Carol em 21/11/2026 às 17h10 (Bahia)**, com “pode seguir o recomendado”: as dez recomendações do fim valem como decisões.

Esta proposta levanta os textos que chegam às pessoas e os reescreve no tom do T3jus. São três grupos: o que vai ao cliente do escritório pelo WhatsApp, os avisos e erros das telas do Portal e do Console, e a conferência dos e-mails, que já foram aprovados. A base é a “Personalidade” de `docs/IDENTIDADE.md` e os textos dos desenhos aprovados em `docs/design/aprovadas/`.

## Arquivos

- `index.html`: a página para ler e aprovar. Traz o guia, os balões de WhatsApp com o texto de hoje e a proposta, os erros das telas, os e-mails, as divergências e as perguntas.
- `textos.json`: o inventário completo. Cada item tem `id`, `grupo`, `onde` (arquivo:linha), `quando aparece`, `antes`, `depois`, `por que` e `muda`.
- `png/1440.png` e `png/390.png`: as capturas. O axe (WCAG 2.0, 2.1 e 2.2, A e AA) achou 0 violações em 1440 e 390 px, no modo claro e no escuro, e nenhuma das duas larguras tem rolagem lateral.

## Guia de tom

O texto do T3jus é direto e educado, como um bom advogado escreveria: elegante, sóbrio, acessível e confiável.

- **Quem fala.** No WhatsApp, quem fala é o escritório (“Aqui é do escritório {nome do escritório}.”) ou a assistente virtual do escritório. O nome T3jus não aparece para o cliente. Nas telas, o T3jus fala com discrição, na primeira pessoa do plural, como em “Não encontramos”.
- **Tratamento.** Trate por “você” e chame pelo primeiro nome: “Olá, {nome}.”. Só o tom Formal da IA usa “senhor” e “senhora”. Para quem recebe, prefira palavras sem gênero, como “Boas-vindas” e “Agradecemos”. A IA fala no feminino, porque é “a assistente virtual”.
- **Começo e fim fixos.** Todo aviso automático começa com “Olá, {nome}. Aqui é do escritório {nome do escritório}.” e termina com “Qualquer dúvida, é só responder esta mensagem.”. Não há assinatura no fim: o nome do escritório já vem na segunda frase.
- **Frases curtas e completas.** Uma ideia por frase, com sujeito e verbo. A IA escreve no máximo 3 frases. Sem exclamação, sem emoji, sem travessão e sem seta. O sinal › aparece só no caminho do menu, como em “Escritório › Ajustes do financeiro”, igual aos desenhos aprovados.
- **Jargão jurídico.** Use só as palavras que o cliente já conhece, como processo, audiência, recurso e acordo, e explique o resto em português simples. Nunca dê opinião jurídica, chance de ganhar ou prazo prometido.
- **Cobrança.** Cobre com educação, sem ameaça e sem falar em juros na mensagem. Sempre inclua “Se já pagou, pode desconsiderar esta mensagem.” e uma saída para conversar. A frase do link fica fora enquanto o T3jus não gera link. As regras fixas (das 8h às 20h em dia útil e 1 cobrança por semana por parcela) valem no envio, e o texto não precisa dizê-las.
- **A IA.** A IA sempre se apresenta como assistente virtual e nunca finge ser uma pessoa. Quando não sabe, passa a conversa para uma pessoa e diz que a resposta chega por ali. Fora do horário, diz quando uma pessoa vai ver a mensagem, com o dia e a hora.
- **Erro na tela.** Diga o que aconteceu, o que continua igual e o que fazer, nesta ordem: “Não deu para salvar. Nada foi salvo: Marina continua responsável. O que você escolheu continua aqui.”. Não culpe a pessoa (escreva “Confira a data”, e não “Você errou a data”). Não mostre código técnico, nem “Erro:”, nem “Ops”. Quando outra pessoa mudou algo antes, peça “Recarregue a página para ver.”.

| Faça | Não faça |
|---|---|
| Olá, {nome}. Aqui é do escritório {nome do escritório}. | Olá! Tudo bem? 😊 |
| Recebemos o pagamento de {valor} ({parcela}). Agradecemos. | Pagamento recebido com sucesso! Obrigado! |
| Se já pagou, pode desconsiderar esta mensagem. | Evite transtornos: regularize sua situação. |
| Vou passar a sua mensagem para Diego, da equipe do escritório Ribeiro & Matos. A resposta chega por aqui. | Aguarde, um atendente irá lhe responder em breve. |
| Esta parcela já está paga. Recarregue a página para ver o recebimento. | Erro 409: conflito de versão. |
| A sua própria conta não se desativa por aqui. Peça a outra pessoa com administração. | Você não pode fazer isso. |

## Inventário

| Grupo | Textos | Mudam |
|---|---:|---:|
| WhatsApp: avisos prontos | 6 | 6 |
| WhatsApp: a IA do escritório | 9 | 7 |
| WhatsApp: mensagens que a equipe revisa | 7 | 5 |
| WhatsApp: texto de cada etapa do caso | 8 | 1 |
| WhatsApp: automações novas (desenho aprovado) | 3 | 3 |
| Papel ao cliente: carnê e recibo | 11 | 0 |
| Telas: erros gerais | 20 | 7 |
| Telas: recusas do banco com texto | 88 | 13 |
| Telas: recusas que hoje caem no texto geral | 39 | 39 |
| Telas: avisos, confirmações e estados dos componentes | 963 | 11 |
| Telas: histórico das automações | 8 | 3 |
| E-mails (já aprovados, só conferência) | 6 | 0 |
| Internos, sem mudança | 455 | 0 |
| **Total** | **1623** | **95** |

Como o inventário foi feito:

- **WhatsApp:** entraram todos os textos que o código manda ao cliente. São os 6 avisos prontos (0310), o aviso de etapa (0240 e `juridico.ts`), os 8 textos de etapa, a apresentação, o nome e o fora do horário da IA, as frases fixas dela (`ia.ts`), as instruções que fazem a IA escrever no tom, os textos prontos da Agenda, do Jurídico e da prestação de contas, e as duas mensagens das automações novas, que só existem no desenho aprovado. As automações prontas (0320 e 0570) usam os mesmos textos dos avisos prontos. `_shared/ia.ts`, `atendimento.ts` e `montar_fluxo.ts` não têm frase ao cliente.
- **Telas:** a tela nunca mostra a mensagem crua do banco (`api.ts` e `erros.ts`). Ela mostra o texto do código (`TEXTOS_ERRO`) ou do motivo (`TEXTOS_MOTIVO`), em `packages/domain/src/textos.ts`. Por isso, as 455 frases distintas de `raise exception` e `recusar_*` estão no grupo “Internos, sem mudança”. Entraram todos os textos de `textos.ts`, os 39 motivos que o banco e a API mandam sem texto próprio, e 963 avisos, confirmações, estados e janelas dos componentes, tirados de `Aviso`, `Estado`, `ErroCampo`, `ErroAoCarregar`, `Janela`, `Carregando`, `Toast` e `set*`.
- **Régua de cobrança dos escritórios (CO-06):** ainda não tem código. O e-mail de exemplo aprovado em `console-cobranca` já está no tom.

## O que muda, em resumo

- Todo aviso ao cliente passa a começar com “Olá, {nome}. Aqui é do escritório {nome do escritório}.” e a terminar com “Qualquer dúvida, é só responder esta mensagem.”, como nos desenhos aprovados.
- As cobranças perdem a frase do {link de pagamento} no próprio texto e ganham “Se precisar dos dados para pagar, é só responder aqui.”.
- {parcela} vai entre parênteses, porque a descrição já começa com “Parcela” (hoje sai “A parcela Parcela 3 de 6”).
- O lembrete de audiência põe o local numa frase própria. Se o local faltar, o motor tira só essa frase, e não o lembrete inteiro.
- A mensagem de fora do horário deixa de repetir “Recebi sua mensagem” e de prometer “se eu souber, respondo antes”: depois de passar a conversa, a IA fica em silêncio.
- O nome da IA e a frase de passar dizem “do escritório {nome}”, que serve para qualquer nome de escritório.
- Sem exclamação nos textos fixos e com palavras sem gênero para quem recebe (“Agradecemos”, “Boas-vindas”).
- Os 39 motivos que hoje caem em “Confira os campos destacados e tente de novo.” ganham texto próprio.
- O texto de falha de rede deixa de dizer que “o serviço está fora do ar”. Sai o código técnico dos Relatórios e sai o “tente de novo” repetido das falhas ao salvar.

## Divergências entre o código e os desenhos aprovados

1. **A cobrança ainda leva a frase do {link de pagamento}.** Os modelos semeados ainda têm a frase (0310_portal_whatsapp_ia.sql:251 e 252), e o campo continua na lista dos gatilhos (0320:32 e 33, 0570:36 e 37, automacoes.ts:49 e 55). O motor corta a frase na hora do envio (0340:13), e a tela mostra um texto que não é o que sai. Os desenhos aprovados portal-whatsapp e portal-conversas-automacoes também mostram o link, porque são de antes da decisão.
2. **Os avisos prontos não dizem de quem são.** O código manda “Olá, {nome}. A parcela...” (0310:250 a 255). O desenho aprovado portal-whatsapp mostra “Olá, {nome}. Aqui é do escritório Ribeiro & Matos. ...”, com “é só responder esta mensagem” no fim.
3. **Há dois avisos de etapa.** O ETAPA_CASO pronto (0310:253) diz “Há novidade no seu caso”. O aviso aprovado no Jurídico (0240:181 e juridico.ts:189) diz “Aqui é do escritório... Novidade no seu processo contra...”.
4. **Há dois lembretes de audiência.** O LEMBRETE_AUDIENCIA pronto (0310:254) é curto e põe o local na mesma frase. A prévia da Agenda (FichaCompromisso.tsx:48), que foi aprovada, é completa.
5. **“A parcela Parcela 3 de 6”.** A descrição da parcela já começa com “Parcela” ou “Mensalidade” (0200 e seguintes). Com “A parcela {parcela}”, o texto sai “A parcela Parcela 3 de 6”. O desenho aprovado mostra “A parcela Mensalidade de novembro”.
6. **A mensagem de fora do horário promete o que não acontece.** O texto diz “Se eu souber responder antes, respondo por aqui”. Mas ela só sai quando a IA passa a conversa, e daí em diante a IA fica em silêncio (decidirAntes, ia.ts:143). O horário também está escrito à mão (0310:221), embora seja configurável.
7. **A tela da IA promete link de pagamento.** Em Parcelas e segunda via, a tela diz “o link de pagamento do Financeiro” (whatsapp.ts:30), mas a instrução da IA manda passar a segunda via para uma pessoa (ia.ts:180).
8. **Um código de motivo serve a duas telas.** SEM_PERMISSAO diz “Só quem importou ou a sócia dona...”, mas também chega das petições (“Só quem gerou envia”, 0440). PRAZO_ENCERRADO também chega quando a planilha já foi apagada (0420).
9. **39 recusas caem no texto geral.** Esses 37 motivos do banco e 2 da API não estão em TEXTOS_MOTIVO, e a pessoa lê “Confira os campos destacados e tente de novo.” sem saber o que aconteceu. Onze deles já têm texto próprio numa tela, mas não nas outras.
10. **Os Relatórios mostram um código técnico.** Relatorios.tsx:238 mostra “Código para o suporte: INTERNAL_ERROR”. O desenho aprovado mostra um código de atendimento (CNS-...), que o sistema ainda não gera.
11. **A falha de internet aparece como serviço fora do ar.** api.ts troca a falha de rede por UPSTREAM_UNAVAILABLE, que diz “O serviço está fora do ar agora”.
12. **“tente de novo” aparece duas vezes.** Nove falhas ao salvar juntam o texto do erro com “; tente de novo.”. Fica repetido (“...tente de novo. ...tente de novo.”) ou errado, quando o motivo pede “Recarregue a página”.
13. **O carnê promete o recibo pelo WhatsApp.** Carne.tsx:117 e 211 dizem “O recibo chega pelo WhatsApp do escritório”. O aviso “Pagamento recebido” não leva o recibo, e o envio ainda não existe.
14. **A IA que monta automações assina no fim.** A instrução de montar.ts:91 diz “Assine com o nome do escritório”, mas os textos aprovados dizem quem fala no começo.
15. **Os e-mails não seguem a fonte nem o “Olá” dos outros.** Os e-mails usam a fonte “Source Sans 3”, e a identidade pede Poppins. O convite começa com “Olá!”, e os outros com “Olá, {nome}.”. Fora isso, estão no tom.
16. **A régua de cobrança do Console ainda não existe.** Não há código da régua (CO-06), só o e-mail de exemplo aprovado em console-cobranca (“Olá, Rodrigo. A fatura de novembro...”), que já está no tom. Nada a reescrever agora.

## Perguntas para a Carol

1. Os avisos automáticos começam dizendo de quem são (“Aqui é do escritório {nome do escritório}.”), em vez de assinar no fim? *(Recomendação: Recomendo que sim, como nos desenhos aprovados do WhatsApp, do Jurídico e da Agenda. Quem não salvou o número precisa saber logo na primeira linha quem está falando, e a assinatura no fim fica de fora.)*
2. O cliente é tratado pelo primeiro nome (“Olá, Joana.”)? *(Recomendação: Recomendo que sim. O campo {nome} já traz o primeiro nome do contato principal. “Senhor” e “senhora” ficam só para o tom Formal da IA.)*
3. Os textos fixos ficam sem exclamação, inclusive o “Olá!” da apresentação da IA e do e-mail de convite? *(Recomendação: Recomendo que sim, nos textos fixos. A exclamação só entra quando o escritório escolhe o tom Próximo da IA, como no exemplo aprovado (“Oi, Antônia!”).)*
4. Qual agradecimento usar: “Obrigado”, “Obrigada” ou “Agradecemos”? *(Recomendação: Recomendo “Agradecemos” quando quem fala é o escritório, porque não tem gênero. A IA, que fala como “a assistente virtual”, usa “Obrigada”, como nos desenhos aprovados.)*
5. As palavras com gênero sobre quem recebe, como “Seja bem-vindo”, viram formas neutras, como “Boas-vindas ao escritório”? *(Recomendação: Recomendo que sim. O mesmo texto vai para homens, mulheres e empresas, e a IA que monta as automações recebe a mesma instrução.)*
6. Nas telas, os textos fixos dizem “a sócia dona” mesmo quando o dono é homem? *(Recomendação: Recomendo usar o nome da pessoa quando a tela o tem (“Só Marina Ribeiro pode ligar”). Onde a tela não tem o nome, decida entre “sócia dona” (o que os desenhos aprovados usam) e “sócio dono”. Hoje o código usa as duas formas: 141 vezes “sócia dona” e 59 vezes “sócio dono”.)*
7. A mensagem de fora do horário ganha o campo {horário de atendimento}, no lugar do “de segunda a sexta, das 9h às 18h” escrito à mão? *(Recomendação: Recomendo que sim. O campo já existe nas automações (0570) e acompanha o horário que o escritório configurar. Hoje, quem muda o horário da IA continua mandando “9h às 18h”. É um campo novo para esta mensagem, por isso fica como pergunta.)*
8. Sem link, a cobrança termina com “Se precisar dos dados para pagar, é só responder aqui.”? *(Recomendação: Recomendo que sim. Assim o cliente tem uma saída, e a IA passa o pedido de segunda via para uma pessoa, como a instrução dela já manda. A frase do link sai também do texto modelo, e não só na hora do envio, para a sócia dona aprovar exatamente o que sai.)*
9. Qual lembrete de audiência vale: o aviso pronto, curto, ou o texto da Agenda, mais completo? *(Recomendação: Recomendo o da Agenda, que foi aprovado. O aviso pronto passa a usar o mesmo começo, o “Responda CONFIRMO” e o local numa frase própria (WA-05). Se o local faltar, o motor tira só essa frase, e não o lembrete inteiro.)*
10. Qual forma usar: “Aqui é do escritório” ou “Aqui é o escritório”? *(Recomendação: Recomendo “Aqui é do escritório” em todas as mensagens. É a forma de quase todos os textos e dos desenhos aprovados. Só a prestação de contas (aprovada em portal-carne) usa “Aqui é o escritório”.)*

## Para quem programar depois da aprovação

- Os textos semeados estão em migrations já aplicadas. A mudança entra numa migration nova, que atualiza `whatsapp_avisos` só onde o texto ainda é o semeado (o escritório pode ter ajustado), e troca `ia_config_garantir`, `whatsapp_avisos_garantir` e `aviso_etapa_texto`. Texto de aviso mudado volta para a análise da Meta.
- Tirar `link de pagamento` da lista de campos dos gatilhos de parcela (0570:36 e 37, `automacoes.ts`) só depois da aprovação, junto com os testes que usam o campo (`032`, `034`, `portal-automacoes.spec.ts`).
- Criar códigos próprios para as petições e para a planilha apagada, no lugar de SEM_PERMISSAO e PRAZO_ENCERRADO.
- O painel (`docs/painel/dados/`) ganha a entrega D5 com `refs` quando os textos forem programados.
