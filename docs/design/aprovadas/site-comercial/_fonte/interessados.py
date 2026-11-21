# Console · Comercial › Interessados (F2.3, SC-05; recebe o pedido do site, F2.2, SC-02).
# Página nova montada sobre a moldura aprovada da Cobrança (docs/design/aprovadas/console-cobranca/cobranca.html):
# trilho, barra do celular, CSS (D2, Console v1 e cb-) e script são os aprovados, lidos sem mudança;
# o miolo e os estados são novos (CSS com prefixo in-).
# Uso: python3 interessados.py <pasta-saida>
import sys, os, re
APROV = '/home/claude/t3jus/docs/design/aprovadas/'
sys.path.insert(0, APROV + 'console-cobranca/_fonte')
from comum_cb import ico, aviso, janela, tpl, campo, selecao, H  # peças aprovadas, sem mudança

SAIDA = sys.argv[1] if len(sys.argv) > 1 else '..'
s = open(APROV + 'console-cobranca/cobranca.html', encoding='utf-8').read()

# ---------------------------------------------------------------- moldura
def troca(a, b, n=1):
    global s
    assert a in s, a[:90]
    s = s.replace(a, b, n)

troca('<title>Cobrança · Console T3jus</title>', '<title>Interessados · Console T3jus</title>')
s = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="Interessados no Console T3jus: pedidos de demonstração do site, responsável, próximo passo e conversão em escritório cliente.">', s, count=1)
troca('''<body data-pagina="cobranca" data-padrao='{"aba":"faturas","estado":"ver"}'>''', '''<body data-pagina="interessados" data-padrao='{"aba":"lista","estado":"ver"}'>''')
troca('<a class="item so-fin" href="cobranca.html" aria-current="page">', '<a class="item so-fin" href="cobranca.html">')
troca('<a class="item " href="#"><svg class="ico" aria-hidden="true"><use href="#i-maleta"/></svg>Comercial</a>',
      '<a class="item " href="interessados.html" aria-current="page"><svg class="ico" aria-hidden="true"><use href="#i-maleta"/></svg>Comercial<span class="cont" aria-label="3 interessados pedem atenção">3</span></a>')
troca('<span aria-current="page">Cobrança</span></nav>', '<span>Comercial</span><svg class="ico ico-s" aria-hidden="true"><use href="#i-dir"/></svg><span aria-current="page">Interessados</span></nav>')
i = s.index('<div class="cabeca-ambar campo-ambar cabeca-equipe cb-cab cb-sem-num">')
j = s.index('<div id="miolo"', i)
CABECA = ('<div class="cabeca-ambar campo-ambar cabeca-equipe cb-cab cb-sem-num"><div><p class="sobretitulo">Comercial</p><h1>Interessados</h1><span class="fio" aria-hidden="true"></span>'
          '<p class="lede">Os escritórios que pediram demonstração pelo site ou chegaram por indicação, do primeiro contato até virarem clientes.</p>'
          '<p class="cb-cab-linha"><span class="cb-peq" style="color:var(--tinta)">Hoje: 21/11/2026</span></p></div>'
          f'<div class="in-cab-acao so-pode"><button class="btn btn-pri" type="button">{ico("mais")}Cadastrar interessado</button></div></div>\n      ')
s = s[:i] + CABECA + s[j:]
ti = s.index('<template data-est=')
tj = s.rindex('</template>') + len('</template>')
s = s[:ti] + '<!--IN-->' + s[tj:]
troca("if(papel==='implantacao'||papel==='suporte'){aba='faturas';est='sem-permissao'}", "if(papel==='financeiro'||papel==='suporte'){aba='lista';est='sem-permissao'}")
# Trilha de navegação e título por estado; o papel acompanha os links.
JS_TRILHA = ('<script>(function(){var q=new URLSearchParams(location.search),p=q.get("papel")||"admin";'
             'var t=document.querySelector(\'template[data-est="\'+(q.get("aba")||"lista")+":"+(q.get("estado")||"ver")+\'"]\');'
             'if(t&&t.hasAttribute("data-sem-cabeca")){var cc=document.querySelector(".cabeca-equipe");if(cc)cc.hidden=true}'
             'if(p==="financeiro"||p==="suporte")return;'
             'if(t&&t.dataset.trilha){var n=document.querySelector(".topo .trilha");'
             'n.innerHTML=\'<a href="#">Console</a><svg class="ico ico-s" aria-hidden="true"><use href="#i-dir"/></svg><span>Comercial</span><svg class="ico ico-s" aria-hidden="true"><use href="#i-dir"/></svg><a href="interessados.html\'+(p!=="admin"?"?papel="+p:"")+\'">Interessados</a><svg class="ico ico-s" aria-hidden="true"><use href="#i-dir"/></svg><span aria-current="page">\'+t.dataset.trilha+"</span>";'
             'document.title=t.dataset.trilha+" · Interessados · Console T3jus"}'
             'if(p!=="admin")document.querySelectorAll("a[href^=\'interessados.html\']").forEach(function(l){if(l.href.indexOf("papel=")<0)l.href+=(l.href.indexOf("?")<0?"?":"&")+"papel="+p});'
             '})();</script>')
troca('</body>', JS_TRILHA + '\n</body>')

