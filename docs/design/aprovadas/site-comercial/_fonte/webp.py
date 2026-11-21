# Converte as capturas PNG em WebP (qualidade 80) e apaga os PNG. Páginas muito altas são reduzidas para caber no limite do WebP.
import sys, glob, os
from PIL import Image
d = sys.argv[1] if len(sys.argv) > 1 else '..'
for p in sorted(glob.glob(os.path.join(d, '*.png'))):
    im = Image.open(p).convert('RGB')
    if im.size[1] > 16000:
        f = 16000 / im.size[1]
        im = im.resize((round(im.size[0] * f), 16000), Image.LANCZOS)
    im.save(p[:-4] + '.webp', 'WEBP', quality=80, method=6)
    os.remove(p)
print('webp ok')
