# Portal · fechamento do caso sem levantamento (F3.132: EX-16, EX-17, FI-08).
# Base técnica: o _fonte de portal-jornada-fechamento. O jornada.py é lido até a parte "página", sem mudança
# (dali vêm EST, add, janela, aviso, toast, ficha_x, J, as barras e o CSS das telas aprovadas), e o HTML aprovado
# de portal-exito-conferir é lido só para ler (CSS ex- e a janela "Registrar recebimento" com reembolso).
# Peças novas com prefixo fs-. Uso: python3 fechamento.py <pasta-saida>
import os, sys, re, json

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
_SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
_corte = '# ====================================================================================== página'
_src = open(os.path.join(AQUI, 'jornada.py'), encoding='utf-8').read()
exec(compile(_src[:_src.index(_corte)], 'jornada.py', 'exec'), globals())
SAIDA = _SAIDA

# ---------------------------------------------------------------- do êxito aprovado (só leitura)
_EXH = _ler('portal-exito-conferir/financeiro.html')
_i = _EXH.index('/* ==========================================================================\n   Portal · Financeiro › Êxito para conferir')
CSS_EX = _EXH[_i:_EXH.index('</style>', _i)]
TP_EX = _tpls(_EXH)
_RG = TP_EX['registrar-reembolso']
_RG = _RG[_RG.index('<dialog'):_RG.index('</dialog>') + 9].replace('R$ ', 'R$ ')

# ====================================================================================== peças comuns
EST = []
T = ''
NB = ' '


def R(v):
    s = f'{v:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
    return f'R$\u00a0{s}'


def selo(tipo, txt, icone=None):
    return f'<span class="selo selo-{tipo}">{ico(icone) if icone else ""}{txt}</span>'


def folha_fi(id_, titulo, corpo, sub='', acoes='', icone=''):
    """A folha do Financeiro aprovado (financeiro.py: folha)."""
    i = ico(icone) if icone else ''
    s = f'<p class="sub">{sub}</p>' if sub else ''
    a = f'<div class="acoes">{acoes}</div>' if acoes else ''
    return f'<section class="folha" aria-labelledby="{id_}"><div class="folha-cab"><div><h2 id="{id_}">{i}{titulo}</h2>{s}</div>{a}</div>{corpo}</section>'


def quatro(a, b, c, d, urg=False):
    return (f'<dl class="fi-quatro"><div><dt>Contratado</dt><dd class="num">{a}</dd></div><div><dt>Recebido</dt><dd class="num">{b}</dd></div>'
            f'<div><dt>Em atraso</dt><dd class="num{" urg" if urg else ""}">{c}</dd></div><div><dt>A vencer</dt><dd class="num">{d}</dd></div></dl>')


def ficha_ct(cliente, sobre, meta, dir_, parcelas, tot, lado, sub_parc, fecha='', principal='', vazio=''):
    """A ficha do contrato aprovada (portal-exito-conferir/_fonte/exito.py: ficha), com a folha larga logo depois do âmbar."""
    cab = (f'<div class="ficha-cab"><div class="esq campo-vinho">{ico("coluna", "ico estatua")}'
           f'<a class="voltar" href="#">{ico("esq", "ico ico-s")}A receber</a>'
           f'<div class="ident"><div><p class="sobretitulo">{sobre}</p><h1>{cliente}</h1>'
           f'<p class="meta">{meta}</p></div></div></div>{dir_}</div>')
    rows, car = '', ''
    for p, ref, venc, forma, sit, sit_cel, v, docs, cls in parcelas:
        rows += (f'<tr{cls}><td><div class="fi-dt"><b>{p}</b><small>{ref}</small></div></td><td class="num">{venc}</td><td>{forma}</td><td>{sit}</td>'
                 f'<td class="fi-v num">{R(v)}</td><td>{docs}</td></tr>')
        nome = p if (p.startswith('Êxito') or p.startswith('À vista')) else 'Parcela ' + p
        car += (f'<li class="cartao"><div class="c-topo"><div><strong class="c-nome" style="font-size:18px">{nome}</strong><small>{ref}</small></div>'
                f'<span class="fi-cartao-v num" style="margin-left:auto">{R(v)}</span></div>'
                f'<dl class="c-dados"><dt>Vence</dt><dd class="num">{venc}</dd><dt>Forma</dt><dd>{forma}</dd></dl><div class="c-selos">{sit_cel}</div>'
                + (f'<div class="c-acoes">{docs}</div>' if 'fi-docs' in docs or 'btn' in docs else '') + '</li>')
    if parcelas:
        tab = (f'<table class="so-pc fi-tab"><caption class="sr">Parcelas do contrato</caption><colgroup><col style="width:12%"><col style="width:11%"><col style="width:8%"><col style="width:30%"><col style="width:15%"><col style="width:24%"></colgroup>'
               f'<thead><tr><th scope="col">Parcela</th><th scope="col">Vence</th><th scope="col">Forma</th><th scope="col">Situação</th><th scope="col" style="text-align:right">Valor</th><th scope="col">Documentos</th></tr></thead><tbody>{rows}</tbody></table>'
               f'<ul class="cartoes so-cel" aria-label="Parcelas do contrato">{car}</ul>')
    else:
        tab = vazio
    parc = folha_fi('t-parc', 'Parcelas', tot + tab, sub=sub_parc, acoes=f'<a class="btn btn-sec" href="#">{ico("pena")}Ver o contrato</a>')
    return (f'<div class="fi">{cab}{fecha}<div class="fi-grade"><div class="fi-col">{parc}{principal}</div>'
            f'<aside class="fi-col" aria-label="Origem e fechamento">{lado}</aside></div></div>')


def meta_ct(situacao, txt, resp):
    s = (f'<span class="selo selo-ativo" style="background:var(--ambar-3);color:var(--vinho)">Vigente</span>' if situacao == 'vigente'
         else f'<span class="selo selo-neutro">{ico("pasta")}{situacao}</span>')
    return f'{s}<span>{txt}</span><span class="sep" aria-hidden="true"></span><span>responsável {resp}</span>'


def dir_fi(sobre, grande, selo_, oque, botao=''):
    return (f'<section class="dir campo-ambar" aria-labelledby="t-dir"><p class="sobretitulo" id="t-dir">{sobre}</p>'
            f'<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><p class="grande num">{grande}</p>{selo_}</div>'
            f'<p class="fi-oque">{oque}</p>{botao}</section>')


def eventos(dias, link=''):
    h = ''
    for dia, evs in dias:
        li = ''.join(f'<li><time>{t}</time><span class="pto{" forte" if f else ""}" aria-hidden="true"></span><div><p>{p}</p><small>{s}</small></div></li>' for t, p, s, f in evs)
        h += f'<div class="eventos-dia" style="padding-top:0"><h3>{dia}</h3><ol class="eventos">{li}</ol></div>'
    if link:
        h += f'<p class="ex-pe" style="border-top:0;padding-top:0">{link}</p>'
    return h


def ver(txt, href):
    return f'<a class="ver" href="{href}">{txt}{ico("dir", "ico ico-s")}</a>'


# ---------------------------------------------------------------- a folha "Fechamento do caso" (fs-)
def li_ok(txt, sub='', icone='check', extra=''):
    s = f'<small>{sub}</small>' if sub else ''
    return f'<li>{ico(icone)}<span>{txt}{s}{extra}</span></li>'


def li_falta(txt, sub='', extra=''):
    s = f'<small>{sub}</small>' if sub else ''
    return f'<li class="falta">{ico("alerta")}<span>{txt}<span class="sr"> (pendente)</span>{s}{extra}</span></li>'


def li_espera(txt, sub='', extra=''):
    s = f'<small>{sub}</small>' if sub else ''
    return f'<li class="fs-espera">{ico("relogio")}<span>{txt}<span class="sr"> (a vencer)</span>{s}{extra}</span></li>'


def grupo(titulo, itens):
    return f'<div class="fs-grupo"><h3>{titulo}</h3><ul class="fi-check">{"".join(itens)}</ul></div>'


def ir(txt, href):
    return f'<a class="fs-ir" href="{href}">{txt}{ico("dir", "ico ico-s")}</a>'


