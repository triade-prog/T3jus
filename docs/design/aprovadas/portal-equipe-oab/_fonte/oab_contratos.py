# Contratos: como o advogado aparece com a OAB que vem da Equipe, e o advogado sem OAB cadastrada.
# O contratos.py aprovado é carregado sem mudança (só as definições, sem os estados do fim) e aqui
# se trocam os advogados do Novo contrato e os Responsáveis da ficha. Uso: python3 oab_contratos.py <pasta-saida>
import sys
from oab import INSCRICOES, oab_curta, oab_txt, oab_doc, frase_de, com_conta

_src = open('contratos.py', encoding='utf-8').read()
exec(_src[:_src.index('# ---------------------------------------------------------------- estados')], globals())
SAIDA = sys.argv[1] if len(sys.argv) > 1 else '..'

EQ = 'equipe.html?estado='
COM_OAB = ['Marina Ribeiro', 'Felipe Matos', 'Larissa Costa']
SEM_OAB = ['Diego Almeida', 'Gustavo Lima', 'Paula Nunes']
DONO = True

CSS_OE = r"""
/* ===== OAB que vem da Equipe (prefixo oe-) ===== */
.oe-sem-oab{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;margin-top:8px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.5}
.oe-sem-oab .ico{color:var(--vinho-4);margin-top:1px;flex:none}
.oe-sem-oab a{color:var(--vinho);font-weight:500}
.oe-sem-oab b{font-weight:500}
.hn-pessoas .oe-falta{color:var(--vinho-3);font-weight:500}
.oe-pe-falta{display:flex;align-items:flex-start;gap:10px;margin:0 24px 18px;padding:12px 14px;border-radius:var(--raio);background:var(--ambar-3);color:var(--tinta);font-size:13px;line-height:1.5}
.oe-pe-falta .ico{color:var(--vinho);margin-top:1px;flex:none}
.oe-pe-falta a{color:var(--vinho);font-weight:500}
@media (max-width:760px){.oe-pe-falta{margin:0 16px 16px}}
"""


def quem_cadastra(link_txt='Cadastrar a OAB na Equipe', href=EQ + 'ver'):
    if DONO:
        return f' <a href="{href}">{link_txt}</a>'
    return ' Quem cadastra é Marina Ribeiro, sócia dona.'


# Decisão 2 da Carol (19/11/2026): ao criar o contrato, quem cria pode escolher quais inscrições de cada
# advogado vão no contrato e na procuração. O padrão é todas, a principal primeiro; fica pelo menos uma.
ESCOLHA = {}      # nome -> índices marcados das inscrições (sem entrada: todas)
ERRO_INSC = None  # nome do advogado que ficou sem nenhuma inscrição marcada


def _slug(n):
    return ''.join(p[0] for p in n.split()).lower()


def escolhidas(n):
    ins = INSCRICOES[n]
    return [ins[i] for i in ESCOLHA.get(n, range(len(ins)))]


def insc_grupo(n, pref='nv'):
    """Caixas com as inscrições de um advogado marcado (só quando ele tem mais de uma)."""
    ins = INSCRICOES[n]
    pn = n.split()[0]
    sl = f'{pref}-ins-{_slug(n)}'
    marc = list(ESCOLHA.get(n, range(len(ins))))
    erro = ERRO_INSC == n
    d = f'{sl}-aj' + (f' {sl}-er' if erro else '')
    ops = ''
    for i, (u, num, l, tp) in enumerate(ins):
        ch = ' checked' if i in marc else ''
        inv = ' aria-invalid="true"' if erro else ''
        fo = ' data-foco' if erro and i == 0 else ''
        sub = 'Principal · vem primeiro' if tp == 'principal' else 'Suplementar'
        ops += (f'<label class="opcao"><input class="marcar" type="checkbox" id="{sl}-{i}" name="{sl}" value="{u}"{ch}{inv}{fo}>'
                f'<span>{oab_txt(u, num, l)}<small>{sub}</small></span></label>')
    er = (f'<p class="erro-msg" id="{sl}-er">{ico("alerta", "ico ico-s")}Marque pelo menos uma inscrição de {pn}. '
          f'Se ele não deve assinar este contrato, desmarque o nome dele acima.</p>') if erro else ''
    return (f'<fieldset class="oe-ins" aria-describedby="{d}"><legend>Inscrições de {pn} que vão no documento</legend>'
            f'<div class="oe-ins-ops">{ops}</div>'
            f'<p class="ajuda" id="{sl}-aj">Vêm todas marcadas. Desmarque a que não deve ir neste contrato, como a de outra UF.</p>{er}</fieldset>')


