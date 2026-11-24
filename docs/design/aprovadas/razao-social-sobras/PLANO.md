# F3.146 · O que sobrou da razão social · plano de execução

> Plano escrito em 23/11/2026, sobre a `origin/main` (merge do PR #155). Ideia: **PA-07**. Item do painel: `docs/painel/dados/fases/F3/F3.146.json` (pendente). Este documento é só o plano: nada foi programado, nada foi para o commit e nada foi aplicado no Supabase.
>
> **Versão 2 (23/11/2026):** incorpora a revisão em `REVISAO.md` (veredito "aprovar com ajustes"). Conferi no código cada ponto antes de mudar; a seção 12 diz o que entrou e onde.

## 1. Objetivo

Terminar o que a F3.133 deixou de fora, para que o escritório saia igual em todo papel e em toda prévia:

1. **O .docx** (a proposta e os documentos do contrato gerados pelo modelo padrão) passa a ter o timbrado de 4 linhas aprovado, o mesmo do carnê e do recibo, em vez das 3 linhas de hoje, que juntam "CNPJ · OAB · sede" numa linha só.
2. **A prévia do timbrado em Dados do escritório** mostra as 4 linhas, como o desenho aprovado já mostra.
3. **A prévia de Marca e timbrado** mostra, embaixo da marca, a linha da identificação da via do carnê (**razão social** · CNPJ · OAB), no lugar do "CNPJ · OAB" de hoje.
4. **Quem gera o carnê ou o recibo** vê uma linha de aviso na tela quando a razão social está em branco, com o caminho para completar. O papel continua saindo com o nome curto, sem "[falta]" (pergunta 3 do desenho `carne-recibo-razao-social`, aprovada).

A regra das linhas já existe e está testada em `sistema/packages/domain/src/timbrado.ts` (`timbradoDoEscritorio`, `identificacaoDoCarne`, `mesmoNome`, `razaoLonga`). O trabalho é usar essa regra nos lugares que ainda usam a função antiga.

## 2. O que achei no código (e muda o plano)

- **`linhasTimbrado` tem dois papéis hoje.** Ela monta o cabeçalho do .docx (proposta e documentos) e a prévia de Dados do escritório, mas também monta o **recibo antigo** (sem `comTimbrado`), em `Recibo.tsx` (linha 51) e em `recibo_pdf.ts` (linha 136), com o `slice(1)`. Se a função mudar de 3 para 4 linhas, os recibos emitidos antes da 0890 mudam de cara, o que fere PT-03 (documento já gerado não muda). Por isso ela **não pode simplesmente virar as 4 linhas**: ela fica só para o recibo antigo, com outro nome, e o resto passa para `timbrado.ts`.
- **A proposta em .docx hoje nem lê a razão social.** A rota (`api-portal/proposta_docx.ts`) chama `portal_escritorio` e usa os campos do nível de cima, que só têm nome, CNPJ, endereço antigo, cidade, UF e contatos. A razão social, o tipo, a sede em partes, o telefone, o e-mail e o site estão em `portal_escritorio.documentos` (0860), que a rota não usa. Hoje a proposta sai com o nome curto mesmo quando a razão social está preenchida.
- **Sem sociedade, o nome completo e a OAB da sócia dona só chegam a quem é a sócia dona.** `portal_escritorio.documentos` usa `escritorio_documentos_json(x, e_socio_dono(...))`: para os outros, `dona.dados` e `dona.inscricoes` vêm nulos. A 0860 fez isso de propósito. Os documentos do contrato não têm esse problema (`documento_dados` pede `p_com_dona = true`). O carnê e o recibo também não: a 0890 guarda o timbrado no papel e o entrega na prévia do carnê só a quem tem Financeiro ou Contratos. Já a proposta baixada por alguém da equipe com a área Comercial, num escritório sem sociedade, sairia com o nome de exibição da pessoa ("Carol Santana") e sem a OAB. O mesmo vale para a prévia de Marca e timbrado vista por quem não é a dona (`MarcaParaLer`). Nenhuma função `security definer` de hoje dá o nome completo da dona à área Comercial sem um contrato (`portal_carne_opcoes` e `portal_documento_dados` pedem contrato). Veja a seção 5 e a pergunta 1.
- **Quem vê `portal_recebimento` e `portal_proposta`.** `portal_recebimento` só pede `entrar_escritorio(..., 'escritorio.ver')` (`0601_marca_logo_oab.sql:137`): é **toda a equipe**, sem área, inclusive a recepção. `portal_proposta` abre para a área Comercial e a resposta dela vai inteira ao navegador em toda ficha de proposta. Isso pesa na forma da migration (seção 5).
- **A prévia de Marca e timbrado também desenha o recibo errado.** `MiniRecibo` mostra o nome curto no lugar da razão social, junta "CNPJ · OAB" e usa o endereço antigo. O F3.146 cita só a `MiniCarne`, mas as duas ficam lado a lado na mesma prévia e leem os mesmos dados. Recomendo corrigir as duas (pergunta 2).
- **O .docx do contrato vira PDF lendo o cabeçalho.** Quem lê é o laço de `lerParagrafo` em `docx.ts` (linha 462), chamado por `lerDocxParaPdf`; quem desenha é `documento_pdf.ts`. O PDF usa as fontes padrão do pdf-lib (WinAnsi) e tira calado, com `so()` (`documento_pdf.ts:18-19`), todo caractere que não existe nelas. O hífen inseparável (U+2011) não derruba o PDF, mas **some**: o CNPJ sairia "47.318.552/000106". O PDF só quebra a linha no espaço comum (`documento_pdf.ts:55`), então lá o hífen comum nunca quebra e o espaço inseparável (U+00A0) fica dentro da palavra. A proteção contra quebra só importa no Word, e o leitor ainda não conhece `<w:noBreakHyphen/>` (seção 4.1).
- **Os dados para o aviso já chegam à tela, sem migration.** A janela "Gerar carnê" recebe `timbrado` (o de hoje) em `portal_carne_opcoes` (0890), com `tipo` e `razaoSocial`. A janela "Registrar recebimento" pode usar `escritorio.documentos` (`portal_escritorio`, 0860), que traz `tipo` e `razaoSocial` para toda a equipe. O que separa a advogada sozinha é `tipo = 'SEM_SOCIEDADE'`: aí a razão social vazia é normal e não há aviso. Escritório migrado tem `tipo` nulo, e isso conta como "ainda não completou" (o estado `razao-vazia` do desenho é exatamente esse caso). Mas um escritório migrado pode ser de advogada sem sociedade, que não tem razão social para procurar: por isso o tipo nulo ganha um texto próprio no aviso (seção 3).

## 3. O que precisa de desenho e da Carol antes do código

Pela regra do `CLAUDE.md`, estas partes vão para a especialista de frontend de SaaS (seguindo `docs/IDENTIDADE.md` e `docs/design/conceito-gabinete.md`) e depois para a Carol. A especialista deve partir dos aprovados, sem mudar o resto deles.

| # | Peça | Por que precisa de desenho | Aprovados de base |
|---|---|---|---|
| D1 | **Prévia de Marca e timbrado** (`MarcaTimbrado.tsx`: `MiniCarne` e, recomendado, `MiniRecibo`), no editar da sócia dona e no "só para ler" | Muda uma tela aprovada. A miniatura é pequena (a classe `.lg-doc` tem 9 px): é preciso decidir como a linha corrida com a razão social de até 150 letras cabe nela, em cores e em preto e branco, com logo e com nome em letra. Também o "só para ler" de quem não recebe o nome completo da dona (seção 5, opção a) | `portal-nao-paga-logo` (decisões 13 a 27), `escritorio-dados-documentos` (estado `marca-oab-leitura`, decisão 28), `carne-recibo-razao-social` (decisões 3, 4, 5, 8 e 13) |
| D2 | **Linha de aviso na janela "Gerar carnê"** | Peça nova numa tela aprovada | `portal-carne` (a janela e a linha da chave Pix, `cn-chave`) |
| D3 | **Linha de aviso na janela "Registrar recebimento"**, embaixo de "Gerar o recibo" | Peça nova numa tela aprovada | O desenho aprovado da janela de registrar (FI-14, `portal-recibo-recorrente`) |
| D4 | **O alto do .docx** | Não é tela, mas é papel que vai ao cliente. Com 4 linhas, o cabeçalho já passa do espaço que tem, mesmo sem logo (seção 9); com logo, hoje a 1ª linha some (vira o logo); com 150 letras, cresce em toda página. A rodada mostra 5 exemplos: sem logo com 4 linhas curtas; logo; logo e nome ao lado; 150 letras sem logo; 150 letras com logo | `escritorio-dados-documentos` (tabela "Timbrado"), `portal-nao-paga-logo` (decisão 24, caixa de 92 × 18 mm), `carne-recibo-razao-social` (decisões 3 e 13) |

**Não precisa de desenho novo:** a prévia de Dados do escritório. O desenho aprovado `escritorio-dados-documentos` já mostra as 4 linhas no bloco `ed-tim`; o código é que ficou com 3.

Recomendação para os avisos D2 e D3, para a especialista partir dela:
- **Uma linha, não um quadro**, no padrão da linha da chave Pix (`cn-chave`: ícone de alerta e texto), só na tela, nunca no papel.
- **Texto sugerido, com o tipo preenchido:** "O carnê sai com o nome Santana Advocacia: a razão social do escritório está em branco." (no recibo, "O recibo sai…").
- **Texto sugerido, com o tipo em branco** (escritório migrado, que pode ser de advogada sem sociedade): "O carnê sai com o nome Santana Advocacia: os dados do escritório ainda não dizem se ele é uma sociedade nem têm a razão social." Quem é advogada sozinha marca "sem sociedade" e o aviso some.
- **O caminho:** para a sócia dona, o link "Completar em Escritório › Dados do escritório". Para os outros, "Quem completa é Carol Santana, a sócia dona, em Escritório › Dados do escritório", com o link para ver (a página abre só para ler, pela decisão 19 de `escritorio-dados-documentos`).
- **Quem vê:** todos que geram o carnê ou registram o recebimento com o recibo marcado. O aviso é sobre o papel que a pessoa está gerando agora, não sobre permissão de editar.
- **Sem botão "Pedir à sócia dona"** nesta entrega. O pedido da chave Pix (F3.80) criou um aviso no sino; repetir isso para a razão social é outra entrega, se a Carol quiser.

## 4. O que muda, arquivo por arquivo

### 4.1 Domínio (`sistema/packages/domain/src/`)

**`timbrado.ts`**
- Função nova `timbradoDoDocx(e, o: { logo: boolean })`: devolve as linhas do cabeçalho do .docx a partir de `timbradoDoEscritorio(e)`, com o site, como na tabela aprovada:
  - sem logo: razão social (ou o nome completo da sócia dona, sem sociedade; ou o nome curto, sem razão social), "CNPJ · OAB", a sede e o contato;
  - com logo: as mesmas, menos a 1ª quando ela é igual ao nome curto (`mesmoNome`, decisão 3 do carnê e do recibo), porque aí o logo já diz o nome. Depende de D4;
  - devolve também `longa: razaoLonga(nome)`, para a letra menor;
  - a OAB da sociedade é a de Dados do escritório (`oab`, que vem de `oab_sociedade_frase` em `documentos` e no timbrado). Não usa mais `marca?.oab`: pela decisão 28 de `escritorio-dados-documentos`, o registro só se muda em Dados do escritório;
  - nunca "[falta]" nem "confira" no cabeçalho: a regra de `timbrado.ts` vale para o .docx. As marcas de falta continuam no corpo do contrato (`[ESCRITORIO_NOME]`, `[ENDEREÇO: confira]`), onde a decisão 7 de `escritorio-dados-documentos` as pôs.
- Função nova `razaoSocialEmBranco(e: { tipo, razaoSocial })`: devolve `"TIPO"` quando o tipo está vazio e não há razão social; `"RAZAO"` quando o tipo é sociedade (de advogados ou individual) sem razão social; e nulo quando não há aviso (sem sociedade, ou razão preenchida). É a única regra do aviso: a tela escolhe o texto pela resposta, e os testes usam ela.
- Atualizar o comentário do alto (linha 11), que hoje diz que `linhasTimbrado` continua com 3 linhas para o .docx.

**`proposta_docx.ts`**
- `linhasTimbrado` **muda de nome** para `linhasDoReciboAntigo`, com um comentário dizendo que serve só ao recibo emitido antes da 0890 (sem `comTimbrado`) e que não deve ser usada em papel novo. O corpo não muda: o recibo antigo continua saindo como saiu (PT-03). Trocar o nome, e não só deixar um aviso, impede que alguém volte a usar a função no .docx.
- `paragrafosProposta` não muda (seção 6).

**`docx.ts`**
- `criarDocx(paragrafos, timbrado?, logo?)`: o `timbrado` passa a aceitar as linhas em pedaços (`LinhaDoPapel[]`, de `timbrado.ts`), além de texto. Nos pedaços `inteiro` (CNPJ, OAB, CEP, telefone, e-mail, site), os espaços viram espaço inseparável (U+00A0) e o hífen vira `<w:noBreakHyphen/>`. Não usar U+2011: o PDF do contrato tira esse caractere calado e o hífen sumiria.
- `cabecalhoXml`: com `longa`, a 1ª linha passa de 13 pt (`sz 26`) para 11 pt (`sz 22`), no espírito da decisão 13; o tamanho exato sai de D4.
- Com logo: hoje a 1ª linha vira o logo e, com "logo e nome", o texto ao lado do logo é a 1ª linha. Passa a ser assim (depende de D4): o logo, com o **nome curto** ao lado quando o jeito é "logo e nome" (como o carnê e o recibo, `LogoNoDocumento`), e embaixo as linhas de `timbradoDoDocx(e, { logo: true })`. Para isso, `LogoDocx` ganha o campo `nome` (o nome curto), preenchido por `logoDaProposta`. O texto alternativo do logo (`descr`, em `logoXml`) passa a ser o nome curto, como no carnê (decisão 3); hoje é a 1ª linha.
- **Leitor:** o laço de `lerParagrafo` (linha 462), que lê o cabeçalho e o corpo para o PDF, passa a ler `<w:noBreakHyphen/>` como "-". Isso é obrigatório: sem ele, o hífen do CNPJ some no PDF do contrato.
- **`TOKENS` (linha 56)**, de `gruposDeTexto`, usado no preenchimento dos modelos (`preencherDocx`, linha 97), no texto da linha 129 e na busca de faltas (linha 211): também passa a reconhecer `<w:noBreakHyphen/>`, para o texto lido nos testes e na conferência mostrar o hífen. Ele entra como o `<w:tab/>`, numa peça com `inicio: -1`, que o preenchimento não troca. `documentos.test.ts` prova que o preenchimento dos modelos do escritório não mudou.

**`index.ts`**: nada novo além do que `timbrado.ts` já exporta (as funções novas saem por ele).

### 4.2 API (`sistema/supabase/functions/api-portal/`)

**`proposta_docx.ts`**
- Com a migration 1000: a rota chama a função nova `portal_proposta_timbrado` **no lugar de `portal_escritorio`**. Ela devolve o timbrado do dia (`escritorio_timbrado_json`), que já traz razão social, tipo, CNPJ, OAB da sociedade, sede em partes, telefone, e-mail, site, o primeiro contato e, sem sociedade, o nome completo e a OAB principal da dona. Assim nada novo chega ao navegador: só a rota do .docx vê esses dados.
- Sem a migration: a rota lê `portal_escritorio.documentos` (com os `contatos` do nível de cima). Sem sociedade, quando quem baixa não é a dona, o caso fica registrado como pendente no painel (seção 8).
- O nome curto continua vindo de `meus_escritorios`. Trocar `linhasTimbrado(...)` por `timbradoDoDocx(...)` e passar o nome curto no `LogoDocx`.

**`documentos.ts`** (linha 102)
- Trocar `linhasTimbrado({ ...dados.escritorio, oab: dados.marca?.oab ?? ... })` por `timbradoDoDocx(dados.escritorio, ...)`, com a OAB de Dados do escritório. `dados.escritorio` já vem completo de `documento_dados` (0860, `p_com_dona = true`), então aqui não falta dado. Só o modelo padrão leva o timbrado; o modelo do escritório continua com o cabeçalho dele, como hoje.

**`recibo_pdf.ts`** (linha 136): só a troca do nome da função antiga. O recibo antigo sai igual.

**`documento_pdf.ts`**: sem mudança de código, se o leitor do `docx.ts` passar a ler `<w:noBreakHyphen/>`. O cabeçalho do PDF já lê o tamanho da letra do .docx (`Math.min(p.tamanho ?? 9, 13)`) e quebra por palavra; o espaço inseparável mantém o CNPJ inteiro.

### 4.3 Telas (`sistema/packages/ui/src/portal/`)

**`EscritorioDados.tsx`** (componente `Previa`, linha 535)
- Trocar `linhasTimbrado(d)` por `timbradoDoEscritorio(d)` e desenhar as 4 linhas no bloco `ed-tim` aprovado: a 1ª em `<strong>`, as outras em `<span>`. Os pedaços `inteiro` usam `Pedacos`, que já é exportado de `Recibo.tsx:26`, com a classe `cd-nw`, que já existe (`portal.css:5138`) e é a que o desenho aprovado usa no `ed-tim`. O cabeçalho "Contrato de honorários" (`cd-tim`) não muda.
- Nada de CSS novo nem de arquivo comum.

**`MarcaTimbrado.tsx`** (depois de D1)
- `DadosTimbrado` deixa de ser `{ nome, cnpj, oab, local }` e passa a ser o escritório como vai no papel (`EscritorioNoPapel` sem `comTimbrado`), mais o nome curto.
- `MiniCarne`: embaixo da marca, a linha de `identificacaoDoCarne` (**razão social** em negrito · CNPJ · OAB), sem repetir o nome quando é igual ao nome curto, e o "Advocacia" pequeno pela decisão 4 (`subMarcaAdvocacia`). Se `identificacaoDoCarne` devolver nulo, a linha some.
- `MiniRecibo` (se a Carol aprovar, pergunta 2): `linhasDoTimbreRecibo`, como a folha do recibo.
- Sem sociedade, para quem não recebe o nome completo da dona (seção 5, opção a): a linha da identificação mostra só o documento, sem o nome, quando `dona.dados` vier nulo. O jeito exato sai de D1.
- O `aria-label` das figuras (`role="img"` esconde o texto de dentro do leitor de tela) passa a dizer a identificação do escritório, e não só "com o logo" ou "com o nome em letra". O texto exato sai de D1.

**`Carne.tsx`**
- `dadosTimbrado(e, oab)` (linha 1025): monta o novo `DadosTimbrado` a partir do `timbrado` de `portal_recebimento` quando vier (seção 5) ou, sem ele, de `escritorio.documentos`, com os `contatos`.
- `JanelaCarne` (depois de D2): a linha de aviso quando `razaoSocialEmBranco(o.timbrado ?? escritorio.documentos)` não é nulo, perto da linha da chave Pix, com o texto pelo tipo. O nome da sócia dona vem de `o.socioDono` e o "é você" de `o.dono`, como no aviso do Pix.
- O carnê impresso (`FolhasCarne`, `MarcaEscritorio`, `Canhoto`) **não muda**.

**`Financeiro.tsx`** (depois de D3)
- `JanelaRegistrar` passa a receber `escritorio` (hoje recebe só `whatsapp`) nos dois lugares em que é aberta (linhas 306 e 1210). Com "Gerar o recibo" marcado e `razaoSocialEmBranco(escritorio.documentos)` não nulo, mostra a linha de aviso embaixo da caixa.
- Só um caminho grava cópia de recibo (`0533_recibo_pdf.sql:117`, chamado por esta janela); conferir na execução que continua assim.

**`Recibo.tsx`**: só a troca do nome da função antiga (linha 51). A folha do recibo não muda.

**`portal.css`**: o que D1, D2 e D3 pedirem. Antes de criar classe nova, conferir o prefixo no `portal.css` (o desenho do carnê já achou colisão com `rs-`).

### 4.4 Testes que já existem e mudam

- `proposta_docx.test.ts`, `logo.test.ts` e `escritorio_dados.test.ts` testam `linhasTimbrado` com expectativa de 3 linhas: passam a testar `timbradoDoDocx` (4 linhas), e um caso fica com `linhasDoReciboAntigo`, para provar que o recibo antigo não mudou.
- `timbrado.test.ts`, teste "linhasTimbrado (.docx) continua com 3 linhas (F3.146)": vira "o .docx tem as 4 linhas".
- `api-portal/app_test.ts`, testes "AP-05: baixar a proposta em .docx…" (linha 1473) e "F3.16: gerar faz um .docx por documento, no timbrado…" (linha 2225): conferir as expectativas do `header1.xml`. O mock do banco (perto da linha 268) precisa responder à chamada nova (`portal_proposta_timbrado`, ou `documentos` sem a migration); sem isso o AP-05 quebra antes de chegar ao `header1.xml`.
- **`tests/e2e/portal-nao-paga-logo.spec.ts`**: procura as figuras pelo nome exato, "Prévia do alto do carnê, em cores, com o nome em letra" (linha 258), "Prévia do alto do recibo, em preto e branco, com o logo" (linha 273) e "Prévia do alto do carnê com o logo" (linha 346). Esses nomes vêm de `MarcaTimbrado.tsx:81` e `:334`, que mudam. O spec passa a usar os nomes novos aprovados em D1.

## 5. Migration: recomendo uma pequena, a 1000

**Sem migration dá para fazer quase tudo:** o .docx dos documentos, a prévia de Dados do escritório, a prévia de Marca e timbrado da sócia dona e os dois avisos. O que fica errado sem ela é um caso só: **escritório sem sociedade**, quando **quem não é a sócia dona** baixa a proposta (área Comercial) ou abre Marca e timbrado só para ler. Nesses dois lugares, o papel e a prévia sairiam com o nome de exibição da dona e sem a OAB dela.

**Recomendação: `1000_timbrado_proposta_recebimento.sql`**, sem tabela nova e sem dado novo guardado. O cabeçalho registra a faixa desta frente, como fez a 0890: "A faixa 1000-1009 é desta frente". Nenhum arquivo nem plano usa de 0960 a 1009.

- **Proposta: função própria, só para a rota do .docx.** `portal_proposta_timbrado(p_pessoa, p_escritorio)`, `security definer`, em `plpgsql`: primeiro confere o acesso (`entrar_area(..., 'COMERCIAL')`, como `portal_proposta` faz hoje), depois devolve `escritorio_timbrado_json(p_escritorio)`. É `plpgsql`, e não `sql`, porque `escritorio_timbrado_json` lê `pessoa_dados_json`, que depende do `app.escritorio_id` posto pelo `entrar_*`, e num envoltório `sql` a ordem de avaliação não é garantida. **`portal_proposta` não muda**: a ficha da proposta, que vai inteira ao navegador, não ganha nada.
- **Marca e timbrado: `portal_recebimento` ganha a chave `timbrado` só para quem tem Financeiro ou Contratos** (ou é a sócia dona), o mesmo público a que a 0890 já entrega esse dado na prévia do carnê. `portal_recebimento` abre para toda a equipe (`escritorio.ver`), por isso a condição. Para os outros, a chave vem nula e a prévia "só para ler" mostra a linha sem o nome (seção 4.3). Esta é a opção (a) da revisão; a (b) seria entregar a toda a equipe (pergunta 1).
- O que se expõe, nos dois casos: sem sociedade, o nome completo e a OAB principal da sócia dona, que vão impressos no papel do cliente. Nunca CPF, RG ou estado civil (`escritorio_timbrado_json` só leva esses dois, `0890:46-54`).
- Termina com `call fechar_acesso();`, e assim a `service_role` só executa as funções `security definer`. Nada muda em `inventario_dados`: não há tabela nova nem dado novo guardado.

Se a Carol preferir sem migration (pergunta 1), o plano segue sem a 1000 e entra o item pendente F3.148 no painel (seção 8).

**Publicação**, sempre só com o ok da Carol, num item novo do painel, o **P9** (seção 8):
- a migration 1000 no Supabase (se aprovada). Seguindo a lição do P8: se a `0990_sino_caso_pronto_fechar` (do plano `telas/portal-sino-caso-encerrado/`) ainda não estiver no Supabase, ela é aplicada antes da 1000, para o histórico seguir a ordem dos números. Conferir com `list_migrations` antes;
- a `api-portal` (proposta e documentos em .docx, e o leitor do PDF do contrato);
- o Portal na Vercel (as prévias e os avisos).
- Ordem: migration, depois a `api-portal`, depois o Portal. O Portal novo funciona sem a migration (usa `escritorio.documentos` quando `timbrado` não vem); a `api-portal` nova precisa da função da 1000, por isso vem depois dela.
- Teste à mão no escritório de demonstração: baixar uma proposta e gerar um contrato padrão, abrir os dois .docx e o PDF do contrato.

## 6. O que NÃO muda

- **O carnê e o recibo impressos e em PDF** (`Carne.tsx` nas folhas, `carne_pdf.ts`, a folha do `Recibo.tsx` e o `recibo_pdf.ts` novo): já foram feitos na F3.133.
- **O papel do cliente nunca leva "[falta]"** nem "confira" (decisão 12 e pergunta 3 de `carne-recibo-razao-social`). Isso vale para o cabeçalho do .docx.
- **O canhoto do carnê** continua com o nome curto (decisão 7).
- **O corpo dos documentos**: as marcas `[RAZÃO SOCIAL: falta]`, `[ENDEREÇO DO ESCRITÓRIO: falta]` e `[ENDEREÇO: confira]` continuam no texto do contrato, como aprovado.
- **O corpo da proposta**: "Apresentamos a proposta de Santana Advocacia…" e a assinatura com o nome curto ficam como estão. Trocar por razão social é outra decisão, fora do F3.146.
- **`portal_proposta`** e o que a ficha da proposta mostra no navegador.
- **Documentos já gerados** (contratos em `documento_gerado`, carnês e recibos com a cópia do dia) não mudam (PT-03). O recibo antigo sai como saiu. O leitor novo só muda o que tem `<w:noBreakHyphen/>`, que nenhum .docx antigo tem. A **proposta** é exceção conhecida: o arquivo `propostas/<id>-v<versao>.docx` é montado de novo a cada "Baixar", com os dados de hoje, como já é com o logo. Uma proposta já mandada ao cliente, baixada de novo, sai com o cabeçalho novo; isso vai dito à Carol na entrega.
- **O modelo do escritório** (enviado por ele) continua com o cabeçalho próprio; o timbrado entra só no modelo padrão.
- **As petições** (`peticoes.ts`) continuam sem timbrado, como hoje.
- **O Console** não muda.

## 7. Testes

**Vitest do domínio** (`packages/domain/src/`)
- `timbrado.test.ts`: `timbradoDoDocx` com sociedade completa (4 linhas, site incluído); sem sociedade (nome completo e "OAB · sem CNPJ", sem CPF); razão social vazia (nome curto, sem "[falta]"); razão igual ao nome curto, com logo (a 1ª linha some) e sem logo (fica); 150 letras (`longa`); sede antiga com `enderecoConfira` (o texto antigo, sem "confira"); sem telefone e e-mail (o primeiro contato); a OAB do cabeçalho é a de Dados do escritório, mesmo com outra OAB na marca.
- `razaoSocialEmBranco`: sociedade de advogados sem razão → `"RAZAO"`; sociedade individual sem razão → `"RAZAO"`; tipo nulo sem razão → `"TIPO"`; sem sociedade → nulo; razão só com espaços → aviso; razão preenchida → nulo.
- `docx_pdf.test.ts` e `documentos.test.ts` (não existe `docx.test.ts`; é aí que o `criarDocx` é testado): o `header1.xml` com 4 parágrafos; o CNPJ com U+00A0 e `<w:noBreakHyphen/>`; a 1ª linha em `sz 22` com 150 letras; com logo e nome, o nome curto ao lado do logo, o `descr` igual ao nome curto e a razão social embaixo; `lerDocxParaPdf` lê `<w:noBreakHyphen/>` como "-" e o CNPJ sai inteiro; o preenchimento dos modelos do escritório não mudou com o `TOKENS` novo.
- Os testes antigos de `linhasTimbrado` passam a `linhasDoReciboAntigo`, com a mesma expectativa (prova de que o recibo antigo não mudou).

**Deno, `api-portal`**
- Arquivo novo `timbrado_docx_test.ts`, nos 6 escritórios do `timbrado_pdf_test.ts` (completa, sem-sociedade, razao-vazia, sem-advocacia, razao-longa, razao-longa-logo), cada um com e sem logo ligado:
  - a proposta e o contrato padrão saem com as 4 linhas no cabeçalho;
  - o PDF do contrato (`pdfDoDocx`) gera sem erro e com o CNPJ inteiro;
  - medir o alto do cabeçalho no PDF **em todos os casos**, e não só nos piores, e guardar o limite aprovado em D4; o corpo da 1ª página começa abaixo do fio vinho;
  - nenhum "[falta]" nem "confira" no `header1.xml`.
- `app_test.ts`: ajustar o AP-05 e o F3.16 e o mock (seção 4.4). Com a 1000: a proposta baixada por alguém da equipe com Comercial (não dona) num escritório sem sociedade sai com o nome completo e a OAB da dona.
- `timbrado_pdf_test.ts` continua passando sem mudança (prova de que carnê e recibo não mexeram).

**pgTAP** (só se a 1000 for aprovada)
- Número: **o primeiro livre na hora do commit**. Hoje o último é o 130, mas o 131 já está reservado pelo plano do sino (`131_sino_caso_pronto_fechar_test.sql`); se o sino entrar antes, este será o 132. Listar `sistema/supabase/tests/pgtap/` antes de criar (125 e 126 já têm dois arquivos cada, por colisão). Nome: `<n>_timbrado_proposta_recebimento_test.sql`.
- Casos:
  - `portal_proposta_timbrado` devolve o timbrado a quem tem Comercial e recusa quem não tem (`AREA_NAO_LIBERADA`);
  - `portal_recebimento` traz `timbrado` a quem tem Financeiro, a quem tem Contratos e à dona; **um membro sem área (só `escritorio.ver`) recebe `timbrado` nulo**;
  - sem sociedade, o `timbrado` tem o nome completo e a OAB principal da dona e não tem CPF, RG nem estado civil;
  - escritório de outra sessão não aparece;
  - `portal_proposta` não mudou (as mesmas chaves de antes);
  - o resto da resposta de `portal_recebimento` é igual ao de antes (comparar as chaves).

**E2E Playwright, em celular e computador, com axe** (`sistema/tests/e2e/`)
- `portal-escritorio-dados.spec.ts`: no editar, a prévia mostra as 4 linhas (sociedade, sem sociedade, endereço antigo); trocar o tipo troca a prévia.
- `portal-nao-paga-logo.spec.ts`: os nomes novos das figuras (seção 4.4).
- Spec novo `portal-razao-social-sobras.spec.ts`:
  - Marca e timbrado (dona e só para ler): a linha da identificação embaixo da marca; razão vazia (sem linha de nome); 150 letras; logo; sem sociedade visto por quem não recebe o nome da dona;
  - "Gerar carnê": razão em branco com tipo preenchido (texto da razão) e com tipo nulo (texto do tipo); a dona vê o link; quem não é dona vê o nome da dona; sem sociedade, nenhuma linha; razão preenchida, nenhuma linha;
  - "Registrar recebimento" com "Gerar o recibo" marcado e desmarcado (a linha some quando desmarca);
  - o carnê e o recibo gerados em seguida não têm "[falta]" nem a linha de aviso (o aviso é só da tela).
- axe sem violação em todas as telas acima; nenhuma rolagem lateral em 412 px; alvos de 44 px nos links.

Rodar antes do commit: `pnpm test`, `pnpm test:deno`, `pnpm test:db` (com a 1000), os e2e e o lint e os tipos do monorepo.

## 8. Painel e documentação

No mesmo commit do código:
- `docs/painel/dados/fases/F3/F3.146.json`: `status` "feito", `evidencia` com o desenho aprovado (D1 a D4, data e hora da Carol), a migration (se houver), os arquivos mudados e os números dos testes (Vitest, Deno, pgTAP, e2e com axe). **Apagar o campo `proximo`.** `refs` continua `["PA-07"]`.
- **Se a Carol escolher sem migration:** item novo pendente **F3.148** (o F3.147 já existe; usar o primeiro livre na hora), com `ordem` entre 1150 e 1180, citando PA-07, com o caso "sem sociedade, quem não é a dona, na proposta e na prévia de Marca e timbrado".
- Se algum aviso ficar para depois (por exemplo, na página do carnê e do recibo, pergunta 3), ele também vira item pendente citando PA-07.
- **Publicação:** item novo **P9** em `docs/painel/dados/publicacao/contas-e-ambiente/` (o P8 tem `ordem` 80; o P9 fica com 90), citando PA-07, com a ordem (migration, `api-portal`, Portal), o cuidado com a 0990 antes da 1000 e o teste à mão no escritório de demonstração (seção 5). A publicação não muda o status da ideia.
- **Commits separados:** se os passos 2 e 3 da seção 10 forem para commits próprios antes do desenho, cada um leva o painel: o F3.146 continua "pendente", com o `proximo` atualizado, e cada commit tem sua linha de histórico.
- Linha de histórico: `python3 docs/painel/painel.py novo-historico --inicio HH:MM --fim HH:MM --refs F3.146 PA-07 --texto "…"` (horário de Brasília).
- `python3 docs/painel/painel.py conferir` com 0 erro antes do commit.
- **`sistema/README.md`**, na seção do timbrado: a linha 661 ("`linhasTimbrado` (o .docx) continua com 3 linhas (F3.146)") e o "Falta:" da linha 665 são reescritos. Passam a dizer: o .docx com as 4 linhas (`timbradoDoDocx`) e a OAB de Dados do escritório; `linhasDoReciboAntigo` só para o recibo antigo; `razaoSocialEmBranco` e os dois avisos; a migration 1000 e as funções (`portal_proposta_timbrado`, o `timbrado` de `portal_recebimento`, com o público); e o `<w:noBreakHyphen/>` no leitor.

## 9. Riscos e casos de borda

- **Recibo antigo.** O maior risco é mudar `linhasTimbrado` no lugar e alterar recibos já emitidos. Por isso a troca de nome e o teste que prova que a saída antiga é igual.
- **O hífen do CNPJ no PDF.** U+2011 sumiria calado no PDF (`so()`), e `<w:noBreakHyphen/>` sumiria se o leitor não o conhecesse. Testar o PDF do contrato com o CNPJ.
- **Tamanho do cabeçalho do .docx.** O espaço que o cabeçalho tem é 30 − 12,5 = **17,5 mm** (`docx.ts:400`: `top=1701`, `header=709`). Com o espaço simples do Times (cerca de 1,15), na largura útil de 160 mm:
  - a 1ª linha de 13 pt dá cerca de 5,3 mm; três linhas de 9 pt, cerca de 11 mm; o filete com `w:space="6"`, cerca de 2,3 mm. São **cerca de 18,6 mm**: mesmo sem logo e com 4 linhas curtas, o Word já empurra o texto perto de 1 mm. Não é "como hoje";
  - com logo, hoje já passa (o logo sozinho tem até 18 mm);
  - 150 letras sem logo: a 1ª linha vai a 3 linhas (2 com 11 pt);
  - 150 letras com logo: o cabeçalho pode chegar a uns 45 a 50 mm, e cada página perde perto de 2 cm de texto.
  Por isso D4 mostra também o caso comum e decide a letra menor e, talvez, uma caixa de logo menor no .docx com razão longa, como o carnê fez (decisão 9). O teste mede todos os casos.
- **Sem sociedade.** Nunca o CPF. Sem a 1000, o caso "não é a dona" sai com o nome de exibição; com ela, a proposta sai certa e a prévia "só para ler" mostra a linha sem o nome para quem não tem Financeiro nem Contratos.
- **Sem sociedade e a dona sem nome completo ou OAB em Advogados nos documentos.** O papel sai com o nome de exibição e "sem CNPJ". Não há aviso nesta entrega (o F3.146 fala só da razão social). Fica anotado para a Carol.
- **Tipo nulo** (escritório migrado): avisa, com o texto próprio. Quando a dona marca "sem sociedade", o aviso some sozinho; se marca sociedade e não preenche a razão, o aviso passa ao texto da razão.
- **Razão social só com espaços ou igual ao nome curto**: só espaços avisa; igual ao nome curto não avisa (está preenchida), e o papel não repete o nome.
- **Endereço antigo com `confira`**: o cabeçalho leva o texto antigo, com cidade/UF e CEP quando houver, sem "confira". A marca continua no corpo do contrato.
- **Sem logo e sem "Advocacia" no nome**: no .docx, a 1ª linha é a razão social em negrito; não há "Advocacia" pequeno (isso é da marca em letra do carnê e do recibo).
- **OAB da marca diferente da de Dados do escritório** (dado antigo): o cabeçalho passa a usar a de Dados do escritório. Desde a 0860 as duas vêm de `oab_sociedade_frase`, então na prática são iguais; o teste garante.
- **Proposta baixada de novo** sai com o cabeçalho de hoje (seção 6).
- **Dois escritórios na mesma pessoa**: tudo continua vindo do escritório da sessão no servidor (`quem(c)`).

## 10. Ordem de execução

1. Mandar D1 a D4 para a especialista de frontend, com este plano e os aprovados citados. Levar o desenho e as perguntas da seção 11 à Carol.
2. Enquanto isso, sem depender do desenho: no domínio, trocar o nome de `linhasTimbrado` para `linhasDoReciboAntigo` (sem mudar a saída), criar `razaoSocialEmBranco` e ensinar o leitor (`lerParagrafo` e `TOKENS`) a ler `<w:noBreakHyphen/>`, com testes.
3. A prévia de Dados do escritório (já aprovada): `EscritorioDados.tsx` e o e2e.
4. Com D4 aprovado: `timbradoDoDocx`, `criarDocx` e `cabecalhoXml`; `documentos.ts` e `proposta_docx.ts`; o `timbrado_docx_test.ts` e os ajustes do `app_test.ts`.
5. Com a pergunta 1 respondida: a migration 1000 e o pgTAP com o primeiro número livre (ou o F3.148 pendente, sem ela).
6. Com D1 aprovado: `MarcaTimbrado.tsx`, `dadosTimbrado` em `Carne.tsx` e o `portal-nao-paga-logo.spec.ts`.
7. Com D2 e D3 aprovados: os avisos em `JanelaCarne` e `JanelaRegistrar`, e o spec e2e novo.
8. Rodar tudo (Vitest, Deno, pgTAP, e2e com axe, lint e tipos), copiar o desenho aprovado para `docs/design/aprovadas/<pasta>/`, atualizar o `sistema/README.md` e o painel (seção 8, com o P9) e fazer um commit com o código, a documentação e o painel. Se os passos 2 e 3 saírem antes, em commits próprios, cada um leva o painel.
9. Publicar só com o ok da Carol, pelo P9: migration (depois da 0990, se ela ainda não estiver aplicada), `api-portal`, Portal.

## 11. Perguntas para a Carol

1. **Pode entrar uma migration pequena (1000) para a proposta e a prévia de Marca e timbrado saírem certas no escritório sem sociedade?** Hoje, quando quem baixa a proposta não é a advogada dona, a proposta sai com o nome de exibição dela e sem a OAB. A migration dá o nome completo e a OAB principal da dona (o que já vai impresso no carnê e no recibo, e nunca CPF ou RG) a **dois públicos**:
   - **na proposta:** a quem tem a área **Comercial**, que hoje não recebe esse dado (a 0890 entrega só a quem tem Financeiro ou Contratos). Ele vai só para o arquivo .docx, e não para a tela da proposta;
   - **na prévia de Marca e timbrado:** a página abre para **toda a equipe**, inclusive a recepção. Recomendo entregar só a quem tem **Financeiro ou Contratos** (o mesmo público da 0890); para os outros, a prévia mostra a linha sem o nome.

   Recomendado: **sim, com esses dois públicos** (opção a). A outra opção (b) é entregar o nome e a OAB na prévia a toda a equipe. Sem migration, o caso fica anotado como pendente (F3.148).
2. **A prévia do recibo em Marca e timbrado também passa a mostrar a razão social e as 4 linhas, junto com a do carnê?** Recomendado: **sim**. As duas ficam lado a lado e hoje a do recibo mostra o nome curto no lugar da razão social, diferente do recibo que sai de verdade.
3. **O aviso de razão social em branco aparece só na hora de gerar (janela "Gerar carnê" e "Registrar recebimento"), e não na página do carnê e do recibo já gerados?** Recomendado: **só na hora de gerar**, quando ainda dá para completar antes. Na página de um carnê ou recibo já emitido, o aviso não ajuda: aquele papel não muda mais.
4. **No .docx com logo, o nome curto fica ao lado do logo (quando é "logo e nome") e a razão social vai embaixo, em vez de a razão social ir ao lado do logo como hoje?** Recomendado: **sim**, como o carnê e o recibo: a marca é a marca, e a razão social de até 150 letras não cabe ao lado do logo.
5. **Quem não é a sócia dona vê o aviso com o nome dela, sem um botão de "pedir"?** Recomendado: **sim, sem botão nesta entrega**. O pedido pelo sino, como o da chave Pix, pode vir depois, se a equipe sentir falta.

## 12. Resposta à revisão

Conferi no código cada ponto da `REVISAO.md` e concordo com todos. Nenhum ficou de fora.

| Ponto | O que conferi | Onde entrou |
|---|---|---|
| A1 · público da migration | `portal_recebimento` pede só `escritorio.ver` (`0601:137`); `portal_proposta` abre para Comercial | Função própria `portal_proposta_timbrado` em `plpgsql`; `timbrado` em `portal_recebimento` só para Financeiro, Contratos e a dona; pergunta 1 reescrita (seções 2, 4.2, 5 e 11) |
| A2 · número do pgTAP e a 0990 | O plano do sino reserva a 0990 e o pgTAP 131 | Primeiro número livre na hora do commit; faixa 1000-1009 no cabeçalho da migration; 0990 antes da 1000 (seções 5, 7 e 10) |
| M1 · `portal-nao-paga-logo.spec.ts` | Os nomes exatos nas linhas 258, 273 e 346 | Seções 4.3, 4.4 e 7 |
| M2 · motivo do hífen | `so()` tira o U+2011 calado (`documento_pdf.ts:18-19`); o PDF quebra só no espaço comum (`:55`); `TOKENS` é do preenchimento, o leitor do PDF é `lerParagrafo` | Seções 2, 4.1 e 9 |
| M3 · README | `README.md:661` e `:665` | Seção 8 |
| M4 · P9 e F3.148 | O F3.147 existe; o P8 tem `ordem` 80 | Seção 8 |
| M5 · conta do cabeçalho | 17,5 mm de espaço contra cerca de 18,6 mm de 4 linhas | Seções 3 (D4), 7 e 9 |
| M6 · aviso com tipo nulo | Escritório migrado pode ser sem sociedade | `razaoSocialEmBranco` devolve o motivo; dois textos; e2e dos dois (seções 2, 3, 4.1 e 7) |
| M7 · OAB do cabeçalho | As rotas usam `marca?.oab`; a decisão 28 põe a OAB em Dados do escritório | Seções 4.1, 4.2, 7 e 9 |
| Baixa | `Pedacos` exportado (`Recibo.tsx:26`) e `.cd-nw` existe (`portal.css:5138`); não há `docx.test.ts`; são 6 escritórios; o mock do `app_test.ts`; o `descr` do logo; a proposta baixada de novo | Seções 4.1, 4.3, 4.4, 6 e 7 |

Um detalhe meu, além da revisão: `razaoSocialEmBranco` passou a devolver o motivo (`"TIPO"` ou `"RAZAO"`), e não só verdadeiro ou falso, para os dois textos do aviso saírem de uma regra só.
