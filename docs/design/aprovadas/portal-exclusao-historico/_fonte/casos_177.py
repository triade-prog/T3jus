# Lista dos estados (capturas) e o index.html com as capturas e a legenda.
# Mesmo formato do casos_156.py aprovado. Uso: python3 casos_177.py <pasta-saida>
import json, html, sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
U = 'exclusao.html?estado='

SECOES = [
    ('1. Os lançamentos do sistema antigo, guardados até o prazo do imposto', 'Decisão da Carol (25/11): a descrição dos lançamentos importados do Astrea e o detalhe escrito ao dispensar o lembrete de contrato ficam como estão até o fim do prazo do imposto, como os arquivos das despesas, e só então viram texto fixo. A janela passa a dizer isso com uma linha a mais no quadro âmbar “O que a lei obriga a guardar”, que agora aparece também sem despesa. A frase em negrito da faixa do escudo muda junto. O contorno tracejado em âmbar é só do desenho, para achar o que é novo; as peças da F3.156, já aprovadas, ficam sem contorno. F3.177, PT-11.', [
        ('historico-nenhum', U + 'historico-nenhum', 'Cliente sem nada importado',
         'Nada muda. A janela é a de hoje (a aprovada da F3.156), letra por letra; o gerador confere em todos os estados aprovados de despesa.'),
        ('historico-so', U + 'historico-so', 'Só o histórico importado',
         '12 lançamentos do Astrea e um lembrete dispensado com detalhe escrito, sem despesa. O quadro âmbar aparece com uma linha só: “A descrição dos 12 lançamentos do Astrea”, que fica como veio, com o detalhe da dispensa, até a troca em 01/01/2033 (último lançamento em 2026). Faixa: “Fora essas descrições, nada aqui precisa ser guardado por lei.”'),
        ('historico-e-despesas', U + 'historico-e-despesas', 'Histórico e despesa adiantada juntos',
         'A despesa paga com nota (F3.156, como aprovada) e um lançamento do Astrea de 2024. As duas linhas ficam no mesmo quadro, cada uma com a sua data: o arquivo sai em 01/01/2033 e a descrição do lançamento troca em 01/01/2031. Faixa: “Fora esse arquivo e essa descrição, …”.'),
        ('historico-em-aberto', U + 'historico-em-aberto', 'Lançamentos em aberto no Astrea, com despesa em aberto',
         'Dois dos 4 lançamentos estavam em aberto no Astrea. Eles têm data mesmo assim: a linha importada não muda mais no T3jus, então o prazo conta da data dela (troca em 01/01/2032). A despesa em aberto continua sem data, como aprovado. Lado a lado, mostra a diferença.'),
        ('historico-sem-data', U + 'historico-sem-data', 'Um lançamento veio sem data',
         'Um dos 3 lançamentos veio do Astrea sem data. Ele conta pela data da importação (2026, troca em 01/01/2033), e a linha diz isso numa frase.'),
    ]),
]

casos = []
for _, _, itens in SECOES:
    for it in itens:
        casos.append({'nome': it[0], 'url': it[1]})
json.dump(casos, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos_177.json'), 'w'), ensure_ascii=False, indent=1)

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
<title>Exclusão: histórico importado · T3jus</title>
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
<header><p class="sobre">T3jus · Portal do advogado · aprovado pela Carol em 26/11/2026 (alternativa A)</p><h1>Exclusão: os lançamentos do sistema antigo</h1>
<p>F3.177. A janela de exclusão a pedido do titular (desenho aprovado em portal-exclusao-despesas) passa a dizer que a descrição dos lançamentos importados do Astrea, e o detalhe escrito ao dispensar o lembrete de contrato, ficam guardados até o fim do prazo do imposto e só então viram texto fixo. Só aparece no cliente que tem esse histórico. Só a sócia dona abre a janela, então só ela recebe a contagem. Cada estado tem computador (1440) e celular (412). Clique numa imagem para abrir o HTML naquele estado. O texto de cada variante e as decisões estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#s1">Os estados</a></nav></header>
<main>{corpo}</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print(len(casos), 'casos')
