# Sua conta: seus dados para os documentos · notas

**Aprovado pela Carol em 22/11/2026 (7h48, horário da Bahia), com as 4 recomendações das perguntas do fim.** Desenho = D22; programar = F3.105 (EX-15). Prévia publicada: https://claude.ai/artifact/QUgwR2375GwSsyTZmXfypy

Uma nova versão da tela **Sua conta** do Portal do advogado e um acréscimo à ficha da pessoa na **Equipe** e à página **Gerar documentos** (Procurações e modelos). Parte de três desenhos aprovados, sem contradizê-los:

- **Equipe · OAB** (`portal-equipe-oab`, aprovado em 20/11/2026): a OAB fica na Equipe, só a sócia dona muda, e cada pessoa confere a sua em Sua conta (decisão 7 e decisão 1 da Carol).
- **Clientes** (`portal-clientes`): os campos de qualificação do cliente (nacionalidade, estado civil com a lista SOLTEIRO a VIUVO, profissão, RG e órgão, CEP, endereço, bairro, cidade e UF) e a regra "dado faltando avisa e não bloqueia".
- **Procurações e modelos** (`portal-procuracoes`, aprovado em 21/11/2026): a página Gerar documentos, a prévia em papel e a marca `[RG: falta]`.

## O que resolve

1. **O cabeçalho de Sua conta no ar está quebrado** (textos sobrepostos, o nome some, a faixa vinho e âmbar desalinhada). A causa, olhando o código: `ContaPortalPagina` (`sistema/packages/ui/src/portal/EquipeOab.tsx`) usa as classes `.ficha-cab`, `.esq`, `.dir`, `.ident` e `.estatua` da ficha do Console, mas em `sistema/packages/ui/src/console.css` essas regras só valem dentro de `.co-ficha` e `.co`. No Portal elas não se aplicam: a grade de duas colunas, o corte diagonal (`margin-left:-70px` + `clip-path`) e a posição do ícone grande (`position:absolute`, `z-index:-1`) somem, e o ícone e os textos se empilham uns sobre os outros. O desenho novo tem **um cabeçalho próprio** (prefixo `cd-`), que não depende do CSS do Console, sem margens negativas nem recorte, com o nome e o e-mail quebrando linha quando são longos.
2. **"Não devemos pedir apenas o número da OAB"**: Sua conta passa a ter o quadro **"Seus dados para os documentos"**, que a própria pessoa preenche e salva: nome completo, como o documento a chama (advogada ou advogado), nacionalidade, estado civil, CPF, RG e órgão, endereço profissional (o do escritório, por padrão), e-mail e telefone profissionais (opcionais). A OAB continua na Equipe e aparece no mesmo quadro, só para conferir. Uma prévia mostra a frase inteira de qualificação, como sai no contrato e na procuração, com o que falta marcado.

Atende a parte de **EX-12** que faltava ("ficha de cada advogado... usada nos documentos gerados": agora com a qualificação inteira, não só a OAB) e alimenta **CH-08** ([VAL]: contrato e procuração com os dados dos advogados). Pesam também PT-03 (documentos já gerados não mudam; nada é apagado), PT-10 (WCAG 2.2 AA e celular) e PT-11 (finalidade de cada dado pessoal novo).

## Como abrir

