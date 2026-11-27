# Peças comuns do teste grátis de 7 dias (CO-09, D42).
# Parte dos HTML aprovados, lidos sem mudança de docs/design/aprovadas/:
#   - console-cobranca/ficha.html, carteira.html e portal-escritorio.html (Console v1, Portal v1, fim do contrato e
#     cobrança, já com a aba Assinatura e a seção Plano e faturas);
#   - portal-inicio-audiencias/inicio.html (o Início do Portal mais recente);
#   - o CSS do sino aprovado (portal-sem-avisos-sino/_fonte/sino.py), usado também pelo sino do Console.
# Cada página nova = página aprovada + CSS tg- + ícones novos + estados novos (templates com prefixo tg-).
import re, html, os

APROV = os.environ.get('APROV', '/home/user/t3jus/docs/design/aprovadas/')
COB = APROV + 'console-cobranca/'
H = html.escape

# Relógio fixo dos exemplos (horário da Bahia, UTC−3, igual ao de Brasília).
HOJE_CONSOLE = 'quarta-feira, 02/12/2026, 9h40'


def brl(c):
    """Centavos inteiros -> 'R$ 1.234,56'. Nunca ponto flutuante."""
    r, cent = divmod(abs(int(c)), 100)
    return ('− ' if c < 0 else '') + 'R$ ' + f'{r:,}'.replace(',', '.') + f',{cent:02d}'


# ---------------------------------------------------------------- ícones novos (traço 1,6, grade 24, cantos vivos)
ICONES_TG = {
    'i-ampulheta': '<path d="M6.5 3h11M6.5 21h11"/><path d="M7.5 3v3.5L12 12l4.5-5.5V3"/><path d="M7.5 21v-3.5L12 12l4.5 5.5V21"/>',
    'i-mais-dias': '<path d="M3.5 5h17v15.5h-17Z"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="M12 12v6M9 15h6"/>',
    'i-repetido': '<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5"/><path d="M20 3.5v5h-5"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.5"/><path d="M4 20.5v-5h5"/>',
    'i-dispensar': '<path d="M4 4h16v16H4Z"/><path d="m8.5 8.5 7 7M15.5 8.5l-7 7"/>',
    'i-assinar': '<path d="M3.5 19.5h17"/><path d="m6 15.5 9.5-9.5 2.5 2.5L8.5 18H6Z"/><path d="m13.5 8 2.5 2.5"/>',
    'i-checks': '<path d="m2.5 12.5 4 4 8-9"/><path d="m11.5 16 1 .5 8-9"/>',
    'i-fatura': '<path d="M5.5 3h13v18l-2.2-1.5L14 21l-2-1.5L10 21l-2.3-1.5L5.5 21Z"/><path d="M8.5 8h7M8.5 11.5h7M8.5 15h4"/>',
    'i-planos': '<path d="m12 3.5 8.5 4.5-8.5 4.5L3.5 8Z"/><path d="m3.5 12 8.5 4.5 8.5-4.5"/><path d="m3.5 16 8.5 4.5 8.5-4.5"/>',
}


def icones_novos(s):
    return ''.join(f'<symbol id="{k}" viewBox="0 0 24 24">{v}</symbol>' for k, v in ICONES_TG.items() if f'id="{k}"' not in s)


def ico(nome, cls='ico'):
    return f'<svg class="{cls}" aria-hidden="true"><use href="#i-{nome}"/></svg>'


def aviso(tipo, titulo, texto='', icone=None, acoes='', papel=None, cls=''):
    icone = icone or {'urgencia': 'alerta', 'sucesso': 'check', 'atencao': 'relogio', 'info': 'ajuda'}[tipo]
    r = papel or ('alert' if tipo == 'urgencia' else 'status')
    p = f'<p>{texto}</p>' if texto else ''
    ac = f'<div class="aviso-acoes">{acoes}</div>' if acoes else ''
    return f'<div class="aviso aviso-{tipo} {cls}" role="{r}">{ico(icone)}<div><strong class="aviso-titulo">{titulo}</strong>{p}{ac}</div></div>'


