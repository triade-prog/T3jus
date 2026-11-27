# CO-08 · Implantação assistida (D43). Peças comuns do desenho.
# As telas aprovadas são LIDAS sem mudança de docs/design/aprovadas/ e recebem, cada uma:
#   CSS novo (prefixo im-), ícones novos e templates de estado novos (prefixo im- ou pt-).
# Bases:
#   cobranca-pdfs/ficha.html               (ficha do Console com Assinatura e PDFs ligados)
#   console-interessado-sino/cobranca.html (Cobrança aprovada + o sino do Console)
#   cobranca-pdfs/portal-escritorio.html   (Escritório do Portal com Plano e faturas)
#   portal-inicio-audiencias/inicio.html   (Início do Portal)
#   cobranca-pdfs/fatura-a4.html e recibo-a4.html (PDFs)
import re, html, os

APROV = '/home/user/t3jus/docs/design/aprovadas/'
H = html.escape


def ler(rel):
    return open(APROV + rel, encoding='utf-8').read()


def brl(c):
    neg = c < 0
    c = abs(int(c))
    r, cent = divmod(c, 100)
    s = f'{r:,}'.replace(',', '.')
    return ('− ' if neg else '') + f'R$ {s},{cent:02d}'


ICONES_IM = {
    'i-treino': '<path d="M3.5 6.5h12v9h-12Z"/><path d="m15.5 9.5 5-2.5v8l-5-2.5"/><path d="M7 19.5h5"/>',
    'i-presencial': '<path d="M8 8.5a2.6 2.6 0 1 0 0-.1M16 8.5a2.6 2.6 0 1 0 0-.1"/><path d="M3.5 19.5c.4-3.2 2.2-5 4.5-5s4.1 1.8 4.5 5M11.5 19.5c.4-3.2 2.2-5 4.5-5s4.1 1.8 4.5 5"/>',
    'i-prazo': '<path d="M4 5.5h16v15H4Z"/><path d="M4 9.5h16M8.5 3v4M15.5 3v4"/><path d="m9 15 2 2 4-4"/>',
    'i-desfazer': '<path d="M8 6 4 10l4 4"/><path d="M4 10h10.5a5.5 5.5 0 0 1 0 11H10"/>',
    'i-isencao': '<path d="M4 12.5 11.5 5H19v7.5L11.5 20Z"/><path d="M15 8.5h.01"/><path d="m7.5 16.5 9-9"/>',
    'i-importar': '<path d="M5 15v4.5h14V15"/><path d="M12 4v11M8 11l4 4 4-4"/>',
}


def icones_novos(s):
    return ''.join(f'<symbol id="{k}" viewBox="0 0 24 24">{v}</symbol>' for k, v in ICONES_IM.items() if f'id="{k}"' not in s)


def ico(nome, cls='ico'):
    return f'<svg class="{cls}" aria-hidden="true"><use href="#i-{nome}"/></svg>'


def aviso(tipo, titulo, texto='', icone=None, acoes='', papel=None, extra='', cls=''):
    icone = icone or {'urgencia': 'alerta', 'sucesso': 'check', 'atencao': 'relogio', 'info': 'ajuda'}[tipo]
    r = papel or ('alert' if tipo == 'urgencia' else 'status')
    p = f'<p>{texto}</p>' if texto else ''
    ac = f'<div class="aviso-acoes">{acoes}</div>' if acoes else ''
    return f'<div class="aviso aviso-{tipo} {cls}" role="{r}">{ico(icone)}<div><strong class="aviso-titulo">{titulo}</strong>{p}{ac}{extra}</div></div>'


def janela(id_, sobre, titulo, desc, corpo, pe, alerta=False, abrir=True, cls=''):
    role = ' role="alertdialog"' if alerta else ''
    ab = ' data-abrir' if abrir else ''
    return f'''<dialog class="janela {cls}" id="{id_}" aria-labelledby="{id_}-t" aria-describedby="{id_}-d"{role}{ab}>
  <form method="dialog" class="janela-form" novalidate>
  <div class="janela-cabeca"><div><p class="sobretitulo">{sobre}</p><h2 id="{id_}-t">{titulo}</h2></div><button class="fechar" type="button" data-fechar aria-label="Fechar">{ico('x')}</button></div>
  <div class="janela-corpo"><p id="{id_}-d">{desc}</p>{corpo}</div>
  <div class="janela-pe">{pe}</div>
  </form>
</dialog>'''