- `index.html` mostra os 11 estados em computador (1440) e celular (412), em 21 capturas (o `conta-mais` é só de celular). Clique numa imagem para abrir o HTML naquele estado.
- `publicar.html` é o mesmo index com as capturas embutidas, numa página só (5,7 MB). Os cliques abrem os HTML, que vão junto.
- `conta.html`, `equipe.html` e `documentos.html` abrem sozinhos, com fontes, CSS e ícones embutidos. O estado vem do endereço: `conta.html?estado=conta-faltando`, `equipe.html?estado=equipe-pessoa-dados`, `documentos.html?estado=documento-falta`. No celular, `&mais=1` abre a folha Mais. Abaixo de 760 px, as páginas viram a versão de celular. A caixa "Usar o endereço do escritório" funciona (mostra e esconde os campos do endereço próprio); o resto é desenho.
- Para refazer tudo: `sh _fonte/gerar.sh <pasta>` (precisa de python3 com Pillow, node com `playwright` e o pacote `axe-core`, ao lado ou na pasta da variável `AXE_DIR`).
  - Sem mudança, das telas aprovadas: `pecas.py`, `contratos.py` e `oab.py` (Equipe · OAB), `procuracoes.py` e `peticoes_css.txt` (Procurações e modelos), `webp.py`. No `comum.py` mudou só a linha `APROV`, que agora aceita a variável `APROV` e aponta para `/home/claude/t3jus` (a cópia anterior apontava para `t3just`).
  - O acréscimo: `elenco.py` (dados fictícios, a regra da frase de qualificação e a troca do escritório na moldura), `conta_dados.py` (gera `conta.html` e `equipe.html`, peças `cd-`) e `doc_falta.py` (carrega o `procuracoes.py` aprovado e gera `documentos.html` com o aviso).
  - `casos.py` gera a lista de estados e o index; `fotos.cjs` faz as capturas (deviceScaleFactor 2) e as conferências; `publicar.py` monta o `publicar.html`.
- **Elenco fictício novo** (pedido desta rodada): escritório **Santana Advocacia**, em Salvador. Carol Santana (Carolina Soares Santana, sócia dona, OAB/BA 63.876-S), Rafael Menezes (Rafael Augusto Menezes Lima, advogado, OAB/BA 71.204 e OAB/SE 1.288 suplementar), Júlia Andrade (recepção, sem OAB) e Maria Eduarda Albuquerque Cavalcanti (nome completo Maria Eduarda Albuquerque Cavalcanti de Vasconcelos Figueiredo, advogada). CPFs com dígitos válidos; OAB, RG e CNPJ inventados. A moldura aprovada vem com o elenco do Portal v1 (Ribeiro & Matos) e é rebatizada por troca de texto no `elenco.py`.

## Estados

| Estado | Arquivo | O que mostra |
|---|---|---|
| `conta-completa` | conta.html | Carol com os 8 dados. Âmbar com a frase inteira; disco "8 de 8"; OAB para conferir com o link "Corrigir a OAB na Equipe" (ela é a sócia dona) |
| `conta-faltando` | conta.html | Faltam estado civil, CPF e RG. A frase traz `[ESTADO CIVIL: falta]`, `[CPF: falta]` e `[RG: falta]`; disco e barra de tons "5 de 8"; botão "Completar agora" |
| `conta-editar` | conta.html | Formulário aberto; a prévia da procuração ao lado (no celular, entre o formulário e os botões) muda enquanto digita: falta só o RG |
| `conta-erros` | conta.html | Resumo com links e erro preso a cada campo: nome completo vazio, CPF com dígitos que não conferem, cidade vazia no endereço próprio. A prévia marca `[CPF: confira]` |
| `conta-salva` | conta.html | Aviso de salvo: vale daqui em diante; os já gerados não mudam |
| `conta-sem-oab` | conta.html | Júlia, da recepção: "Você não assina contratos nem procurações"; nada é cobrado; o quadro explica quando abre |
| `conta-nome-longo` | conta.html | Nome, e-mail e endereço próprio longos, sem sobreposição em 1440 e em 412. Não é sócia dona: o quadro da OAB diz com quem falar |
| `conta-mais` | conta.html (só celular) | No Mais, o item do grupo Sua conta passa a se chamar "Seus dados para os documentos" |
| `equipe-pessoa-dados` | equipe.html | A sócia dona na ficha de Rafael: a frase com 2 faltas, os dados, as inscrições com Editar e Remover e as últimas mudanças |
| `equipe-pessoa-editar` | equipe.html | O mesmo formulário, na terceira pessoa ("Como o documento o chama", "Salvar dados de Rafael") |
| `documento-falta` | documentos.html | Gerar contrato e procuração com Rafael sem estado civil e CPF: aviso no alto, selo "Faltam 2" no cartão do advogado com o link para completar, prévia com a qualificação de cada advogado e as marcas |

