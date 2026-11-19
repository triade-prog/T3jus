# Portal: Escritório › WhatsApp e IA · notas

> **Aprovado pela Carol em 19/11/2026, às 19h30 (Bahia).** Ela respondeu "pode seguir o recomendado": as 5 perguntas do fim valem como decisões (o escritório paga a Meta direto; o app no celular continua com o mesmo número, sem importar o histórico; a IA responde fora do horário dizendo quando uma pessoa vê; a IA liga separada do número e começa desligada; a sócia dona liga sozinha, com a ligação da equipe T3jus como alternativa).

> Desenho para aprovação da Carol. Parte da decisão dela de **cada escritório usar o próprio número de WhatsApp**, ligado à conta da Meta do próprio escritório (WhatsApp Business Platform oficial, pelo Cadastro Incorporado de parceiro). A moldura é a aprovada do Portal v1, sem mudança; o vocabulário visual é o de Conversas e Automações.

A nova página **WhatsApp e IA** do Escritório (rota `/escritorio/whatsapp`) atende:

- **PA-04** (ideia nova, a registrar no `IDEIAS.md`, seção 11): *Ligar o próprio WhatsApp do escritório e configurar a IA que atende*. A sócia dona liga o número sozinha, passo a passo, com a conta da Meta do escritório (ou marca a ligação com a equipe T3jus), acompanha a saúde do número e a aprovação dos avisos na Meta, e configura como a IA atende: como se apresenta, o que pode responder, o que nunca faz, quando passa para uma pessoa, o que sabe do escritório, testar sem enviar e ligar ou pausar;
- **PA-01 e PA-02:** a página mora em Escritório (no celular, no Mais). Só a sócia dona liga, muda e desliga; quem não é a sócia dona vê para ler;
- **PD-07 e EX-10:** toda conversa que a IA passa tem responsável, pela regra aprovada em Conversas (item 15); quem sai da equipe nunca recebe;
- **PT-03:** nada é apagado. Desligar pede motivo; textos, respostas e configurações têm versões e histórico;
- **PT-10:** WCAG 2.2 AA, celular, erros e vazio;
- **PT-11:** a IA só fala com números da ficha (contato principal e autorizados), não fala de outro cliente, e dado sensível (saúde) fica só na conversa.

Peças novas com o prefixo `wa-`. Elenco e “hoje” iguais aos aprovados: Ribeiro & Matos, quarta, 18/11/2026, 10h12. Número novo do escritório: (11) 97405-2210 (chip); o fixo (11) 3032-4410 aparece no erro.

## Como abrir

- `index.html` mostra os 14 estados em computador (1440) e celular (412), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- `whatsapp.html` abre sozinho, com as fontes, o CSS e os ícones embutidos. O `index.html` usa o Google Fonts.
- O estado vem do endereço: `whatsapp.html?estado=` com `nao-ligado`, `passos`, `numero-erro`, `em-analise`, `ligado`, `modelo-recusado`, `desligar`, `ia`, `ia-passar`, `ia-saber`, `ia-testar`, `ia-ligar`, `ia-ligada` ou `so-leitura`. No celular, `&mais=1` abre a folha Mais.
- Abaixo de 760 px vira a versão de celular. Funcionam as janelas (Desligar, Ligar a IA: abrem, fecham, Esc), o Mais e os links entre estados. O resto é desenho.
- A pasta `_fonte/` guarda os scripts, e `sh _fonte/gerar.sh ..` refaz tudo:
  - `comum.py` e `extra.py` são as cópias sem mudança do aprovado de Agenda e Conversas;
  - `conversas.py` está ali só como fonte do CSS `cv-` aprovado (não é rodado);
  - `whatsapp.py` gera o HTML; `casos.py` gera a lista de estados e o `index.html`;
  - `fotos.cjs` faz as capturas (deviceScaleFactor 2, celular em página inteira) e as conferências; `webp.py` converte para WebP;
  - o axe vem de `@axe-core/playwright`; se não estiver no caminho do node, use `AXE_PW=<caminho>/node_modules/@axe-core/playwright sh gerar.sh ..`.

## Decisões de design

### Onde fica

