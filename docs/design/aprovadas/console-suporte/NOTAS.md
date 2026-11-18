# Console · Suporte de acesso: notas

Tela nova do Console T3jus para a Carol aprovar antes de virar código. É a página em que o Suporte e a Administração ajudam sócios e equipe dos escritórios clientes a entrar no Portal.

- Ideia principal: PT-23 ("a equipe nunca vê nem escolhe a senha; a redefinição vai só para o canal já verificado").
- Ideias de apoio: PT-08 (token de uso único, sessões revogáveis, senha e token fora do histórico) e PT-20 (acesso próprio, por convite).
- Ideias que pesam no desenho: PT-24 (cada função só com os escritórios atribuídos) e PT-03 (nada é apagado).

A tela parte do Console v1 aprovado. Usa a mesma moldura (trilho vinho, topo com trilha, gaveta no celular) e as mesmas peças: folha, selos, avisos, janela com `<dialog>`, erros presos ao campo, toast e os estados vazio, carregando e erro. Segue a IDENTIDADE.md, o conceito Gabinete e o design system D2.

## Como abrir

- `index.html` mostra todas as telas em computador (1440) e celular (412), com legenda. Clique numa imagem para abrir o HTML naquele estado.
- São dois HTML que abrem sozinhos, com as fontes, o CSS e os ícones embutidos:
  - `suporte.html`: a página nova;
  - `ficha-socio.html`: a ficha do cliente aprovada, aba Sócio, só com o atalho novo.
- O `index.html` usa o Google Fonts.
- O estado vem do endereço (`?estado=`). Exemplos: `suporte.html?estado=autenticador-erro` e `suporte.html?estado=ficha-convite`. Os estados são: `busca`, `resultados`, `sem-resultado`, `carregando`, `erro`, `ficha`, `ficha-sem-autenticador`, `ficha-convite`, `senha`, `senha-erro`, `senha-falha`, `senha-limite`, `desconectar`, `autenticador`, `autenticador-erro`, `convite`, `senha-enviada`, `desconectado`, `autenticador-tirado`, `convite-reenviado` e `sem-permissao`.
- `?papel=` troca quem está vendo (`suporte`, o padrão, `admin`, `implantacao` ou `financeiro`), como nos HTML aprovados. Na ficha: `ficha-socio.html?aba=socio&papel=suporte`.
- Abaixo de 760 px, os HTML viram a versão de celular. O menu (gaveta), os botões de abrir e fechar janela, o Esc e o fechar do aviso funcionam. O resto é desenho.
- Conferência automática, feita pelo `fotos.cjs`:
  - nas 44 capturas (22 estados × 2 tamanhos), o axe (WCAG 2.0, 2.1 e 2.2, A e AA) não achou nenhuma violação;
  - nenhuma tela tem rolagem lateral;
  - nenhum erro de script.
- A pasta `_fonte/` guarda os scripts que geram tudo. `sh gerar.sh <pasta>` roda, nesta ordem:
  - `suporte.py` e `ficha_socio.py`: os dois HTML;
  - `casos.py`: a lista de estados e o `index.html`;
  - `fotos.cjs`: capturas com deviceScaleFactor 2, o axe, a rolagem lateral e os alvos menores que 44 px;
  - `webp.py`: converte as capturas para WebP.
- O `comum.py` tira o CSS e os ícones do `console-v1/equipe.html` aprovado, sem mudança.

## Decisões de design

1. **Entrada pelo item "Suporte", que já existe no trilho aprovado (grupo Áreas).**
   - Ele leva a `/suporte`, e a página se chama "Suporte de acesso" (sobretítulo "Suporte", trilha "Console › Suporte de acesso › pessoa").
   - Não criei um item novo porque o "Suporte" do trilho aprovado ainda não levava a lugar nenhum.
   - Quem não tem Suporte nem Administração (Implantação e Financeiro) não vê o item. Se abrir o endereço direto, vê a tela "Esta página é de Suporte e Administração". É o mesmo caminho da Equipe aprovada.
