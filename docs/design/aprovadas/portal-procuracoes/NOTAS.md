# Contratos: Procurações e modelos (2ª rodada) · notas

> **Aprovado pela Carol em 21/11/2026, às 19h37 (Bahia)**, com as 5 recomendações do fim, que valem como decisões.

> **Hipótese a validar (CH-08 é [VAL]).** Este desenho é para conversar com os escritórios piloto antes de virar código: se usam, com quais modelos, se os campos bastam e se o caminho de anexar o assinado serve. Até lá, nada aqui muda o status da ideia.

A segunda rodada da seção Procurações e modelos da área Contratos do Portal do advogado (item F3.16 do painel), para a Carol aprovar antes de programar. Ela substitui, na aba Documentos da ficha do contrato, o texto de hoje “Os documentos chegam numa próxima entrega” (`FichaContrato.tsx`, função `Documentos`).

Parte de dois desenhos aprovados, sem contradizê-los:

- **A 1ª rodada desta seção** (`docs/design/aprovadas/portal-comercial-contratos`, decisões 17, 19, 24, 25 e 26): documentos gerados com a situação da assinatura, três modelos (contrato, procuração e declaração), outorgados só com OAB, página única de gerar com prévia em papel timbrado, dado faltando que avisa e não bloqueia, um .docx por documento e assinatura eletrônica só com lugar reservado.
- **O gerador de petições** (`docs/design/aprovadas/portal-peticoes`, aprovado e programado), o primo mais próximo: modelos .docx com campos entre colchetes, padrão T3jus x do escritório, versões guardadas, janela Enviar modelo com conferência na chegada, lista de campos aceitos, prévia com 3 marcas, resultado com Baixar recebendo o foco.

Atende CH-08 (em parte, veja “Para o painel”). Pesam também AP-01 (a qualificação vem do cadastro), EX-01 (o contrato liga os casos), EX-12 e a Equipe · OAB (todas as inscrições, a principal primeiro), PT-03 (versões e assinados guardados, nada apagado), PT-07 (arquivos privados, tipo e tamanho conferidos), PT-10 (WCAG 2.2 AA, celular, vazio e erro), PT-11 (finalidade dos dados novos do representante) e PA-01 e PA-02 (a área só aparece para quem a sócia dona liberou). CH-09 continua só com lugar reservado.

**Não há IA escrevendo documento.** É preenchimento de modelo: o texto é do escritório (ou o padrão do T3jus), e o T3jus só troca os campos entre colchetes.

## Como abrir

- `index.html` mostra os 17 estados em computador (1440) e celular (412), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- `procuracoes.html` abre sozinho, com as fontes, o CSS e os ícones embutidos. O estado vem do endereço, por exemplo `procuracoes.html?estado=gerar`, `?estado=gerar-pj`, `?estado=anexar` ou `?estado=ficha-documentos`. No celular, `&mais=1` abre a folha Mais.
- Abaixo de 760 px, o HTML vira a versão de celular. Funcionam as janelas (Enviar modelo e Anexar os assinados), o Esc, o Mais e as abas da prévia (clique e setas). Os links levam ao estado seguinte; os de Contratos, Honorários e da aba Contrato levam à 1ª rodada aprovada, na pasta vizinha `../portal-comercial-contratos/`. O resto é desenho.
- `publicar.html` é o `index.html` com as capturas embutidas, numa página só (9,0 MB, abaixo de 16 MB; as capturas são recomprimidas só para ela). Os cliques nas imagens abrem o `procuracoes.html`.
- A pasta `_fonte/` guarda os scripts, e `sh _fonte/gerar.sh <pasta>` refaz tudo (precisa do `@axe-core/playwright` ao lado ou da variável `AXE_DIR`, e do `playwright` no `NODE_PATH`):
  - `comum.py`, `pecas.py` e `contratos.py` são cópias sem mudança do Contratos aprovado;
  - `peticoes_css.txt` é o `CSS_PE` do `peticoes.py` aprovado, copiado sem mudança (prévia em papel, conferência, campos, advogados e inscrições);
  - `procuracoes.py` carrega as definições do `contratos.py` (sem gerar o `contratos.html`) e acrescenta as peças novas, com o prefixo `pr-`;
  - `casos.py` gera a lista de estados e o `index.html`; `fotos.cjs` (o das petições) faz as capturas com deviceScaleFactor 2 e roda as conferências; `webp.py` converte; `publicar.py` monta o `publicar.html`.
