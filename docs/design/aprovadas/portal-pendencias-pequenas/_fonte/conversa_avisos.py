# Portal · Conversas: atalho "Não receber avisos" dentro da conversa (F3.65; PA-03; PT-03, PT-10, PA-01).
# Parte da conversa aprovada (conversas.py, sem mudança; lido até os estados) e da janela aprovada
# da ficha (sem_avisos.py e base.py, sem mudança; lidos só como texto, para o CSS sa- e os ícones).
# Acrescenta só:
#   1. a seção "Avisos automáticos" no contexto da conversa (no celular, dentro de "Sobre ...");
#   2. a mesma janela da ficha, com "Pelo WhatsApp" marcado e quem está escrevendo já sugerido;
#   3. depois de registrar: a linha da equipe na conversa e o selo no cabeçalho.
# Peças novas com prefixo ca-. Uso: python3 conversa_avisos.py <pasta-saida>
import ast, os, re, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
_src = open(os.path.join(AQUI, 'conversas.py'), encoding='utf-8').read()
_src = _src[:_src.index("\nT = ''\n")]
sys_argv = sys.argv
exec(compile(_src, 'conversas.py', 'exec'), globals())

SAIDA = sys_argv[1] if len(sys_argv) > 1 else 'saida'
U2 = 'conversa-avisos.html?estado='

_sa = open(os.path.join(AQUI, 'sem_avisos.py'), encoding='utf-8').read()
CSS_SA = re.search(r'CSS_SA = r"""(.*?)"""', _sa, re.S).group(1)
_bs = open(os.path.join(AQUI, 'base.py'), encoding='utf-8').read()
SPRITE_NOVO = ast.literal_eval(re.search(r'SPRITE_NOVO = (\(.*?\))\n', _bs, re.S).group(1))

CSS_CA = r"""
/* ==========================================================================
   Conversa · atalho "Não receber avisos" (prefixo ca-)
   ========================================================================== */
.ca-linha{display:flex;align-items:flex-start;gap:10px;font-size:13px;line-height:1.5}
.ca-linha>.ico{width:18px;height:18px;flex:none;margin-top:1px;color:var(--vinho-4)}
.ca-linha b{font-weight:600}
.ca-linha span{color:var(--texto-2)}
.ca-linha span b{color:var(--texto)}
.ca-fora{display:grid;gap:8px;padding:12px 14px 12px 16px;border-radius:var(--raio);background:var(--ambar-3);box-shadow:inset 3px 0 0 var(--vinho);color:var(--tinta)}
.ca-fora strong{display:flex;align-items:flex-start;gap:8px;font-family:var(--serifa);font-size:17px;font-weight:600;color:var(--vinho);line-height:1.25}
.ca-fora strong .ico{width:18px;height:18px;flex:none;margin-top:1px}
.ca-fora p{font-size:12.5px;line-height:1.5;color:var(--tinta)}
.ca-acoes{display:grid;gap:8px}
.ca-selos{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
.ca-selo{background:var(--ambar-2);color:var(--tinta)}
.ca-selo .ico{width:14px;height:14px}
.cv-sis.ca-sis{background:var(--ambar-3);box-shadow:inset 0 0 0 1px var(--ambar-2)}
.cv-sis.ca-sis small{display:block;font-size:11.5px;color:var(--tinta)}
/* A fala do cliente que originou o pedido, na janela (Alegreya itálico, como no sino) */
.ca-cita{margin:0;padding:10px 14px;border-radius:var(--raio);background:var(--sal-2);border-left:3px solid var(--vinho-4);font-size:13px;line-height:1.5}
.ca-cita q{display:block;font-family:var(--serifa);font-style:italic;font-size:16px;color:var(--tinta);quotes:"“" "”"}
.ca-cita small{display:block;font-size:12px;color:var(--texto-2);margin-top:4px}
.ca-cita small b{font-weight:500;color:var(--texto)}
.sa-j .opcao .ca-agora{display:inline-flex;align-items:center;gap:4px;margin-top:4px;font-size:11.5px;font-weight:600;color:var(--vinho)}
.sa-j .opcao .ca-agora .ico{width:14px;height:14px}
.ca-codigo{font-size:12px;color:var(--texto-2)}
"""

