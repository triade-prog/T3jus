# Portal · Clientes › ficha ligada: abas Propostas, Contratos e Casos, botão do próximo passo,
# "Gerar proposta" na lista e a assinatura do contrato que leva o cliente a Jurídico › Casos e processos.
# Parte da ficha aprovada de Clientes (clientes.py, lido até os estados, sem mudança) e da ficha do caso
# aprovada no Jurídico (juridico.py, lido até os estados, num espaço à parte, para o CSS e as peças).
# Peças novas com prefixo fl-. Uso: python3 ficha_ligada.py <pasta-saida>
import os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
ARGV = list(sys.argv)
_corte = '# ---------------------------------------------------------------- estados'
_src = open(os.path.join(AQUI, 'clientes.py'), encoding='utf-8').read()
exec(compile(_src[:_src.index(_corte)], 'clientes.py', 'exec'), globals())
J = {'__name__': 'juridico'}
_sj = open(os.path.join(AQUI, 'juridico.py'), encoding='utf-8').read()
exec(compile(_sj[:_sj.index(_corte)], 'juridico.py', 'exec'), J)
import comum

SAIDA = ARGV[1] if len(ARGV) > 1 else 'saida'
U = '?estado='  # relativo: funciona aberto do disco e publicado como página única

# Mais duas pessoas do elenco aprovado: Bianca (Contratos e Financeiro, sem Jurídico) e Diego (Comercial e Financeiro).
comum.SCRIPT = comum.SCRIPT.replace(
    "'sem-area':{",
    "bianca:{nome:'Bianca Torres',ini:'B',papel:'Áreas: Contratos e Financeiro',areas:['contratos','financeiro'],dono:false},\n"
    "    diego:{nome:'Diego Almeida',ini:'D',papel:'Áreas: Comercial e Financeiro',areas:['comercial','financeiro'],dono:false},\n"
    "    'sem-area':{")
# Navegação entre os estados (só no index.html; some nas capturas com &foto=1)
comum.SCRIPT = comum.SCRIPT.replace(
    "  document.getElementById('miolo').appendChild(t.content.cloneNode(true));",
    "  document.getElementById('miolo').appendChild(t.content.cloneNode(true));\n"
    "  var ne=document.getElementById('fl-estados'); if(ne){ if(q.get('foto')){ne.remove()} else { var a=ne.querySelector('a[href=\"?estado='+t.dataset.est+'\"]'); if(a){a.setAttribute('aria-current','page'); ne.querySelector('summary b').textContent=a.textContent} } }")
comum.SCRIPT = comum.SCRIPT.replace(
    "var t=document.querySelector('template[data-est=\"'+est+'\"]')||document.querySelector('template[data-est=\"'+padrao.estado+'\"]');",
    "var t=document.querySelector('template[data-est=\"'+est+'\"]')||document.querySelector('template[data-est=\"'+padrao.estado+'\"]'); t.dataset.est=t.getAttribute('data-est');")

