# Portal · Clientes: termo de tutela (F3.140; AP-01, CH-08). Proposta para a Carol aprovar.
# Parte dos desenhos aprovados de "Quem assina pelo cliente" (portal-responsavel-legal) e do termo de curatela
# (portal-termo-curatela), sem mudá-los: responsavel.py é cópia sem mudança e é lido até o começo dos estados.
# O que é novo: o termo de tutela no painel do menor (só com Tutora ou Tutor), na folha "Quem assina por Davi",
# em Gerar documentos (sobre os textos do F3.142), na janela dos 18 anos e em "Quem assinava com Rafaela".
# Peças novas com o prefixo tt-. Uso: python3 termo.py <pasta-saida>
import os, sys, json

AQUI = os.path.dirname(os.path.abspath(__file__))
ARGV0 = list(sys.argv)
# comum.py (cópia sem mudança) aponta para a pasta de aprovadas de outra máquina: carrega com a pasta deste repositório.
import types
_cm = types.ModuleType('comum')
_cm.__file__ = os.path.join(AQUI, 'comum.py')
_src_cm = open(_cm.__file__, encoding='utf-8').read().replace(
    "APROV = '/home/claude/t3just/docs/design/aprovadas/'", "APROV = " + repr(os.path.normpath(os.path.join(AQUI, '../../../aprovadas')) + '/'), 1)
sys.modules['comum'] = _cm
exec(compile(_src_cm, 'comum.py', 'exec'), _cm.__dict__)
sys.path.insert(0, AQUI)
_MARCA = '\n# ---------------------------------------------------------------- estados\n'
_rl = open(os.path.join(AQUI, 'responsavel.py'), encoding='utf-8').read()
_ini = _rl.rindex(_MARCA)
G = {'__file__': os.path.join(AQUI, 'responsavel.py'), '__name__': 'rl'}
exec(compile(_rl[:_ini], 'responsavel.py', 'exec'), G)
globals().update({k: v for k, v in G.items() if not k.startswith('__')})
sys.argv = ARGV0

SAIDA = ARGV0[1] if len(ARGV0) > 1 else '..'
APROV = '../../aprovadas/'
P['U'] = APROV + 'portal-procuracoes/procuracoes.html?estado='
# Hoje é 23/11/2026 (segunda-feira).
P['CIDADE_DATA'] = 'São Paulo, 23 de novembro de 2026'
P['HOJE'] = '23/11/2026'

# ---------------------------------------------------------------- dados fictícios
CPF_DAVI, CPF_SONIA = cpf('418273605'), cpf('236914058')
END_DAVI = 'Rua Tuiuti, 1.210, apto. 42, Tatuapé, São Paulo, SP, CEP 03081-000'
DAVI = dict(nome='Davi Torres Lima', tp='PF', desde='18/11/2026', doc='')
V_DAVI = dict(primeiro='Davi', nasc='02/05/2015', idade=11, n16='02/05/2031', n18='02/05/2033', papel='Tutora', rl='Sônia Torres Lima', rlcpf=CPF_SONIA,
              rlrg='38.207.551-4', rlrgo='SSP/SP', rlnac='Brasileira', rlcivil='Solteiro(a)', rlprof='Enfermeira',
              nac='Brasileira', cep='03081-000', end='Rua Tuiuti, 1.210, apto. 42', bairro='Tatuapé', cidade='São Paulo', uf='SP', termo_tt=True)

CSS_TT = r"""
/* ==========================================================================
   Termo de tutela (prefixo tt-). Só tokens e pares aprovados.
   ========================================================================== */
.rl-termo-ficha{padding:0 24px 18px}
@media (max-width:760px){.rl-termo-ficha{padding:0 16px 14px}}  /* a mesma regra do produto (portal.css) */
/* Marca de desenho (só nas capturas; não vai para o produto) */
.tt-nota{display:flex;gap:10px;align-items:flex-start;margin:0 0 18px;padding:12px 16px;border:1.5px dashed var(--vinho);border-radius:var(--raio);background:var(--papel);font-size:13px;line-height:1.5;color:var(--tinta)}
.tt-nota .ico{flex:none;color:var(--vinho)}
.tt-nota b{font-weight:600}
.tt-marca{outline:2px dashed var(--vinho);outline-offset:4px;position:relative}
.tt-marca[data-marca]::after{content:attr(data-marca);position:absolute;right:8px;top:-12px;padding:1px 8px;border-radius:10px;background:var(--vinho);color:var(--papel);font-size:11px;font-weight:500;letter-spacing:.02em;line-height:1.6}
.tt-trecho{text-decoration:underline dashed var(--vinho);text-decoration-thickness:2px;text-underline-offset:4px;text-decoration-skip-ink:none}
"""


