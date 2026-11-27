# Portal · Recibo em PDF (FI-14), conta recorrente (FI-13) e pedidos de contrato (IN-01).
# Reusa, sem mudança, os geradores aprovados: financeiro.py (Financeiro), contratos.py e comercial.py
# (Comercial e Contratos), comum.py e pecas.py (moldura), e o painel do sino (sino.py, lido em partes).
# Importa cada um (eles gravam as páginas aprovadas) e acrescenta os estados novos com peças de prefixo
# rb- (recibo), rc- (recorrente) e pc- (pedidos de contrato).
# Uso: python3 telas.py <pasta-saida>
import sys, os, re, html
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
sys.argv = [sys.argv[0], SAIDA]
import financeiro as F          # grava SAIDA/financeiro.html (aprovado) e expõe as peças
import contratos as C           # grava SAIDA/contratos.html (aprovado)
import comercial as CM          # grava SAIDA/comercial.html (aprovado)
from comum import tpl, janela, aviso, ico, estado, toast
from rr_dados import *

H = html.escape
AQUI = os.path.dirname(os.path.abspath(__file__))
FI = 'financeiro.html?estado='
CO = 'contratos.html?estado='
RECIBO_URL = 'recibo-a4.html?estado=padrao'

SPRITE_RR = ('<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">'
             '<symbol id="i-impressora" viewBox="0 0 24 24"><path d="M7 9V3.5h10V9"/><path d="M7 17H4V9h16v8h-3"/><path d="M7 14h10v6.5H7Z"/></symbol>'
             '<symbol id="i-encerrar" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M9 9h6v6H9Z"/></symbol>'
             '<symbol id="i-checks" viewBox="0 0 24 24"><path d="m2.5 12.5 4 4 8-9"/><path d="m11.5 16 1 .5 8-9"/></symbol>'
             '</svg>')

CSS_RR = r"""
/* ==========================================================================
   Recibo (rb-), conta recorrente (rc-) e pedidos de contrato (pc-). Só tokens e pares já aprovados.
   ========================================================================== */
/* Recibo: link na tabela e aviso com ação */
.rb-link{display:inline-flex;align-items:center;gap:6px}
.toast .aviso-acoes .btn{min-height:40px}
.rb-hist-link{font-weight:500}

/* Conta recorrente: lista */
.rc-quem a{font-weight:500;color:var(--vinho);text-decoration:none;display:inline-block;padding:12px 0;margin:-12px 0}
.rc-tab td{padding-right:14px}
.rc-quem a:hover{text-decoration:underline}
.rc-quem small{display:block;font-size:12px;color:var(--texto-2)}
.rc-mes{display:grid;gap:4px;justify-items:start}
.rc-mes small{font-size:12px;color:var(--texto-2)}
.rc-acoes{display:flex;gap:6px;justify-content:flex-end;flex-wrap:nowrap}
.c-acoes .rc-acoes{flex-wrap:wrap;justify-content:stretch}
.c-acoes .rc-acoes .btn{flex:1 1 auto}
.rb-hist{font-size:12px;margin-top:4px}
.rc-muda{font-size:12px;color:var(--texto-2);display:block}
.rc-total{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 24px;border-top:1px solid var(--divisor);font-size:13px;color:var(--texto-2)}
.rc-total b{font-family:var(--serifa);font-size:22px;font-weight:500;color:var(--vinho)}
.rc-enc .fi-quem strong{color:var(--texto-2)}

/* Conta recorrente: ficha */
.rc-dir-linha{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.rc-dir-bts{display:flex;gap:8px;flex-wrap:wrap}
.rc-efeito{list-style:none;margin:0;padding:12px 14px;border-radius:var(--raio);border:1px solid var(--vinho-4);display:grid;gap:8px}
.rc-efeito-t{font-size:13px;font-weight:500;margin-bottom:-4px}
.rc-efeito li{display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.5}
.rc-efeito li .ico{color:var(--vinho);flex:none;margin-top:1px;width:18px;height:18px}
.rc-efeito b{font-weight:600}
.rc-novo{color:var(--vinho-3);font-weight:600}
.rc-nota{display:flex;gap:10px;align-items:flex-start;padding:12px 24px 18px;font-size:12px;line-height:1.5;color:var(--texto-2)}
.rc-nota .ico{width:16px;height:16px;flex:none;margin-top:1px;color:var(--vinho-4)}
.janela .campo textarea.entrada{min-height:84px;padding-top:12px;resize:vertical}

/* Pedidos de contrato */
.pc-bloco{overflow:hidden;box-shadow:inset 4px 0 0 var(--ambar)}
.pc-bloco .folha-cab h2{display:flex;align-items:center;gap:10px}
.pc-n{display:inline-grid;place-items:center;min-width:28px;height:28px;padding:0 8px;border-radius:14px;background:var(--ambar-3);color:var(--vinho);font-family:var(--sans);font-size:13px;font-weight:600}
.pc-lista{list-style:none;margin:0;padding:0}
.pc-item{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1.3fr) minmax(0,1fr) auto;gap:20px;align-items:center;padding:14px 24px;border-top:1px solid var(--divisor)}
.pc-nome{font-family:var(--serifa);font-size:19px;font-weight:500;color:var(--vinho);text-decoration:none;display:inline-flex;align-items:center;min-height:44px;margin:-10px 0 -8px}
.pc-nome:hover{text-decoration:underline}
.pc-quem small,.pc-ped small{display:block;font-size:12px;color:var(--texto-2);line-height:1.45}
.pc-hon{display:grid;gap:6px;justify-items:start}
.pc-valor{font-weight:500}
.pc-ped{display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.45}
.pc-ped .ico{color:var(--vinho-4);flex:none;margin-top:2px;width:18px;height:18px}
.pc-ped b{font-weight:500}
.pc-pedido{display:flex;gap:10px;align-items:center;flex-wrap:wrap}

@media (max-width:760px){
  .rc-total{padding:12px 16px}
  .rc-dir-bts .btn{flex:1 1 100%}
  .rc-nota{padding:10px 16px 16px}
  .pc-item{grid-template-columns:1fr;gap:10px;padding:14px 16px}
  .pc-item .btn{width:100%}
}
"""

