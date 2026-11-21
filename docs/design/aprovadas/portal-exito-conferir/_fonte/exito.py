# Portal · Financeiro › A receber: conferir o êxito que vem do encerramento do caso (CH-07, EX-08, FI-07).
# Reusa, sem mudança, o gerador do Financeiro aprovado (financeiro.py + comum.py): importa o financeiro.py,
# que grava a página aprovada e expõe as peças, e acrescenta os estados novos com peças de prefixo ex-.
# Uso: python3 exito.py <pasta-saida>
import sys, html
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
sys.argv = [sys.argv[0], SAIDA]
import financeiro as F          # grava SAIDA/financeiro.html (aprovado) e expõe as peças
from comum import tpl, janela, aviso, toast, ico

H = html.escape
R, ARQ, selo, folha, campo, selecao, anexo, FORMAS = F.R, F.ARQ, F.selo, F.folha, F.campo, F.selecao, F.anexo, F.FORMAS
CASO = '../portal-juridico/juridico.html?estado=ficha'

# ---------------------------------------------------------------- quem: Diego tem Financeiro e não é dono (como no carnê)
QUEM_FIN = ("financeiro:{nome:'Diego Almeida',ini:'D',papel:'Áreas: Comercial e Financeiro',areas:['comercial','financeiro'],dono:false},"
            "'sem-area':{")

CSS_EX = r"""
/* ==========================================================================
   Portal · Financeiro › Êxito para conferir (CH-07, EX-08, FI-07). Prefixo ex-.
   Só tokens e pares já aprovados. Êxito é dinheiro do escritório: família vinho,
   nunca o âmbar (o âmbar-campo é de terceiros, decisão 1 do Financeiro).
   ========================================================================== */
.ex-conf{border-left:4px solid var(--vinho-2)}
.ex-conf .folha-cab h2 .ico{color:var(--vinho)}
.ex-conf .folha-cab .acoes{align-items:center}
.ex-conta{display:block;font-size:12px;color:var(--texto-2)}
.ex-conta b{font-weight:500;color:var(--texto)}
.ex-quem{font-size:12px;color:var(--texto-2);line-height:1.5}
.ex-quem b{font-weight:500;color:var(--texto)}
.ex-tab td{vertical-align:top}
.ex-tab .fi-v{font-family:var(--serifa);font-size:20px;color:var(--vinho)}
.ex-tab .fi-v small{display:block;font-family:var(--sans,inherit);font-size:12px;color:var(--texto-2);font-weight:400}
.ex-pe{display:flex;align-items:flex-start;gap:10px;padding:14px 24px 18px;border-top:1px solid var(--divisor);font-size:13px;color:var(--texto-2);margin:0}
.ex-pe .ico{flex:none;color:var(--vinho-4)}
.ex-pe b{font-weight:500;color:var(--texto)}
.selo.ex-tipo{background:var(--papel);color:var(--vinho-2);box-shadow:inset 0 0 0 1px var(--vinho-4)}
.selo.ex-tipo .ico{color:var(--vinho-2)}
.ex-selos{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.ex-novo td{background:#FCF8F5}
.ex-reemb-l{display:flex;justify-content:flex-end;align-items:center;gap:4px;margin-top:4px;font-family:var(--sans,inherit);font-size:12px;font-weight:500;color:var(--vinho-2);white-space:nowrap}
.ex-reemb-l .ico{width:14px;height:14px}
.ex-cel-tit{margin:0;padding:0 16px 6px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--vinho-2);font-weight:500}

/* Janela "Conferir o êxito" */
.ex-origem{margin:0;display:grid;grid-template-columns:minmax(120px,auto) minmax(0,1fr);gap:0;border:1px solid var(--borda-folha);border-radius:var(--raio);overflow:hidden}
.ex-origem dt,.ex-origem dd{margin:0;padding:9px 14px;border-top:1px solid var(--divisor);font-size:13px;line-height:1.5}
.ex-origem dt{color:var(--texto-2);background:var(--sal-2)}
.ex-origem dd b{font-weight:500}
.ex-origem dd small{display:block;font-size:12px;color:var(--texto-2)}
.ex-origem>:nth-child(-n+2){border-top:0}
.ex-origem .ex-conta-l{font-weight:600;color:var(--vinho)}
.ex-origem q{quotes:"“" "”"}
.ex-h3{display:flex;align-items:center;gap:8px;margin:0 0 -6px;font-family:var(--fonte-texto);font-size:14px;font-weight:500;color:var(--texto)}
.ex-h3 .ico{color:var(--vinho);width:18px;height:18px}
.ex-h3 a{margin-left:auto;font-weight:500;display:inline-flex;align-items:center;min-height:44px}
.janela-pe .ex-esq{margin-right:auto}
.ex-motivo-novo{margin:0;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);display:grid;gap:12px}
.ex-motivo-novo .campo{margin:0}

/* Reembolso junto com a parcela */
.ex-faixa{display:grid;gap:10px;padding:12px 14px;border-radius:var(--raio);border:1px solid var(--vinho-4);border-left:4px solid var(--vinho-2);font-size:13px;line-height:1.5}
.ex-faixa>p{display:flex;gap:10px;align-items:flex-start;margin:0}
.ex-faixa>p .ico{color:var(--vinho);flex:none;margin-top:1px}
.ex-faixa b{font-weight:600}
.ex-soma{width:100%;border-collapse:collapse;font-size:13px}
.ex-soma td{padding:5px 0!important;border-top:1px solid var(--divisor);vertical-align:top}
.ex-soma td:last-child{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.ex-soma tfoot td{font-weight:600;color:var(--vinho);border-top:1.5px solid var(--vinho-4)}
.ex-soma small{display:block;font-size:12px;color:var(--texto-2)}
.ex-total{display:flex;justify-content:space-between;gap:12px;align-items:baseline;font-size:13px;padding-top:10px;border-top:1px solid var(--divisor)}
.ex-total b{font-family:var(--serifa);font-size:20px;font-weight:500;color:var(--vinho)}

@media (max-width:760px){
  .ex-origem{grid-template-columns:minmax(0,1fr)}
  .ex-origem dt{padding-bottom:2px;border-top:1px solid var(--divisor)}
  .ex-origem dd{border-top:0;padding-top:2px}
  .ex-origem>:nth-child(2){border-top:0}
  .ex-pe{padding:12px 16px 16px}
  .janela-pe .ex-esq{margin-right:0;order:3;width:100%}
}
"""

