# F3.181, F3.186, F3.190 e F3.188 · o que sobra da exclusão a pedido do titular, na janela de exclusão,
# na janela de arquivar e na ficha do outro cadastro com o mesmo CPF (plano e revisão em t3jus/f3-181-190).
# Parte do desenho aprovado da F3.177 (docs/design/aprovadas/portal-exclusao-historico): executa o f177.py
# aprovado até antes dos estados dele (que executa o f156.py, o f155.py e o pendencias.py aprovados), acrescenta
# as peças novas (prefixo f181-) e grava exclusao.html. Os nomes do desenho aprovado viram os do plano no fim
# (Antônia vira Marina Alves Coelho; a sócia dona Marina Ribeiro vira Paula Reis), sem mexer nas peças.
# Uso: python3 f181.py <pasta-saida>
import sys, os, re

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'

_src177 = open(os.path.join(AQUI, 'f177.py'), encoding='utf-8').read()
_corte177 = _src177.index('\nCASOS = {')
F = {'__name__': 'f177_aprovado', '__file__': os.path.join(AQUI, 'f177.py')}
_argv = sys.argv
sys.argv = [sys.argv[0], SAIDA]
exec(compile(_src177[:_corte177], 'f177.py', 'exec'), F)
sys.argv = _argv
G156, G155 = F['G'], F['G']['G']
NS, ico, tpl = F['NS'], F['ico'], F['tpl']
aqf, hist, linha_despesa, guarda, nota_pe = F['aqf'], F['hist'], F['linha_despesa'], F['guarda'], F['nota_pe']
some, fica, linha_arquivos = G155['some'], G155['fica'], G155['linha_arquivos']
ANT, FICA_APROV = F['ANT'], G155['FICA_APROV']
aviso, toast, janelas = NS['aviso'], NS['toast'], NS['janelas']
ficha_lgpd, sit_dona, sit_outro, faixa, j_excluir, j_recusar, j_pedir = (NS[k] for k in ('ficha_lgpd', 'sit_dona', 'sit_outro', 'faixa', 'j_excluir', 'j_recusar', 'j_pedir'))
_src_pd, _corte_pd = F['_src_pd'], F['_corte_pd']

N = lambda t='': f'<span class="f181-novo">{t}</span>' if t else ''


def junta(xs):
    return xs[0] if len(xs) == 1 else ', '.join(xs[:-1]) + ' e ' + xs[-1]


# ================================================================ dados (as chaves novas da ficha, plano 6 e revisão)
def conv(conversas=0, na_fila=0, automacoes=0, ficam=0, ficam_com=(), mais=0):
    """conversasParaApagar (F3.190)."""
    return dict(conversas=conversas, naFila=na_fila, automacoes=automacoes, ficam=ficam, ficamCom=list(ficam_com), ficamComMais=mais)


ROSA = 'Rosa Alves Coelho'
OUTRO = dict(nome='Marina A. Coelho', situacao='ATIVO', desde='03/02/2025', contratoOuProcesso=False, pedidoAberto=False)
OUTRO_INATIVO_PEDIDO = dict(OUTRO, situacao='INATIVO', pedidoAberto=True)
OUTRO_PROCESSO = dict(nome='M. Alves Coelho', situacao='ATIVO', desde='15/07/2026', contratoOuProcesso=True, pedidoAberto=False)
SIT = {'ATIVO': 'Ativo', 'INATIVO': 'Inativo', 'ARQUIVADO': 'Arquivado a pedido'}


# ================================================================ 1. F3.190: as conversas do WhatsApp
def linha_conversas(c):
    n = c['conversas']
    if not n:
        return ''
    if n == 1:
        t, sub = 'A conversa do WhatsApp', 'o número, os nomes de quem escreveu e todas as mensagens e arquivos saem, e ela some de Conversas.'
    else:
        t, sub = f'As {n} conversas do WhatsApp', 'os números, os nomes de quem escreveu e todas as mensagens e arquivos saem, e elas somem de Conversas.'
    sub += ' Ficam só as datas, quem da equipe atendeu e os momentos (passou, assumiu, devolveu).'
    f = c['naFila']
    if f:
        sub += ' A mensagem que ainda ia sair não sai mais.' if f == 1 else f' As {f} mensagens que ainda iam sair não saem mais.'
    a = c['automacoes']
    if a:
        sub += ' A automação em andamento para.' if a == 1 else f' As {a} automações em andamento param.'
    return f'<li class="f181-novo">{t}<small>{sub}</small>{dica_fica(c)}</li>'


