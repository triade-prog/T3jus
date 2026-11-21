# Peças comuns da Agenda e das Conversas, por cima do comum.py (que fica sem mudança).
# Campos de formulário no mesmo desenho do clientes.py aprovado, ícones a mais e o acabamento da página.
import html
from comum import *

H = html.escape

# Ícones a mais, no mesmo traço (grade 24, 1,6, cantos vivos)
SPRITE_EXTRA = ('<svg xmlns="http://www.w3.org/2000/svg" style="display:none">'
                '<symbol id="i-video" viewBox="0 0 24 24"><path d="M3 6.5h12v11H3Z"/><path d="m15 10.5 6-3.5v10l-6-3.5"/></symbol>'
                '<symbol id="i-local" viewBox="0 0 24 24"><path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11Z"/><path d="M12 7.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"/></symbol>'
                '<symbol id="i-mao" viewBox="0 0 24 24"><path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11"/><path d="M11 10V4.5a1.5 1.5 0 0 1 3 0V11"/><path d="M14 10.5V6a1.5 1.5 0 0 1 3 0v8c0 4-2.5 7-6.5 7S5 18.5 4 16l-1.5-4a1.4 1.4 0 0 1 2.5-1.3L8 14"/></symbol>'
                '<symbol id="i-devolver" viewBox="0 0 24 24"><path d="M9 5 4 10l5 5"/><path d="M4 10h11a5 5 0 0 1 0 10h-3"/></symbol>'
                '<symbol id="i-sincronia" viewBox="0 0 24 24"><path d="M20 12a8 8 0 0 1-14.3 4.9"/><path d="M4 12a8 8 0 0 1 14.3-4.9"/><path d="M18.5 3v4.2h-4.2"/><path d="M5.5 21v-4.2h4.2"/></symbol>'
                '</svg>')

# Cabeçalho da ficha: o da ficha aprovada do Console v1, extraído do mesmo jeito que o clientes.py faz
_fi = open(APROV + 'console-v1/ficha.html', encoding='utf-8').read()
_cf = _fi[_fi.index('<style>') + 7:_fi.index('</style>')]
CSS_FICHA_CAB = '\n'.join(r.strip() + '}' for r in _cf.split('}')
                          if r.strip().startswith(('.ficha-cab', '.voltar', '.ident', '.meta', '.estatua', '.dir')))

EQUIPE = ['Marina Ribeiro (você)', 'Bianca Torres', 'Diego Almeida', 'Felipe Matos', 'Gustavo Lima', 'Larissa Costa', 'Paula Nunes']


def campo(id_, rot, valor='', cls='', tipo='text', opc=False, ajuda='', erro='', im='', foco=False, extra='', ph=''):
    o = ' <span class="opcional">(opcional)</span>' if opc else ''
    desc, aj, er, a = [], '', '', ''
    if ajuda:
        aj = f'<p class="ajuda" id="{id_}-aj">{ajuda}</p>'; desc.append(f'{id_}-aj')
    if erro:
        er = f'<p class="erro-msg" id="{id_}-er">{ico("alerta", "ico ico-s")}{erro}</p>'; desc.append(f'{id_}-er'); a += ' aria-invalid="true"'
    if desc:
        a += f' aria-describedby="{" ".join(desc)}"'
    if im:
        a += f' inputmode="{im}"'
    if foco:
        a += ' data-foco'
    if ph:
        a += f' placeholder="{H(ph)}"'
    v = f' value="{H(valor)}"' if valor else ''
    return (f'<div class="campo {cls}"><label for="{id_}">{rot}{o}</label>'
            f'<input class="entrada" id="{id_}" name="{id_}" type="{tipo}" autocomplete="off"{v}{a}{extra}>{aj}{er}</div>')


def selecao(id_, rot, opcoes, sel='', cls='', opc=False, ajuda='', erro='', foco=False):
    o = ' <span class="opcional">(opcional)</span>' if opc else ''
    ops = ''.join(f'<option{" selected" if x == sel else ""}>{H(x)}</option>' for x in opcoes)
    desc, aj, er, a = [], '', '', ''
    if ajuda:
        aj = f'<p class="ajuda" id="{id_}-aj">{ajuda}</p>'; desc.append(f'{id_}-aj')
    if erro:
        er = f'<p class="erro-msg" id="{id_}-er">{ico("alerta", "ico ico-s")}{erro}</p>'; desc.append(f'{id_}-er'); a = ' aria-invalid="true"'
    if desc:
        a += f' aria-describedby="{" ".join(desc)}"'
    if foco:
        a += ' data-foco'
    return f'<div class="campo {cls}"><label for="{id_}">{rot}{o}</label><select class="entrada" id="{id_}" name="{id_}"{a}>{ops}</select>{aj}{er}</div>'