CSS_IN = r"""
/* ==========================================================================
   SC-05 · Interessados (Comercial do Console). Só tokens do D2 e do Gabinete; prefixo in-.
   ========================================================================== */
.in-cab-acao{align-self:flex-end}
.cabeca-ambar.cb-cab.cb-sem-num{align-items:flex-end}
.in-pessoa{display:flex;align-items:center;gap:8px;font-size:13.5px;white-space:nowrap}
.in-pessoa .av-p{flex:none}
.in-ninguem{display:grid;gap:4px;justify-items:start}
.in-ninguem small{font-size:12px;color:var(--vinho-3);font-weight:500;display:flex;gap:4px;align-items:center}
.in-ninguem small .ico{width:14px;height:14px}
.in-passo{display:grid;gap:2px;font-size:13.5px;line-height:1.4}
.in-passo small{font-size:12px;color:var(--texto-2)}
.in-passo small.in-venc{color:var(--vinho-3);font-weight:600;display:flex;align-items:center;gap:4px}
.in-passo small.in-hoje{color:var(--vinho-escuro);font-weight:600}
.in-passo small .ico{width:14px;height:14px}
.in-origem{display:inline-flex;align-items:center;gap:6px;font-size:13px}
.in-origem .ico{width:16px;height:16px;color:var(--vinho-4)}
table.cb-tab tr.in-fim td{color:var(--texto-2)}
.in-funil{list-style:none;margin:4px 0 0;padding:0;display:grid;gap:6px}
.in-funil li{display:grid;grid-template-columns:150px minmax(0,1fr) 22px;gap:10px;align-items:center;font-size:12px}
.in-funil .cb-barra{height:10px;border-radius:5px;background:var(--sal);overflow:hidden}
.in-funil .cb-barra i{display:block;height:100%;border-radius:5px;background:var(--c,var(--vinho))}
.in-funil b{font-weight:600;text-align:right;font-variant-numeric:lining-nums tabular-nums}
/* ficha */
.in-cab .dir .in-passo-g{font-family:var(--serifa);font-size:28px;line-height:1.15;color:var(--vinho);font-weight:500}
.in-cab .dir p{font-size:13px;color:var(--tinta)}
.in-cab .dir .btn{align-self:flex-start;margin-top:4px}
.in-cab .esq .meta .selo{background:var(--sal);color:var(--vinho)}
.in-cab .esq .meta .selo.selo-ativo{background:var(--ambar-3);color:var(--vinho)}
.in-dl{margin:0;padding:0 24px 18px;display:grid;grid-template-columns:180px minmax(0,1fr);gap:0}
.in-dl dt,.in-dl dd{padding:11px 0;border-top:1px solid var(--divisor);font-size:14px;margin:0}
.in-dl dt{color:var(--texto-2)}
.in-dl dd{font-weight:500;overflow-wrap:anywhere}
.in-dl dt:first-of-type,.in-dl dt:first-of-type+dd{border-top:0}
.in-dl dd small{display:block;font-weight:400;font-size:12px;color:var(--texto-2)}
.in-dl dd a{color:var(--vinho)}
.in-msg{margin:0 24px 20px;font-family:var(--serifa);font-style:italic;font-size:17px;line-height:1.45;color:var(--vinho);padding-left:14px;border-left:2px solid var(--ambar)}
.in-lgpd{margin:0 24px 22px;padding:16px 18px;border-radius:var(--raio);background:var(--sal-2);display:grid;gap:10px;font-size:13px;line-height:1.5}
.in-lgpd .in-l-topo{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.in-lgpd .in-l-topo b{font-weight:600;font-size:14px}
.in-lgpd blockquote{margin:0;padding:10px 14px;background:var(--papel);border-radius:8px;box-shadow:inset 0 0 0 1px var(--borda-folha);color:var(--texto)}
.in-lgpd ul{list-style:none;margin:0;padding:0;display:grid;gap:4px;color:var(--texto-2)}
.in-lgpd ul b{color:var(--texto);font-weight:500}
.in-caminho{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 4px}
.in-caminho .ico{color:var(--vinho-4)}
.in-estagios{display:grid;gap:8px}
.in-estagios .opcao{margin:0}
.in-vai{list-style:none;margin:0;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);display:grid;gap:8px;font-size:13px}
.in-vai li{display:flex;gap:8px;align-items:flex-start}
.in-vai .ico{width:16px;height:16px;color:var(--vinho);margin-top:2px;flex:none}
.in-veio{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:500;color:var(--vinho-2);margin-left:8px}
.in-veio .ico{width:13px;height:13px}
.in-fim-box{display:grid;gap:8px}
.in-fim-box .in-motivo{font-family:var(--serifa);font-style:italic;font-size:16px;color:var(--vinho);line-height:1.4}
@media (max-width:760px){
  .in-cab-acao{align-self:stretch}.in-cab-acao .btn{width:100%}
  .cabeca-ambar.cb-cab.cb-sem-num{flex-direction:column;align-items:stretch}
  .in-dl{grid-template-columns:1fr}.in-dl dt{padding-bottom:0;border-top:1px solid var(--divisor)}.in-dl dd{border-top:0;padding-top:2px}
  .in-dl dt:first-of-type{border-top:0}
  .in-funil li{grid-template-columns:120px minmax(0,1fr) 22px}
  .in-cab .dir .in-passo-g{font-size:24px}
}
@media (max-width:900px){.grade>aside.col{order:-1}}
.form-folha textarea.entrada{width:100%}
"""
troca('</style>', CSS_IN + '\n.grade{grid-template-columns:minmax(0,1fr) 340px;align-items:start}\n.cb-fat-cab{position:relative;overflow:hidden;isolation:isolate}.cb-fat-cab .estatua{position:absolute;right:40px;bottom:-30px;width:250px;height:250px;color:var(--vinho-2);z-index:-1;stroke-width:1.1}\n@media (max-width:900px){.grade{grid-template-columns:minmax(0,1fr)}.cb-fat-cab .estatua{width:150px;height:150px;right:-18px;bottom:-24px}}\n</style>')
MOLDURA = s

# ---------------------------------------------------------------- dados fictícios (hoje: 21/11/2026)
EST = {  # estágio: (classe do selo, ícone)
    'Novo': ('selo-atencao', 'mais'), 'Em contato': ('selo-ok', 'telefone'), 'Demonstração marcada': ('selo-implant', 'agenda'),
    'Proposta enviada': ('selo-neutro', 'envelope'), 'Virou cliente': ('selo-ativo', 'check'), 'Perdido': ('selo-apagada', 'x'), 'Descartado': ('selo-apagada', 'arquivar')}
ORIG = {'Site': 'link', 'Indicação': 'pessoas', 'Evento': 'agenda', 'Contato direto': 'envelope'}
PESSOAS = {'Rafael Teles': 'RT', 'Carol Andrade': 'CA'}


def sel(e):
    c, i = EST[e]
    return f'<span class="selo {c}">{ico(i)}{e}</span>'


