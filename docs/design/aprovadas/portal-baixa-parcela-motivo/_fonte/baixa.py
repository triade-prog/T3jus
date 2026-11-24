# Portal · baixa de parcela vencida sem receber, com motivo (F3.139: FI-24, FI-08, EX-16).
# Base técnica: o _fonte aprovado de portal-fechamento-sem-levantamento. O fechamento.py é lido até a parte "página",
# sem mudança (dali vêm EST, add, janela, aviso, ficha_ct, quatro, folha_larga, as peças fs- e todo o CSS aprovado).
# Também são lidos, só para ler: o CSS np- e o ícone "desfazer" de portal-nao-paga-logo (a janela "Não foi paga"
# é o padrão desta janela) e o painel, o CSS si- e o script do sino de portal-sino-caso-encerrado.
# Peças novas com prefixo bx-. Uso: python3 baixa.py <pasta-saida>
import os, sys, re, json

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
_SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
_corte = '# ====================================================================================== página'
_src = open(os.path.join(AQUI, 'fechamento.py'), encoding='utf-8').read()
exec(compile(_src[:_src.rindex(_corte)], 'fechamento.py', 'exec'), globals())
SAIDA = _SAIDA
EST = []   # os 16 estados aprovados saem; ficam as peças
T = ''
import comum

# ---------------------------------------------------------------- telas aprovadas (só leitura)
_NP = _ler('portal-nao-paga-logo/contrato-nao-paga.html')
_i = _NP.index('/* ==========================================================================\n   Recebimentos · "Não foi paga"')
_f = _NP.find('/* ====', _i + 20)
CSS_NP = _NP[_i:_f if 0 < _f < _NP.index('</style>', _i) else _NP.index('</style>', _i)]
assert '.np-oque' in CSS_NP and '@media' in CSS_NP
_SI = _ler('portal-sino-caso-encerrado/index.html')
_i = _SI.index('/* ==========================================================================\n   Sino de avisos (prefixo si-)')
CSS_SI = _SI[_i:_SI.index('/* Navegação entre os estados', _i)]
_TSI = _tpls(_SI)['sp-motivos']
_j = _SI.index('<script>\n(function(){\n  /* O sino da moldura')
SCRIPT_SI = _SI[_j:_SI.index('</script>', _j) + 9]
# O script aprovado do sino supõe o painel na página; aqui ele só existe nos estados do sino.
SCRIPT_SI = SCRIPT_SI.replace("  var cel=matchMedia('(max-width:760px)');", "  if(!d) return;\n  var cel=matchMedia('(max-width:760px)');", 1)
assert 'if(!d) return;' in SCRIPT_SI
_sym = lambda s, n: re.search(r'<symbol id="i-%s".*?</symbol>' % n, s).group(0)
comum.SPRITE = comum.SPRITE.replace('</svg>', _sym(_NP, 'desfazer') + _sym(_SI, 'checks') + '</svg>')

# Felipe Matos, do elenco aprovado (Comercial, Contratos e Jurídico, sem Financeiro)
comum.SCRIPT = comum.SCRIPT.replace(
    "'sem-area':{",
    "felipe:{nome:'Felipe Matos',ini:'F',papel:'Áreas: Comercial, Contratos e Jurídico',areas:['comercial','contratos','juridico'],dono:false},\n    'sem-area':{", 1)
assert "felipe:{" in comum.SCRIPT

# ====================================================================================== peças bx-
NOEMI_N = 'Noemi Bastos Carvalho'
EXPL_N = 'Noemi recusou pagar depois da perda; não vamos cobrar na Justiça.'
C_S = 'C-2026-029'
SEB = 'Sebastião Lopes'
CASO_S = 'Lopes x Transportadora Rota Sul'
COMB_S = 'Parcelado: 2 × R$\u00a0250,00, em dezembro e janeiro, combinado com Sebastião por telefone hoje.'
NW = lambda t: f'<span class="bx-nw">{t}</span>'  # número de contrato e valor que não quebram


def cinco(a, b, c, d, baix, sub, urg=False, rotulo='Baixado sem receber'):
    """Os quatro números aprovados e, só quando há baixa no contrato, o quinto, na largura toda."""
    return quatro(a, b, c, d, urg).replace('</dl>', f'<div class="bx-baixado"><dt>{rotulo}</dt><dd class="num">{baix} <small>{sub}</small></dd></div></dl>')


def colunas_bx(h):
    """A coluna "Recibo" do código vira "Recibo e ações", mais larga (decisão 1)."""
    h = h.replace('<col style="width:12%"><col style="width:11%"><col style="width:8%"><col style="width:30%"><col style="width:15%"><col style="width:24%">',
                  '<col style="width:11%"><col style="width:10%"><col style="width:8%"><col style="width:24%"><col style="width:14%"><col style="width:33%">')
    h = h.replace('<th scope="col">Documentos</th>', '<th scope="col">Recibo e ações</th>')
    # A nota, a explicação e as custas da parcela baixada vão para uma linha de detalhe logo abaixo (nota 10 da segunda leitura)
    def det(m):
        return (m.group(1) + m.group(3) + f'<tr class="bx-det"><td colspan="3"><span class="sr">Baixa sem receber da parcela {m.group(4)}:</span></td>'
                f'<td colspan="3" id="bx-det-{m.group(4).replace("/", "-")}">{m.group(2)}</td></tr>')
    return re.sub(r'(<tr class="bx-baixada">.*?)<!--DET(.*?)DET-->(.*?</tr>)(?#)(?=)', lambda m: det(_n(m)), h, flags=re.S)


def _n(m):
    """Acrescenta o número da parcela (o primeiro <b> da linha) ao resultado do regex."""
    class M:
        def group(self, i):
            if i == 4:
                return re.search(r'<b>([^<]+)</b>', m.group(1)).group(1)
            return m.group(i)
    return M()


def btn_baixa(nome, venc, janela='janela-baixa', foco=False):
    f = ' data-foco-inicial' if foco else ''
    return (f'<button class="btn btn-sec bx-acao bx-leve" type="button" data-janela="{janela}"{f}>Dar baixa sem receber'
            f'<span class="sr">: parcela {nome}, de {venc}</span></button>')


def btn_desfazer(nome, janela='janela-desfazer', foco=False):
    f = ' data-foco-inicial' if foco else ''
    return (f'<button class="btn btn-sec bx-acao bx-leve" type="button" data-janela="{janela}"{f} aria-describedby="bx-det-{nome.replace("/", "-")}">{ico("desfazer")}Desfazer a baixa sem receber'
            f'<span class="sr">: parcela {nome}</span></button>')


def acoes(*b):
    return f'<div class="bx-acoes">{"".join(b)}</div>'


def sit_baixada(motivo, quem, expl, antes='', depois='', tabela=False):
    """Selo, depois a nota (motivo, quem e quando) e a explicação, lidos nessa ordem; o que muda nas custas vem no fim.
    Na tabela do computador, só o selo e o valor baixado ficam na célula; o resto vai para a linha de detalhe."""
    det = f'<div class="bx-det-c">{antes}<p class="fi-motivo bx-nota">{motivo} · por {quem} em 18/11</p><p class="bx-expl"><q>{expl}</q></p>{depois}</div>'
    if tabela:
        return f'<div class="fi-sit">{selo("neutro", "Baixa sem receber")}</div><!--DET{det}DET-->'
    return f'<div class="fi-sit">{selo("neutro", "Baixa sem receber")}{det}</div>'


def bx_toast(titulo, texto, acoes_=''):
    ac = f'<div class="aviso-acoes">{acoes_}</div>' if acoes_ else ''
    return (f'<div class="aviso aviso-sucesso toast" role="status">{ico("check")}<div><strong class="aviso-titulo">{titulo}</strong><p>{texto}</p>{ac}</div>'
            f'<button class="fechar" type="button" data-fechar aria-label="Fechar aviso">{ico("x")}</button></div>')


# ---------------------------------------------------------------- caso A: a ficha do contrato de Noemi
BTN_REG_N = BTN_REG.replace('class="btn btn-sec btn-compacto"', 'class="btn btn-sec btn-compacto bx-reg"')


