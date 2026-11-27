# Portal · o êxito lançado depois do alvará já nasce pago (F3.199: CH-07, FI-05; D39). Desenho para a Carol aprovar.
# Base técnica, lida sem mudança: exito_baixado.py (D38, aprovado em portal-exito-baixado-alvara), que por sua vez
# reusa financeiro.py, comum.py, relatorios.py e dados.py aprovados. Daquele gerador vêm a janela "Registrar alvará ou
# RPV" (CSS rp- e eb-) e a variação "paga em parte" do eb-proposta, que a C3 = limitar revê.
# A janela "Conferir o êxito" e a "Não cobrar este êxito" seguem o código de hoje (FinanceiroExito.tsx), com o CSS ex-
# do portal.css copiado abaixo. Peças novas: prefixo ea-.
# Uso: python3 exito_alvara.py <pasta-saida>
import os, sys, json, html, types, tempfile
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
H = lambda s: html.escape(s, quote=True)

# ---------------------------------------------------------------- as peças do D38, sem mudança
_src = open(os.path.join(AQUI, 'exito_baixado.py'), encoding='utf-8').read()
_src = _src[:_src.index('# ====================================================================================== Parte B')]
_tmp = tempfile.mkdtemp()
_argv = sys.argv[:]
sys.argv = [os.path.join(AQUI, 'exito_baixado.py'), _tmp]
EB = types.SimpleNamespace()
_ns = {'__name__': 'exito_baixado_pecas', '__file__': os.path.join(AQUI, 'exito_baixado.py')}
exec(compile(_src, 'exito_baixado.py', 'exec'), _ns)
sys.argv = _argv
EB = types.SimpleNamespace(**_ns)
F = EB.F
from comum import tpl, janela, aviso, ico, pagina, barra_area, toast  # noqa: E402

R, selo, folha, campo, selecao, FORMAS = F.R, F.selo, F.folha, F.campo, F.selecao, F.FORMAS
FARQ = 'financeiro.html?estado='

# ---------------------------------------------------------------- dados (A4 do plano)
HEL, PN = 'Helena Duarte', 'Helena'
CT, CASO = 'C-2026-027', 'Duarte x Construtora Atlas'
NUM = '1004417-58.2026.8.26.0100'
ALV, HON = 16000, 4800
DESC = f'Êxito · {CASO}'
QUEM = EB.QUEM

CSS_EX_REAL = r"""
/* ===== Êxito para conferir: o CSS ex- de hoje (sistema/packages/ui/src/portal.css:4976-5023), copiado sem mudança ===== */
.ex-bloco{border-left:4px solid var(--vinho);overflow:hidden;margin-bottom:20px}
.ex-cab{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:18px 20px 12px}
.ex-cab h2{display:flex;gap:8px;align-items:center;margin:0;font-family:var(--serifa);font-size:22px;font-weight:500;color:var(--vinho)}
.ex-cab h2 .ico{width:20px;height:20px}
.ex-cab p{margin:2px 0 0;font-size:13px;color:var(--texto-2)}
.ex-valor{display:grid;justify-items:end}
.ex-valor b{font-family:var(--serifa);font-size:18px;font-weight:500;color:var(--vinho)}
.ex-valor small{font-size:12px;color:var(--texto-2)}
.ex-pe{display:flex;justify-content:space-between;align-items:center;gap:12px;width:100%;flex-wrap:wrap}
.ex-pe-dir{display:flex;gap:10px;margin-left:auto}
.ex-nao{color:var(--vinho)}
.ex-origem-cab{display:flex;justify-content:space-between;align-items:center;gap:12px}
.ex-origem-t{display:flex;gap:8px;align-items:center;margin:0;font-size:12px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--vinho)}
.ex-origem-cab a{display:inline-flex;align-items:center;min-height:44px;font-weight:500}
.ex-origem{display:grid;gap:0;margin:0;border:1px solid var(--vinho-4);border-radius:var(--raio)}
.ex-origem>div{display:grid;grid-template-columns:150px minmax(0,1fr);gap:12px;padding:10px 14px;border-top:1px solid var(--vinho-4)}
.ex-origem>div:first-child{border-top:0}
.ex-origem dt{font-size:13px;color:var(--texto-2)}
.ex-origem dd{margin:0;display:grid;gap:2px}
.ex-origem dd b{font-weight:500}
.ex-origem dd small{font-size:12px;color:var(--texto-2);line-height:1.45}
.ex-origem .ex-conta{background:var(--ambar-3)}
.ex-origem .ex-conta b{color:var(--vinho)}
.ex-rotulo{margin:0 0 6px;font-size:14px;font-weight:500}
.ex-fixo{margin:0;display:grid;gap:2px;padding:10px 12px;border-radius:var(--raio);background:var(--sal-2)}
.ex-fixo b{font-weight:500}
.ex-fixo small{font-size:12px;color:var(--texto-2)}
.ex-tab td{vertical-align:middle}
@media (max-width:760px){
  .ex-cab{flex-direction:column}
  .ex-origem>div{grid-template-columns:1fr;gap:2px}
  .ex-valor{justify-items:start}
  .ex-pe{flex-direction:column-reverse;align-items:stretch}
  .ex-pe-dir{margin-left:0;justify-content:flex-end}
}
"""

CSS_EA = r"""
/* ==========================================================================
   F3.199 · o êxito lançado depois do alvará já nasce pago. Prefixo ea-.
   Só tokens e pares já aprovados. Os avisos são o Aviso do D2: info (filete vinho, fundo papel) quando é só
   informação, atenção (fundo âmbar suave, texto tinta) quando há dinheiro a devolver ou uma ação recusada.
   ========================================================================== */
.ea-aviso .aviso-titulo{line-height:1.45}
.ea-aviso p+p{margin-top:6px}
.ea-aviso .ea-num,.ea-num{white-space:nowrap}
.ea-lista{list-style:none;margin:8px 0 4px;padding:0;display:grid;gap:0;border-top:1px solid var(--borda-folha)}
.ea-lista li{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid var(--borda-folha);font-size:13px}
.ea-lista li b{font-weight:500;white-space:nowrap;font-variant-numeric:tabular-nums}
.ea-ir{display:inline-flex;align-items:center;gap:6px;min-height:44px;font-weight:500;color:var(--vinho)}
.ea-ir .ico{width:16px;height:16px}
.fi-quem .ea-cel{display:flex;gap:6px;align-items:flex-start;color:var(--texto);line-height:1.45}
.fi-quem .ea-cel .ico{flex:none;width:14px;height:14px;margin-top:3px;color:var(--vinho)}
.ea-hist-novo p{font-weight:400}
.ea-pago-l{display:flex;gap:6px;align-items:flex-start;margin-top:2px;font-size:12px;color:var(--vinho)}
.ea-pago-l .ico{flex:none;width:14px;height:14px;margin-top:2px}
.janela .ea-recusa-pe{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;width:100%}
@media (max-width:760px){
  .janela .ea-recusa-pe{display:grid;grid-template-columns:minmax(0,1fr)}
  .janela .ea-recusa-pe .btn{width:100%;justify-content:center}
  /* Revisão (nota 4): a 390, o .janela.fi-larga .janela-pe .btn{width:100%} (portal.css:1585) divide o ex-pe-dir em
     duas metades iguais, e "Lançar em A receber" passava 2 px da largura do botão e era cortado. Cada botão fica com a
     largura do texto e divide o que sobra. Vale levar a mesma regra para o portal.css no PR. */
  .janela.fi-larga .ex-pe-dir .btn{width:auto;flex:1 1 auto}
}
"""


