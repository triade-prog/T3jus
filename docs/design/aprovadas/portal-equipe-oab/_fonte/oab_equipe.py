# Equipe com a OAB de cada advogado: acréscimo às telas aprovadas do Portal v1 (equipe.py).
# O equipe.py aprovado é carregado sem mudança (só as definições, sem os estados do fim) e
# aqui se trocam a lista (OAB embaixo do nome, nome leva à ficha) e o convite (OAB opcional).
# Peças novas com prefixo oe-. Uso: python3 oab_equipe.py <pasta-saida>
import sys
from comum import *
from pecas import campo, selecao, opcao, selo, CSS_FICHA, CSS_HN, QUEM_EXTRA
from oab import *

SAIDA = sys.argv[1] if len(sys.argv) > 1 else '..'
_src = open('equipe.py', encoding='utf-8').read()
exec(_src[:_src.index("T = ''\nbase = dict(")], globals())

U = 'equipe.html?estado='
FICHA = {'Felipe Matos': U + 'pessoa', 'Gustavo Lima': U + 'pessoa-sem-oab'}

CSS = r"""
/* ==========================================================================
   Equipe · OAB de cada advogado (prefixo oe-)
   ========================================================================== */
.oe-nome{color:var(--texto);font-weight:500;text-decoration:none}
.oe-nome:hover{color:var(--vinho);text-decoration:underline}
a.oe-nome{display:inline-flex;align-items:center;min-height:24px}
.oe-oab-l{display:flex;align-items:center;gap:6px;margin-top:3px;font-size:12px;color:var(--vinho-2);font-weight:500}
.pt-tabela .oe-nome{font-family:var(--sans);font-size:14px}
[data-cabeca][hidden]{display:none!important}
.aviso-acoes li a{display:inline-block;min-height:24px;line-height:24px}
.oe-is{display:flex;flex-wrap:wrap;gap:0 6px}.oe-i{white-space:nowrap}.oe-sep{color:var(--vinho-4)}
.oe-oab-l .ico{width:14px;height:14px;color:var(--vinho-4);flex:none}
.cartao .oe-oab-l{margin-top:4px}
.oe-insc{list-style:none;margin:0;padding:0 24px 8px}
.oe-insc li{display:flex;align-items:center;gap:14px;padding:14px 0;border-top:1px solid var(--divisor);flex-wrap:wrap}
.oe-insc li:first-child{border-top:0}
.oe-uf{flex:none;display:grid;place-items:center;width:48px;height:48px;border-radius:var(--raio);background:var(--sal-2);color:var(--vinho);font-family:var(--serifa);font-size:20px;font-weight:500;box-shadow:inset 0 0 0 1px var(--borda-folha)}
.oe-insc .oe-q{flex:1 1 200px;min-width:0}
.oe-insc strong{display:block;font-family:var(--serifa);font-size:20px;font-weight:500;color:var(--vinho);line-height:1.2}
.oe-insc small{display:block;font-size:12px;color:var(--texto-2)}
.oe-insc .oe-bts{display:flex;gap:8px;margin-left:auto}
.oe-linha{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1.2fr) minmax(0,.8fr);gap:12px 14px;align-items:start}
.oe-linha .campo{max-width:none}
.oe-linha .entrada{width:100%}
.oe-grupo{border:0;margin:0;padding:0;min-width:0;display:grid;gap:8px}
.oe-grupo legend{padding:0;margin-bottom:6px;font-size:13px;font-weight:500;color:var(--texto)}
.oe-grupo .ajuda{font-size:12px;color:var(--texto-2);margin:0}
.oe-previa{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:var(--raio);background:var(--ambar-3);color:var(--tinta);font-size:13px;line-height:1.5}
.oe-previa .ico{color:var(--vinho);margin-top:1px;flex:none}
.oe-previa b{font-weight:600}
.oe-tipos{display:grid;grid-template-columns:1fr 1fr;gap:2px 16px}
.dir .oe-assina{font-family:var(--serifa);font-size:24px;line-height:1.25;color:var(--vinho);font-weight:500}
.dir .oe-assina-vazia{font-family:var(--serifa);font-size:26px;line-height:1.2;color:var(--vinho-escuro);font-weight:500}
.oe-uso{list-style:none;margin:0;padding:0 24px 8px}
.oe-uso li{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid var(--divisor);flex-wrap:wrap}
.oe-uso li:first-child{border-top:0}
.oe-uso a{font-weight:500;color:var(--vinho);display:inline-flex;align-items:center;min-height:44px}
.oe-uso small{display:block;font-size:12px;color:var(--texto-2)}
.oe-uso .selo{margin-left:auto}
.oe-areas-f{padding:0 24px 18px;display:grid;gap:14px;justify-items:start}
.oe-sem-oab{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.5}
.oe-sem-oab .ico{color:var(--vinho-4);margin-top:1px;flex:none}
@media (max-width:760px){
  .oe-insc,.oe-uso{padding:0 16px 8px}
  .cartao a.oe-nome{min-height:44px}
  .oe-insc .oe-bts{margin-left:62px;width:calc(100% - 62px)}
  .oe-insc .oe-bts .btn{flex:1}
  .oe-linha{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
  .oe-linha .oe-uf-c{grid-column:1/-1}
  .oe-tipos{grid-template-columns:1fr}
  .dir .oe-assina{font-size:21px}
  .oe-areas-f{padding:0 16px 16px}
  .oe-areas-f .btn{width:100%}
  .oe-uso .selo{margin-left:0}
}
"""


