# O carnê e o recibo em A4 com o LOGO do escritório no alto, no lugar do nome em letra (F3.81 e o resto do F3.19; FI-23 e FI-14).
# Reusa sem mudança os modelos aprovados: carne_a4.py (carnê) e recibo_a4.py (recibo), lidos até o começo dos estados.
# Muda só a marca: no carnê, a função esc_marca() (via do cliente e capa); no recibo, o bloco .rb-marca do timbrado.
# O canhoto do carnê continua com o nome em letra (é do escritório e é pequeno). O T3jus continua só no rodapé.
# Peças novas com prefixo lg-. Gera carne-logo-a4.html e recibo-logo-a4.html. Uso: python3 logo_a4.py <pasta-saida>
import os, sys, html
AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
from logo_dados import LOGOS

H = html.escape


def _ler(arquivo, ate):
    src = open(os.path.join(AQUI, arquivo), encoding='utf-8').read()
    ns = {'__name__': 'lido', '__file__': os.path.join(AQUI, arquivo)}
    argv = sys.argv
    sys.argv = [arquivo, SAIDA]
    exec(compile(src[:src.index(ate)], arquivo, 'exec'), ns)
    sys.argv = argv
    return ns


CN = _ler('carne_a4.py', 'ESTADOS = [')
RB = _ler('recibo_a4.py', 'ESTADOS = [')

ALT = 'Ribeiro &amp; Matos, Advocacia e Consultoria'

CSS_LG = r"""
/* ==========================================================================
   Logo do escritório no alto do carnê e do recibo (prefixo lg-)
   O logo cabe numa caixa: no carnê 56 x 12 mm, no recibo 92 x 20 mm, sem esticar.
   ========================================================================== */
.lg-cn-marca{display:grid;gap:.8mm;justify-items:start}
.lg-cn-logo{display:block;max-width:56mm;max-height:12mm;width:auto;height:auto}
.lg-cn-lado{display:flex;align-items:center;gap:2.4mm}
.lg-cn-lado .lg-cn-logo{width:12mm;height:12mm;max-height:none}
.lg-cn-lado .cn-marca{gap:.3mm}
.cn-capa .lg-cn-logo{max-width:54mm}
.cn-uma .lg-cn-logo{max-width:80mm;max-height:15mm}
.cn-uma .lg-cn-lado .lg-cn-logo{width:15mm;height:15mm}
.lg-rb-logo{display:block;max-width:92mm;max-height:20mm;width:auto;height:auto}
.lg-rb-lado{display:flex;align-items:center;gap:4mm}
.lg-rb-lado .lg-rb-logo{width:20mm;height:20mm;max-height:none}
"""


def marca_cn(tipo):
    """A marca no alto da via e da capa do carnê, com o logo."""
    ESC = CN['ESC']
    doc = f'<span class="cn-doc">CNPJ {ESC["cnpj"]} · {ESC["oab"]}</span>'
    if tipo == 'quadrado':
        img = f'<img class="lg-cn-logo" src="{LOGOS["quadrado"]["uri"]}" alt="">'
        return (f'<div class="lg-cn-marca"><div class="lg-cn-lado">{img}<div class="cn-marca"><span class="cn-esc">{ESC["nome"]}</span>'
                f'<span class="cn-esc-sub">{ESC["sub"]}</span></div></div>{doc}</div>')
    uri = LOGOS['claro']['uri_uma_cor'] if tipo == 'uma-cor' else LOGOS['largo']['uri']
    return f'<div class="lg-cn-marca"><img class="lg-cn-logo" src="{uri}" alt="{ALT}">{doc}</div>'


def carne(tipo):
    CN['esc_marca'] = lambda doc=True: marca_cn(tipo)
    return CN['folhas_3'](CN['A_VENCER'])


