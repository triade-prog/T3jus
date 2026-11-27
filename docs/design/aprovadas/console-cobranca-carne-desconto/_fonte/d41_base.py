# D41 · peças comuns das telas. Lê os geradores aprovados (cópias sem mudança em aprovado-cb/, só com o caminho
# /home/claude trocado por /home/user) até antes de gravarem a página, para usar as mesmas peças (folha, selo,
# aviso, janela, campo, tabela de faturas). As páginas novas partem das telas aprovadas mais recentes
# (docs/design/aprovadas/cobranca-pdfs: as da console-cobranca com os PDFs ligados e o endereço de cobrança) e ganham
# só o CSS d41-, o ícone novo e os estados novos, depois do último template aprovado. Nada aprovado é editado.
import sys, os, re, tempfile

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, 'aprovado-cb'))
sys.path.insert(0, AQUI)
APROV = '/home/user/t3jus/docs/design/aprovadas/'
BASE_TELAS = APROV + 'cobranca-pdfs/'
_TMP = tempfile.mkdtemp(prefix='d41-')


def carregar(arq, corte, ultimo=False):
    """Executa o gerador aprovado até `corte` (sem gravar nada) e devolve o espaço de nomes."""
    caminho = os.path.join(AQUI, 'aprovado-cb', arq)
    src = open(caminho, encoding='utf-8').read()
    i = src.rindex(corte) if ultimo else src.index(corte)
    g = {'__name__': arq[:-3] + '_aprovado', '__file__': caminho}
    argv = sys.argv
    sys.argv = [arq, _TMP]
    exec(compile(src[:i], arq, 'exec'), g)
    sys.argv = argv
    return g


F = carregar('ficha_cb.py', '# ---------------------------------------------------------------- página', ultimo=True)
from d41_dados import *  # noqa: E402  (o brl do D41 é o mesmo do aprovado; os dois ficam iguais)

ico, aviso, toast, janela, campo, selecao, radios, exemplo, tpl = (F[k] for k in ('ico', 'aviso', 'toast', 'janela', 'campo', 'selecao', 'radios', 'exemplo', 'tpl'))
assert F['brl'](39920) == brl(39920) and F['brl'](-9980) == brl(-9980)

ICONES_D41 = {
    # etiqueta de preço com o ponto: traço 1,6, grade 24, cantos vivos, sem preenchimento (IDENTIDADE.md)
    'i-desconto': '<path d="M3.5 12.2 11.8 4h8.7v8.7l-8.3 8.3Z"/><circle cx="16.3" cy="8.2" r="1.6"/><path d="m8.6 15.4 4.2-4.2"/>',
}


def montar_sobre(base, saida, css, templates, js=''):
    """A tela aprovada + CSS d41- + ícone novo + os estados novos depois do último template aprovado."""
    s = open(BASE_TELAS + base, encoding='utf-8').read()
    s = s.replace('</style>', css + '\n</style>', 1)
    sp = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">'
    assert sp in s, base
    novos = ''.join(f'<symbol id="{k}" viewBox="0 0 24 24">{v}</symbol>' for k, v in ICONES_D41.items() if f'id="{k}"' not in s)
    s = s.replace(sp, sp + novos, 1)
    k = s.rindex('</template>') + len('</template>')
    s = s[:k] + '\n<!-- D41 · estados novos (CO-10 no carnê) -->\n' + templates + s[k:]
    if js:
        s = s.replace('</body>', js + '\n</body>')
    open(saida, 'w', encoding='utf-8').write(s)
    return s