def adv_bloco(n, marcado, pref='nv'):
    ins = INSCRICOES[n]
    if not marcado:
        sub = oab_curta(n)
    elif len(ins) == 1:
        sub = oab_curta(n) + ' · única inscrição, vai sempre'
    else:
        sub = f'{len(ins)} inscrições na OAB'
    ch = ' checked' if marcado else ''
    cab = f'<label class="opcao"><input class="marcar" type="checkbox" name="{pref}-adv"{ch}><span>{n}<small>{sub}</small></span></label>'
    if pref != 'nv':   # na ficha só se escolhem as inscrições
        cab = f'<p class="oe-adv-nome">{n}<small>{sub}</small></p>'
    grupo = insc_grupo(n, pref) if marcado and len(ins) > 1 else ''
    cls = 'oe-adv' + (' oe-adv-on' if marcado else '') + (' oe-adv-erro' if ERRO_INSC == n else '')
    return f'<div class="{cls}">{cab}{grupo}</div>'


def frase_adv(n):
    e = escolhidas(n)
    return f'<b>{n}, {frase_de(e)}</b>' if e else f'<b>{n}</b>, <mark class="oe-falta-i">[falta escolher a inscrição]</mark>'


def previa_advs(marcados):
    if not marcados:
        return ''
    fr = [frase_adv(n) for n in COM_OAB if n in marcados]
    t = fr[0] if len(fr) == 1 else '; '.join(fr[:-1]) + '; e ' + fr[-1]
    return f'<p class="oe-previa" aria-live="polite">{ico("pena")}<span>No contrato e na procuração: {t}.</span></p>'


def advogados(marcados=('Marina Ribeiro',), erro=False):
    er = f'<p class="erro-msg" id="nv-adv-er">{ico("alerta", "ico ico-s")}Marque pelo menos um advogado. Sem ele, o contrato e a procuração não têm quem assine pelo escritório.</p>' if erro else ''
    a = ' aria-describedby="nv-adv-aj nv-adv-sem nv-adv-er"' if erro else ' aria-describedby="nv-adv-aj nv-adv-sem"'
    blocos = ''.join(adv_bloco(n, n in marcados) for n in COM_OAB)
    sem = (f'<p class="oe-sem-oab" id="nv-adv-sem">{ico("balanca")}<span><b>Sem OAB cadastrada:</b> {", ".join(SEM_OAB[:-1])} e {SEM_OAB[-1]}. '
           f'Quem é advogado entra nesta lista quando a OAB estiver na Equipe.{quem_cadastra()}</span></p>')
    return (f'<fieldset class="grupo-opcoes c6" id="nv-adv"{a}><legend>Advogados no contrato e na procuração</legend>'
            f'<p class="ajuda" id="nv-adv-aj">Nome e OAB saem da Equipe. Vão como contratados e outorgados. De quem tem mais de uma inscrição, escolha quais vão.</p>'
            f'<div class="oe-advs">{blocos}</div>{sem}{previa_advs(marcados)}{er}</fieldset>')


def oabs(n):
    return ' · '.join(f'<span style="white-space:nowrap">{x}</span>' for x in oab_curta(n).split(' · '))


def pessoas_far():
    falta = (f'<p class="oe-pe-falta">{ico("alerta")}<span>A OAB de Larissa foi removida da Equipe em 19/11/2026. Até ser cadastrada de novo, '
             f'o contrato e a procuração gerados daqui em diante saem com “[OAB: falta]” ao lado do nome dela. Os já gerados não mudam.'
             f'{quem_cadastra("Cadastrar na Equipe", EQ + "ver")}</span></p>')
    return (f'<section class="folha" aria-labelledby="t-rs"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-rs" style="font-size:20px">Responsáveis</h2></div></div><ul class="hn-pessoas">'
            f'<li><span class="av-p forte" aria-hidden="true">FM</span><div><strong>Felipe Matos</strong><small>Responsável</small><small>{oabs("Felipe Matos")}</small></div>{selo("ativo", "Recebe os lembretes")}</li>'
            f'<li><span class="av-p forte" aria-hidden="true">LC</span><div><strong>Larissa Costa</strong><small>Advogada no contrato</small></div>'
            f'{selo("atencao", "Sem OAB", "alerta")}</li></ul>{falta}</section>')


