# Portal: Escritório › Integrações · notas

> **Aprovado pela Carol em 22/11/2026, às 13h15 (Bahia).** Ela respondeu "ok" depois de ver as 5 perguntas do fim com as recomendações, que valem como decisões: a chave só lê; o aviso ao parceiro leva só o tipo e o número do registro, e cada destino fica ligado a uma chave; a validade não se estica, cria-se a substituta; no só consulta, chaves e avisos continuam e revogar continua liberado; quem não é a dona vê o item Integrações com "Quem cuida das integrações é Marina Ribeiro".
>
> O desenho técnico da API, aprovado pela Carol no mesmo dia às 11h10 (Bahia), está em [`API.md`](API.md). **Nada disso é programado antes de existir o primeiro parceiro** (decisão 1 do `API.md`).
>
> **Ao programar, onde este arquivo e o `API.md` diferem, vale:**
> - a rota da tela é `/meu-escritorio/integracoes` (o `/escritorio` é a escolha do escritório);
> - o resumo da chave é HMAC-SHA256 com uma pimenta nos segredos da função, como no `API.md`;
> - o registro de chamadas guarda 6 meses, como as entradas no sistema, e entra no inventário como `PROPOSTA` até a Carol aprovar o prazo;
> - os nomes das tabelas e o número de tentativas dos avisos são decididos na programação; as regras de cada um valem como estão aqui.

> Desenho para aprovação da Carol. Ele abre a API de parceiros (F1.11) do lado do escritório: a sócia dona cria, vê e revoga as chaves de acesso e os destinos dos avisos para o parceiro (webhooks). A moldura é a aprovada do Portal v1, sem mudança. O vocabulário visual é o do aprovado de WhatsApp e IA: cabeça vinho, quadros de indicador, tabelas que viram cartões e janela de alerta.

A nova página **Integrações** do Escritório (rota `/escritorio/integracoes`) atende:

- **PT-15:** API para integrações quando houver parceiro. A sócia dona cria a chave e escolhe as áreas que ela lê. Acompanha o uso, revoga quando quiser e cadastra até 3 destinos de aviso;
- **PT-01:** cada chave e cada destino é de um só escritório. O servidor tira o escritório da chave, nunca do pedido do parceiro;
- **PT-02:** só a sócia dona vê e mexe. A chave lê só as áreas marcadas, e o destino só avisa eventos dessas áreas;
- **PT-03:** nada some. Chave revogada ou vencida e destino pausado ficam na lista, apagados, com quem fez, quando e o motivo;
- **PT-10:** WCAG 2.2 AA, celular, vazio, erro e carregando;
- **PT-11:** aceite da LGPD ao criar a chave, CPF e documentos à parte e desmarcados, e o aviso ao parceiro sem dado de cliente. Conversas do WhatsApp, notas internas e dados de saúde nunca saem;
- **PT-17:** a tela mostra o endereço versionado (`/v1`), o manual, as páginas de resultado e os erros com nome (sem permissão, limite).

As peças novas usam o prefixo `ig-`. O elenco e o “hoje” são os dos aprovados: Ribeiro & Matos, sócia dona Marina Ribeiro, quarta, 18/11/2026, 10h12. Felipe Matos aparece como sócio que não é o dono.

## Como abrir

- `index.html` mostra os 17 estados em computador (1440) e celular (412), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- `integracoes.html` abre sozinho, com as fontes, o CSS e os ícones embutidos. O `index.html` usa o Google Fonts.
- O estado vem do endereço: `integracoes.html?estado=` seguido de `vazio`, `lista`, `criar`, `criar-erros`, `criada`, `ficha`, `revogar`, `revogada`, `limite`, `webhooks`, `webhook-criar`, `webhook-criado`, `webhook-pausado`, `so-consulta`, `nao-dona`, `erro` ou `carregando`. No celular, `&mais=1` abre a folha Mais.
- Abaixo de 760 px, a página vira a versão de celular. Funcionam a janela Revogar (abre, fecha e sai com Esc), o Mais, o botão Copiar e os links entre estados. O resto é desenho.
- A pasta `_fonte/` guarda os scripts, e `sh _fonte/gerar.sh ..` refaz tudo:
  - `comum.py` e `extra.py` são as cópias sem mudança do aprovado de WhatsApp e IA;
  - `conversas.py` e `whatsapp.py` estão ali só como fonte do CSS aprovado (`cv-` e `wa-`) e dos ícones do WhatsApp. Eles não são rodados;
  - `integracoes.py` gera o HTML, e `casos.py` gera a lista de estados e o `index.html`;
  - `fotos.cjs` faz as capturas (deviceScaleFactor 2, celular em página inteira) e as conferências. `webp.py` converte as capturas para WebP;
  - o axe vem de `@axe-core/playwright`. Se ele não estiver no caminho do node, use `AXE_PW=<caminho>/node_modules/@axe-core/playwright sh gerar.sh ..`.

