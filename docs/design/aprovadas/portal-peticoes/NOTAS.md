# Jurídico: Petições · notas

> **Aprovado pela Carol em 19/11/2026, às 18h37 (Bahia).** Antes ela pediu a revisão pelo advogado responsável (aprovar, reprovar, comentar e pedir ajuste), já incluída. As 5 perguntas do fim seguem a recomendação e valem como decisões: às 4 e 5 ela respondeu "sim", e às 1 a 3 aprovou as recomendações.

O desenho da seção Petições da área Jurídico do Portal do advogado, para a Carol aprovar antes de virar código. Substitui o lugar reservado com a pergunta de interesse que estava no Jurídico aprovado (decisão 11).

Atende EX-09 (a validar): o gerador de petições, com os modelos do escritório preenchidos com os dados do cliente, do caso e dos advogados, mais um formulário curto (endereçamento, valor da causa), gerando um arquivo editável.

**Segunda rodada (pedido da Carol, 19/11/2026):** a revisão pelo advogado responsável. Nas palavras dela: “quando não é o advogado responsável que gera a petição, vamos supor que foi um estagiário precisa ir para o advogado responsável para analisar, aprovar ou reprovar e ter a opção de deixar algum comentário e solicitar algum ajuste”. Está nas decisões 17 a 27 e nos 12 estados da seção 4 do `index.html`.

Usa e não muda:

- AP-01: a qualificação do cliente (nacionalidade, estado civil, profissão, RG, CPF, endereço) vem da ficha do cliente;
- EX-01: um caso com vários clientes; quem gera escolhe quais entram como partes;
- EX-12 e a Equipe · OAB: o nome e as inscrições de quem assina vêm da Equipe. Vale a decisão da Carol: por padrão entram todas as inscrições de cada advogado, a principal primeiro, e quem gera pode desmarcar alguma só naquela petição. Estagiário não assina nesta versão, mas pode gerar: a petição dele vai para a revisão do responsável;
- o padrão aprovado de Procurações e modelos (Contratos, decisões 24 a 26, CH-08): modelos em .docx com campos entre colchetes, modelo padrão do T3jus que o escritório troca pelo dele, prévia em papel timbrado com os dados marcados e o que falta em destaque (“[RG: falta]”), resultado em .docx para revisar no Word e assinatura eletrônica (CH-09) só com lugar reservado.

Pesam também PT-03 (nada é apagado: versões de modelo e petições geradas ficam guardadas), PT-07 (arquivos privados, tipo e tamanho conferidos), PT-10 (WCAG 2.2 AA, celular e estados vazio e erro), PT-11 (a resposta não guarda nada além do necessário; a qualificação da parte contrária tem finalidade escrita), PT-25 (lista, página, criar e editar no padrão do Jurídico) e PA-01 e PA-02 (a área só aparece para quem a sócia dona liberou).

**Não há IA escrevendo a petição.** É preenchimento de modelo: o texto jurídico é o do escritório, e o T3jus só troca os campos entre colchetes.

## Como abrir

- `index.html` mostra os 27 estados em computador (1440) e celular (412), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- `peticoes.html` abre sozinho, com as fontes, o CSS e os ícones embutidos. O estado vem do endereço, por exemplo `peticoes.html?estado=nova-dados`, `?estado=modelo-enviar`, `?estado=revisar` ou `?estado=ficha-peticoes`. No celular, `&mais=1` abre a folha Mais.
- Abaixo de 760 px, o HTML vira a versão de celular. Funcionam as janelas (Enviar modelo, Passar a revisão, Mudar etapa, Novo prazo), o Esc e o Mais; os links dos passos levam ao estado seguinte. O resto é desenho.
- `publicar.html` (não vai para o repositório; `publicar.py` o refaz) é o `index.html` com as capturas embutidas, numa página só (menos de 16 MB; as capturas são recomprimidas só para ela), para publicar. Os cliques nas imagens abrem o `peticoes.html`, que vai junto como arquivo de apoio.
- A pasta `_fonte/` guarda os scripts, e `sh _fonte/gerar.sh <pasta>` refaz tudo (precisa do `@axe-core/playwright` instalado ao lado ou da variável `AXE_DIR`):
  - `comum.py` e `juridico.py` são as cópias sem mudança do Jurídico aprovado;
  - `peticoes.py` carrega as definições do `juridico.py` (sem gerar o `juridico.html`) e acrescenta as peças novas, com o prefixo `pe-`. Ele também acrescenta duas pessoas ao script de demonstração da página (Felipe e Beatriz), sem mudar o `comum.py`;
  - `casos.py` gera a lista de estados e o `index.html`;
  - `fotos.cjs` é o do Jurídico aprovado (só muda de onde vem o axe): faz as capturas com deviceScaleFactor 2 e roda as conferências;
  - `webp.py` converte as capturas e `publicar.py` monta o `publicar.html`.
