# Portal · o teste grátis para o escritório (CO-09, D42): as faixas da moldura, "Quero assinar", o Início com as
# boas-vindas do dia 1, o 8º dia só para consulta, o sino da sócia dona e Plano e faturas antes da assinatura.
# Base, lida sem mudança: docs/design/aprovadas/portal-inicio-audiencias/inicio.html (o Início mais recente) e
# docs/design/aprovadas/console-cobranca/portal-escritorio.html (Escritório com Plano e faturas).
# Exemplo: Ribeiro & Matos Advocacia, sócia dona Marina Ribeiro, primeiro acesso em 27/11/2026 às 23h40 (dia 1),
# último dia quinta-feira, 03/12/2026. Cada estado tem o relógio fixo escrito no índice. Uso: python3 portal_tg.py <pasta-saida>
import sys, os, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comum_tg import *

SAIDA = sys.argv[1] if len(sys.argv) > 1 else '..'
INI_SRC = APROV + 'portal-inicio-audiencias/inicio.html'
INI = open(INI_SRC, encoding='utf-8').read()
DONA, LARISSA = miolo(INI, 'dona'), miolo(INI, 'larissa')

QUERO = f'<a class="btn btn-pri" href="inicio.html?estado=tg-quero">{ico("assinar")}Quero assinar</a>'
VER_PLANO = f'<a class="tg-link" href="portal-escritorio.html?estado=tg-plano#plano">Ver o plano{ico("dir", "ico ico-s")}</a>'
BAIXAR = f'<a class="tg-link" href="portal-escritorio.html?estado=exportar">{ico("baixar", "ico ico-s")}Baixar os dados</a>'


def tira(cls, icone, texto, acoes=''):
    a = f'<span class="tg-t-acoes">{acoes}</span>' if acoes else ''
    return f'<div class="tg-tira {cls}" role="note" aria-label="Teste grátis">{ico(icone)}<span>{texto}</span>{a}</div>'


TIRAS = {
    'dia1': tira('', 'ampulheta', '<b>Teste grátis do T3jus até quinta-feira, 03/12.</b> Hoje é o dia 1 de 7. Nada é cobrado no teste.', VER_PLANO + QUERO),
    'dia6': tira('', 'ampulheta', '<b>Teste grátis do T3jus até quinta-feira, 03/12.</b> Faltam 2 dias, contando hoje.', VER_PLANO + QUERO),
    'equipe': tira('', 'ampulheta', '<b>Teste grátis do T3jus até quinta-feira, 03/12.</b> Quem assina pelo escritório é Marina Ribeiro, a sócia dona.'),
    'pedido': tira('tg-t-pedido', 'assinar', '<b>Você pediu para assinar em 01/12, às 16h20.</b> A equipe do T3jus confirma o plano com você. O teste continua até quinta-feira, 03/12.', VER_PLANO),
    'ultimo': tira('tg-t-ultimo', 'relogio', '<b>Hoje é o último dia do seu teste.</b> A partir de amanhã, 04/12, o Portal fica só para consulta até a assinatura. Nada é apagado.', VER_PLANO + QUERO),
    'consulta': tira('tg-t-consulta', 'cadeado', '<b>Portal só para consulta.</b> O teste terminou em 03/12. Seus dados estão guardados: você vê e baixa tudo, mas ninguém cria nem muda nada.', BAIXAR + QUERO),
    'consulta-equipe': tira('tg-t-consulta', 'cadeado', '<b>Portal só para consulta.</b> O teste do T3jus terminou em 03/12. Você continua vendo tudo. Para voltar ao normal, fale com Marina Ribeiro, a sócia dona.'),
    'assinado': tira('tg-t-pedido', 'check', '<b>Assinatura confirmada em 02/12.</b> O teste segue até quinta-feira, 03/12. A primeira fatura, de janeiro, chega em 04/12.', VER_PLANO),
}
JS_TIRA = ('<script>(function(){var T=' + repr(TIRAS).replace('</', '<\\/') + ';'
           'var t=document.querySelector(\'template[data-est="\'+(new URLSearchParams(location.search).get("estado")||"")+\'"]\');'
           'if(t&&t.dataset.tgTira&&T[t.dataset.tgTira]){document.getElementById("slot-barra").insertAdjacentHTML("afterbegin",T[t.dataset.tgTira])}})();</script>')