## Decisões de design

### Cabeçalho

1. **Duas faixas retas, uma sobre a outra, em computador e celular.** Em cima, a vinho com o sobretítulo, o nome de exibição, o papel (Sócia dona, Advogada, Recepção), o e-mail de entrada e a data de entrada. Embaixo, a âmbar com "Como você sai no contrato e na procuração" e a frase. A frase tem de 250 a 400 letras: numa coluna de 430 px ao lado, como no cabeçalho anterior, ela ficaria com 8 a 10 linhas, e foi esse aperto que quebrou no ar. Larga, cabe em 4 ou 5 linhas. O corte diagonal sai desta tela; ele continua nas fichas do Console.
2. **Nada é posicionado por cima do texto.** O ícone grande (crachá, tom sobre tom) fica no canto direito, atrás do disco, recortado pela borda, com `pointer-events:none`. O padrão de ícones do campo âmbar fica só no último quarto à direita, fora da frase. No celular, o ícone grande e o padrão saem, como na ficha do Console no celular, e os números (CPF, RG, OAB, CEP) não quebram no meio. O nome usa `overflow-wrap:anywhere` e `text-wrap:balance`; o e-mail quebra depois do @ e antes dos pontos.
3. **O disco** (o recurso "número dentro do círculo" do Gabinete) mostra quantos dos 8 dados estão preenchidos, com "faltam N para os documentos" ao lado. Fica âmbar claro quando está completo. Não aparece para quem não tem OAB.
4. **A frase segue o documento**: nome completo em maiúsculas e em negrito, o resto como sai. O que falta aparece numa marca clara com borda vinho (`[CPF: falta]`), igual à do cliente. Abaixo, "Faltam 3 de 8: estado civil, CPF e RG" e o botão "Completar agora".

### O quadro "Seus dados para os documentos"

5. **Um quadro só, com três partes**: "Quem você é" (nome completo, tratamento, nacionalidade, estado civil, CPF, RG), "Onde você atende" (endereço profissional, e-mail e telefone) e "Sua OAB". A OAB entra no mesmo quadro, como pediu a Carol, mas sem campo: é a lista de inscrições da Equipe, para conferir.
6. **Os 8 dados que contam**: nome completo, tratamento, nacionalidade, estado civil, CPF, RG com órgão, endereço profissional e OAB. E-mail e telefone são opcionais e não contam. A barra de tons (8 traços vinho, os que faltam vazados) repete o número do disco, com o texto escrito ao lado; nada depende só de cor.
7. **O dado que falta não some:** aparece o selo "Falta" e "sai como [CPF: falta]", para a pessoa saber exatamente o que vai sair no papel.
8. **Nome completo separado do nome de exibição.** `pessoas.nome` ("Carol Santana") continua sendo o nome da moldura, da agenda e das conversas. O nome completo ("Carolina Soares Santana") é o da carteira da OAB e só sai nos documentos. A tela lembra: "No T3jus, você aparece como “Carol Santana”".
9. **Tratamento (advogada ou advogado)** é um par de botões de opção e acerta a concordância da frase inteira: casada/casado, inscrita/inscrito, portadora/portador. O estado civil usa a mesma lista do cliente (SOLTEIRO a VIUVO), mostrada como "Casada ou casado" no campo e com a concordância certa na frase.
10. **Endereço profissional: o do escritório, por padrão.** A caixa "Usar o endereço do escritório" vem marcada e mostra o endereço; se o escritório mudar, os documentos mudam junto. Desmarcada, abre CEP, endereço, bairro, cidade e UF, como no cliente.
11. **Para que serve cada dado (PT-11)**: o pé do quadro diz que CPF e RG servem só para os documentos que o escritório gera e que clientes não veem esta página. A lateral "Onde estes dados entram" lista contrato (qualificação da contratada e assinatura), procuração (outorgado, endereço onde recebe intimações) e petições (fecho; e-mail e telefone só se o modelo pedir).

### Editar