def recibo(tipo):
    ESC = RB['ESC']
    f = RB['folha']()
    velho = f'<div class="rb-marca"><span class="rb-esc">{ESC["nome"]}</span><span class="rb-esc-sub">{ESC["sub"]}</span></div>'
    assert velho in f
    if tipo == 'quadrado':
        novo = (f'<div class="lg-rb-lado"><img class="lg-rb-logo" src="{LOGOS["quadrado"]["uri"]}" alt="">'
                f'<div class="rb-marca"><span class="rb-esc">{ESC["nome"]}</span><span class="rb-esc-sub">{ESC["sub"]}</span></div></div>')
    else:
        novo = f'<div class="rb-marca"><img class="lg-rb-logo" src="{LOGOS["largo"]["uri"]}" alt="{ALT}"></div>'
    return f.replace(velho, novo)


def pagina(arquivo, titulo, desc_meta, cab, nav_rot, estados, css, prefixo):
    nav = ''.join(f'<a href="{arquivo}?estado={e}" data-e="{e}">{n}</a>' for e, n, _, _, _ in estados)
    tpls = ''.join(f'<template data-est="{e}" data-desc="{H(d)}"><main{" class=pb" if e == "pb" else ""}>'
                   f'{"<p class=" + prefixo + "-aviso-tela role=note>" + av + "</p>" if av else ""}{f}</main></template>\n'
                   for e, n, d, f, av in estados)
    return f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titulo}</title>
