# Portal · Financeiro · Relatórios do sócio (IN-02 a IN-05, IN-07, IN-08, IN-09, IN-12, IN-14, FI-06, FI-07).
# Reusa sem mudança o comum.py e o financeiro.py aprovados: as peças fi- (folha, barras, tabelas, janelas)
# vêm do financeiro.py, lido até o fim das telas (antes de "estados", que grava o financeiro.html).
# Peças novas com prefixo re-. Uso: python3 relatorios.py <pasta-saida>
import sys, os, re, html
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'

_src = open(os.path.join(AQUI, 'financeiro.py'), encoding='utf-8').read()
_src = _src[:_src.index('# ================================================================= estados')]
_ns = {'__name__': 'financeiro_pecas', '__file__': os.path.join(AQUI, 'financeiro.py')}
_argv = sys.argv[:]
exec(compile(_src, 'financeiro.py', 'exec'), _ns)
sys.argv = _argv
globals().update({k: v for k, v in _ns.items() if not k.startswith('__')})
from dados import *  # noqa: E402

ARQ = 'relatorios.html?estado='
FIN = '../portal-financeiro/financeiro.html?estado='
CLI_FICHA = '../portal-clientes/clientes.html?estado=ficha'
PER = '01/09 a 18/11/2026'
PER_CURTO = 'set–nov'
ANT = 'jun–ago'


def Rs(v):
    """Valor com sinal de menos tipográfico quando negativo."""
    return ('−' + R(-v)) if v < 0 else R(v)


def pct(a, b):
    return round(a / b * 100) if b else 0


def compara(atual, ant, sufixo=ANT, inverso=False):
    d = round(atual - ant, 2)
    if abs(d) < 0.005:
        return f'igual a {sufixo}'
    return f'{R(abs(d))} {"a mais" if d > 0 else "a menos"} que {sufixo}'


