# Portal · sino: o aviso "caso pronto para encerrar no financeiro" (F3.147; EX-16, EX-17, PT-02, PT-10).
# Parte do sino aprovado (portal-sem-avisos-sino/_fonte/sino.py, lido até o começo dos estados, sem mudança):
# o mesmo painel, o mesmo item, o mesmo CSS e o mesmo script. A página de fundo é a lista de Clientes aprovada.
# O item novo usa as peças do item aprovado; a única peça a mais é o rótulo "Agora:" (classe si-agora).
# Uso: python3 sino_caso.py <pasta-saida>
import os, sys, json

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
ARGV = list(sys.argv)
SAIDA = ARGV[1] if len(ARGV) > 1 else 'saida'

# 1. O sino aprovado, até o começo dos estados (define CSS_SI, item, dia, painel, PE, FUNDO, FUNDO_J, B e SCRIPT_SI)
_src = open(os.path.join(AQUI, 'sino.py'), encoding='utf-8').read()
_src = _src[:_src.index("\nT = ''\n")]
sys.argv = [ARGV[0], SAIDA]
exec(compile(_src, 'sino.py', 'exec'), globals())
sys.argv = ARGV
# O script do painel aprovado vem depois dos estados no sino.py; é lido à parte, sem mudança
_full = open(os.path.join(AQUI, 'sino.py'), encoding='utf-8').read()
_i = _full.index('SCRIPT_SI = r"""')
exec(compile(_full[_i:_full.index('</script>"""', _i) + len('</script>"""')], 'sino.py', 'exec'), globals())
import comum

# 2. Mais duas pessoas do elenco aprovado, como no ficha_ligada.py do fechamento, e a navegação entre os estados
comum.SCRIPT = comum.SCRIPT.replace(
    "'sem-area':{",
    "bianca:{nome:'Bianca Torres',ini:'B',papel:'Áreas: Contratos e Financeiro',areas:['contratos','financeiro'],dono:false},\n"
    "    diego:{nome:'Diego Almeida',ini:'D',papel:'Áreas: Comercial e Financeiro',areas:['comercial','financeiro'],dono:false},\n"
    "    'sem-area':{")
comum.SCRIPT = comum.SCRIPT.replace(
    "  document.getElementById('miolo').appendChild(t.content.cloneNode(true));",
    "  document.getElementById('miolo').appendChild(t.content.cloneNode(true));\n"
    "  var ne=document.getElementById('fl-estados'); if(ne){ if(q.get('foto')){ne.remove()} else { var a=ne.querySelector('a[href=\"?estado='+t.dataset.est+'\"]'); if(a){a.setAttribute('aria-current','page'); ne.querySelector('summary b').textContent=a.textContent} } }")
comum.SCRIPT = comum.SCRIPT.replace(
    "var t=document.querySelector('template[data-est=\"'+est+'\"]')||document.querySelector('template[data-est=\"'+padrao.estado+'\"]');",
    "var t=document.querySelector('template[data-est=\"'+est+'\"]')||document.querySelector('template[data-est=\"'+padrao.estado+'\"]'); t.dataset.est=t.getAttribute('data-est');")
assert "diego:{" in comum.SCRIPT and "fl-estados" in comum.SCRIPT and "t.dataset.est=" in comum.SCRIPT

CSS_SP = r"""
/* ==========================================================================
   Sino · caso pronto para encerrar no financeiro (prefixo sp-, F3.147)
   O item é o aprovado (si-). A única peça nova é o rótulo "Agora:", que abre a frase do estado de agora.
   ========================================================================== */
.si-det .si-agora{font-weight:600;color:var(--vinho)}

/* Navegação entre os estados (só para a Carol ver; não é tela). A do fechamento, à esquerda para não cobrir o painel */
#fl-estados{position:fixed;left:272px;bottom:16px;z-index:50;max-width:min(380px,calc(100vw - 32px));font-size:13px}
#fl-estados summary{list-style:none;display:flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;border-radius:22px;background:var(--tinta);color:var(--papel);cursor:pointer;box-shadow:0 8px 24px -10px rgba(42,26,34,.6)}
#fl-estados summary::-webkit-details-marker{display:none}
#fl-estados summary b{font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#fl-estados summary .ico{width:16px;height:16px;flex:none}
#fl-estados .fl-lista{margin-top:8px;max-height:min(70vh,560px);overflow:auto;background:var(--papel);border:1px solid var(--borda-folha);border-radius:var(--raio-g);padding:8px;box-shadow:0 12px 32px -12px rgba(42,26,34,.5)}
#fl-estados p{margin:10px 8px 4px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--vinho-2);font-weight:500}
#fl-estados a{display:flex;align-items:center;min-height:44px;padding:4px 10px;border-radius:var(--raio);color:var(--tinta);text-decoration:none;line-height:1.3}
#fl-estados a:hover{background:var(--sal-2)}
#fl-estados a[aria-current]{background:var(--vinho);color:var(--papel)}
@media (max-width:760px){#fl-estados{left:16px;bottom:84px}}
"""