LISTA = [  # escritório, pessoa, cidade, origem, chegou, estágio, responsável, passo, quando, tipo do prazo (venc/hoje/''), link
    ('Jatobá Advocacia Previdenciária', 'Lívia Prado', 'Teresina, PI', 'Site', '21/11/2026, 09h14', 'Novo', None, 'Responder o pedido', 'até 22/11', '', 'ficha&estado=novo'),
    ('Angico Advocacia Trabalhista', 'Débora Sales', 'Parnaíba, PI', 'Evento', '06/11/2026', 'Em contato', 'Rafael Teles', 'Mandar o vídeo do Financeiro', 'venceu em 18/11', 'venc', ''),
    ('Sucupira Advogados Associados', 'Otávio Reis', 'São Luís, MA', 'Site', '10/11/2026', 'Proposta enviada', 'Carol Andrade', 'Ligar para saber da proposta', 'venceu em 19/11', 'venc', ''),
    ('Ipê &amp; Moura Advogados', 'Henrique Moura', 'Teresina, PI', 'Site', '20/11/2026, 16h42', 'Em contato', 'Rafael Teles', 'Marcar a demonstração', 'hoje', 'hoje', 'ficha&estado=ver'),
    ('Umbu Advocacia de Família', 'Patrícia Nóbrega', 'Fortaleza, CE', 'Indicação', '14/11/2026', 'Demonstração marcada', 'Carol Andrade', 'Demonstração por vídeo', '25/11, 15h', '', ''),
    ('Baru Advocacia', 'Caio Mendes', 'Natal, RN', 'Site', '03/11/2026', 'Virou cliente', 'Carol Andrade', 'Cliente desde 18/11/2026', '', 'fim', ''),
    ('Carnaúba &amp; Rios Advogados', 'Márcia Rios', 'Recife, PE', 'Site', '28/10/2026', 'Perdido', 'Rafael Teles', 'Escolheu outro sistema', '', 'fim', 'ficha&estado=perdido'),
    ('Teste', 'teste', 'sem cidade', 'Site', '30/10/2026', 'Descartado', None, 'Pedido de teste', '', 'fim', 'ficha&estado=descartado'),
]


def pessoa(nome):
    if not nome:
        return '<span class="cb-peq">ninguém</span>'
    return f'<span class="in-pessoa"><span class="av-p" aria-hidden="true">{PESSOAS[nome]}</span>{nome}</span>'


def passo_cel(passo, quando, tipo):
    if tipo == 'fim':
        return f'<div class="in-passo"><span>{passo}</span></div>'
    cls = {'venc': ' class="in-venc"', 'hoje': ' class="in-hoje"'}.get(tipo, '')
    ic = ico('alerta') if tipo == 'venc' else ''
    return f'<div class="in-passo"><span>{passo}</span><small{cls}>{ic}{quando}</small></div>'


def linhas(itens):
    tr = ''
    for esc, p, cid, org, cheg, est, resp, passo, quando, tipo, lk in itens:
        href = f'interessados.html?aba={lk}' if lk else '#'
        if resp:
            rcel = pessoa(resp)
        elif est == 'Novo':
            rcel = f'<div class="in-ninguem"><button class="btn btn-sec btn-compacto" type="button">{ico("pessoa-mais")}Ficar com ele</button><small>{ico("alerta")}sem responsável</small></div>'
        else:
            rcel = pessoa(None)
        tr += (f'<tr{" class=" + chr(34) + "in-fim" + chr(34) if tipo == "fim" else ""}><td><div class="cb-esc"><a href="{href}">{esc}</a><small>{p} · {cid}</small></div></td>'
               f'<td><span class="in-origem">{ico(ORIG[org])}{org}</span></td><td class="num">{cheg.split(",")[0]}</td><td>{sel(est)}</td><td>{rcel}</td>'
               f'<td>{passo_cel(passo, quando, tipo)}</td><td><a class="cb-ir" href="{href}" aria-label="Abrir {esc.replace("&amp;", "e")}">{ico("dir")}</a></td></tr>')
    return tr


def cartoes(itens):
    li = ''
    for esc, p, cid, org, cheg, est, resp, passo, quando, tipo, lk in itens:
        href = f'interessados.html?aba={lk}' if lk else '#'
        li += (f'<li class="cb-cartao"><div class="cb-c-topo"><div><a class="cb-c-nome" href="{href}">{esc}</a><small>{p} · {cid}</small></div></div>'
               f'<div class="cb-sit">{sel(est)}</div>{passo_cel(passo, quando, tipo)}'
               f'<dl><dt>Origem</dt><dd>{org}</dd><dt>Chegou em</dt><dd>{cheg.split(",")[0]}</dd><dt>Responsável</dt><dd>{resp or ("ninguém ainda" if est == "Novo" else "ninguém")}</dd></dl></li>')
    return li


FUNIL = [('Novo', 1, 'var(--ambar)'), ('Em contato', 2, 'var(--vinho-4)'), ('Demonstração marcada', 1, 'var(--vinho-3)'), ('Proposta enviada', 1, 'var(--vinho-2)'), ('Virou cliente', 1, 'var(--vinho)')]
NUMEROS = ('<section class="folha" aria-labelledby="t-num"><h2 id="t-num" class="sr">Resumo dos interessados</h2><dl class="cb-numeros" style="margin:0">'
           '<div><dt>Sem responsável</dt><dd class="cb-grande cb-urg">1</dd><dd><small>pedido do site de hoje, 09h14. Responda até amanhã.</small></dd></div>'
           '<div><dt>Próximo passo vencido</dt><dd class="cb-grande cb-urg">2</dd><dd><small>Angico (3 dias) e Sucupira (2 dias)</small></dd></div>'
           '<div><dt>Pedidos em novembro</dt><dd class="cb-grande">6</dd><dd><small>5 pelo site, 1 por indicação. <b>1 virou cliente.</b></small></dd></div>'
           '<div><dt>Em andamento, por estágio</dt><dd><ul class="in-funil" aria-label="Interessados por estágio">'
           + ''.join(f'<li><span>{n}</span><span class="cb-barra" aria-hidden="true"><i style="width:{q * 40}%;--c:{c}"></i></span><b>{q}</b></li>' for n, q, c in FUNIL)
           + '</ul></dd></div></dl></section>')