2. **Duas formas da página.**
   - **Buscar:** cabeçalho âmbar, como na Equipe T3jus. Embaixo, a folha de busca e os resultados; ao lado, "Como funciona", com as quatro regras: ninguém vê a senha, o link vai só para o e-mail já cadastrado, confira quem pede e tudo fica no histórico.
   - **Ficha da pessoa:** o cabeçalho âmbar passa a ter o nome da pessoa, o papel, o selo da situação e o link de volta para os resultados. Embaixo vêm, nesta ordem:
     - Situação da conta;
     - O que dá para fazer;
     - Histórico de suporte.

     Ao lado ficam os escritórios da pessoa e a folha "Antes de agir".
3. **A busca vai por nome ou por e-mail e mostra só quem é dos escritórios que você atende** (PT-24, como a carteira do Suporte aprovada).
   - O texto diz isso duas vezes: no subtítulo da busca e no pé dos resultados. Ele também diz o que fazer quando a pessoa não aparece: pedir à Administração para atribuir você ao cliente.
   - Cada resultado é uma linha que funciona como link inteiro. Ela mostra o nome (com o termo buscado marcado), o e-mail, cada escritório com o papel (sócia dona, sócia, equipe) e a situação: "Acesso em dia", "Convite pendente" ou "Convite vencido".
4. **Situação da conta (só leitura):**
   - mostra o e-mail cadastrado, o convite, a senha (criada ou não, e a última troca), o autenticador, a última entrada e quantos aparelhos estão conectados;
   - o e-mail aparece inteiro na ficha, porque o Console já mostra esse dado na aba Sócio aprovada, e vem com a nota "não muda por aqui";
   - uma linha fixa diz que ninguém da equipe vê a senha nem o link.
5. **Nas janelas, o e-mail aparece mascarado** (ma***@ribeiromatos.adv.br).
   - A janela explica para que serve: "Se Marina perguntar, leia assim. Não dite o endereço inteiro nem mande para outro."
   - Assim, quem liga se passando pela pessoa não descobre o e-mail.
   - Para leitor de tela, o mascarado vira "e-mail que começa com 'ma' e termina em @ribeiromatos.adv.br".
   - Não existe campo de e-mail em nenhuma janela: o destino não se escolhe.
6. **Ações, cada uma numa linha** com ícone, o que acontece e o botão. O que não se aplica não vira botão desabilitado: aparece apagado, com o motivo escrito, ou nem aparece.
   - **Mandar link de nova senha:** vale 1 hora e é de uso único. A senha atual vale até a pessoa criar a nova. Se a pessoa já recebeu 3 links na última hora (`limite_recuperacao_max`), a janela mostra quando libera e o que dizer a ela (procurar no spam e usar o link mais novo).
   - **Desconectar de todos os aparelhos:** encerra as sessões em todos os escritórios. A senha e o autenticador não mudam. Sem aparelho conectado, a linha diz "Nenhum aparelho conectado agora".
   - **Tirar o autenticador:** só aparece para quem tem um.
     - Usa `alertdialog` e botão de perigo, com o foco começando no Cancelar, como "Desativar" e "Retirar" no aprovado.
     - Pede para conferir a identidade pelo telefone da ficha do escritório (o número aparece na janela) e marcar "Conferi a identidade…". A marcação é obrigatória e fica no histórico.
     - Também desconecta a pessoa de todos os aparelhos, para quem estiver com o aparelho perdido não continuar dentro.
   - **Reenviar convite:** quando a senha ainda não foi criada, vira a ação em destaque (faixa âmbar e botão principal). O link anterior deixa de valer, e o novo vale 1 hora. Link de nova senha e desconectar aparecem apagados, com o motivo.
7. **O motivo é obrigatório em todas as ações.**
   - É um texto livre de até 300 caracteres, com contador e um exemplo no campo.
   - A ajuda diz que o motivo fica no histórico com seu nome e a hora, e pede para não escrever senha nem código (PT-13).
   - Com o campo vazio, o erro segue o padrão aprovado: resumo no topo ("Falta acertar 1 ponto… Nenhum link foi enviado."), erro preso ao campo com `aria-invalid` e `aria-describedby`, e foco no primeiro campo com erro. O botão de enviar nunca fica desabilitado por validação.
