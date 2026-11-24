# Portal · jornada do cliente: as 8 mudanças que fecham as lacunas (AP-07, CH-11, CH-12, CH-13, EX-16, EX-17).
# Parte do desenho aprovado da ficha ligada (ficha_ligada.py, lido até os estados, sem mudança, que por sua vez
# lê clientes.py e juridico.py) e das telas aprovadas de Contratos, Procurações e modelos, Financeiro, Conversas
# e Agenda, lidas do HTML aprovado em docs/design/aprovadas/ (CSS, barras de área e os estados de base, só lidos).
# Peças novas com prefixo jf-. Uso: python3 jornada.py <pasta-saida>
import os, sys, re, json

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
APROV = os.environ.get('APROV', '/home/claude/t3jus/docs/design/aprovadas/')

_corte = '# ---------------------------------------------------------------- estados'
_src = open(os.path.join(AQUI, 'ficha_ligada.py'), encoding='utf-8').read()
sys.argv = [sys.argv[0], SAIDA]
exec(compile(_src[:_src.rindex('\n' + _corte) + 1], 'ficha_ligada.py', 'exec'), globals())
import comum

# A navegação de estados do index usa o id fl-estados (ficha_ligada); aqui o painel tem o mesmo comportamento.

# ---------------------------------------------------------------- telas aprovadas (só leitura)
def _ler(rel):
    return open(APROV + rel, encoding='utf-8').read()


def _tpls(s):
    out = {}
    for m in re.finditer(r'<template data-est="([^"]+)"([^>]*)>\n?(.*?)\n?</template>', s, re.S):
        out[m.group(1)] = m.group(3)
    return out


def _css_area(s):
    st = s[s.index('<style>') + 7:s.index('</style>')]
    return st.split(comum.CSS_PORTAL, 1)[1] if comum.CSS_PORTAL in st else ''


PAGS = {k: _ler(v) for k, v in {
    'pr': 'portal-procuracoes/procuracoes.html', 'ct': 'portal-comercial-contratos/contratos.html',
    'fi': 'portal-financeiro/financeiro.html', 'cv': 'portal-agenda-conversas/conversas.html',
    'ag': 'portal-agenda-conversas/agenda.html', 'cl': 'portal-clientes/clientes.html'}.items()}
TP = {k: _tpls(v) for k, v in PAGS.items()}

_CSS_JA = CSS_CL + J['CSS_JU'] + CSS_FL
CSS_EXTRA = ''
for k in ('ct', 'pr', 'fi', 'cv', 'ag'):
    c = _css_area(PAGS[k])
    # tira o que já está (Clientes e Jurídico aprovados) e o que outra página já trouxe
    for bloco in (CSS_CL, J['CSS_JU']):
        c = c.replace(bloco, '')
    if c.strip() and c not in CSS_EXTRA:
        CSS_EXTRA += f'\n/* ===== da tela aprovada: {k} ===== */\n' + c

BARRAS = {}
for k in ('ct', 'pr', 'fi', 'cv'):
    for m in re.finditer(r'<template data-barra="([^"]+)">(.*?)</template>', PAGS[k], re.S):
        BARRAS.setdefault(m.group(1), m.group(0))
for m in re.finditer(r'<template data-barra="([^"]+)">(.*?)</template>', J['BARRAS'], re.S):
    BARRAS.setdefault(m.group(1), m.group(0))
for s in AREA['contratos'][3]:
    BARRAS.setdefault(f'contratos|{s}', f'<template data-barra="contratos|{s}">{barra_area("contratos", s)}</template>')
for s in AREA['financeiro'][3]:
    BARRAS.setdefault(f'financeiro|{s}', f'<template data-barra="financeiro|{s}">{barra_area("financeiro", s)}</template>')


def sem_links(h):
    """Os links das telas aprovadas apontam para os arquivos delas; aqui viram '#'."""
    return re.sub(r'href="(?:\.\./[^"]*|[a-z-]+\.html(?:\?[^"]*)?)"', 'href="#"', h)


def troca(h, pares):
    for a, b in pares:
        assert a in h, ('não achei', a[:80])
        h = h.replace(a, b)
    return h


CSS_JF = r"""
/* ==========================================================================
   Portal · jornada do cliente e fechamento (prefixo jf-). Só tokens e pares já aprovados.
   ========================================================================== */
/* Âmbar do topo: o fechamento do caso, item por item */
.jf-fecha{list-style:none;margin:2px 0 0;padding:0;display:grid;gap:6px}
.jf-fecha li{display:grid;grid-template-columns:22px minmax(0,1fr);gap:8px;align-items:start;font-size:13px;line-height:1.4;color:var(--tinta)}
.jf-fecha .jf-m{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;box-shadow:inset 0 0 0 1.5px rgba(79,29,53,.55);font-size:11px;font-weight:600;color:var(--tinta)}
.jf-fecha .jf-m .ico{width:13px;height:13px}
.jf-fecha li.jf-ok .jf-m{background:var(--vinho);color:var(--papel);box-shadow:none}
.jf-fecha li.jf-ag .jf-m{background:var(--papel);color:var(--vinho);box-shadow:inset 0 0 0 2px var(--vinho)}
.jf-fecha li.jf-ag b{font-weight:600}
.jf-fecha small{display:block;font-size:12px;color:#4F1D35}
.jf-fecha li.jf-ok>span:last-child{color:var(--tinta)}
.jf-quem{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;line-height:1.45;color:var(--tinta)}
.jf-quem .ico{width:16px;height:16px;flex:none;margin-top:1px;color:#4F1D35}
/* Janela: a pergunta do caso dentro de "Anexar os assinados" */
.jf-anx-caso{margin-top:4px}
.fl-caso .jf-junta{display:grid;gap:4px;padding:10px 12px;border-radius:var(--raio);background:var(--sal-2);font-size:13px}
.fl-caso .jf-junta b{font-weight:600}
/* Avisos de lista: contratos assinados sem caso */
.jf-aviso{margin:0 24px 16px}
.jf-sc{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:8px}
.jf-sc li{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:10px 12px;border-radius:var(--raio);background:var(--papel);border:1px solid var(--borda-folha)}
.jf-sc li>span{display:grid;gap:2px;min-width:0}
.jf-sc li b{font-weight:600;color:var(--tinta)}
.jf-sc li small{font-size:12px;color:var(--texto-2)}
.jf-sc .acoes{display:flex;gap:8px;flex-wrap:wrap}
/* Chip com contagem de atenção */
.chips button .jf-n{display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 6px;margin-left:6px;border-radius:10px;background:var(--ambar-2);color:var(--tinta);font-size:11.5px;font-weight:600}
/* Ficha do caso encerrado: o acerto */
.jf-acerto{list-style:none;margin:0;padding:4px 24px 8px;display:grid;gap:10px}
.jf-acerto li{display:grid;grid-template-columns:20px minmax(0,1fr);gap:10px;font-size:13.5px;line-height:1.45}
.jf-acerto li .ico{width:18px;height:18px;margin-top:1px;color:var(--vinho)}
.jf-acerto li.falta .ico{color:#AC3F6B}
.jf-acerto small{display:block;font-size:12px;color:var(--texto-2)}
.jf-pe{display:flex;gap:10px;flex-wrap:wrap;padding:12px 24px 20px}
/* Janela de encerrar: os contratos ligados */
.jf-ctrs{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:6px}
.jf-ctrs li{display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.45}
.jf-ctrs li .ico{width:16px;height:16px;flex:none;margin-top:2px;color:var(--vinho)}
.jf-ctrs li small{display:block;color:var(--texto-2);font-size:12px}
.jf-motivo{display:flex;gap:8px;align-items:flex-start;margin:8px 0 0;font-size:12.5px;color:var(--texto-2);line-height:1.45}
.jf-motivo .ico{width:16px;height:16px;flex:none;margin-top:1px;color:var(--vinho-4)}
/* Contrato sem caso */
.jf-semcaso{display:grid;gap:12px;padding:4px 24px 22px}
.jf-semcaso p{margin:0;font-size:13.5px;line-height:1.5}
.jf-semcaso .acoes{display:flex;gap:10px;flex-wrap:wrap}
/* Cadastro que veio da conversa */
.jf-veio{display:flex;gap:12px;align-items:flex-start;margin:0 24px 8px;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.5}
.jf-veio .ico{flex:none;margin-top:2px;color:var(--vinho)}
.jf-veio b{font-weight:600}
.jf-veio a{color:var(--vinho);font-weight:500}
.jf-pre{font-size:11px;font-weight:600;letter-spacing:.04em;color:var(--vinho);background:var(--ambar-3);border-radius:10px;padding:1px 8px;margin-left:6px}
.jf-contato{display:grid;gap:4px;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:13px}
.jf-contato b{font-weight:600}
.jf-fechado{display:flex;gap:10px;align-items:flex-start;margin:0;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.5}
.jf-fechado .ico{flex:none;margin-top:1px;color:var(--vinho)}
@media (max-width:760px){
  .jf-aviso{margin:0 16px 14px}
  .jf-sc li .acoes,.jf-sc li .acoes .btn{width:100%}
  .jf-sc li .acoes .btn{justify-content:center}
  .jf-acerto{padding:4px 16px 8px}
  .jf-pe{padding:12px 16px 16px}
  .jf-pe .btn{width:100%;justify-content:center}
  .jf-semcaso{padding:4px 16px 18px}
  .jf-semcaso .acoes .btn{width:100%;justify-content:center}
  .jf-veio{margin:0 16px 8px}
}
"""

if os.environ.get('JF_TESTE'):
    print(len(CSS_EXTRA), sorted(BARRAS))
    for k, v in TP.items(): print(k, len(v))
    sys.exit()

# ====================================================================================== peças novas
EST = []
T = ''


def add(est, corpo, rotulo, **kw):
    global T
    T += tpl(est, corpo, **kw)
    EST.append((est, rotulo))


FT = dict(atual='clientes', trilha='Clientes|Antônia Ferreira Prado', titulo='Antônia Ferreira Prado')


def ficha_x(cli, dir_html, aba, corpo, n, areas=('comercial', 'contratos', 'juridico'), extra=''):
    falta = [a for a in ('comercial', 'contratos', 'juridico') if a not in areas]
    pe = pe_sem_area(falta) if falta else ''
    pe = f'<section class="folha" aria-label="Áreas que não estão liberadas" style="overflow:hidden">{pe}</section>' if pe else ''
    return f'<div class="cl">{ficha_cab(dict(cli, doc=""), dir_html)}{abas_fl(n, areas)}{corpo}{pe}</div>{extra}'


def opc(pref, v, rot, sub, marc, aberta=False):
    c = ' checked' if marc else ''
    cls = ' fl-aberta' if aberta else ''
    return f'<label class="opcao{cls}"><input class="marcar" type="radio" name="{pref}-caso" value="{v}"{c}><span>{rot}<small>{sub}</small></span></label>'


def campos_novo(pref, nome, area, resp, quem, papel, etapa='1. Preparação', resp_op=None, ajuda_resp='A advogada do contrato.'):
    areas = ['Previdenciário', 'Trabalhista', 'Cível', 'Consumidor', 'Família', 'Saúde', 'Tributário', 'Outra']
    rs = resp_op or ['Larissa Costa', 'Marina Ribeiro (você)', 'Felipe Matos']
    return (f'<div class="fl-novo">'
            + campo_j(f'{pref}-nome', 'Nome do caso', nome, 'c3', ajuda='Sugerido pelo nome do cliente e o objeto do contrato. Troque pelo que a equipe usa.')
            + sel_j(f'{pref}-area', 'Área', areas, area, 'c3', vazio='')
            + sel_j(f'{pref}-resp', 'Responsável', rs, resp, 'c3', vazio='', ajuda=ajuda_resp)
            + sel_j(f'{pref}-papel', f'{quem} no caso', ['Autora', 'Autor', 'Ré', 'Réu', 'Interessada'], papel, 'c3', vazio='')
            + f'<p class="fl-fixo">{ico("seta")}<span>Começa na etapa <b>{etapa}</b>. Número, vara e parte contrária entram na ficha do caso, quando houver.</span></p></div>')


def fs_caso_novo(pref, legenda, sub, novo_html, sem=True):
    return (f'<fieldset class="fl-caso"><legend>{legenda}<small>{sub}</small></legend>'
            + opc(pref, 'novo', 'Abrir um caso novo', 'Já preenchido com o que está no contrato. Tudo se muda depois, na ficha do caso.', True, True)
            + novo_html
            + opc(pref, 'juntar', 'Juntar a um caso que já existe', 'Quando o processo já está no T3jus com outro cliente.', False)
            + (opc(pref, 'sem', 'Este contrato não tem caso', 'Consultoria ou serviço sem processo. Dá para abrir o caso depois, pela ficha do contrato.', False) if sem else '')
            + '</fieldset>')


def caso_sem_escolha(pref, nome, area, resp, quem_avisa):
    return (f'<div class="fl-caso" role="group" aria-labelledby="{pref}-sj-t"><p id="{pref}-sj-t" style="font-family:var(--serifa);font-size:19px;font-weight:600;color:var(--vinho);margin:0">O caso abre em Jurídico</p>'
            f'<div class="fl-ja"><dl><dt>Caso</dt><dd>{nome}</dd><dt>Área</dt><dd>{area}</dd><dt>Responsável</dt><dd>{resp}</dd><dt>Etapa</dt><dd>1. Preparação</dd></dl></div>'
            f'<p class="ajuda" style="margin:0">Você não tem a área Jurídico: o caso abre com estes dados, e {quem_avisa} recebe o aviso no sino para conferir. '
            f'Se o contrato não tiver caso (consultoria), quem tem Jurídico marca isso depois.</p></div>')


# ---------------------------------------------------------------- 1. "Anexar os assinados" com a pergunta do caso (CH-11)
_ANX = TP['pr']['anexar']
_ANX = re.sub(r'<p class="pr-hip">.*?</p>', '', _ANX, count=1, flags=re.S)
_ANX_PARES = [('C-2026-033 · Benedito Souza Lima', f'{C_NUM} · Antônia Ferreira Prado'), ('Contrato C-2026-033', f'Contrato {C_NUM}'),
              ('<h1>Benedito Souza Lima</h1>', '<h1>Antônia Ferreira Prado</h1>'), ('Aposentadoria por idade', 'Pensão por morte'),
              ('benedito-lima', 'antonia-prado'), ('assinado-benedito', 'assinado-antonia'), ('assinada-benedito', 'assinada-antonia'),
              ('value="21/11/2026"', 'value="18/11/2026"')]
