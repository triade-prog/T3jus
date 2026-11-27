# D41 · estado 14: os PDFs do carnê, da fatura e do recibo com o desconto de entrada só nas parcelas do prazo.
# Lê os geradores aprovados de cobranca-pdfs (cópias em aprovado-pdf/, só com o caminho trocado) até o começo dos
# estados e usa as mesmas peças: timbre, Pix (BR Code de exemplo), boleto do Banco Inter, faixas destacáveis.
# Muda só o que a regra pede: o valor de cada parcela (canhoto, via e capa), a capa com as faixas e o carnê novo
# descrito com as faixas; na fatura e no recibo, os itens da parcela com o desconto, o motivo e a pessoa do dia do carnê.
# Uso: python3 d41_pdf.py <pasta-saida>
import sys, os

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, 'aprovado-pdf'))
sys.path.insert(0, AQUI)
import d41_dados as D  # noqa: E402

SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'


def carregar(arq, corte):
    caminho = os.path.join(AQUI, 'aprovado-pdf', arq)
    src = open(caminho, encoding='utf-8').read()
    g = {'__name__': arq[:-3] + '_aprovado', '__file__': caminho}
    argv = sys.argv
    sys.argv = [arq, '/tmp']
    exec(compile(src[:src.index(corte)], arq, 'exec'), g)
    sys.argv = argv
    return g


CA = carregar('carne_a4.py', '\ndef canhoto(')
FA = carregar('fatura_a4.py', '\nESTADOS = [')
RE = carregar('recibo_a4.py', '\nESTADOS = [')
R, ico, ph, pagina, LOGO, LOGO_C, SIMB, qr_svg, barras_svg, brcode, boleto, PIX = (CA[k] for k in (
    'R', 'ico', 'ph', 'pagina', 'LOGO', 'LOGO_C', 'SIMB', 'qr_svg', 'barras_svg', 'brcode', 'boleto', 'PIX'))
CSS_C, TES, LOGO_C_DEC, ATD = CA['CSS_C'], CA['TES'], CA['LOGO_C_DEC'], CA['ATD']

JATOBA = dict(nome='Jatobá Advocacia', cnpj='45.180.723/0001-58', end='Quadra 104 Norte, Rua NE 5, lote 32, sala 7 · Plano Diretor Norte<br>Palmas, TO · CEP 77006-020',
              email='financeiro@jatoba.exemplo.com.br', copia='Beatriz Nogueira', copia_papel='sócia dona')
E = JATOBA
CSS_D = r"""
.cr-canhoto dd small,.cr-dados dd small.d41-d{display:block;font-weight:400;color:var(--tinta-2);font-size:6.4pt;line-height:1.25}
.cr-valor dd small.d41-d{font-family:var(--sans);font-size:6.6pt;margin-top:.6mm;white-space:normal}
.d41-com{display:inline-flex;align-items:center;gap:.6mm;font-size:5.8pt;font-weight:600;letter-spacing:.06em;text-transform:uppercase;padding:.2mm 1.2mm;border-radius:.8mm;background:var(--ambar-3);color:var(--vinho-escuro);white-space:nowrap}
.cr-tab td.d41-v{white-space:nowrap}
.cr-tab td.d41-v i{font-style:normal;font-size:5.4pt;font-weight:600;color:var(--vinho-escuro);background:var(--ambar-3);border-radius:.6mm;padding:0 .7mm;margin-left:.8mm}
.cr-capa .d41-fx{font-weight:600}
.pb .d41-com,.pb .cr-tab td.d41-v i{background:#fff;border:.2mm solid #000;color:#000}
"""


def codigos(n, p, pref='2026202751', nome='2026/2027'):
    a, m = p['am']
    pix = brcode(p['valor'], f'J{pref[:8]}P{n:02d}', f'Carne {nome} parcela {n}/12')
    linha, barras = boleto(p['valor'], (a, m, int(p['venc'][:2])), f'{pref}{n:02d}')
    return pix, linha, barras


# ---------------------------------------------------------------- carnê
CARNE = dict(numero='2026/2027', gerado='18/11/2026', dia=10, plano='Escritório', ps=D.JAT, trocado_em='27/11/2026', novo=D.JATP, novo_nome='2027')


def desc_linha(p, pdf_curto=False):
    if not p['desc']:
        return '<small class="d41-d">valor cheio do plano</small>' if not pdf_curto else ''
    pct = round(p['desc'] * 100 / p['mens'])
    return f'<small class="d41-d">{R(p["mens"])} − {R(p["desc"])} do desconto de entrada ({pct}%)</small>'