- Os dados são fictícios e seguem o elenco aprovado: Marina Ribeiro (sócia dona, OAB/SP), Felipe Matos (OAB/SP e OAB/RJ suplementar), Larissa Costa (só Jurídico, OAB/SP), Gustavo Lima e Diego Almeida (sem OAB), Paula Nunes (sem áreas); clientes Benedito Souza Lima, Antônia Ferreira Prado e Farmácia Bom Jesus Ltda. **Entra um cliente novo no elenco: Pedro Henrique Alves Souza, 12 anos, representado pela mãe, Joana Alves Souza**, para o caso do menor. CPFs com dígitos válidos; CNPJ e OAB inventados. “Hoje” é 21/11/2026.

## Decisões de design

### Lista e modelos

1. **Procurações e modelos continua uma seção da barra de Contratos** (`/contratos/modelos`, já em `areas.ts`). Os modelos ganham uma página própria dentro dela (Contratos › Procurações e modelos › Modelos de documento), como os modelos de petição dentro de Petições. Na 1ª rodada eles estavam na mesma página que a lista; com versões, campos aceitos e envio, a página ficaria longa demais.
2. **O que falta anexar vem em destaque.**
   - Filtro pela situação da assinatura: Todos, Falta anexar o assinado e Assinados, com a contagem;
   - o aviso no alto diz quantos esperam o assinado e o que isso trava (“o contrato de Benedito só fica ativo, e a programação só vai ao Financeiro, quando o contrato assinado for anexado”), com “Anexar os de Benedito”;
   - as linhas que esperam vêm primeiro, com filete âmbar à esquerda e o selo “Falta anexar o assinado” com ícone. No contrato, a linha diz também “O assinado ativa o contrato”;
   - cada linha: documento com a versão (v1, v2), arquivo, quem gerou e quando, o selo “1 dado marcado” quando saiu algum [RG: falta], cliente e contrato (link), assinatura e as ações “Anexar o assinado” e “Baixar”.
3. **A lista ocupa a largura toda.** Na 1ª rodada, com a lateral ao lado, a tabela ficava apertada: o selo quebrava em quatro linhas e o Baixar era cortado (veja a captura aprovada `procuracoes-computador.webp`). Agora “Gerado por” entra na célula do documento e os três quadros de apoio (Modelos, Advogados nos documentos e Assinatura) descem para uma fileira embaixo.
4. **Primeiro uso:** dois passos, conferir os modelos (já vêm os três padrão do T3jus) e gerar a partir de um contrato, que pode estar em elaboração.
5. **Modelos de documento:**
   - os três documentos, cada um com o selo “Do escritório” ou “Padrão T3jus”, a versão, quem enviou, quantos campos usa e quantas vezes foi usado, com Baixar e Trocar (no padrão, “Usar o do escritório”);
   - as versões anteriores ficam numa lista que abre (“Versões anteriores (1)”), cada uma com Baixar e a frase “9 documentos gerados com ela continuam como estavam”;
   - a declaração de hipossuficiência padrão tem duas versões de texto: pessoa física e pessoa jurídica. O T3jus escolhe pelo tipo do cliente;
   - um lugar tracejado para **outros documentos do escritório** (substabelecimento, declaração de residência), que depende da pergunta 1;
   - ao lado, os **campos aceitos** por grupo (Cliente; Contrato e honorários; Advogados e poderes; Escritório e data), cada um com o que entra. Os nomes são os mesmos das petições quando o dado é o mesmo (veja “Campos”).
6. **Enviar modelo (janela)**, igual à das petições:
   - só .docx, até 5 MB; escolhe o documento (contrato, procuração, declaração ou outro), o nome e qual modelo substitui;
   - **a conferência acontece quando o arquivo chega.** Campo desconhecido avisa, diz o que acontece (sai como está, para completar no Word) e sugere o certo; **não bloqueia salvar**. No desenho, `[QUALIFICACAO_CLIENTE]`, o nome que a 1ª rodada usou no texto da tela, sugere `[CLIENTE_QUALIFICACAO]`, o nome que o código das petições já usa;
   - novidade: a conferência também avisa quando falta um campo que aquele documento costuma ter. Na procuração, sem `[PODERES_ESPECIAIS]`, os poderes marcados na hora não entram; no contrato, sem `[HONORARIOS_CONDICOES]`, as condições não entram. Também não bloqueia, porque o escritório pode ter o texto escrito;
   - PDF, .doc antigo e .docm (com macro) **bloqueiam**, com o erro preso ao arquivo e a saída escrita (“Arquivo › Salvar como › Documento do Word (.docx)”). O modelo atual continua valendo.