<meta name="description" content="{desc_meta}">
<style>
{CN['FONTES']}
{css}
{CSS_LG}
</style>
</head>
<body>
{cab}
<nav class="{prefixo}-var lg-var" aria-label="{nav_rot}">{nav}</nav>
<div id="slot"></div>
{tpls}
<script>
(function(){{
  var q=new URLSearchParams(location.search), e=q.get('estado')||'{estados[0][0]}';
  var t=document.querySelector('template[data-est="'+e+'"]')||document.querySelector('template[data-est="{estados[0][0]}"]');
  document.getElementById('slot').appendChild(t.content.cloneNode(true));
  document.getElementById('desc').textContent=t.dataset.desc;
  document.querySelectorAll('.lg-var a').forEach(function(a){{ if(a.dataset.e===t.dataset.est) a.setAttribute('aria-current','page') }});
}})();
</script>
</body>
</html>
'''


L, Q, C = LOGOS['largo'], LOGOS['quadrado'], LOGOS['claro']
NOTA_CN = '<b>O canhoto continua com o nome em letra.</b> Ele fica com o escritório e é estreito: o logo ali sairia pequeno demais para ler.'

EST_CN = [
    ('largo', 'Logo largo', 'Logo horizontal do escritório', carne('largo'),
     f'<b>Logo largo ({L["tamanho"][0]} × {L["tamanho"][1]} px).</b> Ocupa o lugar do nome em letra, numa caixa de até 56 × 12 mm. '
     f'Embaixo continuam o CNPJ e o registro da sociedade na OAB. {NOTA_CN}'),
    ('quadrado', 'Logo quadrado', 'Logo quadrado, com o nome ao lado', carne('quadrado'),
     '<b>Logo quadrado, com o nome em letra ao lado.</b> Sozinho, um logo quadrado na altura de 12 mm fica pequeno e não diz o nome do escritório. '
     'Por isso, para logo quadrado, o padrão é “Logo e o nome ao lado”.'),
    ('pb', 'Preto e branco', 'O logo largo numa impressora preto e branco', carne('largo'),
     f'<b>Prévia em preto e branco.</b> O azul vira cinza-escuro e o ouro, cinza médio: a parte mais clara do logo ainda tem {L["pior"]:.1f}:1 contra o papel'.replace('.', ',')
     + ' (o mínimo é 3:1). Nada que informa depende de cor.'),
    ('uma-cor', 'Logo claro, em uma cor', 'O logo claro demais, impresso em uma cor só', carne('uma-cor'),
     f'<b>Logo claro demais ({C["pior"]:.1f}:1 contra o papel)</b>'.replace('.', ',')
     + ', impresso como a sócia escolheu: “em uma cor só”, na cor da tinta. O desenho é o mesmo; só a cor muda, e só no papel.'),
]

EST_RB = [
    ('largo', 'Logo largo', 'Logo horizontal do escritório', recibo('largo'),
     '<b>Logo largo no timbrado</b>, numa caixa de até 92 × 20 mm, no lugar do nome em letra. À direita, como no aprovado: razão social, CNPJ, '
     'registro da sociedade na OAB, endereço, WhatsApp e e-mail.'),
    ('quadrado', 'Logo quadrado', 'Logo quadrado, com o nome ao lado', recibo('quadrado'),
     '<b>Logo quadrado, com o nome em letra ao lado</b>, como no carnê.'),
    ('pb', 'Preto e branco', 'O logo largo numa impressora comum', recibo('largo'),
     '<b>Prévia em preto e branco.</b> O logo sai em cinza e continua legível. O âmbar do filete some sem perder nada, como no aprovado.'),
]

SVG_IMP = RB['SVG_IMP']
cab_cn = (f'<header class="cn-barra"><h1>Prévia do carnê com logo<small>Hélio Batista Corrêa · C-2026-014 · <span id="desc"></span></small></h1>'
          f'<button type="button" onclick="window.print()">Imprimir</button></header>')
css_cn = CN['CSS'] + '\n.lg-var{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:8px 24px;background:#4F1D35}\n' \
    '.lg-var a{display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border-radius:22px;color:#fff;text-decoration:none;font-size:13px;font-weight:500;border:1px solid rgba(242,205,179,.45)}\n' \
    '.lg-var a[aria-current]{background:var(--ambar-3);color:var(--vinho);border-color:var(--ambar-3)}\n.lg-var a:focus-visible{outline:3px solid var(--ambar-3);outline-offset:2px}\n' \
    '.cn-barra button{margin-left:auto}\n@media print{.lg-var{display:none!important}}\n@media screen and (max-width:760px){.lg-var{padding:6px 16px}}\n'
out = pagina('carne-logo-a4.html', 'Carnê com logo · Hélio Batista Corrêa · C-2026-014',
             'Carnê de pagamento com o logo do escritório Ribeiro &amp; Matos no alto de cada via, modelo T3jus.',
             cab_cn, 'Variações do carnê com logo', EST_CN, css_cn, 'cn')
open(f'{SAIDA}/carne-logo-a4.html', 'w', encoding='utf-8').write(out)

cab_rb = (f'<header class="rb-barra"><a class="rb-voltar" href="financeiro-nao-paga.html?estado=a-receber">{RB["SVG_ESQ"]}Voltar ao Financeiro</a>'
          f'<h1>Recibo nº 2026-0187<small>Hélio Batista Corrêa · C-2026-014 · <span id="desc"></span></small></h1>'
          f'<div class="rb-acoes"><p class="rb-dica" id="rb-dica">Na janela que abrir, escolha <b>Salvar como PDF</b> para baixar, ou a impressora.</p>'
          f'<button type="button" onclick="window.print()" aria-describedby="rb-dica">{SVG_IMP}Baixar PDF ou imprimir</button></div></header>')
out = pagina('recibo-logo-a4.html', 'Recibo 2026-0187 · Hélio Batista Corrêa · Ribeiro &amp; Matos',
             'Recibo de honorários em A4 com o logo do escritório Ribeiro &amp; Matos no timbrado, modelo T3jus.',
             cab_rb, 'Variações do recibo com logo (só no desenho)', EST_RB, RB['CSS'], 'rb')
open(f'{SAIDA}/recibo-logo-a4.html', 'w', encoding='utf-8').write(out)
print('carne-logo-a4 e recibo-logo-a4 ok', len(EST_CN), '+', len(EST_RB), 'estados')
