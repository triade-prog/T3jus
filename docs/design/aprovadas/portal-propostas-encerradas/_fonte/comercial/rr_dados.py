# Dados fictícios das 3 peças (recibo, conta recorrente, pedidos de contrato).
# "Hoje" é 18/11/2026, como no Financeiro e no carnê aprovados. O escritório e o contrato de Hélio
# são os mesmos do carnê aprovado (carne_dados.py), copiados aqui para não depender do QR (segno).

HOJE = '18/11/2026'


def cpf(b):
    """CPF com dígitos verificadores certos, a partir dos 9 primeiros números (o mesmo do contratos.py)."""
    d = [int(x) for x in b]
    for n in (10, 11):
        s = sum(v * (n - i) for i, v in enumerate(d)) % 11
        d.append(0 if s < 2 else 11 - s)
    s = ''.join(map(str, d))
    return f'{s[:3]}.{s[3:6]}.{s[6:9]}-{s[9:]}'


ESC = dict(
    nome='Ribeiro &amp; Matos',
    razao='Ribeiro &amp; Matos Sociedade de Advogados',
    sub='Advocacia',
    cnpj='41.276.839/0001-34',
    oab='OAB/SP 31.874',
    endereco='Rua Cardeal Arcoverde, 1749, sala 92 · Pinheiros<br>São Paulo, SP · CEP 05407-002',
    whats='(11) 97405-2210',
    email='financeiro@ribeiromatos.adv.br',
    cidade='São Paulo',
    dona='Marina Ribeiro',
)

CLI = dict(nome='Hélio Batista Corrêa', cpf=cpf('318482617'))
MARTA = dict(nome='Marta Corrêa', cpf=cpf('205771384'), papel='esposa de Hélio, contato principal')
CT = dict(numero='C-2026-014', objeto='ação revisional', total=6, valor=850.00, multa='2%', juros='1% ao mês')

RECIBO = dict(numero='2026-0187', curto='0187', parcela=3, ref='outubro de 2026', venc='25/10/2026',
              pago='18/11/2026', forma='Pix', quem='Marina Ribeiro', quem_oab='OAB/SP 214.538', hora='15h20',
              multa=17.00, juros=6.80, dias=24)


def R(v):
    s = f'{v:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
    return f'R$ {s}'


_U = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze',
      'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
_D = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
_C = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']


def _ate_mil(n):
    if n == 100:
        return 'cem'
    p = []
    c, r = divmod(n, 100)
    if c:
        p.append(_C[c])
    if r:
        if r < 20:
            p.append(_U[r])
        else:
            d, u = divmod(r, 10)
            p.append(_D[d] + (f' e {_U[u]}' if u else ''))
    return ' e '.join(p)


def _inteiro(n):
    if n == 0:
        return 'zero'
    mil, r = divmod(n, 1000)
    p = []
    if mil:
        p.append('mil' if mil == 1 else _ate_mil(mil) + ' mil')
    if r:
        p.append(_ate_mil(r))
    if len(p) == 2 and (r < 100 or r % 100 == 0):
        return p[0] + ' e ' + p[1]
    return (' ' if len(p) == 2 else '').join(p) if len(p) == 1 else p[0] + ' ' + p[1]


def extenso(v):
    """Valor em reais por extenso (até 999.999,99), como vai no recibo."""
    cent = round(v * 100)
    r, c = divmod(cent, 100)
    partes = []
    if r:
        partes.append(_inteiro(r) + (' real' if r == 1 else ' reais'))
    if c:
        partes.append(_inteiro(c) + (' centavo' if c == 1 else ' centavos'))
    return ' e '.join(partes) if partes else 'zero real'


if __name__ == '__main__':
    for v in (850, 873.80, 23.80, 1000, 1200.5, 2001, 3780, 100, 101.01, 2550):
        print(R(v), extenso(v))
    print(CLI['cpf'], MARTA['cpf'])