def ferramentas(ativo='Em andamento (5)', busca=''):
    chips = ['Em andamento (5)', 'Novos (1)', 'Vencidos (2)', 'Clientes (1)', 'Perdidos e descartados (2)', 'Todos (8)']
    c = ''.join(f'<button type="button" aria-pressed="{"true" if x == ativo else "false"}">{x}</button>' for x in chips)
    return (f'<div class="ferramentas" style="flex-wrap:wrap"><div class="campo-busca"><label class="sr" for="in-busca">Buscar interessado</label>{ico("busca")}'
            f'<input class="entrada" id="in-busca" type="search" value="{busca}" placeholder="Escritório, pessoa, e-mail ou cidade"></div>'
            '<label class="sr" for="in-resp">Responsável</label><select id="in-resp"><option>Responsável: todos</option><option>Os meus</option><option>Sem responsável</option><option>Carol Andrade</option><option>Rafael Teles</option></select>'
            '<label class="sr" for="in-orig">Origem</label><select id="in-orig"><option>Origem: todas</option><option>Site</option><option>Indicação</option><option>Evento</option><option>Contato direto</option></select>'
            f'<div class="chips" role="group" aria-label="Estágio" style="margin-left:0;flex-basis:100%">{c}</div></div>')


def tabela(itens, rot='Interessados em andamento, dos que pedem atenção primeiro'):
    return (f'<table class="cb-tab so-pc"><caption class="sr">{rot}</caption><colgroup><col style="width:25%"><col style="width:10%"><col style="width:10%"><col style="width:17%"><col style="width:15%"><col style="width:19%"><col style="width:64px"></colgroup>'
            '<thead><tr><th scope="col">Interessado</th><th scope="col">Origem</th><th scope="col">Chegou em</th><th scope="col">Estágio</th><th scope="col">Responsável</th><th scope="col">Próximo passo</th><th scope="col"><span class="sr">Abrir</span></th></tr></thead>'
            f'<tbody>{linhas(itens)}</tbody></table><ul class="cb-cartoes so-cel" aria-label="{rot}">{cartoes(itens)}</ul>')


ANDAMENTO = LISTA[:5]
T = ''
T += tpl('lista:ver', NUMEROS + '<section class="folha" aria-labelledby="t-lista" style="overflow:hidden"><h2 id="t-lista" class="sr">Interessados</h2>' + ferramentas() + tabela(ANDAMENTO)
         + '<div class="mais"><span>5 em andamento. Os encerrados ficam em “Clientes” e “Perdidos e descartados”.</span></div></section>')
T += tpl('lista:todos', NUMEROS + '<section class="folha" aria-labelledby="t-lista" style="overflow:hidden"><h2 id="t-lista" class="sr">Interessados</h2>' + ferramentas('Todos (8)') + tabela(LISTA, 'Todos os interessados')
         + '<div class="mais"><span>Mostrando os 8 interessados</span></div></section>')
T += tpl('lista:vazio', f'<div class="estado" role="status"><span class="icone-estado">{ico("maleta")}</span><h3>Nenhum interessado ainda</h3>'
         '<p>Os pedidos de demonstração do site entram aqui sozinhos, com a data, a origem e a autorização que a pessoa marcou. Quem chegou por indicação ou evento você cadastra à mão.</p>'
         f'<div class="acoes"><button class="btn btn-pri" type="button">{ico("mais")}Cadastrar interessado</button></div></div>')
ESQ = ''.join('<div style="display:flex;gap:16px;align-items:center;padding:16px 0;border-top:1px solid var(--sal)"><div style="flex:1;display:grid;gap:8px"><span class="esqueleto esq-linha" style="width:45%;height:14px"></span><span class="esqueleto esq-linha" style="width:25%;height:10px"></span></div><span class="esqueleto esq-linha" style="width:120px;height:26px"></span><span class="esqueleto esq-linha" style="width:140px;height:14px"></span></div>' for _ in range(5))
T += tpl('lista:carregando', '<div aria-busy="true"><p class="sr" role="status">Carregando os interessados…</p><div aria-hidden="true" style="display:grid;gap:24px"><section class="folha" style="padding:22px 24px;display:grid;grid-template-columns:repeat(4,1fr);gap:24px">'
         + '<div style="display:grid;gap:10px"><span class="esqueleto esq-linha" style="width:70%;height:10px"></span><span class="esqueleto esq-linha" style="width:40%;height:28px"></span></div>' * 4
         + f'</section><section class="folha" style="padding:16px 24px">{ESQ}</section></div></div>')
T += tpl('lista:erro', f'<div class="estado estado-erro" role="alert"><span class="icone-estado">{ico("alerta")}</span><h3>Não deu para carregar os interessados</h3>'
         '<p>O servidor não respondeu. Nada se perdeu: os pedidos que chegarem pelo site enquanto isso ficam guardados e aparecem aqui. Tente de novo em instantes; se continuar, mande o código ao suporte.</p>'
         f'<div class="acoes"><button class="btn btn-pri" type="button">{ico("reenviar")}Tentar de novo</button></div><p class="codigo">Código para o suporte: CNS-4B18-2207</p></div>')
T += tpl('lista:sem-resultado', NUMEROS + '<section class="folha" aria-labelledby="t-lista" style="overflow:hidden"><h2 id="t-lista" class="sr">Interessados</h2>' + ferramentas('Todos (8)', 'Cajueiro')
         + f'<div class="estado" role="status" style="border:0;box-shadow:none"><span class="icone-estado">{ico("busca")}</span><h3>Nenhum interessado com “Cajueiro”</h3><p>Confira a grafia ou busque pelo e-mail. Se a pessoa chegou por telefone, cadastre o interessado à mão.</p>'
         f'<div class="acoes"><button class="btn btn-sec" type="button">Limpar a busca</button></div></div></section>')
T += tpl('lista:sem-permissao', f'<div class="estado estado-erro" role="status"><span class="icone-estado">{ico("cadeado")}</span><h1 style="font-size:30px">Esta página é da Administração e da Implantação</h1>'
         '<p>Os interessados têm nome, e-mail e WhatsApp de quem pediu demonstração. Por isso só quem atende o comercial vê. Se você precisa ver, peça à Administração.</p></div>', sem_cabeca=True)

# ---------------------------------------------------------------- ficha
def cab(nome, sobre, selo_html, meta, dir_html, icone='maleta'):
    m = '<span class="sep" aria-hidden="true"></span>'.join(f'<span>{x}</span>' for x in meta)
    return (f'<div class="cb-fat-cab in-cab"><div class="esq campo-vinho">{ico(icone, "ico estatua")}<a class="cb-voltar" href="interessados.html">{ico("esq", "ico ico-s")}Interessados</a>'
            f'<div><p class="sobretitulo">{sobre}</p><h1>{nome}</h1></div><p class="meta">{selo_html}<span class="sep" aria-hidden="true"></span>{m}</p></div>'
            f'<section class="dir campo-ambar" aria-labelledby="t-dir">{dir_html}</section></div>')


