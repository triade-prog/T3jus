# Portal · Início por áreas (pedido da Carol: "um dashboard por Áreas: Comercial, Contratos,
# Financeiro, Jurídico"). Parte do Início aprovado mais recente (F1.14, portal-clientes-pendencias):
# lê as peças do pendencias.py (hero, item de contato, bloco, CSS pd-, marca de hoje), que lê as
# do clientes.py, que usa o comum.py. Os três são cópias sem mudança. Peças novas com prefixo ar-.
# Uso: python3 inicio_areas.py <pasta-saida>
import sys, os, re, html

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'

# Peças aprovadas: executa o pendencias.py até antes dos estados dele (nada é gravado).
_src = open(os.path.join(AQUI, 'pendencias.py'), encoding='utf-8').read()
_src = _src[:_src.index('# Estados do Início')]
NS = {'__name__': 'pendencias_aprovado', '__file__': os.path.join(AQUI, 'pendencias.py')}
_argv = sys.argv
sys.argv = [sys.argv[0], SAIDA]
exec(compile(_src, 'pendencias.py', 'exec'), NS)
sys.argv = _argv
for k, v in NS.items():
    if not k.startswith('__') and k not in ('T', 'SAIDA', 'AQUI', 'NS'):
        globals()[k] = v
H = html.escape
ARQ = 'inicio.html?estado='
AP = '../'  # as telas aprovadas ficam ao lado desta pasta
L_COM = AP + 'portal-comercial-contratos/comercial.html?estado=atendimentos'
L_PROP = AP + 'portal-comercial-contratos/comercial.html?estado=propostas'
L_CT = AP + 'portal-comercial-contratos/contratos.html?estado=contratos'
L_HON = AP + 'portal-comercial-contratos/contratos.html?estado=honorarios'
L_CTR = AP + 'portal-comercial-contratos/contratos.html?estado=contrato'
L_PROC = AP + 'portal-comercial-contratos/contratos.html?estado=procuracoes'
L_FIN = AP + 'portal-financeiro/financeiro.html?estado=resumo'
L_REC = AP + 'portal-financeiro/financeiro.html?estado=receber'
L_PARC = AP + 'portal-financeiro/financeiro.html?estado=contrato'
L_REP = AP + 'portal-financeiro/financeiro.html?estado=repasses'
L_REP1 = AP + 'portal-financeiro/financeiro.html?estado=repasse'
L_PRZ = AP + 'portal-juridico/juridico.html?estado=prazos'
L_TAR = AP + 'portal-juridico/juridico.html?estado=tarefas'
L_CASO = AP + 'portal-juridico/juridico.html?estado=ficha'
L_AG = AP + 'portal-agenda-conversas/agenda.html?estado=ag-dia'
L_CV = AP + 'portal-agenda-conversas/conversas.html?estado=cv-fila'
L_CVR = AP + 'portal-agenda-conversas/conversas.html?estado=cv-conversa'
L_CLI = AP + 'portal-clientes/clientes.html'

