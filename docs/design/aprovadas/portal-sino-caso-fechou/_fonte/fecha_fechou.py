# F3.150, pergunta 5: as duas frases que prometem o aviso, nas telas aprovadas do F3.132
# (portal-fechamento-sem-levantamento: fecha-larissa e encerrar-sem-contratos).
# Lê o fechamento.py aprovado até a parte "página", sem mudança no arquivo, e troca só as duas frases no texto-fonte.
# Grava fechamento.html só com esses dois estados, com a navegação comum (estados.py).
# Uso: python3 fecha_fechou.py <pasta-saida>
import os, sys, re

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
_SAIDA_F = sys.argv[1] if len(sys.argv) > 1 else 'saida'
_corte = '# ====================================================================================== página'
_src = open(os.path.join(AQUI, 'fechamento.py'), encoding='utf-8').read()
_src = _src[:_src.rindex(_corte)]

# As duas frases (PLANO.md, seção 6, estados 10 e 11, com o ajuste da especialista explicado no NOTAS.md)
TROCAS = [
    # 10. fecha-larissa: o texto de "quem faz" na ficha do cliente, para quem não tem o Financeiro
    ("'Quem faz: a área Financeiro, que não está liberada para você. Marina, Diego e Bianca.')",
     "'Quem faz: a área Financeiro, que não está liberada para você. Marina, Diego e Bianca. "
     "Quando o caso for encerrado no financeiro, quem é responsável por ele fica sabendo pelo sino.')"),
    # 11. encerrar-sem-contratos: a janela comum de encerrar, para quem não tem Contratos
    # Revisão do desenho, ajuste 1: a regra real do grupo A inclui a Bianca, e os nomes vêm em ordem alfabética (quemContratos, 0900)
    ('Quem encerra é a área Contratos (Marina e Felipe), no passo “Encerrar o contrato” da ficha de Noemi.</span></p></div>',
     'Quem encerra é a área Contratos (Bianca, Felipe e Marina), no passo “Encerrar o contrato” da ficha de Noemi. Eles recebem um aviso no sino.</span></p></div>'),
]
for a, b in TROCAS:
    assert _src.count(a) == 1, a
    _src = _src.replace(a, b)
exec(compile(_src, 'fechamento.py', 'exec'), globals())
SAIDA = _SAIDA_F

import estados

QUERO = ['fecha-larissa', 'encerrar-sem-contratos']
_tpls_f = {m.group(1): m.group(0) for m in re.finditer(r'<template data-est="([^"]+)"[^>]*>.*?</template>\n', T, re.S)}
assert all(e in _tpls_f for e in QUERO)
T2 = ''.join(_tpls_f[e] for e in QUERO)
assert '(Bianca, Felipe e Marina), no passo' in T2 and 'Eles recebem um aviso no sino.' in T2 and 'quem é responsável por ele fica sabendo pelo sino' in T2

# Revisão do desenho, ajuste 11: o padrão do campo âmbar nunca fica atrás de texto (conceito-gabinete.md). O "Quem faz" fica
# sobre um retalho liso da própria cor do campo, acima do padrão do canto.
CSS_FF = '''
/* F3.150: o texto de "Quem faz" fica limpo do padrão decorativo do canto */
.fl-passo .jf-quem{position:relative;z-index:1;background:var(--ambar);box-shadow:0 0 0 6px var(--ambar);border-radius:4px}
'''

NAV = estados.nav('fechamento.html', ico)
out = pagina('Fechamento do caso', 'Portal: as frases que prometem o aviso no sino quando o caso é encerrado no financeiro (F3.150, pergunta 5).',
             '{"estado":"fecha-larissa","atual":"clientes"}', '', T2, ''.join(BARRAS.values()))
out = out.replace('</style>', CSS_CL + '\n' + J['CSS_JU'] + '\n' + CSS_FL + '\n' + CSS_EXTRA + '\n' + CSS_JF + '\n' + CSS_EX + '\n' + CSS_FS + '\n' + CSS_FF + '\n</style>', 1)
out = out.replace('<script>\n(function(){', NAV + '\n<script>\n(function(){', 1)
out = out.replace("  if(q.get('mais')){", "  if(location.hash){ var alvo=document.getElementById(location.hash.slice(1)); if(alvo&&alvo.hasAttribute('tabindex')){ alvo.focus(); alvo.scrollIntoView() } }\n  if(q.get('mais')){", 1)
assert out.count('id="fl-estados"') == 1
os.makedirs(SAIDA, exist_ok=True)
open(os.path.join(SAIDA, 'fechamento.html'), 'w', encoding='utf-8').write(out)
print('fechamento ok', len(QUERO), 'estados,', len(out) // 1024, 'KB')
