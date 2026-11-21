# Site comercial, pedido de demonstração e Interessados · notas

**Aprovado pela Carol em 21/11/2026 às 12h05 (Bahia), com "aprovado" e sem mudanças: as recomendações das 11 perguntas valem como decisões.** Na pergunta 10, como ainda não há piloto confirmado, o texto de valor fica "Os planos ainda estão sendo definidos."

Desenho feito antes do código. Atende F2.1 (SC-01, SC-03, SC-06), F2.2 (SC-02) e F2.3 (SC-05). Segue a IDENTIDADE.md, o conceito Gabinete, a página "em breve" aprovada (ponto de partida do site) e a moldura aprovada do Console (Cobrança, Console v1). O logo e o selo são os SVGs oficiais, sem mudança. Todos os nomes de pessoas e escritórios são fictícios; "hoje" é 21/11/2026.

## Como abrir

- `index.html` apresenta tudo: primeiro o site (computador 1440 e celular 390, página inteira), depois o formulário e os estados, depois o Console. Clique numa imagem para abrir o HTML naquele estado. Caminhos relativos: publique a pasta inteira.
- Site: `inicio.html`, `como-funciona.html`, `para-quem-e.html`, `demonstracao.html` (os links entre elas funcionam). Estados do formulário: `demonstracao.html?estado=erros`, `enviando`, `enviado`, `falha`.
- Console: `interessados.html?aba=lista|ficha&estado=…&papel=admin|implantacao|financeiro|suporte`. As janelas abrem e fecham de verdade (Esc também).
- `_fonte/gerar.sh` refaz tudo (HTML, capturas WebP, axe, index). O `interessados.py` lê a moldura, o CSS, os ícones e as peças da Cobrança aprovada sem mudança (`docs/design/aprovadas/console-cobranca/`); o CSS novo tem o prefixo `in-`. `fontes.css` traz a Alegreya e a Poppins das telas aprovadas (no site real, servidas pelo próprio site, sem Google).

## Conferência

- axe-core 4.10 (WCAG 2.0, 2.1 e 2.2, A e AA) em 54 capturas (27 estados × 2 tamanhos): **nenhuma violação**, nenhuma rolagem lateral, nenhum alvo abaixo de 40 px fora das exceções da WCAG 2.5.8 (link dentro de texto, botão compacto de tabela), nenhum erro de script. Resultado em `_conferencia.json`.
- Contraste: só os pares da IDENTIDADE.md. Branco e sal sobre vinho (10,6:1); vinho sobre âmbar-3 nos botões claros (7,15:1); âmbar-2 sobre vinho só em sobretítulo e nota (5,5:1); tinta suave #6E5562 sobre sal e branco (5,5:1 ou mais); tinta sobre âmbar (6,8:1). O âmbar nunca é texto no claro e nunca leva texto branco.
- Página de 390 px sem rolagem lateral; menu do celular com `<details>` (sem JavaScript); "Pular para o conteúdo"; foco de 3 px #AC3F6B (#F2CDB3 sobre vinho).

## Estados

| Grupo | Estado | O que mostra |
|---|---|---|
| Site | Início | Abertura, fatos, dores, caminho em 5 passos, o que existe e o que é planejado, dados, valor, chamada |
| Site | Como funciona | 6 etapas com exemplo ilustrado e situação de hoje; 4 passos para começar |
| Site | Para quem é | Perfil, "faz sentido se" e "talvez ainda não", perguntas frequentes |
| Formulário | em branco, erros, enviando, enviado, falha | Ver "Pedido de demonstração" abaixo |
| Console | lista, lista todos, lista pela Implantação | Números, filtros, tabela (cartões no celular) |
| Console | vazio, carregando, erro, busca sem resultado, sem permissão | Padrão do Console v1 |
| Console | ficha novo, ficha em contato | Pedido como chegou, autorização de dados, notas, histórico, ações |
| Console | atribuir, próximo passo, mudar estágio, mudar sem motivo | Janelas no padrão aprovado |
| Console | converter, convertido | Cadastro de escritório aprovado, já preenchido; depois, o atalho para a ficha |
| Console | perder, perdido, descartado | Encerrar com motivo obrigatório; reabrir |

## Decisões de design

