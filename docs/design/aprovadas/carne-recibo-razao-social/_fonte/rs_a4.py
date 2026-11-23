# Carnê e recibo com o timbrado aprovado (F3.133, PA-07): a razão social e os contatos do escritório no lugar do nome curto.
# Reusa sem mudança os modelos aprovados: carne_a4.py (portal-carne) e recibo_a4.py (portal-recibo-recorrente), lidos até o
# começo dos estados, como o logo_a4.py de portal-nao-paga-logo. Muda só:
#   - carnê: esc_marca() (alto da via e da capa), canhoto() (o nome no canhoto) e capa() (o campo "Escritório");
#   - recibo: o timbrado (.rb-marca e .rb-ender) e a assinatura (.rb-ass).
# Peças novas com prefixo tb-. Gera carne-a4.html, recibo-a4.html e antes-depois.html. Uso: python3 rs_a4.py <pasta-saida>
import os, sys, html
AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
from rs_dados import *
from logo_dados import LOGOS

H = html.escape


def _ler(arquivo, ate):
    src = open(os.path.join(AQUI, arquivo), encoding='utf-8').read()
    ns = {'__name__': 'lido', '__file__': os.path.join(AQUI, arquivo)}
    argv = sys.argv
    sys.argv = [arquivo, SAIDA]
    exec(compile(src[:src.index(ate)], arquivo, 'exec'), ns)
    sys.argv = argv
    return ns


CN = _ler('carne_a4.py', 'ESTADOS = [')
RB = _ler('recibo_a4.py', 'ESTADOS = [')

E = COMPLETA      # o escritório do estado que está sendo montado
ANTES = False     # True monta como o código faz hoje (para o "antes e depois")


def usar(e, antes=False):
    global E, ANTES
    E, ANTES = e, antes
    CN['PIX'].clear()
    CN['PIX'].update(e['pix'])          # o mesmo dicionário do carne_dados: o BR Code e o QR saem com o recebedor certo
    CN['ESC']['whats'] = e['whats']


CSS_RS = r"""
/* ==========================================================================
   Timbrado aprovado no carnê e no recibo (prefixo tb-)
   ========================================================================== */
.tb-nw{white-space:nowrap}
/* carnê: a marca, e embaixo a razão social e "CNPJ · OAB" */
.cn-cab .cn-marca,.cn-cab .tb-marca{min-width:0;flex:1 1 auto}
.cn-num{flex:none}
.tb-marca{display:grid;gap:.4mm;justify-items:start;min-width:0}
.tb-ident{margin-top:.4mm;font-size:6.6pt;line-height:1.3;color:var(--tinta-2);overflow-wrap:anywhere}
.tb-ident b{font-weight:600;color:var(--tinta)}
/* razão social com mais de 90 letras: a linha da identificação um pouco menor e mais junta (cabe em 2 linhas) */
.tb-ident.tb-longo{font-size:6pt;line-height:1.22}
.cn-via.tb-longo .tb-logo{max-height:9mm}
/* o logo: caixa aprovada de 56 x 12 mm; na via, 56 x 10 mm, porque a linha da identificação agora vem embaixo dele */
.tb-logo{display:block;max-width:56mm;max-height:10mm;width:auto;height:auto}
.cn-capa .tb-logo{max-width:54mm;max-height:10mm}
.cn-uma .tb-logo{max-width:56mm;max-height:12mm}
.cn-uma .tb-ident{font-size:8.6pt}
/* capa: o campo "Escritório" com as linhas do timbrado */
.tb-tim dd{font-weight:400!important;font-size:6.8pt;line-height:1.3}
.tb-tim dd>span{display:block}
.tb-tim dd>b{display:block;font-weight:600}
/* recibo: a razão social em destaque na 1ª linha do bloco da direita */
.tb-ender{display:grid;gap:.3mm;justify-items:end}
.tb-ender>span{display:block}
.tb-ender .tb-r1{font-size:9pt;font-weight:600;color:var(--tinta);line-height:1.3;margin-bottom:.6mm}
.tb-rb-logo{display:block;max-width:92mm;max-height:20mm;width:auto;height:auto}
.tb-ass-doc{color:var(--tinta-2)}
/* razão social com mais de 90 letras: a 1ª linha do timbrado e a assinatura em letra um pouco menor */
.tb-longo .tb-ender .tb-r1{font-size:8.2pt}
.tb-longo .rb-ass b{font-size:8.4pt;line-height:1.3}
"""

