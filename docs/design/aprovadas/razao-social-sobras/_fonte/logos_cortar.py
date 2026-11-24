# Corta a margem vazia dos logos fictícios, como o T3jus faz no envio (decisão aprovada em portal-nao-paga-logo).
# Uso: python3 logos_cortar.py
import os
from PIL import Image
AQUI = os.path.dirname(os.path.abspath(__file__))
for n in ('largo', 'quadrado'):
    p = os.path.join(AQUI, 'logos', f'logo-{n}.png')
    im = Image.open(p).convert('RGBA')
    im.crop(im.getchannel('A').getbbox()).save(p)
    print(n, Image.open(p).size)
