# D41 · CO-10 no carnê. Lista dos estados (capturas) e o index.html com as capturas e a legenda.
# Mesmo formato do casos_177.py (F3.177) e do casos_cb.py aprovado. Uso: python3 casos_d41.py <pasta-saida>
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
F = 'ficha.html?aba=assinatura&estado='
C = 'cobranca.html?aba=fatura&estado='
P = 'portal-escritorio.html?estado='

SECOES = [
    ('1. Console · o carnê com o desconto de entrada', 'Ficha do escritório, aba Assinatura. A parcela é a conta do Pix e do boleto: mensalidade + pessoas a mais − desconto, e o desconto só entra nas parcelas até a fatura do “até”. O carnê passa a ter faixas de valor (“3 parcelas de R$ 399,20 e 9 de R$ 499,00”) e cada canhoto mostra o seu valor; o canhoto com desconto leva o selo “com desconto de entrada” (texto, não só cor). O contorno tracejado em âmbar é só do desenho, para achar o que é novo.', [
        ('carne-desconto', F + 'cb-carne-desconto', '1 · Carnê novo com desconto (Jatobá)',
         'Escritório novo, 20% até a fatura de fevereiro de 2027, 6 pessoas, dia 10. 12 parcelas de dezembro de 2026 a novembro de 2027: 3 de R$ 399,20 e 9 de R$ 499,00, total R$ 5.688,60. A faixa de valores mostra onde o desconto acaba (“Parcelas 1 a 3 · dez/2026 a fev/2027 · com o desconto de entrada” e “Parcelas 4 a 12 · valor cheio”). O histórico conta que o sistema ajustou o desconto para até fevereiro quando a 1ª fatura passou a ser dezembro.'),
        ('carne-desconto-meio', F + 'cb-carne-desconto-meio', '2 · Carnê que começa no meio do desconto (Umbu)',
         'Dezembro foi pago por Pix com o desconto; o carnê nasce em 25/11 a partir de janeiro. Só 2 parcelas têm desconto: 2 de R$ 399,20 e 10 de R$ 499,00. A nota diz por quê: dezembro foi pago por Pix, já com o desconto, então o carnê leva o desconto só em janeiro e fevereiro.'),
        ('carne-pulou-adiantada', F + 'cb-carne-pulou-adiantada', '3 · Carnê novo pula o mês pago adiantado (Cajá)',
         'Fevereiro de 2027 foi pago adiantado. Ao mudar o dia de 10 para 20, o carnê novo de 12 parcelas pula fevereiro e vai até janeiro de 2028: 1 de R$ 399,20 (janeiro) e 11 de R$ 499,00. Fevereiro aparece no lugar dele como “fora deste carnê · paga adiantada no carnê 2026/2027”, e a nota explica que nenhum mês fica sem parcela nem com duas. O carnê antigo fica abaixo como “Substituído”, com as 2 parcelas pagas.'),
        ('editar-desconto', F + 'cb-editar-carne-desconto', '4 · Dar o desconto na implantação, com a prévia (Murici)',
         'Escritório em implantação, ainda sem carnê. Ao escrever 20% até a fatura de fevereiro de 2027, a ajuda diz que são as 3 primeiras faturas (o prazo anda junto se a Murici passar para Ativo depois) e a prévia mostra o carnê que vai nascer: “3 parcelas de R$ 399,20 e 9 de R$ 499,00”, total R$ 5.688,60. Quem gera o carnê é o sistema, no dia em que ela passar para Ativo.'),
        ('editar-desconto-erros', F + 'cb-editar-carne-desconto-erros', '4b · Os erros do desconto',
         'Percentual 100. A mensagem fica junto do campo, “No carnê, o desconto vai até 99%.”, o resumo no alto diz “Falta acertar 1 ponto. Nada foi salvo.” e a prévia espera: “A prévia volta quando o desconto estiver entre 0 e 99%.”'),
        ('desconto-troca', F + 'cb-desconto-troca', '5 · Mudar o desconto troca o carnê (confirmação)',
         'O Jatobá tem carnê; o desconto passa de 20% para 30% (vem de outro sistema). Ao salvar, a janela “Mudar o desconto troca o carnê” mostra Hoje (“3 × R$ 399,20 e 9 × R$ 499,00”) e Novo (carnê 2027, “2 × R$ 349,30 e 10 × R$ 499,00”), a tabela mês a mês do que muda, que dezembro já tem fatura e continua R$ 399,20, e o motivo escrito pelo sistema. Botões “Cancelar” e “Trocar o carnê e salvar”.'),
        ('desconto-troca-feito', F + 'cb-desconto-troca-feito', '5b · Carnê trocado',
         'Depois de confirmar: o aviso “Assinatura salva e carnê trocado.”, o carnê 2027 com 2 parcelas de R$ 349,30 e 10 de R$ 499,00, e o carnê antigo abaixo como “Substituído”, com dezembro ainda a pagar (já tem fatura).'),
        ('desconto-troca-pessoas', F + 'cb-desconto-troca-pessoas', '6 · A troca com uma pessoa a mais',
         'A mesma troca com 7 pessoas desde 25/11. A pessoa a mais é contada no dia do carnê, então o carnê novo já sai com ela: “2 × R$ 418,30 e 10 × R$ 568,00”. A janela diz isso numa linha a mais: “O carnê novo conta as pessoas de hoje: 7, uma a mais que as 6 do plano (R$ 69,00 por mês).”'),
        ('carne-novo-faixas', F + 'cb-carne-novo-faixas', '7 · Gerar um carnê novo (o desconto continua)',
         'Janela “Gerar um carnê novo para a Jatobá?” com 7 pessoas e o desconto de 20% até fevereiro: o carnê novo começa em janeiro e mantém o desconto nas 2 parcelas que faltam, 2 × R$ 468,20 e 10 × R$ 568,00 (total R$ 6.616,40), com a mesma tabela mês a mês da troca.'),
        ('carne-valor-mudou', F + 'cb-carne-valor-mudou', '8 · Aviso de que o valor mudou',
         'O aviso compara o mesmo mês, com o desconto dos dois lados: “A parcela de janeiro está em R$ 399,20, e a mensalidade de janeiro hoje é R$ 468,20 (7 pessoas, 1 a mais).” Assim o fim do desconto, em março, não aparece como “o valor mudou”.'),
        ('mudar-plano-carne', F + 'cb-mudar-plano-carne', '9 · Mudar o plano, com a prévia do carnê',
         'O Jatobá passa para o Banca. O desconto continua até fevereiro, agora sobre o preço novo: a conta de janeiro (R$ 749,00 − R$ 149,80 = R$ 599,20, “2ª de 3”) e a prévia do carnê novo, “2 parcelas de R$ 599,20 e 10 de R$ 749,00”, antes de “Mudar para Banca e trocar o carnê”.'),
        ('carne-historico', F + 'cb-carne-historico', '10 · Mudanças da assinatura',
         '“Mudanças da assinatura” escreve cada passo, com quem fez e quando: a assinatura preparada com 20% por 3 meses, o sistema ajustando o desconto para até fevereiro de 2027 quando a 1ª fatura passou a ser dezembro, a mudança de 20% para 30% e o carnê trocado, com as faixas do carnê novo.'),
    ]),
    ('2. Console · a fatura da parcela', 'Cobrança, aba Fatura. A fatura da parcela mostra o desconto como uma linha própria e a pessoa a mais contada no dia do carnê.', [
        ('fatura-desconto', C + 'carne-desconto', '11 · Fatura da parcela com desconto',
         'Jatobá, fatura nº 2026/0203 de dezembro: Escritório R$ 499,00, “Desconto de entrada (20% da mensalidade)” − R$ 99,80, total R$ 399,20, igual ao canhoto. O motivo fica embaixo.'),
        ('fatura-desconto-pessoa', C + 'carne-desconto-pessoa', '11b · Fatura de janeiro com a pessoa a mais',
         'Janeiro de 2027, carnê 2027: R$ 499,00 + 1 pessoa a mais (7 ativas em 27/11/2026, no dia do carnê; 6 incluídas) − R$ 99,80 = R$ 468,20. A fatura sai em 21/12/2026 com o valor do canhoto.'),
    ]),
    ('3. Portal · o carnê para a sócia dona', 'O Portal do escritório mostra as mesmas faixas e os mesmos valores do Console e do PDF.', [
        ('portal-desconto', P + 'cb-carne-desconto', '12 · Carnê com desconto no Portal (Ribeiro & Matos)',
         '30% até fevereiro de 2027 (vem de outro sistema). A próxima parcela é a 2, R$ 349,30; o carnê: 3 parcelas de R$ 349,30 e 9 de R$ 499,00, com a parcela 1 paga em 25/11.'),
        ('portal-trocado', P + 'cb-carne-trocado-desconto', '13 · Carnê trocado no Portal',
         'O aviso “Seu carnê mudou em 27/11/2026: use o carnê 2027 a partir de janeiro.” explica por quê (7 pessoas desde 25/11), que o desconto continua em janeiro e fevereiro e que as páginas 2 a 12 do carnê antigo são para descartar. O carnê 2027: 2 de R$ 418,30 e 10 de R$ 568,00. O antigo fica abaixo como “Substituído”, com a parcela 1 paga.'),
    ]),
    ('4. Os PDFs', 'Carnê, fatura e recibo em A4 (e no celular, a mesma folha reduzida). O código do Pix e do boleto de cada canhoto já tem o valor daquela parcela.', [
        ('pdf-carne-desconto', 'carne-a4.html?estado=carne-desconto', '14a · Carnê em PDF com desconto',
         'Jatobá. A capa traz as faixas (“3 × R$ 399,20 e 9 × R$ 499,00”) e a lista das 12 parcelas, cada uma com o seu valor e a marca “desc.” nas 3 primeiras. Cada página tem o valor da parcela no canhoto, na via, no Pix e no boleto; as com desconto mostram a conta “R$ 499,00 − R$ 99,80 do desconto de entrada (20%)”.'),
        ('pdf-carne-trocado', 'carne-a4.html?estado=carne-trocado-desconto', '14b · O carnê antigo baixado depois da troca',
         'O carnê 2026/2027 do Jatobá baixado depois da troca de 27/11: a parcela 1 vale (já tem fatura), as 2 a 12 saem como “Cancelada em 27/11/2026. Não pague.”, sem códigos, e a capa diz qual carnê vale no lugar: “2 × R$ 468,20 e 10 × R$ 568,00”.'),
        ('pdf-fatura-desconto', 'fatura-a4.html?estado=fatura-carne-desconto', '14c · Fatura da parcela em PDF',
         'A fatura de dezembro do Jatobá: a mensalidade com o número da parcela e o “Desconto de entrada (20% da mensalidade)”, com o motivo entre aspas. Total R$ 399,20; o Pix é o mesmo do canhoto 1.'),
        ('pdf-fatura-pessoa', 'fatura-a4.html?estado=fatura-carne-desconto-pessoa', '14d · Fatura de janeiro em PDF, com a pessoa a mais',
         'Como sai em 21/12/2026: R$ 499,00 + R$ 69,00 − R$ 99,80 = R$ 468,20. A pessoa a mais é a do dia em que o carnê nasceu (27/11/2026), e a linha diz isso. O desconto é só sobre a mensalidade.'),
        ('pdf-recibo-desconto', 'recibo-a4.html?estado=recibo-carne-desconto', '14e · Recibo da parcela com desconto',
         'Ribeiro & Matos, parcela 1 de 12 paga em 25/11: R$ 349,30, com a linha do desconto de entrada e o motivo.'),
    ]),
]

