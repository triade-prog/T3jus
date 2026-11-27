# Portal · o êxito com baixa sem receber na divisão do alvará (F3.174: FI-24, FI-05, FI-25) e o
# "Baixado sem receber" nos Relatórios do sócio (F3.173: IN-04, IN-07). Desenho para a Carol aprovar.
# Base técnica, lida sem mudança: financeiro.py, comum.py, relatorios.py e dados.py aprovados (portal-relatorios,
# os mesmos de portal-exito-conferir). A janela "Registrar alvará ou RPV" segue o código de hoje
# (FinanceiroRepasses.tsx, JanelaRegistrar), com o CSS rp- de portal.css copiado abaixo.
# Peças novas: prefixo eb- (Repasses) e rb- (Relatórios). Elenco do D35 (portal-baixa-parcela-motivo).
# Uso: python3 exito_baixado.py <pasta-saida>
import os, sys, re, json, html, types
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
H = lambda s: html.escape(s, quote=True)


def _pecas(arq, marca, ns_extra=None):
    src = open(os.path.join(AQUI, arq), encoding='utf-8').read()
    src = src[:src.rindex('\n' + marca) + 1]
    ns = {'__name__': arq[:-3] + '_pecas', '__file__': os.path.join(AQUI, arq)}
    if ns_extra:
        ns.update(ns_extra)
    argv = sys.argv[:]
    exec(compile(src, arq, 'exec'), ns)
    sys.argv = argv
    return types.SimpleNamespace(**ns)


EST = '# ================================================================= estados'

# ---------------------------------------------------------------- dados dos Relatórios: os aprovados + Rita e Noemi
# Rita Fonseca e Noemi Bastos Carvalho entram com os contratos delas. Nada entrou delas no período, então
# Entrou e Rendeu não mudam; a 6/6 de Noemi voltou para Em atraso em 12/11 (o desfazer), e Falta receber sobe R$ 1.000,00.
_d = open(os.path.join(AQUI, 'dados.py'), encoding='utf-8').read()
_d = _d.replace("]\nINATIVOS",
                "    C('Rita Fonseca', 'Só êxito (30%) · C-2026-021', 'Fonseca x Banco Aurora', 'Consumidor', 'Marina Ribeiro', (0, 0, 0), 4800),\n"
                "    C('Noemi Bastos Carvalho', '6 parcelas de R$ 1.000,00 · C-2026-012', 'Carvalho x Construtora Lume', 'Cível', 'Felipe Matos', (0, 0, 0), 1000, vencido=1000, dias_venc=39),\n"
                "]\nINATIVOS", 1)
_d = _d.replace('FALTA == 42070 and VENCIDO == 7050', 'FALTA == 43070 and VENCIDO == 8050', 1)
_d = _d.replace('FALTA_ANT, VENCIDO_ANT, RENDEU_ANT = 38940,', 'FALTA_ANT, VENCIDO_ANT, RENDEU_ANT = 39940,', 1)  # REVISAO-DESENHO 5
_d = _d.replace("('31 a 60 dias', 'nenhuma', 0)", "('31 a 60 dias', '1 parcela', 1000)", 1)
assert 'RENDEU_ANT = 39940,' in _d and 'Rita Fonseca' in _d and 'FALTA == 43070' in _d and "'1 parcela', 1000" in _d
_mod = types.ModuleType('dados')
exec(compile(_d, 'dados.py', 'exec'), _mod.__dict__)
sys.modules['dados'] = _mod

F = _pecas('financeiro.py', EST)
RL = _pecas('relatorios.py', EST)
from comum import tpl, janela, aviso, ico, pagina, barra_area  # noqa: E402

R, selo, folha, campo, selecao, ver = F.R, F.selo, F.folha, F.campo, F.selecao, F.ver
FARQ = 'financeiro.html?estado='
RARQ = 'relatorios.html?estado='

QUEM = ("diego:{nome:'Diego Almeida',ini:'D',papel:'Áreas: Comercial e Financeiro',areas:['comercial','financeiro'],dono:false},\n"
        "    'sem-area':{")

# ====================================================================================== Parte A · Repasses (eb-)
RITA, PN = 'Rita Fonseca', 'Rita'
CT_R, CASO_R = 'C-2026-021', 'Fonseca x Banco Aurora'
EXPL_R = 'Rita disse que o banco não pagou o acordo; não vamos cobrar agora.'
POR_QUE = 'O alvará de R$ 16.000,00 entrou em 18/11 e paga o êxito.'
ALV, HON, CUS = 16000, 4800, 412.30

CSS_RP = r"""
/* ===== Repasses: o CSS rp- de hoje (sistema/packages/ui/src/portal.css), copiado sem mudança ===== */
.fi-quem .rp-baixa{display:flex;gap:6px;align-items:flex-start;color:var(--vinho)}
.fi-quem .rp-baixa .ico{flex:none;width:14px;height:14px;margin-top:2px}
.rp-div{border:0;margin:0;padding:0;display:grid;gap:12px;min-width:0}
.rp-div legend{font-size:13px;font-weight:500;color:var(--texto);padding:0;margin-bottom:8px}
.rp-tab td{vertical-align:middle}
.rp-valor .rp-valor-in{display:flex;align-items:center;justify-content:flex-end;gap:4px;flex-wrap:nowrap}
.rp-valor .entrada{width:120px;text-align:right}
.rp-tab tr.rp-cliente td{background:#FCFAF8}
@media (max-width:760px){
  .rp-tab colgroup,.rp-tab thead{display:none}
  .rp-tab,.rp-tab tbody{display:block;width:100%}
  .rp-tab tr{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px 12px;align-items:center;padding:12px 0;border-top:1px solid var(--divisor)}
  .rp-tab td{display:block;padding:0!important;border:0!important;background:transparent!important}
  .rp-tab td:first-child{grid-column:1/-1}
  .rp-tab tr.rp-cliente{background:#FCFAF8;padding:12px 10px}
  .rp-valor .entrada{width:110px}
}
"""

