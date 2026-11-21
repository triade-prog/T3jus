# Dados fictícios dos Relatórios do sócio. Mesmos clientes, contratos e valores do Financeiro aprovado.
# Tudo é calculado daqui: as somas por cliente, por área e por responsável fecham com o Entrou do período.
# Período padrão: últimos 3 meses (01/09 a 18/11/2026), comparado com junho a agosto de 2026.

AREAS_ORDEM = ['Sem caso ligado', 'Cível', 'Previdenciário', 'Trabalhista', 'Saúde', 'Tributário', 'Consumidor', 'Família']
RESP_ORDEM = ['Marina Ribeiro', 'Felipe Matos', 'Diego Almeida', 'Larissa Costa', 'Gustavo Lima']
MESES = ['set', 'out', 'nov']


def C(cli, contrato, caso, area, resp, ent, contratado, vencido=0.0, a_vencer=0.0, adiant=0.0, rpv=None, encerrado=None, dias_venc=None):
    return dict(cli=cli, contrato=contrato, caso=caso, area=area, resp=resp, ent=dict(zip(MESES, ent)), contratado=contratado,
                vencido=vencido, a_vencer=a_vencer, adiant=adiant, rpv=rpv, encerrado=encerrado, dias_venc=dias_venc)


VA, AT, CL, BL, GT, IC, EN = ('Construtora Vale Alto Ltda.', 'Construtora Atlas Ltda.', 'Clínica Santa Luzia Ltda.', 'Benedito Souza Lima',
                              'Gabriela Teixeira', 'Irene Castro', 'Eduardo Nascimento')
CONTRATOS = [
    C(VA, 'Assessoria mensal', None, 'Sem caso ligado', 'Felipe Matos', (3200, 3200, 0), 9600, vencido=3200, dias_venc=8),
    C(VA, 'Ação de cobrança', 'Vale Alto x Concreto Forte', 'Cível', 'Felipe Matos', (0, 2400, 0), 4800, a_vencer=4800),
    C(VA, 'Entrada e 20% do recuperado', 'Vale Alto x Prefeitura de Santo André', 'Tributário', 'Felipe Matos', (5650, 0, 0), 5650),
    C(AT, 'Assessoria mensal', None, 'Sem caso ligado', 'Felipe Matos', (4200, 4200, 4200), 12600),
    C(AT, 'Defesa cível', 'Souza x Construtora Atlas', 'Cível', 'Felipe Matos', (0, 2000, 2000), 4000, a_vencer=4000),
    C('Farmácia Bom Jesus Ltda.', 'Assessoria mensal', None, 'Sem caso ligado', 'Diego Almeida', (1800, 1800, 0), 5400, vencido=1800, dias_venc=3),
    C(CL, 'Assessoria mensal', None, 'Sem caso ligado', 'Diego Almeida', (2500, 2500, 2500), 7500),
    C(CL, 'Parecer sobre plantões', None, 'Sem caso ligado', 'Diego Almeida', (0, 3150, 0), 3150),
    C('Hélio Batista Corrêa', 'Ação revisional', 'Corrêa x Financeira Primavera', 'Cível', 'Diego Almeida', (850, 0, 0), 2550, vencido=850, a_vencer=2550,
      adiant=900, rpv=('Precatório', 21300, 'até dezembro de 2027'), dias_venc=24),
    C('Daniela Rocha Mendes', 'Reclamação trabalhista', 'Mendes x Rede Sabor', 'Trabalhista', 'Marina Ribeiro', (0, 0, 0), 1200, vencido=1200, a_vencer=3600,
      adiant=485, dias_venc=74),
    C(BL, 'Revisão de aposentadoria', 'Lima x INSS', 'Previdenciário', 'Marina Ribeiro', (0, 1450, 0), 2900, a_vencer=4350,
      rpv=('RPV', 6469.97, 'já chegou; passa ao escritório depois do repasse')),
    C(BL, 'Ação de indenização', 'Lima x Seguradora Norte', 'Cível', 'Gustavo Lima', (3500, 0, 1500), 5000, a_vencer=3000),
    C(GT, 'Ação de cobrança', 'Teixeira x Comercial Lima', 'Cível', 'Marina Ribeiro', (0, 0, 2100), 6100, a_vencer=4000),
    C(GT, 'Êxito e sucumbência', 'Teixeira x Lojas Brilho', 'Consumidor', 'Felipe Matos', (0, 0, 2866.40), 2866.40),
    C(IC, 'Aposentadoria por incapacidade', 'Castro x INSS', 'Previdenciário', 'Larissa Costa', (750, 0, 9273.60), 10023.60),
    C(IC, 'Consultoria previdenciária', None, 'Sem caso ligado', 'Larissa Costa', (0, 0, 0), 1100, a_vencer=3300),
    C('Antônia Ferreira Prado', 'Recurso administrativo (INSS)', 'Ferreira Prado x INSS', 'Previdenciário', 'Larissa Costa', (0, 0, 0), 960, a_vencer=1920),
    C(EN, 'Inventário', 'Inventário de Lúcia Nascimento', 'Família', 'Gustavo Lima', (700, 700, 0), 2100, a_vencer=700),
    C(EN, 'Consulta', None, 'Sem caso ligado', 'Marina Ribeiro', (0, 0, 0), 600, a_vencer=600),
    C(EN, 'Só êxito (30%)', 'Nascimento x INSS', 'Previdenciário', 'Larissa Costa', (0, 0, 0), 0, rpv=('RPV', 4860, 'estimada para janeiro de 2027')),
    C('João Pedro Alves', 'Só êxito (30%)', 'Alves x INSS', 'Previdenciário', 'Gustavo Lima', (12960, 0, 0), 12960, encerrado='set'),
    C('Padaria Pão Nobre ME', 'Só êxito (30%)', 'Pão Nobre x Lanchonete Central', 'Cível', 'Felipe Matos', (0, 14850, 0), 14850, encerrado='out'),
    C('Joana Pereira', 'Reclamação trabalhista', 'Pereira x Mercado Bom Preço', 'Trabalhista', 'Marina Ribeiro', (800, 800, 800), 2400),
    C('Carlos Henrique Dias', 'Reclamação trabalhista', 'Pereira x Mercado Bom Preço', 'Trabalhista', 'Marina Ribeiro', (800, 800, 800), 2400),
    C('Rita de Cássia Ferreira', 'Reclamação trabalhista', 'Ferreira x Banco Horizonte', 'Trabalhista', 'Marina Ribeiro', (1300, 1300, 1300), 3900, a_vencer=1300),
    C('Sérgio Oliveira', 'Ação de consumo', 'Oliveira x Banco Horizonte', 'Consumidor', 'Felipe Matos', (900, 900, 900), 2700, a_vencer=900),
    C('Roberto Andrade', 'Ação de saúde', 'Andrade x Unimed Paulistana', 'Saúde', 'Larissa Costa', (0, 5000, 3000), 8000),
]
INATIVOS = {'João Pedro Alves', 'Padaria Pão Nobre ME'}