# ================================================================= 1. RECIBO (FI-14)
SR_ABA = '<span class="sr"> (abre o recibo em outra aba, para baixar o PDF ou imprimir)</span>'


def com_link_recibo(f):
    """Os links "Recibo 0187" da tabela aprovada passam a abrir a página do recibo (/recibos/:id)."""
    f, n = re.subn(r'<a href="#">(<svg class="ico" aria-hidden="true"><use href="#i-doc"/></svg>)Recibo (\d{4})</a>',
                   lambda m: f'<a class="rb-link" href="{RECIBO_URL}" target="_blank" rel="noopener">{m.group(1)}Recibo {m.group(2)}{SR_ABA}</a>', f)
    assert n >= 3, n
    return f


def toast_acoes(titulo, texto, acoes):
    return (f'<div class="aviso aviso-sucesso toast" role="status">{ico("check")}<div><strong class="aviso-titulo">{titulo}</strong><p>{texto}</p>'
            f'<div class="aviso-acoes">{acoes}</div></div>'
            f'<button class="fechar" type="button" data-fechar aria-label="Fechar aviso">{ico("x")}</button></div>')


BTN_RECIBO = (f'<a class="btn btn-sec btn-compacto" href="{RECIBO_URL}" target="_blank" rel="noopener">{ico("doc")}Ver o recibo'
              f'<span class="sr"> nº 2026-0187, em outra aba</span></a>')


def ficha_recibo(toast=''):
    f = com_link_recibo(F.ficha_contrato(True))
    # tira o aviso aprovado do fim (ele volta com a ação nova quando o estado pede)
    i = f.rindex('<div class="aviso aviso-sucesso toast"')
    f = f[:i]
    old = 'recibo nº 2026-0187 enviado a Marta Corrêa pelo WhatsApp</small>'
    assert old in f
    f = f.replace(old, f'recibo nº 2026-0187 enviado a Marta Corrêa pelo WhatsApp</small><p class="rb-hist"><a class="rb-hist-link" href="{RECIBO_URL}" target="_blank" rel="noopener">Ver o recibo{SR_ABA}</a></p>', 1)
    return f + toast


def j_registrar_pagador():
    j = F.j_registrar(abrir=True)
    alvo = '<label class="opcao"><input class="marcar" type="checkbox" checked><span>Gerar o recibo e mandar pelo WhatsApp'
    assert alvo in j
    def r(rot, sub, ch=False):
        return f'<label class="opcao"><input class="marcar" type="radio" name="rg-pagou"{" checked" if ch else ""}><span>{rot}<small>{sub}</small></span></label>'
    cpf_m = F.campo('rg-pag-doc', 'CPF de quem pagou', MARTA['cpf'], im='numeric', ajuda='Do cadastro de Marta em Clientes. Vai no recibo; se mudar aqui, o cadastro dela também muda.')
    bloco = (f'<fieldset class="fi-grupo-op"><legend>Quem pagou</legend>'
             + r(f'{CLI["nome"]}, o cliente', 'O padrão. O recibo sai no nome dele.')
             + r(f'{MARTA["nome"]}, contato principal', 'Esposa de Hélio. O recibo diz que ela pagou, em favor de Hélio.', True)
             + f'<div class="fi-sub-op">{cpf_m}</div>'
             + r('Outra pessoa ou empresa', 'Escreva o nome e o CPF ou CNPJ de quem pagou.')
             + '</fieldset>')
    return j.replace(alvo, bloco + alvo, 1)


# ================================================================= 2. CONTA RECORRENTE (FI-13)
REC = [
    # chave, conta, fornecedor, categoria, valor, dia, desde, novembro (situação, texto), forma
    ('aluguel', 'Aluguel da sala', 'Imobiliária Paulista', 'Aluguel e condomínio', 3600.00, 20, 'mar/2025', ('aberto', 'vence 20/11'), 'Boleto'),
    ('das', 'Simples Nacional (DAS)', 'Receita Federal', 'Impostos', 2850.00, 20, 'jan/2025', ('aberto', 'vence 20/11'), 'Guia'),
    ('peticoes', 'Sistema de petições', 'Fornecedor de software', 'Fornecedores e sistemas', 189.90, 21, 'jan/2026', ('aberto', 'vence 21/11'), 'Cartão do escritório'),
    ('condominio', 'Condomínio da sala', 'Condomínio Edifício Aurora', 'Aluguel e condomínio', 700.00, 25, 'mar/2025', ('aberto', 'vence 25/11'), 'Boleto'),
    ('internet', 'Internet da sala', 'Provedor de internet', 'Fornecedores e sistemas', 165.10, 10, 'mar/2025', ('pago', 'paga em 10/11'), 'Débito automático'),
    ('folha', 'Folha de pagamento', 'Equipe do escritório', 'Pessoal', 9800.00, 5, 'mar/2025', ('pago', 'paga em 05/11'), 'Transferência'),
    ('retirada', 'Retirada das sócias', 'Marina Ribeiro e sócia', 'Retiradas dos sócios', 22000.00, 5, 'mar/2025', ('pago', 'paga em 05/11'), 'Transferência'),
    ('banco', 'Pacote de serviços do banco', 'Banco do escritório', 'Taxas bancárias', 210.00, 1, 'mar/2025', ('pago', 'debitada em 01/11'), 'Débito automático'),
]

