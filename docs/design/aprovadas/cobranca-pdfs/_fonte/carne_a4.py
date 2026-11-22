# Carnê de 12 parcelas da assinatura do T3jus (CO-06, F1.21): o modelo A4.
# Segue o carnê A4 aprovado do Portal (portal-carne): 3 faixas destacáveis por folha, canhoto à esquerda e via à direita,
# a capa na primeira faixa. Aqui quem recebe é o T3jus e cada parcela tem o próprio Pix E o próprio boleto.
# Estados por ?estado= (padrao, hoje, trocado, sem-codigos, pb). Peças com prefixo cr-.
# Uso: python3 carne_a4.py <pasta-saida>
import sys
from cob_dados import *
from pecas_pdf import *
CURTO = ['out/2026', 'nov/2026', 'dez/2026', 'jan/2027', 'fev/2027', 'mar/2027', 'abr/2027', 'mai/2027', 'jun/2027', 'jul/2027', 'ago/2027', 'set/2027']

SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
ATD = ph('atendimento@exemplo.com.br')
C = CARNE
E = C['esc']
TES = ico('tesoura', 'cr-tesoura')
LOGO_C_DEC = LOGO_C.replace('role="img" aria-label="T3jus"', 'aria-hidden="true" focusable="false"')

CSS_C = r"""
.cr-folha{padding:10mm}
.cr-faixa{position:relative;height:calc(277mm / 3);flex:none;display:grid;grid-template-columns:45mm 8mm minmax(0,1fr);padding:3.6mm 0 3.2mm;border-bottom:.3mm dashed #6E5562}
.cr-faixa:first-child{border-top:.3mm dashed #6E5562}
.cr-corte-v{position:relative}
.cr-corte-v::before{content:"";position:absolute;left:50%;top:-3.6mm;bottom:-3.2mm;border-left:.3mm dashed #6E5562}
.cr-tesoura{width:4.2mm;height:4.2mm;fill:none;stroke:#2A1A22;stroke-width:1.6;stroke-linecap:round;background:#fff}
.cr-faixa>.cr-tesoura{position:absolute;left:3mm;bottom:-2.3mm;padding:0 .6mm}
.cr-faixa>.cr-tesoura-topo{position:absolute;left:3mm;top:-2.3mm;bottom:auto;padding:0 .6mm}
.cr-corte-v .cr-tesoura{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(90deg);padding:.6mm 0}

/* canhoto */
.cr-canhoto{display:flex;flex-direction:column;gap:1.5mm;font-size:7.4pt;line-height:1.3;padding-right:1mm;min-width:0}
.cr-rot{font-size:6pt;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--tinta-2)}
.cr-canhoto .dp-logo-c{width:17mm;height:auto;display:block}
.cr-canhoto .cr-parc{font-family:var(--serifa);font-size:13pt;font-weight:600;line-height:1;color:var(--tinta)}
.cr-canhoto .cr-parc small{display:block;font-family:var(--sans);font-size:7pt;font-weight:400;color:var(--tinta-2);margin-top:.8mm}
.cr-canhoto dl{display:grid;gap:1mm}
.cr-canhoto dt{font-size:6pt;color:var(--tinta-2);text-transform:uppercase;letter-spacing:.08em}
.cr-canhoto dd{font-weight:500;overflow-wrap:anywhere}
.cr-pago{margin-top:auto;display:grid;gap:2.4mm;padding-top:1.8mm;border-top:.25mm solid var(--vinho)}
.cr-pago span{display:flex;align-items:flex-end;gap:1.5mm;font-size:6.8pt;color:var(--tinta-2);white-space:nowrap}
.cr-pago span i{flex:1;border-bottom:.25mm solid var(--tinta);height:3.2mm}
.cr-sit-c{margin-top:auto;display:flex;gap:1.4mm;align-items:flex-start;padding:1.6mm 2mm;border-radius:1mm;font-size:7pt;font-weight:600;line-height:1.3}
.cr-sit-c .dp-i{width:3.4mm;height:3.4mm}
.cr-sit-c.paga{background:var(--vinho);color:#fff}
.cr-sit-c.canc{border:.3mm solid var(--tinta);background:var(--sal-2)}

/* via do escritório */
.cr-via{display:flex;flex-direction:column;gap:1.8mm;font-size:7.8pt;line-height:1.32;min-width:0}
.cr-cab{display:flex;align-items:flex-end;justify-content:space-between;gap:4mm}
.cr-marca{display:flex;align-items:flex-end;gap:2.6mm}
.cr-marca .dp-logo-c{width:21mm;height:auto;display:block}
.cr-marca span{font-size:6.6pt;color:var(--tinta-2);line-height:1.3;padding-bottom:.4mm}
.cr-num{text-align:right;display:grid;justify-items:end;gap:.5mm}
.cr-num b{font-family:var(--serifa);font-size:17pt;font-weight:600;line-height:1;color:var(--tinta)}
.cr-fio{position:relative;height:.35mm;background:var(--vinho)}
.cr-fio::before{content:"";position:absolute;left:0;top:-.45mm;width:14mm;height:1.25mm;background:var(--ambar)}
.cr-corpo{display:grid;grid-template-columns:minmax(0,1fr) 84mm;gap:3.6mm;align-items:start}
.cr-dados{display:grid;grid-template-columns:1fr 1fr;gap:1.6mm 3mm}
.cr-dados div{min-width:0}
.cr-dados .cr-largo{grid-column:1/-1}
.cr-dados dt{font-size:6pt;color:var(--tinta-2);text-transform:uppercase;letter-spacing:.1em}
.cr-dados dd{font-weight:500;font-size:8pt}
.cr-dados dd small{font-weight:400;color:var(--tinta-2);font-size:6.8pt;display:block}
.cr-valor dd{white-space:nowrap;font-family:var(--serifa);font-size:17pt;font-weight:600;line-height:1.05;color:var(--tinta)}
.cr-pix{display:grid;grid-template-columns:24mm minmax(0,1fr);gap:2.4mm;align-items:start;padding:1.8mm;border:.25mm solid var(--linha);border-radius:1.4mm}
.cr-pix .qr{width:24mm;height:24mm}
.cr-pix-txt{display:grid;gap:.8mm;font-size:6.6pt;line-height:1.3;min-width:0}
.cr-cab-cod{display:flex;align-items:center;justify-content:space-between;gap:2mm}
.cr-cab-cod p{font-family:var(--serifa);font-size:10pt;font-weight:600;color:var(--vinho);line-height:1.05}
.cr-pix-txt code{font-family:var(--mono);font-size:5.5pt;line-height:1.3;word-break:break-all;color:var(--tinta)}
.cr-bol{display:grid;grid-template-columns:auto minmax(0,1fr);gap:.4mm 3mm;align-items:center;padding:1.6mm 1.8mm;border:.25mm solid var(--linha);border-radius:1.4mm}
.cr-bol .cr-cab-cod{grid-row:1/3;flex-direction:column;align-items:flex-start;gap:.8mm}
.cr-bol .cr-cab-cod>span:not(.cr-tag){font-size:6.5pt;color:var(--tinta-2)}
.cr-bol code{font-family:var(--mono);font-size:8.2pt;font-weight:700;white-space:nowrap;color:var(--tinta)}
.cr-bol .barras{width:103mm;height:9.5mm;margin:0}
.cr-tag{font-size:5.4pt;font-weight:600;letter-spacing:.08em;text-transform:uppercase;border:.25mm dashed var(--tinta-2);border-radius:.8mm;padding:.1mm 1mm;white-space:nowrap}
.cr-pe{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;gap:4mm;padding-top:1.4mm;border-top:.2mm solid var(--linha);font-size:6.4pt;line-height:1.35;color:var(--tinta-2)}
.cr-pe b{color:var(--tinta);font-weight:600}
.cr-t3{display:inline-flex;align-items:center;gap:.8mm;white-space:nowrap;font-size:5.8pt;letter-spacing:.06em}
.cr-t3 .dp-simb{width:2.6mm;height:2.7mm}
.cr-sit{display:flex;gap:3mm;align-items:flex-start;padding:3mm 3.4mm;border-radius:1.4mm;font-size:8.2pt;line-height:1.45}
.cr-sit .dp-i{width:5.4mm;height:5.4mm;flex:none}
.cr-sit strong{display:block;font-family:var(--serifa);font-size:12pt;font-weight:600;line-height:1.15;margin-bottom:.6mm}
.cr-sit.paga{border:.35mm solid var(--vinho);color:var(--tinta)}
.cr-sit.paga .dp-i,.cr-sit.paga strong{color:var(--vinho)}
.cr-sit.canc{border:.35mm solid var(--tinta);background:var(--sal-2)}
.cr-sit.sem{border:.3mm dashed var(--vinho-2)}
.cr-sit.sem .dp-i{color:var(--vinho)}

/* capa */
.cr-capa{grid-template-columns:54mm minmax(0,1fr) 54mm;gap:0 5mm}
.cr-col{display:flex;flex-direction:column;gap:2mm;min-width:0;font-size:7.4pt;line-height:1.38}
.cr-capa .dp-logo{width:38mm}
.cr-capa h2{font-family:var(--serifa);font-size:18pt;font-weight:600;line-height:1.02;color:var(--tinta);margin-top:1mm}
.cr-capa dl{display:grid;gap:1.1mm}
.cr-capa dt{font-size:6pt;color:var(--tinta-2);text-transform:uppercase;letter-spacing:.1em}
.cr-capa dd{font-weight:500}
.cr-capa h3{font-family:var(--serifa);font-size:10.5pt;font-weight:600;color:var(--vinho);line-height:1.1}
.cr-tab{width:100%;border-collapse:collapse;font-size:6.9pt}
.cr-tab th{font-size:5.8pt;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--tinta-2);text-align:left;padding:0 1.6mm .8mm 0;border-bottom:.3mm solid var(--vinho)}
.cr-tab td{padding:.55mm 1.6mm .55mm 0;border-bottom:.2mm solid var(--linha-2);vertical-align:top;white-space:nowrap}
.cr-tab td:last-child,.cr-tab th:last-child{text-align:right;padding-right:0}
.cr-tab tfoot td{border-bottom:0;padding-top:1.2mm;font-weight:600}
.cr-tab .cr-s{display:inline-flex;align-items:center;gap:.6mm;font-size:6pt;font-weight:600}
.cr-tab .cr-s .dp-i{width:2.6mm;height:2.6mm}
.cr-tab tr.canc td:not(:last-child){color:var(--tinta-2)}
.cr-tab tr.canc td:nth-child(4){text-decoration:line-through}
.cr-passos{list-style:none;counter-reset:p;display:grid;gap:1.2mm}
.cr-passos li{counter-increment:p;display:grid;grid-template-columns:4.2mm minmax(0,1fr);gap:1.6mm}
.cr-passos li::before{content:counter(p);display:grid;place-items:center;width:4.2mm;height:4.2mm;border-radius:50%;border:.3mm solid var(--vinho);color:var(--vinho);font-size:6.2pt;font-weight:600}
.cr-caixa{padding:1.8mm 2.2mm;border-radius:1.4mm;background:var(--sal-2);border-left:.8mm solid var(--ambar)}
.cr-caixa.urg{background:#fff;border:.3mm solid var(--vinho-3);border-left-width:1mm}
.cr-caixa b{font-weight:600}
"""


