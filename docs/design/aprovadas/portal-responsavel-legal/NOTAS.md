# Clientes: quem assina pelo cliente menor ou sob curatela · notas

**Aprovado pela Carol em 22/11/2026 às 9h37 (Bahia), com as 8 recomendações** (“pode seguir as recomendações”). Desenho do item F3.98 do painel. Hoje a ficha do cliente só tem “Quem assina pela empresa” (pessoa jurídica). Falta, para a pessoa física, o responsável legal: quem assina pelo cliente menor de idade ou pelo adulto sob curatela. Esses dados vão para a procuração e o contrato gerados.

Ideias que pesam: AP-01 (cadastro único, com a qualificação usada nos documentos), CH-08 (procuração e contrato gerados com os dados do cliente), PT-11 (cadastro mínimo e finalidade por campo), PT-03 (nada é apagado em silêncio), PT-07 (arquivos privados) e PT-10 (WCAG 2.2 AA, celular, vazio e erro).

Parte de três desenhos aprovados, sem mudá-los:

- **Clientes** (`portal-clientes`): formulário de novo e editar, ficha em leitura, “Qualificação para procuração e contrato”, selo “procuração” em cada campo, aviso de LGPD dentro do formulário.
- **Ficha ligada** (`portal-ficha-cliente-ligada`, aprovada em 22/11): âmbar do “Próximo passo”, trilha de quatro passos, abas Ficha, Atendimentos, Propostas, Contratos e Casos.
- **Procurações e modelos** (`portal-procuracoes`, decisão 15 e o estado `gerar-menor`): página única de gerar, quadro “Quem assina por Pedro” com “Mudar na ficha”, prévia com as três marcas, dado faltando que avisa e não bloqueia.

O elenco é o de sempre (Ribeiro & Matos, Marina Ribeiro como sócia dona). “Hoje” é 22/11/2026. Os clientes:

| Cliente | Idade hoje | Quem assina | Para mostrar |
|---|---|---|---|
| Pedro Henrique Alves Souza | 12 anos (nasceu em 14/03/2014) | a mãe, Joana Alves Souza | representado (até 15 anos) |
| Lucas Ferreira Moura | 16 anos (03/02/2010) | ele e o pai, Marcos Ferreira Moura | assistido (16 e 17 anos) |
| Sebastião Ramos Filho | 74 anos | a curadora, Helena Ramos Castro (filha) | curatela |
| Rafaela Nunes Torres | fez 18 anos em 19/11/2026 | ela mesma; antes, a avó e tutora, Cleusa | aviso dos 18 anos |

Todos os dados são fictícios. Os CPFs têm dígitos válidos (o gerador aprovado); o número do processo de curatela e os RGs são inventados. As peças novas têm o prefixo `rl-`.

## Como abrir

- `index.html` abre sozinho, com o CSS, as fontes e os ícones embutidos. Funciona publicado como página única.
- O botão **Estados**, no canto de baixo, troca de estado. O estado também vem do endereço, por exemplo `index.html?estado=gerar-assistido`.
- Abaixo de 760 px, a página vira a versão de celular.
- Funcionam: escolher “O cliente assina por si?” mostra o quadro certo (menor ou curatela), as abas da prévia (clique e setas), a janela dos 18 anos (abre, fecha pelo X e pelo Esc). O resto é desenho.
- As capturas `<estado>-computador.webp` (1440 px) e `<estado>-celular.webp` (390 px) ficam na pasta. A do celular mostra a página inteira; com janela aberta, a captura cresce até caber a janela.
- `_fonte/gerar.sh <pasta>` refaz tudo:
  - `comum.py`, `clientes.py`, `juridico.py` e `ficha_ligada.py` são cópias sem mudança da ficha ligada aprovada;
  - `procuracoes.py`, `contratos.py`, `pecas.py` e `peticoes_css.txt` são cópias sem mudança de Procurações aprovado;
  - `responsavel.py` lê `ficha_ligada.py` e `procuracoes.py` até o começo dos estados, sem gerar os HTML deles, e escreve o `index.html` e o `casos.json`;
  - `fotos.cjs` (o da ficha ligada, com o celular em 390 px) faz as capturas e roda as conferências; `webp.py` converte para WebP.

## Estados (15)

