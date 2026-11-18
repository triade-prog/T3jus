"""Monta os SVGs oficiais a partir dos contornos. Uso: python3 -I montar.py <saida-json> <pasta-svg>"""
import sys, os, json

J, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
AMBAR, VINHO, SAL = '#DE6A00', '#510116', '#FEFAF4'
C = json.load(open(os.path.join(J, 'completo.json')))
K = json.load(open(os.path.join(J, 'compacto.json')))


def svg(w, h, corpo, titulo, m=0):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-m} {-m} {w + 2 * m} {h + 2 * m}" '
            f'role="img" aria-label="{titulo}"><title>{titulo}</title>{corpo}</svg>\n')


def p(d, cor):
    return f'<path fill="{cor}" fill-rule="evenodd" d="{d}"/>'


P = C['paths']
w, h = C['completo']
ARQ = {}
for nome, (cs, cp) in {'cor': (AMBAR, VINHO), 'vinho': (VINHO, VINHO), 'sal': (SAL, SAL)}.items():
    corpo = ''.join(p(P[k], cs) for k in ('simbolo', 'fio', 'linha')) + ''.join(p(P[k], cp) for k in ('palavra', 'apoio'))
    ARQ[f'logo-completo-{nome}.svg'] = svg(w, h, corpo, 'T3jus, Sistema Jurídico', 24)

# Compacto: o símbolo e a palavra do logo principal, na disposição da versão sem "Sistema jurídico"
# (medida no arquivo enviado: palavra com 66% da altura do símbolo, 15% abaixo do topo, vão de 10,5%).
sw, sh = C['simbolo']
pw, ph = C['palavra']
e = 0.66 * sh / ph
gx, gy = sw + 0.105 * sh, 0.154 * sh
w2, h2 = gx + pw * e, sh
for nome, (cs, cp) in {'cor': (AMBAR, VINHO), 'vinho': (VINHO, VINHO), 'sal': (SAL, SAL)}.items():
    corpo = p(P['simbolo_so'], cs) + f'<g transform="translate({gx:.1f} {gy:.1f}) scale({e:.4f})">{p(P["palavra_so"], cp)}</g>'
    ARQ[f'logo-compacto-{nome}.svg'] = svg(round(w2), round(h2), corpo, 'T3jus', 12)

sw, sh = C['simbolo']
for nome, cor in {'ambar': AMBAR, 'vinho': VINHO, 'sal': SAL}.items():
    ARQ[f'simbolo-{nome}.svg'] = svg(sw, sh, p(P['simbolo_so'], cor), 'T3jus', 8)

# Ícone de aplicativo (como o enviado): quadrado arredondado com degradê vinho e o símbolo em sal.
L = 1024
esc = 0.62 * L / max(sw, sh)
tx, ty = (L - sw * esc) / 2, (L - sh * esc) / 2 + 8
icone = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {L} {L}" role="img" aria-label="T3jus"><title>T3jus</title>'
         '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
         '<stop offset="0" stop-color="#8C1338"/><stop offset=".5" stop-color="#50011C"/><stop offset="1" stop-color="#340112"/>'
         f'</linearGradient></defs><rect width="{L}" height="{L}" rx="230" fill="url(#g)"/>'
         f'<g transform="translate({tx:.1f} {ty:.1f}) scale({esc:.4f})">{p(P["simbolo_so"], SAL)}</g></svg>\n')
ARQ['icone-app.svg'] = icone
ARQ['icone-app-quadrado.svg'] = icone.replace('rx="230"', 'rx="0"')  # apple-icon: o celular arredonda

for n, s in ARQ.items():
    open(os.path.join(OUT, n), 'w').write(s)
print(len(ARQ), 'arquivos;', {n: len(s) // 1024 for n, s in ARQ.items()})
