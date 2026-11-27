# Carnê: terceira forma de pagamento da assinatura, ao lado de Pix e boleto (ajuste pedido pela Carol).
# Leitura adotada: o escritório recebe de uma vez um carnê com 12 parcelas, uma por mês, todas com o mesmo valor e
# vencimento no dia escolhido, cada uma com o próprio Pix e boleto. Cada parcela é a fatura daquele mês: as faturas
# continuam uma por mês, emitidas 20 dias antes do vencimento, com os mesmos códigos da página do carnê.
# Exemplos: Pequi Advocacia no Console (todo dia 5) e Ribeiro & Matos no Portal (todo dia 10). Valores em centavos.
from dados_cb import *

ICONES_CB['i-carne'] = ('<path d="M7 3.5h12.5v17H7Z"/><path d="M10 3.5v17" stroke-dasharray="1.6 1.6"/>'
                        '<path d="M4 7h3M4 12h3M4 17h3"/><path d="M13 8.5h4M13 12h4M13 15.5h2.5"/>')
FORMA_ICO['Carnê'] = 'carne'

CNPJ_PEQUI = cnpj('407215360001')
V_CARNE = 49000          # plano Escritório, sem pessoa a mais quando o carnê foi gerado
V_NOVO = 49000 + PESSOA_A_MAIS   # com 9 pessoas desde 18/11/2026
LINK_PEQUI_FICHA = 'ficha.html?aba=assinatura&amp;estado=cb-carne'
LINK_PEQUI_FATURA = 'cobranca.html?aba=fatura&amp;estado=carne'

MESES = ['outubro de 2026', 'novembro de 2026', 'dezembro de 2026', 'janeiro de 2027', 'fevereiro de 2027', 'março de 2027',
         'abril de 2027', 'maio de 2027', 'junho de 2027', 'julho de 2027', 'agosto de 2027', 'setembro de 2027']
CURTO = ['out/2026', 'nov/2026', 'dez/2026', 'jan/2027', 'fev/2027', 'mar/2027', 'abr/2027', 'mai/2027', 'jun/2027', 'jul/2027', 'ago/2027', 'set/2027']
MM = ['10/2026', '11/2026', '12/2026', '01/2027', '02/2027', '03/2027', '04/2027', '05/2027', '06/2027', '07/2027', '08/2027', '09/2027']


def parcelas(dia, pagas, proxima):
    """pagas: {n: 'nota'}; proxima: número da parcela a vencer com fatura emitida."""
    out = []
    for i in range(12):
        n = i + 1
        if n in pagas:
            out.append((n, 'paga', pagas[n]))
        elif n == proxima:
            out.append((n, 'proxima', 'fatura emitida'))
        else:
            out.append((n, 'avencer', ''))
    return [(n, CURTO[n - 1], f'{dia:02d}/{MM[n - 1]}', s, nota) for n, s, nota in out]


PARC_PEQUI = parcelas(5, {1: 'em 02/10', 2: 'em 04/11'}, 3)
PARC_RIBEIRO = parcelas(10, {1: 'em 10/10', 2: 'em 09/11', 4: 'adiantada, em 18/11'}, 3)

SIT_PARC = {'paga': ('check', 'Paga'), 'proxima': ('relogio', 'Próxima'), 'avencer': ('agenda', 'A vencer'), 'cancelada': ('x', 'Cancelada')}


def lista_parcelas(ps, rotulo):
    li = ''
    for n, mes, venc, s, nota in ps:
        ic, txt = SIT_PARC[s]
        extra = f' · {nota}' if nota else ''
        cur = ' aria-current="step"' if s == 'proxima' else ''
        li += (f'<li class="cb-parc cb-parc-{s}"{cur}><b>{n}<small>de 12</small></b><span class="cb-parc-mes">{mes}</span>'
               f'<span>vence {venc[:5]}</span><span class="cb-parc-sit">{ico(ic)}{txt}</span>'
               + (f'<span class="cb-parc-nota">{nota}</span>' if nota and s == 'paga' else '')
               + f'<span class="sr">, vencimento {venc}{extra}</span></li>')
    return f'<ol class="cb-parcelas" aria-label="{rotulo}">{li}</ol>'


def resumo_carne(ps, valor):
    pagas = sum(1 for p in ps if p[3] == 'paga')
    falta = 12 - pagas
    return (f'<div class="cb-carne-res"><dl><div><dt>Pagas</dt><dd>{pagas} de 12 · {brl(pagas * valor)}</dd></div>'
            f'<div><dt>A pagar</dt><dd>{falta} parcelas · {brl(falta * valor)}</dd></div>'
            f'<div><dt>Total do carnê</dt><dd>{brl(12 * valor)}</dd></div></dl>'
            f'<div class="cb-carne-barra" role="img" aria-label="{pagas} de 12 parcelas pagas"><i style="width:{round(pagas * 100 / 12)}%"></i></div></div>')


