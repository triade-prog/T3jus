# Portal · Contratos › ficha do contrato › Recebimentos › "Pago antes do T3jus": o botão "Não foi paga" (F3.84; VA-05; PT-03, PT-09, PT-10).
# Parte da tela aprovada em portal-pendencias-pequenas (contrato_pago_antes.py, sem mudança, lido até os estados; ele lê o
# contratos.py aprovado) e da pergunta 5 de lá: só para quem tem Financeiro, com motivo obrigatório e no histórico.
# A parcela passa para A receber sem desfazer a importação. Peças novas com prefixo np-.
# Gera contrato-nao-paga.html (ficha do contrato) e financeiro-nao-paga.html (a parcela em A receber).
# Uso: python3 nao_paga.py <pasta-saida>
import os, sys, tempfile

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA_NP = sys.argv[1] if len(sys.argv) > 1 else 'saida'
_src = open(os.path.join(AQUI, 'contrato_pago_antes.py'), encoding='utf-8').read()
_src = _src[:_src.rindex('# ---------------------------------------------------------------- estados')]
exec(compile(_src, 'contrato_pago_antes.py', 'exec'), globals())
import extra as X

U = 'contrato-nao-paga.html?estado='
FIN = 'financeiro-nao-paga.html?estado='
IMPORTACAO = '../portal-importacao/importacao.html?estado='

SPRITE_NP = ('<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">'
             '<symbol id="i-desfazer" viewBox="0 0 24 24"><path d="M9 5 4 10l5 5"/><path d="M4 10h11a5 5 0 0 1 0 10h-3"/></symbol>'
             '<symbol id="i-sino-mudo" viewBox="0 0 24 24"><path d="M6 16.5V11a6 6 0 0 1 9.2-5.1"/><path d="M18 10.2v6.3l1.5 2H8"/><path d="M10 21h4"/><path d="M4 20 20 4"/></symbol>'
             '</svg>')

CSS_NP = r"""
/* ==========================================================================
   Recebimentos · "Não foi paga" (prefixo np-). Só tokens e pares já aprovados.
   ========================================================================== */
.np-acao{text-align:right;white-space:nowrap;padding-right:24px!important}
.pg .hn-tab td.np-acao{color:var(--texto)}
.np-o small{display:block;font-size:12px;color:var(--texto-2);line-height:1.4;margin-top:2px}
.np-o .btn{margin-top:6px}
.np-caminhos{margin:0;padding:12px 24px 18px;display:grid;gap:10px;border-top:1px solid var(--divisor)}
.np-caminhos li{display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.5;color:var(--texto-2);list-style:none}
.np-caminhos li .ico{flex:none;margin-top:2px;color:var(--vinho)}
.np-caminhos li b{color:var(--texto);font-weight:500}
.np-caminhos a{color:var(--vinho);font-weight:500}
.np-caminhos .np-ac{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px}
.janela.np-janela{width:min(640px,calc(100vw - 32px))}
.np-oque{margin:0;padding:12px 16px;border-radius:var(--raio);background:var(--sal-2);display:grid;gap:8px;list-style:none}
.np-oque li{display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.5}
.np-oque li .ico{flex:none;margin-top:2px;color:var(--vinho)}
.np-oque b{font-weight:600}
.np-parc{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px 16px;margin:0;padding:12px 16px;border:1px solid var(--borda-folha);border-radius:var(--raio)}
.np-parc dt{font-size:12px;color:var(--texto-2)}
.np-parc dd{margin:0;font-weight:500}
.np-venc .x-ops-l{grid-template-columns:1fr}
.np-data{margin:4px 0 0 34px;max-width:240px}
.np-aviso-auto{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:var(--raio);background:var(--ambar-3);color:var(--tinta);font-size:13px;line-height:1.5}
.np-aviso-auto .ico{flex:none;margin-top:2px;color:var(--vinho)}
.np-aviso-auto b{font-weight:600}
.np-pe-nota{margin-right:auto;align-self:center;font-size:12px;color:var(--texto-2);max-width:300px;line-height:1.45}
.np-quem{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 12px;margin:0;font-size:13px}
.np-quem dt{color:var(--texto-2)}
.np-quem dd{margin:0;font-weight:500}
.np-hist{padding:0 24px 18px}
.np-hist .eventos small{display:block}
.np-hist q{font-family:var(--serifa);font-style:italic;font-size:15px;color:var(--texto)}
.np-hist .eventos li>div p{margin:0}
.dir .selo-urgente{background:var(--vinho-3);color:#fff}
@media (max-width:760px){
  .np-caminhos{padding:12px 16px 16px}
  .np-caminhos .np-ac .btn{flex:1 1 100%}
  .np-parc{grid-template-columns:1fr 1fr}
  .np-data{margin-left:0;max-width:none}
  .janela.np-janela{width:100%}
  .np-pe-nota{display:none}
  .np-hist{padding:0 16px 16px}
  .pg .hn-tab td.np-acao{justify-content:stretch}
  .pg .hn-tab td.np-acao .btn{width:100%}
}
"""