1. **Escritório ganha uma barra de seções: “Dados do escritório” e “WhatsApp e IA”**, no mesmo desenho da barra das áreas. É o lugar das coisas do escritório inteiro, e já é onde só a sócia dona muda e os outros leem (PA-02). Conversas é o dia a dia da equipe; ligar o número e decidir como a IA fala é decisão da dona, feita poucas vezes. *Mudança pequena na tela aprovada do Escritório (portal-v1): só a barra; a página “Dados do escritório” fica igual.*
2. **Uma página, duas partes, em abas:** “Número do WhatsApp” e “Como a IA atende”. Cada aba leva um selo com a situação (Não ligado, Esperando a Meta, Ligado, 1 aviso recusado; Desligada, Ligada), para a dona saber de longe o que pede atenção.
3. **Conversas, estado “WhatsApp ainda não ligado” (item 22 aprovado):** para a sócia dona, o botão principal passa a ser **“Ligar o WhatsApp”**, que leva a `/escritorio/whatsapp`; “Marcar a ligação com a equipe T3jus” continua, como secundário. O passo 2 do texto passa a dizer “Ligue o número, sozinha (uns 15 minutos) ou com a equipe T3jus”. Para a equipe, nada muda (“Quem liga é Marina Ribeiro”). O mesmo vale para o estado “WhatsApp não ligado” de Automações. *Mudança pequena, só descrita aqui.*

### Ligar o número

4. **Não ligado** começa pelo que ter em mãos (número só do escritório, o telefone por perto, a conta do Facebook, nome e CNPJ já vindos do Escritório) e dá **dois caminhos lado a lado**: “Ligar agora, passo a passo” (uns 15 minutos, principal, em campo âmbar-3 com contorno vinho) e “Marcar ligação com a equipe T3jus” (o aprovado, secundário). Ao lado, o que muda ao ligar (inclusive quem paga a Meta) e o que acontece com o app no celular.
5. **Assistente em cinco passos no alto:** Número · Entrar com a Meta · Nome que aparece · Código · Pronto. Passo feito vira ✓ e é link para voltar; o atual tem fundo âmbar-3 e filete vinho (`aria-current="step"`); os próximos dizem o que vai acontecer. No celular, os cinco cabem numa linha, com rótulo curto. O progresso fica salvo, e “Travou? Marque a ligação com a equipe T3jus” aparece em todo passo: a equipe continua de onde ela parou.
6. **A janela da Meta é explicada antes de abrir, não copiada.** O passo 2 lista, em ordem e em linguagem simples, o que a janela vai pedir (entrar com o Facebook; escolher ou criar o “portfólio empresarial”, com os dados para copiar; escolher ou criar a conta do WhatsApp; confirmar número e nome; permitir que o T3jus envie e receba). Os itens são marcados com letras (a–e), para não confundir com os passos 1–5. Nenhum logo, cor ou tela da Meta: só o nome escrito.
7. **Erros no padrão aprovado**: resumo no topo com um link por erro e o erro preso ao campo. Desenhados: o número já ligado a outro sistema de atendimento (o que fazer: pedir para soltar ou usar outro número; as conversas de lá não se perdem) e o fixo que não recebe SMS, que oferece “Por ligação de voz”.
8. **Continuar com o app WhatsApp Business no celular** é uma pergunta do passo 1 (pergunta 2 para a Carol). No exemplo do erro, o fixo não está no app (“Não”); no chip do passo 2, Marina respondeu “Sim, e quero continuar usando”. Se for “Sim”, o código do passo 4 é confirmado pelo próprio app.

### Número ligado

