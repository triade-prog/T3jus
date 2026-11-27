# CO-08 · Implantação assistida · notas do desenho (D43)

> **Aprovado pela Carol em 27/11/2026, 11h23 (Bahia)**, sem mudanças: valem as 6 recomendações das perguntas abaixo (decisão DC14 no painel). O plano revisado está em `PLANO.md` e a revisão em `REVISAO.md`.

Desenho para a Carol aprovar, feito a partir do `co-08/plano-v2.md` (seção 8, as 11 telas), de `docs/IDENTIDADE.md`, de `docs/design/conceito-gabinete.md` e do design system. Não é código do sistema e não tem commit.

- **O que abrir:** `index.html`, com todas as capturas (computador 1440 e celular 412), a legenda de cada estado e o link para o HTML daquele estado.
- **Estados:** são 51. Hoje é **sexta, 27/11/2026**.
- **Contorno tracejado:** marca o que é novo. No produto, não há contorno.

## Bases e como foi feito

- **Telas aprovadas lidas sem mudança.** Os geradores em `_fonte/` leem as páginas aprovadas de `docs/design/aprovadas/` e injetam só os estados novos:
  - `cobranca-pdfs/` (`ficha.html`, `portal-escritorio.html`, `fatura-a4.html`, `recibo-a4.html`);
  - `console-interessado-sino/cobranca.html` (Cobrança com o sino);
  - `portal-inicio-audiencias/inicio.html`.
  - O CSS novo tem o prefixo `im-`.
  - Os estados novos têm o prefixo `im-` no Console e `pt-` no Portal.
  - `sh _fonte/gerar.sh <pasta>` refaz tudo: HTML, index, capturas, conferência e WebP.
- **Os mesmos padrões das telas aprovadas:**
  - folha;
  - cabeçalho com disco de dias;
  - campo âmbar “Como funciona”;
  - `alertdialog` com foco em Voltar ou Cancelar;
  - motivo obrigatório com contador;
  - resumo de erros com erro preso ao campo e foco no primeiro (o botão nunca fica desabilitado);
  - conflito com a tabela “Salvo agora / O que você via”;
  - código do erro para o suporte.
- **Papéis.** O mesmo `?papel=` das telas aprovadas:
  - Administração e Implantação editam a aba Implantação. Mudar o prazo é só da Administração.
  - Financeiro e Suporte só leem. O Financeiro vê os valores e o Suporte não.
  - A regra em Cobrança › Planos é só da Administração. O Financeiro a lê.
- **Dados de exemplo, coerentes entre as telas:**
  - **Escritório:** Cedro & Lima Advocacia (Recife), sócia dona Renata Lima, 6 pessoas.
  - **Implantação:** nº 1, aberta em 16/11/2026, prazo 16/12/2026, acompanhada por Rafael Teles.
  - **Situação hoje:** 4 de 6 pessoas treinadas. Falta treinar Tiago Ramos, e Diego Alves ainda não aceitou o convite.
  - **Concluída** em 07/12/2026. A 1ª fatura é a nº 2027/0004, de janeiro de 2027, e vence em 10/01/2027.
  - **Os estados de prazo** simulam outros dias: 09/12 (faltam 7 dias), 16/12 (vence hoje) e 21/12 (passou há 5 dias).
- **Valores:**
  - **Implantação:** R$ 1.490,00, marcada como provisória.
  - **Mensalidade:** R$ 499,00, o preço do plano Escritório aprovado pela Carol em 27/11/2026. A tabela é Essencial R$ 299,00, Escritório R$ 499,00, Banca R$ 749,00 e pessoa a mais R$ 69,00.
    - Os desenhos aprovados antes disso usam preços fictícios (290, 490, 890 e 39). Nos estados novos, os geradores trocam esses preços pelos aprovados (`precos_novos` em `_fonte/comum_im.py`). As páginas aprovadas não mudam.
    - O plano v2 usa R$ 549,00 no exemplo. Ele precisa ser atualizado para R$ 499,00.
  - **Desconto de entrada:** 20% de R$ 499,00 = R$ 99,80.
  - **1ª fatura isenta:** R$ 499,00 − R$ 99,80 + R$ 1.490,00 − R$ 1.490,00 = **R$ 399,20**.
  - **1ª fatura cobrada:** R$ 499,00 − R$ 99,80 + R$ 1.490,00 = **R$ 1.889,20**. O exemplo é a Umbu Advocacia de Família, fatura de março de 2027, nº 2027/0011.