for a, b in _ANX_PARES:
    _ANX = _ANX.replace(a, b)
_ANX = _ANX.replace('Diego Almeida, Gustavo Lima e Paula Nunes', 'Diego Almeida, Gustavo Lima e Paula Nunes')
_ANX = troca(_ANX, [('O contrato C-2026-033 fica ativo e a programação dos recebimentos vai ao Financeiro: 3 parcelas de R$ 2.000,00 (2 de R$ 666,67 e 1 de R$ 666,66), a primeira em 10/12/2026. É o mesmo que “Registrar assinatura”, na aba Contrato.',
                     f'O contrato {C_NUM} fica ativo, a entrada de R$ 1.500,00 vai ao Financeiro e o caso abre em Jurídico, como você escolher logo abaixo. É o mesmo que “Registrar assinatura”, com a mesma pergunta do caso.')])
_ANX = sem_links(_ANX)
_I = _ANX.index('<dialog')
ANX_FUNDO, ANX_DLG = _ANX[:_I], _ANX[_I:]


def j_anexar(variante='novo', abrir=True):
    d = ANX_DLG if abrir else ANX_DLG.replace(' data-abrir>', '>', 1)
    fim = '</div></div>\n  <div class="janela-pe">'
    assert fim in d
    if variante in ('novo', 'erro'):
        sec = fs_caso_novo('ax', 'O caso em Jurídico', 'Anexar o contrato assinado leva Antônia para Casos e processos, como na assinatura.',
                           campos_novo('ax', CASO, 'Previdenciário', 'Larissa Costa', 'Antônia', 'Autora'))
        depois = (f'<p class="fl-depois">{ico("seta")}<span>Ao anexar, o contrato fica ativo, a entrada vai para o Financeiro e o caso abre em Jurídico. '
                  f'<b>Você continua nesta página</b>, com o link para o caso no aviso.</span></p>')
        botao = 'Anexar, ativar e abrir o caso'
    else:  # sem Jurídico (Bianca)
        sec = caso_sem_escolha('ax', CASO, 'Previdenciário', 'Larissa Costa, a advogada do contrato', 'Larissa')
        depois = f'<p class="fl-depois">{ico("seta")}<span>Ao anexar, o contrato fica ativo, a entrada vai para o Financeiro e o caso abre em Jurídico. <b>Você continua nesta página.</b></span></p>'
        botao = 'Anexar e ativar o contrato'
    d = d.replace(fim, f'</div><div class="jf-anx-caso">{sec}</div>{depois}</div>\n  <div class="janela-pe">', 1)
    d = troca(d, [('Anexar e ativar o contrato</button>', f'{botao}</button>')])
    if variante == 'erro':
        falha = aviso('urgencia', 'A assinatura não foi registrada e o caso não foi aberto.',
                      f'Os arquivos ficaram guardados no contrato, mas o servidor não respondeu a tempo. O contrato {C_NUM} continua em elaboração e o que você escolheu continua aqui. '
                      'Tente de novo; se continuar, mande o código PTL-7A31-0751 ao suporte.')
        d = d.replace('<p id="j-anexar-d">', falha + '<p id="j-anexar-d">', 1)
        d = d.replace(' data-foco>', '>', 1)
    return d


def fundo_anexar(ativo=False):
    h = ANX_FUNDO
    if ativo:
        h = troca(h, [('<span class="selo selo-ativo">Em elaboração</span>', f'<span class="selo selo-ativo">{ico("check")}Ativo</span>')])
        h = re.sub(r'<section class="dir campo-ambar" aria-labelledby="t-px">.*?</section>',
                   f'<section class="dir campo-ambar" aria-labelledby="t-px"><p class="sobretitulo" id="t-px">Caso em Jurídico</p><p class="grande" style="font-size:26px">{CASO}</p>'
                   f'<p class="hn-oque"><b>Aberto agora, na etapa 1. Preparação.</b><br>Com Larissa Costa, que recebeu o aviso no sino.</p>'
                   f'<div class="hn-dir-acoes"><a class="btn btn-pri" href="?estado=caso-acerto">{ico("balanca")}Ver o caso</a></div></section>', h, count=1, flags=re.S)
        h = h.replace(f'<span class="selo selo-atencao">{ico("relogio")}Falta anexar o assinado</span>', f'<span class="selo selo-ok">{ico("check")}Assinado em 18/11</span>', 1)
    return h


ACT = dict(area='contratos', secao='Contratos', atual='contratos', trilha=f'Contratos|{C_NUM}', titulo=C_NUM, aba='documentos')
add('anexar-caso', fundo_anexar() + j_anexar('novo'), 'Anexar os assinados: a pergunta do caso', **ACT)
add('anexar-erro', fundo_anexar() + j_anexar('erro'), 'Anexar: não registrou nem abriu o caso', **ACT)
add('anexar-sem-juridico', fundo_anexar() + j_anexar('sem'), 'Bianca (sem Jurídico) anexa: o caso abre sozinho', quem='bianca', **ACT)
add('anexado-caso', fundo_anexar(ativo=True) + toast('Contrato assinado anexado e caso aberto.',
    f'{C_NUM} está ativo e a entrada foi para o Financeiro. O caso {CASO} abriu em Jurídico, com Larissa Costa. <a href="?estado=caso-acerto">Ver o caso</a>'),
    'Depois de anexar: aviso com o link do caso', **ACT)

# ---------------------------------------------------------------- 2. Assinados sem caso (CH-11): lista de Contratos e Jurídico
SEM_CASO = [('Hélio Batista Corrêa', 'C-2026-022', 'Aposentadoria especial', '03/11/2026', 'Marina Ribeiro', 'Êxito em percentual 30%', '30% do êxito'),
            ('Irene Castro', 'C-2026-021', 'Inventário', '12/09/2026', 'Marina Ribeiro', 'Parcelado 10 × R$ 1.200,00', '10 × R$ 1.200,00')]


def j_caso_x(id_, cli, primeiro, contrato, assinado, hon, nome, area, resp, papel, abrir=False, sem=True, titulo='Abrir o caso',
             desc='O caso fica em Jurídico › Casos e processos, ligado ao contrato.', depois='Ao abrir, <b>você vai para a ficha do caso</b>, em Jurídico › Casos e processos.', resp_op=None, ajuda_resp='A advogada do contrato.'):
    pref = id_[-2:]
    corpo = (f'<div class="fl-ja"><dl><dt>Contrato</dt><dd>{contrato}, assinado em {assinado}</dd><dt>Honorários</dt><dd>{hon}</dd></dl></div>'
             + fs_caso_novo(pref, 'O caso', 'Preenchido com o que está no contrato.', campos_novo(pref, nome, area, resp, primeiro, papel, resp_op=resp_op, ajuda_resp=ajuda_resp), sem=sem)
             + f'<p class="fl-depois">{ico("seta")}<span>{depois}</span></p>')
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit" data-foco>{ico("balanca")}Abrir o caso</button>'
    return janela(id_, cli, titulo, desc, corpo, pe, abrir=abrir)


J_HELIO = j_caso_x('janela-caso-hc', 'Hélio Batista Corrêa', 'Hélio', 'C-2026-022', '03/11', '30% do êxito', 'Batista Corrêa x INSS', 'Previdenciário', 'Larissa Costa', 'Autor')
J_IRENE = j_caso_x('janela-caso-ic', 'Irene Castro', 'Irene', 'C-2026-021', '12/09', '10 × R$ 1.200,00', 'Inventário de Jorge Castro', 'Família', 'Marina Ribeiro (você)', 'Interessada')


def lista_contratos_sem_caso(vazio=False):
    h = TP['ct']['contratos']
    h = troca(h, [('<button type="button" aria-pressed="true">Ativos e em elaboração (15)</button>', '<button type="button" aria-pressed="false">Ativos e em elaboração (15)</button>'),
                  ('<button type="button" aria-pressed="false">Encerrados (4)</button>',
                   '<button type="button" aria-pressed="false">Encerrados (4)</button>'
                   + (f'<button type="button" aria-pressed="true">Assinados sem caso (0)</button>' if vazio else
                      f'<button type="button" aria-pressed="true">{ico("balanca")}Assinados sem caso<span class="jf-n" aria-hidden="true">2</span><span class="sr"> (2)</span></button>'))])
    i, j = h.index('<p class="hn-cont"'), h.index('<div class="mais">')
    if vazio:
        meio = estado('Nenhum contrato assinado sem caso',
                      'Todo contrato ativo está num caso ou foi marcado “não tem caso”, como consultoria e mensalidade. Quando a assinatura pular a pergunta do caso, ele aparece aqui.',
                      'balanca', moldura=False, acoes=f'<a class="btn btn-sec" href="#">{ico("esq")}Ver todos os contratos</a>')
        return sem_links(h[:i] + meio + '</section></div>')
    linhas = ''
    for nome, num, obj, ass, rsp, hon, _ in SEM_CASO:
        jid = 'janela-caso-hc' if nome.startswith('Hélio') else 'janela-caso-ic'
        linhas += (f'<tr class="hn-venc"><td data-r=""><div class="esc"><div><a href="#">{nome}</a><small>{num} · {obj}</small></div></div></td>'
                   f'<td data-r="Honorários"><div class="hn-selos"><span class="hn-selo">{ico("balanca" if "Êxito" in hon else "agenda")}{hon}</span></div></td>'
                   f'<td data-r="Responsável">{rsp}</td>'
                   f'<td data-r="Assinatura"><div><b class="num">{ass[:5]}</b><small>assinado por {rsp.split()[0]}, sem a pergunta do caso</small></div></td>'
                   f'<td data-r="Caso"><div style="display:grid;gap:6px;justify-items:start"><span class="selo selo-atencao">{ico("alerta")}Sem caso</span>'
                   f'<button class="btn btn-sec btn-compacto" type="button" data-janela="{jid}">{ico("balanca", "ico ico-s")}Abrir o caso<span class="sr">: contrato {num}, {nome}</span></button></div></td></tr>')
    tab = (f'<p class="hn-cont" role="status"><b>2 contratos assinados sem caso</b> · ativos, sem caso no Jurídico e sem a marca “não tem caso” · do mais antigo para o mais novo</p>'
           + aviso('atencao', 'Estes contratos foram assinados antes de a assinatura perguntar pelo caso.',
                   'Para cada um, abra o caso, junte a um caso que já existe ou marque que o contrato não tem caso. Tudo pela mesma janela. Quem abre o caso tem a área Jurídico.',
                   extra=' jf-aviso')
           + '<table class="hn-tab "><caption class="sr">Contratos assinados sem caso</caption><colgroup><col style="width:27%"><col style="width:22%"><col style="width:15%"><col style="width:18%"><col style="width:18%"></colgroup>'
           '<thead><tr><th scope="col">Contrato</th><th scope="col">Honorários</th><th scope="col">Responsável</th><th scope="col">Assinado em</th><th scope="col">Caso</th></tr></thead>'
           f'<tbody>{linhas}</tbody></table><div class="mais"><span>Mostrando os 2</span></div></section></div>')
    return sem_links(h[:i]) + tab


CL_CT = dict(area='contratos', secao='Contratos', atual='contratos', trilha='Contratos|Contratos', titulo='Contratos')
add('contratos-sem-caso', lista_contratos_sem_caso() + J_HELIO + J_IRENE, 'Contratos: filtro “Assinados sem caso”', **CL_CT)
add('contratos-sem-caso-abrir', lista_contratos_sem_caso() + j_caso_x('janela-caso-hc', 'Hélio Batista Corrêa', 'Hélio', 'C-2026-022', '03/11', '30% do êxito',
    'Batista Corrêa x INSS', 'Previdenciário', 'Larissa Costa', 'Autor', abrir=True,
    titulo='O caso deste contrato', desc='O contrato foi assinado sem caso. Escolha o que fazer; fica no histórico do contrato, com seu nome e a hora.') + J_IRENE,
    'Janela do caso aberta da lista (com “não tem caso”)', **CL_CT)
add('contratos-sem-caso-vazio', lista_contratos_sem_caso(vazio=True), 'Filtro vazio: nenhum assinado sem caso', **CL_CT)


def casos_com_aviso():
    h = J['pagina_casos']()
    li = ''
    for nome, num, obj, ass, rsp, hon, _ in SEM_CASO:
        jid = 'janela-caso-hc' if nome.startswith('Hélio') else 'janela-caso-ic'
        li += (f'<li><span><b>{nome}</b><small>{num} · {obj} · assinado em {ass[:5]}, por {rsp}</small></span>'
               f'<span class="acoes"><button class="btn btn-pri btn-compacto" type="button" data-janela="{jid}">{ico("balanca", "ico ico-s")}Abrir o caso<span class="sr">: {nome}</span></button></span></li>')
    av = ('<div class="jf-aviso">' + aviso('atencao', '2 contratos assinados ainda não têm caso.',
          'Os clientes estão com contrato ativo, mas fora de Casos e processos. Abra o caso, junte a um que já existe ou marque que o contrato não tem caso.',
          acoes=f'<ul class="jf-sc" aria-label="Contratos assinados sem caso">{li}</ul><a class="btn btn-fantasma" href="?estado=contratos-sem-caso">Ver na lista de Contratos</a>') + '</div>')
    k = '<div class="ju-onde">'
    assert k in h
    return h.replace(k, av + k, 1)


add('casos-sem-caso', casos_com_aviso() + J_HELIO + J_IRENE, 'Jurídico: aviso dos assinados sem caso',
    area='juridico', secao='Casos e processos', atual='juridico', trilha='Jurídico|Casos e processos', titulo='Casos e processos')