CSS_EB = r"""
/* ==========================================================================
   Repasses · o êxito com baixa sem receber na divisão (F3.174). Prefixo eb-.
   Só tokens e pares já aprovados. O aviso é o aviso-atencao do D2 (fundo âmbar suave, texto tinta),
   abaixo da tabela, dentro do quadro "Divisão"; na célula de honorários, só a linha curta.
   ========================================================================== */
.fi-quem .eb-cel{display:flex;gap:6px;align-items:flex-start;color:var(--texto);font-weight:500}
.fi-quem .eb-cel .ico{flex:none;width:14px;height:14px;margin-top:2px;color:var(--vinho)}
.eb-aviso{display:grid;gap:10px;padding:16px 16px 16px 20px;border-radius:var(--raio-g);background:var(--atencao-fundo-suave,#FBEFE6);position:relative;overflow:hidden}
.eb-aviso::before{content:"";position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--ambar)}
.eb-aviso h3{display:flex;gap:10px;align-items:flex-start;margin:0;font-family:var(--fonte-texto,inherit);font-size:14px;font-weight:600;color:var(--texto);line-height:1.45}
.eb-aviso h3 .ico{flex:none;width:18px;height:18px;margin-top:1px;color:var(--texto)}
.eb-txt{display:grid;gap:8px}
.eb-aviso p{margin:0;font-size:13px;line-height:1.5;color:var(--texto)}
.eb-det{color:var(--texto)}
.eb-det b{font-weight:500}
.eb-expl{padding-left:12px;border-left:2px solid var(--vinho-4)}
.eb-expl q{font-family:var(--serifa);font-style:italic;font-size:15px}
.eb-ops{border:0;margin:4px 0 0;padding:0;min-width:0}
.eb-ops legend{font-weight:600;font-size:13px;margin-bottom:8px;padding:0;color:var(--texto)}
.eb-ops .erro-msg{margin:0 0 8px}
.eb-ops-l{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.eb-ops .opcao{border:1px solid var(--borda-folha);border-radius:var(--raio);padding:12px 12px;margin:0;background:var(--papel);min-height:44px}
.eb-ops .opcao:has(input:checked){border-color:var(--vinho);box-shadow:inset 0 0 0 1px var(--vinho)}
.eb-ops .opcao span{font-weight:500}
.eb-ops .opcao small{font-weight:400;margin-top:2px;line-height:1.45}
.eb-ops .opcao:has(input[aria-invalid="true"]){border-color:var(--vinho-3)}
.eb-porque{margin-top:10px;padding:12px 14px;border-radius:var(--raio);background:var(--papel);border:1px solid var(--borda-folha)}
.eb-porque textarea.entrada{min-height:72px}
.eb-nota{display:flex;gap:10px;align-items:flex-start;margin-top:10px!important;padding:10px 14px;border-radius:var(--raio);background:var(--papel);border:1px solid var(--borda-folha)}
.eb-nota .ico{flex:none;width:16px;height:16px;margin-top:2px;color:var(--vinho)}
.eb-resumo ul{margin:6px 0 0;padding-left:18px}
.eb-resumo a{display:inline-flex;align-items:center;min-height:44px;color:var(--vinho);font-weight:500}
.eb-num{white-space:nowrap}
.eb-velha{display:flex;gap:10px;align-items:flex-start;margin:0;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);color:var(--texto)}
.eb-velha .ico{flex:none;width:16px;height:16px;margin-top:2px;color:var(--vinho)}
.eb-hist-novo p{font-weight:400}
.eb-hist-novo q{font-family:var(--serifa);font-style:italic}
@media (max-width:760px){
  .janela.fi-larga{width:100%}  /* como portal.css:1546 (REVISAO-DESENHO 1) */
  .eb-ops-l{grid-template-columns:1fr}
  .eb-aviso{padding:14px 14px 14px 18px}
  .janela.fi-larga .janela-pe{display:grid;grid-template-columns:minmax(0,1fr);gap:8px}
  .janela.fi-larga .janela-pe .btn{width:100%;justify-content:center}
}
"""


def linha_prop(i, nome, regra, valor, caixa, extra=''):
    cat = (f'<span class="fi-cat">{ico("coluna")}Escritório</span>' if caixa == 'esc'
           else f'<span class="fi-cat terc">{ico("escudo")}Terceiros</span>')
    v = R(valor).replace('R$ ', '')
    return (f'<tr><td><div class="fi-quem"><strong>{nome}</strong><small>{regra}</small>{extra}</div></td>'
            f'<td data-r="Caixa">{cat}</td>'
            f'<td data-r="Valor" class="rp-valor"><div class="rp-valor-in"><label class="sr" for="rp-v-{i}">Valor de {nome}</label>'
            f'<input class="entrada num" id="rp-v-{i}" type="text" inputmode="decimal" autocomplete="off" value="{v}">'
            f'<button class="btn btn-fantasma btn-compacto" type="button">{ico("x")}<span class="sr">Tirar {nome} da divisão</span></button></div></td></tr>')


def aviso_eb():
    return (f'<section class="eb-aviso" aria-labelledby="eb-aviso-t"><div class="eb-txt" id="eb-aviso">'
            f'<h3 id="eb-aviso-t">{ico("alerta")}O êxito de {PN} está com baixa sem receber.</h3>'
            f'<p class="eb-det">Êxito · {CASO_R} · <span class="eb-num">{R(HON)}</span> · inadimplência, por Marina Ribeiro em 05/11/2026.</p>'
            f'<p class="eb-expl"><q>{EXPL_R}</q></p>'
            f'<p>Se os honorários deste alvará pagam esse êxito, desfaça a baixa antes de dividir. '
            f'Se o escritório decidiu não cobrar, mantenha a baixa e tire os honorários: o valor fica com {PN}.</p></div>')


def grupo_eb(marcado=None, erro=False):
    ops = [('desfazer', 'Desfazer a baixa antes de dividir', 'A parcela volta a ser cobrada e os honorários deste alvará a pagam.'),
           ('manter', 'Manter a baixa e tirar os honorários', f'Os {R(HON)} ficam com {PN}. A escolha fica no histórico do repasse.')]
    li = ''
    for i, (v, rot, aj) in enumerate(ops):
        ch = ' checked' if v == marcado else ''
        inv = ' aria-invalid="true"' if erro else ''
        foco = ' data-foco' if (erro and i == 0) or (v == marcado) else ''
        li += (f'<label class="opcao"><input class="marcar" type="radio" name="eb-exito" id="eb-op-{v}" value="{v}"{ch}{inv}{foco}>'
               f'<span>{rot}<small>{aj}</small></span></label>')
    er = (f'<p class="erro-msg" id="eb-ops-er">{ico("alerta", "ico ico-s")}Escolha o que fazer com o êxito de {PN}: '
          f'desfazer a baixa sem receber ou tirar os honorários.</p>') if erro else ''
    desc = ' aria-describedby="eb-ops-er"' if erro else ''
    extra = ''
    if marcado == 'desfazer':
        extra = (f'<div class="campo eb-porque"><label for="eb-porque">Por que desfazer</label>'
                 f'<textarea class="entrada" id="eb-porque" maxlength="1000" aria-describedby="eb-porque-aj">{POR_QUE}</textarea>'
                 f'<p class="ajuda" id="eb-porque-aj">Fica no histórico da parcela.</p></div>')
    if marcado == 'manter':
        extra = (f'<p class="eb-nota" role="status">{ico("historico")}<span>Os honorários saíram da divisão. O êxito de {PN} continua com baixa sem receber, '
                 f'e isso fica no histórico do repasse.</span></p>')
    return (f'<fieldset class="eb-ops"{desc}><legend>O que fazer com o êxito de {PN}</legend>{er}'
            f'<div class="eb-ops-l">{li}</div>{extra}</fieldset></section>')