12. **Editar troca o quadro pelo formulário na mesma página**, com o cabeçalho reduzido à faixa vinho ("Sua conta · editando seus dados"), porque a prévia passa para o lado. No celular, a ordem é formulário, prévia e botões, para a pessoa ver a frase antes de salvar.
13. **A prévia é um pedaço da procuração em papel**, com o timbre do escritório: "OUTORGADA: CAROLINA SOARES SANTANA, brasileira, casada, advogada inscrita na OAB/BA sob o nº 63.876-S, ... onde recebe intimações." Os valores preenchidos vêm sublinhados, como na prévia do gerador; os que faltam, com a marca. É `aria-live="polite"`. Embaixo, "7 de 8 dados. Falta: RG. Dá para salvar assim."
14. **Só o nome completo é obrigatório.** Ele já vem preenchido com o nome do convite e não pode ficar vazio. O resto pode ficar em branco e sai marcado, como no cliente. Duas regras a mais: o CPF, se escrito, precisa ter os dígitos certos; e quem desmarca o endereço do escritório precisa escrever pelo menos a cidade e a UF (a mensagem lembra que dá para voltar ao endereço do escritório).
15. **Os erros seguem o padrão aprovado**: resumo no topo com links para os campos (alvos de 44 px), erro preso a cada campo com `aria-invalid` e `aria-describedby`, foco no primeiro campo com erro, botão Salvar nunca desabilitado.
16. **Salvar** mostra o aviso "Seus dados foram salvos": vale para os documentos gerados daqui em diante, e os já gerados não mudam (cada arquivo guarda os dados do dia). A mudança entra no histórico da equipe.

### Quem não é advogado

17. **Sem OAB, nada é cobrado.** O âmbar diz "Você não assina contratos nem procurações", que é o normal para a recepção e o financeiro, e quem procurar se for advogada. O quadro diz "Nada a preencher por aqui" e que ele abre quando a sócia dona cadastrar uma OAB na Equipe. Não mostrei o formulário vazio: seria pedir CPF e RG de quem não precisa (PT-11).

### Equipe

18. **A ficha da pessoa na Equipe ganha o mesmo quadro**, com o mesmo cabeçalho (sobretítulo "Pessoa da equipe" e o "voltar para Equipe"). As inscrições continuam com Editar, Remover e Adicionar, como no aprovado. O botão é "Completar dados" e o formulário é o mesmo, escrito na terceira pessoa.
19. **As duas pessoas podem mudar, e a última mudança vale.** A lateral "Últimas mudanças" mostra quem mudou o quê e onde ("Rafael preencheu o RG, em Sua conta"). O histórico guarda quais campos mudaram, não os valores de CPF e RG.

### Gerar documentos

20. **Advogado com dado faltando segue a regra do cliente: avisa e não bloqueia.** No alto, o aviso âmbar "Faltam 2 dados de Rafael Menezes, advogado: o estado civil e o CPF", com o que vai sair no papel e o botão "Completar os dados de Rafael". No cartão de cada advogado outorgado, o selo "Faltam 2" ou "Dados para os documentos completos". O link leva à Equipe (sócia dona) ou a Sua conta (o próprio advogado); para os outros, o texto diz com quem falar.
21. **A prévia mostra a qualificação inteira de cada advogado** em "CONTRATADA: ... por seus advogados ..." e em "OUTORGADOS: ...", com as marcas de falta. O pé diz "2 dados saem marcados em cada um".

## Validação