## Decisões de desenho

1. **A isenção aparece como duas linhas que somam zero, em todo lugar.** “Implantação assistida · treino de toda a equipe e acompanhamento por 30 dias” com R$ 1.490,00, e logo abaixo “Isenção da implantação · Oferta de lançamento” com − R$ 1.490,00. Isso vale para:
   - a fatura aberta;
   - os PDFs da fatura e do recibo;
   - Plano e faturas no Portal;
   - Assinar o T3jus;
   - a janela de Concluir;
   - o bloco da Assinatura;
   - a prévia da regra.

   Assim o escritório vê quanto vale o que recebe. Nos itens da fatura, entram os rótulos Mensalidade, Desconto, Implantação e Isenção, em texto e não só em cor.
2. **A cobrada aparece à vista, na 1ª fatura, numa linha só.** Ao marcar Cobrada na regra, aparecem dois avisos:
   - **A nota fiscal:** resolver antes com o contador (F1.24), porque a fatura passa de R$ 1.800,00.
   - **O carnê:** o carnê não leva a implantação.
   - **Na Assinatura**, salvar Carnê com a implantação cobrada dá `IMPLANTACAO_COBRADA_NO_CARNE`. O parcelamento fica no pendente F1.49.
3. **O diferencial está escrito no Portal.** As telas dizem “A equipe T3jus treina todas as pessoas do escritório, em grupo ou uma a uma, e acompanha o uso. Não é uma videochamada só”. Isso aparece:
   - em Escritório › Implantação, em quatro cartões: todas as pessoas treinadas, uso acompanhado, mudança sem retrabalho e quem chega depois também;
   - no “Como funciona” do Console;
   - em Assinar o T3jus.
4. **Nada muda sozinho no prazo.**
   - O sino avisa aos 7, 3 e 0 dias.
   - Depois do prazo, a faixa vinho diz que o cliente continua em implantação.
   - Mudar o prazo pede motivo e fica no histórico interno. O escritório vê só a data nova.
5. **“O que já aconteceu” é calculado, sem nada marcado à mão.** Entra o primeiro acesso de uma sócia, a importação, o WhatsApp e as pessoas treinadas. Só o treino é registrado à mão, e ele não se edita: desfaz-se com motivo e fica riscado na lista.
6. **Concluir mostra o efeito na cobrança.** A janela mostra o resumo para o escritório (os sócios o leem no Portal) e a conta da 1ª fatura. Com o teste grátis do CO-09, a janela diz “Na cobrança, nada muda”, porque a cobrança começou na assinatura.
7. **A condição fica congelada na abertura.** A implantação guarda o valor e a condição do dia em que abre. Mudar a regra vale só para as que abrirem depois, e a prévia da regra diz isso com os nomes das 3 abertas.
8. **O Portal mostra quem acompanha e o treino de cada pessoa, sem valores.**
   - Os valores ficam com a sócia dona, em Plano e faturas.
   - No Início, os sócios veem o cartão da implantação.
   - Cada pessoa vê “Seu treino”: o treino ainda vai ser marcado, ou já foi feito, com quando, como, com quem e o que cobriu.
9. **O sino é o aprovado, com textos novos.**
   - Os avisos do prazo vão para quem acompanha e para a Administração.
   - O aviso “A isenção termina em 30 dias” vai para a Administração, em 01/05/2027, no exemplo com a data de corte 31/05/2027.