def parcelas_bx(fase):
    """fase: aberta, desfeita, feita (só a parcela), pronto (parcela e custas) ou encerrado."""
    ps = parcelas_noemi()[:5]
    if fase in ('aberta', 'desfeita'):
        s = (f'<div class="fi-sit">{selo("urgente", "Vencida há 8 dias", "alerta")}<p class="fi-motivo"><b>Leva junto:</b> o reembolso das custas, {R(412.30)}.</p>'
             + ('<p class="fi-motivo bx-nota">Baixa sem receber desfeita hoje, por Marina Ribeiro</p>' if fase == 'desfeita' else '') + '</div>')
        ps.append(('6/6', 'novembro', '10/11', 'Pix', s, s, 1000, acoes(BTN_REG_N, btn_baixa('6/6', '10/11/2026', foco=fase == 'desfeita')), ' class="fi-atraso"'))
    else:
        extra = (f'<p class="fi-motivo">As custas de {R(412.30)} ficaram a reembolsar, em A pagar.</p>' if fase == 'feita'
                 else f'<p class="fi-motivo">O reembolso das custas, {R(412.30)}, teve baixa junto.</p>')
        s = sit_baixada('Inadimplência', 'Marina Ribeiro', EXPL_N, depois=extra)
        st = sit_baixada('Inadimplência', 'Marina Ribeiro', EXPL_N, depois=extra, tabela=True)
        ps.append(('6/6', 'novembro', '10/11', 'Pix', st, s, 1000, acoes(btn_desfazer('6/6', foco=fase in ('feita', 'pronto'))), ' class="bx-baixada"'))
    return ps


def cobranca_bx(fase):
    hist_base = ('<li><time>13/11</time><span class="pto" aria-hidden="true"></span><div><p><b>Diego Almeida</b> falou com Noemi, às 15h40</p><small>Pelo WhatsApp. Motivo anotado.</small></div></li>'
                 '<li><time>11/11</time><span class="pto" aria-hidden="true"></span><div><p>Lembrete de atraso pelo WhatsApp, às 9h</p><small>Automático, com a parcela e o reembolso em linhas separadas.</small></div></li>')
    if fase == 'aberta':
        topo = (f'<div class="fi-cob"><dl><div><dt>Motivo do atraso</dt><dd>Noemi disse que não vai pagar porque perdeu a ação<small>anotado por Diego Almeida em 13/11</small></dd></div>'
                f'<div><dt>Próxima ação</dt><dd>Hoje, 18/11: falar com Marina<small>responsável: Diego Almeida</small></dd></div></dl>'
                f'<button class="btn btn-sec" type="button">{ico("lapis")}Anotar cobrança</button></div>')
        hist = hist_base
    elif fase == 'desfeita':
        topo = (f'<div class="fi-cob"><dl><div><dt>Última anotação</dt><dd>Baixa desfeita: Noemi ligou e prometeu pagar em dezembro<small>anotado por Marina Ribeiro hoje, às 10h31</small></dd></div>'
                f'<div><dt>Próxima ação</dt><dd>Amanhã, 19/11: falar com Noemi<small>responsável: Marina Ribeiro, que desfez a baixa (Felipe, que cuida do contrato, não tem Financeiro)</small></dd></div></dl>'
                f'<button class="btn btn-sec" type="button">{ico("lapis")}Anotar cobrança</button></div>')
        hist = ('<li><time>18/11</time><span class="pto forte" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> desfez a baixa sem receber, às 10h31</p><small>“Noemi ligou e prometeu pagar em dezembro.” A régua não manda de uma vez os passos que venceram durante a baixa.</small></div></li>'
                '<li><time>18/11</time><span class="pto" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> deu baixa sem receber, às 10h14</p><small>Inadimplência. A cobrança parou.</small></div></li>' + hist_base)
    else:
        topo = (f'<p class="bx-cob-vazia">{ico("check")}<span><b>Nenhuma parcela de Noemi está em cobrança.</b> O histórico da parcela 6/6 continua aqui e volta a valer se a baixa for desfeita.</span></p>')
        hist = ('<li><time>18/11</time><span class="pto forte" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> deu baixa sem receber, às 10h14</p><small>Inadimplência. A régua desta parcela parou, sem mandar mais nada.</small></div></li>' + hist_base)
    return folha_fi('t-cob', 'Cobrança', topo + f'<div class="eventos-dia" style="padding-top:0"><h3>Histórico de cobrança</h3><ol class="eventos">{hist}</ol></div>', icone='sino')


def origem_bx(fase):
    dias = []
    hoje = []
    if fase == 'encerrado':
        hoje.append(('16h20', '<b>Marina Ribeiro</b> encerrou o caso no financeiro', f'Tudo recebido ou baixado com motivo · o contrato {C_N} foi encerrado junto', True))
    if fase == 'desfeita':
        hoje.append(('10h31', '<b>Marina Ribeiro</b> desfez a baixa sem receber da parcela 6/6', '“Noemi ligou e prometeu pagar em dezembro.” · próxima ação com Marina Ribeiro', True))
    if fase != 'aberta':
        sub = 'Inadimplência · ' + ('a parcela e o reembolso das custas' if fase in ('pronto', 'encerrado') else f'{R(1000)}; as custas ficaram a reembolsar, em A pagar')
        hoje.append(('10h14', '<b>Marina Ribeiro</b> deu baixa sem receber na parcela 6/6', sub, fase in ('feita', 'pronto')))
    if hoje:
        dias.append(('18/11/2026', hoje))
    dias.append(('12/11/2026', [('09h30', f'<b>Felipe Matos</b> encerrou o contrato {C_C}, de Cláudio', 'Em Contratos · tudo recebido, nada a cobrar', False)]))
    dias.append(('06/11/2026', [('17h10', '<b>Felipe Matos</b> encerrou o caso com perda', f'{CASO_L} · sentença de improcedência em 04/11, sem recurso · sem êxito a cobrar', False)]))
    return folha_fi('t-orig', 'De onde veio', eventos(dias, ver('Ver o caso no Jurídico', '#')), icone='historico')


def adiantado_bx(fase):
    if fase in ('aberta', 'desfeita'):
        return adiantado_noemi()
    if fase == 'feita':
        s, prox = selo('atencao', 'A reembolsar'), 'Sem parcela de Noemi para ir junto: <b>a reembolsar, em A pagar</b>'
    else:
        s, prox = selo('neutro', 'Baixa sem receber'), 'Baixa sem receber junto com a parcela 6/6 · inadimplência, por Marina Ribeiro em 18/11'
    return folha_fi('t-reemb', 'Adiantado pelo escritório neste caso', (
        f'<ul class="fi-linhas"><li class="fi-linha" style="grid-template-columns:minmax(0,1fr) auto"><div class="fi-quem"><strong>{CUSTAS}</strong>'
        f'<small>Pagas pelo escritório em 06/2026 · guias anexadas · categoria "Custas adiantadas"</small>'
        f'<p class="fi-prox">{ico("relogio")}{prox}</p></div>'
        f'<div class="fi-lado"><span class="fi-v num">{R(412.30)}</span>{s}</div></li></ul>'),
        sub='Vira valor a reembolsar pelo cliente, ligado a este caso.', icone='reenviar')


def quadro_bx(fase):
    q = quadro_noemi()
    deste = grupo(f'Deste contrato · {C_N}, Noemi', [li_ok('5 de 6 parcelas recebidas · R$ 5.000,00',
                                                             'parcela 6/6 baixada sem receber (inadimplência), por Marina em 18/11')])
    if fase == 'feita':
        adi = grupo('Adiantado pelo escritório no caso', [li_falta(f'<b>{CUSTAS}:</b> falta o reembolso de {R(412.30)}', 'a reembolsar, em A pagar · não há parcela de Noemi para ir junto',
                                                                  extra=ir('Ver em A pagar', '#'))])
    else:
        adi = grupo('Adiantado pelo escritório no caso', [li_ok(f'{CUSTAS}: reembolso baixado sem receber · {R(412.30)}', 'inadimplência, por Marina em 18/11, junto com a parcela 6/6')])
    return [q[0], deste, q[2], adi, q[4]]


D_PEND_BX = D_PEND.replace('Próxima ação: sexta, 20/11.', 'Próxima ação: hoje, falar com Marina.')
D_DESF_BX = D_PEND.replace('Próxima ação: sexta, 20/11.', 'Próxima ação: amanhã, falar com Noemi.')
assert D_PEND_BX != D_PEND
TOT_BX = cinco(R(6000), R(5000), R(0), R(0), R(1000), 'parcela 6/6 · inadimplência')