# ---------------------------------------------------------------- 3. Juntar ao caso que já existe (CH-12)
def j_assinar_juntar(abrir=True):
    pref = 'as'
    junta = (f'<div class="fl-novo"><div class="jf-junta" style="grid-column:1/-1"><b>{CASO}</b>'
             f'<span>Em andamento · 1. Preparação, desde 12/11 · com Larissa Costa</span>'
             f'<span>Aberto por Larissa em 12/11, em Novo caso, <b>ainda sem contrato</b>. Antônia é a única cliente.</span></div>'
             + sel_j(f'{pref}-papel', 'Antônia no caso', ['Autora', 'Ré', 'Interessada'], 'Autora', 'c3', vazio='', ajuda='Como já está no caso.')
             + f'<p class="fl-fixo">{ico("seta")}<span>O contrato {C_NUM} passa a ser o de Antônia neste caso, e o êxito sai dele. A etapa não muda e nenhum caso novo é aberto.</span></p></div>')
    fs = (f'<fieldset class="fl-caso"><legend>O caso em Jurídico<small>Antônia já tem um caso em andamento, sem contrato.</small></legend>'
          + opc(pref, 'juntar', f'Juntar a este caso: {CASO}', 'O mais provável: é o mesmo processo. Evita dois casos para a mesma coisa.', True, True)
          + junta
          + opc(pref, 'novo', 'Abrir um caso novo', 'Só se este contrato for de outro processo. Os dados vêm do contrato.', False)
          + opc(pref, 'sem', 'Este contrato não tem caso', 'Consultoria ou serviço sem processo. Dá para abrir o caso depois, pela ficha do contrato.', False)
          + '</fieldset>')
    corpo = (campo('as-data', 'Data da assinatura', '18/11/2026', 'c3', im='numeric', ajuda='dd/mm/aaaa. Hoje ou antes, desde 16/11, quando o contrato foi criado.', foco=True)
             + arquivo() + fs
             + f'<p class="fl-depois">{ico("seta")}<span>Ao registrar, o contrato fica ativo, a entrada de R$ 1.500,00 vai para o Financeiro e <b>você vai para a ficha do caso</b>, já com o contrato ligado.</span></p>')
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("balanca")}Registrar e juntar ao caso</button>'
    return janela('janela-assinar', f'{C_NUM} · Antônia Ferreira Prado', 'Registrar assinatura',
                  'Anexe o contrato assinado e diga a data. Fica no histórico, com seu nome e a hora.', corpo, pe, abrir=abrir)


D_ELA_J = dir_passo('Colher a assinatura', f'<b>{C_NUM} em elaboração desde 16/11.</b><br>Ao registrar, o contrato entra no caso {CASO}, que já existe.', B_ASSINAR, 2, contato=CONTATO_FUT)
add('assinar-juntar', ficha_fl(D_ELA_J, 'contratos', aba_contratos('elaboracao').replace('Abre ao registrar a assinatura', f'Entra em {CASO}, que já existe'), dict(N2, casos=1))
    + j_registrar() + j_assinar_juntar(),
    'Assinatura: “Juntar a este caso” já marcado', aba='contratos', **FT)

# ---------------------------------------------------------------- 4. O passo do fechamento na ficha do cliente (EX-16)
# Mais adiante na história: Antônia é cliente desde 03/2025, o caso terminou com ganho e a RPV entrou.
ANT_F = dict(nome='Antônia Ferreira Prado', tp='PF', desde='10/03/2025')
C_F = 'C-2025-047'
NF = dict(atendimentos=9, propostas=1, contratos=1, casos=1)
FECHA = [('Conferir o êxito', 'Financeiro'), ('Repassar a Antônia', 'Financeiro'), ('Encerrar no financeiro', 'Financeiro'), ('Encerrar o contrato', 'Contratos')]


def lista_fecha(feitos, detalhes):
    li = ''
    for i, (nome, _) in enumerate(FECHA):
        d = f'<small>{detalhes[i]}</small>' if detalhes[i] else ''
        if i < feitos:
            li += f'<li class="jf-ok"><span class="jf-m">{ico("check")}</span><span>{nome}<span class="sr">: feito</span>{d}</span></li>'
        elif i == feitos:
            li += f'<li class="jf-ag"><span class="jf-m">{i + 1}</span><span><b>{nome}</b><span class="sr">: é o próximo passo</span>{d}</span></li>'
        else:
            li += f'<li><span class="jf-m">{i + 1}</span><span>{nome}<span class="sr">: depois</span>{d}</span></li>'
    return f'<ol class="jf-fecha" aria-label="Fechamento do caso, em 4 passos">{li}</ol>'


def dir_fecha(titulo, oque, feitos, detalhes, acoes='', quem='', sobre='Próximo passo · fechamento', grande_px=30):
    a = f'<div class="fl-acoes">{acoes}</div>' if acoes else ''
    q = f'<p class="jf-quem">{ico("pessoas")}<span>{quem}</span></p>' if quem else ''
    return (f'<section class="dir campo-ambar fl-passo" aria-labelledby="t-passo"><p class="sobretitulo" id="t-passo">{sobre}</p>'
            f'<p class="grande" style="font-size:{grande_px}px">{titulo}</p><p class="cl-oque">{oque}</p>{lista_fecha(feitos, detalhes)}{a}{q}</section>')


DET = ['Êxito de R$ 11.592,00 (30% da RPV), calculado pelo contrato', 'R$ 25.128,00, até 19/11', 'Parceiro e perito pagos; tudo recebido', f'{C_F}, junto com o financeiro']
DET_OK = ['Conferido por Diego em 10/11', 'Repassado em 13/11 · Antônia leu a prestação de contas', 'Por Diego em 17/11', f'{C_F} encerrado em 18/11']

D_F1 = dir_fecha('Fechar o caso', f'<b>{CASO} terminou com ganho em 30/10.</b><br>Faltam 4 coisas para Antônia sair do escritório com tudo acertado.', 0, DET,
                 f'<a class="btn btn-pri" href="#" data-rota="/financeiro/receber?conferir={C_F}">{ico("moeda")}Conferir o êxito</a>',
                 'Quem faz: a área Financeiro (você, Diego e Bianca).')
D_F2 = dir_fecha('Fechar o caso', '<b>A RPV de R$ 38.640,00 entrou em 12/11.</b><br>A parte de Antônia espera o repasse.', 1, [DET_OK[0]] + DET[1:],
                 f'<a class="btn btn-pri" href="?estado=acerto">{ico("enviar")}Registrar o repasse</a>',
                 'Quem faz: a área Financeiro (você, Diego e Bianca).')
D_F3 = dir_fecha('Fechar o caso', '<b>Antônia recebeu em 13/11.</b><br>No financeiro do caso ainda faltam o parceiro e o perito.', 2,
                 DET_OK[:2] + ['Faltam R$ 3.818,40: parceiro e perito', DET[3]],
                 f'<a class="btn btn-pri" href="?estado=acerto">{ico("cadeado")}Ver o acerto</a>',
                 'Quem faz: a área Financeiro (você, Diego e Bianca). O contrato pode ser encerrado junto.')
D_F4 = dir_fecha('Fechar o caso', f'<b>O caso foi encerrado no financeiro em 17/11.</b><br>O contrato {C_F} ficou ativo, sem nada a cobrar.', 3,
                 DET_OK[:3] + ['Não foi encerrado junto com o financeiro'],
                 f'<a class="btn btn-pri" href="?estado=contrato-encerrar">{ico("pasta")}Encerrar o contrato</a>',
                 'Quem faz: a área Contratos (você e Felipe).')
D_F3L = dir_fecha('Fechar o caso', '<b>Antônia recebeu em 13/11.</b><br>O acerto do caso está com o Financeiro.', 2,
                  ['Conferido', 'Repassado em 13/11', 'Falta pagar terceiros', 'Junto com o financeiro'],
                  f'<a class="btn btn-sec" href="?estado=caso-acerto-larissa">{ico("balanca")}Ver o caso</a>',
                  'Quem faz: a área Financeiro, que não está liberada para você. Marina, Diego e Bianca. Você recebe o aviso no sino quando o caso fechar.')
D_AT = dir_fecha('Cliente atendido', f'<b>Tudo acertado em 18/11.</b><br>{CASO}: ganho, recebido, repassado e encerrado.', 4, DET_OK,
                 f'<a class="btn btn-sec" href="#" data-rota="{NOVA}">{ico("maleta")}Gerar proposta</a><a class="btn btn-fantasma" href="?estado=caso-acerto">{ico("balanca")}Ver o caso</a>',
                 sobre='Próximo passo', grande_px=30)


def aba_casos_f(acerto='pendente'):
    sub = 'Os casos e processos em que Antônia é cliente. Um processo pode ter mais de um cliente.'
    et = {'pendente': ('Encerrado · acerto pendente', f'<span class="selo selo-atencao">{ico("relogio")}Acerto pendente</span>'),
          'fechado': ('Encerrado', f'<span class="selo selo-ok">{ico("check")}Acertado</span>')}[acerto]
    linhas = [('fl-vivo' if acerto == 'pendente' else '', [
        f'<div class="fl-num"><a href="?estado=caso-acerto">{CASO}</a><small class="num">5004821-77.2025.4.03.6183 · Previdenciário</small></div>',
        f'<div class="fl-et"><b>{et[0]}</b>{J["mini"](8)}<small>8 de 8 · ganho em 30/10</small></div>',
        '<b>Autora</b><small>Única cliente do caso</small>', J['resp']('Larissa Costa'), et[1]])]
    cards = cartao(CASO, '?estado=caso-acerto', '5004821-77.2025.4.03.6183', [('Etapa', f'{et[0]} · ganho em 30/10'), ('Papel', 'Autora'), ('Responsável', 'Larissa Costa')], et[1])
    pe = '<div class="fl-pe"><span><b>1 caso</b>, encerrado. O acerto do dinheiro fica no Financeiro, em Repasses.</span></div>'
    return folha_aba('t-aba', 'Casos', sub, tabela('Casos de Antônia', ['Caso', 'Etapa', 'Antônia no caso', 'Responsável', 'Acerto'], [27, 22, 17, 18, 16], linhas, cards, pe))


def aba_contratos_f(encerrado=False):
    sub = 'Os contratos de honorários de Antônia, com a situação, a assinatura e o caso ligado.'
    if encerrado:
        sit = f'<div class="fl-et"><span class="selo selo-neutro">{ico("pasta")}Encerrado</span><small>Em 18/11, com o caso</small></div>'
        rec, cls, sel = '<small>Nada a receber</small>', '', f'<span class="selo selo-neutro">{ico("pasta")}Encerrado</span>'
    else:
        sit = f'<div class="fl-et"><span class="selo selo-ativo">{ico("check")}Ativo</span><small>Assinado em 12/03/2025</small></div>'
        rec, cls, sel = '<small>Tudo recebido · nada a cobrar</small>', 'fl-vivo', f'<span class="selo selo-ativo">{ico("check")}Ativo</span>'
    linhas = [(cls, [f'<div class="fl-num"><a href="#">{C_F}</a><small>Pensão por morte · veio da P-2025-031</small></div>', sit, f'<b>{HON}</b>', rec,
                     f'<a class="fl-ir" href="?estado=caso-acerto">{CASO}</a><small>Encerrado</small>'])]
    cards = cartao(C_F, '#', 'Pensão por morte', [('Honorários', HON), ('Caso', f'{CASO} · encerrado')], sel)
    pe = '<div class="fl-pe"><span><b>1 contrato</b>. Baixar o PDF ou o .docx, mudar condições e encerrar ficam na ficha do contrato.</span></div>'
    return folha_aba('t-aba', 'Contratos', sub, tabela('Contratos de Antônia', ['Contrato', 'Situação', 'Honorários', 'Recebimentos', 'Caso'], [21, 18, 22, 20, 19], linhas, cards, pe))


FTF = dict(FT)
add('fecha-exito', ficha_x(ANT_F, D_F1, 'casos', aba_casos_f(), NF) + j_registrar(), 'Fechamento 1: conferir o êxito', aba='casos', **FTF)
add('fecha-repasse', ficha_x(ANT_F, D_F2, 'casos', aba_casos_f(), NF) + j_registrar(), 'Fechamento 2: repassar a Antônia', aba='casos', **FTF)
add('fecha-financeiro', ficha_x(ANT_F, D_F3, 'casos', aba_casos_f(), NF) + j_registrar(), 'Fechamento 3: encerrar no financeiro', aba='casos', **FTF)
add('fecha-contrato', ficha_x(ANT_F, D_F4, 'contratos', aba_contratos_f(), NF) + j_registrar(), 'Fechamento 4: encerrar o contrato', aba='contratos', **FTF)
add('fecha-larissa', ficha_x(ANT_F, D_F3L, 'casos', aba_casos_f(), NF, areas=('juridico',)), 'Larissa (sem Financeiro): só o texto de quem faz', quem='juridico', aba='casos', **FTF)
add('atendido', ficha_x(ANT_F, D_AT, 'casos', aba_casos_f('fechado'), NF) + j_registrar(),
    'Cliente atendido: “Gerar proposta” como secundário', aba='casos', **FTF)

# ---------------------------------------------------------------- 8. O botão do passo uma vez só
add('passo-uma-vez', ficha_fl(D_ELA, 'atendimentos', com_lateral(historico(), LAT_AT), N2) + j_registrar() + j_assinar(),
    'O passo só no âmbar; no Histórico, só “Registrar atendimento”', aba='atendimentos', **FT)

