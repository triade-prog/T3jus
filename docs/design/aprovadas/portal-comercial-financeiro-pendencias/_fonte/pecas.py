# Peças comuns de Comercial e Contratos: campos, dinheiro, condições de honorário (prefixo hn-),
# tabelas que viram cartões no celular, e a montagem da página com a barra de seções da área.
# Reusa comum.py do Portal (sem mudança) e o mesmo jeito do clientes.py aprovado.
import html, re
from comum import *

H = html.escape
CLIENTES_URL = '../portal-clientes/clientes.html'

# Equipe fictícia (a mesma do Portal v1 e de Clientes). OAB fictícia.
OAB = {'Marina Ribeiro': 'OAB/SP 214.538', 'Felipe Matos': 'OAB/SP 287.104', 'Larissa Costa': 'OAB/SP 401.226'}
EQUIPE = ['Diego Almeida', 'Felipe Matos', 'Larissa Costa', 'Marina Ribeiro (você)', 'Paula Nunes']

# Pessoas extras para os estados de acesso parcial. Entram por substituição no texto gerado;
# o comum.py continua igual ao aprovado.
QUEM_EXTRA = ("comercial:{nome:'Diego Almeida',ini:'D',papel:'Área: Comercial',areas:['comercial'],dono:false},"
              "contratos:{nome:'Felipe Matos',ini:'F',papel:'Áreas: Comercial, Contratos e Jurídico',areas:['comercial','contratos','juridico'],dono:false},"
              "'sem-area':{")


# ---------------------------------------------------------------- dinheiro em centavos (PT-09)
def brl(c):
    neg = c < 0
    c = abs(int(c))
    r, cc = divmod(c, 100)
    s = f'{r:,}'.replace(',', '.')
    return f'{"-" if neg else ""}R$ {s},{cc:02d}'


def parcelas(total, n):
    """Divide em centavos exatos: as primeiras levam o centavo que sobra."""
    base, resto = divmod(total, n)
    return [base + 1] * resto + [base] * (n - resto)


def resumo_parcelas(total, n):
    ps = parcelas(total, n)
    if len(set(ps)) == 1:
        return f'{n} parcelas de {brl(ps[0])}'
    a, b = ps[0], ps[-1]
    na = ps.count(a)
    return f'{na} de {brl(a)} e {n - na} de {brl(b)}'


# ---------------------------------------------------------------- campos (mesmo desenho do clientes.py)
def campo(id_, rot, valor='', cls='c3', tipo='text', opc=False, ajuda='', erro='', extra='', ac='off', im='', foco=False,
          antes='', depois_in='', depois='', uso=''):
    o = ' <span class="opcional">(opcional)</span>' if opc else ''
    u = f'<span class="cl-uso">{uso}</span>' if uso else ''
    desc, aj, er, a = [], '', '', ''
    if ajuda:
        aj = f'<p class="ajuda" id="{id_}-aj">{ajuda}</p>'
        desc.append(f'{id_}-aj')
    if erro:
        er = f'<p class="erro-msg" id="{id_}-er">{ico("alerta", "ico ico-s")}{erro}</p>'
        desc.append(f'{id_}-er')
    if desc:
        a += f' aria-describedby="{" ".join(desc)}"'
    if erro:
        a += ' aria-invalid="true"'
    if im:
        a += f' inputmode="{im}"'
    if foco:
        a += ' data-foco'
    v = f' value="{H(valor)}"' if valor else ''
    inp = f'<input class="entrada" id="{id_}" name="{id_}" type="{tipo}" autocomplete="{ac}"{v}{a}{extra}>'
    if antes or depois_in:
        cls_w = 'hn-afixo' + (' hn-antes' if antes else '') + (' hn-depois' if depois_in else '')
        inp = f'<span class="{cls_w}">{f"<span aria-hidden=true>{antes}</span>" if antes else ""}{inp}{f"<span aria-hidden=true>{depois_in}</span>" if depois_in else ""}</span>'
    return f'<div class="campo {cls}"><label for="{id_}">{rot}{o}{u}</label>{inp}{aj}{depois}{er}</div>'


