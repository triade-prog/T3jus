# Junta antes (esquerda) e depois (direita) num .webp por tela: python3 _fonte/juntar.py <pasta>
import sys
from PIL import Image, ImageDraw, ImageFont
d = sys.argv[1]
TELAS = {'1600': 'computador-1600', '1440': '1440', '1024': '1024', 'celular': 'celular'}
try:
    fonte = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 26)
except OSError:
    fonte = ImageFont.load_default()
for t in ('origem', 'funil'):
    for tela, sufixo in TELAS.items():
        a, b = (Image.open(f'{d}/{v}-{t}-{tela}.png') for v in ('antes', 'depois'))
        gap, topo = 48, 56
        col = max(a.width, b.width)
        out = Image.new('RGB', (col * 2 + gap * 3, max(a.height, b.height) + gap + topo), '#F1E6DF')
        dr = ImageDraw.Draw(out)
        dr.text((gap, 16), 'ANTES', fill='#5E4A54', font=fonte)
        dr.text((gap * 2 + col, 16), 'DEPOIS (PROPOSTA)', fill='#5E4A54', font=fonte)
        out.paste(a, (gap, topo)); out.paste(b, (gap * 2 + col, topo))
        out.save(f'{d}/comparacao-{t}-{sufixo}.webp', 'WEBP', quality=88, method=6)