ROSA = 'Rosa Almeida'


# ---------------------------------------------------------------- folha "Pago antes do T3jus" com o botão
def folha_np(parcelas=(1, 2), botao=True, financeiro_quem='marina'):
    datas = {1: '10/10/2026', 2: '10/11/2026'}
    linhas = []
    for n in parcelas:
        cel = [f'<b class="num">{datas[n]}</b>', f'Parcela {n} de 6', selo_tipo('parcelado'), f'<span class="num hn-valor-c">{brl(80000)}</span>',
               selo('neutro', 'Paga antes do T3jus')]
        if botao:
            cel.append(f'<button class="btn btn-sec btn-compacto" type="button" data-janela="janela-np" aria-label="Não foi paga: parcela {n} de 6, de {datas[n]}">Não foi paga</button>')
        linhas.append((cel, ''))
    cols = ['Vencimento', 'O quê', 'Condição', 'Valor', 'Como veio'] + (['<span class="sr">Ação</span>'] if botao else [])
    larg = ['13%', '26%', '16%', '13%', '18%', '14%'] if botao else ['14%', '34%', '18%', '15%', '19%']
    tab = tabela('Parcelas pagas antes do T3jus', cols, linhas, larg)
    if botao:
        tab = tab.replace('<td data-r="Ação">', '<td data-r="" class="np-acao">')
    q = len(parcelas)
    nota = (f'<p class="pg-nota">{ico("escudo")}<span><b>Só informação.</b> Não entram nos totais acima, nem em A receber, nem no Caixa, e não geram recibo: '
            f'o pagamento foi feito antes do T3jus, e a planilha não diz quando, como nem a quem.</span></p>')
    soma = f'<p class="pg-soma"><span>Soma das parcelas pagas antes, fora dos totais</span><b class="num">{brl(80000 * q)}</b></p>'
    origem = (f'<dl class="pg-origem"><div><dt>Veio da planilha</dt><dd>clientes-e-contratos-2026.xlsx<small>linha 2</small></dd></div>'
              f'<div><dt>Importada por</dt><dd>Marina Ribeiro{" (você)" if financeiro_quem == "marina" else ""}<small>17/11/2026, às 15h42</small></dd></div>'
              f'<div><dt>Na planilha</dt><dd>“Parcelas pagas: 2”<small>as 2 primeiras de 6</small></dd></div></dl>')
    if botao:
        cam = (f'<ul class="np-caminhos" aria-label="Se a planilha estava errada">'
               f'<li>{ico("moeda")}<span><b>Uma parcela não foi paga?</b> Use “Não foi paga” na linha dela. Ela passa para A receber e o resto da importação fica como está.</span></li>'
               f'<li>{ico("desfazer")}<span><b>A planilha inteira estava errada?</b> Até 24/11 dá para desfazer a importação, corrigir a planilha e importar de novo.'
               f'<span class="np-ac"><a class="btn btn-sec" href="{IMPORTACAO}historico">{ico("historico")}Ver a importação</a>'
               f'<a class="btn btn-sec" href="{IMPORTACAO}desfazer">{ico("desfazer")}Desfazer a importação</a></span></span></li></ul>')
    else:
        cam = (f'<ul class="np-caminhos" aria-label="Se a planilha estava errada">'
               f'<li>{ico("cadeado")}<span><b>Alguma não foi paga?</b> Quem tem a área Financeiro passa a parcela para A receber: Marina Ribeiro ou Diego Almeida. '
               f'Desfazer a importação, até 24/11, é com Marina Ribeiro, que importou.'
               f'<span class="np-ac"><a class="btn btn-sec" href="{IMPORTACAO}historico">{ico("historico")}Ver a importação</a></span></span></li></ul>')
    sub = (f'{q} parcela{"s" if q > 1 else ""} que a planilha trouxe como já paga{"s" if q > 1 else ""}.'
           + (' A parcela 2 passou para A receber hoje.' if q == 1 else ''))
    return (f'<section class="folha pg" aria-labelledby="t-pg" id="pago-antes" style="overflow:hidden"><div class="folha-cab"><div>'
            f'<h2 id="t-pg">Pago antes do T3jus</h2><p class="sub">{sub}</p></div></div>'
            f'{nota}{tab}{soma}{origem}{cam}</section>')


