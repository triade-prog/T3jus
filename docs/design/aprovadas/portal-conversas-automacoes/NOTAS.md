# Portal: Conversas › Automações · notas

> **Aprovado pela Carol em 19/11/2026, à 1h16 (Brasília).** Ela respondeu "pode seguir o recomendado": as 5 perguntas do fim valem como decisões. Ela perguntou se as automações eram só do Financeiro: não, cada automação é da área do seu gatilho; entre as prontas, etapa do caso e lembrete de audiência são do Jurídico. Os gatilhos de outras áreas (cliente novo, caso encerrado, documento pendente) seguem pendentes.

> Desenho feito a partir da referência de editor de fluxos que ela mandou (19/11/2026). Da referência veio só a ideia: o desenho em blocos, as sugestões da IA tracejadas com “Aplicar tudo / Recusar”, os passos no alto e o painel do assistente. O visual é o do Gabinete e parte do desenho aprovado de Agenda e Conversas, sem mudar a moldura.

A nova seção **Automações** da área Conversas (rota `/conversas/automacoes`) atende:

- **PA-03** (ideia nova): automações de mensagens do WhatsApp montadas num desenho de fluxo (gatilho, condições, mensagem do modelo, espera, ramos, IA responde e passar para uma pessoa). A IA sugere o fluxo a partir de um pedido em linguagem simples, os passos sugeridos aparecem tracejados até a sócia dona revisar, testar sem enviar e ligar, e cada execução fica no histórico;
- EX-11, EX-14 e FI-12: o lembrete de audiência, o aviso de etapa e a prestação de contas viram automações prontas, que o escritório abre e ajusta. O histórico do lembrete de audiência está desenhado;
- FI-04: a cobrança respeita o combinado de pagamento e a próxima ação registrados no Financeiro (parcela com combinado fica de fora);
- PD-07 e EX-10: todo “passar para pessoa” tem responsável (pessoa ativa ou regra), e quem sai da equipe tem substituto definido no próprio passo.

Pesam também PA-01 (o que a pessoa não pode ver não aparece), PT-03 (nada é apagado; versões, motivo ao desligar, histórico de quem e quando) e PT-10 (WCAG 2.2 AA, celular, vazio e erros).

As telas partem do desenho aprovado de Conversas: mesma moldura do Portal v1 (`comum.py` sem mudança), mesmo `extra.py` e o CSS `cv-` aprovado, lido direto do `conversas.py`. As peças novas têm o prefixo `au-`. Elenco e “hoje” iguais: Ribeiro & Matos, quarta, 18/11/2026, 10h12.

## Como abrir

- `index.html` mostra os 11 estados em computador (1440) e celular (412), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- `automacoes.html` abre sozinho, com as fontes, o CSS e os ícones embutidos. O `index.html` usa o Google Fonts.
- O estado vem do endereço: `automacoes.html?estado=` com `lista`, `pedir`, `vazio`, `nao-conectado`, `sugestao`, `bloco`, `erros`, `testar`, `ligar`, `historico` ou `so-leitura`. No celular, `&mais=1` abre a folha Mais.
- Abaixo de 760 px, o HTML vira a versão de celular. Funcionam a janela “Pedir à IA” (abre, fecha, Esc), o Mais, os passos do alto e o “Mostrar no desenho” (leva ao bloco e põe o foco nele). O resto é desenho.
- A pasta `_fonte/` guarda os scripts, e `sh _fonte/gerar.sh` refaz tudo:
  - `comum.py` e `extra.py` são as cópias sem mudança do aprovado de Agenda e Conversas;
  - `conversas.py` está ali só como fonte do CSS `cv-` aprovado (não é rodado);
  - `automacoes.py` gera o HTML; `casos.py` gera a lista de estados e o `index.html`;
  - `fotos.cjs` faz as capturas (deviceScaleFactor 2) e as conferências; `webp.py` converte para WebP;
  - o axe vem de `@axe-core/playwright`; se não estiver no caminho do node, use `AXE_PW=<caminho>/node_modules/@axe-core/playwright sh gerar.sh ..`.
- Dados fictícios, no elenco do Clientes e do Financeiro aprovados: Farmácia Bom Jesus com 3 dias de atraso hoje, Construtora Vale Alto e Daniela com combinado de pagamento, Eduardo Nascimento com número fixo, Hélio com 24 dias. Irene Castro e Gabriela Teixeira entram com parcelas atrasadas inventadas para o teste.

