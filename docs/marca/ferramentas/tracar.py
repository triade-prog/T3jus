"""Contorna o logo oficial da Carol (PNG) e gera SVGs fiéis. Uso: python3 -I tracar.py docs/marca/originais <saida> (precisa do potracer: pip install --target <pasta> potracer)"""
import sys, os, json
sys.path.insert(0, os.environ.get('PYLIBS', ''))
import numpy as np
from PIL import Image, ImageFilter
import potrace

UP, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
SC = 4
AMBAR, VINHO, SAL = '#DE6A00', '#510116', '#FEFAF4'


def tracar(cob, ox=0, oy=0, turd=30):
    h, w = cob.shape
    g = Image.fromarray((cob * 255).astype(np.uint8)).resize((w * SC, h * SC), Image.LANCZOS).filter(ImageFilter.GaussianBlur(SC * 2.0))
    bm = np.asarray(g) >= 128
    tr = potrace.Bitmap(~bm).trace(turdsize=turd, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY,
                                   alphamax=1.0, opticurve=True, opttolerance=0.5)
    f = lambda p: '%.1f %.1f' % (p.x / SC - ox, p.y / SC - oy)
    d = []
    for c in tr:
        d.append('M' + f(c.start_point))
        for s in c.segments:
            if s.is_corner:
                d.append('L' + f(s.c) + 'L' + f(s.end_point))
            else:
                d.append('C' + f(s.c1) + ' ' + f(s.c2) + ' ' + f(s.end_point))
        d.append('Z')
    return ''.join(d)


def bbox(alfa, lim=0.3):
    ys, xs = np.where(alfa > lim)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


# ---- 1. Logo completo (âmbar e vinho, com "Sistema jurídico") ----
im = np.asarray(Image.open(os.path.join(UP, 'logo-ambar-e-bordo.png')).convert('RGBA')).astype(float) / 255
alfa = im[..., 3]
H, W = alfa.shape
yy, xx = np.mgrid[0:H, 0:W]
e_ambar = (xx < 660) | ((xx > 1440) & (yy > 590))
x0, y0, x1, y1 = bbox(alfa)
P = {}
P['simbolo'] = tracar(np.where(xx < 600, alfa, 0), x0, y0)
P['fio'] = tracar(np.where((xx >= 600) & (xx < 660), alfa, 0), x0, y0)
P['linha'] = tracar(np.where((xx > 1440) & (yy > 590), alfa, 0), x0, y0)
P['palavra'] = tracar(np.where(~e_ambar & (yy < 575), alfa, 0), x0, y0)
P['apoio'] = tracar(np.where(~e_ambar & (yy >= 575), alfa, 0), x0, y0, turd=8)
# símbolo isolado
sx0, sy0, sx1, sy1 = bbox(np.where(xx < 600, alfa, 0))
P['simbolo_so'] = tracar(np.where(xx < 600, alfa, 0), sx0, sy0)
mp = np.where(~e_ambar & (yy < 575), alfa, 0)
px0, py0, px1, py1 = bbox(mp)
P['palavra_so'] = tracar(mp, px0, py0)
json.dump({'completo': [int(x1 - x0), int(y1 - y0)], 'simbolo': [int(sx1 - sx0), int(sy1 - sy0)], 'palavra': [int(px1 - px0), int(py1 - py0)],
           'paths': P}, open(os.path.join(OUT, 'completo.json'), 'w'))

# ---- 2. Logo compacto (símbolo + T3jus, uma cor) ----
im2 = np.asarray(Image.open(os.path.join(UP, 'logo-vinho-sem-apoio.png')).convert('RGBA')).astype(float) / 255
a2 = im2[..., 3]
H2, W2 = a2.shape
yy2, xx2 = np.mgrid[0:H2, 0:W2]
c0, d0, c1, d1 = bbox(a2)
Q = {'simbolo': tracar(np.where(xx2 < 1000, a2, 0), c0, d0), 'palavra': tracar(np.where(xx2 >= 1000, a2, 0), c0, d0)}
json.dump({'compacto': [int(c1 - c0), int(d1 - d0)], 'paths': Q}, open(os.path.join(OUT, 'compacto.json'), 'w'))
print('ok', (x1 - x0, y1 - y0), (sx1 - sx0, sy1 - sy0), (c1 - c0, d1 - d0))
