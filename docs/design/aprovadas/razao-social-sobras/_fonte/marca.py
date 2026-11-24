# D1 · Escritório › Recebimento › Marca e timbrado: a prévia do carnê com a linha da identificação embaixo da
# marca e a prévia do recibo com as 4 linhas. Base: a página aprovada escritorio-dados-documentos/marca.html
# (a moldura, os outros cartões do Recebimento e o "só para ler"). A folha "Marca e timbrado" é montada como o
# MarcaTimbrado.tsx de hoje (origin/main), com o CSS real do portal.css; muda só o que está nas funções mini_*.
# Uso: python3 marca.py <pasta-saida>
import sys, re
from rz_dados import *
from paginas import linha_aviso, ICO, ler, template, com_estados, css, titulo_meta, script_esc, rebatizar

SAIDA = sys.argv[1] if len(sys.argv) > 1 else '..'
s = rebatizar(ler('escritorio-dados-documentos/marca.html'))

KB = {'largo': '89 KB', 'quadrado': '41 KB'}


# ------------------------------------------------------------------ as miniaturas

def topo(e, so_alt=True):
    lg = logo_de(e)
    nome = e['curto']
    if lg == 'largo':
        return f'<span class="lg-m"><img src="{uri("largo")}" alt=""></span>'
    if lg == 'quadrado':
        return f'<span class="lg-m lg-lado"><img src="{uri("quadrado")}" alt=""><span class="lg-letra">{nome}</span></span>'
    return f'<span class="lg-m"><span class="lg-letra">{nome}</span></span>'


def mini_carne(e, sem_nome=False):
    """Depois: a marca, o "Advocacia" pequeno (só no nome em letra que não diz isso) e a linha da identificação.
    sem_nome: sem sociedade, para quem não tem Financeiro nem Contratos (o nome e a OAB da dona não chegam: decisão 10)."""
    sub = sub_marca(e) if not logo_de(e) else ''
    sub = f'<span class="rz-sub">{sub}</span>' if sub else ''
    ident = None if sem_nome else identificacao(e)
    linha = ''
    if ident:
        nome, doc = ident
        linha = f'<p class="lg-doc rz-ident">{f"<b>{nome}</b>" if nome else ""}{" · " if nome and doc else ""}{doc}</p>'
    lg = ' rz-longo' if ident and ident[0] and longa(ident[0]) else ''
    return (f'<div class="lg-papel lg-cn rz-cn{lg}"><div class="lg-cn-top"><div class="rz-marca">{topo(e)}{sub}{linha}</div>'
            f'<p class="lg-num">Via do cliente<b>4 de 6</b></p></div><div class="lg-fio"></div></div>')


def mini_recibo(e):
    destaque, ls = timbre_recibo(e)
    corpo = (f'<b>{destaque}</b>' if destaque else '') + ''.join(f'<span>{x}</span>' for x in ls)
    lg = ' rz-longo' if destaque and longa(destaque) else ''
    sub = sub_marca(e) if not logo_de(e) else ''
    marca = f'<div class="rz-marca">{topo(e)}<span class="rz-sub">{sub}</span></div>' if sub else topo(e)
    return (f'<div class="lg-papel{lg}"><div class="lg-rb rz-rb">{marca}<p class="rz-ender">{corpo}</p></div>'
            f'<div class="lg-fio" style="margin-top:8px"></div></div>')


def hoje_carne(e):
    """Como o código desenha hoje (MiniCarne): "CNPJ · OAB" embaixo, sem a razão social."""
    doc = ' · '.join(x for x in [f'CNPJ {e["cnpj"]}' if e['cnpj'] else '', e['oab']] if x) or ' '
    return (f'<div class="lg-papel lg-cn"><div class="lg-cn-top">{topo(e)}<p class="lg-num">Via do cliente<b>4 de 6</b></p></div>'
            f'<p class="lg-doc">{doc}</p><div class="lg-fio"></div></div>')


