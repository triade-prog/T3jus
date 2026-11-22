# Dados do escritório para os documentos · notas

**Aprovado pela Carol em 22/11/2026 (19h26, horário da Bahia), com as 5 recomendações das perguntas do fim.** Desenho = D28; programar = F3.121 (PA-07, EX-15, CH-08, CO-02). Prévia publicada: https://claude.ai/artifact/FKiP4ConLVrCvuXfJ4yVwt Pedido dela (22/11, 18h51, Bahia), com o print do cartão: "em dados do escritório precisa solicitar mais informações, pois é daqui que vai sair para preencher contrato, procuração, etc." Mudança dela na mesma noite (18h54): "esses dados de sua conta devem ficar em Escritório e não em Sua conta; conta é coisas relacionadas ao sistema apenas". A base é o `LEVANTAMENTO.md` desta pasta (sem mudança).

Este desenho segue e não contradiz quatro desenhos aprovados:

- **Sua conta · dados para os documentos** (`portal-conta-dados`, aprovado em 22/11/2026): a frase de qualificação com as marcas `[CPF: falta]`, o disco "N de 8", a barra de tons, a caixa "Usar o endereço do escritório", o formulário, a prévia e os erros. As peças `cd-` são importadas sem mudança. **O que muda:** o quadro sai de Sua conta e vai para Escritório › Advogados nos documentos (pedido da Carol, pergunta 5).
- **Cobrança e PDFs** (`cobranca-pdfs`, estados 26 a 30): o grupo de campos do endereço de cobrança (CEP, rua, número, complemento, bairro, cidade, UF, com `autocomplete`) é o mesmo grupo usado aqui para a sede.
- **"Não foi paga" e logo** (`portal-nao-paga-logo`): Marca e timbrado, em Escritório › Recebimento, onde hoje se muda o registro da sociedade na OAB.
- **Portal v1** (`portal-v1`): a moldura do Portal e a área Escritório, com a barra de seções.

## O que resolve

1. **O cartão "Dados do escritório" pede o que os documentos usam.** Hoje ele tem nome, CNPJ, cidade, UF e um endereço em texto só, e quem muda é a equipe T3jus. O contrato sai com o nome curto ("CONTRATADA: SANTANA") e "com sede em Não informado". O cartão novo tem três partes:
   - **Quem é o escritório:** nome no T3jus, tipo, razão social, CNPJ e registro da sociedade na OAB;
   - **Onde fica:** a sede em partes, mostrada numa linha só;
   - **Como falar com o escritório:** telefone, e-mail e site (opcional).
2. **A sócia dona preenche no Portal**, com a prévia em papel de como o escritório sai no contrato e no timbrado. A equipe T3jus continua podendo mudar no Console (recomendação 1).
3. **Um lugar só para cada dado.** O registro da OAB sai de Marca e timbrado como campo (recomendação 3). O endereço de cobrança passa a ser "o mesmo da sede" por padrão (recomendação 2). Os dados dos advogados saem de Sua conta e vão para o Escritório (pergunta 5).

Atende à ideia que fala dos dados do escritório nos documentos gerados (contrato, procuração e petições) e completa **CH-08** ([VAL]: contrato e procuração com os dados do escritório e dos advogados). Pesam também PT-03 (documentos já gerados não mudam), PT-10 (WCAG 2.2 AA e celular) e PT-11 (finalidade de cada dado). **Quem for programar deve conferir no `IDEIAS.md` o código exato da ideia dos dados do escritório e citar a ideia em `refs`**: não mexi no `IDEIAS.md`, porque esta rodada é só de desenho.

## Como abrir

- `index.html` mostra os 14 estados em computador (1440) e em celular (412), em 28 capturas. Clique numa imagem para abrir o HTML naquele estado.
- `publicar.html` é o mesmo index com as capturas embutidas (WebP), numa página só (8,7 MB). Os cliques abrem os HTML, que vão junto.
- **As páginas abrem sozinhas.** O estado vem do endereço:
  - `escritorio.html?estado=escritorio-faltando`: Dados do escritório e Advogados nos documentos;
  - `conta.html?estado=conta-so-sistema`: Sua conta;
  - `console-ficha.html?aba=ficha&estado=dd-editar` e `console-ficha.html?aba=assinatura&estado=dd-mesmo`: Console;
  - `marca.html?estado=oab-leitura`: Marca e timbrado.

  Abaixo de 760 px, as páginas viram a versão de celular.