# ---------------------------------------------------------------- lista (a aprovada, com a OAB embaixo do nome)
def oab_linha(nome):
    ins = INSCRICOES.get(nome, [])
    t = '<span class="oe-sep" aria-hidden="true">·</span><span class="sr">, </span>'.join(f'<span class="oe-i">{oab_txt(u, n, l)}</span>' for u, n, l, _ in ins)
    return f'<span class="oe-oab-l">{ico("balanca")}<span class="oe-is">{t}</span></span>' if t else ''


def nome_html(nome, cls=''):
    href = FICHA.get(nome, '#')
    return f'<a class="oe-nome{cls}" href="{href}">{nome}<span class="sr">, abrir a ficha</span></a>'


def lista(pessoas, nova=None):
    linhas, cartoes = '', ''
    for p in pessoas:
        ini, nome, em, areas, sit, det, desde = p
        voce = '<span class="voce">você</span>' if areas == 'dono' else ''
        cls = ' class="pt-nova"' if nome == nova else ''
        av = 'av-p forte' if sit == 'ativa' else 'av-p apagado'
        linhas += (f'<tr{cls}><td><div class="esc"><span class="{av}" aria-hidden="true">{ini}</span><div>{nome_html(nome)}{voce}'
                   f'<small style="display:block;font-size:12px;color:var(--texto-2)">{em}@{DOM}</small>{oab_linha(nome)}</div></div></td>'
                   f'<td>{areas_html(areas)}</td><td>{sit_html(sit, det)}</td><td><div class="acoes-tab">{acoes_html(p)}</div></td></tr>')
        desde_t = f'<small>na equipe desde {desde}</small>' if desde else ''
        cartoes += (f'<li class="cartao"><div class="c-topo"><span class="{av}" aria-hidden="true">{ini}</span><div><strong class="c-nome" style="font-size:18px">{nome_html(nome)}</strong>{voce}'
                    f'<small>{em}@{DOM}</small>{desde_t}{oab_linha(nome)}</div></div>'
                    f'<div class="c-selos">{sit_html(sit, det) if sit != "ativa" else ""}{areas_html(areas)}</div>'
                    f'<div class="c-acoes">{acoes_html(p, False)}</div></li>')
    n_at = sum(1 for p in pessoas if p[4] == 'ativa')
    n_cv = len(pessoas) - n_at
    chips = (f'<div class="chips" role="group" aria-label="Mostrar" style="margin-left:0"><button type="button" aria-pressed="true">Todas ({len(pessoas)})</button>'
             f'<button type="button" aria-pressed="false">Ativas ({n_at})</button><button type="button" aria-pressed="false">Convites ({n_cv})</button></div>')
    return (f'<section class="folha" aria-labelledby="t-pessoas" style="overflow:hidden"><h2 id="t-pessoas" class="sr">Pessoas da equipe</h2>'
            f'<div class="ferramentas">{chips}</div>'
            f'<table class="so-pc pt-tabela"><colgroup><col style="width:28%"><col style="width:25%"><col style="width:19%"><col style="width:28%"></colgroup>'
            f'<thead><tr><th scope="col">Pessoa e OAB</th><th scope="col">Áreas liberadas</th><th scope="col">Situação</th><th scope="col"><span class="sr">Ações</span></th></tr></thead>'
            f'<tbody>{linhas}</tbody></table><ul class="cartoes so-cel" aria-label="Pessoas da equipe">{cartoes}</ul>'
            f'<p class="pt-pe-folha">{ico("balanca")}<span>A OAB é opcional: só quem é advogado precisa dela. Abra o nome da pessoa para cadastrar. É dela que saem o nome e a OAB/UF nos contratos e procurações.</span></p>'
            f'<p class="pt-pe-folha" style="border-top:0;padding-top:0">{ico("relogio")}<span>O convite vale 1&nbsp;hora. Depois disso, use Reenviar: o link antigo deixa de valer e o novo vale mais 1&nbsp;hora.</span></p></section>')