- **Nome completo**: obrigatório, de 5 a 120 letras, sem números (`NOME_COMPLETO_OBRIGATORIO`, `NOME_COMPLETO_INVALIDO`).
- **Tratamento**: `ADVOGADA` ou `ADVOGADO` (`TRATAMENTO_INVALIDO`). Em branco, a frase sai com "advogado(a) inscrito(a)", como hoje no cliente.
- **Nacionalidade**: de 2 a 60 letras. **Estado civil**: a lista do cliente (`ESTADO_CIVIL_INVALIDO`).
- **CPF**: o servidor tira pontos e traço, guarda 11 dígitos e confere os dois dígitos verificadores; recusa sequências repetidas como 111.111.111-11 (`CPF_INVALIDO`). Não há conferência de repetição entre pessoas.
- **RG**: de 3 a 20 caracteres; **órgão**: de 2 a 20 (ex.: SSP/BA), como no cliente. RG sem órgão conta como falta.
- **Endereço próprio**: CEP com 8 dígitos (quando escrito), cidade e UF obrigatórias (`ENDERECO_INCOMPLETO`, `CEP_INVALIDO`, `UF_INVALIDA`). Com "usar o do escritório", os campos próprios são ignorados e não são guardados.
- **E-mail profissional**: formato de e-mail; **telefone**: de 10 a 11 dígitos. Os dois opcionais.
- **Versão**: o `PUT` leva `versao`; se a pessoa e a sócia dona salvarem ao mesmo tempo, quem salvar depois recebe 409 `CONFLITO_VERSAO`, com o aviso de recarregar.

## Acessibilidade (WCAG 2.2 AA)

Conferido pelo `fotos.cjs` em 21 capturas (resultado em `_conferencia.json`):

- axe (WCAG 2.0, 2.1 e 2.2, A e AA, inclusive contraste): **nenhuma violação**;
- nenhuma tela com rolagem lateral (em 1440 e em 412);
- nenhum erro de script;
- alvos: todos com 44 px ou mais, menos a palavra-marca "T3jus" (24 px no computador), como no aprovado.

Cores: texto tinta sobre âmbar (6,8:1), vinho escuro no nome em negrito sobre âmbar (5,6:1), sal e âmbar claro sobre vinho; âmbar nunca é texto sobre claro e nunca leva texto branco. O selo "Falta" usa #E9AE90 com texto tinta (8,6:1). O tratamento é `fieldset` com `legend`; a prévia e o contador são `aria-live="polite"`; o disco tem o texto escrito para leitor de tela ("5 de 8 dados preenchidos").

## O que muda no servidor

| Onde | O quê |
|---|---|
| Migration `0760_pessoa_dados_documento.sql` (faixa reservada 0760 a 0769) | Tabela nova **`pessoa_dados_documento`**, por escritório: `id`, `escritorio_id`, `pessoa_id`, `nome_completo`, `tratamento` (`ADVOGADA`/`ADVOGADO`, nulo), `nacionalidade`, `estado_civil` (a mesma lista do cliente), `cpf` (11 dígitos, conferido por função), `rg`, `rg_orgao`, `endereco_do_escritorio` (boolean, padrão `true`), `cep`, `endereco`, `bairro`, `cidade`, `uf`, `email_profissional`, `telefone_profissional`, `criado_em`, `atualizado_em`, `atualizado_por`, `versao`. Os mesmos `check` do cliente (0160). Único (`escritorio_id`, `pessoa_id`). Passa por **`proteger_tabela_escritorio`**. Por escritório, e não na pessoa, porque a mesma pessoa pode estar em mais de um escritório (Trocar de escritório), com outro endereço e outro e-mail profissional. O `nome_completo` nasce com `pessoas.nome` no aceite do convite |
| Acesso | A pessoa da sessão lê e grava só a própria linha; a sócia dona lê e grava as do escritório; os outros não leem. O gerador de documentos lê, no servidor, as linhas dos advogados do contrato. O escritório e a pessoa vêm sempre da sessão no servidor |
| Rotas | `GET` e `PUT /v1/escritorio/conta/dados` (sem `pessoa_id`: vem da sessão; `PUT` com `versao`). `GET` e `PUT /v1/escritorio/equipe/:pessoa/dados` (só a sócia dona; os outros recebem 403). O `GET /v1/escritorio/conta` passa a devolver os dados, as faltas e a frase |
| Erros | `NOME_COMPLETO_OBRIGATORIO`, `NOME_COMPLETO_INVALIDO`, `TRATAMENTO_INVALIDO`, `ESTADO_CIVIL_INVALIDO`, `CPF_INVALIDO`, `ENDERECO_INCOMPLETO`, `CEP_INVALIDO`, `UF_INVALIDA`, `EMAIL_INVALIDO`, `TELEFONE_INVALIDO` e 409 `CONFLITO_VERSAO` |
| Histórico | `equipe.dados_documento_mudados`, com quem mudou, onde (Sua conta ou Equipe) e **quais campos** mudaram, sem os valores de CPF e RG |
| Documentos (`sistema/packages/domain/src/documentos.ts`) | Campo novo **`ADVOGADOS_QUALIFICACAO`** (grupo "Advogados e poderes", origem cadastro): para cada advogado outorgado, "NOME COMPLETO, nacionalidade, estado civil, advogada inscrita na OAB/BA sob o nº 63.876-S [e na OAB/SE sob o nº ...], portadora do RG nº ... SSP/BA, inscrita no CPF sob o nº ..., com escritório profissional na ...", unidos por ", e ". As inscrições são as escolhidas no contrato (decisões 17 a 21 da Equipe · OAB). O que falta sai como `[ESTADO CIVIL: falta]`, `[CPF: falta]`, `[RG: falta]` etc. A concordância vem do tratamento |
| Documentos, continuação | Os modelos padrão do T3jus (contrato e procuração) passam a usar `[ADVOGADOS_QUALIFICACAO]` no lugar de `[ADVOGADOS_OAB]`; `[ADVOGADOS_OAB]` continua aceito para os modelos do escritório, e passa a usar o nome completo. O reconhecimento de campos ganha `/QUALIFICA.*ADVOG|ADVOG.*QUALIFICA/` antes da regra do cliente. `ADVOGADOS_ASSINATURA` usa o nome completo. As faltas dos advogados entram na lista de marcados ("Estado civil de Rafael Menezes"). `documento_gerado` grava a frase do dia (PT-03) |

