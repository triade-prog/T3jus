# Dados fictícios da cobrança, em centavos. Hoje é 20/11/2026.
# Planos de exemplo (não há preço definido): Essencial R$ 290,00 até 3 pessoas; Escritório R$ 490,00 até 8;
# Banca R$ 890,00 até 15; pessoa a mais R$ 39,00. Fundador (arquivado) R$ 190,00 até 5.
# Cada fatura é emitida 20 dias antes do vencimento; a primeira, no dia em que a cobrança começa.
from comum_cb import *

PLANOS = {
    'Essencial': dict(preco=29000, pessoas=3, tom='var(--ambar)', esc=['Aroeira Sociedade de Advogados', 'Buriti &amp; Lago Advogados']),
    'Escritório': dict(preco=49000, pessoas=8, tom='var(--vinho-2)', esc=['Cedro &amp; Lima Advocacia', 'Pequi Advocacia']),
    'Banca': dict(preco=89000, pessoas=15, tom='var(--vinho)', esc=['Vale &amp; Sena Advogados', 'Ingá Advocacia Empresarial']),
}
PESSOA_A_MAIS = 3900

CNPJ_CEDRO = '22.914.870/0001-09'
CNPJ_BACURI = cnpj('318640270001')
CNPJ_MANGABA = cnpj('276031590001')

# Fatura principal: Cedro & Lima, dezembro de 2026 (a primeira), plano Escritório, 9 pessoas, desconto de 20% por 3 faturas.
CEDRO_ITENS = [(49000, 'Mensalidade do plano Escritório', 'dezembro de 2026 · até 8 pessoas · todas as áreas do Portal', ''),
               (3900, 'Pessoa a mais', '1 × R$ 39,00 · 9 pessoas ativas no dia da emissão (18/11/2026); o plano inclui 8', ''),
               (-9800, 'Desconto de 20% na mensalidade', '1ª de 3 faturas, até fevereiro de 2027 · lançado por Carol Andrade',
                'Combinado na proposta de 30/10/2026: desconto de implantação nos 3 primeiros meses.')]
CEDRO_TOTAL = sum(i[0] for i in CEDRO_ITENS)
assert CEDRO_TOTAL == 43100

# Situações: (classe do selo, ícone, texto)
def selo_sit(sit, dias=None, quando=''):
    if sit == 'atraso':
        cls = 'selo-urgente' if dias >= 30 else 'selo-atencao'
        ic = 'alerta' if dias >= 30 else 'relogio'
        return f'<span class="selo {cls}">{ico(ic)}Em atraso · {dias} dias</span>'
    if sit == 'hoje':
        return f'<span class="selo selo-atencao">{ico("relogio")}Vence hoje</span>'
    if sit == 'avencer':
        return f'<span class="selo selo-ok">{ico("agenda")}A vencer</span>'
    if sit == 'paga':
        return f'<span class="selo selo-paga">{ico("check")}Paga</span>'
    if sit == 'cancelada':
        return f'<span class="selo selo-cancelada">{ico("x")}Cancelada</span>'
    raise ValueError(sit)


LINK_CEDRO_FICHA = 'ficha.html?aba=assinatura&amp;estado=cb-em-dia'
LINK_BACURI_FICHA = 'ficha.html?aba=assinatura&amp;estado=cb-atraso'
LINK_MANGABA_FICHA = 'ficha.html?aba=assinatura&amp;estado=cb-encerrado'