# ---------------------------------------------------------------- campos da OAB (UF, número e letra)
def ops_uf(sel=''):
    return '<option value="">Escolha</option>' + ''.join(
        f'<option value="{u}"{" selected" if u == sel else ""}>{uf_rotulo(u)}</option>' for u, _ in UFS)


def campos_oab(pref, uf='', num='', letra='', e_uf='', e_num='', e_letra='', foco=None, opc=False):
    """UF, número e letra numa linha. Erros presos a cada campo."""
    o = ' <span class="opcional">(opcional)</span>'

    def desc(id_, ajuda, erro):
        d = []
        if ajuda:
            d.append(f'{id_}-aj')
        if erro:
            d.append(f'{id_}-er')
        a = f' aria-describedby="{" ".join(d)}"' if d else ''
        return a + (' aria-invalid="true"' if erro else '')

    def er(id_, t):
        return f'<p class="erro-msg" id="{id_}-er">{ico("alerta", "ico ico-s")}{t}</p>' if t else ''

    f_uf = foco == 'uf' and ' data-foco' or ''
    f_num = foco == 'num' and ' data-foco' or ''
    aj_num = '' if e_num else 'Só os números, até 6. Os pontos o T3jus põe.'
    aj_letra = '' if e_letra else 'Só se a carteira tiver.'
    uf_c = (f'<div class="campo oe-uf-c"><label for="{pref}-uf">UF da seccional</label>'
            f'<select class="entrada" id="{pref}-uf" name="{pref}-uf"{desc(pref + "-uf", "", e_uf)}{f_uf}>{ops_uf(uf)}</select>{er(pref + "-uf", e_uf)}</div>')
    v = f' value="{num}"' if num else ''
    num_c = (f'<div class="campo"><label for="{pref}-num">Número</label>'
             f'<input class="entrada" id="{pref}-num" name="{pref}-num" type="text" inputmode="numeric" autocomplete="off"{v}{desc(pref + "-num", aj_num, e_num)}{f_num}>'
             + (f'<p class="ajuda" id="{pref}-num-aj">{aj_num}</p>' if aj_num else '') + f'{er(pref + "-num", e_num)}</div>')
    vl = f' value="{letra}"' if letra else ''
    letra_c = (f'<div class="campo"><label for="{pref}-letra">Letra{o}</label>'
               f'<input class="entrada" id="{pref}-letra" name="{pref}-letra" type="text" autocomplete="off" autocapitalize="characters" size="2"{vl}{desc(pref + "-letra", aj_letra, e_letra)}>'
               + (f'<p class="ajuda" id="{pref}-letra-aj">{aj_letra}</p>' if aj_letra else '') + f'{er(pref + "-letra", e_letra)}</div>')
    return f'<div class="oe-linha">{uf_c}{num_c}{letra_c}</div>'


def tipos(pref, sel='principal', ajuda=''):
    aj = f'<p class="ajuda" id="{pref}-tipo-aj">{ajuda}</p>' if ajuda else ''
    a = f' aria-describedby="{pref}-tipo-aj"' if ajuda else ''
    return (f'<fieldset class="oe-grupo"{a}><legend>Tipo de inscrição</legend><div class="oe-tipos">'
            + opcao(f'{pref}-tipo', 'Principal', 'A de origem. Vem primeiro nos documentos.', sel == 'principal', 'radio', 'principal')
            + opcao(f'{pref}-tipo', 'Suplementar', 'Para atuar em outra UF. Vem depois da principal.', sel == 'suplementar', 'radio', 'suplementar')
            + f'</div>{aj}</fieldset>')


def previa(texto):
    return f'<p class="oe-previa" aria-live="polite">{ico("pena")}<span>No contrato e na procuração: <b>{texto}</b></span></p>'


