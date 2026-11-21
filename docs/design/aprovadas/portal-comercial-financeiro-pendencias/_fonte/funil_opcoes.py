# Três opções para o bloco "Quanto vira contrato" do Funil (a Carol não gostou dos trapézios).
# Importa o comercial_pend.py (que gera, de passagem, comercial.html e clientes.html numa pasta de rascunho)
# e monta funil-opcoes.html: o estado "opcoes" mostra as três uma embaixo da outra, com legenda e recomendação;
# "opcao-a", "opcao-b" e "opcao-c" mostram a página do Funil inteira com cada uma no lugar.
# Uso: python3 funil_opcoes.py <pasta-saida> <pasta-rascunho>
import sys, os
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
RASCUNHO = sys.argv[2] if len(sys.argv) > 2 else '/tmp/funil-rascunho'
os.makedirs(RASCUNHO, exist_ok=True)
sys.argv = [sys.argv[0], RASCUNHO]
import comercial_pend as CP
from comum import tpl, ico, aviso
from pend import injetar

CM = CP.CM
U = 'funil-opcoes.html?estado='
# Os dados do estado fu-funil (20/08 a 18/11/2026).
TOTAL = 24
PROPOSTA = 14
CONTRATO = 9
ANDAMENTO = 4
OUTRO = 1
PEGOU = 5
VOLTOU = 3
ATEND = 2
assert CONTRATO + ANDAMENTO + OUTRO == PROPOSTA and PEGOU + VOLTOU + ATEND + PROPOSTA == TOTAL
pc = lambda a, b: f'{round(100 * a / b)}%'
MARCAR = '<a class="fu-link" href="#t-ag">marcar o motivo</a>'


def cab(s):
    return (f'<div class="folha-cab"><div><h2 id="t-cv{s}">Quanto vira contrato</h2>'
            f'<p class="sub">Primeiros contatos de 20/08 a 18/11/2026 e o que aconteceu com cada um.</p></div><div class="acoes">{CM.periodo_chips()}</div></div>')


# ---------------------------------------------------------------- A · régua
def opcao_a(s=''):
    def etapa(n, rot, nota):
        return (f'<li class="fa-et"><b class="fa-n num">{n}</b><span class="fa-r"><strong>{rot}</strong><small>{nota}</small></span>'
                f'<span class="fa-tr" aria-hidden="true"><span class="fa-b" style="--p:{100 * n / TOTAL:.2f}%"></span></span></li>')

    def passa(txt):
        return f'<li class="fa-passa"><span class="fa-seta" aria-hidden="true">↓</span><p>{txt}</p></li>'

    def sai(n, rot, cls=''):
        return (f'<li class="fa-sai{cls}"><b class="fa-n num">{n}</b><span class="fa-r">{rot}</span>'
                f'<span class="fa-tr" aria-hidden="true"><span class="fa-b" style="--p:{100 * n / TOTAL:.2f}%"></span></span></li>')
    corpo = (f'<ol class="fa" aria-label="Funil de 20/08 a 18/11/2026">'
             + etapa(TOTAL, 'primeiros contatos', 'Atendimentos com cliente novo.')
             + passa(f'<b>{pc(PROPOSTA, TOTAL)}</b> receberam proposta. Os outros {TOTAL - PROPOSTA} saíram sem proposta:')
             + sai(PEGOU, 'o escritório não pegou o caso') + sai(VOLTOU, 'o cliente não voltou')
             + sai(ATEND, f'ainda em atendimento, sem motivo {MARCAR}', ' fa-aberto')
             + etapa(PROPOSTA, 'receberam proposta', 'Proposta enviada, por qualquer valor.')
             + passa(f'<b>{pc(CONTRATO, PROPOSTA)}</b> fecharam. Os outros {PROPOSTA - CONTRATO} ainda não:')
             + sai(ANDAMENTO, 'proposta em andamento (abaixo)') + sai(OUTRO, 'fechou com outro escritório')
             + etapa(CONTRATO, 'viraram contrato', 'Contrato criado no T3jus, assinado ou não.')
             + f'</ol><p class="fa-total"><b class="num">{pc(CONTRATO, TOTAL)}</b> dos primeiros contatos viraram contrato no período.</p>')
    return f'<section class="folha" aria-labelledby="t-cv{s}">{cab(s)}<div class="op-corpo">{corpo}</div></section>'