8. **Falha do servidor:** a janela continua aberta com o motivo escrito. O aviso diz que nada foi enviado, o botão vira "Tentar de novo" e aparece o código para o suporte técnico.
9. **Sucesso:**
   - aparece o aviso flutuante (toast), com o botão de fechar;
   - a ficha já volta atualizada: aparelhos em 0, autenticador "Não cadastrado · tirado hoje" e convite "Pendente, vale até 16h10";
   - a linha nova aparece destacada no topo do histórico, com o motivo.
10. **Histórico de suporte:**
    - segue o histórico aprovado: agrupado por dia, com hora, autor e ação;
    - embaixo de cada evento vêm o detalhe (para onde foi, quantos aparelhos, identidade conferida) e o motivo em Alegreya itálico, com o filete âmbar das notas internas;
    - sem histórico, uma linha explica o que vai aparecer ali;
    - para quem ainda não entrou, mostra também o envio e o vencimento do convite.
11. **A conta é uma só.** A lateral lista os escritórios da pessoa com o papel em cada um e avisa que senha, autenticador e aparelhos valem para todos. O papel quem muda é o sócio dono, no Portal.
12. **Atalho na ficha do cliente:** na aba Sócio aprovada, o botão "Suporte de acesso" fica no alto da folha, ao lado do selo do convite. Ele abre a ficha de acesso da sócia.
    - Aparece só para Suporte e Administração.
    - No celular, ocupa a largura inteira, embaixo do selo.
    - Nada mais muda na tela aprovada.
13. **Celular:** é a gaveta aprovada. Tudo vira uma coluna (busca, resultados, depois a lateral). Os botões das ações ocupam a largura inteira, e as janelas sobem de baixo com o rodapé fixo.

## Acessibilidade (WCAG 2.2 AA)

- **axe:** zero violações nas 44 capturas (WCAG 2.0, 2.1 e 2.2, A e AA). Nenhuma tela tem rolagem lateral, em 1440 nem em 412.
- **Contraste:** a tela usa só os pares do `contraste.md` do D2. O texto sobre âmbar é tinta ou vinho escuro, e o âmbar nunca é texto.
- **Alvos:** todos os controles têm 44 px ou mais, inclusive os links de escritório e o "‹ Resultados".
  - A única exceção que o script acha é a marca "T3jus" no trilho (204 × 30 px), que vem do Console aprovado e passa no mínimo de 24 px da WCAG 2.5.8.
  - O rótulo inteiro da caixa de marcar é o alvo.
- **Foco:** anel de 3 px em #AC3F6B (#F2CDB3 no vinho). As janelas são `<dialog>` com `showModal()`: o foco fica preso, Esc fecha e o foco volta ao botão que abriu.
  - Em "Tirar o autenticador", o foco começa no Cancelar.
  - Nos erros, vai para o primeiro campo com erro.
  - Na falha, vai para "Tentar de novo".
- **Rótulos:** todo campo tem `label`. A busca é um `form` com `role="search"`. O motivo tem a ajuda ligada por `aria-describedby` e `aria-required`. A conferência é um `fieldset` com `legend` (só para leitor de tela).
- **Avisos de estado:**
  - o carregando usa `aria-busy` no botão e na lista, e um texto só para leitor de tela;
  - o erro usa `role="alert"`;
  - a contagem de resultados, o vazio e o sucesso usam `role="status"`;
  - o limite usa `aria-disabled` no botão, ligado ao aviso por `aria-describedby`.