# ---------------------------------------------------------------- convite (o aprovado, com a OAB opcional)
def j_convidar(estado_=None):
    resumo = ''
    nome_v, mail_v = 'Renata Lopes', f'renata@{DOM}'
    uf, num, e_num = 'SP', '498310', ''
    if estado_ == 'oab-erro':
        uf, num = 'RJ', ''
        e_num = 'Escreva o número da OAB de Renata. Se ela não é advogada, deixe a UF em “Escolha”.'
        resumo = aviso('urgencia', 'Falta acertar 1 ponto, marcado abaixo.', 'O convite ainda não foi enviado.',
                       acoes='<ul><li><a href="#c-oab-num">OAB: falta o número</a></li></ul>')
    corpo = (resumo +
             f'<div class="campo"><label for="c-nome">Nome completo</label><input class="entrada" id="c-nome" name="c-nome" type="text" value="{nome_v}" autocomplete="off"{"" if e_num else " data-foco"}></div>'
             f'<div class="campo"><label for="c-email">E-mail</label><input class="entrada" id="c-email" name="c-email" type="email" value="{mail_v}" autocomplete="off" aria-describedby="c-email-ajuda">'
             f'<p class="ajuda" id="c-email-ajuda">O convite chega neste e-mail e vale 1&nbsp;hora.</p></div>'
             f'<fieldset class="oe-grupo" aria-describedby="c-oab-aj"><legend>OAB <span class="opcional" style="font-weight:400">(opcional)</span></legend>'
             f'<p class="ajuda" id="c-oab-aj">Só para quem é advogado. É a inscrição principal; a suplementar se põe depois, na ficha da pessoa.</p>'
             + campos_oab('c-oab', uf, num, e_num=e_num, foco='num' if e_num else None) + '</fieldset>'
             + (previa('Renata Lopes, ' + oab_doc('SP', '498310')) if not e_num else '')
             + f'<fieldset class="grupo-opcoes"><legend>Áreas que a pessoa abre</legend>{caixas("c-areas", ["juridico"])}</fieldset>{COMUNS}')
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("envelope")}Enviar convite</button>'
    return janela('janela-convidar', 'Equipe · Ribeiro &amp; Matos', 'Convidar pessoa',
                  'Mandamos um convite por e-mail. A pessoa cria a senha e entra no Portal com as áreas que você marcar.',
                  corpo, pe, abrir=estado_ is not None)


# ---------------------------------------------------------------- janelas da inscrição
def j_oab(variante=None, abrir=None):
    """Adicionar (Gustavo), com erros, com número de outra pessoa, ou editar (Felipe, RJ)."""
    abrir = variante is not None if abrir is None else abrir
    resumo, prev = '', ''
    if variante == 'editar':
        sobre, tit = 'Equipe · Felipe Matos', 'Editar a inscrição OAB/RJ 245.880-S'
        desc = 'Como está na carteira da OAB. A mudança vale para os contratos e procurações gerados daqui em diante.'
        campos = campos_oab('o', 'RJ', '245880', 'S', foco='num')
        tp = tipos('o', 'suplementar', 'Felipe já tem a principal, OAB/SP 287.104. Se marcar esta como principal, a de SP passa a suplementar.')
        prev = previa('Felipe Matos, ' + oab_frase('Felipe Matos'))
    else:
        sobre, tit = 'Equipe · Gustavo Lima', 'Adicionar inscrição na OAB'
        desc = 'Como está na carteira da OAB. Vale para os contratos e procurações gerados daqui em diante.'
        if variante == 'erros':
            resumo = aviso('urgencia', 'Falta acertar 2 pontos, marcados abaixo.', 'A inscrição ainda não foi salva.',
                           acoes='<ul><li><a href="#o-uf">UF da seccional: escolha uma</a></li><li><a href="#o-num">Número: use só números</a></li></ul>')
            campos = campos_oab('o', '', '51290A', e_uf='Escolha a UF da seccional em que Gustavo é inscrito.',
                                e_num='Use só números, até 6. A letra, se houver, vai no campo Letra.', foco='uf')
        elif variante == 'duplicada':
            resumo = aviso('urgencia', 'Falta acertar 1 ponto, marcado abaixo.', 'A inscrição ainda não foi salva.',
                           acoes='<ul><li><a href="#o-num">Número: já é de Larissa Costa</a></li></ul>')
            campos = campos_oab('o', 'SP', '401226', e_num='OAB/SP 401.226 já está com Larissa Costa nesta equipe. Confira o número na carteira de Gustavo.', foco='num')
        else:
            campos = campos_oab('o', 'SP', '512907', foco='uf')
            prev = previa('Gustavo Lima, ' + oab_doc('SP', '512907'))
        tp = tipos('o', 'principal', 'É a primeira inscrição de Gustavo, então vem como principal.')
    corpo = resumo + campos + tp + prev
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("check")}Salvar inscrição</button>'
    return janela('janela-oab', sobre, tit, desc, corpo, pe, abrir=abrir)