def nota(txt):
    return f'<p class="tt-nota">{ico("lapis")}<span>{txt}</span></p>'


def trecho(txt):
    return f'<span class="tt-trecho">{txt}</span>'


def linha_termo(id_, titulo, meta, botao):
    """A linha do arquivo do termo, a mesma peça do termo de curatela (rl-arq)."""
    return (f'<div class="rl-arq rl-tem" role="group" aria-labelledby="{id_}"><span class="rl-ic" aria-hidden="true">{ico("doc")}</span>'
            f'<div><strong id="{id_}">{titulo}</strong><small>{meta}</small></div>{botao}</div>')


B_BAIXAR = f'<a class="btn btn-sec btn-compacto" href="#">{ico("baixar", "ico ico-s")}Baixar o termo</a>'


# ---------------------------------------------------------------- 1. formulário: o termo no painel do menor, só com Tutora ou Tutor
def bloco_termo_form():
    sub = ('<div class="rl-sub tt-marca" data-marca="Novo"><h4>O termo de tutela</h4><small>O papel que mostra quem é a tutora ou o tutor. '
           'Vai junto com a procuração. Não pedimos o motivo da tutela nem documentos dos pais.</small></div>')
    arq = linha_termo('m-termo-r', 'termo-tutela-davi.pdf', 'PDF · 380 KB',
                      f'<button class="btn btn-sec btn-compacto" type="button">{ico("trocar", "ico ico-s")}Trocar arquivo: termo de tutela</button>')
    return sub + f'<div class="c6 tt-marca">{arq}</div>'


_painel_menor_aprovado = G['painel_menor']


def painel_menor_tt(v, aberto, erros=False, mudou=()):
    h = _painel_menor_aprovado(v, aberto, erros, mudou)
    if v.get('termo_tt') and v.get('papel') in ('Tutora', 'Tutor'):
        assert h.endswith('</div>')
        h = h[:-len('</div>')] + bloco_termo_form() + '</div>'  # logo depois de "Mora com Davi"
    return h


G['painel_menor'] = painel_menor_tt  # form_cliente (do aprovado) chama painel_menor pelo espaço G


# ---------------------------------------------------------------- 2. ficha de Davi
DIR_DAVI = dir_passo('Gerar os documentos', '<b>C-2026-041 em elaboração desde 21/11.</b><br>Sônia assina por Davi a procuração e o contrato.',
                     f'<a class="btn btn-pri" href="{U}gerar-tutela">{ico("doc")}Gerar documentos</a>', 2,
                     contato=('25/11', 'quarta', 'Diego Almeida', 'futuro'))


def dados_davi():
    return folha('t-dados', 'Dados e qualificação', 'O que vai na procuração e no contrato.', dl([
        ('Nome completo', 'Davi Torres Lima', True),
        ('CPF', f'<span class="num">{CPF_DAVI}</span>{CONF}'),
        ('Data de nascimento', '02/05/2015 · 11 anos'),
        ('Nacionalidade', 'Brasileira'),
        ('RG', '<dd class="falta">Não tem · opcional para menor</dd>'),
        ('Endereço', 'Rua Tuiuti, 1.210, apto. 42, Tatuapé, São Paulo, SP · CEP 03081-000', True),
    ]), acoes=b_editar('novo-tutela'))


