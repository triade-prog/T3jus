# Carnê e recibo com o timbrado aprovado (F3.133): o elenco fictício e a regra das linhas.
# O escritório é o Santana, de Salvador, o mesmo de escritorio-dados-documentos (aprovado em 22/11/2026),
# com a razão social longa pedida para o teste. O cliente, o contrato e as parcelas são os do carnê e do recibo aprovados.
# A regra das 4 linhas é a da função timbrado() de escritorio-dados-documentos/_fonte/esc_elenco.py, sem mudança;
# aqui só se acrescenta quando uma linha é igual à marca e não se repete.
import re, unicodedata


def cnpj_de(base12):
    d = [int(x) for x in base12]
    for pesos in ([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]):
        s = sum(a * b for a, b in zip(d, pesos)) % 11
        d.append(0 if s < 2 else 11 - s)
    s = ''.join(map(str, d))
    return f'{s[:2]}.{s[2:5]}.{s[5:8]}/{s[8:12]}-{s[12:]}'


DOMINIO = 'santana.adv.br'
RAZAO_LONGA = ('SANTANA, LIMA, OLIVEIRA, ALBUQUERQUE CAVALCANTI, VASCONCELOS FIGUEIREDO, MENEZES, ANDRADE, '
               'QUEIROZ MONTEIRO E BITTENCOURT PRADO SOCIEDADE DE ADVOGADOS')
assert len(RAZAO_LONGA) == 150, len(RAZAO_LONGA)   # o máximo aceito em Dados do escritório (5 a 150)

SEDE = dict(rua='Av. Tancredo Neves', num='1.632', comp='sala 1.208', bairro='Caminho das Árvores', cidade='Salvador', uf='BA', cep='41820-020')


def esc(**k):
    e = dict(curto='Santana Advocacia', tipo='sociedade', razao='SANTANA, LIMA E OLIVEIRA SOCIEDADE DE ADVOGADOS',
             cnpj=cnpj_de('473185520001'), oab='OAB/BA 4.217', sede=SEDE, tel='(71) 3352-4180', email=f'contato@{DOMINIO}',
             site=DOMINIO, contato=None, whats='(71) 99187-4402', logo=False,
             dona='Carolina Soares Santana', dona_oab='OAB/BA 63.876-S', quem=('Carol Santana', 'OAB/BA 63.876-S'),
             pix=dict(tipo='CNPJ', chave_vis=cnpj_de('473185520001'), chave=re.sub(r'\D', '', cnpj_de('473185520001')),
                      recebedor='SANTANA LIMA OLIVEIRA ADV', cidade='SALVADOR'))
    e.update(k)
    return e


COMPLETA = esc()
LOGO = esc(logo=True)
LONGA = esc(razao=RAZAO_LONGA)
# Sem sociedade: sem razão social, CNPJ nem OAB da sociedade. Quem aparece é a sócia dona, com a OAB dela (sem CPF).
SEM = esc(curto='Carol Santana Advocacia', tipo='sem', razao='', cnpj='', oab='', email=f'carolina@{DOMINIO}', site='',
          pix=dict(tipo='CPF', chave_vis='123.456.789-09', chave='12345678909', recebedor='CAROLINA SOARES SANTANA', cidade='SALVADOR'))
# Razão social vazia (escritório migrado que ainda não completou): CNPJ sim, OAB da sociedade não,
# telefone e e-mail do escritório vazios (o timbrado usa o primeiro contato, decisão 9 aprovada).
VAZIA = esc(razao='', oab='', tel='', email='', site='', contato=('(71) 98877-1020', f'carol@{DOMINIO}'),
            pix=dict(tipo='CNPJ', chave_vis=cnpj_de('473185520001'), chave=re.sub(r'\D', '', cnpj_de('473185520001')),
                     recebedor='SANTANA ADVOCACIA', cidade='SALVADOR'))

NW = lambda s: f'<span class="tb-nw">{s}</span>'


def sede_linha(e):
    x = e['sede']
    comp = f', {x["comp"]}' if x.get('comp') else ''
    return f'{x["rua"]}, {x["num"]}{comp}, {x["bairro"]}, {x["cidade"]}/{x["uf"]}, ' + NW(f'CEP {x["cep"]}')


def timbrado(e, site=True):
    """As 4 linhas aprovadas: (1) razão social, ou o nome completo da sócia dona sem sociedade, ou o nome curto;
    (2) CNPJ · OAB da sociedade (sem sociedade: OAB da dona · sem CNPJ); (3) a sede numa linha, com CEP;
    (4) telefone · e-mail · site do escritório, ou o primeiro contato."""
    if e['tipo'] == 'sem':
        l1, l2 = e['dona'], f'{NW(e["dona_oab"])} · sem CNPJ'
    else:
        l1 = e['razao'] or e['curto']
        l2 = ' · '.join(x for x in [f'CNPJ {NW(e["cnpj"])}' if e['cnpj'] else '', NW(e['oab']) if e['oab'] else ''] if x)
    l3 = sede_linha(e)
    if e['tel'] or e['email']:
        l4 = [e['tel'], e['email']] + ([e['site']] if site else [])
    else:
        l4 = list(e['contato'] or [])
    l4 = ' · '.join(NW(x) for x in l4 if x)
    return l1, l2, l3, l4


def assinatura(e):
    """Quem assina o recibo e quem aparece no canhoto: a razão social com CNPJ e OAB; sem sociedade, a sócia dona
    com a OAB dela (sem CPF); sem razão social, o nome curto, sem marca de falta."""
    if e['tipo'] == 'sem':
        return e['dona'], NW(e['dona_oab'])
    l2 = ' · '.join(x for x in [f'CNPJ {NW(e["cnpj"])}' if e['cnpj'] else '', NW(e['oab']) if e['oab'] else ''] if x)
    return (e['razao'] or e['curto']), l2


def _norm(s):
    s = re.sub(r'<[^>]+>', '', s).replace('&amp;', 'e').replace('&', 'e')
    s = ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn').lower()
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


def mesmo(a, b):
    """Igual à marca, sem contar maiúsculas, acentos e pontuação ("&" vale "e")."""
    return _norm(a) == _norm(b)


def sub_marca(e):
    """O "Advocacia" pequeno embaixo do nome em letra só entra quando o nome curto ainda não diz isso."""
    return '' if re.search(r'advoca|advoga', _norm(e['curto'])) else 'Advocacia'
LONGA_LOGO = esc(razao=RAZAO_LONGA, logo=True)

# Nome curto sem "Advocacia": o escritório do carnê e do recibo aprovados (Ribeiro & Matos, em São Paulo), com os dados
# que já estavam lá. Inventados aqui: o telefone fixo e o site. Serve para medir a linha "ADVOCACIA" embaixo do nome.
RIBEIRO = esc(curto='Ribeiro &amp; Matos', razao='Ribeiro &amp; Matos Sociedade de Advogados', cnpj='41.276.839/0001-34',
              oab='OAB/SP 31.874', tel='(11) 3051-7720', email='financeiro@ribeiromatos.adv.br', site='ribeiromatos.adv.br',
              whats='(11) 97405-2210', quem=('Marina Ribeiro', 'OAB/SP 214.538'),
              sede=dict(rua='Rua Cardeal Arcoverde', num='1749', comp='sala 92', bairro='Pinheiros', cidade='São Paulo', uf='SP', cep='05407-002'),
              pix=dict(tipo='CNPJ', chave_vis='41.276.839/0001-34', chave='41276839000134', recebedor='RIBEIRO E MATOS SOC ADV', cidade='SAO PAULO'))
