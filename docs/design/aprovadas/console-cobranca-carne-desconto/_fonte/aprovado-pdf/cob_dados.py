# Dados da cobrança do T3jus aos escritórios (CO-06, F1.21): faturas, recibos e carnê, para os três PDFs A4.
# Tudo fictício e igual ao desenho aprovado da cobrança (docs/design/aprovadas/console-cobranca), com "hoje" em 20/11/2026.
# Dinheiro em centavos. Meio de pagamento escolhido pela Carol em 22/11/2026: Inter Empresas, boleto com Pix.
# O Pix é um BR Code de verdade (EMV com CRC16) com chave de EXEMPLO; o boleto tem linha digitável e código de barras
# (Interleaved 2 of 5) com os dígitos verificadores certos, com o código do Banco Inter (077), tudo de EXEMPLO.
# Sem nota fiscal por agora (decisão de 22/11/2026).
# O QR sai de verdade (escaneável) com a biblioteca segno; o gerar.sh instala numa pasta temporária.
import os, sys, datetime

if os.environ.get('PYLIBS'):
    sys.path.insert(0, os.environ['PYLIBS'])
import segno

HOJE = '20/11/2026'

# ---------- o T3jus como emissor: AINDA NÃO DECIDIDO (marcadores) ----------
T3 = dict(
    razao='Razão social do T3jus',      # a definir
    cnpj='CNPJ do T3jus',               # a definir
    endereco='Endereço do T3jus',       # a definir
    atendimento='atendimento@exemplo.com.br',   # contato provisório
    remetente='cobranca@exemplo.com.br',        # remetente provisório
)
# Pix e boleto de EXEMPLO (o meio de pagamento não foi escolhido): os mesmos rótulos das telas aprovadas
PIX = dict(chave='exemplo-0000-0000-0000-t3jus-exemplo', recebedor='T3JUS EXEMPLO', cidade='RECIFE')
BANCO = '077'   # Banco Inter; os códigos de verdade vêm da API do Inter Empresas

# ---------- escritórios (do desenho aprovado) ----------
CEDRO = dict(nome='Cedro &amp; Lima Advocacia', cnpj='22.914.870/0001-09', end='Rua da Aurora, 295, sala 1102 · Boa Vista<br>Recife, PE · CEP 50050-000', email='financeiro@cedrolima.exemplo.com.br',
             copia='Renata Lima', copia_papel='sócia dona')
BACURI = dict(nome='Bacuri Advocacia Trabalhista', cnpj='31.864.027/0001-56', end='Travessa Rui Barbosa, 88, sala 4 · Reduto<br>Belém, PA · CEP 66053-260', email='luiza@bacuri.exemplo.com.br',
              copia='Luíza Farias', copia_papel='sócia dona')
PEQUI = dict(nome='Pequi Advocacia', cnpj='40.721.536/0001-10', end='Rua T-37, 1200, sala 305 · Setor Bueno<br>Goiânia, GO · CEP 74230-020', email='financeiro@pequi.exemplo.com.br',
             copia='Helena Araújo', copia_papel='sócia dona')
RIBEIRO = dict(nome='Ribeiro &amp; Matos Sociedade de Advogados', cnpj='41.276.839/0001-34', end='Rua Cardeal Arcoverde, 1749, sala 92 · Pinheiros<br>São Paulo, SP · CEP 05407-002', email='marina@ribeiromatos.exemplo.com.br',
               copia='Marina Ribeiro', copia_papel='sócia dona')

PESSOA_A_MAIS = 3900

# Itens: (descrição, detalhe, centavos, motivo)
ITENS_CEDRO = [
    ('Mensalidade do plano Escritório', 'dezembro de 2026 · até 8 pessoas · todas as áreas do Portal', 49000, None),
    ('Pessoa a mais', '1 × R$ 39,00 · 9 pessoas ativas no dia da emissão (18/11/2026); o plano inclui 8', 3900, None),
    ('Desconto de 20% na mensalidade', '1ª de 3 faturas, até fevereiro de 2027', -9800,
     'Combinado na proposta de 30/10/2026: desconto de implantação nos 3 primeiros meses.'),
]
assert sum(i[2] for i in ITENS_CEDRO) == 43100