### Gerar

7. **Página única, sem passos**, como a aprovada. De cima para baixo: contrato, quem assina pelo cliente (quando é empresa, menor ou incapaz), documentos, advogados outorgados, poderes especiais, outro poder e cidade e data. Ao lado, a prévia. Embaixo, uma faixa com o que vai sair e o botão.
   - No celular, a ordem é formulário, prévia e só então a faixa com o botão, para ninguém gerar sem ver a prévia (a mesma ideia do resumo do contrato, decisão 15 dos Contratos).
8. **O contrato vem escolhido quando se começa pela ficha do contrato** (“Veio da ficha do contrato. As condições, os advogados e as inscrições já estão lá.”), com Trocar contrato. Começando por Procurações, a primeira tela pede o contrato: os em elaboração sem documentos vêm primeiro, depois os ativos. Cliente sem contrato: o link leva a criar o contrato em elaboração (pergunta 4).
9. **Documentos:** três caixas, cada uma com o que leva e de qual modelo vem (“Modelo do escritório, v2”, “Padrão T3jus”). Num contrato já assinado, o contrato de honorários vem desmarcado, com “Já assinado em 02/09/2026. Gere de novo só se o contrato mudou.”
10. **Advogados outorgados:**
    - vêm marcados os advogados do contrato, com as inscrições que o contrato já guarda (`contrato_advogado_oab`, migration 0530). Cada um entra com todas as inscrições, a principal primeiro; quem tem mais de uma vê uma caixa para cada (Felipe: OAB/SP e OAB/RJ suplementar);
    - quem tem OAB e não está no contrato aparece desmarcado (“Não está no contrato”) e pode ser incluído só nestes documentos. **Mudar aqui não muda o contrato;**
    - quem não tem OAB na Equipe não aparece, e a ajuda diz quem são;
    - a faixa âmbar “No documento:” mostra a frase como vai sair, enquanto a pessoa marca (`aria-live`).
11. **Poderes especiais:** a lista do art. 105 do CPC (receber e dar quitação, firmar acordo, substabelecer, desistir, renunciar, reconhecer a procedência, receber citação, confessar, firmar compromisso, assinar declaração de hipossuficiência) em duas colunas, com a frase de que os poderes gerais já estão no modelo. “Outro poder” é texto livre e opcional, escrito como deve sair (no desenho, “representar perante o INSS e ter vista de processos administrativos”). A marcação inicial é a da última geração do escritório.
12. **Prévia com uma aba por documento** (Contrato, Procuração, Declaração), em papel timbrado, com as três marcas que não dependem só da cor: dado do cadastro e do contrato (traço embaixo), desta tela (pontilhado) e o que falta (caixa com a palavra “falta”). A aba mostra quantos dados faltam naquele documento ou “não marcado”. A prévia do contrato mostra as condições de honorário entrando na cláusula 3, com o valor em reais e centavos e por extenso. As abas são `tablist` de verdade (setas, Home e End).
13. **O que bloqueia e o que gera com marcador**, a mesma regra das petições:
    - **dado faltando avisa e não bloqueia:** o aviso no alto (“Falta 1 dado de Benedito: o RG”) com “Completar na ficha”, a marca na prévia, a contagem na aba e a frase na faixa do botão (“1 dado sai marcado em cada um”);
    - **só bloqueiam nenhum documento e nenhum outorgado.** O resumo de erros no topo diz que nada foi gerado, lista os pontos com links para os campos e diz que o que foi escolhido continua ali. Cada erro fica preso ao grupo (`aria-invalid` e `aria-describedby`). O botão nunca fica desabilitado.
14. **Cliente pessoa jurídica** (Farmácia Bom Jesus Ltda.):
    - um quadro “Quem assina pela empresa” mostra o representante do cadastro (nome, cargo e CPF, já existentes em Clientes: `rep_nome`, `rep_cargo`, `rep_documento`, `rep_estado_civil`, `rep_profissao`), com “Mudar na ficha”;
    - a procuração e o contrato saem com “neste ato representada por sua sócia-administradora…”, e a assinatura sai em nome da empresa, por quem a representa;
    - **a declaração de hipossuficiência avisa e não bloqueia:** “Para a empresa, a declaração sozinha não basta. O juiz pede prova… (Súmula 481 do STJ). Sai a versão para pessoa jurídica, que diz que a prova vai junto.” A faixa do botão lembra de juntar a prova (pergunta 5).