## Estados

São os 16 pedidos e mais um: **`webhook-criado`**. O segredo de assinatura do destino aparece uma vez só, como a chave, e precisava de uma tela própria. Nenhum estado foi cortado. O `limite` e o `so-consulta` mostram a mesma lista com o botão Criar bloqueado, cada um com o seu motivo escrito.

## Decisões de design

### Onde fica e quem vê

1. **Integrações entra no fim da barra de seções do Escritório**, depois de Dados do escritório, WhatsApp e IA, Recebimento e Ajustes do financeiro. Integrações é coisa do escritório inteiro, usada poucas vezes, e quem decide é a dona. *A tela aprovada do Escritório muda pouco: só a barra ganha um item.* Para Felipe, que não vê o Financeiro, “Ajustes do financeiro” some, como no aprovado.
2. **Uma página com duas abas:** “Chaves de acesso” e “Avisos para o parceiro”. Cada aba leva um selo com a situação (2 ativas, 5 de 5 ativas, 1 com falha, 1 pausado, Nenhuma). Assim a dona vê de longe o que pede atenção, como nas abas aprovadas do WhatsApp.
3. **Quem não é a dona vê só “Quem cuida das integrações é Marina Ribeiro”**, no padrão “sem permissão” aprovado da Equipe. A mensagem diz por quê (as integrações decidem quais dados saem do T3jus) e o que fazer (falar com ela). Os outros não veem a lista, o uso nem os nomes dos parceiros. O item continua na barra, para ninguém procurar a página em outro lugar (pergunta 5).

### Chaves de acesso

4. **A chave só lê.** A frase “Ela não cria, não muda e não apaga nada no T3jus” aparece em Nova chave, no “O que pode sair” e no manual. Os escopos são as quatro áreas que a equipe já conhece: Clientes, Jurídico (casos, prazos e agenda), Contratos e Financeiro. Cada uma diz o que leva.
5. **CPF e documentos ficam num grupo à parte, “Dados pessoais, à parte”**, desmarcado por padrão e com o motivo para marcar. Na lista e na ficha, esse escopo vira um selo âmbar com cadeado, para chamar a atenção.
6. **“Nunca saem pela API: conversas do WhatsApp, notas internas e dados de saúde”** é um quadro fixo, com cadeado e a frase “Fixo no T3jus, não dá para marcar”. Ele aparece na Nova chave, na ficha e no lado da lista, no mesmo desenho do “O que ela nunca faz” da IA aprovada.
7. **Validade em 3, 6 ou 12 meses**, com 12 marcado e escrito “Recomendado”. Cada opção mostra a data em que a chave vence. O aviso dos 15 dias aparece logo abaixo (no sino e por e-mail) e, na lista, como um aviso âmbar com filete âmbar na linha. **A validade não se estica:** “Criar a substituta” abre a Nova chave já com o nome e as áreas da antiga. O parceiro troca a chave, e a dona revoga a antiga ou deixa vencer (pergunta 3).
8. **O aceite da LGPD é um grupo próprio, “Responsabilidade (LGPD)”**, com filete âmbar: “O escritório decidiu compartilhar estes dados com o parceiro e responde por isso”. A explicação logo abaixo pede um contrato com o parceiro. Sem o aceite marcado, a chave não é criada, e o aceite fica no histórico da chave.
9. **“Esta chave, numa frase”**, em serifa, ao lado do formulário. Ela resume o que a chave vai ler, até quando e se leva CPF, para a dona conferir antes de criar. É a mesma ideia da revisão de “Ligar a IA” aprovada.
10. **Erros no padrão aprovado:** um resumo no topo com um link por erro e o erro preso ao campo. Foram desenhados três: nome igual ao de uma chave ativa, nenhuma área marcada (no grupo, com `aria-describedby`) e o aceite sem confirmar.
11. **A chave aparece uma vez só**, numa tela própria. A cabeça é vinho e a chave inteira fica numa caixa com contorno vinho, em fonte de máquina, com o botão Copiar. Logo abaixo vem o aviso “Copie agora: não mostramos de novo”, que diz que depois só aparece o começo (`t3j_live_e8c41f07…`) e o que fazer se perder. O botão para sair é “Já copiei, concluir”. Ao lado, como entregar ao parceiro: por um canal seguro, nunca por WhatsApp, e-mail aberto ou planilha. Para quem programa, a tela mostra o endereço (`https://api.t3jus.pro/v1`), como mandar a chave e o manual.
12. **A lista mostra, por chave:** o nome em serifa com o começo da chave, o que ela lê em selos, a situação (Ativa, Vence em N dias, Sem uso há N dias, Revogada, Vencida), o último uso e “Ver”. **A revogada fica na lista, apagada**, com fundo areia, texto secundário e o selo “Revogada”. Ela mostra quem revogou, quando e o motivo. Nada some.