def j_registrar_eb(var='proposta', abrir=True):
    """var: proposta, desfazer, mantida, erro ou conflito (Diego, 18/11, 10h12)."""
    marcado = {'desfazer': 'desfazer', 'mantida': 'manter', 'conflito': 'desfazer'}.get(var)
    topo = ''
    if var == 'erro':
        topo = (f'<div class="aviso aviso-urgencia eb-resumo" role="alert">{ico("alerta")}<div><strong class="aviso-titulo">Falta acertar 1 coisa.</strong>'
                f'<p>Nada foi registrado ainda.</p><ul><li><a href="#eb-op-desfazer">Escolha o que fazer com o êxito de {PN}.</a></li></ul></div></div>')
    if var == 'conflito':
        topo = aviso('atencao', f'Bianca Torres desfez a baixa sem receber do êxito de {PN} às 10h13.',
                     'Nada foi registrado. Veja a divisão refeita antes de registrar.', icone='pessoas', papel='alert')
    campos = (f'<div class="fi-dois">{selecao("rp-tipo", "O que entrou", ["Escolha", "Alvará", "RPV", "Precatório", "Depósito de acordo"], "Alvará")}'
              + selecao('rp-caso', 'Caso e cliente', ['Escolha o caso', f'{CASO_R} · {RITA}', 'Lopes x Transportadora Rota Sul · Sebastião Lopes'], f'{CASO_R} · {RITA}') + '</div>'
              + f'<div class="fi-dois">{campo("rp-valor", "Valor levantado", "16.000,00", im="decimal")}{campo("rp-dia", "Dia em que entrou", "18/11/2026", im="numeric", ajuda="dd/mm/aaaa")}</div>'
              + f'<p class="fi-caixa-fixa">{ico("escudo")}<span>Entra como <b>valor de terceiros</b>. Só a parte do escritório passa para o caixa dele, quando for transferida.</span></p>')
    linhas = ''
    cliente = ALV
    if var != 'mantida':
        if marcado == 'desfazer':
            ext = f'<small class="rp-baixa">{ico("check")}Paga a parcela do êxito (falta {R(HON)})</small>'
        else:
            ext = f'<small class="eb-cel">{ico("alerta")}Êxito com baixa sem receber · veja abaixo</small>'
        linhas += linha_prop(0, 'Honorários de êxito', f'30% · acordo · contrato {CT_R}', HON, 'esc', ext)
        cliente -= HON
    if marcado == 'desfazer':
        linhas += linha_prop(1, 'Reembolso: custas', 'Tinham baixa junto com o êxito; voltam a ser cobradas', CUS, 'esc')
        cliente -= CUS
    linhas += (f'<tr class="rp-cliente"><td><div class="fi-quem"><strong>{RITA}</strong><small>Cliente · o que fica, depois das outras partes</small></div></td>'
               f'<td data-r="Caixa"><span class="fi-cat terc">{ico("escudo")}Terceiros</span></td><td data-r="Valor" class="fi-v num">{R(cliente)}</td></tr>')
    tab = (f'<table class="fi-tab rp-tab"><caption class="sr">Para quem vai cada parte</caption>'
           f'<colgroup><col style="width:48%"><col style="width:20%"><col style="width:32%"></colgroup>'
           f'<thead><tr><th scope="col">Para quem</th><th scope="col">Caixa</th><th scope="col" style="text-align:right">Valor</th></tr></thead><tbody>{linhas}</tbody></table>')
    soma = (f'<p class="fi-ref" role="status">{ico("check")}<span>Soma da divisão: <b>{R(ALV)}</b>, igual ao valor levantado. Falta destinar: <b>{R(0)}</b>.</span></p>')
    acres = f'<button class="btn btn-sec btn-compacto" type="button" style="justify-self:start">{ico("mais")}Acrescentar perito, parceiro ou outro</button>'
    div = (f'<fieldset class="rp-div" aria-describedby="eb-aviso"><legend>Divisão proposta pelo contrato {CT_R}</legend>'
           f'{tab}{aviso_eb()}{grupo_eb(marcado, var == "erro")}{acres}{soma}</fieldset>')
    if var == 'conflito':  # REVISAO-DESENHO 2: a divisão de quando Diego abriu sai, para não contradizer o aviso do topo
        div = (f'<fieldset class="rp-div"><legend>Divisão proposta pelo contrato {CT_R}</legend>'
               f'<p class="ajuda eb-velha">{ico("reenviar")}<span>A divisão saiu daqui porque o êxito de {PN} mudou. '
               f'O que entrou, o caso, o valor e o dia continuam como você escreveu.</span></p></fieldset>')
    corpo = topo + campos + div
    pe = (f'<button class="btn btn-sec" type="button" data-fechar>Cancelar</button>'
          f'<button class="btn btn-pri" type="button">{ico("check")}Registrar</button>')
    if var == 'conflito':  # REVISAO-DESENHO 2: a ação do conflito fica no pé, como no bx-conflito aprovado
        pe = (f'<button class="btn btn-sec" type="button" data-fechar>Cancelar</button>'
              f'<button class="btn btn-pri" type="button" data-foco>{ico("reenviar")}Ver a divisão refeita</button>')
    h = janela('j-rpv', 'Repasses', 'Registrar alvará ou RPV', 'Diga o que entrou e de qual caso. A divisão sai do contrato, e você pode ajustar antes de registrar.',
               corpo, pe, abrir=abrir).replace('class="janela"', 'class="janela fi-larga"', 1)
    if var == 'proposta':
        h = h.replace('<select class="entrada" id="rp-tipo">', '<select class="entrada" id="rp-tipo" data-foco>', 1)
    return h


def ficha_rita():
    dir_ = (f'<section class="dir campo-ambar" aria-labelledby="t-dir"><p class="fi-terc-rot" id="t-dir">{ico("escudo")}Ainda com o escritório</p>'
            f'<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><p class="grande num">{R(ALV)}</p>{selo("atencao", "Até 24/11", "relogio")}</div>'
            f'<p class="fi-oque"><b>Tudo é de {PN}.</b> O prazo do escritório para repassar é de 3 dias úteis.</p>'
            f'<button class="btn btn-pri" type="button">{ico("enviar")}Registrar repasse</button></section>')
    cab = (f'<div class="ficha-cab"><div class="esq campo-vinho">{ico("balanca", "ico estatua")}'
           f'<a class="voltar" href="{FARQ}repasses">{ico("esq", "ico ico-s")}Repasses</a>'
           f'<div class="ident"><div><p class="sobretitulo">Alvará · {CASO_R}</p><h1>{RITA}</h1>'
           f'<p class="meta"><span class="selo" style="background:var(--ambar-3);color:var(--vinho)">0 de 1 feito</span><span>levantado em 18/11/2026</span><span class="sep" aria-hidden="true"></span><span class="num">{R(ALV)}</span></p></div></div></div>{dir_}</div>')
    rows = (f'<tr><td><div class="fi-quem-d"><span class="av-p forte" aria-hidden="true">RF</span><div><strong>{RITA}</strong><small>Cliente · o que fica para ela</small></div></div></td>'
            f'<td>{selo("atencao", "Até 24/11", "relogio")}</td><td class="fi-v num">{R(ALV)}</td><td><span class="fi-pq">—</span></td></tr>')
    car = (f'<li class="cartao"><div class="c-topo"><div><strong class="c-nome" style="font-size:18px">{RITA}</strong><small>Cliente · o que fica para ela</small></div></div>'
           f'<dl class="c-dados"><dt>Valor</dt><dd class="num">{R(ALV)}</dd></dl><div class="c-selos">{selo("atencao", "Até 24/11", "relogio")}</div></li>')
    tab = (f'<table class="so-pc fi-tab fi-dest"><caption class="sr">Para onde vai cada parte</caption><colgroup><col style="width:40%"><col style="width:23%"><col style="width:18%"><col style="width:19%"></colgroup>'
           f'<thead><tr><th scope="col">Para quem</th><th scope="col">Situação</th><th scope="col" style="text-align:right">Valor</th><th scope="col">Documento</th></tr></thead><tbody>{rows}</tbody>'
           f'<tfoot><tr><th scope="row">Levantado e destinado</th><td style="white-space:nowrap">Falta destinar {R(0)}</td><td class="fi-v num">{R(ALV)}</td><td></td></tr></tfoot></table>'
           f'<ul class="cartoes so-cel" aria-label="Para onde vai cada parte">{car}</ul>')
    dest = folha('t-dest', 'Para onde vai cada parte', tab, sub='Sem os honorários do êxito: Diego Almeida manteve a baixa sem receber ao registrar.', icone='enviar', terc=True)
    hist = folha('t-hist', 'Histórico', (
        '<div class="eventos-dia" style="padding-top:0"><h3>18/11/2026 · hoje</h3><ol class="eventos">'
        f'<li class="eb-hist-novo"><time>10h14</time><span class="pto" aria-hidden="true"></span><div><p>Registrado sem os honorários do êxito: a parcela de {PN} continua com baixa sem receber '
        f'(inadimplência, por Marina Ribeiro em 05/11).</p><small>Diego Almeida, ao registrar o alvará</small></div></li>'
        f'<li><time>10h14</time><span class="pto" aria-hidden="true"></span><div><p><b>Diego Almeida</b> registrou Alvará de {R(ALV)}</p><small>divisão ajustada à mão</small></div></li></ol></div>'), icone='historico')
    fecha = folha('t-fecha', 'Fechamento do caso', (
        f'<div class="fi-fecha"><ul class="fi-check">'
        f'<li>{ico("check")}<span>Alvará registrado</span></li>'
        f'<li>{ico("check")}<span>Êxito do contrato {CT_R}: baixa sem receber<small>inadimplência, por Marina Ribeiro em 05/11 · mantida ao registrar o alvará</small></span></li>'
        f'<li class="falta">{ico("alerta")}<span><b>{PN}:</b> falta repassar {R(ALV)}</span></li></ul></div>'), icone='cadeado', sub='Só encerra com tudo recebido e tudo repassado')
    return f'<div class="fi">{cab}<div class="fi-grade"><div class="fi-col">{dest}{hist}</div><aside class="fi-col" aria-label="Fechamento">{fecha}</aside></div></div>'