15. **Cliente menor ou incapaz** (Pedro, 12 anos):
    - o quadro “Quem assina por Pedro” mostra o representante legal do cadastro (a mãe);
    - o aviso explica a regra em português simples: até 15 anos, representado (só a mãe assina); de 16 a 17, assistido (assinam os dois); adulto sob curatela, assina o curador, com o termo junto;
    - a qualificação sai “menor impúbere, nascido em…, neste ato representado por sua mãe, …”, e a assinatura, “representado por Joana Alves Souza”. O T3jus calcula representado ou assistido pela data de nascimento no dia da geração;
    - precisa de dado novo em Clientes (veja “Servidor”). Até ele existir, o menor sai com `[REPRESENTANTE: falta]`.

### Resultado, assinados e versões

16. **Resultado:**
    - um .docx por documento, com Baixar, e **“Baixar todos (.zip)”, que recebe o foco** ao chegar na página;
    - o dado que saiu marcado, com Completar na ficha;
    - “Você revisa antes de imprimir. O T3jus não confere o conteúdo jurídico.”;
    - os próximos passos numerados: revisar no Word, imprimir no timbrado, colher as assinaturas e anexar os assinados, com a frase de que o contrato assinado ativa o contrato. O botão “Anexar os assinados” leva à janela;
    - a assinatura eletrônica (CH-09) num quadro tracejado, só com o lugar reservado;
    - ao lado, **“O que foi usado”**: contrato, modelos e versões, outorgados com as inscrições, poderes, cidade e data e o que saiu marcado. Fica guardado como estava no dia, mesmo que a Equipe ou a ficha mudem depois (PT-03).
17. **Anexar os assinados (janela)**, aberta da lista, do resultado ou da ficha:
    - um bloco por documento, com o arquivo (PDF ou foto, até 10 MB; várias páginas num PDF só ou até 10 fotos) e a data da assinatura (dd/mm/aaaa, não pode ser depois de hoje);
    - **o bloco do contrato tem filete vinho e diz, antes de anexar:** “Anexar o contrato assinado registra a assinatura. O contrato C-2026-033 fica ativo e a programação dos recebimentos vai ao Financeiro: 3 parcelas de R$ 2.000,00 (2 de R$ 666,67 e 1 de R$ 666,66), a primeira em 10/12/2026. É o mesmo que ‘Registrar assinatura’, na aba Contrato.” É a decisão 19 dos Contratos: **é a mesma ação e a mesma rota** (`POST /v1/contratos/:id/assinatura`), não um caminho paralelo;
    - procuração e declaração dizem que só ficam guardadas e não mudam a situação do contrato. O que não foi assinado pode ficar em branco;
    - o botão diz o que acontece: “Anexar e ativar o contrato” (sem o contrato, “Anexar”);
    - **erros:** o .docx gerado no lugar do assinado (“Este arquivo é o .docx gerado, não o assinado. Anexe o PDF ou a foto do papel assinado.”) e a data depois de hoje. Resumo no topo com links, erro preso ao campo, “Nada foi anexado… O contrato continua em elaboração.”
18. **Contrato ativo:** depois de anexar, a ficha mostra o selo Ativo, o âmbar passa ao próximo recebimento (10/12 · R$ 666,67, parcela 1 de 3) e cada documento traz “Baixar o assinado” e “Baixar o .docx”. O aviso confirma que a programação foi ao Financeiro.
19. **Gerar de novo:**
    - o botão fica na aba Documentos; a página de gerar abre com as mesmas escolhas da última vez;
    - o aviso no alto diz quando foi a versão anterior, **o que mudou desde então** (“o RG, completado por Diego Almeida às 15h52”) e que a versão anterior fica guardada. O botão vira “Gerar a versão 2”;
    - se algum documento da versão anterior já tem o assinado anexado, o aviso diz isso e a caixa daquele documento vem desmarcada: o assinado continua valendo, e gerar de novo só faz sentido se o documento mudou;
    - cada documento guarda as versões (v1, v2), cada uma com o arquivo e o que saiu marcado. O assinado fica ligado à versão que foi assinada.
