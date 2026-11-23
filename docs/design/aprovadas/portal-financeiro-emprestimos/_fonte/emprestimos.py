# Portal · Financeiro · Empréstimos (F3.51 · FI-20). Desenho para a Carol aprovar.
# Parte das telas aprovadas: importa financeiro_pend.py (Caixa com saldo de abertura e contador, F3.50),
# que importa financeiro.py (Financeiro aprovado em 19/11/2026), os dois copiados sem mudança.
# Pega a página pronta (moldura, CSS, ícones e script), tira os estados antigos e põe os estados novos.
# Peças novas com o prefixo em-. Regra visual: empréstimo fica à parte, mas não é de terceiros,
# então nunca usa o âmbar (reservado aos valores de terceiros): é sempre areia (sal-2) e vinho.
# Uso: python3 emprestimos.py <pasta-saida>
import sys, os, re
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
sys.argv = [sys.argv[0], SAIDA]
import financeiro_pend as FP
F = FP.F
from comum import tpl, janela, aviso, toast, ico, estado
from pend import Rc, resumo_erros, falha, radio, caixa_sel, texto_area, campo_erro_fs, injetar

os.remove(os.path.join(SAIDA, 'financeiro.html'))  # o financeiro_pend.py grava a página dele; aqui só vale a nova

H = F.H
R, folha, selo, campo, selecao, anexo, cab_secao = F.R, F.folha, F.selo, F.campo, F.selecao, F.anexo, F.cab_secao
ARQ = 'emprestimos.html?estado='
HOJE = '18/11/2026'


def A(secao, titulo=None, trilha=None, **kw):
    d = dict(area='financeiro', secao=secao, atual='financeiro', trilha=trilha or f'Financeiro|{secao}', titulo=titulo or secao)
    d.update(kw)
    return d


def larga(j):
    return j.replace('class="janela"', 'class="janela fi-larga"', 1)


def sem_foco(s):
    return s.replace(' data-foco', '')


def campo_e(id_, rot, valor='', ajuda='', erro='', im='', foco=False, opc=False):
    """O campo aprovado, com o foco no próprio input quando há erro."""
    c = campo(id_, rot, valor, ajuda=ajuda, erro=erro, im=im, opc=opc)
    if foco:
        c = c.replace('<input', '<input data-foco', 1)
    return c


MESES_NOME = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
MESES_AB = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']


def mais_meses(ano, mes, n):
    t = ano * 12 + (mes - 1) + n
    return t // 12, t % 12 + 1


def venc(e, n):
    """Vencimento da parcela n (dia fixo; o mês conta da primeira parcela)."""
    a, m = mais_meses(e['p1'][0], e['p1'][1], n - 1)
    return f'{e["dia"]:02d}/{m:02d}/{a}', a, m


# ================================================================= os empréstimos do escritório (dados fictícios)
# Hoje é 18/11/2026. O saldo de abertura é de 31/08/2026: o que entrou antes dele já está nele.
EMP = {
    'bb': dict(id='bb', tipo='Banco', nome='Banco do Brasil', para='Pronampe · capital de giro', valor=60000, contrato=61450,
               entrou='15/04/2025', forma='Transferência', antigo=True, modo='PARCELAS', total=40, antes=16, parcela=2090,
               dia=20, p1=(2025, 5), pagas={17: ('20/09', True), 18: ('21/10', False)}, reg=('Marina Ribeiro', '03/09/2026')),
    'sicoob': dict(id='sicoob', tipo='Banco', nome='Sicoob', para='Capital de giro', valor=30000, contrato=30780,
                   entrou='05/10/2026', forma='Transferência', antigo=False, modo='PARCELAS', total=24, antes=0, parcela=1450,
                   dia=5, p1=(2026, 11), pagas={1: ('05/11', True)}, reg=('Bianca Torres', '05/10/2026')),
    'marina': dict(id='marina', tipo='Sócio', nome='Marina Ribeiro', para='Pagar a folha de setembro', valor=8000, contrato=None,
                   entrou='12/09/2026', forma='Pix', antigo=False, modo='LIVRE', devol=[('17/11/2026', 1500, 'Pix'), ('20/10/2026', 1000, 'Pix')],
                   reg=('Marina Ribeiro', '12/09/2026')),
    'sicredi': dict(id='sicredi', tipo='Banco', nome='Sicredi', para='Computadores e a reforma da sala', valor=12500, contrato=12870,
                    entrou='10/11/2026', forma='Transferência', antigo=False, modo='PARCELAS', total=14, antes=0, parcela=1250,
                    dia=10, p1=(2026, 12), pagas={}, reg=('Marina Ribeiro', 'hoje, às 10h32')),
}


def numeros(e):
    if e['modo'] == 'LIVRE':
        dev = sum(v for _, v, _ in e['devol'])
        return dict(devolvido=dev, falta=max(e['valor'] - dev, 0), custo=max(dev - e['valor'], 0))
    n_pagas = len(e['pagas'])
    abertas = e['total'] - e['antes'] - n_pagas
    antes_v = e['antes'] * e['parcela']
    t3 = n_pagas * e['parcela']
    falta = abertas * e['parcela']
    tot = e['total'] * e['parcela']
    _, a, m = venc(e, e['total'])
    prox = e['antes'] + n_pagas + 1
    return dict(abertas=abertas, antes_v=antes_v, t3=t3, falta=falta, total_v=tot, custo=antes_v + t3 + falta - e['valor'],
                termina=f'{MESES_AB[m - 1]}/{a}', termina_longo=f'{MESES_NOME[m - 1]} de {a}', prox=prox, pagas=e['antes'] + n_pagas)


# ================================================================= Caixa (T1)
# (mês, sub, entrou, parcelas realizadas, parcelas previstas, futuro). Parcelas = parcelas pagas + devoluções ao sócio.
def meses_emp(novo=False):
    bb, sc, sr = EMP['bb']['parcela'], EMP['sicoob']['parcela'], EMP['sicredi']['parcela']
    return [
        ('Setembro', '', 8000, bb, bb, False),
        ('Outubro', '', 30000, bb + 1000, bb + 1000, False),
        ('Novembro', 'até hoje', 12500 if novo else 0, sc + 1500, sc + 1500 + bb, False),
        ('Dezembro', 'previsto', 0, None, bb + sc + (sr if novo else 0), True),
        ('Janeiro', 'previsto', 0, None, bb + sc + (sr if novo else 0), True),
        ('Fevereiro', 'previsto', 0, None, bb + sc + (sr if novo else 0), True),
    ]


def contas_caixa(novo=False):
    """Soma os empréstimos ao Caixa aprovado: o saldo de cada mês ganha o líquido acumulado dos empréstimos."""
    base = FP.MESES_C
    linhas, cum = [], 0
    for (m, sub, ep, er, sp, sr, saldo, fut, rpv), (_, _, ent, preal, pprev, _) in zip(base, meses_emp(novo)):
        lprev = ent - pprev
        lreal = None if fut else ent - preal
        if not fut:
            cum += lreal
            s = saldo + cum
            if m == 'Novembro':
                hoje_cum = cum
                cum += (pprev - preal) * -1  # o que ainda vence em novembro
        else:
            cum += lprev
            s = saldo + cum
        linhas.append((m, sub, ep, er, sp, sr, s, fut, ent, preal, pprev, lprev, lreal))
    saldo_hoje = 40310 + hoje_cum
    fecha = 39850 + hoje_cum - (meses_emp(novo)[2][4] - meses_emp(novo)[2][3])
    return linhas, saldo_hoje, fecha, hoje_cum


def sinal(v):
    if v is None:
        return '<span class="fi-pq">—</span>'
    if v == 0:
        return R(0)
    return ('+' if v > 0 else '−') + R(abs(v))


def selo_emp(tipo):
    i = {'Banco': 'coluna', 'Sócio': 'pessoas', 'Outro': 'pessoa-mais'}[tipo]
    return f'<span class="em-selo">{ico(i)}{tipo}</span>'


def selo_antigo():
    return f'<span class="em-selo em-selo-linha">{ico("historico")}Anterior ao T3jus</span>'


def linha_emp(e, novo=False):
    n = numeros(e)
    href = ARQ + {'bb': 'em-ficha', 'sicoob': 'em-ficha-sicoob', 'marina': 'em-ficha-livre', 'sicredi': 'em-cancelar'}[e['id']]
    sel = selo_emp(e['tipo']) + (selo_antigo() if e['antigo'] else '') + ('<span class="selo selo-ativo">Novo</span>' if novo else '')
    if e['modo'] == 'LIVRE':
        det = f'Falta devolver · sem juros · devolvido {R(n["devolvido"])} de {R(e["valor"])}'
        prox = f'{ico("trocar")}Devolve quando der · última devolução em 17/11'
        v = n['falta']
        acao = f'<a class="btn btn-sec btn-compacto" href="{ARQ}em-devolucao">{ico("mais")}Registrar devolução</a>'
    else:
        det = f'Falta pagar · {n["pagas"]} de {e["total"]} pagas · termina em {n["termina"]}'
        d, a, m = venc(e, n['prox'])
        quando = 'sexta, ' + d[:5] if d.startswith('20/11/2026') else d[:5] + ('' if a == 2026 else f'/{a}')
        prox = f'{ico("agenda")}Próxima: <b>{n["prox"]}/{e["total"]}, {quando}</b> · {R(e["parcela"])}'
        v = n['falta']
        acao = ''
    antigo = (f'<p class="em-nota-l">Entrou antes do T3jus: não soma no saldo. As parcelas que faltam estão em A pagar.</p>' if e['antigo'] else '')
    return (f'<li class="em-linha{" em-novo" if novo else ""}"><div class="fi-quem"><div class="em-selos">{sel}</div>'
            f'<a href="{href}">{e["nome"]}</a><small>{e["para"]}</small><p class="fi-prox">{prox}</p>{antigo}</div>'
            f'<div class="fi-lado"><span class="fi-v forte num">{R(v)}</span><span class="fi-pq em-det">{det}</span>{acao}</div></li>')