FATURAS = {
    'cedro': dict(esc=CEDRO, numero='2026/0187', comp='dezembro de 2026', comp_curta='dezembro/2026', plano='Escritório',
                  emitida='18/11/2026', venc='10/12/2026', venc_iso=(2026, 12, 10), itens=ITENS_CEDRO, forma='Boleto com Pix'),
    'bacuri': dict(esc=BACURI, numero='2026/0121', comp='outubro de 2026', comp_curta='outubro/2026', plano='Fundador',
                   emitida='20/09/2026', venc='10/10/2026', venc_iso=(2026, 11, 27),   # boleto da 2ª via vence em 27/11
                   itens=[('Mensalidade do plano Fundador', 'outubro de 2026 · até 5 pessoas · preço de quando assinou (plano arquivado em 01/10/2026)', 19000, None)],
                   forma='Boleto com Pix'),
    'pequi': dict(esc=PEQUI, numero='2026/0179', comp='dezembro de 2026', comp_curta='dezembro/2026', plano='Escritório',
                  emitida='15/11/2026', venc='05/12/2026', venc_iso=(2026, 12, 5),
                  itens=[('Mensalidade do plano Escritório', 'dezembro de 2026 · até 8 pessoas · valor fixo do carnê, gerado em 15/09/2026', 49000, None)],
                  forma='Carnê · parcela 3 de 12', parcela=3),
}

# ---------- carnê 2026/2027 da Pequi: 12 × R$ 490,00, todo dia 5 ----------
MESES = ['outubro de 2026', 'novembro de 2026', 'dezembro de 2026', 'janeiro de 2027', 'fevereiro de 2027', 'março de 2027',
         'abril de 2027', 'maio de 2027', 'junho de 2027', 'julho de 2027', 'agosto de 2027', 'setembro de 2027']
MM = [(2026, 10), (2026, 11), (2026, 12), (2027, 1), (2027, 2), (2027, 3), (2027, 4), (2027, 5), (2027, 6), (2027, 7), (2027, 8), (2027, 9)]
CARNE = dict(numero='2026/2027', esc=PEQUI, plano='Escritório', valor=49000, dia=5, gerado='15/09/2026',
             periodo='outubro de 2026 a setembro de 2027', novo='2027', novo_valor=52900, novo_periodo='janeiro a dezembro de 2027',
             trocado_em='20/11/2026')
PARCELAS = [dict(n=i + 1, ref=MESES[i], venc=f'{CARNE["dia"]:02d}/{m:02d}/{a}', venc_iso=(a, m, CARNE['dia'])) for i, (a, m) in enumerate(MM)]
PAGAS_HOJE = {1: ('02/10/2026', 'Pix'), 2: ('04/11/2026', 'boleto')}

# ---------- recibos ----------
RECIBOS = {
    'ribeiro': dict(esc=RIBEIRO, numero='2026/0163', fatura='2026/0163', comp='novembro de 2026', venc='10/11/2026', plano='Escritório',
                    pago='09/11/2026', forma='Pix', forma_det='Pix do boleto da fatura, Banco Inter; baixa automática', valor=49000,
                    itens=[('Mensalidade do plano Escritório', 'novembro de 2026 · até 8 pessoas · 7 ativas no dia da emissão', 49000)]),
    'pequi': dict(esc=PEQUI, numero='2026/0148', fatura='2026/0148', comp='novembro de 2026', venc='05/11/2026', plano='Escritório',
                  pago='04/11/2026', forma='Boleto', forma_det='boleto da parcela 2 do carnê, Banco Inter; baixa automática', valor=49000, parcela=2,
                  itens=[('Mensalidade do plano Escritório', 'novembro de 2026 · parcela 2 de 12 do carnê 2026/2027', 49000)]),
    'cedro': dict(esc=CEDRO, numero='2026/0187', fatura='2026/0187', comp='dezembro de 2026', venc='10/12/2026', plano='Escritório',
                  pago='20/11/2026', forma='Pix fora da cobrança', forma_det='registrado à mão, com comprovante', valor=43100,
                  manual=dict(quem='Carol Andrade', hora='15h02', quando='20/11/2026'),
                  itens=[(d, x, v) for d, x, v, _ in ITENS_CEDRO]),
}


# ---------- dinheiro e extenso ----------
def R(c):
    s = f'{abs(c) / 100:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
    return ('−\u00a0' if c < 0 else '') + f'R$\u00a0{s}'


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
    return ' '.join(p)


def extenso(c):
    r, cc = divmod(c, 100)
    partes = []
    if r:
        partes.append(_inteiro(r) + (' real' if r == 1 else ' reais'))
    if cc:
        partes.append(_inteiro(cc) + (' centavo' if cc == 1 else ' centavos'))
    return ' e '.join(partes) if partes else 'zero real'


# ---------- Pix (BR Code EMV-MPM, com CRC16) ----------
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


