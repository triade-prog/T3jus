# D41 · Console › Cobrança › fatura da parcela (estado 11 e 11b) e Portal › Escritório › Plano e faturas (estados 12 e 13).
# Partem das telas aprovadas mais recentes (cobranca-pdfs/cobranca.html e portal-escritorio.html) e das peças dos
# geradores aprovados cobranca_cb.py e portal_cb.py. Uso: python3 d41_outras.py <pasta-saida>
import sys, os
from d41_base import *
import d41_ficha as FI

SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
C = carregar('cobranca_cb.py', "s = MOLDURA.replace('<!--CB-->', T)")
fat_cab, meta, itens, pagar_folha, historico, acoes_fat, para_quem, grade_c, tf, selo_sit = (
    C[k] for k in ('fat_cab', 'meta', 'itens', 'pagar_folha', 'historico', 'acoes_fat', 'para_quem', 'grade', 'tf', 'selo_sit'))

LINK_FICHA = 'ficha.html?aba=assinatura&amp;estado=cb-carne-desconto'


def faixa_parc(n, carne_nome, desde, texto_extra, href_ficha, pdf):
    return (f'<section class="cb-parcela-faixa" aria-labelledby="t-parc">{ico("carne")}<div><strong id="t-parc">Parcela {n} de 12 do carnê {carne_nome}</strong>'
            f'<p>O Pix e o boleto desta fatura são os mesmos da página {n} do carnê, que o escritório tem desde {desde}. {texto_extra}</p></div>'
            f'<div class="acoes"><a class="btn btn-sec" href="{pdf}">{ico("baixar")}Baixar o carnê (PDF)</a>'
            f'<a class="btn btn-sec" href="{href_ficha}">{ico("carne")}Ver o carnê</a></div></section>')


def para(link):
    return para_quem('financeiro@jatoba.adv.br', 'Beatriz Nogueira', FI.CNPJ_JAT, 'Carnê', link, 'Escritório').replace(
        '<dd>Carnê<small>o outro meio vai junto</small>', '<dd>Carnê<small>parcela 1 de 12 · Pix e boleto na página</small>').replace('Ver a assinatura', 'Ver a assinatura e o carnê')


# ---------------------------------------------------------------- 11. fatura-carne-desconto: Jatobá, dezembro, parcela 1 de 12
IT11 = [(49900, 'Mensalidade do plano Escritório', 'Parcela 1 de 12 do carnê 2026/2027 · plano Escritório · dezembro de 2026 · 6 pessoas no dia do carnê (18/11/2026); o plano inclui 6', ''),
        (-9980, 'Desconto de entrada (20% da mensalidade)', '1ª de 3 faturas, até fevereiro de 2027 · lançado por Carol Andrade', MOT_NOVO)]
assert sum(i[0] for i in IT11) == JAT[0]['valor']
CAB11 = fat_cab('2026/0203', 'dezembro de 2026', 'Jatobá Advocacia', selo_sit('avencer'), meta('Plano Escritório', 'Vence em 10/12/2026', 'Carnê · parcela 1 de 12'), 39920,
                '<p>Vence em <b>10/12/2026</b>, daqui a 13 dias. Emitida em 18/11/2026, com os códigos e os itens da página 1 do carnê.</p>')
H11 = [('18/11/2026', [
    ('16h21', 'O sistema', 'mandou a fatura por e-mail a <b>financeiro@jatoba.adv.br</b>', 'Com cópia para Beatriz Nogueira, sócia dona · junto com o carnê em PDF', '', 'sis', ''),
    ('16h21', 'O sistema', 'emitiu a fatura da parcela 1 do carnê 2026/2027', f'{brl(39920)} · vence em 10/12/2026 · com o desconto de entrada · os itens são os da parcela', '', 'sis', ''),
    ('16h21', 'O sistema', 'gerou o carnê 2026/2027', f'{texto_faixas(faixas(JAT))} · {periodo(JAT)} · todo dia 10', '', 'sis', ''),
    ('16h20', 'Carol Andrade', 'passou o cliente para <b>Ativo</b>: a cobrança começou', 'Plano Escritório · carnê · desconto de entrada de 20% até a fatura de fevereiro de 2027', '', 'forte', ''),
])]
FUT = '<b>Próximos lembretes da régua</b><ul><li>07/12/2026: “vence em 3 dias”</li><li>10/12/2026: “vence hoje”</li></ul>'
V11 = CAB11 + grade_c(faixa_parc(1, '2026/2027', '18/11/2026', 'As parcelas 1 a 3 têm o desconto de entrada; da 4 em diante, o valor é o cheio, R$ 499,00.', LINK_FICHA, 'carne-a4.html?estado=carne-desconto')
                      + itens(IT11, 39920) + pagar_folha(39920, 'Os mesmos códigos da página 1 do carnê. Exemplo: o código e o boleto de verdade vêm do Banco Inter.')
                      + historico(H11, FUT), acoes_fat() + para(LINK_FICHA))