def nums(recebido, n_ctr, reembolsado, falta, falta_txt, tipo='falta', reemb_txt='custas'):
    """Os três números, cada um dito também em texto."""
    cls = {'falta': ' class="falta"', 'espera': ' class="fs-aguarda"', 'nada': ''}[tipo]
    rot_ctr = f'{n_ctr} contrato' + ('s' if n_ctr > 1 else '')
    return (f'<dl class="fs-nums">'
            f'<div><dt>Recebido no caso · {rot_ctr}</dt><dd class="num">{R(recebido)}</dd></div>'
            f'<div><dt>Reembolsado</dt><dd class="num">{R(reembolsado)}<small>{reemb_txt}</small></dd></div>'
            f'<div{cls}><dt>Falta</dt><dd class="num">{"nada" if tipo == "nada" else R(falta)}<small>{falta_txt}</small></dd></div></dl>')


def folha_larga(sub, grupos, rodape, numeros, botao=''):
    b = f'<button class="btn btn-sec" type="button" data-janela="janela-fechar">{ico("cadeado")}Encerrar o caso no financeiro</button>' if botao else ''
    return (f'<section class="folha fs-folha" aria-labelledby="t-fecha"><div class="folha-cab"><div>'
            f'<h2 id="t-fecha" tabindex="-1">{ico("cadeado")}Fechamento do caso</h2><p class="sub">{sub}</p></div></div>'
            f'<div class="fs-grade"><div class="fs-quadro">{"".join(grupos)}{rodape}</div>'
            f'<div class="fs-lado">{numeros}{b}</div></div></section>')


def juridico_linha(txt='até este fechamento'):
    return (f'<p class="fs-jur">{ico("balanca")}<span>No Jurídico, o caso fica <b>Encerrado · acerto pendente</b> {txt}.</span></p>')


def pronto_linha(txt):
    return f'<p class="fs-pronto">{ico("relogio")}<span>{txt}</span></p>'


# ====================================================================================== caso A: Carvalho x Construtora Lume
CASO_L = 'Carvalho x Construtora Lume'
PROC_L = '1043218-55.2026.8.26.0100'
C_N, C_C = 'C-2026-012', 'C-2026-013'
NOEMI = dict(nome='Noemi Bastos Carvalho', tp='PF', desde='28/05/2026')
J['INI'].setdefault('Felipe Matos', 'FM')
SUB_L = f'{CASO_L} · encerrado com perda em 06/11, por Felipe Matos'
CUSTAS = 'Custas iniciais e diligência do oficial'

# ---------------------------------------------------------------- 1 e 2. A ficha de Noemi: o âmbar "Fechar o caso"
def lista_passos(passos):
    li = ''
    for i, (nome, st, det) in enumerate(passos):
        d = f'<small>{det}</small>' if det else ''
        if st == 'ok':
            li += f'<li class="jf-ok"><span class="jf-m">{ico("check")}</span><span>{nome}<span class="sr">: feito</span>{d}</span></li>'
        elif st == 'ag':
            li += f'<li class="jf-ag"><span class="jf-m">{i + 1}</span><span><b>{nome}</b><span class="sr">: é o próximo passo</span>{d}</span></li>'
        else:
            li += f'<li><span class="jf-m">{i + 1}</span><span>{nome}<span class="sr">: depois</span>{d}</span></li>'
    return f'<ol class="jf-fecha" aria-label="Fechamento do caso, em {len(passos)} passos">{li}</ol>'


def dir_fecha2(oque, passos, acoes, quem):
    return (f'<section class="dir campo-ambar fl-passo" aria-labelledby="t-passo"><p class="sobretitulo" id="t-passo">Próximo passo · fechamento</p>'
            f'<p class="grande" style="font-size:30px">Fechar o caso</p><p class="cl-oque">{oque}</p>{lista_passos(passos)}'
            f'<div class="fl-acoes">{acoes}</div><p class="jf-quem">{ico("pessoas")}<span>{quem}</span></p></section>')


D_N1 = dir_fecha2(f'<b>{CASO_L} terminou com perda em 06/11.</b><br>Falta o acerto no financeiro e encerrar o contrato.',
                  [('Encerrar no financeiro', 'ag', 'Faltam R$ 1.412,30: parcela 6/6 e custas'), ('Encerrar o contrato', '', f'{C_N}, junto com o financeiro')],
                  f'<a class="btn btn-pri" href="?estado=contrato-pendente#t-fecha">{ico("cadeado")}Ver o acerto</a>',
                  'Quem faz: a área Financeiro (Marina, Diego e Bianca). O contrato pode ser encerrado junto.')
D_N1L = dir_fecha2(f'<b>{CASO_L} terminou com perda em 06/11.</b><br>O acerto do caso está com o Financeiro.',
                   [('Encerrar no financeiro', 'ag', 'Com o Financeiro'), ('Encerrar o contrato', '', 'Junto com o financeiro')],
                   f'<a class="btn btn-sec" href="?estado=caso-acerto-larissa">{ico("balanca")}Ver o caso</a>',
                   'Quem faz: a área Financeiro, que não está liberada para você. Marina, Diego e Bianca.')
NN = dict(atendimentos=4, propostas=1, contratos=1, casos=1)


def aba_casos_noemi():
    sub = 'Os casos e processos em que Noemi é cliente. Um processo pode ter mais de um cliente.'
    sel = f'<span class="selo selo-atencao">{ico("relogio")}Acerto pendente</span>'
    linhas = [('fl-vivo', [
        f'<div class="fl-num"><a href="?estado=caso-acerto">{CASO_L}</a><small class="num">{PROC_L} · Cível</small></div>',
        f'<div class="fl-et"><b>Encerrado · acerto pendente</b>{J["mini"](8)}<small>8 de 8 · perda em 06/11</small></div>',
        '<b>Autora</b><small>Com Cláudio Carvalho</small>', J['resp']('Felipe Matos'), sel])]
    cards = cartao(CASO_L, '?estado=caso-acerto', PROC_L, [('Etapa', 'Encerrado · acerto pendente · perda em 06/11'), ('Papel', 'Autora, com Cláudio Carvalho'), ('Responsável', 'Felipe Matos')], sel)
    pe = '<div class="fl-pe"><span><b>1 caso</b>, encerrado. O acerto do dinheiro fica no Financeiro, na ficha do contrato.</span></div>'
    return folha_aba('t-aba', 'Casos', sub, tabela('Casos de Noemi', ['Caso', 'Etapa', 'Noemi no caso', 'Responsável', 'Acerto'], [27, 22, 17, 18, 16], linhas, cards, pe))


FTN = dict(atual='clientes', trilha='Clientes|Noemi Bastos Carvalho', titulo='Noemi Bastos Carvalho')
add('fecha-financeiro', ficha_x(NOEMI, D_N1, 'casos', aba_casos_noemi(), NN), 'Ficha de Noemi: “Encerrar no financeiro” leva ao contrato', aba='casos', **FTN)
add('fecha-larissa', ficha_x(NOEMI, D_N1L, 'casos', aba_casos_noemi(), NN, areas=('juridico',)),
    'Larissa (sem Financeiro): quem faz, sem valores', quem='juridico', aba='casos', **FTN)


# ---------------------------------------------------------------- 3 e 4. A ficha do caso no Jurídico
def cab_caso_l(fin=True):
    NE, NOME_E = J['NE'], J['NOME_E']
    segs = ''.join(f'<li class="{"agora" if i == NE - 1 else ""}"><span class="b" aria-hidden="true"></span>'
                   f'<span class="sr">{i + 1}. {NOME_E[i]}{": atual" if i == NE - 1 else ": feita"}</span></li>' for i in range(NE))
    if fin:
        t = 'Encerrado com perda em 06/11, por Felipe. <b>Falta o acerto no Financeiro</b>: receber a parcela 6/6 de Noemi e as custas, e encerrar.'
        b = f'<a class="btn btn-pri" href="?estado=contrato-pendente#t-fecha">{ico("cadeado")}Ver o acerto</a>'
    else:
        t = 'Encerrado com perda em 06/11, por Felipe. <b>O acerto está com o Financeiro.</b>'
        b = ''
    dir_ = (f'<section class="dir campo-ambar" aria-labelledby="t-etapa"><p class="sobretitulo" id="t-etapa">Etapa do caso</p>'
            f'<p class="grande">{NE} de {NE}<small>{NOME_E[NE - 1]}</small></p><ol class="etapas ju-et8">{segs}</ol>'
            f'<p class="ju-agora">{t}</p>{b}</section>')
    return (f'<div class="ficha-cab"><div class="esq campo-vinho">{ico("balanca", "ico estatua")}'
            f'<a class="voltar" href="#">{ico("esq", "ico ico-s")}Casos e processos</a>'
            f'<div class="ident"><div><p class="sobretitulo">Caso · cível</p><h1>{CASO_L}</h1>'
            f'<p class="meta"><span class="selo selo-atencao">{ico("relogio")}Encerrado · acerto pendente</span><span class="num">{PROC_L}</span>'
            f'<span class="sep" aria-hidden="true"></span><span>3ª Vara Cível · e-SAJ</span></p></div></div></div>{dir_}</div>')


