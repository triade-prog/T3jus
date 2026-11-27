# Teste grátis de 7 dias: desenho para aprovação (CO-09, D42)

Desenho das telas do teste grátis feito sobre as telas aprovadas, seguindo o `plano-v2.md` (seções 1.2, 4, 5, 6 e 7.4 e "Decisões da Carol"). Nada no sistema foi programado.

Abra o `index.html`. Ele mostra todos os estados, cada um com a foto de computador (1440) e de celular (412), a legenda e o link para o HTML naquele estado.

## O que tem

| Área | Arquivo | Estados |
|---|---|---|
| Console · ficha, aba Assinatura | `ficha.html?aba=assinatura&estado=` | tg-previsto, tg-em-teste, tg-quer-assinar, tg-confirmar, tg-confirmar-erros, tg-assinado, tg-prorrogar, tg-prorrogar-erros, tg-prorrogado, tg-acabou, tg-dispensar, tg-dispensado, tg-repetido, tg-liberar. Use `&papel=financeiro` ou `&papel=suporte` para ver por papel |
| Console · Histórico e Notas | `ficha.html?aba=historico&estado=tg-ribeiro` e `tg-ipe`; `ficha.html?aba=notas&estado=tg-ribeiro` | |
| Console · carteira | `carteira.html?estado=` | tg-ver, tg-em-teste, tg-acabou, tg-quer |
| Console · sino | `carteira.html?estado=tg-ver&sino=tg-admin`; `&papel=financeiro&sino=tg-financeiro` | |
| Portal · faixas, Quero assinar, Início, sino | `inicio.html?estado=` | tg-dia1, tg-equipe, tg-dona, tg-quero, tg-pedido, tg-ultimo, tg-dia8, tg-dia8-equipe; o sino da sócia dona abre com `&sino=tg-socio` |
| Portal · Plano e faturas | `portal-escritorio.html?estado=` | tg-plano, tg-plano-pedido, tg-plano-assinado, tg-plano-dia8 |
| E-mails | `emails.html?estado=` | dia1, dia5, dia7, dia8 |

Ao todo são 42 estados e 84 fotos.

As ações Prorrogar, Liberar teste repetido, Dispensar e Confirmar a assinatura abrem uma janela com motivo obrigatório e o estado de erro. Dispensar usa `alertdialog`, com o foco em Cancelar. O botão de confirmar nunca fica desabilitado: o erro aparece no resumo e junto do campo.

Ficou de fora, como pedido:
- a linha do valor e da isenção da implantação, que é da frente CO-08;
- os preços reais. Os valores são de exemplo e levam o selo "Valores de exemplo".

## Exemplos e datas

Todas as horas são da Bahia, iguais às de Brasília. No Console, o relógio fica parado em quarta-feira, 02/12/2026, 9h40.

- **Ribeiro & Matos** (sócia dona Marina Ribeiro):
  - primeiro acesso em 27/11 às 23h40, último dia em 03/12 e só consulta a partir de 04/12 à 0h;
  - pediu "Quero assinar" em 01/12 às 16h20;
  - se a assinatura for confirmada, a cobrança começa em 04/12 e a primeira fatura é a de janeiro de 2027, com vencimento em 10/01/2027.
- **Sucupira:** prorrogado de 30/11 para 04/12; hoje está no dia 9 de 11.
- **Ipê:** acabou em 29/11 e está só para consulta desde 30/11. O aviso do dia 7 aparece como descartado, porque a rotina não rodou naquele dia.
- **Ingá:** teste repetido. Henrique Moura foi sócio da Angico, que fez teste em setembro e foi encerrada sem assinar.
- **Cedro & Lima e Jatobá:** teste previsto.
- **Buriti:** piloto com o teste dispensado.

No Portal, cada estado tem o relógio do seu dia (por exemplo, o dia 1 em 27/11 às 23h42 e o dia 8 em 04/12).

