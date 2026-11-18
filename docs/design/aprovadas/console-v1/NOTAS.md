# Console v1: notas

Telas que faltavam no Console T3jus, para a Carol aprovar antes de virar código. Elas continuam as duas telas aprovadas (`console-carteira` e `console-ficha`, aba Sócio) e seguem a IDENTIDADE.md, o conceito Gabinete e o design system D2.

## Como abrir

- `index.html` mostra todas as telas, em computador (1440) e celular (390), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- São três HTML que abrem sozinhos, com as fontes Alegreya e Poppins, o CSS e os ícones embutidos:
  - `ficha.html`: a ficha do escritório, com as seis abas;
  - `carteira.html`: a carteira aprovada, os cartões do celular e a janela de cadastrar escritório;
  - `equipe.html`: a Equipe T3jus.
- O estado vem do endereço: `?aba=` escolhe a aba, `?estado=` o estado e `?papel=` a função de quem está vendo (`admin`, `implantacao`, `financeiro` ou `suporte`). Na carteira, `?gaveta=1` abre o menu do celular.
  - Exemplos: `ficha.html?aba=contrato&estado=envio-erros`, `ficha.html?aba=ficha&papel=suporte`, `equipe.html?estado=reativar`.
- Os HTML são responsivos. Abaixo de 760 px, viram a versão de celular.
- Os botões de abrir janela, fechar janela, Esc e o menu do celular funcionam de verdade. O resto é desenho.
- Conferência automática: em todos os 64 estados, nos dois tamanhos, o axe (WCAG 2.2 A e AA) não achou nenhuma violação, e nenhuma tela de celular tem rolagem lateral.

## Decisões da Carol (18/11/2026)

1. **A implantação volta a ter 4 etapas**, como na tela aprovada: Ficha, Contrato, Equipe e Sócio no Portal. A API já tem o dado:
   - Ficha = o escritório tem contato;
   - Contrato = tem referência do contrato;
   - Equipe = alguém da T3jus está atribuído;
   - Sócio no Portal = o sócio criou a senha.

   Só sai o "14 dias de 21". A abertura mostra "x de 4 etapas".
2. **A carteira aprovada fica como está.** A API já tem as etapas, o estado do sócio, a equipe e a última atividade, e os cartões do celular mostram tudo isso.
3. **A aba se chama "Contrato e documentos"** e ganha os anexos (CO-05):
   - a lista mostra nome, categoria, tipo (PDF ou imagem), tamanho, quem enviou e quando;
   - o envio é por arrastar ou escolher arquivo, com PDF, JPG ou PNG de até 10 MB por arquivo;
   - abrir e baixar geram um link temporário;
   - não há apagar: tudo fica guardado;
   - quem não pode enviar só vê a lista;
   - as categorias são Contrato assinado, Proposta, Documento do escritório e Outro.
4. **O motivo de mudar o estágio é obrigatório.** Com o campo vazio, o erro segue o padrão das telas de acesso: resumo no topo e erro preso ao campo.
5. **O conflito de versão diz quem salvou antes e a que horas**, por exemplo "Rafael Teles salvou esta ficha às 14h32, enquanto você editava."
6. **A Equipe T3jus mostra o e-mail de cada pessoa** e o selo "Convite pendente" para quem ainda não criou a senha.
7. **Reativar alguém abre o cadastro com nome e e-mail preenchidos e as funções em branco.**

## Decisões de design

1. **A abertura da ficha é a aprovada**, com o vinho, o corte para o âmbar e as 4 etapas, sem o prazo. Ela tem quatro formas:
   - em implantação (3 de 4), com "Passar para ativo" bloqueado e o motivo;
   - pronto para ativar (4 de 4);
   - ativo;
   - recém-cadastrado (1 de 4: só Equipe, porque quem cadastra fica atribuída).

   A etapa atual tem a barra clara com contorno, e as que faltam depois dela, a barra apagada.
