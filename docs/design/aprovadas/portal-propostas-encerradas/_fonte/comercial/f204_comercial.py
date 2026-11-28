# F3.204 · Propostas de cliente excluído ou arquivado a pedido do titular: a lista de Propostas, a ficha da
# proposta (enviada e rascunho), o histórico, a ação recusada e a edição pelo link.
# Parte do desenho aprovado da F3.181 (f181_contratos.py, cópia sem mudança, que importa comercial.py e
# contratos.py aprovados) e só acrescenta os estados novos, com peças de prefixo f204-. As peças que a F3.181
# já aprovou entram aqui sem o contorno dela (f181-novo), porque não são mais novas.
# Grava comercial.html. Uso: python3 f204_comercial.py <pasta-saida>
import sys, os, tempfile
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
_tmp = tempfile.mkdtemp()
sys.argv = [sys.argv[0], _tmp]          # o f181_contratos.py aprovado grava as páginas dele numa pasta temporária
import f181_contratos as F             # noqa: E402  (importa comercial.py e contratos.py aprovados)
CM = F.CM
from comum import tpl, aviso, ico      # noqa: E402
import nomes_181                       # noqa: E402

selo = CM.selo
U = 'comercial.html?estado='


def sem_contorno_181(h):
    """As peças da F3.181 já aprovadas, sem o contorno de 'novo'."""
    return (h.replace('<div class="f181-novo">', '<div>').replace(' f181-novo', '')
            .replace('<section class="folha f181-lat"', '<section class="folha f181-lat"'))


def novo(h, tag='div', cls=''):
    return f'<{tag} class="f204-novo{(" " + cls) if cls else ""}">{h}</{tag}>'


# ---------------------------------------------------------------- o selo novo
def selo_enc():
    """Selo neutro, com o ícone do histórico: no produto, SELO_ENCERRADA = { tom: "neutro", icone: "historico" }."""
    return selo('neutro', 'Encerrada a pedido', 'historico')


# ---------------------------------------------------------------- dados das duas propostas de Marina
P19 = dict(num='P-2026-019', srv='Revisão de aposentadoria', valor='R$ 2.000,00 mais êxito', enviada='14/11',
           hon=[('fixo', ' R$ 2.000,00'), ('exito', ' 30%')])
P14 = dict(num='P-2026-014', srv='Benefício por incapacidade', valor='R$ 3.500,00 mais êxito', aceita='12/11',
           hon=[('fixo', ' R$ 3.500,00'), ('exito', ' 20%')])
APAGADO = 'Serviço apagado a pedido do titular'
COND19 = [
    CM.cond_ler('fixo', 'R$ 2.000,00 <small>em uma parcela</small>', 'Vence 10 dias depois da assinatura do contrato.', 'Vira 1 recebimento programado.'),
    CM.cond_ler('exito', '30% <small>{sobre}</small>', 'Cobrado quando o caso chegar à etapa “Pagamento da RPV ou precatório”, com vencimento 15 dias depois.',
                'O valor só se sabe na etapa. Quando ela for marcada no caso, vira valor a receber e o Financeiro é avisado.'),
]
ESC19 = '<p>Pedido de revisão da aposentadoria no INSS e, se for negado, a ação na Justiça Federal até o pagamento das diferenças.</p>'


