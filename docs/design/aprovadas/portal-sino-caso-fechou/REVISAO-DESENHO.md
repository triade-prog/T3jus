# Revisão do desenho · F3.150 (sino: caso encerrado no financeiro)

Segunda revisão, independente, de especialista em frontend de SaaS e acessibilidade, feita em 24/11/2026 antes de o desenho ir para a Carol. Base: `index.html`, `fechamento.html`, as 24 capturas, `_conferencia.json`, `_fonte/`, `NOTAS.md` e `PLANO.md` desta pasta. Comparei com `docs/IDENTIDADE.md`, `docs/design/conceito-gabinete.md`, `docs/design/aprovadas/portal-sino-caso-encerrado/` (F3.147) e `docs/design/aprovadas/portal-fechamento-sem-levantamento/` (F3.132), com as migrations 0200 e 0900 e com o pgTAP 135.

## Resumo

O desenho está bom e segue o F3.147: mesmo item, mesma linha "Agora:", o mesmo trecho para o leitor de tela, nenhum valor em reais no sino e nenhuma peça nova além de `.si-nr`. Conferi no Chromium, a 390 e a 1440 px: não há rolagem lateral, o link de cada aviso cobre o item inteiro (241 px de altura no celular, no `sf-agora-parcial`) e o nome do link traz o trecho "Agora:". O axe não acusou nenhuma violação.

Há **6 ajustes obrigatórios**. Os dois mais importantes:

- **Nomes da área Contratos.** O texto mostra quem encerra contratos de um jeito que o código nunca vai mostrar.
- **Leitor de tela.** No estado principal, quem usa leitor de tela não ouve que falta encerrar o contrato.

## Ajustes

### 1. Quem é da área Contratos: falta a Bianca, e a ordem dos nomes não é a do código · obrigatório

- **Problema:** o desenho escreve "(Marina Ribeiro e Felipe Matos)" e, na janela de encerrar, "(Marina e Felipe)". Pela regra real, a Bianca também está no grupo A:
  - no elenco aprovado, ela tem as áreas Contratos e Financeiro (`portal-sino-caso-encerrado/_fonte/sino_caso.py`, `portal-equipe-oab`, pgTAP 135: `portal_convidar(..., bianca, ..., array['CONTRATOS','FINANCEIRO'])`);
  - toda a equipe tem `contratos.editar` (0200, linha 16: `('EQUIPE', 'contratos.editar')`);
  - `quemContratos` (0900, linha 187) junta os nomes em **ordem alfabética** (`order by p.nome`).

  O código vai escrever "(Bianca Torres, Felipe Matos e Marina Ribeiro)". Se ficar como está, a Carol aprova um texto que o sistema não gera, e a Bianca, que recebe o aviso de verdade, não aparece em nenhum estado. O plano também erra no teste: o item 7.4 diz "Diego e Bianca não recebem", mas, com o elenco do 135, a Bianca recebe.
- **Evidência:**
  - `sf-responsavel-falta` e `sf-agora-terminou` (`QUEM_CTR` em `_fonte/sino_fechou.py`);
  - `encerrar-sem-contratos` ("Quem encerra é a área Contratos (Marina e Felipe) … Eles recebem um aviso no sino.");
  - `NOTAS.md`, ponto B ("O desenho segue o texto aprovado. Vale confirmar o elenco antes do e2e.").
- **Correção:** resolver o ponto B agora, e não no e2e. Recomendo seguir a regra real:
  - no sino: "Quem encerra o C-2026-032 é a área Contratos (Bianca Torres, Felipe Matos e Marina Ribeiro).";
  - na janela: "(Bianca, Felipe e Marina)";
  - nas notas: dizer que o texto aprovado do F3.132 ("Marina e Felipe") tinha esse erro de elenco e que a frase é corrigida junto, porque já está sendo mexida pela pergunta 5;
  - no plano: corrigir o 7.4 ("Felipe, Marina e Bianca recebem `papel = CONTRATOS`; Diego não recebe").

  Se a Carol preferir outro elenco (Bianca sem Contratos), isso vira a pergunta 6 e o pgTAP muda o convite dela. As notas também devem dizer que a ordem dos nomes é a alfabética.

### 2. O leitor de tela não ouve que falta encerrar o contrato · obrigatório

