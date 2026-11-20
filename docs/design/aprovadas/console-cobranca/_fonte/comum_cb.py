# Peças comuns da cobrança dos escritórios (CO-06).
# Parte dos HTML aprovados, lidos sem mudança de docs/design/aprovadas/ (as versões de console-fim-contrato,
# que já trazem o Console v1, o Portal v1, a marca de hoje e o fim do contrato). Cada página nova =
# página aprovada + CSS cb- + ícones novos + estados novos (templates com prefixo cb-).
import re, html, os

APROV = '/home/claude/t3jus/docs/design/aprovadas/'
BASE = APROV + 'console-fim-contrato/'
H = html.escape

# ---------------------------------------------------------------- dinheiro (sempre em centavos, PT-09)
def brl(c):
    """Centavos inteiros -> 'R$ 1.234,56'. Nunca ponto flutuante."""
    neg = c < 0
    c = abs(int(c))
    r, cent = divmod(c, 100)
    s = f'{r:,}'.replace(',', '.')
    return ('− ' if neg else '') + f'R$ {s},{cent:02d}'


def cnpj(base12):
    """Calcula os dois dígitos do CNPJ (exemplos fictícios com dígitos certos)."""
    d = [int(x) for x in base12]
    for pesos in ([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]):
        s = sum(a * b for a, b in zip(d, pesos))
        r = s % 11
        d.append(0 if r < 2 else 11 - r)
    t = ''.join(map(str, d))
    return f'{t[:2]}.{t[2:5]}.{t[5:8]}/{t[8:12]}-{t[12:]}'


# ---------------------------------------------------------------- ícones novos (traço 1,6, grade 24, cantos vivos)
ICONES_CB = {
    'i-fatura': '<path d="M5.5 3h13v18l-2.2-1.5L14 21l-2-1.5L10 21l-2.3-1.5L5.5 21Z"/><path d="M8.5 8h7M8.5 11.5h7M8.5 15h4"/>',
    'i-qr': '<path d="M4 4h6v6H4ZM14 4h6v6h-6ZM4 14h6v6H4Z"/><path d="M14 14h2.5v2.5H14ZM17.5 17.5H20V20h-2.5ZM14 20h1M20 14v1"/>',
    'i-barras': '<path d="M3.5 5v14M6.5 5v14M9 5v14M12.5 5v14M15 5v14M18 5v14M20.5 5v14"/>',
    'i-planos': '<path d="m12 3.5 8.5 4.5-8.5 4.5L3.5 8Z"/><path d="m3.5 12 8.5 4.5 8.5-4.5"/><path d="m3.5 16 8.5 4.5 8.5-4.5"/>',
    'i-arquivar': '<path d="M3.5 4.5h17v4h-17Z"/><path d="M5 8.5v11h14v-11"/><path d="M12 11.5v5M9.5 14l2.5 2.5 2.5-2.5"/>',
    'i-pagar': '<path d="M3 6.5h18v11H3Z"/><path d="M3 10h18"/><path d="M6.5 14.5h4"/>',
}


def icones_novos(s):
    return ''.join(f'<symbol id="{k}" viewBox="0 0 24 24">{v}</symbol>' for k, v in ICONES_CB.items() if f'id="{k}"' not in s)


def ico(nome, cls='ico'):
    return f'<svg class="{cls}" aria-hidden="true"><use href="#i-{nome}"/></svg>'


def aviso(tipo, titulo, texto='', icone=None, acoes='', papel=None, extra='', cls=''):
    icone = icone or {'urgencia': 'alerta', 'sucesso': 'check', 'atencao': 'relogio', 'info': 'ajuda'}[tipo]
    r = papel or ('alert' if tipo == 'urgencia' else 'status')
    p = f'<p>{texto}</p>' if texto else ''
    ac = f'<div class="aviso-acoes">{acoes}</div>' if acoes else ''
    return f'<div class="aviso aviso-{tipo} {cls}" role="{r}">{ico(icone)}<div><strong class="aviso-titulo">{titulo}</strong>{p}{ac}{extra}</div></div>'


def toast(titulo, texto):
    return (f'<div class="aviso aviso-sucesso toast" role="status">{ico("check")}<div><strong class="aviso-titulo">{titulo}</strong><p>{texto}</p></div>'
            f'<button class="fechar fc-fechar-toast" type="button" data-fechar aria-label="Fechar aviso">{ico("x")}</button></div>')


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