def dica_fica(c):
    """C6: a conversa que fica porque guarda o registro de outro cliente (C3 da F3.157). Vai dentro da linha das
    conversas; sem conversa que sai, dentro da linha dos contatos."""
    k = c['ficam']
    if not k:
        return ''
    nomes = list(c['ficamCom'])
    if c['ficamComMais']:
        nomes = nomes + [f'mais {c["ficamComMais"]} {"cliente" if c["ficamComMais"] == 1 else "clientes"}']
    quem = junta(nomes)
    outro = 'outra cliente' if len(c['ficamCom']) == 1 and not c['ficamComMais'] else 'outros clientes'
    if k == 1:
        txt = (f'1 conversa fica como está, com as mensagens, porque guarda o registro de <b>{quem}</b>, {outro}. '
               f'As mensagens de Antônia nessa conversa também ficam.')
    else:
        txt = (f'{k} conversas ficam como estão, com as mensagens, porque guardam o registro de <b>{quem}</b>, {outro}. '
               f'As mensagens de Antônia nessas conversas também ficam.')
    return f'<span class="pd-dica f181-novo">{ico("alerta")}<span>{txt}</span></span>'


# ================================================================ 2. M2: o "sobre" das condições (F3.179) e a explicação da baixa (F3.193)
def linha_sobre(numeros):
    if not numeros:
        return ''
    t = (f'Sobre o que se cobra o êxito, na proposta {numeros[0]}' if len(numeros) == 1 else
         f'Sobre o que se cobra o êxito, nas propostas {junta(numeros)}')
    sub = ('o texto livre, como “dos atrasados que a cliente receber”, vira “Base apagada a pedido do titular”. '
           'O percentual e as outras condições ficam como estão.')
    return f'<li class="f181-novo">{t}<small>{sub}</small></li>'


def linha_baixa(n):
    if not n:
        return ''
    t = 'A explicação da baixa sem receber' if n == 1 else f'As explicações das {n} baixas sem receber'
    sub = ('vira “Explicação apagada a pedido do titular”.' if n == 1 else 'viram “Explicação apagada a pedido do titular”.')
    sub += ' A parcela, o valor e a data da baixa continuam no Financeiro.'
    return f'<li class="f181-novo">{t}<small>{sub}</small></li>'


# ================================================================ 3. C9: quem assina por outro cliente
def dica_assina(lista):
    if not lista:
        return ''
    if len(lista) == 1:
        nome, papel = lista[0]
        txt = (f'Antônia também assina por <b>{nome}</b>, {papel}. O nome e o CPF dela continuam na ficha dele, '
               f'porque servem ao contrato e à procuração dele.')
    else:
        txt = (f'Antônia também assina por {junta([f"<b>{n}</b> ({p})" for n, p in lista])}. O nome e o CPF dela continuam '
               f'nessas fichas, porque servem aos contratos e às procurações delas.')
    return f'<span class="pd-dica f181-novo">{ico("alerta")}<span>{txt}</span></span>'