def quem_davi():
    topo = (f'<div class="rl-quem"><span class="rl-av" aria-hidden="true">ST</span><div><strong>Sônia Torres Lima</strong>'
            f'<small>Tutora · assina por Davi</small><span class="selo selo-implant">Representa · Davi tem menos de 16 anos</span></div></div>')
    termo = '<div class="rl-termo-ficha"><div class="tt-marca" data-marca="Novo">' + linha_termo(
        'f-termo', 'Termo de tutela', 'termo-tutela-davi.pdf · enviado por Paula Nunes em 18/11', B_BAIXAR) + '</div></div>'
    corpo = (topo + dl([
        ('CPF', f'<span class="num">{CPF_SONIA}</span>{CONF}'), ('RG', '38.207.551-4 · SSP/SP'), ('Nacionalidade', 'Brasileira'), ('Estado civil', 'Solteira'),
        ('Profissão', 'Enfermeira'), ('Endereço', 'O mesmo de Davi (moram juntos)'),
    ]) + termo
        + (f'<p class="rl-regra">{ico("relogio")}<span>Em <b>02/05/2031</b>, aos 16 anos, Davi passa a ser assistido(a): Davi e Sônia assinam juntos. '
           f'O T3jus muda sozinho, nos documentos gerados a partir dessa data.</span></p>')
        + f'<p class="rl-regra tt-marca" data-marca="Novo">{ico("doc")}<span>Ao gerar, lembre de juntar o termo de tutela à procuração.</span></p>')
    h = folha('t-quem', 'Quem assina por Davi', trecho('Tutora de Davi.') + ' Vai na procuração e no contrato, e assina por Davi.', corpo,
              acoes=b_editar('novo-tutela', 'Mudar').replace('<a ', '<a aria-label="Mudar quem assina por Davi" ', 1))
    return h


def contatos_davi():
    return (f'<section class="folha" aria-labelledby="t-ct"><div class="folha-cab"><div><h2 id="t-ct">Contatos</h2><p class="sub">1 contato</p></div>'
            f'<div class="acoes"><a class="btn btn-sec" href="#">{ico("mais")}Adicionar contato</a></div></div><ul class="lista">'
            f'<li class="contato"><div><strong>Sônia Torres Lima</strong><small class="cl-papel">Tia e tutora · quem assina por Davi</small></div>'
            f'<a href="tel:+5511996218457">{ico("whats")}<span class="num">(11) 99621-8457</span></a><a href="mailto:sonia.lima@exemplo.com.br">{ico("envelope")}sonia.lima@exemplo.com.br</a></li>'
            f'</ul></section>')


def tempo_davi():
    h = tempo_pedro()
    for a, b in (('13/03/2030', '01/05/2031'), ('14/03/2030', '02/05/2031'), ('14/03/2032', '02/05/2033'), ('Joana', 'Sônia'), ('Pedro', 'Davi')):
        assert a in h
        h = h.replace(a, b)
    return h


def ficha_davi():
    cab = cab_cli(DAVI, DIR_DAVI, selo_menor('Menor · assina a tutora'))
    lat = (proc_lista('Para gerar a procuração', 10, 10,
                      [('Nome, CPF e nascimento de Davi', 1), ('Nacionalidade e endereço', 1), ('Quem assina: Sônia, tutora', 1), ('CPF e RG de Sônia', 1),
                       ('Estado civil e profissão de Sônia', 1)],
                      'Tudo pronto. Para quem tem menos de 16 anos, estado civil, profissão e RG dele não vão no documento.', botao=False)
           + tempo_davi() + origem_ant().replace('Rosa Almeida', 'Antônia Ferreira Prado').replace('27/10/2026, por telefone', '18/11/2026, pelo WhatsApp')
           + situacao_folha().replace('27/10/2026', '18/11/2026'))
    n = nota('<b>Ficha aprovada do menor, com a tutora.</b> Contornado o que é novo: o começo do subtítulo da folha, a linha do termo de tutela com '
             '“Baixar o termo” (entre os dados e a frase dos 16 anos) e o lembrete embaixo dessa frase. A lateral não muda.')
    return f'<div class="cl">{n}{cab}{abas_fl(N_PEDRO, estado_base="ficha-tutela")}{grade_ficha(dados_davi() + quem_davi() + contatos_davi(), lat)}</div>'


# ---------------------------------------------------------------- 3 e 4. Gerar documentos de Davi (sobre os textos do F3.142)
def qual_davi(falta=False):
    cpf_s = FALTA('CPF DE QUEM ASSINA') if falta else f'<{C}>inscrita no CPF sob o nº {CPF_SONIA}</mark>'
    rg_s = FALTA('RG DE QUEM ASSINA') if falta else f'<{C}>portadora do RG nº 38.207.551-4 SSP/SP</mark>'
    return (f'<{C}>DAVI TORRES LIMA</mark>, <{C}>brasileiro, menor impúbere, nascido em 02/05/2015, inscrito no CPF sob o nº {CPF_DAVI}</mark>, '
            f'neste ato representado por sua <{C}>tutora</mark>, <{C}>SÔNIA TORRES LIMA, brasileira, solteira, enfermeira</mark>, {rg_s}, {cpf_s}, '
            f'ambos residentes na <{C}>{END_DAVI}</mark>')