CSS_RE = r"""
/* ==========================================================================
   Portal · Financeiro · Relatórios. Prefixo re- nas peças novas.
   Mesma regra de FI-06: o que é do escritório fica na família vinho;
   o que é de terceiros só aparece numa folha com a faixa âmbar-3 e o escudo, e nunca soma.
   ========================================================================== */
.re-barra{display:flex;align-items:center;gap:12px 20px;flex-wrap:wrap;padding:12px 16px 12px 20px;background:var(--papel);border:1px solid var(--borda-folha);border-radius:var(--raio-g);box-shadow:var(--sombra)}
.re-barra .chips{margin-left:0}
.re-barra .re-rot{font-size:12px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--vinho-2)}
.re-per{display:grid;gap:0;font-size:13px;color:var(--texto-2);line-height:1.45;margin-left:auto;text-align:right}
.re-per b{font-weight:500;color:var(--texto)}
.re-vistas{display:flex;gap:6px;flex-wrap:wrap}
.re-vistas a{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;border-radius:22px;border:1px solid var(--borda-folha);background:var(--papel);color:var(--texto-2);font-weight:500;font-size:14px;text-decoration:none}
.re-vistas a .ico{width:18px;height:18px;color:var(--vinho-4)}
.re-vistas a:hover{border-color:var(--vinho-4);color:var(--vinho)}
.re-vistas a[aria-current="page"]{background:var(--vinho);border-color:var(--vinho);color:var(--papel)}
.re-vistas a[aria-current="page"] .ico{color:var(--ambar)}
.re-topo{display:flex;align-items:center;justify-content:space-between;gap:12px 20px;flex-wrap:wrap}

/* "Como contamos": ajuda curta, aberta e fechada pela própria pessoa */
.re-como{background:var(--papel);border:1px solid var(--borda-folha);border-radius:var(--raio-g)}
.re-como summary{display:flex;align-items:center;gap:10px;min-height:48px;padding:0 20px;cursor:pointer;font-weight:500;color:var(--vinho);list-style:none}
.re-como summary::-webkit-details-marker{display:none}
.re-como summary .ico{color:var(--vinho-4)}
.re-como summary .re-seta{margin-left:auto;transition:transform .15s}
.re-como[open] summary .re-seta{transform:rotate(180deg)}
.re-como summary small{font-weight:400;color:var(--texto-2);font-size:12px}
.re-como dl{margin:0;padding:4px 20px 18px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px 28px;border-top:1px solid var(--divisor)}
.re-como dl div{padding-top:12px}
.re-como dt{font-family:var(--serifa);font-size:18px;font-weight:500;color:var(--vinho)}
.re-como dd{margin:4px 0 0;font-size:13px;line-height:1.5;color:var(--texto)}
.re-como dd b{font-weight:600}
.re-como .re-terc dt{display:flex;align-items:center;gap:6px}
.re-como .re-terc dt .ico{width:18px;height:18px;color:var(--vinho)}

/* Os três números do período, no campo vinho */
.re-tres{position:relative;overflow:hidden;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-radius:var(--raio-g);box-shadow:var(--sombra)}
.re .folha-cab .ver{white-space:nowrap}
.re-tres .estatua{position:absolute;right:18px;top:auto!important;bottom:-38px;width:180px;height:180px;color:var(--vinho-2);opacity:.9}
.re-n{position:relative;display:grid;gap:8px;align-content:start;padding:22px 26px 24px;border-left:1px solid rgba(242,205,179,.22)}
.re-n:first-of-type{border-left:0}
.re-n .sobretitulo{color:var(--ambar-2)}
.re-n .fi-big{font-size:42px}
.re-n p{font-size:13px;line-height:1.5;color:var(--sal)}
.re-n p b{font-weight:600;color:var(--papel)}
.re-n .re-cmp{display:flex;align-items:flex-start;gap:8px;color:var(--papel);font-weight:500}
.re-n .re-cmp .ico{width:18px;height:18px;color:var(--ambar);flex:none;margin-top:1px}
.re-n .selo{justify-self:start}
.re-n .re-aparte{margin-top:4px;padding-top:10px;border-top:1px dashed rgba(242,205,179,.35)}

/* Barras do período: este período e o anterior */
.re-grupo-rot{grid-column:1/-1;font-size:12px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--vinho-2);padding-top:6px}
.re-grupo-rot span{letter-spacing:0;text-transform:none;font-weight:400;color:var(--texto-2);margin-left:6px}
.fi-trilho i.re-falta{background:var(--ambar-3);box-shadow:inset 0 0 0 1.5px var(--vinho-4);border-radius:0 4px 4px 0}
.re-soma{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:10px 0 0;border-top:1px solid var(--divisor);font-size:13px;color:var(--texto-2)}
.re-soma b{font-family:var(--serifa);font-size:20px;font-weight:500;color:var(--vinho)}
.re-barras-nome .fi-barra{grid-template-columns:minmax(0,190px) minmax(0,1fr) 128px}
.re-barras-nome .rot a{color:var(--texto);text-decoration:none;display:inline-flex;align-items:center;min-height:44px;margin:-12px 0}
.re-barras-nome .rot a:hover{color:var(--vinho);text-decoration:underline}
.re-barras-nome .val small{white-space:nowrap}
.re-leitura{display:flex;gap:10px;align-items:flex-start;margin:0 24px 18px;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.5}
.re-leitura .ico{color:var(--vinho);flex:none;margin-top:1px}
.re-leitura b{font-weight:600}

/* Rendeu: a conta escrita */
.re-conta{margin:0;padding:0 24px 8px;display:grid}
.re-conta div{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:10px 0;border-top:1px solid var(--divisor);font-size:13px}
.re-conta div:first-child{border-top:0}
.re-conta dt{color:var(--texto)}
.re-conta dt small{display:block;font-size:12px;color:var(--texto-2)}
.re-conta dd{margin:0;font-weight:500;white-space:nowrap}
.re-conta div.re-igual{border-top:2px solid var(--vinho-4)}
.re-conta div.re-igual dt{font-weight:600}
.re-conta div.re-igual dd{font-family:var(--serifa);font-size:22px;color:var(--vinho)}
.re-fora{margin:0 24px 18px;padding:10px 12px;border:1.5px dashed var(--vinho-4);border-radius:var(--raio);font-size:12px;line-height:1.5;color:var(--texto-2);display:flex;gap:8px}
.re-fora .ico{width:16px;height:16px;color:var(--vinho-4);flex:none;margin-top:1px}
.re-fora b{color:var(--texto);font-weight:500}

/* Falta receber: grupos e o que fica à parte */
.re-sub{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:12px 24px 6px;font-size:13px}
.re-sub b{font-weight:500}
.re-sub .fi-v{font-size:15px}
.re-aparte-f{margin:6px 24px 18px;border:1px solid var(--borda-folha);border-radius:var(--raio);overflow:hidden}
.re-aparte-f>p{display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--sal-2);font-size:12px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:var(--vinho-2)}
.re-aparte-f>p .ico{width:16px;height:16px;color:var(--vinho)}
.re-aparte-f ul{list-style:none;margin:0;padding:0}
.re-aparte-f li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 12px;padding:10px 14px;border-top:1px solid var(--divisor);font-size:13px}
.re-aparte-f li small{display:block;font-size:12px;color:var(--texto-2)}
.re-aparte-f li b{font-weight:500}
.re-aparte-f .re-pe{display:flex;justify-content:space-between;gap:12px;padding:10px 14px;border-top:1px solid var(--divisor);font-size:12px;color:var(--texto-2)}
.re-aparte-f .re-pe b{color:var(--vinho);font-weight:600}

/* Terceiros no período (FI-06): fluxo, nunca soma com o escritório */
.re-fluxo{margin:0;padding:0 24px 6px;display:grid}
.re-fluxo div{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 12px;padding:10px 0;border-top:1px solid var(--divisor);font-size:13px}
.re-fluxo div:first-child{border-top:0}
.re-fluxo dt small{display:block;font-size:12px;color:var(--texto-2)}
.re-fluxo dd{margin:0;font-weight:500;white-space:nowrap;text-align:right}
.re-fluxo div.re-saldo{border-top:2px solid var(--ambar-2)}
.re-fluxo div.re-saldo dt{font-weight:600}
.re-fluxo div.re-saldo dd{font-family:var(--serifa);font-size:20px;color:var(--vinho-escuro)}

/* Tabelas dos relatórios */
.re-tab{width:100%}
.re-tab td,.re-tab th{vertical-align:top}
.re-tab th[scope="col"].v,.re-tab td.v{text-align:right}
.re-tab tbody td{padding-top:12px;padding-bottom:12px}
.re-tab tbody th[scope="row"]{padding:14px 16px 12px 24px;border-bottom:1px solid var(--divisor);vertical-align:top;font-size:14px}
.re-tab tbody tr:last-child th{border-bottom:0}
.re-tab td.v{white-space:nowrap;font-variant-numeric:tabular-nums}
.re-tab td.v small{display:block;font-size:12px;color:var(--texto-2);white-space:normal}
.re-tab td.v .selo{margin-top:6px}
.re-tab tfoot th,.re-tab tfoot td{padding:14px 16px;border-top:2px solid var(--vinho-4);font-weight:600;background:#FCFAF8}
.re-tab tfoot th{padding-left:24px;text-align:left}
.re-tab tfoot td{text-align:right;white-space:nowrap}
.re-tab tfoot td small{display:block;font-weight:400;font-size:12px;color:var(--texto-2)}
.re-tab tr.re-neg td.re-rend{color:var(--vinho-3)}
.re-tab th[aria-sort] .ico{width:14px;height:14px;vertical-align:-2px;margin-left:2px;color:var(--vinho)}
.re-tab .re-nome{display:grid;gap:2px}
.re-tab .re-nome a{font-weight:500;color:var(--texto);text-decoration:none;display:inline-flex;align-items:center;min-height:44px;margin:-12px 0 -10px;width:fit-content}
.re-tab .re-nome a:hover{color:var(--vinho);text-decoration:underline}
.re-tab .re-nome strong{font-weight:500}
.re-tab .re-nome small{font-size:12px;color:var(--texto-2);line-height:1.45}
.re-tab .re-nome .selo{justify-self:start;margin-top:4px}
.re-aparte-txt{display:flex;gap:6px;align-items:flex-start;justify-content:flex-end;margin-top:6px;font-size:12px;color:var(--texto-2);white-space:normal;text-align:right}
.re-aparte-txt .ico{width:14px;height:14px;color:var(--vinho-4);flex:none;margin-top:2px}
.re-pessoa{display:flex;align-items:center;gap:12px}
.re-pessoa .av-p{width:40px;height:40px;font-size:13px;flex:none}
.re-pessoa strong{display:block;font-weight:500}
.re-pessoa small{display:block;font-size:12px;color:var(--texto-2)}
.re-carga{display:grid;gap:2px}
.re-carga b{font-family:var(--serifa);font-size:20px;font-weight:500;color:var(--vinho);line-height:1.1}
.re-carga small{font-size:12px;color:var(--texto-2)}
.re-ferr{padding:16px 24px 12px;display:flex;gap:10px 14px;align-items:flex-end;flex-wrap:wrap;border-bottom:1px solid var(--divisor)}
.re-ferr .campo.re-busca{flex:1 1 300px}
.re-busca .campo-busca{display:block}
.re-ferr .campo{max-width:none;flex:0 1 240px;margin:0}
.re-ferr label{font-size:13px}
.re-cont{padding:12px 24px;font-size:13px;color:var(--texto-2)}
.re-cont b{font-weight:500;color:var(--texto)}

/* Relatório de um cliente */
.re-linha-t{list-style:none;margin:0;padding:0 24px 8px}
.re-linha-t>li{display:grid;grid-template-columns:118px minmax(0,1fr);gap:16px;padding:14px 0;border-top:1px solid var(--divisor)}
.re-linha-t>li:first-child{border-top:0}
.re-mes{font-family:var(--serifa);font-size:20px;font-weight:500;color:var(--vinho);line-height:1.2}
.re-mes small{display:block;font-family:var(--sans);font-size:12px;color:var(--texto-2);font-weight:400}
.re-mes b{display:block;font-family:var(--sans);font-size:13px;color:var(--texto);font-weight:500;margin-top:4px}
.re-evs{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.re-evs li{display:grid;grid-template-columns:52px minmax(0,1fr) auto;gap:12px;align-items:start;font-size:13px}
.re-evs time{font-weight:500;color:var(--texto-2);font-variant-numeric:tabular-nums}
.re-evs strong{display:block;font-weight:500}
.re-evs small{display:block;font-size:12px;color:var(--texto-2);line-height:1.45}
.re-evs .fi-v{font-size:14px}
.re-nada{font-size:13px;color:var(--texto-2);padding-top:2px}
.re-links{display:flex;flex-wrap:wrap;gap:8px}
.re-ct td .re-nome small{display:block}
.re-tab .re-nome a{line-height:1.3}
.re-ct .re-nome a{margin:-10px 0 0}

/* Sem acesso, vazio, carregando */
.re-esq-tres{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;background:var(--papel);border:1px solid var(--borda-folha);border-radius:var(--raio-g);overflow:hidden}
.re-esq-tres>div{display:grid;gap:12px;padding:24px 26px;border-left:1px solid var(--divisor)}
.re-esq-tres>div:first-child{border-left:0}
.re-esq-folha{padding:6px 24px 22px;display:grid;gap:16px}
.re-esq-linha{display:grid;grid-template-columns:120px minmax(0,1fr) 120px;gap:14px;align-items:center}

.re .fi-passos{grid-template-columns:repeat(3,minmax(0,1fr))}
.janela .re-atalhos{display:flex;gap:6px;flex-wrap:wrap}
.janela .re-atalhos button{min-height:44px;padding:0 14px;border-radius:22px;border:1px solid var(--borda-folha);background:var(--papel);font:inherit;font-size:13px;color:var(--texto-2);cursor:pointer}
.janela .re-atalhos button:hover{border-color:var(--vinho-4);color:var(--vinho)}

@media (max-width:760px){
  .re-barra{padding:12px 14px;gap:10px}
  .re-barra .chips{width:100%}
  .re-barra .chips button{flex:1 1 calc(50% - 6px);justify-content:center}
  .re-per{margin-left:0;text-align:left}
  .re-vistas{display:grid;grid-template-columns:1fr 1fr;gap:6px;width:100%}
  .re-vistas a{justify-content:center;padding:0 8px;font-size:13px;border-radius:var(--raio)}
  .re-topo{gap:10px}
  .re-como summary{padding:8px 16px;flex-wrap:wrap;gap:4px 10px}
  .re-como summary small{flex-basis:100%;order:3}
  .re-como dl{grid-template-columns:1fr;padding:0 16px 16px;gap:6px}
  .re-tres{grid-template-columns:1fr}
  .re-n{border-left:0;border-top:1px solid rgba(242,205,179,.22);padding:18px 16px 20px}
  .re-n:first-of-type{border-top:0}
  .re-n .fi-big{font-size:36px}
  .re-tres .estatua{width:120px;height:120px;top:-20px;bottom:auto;right:-16px}
  .re-barras-nome .fi-barra{grid-template-columns:minmax(0,1fr) auto}
  .re-leitura,.re-fora,.re-aparte-f{margin-left:16px;margin-right:16px}
  .re-conta,.re-fluxo{padding-left:16px;padding-right:16px}
  .re-sub{padding-left:16px;padding-right:16px}
  .re-ferr{padding:14px 16px 12px}
  .re-ferr .campo{flex:1 1 100%}
  .re-cont{padding:12px 16px}
  .re-linha-t{padding:0 16px 8px}
  .re-linha-t>li{grid-template-columns:1fr;gap:8px}
  .re-evs li{grid-template-columns:44px minmax(0,1fr);}
  .re-evs li .fi-v{grid-column:2}
  .re-esq-tres{grid-template-columns:1fr}
  .re-esq-tres>div{border-left:0;border-top:1px solid var(--divisor);padding:18px 16px}
  .re-esq-tres>div:first-child{border-top:0}
  .re-esq-folha{padding:4px 16px 18px}
  .re-esq-linha{grid-template-columns:1fr 90px}
  .re-esq-linha>:nth-child(2){display:none}
  .re .fi-passos{grid-template-columns:1fr}
  .cartao .c-dados dd small{display:block;font-weight:400;font-size:12px;color:var(--texto-2)}
}
"""

# ---------------------------------------------------------------- peças do alto
VISTAS = [('visao', 'Visão geral', 'funcoes'), ('clientes', 'Por cliente', 'pessoas'), ('areas', 'Por área', 'balanca'), ('responsaveis', 'Por responsável', 'cracha')]


def cab(botao=True):
    b = f'<button class="btn btn-sec" type="button" data-janela="janela-exportar">{ico("baixar")}Exportar</button>' if botao else ''
    return cab_secao('Financeiro', 'Relatórios', 'Um período inteiro, comparado com o anterior: quanto entrou, quanto falta receber e quanto rendeu, por cliente, por área e por responsável.', b)


def barra_periodo(desab=False):
    d = ' disabled' if desab else ''
    ch = (f'<div class="chips" role="group" aria-label="Período">'
          f'<button type="button" aria-pressed="false"{d}>Este mês</button><button type="button" aria-pressed="true"{d}>Últimos 3 meses</button>'
          f'<button type="button" aria-pressed="false"{d}>Este ano</button>'
          f'<button type="button" aria-pressed="false" data-janela="janela-periodo" aria-haspopup="dialog"{d}>{ico("agenda", "ico ico-s")}Escolher datas</button></div>')
    return (f'<section class="re-barra" aria-label="Período do relatório">{ch}'
            f'<p class="re-per"><b>{PER}</b><span>comparado com 01/06 a 31/08/2026</span></p></section>')