def campo(id_, rotulo, valor='', ajuda='', erro='', tipo='text', extra='', opcional=False, foco=False, ro=False, cls='', modo=None, area=False, linhas=3, cont=None):
    desc = ' '.join(x for x in ((id_ + '-erro') if erro else '', (id_ + '-ajuda') if ajuda else '') if x)
    a = f' aria-describedby="{desc}"' if desc else ''
    a += ' aria-invalid="true"' if erro else ''
    a += ' data-foco' if foco else ''
    a += ' readonly' if ro else ''
    a += f' inputmode="{modo}"' if modo else ''
    op = ' <span class="opcional">(opcional)</span>' if opcional else ''
    rot = f'<label for="{id_}">{rotulo}{op}</label>'
    if cont is not None:
        rot = f'<div class="fc-rot">{rot}<span class="fc-contador">{cont}</span></div>'
    if area:
        ent = f'<textarea class="entrada" id="{id_}" name="{id_}" rows="{linhas}"{a}{extra}>{valor}</textarea>'
    else:
        ent = f'<input class="entrada" id="{id_}" name="{id_}" type="{tipo}" value="{valor}" autocomplete="off"{a}{extra}>'
    er = f'<p class="erro-msg" id="{id_}-erro">{ico("alerta", "ico ico-s")}{erro}</p>' if erro else ''
    aj = f'<p class="ajuda" id="{id_}-ajuda">{ajuda}</p>' if ajuda else ''
    return f'<div class="campo {cls}">{rot}{ent}{er}{aj}</div>'


def selecao(id_, rotulo, opcoes, atual, ajuda='', cls='', mudou=False):
    o = ''.join(f'<option{" selected" if x == atual else ""}>{x}</option>' for x in opcoes)
    aj = f'<p class="ajuda" id="{id_}-ajuda">{ajuda}</p>' if ajuda else ''
    m = '<span class="mudou">Mudou</span>' if mudou else ''
    return (f'<div class="campo {cls}"><label for="{id_}">{rotulo}{m}</label><select class="entrada" id="{id_}" name="{id_}"'
            f'{" aria-describedby=" + chr(34) + id_ + "-ajuda" + chr(34) if ajuda else ""}>{o}</select>{aj}</div>')


def radios(nome, legenda, itens, atual, cls='', mudou=False):
    m = '<span class="mudou">Mudou</span>' if mudou else ''
    r = ''.join(f'<label class="opcao"><input class="marcar" type="radio" name="{nome}"{" checked" if v == atual else ""}><span>{v}<small>{d}</small></span></label>' for v, d in itens)
    return f'<fieldset class="grupo-opcoes {cls}"><legend>{legenda}{m}</legend>{r}</fieldset>'


def exemplo(s):
    """Os estados novos usam e-mails em exemplo.com.br (dados fictícios)."""
    return re.sub(r'@([a-z0-9-]+)\.(adv\.br|pro)\b', r'@\1.exemplo.com.br', s)


def bloco(s, ini, fim_marca='</template>'):
    i = s.index(ini)
    j = s.index(fim_marca, i)
    return s[i:j]


def miolo(s, est):
    t = bloco(s, f'<template data-est="{est}"')
    return t[t.index('>') + 1:]


SELO_EX = '<span class="cb-ex" title="Planos e preços fictícios, só para o desenho">Valores de exemplo</span>'

# Item novo no trilho do Console: só Administração e Financeiro veem.
ITEM_COBRANCA = ('<a class="item so-fin" href="cobranca.html"{cur}><svg class="ico" aria-hidden="true"><use href="#i-fatura"/></svg>Cobrança'
                 '<span class="cont" aria-label="4 escritórios com fatura em atraso">4</span></a>')


def trilho_console(s, atual=False):
    m = re.search(r'<a class="item[^"]*" href="carteira\.html"[^>]*>.*?</a>', s)
    assert m, 'item Clientes'
    novo = ITEM_COBRANCA.replace('{cur}', ' aria-current="page"' if atual else '')
    return s[:m.end()] + '\n      ' + novo + s[m.end():]


def montar(base, saida, css, templates, trocas=(), js='', antes_script=True, pos=None):
    s = open(BASE + base, encoding='utf-8').read()
    s = s.replace('</style>', css + '\n</style>', 1)
    sp = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">'
    assert sp in s
    s = s.replace(sp, sp + icones_novos(s), 1)
    for a, b in trocas:
        assert a in s, (base, a[:80])
        s = s.replace(a, b)
    if pos:
        s = pos(s)
    # Os templates entram depois do último template aprovado e antes do script que monta a página.
    k = s.rindex('</template>') + len('</template>')
    s = s[:k] + '\n' + templates + s[k:]
    if js:
        s = s.replace('</body>', js + '\n</body>')
    open(saida, 'w', encoding='utf-8').write(s)
    return s