def selecao(id_, rot, opcoes, sel='', cls='c3', opc=False, ajuda='', erro='', foco=False, vazio='Escolha'):
    o = ' <span class="opcional">(opcional)</span>' if opc else ''
    ops = (f'<option value="">{vazio}</option>' if vazio else '') + ''.join(f'<option{" selected" if x == sel else ""}>{H(x)}</option>' for x in opcoes)
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


def texto(id_, rot, valor='', cls='c6', opc=False, ajuda='', erro='', foco=False, cont=None):
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
    return (f'<div class="campo {cls}"><div class="campo-linha"><label for="{id_}">{rot}{o}</label>{c}</div>'
            f'<textarea class="entrada" id="{id_}" name="{id_}"{a}>{H(valor)}</textarea>{aj}{er}</div>')


def opcao(nome, rot, sub='', marcado=False, tipo='checkbox', valor=''):
    ch = ' checked' if marcado else ''
    s = f'<small>{sub}</small>' if sub else ''
    v = f' value="{H(valor)}"' if valor else ''
    return f'<label class="opcao"><input class="marcar" type="{tipo}" name="{nome}"{v}{ch}><span>{rot}{s}</span></label>'


def selo(tipo, texto_, icone=None):
    i = ico(icone) if icone else ''
    return f'<span class="selo selo-{tipo}">{i}{texto_}</span>'


# ---------------------------------------------------------------- tabela que vira cartões no celular
def tabela(cap, cols, linhas, larg=None, cls=''):
    """cols: lista de títulos. linhas: lista de (lista de células html, classe da linha)."""
    cg = ''
    if larg:
        cg = '<colgroup>' + ''.join(f'<col style="width:{w}">' for w in larg) + '</colgroup>'
    th = ''.join(f'<th scope="col">{c}</th>' for c in cols)
    corpo = ''
    for cel, lc in linhas:
        tds = ''
        for i, c in enumerate(cel):
            rot = re.sub('<[^>]+>', '', cols[i]) if i else ''
            tds += f'<td data-r="{H(rot)}">{c}</td>'
        corpo += f'<tr{f" class={chr(34)}{lc}{chr(34)}" if lc else ""}>{tds}</tr>'
    return f'<table class="hn-tab {cls}"><caption class="sr">{cap}</caption>{cg}<thead><tr>{th}</tr></thead><tbody>{corpo}</tbody></table>'


# ---------------------------------------------------------------- tipos de honorário (CH-06)
TIPOS = {
    'fixo': ('Fixo', 'moeda', 'Um valor só, com uma data de pagamento.'),
    'parcelado': ('Parcelado', 'agenda', 'Um valor dividido em parcelas com dia certo.'),
    'mensal': ('Mensal', 'reenviar', 'O mesmo valor todo mês, como numa assessoria.'),
    'exito': ('Êxito em percentual', 'balanca', 'Um percentual do que o cliente ganhar, cobrado numa etapa do caso.'),
    'sucumbencia': ('Sucumbência', 'coluna', 'O valor que o juiz fixar para a parte contrária pagar.'),
    'ato': ('Por ato ou consulta', 'doc', 'Um valor para cada audiência, diligência ou consulta feita.'),
    'recorrente': ('Percentual recorrente', 'relogio', 'Um percentual de um valor que muda todo mês, como o benefício no contracheque.'),
}


def selo_tipo(k, extra=''):
    n, i, _ = TIPOS[k]
    return f'<span class="hn-selo">{ico(i, "ico ico-s")}{n}{extra}</span>'


def cond_ler(k, valor, det, gera='', nota=''):
    """Uma condição já combinada, para ler (ficha da proposta e do contrato)."""
    n, i, _ = TIPOS[k]
    g = f'<p class="hn-gera">{ico("seta", "ico ico-s")}<span>{gera}</span></p>' if gera else ''
    nt = f'<p class="hn-nota">{nota}</p>' if nota else ''
    return (f'<li class="hn-item"><span class="hn-ic">{ico(i)}</span><div class="hn-txt"><p class="hn-tipo">{n}</p>'
            f'<p class="hn-valor">{valor}</p><p class="hn-det">{det}</p>{g}{nt}</div></li>')