def folha_emprestimos(novo=False):
    ids = ['bb', 'sicoob', 'marina'] + (['sicredi'] if novo else [])
    falta = sum(numeros(EMP[i])['falta'] for i in ids)
    lis = ''.join(linha_emp(EMP[i], novo=(i == 'sicredi')) for i in (['sicredi'] if novo else []) + ['bb', 'sicoob', 'marina'])
    corpo = (f'<div class="em-faixa">{ico("trocar")}À parte · entra no saldo, mas não é receita</div>' if False else '')
    corpo += (f'<ul class="fi-linhas em-linhas">{lis}</ul>'
              f'<p class="fi-total"><span>Falta pagar, nos {len(ids)} empréstimos ativos</span><b class="num">{R(falta)}</b></p>'
              f'<p class="pt-pe-folha em-pe">{ico("trocar")}<span>O dinheiro emprestado entra no saldo do Caixa, mas não conta como receita. As parcelas e as devoluções saem do caixa com a categoria Empréstimos, fora das despesas do dia a dia, e vão ao contador numa aba própria.</span></p>')
    bot = f'<a class="btn btn-sec" href="{ARQ}em-registrar">{ico("mais")}Registrar empréstimo</a>'
    f = folha('t-emp', 'Empréstimos', corpo, sub='Empréstimos de banco, de sócio ou de outra pessoa que o escritório está pagando.', acoes=bot, icone='trocar')
    # Faixa "À parte" no alto da folha, no lugar da faixa âmbar de terceiros: areia e vinho, sem âmbar
    f = f.replace('<section class="folha" aria-labelledby="t-emp">',
                  f'<section class="folha em-folha" aria-labelledby="t-emp"><div class="em-faixa">{ico("trocar")}À parte · entra no saldo, mas não é receita</div>', 1)
    return f


def vazio_emprestimos():
    return (f'<div class="em-vazio">{ico("trocar")}<p>Pegou empréstimo de banco ou de sócio? Registre aqui: entra no saldo, mas não conta como receita.</p>'
            f'<a class="btn btn-sec" href="{ARQ}em-registrar">{ico("mais")}Registrar empréstimo</a></div>')


def tabela_meses(com_emp=True, novo=False):
    linhas, _, _, _ = contas_caixa(novo)
    rows, car = '', ''
    for m, sub, ep, er, sp, sr, s, fut, ent, preal, pprev, lprev, lreal in linhas:
        if not com_emp:
            s = [x for x in FP.MESES_C if x[0] == m][0][6]
        cls = ' class="fi-futuro"' if fut else ''
        par = lambda real, prev: (f'<b class="em-r">{R(real)}</b><small>de {R(prev)} prev.</small>' if real is not None
                                  else f'<b class="em-r">{R(prev)}</b><small>previstas</small>')
        par_e = lambda real, prev: (f'<b class="em-r">{R(real)}</b><small>de {R(prev)} prev.</small>' if real is not None
                                    else f'<b class="em-r">{R(prev)}</b><small>previstas</small>')
        emp = ''
        if com_emp:
            if lreal is not None:
                emp = f'<td class="num em-col"><b class="em-r">{sinal(lreal)}</b><small>{sinal(lprev)} prev.</small></td>'
            else:
                emp = f'<td class="num em-col"><b class="em-r">{sinal(lprev)}</b><small>previsto</small></td>'
        rows += (f'<tr{cls}><td><b style="font-weight:500">{m}</b>{"<br><span class=fi-pq>(" + sub + ")</span>" if sub else ""}</td>'
                 f'<td class="num">{par(er, ep).replace("prev.", "prev.") if er is not None else par(None, ep).replace("previstas", "previstas")}</td>'
                 f'<td class="num">{par_e(sr, sp)}</td>{emp}<td class="num"><b class="em-saldo">{R(s)}</b></td></tr>')
        emp_c = ''
        if com_emp:
            emp_c = f'<dt>Empréstimos</dt><dd class="num">{sinal(lreal if lreal is not None else lprev)}{"" if lreal is not None else " prev."}</dd>'
        car += (f'<li class="cartao"><div class="c-topo"><div><strong class="c-nome" style="font-size:18px">{m}</strong><small>{sub or "realizado"}</small></div></div>'
                f'<dl class="c-dados"><dt>Entradas</dt><dd class="num">{R(er) if er is not None else R(ep) + " prev."}</dd><dt>Saídas</dt><dd class="num">{R(sr) if sr is not None else R(sp) + " prev."}</dd>'
                f'{emp_c}<dt>Saldo no fim</dt><dd class="num"><b>{R(s)}</b></dd></dl></li>')
    th_emp = '<th scope="col" class="em-col">Empréstimos<br><span class="em-th-sub">à parte</span></th>' if com_emp else ''
    cols = '<col style="width:16%"><col><col>' + ('<col>' if com_emp else '') + '<col>'
    tab = (f'<div class="so-pc"><table class="fi-tab fi-tab-caixa em-tab"><caption class="sr">Entradas, saídas{", empréstimos" if com_emp else ""} e saldo por mês</caption>'
           f'<colgroup>{cols}</colgroup><thead><tr><th scope="col">Mês</th><th scope="col">Entradas</th><th scope="col">Saídas</th>{th_emp}<th scope="col">Saldo no fim</th></tr></thead>'
           f'<tbody>{rows}</tbody></table></div><ul class="cartoes so-cel" aria-label="Mês a mês">{car}</ul>')
    if com_emp:
        exp = (f'<p class="pt-pe-folha em-pe">{ico("trocar")}<span>Entradas e Saídas são do dia a dia. <b>Empréstimos</b> fica à parte: <b>+</b> o que entrou emprestado, <b>−</b> as parcelas e devoluções pagas. '
               f'Entra no saldo, mas não é receita nem despesa.</span></p>')
    else:
        exp = f'<p class="pt-pe-folha em-pe">{ico("filtro")}<span>Entradas e Saídas são do dia a dia do escritório. Valores de terceiros não entram aqui.</span></p>'
    return folha('t-meses', 'Mês a mês', tab + exp, sub='Realizado em cima, previsto embaixo. De novembro em diante, o saldo é previsão.', icone='agenda')


def caixa_em(v='base', extra=''):
    """v: base (com empréstimos), vazio (nenhum empréstimo), novo (logo depois de registrar o Sicredi)."""
    novo = v == 'novo'
    html_ = FP.caixa_pend()
    if v != 'vazio':
        _, saldo, fecha, cum = contas_caixa(novo)
        html_ = html_.replace(f'<span class="fi-big num">{R(40310)}</span>', f'<span class="fi-big num">{R(saldo)}</span>', 1)
        html_ = html_.replace(f'fecha novembro em <b>{R(40310 - 460)}</b>.</p>',
                              f'fecha novembro em <b>{R(fecha)}</b>.</p><p class="em-no-saldo">{ico("trocar")}<span>Inclui <b>{R(cum)}</b> de empréstimos, já descontado o que foi pago. Entra no saldo, mas não é receita.</span></p>', 1)
    meio = (folha_emprestimos(novo) if v != 'vazio' else vazio_emprestimos()) + tabela_meses(v != 'vazio', novo)
    html_ = html_.replace('</div><aside class="fi-col" aria-label="A caminho e contador">', meio + '</div><aside class="fi-col" aria-label="A caminho e contador">', 1)
    html_ = html_.replace(f'href="{FP.ARQ}', f'href="{ARQ}')
    return html_ + extra


# ================================================================= Registrar empréstimo (T2)
DUVIDAS = (f'<ul class="em-duvidas">'
           f'<li>{ico("pessoas")}<span>Empréstimo no seu CPF que você pôs no escritório: escolha <b>Sócio</b>.</span></li>'
           f'<li>{ico("pessoa-menos")}<span>Parcela de um empréstimo seu, paga pelo escritório, sem o dinheiro ter entrado nele: é <b>Retirada</b>, não empréstimo.</span></li>'
           f'<li>{ico("coluna")}<span>Dinheiro seu que não vai voltar: é aporte de capital. Fale com o contador.</span></li></ul>')


def op_card(nome, rot, sub, marcado=False, foco=False, ic=''):
    ch = ' checked' if marcado else ''
    f = ' data-foco' if foco else ''
    i = ico(ic) if ic else ''
    return f'<label class="opcao em-op"><input class="marcar" type="radio" name="{nome}"{ch}{f}><span>{i}<b>{rot}</b><small>{sub}</small></span></label>'


def previa_parcelas(n, valor, de, ate, custo, nota='', lista=None, antes_txt=''):
    li = ''
    if lista:
        itens = ''.join(f'<li><label for="pv-{i}"><b>{i}/{lista["total"]}</b><small>{d}</small></label>'
                        f'<input class="entrada" id="pv-{i}" inputmode="decimal" value="{v}" aria-label="Valor da parcela {i}, que vence em {d}"></li>'
                        for i, d, v in lista['itens'])
        li = (f'<details class="em-lista" open><summary>{ico("baixo", "ico ico-s")}Ver e mudar o valor de cada parcela</summary>'
              f'<p class="ajuda">Mude o valor de uma parcela se o banco cobrar diferente: a primeira com tarifa, carência só de juros, tabela SAC. O total e o custo se refazem.</p>'
              f'<ol class="em-parc-lista">{itens}</ol></details>')
    elif lista is None and n:
        li = f'<details class="em-lista"><summary>{ico("dir", "ico ico-s")}Ver e mudar o valor de cada parcela</summary></details>'
    return (f'<div class="em-previa" role="status"><p class="fi-rotulo">O que vai nascer em A pagar</p>'
            f'<p class="em-previa-l"><b>{n} parcelas de {valor}</b> · de {de} a {ate}</p>'
            f'<p class="em-previa-c">Custo do empréstimo: <b>{custo}</b><small>O total das parcelas menos o que entrou na conta. Inclui juros, IOF e tarifas.</small></p>'
            f'{antes_txt}{nota}{li}</div>')