def canhoto(p, sit):
    n = p['n']
    if sit == 'paga':
        d, f = PAGAS_HOJE[n]
        fim = f'<p class="cr-sit-c paga">{ico("check")}<span>Paga em {d}, {f}</span></p>'
    elif sit == 'cancelada':
        fim = f'<p class="cr-sit-c canc">{ico("x")}<span>Cancelada em {C["trocado_em"]}. Não pague.</span></p>'
    else:
        fim = '<div class="cr-pago"><span>Pago em <i></i>/<i></i>/<i></i></span><span>Forma <i></i></span></div>'
    return (f'<div class="cr-canhoto"><p class="cr-rot">Canhoto · fica com o escritório</p>{LOGO_C_DEC}'
            f'<p class="cr-parc">Parcela {n} de 12<small>{p["ref"]}</small></p>'
            f'<dl><div><dt>Escritório</dt><dd>{E["nome"]}</dd></div><div><dt>Vencimento</dt><dd>{p["venc"]}</dd></div>'
            f'<div><dt>Valor</dt><dd>{R(C["valor"])}</dd></div><div><dt>Identificador</dt><dd style="font-family:var(--mono);font-weight:700;font-size:6.8pt">C20262027P{n:02d}</dd></div></dl>'
            f'{fim}</div>')