## Decisões de design

### Onde fica

1. **Conversas ganha a seção Automações, entre Mensagens e Avisos automáticos** (pergunta 1). A ordem segue o trabalho: conversar, montar o que sai sozinho, conferir o que saiu. Os seis avisos fixos (“Quais avisos saem”) viram **automações prontas do T3jus**, ligadas, com o mesmo texto e as mesmas regras de antes. “Avisos automáticos” continua igual, como o registro do que saiu; o bloco “Quais avisos saem” de lá passa a ser um link para Automações (mudança pequena na tela aprovada, não redesenhada aqui).
2. **A lista** separa “Criadas pelo escritório” e “Prontas do T3jus”. Cada linha mostra:
   - o nome e **quando sai, em linguagem simples** (“Quando a parcela chega a 3 dias de atraso. Se não pagar em 5 dias, passa para Gustavo.”);
   - a situação com selo escrito e ícone: Ligada (vinho), Desligada (neutro, com o motivo), Rascunho (âmbar-3, com o que falta) e Em aprovação no WhatsApp (atenção, com desde quando);
   - quanto saiu nos últimos 7 dias e as falhas (com ícone e número, nunca só cor);
   - quem mexeu por último e quando.

   No alto, quatro discos resumem (ligadas, em aprovação, rascunho, falha). Ao lado, a folha **“Limites que valem sempre”** deixa as regras à vista antes de qualquer pessoa montar algo.
3. **Dois jeitos de começar:** “Pedir à IA” (principal) e “Nova automação” (montar do zero). Pedir à IA abre uma janela com o pedido em linguagem simples, exemplos e a regra escrita: nada é salvo antes de aplicar, nada sai antes de testar e ligar.

### O editor

4. **Quatro passos no alto: 1 Montar · 2 Testar · 3 Ligar · 4 Histórico.** Cada passo diz o seu estado (“5 sugestões para revisar”, “Sem enviar nada”, “Só a sócia dona”, “Ainda nada saiu”). Um passo que ainda não pode ser feito fica travado, com o motivo escrito no lugar do subtítulo (ex.: “Aplique ou recuse as sugestões”), em vez de botão cinza sem explicação.
5. **O fluxo desce de cima para baixo, com os ramos lado a lado.** É como um advogado lê um procedimento: primeiro isto, depois aquilo, e “se… então”. A referência ia da esquerda para a direita; aqui isso exigiria rolagem lateral num computador de 1440 e não funcionaria no celular. Os blocos têm largura fixa (380 px), as setas são linhas finas em vinho-4, e o fundo pontilhado em sal é o “papel de rascunho”. Os ramos sempre terminam em “Fim” ou numa pessoa: não há fio solto.
6. **Oito tipos de passo**, cada um com ícone no mesmo traço e o tipo escrito em sobretítulo (“3 · Mensagem”): Gatilho (o único em campo âmbar, o ponto de atmosfera da tela), Condições, Mensagem, Espera, Ramos, IA responde, Passar para pessoa (ícone em vinho, porque é onde entra gente) e Fim. Cinco ícones novos: raio, ramo, ligar, fluxo e ampulheta.
7. **Sugestão da IA = tracejado + selo escrito “Sugerido pela IA”.** O contorno contínuo é o que já está salvo no rascunho. Cada passo sugerido tem “Aplicar” e “Recusar”; a faixa âmbar no alto tem “Aplicar tudo” e “Recusar tudo” e conta quantos são. A legenda (“Tracejado: sugerido pela IA, ainda não salvo”) fica sempre logo abaixo. Aplicar só muda o rascunho: a automação continua desligada, e o aviso diz isso.
8. **O assistente fica à direita, em folha com cabeça vinho** (a mesma família do cabeçalho da ficha):
   - “Você pediu”: o pedido de Marina em balão vinho, como a mensagem da equipe em Conversas;
   - “O que a IA fez”: cada item com ✓ e “Mostrar no desenho”, que leva ao bloco e põe o foco nele;
   - “Para você decidir”: os alertas com “!”, em cartão com filete vinho-3. No exemplo, dois: a automação antiga “Parcela em atraso” cobraria na mesma semana (acima do limite) e o texto é um modelo novo que depende da Meta;
   - “Experimente a seguir”: três sugestões de pedido;
   - o campo de pedir mudança e, no pé, **“A IA sugere, você aprova.”**
