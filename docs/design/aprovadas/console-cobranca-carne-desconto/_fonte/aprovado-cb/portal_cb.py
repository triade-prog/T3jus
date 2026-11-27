# Portal · Escritório, seção "Plano e faturas" (só a sócia dona) e os avisos de atraso (CO-06).
# Base: docs/design/aprovadas/console-fim-contrato/portal-escritorio.html (Portal v1 + fim do contrato), lido sem mudança.
# Exemplo do Portal: Ribeiro & Matos (sócia dona Marina Ribeiro), como nos desenhos aprovados do Portal.
import sys, os, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dados_cb import *
from carne_cb import *

SAIDA = sys.argv[1] if len(sys.argv) > 1 else '../saida'
ES = open(BASE + 'portal-escritorio.html', encoding='utf-8').read()
EV = miolo(ES, 'ver')
EP = miolo(ES, 'pessoa')
EV = EV[:EV.index('<dialog')] if '<dialog' in EV else EV  # a janela de exportar continua, mais abaixo
JEXP = miolo(ES, 'ver')
JEXP = JEXP[JEXP.index('<dialog'):] if '<dialog' in JEXP else ''
JEXP = JEXP.replace(' data-abrir', '')

V = 49000  # plano Escritório, 7 pessoas


def faturas_pt(linhas):
    return tabela_esc(linhas, 'Faturas do escritório', acoes=True)


def bt_pagar(comp):
    return f'<button class="btn btn-pri btn-compacto" type="button" data-janela="janela-pagar-pt">{ico("pagar", "ico ico-s")}Pagar<span class="sr"> a fatura de {comp}</span></button>'


def bt_recibo(comp):
    return (f'<a class="btn btn-sec btn-compacto" href="#">{ico("baixar", "ico ico-s")}Recibo<span class="sr"> de {comp}</span></a>'
            f'<span class="cb-peq" style="align-self:center">Nota: em breve</span>')


PAGAS = [('novembro/2026', V, '10/11/2026', 'paga', None, 'paga em 09/11, Pix', '', bt_recibo('novembro')),
         ('outubro/2026', V, '10/10/2026', 'paga', None, 'paga em 10/10, Pix', '', bt_recibo('outubro')),
         ('setembro/2026', V, '10/09/2026', 'paga', None, 'paga em 08/09, boleto', '', bt_recibo('setembro'))]
DEZ = ('dezembro/2026', V, '10/12/2026', 'avencer', None, 'emitida hoje', '', bt_pagar('dezembro'))

PLANO_ESQ = ('<div><p class="sobretitulo">Seu plano</p><p class="cb-plano-nome" style="font-size:24px">Escritório</p>'
             f'<p class="cb-preco">{brl(V)}<small>por mês</small></p>'
             '<p>Até <b>8 pessoas</b>, com todas as áreas. Hoje são <b>7</b>. Cada pessoa a mais custa R$ 39,00 por mês.</p>'
             '<p>Vence todo dia <b>10</b> · Pix ou boleto · a fatura chega em marina@ribeiromatos.adv.br.</p>'
             '<p>Para mudar de plano ou de dia, <a href="mailto:atendimento@exemplo.com.br">fale com o T3jus</a>.</p></div>')


def secao(dir_html, linhas, extra_topo='', meio='', plano_esq=None):
    return (f'<section class="folha" aria-labelledby="t-plano" id="plano" style="overflow:hidden">'
            f'<div class="folha-cab"><div><h2 id="t-plano">{ico("fatura")}Plano e faturas</h2><p class="sub">Só a sócia dona vê esta parte.</p></div>{SELO_EX}</div>'
            f'{extra_topo}<div class="cb-pt-plano">{plano_esq or PLANO_ESQ}{dir_html}</div>{meio}'
            f'<h3 class="sr">Faturas</h3>{faturas_pt(linhas)}'
            f'<p class="docs-pe">{ico("doc")}<span>A nota fiscal de cada fatura paga vai aparecer aqui quando o T3jus começar a emitir pelo sistema. O recibo já vale como comprovante.</span></p></section>')


DIR_EM_DIA = ('<div><p class="sobretitulo">Próxima fatura</p>'
              f'<p class="cb-proxima"><span class="cb-grande">{brl(V)}</span>{selo_sit("avencer")}</p>'
              '<p>Dezembro de 2026 · vence em <b>10/12/2026</b>.</p>'
              f'<p style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-pri" type="button" data-janela="janela-pagar-pt">{ico("pagar")}Pagar</button>'
              f'<a class="btn btn-sec" href="#">{ico("baixar")}Baixar a fatura</a></p></div>')


def janela_pagar(abrir=True):
    corpo = (f'<ul class="cb-conta"><li><span>Mensalidade do plano Escritório, dezembro de 2026</span><b>{brl(V)}</b></li><li class="cb-tot"><span>Total</span><b>{brl(V)}</b></li></ul>'
             + como_pagar(V, id_='pt').replace('class="cb-pagar"', 'class="cb-pagar" style="padding:0"')
             + f'<p class="permissao">{ico("ajuda")}Exemplo: o código e o boleto de verdade vêm do meio de pagamento, que ainda não foi escolhido.</p>')
    return janela('janela-pagar-pt', 'Plano e faturas', 'Pagar a fatura de dezembro',
                  'Vence em 10/12/2026. Pago por Pix, aparece como paga na hora; por boleto, em até 1 dia útil.', corpo,
                  f'<button class="btn btn-pri" type="button" data-fechar data-foco>Fechar</button>', abrir=abrir)