# ---------------------------------------------------------------- dados
PEDIDO_TXT = 'Doutora, mais uma coisa: dá para parar de mandar aquelas mensagens automáticas de parcela? Eu pago sempre em dia, e cada aviso deixa o Hélio nervoso.'
HELIO_PEDIDO = HELIO_ASSUMIDA + [
    eq('Marina Ribeiro', 'Recebi a foto, obrigada. Às 14h eu ligo.', '10:19'),
    cli('Marta Corrêa', PEDIDO_TXT, '10:20'),
]
HELIO_REG = HELIO_PEDIDO + [
    f'<li class="cv-sis ca-sis">{ico("sino-mudo")}<span><b>Você registrou</b> o pedido de Marta: sem avisos de cobrança. Lembretes de audiência e avisos de etapa continuam.'
    f'<time>10:21</time><small>Só a equipe vê esta linha. Marta não recebe nada sozinha; se quiser, responda a ela abaixo.</small></span></li>',
]

LISTA_AV_HELIO = (f'<ul class="cv-mini"><li>{ico("whats")}<span><b>Etapa do caso</b> · 05/11<small>Instrução marcada. Lido.</small></span></li>'
                  f'<li>{ico("relogio")}<span><b>Lembrete de audiência</b> · hoje, 13:30<small>1 dia antes da instrução. Marcado.</small></span></li></ul>'
                  f'<a class="ver" href="{U}avisos">Ver todos os avisos{ico("dir", "ico ico-s")}</a>')


def sec_recebe(jan='janela-ca'):
    return sec('Avisos automáticos',
               f'<p class="ca-linha">{ico("sino")}<span><b>Recebe os avisos automáticos.</b> Saem para Marta, o contato principal. '
               f'Se ela pedir para não receber, registre aqui.</span></p>'
               f'<div class="ca-acoes"><button class="btn btn-sec" type="button" data-janela="{jan}">{ico("sino-mudo")}Não receber avisos</button></div>'
               + LISTA_AV_HELIO, 'sino')


def sec_fora(desde, oque, quem, reg, ficha, continua, lista=''):
    return sec('Avisos automáticos',
               f'<div class="ca-fora"><strong>{ico("sino-mudo")}Fora dos avisos de {oque} desde {desde}</strong>'
               f'<p>{quem} {reg}</p></div>'
               f'<p class="ca-linha">{ico("check")}<span><b>Continua:</b> {continua}</span></p>'
               f'<div class="ca-acoes"><button class="btn btn-sec" type="button" data-janela="janela-ca-mudar">{ico("lapis")}Mudar o pedido</button>'
               f'<button class="btn btn-sec" type="button" data-janela="janela-ca-retirar">{ico("sino-volta")}Retirar o pedido</button></div>'
               f'<a class="ver" href="{ficha}">Ver o histórico na ficha{ico("dir", "ico ico-s")}</a>' + lista, 'sino-mudo')


CONTINUA_COB = 'lembrete de audiência, aviso de etapa e prestação de contas, e o que a equipe escreve aqui.'

POR_HELIO = sec('Por que a IA passou', f'<p class="cv-por"><b>Proposta de acordo.</b> Marta pergunta se vale aceitar R$ 18.000,00. Valor e estratégia são com a advogada; a IA não opina. A empresa quer resposta até amanhã cedo.</p>'
                f'<p class="sub">Veio para você porque você cuida do caso.</p>', 'ia')
CLI_HELIO = sec('Cliente', f'<dl class="cv-dl"><div><dt>Cliente</dt><dd>Hélio Batista Corrêa</dd></div><div><dt>Quem escreve</dt><dd>Marta, esposa</dd></div><div><dt>Contato</dt><dd>Principal da ficha</dd></div></dl>'
                f'<a class="btn btn-sec" href="{FICHA_CL}">{ico("pessoas")}Abrir a ficha</a>', 'pessoas')
CASO_HELIO = sec('Caso', f'<dl class="cv-dl"><div><dt>Processo</dt><dd>Corrêa x Rota Sul</dd></div><div><dt>Etapa</dt><dd>Instrução marcada</dd></div></dl>'
                 f'<a class="ver" href="agenda.html?estado=dia">Instrução amanhã, 13:30, no TRT-2{ico("dir", "ico ico-s")}</a>', 'balanca')