9. **Esperando a Meta:** “Já funciona” (receber e responder clientes, até 24 horas depois da última mensagem deles; o app no celular) ao lado de “Espera a Meta” (o nome que aparece e os avisos em análise). “O que fazer agora”: preparar a IA, confirmar a empresa na Meta, esperar o aviso no sino.
10. **Saúde do número em quatro quadros, em linguagem simples:** o nome que o cliente vê; a qualidade segundo a Meta (Alta/Média/Baixa, sempre com texto e o que acontece se cair); o limite de conversas que o escritório começa por dia (“18 de 250 hoje”, com barra e a frase “responder a cliente não conta”); e a empresa confirmada na Meta. Não escrevemos o próximo nível do limite: a Meta muda essas regras, e o servidor mostra o que ela devolver.
11. **Avisos automáticos na Meta:** os 6 avisos prontos (os mesmos das Automações aprovadas) com a situação: Aprovado, Em análise na Meta ou Recusado, sempre com selo escrito, ícone e quando. A cabeça vinho do número é o ponto de atmosfera da página (mesma família da cabeça do assistente aprovado).
12. **Aviso recusado:** faixa de urgência no topo e, na tela do aviso, o motivo da Meta reescrito em palavras simples, a sugestão da IA tracejada com “Sugerido pela IA” (não vale até aprovar, como em Automações), o texto ainda recusado para editar, a prévia com dados de uma parcela real e o que acontece depois. Só a sócia dona aprova o texto; enquanto isso, só aquele aviso para.
13. **Trocar o número e Desligar** ficam na folha “Conta e pagamento”, junto da conta da Meta e da forma de pagamento. Desligar é uma janela de alerta (`alertdialog`) que diz o que para (avisos, IA, mensagens novas no T3jus) e o que fica (conversas, avisos enviados, histórico; o número continua do escritório na Meta; dá para ligar de novo), pede motivo obrigatório e a confirmação “Entendi que os avisos param agora”.

### Como a IA atende

14. **Faixa de situação no alto de toda a parte da IA:** desligada (folha branca, com “Testar sem enviar” e “Ligar a IA”) ou ligada (vinho, com “Pausar a IA agora”). Enquanto desligada ou pausada, toda conversa vai direto para a equipe, pela regra de responsável. Abaixo, quatro partes: Apresentação e assuntos · Quando passa para alguém · O que ela sabe · Testar sem enviar.
15. **Apresentação:** o nome começa sempre com “Assistente virtual” e a apresentação é repetida a cada conversa nova e sempre que perguntarem “é robô?”. A IA nunca finge ser pessoa. Tom em três opções (cordial recomendado). A prévia usa o balão âmbar claro com “IA do escritório”, igual a Conversas (item 16).
16. **O que ela pode responder:** seis assuntos marcáveis, cada um dizendo de onde vem o dado (andamento do caso pelo texto da etapa do Jurídico; compromissos da Agenda; parcelas e segunda via do Financeiro; documentos pedidos; endereço e horário; receber arquivos). **O que ela nunca faz** é fixo e não desliga, com cadeado e o texto “Fixo no T3jus”: opinião jurídica ou chance de ganhar, negociar honorários, falar de outro cliente, prometer prazo.
17. **Quem pode falar com a IA:** só os números da ficha (contato principal e autorizados, como Joana, filha de Antônia). Número desconhecido é contato novo: a IA se apresenta, pergunta nome e assunto, não fala de caso nenhum e passa para o Comercial. Dado sensível fica só na conversa (PT-11).
18. **Quando passa para uma pessoa:** sete casos fixos (pediu advogado, reclamação, urgência, proposta de acordo, documento novo, contato novo, e quando não sabe), que o escritório pode aumentar, não diminuir; palavras do escritório em etiquetas com “Tirar”; a regra aprovada de responsável, com exemplos reais; o horário da equipe (seg a sex, 9h às 18h; feriados nacionais e municipais sozinhos; recesso marcado na Agenda) e a mensagem de fora do horário com o campo {próximo atendimento}. O telefone de urgência é opcional e só aparece em urgência de prisão, liminar ou audiência no dia.
19. **O que ela sabe:** respostas escritas pelo escritório, em cartões editáveis (endereço, estacionamento, primeira reunião, formas de pagamento); o horário vem da parte anterior e muda lá. A IA não inventa e não aprende com as conversas. “Perguntas que ela não soube” fica vazia até ligar; depois, cada uma vira resposta com um clique (estado `ia-ligada`).
20. **Testar sem enviar:** conversar como Antônia, como Joana ou como número desconhecido. Faixa “Simulação”; cada resposta mostra **de onde veio** (ex.: “Jurídico › Prado x INSS › etapa Recurso enviado, texto escrito por Larissa”) e o momento em que passaria para alguém aparece na conversa, com o motivo. Ao lado, “Por que respondeu assim” e pedidos para experimentar (inclusive urgência).
21. **Ligar a IA** é uma revisão numa frase em serifa (o que ela responde, que sempre diz ser assistente virtual, quando passa e o que faz fora do horário), mais o que acontece com as conversas abertas (continuam com quem está) e a confirmação “Testei a IA e revisei o que ela responde”. **Pausar** é um clique, sem janela: é a ação de emergência, e deve ser rápida; volta quando ela quiser e fica no histórico.