- **O que funciona na página:** os botões de tipo no editar escondem e mostram razão social, CNPJ e OAB e trocam a prévia; as caixas "O mesmo endereço da sede" (Console) e "Usar o endereço do escritório" (advogado) mostram e escondem os campos. O resto é desenho: a prévia não acompanha a digitação letra a letra.
- **Para refazer tudo:** `sh _fonte/gerar.sh <pasta>`. Precisa de python3 com Pillow, node com `playwright` e o pacote `axe-core` (ao lado, ou na pasta da variável `AXE_DIR`).
  - **Sem mudança, de `portal-conta-dados`:** `comum.py`, `pecas.py`, `oab.py`, `elenco.py`, `conta_dados.py` (importado, não executado), `fotos.cjs`, `webp.py` e `publicar.py`.
  - **Páginas aprovadas copiadas por script, sem mudança no que já existia:** `cobranca-pdfs/ficha.html` (pelo `console_ficha.py`) e `portal-nao-paga-logo/escritorio-logo.html` (pelo `marca_oab.py`). Os dois scripts trocam o escritório de exemplo pelo Santana e acrescentam um ou dois estados.
  - **O acréscimo:**
    - `esc_elenco.py`: o escritório fictício e a regra da frase "CONTRATADA" e do endereço numa linha;
    - `escritorio_dados.py`: gera `escritorio.html` e `conta.html`, com peças `ed-`;
    - `console_ficha.py` e `marca_oab.py`;
    - `casos.py`: os estados e o index.
- **Elenco fictício:** o mesmo de `portal-conta-dados`.
  - **Santana Advocacia, em Salvador:** razão social "Santana Sociedade Individual de Advocacia", CNPJ 47.318.552/0001-06 (dígitos válidos), registro OAB/BA 4.217 e sede na Av. Tancredo Neves, 1.632, sala 1.208, Caminho das Árvores, CEP 41820-020.
  - **Pessoas:** Carol Santana (sócia dona), Rafael Menezes (advogado), Maria Eduarda Albuquerque Cavalcanti (advogada) e Júlia Andrade (recepção).
  - **No estado do print:** "Santana", CNPJ 60.814.144/0001-03 (confere), Presidente Jânio Quadros/BA e endereço não informado.

## Estados

