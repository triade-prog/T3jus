# Portal · Clientes › ficha ligada: "Cliente atendido" para o cliente cujo único caso veio encerrado de outro sistema
# e teve o resultado registrado (decisoes-plano-2.md, decisão 2).
# Base sem mudança: jornada.py aprovado (portal-jornada-fechamento), lido até as peças da 1ª parte, sem gerar o HTML dele;
# ele lê ficha_ligada.py, clientes.py, juridico.py e as telas aprovadas em docs/design/aprovadas/ (variável APROV).
# As cópias ficam em _fonte/jornada/; a única troca é o comum.py, que é o mesmo do sobras (caminho por T3JUS_APROV).
# O selo da origem (il-orig) vem do CSS il- aprovado do sobras.py. Uso: python3 cliente.py <pasta-saida>
import os, sys, re

AQUI = RAIZ = os.path.dirname(os.path.abspath(__file__))
JD = os.path.join(AQUI, 'jornada')
SAIDA = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'saida')
os.environ.setdefault('APROV', os.environ.get('T3JUS_APROV', '/home/user/t3jus/docs/design/aprovadas/'))
sys.path.insert(0, JD)
_src = open(os.path.join(JD, 'jornada.py'), encoding='utf-8').read()
_corte = '# ---------------------------------------------------------------- 1. "Anexar os assinados"'
_g = {'__name__': 'jornada', '__file__': os.path.join(JD, 'jornada.py')}
sys.argv = [sys.argv[0], SAIDA]
exec(compile(_src[:_src.index(_corte)], 'jornada.py', 'exec'), _g)
globals().update({k: v for k, v in _g.items() if not k.startswith('__')})

# O CSS il- aprovado (só o bloco, lido do sobras.py)
_sob = open(os.path.join(RAIZ, 'sobras.py'), encoding='utf-8').read()
CSS_IL = re.search(r'CSS_IL = r"""(.*?)"""', _sob, re.S).group(1)


def orig_l():
    return f'<span class="il-orig il-orig-l">{ico("enviar")}<span class="sr">Origem: </span>Astrea · backup</span>'


CASO_Q = 'Queiroz x Construtora Lume'
REN = dict(nome='Renata Queiroz', tp='PF', desde='21/11/2026')
NQ = dict(atendimentos=0, propostas=0, contratos=0, casos=1)
JR = 'juridico.html?estado='

# O âmbar do "Cliente atendido" aprovado (dir_fecha), sem os 4 passos do fechamento: este caso não tem contrato nem acerto.
D_ATQ = (f'<section class="dir campo-ambar fl-passo" aria-labelledby="t-passo"><p class="sobretitulo" id="t-passo">Próximo passo</p>'
         f'<p class="grande" style="font-size:30px">Cliente atendido</p>'
         f'<p class="cl-oque"><b>{CASO_Q}: ganho, veio encerrado do Astrea.</b></p>'
         f'<div class="fl-acoes"><a class="btn btn-sec" href="#" data-rota="/comercial/propostas/nova?cliente=rq">{ico("maleta")}Gerar proposta</a>'
         f'<a class="btn btn-fantasma" href="{JR}resultado-feito">{ico("balanca")}Ver o caso</a></div></section>')


def aba_casos_q():
    sub = 'Os casos e processos em que Renata é cliente. Um processo pode ter mais de um cliente.'
    sem = f'<span class="selo selo-neutro">{ico("pasta")}Sem acerto</span>'
    linhas = [('', [f'<div class="fl-num il-fl-num"><a href="{JR}resultado-feito">{CASO_Q}</a><small class="num">1001190-31.2021.5.02.0012 · Trabalhista</small>'
                    f'<div style="margin-top:4px">{orig_l()}</div></div>',
                    f'<div class="fl-et"><b>Encerrado</b>{J["mini"](8)}<small>8 de 8 · ganho registrado em 23/11</small></div>',
                    '<b>Reclamante</b><small>Única cliente do caso</small>', J['resp']('Marina Ribeiro'),
                    f'{sem}<small style="display:block;margin-top:4px;font-size:12px;color:var(--texto-2)">Veio sem contrato</small>'])]
    cards = cartao(CASO_Q, f'{JR}resultado-feito', '1001190-31.2021.5.02.0012',
                   [('Etapa', 'Encerrado · ganho registrado em 23/11'), ('Papel', 'Reclamante'), ('Responsável', 'Marina Ribeiro')], sem + orig_l())
    pe = '<div class="fl-pe"><span><b>1 caso</b>, encerrado. Veio encerrado do Astrea, sem contrato: não há acerto no Financeiro.</span></div>'
    return folha_aba('t-aba', 'Casos', sub, tabela('Casos de Renata', ['Caso', 'Etapa', 'Renata no caso', 'Responsável', 'Acerto'], [27, 22, 17, 18, 16], linhas, cards, pe))


FTQ = dict(atual='clientes', trilha='Clientes|Renata Queiroz', titulo='Renata Queiroz', aba='casos')
add('cliente-atendido', ficha_x(REN, D_ATQ, 'casos', aba_casos_q(), NQ) + j_registrar(), 'Cliente atendido: o caso que veio encerrado, com o resultado registrado', **FTQ)

out = pagina('Renata Queiroz', 'Ficha do cliente cujo único caso veio encerrado de outro sistema e teve o resultado registrado: “Cliente atendido”.',
             '{"estado":"cliente-atendido","atual":"clientes"}', '', _g['T'], ''.join(BARRAS.values()))
CSS_IL += '\n/* Rodada curta: o link do caso na aba Casos com 24 px de alvo (WCAG 2.5.8) */\n.il-fl-num>a{display:inline-flex;align-items:center;min-height:24px}\n'
out = out.replace('</style>', CSS_CL + '\n' + J['CSS_JU'] + '\n' + CSS_FL + '\n' + CSS_EXTRA + '\n' + CSS_JF + '\n' + CSS_IL + '\n</style>', 1)
os.makedirs(SAIDA, exist_ok=True)
open(os.path.join(SAIDA, 'cliente.html'), 'w', encoding='utf-8').write(out)
print('cliente ok', _g['T'].count('<template data-est='), 'estado')
