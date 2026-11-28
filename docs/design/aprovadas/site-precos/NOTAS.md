# Site comercial · Planos e preços · notas do desenho

Desenho para a Carol aprovar, feito em 27/11/2026. Segue o plano (`../plano.md`) com todas as mudanças da revisão (`../revisao.md`); onde os dois divergem, valeu a revisão. Nada mudou em `sistema/apps/site`, nada foi publicado, nenhum repositório foi alterado.

## Como abrir

- `index.html`: a galeria, para abrir no celular. Cada imagem tem título e uma frase.
- `precos.html`: a página inteira, navegável, **no estado de hoje** (sem formulário, sem teste, sem desconto, WhatsApp "Em preparação").
- `precos-completo.html`: a mesma página **com tudo ligado** (teste, desconto, formulário, boleto do Inter e a fatura com as duas linhas da implantação).
- `chaves.html`: cada bloco que depende de uma chave, ligado e desligado.
- `chamadas.html`: o antes e depois das frases que mudam no Início, em Para quem é, em Como funciona e em Demonstração.
- `menu.html`: o topo com o item "Preços" em 1440, 1021 e 900 px.
- Os links do topo e do rodapé levam ao site no ar (t3jus.pro), que não muda. "Preços" e "Planos e preços" levam a `precos.html`.

## O que foi reaproveitado do site

O topo, o rodapé, os ícones, as fontes e os estilos são os do site no ar: `site.css` e `paginas.css` entram sem mudança, os ícones vêm de `Icones.astro`, o logo e o selo vêm de `public/marca` sem redesenho, e o topo encolhe com a barra âmbar da leitura como em `topo.ts`. O que é só desta página está em `_fonte/precos.css`. As seções sobem ao aparecer com o mesmo `data-revelar` do Início (no código, a regra sai de `inicio.css` para `site.css`, como o plano previa). A chamada final usa o bloco âmbar do Início, com o selo inteiro.

## Decidido pela recomendação da revisão

1. **Tabela no lugar da calculadora.** Treze linhas fixas (1 a 3 pessoas até 13), sempre visíveis, sem script, e a frase "Acima de 13 pessoas, some R$ 69 por mês a cada pessoa a mais". Os pontos de virada (6 e 10 pessoas) têm um fio mais forte.
2. **O plano indicado sai sempre do preço cheio.** O desconto aparece só como frase abaixo da tabela, sem recalcular a indicação.
3. **"A fatura segue o plano que você contratou."** Dito ao lado da tabela, com o exemplo de 6 pessoas no Essencial (R$ 506 até a troca para o Escritório, que sai R$ 499), e de novo nas condições.
4. **Três cartões iguais, sem destaque**, na ordem natural também no celular. Cada um com o fato grande (preço e pessoas incluídas) e, menor, "Mais em conta para equipes de...". Sem a frase de perfil. Cada cartão cabe numa tela de 390 x 844 px.
5. **Botões "Quero o Essencial", "Quero o Escritório" e "Quero a Banca"**, com `contato@t3jus.pro` escrito embaixo de cada um enquanto o formulário estiver fechado (o leitor de tela ouve "por e-mail").
6. **Sem o plano Fundador** em lugar nenhum da página, nem na nota do desconto.
7. **Assistente e primeiro contato:** ela se apresenta, pergunta o nome e o assunto e passa para a equipe; não responde consulta jurídica e não fala de caso.
8. **"Valor final da fatura, sem nada somado"** no lugar de "impostos incluídos". A página não fala de nota fiscal.
9. **Reajuste pelo IPCA** do preço do plano e do preço da pessoa a mais.
10. **Implantação:** R$ 1.490,00 inteiro, sem riscado, "Grátis na oferta de lançamento, para escritórios que fizerem o primeiro acesso nos 6 primeiros meses do T3jus" e "Depois da oferta, o valor é cobrado à vista na primeira fatura". Com a data gravada no Console, a frase vira "até {data}" (em `chaves.html`, com uma data de exemplo). A linha "Na primeira fatura aparecem as duas linhas" só aparece com F1.44 e F1.48 no ar. Saiu a promessa de avisar o fim da oferta com 30 dias.
11. **Formas de pagamento por chave:** hoje, "Pix" e "Carnê com as 12 mensalidades do ano"; com o Inter ligado (F1.21), entram o boleto e a frase do Banco Inter.
12. **Uma seção só para pagamento e condições**, com o custo das mensagens da Meta junto do preço e o selo "Em preparação". Saiu "Sem plano anual por enquanto".
13. **Seis perguntas frequentes**, as da revisão, com o JSON-LD FAQPage igual ao texto visível.
14. **Fim do teste conforme a DC12:** só consulta a partir do 8º dia, 30 dias para baixar os dados depois que a equipe encerra, 12 meses de guarda.
15. **Lista do incluído igual ao Início**, com os mesmos selos: Petições a partir de modelos como "No T3jus" e Trazer os dados do Astrea e do ADVBOX como "Em preparação". Nada sobre backup.
16. **Chamadas fora da página:** "A partir de R$ 299 por mês" (nunca "de R$ 299 a R$ 749") e a correção, no mesmo commit, da resposta de Para quem é sobre importar de outros sistemas.
17. **JSON-LD** com `eligibleQuantity` (máximo de pessoas por plano) e `billingDuration` P1M.
18. **Ponto de atmosfera** só na chamada final (o campo âmbar com o padrão, que fica longe do texto e some no celular).
19. **Menu:** "Preços" entre "Para quem é" e "Entrar". Com o item novo, o menu completo pede 777 px e, em 1021 px, sobravam 764: entre 1021 e 1100 px os links ficam com 11 px de folga lateral em vez de 14, e tudo cabe numa linha, sem tirar "O sistema". No celular, "Planos e preços". No rodapé, "Planos e preços" na coluna O T3jus.