### Ficha da chave e revogar

13. **A ficha segue a ficha do número do WhatsApp:** a cabeça vinho tem o nome, o começo da chave, a situação e quem criou e quando. Abaixo vêm quatro quadros: validade (com os dias que faltam e a data do aviso), último uso, chamadas nos últimos 30 dias e o limite do dia, numa barra (“312 de 10.000 hoje”, e até 60 por minuto).
14. **O uso em 30 dias é um gráfico de colunas simples:** vinho para os dias úteis e vinho claro para os fins de semana, com legenda em quadradinhos e uma descrição em texto para leitor de tela. Ele mostra só contagem. A frase “O conteúdo das respostas não fica guardado” fica na própria legenda.
15. **As últimas chamadas mostram a hora, o que o parceiro pediu em português, o endereço técnico em fonte de máquina, quantos registros voltaram e o resultado**, em selo com ícone. Os resultados possíveis são “Deu certo”, “Recusada: a chave não lê Contratos” e “Passou de 60 por minuto: esperou e repetiu”. Os identificadores são opacos (`cs_7Q2M`). Nenhum nome, CPF ou dado de cliente aparece ou fica guardado, e a tela diz isso.
16. **Revogar é uma janela de alerta (`alertdialog`)** com o que acontece: o parceiro para de ler agora, os avisos do destino ligado param junto, nada é apagado e não tem volta (para ligar de novo, cria-se outra chave). O motivo é obrigatório, e o foco começa nele. O botão é “Revogar agora”. Não há o “Entendi” do Desligar: o motivo obrigatório já pede atenção, e revogar precisa ser rápido quando a chave vazou.
17. **Revogada:** a cabeça da ficha passa de vinho para areia, com o selo “Revogada”. Os números continuam visíveis. A primeira chamada depois de revogar aparece como “Recusada: chave revogada”, o que prova que valeu na hora. O quadro “Revogada” mostra quem, quando e o motivo, e “Revogar” vira “Criar outra chave”.
18. **Limite de 5 chaves:** o “Criar chave” fica desabilitado (tracejado, como no D2) com o motivo escrito embaixo. Um aviso aponta a chave sem uso há 64 dias, que é a candidata a revogar. Os limites ficam sempre no lado, em barras: “2 de 5 chaves”, “2 de 3 destinos”, e 60 por minuto e 10.000 por dia por chave.

### Avisos para o parceiro

