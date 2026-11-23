# Sobras da importação, rodada 2 · notas

> **Aprovado pela Carol em 23/11/2026, às 9h06 (Bahia), como está.** Os textos finais abaixo são os que o código usa. O `publicar.html` (3,4 MB) não foi copiado.

Rodada curta pedida em `decisoes-plano-2.md` (decisão 1) e na correção 11 do `revisao-2.md`. Só desenha o que o plano 2 deixou sem desenho, por cima do aprovado em `../importacao-sobras/`, que não muda. A moldura, o CSS e as peças são os aprovados. As peças novas têm o prefixo `il-`: `il-oque`, `il-fs-erro` e `il-fl-num`.

## Como abrir

- `index.html` mostra os 10 estados em computador (1440) e celular (412), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- `publicar.html` é o mesmo `index.html` com as capturas embutidas (3,4 MB), para publicar como uma página só.
- O estado vem do endereço:
  - `juridico.html?estado=`: `resultado`, `resultado-erro`, `resultado-feito`, `encerrados-desfeitos`;
  - `lembretes.html?estado=`: `dispensar-sem-motivo`, `ja-dispensado`, `trazido`, `trazido-resolvido`, `busca-vazia-viraram`;
  - `cliente.html?estado=cliente-atendido`.
- Para refazer tudo, rode `sh _fonte/gerar.sh <pasta>` (precisa das mesmas coisas do aprovado). Os scripts:
  - `rodada2.py` lê o `sobras.py` aprovado até os estados;
  - `cliente.py` lê o `jornada.py` aprovado da jornada do cliente, com as cópias em `_fonte/jornada/`. A única troca é o `comum.py`, que é o mesmo das sobras e lê o caminho de `T3JUS_APROV`;
  - os outros arquivos são cópias das sobras aprovadas. O `casos.py` tem os estados desta rodada.

## Os estados e os textos finais

### 1. `resultado`: a janela “Registrar o resultado”

Abre pelo botão “Registrar o resultado” da folha Resultado, na ficha aprovada do caso que veio encerrado (`encerrado-importado`).

- **Sobretítulo:** Caso encerrado · veio do Astrea
- **Título:** Registrar o resultado de Queiroz x Construtora Lume
- **Abertura:** O Astrea não diz como o caso terminou. Registre aqui o que aconteceu.
- **Faixa:** Agora: 8. Encerrado, sem resultado. Arquivado no Astrea em 14/03/2025.
- **Resultado:** é o fieldset aprovado da mudança de etapa, com os mesmos rádios: Ganho (Decisão a favor do cliente), Perda (Decisão contra o cliente) e Acordo (As partes fecharam acordo). Na legenda, o texto passa a ser “entra nas contas de ganho, perda e acordo”.
- **Motivo:** é o campo aprovado, obrigatório, de 3 a 1.000 caracteres. A ajuda diz: “Só para a equipe; o cliente não vê. De 3 a 1.000 caracteres. Ex.: sentença procedente, confirmada pelo TRT; pago e arquivado em 2025.”
- **Sem valor.**
- **O que acontece:**
  - O caso entra nas contas de ganho, perda e acordo. A etapa continua 8. Encerrado.
  - **Não avisa o cliente.** Nenhuma mensagem vai para Renata.
  - Não pede acerto nem cobra êxito, porque o caso não tem contrato.
  - Fica em Mudanças de etapa e no histórico do caso, com seu nome, a hora e o motivo. Se a importação for desfeita, este caso fica, como tudo o que foi mexido depois dela.
- **Botões:** Cancelar · Registrar o resultado.

### 2. `resultado-erro`: falta o resultado e o motivo está curto

- **Resumo no topo:** “Falta acertar 2 pontos, marcados abaixo. Nada foi registrado: o caso continua encerrado e sem resultado, como veio do Astrea.”
- **No Resultado:** “Escolha o resultado: ganho, perda ou acordo.”
- **No Motivo:** “O motivo está curto. Escreva pelo menos 3 caracteres: ele fica no histórico do caso e explica a quem consultar depois.”
- O foco vai para o primeiro rádio.