def ficha_bx(fase='aberta'):
    if fase in ('aberta', 'desfeita'):
        dir_ = D_PEND_BX if fase == 'aberta' else D_DESF_BX
        fecha = folha_larga(SUB_L, quadro_noemi(), juridico_linha(), nums_noemi(), botao=True)
        h = ficha_ct(NOEMI_N, SOBRE_N, META_N, dir_, parcelas_bx(fase), TOT_N, origem_bx(fase) + cobranca_bx(fase), SUB_PARC, fecha=fecha, principal=adiantado_bx(fase))
    elif fase == 'feita':
        dir_ = dir_fi('Fechamento do caso', R(412.30), selo('atencao', 'Custas a reembolsar'),
                      f'<b>Falta o reembolso das custas, {R(412.30)}.</b><br>Sem parcela de Noemi para ir junto, ficou a reembolsar em A pagar.',
                      f'<a class="btn btn-pri" href="#">{ico("carteira")}Ver em A pagar</a>')
        fecha = folha_larga(SUB_L, quadro_bx('feita'), juridico_linha(),
                            nums(6500, 2, 0, 412.30, 'custas, a reembolsar em A pagar', 'falta', reemb_txt=f'de {R(412.30)} adiantados'), botao=True)
        h = ficha_ct(NOEMI_N, SOBRE_N, META_N, dir_, parcelas_bx('feita'), TOT_BX, origem_bx('feita') + cobranca_bx('feita'), SUB_PARC, fecha=fecha, principal=adiantado_bx('feita'))
    elif fase == 'pronto':
        dir_ = dir_fi('Fechamento do caso', R(0), selo('ok', 'Nada falta', 'check'),
                      f'<b>Tudo recebido ou baixado com motivo.</b><br>O caso {CASO_L} já pode ser encerrado no financeiro.',
                      f'<button class="btn btn-pri" type="button" data-janela="janela-fechar">{ico("cadeado")}Encerrar o caso no financeiro</button>')
        fecha = folha_larga(SUB_L, quadro_bx('pronto'), juridico_linha(),
                            nums(6500, 2, 0, 0, f'tudo recebido ou baixado sem receber: {R(1000)} da parcela 6/6', 'nada', reemb_txt=f'{R(412.30)} baixados sem receber'))
        h = ficha_ct(NOEMI_N, SOBRE_N, META_N, dir_, parcelas_bx('pronto'), TOT_BX, origem_bx('pronto') + cobranca_bx('pronto'), SUB_PARC, fecha=fecha, principal=adiantado_bx('pronto'))
    else:  # encerrado
        dir_ = dir_fi('Contrato encerrado', R(0), selo('ok', 'Caso encerrado', 'check'),
                      f'<b>Caso encerrado no financeiro hoje, 18/11.</b><br>O contrato {C_N} foi encerrado junto, com o motivo.',
                      f'<a class="btn btn-pri" href="#">{ico("pessoas")}Ver a ficha de Noemi</a>')
        meta = meta_ct('Encerrado em 18/11', f'{C_N} · 6 parcelas de {R(1000)} · + 20% do êxito', 'Felipe Matos')
        fecha_lado = folha_fi('t-fecha', 'Fechamento do caso', (
            f'<div class="fi-fecha"><p class="jf-fechado">{ico("check")}<span>Encerrado no financeiro em 18/11/2026, por Marina Ribeiro · {C_N} encerrado junto</span></p>'
            f'{nums(6500, 2, 0, 0, "tudo recebido ou baixado com motivo", "nada", reemb_txt=f"{R(412.30)} baixados sem receber")}'
            f'<ul class="fi-check">{li_ok("Sem êxito a cobrar: perda em 06/11")}{li_ok("Parcelas: 5 recebidas e a 6/6 baixada sem receber", "inadimplência, por Marina em 18/11")}'
            f'{li_ok("Custas: reembolso baixado sem receber")}{li_ok("Nenhum valor de terceiros entrou neste caso")}</ul></div>'), icone='cadeado', sub=CASO_L)
        ps = parcelas_bx('pronto')
        h = ficha_ct(NOEMI_N, SOBRE_N, meta, dir_, ps, TOT_BX, origem_bx('encerrado') + fecha_lado, SUB_PARC, principal=adiantado_bx('pronto'))
    return colunas_bx(h)


# ---------------------------------------------------------------- caso B: Sebastião Lopes, parcela paga em parte
def parcelas_seb(feita=False):
    ps = []
    for n, m, v, rec in [('1/6', 'agosto', '05/08', '2026-031'), ('2/6', 'setembro', '05/09', '2026-044')]:
        s = selo('ok', f'Paga em {v}', 'check')
        ps.append((n, m, v, 'Pix', f'<div class="fi-sit">{s}</div>', s, 900, DOCS_PG(rec), ' class="fi-pago"'))
    docs3 = f'<div class="fi-docs"><a href="#">{ico("doc")}Recibo 2026-061</a><a href="#">{ico("link")}Comprovante</a></div>'
    if feita:
        a = f'<p class="fi-motivo"><b>Recebido {R(400)}</b> · baixa sem receber de {R(500)}</p>'
        s = sit_baixada('Renegociada', 'Diego Almeida', COMB_S, antes=a)
        st = sit_baixada('Renegociada', 'Diego Almeida', COMB_S, antes=a, tabela=True)
        ps.append(('3/6', 'outubro', '05/10', 'Pix', st, s, 900, acoes(docs3, btn_desfazer('3/6', foco=True)), ' class="bx-baixada"'))
    else:
        s = (f'<div class="fi-sit">{selo("urgente", "Vencida há 44 dias", "alerta")}<p class="fi-motivo">Recebido {R(400)} em 20/10. Faltam <b>{R(500)}</b>.</p>'
             f'<p class="fi-motivo"><b>Leva junto:</b> as custas de cópias e autenticações, {R(86.40)}.</p></div>')
        ps.append(('3/6', 'outubro', '05/10', 'Pix', s, s, 900, acoes(docs3, btn_baixa('3/6', '05/10/2026')), ' class="fi-atraso"'))
    s = selo('ok', 'Paga em 05/11', 'check')
    ps.append(('4/6', 'novembro', '05/11', 'Pix', f'<div class="fi-sit">{s}</div>', s, 900, DOCS_PG('2026-079'), ' class="fi-pago"'))
    s5 = (f'<div class="fi-sit">{selo("neutro", "A vencer")}' + (f'<p class="fi-motivo"><b>Leva junto:</b> as custas de {R(86.40)}, desde a baixa da 3/6.</p>' if feita else '') + '</div>')
    ps.append(('5/6', 'dezembro', '05/12', 'Pix', s5, s5, 900, '<span class="fi-pq">—</span>', ''))
    s6 = f'<div class="fi-sit">{selo("neutro", "A vencer")}</div>'
    ps.append(('6/6', 'janeiro', '05/01<small class="bx-ano">2027</small>', 'Pix', s6, s6, 900, '<span class="fi-pq">—</span>', ''))
    return ps


def ficha_seb(feita=False):
    meta = meta_ct('vigente', f'{C_S} · 6 mensalidades de {R(900)} · Pix · dia 5', 'Marina Ribeiro')
    if feita:
        dir_ = dir_fi('Próxima', R(900), selo('neutro', '05/12 · sábado'),
                      f'<b>Parcela 5/6, de dezembro.</b><br>+ custas de {R(86.40)}, que passaram a ir com ela. Nada em atraso.',
                      f'<button class="btn btn-pri" type="button">{ico("moeda")}Registrar recebimento</button>')
        tot = cinco(R(4900), R(3100), R(0), R(1800), R(500), 'vira parcelas novas em Contratos', rotulo='Renegociado')
        tot = tot.replace(f'<dt>Contratado</dt><dd class="num">{R(4900)}</dd>', f'<dt>Contratado</dt><dd class="num">{R(4900)} <small class="bx-apoio">sem os {R(500)} renegociados</small></dd>', 1)
        orig_ev = [('18/11/2026', [('11h40', '<b>Diego Almeida</b> deu baixa sem receber na parcela 3/6', f'Renegociada · {R(500)}; as custas passaram a ir com dezembro · Contratos recebeu o aviso', True)])]
    else:
        dir_ = dir_fi('Em atraso', R(500), selo('urgente', '44 dias', 'alerta'),
                      f'<b>Parcela 3/6, de outubro.</b> Venceu em 05/10; recebido {R(400)} em 20/10.<br>+ custas de {R(86.40)}. Próxima ação: hoje, combinar com Sebastião.',
                      f'<button class="btn btn-pri" type="button">{ico("moeda")}Registrar recebimento</button>')
        tot = quatro(R(5400), R(3100), R(500), R(1800), urg=True)
        orig_ev = []
    orig_ev += [('20/10/2026', [('14h05', '<b>Diego Almeida</b> registrou o recebimento', f'Parcela 3/6 · {R(400)} de {R(900)} por Pix · recibo 2026-061', False)]),
                ('12/10/2026', [('09h20', 'O escritório adiantou as custas', f'Cópias e autenticações · {R(86.40)} · vão junto com a parcela 3/6', False)])]
    orig = folha_fi('t-orig', 'De onde veio', eventos(orig_ev), icone='historico')
    if feita:
        cob = folha_fi('t-cob', 'Cobrança', (
            f'<p class="bx-cob-vazia">{ico("check")}<span><b>Nada de Sebastião está em atraso.</b> A próxima parcela, a 5/6, vence em 05/12.</span></p>'
            '<div class="eventos-dia" style="padding-top:0"><h3>Histórico de cobrança</h3><ol class="eventos">'
            '<li><time>18/11</time><span class="pto forte" aria-hidden="true"></span><div><p><b>Diego Almeida</b> deu baixa sem receber na 3/6, às 11h40</p><small>Renegociada. A régua desta parcela parou.</small></div></li>'
            '<li><time>12/11</time><span class="pto" aria-hidden="true"></span><div><p><b>Diego Almeida</b> falou com Sebastião, às 16h</p><small>Por telefone. Motivo anotado.</small></div></li></ol></div>'), icone='sino')
    else:
        cob = folha_fi('t-cob', 'Cobrança', (
            f'<div class="fi-cob"><dl><div><dt>Motivo do atraso</dt><dd>Sebastião diz que só consegue pagar o resto parcelado<small>anotado por Diego Almeida em 12/11</small></dd></div>'
            f'<div><dt>Próxima ação</dt><dd>Hoje, 18/11: combinar com Sebastião<small>responsável: Diego Almeida</small></dd></div></dl>'
            f'<button class="btn btn-sec" type="button">{ico("lapis")}Anotar cobrança</button></div>'), icone='sino')
    adi = folha_fi('t-reemb', 'Adiantado pelo escritório', (
        f'<ul class="fi-linhas"><li class="fi-linha" style="grid-template-columns:minmax(0,1fr) auto"><div class="fi-quem"><strong>Cópias e autenticações</strong>'
        f'<small>Pagas pelo escritório em 12/10 · comprovante anexado · categoria "Custas adiantadas"</small>'
        f'<p class="fi-prox">{ico("relogio")}Reembolso combinado: <b>junto com a parcela {"5/6, de dezembro" if feita else "3/6, de outubro"}</b></p></div>'
        f'<div class="fi-lado"><span class="fi-v num">{R(86.40)}</span>{selo("atencao", "A reembolsar")}</div></li></ul>'),
        sub='Vira valor a reembolsar pelo cliente, ligado a este contrato.', icone='reenviar')
    h = ficha_ct(SEB, f'Contrato de honorários · {CASO_S}', meta, dir_, parcelas_seb(feita), tot, orig + cob, SUB_PARC, principal=adi)
    # Diego não tem a área Contratos: o "Ver o contrato" da folha não aparece para ele (Financeiro.tsx, verContrato)
    h = troca(h, [(f'<div class="acoes"><a class="btn btn-sec" href="#">{ico("pena")}Ver o contrato</a></div>', '')])
    return colunas_bx(h)