def vistas(atual):
    a = ''.join(f'<a href="{ARQ}{k}"{" aria-current=\"page\"" if k == atual else ""}>{ico(i)}{n}</a>' for k, n, i in VISTAS)
    return f'<nav class="re-vistas" aria-label="Ver o relatório">{a}</nav>'


def como(aberto=False):
    o = ' open' if aberto else ''
    return (f'<details class="re-como"{o}><summary>{ico("ajuda")}Como contamos<small>O que entra em cada número, em poucas linhas</small>{ico("baixo", "ico re-seta")}</summary><dl>'
            f'<div><dt>Entrou</dt><dd>Honorários que entraram no caixa do escritório no período, <b>pelo dia em que o dinheiro entrou</b>. A parcela de outubro paga em novembro conta em novembro. Nunca inclui dinheiro de terceiros.</dd></div>'
            f'<div><dt>Falta receber</dt><dd>Parcelas em aberto: as <b>vencidas</b>, por idade, e as <b>a vencer até o fim de cada contrato</b>. Mensalidade sem data de fim conta só até este mês. A parte do escritório em RPV e precatório fica <b>à parte</b>, com a data estimada.</dd></div>'
            f'<div><dt>Rendeu</dt><dd>O que entrou <b>menos as despesas de caso que o escritório adiantou</b> (custas, perícia) e que ainda não voltaram. Não desconta aluguel, salários nem outras despesas fixas: essa conta é a DRE, que depende do contador.</dd></div>'
            f'<div><dt>Contratado</dt><dd>Parcelas e mensalidades que venceram ou vencem no período, pelos contratos. O êxito entra quando acontece.</dd></div>'
            f'<div><dt>Comparação</dt><dd>Com o período anterior do mesmo tamanho. Neste caso, junho a agosto. O mês de hoje ainda está aberto, e isso aparece escrito.</dd></div>'
            f'<div class="re-terc"><dt>{ico("escudo")}De terceiros</dt><dd>Alvarás, RPVs e acordos do cliente só aparecem na folha com a faixa âmbar. Passam pelo escritório e são repassados: <b>nunca somam</b> com os números do escritório.</dd></div>'
            f'</dl></details>')


def alto(atual, aberto=False):
    return f'{cab()}{barra_periodo()}<div class="re-topo">{vistas(atual)}</div>{como(aberto)}'


# ---------------------------------------------------------------- os três números
def tres():
    falta_ant = compara(FALTA, FALTA_ANT, 'em 31/08')
    e = (f'<section class="re-n" aria-labelledby="n-entrou"><p class="sobretitulo" id="n-entrou">Entrou · {PER_CURTO}</p><p><span class="fi-big num">{R(ENTROU)}</span></p>'
         f'<p class="re-cmp">{ico("historico")}<span>{compara(ENTROU, ENTROU_ANT)} ({R(ENTROU_ANT)})</span></p>'
         f'<p>Novembro ainda está aberto. Se entrar o previsto até 30/11 (<b>{R(PREV_NOV_FALTA)}</b>), o período fecha <b>{compara(ENTROU + PREV_NOV_FALTA, ENTROU_ANT)}</b>.</p></section>')
    f = (f'<section class="re-n" aria-labelledby="n-falta"><p class="sobretitulo" id="n-falta">Falta receber · hoje</p><p><span class="fi-big num">{R(FALTA)}</span></p>'
         f'{selo("urgente", f"{R(VENCIDO)} vencidos", "alerta")}'
         f'<p class="re-cmp">{ico("historico")}<span>{falta_ant} ({R(FALTA_ANT)}). Vencido era {R(VENCIDO_ANT)}.</span></p>'
         f'<p class="re-aparte">Mais <b>{R(RPV_TOTAL)}</b> de RPV e precatório, à parte: só a parte do escritório, com data estimada.</p></section>')
    r = (f'<section class="re-n" aria-labelledby="n-rendeu"><p class="sobretitulo" id="n-rendeu">Rendeu · {PER_CURTO}</p><p><span class="fi-big num">{R(RENDEU)}</span></p>'
         f'<p class="re-cmp">{ico("historico")}<span>{compara(RENDEU, RENDEU_ANT)} ({R(RENDEU_ANT)})</span></p>'
         f'<p>Entrou menos <b>{R(ADIANT)}</b> de despesas de caso que o escritório adiantou e ainda não voltaram. Sem aluguel e salários.</p></section>')
    return f'<div class="re-tres campo-vinho">{ico("coluna", "ico estatua")}{e}{f}{r}</div>'


# ---------------------------------------------------------------- folhas da visão geral
MES_NOME = {'set': 'Setembro', 'out': 'Outubro', 'nov': 'Novembro'}


def folha_meses():
    mx = 50000
    bar = f'<p class="re-grupo-rot">Este período<span>{PER}</span></p>'
    for m in MESES:
        v = MES_TOTAL[m]
        if m == 'nov':
            tr = (f'<span class="fi-trilho" aria-hidden="true"><i class="real" style="width:{v / mx * 100:.1f}%"></i>'
                  f'<i class="re-falta" style="left:{v / mx * 100:.1f}%;width:{PREV_NOV_FALTA / mx * 100:.1f}%"></i></span>')
            val = f'<span class="val"><b class="num">{R(v)}</b><small>até hoje · mais {R(PREV_NOV_FALTA)} previstos</small></span>'
            rot = f'<span class="rot">{MES_NOME[m]}<small>até hoje</small></span>'
        else:
            tr = f'<span class="fi-trilho" aria-hidden="true"><i class="real" style="width:{v / mx * 100:.1f}%"></i></span>'
            val = f'<span class="val"><b class="num">{R(v)}</b></span>'
            rot = f'<span class="rot">{MES_NOME[m]}</span>'
        bar += f'<div class="fi-barra">{rot}{tr}{val}</div>'
    bar += f'<p class="re-grupo-rot">Período anterior<span>01/06 a 31/08/2026</span></p>'
    for n, v in ANTERIOR:
        bar += (f'<div class="fi-barra"><span class="rot">{n}</span><span class="fi-trilho" aria-hidden="true"><i class="tipo4" style="width:{v / mx * 100:.1f}%"></i></span>'
                f'<span class="val"><b class="num">{R(v)}</b></span></div>')
    leg = (f'<p class="legenda fi-leg"><span><i style="background:var(--vinho)"></i>Entrou neste período</span>'
           f'<span><i style="background:var(--ambar-3);box-shadow:inset 0 0 0 1px var(--vinho-4)"></i>Previsto até 30/11</span>'
           f'<span><i style="background:var(--vinho-4)"></i>Entrou no período anterior</span></p>')
    soma = (f'<div class="fi-barras" style="padding-top:0"><p class="re-soma"><span>Este período, até hoje</span><b class="num">{R(ENTROU)}</b></p>'
            f'<p class="re-soma" style="border-top:0;padding-top:0"><span>Período anterior</span><b class="num" style="color:var(--texto-2)">{R(ENTROU_ANT)}</b></p></div>')
    return folha('t-meses', 'Entrou mês a mês', f'<div class="fi-barras" role="group" aria-label="Entrou por mês, neste período e no anterior">{bar}</div>{leg}{soma}',
                 sub='Honorários pelo dia em que o dinheiro entrou. Valores de terceiros ficam fora.', icone='moeda', acoes=ver('Caixa', FIN + 'caixa'))


def top_clientes(n=5):
    ordem = sorted(POR_CLIENTE.items(), key=lambda x: -x[1]['entrou'])
    return ordem[:n], ordem


def link_cli(nome):
    return ARQ + 'cliente' if nome == 'Construtora Vale Alto Ltda.' else ARQ + 'cliente'


def folha_top_clientes():
    top, todos = top_clientes()
    mx = top[0][1]['entrou']
    bar = ''
    for nome, d in top:
        enc = ' · encerrado' if nome in INATIVOS else ''
        bar += (f'<div class="fi-barra"><span class="rot"><a href="{link_cli(nome)}">{nome}</a><small>{d["contratos"]} contrato{"s" if d["contratos"] > 1 else ""}{enc}</small></span>'
                f'<span class="fi-trilho" aria-hidden="true"><i class="real" style="width:{d["entrou"] / mx * 100:.1f}%"></i></span>'
                f'<span class="val"><b class="num">{R(d["entrou"])}</b><small>{pct(d["entrou"], ENTROU)}% do período</small></span></div>')
    soma5 = sum(d['entrou'] for _, d in top)
    leit = (f'<p class="re-leitura">{ico("ajuda")}<span>Os 5 maiores trouxeram <b>{pct(soma5, ENTROU)}%</b> do que entrou. Dois deles são êxito de caso já encerrado '
            f'(Padaria Pão Nobre e João Pedro Alves): é dinheiro que não se repete no próximo período.</span></p>')
    return folha('t-topcli', 'Maiores clientes', f'<div class="fi-barras re-barras-nome" role="group" aria-label="Os 5 clientes que mais trouxeram no período">{bar}</div>{leit}',
                 sub=f'Por quanto entrou no período. São {len(todos)} clientes com contrato no período.', icone='pessoas', acoes=ver('Todos por cliente', ARQ + 'clientes'))