def hoje_recibo(e):
    """Como o código desenha hoje (MiniRecibo): o nome curto no lugar da razão social, "CNPJ · OAB" e o endereço antigo."""
    doc = ' · '.join(x for x in [f'CNPJ {e["cnpj"]}' if e['cnpj'] else '', e['oab']] if x)
    local = 'Av. Tancredo Neves, 1.632, sala 1.208 · Salvador, BA'
    return (f'<div class="lg-papel"><div class="lg-rb">{topo(e)}<p><b>{e["curto"]}</b>{"<br>" + doc if doc else ""}<br>{local}</p></div>'
            f'<div class="lg-fio" style="margin-top:8px"></div></div>')


def nome_marca(e):
    lg = logo_de(e)
    return 'o logo e o nome ao lado' if lg == 'quadrado' else 'o logo' if lg else 'o nome em letra'


def previa(e, hoje=False, titulo='Como vai sair'):
    figs = ''
    for doc in ('carnê', 'recibo'):
        for pb in (False, True):
            if hoje:
                mini = hoje_carne(e) if doc == 'carnê' else hoje_recibo(e)
                rot = f'Prévia do alto do {doc}, {"em preto e branco" if pb else "em cores"}, com {nome_marca(e)}'
            else:
                mini = mini_carne(e) if doc == 'carnê' else mini_recibo(e)
                rot = (f'Prévia do alto do {doc}, {"em preto e branco" if pb else "em cores"}, com {nome_marca(e)} '
                       f'e a identificação do escritório: {re.sub(r"<[^>]+>", "", " · ".join(x for x in linhas(e, site=doc == "recibo") if x))}')
            figs += (f'<figure{" class=\"lg-pb\"" if pb else ""}><div role="img" aria-label="{rot}">{mini}</div>'
                     f'<figcaption><b>{"Carnê" if doc == "carnê" else "Recibo"}</b> · {"preto e branco" if pb else "em cores"}</figcaption></figure>')
    return f'<div class="lg-bloco"><h3>{ICO("olho")}{titulo}</h3><div class="lg-prev">{figs}</div></div>'


# ------------------------------------------------------------------ a folha "Marca e timbrado" (MarcaTimbrado.tsx)

def opcao(nome, marcado, rot, peq):
    return (f'<label class="opcao"><input class="marcar" type="radio" name="{nome}"{" checked" if marcado else ""}>'
            f'<span>{rot}<small>{peq}</small></span></label>')


def bloco_logo(e):
    lg = logo_de(e)
    w, h = tam(lg)
    conf = ''.join(f'<li>{ICO("check")}<span><b>{a}</b> {b}<small>{c}</small></span></li>' for a, b, c in [
        ('Formato e peso:', f'PNG, {KB[lg]}.', 'Aceita PNG, JPG ou SVG, até 1 MB.'),
        ('Tamanho:', f'{w} × {h} px depois do corte. Sai nítido no carnê e no recibo.', 'Cortamos a margem vazia em volta (60 px na largura e 54 px na altura). O mínimo é 300 px no lado maior.'),
        ('Contraste com o papel:', 'a parte mais clara tem 9,6:1.', 'O mínimo é 3:1, a mesma régua da WCAG para desenhos.'),
        ('Preto e branco:', 'continua legível.', 'A impressora troca cada cor por um cinza; veja a prévia abaixo.')])
    jeito = ''
    if lg == 'quadrado':
        jeito = ('<fieldset class="x-ops lg-grupo"><legend>Como o logo entra</legend><div class="x-ops-l">'
                 + opcao('lg-j', False, 'Só o logo', 'Na altura do alto do carnê, um logo quadrado fica pequeno e não diz o nome.')
                 + opcao('lg-j', True, 'O logo e o nome ao lado', 'O padrão para logo quadrado. O nome vai em letra, como hoje.')
                 + '</div></fieldset>')
    return (f'<div class="lg-bloco" id="lg-logo"><h3>{ICO("imagem")}O logo</h3>'
            f'<div class="lg-arq"><div class="lg-miniatura"><img src="{uri(lg)}" alt="Logo do escritório {e["curto"]}"></div>'
            f'<div class="lg-arq-info"><strong>logo-santana-{lg}.png</strong><small>{w + 60} × {h + 54} px · {KB[lg]} · salvo em 18/11</small>'
            f'<div class="lg-arq-ac"><input class="sr" type="file" id="lg-trocar" accept=".png,.jpg,.jpeg,.svg" aria-describedby="lg-arq-aj">'
            f'<label class="btn btn-sec" for="lg-trocar">{ICO("trocar")}Trocar o logo</label>'
            f'<button class="btn btn-fantasma" type="button">{ICO("lixo")}Remover o logo</button></div>'
            f'<p class="sr" id="lg-arq-aj">PNG, JPG ou SVG, até 1 MB.</p></div></div>'
            f'<ul class="lg-conf" aria-label="Conferência do logo para impressão">{conf}</ul>{jeito}</div>')