def conds_ler(itens, titulo='Condições de honorário', sub='', acoes='', id_='t-cond'):
    s = f'<p class="sub">{sub}</p>' if sub else ''
    a = f'<div class="acoes">{acoes}</div>' if acoes else ''
    return (f'<section class="folha" aria-labelledby="{id_}"><div class="folha-cab"><div><h2 id="{id_}">{titulo}</h2>{s}</div>{a}</div>'
            f'<ol class="hn-lista">{"".join(itens)}</ol></section>')


def cond_editar(n, k, campos_html, gera='', erros=0, aberto=True):
    nome, i, exp = TIPOS[k]
    e = f'<span class="selo selo-urgente">{ico("alerta")}{erros} {"ponto" if erros == 1 else "pontos"} para acertar</span>' if erros else ''
    g = f'<p class="hn-gera-ed">{ico("seta", "ico ico-s")}<span><b>Gera:</b> {gera}</span></p>' if gera else ''
    return (f'<fieldset class="hn-cond{" hn-cond-erro" if erros else ""}" id="cond-{n}" aria-labelledby="cond-{n}-t">'
            f'<div class="hn-cond-cab"><span class="disco hn-n" aria-hidden="true"><span>{n}</span></span>'
            f'<div class="hn-cond-nome"><strong id="cond-{n}-t"><span class="sr">Condição {n}: </span>{nome}</strong><small>{exp}</small>{e}</div>'
            f'</div>'
            f'<div class="hn-campos">{campos_html}</div>{g}</fieldset>')


def marcar_tipos(marcados=(), pref='tp', titulo='Tipos de honorário', sub='Marque todos os tipos deste contrato. Cada tipo marcado abre o seu bloco logo abaixo, na ordem desta lista.'):
    """Caixas de marcar em cartões: pode marcar mais de um tipo de uma vez."""
    cs = ''
    for k, (n, i, e) in TIPOS.items():
        ch = ' checked' if k in marcados else ''
        cs += (f'<label class="hn-tipo-ck"><input class="marcar" type="checkbox" name="{pref}" value="{k}"{ch}>'
               f'<span class="hn-tipo-ic">{ico(i)}</span><span><strong>{n}</strong><small>{e}</small></span></label>')
    q = len(marcados)
    cont = f'{q} marcado{"s" if q != 1 else ""}' if q else 'nenhum marcado'
    return (f'<fieldset class="hn-escolher" aria-describedby="{pref}-aj"><legend>{titulo}<span class="hn-cont-tipos">{cont}</span></legend>'
            f'<p id="{pref}-aj">{sub}</p><div class="hn-tipos">{cs}</div></fieldset>')


# ---------------------------------------------------------------- página da área
def barras(area, url):
    _, nome, _, secoes, _ = AREA[area]
    out = ''
    for s in secoes:
        b = barra_area(area, s)
        for s2, est in url.items():
            b = b.replace(f'<a href="#">{s2}</a>', f'<a href="{est}">{s2}</a>').replace(f'<a href="#" aria-current="page">{s2}</a>', f'<a href="{est}" aria-current="page">{s2}</a>')
        out += f'<template data-barra="{area}|{s}">{b}</template>\n'
    return out


def ficha_cab_css():
    fi = open(APROV + 'console-v1/ficha.html', encoding='utf-8').read()
    cf = fi[fi.index('<style>') + 7:fi.index('</style>')]
    return '\n'.join(r.strip() + '}' for r in cf.split('}') if r.strip().startswith(('.ficha-cab', '.voltar', '.ident', '.meta', '.estatua', '.dir')))


def montar(arquivo, titulo, descricao, padrao, T, barras_html, css):
    out = pagina(titulo, descricao, padrao, '', T, barras_html)
    out = out.replace("'sem-area':{", QUEM_EXTRA, 1)
    out = out.replace('</style>', CSS_FICHA + CSS_HN + css + '\n</style>', 1)
    return out


