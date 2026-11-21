# Monta o index.html de apresentação para a Carol, a partir do casos.json. Uso: python3 casos.py <pasta-saida>
import sys, os, json, html
S = sys.argv[1] if len(sys.argv) > 1 else '..'
C = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos.json'), encoding='utf-8'))
H = html.escape
GR = [('site', 'Site comercial em t3jus.pro', 'F2.1 · SC-01, SC-03, SC-06. Quatro páginas: Início, Como funciona, Para quem é e Demonstração. As capturas são da página inteira; role dentro de cada uma.'),
      ('form', 'Pedido de demonstração', 'F2.2 · SC-02. O formulário da página Demonstração e os seus estados.'),
      ('console', 'Console › Comercial › Interessados', 'F2.3 · SC-05. A área nova do Console, sobre a moldura aprovada da Cobrança.')]
LINKS = [('inicio.html', 'Início'), ('como-funciona.html', 'Como funciona'), ('para-quem-e.html', 'Para quem é'), ('demonstracao.html', 'Demonstração'), ('interessados.html', 'Console › Interessados')]
sec = ''
for g, t, d in GR:
    itens = ''
    for c in [x for x in C if x['grupo'] == g]:
        alto = ' alto' if g == 'site' else ''
        itens += (f'<article class="caso" id="{c["nome"]}"><header><h3>{H(c["t"])}</h3><p>{H(c["d"])}</p><a href="{H(c["url"])}">Abrir o HTML neste estado</a></header>'
                  f'<div class="par"><figure class="pc{alto}"><a href="{H(c["url"])}"><img src="{c["nome"]}-computador.webp" alt="{H(c["t"])}, computador" loading="lazy"></a><figcaption>Computador, 1440</figcaption></figure>'
                  f'<figure class="cel{alto}"><a href="{H(c["url"])}"><img src="{c["nome"]}-celular.webp" alt="{H(c["t"])}, celular" loading="lazy"></a><figcaption>Celular, 390</figcaption></figure></div></article>')
    sec += f'<section id="g-{g}"><h2>{t}</h2><p class="sub">{d}</p>{itens}</section>'
nav = ''.join(f'<a href="{h}">{t}</a>' for h, t in LINKS)
out = f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Site comercial e Interessados · desenho para aprovar</title><link rel="stylesheet" href="fontes.css">
<style>
:root{{--vinho:#692746;--vinho-2:#87335B;--ambar:#DD9760;--ambar-3:#F2CDB3;--sal:#F1E6DF;--sal-2:#F2ECE8;--tinta:#2A1A22;--tinta-2:#6E5562}}
*{{box-sizing:border-box}}body{{margin:0;font-family:Poppins,system-ui,sans-serif;font-size:15px;line-height:1.6;color:var(--tinta);background:var(--sal)}}
h1,h2,h3{{font-family:Alegreya,Georgia,serif;font-weight:500;color:var(--vinho);margin:0;line-height:1.15}}
.topo{{background:var(--vinho);color:var(--sal);padding:40px 48px 36px}}.topo h1{{color:#fff;font-size:44px}}.topo p{{max-width:80ch;margin:10px 0 0}}
.topo nav{{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px}}.topo nav a{{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:10px;background:var(--ambar-3);color:var(--vinho);text-decoration:none;font-weight:500}}
.topo .ir a{{color:var(--ambar-3)}}
main{{padding:0 48px 64px;max-width:1500px;margin:0 auto}}section{{padding-top:48px}}section>h2{{font-size:36px}}.sub{{color:var(--tinta-2);margin:6px 0 0}}
.caso{{background:#fff;border-radius:16px;padding:22px 24px;margin-top:24px}}.caso header{{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:baseline}}.caso h3{{font-size:24px}}
.caso header p{{color:var(--tinta-2);margin:0;flex:1;min-width:240px}}.caso header a{{color:var(--vinho);font-weight:500}}
.par{{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,1fr);gap:24px;margin-top:16px;align-items:start}}
figure{{margin:0}}figure img{{display:block;width:100%;height:auto;border-radius:8px;box-shadow:0 0 0 1px var(--sal)}}
figure.alto{{max-height:760px;overflow:auto;border-radius:8px}}figcaption{{font-size:12.5px;color:var(--tinta-2);margin-top:6px}}
@media (max-width:760px){{.topo{{padding:28px 16px}}.topo h1{{font-size:32px}}main{{padding:0 16px 40px}}.par{{grid-template-columns:1fr}}}}
</style></head><body>
<header class="topo"><h1>Site comercial e Interessados</h1><p>Desenho para a Carol aprovar antes do código: o site em t3jus.pro (F2.1), o pedido de demonstração (F2.2) e a área Interessados do Console (F2.3). Dados fictícios. Clique numa imagem para abrir o HTML naquele estado. Decisões, textos e perguntas estão no NOTAS.md.</p>
<nav aria-label="Páginas navegáveis">{nav}</nav><p class="ir"><a href="#g-site">Site</a> · <a href="#g-form">Formulário</a> · <a href="#g-console">Console</a></p></header>
<main>{sec}</main></body></html>'''
open(os.path.join(S, 'index.html'), 'w', encoding='utf-8').write(out)
print('index ok')