# ---------------------------------------------------------------- CSS novo (prefixo d41-), só tokens do D2 e do Gabinete
CSS_D41 = r"""
/* Portal: os contatos da equipe (peça aprovada) ganham alvo de 44 px; só a altura muda */
.contato a{min-height:44px;display:inline-flex;align-items:center}
/* ==========================================================================
   D41 · CO-10 no carnê: valor em cada canhoto, selo do desconto de entrada e as faixas do carnê. Prefixo d41-.
   ========================================================================== */
.cb-parc .d41-valor{font-family:var(--serifa);font-size:16px;font-weight:500;color:var(--texto);font-variant-numeric:lining-nums tabular-nums;margin-top:2px;line-height:1.2}
.d41-selo-desc{display:inline-flex;align-items:flex-start;gap:4px;margin-top:3px;padding:2px 7px 2px 5px;border-radius:8px;background:var(--ambar-3);color:var(--vinho-escuro);font-size:11px;font-weight:500;line-height:1.3;width:fit-content;max-width:100%;white-space:normal}
.d41-selo-desc>span{min-width:0}
.d41-selo-desc .ico{width:13px;height:13px;flex:none;margin-top:1px}
.cb-parc-paga .d41-selo-desc{background:var(--papel)}
.cb-parc-cancelada .d41-valor{text-decoration:line-through;color:var(--texto-2)}
.cb-parc-cancelada .d41-selo-desc{background:var(--papel)}
.d41-parc-fora{display:grid;gap:2px;align-content:center;padding:9px 12px 10px;border-radius:10px;border:1px dashed var(--vinho-4);background:repeating-linear-gradient(135deg,var(--sal-2) 0 6px,var(--papel) 6px 12px);font-size:12px;color:var(--texto-2);min-width:0}
.d41-parc-fora b{font-size:13px;font-weight:500;color:var(--texto)}
/* faixas: a sequência de tons do Gabinete (âmbar = com desconto, vinho = valor cheio), sempre com o texto ao lado */
.d41-faixas{padding:0 24px 14px;display:grid;gap:8px}
.d41-tira{display:flex;gap:3px;height:10px;border-radius:5px;overflow:hidden}
.d41-tira i{display:block;height:100%;background:var(--vinho-2)}
.d41-tira i.d41-com{background:var(--ambar)}
.d41-tira i.d41-pessoa{background:var(--vinho)}
.d41-legenda{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px 22px;font-size:13px}
.d41-legenda li{display:flex;align-items:baseline;gap:8px;min-width:0}
.d41-legenda li::before{content:"";flex:none;width:12px;height:12px;border-radius:3px;background:var(--vinho-2);transform:translateY(1px)}
.d41-legenda li.d41-com::before{background:var(--ambar)}
.d41-legenda b{font-weight:600;font-variant-numeric:lining-nums tabular-nums}
.d41-legenda span{color:var(--texto-2)}
.d41-nota{margin:0 24px 14px;display:flex;gap:10px;align-items:flex-start;padding:10px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.5}
.d41-nota>.ico{width:18px;height:18px;flex:none;color:var(--vinho-2);margin-top:1px}
.d41-nota b{font-weight:600}
/* carnê substituído: folha mais baixa, com a situação de cada parcela */
.d41-subst .folha-cab h2{font-size:19px}
.cb-parcelas.d41-parcelas{grid-template-columns:repeat(4,minmax(0,1fr))}
.d41-selo-subst{background:var(--sal-2);color:var(--texto-2);box-shadow:inset 0 0 0 1px var(--vinho-4)}
/* prévia no formulário e nas janelas */
.d41-previa{grid-column:1/-1;border:1px solid var(--borda-folha);border-radius:var(--raio);padding:14px 16px;display:grid;gap:10px;background:var(--papel)}
.d41-previa h3{margin:0;font-family:var(--sans);font-size:14px;font-weight:600;color:var(--texto)}
.d41-previa p{margin:0;font-size:13px}
.d41-previa .d41-faixas{padding:0}
.d41-previa .cb-peq{display:block}
.d41-ajuda-desc{grid-column:1/-1;margin:-6px 0 0}
.cb-compara-planos .d41-fx{font-weight:600;font-variant-numeric:lining-nums tabular-nums;color:var(--texto)}
.d41-mudam{list-style:none;margin:0;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);display:grid;gap:6px;font-size:13px}
.d41-mudam li{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:4px 10px;align-items:baseline}
.d41-mudam li b{font-weight:600;font-variant-numeric:lining-nums tabular-nums;white-space:nowrap}
.d41-mudam li s{color:var(--texto-2);font-variant-numeric:lining-nums tabular-nums;white-space:nowrap}
.d41-mudam .ico{width:14px;height:14px;color:var(--texto-2)}
.d41-mudam li.d41-cab{font-size:12px;color:var(--texto-2)}
.d41-motivo-srv{margin:0;padding:10px 14px;border-left:3px solid var(--ambar);background:var(--sal-2);border-radius:0 var(--raio) var(--raio) 0;font-size:13px}
.d41-motivo-srv b{font-weight:600}
/* histórico da assinatura, com as faixas */
.d41-hist{margin:0 24px 20px;padding-top:12px;border-top:1px solid var(--divisor)}
.d41-hist h3{font-family:var(--sans);font-size:14px;font-weight:600;color:var(--texto);margin:0 0 4px}
.d41-hist ol{list-style:none;margin:0;padding:0}
.d41-hist li{display:grid;grid-template-columns:92px minmax(0,1fr);gap:10px;font-size:13px;padding:8px 0;line-height:1.5;border-top:1px solid var(--divisor)}
.d41-hist li:first-child{border-top:0}
.d41-hist time{color:var(--texto-2);font-variant-numeric:lining-nums tabular-nums}
.d41-hist small{display:block;color:var(--texto-2);font-size:12px}
.d41-hist .d41-novo-ev{font-weight:500}
.d41-hist q{display:block;margin-top:3px;font-style:italic;color:var(--texto)}
@media (max-width:760px){
  .cb-parc .d41-valor{font-size:15px}
  .d41-faixas{padding:0 16px 12px}
  .d41-nota{margin:0 16px 12px}
  .cb-parcelas.d41-parcelas,.d41-subst .cb-parcelas.d41-parcelas{grid-template-columns:repeat(2,minmax(0,1fr))}
  .d41-legenda{flex-direction:column}
  .d41-mudam li{grid-template-columns:minmax(0,1fr) auto}
  .d41-mudam li .ico,.d41-mudam li s{display:none}
  .d41-mudam li.d41-cab{display:none}
  .d41-hist{margin:0 16px 16px}
  .d41-hist li{grid-template-columns:1fr;gap:0}
}
"""


