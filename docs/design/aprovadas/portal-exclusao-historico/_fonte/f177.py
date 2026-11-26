# F3.177 · Janela de exclusão a pedido do titular: os lançamentos importados do sistema antigo
# (historico_financeiro_anterior) e o detalhe escrito ao dispensar o lembrete de contrato
# (lembrete_contrato.dispensa_detalhe) ficam guardados com a descrição até o fim do prazo do imposto,
# como os arquivos das despesas da F3.156 (decisão da Carol, 25/11/2026), e só então viram texto fixo.
# Parte do desenho aprovado da F3.156 (docs/design/aprovadas/portal-exclusao-despesas): executa o
# f156.py aprovado até antes dos estados dele, acrescenta as peças novas e grava exclusao.html.
# Peças novas com prefixo f177-. A alternativa B (o lançamento sem data perde a descrição na hora) foi
# recusada pela Carol (26/11/2026) e não é mais gerada. Uso: python3 f177.py <pasta-saida>
import sys, os

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'

_src156 = open(os.path.join(AQUI, 'f156.py'), encoding='utf-8').read()
_corte156 = _src156.index('\nCASOS = {')
G = {'__name__': 'f156_aprovado', '__file__': os.path.join(AQUI, 'f156.py')}
_argv = sys.argv
sys.argv = [sys.argv[0], SAIDA]
exec(compile(_src156[:_corte156], 'f156.py', 'exec'), G)
sys.argv = _argv
NS, ico, tpl = G['NS'], G['ico'], G['tpl']
aqf, dma, linha_despesa, linha_arquivos_ficam, linha_pastas = G['aqf'], G['dma'], G['linha_despesa'], G['linha_arquivos_ficam'], G['linha_pastas']
guarda156, nota_pe156, janela_despesa = G['guarda'], G['nota_pe'], G['janela_despesa']
some, janela_com, sem_obrig, BASE_ARQ = G['some'], G['janela_com'], G['sem_obrig'], G['BASE_ARQ']
ANT, FX, FICHA_ANT = G['ANT'], G['FX'], G['FICHA_ANT']
_src_pd, _corte_pd = G['_src_pd'], G['_corte_pd']


# ---------------------------------------------------------------- dados (a chave nova historico, dentro de arquivosQueFicam)
def hist(lancamentos=0, detalhes=0, sem_data=0, origem='ASTREA', ate=None):
    """lancamentos: linhas de historico_financeiro_anterior do cliente, fora as desfeitas;
    detalhes: lembretes dispensados com dispensa_detalhe; sem_data: lançamentos sem data, que contam pela
    data da importação; origem: ASTREA, ADVBOX_PLANILHA ou None (mais de um sistema); ate: o dia da troca
    (aaaa-mm-dd, 1º de janeiro), o maior entre os lançamentos e os detalhes."""
    return dict(lancamentos=lancamentos, detalhes=detalhes, semData=sem_data, origem=origem, ate=ate)


SISTEMA = {'ASTREA': 'do Astrea', 'ADVBOX_PLANILHA': 'do ADVBOX'}


# ---------------------------------------------------------------- 1. a linha nova do quadro "O que a lei obriga a guardar"
def linha_historico(h):
    n, d, s = h['lancamentos'], h['detalhes'], h['semData']
    if not n:
        return ''
    sis = SISTEMA.get(h['origem'], 'do sistema antigo')
    t = f'A descrição do lançamento {sis}' if n == 1 else f'A descrição dos {n} lançamentos {sis}'
    sub = 'fica como veio na importação'
    if d:
        sub += (', com o detalhe escrito ao dispensar o lembrete de contrato' if d == 1 else
                ', com os detalhes escritos ao dispensar os lembretes de contrato')
    sub += '. '
    if s:
        sub += ('Ele veio sem data e conta pela data da importação. ' if n == 1 else
                'Um deles veio sem data e conta pela data da importação. ' if s == 1 else
                f'{s} deles vieram sem data e contam pela data da importação. ')
    assert h['ate'], 'com lançamento, sempre há data (o sem data conta pela importação)'
    sub += f'O T3jus troca sozinho por um texto fixo em {dma(h["ate"])}. A data, o valor e se foi pago não mudam.'
    return f'<li class="f177-novo">{t}<small>{sub}</small></li>'


