# Converte as capturas PNG em WebP (qualidade 82) e apaga os PNG.
# O WebP aceita no máximo 16.383 px de lado: uma captura mais alta é reduzida só o necessário para caber.
import sys, glob, os
from PIL import Image
d = sys.argv[1] if len(sys.argv) > 1 else 'saida'
LIM = 16383
for p in sorted(glob.glob(os.path.join(d, '*.png'))):
    im = Image.open(p)
    if max(im.size) > LIM:
        f = LIM / max(im.size)
        im = im.resize((round(im.size[0] * f), round(im.size[1] * f)), Image.LANCZOS)
        print('reduzida para caber no WebP:', os.path.basename(p), im.size)
    im.save(p[:-4] + '.webp', 'WEBP', quality=82, method=6)
    os.remove(p)
print('ok')