def canhoto(p, sit):
    n = p['n']
    if sit == 'cancelada':
        fim = f'<p class="cr-sit-c canc">{ico("x")}<span>Cancelada em {CARNE["trocado_em"]}. Não pague.</span></p>'
    else:
        fim = '<div class="cr-pago"><span>Pago em <i></i>/<i></i>/<i></i></span><span>Forma <i></i></span></div>'
    com = '<small>com desconto de entrada</small>' if p['desc'] else ''
    return (f'<div class="cr-canhoto"><p class="cr-rot">Canhoto · fica com o escritório</p>{LOGO_C_DEC}'
            f'<p class="cr-parc">Parcela {n} de 12<small>{D.mes(p["am"])}</small></p>'
            f'<dl><div><dt>Escritório</dt><dd>{E["nome"]}</dd></div><div><dt>Vencimento</dt><dd>{p["venc"]}</dd></div>'
            f'<div><dt>Valor</dt><dd>{R(p["valor"])}{com}</dd></div><div><dt>Identificador</dt><dd style="font-family:var(--mono);font-weight:700;font-size:6.8pt">C20262027P{n:02d}</dd></div></dl>'
            f'{fim}</div>')


def via(p, sit):
    n = p['n']
    com = f' <span class="d41-com">{ico("check")}desconto de entrada</span>' if p['desc'] else ''
    dados = (f'<dl class="cr-dados"><div class="cr-largo"><dt>Escritório</dt><dd>{E["nome"]}<small>CNPJ {E["cnpj"]} · plano {CARNE["plano"]}</small></dd></div>'
             f'<div><dt>Referência</dt><dd>{D.mes(p["am"])}</dd></div><div><dt>Vencimento</dt><dd>{p["venc"]}</dd></div>'
             f'<div class="cr-valor cr-largo"><dt>Valor{com}</dt><dd>{R(p["valor"])}{desc_linha(p)}</dd></div></dl>')
    if sit == 'valida':
        pix, linha, barras = codigos(n, p)
        rot = f'QR Code do Pix da parcela {n} de 12, {R(p["valor"])} (exemplo)'
        lado = (f'<div class="cr-pix">{qr_svg(pix, rot)}'
                f'<div class="cr-pix-txt"><div class="cr-cab-cod"><p>Pix · Banco Inter</p><span class="cr-tag">Código de exemplo</span></div>'
                f'<span>Leia o QR no app do banco ou cole o código. Confira <b>{PIX["recebedor"]}</b> e o valor, <b>{R(p["valor"])}</b>.</span>'
                f'<code>{pix}</code></div></div>')
        baixo = (f'<div class="cr-bol"><div class="cr-cab-cod"><p>Boleto</p><span>Banco Inter (077)</span><span class="cr-tag">Exemplo</span></div>'
                 f'<code>{linha}</code>{barras_svg(barras, f"Código de barras do boleto da parcela {n} de 12")}</div>')
        corpo = f'<div class="cr-corpo">{dados}{lado}</div>{baixo}'
        pe = ('Boleto com Pix do Banco Inter: uma cobrança só. Pague pelo Pix <b>ou</b> pelo boleto. Pix fica pago na hora; boleto, em até 1 dia útil. '
              'Uns 20 dias antes, a fatura deste mês chega por e-mail com estes mesmos códigos e o mesmo valor.')
    else:
        nv = CARNE['novo']
        box = (f'<div class="cr-sit canc" role="note">{ico("x")}<div><strong>Cancelada em {CARNE["trocado_em"]}. Não pague esta parcela.</strong>'
               f'O carnê {CARNE["novo_nome"]} ({D.periodo(nv)}: {D.texto_faixas(D.faixas(nv), True)}) vale no lugar das parcelas 2 a 12. Os códigos desta parcela não valem mais.</div></div>')
        corpo = f'<div class="cr-corpo" style="grid-template-columns:minmax(0,1fr) 76mm">{dados}{box}</div>'
        pe = 'O recibo de cada parcela paga chega no e-mail de cobrança e fica no Portal, em Escritório › Plano e faturas.'
    return (f'<section class="cr-via" aria-label="Via do escritório, parcela {n} de 12">'
            f'<header class="cr-cab"><div class="cr-marca">{LOGO_C}<span>Carnê {CARNE["numero"]}<br>assinatura do T3jus</span></div>'
            f'<div class="cr-num"><span class="cr-rot">Parcela</span><b>{n} de 12</b></div></header>'
            f'<div class="cr-fio"></div>{corpo}<p class="cr-pe"><span>{pe}</span><span class="cr-t3">{SIMB}T3jus · Sistema jurídico</span></p></section>')