# ---------------------------------------------------------------- CSS novo (prefixo ar-)
CSS_AR = r"""
/* ==========================================================================
   Portal · Início por áreas. Prefixo ar-. Só tokens e peças já aprovados.
   ========================================================================== */
.ar-faixa{display:grid;gap:14px}
.ar-faixa-cab{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap}
.ar-faixa-cab h2{font-size:26px;line-height:1.15;color:var(--vinho)}
.ar-faixa-cab .sub{font-size:13px;color:var(--texto-2);margin-top:2px}
.ar-faixa-cab .pd-chips{padding:0}
.ar-cartoes{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(var(--n,4),minmax(0,1fr));gap:16px}
.ar-cartao{position:relative;display:grid;gap:12px;align-content:start;height:100%;padding:16px 18px 16px;border-radius:var(--raio-g);background:var(--papel);border:1px solid var(--borda-folha);box-shadow:var(--sombra);color:var(--texto);text-decoration:none}
.ar-cartao:hover{border-color:var(--vinho-4)}
.ar-cartao:hover .ar-c-nome{text-decoration:underline}
.ar-cartao:focus-visible{outline:3px solid var(--vinho-3);outline-offset:2px}
.ar-c-cab{display:flex;align-items:center;gap:8px}
.ar-c-cab .ico{color:var(--vinho-4);width:20px;height:20px}
.ar-c-nome{font-family:var(--serifa);font-size:20px;font-weight:600;color:var(--vinho);line-height:1.1}
.ar-c-cab .ar-ir{margin-left:auto;width:16px;height:16px}
.ar-c-num{display:flex;align-items:center;gap:12px}
.ar-c-num .disco{--d:44px;--f:22px}
.ar-c-num .disco.pd-venc{--c:var(--vinho-3);color:var(--papel)}
.ar-c-num .disco.prox{}
.ar-c-num .disco.hoje{--c:var(--ambar);color:var(--vinho-escuro)}
.ar-c-num span.ar-t{font-size:13px;line-height:1.3;color:var(--texto-2)}
.ar-c-num span.ar-t b{display:block;font-size:14px;font-weight:500;color:var(--texto)}
.ar-c-2{display:flex;align-items:flex-start;gap:6px;padding-top:10px;border-top:1px solid var(--divisor);font-size:12px;line-height:1.4;color:var(--texto-2)}
.ar-c-2 .ico{width:15px;height:15px;color:var(--vinho-4);flex:none;margin-top:1px}
.ar-c-2 b{font-weight:500;color:var(--texto)}
.ar-c-2.ar-terc{background:var(--ambar-3);color:var(--vinho-escuro);border-top:0;margin:0 -8px -6px;padding:7px 8px;border-radius:8px}
.ar-c-2.ar-terc .ico{color:var(--vinho-escuro)}
.ar-c-2.ar-terc b{color:var(--vinho-escuro)}
.disco.ar-ok{--c:transparent;box-shadow:inset 0 0 0 1.5px var(--vinho-4);color:var(--vinho-2)}
.disco.ar-ok .ico{width:20px;height:20px}
.disco.ar-erro{--c:var(--vinho-3);color:var(--papel)}
.disco.ar-erro .ico{width:20px;height:20px}

/* Blocos de área: o mesmo desenho do bloco Contatos de hoje aprovado */
.ar-rot{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:var(--vinho-2);margin-bottom:2px}
.ar-bloco .folha-cab h2 .ico{color:var(--vinho-4)}
.ar-bloco .folha-cab>.ver{white-space:nowrap;flex:none}
.ar-bloco .prazo{grid-template-columns:64px minmax(0,1fr) auto}
.ar-bloco .prazo .lado{min-width:120px}
.ar-bloco .prazo>div>a{display:inline-block;padding:12px 0 11px;margin:-12px 0 -11px}
.ar-bloco .pd-contatos .prazo .lado{min-width:190px}
.ar-valor{font-family:var(--serifa);font-size:18px;font-weight:600;color:var(--vinho);font-variant-numeric:lining-nums tabular-nums;white-space:nowrap}
.ar-terc-bloco .ar-valor{color:var(--vinho-escuro)}
.ar-bloco .pd-ct{flex-wrap:nowrap;align-items:flex-start}
.ar-bloco .pd-ct .ico{flex:none;margin-top:2px}
.ar-tipo{font-size:11px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--vinho-2);margin-right:6px}
.ar-esp{display:inline-flex;align-items:flex-start;gap:6px;margin-top:6px;padding:5px 10px;border-radius:8px;background:var(--ambar-3);color:var(--tinta);font-size:12px;line-height:1.4}
.ar-esp .ico{width:14px;height:14px;color:var(--vinho);flex:none;margin-top:2px}
.ar-pe{display:flex;align-items:flex-start;gap:10px;padding:12px 24px 16px;border-top:1px solid var(--divisor);font-size:13px;line-height:1.5;color:var(--texto-2)}
.ar-pe>.ico{color:var(--vinho-4);flex:none;margin-top:2px;width:16px;height:16px}
.ar-pe b{font-weight:500;color:var(--texto)}
.ar-pe a{color:var(--vinho);font-weight:500}
.ar-pe .ar-pe-ir{margin-left:auto;white-space:nowrap}
.ar-fin{display:grid;gap:12px}
.fi-terc-cab{display:flex;align-items:center;gap:10px;padding:10px 24px;background:var(--ambar-3);color:var(--vinho-escuro);font-size:12px;font-weight:500;letter-spacing:.14em;text-transform:uppercase}
.fi-terc-cab .ico{width:18px;height:18px}
.folha.fi-terc{border-color:var(--ambar-2);overflow:hidden}
.ar-terc-bloco .folha-cab h3{font-family:var(--serifa);font-size:20px;font-weight:500;line-height:1.2;color:var(--vinho);display:flex;align-items:center;gap:10px}
.ar-terc-bloco .folha-cab h3 .ico{color:var(--vinho-4)}
.ar-emdia{display:flex;align-items:center;gap:14px;padding:4px 24px 18px}
.ar-emdia .disco{--d:44px}
.ar-emdia p{font-size:14px;line-height:1.45}
.ar-emdia p b{display:block;font-weight:500;color:var(--texto)}
.ar-emdia p span{font-size:13px;color:var(--texto-2)}
.ar-tudo{display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:var(--raio-g);background:var(--papel);border:1px solid var(--borda-folha);box-shadow:inset 5px 0 0 var(--vinho-4);font-size:14px}
.ar-tudo .ico{color:var(--vinho-2);flex:none}
.ar-tudo b{font-weight:500;color:var(--vinho)}
.ar-esq{display:grid;grid-template-columns:64px minmax(0,1fr) 110px;gap:16px;align-items:center;padding:14px 24px;border-top:1px solid var(--divisor)}
.ar-esq:first-child{border-top:0}
.ar-bloco .estado{border:0;background:transparent;padding:24px 24px 28px}
.ar-comum{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px;align-items:start}
.ar-aside-rot{display:flex;align-items:center;gap:10px;font-size:11px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:var(--vinho-2);margin:0 0 -10px}
.ar-aside-rot::after{content:"";flex:1;height:1px;background:var(--borda-folha)}
.ar-sem-area{display:flex;align-items:flex-start;gap:12px;padding:14px 18px;border-radius:var(--raio-g);background:var(--sal-2);font-size:14px;line-height:1.5}
.ar-sem-area .ico{color:var(--vinho-4);flex:none;margin-top:2px}
.ar-sem-area b{font-weight:500}
.conversas .c-pe .btn{min-height:44px}

@media (max-width:760px){
  .ar-faixa-cab h2{font-size:22px}
  .ar-faixa-cab .pd-chips{width:100%}
  .ar-cartoes{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .ar-cartoes.ar-n1{grid-template-columns:1fr}
  .ar-cartao{padding:12px 12px 12px;gap:10px}
  .ar-c-nome{font-size:18px}
  .ar-c-num{gap:8px;align-items:flex-start}
  .ar-c-num .disco{--d:36px!important;--f:18px!important}
  .ar-c-num span.ar-t{font-size:12px}
  .ar-c-num span.ar-t b{font-size:13px}
  .ar-c-2{font-size:12px}
  .ar-bloco .prazo{grid-template-columns:52px minmax(0,1fr)}
  .ar-bloco .prazo .lado{min-width:0!important;flex-direction:row;flex-wrap:wrap;align-items:center}
  .ar-bloco .pd-contatos .prazo .lado .btn{flex:1 1 100%;min-height:44px}
  .ar-pe{padding:12px 16px 12px;display:grid;grid-template-columns:16px minmax(0,1fr);gap:4px 10px}
  .ar-pe .ar-pe-ir{grid-column:2;justify-self:start;margin-left:-6px}
  .fi-terc-cab{padding:10px 16px}
  .ar-emdia{padding:4px 16px 16px}
  .ar-esq{grid-template-columns:52px minmax(0,1fr);padding:12px 16px}
  .ar-esq .so-pc-i{display:none}
  .ar-comum{grid-template-columns:minmax(0,1fr);gap:16px}
  .ar-aside-rot{margin:8px 0 -4px}
}
"""

# ---------------------------------------------------------------- peças
MESES = {'09': 'set', '10': 'out', '11': 'nov', '12': 'dez'}
SELO = {
    'urg': ('selo-urgente', 'alerta'),
    'hoje': ('selo-atencao', 'relogio'),
    'esp': ('selo-implant', 'relogio'),
    'neutro': ('selo-neutro', None),
    'ok': ('selo-ok', 'check'),
}


def resp(nome):
    return f'<span class="resp"><i aria-hidden="true">{INI(nome)}</i>{nome}</span>'


def it(d, m, tipo, titulo, href, oque, meta='', selo=None, quem=None, valor='', esp='', rot='', meta_ico='doc'):
    """Um item do dia (PD-07): data, o registro (link), a próxima ação, o detalhe, o selo, o valor e o responsável."""
    disco = {'venc': 'disco pd-venc', 'hoje': 'disco hoje', 'prox': 'disco'}[tipo]
    s = ''
    if selo:
        cls, ic = SELO[selo[0]]
        s = f'<span class="selo {cls}">{ico(ic) if ic else ""}{selo[1]}</span>'
    v = f'<b class="ar-valor">{valor}</b>' if valor else ''
    r = resp(quem) if quem else ''
    rt = f'<span class="ar-tipo">{rot}</span>' if rot else ''
    mt = f'<span class="pd-ct">{ico(meta_ico)}<span>{meta}</span></span>' if meta else ''
    e = f'<span class="ar-esp">{ico("relogio")}{esp}</span>' if esp else ''
    return (f'<li class="prazo"><div class="data" aria-hidden="true"><span class="{disco}"><span>{d}</span></span><small>{MESES[m]}</small></div>'
            f'<div><span class="sr">Data: {d}/{m}. </span><a href="{href}">{titulo}</a><span class="pd-oque">{rt}{oque}</span>{mt}{e}</div>'
            f'<div class="lado">{v}{s}{r}</div></li>')