# ---------------------------------------------------------------- ficha do contrato: as inscrições escolhidas
def pessoas_033():
    """Responsáveis do C-2026-033 com as inscrições que vão nos documentos deste contrato."""
    f_in = escolhidas('Felipe Matos')
    f_out = [i for i in INSCRICOES['Felipe Matos'] if i not in f_in]
    fora = (f'<small class="oe-fora">{" e ".join(oab_txt(*i[:3]) for i in f_out)} fica fora deste contrato</small>') if f_out else ''
    pe = (f'<div class="oe-pe-ins"><p>{ico("pena")}<span>Inscrições escolhidas ao criar o contrato. Valem para os documentos gerados daqui em diante; os já gerados guardam as do dia.</span></p>'
          f'<button class="btn btn-sec btn-compacto" type="button" data-janela="janela-ins">{ico("lapis", "ico ico-s")}Mudar inscrições<span class="sr"> deste contrato</span></button></div>')
    return (f'<section class="folha" aria-labelledby="t-rs"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-rs" style="font-size:20px">Responsáveis</h2></div></div><ul class="hn-pessoas oe-pes">'
            f'<li><span class="av-p forte" aria-hidden="true">MR</span><div><strong>Marina Ribeiro</strong><small>Responsável e advogada no contrato</small>'
            f'<small class="oe-no-doc">No documento: {oab_txt(*INSCRICOES["Marina Ribeiro"][0][:3])}</small></div>{selo("ativo", "Recebe os lembretes")}</li>'
            f'<li><span class="av-p forte" aria-hidden="true">FM</span><div><strong>Felipe Matos</strong><small>Advogado no contrato</small>'
            f'<small class="oe-no-doc">No documento: {" e ".join(oab_txt(*i[:3]) for i in f_in)}</small>{fora}</div></li></ul>{pe}</section>')


def j_ins(abrir=False):
    corpo = (f'<div class="oe-advs">{adv_bloco("Marina Ribeiro", True, "ji")}{adv_bloco("Felipe Matos", True, "ji")}</div>'
             + previa_advs(('Marina Ribeiro', 'Felipe Matos'))
             + f'<p class="pt-comuns">{ico("historico")}<span>A mudança fica no histórico do contrato, com seu nome e a hora.</span></p>')
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("check")}Salvar inscrições</button>'
    return janela('janela-ins', 'Contrato C-2026-033 · Benedito Souza Lima', 'Inscrições no contrato e na procuração',
                  'Escolha quais inscrições de cada advogado vão nos documentos deste contrato. Fica pelo menos uma por advogado.', corpo, pe, abrir=abrir)


def ficha_033(abrir=False):
    h = criado()
    h = h[:h.index('<div class="aviso aviso-sucesso toast"')]   # sem o aviso de "criado": a ficha aberta outro dia
    i = h.index('<section class="folha" aria-labelledby="t-rs">')
    j = h.index('</section>', i) + len('</section>')
    return h[:i] + pessoas_033() + h[j:] + j_ins(abrir)


