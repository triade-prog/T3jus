# Sino: caso pronto para encerrar no financeiro · notas

**Aprovado pela Carol em 23/11/2026 às 10h57 (Bahia), com "ok com as recomendações"**: valem as recomendações das 5 perguntas do `PLANO.md` (todos com o Financeiro recebem, menos quem fez a ação, e quem encerra pelo Jurídico também, se tiver o Financeiro; sem lembrete no dia do vencimento; avisa mesmo quando as parcelas seguem com outro caso; encerrar não marca o aviso dos outros como lido; o aviso de quando o caso fecha vira item próprio, logo depois deste). As capturas desta cópia estão em `.webp`; os `.png` originais ficam na pasta de telas do projeto.

**Revisão do desenho aplicada** (`REVISAO-DESENHO.md`, 23/11/2026, os 7 ajustes; veja a seção "Revisão do desenho" no fim).

**Para a Carol aprovar. Ainda não é código.** É o item **F3.147** do painel (EX-16 e EX-17). Quando um caso encerrado sem RPV nem alvará fica sem nada a receber, quem tem a área Financeiro recebe um aviso no sino. O aviso leva direto à folha "Fechamento do caso" do contrato, que a Carol já aprovou em `portal-fechamento-sem-levantamento`. Só o item novo do sino é desenhado: o painel, os filtros, o vazio, o erro e a folha de destino não mudam.

## Como abrir

- `index.html` abre sozinho, sem internet. O botão **Estados**, embaixo, troca de estado. O endereço também aceita `?estado=sp-novo` (ou outro nome da tabela). No celular, feche o painel (X) para chegar ao botão Estados.
- `<estado>-computador.png` (1440) e `<estado>-celular.png` (390) são as capturas de cada estado.
- `_conferencia.json` guarda o resultado da conferência automática.
- `sh _fonte/gerar.sh ..` refaz tudo.

O elenco e o "hoje" são os de sempre: Ribeiro & Matos, quarta-feira, 18/11/2026. O caso principal é o do fechamento aprovado, "Carvalho x Construtora Lume" (Noemi, C-2026-012, e Cláudio, C-2026-013). Ali, Diego registrou a parcela 6/6 em 17/11, às 11h05, e Marina encerrou em 18/11. Por isso Diego não recebe esse aviso, porque foi ele quem fez a ação. Quem recebe são Marina e Bianca. Os outros casos são fictícios e novos.

## Os estados e o texto de cada aviso

Todo aviso tem o mesmo título, no passado, porque o aviso não muda: "O caso **‹nome do caso›** ficou pronto para encerrar no financeiro". O ícone é o cadeado. Enquanto o caso está pronto, o selo é "Pronto" (tom ok) e o destino é "Ver o acerto no ‹contrato›". Quando o caso tem mais de um contrato, o destino é o de menor número, e a folha dele mostra o fechamento do caso inteiro (as parcelas de todos os contratos).