def grupos(area, gs):
    """Grupos com rótulo, como no bloco aprovado: Vencidos, Para hoje, A acompanhar."""
    out = ''
    for n, (rot, itens) in enumerate(gs):
        if not itens:
            continue
        gid = f'g-{area}-{n}'
        out += f'<p class="pd-grupo" id="{gid}">{rot} · {len(itens)}</p><ol class="prazos" aria-labelledby="{gid}">{"".join(itens)}</ol>'
    return out


def pe(texto, link='', rot_link='', icone='ajuda'):
    a = f'<a class="ar-pe-ir ver" href="{link}">{rot_link}{ico("dir", "ico ico-s")}</a>' if link else ''
    return f'<div class="ar-pe">{ico(icone)}<span>{texto}</span>{a}</div>'


def bloco_area(chave, sub, miolo, link, rot_link, rodape='', busy=False):
    _, nome, icone, _, _ = AREA[chave]
    b = ' aria-busy="true"' if busy else ''
    return (f'<section class="folha ar-bloco" id="area-{chave}" aria-labelledby="t-{chave}"{b}><div class="folha-cab pd-folha-cab"><div>'
            f'<h2 id="t-{chave}">{ico(icone)}{nome}</h2><p class="sub">{sub}</p></div>'
            f'<a class="ver" href="{link}">{rot_link}<span class="sr"> (área {nome})</span>{ico("dir", "ico ico-s")}</a></div>{miolo}{rodape}</section>')


def bloco_terc(sub, miolo, rodape=''):
    return (f'<section class="folha fi-terc ar-bloco ar-terc-bloco" aria-labelledby="t-terc"><div class="fi-terc-cab">{ico("escudo")}De terceiros · não é do escritório</div>'
            f'<div class="folha-cab pd-folha-cab"><div><h3 id="t-terc">{ico("enviar")}Repasses pendentes</h3><p class="sub">{sub}</p></div>'
            f'<a class="ver" href="{L_REP}">Repasses<span class="sr"> no Financeiro</span>{ico("dir", "ico ico-s")}</a></div>{miolo}{rodape}</section>')


def emdia(titulo, prox):
    return (f'<div class="ar-emdia" role="status"><span class="disco ar-ok" aria-hidden="true">{ico("check")}</span>'
            f'<p><b>{titulo}</b><span>{prox}</span></p></div>')


def esqueleto(n=3):
    linhas = ''.join(f'<div class="ar-esq"><span class="esqueleto" style="width:48px;height:48px;border-radius:50%"></span><div style="display:grid;gap:8px">'
                     f'<span class="esqueleto esq-linha" style="width:60%;height:13px"></span><span class="esqueleto esq-linha" style="width:42%;height:10px"></span></div>'
                     f'<span class="esqueleto esq-linha so-pc-i" style="width:100px;height:24px"></span></div>' for _ in range(n))
    return f'<div aria-hidden="true">{linhas}</div>'


def cartao(chave, n, t, s, d2, d2_ico='doc', terc=False):
    """Cartão da faixa de áreas: no máximo dois números, e leva ao bloco da área."""
    _, nome, icone, _, _ = AREA[chave]
    cls2 = 'ar-c-2 ar-terc' if terc else 'ar-c-2'
    num = n if n.startswith('<span class="disco') else f'<span class="disco {n.split("|")[0]}" aria-hidden="true"><span>{n.split("|")[1]}</span></span>'
    sr_n = '' if n.startswith('<span class="disco') else f'<span class="sr">{n.split("|")[1]} </span>'
    return (f'<li><a class="ar-cartao" href="#area-{chave}"><span class="ar-c-cab">{ico(icone)}<span class="ar-c-nome">{nome}</span>{ico("baixo", "ico ar-ir")}</span>'
            f'<span class="ar-c-num">{num}<span class="ar-t">{sr_n}<b>{t}</b>{s}</span></span>'
            f'<span class="{cls2}">{ico(d2_ico)}<span>{d2}</span></span></a></li>')


def faixa(cartoes, titulo, sub, chips=''):
    n = cartoes.count('<li>')
    return (f'<section class="ar-faixa" aria-labelledby="t-areas"><div class="ar-faixa-cab"><div><h2 id="t-areas">{titulo}</h2><p class="sub">{sub}</p></div>{chips}</div>'
            f'<ul class="ar-cartoes{" ar-n1" if n == 1 else ""}" style="--n:{n}">{cartoes}</ul></section>')


def chips(sel='meus'):
    b = lambda k, r, href: (f'<a class="ar-chip" href="{href}" aria-current="{"true" if sel == k else "false"}">{r}</a>')
    pr = lambda k: "true" if sel == k else "false"
    return (f'<div class="pd-chips" role="group" aria-label="Mostrar no Início">'
            f'<button type="button" aria-pressed="{pr("meus")}" data-ir="{ARQ}dona">Os meus</button>'
            f'<button type="button" aria-pressed="{pr("equipe")}" data-ir="{ARQ}dona-equipe">Da equipe</button></div>')


def hero_ar(nome, dia_itens, atalhos, carregando=False):
    if dia_itens:
        dia_html = '<ul class="dia" aria-label="O seu dia">' + ''.join(
            f'<li><a href="{h}"><span class="disco"><span>{n}</span></span><span><b>{t}</b>{s}</span></a></li>' for n, t, s, h in dia_itens) + '</ul>'
    else:
        dia_html = ''
    at = f'<div class="dir campo-ambar"><p class="sobretitulo">Atalhos</p>{atalhos}</div>'
    return (f'<div class="hero"><div class="esq campo-vinho">{ico("balanca", "ico estatua")}<p class="sobretitulo">{HOJE_LONGO}</p>'
            f'<h1>Bom dia, {nome}.</h1><span class="fio" aria-hidden="true"></span>{dia_html}</div>{at}</div>')