def folha_top_areas():
    ordem = sorted(POR_AREA.items(), key=lambda x: -x[1]['entrou'])
    mx = ordem[0][1]['entrou']
    bar = ''
    for nome, d in ordem:
        sub = f'{len(d["casos"])} caso{"s" if len(d["casos"]) != 1 else ""}' if nome != 'Sem caso ligado' else f'{d["sem_caso"]} contratos'
        bar += (f'<div class="fi-barra"><span class="rot"><a href="{ARQ}areas">{nome}</a><small>{sub}</small></span>'
                f'<span class="fi-trilho" aria-hidden="true"><i class="real" style="width:{d["entrou"] / mx * 100:.1f}%"></i></span>'
                f'<span class="val"><b class="num">{R(d["entrou"])}</b><small>{pct(d["entrou"], ENTROU)}%</small></span></div>')
    return folha('t-toparea', 'Por área do direito', f'<div class="fi-barras re-barras-nome" role="group" aria-label="Entrou por área do direito">{bar}</div>'
                 f'<p class="re-leitura">{ico("ajuda")}<span>"Sem caso ligado" são as assessorias mensais, a consultoria e as consultas: contratos que não têm um processo por trás.</span></p>',
                 sub='A área é a do caso ligado ao contrato.', icone='balanca', acoes=ver('Detalhe por área', ARQ + 'areas'))


def folha_falta():
    bar = ''.join(f'<div class="fi-barra"><span class="rot">{r}</span><span class="fi-trilho" aria-hidden="true"><i class="urg" style="width:{v / 5850 * 100:.1f}%"></i></span>'
                  f'<span class="val"><b class="num">{R(v)}</b><small>{q}</small></span></div>' for r, q, v in IDADE)
    rpv = ''.join(f'<li><span><b>{cli.split(" ")[0] if "Ltda" not in cli else cli} · {t}</b><small>{caso} · {quando}</small></span><span class="fi-v num">{R(v)}</span></li>'
                  for cli, caso, t, v, quando in RPV)
    corpo = (f'<p class="re-sub"><span><b>Vencido</b> · 4 parcelas</span><span class="fi-v num" style="color:var(--vinho-3)">{R(VENCIDO)}</span></p>'
             f'<div class="fi-barras" role="group" aria-label="Vencido por idade do atraso">{bar}</div>'
             f'<p class="re-sub" style="border-top:1px solid var(--divisor)"><span><b>A vencer em novembro</b> · 8 parcelas</span><span class="fi-v num">{R(A_VENCER_NOV)}</span></p>'
             f'<p class="re-sub"><span><b>A vencer depois</b>, até o fim dos contratos</span><span class="fi-v num">{R(A_VENCER_DEPOIS)}</span></p>'
             f'<p class="fi-total"><span>Parcelas em aberto</span><b class="num">{R(FALTA)}</b></p>'
             f'<div class="re-aparte-f"><p>{ico("balanca")}À parte · não soma acima</p><ul>{rpv}</ul>'
             f'<p class="re-pe"><span>Parte do escritório em RPV e precatório</span><b class="num">{R(RPV_TOTAL)}</b></p></div>')
    return folha('t-falta', 'Falta receber', corpo, sub='Hoje, de todos os contratos. Para cobrar, vá a A receber.', icone='alerta', acoes=ver('A receber', FIN + 'receber'))


def folha_rendeu():
    corpo = (f'<dl class="re-conta"><div><dt>Entrou</dt><dd class="num">{R(ENTROU)}</dd></div>'
             f'<div><dt>Despesas de caso adiantadas que não voltaram<small>Custas de Daniela Rocha Mendes ({R(485)}) e perícia de Hélio Batista Corrêa ({R(900)})</small></dt><dd class="num">− {R(ADIANT)}</dd></div>'
             f'<div class="re-igual"><dt>Rendeu</dt><dd class="num">{R(RENDEU)}</dd></div></dl>'
             f'<p class="re-fora">{ico("cadeado")}<span><b>Fora desta conta:</b> aluguel, salários, impostos e retiradas. O resultado depois das despesas fixas é a DRE, que ainda depende do contador.</span></p>')
    return folha('t-rendeu', 'Rendeu', corpo, sub='O que ficou para o escritório no período, antes das despesas fixas.', icone='funcoes', acoes=ver('A pagar', FIN + 'pagar'))


def folha_terceiros(cliente=None):
    if cliente:
        corpo = (f'<ul class="fi-linhas"><li class="fi-linha" style="grid-template-columns:minmax(0,1fr) auto"><div class="fi-quem"><strong>Alvará · Vale Alto x Concreto Forte</strong>'
                 f'<small>Entrou em 04/11 · repassado à Construtora em 05/11, com o comprovante</small></div><div class="fi-lado"><span class="fi-v num">{R(6300)}</span>{selo("ok", "Repassado", "check")}</div></li></ul>'
                 f'<p class="pt-pe-folha">{ico("escudo")}<span>Era da cliente: a ação de cobrança tem honorários fixos, sem êxito. Não entra em nenhum número acima.</span></p>')
        return folha('t-terc', 'Passou pelo escritório', corpo, sub='Dinheiro da cliente que entrou e foi repassado', icone='enviar', terc=True)
    corpo = (f'<dl class="re-fluxo">'
             f'<div><dt>Entrou de terceiros<small>6 valores: 3 RPVs, 2 depósitos de acordo e 1 alvará</small></dt><dd class="num">{R(T_ENTROU)}</dd></div>'
             f'<div><dt>Repassado a clientes<small>João Pedro, Padaria Pão Nobre, Construtora Vale Alto e Irene</small></dt><dd class="num">{R(T_REPASS)}</dd></div>'
             f'<div><dt>Honorários que passaram ao escritório<small>Já contados em Entrou, no dia da transferência. Não somar de novo.</small></dt><dd class="num">{R(T_HON)}</dd></div>'
             f'<div><dt>Reembolso de despesa ao escritório<small>Laudo que o escritório adiantou no caso de Irene</small></dt><dd class="num">{R(T_REEMB)}</dd></div>'
             f'<div class="re-saldo"><dt>Ainda na conta, a repassar ou transferir</dt><dd class="num">{R(T_CONTA)}</dd></div></dl>'
             f'<p class="pt-pe-folha">{ico("escudo")}<span>Não é do escritório e não soma com Entrou, Falta receber ou Rendeu. É o mesmo saldo de terceiros do Caixa.</span></p>')
    return folha('t-terc', 'Passou pelo escritório', corpo, sub=f'Alvarás, RPVs e acordos dos clientes, de {PER}', icone='enviar', terc=True,
                 acoes=ver('Repasses', FIN + 'repasses'))


def visao():
    return (f'<div class="fi re">{alto("visao", aberto=True)}{tres()}<div class="fi-grade"><div class="fi-col">{folha_meses()}{folha_top_clientes()}{folha_top_areas()}</div>'
            f'<aside class="fi-col" aria-label="Falta receber, rendeu e terceiros">{folha_falta()}{folha_rendeu()}{folha_terceiros()}</aside></div></div>')


# ---------------------------------------------------------------- por cliente
def nome_cli(nome, d):
    resp = ', '.join(sorted(d['resp'], key=RESP_ORDEM.index))
    s = selo('neutro', 'Inativo') if nome in INATIVOS else ''
    return (f'<div class="re-nome"><a href="{link_cli(nome)}">{nome}</a><small>{d["contratos"]} contrato{"s" if d["contratos"] > 1 else ""} · {resp}</small>{s}</div>')


def falta_cel(d, dentro_tab=True):
    sel = selo('urgente', f'{R(d["vencido"])} vencido', 'alerta') if d['vencido'] else ''
    ap = ''.join(f'<span class="re-aparte-txt">{ico("balanca")}<span>{t}: {R(v)}, à parte</span></span>' for t, v, _ in d['rpv_txt'])
    return f'<b class="num" style="font-weight:500">{R(d["falta"])}</b>{"<br>" + sel if sel else ""}{ap}'


def rend_cel(d):
    if d['rendeu'] < 0:
        return f'<b class="num" style="font-weight:600">{Rs(d["rendeu"])}</b><small>adiantou mais do que entrou</small>'
    return f'<b class="num" style="font-weight:600">{R(d["rendeu"])}</b>'