- **Cor:** nada depende só dela. Os selos têm texto e ícone, as ações fora do alcance têm o motivo escrito e o motivo no histórico tem o prefixo "Motivo:" para leitor de tela.
- **Correção no Console aprovado:** o link da marca na barra do celular tinha `aria-label="T3jus Console, início"`, que não contém o texto visível. A versão atual do axe acusa isso (`label-content-name-mismatch`, WCAG 2.5.3). Aqui e no `ficha-socio.html`, o nome passou a ser o texto visível mais ", início" só para leitor de tela. Vale corrigir o mesmo nas telas aprovadas quando forem programadas.

## O que precisa de dado novo no servidor

Hoje o e-mail, a senha, o autenticador e as sessões ficam só no Supabase Auth (`pessoas.id` aponta para `auth.users`). O `historico` já aceita evento com `escritorio_id` vazio.

| Onde | O que falta | Hoje |
|---|---|---|
| Permissão | Ações novas em `funcao_acoes` para Suporte e Administração: `console.suporte_acesso.ver`, `.link_senha`, `.desconectar`, `.tirar_autenticador` e `.reenviar_convite`. O escritório-alvo vem dos vínculos da pessoa buscada, conferidos contra os escritórios atribuídos a quem age (PT-24) | Suporte só "vê a ficha e escreve notas" |
| Busca | `GET /v1/console/suporte/pessoas?q=`: busca por nome ou e-mail, só em pessoas com vínculo ativo ou convite em escritórios atribuídos a quem busca. Para cada pessoa: id, nome, e-mail, escritórios com o papel e a situação (convite pendente, vencido ou acesso em dia). Paginação pelo cursor da API | Não existe |
| Ficha de acesso | `GET /v1/console/suporte/pessoas/{id}`, montada a partir do Auth: e-mail e se está confirmado, convite (enviado, vence, venceu, aceito), senha criada e data da última troca, autenticador (fatores TOTP verificados e a data), última entrada (`last_sign_in_at`) e número de sessões ativas | Não existe; os dados estão em `auth.users`, `auth.mfa_factors` e `auth.sessions` |
| Última troca de senha | Evento `acesso.senha_trocada` no `historico` (sem token), porque o Auth não guarda essa data separada | Não existe |
| Telefone para conferir | O telefone da ficha do escritório em que a pessoa tem o vínculo (o contato principal da ficha aprovada) | Existe na ficha; falta trazer para cá |
| Link de nova senha | `POST …/{id}/link-senha` com `motivo`: gera a recuperação pelo Auth só para o e-mail cadastrado, sem devolver o link. Respeita `limite_recuperacao_max` e devolve `LIMITE` com a hora em que libera. Resposta: e-mail mascarado e validade | O fluxo de recuperação do próprio usuário já existe (`NovaSenha`); falta a chamada pelo Console |
| Desconectar | `POST …/{id}/desconectar` com `motivo`: encerra todas as sessões (logout global no Auth) e apaga as linhas de `sessoes_escritorio` da pessoa. Devolve quantas sessões foram encerradas | Não existe |
| Tirar o autenticador | `POST …/{id}/tirar-autenticador` com `motivo` e `identidade_conferida = true` (sem isso, `CONFERENCIA_OBRIGATORIA`): apaga os fatores TOTP, encerra as sessões e marca que o próximo login pede um novo cadastro | Não existe |
| Reenviar convite | `POST …/{id}/reenviar-convite` com `motivo`: invalida o link anterior e gera um novo de 1 hora, só para o e-mail do convite | A Equipe do Portal já prevê reenviar; falta pelo Console |
| Motivo | Validação comum: obrigatório, de 1 a 300 caracteres, com o erro `MOTIVO_OBRIGATORIO`. Guardado em `historico.dados.motivo` | Existe em `console_mudar_estagio`; falta aqui |
| Histórico de suporte | Eventos `suporte.link_senha`, `suporte.desconectou`, `suporte.tirou_autenticador` e `suporte.reenviou_convite`, com `entidade = 'pessoa'`, `entidade_id` = id da pessoa e `dados` = motivo, e-mail mascarado, número de sessões e identidade conferida. Nunca o link nem o token (PT-08 e PT-13). Também os eventos de convite (enviado e vencido). Leitura: `GET …/{id}/historico` por cursor | A tabela `historico` existe; faltam as ações e a leitura por pessoa |
| Histórico do escritório | Registrar o mesmo evento também com o `escritorio_id` de cada vínculo, para o sócio dono ver no histórico da equipe do Portal (depende da pergunta 3) | A conferir |