# Lista de faturas de todos os escritórios (filtro "Todas", 12 de 20)
FATURAS = [
    dict(esc='Mangaba Advocacia', cid='Natal, RN · contrato encerrado', href=LINK_MANGABA_FICHA, comp='julho/2026', valor=29000, venc='10/07/2026', sit='atraso', dias=133, forma='Boleto', fat='#', lembrete='15 dias, em 25/07 · depois, só manual'),
    dict(esc='Bacuri Advocacia Trabalhista', cid='Belém, PA', href=LINK_BACURI_FICHA, comp='outubro/2026', valor=19000, venc='10/10/2026', sit='atraso', dias=41, forma='Boleto', fat='cobranca.html?aba=fatura&amp;estado=atraso', lembrete='Manual, em 12/11, por Marta Quintela'),
    dict(esc='Vale &amp; Sena Advogados', cid='Curitiba, PR', href='#', comp='novembro/2026', valor=96800, venc='10/11/2026', sit='atraso', dias=10, forma='Pix', fat='#', lembrete='7 dias, em 17/11 · aviso no Portal'),
    dict(esc='Bacuri Advocacia Trabalhista', cid='Belém, PA', href=LINK_BACURI_FICHA, comp='novembro/2026', valor=19000, venc='10/11/2026', sit='atraso', dias=10, forma='Boleto', fat='#', lembrete='7 dias, em 17/11 · aviso no Portal'),
    dict(esc='Aroeira Sociedade de Advogados', cid='Belo Horizonte, MG', href='#', comp='novembro/2026', valor=29000, venc='15/11/2026', sit='atraso', dias=5, forma='Boleto', fat='#', lembrete='3 dias, em 18/11'),
    dict(esc='Buriti &amp; Lago Advogados', cid='São Luís, MA', href='#', comp='novembro/2026', valor=29000, venc='20/11/2026', sit='hoje', forma='Pix', fat='#'),
    dict(esc='Pequi Advocacia', cid='Cuiabá, MT', href='#', comp='dezembro/2026', valor=49000, venc='05/12/2026', sit='avencer', forma='Pix', fat='#', quando='em 15 dias'),
    dict(esc='Cedro &amp; Lima Advocacia', cid='Recife, PE', href=LINK_CEDRO_FICHA, comp='dezembro/2026', valor=CEDRO_TOTAL, venc='10/12/2026', sit='avencer', forma='Pix', fat='cobranca.html?aba=fatura&amp;estado=ver', quando='em 20 dias'),
    dict(esc='Vale &amp; Sena Advogados', cid='Curitiba, PR', href='#', comp='dezembro/2026', valor=96800, venc='10/12/2026', sit='avencer', forma='Pix', fat='#', quando='em 20 dias'),
    dict(esc='Bacuri Advocacia Trabalhista', cid='Belém, PA', href=LINK_BACURI_FICHA, comp='dezembro/2026', valor=19000, venc='10/12/2026', sit='avencer', forma='Boleto', fat='#', quando='em 20 dias'),
    dict(esc='Ingá Advocacia Empresarial', cid='Florianópolis, SC', href='#', comp='novembro/2026', valor=89000, venc='25/11/2026', sit='paga', forma='Boleto', fat='#', quando='em 18/11'),
    dict(esc='Pequi Advocacia', cid='Cuiabá, MT', href='#', comp='novembro/2026', valor=49000, venc='05/11/2026', sit='paga', forma='Pix', fat='#', quando='em 04/11'),
]
# Conferência dos números do resumo (centavos)
_venc_nov = [f for f in FATURAS if f['venc'].endswith('/11/2026')]
RECEBIDO_NOV = sum(f['valor'] for f in _venc_nov if f['sit'] == 'paga')
A_RECEBER_NOV = sum(f['valor'] for f in _venc_nov if f['sit'] in ('atraso', 'hoje', 'avencer'))
EM_ATRASO = sum(f['valor'] for f in FATURAS if f['sit'] == 'atraso')
assert (RECEBIDO_NOV, A_RECEBER_NOV, EM_ATRASO) == (138000, 173800, 192800), (RECEBIDO_NOV, A_RECEBER_NOV, EM_ATRASO)
IDADE = [('até 30 dias', sum(f['valor'] for f in FATURAS if f['sit'] == 'atraso' and f['dias'] <= 30), 3, 'var(--vinho)'),
         ('31 a 60 dias', sum(f['valor'] for f in FATURAS if f['sit'] == 'atraso' and 30 < f['dias'] <= 60), 1, 'var(--vinho-2)'),
         ('61 a 90 dias', 0, 0, 'var(--vinho-3)'),
         ('mais de 90', sum(f['valor'] for f in FATURAS if f['sit'] == 'atraso' and f['dias'] > 90), 1, 'var(--vinho-4)')]