def tpl(est, corpo, **attrs):
    a = ''
    for k, v in attrs.items():
        if v is None or v is False:
            continue
        k = k.replace('_', '-')
        a += f' data-{k}' if v is True else f' data-{k}="{H(str(v))}"'
    return f'<template data-est="{est}"{a}>\n{corpo}\n</template>\n'


def campo(id_, rotulo, valor='', ajuda='', erro='', tipo='text', extra='', opcional=False, foco=False, cls='', modo=None, area=False, linhas=3, cont=None, rs=False):
    desc = ' '.join(x for x in ((id_ + '-erro') if erro else '', (id_ + '-ajuda') if ajuda else '') if x)
    a = f' aria-describedby="{desc}"' if desc else ''
    a += ' aria-invalid="true"' if erro else ''
    a += ' data-foco' if foco else ''
    a += f' inputmode="{modo}"' if modo else ''
    op = ' <span class="opcional">(opcional)</span>' if opcional else ''
    rot = f'<label for="{id_}">{rotulo}{op}</label>'
    if cont is not None:
        rot = f'<div class="im-rot-linha">{rot}<span class="im-contador" aria-hidden="true">{cont}</span></div>'
    if area:
        ent = f'<textarea class="entrada" id="{id_}" name="{id_}" rows="{linhas}"{a}{extra}>{valor}</textarea>'
    else:
        ent = f'<input class="entrada" id="{id_}" name="{id_}" type="{tipo}" value="{valor}" autocomplete="off"{a}{extra}>'
    if rs:
        ent = f'<div class="cb-campo-valor"><span class="cb-rs" aria-hidden="true">R$</span>{ent}</div>'
    er = f'<p class="erro-msg" id="{id_}-erro">{ico("alerta", "ico ico-s")}{erro}</p>' if erro else ''
    aj = f'<p class="ajuda" id="{id_}-ajuda">{ajuda}</p>' if ajuda else ''
    return f'<div class="campo im-campo {cls}">{rot}{ent}{er}{aj}</div>'


def radios(nome, legenda, itens, atual, cls='', erro='', ajuda=''):
    """itens: (valor, explicação)."""
    r = ''.join(f'<label class="opcao"><input class="marcar" type="radio" name="{nome}"{" checked" if v == atual else ""}><span>{v}<small>{d}</small></span></label>' for v, d in itens)
    er = f'<p class="erro-msg" id="{nome}-erro">{ico("alerta", "ico ico-s")}{erro}</p>' if erro else ''
    aj = f'<p class="ajuda" id="{nome}-ajuda">{ajuda}</p>' if ajuda else ''
    desc = ' '.join(x for x in ((nome + '-erro') if erro else '', (nome + '-ajuda') if ajuda else '') if x)
    d = f' aria-describedby="{desc}"' if desc else ''
    return f'<fieldset class="grupo-opcoes im-grupo {cls}"{d}><legend>{legenda}</legend>{r}{er}{aj}</fieldset>'


def marcas(nome, legenda, itens, cls='', erro='', ajuda='', colunas=2):
    """itens: (rótulo, explicação, marcado, desabilitado)."""
    r = ''
    for it in itens:
        rot, dsc, mk = it[0], it[1], it[2]
        dis = len(it) > 3 and it[3]
        sm = f'<small>{dsc}</small>' if dsc else ''
        r += f'<label class="opcao"><input class="marcar" type="checkbox" name="{nome}"{" checked" if mk else ""}{" disabled" if dis else ""}><span>{rot}{sm}</span></label>'
    er = f'<p class="erro-msg" id="{nome}-erro">{ico("alerta", "ico ico-s")}{erro}</p>' if erro else ''
    aj = f'<p class="ajuda" id="{nome}-ajuda">{ajuda}</p>' if ajuda else ''
    desc = ' '.join(x for x in ((nome + '-erro') if erro else '', (nome + '-ajuda') if ajuda else '') if x)
    d = f' aria-describedby="{desc}"' if desc else ''
    return (f'<fieldset class="grupo-opcoes im-grupo {cls}"{d}><legend>{legenda}</legend>'
            f'<div class="im-marcas" style="--cols:{colunas}">{r}</div>{er}{aj}</fieldset>')


