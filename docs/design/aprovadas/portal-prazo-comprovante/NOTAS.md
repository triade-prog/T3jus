# Portal: prazo do comprovante de residência · notas

**Aprovado pela Carol em 22/11/2026 (23h16, horário da Bahia), com as 3 recomendações das perguntas do fim** (prazo em Jurídico › Documentos para começar; o texto ao cliente muda junto; diminuir o prazo não pede comprovante sozinho). Prévia: https://claude.ai/artifact/1yNLgxRe9d8a7tLSX47v4X . O desenho passou antes por um segundo especialista, e os 12 ajustes dele foram aplicados. Atende o item F3.134 do painel (ideia AP-08). O que fica decidido aqui é a pergunta 7 do desenho aprovado da jornada (`portal-jornada-fechamento`, decisões 36 e 41): o comprovante de residência vale 90 dias, contados da data que está no papel, e o escritório pode mudar esse prazo.

## O que resolve

O banco já guarda o prazo (`escritorios.comprovante_validade_dias`: inteiro, padrão 90, de 30 a 365, migration 0853). O selo "Mais de N dias" já sai desse campo. Falta o lugar onde a sócia dona muda o número. Só o comentário da 0853 e o NOTAS aprovado da jornada falam em "Ajustes do escritório", e essa tela não existe. As telas de hoje não citam onde o prazo muda.

O prazo vale para o escritório inteiro e só para o comprovante. RG, CNH e certidões não vencem.

## Onde fica e por quê

**Em Jurídico › Casos e processos › Documentos para começar**, numa folha nova chamada "Prazo do comprovante". Ela fica no alto da coluna do lado, acima de "Como funciona", e diz "vale para todas as áreas".

- **É onde a sócia dona já mexe no comprovante.** A lista mostra "Vale 90 dias" no item do comprovante, e o texto "Como pedir ao cliente" fala em "dos últimos 90 dias". O prazo fica ao lado do que ele muda.
- **É diferente do prazo do repasse.** O prazo do repasse ficou em Escritório › Ajustes do financeiro porque ali já havia uma tela com outros ajustes de dinheiro, vista por quem tem o Financeiro. O prazo do comprovante é assunto de documentos do processo, e quem lida com ele é a equipe do Jurídico, que não vê Ajustes do financeiro.
- **Não cria uma tela vazia só para um campo.** Uma "Ajustes do escritório" genérica teria um campo só. Ajustes do financeiro não serve: só quem tem a área Financeiro vê essa tela, e o prazo não é assunto de dinheiro. Dados do escritório trata do cadastro (nome, CNPJ, endereço), e o prazo ficaria perdido ali.
- **A tela já tem a regra certa.** Só a sócia dona edita, e a equipe do Jurídico vê. É a regra que o prazo precisa.

Como os outros lugares levam até o campo:

- **No item do comprovante da lista**, a sócia dona vê, abaixo do texto, "O prazo vale para todas as áreas. Mudar o prazo". O link abre a folha em edição, com o foco no rádio marcado do grupo "Quanto tempo o comprovante vale". O botão "Mudar o prazo" da própria folha faz o mesmo. Quem não é dona lê "Quem muda é Marina Ribeiro, a sócia dona."
- **Na ficha do cliente (Documentos pessoais)**, a linha do comprovante termina com "O escritório aceita até 60 dias. Mudar o prazo", e o link leva a Documentos para começar. Quem não é dona lê "quem muda o prazo é Marina Ribeiro, a sócia dona". O selo continua sendo só selo, sem link: um selo clicável seria um alvo pequeno e confundiria quem só quer ler o estado.
- **O "Como funciona"** ganha, no item do comprovante, "O prazo fica no quadro “Prazo do comprovante”, acima".
- **No celular**, a coluna do lado fica depois da lista. O link "Mudar o prazo" no item do comprovante é o atalho: a página rola até a folha, que abre em edição com o foco no rádio marcado. Assim, quem usa leitor de tela ouve o grupo de opções logo depois de tocar no link.
- **Quem muda.** Com uma sócia dona, o texto é "Quem muda é Marina Ribeiro, a sócia dona." Com mais de um sócio dono, aparecem todos os nomes, na ordem de entrada no escritório: "Quem muda são os sócios donos: Marina Ribeiro e Felipe Matos." A regra vale para a folha, para o item da lista, para o pé da lista e para a ficha.

## Como abrir