def A(secao, titulo=None, trilha=None, quem=None):
    d = dict(area='financeiro', secao=secao, atual='financeiro', trilha=trilha or f'Financeiro|{secao}', titulo=titulo or secao)
    if quem:
        d['quem'] = quem
    return d


ROT = {}
TF = ''


def addf(nome, corpo, rotulo, **kw):
    global TF
    ROT[nome] = rotulo
    TF += tpl(nome, corpo, **kw)


REP = F.repasses()
addf('eb-proposta', REP + j_registrar_eb('proposta'), 'A divisão com o êxito baixado: o aviso e a escolha, sem nada marcado', **A('Repasses', 'Registrar alvará ou RPV', quem='diego'))
addf('eb-desfazer-escolhido', REP + j_registrar_eb('desfazer'), '“Desfazer a baixa antes de dividir”: por que desfazer, e as custas voltam', **A('Repasses', 'Registrar alvará ou RPV', quem='diego'))
addf('eb-mantida', REP + j_registrar_eb('mantida'), '“Manter a baixa e tirar os honorários”: tudo fica com Rita', **A('Repasses', 'Registrar alvará ou RPV', quem='diego'))
addf('eb-erro', REP + j_registrar_eb('erro'), 'Registrar sem escolher: o erro do grupo', **A('Repasses', 'Registrar alvará ou RPV', quem='diego'))
addf('eb-conflito', REP + j_registrar_eb('conflito'), 'Bianca mudou o êxito com a janela aberta: nada foi registrado', **A('Repasses', 'Registrar alvará ou RPV', quem='diego'))
addf('eb-historico', ficha_rita(), 'Marina, na ficha do repasse: a linha do histórico', **A('Repasses', RITA, f'Financeiro|Repasses|{RITA}'))

barras_f = ''.join(f'<template data-barra="financeiro|{s}">{barra_area("financeiro", s)}</template>\n' for s in ['Repasses'])
barras_f = barras_f.replace('<a href="#" aria-current="page">Repasses</a>', f'<a href="{FARQ}eb-proposta" aria-current="page">Repasses</a>')

out = pagina('Financeiro', 'Repasses: o êxito com baixa sem receber na divisão do alvará (F3.174).', '{"estado":"eb-proposta","atual":"financeiro"}', '', TF, barras_f)
out = out.replace('</style>', F.CSS_FI + '\n' + CSS_RP + '\n' + CSS_EB + '\n</style>', 1)
out = out.replace("'sem-area':{", QUEM, 1)
assert 'diego:{' in out
open(os.path.join(SAIDA, 'financeiro.html'), 'w', encoding='utf-8').write(out)

# ====================================================================================== Parte B · Relatórios (rb-)
NOEMI, EXPL_N = 'Noemi Bastos Carvalho', 'Noemi recusou pagar depois da perda; não vamos cobrar na Justiça.'
CT_N, CASO_N = 'C-2026-012', 'Carvalho x Construtora Lume'
BAIX = {'Rita Fonseca': 4800, NOEMI: 1000}

CSS_RB = r"""
/* ==========================================================================
   Relatórios · "Baixado sem receber" (F3.173). Prefixo rb-. Família vinho e neutros:
   a baixa é do escritório e não é dinheiro de terceiros. "Não soma" sempre escrito.
   ========================================================================== */
.rb-num{padding:0 24px 12px;display:grid;gap:4px}
.rb-num .rb-v{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 10px}
.rb-num .rb-v b{font-family:var(--serifa);font-size:30px;font-weight:500;color:var(--vinho);line-height:1.1;white-space:nowrap}
.rb-num .rb-v span{font-size:13px;color:var(--texto-2)}
.rb-num p{margin:0;font-size:13px;line-height:1.5}
.rb-mot b{font-weight:500}
.rb-cmp{display:flex;gap:8px;align-items:flex-start;color:var(--texto-2)}
.rb-cmp .ico{width:16px;height:16px;flex:none;margin-top:2px;color:var(--vinho-4)}
.rb-lado{border-top:1px solid var(--divisor);padding-top:2px}
.rb-lado dd small{display:block;font-weight:400;font-size:12px;color:var(--texto-2);text-align:right}
.rb-nao{font-weight:500;color:var(--texto)}
.rb-nada{margin:0 24px 14px;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.5;display:flex;gap:10px;align-items:flex-start}
.rb-nada .rb-nq{white-space:nowrap}
.rb-nada .ico{width:16px;height:16px;flex:none;margin-top:2px;color:var(--vinho)}
.re-como .rb-novo dt{display:flex;align-items:center;gap:8px}
.re-como .rb-novo dt .selo{font-family:var(--fonte-texto,inherit);font-size:11px}
.fi-quatro .rb-baixado{grid-column:1/-1;border-left:0;border-top:1px solid var(--divisor);background:var(--sal-2)}
.fi-quatro .rb-baixado dd small{display:block;font-family:var(--sans,inherit);font-size:12px;color:var(--texto-2);font-weight:400}
.rb-lista{list-style:none;margin:0;padding:0 24px 4px}
.rb-lista>li{display:grid;grid-template-columns:52px minmax(0,1fr) auto;gap:4px 14px;padding:14px 0;border-top:1px solid var(--divisor);font-size:13px;line-height:1.5}
.rb-lista>li:first-child{border-top:0}
.rb-lista time{font-weight:500;color:var(--texto-2);font-variant-numeric:tabular-nums}
.rb-lista strong{display:block;font-weight:500}
.rb-lista small{display:block;font-size:12px;color:var(--texto-2)}
.rb-lista .rb-q{margin-top:4px}
.rb-lista .rb-q q{font-family:var(--serifa);font-style:italic;font-size:15px;color:var(--texto)}
.rb-lista .fi-v{font-size:14px;text-align:right}
.rb-lista .fi-v small{font-weight:400}
.rb-lista .selo{margin-top:6px}
.rb-lista li.rb-desf strong{color:var(--texto)}
.rb-custas{display:flex;gap:10px;align-items:flex-start;margin:4px 24px 14px;padding:10px 14px;border-radius:var(--raio);border:1px solid var(--borda-folha);font-size:13px;line-height:1.5}
.rb-custas .ico{width:16px;height:16px;flex:none;margin-top:2px;color:var(--vinho)}
.rb-tab thead th{white-space:normal;line-height:1.35;vertical-align:bottom}
.rb-tab tfoot td,.rb-tab tfoot td small{white-space:normal}
.re-ferr .campo:has(#re-ordem){flex-basis:280px}
.re-tab td.rb-col b{font-weight:500}
.re-tab td.rb-col small{white-space:normal}
@media (max-width:760px){
  .rb-num{padding:0 16px 12px}
  .rb-nada,.rb-custas{margin-left:16px;margin-right:16px}
  .rb-lista{padding:0 16px 4px}
  .rb-lista>li{grid-template-columns:44px minmax(0,1fr)}
  .rb-lista>li .fi-v{grid-column:2;text-align:left}
}
"""