def num(t):
    """Valores sem quebra (o R()$ já usa espaço não separável)."""
    return f'<span class="ea-num">{t}</span>'


def aviso_ea(tom, id_, titulo, paras, extra='', acoes=''):
    """O Aviso do D2 (console/pecas.tsx), com id para o aria-describedby."""
    icone = {'info': 'ajuda', 'atencao': 'alerta', 'sucesso': 'check'}[tom]
    ps = ''.join(f'<p>{p}</p>' for p in paras)
    ac = f'<div class="aviso-acoes">{acoes}</div>' if acoes else ''
    return (f'<div class="aviso aviso-{tom} ea-aviso" id="{id_}" role="status">{ico(icone)}'
            f'<div><strong class="aviso-titulo">{titulo}</strong>{ps}{extra}{ac}</div></div>')


# ====================================================================================== Conferir o êxito (ea-conferir)
def bloco_helena():
    rows = (f'<tr><td data-r="Cliente e caso"><div class="fi-quem"><b>{HEL}</b><small><a href="#">{CASO}</a> · acordo</small></div></td>'
            f'<td data-r="Contrato e conta"><div class="fi-quem"><b>{CT}</b><small>30% de {R(ALV)}</small></div></td>'
            f'<td data-r="Êxito" class="fi-v num"><div class="ex-valor"><b>{R(HON)}</b><small>calculado</small></div></td>'
            f'<td data-r="Previsto"><div class="fi-dt"><b class="num">15/12</b><small>2026 · ter.</small></div></td>'
            f'<td data-r="Quem encerrou"><div class="fi-quem"><b>Marina Ribeiro</b><small>encerrou em 17/11, às 16h40</small></div></td>'
            f'<td data-r="" class="fi-acao"><button class="btn btn-pri btn-compacto" type="button" data-janela="j-conferir">{ico("check")}Conferir<span class="sr"> o êxito de {HEL}</span></button></td></tr>')
    car = (f'<li class="cartao"><div class="c-topo"><div><strong class="c-nome">{HEL}</strong><small>{CASO} · acordo</small></div>'
           f'<span class="fi-cartao-v num" style="margin-left:auto">{R(HON)}</span></div>'
           f'<dl class="c-dados"><dt>Contrato</dt><dd>{CT}</dd><dt>Conta</dt><dd>30% de {R(ALV)}</dd><dt>Previsto</dt><dd class="num">15/12/2026</dd>'
           f'<dt>Encerrou</dt><dd>Marina Ribeiro, 17/11, 16h40</dd></dl>'
           f'<div class="c-acoes"><button class="btn btn-pri" type="button" data-janela="j-conferir">{ico("check")}Conferir o êxito de {PN}</button></div></li>')
    tab = (f'<table class="so-pc fi-tab ex-tab"><caption class="sr">Êxitos calculados no encerramento dos casos, esperando conferência</caption>'
           f'<colgroup><col style="width:25%"><col style="width:24%"><col style="width:13%"><col style="width:11%"><col style="width:16%"><col style="width:11%"></colgroup>'
           f'<thead><tr><th scope="col">Cliente e caso</th><th scope="col">Contrato e conta</th><th scope="col" style="text-align:right">Êxito</th>'
           f'<th scope="col">Previsto</th><th scope="col">Quem encerrou</th><th scope="col"><span class="sr">Ação</span></th></tr></thead><tbody>{rows}</tbody></table>'
           f'<ul class="cartoes so-cel" aria-label="Êxitos para conferir">{car}</ul>')
    return (f'<section class="folha ex-bloco" aria-labelledby="t-ex"><header class="ex-cab"><div><h2 id="t-ex">{ico("balanca")}Êxito para conferir</h2>'
            f'<p>1 cliente · {R(HON)} calculados pelo contrato</p></div>{selo("atencao", "1 esperando você", "relogio")}</header>{tab}'
            f'<p class="ex-pe" style="padding:12px 20px 16px;border-top:1px solid var(--divisor);font-size:13px;color:var(--texto-2);margin:0">{ico("ajuda")}'
            f'<span>Vem do Jurídico quando um caso termina com ganho ou acordo: o T3jus calcula pelo contrato de cada cliente. <b>Nada é cobrado antes de alguém do Financeiro conferir.</b> Estes valores ainda não entram nos números abaixo.</span></p></section>')


def receber_com_bloco(bloco=True):
    r = F.receber()
    if bloco:
        r = r.replace('<div class="fi-nums"', bloco_helena() + '<div class="fi-nums"', 1)
    return r


def aviso_conferir(var):
    """var: padrao | sobra | dois. O aviso fica no fim do corpo, logo acima do "Lançar em A receber"."""
    ir = f'<a class="ea-ir" href="{FARQ}ea-repasse">{ico("enviar")}Ver o alvará de 12/11 em Repasses</a>'
    if var == 'dois':
        lista = (f'<ul class="ea-lista" aria-label="Honorários que já entraram"><li><span>Alvará de 05/11/2026</span><b>{R(1800)}</b></li>'
                 f'<li><span>Alvará de 12/11/2026</span><b>{R(3000)}</b></li></ul>')
        return aviso_ea('info', 'cf-alvara', f'Já entraram {num(R(HON))} de honorários do êxito de {PN}, por 2 alvarás.',
                        [], extra=lista + f'<p>Ao lançar, a parcela do êxito nasce paga por esses honorários, a começar pelo alvará mais antigo. Se o valor lançado for maior, o resto fica em A receber.</p>')
    tit = f'Já entraram {num(R(HON))} de honorários do êxito de {PN}, pelo alvará de 12/11/2026.'
    if var == 'sobra':
        return aviso_ea('atencao', 'cf-alvara', tit,
                        ['Ao lançar, a parcela do êxito nasce paga por esses honorários.',
                         f'Os honorários do alvará passam do êxito lançado em {num(R(1800))}. Esse valor foi descontado de {PN} além do êxito. '
                         f'Combine com ela a devolução, que ainda é feita fora do T3jus.'], acoes=ir)
    return aviso_ea('info', 'cf-alvara', tit,
                    [f'Ao lançar, a parcela do êxito nasce paga por esses honorários. Se o valor lançado for maior, o resto fica em A receber.'], acoes=ir)