CSS_FL = r"""
/* ==========================================================================
   Portal · Clientes › ficha ligada (prefixo fl-). Só tokens e pares já aprovados.
   ========================================================================== */
/* Âmbar do topo: o próximo passo */
.dir.fl-passo{gap:10px}
.fl-jor{list-style:none;margin:2px 0 0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}
.fl-jor li{display:flex;align-items:center;justify-content:center;gap:4px;min-height:26px;padding:0 4px;border-radius:13px;font-size:11.5px;font-weight:500;color:var(--tinta);box-shadow:inset 0 0 0 1px rgba(79,29,53,.45);white-space:nowrap}
.fl-jor li .ico{width:13px;height:13px}
.fl-jor li.fl-ok{background:var(--vinho);color:var(--papel);box-shadow:none}
.fl-jor li.fl-ag{background:var(--papel);color:var(--vinho);box-shadow:inset 0 0 0 1.5px var(--vinho);font-weight:600}
.fl-acoes{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.dir .fl-acoes .btn{align-self:auto}
.fl-contato{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:4px;padding-top:12px;border-top:1px solid rgba(79,29,53,.3);font-size:13px;color:var(--tinta)}
.fl-contato>span{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}
.fl-contato>span>.ico{width:16px;height:16px;color:#4F1D35;flex:none}
.fl-contato b{font-weight:600}
.fl-contato .btn{min-height:44px;background:rgba(255,255,255,.92)}
.fl-semacao{font-size:12.5px;color:var(--tinta);line-height:1.45;display:flex;gap:8px;align-items:flex-start}
.fl-semacao .ico{width:16px;height:16px;flex:none;margin-top:1px;color:#4F1D35}

/* Nome longo na lista: a correção que já está no código (portal.css, 22/11) */
.cl-tab .esc>div{min-width:0}
.cl-tab .esc a{position:relative;display:inline-block;margin:0;min-height:0;overflow-wrap:anywhere}
.cl-tab .esc a::after{content:"";position:absolute;inset:-10px -4px -6px}

/* Tabelas das abas novas */
.fl-tab td{vertical-align:middle}
.fl-tab .fl-num a{position:relative;font-family:var(--serifa);font-size:18px;font-weight:500;color:var(--vinho);text-decoration:none;display:inline-block;overflow-wrap:anywhere;line-height:1.25}
.fl-tab .fl-num a::after{content:"";position:absolute;inset:-10px -4px -6px}
.fl-tab .fl-num a:hover{text-decoration:underline}
.fl-tab small,.fl-c small{display:block;font-size:12px;color:var(--texto-2);line-height:1.4}
.fl-tab b{font-weight:500}
.fl-tab .fl-ir{display:inline-flex;align-items:center;gap:6px;min-height:44px;color:var(--vinho);font-weight:500;text-decoration:none;font-size:13px;white-space:nowrap}
.fl-tab .fl-ir:hover{text-decoration:underline}
.fl-tab tr.fl-vivo td{background:#FCF8F5}
.fl-tab tr.fl-vivo td:first-child{box-shadow:inset 3px 0 0 var(--ambar)}
.fl-tab tr.fl-off td{color:var(--texto-2)}
.fl-tab tr.fl-off .fl-num a{color:var(--vinho-2)}
.fl-pe{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:14px 24px;border-top:1px solid var(--divisor);font-size:13px;color:var(--texto-2)}
.fl-pe b{color:var(--texto);font-weight:500}
.fl-cards .cartao .c-nome{font-size:18px}
.fl-cards .c-dados dd{margin:0;text-align:right}
.fl-cards .fl-c-acao{position:relative;z-index:1}
.fl-cards .fl-c-acao .btn{width:100%}
.fl-et{display:grid;gap:4px;justify-items:start}
.fl-et b{font-weight:500}

/* Lista de Clientes: coluna do próximo passo */
.fl-passo-l{display:grid;gap:6px;justify-items:start}
.fl-passo-l>span{font-size:13px;line-height:1.35}
.fl-passo-l>span small{display:block;font-size:12px;color:var(--texto-2)}
.fl-passo-l .btn{min-height:40px}
.cl-tab .fl-passo-l .btn{margin:-2px 0}

/* Resumo "No escritório" (aba Ficha) */
.fl-resumo{list-style:none;margin:0;padding:0 24px 12px}
.fl-resumo li{display:grid;grid-template-columns:22px minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 0;border-top:1px solid var(--divisor);font-size:13px}
.fl-resumo li:first-child{border-top:0}
.fl-resumo .ico{width:18px;height:18px;color:var(--vinho-4)}
.fl-resumo b{display:block;font-weight:500;font-size:14px}
.fl-resumo small{display:block;font-size:12px;color:var(--texto-2)}
.fl-resumo a{display:inline-flex;align-items:center;justify-content:flex-end;min-height:44px;min-width:44px;color:var(--vinho);font-weight:500;text-decoration:none;font-size:13px}
.fl-resumo a:hover{text-decoration:underline}
.fl-resumo .fl-trava{color:var(--texto-2)}

/* Janela da assinatura */
.fl-arq{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 12px;border:1px solid var(--borda-folha);border-radius:var(--raio);background:var(--papel)}
.fl-arq .fl-ic{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:var(--ambar-3);color:var(--vinho)}
.fl-arq strong{display:block;font-weight:500;font-size:14px;overflow-wrap:anywhere}
.fl-arq small{display:block;font-size:12px;color:var(--texto-2)}
.fl-rot{font-weight:500;font-size:14px;margin:0 0 6px}
.fl-caso{border:0;margin:0;padding:14px 16px;border-radius:var(--raio);background:var(--sal-2);display:grid;gap:12px;min-width:0}
.fl-caso legend{float:left;width:100%;padding:0;font-family:var(--serifa);font-size:19px;font-weight:600;color:var(--vinho)}
.fl-caso legend small{display:block;font-family:var(--sans);font-size:12px;font-weight:400;color:var(--texto-2)}
.fl-caso .opcao{margin:0;background:var(--papel);border:1px solid var(--borda-folha);border-radius:var(--raio);padding:12px 14px}
.fl-caso .opcao:has(input:checked){border-color:var(--vinho);box-shadow:inset 0 0 0 1px var(--vinho)}
.fl-novo{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px 16px;padding:12px 14px;margin:-4px 0 0;border:1px solid var(--vinho);border-top:0;border-radius:0 0 var(--raio) var(--raio);background:var(--papel)}
.fl-caso .opcao.fl-aberta{border-radius:var(--raio) var(--raio) 0 0}
.fl-novo .c6{grid-column:span 6}.fl-novo .c3{grid-column:span 3}.fl-novo .c2{grid-column:span 2}.fl-novo .c4{grid-column:span 4}
.fl-novo .fl-fixo{grid-column:span 6;display:flex;gap:8px;align-items:flex-start;font-size:12.5px;color:var(--texto-2);line-height:1.45}
.fl-novo .fl-fixo .ico{width:16px;height:16px;flex:none;margin-top:1px;color:var(--vinho-4)}
.fl-depois{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:var(--raio);background:var(--ambar-3);font-size:13px;line-height:1.5;color:var(--tinta)}
.fl-depois .ico{flex:none;margin-top:1px;color:var(--vinho)}
.fl-depois b{font-weight:600}
.fl-ja{display:grid;gap:6px;padding:12px 14px;border-radius:var(--raio);background:var(--papel);border:1px solid var(--borda-folha);font-size:13px}
.fl-ja dl{margin:0;display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 14px}
.fl-ja dt{color:var(--texto-2)}
.fl-ja dd{margin:0;font-weight:500}

@media (min-width:761px){#janela-assinar,#janela-caso{width:min(640px,calc(100vw - 32px))}}

/* Navegação entre os estados (só para a Carol ver; não é tela) */
#fl-estados{position:fixed;right:16px;bottom:16px;z-index:50;max-width:min(380px,calc(100vw - 32px));font-size:13px}
#fl-estados summary{list-style:none;display:flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;border-radius:22px;background:var(--tinta);color:var(--papel);cursor:pointer;box-shadow:0 8px 24px -10px rgba(42,26,34,.6)}
#fl-estados summary::-webkit-details-marker{display:none}
#fl-estados summary b{font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#fl-estados summary .ico{width:16px;height:16px;flex:none}
#fl-estados .fl-lista{margin-top:8px;max-height:min(70vh,560px);overflow:auto;background:var(--papel);border:1px solid var(--borda-folha);border-radius:var(--raio-g);padding:8px;box-shadow:0 12px 32px -12px rgba(42,26,34,.5)}
#fl-estados p{margin:10px 8px 4px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--vinho-2);font-weight:500}
#fl-estados a{display:flex;align-items:center;min-height:40px;padding:4px 10px;border-radius:var(--raio);color:var(--tinta);text-decoration:none;line-height:1.3}
#fl-estados a:hover{background:var(--sal-2)}
#fl-estados a[aria-current]{background:var(--vinho);color:var(--papel)}

@media (max-width:760px){
  .fl-jor li{font-size:11px;padding:0 2px}
  .fl-acoes .btn{flex:1 1 100%}
  .fl-contato .btn{flex:1 1 100%}
  .fl-pe{padding:12px 16px}
  .fl-resumo{padding:0 16px 10px}
  .fl-novo{grid-template-columns:1fr}
  .fl-novo .c6,.fl-novo .c3,.fl-novo .c2,.fl-novo .c4,.fl-novo .fl-fixo{grid-column:1/-1}
  .cl .abas{grid-template-columns:repeat(3,minmax(0,1fr))!important}
  .cl .folha-cab .acoes .btn{flex:1 1 100%}
  #fl-estados{bottom:84px}
}
"""

# ---------------------------------------------------------------- dados (fictícios, do elenco aprovado)
NOVA = '/comercial/propostas/nova?cliente=ap'
P_NUM, C_NUM = 'P-2026-014', 'C-2026-031'
CASO = 'Ferreira Prado x INSS'
HON = 'R$ 1.500,00 de entrada + 30% do êxito'
JOR = ['Proposta', 'Contrato', 'Assinatura', 'Caso']


def jornada(n):
    """n = quantos passos já estão feitos (0 a 4)."""
    li = ''
    for i, nome in enumerate(JOR):
        if i < n:
            li += f'<li class="fl-ok">{ico("check")}{nome}<span class="sr">: feito</span></li>'
        elif i == n:
            li += f'<li class="fl-ag">{nome}<span class="sr">: é o próximo passo</span></li>'
        else:
            li += f'<li>{nome}<span class="sr">: depois</span></li>'
    return f'<ol class="fl-jor" aria-label="Caminho do cliente no escritório">{li}</ol>'


CONTATO_VENC = ('13/11', 'vencido há 5 dias', 'Diego Almeida', 'vencido')
CONTATO_FUT = ('20/11', 'sexta', 'Diego Almeida', 'futuro')


def linha_contato(c=CONTATO_VENC, botao=True):
    if c is None:
        t = f'<span>{ico("relogio")}Sem próximo contato marcado.</span>'
    else:
        data, q, resp, tp = c
        selo_ = (f'<span class="selo selo-urgente">{ico("alerta")}{q}</span>' if tp == 'vencido' else f'<span class="selo selo-neutro">{q}</span>')
        t = f'<span>{ico("relogio")}<span>Próximo contato <b>{data}</b>, com {resp.split()[0]}</span>{selo_}</span>'
    b = f'<button class="btn btn-sec" type="button" data-janela="janela-registrar">{ico("mais")}Registrar atendimento</button>' if botao else ''
    return f'<div class="fl-contato">{t}{b}</div>'


def dir_passo(titulo, oque, acoes, passos, contato=CONTATO_VENC, sobre='Próximo passo', contato_botao=True, grande_px=30):
    a = f'<div class="fl-acoes">{acoes}</div>' if acoes else ''
    lc = linha_contato(contato, contato_botao) if contato != 'nao' else ''
    return (f'<section class="dir campo-ambar fl-passo" aria-labelledby="t-passo"><p class="sobretitulo" id="t-passo">{sobre}</p>'
            f'<p class="grande" style="font-size:{grande_px}px">{titulo}</p>{jornada(passos)}'
            f'<p class="cl-oque">{oque}</p>{a}{lc}</section>')


