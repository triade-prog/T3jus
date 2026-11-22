# Dados do escritório para os documentos: elenco fictício do escritório (Santana Advocacia, em Salvador,
# o mesmo de portal-conta-dados) e a regra da frase "CONTRATADA: ..." e do endereço numa linha só.
# CNPJs com dígitos válidos; CEPs, OAB e números de rua inventados.
from elenco import *


def cnpj_de(base12):
    d = [int(x) for x in base12]
    for pesos in ([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]):
        s = sum(a * b for a, b in zip(d, pesos)) % 11
        d.append(0 if s < 2 else 11 - s)
    s = ''.join(map(str, d))
    return f'{s[:2]}.{s[2:5]}.{s[5:8]}/{s[8:12]}-{s[12:]}'


assert cnpj_de('608141440001') == '60.814.144/0001-03'   # o CNPJ do print da Carol confere

TIPOS = {
    'sociedade': ('Sociedade de advogados', 'Duas ou mais pessoas sócias, com CNPJ e registro da sociedade na OAB.'),
    'individual': ('Sociedade individual de advocacia', 'Uma pessoa só, com CNPJ e registro da sociedade na OAB.'),
    'sem': ('Advogada ou advogado sem sociedade', 'Sem CNPJ. O contrato sai com a pessoa como contratada, com a qualificação dela.'),
}


def esc(**k):
    e = dict(nome='Santana Advocacia', tipo='individual', razao='Santana Sociedade Individual de Advocacia',
             cnpj=cnpj_de('473185520001'), oab=('BA', '4217'),
             end=dict(cep='41820-020', rua='Av. Tancredo Neves', num='1.632', comp='sala 1.208', bairro='Caminho das Árvores',
                      cidade='Salvador', uf='BA'),
             antigo=None, tel='(71) 3352-4180', email=f'contato@{DOMINIO}', site=DOMINIO, cidade='Salvador', uf='BA')
    e.update(k)
    return e


SANTANA = esc()
# O caso do print da Carol (22/11): nome curto, CNPJ, cidade e UF; o resto não existe ainda.
PRINT = esc(nome='Santana', tipo=None, razao='', cnpj='60.814.144/0001-03', oab=None, end=None, tel='', email='', site='',
            cidade='Presidente Jânio Quadros', uf='BA')
SEM = esc(nome='Carol Santana Advocacia', tipo='sem', razao='', cnpj='', oab=None, email=f'carolina@{DOMINIO}', site='')
ANTIGO = esc(end=None, antigo='Av. Tancredo Neves 1632 sl 1208 - Caminho das Arvores', tel='(71) 3352-4180')

# Os dados que contam para "N de 5" (ou "N de 2", sem sociedade). Telefone, e-mail e site são opcionais e não contam,
# como o e-mail e o telefone profissionais em Sua conta.
DADOS_ESC = [('tipo', 'o tipo'), ('razao', 'a razão social'), ('cnpj', 'o CNPJ'), ('oab', 'o registro da sociedade na OAB'),
             ('end', 'o endereço da sede')]


def end_ok(e):
    x = e['end']
    return bool(x and all(x.get(k) for k in ('cep', 'rua', 'num', 'bairro', 'cidade', 'uf')))


def dados_que_contam(e):
    if e['tipo'] == 'sem':
        return [d for d in DADOS_ESC if d[0] in ('tipo', 'end')]
    return DADOS_ESC


def faltas_esc(e):
    f = []
    for k, rot in dados_que_contam(e):
        ok = end_ok(e) if k == 'end' else bool(e[k])
        if not ok:
            f.append(rot)
    return f


def end_linha(e, nw=True):
    """O endereço da sede numa linha só, como sai em [ESCRITORIO_ENDERECO]."""
    x = e['end']
    if not end_ok(e):
        return None
    N = (lambda s: f'<span class="cd-nw">{s}</span>') if nw else (lambda s: s)
    comp = f', {x["comp"]}' if x.get('comp') else ''
    return f'{x["rua"]}, {x["num"]}{comp}, {x["bairro"]}, {x["cidade"]}/{x["uf"]}, ' + N(f'CEP {x["cep"]}')


def oab_soc(e):
    if not e['oab']:
        return None
    uf, n = e['oab']
    return f'OAB/{uf} {num_fmt(n)}'


def mk(t, tipo='falta'):
    return f'<mark class="cd-falta">[{t}: {tipo}]</mark>'


REF_ADV = '<span class="ed-ref" title="Vem de Advogados nos documentos">[QUALIFICAÇÃO DOS ADVOGADOS]</span>'


def contratada(e, marca=None, advs=True):
    """O parágrafo da contratada no contrato padrão, com o que falta marcado."""
    M = marca or (lambda s: s)
    if e['tipo'] == 'sem':
        q = qualificacao(CAROL, marca=marca)
        nome = CAROL['completo'].upper()
        q = q.replace(nome, f'<strong>{nome}</strong>', 1) if not marca else q
        return f'<b>CONTRATADA:</b> {q}.'
    if e['razao']:
        nome = M(f'<strong>{e["razao"].upper()}</strong>')
    else:
        nome = f'<strong>{e["nome"].upper()}</strong> ' + mk('RAZÃO SOCIAL')
    cnpj = M(f'<span class="cd-nw">{e["cnpj"]}</span>') if e['cnpj'] else mk('CNPJ')
    if e.get('cnpj_ruim'):
        cnpj = mk('CNPJ', 'confira')
    if e['oab']:
        uf, n = e['oab']
        oab = M(f'OAB/{uf} sob o nº <span class="cd-nw">{num_fmt(n)}</span>')
    else:
        oab = mk('OAB DA SOCIEDADE')
    el = end_linha(e)
    if el:
        end = M(el)
    elif e['antigo']:
        end = M(e['antigo']) + ' ' + mk('ENDEREÇO', 'confira')
    else:
        end = mk('ENDEREÇO DO ESCRITÓRIO') + (f', {M(e["cidade"] + "/" + e["uf"])}' if e['cidade'] else '')
    fim = f', por seus advogados, {REF_ADV}' if advs else ''
    return f'<b>CONTRATADA:</b> {nome}, inscrita no CNPJ sob o nº {cnpj} e registrada na {oab}, com sede em {end}{fim}.'


def timbrado(e):
    """As linhas do timbrado do recibo e do carnê."""
    if e['tipo'] == 'sem':
        l1 = CAROL['completo']
        l2 = 'OAB/BA 63.876-S · sem CNPJ'
    else:
        l1 = e['razao'] or e['nome']
        l2 = ' · '.join(x for x in [f'CNPJ {e["cnpj"]}' if e['cnpj'] else '', oab_soc(e) or ''] if x)
    l3 = end_linha(e) or e['antigo'] or (e['cidade'] + '/' + e['uf'] if e['cidade'] else '')
    l4 = ' · '.join(x for x in [e['tel'], e['email'], e['site']] if x)
    return l1, l2, l3, l4