def folha_baixado(nenhuma=False):
    sub_p = 'jun. a ago.' if nenhuma else 'set. a nov.'
    sub = f'Parcelas que saíram de Em atraso sem que o dinheiro entrasse, de {sub_p}'
    pe = (f'<p class="pt-pe-folha">{ico("ajuda")}<span>Não conta em Entrou nem em Falta receber. Cada baixa fica no mês em que foi feita. '
          f'Se for desfeita depois, o desfazer aparece no mês dele.</span></p>')
    if nenhuma:
        corpo = f'<p class="rb-nada">{ico("check")}<span>Nenhuma baixa sem receber de <span class="rb-nq">jun. a ago.</span></span></p>' + pe
    else:
        corpo = (f'<div class="rb-num"><p class="rb-v"><b>{R(5800)}</b><span>· 2 parcelas</span></p>'
                 f'<p class="rb-mot">Inadimplência <b class="num">{R(5800)}</b></p>'
                 f'<p class="rb-cmp">{ico("historico")}<span>{R(0)} em jun. a ago.</span></p></div>'
                 f'<dl class="re-conta rb-lado">'
                 f'<div><dt>Baixas desfeitas no período<small>voltaram para A receber</small></dt><dd class="num">{R(1000)}</dd></div>'
                 f'<div><dt>Renegociado no período<small>vira parcelas novas em Contratos e <span class="rb-nao">não soma</span></small></dt><dd class="num">{R(500)}</dd></div>'
                 f'<div><dt>Custas baixadas junto<small>despesas do escritório e <span class="rb-nao">não soma</span></small></dt><dd class="num">{R(412.30)}<small>{R(412.30)} desfeitos</small></dd></div>'
                 f'</dl>' + pe)
    return folha('t-baixado', 'Baixado sem receber', corpo, sub=sub, icone='seta', acoes=ver('A receber', '../portal-financeiro/financeiro.html?estado=receber'))


COMO_RB = ('<div class="rb-novo"><dt>Baixado sem receber</dt><dd>O que faltava nas parcelas que tiveram baixa sem receber no período, <b>pelo dia da baixa</b>. '
           'A renegociada e as custas não somam. Uma baixa desfeita depois não muda o período em que foi feita.</dd></div>')


def como_rb(aberto):
    c = RL.como(aberto)
    i = c.index('<div><dt>Rendeu</dt>')
    return c[:i] + COMO_RB + c[i:]


def alto_rb(atual, aberto=False):
    return f'{RL.cab()}{RL.barra_periodo()}<div class="re-topo">{RL.vistas(atual)}</div>{como_rb(aberto)}'


def visao_rb(aberto=False):
    falta = RL.folha_falta().replace('<b>Vencido</b> · 4 parcelas', '<b>Vencido</b> · 5 parcelas')
    return (f'<div class="fi re">{alto_rb("visao", aberto)}{RL.tres()}<div class="fi-grade"><div class="fi-col">{RL.folha_meses()}{RL.folha_top_clientes()}{RL.folha_top_areas()}</div>'
            f'<aside class="fi-col" aria-label="Falta receber, baixado sem receber, rendeu e terceiros">{falta}{folha_baixado()}{RL.folha_rendeu()}{RL.folha_terceiros()}</aside></div></div>')


def periodo_outro(h, per, cmp_, chip='Escolher datas'):
    h = h.replace('aria-pressed="true"', 'aria-pressed="false"')
    h = h.replace(f'<button type="button" aria-pressed="false" data-janela="janela-periodo"', '<button type="button" aria-pressed="true" data-janela="janela-periodo"', 1)
    h = h.replace(f'<b>{RL.PER}</b><span>comparado com 01/06 a 31/08/2026</span>', f'<b>{per}</b><span>{cmp_}</span>', 1)
    return h


def visao_nenhuma():
    alto = periodo_outro(f'{RL.cab()}{RL.barra_periodo()}<div class="re-topo">{RL.vistas("visao")}</div>{como_rb(False)}',
                         '01/06 a 31/08/2026', 'comparado com 01/03 a 31/05/2026')
    ent, ant = RL.ENTROU_ANT, 118400
    tres = (f'<div class="re-tres campo-vinho">{ico("coluna", "ico estatua")}'
            f'<section class="re-n" aria-labelledby="n-entrou"><p class="sobretitulo" id="n-entrou">Entrou · jun–ago</p><p><span class="fi-big num">{R(ent)}</span></p>'
            f'<p class="re-cmp">{ico("historico")}<span>{R(ent - ant)} a mais que mar–mai ({R(ant)})</span></p></section>'
            f'<section class="re-n" aria-labelledby="n-falta"><p class="sobretitulo" id="n-falta">Falta receber · hoje</p><p><span class="fi-big num">{R(RL.FALTA)}</span></p>'
            f'{selo("urgente", f"{R(RL.VENCIDO)} vencidos", "alerta")}<p>Falta receber é sempre de hoje, em qualquer período.</p></section>'
            f'<section class="re-n" aria-labelledby="n-rendeu"><p class="sobretitulo" id="n-rendeu">Rendeu · jun–ago</p><p><span class="fi-big num">{R(RL.RENDEU_ANT)}</span></p>'
            f'<p>Nenhuma despesa de caso adiantada ficou sem voltar.</p></section></div>')
    mx = 50000
    bar = ''.join(f'<div class="fi-barra"><span class="rot">{n}</span><span class="fi-trilho" aria-hidden="true"><i class="real" style="width:{v / mx * 100:.1f}%"></i></span>'
                  f'<span class="val"><b class="num">{R(v)}</b></span></div>' for n, v in RL.ANTERIOR)
    meses = folha('t-meses', 'Entrou mês a mês', f'<div class="fi-barras" role="group" aria-label="Entrou por mês, de junho a agosto">{bar}</div>',
                  sub='Honorários pelo dia em que o dinheiro entrou. Valores de terceiros ficam fora.', icone='moeda')
    falta = RL.folha_falta().replace('<b>Vencido</b> · 4 parcelas', '<b>Vencido</b> · 5 parcelas')
    return (f'<div class="fi re">{alto}{tres}<div class="fi-grade"><div class="fi-col">{meses}</div>'
            f'<aside class="fi-col" aria-label="Falta receber e baixado sem receber">{falta}{folha_baixado(nenhuma=True)}</aside></div></div>')