1. **Várias páginas, não uma só.** Quatro páginas curtas (Início, Como funciona, Para quem é, Demonstração), cada uma com título, descrição, endereço canônico e prévia de compartilhamento próprios, e dados estruturados (Organization no Início, FAQPage em Para quem é). Ajuda a busca, deixa cada link compartilhável e o Início continua completo sozinho, com um resumo de tudo. Em Astro vira um layout com topo e rodapé e quatro páginas estáticas, sem JavaScript além do formulário.
2. **O site continua a página "em breve".** Mesmo corte diagonal vinho/sal, coluna tom sobre tom, folhas sobrepostas, selo atravessando o corte e a fita das nove cores. O topo virou uma faixa vinho inteira para o menu ficar legível dos dois lados do corte.
3. **Honestidade (SC-03) com três selos:** "No T3jus" (construído e testado), "Em preparação" (construído; falta ligar a um serviço de fora) e "Planejado" (ainda não existe), com a legenda à vista. Saiu do painel: WhatsApp e IA estão "Em preparação" porque a ligação com a Meta (F3.58) e o envio dos avisos (F3.3, F3.37, F3.44) estão pendentes; Pix ou boleto com baixa automática (F3.20), recibo em PDF (F3.19), leitura de publicações (VA-02), assinatura eletrônica (CH-09), Google Agenda (EX-13), importar de outros sistemas (F3.56), procuração gerada (F3.16) e prestação de contas pelo WhatsApp (F3.44) aparecem como "Planejado". Não há preço, depoimento, logo de cliente, número de uso nem selo de certificação.
4. **As ilustrações do produto são cartões desenhados com dados fictícios**, com o selo "Exemplo", não capturas de tela. Ficam leves, legíveis no celular e não envelhecem quando a tela mudar.
5. **"Entrar"** leva a `https://app.t3jus.pro`. **Contato:** `contato@t3jus.pro` no rodapé, na chamada final e na página Demonstração. A política de privacidade aparece como "em preparação" (F2.4) e o formulário já aponta para `/privacidade`.
6. **Prévia de compartilhamento:** todas as páginas usam a `og.png` aprovada. Uma imagem por página pode vir depois (pergunta 7).

### Pedido de demonstração (F2.2)

- Campos: nome, escritório, e-mail, WhatsApp (obrigatórios); tamanho em 4 botões ("Só eu", "2 a 5", "6 a 10", "Mais de 10"), obrigatório; área de atuação e "como vocês se organizam hoje" opcionais; autorização obrigatória.
- Erros no padrão das telas de acesso: o botão nunca fica desabilitado; ao enviar, resumo no topo ("Falta acertar 4 pontos, marcados abaixo. Nada foi enviado ainda.") com foco nele, e cada erro preso ao campo (`aria-invalid`, `aria-describedby`).
- Enviando: botão "Enviando o pedido…" ocupado, campos travados, anúncio para leitor de tela. Falha: tudo o que a pessoa escreveu continua, "Tentar de novo" e o e-mail como saída. Enviado: confirmação com o resumo, o prazo e uma cópia por e-mail.
- **Contra robô, sem captcha:** campo isca escondido (quem preenche é descartado em silêncio), tempo mínimo entre abrir e enviar (por exemplo 3 s), limite de pedidos por IP e por e-mail no servidor e conferência de formato do e-mail e do telefone. Só se aparecer spam de verdade, ligar o Cloudflare Turnstile no modo invisível.
- O que o servidor guarda (SC-02): os campos, data e hora, origem (página e campanha, se houver) e a autorização com o texto exato e a versão. Dados mínimos no log (PT-13).

### Console › Comercial › Interessados (F2.3)

1. **Mora no item "Comercial" do trilho**, que já existia como lugar reservado, com o contador do que pede atenção (sem responsável + próximo passo vencido).
2. **Estágios:** Novo → Em contato → Demonstração marcada → Proposta enviada → Virou cliente; saídas Perdido (não fechou) e Descartado (teste, propaganda, repetido, fora do público). Cada selo tem ícone e texto, nunca só cor.
3. **Lista:** números (sem responsável, vencidos, pedidos do mês, funil por estágio), busca, filtros de responsável e origem e atalhos por estágio. Colunas: interessado, origem, chegou em, estágio, responsável e próximo passo com data; vencido em destaque com ícone. Pedido novo sem dono tem "Ficar com ele" na própria linha.
4. **Ficha:** a abertura vinho/âmbar da fatura aprovada, com o próximo passo no lado âmbar. O pedido aparece como chegou (não se edita; a equipe completa cidade e UF, marcadas "completado pela equipe"). A autorização de dados mostra data, hora, o texto aceito, a versão, a finalidade e o prazo de guarda. Notas e histórico seguem o Console v1 (nada se edita nem se apaga).
5. **Mudar estágio pede motivo obrigatório**, como no Console v1, com o caminho "de → para"; "Demonstração marcada" pede data e hora e já sugere o próximo passo.
6. **Virar escritório cliente** abre o mesmo "Cadastrar escritório" aprovado, já preenchido (nome, cidade, UF, marcados "veio do pedido"), e diz o que vai junto: o contato, o pedido, a autorização, as notas e o histórico ligados à ficha, e o responsável atribuído como Implantação. Pede "Como fechou" (o motivo). Depois, o interessado mostra "Agora é cliente" com o atalho para a ficha e para convidar o sócio.
7. **Perdido** pede o porquê (lista curta) e o motivo, e pode marcar quando procurar de novo (vira próximo passo). **Descartado** sai dos números e mostra a data em que os dados serão apagados. Os dois podem ser reabertos, com motivo.
8. **Quem vê:** Administração e Implantação. Financeiro e Suporte veem "Esta página é da Administração e da Implantação" (dados pessoais de quem pediu).
9. **Avisos:** pedido novo avisa no sino de quem vê Interessados e manda à pessoa uma resposta automática ("recebemos seu pedido"), de `nao-responda@t3jus.pro`.

