# A conferência do logo, feita de verdade nos PNG fictícios (a mesma conta que o servidor faria ao receber o arquivo):
# - corta a margem vazia (transparente ou branca) em volta;
# - mede o tamanho em pixels e a proporção;
# - acha as cores da borda do desenho, as que encostam no papel (5% ou mais da borda), e o contraste de cada uma com o papel branco
#   (fórmula da WCAG). Passa quando a parte mais clara tem 3:1 ou mais, o mínimo da WCAG para gráficos;
# - em preto e branco, o contraste é o mesmo (a impressora troca cada cor por um cinza de mesma luminância).
# Devolve as imagens já cortadas como data: URI (reduzidas para caber na página) e a versão "em uma cor só" do logo claro.
import base64, io, os
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
PASTA = os.path.join(AQUI, 'logos')
TINTA = (0x2A, 0x1A, 0x22)
MIN_LARGURA = 600     # px do lado maior; menos que isso sai borrado no recibo
MIN_CONTRASTE = 3.0


def _lin(c):
    c = c / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lum(rgb):
    r, g, b = (_lin(x) for x in rgb[:3])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contraste(rgb):
    return 1.05 / (lum(rgb) + 0.05)


def _cortar(im):
    a = im.getchannel('A')
    # pixel quase branco também conta como margem
    branco = Image.eval(im.convert('L'), lambda v: 0 if v > 245 else 255)
    m = Image.composite(a, Image.new('L', im.size, 0), branco)
    caixa = m.point(lambda v: 255 if v > 16 else 0).getbbox()
    return im.crop(caixa), caixa


def _cores(im):
    """Cores da borda de fora do desenho: as que encostam no papel (pixel pintado com um vizinho transparente)."""
    w, h = im.size
    P = im.load()
    vazio = lambda p: p[3] <= 16  # fundo transparente (no JPG, o fundo branco vira transparente antes)
    px = []
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            p = P[x, y]
            if p[3] >= 250 and (vazio(P[x - 1, y]) or vazio(P[x + 1, y]) or vazio(P[x, y - 1]) or vazio(P[x, y + 1])):
                px.append(p)
    cont = {}
    for r, g, b, _ in px:
        k = (r // 24 * 24 + 12, g // 24 * 24 + 12, b // 24 * 24 + 12)
        cont[k] = cont.get(k, 0) + 1
    tot = len(px) or 1
    grandes = [(k, n / tot) for k, n in cont.items() if n / tot >= 0.05]
    # ignora o branco de dentro do logo (letras vazadas): não é tinta no papel
    return [(k, f) for k, f in grandes if lum(k) < 0.85]


def _uri(im, largura):
    im = im.copy()
    if im.width > largura:
        im = im.resize((largura, round(im.height * largura / im.width)), Image.LANCZOS)
    b = io.BytesIO()
    im.quantize(colors=48, method=Image.Quantize.FASTOCTREE).save(b, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()


def _uma_cor(im):
    a = im.getchannel('A')
    out = Image.new('RGBA', im.size, TINTA + (0,))
    out.putalpha(a)
    return out


def conferir(nome, arquivo, peso_kb):
    im = Image.open(os.path.join(PASTA, arquivo)).convert('RGBA')
    orig = im.size
    cortado, caixa = _cortar(im)
    cores = _cores(cortado)
    pior = min(contraste(k) for k, _ in cores)
    d = dict(nome=nome, arquivo=arquivo, peso_kb=peso_kb, original=orig, tamanho=cortado.size,
             margem=(orig[0] - cortado.width, orig[1] - cortado.height), proporcao=cortado.width / cortado.height,
             pior=pior, passa=pior >= MIN_CONTRASTE and max(cortado.size) >= MIN_LARGURA,
             uri=_uri(cortado, 720), cores=[(('#%02X%02X%02X' % k), f, contraste(k)) for k, f in sorted(cores, key=lambda x: -x[1])])
    if not d['passa']:
        d['uri_uma_cor'] = _uri(_uma_cor(cortado), 720)
    return d


def br(x, casas=1):
    return f'{x:.{casas}f}'.replace('.', ',')


LOGOS = {
    'largo': conferir('largo', 'logo-largo.png', 84),
    'quadrado': conferir('quadrado', 'logo-quadrado.png', 61),
    'claro': conferir('claro', 'logo-claro.png', 79),
}

if __name__ == '__main__':
    for k, v in LOGOS.items():
        print(k, v['original'], '->', v['tamanho'], 'prop', round(v['proporcao'], 2), 'pior', round(v['pior'], 2), v['passa'],
              [(c, round(f, 2), round(r, 2)) for c, f, r in v['cores']], len(v['uri']) // 1024, 'KB')