casos = []
for _, _, itens in SECOES:
    for it in itens:
        casos.append({'nome': it[0], 'url': it[1]})
json.dump(casos, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos_d41.json'), 'w'), ensure_ascii=False, indent=1)

h = lambda s: html.escape(s, quote=True)
corpo = ''
for n, (titulo, sub, itens) in enumerate(SECOES, 1):
    corpo += f'<section id="s{n}"><h2>{h(titulo)}</h2><p class="sub">{h(sub)}</p>'
    for nome, url, t, leg in itens:
        figs = ''
        for tam in ['computador', 'celular']:
            figs += (f'<figure class="{"pc" if tam == "computador" else "cel"}"><a href="{h(url)}"><img src="{nome}-{tam}.webp" alt="{h(t)}, {tam}." loading="lazy" width="{1440 if tam == "computador" else 412}"></a>'
                     f'<figcaption>{"Computador · 1440" if tam == "computador" else "Celular · 412"}</figcaption></figure>')
        corpo += (f'<article>{figs}<div class="leg"><h3>{h(t)}</h3><p>{h(leg)}</p>'
                  f'<p class="abrir">Abrir: <a href="{h(url)}">{h(url)}</a> (estreite a janela para ver o celular)</p></div></article>')
    corpo += '</section>'

index = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Carnê com desconto de entrada · T3jus</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@500&family=Poppins:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{{--vinho:#692746;--sal:#F1E6DF;--tinta:#2A1A22;--tinta-2:#6E5562}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--sal);color:var(--tinta);font:14px/1.57 Poppins,"Segoe UI",system-ui,sans-serif}}
header{{background:var(--vinho);color:#fff;padding:40px 48px 32px}} header p{{margin:6px 0 0;color:#F2CDB3;max-width:90ch}}
h1,h2,h3{{font-family:Alegreya,Georgia,serif;font-weight:500;margin:0}} h1{{font-size:40px}} h2{{font-size:30px;color:var(--vinho)}} h3{{font-size:20px;color:var(--vinho)}}
.sobre{{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#E9AE90;margin:0 0 6px}}
header a{{color:#fff}}
nav.ir{{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}} nav.ir a{{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:22px;background:#87335B;color:#fff;text-decoration:none;font-weight:500}}
main{{padding:24px 48px 64px;max-width:1700px}} section{{margin-top:40px}} .sub{{margin:2px 0 16px;color:var(--tinta-2);max-width:110ch}}
article{{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,1fr) minmax(220px,1.1fr);gap:20px;align-items:start;background:#fff;border-radius:14px;padding:20px;margin-bottom:16px}}
figure{{margin:0}} img{{display:block;width:100%;height:auto;border-radius:8px;border:1px solid var(--sal)}}
figcaption{{font-size:12px;color:var(--tinta-2);margin-top:6px}} .leg p{{margin:6px 0 0}} .abrir{{font-size:12px;overflow-wrap:anywhere}} .abrir a{{color:var(--vinho);font-weight:500}}
a:focus-visible{{outline:3px solid #AC3F6B;outline-offset:2px;border-radius:6px}} header a:focus-visible{{outline-color:#F2CDB3}}
@media (max-width:900px){{header,main{{padding-left:16px;padding-right:16px}} article{{grid-template-columns:1fr}} .cel{{max-width:260px}}}}
</style></head><body>
<header><p class="sobre">T3jus · Console, Portal e PDFs · desenho para a Carol aprovar · 27/11/2026</p><h1>Carnê: o desconto de entrada só nas parcelas do prazo</h1>
<p>D41, CO-10. Hoje o carnê repete o mesmo valor nas 12 parcelas e deixa o desconto de entrada de fora, ou o espalha pelo ano todo. Com este desenho, cada parcela tem o valor da sua competência, igual ao Pix e ao boleto: o desconto entra só nas parcelas até a fatura do “até” (as 3 primeiras faturas reais). Seguem as 5 recomendações já aprovadas: a troca do desconto pede confirmação, a pessoa a mais conta no dia do carnê, o nome é “Desconto de entrada”, o prazo conta das 3 primeiras faturas reais, e o carnê novo de 12 não repete mês pago adiantado. Preços de exemplo: Escritório R$ 499,00 (6 pessoas), pessoa a mais R$ 69,00. Cada estado tem computador (1440) e celular (412). Clique numa imagem para abrir o HTML naquele estado. O que cada estado substitui e as perguntas estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#s1">Console · carnê</a><a href="#s2">Console · fatura</a><a href="#s3">Portal</a><a href="#s4">PDFs</a></nav></header>
<main>{corpo}</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print(len(casos), 'casos')
