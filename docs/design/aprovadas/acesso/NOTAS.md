# Telas de acesso v1: notas

Três telas que continuam a tela de entrar aprovada (`docs/design/aprovadas/entrar.html`): **Nova senha** (`/redefinir`), **Convite: criar senha** (`/criar-senha`) e **Escolha do escritório** (só no Portal). Cada uma tem a versão de computador (1440×900) e a de celular (390). A Nova senha existe no Portal e no Console. Os desenhos aguardam a aprovação da Carol.

## Como abrir

- `index.html` mostra todas as telas lado a lado, com legenda.
- Cada HTML abre sozinho, com as fontes, o CSS e os ícones embutidos. O estado vem do endereço, por exemplo `redefinir.html?estado=erro`, `redefinir.html?sistema=console&estado=trocada` ou `criar-senha.html?sistema=console&estado=autenticador`.
- Os arquivos `*-celular.html` forçam o layout estreito numa coluna de 390 px. Os outros são responsivos e também viram celular em tela estreita.
- O botão Mostrar, as regras da senha e a busca funcionam de verdade. A lista de senhas vazadas é só de exemplo: experimente `advocacia2024`.

## O que mudou em relação à tela de entrar

**A moldura não mudou.** O lado vinho, a frase, a coluna, a fita, as folhas, o selo, o rodapé, o tamanho do cartão, as fontes Alegreya e Poppins e as nove cores ficam iguais.

O `acesso.css` real foi embutido sem alteração. As peças novas usam o mesmo prefixo `.ac-` e entram no `acesso.css` quando forem programadas:

- `.ac-regras` e `.ac-regra[data-estado=ok|falta|erro|conferindo]`: as regras da senha, com uma bolinha que marca o estado;
- `.ac-erro-campo`: o erro preso ao campo;
- `.ac-convite`: o painel de quem convidou;
- `.ac-etapas`: o passo a passo "1 Senha → 2 Autenticador" no Console;
- `.ac-aceite`: o aceite dos Termos;
- `.ac-disco`: o círculo com o sinal de concluído ou vencido;
- `.ac-esc`, `.ac-esc-atual` e `.ac-selo-p`: as linhas de escritório;
- `.ac-busca`;
- `.ac-sessao` e `.ac-sair`;
- `.ac-cartao-denso`: o espaçamento menor do convite.

**Ícones novos**, no mesmo traço de 1,6 com cantos vivos: busca, seta, sair, relógio e xis.

**Para programar:**

- Na tela de escolha, o `.ac-estado` envolve cada etapa com `display: contents`. Assim o `margin-top: auto` continua empurrando a caixa âmbar e a linha de sessão para o pé do cartão. No React, basta não envolver as etapas.
- No convite, o cartão fica mais apertado (`.ac-cartao-denso`): 34 px no topo e 11 px entre os campos, para caber em 900 px de altura.

## Decisões da Carol (18/11/2026)

1. **Ao trocar a senha, a pessoa sai dos outros aparelhos.** O texto "Por segurança, saímos da sua conta nos outros aparelhos." fica.
2. **O link de nova senha e o convite valem 1 hora.** Todos os textos dizem "1 hora", inclusive nos estados vencidos. Nos textos, "1&nbsp;hora" usa espaço que não quebra, para não separar o número da palavra.
3. **A escolha do escritório aparece sempre** que a pessoa tem mais de um escritório. Não há opção de lembrar a escolha.
4. **A Nova senha também existe no Console**, com os mesmos cinco estados, nos dois tamanhos.
   - O Console usa o sobretítulo "Console T3jus", o lado vinho e os textos da tela de entrar do Console.
   - O e-mail de exemplo é `voce@t3jus.pro`.
   - Em "Senha trocada", o texto é "Pronto. Para entrar, use a senha nova e o código do autenticador."

## Decisões de design