def t(est, corpo, quem=None, tira=None):
    return tpl(est, exemplo(corpo), quem=quem, atual='escritorio', trilha='Escritório', titulo='Escritório', cb_tira=tira)


T = t('cb-plano', secao(DIR_EM_DIA, [DEZ] + PAGAS) + EV + JEXP + janela_pagar(False))
T += t('cb-pagar', secao(DIR_EM_DIA, [DEZ] + PAGAS) + EV + JEXP + janela_pagar())

# Carnê: a Ribeiro & Matos paga por carnê desde outubro; a parcela 4 (janeiro) foi paga adiantada
PLANO_ESQ_C = PLANO_ESQ.replace('Vence todo dia <b>10</b> · Pix ou boleto', 'Vence todo dia <b>10</b> · carnê de 12 parcelas, cada uma com Pix e boleto')
assert PLANO_ESQ_C != PLANO_ESQ
DIR_CARNE = ('<div><p class="sobretitulo">Próxima parcela</p>'
             f'<p class="cb-proxima"><span class="cb-grande">{brl(V)}</span>{selo_sit("avencer")}</p>'
             '<p>Parcela <b>3 de 12</b> · dezembro de 2026 · vence em <b>10/12/2026</b>.</p>'
             f'<p style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-pri" type="button" data-janela="janela-pagar-pt">{ico("pagar")}Pagar</button>'
             f'<a class="btn btn-sec" href="#">{ico("baixar")}Baixar o carnê</a></p></div>')
CARNE_PT = folha_carne('Seu carnê 2026/2027', f'12 parcelas de {brl(V)} · outubro de 2026 a setembro de 2027 · todo dia 10',
                       PARC_RIBEIRO, V, console=False, id_='t-carne-pt', cls_folha='cb-carne-pt')
CARNE_PT = CARNE_PT.replace('<h2 id="t-carne-pt">', '<h3 id="t-carne-pt" class="cb-h3-carne">', 1).replace('</h2>', '</h3>', 1)
LIN_CARNE = [('janeiro/2027', V, '10/01/2027', 'paga', None, 'parcela 4 · paga adiantada em 18/11, Pix', '', bt_recibo('janeiro')),
             ('dezembro/2026', V, '10/12/2026', 'avencer', None, 'parcela 3 de 12 · emitida hoje', '', bt_pagar('dezembro')),
             ('novembro/2026', V, '10/11/2026', 'paga', None, 'parcela 2 · paga em 09/11, Pix', '', bt_recibo('novembro')),
             ('outubro/2026', V, '10/10/2026', 'paga', None, 'parcela 1 · paga em 10/10, boleto', '', bt_recibo('outubro')),
             PAGAS[2]]
T += t('cb-carne', secao(DIR_CARNE, LIN_CARNE, meio=CARNE_PT, plano_esq=PLANO_ESQ_C) + EV + JEXP + janela_pagar(False))

# Atraso de 10 dias: faixa só para a sócia dona e a fatura em destaque
NOV_ATR = ('novembro/2026', V, '10/11/2026', 'atraso', 10, 'venceu em 10/11', '', bt_pagar('novembro'))
DIR_ATR = ('<div class="cb-pt-atraso"><p class="sobretitulo">Em atraso</p>'
           f'<p class="cb-proxima"><span class="cb-grande">{brl(V)}</span>{selo_sit("atraso", 10)}</p>'
           '<p>Novembro de 2026 · venceu em <b>10/11/2026</b>. Se já pagou, desconsidere: o boleto leva até 1 dia útil para cair.</p>'
           '<p>Com 30 dias de atraso, a equipe T3jus pode deixar o Portal só para consulta até o pagamento. <b>Nenhum dado é apagado.</b></p>'
           f'<p><button class="btn btn-pri" type="button" data-janela="janela-pagar-pt">{ico("pagar")}Pagar agora</button></p></div>')
T += t('cb-atraso', secao(DIR_ATR, [DEZ, NOV_ATR] + PAGAS[1:]) + EV + JEXP + janela_pagar(False), tira='atraso')

# Só consulta por atraso (41 dias): a sócia dona vê a seção; a equipe vê só a faixa
OUT_ATR = ('outubro/2026', V, '10/10/2026', 'atraso', 41, 'venceu em 10/10', '', bt_pagar('outubro'))
DIR_CONS = ('<div class="cb-pt-atraso cb-forte"><p class="sobretitulo">Portal só para consulta</p>'
            f'<p class="cb-proxima"><span class="cb-grande" style="color:var(--vinho-3)">{brl(2 * V)}</span>{selo_sit("atraso", 41)}</p>'
            '<p>Outubro e novembro de 2026 estão em aberto. Desde <b>20/11/2026</b>, a equipe só consulta: vê tudo e você baixa os dados, mas ninguém cria nem muda nada.</p>'
            '<p><b>Ao pagar as duas, tudo volta ao normal na hora.</b> Nenhum dado foi apagado.</p>'
            f'<p style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-pri" type="button" data-janela="janela-pagar-pt">{ico("pagar")}Pagar outubro</button>'
            f'<a class="btn btn-sec" href="mailto:atendimento@exemplo.com.br">{ico("envelope")}Falar com o T3jus</a></p></div>')