19. **O destino fica ligado a uma chave**, chamada “Chave que lê os detalhes”. Em Novo destino, os eventos das áreas que essa chave não lê ficam bloqueados, com o motivo (“A chave escolhida não lê Contratos”). Revogar a chave para os avisos do destino junto. Assim, um destino nunca avisa sobre uma área que o parceiro não pode ler (pergunta 2).
20. **O aviso leva só o tipo, o número do registro e a hora.** A tela mostra um exemplo do que o parceiro recebe, e o resto ele busca com a chave. Assim nenhum dado de cliente sai sem passar pelos escopos e pelo limite, e um endereço errado não recebe dados (pergunta 2). Os eventos ficam agrupados por área, com uma linha de explicação onde precisa. Em “Dados do cliente excluídos”, por exemplo: “Para o parceiro apagar também (LGPD)”.
21. **O segredo de assinatura aparece uma vez**, na mesma caixa da chave, com Copiar. Na tela do destino criado já aparece o resultado do aviso de teste, que é mandado sozinho ao criar. Se o segredo se perder, a saída é “Trocar o segredo”.
22. **O destino com falha vem primeiro, com filete vinho claro.** O selo diz desde quando falha, e um aviso âmbar diz quando ele será pausado (“até sexta, 20/11, 14:20”) e o que fazer. Abaixo ficam as entregas recentes com falha: quando, o aviso, o que houve em palavras simples (com o código entre parênteses, para o técnico do parceiro), as tentativas e “Tentar de novo”. Tentamos 8 vezes em 24 horas.
23. **Pausado:** o aviso no topo e no destino diz que ele falhou por 3 dias seguidos e foi pausado, e que a dona foi avisada no sino e por e-mail. Os avisos da pausa ficam guardados por 7 dias e saem em ordem quando ela retoma. A chave continua lendo; só os avisos param. As ações são “Mandar um teste” e “Retomar”.

### Só consulta e estados da página

24. **Portal só para consulta:** no alto vai a faixa aprovada de Cobrança (`fc-tira`), sem mudança. Na página, um aviso diz que as chaves continuam lendo e os avisos continuam saindo, que revogar continua liberado (para a dona poder cortar um acesso a qualquer hora) e que criar volta ao pagar. O “Criar chave” fica desabilitado, com o motivo escrito (pergunta 4).
25. **Erro e carregando seguem o aprovado do Escritório.** O erro diz o que continua igual (“As chaves continuam funcionando para os parceiros”) e traz o código para o suporte. O carregando usa o esqueleto no lugar das abas, da lista e do lado.
26. **Celular:** a página mora no Mais, e o botão Mais fica marcado como atual. A barra de seções vira botões em duas colunas, e as duas abas viram dois blocos com o selo embaixo. As tabelas viram cartões com “Ver” e “Tentar de novo” na largura toda. O botão Copiar fica embaixo da chave, que quebra a linha sem rolar para o lado. O botão principal vem antes do “Cancelar”. Tudo dá para fazer no celular.

## Acessibilidade (WCAG 2.2 AA)

- **Conferência automática** em 34 capturas (17 estados, cada um em computador e celular), feita pelo `fotos.cjs`. O resultado completo está em `_conferencia.json`:
  - o axe (WCAG 2.0, 2.1 e 2.2, A e AA) não achou nenhuma violação;
  - nenhuma tela tem rolagem lateral;
  - nenhuma tela tem erro de script.
- **Alvos:** todos têm 44 px ou mais. A única exceção é a palavra-marca “T3jus” do trilho, com 24 px, que vem da moldura aprovada. Os botões compactos das tabelas no computador têm 36 px, como no aprovado. Links dentro de frase seguem a exceção da 2.5.8.
- **Nada depende só de cor:** toda situação tem selo escrito e ícone. Os escopos da ficha têm ✓ ou ×, mais “Lê” ou “Não lê”. A chave revogada tem o selo “Revogada”, além do fundo areia. O gráfico tem uma descrição em texto, e os fins de semana vêm na legenda.
- **Formulários e janelas:** os erros têm um resumo de links no topo e `aria-invalid` e `aria-describedby` no campo e no grupo de áreas. As opções ficam em `fieldset` com `legend`. Revogar é um `alertdialog` com o foco no motivo, e Esc fecha a janela. O botão bloqueado usa `aria-disabled` e aponta o motivo com `aria-describedby`. Copiar avisa “Copiada” numa região `aria-live`.
- **Contraste:** só pares do D2 e do Gabinete. São eles: branco sobre vinho, âmbar-3 sobre vinho no começo da chave, tinta sobre âmbar-3 nos avisos e nos escopos marcados, #6E5562 sobre areia na chave revogada e #AC3F6B sobre areia no erro do aceite.

## O que precisa de dado novo no servidor