def j_conferir(var='padrao', abrir=True):
    """A JanelaConferir de hoje (FinanceiroExito.tsx:89-226), com o aviso novo no lugar da frase de :217."""
    mudou = var == 'sobra'
    alvo = (f'<div class="fi-alvo">{ico("balanca")}<div><strong>{HEL} · honorário de êxito</strong>'
            f'<small>{CASO} · contrato {CT}</small></div><span class="fi-v num">{R(HON)}</span></div>')
    origem = (f'<div class="ex-origem-cab"><p class="ex-origem-t">{ico("balanca")}De onde veio</p><a class="jr-link" href="#">Ver o caso</a></div>'
              f'<dl class="ex-origem">'
              f'<div><dt>Caso</dt><dd><b>{CASO}</b><small>{NUM}</small></dd></div>'
              f'<div><dt>Resultado</dt><dd><b>Acordo</b><small>Marina Ribeiro encerrou o caso em 17/11/2026, às 16h40. “Acordo homologado; a construtora depositou o valor em juízo.”</small></dd></div>'
              f'<div><dt>Valor para {PN}</dt><dd><b>{R(ALV)}</b><small>Pagamento previsto: 15/12/2026</small></dd></div>'
              f'<div><dt>Contrato</dt><dd><b>{CT}, assinado em 03/03/2026</b><small>Êxito de 30% sobre: “o valor que a cliente receber no processo, por sentença ou acordo”.</small></dd></div>'
              f'<div class="ex-conta"><dt>Conta</dt><dd><b>30% de {R(ALV)} = {R(HON)}</b></dd></div></dl>')
    vv = '3.000,00' if mudou else '4.800,00'
    aj = (f'Era {R(HON)}, pelo contrato. Mudou para {R(3000)}.' if mudou else f'Calculado pelo contrato: {R(HON)}. Se mudar, o T3jus pede o motivo.')
    valor = (f'<div class="campo"><label for="cf-valor">Honorário de êxito</label>'
             f'<input class="entrada" id="cf-valor" type="text" inputmode="decimal" autocomplete="off" value="{vv}" aria-describedby="cf-valor-aj"{"" if mudou else " data-foco"}>'
             f'<p class="ajuda" id="cf-valor-aj">{aj}</p></div>')
    venc = (f'<div class="campo"><label for="cf-venc">Vencimento</label>'
            f'<input class="entrada" id="cf-venc" type="text" inputmode="numeric" autocomplete="off" value="15/12/2026" aria-describedby="cf-venc-aj">'
            f'<p class="ajuda" id="cf-venc-aj">dd/mm/aaaa. Sugerido: o pagamento previsto do acordo.</p></div>')
    motivo = ''
    if mudou:
        motivo = (f'<div class="campo ex-motivo"><label for="cf-motivo">Por que mudou o valor</label>'
                  f'<textarea class="entrada" id="cf-motivo" rows="2" aria-describedby="cf-motivo-aj" data-foco>A cliente abriu mão dos danos morais no acordo; o êxito conta só os R$ 10.000,00 dos danos materiais.</textarea>'
                  f'<p class="ajuda" id="cf-motivo-aj">Fica no histórico do caso e do contrato, com seu nome e a hora. Quem encerrou o caso é avisado no sino.</p></div>')
    forma = (f'<div class="fi-dois">{selecao("cf-forma", "Forma de pagamento", FORMAS, "Pix", ajuda=f"{PN} recebe do processo e paga o escritório.")}'
             f'<div class="campo"><p class="ex-rotulo">Responsável pela cobrança</p><p class="ex-fixo"><b>Diego Almeida</b>'
             f'<small>O responsável pelo contrato {CT}, como nas outras parcelas.</small></p></div></div>')
    caixa = f'<p class="fi-caixa-fixa">{ico("coluna")}<span>Entra no caixa <b>do escritório</b>: é honorário.</span></p>'
    corpo = alvo + origem + f'<div class="fi-dois">{valor}{venc}</div>' + motivo + forma + caixa + aviso_conferir(var)
    pe = (f'<div class="ex-pe"><button class="btn btn-fantasma ex-nao" type="button" data-janela="j-nao-cobrar">Não cobrar este êxito</button>'
          f'<span class="ex-pe-dir"><button class="btn btn-sec" type="button" data-fechar>Cancelar</button>'
          f'<button class="btn btn-pri" type="button" aria-describedby="cf-alvara">{ico("check")}Lançar em A receber</button></span></div>')
    j = janela('j-conferir', 'A receber · Êxito para conferir', 'Conferir o êxito',
               f'Confira a conta antes de cobrar {PN}. Valor e vencimento já vêm preenchidos; mude se precisar.', corpo, pe, abrir=abrir)
    return j.replace('class="janela"', 'class="janela fi-larga"', 1)


def j_nao_cobrar_recusa(abrir=True):
    """A JanelaNaoCobrar com honorários já entrados (C2 decidida: recusa)."""
    av = aviso_ea('atencao', 'nc-recusa', f'Os honorários deste êxito já entraram pelo alvará de 12/11 ({num(R(HON))}).',
                  [f'Para não cobrar, o dinheiro teria de voltar para {PN}, e isso ainda não é feito pelo T3jus. Lance o êxito: ele nasce pago.'])
    alvo = (f'<div class="fi-alvo">{ico("balanca")}<div><strong>{HEL} · honorário de êxito</strong>'
            f'<small>{CASO} · 30% de {R(ALV)}</small></div><span class="fi-v num">{R(HON)}</span></div>')
    corpo = av + alvo
    pe = (f'<div class="ea-recusa-pe"><button class="btn btn-sec" type="button" aria-disabled="true" aria-describedby="nc-recusa">Não cobrar</button>'
          f'<button class="btn btn-pri" type="button" data-janela="j-conferir" data-foco>{ico("esq")}Voltar para conferir</button></div>')
    return janela('j-nao-cobrar', f'{HEL} · {R(HON)}', 'Não cobrar este êxito',
                  f'Este êxito não pode ficar sem cobrança, porque os honorários dele já entraram. Volte para conferir e lance o êxito de {PN}.',
                  corpo, pe, abrir=abrir)


def lancado():
    r = receber_com_bloco(bloco=False)
    # Revisão (nota 3): o pagamento da parcela tem recebido_em = 12/11, neste mês. O "Recebido em novembro" de A receber
    # (0220:198-221) soma todo pagamento da parcela no mês, sem olhar a caixa: passa de R$ 31.240,00 (19) para
    # R$ 36.040,00 (20). "Em aberto" não muda, porque a parcela nasce paga.
    antes = f'<span class="r">Recebido em novembro</span><b class="num">{R(31240)}</b><small>19 parcelas</small>'
    assert r.count(antes) == 1, 'lancado: não achei o Recebido em novembro'
    r = r.replace(antes, f'<span class="r">Recebido em novembro</span><b class="num">{R(31240 + HON)}</b><small>20 parcelas</small>', 1)
    return r + toast('Êxito lançado e pago em 12/11, pelo alvará.',
                     f'Nada ficou em A receber. {R(HON)} de {HEL}, pagos pelos honorários do alvará. Ficou no histórico do caso, do contrato e do repasse.')