def ficha_caso_l(fin=True):
    f = J['folha']
    d = [('Área', 'Cível · vício construtivo'), ('Parte contrária', 'Construtora Lume Ltda.'), ('Responsável', 'Felipe Matos'),
         ('Resultado', 'Perda · sentença de 04/11/2026, sem recurso'), ('Tribunal', 'TJSP · 3ª Vara Cível de São Paulo'), ('Aberto em', '02/06/2026, na assinatura')]
    dl = ''.join(f'<div><dt>{k}</dt><dd>{v}</dd></div>' for k, v in d)
    dados = f('t-dados', 'Dados do processo', 'O que identifica o caso.', f'<dl class="dados-ficha ju-dl">{dl}</dl>')
    if fin:
        hn = f'<div class="ju-hon"><b>6 × R$ 1.000,00 + 20% do êxito</b><small>Contrato {C_N}</small></div>'
        hc = f'<div class="ju-hon"><b>R$ 1.500,00 à vista</b><small>Contrato {C_C}</small></div>'
    else:
        hn = hc = '<div class="ju-hon"><small>Honorários na área Contratos</small></div>'
    cli = (f'<ul class="lista ju-clientes"><li><span class="av-p forte" aria-hidden="true">NB</span><div><a class="n" href="?estado=fecha-financeiro">Noemi Bastos Carvalho</a><small>Autora · proprietária</small></div>'
           f'<a class="tel" href="#">{ico("whats")}<span class="num">(11) 98422-3170</span></a>{hn}</li>'
           f'<li><span class="av-p forte" aria-hidden="true">CC</span><div><a class="n" href="#">Cláudio Carvalho</a><small>Autor · proprietário</small></div>'
           f'<a class="tel" href="#">{ico("whats")}<span class="num">(11) 98422-3171</span></a>{hc}</li></ul>')
    clientes = f('t-cli', 'Clientes do caso', '2 clientes', cli)
    if fin:
        ac = (f'<li>{ico("check")}<span>Nenhum valor de terceiros entrou<small>Sem levantamento, sem repasse e sem prestação de contas</small></span></li>'
              f'<li>{ico("check")}<span>Sem êxito a cobrar<small>O caso terminou com perda em 06/11</small></span></li>'
              f'<li>{ico("check")}<span>Cláudio: tudo recebido<small>{C_C} · R$ 1.500,00 em 02/06</small></span></li>'
              f'<li class="falta">{ico("alerta")}<span><b>Noemi:</b> falta a parcela 6/6, R$ 1.000,00<small>Venceu em 10/11 · 8 dias de atraso</small></span></li>'
              f'<li class="falta">{ico("alerta")}<span><b>Custas adiantadas:</b> falta o reembolso de R$ 412,30<small>Vai junto com a parcela 6/6 de Noemi</small></span></li>'
              f'<li>{ico("relogio")}<span>Depois: encerrar no financeiro e o contrato {C_N}<small>Os dois de uma vez, na mesma janela</small></span></li>')
        sub = 'O que falta para o caso sair de “acerto pendente”'
    else:
        ac = (f'<li>{ico("check")}<span>Nenhum valor de terceiros entrou</span></li>'
              f'<li>{ico("check")}<span>Sem êxito a cobrar</span></li>'
              f'<li>{ico("relogio")}<span>O acerto está com o Financeiro<small>Os valores ficam no Financeiro</small></span></li>'
              f'<li>{ico("relogio")}<span>Depois: encerrar no financeiro</span></li>')
        sub = 'Quem cuida: Marina, Diego e Bianca, da área Financeiro'
    acerto = f('t-ac', 'Acerto no Financeiro', sub, f'<ul class="jf-acerto">{ac}</ul>', peq=True)
    ctr = (f'<ul class="ju-ctr"><li>{ico("pena")}<span><b>{C_N} · Noemi Bastos Carvalho</b><small>Assinado em 28/05/2026 · ativo até o acerto</small></span></li>'
           f'<li>{ico("pasta")}<span><b>{C_C} · Cláudio Carvalho</b><small>Encerrado em 12/11, por Felipe, em Contratos</small></span></li></ul>')
    contr = f('t-ctr', 'Contratos ligados', '', ctr, peq=True)
    return (f'<div class="ju">{cab_caso_l(fin)}'
            f'<div class="ju-grade ju-ficha-grade"><div class="ju-col">{dados}{clientes}</div>'
            f'<aside class="ju-col" aria-label="Contexto do caso">{acerto}{contr}</aside></div></div>')


CJL = dict(area='juridico', secao='Casos e processos', atual='juridico', trilha=f'Jurídico|Casos e processos|{CASO_L}', titulo=CASO_L)
add('caso-acerto', ficha_caso_l(), 'Ficha do caso: “Ver o acerto” leva ao contrato', **CJL)
add('caso-acerto-larissa', ficha_caso_l(fin=False), 'Larissa (sem Financeiro): o acerto sem valores', quem='juridico', **CJL)


# ---------------------------------------------------------------- 5 a 11. A ficha do contrato de Noemi (C-2026-012)
MESES_N = ['junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro']
DOCS_PG = lambda n: f'<div class="fi-docs"><a href="#">{ico("doc")}Recibo {n}</a><a href="#">{ico("link")}Comprovante</a></div>'
BTN_REG = '<button class="btn btn-sec btn-compacto" type="button" data-janela="janela-registrar" aria-label="Registrar recebimento da parcela 6/6">Registrar</button>'


def parcelas_noemi(paga6=False):
    ps = []
    for i, m in enumerate(MESES_N):
        venc = f'10/{6 + i:02d}'
        if i < 5:
            pg = f'Paga em {venc}'
            ps.append((f'{i + 1}/6', m, venc, 'Pix', f'<div class="fi-sit">{selo("ok", pg, "check")}</div>', selo('ok', pg, 'check'), 1000, DOCS_PG(f'{102 + i * 9:04d}'), ' class="fi-pago"'))
        elif paga6:
            s = (f'<div class="fi-sit">{selo("ok", "Paga em 17/11", "check")}<p class="fi-motivo">7 dias de atraso. Veio junto o reembolso das custas, {R(412.30)}.</p></div>')
            ps.append(('6/6', m, venc, 'Pix', s, selo('ok', 'Paga em 17/11', 'check'), 1000, DOCS_PG('0196'), ' class="fi-pago"'))
        else:
            s = (f'<div class="fi-sit">{selo("urgente", "Vencida há 8 dias", "alerta")}<p class="fi-motivo"><b>Leva junto:</b> o reembolso das custas, {R(412.30)}.</p></div>')
            ps.append(('6/6', m, venc, 'Pix', s, selo('urgente', 'Vencida há 8 dias', 'alerta'), 1000, BTN_REG, ' class="fi-atraso"'))
    return ps


def adiantado_noemi(pago=False):
    s = selo('ok', 'Reembolsado 17/11', 'check') if pago else selo('atencao', 'A reembolsar')
    prox = ('Reembolsado junto com a parcela 6/6, em 17/11' if pago else 'Reembolso combinado: <b>junto com a parcela 6/6</b>')
    return folha_fi('t-reemb', 'Adiantado pelo escritório neste caso', (
        f'<ul class="fi-linhas"><li class="fi-linha" style="grid-template-columns:minmax(0,1fr) auto"><div class="fi-quem"><strong>{CUSTAS}</strong>'
        f'<small>Pagas pelo escritório em 06/2026 · guias anexadas · categoria "Custas adiantadas"</small>'
        f'<p class="fi-prox">{ico("relogio")}{prox}</p></div>'
        f'<div class="fi-lado"><span class="fi-v num">{R(412.30)}</span>{s}</div></li></ul>'),
        sub='Vira valor a reembolsar pelo cliente, ligado a este caso.', icone='reenviar')


