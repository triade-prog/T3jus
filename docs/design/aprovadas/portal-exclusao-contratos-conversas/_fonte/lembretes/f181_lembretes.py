# F3.186 · Contratos › Lembretes: a janela de dispensar e o "Trazer de volta" abertos antes da exclusão do cliente.
# Parte do desenho aprovado portal-importacao-sobras-rodada2 (lembretes.html, estados ja-dispensado e trazido):
# executa o rodada2.py aprovado (cópias sem mudança nesta pasta, com jornada/), usa as peças dele e grava
# lembretes.html só com os estados novos (prefixo f181-). Uso: python3 f181_lembretes.py <pasta-saida>
import sys, os
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
sys.path.insert(1, os.path.dirname(AQUI))
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
R = {'__name__': 'rodada2_aprovado', '__file__': os.path.join(AQUI, 'rodada2.py')}
sys.argv = [sys.argv[0], SAIDA]
exec(compile(open(os.path.join(AQUI, 'rodada2.py'), encoding='utf-8').read(), 'rodada2.py', 'exec'), R)
for f in ('juridico.html',):  # o rodada2 grava as páginas aprovadas; aqui só fica a dos lembretes, regravada abaixo
    p = os.path.join(SAIDA, f)
    if os.path.exists(p):
        os.remove(p)
import nomes_181

ico, aviso, tpl = R['ico'], R['aviso'], R['tpl']


def j_excluido():
    """O conflito aprovado (JA_RESOLVIDO) com o motivo CLIENTE_EXCLUIDO."""
    j = R['j_dispensar'](nome='Antônia Ferreira Prado', caso=None, valor='1.840,00', n=3, abrir=True, conflito=True)
    velho = R['aviso']('urgencia', 'Este lembrete já saiu da lista.', 'Felipe Matos criou o contrato C-2026-038 para Osvaldo há 2 minutos, e o lembrete saiu sozinho. Nada foi dispensado. Feche a janela para ver a lista atualizada.')
    assert velho in j
    novo = aviso('urgencia', 'A cliente foi excluída a pedido do titular.', 'O lembrete saiu da lista. Não há o que dispensar, e nada foi gravado. Feche a janela para ver a lista atualizada.', extra=' f181-novo')
    j = j.replace(velho, novo)
    d = '-d">Alguém mexeu neste lembrete enquanto a janela estava aberta.</p>'
    assert d in j
    return j.replace(d, '-d">Os dados da cliente foram excluídos enquanto a janela estava aberta.</p>')


def trazer_excluido():
    a = aviso('urgencia', 'Não deu para trazer de volta. A cliente foi excluída a pedido do titular.',
              'O lembrete de Antônia saiu da lista. Não há o que trazer de volta. A lista abaixo já está atualizada.', extra=' f181-novo')
    p = R['dispensados']()
    h2 = '<h2 id="t-ill" class="sr">Lista de lembretes</h2>'
    assert h2 in p
    return p.replace(h2, h2 + f'<div class="f181-topo-lista">{a}</div>', 1)


CSS_F181 = r"""
/* F3.186 (prefixo f181-). Anotação só do desenho: o que é novo leva contorno tracejado em âmbar. No produto, não há contorno. */
.f181-novo{outline:2px dashed #DD9760;outline-offset:3px;border-radius:var(--raio-grande)}
.f181-topo-lista{padding:16px 24px 0}
@media (max-width:760px){.f181-topo-lista{padding:16px 16px 0}}
"""

A = R['A']
T = ''
T += tpl('lembrete-excluido-na-hora', R['lista']() + j_excluido(), **A)
T += tpl('trazer-excluido-na-hora', trazer_excluido(), **A)
out = R['montar']('lembretes.html', 'Lembretes de contrato', 'A janela de dispensar e o trazer de volta de lembrete de cliente excluído a pedido do titular (F3.186).',
                  '{"estado":"lembrete-excluido-na-hora","atual":"contratos"}', T, R['barras']('contratos', R['URL']), R['CSS_PAG'] + R['CSS_IL2'] + CSS_F181)
open(os.path.join(SAIDA, 'lembretes.html'), 'w', encoding='utf-8').write(nomes_181.trocar(out))
print('lembretes ok', T.count('<template data-est='), 'estados')