ALT_LOGO = 'Santana Advocacia'


# ---------------------------------------------------------------- carnê

def esc_marca(doc=True):
    """Alto da via e da capa. A marca (logo ou nome curto em letra) fica. Na via, embaixo dela, a linha da identificação
    (razão social · CNPJ · OAB), no lugar do "CNPJ · OAB" aprovado. Na capa (doc=False), só a marca: o timbrado inteiro
    está no campo Escritório."""
    e = E
    if ANTES:   # Carne.tsx hoje: o nome curto e "CNPJ · OAB"
        d = ' · '.join(x for x in [f'CNPJ {e["cnpj"]}' if e['cnpj'] else '', e['oab']] if x)
        return f'<div class="cn-marca"><span class="cn-esc">{e["curto"]}</span>{f"<span class=cn-doc>{d}</span>" if d else ""}</div>'
    if e['logo']:
        marca = f'<img class="tb-logo" src="{LOGOS["largo"]["uri"]}" alt="{ALT_LOGO}">'
    else:
        sub = sub_marca(e)
        marca = f'<span class="cn-esc">{e["curto"]}</span>' + (f'<span class="cn-esc-sub">{sub}</span>' if sub else '')
    return f'<div class="tb-marca">{marca}{linha_id() if doc else ""}</div>'


def linha_id():
    """A linha da identificação: razão social (se não for igual à marca) · CNPJ · OAB, num texto corrido."""
    if ANTES:
        return ''
    e = E
    l1, l2, _, _ = timbrado(e)
    nome_marca = ALT_LOGO if e['logo'] else e['curto']
    partes = ([] if mesmo(l1, nome_marca) else [f'<b>{l1}</b>']) + ([l2] if l2 else [])
    longo = ' tb-longo' if len(l1) > 90 else ''
    return f'<p class="tb-ident{longo}">{" · ".join(partes)}</p>' if partes else ''


def canhoto(n, ref, venc, vencida=False):
    CT, CLI, R, txid = CN['CT'], CN['CLI'], CN['R'], CN['txid']
    v = f'{R(CT["valor"])}' + (' + encargos' if vencida else '')
    # O canhoto fica com o escritório: continua com a marca em letra (o nome curto), como no aprovado. Ver a decisão 4.
    nome = f'<p class="cn-esc-c">{E["curto"]}</p>'
    return (f'<div class="cn-canhoto"><p class="cn-rot">Canhoto · fica com o escritório</p>'
            f'{nome}'
            f'<p class="cn-parc">Parcela {n} de {CT["total_parc"]}<small>{ref}</small></p>'
            f'<dl><div><dt>Cliente</dt><dd>{CLI["nome"]}</dd></div><div><dt>Contrato</dt><dd>{CT["numero"]}</dd></div>'
            f'<div><dt>Vencimento</dt><dd>{venc}{" (vencida)" if vencida else ""}</dd></div><div><dt>Valor</dt><dd>{v}</dd></div>'
            f'<div><dt>Identificador</dt><dd style="font-family:var(--mono);font-weight:700">{txid(n)}</dd></div></dl>'
            f'<div class="cn-pago"><span>Pago em <i></i>/<i></i>/<i></i></span><span>Forma <i></i></span><span>Visto <i></i></span></div></div>')


def campo_escritorio():
    e = E
    if ANTES:   # Carne.tsx hoje: endereço e cidade/UF, sem CEP e sem razão social
        x = e['sede']
        local = f'{x["rua"]}, {x["num"]}, {x["comp"]}, {x["bairro"]} · {x["cidade"]}/{x["uf"]}'
        return f'<div><dt>Escritório</dt><dd style="font-weight:400">{local}</dd></div>'
    l1, l2, l3, l4 = timbrado(e, site=False)      # o site fica só no recibo (ajuda aprovada do campo Site)
    nome_marca = ALT_LOGO if e['logo'] else e['curto']
    linhas = ('' if mesmo(l1, nome_marca) else f'<b>{l1}</b>') + ''.join(f'<span>{x}</span>' for x in (l2, l3, l4) if x)
    return f'<div class="tb-tim"><dt>Escritório</dt><dd>{linhas}</dd></div>'