### Só leitura e celular

22. **Só leitura** (Paula, recepção, sem área): vê número, saúde, avisos e a configuração da IA, sem Trocar, Desligar, Ajustar nem Salvar; um aviso no alto e na folha da conta diz “Quem cuida: Marina Ribeiro”. Ela não vê a forma de pagamento nem quanto foi gasto na Meta (é decisão da dona). Quem não tem a área de um aviso (ex.: Financeiro) vê o nome e a situação do aviso, não o texto.
23. **Celular:** a página mora no Mais (o botão Mais fica marcado como atual, e a barra de baixo aprovada não muda). A barra de seções do Escritório vira dois botões; as abas viram dois blocos com o selo embaixo; as partes da IA viram grade 2 × 2; tabelas viram cartões; o botão principal vem antes do “Voltar”. Tudo dá para fazer no celular, inclusive ligar o número: a janela da Meta funciona no navegador do celular.

## Acessibilidade (WCAG 2.2 AA)

- **Conferência automática** em 28 capturas (14 estados × computador e celular), feita pelo `fotos.cjs`; o resultado completo está em `_conferencia.json`:
  - o axe (WCAG 2.0, 2.1 e 2.2, A e AA) não achou nenhuma violação;
  - nenhuma tela tem rolagem lateral;
  - nenhum erro de script.
- **Alvos:** todos com 44 px ou mais (passos, abas, partes da IA, “Tirar” das palavras, editar resposta, botões). A única exceção é a palavra-marca “T3jus” do trilho (24 px), que é da moldura aprovada. Links dentro de frase seguem a exceção da 2.5.8.
- **Nada depende só de cor:** toda situação tem selo escrito e ícone; a sugestão da IA tem tracejado e o selo “Sugerido pela IA”; o erro tem ícone, frase e `aria-invalid`; o passo feito tem ✓ e “, feito” para leitor de tela.
- **Navegação:** os passos do assistente e as partes da IA são `<nav>` com lista ordenada e `aria-current`; as abas usam `aria-current="page"`. Os passos 1–5 e os itens a–e da janela da Meta não se confundem.
- **Formulários e janelas:** erros com resumo de links no topo e `aria-describedby` no campo (inclusive no grupo de opções do código); opções em `fieldset` com `legend`; Desligar é `alertdialog` com foco no motivo; Ligar a IA é `dialog`; Esc fecha.
- **Contraste:** só pares do D2 e do Gabinete: branco sobre vinho (10,6), vinho e tinta sobre âmbar-3 (7,15 e 11,2), âmbar-3 sobre vinho (7,15), #AC3F6B sobre branco no erro (5,7), texto secundário #6E5562 sobre branco e sal. O âmbar #DD9760 só aparece como fio e ícone.

## O que precisa de dado novo no servidor

Todas as tabelas têm `escritorio_id` e passam por `proteger_tabela_escritorio`. O escritório vem sempre da sessão, nunca do navegador. Nada tem DELETE: desligar, trocar de número, recusa da Meta e versões antigas ficam registrados (PT-03).

**Tokens da Meta nunca vão ao navegador.** O código que a janela da Meta devolve ao navegador é trocado no servidor pelo token de acesso, que fica cifrado (cofre de segredos, como os outros) e nunca aparece em resposta da API, log ou histórico (PT-13). O navegador só recebe a situação.

### Tabelas