ICO.update({'pronto': 'cadeado', 'repasse': 'alerta', 'base': 'relogio', 'pedido': 'pena'})

# ---------------------------------------------------------------- o item novo
# O texto segue a seção 3.2 do PLANO.md, com os ajustes da especialista (veja NOTAS.md):
# título com o nome do caso; detalhe com o que deixou o caso pronto, sem valor em reais; destino com o número do contrato.
FIM = 'Confira o acerto e encerre.'
SELO_PRONTO = '<span class="selo selo-ok">Pronto</span>'
# agora -> (selo, destino, frase para o leitor de tela, frase da linha "Agora:"). Revisão do desenho, ajustes 2, 3 e 5.
AGORA = {
    'encerrado': ('<span class="selo selo-neutro">Encerrado</span>', 'Ver o fechamento no {c}', 'encerrado', None),
    'pendente': ('<span class="selo selo-atencao">Voltou a ter pendência</span>', 'Ver o acerto no {c}', 'voltou a ter pendência',
                 'depois deste aviso, o acerto voltou a ter pendência.'),
    'depois': ('<span class="selo selo-neutro">Aviso antigo</span>', 'Ver o acerto no {c}', 'aviso antigo, há um mais novo',
               'o caso ficou pronto de novo; veja o aviso mais novo.'),
    'fora': ('<span class="selo selo-neutro">Fecha no repasse</span>', 'Ver o fechamento no {c}', 'fecha no repasse',
             'entrou RPV ou alvará neste caso, e o fechamento passou para a ficha do repasse.'),
}


def pronto(caso, fato, contrato, hora, novo=False, denovo=False, agora=None, agora_txt=''):
    """Um aviso CASO_PRONTO_FECHAR. fato: a frase do motivo. agora: None (período aberto), encerrado, pendente, depois ou fora.
    O título fica no passado (ajuste 1): o aviso não muda, e o fato vale para sempre."""
    tit = (f'O caso <b>{caso}</b> ficou pronto de novo para encerrar no financeiro' if denovo
           else f'O caso <b>{caso}</b> ficou pronto para encerrar no financeiro')
    if agora:
        selo, onde, sr, txt = AGORA[agora]
        tit += f'<span class="sr">. Agora: {sr}.</span>'  # ajuste 2: o estado de agora entra no nome do link
        det = f'{fato}</p><p class="si-det"><b class="si-agora">Agora:</b> {agora_txt or txt}'
    else:
        selo, onde = SELO_PRONTO, 'Ver o acerto no {c}'
        det = f'{fato} {FIM}'
    href = f'#contrato-{contrato.lower()}-t-fecha'
    return item('pronto', tit, det, onde.format(c=contrato), href, hora, novo, selo=selo)