def area_texto(id_, rot, valor='', opc=False, ajuda='', erro='', foco=False, cont=None):
    o = ' <span class="opcional">(opcional)</span>' if opc else ''
    desc, aj, er, a = [], '', '', ''
    if ajuda:
        aj = f'<p class="ajuda" id="{id_}-aj">{ajuda}</p>'; desc.append(f'{id_}-aj')
    if erro:
        er = f'<p class="erro-msg" id="{id_}-er">{ico("alerta", "ico ico-s")}{erro}</p>'; desc.append(f'{id_}-er'); a = ' aria-invalid="true"'
    if desc:
        a += f' aria-describedby="{" ".join(desc)}"'
    if foco:
        a += ' data-foco'
    c = f'<span class="contador" aria-hidden="true">{len(valor)} de {cont}</span>' if cont else ''
    return (f'<div class="campo"><div class="campo-linha"><label for="{id_}">{rot}{o}</label>{c}</div>'
            f'<textarea class="entrada" id="{id_}" name="{id_}"{a}>{H(valor)}</textarea>{aj}{er}</div>')


def opcoes_radio(nome, legenda, itens, sel, cls='', erro=''):
    """itens: (valor, rotulo, sub)"""
    r = ''
    for v, rot, sub in itens:
        ch = ' checked' if v == sel else ''
        s = f'<small>{sub}</small>' if sub else ''
        r += f'<label class="opcao"><input class="marcar" type="radio" name="{nome}" value="{v}"{ch}><span>{rot}{s}</span></label>'
    return f'<fieldset class="x-ops {cls}"><legend>{legenda}</legend><div class="x-ops-l">{r}</div></fieldset>'


def marcar(nome, rot, sub='', marcado=False):
    ch = ' checked' if marcado else ''
    s = f'<small>{sub}</small>' if sub else ''
    return f'<label class="opcao"><input class="marcar" type="checkbox" name="{nome}"{ch}><span>{rot}{s}</span></label>'


CSS_X = r"""
/* Formulários das janelas (mesmo desenho do Clientes aprovado) */
.x-ops{border:0;margin:0;padding:0;min-width:0}
.x-ops legend{font-weight:500;font-size:13px;margin-bottom:6px;padding:0}
.x-ops-l{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}
.x-ops .opcao{border:1px solid var(--borda-folha);border-radius:var(--raio);padding:10px 12px;margin:0;background:var(--papel)}
.x-ops .opcao:has(input:checked){border-color:var(--vinho);background:var(--ambar-3)}
.x-dois{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.x-tres{display:grid;grid-template-columns:2fr 1fr 1fr;gap:16px}
.x-grupo{border:0;margin:0;padding:14px 16px;border-radius:var(--raio);background:var(--sal-2);display:grid;gap:12px;min-width:0}
.x-grupo legend{float:left;width:100%;padding:0;font-family:var(--serifa);font-size:19px;font-weight:600;color:var(--vinho)}
.x-grupo .opcao{margin:0 -8px}
.x-grupo .opcao small{color:var(--texto-2)}
.janela.x-larga{width:min(680px,calc(100vw - 32px))}
.x-pe-nota{display:flex;gap:10px;align-items:flex-start;font-size:12px;color:var(--texto-2);line-height:1.5}
.x-pe-nota .ico{width:16px;height:16px;color:var(--vinho-4);margin-top:1px;flex:none}
@media (max-width:760px){
  .x-dois{grid-template-columns:1fr}
  .x-tres{grid-template-columns:1fr 1fr}
  .x-tres>:first-child{grid-column:1/-1}
  .x-ops-l{grid-template-columns:1fr 1fr}
  .janela.x-larga{width:100%}
}
"""

SCRIPT_EXTRA = r"""<script>
(function(){
  /* Acabamento por estado: contador de Conversas e foco do celular nas Conversas */
  var q=new URLSearchParams(location.search), padrao=JSON.parse(document.body.dataset.padrao);
  var t=document.querySelector('template[data-est="'+(q.get('estado')||padrao.estado)+'"]')||document.querySelector('template[data-est="'+padrao.estado+'"]');
  if(t && t.dataset.cont!==undefined){
    document.querySelectorAll('.trilho .item[data-nav="conversas"] .cont,.pt-baixo .pt-cont').forEach(function(c){
      if(t.dataset.cont==='0'){c.remove()} else {c.textContent=t.dataset.cont; c.setAttribute('aria-label',t.dataset.cont+' aguardando')}
    });
  }
})();
</script>"""


def finalizar(out, css):
    out = out.replace('</style>', CSS_X + css + '\n</style>', 1)
    out = out.replace('<div class="app">', SPRITE_EXTRA + '\n<div class="app">', 1)
    out = out.replace('href="#" data-nav="agenda"', 'href="agenda.html" data-nav="agenda"')
    out = out.replace('href="#" data-nav="conversas"', 'href="conversas.html" data-nav="conversas"')
    out = out.replace('href="#" data-nav="clientes"', 'href="../portal-clientes/clientes.html" data-nav="clientes"')
    out = out.replace('</body>', SCRIPT_EXTRA + '\n</body>', 1)
    return out