def faixa(p, sit, topo=False):
    t = TES.replace('cr-tesoura', 'cr-tesoura cr-tesoura-topo') if topo else ''
    return f'<article class="cr-faixa">{t}{canhoto(p, sit)}<div class="cr-corte-v">{TES}</div>{via(p, sit)}{TES}</article>'


def capa(sits, modo):
    ps = CARNE['ps']
    linhas = ''
    for p in ps:
        s = sits[p['n']]
        ic, tx = ('x', 'cancelada') if s == 'cancelada' else ('agenda', 'a vencer')
        marca = '<i>desc.</i>' if p['desc'] else ''
        linhas += (f'<tr class="{"canc" if s == "cancelada" else ""}"><td>{p["n"]} de 12</td><td>{D.curto(p["am"])}</td><td>{p["venc"]}</td><td class="d41-v">{R(p["valor"])}{marca}</td>'
                   f'<td><span class="cr-s">{ico(ic)}{tx}</span></td></tr>')
    fx = D.faixas(ps)
    if modo == 'trocado':
        nv = CARNE['novo']
        aviso = (f'<p class="cr-caixa urg"><b>Carnê trocado em {CARNE["trocado_em"]}.</b> As parcelas 2 a 12 foram canceladas; não pague. '
                 f'O carnê {CARNE["novo_nome"]}, de {D.periodo(nv)}, com <b>{D.texto_faixas(D.faixas(nv), True)}</b>, vale no lugar delas.</p>')
    else:
        aviso = ('<p class="cr-caixa"><b>Cada parcela é a fatura do mês.</b> Uns 20 dias antes do vencimento, ela chega por e-mail '
                 'com os mesmos códigos e o mesmo valor desta página. Pode pagar adiantado.</p>')
    como = ('<h3>Como pagar</h3><ol class="cr-passos"><li><span>Uma parcela por mês, pelo Pix ou pelo boleto do Banco Inter da página dela. Uma vez só.</span></li>'
            f'<li><span>Antes de confirmar, veja se aparecem <b>{PIX["recebedor"]}</b> e o valor da parcela: ele muda depois do desconto de entrada.</span></li>'
            f'<li><span>O recibo chega em {E["email"]} e fica no Portal.</span></li></ol>')
    d0 = fx[0]
    desc_txt = (f'<small style="display:block;font-weight:400;color:var(--tinta-2);font-size:6.4pt;margin-top:.4mm">parcelas 1 a {d0["q"]} com o desconto de entrada de 20%; '
                f'da {d0["q"] + 1} em diante, o valor do plano</small>')
    total = D.total(ps)
    return (f'<article class="cr-faixa cr-capa">{TES.replace("cr-tesoura", "cr-tesoura cr-tesoura-topo")}'
            f'<div class="cr-col">{LOGO}<div class="cr-fio" style="margin-top:1mm"></div><h2>Carnê da assinatura {CARNE["numero"]}</h2>'
            f'<dl><div><dt>Escritório</dt><dd>{E["nome"]}<br>CNPJ {E["cnpj"]}</dd></div>'
            f'<div><dt>Plano e dia</dt><dd>{CARNE["plano"]} · todo dia {CARNE["dia"]}</dd></div>'
            f'<div><dt>Período</dt><dd>{D.periodo(ps)}</dd></div>'
            f'<div><dt>Valor</dt><dd><span class="d41-fx">{D.texto_faixas(fx, True)}</span> <span class="dp-exemplo">Valores de exemplo</span>{desc_txt}</dd></div></dl>'
            f'<p style="font-size:6.6pt;color:var(--tinta-2)">Gerado em {CARNE["gerado"]} pelo T3jus · {ph("razão social do T3jus")}</p></div>'
            f'<div class="cr-col"><h3>As 12 parcelas</h3><table class="cr-tab"><thead><tr><th scope="col">Parcela</th><th scope="col">Mês</th><th scope="col">Vence</th><th scope="col">Valor</th><th scope="col">Situação</th></tr></thead>'
            f'<tbody>{linhas}</tbody><tfoot><tr><td colspan="3">Total do carnê</td><td>{R(total)}</td><td></td></tr></tfoot></table></div>'
            f'<div class="cr-col">{como}{aviso}<p style="font-size:6.8pt;color:var(--tinta-2)">Dúvidas: {ATD}</p></div>'
            f'{TES}</article>')