def dir_passo(passo, quando, quem, alerta=False):
    q = f'<b>{quando}</b>' + (f' · {quem}' if quem else '')
    return (f'<p class="sobretitulo" id="t-dir">Próximo passo</p><p class="in-passo-g">{passo}</p><p>{q}</p>'
            f'<button class="btn btn-sec so-pode" type="button" data-janela="janela-passo">{ico("lapis")}Mudar o próximo passo</button>')


def pedido(nome, esc, email, whats, tam, area, cidade, msg, chegou):
    return (f'<section class="folha" aria-labelledby="t-pedido" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-pedido">Pedido de demonstração</h2><p class="sub">Como chegou do site em {chegou}. O que a pessoa escreveu não muda.</p></div></div>'
            f'<dl class="in-dl"><dt>Nome</dt><dd>{nome}</dd><dt>Escritório</dt><dd>{esc}</dd><dt>E-mail</dt><dd><a href="#">{email}</a></dd><dt>WhatsApp</dt><dd>{whats}</dd>'
            f'<dt>Tamanho</dt><dd>{tam}</dd><dt>Área de atuação</dt><dd>{area}</dd><dt>Cidade</dt><dd>{cidade}</dd></dl>'
            + (f'<p class="in-msg">“{msg}”</p>' if msg else '') + '</section>')


def lgpd(data, hora):
    return (f'<section class="folha" aria-labelledby="t-lgpd" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-lgpd">Autorização de dados</h2><p class="sub">Guardada com o pedido. Não dá para editar.</p></div></div>'
            f'<div class="in-lgpd"><p class="in-l-topo"><span class="selo selo-ok">{ico("check")}Autorizou</span><b>em {data}, às {hora}</b><span class="cb-peq">horário de Brasília · formulário de t3jus.pro/demonstracao</span></p>'
            '<blockquote>“Autorizo o T3jus a usar estes dados para responder ao meu pedido de demonstração, como diz a Política de privacidade.”</blockquote>'
            '<ul><li><b>Texto aceito:</b> versão 1, de 21/11/2026, com o link para a Política de privacidade da época</li>'
            '<li><b>Para quê:</b> responder ao pedido e marcar a demonstração. Nada de propaganda.</li>'
            '<li><b>Até quando:</b> se não virar cliente, os dados são apagados 12 meses depois do último contato, ou antes, se a pessoa pedir.</li></ul></div></section>')


def notas(lista):
    li = ''.join(f'<li><blockquote>“{t}”</blockquote><footer><span class="av-p" aria-hidden="true">{PESSOAS[q]}</span>{q} · <time>{d}</time></footer></li>' for t, q, d in lista)
    return ('<section class="folha" aria-labelledby="t-notas"><div class="folha-cab"><div><h2 id="t-notas">Notas</h2><p class="sub">Só a equipe T3jus vê. Depois de salva, a nota não muda nem sai.</p></div></div>'
            '<form class="form-folha" action="#" novalidate style="padding-top:0"><div class="campo c6"><label for="nota" class="sr">Nota nova</label><textarea class="entrada" id="nota" rows="2" placeholder="Escreva uma nota sobre a conversa"></textarea></div>'
            f'<div class="form-pe" style="grid-column:span 6"><button class="btn btn-sec" type="submit">{ico("pena")}Salvar nota</button></div></form>'
            + (f'<ol class="lista notas" reversed>{li}</ol>' if li else '') + '</section>')


def historico(dias):
    h = ''
    for dia, evs in dias:
        e = ''.join(f'<li><time>{hr}</time><span class="pto{" forte" if f else ""}" aria-hidden="true"></span><div><p>{t}</p>{("<small>" + sm + "</small>") if sm else ""}</div></li>' for hr, t, sm, f in evs)
        h += f'<div class="eventos-dia"><h3>{dia}</h3><ol class="eventos">{e}</ol></div>'
    return ('<section class="folha" aria-labelledby="t-hist"><div class="folha-cab"><div><h2 id="t-hist">Histórico</h2><p class="sub">Quem fez o quê, e quando. Nada aqui é apagado.</p></div></div>'
            f'<div style="padding:0 24px 8px">{h}</div></section>')


def acoes(fim=False):
    if fim:
        return ''
    return ('<section class="folha so-pode" aria-labelledby="t-acoes"><div class="folha-cab" style="padding-bottom:8px"><h2 id="t-acoes" style="font-size:20px">O que fazer</h2></div><div class="cb-acoes">'
            f'<button class="btn btn-pri" type="button" data-janela="janela-converter">{ico("escritorios")}Virar escritório cliente</button>'
            f'<button class="btn btn-sec" type="button" data-janela="janela-mudar">{ico("trocar")}Mudar estágio</button>'
            f'<button class="btn btn-sec" type="button" data-janela="janela-perder">{ico("x")}Perdido ou descartado</button>'
            f'<p class="permissao">{ico("ajuda")}Mudar de estágio pede um motivo, que fica no histórico.</p></div></section>')


def lateral_resp(resp, desde):
    if resp:
        corpo = (f'<div style="padding:0 20px 18px;display:grid;gap:12px">{pessoa(resp)}<p class="cb-peq">Desde {desde}</p>'
                 f'<button class="btn btn-sec so-pode" type="button" data-janela="janela-atribuir">{ico("trocar")}Trocar o responsável</button></div>')
    else:
        corpo = (f'<div style="padding:0 20px 18px;display:grid;gap:10px"><p class="cb-peq">Ninguém cuida deste pedido ainda.</p>'
                 f'<button class="btn btn-pri" type="button">{ico("pessoa-mais")}Ficar com ele</button><button class="btn btn-sec" type="button" data-janela="janela-atribuir">Atribuir a outra pessoa</button></div>')
    return f'<section class="folha" aria-labelledby="t-resp"><div class="folha-cab" style="padding-bottom:8px"><h2 id="t-resp" style="font-size:20px">Responsável</h2></div>{corpo}</section>'


def origem(o, det):
    return (f'<section class="folha" aria-labelledby="t-org"><div class="folha-cab" style="padding-bottom:8px"><h2 id="t-org" style="font-size:20px">Origem</h2></div>'
            f'<dl class="cb-dl"><div><dt>Como chegou</dt><dd>{o}</dd></div>{det}</dl></section>')