- Os dados são fictícios e seguem o elenco das telas aprovadas: Marina Ribeiro (sócia dona), Felipe Matos (OAB/SP e OAB/RJ), Larissa Costa (só Jurídico), Gustavo Lima e Diego Almeida (sem OAB), Paula Nunes (sem áreas), **Beatriz Nogueira, estagiária nova no elenco** (só Jurídico, sem OAB), e os casos do Jurídico aprovado. CPFs, CNPJ e números de OAB são inventados.

## Decisões de design

1. **Petições continua sendo uma seção da barra do Jurídico, sem seção nova.** Os modelos ficam numa página dentro de Petições (Jurídico › Petições › Modelos de petição), aberta por um botão, como Etapas do escritório dentro de Casos e processos.
2. **Lista de petições geradas:**
   - busca por caso, cliente ou modelo; filtro de modelo; Todas e Minhas;
   - cada linha mostra o modelo e o nome do arquivo, o caso (link para a ficha), quem gerou e quando, e a situação dos dados: “Completa” ou “1 marcado” (dados que faltavam e saíram entre colchetes). O botão de baixar fica na mesma célula, com nome completo para leitor de tela;
   - a mais nova vem destacada; no celular a tabela vira cartões, como em Casos;
   - o pé diz que cada arquivo fica também nos documentos do caso e que gerar de novo guarda o anterior;
   - ao lado, o campo âmbar “Como funciona”: o texto é do escritório, os dados vêm do cadastro, o formulário é curto e o T3jus não escreve a tese, não revisa e não protocola.
3. **Primeiro uso:** dois passos, conferir os modelos (já vêm 8 padrão do T3jus) e gerar a primeira, com o lembrete de que dá para começar pela ficha do caso.
4. **Modelos de petição:**
   - agrupados por área (Trabalhista; Cível, consumidor e saúde; Para qualquer área). A área ordena a escolha do modelo na nova petição;
   - cada modelo traz o selo “Do escritório” ou “Padrão T3jus”, a versão, quem enviou, quantos campos usa e quantas vezes foi usado, com Baixar e Trocar (no padrão, “Usar o do escritório”);
   - os 8 padrão do T3jus: inicial trabalhista e cível, contestação trabalhista e cível, recurso ordinário, juntada de documentos, pedido de prazo e manifestação simples. No desenho, 3 já foram trocados pelo do escritório;
   - ao lado, a lista dos **campos aceitos**, por grupo (clientes, caso e processo, advogados, formulário e escritório), cada um com o que entra. É a referência para quem prepara o modelo no Word;
   - trocar um modelo cria a versão nova e guarda a anterior; petições já geradas não mudam.
5. **Enviar modelo (janela):**
   - arquivo .docx de até 5 MB, nome, tipo de peça, área e qual modelo substitui;
   - **a conferência acontece assim que o arquivo chega** e lista os campos achados. Campo que o T3jus não conhece (no desenho, `[NOME_RECLAMADA]`) gera aviso de atenção, diz o que acontece (sai como está, para completar no Word) e sugere o campo certo (`[PARTE_CONTRARIA]`). **Não bloqueia salvar**, porque o escritório pode ter campos próprios que prefere completar à mão;
   - PDF, .doc antigo ou .docm (com macro) **bloqueiam**, com o erro preso ao arquivo e a saída escrita (“Arquivo › Salvar como › Documento do Word”). O modelo atual continua valendo.
