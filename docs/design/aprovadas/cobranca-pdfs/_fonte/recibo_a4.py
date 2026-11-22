# Recibo do pagamento de uma fatura do T3jus (CO-06, F1.21): o modelo A4, uma página por recibo.
# Segue o recibo A4 aprovado (portal-recibo-recorrente), trocando quem emite: aqui é o T3jus que recebeu do escritório.
# Sem nota fiscal por agora (Carol, 22/11/2026): o recibo é o comprovante do pagamento. Estados por ?estado= (padrao, carne, manual, pb).
# Uso: python3 recibo_a4.py <pasta-saida>
import sys
from cob_dados import *
from pecas_pdf import *

SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
ATD = ph('atendimento@exemplo.com.br')

CSS_R = r"""
.dp-texto{margin-top:6.5mm;font-family:var(--serifa);font-size:12pt;line-height:1.55;color:var(--tinta);text-align:justify;hyphens:auto}
.dp-texto b{font-weight:600}
.dp-texto .dp-ext{font-style:italic}
.dp-dados3{grid-template-columns:1.25fr 1fr 1fr 1.1fr}
.dp-fim{margin-top:auto;padding-top:8mm;display:grid;grid-template-columns:minmax(0,1fr) 86mm;gap:10mm;align-items:end}
.dp-local{font-family:var(--serifa);font-size:12pt}
.dp-quit{font-size:7.8pt;color:var(--tinta-2);line-height:1.5;margin-top:2.5mm;max-width:84mm}
.dp-emissor{display:grid;gap:1mm;font-size:8.2pt;line-height:1.45;padding:3mm 4mm;border-top:.35mm solid var(--vinho)}
.dp-emissor b{font-weight:600}
.dp-emissor span{color:var(--tinta-2)}
.dp-reg{margin-top:1.6mm;padding:1.6mm 2.4mm;border-left:.8mm solid var(--ambar);background:var(--sal-2);border-radius:1mm;font-size:7.4pt;line-height:1.45;color:var(--tinta-2)}
.dp-reg b{color:var(--tinta);font-weight:600}
.dp-doc .dp-pe{margin-top:6mm}
"""