# ================================================================ 4. F3.181: o pedido de contrato sai de Contratos (revisão b14: em "O que fica")
def linha_pedidos(numeros, onde='fica'):
    if not numeros:
        return ''
    n = len(numeros)
    if onde == 'arquivar':
        if n == 1:
            return (f'<li class="f181-novo">O pedido de contrato da proposta {numeros[0]} sai de Contratos'
                    f'<small>a proposta fica no Comercial, aceita, como registro. Cliente arquivado não ganha contrato novo, e ninguém consegue pedir de novo.</small></li>')
        return (f'<li class="f181-novo">Os {n} pedidos de contrato ({junta(numeros)}) saem de Contratos'
                f'<small>as propostas ficam no Comercial, aceitas, como registro. Cliente arquivado não ganha contrato novo, e ninguém consegue pedir de novo.</small></li>')
    if n == 1:
        return (f'<li class="f181-novo">A proposta {numeros[0]}, sem o pedido de contrato'
                f'<small>fica no Comercial como registro, com “Cliente excluído” e “Serviço apagado a pedido do titular”. '
                f'O pedido sai de Contratos, porque cliente excluído não ganha contrato.</small></li>')
    return (f'<li class="f181-novo">As propostas {junta(numeros)}, sem os pedidos de contrato'
            f'<small>ficam no Comercial como registro, com “Cliente excluído” e “Serviço apagado a pedido do titular”. '
            f'Os pedidos saem de Contratos, porque cliente excluído não ganha contrato.</small></li>')


# ================================================================ 5. C10 (M6): o lembrete em aberto, como aviso no topo
SISTEMA = {'ASTREA': 'no Astrea', 'ADVBOX_PLANILHA': 'no ADVBOX', None: 'no sistema antigo'}


def aviso_lembrete(n=1, valor='1.840,00', origem='ASTREA', lanc=3):
    sis = SISTEMA[origem]
    if n == 1:
        tit = f'Há R$ {valor} em aberto {sis}.'
        qual = f'É o lembrete de contrato de Antônia, com {lanc} lançamentos.'
    else:
        tit = f'Há R$ {valor} em aberto {sis}, em {n} lembretes de contrato.'
        qual = ''
    txt = (f'{qual} Depois da exclusão, não dá mais para saber de quem é esse valor, e o lembrete sai de Contratos › Lembretes. '
           f'Se o escritório vai cobrar, crie o contrato antes: aí o pedido se atende arquivando, sem apagar.').strip()
    return aviso('atencao', tit, txt, icone='carteira', extra=' f181-novo')


def linha_lembrete_alt(valor='1.840,00'):
    """Alternativa C10 (c): só a linha em "O que é apagado", como no plano (3.2)."""
    return (f'<li class="f181-novo">O lembrete de contrato de R$ {valor} em aberto no Astrea'
            f'<small>sai de Contratos › Lembretes. O valor e as datas continuam no histórico do sistema antigo, como está em “O que a lei obriga a guardar”.</small></li>')


# ================================================================ 6. F3.188 (C7 na B', revisão 4): o outro cadastro com o mesmo CPF
def _cad_situacao(o):
    s = f'{SIT[o["situacao"]]}, cliente desde {o["desde"]}'
    if o['contratoOuProcesso']:
        s += '. Tem contrato ou processo: o pedido dele vira arquivamento'
    elif o['situacao'] != 'ARQUIVADO':
        s += ', sem contrato nem processo'
    return s + '.'


def _caixa(o, marcado, idc, varios=False):
    ch = ' checked' if marcado else ''
    rot = (f'Abrir também um pedido de exclusão no cadastro de {o["nome"]}' if not varios else 'Abrir também um pedido de exclusão neste cadastro')
    sub = ('Com a mesma data e o mesmo canal. Depois você confere se é a mesma pessoa e atende ou recusa. '
           'Desmarque só se tiver certeza de que é outra pessoa.')
    return (f'<label class="opcao f181-caixa"><input class="marcar" type="checkbox" name="{idc}"{ch}>'
            f'<span>{rot}<small>{sub}</small></span></label>')