# ---------------------------------------------------------------- 1. a lista de Propostas, filtro novo
def lista_encerradas(excluido=False):
    chips = ('<div class="chips" role="group" aria-label="Mostrar"><button type="button" aria-pressed="false">Em andamento (5)</button>'
             '<button type="button" aria-pressed="false">Viraram contrato (9)</button><button type="button" aria-pressed="false">Recusadas (5)</button>'
             '<button type="button" aria-pressed="true" class="f204-novo f204-chip">Encerradas a pedido (2)</button></div>')
    ferr = (f'<form class="hn-ferr" role="search" action="#" onsubmit="return false"><div class="campo-busca"><label class="sr" for="pr-b">Buscar por cliente ou número</label>{ico("busca")}'
            f'<input class="entrada" id="pr-b" type="search" placeholder="Cliente ou número da proposta" autocomplete="off"></div>{chips}</form>')
    linhas = []
    for p, antes, est in ((P19, 'Enviada em 14/11', 'pr-encerrada-enviada'), (P14, 'Aceita em 12/11', 'proposta-aceita')):
        cli = 'Cliente excluído' if excluido else 'Marina Alves Coelho'
        srv = APAGADO if excluido else p['srv']
        href = U + (est + ('-excluido' if excluido else '-arquivado') if est.startswith('pr-') else
                    ('proposta-aceita-excluido' if excluido else 'proposta-aceita-arquivado'))
        selos = '<div class="hn-selos">' + ''.join(CM.selo_tipo(k, v) for k, v in p['hon']) + '</div>'
        linhas.append(([f'<div class="esc"><div><a href="{href}">{cli}</a><small>{p["num"]} · {srv}</small></div></div>', selos, 'Diego Almeida',
                        '<span class="hn-sem">—</span>', novo(f'{selo_enc()}<small>{antes}</small>', cls='f204-sit')], ''))
    tab = CM.tabela('Propostas', ['Proposta', 'Honorários', 'Responsável', 'Retorno', 'Situação'], linhas, ['30%', '24%', '15%', '10%', '21%'])
    cont = novo('<b>2 propostas encerradas a pedido do titular</b>', 'p', 'hn-cont')
    cont = cont.replace('<p class="f204-novo hn-cont">', '<p class="hn-cont f204-novo f204-cont" role="status">')
    pe = (f'<p class="hn-pe f204-novo f204-pe">{ico("historico")}<span>Proposta de cliente excluído ou arquivado a pedido do titular não segue. '
          f'Ela fica guardada como registro, com o que aconteceu até ali, e sai de Atendimentos, do Início e das colunas do <a href="funil.html?estado=fu-barra-encerrada">Funil</a>.</span></p>')
    return (f'<div class="hn">{CM.cab_props()}<section class="folha" aria-labelledby="t-pl" style="overflow:hidden"><h2 id="t-pl" class="sr">Lista de propostas</h2>{ferr}'
            f'{cont}{tab}{pe}</section></div>')


# ---------------------------------------------------------------- 2. a ficha da proposta encerrada
def hist19(rascunho=False, linha_encerrada=None):
    def ev(h, quem, txt, sub='', s='', forte=False):
        return (f'<li><time>{h}</time><span class="pto{" forte" if forte else ""}" aria-hidden="true"></span><div><p><b>{quem}</b> {txt}{s}</p>'
                + (f'<small>{sub}</small>' if sub else '') + '</div></li>')
    topo = ''
    if linha_encerrada:
        # Linha calculada (não gravada): sai da data em que o cliente foi excluído ou arquivado. Sem protocolo.
        topo = (f'<div class="eventos-dia f204-novo f204-hist"><h3>20/11/2026</h3><ol class="eventos"><li><time><span class="sr">sem hora</span></time>'
                f'<span class="pto" aria-hidden="true"></span><div><p>Encerrada a pedido do titular{selo_enc()}</p>'
                f'<small>{linha_encerrada}</small></div></li></ol></div>')
    dias = ''
    if not rascunho:
        dias += f'<div class="eventos-dia"><h3>14/11/2026</h3><ol class="eventos">{ev("16h10", "Diego Almeida", "marcou como enviada", "Mandou o arquivo da proposta por e-mail.", selo("andamento", "Enviada"))}</ol></div>'
    dias += f'<div class="eventos-dia"><h3>13/11/2026</h3><ol class="eventos">{ev("10h40", "Diego Almeida", "escreveu a proposta", "Depois do atendimento presencial de 13/11.")}</ol></div>'
    return (f'<section class="folha" aria-labelledby="t-hp" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-hp">Histórico da proposta</h2>'
            f'<p class="sub">Cada mudança e cada resposta, com quem e quando. Nada se apaga.</p></div></div>{topo}{dias}</section>')