def capa(parcelas, modo='pix'):
    CT, CLI, R, PIX, ESC, HOJE, TESOURA = CN['CT'], CN['CLI'], CN['R'], CN['PIX'], CN['ESC'], CN['HOJE'], CN['TESOURA']
    linhas = ''
    for n, ref, venc, sit in parcelas:
        v = '<span class="cn-v">vencida</span>' if sit == 'vencida' else ''
        linhas += f'<tr><td>{n} de {CT["total_parc"]}</td><td>{ref}</td><td>{venc}{v}</td><td>{R(CT["valor"])}</td></tr>'
    total = R(CT['valor'] * len(parcelas))
    como = (f'<h3>Como pagar com Pix</h3><ol class="cn-passos"><li><span>Abra o app do seu banco e escolha Pix: ler QR Code, ou Pix copia e cola.</span></li>'
            f'<li><span>Use o QR ou o código da parcela do mês, na via do cliente.</span></li>'
            f'<li><span>Antes de confirmar, veja se aparece <b>{PIX["recebedor"]}</b> e o valor da parcela.</span></li></ol>')
    return (f'<article class="cn-faixa cn-capa">{TESOURA.replace("cn-tesoura", "cn-tesoura cn-tesoura-topo")}'
            f'<div class="cn-col">{esc_marca(doc=ANTES)}<div class="cn-fio"></div><h2>Carnê de honorários</h2>'
            f'<dl><div><dt>Cliente</dt><dd>{CLI["nome"]} · CPF {CLI["cpf"]}</dd></div><div><dt>Contrato</dt><dd>{CT["numero"]} · {CT["objeto"]}</dd></div>'
            f'{campo_escritorio()}</dl></div>'
            f'<div class="cn-col"><h3>As parcelas deste carnê</h3><table class="cn-tab"><thead><tr><th scope="col">Parcela</th><th scope="col">Referência</th><th scope="col">Vence</th><th scope="col">Valor</th></tr></thead>'
            f'<tbody>{linhas}</tbody><tfoot><tr><td colspan="3">Total deste carnê</td><td>{total}</td></tr></tfoot></table>'
            f'<p style="font-size:6.8pt;color:var(--tinta-2)">Gerado em {HOJE}. As parcelas já pagas não entram. Cada parcela tem o seu Pix; pague uma de cada vez.</p></div>'
            f'<div class="cn-col">{como}<p class="cn-caixa">Depois de pagar, <b>o recibo chega pelo WhatsApp</b> do escritório. Dúvidas? Escreva para <b>{ESC["whats"]}</b>.</p>'
            f'<p style="font-size:6.8pt;color:var(--tinta-2)">Pagando depois do vencimento: multa de {CT["multa"]} e juros de {CT["juros"]}, como no contrato. Fale antes com o escritório.</p></div>'
            f'{TESOURA}</article>')


CN['esc_marca'] = esc_marca
_via = CN['via']


def via(*a, **k):
    v = _via(*a, **k)
    if 'tb-longo' in linha_id():
        v = v.replace('<section class="cn-via"', '<section class="cn-via tb-longo"', 1)
    return v


CN['via'] = via
CN['canhoto'] = canhoto
CN['capa'] = capa


def carne(e, uma=False):
    usar(e)
    return CN['folhas_1'](CN['A_VENCER']) if uma else CN['folhas_3'](CN['A_VENCER'])


# ---------------------------------------------------------------- recibo