def origem_noemi(encerrado=False, pago=False):
    dias = []
    if encerrado:
        dias.append(('18/11/2026', [('16h20', '<b>Marina Ribeiro</b> encerrou o caso no financeiro<span class="selo selo-ativo">Novo</span>',
                                     f'Tudo recebido · o contrato {C_N} foi encerrado junto, com o motivo', True)]))
    if pago:
        dias.append(('17/11/2026', [('11h05', '<b>Diego Almeida</b> registrou o recebimento', f'Parcela 6/6 e reembolso das custas · {R(1412.30)} por Pix', False)]))
    dias.append(('12/11/2026', [('09h30', f'<b>Felipe Matos</b> encerrou o contrato {C_C}, de Cláudio', 'Em Contratos · tudo recebido, nada a cobrar', False)]))
    dias.append(('06/11/2026', [('17h10', f'<b>Felipe Matos</b> encerrou o caso com perda', f'{CASO_L} · sentença de improcedência em 04/11, sem recurso · sem êxito a cobrar', False)]))
    return folha_fi('t-orig', 'De onde veio', eventos(dias, ver('Ver o caso no Jurídico', '?estado=caso-acerto')), icone='historico')


def cobranca_noemi():
    return folha_fi('t-cob', 'Cobrança', (
        f'<div class="fi-cob"><dl><div><dt>Motivo do atraso</dt><dd>Disse que vai pagar depois de falar com o marido<small>anotado por Diego Almeida em 14/11</small></dd></div>'
        f'<div><dt>Próxima ação</dt><dd>Sexta, 20/11: mandar o Pix de novo<small>responsável: Diego Almeida</small></dd></div></dl>'
        f'<button class="btn btn-sec" type="button">{ico("lapis")}Anotar cobrança</button></div>'
        '<div class="eventos-dia" style="padding-top:0"><h3>Histórico de cobrança</h3><ol class="eventos">'
        '<li><time>14/11</time><span class="pto" aria-hidden="true"></span><div><p><b>Diego Almeida</b> falou com Noemi, às 10h20</p><small>Pelo WhatsApp. Motivo anotado.</small></div></li>'
        '<li><time>11/11</time><span class="pto" aria-hidden="true"></span><div><p>Lembrete de atraso pelo WhatsApp, às 9h</p><small>Automático, com a parcela e o reembolso em linhas separadas.</small></div></li></ol></div>'),
        icone='sino')


def quadro_noemi(pago=False):
    res = grupo('Resultado e êxito', [li_ok('Sem êxito a cobrar: o caso terminou com perda em 06/11', 'Noemi e Cláudio · 20% do êxito sobre base zero')])
    if pago:
        deste = grupo(f'Deste contrato · {C_N}, Noemi', [li_ok('6 de 6 parcelas recebidas · R$ 6.000,00', 'a última em 17/11, com 7 dias de atraso')])
        adi = grupo('Adiantado pelo escritório no caso', [li_ok(f'{CUSTAS}: reembolsadas · {R(412.30)}', 'junto com a parcela 6/6, em 17/11')])
    else:
        deste = grupo(f'Deste contrato · {C_N}, Noemi', [li_ok('5 de 6 parcelas recebidas · R$ 5.000,00'),
                                                         li_falta(f'<b>Parcela 6/6:</b> falta {R(1000)}', 'venceu em 10/11 · 8 dias de atraso')])
        adi = grupo('Adiantado pelo escritório no caso', [li_falta(f'<b>{CUSTAS}:</b> falta o reembolso de {R(412.30)}', 'pagas em 06/2026 · vai junto com a parcela 6/6')])
    outros = grupo('Dos outros contratos do caso', [li_ok(f'{C_C} · Cláudio: tudo recebido', f'{R(1500)} à vista em 02/06 · contrato já encerrado em 12/11',
                                                          extra=ir('Abrir o contrato de Cláudio', '?estado=contrato-claudio'))])
    ter = grupo('Terceiros', [li_ok('Nenhum valor de terceiros entrou neste caso', 'não há repasse nem prestação de contas')])
    return [res, deste, outros, adi, ter]


def nums_noemi(pago=False):
    if pago:
        return nums(7500, 2, 412.30, 0, 'tudo recebido e reembolsado', 'nada')
    return nums(6500, 2, 0, 1412.30, 'parcela 6/6 e custas', 'falta', reemb_txt=f'de {R(412.30)} adiantados')


META_N = meta_ct('vigente', f'{C_N} · 6 parcelas de {R(1000)} · Pix · dia 10 · + 20% do êxito', 'Felipe Matos')
SOBRE_N = f'Contrato de honorários · {CASO_L}'
TOT_N = quatro(R(6000), R(5000), R(1000), R(0), urg=True)
TOT_N_OK = quatro(R(6000), R(6000), R(0), R(0))
SUB_PARC = 'Cada parcela guarda o mês a que se refere, mesmo quando é paga depois.'

D_PEND = dir_fi('Em atraso', R(1000), selo('urgente', '8 dias', 'alerta'),
                f'<b>Parcela 6/6, de novembro.</b> Venceu em 10/11.<br>+ reembolso das custas, {R(412.30)}. Próxima ação: sexta, 20/11.',
                f'<button class="btn btn-pri" type="button" data-janela="janela-registrar">{ico("moeda")}Registrar recebimento</button>')
D_PRONTO = dir_fi('Fechamento do caso', R(0), selo('ok', 'Nada falta', 'check'),
                  f'<b>Tudo recebido e reembolsado em 17/11.</b><br>O caso {CASO_L} já pode ser encerrado no financeiro.',
                  f'<button class="btn btn-pri" type="button" data-janela="janela-fechar">{ico("cadeado")}Encerrar o caso no financeiro</button>')


def ficha_noemi(fase='pendente'):
    pago = fase != 'pendente'
    if fase == 'encerrado':
        dir_ = dir_fi('Contrato encerrado', R(0), selo('ok', 'Caso encerrado', 'check'),
                      f'<b>Caso encerrado no financeiro hoje, 18/11.</b><br>O contrato {C_N} foi encerrado junto, com o motivo.',
                      f'<a class="btn btn-pri" href="#" data-rota="/clientes/noemi-bastos-carvalho">{ico("pessoas")}Ver a ficha de Noemi</a>')
        meta = meta_ct('Encerrado em 18/11', f'{C_N} · 6 parcelas de {R(1000)} · + 20% do êxito', 'Felipe Matos')
        fecha_lado = folha_fi('t-fecha', 'Fechamento do caso', (
            f'<div class="fi-fecha"><p class="jf-fechado">{ico("check")}<span>Encerrado no financeiro em 18/11/2026, por Marina Ribeiro · {C_N} encerrado junto</span></p>'
            f'{nums_noemi(True)}<ul class="fi-check">{li_ok("Sem êxito a cobrar: perda em 06/11")}{li_ok("Parcelas dos 2 contratos recebidas")}'
            f'{li_ok("Custas reembolsadas")}{li_ok("Nenhum valor de terceiros entrou neste caso")}</ul></div>'), icone='cadeado', sub=CASO_L)
        lado = origem_noemi(encerrado=True, pago=True) + fecha_lado
        return ficha_ct('Noemi Bastos Carvalho', SOBRE_N, meta, dir_, parcelas_noemi(True), TOT_N_OK, lado, SUB_PARC, principal=adiantado_noemi(True))
    if pago:
        fecha = folha_larga(SUB_L, quadro_noemi(True), juridico_linha(), nums_noemi(True))
        return ficha_ct('Noemi Bastos Carvalho', SOBRE_N, META_N, D_PRONTO, parcelas_noemi(True), TOT_N_OK, origem_noemi(pago=True), SUB_PARC,
                        fecha=fecha, principal=adiantado_noemi(True))
    fecha = folha_larga(SUB_L, quadro_noemi(), juridico_linha(), nums_noemi(), botao=True)
    return ficha_ct('Noemi Bastos Carvalho', SOBRE_N, META_N, D_PEND, parcelas_noemi(), TOT_N, origem_noemi() + cobranca_noemi(), SUB_PARC,
                    fecha=fecha, principal=adiantado_noemi())