# ---------------------------------------------------------------- CSS novo (prefixo cb-)
CSS_CB = r"""
/* ==========================================================================
   CO-06 · Cobrança dos escritórios. Só tokens do D2 e do Gabinete; prefixo cb-.
   ========================================================================== */
html[data-papel="implantacao"] .so-fin,html[data-papel="suporte"] .so-fin{display:none!important}
html[data-papel="admin"] .msg-nao-fin,html[data-papel="financeiro"] .msg-nao-fin{display:none!important}
.num,.cb-valor{font-variant-numeric:lining-nums tabular-nums}
.cb-valor{white-space:nowrap;text-align:right}
.cb-ex{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:13px;font-size:12px;font-weight:500;background:var(--papel);color:var(--vinho);box-shadow:inset 0 0 0 1px var(--vinho-4);border:1px dashed transparent;white-space:nowrap}
.cb-ex::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--ambar)}
.cb-cab-linha{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:14px}
.selo .ico{flex:none}
.cb-sit{display:grid;gap:3px;justify-items:start}
.cb-sit small,.cb-peq{font-size:12px;color:var(--texto-2);line-height:1.4}
.cb-sit .selo{margin-left:0}
.selo-paga{background:var(--vinho);color:var(--papel)}
.selo-cancelada{background:var(--sal-2);color:var(--texto-2);box-shadow:inset 0 0 0 1px var(--vinho-4)}
.selo-consulta{background:var(--ambar-3);color:var(--vinho-escuro);box-shadow:inset 0 0 0 1px var(--vinho-2)}

/* Números da cobrança */
.cb-numeros{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) minmax(0,1.35fr);margin-top:-76px;margin-left:24px;margin-right:24px;position:relative}
.cb-numeros>div{padding:22px 24px;border-left:1px solid var(--divisor);display:flex;flex-direction:column;gap:6px;min-width:0}
.cb-numeros>div:first-child{border-left:0}
.cb-numeros dt,.cb-rot{font-size:12px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--vinho-2)}
.cb-numeros dd{margin:0}
.cb-grande{font-family:var(--serifa);font-size:32px;line-height:1.05;color:var(--vinho);font-weight:500;font-variant-numeric:lining-nums tabular-nums;white-space:nowrap}
.cb-grande.cb-urg{color:var(--vinho-3)}
.cb-numeros small{font-size:12px;color:var(--texto-2);line-height:1.4;display:block}
.cb-idade{list-style:none;margin:4px 0 0;padding:0;display:grid;gap:7px}
.cb-idade li{display:grid;grid-template-columns:88px minmax(0,1fr) 92px;gap:10px;align-items:center;font-size:12px;color:var(--texto)}
.cb-idade .cb-barra{height:10px;border-radius:5px;background:var(--sal);overflow:hidden}
.cb-idade .cb-barra i{display:block;height:100%;border-radius:5px;background:var(--c,var(--vinho))}
.cb-idade b{font-weight:600;text-align:right;font-variant-numeric:lining-nums tabular-nums;white-space:nowrap}
.cb-idade span.n{color:var(--texto-2)}
.cabeca-ambar.cb-cab{padding-bottom:112px}
.cabeca-ambar.cb-cab.cb-sem-num{padding-bottom:30px}

/* Tabela de faturas (computador) */
table.cb-tab{width:100%;border-collapse:collapse;table-layout:fixed}
table.cb-tab thead th{white-space:nowrap;font-size:12px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:var(--texto-2);text-align:left;padding:12px 16px;background:var(--sal-2);border-top:1px solid var(--divisor);border-bottom:1px solid var(--divisor)}
table.cb-tab thead th.cb-valor{text-align:right}
table.cb-tab th:first-child,table.cb-tab td:first-child{padding-left:24px}
table.cb-tab th:last-child,table.cb-tab td:last-child{padding-right:16px}
table.cb-tab tbody td{padding:14px 16px;border-bottom:1px solid var(--divisor);vertical-align:middle;font-size:14px}
table.cb-tab tbody tr:last-child td{border-bottom:0}
.eventos li,.cb-ass-topo,.cb-para dd{overflow-wrap:anywhere}
table.cb-tab tbody td:first-child{white-space:nowrap;min-width:120px}
table.cb-tab tbody tr:hover{background:#FCF8F5}
table.cb-tab .cb-esc a,table.cb-tab .cb-esc strong{font-family:var(--serifa);font-size:18px;font-weight:500;color:var(--vinho);text-decoration:none;line-height:1.2}
table.cb-tab .cb-esc a:hover{text-decoration:underline}
table.cb-tab .cb-esc small{display:block;font-size:12px;color:var(--texto-2)}
table.cb-tab .cb-forma{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--texto)}
table.cb-tab .cb-forma .ico{width:16px;height:16px;color:var(--vinho-4)}
table.cb-tab .cb-ir{width:44px;height:44px;display:grid;place-items:center;border-radius:var(--raio);color:var(--vinho)}
table.cb-tab .cb-ir:hover{background:var(--ambar-3)}
table.cb-tab tr.cb-off td{color:var(--texto-2)}
.cb-acoes-linha{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap}
.cb-vazio-linha{padding:18px 24px;color:var(--texto-2);font-size:13px}

/* Cartões de fatura (celular) */
.cb-cartoes{list-style:none;margin:0;padding:0 16px 16px;display:grid;gap:12px}
.cb-cartao{position:relative;border:1px solid var(--borda-folha);border-radius:var(--raio-g);background:var(--papel);padding:14px 16px;display:grid;gap:10px}
.cb-cartao:hover{border-color:var(--vinho-4)}
.cb-cartao .cb-c-topo{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.cb-cartao .cb-c-nome{font-family:var(--serifa);font-size:18px;font-weight:500;color:var(--vinho);text-decoration:none;line-height:1.2}
.cb-cartao a.cb-c-nome::after{content:"";position:absolute;inset:0;border-radius:var(--raio-g)}
.cb-cartao a.cb-c-nome:focus-visible{outline:none}
.cb-cartao:has(a.cb-c-nome:focus-visible){outline:3px solid var(--foco);outline-offset:2px}
.cb-cartao .cb-c-topo small{display:block;font-size:12px;color:var(--texto-2);margin-top:2px}
.cb-cartao .cb-c-valor{font-family:var(--serifa);font-size:22px;color:var(--vinho);font-weight:500;white-space:nowrap;font-variant-numeric:lining-nums tabular-nums}
.cb-cartao dl{margin:0;display:grid;grid-template-columns:1fr auto;gap:4px 12px;font-size:13px;padding-top:10px;border-top:1px solid var(--divisor)}
.cb-cartao dt{color:var(--texto-2)}
.cb-cartao dd{margin:0;text-align:right;font-weight:500}
.cb-cartao .cb-c-acoes{display:flex;gap:8px;flex-wrap:wrap;position:relative;z-index:1}
.cb-cartao .cb-c-acoes .btn{flex:1 1 auto}

/* Fatura aberta */
.cb-fat-cab{display:grid;grid-template-columns:minmax(0,1fr) 380px;border-radius:var(--raio-g);overflow:hidden;box-shadow:var(--sombra);min-height:208px}
.cb-fat-cab .esq{padding:22px 36px 28px;display:flex;flex-direction:column;gap:14px}
.cb-fat-cab .esq .sobretitulo{color:var(--ambar-2)}
.cb-fat-cab h1{font-size:44px;line-height:1.04;color:var(--papel);margin-top:4px}
.cb-fat-cab .meta{display:flex;align-items:center;gap:12px;flex-wrap:wrap;font-size:13px;color:var(--ambar-2)}
.cb-fat-cab .meta .sep{width:4px;height:4px;border-radius:50%;background:var(--vinho-4)}
.cb-fat-cab .dir{margin-left:-70px;clip-path:polygon(70px 0,100% 0,100% 100%,0 100%);padding:24px 32px 24px 100px;display:flex;flex-direction:column;gap:8px;justify-content:center}
.cb-fat-cab .dir .sobretitulo{color:var(--vinho-escuro)}
.cb-fat-cab .dir .cb-total{font-family:var(--serifa);font-size:46px;line-height:1;color:var(--vinho);font-weight:500;font-variant-numeric:lining-nums tabular-nums;white-space:nowrap}
.cb-fat-cab .dir p{font-size:13px;color:var(--tinta)}
.cb-fat-cab .dir p b{font-weight:600}
.cb-fat-cab .esq .selo-ok{background:var(--sal);color:var(--vinho)}
.cb-fat-cab .esq .selo-paga{background:var(--ambar-3);color:var(--vinho)}
.cb-voltar{display:inline-flex;align-items:center;gap:6px;min-height:44px;color:var(--ambar-3);text-decoration:none;font-weight:500;font-size:13px;margin:-6px 0 -6px -4px;align-self:flex-start}
.cb-voltar:hover{text-decoration:underline}
.cb-itens{width:100%;border-collapse:collapse}
.cb-itens th,.cb-itens td{padding:12px 24px;border-top:1px solid var(--divisor);text-align:left;vertical-align:top;font-size:14px}
.cb-itens thead th{font-size:12px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:var(--texto-2);background:var(--sal-2);padding-top:10px;padding-bottom:10px}
.cb-itens td small{display:block;font-size:12px;color:var(--texto-2);margin-top:2px;line-height:1.45}
.cb-itens .cb-valor{text-align:right;width:150px}
.cb-itens tr.cb-desc td:first-child{color:var(--texto)}
.cb-itens tr.cb-desc .cb-valor{color:var(--vinho-3)}
.cb-itens tfoot th,.cb-itens tfoot td{border-top:2px solid var(--vinho);font-weight:600;font-size:15px;padding-top:14px;padding-bottom:16px}
.cb-itens tfoot .cb-valor{font-family:var(--serifa);font-size:24px;font-weight:500;color:var(--vinho)}
.cb-motivo{display:block;margin-top:4px;font-family:var(--serifa);font-style:italic;font-size:15px;line-height:1.4;color:var(--vinho);padding-left:10px;border-left:2px solid var(--ambar)}

.cb-pagar{display:grid;grid-template-columns:150px minmax(0,1fr);gap:18px 22px;padding:4px 24px 22px;align-items:start}
.cb-qr{width:150px;height:150px;border:1.5px dashed var(--vinho-4);border-radius:var(--raio);display:grid;place-items:center;align-content:center;gap:6px;text-align:center;color:var(--texto-2);font-size:12px;background:var(--sal-2)}
.cb-qr .ico{width:44px;height:44px;color:var(--vinho-4);stroke-width:1.3}
.cb-meio{display:grid;gap:8px;min-width:0}
.cb-meio h3{font-family:var(--sans);font-size:14px;font-weight:600;color:var(--texto);display:flex;align-items:center;gap:8px}
.cb-meio h3 .ico{color:var(--vinho-4)}
.cb-codigo{display:flex;align-items:center;gap:8px;border:1px dashed var(--vinho-4);border-radius:var(--raio);padding:0 4px 0 14px;min-height:48px;background:var(--papel);min-width:0}
.cb-codigo code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;color:var(--tinta);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cb-codigo .btn{flex:none}
.cb-sep-meio{grid-column:1/-1;border-top:1px solid var(--divisor);margin:2px 0}
.cb-meio-boleto{grid-column:1/-1}
.cb-nao-vale{margin:4px 24px 22px;padding:14px 16px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;color:var(--texto-2);display:flex;gap:10px;align-items:flex-start}
.cb-nao-vale .ico{color:var(--vinho-4);flex:none}
.cb-reserva{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border:1px dashed var(--vinho-4);border-radius:var(--raio);font-size:12px;color:var(--texto-2);line-height:1.5;background:var(--papel)}
.cb-reserva .ico{width:18px;height:18px;color:var(--vinho-4);flex:none;margin-top:1px}
.cb-reserva b{color:var(--texto);font-weight:600}

.cb-acoes{display:grid;gap:10px;padding:4px 20px 20px}
.cb-acoes .btn{justify-content:flex-start;width:100%}
.cb-acoes .permissao{margin-top:2px}
.cb-acoes hr{border:0;border-top:1px solid var(--divisor);margin:4px 0}
.cb-dl{margin:0;padding:0 20px 14px}
.cb-dl div{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:10px 0;border-top:1px solid var(--divisor);font-size:13px}
.cb-dl div:first-child{border-top:0}
.cb-dl dt{color:var(--texto-2);flex:none}
.cb-dl dd{margin:0;font-weight:500;text-align:right;overflow-wrap:anywhere;min-width:0}
.cb-dl dd small{display:block;font-weight:400;font-size:12px;color:var(--texto-2)}

/* Faixa de atraso em cima da fatura e da assinatura */
.cb-atraso{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:20px;align-items:center;padding:20px 24px;border-radius:var(--raio-g);background:var(--papel);box-shadow:var(--sombra),inset 0 0 0 1px var(--borda-folha);position:relative;overflow:hidden}
.cb-atraso::before{content:"";position:absolute;left:0;top:0;bottom:0;width:6px;background:var(--vinho-3)}
.cb-atraso.cb-ate30::before{background:var(--ambar)}
.cb-dias{width:76px;height:76px;border-radius:50%;display:grid;place-items:center;align-content:center;background:var(--vinho-3);color:var(--papel);text-align:center}
.cb-ate30 .cb-dias{background:var(--ambar-3);color:var(--vinho-escuro)}
.cb-dias b{font-family:var(--serifa);font-size:30px;line-height:1;font-weight:500}
.cb-dias small{font-size:11px;font-weight:500;margin-top:2px}
.cb-atraso h2{font-size:22px;line-height:1.2;color:var(--vinho)}
.cb-atraso p{font-size:13px;line-height:1.55;margin-top:4px;color:var(--texto)}
.cb-atraso p b{font-weight:600}
.cb-atraso .cb-botoes{display:flex;flex-direction:column;gap:8px;align-items:stretch;min-width:240px}
.cb-atraso .permissao{max-width:260px}

/* Planos */
.cb-planos{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}
.cb-plano{background:var(--papel);border:1px solid var(--borda-folha);border-radius:var(--raio-g);box-shadow:var(--sombra);overflow:hidden;display:flex;flex-direction:column}
.cb-plano .cb-tom{height:64px;background:var(--c,var(--vinho));position:relative}
.cb-plano .cb-tom span{position:absolute;left:20px;bottom:10px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-weight:500;color:var(--t,var(--ambar-3))}
.cb-plano .cb-p-corpo{padding:18px 20px 16px;display:grid;gap:10px;flex:1}
.cb-plano h3{font-size:26px;line-height:1.1;color:var(--vinho)}
.cb-preco{font-family:var(--serifa);font-size:34px;line-height:1;color:var(--vinho);font-weight:500;font-variant-numeric:lining-nums tabular-nums}
.cb-preco small{font-family:var(--sans);font-size:13px;color:var(--texto-2);font-weight:400;margin-left:4px}
.cb-plano ul{list-style:none;margin:0;padding:0;display:grid;gap:6px;font-size:13px}
.cb-plano li{display:flex;gap:8px;align-items:flex-start}
.cb-plano li .ico{width:16px;height:16px;color:var(--vinho-4);margin-top:2px}
.cb-assinam{display:flex;align-items:center;gap:10px;padding:12px 20px;border-top:1px solid var(--divisor);background:var(--sal-2);font-size:13px}
.cb-assinam .disco{--d:36px;--f:17px}
.cb-p-acoes{display:flex;gap:8px;padding:12px 20px 16px;border-top:1px solid var(--divisor);flex-wrap:wrap}
.cb-p-acoes .btn{flex:1 1 auto}
.cb-plano.cb-arq{box-shadow:none;border-style:dashed;border-color:var(--vinho-4);background:transparent}
.cb-plano.cb-arq .cb-tom{background:var(--sal-2)}
.cb-plano.cb-arq .cb-tom span{color:var(--texto-2)}
.cb-extra{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:18px;align-items:center;padding:18px 24px}
.cb-extra .disco{--d:56px;--f:15px}
.cb-regra{display:flex;gap:10px;align-items:flex-start;padding:14px 16px;border-radius:var(--raio);background:var(--ambar-3);font-size:13px;line-height:1.5;color:var(--tinta)}
.cb-regra .ico{color:var(--vinho);flex:none;margin-top:1px}
.cb-regra b{font-weight:600}
.cb-titulo-sec{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}
.cb-titulo-sec h2{font-size:26px}
.cb-titulo-sec p{font-size:13px;color:var(--texto-2)}

/* Régua */
.cb-regua{list-style:none;margin:0;padding:8px 24px 6px;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:0}
.cb-regua>li{position:relative;display:grid;gap:8px;justify-items:start;align-content:start;padding:0 14px 18px 0}
.cb-regua>li::before{content:"";position:absolute;left:28px;right:0;top:27px;height:2px;background:var(--sal)}
.cb-regua>li.cb-depois::before{background:var(--vinho-4)}
.cb-regua>li:last-child::before{display:none}
.cb-regua .disco{--d:56px;--f:20px;position:relative;z-index:1}
.cb-regua .cb-d-antes{--c:var(--ambar-3)}
.cb-regua .cb-d-dia{--c:var(--ambar);color:var(--tinta)}
.cb-regua .cb-d-dep{--c:var(--vinho-2);color:var(--papel)}
.cb-regua .cb-d-forte{--c:var(--vinho-3);color:var(--papel)}
.cb-regua strong{font-size:14px;font-weight:600;line-height:1.3}
.cb-regua p{font-size:12px;color:var(--texto-2);line-height:1.5}
.cb-regua .cb-canais{display:flex;flex-wrap:wrap;gap:4px}
.cb-regua .cb-canais .selo{height:22px;font-size:11px;padding:0 8px}
.cb-email{margin:4px 24px 22px;border:1px solid var(--borda-folha);border-radius:var(--raio);overflow:hidden;background:var(--papel)}
.cb-email .cb-e-cab{padding:12px 16px;background:var(--sal-2);font-size:12px;color:var(--texto-2);display:grid;gap:2px}
.cb-email .cb-e-cab b{color:var(--texto);font-weight:500}
.cb-email .cb-e-corpo{padding:16px;font-size:14px;line-height:1.6;display:grid;gap:10px}
.cb-email .cb-e-corpo .btn{justify-self:start}
.cb-nunca{list-style:none;margin:0;padding:0 20px 16px;display:grid;gap:0}
.cb-nunca li{display:flex;gap:10px;padding:10px 0;border-top:1px solid var(--divisor);font-size:13px;line-height:1.5}
.cb-nunca li:first-child{border-top:0}
.cb-nunca .ico{width:18px;height:18px;color:var(--vinho);flex:none;margin-top:1px}

/* Assinatura (ficha) */
.cb-ass-topo{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center;padding:20px 24px 16px}
.cb-ass-topo h2{font-size:22px}
.cb-ass-topo .sub{font-size:13px;color:var(--texto-2)}
.cb-ass-topo .acoes{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.cb-plano-nome{font-family:var(--serifa);font-size:20px;color:var(--vinho);font-weight:500}
.cb-situ{display:grid;gap:12px;padding:6px 20px 20px}
.cb-situ .cb-grande{font-size:36px}
.cb-situ p{font-size:13px;color:var(--texto-2);line-height:1.5}
.cb-situ p b{color:var(--texto);font-weight:600}
.cb-so-ver{display:flex;gap:10px;align-items:flex-start;margin:0 24px 18px;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.5;color:var(--texto-2)}
.cb-so-ver .ico{width:18px;height:18px;color:var(--vinho-4);flex:none;margin-top:1px}
.cb-mini-hist{margin:0 24px 20px;padding-top:12px;border-top:1px solid var(--divisor)}
.cb-mini-hist h3{font-family:var(--sans);font-size:14px;font-weight:600;color:var(--texto);margin-bottom:4px}
.cb-mini-hist ul{list-style:none;margin:0;padding:0}
.cb-mini-hist li{display:flex;gap:10px;font-size:13px;padding:6px 0;line-height:1.45}
.cb-mini-hist li>span:first-child{color:var(--texto-2);white-space:nowrap}
.cb-compara-planos{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:stretch}
.cb-compara-planos>div{border:1px solid var(--borda-folha);border-radius:var(--raio);padding:12px 14px;display:grid;gap:2px;font-size:13px}
.cb-compara-planos>div.cb-novo{border:1.5px solid var(--vinho);background:#FCF8F5}
.cb-compara-planos strong{font-family:var(--serifa);font-size:19px;color:var(--vinho);font-weight:500}
.cb-compara-planos .cb-seta{align-self:center;color:var(--vinho-4)}
.cb-conta{list-style:none;margin:0;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);display:grid;gap:6px;font-size:13px}
.cb-conta li{display:flex;justify-content:space-between;gap:12px}
.cb-conta li b{font-weight:600;font-variant-numeric:lining-nums tabular-nums;white-space:nowrap}
.cb-conta li.cb-tot{border-top:1px solid var(--borda-folha);padding-top:6px;font-weight:600}
.cb-duas{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.cb-campo-valor{position:relative}
.cb-campo-valor .entrada{padding-left:44px}
.cb-campo-valor .cb-rs{position:absolute;left:14px;top:12px;font-size:14px;color:var(--texto-2);pointer-events:none}
.cb-arquivo{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.cb-arquivo .cb-nome-arq{font-size:13px;color:var(--texto)}
.cb-arquivo .cb-nome-arq small{display:block;font-size:12px;color:var(--texto-2)}

/* Portal: plano e faturas (só a sócia dona) */
.cb-pt-plano{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);border-top:1px solid var(--divisor)}
.cb-pt-plano>div{padding:18px 24px 20px;display:grid;gap:10px;align-content:start}
.cb-pt-plano>div+div{border-left:1px solid var(--divisor);background:#FCF8F5}
.cb-pt-plano .cb-preco{font-size:30px}
.cb-pt-plano p{font-size:13px;color:var(--texto-2);line-height:1.5}
.cb-pt-plano p b{color:var(--texto);font-weight:600}
.cb-proxima{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.cb-proxima .cb-grande{font-size:30px}
.cb-pt-atraso{background:var(--ambar-3)!important}
.cb-pt-atraso.cb-forte{background:#FBEFF3!important;box-shadow:inset 4px 0 0 var(--vinho-3)}
.cb-tira-atraso{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:8px 48px;background:var(--papel);color:var(--tinta);font-size:13px;border-bottom:1px solid var(--borda-folha);box-shadow:inset 6px 0 0 var(--ambar)}
.cb-tira-atraso .ico{color:var(--vinho);flex:none}
.cb-tira-atraso b{font-weight:600}
.cb-tira-atraso span{flex:1;min-width:0}
.cb-tira-atraso a{display:inline-flex;align-items:center;min-height:44px;padding:0 10px;border-radius:var(--raio);color:var(--vinho);font-weight:600}
.cb-tira-atraso a:hover{background:var(--sal-2)}

@media (max-width:760px){
  .cb-numeros{grid-template-columns:1fr 1fr;margin:-76px 12px 0}
  .cb-numeros>div{padding:14px 12px;border-left:0;border-top:1px solid var(--divisor)}
  .cb-numeros>div:nth-child(-n+2){border-top:0}
  .cb-numeros>div:nth-child(2){border-left:1px solid var(--divisor)}
  .cb-numeros>div:nth-child(3){grid-column:1/-1}
  .cb-numeros>div:nth-child(4){grid-column:1/-1}
  .cb-grande{font-size:24px}
  .cb-idade li{grid-template-columns:80px minmax(0,1fr) 86px;gap:8px}
  .cabeca-ambar.cb-cab{padding-bottom:96px!important}
  .cb-fat-cab{grid-template-columns:1fr;min-height:0}
  .cb-fat-cab .esq{padding:10px 16px 20px}
  .cb-fat-cab h1{font-size:30px}
  .cb-fat-cab .dir{margin-left:0;clip-path:none;padding:18px 16px 20px}
  .cb-fat-cab .dir .cb-total{font-size:36px}
  .cb-itens th,.cb-itens td{padding:10px 16px}
  .cb-itens .cb-valor{width:112px}
  .cb-itens tfoot .cb-valor{font-size:20px}
  .cb-pagar{grid-template-columns:1fr;padding:4px 16px 18px}
  .cb-qr{width:100%;height:120px}
  .cb-acoes{padding:4px 16px 16px}
  .cb-dl{padding:0 16px 12px}
  .cb-atraso{grid-template-columns:auto minmax(0,1fr);gap:14px 16px;padding:16px 16px 16px 20px}
  .cb-dias{width:60px;height:60px}
  .cb-dias b{font-size:24px}
  .cb-atraso h2{font-size:19px}
  .cb-atraso .cb-botoes{grid-column:1/-1;min-width:0}
  .cb-atraso .cb-txt{grid-column:1/-1}
  .cb-planos{grid-template-columns:1fr;gap:16px}
  .cb-extra{grid-template-columns:auto minmax(0,1fr);padding:16px}
  .cb-extra>.btn,.cb-extra>.permissao{grid-column:1/-1}
  .cb-regua{grid-template-columns:1fr;padding:8px 16px 4px}
  .cb-regua>li{grid-template-columns:56px minmax(0,1fr);gap:4px 14px;padding:0 0 18px;justify-items:stretch}
  .cb-regua>li>.disco{grid-row:1/span 4}
  .cb-regua>li::before{left:27px;right:auto;top:56px;bottom:0;width:2px;height:auto}
  .cb-email{margin:4px 16px 18px}
  .cb-nunca{padding:0 16px 14px}
  .cb-ass-topo{grid-template-columns:1fr;padding:16px 16px 12px}
  .cb-ass-topo .acoes{justify-content:stretch}
  .cb-ass-topo .acoes .btn{flex:1 1 auto}
  .cb-situ{padding:6px 16px 16px}
  .cb-so-ver{margin:0 16px 16px}
  .cb-mini-hist{margin:0 16px 16px}
  .cb-compara-planos{grid-template-columns:1fr}
  .cb-compara-planos .cb-seta{justify-self:center;transform:rotate(90deg)}
  .cb-duas{grid-template-columns:1fr}
  .cb-pt-plano{grid-template-columns:1fr}
  .cb-pt-plano>div{padding:16px}
  .cb-pt-plano>div+div{border-left:0;border-top:1px solid var(--divisor)}
  .cb-tira-atraso{padding:6px 16px}
  .cb-titulo-sec h2{font-size:22px}
  .abas a[data-aba="historico"]{grid-column:1/-1}
}
"""