# ====================================================================================== Repasses (ea-proposta, ea-exito-pago)
def linha_prop(i, nome, regra, valor, extra=''):
    return EB.linha_prop(i, nome, regra, valor, 'esc', extra)


def j_registrar(var):
    """var: conferir | sem | pago | falta (Diego, Registrar alvará ou RPV)."""
    dia = {'conferir': '18/11/2026', 'sem': '12/11/2026', 'pago': '18/11/2026', 'falta': '18/11/2026'}[var]
    alv = {'conferir': ALV, 'sem': ALV, 'pago': 5000, 'falta': 10000}[var]
    alv_t = R(alv).replace('R$ ', '').replace('R$ ', '')
    campos = (f'<div class="fi-dois">{selecao("rp-tipo", "O que entrou", ["Escolha", "Alvará", "RPV", "Precatório", "Depósito de acordo"], "Alvará")}'
              + selecao('rp-caso', 'Caso e cliente', ['Escolha o caso', f'{CASO} · {HEL}', 'Lopes x Transportadora Rota Sul · Sebastião Lopes'], f'{CASO} · {HEL}') + '</div>'
              + f'<div class="fi-dois">{campo("rp-valor", "Valor levantado", alv_t, im="decimal")}{campo("rp-dia", "Dia em que entrou", dia, im="numeric", ajuda="dd/mm/aaaa")}</div>'
              + f'<p class="fi-caixa-fixa">{ico("escudo")}<span>Entra como <b>valor de terceiros</b>. Só a parte do escritório passa para o caixa dele, quando for transferida.</span></p>')
    regra = f'30% · acordo · contrato {CT}'
    linhas, cliente, av = '', alv, ''
    if var in ('conferir', 'sem'):
        txt = (f'O êxito de {PN} ainda não foi lançado. Estes honorários pagam a parcela quando ela for lançada.' if var == 'conferir'
               else f'O caso de {PN} ainda não foi encerrado. Estes honorários pagam o êxito quando ele for lançado.')
        linhas += linha_prop(0, 'Honorários de êxito', regra, HON, f'<small class="ea-cel">{ico("relogio")}{txt}</small>')
        cliente -= HON
    elif var == 'falta':
        linhas += linha_prop(0, 'Honorários de êxito', regra + ' · até o que falta do êxito', 1800,
                             f'<small class="rp-baixa">{ico("check")}Dá baixa na parcela “{DESC}” (falta {R(1800)})</small>')
        cliente -= 1800
        av = aviso_ea('info', 'ea-limite', f'Falta {num(R(1800))} do êxito de {PN}.',
                      [f'Os honorários deste alvará ficam limitados a esse valor. Pelos 30% do contrato, seriam {num(R(3000))}.'])
    else:  # pago
        av = aviso_ea('info', 'ea-limite', f'O êxito de {PN} já foi pago ({num(R(HON))}, em 12/11).',
                      ['Por isso, este alvará não tem honorários do êxito.'])
    linhas += (f'<tr class="rp-cliente"><td><div class="fi-quem"><strong>{HEL}</strong><small>Cliente · o que fica, depois das outras partes</small></div></td>'
               f'<td data-r="Caixa"><span class="fi-cat terc">{ico("escudo")}Terceiros</span></td><td data-r="Valor" class="fi-v num">{R(cliente)}</td></tr>')
    tab = (f'<table class="fi-tab rp-tab"><caption class="sr">Para quem vai cada parte</caption>'
           f'<colgroup><col style="width:48%"><col style="width:20%"><col style="width:32%"></colgroup>'
           f'<thead><tr><th scope="col">Para quem</th><th scope="col">Caixa</th><th scope="col" style="text-align:right">Valor</th></tr></thead><tbody>{linhas}</tbody></table>')
    soma = (f'<p class="fi-ref" role="status">{ico("check")}<span>Soma da divisão: <b>{R(alv)}</b>, igual ao valor levantado. Falta destinar: <b>{R(0)}</b>. '
            f'Parcela em atraso do cliente <b>não</b> é descontada aqui sem o aceite de {PN}.</span></p>')
    acres = f'<button class="btn btn-sec btn-compacto" type="button" style="justify-self:start">{ico("mais")}Acrescentar perito, parceiro ou outro</button>'
    desc = ' aria-describedby="ea-limite"' if av else ''
    div = f'<fieldset class="rp-div"{desc}><legend>Divisão proposta pelo contrato {CT}</legend>{tab}{av}{acres}{soma}</fieldset>'
    pe = (f'<button class="btn btn-sec" type="button" data-fechar>Cancelar</button>'
          f'<button class="btn btn-pri" type="button">{ico("check")}Registrar</button>')
    h = janela('j-rpv', 'Repasses', 'Registrar alvará ou RPV', 'Diga o que entrou e de qual caso. A divisão sai do contrato, e você pode ajustar antes de registrar.',
               campos + div, pe, abrir=True).replace('class="janela"', 'class="janela fi-larga"', 1)
    return h.replace('<select class="entrada" id="rp-tipo">', '<select class="entrada" id="rp-tipo" data-foco>', 1)