# ---------------------------------------------------------------- as janelas
def j_registrar_noemi(abrir=False):
    """A janela aprovada "Registrar recebimento" com a faixa "parcela + reembolso", como está: a caixa do reembolso desmarcada."""
    h = troca(_RG, [
        ('<strong>Construtora Vale Alto Ltda. · parcela 2/3</strong><small>Ação de cobrança · vence hoje, 28/11/2026 · cheque pré-datado</small></div><span class="fi-v num">R$ 2.400,00</span>',
         f'<strong>Noemi Bastos Carvalho · parcela 6/6</strong><small>{CASO_L} · venceu em 10/11/2026 · Pix</small></div><span class="fi-v num">{R(1000)}</span>'),
        ('A Construtora deve pagar a parcela e as custas que o escritório adiantou no caso.', 'Noemi deve pagar a parcela e as custas que o escritório adiantou no caso.'),
        ('O que a Construtora deve pagar', 'O que Noemi deve pagar'),
        ('<tr><td>Parcela 2/3 · novembro</td><td>R$ 2.400,00</td></tr>', f'<tr><td>Parcela 6/6 · novembro</td><td>{R(1000)}</td></tr>'),
        ('<tr><td>Reembolso · custas da apelação<small>adiantadas em 21/11 no caso Ação de cobrança · guia anexada</small></td><td>R$ 1.248,36</td></tr>',
         f'<tr><td>Reembolso · custas iniciais e diligência<small>adiantadas em 06/2026 no caso {CASO_L} · guias anexadas</small></td><td>{R(412.30)}</td></tr>'),
        ('<td>Total a pagar</td><td>R$ 3.648,36</td>', f'<td>Total a pagar</td><td>{R(1412.30)}</td>'),
        ('value="2.400,00"', 'value="1.000,00"'), ('Falta receber nesta parcela: R$ 2.400,00.', f'Falta receber nesta parcela: {R(1000)}.'),
        ('value="28/11/2026"', 'value="18/11/2026"'),
        ('Marque se a Construtora pagou as custas da apelação (R$ 1.248,36).', f'Marque se Noemi pagou as custas iniciais e a diligência ({R(412.30)}).'),
        ('<b>parcela de novembro de 2026</b>', '<b>parcela de novembro de 2026</b>'),
        ('<option>Pix</option>', '<option selected>Pix</option>'), ('<option selected>Cheque pré-datado</option>', '<option>Cheque pré-datado</option>'),
        ('Em dia: não há multa nem juros.', '8 dias de atraso: o contrato não prevê multa.'),
        ('deposito-cheque-construtora-28-11.pdf', 'pix-noemi-18-11.pdf'),
        ('Vai para a Construtora, no número do escritório.', 'Vai para Noemi, no número do escritório.')])
    return h if abrir else h.replace(' data-abrir>', '>', 1)


def j_bloqueado(linhas, falta, atalho, abrir=True, desc=None):
    corpo = (aviso('urgencia', 'Ainda falta receber neste caso.', f'O financeiro do caso só encerra com tudo recebido. Faltam {falta}.')
             + f'<ul class="fi-check">{"".join(linhas)}</ul>'
             + f'<p class="fi-ref">{ico("ajuda")}<span>Registre o que falta e o caso fica pronto para encerrar. Se Noemi não vai pagar, ainda não dá para dar baixa na parcela sem receber: '
               'anote a cobrança, e o caso segue “acerto pendente” até a parcela ser paga.</span></p>')
    pe = f'<button class="btn btn-sec" type="button" data-fechar data-foco>Voltar ao contrato</button>{atalho}'
    return janela('janela-fechar', 'Fechamento do caso', 'Ainda não dá para encerrar',
                  desc or f'É o caso {CASO_L}, encerrado com perda em 06/11/2026.', corpo, pe, alerta=True, abrir=abrir)


LINHAS_BLOQ = [li_falta(f'<b>Parcela 6/6 · {R(1000)} · venceu 10/11</b>', f'Noemi · {C_N} · 8 dias de atraso'),
               li_falta(f'<b>Custas · {R(412.30)} · vai junto com a parcela 6/6</b>', 'adiantadas pelo escritório em 06/2026')]
ATALHO_REG = f'<button class="btn btn-pri" type="button" data-janela="janela-registrar" data-fechar>{ico("moeda")}Registrar recebimento da parcela 6/6</button>'


def sec_ctrs(modo='marcar', erro=False):
    ja = (f'<li class="fs-ja">{ico("pasta")}<span><b>{C_C} · Cláudio Carvalho</b><small>Já encerrado em 12/11, por Felipe, em Contratos · fica como está</small></span></li>')
    noemi = f'<li>{ico("pena")}<span><b>{C_N} · Noemi Bastos Carvalho</b><small>{CASO_L} · 6 × {R(1000)} + 20% do êxito · nada em aberto</small></span></li>'
    motivo = f'<p class="jf-motivo">{ico("doc")}<span>Motivo que fica no contrato: “Caso {CASO_L} encerrado no financeiro em 18/11/2026.”</span></p>'
    if modo == 'marcar':
        return (f'<fieldset class="fl-caso"><legend>Contratos ligados ao caso<small>Encerrar para as cobranças novas. Nada é apagado.</small></legend>'
                f'<label class="opcao"><input class="marcar" type="checkbox" name="fc-ctr" checked{"" if erro else " data-foco"}><span>Encerrar também este contrato<small>Só entram os que não têm outro caso em andamento.</small></span></label>'
                f'<ul class="jf-ctrs">{noemi}{ja}</ul>{motivo}</fieldset>')
    return (f'<div class="fl-caso" role="group" aria-labelledby="fs-ctr-t"><p class="fs-leg" id="fs-ctr-t">Contratos ligados ao caso</p>'
            f'<ul class="jf-ctrs">{noemi.replace("nada em aberto", "ativo · nada em aberto")}{ja}</ul>'
            f'<p class="fs-quem-ctr">{ico("pessoas")}<span>O {C_N} fica aberto. Quem encerra é a área Contratos (Marina e Felipe), no passo “Encerrar o contrato” da ficha de Noemi.</span></p></div>')


def j_fechar_l(modo='marcar', erro=False, abrir=True):
    falha = (aviso('urgencia', 'Nada foi encerrado.',
                   f'O contrato {C_N} mudou agora há pouco (Felipe registrou uma condição nova). O caso e o contrato continuam abertos. '
                   'Feche esta janela, confira o contrato e tente de novo. Se continuar, mande o código PTL-4C82-1190 ao suporte.') if erro else '')
    corpo = (falha
             + f'<div class="fl-ja"><dl><dt>Caso</dt><dd>{CASO_L}</dd><dt>Recebido no caso</dt><dd>{R(7500)} · 2 contratos</dd>'
               f'<dt>Reembolsado</dt><dd>{R(412.30)} · custas</dd><dt>Falta</dt><dd>nada</dd></dl></div>'
             + sec_ctrs(modo, erro))
    if modo == 'marcar':
        depois = (f'O caso sai de “acerto pendente” no Jurídico, o contrato {C_N} fica encerrado e a ficha de Noemi passa a dizer <b>Cliente atendido</b>. '
                  'Os dois andam juntos: ou ficam os dois, ou nenhum.')
        bot = 'Encerrar o caso e o contrato'
    else:
        depois = f'O caso sai de “acerto pendente” no Jurídico. O contrato {C_N} continua ativo, sem nada a cobrar, até a área Contratos encerrá-lo.'
        bot = 'Encerrar o caso'
    corpo += f'<p class="fl-depois">{ico("seta")}<span>{depois}</span></p>'
    foco = ' data-foco' if modo != 'marcar' and not erro else ''
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit"{foco}>{ico("cadeado")}{bot}</button>'
    return janela('janela-fechar', 'Fechamento do caso', 'Encerrar o caso no financeiro',
                  f'Noemi Bastos Carvalho e Cláudio Carvalho · {CASO_L}. Tudo foi recebido. O encerramento fica no histórico do caso, com o nome de quem encerrou e a hora.',
                  corpo, pe, abrir=abrir or erro)


FIN = dict(area='financeiro', secao='A receber', atual='financeiro', trilha='Financeiro|A receber|Noemi Bastos Carvalho', titulo='Noemi Bastos Carvalho')
add('contrato-pendente', ficha_noemi() + j_bloqueado(LINHAS_BLOQ, R(1412.30), ATALHO_REG, abrir=False) + j_registrar_noemi(),
    'Contrato de Noemi: a folha “Fechamento do caso” com o que falta', **FIN)
add('fechar-bloqueado', ficha_noemi() + j_bloqueado(LINHAS_BLOQ, R(1412.30), ATALHO_REG) + j_registrar_noemi(),
    '“Ainda não dá para encerrar”, com o atalho da parcela', **FIN)
add('contrato-pronto', ficha_noemi('pronto') + j_fechar_l(abrir=False), 'Tudo recebido: “Encerrar” sobe para o âmbar', **FIN)
add('encerrar', ficha_noemi('pronto') + j_fechar_l(), 'Encerrar o caso e o contrato de Noemi', **FIN)
add('encerrar-sem-contratos', ficha_noemi('pronto') + j_fechar_l('ver'), 'Diego (sem Contratos): encerra só o caso', quem='diego', **FIN)
add('encerrar-erro', ficha_noemi('pronto') + j_fechar_l(erro=True), 'Encerrar: nada foi encerrado', **FIN)
add('encerrado', ficha_noemi('encerrado') + toast('Caso e contrato encerrados.',
    f'{CASO_L}: tudo recebido. O contrato {C_N} foi encerrado junto. Ficou no histórico do caso e do contrato.'),
    'Encerrado: a folha volta para a lateral', **FIN)