def cab_rosa(depois=False):
    if depois:
        d = (f'<section class="dir campo-ambar" aria-labelledby="t-pr"><p class="sobretitulo" id="t-pr">Recebimento em atraso</p>'
             f'<div class="hn-dir-linha"><p class="grande">10/11</p>{selo("urgente", "Vencida há 8 dias", "alerta")}</div>'
             f'<p class="hn-oque"><b>Parcela 2 de 6 · R$ 800,00</b><br>no Financeiro, em A receber</p>'
             f'<a class="btn btn-pri" href="{FIN}a-receber">{ico("carteira")}Ver em A receber</a></section>')
    else:
        d = dir_c('10/12', 'R$ 800,00', 'Parcela 3 de 6')
    return ficha_cab_c('C-2026-041', ROSA, SIT_ATIVO, 'Aposentadoria por idade', d)


def abas_np(q):
    return (f'<nav class="abas" aria-label="Seções do contrato"><a data-aba="contrato" href="#">Contrato</a>'
            f'<a data-aba="recebimentos" href="#">Recebimentos<span class="q">{q}</span></a><a data-aba="documentos" href="#">Documentos<span class="q">1</span></a></nav>')


def prog_antes(financeiro=True):
    rows = [('10/12/2026', 'Parcela 3 de 6', 'parcelado', 80000, PREV),
            ('10/01/2027', 'Parcela 4 de 6', 'parcelado', 80000, PREV),
            ('10/02/2027', 'Parcela 5 de 6', 'parcelado', 80000, PREV)]
    tot = [('Recebido até hoje', 'R$ 0,00', '<p class="pg-tot">Só o que passou pelo T3jus. Os <a href="#pago-antes">R$ 1.600,00 pagos antes</a> ficam fora.</p>', True),
           ('Programado até 10/03/2027', 'R$ 3.200,00', '<p class="pg-tot">4 parcelas de R$ 800,00</p>', True),
           ('Depende do caso', 'Nada', '', False)]
    return programacao(rows, tot, 'Gerada das condições do contrato. Mostra os próximos 3 meses; a parcela 6 vence em 10/03/2027.', financeiro)


def prog_depois():
    o2 = (f'<span class="np-o">Parcela 2 de 6<small>Era “paga antes do T3jus” até hoje</small>'
          f'<button class="btn btn-sec btn-compacto" type="button" data-janela="janela-volta" aria-label="Foi paga, sim: parcela 2 de 6">{ico("desfazer")}Foi paga, sim</button></span>')
    rows = [('10/11/2026', o2, 'parcelado', 80000, ('urgente', 'Vencida há 8 dias', 'alerta')),
            ('10/12/2026', 'Parcela 3 de 6', 'parcelado', 80000, PREV),
            ('10/01/2027', 'Parcela 4 de 6', 'parcelado', 80000, PREV),
            ('10/02/2027', 'Parcela 5 de 6', 'parcelado', 80000, PREV)]
    tot = [('Recebido até hoje', 'R$ 0,00', '<p class="pg-tot">Só o que passou pelo T3jus. Os <a href="#pago-antes">R$ 800,00 pagos antes</a> ficam fora.</p>', True),
           ('Programado até 10/03/2027', 'R$ 4.000,00', '<p class="pg-tot">5 parcelas de R$ 800,00 · 1 vencida, R$ 800,00</p>', True),
           ('Depende do caso', 'Nada', '', False)]
    return programacao(rows, tot, 'Gerada das condições do contrato. Mostra a parcela vencida e os próximos 3 meses; a parcela 6 vence em 10/03/2027.')