| Grupo | Estado | O que mostra |
|---|---|---|
| Cadastrar e editar | `novo-menor` | Novo cliente, Pedro, 12 anos: “Não: é menor de 18 anos”, data de nascimento, a conta (“é representado”), quem assina (a mãe) e a qualificação de menor |
| Cadastrar e editar | `novo-assistido` | Novo cliente, Lucas, 16 anos: a conta diz “é assistido”; estado civil, profissão e RG dele ficam opcionais |
| Cadastrar e editar | `novo-curatela` | Novo cliente, Sebastião: a curadora, o endereço dela (não moram juntos), o que diz o termo, processo, vara e o arquivo do termo |
| Cadastrar e editar | `novo-erros` | Falta a data de nascimento, falta o nome de quem assina e o CPF da mãe não confere. Resumo no alto com links |
| Cadastrar e editar | `editar` | Editar a ficha de Pedro vindo de Gerar documentos: o RG de Joana “Mudou”, e “Salvar e voltar” |
| Ficha em leitura | `ficha-menor` | Ficha de Pedro: selo “Menor · assina a mãe”, folha “Quem assina por Pedro”, quando ele faz 16 e 18 e o que muda |
| Ficha em leitura | `ficha-curatela` | Ficha de Sebastião: selo “Sob curatela · assina a curadora”, a curadora, o processo e o termo para baixar |
| Ficha em leitura | `ficha-fez-18` | Ficha de Rafaela, que fez 18 anos: a faixa do aviso, o que falta (estado civil e profissão) e “Quem assinava com Rafaela” guardado |
| Ficha em leitura | `fez-18-janela` | A janela “Rafaela agora assina por si”, que completa os dados e tira a avó de quem assina |
| Gerar documentos | `gerar-representado` | Pedro: o quadro “Quem assina por Pedro”, o aviso “é representado” e a prévia com a assinatura da mãe (substitui o `gerar-menor` aprovado) |
| Gerar documentos | `gerar-assistido` | Lucas: os dois assinam, cada um na sua linha |
| Gerar documentos | `gerar-curatela` | Sebastião: a curadora assina, a qualificação cita o processo, o termo para juntar |
| Gerar documentos | `gerar-falta` | Faltam o CPF e o RG da mãe: avisa e não bloqueia; o documento sai com `[CPF DE QUEM ASSINA: falta]` |
| Gerar documentos | `gerar-fez-18` | Rafaela fez 18 anos: sai a procuração assinada só por ela, com estado civil e profissão marcados como falta |
| O texto | `textos` | Página de referência (não é tela do sistema): a procuração nos três casos, lado a lado |

## Decisões de design

### Na ficha: dizer que o cliente não assina por si

1. **Uma pergunta nova no formulário, logo depois de “Para começar”: “O cliente assina por si?”**, com três escolhas em cartões, como o “Tipo de cliente”: “Sim, assina por si” (já marcada), “Não: é menor de 18 anos” e “Não: está sob curatela”. A ajuda diz “Na dúvida, deixe Sim. Dá para mudar depois, na ficha.” A pergunta só existe para pessoa física; a empresa continua com “Quem assina pela empresa”.
2. **A escolha abre um quadro logo abaixo, com filete vinho**, e só ele. Quem assina por si não vê nada a mais. No código, a capacidade vira o campo `capacidade` (`PLENA`, `MENOR`, `CURATELA`).
3. **A data de nascimento só aparece para o menor**, com a finalidade escrita em cima, no mesmo quadro de LGPD que o cadastro já usa: “Por que pedimos a data de nascimento. Só de quem é menor, e só para saber, no dia de gerar cada documento, se ele é representado ou assistido. De quem assina por si, não pedimos.” O texto de hoje do formulário (“nem data de nascimento”) continua certo para quem assina por si.
4. **Ao lado da data, a conta pronta, em português simples**: “Pedro tem 12 anos hoje: é representado. Só quem responde por ele assina. Aos 16 anos, em 14/03/2030, passa a ser assistido, e os dois assinam.” Para 16 e 17: “é assistido… Aos 18 anos, em 03/02/2028, passa a assinar sozinho.” O quadro é `role="status"` e muda enquanto a pessoa digita.
5. **Quem assina pelo menor:** “É” (Mãe, Pai, Tutora, Tutor), nome completo, CPF (com a conferência dos dígitos), RG e órgão, nacionalidade, estado civil e profissão. Cada campo leva o selo “procuração”, como o resto da qualificação.
6. **Endereço: “Mora com Pedro”, já marcado.** O endereço do cliente vale para os dois e o documento diz “ambos residentes na…”. Desmarcado, aparecem os campos de endereço de quem assina (no desenho, na curatela, porque Helena mora em outro lugar).
7. **A qualificação do menor fica menor.** Para quem tem menos de 16 anos, estado civil e profissão não vão no documento e o RG é opcional; a caixa “Qualificação” mostra só nacionalidade, RG (opcional) e endereço. Para 16 e 17, estado civil, profissão e RG aparecem como opcionais. Nada disso conta como “falta” na ficha nem em Gerar.
8. **Curatela:** quem assina (Curadora ou Curador), a mesma qualificação, o endereço, e “O termo de curatela”: o que diz o termo (“A curadora assina sozinha”, que é representar, já marcada; ou “Os dois assinam”, que é assistir), o número do processo e a vara (opcionais, vão na qualificação) e o arquivo do termo (opcional, pergunta 2). O aviso de LGPD diz que não pedimos o motivo da curatela, laudo nem data de nascimento.
9. **O que é obrigatório:** para o menor, a data de nascimento e o nome de quem assina; para a curatela, o nome do curador. Sem isso, marcar “não assina por si” não diz nada e o documento sairia errado. O resto pode ficar para depois e sai marcado como falta, como hoje (pergunta 6).
10. **Erros** (`novo-erros`): resumo no alto, com links para cada campo, e o erro preso ao campo (`aria-invalid` e `aria-describedby`). Os textos:
    - “Escreva a data de nascimento de Pedro. É com ela que o T3jus sabe quem assina.”
    - “Escreva o nome de quem assina por Pedro. Sem ele, a procuração não tem quem assine.”
    - “Confira o CPF: o último dígito não bate com os anteriores. Veja se algum número foi trocado, ou deixe em branco por agora.” (o mesmo texto aprovado do CPF do cliente)
    - Não desenhado, mas previsto: data no futuro (“Esta data ainda não chegou.”), data de quem já tem 18 anos (“Pela data, Pedro tem 19 anos. Se ele assina por si, marque Sim.”) e o CPF de quem assina igual ao do cliente (“Este é o CPF de Pedro. Escreva o de quem assina por ele.”).