Todas as tabelas têm `escritorio_id` e passam por `proteger_tabela_escritorio`. Nas telas, o escritório vem da sessão. Na API, ele vem da chave, achada pelo resumo dela no servidor e nunca por um parâmetro do pedido (PT-01). Nada tem DELETE: revogar, vencer e pausar mudam a situação e ficam no histórico (PT-03).

**A chave e o segredo nunca ficam guardados em claro.** O servidor gera a chave, devolve uma vez na resposta da criação e guarda só o resumo (hash com sal) e o começo (`prefixo`). O segredo de assinatura do destino fica no cofre de segredos, como os tokens da Meta. Nenhum dos dois aparece em log, histórico ou resposta posterior (PT-13).

### Tabelas

| Tabela | Campos | Observação |
|---|---|---|
| `api_chave` | `id`, `escritorio_id`, `nome`, `prefixo` (ex.: `t3j_live_a1b2c3d4`), `resumo` (hash), `escopos` (lista: clientes, juridico, contratos, financeiro), `inclui_cpf_documentos` (bool, padrão falso), `vence_em`, `meses`, `situacao` (ativa, revogada, vencida), `criada_por`, `criada_em`, `aceite_lgpd_em`, `aceite_lgpd_por`, `aceite_texto_versao`, `revogada_por`, `revogada_em`, `revogada_motivo`, `ultimo_uso_em`, `versao` | No máximo 5 ativas por escritório (restrição no banco). Nome único entre as ativas. A validade não muda depois de criada |
| `api_chamada` | `id`, `escritorio_id`, `chave_id`, `em`, `metodo`, `rota_modelo` (ex.: `/v1/casos/:id`), `descricao`, `registros`, `resultado` (ok, sem_escopo, limite_minuto, limite_dia, revogada, vencida, invalido), `duracao_ms` | Só inserção. Nunca guarda o corpo da resposta nem dado de cliente. Fica guardada por 90 dias. Alimenta “Últimas chamadas” |
| `api_uso_dia` | `escritorio_id`, `chave_id`, `dia`, `chamadas`, `recusadas` | Soma por dia, para o gráfico e o limite de 10.000 por dia |
| `webhook_destino` | `id`, `escritorio_id`, `nome`, `url` (só https), `chave_id`, `eventos` (lista), `segredo_ref` (referência ao cofre), `situacao` (funcionando, falhando, pausado, parado_pela_chave, desligado), `falhando_desde`, `pausado_em`, `criado_por`, `criado_em`, `versao` | No máximo 3 por escritório, contando os que não foram desligados. Os eventos precisam caber nos escopos da chave |
| `webhook_entrega` | `id`, `escritorio_id`, `destino_id`, `evento`, `registro_id`, `em`, `tentativas`, `proxima_em`, `ultimo_status_http`, `ultimo_erro`, `situacao` (entregue, tentando, desistiu, guardada_na_pausa) | O corpo do aviso é só tipo, id, registro, hora e versão. Os guardados na pausa ficam 7 dias |
| `integracao_evento` | `id`, `escritorio_id`, `tipo` (chave_criada, chave_revogada, chave_vencida, aviso_15_dias, destino_criado, destino_pausado, destino_retomado, segredo_trocado), `alvo_id`, `por` (pessoa ou sistema), `motivo`, `em` | Só inserção. É o “Histórico das integrações” e alimenta o sino e o e-mail |

### API