def toast(titulo, texto):
    return (f'<div class="aviso aviso-sucesso toast" role="status">{ico("check")}<div><strong class="aviso-titulo">{titulo}</strong><p>{texto}</p></div>'
            f'<button class="fechar fc-fechar-toast" type="button" data-fechar aria-label="Fechar aviso">{ico("x")}</button></div>')


def janela(id_, sobre, titulo, desc, corpo, pe, alerta=False, abrir=True, cls=''):
    role = ' role="alertdialog"' if alerta else ''
    ab = ' data-abrir' if abrir else ''
    return (f'<dialog class="janela {cls}" id="{id_}" aria-labelledby="{id_}-t" aria-describedby="{id_}-d"{role}{ab}>'
            f'<form method="dialog" class="janela-form" novalidate>'
            f'<div class="janela-cabeca"><div><p class="sobretitulo">{sobre}</p><h2 id="{id_}-t">{titulo}</h2></div>'
            f'<button class="fechar" type="button" data-fechar aria-label="Fechar">{ico("x")}</button></div>'
            f'<div class="janela-corpo"><p id="{id_}-d">{desc}</p>{corpo}</div><div class="janela-pe">{pe}</div></form></dialog>')


def tpl(est, corpo, **attrs):
    a = ''
    for k, v in attrs.items():
        if v is None or v is False:
            continue
        k = k.replace('_', '-')
        a += f' data-{k}' if v is True else f' data-{k}="{H(str(v))}"'
    return f'<template data-est="{est}"{a}>\n{corpo}\n</template>\n'


def campo(id_, rotulo, valor='', ajuda='', erro='', extra='', area=False, linhas=3, cont=None, foco=False, modo=None, opcional=False):
    desc = ' '.join(x for x in ((id_ + '-erro') if erro else '', (id_ + '-ajuda') if ajuda else '', (id_ + '-cont') if cont else '') if x)
    a = f' aria-describedby="{desc}"' if desc else ''
    a += ' aria-invalid="true"' if erro else ''
    a += ' data-foco' if foco else ''
    a += f' inputmode="{modo}"' if modo else ''
    op = ' <span class="opcional">(opcional)</span>' if opcional else ''
    rot = f'<label for="{id_}">{rotulo}{op}</label>'
    if cont is not None:
        rot = f'<div class="fc-rot">{rot}<span class="fc-contador" id="{id_}-cont">{cont}</span></div>'
    if area:
        ent = f'<textarea class="entrada" id="{id_}" name="{id_}" rows="{linhas}"{a}{extra}>{valor}</textarea>'
    else:
        ent = f'<input class="entrada" id="{id_}" name="{id_}" type="text" value="{valor}" autocomplete="off"{a}{extra}>'
    er = f'<p class="erro-msg" id="{id_}-erro">{ico("alerta", "ico ico-s")}{erro}</p>' if erro else ''
    aj = f'<p class="ajuda" id="{id_}-ajuda">{ajuda}</p>' if ajuda else ''
    return f'<div class="campo">{rot}{ent}{er}{aj}</div>'


def selecao(id_, rotulo, opcoes, atual, ajuda=''):
    o = ''.join(f'<option{" selected" if x == atual else ""}>{x}</option>' for x in opcoes)
    aj = f'<p class="ajuda" id="{id_}-ajuda">{ajuda}</p>' if ajuda else ''
    d = f' aria-describedby="{id_}-ajuda"' if ajuda else ''
    return f'<div class="campo"><label for="{id_}">{rotulo}</label><select class="entrada" id="{id_}" name="{id_}"{d}>{o}</select>{aj}</div>'


def exemplo(s):
    """Os estados novos usam e-mails em exemplo.com.br (dados fictícios)."""
    return re.sub(r'@([a-z0-9-]+)\.(adv\.br|pro)\b', r'@\1.exemplo.com.br', s)


def bloco(s, ini, fim_marca='</template>'):
    i = s.index(ini)
    return s[i:s.index(fim_marca, i)]


def miolo(s, est):
    t = bloco(s, f'<template data-est="{est}"')
    return t[t.index('>') + 1:]


