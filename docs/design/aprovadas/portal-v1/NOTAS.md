# Portal v1: notas

Três telas do Portal do advogado para a Carol aprovar antes de virar código:

- a moldura em áreas (PA-01);
- a Equipe do escritório (PA-02, F1.6);
- a área Escritório, com a exportação dos dados (F1.7, PT-15).

Elas partem do Início aprovado (`portal-inicio.html`) e do Console v1 aprovado. Seguem a IDENTIDADE.md, o conceito Gabinete e o design system D2.

## Como abrir

- `index.html` mostra todas as telas em computador (1440) e celular (412), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- `moldura.html`, `equipe.html` e `escritorio.html` abrem sozinhos, com as fontes Alegreya e Poppins, o CSS e os ícones embutidos. O `index.html` usa o Google Fonts.
- O estado vem do endereço (`?estado=`). Exemplos: `moldura.html?estado=juridico`, `equipe.html?estado=retirar-erro` e `escritorio.html?estado=gerando`. No celular, `&mais=1` abre a folha "Mais".
- Abaixo de 760 px, os HTML viram a versão de celular. Os botões de abrir e fechar janela, o Esc e o botão Mais funcionam. O resto é desenho.
- As capturas de celular mostram a página inteira com a barra de baixo no fim, onde ela fica no aparelho depois de rolar. Com janela aberta, a captura mostra só a tela.
- Conferência automática:
  - em 70 capturas (36 estados), o axe (WCAG 2.0, 2.1 e 2.2, A e AA) não achou nenhuma violação;
  - nenhuma tela tem rolagem lateral;
  - nenhum erro de script.
- A pasta `_fonte/` guarda os scripts que geram tudo: `comum.py`, `moldura.py`, `equipe.py`, `escritorio.py`, `casos.py` e `fotos.cjs`. O `fotos.cjs` faz as capturas e roda o axe.

## Decisões da Carol (18/11/2026)

1. **Um sócio dono só cuida da equipe nesta versão.** Fica como estava.
2. **Ao retirar alguém, já se escolhe para quem passa o que é dessa pessoa (EX-10, "nada fica sem dono").**
   - A janela de retirar ganhou o campo obrigatório "Passar o que é de Diego para", que começa vazio.
   - A lista tem só pessoas ativas, e a sócia dona está sempre nela.
   - Uma linha diz o que passa: "tarefas, prazos, cobranças e atendimentos de que Diego é responsável".
   - Sem escolha, aparece o erro preso ao campo, com o resumo no topo (estado `retirar-erro`).
   - O sucesso diz para quem passou.
   - O histórico registra "retirou Caio Mendes da equipe; o que era de Caio passou para Felipe Matos".
   - Para convite pendente, a pessoa nunca entrou: o botão vira "Cancelar convite" e a janela só cancela o convite, sem o campo (estados `cancelar-convite` e `convite-cancelado`).
3. **Quem não é sócio dono vê o Escritório só para ler, sem exportar.** Fica como estava.
4. **No celular, a navegação é uma barra embaixo, no lugar da gaveta.**
   - A barra é fixa, com Início, Conversas, Agenda e Mais.
   - O Mais abre uma folha de baixo com Clientes, as áreas liberadas, Equipe (só para o dono), Escritório, Ajuda e a conta: nome, papel, trocar de escritório e sair.
   - O topo continua com a marca, a busca e os avisos.
   - Os estados de gaveta viraram "Mais aberto", para a sócia e para quem só tem Jurídico.
5. **Alegreya fica** nos títulos. A IDENTIDADE.md e o DC10 ainda dizem Libre Caslon Text e precisam ser corrigidos.

## Decisões de design

1. **A moldura é a do Início aprovado.**
   - Mantém o trilho vinho de 256 px, o cartão do escritório, os grupos e o rodapé com quem está usando.
   - A lateral é "estreita" no sentido de ter um nível só. As seções de cada área não entram no trilho: vão para a barra no alto da área.
2. **Barra de seções da área:**
   - é uma faixa branca logo abaixo do topo, com o nome da área em serifa à esquerda e as seções como abas, no mesmo desenho das abas do Console;
   - no trilho, a área aberta fica destacada como item atual (`aria-current="true"`), e a seção aberta fica marcada na barra (`aria-current="page"`);
   - a trilha do topo mostra "Jurídico › Prazos";
   - no celular, a barra vira uma grade de botões de 44 px, logo abaixo do topo.
3. **As seções propostas para cada área**, tiradas do IDEIAS.md:
   - Comercial: Atendimentos, Propostas, Funil, Origem dos contatos;
   - Contratos: Contratos, Honorários, Procurações e modelos;
   - Financeiro: Resumo, A receber, A pagar, Repasses, Caixa;
   - Jurídico: Casos e processos, Prazos, Tarefas, Petições.