### Para o servidor (quando for programar)

- Tabela `interessados` (dado do T3jus, não de escritório: sem `escritorio_id`, protegida como as tabelas do Console), `interessado_eventos` (só inserção), `interessado_notas` (só inserção) e o `interessado_id` de origem guardado no escritório criado. A rota pública do formulário só insere, com limite por IP.
- Apagar os dados de quem não virou cliente no prazo combinado (pergunta 5), com registro do apagamento.

## Textos principais do site (para revisar)

- **Título do Início:** "Do primeiro atendimento ao honorário recebido."
- **Subtítulo:** "O T3jus junta o comercial e o financeiro do escritório aos casos: o cliente atendido pelo WhatsApp do escritório, contratos com parcelas, carnê com o seu Pix, repasses, caixa, prazos e agenda. Num só lugar, e cada pessoa vê só a parte dela."
- **Botões:** "Pedir uma demonstração" e "Ver como funciona". Nota: "Uma conversa com a nossa equipe, sem compromisso."
- **Dores:** "O escritório cresce, e o dinheiro escapa nos intervalos." O cliente escreve no WhatsApp de alguém · A parcela atrasa e ninguém percebe · O alvará sai e o repasse fica para depois.
- **Caminho:** "Cada etapa leva à próxima, sem redigitar." Atendimento · Proposta · Contrato e honorários · Caso, prazos e agenda · Recebido e repassado.
- **Recursos:** "O que já existe, e o que ainda não." "Preferimos dizer com clareza."
- **Dados:** "Sigilo profissional, levado a sério." Cada escritório separado · No Brasil · Nada some em silêncio · Acesso de cada um · Exportação completa · Controlador e operador.
- **Valor:** "Combinado com você, na demonstração." "Os planos estão sendo definidos com os primeiros escritórios."
- **Chamada:** "Veja o T3jus com a rotina do seu escritório."
- **Como funciona:** "Um caminho só, do primeiro contato ao dinheiro no lugar certo."
- **Para quem é:** "Para o escritório em que o sócio cuida de tudo." "Pequeno na equipe, grande na rotina." "Talvez ainda não seja para você se: precisa hoje da leitura automática de publicações; a cobrança precisa sair por boleto registrado com baixa automática; o escritório tem muitas dezenas de advogados."
- **Autorização do formulário:** "Autorizo o T3jus a usar estes dados para responder ao meu pedido de demonstração, como diz a Política de privacidade."
- **Enviado:** "Pedido recebido, Lívia. A nossa equipe responde em até 1 dia útil, pelo e-mail ou pelo WhatsApp que você deixou, para marcar um horário."

Títulos e descrições (SEO): "T3jus · Gestão para escritórios de advocacia", "Como funciona · T3jus", "Para quem é · T3jus", "Pedir demonstração · T3jus", cada um com descrição própria de até cerca de 160 caracteres.

## Perguntas para a Carol

1. **Preço no site?** Recomendo não mostrar valor agora: "combinado na demonstração", como está, até os planos (VA-08) fecharem com os pilotos.
2. **Uma página ou várias?** Recomendo as quatro páginas, como está (busca, links compartilháveis), com o Início completo sozinho.
3. **WhatsApp de contato além do e-mail?** Recomendo esperar o número do T3jus estar ligado à Meta e, então, pôr um botão "Falar no WhatsApp" na página Demonstração. Por ora, só e-mail.
4. **Prazo de resposta prometido?** Recomendo "em até 1 dia útil", como está; o Console marca o próximo passo do pedido novo com esse prazo.
5. **Por quanto tempo guardar quem não virou cliente?** Recomendo 12 meses depois do último contato, ou antes a pedido. Precisa entrar na política de privacidade (F2.4) antes de o formulário ir ao ar.
6. **O que mostrar como planejado?** Recomendo a lista curta que está no Início (6 itens), sem datas. A palavra "Em preparação" para o WhatsApp e a IA está certa para você?
7. **Imagem de compartilhamento por página?** Recomendo manter a `og.png` aprovada em todas agora e fazer uma por página quando o site for ao ar.
8. **Medição de visitas?** Recomendo uma ferramenta sem cookies e sem dado pessoal (Vercel Web Analytics, já que o site está na Vercel, ou Plausible), o que dispensa aviso de cookies. Nada de Google Analytics por enquanto.
9. **Quem vê Interessados?** Recomendo Administração e Implantação nesta versão; uma função "Comercial" só quando houver alguém só de vendas.
10. **"Os primeiros escritórios" no texto de valor:** pode dizer isso? Se ainda não há piloto confirmado, troco por "Os planos ainda estão sendo definidos."
11. **Política de privacidade (F2.4):** o formulário pode ir ao ar antes dela? Recomendo não: o link da autorização precisa levar a um texto revisado.