def via(p, sit):
    n = p['n']
    dados = (f'<dl class="cr-dados"><div class="cr-largo"><dt>Escritório</dt><dd>{E["nome"]}<small>CNPJ {E["cnpj"]} · plano {C["plano"]}</small></dd></div>'
             f'<div><dt>Referência</dt><dd>{p["ref"]}</dd></div><div><dt>Vencimento</dt><dd>{p["venc"]}</dd></div>'
             f'<div class="cr-valor cr-largo"><dt>Valor</dt><dd>{R(C["valor"])}</dd></div></dl>')
    if sit == 'valida':
        pix, linha, barras = codigos_parcela(n)
        rot = f'QR Code do Pix da parcela {n} de 12, {R(C["valor"])} (exemplo)'
        lado = (f'<div class="cr-pix">{qr_svg(pix, rot)}'
                f'<div class="cr-pix-txt"><div class="cr-cab-cod"><p>Pix · Banco Inter</p><span class="cr-tag">Código de exemplo</span></div>'
                f'<span>Leia o QR no app do banco ou cole o código. Confira <b>{PIX["recebedor"]}</b> e o valor.</span>'
                f'<code>{pix}</code></div></div>')
        baixo = (f'<div class="cr-bol"><div class="cr-cab-cod"><p>Boleto</p><span>Banco Inter (077)</span><span class="cr-tag">Exemplo</span></div>'
                 f'<code>{linha}</code>{barras_svg(barras, f"Código de barras do boleto da parcela {n} de 12")}</div>')
        corpo = f'<div class="cr-corpo">{dados}{lado}</div>{baixo}'
        pe = (f'Boleto com Pix do Banco Inter: uma cobrança só. Pague pelo Pix <b>ou</b> pelo boleto. Pix fica pago na hora; boleto, em até 1 dia útil. '
              f'Uns 20 dias antes, a fatura deste mês chega por e-mail com estes mesmos códigos.')
    else:
        if sit == 'paga':
            d, f = PAGAS_HOJE[n]
            box = (f'<div class="cr-sit paga" role="note">{ico("check")}<div><strong>Paga em {d}, por {f}</strong>'
                   f'Esta parcela já está paga. Os códigos dela não valem mais e não aparecem aqui, para ninguém pagar de novo. O recibo foi para o e-mail de cobrança.</div></div>')
        elif sit == 'cancelada':
            box = (f'<div class="cr-sit canc" role="note">{ico("x")}<div><strong>Cancelada em {C["trocado_em"]}. Não pague esta parcela.</strong>'
                   f'O carnê {C["novo"]} ({C["novo_periodo"]}, {R(C["novo_valor"])} por mês) vale no lugar das parcelas 4 a 12. Os códigos desta parcela não valem mais.</div></div>')
        else:
            box = (f'<div class="cr-sit sem" role="note">{ico("relogio")}<div><strong>Os códigos desta parcela ainda não saem no carnê.</strong>'
                   f'Uns 20 dias antes do vencimento, a fatura de {p["ref"]} chega por e-mail. Para pagar, escreva para {ATD} '
                   f'com o identificador <b>C20262027P{n:02d}</b> e mande o comprovante.</div></div>')
        corpo = f'<div class="cr-corpo" style="grid-template-columns:minmax(0,1fr) 76mm">{dados}{box}</div>'
        pe = 'O recibo de cada parcela paga chega no e-mail de cobrança e fica no Portal, em Escritório › Plano e faturas.'
    return (f'<section class="cr-via" aria-label="Via do escritório, parcela {n} de 12">'
            f'<header class="cr-cab"><div class="cr-marca">{LOGO_C}<span>Carnê {C["numero"]}<br>assinatura do T3jus</span></div>'
            f'<div class="cr-num"><span class="cr-rot">Parcela</span><b>{n} de 12</b></div></header>'
            f'<div class="cr-fio"></div>{corpo}<p class="cr-pe"><span>{pe}</span><span class="cr-t3">{SIMB}T3jus · Sistema jurídico</span></p></section>')