def ficha19(situacao='excluido', rascunho=False, aviso_topo='', linha=False):
    """A ficha da P-2026-019 encerrada. situacao: excluido ou arquivado. rascunho: a proposta nunca foi enviada."""
    arq = situacao == 'arquivado'
    cliente = 'Marina Alves Coelho' if arq else 'Cliente excluído'
    servico = P19['srv'] if arq else APAGADO
    saiu = 'arquivado' if arq else 'excluído'
    if rascunho:
        sobre, txt = 'Rascunho', f'O cliente foi {saiu} a pedido do titular em 20/11/2026. A proposta não foi enviada e fica só como registro.'
        sit = '<span class="selo selo-neutro">Rascunho</span>'
    else:
        sobre = 'Enviada em 14/11'
        txt = (f'O cliente foi {saiu} a pedido do titular em 20/11/2026. A proposta fica só como registro, sem resposta: '
               f'não dá mais para registrar a resposta nem editar.')
        sit = '<span class="selo selo-ativo">Enviada</span>'
    d = (f'<section class="dir campo-ambar" aria-labelledby="t-enc"><p class="sobretitulo" id="t-enc">{sobre}</p>'
         f'<div class="f204-novo f204-dir"><p class="grande" style="font-size:30px">Não segue</p><p class="hn-oque">{txt}</p></div></section>')
    cab = CM.ficha_cab_p('P-2026-019', servico, sit, cliente, P19['valor'], d)
    conds = [c.replace('{sobre}', 'dos atrasados que o cliente receber' if arq else 'da base apagada a pedido do titular') for c in COND19]
    esc = CM.escopo(ESC19 if arq else '<p class="hn-nota">Apagado a pedido do titular.</p>')
    linha_txt = f'O cliente foi {saiu} a pedido do titular. A proposta não segue.' if linha else None
    corpo = CM.conds_ler(conds, sub='Ficam como registro.') + esc + hist19(rascunho, linha_txt)
    lat = F.lateral(cliente, docx=arq, explica=False).replace('27/11/2026', '28/11/2026')
    lat = lat.replace('<section class="folha" aria-labelledby="t-pc">', '<section class="folha f181-lat" aria-labelledby="t-pc">', 1)
    out = (f'<div class="hn">{cab}{aviso_topo}<div class="hn-grade"><div class="hn-col">{corpo}</div>'
           f'<aside class="hn-col" aria-label="Sobre a proposta">{lat}</aside></div></div>')
    out = sem_contorno_181(out)
    # Nada para editar, responder ou enviar: os botões de hoje não aparecem.
    for proibido in ('Registrar resposta', 'Editar', 'Marcar como enviada', 'Sem redigitar'):
        assert proibido not in out, proibido
    return out


def recusada(acao, situacao, rascunho=False):
    saiu = 'arquivado' if situacao == 'arquivado' else 'excluído'
    a = aviso('urgencia', f'Não deu para {acao}.',
              f'O cliente foi {saiu} a pedido do titular agora há pouco. A proposta abaixo já mostra como ficou: ela não segue.', extra=' f204-novo')
    return ficha19(situacao, rascunho=rascunho, aviso_topo=a)


# ---------------------------------------------------------------- 3. editar pelo link, e salvar recusado
def editar(situacao='excluido', salvar=False):
    saiu = 'arquivado' if situacao == 'arquivado' else 'excluído'
    ac = f'<a class="btn btn-sec" href="{U}pr-encerrada-enviada-{"arquivado" if situacao == "arquivado" else "excluido"}">{ico("esq")}Voltar para a proposta</a>'
    if salvar:
        a = aviso('urgencia', 'Não deu para salvar a proposta.',
                  f'O cliente foi {saiu} a pedido do titular agora há pouco. A proposta não segue: ela fica só como registro, sem as mudanças.', acoes=ac, extra=' f204-novo')
    else:
        a = aviso('info', 'A proposta não segue.',
                  f'O cliente foi {saiu} a pedido do titular em 20/11/2026. Ela fica só como registro e não se edita mais.', acoes=ac, extra=' f204-novo')
    return f'<div class="hn f181-so-aviso">{a}</div>'