SPRITE_EX = ''  # os ícones aprovados bastam (balança, moeda, reenviar, check, alerta)

# ================================================================= dados
EXITOS = [
    # (cliente, primeiro nome, contrato, cláusula, pct, base, valor)
    ('Joana Pereira', 'Joana', 'CT-2026-014', '4ª', 30, 28000, 8400),
    ('Carlos Henrique Dias', 'Carlos', 'CT-2026-015', '3ª', 25, 20000, 5000),
]
ENC = 'Marina Ribeiro encerrou em 18/11, às 14h50'


# ================================================================= 1. bloco "Êxito para conferir"
def bloco_conferir(lista):
    tot = sum(e[6] for e in lista)
    n = len(lista)
    rows, car = '', ''
    for cli, pn, ct, cl, pct, base, v in lista:
        btn = (f'<button class="btn btn-pri btn-compacto" type="button" data-janela="janela-conferir" '
               f'aria-label="Conferir o êxito de {cli}">{ico("check", "ico ico-s")}Conferir</button>')
        rows += (f'<tr><td><div class="fi-quem"><strong>{cli}</strong><small><a href="{CASO}">Pereira x Mercado Bom Preço</a> · acordo</small></div></td>'
                 f'<td><div class="fi-forma"><b>{ct}</b><small>{pct}% de {R(base)} · cláusula {cl}</small></div></td>'
                 f'<td class="fi-v num">{R(v)}<small>calculado</small></td>'
                 f'<td><div class="fi-dt"><b class="num">15/12</b><small>2026 · terça</small></div></td>'
                 f'<td><p class="ex-quem"><b>Marina Ribeiro</b><br>encerrou em 18/11, às 14h50</p></td>'
                 f'<td class="fi-acao">{btn}</td></tr>')
        car += (f'<li class="cartao" style="box-shadow:inset 3px 0 0 var(--vinho-2)"><div class="c-topo"><div><strong class="c-nome">{cli}</strong>'
                f'<small>Pereira x Mercado Bom Preço · acordo</small></div><span class="fi-cartao-v num" style="margin-left:auto">{R(v)}</span></div>'
                f'<dl class="c-dados"><dt>Contrato</dt><dd>{ct}</dd><dt>Conta</dt><dd>{pct}% de {R(base)}</dd><dt>Previsto</dt><dd class="num">15/12/2026</dd>'
                f'<dt>Encerrou</dt><dd>Marina Ribeiro, 18/11, 14h50</dd></dl>'
                f'<div class="c-acoes"><button class="btn btn-pri" type="button" data-janela="janela-conferir">{ico("check")}Conferir o êxito de {pn}</button></div></li>')
    tab = (f'<table class="so-pc fi-tab ex-tab"><caption class="sr">Honorários de êxito para conferir</caption>'
           f'<colgroup><col style="width:22%"><col style="width:23%"><col style="width:14%"><col style="width:10%"><col style="width:18%"><col style="width:13%"></colgroup>'
           f'<thead><tr><th scope="col">Cliente e caso</th><th scope="col">Contrato e conta</th><th scope="col" style="text-align:right">Êxito</th>'
           f'<th scope="col">Previsto</th><th scope="col">Quem encerrou</th><th scope="col"><span class="sr">Ação</span></th></tr></thead><tbody>{rows}</tbody></table>'
           f'<ul class="cartoes so-cel" aria-label="Honorários de êxito para conferir">{car}</ul>')
    pe = (f'<p class="ex-pe">{ico("ajuda")}<span>Vem do Jurídico quando um caso termina com ganho ou acordo: o T3jus calcula pelo contrato de cada cliente. '
          f'<b>Nada é cobrado antes de alguém do Financeiro conferir.</b> Estes valores ainda não entram nos números abaixo.</span></p>')
    sub = f'{n} {"cliente" if n == 1 else "clientes"} · {R(tot)} calculados pelo contrato'
    return folha('t-exc', 'Êxito para conferir', tab + pe, sub=sub, icone='balanca',
                 acoes=selo('atencao', f'{n} {"esperando" if n == 1 else "esperando"} você', 'relogio')).replace('<section class="folha"', '<section class="folha ex-conf"', 1)