# ---------------------------------------------------------------- B · três números e uma barra
def opcao_b(s=''):
    def num(n, rot):
        return f'<li class="fb-et"><b class="num">{n}</b><span>{rot}</span></li>'

    def seta(p, rot):
        return (f'<li class="fb-seta" aria-label="{p} {rot}"><span class="fb-p num">{p}</span>'
                f'<span class="fb-linha" aria-hidden="true"></span><span class="fb-sr">{rot}</span></li>')
    linha = (f'<ol class="fb-nums" aria-label="Funil de 20/08 a 18/11/2026">'
             + num(TOTAL, 'primeiros contatos') + seta(pc(PROPOSTA, TOTAL), 'receberam proposta')
             + num(PROPOSTA, 'receberam proposta') + seta(pc(CONTRATO, PROPOSTA), 'fecharam')
             + num(CONTRATO, 'viraram contrato') + '</ol>')
    segs = [('fb-c', CONTRATO), ('fb-a', ANDAMENTO), ('fb-o', OUTRO), ('fb-np', PEGOU), ('fb-nv', VOLTOU), ('fb-at', ATEND)]
    barra = ''.join(f'<span class="{c}" style="flex:{n}"></span>' for c, n in segs)
    desc = (f'Dos {TOTAL}: {CONTRATO} viraram contrato, {ANDAMENTO} com proposta em andamento, {OUTRO} fechou com outro escritório, '
            f'{PEGOU} o escritório não pegou, {VOLTOU} não voltaram e {ATEND} ainda em atendimento.')
    leg = lambda c, n, t: f'<li><span class="fb-m {c}" aria-hidden="true"></span><b class="num">{n}</b><span>{t}</span></li>'
    corpo = (linha
             + f'<div class="fb-onde"><h3 class="fb-tit">Onde os {TOTAL} pararam</h3>'
             + f'<div class="fb-barra" role="img" aria-label="{desc}">{barra}</div>'
             + f'<div class="fb-grupos" aria-hidden="true"><span style="flex:{PROPOSTA}">receberam proposta · {PROPOSTA}</span><span style="flex:{TOTAL - PROPOSTA}">sem proposta · {TOTAL - PROPOSTA}</span></div>'
             + '<div class="fb-legs">'
             + f'<div><p class="fb-g">Receberam proposta</p><ul>{leg("fb-c", CONTRATO, "viraram contrato")}{leg("fb-a", ANDAMENTO, "proposta em andamento")}{leg("fb-o", OUTRO, "fecharam com outro escritório")}</ul></div>'
             + f'<div><p class="fb-g">Saíram sem proposta</p><ul>{leg("fb-np", PEGOU, "o escritório não pegou o caso")}{leg("fb-nv", VOLTOU, "o cliente não voltou")}'
             + f'{leg("fb-at", ATEND, "ainda em atendimento, sem motivo")}</ul><p class="fb-marcar">{MARCAR}</p></div>'
             + '</div></div>')
    return f'<section class="folha" aria-labelledby="t-cv{s}">{cab(s)}<div class="op-corpo">{corpo}</div></section>'