11. **A coluna da direita do formulário** troca o “Cadastro mínimo” por “A lei diz quem assina. O T3jus faz a conta.”, com a regra dos três casos, os 18 anos e a finalidade da data.

### Na ficha em leitura

12. **Selo no cabeçalho vinho**, ao lado de “Ativo”: “Menor · assina a mãe”, “Sob curatela · assina a curadora”, “Fez 18 anos em 19/11”. Com ícone e texto, não só cor.
13. **Uma folha própria, “Quem assina por Pedro”, logo abaixo de “Dados e qualificação”**, com o nome em serifa, o papel, o selo da regra (“Representa · Pedro tem menos de 16 anos”) e os dados. Embaixo, a frase do que muda e quando (“Em 14/03/2030, aos 16 anos, Pedro passa a ser assistido… O T3jus muda sozinho”). O botão “Mudar” leva ao editar.
14. **“Dados e qualificação” ganha a data de nascimento com a idade** (“14/03/2014 · 12 anos”), e o RG vazio do menor aparece como “Não tem · opcional para menor”, sem o selo de falta.
15. **Na lateral, “Para gerar a procuração” conta também os dados de quem assina** (10 de 10 para Pedro), e uma folha curta “Quem assina, ao longo do tempo” mostra as três fases (representado, assistido, assina por si) com as datas.
16. **Curatela:** a folha mostra o processo, a vara e o termo com “Baixar o termo”. A lateral lembra de juntar o termo à procuração.
17. **Contatos:** quem assina costuma ser também o contato principal (“Mãe · quem assina por Pedro”). Não há ligação automática entre os dois: o contato é para falar, quem assina é para o documento.

### Aos 18 anos

18. **No dia em que faz 18 anos, o T3jus já gera os documentos com o cliente assinando sozinho**, porque a conta é sempre pela data. O cadastro não muda sozinho.
19. **A ficha mostra uma faixa âmbar acima das folhas** (“Rafaela fez 18 anos em 19/11/2026. Agora ela assina por si.”), com o que muda nos documentos, o que falta (estado civil e profissão, que não eram pedidos) e que os documentos já assinados continuam guardados. Se há caso em andamento, a faixa lembra que o costume é colher uma procuração nova, assinada só por ela, com “Gerar procuração nova”.
20. **“Atualizar a ficha de Rafaela” abre uma janela curta**: estado civil e profissão, a frase de que a avó sai de “Quem assina” e fica no histórico (nada é apagado) e um link para quem, na verdade, está sob curatela. Ao salvar, a capacidade vira “assina por si”.
21. **Até confirmar, a ficha mostra “Quem assinava com Rafaela”**, com “Até 18/11/2026” e o que ela assinou com a avó.