| Estado | Arquivo | O que mostra |
|---|---|---|
| `escritorio-completo` | escritorio.html | Santana, sociedade individual, com os 5 dados. Disco "5 de 5". No âmbar, o parágrafo da contratada como sai no contrato. Cada dado diz onde sai. Os contatos ficam num bloco à parte; ao lado, onde os dados entram e o resumo dos advogados |
| `escritorio-faltando` | escritorio.html | O caso do print, com 1 de 5. A frase sai com `SANTANA [RAZÃO SOCIAL: falta]`, `[OAB DA SOCIEDADE: falta]` e `[ENDEREÇO DO ESCRITÓRIO: falta], Presidente Jânio Quadros/BA`. Tem "Completar agora" |
| `escritorio-editar` | escritorio.html | O formulário em três grupos, com o tipo em botões de opção e a prévia do contrato e do timbrado ao lado (no celular, entre o formulário e os botões). Embaixo, "4 de 5: falta o registro na OAB. Dá para salvar assim." |
| `escritorio-erros` | escritorio.html | Resumo no alto com links e o erro preso a cada campo: CNPJ com dígitos que não conferem, CEP com 7 números e número em branco. A prévia marca `[CNPJ: confira]` |
| `escritorio-salvo` | escritorio.html | O aviso "Dados do escritório salvos. Valem para os próximos documentos; os já gerados não mudam." |
| `escritorio-sem-sociedade` | escritorio.html | Advogada sem sociedade: sem razão social, CNPJ nem OAB da sociedade. A contratada é Carol, com a qualificação dela e o endereço do escritório. Disco "2 de 2" |
| `escritorio-endereco-antigo` | escritorio.html | "Confira o endereço": o texto antigo à vista e posto em "Rua", com os campos para separar. Até salvar, a frase sai com `[ENDEREÇO: confira]` |
| `escritorio-leitura` | escritorio.html | Rafael, que não é sócio dono, vê tudo só para ler, sem botões, com a linha de quem muda |
| `escritorio-advogados` | escritorio.html | Advogados nos documentos: a lista de quem tem OAB, com a barra "N de 8", o que falta e a frase de cada um. Carol e Maria Eduarda estão completas; Rafael tem 2 faltas |
| `escritorio-advogado-editar` | escritorio.html | O formulário aprovado de `portal-conta-dados` para Rafael, agora dentro do Escritório. A OAB vem da Equipe, com o link |
| `conta-so-sistema` | conta.html | Sua conta só com o que é do sistema: nome de exibição, e-mail de entrada, senha, avisos e escritórios. Uma linha leva a Escritório › Advogados nos documentos |
| `console-ficha-editar` | console-ficha.html | O editar aprovado da ficha com os grupos novos e os contatos como estavam |
| `console-cobranca-mesmo-endereco` | console-ficha.html | O editar aprovado da assinatura. O endereço de cobrança tem a caixa "O mesmo endereço da sede", marcada: a sede aparece numa linha e os campos ficam escondidos. Desmarcada, aparecem os campos aprovados |
| `marca-oab-leitura` | marca.html | Marca e timbrado: o registro "OAB/BA 4.217" só para ler, com "Mudar em Dados do escritório" |

## Decisões de design

### Cabeçalho e resumo

1. **O mesmo cabeçalho de Sua conta, em duas faixas retas.** A faixa vinho traz o sobretítulo, o nome no T3jus, o tipo, a cidade e o CNPJ, com o disco "N de 5" ("faltam N para os documentos"). A faixa âmbar traz "Como o escritório sai no contrato" e o parágrafo da contratada, em serifa e como sai no papel. Nada fica sobreposto: o ícone grande fica atrás do disco, recortado e sem eventos, e some no celular.
2. **Os 5 dados que contam** são o tipo, a razão social, o CNPJ, o registro da sociedade na OAB e o endereço da sede. O endereço só conta quando tem CEP, rua, número, bairro, cidade e UF. Sem sociedade, contam 2: o tipo e a sede.
   - Telefone, e-mail e site são opcionais e não contam, como o e-mail e o telefone profissionais em Sua conta.
   - O nome no T3jus não conta, porque é sempre obrigatório.
   - A barra de tons repete o número com o texto escrito ao lado: nada depende só de cor.
3. **A frase é a do contrato padrão:** "CONTRATADA: [ESCRITORIO_NOME], inscrita no CNPJ sob o nº [ESCRITORIO_CNPJ] e registrada na [ESCRITORIO_OAB], com sede em [ESCRITORIO_ENDERECO], por seus advogados, [ADVOGADOS_QUALIFICACAO]."
   - O que falta sai com a marca aprovada, `[ENDEREÇO DO ESCRITÓRIO: falta]`.
   - Os advogados aparecem como a etiqueta neutra `[QUALIFICAÇÃO DOS ADVOGADOS]`, com borda e sem cor de falta, porque vêm de outra seção e mudam a cada contrato.
4. **Falta avisa e não bloqueia**, como no cliente e no advogado. Para a sócia dona, o âmbar diz quantos dados faltam e quais são, e mostra "Completar agora".

### O cartão

5. **Três partes num quadro só**, com os títulos aprovados (`cd-h3`). "Quem é o escritório" fica à esquerda; "Onde fica" e "Como falar" ficam à direita. No celular, tudo vai numa coluna.
6. **Cada dado diz em uma linha onde é usado** ("Sai em: contrato, recibo e carnê"). A lateral "Onde estes dados entram" resume por documento:
   - contrato: razão social, CNPJ, OAB e sede;
   - procuração: a sede, como endereço onde os advogados recebem intimações;
   - petições: "com escritório em ..."; telefone e e-mail só se o modelo pedir;
   - recibo e carnê: o timbrado.
