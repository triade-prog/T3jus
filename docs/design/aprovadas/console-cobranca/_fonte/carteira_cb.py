# Console · carteira com a situação nova "Fatura em atraso" (CO-06).
# Base: docs/design/aprovadas/console-fim-contrato/carteira.html (lido sem mudança). Só muda a célula de situação
# dos 3 escritórios em atraso e entra um filtro; os números aprovados continuam iguais.
import sys, os, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dados_cb import *

SAIDA = sys.argv[1] if len(sys.argv) > 1 else '../saida'
CAR = open(BASE + 'carteira.html', encoding='utf-8').read()
LV = miolo(CAR, 'lista:fc-ver')

OK = '<span class="selo selo-ok"><svg class="ico" aria-hidden="true"><use href="#i-check"/></svg>Em dia</span>'
ATRASOS = [('Aroeira Sociedade de Advogados', 5), ('Vale &amp; Sena Advogados', 10), ('Bacuri Advocacia Trabalhista', 41)]


def selo_atr(d):
    return selo_sit('atraso', d).replace(f'Em atraso · {d} dias', f'Fatura em atraso · {d} dias')


def trocar(s):
    for nome, d in ATRASOS:
        # linha da tabela
        i = s.index(f'<a href="#">{nome}</a>')
        j = s.index('</tr>', i)
        k = s.index(OK, i)
        assert k < j, nome
        s = s[:k] + selo_atr(d) + s[k + len(OK):]
        # cartão do celular
        i = s.index(f'<a class="c-nome" href="#">{nome}</a>')
        j = s.index('</li>', i)
        k = s.index(OK, i)
        assert k < j, nome
        s = s[:k] + selo_atr(d) + s[k + len(OK):]
    s = s.replace('<a href="#">Bacuri Advocacia Trabalhista</a>', f'<a href="{LINK_BACURI_FICHA}">Bacuri Advocacia Trabalhista</a>')
    s = s.replace('<a class="c-nome" href="#">Bacuri Advocacia Trabalhista</a>', f'<a class="c-nome" href="{LINK_BACURI_FICHA}">Bacuri Advocacia Trabalhista</a>')
    return s


CHIP_RESP = '<div class="chips" role="group" aria-label="Responsável">'


def filtro(on):
    return (f'<div class="chips" role="group" aria-label="Situação" style="margin-left:0"><button type="button" aria-pressed="{"true" if on else "false"}">'
            f'{ico("fatura", "ico ico-s")}Fatura em atraso (3)</button></div>' + CHIP_RESP)


VER = trocar(LV).replace(CHIP_RESP, filtro(False), 1)
T = tpl('lista:cb-ver', exemplo(VER))

# Filtro ligado: só os 3 em atraso, do mais antigo para o mais novo; "Pedem você agora" sai da frente.
A = trocar(LV).replace(CHIP_RESP, filtro(True), 1)
A = A[:A.index('<section class="pedem')] + A[A.index('<section class="folha" aria-labelledby="t-lista"'):]
rows = re.findall(r'<tr>.*?</tr>', A[A.index('<tbody>'):A.index('</tbody>')], flags=re.S)
keep = {n: r for r in rows for n, _ in ATRASOS if n in r}
A = re.sub(r'<tbody>.*?</tbody>', '<tbody>' + ''.join(keep[n] for n, _ in reversed(ATRASOS)) + '</tbody>', A, count=1, flags=re.S)
ul = A[A.index('<ul class="cartoes so-cel"'):]
ul = ul[:ul.index('</ul>') + 5]
lis = re.findall(r'<li class="cartao">.*?</li>', ul, flags=re.S)
keepc = {n: l for l in lis for n, _ in ATRASOS if n in l}
A = A.replace(ul, '<ul class="cartoes so-cel" aria-label="Escritórios com fatura em atraso">' + ''.join(keepc[n] for n, _ in reversed(ATRASOS)) + '</ul>')
A = re.sub(r'<div class="rodape-tab">.*?</div>',
           f'<p class="fc-nota-lista">{ico("ajuda")}<span>“Fatura em atraso” não entra em “Com pendência”, que conta só o que falta na implantação. '
           'Os valores e as faturas ficam em Cobrança, para a Administração e o Financeiro.</span></p>'
           '<div class="rodape-tab"><span>Mostrando 3 escritórios com fatura em atraso, do atraso maior para o menor</span>'
           f'<a class="ver so-fin" href="cobranca.html?aba=faturas&amp;estado=atraso">Ver as faturas em Cobrança{ico("dir", "ico ico-s")}</a></div>', A, count=1, flags=re.S)
A = A.replace('<option>Pendências primeiro</option>', '<option>Maior atraso primeiro</option>')
T += tpl('lista:cb-atraso', exemplo(A))

montar('carteira.html', os.path.join(SAIDA, 'carteira.html'), CSS_CB, T, pos=lambda s: trilho_console(s))
print('carteira ok', T.count('<template data-est='), 'estados')
