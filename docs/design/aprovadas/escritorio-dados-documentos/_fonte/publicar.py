# publicar.html: o mesmo index.html, com as capturas embutidas (data:image/webp, recomprimidas), numa página só.
# Os cliques nas imagens abrem o conta.html, o equipe.html e o documentos.html, que vão junto como arquivos de apoio.
# Uso: python3 publicar.py <pasta-saida>   (rode depois do webp.py)
import sys, os, base64, io
from PIL import Image
from casos import montar, SAIDA


def img(nome, tam):
    p = os.path.join(SAIDA, f'{nome}-{tam}.webp')
    b = io.BytesIO()
    Image.open(p).save(b, 'WEBP', quality=70, method=6)   # só para esta página, para ficar bem abaixo de 16 MB
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()


out = montar(img).replace('loading="lazy" ', '')
caminho = os.path.join(SAIDA, 'publicar.html')
open(caminho, 'w', encoding='utf-8').write(out)
mb = os.path.getsize(caminho) / 1024 / 1024
print(f'publicar.html: {mb:.1f} MB')
assert mb < 16, 'publicar.html passou de 16 MB'
