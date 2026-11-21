# Página para publicar com as capturas das três opções do Funil embutidas. Uso: python3 funil_publicar.py <pasta-saida>
import sys, os, base64, html
sys.argv += [] if len(sys.argv) > 1 else ['..']
D = sys.argv[1]
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from funil_opcoes_textos import OPCOES, RECOMENDO
h = lambda s: html.escape(s, quote=True)
b64 = lambda n: 'data:image/webp;base64,' + base64.b64encode(open(os.path.join(D, n), 'rb').read()).decode()
arts = ''
for k, tit, leg in OPCOES:
    rec = '<span class="rec">Recomendada</span>' if k == RECOMENDO[0] else ''
    arts += (f'<article id="op-{k}"><div class="leg"><h2>{h(tit)} {rec}</h2><p>{h(leg)}</p>'
             f'<p class="abrir">Na pasta: <code>funil-opcoes.html?estado=opcao-{k}</code></p></div>'
             f'<figure class="pc"><img src="{b64(f"funil-opcao-{k}-computador.webp")}" alt="{h(tit)}, na página do Funil, computador." width="1440"><figcaption>Computador · 1440</figcaption></figure>'
             f'<figure class="cel"><img src="{b64(f"funil-opcao-{k}-celular.webp")}" alt="{h(tit)}, na página do Funil, celular." width="412"><figcaption>Celular · 412</figcaption></figure></article>')
page = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Funil: três opções</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@500&family=Poppins:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{{--vinho:#692746;--sal:#F1E6DF;--tinta:#2A1A22;--tinta-2:#6E5562;--papel:#fff}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--sal);color:var(--tinta);font:14px/1.57 Poppins,"Segoe UI",system-ui,sans-serif}}
header{{background:var(--vinho);color:#fff;padding:40px 48px 32px}} header p{{margin:6px 0 0;color:#F2CDB3;max-width:95ch}}
h1,h2{{font-family:Alegreya,Georgia,serif;font-weight:500;margin:0}} h1{{font-size:40px;line-height:1.1}} h2{{font-size:28px;color:var(--vinho)}}
.sobre{{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#E9AE90!important;margin:0 0 6px!important}}
.recom{{margin-top:16px;padding:14px 18px;border-radius:12px;background:#F2CDB3;color:var(--tinta);max-width:95ch}} .recom b{{color:var(--vinho)}}
main{{padding:24px 48px 64px;max-width:1700px}}
article{{display:grid;grid-template-columns:minmax(220px,1fr) minmax(0,3fr) minmax(0,1fr);gap:20px;align-items:start;background:var(--papel);border-radius:14px;padding:20px;margin-top:20px}}
figure{{margin:0}} img{{display:block;width:100%;height:auto;border-radius:8px;border:1px solid var(--sal)}}
figcaption{{font-size:12px;color:var(--tinta-2);margin-top:6px}} .leg p{{margin:8px 0 0}} .abrir{{font-size:12px;color:var(--tinta-2);overflow-wrap:anywhere}}
.rec{{display:inline-block;vertical-align:middle;font:500 12px Poppins,sans-serif;background:var(--vinho);color:#fff;border-radius:999px;padding:2px 10px}}
code{{font-size:12px;background:var(--sal);padding:1px 5px;border-radius:4px}}
@media (max-width:900px){{header,main{{padding-left:16px;padding-right:16px}} article{{grid-template-columns:1fr}} .cel{{max-width:260px}} h1{{font-size:32px}}}}
</style></head><body>
<header><p class="sobre">T3jus · Portal do advogado · Comercial · para a Carol escolher</p><h1>Funil: três opções para “Quanto vira contrato”</h1>
<p>Três formas do bloco, com os mesmos dados do Funil (24 primeiros contatos, 14 com proposta, 9 contratos, de 20/08 a 18/11/2026). As três mostram quem saiu sem proposta e por quê: o escritório não pegou, o cliente não voltou, ainda em atendimento. Cada captura mostra a página do Funil inteira, com a opção no lugar. Dados fictícios.</p>
<p class="recom"><b>Recomendação.</b> {h(RECOMENDO[1])}</p></header>
<main>{arts}</main></body></html>
'''
open(os.path.join(D, 'funil-opcoes-publicar.html'), 'w', encoding='utf-8').write(page)
print('publicar ok', round(len(page) / 1e6, 2), 'MB')