def j_remover(abrir=False):
    corpo = (f'<p class="pt-comuns">{ico("doc")}<span>Contratos e procurações já gerados não mudam: cada arquivo guarda a OAB do dia em que foi gerado. '
             f'A remoção fica no histórico da equipe, com seu nome e a hora.</span></p>')
    pe = '<button class="btn btn-fantasma" type="button" data-fechar data-foco>Voltar</button><button class="btn btn-perigo" type="submit">Remover a inscrição</button>'
    return janela('janela-remover', 'Equipe · Felipe Matos', 'Remover OAB/RJ 245.880-S de Felipe?',
                  'Os documentos gerados daqui em diante saem só com OAB/SP 287.104.', corpo, pe, alerta=True, abrir=abrir)


# ---------------------------------------------------------------- ficha da pessoa
def ficha_cab(nome, email, desde, dir_html):
    return (f'<div class="ficha-cab"><div class="esq campo-vinho">{ico("cracha", "ico estatua")}'
            f'<a class="voltar" href="{U}ver">{ico("esq", "ico ico-s")}Equipe</a>'
            f'<div class="ident"><div><p class="sobretitulo">Pessoa da equipe</p><h1>{nome}</h1>'
            f'<p class="meta"><span class="selo selo-ativo">Ativa</span><span>{email}@{DOM} · na equipe desde {desde}</span></p></div></div></div>{dir_html}</div>')


def dir_com(nome, ins_extra=None):
    frase = oab_frase(nome) if not ins_extra else oab_doc(*ins_extra)
    return (f'<section class="dir campo-ambar" aria-labelledby="t-assina"><p class="sobretitulo" id="t-assina">Como sai no contrato e na procuração</p>'
            f'<p class="oe-assina">{nome}, {frase}</p>'
            f'<p class="dica">Vale para os documentos gerados daqui em diante. Os já gerados guardam a OAB do dia.</p></section>')


def dir_sem(nome):
    pn = nome.split()[0]
    return (f'<section class="dir campo-ambar" aria-labelledby="t-assina"><p class="sobretitulo" id="t-assina">Como sai no contrato e na procuração</p>'
            f'<p class="oe-assina-vazia">Sem OAB cadastrada</p>'
            f'<p class="dica">{pn} não aparece como advogado nos contratos e procurações. Se {pn} é advogado, cadastre a inscrição.</p>'
            f'<button class="btn btn-pri" type="button" data-janela="janela-oab">{ico("mais")}Adicionar inscrição</button></section>')


def item_insc(nome, uf, num, letra, tipo, editar=True):
    pn = nome.split()[0]
    t = oab_txt(uf, num, letra)
    tp = 'Principal' if tipo == 'principal' else 'Suplementar'
    bts = ''
    if editar:
        bts = (f'<div class="oe-bts"><button class="btn btn-sec btn-compacto" type="button" data-janela="janela-oab-editar" aria-label="Editar a inscrição {t} de {pn}">{ico("lapis", "ico ico-s")}Editar</button>'
               f'<button class="btn btn-perigo btn-compacto" type="button" data-janela="janela-remover" aria-label="Remover a inscrição {t} de {pn}">Remover</button></div>')
    return (f'<li><span class="oe-uf" aria-hidden="true">{uf}</span><div class="oe-q"><strong>{t}</strong>'
            f'<small>{tp} · seccional {"do" if uf in ("RJ", "RS", "RN", "PA", "PR", "PI", "MA", "AC", "AM", "AP", "CE", "ES", "DF", "TO") else "de"} {UF_NOME[uf]}</small></div>{bts}</li>')


def folha_insc(nome, itens, vazio=False):
    pn = nome.split()[0]
    cab = (f'<div class="folha-cab"><div><h2 id="t-insc">Inscrições na OAB</h2>'
           f'<p class="sub">Opcional: só para quem é advogado. A principal vem primeiro nos documentos.</p></div>'
           f'<div class="acoes"><button class="btn btn-sec" type="button" data-janela="janela-oab">{ico("mais")}Adicionar inscrição</button></div></div>')
    if vazio:
        corpo = estado('Nenhuma inscrição cadastrada',
                       f'Se {pn} é advogado, cadastre a OAB para ele entrar nos contratos e procurações. Para quem não é advogado, como a recepção e o financeiro, deixe assim.',
                       icone='balanca', moldura=False)
    else:
        corpo = '<ul class="oe-insc">' + ''.join(item_insc(nome, *i) for i in itens) + '</ul>'
    pe = f'<p class="pt-pe-folha">{ico("historico")}<span>Só a sócia dona muda as inscrições. Cada mudança fica no histórico da equipe, com quem fez e quando.</span></p>'
    return f'<section class="folha" aria-labelledby="t-insc" style="overflow:hidden">{cab}{corpo}{pe}</section>'