CSS_OE += r"""
.oe-advs{display:grid;gap:8px;margin-top:6px}
.oe-adv{border:1px solid var(--borda-folha);border-radius:var(--raio);padding:2px 14px;background:var(--papel)}
.oe-adv>.opcao{margin:0 -6px;padding:10px 6px}
.oe-adv-on{background:#FCF8F5}
.oe-adv-erro{border-color:var(--vinho-3);box-shadow:inset 3px 0 0 var(--vinho-3)}
.oe-ins{border:0;margin:0 0 10px 34px;padding:10px 0 0;min-width:0;border-top:1px solid var(--divisor)}
.oe-ins legend{float:left;width:100%;padding:0;margin:0 0 2px;font-size:13px;font-weight:500;color:var(--texto)}
.oe-ins-ops{clear:both;display:flex;flex-wrap:wrap;gap:0 28px}
.oe-ins-ops .opcao{margin:0 -8px}
.oe-ins .ajuda{font-size:12px;color:var(--texto-2);margin:2px 0 0;line-height:1.5}
.oe-ins .erro-msg{margin-top:6px}
.oe-previa{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;margin-top:8px;border-radius:var(--raio);background:var(--ambar-3);color:var(--tinta);font-size:13px;line-height:1.5}
.oe-previa .ico{color:var(--vinho);margin-top:1px;flex:none}
.oe-previa b{font-weight:600}
.oe-previa mark.oe-falta-i{white-space:nowrap;background:var(--papel);color:var(--tinta);padding:0 4px;border-radius:4px;box-shadow:inset 0 0 0 1px var(--vinho-3)}
.oe-pes li{flex-wrap:wrap}.oe-pes li>div{flex:1 1 200px;min-width:0}
.hn-pessoas .oe-no-doc{color:var(--vinho-2);font-weight:500}
.hn-pessoas .oe-fora{color:var(--texto-2)}
.oe-pe-ins{display:grid;gap:10px;justify-items:start;padding:12px 24px 18px;border-top:1px solid var(--divisor)}
.oe-pe-ins p{display:flex;align-items:flex-start;gap:10px;margin:0;font-size:13px;color:var(--texto-2);line-height:1.5}
.oe-pe-ins p .ico{color:var(--vinho-4);margin-top:1px;flex:none}
.janela .oe-advs{margin:0}
.oe-adv-nome{margin:0;padding:10px 0;font-weight:500}
.oe-adv-nome small{display:block;font-weight:400;font-size:12px;color:var(--texto-2)}
.oe-adv-nome+.oe-ins{margin-left:0}
@media (max-width:760px){
  .oe-ins{margin-left:0}
  .oe-ins-ops{display:grid;gap:0}
  .oe-pe-ins{padding:12px 16px 16px}
  .oe-pe-ins .btn{width:100%;min-height:44px}
}
"""


T = ''
A = lambda sec, trilha, titulo, **k: dict(area='contratos', secao=sec, atual='contratos', trilha=trilha, titulo=titulo, **k)
DONO = True
NV = A('Contratos', 'Contratos|Novo contrato', 'Novo contrato')
T += tpl('novo-sem-oab', pagina_novo(), **NV)
ESCOLHA = {'Felipe Matos': [0]}
T += tpl('novo-inscricoes', pagina_novo(), **NV)
ESCOLHA, ERRO_INSC = {'Felipe Matos': []}, 'Felipe Matos'
_resumo = ('<div class="hn-resumo-erros">' + aviso('urgencia', 'Falta acertar 1 ponto, marcado abaixo.', 'O contrato ainda não foi criado. Nada do que você escreveu se perdeu.',
           acoes='<ul><li><a href="#nv-ins-fm-0">Advogados: marque pelo menos uma inscrição de Felipe Matos</a></li></ul>') + '</div>')
_form = '<form class="form-folha" action="#" novalidate>'
_nv = pagina_novo()
assert _nv.count(_form) == 1
T += tpl('novo-inscricao-erro', _nv.replace(_form, _form + _resumo), **NV)
ESCOLHA, ERRO_INSC = {'Felipe Matos': [0]}, None
C33 = A('Contratos', 'Contratos|C-2026-033', 'C-2026-033', aba='contrato')
T += tpl('contrato-inscricoes', ficha_033(), **C33)
T += tpl('contrato-inscricoes-mudar', ficha_033(abrir=True), **C33)
ESCOLHA = {}
T += tpl('contrato-sem-oab', contrato_far(), **A('Contratos', 'Contratos|C-2026-019', 'C-2026-019', aba='contrato'))
DONO = False
T += tpl('contrato-sem-oab-pessoa', contrato_far(), quem='contratos', **A('Contratos', 'Contratos|C-2026-019', 'C-2026-019', aba='contrato'))

URL = {'Contratos': U + 'contrato-sem-oab', 'Honorários': '#', 'Procurações e modelos': '#'}
out = montar('contratos.html', 'Contratos', 'Contratos: os advogados com a OAB que vem da Equipe, as inscrições escolhidas em cada contrato e o advogado sem OAB cadastrada.',
             '{"estado":"novo-sem-oab","atual":"contratos"}', T, barras('contratos', URL), CSS + CSS_OE)
# A Equipe continua só da sócia dona (decisão 1 da Carol). Cada pessoa confere a própria OAB em Sua conta.
out = com_conta(out, ico)
open(f'{SAIDA}/contratos.html', 'w', encoding='utf-8').write(out)
print('contratos ok', T.count('<template data-est='), 'estados')