T = tf('carne-desconto', V11, trilha='Jatobá · dezembro/2026')

# ---------------------------------------------------------------- 11b. fatura-carne-desconto-pessoa: janeiro, carnê 2027 com 7 pessoas (como sai em 21/12/2026)
IT11B = [(49900, 'Mensalidade do plano Escritório', 'Parcela 1 de 12 do carnê 2027 · plano Escritório · janeiro de 2027', ''),
         (6900, 'Pessoa a mais', '1 pessoa a mais (7 ativas em 27/11/2026, no dia do carnê; 6 incluídas) · 1 × R$ 69,00', ''),
         (-9980, 'Desconto de entrada (20% da mensalidade)', '2ª de 3 faturas, até fevereiro de 2027 · lançado por Carol Andrade · sobre a mensalidade, nunca sobre a pessoa a mais', MOT_NOVO)]
assert sum(i[0] for i in IT11B) == JATP[0]['valor'] == 46820
CAB11B = fat_cab('2026/0241', 'janeiro de 2027', 'Jatobá Advocacia', selo_sit('avencer'), meta('Plano Escritório', 'Vence em 10/01/2027', 'Carnê · parcela 1 de 12'), 46820,
                 '<p>Vence em <b>10/01/2027</b>, daqui a 20 dias. Emitida em 21/12/2026, com os códigos e os itens da página 1 do carnê 2027.</p>')
H11B = [('21/12/2026', [
    ('08h00', 'O sistema', 'mandou o aviso por e-mail a <b>financeiro@jatoba.adv.br</b>', 'Com cópia para Beatriz Nogueira, sócia dona · “A parcela 1 do seu carnê 2027 vence em 10/01”', '', 'sis', ''),
    ('08h00', 'O sistema', 'emitiu a fatura da parcela 1 do carnê 2027', f'{brl(46820)} · 7 pessoas, as do dia do carnê (27/11/2026) · hoje são 7', '', 'sis', ''),
]), ('27/11/2026', [
    ('15h40', 'Carol Andrade', 'gerou um carnê novo', f'Carnê 2027: {texto_faixas(faixas(JATP))} · 7 pessoas desde 25/11', '', 'forte', ''),
])]
FUT_B = '<b>Próximos lembretes da régua</b><ul><li>07/01/2027: “vence em 3 dias”</li><li>10/01/2027: “vence hoje”</li></ul>'
V11B = CAB11B + grade_c(faixa_parc(1, '2027', '27/11/2026', 'As parcelas 1 e 2 têm o desconto de entrada; da 3 em diante, R$ 568,00, com a pessoa a mais.',
                                   'ficha.html?aba=assinatura&amp;estado=cb-carne-valor-mudou', 'carne-a4.html?estado=carne-trocado-desconto')
                        + itens(IT11B, 46820) + pagar_folha(46820, 'Os mesmos códigos da página 1 do carnê 2027. Exemplo: o código e o boleto de verdade vêm do Banco Inter.')
                        + historico(H11B, FUT_B), acoes_fat() + para('ficha.html?aba=assinatura&amp;estado=cb-carne-valor-mudou'))
T += tf('carne-desconto-pessoa', V11B, trilha='Jatobá · janeiro/2027')
montar_sobre('cobranca.html', os.path.join(SAIDA, 'cobranca.html'), CSS_D41, T)
print('cobranca ok', T.count('<template data-est='), 'estados novos')

# ================================================================ Portal (Ribeiro & Matos, sócia dona Marina Ribeiro)
PT = carregar('portal_cb.py', 'TIRAS = {')
secao, t_pt, EV, JEXP = PT['secao'], PT['t'], PT['EV'], PT['JEXP']