def clientes_rb():
    _, todos = RL.top_clientes()
    todos = sorted(todos, key=lambda x: (-BAIX.get(x[0], 0), -x[1]['entrou']))
    ferr = (f'<form class="re-ferr" role="search" action="#" onsubmit="return false">'
            f'<div class="campo re-busca"><label for="re-busca">Buscar cliente</label><span class="campo-busca">{ico("busca")}<input class="entrada" id="re-busca" type="search" placeholder="Nome do cliente" autocomplete="off"></span></div>'
            + selecao('re-ordem', 'Ordenar por', ['Entrou, do maior para o menor', 'Falta receber, do maior', 'Vencido, do maior', 'Baixado sem receber, do maior', 'Rendeu, do menor para o maior', 'Nome, de A a Z'], 'Baixado sem receber, do maior')
            + selecao('re-area', 'Área', ['Todas as áreas'] + RL.AREAS_ORDEM, 'Todas as áreas') + '</form>')
    rows, car = '', ''
    for nome, d in todos:
        neg = ' class="re-neg"' if d['rendeu'] < 0 else ''
        adi = R(d['adiant']) if d['adiant'] else '<span class="fi-pq">—</span>'
        b = BAIX.get(nome, 0)
        bx = f'<b class="num">{R(b)}</b><small>inadimplência</small>' if b else '<span class="fi-pq">—</span>'
        rows += (f'<tr{neg}><td>{RL.nome_cli(nome, d)}</td><td class="v num">{R(d["contratado"])}</td><td class="v num"><b style="font-weight:600">{R(d["entrou"])}</b></td>'
                 f'<td class="v">{RL.falta_cel(d)}</td><td class="v rb-col" data-r="Baixado sem receber">{bx}</td><td class="v num">{adi}</td><td class="v re-rend">{RL.rend_cel(d)}</td></tr>')
    for nome, d in todos[:8]:
        sel = selo('urgente', f'{R(d["vencido"])} vencido', 'alerta') if d['vencido'] else ''
        b = BAIX.get(nome, 0)
        car += (f'<li class="cartao"><div class="c-topo"><div><a class="c-nome" href="{RARQ}rb-cliente">{nome}</a><small>{d["contratos"]} contrato{"s" if d["contratos"] > 1 else ""} · {", ".join(sorted(d["resp"], key=RL.RESP_ORDEM.index))}</small></div>'
                f'<span class="fi-cartao-v num" style="margin-left:auto">{R(d["entrou"])}</span></div>'
                f'<dl class="c-dados"><dt>Contratado</dt><dd class="num">{R(d["contratado"])}</dd><dt>Falta receber</dt><dd class="num">{R(d["falta"])}</dd>'
                f'<dt>Baixado sem receber</dt><dd class="num">{R(b) + "<small>inadimplência · não soma</small>" if b else "—"}</dd>'
                f'<dt>Despesas não reembolsadas</dt><dd class="num">{R(d["adiant"])}</dd><dt>Rendeu</dt><dd class="num">{RL.Rs(d["rendeu"])}</dd></dl>'
                + (f'<div class="c-selos">{sel}</div>' if sel else '') + '</li>')
    tab = (f'<table class="so-pc fi-tab re-tab rb-tab"><caption class="sr">Por cliente, de {RL.PER}, ordenado por baixado sem receber</caption>'
           f'<colgroup><col style="width:21%"><col style="width:11%"><col style="width:11%"><col style="width:17%"><col style="width:13%"><col style="width:13%"><col style="width:14%"></colgroup>'
           f'<thead><tr><th scope="col">Cliente</th><th scope="col" class="v">Contratado</th><th scope="col" class="v">Entrou</th>'
           f'<th scope="col" class="v">Falta receber</th><th scope="col" class="v" aria-sort="descending">Baixado sem receber{ico("baixo")}</th><th scope="col" class="v">Despesas não reembolsadas</th><th scope="col" class="v">Rendeu</th></tr></thead><tbody>{rows}</tbody>'
           f'<tfoot><tr><th scope="row">{len(todos)} clientes</th><td class="num">{R(RL.CONTRATADO)}</td><td class="num">{R(RL.ENTROU)}</td><td class="num">{R(RL.FALTA)}<small>{R(RL.VENCIDO)} vencidos · mais {R(RL.RPV_TOTAL)} à parte</small></td>'
           f'<td class="num">{R(5800)}<small>não soma</small></td><td class="num">{R(RL.ADIANT)}</td><td class="num">{R(RL.RENDEU)}</td></tr></tfoot></table>')
    cart = (f'<ul class="cartoes so-cel" aria-label="Por cliente">{car}</ul>'
            f'<p class="mais so-cel"><span>Mostrando 8 de {len(todos)} clientes</span><button class="btn btn-sec" type="button">Mostrar mais</button></p>'
            f'<dl class="fi-dl so-cel" style="padding-top:12px;border-top:1px solid var(--divisor)"><div><dt>Entrou, {len(todos)} clientes</dt><dd class="num">{R(RL.ENTROU)}</dd></div>'
            f'<div><dt>Falta receber</dt><dd class="num">{R(RL.FALTA)}<br><span class="fi-pq">{R(RL.VENCIDO)} vencidos</span></dd></div>'
            f'<div><dt>Baixado sem receber</dt><dd class="num">{R(5800)}<br><span class="fi-pq">não soma</span></dd></div><div><dt>Rendeu</dt><dd class="num">{R(RL.RENDEU)}</dd></div></dl>')
    pe = (f'<p class="pt-pe-folha">{ico("ajuda")}<span>Baixado sem receber é o que faltava nas parcelas que tiveram baixa no período. Não soma em Entrou nem em Falta receber. '
          f'Hélio e Daniela renderam menos que zero: o escritório adiantou custas e perícia e o dinheiro ainda não voltou.</span></p>')
    f = (f'<section class="folha" aria-labelledby="t-cli" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-cli">{ico("pessoas")}Por cliente</h2>'
         f'<p class="sub">Cada cliente com o que foi contratado, o que entrou, o que falta, o que teve baixa sem receber e o que rendeu no período.</p></div>{ver("Cobrar em A receber", "../portal-financeiro/financeiro.html?estado=receber")}</div>'
         f'{ferr}<p class="re-cont" role="status"><b>{len(todos)} clientes</b> com contrato no período · do que mais teve baixa sem receber para o que menos teve</p>{tab}{cart}{pe}</section>')
    return f'<div class="fi re">{alto_rb("clientes")}{f}</div>'


def cliente_noemi(outubro=False):
    per = '01/10 a 31/10/2026' if outubro else RL.PER
    dir_ = (f'<section class="dir campo-ambar" aria-labelledby="t-dir"><p class="sobretitulo" id="t-dir">Em atraso · hoje</p>'
            f'<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><p class="grande num">{R(1000)}</p>{selo("urgente", "39 dias", "alerta")}</div>'
            f'<p class="fi-oque"><b>Parcela 6/6.</b> Venceu em 10/10. Voltou para Em atraso em 12/11, quando a baixa sem receber foi desfeita.</p>'
            f'<a class="btn btn-pri" href="../portal-financeiro/financeiro.html?estado=receber">{ico("moeda")}Ver em A receber</a></section>')
    cab_ = (f'<div class="ficha-cab"><div class="esq campo-vinho">{ico("coluna", "ico estatua")}'
            f'<a class="voltar" href="{RARQ}rb-clientes">{ico("esq", "ico ico-s")}Por cliente</a>'
            f'<div class="ident"><div><p class="sobretitulo">Relatório do cliente · {per}</p><h1>{NOEMI}</h1>'
            f'<p class="meta"><span class="selo" style="background:var(--ambar-3);color:var(--vinho)">Ativo</span><span>1 contrato · 1 caso</span><span class="sep" aria-hidden="true"></span><span>responsável Felipe Matos</span></p></div></div></div>{dir_}</div>')
    barra = RL.barra_periodo()
    if outubro:
        barra = periodo_outro(barra, per, 'comparado com 01/09 a 30/09/2026')
    desf = '' if outubro else f'<small>{R(1000)} de baixas desfeitas no período</small>'
    quatro = (f'<dl class="fi-quatro"><div><dt>Contratado no período</dt><dd class="num">{R(1000)}</dd></div><div><dt>Entrou</dt><dd class="num">{R(0)}</dd></div>'
              f'<div><dt>Falta receber · hoje</dt><dd class="num urg">{R(1000)}</dd></div><div><dt>Rendeu</dt><dd class="num">{R(0)}</dd></div>'
              f'<div class="rb-baixado"><dt>Baixado sem receber</dt><dd class="num">{R(1000)} {desf}</dd></div></dl>')
    resumo_f = folha('t-num', 'No período', quatro, sub='Contratado, entrou, falta receber, rendeu e o que teve baixa sem receber.', icone='funcoes')
    itens = (f'<li><time>15/10</time><div><strong>Baixa sem receber · Parcela 6/6</strong><small>inadimplência · por Marina Ribeiro</small>'
             f'<p class="rb-q"><q>{EXPL_N}</q></p>{selo("neutro", "desfeita em 12/11")}</div><span class="fi-v num">{R(1000)}</span></li>')
    if not outubro:
        itens += (f'<li class="rb-desf"><time>12/11</time><div><strong>Baixa desfeita · Parcela 6/6</strong><small>por Marina Ribeiro · voltou para A receber</small></div>'
                  f'<span class="fi-v num">{R(1000)}<small>não tira de 15/10</small></span></li>')
    custas = (f'<p class="rb-custas">{ico("reenviar")}<span>As custas de {R(412.30)} tiveram baixa junto em 15/10 e voltaram a ser cobradas em 12/11. '
              f'Não somam: são despesa do escritório.</span></p>')
    lista = (f'<ul class="rb-lista" aria-label="Baixas sem receber no período">{itens}</ul>{custas}'
             f'<p class="fi-total"><span>Baixado sem receber no período</span><b class="num">{R(1000)}</b></p>')
    lista_f = folha('t-bx', 'Baixas sem receber no período', lista, sub='Pelo dia da baixa. Desfazer depois não muda o mês em que a baixa foi feita.', icone='seta')
    entrou_t = 'Nada entrou em outubro.' if outubro else 'Nada entrou no período. As parcelas 1/6 a 5/6 foram pagas antes de setembro.'
    entrou_f = folha('t-linha', 'O que entrou', f'<p class="rb-nada">{ico("historico")}<span>{entrou_t}</span></p>', sub='Pelo dia em que o dinheiro entrou.', icone='historico')
    ct_f = folha('t-ct', 'Contratos e casos', (
        f'<ul class="fi-linhas"><li class="fi-linha" style="grid-template-columns:minmax(0,1fr) auto"><div class="fi-quem"><strong>{CT_N} · 6 parcelas de {R(1000)}</strong>'
        f'<small>{CASO_N} · Cível · caso encerrado com perda</small></div><span class="fi-v num">{R(6000)}</span></li></ul>'), sub='O que Noemi contratou.', icone='pena')
    falta_f = folha('t-falta', 'O que falta', (
        f'<ul class="fi-linhas"><li class="fi-linha fi-venc"><div class="fi-quem"><strong>Parcela 6/6</strong><small>{CT_N} · venceu em 10/10 · voltou para Em atraso em 12/11</small></div>'
        f'<div class="fi-lado"><span class="fi-v forte num">{R(1000)}</span>{selo("urgente", "39 dias", "alerta")}</div></li></ul>'
        f'<p class="fi-total"><span>1 parcela em aberto</span><b class="num">{R(1000)}</b></p>'), sub='Hoje. Para cobrar, o caminho é A receber.', icone='alerta')
    return (f'<div class="fi re">{cab_}{barra}<div class="fi-grade"><div class="fi-col">{resumo_f}{lista_f}{entrou_f}</div>'
            f'<aside class="fi-col" aria-label="Contratos e o que falta">{ct_f}{falta_f}</aside></div></div>')