def brcode(centavos, txid, info=None):
    conta = _emv('00', 'br.gov.bcb.pix') + _emv('01', PIX['chave']) + (_emv('02', info) if info else '')
    p = (_emv('00', '01') + _emv('26', conta) + _emv('52', '0000') + _emv('53', '986') + _emv('54', f'{centavos / 100:.2f}')
         + _emv('58', 'BR') + _emv('59', PIX['recebedor']) + _emv('60', PIX['cidade']) + _emv('62', _emv('05', txid)) + '6304')
    return p + _crc16(p)


def qr_svg(payload, rotulo, cls='qr'):
    q = segno.make(payload, error='m')
    svg = q.svg_inline(scale=1, border=2, dark='#000', light='#fff', omitsize=True).replace(' class="segno"', '')
    return svg.replace('<svg ', f'<svg role="img" aria-label="{rotulo}" class="{cls}" preserveAspectRatio="xMidYMid meet" ', 1)


# ---------- boleto (Febraban: código de barras de 44 posições, linha digitável de 47) ----------
def _mod10(s):
    t, p = 0, 2
    for ch in reversed(s):
        v = int(ch) * p
        t += v // 10 + v % 10
        p = 1 if p == 2 else 2
    return (10 - t % 10) % 10


def _mod11(s):
    t, p = 0, 2
    for ch in reversed(s):
        t += int(ch) * p
        p = 2 if p == 9 else p + 1
    d = 11 - t % 11
    return 1 if d in (0, 10, 11) else d


def fator(a, m, d):
    """Fator de vencimento (regra nova: 22/02/2025 = 1000)."""
    return 1000 + (datetime.date(a, m, d) - datetime.date(2025, 2, 22)).days


def boleto(centavos, venc_iso, nosso):
    """Devolve (linha digitável formatada, 44 dígitos do código de barras)."""
    livre = nosso.zfill(25)
    sem_dv = f'{BANCO}9' + f'{fator(*venc_iso):04d}' + f'{centavos:010d}' + livre
    dv = _mod11(sem_dv)
    barras = sem_dv[:4] + str(dv) + sem_dv[4:]
    c1 = barras[0:4] + livre[0:5]
    c2 = livre[5:15]
    c3 = livre[15:25]
    c1 += str(_mod10(c1)); c2 += str(_mod10(c2)); c3 += str(_mod10(c3))
    linha = f'{c1[:5]}.{c1[5:]} {c2[:5]}.{c2[5:]} {c3[:5]}.{c3[5:]} {dv} {barras[5:9]}{barras[9:19]}'
    assert len(barras) == 44
    return linha, barras


_ITF = {'0': 'nnwwn', '1': 'wnnnw', '2': 'nwnnw', '3': 'wwnnn', '4': 'nnwnw', '5': 'wnwnn', '6': 'nwwnn', '7': 'nnnww', '8': 'wnnwn', '9': 'nwnwn'}


def barras_svg(dig, rotulo):
    """Interleaved 2 of 5, razão 1:3, como o boleto bancário. Preto no branco."""
    seq = [('b', 1), ('s', 1), ('b', 1), ('s', 1)]
    for i in range(0, len(dig), 2):
        a, b = _ITF[dig[i]], _ITF[dig[i + 1]]
        for x, y in zip(a, b):
            seq += [('b', 3 if x == 'w' else 1), ('s', 3 if y == 'w' else 1)]
    seq += [('b', 3), ('s', 1), ('b', 1)]
    x, rects = 0, []
    for k, w in seq:
        if k == 'b':
            rects.append(f'<rect x="{x}" y="0" width="{w}" height="50"/>')
        x += w
    return (f'<svg class="barras" viewBox="0 0 {x} 50" preserveAspectRatio="none" role="img" aria-label="{rotulo}">'
            f'<g fill="#000" shape-rendering="crispEdges">{"".join(rects)}</g></svg>')


def codigos_fatura(chave):
    """Pix e boleto de uma fatura (exemplo)."""
    f = FATURAS[chave]
    total = sum(i[2] for i in f['itens'])
    if chave == 'pequi':
        return codigos_parcela(3)
    num = f['numero'].replace('/', '')
    pix = brcode(total, f'F{num}', f'Fatura {f["numero"]} T3jus')
    linha, barras = boleto(total, f['venc_iso'], num + '01')
    return pix, linha, barras


def codigos_parcela(n, valor=CARNE['valor']):
    pix = brcode(valor, f'C20262027P{n:02d}', f'Carne 2026/2027 parcela {n}/12')
    p = PARCELAS[n - 1]
    linha, barras = boleto(valor, p['venc_iso'], f'2026202700{n:02d}')
    return pix, linha, barras


if __name__ == '__main__':
    for k in FATURAS:
        print(k, codigos_fatura(k))
    print(extenso(43100), '|', extenso(49000), '|', extenso(588000))
    print(fator(2026, 12, 10))
