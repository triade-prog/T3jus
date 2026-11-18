"""Recolore os SVGs oficiais com a paleta Gabinete, trocando só fill e stop-color. Aprovado pela Carol em 18/11/2026 (opção A). Uso: python3 -I docs/marca/ferramentas/recolorir.py docs/marca/svg-original docs/marca/svg"""
import sys, os, re
SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
VINHO, VINHO2, ESC, AMBAR, SAL = '#692746', '#87335B', '#4F1D35', '#DD9760', '#F1E6DF'
# arquivo de saída -> (arquivo de origem, lista de cores na ordem dos <path fill>, troca do degradê)
M = {
 'logo-completo-cor.svg':          ('logo-completo-cor.svg',   [AMBAR]*3 + [VINHO]*2),
 'logo-completo-sobre-vinho.svg':  ('logo-completo-cor.svg',   [AMBAR]*3 + [SAL]*2),
 'logo-completo-vinho.svg':        ('logo-completo-vinho.svg', [VINHO]*5),
 'logo-completo-sal.svg':          ('logo-completo-sal.svg',   [SAL]*5),
 'logo-compacto-cor.svg':          ('logo-compacto-cor.svg',   [AMBAR, VINHO]),
 'logo-compacto-sobre-vinho.svg':  ('logo-compacto-cor.svg',   [AMBAR, SAL]),
 'logo-compacto-vinho.svg':        ('logo-compacto-vinho.svg', [VINHO]*2),
 'logo-compacto-sal.svg':          ('logo-compacto-sal.svg',   [SAL]*2),
 'simbolo-ambar.svg':              ('simbolo-ambar.svg',       [AMBAR]),
 'simbolo-vinho.svg':              ('simbolo-vinho.svg',       [VINHO]),
 'simbolo-sal.svg':                ('simbolo-sal.svg',         [SAL]),
 'icone-app.svg':                  ('icone-app.svg',           [SAL]),
 'icone-app-quadrado.svg':         ('icone-app-quadrado.svg',  [SAL]),
 'selo-cor.svg':                   ('selo-cor.svg',            [ESC, AMBAR, SAL]),
}
DEGRADE = {'#8C1338': VINHO2, '#50011C': VINHO, '#340112': ESC}
d = lambda s: re.findall(r' d="([^"]*)"', s)
for out, (src, cores) in M.items():
    s = open(os.path.join(SRC, src)).read()
    fills = re.findall(r'<path fill="(#[0-9A-Fa-f]{6})"', s)
    assert len(fills) == len(cores), (out, fills)
    it = iter(cores)
    t = re.sub(r'<path fill="#[0-9A-Fa-f]{6}"', lambda m: f'<path fill="{next(it)}"', s)
    for a, b in DEGRADE.items():
        t = t.replace(f'stop-color="{a}"', f'stop-color="{b}"')
    # conferência: tudo igual, menos as cores
    norm = lambda x: re.sub(r'(fill|stop-color)="#[0-9A-Fa-f]{6}"', '', x)
    assert norm(t) == norm(s) and d(t) == d(s), out
    open(os.path.join(OUT, out), 'w').write(t)
    print(out, '<-', src, cores)