9. **O texto da mensagem é modelo, não conversa.** A IA pode rascunhar, mas o texto só vale quando a sócia dona clica “Aprovar o texto”; depois é fixo, e só os campos mudam por cliente ({nome}, {parcela}, {valor}, {vencimento}, {link de pagamento}, {nome do escritório}). O bloco aberto (estado `bloco`) mostra: nome do modelo, o aviso “Rascunho da IA, ainda não vale”, o texto com contador (limite de 1.024 do WhatsApp), os campos que **aquele gatilho tem** como botões, a prévia em balão como Sueli veria, o aviso do modelo da Meta e o histórico do texto (o que a IA escreveu e o que Marina mudou).
10. **Erros presos ao bloco e resumo no topo**, no padrão aprovado dos formulários: o bloco ganha filete e borda vinho-3, o selo “Precisa de ajuste” e a frase do erro; o resumo tem um link para cada bloco. Os três erros desenhados são o caminho sem saída (“Se respondeu” não leva a nenhum passo, com “Adicionar passo” no lugar), o passar para ninguém e a mensagem com campo que o gatilho não tem ({data da audiência} numa cobrança de parcela). Testar e Ligar ficam travados com o motivo. O assistente oferece “Pedir à IA para corrigir os 3”, e a correção também chega tracejada.

### Testar, ligar e acompanhar

11. **Testar sem enviar.** Escolhe-se um cliente real com parcela em atraso e o que ele faria (não pagar nem responder, responder, pagar). A tela mostra o caminho percorrido em chips e a conversa que sairia, com as datas reais dos limites (a passagem para Gustavo cai na segunda, 23/11). Uma faixa diz “Simulação. Esta conversa não foi enviada.” A mensagem simulada usa o balão vinho da equipe, com o rótulo “Aviso automático”; não usa o tracejado, que nesta tela é só da IA.
12. **“Quem entraria hoje”** lista quem entra e quem fica de fora, cada um com o motivo: sem WhatsApp (com “Corrigir na ficha”), combinado de pagamento no Financeiro e pedido para não receber avisos. É o que dá confiança para ligar.
13. **Ligar é uma revisão em linguagem simples**, numa frase em serifa grande (“Toda parcela que chegar a 3 dias de atraso…”), mais:
    - **quem entra**: só as parcelas que atrasarem daqui em diante (recomendado) ou também as que já estão em atraso (pergunta 4);
    - **desligar a automação antiga** que conflita, já marcado;
    - “Revisei o texto, os caminhos e quem entra” e o botão “Ligar a automação”;
    - ao lado, os limites fixos e o que acontece depois: texto em aprovação no WhatsApp (até 1 dia; nada sai antes), começa quando aprovado, com aviso no sino, e, se a Meta recusar, volta a rascunho com o motivo.

    Só a sócia dona liga e desliga, e o registro de quem ligou e quando vai para o histórico do escritório.
14. **Histórico** (desenhado com a pronta “Lembrete de audiência”, que já roda): quatro discos (execuções, concluídas, em andamento, com falha), uma linha por cliente com o **caminho no fluxo** em chips e a situação. A falha vem primeiro, com o motivo, quem ficou responsável (passou para Felipe, que cuida da audiência) e “Corrigir na ficha”. Ao lado, “Mudanças” por versão, com quem e quando (PT-03), e o botão “Desligar”, que pede motivo.
15. **Só leitura** (Gustavo, só Financeiro): vê e testa, não muda. Um aviso diz quem muda (Marina) e oferece “Sugerir mudança a Marina”, que chega no sino dela. O passo em que a conversa passa para Gustavo vem marcado “Você”, e a folha ao lado explica o que isso significa para ele. Ele só vê as automações das áreas que tem e as de Conversas; quem não tem Financeiro nem sabe que a cobrança existe (o servidor manda sem).
16. **WhatsApp não ligado**: montar e testar funcionam, ligar não. O estado diz isso em três passos, com “Marcar a ligação com a equipe T3jus” (como no aprovado) e “Montar com a IA mesmo assim”. Ao lado, as seis prontas que esperam o número.
17. **Primeiro uso** (`vazio`): só as prontas e um estado com “Pedir à IA”, “Montar do zero” e três pedidos de exemplo em contorno tracejado (são sugestões).

### Celular