# Botões do próximo passo (o mesmo botão vai no âmbar e ao lado de "Histórico de atendimento")
def b_gerar_proposta(cls='btn-pri'):
    return f'<a class="btn {cls}" href="{U}propostas-vazio" data-rota="{NOVA}">{ico("maleta")}Gerar proposta</a>'


B_RESPOSTA = f'<a class="btn btn-pri" href="#" data-rota="/comercial/propostas/p14?responder=1">{ico("conversas")}Registrar resposta</a>'
B_CONTRATO = f'<a class="btn btn-pri" href="#" data-rota="/contratos/contratos/novo?proposta=p14">{ico("pena")}Gerar contrato</a>'
B_ASSINAR = f'<button class="btn btn-pri" type="button" data-janela="janela-assinar">{ico("check")}Registrar assinatura</button>'
B_ABRIR = f'<button class="btn btn-pri" type="button" data-janela="janela-caso">{ico("balanca")}Abrir o caso</button>'
B_VER_CASO = f'<a class="btn btn-pri" href="{U}caso-aberto">{ico("balanca")}Ver o caso</a>'
B_REG_SEC = f'<button class="btn btn-sec" type="button" data-janela="janela-registrar">{ico("mais")}Registrar atendimento</button>'
B_REG_PRI = f'<button class="btn btn-pri" type="button" data-janela="janela-registrar">{ico("mais")}Registrar atendimento</button>'


# ---------------------------------------------------------------- abas
ABAS = [('ficha', 'Ficha', None, None), ('atendimentos', 'Atendimentos', 'comercial', 'atendimentos'),
        ('propostas', 'Propostas', 'comercial', 'propostas'), ('contratos', 'Contratos', 'contratos', 'contratos'),
        ('casos', 'Casos', 'juridico', 'casos')]


def abas_fl(n, areas=('comercial', 'contratos', 'juridico'), estado_base='sem-proposta'):
    """n: dict aba -> contagem. Abas de área que a pessoa não tem não aparecem."""
    a = ''
    for k, rot, area, _ in ABAS:
        if area and area not in areas:
            continue
        q = f'<span class="q">{n[k]}</span>' if n.get(k) is not None else ''
        a += f'<a data-aba="{k}" href="{U}{estado_base}">{rot}{q}</a>'
    return f'<nav class="abas" aria-label="Seções da ficha">{a}</nav>'


def pe_sem_area(falta):
    txt = {('comercial',): 'Atendimentos e propostas ficam na área Comercial',
           ('contratos',): 'Contratos ficam na área Contratos',
           ('juridico',): 'Casos ficam na área Jurídico'}
    partes = [txt[(f,)] for f in falta]
    frase = '; '.join([partes[0]] + [x[0].lower() + x[1:] for x in partes[1:]])
    plural = 'que não estão liberadas' if len(falta) > 1 else 'que não está liberada'
    return f'<p class="pt-pe-folha">{ico("cadeado")}<span>{frase}, {plural} para você. Quem libera é Marina Ribeiro, a sócia dona.</span></p>'


def tabela(cap, cols, larg, linhas, cartoes, pe=''):
    cg = ''.join(f'<col style="width:{w}%">' for w in larg)
    th = ''.join(f'<th scope="col">{c}</th>' for c in cols)
    tr = ''
    for cls, tds in linhas:
        c = f' class="{cls}"' if cls else ''
        tr += f'<tr{c}>' + ''.join(f'<td>{x}</td>' for x in tds) + '</tr>'
    return (f'<table class="so-pc cl-tab fl-tab"><caption class="sr">{cap}</caption><colgroup>{cg}</colgroup><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table>'
            f'<ul class="cartoes so-cel fl-cards" aria-label="{cap}">{cartoes}</ul>{pe}')


def cartao(nome, href, sub, dados, selos='', acao=''):
    dl = ''.join(f'<dt>{k}</dt><dd>{v}</dd>' for k, v in dados)
    s = f'<div class="c-selos">{selos}</div>' if selos else ''
    a = f'<div class="fl-c-acao">{acao}</div>' if acao else ''
    return (f'<li class="cartao"><div class="c-topo"><div><a class="c-nome" href="{href}">{nome}</a><small>{sub}</small></div>{ico("dir", "ico c-ir")}</div>'
            f'<dl class="c-dados">{dl}</dl>{s}{a}</li>')


def folha_aba(id_, titulo, sub, corpo, acoes=''):
    a = f'<div class="acoes">{acoes}</div>' if acoes else ''
    return (f'<section class="folha" aria-labelledby="{id_}" style="overflow:hidden"><div class="folha-cab"><div><h2 id="{id_}">{titulo}</h2>'
            f'<p class="sub">{sub}</p></div>{a}</div>{corpo}</section>')


SELO_P = {'enviada': ('selo-andamento', 'enviar', 'Enviada'), 'aceita': ('selo-ativo', 'check', 'Aceita'),
          'contrato': ('selo-ok', 'pena', 'Virou contrato'), 'recusada': ('selo-neutro', 'x', 'Recusada'),
          'rascunho': ('selo-neutro', 'lapis', 'Rascunho')}


def selo_p(k, extra=''):
    c, i, t = SELO_P[k]
    return f'<span class="selo {c}">{ico(i)}{t}{extra}</span>'


# ----- Propostas
def aba_propostas(situacao):
    """situacao: 'vazio', 'enviada', 'aceita', 'contrato'"""
    sub = 'O que o escritório ofereceu a Antônia. Cada proposta abre a própria ficha.'
    if situacao == 'vazio':
        corpo = estado('Nenhuma proposta para Antônia ainda',
                       'A proposta já sai com o nome e a qualificação dela. Depois de aceita, vira contrato com um clique.', 'maleta', moldura=False,
                       acoes=b_gerar_proposta())
        return folha_aba('t-aba', 'Propostas', sub, corpo)
    st = {'enviada': ('fl-vivo', selo_p('enviada'), 'Enviada em 10/11 · retorno em 20/11, com Diego'),
          'aceita': ('fl-vivo', selo_p('aceita'), 'Aceita em 14/11 · falta o contrato'),
          'contrato': ('', selo_p('contrato'), f'Aceita em 14/11 · contrato {C_NUM}')}[situacao]
    linhas = [(st[0], [f'<div class="fl-num"><a href="#">{P_NUM}</a><small>Criada em 05/11 por Diego Almeida</small></div>',
                       f'<div class="fl-et">{st[1]}<small>{st[2]}</small></div>',
                       f'<b>{HON}</b><small>Pensão por morte · recurso ao INSS e ação, se precisar</small>',
                       '<a class="fl-ir" href="#">Abrir' + ico("dir", "ico ico-s") + '</a>']),
              ('fl-off', [f'<div class="fl-num"><a href="#">P-2026-009</a><small>Criada em 28/10 por Marina Ribeiro</small></div>',
                          f'<div class="fl-et">{selo_p("recusada")}<small>Recusada em 03/11 · “achou a entrada alta”</small></div>',
                          '<b>R$ 2.500,00 de entrada + 30% do êxito</b><small>Pensão por morte</small>',
                          '<a class="fl-ir" href="#">Abrir' + ico("dir", "ico ico-s") + '</a>'])]
    cards = (cartao(P_NUM, '#', 'Criada em 05/11 por Diego Almeida', [('Honorários', HON), ('Situação', st[2])], st[1])
             + cartao('P-2026-009', '#', 'Criada em 28/10 por Marina Ribeiro', [('Honorários', 'R$ 2.500,00 + 30% do êxito'), ('Situação', 'Recusada em 03/11')], selo_p('recusada')))
    pe = f'<div class="fl-pe"><span><b>2 propostas</b> · da mais nova para a mais antiga. Nada aqui é apagado.</span></div>'
    acoes = b_gerar_proposta('btn-sec')
    return folha_aba('t-aba', 'Propostas', sub, tabela('Propostas de Antônia', ['Proposta', 'Situação', 'Honorários', '<span class="sr">Abrir</span>'],
                                                        [22, 30, 38, 10], linhas, cards, pe), acoes)


