> **Aprovado pela Carol em 21/11/2026, às 9h08 (Bahia):** as 3 perguntas como recomendado (dentro da Agenda de hoje, só audiências, 7 dias e até 3).

# Portal: Início, próximas audiências · notas

> **Para a Carol aprovar.** É um acréscimo pequeno no Início por áreas, que ela aprovou em 19/11/2026 e já está programado. O resto da tela não muda.

O que falta no Início: as **próximas audiências** (EX-06: "as próximas aparecem na tela inicial"; item F3.2 do painel). Hoje o Início só mostra a "Agenda de hoje", da equipe toda, na parte comum à direita, e o hero diz "4 compromissos hoje · audiência às 11h". As audiências dos próximos dias não aparecem.

Aproveitei para mostrar, no bloco Jurídico, como ficam **dois itens novos** que já estão sendo programados no padrão de item aprovado. Eles não são tela nova:

- o **prazo em 2 dias**: o lembrete 2 dias antes, só nos prazos com "Lembrar o responsável 2 dias antes" marcado (F3.38);
- a **petição esperando a sua revisão** (EX-09, decisão 20 das Petições aprovadas; F3.76).

**Leitura do pedido (seguida sem divergir):** um trecho com as audiências dos próximos 7 dias, da equipe toda, visível para todos, que leva ao compromisso na Agenda. A única escolha minha é o lugar: **dentro da folha "Agenda de hoje"**, logo abaixo da lista do dia, e não numa folha própria (decisão 1).

Atende **EX-06** na parte que faltava (a tela inicial). Pesam também PA-01 (a agenda é parte comum, todos veem), PT-02 (o link leva ao compromisso, nunca ao caso), PT-10 (WCAG 2.2 AA, celular e estado vazio) e PD-07 (quem vai, em cada audiência). No Jurídico, mostra o desenho de F3.38 (EX-04, EX-02) e F3.76 (EX-09).

A base é o **Início por áreas aprovado** (`docs/design/aprovadas/portal-inicio-areas/`). O `comum.py`, o `clientes.py`, o `pendencias.py`, o `inicio_areas.py` e o `webp.py` são **cópias sem mudança**. O `inicio_audiencias.py` executa o `inicio_areas.py` até antes dos estados e troca só duas coisas: a folha Agenda de hoje (ganha o trecho embaixo) e o bloco Jurídico (ganha os dois itens). O item de audiência é a peça `.ev` aprovada (filete `--t` do tipo Audiência), e o pé é o `.ar-pe` aprovado. As peças novas têm o prefixo `pa-`. Os ícones de vídeo e de local vêm da Agenda aprovada (`portal-agenda-conversas`). O elenco, os dados e a data são os mesmos (quarta, 18/11/2026, 10h12). As audiências são as da Agenda aprovada (semana e mês de novembro).

## Como abrir

- `index.html` mostra os 5 estados em computador (1440) e celular (412), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- `inicio.html` abre sozinho, com as fontes, o CSS e os ícones embutidos. O estado vem do endereço:
  - `inicio.html?estado=dona`: Marina, os dela (o principal);
  - `?estado=dona-equipe`: Marina, da equipe;
  - `?estado=larissa`: só Jurídico;
  - `?estado=paula`: sem área;
  - `?estado=vazio-audiencias`: nenhuma audiência nos próximos 7 dias.
- No celular, `&mais=1` abre a folha Mais. Os botões "Os meus" e "Da equipe" trocam entre `dona` e `dona-equipe`. Cada audiência leva ao compromisso na Agenda aprovada, e "Agenda do mês" leva ao mês. Os links das áreas levam às telas aprovadas, que ficam ao lado desta pasta.
- Abaixo de 760 px, o HTML vira a versão de celular, com a barra de baixo aprovada.
- A pasta `_fonte/` guarda os scripts, e `sh _fonte/gerar.sh <pasta>` refaz tudo:
  - `inicio_audiencias.py` gera o `inicio.html`;
  - `casos_pa.py` gera a lista de estados (`casos_pa.json`) e o `index.html`;
  - `fotos_pa.cjs` é o `fotos_ia.cjs` aprovado lendo a lista nova. Ele faz as capturas com deviceScaleFactor 2 e roda as conferências: o axe (WCAG 2.0, 2.1 e 2.2, A e AA), a rolagem lateral, os alvos menores que 44 px e os erros de script. O axe vem do `@axe-core/playwright` de `sistema/node_modules`;
  - `webp.py` converte as capturas para WebP. A única mudança em relação ao aprovado: uma captura mais alta que o limite do WebP (16.383 px) é reduzida só o necessário. Isso aconteceu com `dona-equipe-celular`, que ficou em 795 × 16.383 px, cerca de 1,93×.