# ---------------------------------------------------------------- peças do carnê com o valor de cada parcela
SIT_PARC = {'paga': ('check', 'Paga'), 'proxima': ('relogio', 'Próxima'), 'avencer': ('agenda', 'A vencer'), 'cancelada': ('x', 'Cancelada')}


def selo_desc(p, curto_=False):
    if not p['desc']:
        return ''
    return f'<span class="d41-selo-desc">{ico("desconto")}<span>{"desconto de entrada" if curto_ else "com desconto de entrada"}</span></span>'


def lista_parcelas(ps, rotulo, n_total=12, fora=None):
    """Canhotos do Console e do Portal, agora com o valor de cada parcela e o selo do desconto (texto e ícone).
    fora: (depois_de_n, am, texto) para o mês pulado que já tem fatura (estado 3)."""
    li = ''
    for p in ps:
        ic, txt = SIT_PARC[p['sit']]
        cur = ' aria-current="step"' if p['sit'] == 'proxima' else ''
        sr = f', vencimento {p["venc"]}, {brl(p["valor"])}'
        if p['desc']:
            sr += f', com {brl(p["desc"])} de desconto de entrada'
        if p['nota']:
            sr += f', {p["nota"]}'
        nota = f'<span class="cb-parc-nota">{p["nota"]}</span>' if p['nota'] and p['sit'] in ('paga', 'proxima', 'cancelada') else ''
        li += (f'<li class="cb-parc cb-parc-{p["sit"]}"{cur}><b>{p["n"]}<small>de {n_total}</small></b><span class="cb-parc-mes">{curto(p["am"])}</span>'
               f'<span aria-hidden="true">vence {p["venc"][:5]}</span><span class="d41-valor" aria-hidden="true">{brl(p["valor"])}</span>'
               f'{selo_desc(p)}<span class="cb-parc-sit">{ico(ic)}{txt}</span>{nota}<span class="sr">{sr}</span></li>')
        if fora and p['n'] == fora[0]:
            li += (f'<li class="d41-parc-fora"><b>{curto(fora[1])}</b><span>{fora[2]}</span></li>')
    return f'<ol class="cb-parcelas d41-parcelas" aria-label="{rotulo}">{li}</ol>'