def receber_com(bloco='', extra_pc='', extra_cel='', ajuste=None):
    r = F.receber()
    if bloco:
        r = r.replace('<div class="fi-nums"', bloco + '<div class="fi-nums"', 1)
    if ajuste:
        r = ajuste(r)
    if extra_pc:
        r = r.replace('</tbody></table><ul class="cartoes so-cel" aria-label="Parcelas a receber">', extra_pc + '</tbody></table><ul class="cartoes so-cel" aria-label="Parcelas a receber">', 1)
    if extra_cel:
        r = r.replace('<ul class="cartoes so-cel" aria-label="Parcelas a receber">', extra_cel + '<ul class="cartoes so-cel" aria-label="Parcelas a receber">', 1)
    return r


# ================================================================= 2. janela "Conferir o êxito"
def origem():
    return (f'<h3 class="ex-h3">{ico("balanca")}De onde veio<a href="{CASO}">Ver o caso</a></h3>'
            f'<dl class="ex-origem">'
            f'<dt>Caso</dt><dd><b>Pereira x Mercado Bom Preço</b><small>Trabalhista · 1001022-33.2026.5.02.0045</small></dd>'
            f'<dt>Resultado</dt><dd><b>Acordo</b>, homologado em audiência de 18/11<small>Marina Ribeiro encerrou o caso em 18/11/2026, às 14h50</small></dd>'
            f'<dt>Valor para Joana</dt><dd><b class="num">{R(28000)}</b>, em parcela única<small>Pagamento previsto pelo Mercado Bom Preço: 15/12/2026</small></dd>'
            f'<dt>Contrato</dt><dd><b>CT-2026-014</b>, assinado em 20/02/2026<small>Cláusula 4ª: <q>30% do valor que a cliente receber no processo, por sentença ou acordo.</q></small></dd>'
            f'<dt>Conta</dt><dd class="ex-conta-l num">30% de {R(28000)} = {R(8400)}</dd>'
            f'</dl>')


def j_conferir(v='padrao', abrir=False):
    """v: padrao | erro (valor mudado sem motivo e data que não existe) | zero (valor em branco)"""
    erros = v != 'padrao'
    res = ''
    if v == 'erro':
        res = aviso('urgencia', 'Falta acertar 2 pontos, marcados abaixo.', 'O êxito ainda não foi lançado.')
    elif v == 'zero':
        res = aviso('urgencia', 'Falta acertar 1 ponto, marcado abaixo.', 'O êxito ainda não foi lançado.')
    alvo = (f'<div class="fi-alvo">{ico("balanca")}<div><strong>Joana Pereira · honorário de êxito</strong>'
            f'<small>Pereira x Mercado Bom Preço · contrato CT-2026-014</small></div><span class="fi-v num">{R(8400)}</span></div>')
    val_v = {'padrao': '8.400,00', 'erro': '7.000,00', 'zero': ''}[v]
    val_er = ('Diga o valor do honorário. Se este êxito não vai ser cobrado, use “Não cobrar este êxito”, no pé da janela.' if v == 'zero' else '')
    valor = campo('ex-valor', 'Honorário de êxito', val_v, im='decimal', foco=(v != 'erro'),
                  ajuda='Calculado pelo contrato: R$ 8.400,00. Se mudar, o T3jus pede o motivo.' if v != 'erro' else 'Era R$ 8.400,00, pelo contrato. Mudou para R$ 7.000,00.',
                  erro=val_er)
    data_v = '31/11/2026' if v == 'erro' else '15/12/2026'
    data = campo('ex-venc', 'Vencimento', data_v, im='numeric', foco=(v == 'erro'), ajuda='dd/mm/aaaa. Sugerido: o pagamento previsto do acordo.',
                 erro='Esta data não existe: novembro tem 30 dias. Use dd/mm/aaaa, por exemplo 15/12/2026.' if v == 'erro' else '')
    motivo = ''
    if v == 'erro':
        motivo = (f'<div class="ex-motivo-novo"><div class="campo"><label for="ex-mot">Por que mudou o valor</label>'
                  f'<textarea class="entrada" id="ex-mot" aria-invalid="true" aria-describedby="ex-mot-er"></textarea>'
                  f'<p class="erro-msg" id="ex-mot-er">{ico("alerta", "ico ico-s")}Escreva o motivo. Quem mudou o valor do contrato precisa dizer por quê; fica no histórico do caso e do contrato, com o seu nome.</p></div></div>')
    corpo = (res + alvo + origem()
             + f'<div class="fi-dois">{valor}{data}</div>' + motivo
             + f'<div class="fi-dois">{selecao("ex-forma", "Forma de pagamento", FORMAS, "Pix", ajuda="Joana recebe do Mercado Bom Preço e paga o escritório.")}'
             + selecao('ex-resp', 'Responsável pela cobrança', ['Diego Almeida', 'Felipe Matos', 'Marina Ribeiro'], 'Diego Almeida') + '</div>'
             + f'<p class="fi-ref">{ico("ajuda")}<span>Se o dinheiro do acordo entrar <b>pelo escritório</b> (alvará ou depósito na conta), o honorário sai na divisão de Repasses e esta parcela do êxito é baixada por lá.</span></p>'
             + f'<p class="fi-caixa-fixa">{ico("coluna")}<span>Entra no caixa <b>do escritório</b>: é honorário. Fica em A receber e na ficha do contrato de Joana.</span></p>')
    pe = (f'<button class="btn btn-fantasma ex-esq" type="button" data-janela="janela-nao-cobrar">{ico("x")}Não cobrar este êxito</button>'
          f'<button class="btn btn-sec" type="button" data-fechar>Cancelar</button>'
          f'<button class="btn btn-pri" type="button">{ico("check")}Lançar em A receber</button>')
    j = janela('janela-conferir', 'A receber · êxito para conferir', 'Conferir o êxito',
               'Confira a conta antes de cobrar Joana. Valor e vencimento já vêm preenchidos; mude se precisar.', corpo, pe, abrir=abrir or erros)
    return j.replace('class="janela"', 'class="janela fi-larga"', 1)