- **Conferência** (`_conferencia.json`): 10 capturas, 0 violação do axe, 0 rolagem lateral, 0 alvo pequeno, 0 erro de script.

## Decisões de design

1. **Dentro da folha "Agenda de hoje", não numa folha própria.** O trecho fica logo abaixo da lista de hoje, separado por um fio e com um título próprio: "Próximas audiências · Da equipe toda · de amanhã até 25/11". Os motivos:
   - é o mesmo assunto (o tempo da equipe) e usa o mesmo link "Agenda" do alto da folha;
   - uma folha própria repetiria o cabeçalho, a legenda e o link, e empurraria o "Esperando alguém" para baixo;
   - o Início de Paula, que é a agenda e as conversas lado a lado, continua com duas folhas;
   - no celular, o trecho vem junto da agenda, depois dos blocos, como a recomendação pedia.

   Pergunta 1.
2. **Só audiências** (o tipo Audiência da Agenda). Reunião, assinatura, compromisso interno e os tipos escritos, como Perícia, ficam na Agenda. Pergunta 2.
3. **De amanhã até 7 dias depois** (de 19/11 a 25/11), **no máximo 3**, as mais próximas primeiro. A audiência de hoje já está na lista do dia, logo acima, e não se repete. Pergunta 3.
4. **Cada audiência é a peça `.ev` aprovada**, com o filete vinho do tipo Audiência:
   - à esquerda, o dia abreviado ("Qui, 19/11") sobre a hora em serifa, no lugar da hora sozinha da agenda do dia;
   - em sobretítulo, "Audiência" e, quando é amanhã, "amanhã" em #AC3F6B. A palavra vem escrita, a cor só reforça;
   - o título, que é o tipo de audiência e o caso, como na Agenda ("Instrução · Corrêa x Rota Sul");
   - a modalidade com o ícone da Agenda aprovada (vídeo ou local), o lugar e quem vai ("Presencial · TRT-2, Barra Funda · Marina e Gustavo").

   **O cartão inteiro é um link** para o compromisso na Agenda. Assim o alvo é grande, e o título fica em vinho para mostrar que leva a algum lugar. O link da sala e o lembrete ao cliente ficam na ficha do compromisso, onde já estão: o "Entrar na sala" só faz sentido no dia.
5. **O pé diz o que vem depois**, no `.ar-pe` aprovado:
   - com até 3 audiências: "Nenhuma outra até 25/11. A seguinte é na quinta, 26/11, às 13h30: Instrução · Lima x Padaria Estrela.", com o link "Agenda do mês";
   - com mais de 3: "Mais N até 25/11.", com o link "Ver na Agenda". Os dados da Agenda aprovada têm só 3 audiências na semana, por isso esse caso não aparece nas capturas.
6. **Sem audiência na semana, o trecho fica**, com o título e uma linha: "**Nenhuma audiência nos próximos 7 dias.** A próxima é na quinta, 26/11, às 13h30…", mais o link "Agenda do mês" (estado `vazio-audiencias`). Ele não some, pela mesma regra dos blocos aprovados (decisão 13 do Início por áreas): a folha não muda de forma de um dia para o outro. Se não houver nenhuma audiência marcada adiante, a segunda frase sai.
7. **Todos veem, inclusive Paula, que não tem área**, como a Agenda de hoje. A audiência mostra só o que a agenda comum já mostra, e o link leva ao compromisso na Agenda, nunca ao caso. Quem não tem o Jurídico não esbarra numa tela bloqueada.
8. **O hero não muda.** Ele continua dizendo "4 compromissos hoje · audiência às 11h". Um terceiro número disputaria com "pedem você hoje", e as próximas estão a um passo, na coluna ao lado.
9. **Jurídico: prazo em 2 dias.** Fica em "A acompanhar":
   - verbo "Preparar";
   - título com o prazo e o caso ("Impugnação ao laudo · Ferreira x Banco Horizonte");
   - "Fazer até sexta: o prazo final é segunda";
   - detalhe com o processo e "lembrete de 2 dias, marcado no prazo";
   - selo âmbar claro "em 2 dias" (`selo-implant`, com o relógio).

   O disco mostra a data do "fazer até" (20/11), que é a data do lembrete. Sem "fazer até", o lembrete usa o prazo final. É a mesma regra que o servidor já usa (`coalesce(fazer_ate, data_final)`). Quando a data chega, o item passa para "Para hoje" como o "Fazer até hoje" aprovado. Sem "lembrar" marcado, o prazo só aparece no dia.