6. **Nova petição em 4 passos curtos:** Caso, Modelo, Dados da peça, Prévia e gerar.
   - Os passos ficam numa faixa no alto, com o que já foi escolhido embaixo de cada nome; os feitos são links para voltar. No celular viram 4 botões numerados;
   - **começando pela ficha do caso** (“Gerar petição”), o passo 1 já vem feito e a pessoa entra direto no Modelo;
   - passo 1: busca e os casos em andamento em cartões de escolha, os da pessoa primeiro;
   - passo 2: os modelos da área do caso primeiro, depois os de qualquer área; “Outras áreas” fica fechado;
   - ao lado, de onde vem cada dado e, a partir do passo 2, o resumo “Sua petição” com Trocar.
7. **Dados da peça: o formulário pede só o que o modelo usa.**
   - **Endereçamento:** vem montado a partir da vara do caso e é editável (“mude se vai para outro juízo, como o tribunal”);
   - **Processo:** número e vara aparecem como dado do caso, sem campo. **Valor da causa** vem do caso e é editável; a mudança vale só para aquela petição e o caso não muda. Se o caso não tem número, o campo aparece vazio, com “Gravar o número também no caso” (fica no histórico do caso);
   - **Partes:** os clientes do caso, todos marcados por padrão, cada um com “qualificação completa” ou o selo “Falta o RG”, e o link “Completar na ficha”. A parte contrária vem do caso, e a qualificação dela (CNPJ ou CPF e endereço) é um campo opcional que fica guardado no caso para as próximas;
   - **Quem assina:** só aparece quem tem OAB na Equipe. Cada advogado entra com todas as inscrições, a principal primeiro; quem tem mais de uma vê as caixas de cada inscrição e pode desmarcar alguma só naquela petição (no desenho, a OAB/RJ de Felipe). Uma linha diz quem fica de fora por não ter OAB e que estagiário não assina nesta versão. A faixa âmbar “No documento:” mostra a frase como vai sair, enquanto a pessoa marca;
   - **Cidade e data:** do endereço do escritório e de hoje, editável.
8. **O que bloqueia e o que gera com marcador.** Segue a regra aprovada em Contratos: **dado faltando no cadastro avisa e não bloqueia.** Sai marcado entre colchetes (`[RG: falta]`, `[NÚMERO DO PROCESSO: falta]`) e aparece em destaque na prévia, no resumo e no resultado. Só bloqueiam o que impede a peça de existir: endereçamento vazio, nenhum advogado marcado e nenhuma parte marcada. Nesses casos, o resumo de erros no topo traz links para os campos, cada erro fica preso ao campo e nada é gerado.
9. **Número do processo antes da distribuição:** quando o modelo usa `[NUMERO_PROCESSO]` e o caso não tem número, a conferência diz que, se a ação ainda não foi distribuída, talvez o modelo certo seja a petição inicial, com “Escrever o número” e “Trocar o modelo”.
10. **Prévia em papel timbrado**, o mesmo desenho aprovado em Contratos, com três marcas que não dependem só da cor: dado do cadastro (traço embaixo), deste formulário (pontilhado) e o que falta (caixa com a palavra “falta”). A prévia mostra o começo do documento; o resto do texto do modelo não muda e a nota diz isso. Ao lado, “Confira antes de gerar”: quantos campos foram preenchidos, o que falta com o atalho para completar, o aviso de que o T3jus não revisa nem protocola e o botão, que diz o que acontece (“Gerar o .docx” ou “Gerar com 2 dados marcados”).
11. **Resultado:**
    - o arquivo com Baixar o .docx, que recebe o foco;
    - o dado que saiu marcado, com as duas saídas (completar no Word ou na ficha e gerar de novo; o anterior fica guardado);
    - **o aviso claro: o T3jus não protocola e não revisa o conteúdo jurídico**; revisão, assinatura e protocolo são do escritório;
    - os próximos passos (revisar, inclusive a concordância; assinar e protocolar; anexar o protocolado, se quiser);
    - a assinatura eletrônica (CH-09) como lugar reservado tracejado, como em Contratos.
