# PDF da fatura e do recibo com as linhas da implantação. Bases (lidas sem mudança): cobranca-pdfs/fatura-a4.html e recibo-a4.html.
# Os modelos novos partem do estado "padrao" aprovado e trocam só os dados e as linhas de itens.
# Uso: python3 pdf_im.py <pasta-saida>
import sys, os, re
from comum_im import *
from dados_im import *

SAIDA = sys.argv[1] if len(sys.argv) > 1 else '..'
CSS_PDF = ('\n.dp-tab td .im-tp{display:inline-block;font-size:2.4mm;font-weight:600;letter-spacing:.02em;text-transform:uppercase;color:#87335B;margin-right:1.6mm;'
           'border:.25mm solid #AC788D;border-radius:1mm;padding:0 1mm;vertical-align:.3mm}\n.dp-tab tr.im-isen td:last-child,.dp-tab tr.im-desc td:last-child{color:#AC3F6B}\n')


def nb(v):
    return brl(v).replace('R$ ', 'R$\xa0').replace('− ', '−\xa0')


def tp(t):
    return f'<span class="im-tp">{t}</span>'


def linhas(cobrada, recibo=False):
    r = (f'<tr><td>{tp("Mensalidade")}Mensalidade do plano Escritório<small>janeiro de 2027 · até 8 pessoas · 6 ativas no dia da emissão</small></td><td>{nb(MENSAL)}</td></tr>'
         f'<tr class="im-desc"><td>{tp("Desconto")}Desconto de entrada (20% da mensalidade)<small>1ª de 3 faturas · só sobre a mensalidade</small></td><td>{nb(-DESC)}</td></tr>'
         f'<tr><td>{tp("Implantação")}Implantação assistida · {DESCR}<small>uma vez só, na 1ª fatura{" · à vista" if cobrada else ""}</small></td><td>{nb(VALOR)}</td></tr>')
    if not cobrada:
        r += f'<tr class="im-isen"><td>{tp("Isenção")}Isenção da implantação · {ISENCAO_TXT}<small>o valor aparece e a isenção também</small></td><td>{nb(-VALOR)}</td></tr>'
    return r


def tot_txt(c):
    return brl(c).replace('R$ ', '')


# ---------------- fatura
F = ler('cobranca-pdfs/fatura-a4.html')
P = tira_bloco(F, '<template data-est="padrao"')
tb_i = P.index('<tbody>'); tb_j = P.index('</tbody>')


def fatura(cobrada):
    tot = TOTAL_COBRADA if cobrada else TOTAL_ISENTA
    num = '2027/0004'
    s = P[:tb_i] + '<tbody>' + linhas(cobrada) + P[tb_j:]
    s = s.replace('data-est="padrao"', f'data-est="{"im-cobrada" if cobrada else "im-isenta"}"')
    s = re.sub(r'data-desc="[^"]*"', f'data-desc="Cedro &amp; Lima, janeiro de 2027, a 1ª: implantação {"cobrada à vista" if cobrada else "com a isenção"} (CO-08)"', s, count=1)
    for a, b in [('2026/0187', num), ('competência dezembro de 2026', 'competência janeiro de 2027'), ('R$\xa0431,00', nb(tot)), ('F2026018763', 'F2027000463'), ('20260.187016', '20270.004016'), ('10/12/2026', '10/01/2027'),
                 ('emitida em 18/11/2026', 'emitida em 07/12/2026'), ('5406431.00', '54' + f'{len(f"{tot/100:.2f}"):02d}' + f'{tot/100:.2f}'),
                 ('0000043100', f'{tot:010d}')]:
        s = s.replace(a, b)
    return s


TF = fatura(False) + '\n' + fatura(True) + '\n'
NAV_F = '<a href="fatura-a4.html?estado=pb" data-e="pb">Preto e branco</a>'
assert NAV_F in F
sf = F.replace('</style>', CSS_PDF + '</style>', 1).replace(NAV_F, NAV_F + '<a href="fatura-a4.html?estado=im-isenta" data-e="im-isenta">1ª fatura, implantação isenta</a>'
                                                          '<a href="fatura-a4.html?estado=im-cobrada" data-e="im-cobrada">1ª fatura, implantação cobrada</a>')
k = sf.rindex('</template>') + len('</template>')
sf = sf[:k] + '\n' + TF + sf[k:]
open(os.path.join(SAIDA, 'fatura-a4.html'), 'w', encoding='utf-8').write(sf)

# ---------------- recibo
R = ler('cobranca-pdfs/recibo-a4.html')
PR = tira_bloco(R, '<template data-est="padrao"')
i = PR.index('<tbody>'); j = PR.index('</tbody>')
rr = PR[:i] + '<tbody>' + linhas(False, True) + PR[j:]
rr = rr.replace('data-est="padrao"', 'data-est="im-isenta"')
rr = re.sub(r'data-desc="[^"]*"', 'data-desc="Cedro &amp; Lima, janeiro de 2027, a 1ª, paga por Pix: implantação com a isenção (CO-08)"', rr, count=1)
for a, b in [('Ribeiro &amp; Matos Sociedade de Advogados', 'Cedro &amp; Lima Advocacia'), ('41.276.839/0001-34', '22.914.870/0001-09'),
             ('2026/0163', '2027/0004'), ('R$\xa0490,00', nb(TOTAL_ISENTA)), ('quatrocentos e noventa reais', 'trezentos e noventa e nove reais e vinte centavos'),
             ('competência <b>novembro de 2026</b>', 'competência <b>janeiro de 2027</b>'), ('competência novembro de 2026', 'competência janeiro de 2027'),
             ('09/11/2026', '08/01/2027'), ('vencia em 10/11/2026', 'vencia em 10/01/2027')]:
    rr = rr.replace(a, b)
# a linha da mensalidade voltou a ter o valor certo depois da troca de R$ 490,00
rr = rr.replace(f'Mensalidade do plano Escritório<small>janeiro de 2027 · até 8 pessoas · 6 ativas no dia da emissão</small></td><td>{nb(TOTAL_ISENTA)}',
                f'Mensalidade do plano Escritório<small>janeiro de 2027 · até 8 pessoas · 6 ativas no dia da emissão</small></td><td>{nb(MENSAL)}')
NAV_R = '<a href="recibo-a4.html?estado=pb" data-e="pb">Preto e branco</a>'
assert NAV_R in R
sr = R.replace('</style>', CSS_PDF + '</style>', 1).replace(NAV_R, NAV_R + '<a href="recibo-a4.html?estado=im-isenta" data-e="im-isenta">1ª fatura, implantação isenta</a>')
k = sr.rindex('</template>') + len('</template>')
sr = sr[:k] + '\n' + rr + '\n' + sr[k:]
open(os.path.join(SAIDA, 'recibo-a4.html'), 'w', encoding='utf-8').write(sr)
print('pdf ok')