def ctx_helio(av):
    # O que muda no contexto aprovado: "Avisos enviados" vira "Avisos automáticos" e sobe para logo depois de Cliente.
    return ctx([POR_HELIO, CLI_HELIO, av, CASO_HELIO], 'Hélio')


def cab_helio(selo=False):
    c = cab_conv('Hélio Batista Corrêa', '(11) 98114-3059', 'Quem escreve: <b>Marta Corrêa</b>, esposa, contato principal')
    if selo:
        c = c.replace('<h2 id="cv-ct">Hélio Batista Corrêa</h2></div>',
                      f'<h2 id="cv-ct">Hélio Batista Corrêa</h2><p class="ca-selos"><span class="selo ca-selo">{ico("sino-mudo")}Sem avisos de cobrança</span></p></div>', 1)
    return c


def conv_helio(msgs, selo=False):
    return conv(cab_helio(selo), barra_est('voce', 'Você assumiu às 10:15. A IA não responde enquanto isso.', BT_DEVOLVER), msgs, compor('Marta'))


def caixa_ca(lista_html, conv_html, ctx_pair, nome, cel_aberto=False):
    t = tela_caixa(lista_html, conv_html, ctx_pair, 'foco-conversa', nome)
    # No celular, o contexto fica em "Sobre ...": o rótulo passa a citar os avisos.
    t = t.replace(f'Sobre {nome} e o caso{ico("baixo", "ico ico-s")}', f'Sobre {nome}, o caso e os avisos{ico("baixo", "ico ico-s")}', 1)
    if cel_aberto:
        t = t.replace('<details class="cv-ctx-cel">', '<details class="cv-ctx-cel" open>', 1)
    return t


# ---------------------------------------------------------------- janelas (as da ficha aprovada)
COMO = [('WHATSAPP', 'Pelo WhatsApp', 'Nesta conversa'), ('TELEFONE', 'Por telefone', ''), ('PRESENCIAL', 'Pessoalmente', ''), ('EMAIL', 'Por e-mail', '')]
AGORA = f'<span class="ca-agora">{ico("conversas")}Escrevendo nesta conversa</span>'
QUEM_HELIO = [('HELIO', 'Hélio Batista Corrêa', 'Titular, o próprio cliente'), ('MARTA', 'Marta Corrêa', 'Esposa · contato principal' + AGORA), ('OUTRA', 'Outra pessoa', 'Escreva o nome')]


def j_conversa(abrir=False, falha=False):
    resumo = ''
    if falha:
        resumo = aviso('urgencia', 'O pedido não foi registrado.',
                       'O T3jus não respondeu a tempo. Nada foi salvo e o que você escolheu continua aqui. Tente de novo em instantes.',
                       acoes='<p class="ca-codigo">Se repetir, passe ao suporte o código <span class="num">SA-7Q2K</span>.</p>')
    cita = (f'<p class="ca-cita"><q>{PEDIDO_TXT}</q><small><b>Marta Corrêa</b>, nesta conversa, hoje às 10:20. '
            f'A mensagem fica ligada ao registro.</small></p>')
    tipos = [('COBRANCA', 'Só os avisos de cobrança', 'Parcela a vencer e parcela atrasada. Lembretes de audiência e avisos de etapa continuam.'),
             ('TODOS', 'Todos os avisos automáticos', 'Cobrança, lembrete de audiência, aviso de etapa e prestação de contas. Nada sai sozinho.')]
    corpo = (resumo + cita
             + opcoes_radio('ca-tipo', 'O que não quer receber', tipos, 'COBRANCA', cls='sa-tipo')
             + opcoes_radio('ca-quem', 'Quem pediu', QUEM_HELIO, 'MARTA')
             + opcoes_radio('ca-como', 'Como pediu', COMO, 'WHATSAPP', cls='sa-como')
             + campo('ca-data', 'Quando pediu', '18/11/2026', im='numeric',
                     ajuda='dd/mm/aaaa. Se o pedido chegou antes e só agora está sendo registrado, ponha o dia em que chegou.')
             + f'<p class="pt-comuns">{ico("historico")}<span>Fica registrado com seu nome e a hora, como feito na conversa, e aparece também na ficha de Hélio. '
               f'O que a equipe escreve nesta conversa continua saindo. Para mudar ou retirar depois, use este mesmo lugar ou a ficha: nada é apagado.</span></p>')
    pe = (f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button>'
          f'<button class="btn btn-pri" type="submit">{ico("check")}Registrar pedido</button>')
    j = janela('janela-ca', 'Hélio Batista Corrêa', 'Não receber avisos automáticos',
               'Registre o pedido que Marta fez nesta conversa. Vale para todas as automações do escritório, a partir de agora.', corpo, pe, abrir=abrir or falha)
    return j.replace('class="janela"', 'class="janela x-larga sa-j"', 1)