def historico_np(volta=False):
    evs = ''
    evs += (f'<li><time>18/11</time><span class="pto forte" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> passou a parcela 2 de 6 para A receber, às 10h14'
            f'{selo("ativo", "Novo")}</p><small>Não foi paga. Vencimento mantido: 10/11/2026. Motivo: '
            f'<q>A planilha dizia 2 pagas, mas Rosa só pagou a primeira. Ela confirmou por telefone hoje.</q></small>'
            f'<small>A importação continua como estava. Nenhum aviso automático saiu para Rosa.</small></div></li>')
    evs += ('<li><time>17/11</time><span class="pto" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> importou o contrato, às 15h42</p>'
            '<small>clientes-e-contratos-2026.xlsx, linha 2 · 6 parcelas de R$ 800,00, 2 como pagas antes do T3jus</small></div></li>')
    return (f'<section class="folha" aria-labelledby="t-hr"><div class="folha-cab"><div><h2 id="t-hr">{ico("historico")}Histórico dos recebimentos</h2>'
            f'<p class="sub">Nada é apagado</p></div></div><div class="np-hist eventos-dia"><ol class="eventos">{evs}</ol></div></section>')


def ficha(depois=False, financeiro=True):
    if depois:
        corpo = f'{prog_depois()}{folha_np((1,), True)}{historico_np()}'
    else:
        corpo = f'{prog_antes(financeiro)}{folha_np((1, 2), financeiro, "marina" if financeiro else "felipe")}'
    return f'<div class="hn">{cab_rosa(depois)}{abas_np(5 if depois else 4)}<div class="pg-grade">{corpo}</div></div>'


# ---------------------------------------------------------------- janela "Não foi paga"
def j_np(v='padrao'):
    erro = v == 'erros'
    motivo = '' if erro else 'A planilha dizia 2 pagas, mas Rosa só pagou a primeira. Ela confirmou por telefone hoje.'
    topo = ''
    if erro:
        topo = aviso('urgencia', 'Falta o motivo.', 'A parcela ainda está em “Pago antes do T3jus”. Escreva o motivo e passe de novo.')
    if v == 'falha':
        topo = aviso('urgencia', 'Não deu para passar a parcela. Nada mudou.',
                     'Ela continua em “Pago antes do T3jus”, e o que você escreveu está aqui. Tente de novo. Se continuar, fale com o suporte e diga o código NP-7Q2K.',
                     papel='alert')
    if v == 'conflito':
        topo = aviso('atencao', 'Diego Almeida mexeu nesta parcela enquanto a janela estava aberta.',
                     'Hoje, às 10h13, ele a passou para A receber, com o vencimento 10/11/2026 e o motivo “Cliente avisou que só pagou a primeira”. '
                     'O que você escreveu não foi salvo, para não registrar duas vezes.', icone='pessoas', papel='alert')
    parc = (f'<dl class="np-parc"><div><dt>Parcela</dt><dd>2 de 6</dd></div><div><dt>Vencimento na planilha</dt><dd class="num">10/11/2026</dd></div>'
            f'<div><dt>Valor</dt><dd class="num">{brl(80000)}</dd></div></dl>')
    oque = (f'<ul class="np-oque" aria-label="O que vai acontecer">'
            f'<li>{ico("seta")}<span>Sai de “Pago antes do T3jus” e entra na programação e em <b>A receber</b>, com a marca “era paga antes do T3jus”.</span></li>'
            f'<li>{ico("moeda")}<span>O programado do contrato passa de R$ 3.200,00 para <b>R$ 4.000,00</b>. Recebido até hoje não muda.</span></li>'
            f'<li>{ico("pessoa-mais")}<span>A cobrança fica com Marina Ribeiro, que cuida do contrato, com a próxima ação “Falar com Rosa Almeida” amanhã. Dá para mudar em A receber.</span></li>'
            f'<li>{ico("historico")}<span>A importação continua como está. Tudo fica no histórico do contrato, com o motivo. Nada se apaga.</span></li></ul>')
    venc = X.opcoes_radio('np-venc', 'Que vencimento a parcela ganha', [
        ('orig', 'Manter 10/11/2026, o da planilha', 'Entra já vencida, há 8 dias, em Vencidas. É a data do contrato.'),
        ('nova', 'Outra data, combinada com a cliente', 'A parcela entra como a vencer, na data escolhida.')], 'orig', cls='np-venc')
    f_mot = X.area_texto('np-motivo', 'Por que não foi paga', motivo,
                         ajuda='Fica no histórico do contrato. Por exemplo: a planilha estava errada, ou a cliente diz que não pagou.',
                         erro='Escreva o motivo. Sem ele a parcela não muda.' if erro else '', foco=erro)
    auto = (f'<p class="np-aviso-auto">{ico("sino-mudo")}<span><b>Nenhum aviso automático sai para Rosa por esta parcela.</b> Até hoje ela constava como paga: '
            f'fale com Rosa antes de cobrar. Se escolher outra data, os lembretes de antes do vencimento voltam a valer a partir dela.</span></p>')
    corpo = topo + parc + oque + venc + f_mot + auto
    if v == 'conflito':
        corpo = topo + parc + (f'<dl class="np-quem"><dt>Quem mudou</dt><dd>Diego Almeida, hoje às 10h13</dd><dt>Como ficou</dt><dd>Em A receber, vencida desde 10/11/2026</dd>'
                               f'<dt>Você abriu a janela</dt><dd>às 10h11</dd></dl>')
        pe = (f'<button class="btn btn-sec" type="button" data-fechar>Fechar</button>'
              f'<a class="btn btn-pri" href="{U}feito" data-foco>{ico("olho")}Ver como ficou</a>')
    else:
        nota = '<span class="np-pe-nota">Só quem tem a área Financeiro faz esta mudança.</span>'
        rot = 'Tentar de novo' if v == 'falha' else 'Passar para A receber'
        foco = ' data-foco' if v == 'falha' else ''
        pe = (f'{nota}<button class="btn btn-sec" type="button" data-fechar>Cancelar</button>'
              f'<a class="btn btn-pri" href="{U}feito"{foco}>{ico("reenviar" if v == "falha" else "check")}{rot}</a>')
    if v == 'padrao':
        corpo = corpo.replace('name="np-venc" value="orig" checked>', 'name="np-venc" value="orig" checked data-foco>', 1)
    j = janela('janela-np', 'Pago antes do T3jus · C-2026-041', 'A parcela 2 de 6 não foi paga?',
               'Rosa Almeida. A parcela passa para A receber; o resto da importação fica como está.', corpo, pe, abrir=v != 'fechada')
    return j.replace('class="janela"', 'class="janela np-janela"', 1)