# ---------------------------------------------------------------- os outros avisos (tipos que já existem)
# Marina: a lista aprovada de si-aberto, sem mudança, com o aviso novo em "Ontem".
def marina_hoje(n=True):
    return [
        item('ia', 'A IA passou a conversa de <b>Joana Prado</b> para você',
             '<q>Quero falar com a doutora sobre a audiência da minha mãe.</q> Antônia Ferreira Prado', 'Abrir a conversa', '#conversa-joana', '10h04', n),
        item('sugestao', '<b>Gustavo Lima</b> sugeriu uma mudança em “Cobrança de parcela atrasada”',
             '<q>Esperar 5 dias, e não 3, antes de passar a conversa para mim.</q>', 'Ver a sugestão', '#automacao-cobranca', '9h31', n),
        item('meta-nao', 'A Meta recusou o texto “Parcela atrasada, 2º aviso”',
             'Motivo informado: o texto parece promoção. A automação continua em rascunho; nada foi enviado.', 'Corrigir o texto', '#automacao-texto', '7h50', n,
             selo='<span class="selo selo-urgente">Recusado</span>'),
        item('prazo', 'Prazo em 2 dias: <b>contestação</b> de Irene Castro',
             'Vence sexta, 20/11. Responsável: você. Proc. 1004512-33.2026.8.26.0100.', 'Abrir o prazo', '#prazo-irene', '7h00', n,
             selo='<span class="selo selo-atencao">em 2 dias</span>'),
    ]


def marina_ontem(carvalho):
    return [
        item('assumiu', '<b>Felipe Matos</b> assumiu a conversa de Ricardo Vale, que era sua',
             'Construtora Vale Alto Ltda. A troca ficou registrada na conversa.', 'Abrir a conversa', '#conversa-ricardo', '17h20'),
        item('passou', '<b>Diego Almeida</b> passou a conversa de Daniela Rocha Mendes para você',
             '<q>Ela quer falar do acordo; foi você quem combinou o valor.</q>', 'Abrir a conversa', '#conversa-daniela', '15h02'),
        item('meta-ok', 'A Meta aprovou o texto “Aviso de etapa do caso”',
             'A automação Aviso de etapa já está funcionando.', 'Ver a automação', '#automacao-etapa', '11h40',
             selo='<span class="selo selo-ok">Aprovado</span>'),
        carvalho,
    ]


# O caso da espinha: "Carvalho x Construtora Lume" (o fechamento aprovado). Diego registrou a parcela 6/6 e o reembolso
# em 17/11, às 11h05; por isso ele não recebe o aviso, e a Marina e a Bianca recebem.
CARV = 'Carvalho x Construtora Lume'
FATO_CARV = 'Diego Almeida registrou a última parcela. As 7 parcelas de Noemi Bastos Carvalho e Cláudio Carvalho foram pagas.'


def carvalho(novo=True, agora=None, agora_txt=''):
    return pronto(CARV, FATO_CARV, 'C-2026-012', '11h05', novo, agora=agora, agora_txt=agora_txt)


# Diego: avisos de outros tipos, que já existem no código (Sino.tsx)
def diego_hoje():
    return [
        item('ia', 'A IA passou a conversa de <b>Marta Corrêa</b> para você',
             '<q>Preciso da segunda via da parcela de novembro.</q> Hélio Batista Corrêa', 'Abrir a conversa', '#conversa-marta', '9h18', True),
        item('repasse', 'O repasse de <b>Gabriela Teixeira</b> passou do prazo',
             'Era 16/11. Anote o motivo e a próxima ação na ficha do repasse.', 'Anotar o atraso', '#repasse-gabriela', '7h00', True,
             selo='<span class="selo selo-urgente">Atrasado</span>'),
    ]


def diego_ontem():
    return [
        item('passou', '<b>Marina Ribeiro</b> passou a conversa de Ricardo Vale para você',
             '<q>Ele quer combinar a parcela atrasada.</q>', 'Abrir a conversa', '#conversa-ricardo', '16h40'),
    ]


# Bianca: Contratos e Financeiro
def bianca_hoje():
    return [
        item('base', 'Pedir a base do mês: <b>Construtora Vale Alto Ltda.</b> · C-2026-003',
             'Faturamento, mês 10 de 12. Sem a base, a cobrança de 25/11/2026 não sai.', 'Informar a base', '#honorarios', '8h00', True,
             selo='<span class="selo selo-atencao">Base do mês</span>'),
    ]


def bianca_ontem(carvalho_item):
    return [
        item('pedido', '<b>Gustavo Lima</b> pediu o contrato de <b>Marta Corrêa</b>',
             'Proposta P-2026-031, inventário, aceita em 17/11. O contrato nasce com as condições da proposta.', 'Gerar o contrato', '#proposta-031', '14h20',
             selo='<span class="selo selo-andamento">Pedido</span>'),
        carvalho_item,
    ]