# ---------------------------------------------------------------- C · livro de contagem, um ponto por pessoa
def opcao_c(s=''):
    def pontos(n, cls):
        return f'<span class="fc-pts {cls}" aria-hidden="true">' + '<i></i>' * n + '</span>'

    def linha(rot, n, cls, extra=''):
        return (f'<tr><th scope="row">{rot}{extra}</th><td class="fc-q num">{n}</td><td class="fc-v">{pontos(n, cls)}</td></tr>')

    def grupo(rot, n, nota):
        return (f'<tr class="fc-grupo"><th scope="rowgroup" colspan="3"><span>{rot}</span><span class="fc-gq"><b class="num">{n}</b> · {nota}</span></th></tr>')
    corpo = (f'<p class="fc-frase"><b class="num">{CONTRATO}</b> dos <b class="num">{TOTAL}</b> primeiros contatos viraram contrato. '
             f'<span>{pc(CONTRATO, TOTAL)} no período, um ponto por pessoa.</span></p>'
             + f'<table class="fc"><caption class="sr">Para onde foram os {TOTAL} primeiros contatos de 20/08 a 18/11/2026</caption>'
             + '<thead class="sr"><tr><th scope="col">Para onde foram</th><th scope="col">Pessoas</th><th scope="col">Pontos</th></tr></thead>'
             + '<tbody>' + grupo('Receberam proposta', PROPOSTA, f'{pc(PROPOSTA, TOTAL)} dos primeiros contatos')
             + linha('Viraram contrato', CONTRATO, 'fc-c') + linha('Proposta em andamento', ANDAMENTO, 'fc-a', ' <small>(abaixo)</small>')
             + linha('Fecharam com outro escritório', OUTRO, 'fc-a') + '</tbody>'
             + '<tbody>' + grupo('Saíram sem proposta', TOTAL - PROPOSTA, 'o assunto do “Encerrar sem proposta”')
             + linha('O escritório não pegou o caso', PEGOU, 'fc-n') + linha('O cliente não voltou', VOLTOU, 'fc-n')
             + linha('Ainda em atendimento, sem motivo', ATEND, 'fc-ab', f' <small>{MARCAR}</small>') + '</tbody>'
             + f'<tfoot><tr><th scope="row">Primeiros contatos</th><td class="fc-q num">{TOTAL}</td><td class="fc-v fc-pe">Atendimentos com cliente novo no período.</td></tr></tfoot></table>')
    return f'<section class="folha" aria-labelledby="t-cv{s}">{cab(s)}<div class="op-corpo">{corpo}</div></section>'


from funil_opcoes_textos import OPCOES as _T, RECOMENDO
OPCOES = [(k, t, {'a': opcao_a, 'b': opcao_b, 'c': opcao_c}[k], l) for k, t, l in _T]


def troca(bloco):
    f = CP.funil_pend()
    i = f.index('<section class="folha" aria-labelledby="t-cv">')
    j = f.index('</section>', i) + len('</section>')
    return f[:i] + bloco + f[j:]


def todas():
    partes = ''
    for k, tit, fn, leg in OPCOES:
        rec = ' <span class="selo selo-ativo op-rec">Recomendada</span>' if k == RECOMENDO[0] else ''
        partes += (f'<div class="op-leg" id="op-{k}"><h2 class="op-tit">{tit}{rec}</h2><p>{leg}</p>'
                   f'<p><a href="{U}opcao-{k}">Ver na página do Funil</a></p></div>' + fn('-' + k))
    return (f'<div class="hn"><div class="pt-cab"><div><p class="sobretitulo">Comercial · para a Carol escolher</p><h1>Funil: três opções</h1><span class="fio" aria-hidden="true"></span>'
            f'<p class="lede">Três formas do bloco “Quanto vira contrato”, com os mesmos dados do Funil (20/08 a 18/11/2026). As três mostram quem saiu sem proposta e por quê.</p></div></div>'
            + aviso('info', 'Recomendação', RECOMENDO[1])
            + partes + '</div>')