AT_NOVO_CLI = f'<a class="btn btn-escuro" href="{L_CLI}?estado=novo">{ico("pessoa-mais")}Novo cliente</a>'
AT_REC = f'<a class="btn btn-sec" href="{AP}portal-financeiro/financeiro.html?estado=registrar">{ico("moeda")}Registrar recebimento</a>'
AT_REC_E = f'<a class="btn btn-escuro" href="{AP}portal-financeiro/financeiro.html?estado=registrar">{ico("moeda")}Registrar recebimento</a>'
AT_CLI = f'<a class="btn btn-sec" href="{L_CLI}?estado=lista">{ico("pessoas")}Abrir Clientes</a>'
AT_PRAZO = f'<a class="btn btn-escuro" href="{AP}portal-juridico/juridico.html?estado=novo-prazo">{ico("mais")}Novo prazo</a>'

# Parte comum: Agenda de hoje e Esperando alguém (desenho aprovado do Início, sem mudança)
AGENDA = (f'<section class="folha" aria-labelledby="t-agenda"><div class="folha-cab"><div><h2 id="t-agenda">{ico("agenda")}Agenda de hoje</h2><p class="sub">Da equipe toda · 4 compromissos</p></div>'
          f'<a class="ver" href="{L_AG}">Agenda{ico("dir", "ico ico-s")}</a></div>'
          '<p class="legenda leg-ag"><span><i style="background:var(--vinho)"></i>Audiência</span><span><i style="background:var(--vinho-2)"></i>Assinatura</span><span><i style="background:var(--ambar)"></i>Cliente</span><span><i style="background:var(--vinho-4)"></i>Interno</span></p>'
          '<ol class="agenda">'
          '<li class="ev passou" style="--t:var(--vinho-4)"><time>09:00</time><div class="cx"><span class="tipo">Interno</span><strong>Revisão semanal de prazos</strong><small>Equipe toda · sala de reunião</small></div></li>'
          '<li class="agora" aria-label="Agora, 10h12"><b></b>agora, 10h12</li>'
          '<li class="ev" style="--t:var(--vinho)"><time>11:00</time><div class="cx"><span class="tipo">Audiência</span><strong>Conciliação · Ferreira x Banco Horizonte</strong><small>TRT-2, virtual · Marina</small></div></li>'
          '<li class="ev" style="--t:var(--ambar)"><time>14:30</time><div class="cx"><span class="tipo">Cliente</span><strong>Primeira reunião · Daniela Souza</strong><small>Possível cliente novo · Larissa</small></div></li>'
          '<li class="ev" style="--t:var(--vinho-2)"><time>17:00</time><div class="cx"><span class="tipo">Assinatura</span><strong>Contrato · Família Oliveira</strong><small>Inventário · Felipe</small></div></li>'
          '</ol></section>')


def conversa(av, ini, nome, sub, tempo, balao, motivo):
    return (f'<li class="conversa"><div class="c-topo"><span class="av {av}" aria-hidden="true">{ini}</span><div><strong>{nome}</strong><small>{sub}</small></div>'
            f'<span class="espera">{ico("relogio", "ico ico-s")}{tempo}</span></div><p class="balao">{balao}</p>'
            f'<div class="c-pe"><span class="motivo">{ico("ia")}{motivo}</span><a class="btn btn-sec" href="{L_CVR}">Responder<span class="sr"> a {nome}</span></a></div></li>')


CONVERSAS = (f'<section class="folha" aria-labelledby="t-conv"><div class="folha-cab conv-cab"><div><h2 id="t-conv">{ico("whats")}Esperando alguém</h2><p class="sub">A IA respondeu e passou para a equipe · 3 conversas</p></div>'
             f'<a class="ver" href="{L_CV}">Conversas{ico("dir", "ico ico-s")}</a></div><ul class="conversas">'
             + conversa('av1', 'D', 'Daniela Souza', 'Novo contato · sem processo', 'há 2 h', '“Fui demitida grávida, vocês atendem esse tipo de caso?”', 'Possível cliente novo')
             + conversa('av2', 'R', 'Roberto Andrade', 'Saúde · Andrade x Unimed Paulistana', 'há 1 h', '“Mandei as fotos do exame novo. A doutora consegue ver antes de amanhã?”', 'Enviou documento novo')
             + f'</ul>{pe("Mais 1 conversa esperando: Joana Pereira, há 42 min.", L_CV, "Abrir Conversas", "conversas")}</section>')

ASIDE = f'<aside class="pt-col" aria-label="Parte comum do escritório"><p class="ar-aside-rot">Todo o escritório</p>{AGENDA}{CONVERSAS}</aside>'


def pagina_inicio(hero_html, faixa_html, blocos, aviso=''):
    return (f'<div class="pd-inicio">{hero_html}{aviso}{faixa_html}<div class="pt-inicio"><div class="pt-col">{blocos}</div>{ASIDE}</div></div>')


# ---------------------------------------------------------------- dados (fictícios, os mesmos das telas aprovadas)
# Comercial: os contatos são os do Início aprovado (F1.14), lidos do pendencias.py: C_GAB, EQUIPE...
def contatos(itens, resp_=False, area='comercial'):
    v = [item(c, resp_) for c in itens if c[7] == 'vencido']
    h = [item(c, resp_) for c in itens if c[7] == 'hoje']
    out = ''
    for n, (rot, lst) in enumerate([('Contatos vencidos', v), ('Contatos para hoje', h)]):
        if lst:
            gid = f'g-{area}-{n}'
            out += f'<p class="pd-grupo" id="{gid}">{rot} · {len(lst)}</p><ol class="prazos pd-contatos" aria-labelledby="{gid}">{"".join(lst)}</ol>'
    return out


# Contratos (honorários e contratos aprovados)
CT_HELIO = lambda q=None: it('10', '11', 'venc', 'Hélio Batista Corrêa · C-2026-022', L_HON, 'Informar a base de novembro para a cobrança sair',
                            '30% do benefício · base pedida em 05/11 por lembrete', ('urg', 'cobrança parada há 8 dias'), q, rot='Cobrar')
CT_BENE = lambda q=None: it('20', '11', 'prox', 'Benedito Souza Lima · C-2026-033', L_CTR, 'Registrar a assinatura: o contrato está em elaboração',
                           'Diego colhe a assinatura na sexta · só então a programação vai ao Financeiro', ('neutro', 'Sexta'), q, rot='Acompanhar')

# Financeiro do escritório (Resumo aprovado de novembro)
FI_DAN = lambda q=None: it('05', '09', 'venc', 'Daniela Rocha Mendes · entrada 2/5', L_PARC, 'Próxima ação em 26/11: propor descontar do valor do acordo',
                          'Motivo: está desempregada e pediu para pagar depois do acordo', ('urg', '74 dias'), q, 'R$ 1.200,00', rot='Cobrar')
FI_HEL = lambda q=None: it('25', '10', 'venc', 'Hélio Batista Corrêa · parcela 3/6', L_PARC, 'Próxima ação em 19/11: ligar para Marta Corrêa, a esposa',
                          'Motivo: não respondeu aos lembretes do WhatsApp', ('urg', '24 dias'), q, 'R$ 850,00', rot='Cobrar')