ASS_DAVI = ass('DAVI TORRES LIMA', 'representado por sua tutora, SÔNIA TORRES LIMA', f'CPF {CPF_SONIA}')
ASS_DAVI_F = ass('DAVI TORRES LIMA', 'representado por sua tutora, SÔNIA TORRES LIMA', falta='CPF DE QUEM ASSINA')
B_BAIXAR_AV = f'<a class="btn btn-sec tt-marca" href="#">{ico("baixar")}Baixar o termo</a>'
JUNTE_COM = 'Junte uma cópia do termo de tutela à procuração: ele está na ficha, para baixar.'


def gerar_tutela(falta=False):
    if falta:
        q = quadro('Davi', 'ST', 'Sônia Torres Lima', 'Tutora', falta=True,
                   dois='Faltam o CPF e o RG dela</small><small class="rl-linha">' + trecho('Termo de tutela na ficha'))
        completar = (f'<a class="btn btn-sec" href="{U}ficha-tutela" target="_blank" rel="noopener">{ico("lapis")}Completar na ficha'
                     f'<span class="sr"> (abre numa aba nova)</span></a>')
        av = ('<div class="c6">' + aviso('atencao', 'Faltam 2 dados de quem assina por Davi: o CPF e o RG de Sônia.',
                                         'Dá para gerar assim: os três documentos saem com [CPF DE QUEM ASSINA: falta] e [RG DE QUEM ASSINA: falta], para preencher à mão ou no Word. '
                                         'Ou complete a ficha antes. ' + trecho(JUNTE_COM), icone='pena', acoes=completar + B_BAIXAR_AV) + '</div>')
    else:
        q = quadro('Davi', 'ST', 'Sônia Torres Lima', f'Tutora · CPF {CPF_SONIA}', dois=trecho('Termo de tutela na ficha'))
        av = ('<div class="c6">' + aviso('info', 'Davi tem 11 anos hoje: é representado(a).',
                                         'Só Sônia assina, em nome de Davi, os três documentos. Em 02/05/2031, aos 16 anos, Davi passa a ser assistido(a), e os dois assinam. '
                                         'O T3jus faz a conta pela data de nascimento, no dia de gerar. ' + trecho(JUNTE_COM), icone='pessoas', acoes=B_BAIXAR_AV) + '</div>')
    r = (P['contrato_card']('DT', 'Davi Torres Lima', 'C-2026-041 · Pensão por morte · em elaboração')
         + q + av + P['documentos_fs'](contrato_sub='Contratante: Davi, representado por Sônia. Com o objeto, as 2 condições de honorário e as cláusulas do escritório.')
         + P['outorgados_fs'](ADV_PS) + P['poderes_fs'](POD_PS) + P['data_campo']())
    a = ASS_DAVI_F if falta else ASS_DAVI
    nf = 2 if falta else 0
    pain = [
        ('c', 'Contrato', nf, papel_contrato_min('C-2026-041', qual_davi(falta), a)),
        ('p', 'Procuração', nf, com_ass(P['papel_procuracao'](qual_davi(falta), ['Marina Ribeiro', 'Larissa Costa'], POD_PS, assina=ASSX), a)),
        ('d', 'Declaração', nf, com_ass(P['papel_declaracao'](qual_davi(falta), assina=ASSX), a)),
    ]
    junte = trecho('Junte o termo de tutela à procuração.')
    if falta:
        sub = f'2 dados saem marcados em cada um: o CPF e o RG de Sônia. {junte} Cada geração fica registrada, com quem gerou e quando.'
    else:
        sub = f'Nenhum dado sai marcado. Em todos, Sônia assina por Davi. {junte} Cada geração fica registrada, com quem gerou e quando.'
    pe = P['pe_gerar']('<b>Vão sair 3 arquivos .docx</b>: contrato, procuração e declaração.', sub, 'Gerar 3 documentos')
    h = P['pagina_gerar'](r, P['previa'](pain, 'p'), pe)
    if falta:
        n = nota('<b>Gerar documentos do menor com dado faltando (textos do F3.142), com a tutora.</b> Contornado o que é da tutela: a linha “Termo de tutela na ficha” '
                 'no quadro tracejado (depois da falta), a última frase e o botão “Baixar o termo” no aviso (depois de “Completar na ficha”), e a frase do termo na faixa do botão, '
                 'que fica sem “Em todos”.')
    else:
        n = nota('<b>Gerar documentos do menor (textos do F3.142), com a tutora.</b> Contornado o que é da tutela: a linha “Termo de tutela na ficha” no quadro, '
                 'a última frase e o botão “Baixar o termo” no aviso, e a frase do termo na faixa do botão. O texto dos documentos não muda.')
    assert h.startswith('<div class="hn">')
    return '<div class="hn">' + n + h[len('<div class="hn">'):]