1. **As regras ficam sempre à vista, logo abaixo da senha**, e o campo aponta para elas com `aria-describedby`. Cada regra tem quatro estados: vazia (falta), sinal vinho (cumprida), xis em #AC3F6B (não cumprida) e tracejado girando (conferindo). Nenhuma regra depende só da cor: há um ícone e um prefixo para leitor de tela ("Cumprida:", "Falta:").
2. **A conferência de senha vazada só começa com 12 caracteres.** Antes disso, a regra fica vazia, sem texto extra. A conferência é feita no servidor.
3. **Cada campo de senha tem seu botão Mostrar**, igual ao da tela de entrar, com `aria-pressed` e o rótulo trocando entre Mostrar e Esconder.
4. **O botão de enviar nunca fica desabilitado.** Ao enviar, os erros aparecem presos aos campos (`aria-invalid` e `aria-describedby`), e um aviso no topo diz quantos pontos faltam acertar.
5. **O link vencido já pede o e-mail ali mesmo** e manda um link novo, sem voltar à tela de entrar. A resposta continua neutra, como pede a PT-08.
6. **O convite abre com o painel de quem convidou.** No Portal, aparecem o nome do sócio e o nome do escritório em serifa. No Console, aparece só "Equipe T3jus". O e-mail de acesso aparece no painel, e um campo `username` oculto ajuda o gerenciador de senhas a guardar o par certo.
7. **No Console, o passo a passo deixa claro que vem o autenticador.** O botão diz "Criar senha e seguir", e a etapa 2 é o mesmo cartão "Cadastrar o autenticador" da tela de entrar, agora com o passo a passo no alto.
8. **Escolha do escritório**: o título é "Qual escritório?", que cabe numa linha. A lista vai do mais recente ao mais antigo, e o último usado vem primeiro, com borda vinho, barra à esquerda e o selo "Último usado" (âmbar claro com #4F1D35). Os escritórios não ganham avatar nem monograma, seguindo o conceito "Gabinete": o nome em serifa basta. Cada linha é um botão inteiro, com 64 px ou mais de altura.
9. **A busca aparece só a partir de 7 escritórios.** Ela procura por nome ou cidade, e a contagem tem `aria-live="polite"`. No computador, a lista rola dentro do cartão. No celular, quem rola é a página, para evitar rolagem dentro de rolagem.
10. **Sair fica no pé do cartão**, junto de "Entrou como …". Assim fica perto da lista também no celular.

## Textos usados

**Nova senha** (Portal e Console)

- Título "Nova senha". Texto de apoio: "Para {e-mail}. Escolha uma senha que você não usa em outro lugar."
- Campos "Senha nova" e "Repita a senha nova".
- Regras: "Pelo menos 12 caracteres · faltam N / N caracteres" e "Fora das listas de senhas vazadas · escolha outra".
- Botão "Salvar senha nova" e link "Voltar para entrar".
- Erros: "Falta acertar 2 pontos, marcados abaixo." e "As duas senhas não são iguais."
- Link vencido:
  - título "Link vencido";
  - texto: "Este link já foi usado ou passou do prazo de 1 hora. Por segurança, cada link vale uma vez só.";
  - campo "E-mail de acesso", com a ajuda "Mandamos um link novo para este e-mail. Ele vale por 1 hora.";
  - botão "Pedir novo link";
  - caixa âmbar: "Pediu mais de uma vez? Use o link do e-mail mais recente. Os anteriores deixam de valer."
- Senha trocada:
  - título "Senha trocada";
  - texto no Portal: "Pronto. A partir de agora, entre com a senha nova.";
  - texto no Console: "Pronto. Para entrar, use a senha nova e o código do autenticador.";
  - aviso: "Por segurança, saímos da sua conta nos outros aparelhos.";
  - botão "Entrar";
  - caixa âmbar: "Usa gerenciador de senhas? Confira se ele guardou a senha nova no lugar da antiga."

**Convite: criar senha**

- Título "Criar senha".
- Painel do convite: "Convite de Ricardo Almeida, sócio / Almeida & Prado Advogados / para {e-mail}". No Console: "Convite da Equipe T3jus / Console T3jus / para {e-mail}".
- Campos "Seu nome" (já preenchido), "Senha" e "Repita a senha".
- Aceite: "Li e aceito os Termos de uso e a Política de privacidade." Os links abrem em nova aba, e o leitor de tela anuncia isso.
- Botões: "Criar senha e entrar" no Portal e "Criar senha e seguir" no Console.
- Erro do aceite: "Aceite os Termos para continuar."
- Convite vencido:
  - título "Convite vencido";
  - texto: "Este convite passou do prazo de 1 hora ou já foi usado.";
  - aviso: "Peça um novo a quem convidou você. O convite novo chega por e-mail e vale por 1 hora.";
  - pergunta "Já criou a senha por este convite?", com o botão "Ir para entrar";
  - caixa âmbar: "Quem pode convidar? No Portal, o sócio dono do escritório. É ele quem manda o convite novo."

**Escolha do escritório**

- Título "Qual escritório?". Texto de apoio: "Você tem acesso a N escritórios. Dá para trocar depois, pelo menu."
- Busca: campo "Buscar escritório", com o exemplo "Nome ou cidade". Contagem: "Do mais recente ao mais antigo" sem filtro, ou "N de M escritórios" com filtro.
- Cada linha: "{Cidade, UF} · Última entrada {quando}", ou "Ainda não entrou". O primeiro leva o selo "Último usado".
- Sem resultado: "Nenhum escritório com “…”. Confira a grafia ou busque pela cidade. Se falta um escritório, peça o convite ao sócio dele."
- Pé do cartão: "Entrou como {e-mail}" e "Sair".

## Acessibilidade (WCAG 2.2 AA)

- **Contraste dos pares novos:**
  - #4F1D35 sobre #F2CDB3: 9,1;
  - #6E5562 sobre #F2ECE8: 5,7, e sobre branco: 6,7;
  - #AC3F6B sobre branco: 5,7, e sobre #FBEEF3: 5,1;
  - #692746 sobre #F2ECE8: 9,1;
  - borda #AC788D da bolinha das regras sobre branco: 3,6, acima de 3 para elementos que não são texto.
- **Foco:** o contorno #AC3F6B de 3 px vem do `acesso.css`. Ao trocar de etapa, o foco vai para o `h1`, como já faz o `Entrar.tsx`.
- **Rótulos de verdade:** a busca também tem `<label>` visível. O passo a passo é um `<ol>` com `aria-current="step"`.
- **Alvos:** botões e links com 44 px ou mais, e checkbox de 20 px dentro de um rótulo de 44 px.
- **Conferência automática:** o axe-core (wcag2a, 2aa, 21aa e 22aa) não achou nenhuma violação nos 38 estados (rodado de novo depois dos ajustes da Carol). Nenhum dos celulares tem rolagem lateral: a largura do documento fica em 390 px.

## Dúvidas para a Carol

1. No convite vencido, dá para mostrar o nome de quem convidou, como em "Peça um novo a Ricardo Almeida"? Isso exige que o servidor ainda reconheça o convite vencido. Por enquanto, o texto é genérico.
2. Os nomes de escritórios e de pessoas são fictícios.