7. **Nome no T3jus e razão social são coisas diferentes.** "Santana Advocacia" é o nome curto da moldura e das conversas e não sai nos documentos. A razão social sai em maiúsculas no contrato. Enquanto a razão social está vazia, o documento usa o nome curto, como hoje, com a marca `[RAZÃO SOCIAL: falta]` logo depois, para ninguém assinar sem ver.
8. **A sede numa linha só**, no formato de `[ESCRITORIO_ENDERECO]`: "Av. Tancredo Neves, 1.632, sala 1.208, Caminho das Árvores, Salvador/BA, CEP 41820-020". O CEP não quebra no meio. A linha lembra que esse é também o endereço profissional de quem usa o do escritório (decisão 10 de Sua conta).
9. **Contatos continuam à parte e como estão**: são as pessoas com quem a equipe T3jus fala, não saem nos documentos e quem muda é a equipe T3jus, pela Ajuda. O telefone e o e-mail do escritório entram no timbrado no lugar dos contatos; se estiverem vazios, o timbrado usa o primeiro contato, como hoje.

### Editar

10. **Editar troca o cartão pelo formulário na mesma página**, como em Sua conta. O cabeçalho fica reduzido à faixa vinho ("Escritório · editando os dados"). A prévia fica ao lado, fixa ao rolar. No celular, a ordem é formulário, prévia e botões.
11. **O tipo são três botões de opção grandes**, com o que cada um quer dizer: sociedade de advogados, sociedade individual de advocacia, e advogada ou advogado sem sociedade. Sem sociedade, somem razão social, CNPJ e OAB, aparece uma nota dizendo quem vira a contratada e a prévia troca de frase.
12. **A sede usa o grupo aprovado do endereço de cobrança**, com os mesmos campos, larguras, `autocomplete` e textos de erro. O número aceita "S/N".
13. **A prévia em papel tem duas folhas**: o parágrafo do contrato, com os valores preenchidos sublinhados e as faltas marcadas, e o timbrado do recibo e do carnê. Embaixo, o contador ("4 de 5 dados. Falta: o registro da sociedade na OAB. Dá para salvar assim."). Tudo é `aria-live="polite"`.
14. **Só o nome no T3jus e o tipo são obrigatórios.** O resto pode ficar em branco e sai marcado. Regras a mais:
    - o CNPJ, se escrito, precisa ter os dígitos certos;
    - o CEP precisa ter 8 números;
    - com a rua escrita, o número é obrigatório (aceita S/N);
    - a seccional e o número da OAB vão juntos.
15. **Os erros seguem o padrão aprovado**: resumo no alto com links de 44 px, erro preso a cada campo com `aria-invalid` e `aria-describedby`, foco no primeiro campo com erro e Salvar nunca desabilitado.
16. **Salvar** mostra "Dados do escritório salvos. Valem para os próximos documentos; os já gerados não mudam." A frase do pé do formulário diz o mesmo antes de salvar.

### Casos à parte

17. **Sem sociedade, a contratada é a pessoa** (recomendação 4). A frase é a qualificação dela em Advogados nos documentos ("CONTRATADA: CAROLINA SOARES SANTANA, brasileira, casada, advogada inscrita na OAB/BA sob o nº 63.876-S, ..."), com o endereço do escritório e sem CNPJ. "CONTRATADA" ou "CONTRATADO" segue o tratamento. Quem vira a contratada é a sócia dona.
18. **Endereço antigo, num texto só:** na migração, o texto vai inteiro para "rua" e o escritório fica com "confira". O editar mostra um aviso de atenção, o texto antigo num quadro tracejado e os campos para separar. O contrato sai com `[ENDEREÇO: confira]` até alguém salvar. O T3jus não tenta separar o texto sozinho: um número em lugar errado no contrato é pior que a marca.
19. **Quem não é a sócia dona** lê tudo, sem "Editar" nem "Completar". A linha de baixo diz quem muda (Carol Santana, sócia dona, ou a equipe T3jus no Console) e que é com ela que se fala.