FICHA_URL = {'aluguel': FI + 'rc-ficha', 'peticoes': FI + 'rc-ficha-peticoes'}


def lista_rec(encerrada=False):
    rows, car = '', ''
    itens = [x for x in REC if not (encerrada and x[0] == 'peticoes')]
    for k, conta, forn, cat, v, dia, desde, (sit, st), forma in itens:
        href = FICHA_URL.get(k, '#')
        mud = '<span class="rc-muda">o valor muda todo mês</span>' if k == 'das' else ''
        mes = (f'<div class="rc-mes">{F.selo("ok", "Paga", "check")}<small>{st}</small></div>' if sit == 'pago'
               else f'<div class="rc-mes">{F.selo("neutro", "A pagar")}<small>{st}</small></div>')
        mudar = FI + 'rc-mudar' if k == 'aluguel' else '#'
        enc = FI + 'rc-encerrar' if k == 'peticoes' else '#'
        acoes = (f'<div class="rc-acoes"><a class="btn btn-sec btn-compacto" href="{mudar}" aria-label="Mudar valor ou dia de {conta}">{ico("lapis")}Mudar</a>'
                 f'<a class="btn btn-sec btn-compacto" href="{enc}" aria-label="Encerrar a recorrência de {conta}">{ico("encerrar")}Encerrar</a></div>')
        rows += (f'<tr><td><div class="rc-quem"><a href="{href}">{conta}</a><small>{forn}</small></div></td><td><span class="fi-cat">{cat}</span></td>'
                 f'<td class="num"><b>Todo dia {dia}</b><small class="rc-muda">{forma}</small></td><td class="fi-v num">{R(v)}{mud}</td>'
                 f'<td class="num">{desde}</td><td>{mes}</td><td>{acoes}</td></tr>')
        car += (f'<li class="cartao"><div class="c-topo"><div><a class="c-nome" href="{href}" style="font-size:18px">{conta}</a><small>{forn}</small></div>'
                f'<span class="fi-cartao-v num" style="margin-left:auto">{R(v)}</span></div>'
                f'<dl class="c-dados"><dt>Vence</dt><dd class="num">todo dia {dia}</dd><dt>Categoria</dt><dd>{cat}</dd><dt>Desde</dt><dd class="num">{desde}</dd></dl>'
                f'<div class="c-selos">{mes}</div><div class="c-acoes">{acoes.replace(" btn-compacto", "")}</div></li>')
    n = len(itens)
    tot = sum(x[4] for x in itens)
    tab = (f'<table class="so-pc fi-tab rc-tab"><caption class="sr">Contas que se repetem todo mês</caption>'
           f'<colgroup><col style="width:18%"><col style="width:16%"><col style="width:11%"><col style="width:11%"><col style="width:8%"><col style="width:11%"><col style="width:25%"></colgroup>'
           f'<thead><tr><th scope="col">Conta</th><th scope="col">Categoria</th><th scope="col">Vence</th><th scope="col" style="text-align:right">Valor</th><th scope="col">Desde</th><th scope="col">Novembro</th><th scope="col"><span class="sr">Ações</span></th></tr></thead>'
           f'<tbody>{rows}</tbody></table><ul class="cartoes so-cel" aria-label="Contas que se repetem todo mês">{car}</ul>')
    pe = (f'<p class="rc-total"><span>{n} contas ativas · nascem sozinhas no dia 1º de cada mês</span><b class="num">{R(tot)}</b></p>'
          f'<p class="rc-nota">{ico("historico")}<span>Mudar o valor ou encerrar vale para as contas que ainda vão nascer, a partir do mês que você escolher. As contas pagas não mudam e nada se apaga.</span></p>')
    return F.folha('t-rec', 'Contas que repetem todo mês', tab + pe, sub='Valor, dia e o que já aconteceu em novembro', icone='reenviar')


def pagar_rec(encerrada=False, toast=''):
    p = F.pagar()
    a = '<button type="button" aria-pressed="true"><span class="r">Vencem esta semana'
    b = '<button type="button" aria-pressed="false"><span class="r">Recorrentes do mês</span><b class="num">8</b>'
    assert a in p and b in p
    p = p.replace(a, a.replace('"true"', '"false"'), 1).replace(b, b.replace('"false"', '"true"'), 1)
    if encerrada:
        p = p.replace('<span class="r">Recorrentes do mês</span><b class="num">8</b><small>lançadas sozinhas em 01/11</small>',
                      '<span class="r">Recorrentes do mês</span><b class="num">7</b><small>ativas · 1 encerrada hoje</small>', 1)
    i = p.index('<section class="folha" aria-labelledby="t-contas">')
    j = p.index('</section>', i) + len('</section>')
    bloco = lista_rec(encerrada)
    if encerrada:
        enc = (f'<ul class="fi-linhas"><li class="fi-linha rc-enc" style="grid-template-columns:minmax(0,1fr) auto"><div class="fi-quem">'
               f'<a href="{FI}rc-encerrada">Sistema de petições</a><small>Fornecedor de software · {R(189.90)} · todo dia 21 · de janeiro a novembro de 2026</small>'
               f'<p class="fi-prox">{ico("encerrar")}Encerrada em 18/11 por Marina Ribeiro · motivo: <b>troquei de fornecedor</b></p></div>'
               f'<div class="fi-lado">{F.selo("neutro", "Encerrada")}</div></li></ul>')
        bloco += F.folha('t-enc', 'Encerradas', enc, sub='Não nascem mais. As contas que já existiam ficam no histórico.', icone='encerrar')
    return p[:i] + bloco + p[j:] + toast