12. **Ficha do caso:** a ficha aprovada ganha “Gerar petição” na folha Documentos e uma folha nova “Petições do caso” na lateral, logo abaixo de “O que está travando”, com as petições do caso e Baixar. Cada petição mostra a situação (Em revisão, Aprovada…); a que espera quem está vendo traz “Revisar”. **Só a aprovada entra nos documentos ligados**, com o selo “Petição aprovada”. Nada mais na ficha muda.
13. **Concordância de gênero e número** (“vem” ou “vêm”, “inconformado” ou “inconformados”) fica no texto do modelo e na revisão. O T3jus não ajusta nesta versão; o resultado lembra de conferir.
14. **Honorários não entram em petições nesta versão.** Não há campo de honorários na lista. Assim, quem só tem Jurídico (Larissa) gera qualquer petição sem ver valores de contrato, como já foi decidido. O **valor da causa** é dado do processo e aparece e se edita para quem tem Jurídico.
15. **Quem não tem a área Jurídico** não vê o Jurídico no menu nem no Mais. Quem abre um link direto vê “Esta área não está liberada para você”, com quem libera; o servidor responde `AREA_NAO_LIBERADA`.
16. **Celular:** o Jurídico mora no Mais, então o botão Mais fica marcado como atual. O formulário vira uma coluna, as escolhas viram cartões de largura inteira, a lateral desce para depois do conteúdo e os botões ficam no rodapé de cada formulário, lado a lado e largos. No passo 4, a prévia vem primeiro e o “Confira antes de gerar”, com o botão, fica no fim.

### Revisão pelo advogado responsável (2ª rodada)

17. **Quem passa pela revisão.** A regra é uma só: **quem gera e não é o advogado responsável pelo caso manda para a revisão dele.** Vale para a estagiária, para outro advogado do escritório e para quem tem Jurídico sem OAB (como Gustavo Lima, que não é estagiário). Não importa o cargo, importa quem responde pelo caso.
    - **O próprio responsável e a sócia dona não passam pela revisão:** a petição deles sai aprovada (“Sem revisão: gerada pela responsável”). Marina e Larissa, nos estados de antes, já mostram isso no passo 4 e no resultado;
    - **responsável sem OAB:** a revisão vai para a sócia dona, porque quem revisa precisa ser advogado (na lista: a inicial de Gustavo, “Por Marina Ribeiro”);
    - quem assina continua sendo só quem tem OAB. A estagiária gera, mas o advogado que assina vem marcado por padrão (o responsável).
18. **O passo final muda de nome e de botão.** Para quem não é o responsável, o passo 4 vira “Prévia e enviar”, diz para quem vai (“Vai para a revisão de Felipe Matos, o responsável pelo caso. Só fica pronta depois que ele aprovar”), aceita um recado opcional e tem dois botões: “Guardar como rascunho” e “Enviar para revisão de Felipe Matos”. Nada sai como pronto.
19. **Situações:** Rascunho (gerada e ainda não enviada), Em revisão, Ajuste pedido, Aprovada e Reprovada. Cada uma tem selo com texto e ícone. Enquanto não é aprovada, o .docx baixado sai com **“Rascunho · em revisão” no cabeçalho**; a aprovada sai limpa. Isso evita protocolar sem querer uma versão não revisada.
20. **O aviso ao revisor** chega no sino e no Início, em “Pedem você agora” (a lista aprovada do Início), com o prazo do caso quando houver. Ele sai do Início quando o revisor decide. Na lista de Petições, o filtro **“Para eu revisar”** mostra só as que esperam a pessoa, com o botão Revisar.
21. **Tela de revisão:**
    - à esquerda, a prévia da versão em papel timbrado, com Baixar;
    - ao lado, nesta ordem: quem enviou (nome, papel, quando, versão e o recado), o prazo do caso em destaque, os dados usados (partes, endereçamento, quem assina, modelo), as versões e a decisão;
    - **decisão:** Aprovar, Pedir ajuste ou Reprovar, em cartões de escolha. O comentário geral é opcional ao aprovar e obrigatório para pedir ajuste ou reprovar (pode ser o geral ou um comentário num parágrafo). O botão diz o que acontece: “Aprovar a versão 2”, “Pedir ajuste a Beatriz”, “Reprovar”;
    - sem o comentário, o resumo no topo diz que a decisão não foi enviada e o erro fica preso ao campo (`COMENTARIO_OBRIGATORIO`).