| Estado | Quem vê | Detalhe do aviso (texto exato) |
|---|---|---|
| `sp-novo` | Marina | "Diego Almeida registrou a última parcela. As 7 parcelas de Noemi Bastos Carvalho e Cláudio Carvalho foram pagas. Confira o acerto e encerre." Fica em "Ontem · 17/11", 11h05, como novo, no meio da lista aprovada do sino da Marina. |
| `sp-motivos` | Diego | Reembolso: "Bianca Torres marcou o último reembolso, e nada falta receber de Regina Souza. Confira o acerto e encerre." · Êxito: "Bianca Torres marcou o êxito de Sérgio Gomes como não cobrado. As 4 parcelas já estavam pagas. Confira o acerto e encerre." · Contrato encerrado: "Felipe Matos encerrou o C-2026-016, e as parcelas que faltavam foram canceladas. Confira o acerto e encerre." · Rotina das 7h: "Nada falta receber de Paulo Henrique Dias. Confira o acerto e encerre." · Caso encerrado no Jurídico: "Larissa Costa encerrou o caso, e nada falta receber de Rosângela Teixeira. Confira o acerto e encerre." |
| `sp-outro-caso` | Diego | "Felipe Matos ligou o C-2026-007 ao caso Martins x INSS · aposentadoria, em andamento. As parcelas que faltam seguem com ele, e nada falta receber de Ivone Martins. Confira o acerto e encerre." Este aviso só existe se a Carol disser sim à pergunta 3. |
| `sp-varios` | Diego | Três clientes: "Marina Ribeiro registrou a última parcela. As 9 parcelas de Lúcia Nogueira, Paulo Nogueira e mais 1 cliente foram pagas. Confira o acerto e encerre." · Um cliente: "Bianca Torres registrou a última parcela. As 10 parcelas de Helena Freitas foram pagas. Confira o acerto e encerre." (Dois clientes é o `sp-novo`.) |
| `sp-denovo` | Diego | Título: "O caso **Lima x Condomínio Solar** ficou pronto de novo para encerrar no financeiro". Detalhe: "Bianca Torres marcou o reembolso da cópia do processo, e a pendência que tinha voltado foi resolvida. Confira o acerto e encerre." Mais abaixo, o aviso antigo de 16/11 aparece com o selo neutro "Aviso antigo", "**Agora:** o caso ficou pronto de novo; veja o aviso mais novo." e o destino "Ver o acerto no C-2026-009". |
| `sp-lido` | Marina | O mesmo aviso do `sp-novo`, sem o destaque. O selo continua "Pronto", porque o caso ainda não foi encerrado. |
| `sp-encerrado` | Bianca | O detalhe original, sem "Confira o acerto e encerre.", e depois: "**Agora:** Marina Ribeiro encerrou no financeiro hoje, às 10h05." Selo neutro "Encerrado". Destino: "Ver o fechamento no C-2026-012". |
| `sp-pendente` | Bianca | O detalhe original e depois: "**Agora:** depois deste aviso, o acerto voltou a ter pendência." Selo de atenção "Voltou a ter pendência". Destino: "Ver o acerto no C-2026-012". |
| `sp-fora` | Diego | O aviso de 12/11 (Rocha x INSS · aposentadoria rural) e depois: "**Agora:** entrou RPV ou alvará neste caso, e o fechamento passou para a ficha do repasse." Selo neutro "Fecha no repasse". Destino: "Ver o fechamento no C-2026-004", com as palavras da folha aprovada `contrato-com-levantamento`. |

## Perguntas para a Carol

As perguntas são as do `PLANO.md` (seção 7). O desenho segue as recomendações dele. Duas perguntas aparecem direto na tela:

- **Pergunta 3:** o `sp-outro-caso` só existe se a Carol disser sim.
- **Pergunta 4:** no `sp-encerrado`, o aviso continua "Novo" para a Bianca, que ainda não o abriu, mesmo depois que a Marina encerrou o caso. Se a Carol preferir que ele fique lido, só some o destaque.

Um ponto novo, do desenho: **o número do contrato vai no destino** ("Ver o acerto no C-2026-012"). Num caso com vários contratos, a pessoa sabe antes de clicar qual contrato vai abrir.

## Decisões de design

1. **Mesma família, sem padrão novo.** O item usa o mesmo HTML e o mesmo CSS do sino aprovado: ícone no círculo, título com o nome em negrito, detalhe, linha com "Novo", selo, hora e destino, e o aviso inteiro como link. O script e o CSS foram lidos do `sino.py` aprovado sem mudança.
2. **O "Agora:"** é a única peça a mais. É uma segunda linha de detalhe, que começa com "Agora:" em vinho e negrito. Ela entra quando o caso mudou depois do aviso (encerrado, com pendência ou com levantamento). O aviso em si não muda nem se apaga: o que ele contou continua escrito acima. Nesses casos, "Confira o acerto e encerre." sai do detalhe, porque deixou de valer, e o destino muda de nome. O link é sempre o mesmo, a folha `#t-fecha` do contrato. Para o leitor de tela, o estado de agora também entra no nome do link (". Agora: encerrado.", "voltou a ter pendência", "aviso antigo, há um mais novo" ou "fecha no repasse"), porque o selo e a linha "Agora:" ficam fora dele.
3. **Nenhum valor em reais**, em nenhum estado (PT-02). O aviso diz quantas parcelas, quem fez e o que aconteceu. Os valores ficam na folha, que só abre para quem tem a área Financeiro.
4. **Selos:** "Pronto" (ok), "Encerrado" (neutro), "Voltou a ter pendência" (atenção), "Aviso antigo" (neutro) e "Fecha no repasse" (neutro). São os tons do D2 que o sino já usa. Nenhum estado depende só da cor: o selo e a linha "Agora:" dizem a mesma coisa em palavras.
5. **"Ficou pronto de novo" vai no título**, e não no fim do detalhe. Quem já viu o primeiro aviso percebe a diferença na primeira linha. O aviso antigo continua na lista com o estado do período dele ("Voltou a ter pendência"). É a regra do plano de que o "agora" é do período do aviso, não do caso.
6. **Um molde só para "nada a receber":** "nada falta receber de ‹cliente›", sem "mais" e sem "neste caso".
7. **Clientes:** com um cliente, o nome aparece. Com dois, os dois nomes. Com três ou mais, os dois primeiros e "mais N clientes". Isso segue os campos `clientes` e `maisClientes` do plano.
8. **O ícone é o cadeado**, que já existe na moldura e no código, como o plano pede.