def AR(titulo='Relatórios', trilha=None):
    return dict(area='financeiro', secao='Relatórios', atual='financeiro', trilha=trilha or 'Financeiro|Relatórios', titulo=titulo)


TR = ''


def addr(nome, corpo, rotulo, **kw):
    global TR
    ROT[nome] = rotulo
    TR += tpl(nome, corpo, **kw)


addr('rb-visao', visao_rb(), 'Visão geral: a folha “Baixado sem receber”', **AR())
addr('rb-visao-nenhuma', visao_nenhuma(), 'Junho a agosto: nenhuma baixa no período', **AR())
addr('rb-mes-passado', cliente_noemi(outubro=True), 'Noemi, outubro: a baixa fica no mês dela', **AR(NOEMI, f'Financeiro|Relatórios|{NOEMI}'))
addr('rb-cliente', cliente_noemi(), 'Noemi, set. a nov.: a baixa e o desfazer, cada um no seu dia', **AR(NOEMI, f'Financeiro|Relatórios|{NOEMI}'))
addr('rb-clientes', clientes_rb(), 'Por cliente: a coluna nova, ordenada por ela', **AR('Por cliente', 'Financeiro|Relatórios|Por cliente'))
addr('rb-como', visao_rb(aberto=True), '“Como contamos” com a regra nova', **AR())

SEC_R = [('Resumo', 'resumo'), ('A receber', 'receber'), ('A pagar', 'pagar'), ('Repasses', 'repasses'), ('Caixa', 'caixa')]
b = barra_area('financeiro', 'nenhuma')
for s, e in SEC_R:
    b = b.replace(f'<a href="#">{H(s)}</a>', f'<a href="../portal-financeiro/financeiro.html?estado={e}">{H(s)}</a>', 1)
b = b.replace('</nav></div>', f'<a href="{RARQ}rb-visao" aria-current="page">Relatórios</a></nav></div>', 1)
out = pagina('Relatórios', 'Relatórios do sócio: o Baixado sem receber no período (F3.173).', '{"estado":"rb-visao","atual":"financeiro"}', '', TR,
             f'<template data-barra="financeiro|Relatórios">{b}</template>\n')
out = out.replace('</style>', F.CSS_FI + '\n' + RL.CSS_RE + '\n' + CSS_RB + '\n</style>', 1)
open(os.path.join(SAIDA, 'relatorios.html'), 'w', encoding='utf-8').write(out)

# ====================================================================================== casos.json e index.html
SECOES = [
    ('a', 'F3.174 · O êxito com baixa sem receber na divisão do alvará',
     f'Ribeiro & Matos, quarta-feira, 18/11/2026, 10h12. O êxito de Rita Fonseca ({CT_R}, “{CASO_R}”, 30% sobre o acordo), de {R(HON)}, venceu em 20/10. '
     f'Marina deu baixa sem receber por inadimplência em 05/11. Hoje Diego Almeida, do Financeiro, registra um alvará de {R(ALV)} do caso. '
     'Desenhado com as recomendações das perguntas A1 (não registrar honorários com o êxito baixado: a janela pede a escolha) e A2 (sim: as custas que tiveram baixa junto entram como reembolso).',
     [('eb-proposta', 'financeiro', 'Diego. A janela de hoje, com a divisão proposta. Na célula dos honorários, só a linha curta “Êxito com baixa sem receber · veja abaixo”. Abaixo da tabela, dentro do quadro “Divisão”, o aviso: quem deu a baixa, quando, por quê (a explicação entre aspas), e o que fazer. O grupo “O que fazer com o êxito de Rita” vem sem nada marcado. Rita: R$ 11.200,00.'),
      ('eb-desfazer-escolhido', 'financeiro', 'Diego marcou “Desfazer a baixa antes de dividir”. Abre “Por que desfazer”, já preenchido e editável, com a ajuda “Fica no histórico da parcela.”. Os honorários passam a dizer “Paga a parcela do êxito (falta R$ 4.800,00)”, e entra a linha proposta “Reembolso: custas · R$ 412,30”, removível (pergunta A2). Rita: R$ 10.787,70.'),
      ('eb-mantida', 'financeiro', 'Diego marcou “Manter a baixa e tirar os honorários”. A linha dos honorários sai, e Rita fica com R$ 16.000,00. Uma nota sob o grupo diz que isso fica no histórico do repasse. Marcar a outra opção põe a linha de volta, com o valor proposto.'),
      ('eb-erro', 'financeiro', 'Diego clicou em “Registrar” sem escolher. Resumo no topo (“Falta acertar 1 coisa. Nada foi registrado ainda.”), com um link de 44 px para o grupo; o erro logo depois da legenda do grupo, cada rádio com aria-invalid; o foco no primeiro rádio.'),
      ('eb-conflito', 'financeiro', 'Enquanto Diego dividia, Bianca Torres desfez a baixa às 10h13. A recusa vem no topo da janela, em role="alert": “Nada foi registrado. Veja a divisão refeita antes de registrar.”, e o botão “Ver a divisão refeita” no pé, que recebe o foco. A divisão de antes sai da janela, para não contradizer o aviso; o que entrou, o caso, o valor e o dia continuam.'),
      ('eb-historico', 'financeiro', 'Marina abre a ficha do repasse de Rita, registrado com “Manter”. A linha nova do histórico: “Registrado sem os honorários do êxito: a parcela de Rita continua com baixa sem receber (inadimplência, por Marina Ribeiro em 05/11).”. Sem a explicação da baixa.')]),
    ('b', 'F3.173 · “Baixado sem receber” nos Relatórios do sócio',
     'Só Marina, a sócia dona, vê os Relatórios. Hoje é 18/11/2026. Rita: R$ 4.800,00 baixados por inadimplência em 05/11. Noemi: a 6/6, de R$ 1.000,00, baixada por inadimplência em 15/10 e desfeita em 12/11, com as custas de R$ 412,30 junto. Sebastião: R$ 500,00 renegociados em 10/11.',
     [('rb-visao', 'relatorios', 'Visão geral, de setembro a novembro, contra junho a agosto. A folha nova vem na coluna lateral, logo depois de “Falta receber”: R$ 5.800,00 em 2 parcelas, por motivo, a comparação e, ao lado, sem somar, as desfeitas, a renegociada e as custas. O pé diz que não conta em Entrou nem em Falta receber e que cada baixa fica no mês dela.'),
      ('rb-visao-nenhuma', 'relatorios', 'Período de junho a agosto. A folha aparece (o escritório já teve baixas), só com “Nenhuma baixa sem receber de jun. a ago.” e o mesmo pé.'),
      ('rb-mes-passado', 'relatorios', 'Um cliente: Noemi, de 01/10 a 31/10. O quinto número “Baixado sem receber · R$ 1.000,00” e a lista com a baixa de 15/10, a explicação entre aspas e “desfeita em 12/11”. Visto antes ou depois do desfazer, outubro fica igual.'),
      ('rb-cliente', 'relatorios', 'Noemi, de setembro a novembro. A lista com a baixa de 15/10 e o desfazer de 12/11, cada um no seu dia. O número continua R$ 1.000,00, com “R$ 1.000,00 de baixas desfeitas no período”.'),
      ('rb-clientes', 'relatorios', 'Por cliente, ordenado por “Baixado sem receber”: Rita R$ 4.800,00 e Noemi R$ 1.000,00 no alto, o total R$ 5.800,00 no pé com “não soma” e, no celular, o campo no cartão.'),
      ('rb-como', 'relatorios', '“Como contamos” aberto, com a regra nova entre Falta receber e Rendeu.')]),
]
casos = [{'nome': n, 'url': f'{arq}.html?estado={n}', 'rotulo': ROT[n]} for _, _, _, its in SECOES for n, arq, _ in its]
json.dump(casos, open(os.path.join(AQUI, 'casos.json'), 'w'), ensure_ascii=False, indent=1)