22. **Comentários:** o geral e **o preso a um parágrafo** da prévia. Cada parágrafo tem um botão de comentar ao lado; o comentário aparece logo embaixo do trecho, com quem escreveu, e o parágrafo ganha um filete âmbar. Preso ao parágrafo, e não a uma seleção livre de texto, porque funciona igual no celular e no leitor de tela, e porque o .docx editado no Word muda o texto, mas os parágrafos da prévia continuam reconhecíveis. É a pergunta 5.
23. **Ajuste pedido:** quem gerou é avisado e vê os comentários, com o trecho citado, e a v1 com os comentários no lugar. Corrige de um de dois jeitos:
    - **refazer pelos dados:** volta ao formulário com tudo preenchido (bom para dado de cadastro, como o endereço);
    - **enviar o .docx editado no Word:** baixa a v1, edita e envia (bom para texto, como a preliminar). O arquivo passa pela mesma conferência: só .docx, até 5 MB, e avisa se ainda há algo como “[RG: falta]”.

    Ao enviar a v2, marca cada comentário como resolvido e deixa um recado. A v2 volta para o mesmo revisor.
24. **Versões:** cada envio é uma versão (v1, v2…), com o arquivo, quem enviou, a decisão, os comentários e se foram resolvidos. Nada é apagado: a v1 e os comentários dela continuam no histórico depois da aprovação. Quando a v2 é um .docx editado, a prévia mostra o texto do arquivo (convertido no servidor) e avisa que os dados não aparecem marcados.
25. **Aprovada:** só agora sai “pronta”: Baixar o .docx sem a marca de rascunho, o comentário do revisor, o aviso de que o T3jus não protocola nem revisa o conteúdo jurídico e o lugar reservado da assinatura eletrônica. Entra nos documentos do caso.
26. **Reprovada:** pede motivo e fica guardada, com o motivo, sem sair como pronta e sem entrar nos documentos do caso. Dá para baixar só como rascunho, para consulta, e gerar outra petição do caso.
27. **Passar a revisão:** o revisor pode passar aquela revisão para outro advogado com OAB e com a área Jurídico, com um motivo opcional (“estou em audiência e o prazo vence hoje”). Ele continua responsável pelo caso; o aviso vai para a pessoa nova e quem gerou é avisado. Fica no histórico da petição.

## Acessibilidade (WCAG 2.2 AA)

- **Conferência automática** em 54 capturas (27 estados × computador e celular), feita pelo `fotos.cjs`. O resultado fica em `_conferencia.json`:
  - o axe (WCAG 2.0, 2.1 e 2.2, A e AA) não achou nenhuma violação;
  - nenhuma tela tem rolagem lateral;
  - nenhum erro de script.
- **Alvos:** no celular, todos têm 44 px ou mais. No computador, os botões compactos (Baixar, Trocar) têm 36 px, como no aprovado. A única exceção é a palavra-marca “T3jus” da moldura aprovada, com 24 px, já registrada em Clientes.
- **Passos:** a faixa é uma lista com `aria-label` “Passo N de 4”; o atual tem `aria-current="step"` e os feitos são links que dizem “feito; voltar a este passo”.
- **Formulários:** cada campo tem `label`; caso, modelo, partes, advogados e inscrições ficam em `fieldset` com `legend`; os erros ficam ligados por `aria-describedby`, com `aria-invalid`, e há resumo no topo com links. A linha “No documento:” é `aria-live="polite"`. Valores usam `inputmode`.
- **Prévia:** as marcas usam traço, pontilhado ou caixa com a palavra “falta”, não só cor; uma frase só para leitor de tela explica a legenda. O selo “1 marcado” diz “para completar” ao leitor de tela.
- **Revisão:** cada botão de comentar diz qual parágrafo comenta (“Comentar o parágrafo 3: a qualificação das partes”), tem 36 px no computador e 44 px no celular. Cada comentário é `role="note"` com o autor e o parágrafo no nome. As decisões ficam em `fieldset`; o erro do comentário usa `aria-invalid` e `aria-describedby`, com resumo no topo.
- **Janelas:** `<dialog>` com `showModal()`, Esc fecha, o foco começa no nome do modelo (ou no botão do arquivo, quando há erro).
- **Contraste:** só pares do D2 e do conceito Gabinete. O selo “Do escritório” é vinho sobre #F2CDB3 (7,15:1); a marca “falta” é tinta sobre #F2CDB3.