## Perguntas que sobram para a Carol

1. **Quem ganha os 30% de desconto?**
   Recomendo: "quem usa hoje outro sistema jurídico pago, conferido pela nossa equipe", sem depender da importação do Astrea ou do ADVBOX e sem citar nomes de concorrentes. É o texto que está no desenho.

2. **Quem paga as mensagens da Meta no WhatsApp?**
   Recomendo: o escritório, direto na conta do WhatsApp Business do número dele. O custo depende do volume de cada escritório e não tem teto. A assistente do T3jus fica no plano, sem cobrança por resposta. É o texto que está no desenho.

3. **Como fica o cancelamento?**
   Recomendo: sem fidelidade e sem multa; vale a partir da mensalidade seguinte; quem desistir antes do primeiro vencimento não paga nada; no carnê, as mensalidades que ainda não venceram são canceladas junto; depois, 30 dias de consulta para exportar os dados. É o texto que está no desenho, na pergunta "E se eu quiser sair?".

4. **Vai ter nota fiscal?**
   Recomendo resolver com o contador antes de publicar. Até a resposta, a página não fala de nota nem de imposto (já está assim no desenho).

5. **Pedido de dados para o rodapé:** razão social, CNPJ e endereço completo do T3jus. No desenho, o rodapé mostra o lugar deles entre colchetes. A página não vai ao ar sem esses dados.

## Condições para publicar (não são perguntas)

- O catálogo do Console com R$ 299, R$ 499, R$ 749 e R$ 69 (hoje a pessoa a mais está em R$ 39 no banco).
- O valor de R$ 1.490,00 da implantação confirmado como definitivo.
- Razão social, CNPJ e endereço no rodapé de todas as páginas.
- Leitura da advogada parceira com o olhar da OAB (VA-07).
- No painel, os pendentes da revisão: o procedimento manual da troca de plano (CO-12, SC-07) e o catálogo com os preços reais (SC-07, CO-06).

## Ajustes do site que vêm junto (para quem programar)

- `site.css`: a regra do menu entre 1021 e 1100 px (acima), a trilha com alvo de 44 px e os links do rodapé com 44 px no celular (hoje são 40 px).
- `data-revelar` sai de `inicio.css` para `site.css`.
- Na tabela, as linhas não esmaecem ao entrar: nenhum preço fica transparente durante a rolagem.
- A descrição da página Demonstração ainda diz "combinar o valor"; muda junto com o passo 3.

## Conferência

- **axe-core 4.10.2** (WCAG 2.0, 2.1 e 2.2, A e AA) em 13 estados, em 1440 e 390 px: página de hoje, página completa, perguntas abertas, prancha das chaves, prancha das chamadas, menu do celular aberto e a página com movimento, rolada até a tabela. **Nenhuma violação.** Resultado em `_conferencia.json`.
- **Rolagem lateral:** 0 px em todos os estados, nas duas larguras.
- **Toque:** nenhum alvo abaixo de 44 px no celular (links dentro de frase contam pela linha, como manda a WCAG 2.5.8).
- **Menu:** uma linha só em 1440 e em 1021 px.
- **Logo e selo:** inteiros, sem corte, no topo, no rodapé e na chamada final. A coluna grande da abertura é a forma de fundo das páginas internas, como no site no ar.
- **Contraste:** só os pares da IDENTIDADE.md e do Gabinete. Nenhum texto branco sobre âmbar e nenhum âmbar como texto em fundo claro. No campo âmbar, o texto é tinta e vinho-escuro.
- **Erros de script:** nenhum. Datas: a página não tem data dinâmica (o ano do rodapé está fixo em 2026) e o relógio do navegador fica parado em 27/11/2026, 10h00.
- **Capturas** com deviceScaleFactor 2. As páginas inteiras mais altas que 16.383 px (limite do WebP) foram reduzidas: a de hoje no celular ficou em 1,45x e a completa em 1,85x (computador) e 1,2x (celular). As capturas paradas usam "menos movimento", para nada ficar por entrar.

## Gerador

`_fonte/gerar.sh` refaz tudo: `montar.py` monta as páginas a partir das peças do site (lidas de `sistema/apps/site`, sem mudança) e de `precos.css`; `capturas.cjs` fotografa e confere com o Playwright; `webp.py` converte; `galeria.py` monta o `index.html`.

## Aprovação

Aprovado pela Carol em 27/11/2026 às 19h19 (Bahia), com as recomendações das 4 perguntas: os 30% valem para quem usa hoje outro sistema jurídico pago, conferido pela equipe; o escritório paga as mensagens da Meta na conta do WhatsApp dele; sem fidelidade e sem multa, com as parcelas do carnê ainda não vencidas canceladas; nota fiscal decidida com o contador antes de publicar, e até lá a página não fala de nota nem de imposto. Razão social, CNPJ e endereço do rodapé ainda faltam (F2.9). Decisão DC15 no painel.