# ---------------------------------------------------------------- 12. O contrato de Cláudio (EX-01): o caso inteiro
def ficha_claudio():
    dir_ = dir_fi('Nada a receber', R(0), selo('ok', 'Tudo recebido', 'check'),
                  f'<b>{R(1500)} à vista, em 02/06.</b><br>Contrato encerrado em 12/11 por Felipe. O que falta no caso está no contrato de Noemi.')
    meta = meta_ct('Encerrado em 12/11', f'{C_C} · {R(1500)} à vista · Pix', 'Felipe Matos')
    pg = selo('ok', 'Paga em 02/06', 'check')
    parcelas = [('À vista', 'junho', '02/06', 'Pix', f'<div class="fi-sit">{pg}</div>', pg, 1500, DOCS_PG('0094'), ' class="fi-pago"')]
    tot = quatro(R(1500), R(1500), R(0), R(0))
    quadro = [
        grupo('Resultado e êxito', [li_ok('Sem êxito a cobrar: o caso terminou com perda em 06/11', 'Cláudio e Noemi · 20% do êxito sobre base zero')]),
        grupo(f'Deste contrato · {C_C}, Cláudio', [li_ok(f'Tudo recebido · {R(1500)}', 'à vista em 02/06 · contrato encerrado em 12/11')]),
        grupo('Dos outros contratos do caso', [li_falta(f'<b>Noemi · parcela 6/6 · {R(1000)}</b>', f'{C_N} · venceu em 10/11 · 8 dias de atraso',
                                                         extra=ir('Abrir o contrato de Noemi', '?estado=contrato-pendente#t-fecha'))]),
        grupo('Adiantado pelo escritório no caso', [li_falta(f'<b>{CUSTAS}:</b> falta o reembolso de {R(412.30)}', 'vai junto com a parcela 6/6 de Noemi')]),
        grupo('Terceiros', [li_ok('Nenhum valor de terceiros entrou neste caso', 'não há repasse nem prestação de contas')])]
    fecha = folha_larga(SUB_L, quadro, juridico_linha(), nums_noemi(), botao=True)
    orig = folha_fi('t-orig', 'De onde veio', eventos([
        ('12/11/2026', [('09h30', '<b>Felipe Matos</b> encerrou este contrato', 'Em Contratos · motivo: “Tudo recebido; o caso terminou com perda.”', False)]),
        ('06/11/2026', [('17h10', '<b>Felipe Matos</b> encerrou o caso com perda', f'{CASO_L} · sem êxito a cobrar', False)])],
        ver('Ver o caso no Jurídico', '?estado=caso-acerto')), icone='historico')
    return ficha_ct('Cláudio Carvalho', SOBRE_N, meta, dir_, parcelas, tot, orig, 'O contrato foi pago à vista, na assinatura.', fecha=fecha)


ATALHO_NOEMI = f'<a class="btn btn-pri" href="?estado=contrato-pendente#t-fecha">{ico("dir")}Abrir o contrato de Noemi</a>'
LINHAS_CL = [li_falta(f'<b>Noemi · parcela 6/6 · {R(1000)}</b>', f'{C_N} · venceu em 10/11'),
             li_falta(f'<b>Custas · {R(412.30)} · vai junto com a parcela 6/6</b>', 'adiantadas pelo escritório em 06/2026')]
add('contrato-claudio', ficha_claudio() + j_bloqueado(LINHAS_CL, R(1412.30), ATALHO_NOEMI, abrir=False),
    'Contrato de Cláudio (EX-01): o caso inteiro, com o link para Noemi', trilha='Financeiro|A receber|Cláudio Carvalho', titulo='Cláudio Carvalho',
    **{k: v for k, v in FIN.items() if k not in ('trilha', 'titulo')})


# ---------------------------------------------------------------- 13. O vazio: contrato só de êxito, caso perdido
def ficha_so_exito():
    caso = 'Teixeira x Banco Aurora'
    dir_ = dir_fi('Fechamento do caso', R(0), selo('ok', 'Nada a receber', 'check'),
                  f'<b>{caso} terminou com perda em 30/10.</b><br>O contrato era só de êxito: não há nada a receber nem a reembolsar.',
                  f'<button class="btn btn-pri" type="button" data-janela="janela-fechar">{ico("cadeado")}Encerrar o caso no financeiro</button>')
    meta = meta_ct('vigente', 'C-2026-018 · só 30% do êxito', 'Larissa Costa')
    tot = quatro('30% do êxito', R(0), R(0), R(0))
    vazio = (f'<div class="estado sem-moldura fs-vazio" role="status"><span class="icone-estado">{ico("moeda")}</span><h3>Nenhuma parcela</h3>'
             '<p>O contrato era só de êxito e o caso terminou com perda. Com a base zero, o êxito não é criado.</p></div>')
    quadro = [
        grupo('Resultado e êxito', [li_ok('Sem êxito a cobrar: o caso terminou com perda em 30/10', '30% do êxito sobre base zero')]),
        grupo('Deste contrato · C-2026-018, Rosângela', [li_ok('Nenhuma parcela: o contrato era só de êxito')]),
        grupo('Adiantado pelo escritório no caso', [li_ok('Nada adiantado neste caso')]),
        grupo('Terceiros', [li_ok('Nenhum valor de terceiros entrou neste caso', 'não há repasse nem prestação de contas')])]
    fecha = folha_larga(f'{caso} · encerrado com perda em 30/10, por Larissa Costa', quadro,
                        pronto_linha('<b>Nada a receber neste caso.</b> Ele já pode ser encerrado no financeiro.') + juridico_linha(),
                        nums(0, 1, 0, 0, 'nada a receber', 'nada', reemb_txt='nada adiantado'))
    orig = folha_fi('t-orig', 'De onde veio', eventos([
        ('30/10/2026', [('15h30', '<b>Larissa Costa</b> encerrou o caso com perda', f'{caso} · sem êxito a cobrar', False)])],
        ver('Ver o caso no Jurídico', '#')), icone='historico')
    return ficha_ct('Rosângela Teixeira', f'Contrato de honorários · {caso}', meta, dir_, [], tot, orig, 'O êxito entraria aqui depois de conferido.', fecha=fecha, vazio=vazio)


def j_fechar_so_exito():
    corpo = (f'<div class="fl-ja"><dl><dt>Caso</dt><dd>Teixeira x Banco Aurora</dd><dt>Recebido no caso</dt><dd>{R(0)} · 1 contrato</dd><dt>Falta</dt><dd>nada</dd></dl></div>'
             f'<fieldset class="fl-caso"><legend>Contratos ligados ao caso<small>Encerrar para as cobranças novas. Nada é apagado.</small></legend>'
             f'<label class="opcao"><input class="marcar" type="checkbox" checked data-foco><span>Encerrar também este contrato<small>Só entram os que não têm outro caso em andamento.</small></span></label>'
             f'<ul class="jf-ctrs"><li>{ico("pena")}<span><b>C-2026-018 · Rosângela Teixeira</b><small>Só 30% do êxito · nada em aberto</small></span></li></ul></fieldset>')
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("cadeado")}Encerrar o caso e o contrato</button>'
    return janela('janela-fechar', 'Fechamento do caso', 'Encerrar o caso no financeiro', 'Rosângela Teixeira · Teixeira x Banco Aurora. Nada a receber.', corpo, pe)


add('contrato-so-exito', ficha_so_exito() + j_fechar_so_exito(), 'O vazio: contrato só de êxito, caso perdido',
    area='financeiro', secao='A receber', atual='financeiro', trilha='Financeiro|A receber|Rosângela Teixeira', titulo='Rosângela Teixeira')