| Rota | O que faz | Erros |
|---|---|---|
| `GET /v1/escritorio/integracoes` | Chaves (só o prefixo), uso, destinos e limites. Só para a sócia dona | `SEM_PERMISSAO` |
| `POST /v1/escritorio/integracoes/chaves` | Cria a chave e devolve o valor inteiro **só nesta resposta** | `SEM_PERMISSAO`, `NOME_REPETIDO`, `SEM_ESCOPO`, `SEM_ACEITE_LGPD`, `LIMITE_CHAVES`, `PORTAL_SO_CONSULTA` |
| `POST /v1/escritorio/integracoes/chaves/:id/revogar` | Revoga na hora, com motivo, e para os destinos ligados. Funciona também em só consulta | `SEM_PERMISSAO`, `MOTIVO_OBRIGATORIO`, `JA_REVOGADA` |
| `GET /v1/escritorio/integracoes/chaves/:id/uso` | Uso por dia em 30 dias e as últimas chamadas | `SEM_PERMISSAO` |
| `POST /v1/escritorio/integracoes/destinos` | Cria o destino, devolve o segredo **só nesta resposta** e manda um aviso de teste | `SEM_PERMISSAO`, `URL_SEM_HTTPS`, `EVENTO_FORA_DO_ESCOPO`, `LIMITE_DESTINOS`, `PORTAL_SO_CONSULTA` |
| `POST /v1/escritorio/integracoes/destinos/:id/testar`, `/pausar`, `/retomar`, `/trocar-segredo` | Ações do destino. Retomar manda os avisos guardados em ordem | `SEM_PERMISSAO` |
| `POST /v1/escritorio/integracoes/entregas/:id/tentar` | “Tentar de novo” uma entrega | `SEM_PERMISSAO`, `DESTINO_PAUSADO` |
| `GET /v1/clientes`, `/v1/casos`, `/v1/prazos`, `/v1/compromissos`, `/v1/contratos`, `/v1/parcelas`, `/v1/recebimentos`, `/v1/contas` | A API do parceiro: só leitura, paginada, com `alterados_desde`, esquema validado e versão no endereço (PT-17). CPF e documentos só com `inclui_cpf_documentos`. Nunca devolve conversas, notas internas nem dados de saúde (a lista do que pode sair vem do inventário de dados, PT-11) | 401 `CHAVE_INVALIDA`, `CHAVE_REVOGADA`, `CHAVE_VENCIDA`. 403 `SEM_ESCOPO`. 429 `LIMITE_MINUTO` ou `LIMITE_DIA`, com `Retry-After` |

**Rotinas:** uma vez por dia, a rotina vence as chaves e manda o aviso dos 15 dias, no sino e por e-mail à sócia dona. Os avisos ao parceiro são entregues por uma fila, com 8 tentativas em 24 horas. Um destino que falha por 3 dias seguidos é pausado, e a dona é avisada. Os guardados na pausa são descartados depois de 7 dias, e o descarte fica registrado.

### Para o painel

- A entrega atende **PT-15** (a parte da API para parceiros; a exportação já foi entregue), **PT-01**, **PT-02**, **PT-03**, **PT-10**, **PT-11** e **PT-17**.
- Itens “pendente” para o painel, citando PT-15:
  - o manual público da API (`api.t3jus.pro/manual`), que é só citado aqui;
  - o primeiro parceiro de verdade, que é uma dependência externa e não muda o status da ideia.

## Perguntas para a Carol

1. **A chave só lê, sem criar nem mudar nada no T3jus?** **Recomendo que sim nesta primeira versão.** A leitura atende o contador e os serviços de publicações, e uma chave que vaza não estraga dado do escritório. A escrita (por exemplo, um parceiro criar cliente) fica para quando um parceiro pedir, com o seu próprio escopo.
2. **O aviso ao parceiro leva só o tipo e o número do registro, e o destino fica ligado a uma chave?** **Recomendo que sim.** Assim nenhum dado de cliente sai sem passar pelos escopos e pelo limite da chave, um endereço errado não recebe dados, e revogar a chave corta tudo de uma vez. O parceiro faz uma chamada a mais por aviso, o que cabe com folga no limite.
3. **Uma chave perto de vencer pode ter a validade esticada?** **Recomendo que não: cria-se a substituta**, com o atalho “Criar a substituta” já com o nome e as áreas da antiga. Toda chave tem prazo certo desde que nasce, a troca fica no histórico, e uma chave antiga não vive para sempre.
4. **Com o Portal só para consulta, os avisos para o parceiro continuam saindo, além das chaves continuarem lendo?** **Recomendo que sim, e revogar continua liberado.** O só consulta trava escrita do escritório, não a leitura. Parar os avisos quebraria o sistema do contador sem ajudar a cobrança, e a dona precisa poder cortar um acesso a qualquer hora.
5. **Quem não é a dona vê o item Integrações na barra?** **Recomendo que sim, com a página dizendo só “Quem cuida das integrações é Marina Ribeiro”.** A pessoa não vê as chaves, o uso nem os parceiros, mas sabe onde fica e a quem pedir quando um parceiro precisar de acesso.