# ---------------------------------------------------------------- a janela "Dar baixa sem receber"
def radios(marcado=None, erro=False, reneg=True):
    ops = [('perdoada', 'Perdoada', 'O escritório decidiu abrir mão deste valor.'),
           ('inadimplencia', 'Inadimplência', 'O cliente não pagou, e o escritório parou de cobrar pelo T3jus.'),
           ('renegociada', 'Renegociada', 'O valor vai entrar em outra combinação com o cliente.')]
    if not reneg:
        ops = ops[:2]
    li = ''
    for i, (v, rot, aj) in enumerate(ops):
        ch = ' checked' if v == marcado else ''
        inv = ' aria-invalid="true"' if erro else ''
        foco = ' data-foco' if erro and i == 0 else ''
        li += (f'<label class="opcao"><input class="marcar" type="radio" name="bx-motivo" id="bx-m-{v}" value="{v}"{ch}{inv}{foco}>'
               f'<span>{rot}<small>{aj}</small></span></label>')
    er = f'<p class="erro-msg" id="bx-motivo-er">{ico("alerta")}Escolha o motivo.</p>' if erro else ''
    desc = ' aria-describedby="bx-motivo-er"' if erro else ''
    return (f'<fieldset class="x-ops bx-motivos"{desc}><legend>Por que a parcela sai de Em atraso sem receber</legend>'
            f'{er}<div class="x-ops-l">{li}</div></fieldset>')


def explicacao(rotulo='Explicação', valor='', erro=False, ex=''):
    inv = ' aria-invalid="true"' if erro else ''
    er = f'<p class="erro-msg" id="bx-expl-er">{ico("alerta")}Escreva a explicação, com pelo menos 3 letras.</p>' if erro else ''
    desc = 'bx-expl-aj' + (' bx-expl-er' if erro else '')
    exs = f' {ex}' if ex else ''
    return (f'<div class="campo"><div class="campo-linha"><label for="bx-expl">{rotulo}</label></div>'
            f'<textarea class="entrada" id="bx-expl" name="bx-expl" maxlength="1000"{inv} aria-describedby="{desc}">{valor}</textarea>'
            f'<p class="ajuda" id="bx-expl-aj">Escreva em uma ou duas frases. Fica no contrato para quem vier depois.{exs}</p>{er}</div>')


def caixa_custas(valor):
    return (f'<label class="opcao bx-custas-cx"><input class="marcar" type="checkbox" name="bx-custas">'
            f'<span>Dar baixa sem receber também no reembolso das custas ({valor})<small>Marque só se o escritório também não vai receber essa despesa de volta. Vale o mesmo motivo e a mesma explicação.</small></span></label>')


def oque(itens):
    return '<ul class="np-oque" aria-label="O que vai acontecer">' + ''.join(f'<li>{ico(i)}<span>{t}</span></li>' for i, t in itens) + '</ul>'


DESC_BX = 'A parcela sai de Em atraso sem que o dinheiro tenha entrado. Fica na tabela do contrato, com o motivo, e dá para desfazer depois.'


def j_baixa(var='vazia', abrir=True):
    """var: vazia, erros, enviando, falha ou conflito (Noemi, Marina)."""
    parc = (f'<dl class="np-parc"><div><dt>Parcela</dt><dd>6/6 · novembro</dd></div><div><dt>Venceu</dt><dd class="num">10/11/2026, há 8 dias</dd></div>'
            f'<div><dt>Falta receber</dt><dd class="num">{R(1000)}</dd></div></dl>'
            f'<p class="bx-de">{NOEMI_N} · {C_N} · {CASO_L}</p>')
    if var == 'conflito':
        topo = aviso('atencao', f'Diego Almeida registrou {R(500)} nesta parcela às 10h13.',
                     'A baixa sem receber não foi feita. Veja como ficou antes de decidir. O que você escreveu não foi salvo.', icone='pessoas', papel='alert')
        corpo = (topo + f'<p class="bx-de">Parcela 6/6 · novembro · {NOEMI_N} · {NW(C_N)}</p>'
                 f'<dl class="np-quem"><dt>Quando você abriu</dt><dd>Faltavam {R(1000)}, em atraso</dd><dt>Quem mudou</dt><dd>Diego Almeida, hoje às 10h13</dd><dt>Como ficou</dt>'
                 f'<dd>Recebido {R(500)} de {R(1000)} · faltam {R(500)}, ainda em atraso</dd></dl>')
        pe = (f'<button class="btn btn-sec" type="button" data-fechar>Fechar</button>'
              f'<button class="btn btn-pri" type="button" data-ir="?estado=bx-ficha" data-foco>{ico("olho")}Ver como ficou</button>')
        return janela('janela-baixa', f'A receber · {C_N}', 'Dar baixa sem receber', 'Nada mudou por aqui. Confira a parcela antes de decidir.', corpo, pe, abrir=abrir).replace('class="janela"', 'class="janela np-janela bx-janela"', 1)
    cheio = var in ('enviando', 'falha')
    topo = ''
    if var == 'erros':
        topo = (f'<div class="aviso aviso-urgencia bx-resumo" role="alert">{ico("alerta")}<div><strong class="aviso-titulo">Faltam 2 coisas para dar baixa sem receber.</strong>'
                f'<p>A parcela continua em atraso.</p><ul><li><a href="#bx-m-perdoada">Escolha o motivo.</a></li>'
                f'<li><a href="#bx-expl">Escreva a explicação, com pelo menos 3 letras.</a></li></ul></div></div>')
    if var == 'falha':
        topo = aviso('urgencia', 'Não deu para dar baixa sem receber.',
                     'Nada mudou: a parcela continua em atraso. O que você escreveu continua aqui. Tente de novo. Se continuar, mande o código PTL-7B31-2204 ao suporte.')
    cob = (f'<p class="bx-cob">{ico("sino")}<span><b>Última cobrança:</b> Diego Almeida anotou em 13/11: <q>Noemi disse que não vai pagar porque perdeu a ação.</q> '
           f'Próxima ação: falar com Marina, hoje.</span></p>')
    lista = oque([('seta', 'Sai de <b>Em atraso</b> e de A receber.'),
                  ('moeda', 'Não conta como recebido no caixa nem nos relatórios.'),
                  ('sino', 'A régua de cobrança desta parcela para, sem mandar mais nada.'),
                  ('cadeado', f'O caso {CASO_L} deixa de esperar por ela. As custas continuam segurando o caso, a não ser que tenham baixa junto (no fim desta janela).')])
    custas = f'<p class="bx-custas">{ico("reenviar")}<span>As custas de {R(412.30)} ficam a reembolsar, em A pagar: não há outra parcela de Noemi para elas irem junto.</span></p>'
    rot = 'O que aconteceu' if cheio else 'Explicação'
    corpo = (topo + parc + cob + lista + custas
             + radios('inadimplencia' if cheio else None, erro=var == 'erros')
             + explicacao(rot, EXPL_N if cheio else '', erro=var == 'erros')
             + caixa_custas(R(412.30)))
    nota = ''
    if var == 'enviando':
        bot = (f'<button class="btn btn-pri" type="button" aria-busy="true" data-foco>Dando baixa sem receber…</button>'
               '<p class="sr" role="status">Dando baixa sem receber na parcela 6/6.</p>')
    elif var == 'falha':
        bot = f'<button class="btn btn-pri" type="button" data-ir="?estado=bx-enviando" data-foco>{ico("reenviar")}Tentar de novo</button>'
    else:
        prox = 'bx-erros' if var == 'vazia' else 'bx-enviando'
        bot = f'<button class="btn btn-pri" type="button" data-ir="?estado={prox}">{ico("check")}Dar baixa sem receber na parcela 6/6</button>'
    pe = f'{nota}<button class="btn btn-sec" type="button" data-fechar>Voltar</button>{bot}'
    h = janela('janela-baixa', f'A receber · {C_N}', 'Dar baixa sem receber', DESC_BX, corpo, pe, abrir=abrir)
    h = h.replace('class="janela"', 'class="janela np-janela bx-janela"', 1)
    if var == 'vazia':
        h = h.replace('id="bx-m-perdoada" value="perdoada"', 'id="bx-m-perdoada" value="perdoada" data-foco', 1)
    return h