# ----- Contratos
def aba_contratos(situacao, caso_link=True):
    """situacao: 'vazio-aceita', 'vazio', 'elaboracao', 'ativo-sem-caso', 'ativo'"""
    sub = 'Os contratos de honorários de Antônia, com a situação, a assinatura e o caso ligado.'
    if situacao.startswith('vazio'):
        if situacao == 'vazio-aceita':
            corpo = estado('Nenhum contrato ainda',
                           f'A proposta {P_NUM} foi aceita em 14/11. O contrato sai dela, com as condições e a qualificação já preenchidas.', 'pena', moldura=False,
                           acoes=B_CONTRATO.replace('Gerar contrato', f'Gerar contrato da {P_NUM}'))
        else:
            corpo = estado('Nenhum contrato ainda', 'O contrato nasce da proposta aceita. Sem proposta, dá para criar o contrato direto em Contratos.', 'pena', moldura=False,
                           acoes=f'<a class="btn btn-sec" href="#">{ico("mais")}Criar contrato sem proposta</a>')
        return folha_aba('t-aba', 'Contratos', sub, corpo)
    if situacao == 'elaboracao':
        sit = f'<div class="fl-et"><span class="selo selo-atencao">{ico("relogio")}Em elaboração</span><small>Desde 16/11 · falta a assinatura</small></div>'
        rec = '<small>A programação nasce na assinatura</small>'
        caso = '<small>Abre ao registrar a assinatura</small>'
        cls = 'fl-vivo'
        sel_c = f'<span class="selo selo-atencao">{ico("relogio")}Em elaboração</span>'
        acao_c = B_ASSINAR
    else:
        sit = f'<div class="fl-et"><span class="selo selo-ativo">{ico("check")}Ativo</span><small>Assinado em {"18/11" if situacao == "ativo" else "11/11"}</small></div>'
        rec = '<b class="num">R$ 1.500,00</b><small>entrada, vence 25/11 · êxito depende do caso</small>'
        if situacao == 'ativo':
            caso = (f'<a class="fl-ir" href="{U}caso-aberto">{CASO}</a><small>Preparação</small>' if caso_link
                    else f'<b>{CASO}</b><small>Em Jurídico · com Larissa Costa</small>')
        else:
            caso = '<small>Sem caso ainda</small>'
        cls = '' if situacao == 'ativo' else 'fl-vivo'
        sel_c = f'<span class="selo selo-ativo">{ico("check")}Ativo</span>'
        acao_c = B_ABRIR if situacao == 'ativo-sem-caso' else ''
    linhas = [(cls, [f'<div class="fl-num"><a href="#">{C_NUM}</a><small>Pensão por morte · veio da {P_NUM}</small></div>', sit,
                     f'<b>{HON}</b>', rec, caso])]
    cards = cartao(C_NUM, '#', f'Pensão por morte · veio da {P_NUM}',
                   [('Honorários', HON), ('Caso', CASO if situacao == 'ativo' else ('Sem caso ainda' if situacao == 'ativo-sem-caso' else 'Abre na assinatura'))],
                   sel_c, acao_c)
    pe = '<div class="fl-pe"><span><b>1 contrato</b>. Baixar o PDF ou o .docx, mudar condições e encerrar ficam na ficha do contrato.</span></div>'
    return folha_aba('t-aba', 'Contratos', sub, tabela('Contratos de Antônia', ['Contrato', 'Situação', 'Honorários', 'Recebimentos', 'Caso'],
                                                        [21, 18, 22, 20, 19], linhas, cards, pe))


# ----- Casos
def aba_casos(situacao):
    """situacao: 'vazio-sem-assinatura', 'vazio-assinado', 'um'"""
    sub = 'Os casos e processos em que Antônia é cliente. Um processo pode ter mais de um cliente.'
    if situacao == 'vazio-sem-assinatura':
        corpo = estado('Nenhum caso ainda', 'O caso abre em Jurídico quando a assinatura do contrato for registrada, já com os dados do contrato.', 'balanca', moldura=False)
        return folha_aba('t-aba', 'Casos', sub, corpo)
    if situacao == 'vazio-assinado':
        corpo = estado('Nenhum caso ainda',
                       f'O contrato {C_NUM} foi assinado em 11/11, antes de a assinatura abrir o caso sozinha. Abra o caso agora: nome, área e responsável vêm do contrato.', 'balanca', moldura=False,
                       acoes=B_ABRIR + f'<a class="btn btn-sec" href="#">{ico("link")}Juntar a um caso que já existe</a>')
        return folha_aba('t-aba', 'Casos', sub, corpo)
    et = J['etapa_cel'](1) if False else ''
    linhas = [('', [f'<div class="fl-num"><a href="{U}caso-aberto">{CASO}</a><small>Sem número ainda · Previdenciário</small></div>',
                    f'<div class="fl-et"><b>Preparação</b>{J["mini"](1)}<small>1 de 8 · desde 18/11</small></div>',
                    '<b>Autora</b><small>Única cliente do caso</small>',
                    f'{J["resp"]("Larissa Costa")}',
                    '<span class="cl-sem">Nenhum prazo aberto</span>'])]
    cards = cartao(CASO, f'{U}caso-aberto', 'Sem número ainda · Previdenciário',
                   [('Etapa', 'Preparação · 1 de 8'), ('Papel', 'Autora'), ('Responsável', 'Larissa Costa')])
    pe = f'<div class="fl-pe"><span><b>1 caso</b> em andamento. Prazos, tarefas e documentos ficam na ficha do caso.</span></div>'
    return folha_aba('t-aba', 'Casos', sub, tabela('Casos de Antônia', ['Caso', 'Etapa', 'Antônia no caso', 'Responsável', 'Próximo prazo'],
                                                    [27, 20, 17, 18, 18], linhas, cards, pe))


def aba_carregando(nome):
    linha = ('<div style="display:flex;gap:16px;align-items:center;padding:16px 24px;border-top:1px solid var(--sal)">'
             '<div style="flex:1;display:grid;gap:8px"><span class="esqueleto esq-linha" style="width:30%;height:16px"></span><span class="esqueleto esq-linha" style="width:45%;height:10px"></span></div>'
             '<span class="esqueleto esq-linha" style="width:110px;height:26px"></span></div>')
    return (f'<section class="folha" aria-busy="true" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-aba">{nome}</h2><p class="sub">Carregando…</p></div></div>'
            f'<p class="sr" role="status">Carregando as {nome.lower()} de Antônia…</p><div aria-hidden="true">{linha * 3}</div></section>')


def aba_erro(nome, artigo='os'):
    corpo = estado(f'Não deu para carregar {artigo} {nome.lower()} de Antônia',
                   'O servidor não respondeu. A ficha e as outras abas continuam valendo, e nada foi mudado. Tente de novo; se continuar, mande o código ao suporte.',
                   erro=True, moldura=False, acoes=f'<button class="btn btn-pri" type="button">{ico("reenviar")}Tentar de novo</button>',
                   codigo='Código para o suporte: PTL-7A31-0733')
    return folha_aba('t-aba', nome, 'Os casos e processos em que Antônia é cliente.', corpo)


