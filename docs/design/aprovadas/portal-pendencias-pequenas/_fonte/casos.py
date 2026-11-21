# Lista dos estados (capturas) e o index.html das duas pendências pequenas do Portal:
# o atalho "Não receber avisos" na conversa e as parcelas pagas antes do T3jus no contrato.
# Uso: python3 casos.py <pasta-saida>
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
C = 'conversa-avisos.html?estado='
P = 'contrato-pago-antes.html?estado='

SECOES = [
    ('A. Conversa: não receber avisos', 'F3.65 · PA-03. Muda o mínimo na conversa aprovada: o contexto ganha a seção “Avisos automáticos” (no celular, dentro de “Sobre …”), com o atalho que abre a mesma janela aprovada da ficha, já com “Pelo WhatsApp” marcado e quem está escrevendo sugerido. Depois de registrar, a conversa mostra uma linha só para a equipe e o selo no cabeçalho. O registro vai para a ficha com a origem “na conversa”.', [
        ('ca-atalho', C + 'atalho', 'O atalho na conversa', 'Hélio, conversa assumida por Marina. Marta, a esposa, pede para parar os avisos de parcela. À direita, logo depois de Cliente, a seção “Avisos automáticos” diz que Hélio recebe os avisos e oferece “Não receber avisos”. No celular, a mesma seção fica em “Sobre Hélio, o caso e os avisos”, aqui aberto.'),
        ('ca-janela', C + 'janela', 'A janela, já preenchida pela conversa', 'A janela aprovada da ficha. Em cima, a mensagem de Marta que originou o pedido, que fica ligada ao registro. “Pelo WhatsApp, nesta conversa” vem marcado, e Marta vem sugerida em “Quem pediu”, com “Escrevendo nesta conversa”. A data é hoje. Tudo pode ser trocado.'),
        ('ca-erro', C + 'erro', 'Não registrou', 'Falha do servidor: o pedido não foi salvo, o que se escolheu continua na janela e há o código para o suporte. Os erros de campo (“Outra pessoa” sem nome e data depois de hoje) são os aprovados da ficha.'),
        ('ca-registrado', C + 'registrado', 'Pedido registrado', 'Aviso de sucesso. O selo “Sem avisos de cobrança” entra no cabeçalho da conversa. Na conversa, uma linha âmbar só para a equipe diz quem registrou e o que continua. A seção passa para “Fora dos avisos de cobrança desde 18/11/2026”, com “Mudar o pedido”, “Retirar o pedido” e o histórico na ficha. O lembrete de audiência de hoje continua marcado.'),
        ('ca-ja-fora', C + 'ja-fora', 'Cliente já fora dos avisos (Larissa, só Jurídico)', 'Antônia saiu dos avisos de cobrança em 03/11, pelo pedido de Joana, registrado por Diego nesta conversa. O selo fica no cabeçalho e a seção mostra o pedido, com “Mudar o pedido” e “Retirar o pedido” (as janelas aprovadas) e o histórico na ficha. Conversas é de toda a equipe: Larissa, que só tem Jurídico, vê e usa o mesmo atalho, sem valor nem parcela.'),
    ]),
    ('B. Contrato: pago antes do T3jus', 'F3.73 · VA-05. Na aba Recebimentos aprovada, uma folha nova logo abaixo da programação, só quando a importação trouxe parcelas já pagas. Ela diz que essas parcelas não entram nos totais, em A receber nem no Caixa, e não geram recibo, e mostra de onde vieram: a planilha, a linha, quem importou e quando.', [
        ('pg-rosa', P + 'rosa', 'Contrato com parcelas pagas antes', 'Rosa Almeida, contrato importado: 6 parcelas de R$ 800,00, 2 pagas antes do T3jus. A programação mostra só as que faltam. “Recebido até hoje” diz que só conta o que passou pelo T3jus e leva à folha de baixo. A folha “Pago antes do T3jus” traz as 2 parcelas, a soma fora dos totais, a origem e “Ver a importação”.'),
        ('pg-sem', P + 'sem-pago-antes', 'Contrato importado sem parcela paga antes', 'Oficina Irmãos Dias, mensalidade que começa em 10/12. Nada foi pago antes, e a folha não aparece. A aba fica igual à aprovada.'),
    ]),
]

casos = [{'nome': it[0], 'url': it[1]} for _, _, itens in SECOES for it in itens]
json.dump(casos, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos.json'), 'w'), ensure_ascii=False, indent=1)

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
<title>Pendências pequenas do Portal · T3jus</title>
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
<header><p class="sobre">T3jus · Portal do advogado · para aprovação da Carol</p><h1>Pendências pequenas do Portal</h1>
<p>Dois acréscimos pequenos em telas já aprovadas. Na conversa do cliente, o atalho para registrar o pedido de não receber avisos automáticos, com a janela aprovada da ficha (F3.65). E, na aba Recebimentos do contrato, as parcelas pagas antes do T3jus que vieram da planilha, só como informação (F3.73). Cada estado tem computador (1440) e celular (412). Clique numa imagem para abrir o HTML naquele estado. Decisões, o que muda no servidor e perguntas estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#s1">Conversa: não receber avisos</a><a href="#s2">Contrato: pago antes do T3jus</a></nav></header>
<main>{corpo}</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print(len(casos), 'casos')