FI_VAL = lambda q=None: it('10', '11', 'venc', 'Construtora Vale Alto Ltda. · mensalidade', L_PARC, 'Próxima ação em 25/11: conferir se o boleto foi pago',
                          'Motivo: vai pagar junto com a medição da obra, no dia 25', ('urg', '8 dias'), q, 'R$ 3.200,00', rot='Cobrar')
FI_FAR = lambda q=None: it('15', '11', 'venc', 'Farmácia Bom Jesus Ltda. · mensalidade', L_PARC, 'Próxima ação hoje: mandar um Pix de cobrança',
                          'Motivo: o banco recusou o débito automático', ('urg', '3 dias'), q, 'R$ 1.800,00', rot='Cobrar')
FI_BEN = lambda q=None: it('19', '11', 'prox', 'Benedito Souza Lima · parcela 2/4', L_REC, 'Entra amanhã por Pix, com a cobrança já enviada',
                          'Novembro · Pix', ('hoje', 'Amanhã'), q, 'R$ 1.450,00', rot='Acompanhar')
FI_GAB = lambda q=None: it('20', '11', 'prox', 'Gabriela Teixeira · entrada', L_REC, 'Entra na sexta por Pix: conferir a baixa',
                          'Novembro · Pix', ('neutro', 'Sexta'), q, 'R$ 4.000,00', rot='Acompanhar')
FI_IRE = lambda q=None: it('23', '11', 'prox', 'Irene Castro · parcela 1/3', L_REC, 'Vence na segunda: o boleto já foi emitido',
                          'Novembro · boleto', ('neutro', 'Segunda'), q, 'R$ 1.100,00', rot='Acompanhar')

# Repasses (dinheiro de terceiros: nunca soma nem divide folha com o do escritório)
TR_GAB = lambda q=None: it('17', '11', 'venc', 'Gabriela Teixeira · cliente', L_REP1, 'Repassar o acordo da ação de cobrança',
                          'Depósito do acordo, já na conta', ('urg', 'era 17/11'), q, 'R$ 4.900,00', rot='Entregar', meta_ico='escudo')
TR_BEN = lambda q=None: it('20', '11', 'prox', 'Benedito Souza Lima · cliente', L_REP1, 'Repassar o RPV da revisão de aposentadoria',
                          'RPV levantado, já na conta', ('neutro', 'até sexta'), q, 'R$ 15.096,59', rot='Entregar', meta_ico='escudo')
TR_OLI = lambda q=None: it('20', '11', 'prox', 'Oliveira &amp; Prates Advocacia · parceiro', L_REP1, 'Repassar 20% dos honorários do RPV de Irene Castro',
                          'RPV de Irene Castro', ('neutro', 'até sexta'), q, 'R$ 2.318,40', rot='Entregar', meta_ico='escudo')
TR_RUI = lambda q=None: it('20', '11', 'prox', 'Dr. Rui Tavares · perito', L_REP1, 'Pedir a nota fiscal antes de repassar',
                          'Assistente técnico · RPV de Irene Castro', ('hoje', 'Falta a nota'), q, 'R$ 1.500,00', rot='Cobrar', meta_ico='escudo')

# Jurídico (Prazos e Tarefas aprovados)
JU_MIN = lambda q=None: it('17', '11', 'venc', 'Devolver a minuta de acordo ao Banco Horizonte', L_TAR, 'Tarefa · Ferreira x Banco Horizonte',
                          '', ('urg', 'venceu ontem'), q, rot='Entregar', meta_ico='check')
JU_REC = lambda q=None: it('19', '11', 'prox', 'Recurso ordinário · Pereira x Mercado Bom Preço', L_PRZ, 'Fazer até hoje: o prazo final é amanhã',
                          'Prazo · 1001022-33.2026.5.02.0045 · TRT-2', ('hoje', 'Amanhã'), q, rot='Entregar', meta_ico='balanca')
JU_MRO = lambda q=None: it('18', '11', 'hoje', 'Minuta do recurso ordinário', L_TAR, 'Tarefa · Pereira x Mercado Bom Preço',
                          '', ('hoje', 'Hoje'), q, rot='Entregar', meta_ico='check')
JU_REV = lambda q=None: it('18', '11', 'hoje', 'Revisar a contestação de Felipe', L_TAR, 'Tarefa · Souza x Construtora Atlas',
                          '', ('hoje', 'Hoje'), q, rot='Entregar', meta_ico='check')
JU_PRO = lambda q=None: it('25', '11', 'prox', 'Assinar e protocolar a petição inicial', L_CASO, 'Tarefa · Vale Alto x Prefeitura de Santo André',
                          '', None, q, esp='Esperando o cliente: procuração assinada, pedida em 11/11', rot='Acompanhar', meta_ico='check')
JU_CON = lambda q=None: it('18', '11', 'hoje', 'Contestação · Souza x Construtora Atlas', L_PRZ, 'Protocolar hoje',
                          'Prazo · 0812345-67.2026.8.26.0100 · 4ª Vara Cível', ('urg', 'Vence hoje'), q, rot='Entregar', meta_ico='balanca')
JU_LAU = lambda q=None: it('18', '11', 'hoje', 'Manifestação sobre laudo · Andrade x Unimed Paulistana', L_PRZ, 'Protocolar hoje',
                          'Prazo · 1004871-20.2025.8.26.0011 · Foro de Pinheiros', ('urg', 'Vence hoje'), q, rot='Entregar', meta_ico='balanca')
JU_EXA = lambda q=None: it('18', '11', 'hoje', 'Ver o exame novo que Roberto mandou', L_CVR, 'Andrade x Unimed Paulistana',
                          'Tarefa · o exame chegou hoje pelo WhatsApp, em Conversas', ('hoje', 'Hoje'), q, rot='Acompanhar', meta_ico='check')
JU_CAL = lambda q=None: it('01', '12', 'prox', 'Juntar os cálculos do assistente técnico', L_CASO, 'Tarefa · Teixeira x Lojas Brilho',
                          '', None, q, esp='Esperando Dr. Rui Tavares: cálculos pedidos em 12/11', rot='Acompanhar', meta_ico='check')

MR, FM, DA, LC = 'Marina Ribeiro', 'Felipe Matos', 'Diego Almeida', 'Larissa Costa'

# ---------------------------------------------------------------- blocos de cada estado
NADA_MEU = (f'<p class="pd-nada-meu">{ico("check")}<span>Nenhum contato seu está vencido. Na equipe há 4 vencidos: 3 com Diego Almeida e 1 com Felipe Matos. '
            f'Veja em “Da equipe”.</span></p>')