def faixa(p, sit, topo=False):
    t = TES.replace('cr-tesoura', 'cr-tesoura cr-tesoura-topo') if topo else ''
    return f'<article class="cr-faixa">{t}{canhoto(p, sit)}<div class="cr-corte-v">{TES}</div>{via(p, sit)}{TES}</article>'


SIT_TXT = {'valida': ('agenda', 'a vencer'), 'paga': ('check', 'paga'), 'cancelada': ('x', 'cancelada'), 'sem': ('agenda', 'a vencer')}


def capa(sits, modo):
    linhas = ''
    for p in PARCELAS:
        s = sits[p['n']]
        ic, tx = SIT_TXT[s]
        extra = f' em {PAGAS_HOJE[p["n"]][0][:5]}' if s == 'paga' else ''
        linhas += (f'<tr class="{"canc" if s == "cancelada" else ""}"><td>{p["n"]} de 12</td><td>{CURTO[p["n"] - 1]}</td><td>{p["venc"]}</td><td>{R(C["valor"])}</td>'
                   f'<td><span class="cr-s">{ico(ic)}{tx}{extra}</span></td></tr>')
    if modo == 'trocado':
        aviso = (f'<p class="cr-caixa urg"><b>Carnê trocado em {C["trocado_em"]}.</b> As parcelas 4 a 12 foram canceladas; não pague. '
                 f'O carnê {C["novo"]}, de {R(C["novo_valor"])} por mês, vale no lugar delas.</p>')
    elif modo == 'sem':
        aviso = (f'<p class="cr-caixa"><b>Os códigos ainda não saem no carnê.</b> Por enquanto, cada fatura do mês chega por e-mail '
                 f'e o pagamento é combinado com o T3jus: {ATD}.</p>')
    else:
        aviso = ('<p class="cr-caixa"><b>Cada parcela é a fatura do mês.</b> Uns 20 dias antes do vencimento, ela chega por e-mail '
                 'com os mesmos códigos desta página. Pode pagar adiantado.</p>')
    como = ('<h3>Como pagar</h3><ol class="cr-passos"><li><span>Uma parcela por mês, pelo Pix ou pelo boleto do Banco Inter da página dela. Uma vez só.</span></li>'
            f'<li><span>Antes de confirmar, veja se aparecem <b>{PIX["recebedor"]}</b> e o valor.</span></li>'
            f'<li><span>O recibo chega em {E["email"]} e fica no Portal.</span></li></ol>')
    if modo == 'sem':
        como = ('<h3>Como pagar</h3><ol class="cr-passos"><li><span>Espere a fatura do mês no e-mail, uns 20 dias antes do vencimento.</span></li>'
                '<li><span>Escreva ao T3jus com o identificador da parcela; a equipe responde com os dados.</span></li>'
                '<li><span>Pague e mande o comprovante. O recibo chega por e-mail.</span></li></ol>')
    total = C['valor'] * 12
    npag = sum(1 for v in sits.values() if v == 'paga')
    pago_l = f'<tr><td colspan="3" style="font-weight:400">Pago até {HOJE}</td><td style="font-weight:400">{R(C["valor"] * npag)}</td><td></td></tr>' if npag else ''
    return (f'<article class="cr-faixa cr-capa">{TES.replace("cr-tesoura", "cr-tesoura cr-tesoura-topo")}'
            f'<div class="cr-col">{LOGO}<div class="cr-fio" style="margin-top:1mm"></div><h2>Carnê da assinatura {C["numero"]}</h2>'
            f'<dl><div><dt>Escritório</dt><dd>{E["nome"]}<br>CNPJ {E["cnpj"]}</dd></div>'
            f'<div><dt>Plano e dia</dt><dd>{C["plano"]} · todo dia {C["dia"]}</dd></div>'
            f'<div><dt>Período</dt><dd>{C["periodo"]}</dd></div>'
            f'<div><dt>Valor</dt><dd>12 × {R(C["valor"])} <span class="dp-exemplo">Valores de exemplo</span></dd></div></dl>'
            f'<p style="font-size:6.6pt;color:var(--tinta-2)">Gerado em {C["gerado"]} pelo T3jus · {ph("razão social do T3jus")}</p></div>'
            f'<div class="cr-col"><h3>As 12 parcelas</h3><table class="cr-tab"><thead><tr><th scope="col">Parcela</th><th scope="col">Mês</th><th scope="col">Vence</th><th scope="col">Valor</th><th scope="col">Situação</th></tr></thead>'
            f'<tbody>{linhas}</tbody><tfoot><tr><td colspan="3">Total do carnê</td><td>{R(total)}</td><td></td></tr>{pago_l}</tfoot></table></div>'
            f'<div class="cr-col">{como}{aviso}<p style="font-size:6.8pt;color:var(--tinta-2)">Dúvidas: {ATD}</p></div>'
            f'{TES}</article>')