def bt_pagar(comp):
    return f'<button class="btn btn-pri btn-compacto" type="button" data-janela="janela-pagar-pt">{ico("pagar", "ico ico-s")}Pagar<span class="sr"> a fatura de {comp}</span></button>'


def bt_recibo(comp):
    return (f'<a class="btn btn-sec btn-compacto" href="recibo-a4.html?estado=recibo-carne-desconto">{ico("baixar", "ico ico-s")}Recibo<span class="sr"> de {comp}</span></a>'
            f'<span class="cb-peq" style="align-self:center">Nota: em breve</span>')


def plano_esq(pessoas_txt, desconto_txt):
    return ('<div><p class="sobretitulo">Seu plano</p><p class="cb-plano-nome" style="font-size:24px">Escritório</p>'
            f'<p class="cb-preco">{brl(P)}<small>por mês</small></p>'
            f'<p>Até <b>6 pessoas</b>, com todas as áreas. {pessoas_txt} Cada pessoa a mais custa {brl(PESSOA_A_MAIS)} por mês.</p>'
            '<p>Vence todo dia <b>10</b> · carnê de 12 parcelas, cada uma com Pix e boleto · a fatura chega em marina@ribeiromatos.adv.br.</p>'
            f'<p>{desconto_txt}</p>'
            '<p>Para mudar de plano ou de dia, <a href="mailto:atendimento@exemplo.com.br">fale com o T3jus</a>.</p></div>')


def dir_prox(valor, linha, pdf):
    return ('<div><p class="sobretitulo">Próxima parcela</p>'
            f'<p class="cb-proxima"><span class="cb-grande">{brl(valor)}</span>{selo_sit("avencer")}</p>'
            f'<p>{linha}</p>'
            f'<p style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-pri" type="button" data-janela="janela-pagar-pt">{ico("pagar")}Pagar adiantado</button>'
            f'<a class="btn btn-sec" href="{pdf}">{ico("baixar")}Baixar o carnê</a></p></div>')


def janela_pagar(ps0, comp, venc, carne_nome):
    it = [(f'Mensalidade do plano Escritório, {comp}', ps0['mens'])]
    if ps0['pam']:
        it.append(('Pessoa a mais, contada no dia do carnê', ps0['pam']))
    it.append(('Desconto de entrada (30% da mensalidade)', -ps0['desc']))
    corpo = ('<ul class="cb-conta">' + ''.join(f'<li><span>{r}</span><b>{brl(v)}</b></li>' for r, v in it)
             + f'<li class="cb-tot"><span>Total</span><b>{brl(ps0["valor"])}</b></li></ul>'
             + C['como_pagar'](ps0['valor'], id_='pt').replace('class="cb-pagar"', 'class="cb-pagar" style="padding:0"')
             + f'<p class="permissao">{ico("ajuda")}São os mesmos códigos da página da parcela no {carne_nome}. Exemplo: o código e o boleto de verdade vêm do Banco Inter.</p>')
    return janela('janela-pagar-pt', 'Plano e faturas', f'Pagar a parcela de {comp}', f'Vence em {venc}. Pagar antes pode: a parcela fica paga e a fatura do mês já nasce paga.',
                  corpo, f'<button class="btn btn-pri" type="button" data-fechar data-foco>Fechar</button>', abrir=False)


MOT_PT = f'<b>Desconto de entrada de 30%</b> nas 3 primeiras parcelas, até fevereiro de 2027: “{MOT_OUTRO}” Depois, o valor do plano.'
PDF = 'carne-a4.html?estado=carne-desconto'

# ---- 12. cb-carne-desconto
NOTA_RIB = nota('<b>O desconto de entrada vale nas 3 primeiras parcelas</b>, até fevereiro de 2027. Da parcela 4 em diante, o valor é o do plano, R$ 499,00.', 'desconto')
CARNE12 = folha_carne('Seu carnê 2026/2027', f'{texto_faixas(faixas(RIB))} · {periodo(RIB)} · todo dia 10', RIB, console=False, nota_html=NOTA_RIB,
                      id_='t-carne-pt', cls_folha='cb-carne-pt', baixar=PDF)