# ---------------------------------------------------------------- 14. Caso com levantamento: a ficha do contrato só aponta
def ficha_com_lev():
    dir_ = dir_fi('Nada a receber', R(0), selo('ok', 'Tudo recebido', 'check'),
                  '<b>Entrada e êxito recebidos.</b><br>O caso teve RPV: o fechamento fica na ficha do repasse.')
    meta = meta_ct('vigente', f'{C_F} · {R(1500)} de entrada + 30% do êxito', 'Larissa Costa')
    pg1, pg2 = selo('ok', 'Paga em 12/03/2025', 'check'), selo('ok', 'Transferido 13/11', 'check')
    parcelas = [('Entrada', 'março de 2025', '12/03/2025', 'Pix', f'<div class="fi-sit">{pg1}</div>', pg1, 1500, DOCS_PG('0012'), ' class="fi-pago"'),
                ('Êxito', 'RPV de 12/11', '13/11', 'Da RPV', f'<div class="fi-sit">{pg2}<p class="fi-motivo">30% da RPV, separado no repasse.</p></div>', pg2, 11592,
                 f'<div class="fi-docs"><a href="#">{ico("doc")}Recibo 0179</a></div>', ' class="fi-pago"')]
    tot = quatro(f'{R(1500)} + 30% do êxito', R(13092), R(0), R(0))
    orig = folha_fi('t-orig', 'De onde veio', eventos([
        ('13/11/2026', [('10h40', '<b>Marina Ribeiro</b> registrou o repasse', 'Êxito de R$ 11.592,00 transferido ao caixa do escritório', False)]),
        ('12/11/2026', [('16h12', '<b>Marina Ribeiro</b> registrou a RPV', f'{R(38640)} · divisão do contrato aceita sem mudança', False)])],
        ver('Ver o caso no Jurídico', '#')), icone='historico')
    fecha = folha_fi('t-fecha', 'Fechamento do caso', (
        f'<div class="fi-fecha"><ul class="fi-check">{li_ok("Entrada e êxito recebidos")}'
        f'{li_falta(f"<b>Parceiro e perito:</b> falta pagar {R(3818.40)}", "na ficha do repasse")}</ul>'
        f'<p class="fs-aponta">{ico("enviar")}<span>O fechamento deste caso fica na ficha do repasse, porque entrou dinheiro de terceiros (RPV de 12/11).</span></p>'
        f'{ver("Ver o fechamento", "#")}</div>'), icone='cadeado', sub='Ferreira Prado x INSS · só para ler')
    return ficha_ct('Antônia Ferreira Prado', 'Contrato de honorários · Ferreira Prado x INSS', meta, dir_, parcelas, tot, orig + fecha, SUB_PARC)


add('contrato-com-levantamento', ficha_com_lev(), 'Caso com RPV: a folha só aponta para a ficha do repasse',
    area='financeiro', secao='A receber', atual='financeiro', trilha='Financeiro|A receber|Antônia Ferreira Prado', titulo='Antônia Ferreira Prado')


# ====================================================================================== caso B: Pereira x Mercado Bom Preço
CASO_B = 'Pereira x Mercado Bom Preço'
JOANA = dict(nome='Joana Pereira', tp='PF', desde='14/04/2026')
NJ = dict(atendimentos=5, propostas=1, contratos=1, casos=1)


def aba_casos_joana():
    sub = 'Os casos e processos em que Joana é cliente. Um processo pode ter mais de um cliente.'
    sel = f'<span class="selo selo-neutro">{ico("relogio")}Acerto a vencer</span>'
    linhas = [('fl-vivo', [
        f'<div class="fl-num"><a href="#">{CASO_B}</a><small class="num">0010458-21.2026.5.02.0031 · Trabalhista</small></div>',
        f'<div class="fl-et"><b>Encerrado · acerto pendente</b>{J["mini"](8)}<small>8 de 8 · acordo em 18/11</small></div>',
        '<b>Autora</b><small>Com Carlos Henrique Dias</small>', J['resp']('Marina Ribeiro'), sel])]
    cards = cartao(CASO_B, '#', '0010458-21.2026.5.02.0031', [('Etapa', 'Encerrado · acerto pendente · acordo em 18/11'), ('Papel', 'Autora, com Carlos Henrique Dias'), ('Responsável', 'Marina Ribeiro')], sel)
    pe = '<div class="fl-pe"><span><b>1 caso</b>, encerrado. O acerto do dinheiro fica no Financeiro, na ficha do contrato.</span></div>'
    return folha_aba('t-aba', 'Casos', sub, tabela('Casos de Joana', ['Caso', 'Etapa', 'Joana no caso', 'Responsável', 'Acerto'], [27, 22, 17, 18, 16], linhas, cards, pe))


D_J = dir_fecha2(f'<b>{CASO_B} terminou com acordo em 18/11.</b><br>Nada está atrasado: o fechamento espera o êxito de Joana.',
                 [('Conferir o êxito', 'ok', 'Conferido por Diego em 18/11 · o de Carlos não será cobrado'),
                  ('Encerrar no financeiro', 'ag', 'Esperando o êxito de Joana, em 15/12'), ('Encerrar o contrato', '', 'CT-2026-014, junto com o financeiro')],
                 f'<a class="btn btn-pri" href="?estado=contrato-acordo#t-fecha">{ico("cadeado")}Ver o acerto</a>',
                 'Quem faz: a área Financeiro (Marina, Diego e Bianca). O contrato pode ser encerrado junto.')
add('fecha-a-vencer', ficha_x(JOANA, D_J, 'casos', aba_casos_joana(), NJ), 'Ficha de Joana: o fechamento espera o êxito, sem atraso',
    aba='casos', atual='clientes', trilha='Clientes|Joana Pereira', titulo='Joana Pereira')


def ficha_joana():
    """Base: o conferido-contrato aprovado (exito.py: contrato_joana), continuado."""
    dir_ = dir_fi('Próxima', R(8400), selo('neutro', '15/12 · terça'),
                  f'<b>Êxito do acordo de 18/11.</b><br>Joana recebe {R(28000)} do Mercado Bom Preço e paga o escritório.',
                  f'<button class="btn btn-pri" type="button" data-janela="janela-registrar">{ico("moeda")}Registrar recebimento</button>')
    meta = meta_ct('vigente', 'CT-2026-014 · 30% do êxito', 'Diego Almeida')
    sit = (f'<div class="fi-sit"><div class="ex-selos"><span class="selo ex-tipo">{ico("balanca")}Êxito</span>{selo("neutro", "A vencer")}</div>'
           f'<p class="fi-motivo"><b>Origem:</b> do encerramento do caso em 18/11, conferido por Diego.</p>'
           f'<p class="fi-motivo">30% de {R(28000)}, cláusula 4ª. Valor do contrato, sem mudança.</p></div>')
    sit_cel = f'<div class="ex-selos"><span class="selo ex-tipo">{ico("balanca")}Êxito</span>{selo("neutro", "A vencer")}</div>'
    parcelas = [('Êxito', 'acordo de 18/11', '15/12', 'Pix', sit, sit_cel, 8400, '<span class="fi-pq">—</span>', '')]
    tot = quatro('30% do êxito', R(0), R(0), R(8400))
    orig = folha_fi('t-orig', 'De onde veio', eventos([('18/11/2026', [
        ('16h10', '<b>Diego Almeida</b> marcou o êxito de Carlos como não cobrado', 'Perdoado · “Carlos ficou com a parte menor do acordo; combinado com Marina”', False),
        ('15h40', '<b>Diego Almeida</b> conferiu e lançou o êxito', f'{R(8400)}, vence 15/12/2026, Pix · sem mudança no valor', False),
        ('14h50', 'O T3jus calculou pelo contrato', f'30% de {R(28000)} (cláusula 4ª) = {R(8400)} · mandado ao Financeiro para conferir', False),
        ('14h50', '<b>Marina Ribeiro</b> encerrou o caso com acordo', f'{CASO_B} · {R(28000)} para Joana, pagamento previsto em 15/12', False)])],
        ver('Ver o caso no Jurídico', '#')), icone='historico')
    quadro = [
        grupo('Resultado e êxito', [
            li_ok(f'Êxito de Joana lançado · {R(8400)}', 'vence em 15/12 · conferido por Diego em 18/11'),
            li_ok('Êxito de Carlos não cobrado · perdoado, por Diego em 18/11', '“Carlos ficou com a parte menor do acordo; combinado com Marina.”')]),
        grupo('Deste contrato · CT-2026-014, Joana', [li_espera(f'Êxito de Joana · {R(8400)} a vencer em 15/12', 'nada em atraso')]),
        grupo('Dos outros contratos do caso', [li_ok('CT-2026-015 · Carlos: nada a receber', 'o êxito não será cobrado', extra=ir('Abrir o contrato de Carlos', '#'))]),
        grupo('Adiantado pelo escritório no caso', [li_ok('Nada adiantado neste caso')]),
        grupo('Terceiros', [li_ok('Nenhum valor de terceiros entrou neste caso', 'o acordo é pago direto a Joana · se vier alvará, a divisão aparece em Repasses')])]
    rod = pronto_linha('<b>Pronto para encerrar depois do êxito de Joana, em 15/12.</b>') + juridico_linha()
    fecha = folha_larga(f'{CASO_B} · encerrado com acordo em 18/11, por Marina Ribeiro', quadro, rod,
                        nums(0, 2, 0, 8400, 'a vencer em 15/12 · nada em atraso', 'espera', reemb_txt='nada adiantado'), botao=True)
    return ficha_ct('Joana Pereira', f'Contrato de honorários · {CASO_B}', meta, dir_, parcelas, tot, orig,
                    'O êxito entra aqui depois de conferido. Cada mudança fica no histórico.', fecha=fecha)