USO_FELIPE = (f'<section class="folha" aria-labelledby="t-uso"><div class="folha-cab" style="padding-bottom:6px"><div><h2 id="t-uso" style="font-size:20px">Onde Felipe assina como advogado</h2>'
              f'<p class="sub">Contratos em que ele está marcado como advogado. Os documentos novos destes contratos já saem com as inscrições acima.</p></div></div><ul class="oe-uso">'
              f'<li><div><a href="contratos.html?estado=contrato-sem-oab">C-2026-019 · Farmácia Bom Jesus Ltda.</a><small>Responsável · procuração gerada em 02/09/2026</small></div><span class="selo selo-ativo">Ativo</span></li>'
              f'<li><div><a href="contratos.html?estado=novo-sem-oab">C-2026-033 · Benedito Souza Lima</a><small>Advogado no contrato · neste contrato vai só a OAB/SP 287.104 · documentos ainda não gerados</small></div><span class="selo selo-andamento">{ico("lapis")}Em elaboração</span></li>'
              f'</ul></section>')


def lateral(nome, email, areas, desde):
    pn = nome.split()[0]
    return (f'<section class="folha" aria-labelledby="t-ar"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-ar" style="font-size:20px">Áreas liberadas</h2></div></div>'
            f'<div class="oe-areas-f">{areas_html(areas)}<button class="btn btn-sec" type="button">{ico("funcoes")}Mudar áreas<span class="sr"> de {pn}</span></button></div></section>'
            f'<section class="folha" aria-labelledby="t-ac"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-ac" style="font-size:20px">Acesso</h2></div></div>'
            f'<dl class="hn-dl"><div><dt>E-mail</dt><dd>{email}@{DOM}</dd></div><div><dt>Na equipe desde</dt><dd>{desde}</dd></div><div><dt>Situação</dt><dd>Ativa</dd></div></dl>'
            f'<div class="oe-areas-f"><button class="btn btn-perigo" type="button">Retirar {pn} da equipe</button></div></section>')


def ficha(nome, salva=False):
    p = next(x for x in PESSOAS if x[1] == nome)
    ini, nome, em, areas, sit, det, desde = p
    if nome == 'Felipe Matos':
        cab = ficha_cab(nome, em, desde, dir_com(nome))
        miolo = folha_insc(nome, INSCRICOES[nome]) + USO_FELIPE
    elif salva:
        ins = [('SP', '512907', '', 'principal')]
        cab = ficha_cab(nome, em, desde, dir_com(nome, ins[0][:3]))
        miolo = folha_insc(nome, ins)
    else:
        cab = ficha_cab(nome, em, desde, dir_sem(nome))
        miolo = folha_insc(nome, [], vazio=True)
    return f'<div class="hn">{cab}<div class="hn-grade"><div class="hn-col">{miolo}</div><aside class="hn-col" aria-label="Sobre {nome}">{lateral(nome, em, areas, desde)}</aside></div></div>'


def j_oab_editar(abrir=False):
    return j_oab('editar', abrir).replace('id="janela-oab"', 'id="janela-oab-editar"').replace('janela-oab-t', 'janela-oab-editar-t').replace('janela-oab-d', 'janela-oab-editar-d').replace('id="o-', 'id="oe-').replace('for="o-', 'for="oe-').replace('"o-', '"oe-').replace(' o-', ' oe-')


# ---------------------------------------------------------------- estados
def jan(conv=None, oab=None, editar=False, remover=False):
    return janelas(conv=conv) + j_oab(oab) + j_oab_editar(editar) + j_remover(remover)