- **Problema:** o título ficou no passado e é igual para todos (decisão 3). O que pede ação aparece só no selo ("Falta o contrato") e no destino ("Encerrar o C-2026-012"), e os dois ficam **fora** do link. Quem navega pelos links ouve só "Novo: O caso Carvalho x Construtora Lume foi encerrado no financeiro". Isso parece um aviso só informativo, e é justamente o aviso que pede ação.

  No F3.147 isso não acontecia: o título ("ficou pronto para encerrar") já dizia o que fazer, e o trecho para o leitor de tela entrou no ajuste 2 da revisão de lá, porque o selo fica fora do link. O motivo é o mesmo aqui.
- **Evidência:** nomes dos links medidos no Chromium (iguais a 390 e a 1440 px):
  - `sf-contrato`: "Novo: O caso Carvalho x Construtora Lume foi encerrado no financeiro";
  - `sf-varios`, `sf-socia`, `sf-responsavel`, `sf-responsavel-falta`, `sf-segue` e `sf-lido`: também sem o estado.
- **Correção:** usar o mesmo `paraLeitor` (o `<span class="sr">`) também sem `agoraFechou`, com o que o selo diz:
  - ". Falta encerrar o C-2026-012." (grupo A, um contrato);
  - ". Faltam encerrar 2 contratos." (grupo A, vários);
  - ". Falta o contrato, com a área Contratos." (grupo B);
  - ". O contrato segue com outro caso." (`sf-segue`);
  - ". O fechamento terminou." (`sf-responsavel`).

  A outra saída é a variação de título que o plano deixou como opção. Prefiro o trecho para o leitor de tela, porque mantém o padrão visual aprovado. O Vitest do plano (7.4) passa a cobrir o nome do link também sem `agoraFechou`.

### 3. A frase da ficha do cliente: a justificativa do ponto A está errada, e a promessa não vale sempre · obrigatório

- **Problema:**
  - O ponto A diz que "a ficha não sabe o nome" da responsável. A própria tela mostra "Responsável: Felipe Matos" na tabela Casos, logo abaixo da frase. O argumento que serve é outro: o passo do fechamento não recebe a responsável de `cliente_fechamento`, e um cliente pode ter mais de um caso.
  - "Quem é responsável por ele recebe um aviso no sino" não vale em dois casos do próprio plano:
    - a responsável que tem o Financeiro e já recebeu o aviso de "pronto", quando não sobra contrato aberto (pergunta 2 e seção 2.3): ela não recebe aviso novo, só a linha "Agora:" no aviso que já tinha;
    - a responsável que encerrou o caso ela mesma.

  A Carol vai aprovar uma promessa, e ela precisa ser verdadeira.
- **Evidência:** `fecha-larissa` (computador e celular), `NOTAS.md` ponto A e `PLANO.md` seção 2.3.
- **Correção:**
  - corrigir o motivo no ponto A;
  - trocar a frase por uma que vale sempre: "Quando o caso for encerrado no financeiro, quem é responsável por ele fica sabendo pelo sino."

  Dar o nome ("Felipe Matos, responsável pelo caso, …") é a sugestão 10.

### 4. A pergunta 5 cita a frase antiga · obrigatório

- **Problema:** a pergunta 5, copiada do plano, mostra a frase "A responsável pelo caso recebe um aviso no sino quando ele for encerrado no financeiro.". A tela mostra outra. A observação "com a primeira frase ajustada; veja abaixo" obriga a Carol a juntar as duas sozinha.
- **Evidência:** `NOTAS.md`, "Perguntas para a Carol", item 5, comparado com o estado `fecha-larissa`.
- **Correção:** escrever na pergunta 5 as duas frases exatas que ela vai aprovar: a da ficha, já com o ajuste 3, e "Eles recebem um aviso no sino.", com os nomes do ajuste 1. Depois dizer em uma linha por que a primeira mudou.

### 5. O aviso do caso Viana some no `sf-agora-encerrado` · obrigatório

- **Problema:** o Felipe tem, em "Ontem · 17/11", o aviso "Inventário de Augusto Viana" (16h20) no `sf-varios` e no `sf-agora-parcial`. No `sf-agora-encerrado`, que acontece depois no mesmo dia, ele não aparece, e o contador cai para "5 nos últimos 30 dias". O rodapé do próprio painel diz "Os avisos ficam aqui por 30 dias", e a tela mostra um aviso sumindo.
- **Evidência:**
  - `sf-agora-encerrado-celular.png` e `-computador.png`;
  - `_fonte/sino_fechou.py`: o estado 8 usa `felipe_ontem()` sem `VIANA`, e os estados 2 e 7 usam `[VIANA] + felipe_ontem()`.