def resumo(ps, n_total=12):
    pagas = [p for p in ps if p['sit'] == 'paga']
    vivas = [p for p in ps if p['sit'] != 'cancelada']
    falta = [p for p in vivas if p['sit'] != 'paga']
    return (f'<div class="cb-carne-res"><dl><div><dt>Pagas</dt><dd>{len(pagas)} de {n_total} · {brl(total(pagas))}</dd></div>'
            f'<div><dt>A pagar</dt><dd>{len(falta)} parcela{"s" if len(falta) != 1 else ""} · {brl(total(falta))}</dd></div>'
            f'<div><dt>Total do carnê</dt><dd>{brl(total(ps))}</dd></div></dl>'
            f'<div class="cb-carne-barra" role="img" aria-label="{len(pagas)} de {n_total} parcelas pagas"><i style="width:{round(len(pagas) * 100 / n_total)}%"></i></div></div>')


def bloco_faixas(ps, rotulo='Faixas do carnê'):
    """A tira (decorativa) e a legenda em texto: de que parcela a que parcela, quanto e por quê."""
    fx = faixas(ps)
    if len(fx) == 1:
        return ''
    tira = ''.join(f'<i class="{"d41-com" if f["desc"] else ""}" style="flex:{f["q"]}"></i>' for f in fx)
    leg = ''
    for f in fx:
        de, ate = f['de'], f['ate']
        par = f'Parcela {de["n"]}' if f['q'] == 1 else f'Parcelas {de["n"]} a {ate["n"]}'
        meses = curto(de['am']) if f['q'] == 1 else f'{curto(de["am"])} a {curto(ate["am"])}'
        pq = 'com o desconto de entrada' if f['desc'] else ('valor cheio' + (', com a pessoa a mais' if f['de']['pam'] else ''))
        leg += f'<li class="{"d41-com" if f["desc"] else ""}"><b>{f["q"]} × {brl(f["valor"])}</b><span>{par} · {meses} · {pq}</span></li>'
    return f'<div class="d41-faixas"><div class="d41-tira" aria-hidden="true">{tira}</div><ul class="d41-legenda" aria-label="{rotulo}">{leg}</ul></div>'


def folha_carne(nome, sub, ps, console=True, aviso_html='', nota_html='', id_='t-carne', cls_folha='folha', baixar='carne-a4.html?estado=carne-desconto',
                gerar=True, fora=None, selo_h2='', pe=None, n_total=12, acoes=True):
    g = (f'<button class="btn btn-sec so-fin" type="button" data-janela="janela-carne-novo">{ico("reenviar")}Gerar novo carnê</button>' if console and gerar else '')
    if pe is None:
        pe = ('Cada parcela é a fatura do mês, com o Pix e o boleto da página do carnê. O desconto de entrada vale só nas parcelas até o fim do prazo; '
              'as outras já nascem com o valor cheio, sem pedir carnê novo.' if console else
              'Cada parcela é a fatura do mês. Pode pagar qualquer parcela antes do vencimento, pelo Pix ou pelo boleto da página. Perdeu o carnê? Baixe de novo aqui.')
    ac = (f'<div class="cb-carne-acoes"><a class="btn btn-sec" href="{baixar}">{ico("baixar")}Baixar o carnê (PDF)</a>{g}</div>' if acoes else '')
    return (f'<section class="{cls_folha} cb-carne" aria-labelledby="{id_}"><div class="folha-cab"><div><h2 id="{id_}">{ico("carne")}{nome}{selo_h2}</h2><p class="sub">{sub}</p></div></div>'
            + (f'<div style="padding:0 24px 14px">{aviso_html}</div>' if aviso_html else '')
            + nota_html + resumo(ps, n_total) + bloco_faixas(ps, f'Faixas do {nome.lower()}') + lista_parcelas(ps, f'Parcelas do {nome.lower()}', n_total, fora)
            + ac + (f'<p class="docs-pe">{ico("ajuda")}<span>{pe}</span></p>' if pe else '') + '</section>')


def sub_carne(ps, dia, gerado, extra=''):
    return f'{texto_faixas(faixas(ps))} · {periodo(ps)}{extra} · todo dia {dia} · gerado em {gerado}'


def nota(texto, icone='ajuda'):
    return f'<p class="d41-nota">{ico(icone)}<span>{texto}</span></p>'


def previa(titulo, ps, extra=''):
    return (f'<div class="d41-previa" role="group" aria-labelledby="pv-{id(ps)}"><h3 id="pv-{id(ps)}">{titulo}</h3>'
            f'<p><b>{texto_faixas(faixas(ps))}</b> · {periodo(ps)} · total {brl(total(ps))}</p>{bloco_faixas(ps, "Faixas da prévia")}{extra}</div>')