def ficha_helena():
    """Marina, ficha do repasse do alvará de 12/11 (estado 5): tudo feito; o histórico ganha a linha do lançamento."""
    dir_ = (f'<section class="dir campo-ambar" aria-labelledby="t-dir"><p class="fi-terc-rot" id="t-dir">{ico("escudo")}Ainda com o escritório</p>'
            f'<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><p class="grande num">{R(0)}</p>{selo("ok", "Tudo repassado", "check")}</div>'
            f'<p class="fi-oque"><b>Nada a repassar.</b> {PN} recebeu a parte dela em 16/11.</p></section>')
    cab = (f'<div class="ficha-cab"><div class="esq campo-vinho">{ico("balanca", "ico estatua")}'
           f'<a class="voltar" href="{FARQ}repasses">{ico("esq", "ico ico-s")}Repasses</a>'
           f'<div class="ident"><div><p class="sobretitulo">Alvará · {CASO}</p><h1>{HEL}</h1>'
           f'<p class="meta"><span class="selo" style="background:var(--ambar-3);color:var(--vinho)">2 de 2 feitos</span><span>levantado em 12/11/2026</span><span class="sep" aria-hidden="true"></span><span class="num">{R(ALV)}</span></p></div></div></div>{dir_}</div>')
    pagou = f'<span class="ea-pago-l">{ico("check")}Pagou a parcela do êxito, lançada em 18/11</span>'
    linhas = [
        ('HD', HEL, 'Cliente · o que fica para ela', R(11200), selo('ok', 'Repassado 16/11', 'check'), f'<div class="fi-docs"><a href="#">{ico("link")}Comprovante</a></div>', ''),
        ('RM', 'Honorários de êxito (30%)', f'Escritório · contrato {CT}', R(HON), selo('ok', 'Transferido 13/11', 'check'), f'<div class="fi-docs"><a href="#">{ico("doc")}Recibo 0183</a></div>', pagou),
    ]
    rows, car = '', ''
    for ini, q, r, v, s, d, ext in linhas:
        rows += (f'<tr><td><div class="fi-quem-d"><span class="av-p forte" aria-hidden="true">{ini}</span><div><strong>{q}</strong><small>{r}</small>{ext}</div></div></td>'
                 f'<td>{s}</td><td class="fi-v num">{v}</td><td>{d}</td></tr>')
        car += (f'<li class="cartao"><div class="c-topo"><div><strong class="c-nome" style="font-size:18px">{q}</strong><small>{r}</small>{ext}</div></div>'
                f'<dl class="c-dados"><dt>Valor</dt><dd class="num">{v}</dd></dl><div class="c-selos">{s}</div></li>')
    tab = (f'<table class="so-pc fi-tab fi-dest"><caption class="sr">Para onde foi cada parte</caption><colgroup><col style="width:40%"><col style="width:23%"><col style="width:18%"><col style="width:19%"></colgroup>'
           f'<thead><tr><th scope="col">Para quem</th><th scope="col">Situação</th><th scope="col" style="text-align:right">Valor</th><th scope="col">Documento</th></tr></thead><tbody>{rows}</tbody>'
           f'<tfoot><tr><th scope="row">Levantado e destinado</th><td style="white-space:nowrap">Falta destinar {R(0)}</td><td class="fi-v num">{R(ALV)}</td><td></td></tr></tfoot></table>'
           f'<ul class="cartoes so-cel" aria-label="Para onde foi cada parte">{car}</ul>')
    dest = folha('t-dest', 'Para onde vai cada parte', tab, sub='A divisão saiu do contrato e foi aceita sem mudança por Diego Almeida em 12/11.', icone='enviar', terc=True)
    hist = folha('t-hist', 'Histórico', (
        '<div class="eventos-dia" style="padding-top:0"><h3>18/11/2026 · hoje</h3><ol class="eventos">'
        f'<li class="ea-hist-novo"><time>10h20</time><span class="pto" aria-hidden="true"></span><div><p>A parcela do êxito de {PN} foi lançada em 18/11 por Diego e paga por esta parte de honorários ({num(R(HON))}).</p>'
        f'<small>Diego Almeida, ao conferir o êxito em A receber</small></div></li></ol></div>'
        '<div class="eventos-dia"><h3>16/11/2026</h3><ol class="eventos">'
        f'<li><time>09h31</time><span class="pto" aria-hidden="true"></span><div><p><b>Diego Almeida</b> repassou {R(11200)} a {PN}</p><small>Pix · comprovante anexado</small></div></li></ol></div>'
        '<div class="eventos-dia"><h3>13/11/2026</h3><ol class="eventos">'
        f'<li><time>15h02</time><span class="pto" aria-hidden="true"></span><div><p><b>Diego Almeida</b> transferiu {R(HON)} de honorários para o caixa do escritório</p><small>Recibo 0183</small></div></li></ol></div>'
        '<div class="eventos-dia"><h3>12/11/2026</h3><ol class="eventos">'
        f'<li><time>11h47</time><span class="pto" aria-hidden="true"></span><div><p><b>Diego Almeida</b> registrou Alvará de {R(ALV)}</p><small>divisão do contrato aceita sem mudança</small></div></li></ol></div>'), icone='historico')
    fecha = folha('t-fecha', 'Fechamento do caso', (
        f'<div class="fi-fecha"><ul class="fi-check">'
        f'<li>{ico("check")}<span>Alvará registrado</span></li>'
        f'<li>{ico("check")}<span>Êxito do contrato {CT}: pago por este alvará<small>lançado por Diego Almeida em 18/11 · pago em 12/11</small></span></li>'
        f'<li>{ico("check")}<span>{PN} recebeu a parte dela</span></li>'
        f'<li>{ico("check")}<span>Honorários no caixa do escritório</span></li></ul>'
        f'<button class="btn btn-sec" type="button">{ico("cadeado")}Encerrar o caso no financeiro</button></div>'), icone='cadeado', sub='Só encerra com tudo recebido e tudo repassado')
    return f'<div class="fi">{cab}<div class="fi-grade"><div class="fi-col">{dest}{hist}</div><aside class="fi-col" aria-label="Fechamento">{fecha}</aside></div></div>'


# ====================================================================================== eb-proposta "paga em parte", revisto (C3)
def eb_parte():
    """A janela aprovada do D38 com "Desfazer" marcado, na variação "paga em parte": com a C3 = limitar, a linha
    passa de R$ 4.800,00 para R$ 3.800,00, o que falta da parcela."""
    h = EB.j_registrar_eb('desfazer')
    antes = h
    h = h.replace(f'<small>30% · acordo · contrato {EB.CT_R}</small>', f'<small>30% · acordo · contrato {EB.CT_R} · até o que falta do êxito</small>', 1)
    h = h.replace('id="rp-v-0" type="text" inputmode="decimal" autocomplete="off" value="4.800,00"', 'id="rp-v-0" type="text" inputmode="decimal" autocomplete="off" value="3.800,00"', 1)
    h = h.replace(f'Paga a parcela do êxito (falta {R(4800)})', f'Paga a parcela do êxito (falta {R(3800)})', 1)
    h = h.replace(f'<td data-r="Valor" class="fi-v num">{R(16000 - 4800 - 412.30)}</td>', f'<td data-r="Valor" class="fi-v num">{R(16000 - 3800 - 412.30)}</td>', 1)
    h = h.replace('<p class="eb-expl">', f'<p class="eb-det">Recebido <span class="eb-num">{R(1000)}</span> de <span class="eb-num">{R(4800)}</span>. '
                  f'A baixa sem receber foi dos <span class="eb-num">{R(3800)}</span> que faltavam.</p><p class="eb-expl">', 1)
    h = h.replace(f'Os {R(4800)} ficam com {EB.PN}.', f'Os {R(3800)} ficam com {EB.PN}.', 1)
    assert h.count('3.800,00') >= 4 and R(16000 - 3800 - 412.30) in h and h != antes, 'eb_parte não aplicou as trocas'
    return h


# ====================================================================================== estados
def A(secao, titulo=None, trilha=None, quem='diego'):
    d = dict(area='financeiro', secao=secao, atual='financeiro', trilha=trilha or f'Financeiro|{secao}', titulo=titulo or secao)
    if quem:
        d['quem'] = quem
    return d


