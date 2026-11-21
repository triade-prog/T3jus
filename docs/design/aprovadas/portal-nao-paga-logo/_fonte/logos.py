# Logos fictícios do escritório Ribeiro & Matos, para o desenho do envio do logo (F3.81, FI-23 e FI-14).
# São as cores do próprio escritório (azul-marinho e ouro velho), não as do T3jus: o logo é dele.
# Gera logos/_logos.html; o logos.cjs tira de cada um um PNG de fundo transparente, como o escritório enviaria.
#   largo   1800 x 420  horizontal, monograma e nome         (passa na conferência)
#   quadrado 800 x 800  só o monograma                        (passa; sai com o nome ao lado)
#   claro   1800 x 420  o mesmo desenho em ouro muito claro   (some no papel: recusado ao salvar)
# Uso: python3 logos.py
import os, re
from comum import CSS_BASE

AQUI = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(AQUI, 'logos'), exist_ok=True)
FONTES = '\n'.join(re.findall(r'@font-face\{[^}]*\}', CSS_BASE))

NAVY, OURO = '#1E3A5F', '#8A6534'
CLARO1, CLARO2 = '#EADBB8', '#F1E7CF'


def mono(tam, c1, c2, cheio=False):
    """Monograma R|M num círculo com anel."""
    if cheio:
        return (f'<svg width="{tam}" height="{tam}" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="{c1}"/>'
                f'<circle cx="50" cy="50" r="41" fill="none" stroke="{c2}" stroke-width="2.2"/>'
                f'<text x="31" y="63" font-family="Alegreya" font-weight="600" font-size="38" fill="#fff" text-anchor="middle">R</text>'
                f'<line x1="50" y1="30" x2="50" y2="70" stroke="{c2}" stroke-width="2.2"/>'
                f'<text x="69" y="63" font-family="Alegreya" font-weight="600" font-size="38" fill="#fff" text-anchor="middle">M</text></svg>')
    return (f'<svg width="{tam}" height="{tam}" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="{c1}" stroke-width="4"/>'
            f'<circle cx="50" cy="50" r="38" fill="none" stroke="{c2}" stroke-width="2"/>'
            f'<text x="31" y="63" font-family="Alegreya" font-weight="600" font-size="38" fill="{c1}" text-anchor="middle">R</text>'
            f'<line x1="50" y1="30" x2="50" y2="70" stroke="{c2}" stroke-width="2.4"/>'
            f'<text x="69" y="63" font-family="Alegreya" font-weight="600" font-size="38" fill="{c1}" text-anchor="middle">M</text></svg>')


def largo(c1, c2, id_):
    return (f'<div id="{id_}" class="lg" style="width:1800px;height:420px">{mono(380, c1, c2)}'
            f'<div class="txt"><p class="n" style="color:{c1}">RIBEIRO &amp; MATOS</p><p class="l" style="background:{c2}"></p>'
            f'<p class="s" style="color:{c2}">ADVOCACIA E CONSULTORIA</p></div></div>')


pagina = f'''<!doctype html><html><head><meta charset="utf-8"><style>
{FONTES}
body{{margin:0;background:transparent}}
.lg{{display:flex;align-items:center;gap:56px;padding:20px 30px;box-sizing:border-box}}
.txt p{{margin:0}}
.n{{font-family:Alegreya;font-weight:600;font-size:112px;letter-spacing:.05em;line-height:1;white-space:nowrap}}
.l{{height:6px;width:100%;margin:22px 0 20px!important}}
.s{{font-family:Poppins;font-weight:500;font-size:37px;letter-spacing:.40em;white-space:nowrap}}
#quadrado{{width:800px;height:800px;display:grid;place-items:center}}
</style></head><body>
{largo(NAVY, OURO, "largo")}
<div id="quadrado">{mono(760, NAVY, "#C9A56A", cheio=True)}</div>
{largo(CLARO1, CLARO2, "claro")}
</body></html>'''
open(os.path.join(AQUI, 'logos', '_logos.html'), 'w', encoding='utf-8').write(pagina)
print('logos.html ok')