def conta(novos, total):
    n = f'<b>{novos} {"novo" if novos == 1 else "novos"}</b>' if novos else 'Nenhum novo'
    return f'{n} · {total} nos últimos 30 dias'


def tela(est, rot, grupos, quem, fundo=None):
    """grupos: [(rótulo do dia, [itens])]. Conta os novos e o total pelos próprios itens."""
    todos = [i for _, its in grupos for i in its]
    novos = sum(1 for i in todos if 'si-novo' in i)
    lista = ''.join(dia(d, its) for d, its in grupos)
    fundo = fundo or (FUNDO_J if quem == 'bianca' else FUNDO)
    EST.append((est, rot))
    return tpl(est, fundo + painel(conta(novos, len(todos)), lista, novos), novos=novos, quem=quem, **B)


EST = []
T = ''

# 1. sp-novo · Marina abre o sino: o aviso novo no meio da lista aprovada
T += tela('sp-novo', 'Marina: o aviso novo, entre os outros avisos',
          [('Hoje', marina_hoje()), ('Ontem · 17/11', marina_ontem(carvalho()))], 'socio')

# 2. sp-motivos · Diego: uma frase por motivo
MOT_HOJE = [
    pronto('Souza x Clínica Vida', 'Bianca Torres marcou o último reembolso, e nada falta receber de Regina Souza.', 'C-2026-011', '10h02', True),
    pronto('Gomes x Viação Rápida', 'Bianca Torres marcou o êxito de Sérgio Gomes como não cobrado. As 4 parcelas já estavam pagas.', 'C-2026-015', '9h20', True),
]
MOT_ONTEM = [
    pronto('Divórcio de Renata Alves', 'Felipe Matos encerrou o C-2026-016, e as parcelas que faltavam foram canceladas.', 'C-2026-016', '15h10'),
    pronto('Dias x Seguradora Norte', 'Nada falta receber de Paulo Henrique Dias.', 'C-2026-006', '7h00'),
]
MOT_ANTES = [
    pronto('Teixeira x Banco Aurora', 'Larissa Costa encerrou o caso, e nada falta receber de Rosângela Teixeira.', 'C-2026-018', '17h45'),
]
T += tela('sp-motivos', 'Diego: uma frase para cada motivo',
          [('Hoje', MOT_HOJE), ('Ontem · 17/11', MOT_ONTEM), ('30/10', MOT_ANTES)], 'diego')

# 3. sp-outro-caso · as parcelas seguem com outro caso em andamento (pergunta 3)
OUTRO = pronto('Martins x INSS · auxílio-doença',
               'Felipe Matos ligou o C-2026-007 ao caso Martins x INSS · aposentadoria, em andamento. '
               'As parcelas que faltam seguem com ele, e nada falta receber de Ivone Martins.',
               'C-2026-007', '9h55', True)
T += tela('sp-outro-caso', 'Diego: as parcelas seguem com outro caso',
          [('Hoje', [OUTRO] + diego_hoje()), ('Ontem · 17/11', diego_ontem())], 'diego')

# 4. sp-varios · um cliente, três ou mais clientes (dois clientes é o sp-novo)
VARIOS = pronto('Nogueira x Transportes Serra',
                'Marina Ribeiro registrou a última parcela. As 9 parcelas de Lúcia Nogueira, Paulo Nogueira e mais 1 cliente foram pagas.',
                'C-2026-010', '9h50', True)
UM = pronto('Freitas x Operadora Sul', 'Bianca Torres registrou a última parcela. As 10 parcelas de Helena Freitas foram pagas.',
            'C-2026-020', '14h30')
T += tela('sp-varios', 'Diego: um cliente e três clientes',
          [('Hoje', [VARIOS] + diego_hoje()[:1]), ('Ontem · 17/11', [UM] + diego_ontem())], 'diego')

# 5. sp-denovo · voltou a ter pendência e ficou pronto de novo: dois avisos do mesmo caso, cada um com o seu período
DENOVO = pronto('Lima x Condomínio Solar',
                'Bianca Torres marcou o reembolso da cópia do processo, e a pendência que tinha voltado foi resolvida.',
                'C-2026-009', '10h06', True, denovo=True)