ROT, T = {}, ''


def add(nome, corpo, rotulo, **kw):
    global T
    ROT[nome] = rotulo
    T += tpl(nome, corpo, **kw)


REP = F.repasses()
REC = receber_com_bloco()
add('ea-conferir', REC + j_conferir('padrao') + j_nao_cobrar_recusa(False), 'Conferir o êxito: os honorários do alvará já entraram', **A('A receber', 'Conferir o êxito'))
add('ea-conferir-sobra', REC + j_conferir('sobra') + j_nao_cobrar_recusa(False), 'Lançado menor que os honorários: o aviso pede a devolução', **A('A receber', 'Conferir o êxito'))
add('ea-conferir-dois', REC + j_conferir('dois') + j_nao_cobrar_recusa(False), 'Dois alvarás: a lista, do mais antigo ao mais novo', **A('A receber', 'Conferir o êxito'))
add('ea-nao-cobrar', REC + j_conferir('padrao', False) + j_nao_cobrar_recusa(True), '“Não cobrar” recusado: os honorários já entraram (C2)', **A('A receber', 'Não cobrar este êxito'))
add('ea-lancado', lancado(), 'Depois de lançar: o êxito nasce pago, nada em A receber', **A('A receber'))
add('ea-proposta', REP + j_registrar('conferir'), 'Divisão do alvará com o êxito para conferir: a linha curta', **A('Repasses', 'Registrar alvará ou RPV'))
add('ea-proposta-sem-conferencia', REP + j_registrar('sem'), 'Divisão do alvará com o caso em andamento: a linha curta', **A('Repasses', 'Registrar alvará ou RPV'))
add('ea-repasse', ficha_helena(), 'Marina, na ficha do repasse: a linha do histórico', **A('Repasses', HEL, f'Financeiro|Repasses|{HEL}', quem=None))
add('ea-exito-pago', REP + j_registrar('pago'), 'Segundo alvará com o êxito já pago: sem honorários (C3)', **A('Repasses', 'Registrar alvará ou RPV'))
add('ea-exito-falta', REP + j_registrar('falta'), 'Segundo alvará com parte do êxito em aberto: limitado ao que falta (C3)', **A('Repasses', 'Registrar alvará ou RPV'))
add('eb-proposta-parte', REP + eb_parte(), 'eb-proposta revisto, “paga em parte”: R$ 3.800,00 no lugar de R$ 4.800,00 (C3)', **A('Repasses', 'Registrar alvará ou RPV'))

barras = ''
for s, e in [('A receber', 'ea-conferir'), ('Repasses', 'ea-proposta')]:
    b = barra_area('financeiro', s)
    b = b.replace(f'<a href="#" aria-current="page">{s}</a>', f'<a href="{FARQ}{e}" aria-current="page">{s}</a>')
    barras += f'<template data-barra="financeiro|{s}">{b}</template>\n'

out = pagina('Financeiro', 'O êxito lançado depois do alvará já nasce pago (F3.199, D39).', '{"estado":"ea-conferir","atual":"financeiro"}', '', T, barras)
out = out.replace('</style>', F.CSS_FI + '\n' + EB.CSS_RP + '\n' + EB.CSS_EB + '\n' + CSS_EX_REAL + '\n' + CSS_EA + '\n</style>', 1)
out = out.replace("'sem-area':{", QUEM, 1)
assert 'diego:{' in out
open(os.path.join(SAIDA, 'financeiro.html'), 'w', encoding='utf-8').write(out)

# ====================================================================================== casos.json e index.html
C3 = 'c3'
SECOES = [
    ('conferir', 'Conferir o êxito, com os honorários do alvará já entrados', '',
     f'Ribeiro & Matos, quarta-feira, 18/11/2026. Helena Duarte ({CT}, “{CASO}”, êxito de 30%). Em 12/11, Diego registrou um alvará de {R(ALV)}, '
     f'com {R(HON)} de honorários. Em 17/11, Marina encerrou o caso com Acordo, e o êxito calculado, de {R(HON)}, está para conferir. Hoje Diego confere.',
     [('ea-conferir', '', f'Diego. A janela de hoje, com o aviso informativo no fim, logo acima de “Lançar em A receber”: “Já entraram R$ 4.800,00 de honorários do êxito de Helena, pelo alvará de 12/11/2026.” e “Ao lançar, a parcela do êxito nasce paga por esses honorários. Se o valor lançado for maior, o resto fica em A receber.”. O aviso toma o lugar da frase “o honorário sai na divisão de Repasses”, que só vale sem honorários já entrados. O botão “Lançar” aponta para o aviso por aria-describedby.'),
      ('ea-conferir-sobra', '', 'Variação das notas: Diego mudou o valor para R$ 3.000,00, com o motivo. O aviso vira de atenção (âmbar) e pede a devolução: “Os honorários do alvará passam do êxito lançado em R$ 1.800,00. Esse valor foi descontado de Helena além do êxito. Combine com ela a devolução, que ainda é feita fora do T3jus.”. Vale nos dois caminhos da C3: o limite não resolve o alvará que chegou antes da conferência.'),
      ('ea-conferir-dois', '', 'Variação das notas: dois alvarás (05/11, R$ 1.800,00, e 12/11, R$ 3.000,00). O aviso traz a lista, na ordem em que pagam a parcela.'),
      ('ea-nao-cobrar', '', 'C2 decidida: recusa. Diego clicou em “Não cobrar este êxito”. O aviso de atenção vem no topo: “Os honorários deste êxito já entraram pelo alvará de 12/11 (R$ 4.800,00).” e “Para não cobrar, o dinheiro teria de voltar para Helena, e isso ainda não é feito pelo T3jus. Lance o êxito: ele nasce pago.”. “Não cobrar” fica aria-disabled, apontando para o aviso, e “Voltar para conferir” recebe o foco. Os campos de motivo saem, porque não há o que enviar.'),
      ('ea-lancado', '', 'Diego lançou R$ 4.800,00. O bloco “Êxito para conferir” some (Helena era a única), nenhuma parcela nova aparece em A receber, e “Em aberto” não muda. Como a parcela foi paga em 12/11, neste mês, “Recebido em novembro” passa de R$ 31.240,00 (19 parcelas) para R$ 36.040,00 (20). A confirmação diz: “Êxito lançado e pago em 12/11, pelo alvará.” e “Nada ficou em A receber. R$ 4.800,00 de Helena Duarte, pagos pelos honorários do alvará. Ficou no histórico do caso, do contrato e do repasse.”.')]),
    ('repasses', 'Repasses: a divisão do alvará e a ficha do repasse', '',
     'A linha curta na célula de honorários vem de exitoSituacao, sem escolha. Ela só informa: os honorários continuam na divisão.',
     [('ea-proposta', '', 'Outra ordem dos fatos: o alvará de R$ 16.000,00 só entra em 18/11, depois do encerramento e antes da conferência. Diego registra o alvará de Helena com o êxito “para conferir” (PARA_CONFERIR). Na célula de honorários: “O êxito de Helena ainda não foi lançado. Estes honorários pagam a parcela quando ela for lançada.”, com ícone de relógio, em tinta. Nada mais muda na janela.'),
      ('ea-proposta-sem-conferencia', '', 'O caso de exemplo: em 12/11, o caso ainda estava em andamento (SEM_CONFERENCIA). A célula diz: “O caso de Helena ainda não foi encerrado. Estes honorários pagam o êxito quando ele for lançado.”'),
      ('ea-repasse', '', 'Marina abre a ficha do repasse do alvará de 12/11. No histórico de hoje, a linha nova: “A parcela do êxito de Helena foi lançada em 18/11 por Diego e paga por esta parte de honorários (R$ 4.800,00).”. Na linha dos honorários, “Pagou a parcela do êxito, lançada em 18/11”, e o fechamento do caso diz que o êxito foi pago por este alvará.')]),
    ('c3', 'Depende da C3 (desenhado com “limitar”, a recomendação)', C3,
     'Com a C3 = limitar, a proposta de honorários de um alvará fica limitada ao que ainda falta do êxito lançado. Se a Carol escolher “só avisar”, estes três estados saem do D39, como está nas NOTAS.',
     [('ea-exito-pago', C3, 'Um segundo alvará de Helena, de R$ 5.000,00, com o êxito já pago. A divisão vem sem a linha de honorários, e Helena fica com R$ 5.000,00. Abaixo da tabela, o aviso: “O êxito de Helena já foi pago (R$ 4.800,00, em 12/11).” e “Por isso, este alvará não tem honorários do êxito.”'),
      ('ea-exito-falta', C3, 'Variação das notas: o primeiro alvará pagou R$ 3.000,00 e falta R$ 1.800,00 do êxito. Um segundo alvará de R$ 10.000,00 propõe R$ 1.800,00, com a regra “· até o que falta do êxito”. Aviso: “Falta R$ 1.800,00 do êxito de Helena.” e “Os honorários deste alvará ficam limitados a esse valor. Pelos 30% do contrato, seriam R$ 3.000,00.” Helena fica com R$ 8.200,00.'),
      ('eb-proposta-parte', C3, 'A variação “paga em parte” do eb-proposta aprovado (D38), revista: Rita pagou R$ 1.000,00 e teve baixa dos R$ 3.800,00 que faltavam. Com “Desfazer” marcado, a linha passa de R$ 4.800,00 para R$ 3.800,00, com “· até o que falta do êxito”, e Rita fica com R$ 11.787,70 (antes, R$ 10.787,70). A opção “Manter” passa a dizer “Os R$ 3.800,00 ficam com Rita.”')]),
]
casos = [{'nome': n, 'url': f'financeiro.html?estado={n}', 'rotulo': ROT[n]} for _, _, _, _, its in SECOES for n, _, _ in its]
json.dump(casos, open(os.path.join(AQUI, 'casos.json'), 'w'), ensure_ascii=False, indent=1)