def j_nao_cobrar(abrir=False):
    ops = [('alvara', 'O dinheiro virá por alvará ou depósito e será dividido em Repasses', 'A divisão do alvará já propõe os 30% do contrato.', True),
           ('perdoado', 'Foi perdoado ou renegociado com a cliente', 'Diga o que foi combinado e com quem.', False),
           ('indevido', 'Não é devido', 'Erro no resultado registrado ou no contrato. Avise quem encerrou o caso.', False),
           ('outro', 'Outro motivo', '', False)]
    rad = ''.join(f'<label class="opcao"><input class="marcar" type="radio" name="ex-nc"{" checked data-foco" if c else ""}><span>{t}' + (f'<small>{s}</small>' if s else '') + '</span></label>'
                  for k, t, s, c in ops)
    corpo = (f'<div class="fi-alvo">{ico("balanca")}<div><strong>Joana Pereira · honorário de êxito</strong><small>Pereira x Mercado Bom Preço · 30% de {R(28000)}</small></div><span class="fi-v num">{R(8400)}</span></div>'
             f'<fieldset class="fi-grupo-op"><legend>Por que não cobrar em A receber</legend>{rad}</fieldset>'
             f'<div class="campo"><label for="nc-exp">Explique</label><textarea class="entrada" id="nc-exp" aria-describedby="nc-exp-aj">Acordo prevê depósito judicial; o alvará sai em nome do escritório.</textarea>'
             f'<p class="ajuda" id="nc-exp-aj">Obrigatório. Fica no histórico do caso e do contrato, com o seu nome.</p></div>'
             f'<p class="fi-ref">{ico("cadeado")}<span>O caso continua <b>Encerrado · acerto pendente</b> no Jurídico até o alvará ser registrado e dividido em Repasses. Nada some sem explicação.</span></p>')
    pe = (f'<button class="btn btn-sec" type="button" data-fechar>Voltar</button>'
          f'<button class="btn btn-pri" type="button">{ico("check")}Não cobrar e guardar o motivo</button>')
    return janela('janela-nao-cobrar', 'Conferir o êxito', 'Não cobrar este êxito',
                  'O êxito de Joana sai da lista para conferir e não vira parcela. O motivo é obrigatório.', corpo, pe, abrir=abrir)


# ================================================================= 4. depois de lançar
def linha_exito_pc():
    sit = (f'<div class="fi-sit"><div class="ex-selos">{selo("ativo", "Novo")}<span class="selo ex-tipo">{ico("balanca")}Êxito</span>{selo("neutro", "A vencer")}</div>'
           f'<p class="fi-motivo">Do encerramento do caso em 18/11, conferido por Diego.</p></div>')
    return (f'<tr class="fi-grupo"><th colspan="6" scope="rowgroup">Em dezembro · lançada agora · 1 <span><b class="num">{R(8400)}</b></span></th></tr>'
            f'<tr class="ex-novo"><td><div class="fi-dt"><b class="num">15/12</b><small>2026</small></div></td>'
            f'<td><div class="fi-quem"><a href="{ARQ}conferido-contrato">Joana Pereira</a><small>Êxito · Pereira x Mercado Bom Preço</small></div></td>'
            f'<td><div class="fi-forma"><b>Pix</b><small>Cobrar quando Joana receber</small></div></td><td>{sit}</td>'
            f'<td class="fi-v num">{R(8400)}</td><td class="fi-acao"><button class="btn btn-sec btn-compacto" type="button" data-janela="janela-registrar" '
            f'aria-label="Registrar recebimento de Joana Pereira, êxito">Registrar</button></td></tr>')


def cartao_exito():
    return (f'<p class="ex-cel-tit so-cel">Lançada agora</p><ul class="cartoes so-cel" aria-label="Parcela lançada agora">'
            f'<li class="cartao"><div class="c-topo"><div><a class="c-nome" href="{ARQ}conferido-contrato">Joana Pereira</a><small>Êxito · Pereira x Mercado Bom Preço</small></div>'
            f'<span class="fi-cartao-v num" style="margin-left:auto">{R(8400)}</span></div>'
            f'<dl class="c-dados"><dt>Vence</dt><dd class="num">15/12/2026</dd><dt>Forma</dt><dd>Pix</dd><dt>Origem</dt><dd>Do encerramento do caso em 18/11, conferido por Diego</dd></dl>'
            f'<div class="c-selos ex-selos">{selo("ativo", "Novo")}<span class="selo ex-tipo">{ico("balanca")}Êxito</span>{selo("neutro", "A vencer")}</div></li></ul>')


def conferido():
    r = receber_com(bloco_conferir(EXITOS[1:]), extra_pc=linha_exito_pc(), extra_cel=cartao_exito(),
                    ajuste=lambda s: s.replace('<b style="color:var(--texto);font-weight:500">12 parcelas em aberto</b> · da mais antiga para a mais nova',
                                               '<b style="color:var(--texto);font-weight:500">12 parcelas em aberto até 30/11</b> · e a de êxito lançada agora, para 15/12', 1))
    return r + toast('Êxito lançado em A receber.', f'{R(8400)} de Joana Pereira, para 15/12/2026. Ficou no histórico do caso e do contrato.')