def aviso_cpf(cads, modo='excluir', marcado=True, doc='CPF'):
    """O aviso de atenção do topo, com a caixa da B' (marcada, a dona desmarca) e o link para cada ficha."""
    acao = 'Esta exclusão' if modo == 'excluir' else 'Este arquivamento'
    if len(cads) == 1:
        o = cads[0]
        tit = f'Há outro cadastro com o mesmo {doc}: {o["nome"]}.'
        corpo = (f'<p>{_cad_situacao(o)} {acao} não mexe nele. Quase sempre é a mesma pessoa cadastrada duas vezes, '
                 f'mas pode ser outra pessoa com o {doc} errado.</p>')
        if o['pedidoAberto']:
            corpo += '<p>Ele já tem um pedido de exclusão aberto.</p>'
        else:
            corpo += _caixa(o, marcado, 'ex-mesmo-1')
            if not marcado:
                corpo += (f'<p class="f181-sem">{ico("alerta", "ico ico-s")}<span>Sem o pedido, o cadastro de {o["nome"]} fica como está. '
                          f'Se for outra pessoa, o {doc} de um dos dois está errado: corrija na ficha certa.</span></p>')
        ac = f'<a class="btn btn-sec" target="_blank" rel="noopener" href="exclusao.html?estado=ficha-pedido-mesmo-cpf">{ico("pessoas")}Abrir a ficha de {o["nome"]}<span class="sr"> (abre em outra aba)</span></a>'
        corpo += f'<div class="aviso-acoes">{ac}</div>'
    else:
        tit = f'Há {len(cads)} outros cadastros com o mesmo {doc}: {junta([o["nome"] for o in cads])}.'
        corpo = (f'<p>{acao} não mexe neles. Confira cada um: quase sempre é a mesma pessoa cadastrada mais de uma vez, '
                 f'mas pode ser outra pessoa com o {doc} errado.</p><ul class="f181-cads">')
        for i, o in enumerate(cads, 1):
            linha = f'<a target="_blank" rel="noopener" href="exclusao.html?estado=ficha-pedido-mesmo-cpf">{o["nome"]}<span class="sr"> (abre em outra aba)</span></a><small>{_cad_situacao(o)}</small>'
            if o['pedidoAberto']:
                extra = f'<p class="f181-ja">{ico("check", "ico ico-s")}<span>Já tem um pedido de exclusão aberto.</span></p>'
            else:
                extra = _caixa(o, marcado, f'ex-mesmo-{i}', varios=True)
            corpo += f'<li><p class="f181-cad-nome">{linha}</p>{extra}</li>'
        corpo += '</ul>'
    return (f'<div class="aviso aviso-atencao f181-cpf f181-novo" role="group" aria-label="Outro cadastro com o mesmo {doc}">{ico("pessoas")}'
            f'<div><strong class="aviso-titulo">{tit}</strong>{corpo}</div></div>')


# ================================================================ a janela montada
def janela_m(q=None, h=None, conv_=None, assina=(), sobre=(), baixas=0, pedidos=(), lembrete=None, cpf=None, cpf_marcado=True,
             variante='', alt_conversas=False, alt_lembrete=False):
    q = q or aqf()
    h = h or hist()
    c = conv_ or conv()
    arquivos = linha_arquivos(2, '', 1) + linha_despesa(q) + linha_sobre(list(sobre)) + linha_baixa(baixas)
    s = some(arquivos=arquivos, **ANT)
    # C9: a dica dentro da linha da qualificação
    if assina:
        i = s.index('<li>Nome, CPF'); j = s.index('</li>', i)
        s = s[:j] + dica_assina(list(assina)) + s[j:]
    # F3.190: a linha das conversas logo depois dos contatos (sem conversa que sai, a dica vai nos contatos)
    i = s.index('<li>Os 2 contatos'); j = s.index('</li>', i)
    if c['conversas']:
        lc = linha_conversas(c)
        if alt_conversas:  # C5 (B): o que fica vai para "O que fica, sem dado pessoal"
            lc = lc.replace(' Ficam só as datas, quem da equipe atendeu e os momentos (passou, assumiu, devolveu).', '')
        s = s[:j + 5] + lc + s[j + 5:]
    elif c['ficam']:
        s = s[:j] + dica_fica(c) + s[j:]
    if alt_lembrete:
        k = s.rindex('</ul></div>')
        s = s[:k] + linha_lembrete_alt() + s[k:]
    f = fica(3, 'Indicação de cliente')
    assert f == FICA_APROV
    k = f.index('<li>A origem')
    extra_f = ''
    if alt_conversas and c['conversas']:
        n = c['conversas']
        extra_f += (f'<li class="f181-novo">As datas, quem atendeu e os momentos, {"na conversa" if n == 1 else f"nas {n} conversas"}'
                    f'<small>passou, assumiu e devolveu, sem o número, os nomes e as mensagens.</small></li>')
    extra_f += linha_pedidos(list(pedidos))
    f = f[:k] + extra_f + f[k:]
    sem = guarda(q, h) + nota_pe(q, h)
    topo = ''
    if cpf:
        topo += aviso_cpf(cpf, 'excluir', cpf_marcado)
    if lembrete and not alt_lembrete:
        topo += aviso_lembrete(**lembrete)
    NS['SOME'], NS['FICA'], NS['SEM_OBRIG'] = s, f, sem
    try:
        jj = j_excluir(True, variante)
    finally:
        NS['SOME'], NS['FICA'], NS['SEM_OBRIG'] = G155['SOME_APROV'], FICA_APROV, G155['SEM_OBRIG_APROV']
    if topo:
        i = jj.index('<div class="pd-col">')
        jj = jj[:i] + f'<div class="pd-inteira f181-topo">{topo}</div>' + jj[i:]
    return jj