**Correção do plano:** o plano diz "quarta-feira, 03/12", mas 03/12/2026 é quinta-feira (27/11/2026 é sexta). O desenho usa quinta-feira. Vale corrigir o `plano-v2.md`.

Não mudei os cartões do Início aprovado, que trazem as próprias datas de exemplo (de novembro). Só a faixa, o herói, os atalhos e as boas-vindas são do teste.

## Conferência

Arquivo: `_conferencia.json`. Para repetir, rode `sh _fonte/gerar.sh ..`.

O axe-core não estava instalado neste ambiente, e a ordem era não instalar nada. Por isso, o `fotos_tg.cjs` faz uma conferência própria:

- **Contraste do texto visível:** compara a cor do texto com o fundo real, compondo as camadas até a raiz. O mínimo é 4,5:1, ou 3:1 para texto grande.
  - O único texto reprovado é o título do quadro âmbar "Como funciona", que já vem da ficha aprovada: vinho sobre âmbar dá 4,38:1, com 23 px. É o mesmo componente da aba Notas aprovada, que não mudei. Vale rever o componente na base (ou subir o título para 24 px).
  - Nada novo ficou abaixo do mínimo.
- **Alvos de toque:** nenhum alvo ficou menor que 44 px, contando as mesmas exceções das aprovadas e o link de texto do e-mail.
- **Rolagem lateral:** nenhuma.
- **Erros de script:** nenhum.

Antes de programar, vale passar o axe uma vez onde ele estiver instalado.

## Perguntas para a Carol

1. **Quem já pediu "Quero assinar" e ainda não foi confirmado continua recebendo os avisos dos dias 7 e 8 e passa pela trava do dia 8?**
   Recomendo que sim. O texto do dia 7 já diz "se já pediu, pode desconsiderar", e o sino da Administração marca o pedido como urgente no dia 7, para a confirmação sair antes da trava.
2. **A faixa do Portal mostra a contagem de dias ou só a data?**
   Recomendo mostrar sempre a data ("Teste grátis até quinta-feira, 03/12") e acrescentar "faltam N dias" só a partir do dia 5, quando sai o primeiro aviso.
3. **No dia 8, os botões de criar e mudar ficam à vista e travados, ou somem?**
   Recomendo deixar à vista e travados, com o motivo na faixa. Assim o escritório entende o que volta com a assinatura, e as telas não mudam de lugar.
4. **Prorrogar se faz escolhendo uma data ou "mais N dias"?**
   Recomendo escolher a data do novo último dia, mostrando o antes e o depois e o total de dias. É como o sistema guarda o prazo, e não deixa dúvida sobre o dia.
5. **Na carteira, a situação do teste entra na coluna Pendências ou numa coluna nova?**
   Recomendo a coluna Pendências, com ícone e texto, mais os filtros novos ao lado de "Fatura em atraso". Uma coluna nova ficaria vazia para os escritórios ativos.
6. **A lista fixa de "Como o escritório confirmou", com o detalhe obrigatório de até 300 caracteres, serve?**
   Recomendo que sim. As opções são: pediu no Portal ("Quero assinar"), por e-mail, por WhatsApp, em reunião ou ligação, e "Outro". O detalhe guarda o que foi combinado.
7. **No teste repetido, o que o sócio vê enquanto a Administração decide?**
   Recomendo o Portal só para consulta, com a frase "A equipe do T3jus está liberando o seu acesso.", sem dizer o motivo (que envolve outro escritório).
8. **Por quanto tempo aparece o quadro de boas-vindas do dia 1 no Início?**
   Recomendo que ele fique até a sócia fechar o quadro ou até o Início ter conteúdo próprio, o que vier primeiro. Ele nunca passa do fim do teste.

## Aprovação

Aprovado pela Carol em 27/11/2026, às 11h01 (Bahia), com "aprovado": valem as 8 recomendações acima.
