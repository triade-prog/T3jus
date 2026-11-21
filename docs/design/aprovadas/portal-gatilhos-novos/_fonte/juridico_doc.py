# Ficha do caso no Jurídico, com uma linha discreta em cada documento que falta: o lembrete automático (PA-06).
# Lê o juridico.py aprovado até o começo dos estados e muda só o item "Falta" da folha Documentos e a nota do pé.
# Peças novas com prefixo gn-. Uso: python3 juridico_doc.py <pasta-saida>
import os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
_src = open(os.path.join(AQUI, 'juridico.py'), encoding='utf-8').read()
_src = _src[:_src.index('# ---------------------------------------------------------------- estados')]

_velho = "f'<p class=\"doc-meta\"><span class=\"selo selo-atencao\">Falta</span><span>{quem} · pedido em {desde}</span></p></div>'"
assert _velho in _src
_src = _src.replace(_velho, "f'<p class=\"doc-meta\"><span class=\"selo selo-atencao\">Falta</span><span>{quem} · pedido em {desde}</span></p>{AUTO.get(nome, \"\")}</div>'")
_pe = "“Pedir de novo” abre a conversa do cliente com o texto pronto."
assert _pe in _src
_src = _src.replace(_pe, "“Pedir de novo” abre a conversa do cliente com o texto pronto e recomeça a contagem do lembrete automático.")
exec(compile(_src, 'juridico.py', 'exec'), globals())

AUTOM = 'gatilhos.html?estado=doc-ligar'
AUTO = {
    'CTPS digital de Carlos': (f'<p class="gn-ju-auto">{ico("raio")}<span><b>Lembrete automático enviado em 16/11.</b> Se não chegar até 23/11, passa para Larissa Costa. '
                               f'<a href="{AUTOM}">Ver a automação<span class="sr"> Lembrete de documento que falta</span></a></span></p>'),
    'Holerites de janeiro a março de 2025': (f'<p class="gn-ju-auto">{ico("raio")}<span><b>Lembrete automático enviado ontem, 17/11.</b> Se não chegar até 24/11, passa para Larissa Costa.</span></p>'),
}

CSS_GN = r"""
.gn-ju-auto{display:flex;align-items:flex-start;gap:6px;margin:6px 0 0;font-size:12px;line-height:1.45;color:var(--texto-2)}
.gn-ju-auto .ico{width:14px;height:14px;color:var(--vinho-2);flex:none;margin-top:2px}
.gn-ju-auto b{font-weight:500;color:var(--texto)}
.gn-ju-auto a{color:var(--vinho);font-weight:500}
"""
SPRITE_GN = ('<svg xmlns="http://www.w3.org/2000/svg" style="display:none">'
             '<symbol id="i-raio" viewBox="0 0 24 24"><path d="M13.5 3 5 13.5h6.5L10.5 21 19 10.5h-6.5L13.5 3Z"/></symbol></svg>')

F = A('Casos e processos', 'Jurídico|Casos e processos|Pereira x Mercado Bom Preço', 'Pereira x Mercado Bom Preço')
T = tpl('ficha', ficha() + j_etapa() + j_prazo(), **F)
out = pagina('Jurídico', 'Ficha do caso com o lembrete automático de documento que falta.',
             '{"estado":"ficha","atual":"juridico"}', '', T, BARRAS)
out = out.replace('</style>', CSS_JU + CSS_GN + '\n</style>', 1)
out = out.replace('<div class="app">', SPRITE_GN + '\n<div class="app">', 1)
open(f'{SAIDA}/juridico-lembrete.html', 'w', encoding='utf-8').write(out)
print('juridico-lembrete ok')
