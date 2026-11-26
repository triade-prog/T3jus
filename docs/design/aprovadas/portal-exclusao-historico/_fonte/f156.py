# F3.156 · Janela de exclusão a pedido do titular: a despesa adiantada ao cliente e os arquivos dela
# (nota, guia, boleto ou comprovante), que ficam guardados pela lei fiscal.
# Parte do desenho aprovado da F3.155 (docs/design/aprovadas/portal-exclusao-arquivos): executa o
# f155.py aprovado até antes dos estados dele, acrescenta as peças novas e grava exclusao.html.
# Peças novas com prefixo f156-. Uso: python3 f156.py <pasta-saida>
import sys, os

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'

_src155 = open(os.path.join(AQUI, 'f155.py'), encoding='utf-8').read()
_corte155 = _src155.index("\nT = ''\n")
G = {'__name__': 'f155_aprovado', '__file__': os.path.join(AQUI, 'f155.py')}
exec(compile(_src155[:_corte155], 'f155.py', 'exec'), G)
NS, ico, tpl, janelas = G['NS'], G['ico'], G['tpl'], G['janelas']
linha_arquivos, some, janela_com, sem_obrig = G['linha_arquivos'], G['some'], G['janela_com'], G['sem_obrig']
ANT, FX, FICHA_ANT, FICA_APROV = G['ANT'], G['FX'], G['FICHA_ANT'], G['FICA_APROV']
_src_pd = open(os.path.join(AQUI, 'pendencias.py'), encoding='utf-8').read()
_corte_pd = _src_pd.index('# ---------------------------------------------------------------- página')


# ---------------------------------------------------------------- dados (o campo arquivosQueFicam da ficha, plano 2.4)
def aqf(despesas=0, com_arquivo=0, arquivos=0, pastas=0, ate=None):
    return dict(despesas=despesas, comArquivo=com_arquivo, arquivos=arquivos, pastas=pastas, ate=ate)


def dma(iso):
    a, m, d = iso.split('-')
    return f'{d}/{m}/{a}'


# ---------------------------------------------------------------- 1. a linha nova de "O que é apagado"
def linha_despesa(q):
    """Aparece quando há despesa adiantada ao cliente, com ou sem arquivo."""
    n = q['despesas']
    if not n:
        return ''
    t = 'A descrição da despesa adiantada' if n == 1 else f'A descrição das {n} despesas adiantadas'
    sub = ('vira “Despesa adiantada a cliente excluído”.' if n == 1 else 'viram “Despesa adiantada a cliente excluído”.')
    sub += ' O valor, as datas e o reembolso continuam no Financeiro.'
    return f'<li class="f156-novo">{t}<small>{sub}</small></li>'


# ---------------------------------------------------------------- 2. o quadro "O que a lei obriga a guardar" (recomendado)
def linha_arquivos_ficam(q):
    a, c = q['arquivos'], q['comArquivo']
    if a == 1:
        t = 'O arquivo da despesa adiantada'
        sub = 'a nota, guia, boleto ou comprovante, com o nome trocado pelo tipo, como “Nota fiscal.pdf”. '
    else:
        t = f'Os {a} arquivos da despesa adiantada' if c == 1 else f'Os {a} arquivos das {c} despesas adiantadas'
        sub = 'notas, guias, boletos ou comprovantes, com o nome trocado pelo tipo, como “Nota fiscal.pdf”. '
    if q['ate']:
        sub += f'O T3jus apaga sozinho em {dma(q["ate"])}.'
    else:
        sub += 'Enquanto houver despesa em aberto, não há data: o T3jus apaga sozinho em 1º de janeiro do 7º ano depois do pagamento.'
    return f'<li>{t}<small>{sub}</small></li>'


def linha_pastas(q):
    p = q['pastas']
    if not p:
        return ''
    t = 'A pasta mandada ao contador' if p == 1 else f'As {p} pastas mandadas ao contador'
    sub = ('fica como foi montada, com a descrição antiga no nome dos arquivos. A cópia do T3jus sai pela regra do mês da pasta; a que o contador recebeu fica fora do T3jus.'
           if p == 1 else
           'ficam como foram montadas, com a descrição antiga no nome dos arquivos. As cópias do T3jus saem pela regra do mês de cada pasta; as que o contador recebeu ficam fora do T3jus.')
    return f'<li>{t}<small>{sub}</small></li>'


def guarda(q):
    if not q['arquivos']:
        return ''
    return (f'<div class="pd-lado pd-guarda f156-novo"><h3>{ico("cadeado")}O que a lei obriga a guardar</h3><ul>'
            f'{linha_arquivos_ficam(q)}{linha_pastas(q)}</ul>'
            f'<p class="pd-arq-nota">Ficam pela obrigação fiscal do escritório, que vale mesmo com o pedido do titular (LGPD, art. 16, I).</p></div>')