def data_hero(s, dia, saudacao=None):
    s = s.replace('Quarta-feira, 18 de novembro', dia, 1)
    if saudacao:
        s = re.sub(r'<h1>Bom dia, (\w+)\.</h1>', f'<h1>{saudacao}, \\1.</h1>', s, count=1)
    return s


def atalhos(s, novo):
    return re.sub(r'<div class="dir campo-ambar">.*?</div>', novo, s, count=1, flags=re.S)


def travar(s):
    """Só consulta: botões de criar e mudar ficam à vista, travados, com o motivo na faixa."""
    s = re.sub(r'<button class="btn ([^"]*)"', r'<button class="btn \1 tg-travado" aria-disabled="true"', s)
    return re.sub(r'<a class="btn ([^"]*)" href="[^"]*"', r'<a class="btn \1 tg-travado" role="link" aria-disabled="true"', s)


def t(est, corpo, tira_=None, quem=None):
    return tpl(est, exemplo(corpo), quem=quem, atual='inicio', trilha='Início', titulo='Início', tg_tira=tira_)


# ---- dia 1: as boas-vindas (o Início ainda vazio)
HERO_DIA1 = (f'<div class="hero"><div class="esq campo-vinho">{ico("balanca", "ico estatua")}<p class="sobretitulo">Sexta-feira, 27 de novembro</p>'
             '<h1>Boa noite, Marina.</h1><span class="fio" aria-hidden="true"></span><ul class="dia" aria-label="O seu dia">'
             '<li><a href="#t-boas"><span class="disco"><span>7</span></span><span><b>dias de teste</b>até quinta, 03/12</span></a></li>'
             '<li><a href="#t-boas"><span class="disco"><span>0</span></span><span><b>compromissos hoje</b>a agenda está vazia</span></a></li></ul></div>'
             f'<div class="dir campo-ambar"><p class="sobretitulo">Atalhos</p><a class="btn btn-escuro" href="#">{ico("pessoa-mais")}Novo cliente</a>'
             f'<a class="btn btn-sec" href="#">{ico("pessoas")}Convidar a equipe</a></div></div>')


def passo(n, tit, txt, bt):
    return (f'<li><span class="disco" aria-hidden="true"><span>{n}</span></span><span><strong>{tit}</strong><span class="t">{txt}</span></span>'
            f'<a class="btn btn-sec" href="#">{bt}</a></li>')


BOAS = (f'<section class="folha tg-boas" aria-labelledby="t-boas" style="margin-top:24px"><div><p class="sobretitulo">Teste grátis · dia 1 de 7</p>'
        '<h2 id="t-boas">Boas-vindas ao T3jus, Marina.</h2>'
        '<p>O teste da Ribeiro &amp; Matos começou agora, no seu primeiro acesso. Ele vai até <b>quinta-feira, 03/12</b>: 7 dias, contando hoje. '
        'A equipe do escritório usa o Portal inteiro, e nada é cobrado.</p>'
        '<h3 class="sobretitulo" style="margin-top:6px">Por onde começar</h3><ol class="tg-passos">'
        + passo(1, 'Chamar a equipe', 'Convide quem trabalha com você e escolha as áreas de cada pessoa.', 'Convidar')
        + passo(2, 'Trazer os clientes', 'Importe a planilha do sistema antigo ou cadastre um por um.', 'Importar')
        + passo(3, 'Marcar os compromissos', 'Audiências, reuniões e prazos na Agenda, para a equipe toda ver.', 'Abrir a Agenda')
        + '</ol></div><div><h3 class="sobretitulo">Quem acompanha vocês</h3>'
        '<p class="tg-quem"><span class="av" aria-hidden="true">R</span><span><b>Rafael Teles</b><small>Implantação do T3jus · rafael@exemplo.com.br</small></span></p>'
        '<h3 class="sobretitulo" style="margin-top:8px">Os 7 dias</h3><ul class="tg-linha7">'
        '<li><b>Hoje, 27/11</b><span>O teste começa. Mandamos um e-mail com a data do fim.</span></li>'
        '<li><b>01/12</b><span>Lembrete: faltam 3 dias.</span></li>'
        '<li><b>03/12</b><span>Último dia do teste.</span></li>'
        '<li><b>04/12</b><span>Sem assinatura, o Portal fica só para consulta. Nada é apagado, e você baixa tudo.</span></li></ul>'
        f'<p style="display:flex;gap:8px;flex-wrap:wrap">{QUERO}</p></div></section>')