# ---------------------------------------------------------------- 5. Encerrar em cadeia (EX-17): Jurídico
def cab_caso_enc(botao=True, texto=None):
    NE, NOME_E = J['NE'], J['NOME_E']
    segs = ''.join(f'<li class="{"agora" if i == NE - 1 else ""}"><span class="b" aria-hidden="true"></span>'
                   f'<span class="sr">{i + 1}. {NOME_E[i]}{": atual" if i == NE - 1 else ": feita"}</span></li>' for i in range(NE))
    b = f'<a class="btn btn-pri" href="?estado=acerto">{ico("cadeado")}Ver o acerto</a>' if botao else ''
    t = texto or 'Encerrado com ganho em 30/10, por Larissa. <b>Falta o acerto no Financeiro</b>: pagar o parceiro e o perito e encerrar.'
    dir_ = (f'<section class="dir campo-ambar" aria-labelledby="t-etapa"><p class="sobretitulo" id="t-etapa">Etapa do caso</p>'
            f'<p class="grande">{NE} de {NE}<small>{NOME_E[NE - 1]}</small></p><ol class="etapas ju-et8">{segs}</ol>'
            f'<p class="ju-agora">{t}</p>{b}</section>')
    return (f'<div class="ficha-cab"><div class="esq campo-vinho">{ico("balanca", "ico estatua")}'
            f'<a class="voltar" href="?estado=casos-sem-caso">{ico("esq", "ico ico-s")}Casos e processos</a>'
            f'<div class="ident"><div><p class="sobretitulo">Caso · previdenciário</p><h1>{CASO}</h1>'
            f'<p class="meta"><span class="selo selo-atencao">{ico("relogio")}Encerrado · acerto pendente</span><span class="num">5004821-77.2025.4.03.6183</span>'
            f'<span class="sep" aria-hidden="true"></span><span>JEF · PJe</span></p></div></div></div>{dir_}</div>')


def ficha_caso_enc(fin=True):
    f = J['folha']
    d = [('Área', 'Previdenciário'), ('Parte contrária', 'INSS'), ('Responsável', 'Larissa Costa'), ('Resultado', 'Ganho · sentença de 30/10/2026'),
         ('Tribunal', 'JEF de São Paulo'), ('Aberto em', '12/03/2025, na assinatura')]
    dl = ''.join(f'<div><dt>{k}</dt><dd>{v}</dd></div>' for k, v in d)
    dados = f('t-dados', 'Dados do processo', 'O que identifica o caso.', f'<dl class="dados-ficha ju-dl">{dl}</dl>')
    hon = (f'<div class="ju-hon"><b>30% do êxito</b><small>Contrato {C_F}</small></div>' if fin else '<div class="ju-hon"><small>Honorários na área Contratos</small></div>')
    cli = ('<ul class="lista ju-clientes"><li><span class="av-p forte" aria-hidden="true">AP</span><div><a class="n" href="?estado=fecha-financeiro">Antônia Ferreira Prado</a><small>Autora · viúva</small></div>'
           f'<a class="tel" href="#">{ico("whats")}<span class="num">(11) 99123-4567</span></a>{hon}</li></ul>')
    clientes = f('t-cli', 'Clientes do caso', '1 cliente', cli)
    if fin:
        ac = (f'<li>{ico("check")}<span>Êxito conferido<small>R$ 11.592,00 · por Diego em 10/11</small></span></li>'
              f'<li>{ico("check")}<span>RPV recebida<small>R$ 38.640,00 · em 12/11</small></span></li>'
              f'<li>{ico("check")}<span>Antônia recebeu a parte dela<small>R$ 25.128,00 · em 13/11 · prestação de contas lida</small></span></li>'
              f'<li class="falta">{ico("alerta")}<span><b>Parceiro:</b> falta pagar R$ 2.318,40<small>até 20/11</small></span></li>'
              f'<li class="falta">{ico("alerta")}<span><b>Perito:</b> falta pagar R$ 1.500,00<small>esperando a nota fiscal</small></span></li>'
              f'<li>{ico("relogio")}<span>Depois: encerrar no financeiro e o contrato {C_F}<small>Os dois de uma vez, na mesma janela</small></span></li>')
        sub = 'O que falta para o caso sair de “acerto pendente”'
    else:
        ac = (f'<li>{ico("check")}<span>Êxito conferido</span></li><li>{ico("check")}<span>Antônia recebeu a parte dela</span></li>'
              f'<li class="falta">{ico("alerta")}<span>Faltam pagamentos a terceiros<small>Os valores ficam no Financeiro</small></span></li>'
              f'<li>{ico("relogio")}<span>Depois: encerrar no financeiro</span></li>')
        sub = 'Quem cuida: Marina, Diego e Bianca, da área Financeiro'
    acerto = f('t-ac', 'Acerto no Financeiro', sub, f'<ul class="jf-acerto">{ac}</ul>', peq=True)
    ctr = (f'<ul class="ju-ctr"><li>{ico("pena")}<span><b>{C_F} · Antônia Ferreira Prado</b><small>Assinado em 12/03/2025 · ativo até o acerto</small></span></li></ul>')
    contr = f('t-ctr', 'Contratos ligados', '', ctr, peq=True)
    return (f'<div class="ju">{cab_caso_enc(fin, None if fin else "Encerrado com ganho em 30/10, por você. <b>O acerto está com o Financeiro</b>; você recebe o aviso quando fechar.")}'
            f'<div class="ju-grade ju-ficha-grade"><div class="ju-col">{dados}{clientes}</div>'
            f'<aside class="ju-col" aria-label="Contexto do caso">{acerto}{contr}</aside></div></div>')


CJ = dict(area='juridico', secao='Casos e processos', atual='juridico', trilha=f'Jurídico|Casos e processos|{CASO}', titulo=CASO)
add('caso-acerto', ficha_caso_enc(), 'Caso “Encerrado · acerto pendente”: Ver o acerto', **CJ)
add('caso-acerto-larissa', ficha_caso_enc(fin=False), 'Larissa (sem Financeiro): o acerto sem valores e sem link', quem='juridico', **CJ)

# ---------------------------------------------------------------- 5. Encerrar em cadeia (EX-17): Financeiro
_RP = TP['fi']['repasse']
_RP = re.sub(r'<dialog.*?</dialog>', '', _RP, flags=re.S)
_RP = troca(_RP, [('Aposentadoria por incapacidade × INSS', 'Pensão por morte × INSS'), ('Laudo médico adiantado em 03/2025', 'Certidões e cópias, adiantadas em 03/2025'),
                  ('Laudo médico que adiantamos', 'Certidões que adiantamos'), ('Perito · assistente técnico', 'Perito · cálculo dos atrasados'), ('Assistente técnico', 'Perito do cálculo')])
_RP = _RP.replace('Irene Castro', 'Antônia Ferreira Prado').replace('Irene', 'Antônia').replace('aria-hidden="true">IC<', 'aria-hidden="true">AP<')
_RP = _RP.replace('à cliente', 'à cliente')
_RP = sem_links(_RP).replace('R$\u00a0', 'R$ ')


def repasse_ant(feito=False, fechado=False):
    h = _RP
    if not feito:
        return h.replace('data-janela="janela-fechar"', 'data-janela="janela-fechar" data-rota="mostra o que falta, como no aprovado"')
    ok16, ok17 = f'<span class="selo selo-ok">{ico("check")}Pago 16/11</span>', f'<span class="selo selo-ok">{ico("check")}Pago 17/11</span>'
    h = troca(h, [('3 de 5 feitos', '5 de 5 feitos'),
                  ('<span class="selo selo-neutro">Até 20/11</span>', ok16),
                  (f'<span class="selo selo-atencao">{ico("alerta")}Falta a nota</span>', ok17),
                  ('<button class="btn btn-sec btn-compacto" type="button">Pedir a nota</button>', f'<div class="fi-docs"><a href="#">{ico("doc")}Nota e comprovante</a></div>'),
                  ('<b class="num">R$ 34.821,60</b>', '<b class="num">R$ 38.640,00</b>'),
                  ('<div class="falta"><b class="num">R$ 3.818,40</b>', '<div><b class="num">R$ 0,00</b>')])
    h = re.sub(r'<li class="falta">.*?</li><li class="falta">.*?</li></ul>',
               f'<li>{ico("check")}<span>Parceiro pago em 16/11</span></li><li>{ico("check")}<span>Perito pago em 17/11, com a nota</span></li></ul>', h, count=1, flags=re.S)
    h = re.sub(r'<p class="grande num">R\$ 3.818,40</p><span class="selo selo-atencao">2 repasses</span>',
               f'<p class="grande num">R$ 0,00</p><span class="selo selo-ok">{ico("check")}Tudo repassado</span>', h, count=1)
    h = re.sub(r'<p class="fi-oque">.*?</p><button class="btn btn-pri" type="button">.*?</button>',
               (f'<p class="fi-oque"><b>Nada falta.</b> O caso já pode ser encerrado no financeiro.</p>'
                f'<button class="btn btn-pri" type="button" data-janela="janela-fechar">{ico("cadeado")}Encerrar o caso no financeiro</button>') if not fechado else
               (f'<p class="fi-oque"><b>Caso encerrado no financeiro hoje, 18/11.</b> O contrato {C_F} foi encerrado junto.</p>'
                f'<a class="btn btn-pri" href="?estado=atendido">{ico("pessoas")}Ver a ficha de Antônia</a>'), h, count=1, flags=re.S)
    btn = f'<button class="btn btn-sec" type="button" data-janela="janela-fechar">{ico("cadeado")}Encerrar o caso no financeiro</button>'
    assert btn in h
    if fechado:
        h = h.replace(btn, f'<p class="jf-fechado">{ico("check")}<span>Caso encerrado no financeiro hoje, 18/11, por Marina Ribeiro. Contrato {C_F} encerrado junto, com o motivo.</span></p>')
    else:
        h = h.replace(btn, '')  # o botão fica uma vez só, no âmbar
    return h


def j_fechar(abrir=True, erro=False):
    falha = (aviso('urgencia', 'Nada foi encerrado.',
                   f'O contrato {C_F} mudou agora há pouco (Felipe registrou uma condição nova). O caso e o contrato continuam abertos. '
                   'Feche esta janela, confira o contrato e tente de novo. Se continuar, mande o código PTL-7A31-0762 ao suporte.') if erro else '')
    corpo = (falha
             + f'<div class="fl-ja"><dl><dt>Caso</dt><dd>{CASO}</dd><dt>Entrou</dt><dd>R$ 38.640,00 · RPV em 12/11</dd><dt>Destinado e pago</dt><dd>R$ 38.640,00 · nada falta</dd></dl></div>'
             + f'<fieldset class="fl-caso"><legend>Contratos ligados ao caso<small>Encerrar para as cobranças novas. Nada é apagado.</small></legend>'
             f'<label class="opcao"><input class="marcar" type="checkbox" name="fc-ctr" checked{"" if erro else " data-foco"}><span>Encerrar também os contratos ligados<small>Só entram os que não têm outro caso em andamento.</small></span></label>'
             f'<ul class="jf-ctrs"><li>{ico("pena")}<span><b>{C_F} · Antônia Ferreira Prado</b><small>Pensão por morte · {HON} · nada em aberto</small></span></li></ul>'
             f'<p class="jf-motivo">{ico("doc")}<span>Motivo que fica no contrato: “Caso {CASO} encerrado no financeiro em 18/11/2026.”</span></p></fieldset>'
             + f'<p class="fl-depois">{ico("seta")}<span>O caso sai de “acerto pendente” no Jurídico, o contrato fica encerrado e a ficha de Antônia passa a dizer <b>Cliente atendido</b>. '
               'Os dois andam juntos: ou ficam os dois, ou nenhum.</span></p>')
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("cadeado")}Encerrar o caso e o contrato</button>'
    return janela('janela-fechar', 'Fechamento do caso', 'Encerrar o caso no financeiro',
                  'Antônia Ferreira Prado · Pensão por morte × INSS. Tudo foi recebido e repassado. O encerramento fica no histórico do caso, com seu nome e a hora.',
                  corpo, pe, abrir=abrir or erro)


FI = dict(area='financeiro', secao='Repasses', atual='financeiro', trilha='Financeiro|Repasses|Antônia Ferreira Prado', titulo='Antônia Ferreira Prado')
add('acerto', repasse_ant(), 'Financeiro: o acerto do caso (ainda com pendência)', **FI)
add('encerrar-cadeia', repasse_ant(feito=True) + j_fechar(), 'Encerrar no financeiro com os contratos ligados', **FI)
add('encerrar-cadeia-erro', repasse_ant(feito=True) + j_fechar(erro=True), 'Encerrar: nada foi encerrado', **FI)
add('encerrado-cadeia', repasse_ant(feito=True, fechado=True) + toast('Caso e contrato encerrados.',
    f'{CASO}: tudo recebido e repassado. O contrato {C_F} foi encerrado junto. Ficou no histórico do caso e do contrato.'),
    'Confirmação: caso e contrato encerrados', **FI)

# ---------------------------------------------------------------- 6. Contrato sem caso (CH-13)
AUTO = dict(nome='Auto Peças Moreira Ltda.', tp='PJ', desde='28/09/2026')
C_AP = 'C-2026-027'
JOR_SEM = jornada(3).replace('<li class="fl-ag">Caso<span class="sr">: é o próximo passo</span></li>',
                             f'<li>Sem caso<span class="sr">: este contrato não tem caso</span></li>')
D_CA = (f'<section class="dir campo-ambar fl-passo" aria-labelledby="t-passo"><p class="sobretitulo" id="t-passo">Próximo passo</p>'
        f'<p class="grande" style="font-size:30px">Contrato ativo</p>{JOR_SEM}'
        f'<p class="cl-oque"><b>{C_AP} · Consultoria trabalhista mensal.</b><br>Sem caso, marcado na assinatura. Próxima mensalidade em 10/12, R$ 1.200,00.</p>'
        f'<div class="fl-acoes"><a class="btn btn-pri" href="?estado=contrato-sem-caso">{ico("pena")}Ver o contrato</a></div>'
        f'{linha_contato(("25/11", "qua", "Felipe Matos", "futuro"))}</section>')


def aba_contratos_auto():
    sub = 'Os contratos de honorários da Auto Peças, com a situação, a assinatura e o caso ligado.'
    linhas = [('', [f'<div class="fl-num"><a href="?estado=contrato-sem-caso">{C_AP}</a><small>Consultoria trabalhista mensal · veio da P-2026-011</small></div>',
                     f'<div class="fl-et"><span class="selo selo-ativo">{ico("check")}Ativo</span><small>Assinado em 05/10</small></div>',
                     '<b>R$ 1.200,00 por mês</b>', '<b class="num">R$ 1.200,00</b><small>mensalidade, vence 10/12</small>',
                     '<b>Não tem caso</b><small>Consultoria, sem processo</small>'])]
    cards = cartao(C_AP, '?estado=contrato-sem-caso', 'Consultoria trabalhista mensal', [('Honorários', 'R$ 1.200,00 por mês'), ('Caso', 'Não tem caso · consultoria')],
                   f'<span class="selo selo-ativo">{ico("check")}Ativo</span>')
    pe = '<div class="fl-pe"><span><b>1 contrato</b>. Abrir um caso para ele fica na ficha do contrato.</span></div>'
    return folha_aba('t-aba', 'Contratos', sub, tabela('Contratos da Auto Peças', ['Contrato', 'Situação', 'Honorários', 'Recebimentos', 'Caso'], [21, 18, 22, 20, 19], linhas, cards, pe))


