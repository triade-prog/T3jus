# Sua conta · dados para os documentos: elenco fictício (escritório Santana, em Salvador), a regra da frase
# de qualificação do advogado e a troca do escritório e das pessoas na moldura aprovada (que vem com o
# elenco do Portal v1, Ribeiro & Matos). Dados fictícios; os CPFs têm dígitos válidos, OAB e RG são inventados.
import html

H = html.escape


def cpf_de(base9):
    d = [int(x) for x in base9]
    for n in (10, 11):
        s = sum(v * (n - i) for i, v in enumerate(d)) % 11
        d.append(0 if s < 2 else 11 - s)
    s = ''.join(map(str, d))
    return f'{s[:3]}.{s[3:6]}.{s[6:9]}-{s[9:]}'


assert cpf_de('123456789') == '123.456.789-09'

ESCRITORIO = 'Santana Advocacia'
DOMINIO = 'santana.adv.br'
END_ESC = 'Av. Tancredo Neves, 1.632, sala 1.208, Caminho das Árvores, Salvador/BA, CEP 41820-020'
END_ESC_PARTES = dict(cep='41820-020', rua='Av. Tancredo Neves, 1.632, sala 1.208', bairro='Caminho das Árvores', cidade='Salvador', uf='BA')
UFS_NOMES = {'BA': 'Bahia', 'SE': 'Sergipe', 'SP': 'São Paulo', 'PE': 'Pernambuco'}

# Estado civil: os mesmos códigos do cadastro do cliente (0160), com concordância pelo tratamento.
ESTADOS = [('SOLTEIRO', 'solteira', 'solteiro'), ('CASADO', 'casada', 'casado'), ('UNIAO_ESTAVEL', 'em união estável', 'em união estável'),
           ('SEPARADO', 'separada', 'separado'), ('DIVORCIADO', 'divorciada', 'divorciado'), ('VIUVO', 'viúva', 'viúvo')]
EC = {k: (a, o) for k, a, o in ESTADOS}
EC_ROT = {'SOLTEIRO': 'Solteira ou solteiro', 'CASADO': 'Casada ou casado', 'UNIAO_ESTAVEL': 'União estável',
          'SEPARADO': 'Separada ou separado', 'DIVORCIADO': 'Divorciada ou divorciado', 'VIUVO': 'Viúva ou viúvo'}


def num_fmt(n):
    return f'{int(n):,}'.replace(',', '.')


def oab_curta(i):
    uf, n, l, _ = i
    return f'OAB/{uf} {num_fmt(n)}{"-" + l if l else ""}'


def pessoa(**k):
    p = dict(curto='', completo='', trat=None, nac='', ec=None, cpf=None, rg=None, rg_org=None, end_esc=True, end=None,
             email_prof='', tel='', oab=[], login='', desde='', papel='', dona=False, areas=[], quem='socio')
    p.update(k)
    return p


CAROL = pessoa(curto='Carol Santana', completo='Carolina Soares Santana', trat='a', nac='brasileira', ec='CASADO',
               cpf='123.456.789-09', rg='08.765.432-10', rg_org='SSP/BA', email_prof=f'carolina@{DOMINIO}', tel='(71) 3352-4180',
               oab=[('BA', '63876', 'S', 'principal')], login=f'carolina@{DOMINIO}', desde='03/02/2025', papel='Sócia dona',
               dona=True, areas=['comercial', 'contratos', 'financeiro', 'juridico'], quem='socio')
CAROL_FALTA = dict(CAROL, ec=None, cpf=None, rg=None, rg_org=None, email_prof='', tel='')
RAFAEL = pessoa(curto='Rafael Menezes', completo='Rafael Augusto Menezes Lima', trat='o', nac='brasileiro', ec=None, cpf=None,
                rg='13.204.887-45', rg_org='SSP/BA', oab=[('BA', '71204', '', 'principal'), ('SE', '1288', '', 'suplementar')],
                login=f'rafael@{DOMINIO}', desde='10/03/2026', papel='Advogado', areas=['contratos', 'juridico'], quem='rafael')
RAFAEL_OK = dict(RAFAEL, ec='SOLTEIRO', cpf=cpf_de('604318725'))
JULIA = pessoa(curto='Júlia Andrade', login=f'julia@{DOMINIO}', desde='15/07/2026', papel='Recepção', areas=[], quem='sem-area')
LONGA = pessoa(curto='Maria Eduarda Albuquerque Cavalcanti', completo='Maria Eduarda Albuquerque Cavalcanti de Vasconcelos Figueiredo',
               trat='a', nac='brasileira', ec='UNIAO_ESTAVEL', cpf=cpf_de('815204367'), rg='11.908.334-27', rg_org='SSP/BA',
               end_esc=False, end=dict(cep='41820-021', rua='Rua Ewerton Visco, 290, sala 1.504, Edifício Boulevard Side Empresarial',
                                       bairro='Caminho das Árvores', cidade='Salvador', uf='BA'),
               email_prof=f'maria.eduarda.vasconcelos.figueiredo@{DOMINIO}', tel='(71) 99184-2207',
               oab=[('BA', '58901', '', 'principal')], login=f'maria.eduarda.vasconcelos.figueiredo@{DOMINIO}', desde='02/09/2026',
               papel='Advogada', areas=['juridico'], quem='longa')