def j_registrar(v='abrir'):
    """v: abrir (vazia), parcelas (Sicredi preenchido, com a lista), antigo (Caixa Econômica, B1 + C6),
    livre (sócio, devolve quando der), erros, falha."""
    topo = ''
    if v == 'erros':
        topo = resumo_erros(3, 'O empréstimo ainda não foi registrado.')
    if v == 'falha':
        topo = falha('Não deu para registrar o empréstimo.', 'Nada foi salvo: o saldo do Caixa não mudou e nenhuma parcela entrou em A pagar. O que você preencheu continua aqui. Tente de novo.', 'FIN-7C31-1811')
    # Os valores de cada variação
    d = dict(tipo='Banco', nome='', para='', valor='', dia='', forma='Transferência', contrato='', modo='PARCELAS', total='', parcela='', antes='', prox='')
    if v in ('parcelas', 'falha', 'erros'):
        d.update(nome='Sicredi', para='Computadores e a reforma da sala', valor='12.500,00', dia='10/11/2026', contrato='12.870,00', total='14', parcela='1.250,00', antes='0', prox='10/12/2026')
    if v == 'erros':
        d.update(nome='', valor='', prox='10/10/2026')
    if v == 'antigo':
        d.update(nome='Caixa Econômica Federal', para='Pronampe 2024', valor='45.000,00', dia='20/06/2024', contrato='', total='48', parcela='1.180,00', antes='0', prox='20/07/2024')
    if v == 'livre':
        d.update(tipo='Sócio', nome='Felipe Matos', para='Adiantar o aluguel de dezembro', valor='5.000,00', dia='17/11/2026', forma='Pix', modo='LIVRE')

    foco_tipo = v in ('abrir', 'parcelas', 'livre')
    de_quem = (f'<fieldset class="fi-grupo-op"><legend>De quem é o empréstimo</legend><div class="em-tres">'
               + op_card('rg-tipo', 'Banco ou financeira', 'Banco, cooperativa, maquininha', d['tipo'] == 'Banco', foco_tipo, 'coluna')
               + op_card('rg-tipo', 'Sócio do escritório', 'Dinheiro de um sócio que vai voltar para ele', d['tipo'] == 'Sócio', False, 'pessoas')
               + op_card('rg-tipo', 'Outra pessoa ou empresa', 'Parente, amigo, outra empresa', d['tipo'] == 'Outro', False, 'pessoa-mais')
               + '</div></fieldset>')
    duv = (f'<details class="em-duvida"{" open" if v == "abrir" else ""}><summary>{ico("ajuda", "ico ico-s")}Empréstimo, retirada ou aporte? Veja a diferença</summary>{DUVIDAS}</details>')
    nome_rot = 'Nome do sócio' if d['tipo'] == 'Sócio' else 'Nome do banco ou da pessoa'
    nome = campo_e('rg-nome', nome_rot, d['nome'], erro='Escreva o nome do banco ou da pessoa que emprestou.' if v == 'erros' else '',
                   foco=(v == 'erros'))
    para = campo('rg-para', 'Para que', d['para'], opc=True, ajuda='Como vai aparecer no Caixa e para o contador.')
    valor = campo_e('rg-valor', 'Valor que entrou na conta', d['valor'], im='decimal',
                    ajuda='O que caiu na conta, já sem IOF e tarifas.', erro='Escreva quanto entrou na conta, já sem IOF e tarifas.' if v == 'erros' else '')
    dia = campo('rg-dia', 'Dia em que entrou', d['dia'], im='numeric', ajuda='dd/mm/aaaa · não pode ser depois de hoje')
    forma = selecao('rg-forma', 'Como entrou', ['Transferência', 'Pix', 'Dinheiro'], d['forma'])
    contrato = (f'<details class="em-mais"{" open" if d["contrato"] else ""}><summary>{ico("baixo", "ico ico-s")}Mais detalhes: valor do contrato</summary>'
                + campo('rg-contrato', 'Valor do contrato', d['contrato'], im='decimal', opc=True,
                        ajuda='O valor antes do IOF e das tarifas, como está no contrato. A ficha e o contador veem a diferença como IOF e tarifas.')
                + '</details>')
    antigo_av = ''
    if v == 'antigo':
        antigo_av = aviso('info', 'Entrou antes do T3jus: não soma no saldo.',
                          'O caixa aqui começa no saldo de abertura de 31/08/2026: este dinheiro já está nele, ou já foi gasto. '
                          'As parcelas que faltam entram em A pagar e saem do caixa quando forem pagas.', icone='historico')
    modo = (f'<fieldset class="fi-grupo-op"><legend>Como vai devolver</legend><div class="em-dois-op">'
            + op_card('rg-modo', 'Em parcelas', 'Valor e dia combinados, como no banco', d['modo'] == 'PARCELAS', False, 'agenda')
            + op_card('rg-modo', 'Devolve quando der', 'Sem parcelas fixas, comum com sócio', d['modo'] == 'LIVRE', False, 'trocar')
            + '</div></fieldset>')
    if d['modo'] == 'LIVRE':
        parc = (f'<div class="em-previa" role="status"><p class="fi-rotulo">Sem parcelas fixas</p>'
                f'<p class="em-previa-l">Nenhuma parcela nasce em A pagar. Cada vez que o escritório devolver, use <b>Registrar devolução</b> na ficha do empréstimo.</p>'
                f'<p class="em-previa-c">Falta devolver começa em <b>{R(5000)}</b>, sem juros.<small>Se as devoluções passarem do que entrou, o que passar fica como juros pagos ao sócio.</small></p></div>')
    else:
        aj_antes = 'Já lançou parcelas deste empréstimo em A pagar? Conte-as aqui e cancele lá as que estão em aberto.'
        total = campo('rg-total', 'Número de parcelas', d['total'], im='numeric', ajuda='Todas as do contrato, de 1 a 120.')
        pval = campo('rg-parcela', 'Valor da parcela', d['parcela'], im='decimal', ajuda='Se mudar de uma para outra, ajuste na lista abaixo.')
        antes = campo('rg-antes', 'Já pagou alguma parcela antes?', d['antes'], im='numeric', opc=False, ajuda=aj_antes)
        prox = campo_e('rg-prox', 'Vencimento da próxima parcela a pagar', d['prox'], im='numeric', ajuda='dd/mm/aaaa · as outras vencem no mesmo dia dos meses seguintes',
                       erro='A próxima parcela não pode vencer antes do dia em que o dinheiro entrou (10/11/2026). Confira a data.' if v == 'erros' else '')
        parc = f'<div class="fi-dois">{total}{pval}</div><div class="fi-dois">{antes}{prox}</div>'
        if v == 'antigo':
            c6 = (f'<fieldset class="fi-grupo-op em-c6"><legend>A próxima parcela que você pôs vence em 20/07/2024, mais de um mês antes de hoje. As parcelas até outubro de 2026 já foram pagas?</legend>'
                  + radio('rg-c6', 'Sim, 28 parcelas foram pagas antes do T3jus', 'A próxima a pagar é a 29/48, em 20/11/2026. Nenhuma fica vencida.', marcado=True, foco=True)
                  + radio('rg-c6', 'Uma ficou em aberto: 27 foram pagas antes', 'A 28/48, de 20/10/2026, entra em A pagar como vencida.')
                  + radio('rg-c6', 'Não, vou corrigir os números acima')
                  + '</fieldset>')
            parc += c6 + previa_parcelas(20, R(1180), '20/11/2026', '20/06/2028', R(11640),
                                         antes_txt=f'<p class="em-previa-c">Pago antes do T3jus: <b>28 parcelas, {R(33040)}</b><small>Estimado pelo valor da parcela. Não sai do caixa daqui.</small></p>',
                                         lista=False)
        elif v == 'abrir':
            parc += (f'<div class="em-previa em-previa-vazia" role="status"><p class="fi-rotulo">O que vai nascer em A pagar</p>'
                     f'<p class="em-previa-l">A lista das parcelas e o custo do empréstimo aparecem aqui quando você preencher os campos de cima.</p></div>')
        elif v == 'erros':
            parc += (f'<div class="em-previa em-previa-vazia" role="status"><p class="fi-rotulo">O que vai nascer em A pagar</p>'
                     f'<p class="em-previa-l">A prévia volta quando o valor e o vencimento estiverem certos.</p></div>')
        else:
            itens = []
            for i in range(1, 15):
                a, m = mais_meses(2026, 12, i - 1)
                itens.append((i, f'10/{m:02d}/{a}', '1.250,00'))
            parc += previa_parcelas(14, R(1250), '10/12/2026', '10/01/2028', R(5000),
                                    nota=f'<p class="em-previa-c">IOF e tarifas na liberação: <b>{R(370)}</b><small>Valor do contrato menos o que entrou na conta.</small></p>',
                                    lista=dict(total=14, itens=itens) if v == 'parcelas' else None)
    if v == 'erros':
        dia = campo('rg-dia', 'Dia em que entrou', d['dia'], im='numeric', ajuda='dd/mm/aaaa · não pode ser depois de hoje')
    caixa_txt = (f'<p class="fi-caixa-fixa">{ico("trocar")}<span>Entra no caixa <b>do escritório</b>: soma no saldo, mas não conta como receita. '
                 + ('As parcelas nascem em A pagar, com a categoria Empréstimos.' if d['modo'] == 'PARCELAS' else 'As devoluções saem com a categoria Empréstimos.')
                 + '</span></p>')
    if v == 'antigo':
        caixa_txt = (f'<p class="fi-caixa-fixa">{ico("historico")}<span><b>Fica fora do saldo</b>, porque entrou antes do T3jus. As 20 parcelas que faltam nascem em A pagar, com a categoria Empréstimos.</span></p>')
    corpo = (topo + de_quem + duv + f'<div class="fi-dois">{nome}{para}</div>' + f'<div class="fi-dois">{valor}{dia}</div>' + antigo_av
             + f'<div class="fi-dois">{forma}<div></div></div>' + contrato + modo + parc + caixa_txt
             + f'<p class="fi-ref">{ico("historico")}<span>Fica no histórico do escritório, com quem registrou e quando. Errou depois? Na ficha do empréstimo dá para marcar como lançado errado ou encerrar as parcelas que faltam.</span></p>')
    rot = 'Tentar de novo' if v == 'falha' else 'Registrar empréstimo'
    pe = (f'<button class="btn btn-sec" type="button" data-fechar>Cancelar</button>'
          f'<a class="btn btn-pri" href="{ARQ}em-registrado">{ico("check")}{rot}</a>')
    j = janela('janela-emp', 'Caixa', 'Registrar empréstimo', 'Dinheiro emprestado que entrou na conta do escritório.', corpo, pe, abrir=(v != 'fechada'))
    if v == 'falha':
        j = j.replace(f'<a class="btn btn-pri" href="{ARQ}em-registrado">', f'<a class="btn btn-pri" href="{ARQ}em-registrado" data-foco>', 1)
    return larga(j)


