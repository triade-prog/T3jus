# Portal · sino: o aviso "o caso foi encerrado no financeiro" (F3.150; EX-16, EX-17, PT-02, PT-10).
# Parte do sino aprovado do F3.147 (sino_caso.py, lido até o começo dos estados, sem mudança), que por sua vez lê o sino
# aprovado (sino.py): o mesmo painel, o mesmo item, o mesmo CSS (com a linha "Agora:") e o mesmo script.
# Peça nova: só a regra .si-nr (o número do contrato não quebra no hífen). O aviso novo é o item aprovado, com o ícone do "pronto" (cadeado).
# Uso: python3 sino_fechou.py <pasta-saida>
import os, sys, json, re

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
_ARGV_F = list(sys.argv)
_SAIDA_F = _ARGV_F[1] if len(_ARGV_F) > 1 else 'saida'

_src = open(os.path.join(AQUI, 'sino_caso.py'), encoding='utf-8').read()
_src = _src[:_src.index("\nEST = []\nT = ''\n")]
exec(compile(_src, 'sino_caso.py', 'exec'), globals())
SAIDA = _SAIDA_F
import estados

# Felipe Matos, com as áreas do elenco aprovado (Comercial, Contratos e Jurídico; sem o Financeiro)
comum.SCRIPT = comum.SCRIPT.replace(
    "    'sem-area':{",
    "    felipe:{nome:'Felipe Matos',ini:'F',papel:'Áreas: Comercial, Contratos e Jurídico',areas:['comercial','contratos','juridico'],dono:false},\n"
    "    'sem-area':{", 1)
assert "felipe:{" in comum.SCRIPT

ICO.update({'fechou': 'cadeado'})
# A única peça a mais: o número do contrato no detalhe não quebra no hífen
CSS_SP += "\n/* F3.150: o número do contrato no detalhe do aviso não quebra no hífen */\n.si-det .si-nr{white-space:nowrap}\n"

# ---------------------------------------------------------------- o item novo
# Título igual para todos, no passado, como no F3.147. Selo e destino dizem o que fazer; o "Agora:" é a linha aprovada.
# Revisão do desenho, ajuste 2: o que o selo diz entra também no nome do link (trecho para o leitor de tela), com ou sem "Agora:".
# Ajuste 9: "Fechamento feito" e "Segue com outro caso".
FALTA = '<span class="selo selo-andamento">Falta o contrato</span>'
FALTAM = '<span class="selo selo-andamento">Faltam os contratos</span>'
ENC1 = '<span class="selo selo-neutro">Contrato encerrado</span>'
ENCN = '<span class="selo selo-neutro">Contratos encerrados</span>'
SEGUE = '<span class="selo selo-neutro">Segue com outro caso</span>'
FEITO = '<span class="selo selo-ok">Fechamento feito</span>'


def fechou(caso, det, onde, href, hora, novo=False, selo='', sr='', agora=None):
    """Um aviso CASO_ENCERRADO_FINANCEIRO. sr: o trecho para o leitor de tela (paraLeitor), sempre presente;
    agora: a frase da linha "Agora:" (agoraFechou). Com agora, o trecho começa por "Agora:", como no F3.147."""
    assert sr
    tit = f'O caso <b>{caso}</b> foi encerrado no financeiro'
    det, agora = nr(det), nr(agora) if agora else agora
    if agora:
        tit += f'<span class="sr">. Agora: {sr}.</span>'
        det = f'{det}</p><p class="si-det"><b class="si-agora">Agora:</b> {agora}'
    else:
        tit += f'<span class="sr">. {sr}.</span>'
    return item('fechou', tit, det, onde, href, hora, novo, selo=selo)


def nr(txt):
    """O número do contrato não quebra no hífen (no celular, "C-2026-" ficava numa linha e "025" na outra)."""
    return re.sub(r'C-\d{4}-\d{3}', lambda m: f'<span class="si-nr">{m.group(0)}</span>', txt)