| Tabela | Campos | Observação |
|---|---|---|
| `whatsapp_numero` | `id`, `escritorio_id`, `telefone`, `meta_portfolio_id`, `meta_conta_whatsapp_id`, `meta_numero_id`, `token_ref` (referência ao segredo, nunca o token), `nome_exibicao`, `nome_situacao` (em_analise, aprovado, recusado), `qualidade` (alta, media, baixa, sem_nota), `limite_dia`, `empresa_verificada` (nao_enviada, em_analise, verificada, recusada), `usa_app_celular` (bool), `situacao` (ligando, ligado, desligado), `ligado_por`, `ligado_em`, `desligado_por`, `desligado_em`, `desligado_motivo`, `versao` | Um ligado por escritório; trocar de número cria outro registro e desliga o anterior, sem apagar. Qualidade, limite e verificação vêm dos avisos (webhooks) da Meta |
| `whatsapp_ligacao_rascunho` | `escritorio_id`, `passo`, `telefone`, `receber_codigo` (sms, voz), `usa_app_celular`, `confirmou_numero_escritorio`, `atualizado_por`, `atualizado_em` | O “fica salvo” do assistente; a equipe T3jus lê para continuar de onde parou |
| `whatsapp_evento` | `id`, `escritorio_id`, `numero_id`, `tipo` (ligado, nome_aprovado, qualidade_mudou, limite_mudou, verificacao, modelo_situacao, desligado, trocado), `detalhe` (jsonb, sem token), `por` (pessoa ou meta), `em` | Só inserção. É o “Histórico do número” e alimenta o sino |
| `modelo_mensagem` (já proposta em Automações) | acrescenta `meta_categoria`, `meta_motivo_original`, `motivo_simples`, `sugestao_ia` | O motivo cru da Meta fica guardado; a tela mostra o reescrito. A sugestão da IA não vale até a sócia dona aprovar |
| `ia_config` | `escritorio_id`, `nome`, `apresentacao`, `tom`, `assuntos` (lista: andamento_caso, compromissos, parcelas, documentos, endereco_horario, arquivos), `palavras_passar` (lista), `horario` (dias, início, fim), `msg_fora_horario`, `telefone_urgencia`, `situacao` (desligada, ligada, pausada), `ligada_por`, `ligada_em`, `pausada_por`, `pausada_em`, `versao` | As regras fixas (o que nunca faz, os sete casos de passar, sempre dizer que é assistente virtual) ficam no código, não na tabela: não dá para desligar por dado |
| `ia_config_versao` | `id`, `escritorio_id`, `numero`, `config` (jsonb), `mudado_por`, `mudado_em`, `o_que_mudou` | Só inserção |
| `ia_resposta_escritorio` | `id`, `escritorio_id`, `pergunta`, `resposta`, `situacao` (sugerida, publicada, arquivada), `escrita_por`, `publicada_por`, `versao` | Arquivar, nunca apagar. Quem lê o Escritório sugere; a sócia dona publica |
| `ia_pergunta_sem_resposta` | `id`, `escritorio_id`, `conversa_id`, `texto`, `em`, `virou_resposta_id` | Sem nome do cliente na lista além do da conversa; segue a retenção da conversa |
| `escritorio_feriado` | `escritorio_id`, `data`, `nome`, `origem` (nacional, municipal, escritorio) | Recesso marcado na Agenda entra aqui |

### API