def dl(itens, cls='tg-dl'):
    out = f'<dl class="{cls}">'
    for it in itens:
        rot, val = it[0], it[1]
        c = it[2] if len(it) > 2 else ''
        out += f'<div class="{c}"><dt>{rot}</dt><dd>{val}</dd></div>'
    return out + '</dl>'


SELO_EX = '<span class="cb-ex" title="Planos e preços fictícios, só para o desenho">Valores de exemplo</span>'


def montar(base_path, saida, css, templates, trocas=(), js='', pos=None):
    s = open(base_path, encoding='utf-8').read()
    s = s.replace('</style>', css + '\n</style>', 1)
    sp = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">'
    assert sp in s, base_path
    s = s.replace(sp, sp + icones_novos(s), 1)
    for a, b in trocas:
        assert a in s, (base_path, a[:80])
        s = s.replace(a, b)
    if pos:
        s = pos(s)
    k = s.rindex('</template>') + len('</template>')
    s = s[:k] + '\n' + templates + s[k:]
    if js:
        s = s.replace('</body>', js + '\n</body>')
    open(saida, 'w', encoding='utf-8').write(s)
    return s


# ---------------------------------------------------------------- o sino (CSS aprovado do Portal, igual no Console)
_src = open(APROV + 'portal-sem-avisos-sino/_fonte/sino.py', encoding='utf-8').read()
CSS_SI = re.search(r'CSS_SI = r"""(.*?)"""', _src, re.S).group(1)


def si_item(icone, tit, det, onde, href, hora, novo=False, selo=''):
    nv = '<span class="si-nv">Novo</span>' if novo else ''
    sr = '<span class="sr">Novo: </span>' if novo else ''
    cls = 'si-item si-novo' if novo else 'si-item'
    p = '<span class="si-pto" aria-hidden="true"></span>' if novo else '<span aria-hidden="true"></span>'
    return (f'<li class="{cls}"><span class="si-ico" aria-hidden="true">{ico(icone)}</span><div>'
            f'<p class="si-tit"><a class="si-link" href="{href}">{sr}{tit}</a></p><p class="si-det">{det}</p>'
            f'<p class="si-meta">{nv}{selo}<time>{hora}</time><span class="si-onde">{onde}{ico("dir", "ico ico-s")}</span></p></div>{p}</li>')


def si_dia(t, itens):
    return f'<h3 class="si-dia">{t}</h3><ul class="si-ul">{"".join(itens)}</ul>' if itens else ''


def si_painel(conta, lista, novos, pe):
    dirr = (f'<button class="btn btn-fantasma si-todos" type="button">{ico("checks")}Marcar todos como lidos</button>' if novos
            else f'<span class="si-tudo-lido">{ico("check")}Tudo lido</span>')
    chips = (f'<div class="chips" role="group" aria-label="Mostrar avisos"><button type="button" aria-pressed="true">Todos</button>'
             f'<button type="button" aria-pressed="false">Não lidos <span class="q">{novos}</span></button></div>')
    return (f'<div class="si-cab"><div><p class="sobretitulo">Para você</p><h2 id="si-t">Avisos</h2><p class="si-conta">{conta}</p></div>'
            f'<button class="fechar" type="button" data-fechar-sino aria-label="Fechar os avisos">{ico("x")}</button></div>'
            f'<div class="si-ferr">{chips}{dirr}</div><div class="si-lista">{lista}</div>{pe}')


def tsino(nome, corpo, novos):
    return f'<template data-sino="{nome}" data-novos="{novos}">\n{corpo}\n</template>\n'


DIALOG_SINO = '<dialog class="si-painel" id="painel-avisos" aria-labelledby="si-t" tabindex="-1"></dialog>'