ANTES = pronto('Lima x Condomínio Solar', 'Marina Ribeiro registrou a última parcela. As 6 parcelas de Otávio Lima foram pagas.',
               'C-2026-009', '16h30', agora='depois')
T += tela('sp-denovo', 'Diego: o caso ficou pronto de novo',
          [('Hoje', [DENOVO] + diego_hoje()), ('Ontem · 17/11', diego_ontem()), ('16/11', [ANTES])], 'diego')

# 6. sp-lido · Marina já abriu o aviso: sem o destaque, e o selo continua "Pronto" (o caso ainda não foi encerrado)
T += tela('sp-lido', 'Marina: o aviso já lido, caso ainda pronto',
          [('Hoje', marina_hoje()), ('Ontem · 17/11', marina_ontem(carvalho(novo=False)))], 'socio')

# 7. sp-encerrado · Bianca, depois que Marina encerrou no financeiro (pergunta 4: o aviso continua novo)
T += tela('sp-encerrado', 'Bianca: Marina já encerrou no financeiro',
          [('Hoje', bianca_hoje()),
           ('Ontem · 17/11', bianca_ontem(carvalho(agora='encerrado', agora_txt='Marina Ribeiro encerrou no financeiro hoje, às 10h05.')))], 'bianca')

# 8. sp-pendente · Bianca: depois do aviso, algo entrou no acerto
T += tela('sp-pendente', 'Bianca: o caso voltou a ter pendência',
          [('Hoje', bianca_hoje()),
           ('Ontem · 17/11', bianca_ontem(carvalho(agora='pendente')))], 'bianca')

# 9. sp-fora · Diego: chegou um levantamento, e o caso passou a fechar pela ficha do repasse
FORA = pronto('Rocha x INSS · aposentadoria rural', 'Marina Ribeiro registrou a última parcela. As 5 parcelas de Sebastião Rocha foram pagas.',
              'C-2026-004', '15h40', agora='fora')
T += tela('sp-fora', 'Diego: o caso ganhou levantamento',
          [('Hoje', diego_hoje()), ('Ontem · 17/11', diego_ontem()), ('12/11', [FORA])], 'diego')

# ---------------------------------------------------------------- página
GRUPOS = [
    ('1. O aviso chega', ['sp-novo', 'sp-motivos', 'sp-outro-caso', 'sp-varios', 'sp-denovo']),
    ('2. Depois do aviso', ['sp-lido', 'sp-encerrado', 'sp-pendente', 'sp-fora']),
]
ROT = dict(EST)
assert sorted(sum((g[1] for g in GRUPOS), [])) == sorted(ROT)
nav = ''.join(f'<p>{g}</p>' + ''.join(f'<a href="?estado={e}">{ROT[e]}</a>' for e in es) for g, es in GRUPOS)
NAV = (f'<details id="fl-estados"><summary>{ico("menu")}<span class="sr">Estados desenhados: </span><b>Estados</b></summary>'
       f'<nav class="fl-lista" aria-label="Estados desenhados">{nav}</nav></details>')

out = pagina('Clientes', 'Portal: o aviso no sino quando o caso sem levantamento fica pronto para encerrar no financeiro (F3.147).',
             '{"estado":"sp-novo","atual":"clientes"}', '', T)
out = out.replace('</style>', CSS_CL + '\n</style>', 1)
out = finalizar_sas(out, CSS_SI + CSS_SP)
out = out.replace('<script>\n(function(){', NAV + '\n<script>\n(function(){', 1)
out = out.replace('</body>', SCRIPT_SI + '\n</body>', 1)
assert out.count('id="fl-estados"') == 1
os.makedirs(SAIDA, exist_ok=True)
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(out)
json.dump([{'nome': e, 'url': f'index.html?estado={e}', 'rotulo': r} for e, r in EST],
          open(os.path.join(AQUI, 'casos.json'), 'w'), ensure_ascii=False, indent=1)
print('sino-caso ok', len(EST), 'estados,', len(out) // 1024, 'KB')