# Para quem já está fora (Antônia): "Mudar o pedido" e "Retirar o pedido" abrem as janelas aprovadas da ficha.
QUEM_ANT = [('ANT', 'Antônia Ferreira Prado', 'Titular, a própria cliente'), ('JOANA', 'Joana Prado', 'Filha · contato principal' + AGORA), ('OUTRA', 'Outra pessoa', 'Escreva o nome')]


def j_ant():
    tipos = [('COBRANCA', 'Só os avisos de cobrança', 'Parcela a vencer e parcela atrasada. Lembretes de audiência e avisos de etapa continuam.'),
             ('TODOS', 'Todos os avisos automáticos', 'Cobrança, lembrete de audiência, aviso de etapa e prestação de contas. Nada sai sozinho.')]
    mudar = janela('janela-ca-mudar', 'Antônia Ferreira Prado', 'Mudar o pedido de avisos', 'Use quando a cliente ou um contato pedir outra coisa: por exemplo, parar também os lembretes.',
                   opcoes_radio('cm-tipo', 'O que não quer receber', tipos, 'TODOS', cls='sa-tipo') + opcoes_radio('cm-quem', 'Quem pediu', QUEM_ANT, 'JOANA')
                   + opcoes_radio('cm-como', 'Como pediu', COMO, 'WHATSAPP', cls='sa-como') + campo('cm-data', 'Quando pediu', '18/11/2026', im='numeric', ajuda='dd/mm/aaaa.')
                   + f'<p class="pt-comuns">{ico("historico")}<span>O pedido atual (só cobrança, desde 03/11) fica no histórico, e o novo passa a valer agora.</span></p>',
                   f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("check")}Salvar o novo pedido</button>')
    retirar = janela('janela-ca-retirar', 'Antônia Ferreira Prado', 'Antônia volta a receber os avisos de cobrança?',
                     'Retire o pedido só quando a cliente ou um contato dela pedir. Fica registrado quem pediu e quem retirou.',
                     opcoes_radio('cr-quem', 'Quem pediu para voltar a receber', QUEM_ANT, 'JOANA') + opcoes_radio('cr-como', 'Como pediu', COMO, 'WHATSAPP', cls='sa-como')
                     + f'<p class="pt-comuns">{ico("historico")}<span>O pedido de 03/11 continua no histórico da ficha. As automações de cobrança voltam a incluir Antônia na próxima vez que rodarem; nada é enviado agora.</span></p>',
                     f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("sino-volta")}Voltar a receber</button>')
    return (mudar + retirar).replace('class="janela"', 'class="janela x-larga sa-j"')


# ---------------------------------------------------------------- telas
def tela_atalho(cel_aberto=True):
    return caixa_ca(lista('equipe', 'helio-eq'), conv_helio(HELIO_PEDIDO), ctx_helio(sec_recebe()), 'Hélio', cel_aberto)


# Hélio aparece em "Com a equipe" depois que Marina assumiu (como no estado aprovado "assumida").
LISTA['equipe'] = [('helio-eq', 'HC', 'Hélio Batista Corrêa', 'Marta Corrêa, esposa', '“' + PEDIDO_TXT[:58] + '…”', '10:20', 'Marina (você)', None, U2 + 'atalho')] + LISTA['equipe']
CONT['equipe'] = 2
LISTA['espera'] = [c for c in LISTA['espera'] if c[0] != 'helio']
CONT['espera'] = 2