# ================================================================= Ficha do empréstimo (T3)
def cab_ficha(e, sit='ativo'):
    n = numeros(e)
    tipo_l = {'Banco': 'Banco ou financeira', 'Sócio': 'Sócio do escritório', 'Outro': 'Outra pessoa ou empresa'}[e['tipo']]
    s_sit = {'ativo': '<span class="selo em-selo-claro">Ativo</span>',
             'encerrado': '<span class="selo em-selo-claro">Encerrado hoje</span>',
             'cancelado': '<span class="selo em-selo-claro">Lançado errado · fora do caixa</span>'}[sit]
    ant = f'<span class="selo em-selo-claro">{ico("historico")}Anterior ao T3jus</span>' if e['antigo'] else ''
    modo = 'devolve quando der' if e['modo'] == 'LIVRE' else f'{e["total"]} parcelas de {R(e["parcela"])} · dia {e["dia"]}'
    esq = (f'<div class="esq campo-vinho">{ico("coluna", "ico estatua")}'
           f'<a class="voltar" href="{ARQ}em-caixa">{ico("esq", "ico ico-s")}Caixa</a>'
           f'<div class="ident"><div><p class="sobretitulo">Empréstimo · {tipo_l}</p><h1>{e["nome"]}</h1>'
           f'<p class="meta">{s_sit}{ant}<span>{e["para"]} · {modo}</span></p></div></div></div>')
    if sit == 'cancelado':
        dir_ = (f'<section class="dir em-dir" aria-labelledby="t-dir"><p class="sobretitulo" id="t-dir">Fora do caixa</p><p class="grande num">{R(0)}</p>'
                f'<p class="fi-oque"><b>Lançado errado hoje, às 10h51.</b><br>Saiu do saldo e da exportação. As 14 parcelas foram canceladas em A pagar.</p></section>')
    elif sit == 'encerrado':
        dir_ = (f'<section class="dir em-dir" aria-labelledby="t-dir"><p class="sobretitulo" id="t-dir">Falta pagar</p><p class="grande num">{R(0)}</p>'
                f'<p class="fi-oque"><b>Parcelas encerradas hoje, às 10h40.</b><br>Pago no T3jus: {R(n["t3"])}. O que entrou e o que foi pago continuam no caixa.</p></section>')
    elif e['modo'] == 'LIVRE':
        dir_ = (f'<section class="dir em-dir" aria-labelledby="t-dir"><p class="sobretitulo" id="t-dir">Falta devolver</p><p class="grande num">{R(n["falta"])}</p>'
                f'<p class="fi-oque"><b>Sem juros.</b> Devolvido {R(n["devolvido"])} de {R(e["valor"])}.<br>Última devolução em 17/11, por Pix.</p>'
                f'<a class="btn btn-pri" href="{ARQ}em-devolucao">{ico("mais")}Registrar devolução</a></section>')
    else:
        d, a, m = venc(e, n['prox'])
        quando = 'sexta, 20/11' if d == '20/11/2026' else d
        dir_ = (f'<section class="dir em-dir" aria-labelledby="t-dir"><p class="sobretitulo" id="t-dir">Falta pagar</p><p class="grande num">{R(n["falta"])}</p>'
                f'<p class="fi-oque"><b>{n["abertas"]} parcelas de {R(e["parcela"])}</b> · termina em {n["termina_longo"]}.<br>Próxima: {n["prox"]}/{e["total"]}, {quando}.</p>'
                + (f'<button class="btn btn-pri" type="button">{ico("check")}Marcar a {n["prox"]}/{e["total"]} como paga</button>' if e['id'] != 'sicredi' else '')
                + '</section>')
    return f'<div class="ficha-cab em-cab">{esq}{dir_}</div>'


def tabela_parcelas(e, sit='ativo', mostrar=4):
    n = numeros(e)
    rows, car = '', ''
    if e['antes']:
        _, a1, m1 = venc(e, 1)
        dlast, _, _ = venc(e, e['antes'])
        s = f'<div class="fi-sit">{selo("neutro", "Pagas antes do T3jus")}<p class="fi-motivo">Valor estimado: {e["antes"]} × {R(e["parcela"])}. Não saem do caixa daqui.</p></div>'
        rows += (f'<tr class="fi-pago"><td><div class="fi-dt"><b>1 a {e["antes"]}</b></div></td><td class="num">{venc(e, 1)[0]}<br><span class="fi-pq">a {dlast}</span></td>'
                 f'<td>{s}</td><td class="fi-v num">{R(n["antes_v"])}</td><td><span class="fi-pq">—</span></td></tr>')
        car += (f'<li class="cartao"><div class="c-topo"><div><strong class="c-nome" style="font-size:18px">Parcelas 1 a {e["antes"]}</strong><small>{venc(e, 1)[0]} a {dlast}</small></div>'
                f'<span class="fi-cartao-v num" style="margin-left:auto">{R(n["antes_v"])}</span></div><div class="c-selos">{selo("neutro", "Pagas antes do T3jus")}</div>'
                f'<p class="fi-pq">Valor estimado. Não saem do caixa daqui.</p></li>')
    ultimo = min(e['total'], n['prox'] + mostrar - 1) if sit == 'ativo' else min(e['total'], n['prox'] + mostrar - 1)
    for i in range(e['antes'] + 1, ultimo + 1):
        d, _, _ = venc(e, i)
        pago = e['pagas'].get(i)
        cls = ''
        acao = '<span class="fi-pq">—</span>'
        if pago:
            s = f'<div class="fi-sit">{selo("ok", "Paga em " + pago[0], "check")}<p class="fi-motivo">{R(e["parcela"])} · Pix</p></div>'
            if pago[1]:
                acao = f'<div class="fi-docs"><a href="#">{ico("link")}Comprovante</a></div>'
            else:
                acao = f'<div class="em-falta-comp"><span class="fi-pq">Sem comprovante</span><button class="btn btn-sec btn-compacto" type="button">{ico("mais")}Anexar</button></div>'
            cls = ' class="fi-pago"'
            sit_c = selo("ok", "Paga em " + pago[0], "check")
        elif sit in ('encerrado', 'cancelado'):
            s = f'<div class="fi-sit">{selo("neutro", "Cancelada")}<p class="fi-motivo">{"Encerrada com as que faltavam" if sit == "encerrado" else "Lançado errado"}, hoje</p></div>'
            sit_c = selo('neutro', 'Cancelada')
            cls = ' class="em-cancelada"'
        else:
            prox = i == n['prox']
            rot = 'Vence sexta' if d == '20/11/2026' else 'Em aberto'
            s = f'<div class="fi-sit">{selo("neutro", rot)}</div>'
            sit_c = selo('neutro', rot)
            if prox and e['id'] != 'sicredi':
                acao = f'<button class="btn btn-sec btn-compacto" type="button" aria-label="Marcar a parcela {i}/{e["total"]} como paga">Marcar paga</button>'
        rows += (f'<tr{cls}><td><div class="fi-dt"><b>{i}/{e["total"]}</b></div></td><td class="num">{d}</td><td>{s}</td>'
                 f'<td class="fi-v num">{R(e["parcela"])}</td><td>{acao}</td></tr>')
        acao_c = acao if 'btn' in acao or 'fi-docs' in acao else ''
        car += (f'<li class="cartao"><div class="c-topo"><div><strong class="c-nome" style="font-size:18px">Parcela {i}/{e["total"]}</strong><small>vence {d}</small></div>'
                f'<span class="fi-cartao-v num" style="margin-left:auto">{R(e["parcela"])}</span></div><div class="c-selos">{sit_c}</div>'
                + (f'<div class="c-acoes">{acao_c.replace("btn-compacto", "")}</div>' if acao_c else '') + '</li>')
    resto = e['total'] - ultimo
    mais = ''
    if resto > 0:
        dl, _, _ = venc(e, e['total'])
        txt = 'canceladas' if sit in ('encerrado', 'cancelado') else 'em aberto'
        mais = f'<p class="mais"><span>Mais {resto} parcelas {txt}, até {dl}</span><button class="btn btn-sec" type="button">Ver todas</button></p>'
    tab = (f'<table class="so-pc fi-tab"><caption class="sr">Parcelas do empréstimo</caption><colgroup><col style="width:12%"><col style="width:16%"><col style="width:32%"><col style="width:16%"><col style="width:24%"></colgroup>'
           f'<thead><tr><th scope="col">Parcela</th><th scope="col">Vence</th><th scope="col">Situação</th><th scope="col" style="text-align:right">Valor</th><th scope="col">Comprovante</th></tr></thead>'
           f'<tbody>{rows}</tbody></table><ul class="cartoes so-cel" aria-label="Parcelas do empréstimo">{car}</ul>{mais}')
    return tab