# O botão do sino já existe na moldura aprovada (topo e barra vinho do celular): só ganha o painel.
# ?sino=<nome> escolhe o painel e o abre; sem ?sino=, nada muda na página aprovada.
SCRIPT_SINO = r"""<script>
(function(){
  var q=new URLSearchParams(location.search), nome=q.get('sino'); if(!nome) return;
  var t=document.querySelector('template[data-sino="'+nome+'"]'); if(!t) return;
  var d=document.getElementById('painel-avisos'); d.appendChild(t.content.cloneNode(true));
  var n=t.dataset.novos;
  var sinos=document.querySelectorAll('.topo .icone-botao,.barra-cel .bb[aria-label^="Avisos"]');
  var cel=matchMedia('(max-width:760px)');
  sinos.forEach(function(b){
    b.setAttribute('aria-controls','painel-avisos'); b.setAttribute('aria-expanded','false'); b.setAttribute('aria-haspopup','dialog');
    if(n==='0'){b.setAttribute('aria-label','Avisos, nenhum novo'); var pt=b.querySelector('.ponto'); pt&&pt.remove()}
    else {b.setAttribute('aria-label','Avisos, '+n+(n==='1'?' novo':' novos'))}
    b.addEventListener('click',function(){ if(d.open){d.close()} else {abrir()} });
  });
  function abrir(){ if(cel.matches){d.showModal()} else {d.show()} sinos.forEach(function(s){s.setAttribute('aria-expanded','true')}); d.focus() }
  d.addEventListener('close',function(){ sinos.forEach(function(s){s.setAttribute('aria-expanded','false')}) });
  d.addEventListener('click',function(e){ if(e.target.closest('[data-fechar-sino]')) d.close() });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&d.open&&!cel.matches){ d.close() } });
  d.querySelectorAll('.chips button').forEach(function(c){ c.addEventListener('click',function(){ d.querySelectorAll('.chips button').forEach(function(o){o.setAttribute('aria-pressed',o===c?'true':'false')}) }) });
  abrir();
})();
</script>"""


def com_sino(s, sinos):
    s = s.replace('</style>', CSS_SI + '\n</style>', 1)
    k = s.rindex('</template>') + len('</template>')
    s = s[:k] + '\n' + sinos + DIALOG_SINO + '\n' + s[k:]
    return s.replace('</body>', SCRIPT_SINO + '\n</body>', 1)