T = ''
base = dict(atual='equipe', trilha='Escritório|Equipe', titulo='Equipe')
fb = lambda n: dict(atual='equipe', trilha=f'Escritório|Equipe|{n}', titulo=n, sem_cabeca=True)
T += tpl('ver', grade(lista(PESSOAS)) + jan(), **base)
T += tpl('pessoa', ficha('Felipe Matos') + jan(), **fb('Felipe Matos'))
T += tpl('pessoa-sem-oab', ficha('Gustavo Lima') + jan(), **fb('Gustavo Lima'))
T += tpl('inscricao-nova', ficha('Gustavo Lima') + jan(oab='nova'), **fb('Gustavo Lima'))
T += tpl('inscricao-erros', ficha('Gustavo Lima') + jan(oab='erros'), **fb('Gustavo Lima'))
T += tpl('inscricao-duplicada', ficha('Gustavo Lima') + jan(oab='duplicada'), **fb('Gustavo Lima'))
T += tpl('inscricao-salva', ficha('Gustavo Lima', salva=True) + jan() +
         toast('Inscrição de Gustavo Lima salva.', 'OAB/SP 512.907 já vale para os contratos e procurações gerados daqui em diante. Ficou no histórico da equipe.'), **fb('Gustavo Lima'))
T += tpl('inscricao-editar', ficha('Felipe Matos') + jan(editar=True), **fb('Felipe Matos'))
T += tpl('inscricao-remover', ficha('Felipe Matos') + jan(remover=True), **fb('Felipe Matos'))
T += tpl('convidar', grade(lista(PESSOAS)) + jan(conv='aberta'), **base)
T += tpl('convidar-oab-erro', grade(lista(PESSOAS)) + jan(conv='oab-erro'), **base)

out = pagina('Equipe', 'Equipe do escritório no Portal: pessoas, áreas e a OAB de cada advogado.',
             '{"estado":"ver","atual":"equipe"}', CABECA, T)
# A Equipe continua só da sócia dona (decisão 1 da Carol, 19/11/2026). Cada pessoa vê a própria OAB em Sua conta.
out = com_conta(out, ico)
out = out.replace("'sem-area':{", QUEM_EXTRA, 1)
out = out.replace('</style>', CSS_FICHA + CSS_HN + CSS + '\n</style>', 1)
open(f'{SAIDA}/equipe.html', 'w', encoding='utf-8').write(out)
print('equipe ok', T.count('<template data-est='), 'estados')


# ---------------------------------------------------------------- Sua conta (decisão 1 da Carol, 19/11/2026)
# Quem não é sócia dona não vê a Equipe. Cada pessoa confere aqui, só para ler, a própria OAB.
# Página nova: conta.html. Entra pelo nome no pé do trilho (computador) e pelo Mais (celular).
CSS_CONTA = r"""
.oe-conta-cab .ident{padding-top:8px}
.oe-pe-conta{display:flex;align-items:flex-start;gap:10px;padding:14px 24px 18px;border-top:1px solid var(--divisor);font-size:13px;color:var(--texto-2);line-height:1.5}
.oe-pe-conta .ico{color:var(--vinho-4);margin-top:1px;flex:none}
.oe-pe-conta b{font-weight:500;color:var(--texto)}
.oe-rot{margin:0 0 -6px;font-size:13px;color:var(--texto-2)}
.oe-uso .oe-uso-ins{color:var(--vinho-2);font-weight:500}
@media (max-width:760px){.oe-pe-conta{padding:12px 16px 16px}}
"""
AREAS_FELIPE = ['comercial', 'contratos', 'juridico']   # as do perfil "contratos" (Felipe) das telas aprovadas


def conta_cab(nome, email, desde, dir_html):
    return (f'<div class="ficha-cab oe-conta-cab"><div class="esq campo-vinho">{ico("cracha", "ico estatua")}'
            f'<div class="ident"><div><p class="sobretitulo">Sua conta</p><h1>{nome}</h1>'
            f'<p class="meta"><span class="selo selo-ativo">Ativa</span><span>{email}@{DOM} · na equipe desde {desde}</span></p></div></div></div>{dir_html}</div>')


def conta_dir_com(nome):
    return (f'<section class="dir campo-ambar" aria-labelledby="t-assina"><p class="sobretitulo" id="t-assina">Como você sai no contrato e na procuração</p>'
            f'<p class="oe-assina">{nome}, {oab_frase(nome)}</p>'
            f'<p class="dica">É o padrão: todas as suas inscrições, a principal primeiro. Em cada contrato, quem o cria pode deixar uma de fora.</p></section>')


def conta_dir_sem():
    return (f'<section class="dir campo-ambar" aria-labelledby="t-assina"><p class="sobretitulo" id="t-assina">Como você sai no contrato e na procuração</p>'
            f'<p class="oe-assina-vazia">Sem OAB cadastrada</p>'
            f'<p class="dica">Você não aparece como advogada nos contratos e procurações. Para a recepção e o financeiro, é o normal. '
            f'Se você é advogada, peça a Marina Ribeiro, sócia dona, para cadastrar a sua inscrição.</p></section>')