add('contrato-ativo', ficha_x(AUTO, D_CA, 'contratos', aba_contratos_auto(), dict(atendimentos=3, propostas=1, contratos=1, casos=0)) + j_registrar(),
    'Contrato sem caso: o âmbar diz “Contrato ativo”', atual='clientes', trilha='Clientes|Auto Peças Moreira Ltda.', titulo='Auto Peças Moreira Ltda.', aba='contratos')

_CT = TP['ct']['contrato']
_CT = troca(_CT, [('Contrato C-2026-019', f'Contrato {C_AP}'), ('<h1>Farmácia Bom Jesus Ltda.</h1>', '<h1>Auto Peças Moreira Ltda.</h1>'),
                  ('<span>Cobranças e consultivo</span>', '<span>Consultoria trabalhista mensal</span>'),
                  ('<b>Mensalidade 4 e a audiência de 12/11</b><br>no Financeiro, em A receber', '<b>Mensalidade 3</b><br>no Financeiro, em A receber'),
                  ('R$ 1.800,00 <small>por mês</small>', 'R$ 1.200,00 <small>por mês</small>'),
                  ('Todo dia 10, desde 10/09/2026, sem prazo para acabar. Reajuste em setembro pelo IPCA.', 'Todo dia 10, desde 10/10/2026, por 12 meses. Dúvidas trabalhistas da empresa, por telefone e e-mail.'),
                  ('<dd>02/09/2026</dd>', '<dd>05/10/2026</dd>'), ('P-2026-006', 'P-2026-011'), ('Ativo desde 02/09/2026', 'Ativo desde 05/10/2026')])
_CT = _CT.replace('R$ 2.250,00', 'R$ 1.200,00').replace('R$ 2.250,00', 'R$ 1.200,00')
_CT = re.sub(r'(<ol class="hn-lista"><li class="hn-item">.*?</li>).*?</ol>', r'\1</ol>', _CT, count=1, flags=re.S)
_CT = re.sub(r'<section class="folha" aria-labelledby="t-cs">.*?</section>',
             (f'<section class="folha" aria-labelledby="t-cs"><div class="folha-cab"><div><h2 id="t-cs">Caso</h2><p class="sub">Este contrato não tem caso</p></div></div>'
              f'<div class="jf-semcaso"><p>Marcado na assinatura, em 05/10/2026, por Felipe Matos: <b>consultoria, sem processo</b>. Por isso a ficha da Auto Peças mostra “Contrato ativo” e não pede proposta nem caso.</p>'
              f'<p>Se a consultoria virar processo (uma reclamação trabalhista contra a empresa, por exemplo), abra o caso aqui. A marca sai e o contrato passa a ser o do caso.</p>'
              f'<div class="acoes"><button class="btn btn-sec" type="button" data-janela="janela-caso-ap">{ico("balanca")}Abrir um caso para este contrato</button></div></div></section>'),
             _CT, count=1, flags=re.S)
_CT = sem_links(_CT)
J_AUTO = lambda abrir: j_caso_x('janela-caso-ap', f'{C_AP} · Auto Peças Moreira Ltda.', 'A empresa', C_AP, '05/10', 'R$ 1.200,00 por mês', 'Souza x Auto Peças Moreira', 'Trabalhista',
                                'Felipe Matos', 'Ré', abrir=abrir, sem=False, titulo='Abrir um caso para este contrato',
                                desc='O contrato deixa de ser “sem caso”. Fica no histórico do contrato, com seu nome e a hora.',
                                depois='Ao abrir, a marca “não tem caso” sai do contrato, o caso fica ligado a ele e <b>você vai para a ficha do caso</b>.',
                                resp_op=['Felipe Matos', 'Larissa Costa', 'Marina Ribeiro (você)'], ajuda_resp='O advogado do contrato.')
CA = dict(area='contratos', secao='Contratos', atual='contratos', trilha=f'Contratos|{C_AP}', titulo=C_AP, aba='contrato')
add('contrato-sem-caso', _CT + J_AUTO(False), 'Ficha do contrato: “Abrir um caso para este contrato”', **CA)
add('contrato-abrir-caso', _CT + J_AUTO(True), 'Janela: abrir o caso e tirar a marca', **CA)

# ---------------------------------------------------------------- 7. Cadastro pela conversa (AP-07)
_CV = sem_links(TP['cv']['novo-contato'])
_CV = _CV.replace('href="#"><svg class="ico" aria-hidden="true"><use href="#i-pessoa-mais"/></svg>Cadastrar como cliente',
                  'href="?estado=cadastro-conversa"><svg class="ico" aria-hidden="true"><use href="#i-pessoa-mais"/></svg>Cadastrar como cliente')
_CV = _CV.replace('<a class="btn btn-sec" href="#"><svg class="ico" aria-hidden="true"><use href="#i-agenda"/></svg>Marcar primeira reunião',
                  '<a class="btn btn-sec" href="?estado=reuniao-conversa" data-janela="janela-novo"><svg class="ico" aria-hidden="true"><use href="#i-agenda"/></svg>Marcar primeira reunião')
_CV = _CV.replace('A IA não cadastra sozinha: o cadastro abre preenchido para você conferir.',
                  'A IA não cadastra sozinha: o cadastro abre com o nome e o telefone da conversa, para você conferir. Ao salvar, você volta para cá.')
CV_ATTR = dict(atual='conversas', area='conversas', secao='Mensagens', trilha='Conversas|Rafaela Moura', titulo='Conversas')


def conversa_ligada():
    h = _CV
    h = troca(h, [('<span class="selo selo-neutro">Ainda não está em Clientes</span>', f'<span class="selo selo-ativo">{ico("check")}Cliente desde hoje</span>'),
                  ('Nome dito na conversa', 'Ficha em Clientes'),
                  ('Contato novo · (11) 97640-2281', 'Cliente · (11) 97640-2281')])
    sec = re.compile(r'<section class="cv-sec"><h3><svg class="ico" aria-hidden="true"><use href="#i-ia"/></svg>A IA anotou</h3>.*?</section>', re.S)
    assert len(sec.findall(h)) == 2
    novo = (f'<section class="cv-sec"><h3>{ico("pessoas")}Cliente</h3><dl class="cv-dl"><div><dt>Cliente</dt><dd>Rafaela Moura</dd></div>'
            f'<div><dt>Quem escreve</dt><dd>A própria cliente</dd></div><div><dt>Contato</dt><dd>Principal da ficha</dd></div></dl>'
            f'<a class="btn btn-pri" href="?estado=reuniao-conversa" data-janela="janela-novo">{ico("agenda")}Marcar primeira reunião</a>'
            f'<a class="btn btn-sec" href="#">{ico("pessoas")}Abrir a ficha</a>'
            f'<p class="cv-nota">{ico("escudo")}<span>A conversa ficou ligada à ficha. O que foi dito sobre a gestação continua só aqui, fora do cadastro.</span></p></section>')
    h = sec.sub(novo, h)
    h = h.replace('<span class="selo selo-atencao"><svg class="ico" aria-hidden="true"><use href="#i-pessoa-mais"/></svg>Possível cliente novo</span>', '')
    return h


def cadastro_conversa():
    h = sem_links(TP['cl']['novo'])
    h = troca(h, [('<input class="entrada" id="n-nome" name="n-nome" type="text" autocomplete="off" aria-describedby="n-nome-aj" data-foco>',
                   '<input class="entrada" id="n-nome" name="n-nome" type="text" autocomplete="off" aria-describedby="n-nome-aj" value="Rafaela Moura" data-foco>'),
                  ('Como está no documento. Vai na procuração e no contrato.', 'Veio da conversa. Confira com a pessoa: como está no documento, vai na procuração e no contrato.'),
                  ('<input class="entrada" id="n-tel" name="n-tel" type="tel" autocomplete="off" aria-describedby="n-tel-aj" inputmode="tel">',
                   '<input class="entrada" id="n-tel" name="n-tel" type="tel" autocomplete="off" aria-describedby="n-tel-aj" inputmode="tel" value="(11) 97640-2281">'),
                  ('<p class="ajuda" id="n-tel-aj">Para falar com o cliente.</p>', '<p class="ajuda" id="n-tel-aj">O número da conversa. Vira o contato principal da ficha.</p>'),
                  ('<label for="n-nome">Nome completo', '<label for="n-nome">Nome completo<span class="jf-pre">da conversa</span>'),
                  ('<label for="n-tel">Telefone ou WhatsApp', '<label for="n-tel">Telefone ou WhatsApp<span class="jf-pre">da conversa</span>'),
                  ('<a class="btn btn-fantasma" href="#">Cancelar</a>', '<a class="btn btn-fantasma" href="?estado=conversa-nova">Voltar à conversa</a>'),
                  ('Cadastrar cliente</button>', 'Cadastrar e voltar à conversa</button>')])
    veio = (f'<p class="jf-veio" role="note">{ico("whats")}<span><b>Veio da conversa com (11) 97640-2281.</b> O nome e o telefone já estão aqui. '
            f'Ao cadastrar, a conversa fica ligada à ficha de Rafaela e você volta para ela. <a href="?estado=conversa-nova">Voltar sem cadastrar</a></span></p>')
    k = '<form class="form-folha"'
    assert k in h
    return h.replace(k, veio + k, 1)


def j_reuniao():
    d = sem_links(re.search(r'<dialog class="janela x-larga" id="janela-novo".*?</dialog>', TP['ag']['novo'], re.S).group(0))
    d = d.replace('R$ ', 'R$ ')
    d = troca(d, [('value="aud" checked>', 'value="aud">'), ('value="cli">', 'value="cli" checked>'),
                  ('value="Conciliação · Mendes x Loja Bela Casa" aria-describedby="nv-tit-aj" data-foco>', 'value="Primeira reunião · Rafaela Moura" aria-describedby="nv-tit-aj" data-foco>'),
                  ('value="16:00"', 'value="14:30"'), ('value="17:00"', 'value="15:30"'),
                  ('value="p">', 'value="p" checked>'), ('value="v" checked>', 'value="v">'),
                  ('<option>Diego Almeida</option><option>Felipe Matos</option><option>Gustavo Lima</option><option selected>Larissa Costa</option>',
                   '<option selected>Diego Almeida</option><option>Felipe Matos</option><option>Gustavo Lima</option><option>Larissa Costa</option>'),
                  ('<p id="janela-novo-d">Fica na agenda de quem vai, com seu nome e a hora, no histórico.</p>',
                   '<p id="janela-novo-d">Marcado a partir da conversa com Rafaela. Fica na agenda de quem vai, com seu nome e a hora, no histórico.</p>')])
    d = re.sub(r'<div class="campo "><label for="nv-link">.*?</div>',
               '<div class="campo "><label for="nv-local">Local</label><input class="entrada" id="nv-local" name="nv-local" type="text" autocomplete="off" value="No escritório · Rua Tabapuã, 1123, sala 84"></div>', d, count=1, flags=re.S)
    d = re.sub(r'<div class="x-dois"><div class="campo "><label for="nv-cli">.*?</div></div>',
               (f'<div class="jf-contato" role="group" aria-labelledby="nv-com"><b id="nv-com">Com quem</b><span>Rafaela Moura · <span class="num">(11) 97640-2281</span></span>'
                f'<span class="ajuda" style="margin:0">Da conversa. Ainda não está em Clientes; quando for cadastrada, o compromisso passa para a ficha dela.</span></div>'), d, count=1, flags=re.S)
    d = re.sub(r'<span>Lembrar Daniela pelo WhatsApp<small>.*?</small></span>',
               '<span>Lembrar Rafaela pelo WhatsApp<small>1 dia antes, no mesmo horário, e 2 horas antes, com o endereço. Vai para o número da conversa: (11) 97640-2281.</small></span>', d, count=1, flags=re.S)
    d = re.sub(r'<p class="x-pe-nota">.*?</p>', '', d, count=1, flags=re.S)
    return d


J_REUNIAO = j_reuniao()
add('conversa-nova', _CV + J_REUNIAO.replace(' data-abrir>', '>', 1), 'Conversas: número novo (os dois botões)', **CV_ATTR)
add('cadastro-conversa', cadastro_conversa(), 'Cadastro aberto com o nome e o telefone', atual='clientes', trilha='Clientes|Novo cliente', titulo='Novo cliente')
add('conversa-ligada', conversa_ligada() + J_REUNIAO.replace(' data-abrir>', '>', 1) + toast('Rafaela Moura cadastrada.', 'A conversa ficou ligada à ficha dela. O histórico da conversa continua aqui.'),
    'De volta à conversa, ligada à cliente', **CV_ATTR)
add('reuniao-conversa', _CV + J_REUNIAO, 'Primeira reunião já com o contato', **CV_ATTR)

# ---------------------------------------------------------------- 4b. A lista de Clientes com os passos novos
PASSO_LISTA['EN'] = ('t', 'Cliente atendido', 'caso encerrado e acertado em 30/09')
PASSO_LISTA['IC'] = ('t', 'Fechar o caso', 'encerrar no financeiro')
PASSO_LISTA['FB'] = ('t', 'Contrato ativo', 'C-2026-019 · mensal, sem caso')
add('lista-passos', '<div class="cl">' + cab_lista(True) + (folha_lista(lista_fl(ATIVOS), cont=f'<b>{len(ATIVOS)} clientes ativos</b> · {len(VENCIDOS)} com o próximo contato vencido · 2 sem proposta')) + '</div>',
    'Lista de Clientes: “Fechar o caso”, “Cliente atendido” e “Contrato ativo”', atual='clientes', trilha='Clientes', titulo='Clientes')

