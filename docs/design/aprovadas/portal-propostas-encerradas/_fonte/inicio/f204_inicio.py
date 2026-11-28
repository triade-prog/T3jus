# F3.204 · Início: no rodapé do bloco Comercial, a proposta encerrada a pedido do titular deixa de contar.
# Nada novo para desenhar: o rodapé é o de hoje com outro número. Dois estados, hoje e depois, para a Carol comparar.
# Parte do Início aprovado (portal-inicio-audiencias): executa o inicio_audiencias.py (cópia sem mudança) até antes
# da montagem da página, acrescenta os dois estados e monta a página com o mesmo fim.
# O rodapé segue o texto que o produto mostra hoje (Inicio.tsx, BlocoComercial): uma linha para os contatos e
# outra para as propostas, "N propostas esperando resposta; a mais antiga: …".
# Grava inicio.html. Uso: python3 f204_inicio.py <pasta-saida>
import sys, os
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
sys.path.insert(1, os.path.join(os.path.dirname(AQUI), 'comercial'))
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
import nomes_181, elenco_204   # noqa: E402

_src_pa = open(os.path.join(AQUI, 'inicio_audiencias.py'), encoding='utf-8').read()
_corte = '# ---------------------------------------------------------------- página (o mesmo fim do inicio_areas.py)'
_cab_pa, _fim_pa = _src_pa[:_src_pa.index(_corte)], _src_pa[_src_pa.index(_corte):]
__file__ = os.path.join(AQUI, 'inicio_audiencias.py')
exec(compile(_cab_pa, 'inicio_audiencias.py', 'exec'), globals())

ROD_APROV = pe('<b>Mostrando 5 de 7.</b> Os outros 2 são para hoje, com Diego (Rafael e Lúcia). Propostas esperando resposta: 3, uma com o retorno vencido ontem (P-2026-015, Diego).',
               L_COM, 'Ver todos', 'maleta')


def comercial_f204(n):
    b = b_comercial(True)
    assert ROD_APROV in b
    rod = (pe('<b>Mostrando 5 de 7.</b> Os outros 2 são para hoje, com Diego (Rafael e Lúcia).', 'funil.html?estado=at-depois', 'Ver todos', 'pessoas')
           + pe(f'{n} propostas esperando resposta; a mais antiga: P-2026-013, de Construtora Vale Alto.', 'comercial.html?estado=pl-encerradas', 'Propostas', 'maleta'))
    return b.replace(ROD_APROV, rod, 1)


def pagina_f204(n):
    cart = cartoes_marina(True)
    alvo = '<b>3 propostas</b> esperando resposta'
    assert alvo in cart
    cart = cart.replace(alvo, f'<b>{n} propostas</b> esperando resposta', 1)
    blocos = comercial_f204(n) + b_contratos(True) + b_financeiro(True) + b_juridico_pa(True)
    return pagina_pa(HERO_MARINA(), faixa(cart, 'Hoje no escritório', 'Os itens de toda a equipe, cada um com o responsável. A agenda já é da equipe toda.', chips('equipe')),
                     blocos) + j_registrar()


T += tpl('in-hoje', pagina_f204(4), **I)
T += tpl('in-depois', pagina_f204(3), **I)

exec(compile(_fim_pa, 'inicio_audiencias.py (fim)', 'exec'), globals())

# Os nomes do plano (os mesmos da F3.181) e a marca de hoje; a cliente do desenho aprovado (Antônia) vira outra
# pessoa, porque neste desenho Marina Alves Coelho foi excluída e não aparece entre os contatos de hoje.
p = os.path.join(SAIDA, 'inicio.html')
h = open(p, encoding='utf-8').read()
for a, b in [('Antônia Ferreira Prado', 'Helena Prado Souza'), ('Antônia', 'Helena'), ('joana.prado', 'clara.souza'), ('Joana Prado', 'Clara Souza'), ('Joana', 'Clara')]:
    h = h.replace(a, b)
h = elenco_204.trocar(nomes_181.trocar(h))
import re   # noqa: E402
h = re.sub(r'"estado":"[^"]+"', '"estado":"in-depois"', h, count=1)
open(p, 'w', encoding='utf-8').write(h)
print('inicio ok, 2 estados novos')