def janela_arq(cpf=None, pedidos=()):
    a = NS['ARQ_ACONTECE']
    if pedidos:
        k = a.index('<li>O pedido fica registrado')
        a = a[:k] + linha_pedidos(list(pedidos), 'arquivar') + a[k:]
    antes = NS['ARQ_ACONTECE']
    NS['ARQ_ACONTECE'] = a
    try:
        jj = j_excluir(True, 'depois')
    finally:
        NS['ARQ_ACONTECE'] = antes
    # A nota "Desenho do futuro" do desenho de 18/11 não existe no produto (hoje há contratos e processos)
    jj = re.sub(r'<p class="pd-futuro">.*?</p>', '', jj, count=1)
    if cpf:
        i = jj.index('<div class="pd-col">')
        jj = jj[:i] + f'<div class="pd-inteira f181-topo">{aviso_cpf(cpf, "arquivar")}</div>' + jj[i:]
    return jj


# Conferência: sem nada novo, a janela é a aprovada (a de hoje), com os arquivos de Marina
_base = F['janela_com'](some(arquivos=linha_arquivos(2, '', 1), **ANT), None, guarda(aqf(), hist()) + nota_pe(aqf(), hist()))
assert janela_m() == _base, 'sem as chaves novas, a janela precisa ser igual à aprovada'

# ================================================================ 7. depois de excluir (M3) e a ficha do outro cadastro (M4)
def toast_feito_cpf():
    t = ('Protocolo EXC-2026-0007. Antes de responder à cliente, confira o cadastro de Marina A. Coelho, que ficou com um pedido de exclusão aberto. '
         'O pedido só está atendido por inteiro quando ele também for resolvido.')
    return (f'<div class="aviso aviso-sucesso toast f181-toast" role="status">{ico("check")}<div><strong class="aviso-titulo">Dados excluídos.</strong>'
            f'<p class="f181-novo-txt">{t}</p><div class="aviso-acoes"><a class="btn btn-sec" href="exclusao.html?estado=ficha-pedido-mesmo-cpf">{ico("pessoas")}Abrir a ficha de Marina A. Coelho</a></div></div>'
            f'<button class="fechar" type="button" data-fechar aria-label="Fechar aviso">{ico("x")}</button></div>')


def faixa_mesmo_cpf(dona=True):
    if dona:
        tit = 'Pedido de exclusão aberto em 20/11, ao atender outro cadastro com o mesmo CPF.'
        txt = ('Você atendeu o pedido de exclusão de outro cadastro com o mesmo CPF, e este ficou com um pedido aberto, com a mesma data e o mesmo canal (WhatsApp). '
               'Confira se é a mesma pessoa. Se for, exclua os dados. Se não for, recuse o pedido e corrija o CPF na ficha certa.')
        ac = (f'<button class="btn btn-perigo" type="button" data-janela="janela-excluir">{ico("escudo")}Excluir os dados</button>'
              f'<button class="btn btn-sec" type="button" data-janela="janela-recusar">Recusar o pedido</button>')
    else:
        tit = 'Pedido de exclusão aberto em 20/11, aguardando a sócia dona.'
        txt = 'Marina Ribeiro, a sócia dona, vai conferir este cadastro e decidir. Até lá, nada muda na ficha.'
        ac = ''
    return '<div class="pd-faixa">' + aviso('atencao', tit, txt, icone='escudo', acoes=ac, papel='note', extra=' f181-novo') + '</div>'