PE_CONTA = (f'<p class="oe-pe-conta">{ico("cadeado")}<span>Algum número diferente da sua carteira? <b>Fale com Marina Ribeiro, sócia dona:</b> só ela muda a equipe. '
            f'A correção vale para os documentos gerados depois; os já gerados guardam a OAB do dia.</span></p>')


def conta_insc(nome, itens):
    if itens:
        corpo = '<ul class="oe-insc">' + ''.join(item_insc(nome, *i, editar=False) for i in itens) + '</ul>'
        sub = 'Para conferir com a sua carteira da OAB. A principal vem primeiro nos documentos.'
    else:
        corpo = estado('Nenhuma inscrição cadastrada', 'Se você é advogada, a sua OAB entra aqui quando a sócia dona cadastrar na Equipe.', icone='balanca', moldura=False)
        sub = 'Só para quem é advogado.'
    return (f'<section class="folha" aria-labelledby="t-insc" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-insc">Suas inscrições na OAB</h2>'
            f'<p class="sub">{sub}</p></div></div>{corpo}{PE_CONTA}</section>')


USO_CONTA = (f'<section class="folha" aria-labelledby="t-uso"><div class="folha-cab" style="padding-bottom:6px"><div><h2 id="t-uso" style="font-size:20px">Onde você assina como advogado</h2>'
             f'<p class="sub">Contratos em que você está marcado, com as inscrições que vão nos documentos de cada um.</p></div></div><ul class="oe-uso">'
             f'<li><div><a href="contratos.html?estado=contrato-sem-oab">C-2026-019 · Farmácia Bom Jesus Ltda.</a><small>Responsável · <span class="oe-uso-ins">OAB/SP 287.104 e OAB/RJ 245.880-S</span></small></div><span class="selo selo-ativo">Ativo</span></li>'
             f'<li><div><a href="contratos.html?estado=contrato-inscricoes">C-2026-033 · Benedito Souza Lima</a><small>Advogado no contrato · <span class="oe-uso-ins">só OAB/SP 287.104</span></small></div><span class="selo selo-andamento">{ico("lapis")}Em elaboração</span></li>'
             f'</ul></section>')


def conta_lado(email, desde, areas):
    return (f'<section class="folha" aria-labelledby="t-ac"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-ac" style="font-size:20px">Seu acesso</h2></div></div>'
            f'<dl class="hn-dl"><div><dt>E-mail</dt><dd>{email}@{DOM}</dd></div><div><dt>Na equipe desde</dt><dd>{desde}</dd></div></dl>'
            f'<div class="oe-areas-f"><p class="oe-rot">Áreas que você abre</p>{areas_html(areas)}</div>'
            f'<p class="oe-pe-conta">{ico("ajuda")}<span>Quem muda as áreas e as inscrições é a sócia dona, na Equipe.</span></p></section>')


def conta(nome):
    p = next(x for x in PESSOAS if x[1] == nome)
    ini, nome, em, areas, sit, det, desde = p
    if nome == 'Felipe Matos':
        cab = conta_cab(nome, em, desde, conta_dir_com(nome))
        miolo = conta_insc(nome, INSCRICOES[nome]) + USO_CONTA
        areas = AREAS_FELIPE
    else:
        cab = conta_cab(nome, em, desde, conta_dir_sem())
        miolo = conta_insc(nome, [])
    return f'<div class="hn">{cab}<div class="hn-grade"><div class="hn-col">{miolo}</div><aside class="hn-col" aria-label="Seu acesso">{conta_lado(em, desde, areas)}</aside></div></div>'


TC = ''
bc = dict(atual='conta', trilha='Sua conta', titulo='Sua conta', sem_cabeca=True)
TC += tpl('conta', conta('Felipe Matos'), quem='contratos', **bc)
TC += tpl('conta-sem-oab', conta('Paula Nunes'), quem='sem-area', **bc)
out = pagina('Sua conta', 'Sua conta no Portal: seus dados e a sua OAB, para conferir.', '{"estado":"conta","atual":"conta"}', '', TC)
out = com_conta(out, ico)
out = out.replace("'sem-area':{", QUEM_EXTRA, 1)
out = out.replace('</style>', CSS_FICHA + CSS_HN + CSS + CSS_CONTA + '\n</style>', 1)
open(f'{SAIDA}/conta.html', 'w', encoding='utf-8').write(out)
print('conta ok', TC.count('<template data-est='), 'estados')
