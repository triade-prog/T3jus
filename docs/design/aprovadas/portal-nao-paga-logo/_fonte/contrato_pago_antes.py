# Portal · Contratos › ficha do contrato › Recebimentos: as parcelas pagas antes do T3jus (F3.73; VA-05; PT-03, PT-09, PT-10).
# Parte da ficha aprovada do contrato (contratos.py e pecas.py, sem mudança; o contratos.py é lido até os estados)
# e da decisão 23 da Importação aprovada: parcela paga antes do T3jus não vira recebimento, fica no contrato
# como informação, fora do Caixa, fora dos totais e sem recibo.
# Acrescenta só a folha "Pago antes do T3jus", logo abaixo da programação, e uma linha nos totais.
# Peças novas com prefixo pg-. Uso: python3 contrato_pago_antes.py <pasta-saida>
import os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
_src = open(os.path.join(AQUI, 'contratos.py'), encoding='utf-8').read()
_src = _src[:_src.index('# ---------------------------------------------------------------- estados')]
sys_argv = sys.argv
exec(compile(_src, 'contratos.py', 'exec'), globals())

SAIDA = sys_argv[1] if len(sys_argv) > 1 else 'saida'
U = 'contrato-pago-antes.html?estado='
IMPORTACOES = '../portal-importacao/importacao.html?estado=historico'

CSS_PG = r"""
/* ==========================================================================
   Recebimentos · Pago antes do T3jus (prefixo pg-)
   ========================================================================== */
.pg-nota{margin:0 24px 16px;display:flex;gap:12px;align-items:flex-start;padding:12px 16px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.5;color:var(--texto)}
.pg-nota>.ico{flex:none;margin-top:1px;color:var(--vinho)}
.pg-nota b{font-weight:600}
.pg .hn-tab td{color:var(--texto-2)}
.pg .hn-tab td b,.pg .hn-tab .hn-valor-c{color:var(--texto)}
@media (min-width:761px){.pg .hn-tab tbody tr td:first-child{box-shadow:inset 3px 0 0 var(--vinho-4)}}
.pg-soma{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;padding:12px 24px;border-top:1px solid var(--divisor);font-size:13px;color:var(--texto-2)}
.pg-soma b{font-family:var(--serifa);font-size:20px;font-weight:500;color:var(--texto)}
.pg-origem{margin:0;padding:14px 24px 4px;border-top:1px solid var(--divisor);display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px 20px}
.pg-origem dt{font-size:12px;color:var(--texto-2)}
.pg-origem dd{margin:0;font-size:13.5px;font-weight:500;line-height:1.4;overflow-wrap:anywhere}
.pg-origem dd small{display:block;font-weight:400;font-size:12px;color:var(--texto-2)}
.pg-acoes{display:flex;gap:10px;flex-wrap:wrap;align-items:center;padding:8px 24px 18px}
.pg-acoes p{font-size:12.5px;color:var(--texto-2);line-height:1.45;flex:1 1 280px}
.ct-totais p.pg-tot{font-size:12px;color:var(--texto-2);line-height:1.45;margin-top:2px}
.ct-totais p.pg-tot a{color:var(--vinho);font-weight:500}
.pg-grade{display:grid;gap:24px}
@media (max-width:760px){
  .pg-nota{margin:0 16px 14px}
  .pg-soma{padding:12px 16px}
  .pg-origem{grid-template-columns:1fr;padding:12px 16px 4px}
  .pg-acoes{padding:8px 16px 16px}
  .pg-acoes .btn{flex:1 1 100%}
  .pg-grade{gap:16px}
}
"""


