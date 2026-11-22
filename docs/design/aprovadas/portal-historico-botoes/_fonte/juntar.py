# Junta antes (esquerda) e depois (direita) num PNG por grupo.
import sys
from PIL import Image
d = sys.argv[1]
GRUPOS = {
  'comparacao': (('dois', 'um', 'longo'), 'computador'),
  'comparacao-celular': (('dois', 'um', 'longo'), 'celular'),
  'comparacao-tabelas': (('propostas', 'contratos', 'elaboracao'), 'computador'),
  'comparacao-tabelas-1024': (('propostas', 'contratos', 'elaboracao'), 'computador-1024'),
  'comparacao-tabelas-celular': (('propostas', 'contratos', 'elaboracao'), 'celular'),
}
for nome, (casos, tela) in GRUPOS.items():
    linhas = [[Image.open(f'{d}/{v}-{c}-{tela}.png') for v in ('antes', 'depois')] for c in casos]
    gap = 48
    col = max(max(a.width, b.width) for a, b in linhas)
    out = Image.new('RGB', (col * 2 + gap * 3, sum(max(a.height, b.height) for a, b in linhas) + gap * (len(linhas) + 1)), '#F1E6DF')
    y = gap
    for a, b in linhas:
        out.paste(a, (gap, y)); out.paste(b, (gap * 2 + col, y))
        y += max(a.height, b.height) + gap
    out.save(f'{d}/{nome}.png', optimize=True)
