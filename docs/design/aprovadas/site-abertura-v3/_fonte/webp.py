# Converte as capturas da página para WebP e prepara as três aberturas do antes x depois.
# Uso: python3 webp.py <pasta-da-entrega> <pasta-png> <captura-do-site-no-ar.png> <abertura-v2.webp>
import sys, os
from PIL import Image
sai, png, atual, v2 = sys.argv[1:5]
Q = dict(quality=82, method=6)

def w(im, nome):
    im.convert('RGB').save(os.path.join(sai, nome + '.webp'), 'WEBP', **Q); print(nome, im.size)

im = Image.open(os.path.join(png, 'site-inicio-computador.png'))
w(im.resize((1440, im.size[1] // 2), Image.LANCZOS), 'site-inicio-computador')
c = Image.open(os.path.join(png, 'site-inicio-celular.png'))  # 2x passaria do limite do WebP (16383 px)
w(c.resize((390, c.size[1] // 2), Image.LANCZOS), 'site-inicio-celular')
w(Image.open(os.path.join(png, 'site-abertura-computador.png')), 'site-abertura-computador')
w(Image.open(os.path.join(png, 'site-abertura-celular.png')), 'site-abertura-celular')
w(Image.open(os.path.join(png, 'site-abertura-rolada-computador.png')), 'site-abertura-rolada-computador')
for n in ('site-rolagem-destaque-computador', 'site-rolagem-destaque-celular', 'site-rolagem-abas-computador', 'site-rolagem-chamada-computador'):
    w(Image.open(os.path.join(png, n + '.png')), n)
for t in ('computador', 'celular'):
    for a in ('comercial', 'financeiro'):
        w(Image.open(os.path.join(png, f'site-abas-{a}-{t}.png')), f'site-abas-{a}-{t}')

# aberturas em 1440 x 900 para o antes x depois
d = os.path.join(png, 'antes-depois'); os.makedirs(d, exist_ok=True)
a = Image.open(atual).convert('RGB'); k = 1440 / a.size[0]
a.resize((1440, round(a.size[1] * k)), Image.LANCZOS).crop((0, 0, 1440, 900)).save(os.path.join(d, 'atual.png'))
Image.open(v2).convert('RGB').resize((1440, 900), Image.LANCZOS).save(os.path.join(d, 'v2.png'))
Image.open(os.path.join(png, 'site-abertura-computador.png')).convert('RGB').resize((1440, 900), Image.LANCZOS).save(os.path.join(d, 'v3.png'))
print('webp ok')