def nota_pe(q, quem='Antônia', dela='dela'):
    """A faixa do escudo. Só a frase em negrito muda, e só quando há arquivo guardado."""
    base = sem_obrig(quem, dela)
    if not q['arquivos']:
        return base
    velho = '<b>Nada aqui precisa ser guardado por lei.</b>'
    assert velho in base
    novo = '<b>Fora esses arquivos, nada aqui precisa ser guardado por lei.</b>' if q['arquivos'] > 1 or q['pastas'] else '<b>Fora esse arquivo, nada aqui precisa ser guardado por lei.</b>'
    return base.replace(velho, f'<span class="f156-novo">{novo}</span>')


# ---------------------------------------------------------------- 3. alternativa B: o título muda e a linha vai para "O que fica" (a proposta do plano)
def fica_alt(q):
    f = FICA_APROV
    assert 'O que fica, sem dado pessoal</h3>' in f
    f = f.replace('O que fica, sem dado pessoal</h3>', '<span class="f156-novo">O que fica</span></h3>')
    a = q['arquivos']
    t = 'A nota, guia, boleto ou comprovante da despesa' if a == 1 else f'Os {a} arquivos das {q["comArquivo"]} despesas adiantadas'
    sub = (f'guardados pela lei fiscal até {dma(q["ate"])}, com o nome do arquivo trocado pelo tipo. Depois, o T3jus apaga sozinho (LGPD, art. 16, I).')
    novo = f'<li class="f156-novo">{t}<small>{sub}</small></li>'
    i = f.index('<li>Data, canal')
    return f[:i] + novo + f[i:]


def nota_pe_alt(q):
    base = sem_obrig('Antônia')
    velho = '<b>Nada aqui precisa ser guardado por lei.</b>'
    return base.replace(velho, '<span class="f156-novo"><b>Só a nota da despesa fica, pela lei fiscal.</b></span>')


# ---------------------------------------------------------------- estados
BASE_ARQ = linha_arquivos(3, 'curatela', 1)  # a linha da F3.155 do estado aprovado excluir-arquivos


def janela_despesa(q):
    return janela_com(some(arquivos=BASE_ARQ + linha_despesa(q), **ANT), None, guarda(q) + nota_pe(q))


# Conferência: sem despesa, a janela é a aprovada da F3.155 (estado excluir-arquivos), letra por letra
_aprov = janela_com(some(arquivos=BASE_ARQ, **ANT))
assert janela_despesa(aqf()) == _aprov, 'sem despesa, a janela precisa ser igual à aprovada'
assert nota_pe(aqf()) == G['SEM_OBRIG_APROV']

CASOS = {
    'despesa-nenhuma': aqf(),
    'despesa-paga-nota': aqf(1, 1, 1, 0, '2033-01-01'),
    'despesa-em-aberto': aqf(2, 2, 2, 0, None),
    'despesa-pasta-contador': aqf(1, 1, 2, 1, '2033-01-01'),
    'despesa-sem-arquivo': aqf(1, 0, 0, 0, None),
}
T = ''
for nome, q in CASOS.items():
    T += tpl(nome, FICHA_ANT + janela_despesa(q), **FX)
# A alternativa B (fica_alt, nota_pe_alt) foi recusada pela Carol em 24/11/2026 e não é gerada.

# Anotação de desenho (não vai para o produto): contorno tracejado em âmbar no que é novo
CSS_F156 = r"""
/* F3.156 · anotação só do desenho: o que é novo leva contorno tracejado em âmbar. No produto, não há contorno. */
.f156-novo{outline:2px dashed #DD9760;outline-offset:4px;border-radius:2px}
.pd-lado.f156-novo{outline-offset:3px}
span.f156-novo{outline:none;text-decoration:underline dashed #DD9760 2px;text-underline-offset:5px}
"""

# ---------------------------------------------------------------- página (a montagem aprovada, gravando exclusao.html)
NS['T'] = T
NS['CSS_F156'] = CSS_F156
_pag = _src_pd[_corte_pd:]
_pag = _pag.replace("'{\"estado\":\"inicio\",\"atual\":\"inicio\"}'", "'{\"estado\":\"despesa-paga-nota\",\"atual\":\"clientes\"}'")
_pag = _pag.replace("CSS_PD + '\\n</style>'", "CSS_PD + '\\n' + CSS_F156 + '\\n</style>'")
_pag = _pag.replace("os.path.join(SAIDA, 'pendencias.html')", "os.path.join(SAIDA, 'exclusao.html')")
_pag = _pag.replace("print('pendencias ok'", "print('exclusao ok'")
assert 'CSS_F156' in _pag and 'exclusao.html' in _pag and 'despesa-paga-nota' in _pag
exec(compile(_pag, 'pendencias.py (página)', 'exec'), NS)
_arq = os.path.join(SAIDA, 'exclusao.html')
_h = open(_arq, encoding='utf-8').read()
_h = _h.replace('pendencias.html?estado=', 'exclusao.html?estado=').replace(NS['CLIENTES_APROV'], 'exclusao.html')
open(_arq, 'w', encoding='utf-8').write(_h)