def estado(titulo, texto, icone='alerta', acoes='', codigo='', erro=True, extra=''):
    cls = 'estado estado-erro' if erro else 'estado'
    role = 'alert' if erro else 'status'
    a = f'<div class="acoes">{acoes}</div>' if acoes else ''
    c = f'<p class="codigo">{codigo}</p>' if codigo else ''
    return f'<div class="{cls}" role="{role}"><span class="icone-estado">{ico(icone)}</span><h3>{titulo}</h3><p>{texto}</p>{extra}{a}{c}</div>'


def montar(s, css, templates, trocas=(), js='', extra_depois=''):
    s = s.replace('</style>', css + '\n</style>', 1)
    sp = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">'
    assert sp in s
    s = s.replace(sp, sp + icones_novos(s), 1)
    for a, b in trocas:
        assert a in s, a[:90]
        s = s.replace(a, b)
    k = s.rindex('</template>') + len('</template>')
    s = s[:k] + '\n' + templates + extra_depois + s[k:]
    if js:
        s = s.replace('</body>', js + '\n</body>', 1)
    return s


def tira_bloco(s, ini):
    i = s.index(ini)
    j = s.index('</template>', i)
    return s[i:j + len('</template>')]


def corpo_tpl(s, ini):
    t = tira_bloco(s, ini)
    return t[t.index('>') + 1:-len('</template>')]