def folhas(modo='padrao'):
    sits = {p['n']: ('cancelada' if (modo == 'trocado' and p['n'] >= 2) else 'valida') for p in CARNE['ps']}
    itens = [('capa', None)] + [('p', p) for p in CARNE['ps']]
    fl = []
    for i in range(0, len(itens), 3):
        corpo = ''
        for k, (tipo, p) in enumerate(itens[i:i + 3]):
            corpo += capa(sits, modo) if tipo == 'capa' else faixa(p, sits[p['n']], topo=(k == 0))
        fl.append(corpo)
    return ''.join(f'<div class="dp-folha cr-folha" role="region" aria-label="Folha {j} de {len(fl)}">{c}</div>' for j, c in enumerate(fl, 1))


EST_C = [
    ('carne-desconto', 'Com desconto de entrada', f'Jatobá, carnê 2026/2027: {D.texto_faixas(D.faixas(D.JAT), True)}', folhas(),
     '<b>Desconto de entrada só nas 3 primeiras parcelas.</b> A capa diz as duas faixas e o total; cada parcela tem o próprio valor no canhoto, na via, no Pix e no boleto. '
     'As parcelas com desconto mostram a conta (R$ 499,00 − R$ 99,80) e a marca “desconto de entrada”, com texto, que sai também em preto e branco.'),
    ('carne-trocado-desconto', 'Trocado', 'O mesmo carnê baixado depois da troca de 27/11: a 1 vale, 2 a 12 canceladas', folhas('trocado'),
     '<b>Carnê trocado.</b> Com 7 pessoas, saiu o carnê 2027. A parcela 1 já tinha fatura e continua valendo. As 2 a 12 ficam no PDF como canceladas, '
     'com “não pague”, sem códigos, e o carnê que vale no lugar vem descrito com as faixas: 2 × R$ 468,20 e 10 × R$ 568,00.'),
]
open(os.path.join(SAIDA, 'carne-a4.html'), 'w', encoding='utf-8').write(pagina(
    'carne-a4.html', 'Carnê com desconto de entrada',
    'Modelo A4 do carnê de 12 parcelas da assinatura do T3jus, com o desconto de entrada só nas parcelas do prazo.',
    'Prévia do carnê', 'Jatobá Advocacia · carnê 2026/2027 · 12 parcelas', EST_C, css_extra=CSS_C + CSS_D))

# ---------------------------------------------------------------- fatura da parcela
FATS = FA['FATURAS']
FATS['jatoba'] = dict(esc=JATOBA, numero='2026/0203', comp='dezembro de 2026', comp_curta='dezembro/2026', plano='Escritório', emitida='18/11/2026',
                      venc='10/12/2026', venc_iso=(2026, 12, 10), forma='Carnê · parcela 1 de 12', parcela=1,
                      itens=[('Mensalidade do plano Escritório', 'Parcela 1 de 12 do carnê 2026/2027 · plano Escritório · dezembro de 2026 · 6 pessoas no dia do carnê; o plano inclui 6', 49900, None),
                             ('Desconto de entrada (20% da mensalidade)', '1ª de 3 faturas, até fevereiro de 2027', -9980, D.MOT_NOVO)])
FATS['jatoba-jan'] = dict(esc=JATOBA, numero='2026/0241', comp='janeiro de 2027', comp_curta='janeiro/2027', plano='Escritório', emitida='21/12/2026',
                          venc='10/01/2027', venc_iso=(2027, 1, 10), forma='Carnê · parcela 1 de 12', parcela=1,
                          itens=[('Mensalidade do plano Escritório', 'Parcela 1 de 12 do carnê 2027 · plano Escritório · janeiro de 2027', 49900, None),
                                 ('Pessoa a mais', '1 pessoa a mais (7 ativas em 27/11/2026, no dia do carnê; 6 incluídas) · 1 × R$ 69,00', 6900, None),
                                 ('Desconto de entrada (20% da mensalidade)', '2ª de 3 faturas, até fevereiro de 2027 · sobre a mensalidade, nunca sobre a pessoa a mais', -9980, D.MOT_NOVO)])
assert sum(i[2] for i in FATS['jatoba']['itens']) == D.JAT[0]['valor'] and sum(i[2] for i in FATS['jatoba-jan']['itens']) == D.JATP[0]['valor']
_cod_ap = FA['codigos_fatura']


def codigos_fatura(chave):
    if chave == 'jatoba':
        return codigos(1, D.JAT[0])
    if chave == 'jatoba-jan':
        return codigos(1, D.JATP[0], '2027202752', '2027')
    return _cod_ap(chave)


