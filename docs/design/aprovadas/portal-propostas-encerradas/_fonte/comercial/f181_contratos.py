# F3.181 · a proposta e o formulário de contrato quando o cliente foi excluído (ou arquivado, C2) a pedido do titular.
# Parte dos desenhos aprovados de Comercial e Contratos (portal-comercial-contratos e portal-recibo-recorrente, com o
# estado pc-pedido-feito): importa contratos.py e comercial.py aprovados (cópias sem mudança; o comum.py é a cópia
# aprovada que lê o caminho de T3JUS_APROV) e lê do telas.py aprovado só o CSS do pc- e a montagem da página.
# Peças novas com prefixo f181-. Grava comercial.html e contratos.html. Uso: python3 f181_contratos.py <pasta-saida>
import sys, os
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
sys.path.insert(1, os.path.dirname(AQUI))
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
sys.argv = [sys.argv[0], SAIDA]
import contratos as C      # grava SAIDA/contratos.html aprovado (sobrescrito abaixo)
import comercial as CM     # grava SAIDA/comercial.html aprovado (sobrescrito abaixo)
from comum import tpl, aviso, ico, toast
import nomes_181

_t = open(os.path.join(AQUI, 'telas.py'), encoding='utf-8').read()
R = {'ico': ico, 'C': C}
exec(compile(_t[_t.index('SPRITE_RR = ('):_t.index('\ndef com_link_recibo')], 'telas.py', 'exec'), R)
exec(compile(_t[_t.index('def links(out):'):_t.index('\nfin = montar_pagina')], 'telas.py', 'exec'), R)
montar_pagina = R['montar_pagina']
selo = C.selo

COND = [
    CM.cond_ler('fixo', 'R$ 3.500,00 <small>em uma parcela</small>', 'Vence 10 dias depois da assinatura do contrato.', 'Vira 1 recebimento programado.'),
    CM.cond_ler('exito', '20% <small>{sobre}</small>', 'Cobrado quando o caso chegar à etapa “Pagamento da RPV ou precatório”, com vencimento 15 dias depois.',
                'O valor só se sabe na etapa. Quando ela for marcada no caso, vira valor a receber e o Financeiro é avisado.'),
]
ESC = '<p>Pedido de benefício por incapacidade no INSS e, se for negado, a ação na Justiça Federal até o pagamento dos atrasados.</p>'


def hist():
    def ev(h, quem, txt, sub='', s='', forte=False):
        return (f'<li><time>{h}</time><span class="pto{" forte" if forte else ""}" aria-hidden="true"></span><div><p><b>{quem}</b> {txt}{s}</p>'
                + (f'<small>{sub}</small>' if sub else '') + '</div></li>')
    return (f'<section class="folha" aria-labelledby="t-hp" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-hp">Histórico da proposta</h2>'
            f'<p class="sub">Cada mudança e cada resposta, com quem e quando. Nada se apaga.</p></div></div>'
            f'<div class="eventos-dia"><h3>13/11/2026</h3><ol class="eventos">{ev("10h20", "Diego Almeida", "pediu o contrato", "Aviso no sino de Felipe Matos, que tem a área Contratos.", selo("andamento", "Pedido"), True)}</ol></div>'
            f'<div class="eventos-dia"><h3>12/11/2026</h3><ol class="eventos">{ev("15h40", "Diego Almeida", "registrou a resposta: aceitou", "Por atendimento presencial, em 12/11/2026.", selo("ativo", "Aceita"), True)}</ol></div>'
            f'<div class="eventos-dia"><h3>05/11/2026</h3><ol class="eventos">{ev("11h05", "Diego Almeida", "marcou como enviada", "", selo("andamento", "Enviada"))}</ol></div></section>')


def lateral(cliente, docx=True, explica=True):
    lat = CM.lateral_prop(cliente, 'Indicação de cliente', 'Diego Almeida').replace('30/11/2026', '27/11/2026')
    # Proposta aceita não se edita (no produto, "Editar" só aparece em rascunho, enviada e em negociação)
    ed = f'<a class="btn btn-sec" href="#">{ico("lapis")}Editar a proposta</a>'
    assert ed in lat
    lat = lat.replace(ed, '')
    if not docx:  # o Word da proposta do excluído foi apagado na exclusão (F3.155)
        bx = f'<div class="hn-folha-acao"><a class="btn btn-sec" href="#">{ico("baixar")}Baixar a proposta (.docx)</a></div>'
        assert bx in lat
        lat = lat.replace(bx, '<div class="hn-folha-acao f181-novo"><p>O arquivo Word da proposta foi apagado com os dados do cliente.</p></div>')
    if not explica:  # "A proposta aceita vira contrato." contradiz o "Não vira contrato" do alto
        i = lat.index('<section class="explica campo-ambar"')
        lat = lat[:i]
    return lat


