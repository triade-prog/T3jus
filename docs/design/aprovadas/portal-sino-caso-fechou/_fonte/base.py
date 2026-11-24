# Base das duas telas: a moldura do Portal v1 (comum.py, sem mudança), as peças de formulário do extra.py
# e as peças da ficha aprovada do Clientes (clientes.py, lido até o começo dos estados, sem mudança).
import os, sys
from extra import *  # noqa: F401,F403  (comum.py vem junto)
import extra as _extra

AQUI = os.path.dirname(os.path.abspath(__file__))
_src = open(os.path.join(AQUI, 'clientes.py'), encoding='utf-8').read()
_src = _src[:_src.index('# ---------------------------------------------------------------- estados')]
exec(compile(_src, 'clientes.py', 'exec'), globals())
# O clientes.py traz o próprio campo() e selecao() (os da ficha aprovada); o rádio em cartões vem do extra.py.
opcoes_radio = _extra.opcoes_radio

# Ícones a mais, no mesmo traço (grade 24, 1,6, cantos vivos)
SPRITE_NOVO = ('<svg xmlns="http://www.w3.org/2000/svg" style="display:none">'
               '<symbol id="i-sino-mudo" viewBox="0 0 24 24"><path d="M6 16.5V11a6 6 0 0 1 9.2-5.1"/><path d="M18 10.2v6.3l1.5 2H8"/><path d="M10 21h4"/><path d="M4 20 20 4"/></symbol>'
               '<symbol id="i-sino-volta" viewBox="0 0 24 24"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15Z"/><path d="M10 21h4"/><path d="m9.5 11.5 2 2 3.5-3.5"/></symbol>'
               '<symbol id="i-checks" viewBox="0 0 24 24"><path d="m2.5 12.5 4 4 8-9"/><path d="m11.5 16 1 .5 8-9"/></symbol>'
               '</svg>')


def finalizar_sas(out, css):
    """Acabamento: CSS do formulário (extra.py), ícones novos e links que ficam dentro desta pasta."""
    out = out.replace('</style>', CSS_X + css + '\n</style>', 1)
    out = out.replace('<div class="app">', SPRITE_EXTRA + SPRITE_NOVO + '\n<div class="app">', 1)
    return out