LINHAS_J = [li_espera(f'<b>Êxito de Joana · {R(8400)} · vence 15/12</b>', 'CT-2026-014 · nada em atraso')]
J_BLOQ_J = j_bloqueado(LINHAS_J, R(8400), f'<button class="btn btn-pri" type="button" data-janela="janela-registrar" data-fechar>{ico("moeda")}Registrar recebimento do êxito</button>',
                       abrir=False, desc=f'É o caso {CASO_B}, encerrado com acordo em 18/11/2026.').replace(
    'Se Noemi não vai pagar, ainda não dá para dar baixa na parcela sem receber: anote a cobrança, e o caso segue “acerto pendente” até a parcela ser paga.',
    'O êxito ainda não venceu: o caso fica pronto para encerrar depois de 15/12.').replace('Ainda falta receber neste caso.', 'Ainda falta receber neste caso, a vencer.')
add('contrato-acordo', ficha_joana() + J_BLOQ_J, 'Contrato de Joana: o acordo com êxito, a vencer',
    area='financeiro', secao='A receber', atual='financeiro', trilha='Financeiro|A receber|Joana Pereira', titulo='Joana Pereira')


# ====================================================================================== CSS das peças novas
CSS_FS = r"""
/* ==========================================================================
   Portal · fechamento do caso sem levantamento (prefixo fs-). Só tokens e pares já aprovados.
   ========================================================================== */
.fs-folha h2[tabindex]{scroll-margin-top:96px}
.fs-folha h2[tabindex]:focus{outline:none}
.fs-folha h2[tabindex]:focus-visible{outline:3px solid var(--vinho-3);outline-offset:4px;border-radius:4px}
.fs-folha h2 .ico{color:var(--vinho)}
.fs-grade{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:28px;padding:0 24px 22px;align-items:start}
.fs-quadro{display:grid;gap:14px;min-width:0}
.fs-grupo h3{margin:0 0 2px;font-family:var(--sans,inherit);font-size:11.5px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--vinho-2)}
.fs-grupo .fi-check li{border-top:0;padding:6px 0}
.fs-grupo .fi-check li+li{border-top:1px solid var(--divisor)}
.fi-check li.fs-espera .ico{color:var(--vinho-2)}
.fs-ir{display:inline-flex;align-items:center;gap:4px;min-height:44px;margin:-6px 0 -10px;font-size:13px;font-weight:500;color:var(--vinho);text-decoration:none}
.fs-ir:hover{text-decoration:underline}
.fs-lado{display:grid;gap:12px;position:sticky;top:88px}
.fs-lado .btn{justify-content:center}
.fs-nums{margin:0;display:grid;gap:8px}
.fs-nums div{padding:12px 14px;border-radius:var(--raio);background:var(--sal-2)}
.fs-nums dt{font-size:12px;color:var(--texto-2)}
.fs-nums dd{margin:2px 0 0;font-family:var(--serifa);font-size:24px;font-weight:500;color:var(--vinho);font-variant-numeric:lining-nums tabular-nums;white-space:nowrap}
.fs-nums dd small{display:block;font-family:var(--sans,inherit);font-size:12px;color:var(--texto-2);white-space:normal}
.fs-nums div.falta{background:var(--papel);box-shadow:inset 0 0 0 1.5px var(--vinho-3)}
.fs-nums div.falta dd{color:var(--vinho-3)}
.fs-nums div.fs-aguarda{background:var(--papel);box-shadow:inset 0 0 0 1.5px var(--vinho-4)}
.fs-jur,.fs-pronto,.fs-aponta,.fs-quem-ctr{display:flex;gap:10px;align-items:flex-start;margin:0;font-size:13px;line-height:1.5}
.fs-jur{color:var(--texto-2)}
.fs-jur b{color:var(--texto);font-weight:500}
.fs-jur .ico,.fs-aponta .ico,.fs-quem-ctr .ico{width:16px;height:16px;flex:none;margin-top:2px;color:var(--vinho)}
.fs-pronto{padding:10px 14px;border-radius:var(--raio);background:var(--ambar-3);color:var(--tinta)}
.fs-pronto .ico{width:18px;height:18px;flex:none;margin-top:1px;color:#4F1D35}
.fs-pronto b{font-weight:600}
.fs-aponta{color:var(--tinta)}
.fs-leg{font-family:var(--serifa);font-size:19px;font-weight:600;color:var(--vinho);margin:0}
.jf-ctrs li.fs-ja{color:var(--texto-2)}
.jf-ctrs li.fs-ja .ico{color:var(--vinho-4)}
.fs-quem-ctr{padding:10px 12px;border-radius:var(--raio);background:var(--sal-2);margin-top:8px}
.fs-vazio{margin:8px 24px 22px}
@media (max-width:760px){
  .fs-grade{grid-template-columns:minmax(0,1fr);gap:18px;padding:0 16px 18px}
  .fs-lado{position:static}
  .fs-lado .btn{width:100%}
  .fs-nums dd{font-size:21px}
  .fs-vazio{margin:8px 16px 18px}
}
"""

# ====================================================================================== página
GRUPOS = [
    ('1. A ficha do cliente e a do caso', ['fecha-financeiro', 'fecha-larissa', 'caso-acerto', 'caso-acerto-larissa']),
    ('2. A folha na ficha do contrato', ['contrato-pendente', 'fechar-bloqueado', 'contrato-pronto']),
    ('3. Encerrar o caso e o contrato', ['encerrar', 'encerrar-sem-contratos', 'encerrar-erro', 'encerrado']),
    ('4. Variações', ['contrato-claudio', 'contrato-so-exito', 'contrato-com-levantamento']),
    ('5. O acordo com êxito, a vencer', ['fecha-a-vencer', 'contrato-acordo']),
]
ROT = dict(EST)
assert sorted(sum((g[1] for g in GRUPOS), [])) == sorted(ROT), set(ROT) ^ set(sum((g[1] for g in GRUPOS), []))
nav = ''.join(f'<p>{g}</p>' + ''.join(f'<a href="?estado={e}">{ROT[e]}</a>' for e in es) for g, es in GRUPOS)
NAV = (f'<details id="fl-estados"><summary>{ico("menu")}<span class="sr">Estados desenhados: </span><b>Estados</b></summary>'
       f'<nav class="fl-lista" aria-label="Estados desenhados">{nav}</nav></details>')

out = pagina('Fechamento do caso', 'Portal: fechamento do caso sem levantamento, na ficha do contrato do Financeiro (EX-16, EX-17, FI-08).',
             '{"estado":"contrato-pendente","atual":"financeiro"}', '', T, ''.join(BARRAS.values()))
out = out.replace('</style>', CSS_CL + '\n' + J['CSS_JU'] + '\n' + CSS_FL + '\n' + CSS_EXTRA + '\n' + CSS_JF + '\n' + CSS_EX + '\n' + CSS_FS + '\n</style>', 1)
out = out.replace('<script>\n(function(){', NAV + '\n<script>\n(function(){', 1)
# Chegando por "Ver o acerto" (#t-fecha), o foco vai ao título da folha (decisão 12)
out = out.replace("  if(q.get('mais')){", "  if(location.hash){ var alvo=document.getElementById(location.hash.slice(1)); if(alvo&&alvo.hasAttribute('tabindex')){ alvo.focus(); alvo.scrollIntoView() } }\n  if(q.get('mais')){", 1)
assert "location.hash" in out
os.makedirs(SAIDA, exist_ok=True)
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(out)
json.dump([{'nome': e, 'url': f'index.html?estado={e}', 'rotulo': r} for e, r in EST],
          open(os.path.join(AQUI, 'casos.json'), 'w'), ensure_ascii=False, indent=1)
print('fechamento ok', len(EST), 'estados,', len(out) // 1024, 'KB')