## O que mudou em relação ao plano

- `sp-novo` usa o caso de dois clientes do fechamento aprovado, e não um caso com um cliente só. Por isso o `sp-varios` mostra um cliente e três clientes.
- Quem vê o `sp-novo` é a Marina, não o Diego, porque no fechamento aprovado foi o Diego quem registrou a última parcela. O Diego aparece nos outros estados.

## O que ficou de fora

- O vazio, o erro e os filtros do sino, que são os aprovados e não mudam.
- A folha de destino, que é a aprovada (`contrato-pronto`, `encerrado` e `contrato-com-levantamento`).
- A frase do êxito lançado e pago não tem captura própria. O texto exato é: "Bianca Torres registrou o pagamento do êxito de Sérgio Gomes. Confira o acerto e encerre."
- O aviso de quando o caso fecha, que é o item pendente proposto na seção 6.4 do plano.

## Conferência

O `_conferencia.json` cobre 18 capturas (9 estados, cada um em computador e celular). O axe (WCAG 2.0, 2.1 e 2.2, A e AA) não achou nenhuma violação. Nenhuma captura tem rolagem lateral nem erro de script, e nenhum alvo de toque tem menos de 44 px. O aviso inteiro é o alvo, como no sino aprovado.

## `_fonte/`

- `sino_caso.py` gera o `index.html` e o `casos.json`.
- `sino.py`, `base.py`, `extra.py` e `clientes.py` são cópias sem mudança do sino aprovado.
- `comum.py` é a cópia do fechamento aprovado. A pasta das telas aprovadas vem da variável `APROV`.
- `fotos.cjs` é a cópia do fechamento, com três mudanças: escala 2, a exceção de alvo do sino e a captura que cresce até caber a lista inteira.

## Revisão do desenho

Os 7 ajustes da `REVISAO-DESENHO.md` foram aplicados, e as capturas e o `_conferencia.json` foram refeitos (axe sem violações nas 18 capturas).

1. **Título no passado:** "ficou pronto para encerrar no financeiro", sempre. O segundo período fica "ficou pronto de novo para encerrar no financeiro".
2. **Leitor de tela:** quando há "agora", o link ganha um trecho só para leitor de tela com o estado (por exemplo, ". Agora: encerrado.").
3. **Pendência que já foi resolvida:** o `pendente` passou a ser escrito no passado e leva a "Ver o acerto". Adotei também a opção mais completa: o aviso antigo de um caso que já tem período mais novo ganha o estado **`depois`**, com o selo neutro "Aviso antigo" e "Agora: o caso ficou pronto de novo; veja o aviso mais novo." (`sp-denovo`).
4. **Aviso de outro caso:** a frase ficou mais curta e o contrato vem primeiro.
5. **Caso com levantamento:** usa as palavras da folha aprovada ("RPV ou alvará", "Fecha no repasse", "Ver o fechamento no …").
6. **Frases dos motivos:** um molde só para "nada falta receber de ‹cliente›", e a frase exata do êxito pago está nas notas. No `sp-outro-caso`, segui o molde do ajuste 6 ("e nada falta receber de Ivone Martins") no lugar da frase sugerida no ajuste 4 ("neste caso nada mais falta receber"), que tinha "mais" e "neste caso".
7. **Dois contratos, um destino:** a nota sobre o contrato de menor número está no topo da tabela.

### O que o plano precisa mudar por causa do desenho

- **Seção 3.2:** o título fica no passado; "ficou pronto de novo" passa para o título; o número do contrato vai no destino ("Ver o acerto no ‹contrato›"); "nada falta receber" segue um molde só; e entra a frase do êxito pago.
- **Seção 3.4:** entra o estado `{ "depois": true }`, quando existe um período mais novo do mesmo caso. É uma busca a mais pelo índice `(caso_id, pronto_em desc)`, que o plano já cria, e ela vem antes de `pendente`. Selo neutro "Aviso antigo". Os textos de `pendente` e `fora` e o selo "Fecha no repasse" passam a ser os desta nota.
- **Seções 5.2 e 6.2:** `descreverAviso` passa a devolver também a linha de agora e o trecho para o leitor de tela. O Vitest cobre o título no passado, os quatro `agora` (com o `depois`) e o nome acessível do link. O pgTAP cobre o `depois`.

## Ajustes não aceitos

Nenhum. A única diferença é a do ajuste 4, explicada acima: segui o molde do ajuste 6, que a própria revisão pede.