### Em Gerar documentos

22. **O quadro “Quem assina por Pedro” da página aprovada continua**, agora com o CPF de quem assina e “Mudar na ficha”, que leva ao editar e volta para Gerar ao salvar (`editar`).
23. **O aviso embaixo do quadro é calculado no dia**: “Pedro tem 12 anos hoje: ele é representado. Só Joana assina…”, “Lucas tem 16 anos hoje: ele é assistido. Os dois assinam…”, “Sebastião está sob curatela: Helena assina por ele… Junte uma cópia do termo à procuração”, com “Baixar o termo”.
24. **Falta de dados avisa e não bloqueia**, como o resto da página: o quadro fica tracejado e diz o que falta, o aviso diz “Faltam 2 dados de quem assina por Pedro: o CPF e o RG de Joana”, a prévia marca `[CPF DE QUEM ASSINA: falta]` e a contagem aparece em cada aba. Se o menor estiver sem ninguém em “quem assina” (só por importação, já que o formulário pede o nome), sai `[QUEM ASSINA POR PEDRO: falta]` e o aviso leva à ficha.
25. **Aos 18 anos**, o quadro some e o aviso diz que agora ela assina sozinha e o que falta. Num contrato já assinado, “Contrato de honorários” vem desmarcado, como no aprovado.
26. **A faixa do botão** repete o essencial: “Em todos, Joana assina por Pedro”, “Em todos, Lucas e Marcos assinam”, “Junte o termo de curatela à procuração”.

## O texto nos documentos

Os campos de modelo `[CLIENTE_QUALIFICACAO]` e `[CLIENTE_ASSINATURA]` passam a trazer quem assina. `[REPRESENTANTE_NOME]` e `[REPRESENTANTE_QUALIFICACAO]` servem também ao responsável (veja “Para o servidor”). O contrato usa a mesma qualificação depois de “CONTRATANTE:”.

**Até 15 anos, representado (Pedro):**

> PEDRO HENRIQUE ALVES SOUZA, brasileiro, menor impúbere, nascido em 14/03/2014, inscrito no CPF sob o nº 488.213.907-30, neste ato representado por sua mãe, JOANA ALVES SOUZA, brasileira, divorciada, auxiliar administrativa, portadora do RG nº 41.552.318-7 SSP/SP, inscrita no CPF sob o nº 377.640.215-63, ambos residentes na Rua Bresser, 845, apto. 12, Brás, São Paulo, SP, CEP 03017-000

```
_______________________________________
PEDRO HENRIQUE ALVES SOUZA
representado por sua mãe, JOANA ALVES SOUZA
CPF 377.640.215-63
```

**16 e 17 anos, assistido (Lucas):**

> LUCAS FERREIRA MOURA, brasileiro, solteiro, estudante, menor púbere, nascido em 03/02/2010, portador do RG nº 58.310.442-9 SSP/SP, inscrito no CPF sob o nº 502.318.764-08, neste ato assistido por seu pai, MARCOS FERREIRA MOURA, brasileiro, casado, eletricista, portador do RG nº 27.904.118-3 SSP/SP, inscrito no CPF sob o nº 214.907.836-87, ambos residentes na Rua Cajuru, 312, Belenzinho, São Paulo, SP, CEP 03057-000

```
_______________________________        _______________________________
LUCAS FERREIRA MOURA                   MARCOS FERREIRA MOURA
CPF 502.318.764-08                     pai, que o assiste
                                       CPF 214.907.836-87
```

**Sob curatela, a curadora representa (Sebastião):**

> SEBASTIÃO RAMOS FILHO, brasileiro, viúvo, aposentado, portador do RG nº 6.214.873-0 SSP/SP, inscrito no CPF sob o nº 073.415.628-62, residente na Rua Domingos de Morais, 2.180, apto. 51, Vila Mariana, São Paulo, SP, CEP 04036-000, neste ato representado por sua curadora, HELENA RAMOS CASTRO, brasileira, casada, professora, portadora do RG nº 22.618.405-1 SSP/SP, inscrita no CPF sob o nº 318.260.947-50, residente na Rua Loefgren, 1.415, Vila Clementino, São Paulo, SP, CEP 04040-031, nomeada nos autos da ação de curatela nº 1004587-22.2025.8.26.0100, da 2ª Vara da Família e Sucessões do Foro Central de São Paulo, conforme termo de curatela anexo

```
_______________________________________
SEBASTIÃO RAMOS FILHO
representado por sua curadora, HELENA RAMOS CASTRO
CPF 318.260.947-50
```