Nenhuma tabela nova é obrigatória: tudo cabe no Auth, em `historico`, em `funcao_acoes` e em `configuracoes`. Se a Carol quiser a dupla aprovação para tirar o autenticador (pergunta 2), aí entra uma tabela de pedidos pendentes.

## Perguntas para a Carol

1. **Quem o Suporte encontra na busca?** A proposta segue o PT-24: o Suporte vê só pessoas dos escritórios que atende, e a Administração vê todos.
   - **Recomendo** manter assim, como a carteira do Suporte aprovada.
   - A outra saída é dar ao Suporte a busca em todos os clientes. É mais rápido no atendimento, mas abre e-mails de clientes que a pessoa não atende.
2. **Tirar o autenticador basta uma pessoa?** Hoje é uma pessoa, com a conferência pelo telefone da ficha marcada, o motivo e o registro no histórico.
   - **Recomendo** começar assim e avisar a própria pessoa por e-mail na hora: "seu autenticador foi tirado pelo suporte; se não foi você, fale com o escritório".
   - A dupla aprovação (uma segunda pessoa da Administração confirma) é mais segura, mas trava o atendimento fora do horário.
3. **O sócio dono fica sabendo quando o Suporte mexe no acesso de alguém da equipe dele?**
   - **Recomendo** que sim, pelo histórico da equipe no Portal ("Suporte T3jus desconectou Diego de todos os aparelhos"), sem e-mail.
   - O motivo fica só no Console.
4. **Aparelhos conectados: só o número ou a lista?** A lista teria tipo de aparelho, navegador, cidade aproximada e última atividade.
   - **Recomendo** só o número e a última entrada nesta versão (cadastro mínimo, PT-11 e PT-13).
   - A lista ajudaria a tirar um aparelho só, mas guarda IP e localização de cliente.
5. **Quando a pessoa perdeu o acesso ao próprio e-mail, quem resolve?** Esta tela nunca troca o e-mail: a redefinição vai só para o canal já verificado (PT-23).
   - **Recomendo:**
     - para alguém da equipe do escritório, o sócio dono retira a pessoa e convida de novo com o e-mail novo;
     - para o sócio dono, a Administração usa "Convidar outra pessoa como sócio dono", na aba Sócio aprovada.
   - A tela só aponta esses caminhos, sem um "trocar e-mail" no Console.

## Observações

- **Validade do convite:** a aba Sócio aprovada diz "um novo vale por 7 dias", mas o servidor usa 1 hora para convite e recuperação (`otp_expiry` e `sessao.ts`). Esta tela segue o servidor (1 hora). O texto da aba Sócio precisa ser alinhado quando for programado, e no `ficha-socio.html` ele ficou como foi aprovado.
- **Na aba Sócio, o atalho fica ao lado do "Reenviar convite por e-mail".** Os dois botões convivem: o da ficha é o caminho da Implantação, e o do Suporte pede o motivo. Se a Carol preferir um caminho só, o reenviar da ficha pode passar a pedir motivo também.
- **A entrega que programar esta tela deve citar PT-23 como atendida.** PT-08 fica pendente no painel, porque login, autenticador obrigatório para a equipe e o resto não estão nesta tela.
- Pessoas, escritórios, telefones e códigos são fictícios. Bruno Seixas (Suporte) é quem está usando a tela, como na Equipe aprovada. Renata Lima e a Cedro & Lima são as mesmas da ficha aprovada.
- Horário dos exemplos: 18/11/2026, 15h10 (Brasília).
- O modo escuro não foi desenhado, como nas outras telas aprovadas.
- Os links que levam a outras telas do Console (carteira, ficha do cliente a partir da lateral) são de desenho e não abrem nada nesta pasta.