18. **No celular o fluxo vira lista vertical de passos**, com os ramos um embaixo do outro, recuados e com o fio à esquerda; o tracejado e o selo escrito continuam. Arrastar e encaixar blocos numa tela de 412 px é impreciso e fácil de errar com o polegar. Por isso:
    - **no celular dá para** aplicar e recusar sugestões (por bloco ou todas), pedir mudança à IA, editar e aprovar o texto, testar, ligar, desligar e ver o histórico;
    - **adicionar, mover ou apagar passos fica no computador.** O botão “Adicionar passo” some no celular, e o pé do desenho diz isso.

    Assim a sócia dona aprova do celular o que a IA sugeriu, sem precisar abrir o computador, que é o caso mais comum.
19. Os passos do alto viram uma grade 2 × 2. Os botões de ação ocupam a largura toda. No bloco aberto, a edição vem primeiro, com “‹ Voltar ao fluxo”. As tabelas da lista e do histórico viram cartões.

## Acessibilidade (WCAG 2.2 AA)

- **Conferência automática** em 22 capturas (11 estados × computador e celular), feita pelo `fotos.cjs`. O resultado completo fica em `_conferencia.json`:
  - o axe (WCAG 2.0, 2.1 e 2.2, A e AA) não achou nenhuma violação;
  - nenhuma tela tem rolagem lateral;
  - nenhum erro de script.
- **Alvos:** todos com 44 px ou mais (Aplicar, Recusar, editar o passo, “Mostrar no desenho”, campos, sugestões). A única exceção é a palavra-marca “T3jus” do trilho (24 px), que é da moldura aprovada.
- **O desenho também é uma lista.** O fluxo é um `<ol>` com “Passos da automação, de cima para baixo”; cada bloco é um `<article>` com título; os ramos são um `<ul>` (“Caminhos depois do passo 5”), cada um com o rótulo (“Se pagou”) e o seu próprio `<ol>`. As setas são decoração em CSS. O leitor de tela lê os passos em ordem e os caminhos de cada ramo.
- **Nada depende só de cor ou de traço:**
  - todo bloco sugerido tem o selo “Sugerido pela IA” e, para leitor de tela, “Sugerido pela IA, ainda não salvo” no título;
  - os botões dizem qual passo (“Aplicar o passo 4, Espera”);
  - o erro tem selo, ícone e frase; o alerta do assistente tem “!” visível e “Atenção:” para leitor de tela;
  - as situações da lista têm texto e ícone.
- **Navegação:** os passos do alto são `<nav>` com `aria-current="step"`; o passo travado é `aria-disabled` com o motivo escrito. “Mostrar no desenho” leva o foco ao bloco (`tabindex=-1`) e o contorno âmbar mostra onde ele está. O bloco aberto para editar tem `aria-current`.
- **Contraste:** só pares do D2 e do Gabinete. Tracejado da sugestão em #87335B (7,9:1 contra o branco, acima do 3:1 de elemento gráfico), selo “Sugerido pela IA” em vinho sobre #F2CDB3 (7,15:1), erro em #AC3F6B sobre branco (5,7:1), “!” em branco sobre #AC3F6B (5,7:1), sobretítulo do tipo de passo em #87335B sobre branco (7,9:1) e ícone do gatilho em tinta sobre âmbar.
- **Formulários e janelas:** “Pedir à IA” é `<dialog>` com `showModal()`, Esc e foco no campo. Texto e contador ligados por `aria-describedby`; opções em `fieldset` com `legend`; os campos inseríveis num grupo com rótulo.

## O que precisa de dado novo no servidor

Todas as tabelas têm `escritorio_id` e passam por `proteger_tabela_escritorio`. O escritório vem da sessão, nunca do navegador. Nada tem DELETE: versão antiga, sugestão recusada e automação desligada ficam registradas (PT-03).

### Tabelas

