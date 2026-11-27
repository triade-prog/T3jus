# F3.181, F3.186, F3.190 e F3.188 · O que sobra da exclusão a pedido do titular · notas do desenho

**Aprovado pela Carol em 27/11/2026, com todas as recomendações.** Programado em duas entregas: a primeira (F3.181, F3.186, F3.190, a C9 e as linhas da F3.179 e da F3.193) está no código; o outro cadastro com o mesmo CPF (F3.188: a B' da C7, a C8, a mensagem de feito da M3 e a faixa da M4) fica para a segunda. No código, a ficha traz as chaves pela `portal_cliente` da 1142 (aqui o desenho diz 1143). O cadastro não guarda gênero: onde este desenho segue o gênero do cliente ("a cliente", "outra cliente", "arquivada"), o código usa o masculino genérico ("o cliente", "outro cliente", "arquivado"); o "dela" de quem assina por outro cliente vem do papel (mãe, tutora, curadora) e, pela empresa, vira o nome.

Desenho das telas do plano `t3jus/f3-181-190/plano.md`, com as correções da `revisao.md` (onde as duas discordam, vale a revisão). Só desenho: nada foi programado. PT-11.

- **F3.190**: a janela de exclusão passa a falar das conversas do WhatsApp.
- **F3.181**: o pedido de contrato de cliente excluído (ou arquivado, C2) sai de Contratos. A proposta e o formulário de contrato dizem que ela não vira contrato.
- **F3.186**: o lembrete de contrato do excluído sai das listas. A janela avisa o valor em aberto. Dispensar e trazer de volta, com a página aberta antes, ganham uma mensagem própria.
- **F3.188**: o outro cadastro com o mesmo CPF aparece nas janelas de excluir e de arquivar, com a caixa da B' já marcada. A ficha dele mostra de onde veio o pedido.
- **M2**: as linhas do "sobre" das condições (F3.179) e da explicação da baixa (F3.193), que a outra frente deixou para este desenho.

O contorno tracejado em âmbar só marca o que é novo no desenho. As peças já aprovadas (F3.155, F3.156 e F3.177) aparecem sem contorno. **No produto, não há contorno.**

Dados fictícios do plano (seção 9): escritório Reis & Coelho, sócia dona Paula Reis, Comercial Diego Martins, Contratos Bianca Torres. A cliente é Marina Alves Coelho, com 2 contatos (ela e Rosa, a mãe), proposta P-2026-014 e um lembrete de R$ 1.840,00 no Astrea. Uma conversa fica com Rosa Alves Coelho. O outro cadastro é Marina A. Coelho. Exclusão em 20/11/2026, protocolo EXC-2026-0007. A ficha atrás da janela é a aprovada, só com os nomes trocados, e mostra 3 atendimentos (o plano fala em 4).

## O que mudou em relação ao aprovado

1. **Janela de exclusão, "O que é apagado"**
   - Linha nova das conversas, logo depois dos contatos.
   - Dica da conversa que fica com outro cliente.
   - Dica de quem a cliente também assina por outra pessoa (C9), dentro da linha da qualificação.
   - Linhas do "sobre" do êxito e da explicação da baixa (M2), junto das outras descrições que "viram texto fixo".
2. **Janela de exclusão, "O que fica, sem dado pessoal"**: linha da proposta sem o pedido de contrato. Ela não é apagada, por isso fica nesta coluna (revisão b14).
3. **Janela de exclusão, topo**: dois avisos de atenção novos, o do outro cadastro com o mesmo CPF (com a caixa da B') e o do valor em aberto (C10). Eles convivem com os avisos de hoje: primeiro o de erro, o de falha ou o "Pedido registrado por…" (sempre um só, como hoje), depois o do mesmo CPF e por último o do valor em aberto (revisão b13).
4. **Mensagem de feito**: quando há outro cadastro com pedido aberto, a mensagem não manda mais dizer à cliente que o pedido foi atendido (M3) e ganha o botão para a ficha dele.
5. **Janela de arquivar**:
   - o mesmo aviso do mesmo CPF (C8);
   - a linha do pedido de contrato em "O que acontece" (C2 = A);
   - a nota "Desenho do futuro", que vinha do desenho de 18/11, saiu. O produto não a tem.
6. **Ficha do outro cadastro**: a faixa do pedido ganha uma variante para o pedido aberto pelo mesmo CPF, uma para a dona e outra, neutra, para a equipe (M4).
7. **Ficha da proposta** (ACEITA, cliente excluído ou arquivado), no lugar de "Falta o contrato":
   - "Não vira contrato", sem botões e sem o selo "Contrato pedido";
   - só no excluído, "O que está incluído" diz "Apagado a pedido do titular" (hoje diria "Ainda não escrito. Edite a proposta para escrever.") e o botão do Word sai da lateral, porque o arquivo Word é apagado na exclusão;
   - nos dois casos, o quadro âmbar "A proposta aceita vira contrato." sai, porque contradiz o título;
   - o aviso de urgência quando o pedir é recusado.
8. **Novo contrato pela proposta**: um aviso no molde do "Esta proposta não está aceita", para o excluído e para o arquivado.
9. **Lembretes de contrato**: o conflito aprovado da janela de dispensar com o motivo do cliente excluído e um aviso no topo de Dispensados para o "Trazer de volta".
10. **O que não muda**:
    - o bloco "Pedidos de contrato", que só perde o pedido do excluído (e do arquivado);
    - as listas de Lembretes, a faixa e os totais, que só perdem o lembrete do excluído;
    - a faixa do escudo.

    O estado `pc-sem-excluido` saiu e virou caso do e2e (revisão b15).
11. Nas páginas de Comercial, Contratos e Lembretes, que vêm de desenhos aprovados antes do logo novo, entrou a marca de hoje (LogoCompacto), como a janela de exclusão já tinha. Assim o alvo de 44 px também passa.

## O texto de cada peça nova

`{nome}` é o primeiro nome do cliente. Os exemplos usam Marina.

### 1. Linha das conversas, em "O que é apagado", depois dos contatos (só com `conversas > 0`)

| | Linha (negrito) |
|---|---|
| 1 | **A conversa do WhatsApp** |
| n | **As {n} conversas do WhatsApp** |

Explicação (`<small>`), em pedaços:
1. 1: "o número, os nomes de quem escreveu e todas as mensagens e arquivos saem, e ela some de Conversas." · n: "os números, os nomes de quem escreveu e todas as mensagens e arquivos saem, e elas somem de Conversas."
2. Sempre: "Ficam só as datas, quem da equipe atendeu e os momentos (passou, assumiu, devolveu)."
3. `naFila` 1: "A mensagem que ainda ia sair não sai mais." · n: "As {n} mensagens que ainda iam sair não saem mais."
4. `automacoes` 1: "A automação em andamento para." · n: "As {n} automações em andamento param."

### 2. Dica da conversa que fica (C6, só com `ficam > 0`)

Ela fica dentro da linha das conversas. Se nenhuma conversa sai, fica dentro da linha dos contatos. O ícone é o de alerta, como a dica do resumo.
- 1: "1 conversa fica como está, com as mensagens, porque guarda o registro de **Rosa Alves Coelho**, outra cliente. As mensagens de {nome} nessa conversa também ficam."
- n: "{n} conversas ficam como estão, com as mensagens, porque guardam o registro de **Rosa Alves Coelho e Pedro Lima**, outros clientes. As mensagens de {nome} nessas conversas também ficam."
- Com `ficamComMais`, os nomes terminam em "… e mais {k} clientes".
- "outra cliente" ou "outro cliente" segue o gênero do cadastro. Com mais de um, fica "outros clientes".

### 3. Dica de quem assina por outro cliente (C9, dentro da linha "Nome, CPF, RG e a qualificação")

- 1: "{nome} também assina por **João Coelho**, como mãe e responsável legal. O nome e o CPF dela continuam na ficha dele, porque servem ao contrato e à procuração dele."
- n: "{nome} também assina por **João Coelho** (como mãe e responsável legal) e **Pedro Coelho** (assinava até os 18). O nome e o CPF dela continuam nessas fichas, porque servem aos contratos e às procurações delas."
- O `papel` vem do servidor:
  - "como mãe e responsável legal", "como tutora", "como curadora", "pela empresa" (`rl_documento` e `rep_documento`);
  - "assinava até os 18" (`clientes_quem_assinava`, M7).

### 4. Linha do "sobre" do êxito (F3.179, depende da D3 da outra frente)

**Sobre o que se cobra o êxito, na proposta P-2026-014** (n: "nas propostas P-2026-014 e P-2026-019"). Explicação: "o texto livre, como “dos atrasados que a cliente receber”, vira “Base apagada a pedido do titular”. O percentual e as outras condições ficam como estão." O exemplo entre aspas é fixo e ilustra o tipo de texto. Não é o texto do cliente.

### 5. Linha da explicação da baixa (F3.193)

**A explicação da baixa sem receber** (n: "As explicações das {n} baixas sem receber"). Explicação: "vira (viram) “Explicação apagada a pedido do titular”. A parcela, o valor e a data da baixa continuam no Financeiro." Hoje a linha quase nunca aparece, porque quem tem contrato não pode ser excluído (ver o plano da F3.193).

### 6. A proposta sem o pedido de contrato, em "O que fica, sem dado pessoal" (antes da origem)

- 1: **A proposta P-2026-014, sem o pedido de contrato** · "fica no Comercial como registro, com “Cliente excluído” e “Serviço apagado a pedido do titular”. O pedido sai de Contratos, porque cliente excluído não ganha contrato."
- n: **As propostas P-2026-014 e P-2026-019, sem os pedidos de contrato** · "ficam no Comercial como registro, … Os pedidos saem de Contratos, porque cliente excluído não ganha contrato."
- A proposta aceita **não pedida** não ganha linha.

Na janela de arquivar, em "O que acontece" (antes de "O pedido fica registrado"): **O pedido de contrato da proposta P-2026-014 sai de Contratos** · "a proposta fica no Comercial, aceita, como registro. Cliente arquivado não ganha contrato novo, e ninguém consegue pedir de novo." No plural: "Os {n} pedidos de contrato (P-…, P-…) saem de Contratos".

### 7. Aviso do valor em aberto (C10 a), no topo, tom atenção, ícone carteira

- Título: "Há R$ 1.840,00 em aberto no Astrea."
  - Com 2 ou mais lembretes: "Há R$ 2.300,00 em aberto no Astrea, em 2 lembretes de contrato."
  - Com `origem` null: "no sistema antigo".
- Texto: "É o lembrete de contrato de {nome}, com 3 lançamentos. Depois da exclusão, não dá mais para saber de quem é esse valor, e o lembrete sai de Contratos › Lembretes. Se o escritório vai cobrar, crie o contrato antes: aí o pedido se atende arquivando, sem apagar." Com 2 ou mais lembretes, sem a primeira frase.
- Valor zero (só lançamentos sem valor): título "Há um lembrete de contrato do Astrea, sem valor.", com o mesmo texto.

### 8. Aviso do outro cadastro com o mesmo CPF (C7 na B'), no topo, tom atenção, ícone pessoas

Um cadastro:
- Título: "Há outro cadastro com o mesmo CPF: Marina A. Coelho." (PJ: "CNPJ")
- Texto: "{Situação}, cliente desde 03/02/2025, sem contrato nem processo. Esta exclusão não mexe nele. Quase sempre é a mesma pessoa cadastrada duas vezes, mas pode ser outra pessoa com o CPF errado."
  - Situação: "Ativo", "Inativo" ou "Arquivado a pedido".
  - Com contrato ou processo, no lugar de "sem contrato nem processo": ". Tem contrato ou processo: o pedido dele vira arquivamento."
  - Na janela de arquivar: "Este arquivamento não mexe nele."
- Caixa, **marcada ao abrir**: "Abrir também um pedido de exclusão no cadastro de Marina A. Coelho" · "Com a mesma data e o mesmo canal. Depois você confere se é a mesma pessoa e atende ou recusa. Desmarque só se tiver certeza de que é outra pessoa."
- Desmarcada, aparece embaixo: "Sem o pedido, o cadastro de Marina A. Coelho fica como está. Se for outra pessoa, o CPF de um dos dois está errado: corrija na ficha certa."
- Se ele já tem pedido aberto, a caixa sai e entra "Ele já tem um pedido de exclusão aberto."
- O arquivado a pedido não tem caixa (não aceita outro pedido).
- Botão: "Abrir a ficha de Marina A. Coelho" (abre a ficha em outra aba, para não perder o que foi preenchido na janela).

Dois ou mais:
- Título: "Há 2 outros cadastros com o mesmo CPF: Marina A. Coelho e M. Alves Coelho."
- Texto: "Esta exclusão não mexe neles. Confira cada um: quase sempre é a mesma pessoa cadastrada mais de uma vez, mas pode ser outra pessoa com o CPF errado."
- Um cartão por cadastro: o nome (link para a ficha), a situação e a caixa "Abrir também um pedido de exclusão neste cadastro" ou "Já tem um pedido de exclusão aberto.".
- Com mais de 5: "… e mais {k} cadastros" no título.

### 9. Mensagem de feito com outro cadastro (M3)

"Dados excluídos." · "Protocolo EXC-2026-0007. Antes de responder à cliente, confira o cadastro de Marina A. Coelho, que ficou com um pedido de exclusão aberto. O pedido só está atendido por inteiro quando ele também for resolvido." · botão "Abrir a ficha de Marina A. Coelho". Com dois ou mais: "confira os cadastros de A e B, que ficaram com um pedido de exclusão aberto. … quando eles também forem resolvidos." Sem pedido aberto em outro cadastro (sem outro, ou com a caixa desmarcada), a mensagem é a de hoje.

### 10. Faixa do pedido na ficha do outro cadastro (M4)

- **Dona**, tom atenção:
  - Título: "Pedido de exclusão aberto em 20/11, ao atender outro cadastro com o mesmo CPF."
  - Texto: "Você atendeu o pedido de exclusão de outro cadastro com o mesmo CPF, e este ficou com um pedido aberto, com a mesma data e o mesmo canal (WhatsApp). Confira se é a mesma pessoa. Se for, exclua os dados. Se não for, recuse o pedido e corrija o CPF na ficha certa."
  - Botões: "Excluir os dados" (ou "Arquivar a pedido (LGPD)" com contrato ou processo) e "Recusar o pedido".
  - Sem protocolo, sem o nome do cadastro excluído e sem a linha "Observação:" (A1).
  - Se outra pessoa da sócia dona atendeu, o texto troca "Você atendeu" por "{Nome} atendeu".
- **Equipe**: "Pedido de exclusão aberto em 20/11, aguardando a sócia dona." · "Paula Reis, a sócia dona, vai conferir este cadastro e decidir. Até lá, nada muda na ficha." Sem observação.

### 11. Ficha da proposta (ACEITA), âmbar do alto

- Sobretítulo "Aceita em 12/11", título "Não vira contrato".
- Excluído: "O cliente foi excluído a pedido do titular em 20/11/2026. A proposta fica só como registro."
- Arquivado: "A cliente foi arquivada a pedido do titular em 20/11/2026. Cliente arquivado não ganha contrato novo. A proposta fica só como registro."
- O que sai: "Gerar o contrato", "Pedir o contrato", "Você pediu em …" e o selo "Contrato pedido".
- Só no excluído:
  - "O que está incluído" diz "Apagado a pedido do titular.";
  - no lugar do "Baixar a proposta (.docx)": "O arquivo Word da proposta foi apagado com os dados do cliente."
- Nos dois casos, o quadro "Sem redigitar / A proposta aceita vira contrato." sai.
- Com a F3.179 aprovada, a condição de êxito lê "20% da base apagada a pedido do titular". Isso já é a regra da outra frente e não muda nada aqui.

Pedir recusado (aviso de urgência entre o cabeçalho e as folhas, onde já fica o "Não deu para concluir."): "Não deu para pedir o contrato." · "O cliente foi excluído a pedido do titular agora há pouco. A proposta abaixo já mostra como ficou: ela não vira contrato." A página recarrega sozinha. No arquivado: "… foi arquivado a pedido do titular agora há pouco. …".

### 12. Novo contrato aberto pela proposta (aviso informativo, no molde do "nao-aceita")

- Excluído: "O cliente desta proposta foi excluído a pedido do titular." · "A proposta não vira contrato. O pedido saiu da lista de Contratos e a proposta fica no Comercial só como registro, sem os dados do cliente." · [Voltar para Contratos]
- Arquivado: "A cliente desta proposta foi arquivada a pedido do titular." · "A proposta não vira contrato: cliente arquivado não ganha contrato novo. O pedido saiu da lista de Contratos e a proposta fica no Comercial como registro." · [Voltar para Contratos]

### 13. Lembretes abertos antes da exclusão

- **Dispensar**:
  - A frase de abertura vira "Os dados da cliente foram excluídos enquanto a janela estava aberta."
  - Aviso: "A cliente foi excluída a pedido do titular." · "O lembrete saiu da lista. Não há o que dispensar, e nada foi gravado. Feche a janela para ver a lista atualizada."
  - Botão aprovado: "Ver a lista atualizada" (recarrega).
- **Trazer de volta**, aviso no topo de Dispensados: "Não deu para trazer de volta. A cliente foi excluída a pedido do titular." · "O lembrete de {nome} saiu da lista. Não há o que trazer de volta. A lista abaixo já está atualizada."
- "a cliente" ou "o cliente" segue o gênero do cadastro, como já fazem as outras frases das janelas.

## O campo que o servidor devolve

As chaves novas da ficha (`portal_cliente`, 1143) vêm só para a sócia dona, com o cliente ATIVO ou INATIVO e sem vínculo, como `arquivosParaApagar`. A exceção é `mesmoDocumento`, que também vem com vínculo, para a janela de arquivar (C8).

```ts
export interface SaiDeContratos {
  pedidos: string[];                 // números das propostas ACEITA pedidas e sem contrato (vale também no arquivar, M5)
  lembretes: { n: number; valor: number; origem: "ASTREA" | "ADVBOX_PLANILHA" | null; lancamentos: number } | null; // lancamentos: só para a frase "com 3 lançamentos" (n = 1)
}
export interface ConversasParaApagar { conversas: number; naFila: number; automacoes: number; ficam: number; ficamCom: (PessoaRef & { genero?: "F" | "M" })[]; ficamComMais: number }
export interface MesmoDocumento { id: string; nome: string; situacao: "ATIVO" | "INATIVO" | "ARQUIVADO"; desde: string; contratoOuProcesso: boolean; pedidoAberto: boolean }
// FichaCliente
saiDeContratos?: SaiDeContratos;
conversasParaApagar?: ConversasParaApagar;
mesmoDocumento?: MesmoDocumento[]; mesmoDocumentoMais?: number;
assinaPorOutro?: (PessoaRef & { papel: string })[];   // papel já em texto: "como mãe e responsável legal", "assinava até os 18"
basesDeCondicao?: string[];        // M2/F3.179: números das propostas com "sobre" em ÊXITO ou RECORRENTE (com a D3 da outra frente)
baixasComExplicacao?: number;      // M2/F3.193
// FichaProposta (M5)
clienteSituacao: SituacaoCliente; clienteSaiuEm: string | null;  // excluido_em ou arquivado_em
// POST /clientes/:id/exclusao (e /arquivar-lgpd): corpo ganha abrirNoMesmoDocumento: string[] (ids marcados); retorno ganha mesmoDocumento?: PessoaRef[] (os que ficaram com pedido aberto)
```

- **A caixa da B'** manda os ids marcados. O servidor só aceita id que `cliente_mesmo_documento` devolve na hora. Outro id volta como erro de campo `abrirNoMesmoDocumento`, e a janela mostra "Um dos cadastros mudou. Feche e abra a janela de novo." no aviso de erro do topo. Isso muda o schema da api-portal, então **a api-portal precisa ser publicada**.
- **A variante da faixa** (item 10) sai de uma marca no pedido. Pode ser a observação fixa (sem protocolo, A1) ou um campo no evento `cliente.exclusao_pedida`. Na `PedidoExclusao` da ficha, o mais simples é `origem?: "MESMO_DOCUMENTO"`.
- `ConversasParaApagar.ficamCom[].genero` é opcional. Sem ele, a dica diz "outro cliente". Pode sair.

## Os estados desenhados (28, cada um em computador e celular)

| Estado | Página | O que mostra |
|---|---|---|
| `exc-conversas-uma` | exclusao | "A conversa do WhatsApp", sem fila, sem dica |
| `exc-conversas-varias` | exclusao | "As 2 conversas…", com a mensagem na fila |
| `exc-conversas-e-fica` | exclusao | As 2 que saem e a dica de Rosa |
| `exc-so-fica` | exclusao | Nenhuma sai: a dica dentro da linha dos contatos |
| `exc-conversas-alternativa-fica` | exclusao | Alternativa C5 (B), não recomendada |
| `exc-pedido-contrato` | exclusao | A proposta sem o pedido, em "O que fica" |
| `exc-lembrete` | exclusao | Aviso do valor em aberto (C10 a) e o histórico no quadro da lei |
| `exc-lembrete-alternativa-linha` | exclusao | Alternativa C10 (c), só a linha do plano, não recomendada |
| `exc-mesmo-cpf` | exclusao | Um outro cadastro, caixa marcada |
| `exc-mesmo-cpf-desmarcado` | exclusao | A caixa desmarcada, com a sugestão de corrigir o CPF |
| `exc-mesmo-cpf-pedido` | exclusao | Com "Pedido registrado por Diego Martins" (b13) |
| `exc-mesmo-cpf-varios` | exclusao | Um inativo com pedido já aberto e um ativo com processo |
| `exc-assina-por-outro` | exclusao | Dica da C9 |
| `exc-sobre-condicao` | exclusao | Linha da F3.179 |
| `exc-baixa-explicacao` | exclusao | Linha da F3.193 |
| `exc-tudo` | exclusao | Tudo junto (o pior caso de altura) |
| `exc-feito-mesmo-cpf` | exclusao | Mensagem de feito (M3) |
| `arq-mesmo-cpf` | exclusao | Janela de arquivar com o aviso do mesmo CPF (C8) |
| `arq-pedido-contrato` | exclusao | Janela de arquivar com o pedido de contrato (C2 = A) |
| `ficha-pedido-mesmo-cpf` | exclusao | Ficha de Marina A. Coelho, para a dona (M4) |
| `ficha-pedido-mesmo-cpf-equipe` | exclusao | A mesma ficha, para Diego (equipe) |
| `proposta-aceita-excluido` | comercial | "Não vira contrato", cliente excluído |
| `proposta-aceita-arquivado` | comercial | "Não vira contrato", cliente arquivado (C2) |
| `proposta-pedir-recusado` | comercial | O pedir recusado, já recarregado |
| `novo-contrato-cliente-excluido` | contratos | Aviso do formulário pelo link do sino |
| `novo-contrato-cliente-arquivado` | contratos | O mesmo, arquivado (C2) |
| `lembrete-excluido-na-hora` | lembretes | Janela de dispensar aberta antes |
| `trazer-excluido-na-hora` | lembretes | "Trazer de volta" com a página aberta antes |

Com a C4 = (b) (o lembrete fica e o escritório dispensa à mão), os quatro estados extras do plano ficam para desenhar depois, se a Carol escolher essa opção.

## Decisões de desenho, e por quê

1. **A proposta vai para "O que fica", e não para "O que é apagado"** (b14). Nada da proposta se apaga. Dizer "apagado" faria a dona procurar a proposta e achá-la.
2. **O lembrete virou aviso no topo** (C10 a). É a única coisa na janela que pede uma ação antes de excluir (cobrar ou não). Por isso fica no alto, com o caminho para cobrar: criar o contrato e atender arquivando.
3. **A caixa da B' fica no próprio aviso do mesmo CPF.** A escolha e a informação que a justifica ficam juntas, e a caixa fica fora do quadro "O pedido", que é sobre este cadastro. Ela vem marcada, e desmarcar mostra na hora o que acontece.
4. **O link para a ficha do outro cadastro abre em outra aba.** Fechar a janela perderia a data, o canal e a conferência já marcados.
5. **A ordem dos avisos do topo**: primeiro o erro, a falha ou o pedido registrado (sempre um só, como hoje), depois o mesmo CPF e por último o valor em aberto. O primeiro fala do que acabou de acontecer na janela. Os dois novos são sobre o que fazer antes.
6. **As dicas ficam dentro da linha a que se referem**, como a dica aprovada do resumo do atendimento: a da conversa dentro das conversas (ou dos contatos) e a de quem assina dentro da qualificação.
7. **"Guarda o registro de Rosa", e não "o número é dela"** (b3). E a frase diz o que importa à dona: as mensagens de Marina nessa conversa também ficam.
8. **A faixa do outro cadastro não mostra protocolo nem observação** (A1). Para a dona, o título já diz de onde veio. Para a equipe, nada aponta para o cadastro excluído.
9. **Na proposta, sai o que contradiz "Não vira contrato"**: os botões, o selo, o quadro "A proposta aceita vira contrato." e, no excluído, o Word (apagado na exclusão) e o "Edite a proposta para escrever" (a proposta aceita não se edita).
10. **Formulário e lembretes reusam peças aprovadas**: o aviso "nao-aceita" do produto e o conflito aprovado "Este lembrete já saiu da lista.", com o mesmo botão "Ver a lista atualizada", no lugar do "Fechar" do plano.
11. **`trazer-excluido-na-hora` ganhou estado** (b15). O aviso fica no topo da lista, porque o "Trazer de volta" não abre janela.

## Alternativas

- **C5 (B)** (`exc-conversas-alternativa-fica`): o que fica da conversa numa linha à direita. Fica mais longa e separa a conversa em dois lugares.
- **C10 (c)** (`exc-lembrete-alternativa-linha`): só a linha do plano, em "O que é apagado". Não avisa que o valor perde o dono.
- **C7 (A)**, só avisar: é o `exc-mesmo-cpf` sem a caixa. Não precisa de captura.
- **C2 (B)**, o arquivado fica na lista com selo: não foi desenhado. Ninguém consegue resolver esse pedido.

## Uma observação (não muda este desenho)

A linha "Sobre o que se cobra o êxito" e a "explicação da baixa" só existem se a Carol aprovar a F3.179 e a F3.193 na outra frente. Sem elas, as linhas não aparecem e nada mais muda.

## Como abrir e como refazer

- `index.html` mostra os 28 estados em computador (1440) e celular (412), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- `exclusao.html`, `comercial.html`, `contratos.html` e `lembretes.html` abrem sozinhos por `?estado=…`. Abaixo de 760 px viram a versão de celular. As páginas trazem também os estados aprovados de onde vieram.
- As capturas da janela são longas (a janela inteira, sem rolagem interna), como na F3.156 e na F3.177. A conferência roda antes, no tamanho normal (1440 × 900 e 412 × 915).
- `_fonte/` (as cópias aprovadas não mudam):
  - `comum.py`, `clientes.py`, `pendencias.py`, `f155.py`, `f156.py`, `f177.py` e `webp.py` são as cópias do aprovado `portal-exclusao-historico/_fonte`. `f181.py` executa o `f177.py` aprovado até antes dos estados dele, acrescenta as peças `f181-` e grava `exclusao.html`. Ele confere com `assert` que, sem as chaves novas, a janela é a aprovada.
  - `contratos/` tem as cópias aprovadas de `portal-recibo-recorrente/_fonte`: `pecas`, `contratos`, `comercial`, `telas`, `sino` e `rr_dados`. O `comum.py` é a cópia aprovada que lê o caminho de `T3JUS_APROV` (a de lá apontava para outra máquina). `f181_contratos.py` grava `comercial.html` e `contratos.html`.
  - `lembretes/` tem as cópias aprovadas de `portal-importacao-sobras-rodada2/_fonte`, com `jornada/`. `f181_lembretes.py` grava `lembretes.html`.
  - `nomes_181.py` troca os nomes e as datas do desenho aprovado pelos dados do plano e põe a marca de hoje nas páginas antigas.
  - `casos_181.py` gera a lista e o `index.html`, e `fotos_181.cjs` é o `fotos_177.cjs` aprovado lendo `casos_181.json`.
  - `sh _fonte/gerar.sh .` refaz tudo. O axe vem de `AXE_PLAYWRIGHT`.
- **Conferência** (`_conferencia.json`): 56 capturas com deviceScaleFactor 2, sem nenhuma violação do axe (WCAG 2.0, 2.1 e 2.2, A e AA), sem rolagem lateral, sem alvo menor que 44 px e sem erro de script.

## Perguntas para a Carol

1. **Outro cadastro com o mesmo CPF (C7).** Ao excluir, a janela já vem com a caixa marcada "Abrir também um pedido de exclusão no cadastro de Marina A. Coelho", e você desmarca só se tiver certeza de que é outra pessoa? **Recomendado: sim (B').** Nada é apagado sem você conferir, e o pedido não se perde. As outras opções: (A) só avisar, sem a caixa; (B) abrir o pedido sempre, sem caixa; (C) excluir os dois juntos; (D) impedir até juntar os cadastros.
2. **A janela de arquivar também mostra o outro cadastro, com a mesma caixa (C8)?** **Recomendado: sim.**
3. **O valor em aberto do sistema antigo (C10).** O aviso no topo ("Há R$ 1.840,00 em aberto no Astrea… se o escritório vai cobrar, crie o contrato antes") serve? **Recomendado: sim (a).** As outras: (b) com lembrete aberto, a janela vira a de arquivar e nada se apaga; (c) só uma linha, sem aviso.
4. **O lembrete do cliente excluído sai sozinho de Contratos › Lembretes, dos totais e dos dispensados (C4)?** **Recomendado: sim (A).** A outra: (B) fica, e o escritório dispensa à mão, o que pede mais quatro telas.
5. **O pedido de contrato do cliente excluído sai sozinho de Contratos, e pedir de novo é recusado (C1)?** A proposta fica no Comercial com "Não vira contrato". **Recomendado: sim (A).**
6. **O cliente arquivado a pedido tem a mesma regra (C2)?** O pedido sai de Contratos, a proposta mostra "Não vira contrato" e a janela de arquivar avisa. **Recomendado: sim.**
7. **As propostas em andamento do excluído, que hoje ficam para sempre em "Em andamento" e contam no Funil (C3).** **Recomendado: abrir um item novo para resolver depois.**
8. **As conversas (C5).** O que fica da conversa (datas, quem atendeu e os momentos) vai na própria linha, e não numa linha a mais à direita? **Recomendado: na mesma linha.**
9. **A conversa que fica com outra cliente (C6).** A dica com o nome dela ("…porque guarda o registro de Rosa Alves Coelho, outra cliente. As mensagens de Marina nessa conversa também ficam.") serve? **Recomendado: sim, com o nome.**
10. **Quem assina por outro cliente (C9).** Só a dica "Marina também assina por João Coelho… o nome e o CPF dela continuam na ficha dele"? **Recomendado: sim.**
11. **Os textos novos.** Você aprova os textos e as mudanças da ficha da proposta, do formulário de contrato, da faixa na ficha do outro cadastro e da mensagem de feito, que não manda mais dizer "atendido" enquanto o outro cadastro estiver aberto? **Recomendado: sim.** Na proposta do excluído, também saem o botão do Word (o arquivo foi apagado) e o quadro "A proposta aceita vira contrato."