def folha_carne(nome_carne, sub, ps, valor, console=True, aviso_html='', id_='t-carne', cls_folha='folha'):
    gerar = (f'<button class="btn btn-sec so-fin" type="button" data-janela="janela-carne-novo">{ico("reenviar")}Gerar novo carnê</button>' if console else '')
    pe = ('Cada parcela é a fatura do mês, com o Pix e o boleto da página do carnê. Pagar adiantado pode: a parcela fica paga e a fatura do mês já nasce paga.'
          if console else
          'Cada parcela é a fatura do mês. Pode pagar qualquer parcela antes do vencimento, pelo Pix ou pelo boleto da página. Perdeu o carnê? Baixe de novo aqui.')
    return (f'<section class="{cls_folha} cb-carne" aria-labelledby="{id_}"><div class="folha-cab"><div><h2 id="{id_}">{ico("carne")}{nome_carne}</h2><p class="sub">{sub}</p></div></div>'
            + (f'<div style="padding:0 24px 14px">{aviso_html}</div>' if aviso_html else '')
            + resumo_carne(ps, valor) + lista_parcelas(ps, f'Parcelas do {nome_carne.lower()}')
            + f'<div class="cb-carne-acoes"><a class="btn btn-sec" href="#">{ico("baixar")}Baixar o carnê (PDF)</a>{gerar}</div>'
            + f'<p class="docs-pe">{ico("ajuda")}<span>{pe}</span></p></section>')


CSS_CARNE = r"""
/* ---- carnê (ajuste da Carol) */
.cb-carne h2 .ico{width:22px;height:22px;color:var(--vinho-4);vertical-align:-3px;margin-right:8px}
.cb-carne-res{display:grid;grid-template-columns:auto minmax(120px,1fr);gap:10px 28px;align-items:center;padding:0 24px 14px}
.cb-carne-res dl{display:flex;flex-wrap:wrap;gap:6px 28px;margin:0}
.cb-carne-res dl div{display:grid;gap:0}
.cb-carne-res dt{font-size:12px;color:var(--texto-2)}
.cb-carne-res dd{margin:0;font-weight:500;font-size:14px;font-variant-numeric:lining-nums tabular-nums}
.cb-carne-barra{height:8px;border-radius:4px;background:var(--sal);overflow:hidden}
.cb-carne-barra i{display:block;height:100%;background:var(--vinho-2);border-radius:4px}
.cb-parcelas{list-style:none;margin:0;padding:2px 24px 16px;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}
.cb-parc{display:grid;gap:1px;align-content:start;padding:9px 12px 10px;border-radius:10px;background:var(--papel);border:1px dashed var(--vinho-4);font-size:12px;color:var(--texto-2);min-width:0}
.cb-parc b{font-family:var(--serifa);font-size:21px;font-weight:500;color:var(--vinho);line-height:1.1}
.cb-parc b small{font-family:inherit;font-size:12px;color:var(--texto-2);margin-left:4px;font-weight:400}
.cb-parc .cb-parc-mes{font-size:13px;font-weight:500;color:var(--texto)}
.cb-parc .cb-parc-sit{display:inline-flex;align-items:center;gap:4px;margin-top:4px;font-weight:500;color:var(--texto)}
.cb-parc .cb-parc-sit .ico{width:14px;height:14px;flex:none}
.cb-parc .cb-parc-nota{font-size:11px;line-height:1.35}
.cb-parc-paga{background:var(--sal-2);border:1px solid var(--sal-2)}
.cb-parc-paga .cb-parc-sit{color:var(--vinho)}
.cb-parc-proxima{border:2px solid var(--vinho-2);padding:8px 11px 9px}
.cb-parc-cancelada{background:var(--sal-2);border-style:solid;border-color:var(--sal-2)}
.cb-parc-cancelada .cb-parc-mes{text-decoration:line-through}
.cb-carne-pt{border-top:1px solid var(--divisor);padding-top:6px}
.cb-h3-carne{font-family:var(--serifa);font-size:22px;font-weight:500;color:var(--vinho);margin:0;line-height:1.25}
.cb-h3-carne .ico{width:22px;height:22px;color:var(--vinho-4);vertical-align:-3px;margin-right:8px}
.cb-carne-acoes{display:flex;flex-wrap:wrap;gap:8px;padding:0 24px 18px}
.cb-parcela-faixa{display:flex;gap:16px;align-items:center;flex-wrap:wrap;padding:16px 22px;border-radius:var(--raio-g);background:var(--papel);box-shadow:var(--sombra);border-left:4px solid var(--vinho-2)}
.cb-parcela-faixa>.ico{width:30px;height:30px;color:var(--vinho-2);flex:none}
.cb-parcela-faixa div{flex:1 1 300px;min-width:0}
.cb-parcela-faixa strong{display:block;font-family:var(--serifa);font-size:20px;font-weight:500;color:var(--vinho);line-height:1.25}
.cb-parcela-faixa p{margin:2px 0 0;font-size:13px;color:var(--texto-2)}
.cb-parcela-faixa .acoes{display:flex;gap:8px;flex-wrap:wrap}
#janela-carne-novo .janela-pe{position:sticky;bottom:0}
@media (max-width:760px){
  .cb-carne-res{grid-template-columns:1fr;padding:0 16px 12px}
  .cb-parcelas{grid-template-columns:repeat(3,minmax(0,1fr));padding:2px 16px 14px;gap:6px}
  .cb-parc{padding:8px 9px 9px}
  .cb-parc-proxima{padding:7px 8px 8px}
  .cb-carne-acoes{padding:0 16px 16px}
  .cb-carne-acoes .btn{flex:1 1 100%}
  .cb-parcela-faixa{padding:14px 16px}
  .cb-parcela-faixa .acoes .btn{flex:1 1 100%}
}
"""
CSS_CB = CSS_CB + CSS_CARNE

# A Pequi paga por carnê: na lista de faturas, a forma é "Carnê" e a de dezembro abre a fatura da parcela 3.
for _f in FATURAS:
    if _f['esc'] == 'Pequi Advocacia':
        _f['forma'] = 'Carnê'
        _f['href'] = LINK_PEQUI_FICHA
        if _f['comp'] == 'dezembro/2026':
            _f['fat'] = LINK_PEQUI_FATURA