# ---------------------------------------------------------------- CSS novo (prefixo tg-)
CSS_TG = r"""
/* ==========================================================================
   CO-09 · Teste grátis de 7 dias. Só tokens do D2 e do Gabinete; prefixo tg-.
   ========================================================================== */
html[data-papel="financeiro"] .so-adm,html[data-papel="implantacao"] .so-adm,html[data-papel="suporte"] .so-adm{display:none!important}
html[data-papel="admin"] .msg-nao-adm{display:none!important}
html[data-papel="implantacao"] .so-conf,html[data-papel="suporte"] .so-conf{display:none!important}
html[data-papel="admin"] .msg-nao-conf,html[data-papel="financeiro"] .msg-nao-conf{display:none!important}
.cb-ex{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:13px;font-size:12px;font-weight:500;background:var(--papel);color:var(--vinho);box-shadow:inset 0 0 0 1px var(--vinho-4);white-space:nowrap}
.cb-ex::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--ambar)}
.num{font-variant-numeric:lining-nums tabular-nums}

/* Selos do teste: sempre com ícone e texto, nunca só cor */
.selo .ico{width:14px;height:14px;flex:none}
.selo-teste{background:var(--ambar-3);color:var(--vinho-escuro);box-shadow:inset 0 0 0 1px var(--ambar)}
.selo-previsto{background:var(--papel);color:var(--vinho-2);box-shadow:inset 0 0 0 1px var(--vinho-4)}
.selo-acabou{background:var(--vinho-3);color:var(--papel)}
.selo-quer{background:var(--vinho);color:var(--papel)}
.selo-dispensado{background:var(--sal-2);color:var(--texto-2);box-shadow:inset 0 0 0 1px var(--vinho-4)}
.selo-repetido{background:var(--ambar-2);color:var(--tinta)}
.selo-assinado{background:var(--vinho);color:var(--papel)}
.pend .selo,.c-selos .selo{max-width:100%}
.tg-pend-sub{display:block;font-size:12px;color:var(--texto-2);margin-top:4px;line-height:1.35}

/* Quadro do teste (aba Assinatura) */
.tg-quadro{overflow:hidden}
.tg-q-topo{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:18px;align-items:center;padding:20px 24px 14px}
.tg-q-topo .sobretitulo{margin:0 0 2px}
.tg-q-topo h2{font-size:26px;line-height:1.1}
.tg-q-topo .sub{font-size:13px;color:var(--texto-2);margin-top:4px}
.tg-q-topo .sub b{color:var(--texto);font-weight:600}
.tg-disco{width:76px;height:76px;border-radius:50%;display:grid;place-items:center;align-content:center;text-align:center;background:var(--ambar-3);color:var(--vinho-escuro);flex:none}
.tg-disco b{font-family:var(--serifa);font-size:30px;line-height:1;font-weight:500}
.tg-disco small{font-size:11px;font-weight:500;margin-top:2px}
.tg-disco.tg-d-prev{background:var(--papel);box-shadow:inset 0 0 0 1.5px var(--vinho-4);color:var(--vinho-2)}
.tg-disco.tg-d-prev .ico{width:30px;height:30px}
.tg-disco.tg-d-urg{background:var(--vinho-3);color:var(--papel)}
.tg-disco.tg-d-ok{background:var(--vinho);color:var(--papel)}
.tg-disco.tg-d-ok .ico,.tg-disco.tg-d-neutro .ico{width:30px;height:30px}
.tg-disco.tg-d-neutro{background:var(--sal-2);color:var(--texto-2);box-shadow:inset 0 0 0 1px var(--vinho-4)}
.tg-disco.tg-d-rep{background:var(--ambar-2);color:var(--tinta)}
.tg-disco.tg-d-rep .ico{width:30px;height:30px}

/* A tira dos dias: um quadrado por dia, com a data embaixo (texto, não só cor) */
.tg-dias{list-style:none;margin:0;padding:6px 24px 18px;display:grid;grid-template-columns:repeat(var(--n,7),minmax(0,1fr));gap:6px}
.tg-dias li{display:grid;gap:4px;justify-items:center;text-align:center;font-size:11px;color:var(--texto-2);line-height:1.25;min-width:0}
.tg-dias .q{width:100%;height:34px;border-radius:8px;display:grid;place-items:center;font-family:var(--serifa);font-size:17px;font-weight:500;background:var(--papel);color:var(--vinho-2);box-shadow:inset 0 0 0 1px var(--vinho-4)}
.tg-dias .feito .q{background:var(--vinho-2);color:var(--papel);box-shadow:none}
.tg-dias .hoje .q{background:var(--ambar);color:var(--tinta);box-shadow:0 0 0 2px var(--papel),0 0 0 4px var(--ambar)}
.tg-dias .hoje{color:var(--tinta);font-weight:600}
.tg-dias .extra .q{box-shadow:inset 0 0 0 1.5px var(--vinho-4);background:repeating-linear-gradient(135deg,var(--papel) 0 6px,var(--sal-2) 6px 12px);color:var(--vinho-2)}
.tg-dias .extra.feito .q{background:var(--vinho-2);color:var(--papel);box-shadow:none}
.tg-dias .depois .q{background:var(--sal-2);color:var(--texto-2);box-shadow:inset 0 0 0 1px var(--vinho-4)}
.tg-dias .depois .q .ico{width:16px;height:16px}
.tg-dias b{font-weight:600}
.tg-legenda{display:flex;flex-wrap:wrap;gap:6px 16px;padding:0 24px 14px;font-size:12px;color:var(--texto-2)}
.tg-legenda span{display:inline-flex;align-items:center;gap:6px}
.tg-legenda i{width:14px;height:14px;border-radius:4px;display:inline-block}
.tg-legenda .l-feito{background:var(--vinho-2)}
.tg-legenda .l-hoje{background:var(--ambar)}
.tg-legenda .l-falta{background:var(--papel);box-shadow:inset 0 0 0 1px var(--vinho-4)}
.tg-legenda .l-extra{background:repeating-linear-gradient(135deg,var(--papel) 0 3px,var(--sal-2) 3px 6px);box-shadow:inset 0 0 0 1px var(--vinho-4)}

.tg-dl{margin:0;padding:0 24px 8px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px;border-top:1px solid var(--divisor)}
.tg-dl>div{padding:12px 0;border-bottom:1px solid var(--divisor);min-width:0}
.tg-dl>div.inteira{grid-column:1/-1}
.tg-dl dt{font-size:12px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:var(--texto-2)}
.tg-dl dd{margin:4px 0 0;font-size:14px;line-height:1.45;overflow-wrap:anywhere}
.tg-dl dd small,.tg-peq{display:block;font-size:12px;color:var(--texto-2);line-height:1.4}
.tg-dl>div:nth-last-child(-n+2):not(.inteira){border-bottom:0}
.tg-dl>div.inteira:last-child{border-bottom:0}
.tg-motivo{display:block;margin-top:4px;font-family:var(--serifa);font-style:italic;font-size:15px;line-height:1.4;color:var(--vinho);padding-left:10px;border-left:2px solid var(--ambar)}
.tg-avisos{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.tg-avisos li{display:grid;grid-template-columns:20px minmax(0,1fr);gap:8px;font-size:13px;line-height:1.45;align-items:start}
.tg-avisos .ico{width:16px;height:16px;margin-top:2px;color:var(--vinho-2)}
.tg-avisos .prev{color:var(--texto-2)}
.tg-avisos .prev .ico{color:var(--vinho-4)}
.tg-acoes{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:14px 24px 18px;border-top:1px solid var(--divisor);background:#FCF8F5}
.tg-acoes .permissao{flex:1 1 100%;margin:0}
.tg-faixa{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:16px;align-items:center;padding:16px 24px;position:relative;border-bottom:1px solid var(--divisor)}
.tg-faixa::before{content:"";position:absolute;left:0;top:0;bottom:0;width:6px;background:var(--vinho)}
.tg-faixa.tg-f-amb{background:var(--ambar-3)}
.tg-faixa.tg-f-amb::before{background:var(--ambar)}
.tg-faixa.tg-f-urg{background:#FBEFF3}
.tg-faixa.tg-f-urg::before{background:var(--vinho-3)}
.tg-faixa .ico-g{width:24px;height:24px;color:var(--vinho)}
.tg-faixa h3{font-family:var(--sans);font-size:14px;font-weight:600;line-height:1.4;color:var(--tinta)}
.tg-faixa p{font-size:13px;line-height:1.5;color:var(--texto);margin-top:2px}
.tg-faixa .acoes{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.tg-situ{display:grid;gap:10px;padding:4px 20px 20px}
.tg-situ p{font-size:13px;line-height:1.5;color:var(--texto-2)}
.tg-situ p b{color:var(--texto);font-weight:600}
.tg-situ .tg-grande{font-family:var(--serifa);font-size:26px;line-height:1.1;color:var(--vinho);font-weight:500}
.tg-ass-topo{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center;padding:20px 24px 14px}
.tg-ass-topo h2{font-size:22px}
.tg-ass-topo .sub{font-size:13px;color:var(--texto-2)}
.tg-plano-nome{font-family:var(--serifa);font-size:20px;color:var(--vinho);font-weight:500}
.tg-cab-selo{display:inline-flex}
.ficha-cab .meta .selo-teste,.ficha-cab .meta .selo-acabou,.ficha-cab .meta .selo-repetido,.ficha-cab .meta .selo-previsto,.ficha-cab .meta .selo-quer,.ficha-cab .meta .selo-dispensado{box-shadow:none}
.ficha-cab .meta .selo-previsto,.ficha-cab .meta .selo-dispensado{background:var(--sal)}
.ficha-cab .meta .selo-quer,.ficha-cab .meta .selo-assinado{background:var(--papel);color:var(--vinho)}

/* Janelas do teste */
.tg-antes-depois{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:stretch}
.tg-antes-depois>div{border:1px solid var(--borda-folha);border-radius:var(--raio);padding:10px 14px;display:grid;gap:2px;font-size:13px}
.tg-antes-depois>div.novo{border:1.5px solid var(--vinho);background:#FCF8F5}
.tg-antes-depois strong{font-family:var(--serifa);font-size:19px;color:var(--vinho);font-weight:500}
.tg-antes-depois small{color:var(--texto-2);font-size:12px}
.tg-antes-depois .seta{align-self:center;color:var(--vinho-4)}
.tg-oque{list-style:none;margin:0;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);display:grid;gap:8px;font-size:13px;line-height:1.5}
.tg-oque li{display:grid;grid-template-columns:18px minmax(0,1fr);gap:8px}
.tg-oque .ico{width:16px;height:16px;margin-top:2px;color:var(--vinho)}
.tg-oque b{font-weight:600}
.tg-conta{list-style:none;margin:0;padding:12px 14px;border-radius:var(--raio);border:1px solid var(--borda-folha);display:grid;gap:6px;font-size:13px}
.tg-conta li{display:flex;justify-content:space-between;gap:12px}
.tg-conta li b{font-weight:600;text-align:right}

/* Carteira: chips do teste */
.tg-chips button .ico{width:16px;height:16px}
.ferramentas:has(.tg-chips){flex-wrap:wrap}
.ferramentas>.tg-chips{order:10;flex:1 1 100%!important;flex-wrap:wrap;margin-left:0!important}
.tg-chips button{white-space:nowrap}

/* Portal: as faixas do teste, no alto de todas as páginas */
.tg-tira{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:6px 48px;min-height:56px;background:var(--papel);color:var(--tinta);font-size:13px;border-bottom:1px solid var(--borda-folha);box-shadow:inset 6px 0 0 var(--ambar)}
.tg-tira>.ico{color:var(--vinho);flex:none}
.tg-tira b{font-weight:600}
.tg-tira>span{flex:1;min-width:0;line-height:1.5}
.tg-tira .tg-t-acoes{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.tg-tira .btn{min-height:44px}
.tg-tira a.tg-link{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 10px;border-radius:var(--raio);color:var(--vinho);font-weight:600}
.tg-tira a.tg-link:hover{background:var(--sal-2)}
.tg-tira.tg-t-ultimo{background:var(--ambar-3);box-shadow:inset 6px 0 0 var(--vinho-3)}
.tg-tira.tg-t-pedido{background:var(--papel);box-shadow:inset 6px 0 0 var(--vinho)}
.tg-tira.tg-t-consulta{background:var(--ambar-3);box-shadow:none;border-bottom:1px solid var(--ambar-2)}
.tg-tira.tg-t-consulta a.tg-link:hover{background:rgba(255,255,255,.5)}

/* Portal: travado no só consulta (o motivo está na faixa) */
.tg-travado,.tg-travado:hover{background:var(--ambar-3)!important;color:var(--vinho-escuro)!important;border-color:transparent!important;box-shadow:none!important;cursor:not-allowed}

/* Portal: boas-vindas do dia 1 */
.tg-boas{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);overflow:hidden}
.tg-boas>div{padding:24px 28px;display:grid;gap:12px;align-content:start}
.tg-boas>div+div{background:#FCF8F5;border-left:1px solid var(--divisor)}
.tg-boas h2{font-size:30px;line-height:1.1}
.tg-boas h3.sobretitulo{font-family:var(--sans);font-size:12px;font-weight:500;margin:0}
.tg-boas p{font-size:14px;line-height:1.6;color:var(--texto)}
.tg-boas p b{font-weight:600}
.tg-passos{list-style:none;margin:0;padding:0;display:grid;gap:0}
.tg-passos li{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:14px;align-items:center;padding:12px 0;border-top:1px solid var(--divisor)}
.tg-passos li:first-child{border-top:0}
.tg-passos .disco{--d:40px;--f:18px}
.tg-passos strong{display:block;font-weight:600;font-size:14px}
.tg-passos span.t{font-size:13px;color:var(--texto-2);line-height:1.45}
.tg-passos .btn{min-height:44px}
.tg-quem{display:grid;grid-template-columns:48px minmax(0,1fr);gap:12px;align-items:center}
.tg-quem .av{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:var(--ambar-3);color:var(--vinho);font-family:var(--serifa);font-size:20px;font-weight:500}
.tg-quem b{font-weight:600;display:block}
.tg-quem small{font-size:12px;color:var(--texto-2)}
.tg-linha7{list-style:none;margin:0;padding:0;display:grid;gap:8px;font-size:13px;line-height:1.5}
.tg-linha7 li{display:grid;grid-template-columns:84px minmax(0,1fr);gap:10px}
.tg-linha7 b{font-weight:600;color:var(--vinho)}

/* Portal: Plano e faturas antes da assinatura */
.tg-pt-plano{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);border-top:1px solid var(--divisor)}
.tg-pt-plano>div{padding:18px 24px 20px;display:grid;gap:10px;align-content:start}
.tg-pt-plano>div+div{border-left:1px solid var(--divisor);background:#FCF8F5}
.tg-pt-plano p{font-size:13px;color:var(--texto-2);line-height:1.5}
.tg-pt-plano p b{color:var(--texto);font-weight:600}
.tg-pt-plano .tg-preco,.tg-preco{font-family:var(--serifa);font-size:30px;line-height:1;color:var(--vinho);font-weight:500;font-variant-numeric:lining-nums tabular-nums}
.tg-preco small{font-family:var(--sans);font-size:13px;color:var(--texto-2);font-weight:400;margin-left:4px}
.tg-sem-fatura{display:flex;gap:12px;align-items:flex-start;margin:0 24px 20px;padding:14px 16px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.5;color:var(--texto)}
.tg-sem-fatura .ico{color:var(--vinho-4);flex:none;margin-top:1px}

/* E-mails: a página mostra o cabeçalho e o e-mail */
@media (max-width:760px){
  .tg-q-topo{grid-template-columns:auto minmax(0,1fr);padding:16px 16px 12px;gap:14px}
  .tg-q-topo>.tg-cab-selo{grid-column:1/-1}
  .tg-q-topo h2{font-size:22px}
  .tg-disco{width:60px;height:60px}
  .tg-disco b{font-size:24px}
  .tg-dias{padding:4px 16px 14px;gap:4px}
  .tg-dias .q{height:30px;font-size:15px}
  .tg-dias li{font-size:10px}
  .tg-legenda{padding:0 16px 12px}
  .tg-dl{grid-template-columns:1fr;padding:0 16px 6px}
  .tg-dl>div:nth-last-child(-n+2):not(.inteira){border-bottom:1px solid var(--divisor)}
  .tg-dl>div:last-child{border-bottom:0!important}
  .tg-acoes{padding:12px 16px 16px}
  .tg-acoes .btn{flex:1 1 100%}
  .tg-faixa{grid-template-columns:auto minmax(0,1fr);padding:14px 16px 14px 20px}
  .tg-faixa .acoes{grid-column:1/-1;justify-content:stretch}
  .tg-faixa .acoes .btn{flex:1 1 100%}
  .tg-situ{padding:4px 16px 16px}
  .tg-ass-topo{grid-template-columns:1fr;padding:16px 16px 12px}
  .tg-antes-depois{grid-template-columns:1fr}
  .tg-antes-depois .seta{justify-self:center;transform:rotate(90deg)}
  .tg-tira{padding:8px 16px}
  .tg-tira .tg-t-acoes{flex:1 1 100%}
  .tg-tira .tg-t-acoes .btn,.tg-tira .tg-t-acoes .tg-link{flex:1 1 auto;justify-content:center}
  .tg-boas{grid-template-columns:1fr}
  .tg-boas>div{padding:18px 16px}
  .tg-boas>div+div{border-left:0;border-top:1px solid var(--divisor)}
  .tg-boas h2{font-size:24px}
  .tg-passos li{grid-template-columns:40px minmax(0,1fr)}
  .tg-passos li .btn{grid-column:1/-1}
  .tg-pt-plano{grid-template-columns:1fr}
  .tg-pt-plano>div{padding:16px}
  .tg-pt-plano>div+div{border-left:0;border-top:1px solid var(--divisor)}
  .tg-sem-fatura{margin:0 16px 16px}
}
"""