10. **Jurídico: petição para revisar.** Fica em "Para hoje":
    - verbo "Revisar";
    - título "Contestação · Souza x Construtora Atlas", que leva à tela de revisão aprovada;
    - "Revisar a petição que Felipe mandou em 17/11";
    - detalhe com o prazo do caso;
    - selo âmbar "Revisar", com o lápis.

    Ele **substitui a tarefa feita à mão "Revisar a contestação de Felipe"**, que o Início aprovado mostrava. A revisão já é um pedido da petição, e duas linhas para a mesma coisa confundem. Com o item novo, o bloco de Marina tem 6 itens: mostra 5, e o pé diz qual ficou de fora ("Mostrando 5 de 6. O outro está esperando o cliente…"), pelo limite aprovado.
11. **Dados que ajustei para não contradizer as telas aprovadas:**
    - no Jurídico aprovado, a contestação de Souza x Construtora Atlas vence **hoje, 18/11**, e não em 20/11. Por isso o detalhe diz "prazo da contestação: hoje, 18/11";
    - quem revisa segue o Início e o Jurídico aprovados (a tarefa de revisão é de Marina). Nas Petições aprovadas, o responsável pelo caso é Felipe e quem manda é a estagiária Beatriz. No produto, o servidor decide; aqui é só exemplo;
    - sexta, 20/11, é feriado na Agenda aprovada (Consciência Negra). O lembrete conta dias corridos, porque o Jurídico aprovado decidiu que o T3jus ainda não conta dias úteis. Por isso o texto só repete as datas que a pessoa marcou;
    - o Início aprovado e a Agenda aprovada mostram compromissos diferentes para hoje. Mantive a Agenda de hoje do Início, sem mudança. As próximas audiências vêm da Agenda: Corrêa x Rota Sul (quinta, 13h30), Mendes x Loja Bela Casa (quinta, 16h, a do estado "marcado" da Agenda), Castro x Seguradora Leste (terça, 24/11) e, depois da janela, Lima x Padaria Estrela (26/11).
12. **Celular:** o trecho vem dentro da Agenda de hoje, depois dos blocos, com a barra de baixo aprovada. A coluna do dia fica com 60 px, e o lugar e quem vai quebram em duas linhas quando precisa.
13. **Carregando e erro:** não desenhei de novo. Seguem a decisão 14 do Início por áreas. Enquanto o trecho carrega, mostra o esqueleto aprovado com `aria-busy`. Se falhar, uma linha no lugar da lista diz "Não deu para carregar as próximas audiências", com Tentar de novo e o link para a Agenda. A Agenda de hoje continua.

## Acessibilidade (WCAG 2.2 AA)

- **Conferência automática** em 10 capturas (5 estados × computador e celular), feita pelo `fotos_pa.cjs`. O resultado completo fica em `_conferencia.json`:
  - o axe (WCAG 2.0, 2.1 e 2.2, A e AA) não achou nenhuma violação;
  - nenhuma tela tem rolagem lateral;
  - nenhum alvo é menor que 44 px;
  - nenhum erro de script.