def grade(main, aside):
    return f'<div class="grade"><div class="col">{main}</div><aside class="col" aria-label="Responsável e ações">{aside}</aside></div>'


# Ipê & Moura (ficha principal, em contato)
IPE_CAB = cab('Ipê &amp; Moura Advogados', 'Interessado · chegou pelo site em 20/11/2026', sel('Em contato'), ['Henrique Moura', 'Teresina, PI', '6 a 10 pessoas'],
              dir_passo('Marcar a demonstração', 'Hoje, 21/11', 'Rafael Teles'))
IPE_PED = pedido('Henrique Moura', 'Ipê &amp; Moura Advogados', 'henrique@ipemoura.exemplo.com.br', '(86) 99734-0921', '6 a 10 pessoas', 'Trabalhista',
                 'Teresina, PI <small>completado pela equipe em 20/11</small>',
                 'Somos 7 e as parcelas dos acordos trabalhistas estão numa planilha que só eu entendo. Quero ver repasses e o carnê.', '20/11/2026, às 16h42')
IPE_NOTAS = [('Henrique prefere conversar depois das 18h. Quer que a sócia, Luana Ipê, participe da demonstração.', 'Rafael Teles', '20/11/2026, 17h20')]
IPE_HIST = [('21/11/2026 · hoje', [('08h30', '<b>Rafael Teles</b> mudou o próximo passo para “Marcar a demonstração”', 'Data: 21/11', False)]),
            ('20/11/2026', [('17h18', '<b>Rafael Teles</b> passou de <b>Novo</b> para <b>Em contato</b>', 'Motivo: “Respondi por WhatsApp. Ele quer marcar para a semana que vem.”', True),
                            ('16h55', '<b>Carol Andrade</b> atribuiu o pedido a <b>Rafael Teles</b>', '', True),
                            ('16h42', '<b>O site</b> registrou o pedido de demonstração, com a autorização de dados', 'Resposta automática enviada a henrique@ipemoura.exemplo.com.br', False)])]
IPE_ASIDE = acoes() + lateral_resp('Rafael Teles', '20/11/2026, por Carol Andrade') + origem('Site', '<div><dt>Página</dt><dd>t3jus.pro/demonstracao</dd></div><div><dt>Campanha</dt><dd>nenhuma</dd></div>')
IPE = IPE_CAB + grade(IPE_PED + lgpd('20/11/2026', '16h42') + notas(IPE_NOTAS) + historico(IPE_HIST), IPE_ASIDE)
FT = dict(sem_abas=True, sem_cabeca=True, trilha='Ipê &amp; Moura Advogados')
T += tpl('ficha:ver', IPE, **FT)

# Jatobá (novo, sem responsável)
JAT_CAB = cab('Jatobá Advocacia Previdenciária', 'Interessado · chegou pelo site hoje, às 09h14', sel('Novo'), ['Lívia Prado', '6 a 10 pessoas'],
              '<p class="sobretitulo" id="t-dir">Próximo passo</p><p class="in-passo-g">Responder o pedido</p><p><b>Até 22/11</b> · 1 dia útil, como o site promete</p>'
              f'<button class="btn btn-pri" type="button">{ico("pessoa-mais")}Ficar com ele</button>')
JAT = JAT_CAB + aviso('atencao', 'Ninguém cuida deste pedido ainda.', 'O site promete resposta em até 1 dia útil. Quem ficar com ele vira o responsável e o próximo passo passa a ser dele.') \
    + grade(pedido('Lívia Prado', 'Jatobá Advocacia Previdenciária', 'livia@jatoba.exemplo.com.br', '(86) 99812-4410', '6 a 10 pessoas', 'Previdenciário', '<span class="cb-peq">não informada</span>',
                   'Hoje controlamos as parcelas numa planilha e os RPVs no caderno. Queremos ver o financeiro e o WhatsApp.', '21/11/2026, às 09h14')
            + lgpd('21/11/2026', '09h14') + notas([]) + historico([('21/11/2026 · hoje', [('09h14', '<b>O site</b> registrou o pedido de demonstração, com a autorização de dados', 'Aviso no sino de Carol Andrade e Rafael Teles · resposta automática enviada a livia@jatoba.exemplo.com.br', False)])]),
            lateral_resp(None, '') + origem('Site', '<div><dt>Página</dt><dd>t3jus.pro/demonstracao</dd></div>'))
T += tpl('ficha:novo', JAT, sem_abas=True, sem_cabeca=True, trilha='Jatobá Advocacia Previdenciária')

# janelas sobre a ficha do Ipê
J_ATR = janela('janela-atribuir', 'Responsável', 'Trocar o responsável', 'Quem fica com o Ipê &amp; Moura passa a ver o próximo passo no Início e recebe os avisos dele.',
               selecao('atr-quem', 'Responsável', ['Rafael Teles · Implantação', 'Carol Andrade · Administração'], 'Carol Andrade · Administração', 'Só aparece quem vê Interessados: Administração e Implantação.')
               + campo('atr-nota', 'Recado para quem assume', 'Henrique quer a demonstração depois das 18h, com a sócia.', area=True, linhas=2, opcional=True),
               f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("trocar")}Trocar o responsável</button>')
T += tpl('ficha:atribuir', IPE + J_ATR, **FT)
J_PASSO = janela('janela-passo', 'Próximo passo', 'Mudar o próximo passo', 'O próximo passo aparece na lista e no Início do responsável. Vencido, fica em destaque.',
                 campo('ps-o-que', 'O que fazer', 'Fazer a demonstração por vídeo', foco=True)
                 + '<div class="cb-duas">' + campo('ps-data', 'Data', '26/11/2026', modo='numeric') + campo('ps-hora', 'Hora', '18h00', opcional=True) + '</div>'
                 + selecao('ps-quem', 'Quem faz', ['Rafael Teles · Implantação', 'Carol Andrade · Administração'], 'Rafael Teles · Implantação'),
                 f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("check")}Salvar</button>')
T += tpl('ficha:proximo', IPE + J_PASSO, **FT)


