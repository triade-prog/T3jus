# F3.146 · O que sobrou da razão social: o elenco fictício e as regras das linhas, para os 4 desenhos.
# O escritório é o Santana, de Salvador, de rs_dados.py (cópia sem mudança de carne-recibo-razao-social).
# As regras repetem, em Python, as funções que já existem e estão testadas em
# sistema/packages/domain/src/timbrado.ts (timbradoDoEscritorio, identificacaoDoCarne, linhasDoTimbreRecibo,
# mesmoNome, subMarcaAdvocacia, razaoLonga), mais as duas novas do plano: timbrado_docx (timbradoDoDocx)
# e razao_em_branco (razaoSocialEmBranco).
import base64, os, re
from rs_dados import (esc, COMPLETA, LOGO, LONGA, LONGA_LOGO, SEM, VAZIA, RIBEIRO, RAZAO_LONGA, SEDE, DOMINIO,
                      mesmo, sub_marca, cnpj_de)

AQUI = os.path.dirname(os.path.abspath(__file__))
APROV = os.environ.get('APROV', '/home/user/t3jus/docs/design/aprovadas/')
REPO = os.environ.get('REPO', '/home/user/t3jus/')


def uri(nome):
    with open(os.path.join(AQUI, 'logos', f'logo-{nome}.png'), 'rb') as f:
        return 'data:image/png;base64,' + base64.b64encode(f.read()).decode()


def tam(nome):
    from PIL import Image
    return Image.open(os.path.join(AQUI, 'logos', f'logo-{nome}.png')).size


# Escritórios a mais, além dos de rs_dados.py
QUADRADO = esc(logo='quadrado')                       # logo quase quadrado, com o nome ao lado (LOGO_E_NOME)
LONGA_QUADRADO = esc(razao=RAZAO_LONGA, logo='quadrado')
VAZIA_LOGO = dict(VAZIA, logo=True)
# Endereço do cadastro antigo, num texto só (a 0860 o pôs em "Rua" e marcou "confira"): sem número, bairro nem CEP separados.
ANTIGO = esc(sede=None, antigo='Av. Tancredo Neves 1632 sl 1208 - Caminho das Arvores')
# Tipo nulo: escritório migrado que ainda não escolheu o tipo. Conta como razão social em branco (plano, seção 2).
MIGRADO = dict(VAZIA, tipo=None)

# Quem é quem no Portal do Santana
DONA_CURTA = 'Carol Santana'
EQUIPE = ('Bruna Teixeira', 'B', 'Áreas: Contratos e Financeiro')   # inventada aqui: alguém da equipe com Financeiro


def logo_de(e):
    """'largo', 'quadrado' ou None."""
    if not e.get('logo'):
        return None
    return 'quadrado' if e['logo'] == 'quadrado' else 'largo'


def nw(s, c='rz-nw'):
    return f'<span class="{c}">{s}</span>'


def _sede(e, c):
    if e.get('antigo'):
        # linhaSede de timbrado.ts: o texto antigo e a cidade/UF, sem "confira" (o papel vai ao cliente)
        return f'{e["antigo"]}, Salvador/BA'
    x = e['sede']
    comp = f', {x["comp"]}' if x.get('comp') else ''
    return f'{x["rua"]}, {x["num"]}{comp}, {x["bairro"]}, {x["cidade"]}/{x["uf"]}, ' + nw(f'CEP {x["cep"]}', c)


def linhas(e, site=True, c='rz-nw'):
    """timbradoDoEscritorio: (nome, documento, sede, contato). Pedaços inteiros em <span class=c>."""
    if e['tipo'] == 'sem':
        l1, l2 = e['dona'], f'{nw(e["dona_oab"], c)} · sem CNPJ'
    else:
        l1 = e['razao'] or e['curto']
        l2 = ' · '.join(x for x in [nw(f'CNPJ {e["cnpj"]}', c) if e['cnpj'] else '', nw(e['oab'], c) if e['oab'] else ''] if x)
    if e['tel'] or e['email']:
        l4 = [e['tel'], e['email']] + ([e['site']] if site else [])
    else:
        l4 = list(e['contato'] or [])
    return l1, l2, _sede(e, c), ' · '.join(nw(x, c) for x in l4 if x)


def longa(nome):
    return len(re.sub(r'<[^>]+>|&amp;', 'x', nome).strip()) > 90


def identificacao(e):
    """identificacaoDoCarne: (nome ou None, documento) ou None."""
    l1, l2, _, _ = linhas(e, site=False)
    nome = None if mesmo(l1, e['curto']) else l1
    if not nome and not l2:
        return None
    return nome, l2


def timbre_recibo(e):
    """linhasDoTimbreRecibo: (destaque ou None, [linhas]), com o WhatsApp numa 5ª linha quando é outro número."""
    l1, l2, l3, l4 = linhas(e)
    ls = [x for x in (l2, l3, l4) if x]
    if e.get('whats') and e['whats'] not in re.sub(r'<[^>]+>', '', l4):
        ls.append('WhatsApp ' + nw(e['whats']))
    return (None if mesmo(l1, e['curto']) else l1), ls


def timbrado_docx(e):
    """timbradoDoDocx (nova, seção 4.1 do plano): as linhas do cabeçalho do .docx, com o site.
    Sem logo: as 4 linhas. Com logo: a 1ª sai quando é igual ao nome curto (o logo já diz o nome)."""
    l1, l2, l3, l4 = linhas(e, c='dx-nw')
    tira = bool(logo_de(e)) and mesmo(l1, e['curto'])
    return dict(nome=None if tira else l1, linhas=[x for x in (l2, l3, l4) if x], longa=longa(l1))


def linhas_docx_hoje(e):
    """linhasTimbrado de hoje (proposta_docx.ts): 3 linhas, com "CNPJ · OAB · sede" juntos e sem o CEP separado."""
    if e.get('antigo'):
        lugar = f'{e["antigo"]} · Salvador/BA'
    else:
        x = e['sede']
        comp = f', {x["comp"]}' if x.get('comp') else ''
        lugar = f'{x["rua"]}, {x["num"]}{comp} · {x["cidade"]}/{x["uf"]} · CEP {x["cep"]}'
    if e['tipo'] == 'sem':
        nome, doc = e['dona'], ' · '.join([e['dona_oab'], lugar])
    else:
        nome = e['razao'] or e['curto']
        doc = ' · '.join(x for x in [f'CNPJ {e["cnpj"]}' if e['cnpj'] else '', e['oab'], lugar] if x)
    c = [e['tel'], e['email']] if (e['tel'] or e['email']) else list(e['contato'] or [])
    contato = ' · '.join(x for x in c + [e['site']] if x)
    return [x for x in (nome, doc, contato) if x]


def razao_em_branco(e):
    """razaoSocialEmBranco (nova, seções 4.1 e 12 do plano): 'TIPO' quando o tipo está vazio e não há razão social
    (escritório migrado, que pode ser de advogada sem sociedade); 'RAZAO' quando é sociedade sem razão social
    (só espaços conta como vazia); None sem sociedade ou com a razão preenchida."""
    if e['tipo'] == 'sem' or (e['razao'] or '').strip():
        return None
    return 'TIPO' if e['tipo'] is None else 'RAZAO'