def timbre_recibo(e):
    """O alto do recibo: a marca à esquerda; à direita, as 4 linhas do timbrado (a 1ª em destaque) e o WhatsApp."""
    if ANTES:   # Recibo.tsx hoje: nome curto + "Advocacia"; à direita, linhasTimbrado sem a 1ª linha, e o WhatsApp
        x = e['sede']
        lugar = f'{x["rua"]}, {x["num"]}, {x["comp"]}, {x["bairro"]} · {x["cidade"]}/{x["uf"]} · CEP {x["cep"]}'
        doc = ' · '.join(y for y in [f'CNPJ {e["cnpj"]}' if e['cnpj'] else '', e['oab'], lugar] if y)
        cont = ' · '.join(y for y in ([e['tel'], e['email'], e['site']] if (e['tel'] or e['email']) else list(e['contato'] or [])) if y)
        return (f'<header class="rb-timbre"><div class="rb-marca"><span class="rb-esc">{e["curto"]}</span><span class="rb-esc-sub">Advocacia</span></div>'
                f'<p class="rb-ender">{doc}<br>{cont}<br>WhatsApp {e["whats"]}</p></header><div class="rb-fio"></div>')
    l1, l2, l3, l4 = timbrado(e)
    if e['logo']:
        marca = f'<div class="rb-marca"><img class="tb-rb-logo" src="{LOGOS["largo"]["uri"]}" alt="{ALT_LOGO}"></div>'
        nome_marca = ALT_LOGO
    else:
        sub = sub_marca(e)
        marca = f'<div class="rb-marca"><span class="rb-esc">{e["curto"]}</span>{f"<span class=rb-esc-sub>{sub}</span>" if sub else ""}</div>'
        nome_marca = e['curto']
    r1 = '' if mesmo(l1, nome_marca) else f'<span class="tb-r1">{l1}</span>'
    whats = f'<span>WhatsApp {NW(e["whats"])}</span>' if e['whats'] and e['whats'] != e['tel'] else ''
    resto = ''.join(f'<span>{x}</span>' for x in (l2, l3, l4) if x)
    return f'<header class="rb-timbre">{marca}<p class="rb-ender tb-ender">{r1}{resto}{whats}</p></header><div class="rb-fio"></div>'


def ass_recibo(e):
    if ANTES:   # Recibo.tsx hoje: o nome curto e o CNPJ
        doc = f'<span>CNPJ {e["cnpj"]}</span>' if e['cnpj'] else ''
        return f'<b>{e["curto"]}</b>{doc}'
    nome, doc = assinatura(e)
    return f'<b>{nome}</b>' + (f'<span class="tb-ass-doc">{doc}</span>' if doc else '')


def recibo(e, antes=False):
    """A folha do recibo aprovada (recibo_a4.folha, estado padrão), com o timbrado e a assinatura novos."""
    usar(e, antes)
    f = RB['folha']()
    ESC = RB['ESC']
    t0 = f.index('<header class="rb-timbre">')
    t1 = f.index('<div class="rb-fio"></div>') + len('<div class="rb-fio"></div>')
    f = f[:t0] + timbre_recibo(e) + f[t1:]
    a_velho = f'<b>{ESC["razao"]}</b><span>CNPJ {ESC["cnpj"]} · {ESC["oab"]}</span>'
    assert a_velho in f
    f = f.replace(a_velho, ass_recibo(e))
    f = f.replace(f'{ESC["cidade"]}, 18 de novembro', f'{e["sede"]["cidade"]}, 18 de novembro')
    # quem registrou: a sócia dona do escritório do estado (Carol Santana; no Ribeiro & Matos, Marina Ribeiro, como no aprovado)
    f = f.replace(f'<b>{RB["R_"]["quem"]}</b>, {RB["R_"]["quem_oab"]}', f'<b>{e["quem"][0]}</b>, ' + NW(e['quem'][1]))
    if not antes and len(assinatura(e)[0]) > 90:
        f = f.replace('<article class="rb-folha"', '<article class="rb-folha tb-longo"', 1)
    return f


# ---------------------------------------------------------------- páginas