def clientes():
    _, todos = top_clientes()
    ferr = (f'<form class="re-ferr" role="search" action="#" onsubmit="return false">'
            f'<div class="campo re-busca"><label for="re-busca">Buscar cliente</label><span class="campo-busca">{ico("busca")}<input class="entrada" id="re-busca" type="search" placeholder="Nome do cliente" autocomplete="off"></span></div>'
            + selecao('re-ordem', 'Ordenar por', ['Entrou, do maior para o menor', 'Falta receber, do maior', 'Vencido, do maior', 'Rendeu, do menor para o maior', 'Nome, de A a Z'], 'Entrou, do maior para o menor')
            + selecao('re-area', 'Área', ['Todas as áreas'] + AREAS_ORDEM, 'Todas as áreas') + '</form>')
    rows, car = '', ''
    for nome, d in todos:
        neg = ' class="re-neg"' if d['rendeu'] < 0 else ''
        adi = R(d['adiant']) if d['adiant'] else '<span class="fi-pq">—</span>'
        rows += (f'<tr{neg}><td>{nome_cli(nome, d)}</td><td class="v num">{R(d["contratado"])}</td><td class="v num"><b style="font-weight:600">{R(d["entrou"])}</b></td>'
                 f'<td class="v">{falta_cel(d)}</td><td class="v num">{adi}</td><td class="v re-rend">{rend_cel(d)}</td></tr>')
    # celular: 8 cartões e "mostrar mais"
    for nome, d in todos[:6] + [x for x in todos if x[0] in ('Hélio Batista Corrêa', 'Daniela Rocha Mendes')]:
        sel = selo('urgente', f'{R(d["vencido"])} vencido', 'alerta') if d['vencido'] else ''
        ina = selo('neutro', 'Inativo') if nome in INATIVOS else ''
        ap = ''.join(f'<small>{t}: {R(v)}, à parte</small>' for t, v, _ in d['rpv_txt'])
        car += (f'<li class="cartao"><div class="c-topo"><div><a class="c-nome" href="{link_cli(nome)}">{nome}</a><small>{d["contratos"]} contrato{"s" if d["contratos"] > 1 else ""} · {", ".join(sorted(d["resp"], key=RESP_ORDEM.index))}</small></div>'
                f'<span class="fi-cartao-v num" style="margin-left:auto">{R(d["entrou"])}</span></div>'
                f'<dl class="c-dados"><dt>Contratado</dt><dd class="num">{R(d["contratado"])}</dd><dt>Falta receber</dt><dd class="num">{R(d["falta"])}{ap}</dd>'
                f'<dt>Despesas não reembolsadas</dt><dd class="num">{R(d["adiant"])}</dd><dt>Rendeu</dt><dd class="num">{Rs(d["rendeu"])}</dd></dl>'
                + (f'<div class="c-selos">{sel}{ina}</div>' if sel or ina else '') + '</li>')
    tot = CONTRATADO
    tab = (f'<table class="so-pc fi-tab re-tab"><caption class="sr">Por cliente, de {PER}, ordenado por quanto entrou</caption>'
           f'<colgroup><col style="width:27%"><col style="width:13%"><col style="width:13%"><col style="width:19%"><col style="width:13%"><col style="width:15%"></colgroup>'
           f'<thead><tr><th scope="col">Cliente</th><th scope="col" class="v">Contratado</th><th scope="col" class="v" aria-sort="descending">Entrou{ico("baixo")}</th>'
           f'<th scope="col" class="v">Falta receber</th><th scope="col" class="v">Despesas não reembolsadas</th><th scope="col" class="v">Rendeu</th></tr></thead><tbody>{rows}</tbody>'
           f'<tfoot><tr><th scope="row">{len(todos)} clientes</th><td class="num">{R(tot)}</td><td class="num">{R(ENTROU)}</td><td class="num">{R(FALTA)}<small>{R(VENCIDO)} vencidos · mais {R(RPV_TOTAL)} à parte</small></td>'
           f'<td class="num">{R(ADIANT)}</td><td class="num">{R(RENDEU)}</td></tr></tfoot></table>')
    cart = (f'<ul class="cartoes so-cel" aria-label="Por cliente">{car}</ul>'
            f'<p class="mais so-cel"><span>Mostrando 8 de {len(todos)} clientes</span><button class="btn btn-sec" type="button">Mostrar mais</button></p>'
            f'<dl class="fi-dl so-cel" style="padding-top:12px;border-top:1px solid var(--divisor)"><div><dt>Entrou, {len(todos)} clientes</dt><dd class="num">{R(ENTROU)}</dd></div>'
            f'<div><dt>Falta receber</dt><dd class="num">{R(FALTA)}<br><span class="fi-pq">{R(VENCIDO)} vencidos</span></dd></div><div><dt>Rendeu</dt><dd class="num">{R(RENDEU)}</dd></div></dl>')
    pe = f'<p class="pt-pe-folha">{ico("ajuda")}<span>Hélio e Daniela renderam menos que zero: o escritório adiantou custas e perícia no caso e o dinheiro ainda não voltou. O reembolso está combinado em A pagar.</span></p>'
    f = (f'<section class="folha" aria-labelledby="t-cli" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-cli">{ico("pessoas")}Por cliente</h2>'
         f'<p class="sub">Cada cliente com o que foi contratado, o que entrou, o que falta e o que rendeu no período.</p></div>{ver("Cobrar em A receber", FIN + "receber")}</div>'
         f'{ferr}<p class="re-cont" role="status"><b>{len(todos)} clientes</b> com contrato no período · do que mais trouxe para o que menos trouxe</p>{tab}{cart}{pe}</section>')
    return f'<div class="fi re">{alto("clientes")}{f}</div>'


# ---------------------------------------------------------------- relatório de um cliente (Construtora Vale Alto)
def cliente():
    d = POR_CLIENTE['Construtora Vale Alto Ltda.']
    dir_ = (f'<section class="dir campo-ambar" aria-labelledby="t-dir"><p class="sobretitulo" id="t-dir">Em atraso</p>'
            f'<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><p class="grande num">{R(3200)}</p>{selo("urgente", "8 dias", "alerta")}</div>'
            f'<p class="fi-oque"><b>Mensalidade de novembro.</b> Venceu em 10/11.<br>Próxima ação: 25/11, Felipe confere se o boleto foi pago.</p>'
            f'<a class="btn btn-pri" href="{FIN}receber">{ico("moeda")}Ver em A receber</a></section>')
    cab_ = (f'<div class="ficha-cab"><div class="esq campo-vinho">{ico("coluna", "ico estatua")}'
            f'<a class="voltar" href="{ARQ}clientes">{ico("esq", "ico ico-s")}Por cliente</a>'
            f'<div class="ident"><div><p class="sobretitulo">Relatório do cliente · {PER}</p><h1>Construtora Vale Alto Ltda.</h1>'
            f'<p class="meta"><span class="selo" style="background:var(--ambar-3);color:var(--vinho)">Ativo</span><span>3 contratos · 2 casos</span><span class="sep" aria-hidden="true"></span><span>responsável Felipe Matos</span></p></div></div></div>{dir_}</div>')
    quatro = (f'<dl class="fi-quatro"><div><dt>Contratado no período</dt><dd class="num">{R(d["contratado"])}</dd></div><div><dt>Entrou</dt><dd class="num">{R(d["entrou"])}</dd></div>'
              f'<div><dt>Falta receber</dt><dd class="num urg">{R(d["falta"])}</dd></div><div><dt>Rendeu</dt><dd class="num">{R(d["rendeu"])}</dd></div></dl>'
              f'<p class="re-leitura" style="margin-top:14px">{ico("historico")}<span>Entrou <b>{R(4850)} a mais que jun–ago</b> ({R(9600)}, só a assessoria). A diferença é a entrada do caso tributário e a primeira parcela da cobrança.</span></p>')
    resumo_f = folha('t-num', 'No período', quatro, sub='Contratado, entrou, falta receber e rendeu, como nas outras visões.', icone='funcoes')
    cts = [
        ('Assessoria mensal', 'Sem caso ligado', '—', f'{R(3200)} por mês · boleto · dia 10', 6400, 3200, 'mensalidade de novembro vencida', '#'),
        ('Ação de cobrança', 'Cível', 'Vale Alto x Concreto Forte', f'3 parcelas de {R(2400)} · cheque pré-datado', 2400, 4800, 'parcelas 2/3 (28/11) e 3/3 (28/12)', '#'),
        ('Entrada e 20% do recuperado', 'Tributário', 'Vale Alto x Prefeitura de Santo André', f'Entrada de {R(5650)} · êxito de 20%', 5650, 0, 'êxito ainda sem data', '#'),
    ]
    rows, car = '', ''
    for ct, area, caso, cond, ent, falta, ftxt, _ in cts:
        lk_caso = (f'<a href="../portal-juridico/juridico.html?estado=ficha">{caso}</a>' if caso != '—' else '<span class="fi-pq">Sem caso ligado</span>')
        rows += (f'<tr><td><div class="re-nome"><a href="#">{ct}</a><small>{cond}</small></div></td><td><div class="re-nome">{lk_caso if caso != "—" else ""}<small>{area}</small></div></td>'
                 f'<td class="v num"><b style="font-weight:600">{R(ent)}</b></td><td class="v"><b class="num" style="font-weight:500">{R(falta)}</b><small>{ftxt}</small></td></tr>')
        car += (f'<li class="cartao"><div class="c-topo"><div><a class="c-nome" href="#">{ct}</a><small>{cond}</small></div></div>'
                f'<dl class="c-dados"><dt>Área</dt><dd>{area}</dd><dt>Caso</dt><dd>{caso if caso != "—" else "Sem caso ligado"}</dd><dt>Entrou</dt><dd class="num">{R(ent)}</dd><dt>Falta receber</dt><dd class="num">{R(falta)}</dd></dl></li>')
    tab = (f'<table class="so-pc fi-tab re-tab re-ct"><caption class="sr">Contratos e casos de Construtora Vale Alto</caption><colgroup><col style="width:34%"><col style="width:30%"><col style="width:14%"><col style="width:22%"></colgroup>'
           f'<thead><tr><th scope="col">Contrato</th><th scope="col">Caso e área</th><th scope="col" class="v">Entrou</th><th scope="col" class="v">Falta receber</th></tr></thead><tbody>{rows}</tbody>'
           f'<tfoot><tr><th scope="row">3 contratos</th><td></td><td class="num">{R(d["entrou"])}</td><td class="num">{R(d["falta"])}</td></tr></tfoot></table>'
           f'<ul class="cartoes so-cel" aria-label="Contratos e casos">{car}</ul>'
           f'<p class="pt-pe-folha">{ico("ajuda")}<span>As mensalidades de dezembro em diante não entram em Falta receber: a assessoria não tem data de fim. Elas aparecem na previsão do Caixa.</span></p>')
    contratos_f = folha('t-ct', 'Contratos e casos', tab, sub='O que a Construtora contratou e de onde veio cada valor.', icone='pena',
                        acoes=f'<a class="btn btn-sec" href="{CLI_FICHA}">{ico("pessoas")}Ficha do cliente</a>')
    linha = [
        ('Setembro', 8850, [('08/09', 'Entrada · Vale Alto x Prefeitura', 'Tributário · Pix · recibo 2026-0124', 5650), ('10/09', 'Mensalidade de setembro', 'Assessoria · boleto pago no dia', 3200)]),
        ('Outubro', 5600, [('13/10', 'Mensalidade de outubro', 'Assessoria · boleto pago com 3 dias de atraso', 3200),
                           ('28/10', 'Parcela 1/3 · ação de cobrança', f'Cível · cheque compensado. Veio junto o reembolso das custas iniciais ({R(486.20)}), que não conta como honorário', 2400)]),
        ('Novembro', 0, []),
    ]
    li = ''
    for m, tot, evs in linha:
        e = ''.join(f'<li><time>{dt}</time><span><strong>{o}</strong><small>{s}</small></span><span class="fi-v num">{R(v)}</span></li>' for dt, o, s, v in evs)
        if not evs:
            e = f'<li style="grid-template-columns:1fr"><p class="re-nada">Nada entrou até hoje. A mensalidade venceu em 10/11 e está em atraso.</p></li>'
        sub = '<small>até hoje</small>' if m == 'Novembro' else ''
        li += f'<li><p class="re-mes">{m}{sub}<b class="num">{R(tot)}</b></p><ol class="re-evs">{e}</ol></li>'
    entrou_f = folha('t-linha', 'O que entrou', f'<ol class="re-linha-t">{li}</ol><p class="fi-total"><span>4 recebimentos no período</span><b class="num">{R(d["entrou"])}</b></p>',
                     sub='Pelo dia em que o dinheiro entrou, com o contrato de cada valor.', icone='historico')
    falta_f = folha('t-falta', 'O que falta', (
        f'<ul class="fi-linhas">'
        f'<li class="fi-linha fi-venc"><div class="fi-quem"><strong>Mensalidade de novembro</strong><small>Assessoria mensal · venceu em 10/11 · boleto</small>'
        f'<p class="fi-motivo"><b>Motivo:</b> vai pagar junto com a medição da obra, no dia 25.</p><p class="fi-prox">{ico("relogio")}Próxima ação: <b>25/11, conferir se o boleto foi pago</b> · Felipe Matos</p></div>'
        f'<div class="fi-lado"><span class="fi-v forte num">{R(3200)}</span>{selo("urgente", "8 dias", "alerta")}</div></li>'
        f'<li class="fi-linha" style="grid-template-columns:minmax(0,1fr) auto"><div class="fi-quem"><strong>Parcela 2/3 · ação de cobrança</strong><small>Vence em 28/11 · cheque guardado no cofre</small></div><span class="fi-v num">{R(2400)}</span></li>'
        f'<li class="fi-linha" style="grid-template-columns:minmax(0,1fr) auto"><div class="fi-quem"><strong>Parcela 3/3 · ação de cobrança</strong><small>Vence em 28/12 · cheque guardado no cofre</small></div><span class="fi-v num">{R(2400)}</span></li></ul>'
        f'<p class="fi-total"><span>3 parcelas em aberto</span><b class="num">{R(d["falta"])}</b></p>'), sub='Para cobrar, o caminho é A receber.', icone='alerta',
        acoes=ver('A receber', FIN + 'receber'))
    adi_f = folha('t-adi', 'O que o escritório adiantou', (
        f'<ul class="fi-linhas"><li class="fi-linha" style="grid-template-columns:minmax(0,1fr) auto"><div class="fi-quem"><strong>Custas iniciais · ação de cobrança</strong>'
        f'<small>Pagas pelo escritório em 12/08 · voltaram em 28/10, junto com a parcela 1/3</small></div><div class="fi-lado"><span class="fi-v num">{R(486.20)}</span>{selo("ok", "Voltou", "check")}</div></li></ul>'
        f'<p class="fi-total"><span>Não reembolsado</span><b class="num">{R(0)}</b></p>'), sub='Despesas de caso que viram reembolso (FI-07). Só o que não voltou diminui o Rendeu.', icone='reenviar')
    return (f'<div class="fi re">{cab_}{barra_periodo()}<div class="fi-grade"><div class="fi-col">{resumo_f}{contratos_f}{entrou_f}</div>'
            f'<aside class="fi-col" aria-label="O que falta e o que foi adiantado">{falta_f}{adi_f}{folha_terceiros(cliente=True)}</aside></div></div>')