def j_baixa_reneg(abrir=True):
    parc = (f'<dl class="np-parc"><div><dt>Parcela</dt><dd>3/6 · outubro</dd></div><div><dt>Venceu</dt><dd class="num">05/10/2026, há 44 dias</dd></div>'
            f'<div><dt>Falta receber</dt><dd class="num">{R(500)}</dd></div></dl>'
            f'<p class="bx-parcial">{ico("check")}<span>Recebido {R(400)} de {R(900)}. A baixa é só dos {R(500)} que faltam.</span></p>'
            f'<p class="bx-de">{SEB} · {C_S} · {CASO_S}</p>')
    cob = (f'<p class="bx-cob">{ico("sino")}<span><b>Última cobrança:</b> Diego Almeida anotou em 12/11: <q>Sebastião diz que só consegue pagar o resto parcelado.</q> '
           f'Próxima ação: combinar com Sebastião, hoje.</span></p>')
    lista = oque([('seta', 'Sai de <b>Em atraso</b> e de A receber.'),
                  ('moeda', 'Não conta como recebido no caixa nem nos relatórios.'),
                  ('sino', 'A régua de cobrança desta parcela para, sem mandar mais nada.'),
                  ('check', f'O que já entrou continua recebido, com o recibo 2026-061.')])
    custas = f'<p class="bx-custas">{ico("reenviar")}<span>As custas de {R(86.40)} passam a ir junto com a mensalidade de dezembro.</span></p>'
    quem = (f'<p class="bx-quem">{ico("pena")}<span><b>A nova cobrança é uma condição nova do contrato.</b> Quem muda as condições é a área Contratos (Marina e Felipe). '
            'Eles recebem um aviso com o que foi combinado.</span></p>')
    corpo = (parc + cob + lista + custas + radios('renegociada')
             + explicacao('O que foi combinado', COMB_S, ex='Marina e Felipe vão ler este texto no aviso de Contratos: escreva só o que foi combinado. Por exemplo: “Parcelado: 2 × R$\u00a0250,00, em dezembro e janeiro”.')
             + quem)
    pe = (f'<button class="btn btn-sec" type="button" data-fechar>Voltar</button>'
          f'<button class="btn btn-pri" type="button" data-ir="?estado=bx-desfazer-renegociada">{ico("check")}Dar baixa sem receber na parcela 3/6</button>')
    h = janela('janela-baixa', f'A receber · {C_S}', 'Dar baixa sem receber', DESC_BX, corpo, pe, abrir=abrir)
    return h.replace('class="janela"', 'class="janela np-janela bx-janela"', 1).replace('id="bx-expl" name="bx-expl"', 'id="bx-expl" name="bx-expl" data-foco', 1)


# ---------------------------------------------------------------- desfazer
def j_desfazer(var='noemi', abrir=True):
    if var == 'reneg':
        feito = (f'<dl class="np-quem"><dt>Parcela</dt><dd>3/6 · outubro · {R(500)} com baixa sem receber (recebido {R(400)} de {R(900)})</dd>'
                 f'<dt>Motivo</dt><dd>Renegociada · por Diego Almeida, hoje às 11h40</dd>'
                 f'<dt>O que foi combinado</dt><dd><q>{COMB_S}</q></dd></dl>')
        desc = f'A parcela 3/6 volta para Em atraso, com {R(500)} a receber. Marina Ribeiro, que cuida do contrato, fica com a próxima ação: falar com Sebastião amanhã. A baixa sem receber continua no histórico.'
        avisos = (aviso('atencao', 'Se o combinado já virou parcelas novas em Contratos, desfazer cobra o valor duas vezes.',
                        'Confira as condições do contrato antes.', icone='alerta')
                  + f'<p class="bx-custas">{ico("reenviar")}<span>As custas de {R(86.40)} voltam a ir junto com esta parcela.</span></p>')
        lista = oque([('seta', f'Volta para <b>Em atraso</b>, com {R(500)} a receber. O recebido de {R(400)} não muda.'),
                      ('pessoa-mais', 'Entra uma anotação de cobrança, “Baixa desfeita”, e a próxima ação: falar com Sebastião amanhã, com Marina Ribeiro, que cuida do contrato.'),
                      ('sino', 'A régua volta a valer só daqui para a frente: não manda de uma vez o que venceu durante a baixa.'),
                      ('historico', 'A baixa sem receber e o desfazer ficam no histórico, cada um com quem, quando e por quê.')])
        ctr, nome, n = C_S, 'Sebastião', '3/6'
        ex_desf = 'Sebastião desistiu do parcelamento e vai pagar o saldo de uma vez'
    else:
        expl = EXPL_N
        custas_junto = var == 'encerrado'
        feito = (f'<dl class="np-quem"><dt>Parcela</dt><dd>6/6 · novembro · {R(1000)}' + (f' e o reembolso das custas, {R(412.30)}' if custas_junto else '') + '</dd>'
                 f'<dt>Motivo</dt><dd>Inadimplência · por Marina Ribeiro, hoje às 10h14</dd>'
                 f'<dt>Explicação</dt><dd><q>{expl}</q></dd></dl>')
        desc = f'A parcela 6/6 volta para Em atraso, com {R(1000)} a receber. Você fica com a próxima ação: falar com Noemi amanhã. A baixa sem receber continua no histórico.'
        if custas_junto:
            avisos = (aviso('info', f'O caso {CASO_L} continua encerrado no financeiro desde 18/11.',
                            'A parcela volta para A receber deste contrato. O encerramento é o registro de um momento e não é reaberto.', icone='cadeado')
                      + f'<p class="bx-custas">{ico("reenviar")}<span>A baixa do reembolso das custas, de {R(412.30)}, também se desfaz: elas voltam a ir junto com esta parcela.</span></p>')
        else:
            avisos = f'<p class="bx-custas">{ico("reenviar")}<span>As custas de {R(412.30)} voltam a ir junto com esta parcela.</span></p>'
        lista = oque([('seta', f'Volta para <b>Em atraso</b>, com {R(1000)} a receber.'),
                      ('pessoa-mais', 'Entra uma anotação de cobrança, “Baixa desfeita”, e a próxima ação: falar com Noemi amanhã, com você. Felipe Matos cuida do contrato, mas não tem a área Financeiro.'),
                      ('sino', 'A régua volta a valer só daqui para a frente: não manda de uma vez o que venceu durante a baixa.'),
                      ('historico', 'A baixa sem receber e o desfazer ficam no histórico, cada um com quem, quando e por quê.')])
        ctr, nome, n = C_N, 'Noemi', '6/6'
        ex_desf = 'Noemi ligou e prometeu pagar em dezembro'
    campo = (f'<div class="campo"><div class="campo-linha"><label for="bx-desf">Por que desfazer</label></div>'
             f'<textarea class="entrada" id="bx-desf" name="bx-desf" maxlength="1000" aria-describedby="bx-desf-aj" data-foco></textarea>'
             f'<p class="ajuda" id="bx-desf-aj">Por exemplo: “{ex_desf}”. Fica no contrato, ao lado da baixa.</p></div>')
    corpo = feito + avisos + lista + campo
    prox = '?estado=bx-desfeita' if var == 'noemi' else '?estado=bx-parcial'
    pe = (f'<button class="btn btn-sec" type="button" data-fechar>Voltar</button>'
          f'<button class="btn btn-pri" type="button" data-ir="{prox}">{ico("desfazer")}Desfazer a baixa sem receber</button>')
    h = janela('janela-desfazer', f'A receber · {ctr}', 'Desfazer a baixa sem receber', desc, corpo, pe, abrir=abrir)
    return h.replace('class="janela"', 'class="janela np-janela bx-janela"', 1)