- `index.html` mostra os 13 estados em computador (1440) e celular (412), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- `prazo.html?estado=pz-ver` abre sozinho e também aceita os outros estados abaixo. O botão "Estados", no canto, troca de estado.
- `_fonte/gerar.sh` refaz tudo. `_conferencia.json` guarda o resultado do axe e das conferências: 0 violações nos 26 casos (13 estados, cada um no computador e no celular), sem rolagem lateral e sem erro de script. O único alvo apontado é a marca T3jus da moldura aprovada, com 24 px de altura.

## Estados (13)

O elenco e o dia são os de sempre: Ribeiro & Matos, quarta, 18/11/2026. Marina Ribeiro é a sócia dona, e Larissa Costa tem só a área Jurídico. Dos 41 clientes com comprovante na ficha, 3 passam de 90 dias (Antônia, 139; Irene, 118; Hélio, 97) e 4 ficam entre 60 e 90 dias (Eduardo, 84; Gabriela, 77; Benedito, 71; Sílvia Ramos, 64). Joana Prado é a filha de Antônia e o contato do caso dela.

| Estado | Quem | O que mostra |
|---|---|---|
| `pz-ver` | Marina | A lista de previdenciário, com a folha "Prazo do comprovante" ao lado: 90 dias, contados da data do papel, o padrão do T3jus. Mostra que hoje 3 dos 41 comprovantes passaram do prazo, e traz "Mudar o prazo". No item, "Vale 90 dias" e o link para a folha. |
| `pz-editar` | Marina | Opções 60, 90 (o padrão), 180 e "Outro prazo". Com 60 marcado, o efeito aparece antes de salvar: 4 comprovantes passam a ficar com “Mais de 60 dias”, com nome e dias, e o total fica em 7 de 41. Uma caixa, já marcada, troca também "dos últimos 90 dias" no texto que vai ao cliente, nas 4 listas que dizem o prazo (previdenciário, trabalhista, cível e consumidor). O número sai da prévia. A folha explica o que acontece ao salvar. |
| `pz-editar-180` | Marina | O efeito ao contrário: 3 comprovantes voltam a “Em dia”. O pedido de comprovante novo para o caso de Antônia, feito hoje pelo WhatsApp a Joana Prado, filha de Antônia, continua aberto. A folha diz: "Se o de 02/07 servir, marque “Já chegou” no caso." Não existe função para tirar um pedido; a 0270 tem só pedir, pedir de novo e "Já chegou". |
| `pz-erro` | Marina | "Outro prazo" com 400: resumo no topo com link para o campo, erro preso ao campo ("Escreva de 30 a 365 dias. O padrão é 90.") e foco no campo. O prazo continua em 90. |
| `pz-falha` | Marina | Falha do servidor: nada mudou, nem o prazo nem os selos. A escolha continua na folha, com o código para o suporte. |
| `pz-salvo` | Marina | Prazo em 60 dias. O aviso diz que os selos mudaram na hora (4 passaram a "Mais de 60 dias"), que o texto ao cliente passou a dizer “dos últimos 60 dias” em 4 listas, que nenhum pedido saiu e que os casos já abertos não mudam. Com a caixa desmarcada, a frase diria que o texto ao cliente não mudou. A lista mostra "Vale 60 dias" e o texto novo, e a folha diz quem mudou e quando. |
| `pz-equipe` | Larissa | Só para ler: o prazo e a contagem, sem botão, com "Quem muda é Marina Ribeiro, a sócia dona." A lista fica sem Editar e sem os botões de subir e descer. |
| `pz-equipe-dois` | Larissa | A mesma visão num escritório com dois sócios donos: "Quem muda são os sócios donos: Marina Ribeiro e Felipe Matos." |
| `pz-zero` | Marina | Escritório sem nenhum comprovante nas fichas: "Ainda não há comprovante de residência nas fichas dos clientes. O prazo passa a contar quando o primeiro for anexado, pela data do papel." |
| `pz-zero-editar` | Marina | O efeito na versão zero: "Nenhum selo muda agora", sem a lista de nomes. |
| `pz-sem-frase` | Marina | Nenhuma lista diz o prazo atual: a caixa some, e no lugar dela a folha diz que não há texto para trocar e onde escrever o prazo, se quiser. |
| `pz-ficha` | Marina | Ficha de Antônia com o prazo de 60 dias: o selo "Mais de 60 dias" e "O escritório aceita até 60 dias. Mudar o prazo". |
| `pz-ficha-equipe` | Larissa | A mesma ficha, com o mesmo selo e sem o link: diz quem muda. |

## Decisões de design