CARNE12 = CARNE12.replace('<h2 id="t-carne-pt">', '<h3 id="t-carne-pt" class="cb-h3-carne">', 1).replace('</h2>', '</h3>', 1)
LIN12 = [('dezembro/2026', 34930, '10/12/2026', 'paga', None, 'parcela 1 de 12 · paga em 25/11, Pix · com o desconto de entrada', '', bt_recibo('dezembro'))]
S12 = secao(dir_prox(RIB[1]['valor'], 'Parcela <b>2 de 12</b> · janeiro de 2027 · vence em <b>10/01/2027</b> · com o desconto de entrada. A fatura chega em 21/12.', PDF),
            LIN12, meio=CARNE12, plano_esq=plano_esq('Hoje são <b>6</b>.', MOT_PT))
T2 = t_pt('cb-carne-desconto', S12 + EV + JEXP + janela_pagar(RIB[1], 'janeiro de 2027', '10/01/2027', 'carnê 2026/2027'))

# ---- 13. cb-carne-trocado-desconto: 7 pessoas desde 25/11, o T3jus gerou o carnê 2027
_rn = [dict(p) for p in RIBP]
_rn[0].update(sit='proxima', nota='fatura em 21/12')
_ro = [dict(p) for p in RIB]
for p in _ro[1:]:
    p.update(sit='cancelada', nota='')
AVISO13 = ('<div style="padding:0 24px 16px">' + aviso('info', 'Seu carnê mudou em 27/11/2026: use o carnê 2027 a partir de janeiro.',
                                                       'Desde 25/11, a equipe tem 7 pessoas, uma a mais que as 6 do plano. O carnê novo já conta a pessoa a mais '
                                                       f'({brl(PESSOA_A_MAIS)} por mês) e mantém o desconto de entrada em janeiro e fevereiro, como combinado. '
                                                       'As páginas 2 a 12 do carnê 2026/2027 foram canceladas: descarte-as e não pague por elas. A parcela de dezembro, já paga, continua paga.',
                                                       acoes=f'<a class="btn btn-sec btn-compacto" href="carne-a4.html?estado=carne-trocado-desconto">{ico("baixar", "ico ico-s")}Baixar o carnê 2027</a>') + '</div>')
NOVO13 = folha_carne('Seu carnê 2027', f'{texto_faixas(faixas(RIBP))} · {periodo(RIBP)} · todo dia 10 · desde 27/11/2026', _rn, console=False,
                     id_='t-carne-pt', cls_folha='cb-carne-pt', baixar='carne-a4.html?estado=carne-trocado-desconto')
NOVO13 = NOVO13.replace('<h2 id="t-carne-pt">', '<h3 id="t-carne-pt" class="cb-h3-carne">', 1).replace('</h2>', '</h3>', 1)
VELHO13 = folha_carne('Carnê 2026/2027', f'{texto_faixas(faixas(RIB))} · substituído em 27/11/2026', _ro, console=False, id_='t-carne-velho', cls_folha='cb-carne-pt d41-subst',
                      acoes=False, pe='As parcelas canceladas ficam aqui para consulta. Não pague por elas.',
                      selo_h2=f' <span class="selo d41-selo-subst" style="vertical-align:3px;margin-left:8px">{ico("trocar")}Substituído</span>')
VELHO13 = VELHO13.replace('<h2 id="t-carne-velho">', '<h3 id="t-carne-velho" class="cb-h3-carne">', 1).replace('</h2>', '</h3>', 1)
S13 = secao(dir_prox(RIBP[0]['valor'], 'Parcela <b>1 de 12</b> do carnê 2027 · janeiro de 2027 · vence em <b>10/01/2027</b> · com o desconto de entrada e a pessoa a mais.',
                     'carne-a4.html?estado=carne-trocado-desconto'),
            LIN12, extra_topo=AVISO13, meio=NOVO13 + VELHO13, plano_esq=plano_esq('Hoje são <b>7</b>, uma a mais desde 25/11.', MOT_PT))
T2 += t_pt('cb-carne-trocado-desconto', S13 + EV + JEXP + janela_pagar(RIBP[0], 'janeiro de 2027', '10/01/2027', 'carnê 2027'))
montar_sobre('portal-escritorio.html', os.path.join(SAIDA, 'portal-escritorio.html'), CSS_D41, T2)
print('portal ok', T2.count('<template data-est='), 'estados novos')
