# Logo fictício do escritório Santana Advocacia (Salvador). Cópia do logos.py de carne-recibo-razao-social;
# o acréscimo é o logo quadrado (só o monograma), para o "logo e o nome ao lado".
# Mesmo jeito do logos.py de portal-nao-paga-logo: cores do próprio escritório (verde-petróleo e bronze),
# não as do T3jus, porque o logo é dele. Gera logos/_logos.html; o logos.cjs tira o PNG de fundo transparente.
# Uso: python3 logos.py
import os, re
from comum import CSS_BASE

AQUI = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(AQUI, 'logos'), exist_ok=True)
FONTES = '\n'.join(re.findall(r'@font-face\{[^}]*\}', CSS_BASE))
C1, C2 = '#1F4A4C', '#8A6534'

mono = (f'<svg width="380" height="380" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="{C1}" stroke-width="4"/>'
        f'<circle cx="50" cy="50" r="38" fill="none" stroke="{C2}" stroke-width="2"/>'
        f'<text x="50" y="66" font-family="Alegreya" font-weight="600" font-size="50" fill="{C1}" text-anchor="middle">S</text></svg>')
pagina = f'''<!doctype html><html><head><meta charset="utf-8"><style>
{FONTES}
body{{margin:0;background:transparent}}
.lg{{display:flex;align-items:center;gap:56px;padding:20px 30px;box-sizing:border-box;width:1800px;height:420px}}
.txt p{{margin:0}}
.qd{{display:inline-block;padding:20px}}
.n{{font-family:Alegreya;font-weight:600;font-size:118px;letter-spacing:.05em;line-height:1;white-space:nowrap;color:{C1}}}
.l{{height:6px;width:100%;margin:22px 0 20px!important;background:{C2}}}
.s{{font-family:Poppins;font-weight:500;font-size:37px;letter-spacing:.40em;white-space:nowrap;color:{C2}}}
</style></head><body>
<div id="largo" class="lg">{mono}<div class="txt"><p class="n">SANTANA</p><p class="l"></p><p class="s">ADVOCACIA · SALVADOR</p></div></div>
<div id="quadrado" class="qd">{mono}</div>
</body></html>'''
open(os.path.join(AQUI, 'logos', '_logos.html'), 'w', encoding='utf-8').write(pagina)
print('logos.html ok')