def b_comercial(equipe=False):
    if equipe:
        sub = 'Da equipe: 4 contatos vencidos e 3 para hoje, com o responsável'
        miolo = contatos(EQUIPE[:5], True)
        rod = pe('<b>Mostrando 5 de 7.</b> Os outros 2 são para hoje, com Diego (Rafael e Lúcia). Propostas esperando resposta: 3, uma com o retorno vencido ontem (P-2026-015, Diego).',
                 L_COM, 'Ver todos', 'maleta')
    else:
        sub = 'Os seus: 1 contato para hoje'
        miolo = NADA_MEU + contatos([C_GAB])
        rod = pe('Proposta sua esperando resposta: P-2026-016, de Gabriela Teixeira. O retorno dela é este contato de hoje.', L_PROP, 'Propostas', 'maleta')
    return bloco_area('comercial', sub, miolo, L_COM, 'Abrir Comercial', rod)


def b_contratos(equipe=False):
    q = MR if equipe else None
    sub = ('Da equipe: 1 cobrança parada e 1 assinatura a registrar, as duas com Marina' if equipe
           else 'Os seus: 1 cobrança parada e 1 assinatura a registrar')
    miolo = grupos('contratos', [('Vencidos', [CT_HELIO(q)]), ('A acompanhar', [CT_BENE(q)])])
    rod = pe('4 condições esperam uma etapa do caso para virar cobrança. Nenhuma pede ação hoje.', L_HON, 'Honorários', 'pena')
    return bloco_area('contratos', sub, miolo, L_CT, 'Abrir Contratos', rod)


def b_financeiro(equipe=False):
    if equipe:
        esc = grupos('financeiro', [('Vencidos', [FI_DAN(MR), FI_HEL(DA), FI_VAL(FM), FI_FAR(DA)]), ('A acompanhar', [FI_BEN(MR)])])
        sub = 'Do escritório: 4 parcelas vencidas e 1 que entra amanhã'
        rod = pe('<b>R$ 7.050,00 vencidos em 4 parcelas.</b> Todas têm responsável e próxima ação.', L_FIN, 'Resumo', 'carteira')
        tsub = 'Da equipe: 4 repasses, 1 atrasado'
        terc = grupos('terceiros', [('Vencidos', [TR_GAB(MR)]), ('A fazer até sexta', [TR_BEN(MR), TR_OLI('Bianca Torres'), TR_RUI('Bianca Torres')])])
        trod = pe('<b>R$ 23.814,99 a repassar.</b> É dinheiro de clientes e terceiros: não entra no caixa nem na previsão do escritório.', '', '', 'escudo')
    else:
        esc = grupos('financeiro', [('Vencidos', [FI_DAN()]), ('A acompanhar', [FI_BEN()])])
        sub = 'Do escritório · os seus: 1 parcela vencida e 1 que entra amanhã'
        rod = pe('No escritório todo, 4 parcelas estão vencidas. Os números do mês estão no Resumo.', L_FIN, 'Resumo', 'carteira')
        tsub = 'Os seus: 1 atrasado e 1 até sexta'
        terc = grupos('terceiros', [('Vencidos', [TR_GAB()]), ('A fazer até sexta', [TR_BEN()])])
        trod = ''
    return (f'<div class="ar-fin">{bloco_area("financeiro", sub, esc, L_FIN, "Abrir Financeiro", rod)}{bloco_terc(tsub, terc, trod)}</div>')


def b_juridico(equipe=False):
    if equipe:
        sub = 'Da equipe: 2 prazos vencem hoje, 1 tarefa atrasada'
        miolo = grupos('juridico', [('Vencidos', [JU_MIN(MR)]), ('Para hoje', [JU_CON(FM), JU_LAU(LC), JU_REC(MR), JU_MRO(MR)])])
        rod = pe('<b>Mostrando 5 de 9.</b> Os outros 4: 2 tarefas para hoje e 2 esperando alguém.', L_TAR, 'Ver todos', 'balanca')
    else:
        sub = 'Os seus: 1 tarefa atrasada, 3 para hoje e 1 esperando o cliente'
        miolo = grupos('juridico', [('Vencidos', [JU_MIN()]), ('Para hoje', [JU_REC(), JU_MRO(), JU_REV()]), ('Esperando alguém', [JU_PRO()])])
        rod = pe('No escritório, 2 prazos vencem hoje: com Felipe e com Larissa.', L_PRZ, 'Prazos', 'balanca')
    return bloco_area('juridico', sub, miolo, L_PRZ, 'Abrir Jurídico', rod)


# ---------------------------------------------------------------- faixa de áreas
def cartoes_marina(equipe=False, sem=None, carregando=None):
    c = []
    if equipe:
        c.append(cartao('comercial', 'pd-venc|4', 'contatos vencidos', 'e 3 para hoje', '<b>3 propostas</b> esperando resposta, 1 com retorno vencido', 'maleta'))
        c.append(cartao('contratos', 'pd-venc|1', 'cobrança parada', 'base de novembro de Hélio', '<b>1 contrato</b> esperando a assinatura', 'pena'))
        c.append(cartao('financeiro', 'pd-venc|4', 'parcelas vencidas', 'R$ 7.050,00 do escritório', '<b>De terceiros:</b> 4 repasses, 1 atrasado', 'escudo', True))
        c.append(cartao('juridico', 'pd-venc|2', 'prazos vencem hoje', 'com Felipe e Larissa', '<b>1 tarefa atrasada</b> e 2 esperando alguém', 'balanca'))
    else:
        c.append(cartao('comercial', 'hoje|1', 'contato para hoje', 'Gabriela Teixeira', '<b>1 proposta sua</b> esperando resposta', 'maleta'))
        c.append(cartao('contratos', 'pd-venc|1', 'cobrança parada', 'base de novembro de Hélio', '<b>1 contrato</b> esperando a assinatura', 'pena'))
        c.append(cartao('financeiro', 'pd-venc|1', 'parcela vencida', 'R$ 1.200,00 do escritório', '<b>De terceiros:</b> 1 repasse atrasado', 'escudo', True))
        c.append(cartao('juridico', 'pd-venc|1', 'tarefa atrasada', 'e 3 para hoje', '<b>1 prazo</b> para fazer até hoje', 'balanca'))
    if carregando:
        i = ['comercial', 'contratos', 'financeiro', 'juridico'].index(carregando)
        _, nome, icone, _, _ = AREA[carregando]
        c[i] = (f'<li><a class="ar-cartao" href="#area-{carregando}" aria-busy="true"><span class="ar-c-cab">{ico(icone)}<span class="ar-c-nome">{nome}</span>{ico("baixo", "ico ar-ir")}</span>'
                f'<span class="ar-c-num"><span class="esqueleto" style="width:44px;height:44px;border-radius:50%" aria-hidden="true"></span><span class="ar-t"><b>Carregando…</b>leva poucos segundos</span></span>'
                f'<span class="ar-c-2"><span class="esqueleto esq-linha" style="width:80%;height:10px" aria-hidden="true"></span></span></a></li>')
    if sem:
        i = ['comercial', 'contratos', 'financeiro', 'juridico'].index(sem)
        _, nome, icone, _, _ = AREA[sem]
        c[i] = (f'<li><a class="ar-cartao" href="#area-{sem}"><span class="ar-c-cab">{ico(icone)}<span class="ar-c-nome">{nome}</span>{ico("baixo", "ico ar-ir")}</span>'
                f'<span class="ar-c-num"><span class="disco ar-erro" aria-hidden="true">{ico("alerta")}</span><span class="ar-t"><b>Não carregou</b>o resto do Início continua</span></span>'
                f'<span class="ar-c-2">{ico("reenviar")}<span>Tente de novo no bloco</span></span></a></li>')
    return ''.join(c)