assert sum(x[1] for x in IDADE) == EM_ATRASO

FORMA_ICO = {'Pix': 'qr', 'Boleto': 'barras'}


def sit_cell(f):
    s = selo_sit(f['sit'], f.get('dias'))
    sub = {'atraso': f'venceu em {f["venc"]}', 'hoje': 'lembrete do dia enviado às 08h00', 'avencer': f.get('quando', ''),
           'paga': f'paga {f.get("quando", "")}', 'cancelada': f.get('quando', '')}[f['sit']]
    return f'<div class="cb-sit">{s}<small>{sub}</small></div>'


def linha_fatura(f, col_extra='forma'):
    nome = f'<a href="{f["href"]}">{f["esc"]}</a>' if f['href'] != '#' else f'<a href="#">{f["esc"]}</a>'
    extra = (f'<span class="cb-forma">{ico(FORMA_ICO[f["forma"]])}{f["forma"]}</span>' if col_extra == 'forma'
             else f'<span class="cb-peq">{f.get("lembrete", "")}</span>')
    rot = f'Abrir a fatura de {f["comp"]} de {f["esc"].replace("&amp;", "e")}'
    return (f'<tr><td><div class="cb-esc">{nome}<small>{f["cid"]}</small></div></td><td>{f["comp"]}</td>'
            f'<td class="cb-valor">{brl(f["valor"])}</td><td class="num">{f["venc"]}</td><td>{sit_cell(f)}</td><td>{extra}</td>'
            f'<td><a class="cb-ir" href="{f["fat"]}" aria-label="{rot}">{ico("dir")}</a></td></tr>')


def cartao_fatura(f, col_extra='forma'):
    rot = f'{f["esc"]}'
    extra = (f'<dt>Forma</dt><dd>{f["forma"]}</dd>' if col_extra == 'forma' else f'<dt>Último lembrete</dt><dd>{f.get("lembrete", "")}</dd>')
    return (f'<li class="cb-cartao"><div class="cb-c-topo"><div><a class="cb-c-nome" href="{f["fat"]}">{rot}<span class="sr">, fatura de {f["comp"]}</span></a><small>{f["cid"]}</small></div>'
            f'<span class="cb-c-valor">{brl(f["valor"])}</span></div>{sit_cell(f)}'
            f'<dl><dt>Competência</dt><dd>{f["comp"]}</dd><dt>Vencimento</dt><dd>{f["venc"]}</dd>{extra}</dl></li>')


def tabela_faturas(fs, col_extra='forma', legenda='Faturas'):
    cab_extra = 'Forma' if col_extra == 'forma' else 'Último lembrete'
    w = ('<colgroup><col style="width:26%"><col style="width:12%"><col style="width:12%"><col style="width:11%"><col style="width:19%">'
         f'<col style="width:{"10" if col_extra == "forma" else "16"}%"><col style="width:64px"></colgroup>')
    return (f'<table class="cb-tab so-pc"><caption class="sr">{legenda}</caption>{w}<thead><tr><th scope="col">Escritório</th><th scope="col">Competência</th>'
            f'<th scope="col" class="cb-valor">Valor</th><th scope="col">Vencimento</th><th scope="col">Situação</th><th scope="col">{cab_extra}</th>'
            f'<th scope="col"><span class="sr">Abrir</span></th></tr></thead><tbody>{"".join(linha_fatura(f, col_extra) for f in fs)}</tbody></table>'
            f'<ul class="cb-cartoes so-cel" aria-label="{legenda}">{"".join(cartao_fatura(f, col_extra) for f in fs)}</ul>')