FICHAS = {
    'aluguel': dict(conta='Aluguel da sala', forn='Imobiliária Paulista', cat='Aluguel e condomínio', valor=3600.00, dia=20, forma='boleto', desde='março de 2025',
                    lancadas='21 contas desde março de 2025 · 20 pagas', doc='Boleto anexado',
                    meses=[('novembro de 2026', '20/11', None), ('outubro de 2026', '20/10', '19/10'), ('setembro de 2026', '20/09', '18/09'), ('agosto de 2026', '20/08', '20/08')],
                    hist=[('18/03/2026', '<b>Marina Ribeiro</b> mudou o valor, às 10h12', f'De {R(3400)} para {R(3600)} a partir de abril de 2026. Motivo: reajuste anual do contrato de locação.'),
                          ('02/03/2025', '<b>Marina Ribeiro</b> criou a conta que repete todo mês', f'{R(3400)}, todo dia 20, a partir de março de 2025.')]),
    'peticoes': dict(conta='Sistema de petições', forn='Fornecedor de software', cat='Fornecedores e sistemas', valor=189.90, dia=21, forma='cartão do escritório', desde='janeiro de 2026',
                     lancadas='11 contas desde janeiro de 2026 · 10 pagas', doc='Nota fiscal anexada',
                     meses=[('novembro de 2026', '21/11', None), ('outubro de 2026', '21/10', '21/10'), ('setembro de 2026', '21/09', '21/09'), ('agosto de 2026', '21/08', '21/08')],
                     hist=[('08/01/2026', '<b>Felipe Matos</b> criou a conta que repete todo mês', f'{R(189.90)}, todo dia 21, no cartão do escritório, a partir de janeiro de 2026.')]),
}