**Para o painel:** esta entrega atende a parte de EX-12 que pede a ficha do advogado usada nos documentos (agora com a qualificação inteira) e a parte de CH-08 que usa os dados dos advogados. Sugiro ajustar o texto de EX-12 no `IDEIAS.md` para "Ficha de cada advogado da equipe com a qualificação completa (nome completo, estado civil, CPF, RG, endereço profissional) e a OAB, usada nos documentos gerados". CH-08 continua [VAL]; se a entrega sair sem o campo novo nos documentos, ele entra como item pendente citando CH-08.

## Perguntas para a Carol

1. **Quem pode editar os dados para os documentos?** Recomendado: **a própria pessoa (em Sua conta) e a sócia dona (na ficha da pessoa, na Equipe)**; a última mudança vale e fica no histórico. Assim quem tem a carteira em mãos preenche, e a sócia dona destrava um contrato sem esperar.
2. **O endereço profissional padrão é o do escritório?** Recomendado: **sim**, com a caixa "Usar o endereço do escritório" já marcada; quem atende em outro lugar desmarca e escreve o seu. Se o escritório mudar de endereço, os documentos de quem usa o padrão mudam junto.
3. **Dado do advogado faltando bloqueia a geração do contrato e da procuração?** Recomendado: **não bloqueia**: avisa no alto, marca no cartão do advogado e sai `[CPF: falta]` no papel, para completar à mão ou no Word, como já é com o cliente.
4. **A pessoa pode corrigir a própria OAB em Sua conta?** Recomendado: **não, continua só na Equipe, pela sócia dona** (decisão 7 aprovada). Em Sua conta a OAB aparece no mesmo quadro, só para conferir, com o caminho para pedir a correção.

## Limites desta rodada

- O pacote `@axe-core/playwright` usado nas rodadas anteriores não estava instalado; o `fotos.cjs` agora injeta o `axe-core` (4.10.2) direto na página e roda as mesmas regras.
- O elenco (Santana, em Salvador) é diferente do das telas aprovadas (Ribeiro & Matos, em São Paulo). A moldura e a página de Gerar documentos foram rebatizadas por troca de texto; links para estados de outras pastas ficaram como `#`.
- A prévia e o contador da edição são desenho: mudam de estado para estado, não enquanto se digita. Só a caixa do endereço funciona de verdade.