# ---------------------------------------------------------------- ficha de contrato (peças da ficha aprovada)
def ficha(cliente, sobre, meta, dir_, parcelas, tot, lado, sub_parc, voltar='A receber', principal=''):
    cab = (f'<div class="ficha-cab"><div class="esq campo-vinho">{ico("coluna", "ico estatua")}'
           f'<a class="voltar" href="{ARQ}receber">{ico("esq", "ico ico-s")}{voltar}</a>'
           f'<div class="ident"><div><p class="sobretitulo">{sobre}</p><h1>{cliente}</h1>'
           f'<p class="meta">{meta}</p></div></div></div>{dir_}</div>')
    rows, car = '', ''
    for p, ref, venc, forma, sit, sit_cel, v, docs, cls, extra_v in parcelas:
        rows += (f'<tr{cls}><td><div class="fi-dt"><b>{p}</b><small>{ref}</small></div></td><td class="num">{venc}</td><td>{forma}</td><td>{sit}</td>'
                 f'<td class="fi-v num">{R(v)}{extra_v}</td><td>{docs}</td></tr>')
        car += (f'<li class="cartao"><div class="c-topo"><div><strong class="c-nome" style="font-size:18px">{p if p.startswith("Êxito") else "Parcela " + p}</strong><small>{ref}</small></div>'
                f'<span class="fi-cartao-v num" style="margin-left:auto">{R(v)}</span></div>'
                f'<dl class="c-dados"><dt>Vence</dt><dd class="num">{venc}</dd><dt>Forma</dt><dd>{forma}</dd></dl><div class="c-selos">{sit_cel}</div>'
                + (f'<div class="c-acoes">{docs}</div>' if 'fi-docs' in docs or 'btn' in docs else '') + '</li>')
    tab = (f'<table class="so-pc fi-tab"><caption class="sr">Parcelas do contrato</caption><colgroup><col style="width:13%"><col style="width:12%"><col style="width:10%"><col style="width:33%"><col style="width:15%"><col style="width:17%"></colgroup>'
           f'<thead><tr><th scope="col">Parcela</th><th scope="col">Vence</th><th scope="col">Forma</th><th scope="col">Situação</th><th scope="col" style="text-align:right">Valor</th><th scope="col">Documentos</th></tr></thead><tbody>{rows}</tbody></table>'
           f'<ul class="cartoes so-cel" aria-label="Parcelas do contrato">{car}</ul>')
    parc = folha('t-parc', 'Parcelas', tot + tab, sub=sub_parc, acoes=f'<a class="btn btn-sec" href="#">{ico("pena")}Ver o contrato</a>')
    return f'<div class="fi">{cab}<div class="fi-grade"><div class="fi-col">{parc}{principal}</div><aside class="fi-col" aria-label="Origem e fechamento">{lado}</aside></div></div>'


def quatro(a, b, c, d):
    return (f'<dl class="fi-quatro"><div><dt>Contratado</dt><dd class="num">{a}</dd></div><div><dt>Recebido</dt><dd class="num">{b}</dd></div>'
            f'<div><dt>Em atraso</dt><dd class="num">{c}</dd></div><div><dt>A vencer</dt><dd class="num">{d}</dd></div></dl>')


def contrato_joana():
    dir_ = (f'<section class="dir campo-ambar" aria-labelledby="t-dir"><p class="sobretitulo" id="t-dir">Próxima</p>'
            f'<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><p class="grande num">{R(8400)}</p>{selo("neutro", "15/12 · terça")}</div>'
            f'<p class="fi-oque"><b>Êxito do acordo de 18/11.</b><br>Joana recebe {R(28000)} do Mercado Bom Preço e paga o escritório.</p>'
            f'<button class="btn btn-pri" type="button" data-janela="janela-registrar">{ico("moeda")}Registrar recebimento</button></section>')
    meta = (f'<span class="selo selo-ativo" style="background:var(--ambar-3);color:var(--vinho)">Vigente</span><span>CT-2026-014 · 30% do êxito</span>'
            f'<span class="sep" aria-hidden="true"></span><span>responsável Diego Almeida</span>')
    sit = (f'<div class="fi-sit"><div class="ex-selos"><span class="selo ex-tipo">{ico("balanca")}Êxito</span>{selo("neutro", "A vencer")}</div>'
           f'<p class="fi-motivo"><b>Origem:</b> do encerramento do caso em 18/11, conferido por Diego.</p>'
           f'<p class="fi-motivo">30% de {R(28000)}, cláusula 4ª. Valor do contrato, sem mudança.</p></div>')
    sit_cel = (f'<div class="ex-selos"><span class="selo ex-tipo">{ico("balanca")}Êxito</span>{selo("neutro", "A vencer")}</div>'
               f'<p class="fi-motivo" style="flex-basis:100%;margin:6px 0 0">Do encerramento do caso em 18/11, conferido por Diego.</p>')
    parcelas = [('Êxito', 'acordo de 18/11', '15/12', 'Pix', sit, sit_cel, 8400, '<span class="fi-pq">—</span>', ' class="ex-novo"', '')]
    tot = quatro('30% do êxito', R(0), R(0), R(8400))
    hist = folha('t-orig', 'De onde veio', (
        '<div class="eventos-dia" style="padding-top:0"><h3>18/11/2026</h3><ol class="eventos">'
        f'<li><time>15h40</time><span class="pto forte" aria-hidden="true"></span><div><p><b>Diego Almeida</b> conferiu e lançou o êxito<span class="selo selo-ativo">Novo</span></p>'
        f'<small>{R(8400)}, vence 15/12/2026, Pix · sem mudança no valor</small></div></li>'
        f'<li><time>14h50</time><span class="pto" aria-hidden="true"></span><div><p>O T3jus calculou pelo contrato</p><small>30% de {R(28000)} (cláusula 4ª) = {R(8400)} · mandado ao Financeiro para conferir</small></div></li>'
        f'<li><time>14h50</time><span class="pto" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> encerrou o caso com acordo</p>'
        f'<small>Pereira x Mercado Bom Preço · {R(28000)} para Joana, pagamento previsto em 15/12</small></div></li></ol></div>'
        f'<p class="ex-pe" style="border-top:0;padding-top:0"><a class="ver" href="{CASO}">Ver o caso no Jurídico{ico("dir", "ico ico-s")}</a></p>'), icone='historico')
    fecha = folha('t-fecha', 'Fechamento do caso', (
        f'<div class="fi-fecha"><ul class="fi-check">'
        f'<li>{ico("check")}<span>Êxito de Joana conferido e lançado<small>{R(8400)}, falta receber em 15/12</small></span></li>'
        f'<li class="falta">{ico("alerta")}<span><b>Êxito de Carlos:</b> falta conferir<small>{R(5000)} calculados · está em A receber, no alto</small></span></li>'
        f'<li>{ico("check")}<span>Nenhum valor de terceiros entrou neste caso<small>se vier alvará, a divisão aparece em Repasses</small></span></li></ul>'
        f'<p style="font-size:13px;line-height:1.5;color:var(--texto-2);margin:0">No Jurídico, o caso fica <b style="color:var(--texto);font-weight:500">Encerrado · acerto pendente</b> até tudo ser recebido e repassado.</p></div>'),
        icone='cadeado', sub='Pereira x Mercado Bom Preço')
    return ficha('Joana Pereira', 'Contrato de honorários · Pereira x Mercado Bom Preço', meta, dir_, parcelas, tot, hist + fecha,
                 'O êxito entra aqui depois de conferido. Cada mudança fica no histórico.')