Quando o termo diz que a curadora assiste, o texto troca “representado por sua curadora” por “assistido por sua curadora” e saem duas linhas de assinatura, como no assistido. Sem processo e vara na ficha, o trecho “nomeada nos autos…” sai só como “conforme termo de curatela anexo”.

Regras do texto:

- **O papel concorda o gênero de quem assina:** “sua mãe”, “seu pai”, “sua tutora”, “seu tutor”, “sua curadora”, “seu curador”, e “portadora”/“inscrita” vêm do papel.
- **O gênero do cliente:** a prévia mostra “brasileiro, nascido, representado”, como a prévia aprovada de Procurações. Hoje o código usa “portador(a)” e “inscrito(a)” para a pessoa física. Veja a pergunta 7.
- **Moram juntos:** “ambos residentes na…”; senão, cada um com o seu endereço.
- **Faltando:** `[QUEM ASSINA POR PEDRO: falta]`, `[CPF DE QUEM ASSINA: falta]`, `[RG DE QUEM ASSINA: falta]`, e `[DATA DE NASCIMENTO: falta]` se vier de importação sem a data.
- **Na assinatura,** o CPF que aparece é o de quem assina pelo cliente (no assistido, os dois).

## Acessibilidade (WCAG 2.2 AA)

- **Conferência automática** em 30 capturas (15 estados × computador e celular), feita pelo `fotos.cjs`. O resultado está em `_conferencia.json`:
  - o axe (WCAG 2.0, 2.1 e 2.2, A e AA; `@axe-core/playwright` 4.10.1, axe-core 4.10.3) não achou nenhuma violação;
  - nenhuma tela tem rolagem lateral (computador 1440 px, celular 390 px);
  - não houve nenhum erro de script;
  - todos os alvos têm 44 px ou mais. A única exceção é a palavra-marca “T3jus” no trilho (24 px), a mesma da moldura aprovada.
- **O `@axe-core/playwright` não estava em `sistema/node_modules`** (a pasta não existe nesta máquina). Foi instalado numa pasta à parte, fora do repositório, e o `fotos.cjs` o lê pela variável `AXE_PW`.
- **A pergunta “O cliente assina por si?”** é um `fieldset` com `legend` e ajuda ligada por `aria-describedby`. Cada quadro aberto é um `group` com nome (“Menor de 18 anos: data de nascimento e quem assina”). O quadro escondido usa `hidden`, e o leitor de tela não o lê.
- **A conta da idade** é `role="status"`, lida quando muda.
- **Erros:** resumo no alto com links para os campos, `aria-invalid` e `aria-describedby` em cada campo, e “O que você escreveu continua aqui”.
- **Arquivo do termo:** o seletor é um grupo nomeado, e o botão diz o que troca (“Trocar arquivo: termo de curatela”).
- **“Mudar”** na folha de quem assina tem o nome completo para o leitor de tela (“Mudar quem assina por Pedro”).
- **Prévia:** a mesma da página aprovada (`tablist`, setas, as marcas não dependem só da cor). As duas assinaturas do assistido ficam lado a lado no computador e uma embaixo da outra na coluna estreita.
- **Contraste:** só pares aprovados. O quadro aberto tem filete vinho; a conta da idade é tinta sobre `#F2CDB3` (11,2:1); o selo do cabeçalho é tinta sobre `#E9AE90` (8,6:1).

## Para o servidor

As tabelas têm `escritorio_id` e passam por `proteger_tabela_escritorio`. O escritório vem da sessão, nunca do navegador. Nada se apaga (PT-03). A migration fica na faixa 0820–0829 (0800 e 0810 foram usadas por petições e importação depois deste desenho).

### Campos novos em `clientes`

A linha “Campos novos em clientes” das notas de Procurações já propunha `nascimento`, `capacidade`, `rl_nome`, `rl_documento`, `rl_parentesco`, `rl_estado_civil`, `rl_profissao` e `rl_rg`. Este desenho fecha a lista:

| Campo | Tipo e regra | Para quê |
|---|---|---|
| `capacidade` | `text not null default 'PLENA'`, `check in ('PLENA','MENOR','CURATELA')` | Quem assina |
| `nascimento` | `date`, só com `capacidade = 'MENOR'`; não no futuro | Representado ou assistido, no dia |
| `rl_papel` | `check in ('MAE','PAI','TUTORA','TUTOR','CURADORA','CURADOR')` (no lugar de `rl_parentesco`) | “sua mãe”, “seu curador”; concorda o gênero |
| `rl_nome` | como `rep_nome` (2 a 120) | Nome de quem assina |
| `rl_documento` | `cpf_valido(rl_documento)` e diferente de `documento` | CPF de quem assina |
| `rl_rg`, `rl_rg_orgao` | como `rg` e `rg_orgao` | RG de quem assina |
| `rl_nacionalidade`, `rl_estado_civil`, `rl_profissao` | como os do cliente (o estado civil usa o mesmo conjunto de `rep_estado_civil`) | Qualificação de quem assina |
| `rl_mora_junto` | `boolean not null default true` | “ambos residentes” |
| `rl_cep`, `rl_endereco`, `rl_bairro`, `rl_cidade`, `rl_uf` | como os do cliente; só com `rl_mora_junto = false` | Endereço de quem assina |
| `cur_modo` | `check in ('REPRESENTA','ASSISTE')`, só com `CURATELA` (padrão `REPRESENTA`) | Quem assina na curatela |
| `cur_processo`, `cur_vara` | texto opcional, só com `CURATELA` | “nomeada nos autos…” |
| Termo de curatela | em `anexos` (0520), categoria nova `TERMO_CURATELA`, ligado ao cliente | Juntar à procuração (pergunta 2) |

### Regras no banco

- `tipo = 'PJ'` ⇒ `capacidade = 'PLENA'` e todos os `rl_*`, `cur_*` e `nascimento` nulos (como hoje com `rep_*` na pessoa física).
- `capacidade = 'PLENA'` ⇒ `rl_*`, `cur_*` e `nascimento` nulos (PT-11: não guarda o que não usa).
- `capacidade = 'MENOR'` ⇒ `nascimento` e `rl_nome` obrigatórios, `rl_papel in ('MAE','PAI','TUTORA','TUTOR')`, `cur_*` nulos.
- `capacidade = 'CURATELA'` ⇒ `rl_nome` obrigatório, `rl_papel in ('CURADORA','CURADOR')`, `nascimento` nulo.
- O banco **não** exige menos de 18 anos (o tempo passa e a linha continuaria a mesma). Quem confere ao salvar é a função de salvar cliente da 0160: com `MENOR` e 18 anos ou mais na data de hoje (fuso de São Paulo), recusa com `NASCIMENTO_MAIOR`.
- A função de salvar da 0160 entra nos campos novos como entra nos `rep_*`: normaliza (pessoa jurídica limpa `rl_*`; `PLENA` limpa `rl_*`, `cur_*` e `nascimento`), confere o CPF com `recusar_campos('CPF inválido', 'rl_documento')` e grava o evento com os campos alterados.
- Códigos novos, com texto em `TEXTOS_ERRO` no tom aprovado: `NASCIMENTO_OBRIGATORIO`, `NASCIMENTO_FUTURO`, `NASCIMENTO_MAIOR`, `RESPONSAVEL_OBRIGATORIO`, `RESPONSAVEL_E_O_CLIENTE`.
- `FALTANDO_QUALIFICACAO` (0160, linha 218 e 0170): para `MENOR` e `CURATELA`, ganha `RL_DOCUMENTO`, `RL_RG` e `RL_QUALIFICACAO` (estado civil e profissão de quem assina); para `MENOR` com menos de 16 anos, deixa de pedir estado civil, profissão e RG do cliente; de 16 a 17, também não pede (são opcionais).
- **A ficha (`GET /v1/escritorio/clientes/:id`) traz `assina`**, calculado no servidor com a data de hoje: `{ situacao: 'PROPRIO' | 'REPRESENTADO' | 'ASSISTIDO' | 'CURATELA' | 'FEZ_18', idade, faz16, faz18 }`. `FEZ_18` vale para `MENOR` com 18 anos ou mais (é o que acende a faixa).
- **Rota da janela dos 18 anos:** `POST /v1/escritorio/clientes/:id/assina-por-si` com `estado_civil`, `profissao` e `versao`. Na mesma transação: `capacidade = 'PLENA'`, limpa `nascimento` e `rl_*`, e grava o evento `cliente.passou_a_assinar` com os valores de antes (a folha “Quem assinava com Rafaela” lê dele). Recusa com 409 `CONFLITO_VERSAO`, como o editar.
- **Aviso no sino aos 18 anos** (depende da pergunta 3): uma rotina diária gera `CLIENTE_FEZ_18` para o responsável pelo contrato ativo ou pelo caso aberto daquele cliente.
- **Inventário de dados (PT-11):** `nascimento` (finalidade: saber se é representado ou assistido), `rl_*` (qualificar quem assina pelo cliente), `cur_processo` e `cur_vara` (qualificar a curadora), termo de curatela (juntar à procuração; pode trazer dado de saúde, por isso fica no bucket privado, com link temporário, e só para quem pode ver a ficha).
- `documentos_gerados.representante` (já previsto) guarda também a situação no dia (`REPRESENTADO`, `ASSISTIDO`, `CURATELA`) e a idade, para “O que foi usado”.