20. **Aba Documentos da ficha do contrato** (no lugar do “sendo preparado”):
    - o âmbar do cabeçalho mostra o próximo passo (“Os 3 documentos esperam o assinado”) com “Anexar os assinados”;
    - os documentos do contrato, cada um com a versão, quem gerou, a situação da assinatura, Anexar o assinado e Baixar, e a versão anterior numa lista que abre;
    - “Gerar de novo” no alto da folha;
    - ao lado, o quadro Assinatura com a regra (anexar o contrato é registrar a assinatura) e o lugar da assinatura eletrônica, e os advogados do contrato com as inscrições.
    - A janela de “Registrar assinatura” que já existe na aba Contrato continua; ela passa a ser a mesma janela, só com o bloco do contrato.

### Quem vê

21. **Quem tem a área Contratos** gera, anexa e troca modelos. Quem não tem (Larissa, só Jurídico) não vê Contratos no menu nem no Mais; pelo link direto vê “Esta área não está liberada para você”, com quem libera, e o servidor responde `AREA_NAO_LIBERADA` (texto aprovado em D5: “Esta área não está liberada para você. Peça à sócia dona para liberar.”).
22. **Sem revisão pelo responsável nesta versão** (pergunta 2). Quem gera fica no histórico.
23. **Celular:** Contratos mora no Mais, que fica marcado como atual; a tabela vira cartões com o rótulo de cada coluna; as ações ficam largas; a lateral desce; a prévia vem antes do botão; as abas da prévia quebram linha em vez de rolar de lado.

## Campos aceitos

Os nomes conversam com os de `CAMPOS_PETICAO` (`packages/domain/src/peticoes.ts`) e usam a mesma conferência de `docx.ts` (`CAMPO_DOCX`, `MARCA_FALTA`) e o mesmo `falta()`.

| Campo | Situação |
|---|---|
| `[CLIENTE_NOME]`, `[CLIENTE_QUALIFICACAO]`, `[CLIENTE_CPF]`, `[CLIENTE_RG]`, `[CLIENTE_ENDERECO]` | **Já existem** nas petições, com o mesmo texto (`qualificacaoDoCliente`, que já trata PJ com o representante). Aqui o “cliente” é o do contrato, não o primeiro cliente do caso |
| `[ADVOGADOS_OAB]`, `[ADVOGADOS_ASSINATURA]` | **Já existem**; aqui usam os outorgados e as inscrições marcadas |
| `[ESCRITORIO_NOME]`, `[ESCRITORIO_ENDERECO]`, `[CIDADE_DATA]` | **Já existem** |
| `[REPRESENTANTE_NOME]`, `[REPRESENTANTE_QUALIFICACAO]` | **Novos.** Quem assina pela empresa (dados que Clientes já tem) ou pelo menor ou incapaz (dado novo). `[CLIENTE_QUALIFICACAO]` passa a incluir o representante do menor também |
| `[CLIENTE_ASSINATURA]` | **Novo.** O bloco de assinatura do cliente, com o representante quando houver |
| `[CONTRATO_NUMERO]`, `[CONTRATO_OBJETO]`, `[CONTRATO_CASOS]` | **Novos.** Do contrato e dos casos ligados (com o número CNJ quando houver) |
| `[HONORARIOS_CONDICOES]` | **Novo.** Cada condição numa alínea, a partir de `leituraCondicao` (`honorarios.ts`, já usada na proposta em .docx), com o valor por extenso (`valorPorExtenso` das petições) |
| `[PODERES_ESPECIAIS]` | **Novo.** O trecho inteiro “e os poderes especiais para …”; sem poder marcado, sai vazio, para a frase não ficar quebrada |
| `[ESCRITORIO_CNPJ]`, `[ESCRITORIO_OAB]` | **Novos como campo**; o dado já existe no timbrado (`linhasTimbrado`, F3.19) |

Os campos só de petição (`[PARTES_QUALIFICACAO]`, `[NUMERO_PROCESSO]`, `[VARA]`, `[TRIBUNAL]`, `[SISTEMA]`, `[PARTE_CONTRARIA]`, `[PARTE_CONTRARIA_QUALIFICACAO]`, `[VALOR_CAUSA]`, `[VALOR_CAUSA_EXTENSO]`, `[ENDERECAMENTO]`) entram na conferência como desconhecidos nestes modelos, com a dica “este campo é das petições”.

## Acessibilidade (WCAG 2.2 AA)