4. **O que a pessoa não pode abrir nem aparece.**
   - O servidor manda a moldura já sem as áreas não liberadas. Quando a pessoa não tem nenhuma área, o rótulo "Áreas" também some.
   - Se alguém abre um link de área não liberada, a tela "Esta área não está liberada para você" diz quem libera e leva ao Início.
5. **O Início segue as áreas.** Quem não tem Jurídico não vê prazos. Quem não tem Financeiro não vê recebimentos nem o atalho "Registrar recebimento". O exemplo é a Paula, da recepção, sem área.
6. **Áreas ainda sem tela** ficam no menu como item normal, como o "Sistema" do Console aprovado.
   - Ao abrir, a barra de seções já aparece. A página diz o que vem e para onde ir enquanto isso.
   - Não usei item desativado: ele ocupa espaço sem levar a nada, e o tracejado no trilho vinho pesa.
7. **Equipe só para a sócia dona.** Quem não é sócia dona não vê o item Equipe. Se abrir o endereço direto, a tela diz que a página é da sócia dona e com quem falar. Os motivos:
   - a página mostra e-mails e o que cada pessoa abre, e quem não muda nada não precisa disso;
   - o Console aprovado fez o mesmo, com a Equipe só para a Administração;
   - os nomes da equipe já aparecem onde importam, como responsáveis em prazos, agenda e conversas.
8. **Lista da equipe:**
   - colunas: pessoa (nome e e-mail), áreas liberadas (selos), situação e ações;
   - a sócia dona vem primeiro, com o selo "Vê tudo" e sem ações. As outras pessoas vêm em ordem alfabética;
   - quem não tem área aparece com "Só as partes comuns";
   - o convite pendente mostra a hora em que vence ("vale até 15h05"). O vencido tem o selo de urgência e a hora em que venceu. Os dois têm Reenviar;
   - o pé da lista explica a regra de 1 hora;
   - no celular, a tabela vira cartões, como no Console.
9. **Convidar e mudar áreas usam as mesmas caixas de marcar.** Cada área vem com uma linha do que ela abre, e embaixo vem escrito o que todos veem.
   - Nenhuma área marcada é válido: a pessoa fica só com as partes comuns.
   - O botão de enviar nunca fica desabilitado. Os erros seguem o padrão aprovado: resumo no topo, erro preso ao campo com `aria-invalid` e `aria-describedby`, e foco no primeiro campo.
10. **Retirar usa `alertdialog`**, com o botão de perigo.
    - O foco começa no campo "Passar o que é de … para", porque ele é obrigatório e não faz nada sozinho. Em "Cancelar o convite", o foco começa no Voltar.
    - O texto diz que o acesso cai na hora e que a autoria não muda. O vínculo é revogado, o que era da pessoa passa para quem foi escolhido, e o que ela registrou continua com o nome dela.
    - Para voltar, convida-se de novo.
    - A sócia dona não tem o botão Retirar.
    - O nome "Cancelar o convite" foi escolhido para não confundir com o "Cancelar" de fechar a janela, que ali vira "Voltar".
11. **O histórico da equipe** segue o histórico do Console: agrupado por dia, com hora, autor e ação, e "Carregar mais antigos".
    - Entram: convite enviado, aceito, vencido e cancelado, mudança de área ("Entrou", "Saiu" e "Ficou"), retirada com a pessoa que recebeu o que era de quem saiu, e exportação dos dados.
    - A exportação tem o selo "Exportação".
12. **Escritório:**
    - os dados ficam só para leitura, numa faixa que diz que, nesta versão, quem muda é a equipe T3jus, com o link para a Ajuda;
    - "Seus escritórios" aparece só para quem tem mais de um. "Trocar de escritório" leva à tela de escolha aprovada (`acesso/escritorio.html`);
    - quem não é sócia dona vê os dados e, no lugar da exportação, "Quem cuida do escritório".
13. **A exportação acontece na própria folha, sem tela nova.**
    - A confirmação diz o que vai no arquivo, o cuidado com dados pessoais (LGPD) e que fica no histórico.
    - Enquanto gera, aparece uma barra sem porcentagem (a API não informa o andamento), com `role="status"`, e o botão fica ocupado (`aria-busy`).
    - No sucesso, aparecem o nome e o tamanho do arquivo. "Salvar de novo" salva o mesmo arquivo, que fica guardado na memória da página: não gera outra exportação nem outra linha no histórico.
    - No erro, a tela diz que nada foi baixado e que nada mudou, oferece "Tentar de novo" e mostra o código para o suporte.