## O que precisa de dado novo no servidor

Todas as tabelas têm `escritorio_id` e passam por `proteger_tabela_escritorio`. O escritório vem da sessão, nunca do navegador. Os arquivos (modelos e petições) são privados e abertos só por link temporário (PT-07); o nome que a pessoa dá não define onde o arquivo é guardado.

### Tabelas

| Tabela | Campos | Observação |
|---|---|---|
| `peticao_modelo` | `id`, `escritorio_id` (nulo no padrão T3jus), `nome`, `tipo` (inicial, contestacao, recurso, juntada, prazo, manifestacao, outra), `area` (ou `qualquer`), `padrao_id` (o padrão que ele substitui, quando há), `criado_por`, `criado_em`, `arquivado_em` | Sem DELETE: arquivar. Os padrão do T3jus são lidos por todos e não podem ser mudados pelo escritório |
| `peticao_modelo_versao` | `id`, `escritorio_id`, `modelo_id`, `versao`, `arquivo_id`, `campos` (lista achada na conferência), `campos_desconhecidos`, `enviado_por`, `enviado_em` | Sem UPDATE nem DELETE. A versão mais nova vale; as antigas ficam guardadas |
| `peticao_gerada` | `id`, `escritorio_id`, `caso_id`, `modelo_versao_id`, `arquivo_id`, `documento_caso_id`, `partes` (clientes), `advogados` (pessoa e inscrições usadas, com a frase do dia), `formulario` (endereçamento, valor da causa usado, cidade e data, número escrito), `dados_marcados` (lista do que faltou), `gerado_por`, `gerado_em` | Sem UPDATE nem DELETE. Gerar de novo cria outra linha. Guarda a OAB e a qualificação do dia (PT-03) |
| Campo novo em `caso` | `parte_contraria_qualificacao` (texto, opcional) | Finalidade: preencher `[PARTE_CONTRARIA_QUALIFICACAO]`. O número escrito na petição só vai para `numero_cnj` se a pessoa marcar “Gravar também no caso” |
| Campos novos em `peticao_gerada` | `situacao` (rascunho, revisao, ajuste, aprovada, reprovada), `revisor_id`, `versao_atual`, `aprovada_em`, `aprovada_por` | A situação muda só pelas rotas de revisão. Gerada pelo responsável do caso ou pela sócia dona, nasce `aprovada`, com `revisor_id` nulo |
| `peticao_versao` | `id`, `escritorio_id`, `peticao_id`, `versao`, `arquivo_id`, `origem` (dados, docx_editado), `recado`, `enviada_por`, `enviada_em` | Sem UPDATE nem DELETE. A v1 é a geração; as seguintes vêm de refazer pelos dados ou do .docx editado |
| `peticao_revisao` | `id`, `escritorio_id`, `peticao_id`, `versao_id`, `revisor_id`, `decisao` (aprovada, ajuste, reprovada, passada), `passada_para` (pessoa, quando passada), `motivo`, `em` | Sem UPDATE nem DELETE. Uma linha por decisão. O revisor precisa ter OAB e Jurídico |
| `peticao_comentario` | `id`, `escritorio_id`, `peticao_id`, `versao_id`, `autor_id`, `paragrafo` (nulo no comentário geral), `trecho` (até 160 caracteres, para citar), `texto`, `resolvido_em`, `resolvido_por`, `resolvido_na_versao`, `criado_em` | Sem DELETE: quem escreveu pode desfazer só antes de enviar a decisão |
| Documentos do caso | Só a petição **aprovada** entra como documento do caso, categoria “Petição aprovada” | Mesmo armazenamento dos documentos do Jurídico |
| Histórico do escritório | `peticao.modelo_enviado`, `peticao.modelo_trocado` (versão antes e depois), `peticao.modelo_arquivado`, `peticao.gerada`, `peticao.enviada_revisao`, `peticao.ajuste_pedido`, `peticao.versao_enviada`, `peticao.aprovada`, `peticao.reprovada`, `peticao.revisao_passada` (no histórico do caso também) | Na mesma tabela de eventos da Equipe |
| Avisos | Pedido de revisão ao revisor; decisão a quem gerou; passagem ao novo revisor e a quem gerou | No sino e no Início (“Pedem você agora”), como os outros avisos do Portal |

