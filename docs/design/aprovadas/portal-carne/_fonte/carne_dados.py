# Dados do carnê (FI-23) e o Pix estático do escritório (BR Code EMV, com CRC16) e o QR Code.
# Tudo fictício. "Hoje" é 18/11/2026, como no Financeiro aprovado.
# O QR sai de verdade (escaneável) com a biblioteca segno; o gerar.sh instala numa pasta temporária.
import os, sys, unicodedata

if os.environ.get('PYLIBS'):
    sys.path.insert(0, os.environ['PYLIBS'])
import segno

HOJE = '18/11/2026'

ESC = dict(
    nome='Ribeiro &amp; Matos',
    razao='Ribeiro &amp; Matos Sociedade de Advogados',
    sub='Advocacia',
    cnpj='41.276.839/0001-34',
    oab='OAB/SP 31.874',  # registro da sociedade, fictício
    endereco='Rua Cardeal Arcoverde, 1749, sala 92 · Pinheiros · São Paulo, SP',
    whats='(11) 97405-2210',
    dona='Marina Ribeiro',
)

# Chave Pix cadastrada pela sócia dona (Escritório › Recebimento)
PIX = dict(tipo='CNPJ', chave_vis='41.276.839/0001-34', chave='41276839000134',
           recebedor='RIBEIRO E MATOS SOC ADV', cidade='SAO PAULO')

INSTRUCOES = ('Transferência ou depósito no Banco do Brasil, agência 1234-5, conta corrente 67890-1, '
              'em nome de Ribeiro &amp; Matos Sociedade de Advogados (CNPJ 41.276.839/0001-34). '
              'Escreva o identificador da parcela na descrição e mande o comprovante pelo WhatsApp (11) 97405-2210.')

CLI = dict(nome='Hélio Batista Corrêa', cpf='***.482.617-**', contato='Marta Corrêa', contato_papel='esposa',
           contato_tel='(11) 98114-3059')

CT = dict(numero='C-2026-014', num_id='C2026014', objeto='Honorários · ação revisional', total_parc=6, valor=850.00,
          dia=25, multa='2%', juros='1% ao mês', responsavel='Diego Almeida')

# (numero, referência, vencimento, situação)
PARCELAS = [
    (1, 'agosto de 2026', '25/08/2026', 'paga'),
    (2, 'setembro de 2026', '25/09/2026', 'paga'),
    (3, 'outubro de 2026', '25/10/2026', 'vencida'),
    (4, 'novembro de 2026', '25/11/2026', 'a vencer'),
    (5, 'dezembro de 2026', '25/12/2026', 'a vencer'),
    (6, 'janeiro de 2027', '25/01/2027', 'a vencer'),
]


def R(v):
    s = f'{v:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
    return f'R$ {s}'


def txid(n):
    """Identificador da parcela: contrato sem traço + P + número com 2 dígitos (até 25 letras e números)."""
    return f'{CT["num_id"]}P{n:02d}'


def _emv(i, v):
    return f'{i}{len(v):02d}{v}'


def _crc16(s):
    crc = 0xFFFF
    for b in s.encode('utf-8'):
        crc ^= b << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) if crc & 0x8000 else (crc << 1)
            crc &= 0xFFFF
    return f'{crc:04X}'


def sem_acento(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn').upper()


def brcode(valor=None, tid='***', info=None, chave=None):
    """Pix copia e cola estático (Manual de Padrões para Iniciação do Pix, BR Code EMV-MPM).
    Sem valor (None), o app do banco pede o valor a quem paga."""
    conta = _emv('00', 'br.gov.bcb.pix') + _emv('01', chave or PIX['chave']) + (_emv('02', info) if info else '')
    p = (_emv('00', '01') + _emv('26', conta) + _emv('52', '0000') + _emv('53', '986')
         + (_emv('54', f'{valor:.2f}') if valor else '') + _emv('58', 'BR')
         + _emv('59', PIX['recebedor'][:25]) + _emv('60', PIX['cidade'][:15]) + _emv('62', _emv('05', tid)) + '6304')
    return p + _crc16(p)


def qr_svg(payload, rotulo):
    """QR Code em SVG puro (preto no branco, que é o que lê melhor impresso)."""
    q = segno.make(payload, error='m')
    svg = q.svg_inline(scale=1, border=2, dark='#000', light='#fff', omitsize=True)
    svg = svg.replace(' class="segno"', '')
    return svg.replace('<svg ', f'<svg role="img" aria-label="{rotulo}" class="cn-qr" preserveAspectRatio="xMidYMid meet" ', 1)


def pix_parcela(n, valor=CT['valor'], sem_valor=False):
    info = f'Parcela {n}/{CT["total_parc"]} {CT["numero"]}'
    return brcode(None if sem_valor else valor, txid(n), info)


if __name__ == '__main__':
    c = pix_parcela(4)
    print(c, len(c))