VAZIO = (f'<div class="aviso aviso-info" role="status" style="margin-top:24px">{ico("ajuda")}<div><strong class="aviso-titulo">As suas áreas ainda estão vazias.</strong>'
         '<p>Quando chegarem os primeiros clientes, prazos e parcelas, o Início mostra aqui o que pede você a cada dia.</p></div></div>')
T = t('tg-dia1', '<div class="pd-inicio">' + HERO_DIA1 + BOAS + VAZIO + '</div>', 'dia1')

# ---- dia 3, quem não é sócio (a mesma faixa, sem o botão)
T += t('tg-equipe', data_hero(LARISSA, 'Domingo, 29 de novembro'), 'equipe', quem='juridico')

# ---- dia 6 (02/12): a faixa, a janela "Quero assinar" e o pedido enviado
D6 = data_hero(DONA, 'Quarta-feira, 2 de dezembro')
T += t('tg-dona', D6, 'dia6')


def j_quero(abrir=True):
    corpo = ('<ul class="tg-conta">'
             f'<li><span>Plano preparado pela equipe</span><b>Escritório · {brl(49000)} por mês <span class="tg-peq">valor de exemplo</span></b></li>'
             '<li><span>Seu teste vai até</span><b>Quinta-feira, 03/12/2026</b></li>'
             '<li><span>Primeira fatura</span><b>Janeiro de 2027 · vence em 10/01/2027</b></li></ul>'
             f'<ul class="tg-oque"><li>{ico("sino")}<span>Avisamos a equipe do T3jus agora. <b>Rafael Teles</b> confirma com você o plano, a forma de pagamento e o e-mail das faturas.</span></li>'
             f'<li>{ico("fatura")}<span><b>Nada é cobrado durante o teste.</b> A cobrança começa no dia seguinte ao fim, 04/12.</span></li>'
             f'<li>{ico("cadeado")}<span>Até a equipe confirmar, nada muda no Portal.</span></li></ul>'
             + campo('quero-recado', 'Recado para a equipe', '', 'Por exemplo, o melhor horário para falar com você.', area=True, linhas=2, opcional=True, foco=True))
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("enviar")}Enviar o pedido</button>'
    return janela('janela-quero', 'Teste grátis', 'Quero assinar o T3jus', 'Você pede, e a equipe do T3jus confirma a assinatura com você.', corpo, pe, abrir=abrir)


T += t('tg-quero', D6 + j_quero(), 'dia6')
T += t('tg-pedido', toast('Pedido enviado.', 'A equipe do T3jus vai falar com você para confirmar o plano. O teste continua até quinta-feira, 03/12.') + D6, 'pedido')

# ---- dia 7 (03/12) e dia 8 (04/12)
T += t('tg-ultimo', data_hero(DONA, 'Quinta-feira, 3 de dezembro'), 'ultimo')
AT_DONO = (f'<div class="dir campo-ambar"><p class="sobretitulo">Só consulta</p>'
           f'<a class="btn btn-escuro tg-ok" href="inicio.html?estado=tg-quero">{ico("assinar")}Quero assinar</a>'
           f'<a class="btn btn-sec tg-ok" href="portal-escritorio.html?estado=exportar">{ico("baixar")}Baixar os dados</a></div>')
AT_EQ = (f'<div class="dir campo-ambar"><p class="sobretitulo">Só consulta</p><p style="font-size:13px;line-height:1.5;color:var(--tinta)">'
         'Você continua vendo tudo. Para voltar a criar e mudar, fale com Marina Ribeiro, a sócia dona.</p></div>')