# ---------------------------------------------------------------- 9. Documentos para começar (AP-08, EX-18)
# Mesma história: o caso abriu hoje, 18/11, na assinatura. Antônia é cliente desde 27/10.
# 6 documentos para começar o caso: 2 já estavam na ficha (RG e CPF, certidão de óbito), a carta do INSS chegou hoje,
# faltam o comprovante novo (o da ficha passou de 90 dias), a certidão de casamento e o CNIS de Sebastião.
CSS_JF += r"""
/* ===== 9. Documentos para começar (AP-08, EX-18) ===== */
.jf-dcont{display:flex;align-items:baseline;gap:8px;margin:2px 0 0;font-size:13px;color:var(--tinta)}
.jf-dcont b{font-family:var(--serifa);font-size:22px;font-weight:600;color:var(--vinho)}
.jf-dbarra{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin:6px 0 2px;padding:0;list-style:none}
.jf-dbarra li{height:6px;border-radius:3px;background:var(--papel);box-shadow:inset 0 0 0 1px rgba(79,29,53,.45)}
.jf-dbarra li.ok{background:var(--vinho);box-shadow:none}
.jf-dfalta{margin:4px 0 0;padding:0 0 0 18px;font-size:13px;line-height:1.5;color:var(--tinta)}
.jf-dfalta li::marker{color:#4F1D35}
.docs .doc-meta .jf-de{color:var(--tinta)}
.jf-dpe{display:flex;gap:8px;align-items:flex-start;padding:12px 24px 18px;border-top:1px solid var(--divisor);font-size:12px;color:var(--texto-2);line-height:1.5}
.jf-dpe .ico{width:16px;height:16px;flex:none;margin-top:1px;color:var(--vinho-4)}
.jf-dpe a{color:var(--vinho);font-weight:500}
.jf-dvazio{padding:4px 24px 20px}
.jf-dvazio .estado{margin:0}
.jf-dcomuns{margin:10px 0 0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:6px;justify-content:center}
.jf-dcomuns li{font-size:12.5px;padding:4px 10px;border-radius:12px;background:var(--sal-2);color:var(--tinta)}
/* Janela de anexar: fotos que viram um PDF */
.jf-fotos-bts{display:flex;gap:8px;flex-wrap:wrap}
.jf-fotos{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:6px}
.jf-fotos li{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:12px;align-items:center;padding:8px 10px;border-radius:var(--raio);border:1px solid var(--borda-folha);background:var(--papel)}
.jf-fotos .jf-mini{width:40px;height:40px;border-radius:8px;display:grid;place-items:center;background:var(--sal-2);color:var(--vinho)}
.jf-fotos b{display:block;font-weight:500;font-size:13.5px}
.jf-fotos small{display:block;font-size:12px;color:var(--texto-2)}
.jf-fotos.erro li{border-color:#AC3F6B}
.jf-fotos .jf-resto{grid-template-columns:minmax(0,1fr);font-size:12.5px;color:var(--texto-2);background:var(--sal-2);border-style:dashed}
.jf-junta-pdf{display:flex;gap:8px;align-items:flex-start;margin:8px 0 0;font-size:12.5px;line-height:1.45;color:var(--texto-2)}
.jf-junta-pdf .ico{width:16px;height:16px;flex:none;margin-top:1px;color:var(--vinho-4)}
.jf-anx-g{display:grid;gap:16px}
/* Janela de abrir o caso: a lista que vem pronta */
.jf-dlista{border:0;margin:0;padding:0;min-width:0}
.jf-dlista legend{font-family:var(--serifa);font-size:19px;font-weight:600;color:var(--vinho);padding:0;margin-bottom:2px}
.jf-dlista legend small{display:block;font-family:var(--sans);font-size:12.5px;font-weight:400;color:var(--texto-2);margin-top:2px}
.jf-dl{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:6px}
.jf-dl .opcao{align-items:flex-start}
.jf-dl .opcao small .selo{margin-left:0}
.jf-dl .jf-tem{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:14px;color:var(--texto)}
.jf-dl .jf-tem>.ico{width:18px;height:18px;flex:none;margin-top:2px;color:var(--vinho)}
.jf-dl .jf-tem small{display:block;font-size:12px;color:var(--texto-2)}
.jf-dl .jf-tip{display:inline-block;font-size:11px;font-weight:600;letter-spacing:.03em;color:var(--vinho);background:var(--papel);border-radius:9px;padding:0 7px;margin-left:6px;box-shadow:inset 0 0 0 1px var(--borda-folha)}
.jf-dmais{margin-top:8px}
.jf-davisa{margin-top:14px}
.jf-dsem{display:grid;gap:8px;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.5}
.jf-dsem b{font-weight:600}
.jf-dsem a{color:var(--vinho);font-weight:500}
/* Lista por área */
.jf-areas.chips{margin:0;flex-wrap:wrap;padding:0 24px 14px}
.jf-areas.chips button .jf-q{font-size:12px;color:var(--texto-2);font-weight:400}
.ju-etapas .nm .jf-txt{display:block;margin-top:4px;font-size:13px;color:var(--texto)}
.jf-tipo{display:grid;gap:6px}
.jf-tipo .opcao{min-height:44px}
.jf-sug{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:6px;text-align:left}
.jf-sug li{display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.45}
.jf-sug li .ico{width:16px;height:16px;flex:none;margin-top:2px;color:var(--vinho-4)}
.jf-sug small{color:var(--texto-2)}
.jf-sug-caixa{margin:0 24px 20px;padding:16px 18px;border-radius:var(--raio-g);border:1px dashed var(--borda-folha);background:var(--papel)}
.jf-sug-caixa h3{margin:0;font-family:var(--sans);font-size:12px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--vinho-2)}
@media (max-width:760px){
  .jf-dpe{padding:12px 16px 16px}
  .jf-dvazio{padding:4px 16px 16px}
  .jf-areas.chips{padding:0 16px 12px}
  .jf-sug-caixa{margin:0 16px 16px}
  .jf-fotos-bts .btn{flex:1 1 auto;justify-content:center}
}
"""

FOI_HOJE = '18/11'
DOCS_FALTA = ['Comprovante de residência novo', 'Certidão de casamento', 'Extrato do CNIS de Sebastião']


def dir_docs(chegaram=3, total=6, acoes=None):
    barra = ''.join(f'<li class="{"ok" if i < chegaram else ""}"></li>' for i in range(total))
    fal = ''.join(f'<li>{d}</li>' for d in DOCS_FALTA)
    ac = acoes if acoes is not None else (
        f'<button class="btn btn-pri" type="button" data-janela="janela-doc">{ico("enviar")}Anexar o que chegou</button>'
        f'<a class="btn btn-sec" href="#" data-rota="/conversas/joana-prado?texto=documentos">{ico("whats")}Pedir de novo</a>')
    return (f'<section class="dir campo-ambar fl-passo" aria-labelledby="t-passo"><p class="sobretitulo" id="t-passo">Próximo passo · antes de seguir o caso</p>'
            f'<p class="grande" style="font-size:28px">Juntar os documentos</p>{jornada(3)}'
            f'<p class="jf-dcont"><b>{chegaram} de {total}</b><span>chegaram para começar {CASO}</span></p>'
            f'<ol class="jf-dbarra" aria-hidden="true">{barra}</ol>'
            f'<p class="cl-oque" style="margin-top:6px"><b>Faltam:</b></p><ul class="jf-dfalta">{fal}</ul>'
            f'<div class="fl-acoes">{ac}</div>'
            f'<p class="jf-quem">{ico("relogio")}<span>Joana recebeu a lista hoje pelo WhatsApp. Se nada chegar em 3 dias, a automação “Documento pendente” lembra de novo.</span></p></section>')


D_DOC = dir_docs()


def li_doc(nome, selo_, meta, acoes, falta=False):
    ic = 'alerta' if falta else 'doc'
    return (f'<li><span class="doc-ico" aria-hidden="true">{ico(ic)}</span><div><span class="doc-nome">{nome}</span>'
            f'<p class="doc-meta">{selo_}<span>{meta}</span></p></div><div class="doc-acoes">{acoes}</div></li>')


def b_abrir(o):
    return f'<button class="btn btn-sec btn-compacto" type="button">{ico("olho", "ico ico-s")}Abrir<span class="sr">: {o}</span></button>'


def b_trocar(o, pri=False):
    c = 'btn-sec' if pri else 'btn-fantasma'
    return f'<button class="btn {c} btn-compacto" type="button" data-janela="janela-doc">{ico("enviar", "ico ico-s")}Anexar um novo<span class="sr">: {o}</span></button>'


def b_pedir(o):
    return f'<a class="btn btn-sec btn-compacto" href="#" data-rota="/conversas/joana-prado?texto=documentos">{ico("whats", "ico ico-s")}Pedir de novo<span class="sr">: {o}</span></a>'


S_OK = lambda t='Em dia': f'<span class="selo selo-ok">{ico("check")}{t}</span>'
S_VELHO = f'<span class="selo selo-atencao">{ico("relogio")}Mais de 90 dias</span>'
S_FALTA = '<span class="selo selo-atencao">Falta</span>'


def folha_docs_pessoais(completo=False):
    guard = (li_doc('RG e CPF', S_OK(), '2 fotos num PDF · enviado por Paula Nunes em 06/11/2026', b_abrir('RG e CPF') + b_trocar('RG e CPF'))
             + li_doc('Certidão de óbito de Sebastião Prado', S_OK(), 'PDF · emitida em 21/09/2026 · Joana mandou pelo WhatsApp, anexado em 06/11', b_abrir('certidão de óbito') + b_trocar('certidão de óbito')))
    if completo:
        guard = (li_doc('Comprovante de residência', S_OK('Em dia · 15 dias'), 'Conta de luz de 03/11/2026 · anexado hoje, 17h20, por Paula Nunes',
                        b_abrir('comprovante') + b_trocar('comprovante'))
                 + guard + li_doc('Certidão de casamento', S_OK(), '2 fotos num PDF · anexado hoje, 17h20', b_abrir('certidão de casamento') + b_trocar('certidão de casamento')))
        corpo = f'<div class="ju-sub"><h3>Guardados · 4</h3></div><ul class="lista docs">{guard}</ul>'
        sub = '4 guardados · todos em dia · valem para todos os casos de Antônia'
    else:
        velho = li_doc('Comprovante de residência', S_VELHO, '<span class="jf-de">Conta de luz de 02/07/2026, 139 dias.</span> Anexado por Marina em 28/10. Um novo foi pedido hoje.',
                       b_trocar('comprovante de residência', True) + b_abrir('comprovante de residência antigo'))
        falta = li_doc('Certidão de casamento', S_FALTA, f'Pedida hoje, {FOI_HOJE}, para {CASO}', b_trocar('certidão de casamento', True) + b_pedir('certidão de casamento'), falta=True)
        corpo = (f'<div class="ju-sub"><h3>Precisa de atenção · 2</h3></div><ul class="lista docs ju-falta">{velho}{falta}</ul>'
                 f'<div class="ju-sub"><h3>Em dia · 2</h3></div><ul class="lista docs">{guard}</ul>')
        sub = '4 documentos · 2 em dia, 1 com mais de 90 dias, 1 falta · valem para todos os casos de Antônia'
    pe = (f'<p class="jf-dpe">{ico("cadeado")}<span>Anexar um novo guarda o anterior, com quem anexou e quando. Quem vê a ficha de Antônia vê estes documentos. '
          f'O número do RG não sai da foto: complete em Dados e qualificação.</span></p>')
    return folha_aba('t-dp', 'Documentos pessoais', sub, corpo + pe,
                     acoes=f'<button class="btn btn-sec" type="button" data-janela="janela-doc">{ico("mais")}Anexar documento</button>')


def lateral_docs(fase='andamento'):
    caso = f'{CASO} · Preparação' + (' · faltam 3 documentos' if fase == 'andamento' else '')
    return proc_ant() + resumo(f'{P_NUM} · virou contrato', f'{C_NUM} · ativo desde 18/11', caso) + origem_ant()


TIPOS_DOC = ['RG e CPF', 'CNH', 'Comprovante de residência', 'Certidão de casamento', 'Certidão de nascimento', 'Certidão de óbito', 'Outro documento pessoal']