- **Correção:** pôr o `VIANA` no "Ontem" do `sf-agora-encerrado`, lido e ainda com "Faltam os contratos", porque os contratos do Viana não foram encerrados. Assim o estado também mostra os dois selos lado a lado, o de antes e o de depois.

### 6. NOTAS: o elenco e a contagem · obrigatório (só texto)

- **Problema:**
  - As notas dizem que o Felipe tem "Comercial, Contratos e Jurídico, sem Financeiro, como no elenco aprovado". O elenco aprovado não é um só:
    - `portal-nao-paga-logo` dá a ele Comercial, Contratos e Jurídico;
    - o seletor de pessoa de `portal-peticoes` dá as quatro áreas;
    - o pgTAP 135 o convida com `CONTRATOS` e `COMERCIAL`, sem Jurídico.

    O desenho está certo, porque ele encerrou o caso com perda e para isso precisa do Jurídico. Mas o pgTAP 137 precisa saber disso, senão o destino "Ver o caso" do Felipe sai diferente.
  - Na história aprovada do F3.147 (`sp-encerrado`), quem encerra o caso Carvalho é a **Marina**, às 10h05. Aqui é o **Diego**, à mesma hora. A troca é necessária para o contrato ficar aberto, mas não está escrita em "O que mudou em relação ao plano".
  - Em "Pontos novos" há três pontos (A, B e C). Quem lê o resumo da thread espera quatro, contando a regra `.si-nr`.
- **Evidência:** `NOTAS.md`, seções do elenco, "Pontos novos" e "O que mudou"; `portal-sino-caso-encerrado/NOTAS.md`, estado `sp-encerrado`.
- **Correção:**
  - escrever de onde vem o elenco do Felipe e pedir que o pgTAP 137 o convide com o Jurídico;
  - registrar a troca de Marina por Diego no caso Carvalho;
  - pôr a regra `.si-nr` como ponto D, ou dizer "três pontos".

### 7. A linha "Agora:" pode dizer quem encerrou o contrato · sugestão

- **Problema:** o plano (3.2) diz que "contratos não guardam quem encerrou" e, por isso, a linha diz só quando. Mas a 0900 já lê quem encerrou no histórico (`encerrou`, linhas 139 a 142, devolvido como `encerradoPor`), e a janela aprovada mostra "Já encerrado em 12/11, por Felipe, em Contratos". No F3.147, a linha "Agora:" diz quem fez ("Marina Ribeiro encerrou no financeiro hoje, às 10h05").
- **Evidência:** `sf-agora-terminou` ("Agora: o C-2026-032 foi encerrado hoje, e o fechamento do caso terminou.") e `sf-agora-encerrado`; `PLANO.md` 3.2.
- **Correção:** "**Agora:** Felipe Matos encerrou o C-2026-032 hoje, e o fechamento do caso terminou." Para a própria pessoa, a frase continua sem nome ("o C-2026-012 foi encerrado hoje"), ou fica "você encerrou". A leitura sai do índice do histórico, por contrato, e `caso_acerto` continua de fora. Se não entrar, corrigir a frase do plano, que hoje está errada.

### 8. `sf-agora-parcial`: dizer o que mudou · sugestão

- **Problema:** "Agora: falta o C-2026-026." diz o que falta, mas não diz o que aconteceu. Quem lê o detalhe ("continuam abertos o C-2026-025 … e o C-2026-026") precisa deduzir que o 025 foi encerrado.
- **Evidência:** `sf-agora-parcial`.
- **Correção:** "**Agora:** o C-2026-025 foi encerrado hoje; falta o C-2026-026." O trecho para o leitor de tela fica como está.

### 9. Palavras dos selos · sugestão

- **Problema:**
  - "Fechado", ao lado do título "foi encerrado", lê como um sinônimo de encerrado, e não como "o fechamento do caso terminou". As telas aprovadas usam "Encerrado" para o caso e "Fechamento do caso" para a sequência de passos.
  - "Contrato segue" é curto demais: segue o quê?
- **Evidência:** `sf-responsavel`, `sf-agora-terminou` e `sf-segue`.
- **Correção:** "Fechamento feito" (tom ok) e "Segue com outro caso" (neutro). As duas cabem numa linha no celular, como "Faltam os contratos".

### 10. Grupo B: o nome do cliente ao lado do contrato e o nome da responsável na ficha · sugestão

- **Problema:**
  - O grupo A escreve "o C-2026-012, de Noemi Bastos Carvalho". O grupo B escreve só "o contrato C-2026-032" e "o C-2026-032", e a regra do plano (seção 4) é pôr o cliente ao lado do contrato.
  - Na ficha, a frase genérica funciona, mas a tela já mostra o nome da responsável.
