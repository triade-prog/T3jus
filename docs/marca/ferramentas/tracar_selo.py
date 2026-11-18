"""Contorna o selo da Carol (Gestão jurídica · T3jus · Escritório em ordem) em três camadas: disco vinho,
ouro (anéis, pontos e símbolo) e letras em sal. Uso: PYLIBS=<pasta> python3 -I tracar_selo.py docs/marca/originais <pasta-svg>"""
import sys, os
sys.path.insert(0, os.environ.get('PYLIBS', ''))
import numpy as np
from PIL import Image, ImageFilter
import potrace

UP, OUT = sys.argv[1], sys.argv[2]
SC = 3
VINHO, OURO, SAL = '#510118', '#FCAE01', '#FAF6EC'
im = np.asarray(Image.open(os.path.join(UP, 'selo.png')).convert('RGBA')).astype(float)
alfa = im[..., 3] / 255
g, b = im[..., 1], im[..., 2]
# pixel = vinho + co*(ouro - vinho) + cs*(sal - vinho), resolvido nos canais verde e azul
A = np.array([[173.0, 245.0], [-23.0, 212.0]])
inv = np.linalg.inv(A)
co = np.clip(inv[0, 0] * (g - 1) + inv[0, 1] * (b - 24), 0, 1) * (alfa > 0.5)
cs = np.clip(inv[1, 0] * (g - 1) + inv[1, 1] * (b - 24), 0, 1) * (alfa > 0.5)
ys, xs = np.where(alfa > 0.5)
x0, y0 = xs.min(), ys.min()
L = max(xs.max() - x0, ys.max() - y0) + 1


def tracar(cob, borrao=1.5, turd=20):
    h, w = cob.shape
    gr = Image.fromarray((cob * 255).astype(np.uint8)).resize((w * SC, h * SC), Image.LANCZOS).filter(ImageFilter.GaussianBlur(SC * borrao))
    tr = potrace.Bitmap(~(np.asarray(gr) >= 128)).trace(turdsize=turd, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY,
                                                        alphamax=1.0, opticurve=True, opttolerance=0.4)
    f = lambda p: '%.1f %.1f' % (p.x / SC - x0, p.y / SC - y0)
    d = []
    for c in tr:
        d.append('M' + f(c.start_point))
        for s in c.segments:
            d.append(('L' + f(s.c) + 'L' + f(s.end_point)) if s.is_corner else ('C' + f(s.c1) + ' ' + f(s.c2) + ' ' + f(s.end_point)))
        d.append('Z')
    return ''.join(d)


disco, ouro, sal = tracar(alfa, 2.0), tracar(co), tracar(cs, 0.8, 8)
p = lambda d, c: f'<path fill="{c}" fill-rule="evenodd" d="{d}"/>'
cab = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {L} {L}" role="img" aria-label="Gestão jurídica, T3jus, escritório em ordem"><title>Selo T3jus</title>'
os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, 'selo-cor.svg'), 'w').write(cab + p(disco, VINHO) + p(ouro, OURO) + p(sal, SAL) + '</svg>\n')
print('selo', L, len(disco) + len(ouro) + len(sal))