2. **A abertura é a mesma em todas as abas.** Só a área de baixo muda. Cada aba usa a grade aprovada, com a coluna principal e uma lateral de 340 px. A lateral é contextual:
   - a tratar e resumo, na Ficha;
   - "Como funciona", no Contrato e documentos;
   - o que cada função pode, na Equipe;
   - "Só a equipe vê", nas Notas;
   - o que entra no histórico, no Histórico.
3. **Ver e editar a ficha são dois estados da mesma aba**, não uma janela. A ficha tem contatos em blocos, e uma janela ficaria longa demais. Cada contato é um grupo com nome, papel, telefone e e-mail, e a regra "telefone ou e-mail" aparece uma vez, na legenda.
4. **Conflito de versão:** o formulário continua com o que a pessoa escreveu. No topo, um aviso de urgência diz quem salvou antes e a que horas, compara só os campos que mudaram (salvo agora × o que você escreveu) e oferece duas saídas: "Salvar a minha versão" e "Ficar com a versão salva". Os campos em conflito ganham o selo "Mudou". Nada se perde.
5. **Os erros seguem as telas de acesso.** O botão de enviar nunca fica desabilitado. Ao enviar:
   - um aviso no topo diz quantos pontos faltam;
   - cada erro fica preso ao campo, com `aria-invalid` e `aria-describedby`;
   - o foco vai para o primeiro campo.
6. **Mudar estágio** abre uma janela de confirmação com o caminho "Em implantação → Ativo" e o campo Motivo, obrigatório, que vai para o histórico. Quando o sócio ainda não está no Portal (SEM_SOCIO), o botão fica com `aria-disabled` e o contorno tracejado, e um aviso âmbar explica o motivo, com o atalho "Ir para Sócio".
7. **Documentos:**
   - ficam numa folha entre a referência e o estágio;
   - cada linha tem um ícone de PDF ou imagem, o nome, a categoria (selo), o tipo e tamanho e quem enviou e quando, com Abrir e Baixar à direita (no celular, embaixo);
   - a área de envio tem a categoria dos próximos arquivos e uma zona tracejada com "Escolher arquivos". O campo de arquivo real fica escondido, e o foco aparece no botão. No celular, só o botão aparece, sem "arraste";
   - o envio mostra uma fila: barra de progresso (`<progress>` com rótulo e anúncio `role="status"`) e "Na fila";
   - cada erro fica no arquivo, e um aviso no topo diz quantos falharam. A falha de rede tem "Tentar de novo";
   - abrir mostra "Gerando link…" no botão (`aria-busy`);
   - um rodapé diz que nada é apagado e que o link expira. Não há botão de apagar.