| Tabela | Campos | Observação |
|---|---|---|
| `automacao` | `id`, `escritorio_id`, `nome`, `origem` (pronta, escritorio), `pronta_chave` (pagamento_recebido, parcela_vai_vencer, parcela_atrasada, etapa_caso, lembrete_audiencia, prestacao_contas), `area` (comercial, contratos, financeiro, juridico, conversas), `situacao` (rascunho, em_aprovacao, ligada, desligada), `versao_ligada_id`, `versao_rascunho_id`, `entram_ja_atrasados` (bool), `desligada_motivo`, `criado_por`, `criado_em`, `versao` | Substitui `aviso_regra` do desenho de Conversas: as seis regras viram seis automações prontas, uma vez por escritório. `area` vem do gatilho e decide quem vê (PA-01). Editar uma ligada cria rascunho novo; a ligada continua valendo até a nova ser ligada |
| `automacao_versao` | `id`, `escritorio_id`, `automacao_id`, `numero`, `fluxo` (jsonb validado: passos e ligações), `criada_por`, `criada_em`, `ligada_por`, `ligada_em` | Só inserção. O `fluxo` é validado no servidor contra o catálogo de tipos de passo e de campos de cada gatilho |
| `automacao_sugestao` | `id`, `escritorio_id`, `automacao_id`, `pedido` (texto), `pedido_por`, `pedido_em`, `passos` (jsonb), `alertas` (jsonb), `situacao_por_passo` (pendente, aplicado, recusado), `decidido_por`, `decidido_em` | O que a IA sugeriu e o que a pessoa fez com cada passo. Recusar não apaga |
| `modelo_mensagem` | `id`, `escritorio_id`, `nome`, `texto`, `campos` (lista), `escrito_por` (ia, pessoa), `aprovado_por`, `aprovado_em`, `meta_id`, `meta_situacao` (nao_enviado, em_aprovacao, aprovado, recusado), `meta_motivo`, `versao` | O texto fica fixo depois de aprovado; mudar cria um modelo novo (nova aprovação na Meta). Só a sócia dona aprova. Os textos das prontas e das etapas do caso (EX-14) também moram aqui |
| `automacao_execucao` | `id`, `escritorio_id`, `automacao_id`, `versao_id`, `cliente_id`, `contato_id`, `origem` (parcela, compromisso, etapa, repasse, cliente), `origem_id`, `passo_atual`, `caminho` (lista de passos com hora), `situacao` (agendada, em_andamento, concluida, falhou, ficou_de_fora), `motivo`, `responsavel_id`, `conversa_id`, `iniciada_em`, `terminada_em` | Uma por cliente e origem. Toda falha que precisa de alguém tem `responsavel_id` (PD-07). O “ficou de fora” guarda o motivo, para “Quem entraria” e para auditoria |
| `cliente_sem_avisos` | `escritorio_id`, `cliente_id`, `contato_id`, `tipo` (todos, cobranca), `pedido_em`, `registrado_por`, `origem` (conversa, ficha) | O pedido de não receber. Vale para todas as automações e não é desligável por elas |

**Limites no servidor, não só na tela:** o envio é recusado fora de 8h às 20h em dia útil (a mensagem fica para o próximo horário) e se a mesma parcela já recebeu cobrança nos últimos 7 dias por qualquer automação. Quem está em `cliente_sem_avisos` nunca entra.

### API

| Rota | O que faz | Erros |
|---|---|---|
| `GET /v1/automacoes` | Lista com situação, quando sai, números de 7 dias e última mudança. O servidor filtra pelas áreas da pessoa | — |
| `POST /v1/automacoes` | Cria rascunho vazio ou a partir de uma pronta | `SEM_PERMISSAO` |
| `GET` e `PATCH /v1/automacoes/:id/rascunho` | Lê e salva o fluxo do rascunho, usando a `versao` | 409 `CONFLITO_VERSAO`, `SEM_PERMISSAO` |
| `POST /v1/automacoes/:id/sugestoes` | Manda o pedido à IA; devolve passos e alertas sem salvar nada no fluxo | `PEDIDO_VAZIO`, `IA_INDISPONIVEL` |
| `POST /v1/automacoes/:id/sugestoes/:sid/aplicar` e `/recusar` | Aplica ou recusa todos ou uma lista de passos | `SUGESTAO_JA_DECIDIDA` |
| `POST /v1/automacoes/:id/validar` | Confere o fluxo e devolve os erros presos ao passo | `PASSO_SEM_SAIDA`, `RESPONSAVEL_OBRIGATORIO`, `RESPONSAVEL_INVALIDO` (pessoa inativa), `CAMPO_INEXISTENTE` (campo que o gatilho não tem), `TEXTO_NAO_APROVADO`, `TEXTO_LONGO` |
| `POST /v1/automacoes/:id/simular` | Roda o fluxo para um cliente e um caminho, sem enviar; devolve a conversa e o caminho | `CLIENTE_FORA_DO_GATILHO` |
| `GET /v1/automacoes/:id/quem-entraria` | Quem entraria hoje e quem fica de fora, com o motivo | — |
| `POST /v1/modelos/:id/aprovar` | A sócia dona aprova o texto | `SEM_PERMISSAO` |
| `POST /v1/automacoes/:id/ligar` | Valida, manda os modelos novos à Meta, liga quando aprovados e, se pedido, desliga a que conflita | `SEM_PERMISSAO`, `FLUXO_COM_ERRO`, `WHATSAPP_NAO_LIGADO`, `CONFLITO_LIMITE_SEMANAL` (outra automação ligada cobraria a mesma parcela na mesma semana) |
| `POST /v1/automacoes/:id/desligar` | Desliga com motivo | `SEM_PERMISSAO`, `MOTIVO_OBRIGATORIO` |
| `GET /v1/automacoes/:id/execucoes?situacao=&de=` | Histórico por cliente, com o caminho | — |
| `POST /v1/automacoes/:id/sugerir-mudanca` | Quem não é a sócia dona manda uma sugestão ao sino dela | — |