def ficha_rec(k, v='ativa', toast=''):
    d = FICHAS[k]
    val = d['valor']
    if v == 'mudada':
        dir_ = (f'<section class="dir campo-ambar" aria-labelledby="t-dir"><p class="sobretitulo" id="t-dir">Próxima conta · valor novo</p>'
                f'<div class="rc-dir-linha"><p class="grande num">{R(3780)}</p>{F.selo("ativo", "nasce em 01/12")}</div>'
                f'<p class="fi-oque"><b>Dezembro, vence 20/12.</b><br>Novembro continua {R(3600)}: já estava lançada.</p>'
                f'<div class="rc-dir-bts"><button class="btn btn-pri" type="button">{ico("lapis")}Mudar valor ou dia</button>'
                f'<button class="btn btn-sec" type="button">{ico("encerrar")}Encerrar</button></div></section>')
    elif v == 'encerrada':
        dir_ = (f'<section class="dir campo-ambar" aria-labelledby="t-dir"><p class="sobretitulo" id="t-dir">Não repete mais</p>'
                f'<div class="rc-dir-linha"><p class="grande num">18/11</p>{F.selo("neutro", "Encerrada")}</div>'
                f'<p class="fi-oque"><b>Nenhuma conta nasce a partir de dezembro.</b><br>A de novembro, de {R(val)}, vence 21/11 e continua a pagar.</p></section>')
    else:
        prox = '20/12' if k == 'aluguel' else '21/12'
        dir_ = (f'<section class="dir campo-ambar" aria-labelledby="t-dir"><p class="sobretitulo" id="t-dir">Próxima conta</p>'
                f'<div class="rc-dir-linha"><p class="grande num">{R(val)}</p>{F.selo("ativo", "nasce em 01/12")}</div>'
                f'<p class="fi-oque"><b>Dezembro, vence {prox}.</b><br>Nasce sozinha no dia 1º, com este valor.</p>'
                f'<div class="rc-dir-bts"><button class="btn btn-pri" type="button" data-janela="janela-mudar">{ico("lapis")}Mudar valor ou dia</button>'
                f'<button class="btn btn-sec" type="button" data-janela="janela-encerrar">{ico("encerrar")}Encerrar</button></div></section>')
    if v == 'encerrada':
        sit = '<span class="selo selo-ativo" style="background:var(--ambar-3);color:var(--vinho)">Encerrada em 18/11/2026</span>'
    else:
        sit = '<span class="selo selo-ativo" style="background:var(--ambar-3);color:var(--vinho)">Repete todo mês</span>'
    vt = R(3600) if v == 'mudada' else R(val)
    cab = (f'<div class="ficha-cab"><div class="esq campo-vinho">{ico("reenviar", "ico estatua")}'
           f'<a class="voltar" href="{FI}rc-lista">{ico("esq", "ico ico-s")}A pagar</a>'
           f'<div class="ident"><div><p class="sobretitulo">Conta que repete todo mês · {d["cat"]}</p><h1>{d["conta"]}</h1>'
           f'<p class="meta">{sit}<span>{d["forn"]} · {vt} · todo dia {d["dia"]} · {d["forma"]}</span><span class="sep" aria-hidden="true"></span><span>desde {d["desde"]}</span></p></div></div></div>{dir_}</div>')
    rows, car = '', ''
    for mes, venc, pago in d['meses']:
        if pago:
            s = F.selo('ok', f'Paga em {pago}', 'check')
        elif v == 'encerrada':
            s = f'<div class="rc-mes">{F.selo("neutro", "A pagar")}<small>a última desta conta</small></div>'
        else:
            s = F.selo('neutro', 'A pagar')
        docs = f'<span class="fi-docs"><a href="#">{ico("doc")}{d["doc"]}</a></span>' if pago or k == 'aluguel' else F.selo('atencao', 'Falta a nota fiscal', 'alerta')
        rows += f'<tr><td><div class="fi-dt"><b>{mes.split(" de ")[0]}</b><small>{mes.split(" de ")[1]}</small></div></td><td class="num">{venc}</td><td class="fi-v num">{R(val)}</td><td>{s}</td><td>{docs}</td></tr>'
        car += (f'<li class="cartao"><div class="c-topo"><div><strong class="c-nome" style="font-size:18px">{mes}</strong><small>vence {venc}</small></div>'
                f'<span class="fi-cartao-v num" style="margin-left:auto">{R(val)}</span></div><div class="c-selos">{s}</div></li>')
    tab = (f'<table class="so-pc fi-tab"><caption class="sr">Contas lançadas</caption><colgroup><col style="width:20%"><col style="width:14%"><col style="width:18%"><col style="width:24%"><col style="width:24%"></colgroup>'
           f'<thead><tr><th scope="col">Mês</th><th scope="col">Vence</th><th scope="col" style="text-align:right">Valor</th><th scope="col">Situação</th><th scope="col">Nota ou boleto</th></tr></thead>'
           f'<tbody>{rows}</tbody></table><ul class="cartoes so-cel" aria-label="Contas lançadas">{car}</ul>'
           f'<p class="mais"><span>{d["lancadas"]}</span><button class="btn btn-sec" type="button">Ver todas</button></p>')
    lanc = F.folha('t-lanc', 'Contas lançadas', tab, sub='Cada mês é uma conta própria, com o seu boleto e a sua baixa.', icone='agenda')
    evs = ''
    if v == 'mudada':
        evs += (f'<li><time>18/11</time><span class="pto forte" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> mudou o valor, às 16h02<span class="selo selo-ativo">Novo</span></p>'
                f'<small>De {R(3600)} para {R(3780)} a partir de dezembro de 2026. Novembro não mudou. Motivo: reajuste anual do contrato de locação (IGP-M).</small></div></li>')
    if v == 'encerrada':
        evs += (f'<li><time>18/11</time><span class="pto forte" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> encerrou a recorrência, às 16h05<span class="selo selo-ativo">Novo</span></p>'
                f'<small>Nenhuma conta nasce a partir de dezembro de 2026. A de novembro continua a pagar. Motivo: troquei de fornecedor. '
                f'"Passamos a usar o sistema do novo fornecedor a partir de dezembro."</small></div></li>')
    for dt, t, s in d['hist']:
        evs += f'<li><time>{dt[:5]}<span class="sr">/{dt[6:]}</span></time><span class="pto" aria-hidden="true"></span><div><p>{t}</p><small>{s}</small></div></li>'
    hist = F.folha('t-mud', 'Mudanças', f'<div class="eventos-dia" style="padding-top:0"><ol class="eventos">{evs}</ol></div>'
                   f'<p class="rc-nota">{ico("cadeado")}<span>Mudar ou encerrar não mexe nas contas pagas e não apaga nada. Tudo fica aqui, com o nome de quem fez e a hora.</span></p>', icone='historico')
    return f'<div class="fi">{cab}<div class="fi-grade"><div class="fi-col">{lanc}</div><aside class="fi-col" aria-label="Mudanças">{hist}</aside></div></div>{toast}'


def sel(id_, rot, ops, escolhido='', ajuda='', erro='', foco=False):
    o = ''.join(f'<option{" selected" if x == escolhido else ""}{" value=\"\"" if x.startswith("Escolha") else ""}>{H(x)}</option>' for x in ops)
    desc, a, aj, er = [], '', '', ''
    if ajuda and not erro:
        aj = f'<p class="ajuda" id="{id_}-aj">{ajuda}</p>'; desc.append(f'{id_}-aj')
    if erro:
        er = f'<p class="erro-msg" id="{id_}-er">{ico("alerta", "ico ico-s")}{erro}</p>'; desc.append(f'{id_}-er'); a += ' aria-invalid="true"'
    if desc:
        a += f' aria-describedby="{" ".join(desc)}"'
    if foco:
        a += ' data-foco'
    return f'<div class="campo"><label for="{id_}">{rot}</label><select class="entrada" id="{id_}"{a}>{o}</select>{aj}{er}</div>'


def area(id_, rot, valor, ajuda='', opc=True):
    o = ' <span class="opcional">(opcional)</span>' if opc else ''
    aj = f'<p class="ajuda" id="{id_}-aj">{ajuda}</p>' if ajuda else ''
    a = f' aria-describedby="{id_}-aj"' if ajuda else ''
    return f'<div class="campo"><label for="{id_}">{rot}{o}</label><textarea class="entrada" id="{id_}" rows="3"{a}>{H(valor)}</textarea>{aj}</div>'


def efeito(itens, titulo='O que vai acontecer'):
    li = ''.join(f'<li>{ico(i)}<span>{t}</span></li>' for i, t in itens)
    return f'<div class="campo"><p class="rc-efeito-t">{titulo}</p><ul class="rc-efeito">{li}</ul></div>'


MESES_MUDAR = ['Escolha o mês', 'novembro de 2026 · já lançada, ainda não paga', 'dezembro de 2026 · a próxima, nasce em 01/12',
               'janeiro de 2027', 'fevereiro de 2027', 'março de 2027']