CSS_F204 = r"""
/* F3.204 (prefixo f204-). Anotação só do desenho: o que é novo leva contorno tracejado em âmbar. No produto, não há contorno. */
.f204-novo{outline:2px dashed #DD9760;outline-offset:4px;border-radius:2px}
.aviso.f204-novo{outline-offset:3px;border-radius:var(--raio-grande)}
.dir>.f204-dir{display:flex;flex-direction:column;gap:8px;padding:6px;margin:-6px;outline-offset:-1px}
.f204-sit{display:flex;flex-direction:column;align-items:flex-start;gap:4px;outline-offset:2px}
.f204-sit small{font-size:12.5px;color:var(--texto-2);line-height:1.35}
.f204-chip{outline-offset:2px;border-radius:22px}
.f204-cont{outline-offset:-2px}
.hn-pe.f204-pe{outline-offset:-4px}
.f204-hist{outline-offset:-2px}
.f204-hist .eventos time{min-width:0}
@media (max-width:760px){.f204-sit{align-items:flex-end;text-align:right}}
"""

PM = dict(area='comercial', secao='Propostas', atual='comercial', trilha='Comercial|Propostas', titulo='Propostas')
PF = dict(area='comercial', secao='Propostas', atual='comercial', trilha='Comercial|Propostas|P-2026-019', titulo='P-2026-019')
PE = dict(area='comercial', secao='Propostas', atual='comercial', trilha='Comercial|Propostas|Editar proposta', titulo='Editar proposta')
T = ''
T += tpl('pl-encerradas', lista_encerradas(), **PM)
T += tpl('pl-encerradas-excluido', lista_encerradas(True), **PM)
T += tpl('pr-encerrada-enviada-excluido', ficha19('excluido'), **PF)
T += tpl('pr-encerrada-enviada-arquivado', ficha19('arquivado'), **PF)
T += tpl('pr-encerrada-rascunho', ficha19('arquivado', rascunho=True), **PF)
T += tpl('pr-historico-encerrada', ficha19('excluido', linha=True), **PF)
T += tpl('pr-acao-recusada', recusada('registrar a resposta', 'excluido'), quem='comercial', **PF)
T += tpl('pr-acao-recusada-enviada', recusada('marcar como enviada', 'arquivado', rascunho=True), quem='comercial', **PF)
T += tpl('ed-encerrada', editar('excluido'), **PE)
T += tpl('ed-encerrada-salvar', editar('arquivado', salvar=True), quem='comercial', **PE)

# A P-2026-014 da lista aprovada é de Benedito; aqui ela é de Marina (F3.181). Benedito passa a P-2026-018.
base = F.CM.out.replace('<small>P-2026-014 · Aposentadoria por idade</small>', '<small>P-2026-018 · Aposentadoria por idade</small>')
cm = F.montar_pagina(base, F.TM + T, F.CSS_F181 + CSS_F204)
cm = cm.replace('"estado":"propostas"', '"estado":"pl-encerradas"', 1)
cm = nomes_181.trocar(cm)
# As abas Funil e Atendimentos levam aos estados deste desenho (funil.html)
cm = cm.replace('href="comercial.html?estado=funil"', 'href="funil.html?estado=fu-barra-encerrada"').replace('href="comercial.html?estado=atendimentos"', 'href="funil.html?estado=at-depois"')
assert 'Marina Ribeiro' not in cm.split('<template data-est="pl-encerradas"')[1]
open(os.path.join(SAIDA, 'comercial.html'), 'w', encoding='utf-8').write(cm)
print('comercial ok', T.count('<template data-est='), 'estados novos')