### Advogados nos documentos e Sua conta (pedido da Carol, 18h54)

20. **Uma seção própria em Escritório, logo depois de Dados do escritório na barra de seções:** "Advogados nos documentos". Não coloquei os advogados no mesmo cartão por três motivos:
    - a página de Dados já tem o escritório, os contatos e a lateral, e a lista de advogados ficaria longa;
    - editar uma pessoa abre um formulário inteiro, com prévia própria;
    - quem muda é diferente: cada advogado muda os próprios dados, e só a sócia dona muda os do escritório.

    A página de Dados mostra um resumo ("Advogados nos documentos": cada pessoa com "8 de 8" ou "Faltam 2") e o link "Ver os advogados".
21. **A lista** mostra quem tem OAB na Equipe: o nome, o papel, as inscrições, a barra "N de 8", o que falta e a frase de qualificação com as marcas aprovadas. Quem tem falta ganha o botão principal "Completar os dados"; quem está completo, "Ver e editar". Quem não tem OAB não aparece, e um texto diz por quê (Júlia, da recepção).
22. **Editar uma pessoa é o formulário aprovado de Sua conta, escrito na terceira pessoa** (o mesmo da Equipe aprovada): campos, caixa do endereço do escritório, prévia da procuração e erros. Muda só o caminho de volta ("Advogados nos documentos"). A OAB continua só para conferir, vinda da Equipe, com o link "Mudar na Equipe".
23. **Quem muda** (pergunta 5): a sócia dona muda os dados de todos; cada advogado vê a lista e completa só os próprios, nesta mesma seção. A última mudança vale. O histórico guarda quem mudou quais campos, sem os números de CPF e RG.
24. **Sua conta fica só com o que é do sistema**: nome de exibição, e-mail de entrada, senha, avisos e escritórios, além de "Seu acesso". Um aviso de informação diz que os dados para contratos e procurações agora ficam em Escritório › Advogados nos documentos, com o botão para ir lá. No Mais do celular, o item volta a se chamar "Sua conta".
25. **A ficha da pessoa na Equipe** (estados `equipe-pessoa-dados` e `equipe-pessoa-editar` de `portal-conta-dados`) não precisa mais do formulário. Recomendo que ela mostre só a frase e a barra "N de 8" e troque "Completar dados" pelo link "Ver em Advogados nos documentos". As inscrições na OAB continuam lá, com Editar e Remover, como aprovado. Não desenhei esse estado: é tirar peças, não criar.

### Console, cobrança e Marca e timbrado

26. **Console › Editar ficha** tem os mesmos campos do Portal, no padrão aprovado do Console:
    - grupos com sobretítulo;
    - o tipo em `grupo-opcoes`;
    - a sede no grupo aprovado do endereço de cobrança;
    - os contatos como estavam (`contatos-edit`).

    A lateral âmbar "A ficha é do escritório" ganha duas linhas: a sócia dona também muda no Portal, e o histórico diz onde foi a mudança.
27. **Endereço de cobrança "o mesmo da sede"** (recomendação 2). O grupo aprovado ganha a caixa "O mesmo endereço da sede", marcada por padrão, com a sede numa linha ("· da ficha do escritório"), e os campos ficam escondidos. Desmarcada, aparecem os campos aprovados, preenchidos com a sede para a pessoa só mudar o que difere. Marcada, nada é guardado em `assinaturas`: o boleto usa a sede do dia da emissão.
28. **Marca e timbrado: o registro na OAB só para ler** (recomendação 3). O bloco mostra a seccional e o número no padrão das inscrições, o lugar onde ele sai e o link "Mudar em Dados do escritório". O resto da folha aprovada não muda. A barra de seções do Escritório ganha "Advogados nos documentos".

## Dados e regras para quem programar