EV_CONS = EV.replace('<div class="pt-muda">' + EV.split('<div class="pt-muda">')[1].split('</div>')[0] + '</div>',
                     f'<div class="pt-muda">{ico("cadeado")}<p>Só consulta até o pagamento das faturas em atraso. A exportação dos dados continua liberada. Dúvidas? <a href="mailto:atendimento@exemplo.com.br">Fale com o T3jus</a>.</p></div>')
T += t('cb-so-consulta', secao(DIR_CONS, [DEZ, NOV_ATR, OUT_ATR] + PAGAS[2:]) + EV_CONS + JEXP + janela_pagar(False), tira='consulta-dono')
EP_CONS = EP.replace('<div class="pt-muda">' + EP.split('<div class="pt-muda">')[1].split('</div>')[0] + '</div>',
                     f'<div class="pt-muda">{ico("cadeado")}<p>O Portal está só para consulta. Para voltar ao normal, fale com Marina Ribeiro, a sócia dona.</p></div>')
T += t('cb-so-consulta-equipe', EP_CONS, quem='juridico', tira='consulta-equipe')

# Vazio (em implantação) e erro da seção
VAZIO = (f'<section class="folha" aria-labelledby="t-plano" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-plano">{ico("fatura")}Plano e faturas</h2><p class="sub">Só a sócia dona vê esta parte.</p></div>{SELO_EX}</div>'
         f'<div class="estado sem-moldura" role="status" style="padding-top:8px"><span class="icone-estado">{ico("fatura")}</span><h3>Nenhuma fatura ainda</h3>'
         '<p>A primeira fatura chega por e-mail e aparece aqui quando a implantação terminar. O plano combinado é o Escritório, R$ 490,00 por mês, até 8 pessoas.</p></div></section>')
T += t('cb-vazio', VAZIO + EV + JEXP)
ERRO = (f'<section class="folha" aria-labelledby="t-plano" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-plano">{ico("fatura")}Plano e faturas</h2></div></div>'
        f'<div class="estado estado-erro sem-moldura" role="alert" style="padding-top:8px"><span class="icone-estado">{ico("alerta")}</span><h3>Não deu para carregar as faturas</h3>'
        '<p>O resto da página funciona. Nada do que estava guardado se perdeu. Tente de novo em instantes; se continuar, mande o código ao T3jus.</p>'
        f'<div class="acoes"><button class="btn btn-pri" type="button">{ico("reenviar")}Tentar de novo</button></div><p class="codigo">Código para o suporte: PTL-4F12-0098</p></div></section>')
T += t('cb-erro', ERRO + EV + JEXP)

TIRAS = {
    'atraso': (f'<div class="cb-tira-atraso" role="note">{ico("relogio")}<span><b>A fatura de novembro venceu em 10/11/2026.</b> Só você, a sócia dona, vê este aviso.</span>'
               '<a href="portal-escritorio.html?estado=cb-atraso#plano">Ver e pagar</a></div>'),
    'consulta-dono': (f'<div class="fc-tira" role="note">{ico("cadeado")}<span><b>Portal só para consulta desde 20/11/2026.</b> Há faturas em atraso. Ao pagar, tudo volta ao normal na hora; nenhum dado foi apagado.</span>'
                      '<a href="portal-escritorio.html?estado=cb-so-consulta#plano">Ver e pagar</a></div>'),
    'consulta-equipe': (f'<div class="fc-tira" role="note">{ico("cadeado")}<span><b>Portal só para consulta.</b> O escritório tem uma pendência com o T3jus. '
                        'Você continua vendo tudo; para voltar ao normal, fale com Marina Ribeiro, a sócia dona.</span></div>'),
}
JS_TIRA = ('<script>(function(){var T=' + repr(TIRAS).replace('</', '<\\/') + ';'
           'var t=document.querySelector(\'template[data-est="\'+(new URLSearchParams(location.search).get("estado")||"")+\'"]\');'
           'if(t&&t.dataset.cbTira&&T[t.dataset.cbTira]){document.getElementById("slot-barra").insertAdjacentHTML("afterbegin",T[t.dataset.cbTira])}})();</script>')
TROCAS = [('portal-escritorio.html?estado=fc-encerrando', 'portal-escritorio.html?estado=cb-plano'),
          ('portal-equipe.html?estado=fc-leitura', '#')]
s = montar('portal-escritorio.html', os.path.join(SAIDA, 'portal-escritorio.html'), CSS_CB, T, TROCAS, js=JS_TIRA)
print('portal ok', T.count('<template data-est='), 'estados')