def outro_cadastro(h):
    for a, b in (('Antônia Ferreira Prado', 'Marina A. Coelho'), ('27/10/2026', '03/02/2025')):
        h = h.replace(a, b)
    return h


# ================================================================ estados
LEMB = dict(n=1, valor='1.840,00', origem='ASTREA', lanc=3)
H_LEMB = hist(3, 0, 0, 'ASTREA', '2033-01-01')   # o lembrete nasce de valor em aberto importado: há histórico
FX = F['FX']
FICHA = F['FICHA_ANT']
FICHA_PEDIDO = ficha_lgpd(sit_dona(True), faixa(True)) + janelas()
T = ''
J = lambda nome, corpo, base=FICHA, **k: tpl(nome, base + corpo, **dict(FX, **k))

T += J('exc-conversas-uma', janela_m(conv_=conv(1)))
T += J('exc-conversas-varias', janela_m(conv_=conv(2, 1)))
T += J('exc-conversas-e-fica', janela_m(conv_=conv(2, 1, 0, 1, [ROSA])))
T += J('exc-so-fica', janela_m(conv_=conv(0, 0, 0, 1, [ROSA])))
T += J('exc-conversas-alternativa-fica', janela_m(conv_=conv(2, 1, 0, 1, [ROSA]), alt_conversas=True))
T += J('exc-pedido-contrato', janela_m(pedidos=['P-2026-014']))
T += J('exc-lembrete', janela_m(h=H_LEMB, lembrete=LEMB))
T += J('exc-lembrete-alternativa-linha', janela_m(h=H_LEMB, lembrete=LEMB, alt_lembrete=True))
T += J('exc-mesmo-cpf', janela_m(cpf=[OUTRO]))
T += J('exc-mesmo-cpf-desmarcado', janela_m(cpf=[OUTRO], cpf_marcado=False))
T += J('exc-mesmo-cpf-pedido', janela_m(cpf=[OUTRO], variante='pedido') + j_recusar(), base=FICHA_PEDIDO)
T += J('exc-mesmo-cpf-varios', janela_m(cpf=[OUTRO_INATIVO_PEDIDO, OUTRO_PROCESSO]))
T += J('exc-assina-por-outro', janela_m(assina=[('João Coelho', 'como mãe e responsável legal')]))
T += J('exc-sobre-condicao', janela_m(sobre=['P-2026-014']))
T += J('exc-baixa-explicacao', janela_m(baixas=1))
T += J('exc-tudo', janela_m(q=aqf(1, 1, 1, 0, '2033-01-01'), h=H_LEMB, conv_=conv(2, 1, 1, 1, [ROSA]), assina=[('João Coelho', 'como mãe e responsável legal')],
                            sobre=['P-2026-014'], baixas=1, pedidos=['P-2026-014'], lembrete=LEMB, cpf=[OUTRO]))
T += tpl('exc-feito-mesmo-cpf', f'<div class="cl">{NS["cab_excluido"]()}{NS["abas_excl"]("ficha")}{NS["grade_ficha"](NS["DADOS_EXCL"], NS["REG"].replace("por e-mail", "por WhatsApp") + NS["ORIG_EXCL"] + NS["SIT_EXCL"])}</div>{toast_feito_cpf()}',
         **NS['FE'])
T += J('arq-mesmo-cpf', janela_arq(cpf=[OUTRO]))
T += J('arq-pedido-contrato', janela_arq(pedidos=['P-2026-014']))
FXO = dict(FX, trilha='Clientes|Marina A. Coelho', titulo='Marina A. Coelho')
T += tpl('ficha-pedido-mesmo-cpf', outro_cadastro(ficha_lgpd(sit_dona(True), faixa_mesmo_cpf(True)) + janelas() + j_excluir(False, 'pedido') + j_recusar()), **FXO)
T += tpl('ficha-pedido-mesmo-cpf-equipe', outro_cadastro(ficha_lgpd(sit_outro(True), faixa_mesmo_cpf(False)) + janelas() + j_pedir()), quem='comercial', **FXO)