FA['codigos_fatura'] = codigos_fatura
assert codigos_fatura('jatoba')[0] == codigos(1, D.JAT[0])[0]  # o mesmo Pix da parcela 1 no carnê


def fat(chave, carne_nome, desde, extra):
    h = FA['folha'](chave)
    velho = f'<b>Parcela 1 de 12 do carnê 2026/2027.</b> O Pix e o boleto abaixo são os mesmos da parcela 1 do carnê que o escritório recebeu em 15/09/2026.'
    assert velho in h
    return h.replace(velho, f'<b>Parcela 1 de 12 do carnê {carne_nome}.</b> O Pix, o boleto e os itens abaixo são os mesmos da parcela 1 do carnê que o escritório recebeu em {desde}. {extra}')


EST_F = [
    ('fatura-carne-desconto', 'Parcela com desconto', 'Jatobá, dezembro: parcela 1 de 12, com o desconto de entrada',
     fat('jatoba', '2026/2027', '18/11/2026', 'As parcelas 1 a 3 têm o desconto de entrada.'),
     '<b>Fatura da parcela com desconto.</b> Os itens são os da parcela: a mensalidade, com o número da parcela e o carnê, e o “Desconto de entrada (20% da mensalidade)”, '
     'com o motivo entre aspas, que o escritório lê. O motivo fica gravado no item: tirar o desconto depois não apaga o motivo desta fatura.'),
    ('fatura-carne-desconto-pessoa', 'Com pessoa a mais', 'Jatobá, janeiro de 2027: parcela 1 do carnê 2027, com a pessoa a mais do dia do carnê',
     fat('jatoba-jan', '2027', '27/11/2026', 'As parcelas 1 e 2 têm o desconto de entrada.'),
     '<b>Com a pessoa a mais.</b> Como sai em 21/12/2026. A pessoa a mais é a do dia em que o carnê nasceu (27/11/2026), e a linha diz isso. O desconto é só sobre a mensalidade.'),
]
open(os.path.join(SAIDA, 'fatura-a4.html'), 'w', encoding='utf-8').write(pagina(
    'fatura-a4.html', 'Fatura com desconto de entrada', 'Modelo A4 da fatura de uma parcela do carnê, com o desconto de entrada e o motivo.',
    'Prévia da fatura', 'Fatura da parcela do carnê', EST_F, css_extra=CSS_D))

# ---------------------------------------------------------------- recibo da parcela
RIB = RE['RIBEIRO']
RE['RECIBOS']['rib-carne'] = dict(esc=RIB, numero='2026/0198', fatura='2026/0198', comp='dezembro de 2026', venc='10/12/2026', plano='Escritório', pago='25/11/2026',
                                  forma='Pix', forma_det='Pix da parcela 1 do carnê, Banco Inter; baixa automática', valor=34930, parcela=1,
                                  itens=[('Mensalidade do plano Escritório', 'Parcela 1 de 12 do carnê 2026/2027 · dezembro de 2026', 49900),
                                         ('Desconto de entrada (30% da mensalidade)', '1ª de 3 faturas, até fevereiro de 2027', -14970)])
assert sum(i[2] for i in RE['RECIBOS']['rib-carne']['itens']) == D.RIB[0]['valor']
_rec = RE['folha']('rib-carne')
_k = '<small>1ª de 3 faturas, até fevereiro de 2027</small>'
assert _k in _rec
_rec = _rec.replace(_k, _k + f'<q>{D.MOT_OUTRO}</q>')
EST_R = [('recibo-carne-desconto', 'Parcela com desconto', 'Ribeiro & Matos, parcela 1 de 12, paga por Pix em 25/11', _rec,
          '<b>Recibo da parcela com desconto.</b> A discriminação repete os itens da fatura: a mensalidade e o “Desconto de entrada (30% da mensalidade)”, com o motivo. '
          'O valor por extenso é o que foi pago, R$ 349,30.')]
open(os.path.join(SAIDA, 'recibo-a4.html'), 'w', encoding='utf-8').write(pagina(
    'recibo-a4.html', 'Recibo com desconto de entrada', 'Modelo A4 do recibo de uma parcela do carnê paga com o desconto de entrada.',
    'Prévia do recibo', 'Recibo da parcela do carnê', EST_R, css_extra=RE['CSS_R'] + CSS_D))
print('pdf ok', len(EST_C) + len(EST_F) + len(EST_R), 'estados')