# ---------------------------------------------------------------- a janela de pendência do fechamento (texto novo)
AJUDA_NOVA = ('Registre o que falta e o caso fica pronto para encerrar. Se Noemi não vai pagar, você pode dar baixa na parcela sem receber, com o motivo. '
              'Ela sai de Em atraso, fica no contrato, e o caso deixa de esperar por ela. As custas de R$\u00a0412,30 saem junto só se você marcar isso na mesma janela.')
ATALHO_BX = '<button class="btn btn-sec" type="button" data-janela="janela-baixa" data-fechar>Dar baixa sem receber</button>'


def j_bloq_bx(abrir=True):
    h = j_bloqueado(LINHAS_BLOQ, R(1412.30), ATALHO_BX + ATALHO_REG, abrir=abrir)
    return troca(h, [('Registre o que falta e o caso fica pronto para encerrar. Se Noemi não vai pagar, ainda não dá para dar baixa na parcela sem receber: '
                      'anote a cobrança, e o caso segue “acerto pendente” até a parcela ser paga.', AJUDA_NOVA),
                     ('O financeiro do caso só encerra com tudo recebido.', 'O financeiro do caso só encerra com tudo recebido ou baixado com motivo.')])


def j_fechar_bx(abrir=True):
    h = j_fechar_l(abrir=abrir)
    return troca(h, [(f'<dt>Recebido no caso</dt><dd>{R(7500)} · 2 contratos</dd>', f'<dt>Recebido no caso</dt><dd>{R(6500)} · 2 contratos</dd>'),
                     (f'<dt>Reembolsado</dt><dd>{R(412.30)} · custas</dd>',
                      f'<dt>Baixado sem receber</dt><dd>{R(1000)} · parcela 6/6 de Noemi, inadimplência</dd>'
                      f'<dt>Reembolsado</dt><dd>{R(0)} · as custas de {R(412.30)} tiveram baixa sem receber</dd>'),
                     ('Tudo foi recebido.', 'Tudo foi recebido ou baixado com motivo.')])


# ---------------------------------------------------------------- Contratos › C-2026-012 › Recebimentos
def ficha_contratos(fin=True):
    linhas = ''
    for i, m in enumerate(['06', '07', '08', '09', '10']):
        sit = f'<td data-r="Situação"><span class="selo selo-ok">{ico("check")}Pago em 10/{m}</span></td>' if fin else ''
        linhas += (f'<tr><td data-r=""><b class="num">10/{m}/2026</b></td><td data-r="O quê">Parcela {i + 1} de 6</td>'
                   f'<td data-r="Condição"><span class="hn-selo">{ico("agenda")}Parcelado</span></td><td data-r="Valor"><span class="num hn-valor-c">{R(1000)}</span></td>{sit}</tr>')
    if fin:
        o6 = (f'<span class="np-o">Parcela 6 de 6<small>Inadimplência · por Marina Ribeiro em 18/11</small>'
              f'<small class="bx-expl"><q>{EXPL_N}</q></small></span>')
        sit6 = f'<td data-r="Situação">{selo("neutro", "Baixa sem receber")}</td>'
    else:
        o6 = '<span class="np-o">Parcela 6 de 6<small>Fora da cobrança, por decisão do Financeiro.</small></span>'
        sit6 = ''
    linhas += (f'<tr><td data-r=""><b class="num">10/11/2026</b></td><td data-r="O quê">{o6}</td>'
               f'<td data-r="Condição"><span class="hn-selo">{ico("agenda")}Parcelado</span></td><td data-r="Valor"><span class="num hn-valor-c">{R(1000)}</span></td>{sit6}</tr>')
    if fin:
        col = '<col style="width:14%"><col style="width:36%"><col style="width:16%"><col style="width:15%"><col style="width:19%">'
        th = '<th scope="col">Situação</th>'
        tot = (f'<div><p>Recebido até hoje</p><p class="hn-res-grande num">{R(5000)}</p></div>'
               f'<div><p>Programado até 10/11/2026</p><p class="hn-res-grande num">{R(6000)}</p><p class="pg-tot">Parcelado · 6 recebimentos programados · 1 com baixa sem receber</p></div>')
        pe = f'<p class="hn-pe">{ico("carteira")}<span>É a mesma programação que o Financeiro vê em A receber. Pagamentos, atrasos e baixas sem receber são registrados lá.</span></p>'
        dir_ = (f'<section class="dir campo-ambar" aria-labelledby="t-pr"><p class="sobretitulo" id="t-pr">Próximo recebimento</p><div class="hn-dir-linha"><p class="grande">Nenhum</p>'
                f'{selo("ok", "Nada em aberto", "check")}</div><p class="hn-oque"><b>Parcela 6 de 6: baixa sem receber em 18/11</b><br>no Financeiro, em A receber</p>'
                f'<a class="btn btn-pri" href="?estado=bx-feita">{ico("carteira")}Ver no Financeiro</a></section>')
    else:
        col = '<col style="width:16%"><col style="width:44%"><col style="width:20%"><col style="width:20%">'
        th = ''
        tot = (f'<div><p>Programado até 10/11/2026</p><p class="hn-res-grande num">{R(6000)}</p><p class="pg-tot">Parcelado · 6 recebimentos programados</p></div>')
        pe = (f'<p class="hn-pe">{ico("cadeado")}<span>Se cada recebimento foi pago ou está em atraso fica no Financeiro, que não está liberado para você. '
              'Quem libera é Marina Ribeiro, a sócia dona.</span></p>')
        dir_ = (f'<section class="dir campo-ambar" aria-labelledby="t-pr"><p class="sobretitulo" id="t-pr">Próximo recebimento</p><div class="hn-dir-linha"><p class="grande">Nenhum</p></div><p class="hn-oque"><b>As 6 parcelas já venceram.</b><br>O acerto do caso {CASO_L} está com o Financeiro.</p></section>')
    tot += '<div><p>Depende do caso</p><p class="hn-res-grande">Êxito</p><p class="pg-tot">20%, sobre base zero: o caso terminou com perda</p></div>'
    return (f'<div class="hn"><div class="ficha-cab"><div class="esq campo-vinho">{ico("pena", "ico estatua")}<a class="voltar" href="#">{ico("esq", "ico ico-s")}Contratos</a>'
            f'<div class="ident"><div><p class="sobretitulo">Contrato {C_N}</p><h1>{NOEMI_N}</h1><p class="meta"><span class="selo selo-ativo">Ativo</span><span>{CASO_L}</span></p></div></div></div>{dir_}</div>'
            f'<nav class="abas" aria-label="Seções do contrato"><a data-aba="contrato" href="#">Contrato</a><a data-aba="recebimentos" href="#">Recebimentos<span class="q">6</span></a>'
            f'<a data-aba="documentos" href="#">Documentos<span class="q">2</span></a></nav>'
            f'<section class="folha" aria-labelledby="t-rc" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-rc">Programação dos recebimentos</h2>'
            f'<p class="sub">Gerada das condições do contrato. 6 parcelas de {R(1000)}, todo dia 10, de junho a novembro.</p></div></div>'
            f'<div class="ct-totais">{tot}</div><table class="hn-tab "><caption class="sr">Programação dos recebimentos</caption><colgroup>{col}</colgroup>'
            f'<thead><tr><th scope="col">Vencimento</th><th scope="col">O quê</th><th scope="col">Condição</th><th scope="col">Valor</th>{th}</tr></thead>'
            f'<tbody>{linhas}</tbody></table>{pe}</section></div>')


# ---------------------------------------------------------------- o sino
def sino(itens_html, conta, novos):
    h = sem_links(_TSI)
    h = re.sub(r'<div class="si-lista">.*?</div><p class="si-pe">', f'<div class="si-lista">{itens_html}</div><p class="si-pe">', h, count=1, flags=re.S)
    h = re.sub(r'<p class="si-conta">.*?</p>', f'<p class="si-conta">{conta}</p>', h, count=1, flags=re.S)
    h = h.replace('<button type="button" aria-pressed="false">Não lidos <span class="q">2</span></button>',
                  f'<button type="button" aria-pressed="false">Não lidos <span class="q">{novos}</span></button>')
    assert 'bx-si' in h
    return h