# ================================================================= 5. reembolso junto com a parcela
REEMB_L = f'<span class="ex-reemb-l">{ico("reenviar")}+ reembolso {R(1248.36)}</span>'


def receber_reembolso():
    def aj(s):
        velho = (f'<td><div class="fi-forma"><b>Cheque pré-datado</b><small>Cheque guardado no cofre</small></div></td><td><div class="fi-sit">{selo("neutro", "A vencer")}</div></td>'
                 f'<td class="fi-v num">{R(2400)}</td>')
        novo = (f'<td><div class="fi-forma"><b>Cheque pré-datado</b><small>Cheque guardado no cofre</small></div></td>'
                f'<td><div class="fi-sit">{selo("neutro", "A vencer")}<p class="fi-motivo"><b>Leva junto:</b> custas da apelação, que o escritório paga em 21/11 (Ação de cobrança).</p></div></td>'
                f'<td class="fi-v num">{R(2400)}{REEMB_L}</td>')
        assert velho in s
        s = s.replace(velho, novo, 1)
        s = s.replace('aria-label="Registrar recebimento de Construtora Vale Alto Ltda., Parcela 2/3 · novembro"',
                      'aria-label="Registrar recebimento de Construtora Vale Alto Ltda., Parcela 2/3 · novembro, com reembolso"', 1)
        car = (f'<li class="cartao"><div class="c-topo"><div><a class="c-nome" href="{ARQ}registrar-reembolso">Construtora Vale Alto Ltda.</a><small>Ação de cobrança · Parcela 2/3 · novembro</small></div>'
               f'<span class="fi-cartao-v num" style="margin-left:auto;text-align:right">{R(2400)}{REEMB_L}</span></div>'
               f'<dl class="c-dados"><dt>Vence</dt><dd class="num">28/11</dd><dt>Forma</dt><dd>Cheque pré-datado</dd><dt>Leva junto</dt><dd>Custas da apelação, que o escritório paga em 21/11</dd></dl>'
               f'<div class="c-selos">{selo("neutro", "A vencer")}</div></li></ul>')
        s = s.replace('</ul><p class="mais so-cel"><span>Mostrando 7 de 12 parcelas</span>', car + '<p class="mais so-cel"><span>Mostrando 8 de 12 parcelas</span>', 1)
        return s
    r = receber_com(ajuste=aj)
    r = r.replace('<span>As parcelas saem das condições de cada contrato',
                  f'<span>“+ reembolso” é o que o escritório adiantou no caso e o cliente paga junto com a parcela (FI-07). Ao registrar, o T3jus pergunta se o reembolso também foi pago. As parcelas saem das condições de cada contrato', 1)
    return r