SUB_FAIXA = 'O que cobrar, o que entregar e o que acompanhar hoje. Cada cartão leva ao bloco da área.'

T = ''
I = dict(atual='inicio', trilha='Início', titulo='Início')

HERO_MARINA = lambda: hero_ar('Marina', [('8', 'pedem você hoje', 'nas suas 4 áreas', '#t-areas'), ('4', 'compromissos hoje', 'audiência às 11h', '#t-agenda')], AT_NOVO_CLI + AT_REC)
BLOCOS = lambda eq=False: b_comercial(eq) + b_contratos(eq) + b_financeiro(eq) + b_juridico(eq)

# 1. Sócia dona, os dela (o principal)
T += tpl('dona', pagina_inicio(HERO_MARINA(), faixa(cartoes_marina(), 'Hoje nas suas áreas', SUB_FAIXA, chips('meus')), BLOCOS()) + j_registrar(), **I)
# 2. Sócia dona, da equipe
T += tpl('dona-equipe', pagina_inicio(HERO_MARINA(), faixa(cartoes_marina(True), 'Hoje no escritório', 'Os itens de toda a equipe, cada um com o responsável. A agenda já é da equipe toda.', chips('equipe')), BLOCOS(True)) + j_registrar(), **I)

# 3. Bianca: Contratos e Financeiro
BI = 'Bianca Torres'
b_ct_bi = bloco_area('contratos', 'Os seus: nada para hoje', emdia('Nada seu em Contratos hoje.', 'Próximo com você: gerar a procuração de Benedito depois da assinatura, na sexta, 20/11.'),
                     L_CT, 'Abrir Contratos', pe('No escritório, 1 cobrança está parada esperando a base do mês, com Marina.', L_HON, 'Honorários', 'pena'))
b_fi_bi = (f'<div class="ar-fin">'
           + bloco_area('financeiro', 'Do escritório · os seus: 2 recebimentos para acompanhar', grupos('financeiro', [('A acompanhar', [FI_GAB(), FI_IRE()])]),
                        L_FIN, 'Abrir Financeiro', pe('No escritório todo, 4 parcelas estão vencidas, cada uma com o seu responsável.', L_REC, 'A receber', 'carteira'))
           + bloco_terc('Os seus: 2 até sexta, 1 esperando a nota', grupos('terceiros', [('A fazer até sexta', [TR_RUI(), TR_OLI()])]))
           + '</div>')
cart_bi = (cartao('contratos', '<span class="disco ar-ok" aria-hidden="true">' + ico('check') + '</span>', 'Em dia', 'nada seu hoje', '<b>Próximo:</b> procuração de Benedito, sexta', 'pena')
           + cartao('financeiro', 'prox|2', 'a acompanhar', 'R$ 5.100,00 do escritório', '<b>De terceiros:</b> 2 repasses até sexta, 1 falta a nota', 'escudo', True))
T += tpl('bianca', pagina_inicio(hero_ar('Bianca', [('1', 'pede você hoje', 'a nota do perito', '#t-areas'), ('4', 'compromissos hoje', 'audiência às 11h', '#t-agenda')], AT_REC_E + AT_CLI),
                                 faixa(cart_bi, 'Hoje nas suas áreas', SUB_FAIXA), b_ct_bi + b_fi_bi), quem='bianca', **I)

# 4. Larissa: só Jurídico (sem faixa: com uma área só, o bloco já é o painel)
b_ju_la = bloco_area('juridico', 'Os seus: 1 prazo e 1 tarefa para hoje, 1 esperando alguém',
                     grupos('juridico', [('Para hoje', [JU_LAU(), JU_EXA()]), ('Esperando alguém', [JU_CAL()])]),
                     L_PRZ, 'Abrir Jurídico', pe('No escritório, outro prazo vence hoje, com Felipe.', L_PRZ, 'Prazos', 'balanca'))
T += tpl('larissa', pagina_inicio(hero_ar('Larissa', [('2', 'pedem você hoje', 'um prazo vence hoje', '#area-juridico'), ('4', 'compromissos hoje', 'o seu às 14h30', '#t-agenda')],
                                          AT_PRAZO + AT_CLI), '', b_ju_la), quem='juridico', **I)

# 5. Paula: nenhuma área (só a parte comum)
sem_area = (f'<p class="ar-sem-area">{ico("coluna")}<span><b>Você vê a parte comum do escritório:</b> a agenda, as conversas e os clientes. '
            f'Se o seu trabalho pedir outra parte do T3jus, quem libera é Marina Ribeiro, a sócia dona.</span></p>')
T += tpl('paula', f'<div class="pd-inicio">' + hero_ar('Paula', [('4', 'compromissos hoje', 'audiência às 11h', '#t-agenda'), ('3', 'conversas esperando', 'a mais antiga há 2 h', '#t-conv')], AT_NOVO_CLI + AT_CLI)
         + sem_area + f'<div class="ar-comum">{AGENDA}{CONVERSAS}</div></div>', quem='sem-area', **I)

# 6. Tudo em dia (sócia dona, num dia sem pendência dela)
ok = '<span class="disco ar-ok" aria-hidden="true">' + ico('check') + '</span>'
cart_ok = (cartao('comercial', ok, 'Em dia', 'nada vencido', '<b>Próximo:</b> sexta, 20/11', 'maleta')
           + cartao('contratos', ok, 'Em dia', 'nada parado', '<b>Próximo:</b> assinatura, sexta', 'pena')
           + cartao('financeiro', ok, 'Em dia', 'nada vencido', '<b>De terceiros:</b> nenhum repasse seu', 'escudo', True)
           + cartao('juridico', ok, 'Em dia', 'nada para hoje', '<b>Próximo prazo:</b> 26/11', 'balanca'))