def si_item(ico_, titulo, det, selo_, hora, onde, href, novo=True, sr_extra=''):
    nv = '<span class="si-nv">Novo</span>' if novo else ''
    return (f'<li class="si-item{" si-novo" if novo else ""} bx-si"><span class="si-ico" aria-hidden="true">{ico(ico_)}</span><div>'
            f'<p class="si-tit"><a class="si-link" href="{href}">{"<span class=\"sr\">Novo: </span>" if novo else ""}{titulo}{sr_extra}</a></p>'
            f'<p class="si-det">{det}</p><p class="si-meta">{nv}{selo_}<time>{hora}</time><span class="si-onde">{onde}{ico("dir")}</span></p></div>'
            f'<span class="{"si-pto" if novo else ""}" aria-hidden="true"></span></li>')


SINO_DIEGO = sino(
    '<h3 class="si-dia">Hoje</h3><ul class="si-ul">'
    + si_item('cadeado', f'O caso <b>{CASO_L}</b> ficou pronto para encerrar no financeiro',
              'Marina Ribeiro deu baixa sem receber na parcela 6/6, e nada falta receber de Noemi Bastos Carvalho. Confira o acerto e encerre.',
              '<span class="selo selo-ok">Pronto</span>', '10h14', f'Ver o acerto no {C_N}', '?estado=bx-pronto#t-fecha')
    + '</ul><h3 class="si-dia">Ontem · 17/11</h3><ul class="si-ul">'
    + si_item('cadeado', 'O caso <b>Dias x Seguradora Norte</b> ficou pronto para encerrar no financeiro',
              'Nada falta receber de Paulo Henrique Dias. Confira o acerto e encerre.', '<span class="selo selo-ok">Pronto</span>', '7h00', 'Ver o acerto no C-2026-006', '#', novo=False)
    + '</ul>', '<b>1 novo</b> · 2 nos últimos 30 dias', 1)
SINO_FELIPE = sino(
    '<h3 class="si-dia">Hoje</h3><ul class="si-ul">'
    + si_item('pena', f'Condição nova a registrar no <b>{NW(C_S)}</b>, de {SEB}',
              f'Diego Almeida combinou uma condição nova com {SEB}: <q>{COMB_S}</q> Mude as condições do {NW(C_S)}.',
              '<span class="selo selo-atencao">Mudar as condições</span>', '11h40', f'Abrir o {NW(C_S)} em Contratos', '#')
    + '</ul>', '<b>1 novo</b> · 1 nos últimos 30 dias', 1)


# ====================================================================================== estados
FIN = dict(area='financeiro', secao='A receber', atual='financeiro', trilha=f'Financeiro|A receber|{NOEMI_N}', titulo=NOEMI_N)
FIN_S = dict(area='financeiro', secao='A receber', atual='financeiro', trilha=f'Financeiro|A receber|{SEB}', titulo=SEB, quem='diego')
FICHA_N = ficha_bx('aberta')
JAN_FECHO = j_bloq_bx(abrir=False) + j_registrar_noemi()

add('bx-ficha', FICHA_N + j_baixa('vazia', abrir=False) + JAN_FECHO,
    'Contrato de Noemi: “Dar baixa sem receber” na parcela vencida', **FIN)
add('bx-parcial', ficha_seb() + j_baixa_reneg(abrir=False), 'Sebastião: a parcela paga em parte, antes da baixa', **FIN_S)
add('bx-janela', FICHA_N + j_baixa('vazia') + JAN_FECHO, 'A janela: o que vai acontecer, o motivo e a explicação', **FIN)
add('bx-erros', FICHA_N + j_baixa('erros') + JAN_FECHO, 'Sem motivo e sem explicação: os erros', **FIN)
add('bx-enviando', FICHA_N + j_baixa('enviando') + JAN_FECHO, 'Enviando: “Dando baixa sem receber…”', **FIN)
add('bx-renegociada', ficha_seb() + j_baixa_reneg(), 'Diego: renegociada, com o que foi combinado', **FIN_S)
add('bx-falha', FICHA_N + j_baixa('falha') + JAN_FECHO, 'Falha do servidor: nada mudou', **FIN)
add('bx-conflito', FICHA_N + j_baixa('conflito') + JAN_FECHO, 'Diego registrou um recebimento com a janela aberta', **FIN)
add('bx-feita', ficha_bx('feita') + j_desfazer('noemi', abrir=False) + j_bloqueado(
    [li_falta(f'<b>Custas · {R(412.30)} · a reembolsar</b>', 'adiantadas pelo escritório em 06/2026 · sem parcela de Noemi para ir junto')], R(412.30),
    f'<a class="btn btn-pri" href="#">{ico("carteira")}Ver em A pagar</a>', abrir=False).replace(
    'Registre o que falta e o caso fica pronto para encerrar. Se Noemi não vai pagar, ainda não dá para dar baixa na parcela sem receber: anote a cobrança, e o caso segue “acerto pendente” até a parcela ser paga.',
    'Registre o reembolso em A pagar quando Noemi pagar as custas.')
    + bx_toast('A parcela 6/6 de Noemi saiu de Em atraso sem receber.', f'As custas de {R(412.30)} ficaram a reembolsar, em A pagar. Dá para desfazer na linha da parcela.'),
    'Depois da baixa: a linha, o quinto número e as custas que faltam', **FIN)
add('bx-pronto', ficha_bx('pronto') + j_fechar_bx(abrir=False) + j_desfazer('noemi', abrir=False)
    + bx_toast('A parcela 6/6 de Noemi saiu de Em atraso sem receber.', f'O caso {CASO_L} já pode ser encerrado no financeiro.',
               f'<a class="btn btn-sec" href="#t-fecha">{ico("cadeado")}Ver o fechamento</a>'),
    'Com as custas junto: o caso fica pronto para encerrar', **FIN)
add('bx-encerrar', ficha_bx('pronto') + j_fechar_bx(), 'Encerrar: recebido no caso e baixado sem receber', **FIN)
add('bx-pendencia', FICHA_N + j_bloq_bx() + j_baixa('vazia', abrir=False) + j_registrar_noemi(),
    '“Ainda não dá para encerrar”: o texto novo e o atalho', **FIN)
add('bx-desfazer', ficha_bx('feita') + j_desfazer('noemi'), 'Desfazer a baixa sem receber: quem, quando e a próxima ação', **FIN)
add('bx-desfazer-renegociada', ficha_seb(feita=True) + j_desfazer('reneg'), 'Desfazer a renegociada: o aviso da cobrança em dobro', **FIN_S)
add('bx-desfazer-encerrado', ficha_bx('encerrado') + j_desfazer('encerrado'), 'Desfazer com o caso já encerrado no financeiro', **FIN)
add('bx-desfeita', ficha_bx('desfeita') + j_baixa('vazia', abrir=False) + JAN_FECHO
    + bx_toast('A parcela 6/6 voltou para Em atraso.', 'A próxima ação é falar com Noemi amanhã, com você.',
               f'<button class="btn btn-sec" type="button" data-janela="janela-registrar">{ico("moeda")}Registrar recebimento</button>'),
    'Desfeita: a parcela volta para Em atraso, com a próxima ação', **FIN)
CT = dict(area='contratos', secao='Contratos', atual='contratos', trilha=f'Contratos|{C_N}', titulo=C_N, aba='recebimentos')
add('bx-contratos', ficha_contratos(), 'Contratos › Recebimentos: o selo, com o motivo', **CT)
add('bx-sem-financeiro', ficha_contratos(fin=False), 'Felipe (sem Financeiro): a linha neutra, sem o motivo', quem='felipe', **CT)
add('bx-sino', SINO_DIEGO, 'Sino do Diego: o caso ficou pronto pela baixa', quem='diego', novos=1, atual='clientes', trilha='Clientes', titulo='Clientes')
add('bx-sino-contratos', SINO_FELIPE, 'Sino do Felipe: a condição nova a registrar (pergunta 3)', quem='felipe', novos=1, atual='clientes', trilha='Clientes', titulo='Clientes')