DIAS = [f'Todo dia {d}' + (' (o de hoje)' if d == 20 else '') for d in range(1, 29)] + ['No último dia do mês']


def j_mudar(erros=False):
    res = aviso('urgencia', 'Falta acertar 2 pontos, marcados abaixo.', 'Nada foi mudado ainda.') if erros else ''
    desde = sel('rc-desde', 'A partir de', MESES_MUDAR, '' if erros else MESES_MUDAR[2],
                ajuda='Se o reajuste já vale para novembro, escolha novembro: a conta lançada e ainda não paga muda junto. As pagas nunca mudam.',
                erro='Escolha o mês em que o valor novo começa.' if erros else '', foco=erros)
    valor = F.campo('rc-valor', 'Valor novo', '' if erros else '3.780,00', im='decimal', foco=not erros, ajuda=f'Hoje: {R(3600)}.',
                    erro=f'Escreva o valor novo. Hoje é {R(3600)}; se só o dia mudou, repita o valor.' if erros else '')
    dia = sel('rc-dia', 'Vence', DIAS, DIAS[19], ajuda='Para mudar só o valor, deixe o dia como está.')
    corpo = (res
             + f'<div class="fi-alvo">{ico("reenviar")}<div><strong>Hoje: {R(3600)}, todo dia 20</strong><small>Imobiliária Paulista · aluguel e condomínio · boleto · desde março de 2025</small></div></div>'
             + desde + f'<div class="fi-dois">{valor}{dia}</div>'
             + F.campo('rc-motivo', 'Por que mudou', 'Reajuste anual do aluguel (IGP-M)', opc=True, ajuda='Fica no histórico da conta.'))
    if not erros:
        corpo += efeito([('check', f'<b>Agosto a outubro</b>, pagas: não mudam.'),
                         ('check', f'<b>Novembro</b>, já lançada ({R(3600)}, vence 20/11): não muda.'),
                         ('reenviar', f'<b>De dezembro em diante:</b> {R(3780)}, todo dia 20. A de dezembro nasce em 01/12.')])
    pe = (f'<button class="btn btn-sec" type="button" data-fechar>Cancelar</button>'
          f'<a class="btn btn-pri" href="{FI}rc-mudado">{ico("check")}Salvar a mudança</a>')
    return janela('janela-mudar', 'Aluguel da sala · repete todo mês', 'Mudar valor ou dia',
                  'Vale para as contas que ainda vão nascer, a partir do mês que você escolher.', corpo, pe, abrir=True)


MOTIVOS = ['Escolha o motivo', 'O contrato com o fornecedor terminou', 'Troquei de fornecedor', 'O escritório não usa mais', 'A conta vai ser lançada de outro jeito', 'Outro']


def j_encerrar(erro=False):
    res = aviso('urgencia', 'Falta acertar 1 ponto, marcado abaixo.', 'A recorrência continua ativa.') if erro else ''
    ate = sel('rc-ate', 'Não nasce mais a partir de', ['dezembro de 2026 · a próxima', 'janeiro de 2027', 'fevereiro de 2027', 'março de 2027'],
              'dezembro de 2026 · a próxima', ajuda='A de novembro já nasceu em 01/11. Para ela, veja a opção abaixo.', foco=not erro)
    nov = (f'<label class="opcao"><input class="marcar" type="checkbox"><span>Cancelar também a de novembro'
           f'<small>{R(189.90)}, vence 21/11, ainda não paga. Marque só se ela não vai ser cobrada: fica no histórico como cancelada, com o motivo.</small></span></label>')
    motivo = sel('rc-mot', 'Por que encerrar', MOTIVOS, MOTIVOS[0] if erro else 'Troquei de fornecedor',
                 erro='Escolha o motivo. Ele fica no histórico da conta e ajuda quem olhar depois.' if erro else '', foco=erro)
    det = area('rc-det', 'Detalhe', 'Passamos a usar o sistema do novo fornecedor a partir de dezembro.' if not erro else '', ajuda='Aparece junto com o motivo.')
    corpo = (res
             + f'<div class="fi-alvo">{ico("reenviar")}<div><strong>Sistema de petições · {R(189.90)}, todo dia 21</strong><small>Fornecedor de software · cartão do escritório · desde janeiro de 2026</small></div></div>'
             + ate + nov + motivo + det
             + efeito([('encerrar', '<b>De dezembro em diante:</b> nenhuma conta nasce.'),
                       ('check', f'<b>Novembro</b> ({R(189.90)}, vence 21/11): continua a pagar.'),
                       ('historico', '<b>Janeiro a outubro</b>, pagas: ficam no histórico e na exportação para o contador.')]))
    pe = (f'<button class="btn btn-sec" type="button" data-fechar>Cancelar</button>'
          f'<a class="btn btn-pri" href="{FI}rc-encerrada">{ico("encerrar")}Encerrar a recorrência</a>')
    return janela('janela-encerrar', 'Sistema de petições · repete todo mês', 'Encerrar a recorrência',
                  'Nada se apaga: as contas que já existem ficam como estão. Só deixam de nascer contas novas.', corpo, pe, abrir=True)


# ---------------------------------------------------------------- estados do Financeiro
T = ''
AR = lambda titulo='Hélio Batista Corrêa': F.A('A receber', titulo, 'Financeiro|A receber|Hélio Batista Corrêa')
T += tpl('rb-ficha', ficha_recibo() + F.j_registrar(), **AR())
T += tpl('rb-confirmacao', ficha_recibo(toast_acoes('Recebimento registrado.',
         'A parcela 3/6 (outubro) foi baixada. O recibo nº 2026-0187 foi enviado a Marta Corrêa pelo WhatsApp.', BTN_RECIBO)) + F.j_registrar(), **AR())