- **Conferência automática** em 34 capturas (17 estados × computador e celular), feita pelo `fotos.cjs`. O resultado fica em `_conferencia.json`:
  - o axe (WCAG 2.0, 2.1 e 2.2, A e AA) não achou nenhuma violação;
  - nenhuma tela tem rolagem lateral;
  - nenhum erro de script.
- **Alvos:** no celular, todos têm 44 px ou mais. No computador, os botões compactos (Baixar, Trocar, Anexar o assinado) têm 36 px, como no aprovado. A única exceção é a palavra-marca “T3jus” da moldura aprovada (24 px), já registrada em Clientes.
- **Formulários:** cada campo tem `label`; documentos, outorgados, inscrições, poderes e cada documento da janela de anexar ficam em `fieldset` com `legend`; os erros usam `aria-invalid` e `aria-describedby`, com resumo no topo e links para os campos. A linha “No documento:” é `aria-live="polite"`. A data usa `inputmode="numeric"`.
- **Arquivo:** o seletor de arquivo é um grupo nomeado (“Contrato assinado”) com o nome, o tipo e o tamanho do arquivo escolhido e um botão que diz o que troca (“Trocar arquivo: contrato assinado”), sem o texto em inglês do seletor do navegador.
- **Prévia:** `tablist` com `aria-selected`, `aria-controls` e setas; as marcas usam traço, pontilhado ou caixa com a palavra “falta”, não só cor; uma frase só para leitor de tela explica a legenda.
- **Tabela:** os botões de cada linha dizem de qual documento são (“Anexar o assinado: o contrato de Benedito”); o selo “1 dado marcado” diz “para completar” ao leitor de tela. No celular, a tabela vira cartões com o rótulo de cada coluna, sem duplicar o HTML.
- **Janelas:** `<dialog>` com `showModal()`, Esc fecha, o foco começa no primeiro campo ou no campo com erro.
- **Foco no resultado:** ao chegar, o foco vai para “Baixar todos (.zip)”.
- **Contraste:** só pares do D2 e do conceito Gabinete. O filete das linhas que esperam é âmbar, só decorativo (o selo escrito e o ícone dizem a situação); o filete do bloco do contrato na janela é vinho.

## O que precisa de dado novo no servidor

Todas as tabelas têm `escritorio_id` e passam por `proteger_tabela_escritorio`. O escritório vem sempre da sessão no servidor, nunca do navegador. Os arquivos (modelos, .docx gerados e assinados) ficam no bucket privado `documentos-portal`, abertos só por link temporário, com tipo e tamanho conferidos no Storage (PT-07); o nome que a pessoa dá não define o caminho. Nada se apaga (PT-03).

### O que reaproveita

- **Das petições:** `docx.ts` (conferência do arquivo, campos quebrados pelo Word, preenchimento mantendo a formatação, `.docx` simples para os modelos padrão), `zip.ts` (o .zip de “Baixar todos”), `qualificacaoDoCliente`, `rgDoCliente`, `enderecoDoCliente`, `falta()`, `dataPorExtenso`, `valorPorExtenso` e o desenho de `peticao_modelos` e `peticao_modelo_versoes` (versões sem UPDATE nem DELETE, `campos` e `desconhecidos` guardados, `paragrafos` para a prévia sem abrir o arquivo). Os modelos padrão moram no código, como os 8 das petições.
- **Da proposta em .docx:** `linhasTimbrado` e `leituraCondicao`.
- **De Contratos:** `contrato_advogado_oab` (as inscrições escolhidas), `anexos` (0520) e a rota de assinatura, que já ativa o contrato e gera os `recebimentos_previstos`.

### Tabelas

