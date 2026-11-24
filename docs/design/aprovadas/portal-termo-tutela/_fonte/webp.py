# Converte as capturas PNG em WebP (qualidade 82) e apaga os PNG.
import sys, glob, os
from PIL import Image
d = sys.argv[1] if len(sys.argv) > 1 else 'saida'
for p in sorted(glob.glob(os.path.join(d, '*.png'))):
    Image.open(p).save(p[:-4] + '.webp', 'WEBP', quality=82, method=6)
    os.remove(p)
print('ok')