T += tpl('rb-confirmacao-sem-envio', ficha_recibo(toast_acoes('Recebimento registrado.',
         'A parcela 3/6 (outubro) foi baixada e o recibo nº 2026-0187 está pronto. Ele não foi mandado pelo WhatsApp.', BTN_RECIBO)) + F.j_registrar(), **AR())
T += tpl('rb-quem-pagou', F.ficha_contrato() + j_registrar_pagador(), **AR('Registrar recebimento'))

AP = lambda titulo, conta=None: F.A('A pagar', titulo, f'Financeiro|A pagar|{conta}' if conta else None)
T += tpl('rc-lista', pagar_rec(), **AP('Recorrentes'))
T += tpl('rc-ficha', ficha_rec('aluguel'), **AP('Aluguel da sala', 'Aluguel da sala'))
T += tpl('rc-mudar', ficha_rec('aluguel') + j_mudar(), **AP('Mudar valor ou dia', 'Aluguel da sala'))
T += tpl('rc-mudar-erros', ficha_rec('aluguel') + j_mudar(True), **AP('Mudar valor ou dia', 'Aluguel da sala'))
T += tpl('rc-mudado', ficha_rec('aluguel', 'mudada', toast('Valor novo a partir de dezembro.',
         f'Aluguel da sala passa a {R(3780)}, todo dia 20, a partir de dezembro. Novembro e as pagas não mudaram.')), **AP('Aluguel da sala', 'Aluguel da sala'))
T += tpl('rc-ficha-peticoes', ficha_rec('peticoes'), **AP('Sistema de petições', 'Sistema de petições'))
T += tpl('rc-encerrar', ficha_rec('peticoes') + j_encerrar(), **AP('Encerrar a recorrência', 'Sistema de petições'))
T += tpl('rc-encerrar-erro', ficha_rec('peticoes') + j_encerrar(True), **AP('Encerrar a recorrência', 'Sistema de petições'))
T += tpl('rc-encerrada', ficha_rec('peticoes', 'encerrada', toast('Recorrência encerrada.',
         'Sistema de petições não nasce mais a partir de dezembro. A conta de novembro continua a pagar, e o histórico ficou como estava.')),
         **AP('Sistema de petições', 'Sistema de petições'))
T += tpl('rc-lista-encerrada', pagar_rec(encerrada=True), **AP('Recorrentes'))


def links(out):
    """Os links da moldura levam às telas aprovadas vizinhas (como no carnê)."""
    out = out.replace('href="moldura.html', 'href="../portal-v1/moldura.html').replace('href="equipe.html"', 'href="../portal-v1/equipe.html"')
    out = out.replace('href="escritorio.html"', 'href="../portal-carne/escritorio.html?estado=recebimento"')
    return out


def montar_pagina(out, templates, css_extra=''):
    out = out.replace('</style>', css_extra + CSS_RR + '\n</style>', 1)
    out = out.replace('<div class="app">', SPRITE_RR + '\n<div class="app">', 1)
    i = out.rindex('<script>')
    out = out[:i] + templates + out[i:]
    return links(out)


fin = montar_pagina(F.out, T)
fin = fin.replace('"estado":"resumo"', '"estado":"rb-confirmacao"', 1)
open(f'{SAIDA}/financeiro.html', 'w', encoding='utf-8').write(fin)
print('financeiro + recibo + recorrente ok', T.count('<template data-est='), 'estados novos')

# ================================================================= 3. PEDIDOS DE CONTRATO (IN-01)
PEDIDOS = [
    dict(cli='Benedito Souza Lima', href='comercial.html?estado=proposta-aceita', prop='P-2026-014', srv='Aposentadoria por idade', aceita='17/11',
         valor='R$ 2.000,00 mais êxito', hon=[('parcelado', ' 3 ×'), ('exito', ' 30%'), ('recorrente', ' 30%')], quem='Diego Almeida', quando='hoje, às 11h40', gerar=CO + 'novo'),
    dict(cli='Daniela Rocha Mendes', href='comercial.html?estado=propostas', prop='P-2026-015', srv='Revisão de contrato bancário', aceita='18/11',
         valor='R$ 1.500,00 mais êxito', hon=[('fixo', ' R$ 1.500,00'), ('exito', ' 20%')], quem='Diego Almeida', quando='hoje, às 14h05', gerar=CO + 'novo'),
]


def bloco_pedidos(n):
    itens = ''
    for p in PEDIDOS[:n]:
        selos = '<div class="hn-selos">' + ''.join(C.selo_tipo(k, v) for k, v in p['hon']) + '</div>'
        itens += (f'<li class="pc-item"><div class="pc-quem"><a class="pc-nome" href="{p["href"]}">{p["cli"]}</a>'
                  f'<small>{p["prop"]} · {p["srv"]} · aceita em {p["aceita"]}</small></div>'
                  f'<div class="pc-hon"><span class="pc-valor num">{p["valor"]}</span>{selos}</div>'
                  f'<p class="pc-ped">{ico("enviar")}<span>Pedido por <b>{p["quem"]}</b><small>{p["quando"]} · pelo Comercial</small></span></p>'
                  f'<a class="btn btn-sec" href="{p["gerar"]}" aria-label="Gerar o contrato de {p["cli"]}">{ico("pena")}Gerar o contrato</a></li>')
    rot = 'pedido' if n == 1 else 'pedidos'
    return (f'<section class="folha pc-bloco" aria-labelledby="t-pc"><div class="folha-cab"><div><h2 id="t-pc">Pedidos de contrato <span class="pc-n" aria-label="{n} {rot}">{n}</span></h2>'
            f'<p class="sub">Propostas aceitas que o Comercial pediu para virar contrato. O contrato nasce com as condições da proposta; o pedido sai daqui quando o contrato é gerado.</p></div></div>'
            f'<ul class="pc-lista">{itens}</ul></section>')