A tabela `peticao_interesse` do Jurídico aprovado deixa de ser necessária se este desenho for aprovado.

### API

| Rota | O que faz | Erros |
|---|---|---|
| `GET /v1/peticoes?q=&situacao=&visao=todas\|minhas\|revisar&cursor=` | Lista as petições do escritório com a situação, o revisor e a versão | `AREA_NAO_LIBERADA` |
| `GET /v1/peticoes/modelos` | Modelos do escritório e padrão, por área, com a versão atual e a contagem de uso; e a lista de campos aceitos | `AREA_NAO_LIBERADA` |
| `POST /v1/peticoes/modelos` e `POST /v1/peticoes/modelos/:id/versoes` | Envia modelo novo ou versão nova. Confere tipo (só .docx, sem macro), tamanho (até 5 MB) e os campos, inclusive os que o Word quebra em pedaços. Devolve os campos achados e os desconhecidos | `ARQUIVO_INVALIDO`, `ARQUIVO_GRANDE`, `MODELO_SEM_CAMPOS` (aviso), `SEM_PERMISSAO` |
| `POST /v1/peticoes/modelos/:id/arquivar` | Arquiva, com motivo | `SEM_PERMISSAO` |
| `GET /v1/casos/:id/peticao-dados?modelo=` | O que o formulário mostra para aquele caso e modelo: endereçamento sugerido, número, valor da causa, partes com o que falta, advogados com OAB e as inscrições | 404 de outro escritório |
| `POST /v1/casos/:id/peticoes/previa` | Monta a prévia (sem gravar) e devolve o que falta | Os mesmos de gerar |
| `POST /v1/casos/:id/peticoes` | Gera o .docx com `modelo_versao_id`, `partes`, `advogados` (pessoa e inscrições), `enderecamento`, `valor_causa_centavos`, `cidade_data`, `numero` e `gravar_numero`. Liga ao caso e devolve o arquivo e os dados marcados | `ENDERECAMENTO_OBRIGATORIO`, `PARTE_OBRIGATORIA`, `SEM_ADVOGADO`, `ADVOGADO_SEM_OAB`, `INSCRICAO_INVALIDA`, `NUMERO_CNJ_INVALIDO`, `MODELO_INVALIDO` |
| `GET /v1/peticoes/:id/arquivo?versao=` | Link temporário para baixar. Fora da aprovada, o arquivo sai com “Rascunho · em revisão” no cabeçalho | 404 de outro escritório |
| `POST /v1/peticoes/:id/enviar-revisao` | Manda a versão para o revisor, com recado opcional. O revisor é calculado no servidor (responsável do caso; sem OAB, a sócia dona) | `JA_EM_REVISAO`, `SEM_REVISOR`, `SITUACAO_INVALIDA` |
| `GET /v1/peticoes/:id/revisao` | Tela de revisão: versão atual com a prévia, dados usados, quem enviou, recado, prazo do caso, versões e comentários | 404 de outro escritório, `SEM_PERMISSAO_REVISAR` (só o revisor e a sócia dona) |
| `POST /v1/peticoes/:id/comentarios` | Comentário geral ou preso a um parágrafo (`paragrafo`, `trecho`) | `SEM_PERMISSAO_REVISAR`, `TEXTO_OBRIGATORIO`, `PARAGRAFO_INVALIDO` |
| `POST /v1/peticoes/:id/decisao` | `decisao` (aprovar, ajuste, reprovar), `comentario`, `versao` | `SEM_PERMISSAO_REVISAR`, `COMENTARIO_OBRIGATORIO` (ajuste sem comentário), `MOTIVO_OBRIGATORIO` (reprovar), `VERSAO_DESATUALIZADA` (409, chegou versão nova), `SITUACAO_INVALIDA` |
| `POST /v1/peticoes/:id/versoes` | Envia a nova versão: refeita pelos dados (mesmos campos de gerar) ou o .docx editado; marca comentários resolvidos e leva o recado | `SEM_PERMISSAO` (só quem gerou ou a sócia dona), `ARQUIVO_INVALIDO`, `ARQUIVO_GRANDE`, `SITUACAO_INVALIDA` (só com ajuste pedido) |
| `POST /v1/peticoes/:id/passar-revisao` | Passa a revisão para outro advogado, com motivo opcional | `SEM_PERMISSAO_REVISAR`, `REVISOR_INVALIDO` (sem OAB ou sem Jurídico) |