def ctr(n):
    return f'#contrato-{n.lower()}'


# Grupo A (papel CONTRATOS). Caso Carvalho: Diego (sem Contratos) encerrou hoje às 10h05; o C-2026-012 ficou aberto
# (estado aprovado encerrar-sem-contratos); o C-2026-013, de Cláudio, já estava encerrado desde 12/11.
# Na linha "Agora:", quem encerrou o contrato (ajuste 7): "você" para a própria pessoa, o nome para as outras.
CARV_A = 'Diego Almeida encerrou o caso no financeiro, e o C-2026-012, de Noemi Bastos Carvalho, continua aberto.'


def carv_a(novo=True, agora=False):
    if agora:
        return fechou(CARV, CARV_A, 'Ver o C-2026-012', ctr('C-2026-012'), '10h05', novo, ENC1, 'contrato encerrado',
                      agora='você encerrou o C-2026-012 hoje.')
    return fechou(CARV, CARV_A + ' Encerre o contrato.', 'Encerrar o C-2026-012', ctr('C-2026-012') + '-encerrar', '10h05', novo, FALTA,
                  'Falta encerrar o C-2026-012')


# Caso Nogueira (os três clientes do F3.147): o C-2026-010, de Rui Nogueira, já estava encerrado; ficam dois abertos.
NOG = 'Nogueira x Transportes Serra'
NOG_A = ('Diego Almeida encerrou o caso no financeiro, e continuam abertos o C-2026-025, de Lúcia Nogueira, '
         'e o C-2026-026, de Paulo Nogueira.')


def nog_a(novo=True, agora=None):
    if agora == 'parcial':  # ajuste 8: diz o que mudou e o que falta
        return fechou(NOG, NOG_A + ' Encerre os contratos.', 'Encerrar o C-2026-026', ctr('C-2026-026') + '-encerrar', '10h40', novo, FALTA,
                      'falta o C-2026-026', agora='você encerrou o C-2026-025 hoje; falta o C-2026-026.')
    if agora == 'todos':
        return fechou(NOG, NOG_A, 'Ver o C-2026-025', ctr('C-2026-025'), '10h40', novo, ENCN, 'contratos encerrados',
                      agora='você encerrou os contratos hoje.')
    return fechou(NOG, NOG_A + ' Encerre os contratos.', 'Encerrar o C-2026-025', ctr('C-2026-025') + '-encerrar', '10h40', novo, FALTAM,
                  'Falta encerrar 2 contratos')


VIANA = fechou('Inventário de Augusto Viana',
               'Diego Almeida encerrou o caso no financeiro, e continuam abertos o C-2026-028, de Clara Viana, '
               'o C-2026-029, de Rafael Viana, e mais 1 contrato. Encerre os contratos.',
               'Encerrar o C-2026-028', ctr('C-2026-028') + '-encerrar', '16h20', False, FALTAM, 'Falta encerrar 3 contratos')

# Grupo B (papel RESPONSAVEL): Larissa, só Jurídico, responsável pelo caso Fontes (C-2026-032, de Márcia Fontes).
# Ajuste 1: quem encerra contratos é a regra do grupo A (área Contratos e contratos.editar): Bianca, Felipe e Marina,
# em ordem alfabética, como o quemContratos (0900). Ajuste 10: o nome do cliente ao lado do contrato.
FONTES = 'Fontes x Hospital São Lucas'
QUEM_CTR = 'Quem encerra o C-2026-032, de Márcia Fontes, é a área Contratos (Bianca Torres, Felipe Matos e Marina Ribeiro).'
VER_CASO = ('Ver o caso', '#caso-fontes')