1. **O que é verdade ao salvar.** O selo é calculado cada vez que a ficha abre (a conta "hoje − data do papel > prazo" já está no banco). Por isso, mudar o prazo muda os selos de todas as fichas na hora. Nenhum pedido sai sozinho por causa disso. Os pedidos já feitos continuam abertos; não há como tirar um pedido, e se o comprovante que já está na ficha servir, a equipe marca "Já chegou" no caso. Os casos já abertos não ganham pedido novo. O comprovante vencido é pedido de novo quando um caso abrir, como na decisão 43 da jornada. A folha diz isso antes de salvar, e o aviso diz de novo depois.
2. **Mostrar o efeito antes de salvar.** O número sozinho não diz o que muda. A folha conta quantos comprovantes passam a ficar com "Mais de N dias" ou voltam a "Em dia", e lista os nomes com os dias. O texto não fala em "pedir troca", para não contradizer "Nenhum pedido sai agora". A sócia dona decide vendo os clientes de verdade.
3. **Opções rápidas, mais "Outro prazo".** 60, 90 e 180 cobrem o que a Carol citou. Cada opção diz para quem serve. "Outro prazo" abre o campo de 30 a 365. O botão Salvar nunca fica desabilitado: o erro aparece depois de tentar salvar.
4. **O texto ao cliente acompanha o prazo.** O "Como pedir" do comprovante, escrito pelo escritório, diz "dos últimos 90 dias". Se o prazo mudar e o texto não, o cliente recebe a regra antiga. Uma caixa, já marcada, troca o número nas listas onde a frase aparece igual. O resto do texto não muda. Se nenhuma lista tiver a frase, a caixa some e a folha explica por quê.
5. **Uma folha, não uma janela.** A folha mostra a lista do lado, e o efeito cabe nela. No celular, a folha cresce no lugar dela, sem camada por cima.

## Acessibilidade (WCAG 2.2 AA)

- As opções são um `fieldset` com `legend` e rádios com rótulo inteiro clicável de 44 px. O campo "Quantos dias" tem rótulo, `inputmode="numeric"` e o erro ligado por `aria-describedby`, e o resumo do erro tem link para o campo.
- O quadro do efeito tem `role="status"` e `aria-live="polite"`: ao trocar a opção, o leitor de tela anuncia quantos comprovantes mudam.
- Os links "Mudar o prazo" ficam dentro de texto, como prevê a exceção da 2.5.8. Os selos continuam texto ("Mais de 60 dias"), não só cor.
- O axe (2.0, 2.1 e 2.2, A e AA) não aponta nada nos 26 casos. Não há rolagem lateral em 412.

## O que o código precisa

1. **Função do banco nova** (migration nova), no molde de `portal_financeiro_prazo_repasse` (0552):
   `portal_escritorio_prazo_comprovante(p_pessoa uuid, p_escritorio uuid, p_dias integer, p_trocar_texto boolean) returns jsonb`, com `security definer`.
   - A função entra com `entrar_escritorio(p_pessoa, p_escritorio, 'juridico.ver')` e recusa quem não é dona com `e_socio_dono`: erro TC401, motivo `SO_SOCIO_DONO`. Mesmo que um dia a sócia dona dê `juridico.etapas.editar` a alguém, o prazo continua só dela.
   - Fora de 30 a 365, a função recusa com `recusar_campos('O prazo vai de 30 a 365 dias.', 'validadeDias')`.
   - A função trava `escritorios` (`for update`), grava o prazo e chama `registrar_historico('juridico.prazo_comprovante', 'escritorios', p_escritorio, {de, para, textosTrocados})`. Se o prazo não mudou, ela não grava nada.
   - Com `p_trocar_texto`, a função troca "últimos {de} dias" por "últimos {para} dias" no `como_pedir` dos itens de `documentos_inicio` com `pessoal = 'COMPROVANTE_RESIDENCIA'` e sem `removido_em`. Cada item trocado sobe de versão e ganha a sua linha no histórico (`juridico.documento_inicio_editado`, com o antes e o depois).
   - Trocar o texto faz `update` em `documentos_inicio` e sobe a versão do item. Quem estiver com aquele item aberto em edição recebe `VERSION_CONFLICT` ao salvar, como em qualquer edição concorrente, e a tela recarrega o item.
   - A função não cria nem fecha pedidos de documento.