| Tabela | Campos | Observação |
|---|---|---|
| `documento_modelos` | `id`, `ordem`, `escritorio_id`, `tipo` (`CONTRATO`, `PROCURACAO`, `HIPOSSUFICIENCIA`, `OUTRO`), `nome`, `substitui` (o padrão do T3jus que ele troca), `criado_por`, `criado_em`, `arquivado_em`, `arquivado_por`, `motivo_arquivo`, `versao` | Como `peticao_modelos`. Um ativo por `substitui`. `OUTRO` depende da pergunta 1. Na 1ª rodada se chamava `modelo_documento` |
| `documento_modelo_versoes` | `id`, `ordem`, `escritorio_id`, `modelo_id`, `numero`, `nome_arquivo`, `tamanho`, `campos`, `desconhecidos`, `paragrafos`, `enviado_por`, `enviado_em` | Sem UPDATE nem DELETE |
| `documentos_gerados` | `id`, `ordem`, `escritorio_id`, `contrato_id`, `tipo`, `numero_versao` (v1, v2 por contrato e tipo), `modelo_versao_id` ou `modelo_padrao` (com a data do padrão), `arquivo` (caminho no bucket), `tamanho`, `outorgados` (pessoa e inscrições usadas, com a frase do dia), `poderes`, `outro_poder`, `cidade_data`, `representante` (o do dia), `dados_marcados` (o que faltou), `gerado_por`, `gerado_em` | Sem UPDATE nem DELETE. Gerar de novo cria outra linha com o número seguinte. Guarda o que foi usado no dia (decisão 16) |
| `anexos` (0520), mudança | categorias novas `PROCURACAO_ASSINADA` e `DECLARACAO_ASSINADA`; coluna `documento_gerado_id` | O contrato assinado continua `CONTRATO_ASSINADO`, ligado ao contrato, e passa a apontar também o documento gerado. Anexar de novo guarda os dois; vale o mais novo |
| Campos novos em `clientes` | `nascimento` (se ainda não houver), `capacidade` (`PLENA`, `MENOR`, `CURATELA`), `rl_nome`, `rl_documento`, `rl_parentesco` (mãe, pai, tutor, curador), `rl_estado_civil`, `rl_profissao`, `rl_rg` | **Finalidade (PT-11):** qualificar quem assina pelo cliente menor ou incapaz nos documentos. Entram no inventário de dados. `FALTANDO_QUALIFICACAO` ganha `RL_NOME` e `RL_DOCUMENTO` quando o cliente é menor ou curatelado. Representado ou assistido sai da data de nascimento no dia |
| Poderes do escritório | `escritorios.poderes_padrao` (lista) ou o último usado, lido de `documentos_gerados` | Para a marcação inicial (decisão 11) |
| Histórico do escritório e do contrato | `documento.modelo_enviado`, `documento.modelo_trocado` (versão antes e depois), `documento.modelo_arquivado`, `documento.gerado` (tipo, versão, dados marcados), `documento.assinado_anexado` | Na mesma tabela de eventos da Equipe. Anexar o contrato grava também o evento de assinatura que já existe |

### API

| Rota | O que faz | Erros |
|---|---|---|
| `GET /v1/escritorio/documentos?situacao=falta\|assinados&q=&cursor=` | Lista os gerados, com a versão, quem gerou, dados marcados e a situação da assinatura; os que faltam anexar primeiro | `AREA_NAO_LIBERADA` |
| `GET /v1/escritorio/documentos/modelos` | Os três modelos (e os outros), com a versão atual, as anteriores, a contagem de uso e a lista de campos aceitos | `AREA_NAO_LIBERADA` |
| `POST /v1/escritorio/documentos/modelos` e `POST …/modelos/:id/versoes` | Envia modelo ou versão nova. Confere tipo, tamanho e campos, inclusive os quebrados pelo Word; devolve achados, desconhecidos (com a sugestão) e os esperados que faltam | `ARQUIVO_INVALIDO`, `ARQUIVO_PDF`, `ARQUIVO_DOC_ANTIGO`, `ARQUIVO_MACRO`, `ARQUIVO_GRANDE`, `MODELO_SEM_CAMPOS` (aviso) |
| `POST /v1/escritorio/documentos/modelos/:id/arquivar` | Arquiva, com motivo; volta a valer o padrão | `MOTIVO_OBRIGATORIO` |
| `GET /v1/escritorio/contratos/:id/documentos-dados` | O que a página de gerar mostra: cliente, representante, o que falta, advogados do contrato e os outros com OAB (com as inscrições), poderes iniciais, a última geração e o que mudou desde ela | 404 de outro escritório |
| `POST /v1/escritorio/contratos/:id/documentos/previa` | Monta a prévia de cada documento marcado, sem gravar, e devolve o que falta | Os mesmos de gerar |
| `POST /v1/escritorio/contratos/:id/documentos` | Gera os .docx com `tipos`, `outorgados` (pessoa e inscrições), `poderes`, `outro_poder` e `cidade_data`; grava cada um como versão nova e devolve os arquivos e os dados marcados | `DOCUMENTO_OBRIGATORIO`, `SEM_OUTORGADO`, `ADVOGADO_SEM_OAB`, `INSCRICAO_INVALIDA`, `MODELO_INVALIDO`, `CONTRATO_ENCERRADO` |
| `GET /v1/escritorio/documentos/:id/arquivo` e `GET …/contratos/:id/documentos.zip?versao=` | Link temporário do .docx ou do assinado; o .zip dos documentos daquela geração | 404 de outro escritório |
| `POST /v1/escritorio/contratos/:id/assinados` | Anexa um ou mais assinados (arquivo e data por documento), pelo mesmo envio em duas etapas dos anexos (0520). Se vier o contrato e ele estiver em elaboração, chama na mesma transação o registro da assinatura que já existe: ativa e gera a programação | `ARQUIVO_INVALIDO` (inclusive o .docx), `ARQUIVO_GRANDE`, `DATA_FUTURA`, `DATA_INVALIDA`, 409 `CONFLITO_VERSAO` (o contrato mudou ou já foi ativado) |