# ---------------------------------------------------------------- ficha
def dir_c(dia, valor, oque):
    return (f'<section class="dir campo-ambar" aria-labelledby="t-pr"><p class="sobretitulo" id="t-pr">Próximo recebimento</p>'
            f'<div class="hn-dir-linha"><p class="grande">{dia}</p>{selo("ativo", valor)}</div>'
            f'<p class="hn-oque"><b>{oque}</b><br>no Financeiro, em A receber</p>'
            f'<a class="btn btn-pri" href="{U}rosa">{ico("carteira")}Ver recebimentos</a></section>')


def abas_pg():
    return (f'<nav class="abas" aria-label="Seções do contrato"><a data-aba="contrato" href="#">Contrato</a>'
            f'<a data-aba="recebimentos" href="#">Recebimentos<span class="q">4</span></a><a data-aba="documentos" href="#">Documentos<span class="q">1</span></a></nav>')


def programacao(rows, totais, sub, financeiro=True):
    linhas = []
    for d, oque, k, v, (st, sn, si) in rows:
        cel = [f'<b class="num">{d}</b>', oque, selo_tipo(k), f'<span class="num hn-valor-c">{brl(v)}</span>']
        if financeiro:
            cel.append(selo(st, sn, si))
        linhas.append((cel, ''))
    cols = ['Vencimento', 'O quê', 'Condição', 'Valor'] + (['Situação'] if financeiro else [])
    larg = ['14%', '34%', '18%', '15%', '19%'] if financeiro else ['16%', '40%', '22%', '22%']
    tab = tabela('Programação dos recebimentos', cols, linhas, larg)
    tot = '<div class="ct-totais">' + ''.join(f'<div><p>{a}</p><p class="hn-res-grande{" num" if n else ""}">{b}</p>{c}</div>' for a, b, c, n in totais) + '</div>'
    pe = f'<p class="hn-pe">{ico("carteira")}<span>É a mesma programação que o Financeiro vê em A receber. Pagamentos, atrasos e baixas são registrados lá.</span></p>'
    return (f'<section class="folha" aria-labelledby="t-rc" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-rc">Programação dos recebimentos</h2>'
            f'<p class="sub">{sub}</p></div></div>{tot}{tab}{pe}</section>')


PREV = ('andamento', 'Previsto', None)


def folha_pago_antes():
    linhas = [([f'<b class="num">10/10/2026</b>', 'Parcela 1 de 6', selo_tipo('parcelado'), f'<span class="num hn-valor-c">{brl(80000)}</span>',
                selo('neutro', 'Paga antes do T3jus')], ''),
              ([f'<b class="num">10/11/2026</b>', 'Parcela 2 de 6', selo_tipo('parcelado'), f'<span class="num hn-valor-c">{brl(80000)}</span>',
                selo('neutro', 'Paga antes do T3jus')], '')]
    tab = tabela('Parcelas pagas antes do T3jus', ['Vencimento', 'O quê', 'Condição', 'Valor', 'Como veio'], linhas, ['14%', '34%', '18%', '15%', '19%'])
    nota = (f'<p class="pg-nota">{ico("escudo")}<span><b>Só informação.</b> Não entram nos totais acima, nem em A receber, nem no Caixa, e não geram recibo: '
            f'o pagamento foi feito antes do T3jus, e a planilha não diz quando, como nem a quem.</span></p>')
    soma = f'<p class="pg-soma"><span>Soma das parcelas pagas antes, fora dos totais</span><b class="num">{brl(160000)}</b></p>'
    origem = (f'<dl class="pg-origem"><div><dt>Veio da planilha</dt><dd>clientes-e-contratos-2026.xlsx<small>linha 2</small></dd></div>'
              f'<div><dt>Importada por</dt><dd>Marina Ribeiro (você)<small>17/11/2026, às 15h42</small></dd></div>'
              f'<div><dt>Na planilha</dt><dd>“Parcelas pagas: 2”<small>as 2 primeiras de 6</small></dd></div></dl>')
    acoes = (f'<div class="pg-acoes"><a class="btn btn-sec" href="{IMPORTACOES}">{ico("historico")}Ver a importação</a>'
             f'<p>Alguma não foi paga? Até 24/11 dá para desfazer a importação, corrigir a planilha e importar de novo.</p></div>')
    return (f'<section class="folha pg" aria-labelledby="t-pg" id="pago-antes" style="overflow:hidden"><div class="folha-cab"><div>'
            f'<h2 id="t-pg">Pago antes do T3jus</h2><p class="sub">2 parcelas que a planilha trouxe como já pagas.</p></div></div>'
            f'{nota}{tab}{soma}{origem}{acoes}</section>')