corpo = ''
for sid, titulo, sub, itens in SECOES:
    corpo += f'<section id="{sid}" aria-labelledby="t-{sid}"><h2 id="t-{sid}">{H(titulo)}</h2><p class="sub">{H(sub)}</p>'
    for n, arq, leg in itens:
        url = f'{arq}.html?estado={n}'
        figs = ''.join(f'<figure class="{"pc" if t == "computador" else "cel"}"><a href="{H(url)}"><img src="{n}-{t}.webp" alt="{H(ROT[n])}, {t}." loading="lazy" decoding="async"></a>'
                       f'<figcaption>{"Computador · 1440" if t == "computador" else "Celular · 390"} · <a href="{n}-{t}.png">PNG</a></figcaption></figure>' for t in ('computador', 'celular'))
        corpo += (f'<article>{figs}<div class="leg"><p class="cod">{n}</p><h3>{H(ROT[n])}</h3><p>{H(leg)}</p>'
                  f'<p class="abrir">Abrir: <a href="{H(url)}">{H(url)}</a></p></div></article>')
    corpo += '</section>'

PERG = [
    ('A1a. Com o êxito baixado (perdoada ou inadimplência), dá para registrar os honorários do alvará sem desfazer a baixa?',
     'Desenhado com a recomendação: não. A janela pede a escolha entre “Desfazer a baixa antes de dividir” e “Manter a baixa e tirar os honorários”. O caixa nunca recebe honorários de um êxito que continua com baixa sem receber.'),
    ('A1b. E na renegociada?', 'Recomendação: só “Desfazer a baixa antes de dividir”, com o lembrete de mudar as condições do contrato. Está só nas NOTAS (variação do estado 1), como manda o plano.'),
    ('A2. Ao desfazer na divisão, as custas que tiveram baixa junto entram como reembolso?',
     'Desenhado com a recomendação: sim. Elas entram como “Reembolso: custas”, já propostas e removíveis (estado eb-desfazer-escolhido), e o caso fecha no repasse como hoje.'),
]
perg = ''.join(f'<li><b>{H(q)}</b><span>{H(r)}</span></li>' for q, r in PERG)

index = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Êxito baixado e relatórios · T3jus</title>
<meta name="description" content="Desenho do êxito com baixa sem receber na divisão do alvará (F3.174) e do Baixado sem receber nos Relatórios (F3.173), para aprovação da Carol.">
<style>
:root{{--vinho:#692746;--vinho-2:#87335B;--ambar:#DD9760;--ambar-3:#F2CDB3;--sal:#F1E6DF;--tinta:#2A1A22;--tinta-2:#6E5562;--papel:#fff}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--sal);color:var(--tinta);font:14px/1.57 Poppins,"Segoe UI",system-ui,sans-serif}}
header{{background:var(--vinho);color:#fff;padding:40px 48px 32px}} header p{{margin:6px 0 0;color:var(--ambar-3);max-width:92ch}}
h1,h2,h3{{font-family:Alegreya,Georgia,serif;font-weight:500;margin:0}} h1{{font-size:44px;line-height:1.1}} h2{{font-size:30px;color:var(--vinho)}} h3{{font-size:20px;color:var(--vinho)}}
.sobre{{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#E9AE90;margin:0 0 6px}}
.fio{{display:block;width:56px;height:3px;background:var(--ambar);margin:14px 0 4px;border-radius:2px}}
nav.ir{{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}} nav.ir a{{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:22px;background:var(--vinho-2);color:#fff;text-decoration:none;font-weight:500}}
main{{padding:24px 48px 64px;max-width:1700px}} section{{margin-top:40px}} .sub{{margin:2px 0 16px;color:var(--tinta-2);max-width:110ch}}
article{{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,1fr) minmax(220px,1.1fr);gap:20px;align-items:start;background:var(--papel);border-radius:14px;padding:20px;margin-bottom:16px}}
figure{{margin:0}} img{{display:block;width:100%;height:auto;border-radius:8px;border:1px solid var(--sal)}}
figcaption{{font-size:12px;color:var(--tinta-2);margin-top:6px}} figcaption a{{display:inline-flex;align-items:center;min-height:24px}}
.leg p{{margin:6px 0 0}} .cod{{font-size:12px;letter-spacing:.1em;color:var(--tinta-2);font-family:ui-monospace,monospace}} .abrir{{font-size:12px;overflow-wrap:anywhere}} a{{color:var(--vinho)}} .abrir a{{font-weight:500}}
.perg{{list-style:none;margin:0;padding:0;display:grid;gap:10px}}
.perg li{{display:grid;gap:4px;background:var(--papel);border-radius:14px;padding:16px 20px}} .perg b{{font-weight:500}} .perg span{{color:var(--tinta-2)}}
a:focus-visible{{outline:3px solid #AC3F6B;outline-offset:2px;border-radius:6px}} header a:focus-visible{{outline-color:var(--ambar-3)}}
@media (max-width:900px){{header,main{{padding-left:16px;padding-right:16px}} h1{{font-size:34px}} article{{grid-template-columns:1fr}} .cel{{max-width:260px}}}}
</style></head><body>
<header><p class="sobre">T3jus · Portal do advogado · para aprovação da Carol</p><h1>Êxito baixado no alvará e nos relatórios</h1><span class="fio" aria-hidden="true"></span>
<p>F3.174 (FI-24, FI-05, FI-25) e F3.173 (IN-04, IN-07), pelo plano v2. Partem das telas de hoje: a janela “Registrar alvará ou RPV” de Repasses e os Relatórios aprovados. Cada estado tem computador (1440) e celular (390). Clique numa imagem para abrir o HTML naquele estado. Decisões, acessibilidade e o que ficou só nas notas estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#a">Divisão do alvará</a><a href="#b">Relatórios</a><a href="#perguntas">Perguntas</a></nav></header>
<main>{corpo}
<section id="perguntas" aria-labelledby="t-perg"><h2 id="t-perg">Perguntas do plano</h2><p class="sub">O desenho segue as recomendações. Se a Carol escolher outra, muda o desenho.</p><ul class="perg">{perg}</ul></section>
</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print('ok', len(casos), 'estados')
