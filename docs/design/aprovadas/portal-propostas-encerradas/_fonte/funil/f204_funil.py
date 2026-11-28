# F3.204 · Funil e Atendimentos: a proposta encerrada a pedido do titular sai das colunas e da lista
# "Propostas esperando resposta"; a barra do período ganha a linha "encerrada a pedido do titular".
# Parte do desenho aprovado do Funil em três números e uma barra (portal-comercial-financeiro-pendencias):
# comercial_pend.py, comercial.py, pend.py, pecas.py, clientes.py e comum.py são as cópias sem mudança (o comum.py
# é a cópia que lê o caminho de T3JUS_APROV, a mesma do desenho da F3.181). Peças novas com prefixo f204-.
# Grava funil.html. Uso: python3 f204_funil.py <pasta-saida>
import sys, os, tempfile
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
sys.path.insert(1, os.path.join(os.path.dirname(AQUI), 'comercial'))   # nomes_181.py (troca de nomes e marca de hoje)
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
sys.argv = [sys.argv[0], tempfile.mkdtemp()]   # o comercial_pend.py aprovado grava as páginas dele numa pasta temporária
import comercial_pend as P                     # noqa: E402
import nomes_181                               # noqa: E402
import elenco_204                              # noqa: E402
CM = P.CM
selo, ico, tpl = P.selo, P.ico, P.tpl

# Neste desenho Marina Alves Coelho é a cliente excluída; a cliente do desenho aprovado (Antônia) vira outra pessoa,
# para a troca de nomes da F3.181 não pôr Marina num contrato ou num contato de hoje.
PRE = [('Antônia Ferreira Prado', 'Helena Prado Souza'), ('Antônia', 'Helena'), ('joana.prado', 'clara.souza'),
       ('Joana Prado', 'Clara Souza'), ('Joana', 'Clara')]


def funil_barra_enc(total, contrato, andamento, enc, outro, pegou, voltou, atend, novo=True):
    """A barra aprovada (funil_barra) com o segmento e a linha "encerrada a pedido do titular" (só com enc > 0)."""
    base = P.funil_barra(total, contrato, andamento + enc, outro, pegou, voltou, atend)
    if not enc:
        return base
    # 1. a barra: o segmento novo entre "em andamento" e "fechou com outro"
    a = f'<span class="fb-a" style="flex:{andamento + enc}"></span>'
    assert a in base
    base = base.replace(a, f'<span class="fb-a" style="flex:{andamento}"></span><span class="f204-fb-e" style="flex:{enc}"></span>', 1)
    # 2. a frase para o leitor de tela
    d = f', {andamento + enc} com proposta em andamento, '
    assert d in base
    base = base.replace(d, f', {andamento} com proposta em andamento, {enc} {"encerrada" if enc == 1 else "encerradas"} a pedido do titular, ', 1)
    # 3. a legenda
    leg = (f'<li><span class="fb-m fb-a" aria-hidden="true"></span><b class="num">{andamento + enc}</b><span>proposta em andamento (abaixo)</span></li>')
    assert leg in base
    nova = (f'<li class="{"f204-novo " if novo else ""}f204-leg"><span class="fb-m f204-fb-e" aria-hidden="true"></span><b class="num">{enc}</b>'
            f'<span>encerrada a pedido do titular</span></li>')
    base = base.replace(leg, leg.replace(f'>{andamento + enc}<', f'>{andamento}<') + nova, 1)
    return base