# Os 8 dados que contam para "faltam N de 8". E-mail e telefone profissionais são opcionais e não contam.
DADOS = [('completo', 'nome completo'), ('trat', 'como o documento te chama'), ('nac', 'nacionalidade'), ('ec', 'estado civil'),
         ('cpf', 'CPF'), ('rg', 'RG'), ('end', 'endereço profissional'), ('oab', 'OAB')]


def faltas(p):
    f = []
    for k, rot in DADOS:
        if k == 'end':
            ok = p['end_esc'] or (p['end'] and p['end'].get('cidade'))
        elif k == 'rg':
            ok = p['rg'] and p['rg_org']
        elif k == 'cpf':
            ok = p['cpf'] and not p.get('cpf_ruim')
        else:
            ok = p[k]
        if not ok:
            f.append(rot)
    return f


def lista_e(itens):
    return itens[0] if len(itens) == 1 else ', '.join(itens[:-1]) + ' e ' + itens[-1]


def endereco(p):
    if p['end_esc']:
        return END_ESC
    e = p['end'] or {}
    if not e.get('cidade'):
        return None
    return f'{e["rua"]}, {e["bairro"]}, {e["cidade"]}/{e["uf"]}, CEP {e["cep"]}'


def falta_html(o):
    return f'<mark class="cd-falta">[{o}: falta]</mark>'


def qualificacao(p, so_texto=False, marca=None):
    """A frase de [ADVOGADOS_QUALIFICACAO] para uma pessoa, com o que falta marcado como no cliente ("[CPF: falta]").
    marca: função que envolve o valor que veio do cadastro (na prévia do gerador, o traço)."""
    F = (lambda o: f'[{o}: falta]') if so_texto else falta_html
    NW = (lambda s: s) if so_texto else (lambda s: f'<span class="cd-nw">{s}</span>')  # números não quebram no meio
    M = marca or (lambda s: s)
    g = p['trat']
    a = 'a' if g == 'a' else ('o' if g == 'o' else '(a)')
    nome = M(p['completo'].upper()) if p['completo'] else F('NOME COMPLETO')
    partes = [nome]
    partes.append(M(p['nac']) if p['nac'] else F('NACIONALIDADE'))
    if p['ec']:
        partes.append(M(EC[p['ec']][0 if g == 'a' else 1]))
    else:
        partes.append(F('ESTADO CIVIL'))
    adv = 'advogada' if g == 'a' else ('advogado' if g == 'o' else 'advogado(a)')
    ins = [f'na OAB/{uf} sob o nº ' + NW(f'{num_fmt(n)}{"-" + l if l else ""}') for uf, n, l, _ in p['oab']]
    if ins:
        partes.append(f'{adv} inscrit{a} ' + M(lista_e(ins)))
    else:
        partes.append(f'{adv}, ' + F('OAB'))
    rg = M(NW(p['rg']) + ' ' + p['rg_org']) if p['rg'] and p['rg_org'] else F('RG')
    partes.append(f'portador{"a" if g == "a" else ("" if g == "o" else "(a)")} do RG nº {rg}')
    if p.get('cpf_ruim'):
        cpf = (f'[CPF: confira]' if so_texto else '<mark class="cd-falta">[CPF: confira]</mark>')
    else:
        cpf = M(NW(p['cpf'])) if p['cpf'] else F('CPF')
    partes.append(f'inscrit{a} no CPF sob o nº ' + cpf)
    e = endereco(p)
    if e and 'CEP ' in e:
        a_, c_ = e.rsplit('CEP ', 1)
        e = a_ + NW('CEP ' + c_)
    partes.append('com escritório profissional na ' + (M(e) if e else F('ENDEREÇO PROFISSIONAL')))
    return ', '.join(partes)


# ---------------------------------------------------------------- troca do escritório e das pessoas na moldura aprovada
QUEM = ("rafael:{nome:'Rafael Menezes',ini:'R',papel:'Advogado · Contratos e Jurídico',areas:['contratos','juridico'],dono:false},"
        "longa:{nome:'Maria Eduarda Albuquerque Cavalcanti',ini:'M',papel:'Advogada · Jurídico',areas:['juridico'],dono:false},"
        "'sem-area':{nome:'Júlia Andrade',ini:'J',papel:'Recepção · partes comuns',areas:[],dono:false},'antigo-sem-area':{")


def rebatizar(out):
    trocas = [
        ("socio:{nome:'Marina Ribeiro',ini:'M',papel:'Sócia dona · vê tudo'", "socio:{nome:'Carol Santana',ini:'C',papel:'Sócia dona · vê tudo'"),
        ("'sem-area':{", QUEM),
        ('<span class="mo" aria-hidden="true">R</span><span><strong>Ribeiro &amp; Matos</strong><small>Advocacia · 7 pessoas</small>',
         '<span class="mo" aria-hidden="true">S</span><span><strong>Santana Advocacia</strong><small>Advocacia · 5 pessoas</small>'),
        ('Ribeiro &amp; Matos', ESCRITORIO), ('Ribeiro & Matos', ESCRITORIO),
        ('<strong data-quem-nome>Marina Ribeiro</strong>', '<strong data-quem-nome>Carol Santana</strong>'),
        ('data-quem-ini>M<', 'data-quem-ini>C<'),
    ]
    for a, b in trocas:
        out = out.replace(a, b)
    return out