FRASES = [
    ('Janela “Conferir o êxito”, a frase do fim (FinanceiroExito.tsx:217)',
     'Se o dinheiro do acordo entrar pelo escritório (alvará ou depósito na conta), o honorário sai na divisão de Repasses.',
     'Sem honorários já entrados: “Se o dinheiro do acordo entrar pelo escritório (alvará ou depósito na conta), o honorário sai na divisão de Repasses e paga esta parcela<mark>, até o que faltar dela</mark>.” Com honorários já entrados, a frase sai e o aviso do ea-conferir toma o lugar.',
     'O trecho marcado só entra com a C3 = limitar. Com “só avisar”, a frase termina em “e paga esta parcela.”'),
    ('Janela “Não cobrar este êxito”, o aviso do fim (FinanceiroExito.tsx:291-292)',
     'Se o dinheiro vier por alvará, lance o êxito. Ele fica em A receber e é baixado na divisão do alvará, em Repasses. O caso continua “Encerrado · acerto pendente” no Jurídico até tudo ser recebido e repassado.',
     'Só sem honorários já entrados (com eles, a janela recusa: ea-nao-cobrar). “Se o dinheiro vier por alvará, lance o êxito. Ele fica em A receber, e os honorários da divisão do alvará, em Repasses, pagam a parcela<mark>, até o que faltar dela</mark>. O caso continua “Encerrado · acerto pendente” no Jurídico até tudo ser recebido e repassado.”',
     'Troca “é baixado” por “pagam a parcela”, como no D38. O trecho marcado só entra com a C3 = limitar.'),
]
frases = ''.join(f'<tr><th scope="row">{H(o)}</th><td data-r="Hoje">{H(a)}</td><td data-r="Revista">{n}</td><td data-r="C3">{H(c)}</td></tr>' for o, a, n, c in FRASES)

PERG = [
    ('C3 (aberta). O que fazer com os honorários do alvará acima do que ainda falta do êxito lançado?',
     'Desenhado com a recomendação, “limitar”: ea-exito-pago, ea-exito-falta, eb-proposta-parte e os trechos marcados das duas frases. Com “só avisar”, esses três estados saem; a proposta continua com os 30%, e a janela de registrar ganha um aviso, sem mudar o valor: “Os honorários passam do que falta do êxito de Helena (R$ 0,00). Combine com ela a devolução.”. O ea-conferir-sobra fica igual nos dois caminhos.'),
    ('C2 (decidida: recusa). Com honorários já entrados, o “Não cobrar” é recusado.',
     'Desenhado no ea-nao-cobrar, que fica no D39 e mostra só a recusa (plano v5, A4.3 e D, C2). Falta a Carol confirmar o texto.'),
]
perg = ''.join(f'<li><b>{H(q)}</b><span>{H(r)}</span></li>' for q, r in PERG)

corpo = ''
for sid, titulo, marca, sub, itens in SECOES:
    faixa = ('<p class="c3-faixa"><span class="c3">Depende da C3</span>Se a Carol escolher “só avisar”, estes estados saem do D39.</p>' if marca else '')
    corpo += f'<section id="{sid}" aria-labelledby="t-{sid}"><h2 id="t-{sid}">{H(titulo)}</h2>{faixa}<p class="sub">{H(sub)}</p>'
    for n, m, leg in itens:
        url = f'financeiro.html?estado={n}'
        figs = ''.join(f'<figure class="{"pc" if t == "computador" else "cel"}"><a href="{H(url)}"><img src="{n}-{t}.webp" alt="{H(ROT[n])}, {t}." loading="lazy" decoding="async"></a>'
                       f'<figcaption>{"Computador · 1440" if t == "computador" else "Celular · 390"} · <a href="{n}-{t}.png">PNG</a></figcaption></figure>' for t in ('computador', 'celular'))
        selo_c3 = '<span class="c3">Depende da C3</span>' if m else ''
        corpo += (f'<article{" class=\"dep\"" if m else ""}>{figs}<div class="leg"><p class="cod">{n}{selo_c3}</p><h3>{H(ROT[n])}</h3><p>{H(leg)}</p>'
                  f'<p class="abrir">Abrir: <a href="{H(url)}">{H(url)}</a></p></div></article>')
    corpo += '</section>'

index = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Êxito lançado depois do alvará · T3jus</title>
<meta name="description" content="Desenho do êxito lançado depois do alvará, que já nasce pago (F3.199, D39), para aprovação da Carol.">
<style>
:root{{--vinho:#692746;--vinho-2:#87335B;--vinho-3:#AC3F6B;--ambar:#DD9760;--ambar-2:#E9AE90;--ambar-3:#F2CDB3;--sal:#F1E6DF;--sal-2:#F2ECE8;--tinta:#2A1A22;--tinta-2:#6E5562;--papel:#fff}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--sal);color:var(--tinta);font:14px/1.57 Poppins,"Segoe UI",system-ui,sans-serif}}
header{{background:var(--vinho);color:#fff;padding:40px 48px 32px}} header p{{margin:6px 0 0;color:var(--ambar-3);max-width:92ch}}
h1,h2,h3{{font-family:Alegreya,Georgia,serif;font-weight:500;margin:0}} h1{{font-size:44px;line-height:1.1}} h2{{font-size:30px;color:var(--vinho)}} h3{{font-size:20px;color:var(--vinho)}}
.sobre{{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--ambar-2);margin:0 0 6px}}
.fio{{display:block;width:56px;height:3px;background:var(--ambar);margin:14px 0 4px;border-radius:2px}}
nav.ir{{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}} nav.ir a{{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:22px;background:var(--vinho-2);color:#fff;text-decoration:none;font-weight:500}}
main{{padding:24px 48px 64px;max-width:1700px}} section{{margin-top:40px}} .sub{{margin:2px 0 16px;color:var(--tinta-2);max-width:110ch}}
article{{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,1fr) minmax(220px,1.1fr);gap:20px;align-items:start;background:var(--papel);border-radius:14px;padding:20px;margin-bottom:16px}}
article.dep{{box-shadow:inset 4px 0 0 var(--ambar)}}
figure{{margin:0}} img{{display:block;width:100%;height:auto;border-radius:8px;border:1px solid var(--sal)}}
figcaption{{font-size:12px;color:var(--tinta-2);margin-top:6px}} figcaption a{{display:inline-flex;align-items:center;min-height:24px}}
.leg p{{margin:6px 0 0}} .cod{{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:12px;letter-spacing:.1em;color:var(--tinta-2);font-family:ui-monospace,monospace}} .abrir{{font-size:12px;overflow-wrap:anywhere}} a{{color:var(--vinho)}} .abrir a{{font-weight:500}}
.c3{{display:inline-flex;align-items:center;gap:6px;padding:2px 10px;border-radius:999px;background:var(--ambar-3);color:var(--tinta);font:500 12px/1.6 Poppins,"Segoe UI",system-ui,sans-serif;letter-spacing:0}}
.c3::before{{content:"";width:8px;height:8px;border-radius:50%;background:var(--vinho)}}
.c3-faixa{{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:10px 0 0;padding:10px 14px;border-radius:10px;background:var(--papel);box-shadow:inset 4px 0 0 var(--ambar);max-width:110ch}}
.perg{{list-style:none;margin:0;padding:0;display:grid;gap:10px}}
.perg li{{display:grid;gap:4px;background:var(--papel);border-radius:14px;padding:16px 20px}} .perg b{{font-weight:500}} .perg span{{color:var(--tinta-2)}}
.tab-frases{{width:100%;border-collapse:collapse;background:var(--papel);border-radius:14px;overflow:hidden}}
.tab-frases th,.tab-frases td{{text-align:left;vertical-align:top;padding:12px 14px;border-top:1px solid var(--sal);font-size:13px}}
.tab-frases thead th{{background:var(--sal-2);font-weight:500;border-top:0}} .tab-frases tbody th{{font-weight:500;width:18%}}
mark{{background:var(--ambar-3);color:var(--tinta);padding:0 2px;border-radius:3px}}
a:focus-visible{{outline:3px solid var(--vinho-3);outline-offset:2px;border-radius:6px}} header a:focus-visible{{outline-color:var(--ambar-3)}}
@media (max-width:900px){{header,main{{padding-left:16px;padding-right:16px}} h1{{font-size:34px}} article{{grid-template-columns:1fr}} .cel{{max-width:260px}}
 .tab-frases,.tab-frases tbody,.tab-frases tr,.tab-frases th,.tab-frases td{{display:block;width:100%!important}} .tab-frases thead{{display:none}}
 .tab-frases td::before{{content:attr(data-r);display:block;font-weight:500;color:var(--tinta-2)}}}}
</style></head><body>
<header><p class="sobre">T3jus · Portal do advogado · para aprovação da Carol</p><h1>O êxito lançado depois do alvará já nasce pago</h1><span class="fio" aria-hidden="true"></span>
<p>F3.199 (CH-07, FI-05), desenho D39, pelo plano v5 (Parte A). Problema: com o alvará registrado antes da conferência do êxito, ou antes do caso encerrado, a parcela lançada depois ficava em A receber e o cliente era cobrado duas vezes. Agora ela nasce paga pelos honorários que entraram na divisão. C2 decidida (o “Não cobrar” é recusado). C3 aberta: desenhado com “limitar”, e o que depende dela está marcado com <span class="c3">Depende da C3</span>. Cada estado tem computador (1440) e celular (390). Clique numa imagem para abrir o HTML naquele estado. Textos exatos, acessibilidade e decisões em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para"><a href="#conferir">Conferir o êxito</a><a href="#repasses">Repasses</a><a href="#c3">Depende da C3</a><a href="#frases">Frases revistas</a><a href="#perguntas">Perguntas</a></nav></header>
<main>{corpo}
<section id="frases" aria-labelledby="t-fr"><h2 id="t-fr">As duas frases da janela de conferir, revistas</h2><p class="sub">Só valiam quando o alvará vinha depois da conferência. O trecho em destaque <mark>assim</mark> depende da C3.</p>
<table class="tab-frases"><caption class="sr">Frases de hoje e frases revistas</caption><thead><tr><th scope="col">Onde</th><th scope="col">Hoje</th><th scope="col">Revista</th><th scope="col">C3</th></tr></thead><tbody>{frases}</tbody></table></section>
<section id="perguntas" aria-labelledby="t-perg"><h2 id="t-perg">Decisões e dúvidas</h2><ul class="perg">{perg}</ul></section>
</main></body></html>
'''
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(index)
print('ok', len(casos), 'estados')