def j_doc(variante='ok', abrir=True):
    erro = variante == 'erro'
    tipo = 'Certidão de casamento'
    if erro:
        fotos = ''.join(f'<li><span class="jf-mini" aria-hidden="true">{ico("imagem")}</span><span><b>Foto {i}</b><small>da câmera · {m} MB</small></span>'
                        f'<button class="btn btn-fantasma btn-compacto" type="button">{ico("x", "ico ico-s")}Tirar<span class="sr"> a foto {i}</span></button></li>'
                        for i, m in ((1, '2,1'), (2, '2,3')))
        fotos += '<li class="jf-resto">e mais 9 fotos, da 3 à 11</li>'
        fotos_cls = 'jf-fotos erro'
        arq_err = (f'<p class="erro-msg" id="dc-arq-er">{ico("alerta", "ico ico-s")}São 11 fotos e o limite é 10. Tire a que sobrou ou junte as páginas num PDF só.</p>')
        data = campo_j('dc-data', 'Data do documento', '25/11/2026', 'c3', erro='Confira a data: ela não pode ser depois de hoje (18/11/2026).', im='numeric')
        topo = aviso('urgencia', 'Nada foi guardado. Falta acertar 2 pontos.',
                     '<a href="#dc-foto">São 11 fotos, uma a mais que o limite</a> · <a href="#dc-data">A data é depois de hoje</a>. As fotos continuam aqui.')
    else:
        fotos = ''.join(f'<li><span class="jf-mini" aria-hidden="true">{ico("imagem")}</span><span><b>Foto {i}</b><small>{t} · da câmera · {m} MB</small></span>'
                        f'<button class="btn btn-fantasma btn-compacto" type="button">{ico("x", "ico ico-s")}Tirar<span class="sr"> a foto {i}</span></button></li>'
                        for i, t, m in ((1, 'frente', '2,1'), (2, 'verso', '1,9')))
        fotos_cls, arq_err, topo = 'jf-fotos', '', ''
        data = campo_j('dc-data', 'Data do documento', '14/05/2019', 'c3', ajuda='A data que está no papel: emissão da certidão, data da conta. No comprovante, é ela que conta os 90 dias.', im='numeric')
    desc_ids = 'dc-arq-aj' + (' dc-arq-er' if erro else '')
    arq = (f'<div class="campo"><p class="pe-rot" id="dc-arq-r">O documento</p>'
           f'<div class="jf-fotos-bts" role="group" aria-labelledby="dc-arq-r">'
           f'<button class="btn btn-sec" type="button" id="dc-foto" aria-describedby="{desc_ids}"{" data-foco" if erro else ""}>{ico("imagem")}Tirar foto</button>'
           f'<button class="btn btn-sec" type="button" aria-describedby="dc-arq-aj">{ico("enviar")}Escolher arquivo</button></div>'
           f'<p class="ajuda" id="dc-arq-aj">PDF ou foto, até 10 MB. Várias páginas: um PDF só ou até 10 fotos.</p>{arq_err}'
           f'<ol class="{fotos_cls}" aria-label="Fotos, na ordem das páginas">{fotos}</ol>'
           f'<p class="jf-junta-pdf">{ico("doc")}<span>As fotos viram <b>um PDF só</b>, na ordem acima. No celular, “Tirar foto” abre a câmera.</span></p></div>')
    sel = sel_j('dc-tipo', 'Qual documento', TIPOS_DOC, tipo, 'c3', vazio='', ajuda='Documento pessoal fica na ficha e serve a todos os casos. Documento só do processo vai em Documentos do caso.')
    atende = (f'<label class="opcao"><input class="marcar" type="checkbox" name="dc-pedido" checked><span>Marcar como chegou em {CASO}'
              f'<small>Atende o pedido de hoje, {FOI_HOJE}. O próximo passo passa para 4 de 6 e o lembrete deixa de pedir este.</small></span></label>')
    corpo = f'{topo}<div class="jf-anx-g">{sel}{arq}{data}{atende}</div>'
    pe = (f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button>'
          f'<button class="btn btn-pri" type="submit"{"" if erro else " data-foco"}>{ico("check")}Guardar na ficha</button>')
    return janela('janela-doc', 'Antônia Ferreira Prado · documentos pessoais', 'Anexar documento',
                  'Fica na ficha de Antônia, com seu nome e a hora.', corpo, pe, abrir=abrir)


def ficha_docs(dir_html, completo=False, extra=''):
    return ficha_fl(dir_html, 'ficha', com_lateral(dados_ant() + folha_docs_pessoais(completo) + contatos_ant(), lateral_docs('completo' if completo else 'andamento')), N3) + j_registrar() + extra


add('docs-ficha', ficha_docs(D_DOC, extra=j_doc(abrir=False)), 'Ficha: documentos pessoais e “Juntar os documentos, 3 de 6”', aba='ficha', **FT)
add('docs-anexar', ficha_docs(D_DOC, extra=j_doc()), 'Anexar documento: 2 fotos viram um PDF', aba='ficha', **FT)
add('docs-anexar-erro', ficha_docs(D_DOC, extra=j_doc('erro')), 'Anexar: 11 fotos e data depois de hoje', aba='ficha', **FT)
D_CAS_OK = dir_passo(CASO, '<b>Preparação, 1 de 8 · com Larissa Costa.</b><br>Os 6 documentos para começar chegaram.', B_VER_CASO.replace('caso-aberto', 'docs-caso'), 4, contato=None, sobre='Caso em andamento', grande_px=26)
add('docs-completo', ficha_docs(D_CAS_OK, completo=True) + toast('Os documentos para começar chegaram.',
    f'Os 6 de {CASO} estão guardados. Larissa recebeu o aviso no sino, e o lembrete pelo WhatsApp parou.'),
    'Tudo chegou: o passo volta a “Caso em andamento”', aba='ficha', **FT)

# Ficha vazia: Rafaela Moura, cadastrada hoje pela conversa (grupo 7)
RAF = dict(nome='Rafaela Moura', tp='PF', desde='18/11/2026')
D_RAF = dir_passo('Fazer a proposta', '<b>Ainda não há proposta.</b><br>Primeira reunião em 24/11, com Marina.', b_gerar_proposta(), 0, contato=None)


def ficha_rafaela():
    dl = ('<div class="inteira"><dt>Nome completo</dt><dd>Rafaela Moura</dd></div>'
          '<div><dt>CPF</dt><dd class="falta">Falta</dd></div><div><dt>Estado civil</dt><dd class="falta">Falta</dd></div>'
          '<div class="inteira"><dt>Endereço</dt><dd class="falta">Falta</dd></div>')
    dados = (f'<section class="folha" aria-labelledby="t-dados"><div class="folha-cab"><div><h2 id="t-dados">Dados e qualificação</h2>'
             f'<p class="sub">Veio da conversa: nome e telefone. O resto entra na primeira reunião.</p></div>'
             f'<div class="acoes"><a class="btn btn-sec" href="#">{ico("lapis")}Editar</a></div></div><dl class="dados-ficha">{dl}</dl></section>')
    comuns = ''.join(f'<li>{x}</li>' for x in ('RG e CPF, ou CNH', 'Comprovante de residência de até 90 dias', 'Certidão de casamento ou de nascimento'))
    vazio = estado('Nenhum documento de Rafaela ainda',
                   'Os documentos pessoais ficam aqui e servem a todos os casos dela. Os que quase todo caso pede:',
                   'doc', moldura=False,
                   acoes=(f'<button class="btn btn-pri" type="button">{ico("mais")}Anexar documento</button>'
                          f'<a class="btn btn-sec" href="#" data-rota="/conversas/rafaela-moura?texto=documentos">{ico("whats")}Pedir pelo WhatsApp</a>'))
    vazio = vazio.replace('</p><div class="acoes">', f'</p><ul class="jf-dcomuns">{comuns}</ul><div class="acoes">', 1)
    docs = folha_aba('t-dp', 'Documentos pessoais', 'Nenhum ainda', f'<div class="jf-dvazio">{vazio}</div>'
                     f'<p class="jf-dpe">{ico("whats")}<span>“Pedir pelo WhatsApp” abre a conversa de Rafaela com o pedido escrito, para você conferir e enviar. '
                     f'Quando o caso abrir, a lista da área entra sozinha e o lembrete automático passa a valer.</span></p>')
    org = (f'<section class="folha" aria-labelledby="t-org"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-org" style="font-size:20px">Origem</h2></div></div>'
           f'<dl class="cl-origem"><div><dt>Como chegou</dt><dd>WhatsApp do escritório</dd></div><div><dt>Primeiro contato</dt><dd>18/11/2026, pela conversa</dd></div>'
           f'<div><dt>Cadastrado por</dt><dd>Marina Ribeiro</dd></div></dl></section>')
    return ficha_x(RAF, D_RAF, 'ficha', com_lateral(dados + docs, org), dict(atendimentos=1, propostas=0, contratos=0, casos=0))


add('docs-ficha-vazio', ficha_rafaela() + j_registrar(), 'Ficha sem documentos: o que quase todo caso pede', aba='ficha',
    atual='clientes', trilha='Clientes|Rafaela Moura', titulo='Rafaela Moura')

# ---------------------------------------------------------------- a lista por área (EX-18), ao lado de Etapas do escritório
LISTAS = {
    'Previdenciário': [('RG e CPF, ou CNH', 'pessoal', True, 'Documento com foto e o CPF.'),
                       ('Comprovante de residência', 'pessoal', True, 'Conta de luz, água ou telefone dos últimos 90 dias.'),
                       ('Certidão de casamento ou de nascimento', 'pessoal', True, 'A certidão do estado civil de hoje.'),
                       ('Extrato do CNIS', 'caso', True, 'Pelo Meu INSS. Se não conseguir, a gente ajuda.'),
                       ('Carta do INSS', 'caso', False, 'Se o pedido foi negado, a carta com o motivo.'),
                       ('Laudos e exames médicos', 'caso', False, 'Só nos pedidos por doença: os dos últimos 2 anos.'),
                       ('Certidão de óbito', 'pessoal', False, 'Só na pensão por morte: a de quem faleceu.')],
    'Trabalhista': 6, 'Cível': 4, 'Consumidor': 4, 'Família': 0, 'Saúde': 4, 'Tributário': 0}

SUG = {'Família': [('RG e CPF, ou CNH', 'pessoal', True), ('Comprovante de residência', 'pessoal', True), ('Certidão de casamento ou de nascimento', 'pessoal', True),
                   ('Certidão de nascimento dos filhos', 'pessoal', False), ('Comprovantes de renda', 'caso', True), ('Lista dos bens e dívidas', 'caso', False)]}


def chips_areas(sel):
    b = ''
    for a, v in LISTAS.items():
        n = len(v) if isinstance(v, list) else v
        q = f'{n} documentos' if n else 'sem lista'
        b += f'<button type="button" aria-pressed="{"true" if a == sel else "false"}">{a}<span class="jf-q">· {q}</span></button>'
    return f'<div class="chips jf-areas" role="group" aria-label="Área">{b}</div>'


def tag_tipo(t):
    return (f'<span class="selo selo-neutro">{ico("pessoas")}Pessoal · fica na ficha</span>' if t == 'pessoal'
            else f'<span class="selo selo-andamento">{ico("balanca")}Do caso</span>')


def pagina_docs(area='Previdenciário'):
    itens = LISTAS[area]
    if isinstance(itens, list):
        n = len(itens)
        li = ''
        for i, (nome, tp, obrig, txt) in enumerate(itens, 1):
            selos = tag_tipo(tp) + ('' if obrig else '<span class="selo selo-neutro">Se houver</span>')
            if nome.startswith('Comprovante'):
                selos += f'<span class="selo selo-atencao">{ico("relogio")}Vale 90 dias</span>'
            up = f'<button class="btn btn-icone" type="button" aria-label="Subir {nome}"{" disabled" if i == 1 else ""}>{ico("baixo", "ico ju-icone-up")}</button>'
            dn = f'<button class="btn btn-icone" type="button" aria-label="Descer {nome}"{" disabled" if i == n else ""}>{ico("baixo")}</button>'
            ed = f'<button class="btn btn-sec btn-compacto" type="button" aria-label="Editar {nome}">{ico("lapis", "ico ico-s")}Editar</button>'
            if i == 6:
                li += (f'<li class="edit"><span class="disco"><span>{i}</span></span><div class="ju-edit" role="group" aria-label="Editando {nome}">'
                       f'<div class="ju-dois">' + campo_j('ed-nome', 'Nome do documento', nome, 'c3', foco=True, ajuda='Curto. É o nome que a equipe vê.')
                       + campo_j('ed-txt', 'Como pedir ao cliente', txt, 'c3', ajuda='Vai na mensagem do WhatsApp, em linguagem simples.') + '</div>'
                       f'<fieldset class="jf-tipo"><legend class="pe-rot">Onde fica</legend>'
                       f'<label class="opcao"><input class="marcar" type="radio" name="ed-tipo" value="pessoal"><span>Pessoal: fica na ficha do cliente<small>Serve a todos os casos dele. Se já estiver lá, não é pedido de novo.</small></span></label>'
                       f'<label class="opcao"><input class="marcar" type="radio" name="ed-tipo" value="caso" checked><span>Do caso: fica em Documentos do caso<small>É pedido a cada caso novo.</small></span></label></fieldset>'
                       f'<label class="opcao"><input class="marcar" type="checkbox" name="ed-se" checked><span>Só se houver<small>Vem marcado na abertura do caso, mas quem abre pode tirar. Não conta como falta se for tirado.</small></span></label>'
                       f'<div class="ju-edit-pe"><button class="btn btn-perigo" type="button">{ico("x")}Tirar da lista</button><button class="btn btn-fantasma" type="button">Cancelar</button>'
                       f'<button class="btn btn-pri" type="button">{ico("check")}Salvar documento</button></div></div></li>')
                continue
            li += (f'<li><span class="disco"><span>{i}</span></span><div class="nm"><strong>{nome}{selos}</strong>'
                   f'<span class="jf-txt">“{txt}”</span></div><div class="ac">{up}{dn}{ed}</div></li>')
        corpo = f'<ol class="ju-etapas">{li}</ol>'
        sub = f'{n} documentos · 4 pessoais, 3 do caso · vale para todo caso novo de {area.lower()}'
        acoes = f'<button class="btn btn-sec" type="button">{ico("mais")}Adicionar documento</button>'
    else:  # sem lista
        sug = ''.join(f'<li>{ico("doc")}<span>{nm} <small>· {"pessoal" if tp == "pessoal" else "do caso"}{"" if ob else ", se houver"}</small></span></li>' for nm, tp, ob in SUG[area])
        corpo = (estado(f'{area} ainda não tem lista',
                        f'Enquanto não tiver, nada é pedido sozinho quando um caso de {area.lower()} abre: os pedidos são feitos um a um, em Documentos do caso. '
                        'Comece pela sugestão do T3jus e ajuste ao jeito do escritório.', 'doc', moldura=False,
                        acoes=(f'<button class="btn btn-pri" type="button">{ico("check")}Usar a sugestão do T3jus</button>'
                               f'<button class="btn btn-sec" type="button">{ico("mais")}Começar do zero</button>'))
                 + f'<div class="jf-sug-caixa"><h3>A sugestão para {area.lower()}</h3><ul class="jf-sug">{sug}</ul></div>')
        sub = 'Sem lista ainda'
        acoes = ''
    pe = (f'<p class="ju-pe">{ico("historico")}<span>Cada mudança fica no histórico do escritório, com seu nome e a hora. '
          f'Mudar a lista não muda os casos que já abriram: vale do próximo caso em diante.</span></p>')
    lista = (f'<section class="folha" aria-labelledby="t-dl" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-dl">Documentos de {area.lower()}</h2>'
             f'<p class="sub">{sub}</p></div>' + (f'<div class="acoes">{acoes}</div>' if acoes else '') + f'</div>{chips_areas(area)}{corpo}{pe}</section>')
    exp = (f'<section class="explica campo-ambar" aria-labelledby="t-exd"><p class="sobretitulo">Como funciona</p><h2 id="t-exd">O caso já abre pedindo.</h2><ul>'
           f'<li>{ico("balanca")}<span>Quando um caso abre (na assinatura, em “Abrir o caso” ou em Novo caso), a lista da área vem pronta para quem abre conferir.</span></li>'
           f'<li>{ico("pessoas")}<span>Os pessoais (RG, comprovante, certidões) ficam na ficha do cliente. O que já está lá vem como “já temos” e não é pedido de novo.</span></li>'
           f'<li>{ico("relogio")}<span>O comprovante de residência com mais de 90 dias é pedido de novo. O prazo muda em Ajustes do escritório.</span></li>'
           f'<li>{ico("whats")}<span>O cliente recebe a lista pelo WhatsApp, e a automação “Documento pendente” lembra o que faltar.</span></li>'
           f'<li>{ico("cadeado")}<span>Só a sócia dona muda estas listas. A equipe vê e pode pedir mais um documento em cada caso.</span></li></ul></section>')
    cab = (f'<div class="pt-cab"><div><a class="ver" href="#" style="padding:0">{ico("esq", "ico ico-s")}Casos e processos</a>'
           f'<p class="sobretitulo" style="margin-top:6px">Jurídico · só a sócia dona edita</p><h1>Documentos para começar</h1><span class="fio" aria-hidden="true"></span>'
           f'<p class="lede">O que cada área pede ao cliente para o processo começar. Fica ao lado de Etapas do escritório.</p></div></div>')
    return f'<div class="ju">{cab}<div class="ju-grade"><div class="ju-col">{lista}</div><aside class="ju-col" aria-label="Como funcionam os documentos para começar">{exp}</aside></div></div>'