def contrato_construtora():
    dir_ = (f'<section class="dir campo-ambar" aria-labelledby="t-dir"><p class="sobretitulo" id="t-dir">Vence hoje</p>'
            f'<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><p class="grande num">{R(3648.36)}</p>{selo("atencao", "28/11 · hoje", "relogio")}</div>'
            f'<p class="fi-oque"><b>Parcela 2/3, de novembro, {R(2400)}</b><br>+ reembolso das custas da apelação, {R(1248.36)}.</p>'
            f'<button class="btn btn-pri" type="button" data-janela="janela-registrar">{ico("moeda")}Registrar recebimento</button></section>')
    meta = (f'<span class="selo selo-ativo" style="background:var(--ambar-3);color:var(--vinho)">Vigente</span><span>3 parcelas de {R(2400)} · cheque pré-datado · dia 28</span>'
            f'<span class="sep" aria-hidden="true"></span><span>responsável Felipe Matos</span>')
    pg = f'<div class="fi-sit">{selo("ok", "Paga em 28/10", "check")}</div>'
    docs_pg = f'<div class="fi-docs"><a href="#">{ico("doc")}Recibo 0164</a><a href="#">{ico("link")}Comprovante</a></div>'
    s2 = (f'<div class="fi-sit">{selo("atencao", "Vence hoje", "relogio")}<p class="fi-motivo"><b>Leva junto:</b> custas da apelação, pagas pelo escritório em 21/11.</p></div>')
    btn = '<button class="btn btn-sec btn-compacto" type="button" data-janela="janela-registrar">Registrar</button>'
    parcelas = [
        ('1/3', 'outubro', '28/10', 'Cheque', pg, selo("ok", "Paga em 28/10", "check"), 2400, docs_pg, ' class="fi-pago"', ''),
        ('2/3', 'novembro', '28/11', 'Cheque', s2, selo("atencao", "Vence hoje", "relogio") + REEMB_L, 2400, btn, '', REEMB_L),
        ('3/3', 'dezembro', '28/12', 'Cheque', selo('neutro', 'A vencer'), selo('neutro', 'A vencer'), 2400, '<span class="fi-pq">—</span>', '', ''),
    ]
    tot = quatro(R(7200), R(2400), R(0), R(4800))
    reemb = folha('t-reemb', 'Adiantado pelo escritório neste caso', (
        f'<ul class="fi-linhas"><li class="fi-linha" style="grid-template-columns:minmax(0,1fr) auto"><div class="fi-quem"><strong>Custas da apelação · guia de preparo</strong>'
        f'<small>Paga pelo escritório em 21/11 · guia anexada · categoria "Custas adiantadas"</small>'
        f'<p class="fi-prox">{ico("relogio")}Reembolso combinado: <b>junto com a parcela 2/3</b></p></div>'
        f'<div class="fi-lado"><span class="fi-v num">{R(1248.36)}</span>{selo("atencao", "A reembolsar")}</div></li></ul>'),
        sub='Vira valor a reembolsar pelo cliente, ligado a este caso.', icone='reenviar')
    cob = folha('t-cob', 'Cobrança', (
        f'<div class="fi-cob"><p style="font-size:13px;line-height:1.5">O cheque da parcela 2/3 está no cofre e pode ser depositado hoje. '
        f'O reembolso não está no cheque: a Construtora paga à parte, por Pix ou transferência.</p></div>'
        '<div class="eventos-dia" style="padding-top:0"><h3>Histórico de cobrança</h3><ol class="eventos">'
        f'<li><time>27/11</time><span class="pto" aria-hidden="true"></span><div><p>Lembrete pelo WhatsApp, às 9h</p><small>Automático, com a parcela e o reembolso em linhas separadas.</small></div></li>'
        f'<li><time>21/11</time><span class="pto" aria-hidden="true"></span><div><p>Reembolso somado à parcela 2/3</p><small>Custas da apelação pagas pelo escritório · {R(1248.36)}</small></div></li></ol></div>'), icone='sino')
    return ficha('Construtora Vale Alto Ltda.', 'Contrato de honorários · Ação de cobrança', meta, dir_, parcelas, tot, cob,
                 'Cada parcela guarda o mês a que se refere, mesmo quando é paga depois.', principal=reemb)