def folha(chave='ribeiro'):
    r = RECIBOS[chave]
    e = r['esc']
    v = r['valor']
    parc = r.get('parcela')
    man = r.get('manual')
    ref = (f'à <b>parcela {parc} de 12 do carnê 2026/2027</b> da assinatura do T3jus (fatura nº {r["fatura"]}), '
           if parc else f'à <b>fatura nº {r["fatura"]}</b> da assinatura do T3jus, ')
    forma_txt = 'Pix fora da cobrança' if man else r['forma']
    texto = (f'<p class="dp-texto">Recebemos de <b>{e["nome"]}</b>, CNPJ {e["cnpj"]}, a quantia de <b>{R(v)}</b> '
             f'(<span class="dp-ext">{extenso(v)}</span>), referente {ref}plano {r["plano"]}, competência <b>{r["comp"]}</b>, '
             f'paga em <b>{r["pago"]}</b> por <b>{forma_txt}</b>. Damos quitação desse valor.</p>')
    linhas = ''.join(f'<tr><td>{d}<small>{x}</small></td><td>{R(c)}</td></tr>' for d, x, c in r['itens'])
    tab = (f'<section class="dp-sec" aria-label="Discriminação"><h3>Discriminação</h3><table class="dp-tab"><thead><tr><th scope="col">Descrição</th><th scope="col">Valor</th></tr></thead>'
           f'<tbody>{linhas}</tbody><tfoot><tr><td>Total recebido</td><td>{R(v)}</td></tr></tfoot></table></section>')
    forma_dd = (f'{r["forma"]}<small>{r["forma_det"]}</small>')
    dados = (f'<section class="dp-sec" aria-label="Dados do pagamento"><h3>Pagamento</h3><dl class="dp-dados dp-dados3" style="margin-top:0">'
             f'<div><dt>Escritório</dt><dd>{e["nome"]}<small>CNPJ {e["cnpj"]}</small></dd></div>'
             f'<div><dt>Fatura</dt><dd>nº {r["fatura"]}<small>{"parcela " + str(parc) + " de 12 do carnê 2026/2027" if parc else "competência " + r["comp"]}</small></dd></div>'
             f'<div><dt>Data do pagamento</dt><dd>{r["pago"]}<small>vencia em {r["venc"]}</small></dd></div>'
             f'<div><dt>Forma</dt><dd>{forma_dd}</dd></div>'
             f'</dl></section>')
    reg = ''
    if man:
        reg = (f'<p class="dp-reg">Pagamento registrado à mão por <b>{man["quem"]}</b>, da equipe do T3jus, em {man["quando"]}, às {man["hora"]}, '
               f'a partir do comprovante enviado pelo escritório.</p>')
    else:
        reg = f'<p class="dp-reg">Pagamento confirmado pelo Banco Inter e registrado pelo sistema em {r["pago"]}.</p>'
    emitido = man['quando'] if man else r['pago']
    fim = (f'<div class="dp-fim"><div><p class="dp-local">{ph("cidade do T3jus")}, {emitido}.</p>'
           f'<p class="dp-quit">Este recibo é o comprovante do pagamento e dá quitação somente da fatura e do valor descritos acima. As outras faturas da assinatura seguem como combinado.</p></div>'
           f'<div class="dp-emissor"><b>{ph("razão social do T3jus")}</b><span>CNPJ {ph("do T3jus")}</span>'
           f'<span>Emitido eletronicamente pelo T3jus; dispensa assinatura.</span>{reg}</div></div>')
    topo = (f'<div class="dp-topo"><div class="dp-titulo"><p class="dp-rot">Recibo de pagamento da assinatura</p><h2>Recibo</h2>'
            f'<p class="dp-num">Nº <b>{r["numero"]}</b> · o mesmo número da fatura</p></div>'
            f'<div class="dp-valor"><span class="dp-rot">Valor recebido</span><b>{R(v)}</b><span class="dp-venc">Pago em <strong>{r["pago"]}</strong></span>'
            f'<span class="dp-exemplo">Valores de exemplo</span></div></div>')
    pe = (f'<p class="dp-pe"><span>Recibo nº {r["numero"]} · emitido pelo T3jus em {emitido} · enviado ao e-mail de cobrança por {ph("cobranca@exemplo.com.br")} · 1 página</span>'
          f'<span class="dp-t3">{SIMB}T3jus · Sistema jurídico</span></p>')
    return f'<article class="dp-folha dp-doc" aria-label="Recibo nº {r["numero"]}, {e["nome"]}">{timbre()}{topo}{texto}{tab}{dados}{fim}{pe}</article>'


ESTADOS = [
    ('padrao', 'Padrão', 'Ribeiro & Matos, novembro, pago por Pix', folha(), ''),
    ('carne', 'Parcela de carnê', 'Pequi, parcela 2 de 12, paga por boleto', folha('pequi'),
     '<b>Parcela de carnê.</b> O texto diz a parcela e o carnê, além do número da fatura do mês.'),
    ('manual', 'Registrado à mão', 'Cedro & Lima, Pix fora da cobrança', folha('cedro'),
     '<b>Pagamento registrado à mão.</b> Quando o escritório paga fora da cobrança e a equipe registra no Console, o recibo diz quem registrou e quando. '
     'O motivo escrito no Console é interno e não vai no recibo.'),
    ('pb', 'Preto e branco', 'Como sai numa impressora comum', folha(),
     '<b>Prévia em preto e branco.</b> Tudo o que informa está em texto escuro ou em linha. O âmbar é só o filete e o traço ao lado do registro.'),
]

open(f'{SAIDA}/recibo-a4.html', 'w', encoding='utf-8').write(pagina(
    'recibo-a4.html', 'Recibo do T3jus · modelo A4',
    'Modelo do recibo que o T3jus emite ao escritório quando uma fatura da assinatura é paga, em A4.',
    'Prévia do recibo', 'Modelo A4 do recibo de pagamento da fatura', ESTADOS, css_extra=CSS_R))
print('recibo-a4 ok', len(ESTADOS), 'estados')