def quatro(itens):
    return '<dl class="fi-quatro em-quatro">' + ''.join(f'<div><dt>{a}</dt><dd class="num">{b}{"<small class=em-q-sub>" + c + "</small>" if c else ""}</dd></div>' for a, b, c in itens) + '</dl>'


def folha_dados(e):
    n = numeros(e)
    tipo_l = {'Banco': 'Banco ou financeira', 'Sócio': 'Sócio do escritório', 'Outro': 'Outra pessoa ou empresa'}[e['tipo']]
    linhas = [('De quem', f'{e["nome"]}<small>{tipo_l}</small>'),
              ('Para que', e['para']),
              ('Entrou na conta', f'{R(e["valor"])}<small>{e["entrou"]} · {e["forma"]}</small>')]
    if e.get('contrato'):
        linhas.append(('Valor do contrato', f'{R(e["contrato"])}<small>IOF e tarifas na liberação: {R(e["contrato"] - e["valor"])}</small>'))
    if e['antigo']:
        linhas.append(('No saldo do Caixa', 'Não<small>Entrou antes do T3jus: já está no saldo de abertura de 31/08/2026.</small>'))
    else:
        linhas.append(('No saldo do Caixa', f'Sim, desde {e["entrou"]}<small>Não conta como receita.</small>'))
    linhas.append(('Registrado por', f'{e["reg"][0]}<small>{e["reg"][1]}</small>'))
    dl = '<dl class="pd-ro">' + ''.join(f'<div><dt>{a}</dt><dd>{b}</dd></div>' for a, b in linhas) + '</dl>'
    return folha('t-dados', 'Dados do empréstimo', dl, icone='doc')


EVS = {
    'bb': ('<li><time>21/10</time><span class="pto" aria-hidden="true"></span><div><p><b>Bianca Torres</b> marcou a parcela 18/40 como paga</p><small>{v} · Pix · sem comprovante</small></div></li>'
           '<li><time>20/09</time><span class="pto" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> marcou a parcela 17/40 como paga</p><small>{v} · Pix · comprovante anexado</small></div></li>'
           '<li><time>03/09</time><span class="pto" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> registrou o empréstimo</p><small>40 parcelas, 16 pagas antes do T3jus. As 24 que faltavam nasceram em A pagar. Fora do saldo: entrou antes do T3jus.</small></div></li>'),
    'sicoob': ('<li><time>05/11</time><span class="pto" aria-hidden="true"></span><div><p><b>Bianca Torres</b> marcou a parcela 1/24 como paga</p><small>{v} · débito em conta · comprovante anexado</small></div></li>'
               '<li><time>05/10</time><span class="pto" aria-hidden="true"></span><div><p><b>Bianca Torres</b> registrou o empréstimo</p><small>{e} entraram no saldo. As 24 parcelas nasceram em A pagar.</small></div></li>'),
    'marina': ('<li><time>17/11</time><span class="pto" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> registrou uma devolução</p><small>{d1} · Pix · comprovante anexado</small></div></li>'
               '<li><time>20/10</time><span class="pto" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> registrou uma devolução</p><small>{d2} · Pix · comprovante anexado</small></div></li>'
               '<li><time>12/09</time><span class="pto" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> registrou o empréstimo</p><small>{e} entraram no saldo. Devolve quando der, sem juros.</small></div></li>'),
    'sicredi': ('<li><time>10h32</time><span class="pto" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> registrou o empréstimo</p><small>{e} entraram no saldo. As 14 parcelas nasceram em A pagar.</small></div></li>'),
}


def folha_hist(e, novo=''):
    ev = EVS[e['id']].format(v=R(e.get('parcela') or 0), e=R(e['valor']), d1=R(1500), d2=R(1000))
    return folha('t-hist', 'Histórico', f'<div class="eventos-dia" style="padding-top:0"><ol class="eventos">{novo}{ev}</ol></div>'
                 f'<p class="pt-pe-folha em-pe">{ico("cadeado")}<span>Nada se apaga. Correções ficam aqui, com quem fez, quando e o motivo.</span></p>', icone='historico')


def folha_pe(e, sit='ativo'):
    if sit != 'ativo':
        return ''
    tem_pago = bool(e.get('pagas')) or bool(e.get('devol'))
    if e['modo'] == 'LIVRE':
        corpo = (f'<div class="em-pe-corpo"><p>Quando a última devolução fechar a conta, ou se a sócia perdoar o resto, encerre aqui: o empréstimo fica quitado e sai da lista do Caixa. As devoluções continuam no caixa.</p>'
                 f'<button class="btn btn-perigo" type="button">{ico("check")}Encerrar o empréstimo</button></div>')
        return folha('t-pe', 'Quitou ou não vai devolver o resto?', corpo, icone='ajustes')
    if tem_pago:
        corpo = (f'<div class="em-pe-corpo"><p>Para quitar antes, renegociar ou corrigir um erro descoberto depois do primeiro pagamento. As parcelas em aberto são canceladas; o que entrou e o que foi pago continuam no caixa.</p>'
                 f'<a class="btn btn-perigo" href="{ARQ}em-encerrar">{ico("x")}Encerrar as parcelas que faltam</a></div>')
        return folha('t-pe', 'Quitou antes ou renegociou?', corpo, icone='ajustes')
    corpo = (f'<div class="em-pe-corpo"><p>Nada foi pago ainda. Se registrou por engano ou com dados errados, marque como lançado errado: sai do caixa, da exportação e de A pagar. Depois, registre de novo.</p>'
             f'<a class="btn btn-perigo" href="{ARQ}em-cancelar">{ico("x")}Lançado errado</a></div>')
    return folha('t-pe', 'Registrou errado?', corpo, icone='ajustes')


def ficha(eid, sit='ativo', ev_novo='', extra=''):
    e = EMP[eid]
    n = numeros(e)
    cab = cab_ficha(e, sit)
    motivo = ''
    if sit == 'encerrado':
        motivo = ('<div class="em-motivo">' + aviso('info', 'Parcelas encerradas por Marina Ribeiro hoje, às 10h40.',
                                                    '<b>Motivo:</b> “Renegociado: virou um contrato novo no Sicoob, de 36 parcelas, que vou registrar em seguida.” '
                                                    'As 23 parcelas em aberto foram canceladas. A ficha fica só para leitura.', icone='cadeado') + '</div>')
    if sit == 'cancelado':
        motivo = ('<div class="em-motivo">' + aviso('info', 'Marcado como lançado errado por Marina Ribeiro hoje, às 10h51.',
                                                    '<b>Motivo:</b> “Valor errado: entraram R$ 12.050,00, não R$ 12.500,00. Vou registrar de novo.” '
                                                    'Saiu do saldo do Caixa e da exportação; as 14 parcelas foram canceladas em A pagar. A ficha fica só para leitura.', icone='cadeado') + '</div>')
    if e['modo'] == 'LIVRE':
        nums = quatro([('Entrou na conta', R(e['valor']), e['entrou']), ('Devolvido', R(n['devolvido']), '2 devoluções'),
                       ('Falta devolver', R(n['falta']), 'sem juros'), ('Custo do empréstimo', R(n['custo']), 'o que passar do que entrou')])
        rows = ''.join(f'<tr class="fi-pago"><td class="num">{d}</td><td><div class="fi-sit">{selo("ok", "Devolvido", "check")}</div></td><td>{f}</td>'
                       f'<td class="fi-v num">{R(v)}</td><td><div class="fi-docs"><a href="#">{ico("link")}Comprovante</a></div></td></tr>' for d, v, f in e['devol'])
        car = ''.join(f'<li class="cartao"><div class="c-topo"><div><strong class="c-nome" style="font-size:18px">{d}</strong><small>{f}</small></div>'
                      f'<span class="fi-cartao-v num" style="margin-left:auto">{R(v)}</span></div><div class="c-selos">{selo("ok", "Devolvido", "check")}</div>'
                      f'<div class="c-acoes"><div class="fi-docs"><a href="#">{ico("link")}Comprovante</a></div></div></li>' for d, v, f in e['devol'])
        tab = (f'<table class="so-pc fi-tab"><caption class="sr">Devoluções</caption><colgroup><col style="width:18%"><col style="width:26%"><col style="width:18%"><col style="width:17%"><col style="width:21%"></colgroup>'
               f'<thead><tr><th scope="col">Dia</th><th scope="col">Situação</th><th scope="col">Forma</th><th scope="col" style="text-align:right">Valor</th><th scope="col">Comprovante</th></tr></thead>'
               f'<tbody>{rows}</tbody></table><ul class="cartoes so-cel" aria-label="Devoluções">{car}</ul>')
        nota = (f'<p class="pt-pe-folha em-pe">{ico("trocar")}<span>Cada devolução sai do caixa com a categoria Empréstimos, fora das despesas. Se devolver mais do que falta, o que passar fica como juros pagos à sócia.</span></p>')
        principal = folha('t-parc', 'Devoluções', nums + tab + nota, sub='Sem parcelas fixas: o escritório devolve quando der.',
                          acoes=f'<a class="btn btn-sec" href="{ARQ}em-devolucao">{ico("mais")}Registrar devolução</a>')
    else:
        falta = R(0) if sit in ('encerrado', 'cancelado') else R(n['falta'])
        if e['antigo']:
            ja = (R(n['antes_v'] + n['t3']), f'antes do T3jus: {R(n["antes_v"])} (estimado)<br>no T3jus: {R(n["t3"])}')
        else:
            ja = (R(n['t3']), 'no T3jus' if n['t3'] else 'nenhuma parcela paga')
        custo_sub = 'total das parcelas menos o que entrou'
        tot = (R(e['total'] * e['parcela']), f'{e["total"]} × {R(e["parcela"])}')
        if sit == 'encerrado':
            tot = (R(n['t3']), 'só a parcela paga; as outras foram canceladas')
            custo = R(max(n['t3'] - e['valor'], 0)) if False else R(0)
            custo_sub = 'pago menos o que entrou: nada, até aqui'
        elif sit == 'cancelado':
            tot, custo, custo_sub = (R(0), 'as 14 foram canceladas'), R(0), 'fora do caixa'
        else:
            custo = R(n['custo'])
        nums = quatro([('Total das parcelas', tot[0], tot[1]), ('Custo do empréstimo', custo, custo_sub), ('Já pago', ja[0], ja[1]),
                       ('Falta pagar', falta, f'{n["abertas"]} parcelas' if sit == 'ativo' else 'nada')])
        antigo = ''
        if e['antigo']:
            antigo = ('<div class="fi-aviso-in em-aviso-topo">' + aviso('info', 'Entrou antes do T3jus: não soma no saldo.',
                                                                         'O caixa aqui começa no saldo de abertura de 31/08/2026, e este dinheiro já está nele. As parcelas que faltam estão em A pagar e saem do caixa quando forem pagas.',
                                                                         icone='historico') + '</div>')
        nota = (f'<p class="pt-pe-folha em-pe">{ico("ajuda")}<span><b>Falta pagar</b> soma as parcelas que faltam, com os juros delas. Para quitar hoje, o valor é o do extrato do banco (o saldo devedor), que tira os juros futuros.</span></p>')
        principal = folha('t-parc', 'Parcelas', nums + antigo + tabela_parcelas(e, sit) + (nota if sit == 'ativo' else ''),
                          sub='Cada parcela paga sai do caixa com a categoria Empréstimos, fora das despesas. A mesma parcela está em A pagar.')
    corpo = (f'<div class="fi">{cab}{motivo}<div class="fi-grade"><div class="fi-col">{principal}{folha_pe(e, sit)}</div>'
             f'<aside class="fi-col" aria-label="Dados e histórico">{folha_dados(e)}{folha_hist(e, ev_novo)}</aside></div></div>{extra}')
    return corpo