2. **Prévia do efeito:** `portal_escritorio_prazo_comprovante_previa(p_pessoa, p_escritorio, p_dias)`, só leitura, só para a sócia dona. Ela devolve `{passamA: [...], voltamAEmDia: [...], totalComComprovante, vencidosCom, listasComFrase}`, com o nome do cliente e os dias, contando os comprovantes em uso (`cliente_documentos_em_uso`). `listasComFrase` diz quantos textos "Como pedir" do comprovante têm a frase com o número de hoje; é dele que sai o "4 listas".
   - **Quem a prévia conta:** os clientes com `estado = 'ATIVO'`. Os excluídos ficam de fora. Os arquivados também ficam de fora: não abrem caso novo, e o selo não pede nada a eles. Se um cliente arquivado voltar a ativo, o selo é calculado de novo ao abrir a ficha.
3. **Rotas na api-portal** (`supabase/functions/api-portal/app.ts`), com o escritório sempre da sessão:
   - `PUT /v1/escritorio/juridico/documentos-inicio/prazo-comprovante`, com o corpo `{ validadeDias, trocarTexto }` validado por um esquema novo em `packages/domain`. Ela devolve `{ validadeDias }`.
   - `GET /v1/escritorio/juridico/documentos-inicio/prazo-comprovante/previa?dias=60`.
   - O `GET /v1/escritorio/juridico/documentos-inicio` já devolve `validadeDias` e passa a devolver também `podeMudarPrazo` (sócia dona), `sociosDonos` (os nomes, para o "Quem muda") e `comprovantesVencidos`. Este último é calculado pela mesma conta da prévia, com o prazo atual, para os dois números nunca discordarem.
4. **Telas:**
   - `JuridicoDocumentosInicio.tsx` ganha a folha "Prazo do comprovante" e o link no item do comprovante. O texto "o prazo muda em Ajustes do escritório" sai.
   - `DocumentosPessoais.tsx` ganha a frase do prazo na linha do comprovante, com o link só para a sócia dona. `portal_cliente_documentos` passa a devolver `podeMudarPrazo`.
   - `DocumentosPessoais.tsx`, linha 36: `COMUNS` tem "90 dias" fixo, e esse texto vai ao cliente pelo "Pedir pelo WhatsApp". Ele passa a usar `dados.validadeDias`.
   - `documentos_inicio_sugestao` (0853, linhas 329 a 350) hoje é `immutable`, não recebe o escritório e escreve "90 dias" na sugestão do comprovante. Ela passa a receber o prazo (`p_validade_dias`) e vira `stable`. Quem chama passa o `comprovante_validade_dias` do escritório, e assim "Usar a sugestão do T3jus" copia o texto com o prazo do escritório.
   - O comentário da 0853 ("muda em Ajustes do escritório, quando a tela existir") é corrigido na migration nova, que aponta para cá.
5. **Testes:** pgTAP para a dona e para quem não é dona, para os limites 29, 30, 365 e 366, para o histórico, para a troca do texto (com a versão que sobe), para a prévia sem clientes excluídos e arquivados e para mostrar que nenhum pedido é criado ou fechado. Teste da rota em `app_test.ts`. Teste e2e do caminho "Mudar o prazo", de 60 até o selo na ficha.

## Para o painel

F3.134 cita AP-08. Com esta tela, AP-08 tem o prazo ajustável, e o resto da ideia segue o que o painel já registra.

## Perguntas para a Carol

1. **O prazo pode ficar em Documentos para começar (Jurídico), e não numa tela "Ajustes do escritório"?** **Recomendo que sim.** O precedente é o prazo do repasse, que foi para Escritório › Ajustes do financeiro. Lá já havia uma tela de ajustes de dinheiro, vista por quem tem o Financeiro. Este caso é diferente: o comprovante é documento do processo, a equipe que lida com ele é a do Jurídico, e Documentos para começar já é da sócia dona e já mostra "Vale 90 dias" e o texto ao cliente. Uma "Ajustes do escritório" teria um campo só. Se um dia ela existir com outros ajustes gerais, a folha muda para lá e os links continuam levando até ela.
2. **Ao mudar o prazo, "dos últimos 90 dias" no texto que vai ao cliente muda junto?** **Recomendo que sim, com a caixa já marcada e à vista**, para o cliente não receber a regra antiga. Quem escreveu um texto diferente pode desmarcar. O histórico guarda o antes de cada texto.
3. **Diminuir o prazo pede o comprovante de novo nos casos em andamento?** **Recomendo que não peça sozinho.** O selo muda na hora e o comprovante sobe para "Precisa de atenção" na ficha, onde a equipe usa "Anexar um novo" quando o cliente mandar. O pedido automático continua só na abertura de um caso. Assim, uma mudança de prazo não manda dezenas de mensagens de WhatsApp de uma vez.
