# F3.146 · Revisão do plano "O que sobrou da razão social"

> Revisão independente de `PLANO.md`, feita em 23/11/2026 sobre a `origin/main` (34a27aa, merge do PR #155). Conferi cada afirmação no código. Nada foi programado, nada foi para o commit e nada foi aplicado no Supabase.

## Veredito

**Aprovar com ajustes.** O plano está certo no essencial: achou o duplo papel de `linhasTimbrado` (o recibo antigo), viu que a proposta nem lê a razão social, viu o buraco da sócia dona sem sociedade e não programa tela sem desenho. Os ajustes abaixo não mudam a ordem de execução. Os mais importantes são três: o público da migration está descrito errado; o número do pgTAP já foi pego por outro plano; e um e2e que já existe vai quebrar.

## Problemas, por gravidade

### Alta

**A1. A migration 1000 entrega o nome completo e a OAB da sócia dona a mais gente do que o plano diz.**
- Evidência:
  - O plano (seção 5) diz: "O que se expõe é o mesmo que a 0890 já entrega a quem tem Financeiro ou Contratos". Não é.
  - `portal_recebimento` só pede `entrar_escritorio(..., 'escritorio.ver')` (`0601_marca_logo_oab.sql:137`). Ou seja, toda a equipe, sem área, inclusive a recepção.
  - `portal_proposta` (`0190_portal_comercial.sql:458`) abre para a área Comercial, que a 0890 não incluía. A resposta dela vai inteira para o navegador em toda ficha de proposta (`api-portal/app.ts:774`), embora só a rota do .docx precise do timbrado.
  - A 0860 (decisão 19 e `escritorio_documentos_json(x, e_socio_dono(...))`, `0860_escritorio_dados_documentos.sql:114`) guardou de propósito os dados da dona só para ela.
- Ajuste:
  - **Proposta:** não mexer na resposta de `portal_proposta`. Criar uma função só para a rota do .docx, por exemplo `portal_proposta_timbrado(p_pessoa, p_escritorio)`, `security definer`, com `entrar_area(..., 'COMERCIAL')` e `entrar_escritorio(..., 'propostas.ver')`, que devolve `escritorio_timbrado_json`. A rota já faz três chamadas e passa a fazer esta no lugar de `portal_escritorio`. Assim nada novo chega ao navegador e não é preciso provar que "o resto da resposta é igual".
  - **Marca e timbrado:** escolher com a Carol, dizendo o público verdadeiro.
    - (a) Pôr a chave `timbrado` em `portal_recebimento` só para quem tem Financeiro ou Contratos (o mesmo público da 0890). Para os outros, a prévia "só para ler" esconde o nome da linha da identificação quando `dona.dados` vier nulo.
    - (b) Entregar a toda a equipe, com isso escrito na pergunta 1.
    - Recomendo (a).
  - Reescrever a pergunta 1 da seção 11 com o público verdadeiro.
  - No pgTAP, testar que um membro sem área (só `escritorio.ver`) recebe ou não recebe o timbrado, conforme a escolha.
- O resto da migration está certo:
  - não cria tabela nem guarda dado novo, então nada muda em `inventario_dados`;
  - não tem CPF, RG nem estado civil (`escritorio_timbrado_json` só leva `nomeCompleto` e a OAB principal, `0890:46-54`);
  - fecha com `call fechar_acesso()`, e assim a `service_role` só executa as funções `security definer` (`0002_acesso.sql:149-154`).

**A2. O pgTAP 131 já está reservado.**
- Evidência: o plano `telas/portal-sino-caso-encerrado/PLANO.md` (linhas 167 e 180) reserva a migration `0990_sino_caso_pronto_fechar.sql` e o teste `131_sino_caso_pronto_fechar_test.sql`, e diz também que "o último é o 130". Os números repetidos 125 e 126 mostram que isso já aconteceu antes (`tests/pgtap/125_*`, `126_*`).
- Ajuste:
  - Usar o primeiro número livre na hora do commit (hoje seria o 132, se o sino entrar antes) e escrever isso no plano.
  - Sobre a migration: o número 1000 não colide com nada (nenhum arquivo nem plano usa 0960 a 1000, e o "1000" de `portal-tabelas` é largura em pixels). Mesmo assim, registrar a faixa reservada no cabeçalho, como fez a 0890 ("A faixa 0890-0899 é desta frente").
  - Na publicação, seguir a lição do P8: se a 0990 ainda não estiver no Supabase, aplicar antes dela, para o histórico seguir a ordem dos números (conferir com `list_migrations`).

### Média

**M1. O e2e `portal-nao-paga-logo.spec.ts` quebra com o novo `aria-label` e não está no plano.**
- Evidência: o spec procura as figuras pelo nome exato: "Prévia do alto do carnê, em cores, com o nome em letra" (linha 258), "Prévia do alto do recibo, em preto e branco, com o logo" (linha 273) e "Prévia do alto do carnê com o logo" (linha 346). Esses nomes vêm de `MarcaTimbrado.tsx:81` e `:334`, que o plano (seção 4.3) manda mudar.
- Ajuste: incluir esse spec na seção 4.4 ("Testes que já existem e mudam"). Lembrete: como o `role="img"` esconde o texto de dentro do leitor de tela, o `aria-label` precisa dizer a razão social (ou "a identificação do escritório"), e não só "com o logo".

**M2. A razão dada para não usar o U+2011 está errada, e o lugar da mudança no leitor está impreciso.** A conclusão (usar `<w:noBreakHyphen/>`) continua certa.
- Evidência:
  - `documento_pdf.ts:18-19` tira todo caractere fora do WinAnsi (`so()`) antes de desenhar. O U+2011 **não derruba** o PDF: o hífen some calado e o CNPJ sai "47.318.552/000106".
  - O PDF só quebra a linha no espaço ASCII (`trecho.split(/( +)/)`, `documento_pdf.ts:55`). Então o hífen comum nunca quebra no PDF, e o espaço inseparável fica dentro da "palavra" (depois vira espaço comum em `so()`). O `<w:noBreakHyphen/>` só importa no Word.
  - O `TOKENS` da linha 56 de `docx.ts` não é do leitor do PDF: é de `gruposDeTexto`, usado por `camposDoXml`, por `preencherDocx` (linha 97), pelo texto da linha 129 e pela busca de faltas (linha 211). O leitor do PDF é só o laço de `lerParagrafo` (`docx.ts:462`).
- Ajuste:
  - Mudar o laço da linha 462 (obrigatório).
  - Se mudar também o `TOKENS` (bom, para o texto lido nos testes e na conferência mostrar o hífen), tratar `<w:noBreakHyphen/>` como o `<w:tab/>`: peça com `inicio: -1`, que o preenchimento não troca. Rodar `documentos.test.ts` para provar que o preenchimento dos modelos do escritório não mudou.
  - Corrigir a frase das seções 2 e 9.

**M3. Falta atualizar o `sistema/README.md`.**
- Evidência: `README.md:661` diz "`linhasTimbrado` (o .docx) continua com 3 linhas (F3.146)" e `README.md:665` traz o "Falta:" do F3.146.
- Ajuste: no mesmo commit, reescrever essas linhas. Elas devem dizer: o .docx com as 4 linhas; `linhasDoReciboAntigo` só para o recibo antigo; `razaoSocialEmBranco`; a migration e a função nova; e o `<w:noBreakHyphen/>` no leitor.

**M4. Painel: falta o item de publicação e o próximo id livre.**
- Evidência: a seção 8 diz que a publicação "fica nos itens de publicação", mas não cria nenhum. O P8 (`docs/painel/dados/publicacao/contas-e-ambiente/P8.json`) foi criado com a ordem e as condições. O F3.147 já existe, então o próximo id livre de item é o F3.148 (o plano fala em "F3.1xx").
- Ajuste:
  - Criar o P9 em `publicacao/contas-e-ambiente/`, citando PA-07, com: a ordem (migration, `api-portal`, Portal), o cuidado com o histórico das migrations (A2) e o teste à mão (baixar uma proposta e gerar um contrato padrão no escritório de demonstração).
  - Se a Carol escolher sem migration, o item pendente é o F3.148 (ou o primeiro livre), com `ordem` entre 1150 e 1180.
  - Se os passos 2 e 3 da seção 10 forem para commits separados, cada commit leva o painel. Nesse caso, o F3.146 segue "pendente", com o `proximo` atualizado.

**M5. A conta do tamanho do cabeçalho otimiza o caso comum.**
- Evidência: o espaço do cabeçalho é 30 − 12,5 = 17,5 mm (`docx.ts:400`: `top=1701`, `header=709`). Com espaço simples do Times (≈1,15):
  - 13 pt dá ≈5,3 mm;
  - três linhas de 9 pt dão ≈11 mm;
  - o filete com `w:space="6"` dá ≈2,3 mm.

  São ≈18,6 mm. Até sem logo, com 4 linhas curtas, o Word já empurra o texto ≈1 mm. Não é "como hoje". Com logo, hoje já passa (18 mm só do logo).
- Ajuste: tirar o "cabe como hoje". Pedir que o D4 mostre o cabeçalho sem logo com 4 linhas também, e que o `timbrado_docx_test.ts` meça o alto do cabeçalho no PDF em todos os casos, não só nos piores.

**M6. O aviso para escritório migrado (tipo nulo) pode mandar a pessoa ao lugar errado.**
- Evidência: o plano trata tipo nulo como "razão em branco". Mas um escritório migrado pode ser de advogada sem sociedade. O texto sugerido ("a razão social do escritório está em branco") a faria procurar uma razão social que não existe.
- Ajuste: no pedido do D2 e do D3, um texto para o tipo nulo, por exemplo: "…ainda não diz se é sociedade nem tem a razão social". Ou só: "os dados do escritório estão incompletos". Teste e2e dos dois textos.

**M7. A OAB no cabeçalho: de onde vem?**
- Evidência: hoje as duas rotas passam `oab: marca?.oab ?? e.oab` (`documentos.ts:102`, `proposta_docx.ts:40`). O plano não diz se `timbradoDoDocx` mantém isso. Pela decisão 28 de `escritorio-dados-documentos`, o registro só se muda em Dados do escritório.
- Ajuste: usar a OAB do escritório (`oab_sociedade_frase`, que já vem em `documentos` e no timbrado) e escrever isso. Um teste prova que a OAB do cabeçalho é a de Dados do escritório.

### Baixa

- **Envoltório em `language sql`.** `escritorio_timbrado_json` lê `pessoa_dados_json`, que depende do `app.escritorio_id` posto por `entrar_*` (`0010_escritorios_vinculos.sql:210`). Num envoltório `language sql`, como `portal_carne_opcoes` da 0890, a ordem de avaliação de `a || b` não é garantida. Na função nova, usar `plpgsql`: primeiro conferir o acesso, depois montar o timbrado.
- **`Pedacos` já é exportado** de `Recibo.tsx:26`, e a classe `.cd-nw` já existe (`portal.css:5138`, e é a que o desenho aprovado usa no `ed-tim`). Basta importar: não precisa de arquivo comum nem de CSS novo.
- **Não existe `docx.test.ts`.** O `criarDocx` é testado em `documentos.test.ts`, `docx_pdf.test.ts` e `peticoes.test.ts`. Pôr os casos novos do cabeçalho em `docx_pdf.test.ts` ou em `documentos.test.ts`.
- **"Os 6 escritórios do `timbrado_pdf_test.ts`".** São 6 mesmo (completa, sem-sociedade, razao-vazia, sem-advocacia, razao-longa, razao-longa-logo), mas a lista do plano tem 7 nomes. "logo" é a marca ligada, não um escritório.
- **Mock do `app_test.ts`.** Com a função nova (ou com `documentos`), o mock do banco (perto da linha 268) precisa da chamada nova. Senão o AP-05 (linha 1473) quebra antes da asserção do `header1.xml` (linha 1496).
- **Proposta baixada de novo.** O plano registra a exceção ao PT-03 (`propostas/<id>-v<versao>.docx` é sobrescrito a cada "Baixar"). Vale dizer isso à Carol na entrega: uma proposta já mandada ao cliente, baixada de novo, sai com outro cabeçalho.
- **Texto alternativo do logo no .docx.** Hoje é a 1ª linha, ou seja, a razão social (`logoXml(logo, l)`, `docx.ts:361`). O plano passa o nome curto ao `LogoDocx`: o `descr` também deve passar a ser o nome curto, como no carnê (decisão 3).

## Conferência das afirmações do plano

| Afirmação | Situação | Onde |
|---|---|---|
| `linhasTimbrado` monta o .docx, a prévia de Dados e o recibo antigo com `slice(1)` | Certa | `Recibo.tsx:51`, `recibo_pdf.ts:136`, `documentos.ts:102`, `proposta_docx.ts:40`, `EscritorioDados.tsx:535` |
| A proposta não lê a razão social | Certa: o nível de cima de `portal_escritorio` não tem `razaoSocial` nem `tipo` | `0601:392-394`, `0721:109`, `0860:110-114` |
| Sem sociedade, `dona.dados` e `dona.inscricoes` só chegam à dona | Certa | `0860:86-89,114` |
| Documentos usam `p_com_dona = true`; carnê e recibo usam `escritorio_timbrado_json` | Certa | `0860:342`, `0890:30-55` |
| `MiniRecibo` mostra o nome curto, junta "CNPJ · OAB" e usa o endereço antigo | Certa | `MarcaTimbrado.tsx:82`, `Carne.tsx:1025-1029` |
| `.lg-doc` tem 9 px | Certa | `portal.css:4348` |
| U+2011 "derrubaria" o PDF | Errada no motivo (M2) | `documento_pdf.ts:18-19` |
| `TOKENS` da linha 56 é do leitor do PDF | Imprecisa (M2) | `docx.ts:56-84`, `:462` |
| "Gerar carnê" recebe `timbrado` com `tipo` e `razaoSocial`; `o.socioDono` e `o.dono` existem | Certa | `0890:89-97`, `Carne.tsx:753,787,849` |
| `JanelaRegistrar` recebe só `whatsapp` e abre em dois lugares | Certa | `Financeiro.tsx:306,343,1210` |
| Prévia de Dados aprovada com 4 linhas no `ed-tim` | Certa | `docs/design/aprovadas/escritorio-dados-documentos/escritorio.html` |
| Só um caminho grava cópia de recibo | Certa | `0533_recibo_pdf.sql:117` |
| O último pgTAP é o 130; 125 e 126 têm dois arquivos | Certa, mas o 131 está reservado (A2) | `tests/pgtap/` |
| A migration é mesmo necessária para o caso "sem sociedade, quem não é a dona" | Certa: nenhuma função `security definer` atual dá o nome completo da dona à área Comercial sem um contrato (`portal_carne_opcoes` e `portal_documento_dados` pedem contrato) | — |

## Documentos já emitidos

O plano mantém tudo igual, e conferi:
- **Recibo antigo** (sem `comTimbrado`): o corpo da função antiga não muda, só o nome.
- **Carnê e recibo novos:** já guardam o timbrado do dia (gatilhos da 0890).
- **Contratos gerados:** ficam guardados como .docx. O leitor novo só muda o que tem `<w:noBreakHyphen/>`, que nenhum .docx antigo tem. O U+00A0 já era lido igual.
- **Única exceção:** a proposta, que é montada de novo a cada "Baixar" (já anotada).

## O que está bom

- **A troca de nome de `linhasTimbrado`.** Trocar o nome, e não só pôr um comentário, protege o PT-03, e o teste da saída antiga prova isso.
- **O espaço inseparável e o `<w:noBreakHyphen/>`.** Escolher os dois no lugar do U+2011 é a escolha certa para o Word e para o PDF.
- **`razaoSocialEmBranco` como regra única do aviso**, com tipo nulo, só espaços e sem sociedade testados.
- **O desenho antes do código, como manda o `CLAUDE.md`:**
  - D1 a D4 separados, com os aprovados de base;
  - a prévia de Dados do escritório programada sem novo desenho, porque já foi aprovada com 4 linhas;
  - o cabeçalho do .docx com logo e com 150 letras levado ao desenho.
- **O papel do cliente** continua sem "[falta]" e sem "confira". As marcas ficam no corpo do contrato, como na decisão 7.
- **O escritório vem sempre da sessão** (`quem(c)`). Não há tabela nova, então não há `escritorio_id` nem `proteger_tabela_escritorio` a acrescentar.
- **A ordem de publicação** (migration, `api-portal`, Portal), com o Portal funcionando sem a migration (cai em `escritorio.documentos`).
- **As perguntas à Carol** têm recomendação clara. A pergunta 2 (`MiniRecibo`) tem bom motivo: as duas prévias ficam lado a lado.
- **O painel:** apaga o `proximo`, deixa `refs` com PA-07 e cria item pendente se algo ficar para depois.