D8 = atalhos(travar(data_hero(DONA, 'Sexta-feira, 4 de dezembro')), AT_DONO)
T += t('tg-dia8', D8, 'consulta')
T += t('tg-dia8-equipe', atalhos(travar(data_hero(LARISSA, 'Sexta-feira, 4 de dezembro')), AT_EQ), 'consulta-equipe', quem='juridico')

# ---- o sino da sócia dona (no dia 8)
PE_P = f'<p class="si-pe">{ico("historico")}<span>Os avisos ficam aqui por 30 dias. Os do teste também chegam por e-mail.</span></p>'
SINO = si_painel('<b>1 novo</b> · 4 do teste nos últimos 30 dias',
                 si_dia('Hoje · sexta-feira, 04/12', [si_item('cadeado', 'O teste terminou em 03/12. <b>Seus dados estão guardados.</b>',
                                                               'O Portal está só para consulta: você vê e baixa tudo. Para voltar a usar tudo, aperte Quero assinar.',
                                                               'Ver o plano', 'portal-escritorio.html?estado=tg-plano-dia8#plano', '8h00', True)])
                 + si_dia('Ontem · 03/12', [si_item('relogio', 'Hoje é o último dia do seu teste.', 'A partir de amanhã, 04/12, o Portal fica só para consulta até a assinatura.',
                                                    'Ver o plano', 'portal-escritorio.html?estado=tg-plano#plano', '8h00')])
                 + si_dia('Antes', [si_item('ampulheta', 'Seu teste vai até quinta-feira, 03/12.', 'Para continuar, fale com a equipe ou aperte Quero assinar.',
                                            'Ver o plano', 'portal-escritorio.html?estado=tg-plano#plano', '01/12, 8h00'),
                                    si_item('ampulheta', 'Boas-vindas. Seu teste vai até quinta-feira, 03/12.', 'O teste começou no seu primeiro acesso.',
                                            'Abrir o Início', 'inicio.html?estado=tg-dia1', '27/11, 23h40')]), 1, PE_P)

CSS_PT = r"""
.hero .dir .tg-ok{min-height:44px}
"""
s = montar(INI_SRC, os.path.join(SAIDA, 'inicio.html'), CSS_TG + CSS_PT, T, js=JS_TIRA, pos=lambda x: com_sino(x, tsino('tg-socio', SINO, 1)))
print('inicio ok', T.count('<template data-est='), 'estados')

# ================================================================ Escritório › Plano e faturas, antes da assinatura
ES_SRC = COB + 'portal-escritorio.html'
ES = open(ES_SRC, encoding='utf-8').read()
EV = miolo(ES, 'ver')
JEXP = EV[EV.index('<dialog'):].replace(' data-abrir', '') if '<dialog' in EV else ''
EV = EV[:EV.index('<dialog')] if '<dialog' in EV else EV

ESQ = ('<div><p class="sobretitulo">Plano preparado pela equipe do T3jus</p><p class="tg-plano-nome" style="font-size:24px">Escritório</p>'
       f'<p class="tg-preco">{brl(49000)}<small>por mês</small></p>'
       '<p>Até <b>8 pessoas</b>, com todas as áreas. Hoje são <b>7</b>.</p>'
       '<p>Vence todo dia <b>10</b> · Pix ou boleto · a fatura chega em marina@ribeiromatos.adv.br.</p>'
       '<p>Para mudar o plano antes de assinar, <a href="mailto:atendimento@exemplo.com.br">fale com o T3jus</a>.</p></div>')


def secao(dir_html, pe_txt='Nenhuma fatura ainda. Durante o teste, nada é cobrado; as faturas aparecem aqui depois da assinatura.'):
    return (f'<section class="folha" aria-labelledby="t-plano" id="plano" style="overflow:hidden">'
            f'<div class="folha-cab"><div><h2 id="t-plano">{ico("fatura")}Plano e faturas</h2><p class="sub">Só a sócia dona vê esta parte.</p></div>{SELO_EX}</div>'
            f'<div class="tg-pt-plano">{ESQ}{dir_html}</div><p class="tg-sem-fatura">{ico("fatura")}<span>{pe_txt}</span></p></section>')