def j_mudar(motivo='', erro=False):
    est = ''.join(f'<label class="opcao"><input class="marcar" type="radio" name="novo-est"{" checked" if e == "Demonstração marcada" else ""}><span>{e}<small>{d}</small></span></label>'
                  for e, d in [('Em contato', 'Já falamos com a pessoa'), ('Demonstração marcada', 'Com data e hora'), ('Proposta enviada', 'Valor e condições mandados')])
    topo = aviso('urgencia', 'Falta acertar 1 ponto, marcado abaixo.', 'O estágio não mudou.') if erro else ''
    return janela('janela-mudar', 'Mudar estágio', 'Mudar o estágio do Ipê &amp; Moura', 'O estágio só muda com um motivo, que fica no histórico, com o seu nome e a hora.',
                  topo + f'<p class="in-caminho">{sel("Em contato")}{ico("seta")}{sel("Demonstração marcada")}</p>'
                  f'<fieldset class="grupo-opcoes in-estagios"><legend>Novo estágio</legend>{est}</fieldset>'
                  + '<div class="cb-duas">' + campo('m-data', 'Data da demonstração', '26/11/2026', modo='numeric') + campo('m-hora', 'Hora', '18h00') + '</div>'
                  + campo('m-motivo', 'Motivo', motivo, 'Obrigatório. Fica no histórico do interessado, com seu nome e a data.',
                          erro='Escreva o motivo da mudança. Ele fica no histórico.' if erro else '', area=True, linhas=3, foco=True, extra=' aria-required="true"')
                  + '<p class="permissao">' + ico('relogio') + 'O próximo passo vira “Demonstração por vídeo, 26/11 às 18h00”, com Rafael Teles.</p>',
                  f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("trocar")}Mudar estágio</button>')


T += tpl('ficha:mudar', IPE + j_mudar('Henrique confirmou por WhatsApp. Luana Ipê também vai participar.'), **FT)
T += tpl('ficha:mudar-erro', IPE + j_mudar('', True), **FT)

UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']
VEIO = f'<span class="in-veio">{ico("link")}veio do pedido</span>'
J_CONV = f'''<dialog class="janela" id="janela-converter" aria-labelledby="janela-converter-t" aria-describedby="janela-converter-d" data-abrir>
  <form method="dialog" class="janela-form" novalidate>
  <div class="janela-cabeca"><div><p class="sobretitulo">Clientes</p><h2 id="janela-converter-t">Cadastrar escritório</h2></div><button class="fechar" type="button" data-fechar aria-label="Fechar">{ico("x")}</button></div>
  <div class="janela-corpo"><p id="janela-converter-d">O cadastro de sempre, já preenchido com o que veio do Ipê &amp; Moura. Confira e cadastre: nada precisa ser digitado de novo.</p>
      <div class="campo"><label for="c-nome">Nome do escritório{VEIO}</label><input class="entrada" id="c-nome" name="c-nome" type="text" value="Ipê &amp; Moura Advogados" autocomplete="organization" data-foco></div>
      <div class="duas">
        <div class="campo"><label for="c-cidade">Cidade{VEIO}</label><input class="entrada" id="c-cidade" name="c-cidade" type="text" value="Teresina" autocomplete="address-level2"></div>
        <div class="campo"><label for="c-uf">UF</label><select class="entrada" id="c-uf" name="c-uf"><option value="">Escolha</option>{"".join(f"<option{' selected' if u == 'PI' else ''}>{u}</option>" for u in UFS)}</select></div>
      </div>
      <ul class="in-vai" aria-label="Também vai para a ficha do escritório"><li>{ico("pessoas")}<span><b>Contato:</b> Henrique Moura, henrique@ipemoura.exemplo.com.br, (86) 99734-0921</span></li>
      <li>{ico("historico")}<span>O pedido, a autorização, as notas e o histórico do interessado ficam ligados à ficha</span></li>
      <li>{ico("cracha")}<span>Rafael Teles fica atribuído como Implantação</span></li></ul>
      {campo("c-motivo", "Como fechou", "Contrato assinado em 21/11. Henrique e Luana decidiram depois da demonstração.", "Obrigatório. Vai para o histórico do interessado e do escritório.", area=True, linhas=2, extra=' aria-required="true"')}
      <p class="permissao">{ico("ajuda")}O escritório entra “Em implantação”. O sócio dono você convida depois, na aba Sócio, com o e-mail já sugerido.</p></div>
  <div class="janela-pe"><button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("mais")}Cadastrar escritório</button></div>
  </form>
</dialog>'''
T += tpl('ficha:converter', IPE + J_CONV, **FT)

CONV_CAB = cab('Ipê &amp; Moura Advogados', 'Interessado · chegou pelo site em 20/11/2026', sel('Virou cliente'), ['Henrique Moura', 'Teresina, PI', '6 a 10 pessoas'],
               '<p class="sobretitulo" id="t-dir">Agora é cliente</p><p class="in-passo-g">Na carteira, em implantação</p><p>Cadastrado por <b>Rafael Teles</b> em 21/11/2026, às 10h05.</p>'
               f'<a class="btn btn-sec" href="#">{ico("escritorios")}Abrir a ficha do escritório</a>')
CONV_HIST = [('21/11/2026 · hoje', [('10h05', '<b>Rafael Teles</b> cadastrou o escritório <b>Ipê &amp; Moura Advogados</b> a partir deste interessado', 'Motivo: “Contrato assinado em 21/11. Henrique e Luana decidiram depois da demonstração.”', True),
                                    ('10h05', '<b>Rafael Teles</b> passou de <b>Em contato</b> para <b>Virou cliente</b>', '', True)] + IPE_HIST[0][1])] + IPE_HIST[1:]
CONV = CONV_CAB + aviso('sucesso', 'Ipê &amp; Moura agora é escritório cliente.', 'Está na carteira em implantação, com o contato e o histórico do pedido. O próximo passo é convidar o sócio dono, na ficha do escritório.',
                        acoes=f'<a class="btn btn-sec btn-compacto" href="#">{ico("pessoa-mais")}Convidar o sócio</a>') \
    + grade(IPE_PED + lgpd('20/11/2026', '16h42') + historico(CONV_HIST),
            lateral_resp('Rafael Teles', '20/11/2026, por Carol Andrade').replace('so-pode', 'so-pode" hidden data-x="') + origem('Site', '<div><dt>Escritório cliente</dt><dd><a href="#">Ipê &amp; Moura Advogados</a><small>desde 21/11/2026</small></dd></div>'))
T += tpl('ficha:convertido', CONV, **FT)