def j_devolucao(v='abrir'):
    """v: abrir (com o aviso do valor acima do que falta), erros, falha."""
    topo = ''
    if v == 'erros':
        topo = resumo_erros(2, 'A devolução ainda não foi registrada.')
    if v == 'falha':
        topo = falha('Não deu para registrar a devolução.', 'Nada foi salvo: o saldo e o falta devolver não mudaram. O que você preencheu continua aqui. Tente de novo.', 'FIN-4E08-1811')
    val = {'abrir': '6.000,00', 'erros': '', 'falha': '1.000,00'}[v]
    dia = {'abrir': HOJE, 'erros': '25/11/2026', 'falha': HOJE}[v]
    valor = campo_e('dv-valor', 'Valor devolvido', val, im='decimal', foco=(v != 'falha'),
                    ajuda=f'Falta devolver: {R(5500)}.', erro='Escreva quanto o escritório devolveu.' if v == 'erros' else '')
    dia_c = campo('dv-dia', 'Dia em que saiu da conta', dia, im='numeric', ajuda='dd/mm/aaaa · entre 12/09/2026, quando o dinheiro entrou, e hoje',
                  erro='Esta data é depois de hoje. Registre quando o dinheiro sair da conta.' if v == 'erros' else '')
    acima = ''
    if v == 'abrir':
        acima = aviso('info', f'Passa {R(500)} do que falta devolver.',
                      f'O que passar de {R(5500)} fica como juros pagos à sócia: {R(500)}. Depois desta devolução, nada falta devolver e o empréstimo fica quitado.', icone='alerta')
    corpo = (topo + f'<div class="fi-alvo">{ico("pessoas")}<div><strong>Marina Ribeiro · sócia</strong><small>Pagar a folha de setembro · entrou em 12/09/2026 · sem juros</small></div>'
             f'<span class="fi-v num">{R(5500)}</span></div>'
             + f'<div class="fi-dois">{valor}{dia_c}</div>' + acima
             + f'<div class="fi-dois">{selecao("dv-forma", "Como saiu", ["Pix", "Transferência", "Dinheiro"], "Pix")}<div></div></div>'
             + f'<div class="campo"><span class="fi-rotulo">Comprovante <span style="font-weight:400;color:var(--texto-2)">(opcional)</span></span>'
             + (anexo('pix-devolucao-marina-18-11.pdf', '76 KB · anexado agora') if v != 'erros' else f'<button class="btn btn-sec" type="button" style="justify-self:start">{ico("mais")}Anexar comprovante</button>')
             + '<p class="ajuda">Vai junto na aba Empréstimos da exportação para o contador.</p></div>'
             + f'<p class="fi-caixa-fixa">{ico("trocar")}<span>Sai do caixa <b>do escritório</b> com a categoria Empréstimos, fora das despesas do dia a dia.</span></p>')
    rot = 'Tentar de novo' if v == 'falha' else 'Registrar devolução'
    pe = f'<button class="btn btn-sec" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="button"{" data-foco" if v == "falha" else ""}>{ico("check")}{rot}</button>'
    return janela('janela-dev', 'Empréstimo de Marina Ribeiro', 'Registrar devolução', 'Dinheiro que o escritório devolveu à sócia.', corpo, pe, abrir=True)


def j_encerrar():
    e = EMP['sicoob']
    n = numeros(e)
    corpo = (f'<ul class="fi-check em-o-que">'
             f'<li>{ico("x")}<span><b>As {n["abertas"]} parcelas em aberto ({R(n["falta"])}) serão canceladas</b><small>Saem de A pagar, da previsão do Caixa e do falta pagar. A próxima seria a 2/24, em 05/12.</small></span></li>'
             f'<li>{ico("check")}<span>O que entrou ({R(e["valor"])}) e a parcela paga ({R(e["parcela"])}) ficam<small>No saldo do Caixa e na exportação para o contador, como estão.</small></span></li></ul>'
             + texto_area('en-motivo', 'Motivo', 'Renegociado: virou um contrato novo no Sicoob, de 36 parcelas, que vou registrar em seguida.', foco=True, limite=300,
                          ajuda='De 5 a 300 caracteres. Fica no histórico.')
             + f'<div class="em-casos"><p class="fi-rotulo">Use para</p><ul class="fi-check">'
             f'<li>{ico("check")}<span><b>Quitar antes:</b> marque como paga uma parcela com o valor que o banco cobrou para quitar, e então encerre o resto.</span></li>'
             f'<li>{ico("check")}<span><b>Renegociar:</b> encerre este e registre o novo empréstimo.</span></li>'
             f'<li>{ico("check")}<span><b>Erro descoberto depois de pagar:</b> encerre e registre de novo, contando em “Já pagou antes” o que foi pago.</span></li></ul></div>'
             + f'<p class="fi-ref">{ico("historico")}<span>Nada se apaga. Fica no histórico, com o motivo, quem encerrou e quando. A ficha continua aberta, só para leitura.</span></p>')
    pe = (f'<button class="btn btn-sec" type="button" data-fechar>Voltar</button>'
          f'<a class="btn btn-perigo" href="{ARQ}em-encerrado">{ico("x")}Encerrar as {n["abertas"]} parcelas</a>')
    return janela('janela-enc', 'Empréstimo do Sicoob', 'Encerrar as parcelas que faltam', 'Para quitação antecipada, renegociação ou erro descoberto depois de pagar.', corpo, pe, alerta=True, abrir=True)


def j_cancelar():
    corpo = (f'<ul class="fi-check em-o-que">'
             f'<li>{ico("x")}<span><b>Sai do saldo do Caixa: {R(12500)}</b><small>O saldo de hoje volta a {R(contas_caixa(False)[1])}. Também sai da exportação para o contador.</small></span></li>'
             f'<li>{ico("x")}<span><b>As 14 parcelas em aberto ({R(17500)}) são canceladas</b><small>Saem de A pagar e da previsão.</small></span></li>'
             f'<li>{ico("historico")}<span>Fica no histórico, com o motivo<small>Nada se apaga. A ficha continua aberta, só para leitura.</small></span></li></ul>'
             + texto_area('cn-motivo', 'Motivo', 'Valor errado: entraram R$ 12.050,00, não R$ 12.500,00. Vou registrar de novo.', foco=True, limite=300,
                          ajuda='De 5 a 300 caracteres. Fica no histórico.')
             + f'<p class="fi-ref">{ico("ajuda")}<span>Só vale enquanto nada foi pago. Com uma parcela paga, use <b>Encerrar as parcelas que faltam</b>: o que entrou e o que foi pago ficam no caixa.</span></p>')
    pe = (f'<button class="btn btn-sec" type="button" data-fechar>Voltar</button>'
          f'<a class="btn btn-perigo" href="{ARQ}em-cancelado">{ico("x")}Marcar como lançado errado</a>')
    return janela('janela-can', 'Empréstimo do Sicredi', 'Lançado errado', 'Para um empréstimo registrado por engano ou com dados errados, sem nada pago.', corpo, pe, alerta=True, abrir=True)