# Anotação de desenho (não vai para o produto): contorno tracejado em âmbar só no que é novo
CSS_F181 = r"""
/* ==========================================================================
   F3.181, F3.186, F3.190 e F3.188 (prefixo f181-). Só tokens e pares já aprovados.
   ========================================================================== */
.f181-topo{display:grid;gap:12px}
.f181-cpf p+p{margin-top:6px}
.f181-cpf .f181-caixa{margin:10px 0 0;background:var(--papel)}
.f181-cpf .f181-caixa:has(input:checked){background:var(--papel);border-color:var(--vinho)}
.f181-cpf .f181-caixa span{font-size:13px;line-height:1.45}
.f181-cpf .f181-caixa small{margin-top:2px;color:var(--texto-2)}
.f181-sem{display:flex;gap:8px;align-items:flex-start;margin-top:8px;font-size:12px;line-height:1.45}
.f181-sem .ico{color:var(--vinho-3);flex:none;margin-top:1px}
.f181-cads{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:10px}
.f181-cads li{padding:12px 14px;border-radius:var(--raio);background:var(--papel);display:grid;gap:4px}
.f181-cad-nome a{font-family:var(--serifa);font-size:18px;font-weight:500;color:var(--vinho);display:inline-flex;align-items:center;min-height:44px;margin:-10px 0 -8px}
.f181-cad-nome small{display:block;font-size:12px;color:var(--texto-2);line-height:1.45}
.f181-cads .f181-caixa{margin:6px 0 0}
.f181-ja{display:flex;gap:8px;align-items:center;font-size:13px;margin-top:4px}
.f181-ja .ico{color:var(--vinho-4)}
.f181-toast{width:min(460px,calc(100vw - 32px))}
/* Anotação só do desenho: o que é novo leva contorno tracejado em âmbar. No produto, não há contorno.
   As peças da F3.155, F3.156 e F3.177, já aprovadas e programadas, ficam sem contorno. */
.f181-novo{outline:2px dashed #DD9760;outline-offset:4px;border-radius:2px}
.aviso.f181-novo{outline-offset:3px;border-radius:var(--raio-grande)}
span.f181-novo,.pd-dica.f181-novo{outline:2px dashed #DD9760;outline-offset:2px}
.f181-novo-txt{text-decoration:underline dashed #DD9760 2px;text-underline-offset:5px}
"""

# ================================================================ página (a montagem aprovada, gravando exclusao.html)
NS['T'] = T
NS['CSS_F181'] = CSS_F181
_pag = _src_pd[_corte_pd:]
_pag = _pag.replace("'{\"estado\":\"inicio\",\"atual\":\"inicio\"}'", "'{\"estado\":\"exc-tudo\",\"atual\":\"clientes\"}'")
_pag = _pag.replace("CSS_PD + '\\n</style>'", "CSS_PD + '\\n' + CSS_F181 + '\\n</style>'")
_pag = _pag.replace("os.path.join(SAIDA, 'pendencias.html')", "os.path.join(SAIDA, 'exclusao.html')")
_pag = _pag.replace("print('pendencias ok'", "print('exclusao ok'")
assert 'CSS_F181' in _pag and 'exclusao.html' in _pag and 'exc-tudo' in _pag
exec(compile(_pag, 'pendencias.py (página)', 'exec'), NS)
_arq = os.path.join(SAIDA, 'exclusao.html')
_h = open(_arq, encoding='utf-8').read()
_h = _h.replace('pendencias.html?estado=', 'exclusao.html?estado=').replace(NS['CLIENTES_APROV'], 'exclusao.html')

# ---------------------------------------------------------------- os nomes e as datas do plano (seção 9)
import nomes_181
_h = nomes_181.trocar(_h)
open(_arq, 'w', encoding='utf-8').write(_h)