for c in CONTRATOS:
    c['entrou'] = round(sum(c['ent'].values()), 2)
    c['falta'] = round(c['vencido'] + c['a_vencer'], 2)

# Mês a mês (o Caixa aprovado: set 39.910, out 45.050, nov 31.240 até hoje)
MES_TOTAL = {m: round(sum(c['ent'][m] for c in CONTRATOS), 2) for m in MESES}
assert MES_TOTAL == {'set': 39910, 'out': 45050, 'nov': 31240}, MES_TOTAL
ANTERIOR = [('Junho', 38400), ('Julho', 41250), ('Agosto', 42380)]  # agosto é o do Resumo aprovado
ENTROU = round(sum(MES_TOTAL.values()), 2)
ENTROU_ANT = sum(v for _, v in ANTERIOR)
PREV_NOV_FALTA = 17060  # previsto de novembro (48.300) menos o recebido (31.240)

FALTA = round(sum(c['falta'] for c in CONTRATOS), 2)
VENCIDO = round(sum(c['vencido'] for c in CONTRATOS), 2)
ADIANT = round(sum(c['adiant'] for c in CONTRATOS), 2)
RENDEU = round(ENTROU - ADIANT, 2)
RPV = [(c['cli'], c['caso'], *c['rpv']) for c in CONTRATOS if c['rpv']]
RPV_TOTAL = round(sum(r[3] for r in RPV), 2)
CONTRATADO = round(sum(c['contratado'] for c in CONTRATOS), 2)
FALTA_ANT, VENCIDO_ANT, RENDEU_ANT = 38940, 4280, 122030

assert ENTROU == 116200 and FALTA == 42070 and VENCIDO == 7050 and ADIANT == 1385 and RPV_TOTAL == 32629.97