def pagina(arquivo, titulo, desc_meta, cab, nav_rot, estados, css, prefixo):
    nav = ''.join(f'<a href="{arquivo}?estado={e}" data-e="{e}">{n}</a>' for e, n, _, _, _ in estados)
    tpls = ''.join(f'<template data-est="{e}" data-desc="{H(d)}"><main>'
                   f'{"<p class=" + prefixo + "-aviso-tela role=note>" + av + "</p>" if av else ""}{f}</main></template>\n'
                   for e, n, d, f, av in estados)
    return f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titulo}</title>
<meta name="description" content="{desc_meta}">
<style>
{CN['FONTES']}
{css}
{CSS_VAR}
{CSS_RS}
</style>
</head>
<body>
{cab}
<nav class="tb-var" aria-label="{nav_rot}"><span>Variações do desenho:</span>{nav}</nav>
<div id="slot"></div>
{tpls}
<script>
(function(){{
  var q=new URLSearchParams(location.search), e=q.get('estado')||'{estados[0][0]}';
  var t=document.querySelector('template[data-est="'+e+'"]')||document.querySelector('template[data-est="{estados[0][0]}"]');
  document.getElementById('slot').appendChild(t.content.cloneNode(true));
  document.getElementById('desc').textContent=t.dataset.desc;
  document.querySelectorAll('.tb-var a').forEach(function(a){{ if(a.dataset.e===t.dataset.est) a.setAttribute('aria-current','page') }});
}})();
</script>
</body>
</html>
'''


CSS_VAR = r"""
.tb-var{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:8px 24px;background:#4F1D35;color:var(--ambar-3);font-size:12px}
.tb-var a{display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border-radius:22px;color:#fff;text-decoration:none;font-size:13px;font-weight:500;border:1px solid rgba(242,205,179,.45)}
.tb-var a[aria-current]{background:var(--ambar-3);color:var(--vinho);border-color:var(--ambar-3)}
.tb-var a:focus-visible{outline:3px solid var(--ambar-3);outline-offset:2px}
@media print{.tb-var{display:none!important}}
@media screen and (max-width:760px){.tb-var{padding:6px 16px}}
"""

EST_CN = [
    ('completa', 'Sociedade completa', 'Sociedade com razão social, CNPJ, OAB, sede, telefone, e-mail e site', carne(COMPLETA),
     '<b>Sociedade completa.</b> No alto de cada via, a marca (o nome curto em letra) e, de lado a lado, a linha da identificação: '
     '<b>razão social</b> · CNPJ · OAB. Na capa, a marca sozinha e, no campo Escritório, o timbrado: razão social, CNPJ e OAB, a sede com CEP, '
     'o telefone e o e-mail. O canhoto, que fica com o escritório, continua com o nome curto.'),
    ('uma', '1 por folha', 'A mesma sociedade, 1 parcela por folha', carne(COMPLETA, uma=True),
     '<b>1 parcela por folha.</b> A via grande ganha a mesma linha da identificação, em letra maior.'),
    ('sem-sociedade', 'Sem sociedade', 'Advogada sem sociedade: o nome dela e a OAB dela', carne(SEM),
     '<b>Advogada sem sociedade.</b> A marca continua “Carol Santana Advocacia”. Na linha da identificação, o nome completo da sócia dona e '
     '“OAB/BA 63.876-S · sem CNPJ”, como no timbrado aprovado. Sem CPF em lugar nenhum.'),
    ('logo', 'Com logo', 'O logo do escritório no lugar do nome em letra', carne(LOGO),
     '<b>Com logo.</b> O logo entra no lugar do nome em letra, como aprovado (caixa de até 56 × 12 mm). A linha da identificação vem embaixo, igual.'),
    ('razao-vazia', 'Razão social vazia', 'Escritório que ainda não preencheu a razão social', carne(VAZIA),
     '<b>Razão social vazia.</b> O papel vai ao cliente: sai o nome curto, sem marca “[falta]”. Como a 1ª linha seria igual à marca, ela não se repete; '
     'a linha da identificação fica só com o CNPJ (a OAB da sociedade também está vazia). Sem telefone e e-mail do escritório, a capa usa o primeiro contato, como hoje.'),
    ('razao-longa', 'Razão social de 150 letras', 'O maior nome aceito, para conferir que nada passa da faixa', carne(LONGA),
     '<b>Razão social com 150 letras</b>, o máximo aceito em Dados do escritório. Na via, a linha da identificação quebra em três, em letra um pouco menor (acima de 90 letras); '
     'na capa, o nome ocupa cinco linhas. O gerador confere que nenhuma via, canhoto ou coluna da capa passa da faixa.'),
    ('sem-advocacia', 'Nome sem “Advocacia”', 'Nome curto sem “Advocacia”: a linha pequena embaixo da marca', carne(RIBEIRO),
     '<b>Nome curto sem “Advocacia”.</b> “Ribeiro &amp; Matos”, o escritório do carnê aprovado: a marca ganha a linha pequena “ADVOCACIA” '
     '(decisão 4) e, embaixo dela, a linha da identificação. Cabe também com a parcela vencida, sem Pix e 1 por folha.'),
    ('razao-longa-logo', '150 letras e logo', 'O pior caso: o logo e a razão social de 150 letras', carne(LONGA_LOGO),
     '<b>O pior caso</b>: o logo, que é mais alto que o nome em letra, com a razão social de 150 letras. Cabe na via e na capa.'),
]

EST_RB = [
    ('completa', 'Sociedade completa', 'Sociedade com razão social, CNPJ, OAB, sede, telefone, e-mail e site', recibo(COMPLETA),
     '<b>Sociedade completa.</b> À esquerda, a marca: o nome curto, sem o “Advocacia” pequeno, porque o nome já diz. À direita, o timbrado aprovado: '
     'a razão social em destaque, “CNPJ · OAB”, a sede com CEP e “telefone · e-mail · site”; por último o WhatsApp, por onde o recibo chega. '
     'A assinatura passa a ser a razão social, com CNPJ e OAB.'),
    ('sem-sociedade', 'Sem sociedade', 'Advogada sem sociedade', recibo(SEM),
     '<b>Advogada sem sociedade.</b> Na 1ª linha, o nome completo da sócia dona; na 2ª, “OAB/BA 63.876-S · sem CNPJ”. '
     'Assina Carolina Soares Santana, com a OAB dela e sem CPF.'),
    ('logo', 'Com logo', 'O logo do escritório no timbrado', recibo(LOGO),
     '<b>Com logo</b> (caixa de até 92 × 20 mm, como aprovado). O bloco da direita e a assinatura são os mesmos da sociedade completa.'),
    ('razao-vazia', 'Razão social vazia', 'Escritório que ainda não preencheu a razão social', recibo(VAZIA),
     '<b>Razão social vazia.</b> Sem marca “[falta]” no papel do cliente: a 1ª linha seria o nome curto, igual à marca, e não se repete. '
     'Assina o nome curto, com o CNPJ. O contato é o primeiro contato do escritório, como hoje.'),
    ('razao-longa', 'Razão social de 150 letras', 'O maior nome aceito', recibo(LONGA),
     '<b>Razão social com 150 letras.</b> Acima de 90 letras, a 1ª linha do timbrado e a assinatura ficam um pouco menores; a folha continua em uma página.'),
    ('sem-advocacia', 'Nome sem “Advocacia”', 'Nome curto sem “Advocacia”', recibo(RIBEIRO),
     '<b>Nome curto sem “Advocacia”.</b> “Ribeiro &amp; Matos” ganha a linha pequena “ADVOCACIA” embaixo, como no recibo aprovado.'),
    ('razao-longa-logo', '150 letras e logo', 'O pior caso: o logo e a razão social de 150 letras', recibo(LONGA_LOGO),
     '<b>O pior caso</b>: o logo com a razão social de 150 letras. A folha continua em uma página.'),
]

cab_cn = ('<header class="cn-barra"><h1>Prévia do carnê com o timbrado<small>Hélio Batista Corrêa · C-2026-014 · <span id="desc"></span></small></h1>'
          '<button type="button" onclick="window.print()" style="margin-left:auto">Imprimir</button></header>')
open(f'{SAIDA}/carne-a4.html', 'w', encoding='utf-8').write(
    pagina('carne-a4.html', 'Carnê com timbrado', 'Carnê de pagamento com o timbrado aprovado do escritório: a marca, a razão social, CNPJ e OAB na via, e o timbrado inteiro na capa.',
           cab_cn, 'Variações do carnê (só no desenho)', EST_CN, CN['CSS'], 'cn'))

cab_rb = (f'<header class="rb-barra"><h1>Recibo nº 2026-0187<small>Hélio Batista Corrêa · C-2026-014 · <span id="desc"></span></small></h1>'
          f'<div class="rb-acoes"><p class="rb-dica" id="rb-dica">Na janela que abrir, escolha <b>Salvar como PDF</b> para baixar, ou a impressora.</p>'
          f'<button type="button" onclick="window.print()" aria-describedby="rb-dica">{RB["SVG_IMP"]}Baixar PDF ou imprimir</button></div></header>')
open(f'{SAIDA}/recibo-a4.html', 'w', encoding='utf-8').write(
    pagina('recibo-a4.html', 'Recibo com timbrado', 'Recibo de honorários em A4 com o timbrado aprovado do escritório e a assinatura com a razão social.',
           cab_rb, 'Variações do recibo (só no desenho)', EST_RB, RB['CSS'], 'rb'))


# Teste das combinações (não vai para a galeria): cada escritório com a parcela vencida, sem Pix e 1 por folha.
_t = []
for _n, _e in [('completa', COMPLETA), ('sem', SEM), ('logo', LOGO), ('vazia', VAZIA), ('sem-advocacia', RIBEIRO), ('longa', LONGA), ('longa-logo', LONGA_LOGO)]:
    usar(_e)
    _t += [(f'{_n}-vencida', _n, _n, CN['folhas_3'](CN['COM_VENCIDA']), ''), (f'{_n}-sem-pix', _n, _n, CN['folhas_3'](CN['A_VENCER'], modo='texto'), ''),
           (f'{_n}-uma-vencida', _n, _n, CN['folhas_1'](CN['COM_VENCIDA']), '')]
open(os.path.join(AQUI, '_teste-carne.html'), 'w', encoding='utf-8').write(
    pagina('_teste-carne.html', 'Teste do carnê', 'Teste', cab_cn, 'Testes', _t, CN['CSS'], 'cn'))
TESTES = [x[0] for x in _t]


# ---------------------------------------------------------------- antes e depois

def corte_recibo(f, parte):
    if parte == 'alto':
        a = f.index('<header class="rb-timbre">')
        b = f.index('<p class="rb-texto">')
        return f[a:b]
    a = f.index('<div class="rb-fim">')
    b = f.index('<p class="rb-pe">')
    return f[a:b]


def faixa_cn(e, antes):
    usar(e, antes)
    p = CN['A_VENCER'][0]
    return CN['faixa'](p, 'pix', topo=True)


def capa_cn(e, antes):
    usar(e, antes)
    return CN['capa'](CN['A_VENCER'])


def par(titulo, sub, antes, depois, classe):
    return (f'<section class="ad-par" aria-labelledby="t-{classe}"><h2 id="t-{classe}">{titulo}</h2><p class="ad-sub">{sub}</p><div class="ad-lados">'
            f'<figure class="ad-lado" role="group" aria-labelledby="c-{classe}-a"><figcaption id="c-{classe}-a"><span class="ad-selo ad-antes">Antes</span>Como sai hoje</figcaption>'
            f'<div class="ad-papel ad-{classe}">{antes}</div></figure>'
            f'<figure class="ad-lado" role="group" aria-labelledby="c-{classe}-d"><figcaption id="c-{classe}-d"><span class="ad-selo ad-depois">Depois</span>Com o timbrado aprovado</figcaption>'
            f'<div class="ad-papel ad-{classe}">{depois}</div></figure></div></section>')


rb_a, rb_d = recibo(COMPLETA, antes=True), recibo(COMPLETA)
corpo_ad = (par('1. O alto do recibo', 'Hoje a razão social não aparece: o bloco da direita pula a 1ª linha do timbrado, junta a sede com o CNPJ e o nome curto ganha um “Advocacia” repetido.',
                corte_recibo(rb_a, 'alto'), corte_recibo(rb_d, 'alto'), 'rb-alto')
            + par('2. A assinatura do recibo', 'Hoje assina o nome curto, com o CNPJ. Depois, a razão social com CNPJ e OAB.',
                  corte_recibo(rb_a, 'fim'), corte_recibo(rb_d, 'fim'), 'rb-fim')
            + par('3. A via do carnê e o canhoto', 'A marca continua a mesma. Embaixo dela, onde hoje está só “CNPJ · OAB”, entra a linha da identificação: a razão social, o CNPJ e a OAB, num texto corrido. O canhoto, que fica com o escritório, não muda.',
                  faixa_cn(COMPLETA, True), faixa_cn(COMPLETA, False), 'cn-faixa')
            + par('4. A capa do carnê', 'Hoje o campo Escritório tem só o endereço, sem CEP. Depois, o timbrado: razão social, CNPJ e OAB, a sede com CEP, telefone e e-mail.',
                  capa_cn(COMPLETA, True), capa_cn(COMPLETA, False), 'cn-capa'))

CSS_AD = r"""
body{background:#E7DCD5}
.ad-barra{background:var(--vinho);color:#fff;padding:14px 24px}
.ad-barra h1{font-family:var(--serifa);font-weight:500;font-size:24px;line-height:1.2;margin:0}
.ad-barra p{font-size:13px;color:var(--ambar-3);margin:4px 0 0;max-width:110ch;line-height:1.5}
.ad-main{display:grid;gap:32px;padding:24px 24px 48px;max-width:1500px;margin:0 auto}
.ad-par>h2{font-family:var(--serifa);font-weight:600;font-size:22px;color:var(--vinho);margin:0}
.ad-sub{font-size:13px;line-height:1.5;color:var(--tinta-2);margin:4px 0 12px!important;max-width:110ch}
.ad-lados{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}
.ad-lado{margin:0;min-width:0}
.ad-lado figcaption{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:500;margin-bottom:8px}
.ad-selo{display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}
.ad-antes{background:#fff;color:var(--tinta);border:1px solid #6E5562}
.ad-depois{background:var(--vinho);color:#fff}
.ad-papel{background:#fff;box-shadow:0 10px 30px -12px rgba(42,26,34,.35);overflow:hidden}
.ad-rb-alto,.ad-rb-fim{width:174mm;padding:10mm 0 6mm;box-sizing:content-box;padding-left:6mm;padding-right:6mm;zoom:.85}
.ad-rb-fim .rb-fim{margin-top:0;padding-top:12mm}
.ad-cn-faixa,.ad-cn-capa{width:190mm;padding:2mm 5mm;box-sizing:content-box;zoom:.85}
@media screen and (max-width:1300px){.ad-lados{grid-template-columns:1fr}}
@media screen and (max-width:760px){
  .ad-barra{padding:12px 16px}.ad-main{padding:16px 16px 40px}
  .ad-rb-alto,.ad-rb-fim{zoom:.42}.ad-cn-faixa,.ad-cn-capa{zoom:.39}
}
"""
ad = f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Timbrado: antes e depois</title>
<meta name="description" content="O alto e a assinatura do recibo e a via, o canhoto e a capa do carnê, como saem hoje e com o timbrado aprovado.">
<style>
{CN['FONTES']}
{CN['CSS']}
{RB['CSS']}
{CSS_RS}
{CSS_AD}
</style>
</head>
<body>
<header class="ad-barra"><h1>Timbrado no carnê e no recibo: antes e depois</h1>
<p>Santana Advocacia, sociedade completa. À esquerda, como o T3jus gera hoje; à direita, com o timbrado aprovado em Dados do escritório. Recortes das folhas A4, em tamanho reduzido.</p></header>
<main class="ad-main">{corpo_ad}</main>
</body>
</html>
'''
open(f'{SAIDA}/antes-depois.html', 'w', encoding='utf-8').write(ad)
import json
json.dump(TESTES, open(os.path.join(AQUI, '_testes.json'), 'w'))
print('carne-a4', len(EST_CN), '· recibo-a4', len(EST_RB), '· antes-depois ok')