| Onde | O quê |
|---|---|
| Migration (faixa a reservar) | Colunas novas em **`escritorios`** (a tabela já tem `escritorio_id` como chave e passa por `proteger_tabela_escritorio`): `tipo` (`SOCIEDADE`, `SOCIEDADE_INDIVIDUAL`, `SEM_SOCIEDADE`, nulo nos antigos), `razao_social` (5 a 150), `end_cep` (8 dígitos), `end_logradouro`, `end_numero` (aceita `S/N`), `end_complemento`, `end_bairro`, `end_confira` (boolean), `telefone` (10 a 11 dígitos), `email`, `site`. `cidade` e `uf` continuam e passam a ser a cidade e a UF da sede. `oab_sociedade_uf` e `oab_sociedade_numero` (0601) não mudam. Com `SEM_SOCIEDADE`, `razao_social`, `cnpj` e `oab_sociedade_*` ficam nulos (`check`). Os mesmos nomes de colunas de endereço de `assinaturas` (0694) |
| Migração do endereço | O `endereco` antigo (texto) vai para `end_logradouro`, com `end_confira = true`. A coluna `endereco` fica só para leitura até todos os escritórios salvarem e depois sai. `tipo` nasce nulo e conta como falta |
| Cobrança | `assinaturas` ganha `end_mesmo_da_sede` (boolean, padrão `true`). Com `true`, os campos `end_*` de `assinaturas` são ignorados e o boleto usa os da sede. A cópia do pagador na `faturas` (já aprovada) continua congelando o endereço do dia |
| Advogados | A tabela `pessoa_dados_documento` (0760, aprovada) não muda. Mudam as rotas e o acesso: `GET /v1/escritorio/advogados` (lista de quem tem OAB, com faltas e frase). `GET` e `PUT /v1/escritorio/advogados/:pessoa/dados`: a sócia dona lê e grava todos; cada pessoa lê a lista e grava só a própria linha; os outros recebem 403. As rotas `/v1/escritorio/conta/dados` e `/v1/escritorio/equipe/:pessoa/dados` saem (ou viram atalhos) |
| Acesso | `PUT /v1/escritorio/dados`: só a sócia dona (403 para os outros). O escritório vem sempre da sessão no servidor. O Console continua com `console_editar_ficha` (0060), agora com os campos novos. Os dois levam `versao` (409 `CONFLITO_VERSAO`) |
| Erros | `NOME_OBRIGATORIO`, `TIPO_OBRIGATORIO`, `RAZAO_SOCIAL_INVALIDA`, `CNPJ_INVALIDO`, `OAB_INCOMPLETA`, `OAB_NUMERO_INVALIDO`, `CEP_INVALIDO`, `NUMERO_OBRIGATORIO`, `UF_INVALIDA`, `TELEFONE_INVALIDO`, `EMAIL_INVALIDO`, `SITE_INVALIDO` (os de endereço com os textos da cobrança aprovada) |
| Histórico | `escritorio.dados_mudados`, com quem mudou, onde (Portal ou Console) e quais campos |
| `[ESCRITORIO_NOME]` | Com sociedade: `razao_social` em maiúsculas. Sem razão social: `nome` em maiúsculas + `[RAZÃO SOCIAL: falta]`. Sem sociedade: o nome completo da sócia dona em maiúsculas |
| `[ESCRITORIO_ENDERECO]` | "logradouro, número[, complemento], bairro, cidade/UF, CEP 00000-000". Incompleto: `[ENDEREÇO DO ESCRITÓRIO: falta]`, seguido de ", cidade/UF" quando a cidade existe. Com `end_confira`: o texto antigo + `[ENDEREÇO: confira]` |
| `[ESCRITORIO_CNPJ]`, `[ESCRITORIO_OAB]` | Vazios: `[CNPJ: falta]` e `[OAB DA SOCIEDADE: falta]`. `[ESCRITORIO_OAB]` sai como "OAB/BA sob o nº 4.217" |
| Contrato sem sociedade | O modelo padrão troca o parágrafo inteiro da contratada pela qualificação da sócia dona (`ADVOGADOS_QUALIFICACAO` de uma pessoa, com o endereço da sede). "CONTRATADA" ou "CONTRATADO" segue o tratamento. "Por seus advogados" sai quando a única advogada do contrato é a própria contratada |
| Timbrado | `linhasTimbrado`: razão social (ou nome), "CNPJ · OAB", sede numa linha, "telefone · e-mail · site". Telefone e e-mail vazios: usa o primeiro contato, como hoje |
| Documentos já gerados | Não mudam (PT-03): `documento_gerado`, `recibo_copias` e `carnes` guardam a cópia do dia |