# ---------------------------------------------------------------- 5. janela dos 18 anos de Rafaela
FRASE_J18_APROV = ('Cleusa sai de “Quem assina” e fica no histórico da ficha, com a data. Nada é apagado. '
                   'Os documentos gerados antes continuam como estavam.')
FRASE_J18_TUTELA = ('Cleusa sai de “Quem assina” e fica na ficha, com a data. Nada é apagado. ' + trecho('O termo de tutela também fica guardado.')
                    + ' Os documentos gerados antes continuam como estavam.')


def janela_18_tutela():
    h = ficha_rafa(True)
    assert FRASE_J18_APROV in h
    return h.replace(FRASE_J18_APROV, FRASE_J18_TUTELA, 1)


# ---------------------------------------------------------------- 6. Quem assinava com Rafaela, com o termo (depende da pergunta 1)
def ficha_rafa_depois():
    cab = cab_cli(RAFA, DIR_RAFA, '')
    dados = folha('t-dados', 'Dados e qualificação', 'O que vai na procuração e no contrato.', dl([
        ('Nome completo', 'Rafaela Nunes Torres', True),
        ('CPF', f'<span class="num">{CPF_RAFA}</span>{CONF}'), ('Data de nascimento', '19/11/2008 · 18 anos desde 19/11'),
        ('RG', '52.884.106-2 · SSP/SP'), ('Nacionalidade', 'Brasileira'),
        ('Estado civil', 'Solteira'), ('Profissão', 'Atendente'),
        ('Endereço', 'Rua Itaqueri, 1.020, Mooca, São Paulo, SP · CEP 03187-000', True),
    ]), acoes=b_editar('ficha-quem-assinava-termo'))
    termo = '<div class="rl-termo-ficha"><div class="tt-marca" data-marca="Novo">' + linha_termo(
        'fa-termo', 'Termo de tutela', 'termo-tutela-rafaela.pdf · enviado por Paula Nunes em 08/07', B_BAIXAR) + '</div></div>'
    antes = folha('t-antes', 'Quem assinava com Rafaela', 'Até 18/11/2026. Fica guardado, mas não entra nos documentos novos.',
                  f'<div class="rl-quem"><span class="rl-av" aria-hidden="true">CN</span><div><strong>Cleusa Nunes Torres</strong>'
                  f'<small>Avó e tutora · assistiu Rafaela dos 16 aos 17 anos</small><span class="selo selo-neutro">Até 18/11/2026</span></div></div>'
                  + dl([('CPF', f'<span class="num">{CPF_CLEUSA}</span>'), ('Assinou com ela', 'Contrato C-2026-022 e a procuração, em 08/07/2026')]).replace('class="dados-ficha"', 'class="dados-ficha rl-antes"')
                  + termo)
    lat = (proc_lista('Para gerar a procuração', 7, 7,
                      [('Nome completo', 1), ('CPF', 1), ('RG', 1), ('Nacionalidade', 1), ('Endereço', 1), ('Estado civil', 1), ('Profissão', 1)],
                      'Tudo pronto.', botao=False)
           + resumo('P-2026-008 · virou contrato', 'C-2026-022 · ativo desde 08/07', 'Torres x Viação Leste · Instrução').replace('Antônia', 'Rafaela'))
    n = nota('<b>Depende da pergunta 1 da Carol.</b> Ficha de Rafaela depois de “Salvar: Rafaela assina por si”. Contornada, a linha do termo de tutela em '
             '“Quem assinava com Rafaela”, só para baixar e sem o lembrete de juntar. O resto é o aprovado.')
    return (f'<div class="cl">{n}{cab}{abas_fl(dict(atendimentos=6, propostas=1, contratos=1, casos=1), estado_base="ficha-fez-18")}'
            f'{grade_ficha(dados + antes, lat)}</div>')


# ---------------------------------------------------------------- estados
T = ''
ESTADOS = []