def contratos_pedidos(n):
    orig = C.CONTRATOS
    C.CONTRATOS = [c for c in orig if c[0] != 'C-2026-033']  # o contrato de Benedito ainda não existe
    h = C.contratos()
    C.CONTRATOS = orig
    for a, b in [('<b>15 contratos</b> · 14 ativos e 1 em elaboração', '<b>14 contratos</b> · todos ativos'),
                 ('Ativos e em elaboração (15)', 'Ativos e em elaboração (14)'), ('Mostrando 6 de 15', 'Mostrando 5 de 14')]:
        assert a in h, a
        h = h.replace(a, b, 1)
    alvo = '<section class="folha" aria-labelledby="t-cl"'
    return h.replace(alvo, bloco_pedidos(n) + alvo, 1)


# Painel do sino: as peças do sino aprovado (sino.py), lidas em partes e sem mudança
_src = open(os.path.join(AQUI, 'sino.py'), encoding='utf-8').read()
S = {'ico': ico, 'aviso': aviso, 'estado': estado}
exec(compile(_src[_src.index('CSS_SI = r"""'):_src.index('# Página de fundo')], 'sino.py', 'exec'), S)
exec(compile(_src[_src.index('SCRIPT_SI = r"""'):_src.index('\nout = pagina(')], 'sino.py', 'exec'), S)
S['ICO']['pedido'] = 'pena'
item_pc = S['item']('pedido', '<b>Diego Almeida</b> pediu o contrato de <b>Benedito Souza Lima</b>',
                    'Proposta P-2026-014, aposentadoria por idade, aceita em 17/11: R$ 2.000,00 mais êxito. O contrato nasce com as condições da proposta.',
                    'Gerar o contrato', CO + 'novo', '11h40', True)
lista_si = S['marina'](so_novos=True).replace('<ul class="si-ul">', '<ul class="si-ul">' + item_pc, 1)
painel = S['painel']('<b>5 novos</b> · 8 nos últimos 30 dias', lista_si, 5, filtro='novos')
# O script do sino só roda na página que tem o painel aberto
SCRIPT_SI = S['SCRIPT_SI'].replace('(function(){', '(function(){\n  if(!document.getElementById("painel-avisos")) return;', 1)

TC = ''
AC = dict(area='contratos', secao='Contratos', atual='contratos', trilha='Contratos|Contratos', titulo='Contratos')
TC += tpl('pc-um', contratos_pedidos(1), **AC)
TC += tpl('pc-dois', contratos_pedidos(2), **AC)
TC += tpl('pc-sino', contratos_pedidos(1) + painel, novos=5, **AC)
TC += tpl('pc-vazio', C.contratos(), **AC)
ct = montar_pagina(C.out, TC, S['CSS_SI'])
ct = ct.replace('</body>', SCRIPT_SI + '\n</body>', 1)
open(f'{SAIDA}/contratos.html', 'w', encoding='utf-8').write(ct)
print('contratos + pedidos ok', TC.count('<template data-est='), 'estados novos')

# ---------------------------------------------------------------- Comercial: o pedido feito (lado de Diego)
def proposta_pedida():
    f = CM.ficha_prop_ben(True)
    bt = f'<button class="btn btn-pri" type="button">{ico("enviar")}Pedir o contrato</button>'
    tx = '<p class="hn-oque">Quem cria contratos é quem tem a área Contratos: <b>Marina Ribeiro e Felipe Matos</b>. O contrato nasce com estas condições.</p>'
    assert bt in f and tx in f
    f = f.replace(tx, '<p class="hn-oque"><b>Você pediu hoje, às 11h40.</b><br>Marina Ribeiro e Felipe Matos receberam o aviso no sino. Quando o contrato for gerado, você também recebe um aviso.</p>', 1)
    f = f.replace(bt, f'<p class="pc-pedido">{C.selo("andamento", "Contrato pedido", "relogio")}</p>', 1)
    d = '<div class="eventos-dia"><h3>17/11/2026</h3>'
    assert d in f
    f = f.replace(d, ('<div class="eventos-dia"><h3>18/11/2026</h3><ol class="eventos"><li><time>11h40</time><span class="pto forte" aria-hidden="true"></span>'
                      f'<div><p><b>Diego Almeida</b> pediu o contrato{C.selo("andamento", "Pedido")}</p><small>Aviso no sino de Marina Ribeiro e Felipe Matos, que têm a área Contratos.</small></div></li></ol></div>') + d, 1)
    t = toast('Contrato pedido.', 'Marina Ribeiro e Felipe Matos receberam o aviso, com o link desta proposta.')
    return f + t


TM = tpl('pc-pedido-feito', proposta_pedida(), quem='comercial', area='comercial', secao='Propostas', atual='comercial',
         trilha='Comercial|Propostas|P-2026-014', titulo='P-2026-014')
cm = montar_pagina(CM.out, TM)
open(f'{SAIDA}/comercial.html', 'w', encoding='utf-8').write(cm)
print('comercial + pedido ok')