# ----- Atendimentos: o botão do passo no lugar do "Registrar atendimento"
def historico_fl(botao_passo, n=3):
    h = historico()
    velho = f'<div class="acoes"><button class="btn btn-pri" type="button" data-janela="janela-registrar">{ico("mais")}Registrar atendimento</button></div>'
    assert velho in h
    return h.replace(velho, f'<div class="acoes">{botao_passo}{B_REG_SEC if "Registrar atendimento" not in botao_passo else ""}</div>')


# ----- Ficha: "No escritório" no lugar do quadro reservado
def resumo(prop, ctr, caso, quem='socio'):
    li = ''
    if prop is not None:
        li += f'<li>{ico("maleta")}<span><b>Proposta</b><small>{prop}</small></span><a href="{U}proposta-enviada" aria-label="Ver a aba Propostas">Ver</a></li>'
    if ctr is not None:
        li += f'<li>{ico("pena")}<span><b>Contrato</b><small>{ctr}</small></span><a href="{U}contrato-aba" aria-label="Ver a aba Contratos">Ver</a></li>'
    if caso is not None:
        li += f'<li>{ico("balanca")}<span><b>Caso</b><small>{caso}</small></span><a href="{U}com-caso" aria-label="Ver a aba Casos">Ver</a></li>'
    return (f'<section class="folha" aria-labelledby="t-noesc"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-noesc" style="font-size:20px">No escritório</h2>'
            f'<p class="sub">O que Antônia tem aqui. Cada linha abre a aba.</p></div></div><ul class="fl-resumo">{li}</ul></section>')


# ---------------------------------------------------------------- janelas novas
def campo_j(*a, **k):
    return J['campo'](*a, **k)


def sel_j(*a, **k):
    return J['selecao'](*a, **k)


def arquivo():
    return (f'<div><p class="fl-rot" id="as-arq-r">Contrato assinado</p><div class="fl-arq" role="group" aria-labelledby="as-arq-r"><span class="fl-ic" aria-hidden="true">{ico("doc")}</span>'
            f'<div><strong>contrato-C-2026-031-assinado.pdf</strong><small>PDF · 318 KB · escolhido agora</small></div>'
            f'<button class="btn btn-fantasma" type="button">{ico("trocar")}Trocar</button></div>'
            f'<p class="ajuda" style="font-size:12px;margin-top:6px">PDF ou foto do contrato assinado. Fica na aba Documentos do contrato e do caso.</p></div>')


def caso_novo_campos(pref='as'):
    return (f'<div class="fl-novo">'
            + campo_j(f'{pref}-nome', 'Nome do caso', CASO, 'c3', ajuda='Sugerido pelo nome do cliente e o objeto do contrato. Troque pelo que a equipe usa.')
            + sel_j(f'{pref}-area', 'Área', ['Previdenciário', 'Trabalhista', 'Cível', 'Consumidor', 'Família', 'Saúde', 'Tributário', 'Outra'], 'Previdenciário', 'c3', vazio='')
            + sel_j(f'{pref}-resp', 'Responsável', ['Larissa Costa', 'Marina Ribeiro (você)', 'Felipe Matos'], 'Larissa Costa', 'c3', vazio='', ajuda='A advogada do contrato.')
            + sel_j(f'{pref}-papel', 'Antônia no caso', ['Autora', 'Ré', 'Interessada'], 'Autora', 'c3', vazio='')
            + f'<p class="fl-fixo">{ico("seta")}<span>Começa na etapa <b>1. Preparação</b>. Número, vara e parte contrária entram na ficha do caso, quando houver.</span></p></div>')


def fs_caso(modo='novo', pref='as'):
    """modo: novo, juntar, sem"""
    def op(v, rot, sub, marc):
        c = ' checked' if marc else ''
        cls = ' fl-aberta' if marc and v == 'novo' else ''
        return f'<label class="opcao{cls}"><input class="marcar" type="radio" name="{pref}-caso" value="{v}"{c}><span>{rot}<small>{sub}</small></span></label>'
    return (f'<fieldset class="fl-caso"><legend>O caso em Jurídico<small>A assinatura leva Antônia direto para Casos e processos.</small></legend>'
            + op('novo', 'Abrir um caso novo', 'Já preenchido com o que está no contrato. Tudo se muda depois, na ficha do caso.', modo == 'novo')
            + (caso_novo_campos(pref) if modo == 'novo' else '')
            + op('juntar', 'Juntar a um caso que já existe', 'Quando o processo já está no T3jus com outro cliente.', modo == 'juntar')
            + op('sem', 'Este contrato não tem caso', 'Consultoria ou serviço sem processo. Dá para abrir o caso depois, pela ficha.', modo == 'sem')
            + '</fieldset>')


def j_assinar(abrir=False, erro=False, variante='novo'):
    """variante: novo (abre caso), ja (contrato já ligado a um caso), sem-juridico (quem assina não tem Jurídico)"""
    falha = (aviso('urgencia', 'A assinatura não foi registrada e o caso não foi aberto.',
                   'Os dois andam juntos: ou ficam os dois, ou nenhum. O arquivo assinado já está guardado e o que você escolheu continua aqui. Tente de novo; se continuar, mande o código PTL-7A31-0741 ao suporte.')
             if erro else '')
    corpo = falha + campo('as-data', 'Data da assinatura', '18/11/2026', 'c3', im='numeric', ajuda='dd/mm/aaaa. Hoje ou antes, desde 16/11, quando o contrato foi criado.', foco=not erro) + arquivo()
    if variante == 'novo':
        corpo += fs_caso('novo')
        depois = f'<p class="fl-depois">{ico("seta")}<span>Ao registrar, o contrato fica ativo, a entrada de R$ 1.500,00 vai para o Financeiro e <b>você vai para a ficha do caso</b>, em Jurídico › Casos e processos.</span></p>'
        b = f'{ico("balanca")}Registrar e abrir o caso'
    elif variante == 'ja':
        corpo += (f'<div class="fl-caso" role="group" aria-labelledby="as-ja-t"><p id="as-ja-t" style="font-family:var(--serifa);font-size:19px;font-weight:600;color:var(--vinho)">O caso já existe</p>'
                  f'<div class="fl-ja"><dl><dt>Caso</dt><dd>{CASO}</dd><dt>Etapa</dt><dd>1. Preparação, desde 12/11</dd><dt>Responsável</dt><dd>Larissa Costa</dd>'
                  f'<dt>Ligado</dt><dd>a este contrato em 12/11, por Larissa</dd></dl></div>'
                  f'<p class="ajuda" style="margin:0">Nenhum caso novo é aberto. Se o contrato for de outro caso, mude a ligação na ficha do caso.</p></div>')
        depois = f'<p class="fl-depois">{ico("seta")}<span>Ao registrar, o contrato fica ativo, a entrada vai para o Financeiro e <b>você vai para a ficha do caso</b>.</span></p>'
        b = f'{ico("balanca")}Registrar e ir para o caso'
    else:  # sem-juridico
        corpo += (f'<div class="fl-caso" role="group" aria-labelledby="as-sj-t"><p id="as-sj-t" style="font-family:var(--serifa);font-size:19px;font-weight:600;color:var(--vinho)">O caso abre em Jurídico</p>'
                  f'<div class="fl-ja"><dl><dt>Caso</dt><dd>{CASO}</dd><dt>Área</dt><dd>Previdenciário</dd><dt>Responsável</dt><dd>Larissa Costa, a advogada do contrato</dd>'
                  f'<dt>Etapa</dt><dd>1. Preparação</dd></dl></div>'
                  f'<p class="ajuda" style="margin:0">Você não tem a área Jurídico: o caso abre com estes dados, e Larissa recebe o aviso no sino para conferir.</p></div>')
        depois = f'<p class="fl-depois">{ico("seta")}<span>Ao registrar, o contrato fica ativo, a entrada vai para o Financeiro e o caso abre em Jurídico. <b>Você continua nesta ficha.</b></span></p>'
        b = f'{ico("check")}Registrar assinatura'
    corpo += depois
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{b}</button>'
    return janela('janela-assinar', f'{C_NUM} · Antônia Ferreira Prado', 'Registrar assinatura',
                  'Anexe o contrato assinado e diga a data. Fica no histórico, com seu nome e a hora.', corpo, pe, abrir=abrir or erro)


