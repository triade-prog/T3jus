# publicar.html: o mesmo index.html, com as capturas embutidas (data:image/webp, recomprimidas), para publicar
# como uma página só. Os cliques nas imagens abrem juridico.html, lembretes.html e cliente.html, que vão junto como arquivos de apoio.
# Uso: python3 publicar.py <pasta-saida>   (rode depois do webp.py)
import sys, os, base64, io
from PIL import Image
sys.argv = sys.argv[:2]
from casos import montar, SAIDA

def img(nome, tam):
    p = os.path.join(SAIDA, f'{nome}-{tam}.webp')
    # Recomprime só para a página de publicar (qualidade 70), para ficar bem abaixo de 16 MB
    b = io.BytesIO()
    Image.open(p).save(b, 'WEBP', quality=70, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()

out = montar(img).replace('loading="lazy" ', '')
caminho = os.path.join(SAIDA, 'publicar.html')
open(caminho, 'w', encoding='utf-8').write(out)
mb = os.path.getsize(caminho) / 1024 / 1024
print(f'publicar.html: {mb:.1f} MB')
assert mb < 16, 'publicar.html passou de 16 MB'