def aviso_marca(e):
    """Com a razão social em branco (decisão 6): a mesma linha das janelas, embaixo da prévia. Só a dona edita esta folha."""
    m = razao_em_branco(e)
    return linha_aviso('O carnê e o recibo', True, m, curto=e['curto'], saem=True) if m else ''


def folha_marca(e, hoje=False):
    lg = logo_de(e)
    oab = e['oab'] or 'Sem registro cadastrado'
    previa_html = previa(e, hoje=hoje)
    return (f'<section class="folha" aria-labelledby="t-rm"><div class="folha-cab"><div><h2 id="t-rm">{ICO("imagem")}Marca e timbrado</h2>'
            '<p class="sub">O carnê e o recibo são do escritório: a marca dele vai no alto. O T3jus aparece só no rodapé, em letra pequena (“Modelo T3jus”). '
            'Carnês e recibos já emitidos ficam como saíram.</p></div></div><div class="cn-form">'
            '<fieldset class="fi-grupo-op"><legend>O que vai no alto do carnê e do recibo</legend>'
            + opcao('lg-m', not lg, 'O nome do escritório em letra', f'{e["curto"]}, em serifa vinho. Sai bem em qualquer impressora.')
            + opcao('lg-m', bool(lg), 'O logo do escritório', 'Envie o arquivo abaixo. O T3jus confere antes de usar.')
            + '</fieldset>' + (bloco_logo(e) if lg else '') + previa_html + ('' if hoje else aviso_marca(e))
            + f'<div class="lg-bloco"><h3>{ICO("balanca")}Registro da sociedade na OAB</h3><p class="lg-oab-ler"><b>{oab}</b>'
            '<span>Vai no alto do carnê e no timbrado do recibo, depois do CNPJ. Fica em Dados do escritório, junto da razão social e do CNPJ, '
            'para ninguém ter duas versões dele. <a href="escritorio.html?estado=escritorio-editar">Mudar em Dados do escritório</a></span></p></div>'
            '</div></section>')


# A folha aprovada "Marca e timbrado" do estado "letra" é trocada pela de cada escritório.
_, _, LETRA = template(s, 'letra')
_a = LETRA.index('<section class="folha" aria-labelledby="t-rm">')
_b = LETRA.index('<div class="form-pe">', _a)
_, _, EQUIPE_T = template(s, 'equipe')


def trocar_nomes(t, e):
    """Os outros cartões do Recebimento acompanham o escritório do estado (o recebedor do Pix e as instruções)."""
    p = e['pix']
    t = t.replace('SANTANA SOC INDIVID ADV', p['recebedor']).replace('Santana Sociedade Individual de Advocacia', e['razao'] or (e['dona'] if e['tipo'] == 'sem' else e['curto']))
    t = re.sub(r'(<span class="contador" aria-hidden="true">)\d+( de 25</span>)', lambda m: f'{m.group(1)}{len(p["recebedor"])}{m.group(2)}', t)
    if e['curto'] != 'Santana Advocacia':
        t = re.sub(r'(?<!Carol )Santana Advocacia(?![^<]*")', e['curto'], t)
    if p['tipo'] == 'CPF':
        t = t.replace('<option selected>CNPJ</option><option>CPF</option>', '<option>CNPJ</option><option selected>CPF</option>')
        t = t.replace('value="47.318.552/0001-06"', f'value="{p["chave_vis"]}"').replace('(CNPJ 47.318.552/0001-06)', f'(CPF {p["chave_vis"]})')
    if 'Ribeiro' in e['curto']:
        t = (t.replace('(71) 99184-5520', e['whats']).replace('SALVADOR', 'SAO PAULO').replace('value="47.318.552/0001-06"', f'value="{e["cnpj"]}"')
              .replace('(CNPJ 47.318.552/0001-06)', f'(CNPJ {e["cnpj"]})').replace('9 de 15', '9 de 15'))
    return t