def folhas(modo='padrao'):
    sits = {}
    for p in PARCELAS:
        n = p['n']
        if modo == 'sem':
            sits[n] = 'sem'
        elif modo in ('hoje', 'trocado') and n in PAGAS_HOJE:
            sits[n] = 'paga'
        elif modo == 'trocado' and n >= 4:
            sits[n] = 'cancelada'
        else:
            sits[n] = 'valida'
    itens = [('capa', None)] + [('p', p) for p in PARCELAS]
    fl = []
    for i in range(0, len(itens), 3):
        corpo = ''
        for k, (tipo, p) in enumerate(itens[i:i + 3]):
            corpo += capa(sits, modo) if tipo == 'capa' else faixa(p, sits[p['n']], topo=(k == 0))
        fl.append(corpo)
    tot = len(fl)
    return ''.join(f'<div class="dp-folha cr-folha" role="region" aria-label="Folha {j} de {tot}">{c}</div>' for j, c in enumerate(fl, 1))


ESTADOS = [
    ('padrao', 'Padrão', 'Pequi, carnê 2026/2027 como foi gerado em 15/09', folhas('padrao'), ''),
    ('hoje', 'Baixado hoje', 'O mesmo carnê baixado em 20/11: parcelas 1 e 2 pagas', folhas('hoje'),
     '<b>Baixado depois.</b> O PDF sai como o carnê está no dia: as parcelas pagas aparecem como pagas, sem os códigos, para ninguém pagar de novo.'),
    ('trocado', 'Pagas e canceladas', 'Carnê trocado em 20/11: 1 e 2 pagas, 3 vale, 4 a 12 canceladas', folhas('trocado'),
     '<b>Carnê trocado.</b> Com 9 pessoas, a mensalidade passou a R$ 529,00 e saiu o carnê 2027. A parcela 3 já tinha fatura e continua valendo; '
     'as 4 a 12 ficam no PDF como canceladas, com "não pague", sem códigos.'),
    ('sem-codigos', 'Sem códigos (hoje)', 'Meio de pagamento ainda não escolhido', folhas('sem'),
     '<b>Como sairia hoje.</b> Até a cobrança pelo Banco Inter ficar ligada, as parcelas não têm Pix nem boleto: o carnê vira só o calendário, com o caminho de pagar falando com o T3jus. '
     'Veja a pergunta 3 nas notas: a recomendação é não oferecer o carnê antes de a cobrança pelo Banco Inter estar ligada.'),
    ('pb', 'Preto e branco', 'Como sai numa impressora comum', folhas('padrao'),
     '<b>Prévia em preto e branco.</b> Tudo o que informa está em texto escuro ou em linha. O QR e o código de barras são pretos no branco.'),
]

open(f'{SAIDA}/carne-a4.html', 'w', encoding='utf-8').write(pagina(
    'carne-a4.html', 'Carnê do T3jus · modelo A4',
    'Modelo do carnê de 12 parcelas da assinatura do T3jus, em A4: capa e parcelas destacáveis, cada uma com o próprio Pix e boleto.',
    'Prévia do carnê', 'Pequi Advocacia · carnê 2026/2027 · 12 parcelas', ESTADOS, css_extra=CSS_C))
print('carne-a4 ok', len(ESTADOS), 'estados')