def j_caso(abrir=False):
    corpo = (f'<div class="fl-ja"><dl><dt>Contrato</dt><dd>{C_NUM}, assinado em 11/11</dd><dt>Honorários</dt><dd>{HON}</dd></dl></div>'
             + fs_caso('novo', pref='ac').replace('<fieldset class="fl-caso"><legend>O caso em Jurídico<small>A assinatura leva Antônia direto para Casos e processos.</small></legend>',
                                                  '<fieldset class="fl-caso"><legend>O caso<small>Preenchido com o que está no contrato.</small></legend>')
             .replace('<label class="opcao"><input class="marcar" type="radio" name="ac-caso" value="sem"><span>Este contrato não tem caso<small>Consultoria ou serviço sem processo. Dá para abrir o caso depois, pela ficha.</small></span></label>', '')
             + f'<p class="fl-depois">{ico("seta")}<span>Ao abrir, <b>você vai para a ficha do caso</b>, em Jurídico › Casos e processos.</span></p>')
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit" data-foco>{ico("balanca")}Abrir o caso</button>'
    return janela('janela-caso', 'Antônia Ferreira Prado', 'Abrir o caso', 'O caso fica em Jurídico › Casos e processos, ligado ao contrato.', corpo, pe, abrir=abrir)


# ---------------------------------------------------------------- a ficha, por momento
def ficha_fl(dir_html, aba, corpo, n, areas=('comercial', 'contratos', 'juridico'), extra='', est='sem-proposta'):
    falta = [a for a in ('comercial', 'contratos', 'juridico') if a not in areas]
    pe = pe_sem_area(falta) if falta else ''
    pe = f'<section class="folha" aria-label="Áreas que não estão liberadas" style="overflow:hidden">{pe}</section>' if pe else ''
    return f'<div class="cl">{ficha_cab(dict(ANT, doc=""), dir_html)}{abas_fl(n, areas, est)}{corpo}{pe}</div>{extra}'


def com_lateral(principal, lateral):
    return grade_ficha(principal, lateral)


N0 = dict(atendimentos=3, propostas=0, contratos=0, casos=0)
N1 = dict(atendimentos=3, propostas=2, contratos=0, casos=0)
N2 = dict(atendimentos=4, propostas=2, contratos=1, casos=0)
N3 = dict(atendimentos=4, propostas=2, contratos=1, casos=1)

D_SEM = dir_passo('Fazer a proposta', '<b>Ainda não há proposta.</b><br>Primeira reunião em 28/10, com Marina.', b_gerar_proposta(), 0)
D_ENV = dir_passo('Resposta da proposta', f'<b>{P_NUM} enviada em 10/11.</b><br>Retorno marcado para 20/11, com Diego.',
                  B_RESPOSTA + f'<a class="btn btn-sec" href="{U}proposta-enviada">{ico("olho")}Ver a proposta</a>', 0, contato=CONTATO_FUT)
D_ACE = dir_passo('Gerar o contrato', f'<b>{P_NUM} aceita em 14/11.</b><br>As condições e a qualificação já entram no contrato.', B_CONTRATO, 1, contato=CONTATO_FUT)
D_ELA = dir_passo('Colher a assinatura', f'<b>{C_NUM} em elaboração desde 16/11.</b><br>Ao registrar a assinatura, o caso abre em Jurídico.', B_ASSINAR, 2, contato=CONTATO_FUT)
D_SCA = dir_passo('Abrir o caso', f'<b>{C_NUM} assinado em 11/11.</b><br>Falta abrir o caso em Jurídico.', B_ABRIR, 3, contato=None)
D_CAS = dir_passo(CASO, '<b>Preparação, 1 de 8 · com Larissa Costa.</b><br>Desde 18/11. Nenhum prazo aberto.', B_VER_CASO, 4, contato=None, sobre='Caso em andamento', grande_px=26)

LAT_AT = explica_hist()


def atendimentos(botao, n=N0):
    return com_lateral(historico_fl(botao), LAT_AT)


# ---------------------------------------------------------------- Lista de Clientes com "Próximo passo"
PASSO_LISTA = {
    'AP': ('t', 'Resposta da proposta', 'P-2026-014 · retorno 20/11'),
    'BL': ('t', 'Caso em andamento', 'Sentença · 5 de 8'),
    'CV': ('t', 'Caso em andamento', 'Petição inicial · 2 de 8'),
    'DM': ('b', '', ''),
    'EN': ('b', '', ''),
    'FB': ('t', 'Colher a assinatura', 'C-2026-038 em elaboração'),
    'GT': ('t', 'Caso em andamento', 'Cumprimento · 7 de 8'),
    'HC': ('t', 'Gerar o contrato', 'P-2026-012 aceita em 12/11'),
    'IC': ('b', '', ''),
}


def passo_l(ini, nome, comercial=True):
    t, a, b = PASSO_LISTA[ini]
    if t == 'b':
        if comercial:
            return (f'<div class="fl-passo-l"><span>Sem proposta</span><a class="btn btn-sec btn-compacto" href="{U}propostas-vazio" '
                    f'aria-label="Gerar proposta para {H(nome)}">{ico("maleta", "ico ico-s")}Gerar proposta</a></div>')
        return '<div class="fl-passo-l"><span>Sem proposta<small>Na área Comercial</small></span></div>'
    return f'<div class="fl-passo-l"><span>{a}<small>{b}</small></span></div>'


def lista_fl(itens, comercial=True):
    h = lista(itens, comercial=comercial)
    # coluna nova antes de "Situação": cabeçalho, larguras, células e cartões
    h = h.replace('<th scope="col">Situação</th>', '<th scope="col">Próximo passo</th><th scope="col">Situação</th>')
    if comercial:
        h = h.replace('<col style="width:26%"><col style="width:24%"><col style="width:15%"><col style="width:22%"><col style="width:13%">',
                      '<col style="width:22%"><col style="width:19%"><col style="width:12%"><col style="width:19%"><col style="width:17%"><col style="width:11%">')
    else:
        h = h.replace('<col style="width:42%"><col style="width:40%"><col style="width:18%">',
                      '<col style="width:34%"><col style="width:32%"><col style="width:20%"><col style="width:14%">')
    for c in itens:
        ini, nome = c[0], c[1]
        sit_td = '<td>' + selo_sit(c[9]) + '</td></tr>'
        marca_ = f'<small>{TIPO[c[2]]}</small></div></div></td>'
        i = h.index(f'>{ini}</span>')
        j = h.index(sit_td, i)
        h = h[:j] + f'<td>{passo_l(ini, nome, comercial)}</td>' + h[j:]
        # cartão
        k = h.index(f'aria-hidden="true">{ini}</span><div><a class="c-nome"')
        fim = h.index('</li>', k)
        t, a, b = PASSO_LISTA[ini]
        if t == 'b' and comercial:
            extra = (f'<div class="fl-c-acao"><a class="btn btn-sec" href="{U}propostas-vazio" aria-label="Gerar proposta para {H(nome)}">'
                     f'{ico("maleta")}Gerar proposta</a></div>')
        else:
            extra = f'<p style="font-size:13px;margin:0"><span style="color:var(--texto-2)">Próximo passo:</span> {a or "Sem proposta"}{(" · " + b) if b else ""}</p>'
        h = h[:fim] + extra + h[fim:]
    return h