def tela_registrado():
    av = sec_fora('18/11/2026', 'cobrança', 'Pedido de <b>Marta Corrêa</b> (esposa), pelo WhatsApp.', 'Registrado por você, nesta conversa, hoje às 10h21.',
                  FICHA_CL, CONTINUA_COB, LISTA_AV_HELIO)
    return caixa_ca(lista('equipe', 'helio-eq'), conv_helio(HELIO_REG, selo=True), ctx_helio(av), 'Hélio', True)


def tela_ja_fora():
    av = sec_fora('03/11/2026', 'cobrança', 'Pedido de <b>Joana Prado</b> (filha), pelo WhatsApp.', 'Registrado por Diego Almeida, nesta conversa, em 03/11 às 14h22.',
                  '../portal-clientes/clientes.html?estado=ficha', CONTINUA_COB)
    c = cab_conv('Antônia Ferreira Prado', '(11) 99123-4567', 'Quem escreve: <b>Joana Prado</b>, filha, contato principal')
    c = c.replace('<h2 id="cv-ct">Antônia Ferreira Prado</h2></div>',
                  f'<h2 id="cv-ct">Antônia Ferreira Prado</h2><p class="ca-selos"><span class="selo ca-selo">{ico("sino-mudo")}Sem avisos de cobrança</span></p></div>', 1)
    cv_ = conv(c, barra_est('espera', 'Desde 08:10 · responsável: <b>Diego Almeida</b>', BT_PASSAR), JOANA_MSGS,
               compor_bloq('A IA está esperando alguém da equipe. Diego é o responsável, mas qualquer pessoa pode assumir.'))
    a_, inner = CTX_JOANA
    # A seção de avisos entra depois de Cliente, como na conversa de Hélio.
    novo = ctx([inner + av], 'Antônia')
    return caixa_ca(lista('espera', 'joana'), cv_, novo, 'Antônia', True) + j_ant()


# ---------------------------------------------------------------- estados
# A barra de Conversas com as três seções de hoje (a de Conversas › Automações aprovada).
def barra_ca():
    links = ''.join(f'<a href="{h}"{" aria-current=\"page\"" if s == "Mensagens" else ""}>{s}{'<span class="q" aria-label="2 esperando">2</span>' if s == "Mensagens" else ""}</a>'
                    for s, h in [('Mensagens', U + 'fila'), ('Automações', '#'), ('Avisos automáticos', U + 'avisos')])
    return (f'<template data-barra="conversas|Mensagens"><div class="pt-barra-area"><p class="pt-area-nome">{ico("conversas")}Conversas</p>'
            f'<nav class="pt-secoes" aria-label="Seções de Conversas">{links}</nav></div></template>\n')


BARRAS = barra_ca()
CC = dict(atual='conversas', area='conversas', secao='Mensagens', titulo='Conversas')
T = ''
T += tpl('atalho', tela_atalho() + j_conversa(), cont='2', **dict(CC, trilha='Conversas|Hélio Batista Corrêa'))
T += tpl('janela', tela_atalho(False) + j_conversa(True), cont='2', **dict(CC, trilha='Conversas|Hélio Batista Corrêa'))
T += tpl('erro', tela_atalho(False) + j_conversa(falha=True), cont='2', **dict(CC, trilha='Conversas|Hélio Batista Corrêa'))
T += tpl('registrado', tela_registrado()
         + toast('Pedido registrado.', 'Hélio não recebe mais avisos de cobrança. Lembretes e avisos de etapa continuam.'), cont='2', **dict(CC, trilha='Conversas|Hélio Batista Corrêa'))
T += tpl('ja-fora', tela_ja_fora(), cont='2', quem='juridico', **dict(CC, trilha='Conversas|Antônia Ferreira Prado'))

out = pagina('Conversas', 'Conversa do cliente no Portal: registrar, pela própria conversa, o pedido de não receber avisos automáticos.',
             '{"estado":"atalho","atual":"conversas"}', '', T, BARRAS)
out = finalizar(out, CSS_CV + CSS_SA + CSS_CA)
out = out.replace('<div class="app">', SPRITE_NOVO + '\n<div class="app">', 1)
open(f'{SAIDA}/conversa-avisos.html', 'w', encoding='utf-8').write(out)
print('conversa-avisos ok', T.count('<template data-est='), 'estados')