DIR_TESTE = ('<div><p class="sobretitulo">Teste grátis</p><p class="tg-preco" style="font-size:26px">Até quinta-feira, 03/12</p>'
             '<p>Faltam <b>2 dias</b>, contando hoje. Nada é cobrado no teste.</p>'
             '<p>Se assinar, a cobrança começa em <b>04/12/2026</b>, e a primeira fatura é a de <b>janeiro de 2027</b>, com vencimento em <b>10/01/2027</b>.</p>'
             f'<p style="display:flex;gap:8px;flex-wrap:wrap">{QUERO}<a class="btn btn-sec" href="mailto:atendimento@exemplo.com.br">{ico("envelope")}Falar com o T3jus</a></p></div>')
DIR_PEDIDO = (f'<div><p class="sobretitulo">Teste grátis até quinta-feira, 03/12</p><p><span class="selo selo-quer">{ico("assinar")}Pedido enviado</span></p>'
              '<p>Você pediu para assinar em <b>01/12, às 16h20</b>. Rafael Teles, da equipe do T3jus, confirma com você o plano, a forma de pagamento e o e-mail das faturas.</p>'
              '<p>Nada é cobrado no teste. Com a assinatura confirmada, a primeira fatura é a de <b>janeiro de 2027</b>, com vencimento em <b>10/01/2027</b>.</p></div>')
DIR_ASS = (f'<div><p class="sobretitulo">Assinatura</p><p><span class="selo selo-assinado">{ico("check")}Confirmada em 02/12</span></p>'
           '<p>O teste segue até <b>quinta-feira, 03/12</b>, e nada muda no Portal.</p>'
           f'<p>A primeira fatura, de <b>janeiro de 2027</b>, no valor de <b>{brl(49000)}</b>, chega por e-mail em <b>04/12</b> e vence em <b>10/01/2027</b>.</p></div>')
DIR_D8 = ('<div class="cb-pt-atraso"><p class="sobretitulo">O teste terminou em 03/12</p>'
          '<p>Desde hoje, o Portal está <b>só para consulta</b>: você vê e baixa tudo, mas ninguém cria nem muda nada. <b>Nenhum dado foi apagado.</b></p>'
          '<p>Para voltar a usar tudo, peça a assinatura. Quando a equipe do T3jus confirmar, tudo volta na hora.</p>'
          f'<p style="display:flex;gap:8px;flex-wrap:wrap">{QUERO}<a class="btn btn-sec" href="portal-escritorio.html?estado=exportar">{ico("baixar")}Baixar os dados</a></p></div>')
EV_CONS = re.sub(r'<div class="pt-muda">.*?</div>',
                 f'<div class="pt-muda">{ico("cadeado")}<p>Só consulta desde 04/12, porque o teste terminou sem assinatura. A exportação dos dados continua liberada. '
                 'Dúvidas? <a href="mailto:atendimento@exemplo.com.br">Fale com o T3jus</a>.</p></div>', EV, count=1, flags=re.S)


def tp(est, corpo, tira_):
    return tpl(est, exemplo(corpo), atual='escritorio', trilha='Escritório', titulo='Escritório', tg_tira=tira_)


TE = tp('tg-plano', secao(DIR_TESTE) + EV + JEXP, 'dia6')
TE += tp('tg-plano-pedido', secao(DIR_PEDIDO) + EV + JEXP, 'pedido')
TE += tp('tg-plano-assinado', secao(DIR_ASS, 'Nenhuma fatura ainda. A primeira, de janeiro de 2027, é emitida em 04/12/2026.') + EV + JEXP, 'assinado')
TE += tp('tg-plano-dia8', secao(DIR_D8, 'Nenhuma fatura. Sem assinatura, nada é cobrado.') + EV_CONS + JEXP, 'consulta')
CSS_ES = r"""
.cb-pt-atraso{background:var(--ambar-3)!important}
"""
montar(ES_SRC, os.path.join(SAIDA, 'portal-escritorio.html'), CSS_TG + CSS_ES, TE, js=JS_TIRA)
print('escritorio ok', TE.count('<template data-est='), 'estados')