14. **Celular:**
    - o topo é a barra vinho, com a marca "T3jus Portal", a busca e os avisos. Não há mais botão de menu nem gaveta;
    - embaixo fica uma barra branca fixa, com Início, Conversas (com o contador), Agenda e Mais;
    - cada botão tem ícone e rótulo sempre visível e 56 px de altura;
    - o item atual fica em vinho, com um filete no alto e `aria-current`. Quando a página mora no Mais (uma área, Equipe, Escritório, Clientes), o botão Mais fica marcado como atual e, dentro da folha, o item da página também;
    - a barra respeita a área segura do iPhone (`viewport-fit=cover` e `env(safe-area-inset-bottom)`);
    - para não cobrir conteúdo, a página ganha espaço no fim, e o aviso de sucesso sobe para cima da barra;
    - as janelas sobem de baixo e cobrem a barra, porque ficam na camada de cima; o rodapé delas também respeita a área segura;
    - a folha Mais é um `<dialog>` modal com título, botão de fechar e Esc; os grupos seguem os do trilho do computador. O que a pessoa não pode abrir também não aparece ali.

## Acessibilidade (WCAG 2.2 AA)

- **Contraste.** Só entram pares do `contraste.md` do D2.
  - Uma correção: o número do dia no disco âmbar ("vence hoje") passou de vinho (4,4:1, que só vale para texto grande) para vinho escuro #4F1D35 (5,6:1).
  - Isso vale também para o Início aprovado quando for programado.
- **Foco.** O anel tem 3 px em #AC3F6B e passa para #F2CDB3 na barra e na gaveta vinho.
- **Alvos.** No computador, os alvos têm 44 px, e os botões compactos da tabela têm 36 px. No celular, tudo tem 44 px ou mais: 56 px na barra de baixo e 48 px nos itens do Mais.
- **Rótulos e erros.**
  - As áreas ficam em `fieldset` com `legend`.
  - Os erros ficam ligados ao campo por `aria-describedby`, com `aria-invalid`.
- **Avisos de estado.** O carregando usa `aria-busy` e um texto só para leitor de tela. O erro usa `role="alert"`, e o sucesso e o "gerando" usam `role="status"`.
- **Janelas.** São `<dialog>` com `showModal()`: Esc fecha e o foco volta ao botão que abriu.
- **Cor.** Nada depende só dela: os convites têm selo escrito e ícone, e o item atual tem barra, fundo e `aria-current`.

## O que precisa de dado novo no servidor

| Onde | O que falta | Hoje |
|---|---|---|
| Moldura | Na sessão ou em `GET /v1/escritorio`, a lista de áreas da pessoa e se ela é a sócia dona. Hoje vem `funcoes`, que precisa virar `areas` mais `dono`. A moldura sai disso | `{id, nome, funcoes}` |
| Todas as rotas de área | Recusa no servidor (403) quando a área não está liberada, para a tela "não liberada" | Não existe |
| Início | Cada bloco filtrado pelas áreas: prazos (Jurídico), recebimentos (Financeiro) | Não existe |
| Equipe | Listar pessoas: nome, e-mail, áreas, situação (ativa, convite pendente ou vencido) e a hora em que o convite vence | Não existe |
| Equipe | Convidar (nome, e-mail e áreas), com os erros `EMAIL_INVALIDO`, `JA_NA_EQUIPE` (com o nome) e `CONVITE_PENDENTE` | Não existe |
| Equipe | Reenviar convite: invalida o link anterior e gera um novo de 1 hora | Não existe |
| Equipe | Mudar áreas | Não existe |
| Equipe | Retirar pessoa com `passar_para` obrigatório (pessoa ativa do escritório): revoga o vínculo, encerra as sessões dela neste escritório e troca o responsável das tarefas, prazos, cobranças e atendimentos; a autoria fica. Erros `PASSAR_PARA_OBRIGATORIO` e `PASSAR_PARA_INVALIDO` | Não existe |
| Equipe | Cancelar convite pendente (o link deixa de valer), sem `passar_para` | Não existe |
| Equipe | Histórico do escritório com convite, aceite, vencimento, cancelamento, mudança de área (antes e depois), retirada (com para quem passou) e exportação | Não existe |
| Escritório | CNPJ, cidade, UF, endereço, telefone, e-mail e contatos no `GET /v1/escritorio` (o Console já tem esses dados na ficha) | Só `nome` |
| Escritório | Quantos escritórios a pessoa tem, com cidade e áreas em cada um (a tela de escolha já usa uma lista parecida) | A conferir |
| Exportação | Nome de arquivo sugerido no cabeçalho, data da última exportação e o evento no histórico | `POST /v1/escritorio/exportacao` já devolve o JSON |
| Exportação | A lista exata do que vai no arquivo e a confirmação de que senhas, códigos e tokens ficam de fora | A conferir |

## Perguntas respondidas

As cinco perguntas da primeira rodada foram respondidas em 18/11/2026 e estão em "Decisões da Carol", no começo deste arquivo. Não ficou pergunta aberta.

Uma observação para a programação: a passagem do que era de quem saiu (decisão 2) depende de Tarefas, Prazos, Cobranças e Atendimentos terem responsável. Enquanto não existirem, o servidor guarda a escolha no histórico, e a troca vale para essas tabelas quando elas chegarem. A entrega da Equipe deve citar EX-10 como pendente no painel.