# ================================================================= A pagar (T4)
def pagar_em():
    """O A pagar aprovado, com a parcela do Banco do Brasil e a linha de Empréstimos à parte."""
    h = F.pagar()
    bb = EMP['bb']
    selo_l = f'<a class="em-selo-link" href="{ARQ}em-ficha" aria-label="Empréstimo, parcela 19 de 40: abrir a ficha do Banco do Brasil"><span class="em-selo">{ico("trocar")}Empréstimo · 19/40</span></a>'
    row = (f'<tr><td><div class="fi-dt"><b class="num">20/11</b><small>sexta</small></div></td>'
           f'<td><div class="fi-quem"><strong>Empréstimo Banco do Brasil · parcela 19/40</strong><small>Banco do Brasil</small></div></td><td><span class="fi-cat">Empréstimos</span></td>'
           f'<td><div class="fi-forma">{selo_l}<small>Pronampe · nasceu do empréstimo</small></div></td><td><span class="fi-pq">Não tem nota fiscal</span></td><td class="fi-v num">{R(bb["parcela"])}</td>'
           f'<td class="fi-acao"><button class="btn btn-sec btn-compacto" type="button" aria-label="Marcar a parcela 19/40 do Banco do Brasil como paga">Paga</button></td></tr>')
    # entra depois das duas contas de 20/11 já aprovadas
    i = h.index('<td><div class="fi-dt"><b class="num">21/11</b>')
    i = h.rindex('<tr>', 0, i)
    h = h[:i] + row + h[i:]
    car = (f'<li class="cartao"><div class="c-topo"><div><strong class="c-nome">Empréstimo Banco do Brasil · parcela 19/40</strong><small>Banco do Brasil</small></div><span class="fi-cartao-v num" style="margin-left:auto">{R(bb["parcela"])}</span></div>'
           f'<dl class="c-dados"><dt>Vence</dt><dd class="num">20/11</dd><dt>Categoria</dt><dd>Empréstimos</dd><dt>Origem</dt><dd>Nasceu do empréstimo</dd></dl>'
           f'<div class="c-selos">{selo_l}</div><div class="c-acoes"><button class="btn btn-sec" type="button">Marcar como paga</button></div></li>')
    j = h.index('<strong class="c-nome">Sistema de petições</strong>')
    j = h.rindex('<li class="cartao">', 0, j)
    h = h[:j] + car + h[j:]
    h = h.replace(f'<b class="num">{R(7824.90)}</b><small>5 contas</small>', f'<b class="num">{R(7824.90 + bb["parcela"])}</b><small>6 contas, 1 de empréstimo</small>', 1)
    # Saídas por categoria: a linha Empréstimos fica abaixo de um divisor, fora do total
    emp_nov = meses_emp()[2][4]
    linha = (f'<div class="em-cat-parte"><p class="em-cat-rot">{ico("trocar")}À parte · não é despesa do dia a dia</p>'
             f'<div class="fi-barra" style="grid-template-columns:minmax(0,1fr) 110px"><span class="rot">Empréstimos <span class="fi-pq">(à parte)</span>'
             f'<small>2 parcelas e 1 devolução</small></span><span class="val"><b class="num">{R(emp_nov)}</b></span>'
             f'<span class="fi-trilho" style="grid-column:1/-1"><i class="em-barra" style="width:{emp_nov / 22000 * 100:.1f}%"></i></span></div></div>')
    h = h.replace(f'<p class="fi-total"><span>Pagas e a pagar no mês</span><b class="num">{R(40900)}</b></p>',
                  f'<p class="fi-total"><span>Pagas e a pagar no mês</span><b class="num">{R(40900)}</b></p>{linha}', 1)
    h = h.replace('Repasses a terceiros não entram aqui: não são despesa do escritório.',
                  'Repasses a terceiros não entram aqui: não são despesa do escritório. As parcelas de empréstimo também ficam fora do total.', 1)
    h = h.replace(f'href="{F.ARQ}nova-conta"', f'href="{ARQ}em-nova-conta"')
    return h


def j_nova_conta_em():
    j = F.j_nova_conta()
    j = j.replace('<option>Empréstimos</option>', '', 1)
    ajuda = (f'<p class="ajuda" id="nc-cat-aj">Parcela de empréstimo? Registre o empréstimo no Caixa e as parcelas nascem sozinhas. '
             f'<a href="{ARQ}em-registrar">Registrar no Caixa</a></p>')
    j = j.replace('<select class="entrada" id="nc-cat">', '<select class="entrada" id="nc-cat" aria-describedby="nc-cat-aj">', 1)
    k = j.index('id="nc-cat"')
    k = j.index('</select>', k) + len('</select>')
    j = j[:k] + ajuda + j[k:]
    return j


# ================================================================= Exportar (T5)
def j_exportar_em():
    j = FP.j_exportar('ok')
    linhas, _, _, _ = contas_caixa()
    s_set, s_out = linhas[0][6], linhas[1][6]
    j = j.replace(f'{R(28270)} em 30/09 e {R(32450)} em 31/10, a partir do saldo de abertura',
                  f'{R(s_set)} em 30/09 e {R(s_out)} em 31/10, a partir do saldo de abertura e com os empréstimos', 1)
    pag = EMP['bb']['parcela'] + 1000
    li = (f'<li class="em-li">{ico("trocar")}<span><b>Empréstimos numa aba à parte</b>'
          f'<small>1 recebido ({R(30000)}) e 2 pagamentos ({R(pag)}): 1 parcela e 1 devolução, 1 sem comprovante. Não são receita nem despesa; a aba traz o custo e o falta pagar de cada empréstimo.</small></span></li>')
    k = j.index('<li class="falta">')
    j = j[:k] + li + j[k:]
    j = j.replace(f'href="{FP.ARQ}', f'href="{ARQ}')
    return j


# ================================================================= CSS das peças novas
CSS_EM = r"""
/* ==========================================================================
   F3.51 · Empréstimos (FI-20). Prefixo em-.
   Empréstimo fica à parte, mas não é de terceiros: nunca leva âmbar.
   Usa só areia (sal, sal-2), papel e a família vinho, com os pares do Gabinete:
   vinho sobre sal-2 9,06:1 · vinho-2 sobre sal-2 6,7:1 · texto-2 sobre papel 6,1:1.
   ========================================================================== */
.em-faixa{display:flex;align-items:center;gap:10px;padding:10px 24px;background:var(--sal-2);color:var(--vinho);font-size:12px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;border-radius:var(--raio-g) var(--raio-g) 0 0;border-bottom:1px solid var(--divisor)}
.em-faixa .ico{width:18px;height:18px}
.em-selo{display:inline-flex;align-items:center;gap:5px;min-height:24px;padding:2px 10px;border-radius:12px;background:var(--sal-2);color:var(--vinho);font-size:12px;font-weight:500;white-space:nowrap}
.em-selo .ico{width:14px;height:14px}
.em-selo-linha{background:transparent;box-shadow:inset 0 0 0 1px var(--vinho-4);color:var(--vinho-2)}
.em-selos{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
.em-selos .selo{margin:0}
.em-linha{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:start;padding:16px 24px;border-top:1px solid var(--divisor)}
.em-linha:first-child{border-top:0}
.em-linha .fi-lado{max-width:230px}
.em-linha .em-det{line-height:1.45}
.em-linha .fi-quem a{margin:-12px 0 -10px}
.em-nota-l{margin-top:8px;font-size:12px;line-height:1.45;color:var(--texto-2);padding-left:10px;border-left:2px solid var(--vinho-4)}
.em-novo{background:#FCF8F5}
.em-pe{border-top:1px solid var(--divisor);padding-top:14px}
.em-pe b{font-weight:600;color:var(--texto)}
.em-vazio{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:14px 18px;border:1.5px dashed var(--vinho-4);border-radius:var(--raio-g);background:var(--papel)}
.em-vazio>.ico{color:var(--vinho);flex:none}
.em-vazio p{flex:1 1 300px;font-size:13px;line-height:1.5;color:var(--texto)}
.em-no-saldo{display:flex;gap:8px;align-items:flex-start;font-size:12px!important;color:var(--ambar-3)!important;margin-top:2px;position:relative;z-index:1}
.em-no-saldo .ico{width:16px;height:16px;color:var(--sal);flex:none;margin-top:1px}
.em-no-saldo b{color:var(--papel)}
.em-tab th,.em-tab td{text-align:right}
.em-tab th:first-child,.em-tab td:first-child{text-align:left}
.em-tab td small{display:block;font-size:12px;color:var(--texto-2);font-weight:400;white-space:nowrap}
.em-tab .em-r{font-weight:500;white-space:nowrap}
.em-tab .em-saldo{font-weight:600;white-space:nowrap}
.em-tab .em-col{background:var(--sal-2)}
.em-tab thead .em-col{background:var(--sal)}
.em-th-sub{font-size:11px;letter-spacing:.08em;color:var(--texto-2);text-transform:none}
.em-tab tr.fi-futuro .em-r{color:var(--texto-2);font-weight:400}
/* Janela de registrar */
.em-tres{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.em-dois-op{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.em-op{border:1px solid var(--borda-folha);border-radius:var(--raio);padding:10px 12px;align-items:flex-start}
.em-op:has(input:checked){border-color:var(--vinho);background:var(--sal-2);box-shadow:inset 0 0 0 1px var(--vinho)}
.em-op span{display:grid;gap:2px}
.em-op span .ico{width:18px;height:18px;color:var(--vinho);margin-bottom:2px}
.em-op b{font-weight:500}
.em-duvida,.em-mais,.em-lista{border-radius:var(--raio)}
.em-duvida summary,.em-mais summary,.em-lista summary{display:inline-flex;align-items:center;gap:8px;min-height:44px;font-size:13px;font-weight:500;color:var(--vinho);cursor:pointer;list-style:none}
.em-duvida summary::-webkit-details-marker,.em-mais summary::-webkit-details-marker,.em-lista summary::-webkit-details-marker{display:none}
.em-duvida summary:hover,.em-mais summary:hover,.em-lista summary:hover{text-decoration:underline}
.em-duvida{margin-top:-8px}
.em-duvidas{list-style:none;margin:0;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);display:grid;gap:8px}
.em-duvidas li{display:grid;grid-template-columns:18px minmax(0,1fr);gap:10px;font-size:13px;line-height:1.5}
.em-duvidas .ico{width:18px;height:18px;color:var(--vinho);margin-top:1px}
.em-duvidas b{font-weight:600}
.em-mais{margin-top:-8px}
.em-mais .campo{margin-top:4px}
.em-previa{display:grid;gap:8px;padding:14px 16px;border-radius:var(--raio);background:var(--sal-2)}
.em-previa .fi-rotulo{font-size:12px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--vinho-2)}
.em-previa-l{font-size:14px;line-height:1.5}
.em-previa-l b{font-weight:600;color:var(--vinho)}
.em-previa-c{font-size:13px;line-height:1.5}
.em-previa-c b{font-weight:600}
.em-previa-c small{display:block;font-size:12px;color:var(--texto-2)}
.em-previa-vazia{background:transparent;border:1.5px dashed var(--vinho-4)}
.em-previa-vazia .em-previa-l{font-size:13px;color:var(--texto-2)}
.em-lista{border-top:1px solid var(--divisor);padding-top:2px}
.em-lista .ajuda{margin:0 0 10px}
.em-parc-lista{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:8px 16px}
.em-parc-lista li{display:grid;grid-template-columns:88px minmax(0,1fr);gap:10px;align-items:center}
.em-parc-lista label{display:grid;font-size:13px;line-height:1.3}
.em-parc-lista label b{font-weight:500}
.em-parc-lista label small{font-size:12px;color:var(--texto-2)}
.em-parc-lista .entrada{min-height:44px;height:44px;text-align:right;background:var(--papel)}
.em-c6{padding:12px 14px;border-radius:var(--raio);border:1.5px solid var(--vinho-4)}
.em-c6 legend{float:left;width:100%;font-size:14px;line-height:1.5;font-weight:500;margin-bottom:8px}
.em-c6 .opcao small{display:block}
/* Ficha */
.em-cab .dir.em-dir{background:var(--papel);color:var(--tinta)}
.em-dir .sobretitulo{color:var(--vinho-2)!important}
.em-dir .grande{color:var(--vinho)!important}
.em-dir .fi-oque{color:var(--texto)}
.em-dir .btn{align-self:flex-start}
.em-selo-claro{background:var(--sal)!important;color:var(--vinho)!important;display:inline-flex;align-items:center;gap:5px}
.em-selo-claro .ico{width:14px;height:14px}
.em-quatro dd{font-size:21px}
.em-quatro .em-q-sub{display:block;margin-top:4px;font-family:var(--sans);font-size:12px;line-height:1.4;color:var(--texto-2);font-weight:400}
.em-aviso-topo{margin-top:16px}
.em-motivo .aviso{background:var(--papel)}
.em-falta-comp{display:grid;gap:4px;justify-items:start}
.fi-tab tr.em-cancelada td{color:var(--texto-2)}
.fi-tab tr.em-cancelada .fi-v{text-decoration:line-through;text-decoration-color:var(--vinho-4)}
.em-pe-corpo{padding:0 24px 20px;display:grid;gap:12px}
.em-pe-corpo p{font-size:13px;line-height:1.5;color:var(--texto-2)}
.em-pe-corpo .btn{justify-self:start}
.em-o-que li .ico{color:var(--vinho-3)}
.em-o-que li:nth-child(n+2) .ico{color:var(--vinho)}
.em-casos{padding:12px 14px;border-radius:var(--raio);background:var(--sal-2)}
.em-casos .fi-check li{border-top-color:var(--sal)}
/* A pagar */
.em-selo-link{display:inline-flex;align-items:center;min-height:44px;margin:-10px 0;text-decoration:none}
.em-selo-link:hover .em-selo{text-decoration:underline;background:var(--sal)}
.c-selos .em-selo-link{margin:0}
.em-cat-parte{margin:0 24px 6px;padding:12px 0 6px;border-top:2px dashed var(--vinho-4)}
.em-cat-rot{display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:12px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--vinho-2)}
.em-cat-rot .ico{width:16px;height:16px}
.em-cat-parte .fi-barra .rot small{display:block}
.fi-trilho i.em-barra{background:var(--sal-2);box-shadow:inset 0 0 0 1.5px var(--vinho-2);background-image:repeating-linear-gradient(135deg,transparent 0 5px,rgba(105,39,70,.28) 5px 6.5px)}
/* Exportar */
.fi-check li.em-li .ico{color:var(--vinho)}
.fi-check li.em-li b{font-weight:600}
@media (max-width:760px){
  .em-faixa{padding:10px 16px}
  .em-linha{grid-template-columns:minmax(0,1fr);padding:14px 16px;gap:8px}
  .em-linha .fi-lado{justify-items:start;text-align:left;max-width:none}
  .em-tres,.em-dois-op{grid-template-columns:1fr}
  .em-parc-lista{grid-template-columns:1fr}
  .em-pe-corpo{padding:0 16px 16px}
  .em-pe-corpo .btn{justify-self:stretch}
  .em-cat-parte{margin:0 16px 6px}
  .em-vazio .btn{flex:1 1 100%}
  .em-dir .btn{align-self:stretch}
  .em-quatro dd{font-size:19px}
}
"""