J_PERDER = janela('janela-perder', 'Encerrar', 'Encerrar o Carnaúba &amp; Rios?', 'O interessado sai da lista em andamento. Nada é apagado e dá para reabrir depois, com motivo.',
                  '<fieldset class="grupo-opcoes in-estagios"><legend>Como termina</legend>'
                  '<label class="opcao"><input class="marcar" type="radio" name="fim" checked><span>Perdido<small>Era um escritório de verdade e não fechou</small></span></label>'
                  '<label class="opcao"><input class="marcar" type="radio" name="fim"><span>Descartado<small>Teste, propaganda, pedido repetido ou fora do público</small></span></label></fieldset>'
                  + selecao('p-por', 'Por que não fechou', ['Escolheu outro sistema', 'Achou caro', 'Não é o momento', 'Parou de responder', 'Falta algo que precisa', 'Outro'], 'Escolheu outro sistema')
                  + campo('p-motivo', 'Motivo', 'Fechou com outro sistema que já lê publicações. Pediu para falar de novo em 2027.', 'Obrigatório. Fica no histórico.', area=True, linhas=2, extra=' aria-required="true"')
                  + campo('p-volta', 'Lembrar de procurar de novo em', '01/03/2027', 'Vira o próximo passo de quem é responsável.', opcional=True, modo='numeric'),
                  f'<button class="btn btn-fantasma" type="button" data-fechar data-foco>Cancelar</button><button class="btn btn-pri" type="submit">{ico("check")}Encerrar como perdido</button>', alerta=True)
CAR_PED = pedido('Márcia Rios', 'Carnaúba &amp; Rios Advogados', 'marcia@carnaubarios.exemplo.com.br', '(81) 98877-1203', '2 a 5 pessoas', 'Cível e consumidor', 'Recife, PE', '', '28/10/2026, às 11h03')
CAR_HIST = [('03/11/2026', [('15h10', '<b>Rafael Teles</b> passou de <b>Novo</b> para <b>Em contato</b>', 'Motivo: “Liguei, ela quer ver em dezembro.”', True)]),
            ('28/10/2026', [('11h03', '<b>O site</b> registrou o pedido de demonstração, com a autorização de dados', '', False)])]
CAR_CAB = cab('Carnaúba &amp; Rios Advogados', 'Interessado · chegou pelo site em 28/10/2026', sel('Em contato'), ['Márcia Rios', 'Recife, PE', '2 a 5 pessoas'],
              dir_passo('Ligar para combinar a demonstração', 'Venceu em 17/11', 'Rafael Teles'))
T += tpl('ficha:perder', CAR_CAB + grade(CAR_PED + lgpd('28/10/2026', '11h03') + historico(CAR_HIST), acoes() + lateral_resp('Rafael Teles', '28/10/2026')) + J_PERDER, sem_abas=True, sem_cabeca=True, trilha='Carnaúba &amp; Rios Advogados')
PERD_CAB = cab('Carnaúba &amp; Rios Advogados', 'Interessado · chegou pelo site em 28/10/2026', sel('Perdido'), ['Márcia Rios', 'Recife, PE', '2 a 5 pessoas'],
               '<p class="sobretitulo" id="t-dir">Perdido em 21/11/2026</p><p class="in-passo-g">Escolheu outro sistema</p><p>Procurar de novo em <b>01/03/2027</b> · Rafael Teles</p>'
               f'<button class="btn btn-sec so-pode" type="button">{ico("reenviar")}Reabrir</button>')
PERD_HIST = [('21/11/2026 · hoje', [('11h40', '<b>Rafael Teles</b> encerrou como <b>Perdido</b> · Escolheu outro sistema', 'Motivo: “Fechou com outro sistema que já lê publicações. Pediu para falar de novo em 2027.”', True)])] + CAR_HIST
T += tpl('ficha:perdido', PERD_CAB + grade(CAR_PED + lgpd('28/10/2026', '11h03') + historico(PERD_HIST),
                                           '<section class="folha" aria-labelledby="t-fim"><div class="folha-cab" style="padding-bottom:8px"><h2 id="t-fim" style="font-size:20px">Por que perdemos</h2></div>'
                                           '<div style="padding:0 20px 18px" class="in-fim-box"><span class="selo selo-neutro">Escolheu outro sistema</span><p class="in-motivo">“Fechou com outro sistema que já lê publicações.”</p>'
                                           '<p class="cb-peq">Os motivos de perda aparecem juntos no filtro “Perdidos e descartados”, para ver o que mais falta no produto.</p></div></section>'),
         sem_abas=True, sem_cabeca=True, trilha='Carnaúba &amp; Rios Advogados')
DESC_CAB = cab('Teste', 'Interessado · chegou pelo site em 30/10/2026', sel('Descartado'), ['teste', 'sem cidade'],
               '<p class="sobretitulo" id="t-dir">Descartado em 30/10/2026</p><p class="in-passo-g">Pedido de teste</p><p>Os dados são apagados em <b>30/10/2027</b>, 12 meses depois, ou antes, a pedido.</p>')
T += tpl('ficha:descartado', DESC_CAB + grade(pedido('teste', 'Teste', 'teste@teste.com', '(11) 11111-1111', 'Só eu', 'não informada', '<span class="cb-peq">não informada</span>', 'teste', '30/10/2026, às 22h51')
                                               + historico([('30/10/2026', [('23h02', '<b>Carol Andrade</b> descartou o pedido · Pedido de teste', 'Motivo: “Fui eu testando o formulário.”', True), ('22h51', '<b>O site</b> registrou o pedido de demonstração, com a autorização de dados', '', False)])]),
                                               '<section class="folha" aria-labelledby="t-fim"><div class="folha-cab" style="padding-bottom:8px"><h2 id="t-fim" style="font-size:20px">Descartado</h2></div>'
                                               '<div style="padding:0 20px 18px" class="in-fim-box"><p class="cb-peq">Não conta nos números do funil. Não dá para virar escritório cliente; se era de verdade, reabra antes.</p>'
                                               f'<button class="btn btn-sec so-pode" type="button">{ico("reenviar")}Reabrir</button></div></section>'),
         sem_abas=True, sem_cabeca=True, trilha='Teste')

s = MOLDURA.replace('<!--IN-->', T)
open(os.path.join(SAIDA, 'interessados.html'), 'w', encoding='utf-8').write(s)
print('interessados ok', T.count('<template data-est='), 'estados')