# Vencido por idade (o mesmo do Resumo aprovado)
IDADE = [('Até 30 dias', '3 parcelas', 5850), ('31 a 60 dias', 'nenhuma', 0), ('61 a 90 dias', '1 parcela', 1200), ('Mais de 90', 'nenhuma', 0)]
assert sum(v for *_, v in IDADE) == VENCIDO
A_VENCER_NOV = 12060  # 8.000 em 7 dias + 4.060 até 30/11 (A receber aprovado)
A_VENCER_DEPOIS = round(FALTA - VENCIDO - A_VENCER_NOV, 2)


def agrupa(chave):
    g = {}
    for c in CONTRATOS:
        k = c[chave]
        d = g.setdefault(k, dict(entrou=0, contratado=0, falta=0, vencido=0, adiant=0, rpv=0, casos=set(), enc=set(), sem_caso=0, contratos=0, resp=set(), rpv_txt=[]))
        d['entrou'] += c['entrou']; d['contratado'] += c['contratado']; d['falta'] += c['falta']; d['vencido'] += c['vencido']; d['adiant'] += c['adiant']
        d['contratos'] += 1; d['resp'].add(c['resp'])
        if c['rpv']:
            d['rpv'] += c['rpv'][1]; d['rpv_txt'].append(c['rpv'])
        if c['caso']:
            d['casos'].add(c['caso'])
            if c['encerrado']:
                d['enc'].add(c['caso'])
        else:
            d['sem_caso'] += 1
    for d in g.values():
        for k in ('entrou', 'contratado', 'falta', 'vencido', 'adiant', 'rpv'):
            d[k] = round(d[k], 2)
        d['rendeu'] = round(d['entrou'] - d['adiant'], 2)
    return g


POR_CLIENTE = agrupa('cli')
POR_AREA = agrupa('area')
POR_RESP = agrupa('resp')
for g in (POR_CLIENTE, POR_AREA, POR_RESP):
    assert round(sum(d['entrou'] for d in g.values()), 2) == ENTROU
    assert round(sum(d['falta'] for d in g.values()), 2) == FALTA
    assert round(sum(d['rendeu'] for d in g.values()), 2) == RENDEU
CASOS = {c['caso'] for c in CONTRATOS if c['caso']}
assert sum(len(d['casos']) for d in POR_AREA.values()) == len(CASOS) == sum(len(d['casos']) for d in POR_RESP.values())

# Entrou por área em junho a agosto (soma 122.030,00)
AREA_ANT = {'Sem caso ligado': 38700, 'Cível': 31330, 'Previdenciário': 38200, 'Trabalhista': 9000, 'Saúde': 0, 'Tributário': 0, 'Consumidor': 2700, 'Família': 2100}
assert sum(AREA_ANT.values()) == ENTROU_ANT

# Terceiros no período: só passam pelo escritório. O saldo fecha com o do Caixa aprovado (R$ 30.284,96).
TERC = [  # (dia, cliente, o que, entrou, repassado, honorarios_transferidos, reembolso, ainda_na_conta, situação)
    ('22/09', 'João Pedro Alves', 'RPV', 43200, 30240, 12960, 0, 0, 'Repassado em 24/09'),
    ('14/10', 'Padaria Pão Nobre ME', 'Depósito de acordo', 49500, 34650, 14850, 0, 0, 'Repassado em 16/10'),
    ('04/11', VA, 'Alvará', 6300, 6300, 0, 0, 0, 'Repassado em 05/11'),
    ('12/11', IC, 'RPV', 38640, 25128, 9273.60, 420, 3818.40, 'Falta o parceiro e o perito'),
    ('16/11', GT, 'Depósito de acordo', 7000, 0, 2100, 0, 4900, 'Falta repassar à cliente'),
    ('17/11', BL, 'RPV', 21566.56, 0, 0, 0, 21566.56, 'Falta repassar ao cliente'),
]
for t in TERC:
    assert round(t[3] - t[4] - t[5] - t[6] - t[7], 2) == 0, t
T_ENTROU = round(sum(t[3] for t in TERC), 2)
T_REPASS = round(sum(t[4] for t in TERC), 2)
T_HON = round(sum(t[5] for t in TERC), 2)
T_REEMB = round(sum(t[6] for t in TERC), 2)
T_CONTA = round(sum(t[7] for t in TERC), 2)
assert T_CONTA == 30284.96
# Os honorários que vieram de terceiros já estão no Entrou (João Pedro, Padaria, Irene e Gabriela)
assert T_HON == round(12960 + 14850 + 9273.60 + 2100, 2)