DL = dict(area='juridico', secao='Casos e processos', atual='juridico', trilha='Jurídico|Casos e processos|Documentos para começar', titulo='Documentos para começar')
add('docs-lista', pagina_docs(), 'Jurídico: a lista de previdenciário, editando um item', **DL)
add('docs-lista-vazia', pagina_docs('Família'), 'Área sem lista: “Usar a sugestão do T3jus”', **DL)


# ---------------------------------------------------------------- na abertura do caso (EX-18)
def fs_docs(sem_lista=False):
    if sem_lista:
        return (f'<fieldset class="jf-dlista"><legend>Documentos para começar<small>Família ainda não tem lista.</small></legend>'
                f'<div class="jf-dsem"><p style="margin:0"><b>Nada será pedido sozinho.</b> Da ficha de Irene, o caso já leva o RG e CPF, guardado em 12/09.</p>'
                f'<p style="margin:0">Peça agora o que faltar, um a um, ou <a href="?estado=docs-lista-vazia">monte a lista de família</a> para os próximos casos.</p></div>'
                f'<div class="jf-dmais">{campo_j("dd-mais", "Pedir mais um documento", "", "c3", opc=True, ph="Ex.: certidão de óbito de Jorge Castro")}</div></fieldset>')
    tem = lambda n, s: f'<li class="jf-tem">{ico("check")}<span>{n}<span class="jf-tip">Já temos</span><small>{s}</small></span></li>'
    pedir = lambda v, n, s, marc=True: (f'<li><label class="opcao"><input class="marcar" type="checkbox" name="dd-doc" value="{v}"{" checked" if marc else ""}>'
                                        f'<span>{n}<small>{s}</small></span></label></li>')
    li = (tem('RG e CPF', 'Na ficha de Antônia desde 06/11')
          + pedir('comp', 'Comprovante de residência', 'O da ficha é de 02/07, com mais de 90 dias. Pedir um novo.')
          + pedir('cas', 'Certidão de casamento', 'Pessoal: quando chegar, fica na ficha')
          + tem('Certidão de óbito', 'De Sebastião Prado, na ficha desde 06/11 · se houver')
          + pedir('cnis', 'Extrato do CNIS', 'Do caso')
          + pedir('carta', 'Carta do INSS', 'Do caso · se houver')
          + pedir('laudo', 'Laudos e exames médicos', 'Do caso · se houver. Pensão por morte não pede: tirado.', marc=False))
    prev = ('Olá, Joana. Aqui é do escritório Ribeiro &amp; Matos. Para começar o processo de Antônia contra o INSS, precisamos de: '
            'comprovante de residência recente (dos últimos 3 meses), certidão de casamento, extrato do CNIS de Sebastião e a carta do INSS, se tiver. '
            'Pode mandar foto por aqui mesmo. Qualquer dúvida, é só responder esta mensagem.')
    avisa = (f'<div class="ju-wpp jf-davisa"><label class="opcao"><input class="marcar" type="checkbox" name="dd-avisar" checked><span>Avisar Joana Prado pelo WhatsApp com a lista'
             f'<small>Joana é o contato principal de Antônia. Desmarque para pedir de outro jeito.</small></span></label>'
             f'<p class="ju-balao-cab">{ico("whats")}Prévia</p><p class="ju-balao">{prev}</p></div>')
    return (f'<fieldset class="jf-dlista"><legend>Documentos para começar<small>A lista de previdenciário, com o que já está na ficha. Desmarque o que não serve a este caso.</small></legend>'
            f'<ul class="jf-dl">{li}</ul>'
            f'<div class="jf-dmais">{campo_j("dd-mais", "Pedir mais um documento", "", "c3", opc=True, ph="Ex.: certidão de nascimento de Joana")}</div>{avisa}</fieldset>')


def j_caso_docs():
    h = j_caso(abrir=True)
    alvo = f'<p class="fl-depois">{ico("seta")}<span>Ao abrir, <b>você vai para a ficha do caso</b>, em Jurídico › Casos e processos.</span></p>'
    h = troca(h, [(alvo, fs_docs() + f'<p class="fl-depois">{ico("seta")}<span>Ao abrir, os 4 pedidos entram em Documentos do caso e no próximo passo da ficha de Antônia, '
                                     f'e <b>você vai para a ficha do caso</b>. A mesma lista aparece em “Registrar assinatura”, “Anexar os assinados” e Novo caso.</span></p>')])
    return h


add('docs-abrir-caso', ficha_fl(D_SCA, 'casos', aba_casos('vazio-assinado'), dict(N2, casos=0)) + j_registrar() + j_caso_docs(),
    'Abrir o caso: a lista vem pronta, com “já temos”', aba='casos', **FT)

_JI = j_caso_x('janela-caso-ic', 'Irene Castro', 'Irene', 'C-2026-021', '12/09', '10 × R$ 1.200,00', 'Inventário de Jorge Castro', 'Família', 'Marina Ribeiro (você)', 'Interessada', abrir=True)
_JI = troca(_JI, [(f'<p class="fl-depois">', fs_docs(sem_lista=True) + '<p class="fl-depois">')])
add('docs-abrir-sem-lista', lista_contratos_sem_caso() + J_HELIO + _JI, 'Abrir o caso de uma área sem lista', **CL_CT)


# ---------------------------------------------------------------- a ficha do caso: o que falta antes de seguir
def ficha_caso_docs():
    h = ficha_caso_novo()
    h = troca(h, [(f'<p class="ju-agora">Desde hoje, 18/11. Próxima: <b>{J["NOME_E"][1]}</b>.</p><button class="btn btn-pri" type="button">{ico("seta")}Mudar etapa</button>',
                   f'<p class="ju-agora">Desde hoje, 18/11. <b>Antes de seguir: juntar os documentos, 3 de 6.</b></p>'
                   f'<div class="fl-acoes"><a class="btn btn-pri" href="#t-docs">{ico("doc")}Ver o que falta</a>'
                   f'<button class="btn btn-sec" type="button">{ico("seta")}Mudar etapa</button></div>')])
    f = J['folha']

    def falta(nome, onde, acoes):
        return li_doc(nome, S_FALTA, onde, acoes, falta=True)
    ja = (f'<button class="btn btn-sec btn-compacto" type="button" data-janela="janela-doc">{ico("enviar", "ico ico-s")}Já chegou<span class="sr">: {{}}</span></button>')
    fal = ('<ul class="lista docs ju-falta">'
           + falta('Comprovante de residência novo', f'Pessoal · o da ficha passou de 90 dias · pedido hoje a Joana', ja.format('comprovante') + b_pedir('comprovante'))
           + falta('Certidão de casamento', 'Pessoal · pedido hoje a Joana', ja.format('certidão de casamento') + b_pedir('certidão de casamento'))
           + falta('Extrato do CNIS de Sebastião', 'Do caso · pedido hoje a Joana', ja.format('CNIS') + b_pedir('CNIS'))
           + '</ul>')
    da_ficha = S_OK('Da ficha')
    lig = ('<ul class="lista docs">'
           + li_doc('Carta do INSS', S_OK('Chegou hoje'), 'Foto · Joana mandou pelo WhatsApp · anexada por Paula Nunes, 16h40', b_abrir('carta do INSS'))
           + li_doc('RG e CPF', da_ficha, 'Pessoal · guardado na ficha de Antônia em 06/11', b_abrir('RG e CPF'))
           + li_doc('Certidão de óbito de Sebastião Prado', da_ficha, 'Pessoal · guardada na ficha em 06/11', b_abrir('certidão de óbito'))
           + '</ul>')
    corpo = (f'<div class="ju-sub"><h3>Faltam 3</h3></div>{fal}<div class="ju-sub"><h3>Já temos · 3</h3></div>{lig}'
             f'<p class="docs-pe">{ico("relogio")}<span>Joana recebeu a lista hoje. Se nada chegar em 3 dias, a automação “Documento pendente” lembra de novo. '
             f'Os pessoais que chegarem vão para a ficha de Antônia e servem aos próximos casos.</span></p>')
    docs = f('t-docs', 'Documentos para começar', '3 de 6 · a lista de previdenciário, conferida na abertura', corpo,
             acoes=f'<button class="btn btn-sec" type="button">{ico("mais")}Pedir documento</button>')
    h = troca(h, [('<div class="ju-grade ju-ficha-grade"><div class="ju-col">', f'<div class="ju-grade ju-ficha-grade"><div class="ju-col">{docs}')])
    return h + j_doc(abrir=False).replace('Antônia Ferreira Prado · documentos pessoais', f'{CASO} · documentos').replace('Guardar na ficha', 'Guardar')


add('docs-caso', ficha_caso_docs(), 'Ficha do caso: “Antes de seguir”, o que falta e o que já temos', area='juridico', secao='Casos e processos', atual='juridico',
    trilha=f'Jurídico|Casos e processos|{CASO}', titulo=CASO)


# ====================================================================================== página
GRUPOS = [
    ('1. Uma porta só para a assinatura (CH-11)', ['anexar-caso', 'anexar-erro', 'anexar-sem-juridico', 'anexado-caso']),
    ('2. Assinados sem caso (CH-11)', ['contratos-sem-caso', 'contratos-sem-caso-abrir', 'contratos-sem-caso-vazio', 'casos-sem-caso']),
    ('3. Juntar ao caso que já existe (CH-12)', ['assinar-juntar']),
    ('4. O passo do fechamento (EX-16)', ['fecha-exito', 'fecha-repasse', 'fecha-financeiro', 'fecha-contrato', 'fecha-larissa', 'atendido', 'lista-passos']),
    ('5. Encerrar em cadeia (EX-17)', ['caso-acerto', 'caso-acerto-larissa', 'acerto', 'encerrar-cadeia', 'encerrar-cadeia-erro', 'encerrado-cadeia']),
    ('6. Contrato sem caso (CH-13)', ['contrato-ativo', 'contrato-sem-caso', 'contrato-abrir-caso']),
    ('7. Cadastro pela conversa (AP-07)', ['conversa-nova', 'cadastro-conversa', 'conversa-ligada', 'reuniao-conversa']),
    ('8. O botão do passo uma vez só', ['passo-uma-vez']),
    ('9. Documentos para começar (AP-08, EX-18)', ['docs-ficha', 'docs-anexar', 'docs-anexar-erro', 'docs-ficha-vazio', 'docs-lista', 'docs-lista-vazia',
                                                   'docs-abrir-caso', 'docs-abrir-sem-lista', 'docs-caso', 'docs-completo']),
]
ROT = dict(EST)
assert sorted(sum((g[1] for g in GRUPOS), [])) == sorted(ROT), set(ROT) ^ set(sum((g[1] for g in GRUPOS), []))
nav = ''.join(f'<p>{g}</p>' + ''.join(f'<a href="?estado={e}">{ROT[e]}</a>' for e in es) for g, es in GRUPOS)
NAV = (f'<details id="fl-estados"><summary>{ico("menu")}<span class="sr">Estados desenhados: </span><b>Estados</b></summary>'
       f'<nav class="fl-lista" aria-label="Estados desenhados">{nav}</nav></details>')
# "Ver o contrato" e "Encerrar o contrato" (estado fecha-contrato) levam à ficha do contrato aprovada; aqui, ao contrato sem caso não, então ficam como rota.
T = T.replace('href="?estado=contrato-encerrar"', 'href="#" data-rota="/contratos/contratos/c2025047?encerrar=1"')

out = pagina('Antônia Ferreira Prado', 'Jornada do cliente no Portal: assinatura com caso, contratos sem caso, fechamento do caso, cadastro pela conversa e documentos para começar.',
             '{"estado":"anexar-caso","atual":"contratos"}', '', T, ''.join(BARRAS.values()))
out = out.replace('</style>', CSS_CL + '\n' + J['CSS_JU'] + '\n' + CSS_FL + '\n' + CSS_EXTRA + '\n' + CSS_JF + '\n</style>', 1)
out = out.replace('<script>\n(function(){', NAV + '\n<script>\n(function(){', 1)
os.makedirs(SAIDA, exist_ok=True)
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(out)
json.dump([{'nome': e, 'url': f'index.html?estado={e}', 'rotulo': r} for e, r in EST],
          open(os.path.join(AQUI, 'casos.json'), 'w'), ensure_ascii=False, indent=1)
print('jornada ok', len(EST), 'estados,', len(out) // 1024, 'KB')