# ---------------------------------------------------------------- CSS novo (prefixo im-)
CSS_IM = r"""
/* ==========================================================================
   CO-08 · Implantação assistida (D43). Só tokens do D2 e do Gabinete; prefixo im-.
   ========================================================================== */
html[data-papel="financeiro"] .im-so-edita,html[data-papel="suporte"] .im-so-edita{display:none!important}
html[data-papel="admin"] .im-msg-leitura,html[data-papel="implantacao"] .im-msg-leitura{display:none!important}
html[data-papel="implantacao"] .im-so-adm-fin{display:none!important}
.im-novo{outline:2px dashed var(--ambar);outline-offset:3px}
.im-ex{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:13px;font-size:12px;font-weight:500;background:var(--papel);color:var(--vinho);box-shadow:inset 0 0 0 1px var(--vinho-4);white-space:nowrap}
.im-ex::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--ambar)}
.im-rot{font-size:12px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--vinho-2);margin:0}
.im-peq{font-size:12px;color:var(--texto-2);line-height:1.45}
.num,.im-valor{font-variant-numeric:lining-nums tabular-nums}
.selo-isenta{background:var(--ambar-3);color:var(--vinho)}
.selo-cobrada{background:var(--selo-atencao);color:var(--selo-atencao-texto)}
.selo .ico{width:14px;height:14px;flex:none}
.explica.campo-ambar h2.im-h2{color:var(--vinho-escuro)}

/* Topo da aba: prazo, quem acompanha e condição */
.im-topo{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr) minmax(0,1.1fr);border-top:1px solid var(--divisor)}
.im-topo>div{padding:18px 24px 20px;display:grid;gap:8px;align-content:start;min-width:0}
.im-topo>div+div{border-left:1px solid var(--divisor)}
.im-prazo{display:flex;align-items:center;gap:14px}
.im-prazo .disco{--d:64px;--f:26px}
.im-prazo .disco.im-d-atencao{background:var(--ambar-2);color:var(--tinta)}
.im-prazo .disco.im-d-urg{background:var(--vinho-3);color:var(--papel)}
.im-prazo .disco.im-d-ok{background:var(--vinho);color:var(--papel)}
.im-prazo b{display:block;font-family:var(--serifa);font-size:22px;font-weight:500;color:var(--vinho);line-height:1.15}
.im-prazo small{display:block;font-size:12px;color:var(--texto-2);line-height:1.4}
.im-quem{display:flex;align-items:center;gap:12px}
.im-quem strong{display:block;font-weight:600;font-size:14px}
.im-quem small{display:block;font-size:12px;color:var(--texto-2)}
.im-topo .btn{justify-self:start}
.im-valor-linha{font-size:13px;line-height:1.5}
.im-valor-linha b{font-weight:600;white-space:nowrap}
.im-topo .selo,.im-ass .selo{white-space:normal;height:auto;min-height:26px;padding:4px 10px;line-height:1.3}
.im-cab-folha{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px 24px 14px;flex-wrap:wrap}
.im-cab-folha h2{font-size:22px}
.im-cab-folha .sub{font-size:13px;color:var(--texto-2)}
.im-faixa{margin:0 24px 18px}

/* O que já aconteceu (calculado) */
.im-feito{list-style:none;margin:0;padding:0 24px 8px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px}
.im-feito li{display:grid;grid-template-columns:32px minmax(0,1fr);gap:12px;padding:12px 0;border-top:1px solid var(--divisor);align-items:start}
.im-feito li:nth-child(-n+2){border-top:0}
.im-marca{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;flex:none}
.im-marca .ico{width:18px;height:18px}
.im-marca.im-sim{background:var(--vinho);color:var(--papel)}
.im-marca.im-nao{background:transparent;color:var(--vinho-2);box-shadow:inset 0 0 0 1.5px var(--vinho-4)}
.im-marca.im-meio{background:var(--ambar-3);color:var(--vinho)}
.im-feito strong{display:block;font-weight:600;font-size:14px;line-height:1.35}
.im-feito small{display:block;font-size:12px;color:var(--texto-2);line-height:1.45;margin-top:2px}
.im-feito a.im-atalho{display:inline-flex;align-items:center;gap:4px;min-height:44px;margin:-6px 0 -10px;font-size:13px;font-weight:600;color:var(--vinho)}
.im-calc{display:flex;gap:8px;align-items:flex-start;margin:4px 24px 18px;padding:10px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:12px;color:var(--texto-2);line-height:1.5}
.im-calc .ico{width:16px;height:16px;color:var(--vinho-4);flex:none;margin-top:1px}

/* X de Y treinadas */
.im-conta{display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:0 24px 16px}
.im-conta .im-grande{font-family:var(--serifa);font-size:34px;line-height:1;color:var(--vinho);font-weight:500;font-variant-numeric:lining-nums tabular-nums;white-space:nowrap}
.im-conta .im-grande small{font-family:var(--sans);font-size:13px;color:var(--texto-2);font-weight:400;margin-left:6px}
.im-barra{display:flex;gap:4px;flex:1;min-width:160px;max-width:360px}
.im-barra i{flex:1;height:12px;border-radius:3px;background:var(--sal)}
.im-barra i.im-ok{background:var(--vinho)}

/* Pessoas */
.im-pessoas{list-style:none;margin:0;padding:0}
.im-pessoas li{display:grid;grid-template-columns:40px minmax(0,1.3fr) minmax(0,1fr) minmax(0,1.1fr);gap:14px;align-items:center;padding:12px 24px;border-top:1px solid var(--divisor)}
.im-pessoas .im-nome strong{display:block;font-weight:600;font-size:14px}
.im-pessoas .im-nome small,.im-pessoas .im-col small{display:block;font-size:12px;color:var(--texto-2);line-height:1.4}
.im-pessoas .im-col{display:grid;gap:3px;justify-items:start;font-size:13px}
.im-pessoas .im-col .im-r{display:none}
.im-pessoas-cab{display:grid;grid-template-columns:40px minmax(0,1.3fr) minmax(0,1fr) minmax(0,1.1fr);gap:14px;padding:10px 24px;background:var(--sal-2);border-top:1px solid var(--divisor);font-size:12px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:var(--texto-2)}

/* Treinos */
.im-treinos{list-style:none;margin:0;padding:0}
.im-treinos>li{display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:16px;padding:16px 24px;border-top:1px solid var(--divisor);align-items:start}
.im-dia{display:grid;justify-items:center;gap:2px;text-align:center}
.im-dia .disco{--d:48px;--f:19px}
.im-dia small{font-size:11px;color:var(--texto-2);text-transform:lowercase}
.im-treinos h3{font-family:var(--sans);font-size:14px;font-weight:600;color:var(--texto);display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.im-treinos h3 .ico{width:18px;height:18px;color:var(--vinho-4)}
.im-treinos p{font-size:13px;line-height:1.5;margin-top:3px}
.im-treinos .im-temas{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.im-treinos .im-temas .selo{height:22px;font-size:11px;padding:0 8px}
.im-treinos li.im-desfeito{background:var(--sal-2)}
.im-treinos li.im-desfeito h3{color:var(--texto-2)}
.im-treinos li.im-desfeito .disco{background:var(--sal);color:var(--texto-2)}
.im-riscado{text-decoration:line-through;text-decoration-thickness:1px}
.im-motivo{display:block;margin-top:6px;font-family:var(--serifa);font-style:italic;font-size:15px;line-height:1.4;color:var(--vinho);padding-left:10px;border-left:2px solid var(--ambar)}
.im-acoes-l{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
.im-total-treino{padding:12px 24px 16px;border-top:1px solid var(--divisor);font-size:12px;color:var(--texto-2);display:flex;gap:8px}
.im-total-treino .ico{width:16px;height:16px;color:var(--vinho-4);flex:none}

/* Concluir (lateral) */
.im-concluir{padding:4px 20px 20px;display:grid;gap:10px}
.im-concluir p{font-size:13px;line-height:1.5;color:var(--texto-2)}
.im-concluir p b{color:var(--texto);font-weight:600}
.im-concluir .btn{width:100%;justify-content:center}
.im-resumo-sec{padding:0 24px 20px}
.im-resumo{font-family:var(--serifa);font-size:17px;line-height:1.5;color:var(--vinho);padding:14px 16px;border-left:3px solid var(--ambar);background:#FCF8F5;border-radius:0 var(--raio) var(--raio) 0;margin:0}
.im-resumo-pe{font-size:12px;color:var(--texto-2);margin-top:8px}

/* Janelas */
.janela.im-larga{width:min(720px,calc(100vw - 32px))}
.im-janela-grade{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 18px}
.im-janela-grade .im-campo,.janela .im-campo{max-width:none}
.im-janela-grade .im-inteira{grid-column:1/-1}
.im-rot-linha{display:flex;justify-content:space-between;gap:12px;align-items:baseline}
.im-contador{font-size:12px;color:var(--texto-2)}
.im-grupo legend{font-size:14px;font-weight:500;margin-bottom:6px}
.im-marcas{display:grid;grid-template-columns:repeat(var(--cols,2),minmax(0,1fr));gap:2px 14px}
.im-grupo .erro-msg{margin-top:6px}
.im-grupo[aria-describedby*="-erro"] legend{color:var(--vinho-3)}
.im-autor{display:flex;gap:10px;align-items:center;padding:10px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:13px}
.im-autor .av-p{width:32px;height:32px;font-size:12px}
.im-efeito{display:grid;gap:10px;padding:14px 16px;border-radius:var(--raio);border:1px solid var(--borda-folha);background:#FCF8F5}
.im-efeito h3{font-family:var(--sans);font-size:13px;font-weight:600;color:var(--texto);display:flex;align-items:center;gap:8px}
.im-efeito h3 .ico{width:18px;height:18px;color:var(--vinho-4)}
.im-efeito p{font-size:13px;line-height:1.5}
.im-efeito p b{font-weight:600}
.im-conta-l{list-style:none;margin:0;padding:12px 14px;border-radius:var(--raio);background:var(--papel);display:grid;gap:6px;font-size:13px;border:1px solid var(--divisor)}
.im-conta-l li{display:flex;justify-content:space-between;gap:12px;align-items:baseline}
.im-conta-l li span{min-width:0}
.im-conta-l li b{font-weight:600;font-variant-numeric:lining-nums tabular-nums;white-space:nowrap}
.im-conta-l li.im-neg b{color:var(--vinho-3)}
.im-conta-l li.im-tot{border-top:1px solid var(--borda-folha);padding-top:6px;font-weight:600}
.im-conta-l li.im-sub{font-size:12px;color:var(--texto-2)}
.im-opcoes-resp .opcao{align-items:center}
.im-opcoes-resp .av-p{width:32px;height:32px;font-size:12px}
.im-opcoes-resp .im-o{display:flex;align-items:center;gap:10px}

/* Regra global (Cobrança › Planos) */
.im-regra{overflow:hidden}
.im-regra-corpo{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);border-top:1px solid var(--divisor)}
.im-regra-corpo>div{padding:18px 24px 20px;display:grid;gap:12px;align-content:start;min-width:0}
.im-regra-corpo>div+div{border-left:1px solid var(--divisor);background:#FCF8F5}
.im-regra .cb-preco{font-size:34px}
.im-dl{margin:0;display:grid;gap:0}
.im-dl div{display:grid;grid-template-columns:170px minmax(0,1fr);gap:12px;padding:9px 0;border-top:1px solid var(--divisor);font-size:13px}
.im-dl div:first-child{border-top:0}
.im-dl dt{color:var(--texto-2)}
.im-dl dd{margin:0;font-weight:500;min-width:0;overflow-wrap:anywhere}
.im-dl dd small{display:block;font-weight:400;font-size:12px;color:var(--texto-2)}
.im-hist{list-style:none;margin:0;padding:0 24px 16px}
.im-hist li{display:grid;grid-template-columns:96px minmax(0,1fr);gap:12px;padding:9px 0;border-top:1px solid var(--divisor);font-size:13px;line-height:1.5}
.im-hist li:first-child{border-top:0}
.im-hist li>span:first-child{color:var(--texto-2);white-space:nowrap}
.im-hist small{display:block;color:var(--texto-2);font-size:12px}

/* Bloco na assinatura */
.im-ass{margin:0 24px 18px;border:1px solid var(--borda-folha);border-radius:var(--raio-g);overflow:hidden}
.im-ass-cab{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:14px 16px;background:#FCF8F5;border-bottom:1px solid var(--divisor)}
.im-ass-cab h3{font-family:var(--serifa);font-size:19px;font-weight:500;color:var(--vinho);display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.im-ass-cab h3 .ico{width:20px;height:20px;color:var(--vinho-4)}
.im-ass-corpo{padding:12px 16px 14px;display:grid;gap:10px}
.im-ass-corpo p{font-size:13px;line-height:1.5}
.im-ass-corpo p b{font-weight:600}
.im-ass .aviso{margin:0}

/* Fatura: rótulos de tipo */
.im-tipo{display:inline-flex;align-items:center;height:20px;padding:0 7px;margin-right:8px;border-radius:5px;font-size:11px;font-weight:500;letter-spacing:.02em;vertical-align:1px;background:var(--sal-2);color:var(--texto-2);box-shadow:inset 0 0 0 1px var(--borda-folha)}
.im-tipo.im-t-impl{background:var(--ambar-3);color:var(--vinho);box-shadow:none}
.im-tipo.im-t-isen{background:var(--papel);color:var(--vinho);box-shadow:inset 0 0 0 1px var(--vinho-4)}

/* Sino: tipos novos */
.si-ico.im-si-urg{background:var(--vinho-3);color:var(--papel)}

/* Portal */
.im-pt-topo{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid var(--divisor)}
.im-pt-topo>div{padding:18px 24px 20px;display:grid;gap:8px;align-content:start;min-width:0}
.im-pt-topo>div+div{border-left:1px solid var(--divisor)}
.im-pt-topo p{font-size:13px;line-height:1.5;color:var(--texto-2)}
.im-pt-topo p b{color:var(--texto);font-weight:600}
.im-diferencial{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;margin:0;padding:0;list-style:none;border-top:1px solid var(--divisor)}
.im-diferencial li{padding:16px 20px 18px;display:grid;gap:6px;align-content:start;font-size:13px;line-height:1.5}
.im-diferencial li+li{border-left:1px solid var(--divisor)}
.im-diferencial .ico{width:28px;height:28px;color:var(--ambar);stroke-width:1.4}
.im-diferencial b{font-weight:600;color:var(--vinho);font-size:14px}
.im-cartao-impl{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr) auto;gap:20px;align-items:center;padding:20px 24px;border-radius:var(--raio-g);background:var(--papel);box-shadow:var(--sombra),inset 0 0 0 1px var(--borda-folha);position:relative;overflow:hidden;margin-bottom:24px}
.im-cartao-impl::before{content:"";position:absolute;left:0;top:0;bottom:0;width:6px;background:var(--ambar)}
.im-cartao-impl h2{font-size:22px;line-height:1.2;color:var(--vinho)}
.im-cartao-impl p{font-size:13px;line-height:1.55;margin-top:4px;color:var(--texto)}
.im-cartao-impl p b{font-weight:600}
.im-cartao-impl .im-falta{list-style:none;margin:0;padding:0;display:grid;gap:6px;font-size:13px}
.im-cartao-impl .im-falta li{display:flex;gap:8px;align-items:flex-start}
.im-cartao-impl .im-falta .ico{width:16px;height:16px;color:var(--vinho-4);flex:none;margin-top:2px}
.im-cartao-impl .btn{white-space:nowrap}
.im-seu{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:18px;align-items:center;padding:18px 24px;border-radius:var(--raio-g);background:var(--ambar-3);margin-bottom:24px}
.im-seu .disco{--d:56px;--f:15px;background:var(--vinho);color:var(--papel)}
.im-seu .disco .ico{width:26px;height:26px;color:var(--ambar-3)}
.im-seu h2{font-size:21px;color:var(--vinho);line-height:1.2}
.im-seu p{font-size:13px;line-height:1.55;color:var(--tinta);margin-top:3px}
.im-seu p b{font-weight:600}
.im-pt-impl-linha{display:grid;gap:4px;padding:12px 14px;border-radius:var(--raio);background:var(--papel);border:1px solid var(--borda-folha)}
.im-pt-impl-linha p{font-size:13px;color:var(--texto-2);line-height:1.5}
.im-pt-impl-linha p b{color:var(--texto);font-weight:600}
.im-pt-impl-linha .im-l1{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-weight:600;color:var(--vinho)}
.im-pt-impl-linha .im-l1 .ico{width:18px;height:18px;color:var(--vinho-4)}
.im-itens-sec{border-top:1px solid var(--divisor)}
.im-itens-sec h3{font-family:var(--sans);font-size:14px;font-weight:600;color:var(--texto);padding:16px 24px 6px}
.im-assinar{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:24px;align-items:start}
.im-co09{outline:2px dashed var(--vinho-4);outline-offset:-2px;border-radius:var(--raio-g);padding:14px 16px;font-size:12px;color:var(--texto-2);line-height:1.5;background:var(--papel)}
.im-co09 b{color:var(--texto);font-weight:600}

@media (max-width:760px){
  .im-topo,.im-pt-topo{grid-template-columns:1fr}
  .im-topo>div,.im-pt-topo>div{padding:14px 16px 16px}
  .im-topo>div+div,.im-pt-topo>div+div{border-left:0;border-top:1px solid var(--divisor)}
  .im-cab-folha{padding:16px 16px 12px}
  .im-faixa{margin:0 16px 16px}
  .im-feito{grid-template-columns:1fr;padding:0 16px 6px}
  .im-feito li:nth-child(2){border-top:1px solid var(--divisor)}
  .im-calc{margin:4px 16px 16px}
  .im-conta{padding:0 16px 14px}
  .im-pessoas-cab{display:none}
  .im-pessoas li{grid-template-columns:40px minmax(0,1fr);gap:6px 12px;padding:12px 16px}
  .im-pessoas .im-col{grid-column:2;grid-template-columns:auto 1fr;align-items:center;gap:8px}
  .im-pessoas .im-col .im-r{display:inline;font-size:12px;color:var(--texto-2)}
  .im-pessoas .im-col small{grid-column:1/-1}
  .im-treinos>li{grid-template-columns:52px minmax(0,1fr);gap:12px;padding:14px 16px}
  .im-treinos .im-acoes-l{grid-column:1/-1;justify-content:stretch}
  .im-treinos .im-acoes-l .btn{flex:1 1 auto}
  .im-total-treino{padding:12px 16px 14px}
  .im-concluir{padding:4px 16px 16px}
  .im-resumo-sec{padding:0 16px 16px}
  .im-janela-grade{grid-template-columns:1fr}
  .im-marcas{grid-template-columns:1fr}
  .im-regra-corpo{grid-template-columns:1fr}
  .im-regra-corpo>div{padding:16px}
  .im-regra-corpo>div+div{border-left:0;border-top:1px solid var(--divisor)}
  .im-dl div{grid-template-columns:1fr;gap:2px}
  .im-hist{padding:0 16px 14px}
  .im-hist li{grid-template-columns:1fr;gap:2px}
  .im-ass{margin:0 16px 16px}
  .im-diferencial{grid-template-columns:1fr}
  .im-diferencial li+li{border-left:0;border-top:1px solid var(--divisor)}
  .im-cartao-impl{grid-template-columns:1fr;gap:14px;padding:16px 16px 16px 20px}
  .im-cartao-impl .btn{width:100%;justify-content:center}
  .im-seu{grid-template-columns:auto minmax(0,1fr);padding:16px}
  .im-seu .btn{grid-column:1/-1;width:100%;justify-content:center}
  .im-assinar{grid-template-columns:1fr;gap:16px}
}
"""


# Preços aprovados pela Carol em 27/11/2026 (Essencial 299, Escritório 499, Banca 749, pessoa a mais 69).
# As telas aprovadas usam os preços antigos, fictícios; nos estados novos, trocamos.
PRECOS_NOVOS = [('290,00', '299,00'), ('490,00', '499,00'), ('890,00', '749,00'), ('39,00', '69,00')]


def precos_novos(t):
    import re as _re
    for a, b in PRECOS_NOVOS:
        t = _re.sub(r'(R\$(?: |\xa0|&nbsp;))' + _re.escape(a), lambda m: m.group(1) + b, t)
    return t