# Faturas de um escritório (ficha e Portal): sem a coluna do escritório
def tabela_esc(linhas, legenda, acoes=True):
    """linhas: (comp, valor, venc, sit, dias, sub, href, acoes_html)"""
    tb = ''
    cards = ''
    for comp, valor, venc, sit, dias, sub, href, ac in linhas:
        s = f'<div class="cb-sit">{selo_sit(sit, dias)}<small>{sub}</small></div>'
        acao = ac if ac else (f'<a class="cb-ir" href="{href}" aria-label="Abrir a fatura de {comp}">{ico("dir")}</a>' if href else '')
        tb += (f'<tr><td><strong style="font-weight:500">{comp}</strong></td><td class="cb-valor">{brl(valor)}</td><td class="num">{venc}</td>'
               f'<td>{s}</td><td><div class="cb-acoes-linha">{acao}</div></td></tr>')
        cards += (f'<li class="cb-cartao"><div class="cb-c-topo"><div><strong class="cb-c-nome">{comp}</strong><small>vence em {venc}</small></div><span class="cb-c-valor">{brl(valor)}</span></div>'
                  f'{s}' + (f'<div class="cb-c-acoes">{ac.replace("btn-compacto", "")}</div>' if ac else (f'<div class="cb-c-acoes"><a class="btn btn-sec" href="{href}">{ico("fatura")}Abrir a fatura<span class="sr"> de {comp}</span></a></div>' if href else '')) + '</li>')
    larg = '200px' if acoes else '64px'
    return (f'<table class="cb-tab so-pc"><caption class="sr">{legenda}</caption><colgroup><col><col style="width:120px"><col style="width:116px"><col style="width:190px"><col style="width:{larg}"></colgroup>'
            '<thead><tr><th scope="col">Competência</th><th scope="col" class="cb-valor">Valor</th><th scope="col">Vencimento</th><th scope="col">Situação</th>'
            f'<th scope="col"><span class="sr">Ações</span></th></tr></thead><tbody>{tb}</tbody></table><ul class="cb-cartoes so-cel" aria-label="{legenda}">{cards}</ul>')


PIX_EX = '00020126580014br.gov.bcb.pix0136exemplo-0000-0000-0000-t3jus-exemplo5204000053039865406{v}5802BR5913T3JUS EXEMPLO6006RECIFE62070503***6304ABCD'
BOLETO_EX = '00190.00009 03026.018700 00000.000000 9 1234000{v:07d}'


def como_pagar(valor, id_='cp', titulo_h='h3'):
    v = f'{valor // 100}.{valor % 100:02d}'
    pix = PIX_EX.format(v=v)
    return (f'<div class="cb-pagar"><div class="cb-qr" role="img" aria-label="Lugar do QR do Pix (exemplo)">{ico("qr")}<span>QR do Pix<br>(exemplo)</span></div>'
            f'<div class="cb-meio"><{titulo_h} id="{id_}-pix">{ico("qr")}Pix copia e cola</{titulo_h}>'
            f'<div class="cb-codigo"><code aria-describedby="{id_}-pix">{pix}</code><button class="btn btn-fantasma btn-compacto" type="button" aria-label="Copiar o código Pix">{ico("copiar", "ico ico-s")}Copiar</button></div>'
            f'<p class="cb-peq">Vale até o vencimento. Pago por Pix, a fatura fica paga na hora.</p></div>'
            f'<div class="cb-sep-meio" aria-hidden="true"></div>'
            f'<div class="cb-meio cb-meio-boleto"><{titulo_h} id="{id_}-bol">{ico("barras")}Boleto</{titulo_h}>'
            f'<div class="cb-codigo"><code aria-describedby="{id_}-bol">{BOLETO_EX.format(v=valor)}</code><button class="btn btn-fantasma btn-compacto" type="button" aria-label="Copiar a linha do boleto">{ico("copiar", "ico ico-s")}Copiar</button></div>'
            f'<p class="cb-peq">Pago por boleto, a baixa leva até 1 dia útil. <a href="#">Baixar o boleto (PDF)</a></p></div></div>')