10. **A aba Contrato.** O botão aprovado “Passar para Ativo” virou “Concluir a implantação” e leva à aba Implantação, onde estão o resumo e o efeito na cobrança.
11. **Assinar o T3jus (CO-09) é um esboço.** A página é do CO-09. Aqui só se desenhou a tabela da 1ª fatura com as linhas da implantação. O resto da página deve seguir o desenho do CO-09 quando ele existir.
12. **Depende do CO-10.** O desconto aparece como “Desconto de entrada (20% da mensalidade)”, só sobre a mensalidade. Esse texto depende da troca que a thread do CO-10 está fazendo. Sem ela, a 1ª fatura teria três linhas com “implantação”.

## Conferência

- **Conferência própria, sem axe-core.** Nesta máquina não há axe-core, e o pedido foi não instalar nada. No lugar dele, `_fonte/fotos_im.cjs` roda na página uma conferência própria, com base na WCAG 2.2 AA. Ela confere:
  - contraste de texto, 4,5:1 (3:1 para texto grande);
  - nome acessível de botão, link e campo;
  - campo sem rótulo;
  - ids repetidos e referências `aria-*` sem alvo;
  - rolagem lateral;
  - alvos menores que 44 px, com as mesmas exceções das telas aprovadas.
- **Resultado:** está em `_conferencia.json`. Os 51 estados, no computador e no celular, ficaram com **0 violações, 0 rolagem lateral e 0 alvos pequenos**.
- **Recomendação:** rodar o axe-core na máquina da base antes de programar.
- **QR Code e códigos de exemplo.** O QR Code do PDF é o mesmo do exemplo aprovado. O Pix copia e cola e a linha digitável trocam o valor e o número, mas continuam sendo códigos de exemplo.

## Perguntas para a Carol (cada uma com recomendação)

1. **O valor da implantação assistida é R$ 1.490,00?** *Recomendo confirmar.*
   - Fica acima do custo estimado, de R$ 480 a R$ 720.
   - Fica abaixo do que os concorrentes cobram pela configuração somada à adesão.
   - É configuração: muda depois em Cobrança › Planos, sem código. Por isso as telas mostram o selo “Valor provisório”.
2. **Quando começam os “6 primeiros meses do T3jus rodando”?** *Recomendo uma data fixa de lançamento, que a Carol grava em Cobrança › Planos, no campo “Isenta até” (no desenho, 31/05/2027).*
   - Enquanto a data não existir, a regra fica “isenta, sem data de fim”, como no estado `im-regra`.
   - O sino avisa 30 dias antes do fim.
3. **Se a 1ª fatura, a que traz a implantação, for cancelada, o que acontece com a implantação?** *Recomendo que ela fique isenta, com o motivo do cancelamento no histórico, sem voltar a cobrar sozinha.* Nada no sistema reemite uma fatura cancelada.
4. **O que acontece quando passam os 30 dias?** *Recomendo, por enquanto, só os avisos aos 7, 3 e 0 dias e a mudança do prazo pela Administração, com motivo.* É o que os estados `im-perto`, `im-hoje` e `im-passou` mostram. A passagem automática para Ativo pode ser decidida depois dos pilotos.
5. **Quando a Carol decidir passar a cobrar, o que vem junto?** *Recomendo:*
   - cobrar à vista na 1ª fatura, com Pix ou boleto;
   - deixar o parcelamento e o carnê para quando os pilotos pedirem (F1.49);
   - só trocar para Cobrada depois de resolver a nota fiscal com o contador (F1.24). A tela já mostra esse aviso.
6. **Pessoa que entra no escritório depois da implantação também ganha o treino?** *Recomendo que sim, sem custo, dado pela equipe e registrado na mesma lista de treinos.* É o diferencial anunciado (“todas as pessoas”), e o Portal já promete isso em “Quem chega depois também”. Se a resposta for não, sai esse cartão e a frase da implantação concluída.