def fontes_b(modo, novo=True):
    if modo == 'junto':
        return fechou(FONTES, 'Marina Ribeiro encerrou o caso no financeiro e, junto, o C-2026-032, de Márcia Fontes. O fechamento do caso terminou.',
                      *VER_CASO, '10h12', novo, FEITO, 'O fechamento terminou')
    det = f'Diego Almeida encerrou o caso no financeiro. {QUEM_CTR}'
    if modo == 'falta':
        return fechou(FONTES, det, *VER_CASO, '16h10', novo, FALTA, 'Falta encerrar o C-2026-032, com a área Contratos')
    return fechou(FONTES, det, *VER_CASO, '16h10', novo, FEITO, 'fechamento terminou',
                  agora='Felipe Matos encerrou o C-2026-032 hoje, e o fechamento do caso terminou.')


SEGUE_B = fechou('Martins x INSS · auxílio-doença',
                 'Diego Almeida encerrou o caso no financeiro. O C-2026-007, de Ivone Martins, fica aberto, porque as parcelas seguem com o caso '
                 'Martins x INSS · aposentadoria.', 'Ver o caso', '#caso-martins', '10h30', True, SEGUE, 'O contrato segue com outro caso')


# ---------------------------------------------------------------- os outros avisos de cada pessoa (tipos que já existem)
def felipe_hoje():
    return [
        item('ia', 'A IA passou a conversa de <b>Daniel Moura</b> para você',
             '<q>Recebi a proposta, mas queria entender a parte do êxito.</q> Daniel Moura', 'Abrir a conversa', '#conversa-daniel', '9h12', True),
        item('prazo', 'Prazo em 5 dias: <b>contrarrazões</b> da Construtora Vale Alto Ltda.',
             'Vence segunda, 23/11. Responsável: você. Proc. 1009876-14.2026.8.26.0100.', 'Abrir o prazo', '#prazo-vale', '7h00', True,
             selo='<span class="selo selo-neutro">em 5 dias</span>'),
    ]


def felipe_ontem():
    return [
        item('pedido', '<b>Gustavo Lima</b> pediu o contrato de <b>Marta Corrêa</b>',
             'Proposta P-2026-031, inventário, aceita em 17/11. O contrato nasce com as condições da proposta.', 'Gerar o contrato', '#proposta-031', '14h20',
             selo='<span class="selo selo-andamento">Pedido</span>'),
    ]


# Larissa: a lista aprovada do sino (sino.py: larissa), em listas, para o aviso novo entrar na ordem da hora
def larissa_hoje():
    return [
        item('ia', 'A IA passou a conversa de <b>Marta Corrêa</b> para você',
             '<q>A audiência de terça continua marcada?</q> Hélio Batista Corrêa', 'Abrir a conversa', '#conversa-marta', '9h48', True),
        item('prazo', 'Prazo em 2 dias: <b>réplica</b> de Hélio Batista Corrêa',
             'Vence sexta, 20/11. Responsável: você. Proc. 1021877-05.2026.8.26.0100.', 'Abrir o prazo', '#prazo-helio', '7h00', True,
             selo='<span class="selo selo-atencao">em 2 dias</span>'),
    ]


def larissa_ontem():
    return [
        item('assumiu', '<b>Marina Ribeiro</b> assumiu a conversa de Gabriela Teixeira, que era sua',
             'Você estava em audiência. A troca ficou registrada na conversa.', 'Abrir a conversa', '#conversa-gabriela', '14h15'),
    ]


EST = []
T = ''
H, O = 'Hoje', 'Ontem · 17/11'

# 1. sf-contrato · Felipe (Contratos): um contrato aberto, no meio da lista dele
T += tela('sf-contrato', estados.ROT['sf-contrato'], [(H, [carv_a()] + felipe_hoje()), (O, felipe_ontem())], 'felipe', fundo=FUNDO)

# 2. sf-varios · dois contratos abertos (Nogueira) e, abaixo, três ou mais (Viana)
T += tela('sf-varios', estados.ROT['sf-varios'], [(H, [nog_a()] + felipe_hoje()), (O, [VIANA] + felipe_ontem())], 'felipe', fundo=FUNDO)