# ---------------------------------------------------------------- ficha do caso recém-aberto (Jurídico, aprovada, com os dados do contrato)
def cab_caso_novo():
    NE, NOME_E = J['NE'], J['NOME_E']
    segs = ''.join(f'<li class="{"agora" if i == 0 else "falta"}"><span class="b" aria-hidden="true"></span>'
                   f'<span class="sr">{i + 1}. {NOME_E[i]}{": atual" if i == 0 else ""}</span></li>' for i in range(NE))
    dir_ = (f'<section class="dir campo-ambar" aria-labelledby="t-etapa"><p class="sobretitulo" id="t-etapa">Etapa do caso</p>'
            f'<p class="grande">1 de {NE}<small>{NOME_E[0]}</small></p><ol class="etapas ju-et8">{segs}</ol>'
            f'<p class="ju-agora">Desde hoje, 18/11. Próxima: <b>{NOME_E[1]}</b>.</p><button class="btn btn-pri" type="button">{ico("seta")}Mudar etapa</button></section>')
    return (f'<div class="ficha-cab"><div class="esq campo-vinho">{ico("balanca", "ico estatua")}'
            f'<a class="voltar" href="#">{ico("esq", "ico ico-s")}Casos e processos</a>'
            f'<div class="ident"><div><p class="sobretitulo">Caso · previdenciário</p><h1>{CASO}</h1>'
            f'<p class="meta"><span class="selo selo-ativo">Em andamento</span><span>Sem número ainda</span><span class="sep" aria-hidden="true"></span><span>aberto hoje</span></p></div></div></div>{dir_}</div>')


def ficha_caso_novo():
    f = J['folha']
    d = [('Área', 'Previdenciário'), ('Parte contrária', '<span class="falta">Ainda não</span>'), ('Responsável', 'Larissa Costa'),
         ('Número', '<span class="falta">Ainda não</span>'), ('Tribunal', '<span class="falta">Ainda não</span>'), ('Aberto por', 'Marina Ribeiro, na assinatura')]
    dl = ''.join(f'<div><dt>{k}</dt><dd>{v}</dd></div>' for k, v in d)
    dados = f('t-dados', 'Dados do processo', 'Nome, área e responsável vieram da assinatura. O resto entra quando houver.', f'<dl class="dados-ficha ju-dl">{dl}</dl>',
              acoes=f'<a class="btn btn-sec" href="#">{ico("lapis")}Editar</a>')
    cli = ('<ul class="lista ju-clientes"><li><span class="av-p forte" aria-hidden="true">AP</span><div><a class="n" href="' + U + 'com-caso">Antônia Ferreira Prado</a><small>Autora · viúva</small></div>'
           f'<a class="tel" href="#">{ico("whats")}<span class="num">(11) 99123-4567</span></a><div class="ju-hon"><b>30% do êxito</b><small>Contrato {C_NUM} · entrada de R$ 1.500,00</small></div></li></ul>')
    clientes = f('t-cli', 'Clientes do caso', '1 cliente', cli, acoes=f'<a class="btn btn-sec" href="#">{ico("pessoa-mais")}Adicionar cliente</a>')
    pt = (f'<div class="ju-sub"><h3>Prazos</h3><button class="btn btn-fantasma btn-compacto" type="button">{ico("mais")}Novo prazo</button></div>'
          f'<p class="ju-nota" style="padding-top:6px">{ico("relogio")}<span>Nenhum prazo ainda.</span></p>'
          f'<div class="ju-sub"><h3>Tarefas</h3><button class="btn btn-fantasma btn-compacto" type="button">{ico("mais")}Nova tarefa</button></div>'
          f'<p class="ju-nota" style="padding-top:6px">{ico("check")}<span>Nenhuma tarefa ainda.</span></p>')
    prazos = f('t-pt', 'Prazos e tarefas', 'Caso aberto agora', pt)
    ctr = (f'<ul class="ju-ctr"><li>{ico("pena")}<span><b>{C_NUM} · Antônia Ferreira Prado</b><small>Assinado hoje, 18/11 · {HON}</small></span></li></ul>'
           f'<p class="ju-nota">{ico("seta")}<span>O êxito sai deste contrato quando o caso chegar ao fim.</span></p>')
    contr = f('t-ctr', 'Contratos ligados', '', ctr, peq=True)
    av = (f'<div class="ju-aviso-cli"><span class="lig">{ico("whats")}Ligado para Joana Prado, o contato principal</span>'
          f'<p>A cada mudança de etapa, ela recebe um aviso simples pelo WhatsApp do escritório. Abrir o caso não manda aviso.</p></div>')
    aviso_ = f('t-avc', 'Aviso ao cliente', '', av, peq=True)
    return (f'<div class="ju">{cab_caso_novo()}<div class="ju-grade ju-ficha-grade"><div class="ju-col">{dados}{clientes}{prazos}</div>'
            f'<aside class="ju-col" aria-label="Contexto do caso">{contr}{aviso_}</aside></div></div>')


# ---------------------------------------------------------------- estados
T = ''
FT = dict(atual='clientes', trilha='Clientes|Antônia Ferreira Prado', titulo='Antônia Ferreira Prado')
B = dict(atual='clientes', trilha='Clientes', titulo='Clientes')
REG = j_registrar()


def LST(miolo, comercial=True):
    return f'<div class="cl">{cab_lista(comercial)}{miolo}</div>'


def add(est, corpo, rotulo, **kw):
    global T
    T += tpl(est, corpo, **kw)
    ESTADOS.append((est, rotulo))


ESTADOS = []
# 1. Lista
add('lista', LST(folha_lista(lista_fl(ATIVOS), cont=f'<b>{len(ATIVOS)} clientes ativos</b> · {len(VENCIDOS)} com o próximo contato vencido · 3 sem proposta')),
    'Lista: “Gerar proposta” na linha', **B)
add('lista-sem-comercial', f'<div class="cl">{cab_lista(False)}<section class="folha" aria-labelledby="t-lista" style="overflow:hidden"><h2 id="t-lista" class="sr">Lista de clientes</h2>'
    f'{ferramentas(comercial=False)}<p class="cl-cont" role="status"><b>{len(ATIVOS)} clientes ativos</b></p>{lista_fl(ATIVOS, comercial=False)}{PE_SEM_COM}</section></div>',
    'Lista sem Comercial (Larissa)', quem='juridico', **B)
# 2. Os momentos do cliente
add('sem-proposta', ficha_fl(D_SEM, 'atendimentos', atendimentos(b_gerar_proposta()), N0) + REG + j_caso(),
    'Sem proposta: Gerar proposta', aba='atendimentos', **FT)
add('propostas-vazio', ficha_fl(D_SEM, 'propostas', aba_propostas('vazio'), N0) + REG,
    'Aba Propostas vazia', aba='propostas', **FT)
add('proposta-enviada', ficha_fl(D_ENV, 'propostas', aba_propostas('enviada'), N1) + REG,
    'Proposta enviada: Registrar resposta', aba='propostas', **FT)
add('proposta-aceita', ficha_fl(D_ACE, 'contratos', aba_contratos('vazio-aceita'), dict(N1, contratos=0)) + REG,
    'Proposta aceita: Gerar contrato (aba Contratos vazia)', aba='contratos', **FT)