# ---------------------------------------------------------------- por área
def areas():
    ordem = [(a, POR_AREA[a]) for a in AREAS_ORDEM]
    mx = 40000
    bar = ''
    for nome, d in ordem:
        ant = AREA_ANT[nome]
        bar += (f'<div class="fi-barra"><span class="rot">{nome}</span><span class="fi-duplo" aria-hidden="true"><span class="fi-trilho"><i class="tipo4" style="width:{max(ant / mx * 100, 0):.1f}%"></i></span>'
                f'<span class="fi-trilho"><i class="real" style="width:{d["entrou"] / mx * 100:.1f}%"></i></span></span>'
                f'<span class="val"><b class="num">{R(d["entrou"])}</b><small>{ANT}: {R(ant)}</small></span></div>')
    graf = (f'<div class="fi-barras re-barras-nome" role="group" aria-label="Entrou por área, neste período e em junho a agosto">{bar}</div>'
            f'<p class="legenda fi-leg"><span><i style="background:var(--vinho-4)"></i>Junho a agosto (barra de cima)</span><span><i style="background:var(--vinho)"></i>Setembro a novembro (barra de baixo)</span></p>')
    leit = (f'<p class="re-leitura">{ico("ajuda")}<span><b>Previdenciário caiu {R(AREA_ANT["Previdenciário"] - POR_AREA["Previdenciário"]["entrou"])}</b> contra jun–ago, que teve mais RPVs pagos. '
            f'Os honorários do RPV de Benedito ({R(6469.97)}) ainda não contam: passam ao escritório depois do repasse a ele. '
            f'<b>Saúde e Tributário</b> são contratos novos deste período.</span></p>')
    g = folha('t-graf', 'Entrou por área', graf + leit, sub='Comparado com junho a agosto.', icone='moeda')
    rows, car = '', ''
    for nome, d in ordem:
        nc = len(d['casos'])
        if nome == 'Sem caso ligado':
            casos_h = f'<div class="re-carga"><b>—</b><small>{d["sem_caso"]} contratos sem caso</small></div>'
            porcaso = '<span class="fi-pq">não se aplica</span>'
            pc_txt = 'não se aplica'
        else:
            enc = f' · {len(d["enc"])} encerrado no período' if d['enc'] else ''
            casos_h = f'<div class="re-carga"><b class="num">{nc}</b><small>caso{"s" if nc != 1 else ""}{enc}</small></div>'
            porcaso = R(round(d['rendeu'] / nc, 2))
            pc_txt = porcaso
        sel = selo('urgente', f'{R(d["vencido"])} vencido', 'alerta') if d['vencido'] else ''
        ap = ''.join(f'<span class="re-aparte-txt">{ico("balanca")}<span>{t} de {"Hélio" if t == "Precatório" else ("Benedito" if v == 6469.97 else "Eduardo")}: {R(v)}, à parte</span></span>' for t, v, _ in d['rpv_txt'])
        adi = f'<small>− {R(d["adiant"])} adiantados</small>' if d['adiant'] else ''
        rows += (f'<tr><th scope="row" style="font-weight:500;text-align:left">{nome}</th><td>{casos_h}</td><td class="v num"><b style="font-weight:600">{R(d["entrou"])}</b><small>{pct(d["entrou"], ENTROU)}% do período</small></td>'
                 f'<td class="v"><b class="num" style="font-weight:500">{R(d["falta"])}</b>{"<br>" + sel if sel else ""}{ap}</td>'
                 f'<td class="v num"><b style="font-weight:600">{R(d["rendeu"])}</b>{adi}</td><td class="v num">{porcaso}</td></tr>')
        car += (f'<li class="cartao"><div class="c-topo"><div><strong class="c-nome">{nome}</strong><small>{"%d contratos sem caso" % d["sem_caso"] if nome == "Sem caso ligado" else "%d caso%s" % (nc, "s" if nc != 1 else "")}</small></div>'
                f'<span class="fi-cartao-v num" style="margin-left:auto">{R(d["entrou"])}</span></div>'
                f'<dl class="c-dados"><dt>Falta receber</dt><dd class="num">{R(d["falta"])}</dd><dt>Rendeu</dt><dd class="num">{R(d["rendeu"])}</dd><dt>Rendeu por caso</dt><dd class="num">{pc_txt}</dd></dl>'
                + (f'<div class="c-selos">{sel}</div>' if sel else '') + '</li>')
    ncasos = len(CASOS)
    tab = (f'<table class="so-pc fi-tab re-tab"><caption class="sr">Por área do direito, de {PER}</caption>'
           f'<colgroup><col style="width:17%"><col style="width:15%"><col style="width:16%"><col style="width:22%"><col style="width:15%"><col style="width:15%"></colgroup>'
           f'<thead><tr><th scope="col">Área</th><th scope="col">Casos no período</th><th scope="col" class="v">Entrou</th><th scope="col" class="v">Falta receber</th><th scope="col" class="v">Rendeu</th><th scope="col" class="v">Rendeu por caso</th></tr></thead>'
           f'<tbody>{rows}</tbody><tfoot><tr><th scope="row">8 áreas</th><td style="text-align:left">{ncasos} casos<small>e 7 contratos sem caso</small></td><td class="num">{R(ENTROU)}</td>'
           f'<td class="num">{R(FALTA)}<small>mais {R(RPV_TOTAL)} à parte</small></td><td class="num">{R(RENDEU)}</td><td class="num">{R(round((RENDEU - POR_AREA["Sem caso ligado"]["rendeu"]) / ncasos, 2))}<small>média dos casos</small></td></tr></tfoot></table>'
           f'<ul class="cartoes so-cel" aria-label="Por área">{car}</ul>')
    pe = (f'<p class="pt-pe-folha">{ico("ajuda")}<span>A área é a do caso ligado ao contrato, como está em Jurídico. "Casos no período" conta os casos em andamento em algum dia do período, '
          f'inclusive os que encerraram. "Rendeu por caso" divide o Rendeu da área por esses casos.</span></p>')
    t = folha('t-areas', 'Por área do direito', tab + pe, sub='Entrou, falta receber e rendeu de cada área, com os casos de cada uma.', icone='balanca')
    return f'<div class="fi re">{alto("areas")}{g}{t}</div>'