**Para o painel:** a entrega que programar isto cita em `refs` a ideia dos dados do escritório nos documentos e CH-08. Se sair sem o contrato "sem sociedade" ou sem a migração do endereço antigo, cada parte que falta entra como item pendente, citando a mesma ideia.

## Acessibilidade (WCAG 2.2 AA)

Conferido pelo `fotos.cjs` nas 28 capturas (resultado em `_conferencia.json`):

- axe 4.10.2 (WCAG 2.0, 2.1 e 2.2, A e AA, inclusive contraste): **nenhuma violação**;
- nenhuma tela com rolagem lateral, em 1440 e em 412;
- nenhum erro de script;
- alvos: todos com 44 px ou mais, menos a palavra-marca "T3jus" (24 px no computador), como nos aprovados.

**Como as faltas e os estados aparecem sem depender de cor:**

- as faltas são texto (`[CNPJ: falta]`, selo "Falta" com "sai como ...");
- o disco tem o texto para leitor de tela ("1 de 5 dados preenchidos");
- os tipos são `fieldset` com `legend`;
- a sede é `fieldset` com `legend` e ajuda ligada por `aria-describedby`;
- a prévia e o contador são `aria-live="polite"`.

**Cores:** as pares aprovadas (tinta sobre âmbar, vinho escuro sobre âmbar, sal sobre vinho). A etiqueta `[QUALIFICAÇÃO DOS ADVOGADOS]` é vinho escuro sobre branco translúcido.

## Perguntas para a Carol

1. **Quem preenche os dados do escritório?** Recomendado: **a sócia dona preenche e muda no Portal, e os outros leem. A equipe T3jus continua podendo mudar no Console. Tudo fica no histórico.** Alternativa: continua só a equipe T3jus.
2. **O endereço de cobrança é "o mesmo da sede" por padrão?** Recomendado: **sim**. A caixa vem marcada no Console; só se guarda outro endereço quando ele for diferente.
3. **O registro da sociedade na OAB passa para este cartão e sai de Marca e timbrado como campo?** Recomendado: **sim, um lugar só**. Marca e timbrado mostra o registro, com o link para mudar.
4. **Advogada ou advogado sem sociedade: o contrato sai com a pessoa como CONTRATADA, com a qualificação de Advogados nos documentos e sem CNPJ?** Recomendado: **sim**.
5. **Quem edita os dados dos advogados para os documentos, agora em Escritório › Advogados nos documentos?** Recomendado: **a sócia dona edita os de todos, e cada advogado vê a lista e completa só os próprios, nessa mesma seção.** A última mudança vale e fica no histórico. Sua conta fica só com o que é do sistema.

## Limites desta rodada

- **A prévia não acompanha a digitação letra a letra.** Ela muda de estado para estado; só a troca do tipo e as caixas de endereço funcionam de verdade.
- **Não desenhei a ficha da pessoa na Equipe** com o link no lugar do formulário (decisão 25) nem a visão de um advogado na lista (Rafael vendo a lista e editando só os próprios dados). Os dois seguem as peças já mostradas.
- **As páginas aprovadas do Console e de Recebimento foram copiadas e rebatizadas por troca de texto.** Os outros estados delas continuam com o escritório antigo de exemplo (Cedro & Lima, em Recife), e os links para outras pastas ficaram como estavam.
- O `axe-core` (4.10.2) foi instalado numa pasta de rascunho e apontado por `AXE_DIR`, como na rodada anterior.