# ================================================================= estados
CX = dict(trilha='Financeiro|Caixa')
T = ''
# T1 · Caixa
T += tpl('em-caixa', caixa_em(), **A('Caixa'))
T += tpl('em-vazio', caixa_em('vazio'), **A('Caixa'))
# T2 · Registrar empréstimo
T += tpl('em-registrar', caixa_em() + j_registrar('abrir'), **A('Caixa', 'Registrar empréstimo'))
T += tpl('em-registrar-parcelas', caixa_em() + j_registrar('parcelas'), **A('Caixa', 'Registrar empréstimo'))
T += tpl('em-registrar-antigo', caixa_em() + j_registrar('antigo'), **A('Caixa', 'Registrar empréstimo'))
T += tpl('em-registrar-livre', caixa_em() + j_registrar('livre'), **A('Caixa', 'Registrar empréstimo'))
T += tpl('em-registrar-erros', caixa_em() + j_registrar('erros'), **A('Caixa', 'Registrar empréstimo'))
T += tpl('em-registrar-falha', caixa_em() + j_registrar('falha'), **A('Caixa', 'Registrar empréstimo'))
T += tpl('em-registrado', caixa_em('novo', extra=toast('Empréstimo registrado. As 14 parcelas já estão em A pagar.',
                                                       f'Sicredi: {R(12500)} entraram no saldo do Caixa, sem contar como receita. A primeira parcela vence em 10/12/2026.')), **A('Caixa'))
# T3 · Ficha
FB = dict(trilha='Financeiro|Caixa|Banco do Brasil')
T += tpl('em-ficha', ficha('bb'), **A('Caixa', 'Banco do Brasil', FB['trilha']))
T += tpl('em-ficha-sicoob', ficha('sicoob'), **A('Caixa', 'Sicoob', 'Financeiro|Caixa|Sicoob'))  # só no HTML, para o clique
T += tpl('em-ficha-livre', ficha('marina'), **A('Caixa', 'Marina Ribeiro', 'Financeiro|Caixa|Marina Ribeiro'))
T += tpl('em-devolucao', ficha('marina') + j_devolucao('abrir'), **A('Caixa', 'Registrar devolução', 'Financeiro|Caixa|Marina Ribeiro'))
T += tpl('em-devolucao-erros', ficha('marina') + j_devolucao('erros'), **A('Caixa', 'Registrar devolução', 'Financeiro|Caixa|Marina Ribeiro'))
T += tpl('em-devolucao-falha', ficha('marina') + j_devolucao('falha'), **A('Caixa', 'Registrar devolução', 'Financeiro|Caixa|Marina Ribeiro'))
T += tpl('em-encerrar', ficha('sicoob') + j_encerrar(), **A('Caixa', 'Encerrar as parcelas que faltam', 'Financeiro|Caixa|Sicoob'))
EV_ENC = ('<li><time>10h40</time><span class="pto forte" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> encerrou as parcelas que faltavam<span class="selo selo-ativo">Novo</span></p>'
          f'<small>23 parcelas canceladas ({R(33350)}). “Renegociado: virou um contrato novo no Sicoob, de 36 parcelas, que vou registrar em seguida.”</small></div></li>')
T += tpl('em-encerrado', ficha('sicoob', 'encerrado', EV_ENC), **A('Caixa', 'Sicoob', 'Financeiro|Caixa|Sicoob'))
T += tpl('em-cancelar', ficha('sicredi') + j_cancelar(), **A('Caixa', 'Lançado errado', 'Financeiro|Caixa|Sicredi'))
EV_CAN = ('<li><time>10h51</time><span class="pto forte" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> marcou como lançado errado<span class="selo selo-ativo">Novo</span></p>'
          f'<small>Saiu do caixa ({R(12500)}) e as 14 parcelas foram canceladas. “Valor errado: entraram R$ 12.050,00, não R$ 12.500,00. Vou registrar de novo.”</small></div></li>')
T += tpl('em-cancelado', ficha('sicredi', 'cancelado', EV_CAN), **A('Caixa', 'Sicredi', 'Financeiro|Caixa|Sicredi'))
# T4 · A pagar
T += tpl('em-pagar', pagar_em(), **A('A pagar'))
T += tpl('em-nova-conta', pagar_em() + j_nova_conta_em(), **A('A pagar', 'Lançar conta'))
# T5 · Exportar
T += tpl('em-exportar', caixa_em() + j_exportar_em(), **A('Caixa', 'Exportar para o contador'))

# Tira os estados antigos (ficam nas telas aprovadas) e põe os novos
out = re.sub(r'<template data-est="[^"]+"[^>]*>.*?</template>\n', '', FP.out, flags=re.S)
out = injetar(out, T, CSS_EM, padrao='em-caixa')
out = out.replace(f'<title>Financeiro · Ribeiro &amp; Matos · T3jus</title>', '<title>Empréstimos · Ribeiro &amp; Matos · T3jus</title>', 1)
# A barra de seções leva aos estados desta tela
for s, e in [('Resumo', None), ('A receber', None), ('A pagar', 'em-pagar'), ('Repasses', None), ('Caixa', 'em-caixa')]:
    out = re.sub(r'href="financeiro\.html\?estado=[a-z-]+"( aria-current="page")?>' + re.escape(s) + '</a>',
                 (lambda m, e=e, s=s: f'href="{ARQ + e if e else "#"}"{m.group(1) or ""}>{s}</a>'), out)
out = out.replace('financeiro.html?estado=', ARQ)
open(os.path.join(SAIDA, 'emprestimos.html'), 'w', encoding='utf-8').write(out)
print('emprestimos ok', T.count('<template data-est='), 'estados')