### Para o painel

- A entrega desta seção **atende EX-09 só em parte**: o gerador com modelos, formulário, prévia e .docx, e a revisão pelo advogado responsável (pedido da Carol de 19/11/2026). EX-09 é [VAL]: a validação com a advogada parceira e os pilotos (se usam, com quais peças, se os campos bastam) é o que falta.
- Itens “pendente” para o painel, citando EX-09:
  - validar o gerador e os 8 modelos padrão com a advogada parceira (o texto jurídico dos padrão precisa de revisão de quem advoga);
  - concordância de gênero e número automática, se os pilotos pedirem;
  - a revisão depende do sino e da lista “Pedem você agora” do Início (avisos do Portal); se sair antes deles, a lista “Para eu revisar” já resolve, e os avisos entram como pendente;
  - a prévia de um .docx editado no Word depende da conversão do arquivo no servidor; até lá, a revisão da v2 mostra só o arquivo para baixar.
- CH-09 (assinatura eletrônica) continua só com lugar reservado: não citar como atendida.
- Depende de AP-01 (qualificação no cadastro de clientes), EX-01 (caso com clientes) e EX-12 (OAB na Equipe).

## Perguntas para a Carol

> **19/11/2026, 18h32 (Bahia): a Carol respondeu "sim" às perguntas 4 e 5 (o responsável e a sócia dona pulam a revisão; o revisor pode passá-la a outro advogado, com motivo; comentário geral e preso ao parágrafo inteiro).** As perguntas 1 a 3 seguem abertas.

As 5 perguntas da primeira rodada ainda não tinham resposta. Para não passar de 5, juntei as duas sobre o que bloqueia (dado faltando e campo desconhecido) e tirei a da IA, que virou decisão: nada de IA nesta versão, e o tema vai para a conversa com os pilotos.

1. **Quem pode enviar e trocar os modelos de petição?** **Recomendo: todos com a área Jurídico**, com a versão anterior guardada e cada troca no histórico. Quem escreve as peças é quem mantém os modelos, e nada se perde porque petições já geradas não mudam. Se a Carol preferir mais controle, fica como as etapas: só a sócia dona troca, e a equipe só usa.
2. **Dado faltando no cadastro ou campo desconhecido no modelo bloqueiam?** **Recomendo que nenhum dos dois bloqueie:** o dado faltando sai marcado (“[RG: falta]”), como já foi aprovado em Contratos, e o campo desconhecido gera aviso na conferência do modelo e sai como está, para completar no Word. Só bloqueiam endereçamento vazio, nenhuma parte e nenhum advogado. A petição muitas vezes tem prazo, e quem revisa vê os marcadores em destaque.
3. **O T3jus traz modelos padrão de petição ou só usa os do escritório?** **Recomendo trazer os 8 padrão, curtos e revisados pela advogada parceira antes de entrar**, para o escritório testar no primeiro dia e ver como os campos funcionam. O escritório troca cada um pelo dele. Se a revisão não couber agora, começa só com juntada, pedido de prazo e manifestação, que têm pouco texto jurídico.
4. **O responsável pelo caso e a sócia dona pulam a revisão, e o revisor pode passá-la a outro advogado?** **Recomendo sim para as duas:** a petição do próprio responsável, ou da sócia dona, sai aprovada; a de qualquer outra pessoa (estagiária, outro advogado, quem não tem OAB) vai para o responsável, ou para a sócia dona quando o responsável não tem OAB. E o revisor pode passar a revisão a outro advogado com OAB, com motivo, porque o prazo não espera a audiência acabar. Tudo fica no histórico.
5. **Os comentários da revisão são só gerais ou também presos a um trecho?** **Recomendo os dois, com o trecho sendo o parágrafo inteiro** (um botão de comentar ao lado de cada parágrafo da prévia), e não uma seleção livre de palavras. Mostra exatamente onde está o problema, funciona igual no celular e no leitor de tela e continua valendo quando a v2 vem editada no Word. Se a Carol preferir o mais simples, fica só o comentário geral, e quem revisa cita o trecho no texto.
