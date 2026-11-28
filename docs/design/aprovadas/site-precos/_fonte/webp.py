# Converte as capturas PNG (2x) para WebP. O WebP aceita no máximo 16.383 px de altura:
# a página inteira que passar disso é reduzida na mesma proporção (o arquivo diz a escala no index.html).
# Uso: python3 webp.py <pasta-png> <pasta-do-desenho>
import sys, os, glob, json
from PIL import Image
png, sai = sys.argv[1:3]
info = {}
for f in sorted(glob.glob(os.path.join(png, 'precos-*.png'))):
    nome = os.path.basename(f)[:-4]
    im = Image.open(f).convert('RGB')
    k = min(1, 16383 / im.size[1])
    if k < 1:
        im = im.resize((round(im.size[0] * k), round(im.size[1] * k)), Image.LANCZOS)
    im.save(os.path.join(sai, nome + '.webp'), 'WEBP', quality=82, method=6)
    info[nome] = dict(largura=im.size[0], altura=im.size[1], escala=round(2 * k, 2))
    print(nome, im.size, 'escala', round(2 * k, 2))
json.dump(info, open(os.path.join(png, '_tamanhos.json'), 'w'), indent=1)