def ficha(situacao='excluido', aviso_topo=''):
    """situacao: excluido, arquivado ou pedir (a página aberta antes da exclusão, já recarregada)."""
    if situacao == 'arquivado':
        cliente, servico = 'Antônia Ferreira Prado', 'Benefício por incapacidade'
        txt = 'A cliente foi arquivada a pedido do titular em 20/11/2026. Cliente arquivado não ganha contrato novo. A proposta fica só como registro.'
        sobre = 'dos atrasados que a cliente receber'
    else:
        cliente, servico = 'Cliente excluído', 'Serviço apagado a pedido do titular'
        txt = 'O cliente foi excluído a pedido do titular em 20/11/2026. A proposta fica só como registro.'
        sobre = 'da base apagada a pedido do titular'
    d = (f'<section class="dir campo-ambar" aria-labelledby="t-ac"><p class="sobretitulo" id="t-ac">Aceita em 12/11</p>'
         f'<div class="f181-novo"><p class="grande" style="font-size:30px">Não vira contrato</p>'
         f'<p class="hn-oque">{txt}</p></div></section>')
    cab = CM.ficha_cab_p('P-2026-014', servico, '<span class="selo selo-ativo">Aceita</span>', cliente, 'R$ 3.500,00 mais êxito', d)
    conds = [c.replace('{sobre}', sobre) for c in COND]
    if situacao == 'arquivado':
        esc = CM.escopo(ESC)
    else:
        esc = CM.escopo('<p class="hn-nota f181-novo">Apagado a pedido do titular.</p>')
    corpo = CM.conds_ler(conds, sub='Ficam como registro.') + esc + hist()
    lat = lateral(cliente, docx=situacao == 'arquivado', explica=False)
    lat = lat.replace('<section class="folha" aria-labelledby="t-pc">', '<section class="folha f181-lat" aria-labelledby="t-pc">', 1)
    return (f'<div class="hn">{cab}{aviso_topo}<div class="hn-grade"><div class="hn-col">{corpo}</div>'
            f'<aside class="hn-col" aria-label="Sobre a proposta">{lat}</aside></div></div>')


def pedir_recusado():
    a = aviso('urgencia', 'Não deu para pedir o contrato.',
              'O cliente foi excluído a pedido do titular agora há pouco. A proposta abaixo já mostra como ficou: ela não vira contrato.', extra=' f181-novo')
    return ficha('excluido', a)


def novo_contrato(arquivado=False):
    if arquivado:
        tit = 'A cliente desta proposta foi arquivada a pedido do titular.'
        txt = 'A proposta não vira contrato: cliente arquivado não ganha contrato novo. O pedido saiu da lista de Contratos e a proposta fica no Comercial como registro.'
    else:
        tit = 'O cliente desta proposta foi excluído a pedido do titular.'
        txt = 'A proposta não vira contrato. O pedido saiu da lista de Contratos e a proposta fica no Comercial só como registro, sem os dados do cliente.'
    ac = f'<a class="btn btn-sec" href="contratos.html?estado=contratos">{ico("esq")}Voltar para Contratos</a>'
    return f'<div class="hn f181-so-aviso">{aviso("info", tit, txt, acoes=ac, extra=" f181-novo")}</div>'


CSS_F181 = r"""
/* F3.181 (prefixo f181-). Anotação só do desenho: o que é novo leva contorno tracejado em âmbar. No produto, não há contorno. */
.f181-novo{outline:2px dashed #DD9760;outline-offset:4px;border-radius:2px}
.aviso.f181-novo{outline-offset:3px;border-radius:var(--raio-grande)}
.f181-lat .hn-folha-acao p{font-size:13px;color:var(--texto-2);line-height:1.5}
.f181-so-aviso{max-width:760px}
.dir>.f181-novo{display:flex;flex-direction:column;gap:8px;padding:6px;margin:-6px;outline-offset:-1px}
"""

PM = dict(area='comercial', secao='Propostas', atual='comercial', trilha='Comercial|Propostas|P-2026-014', titulo='P-2026-014')
TM = ''
TM += tpl('proposta-aceita-excluido', ficha('excluido'), **PM)
TM += tpl('proposta-aceita-arquivado', ficha('arquivado'), **PM)
TM += tpl('proposta-pedir-recusado', pedir_recusado(), quem='comercial', **PM)
cm = montar_pagina(CM.out, TM, CSS_F181)
cm = cm.replace('"estado":"propostas"', '"estado":"proposta-aceita-excluido"', 1)
open(os.path.join(SAIDA, 'comercial.html'), 'w', encoding='utf-8').write(nomes_181.trocar(cm))
print('comercial ok', TM.count('<template data-est='), 'estados novos')

AC = dict(area='contratos', secao='Contratos', atual='contratos', trilha='Contratos|Novo contrato', titulo='Novo contrato')
TC = ''
TC += tpl('novo-contrato-cliente-excluido', novo_contrato(), **AC)
TC += tpl('novo-contrato-cliente-arquivado', novo_contrato(True), **AC)
ct = montar_pagina(C.out, TC, CSS_F181)
open(os.path.join(SAIDA, 'contratos.html'), 'w', encoding='utf-8').write(nomes_181.trocar(ct))
print('contratos ok', TC.count('<template data-est='), 'estados novos')