# ---------------------------------------------------------------- por responsável
INI = {'Marina Ribeiro': 'MR', 'Felipe Matos': 'FM', 'Diego Almeida': 'DA', 'Larissa Costa': 'LC', 'Gustavo Lima': 'GL'}
PAPEL = {'Marina Ribeiro': 'Sócia dona', 'Felipe Matos': 'Advogado', 'Diego Almeida': 'Advogado', 'Larissa Costa': 'Advogada', 'Gustavo Lima': 'Advogado'}


def responsaveis():
    ordem = sorted(POR_RESP.items(), key=lambda x: -x[1]['entrou'])
    mx = ordem[0][1]['entrou']
    bar = ''.join(f'<div class="fi-barra"><span class="rot">{n}<small>{len(d["casos"])} caso{"s" if len(d["casos"]) != 1 else ""}</small></span><span class="fi-trilho" aria-hidden="true"><i class="real" style="width:{d["entrou"] / mx * 100:.1f}%"></i></span>'
                  f'<span class="val"><b class="num">{R(d["entrou"])}</b><small>{pct(d["entrou"], ENTROU)}% do período</small></span></div>' for n, d in ordem)
    rows, car = '', ''
    for n, d in ordem:
        nc = len(d['casos'])
        enc = f', {len(d["enc"])} encerrado' if d['enc'] else ''
        sel = selo('urgente', f'{R(d["vencido"])} vencido', 'alerta') if d['vencido'] else ''
        adi = R(d['adiant']) if d['adiant'] else '<span class="fi-pq">—</span>'
        rows += (f'<tr><th scope="row" style="text-align:left;font-weight:400"><span class="re-pessoa"><span class="av-p forte" aria-hidden="true">{INI[n]}</span><span><strong>{n}</strong><small>{PAPEL[n]}</small></span></span></th>'
                 f'<td><div class="re-carga"><b class="num">{nc}</b><small>caso{"s" if nc != 1 else ""}{enc}</small><small>{d["sem_caso"]} contrato{"s" if d["sem_caso"] != 1 else ""} sem caso</small></div></td>'
                 f'<td class="v num"><b style="font-weight:600">{R(d["entrou"])}</b></td><td class="v"><b class="num" style="font-weight:500">{R(d["falta"])}</b>{"<br>" + sel if sel else ""}</td>'
                 f'<td class="v num">{adi}</td><td class="v num"><b style="font-weight:600">{R(d["rendeu"])}</b></td></tr>')
        car += (f'<li class="cartao"><div class="c-topo"><span class="av-p forte" aria-hidden="true" style="width:40px;height:40px;font-size:13px">{INI[n]}</span><div><strong class="c-nome">{n}</strong><small>{nc} casos · {d["sem_caso"]} sem caso</small></div>'
                f'<span class="fi-cartao-v num" style="margin-left:auto">{R(d["entrou"])}</span></div>'
                f'<dl class="c-dados"><dt>Falta receber</dt><dd class="num">{R(d["falta"])}</dd><dt>Despesas não reembolsadas</dt><dd class="num">{R(d["adiant"])}</dd><dt>Rendeu</dt><dd class="num">{R(d["rendeu"])}</dd></dl>'
                + (f'<div class="c-selos">{sel}</div>' if sel else '') + '</li>')
    tab = (f'<table class="so-pc fi-tab re-tab"><caption class="sr">Por responsável, de {PER}</caption>'
           f'<colgroup><col style="width:24%"><col style="width:16%"><col style="width:14%"><col style="width:18%"><col style="width:14%"><col style="width:14%"></colgroup>'
           f'<thead><tr><th scope="col">Responsável</th><th scope="col">Carga</th><th scope="col" class="v" aria-sort="descending">Entrou{ico("baixo")}</th><th scope="col" class="v">Falta receber</th>'
           f'<th scope="col" class="v">Despesas não reembolsadas</th><th scope="col" class="v">Rendeu</th></tr></thead><tbody>{rows}</tbody>'
           f'<tfoot><tr><th scope="row">5 pessoas</th><td style="text-align:left">{len(CASOS)} casos<small>e 7 contratos sem caso</small></td><td class="num">{R(ENTROU)}</td><td class="num">{R(FALTA)}<small>{R(VENCIDO)} vencidos</small></td>'
           f'<td class="num">{R(ADIANT)}</td><td class="num">{R(RENDEU)}</td></tr></tfoot></table>'
           f'<ul class="cartoes so-cel" aria-label="Por responsável">{car}</ul>')
    pe = (f'<p class="pt-pe-folha">{ico("ajuda")}<span>O responsável é o do contrato, o mesmo do caso quando há caso. Um caso com dois clientes (Pereira x Mercado Bom Preço) conta uma vez. '
          f'Bianca Torres não aparece: cuida do Financeiro, mas não é responsável por contrato.</span></p>'
          f'<div class="fi-reserva">{ico("cadeado")}<span><b>Este número não é a parte de cada um.</b> A divisão de honorários entre sócios (FI-11) ainda está em validação com os pilotos.</span></div>')
    g = folha('t-graf', 'Entrou por responsável', f'<div class="fi-barras re-barras-nome" role="group" aria-label="Entrou por responsável">{bar}</div>'
              f'<p class="re-leitura">{ico("ajuda")}<span>Felipe responde por <b>{pct(POR_RESP["Felipe Matos"]["entrou"], ENTROU)}%</b> do que entrou: as duas assessorias de construtoras e o acordo da Padaria Pão Nobre. '
              f'Marina tem mais a receber ({R(POR_RESP["Marina Ribeiro"]["falta"])}).</span></p>', sub='Quem cuida dos contratos que trouxeram o dinheiro.', icone='cracha')
    t = folha('t-resp', 'Por responsável', tab + pe, sub='Entrou, falta receber e casos de cada pessoa (a carga, IN-08).', icone='cracha')
    return f'<div class="fi re">{alto("responsaveis")}<div class="fi-grade fi-grade-meio" style="grid-template-columns:minmax(0,1fr)">{g}</div>{t}</div>'


# ---------------------------------------------------------------- janelas
def j_periodo(erro=False):
    res = aviso('urgencia', 'Falta acertar 2 pontos, marcados abaixo.', 'O relatório continua mostrando 01/09 a 18/11/2026.') if erro else ''
    de = campo('pe-de', 'De', '31/09/2026' if erro else '01/07/2026', im='numeric', foco=not erro, ajuda='dd/mm/aaaa',
               erro='Setembro tem 30 dias. Confira o dia.' if erro else '')
    ate = campo('pe-ate', 'Até', '15/08/2026' if erro else '30/09/2026', im='numeric', ajuda='dd/mm/aaaa. Pode ser hoje, 18/11/2026, ou antes.',
                erro='A data final é antes da inicial. Escolha uma data depois de "De".' if erro else '')
    if erro:
        de = de.replace('<input', '<input data-foco', 1)
    atal = (f'<div><p class="fi-rotulo" id="pe-at" style="margin-bottom:8px">Atalhos</p><div class="re-atalhos" role="group" aria-labelledby="pe-at">'
            f'<button type="button">Mês passado</button><button type="button">Últimos 6 meses</button><button type="button">Ano passado</button></div></div>')
    cmp_ = ('<fieldset class="fi-grupo-op"><legend>Comparar com</legend>'
            '<label class="opcao"><input class="marcar" type="radio" name="pe-cmp" checked><span>O período anterior, do mesmo tamanho<small>' + ('Aparece quando as datas estiverem certas.' if erro else '01/04 a 30/06/2026') + '</small></span></label>'
            '<label class="opcao"><input class="marcar" type="radio" name="pe-cmp"><span>O mesmo período do ano passado<small>' + ('Aparece quando as datas estiverem certas.' if erro else '01/07 a 30/09/2025') + '</small></span></label>'
            '<label class="opcao"><input class="marcar" type="radio" name="pe-cmp"><span>Não comparar</span></label></fieldset>')
    corpo = res + atal + f'<div class="fi-dois">{de}{ate}</div>' + cmp_ + f'<p class="fi-ref">{ico("ajuda")}<span>Até 2 anos por vez. Datas antes do primeiro recebimento registrado (03/02/2026) aparecem vazias.</span></p>'
    pe = f'<button class="btn btn-sec" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="button">{ico("check")}Ver o relatório</button>'
    return janela('janela-periodo', 'Relatórios', 'Escolher datas', 'O relatório mostra o período que você escolher, com a comparação embaixo de cada número.', corpo, pe, abrir=True)