### Campos de modelo em `packages/domain/src/documentos.ts`

- **`ClienteDoDocumento` ganha** `capacidade`, `nascimento`, `rlPapel`, `rlNome`, `rlDocumento`, `rlRg`, `rlRgOrgao`, `rlNacionalidade`, `rlEstadoCivil`, `rlProfissao`, `rlMoraJunto`, `rlCep`, `rlEndereco`, `rlBairro`, `rlCidade`, `rlUf`, `curModo`, `curProcesso` e `curVara`.
- **Função nova `quemAssina(c, hoje)`**: devolve `PROPRIO`, `REPRESENTADO` (menos de 16 anos), `ASSISTIDO` (16 e 17), `CURATELA_REPRESENTA` ou `CURATELA_ASSISTE`, pela data de nascimento no dia de gerar. Com `MENOR` e 18 anos ou mais, devolve `PROPRIO`.
- **Função nova `qualificacaoDoResponsavel(c)`**: nacionalidade, estado civil, profissão, RG e CPF de quem assina, com o gênero do papel (“portadora”, “inscrita”) e `falta()` no que faltar.
- **`qualificacaoNoDocumento(c, hoje)` muda** (passa a receber `hoje`): para o menor, “menor impúbere” ou “menor púbere”, “nascido em …”, e “neste ato representado/assistido por sua mãe, NOME, …”, com “ambos residentes” quando moram juntos; para a curatela, a qualificação completa do cliente, “neste ato representado/assistido por sua curadora, NOME, …, nomeada nos autos da ação de curatela nº …, da …, conforme termo de curatela anexo”. Menos de 16 anos: sem estado civil, profissão e RG do cliente (o RG entra se houver).
- **`faltasNoDocumento(c, hoje)` muda**: com `MENOR` ou `CURATELA`, entra “quem assina por Pedro”, ou “o CPF de quem assina” e “o RG de quem assina”; para o menor, deixa de pedir estado civil, profissão e RG dele.
- **`montarValoresDocumento` muda:**
  - `[CLIENTE_ASSINATURA]` ganha os blocos acima: representado e curatela com uma linha (“representado por sua mãe, NOME” e o CPF de quem assina); assistido com duas linhas (o cliente com o CPF dele; quem assiste com “pai, que o assiste” e o CPF);
  - `[REPRESENTANTE_NOME]` e `[REPRESENTANTE_QUALIFICACAO]` passam a valer também para quem assina pelo menor ou pelo curatelado (hoje são só da empresa). As descrições em `CAMPOS_DOCUMENTO` mudam para “Quem assina pela empresa, pelo menor ou pelo curatelado”;
  - os marcados ganham “CPF de quem assina por Pedro” e os outros.
- **Campo de modelo novo, opcional: `[CLIENTE_NASCIMENTO]`** (“14/03/2014”), para escritórios que escrevem a qualificação à mão no modelo. Os modelos padrão não precisam dele.
- **`NOMES_CAMPO_CLIENTE`** ganha os campos `rl_*`, `cur_*`, `capacidade` e `nascimento`, para o “o que mudou desde a última geração” (“o RG de quem assina, completado por…”).
- **`sugestaoCampoDocumento`** passa a sugerir `REPRESENTANTE_NOME` também para `[RESPONSAVEL]`, `[RESPONSAVEL_LEGAL]` e `[CURADOR]`.

## Para o painel

- **F3.98** (refs CH-08) recebe este desenho como evidência de “desenhado, esperando a Carol”. O status continua pendente até o código e os testes. O `proximo` passa a ser: “Carol aprovar o desenho `portal-responsavel-legal` e responder às 8 perguntas; depois, migration 0820, formulário, ficha e documentos.ts”.
- A entrega de código vai citar **CH-08** e **AP-01** em `refs`. CH-08 é [VAL]: atender a parte do menor e da curatela não muda o status da ideia, que depende da validação com os escritórios piloto.
- **Itens “pendente” a abrir, citando CH-08:**
  - revisar com a advogada parceira o texto dos três casos (página `textos`), antes de entrar nos modelos padrão;
  - o aviso no sino aos 18 anos, se a pergunta 3 for sim;
  - o termo de tutela como anexo, se a pergunta 2 se estender ao tutor.