# ====================================================================================== CSS das peças novas
CSS_BX = r"""
/* ==========================================================================
   Portal · baixa de parcela sem receber (prefixo bx-). Só tokens e pares já aprovados.
   ========================================================================== */
.bx-acoes{display:grid;gap:8px;justify-items:start}
.bx-acoes .fi-docs{margin:0}
.bx-acao{min-height:44px;padding:6px 10px;gap:6px;font-size:13px;line-height:1.3;text-align:left;white-space:nowrap;max-width:100%}
.bx-acao .ico{width:16px;height:16px;flex:none}
/* Enquanto o F3.165 não sai, a ação nova tem 44 px mas fica mais leve que "Registrar": sem fundo e sem ícone de dinheiro */
.bx-leve{background:transparent;font-weight:500}
/* "Desfazer a baixa sem receber" não cabe numa linha na coluna; quebra em duas, alinhado à esquerda */
.fi-tab .bx-acao[aria-describedby]{white-space:normal;text-align:left;line-height:1.3;max-width:100%}
.bx-nw{white-space:nowrap}
.bx-apoio{display:block;font-family:var(--sans,inherit);font-size:12px;color:var(--texto-2)}
/* A linha de detalhe da parcela baixada: da coluna Situação até o fim */
.fi-tab tr.bx-det td{background:var(--papel);padding-top:0;border-top:0}
.fi-tab tr.bx-det td:first-child{box-shadow:inset 3px 0 0 var(--vinho-4)}
.fi-tab tr.bx-baixada td{border-bottom:0}
.bx-det-c{display:grid;gap:2px;max-width:560px}
.fi-sit .bx-det-c{margin-top:6px}
.fi-tab td[data-r="Valor"]{padding-left:14px}
.fi-tab tr.bx-baixada td{background:var(--papel)}
.fi-tab tr.bx-baixada td:first-child{box-shadow:inset 3px 0 0 var(--vinho-4)}
.bx-nota{color:var(--texto-2)}
.bx-expl{margin:4px 0 0;font-size:13px;line-height:1.45}
.bx-expl q{font-family:var(--serifa);font-style:italic;font-size:15px;color:var(--texto)}
.fi-quatro .bx-baixado{grid-column:1/-1;border-left:0;border-top:1px solid var(--divisor);background:var(--sal-2)}
.fi-quatro .bx-baixado dd small{display:block;font-family:var(--sans,inherit);font-size:12px;color:var(--texto-2)}
.bx-cob-vazia{display:flex;gap:10px;align-items:flex-start;margin:0 24px 14px;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.5}
.bx-cob-vazia .ico{width:16px;height:16px;flex:none;margin-top:2px;color:var(--vinho)}
.bx-cob-vazia b{font-weight:500}
.bx-de{margin:-6px 0 0;font-size:12px;color:var(--texto-2)}
.bx-cob,.bx-custas,.bx-quem,.bx-parcial{display:flex;gap:10px;align-items:flex-start;margin:0;font-size:13px;line-height:1.5}
.bx-cob .ico,.bx-custas .ico,.bx-quem .ico,.bx-parcial .ico{width:16px;height:16px;flex:none;margin-top:2px;color:var(--vinho)}
.bx-cob q,.np-quem q{font-family:var(--serifa);font-style:italic;font-size:15px}
.bx-custas{padding:10px 14px;border-radius:var(--raio);border:1px solid var(--borda-folha)}
.bx-quem{padding:10px 14px;border-radius:var(--raio);background:var(--sal-2)}
.bx-quem b,.bx-parcial span{font-weight:500}
.bx-parcial{padding:10px 14px;border-radius:var(--raio);background:var(--ambar-3);color:var(--tinta)}
.bx-motivos .x-ops-l{grid-template-columns:1fr}
.bx-motivos .erro-msg{margin-top:8px}
.bx-custas-cx{border:1px solid var(--borda-folha);border-radius:var(--raio);padding:10px 12px;margin:0}
.bx-resumo ul{margin:6px 0 0;padding-left:18px}
.bx-resumo a{display:inline-flex;align-items:center;min-height:44px;color:var(--vinho);font-weight:500}
/* No pé da janela, a nota fica numa linha própria, e os dois botões cabem lado a lado */
.bx-janela .janela-pe{flex-wrap:wrap}
.bx-janela .janela-pe .btn[aria-busy="true"]{min-width:220px;justify-content:center}
.bx-ano{display:block;font-size:12px;color:var(--texto-2)}
.hn-tab .bx-expl{display:block;margin-top:4px}
@media (max-width:760px){
  .bx-acoes{justify-items:stretch;width:100%}
  .c-acoes .bx-acoes .btn{width:100%;justify-content:center}
  .bx-acao{text-align:center;white-space:normal}
  .bx-cob-vazia{margin:0 16px 12px}
  /* O pé da janela fica igual em todos os estados: os botões empilhados, na largura toda */
  .bx-janela .janela-pe{display:grid;grid-template-columns:minmax(0,1fr);gap:8px}
  .bx-janela .janela-pe .btn{width:100%;justify-content:center}
  .fi-quatro:has(.bx-baixado){margin-bottom:16px}
  /* O aviso de confirmação fica preso no pé: o que recebe o foco nunca fica por baixo dele (2.4.11) */
  html:has(.toast){scroll-padding-bottom:300px}
}
"""

# ====================================================================================== página
GRUPOS = [
    ('1. A ação na ficha do contrato', ['bx-ficha', 'bx-parcial']),
    ('2. A janela “Dar baixa sem receber”', ['bx-janela', 'bx-erros', 'bx-enviando', 'bx-renegociada', 'bx-falha', 'bx-conflito']),
    ('3. Depois da baixa e o fechamento', ['bx-feita', 'bx-pronto', 'bx-encerrar', 'bx-pendencia']),
    ('4. Desfazer a baixa sem receber', ['bx-desfazer', 'bx-desfazer-renegociada', 'bx-desfazer-encerrado', 'bx-desfeita']),
    ('5. Em Contratos', ['bx-contratos', 'bx-sem-financeiro']),
    ('6. Avisos no sino', ['bx-sino', 'bx-sino-contratos']),
]
ROT = dict(EST)
assert len(EST) == 20
assert sorted(sum((g[1] for g in GRUPOS), [])) == sorted(ROT), set(ROT) ^ set(sum((g[1] for g in GRUPOS), []))
nav = ''.join(f'<p>{g}</p>' + ''.join(f'<a href="?estado={e}">{ROT[e]}</a>' for e in es) for g, es in GRUPOS)
NAV = (f'<details id="fl-estados"><summary>{ico("menu")}<span class="sr">Estados desenhados: </span><b>Estados</b></summary>'
       f'<nav class="fl-lista" aria-label="Estados desenhados">{nav}</nav></details>')

out = pagina('Baixa sem receber', 'Portal: dar baixa sem receber numa parcela vencida, com motivo, na ficha do contrato do Financeiro (FI-24, FI-08, EX-16).',
             '{"estado":"bx-ficha","atual":"financeiro"}', '', T, ''.join(BARRAS.values()))
out = out.replace('</style>', CSS_CL + '\n' + J['CSS_JU'] + '\n' + CSS_FL + '\n' + CSS_EXTRA + '\n' + CSS_JF + '\n' + CSS_EX + '\n' + CSS_FS
                  + '\n' + CSS_NP + '\n' + CSS_SI + '\n' + CSS_BX + '\n</style>', 1)
out = out.replace('<script>\n(function(){', NAV + '\n<script>\n(function(){', 1)
# Chegando por "#t-fecha", o foco vai ao título da folha (como no aprovado). Sem janela aberta, o foco vai aonde a ação deixou
# a pessoa: o botão "Desfazer a baixa" depois da baixa e o "Dar baixa sem receber" depois do desfazer (decisões 15 e 17).
out = out.replace("  if(q.get('mais')){",
                  "  if(location.hash){ var alvo=document.getElementById(location.hash.slice(1)); if(alvo&&alvo.hasAttribute('tabindex')){ alvo.focus(); alvo.scrollIntoView() } }\n"
                  "  var fi=document.querySelector('#miolo [data-foco-inicial]'); if(fi&&!location.hash&&!document.querySelector('dialog[data-abrir]')){ var vis=[].filter.call(document.querySelectorAll('#miolo [data-foco-inicial]'),function(e){return e.offsetParent})[0]; (vis||fi).focus({preventScroll:true}) }\n"
                  "  if(q.get('mais')){", 1)
assert "data-foco-inicial" in out
out = out.replace("    if(e.target.closest('a[href=\"#\"]')) e.preventDefault();",
                  "    if(e.target.closest('a[href=\"#\"]')) e.preventDefault();\n    var ir=e.target.closest('[data-ir]'); if(ir){ location.href=ir.dataset.ir }", 1)
assert 'data-ir' in out
out = out.replace('</body>', SCRIPT_SI + '\n</body>', 1)
os.makedirs(SAIDA, exist_ok=True)
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(out)
json.dump([{'nome': e, 'url': f'index.html?estado={e}', 'rotulo': r} for e, r in EST],
          open(os.path.join(AQUI, 'casos.json'), 'w'), ensure_ascii=False, indent=1)
print('baixa ok', len(EST), 'estados,', len(out) // 1024, 'KB')