def rosa():
    cab = ficha_cab_c('C-2026-041', 'Rosa Almeida', SIT_ATIVO, 'Aposentadoria por idade', dir_c('10/12', 'R$ 800,00', 'Parcela 3 de 6'))
    rows = [('10/12/2026', 'Parcela 3 de 6', 'parcelado', 80000, PREV),
            ('10/01/2027', 'Parcela 4 de 6', 'parcelado', 80000, PREV),
            ('10/02/2027', 'Parcela 5 de 6', 'parcelado', 80000, PREV)]
    tot = [('Recebido até hoje', 'R$ 0,00', '<p class="pg-tot">Só o que passou pelo T3jus. Os <a href="#pago-antes">R$ 1.600,00 pagos antes</a> ficam fora.</p>', True),
           ('Programado até 10/03/2027', 'R$ 3.200,00', '<p class="pg-tot">4 parcelas de R$ 800,00</p>', True),
           ('Depende do caso', 'Nada', '', False)]
    prog = programacao(rows, tot, 'Gerada das condições do contrato. Mostra os próximos 3 meses; a parcela 6 vence em 10/03/2027.')
    return f'<div class="hn">{cab}{abas_pg()}<div class="pg-grade">{prog}{folha_pago_antes()}</div></div>'


def oficina():
    cab = ficha_cab_c('C-2026-043', 'Oficina Irmãos Dias Ltda.', SIT_ATIVO, 'Consultivo trabalhista', dir_c('10/12', 'R$ 1.200,00', 'Mensalidade 1'))
    rows = [('10/12/2026', 'Mensalidade 1', 'mensal', 120000, PREV),
            ('10/01/2027', 'Mensalidade 2', 'mensal', 120000, PREV),
            ('10/02/2027', 'Mensalidade 3', 'mensal', 120000, PREV)]
    tot = [('Recebido até hoje', 'R$ 0,00', '', True),
           ('Programado até 10/11/2027', 'R$ 14.400,00', '', True),
           ('Depende do caso', 'Nada', '', False)]
    prog = programacao(rows, tot, 'Gerada das condições do contrato. Mostra os próximos 3 meses; a mensalidade segue todo dia 10.')
    return f'<div class="hn">{cab}{abas_pg()}<div class="pg-grade">{prog}</div></div>'


# ---------------------------------------------------------------- estados
A = lambda trilha, titulo, **k: dict(area='contratos', secao='Contratos', atual='contratos', trilha=trilha, titulo=titulo, aba='recebimentos', **k)
T = ''
T += tpl('rosa', rosa(), **A('Contratos|C-2026-041', 'C-2026-041'))
T += tpl('sem-pago-antes', oficina(), q='12', **A('Contratos|C-2026-043', 'C-2026-043'))

URL = {'Contratos': 'contratos.html?estado=contratos', 'Honorários': '#', 'Procurações e modelos': '#'}
out = montar('contrato-pago-antes.html', 'Contratos', 'Ficha do contrato, aba Recebimentos: as parcelas pagas antes do T3jus, que vieram da planilha.',
             '{"estado":"rosa","atual":"contratos"}', T, barras('contratos', URL), CSS + CSS_PG)
open(f'{SAIDA}/contrato-pago-antes.html', 'w', encoding='utf-8').write(out)
print('contrato-pago-antes ok', T.count('<template data-est='), 'estados')