- **Não precisa de ideia nova no IDEIAS.md.** O responsável legal é parte da qualificação de AP-01 e dos documentos de CH-08.
- Este desenho substitui o estado `gerar-menor` de Procurações (que passa a ser `gerar-representado`), sem mudar o resto daquele desenho.

## Perguntas para a Carol

1. **Um responsável só, ou os dois (pai e mãe)?** **Recomendo um só, nesta versão.** Na prática, um dos pais assina a procuração e o contrato, e o segundo pode ser contato na ficha. Dois responsáveis dobram os campos, a qualificação e as linhas de assinatura. Se algum piloto pedir (por exemplo, pais separados com guarda compartilhada), entra “Outro responsável que assina junto”.
2. **Guardar o termo de curatela como anexo na ficha?** **Recomendo que sim, opcional**, no bucket privado, com link temporário, só para baixar e juntar à procuração. É o papel que o juiz e o cartório pedem sempre junto. Não pedimos laudo nem motivo, porque o termo pode trazer dado de saúde (dado sensível, LGPD). O mesmo campo pode servir ao termo de tutela, quando quem assina é tutor.
3. **O que fazer aos 18 anos?** **Recomendo:** no próprio dia, os documentos novos já saem com o cliente assinando sozinho (a conta é pela data); a ficha mostra a faixa com o que falta e “Gerar procuração nova” quando há caso em andamento; o cadastro só muda quando alguém confirma na janela; e quem responde pelo contrato ativo ou pelo caso aberto recebe um aviso no sino. O T3jus não gera procuração nova sozinho: quem decide é o advogado.
4. **Na curatela, oferecer “A curadora assina sozinha” e “Os dois assinam”?** **Recomendo que sim, com a primeira já marcada.** Depois do Estatuto da Pessoa com Deficiência, a sentença diz os limites da curatela, e há casos em que o curador só assiste. Sem a escolha, o documento sairia errado nesses casos.
5. **A data de nascimento só para o menor?** **Recomendo que sim.** É o único caso em que ela muda o documento. Para quem assina por si e para o curatelado, ela não tem finalidade (PT-11), e o cadastro de hoje já promete não pedir.
6. **Para salvar o menor, exigir a data de nascimento e o nome de quem assina?** **Recomendo que sim, só esses dois** (e o nome do curador, na curatela). Sem eles, marcar “não assina por si” não serve para nada e o documento sairia errado. O resto (CPF, RG, estado civil de quem assina) pode ficar para depois e sai marcado, como hoje.
7. **Como concordar o gênero do cliente no texto (“nascido” ou “nascida”, “representado” ou “representada”)?** **Recomendo manter o “(a)” que o código já usa** (“nascido(a)”, “representado(a)”), sem pedir um dado novo. O gênero de quem assina vem do papel (mãe, pai, curadora). Se os escritórios estranharem, a saída é um campo “No documento: o cliente / a cliente”, opcional.
8. **No contrato de honorários, o contratante é o menor (representado ou assistido) ou a mãe em nome próprio?** **Recomendo o menor, representado ou assistido, como já estava na prévia aprovada**, e pedir à advogada parceira que confirme. Quem quiser a mãe como contratante em nome próprio pode ter o próprio modelo do escritório com `[REPRESENTANTE_NOME]` e `[REPRESENTANTE_QUALIFICACAO]`.

## F3.162: idade do bebê e data no futuro (aprovado pela Carol em 24/11/2026)

Textos aprovados no thread "Corrigir idade do bebê na frase do menor", às 11h00 (Bahia), com plano e revisão em `t3jus/planos/F3.162-idade-bebe.md` e `F3.162-idade-bebe-revisao.md` (pasta do projeto):

- A idade sai em palavras por `idadeEmPalavras` (domain): "menos de 1 ano" de 0 a 11 meses, "1 ano", e "N anos" de 2 em diante. Sem meses: a frase diz quem assina, e a data fica ao lado.
- Cadastro e Gerar documentos: "Ana tem menos de 1 ano hoje: é representado(a)." e "Ana tem 1 ano hoje: é representado(a)." (o resto da frase igual).
- Ficha, Data de nascimento: "10/05/2026 · menos de 1 ano" e "01/08/2025 · 1 ano".
- Data de nascimento depois de hoje, no quadro do cadastro: "**Esta data ainda não chegou.** Confira a data: com ela, o T3jus diz se Ana é representado(a) ou assistido(a)." No erro do campo, ao salvar: "Esta data ainda não chegou." É o texto previsto no item 10 destas notas.