def j_registrar_reembolso(junto=False):
    alvo = (f'<div class="fi-alvo">{ico("carteira")}<div><strong>Construtora Vale Alto Ltda. · parcela 2/3</strong>'
            f'<small>Ação de cobrança · vence hoje, 28/11/2026 · cheque pré-datado</small></div><span class="fi-v num">{R(2400)}</span></div>')
    faixa = (f'<div class="ex-faixa" role="note" aria-label="Reembolso junto"><p>{ico("reenviar")}<span><b>Esta parcela leva junto um reembolso.</b> A Construtora deve pagar a parcela e as custas que o escritório adiantou no caso.</span></p>'
             f'<table class="ex-soma"><caption class="sr">O que a Construtora deve pagar</caption><tbody>'
             f'<tr><td>Parcela 2/3 · novembro</td><td>{R(2400)}</td></tr>'
             f'<tr><td>Reembolso · custas da apelação<small>adiantadas em 21/11 no caso Ação de cobrança · guia anexada</small></td><td>{R(1248.36)}</td></tr></tbody>'
             f'<tfoot><tr><td>Total a pagar</td><td>{R(3648.36)}</td></tr></tfoot></table></div>')
    valor = campo('rg-valor', 'Valor recebido da parcela', '2.400,00', im='decimal', foco=not junto, ajuda='Falta receber nesta parcela: R$ 2.400,00.')
    data = campo('rg-data', 'Dia em que o dinheiro entrou', '28/11/2026', im='numeric', ajuda='dd/mm/aaaa')
    chk = (f'<label class="opcao"><input class="marcar" type="checkbox" id="rg-reemb"{" checked data-foco" if junto else ""}>'
           f'<span>O reembolso também foi pago<small>Marque se a Construtora pagou as custas da apelação ({R(1248.36)}). Desmarcado, o reembolso continua “A reembolsar”, ligado a esta parcela.</small></span></label>')
    sub = ''
    if junto:
        sub = (f'<div class="fi-sub-op"><div class="fi-dois">{campo("rg-rv", "Valor do reembolso", "1.248,36", im="decimal", ajuda="Adiantado pelo escritório: R$ 1.248,36.")}'
               f'{selecao("rg-rf", "Forma do reembolso", FORMAS, "Pix", ajuda="Pode ser outra forma: o cheque é só da parcela.")}</div>'
               f'<p class="ex-total"><span>Total registrado: parcela {R(2400)} + reembolso {R(1248.36)}</span><b class="num">{R(3648.36)}</b></p></div>')
    caixa = ('Os dois entram no caixa <b>do escritório</b>: a parcela é honorário e o reembolso devolve o que o escritório pagou. O reembolso sai de “A reembolsar”.'
             if junto else 'Entra no caixa <b>do escritório</b>: é honorário. Valores de terceiros se registram em Repasses.')
    recibo = ('Vai para a Construtora, com a parcela e o reembolso em linhas separadas.' if junto
              else 'Vai para a Construtora, no número do escritório.')
    corpo = (alvo + faixa
             + f'<div class="fi-dois">{valor}{data}</div>'
             + f'<fieldset class="fi-grupo-op"><legend>Reembolso</legend>{chk}{sub}</fieldset>'
             + f'<p class="fi-ref">{ico("check")}<span>Este recebimento baixa a <b>parcela de novembro de 2026</b>. No caixa, ele entra no dia em que o dinheiro entrou.</span></p>'
             + f'<div class="fi-dois">{selecao("rg-forma", "Forma de pagamento", FORMAS, "Cheque pré-datado")}'
             + campo('rg-multa', 'Multa e juros', '', im='decimal', opc=True, ajuda='Em dia: não há multa nem juros.') + '</div>'
             + f'<p class="fi-caixa-fixa">{ico("coluna")}<span>{caixa}</span></p>'
             + f'<div class="campo"><span class="fi-rotulo">Comprovante <span class="opcional" style="font-weight:400;color:var(--texto-2)">(opcional)</span></span>'
             + anexo('deposito-cheque-construtora-28-11.pdf', '96 KB · anexado agora') + '</div>'
             + f'<label class="opcao"><input class="marcar" type="checkbox" checked><span>Gerar o recibo e mandar pelo WhatsApp<small>{recibo}</small></span></label>')
    bot = f'Registrar {R(3648.36)}' if junto else 'Registrar recebimento'
    pe = (f'<button class="btn btn-sec" type="button" data-fechar>Cancelar</button>'
          f'<button class="btn btn-pri" type="button">{ico("check")}{bot}</button>')
    return janela('janela-registrar', 'A receber', 'Registrar recebimento', 'Baixa a parcela, guarda o comprovante e gera o recibo.', corpo, pe, abrir=True)


# ================================================================= estados
def A(secao, titulo=None, trilha=None):
    return dict(area='financeiro', secao=secao, atual='financeiro', trilha=trilha or f'Financeiro|{secao}', titulo=titulo or secao, quem='financeiro')


RC = lambda: receber_com(bloco_conferir(EXITOS))
T = ''
T += tpl('receber-conferir', RC() + j_conferir() + j_nao_cobrar() + F.j_registrar(), **A('A receber'))
T += tpl('conferir', RC() + j_conferir(abrir=True) + j_nao_cobrar(), **A('A receber', 'Conferir o êxito'))
T += tpl('conferir-erro', RC() + j_conferir('erro') + j_nao_cobrar(), **A('A receber', 'Conferir o êxito'))
T += tpl('conferir-erro-valor', RC() + j_conferir('zero') + j_nao_cobrar(), **A('A receber', 'Conferir o êxito'))
T += tpl('nao-cobrar', RC() + j_conferir() + j_nao_cobrar(abrir=True), **A('A receber', 'Não cobrar este êxito'))
T += tpl('conferido', conferido() + j_conferir() + j_nao_cobrar() + F.j_registrar(), **A('A receber'))
T += tpl('conferido-contrato', contrato_joana() + F.j_registrar(), **A('A receber', 'Joana Pereira', 'Financeiro|A receber|Joana Pereira'))
T += tpl('receber-reembolso', receber_reembolso() + F.j_registrar(), **A('A receber'))
T += tpl('registrar-reembolso', contrato_construtora() + j_registrar_reembolso(), **A('A receber', 'Construtora Vale Alto Ltda.', 'Financeiro|A receber|Construtora Vale Alto Ltda.'))
T += tpl('registrar-reembolso-junto', contrato_construtora() + j_registrar_reembolso(True), **A('A receber', 'Construtora Vale Alto Ltda.', 'Financeiro|A receber|Construtora Vale Alto Ltda.'))


def links(out):
    """Os links da moldura levam às telas aprovadas vizinhas."""
    return out.replace('href="moldura.html', 'href="../portal-v1/moldura.html').replace('href="equipe.html"', 'href="../portal-v1/equipe.html"')


out = F.out.replace("'sem-area':{", QUEM_FIN, 1)
out = out.replace('</style>', CSS_EX + '\n</style>', 1)
i = out.rindex('<script>')
out = links(out[:i] + T + out[i:])
out = out.replace('"estado":"resumo"', '"estado":"receber-conferir"', 1)
open(f'{SAIDA}/financeiro.html', 'w', encoding='utf-8').write(out)
print('financeiro + êxito ok', T.count('<template data-est='), 'estados novos')