### 3. `resultado-feito`: a ficha depois de registrar

- **Aviso:** “Resultado registrado: ganho. O caso entra nas contas de resultado e a mudança está no histórico. Nenhum aviso foi a Renata.”
- **Cabeçalho:** “Encerrado” e o selo do resultado (“Ganho”). O selo “Veio encerrado” sai, porque ele quer dizer “sem resultado”. A origem continua escrita na linha “Veio da importação”, que fica.
- **Etapa:** “Arquivado no Astrea em 14/03/2025. Resultado registrado hoje, por Marina Ribeiro.”
- **Folha Resultado:** o selo “Ganho” e “Registrado hoje por Marina Ribeiro. Entra nas contas de ganho, perda e acordo. Não pede acerto no Financeiro, porque o caso veio sem contrato.” O botão sai.
- **Mudanças de etapa:** a linha nova “hoje · Resultado: ganho · Marina Ribeiro”, com o motivo e “Nenhum aviso foi ao cliente.”

### 4. `dispensar-sem-motivo`

- **Resumo no topo:** “Falta escolher o motivo. Marque por que o escritório não vai cobrar. O lembrete continua aberto até você dispensar.”
- **No grupo de motivos:** “Escolha o motivo. Ele fica no histórico do cliente, com o seu nome.”
- O foco vai para a primeira opção.

### 5. `ja-dispensado`

É o corpo e o botão único do conflito aprovado.

- **Abertura:** Alguém mexeu neste lembrete enquanto a janela estava aberta.
- **Aviso:** “Este lembrete já foi dispensado. Felipe Matos já dispensou este lembrete há 3 minutos. Nada mudou: o motivo que você escolheu não foi gravado. O lembrete está em Dispensados, com o motivo de Felipe.”
- **Botão:** Ver a lista atualizada.

### 6. `trazido` e `trazido-resolvido`

- **`trazido`:** “O lembrete de Nair voltou para Abertos. Está de novo na lista e na ficha dela, com o mesmo valor. O histórico do cliente guarda quem dispensou e quem trouxe de volta.” Os números mudam: 82 abertos (R$ 46.000,00) e 1 dispensado.
- **`trazido-resolvido`:** “O lembrete de Jorge voltou já resolvido. O contrato C-2026-039 foi criado enquanto ele estava dispensado. Por isso foi direto para Viraram contrato, e não para Abertos.” O botão é “Ver em Viraram contrato”. Os números mudam: 5 viraram contrato e 1 dispensado.

### 7. `encerrados-desfeitos`

- **Contagem:** “88 casos encerrados · 14 com resultado, 71 que vieram encerrados do Astrea e 3 com a importação desfeita · do mais recente para o mais antigo”.
- **Na linha:** o Selo neutro “Importação desfeita”, mais “sem resultado · importação do Astrea de 20/11 desfeita em 21/11/2026” e o selo da origem.
- **Rodapé:** ganha a frase “O de importação desfeita também fica, sem resultado.”

### 8. `busca-vazia-viraram`

A busca vale no grupo atual, e a Ordem só aparece em Abertos.

- **Contagem:** “Nenhum lembrete encontrado em Viraram contrato para ‘Tavares’”.
- **Título:** “Nenhum lembrete em Viraram contrato para ‘Tavares’”.
- **Texto:** “Confira o nome do cliente ou do caso. Aqui a busca olha só os que viraram contrato. Para procurar nos abertos ou nos dispensados, clique no número acima: a busca vai junto.”
- **Botão:** Limpar a busca.
- Em Dispensados, o texto é o mesmo, com o nome do grupo. Em Abertos, fica o texto aprovado.

### 9. `cliente-atendido`

- **No âmbar da ficha de Renata Queiroz:**
  - “Próximo passo”;
  - o título “Cliente atendido”;
  - o texto “Queiroz x Construtora Lume: ganho, veio encerrado do Astrea.”;
  - “Gerar proposta” como secundário e “Ver o caso”.
