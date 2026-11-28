# Os dados fictícios do plano (seção 9) sobre as telas aprovadas, que usam outros nomes.
# Só troca texto na página pronta; as peças aprovadas não mudam. A ordem importa (Marina Ribeiro sai antes de
# Antônia virar Marina; Rosa Almeida sai antes de Joana virar Rosa). Uso: import nomes_181; nomes_181.trocar(html)

TROCAS = [
    # equipe e escritório
    ('Paula Nunes', 'Carla Nunes'),            # a pessoa "sem área" do desenho aprovado, para não confundir com a dona
    ('Marina Ribeiro', 'Paula Reis'),          # a sócia dona
    ("nome:'Paula Reis',ini:'M'", "nome:'Paula Reis',ini:'P'"),
    ('Marina e Felipe', 'Bianca'),
    ('Felipe Matos', 'Bianca Torres'),         # Contratos
    ('Diego Almeida', 'Diego Martins'),        # Comercial
    ('Ribeiro &amp; Matos', 'Reis &amp; Coelho'), ('Ribeiro & Matos', 'Reis & Coelho'),
    ('<span class="mo" aria-hidden="true">R</span>', '<span class="mo" aria-hidden="true">R</span>'),
    # a cliente
    ('Rosa Almeida', 'Sônia Prado'),           # quem indicou
    ('Antônia Ferreira Prado', 'Marina Alves Coelho'), ('Antônia', 'Marina'),
    ('joana.prado', 'rosa.coelho'), ('Joana Prado', 'Rosa Alves Coelho'), ('Joana', 'Rosa'),
    ('Filha · acompanha o caso', 'Mãe · acompanha o caso'), ('(filha)', '(mãe)'), ('>filha<', '>mãe<'),
    # as datas: o pedido e a exclusão em 20/11/2026 (revisão b11)
    ('18/11/2026', '20/11/2026'), ('em 18/11', 'em 20/11'), ('de 18/11', 'de 20/11'), ('vencido há 5 dias', 'vencido há 7 dias'),
]


def trocar(h):
    for a, b in TROCAS:
        h = h.replace(a, b)
    return marca(h)


# A marca de hoje (LogoCompacto) também nas páginas de Comercial, Contratos e Lembretes, que vêm de desenhos
# aprovados antes do logo novo: a mesma troca que o pendencias.py aprovado faz na página dele.
import os, re
_p = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pendencias.py'), encoding='utf-8').read()
_M = {'re': re}
exec(compile(_p[_p.index('# ---------------------------------------------------------------- marca de hoje'):_p.index('# ---------------------------------------------------------------- CSS novo')], 'pendencias.py (marca)', 'exec'), _M)


def marca(out):
    if 'T<b>3</b>jus' not in out and 'T<i>3</i>jus' not in out:
        return out
    sp = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">'
    assert sp in out
    out = out.replace(sp, sp + _M['LOGO_SYMBOL'], 1)
    out = re.sub(r'(<a class="marca-palavra"[^>]*>)T<b>3</b>jus(</a>)', r'\g<1>' + _M['LOGO'] + r'\2', out)
    out = out.replace('<b>T<i>3</i>jus</b><span>Portal</span>', _M['LOGO'] + '<span>Portal</span>')
    out = out.replace('</style>', _M['CSS_LOGO'] + '.marca-palavra{min-height:44px;align-items:center}\n</style>', 1)
    assert 'T<b>3</b>jus' not in out and 'T<i>3</i>jus' not in out
    return out