8. **Retirar e desativar usam `alertdialog`** e o botão de perigo (contorno #AC3F6B), e o foco começa no Cancelar. Os erros de regra (ULTIMA_ADMINISTRACAO, JA_ATRIBUIDO, JA_NA_EQUIPE e a conta da própria pessoa) aparecem como texto claro, no lugar onde a pessoa agiu.
9. **Notas e histórico:**
   - a nota nova fica no topo, a lista vem da mais nova para a mais antiga, em Alegreya itálico, sem botões de editar nem de apagar;
   - o histórico vem agrupado por dia, cada evento com a hora, o autor e a ação. Os eventos internos (campo `interno`) têm o selo "Só equipe", e a paginação é "Carregar mais antigos", pelo cursor da API.
10. **Permissões:** a tela esconde o que a função não pode fazer (a decisão é sempre do servidor) e, onde a ausência confundiria, diz quem pode:
    - a Administração tem tudo;
    - a Implantação não edita a referência do contrato e não atribui pessoas, mas envia documentos e muda o estágio;
    - o Financeiro e o Suporte não editam a ficha, não mudam o estágio, não enviam documentos (veem e baixam) e não veem a aba Histórico;
    - o item Equipe, no menu, aparece só para a Administração.
11. **Moldura no celular:**
    - a lateral vira uma gaveta, aberta por uma barra vinho de 56 px fixa no topo, com Menu, a marca, a busca e os avisos;
    - a gaveta é a mesma lateral do computador, com o botão de fechar e o véu, e fecha com Esc;
    - a trilha de navegação some, e o "‹ Carteira de escritórios" da abertura faz esse papel;
    - as abas da ficha viram uma grade de 3 × 2 botões de 44 px ("Contrato" e "Notas" ficam com o nome curto), sem rolagem lateral;
    - as janelas sobem de baixo, com o rodapé fixo.
12. **A carteira no celular:**
    - a tabela vira cartões, e o cartão inteiro é o link;
    - os quatro números ficam em 2 × 2, e "Pedem você agora" vira uma lista;
    - cada cartão mostra estágio, situações, a barra de etapas, o sócio dono (com o estado), a atividade e a equipe.
13. **Equipe:** o e-mail fica embaixo do nome. "Convite pendente" (âmbar, com relógio) entra no lugar de "Ativa". Reativar abre a janela de cadastro com nome e e-mail travados e as funções em branco.

## Acessibilidade (WCAG 2.2 AA)

- Contraste: as telas usam só os pares do `contraste.md` do D2. O axe conferiu cada estado, com zero violações.
- O foco tem anel de 3 px em #AC3F6B. Na barra e na gaveta vinho, o anel passa para #F2CDB3.
- Todo campo tem `label`. As funções ficam em `fieldset` com `legend`. A ajuda e o erro ficam ligados ao campo por `aria-describedby`, e o erro marca o campo com `aria-invalid`.
- Os alvos têm 44 px, e no computador o botão compacto das tabelas tem 36 px. Os selos não são clicáveis.
- O carregando usa `aria-busy` e um texto só para leitor de tela. O erro usa `role="alert"`, e o vazio, o sucesso e o progresso do envio usam `role="status"`.
- Nada depende só da cor: as barras da abertura dizem "resolvido" ou "falta" para leitor de tela, o desabilitado tem contorno tracejado, os eventos internos têm selo escrito e os arquivos com erro têm ícone e mensagem.
- As janelas são `<dialog>` com `showModal()`: o foco fica preso, Esc fecha e o foco volta ao botão que abriu.

## Textos usados

**Ficha**

- Folhas:
  - "Dados do escritório";
  - "Contatos · 2 de até 10";
  - "Editar ficha · Os campos sem “(opcional)” são obrigatórios.".
- Selo do CNPJ: "Dígitos conferidos". Ajuda do CNPJ: "Conferimos os dígitos ao salvar."
- Erros:
  - "Os dígitos do CNPJ não conferem. Confira o número no cartão do CNPJ.";
  - "Informe telefone ou e-mail de Joana.";
  - resumo: "Falta acertar 2 pontos, marcados abaixo."
- Conflito:
  - título: "Rafael Teles salvou esta ficha às 14h32, enquanto você editava.";
  - texto: "Nada do que você escreveu se perdeu. Compare os dois campos que mudaram e escolha qual versão fica.";
  - botões: "Salvar a minha versão" e "Ficar com a versão salva".
- Vazio: "Nenhum contato ainda. Cadastre ao menos uma pessoa do escritório com telefone ou e-mail. Sem contato, o escritório aparece com “Sem contato” na carteira."
- Erro: "Não deu para abrir a ficha. O servidor não respondeu. Nada do que estava salvo se perdeu…", com um código para o suporte.
- Somente leitura: "Você consulta a ficha. Quem edita é a Implantação ou a Administração."
- Abertura: "3 de 4 etapas"; "Libera quando a sócia entrar no Portal."

**Contrato e documentos**

- Referência:
  - título "Referência do contrato · Texto curto, até 120 caracteres.";
  - ajuda: "Número, pasta ou link que leva ao contrato assinado. O arquivo vai em Documentos, logo abaixo.";
  - sem permissão: "Só a Administração altera a referência do contrato."
- Vazio: "Nenhuma referência de contrato. Registre o número, a pasta ou o link do contrato assinado. Enquanto não houver, o escritório aparece com “Sem contrato” na carteira."
- Documentos:
  - folha: "Documentos · 3 arquivos · do mais novo para o mais antigo";
  - envio: "Categoria dos próximos arquivos", "Arraste os arquivos para cá ou" e "Escolher arquivos". Regra: "PDF, JPG ou PNG, até 10 MB por arquivo.";
  - erros: resumo "3 arquivos não foram enviados. Os outros continuam guardados. Veja o motivo de cada um abaixo.", "Tipo não aceito. Envie PDF, JPG ou PNG.", "Tem 14,2 MB; o limite é 10 MB por arquivo. Diminua a resolução da digitalização e envie de novo." e "O envio caiu no meio. O arquivo não foi guardado.", com "Tentar de novo";
  - abrir: "Gerando link…";
  - rodapé: "Nada é apagado: cada arquivo fica guardado com quem enviou e quando. Abrir e Baixar geram um link temporário, que expira sozinho.";
  - vazio: "Nenhum documento ainda. Guarde aqui o contrato assinado, a proposta e os documentos do escritório. Tudo o que for enviado fica guardado.";
  - só leitura: "Você vê e baixa os documentos. Quem envia é a Implantação ou a Administração."
- Estágio:
  - título "Estágio · O estágio só anda para a frente.";
  - bloqueado: "Falta o sócio para passar para Ativo."
- Janela:
  - título: "Passar Cedro & Lima para Ativo?";
  - texto: "A implantação termina e o cliente passa a contar como ativo na carteira. Não dá para voltar pelo Console.";
  - ajuda do Motivo: "Obrigatório. Fica no histórico do cliente, com seu nome e a data.";
  - erro: "Escreva o motivo da mudança. Ele fica no histórico.", com o resumo "Falta acertar 1 ponto, marcado abaixo. O estágio não mudou."
- Sucesso: "Cedro & Lima agora está Ativo. O motivo ficou no histórico do cliente, com seu nome e a data."

**Equipe T3jus no cliente**

- Título: "Quem atende a Cedro & Lima · Só quem está aqui vê este cliente no Console."
- Atribuir:
  - título "Atribuir alguém";
  - ajuda: "Só as funções que a pessoa tem na equipe.";
  - erro: "Rafael Teles já atende este cliente como Implantação."
- Retirar:
  - janela: "Retirar Rafael Teles da Cedro & Lima? Rafael deixa de ver este cliente no Console. As notas e o histórico que ele registrou continuam.";
  - erro: "Não deu para retirar Carol Andrade. O cliente precisa de alguém da Administração…"
- Sem permissão: "Quem atribui e retira pessoas é a Administração."

**Notas internas**

- Ajuda: "Só a equipe T3jus vê. Depois de salva, a nota não muda nem sai." Contador: "0 de 2.000 caracteres".
- Erro: "Escreva a nota antes de salvar."
- Vazio: "Nenhuma nota ainda. Anote o que a equipe precisa saber sobre este cliente: como prefere ser chamado, combinados, cuidados."

**Histórico**

- Título: "Histórico administrativo · Quem fez o quê, e quando. Nada aqui é apagado."
- Paginação: "Mostrando os 5 mais recentes" e "Carregar mais antigos".
- Vazio: "Nada registrado ainda. Cada mudança na ficha, no contrato, no estágio e na equipe aparece aqui, com quem fez e quando."

**Cadastrar escritório**

- Texto: "Comece pelo básico. CNPJ, endereço e contatos você completa depois, na ficha."
- Rodapé: "O escritório entra “Em implantação” e você fica atribuída a ele como Administração."
- Erros: "Escreva o nome do escritório.", "O nome da cidade precisa de ao menos 2 letras." e "Escolha a UF.".
- Enviando: "Cadastrando…".
- Falha: "Não deu para cadastrar agora. O servidor não respondeu. O que você escreveu continua aqui: tente de novo."
- Depois do cadastro, a ficha nova abre com o aviso "Escritório cadastrado. Você está atribuída como Administração. Complete a ficha quando puder."

**Equipe T3jus**

- Cadastrar pessoa:
  - texto: "Mandamos um convite por e-mail. A pessoa cria a senha e cadastra o autenticador antes de entrar.";
  - ajuda do e-mail: "O convite vale 1 hora.".
- Erros: "Esta pessoa já está na equipe: Igor Nogueira." e "Escolha ao menos uma função.".
- Selo: "Convite pendente".
- Funções, erro: "A equipe precisa de ao menos uma pessoa com Administração. Dê a função a outra pessoa antes de tirar a sua."
- Reativar: "Reativar Lia Moura. Lia volta para a equipe só com as funções que você marcar agora. As funções de antes não voltam sozinhas.", com o botão "Reativar Lia".
- Desativar:
  - janela: "Desativar Bruno Seixas? Bruno perde o acesso ao Console na hora. O que ele registrou continua no histórico. Para trazê-lo de volta, use Reativar.";
  - sucesso: "Bruno Seixas foi desativado.".
- Sem permissão: "Esta página é da Administração."
- Descrição das funções (de `funcao_acoes`):
  - Administração: "Tudo: equipe, cadastro de escritórios, contrato, estágio, atribuições e notas.";
  - Implantação: "Edita a ficha, muda o estágio, convida o sócio, vê o histórico e escreve notas.";
  - Financeiro e Suporte: "Vê a ficha e escreve notas.".

## Dados que ainda faltam na API (sem dado ainda)

| Onde aparece | O que falta | Como ficou no desenho |
|---|---|---|
| Carteira, "Pedem você agora" | O critério de ordem e os textos ("Convite expira amanhã") | Mantido como aprovado. |
| Aba Sócio (aprovada) | WhatsApp, OAB, caminho do convite (aberto, criado), Plano e áreas do Portal | Mantida sem mudança. |
| Documentos | Quem pode enviar (ação nova, por exemplo `console.documentos.enviar`) | Desenhado para Administração e Implantação. Financeiro e Suporte só veem e baixam. |
| Documentos | Quanto tempo vale o link temporário | O texto diz só "expira sozinho". |
| Documentos | Se a categoria muda depois do envio | Sem ação de mudar categoria. |
| Histórico | O texto legível de cada `acao`, e se escrever nota ou enviar documento gera evento | A tela traduz cada ação numa frase; falta a lista de ações e dos `dados`. |
| Ficha da Jacarandá | Se já existe convite de sócio | Desenhado como "Ainda não convidado". |

## Observações

- **O CNPJ da ficha aprovada (22.914.870/0001-66) tem os dígitos errados.** O certo é 22.914.870/0001-09, que é o usado aqui. O número antigo virou o exemplo do erro "Os dígitos do CNPJ não conferem".
- Pessoas e escritórios são fictícios. A equipe é coerente com as iniciais da carteira aprovada (CA, RT, IN).
  - No conflito, quem salvou antes é Rafael Teles, da equipe atribuída à Cedro & Lima. Ele entrou no lugar do exemplo "Inês Nogueira", que não está na equipe.
  - Helena Prado é a pessoa com convite pendente.
- O modo escuro não foi desenhado nestas telas. Os tokens do D2 já cobrem o escuro, mas as telas aprovadas foram feitas só no claro.
- Os scripts que geram tudo ficam fora desta pasta: `comum.py`, `ficha.py`, `carteira.py`, `equipe.py`, `casos.py`, `indice.py` e `fotos.cjs` (PNGs com deviceScaleFactor 2, mais o axe e a conferência de rolagem lateral).