def funil_f204(depois=True):
    """depois=False: o Funil de hoje, com as propostas de Marina (excluída) nas colunas e o arquivado contado em andamento."""
    f = P.funil_pend()
    # o bloco "Quanto vira contrato": hoje, 4 em andamento (um é de um cliente arquivado a pedido); depois, 3 e 1 encerrada
    velho = P.funil_barra(24, 9, 4, 1, 5, 3, 2)
    assert velho in f
    f = f.replace(velho, funil_barra_enc(24, 9, 3, 1, 1, 5, 3, 2) if depois else velho, 1)
    card = CM.card
    # as colunas: a aceita de Benedito passa a P-2026-018 (a P-2026-014 é de Marina, como na F3.181)
    b = card('Benedito Souza Lima', 'P-2026-014 · assina em 20/11', '')
    assert b in f
    f = f.replace(b, card('Benedito Souza Lima', 'P-2026-018 · assina em 20/11', ''), 1)
    if not depois:
        env = card('Daniela Rocha Mendes', 'P-2026-015 · R$ 1.500,00 + 20%', selo('urgente', 'retorno vencido', 'alerta'))
        assert env in f
        f = f.replace(env, env + card('Cliente excluído', 'P-2026-019 · R$ 2.000,00', ''), 1)
        f = f.replace('<h3>Proposta enviada <span class="disco" aria-hidden="true"><span>1</span></span><span class="sr">: 1</span></h3>',
                      '<h3>Proposta enviada <span class="disco" aria-hidden="true"><span>2</span></span><span class="sr">: 2</span></h3>', 1)
        ac = card('Benedito Souza Lima', 'P-2026-018 · assina em 20/11', '')
        f = f.replace(ac, ac + card('Cliente excluído', 'P-2026-014 · falta o contrato', ''), 1)
        f = f.replace('<h3>Aceita <span class="disco" aria-hidden="true"><span>1</span></span><span class="sr">: 1</span></h3>',
                      '<h3>Aceita <span class="disco" aria-hidden="true"><span>2</span></span><span class="sr">: 2</span></h3>', 1)
        assert f.count('Cliente excluído') == 2
    return f + P.j_funil('fechada') + P.j_voltar()


def atendimentos_f204(depois=True):
    a = P.atendimentos_pend()
    if depois:
        return a + P.j_funil('fechada')
    ult = '<span class="hn-sem">retorno em 25/11</span></li>'
    assert ult in a
    a = a.replace(ult, ult + f'<li><a href="comercial.html?estado=pr-encerrada-enviada-excluido">P-2026-019 · Cliente excluído</a>'
                  f'<small>Enviada em 14/11 · com Diego Almeida</small><span class="hn-sem">sem retorno marcado</span></li>', 1)
    return a + P.j_funil('fechada')


CSS_F204 = r"""
/* F3.204 (prefixo f204-). Anotação só do desenho: o que é novo leva contorno tracejado em âmbar. No produto, não há contorno. */
.f204-novo{outline:2px dashed #DD9760;outline-offset:3px;border-radius:2px}
/* O segmento da encerrada: listrado no tom vinho, da família de "receberam proposta", distinto do listrado âmbar de "sem motivo" */
.f204-fb-e{background:repeating-linear-gradient(135deg,var(--vinho-4) 0 2px,var(--papel) 2px 6px);box-shadow:inset 0 0 0 1.5px var(--vinho-4)}
"""

A = lambda sec, trilha, titulo: dict(area='comercial', secao=sec, atual='comercial', trilha=trilha, titulo=titulo)
T = ''
T += tpl('fu-hoje', funil_f204(False), **A('Funil', 'Comercial|Funil', 'Funil'))
T += tpl('fu-barra-encerrada', funil_f204(True), **A('Funil', 'Comercial|Funil', 'Funil'))
T += tpl('at-hoje', atendimentos_f204(False), **A('Atendimentos', 'Comercial|Atendimentos', 'Atendimentos'))
T += tpl('at-depois', atendimentos_f204(True), **A('Atendimentos', 'Comercial|Atendimentos', 'Atendimentos'))
out = P.injetar(P.CM.out, T, P.CSS_FU + CSS_F204, padrao='fu-barra-encerrada')
# o estado aprovado "funil" também mostra a forma de três números e uma barra, como no aprovado
_f = P.CM.funil()
_i = _f.index('<div class="cm-funil">')
_j = _f.index('</section>', _i)
out = out.replace(_f[_i:_j], P.funil_barra(24, 9, 4, 1, 5, 3, 2), 1)
for a, b in PRE:
    out = out.replace(a, b)
out = elenco_204.trocar(nomes_181.trocar(out))
out = out.replace('href="comercial.html?estado=funil"', 'href="funil.html?estado=fu-barra-encerrada"').replace('href="comercial.html?estado=fu-funil"', 'href="funil.html?estado=fu-barra-encerrada"')
out = out.replace('href="comercial.html?estado=atendimentos"', 'href="funil.html?estado=at-depois"').replace('href="comercial.html?estado=fu-atendimentos"', 'href="funil.html?estado=at-depois"')
open(os.path.join(SAIDA, 'funil.html'), 'w', encoding='utf-8').write(out)
print('funil ok', T.count('<template data-est='), 'estados novos')