add('contrato-elaboracao', ficha_fl(D_ELA, 'atendimentos', atendimentos(B_ASSINAR), N2) + REG + j_assinar(),
    'Contrato em elaboração: Registrar assinatura', aba='atendimentos', **FT)
add('contrato-aba', ficha_fl(D_ELA, 'contratos', aba_contratos('elaboracao'), N2) + REG + j_assinar(),
    'Aba Contratos com o contrato', aba='contratos', **FT)
add('assinar', ficha_fl(D_ELA, 'contratos', aba_contratos('elaboracao'), N2) + REG + j_assinar(abrir=True),
    'Janela: assinar e abrir o caso', aba='contratos', **FT)
add('assinar-erro', ficha_fl(D_ELA, 'contratos', aba_contratos('elaboracao'), N2) + REG + j_assinar(erro=True),
    'Janela: não registrou', aba='contratos', **FT)
add('assinar-com-caso', ficha_fl(D_ELA, 'contratos', aba_contratos('elaboracao'), N2) + REG + j_assinar(abrir=True, variante='ja'),
    'Janela: contrato já tem caso', aba='contratos', **FT)
add('caso-aberto', ficha_caso_novo() + toast('Assinatura registrada e caso aberto.',
    f'{C_NUM} está ativo e a entrada de R$ 1.500,00 foi para o Financeiro. Antônia agora está em Casos e processos.'),
    'Depois de assinar: a ficha do caso novo', area='juridico', secao='Casos e processos', atual='juridico',
    trilha=f'Jurídico|Casos e processos|{CASO}', titulo=CASO)
add('com-caso', ficha_fl(D_CAS, 'casos', aba_casos('um'), N3) + REG,
    'Tudo pronto: Ver o caso (aba Casos)', aba='casos', **FT)
add('ficha-ligada', ficha_fl(D_CAS, 'ficha', com_lateral(dados_ant() + contatos_ant(),
    proc_ant() + resumo(f'{P_NUM} · virou contrato', f'{C_NUM} · ativo desde 18/11', f'{CASO} · Preparação') + origem_ant() + situacao_folha()), N3) + REG + j_inativar(),
    'Aba Ficha: “No escritório” no lugar do quadro reservado', aba='ficha', **FT)
add('assinado-sem-caso', ficha_fl(D_SCA, 'casos', aba_casos('vazio-assinado'), dict(N2, casos=0)) + REG + j_caso(),
    'Contrato assinado sem caso: Abrir o caso', aba='casos', **FT)
add('abrir-caso', ficha_fl(D_SCA, 'casos', aba_casos('vazio-assinado'), dict(N2, casos=0)) + REG + j_caso(abrir=True),
    'Janela: abrir o caso', aba='casos', **FT)
# 3. Quem não tem a área
D_ELA_B = dir_passo('Colher a assinatura', f'<b>{C_NUM} em elaboração desde 16/11.</b><br>Ao registrar a assinatura, o caso abre em Jurídico.', B_ASSINAR, 2, contato='nao')
add('assinar-sem-juridico', ficha_fl(D_ELA_B, 'contratos', aba_contratos('elaboracao'), N2, areas=('contratos',)) + j_assinar(abrir=True, variante='sem-juridico'),
    'Bianca (sem Jurídico): a janela', quem='bianca', aba='contratos', **FT)
D_SJ = dir_passo('Caso aberto em Jurídico', f'<b>{CASO}, com Larissa Costa.</b><br>O acompanhamento agora é do Jurídico.',
                 '', 4, contato='nao', sobre='Próximo passo', grande_px=26).replace('</p><div class="fl-contato">', '</p>')
add('assinado-sem-juridico', ficha_fl(D_SJ, 'contratos', aba_contratos('ativo', caso_link=False), N3, areas=('contratos',))
    + toast('Assinatura registrada.', f'{C_NUM} está ativo. O caso {CASO} foi aberto em Jurídico, com Larissa Costa, que recebeu o aviso no sino.'),
    'Bianca: depois de assinar', quem='bianca', aba='contratos', **FT)
D_LAR = dir_passo(CASO, '<b>Preparação, 1 de 8 · com você.</b><br>Desde 18/11. Nenhum prazo aberto.', B_VER_CASO, 4, contato='nao', sobre='Caso em andamento', grande_px=26)
add('ficha-juridico', ficha_fl(D_LAR, 'casos', aba_casos('um'), N3, areas=('juridico',)),
    'Larissa (só Jurídico): abas Ficha e Casos', quem='juridico', aba='casos', **FT)
D_DIE = dir_passo('Colher a assinatura',
                  f'<b>{C_NUM} em elaboração desde 16/11.</b><br>Quem registra a assinatura tem a área Contratos: Marina e Felipe.',
                  B_REG_PRI, 2, contato=CONTATO_FUT, contato_botao=False)
add('ficha-comercial', ficha_fl(D_DIE, 'propostas', aba_propostas('contrato'), N2, areas=('comercial',)) + REG,
    'Diego (sem Contratos): o passo não é dele', quem='diego', aba='propostas', **FT)
# 4. Carregando e erro das abas novas
add('aba-carregando', ficha_fl(D_ENV, 'propostas', aba_carregando('Propostas'), N1) + REG, 'Aba carregando', aba='propostas', **FT)
add('aba-erro', ficha_fl(D_CAS, 'casos', aba_erro('Casos'), N3) + REG, 'Aba com erro', aba='casos', **FT)

GRUPOS = [('Lista de Clientes', ['lista', 'lista-sem-comercial']),
          ('O botão do próximo passo', ['sem-proposta', 'propostas-vazio', 'proposta-enviada', 'proposta-aceita', 'contrato-elaboracao', 'contrato-aba', 'com-caso', 'ficha-ligada']),
          ('Assinatura leva ao caso', ['assinar', 'assinar-erro', 'assinar-com-caso', 'caso-aberto', 'assinado-sem-caso', 'abrir-caso']),
          ('Quem não tem a área', ['assinar-sem-juridico', 'assinado-sem-juridico', 'ficha-juridico', 'ficha-comercial']),
          ('Carregando e erro', ['aba-carregando', 'aba-erro'])]
ROT = dict(ESTADOS)
assert sorted(sum((g[1] for g in GRUPOS), [])) == sorted(ROT), set(ROT) ^ set(sum((g[1] for g in GRUPOS), []))
nav = ''.join(f'<p>{g}</p>' + ''.join(f'<a href="?estado={e}">{ROT[e]}</a>' for e in es) for g, es in GRUPOS)
NAV = (f'<details id="fl-estados"><summary>{ico("menu")}<span class="sr">Estados desenhados: </span><b>Estados</b></summary>'
       f'<nav class="fl-lista" aria-label="Estados desenhados">{nav}</nav></details>')

out = pagina('Antônia Ferreira Prado', 'Ficha do cliente ligada a propostas, contratos e casos, com o botão do próximo passo e a assinatura que leva ao caso.',
             '{"estado":"sem-proposta","atual":"clientes"}', '', T, J['BARRAS'])
out = out.replace('</style>', CSS_CL + '\n' + J['CSS_JU'] + '\n' + CSS_FL + '\n</style>', 1)
out = out.replace('<script>\n(function(){', NAV + '\n<script>\n(function(){', 1)
open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(out)
import json
json.dump([{'nome': e, 'url': f'index.html?estado={e}', 'rotulo': r} for e, r in ESTADOS],
          open(os.path.join(AQUI, 'casos.json'), 'w'), ensure_ascii=False, indent=1)
print('ficha-ligada ok', len(ESTADOS), 'estados,', len(out) // 1024, 'KB')