def estado(nome, e, hoje=False, sobre=''):
    t = LETRA[:_a] + folha_marca(e, hoje=hoje) + LETRA[_b:]
    extra = ''
    if e['curto'] != 'Santana Advocacia':
        extra = f' data-esc="{e["curto"].replace("&amp;", "&")}"' + (' data-quem="socio-rm"' if 'Ribeiro' in e['curto'] else '')
    t = t.replace('data-est="letra"', f'data-est="{nome}"{extra}', 1)
    return trocar_nomes(t, e)


def estado_leitura(nome, e, quem='financeiro', sem_nome=False):
    """MarcaParaLer: quem não é a sócia dona vê a marca em uso, com a miniatura do carnê, e o registro na OAB."""
    t = EQUIPE_T.replace('data-est="equipe" data-quem="financeiro"', f'data-est="{nome}" data-quem="{quem}"'
                         + (f' data-esc="{e["curto"]}"' if e['curto'] != 'Santana Advocacia' else ''), 1)
    a = t.index('<div><dt>Marca no carnê e no recibo</dt>')
    b = t.index('</dd></div>', a) + len('</dd></div>')
    lg = logo_de(e)
    ident = re.sub(r"<[^>]+>", "", " · ".join(x for x in (identificacao(e) or ("", "")) if x))
    rot = f'Prévia do alto do carnê com {nome_marca(e)}' + ('' if sem_nome else f' e a identificação do escritório: {ident}')
    nota = ('<p class="rz-nota">Embaixo da marca, o carnê leva o nome completo e a OAB da advogada. '
            'Essa linha aparece aqui para quem tem Financeiro ou Contratos.</p>') if sem_nome else ''
    novo = (f'<div><dt>Marca no carnê e no recibo</dt><dd><div class="lg-ro-marca">{"O logo do escritório, desde 18/11" if lg else e["curto"] + ", em letra"}'
            f'<div role="img" aria-label="{rot}">{mini_carne(e, sem_nome)}</div>{nota}</div></dd></div>')
    t = t[:a] + novo + t[b:]
    oab = e['oab'] or ('Sem registro: advogada sem sociedade' if e['tipo'] == 'sem' else 'Não informado')
    t = re.sub(r'<div><dt>Registro da sociedade na OAB</dt><dd>[^<]*</dd></div>', f'<div><dt>Registro da sociedade na OAB</dt><dd>{oab}</dd></div>', t)
    return trocar_nomes(t, e)


ESTADOS = [
    estado('hoje', COMPLETA, hoje=True),
    estado('letra', COMPLETA),
    estado('logo', LOGO),
    estado('quadrado', QUADRADO),
    estado('sem-sociedade', SEM),
    estado('razao-vazia', VAZIA),
    estado('sem-advocacia', RIBEIRO),
    estado('razao-longa', LONGA),
    estado('razao-longa-logo', LONGA_LOGO),
    estado_leitura('leitura', LOGO),
    estado_leitura('leitura-letra', COMPLETA),
    estado_leitura('leitura-sem-sociedade', SEM),
    estado_leitura('leitura-sem-sociedade-sem-area', SEM, quem='sem-area', sem_nome=True),
    estado('tipo-vazio', MIGRADO),
]

out = com_estados(s, ESTADOS, 'letra')
out = script_esc(css(out, '.lg-ro-marca .rz-nota{margin:0;font-size:12px;line-height:1.5;color:var(--texto-2);font-weight:400;max-width:360px}'))
out = titulo_meta(out, 'Marca e timbrado · Santana Advocacia · T3jus',
                  'Prévia de Marca e timbrado com a razão social: a linha da identificação no carnê e as 4 linhas no recibo (F3.146, D1).')
open(f'{SAIDA}/marca.html', 'w', encoding='utf-8').write(out)
print('marca ok', len(ESTADOS))