def j_volta():
    corpo = (f'<ul class="np-oque" aria-label="O que vai acontecer">'
             f'<li>{ico("seta")}<span>A parcela 2 de 6 volta para “Pago antes do T3jus”, fora dos totais, de A receber e do Caixa.</span></li>'
             f'<li>{ico("cadeado")}<span>Só dá para voltar enquanto nada foi feito nela em A receber: nenhum recebimento, carnê ou cobrança enviada.</span></li>'
             f'<li>{ico("historico")}<span>As duas mudanças ficam no histórico, cada uma com o seu motivo.</span></li></ul>'
             + X.area_texto('np-volta-motivo', 'Por que foi paga, afinal', '', ajuda='Por exemplo: Rosa mandou o comprovante de 08/11.', foco=True))
    pe = (f'<button class="btn btn-sec" type="button" data-fechar>Cancelar</button>'
          f'<a class="btn btn-pri" href="{U}folha">{ico("desfazer")}Voltar para pago antes</a>')
    j = janela('janela-volta', 'Recebimentos · C-2026-041', 'A parcela 2 de 6 foi paga, sim?',
               'Rosa Almeida · R$ 800,00 · vencimento 10/11/2026.', corpo, pe, abrir=True)
    return j.replace('class="janela"', 'class="janela np-janela"', 1)


# ---------------------------------------------------------------- estados (contrato)
A = lambda **k: dict(area='contratos', secao='Contratos', atual='contratos', trilha='Contratos|C-2026-041', titulo='C-2026-041', aba='recebimentos', **k)
T = ''
T += tpl('folha', ficha(), **A())
T += tpl('janela', ficha() + j_np(), **A())
T += tpl('erros', ficha() + j_np('erros'), **A())
T += tpl('falha', ficha() + j_np('falha'), **A())
T += tpl('conflito', ficha() + j_np('conflito'), **A())
T += tpl('feito', ficha(True) + toast('A parcela 2 de 6 passou para A receber.', 'Vencida desde 10/11/2026, com a cobrança com você. Nenhum aviso automático saiu para Rosa.'), **A(q='5'))
T += tpl('voltar', ficha(True) + j_volta(), **A(q='5'))
T += tpl('sem-financeiro', ficha(financeiro=False), quem='contratos', **A())