def guarda(q, h):
    """O quadro aprovado da F3.156, com a linha do histórico no fim. Aparece com arquivo ou com lançamento."""
    lh = linha_historico(h)
    if not lh:
        return guarda156(q)
    if q['arquivos']:
        g = guarda156(q)
        i = g.index('</ul>')
        return g[:i] + lh + g[i:]
    return (f'<div class="pd-lado pd-guarda f177-novo"><h3>{ico("cadeado")}O que a lei obriga a guardar</h3><ul>{lh}</ul>'
            f'<p class="pd-arq-nota">Ficam pela obrigação fiscal do escritório, que vale mesmo com o pedido do titular (LGPD, art. 16, I).</p></div>')


# ---------------------------------------------------------------- 2. a faixa do escudo: só a frase em negrito
def nota_pe(q, h, quem='Antônia'):
    if not h['lancamentos']:
        return nota_pe156(q, quem)
    base = sem_obrig(quem)
    velho = '<b>Nada aqui precisa ser guardado por lei.</b>'
    assert velho in base
    desc = 'essa descrição' if h['lancamentos'] == 1 and not h['detalhes'] else 'essas descrições'
    if q['arquivos']:
        arq = 'esse arquivo' if q['arquivos'] == 1 and not q['pastas'] else 'esses arquivos'
        novo = f'Fora {arq} e {desc}, nada aqui precisa ser guardado por lei.'
    else:
        novo = f'Fora {desc}, nada aqui precisa ser guardado por lei.'
    return base.replace(velho, f'<span class="f177-novo"><b>{novo}</b></span>')


# ---------------------------------------------------------------- estados
def janela(q, h):
    return janela_com(some(arquivos=BASE_ARQ + linha_despesa(q), **ANT), None, guarda(q, h) + nota_pe(q, h))


# Conferência: sem lançamento importado, a janela é a aprovada da F3.156 (a de hoje), letra por letra
for _q in (aqf(), aqf(1, 1, 1, 0, '2033-01-01'), aqf(2, 2, 2, 0, None), aqf(1, 1, 2, 1, '2033-01-01'), aqf(1, 0, 0, 0, None)):
    assert janela(_q, hist()) == janela_despesa(_q), 'sem histórico, a janela precisa ser igual à aprovada'

CASOS = {
    'historico-nenhum': (aqf(), hist()),
    'historico-so': (aqf(), hist(12, 1, 0, 'ASTREA', '2033-01-01')),
    'historico-e-despesas': (aqf(1, 1, 1, 0, '2033-01-01'), hist(1, 0, 0, 'ASTREA', '2031-01-01')),
    'historico-em-aberto': (aqf(2, 2, 2, 0, None), hist(4, 1, 0, 'ASTREA', '2032-01-01')),
    'historico-sem-data': (aqf(), hist(3, 0, 1, 'ASTREA', '2033-01-01')),
}
T = ''
for nome, (q, h) in CASOS.items():
    T += tpl(nome, FICHA_ANT + janela(q, h), **FX)

# Anotação de desenho (não vai para o produto): contorno tracejado em âmbar no que é novo
CSS_F177 = r"""
/* F3.177 · anotação só do desenho: o que é novo leva contorno tracejado em âmbar. No produto, não há contorno.
   As peças da F3.156, já aprovadas e programadas, ficam sem contorno. */
.f156-novo{outline:none!important;text-decoration:none!important}
.f177-novo{outline:2px dashed #DD9760;outline-offset:4px;border-radius:2px}
.pd-lado.f177-novo{outline-offset:3px}
span.f177-novo{outline:none;text-decoration:underline dashed #DD9760 2px;text-underline-offset:5px}
"""

# ---------------------------------------------------------------- página (a montagem aprovada, gravando exclusao.html)
NS['T'] = T
NS['CSS_F177'] = CSS_F177
_pag = _src_pd[_corte_pd:]
_pag = _pag.replace("'{\"estado\":\"inicio\",\"atual\":\"inicio\"}'", "'{\"estado\":\"historico-so\",\"atual\":\"clientes\"}'")
_pag = _pag.replace("CSS_PD + '\\n</style>'", "CSS_PD + '\\n' + CSS_F177 + '\\n</style>'")
_pag = _pag.replace("os.path.join(SAIDA, 'pendencias.html')", "os.path.join(SAIDA, 'exclusao.html')")
_pag = _pag.replace("print('pendencias ok'", "print('exclusao ok'")
assert 'CSS_F177' in _pag and 'exclusao.html' in _pag and 'historico-so' in _pag
exec(compile(_pag, 'pendencias.py (página)', 'exec'), NS)
_arq = os.path.join(SAIDA, 'exclusao.html')
_h = open(_arq, encoding='utf-8').read()
_h = _h.replace('pendencias.html?estado=', 'exclusao.html?estado=').replace(NS['CLIENTES_APROV'], 'exclusao.html')
open(_arq, 'w', encoding='utf-8').write(_h)