tudo = f'<p class="ar-tudo" role="status">{ico("check")}<span><b>Tudo em dia nas suas 4 áreas.</b> Nada seu vencido e nada para hoje. Cada bloco mostra o próximo.</span></p>'
blocos_ok = (bloco_area('comercial', 'Os seus: nada vencido, nada para hoje', emdia('Tudo em dia com os seus clientes.', 'Próximo contato: sexta, 20/11 · Benedito Souza Lima.'), L_COM, 'Abrir Comercial')
             + bloco_area('contratos', 'Os seus: nada parado', emdia('Nenhuma cobrança sua parada.', 'Próximo: registrar a assinatura de Benedito, sexta, 20/11.'), L_CT, 'Abrir Contratos')
             + '<div class="ar-fin">' + bloco_area('financeiro', 'Do escritório · os seus: nada vencido', emdia('Nenhuma parcela sua vencida.', 'Próximo: Benedito Souza Lima, R$ 1.450,00, amanhã.'), L_FIN, 'Abrir Financeiro')
             + bloco_terc('Os seus: nenhum pendente', emdia('Nenhum repasse seu esperando.', 'Quando um valor de terceiros entrar, o repasse aparece aqui.')) + '</div>'
             + bloco_area('juridico', 'Os seus: nada para hoje', emdia('Nenhum prazo nem tarefa sua para hoje.', 'Próximo prazo: alegações finais, Ferreira x Banco Horizonte, 26/11.'), L_PRZ, 'Abrir Jurídico'))
T += tpl('vazio', pagina_inicio(hero_ar('Marina', [('0', 'pedem você hoje', 'tudo em dia', '#t-areas'), ('4', 'compromissos hoje', 'audiência às 11h', '#t-agenda')], AT_NOVO_CLI + AT_REC),
                                faixa(cart_ok, 'Hoje nas suas áreas', SUB_FAIXA, chips('meus')), blocos_ok, aviso=tudo), **I)

# 7. Um bloco carregando (Financeiro); o resto já chegou
fin_carr = (f'<div class="ar-fin">' + bloco_area('financeiro', 'Buscando o que é seu no Financeiro…',
            f'<p class="sr" role="status">Carregando o Financeiro…</p>{esqueleto(3)}', L_FIN, 'Abrir Financeiro', busy=True) + '</div>')
T += tpl('carregando', pagina_inicio(hero_ar('Marina', [('6', 'pedem você hoje', 'o Financeiro ainda está chegando', '#t-areas'), ('4', 'compromissos hoje', 'audiência às 11h', '#t-agenda')], AT_NOVO_CLI + AT_REC),
                                     faixa(cartoes_marina(carregando='financeiro'), 'Hoje nas suas áreas', SUB_FAIXA, chips('meus')),
                                     b_comercial() + b_contratos() + fin_carr + b_juridico()) + j_registrar(), **I)

# 8. Erro num bloco só (Jurídico); o resto continua
ju_erro = bloco_area('juridico', 'Os seus prazos e tarefas', estado('Não deu para carregar o Jurídico',
                     'O servidor não respondeu. Nenhum prazo se perdeu, e o resto do Início continua funcionando. Se continuar, os prazos estão em Jurídico › Prazos.',
                     erro=True, moldura=False, acoes=f'<button class="btn btn-pri" type="button">{ico("reenviar")}Tentar de novo</button>'
                     f'<a class="btn btn-sec" href="{L_PRZ}">{ico("balanca")}Abrir Prazos</a>', codigo='Código para o suporte: PTL-9C42-1810'), L_PRZ, 'Abrir Jurídico')
T += tpl('erro', pagina_inicio(hero_ar('Marina', [('4', 'pedem você hoje', 'sem contar o Jurídico', '#t-areas'), ('4', 'compromissos hoje', 'audiência às 11h', '#t-agenda')], AT_NOVO_CLI + AT_REC),
                               faixa(cartoes_marina(sem='juridico'), 'Hoje nas suas áreas', SUB_FAIXA, chips('meus')),
                               b_comercial() + b_contratos() + b_financeiro() + ju_erro) + j_registrar(), **I)

# ---------------------------------------------------------------- página
out = pagina('Início', 'Portal: o Início por áreas, com o que cobrar, entregar e acompanhar hoje em Comercial, Contratos, Financeiro e Jurídico.',
             '{"estado":"dona","atual":"inicio"}', '', T)
out = out.replace('</style>', CSS_CL + '\n' + CSS_PD + '\n' + CSS_AR + '\n</style>', 1)
_sp = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">'
assert _sp in out
out = out.replace(_sp, _sp + LOGO_SYMBOL, 1)
out = re.sub(r'(<a class="marca-palavra"[^>]*>)T<b>3</b>jus(</a>)', r'\g<1>' + LOGO + r'\2', out)
out = out.replace('<b>T<i>3</i>jus</b><span>Portal</span>', LOGO + '<span>Portal</span>')
# Pessoas de exemplo deste desenho (as mesmas da Equipe aprovada)
out = out.replace("'sem-area':{", "bianca:{nome:'Bianca Torres',ini:'B',papel:'Áreas: Contratos e Financeiro',areas:['contratos','financeiro'],dono:false},\n    'sem-area':{", 1)
out = out.replace("papel:'Área: Jurídico'", "papel:'Área: Jurídico'", 1)
# Links do trilho: Início volta a este desenho; as áreas levam às telas aprovadas
out = out.replace('href="moldura.html?estado=sem-area" data-nav="inicio"', 'href="inicio.html?estado=dona" data-nav="inicio"')
out = out.replace('href="#" data-nav="clientes"', f'href="{L_CLI}?estado=lista" data-nav="clientes"')
for k, lnk in [('comercial', L_COM), ('contratos', L_CT), ('financeiro', L_FIN), ('juridico', L_PRZ), ('agenda', L_AG), ('conversas', L_CV)]:
    out = out.replace(f'href="#" data-nav="{k}"', f'href="{lnk}" data-nav="{k}"')
out = out.replace('href="moldura.html"', 'href="inicio.html?estado=dona"')
# "Os meus" e "Da equipe" trocam de estado neste desenho (no produto, trocam a consulta)
out = out.replace("if(e.target.closest('a[href=\"#\"]')) e.preventDefault();",
                  "if(e.target.closest('a[href=\"#\"]')) e.preventDefault();\n    var ir=e.target.closest('[data-ir]'); if(ir){location.href=ir.dataset.ir}", 1)
assert 'data-ir' in out and "location.href=ir" in out
assert 'T<b>3</b>jus' not in out and 'T<i>3</i>jus' not in out
open(os.path.join(SAIDA, 'inicio.html'), 'w', encoding='utf-8').write(out)
print('inicio ok', T.count('<template data-est='), 'estados')