# 3. sf-socia · Marina: o aviso novo e, ontem, o de "pronto" do mesmo caso, com "Agora: Diego encerrou"
T += tela('sf-socia', estados.ROT['sf-socia'],
          [(H, [carv_a()] + marina_hoje()),
           (O, marina_ontem(carvalho(novo=False, agora='encerrado', agora_txt='Diego Almeida encerrou no financeiro hoje, às 10h05.')))], 'socio')

# 4. sf-responsavel · Larissa: Marina encerrou com o contrato junto; o fechamento terminou
T += tela('sf-responsavel', estados.ROT['sf-responsavel'], [(H, [fontes_b('junto')] + larissa_hoje()), (O, larissa_ontem())], 'juridico', fundo=FUNDO_J)

# 5. sf-responsavel-falta · Larissa: o contrato ficou aberto (ontem, Diego)
T += tela('sf-responsavel-falta', estados.ROT['sf-responsavel-falta'], [(H, larissa_hoje()), (O, [fontes_b('falta')] + larissa_ontem())], 'juridico', fundo=FUNDO_J)

# 6. sf-segue · Larissa: o contrato segue com outro caso (pergunta 4)
T += tela('sf-segue', estados.ROT['sf-segue'], [(H, [SEGUE_B] + larissa_hoje()), (O, larissa_ontem())], 'juridico', fundo=FUNDO_J)

# 7. sf-agora-parcial · Felipe encerrou o C-2026-025; falta o C-2026-026
T += tela('sf-agora-parcial', estados.ROT['sf-agora-parcial'], [(H, [nog_a(False, 'parcial')] + felipe_hoje()), (O, [VIANA] + felipe_ontem())], 'felipe', fundo=FUNDO)

# 8. sf-agora-encerrado · Felipe encerrou tudo: um contrato (Carvalho) e dois (Nogueira); o Viana, de ontem, continua (ajuste 5)
T += tela('sf-agora-encerrado', estados.ROT['sf-agora-encerrado'],
          [(H, [nog_a(False, 'todos'), carv_a(False, agora=True)] + felipe_hoje()), (O, [VIANA] + felipe_ontem())], 'felipe', fundo=FUNDO)

# 9. sf-agora-terminou · Larissa: depois do aviso de ontem, Felipe encerrou o contrato hoje
T += tela('sf-agora-terminou', estados.ROT['sf-agora-terminou'], [(H, larissa_hoje()), (O, [fontes_b('depois')] + larissa_ontem())], 'juridico', fundo=FUNDO_J)

# 10. sf-lido · o aviso do sf-contrato já aberto
T += tela('sf-lido', estados.ROT['sf-lido'], [(H, [carv_a(novo=False)] + felipe_hoje()), (O, felipe_ontem())], 'felipe', fundo=FUNDO)

# ---------------------------------------------------------------- página
assert [e for e, _ in EST] == [e for e, p, _ in estados.ESTADOS if p == 'index.html']
NAV = estados.nav('index.html', ico)
out = pagina('Clientes', 'Portal: o aviso no sino quando o caso é encerrado no financeiro (F3.150).',
             '{"estado":"sf-contrato","atual":"clientes"}', '', T)
out = out.replace('</style>', CSS_CL + '\n</style>', 1)
out = finalizar_sas(out, CSS_SI + CSS_SP)
out = out.replace('<script>\n(function(){', NAV + '\n<script>\n(function(){', 1)
out = out.replace('</body>', SCRIPT_SI + '\n</body>', 1)
out = out.replace('<head>', '<head>\n' + estados.REDIRECIONA, 1)
assert out.count('id="fl-estados"') == 1 and estados.REDIRECIONA in out
assert 'R$' not in T  # PT-02: nenhum valor em reais no sino
os.makedirs(SAIDA, exist_ok=True)
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(out)
print('sino-fechou ok', len(EST), 'estados,', len(out) // 1024, 'KB')