def add(est, corpo, rotulo, **kw):
    global T
    T += tpl(est, corpo, **kw)
    ESTADOS.append((est, rotulo))


NV = dict(atual='clientes', trilha='Clientes|Novo cliente', titulo='Novo cliente')
FD = dict(atual='clientes', trilha='Clientes|Davi Torres Lima', titulo='Davi Torres Lima', aba='ficha')
FR = dict(atual='clientes', trilha='Clientes|Rafaela Nunes Torres', titulo='Rafaela Nunes Torres', aba='ficha')
GE = dict(area='contratos', secao='Procurações e modelos', atual='contratos', trilha='Contratos|Procurações e modelos|Gerar documentos', titulo='Gerar documentos')

nv = pagina_nova(form_cliente('Davi Torres Lima', '(11) 99621-8457', '', CPF_DAVI, 'menor', vm=V_DAVI, qual=qualif_menor(V_DAVI, True)))
nv = nota('<b>Cadastro aprovado do menor, com “É: Tutora”.</b> Contornado o que é novo: a subseção “O termo de tutela” e a linha do arquivo escolhido, '
          'logo depois de “Mora com Davi”. Com Mãe ou Pai, nada disso aparece. A caixa da data de nascimento não muda.') + nv
add('novo-tutela', nv, 'Novo cliente menor, com tutora e o termo', **NV)
add('ficha-tutela', ficha_davi() + j_registrar() + j_inativar(), 'Ficha: Davi, com a tutora e o termo', **FD)
add('gerar-tutela', gerar_tutela(), 'Gerar: Davi, 11 anos, com a tutora', **GE)
add('gerar-tutela-falta', gerar_tutela(falta=True), 'Gerar: faltam o CPF e o RG de Sônia', **GE)
add('fez-18-janela-tutela', janela_18_tutela(), 'Janela: Rafaela agora assina por si', **FR)
add('ficha-quem-assinava-termo', ficha_rafa_depois() + j_registrar() + j_inativar(), 'Ficha: quem assinava com Rafaela (pergunta 1)', **FR)

GRUPOS = [('Formulário e ficha', ['novo-tutela', 'ficha-tutela']),
          ('Gerar documentos', ['gerar-tutela', 'gerar-tutela-falta']),
          ('Aos 18 anos', ['fez-18-janela-tutela', 'ficha-quem-assinava-termo'])]
ROT = dict(ESTADOS)
assert sorted(sum((g[1] for g in GRUPOS), [])) == sorted(ROT)
nav = ''.join(f'<p>{g}</p>' + ''.join(f'<a href="?estado={e}">{ROT[e]}</a>' for e in es) for g, es in GRUPOS)
NAV = (f'<details id="fl-estados"><summary>{ico("menu")}<span class="sr">Estados desenhados: </span><b>Estados</b></summary>'
       f'<nav class="fl-lista" aria-label="Estados desenhados">{nav}</nav></details>')

URL = {'Contratos': APROV + 'portal-comercial-contratos/contratos.html?estado=contratos', 'Honorários': APROV + 'portal-comercial-contratos/contratos.html?estado=honorarios',
       'Procurações e modelos': APROV + 'portal-procuracoes/procuracoes.html?estado=procuracoes'}
out = pagina('Termo de tutela', 'Clientes: o termo de tutela na ficha do menor quando quem assina é tutora ou tutor, em Gerar documentos e aos 18 anos.',
             '{"estado":"novo-tutela","atual":"clientes"}', '', T, P['barras']('contratos', URL))
CSS_P = P['CSS_FICHA'] + P['CSS_HN'] + P['CSS'] + P['CSS_PE'] + P['CSS_PR']
out = out.replace('</style>', CSS_P + '\n' + CSS_CL + '\n' + CSS_FL + '\n' + CSS_RL + '\n' + CSS_TT + '\n</style>', 1)
out = out.replace('<script>\n(function(){', NAV + '\n<script>\n(function(){', 1)
out = out.replace('</body>', P['SCRIPT_ABAS'] + '\n' + SCRIPT_RL + '\n</body>', 1)
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(out)
json.dump([{'nome': e, 'url': f'index.html?estado={e}', 'rotulo': r} for e, r in ESTADOS],
          open(os.path.join(AQUI, 'casos.json'), 'w'), ensure_ascii=False, indent=1)
print('termo-tutela ok', len(ESTADOS), 'estados,', len(out) // 1024, 'KB')