def j_exportar():
    corpo = (f'<div class="fi-alvo">{ico("pessoas")}<div><strong>Por cliente · {PER}</strong><small>O relatório aberto agora, comparado com 01/06 a 31/08/2026</small></div><span class="fi-v num">{R(ENTROU)}</span></div>'
             + f'<div><p class="fi-rotulo" style="margin-bottom:6px">O que vai no arquivo</p><ul class="fi-check">'
             + f'<li>{ico("check")}<span>Os três números do período, com a comparação e o "Como contamos"</span></li>'
             + f'<li>{ico("check")}<span>18 clientes, com contratado, entrou, falta receber, despesas não reembolsadas e rendeu<small>Total no pé: {R(ENTROU)} entrou, {R(FALTA)} falta receber</small></span></li>'
             + f'<li>{ico("check")}<span>Por área e por responsável, uma aba cada</span></li>'
             + f'<li>{ico("check")}<span>41 recebimentos, um por linha, com dia, cliente, contrato e forma</span></li>'
             + f'<li>{ico("escudo")}<span>Valores de terceiros numa aba à parte<small>6 valores, {R(T_ENTROU)} no período. Não são do escritório e não somam com as outras abas.</small></span></li></ul></div>'
             + f'<fieldset class="fi-grupo-op"><legend>Formato</legend><label class="opcao"><input class="marcar" type="radio" name="ex-f" checked><span>Planilha (.xlsx)<small>Uma aba por visão e a de terceiros. Valores com centavos, prontos para somar.</small></span></label>'
             + f'<label class="opcao"><input class="marcar" type="radio" name="ex-f"><span>PDF para ler e imprimir<small>As mesmas folhas desta tela; terceiros numa página à parte.</small></span></label></fieldset>'
             + f'<p class="fi-ref">{ico("historico")}<span>O arquivo fica no histórico do escritório, com quem baixou e quando. Ele tem dados de clientes: guarde com cuidado.</span></p>')
    pe = f'<button class="btn btn-sec" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="button" data-foco>{ico("baixar")}Baixar planilha</button>'
    return janela('janela-exportar', 'Relatórios', 'Exportar o relatório', 'Baixe o relatório aberto, com o mesmo período e a mesma comparação.', corpo, pe, abrir=True)


# ---------------------------------------------------------------- vazio, carregando, erro, sem acesso
def vazio():
    passos = [
        ('1', 'Cadastre os contratos', 'Cada contrato de honorários gera as parcelas. É delas que saem Contratado e Falta receber.', f'<a class="btn btn-pri" href="../portal-comercial-contratos/comercial.html">{ico("pena")}Ir para Contratos</a>'),
        ('2', 'Ligue cada contrato a um caso', 'É o caso que diz a área do direito. Assessoria e consulta podem ficar sem caso: aparecem como "Sem caso ligado".', f'<a class="btn btn-sec" href="../portal-juridico/juridico.html">{ico("balanca")}Abrir Jurídico</a>'),
        ('3', 'Registre os recebimentos', 'O primeiro recebimento registrado em A receber já monta o Entrou, por cliente, área e responsável.', f'<a class="btn btn-sec" href="{FIN}receber">{ico("moeda")}Abrir A receber</a>'),
    ]
    li = ''.join(f'<li><span class="disco"><span>{n}</span></span><h3>{t}</h3><p>{p}</p>{b}</li>' for n, t, p, b in passos)
    est = estado('Ainda não há o que comparar', 'Os relatórios aparecem com o primeiro recebimento registrado. Até lá, nada aqui fica com número inventado.', 'funcoes', moldura=False)
    return (f'<div class="fi re">{cab(False)}{barra_periodo(desab=True)}<section class="folha" aria-labelledby="t-vz"><h2 class="sr" id="t-vz">Primeiros passos</h2>{est}<ol class="fi-passos">{li}</ol></section></div>')


def esq_linhas(n):
    return ''.join(f'<div class="re-esq-linha"><span class="esqueleto esq-linha" style="height:12px;width:80%"></span><span class="esqueleto esq-linha" style="height:14px;width:{90 - i * 12}%"></span>'
                   f'<span class="esqueleto esq-linha" style="height:12px;width:100%"></span></div>' for i in range(n))


def carregando():
    tres_ = ''.join(f'<div><span class="esqueleto esq-linha" style="width:50%;height:11px"></span><span class="esqueleto" style="width:75%;height:38px"></span>'
                    f'<span class="esqueleto esq-linha" style="width:85%;height:11px"></span></div>' for _ in range(3))
    folha_esq = lambda t, n: (f'<section class="folha" aria-labelledby="{t[0]}"><div class="folha-cab"><div><h2 id="{t[0]}">{ico(t[2])}{t[1]}</h2><p class="sub">Carregando…</p></div></div>'
                              f'<div class="re-esq-folha" aria-hidden="true">{esq_linhas(n)}</div></section>')
    corpo = (f'<div class="re-esq-tres" aria-hidden="true">{tres_}</div><div class="fi-grade"><div class="fi-col">{folha_esq(("t-c1", "Entrou mês a mês", "moeda"), 6)}{folha_esq(("t-c2", "Maiores clientes", "pessoas"), 5)}</div>'
             f'<div class="fi-col">{folha_esq(("t-c3", "Falta receber", "alerta"), 4)}{folha_esq(("t-c4", "Rendeu", "funcoes"), 3)}</div></div>')
    return (f'<div class="fi re">{alto("visao")}<div id="re-relatorio" aria-busy="true" style="display:flex;flex-direction:column;gap:24px">'
            f'<p class="sr" role="status">Montando o relatório de 01/09 a 18/11/2026…</p>{corpo}</div></div>')


def erro():
    e = estado('Não deu para montar o relatório', 'O servidor não respondeu. Nenhum dado se perdeu: os recebimentos estão todos em A receber e no Caixa. Tente de novo em alguns segundos.',
               erro=True, h='h2', acoes=f'<button class="btn btn-pri" type="button">{ico("reenviar")}Tentar de novo</button><a class="btn btn-sec" href="{FIN}receber">{ico("moeda")}Abrir A receber</a>',
               codigo='Código para o suporte: REL-4B17-1811')
    return f'<div class="fi re">{alto("visao")}{e}</div>'


def sem_acesso():
    e = estado('Os relatórios ficam com a sócia dona', 'Nesta versão, só Marina Ribeiro abre os relatórios do sócio, porque eles mostram quanto rendeu cada cliente e cada pessoa. '
               'Quem decide quem vê é ela. O resto do Financeiro continua com você.', 'cadeado', h='h1', papel='status',
               acoes=f'<a class="btn btn-pri" href="{FIN}resumo">{ico("carteira")}Ir para o Resumo</a><a class="btn btn-sec" href="{FIN}caixa">{ico("moeda")}Abrir o Caixa</a>')
    return f'<div class="fi re">{e}</div>'


# ================================================================= estados
def A(titulo='Relatórios', trilha=None, secao='Relatórios', **kw):
    d = dict(area='financeiro', secao=secao, atual='financeiro', trilha=trilha or 'Financeiro|Relatórios', titulo=titulo)
    d.update(kw)
    return d


T = ''
T += tpl('visao', visao(), **A())
T += tpl('clientes', clientes(), **A('Por cliente', 'Financeiro|Relatórios|Por cliente'))
T += tpl('cliente', cliente(), **A('Construtora Vale Alto Ltda.', 'Financeiro|Relatórios|Construtora Vale Alto Ltda.'))
T += tpl('areas', areas(), **A('Por área', 'Financeiro|Relatórios|Por área'))
T += tpl('responsaveis', responsaveis(), **A('Por responsável', 'Financeiro|Relatórios|Por responsável'))
T += tpl('periodo', visao() + j_periodo(), **A('Escolher datas'))
T += tpl('periodo-erro', visao() + j_periodo(erro=True), **A('Escolher datas'))
T += tpl('exportar', clientes() + j_exportar(), **A('Exportar o relatório', 'Financeiro|Relatórios|Por cliente'))
T += tpl('vazio', vazio(), **A())
T += tpl('carregando', carregando(), **A())
T += tpl('erro', erro(), **A())
T += tpl('sem-acesso', sem_acesso(), **A('Financeiro', 'Financeiro', secao='sem-relatorios', quem='bianca'))

# Barra de seções: as cinco aprovadas mais Relatórios (só para a sócia dona). Para Bianca, sem Relatórios.
SECOES = [('Resumo', FIN + 'resumo'), ('A receber', FIN + 'receber'), ('A pagar', FIN + 'pagar'), ('Repasses', FIN + 'repasses'), ('Caixa', FIN + 'caixa')]


def barra(com_rel=True):
    b = barra_area('financeiro', 'nenhuma')
    for s, href in SECOES:
        b = b.replace(f'<a href="#">{H(s)}</a>', f'<a href="{href}">{H(s)}</a>', 1)
    if com_rel:
        b = b.replace('</nav></div>', f'<a href="{ARQ}visao" aria-current="page">Relatórios</a></nav></div>', 1)
    return b


barras = (f'<template data-barra="financeiro|Relatórios">{barra(True)}</template>\n'
          f'<template data-barra="financeiro|sem-relatorios">{barra(False)}</template>\n')

out = pagina('Relatórios', 'Relatórios do sócio no Financeiro do Portal: quanto entrou, quanto falta receber e quanto rendeu no período, por cliente, por área e por responsável.',
             '{"estado":"visao","atual":"financeiro"}', '', T, barras)
out = out.replace('</style>', CSS_FI + '\n' + CSS_RE + '\n</style>', 1)
# Pessoa de exemplo deste desenho: Bianca Torres (Contratos e Financeiro, não é dona), a mesma do Início por áreas aprovado
out = out.replace("'sem-area':{", "bianca:{nome:'Bianca Torres',ini:'B',papel:'Áreas: Contratos e Financeiro',areas:['contratos','financeiro'],dono:false},\n    'sem-area':{", 1)
assert "bianca:{" in out
# O trilho e o Mais levam o Financeiro ao Resumo aprovado; o Início, ao Início por áreas aprovado
out = out.replace('href="#" data-nav="financeiro"', f'href="{FIN}resumo" data-nav="financeiro"')
out = out.replace('href="moldura.html?estado=sem-area" data-nav="inicio"', 'href="../portal-inicio-areas/inicio.html?estado=dona" data-nav="inicio"')
open(os.path.join(SAIDA, 'relatorios.html'), 'w', encoding='utf-8').write(out)
print('relatorios ok', T.count('<template data-est='), 'estados')