CSS_FICHA = '\n/* ===== Cabeçalho da ficha: o da ficha aprovada do Console v1, sem mudança ===== */\n' + ficha_cab_css() + r"""
.ficha-cab .esq .meta .selo-ativo{background:var(--ambar-3);color:var(--vinho)}
.ficha-cab .esq .meta .selo-neutro{background:var(--sal);color:var(--vinho)}
.dir .btn{align-self:flex-start}
.dir .hn-oque{font-size:13px;color:var(--tinta);line-height:1.45}
.dir .hn-oque b{font-weight:600}
.hn-dir-linha{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.dir .hn-dir-acoes{display:flex;gap:8px;flex-wrap:wrap}
"""

CSS_HN = r"""
/* ==========================================================================
   Comercial e Contratos · peças comuns (prefixo hn-)
   ========================================================================== */
.hn{display:flex;flex-direction:column;gap:24px;min-width:0}
.hn-grade{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:24px;align-items:start}
.hn-col{display:flex;flex-direction:column;gap:24px;min-width:0}
.hn-cab-ambar{align-items:flex-end}
.hn-cab-ambar .lede{max-width:70ch}
.cl-uso{display:inline-flex;align-items:center;height:20px;padding:0 8px;margin-left:8px;border-radius:10px;background:var(--sal-2);color:var(--vinho);font-size:11px;font-weight:500;vertical-align:1px;white-space:nowrap}

/* Ferramentas da lista (busca e filtros) */
.hn-ferr{display:flex;align-items:center;gap:12px;padding:16px 24px;flex-wrap:wrap}
.hn-ferr .campo-busca{position:relative;flex:1 1 300px;max-width:420px}
.hn-ferr .campo-busca .ico{position:absolute;left:14px;top:12px;color:var(--vinho-4);pointer-events:none}
.hn-ferr .campo-busca input{padding-left:44px}
.hn-ferr .chips{margin-left:auto;flex-wrap:wrap}
.hn-cont{padding:0 24px 12px;font-size:13px;color:var(--texto-2)}
.hn-cont b{color:var(--texto);font-weight:500}

/* Tabela que vira cartões no celular */
.hn-tab td{vertical-align:middle}
.hn-tab .esc a{display:inline-flex;align-items:center;min-height:44px;margin:0;line-height:1.2}
.hn-tab .selo,.hn-tab .hn-selo,.ct-lembretes .selo{white-space:normal;height:auto;min-height:24px;padding-top:3px;padding-bottom:3px;line-height:1.3;max-width:100%}
.hn-tab .esc small{margin-top:0}
.hn-tab td small{display:block;font-size:12px;color:var(--texto-2)}
.hn-tab td b{font-weight:500}
.hn-tab tr.hn-venc td{background:#FCF6F2}
.hn-tab tr.hn-venc td:first-child{box-shadow:inset 3px 0 0 var(--vinho-3)}
.hn-tab tr.hn-off td{color:var(--texto-2)}
.hn-tab tr.hn-novo td{background:#FCF8F5}
.hn-tab .hn-dir{text-align:right}
.hn-tab .hn-valor-c{font-weight:500;white-space:nowrap}
.hn-selos{display:flex;flex-wrap:wrap;gap:6px}
.hn-selo{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px;border-radius:12px;background:var(--sal-2);color:var(--vinho);font-size:12px;font-weight:500;white-space:nowrap}
.hn-selo .ico{width:14px;height:14px;color:var(--vinho-2)}
.hn-sem{font-size:13px;color:var(--texto-2)}
.hn-pe{display:flex;align-items:flex-start;gap:10px;padding:14px 24px 18px;border-top:1px solid var(--divisor);font-size:13px;color:var(--texto-2);line-height:1.5}
.hn-pe .ico{color:var(--vinho-4);margin-top:1px;flex:none}
.hn-pe a{color:var(--vinho);font-weight:500}

/* Condições de honorário: leitura */
.hn-lista{list-style:none;margin:0;padding:0 24px 12px;counter-reset:hn}
.hn-item{display:grid;grid-template-columns:44px minmax(0,1fr);gap:14px;padding:16px 0;border-top:1px solid var(--divisor)}
.hn-item:first-child{border-top:0;padding-top:4px}
.hn-ic{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--ambar-3);color:var(--vinho)}
.hn-tipo{font-size:12px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--vinho-2)}
.hn-valor{font-family:var(--serifa);font-size:24px;font-weight:500;color:var(--vinho);line-height:1.2;margin-top:2px}
.hn-valor small{font-family:var(--sans);font-size:14px;color:var(--texto);font-weight:400}
.hn-det{font-size:13px;color:var(--texto-2);margin-top:2px;line-height:1.5}
.hn-gera{display:flex;gap:8px;align-items:flex-start;margin-top:8px;font-size:13px;line-height:1.45;padding:8px 12px;border-radius:var(--raio);background:var(--sal-2)}
.hn-gera .ico{color:var(--vinho);margin-top:2px;flex:none}
.hn-nota{font-size:12px;color:var(--texto-2);margin-top:6px}

/* Condições de honorário: edição (o coração de Contratos) */
.hn-cond{border:1px solid var(--borda-folha);border-radius:var(--raio-g);margin:0;padding:0;min-width:0;background:var(--papel)}
.hn-cond+.hn-cond{margin-top:16px}
.hn-cond-erro{border-color:var(--vinho-3);box-shadow:inset 3px 0 0 var(--vinho-3)}
.hn-cond-cab{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--divisor);background:#FCF8F5;border-radius:var(--raio-g) var(--raio-g) 0 0;flex-wrap:wrap}
.hn-cond .hn-n{--d:36px;--f:18px}
.hn-cond-nome{flex:1 1 220px;min-width:0}
.hn-cond-nome strong{display:block;font-family:var(--serifa);font-size:20px;font-weight:600;color:var(--vinho);line-height:1.2}
.hn-cond-nome small{display:block;font-size:12px;color:var(--texto-2)}
.hn-cond-nome .selo{margin-top:8px}
.hn-ops3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2px 16px}
.hn-res-dentro{border:1px solid var(--borda-folha);border-radius:var(--raio-g);background:#FCF8F5;padding-top:14px}
.hn-res-dentro h2{font-family:var(--serifa);font-size:20px;font-weight:600;color:var(--vinho);padding:0 16px 8px}
.hn-campos{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:16px 20px;padding:16px}
.hn-campos .c6{grid-column:span 6}.hn-campos .c4{grid-column:span 4}.hn-campos .c3{grid-column:span 3}.hn-campos .c2{grid-column:span 2}
.hn-campos fieldset.grupo-opcoes{grid-column:span 6}
.hn-campos fieldset.grupo-opcoes .hn-ops{display:grid;grid-template-columns:1fr 1fr;gap:2px 16px}
.hn-gera-ed{display:flex;gap:10px;align-items:flex-start;margin:0 16px 16px;padding:12px 14px;border-radius:var(--raio);background:var(--ambar-3);color:var(--tinta);font-size:13px;line-height:1.5}
.hn-gera-ed .ico{color:var(--vinho);margin-top:2px;flex:none}
.hn-gera-ed b{font-weight:600;color:var(--vinho)}
.hn-afixo{position:relative;display:block}
.hn-afixo>span{position:absolute;top:0;bottom:0;display:flex;align-items:center;color:var(--texto-2);font-size:14px;pointer-events:none}
.hn-antes>span:first-child{left:14px}
.hn-antes input{padding-left:44px}
.hn-depois>span:last-child{right:14px}
.hn-depois input{padding-right:40px}
.hn-atos{grid-column:span 6;display:grid;gap:10px}
.hn-ato{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) 44px;gap:12px;align-items:end}
.hn-ato .remover{width:44px;height:44px;display:grid;place-items:center;border:1px solid var(--borda-folha);border-radius:var(--raio);background:var(--papel);color:var(--vinho);cursor:pointer}

/* Escolher o tipo de honorário */
.hn-escolher{border:1px solid var(--borda-folha);border-radius:var(--raio-g);padding:16px 18px 18px;margin:0 0 16px;background:#FCF8F5;min-width:0}
.hn-escolher legend{float:left;width:100%;padding:0;display:flex;align-items:baseline;justify-content:space-between;gap:12px;font-family:var(--serifa);font-size:20px;font-weight:600;color:var(--vinho)}
.hn-cont-tipos{font-family:var(--sans);font-size:12px;font-weight:500;color:var(--vinho-2);background:var(--sal-2);border-radius:10px;padding:2px 9px}
.hn-escolher>p{clear:both;font-size:13px;color:var(--texto-2);padding-top:2px}
.hn-tipos{margin:12px 0 0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.hn-tipo-ck{display:grid;grid-template-columns:22px 36px minmax(0,1fr);gap:12px;align-items:center;min-height:64px;padding:10px 14px;border:1px solid var(--borda-folha);border-radius:var(--raio);background:var(--papel);cursor:pointer;color:var(--texto)}
.hn-tipo-ck:hover{border-color:var(--vinho-4)}
.hn-tipo-ck:has(input:checked){border-color:var(--vinho);background:var(--ambar-3);box-shadow:inset 0 0 0 1px var(--vinho)}
.hn-tipo-ck:has(input:focus-visible){outline:3px solid var(--foco);outline-offset:2px}
.hn-tipo-ic{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:var(--ambar-3);color:var(--vinho)}
.hn-tipo-ck:has(input:checked) .hn-tipo-ic{background:var(--papel)}
.hn-tipo-ic .ico{width:20px;height:20px}
.hn-tipo-ck strong{display:block;font-weight:500;color:var(--vinho)}
.hn-tipo-ck small{display:block;font-size:12px;color:var(--texto-2);line-height:1.4}
.hn-tipo-ck:has(input:checked) small{color:var(--tinta)}
.hn-mais-cond{margin-top:16px}

/* Formulário em passos numerados, numa página só */
.hn-passo{grid-column:1/-1;display:flex;align-items:center;gap:12px;padding-top:14px;border-top:1px solid var(--divisor);margin-top:6px}
.hn-passo.hn-primeiro{border-top:0;padding-top:0;margin-top:0}
.hn-passo .disco{--d:36px;--f:18px;--c:var(--vinho);color:var(--papel)}
.hn-passo h3{font-size:21px;font-weight:600;color:var(--vinho)}
.hn-passo small{display:block;font-size:12px;color:var(--texto-2)}
.hn-bloco{grid-column:1/-1;min-width:0}
.grupo-opcoes>.ajuda,.grupo-opcoes>.erro-msg{margin-top:4px}
.grupo-opcoes>.ajuda{font-size:12px;color:var(--texto-2);line-height:1.5}
.hn-escolhido{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--borda-folha);border-radius:var(--raio);background:#FCF8F5;flex-wrap:wrap}
.hn-escolhido strong{display:block;font-family:var(--serifa);font-size:19px;font-weight:500;color:var(--vinho);line-height:1.2}
.hn-escolhido small{display:block;font-size:12px;color:var(--texto-2)}
.hn-escolhido .btn{margin-left:auto}
.hn-ok{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--vinho-2)}
.hn-ok .ico{width:16px;height:16px}
.hn-resumo-erros{grid-column:1/-1}
.hn-resumo-erros ul{margin:8px 0 0;padding-left:18px;display:grid;gap:4px}
.hn-resumo-erros a{color:var(--vinho);font-weight:500;display:inline-flex;align-items:center;min-height:44px}
.hn-resumo-erros ul{gap:0!important}

/* Resumo lateral do que o contrato gera */
.hn-resumo{position:sticky;top:24px}
.hn-res-bloco{padding:0 24px 16px}
.hn-res-bloco+.hn-res-bloco{border-top:1px solid var(--divisor);padding-top:14px}
.hn-res-bloco h3{font-family:var(--sans);font-size:12px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--vinho-2);margin-bottom:6px}
.hn-res-grande,.hn-res-bloco p.hn-res-grande,.cm-conv p.hn-res-grande,.ct-totais p.hn-res-grande{font-family:var(--serifa);font-size:32px;color:var(--vinho);font-weight:500;color:var(--vinho);line-height:1.1}
.hn-res-bloco p{font-size:13px;line-height:1.5}
.hn-res-bloco p small{color:var(--texto-2);font-size:12px}
.hn-prog{list-style:none;margin:0;padding:0}
.hn-prog li{display:grid;grid-template-columns:86px minmax(0,1fr) auto;gap:10px;padding:8px 0;border-top:1px solid var(--divisor);font-size:13px;align-items:baseline}
.hn-prog li:first-child{border-top:0}
.hn-prog time{color:var(--texto-2)}
.hn-prog b{font-weight:500;white-space:nowrap}
.hn-prog li.hn-var b{font-weight:400;color:var(--texto-2);font-style:italic}

/* Discos de resumo no alto (Atendimentos, Honorários) */
.hn-numeros{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}
.hn-numeros a,.hn-numeros div.hn-num{display:flex;align-items:center;gap:14px;padding:18px 22px;color:var(--texto);text-decoration:none;border-left:1px solid var(--divisor);position:relative;min-height:44px}
.hn-numeros>*:first-child{border-left:0}
.hn-numeros a:hover{background:#FCF8F5}
.hn-numeros .disco{--d:52px;--f:26px}
.hn-numeros .r{font-size:13px;color:var(--texto-2);line-height:1.35}
.hn-numeros .r b{display:block;color:var(--texto);font-weight:500;font-size:14px}
.hn-numeros a[aria-current="true"]::after{content:"";position:absolute;left:22px;right:22px;bottom:0;height:3px;border-radius:3px 3px 0 0;background:var(--vinho)}
.disco.hn-d-urg{--c:var(--vinho-3);color:var(--papel)}
.disco.hn-d-hoje{--c:var(--ambar);color:var(--vinho-escuro)}
.disco.hn-d-vinho{--c:var(--vinho);color:var(--papel)}

/* Reserva (o que ainda é hipótese) */
.hn-reserva{margin:4px 24px 20px;padding:16px;border:1.5px dashed var(--vinho-4);border-radius:var(--raio);display:grid;gap:10px;font-size:13px;color:var(--texto-2);line-height:1.5}
.hn-reserva div{display:flex;align-items:flex-start;gap:10px}
.hn-reserva .ico{color:var(--vinho-4);flex:none;margin-top:1px}
.hn-reserva b{color:var(--texto);font-weight:500}
.hn-dl{margin:0;padding:0 24px 18px;display:grid;gap:10px}
.hn-dl div{display:flex;justify-content:space-between;gap:12px;font-size:13px;padding-top:10px;border-top:1px solid var(--divisor)}
.hn-dl div:first-child{border-top:0;padding-top:0}
.hn-dl dt{color:var(--texto-2)}
.hn-dl dd{margin:0;font-weight:500;text-align:right}
.hn-dl dd a{color:var(--vinho);display:inline-flex;align-items:center;min-height:44px;margin:-12px 0}
.hn-folha-acao{padding:4px 24px 20px;display:grid;gap:10px}
.hn-folha-acao>p{font-size:13px;color:var(--texto-2);line-height:1.5}
.hn-pessoas{list-style:none;margin:0;padding:0 24px 16px}
.hn-pessoas li{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--divisor)}
.hn-pessoas li:first-child{border-top:0}
.hn-pessoas strong{display:block;font-weight:500;font-size:14px;line-height:1.3}
.hn-pessoas small{display:block;font-size:12px;color:var(--texto-2)}
.hn-pessoas .selo{margin-left:auto}
.eventos .selo{margin-left:6px}

@media (max-width:760px){
  .hn{gap:16px}
  .hn-grade{grid-template-columns:minmax(0,1fr);gap:16px}
  .hn-col{gap:16px}
  .hn-cab-ambar{flex-direction:column;align-items:stretch}
  .cabeca-ambar{padding:22px 16px 20px!important}
  .cabeca-ambar h1{font-size:34px!important}
  .hn-ferr{padding:16px;gap:10px}
  .hn-ferr .campo-busca{flex-basis:100%;max-width:none}
  .hn-ferr .chips{margin-left:0}
  .hn-cont{padding:0 16px 10px}
  .hn-pe{padding:12px 16px 16px}
  /* Tabela vira cartões */
  .hn-tab,.hn-tab tbody{display:block}
  .hn-tab colgroup{display:none}
  .hn-tab thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
  .hn-tab tbody{padding:0 16px 16px;display:grid;gap:12px}
  .hn-tab tr{display:grid;gap:8px;border:1px solid var(--borda-folha);border-radius:var(--raio-g);padding:14px 16px;background:var(--papel)}
  .hn-tab tr.hn-venc{border-color:var(--vinho-3);box-shadow:inset 3px 0 0 var(--vinho-3)}
  .hn-tab tr.hn-venc td,.hn-tab tr.hn-novo td{background:transparent!important;box-shadow:none!important}
  .hn-tab td{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:0!important;border:0!important;text-align:right;font-size:13px}
  .hn-tab td:first-child{display:block;text-align:left;padding-bottom:8px!important;border-bottom:1px solid var(--divisor)!important}
  .hn-tab td::before{content:attr(data-r);color:var(--texto-2);text-align:left;flex:none;max-width:45%}
  .hn-tab td:first-child::before{display:none}
  .hn-tab td[data-r=""]::before{display:none}
  .hn-tab td>*{min-width:0}
  .hn-tab .hn-dir{text-align:right}
  .hn-tab td .hn-selos{justify-content:flex-end}
  .hn-tab td .btn{flex:1 1 auto}
  .hn-tab td.hn-acao{display:block}
  .hn-tab td.hn-acao .btn{width:100%}
  .hn-lista{padding:0 16px 8px}
  .hn-valor{font-size:21px}
  .hn-campos{grid-template-columns:1fr;padding:14px 12px}
  .hn-campos .c6,.hn-campos .c4,.hn-campos .c3,.hn-campos .c2{grid-column:1/-1}
  .hn-campos fieldset.grupo-opcoes{grid-column:1/-1}
  .hn-campos fieldset.grupo-opcoes .hn-ops{grid-template-columns:1fr}
  .hn-atos{grid-column:1/-1}
  .hn-ato{grid-template-columns:minmax(0,1fr) 44px}
  .hn-ato .campo:nth-child(2){grid-column:1}
  .hn-ato .remover{grid-column:2;grid-row:1/3;align-self:center}
  .hn-cond-cab{padding:12px;flex-wrap:nowrap;align-items:flex-start}
  .hn-ops3{grid-template-columns:1fr}
  .hn-gera-ed{margin:0 12px 12px}
  .hn-tipos{grid-template-columns:1fr}
  .hn-escolher{padding:14px 12px 16px}
  .hn-escolher legend{font-size:19px}
  .hn-resumo{position:static}
  .hn-res-bloco{padding:0 16px 14px}
  .hn-numeros{grid-template-columns:1fr 1fr}
  .hn-numeros>*{padding:14px 12px!important;gap:10px!important;border-left:0!important;border-top:1px solid var(--divisor)}
  .hn-numeros>*:nth-child(-n+2){border-top:0}
  .hn-numeros>*:nth-child(even){border-left:1px solid var(--divisor)!important}
  .hn-numeros .disco{--d:44px;--f:22px}
  .hn-reserva{margin:4px 16px 16px}
  .hn-dl,.hn-pessoas{padding-left:16px;padding-right:16px}
  .hn-folha-acao{padding:4px 16px 16px}
  .hn-folha-acao .btn{width:100%}
  .dir .btn{align-self:stretch}
  .dir .hn-dir-acoes .btn{flex:1 1 100%}
  .ficha-cab .esq .ident h1{font-size:30px!important}
  .hn-escolhido .btn{margin-left:0;width:100%}
}
"""