Os códigos novos precisam de texto próprio em `TEXTOS_ERRO` ou `TEXTOS_MOTIVO`, no tom aprovado em D5 (o que aconteceu, o que continua igual, o que fazer).

## Para o painel

- A entrega desta seção **atende CH-08 só em parte**: os três documentos gerados em .docx no timbrado, com os dados do cliente, do contrato e dos advogados (OAB), modelos do escritório com versões, anexar os assinados (o contrato ativa o contrato) e gerar de novo com versões. CH-08 é [VAL]: a validação com os pilotos é o que falta.
- Itens “pendente” para o painel, citando CH-08:
  - validar com os escritórios piloto o fluxo, os campos e os três modelos;
  - revisar o texto dos três modelos padrão do T3jus (e a versão PJ da declaração) com a advogada parceira, antes de entrarem (pergunta 3);
  - o representante legal do menor ou incapaz, que depende dos campos novos em Clientes;
  - outros documentos do escritório, se a pergunta 1 for sim.
- **CH-09 (assinatura eletrônica) continua só com lugar reservado:** não citar como atendida.
- Depende de AP-01 (qualificação no cadastro), EX-12 e da Equipe · OAB (já programadas), e da assinatura do contrato (F3.10 e F3.12, já programadas).
- Publicação e dependências externas não mudam o status da ideia: ele sai das entregas e dos testes.

## Perguntas para a Carol

> Aprovadas como recomendado em 21/11/2026, 19h37 (Bahia).

1. **Além dos três documentos, o escritório pode cadastrar modelos próprios (substabelecimento, declaração de residência, termo de acordo de honorários)?** **Recomendo que sim, como “Outro documento”, com os mesmos campos.** O motor, a conferência e as versões já são os mesmos; o custo é pequeno, e substabelecimento e declaração de residência aparecem em quase todo início de caso. O outro documento aparece como mais uma caixa na hora de gerar e não muda nada no contrato.
2. **Os documentos passam pela revisão do responsável, como as petições?** **Recomendo que não, nesta versão.** Quem gera tem a área Contratos, o texto é o do modelo do escritório (não muda a cada cliente, como a petição), e o cliente assina na frente do advogado, que confere ali. O histórico guarda quem gerou. Se os pilotos pedirem, a revisão das petições pode ser reaproveitada inteira.
3. **Os modelos padrão do T3jus (procuração e as duas declarações) passam pela advogada parceira antes de entrar?** **Recomendo que sim, como nas petições.** É texto jurídico que vai ser assinado pelo cliente; um erro ali se repete em todos os escritórios. Até a revisão, o escritório usa o próprio modelo, e o padrão aparece com “em revisão”.
4. **Dá para gerar procuração sem contrato, direto da ficha do cliente?** **Recomendo que não: sempre a partir de um contrato, que pode estar em elaboração.** É no contrato que ficam os advogados, as inscrições escolhidas e o assinado; criar um contrato em elaboração leva um minuto e ele só vale quando o assinado for anexado. A tela de escolher o contrato leva a criá-lo. Se os pilotos fizerem muita procuração sem honorário (pro bono, dativo), voltamos a isso.
5. **Como tratar a declaração de hipossuficiência de pessoa jurídica?** **Recomendo avisar e deixar gerar, com a versão para pessoa jurídica.** A empresa pode ter a gratuidade, mas precisa provar (Súmula 481 do STJ); esconder a opção tiraria um caminho legítimo, e bloquear iria contra a regra de que só bloqueia o que impede o documento de existir. O aviso fica na caixa, na faixa do botão e o texto do modelo diz que a prova vai junto.
