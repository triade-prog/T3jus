# D41 · CO-10 no carnê: o desconto de entrada só nas parcelas do prazo. Dados e contas, em centavos.
# Preços de exemplo da revisão de preços (t3jus/precos/revisao.md, item 1): Essencial R$ 299,00 até 3 pessoas,
# Escritório R$ 499,00 até 6, Banca R$ 749,00 até 10, pessoa a mais R$ 69,00. Hoje: 27/11/2026.
# A conta de cada parcela é a mesma do Pix e do boleto (plano-v2, 1.1): mensalidade + pessoas a mais − desconto,
# com o desconto só até a competência "até" e calculado só sobre a mensalidade, round(preço × pct / 100).
# faixas() e texto_faixas() são o desenho de carne_faixas (servidor) e de textoFaixas (domínio): uma regra só para
# o Console, o Portal e o PDF.

HOJE = '27/11/2026'
PRECO = {'Essencial': 29900, 'Escritório': 49900, 'Banca': 74900}
INCLUI = {'Essencial': 3, 'Escritório': 6, 'Banca': 10}
PESSOA_A_MAIS = 6900

MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']


def brl(c):
    neg = c < 0
    r, cent = divmod(abs(int(c)), 100)
    return ('− ' if neg else '') + f'R$ {r:,}'.replace(',', '.') + f',{cent:02d}'


