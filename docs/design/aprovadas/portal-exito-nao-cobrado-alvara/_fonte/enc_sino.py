# Portal · F3.191 (D40): o aviso EXITO_COBRADO_NO_ALVARA no sino (prefixo enc-).
# Base técnica, lida sem mudança: sino_caso.py aprovado (portal-sino-caso-encerrado), executado até o começo dos
# estados (dali vêm o sino aprovado: item, dia, painel, FUNDO, FUNDO_J, B, CSS_SI, CSS_SP, SCRIPT_SI e as listas).
# A responsável do caso é Larissa Costa, só com o Jurídico, como no elenco aprovado (D35; decidido na revisão).
# Uso: python3 enc_sino.py <pasta-saida>
import os, sys, json
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
_ARGV = list(sys.argv)
_src = open(os.path.join(AQUI, 'sino_caso.py'), encoding='utf-8').read()
_src = _src[:_src.index("\nEST = []\nT = ''\n")]
exec(compile(_src, 'sino_caso.py', 'exec'), globals())
sys.argv = _ARGV
SAIDA = _ARGV[1] if len(_ARGV) > 1 else 'saida'


ICO.update({'exito': 'balanca'})
SEB, CASO = 'Sebastião Prado', 'Prado x Seguradora Lince'
COMB = 'Sebastião aceitou pagar o êxito com este alvará, por telefone em 17/11.'
SELO_COB = '<span class="selo selo-atencao">Cobrado no alvará</span>'


def cobrado(fin=True, novo=True):
    """O aviso EXITO_COBRADO_NO_ALVARA. fin: quem tem a área Financeiro com financeiro.ver (valor, calculado e combinado)."""
    if fin:
        tit = f'<b>Diego Almeida</b> cobrou no alvará os honorários do êxito de {SEB}'
        det = (f'Estava como não cobrado (perdoado). R$ 3.000,00 de R$ 3.000,00 calculados. '
               f'Combinado: <q>{COMB}</q> {CASO}.')
        return item('exito', tit, det, 'Abrir o repasse', 'financeiro.html?estado=enc-historico', '10h14', novo, selo=SELO_COB)
    tit = f'<b>Diego Almeida</b> cobrou no alvará os honorários do êxito de {SEB}, que estava como não cobrado'
    det = f'Na conferência, o motivo foi perdoado. {CASO}. Os valores ficam com o Financeiro.'
    return item('exito', tit, det, 'Abrir o caso', 'caso.html?estado=enc-acerto-larissa', '10h14', novo, selo=SELO_COB)


# Os outros avisos de Larissa, os do sino aprovado (sino.py, larissa()).
def larissa_hoje():
    return [item('ia', 'A IA passou a conversa de <b>Marta Corrêa</b> para você',
                 '<q>A audiência de terça continua marcada?</q> Hélio Batista Corrêa', 'Abrir a conversa', '#conversa-marta', '9h48', True),
            item('prazo', 'Prazo em 2 dias: <b>réplica</b> de Hélio Batista Corrêa',
                 'Vence sexta, 20/11. Responsável: você. Proc. 1021877-05.2026.8.26.0100.', 'Abrir o prazo', '#prazo-helio', '7h00', True,
                 selo='<span class="selo selo-atencao">em 2 dias</span>')]


def larissa_ontem():
    return [item('assumiu', '<b>Marina Ribeiro</b> assumiu a conversa de Gabriela Teixeira, que era sua',
                 'Você estava em audiência. A troca ficou registrada na conversa.', 'Abrir a conversa', '#conversa-gabriela', '14h15')]


EST, T = [], ''
T += tela('enc-sino', 'Marina (com Financeiro): o aviso com valor, calculado e combinado',
          [('Hoje', [cobrado()] + marina_hoje()[:2]), ('Ontem · 17/11', marina_ontem(carvalho(novo=False))[:2])], 'socio')
T += tela('enc-sino-larissa', 'Larissa (só Jurídico): o mesmo aviso, sem valores',
          [('Hoje', [cobrado(fin=False)] + larissa_hoje()), ('Ontem · 17/11', larissa_ontem())], 'juridico', fundo=FUNDO_J)

ROT = dict(EST)
nav = '<p>O sino</p>' + ''.join(f'<a href="?estado={e}">{ROT[e]}</a>' for e, _ in EST)
NAV = (f'<details id="fl-estados"><summary>{ico("menu")}<span class="sr">Estados desenhados: </span><b>Estados</b></summary>'
       f'<nav class="fl-lista" aria-label="Estados desenhados">{nav}</nav></details>')
out = pagina('Clientes', 'Portal: o aviso no sino quando o êxito não cobrado é cobrado no alvará (F3.191).',
             '{"estado":"enc-sino","atual":"clientes"}', '', T)
out = out.replace('</style>', CSS_CL + '\n</style>', 1)
out = finalizar_sas(out, CSS_SI + CSS_SP)
out = out.replace('<script>\n(function(){', NAV + '\n<script>\n(function(){', 1)
out = out.replace('</body>', SCRIPT_SI + '\n</body>', 1)
os.makedirs(SAIDA, exist_ok=True)
open(os.path.join(SAIDA, 'sino.html'), 'w', encoding='utf-8').write(out)
json.dump(ROT, open(os.path.join(AQUI, '_rot_sino.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('sino ok', len(EST), 'estados')