- **Evidência:** `sf-responsavel`, `sf-responsavel-falta` e `fecha-larissa`.
- **Correção:**
  - "… e, junto, o C-2026-032, de Márcia Fontes." e "Quem encerra o C-2026-032, de Márcia Fontes, é …";
  - na ficha, avaliar "Felipe Matos, responsável pelo caso, fica sabendo pelo sino", quando o passo tiver um caso só.

### 11. O padrão âmbar atrás da frase nova · sugestão

- **Problema:** o `conceito-gabinete.md` (linha 81) diz que o padrão do campo âmbar "nunca fica atrás de texto". Com a frase a mais, o "Quem faz" ficou mais comprido e passa por cima de mais ícones: a pena e a moeda no celular, e a balança e a coluna no computador. A tela aprovada já tinha um pouco disso, e o axe não acusa, porque os ícones são decoração.
- **Evidência:** `fecha-larissa-celular.png` (sobre "financeiro" e "recebe um aviso no") e `fecha-larissa-computador.png` (sobre "liberada" e "encerrado").
- **Correção:** na hora de programar, a máscara do padrão deve deixar a área do texto limpa. Fica escrito nas notas para o código.

### 12. Fora do escopo: o fundo da lista de Clientes · sugestão

- **Problema:** atrás do painel, no computador, "Ltda." de "Construtora Vale Alto Ltda." e de "Farmácia Bom Jesus Ltda." fica por cima de "Pessoa jurídica".
- **Evidência:** `sf-contrato-computador.png` e `sf-socia-computador.png`. O mesmo acontece no aprovado `portal-sino-caso-encerrado/sp-novo-computador.webp`.
- **Correção:** não é deste item. Registrar como pendência da tela de Clientes, para não ser copiado para o código.

## O que conferi e está certo

- **Coerência entre título, detalhe, selo e destino**, em todos os estados, com as ressalvas dos ajustes 2, 5 e 9. O selo passa de "Faltam os contratos" para "Falta o contrato" no `sf-agora-parcial`, e de "Falta" para "Contrato encerrado" depois, como o F3.147 faz com "Pronto" e "Encerrado". "Encerre o contrato." sai só quando deixa de valer.
- **O elenco que bate com o aprovado:**
  - o Felipe é o responsável pelo caso Carvalho (`portal-fechamento-sem-levantamento/NOTAS.md`, linha 24);
  - o C-2026-013 foi encerrado por ele em 12/11;
  - a Marina vê o aviso de "pronto" lido, em 17/11, às 11h05;
  - o contador do `sf-socia` (5 novos, 9 avisos) fecha com o aprovado mais um aviso.
- **Nenhum valor em reais no sino:** o gerador confere (`assert 'R$' not in T`). O `fechamento.html` mostra valores só nas telas aprovadas do Financeiro.
- **Acessibilidade:**
  - axe sem violações nas 24 capturas;
  - largura da página igual à da janela a 390 e a 1440 px;
  - o link cobre o item inteiro (`::after` com `inset:0`), bem acima de 44 px;
  - o `paraLeitor` aparece nos estados com "Agora:";
  - nenhum estado depende só da cor.
- **Quebra de texto:** a regra `.si-nr` resolve o "C-2026-" separado do resto e não causa rolagem.
- **Cobertura do plano:** os 9 estados da seção 6 estão no desenho, com o `sf-agora-encerrado` dividido em dois, e os 2 da pergunta 5 também. Os estados que ficam só nas notas têm o texto exato escrito.

## Os pontos novos das notas

- **A.** A direção está certa, porque "a responsável" não serve para o Felipe. A justificativa e a promessa precisam do ajuste 3.
- **B.** Está certo e é o achado mais importante, mas não pode ficar para o e2e (ajuste 1).
- **C.** Selo no plural: está certo e coerente com "Contratos encerrados".
- **D. `.si-nr`** (decisão 2): está certo. É a única peça nova, é pequena e tem motivo.

## As perguntas para a Carol

As perguntas são claras e cada uma tem recomendação. Três observações:

- a pergunta 5 precisa do ajuste 4;
- se a Carol preferir outro elenco no ajuste 1, entra uma pergunta 6 sobre a Bianca;
- a pergunta 2 ficaria mais fácil com um exemplo do elenco: "A Marina, que cuida do Financeiro e é responsável, já viu no aviso de 'pronto' que o caso foi encerrado."