- **Na aba Casos:** “Encerrado, 8 de 8 · ganho registrado em 23/11”, o selo da origem, “Sem acerto · Veio sem contrato” e o rodapé “1 caso, encerrado. Veio encerrado do Astrea, sem contrato: não há acerto no Financeiro.”

## O que mudou nos textos propostos, e por quê

1. **“Escolha o motivo.”** fica no campo. No topo, o resumo passa a “Falta escolher o motivo.”, no mesmo molde do aprovado “Falta escrever o motivo.”, e diz que o lembrete continua aberto.
2. **“{por} já dispensou este lembrete {há x}. Nada mudou.”** fica igual. Ganhou um título (“Este lembrete já foi dispensado.”), no molde do conflito aprovado, e duas frases: que o motivo de quem tentou não foi gravado e onde ver o lembrete. O motivo de Felipe não aparece na janela, porque o erro `JA_DISPENSADO` do plano só traz quem e quando.
3. **Os avisos de “Trazer de volta”:** cada frase proposta virou título e texto, no molde dos avisos aprovados. Uso o primeiro nome, como no aviso aprovado de dispensar. O aviso de trazer de volta não tem “Desfazer”, porque dispensar de novo pede o motivo.
4. **“… e N com a importação desfeita”** virou uma enumeração: “14 com resultado, 71 que vieram encerrados do Astrea e 3 com a importação desfeita”. Assim não ficam dois “e” seguidos.
5. **O aviso de sucesso do resultado** diz qual foi o resultado e que o cliente não foi avisado. A proposta do plano era “Resultado registrado / O caso entra nas contas de resultado. Ficou no histórico do caso.”
6. **A legenda do Resultado** troca “alimenta a cobrança do êxito e os indicadores” por “entra nas contas de ganho, perda e acordo”. Aqui não há êxito a cobrar, e o texto aprovado diria algo falso.

## Decisões de design

- **A janela não é de alerta:** é um `dialog` comum, como a de encerrar o caso aprovada, e o botão principal não é de perigo. Ela não promete que dá para trocar o resultado depois, porque o plano 2 não prevê isso. Se a Carol quiser, isso entra como pergunta.
- **O selo “Veio encerrado” sai depois de registrar.** O caso passa a ser um encerrado comum, com resultado. A origem continua na linha da importação, na ficha, e no selo “Astrea · backup”, na lista.
- **No “Cliente atendido” deste caso, não aparecem os 4 passos do fechamento.** Não há êxito, repasse, financeiro nem contrato. A coluna “Próximo passo” da lista de Clientes fica “Cliente atendido · caso veio encerrado do Astrea”, mas não foi capturada.
- **A busca vai junto quando se troca de grupo.** Quem procurou no grupo errado acha o cliente com um clique no número.
- **Sem capturas novas:** a linha do caso em Encerrados depois de registrar mostra o Selo do resultado e “arquivado no Astrea em 14/03/2025 · resultado registrado em 23/11”, com o selo da origem.

## Acessibilidade (WCAG 2.2 AA)

A conferência automática usa o `fotos.cjs` aprovado, em 20 capturas (10 estados × 2 tamanhos). O resultado está em `_conferencia.json`.

- **Axe** (WCAG 2.0, 2.1 e 2.2, A e AA): nenhuma violação.
- Nenhuma tela tem rolagem lateral, e não houve nenhum erro de script.
- **Alvos menores que 44 px:** só dois, os dois de peças aprovadas:
  - a palavra-marca “T3jus”;
  - o link do caso na aba Casos da ficha ligada. Ele ganhou `il-fl-num`, para ter 24 px e cumprir a 2.5.8.
- **Erros:** o resumo usa `role="alert"`. O grupo com erro tem `aria-describedby` para a mensagem, e os rádios e o campo têm `aria-invalid`. O foco vai para o primeiro campo com erro.
- **Avisos de sucesso:** `role="status"`.

## Para o painel

- Esta entrega é só desenho e não muda nenhum status. Quando virar código, cita F3.56 e o id novo do encerrado importado / registrar o resultado (decisões do plano 2).
- Se a Carol aprovar, o desenho vai junto para `docs/design/aprovadas/portal-importacao-sobras/`, como diz a decisão do plano 2.