A IA da sugestão recebe só o catálogo de passos, os campos dos gatilhos, as pessoas ativas e as áreas, e as automações ligadas (para achar conflitos). Ela não recebe dados de cliente. A simulação e o “Quem entraria” rodam no servidor, com os dados que a pessoa pode ver.

### Para o painel

- A entrega atende **PA-03** e completa EX-11, EX-14 e FI-12 do lado do envio (as seis prontas). O cálculo da prestação de contas segue no Financeiro.
- Itens “pendente” para o painel, citando PA-03:
  - envio dos modelos para aprovação na Meta e leitura da resposta (depende da conta do escritório no provedor de WhatsApp, que já está pendente em Conversas);
  - gatilhos além dos seis das prontas (cliente cadastrado, caso encerrado, documento pendente), que dependem dos eventos de cada área;
  - montar no celular (adicionar e mover passos), se os pilotos pedirem.
- VA-03 continua hipótese: não citar.

## Perguntas para a Carol

1. **Automações pode ser uma terceira seção de Conversas, e os seis avisos fixos viram automações prontas?** **Recomendo que sim.** Os avisos e as automações saem pelo mesmo número, e as respostas caem em Mensagens: tudo fica num lugar só. “Avisos automáticos” continua como o registro do que saiu, que é o que a equipe consulta no dia a dia. A outra opção seria deixar os seis avisos fixos e pôr Automações em Escritório. O risco é ter duas regras para a mesma cobrança, em dois lugares, que podem mandar duas mensagens na mesma semana.
2. **Quem pode montar uma automação?** **Recomendo: quem tem a área do gatilho monta, pede à IA e testa; só a sócia dona aprova o texto e liga.** Assim o Gustavo, do Financeiro, prepara a cobrança e a Marina só revisa. A outra opção seria só a sócia dona montar. É mais simples, mas concentra todo o trabalho nela, e o T3jus quer tirar trabalho dela.
3. **Os limites de cobrança ficam fixos no T3jus: 8h às 20h, em dia útil, e no máximo 1 cobrança por semana por parcela, somando todas as automações?** **Recomendo que sim, fixos, e o escritório só pode apertar** (ex.: 9h às 18h). Cobrança que constrange gera reclamação e dano moral (CDC, art. 42), e a responsabilidade cai no escritório. Um piso fixo protege o cliente do T3jus de errar sem perceber. A outra opção seria a sócia dona escolher os limites livremente.
4. **Ao ligar uma cobrança nova, quem já está em atraso entra?** **Recomendo: por padrão, só quem atrasar daqui em diante**, com a opção marcável de incluir os atrasados de hoje, mostrando quem são. Ninguém recebe cobrança de surpresa por algo antigo que talvez já esteja combinado por telefone. E, depois de aprovada pela Meta, a automação começa sozinha, com aviso no sino: a decisão já foi da sócia dona ao ligar.
5. **No celular, montar e mudar a estrutura fica só no computador?** **Recomendo que sim.** No celular dá para aplicar ou recusar o que a IA sugeriu, pedir mudança, aprovar o texto, testar, ligar, desligar e ver o histórico. Adicionar, mover e apagar passos fica no computador, porque arrastar blocos com o polegar erra fácil e o erro pode mandar mensagem para cliente. A outra opção seria um editor completo no celular, em lista com menus de “mover para cima/baixo”. Dá para fazer depois, se os pilotos pedirem.