CSS = r"""
/* ===== Opções do bloco "Quanto vira contrato" (op-, fa-, fb-, fc-) ===== */
.op-corpo{padding:4px 24px 22px}
.op-leg{margin:36px 0 12px;max-width:80ch}
.op-leg .op-tit{font-size:26px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.op-leg p{margin:6px 0 0;color:var(--texto-2);font-size:14px;line-height:1.55}
.op-leg a{font-weight:500;display:inline-flex;align-items:center;min-height:44px}
.op-rec{font-family:var(--fonte-texto);font-size:12px}
.hn>.aviso{margin-top:20px}
/* A · régua */
.fa{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:56px minmax(180px,260px) minmax(0,1fr);column-gap:16px}
.fa>li{display:contents}
.fa-n{text-align:right;align-self:center}
.fa-r{align-self:center;min-width:0}
.fa-tr{align-self:center;display:block}
.fa-b{display:block;width:var(--p);height:18px;background:var(--vinho);border-radius:3px}
.fa-et .fa-n{font-family:var(--serifa);font-size:34px;font-weight:600;color:var(--vinho);line-height:1;padding:10px 0}
.fa-et .fa-r strong{display:block;font-size:15px;font-weight:500}
.fa-et .fa-r small{display:block;font-size:12px;color:var(--texto-2);line-height:1.4}
.fa-sai .fa-n{font-size:14px;font-weight:600;padding:3px 0}
.fa-sai .fa-r{font-size:13px;color:var(--texto-2);padding:3px 0}
.fa .fu-link{margin-left:4px}
.fb-marcar{min-height:24px}
.fa-sai .fa-b{height:8px;background:var(--papel);box-shadow:inset 0 0 0 1px var(--vinho-4);border-radius:2px}
.fa-sai.fa-aberto .fa-b{background:repeating-linear-gradient(135deg,var(--vinho-4) 0 2px,transparent 2px 6px)}
.fa-passa p{grid-column:2/4;margin:8px 0 2px;font-size:13px;color:var(--texto)}
.fa-passa p b{color:var(--vinho-2);font-size:15px;font-weight:600}
.fa-seta{text-align:right;color:var(--vinho-4);align-self:end;padding-bottom:2px;font-size:16px}
.fa-total{margin:16px 0 0;padding-top:12px;border-top:1px solid var(--divisor);font-size:14px;color:var(--texto-2)}
.fa-total b{color:var(--vinho-2);font-weight:600}
/* B · três números e uma barra */
.fb-nums{list-style:none;margin:6px 0 0;padding:0;display:flex;align-items:flex-start;gap:0}
.fb-et{display:flex;flex-direction:column;gap:2px;min-width:0}
.fb-et b{font-family:var(--serifa);font-size:48px;font-weight:600;color:var(--vinho);line-height:1}
.fb-et span{font-size:13px;color:var(--texto-2)}
.fb-seta{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 18px 0;min-width:0}
.fb-p{font-size:15px;font-weight:600;color:var(--vinho-2)}
.fb-linha{display:block;width:100%;height:1px;background:var(--vinho-4);position:relative}
.fb-linha::after{content:"";position:absolute;right:-1px;top:-4px;border-left:7px solid var(--vinho-4);border-top:4.5px solid transparent;border-bottom:4.5px solid transparent}
.fb-sr{font-size:12px;color:var(--texto-2)}
.fb-onde{margin-top:24px;padding-top:16px;border-top:1px solid var(--divisor)}
.fb-tit{font-family:var(--fonte-texto);font-size:13px;font-weight:500;margin:0 0 10px;color:var(--texto)}
.fb-barra{display:flex;gap:2px;height:22px}
.fb-barra span:first-child{border-radius:3px 0 0 3px}.fb-barra span:last-child{border-radius:0 3px 3px 0}
.fb-c{background:var(--vinho)}.fb-a{background:var(--vinho-4)}.fb-o{background:var(--papel);box-shadow:inset 0 0 0 1.5px var(--vinho-4)}
.fb-np{background:var(--marca-ambar)}.fb-nv{background:var(--marca-ambar-2)}
.fb-at{background:repeating-linear-gradient(135deg,var(--marca-ambar) 0 2px,var(--papel) 2px 6px);box-shadow:inset 0 0 0 1.5px var(--marca-ambar)}
.fb-grupos{display:flex;gap:2px;margin-top:6px;font-size:12px;color:var(--texto-2)}
.fb-grupos span{border-top:1px solid var(--vinho-4);padding-top:4px}
.fb-grupos span+span{text-align:right}
.fb-legs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 32px;margin-top:16px}
.fb-g{margin:0 0 6px;font-size:13px;font-weight:500}
.fb-legs ul{list-style:none;margin:0;padding:0;display:grid;gap:4px}
.fb-legs li{display:grid;grid-template-columns:14px 24px minmax(0,1fr);gap:8px;align-items:center;font-size:13px;color:var(--texto-2)}
.fb-legs li b{color:var(--texto);font-weight:600;text-align:right}
.fb-m{width:14px;height:14px;border-radius:3px;display:block}
.fb-marcar{margin:4px 0 0 46px;font-size:13px}
.fb-marcar .fu-link{margin-left:0}
/* C · livro de contagem */
.fc-frase{margin:6px 0 16px;font-family:var(--serifa);font-size:24px;line-height:1.3;color:var(--texto)}
.fc-frase b{color:var(--vinho);font-weight:600}
.fc-frase span{display:block;font-family:var(--fonte-texto);font-size:13px;color:var(--texto-2);margin-top:2px}
.fc{width:100%;max-width:860px;border-collapse:collapse;font-size:14px}
.fc th,.fc td{text-align:left;font-weight:400;padding:8px 0;border-top:1px solid var(--divisor);vertical-align:middle}
.fc tbody tr:not(.fc-grupo) th{padding-left:16px;width:330px}
.fc th small{font-size:12px;color:var(--texto-2)}
.fc .fc-grupo th{padding:16px 0 6px;border-top:0;display:table-cell}
.fc-grupo th span:first-child{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--vinho-2);font-weight:500;margin-right:12px}
.fc-gq{font-size:12px;color:var(--texto-2)}.fc-gq b{color:var(--texto);font-weight:600}
.fc-q{width:56px;text-align:right!important;font-weight:600;padding-right:20px!important}
.fc-pts{display:flex;flex-wrap:wrap;gap:4px}
.fc-pts i{width:12px;height:12px;border-radius:50%;background:var(--vinho);display:block}
.fc-a i{background:var(--vinho-4)}
.fc-n i{background:var(--marca-ambar)}
.fc-ab i{background:var(--papel);box-shadow:inset 0 0 0 1.5px var(--vinho-4)}
.fc tfoot th,.fc tfoot td{border-top:2px solid var(--vinho);padding-top:10px;font-weight:600}
.fc tfoot th{padding-left:0}
.fc .fc-pe{font-weight:400;font-size:12px;color:var(--texto-2)}
@media (max-width:760px){
  .op-corpo{padding:0 16px 16px}
  .op-leg .op-tit{font-size:22px}
  .fa{grid-template-columns:36px minmax(0,1fr);column-gap:12px}
  .fa-tr{grid-column:2;margin:2px 0 6px}
  .fa-et .fa-n{font-size:28px;padding:6px 0 0}
  .fa-sai .fa-tr{margin:0 0 4px}
  .fa-passa p{grid-column:2}
  .fb-et{flex:1}
  .fb-et b{font-size:34px}
  .fb-et span{font-size:12px;line-height:1.35}
  .fb-seta{flex:none;width:52px;padding:6px 6px 0}
  .fb-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  .fb-legs{grid-template-columns:1fr}
  .fc-frase{font-size:20px}
  .fc,.fc tbody,.fc tfoot{display:block;width:100%}
  .fc .fc-grupo{display:block}.fc .fc-grupo th{display:block;padding-top:14px}
  .fc tfoot tr{display:grid;grid-template-columns:minmax(0,1fr) 40px}
  .fc tfoot th,.fc tfoot td{display:block}
  .fc tbody tr:not(.fc-grupo) th{width:auto;padding-left:8px}
  .fc tbody tr:not(.fc-grupo) th,.fc tbody tr:not(.fc-grupo) td{display:block}
  .fc tbody tr:not(.fc-grupo){display:grid;grid-template-columns:minmax(0,1fr) 40px;border-top:1px solid var(--divisor)}
  .fc tbody tr:not(.fc-grupo) th,.fc tbody tr:not(.fc-grupo) td{border-top:0}
  .fc tbody tr:not(.fc-grupo) .fc-q,.fc tfoot .fc-q{padding-right:0!important;width:auto}
  .fc tbody tr:not(.fc-grupo) .fc-v{grid-column:1/-1;padding:0 0 10px 8px}
  .fc-gq{display:block;margin-top:2px}
  .fc tbody tr:not(.fc-grupo)>*{border:0!important;box-shadow:none}
  .fc tfoot .fc-pe{display:none}
}
"""

A = lambda t: dict(area='comercial', secao='Funil', atual='comercial', trilha='Comercial|Funil', titulo=t)
fecha = CP.j_funil('fechada') + CP.j_voltar()
T = tpl('opcoes', todas(), **A('Funil: três opções'))
for k, tit, fn, _ in OPCOES:
    T += tpl(f'opcao-{k}', troca(fn()) + fecha, **A('Funil'))
out = injetar(CM.out, T, CP.CSS_FU + CSS, padrao='opcoes')
out = out.replace('<title>Comercial ·', '<title>Funil: três opções ·', 1)
open(os.path.join(SAIDA, 'funil-opcoes.html'), 'w', encoding='utf-8').write(out)
print('funil-opcoes ok')