- **Estrutura:** "Próximas audiências" é um `h3` dentro da folha "Agenda de hoje", que é `h2`. A lista é `ol`, ligada ao título por `aria-labelledby`.
- **Datas:** cada audiência tem `<time datetime="2026-11-19T13:30">`, com o dia e a hora escritos.
- **Link:** o cartão inteiro é um `a`, e o nome dele lê o tipo, o título, a modalidade, o lugar e quem vai. O foco usa o contorno #AC3F6B de 3 px.
- **Contraste:** só pares aprovados:
  - título em vinho sobre #F2ECE8;
  - "amanhã" em #AC3F6B sobre #F2ECE8 (4,88:1);
  - selo "em 2 dias" em vinho sobre #F2CDB3 (7,15:1);
  - selo "Revisar" em tinta sobre #E9AE90 (8,6:1).

  Ao passar o mouse, o fundo da audiência não muda: o "amanhã" em #AC3F6B daria 3,9:1 sobre o âmbar claro. O cartão ganha um contorno #AC788D e o título fica sublinhado.
- **Cor:** nada depende só dela. Tipo, "amanhã", modalidade, "em 2 dias" e "Revisar" vêm escritos.

## O que precisa do servidor

Nenhuma tabela nova e nenhum campo novo. As audiências saem de `compromissos` (`tipo = 'AUDIENCIA'`), que já tem `escritorio_id` e passa por `proteger_tabela_escritorio`. O escritório e a pessoa vêm sempre da sessão.

| Rota | O que devolve | Quem pode |
|---|---|---|
| `GET /v1/inicio/audiencias` (função `portal_inicio_audiencias(p_pessoa, p_escritorio)`) | `itens`: até 3 audiências com `estado = 'MARCADO'` e o dia (em Brasília) entre `hoje_brasilia() + 1` e `hoje_brasilia() + 7`, ordenadas por `inicio`. Cada uma com `id`, `inicio`, `titulo`, `modalidade`, `local`, `responsavel` e `tambemVai` (nomes curtos, o responsável primeiro). Também devolve `total` no período (para "Mais N"), `ate` (a data final da janela) e `seguinte`, a primeira audiência depois da janela (`id`, `inicio`, `titulo`), para o pé e o vazio | Todos do escritório (`escritorio.ver`), como a Agenda de hoje. Não depende de área |
| `GET /v1/inicio/juridico` | Já devolve os dois itens novos (migração `0500_portal_inicio_completo.sql`). O prazo em 2 dias vem com `grupo = 'ACOMPANHAR'`, `em = coalesce(fazer_ate, data_final)`, `fazerAte`, `dataFinal` e `lembrete = true`. A petição vem com `grupo = 'HOJE'`, `por`, `enviadaEm`, `caso` e `prazo` (o prazo aberto mais próximo do caso) | Jurídico |

Uma consulta própria para as audiências, e não um campo a mais no `portal_inicio_resumo`, mantém a regra aprovada: cada parte carrega e falha sozinha. O cancelado (`estado <> 'MARCADO'`) não aparece. Remarcar move a audiência na lista, porque a consulta lê o `inicio` atual.

## Para o painel

- A entrega atende **EX-06** na parte "as próximas aparecem na tela inicial" (F3.2). Com a Agenda já programada, EX-06 fica completa quando este trecho for programado.
- Os itens do Jurídico seguem F3.38 e F3.76, já em código. O desenho só confirma como eles aparecem; não muda o que o servidor devolve.

## Perguntas para a Carol

1. **As próximas audiências ficam dentro da folha "Agenda de hoje" ou numa folha própria, logo abaixo?** **Recomendo dentro da Agenda de hoje**, como está. É o mesmo assunto e o mesmo link "Agenda", a coluna da direita não cresce com mais um cabeçalho, e o Início de Paula continua com a agenda e as conversas lado a lado.
2. **Entram só as audiências, ou também os tipos escritos, como Perícia?** **Recomendo só as audiências**, que é o que a ideia pede e o que pode gerar multa se alguém faltar. Perícia, reunião e assinatura seguem na Agenda, e o trecho continua curto.
3. **Sete dias e até 3 audiências bastam?** **Recomendo 7 dias e 3**, com o pé dizendo "Mais N até 25/11" e qual é a seguinte. Três cabem sem empurrar o "Esperando alguém" para fora da tela no computador. Se o escritório tiver muitas audiências, o primeiro ajuste é subir para 5, o mesmo limite dos blocos.