def soma(am, k):
    a, m = am
    t = a * 12 + (m - 1) + k
    return (t // 12, t % 12 + 1)


def mes(am):
    return f'{MESES[am[1] - 1]} de {am[0]}'


def curto(am):
    return f'{CURTOS[am[1] - 1]}/{am[0]}'


def desconto(preco, pct):
    """round(preço × pct / 100.0) do servidor, sem ponto flutuante (meio para cima, como o round do Postgres)."""
    return (preco * pct + 50) // 100


assert desconto(49900, 20) == 9980 and desconto(49900, 30) == 14970 and desconto(74900, 20) == 14980


def carne(inicio, dia, preco, pct=0, ate=None, mais=0, n=12, pular=()):
    """As N parcelas a partir de `inicio` (aaaa, mm), pulando as competências de `pular` (já têm fatura não cancelada).
    Cada parcela: n, am, venc, mens, pam (pessoas a mais em centavos), desc, valor."""
    ps, am, k = [], inicio, 0
    while len(ps) < n:
        if am not in pular:
            d = desconto(preco, pct) if (pct and (ate is None or am <= ate)) else 0
            pam = mais * PESSOA_A_MAIS
            ps.append(dict(n=len(ps) + 1, am=am, venc=f'{dia:02d}/{am[1]:02d}/{am[0]}', mens=preco, pam=pam, desc=d,
                           valor=preco + pam - d, sit='avencer', nota=''))
        am = soma(am, 1)
        k += 1
    return ps


def faixas(ps):
    """Parcelas seguidas de mesmo valor, de todas as parcelas do carnê como ele nasceu."""
    fx = []
    for p in ps:
        if fx and fx[-1]['valor'] == p['valor']:
            fx[-1]['ate'] = p
            fx[-1]['q'] += 1
        else:
            fx.append(dict(de=p, ate=p, q=1, valor=p['valor'], desc=p['desc']))
    return fx


def total(ps):
    return sum(p['valor'] for p in ps)


def texto_faixas(fx, x=False):
    """'3 parcelas de R$ 399,20 e 9 de R$ 499,00'; com um valor só, '12 parcelas de R$ 499,00'.
    x=True: '3 × R$ 399,20 e 9 × R$ 499,00' (PDF e comparação Hoje → Novo)."""
    if x:
        partes = [f'{f["q"]} × {brl(f["valor"])}' for f in fx]
    else:
        partes = []
        for i, f in enumerate(fx):
            if i == 0:
                partes.append(f'{f["q"]} parcela{"s" if f["q"] > 1 else ""} de {brl(f["valor"])}')
            else:
                partes.append(f'{f["q"]} de {brl(f["valor"])}')
    if len(partes) == 1:
        return partes[0]
    return ', '.join(partes[:-1]) + ' e ' + partes[-1]


def periodo(ps):
    a, b = ps[0]['am'], ps[-1]['am']
    if a[0] == b[0]:
        return f'{MESES[a[1] - 1]} a {mes(b)}'
    return f'{mes(a)} a {mes(b)}'


def nome_carne(ps):
    a, b = ps[0]['am'][0], ps[-1]['am'][0]
    return f'{a}' if a == b else f'{a}/{b}'


# ---------------------------------------------------------------- os exemplos
ESC = 'Escritório'
P = PRECO[ESC]

# Jatobá Advocacia (Console): escritório novo, 20% até a fatura de fevereiro de 2027, 6 pessoas, todo dia 10.
# Assinatura preparada na implantação em 04/11/2026 "até a fatura de janeiro de 2027" (3 meses); passou para Ativo em
# 18/11/2026, a 1ª fatura é dezembro e o servidor ajustou o desconto para até fevereiro (plano-v2, 1.3).
MOT_NOVO = 'Desconto de entrada para escritório novo no T3jus, nas 3 primeiras faturas.'
MOT_OUTRO = 'Desconto de entrada: vem de outro sistema.'
JAT = carne((2026, 12), 10, P, 20, (2027, 2))
assert [p['valor'] for p in JAT[:4]] == [39920, 39920, 39920, 49900] and total(JAT) == 568860
JAT[0].update(sit='proxima', nota='fatura emitida')

# Estado 2 · Umbu Advocacia: dezembro pago por Pix com o desconto; o carnê nasce em 25/11 a partir de janeiro.
UMB = carne((2027, 1), 10, P, 20, (2027, 2))
assert texto_faixas(faixas(UMB)) == '2 parcelas de R$ 399,20 e 10 de R$ 499,00' and total(UMB) == 578840

# Estado 3 · Cajá Advocacia: carnê 2026/2027 com 20% até fevereiro; dezembro pago, fevereiro pago adiantado;
# em 27/11 o dia muda de 10 para 20 e o carnê novo pula fevereiro (plano-v2, 1.6).
CAJA_ANT = carne((2026, 12), 10, P, 20, (2027, 2))
CAJA_NOVO = carne((2027, 1), 20, P, 20, (2027, 2), pular={(2027, 2)})
assert [curto(p['am']) for p in CAJA_NOVO][:3] == ['jan/2027', 'mar/2027', 'abr/2027'] and CAJA_NOVO[-1]['am'] == (2028, 1)
assert texto_faixas(faixas(CAJA_NOVO)) == '1 parcela de R$ 399,20 e 11 de R$ 499,00' and total(CAJA_NOVO) == 588820

# Estados 5, 5b e 10 · Jatobá: o desconto passa de 20% para 30% (vem de outro sistema), até fevereiro. Dezembro já tem fatura.
JAT30 = carne((2027, 1), 10, P, 30, (2027, 2))
assert texto_faixas(faixas(JAT30), True) == '2 × R$ 349,30 e 10 × R$ 499,00' and total(JAT30) == 568860
# Estado 6 · a mesma troca, com 7 pessoas desde 25/11 (1 a mais)
JAT30P = carne((2027, 1), 10, P, 30, (2027, 2), mais=1)
assert texto_faixas(faixas(JAT30P), True) == '2 × R$ 418,30 e 10 × R$ 568,00' and total(JAT30P) == 651660
# Estados 7 e 8 · Jatobá com 7 pessoas desde 25/11 e o desconto de 20% de sempre: "Gerar novo carnê"
JATP = carne((2027, 1), 10, P, 20, (2027, 2), mais=1)
assert texto_faixas(faixas(JATP), True) == '2 × R$ 468,20 e 10 × R$ 568,00' and total(JATP) == 661640
# Estado 9 · Jatobá muda para o Banca: o desconto vale sobre o preço novo
JATB = carne((2027, 1), 10, PRECO['Banca'], 20, (2027, 2))
assert texto_faixas(faixas(JATB), True) == '2 × R$ 599,20 e 10 × R$ 749,00' and total(JATB) == 868840

# Estados 12 e 13 · Ribeiro & Matos (Portal): vem de outro sistema, 30% até fevereiro; parcela 1 paga em 25/11.
RIB = carne((2026, 12), 10, P, 30, (2027, 2))
assert texto_faixas(faixas(RIB)) == '3 parcelas de R$ 349,30 e 9 de R$ 499,00' and total(RIB) == 553890
RIB[0].update(sit='paga', nota='em 25/11')
RIB[1].update(sit='proxima', nota='fatura em 21/12')
# Estado 13 · 7 pessoas desde 25/11: o T3jus gera o carnê 2027 em 27/11
RIBP = carne((2027, 1), 10, P, 30, (2027, 2), mais=1)
assert texto_faixas(faixas(RIBP)) == '2 parcelas de R$ 418,30 e 10 de R$ 568,00' and total(RIBP) == 651660

# Conferência dos números que o plano pede (plano-v2, 1.2, com a pessoa a mais de R$ 69,00)
assert P - desconto(P, 20) == 39920 and P - desconto(P, 30) == 34930
assert total(carne((2026, 12), 10, P, 30, (2027, 2))) == 553890
assert total(carne((2026, 12), 10, P, 20, (2027, 2), mais=1)) == 3 * 46820 + 9 * 56800
assert total(carne((2026, 12), 10, P)) == 598800