| Rota | O que faz | Erros |
|---|---|---|
| `GET /v1/escritorio/whatsapp` | Situação do número, saúde, avisos e a situação da IA. Sem token; sem pagamento para quem não é a sócia dona | — |
| `PUT /v1/escritorio/whatsapp/rascunho` | Salva o passo do assistente | `SEM_PERMISSAO` |
| `POST /v1/escritorio/whatsapp/conferir-numero` | Confere o número antes da janela da Meta | `NUMERO_INVALIDO`, `NUMERO_EM_OUTRA_CONTA`, `FIXO_SEM_SMS` |
| `POST /v1/escritorio/whatsapp/ligar` | Recebe o código da janela da Meta, troca pelo token no servidor, registra o número e manda os 6 avisos para aprovação | `SEM_PERMISSAO`, `CODIGO_EXPIRADO`, `META_RECUSOU` (com motivo), `JA_LIGADO` |
| `POST /v1/escritorio/whatsapp/trocar` e `/desligar` | Troca ou desliga, com motivo; avisos passam a “não enviados” | `SEM_PERMISSAO`, `MOTIVO_OBRIGATORIO` |
| `POST /v1/whatsapp/meta/eventos` | Recebe os avisos da Meta (assinatura conferida no servidor) e grava em `whatsapp_evento` | 401 se a assinatura não bater |
| `POST /v1/modelos/:id/aprovar` (já proposta) | A sócia dona aprova o texto ajustado e reenvia à Meta | `SEM_PERMISSAO`, `CAMPO_NO_INICIO_OU_FIM` |
| `GET` e `PATCH /v1/escritorio/ia` | Lê e salva a configuração, com `versao` | 409 `CONFLITO_VERSAO`, `SEM_PERMISSAO`, `NOME_SEM_ASSISTENTE_VIRTUAL` |
| `POST /v1/escritorio/ia/ligar` e `/pausar` | Liga (pede teste feito) ou pausa | `SEM_PERMISSAO`, `WHATSAPP_NAO_LIGADO`, `SEM_TESTE` |
| `POST /v1/escritorio/ia/testar` | Responde como a IA, sem enviar, para um contato da ficha ou “desconhecido”; devolve a fonte e a regra de cada resposta | `CONTATO_FORA_DA_FICHA` |
| `GET`, `POST`, `PATCH /v1/escritorio/ia/respostas` | Respostas do escritório (sugerir, publicar, arquivar) | `SEM_PERMISSAO` |

**A IA no servidor:** recebe só os dados do cliente que está escrevendo, da ficha a que o número pertence, filtrados pelos assuntos ligados; nunca recebe dados de outro cliente. As regras fixas (nunca opinar, nunca negociar, nunca falar de outro cliente, nunca prometer prazo, sempre dizer que é assistente virtual) são conferidas no servidor antes de enviar a resposta, não só no texto de instrução. Mensagem respondida pelo app no celular marca a conversa como “com a equipe”, e a IA fica quieta nela.

### Para o painel

- A entrega atende **PA-04** (ideia nova; entra primeiro no `IDEIAS.md`, seção 11, e a contagem passa de 120 para 121) e completa a parte de “ligar o número” que estava pendente em Conversas e em PA-03.
- Itens “pendente” para o painel, citando PA-04:
  - registro como parceiro de tecnologia da Meta (Cadastro Incorporado), que é dependência externa e não muda o status da ideia;
  - Trocar o número (desenhado só como botão; o fluxo repete o assistente);
  - importar o histórico antigo do app no celular, se a Carol quiser (pergunta 2).

## Perguntas para a Carol

1. **Quem paga a Meta?** **Recomendo: o escritório põe o cartão na conta da Meta dele, sem o T3jus revender.** A conta e o número são do escritório; se ele sair do T3jus, leva tudo, e o T3jus não carrega risco de cobrança nem margem sobre mensagem. A tela mostra quanto foi entregue no mês, para a dona acompanhar.
2. **O escritório pode continuar usando o app WhatsApp Business no celular com o mesmo número?** **Recomendo que sim**, com o que for respondido pelo celular aparecendo em Conversas e a IA quieta naquela conversa, e **sem importar o histórico antigo** do app (só o que chegar daqui em diante). A recepção não muda de hábito de um dia para o outro, e não trazemos dados antigos sem necessidade (LGPD). Algumas funções do app ficam desligadas, e a Meta pede que o app seja aberto de tempos em tempos (conferir a regra na implantação).
3. **A IA responde fora do horário e em feriado?** **Recomendo que sim**, respondendo o que sabe e dizendo quando uma pessoa vai ver (“segunda, 23/11, a partir das 9h”). O cliente que escreve à noite é o mais ansioso; deixar sem resposta até segunda é o pior atendimento, e nada que exija pessoa é resolvido por ela.
4. **Ligar a IA pode ser separado de ligar o número?** **Recomendo que sim**, com a IA desligada por padrão até a dona testar e ligar. Ninguém recebe resposta automática antes de ela ver como a IA fala; no começo, as conversas vão direto para a equipe.
5. **A sócia dona pode ligar sozinha, ou a primeira ligação é sempre com a equipe T3jus?** **Recomendo: ela pode sozinha (principal) e a ligação com a equipe fica como alternativa.** Uns 15 minutos sem depender de agenda escalam melhor, e quem travar marca a ligação e a equipe continua de onde ela parou.