def links(out):
    import re
    out = re.sub(r'R\$ (?=\d)', 'R$\u00a0', out)  # o valor não quebra entre o R$ e o número
    out = out.replace('href="moldura.html', 'href="../portal-v1/moldura.html').replace('href="equipe.html"', 'href="../portal-v1/equipe.html"')
    return out.replace('href="escritorio.html"', 'href="escritorio-logo.html?estado=largo"')


URL = {'Contratos': 'contrato-nao-paga.html?estado=folha', 'Honorários': '#', 'Procurações e modelos': '#'}
out = montar('contrato-nao-paga.html', 'Contratos', 'Ficha do contrato, aba Recebimentos: passar uma parcela paga antes do T3jus para A receber, quando ela não foi paga.',
             '{"estado":"folha","atual":"contratos"}', T, barras('contratos', URL), CSS + CSS_PG + X.CSS_X + CSS_NP)
out = out.replace('<div class="app">', SPRITE_NP + '\n<div class="app">', 1)
open(f'{SAIDA_NP}/contrato-nao-paga.html', 'w', encoding='utf-8').write(links(out))
print('contrato-nao-paga ok', T.count('<template data-est='), 'estados')

# ================================================================= Financeiro › A receber: a parcela de Rosa entre as vencidas
_tmp = tempfile.mkdtemp()
_argv = sys.argv
sys.argv = [sys.argv[0], _tmp]
import financeiro as F   # grava o Financeiro aprovado numa pasta temporária e expõe as peças
sys.argv = _argv

F.VENCIDAS.insert(2, ('10', 'nov', ROSA, 'Aposentadoria por idade', 'Parcela 2/6 · novembro', 8,
                      'Constava como paga antes do T3jus; não foi paga (mudado hoje por Marina).', '19/11', 'falar com Rosa Almeida',
                      'Marina Ribeiro', 800, 'Pix', 'Sem aviso automático'))
rec = F.receber()
troca = [('<b class="num">R$ 19.110,00</b><small>12 parcelas</small>', '<b class="num">R$ 19.910,00</b><small>13 parcelas</small>'),
         ('<b class="num">R$ 7.050,00</b><small>4 parcelas</small>', '<b class="num">R$ 7.850,00</b><small>5 parcelas</small>'),
         ('Vencidas · 4 <span><b class="num">R$ 7.050,00</b>', 'Vencidas · 5 <span><b class="num">R$ 7.850,00</b>'),
         ('12 parcelas em aberto', '13 parcelas em aberto'), ('Mostrando 7 de 12 parcelas', 'Mostrando 8 de 13 parcelas')]
for a, b in troca:
    a, b = a.replace('R$ ', 'R$\u00a0'), b.replace('R$ ', 'R$\u00a0')
    assert a in rec, a
    rec = rec.replace(a, b)
rec = rec.replace(f'<a href="{F.CONTRATO}">{ROSA}</a>', f'<a href="{U}feito">{ROSA}</a>')
rec = rec.replace(f'<a class="c-nome" href="{F.CONTRATO}">{ROSA}</a>', f'<a class="c-nome" href="{U}feito">{ROSA}</a>')
# a marca "era paga antes do T3jus" ao lado do selo de atraso, só na linha de Rosa
marca = '<span class="selo selo-neutro">Era paga antes do T3jus</span>'
i = rec.index(f'{ROSA}</a>')
k = rec.index('Vencida há 8 dias</span>', i)
rec = rec[:k + len('Vencida há 8 dias</span>')] + marca + rec[k + len('Vencida há 8 dias</span>'):]
k = rec.index('Vencida há 8 dias</span>', rec.index(f'c-nome" href="{U}feito">{ROSA}'))
rec = rec[:k + len('Vencida há 8 dias</span>')] + marca + rec[k + len('Vencida há 8 dias</span>'):]

TF = tpl('a-receber', rec + F.j_registrar(), **F.A('A receber'))
fin = F.pagina('Financeiro', 'Financeiro › A receber: a parcela que não foi paga entra entre as vencidas, com a marca de que era paga antes do T3jus.',
               '{"estado":"a-receber","atual":"financeiro"}', '', TF, F.barras)
fin = fin.replace('</style>', F.CSS_FI + '\n.fi-sit .selo-neutro{margin-top:4px}\n</style>', 1)
fin = fin.replace('financeiro.html?estado=receber', FIN + 'a-receber')
open(f'{SAIDA_NP}/financeiro-nao-paga.html', 'w', encoding='utf-8').write(links(fin))
print('financeiro-nao-paga ok')
