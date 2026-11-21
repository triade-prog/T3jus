# Portal · Comercial: Atendimentos, Propostas, Funil, Origem dos contatos.
# AP-02, AP-03, AP-04, AP-05, AP-06, IN-01, PD-02, VA-07. Peças novas com prefixo cm-.
# Uso: python3 comercial.py <pasta-saida>
import sys
from pecas import *

SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
U = 'comercial.html?estado='
FICHA_CL = CLIENTES_URL + '?estado=ficha'
ATEND_CL = CLIENTES_URL + '?estado=atendimentos'

CSS = r"""
/* ==========================================================================
   Portal · Comercial (prefixo cm-)
   ========================================================================== */
/* Atendimentos: retornos do escritório inteiro */
.cm-grupo{padding:4px 0 0}
.cm-grupo>h3{display:flex;align-items:center;gap:10px;font-family:var(--sans);font-size:12px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--vinho-2);padding:14px 24px 8px;border-top:1px solid var(--divisor)}
.cm-grupo:first-of-type>h3{border-top:0}
.cm-grupo>h3 .q{font-size:11px;font-weight:600;background:var(--sal-2);color:var(--vinho-2);border-radius:10px;padding:1px 7px;letter-spacing:0}
.cm-ret{list-style:none;margin:0;padding:0}
.cm-ret li{display:grid;grid-template-columns:64px minmax(0,1.5fr) minmax(0,1.3fr) auto;gap:16px;align-items:center;padding:14px 24px;border-top:1px solid var(--divisor)}
.cm-ret li:first-child{border-top:0}
.cm-ret li.cm-venc{background:#FCF6F2;box-shadow:inset 3px 0 0 var(--vinho-3)}
.cm-dia{display:grid;justify-items:center;gap:2px}
.cm-dia .disco{--d:48px;--f:20px}
.cm-dia small{font-size:11px;color:var(--texto-2);white-space:nowrap}
.cm-quem a{font-family:var(--serifa);font-size:18px;font-weight:500;color:var(--vinho);text-decoration:none;line-height:1.2;display:inline-flex;align-items:center;min-height:44px;margin:-10px 0 -8px}
.cm-quem a:hover{text-decoration:underline;text-underline-offset:3px}
.cm-quem p{font-size:13px;line-height:1.45}
.cm-quem p b{font-weight:500}
.cm-quem .selo{margin-top:6px}
.cm-ult{font-size:12px;color:var(--texto-2);line-height:1.5}
.cm-ult b{color:var(--texto);font-weight:500}
.cm-ret .btn{white-space:nowrap}
.cm-prop{list-style:none;margin:0;padding:0 24px 8px}
.cm-prop li{display:grid;gap:4px;padding:12px 0;border-top:1px solid var(--divisor)}
.cm-prop li:first-child{border-top:0}
.cm-prop a{font-weight:500;color:var(--vinho);text-decoration:none;display:inline-flex;align-items:center;min-height:44px;margin:-10px 0 -10px}
.cm-prop a:hover{text-decoration:underline}
.cm-prop small{font-size:12px;color:var(--texto-2)}
.cm-prop .selo{justify-self:start}
.cm-resp{list-style:none;margin:0;padding:0 24px 16px}
.cm-resp li{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--divisor);font-size:13px}
.cm-resp li:first-child{border-top:0}
.cm-resp li span.n{flex:1;font-weight:500}
.cm-resp li .selo{margin-left:auto}

/* Funil */
.cm-funil{padding:4px 24px 22px}
.cm-f{list-style:none;margin:0;padding:0;display:grid;gap:0}
.cm-f>li{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,300px);gap:0 28px;align-items:center}
.cm-f-faixa{width:var(--w);min-width:170px;margin:0 auto;height:84px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
  clip-path:polygon(0 0,100% 0,calc(100% - 22px) 100%,22px 100%);background:var(--bg);color:#FFFFFF;text-align:center}
.cm-f-faixa b{font-family:var(--serifa);font-size:40px;font-weight:600;line-height:1}
.cm-f-faixa span{font-size:13px;line-height:1.3}
.cm-f .e1 .cm-f-faixa{--bg:var(--vinho);color:var(--sal)}
.cm-f .e2 .cm-f-faixa{--bg:var(--vinho-2)}
.cm-f .e3 .cm-f-faixa{--bg:var(--vinho-3)}
.cm-f-lado{font-size:13px;color:var(--texto-2);line-height:1.45;padding-left:16px;border-left:1px solid var(--divisor)}
.cm-f-lado b{color:var(--texto);font-weight:600}
.cm-f-passa{padding:6px 0}
.cm-f-taxa{justify-self:center;display:inline-flex;align-items:center;gap:6px;margin:0;padding:4px 14px;border-radius:999px;background:var(--papel);border:1px solid var(--borda-folha);
  font-size:13px;color:var(--vinho-2);line-height:1.4;position:relative}
.cm-f-taxa::before{content:"";width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid var(--vinho-2)}
.cm-f-taxa b{font-size:16px;font-weight:600}
.cm-f-perda{padding:8px 0 8px 16px;border-left:1px solid var(--divisor);font-size:13px;line-height:1.45}
.cm-f-perda p{margin:0 0 2px;color:var(--texto)}
.cm-f-perda p b{font-weight:600}
.cm-f-perda ul{list-style:none;margin:0;padding:0;display:grid;gap:1px;color:var(--texto-2)}
.cm-f-perda li{display:grid;grid-template-columns:24px minmax(0,1fr);gap:4px}
.cm-f-perda li b{font-weight:600;color:var(--texto);text-align:right;padding-right:4px}
.cm-f-total{margin:14px 0 0;padding-top:12px;border-top:1px solid var(--divisor);font-size:14px;color:var(--texto-2);text-align:center}
.cm-f-total b{color:var(--vinho-2);font-weight:600}
.cm-colunas{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:20px;padding:0 24px 22px;align-items:start}
.cm-coluna{border-top:3px solid var(--vinho-4);padding:10px 0 0;display:flex;flex-direction:column;gap:8px;min-width:0}
.cm-coluna h3{display:flex;align-items:center;justify-content:space-between;gap:8px;font-family:var(--sans);font-size:13px;font-weight:600;color:var(--vinho);line-height:1.3}
.cm-coluna h3 .disco{--d:28px;--f:14px;--c:var(--sal-2)}
.cm-coluna>p{font-size:12px;color:var(--texto-2);line-height:1.4;min-height:34px}
.cm-coluna ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.cm-card{position:relative;background:var(--papel);border:1px solid var(--borda-folha);border-radius:var(--raio);padding:10px 12px;display:grid;gap:4px;min-height:72px;align-content:start}
.cm-card:hover{border-color:var(--vinho-4)}
.cm-card a{font-family:var(--serifa);font-size:16px;font-weight:500;color:var(--vinho);text-decoration:none;line-height:1.25}
.cm-card a::after{content:"";position:absolute;inset:0;border-radius:var(--raio)}
.cm-card:has(a:focus-visible){outline:3px solid var(--foco);outline-offset:2px}
.cm-card a:focus-visible{outline:none}
.cm-card small{font-size:12px;color:var(--texto-2);line-height:1.4}
.cm-card .selo{justify-self:start;height:22px;font-size:11px}
.cm-coluna.cm-fim{border-top-color:var(--vinho)}
.cm-coluna.cm-fim h3 .disco{--c:var(--vinho);color:var(--papel)}
.cm-motivos{list-style:none;margin:0;padding:0 24px 18px}
.cm-motivos li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;padding:9px 0;border-top:1px solid var(--divisor);font-size:13px}
.cm-motivos li:first-child{border-top:0}
.cm-motivos b{font-weight:500}

/* Origem */
.cm-org-barra{display:grid;gap:4px;min-width:120px}
.cm-org-barra .tons{height:10px;background:var(--sal)}
.cm-org-barra small{font-size:12px;color:var(--texto-2)}
.cm-pct{font-family:var(--serifa);font-size:22px;font-weight:500;color:var(--vinho);line-height:1}
.cm-poucos{display:inline-flex;margin-left:6px}
.cm-oab{display:flex;gap:12px;align-items:flex-start;padding:16px 18px;border-radius:var(--raio-g);background:var(--papel);border:1px solid var(--borda-folha);box-shadow:var(--sombra);font-size:13px;line-height:1.55}
.cm-oab .ico{color:var(--vinho);flex:none;margin-top:2px}
.cm-oab b{font-weight:600;color:var(--vinho)}
.cm-oab ul{margin:6px 0 0;padding-left:18px}

/* Ficha da proposta */
.cm-escopo{padding:0 24px 20px;font-size:14px;line-height:1.6}
.cm-escopo p+p{margin-top:8px}
.cm-escopo .hn-nota{font-size:12px}
.cm-resposta{border:0;margin:0;padding:0;min-width:0}
.cm-resposta legend{font-weight:500;margin-bottom:6px;padding:0}
.cm-resposta .cm-ops{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.cm-resposta .opcao{border:1px solid var(--borda-folha);border-radius:var(--raio);padding:12px 14px;margin:0;background:var(--papel)}
.cm-resposta .opcao:has(input:checked){border-color:var(--vinho);background:var(--ambar-3)}
.cm-dois{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.cm-efeito{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.5}
.cm-efeito .ico{color:var(--vinho);flex:none;margin-top:1px}

@media (max-width:760px){
  .cm-grupo>h3{padding:12px 16px 8px}
  .cm-ret li{grid-template-columns:52px minmax(0,1fr);gap:10px 12px;padding:14px 16px}
  .cm-ret .cm-ult{grid-column:2}
  .cm-ret .btn{grid-column:1/-1;width:100%}
  .cm-dia .disco{--d:44px;--f:18px}
  .cm-prop,.cm-resp,.cm-motivos{padding-left:16px;padding-right:16px}
  .cm-funil{padding:0 16px 16px}
  .cm-f>li{grid-template-columns:1fr;gap:6px}
  .cm-f-faixa{height:72px;min-width:150px;clip-path:polygon(0 0,100% 0,calc(100% - 16px) 100%,16px 100%)}
  .cm-f-faixa b{font-size:32px}
  .cm-f-lado{border-left:0;padding:0;text-align:center;font-size:12px;margin-bottom:4px}
  .cm-f-passa{padding:8px 0}
  .cm-f-perda{border-left:0;border-radius:var(--raio);background:var(--sal-2);padding:10px 12px}
  .cm-colunas{grid-template-columns:1fr;gap:18px;padding:0 16px 16px}
  .cm-coluna>p{min-height:0}
  .cm-card{min-height:0}
  .cm-escopo{padding:0 16px 16px}
  .cm-resposta .cm-ops,.cm-dois{grid-template-columns:1fr}
  .cm-org-barra{min-width:0;width:100%}
}
"""

# ---------------------------------------------------------------- dados fictícios
# (data, dia/rotulo, tipo, cliente, o que fazer, responsável, último atendimento, link)
RET = [
    ('vencido', '10/11', 'há 8 dias', 'Hélio Batista Corrêa', 'Pedir o extrato do benefício de novembro, para calcular os honorários do mês', 'Diego Almeida', '03/11 · telefone · com Marta Corrêa (esposa)'),
    ('vencido', '13/11', 'há 5 dias', 'Antônia Ferreira Prado', 'Ligar para Joana sobre a carta do INSS', 'Diego Almeida', '06/11 · WhatsApp · com Joana Prado (filha)'),
    ('vencido', '17/11', 'ontem', 'Daniela Rocha Mendes', 'Saber se aceita a proposta P-2026-015', 'Diego Almeida', '10/11 · e-mail · proposta enviada'),
    ('hoje', '18/11', 'hoje', 'Gabriela Teixeira', 'Responder à contraproposta: ela pediu 5 parcelas', 'Marina Ribeiro', '18/11 · WhatsApp · pediu mudança'),
    ('semana', '20/11', 'sexta', 'Benedito Souza Lima', 'Colher a assinatura do contrato de honorários', 'Diego Almeida', '17/11 · presencial · aceitou a proposta'),
    ('semana', '25/11', 'quarta', 'Construtora Vale Alto Ltda.', 'Enviar a minuta do contrato de honorários', 'Felipe Matos', '14/11 · videochamada · com Ricardo Vale'),
    ('depois', '30/11', 'segunda', 'Irene Castro', 'Avisar sobre a avaliação do imóvel no inventário', 'Marina Ribeiro', '28/10 · presencial'),
    ('depois', '02/12', 'quarta', 'Farmácia Bom Jesus Ltda.', 'Combinar a lista de devedores de dezembro', 'Felipe Matos', '04/11 · e-mail · com Sueli Ramos'),
]
SEM_PROX = [('Eduardo Nascimento', '04/11 · presencial · passou no escritório', 'Marina Ribeiro')]


def linha_ret(r):
    tipo, data, rot, nome, oque, resp, ult = r
    cls = ' class="cm-venc"' if tipo == 'vencido' else ''
    dcls = {'vencido': 'disco hn-d-urg', 'hoje': 'disco hn-d-hoje'}.get(tipo, 'disco')
    dd, mm = data.split('/')
    s = ''
    if tipo == 'vencido':
        s = selo('urgente', f'vencido {rot}', 'alerta')
    elif tipo == 'hoje':
        s = selo('atencao', 'Hoje', 'relogio')
    sub = '' if tipo in ('vencido', 'hoje') else f'<small>{rot}</small>'
    return (f'<li{cls}><div class="cm-dia"><span class="{dcls}" aria-hidden="true"><span>{dd}</span></span><small>{data}{"" if not sub else ""}</small><span class="sr">{data}, {rot}</span></div>'
            f'<div class="cm-quem"><a href="{ATEND_CL}">{H(nome)}</a><p><b>{oque}</b></p>{s}</div>'
            f'<div class="cm-ult">com <b>{resp}</b><br>Último atendimento: {ult}</div>'
            f'<a class="btn btn-sec btn-compacto" href="{ATEND_CL}">{ico("dir")}Abrir a ficha<span class="sr"> de {H(nome)}</span></a></li>')


def grupo(titulo, itens, n=None):
    q = f'<span class="q">{len(itens) if n is None else n}</span>'
    return f'<div class="cm-grupo"><h3>{titulo}{q}</h3><ul class="cm-ret">{"".join(itens)}</ul></div>'


def cab_atend():
    return ('<div class="cabeca-ambar campo-ambar cabeca-equipe hn-cab-ambar"><div><p class="sobretitulo">Retornos do escritório</p><h1>Atendimentos</h1><span class="fio" aria-hidden="true"></span>'
            '<p class="lede">Quem precisa de retorno, de todos os clientes, por data. Cada conversa se registra na ficha do cliente, que é onde fica o histórico.</p></div></div>')


def numeros(itens, nav=True):
    corpo = ''
    for i, (n, dc, rot, sub, atual) in enumerate(itens):
        a = ' aria-current="true"' if atual else ''
        corpo += (f'<a href="#"{a}><span class="disco {dc}" aria-hidden="true"><span>{n}</span></span><span class="r"><b>{rot}</b>{sub}</span>'
                  f'<span class="sr">: {n}</span></a>')
    return f'<nav class="folha hn-numeros" aria-label="Resumo dos retornos">{corpo}</nav>'


def atendimentos():
    nums = numeros([(3, 'hn-d-urg', 'Vencidos', 'de 5 a 8 dias', False), (1, 'hn-d-hoje', 'Hoje', 'com Marina', False),
                    (2, '', 'Próximos 7 dias', 'até 25/11', False), (1, '', 'Sem próximo contato', 'cliente ativo', False)])
    chips = ('<div class="chips" role="group" aria-label="Responsável"><button type="button" aria-pressed="true">Todos (9)</button>'
             '<button type="button" aria-pressed="false">Diego (4)</button><button type="button" aria-pressed="false">Marina (3)</button>'
             '<button type="button" aria-pressed="false">Felipe (2)</button></div>')
    ferr = (f'<form class="hn-ferr" role="search" action="#" onsubmit="return false"><div class="campo-busca"><label class="sr" for="cm-b">Buscar cliente</label>{ico("busca")}'
            f'<input class="entrada" id="cm-b" type="search" placeholder="Buscar cliente" autocomplete="off"></div>{chips}</form>')
    sem = ''.join(f'<li><div class="cm-dia"><span class="disco" aria-hidden="true"><span>–</span></span><small>sem data</small></div>'
                  f'<div class="cm-quem"><a href="{ATEND_CL}">{n}</a><p>Ninguém marcou quando falar de novo.</p></div>'
                  f'<div class="cm-ult">com <b>{r}</b><br>Último atendimento: {u}</div><a class="btn btn-sec btn-compacto" href="{ATEND_CL}">{ico("dir")}Abrir a ficha<span class="sr"> de {n}</span></a></li>' for n, u, r in SEM_PROX)
    lista = (f'<section class="folha" aria-labelledby="t-ret" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-ret">Quem precisa de retorno</h2>'
             f'<p class="sub">Do mais atrasado para o mais distante. Registrar o atendimento na ficha tira o cliente daqui ou muda a data.</p></div></div>{ferr}'
             + grupo('Vencidos', [linha_ret(r) for r in RET if r[0] == 'vencido'])
             + grupo('Hoje', [linha_ret(r) for r in RET if r[0] == 'hoje'])
             + grupo('Próximos 7 dias', [linha_ret(r) for r in RET if r[0] == 'semana'])
             + grupo('Depois', [linha_ret(r) for r in RET if r[0] == 'depois'])
             + grupo('Sem próximo contato', [sem])
             + '</section>')
    prop = (f'<section class="folha" aria-labelledby="t-pe"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-pe" style="font-size:20px">Propostas esperando resposta</h2></div></div>'
            f'<ul class="cm-prop">'
            f'<li><a href="{U}proposta">P-2026-015 · Daniela Rocha Mendes</a><small>Enviada em 10/11 · com Diego Almeida</small>{selo("urgente", "retorno vencido ontem", "alerta")}</li>'
            f'<li><a href="{U}proposta">P-2026-016 · Gabriela Teixeira</a><small>Em negociação · com Marina Ribeiro</small>{selo("atencao", "retorno hoje", "relogio")}</li>'
            f'<li><a href="{U}proposta">P-2026-013 · Construtora Vale Alto</a><small>Em negociação · com Felipe Matos</small><span class="hn-sem">retorno em 25/11</span></li>'
            f'</ul><div class="hn-folha-acao"><a class="btn btn-sec" href="{U}propostas">{ico("dir")}Ver todas as propostas</a></div></section>')
    resp = (f'<section class="folha" aria-labelledby="t-rp"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-rp" style="font-size:20px">Por responsável</h2>'
            f'<p class="sub">Quem saiu da equipe já não aparece: os retornos dela passaram para outra pessoa.</p></div></div><ul class="cm-resp">'
            f'<li><span class="av-p forte" aria-hidden="true">DA</span><span class="n">Diego Almeida</span>{selo("urgente", "3 vencidos", "alerta")}</li>'
            f'<li><span class="av-p forte" aria-hidden="true">MR</span><span class="n">Marina Ribeiro</span>{selo("atencao", "1 hoje", "relogio")}</li>'
            f'<li><span class="av-p forte" aria-hidden="true">FM</span><span class="n">Felipe Matos</span>{selo("ok", "em dia", "check")}</li></ul></section>')
    return f'<div class="hn">{cab_atend()}{nums}<div class="hn-grade"><div class="hn-col">{lista}</div><aside class="hn-col" aria-label="Também pedem retorno">{prop}{resp}</aside></div></div>'


def atendimentos_vazio():
    return (f'<div class="hn">{cab_atend()}<section class="folha" aria-labelledby="t-ret" style="overflow:hidden"><h2 id="t-ret" class="sr">Quem precisa de retorno</h2>'
            + estado('Nenhum retorno marcado ainda',
                     'Os retornos nascem do atendimento: ao registrar uma conversa na ficha do cliente, marque quando falar de novo e com quem. Eles aparecem aqui, para o escritório inteiro.',
                     'relogio', moldura=False,
                     acoes=f'<a class="btn btn-pri" href="{CLIENTES_URL}?estado=lista">{ico("pessoas")}Abrir Clientes</a>')
            + '</section></div>')


# ---------------------------------------------------------------- propostas
SIT = {
    'rascunho': ('neutro', 'Rascunho', 'lapis'),
    'enviada': ('andamento', 'Enviada', 'enviar'),
    'negociacao': ('atencao', 'Em negociação', 'conversas'),
    'aceita': ('ativo', 'Aceita', 'check'),
    'contrato': ('ok', 'Virou contrato', 'pena'),
    'recusada': ('neutro', 'Recusada', 'x'),
}


def selo_sit(k):
    t, n, i = SIT[k]
    return selo(t, n, i)


# (nº, cliente, PF/PJ, serviço, honorários (selos), resp, retorno(texto, tipo), situação)
PROPS = [
    ('P-2026-017', 'Marcos Vinícius Duarte', 'Trabalhista · vínculo com aplicativo', [('fixo', ' R$ 500,00'), ('exito', ' 30%')], 'Marina Ribeiro', ('criada hoje', ''), 'rascunho'),
    ('P-2026-016', 'Gabriela Teixeira', 'Divórcio consensual', [('parcelado', ' 4 × R$ 1.000,00')], 'Marina Ribeiro', ('Hoje', 'hoje'), 'negociacao'),
    ('P-2026-015', 'Daniela Rocha Mendes', 'Revisão de contrato bancário', [('fixo', ' R$ 1.500,00'), ('exito', ' 20%')], 'Diego Almeida', ('17/11 · vencido ontem', 'vencido'), 'enviada'),
    ('P-2026-014', 'Benedito Souza Lima', 'Aposentadoria por idade', [('parcelado', ' 3 ×'), ('exito', ' 30%'), ('recorrente', ' 30%')], 'Diego Almeida', ('20/11 · sexta', ''), 'aceita'),
    ('P-2026-013', 'Construtora Vale Alto Ltda.', 'Reclamações trabalhistas', [('mensal', ' R$ 2.500,00'), ('ato', ' R$ 600,00')], 'Felipe Matos', ('25/11 · quarta', ''), 'negociacao'),
]


def lista_props(itens):
    linhas = []
    for n, cli, srv, hon, resp, (ret, rt), sit in itens:
        r = (selo('urgente', ret, 'alerta') if rt == 'vencido' else selo('atencao', ret, 'relogio') if rt == 'hoje' else f'<span class="num">{ret}</span>')
        href = U + ('proposta-aceita' if sit == 'aceita' else 'proposta')
        selos = '<div class="hn-selos">' + ''.join(selo_tipo(k, v) for k, v in hon) + '</div>'
        cls = 'hn-venc' if rt == 'vencido' else ''
        linhas.append(([f'<div class="esc"><div><a href="{href}">{H(cli)}</a><small>{n} · {srv}</small></div></div>', selos, f'{resp}', r, selo_sit(sit)], cls))
    return tabela('Propostas', ['Proposta', 'Honorários', 'Responsável', 'Retorno', 'Situação'], linhas, ['30%', '27%', '15%', '15%', '13%'])


def cab_props():
    return ('<div class="cabeca-ambar campo-ambar cabeca-equipe hn-cab-ambar"><div><p class="sobretitulo">Comercial</p><h1>Propostas</h1><span class="fio" aria-hidden="true"></span>'
            '<p class="lede">O que o escritório ofereceu, para quem, por quanto e quem acompanha. A proposta aceita vira contrato com as mesmas condições, sem redigitar.</p></div>'
            f'<a class="btn btn-escuro" href="{U}proposta-nova" style="margin-bottom:6px">{ico("mais")}Nova proposta</a></div>')


def propostas():
    chips = ('<div class="chips" role="group" aria-label="Mostrar"><button type="button" aria-pressed="true">Em andamento (5)</button>'
             '<button type="button" aria-pressed="false">Viraram contrato (9)</button><button type="button" aria-pressed="false">Recusadas (5)</button></div>')
    ferr = (f'<form class="hn-ferr" role="search" action="#" onsubmit="return false"><div class="campo-busca"><label class="sr" for="pr-b">Buscar por cliente ou número</label>{ico("busca")}'
            f'<input class="entrada" id="pr-b" type="search" placeholder="Cliente ou número da proposta" autocomplete="off"></div>{chips}</form>')
    return (f'<div class="hn">{cab_props()}<section class="folha" aria-labelledby="t-pl" style="overflow:hidden"><h2 id="t-pl" class="sr">Lista de propostas</h2>{ferr}'
            f'<p class="hn-cont" role="status"><b>5 propostas em andamento</b> · 1 com o retorno vencido · 1 aceita esperando o contrato</p>{lista_props(PROPS)}'
            f'<p class="hn-pe">{ico("historico")}<span>Proposta não se apaga. A recusada fica guardada com o motivo, e é dela que sai a conta de conversão do <a href="{U}funil">Funil</a>.</span></p></section></div>')


def propostas_vazio():
    return (f'<div class="hn">{cab_props()}<section class="folha" aria-labelledby="t-pl" style="overflow:hidden"><h2 id="t-pl" class="sr">Lista de propostas</h2>'
            + estado('Nenhuma proposta ainda',
                     'Escreva o serviço e as condições de honorário uma vez. Se o cliente aceitar, o contrato nasce com elas. A proposta é para quem já procurou o escritório e está em Clientes.',
                     'pena', moldura=False, acoes=f'<a class="btn btn-pri" href="{U}proposta-nova">{ico("mais")}Escrever a primeira proposta</a>')
            + '</section></div>')


# ---------------------------------------------------------------- ficha da proposta
def ficha_cab_p(numero, titulo, sit, cliente, extra, dir_html):
    return (f'<div class="ficha-cab"><div class="esq campo-vinho">{ico("maleta", "ico estatua")}'
            f'<a class="voltar" href="{U}propostas">{ico("esq", "ico ico-s")}Propostas</a>'
            f'<div class="ident"><div><p class="sobretitulo">Proposta {numero}</p><h1>{titulo}</h1>'
            f'<p class="meta">{sit}<span>para {cliente}</span><span class="sep" aria-hidden="true"></span><span>{extra}</span></p></div></div></div>{dir_html}</div>')


COND_GAB = [cond_ler('parcelado', 'R$ 4.000,00 <small>em 4 parcelas de R$ 1.000,00</small>', 'Todo dia 15, de 15/12/2026 a 15/03/2027.',
                     'Vira 4 recebimentos programados, quando o contrato for assinado.')]


def hist_prop():
    def ev(h, quem, txt, sub='', s=''):
        return (f'<li><time>{h}</time><span class="pto" aria-hidden="true"></span><div><p><b>{quem}</b> {txt}{s}</p>'
                + (f'<small>{sub}</small>' if sub else '') + '</div></li>')
    return (f'<section class="folha" aria-labelledby="t-hp" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-hp">Histórico da proposta</h2>'
            f'<p class="sub">Cada mudança e cada resposta, com quem e quando. Nada se apaga.</p></div></div>'
            f'<div class="eventos-dia"><h3>18/11/2026 · hoje</h3><ol class="eventos">{ev("09h12", "Marina Ribeiro", "registrou a resposta: pediu mudança", "Gabriela pediu 5 parcelas no lugar de 4, por WhatsApp.", selo("atencao", "Em negociação"))}</ol></div>'
            f'<div class="eventos-dia"><h3>12/11/2026</h3><ol class="eventos">{ev("16h40", "Marina Ribeiro", "marcou como enviada", "Mandou o arquivo da proposta por e-mail para Gabriela.", selo("andamento", "Enviada"))}</ol></div>'
            f'<div class="eventos-dia"><h3>11/11/2026</h3><ol class="eventos">{ev("10h05", "Marina Ribeiro", "escreveu a proposta", "Depois do atendimento presencial de 11/11.")}</ol></div></section>')


def lateral_prop(cliente='Gabriela Teixeira', origem='Indicação de cliente', resp='Marina Ribeiro'):
    cli = (f'<section class="folha" aria-labelledby="t-pc"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-pc" style="font-size:20px">Cliente</h2></div></div>'
           f'<dl class="hn-dl"><div><dt>Nome</dt><dd><a href="{FICHA_CL}">{cliente}</a></dd></div><div><dt>Como chegou</dt><dd>{origem}</dd></div>'
           f'<div><dt>Responsável</dt><dd>{resp}</dd></div><div><dt>Vale até</dt><dd>30/11/2026</dd></div></dl>'
           f'<div class="hn-folha-acao"><a class="btn btn-sec" href="#">{ico("baixar")}Baixar a proposta (.docx)</a><a class="btn btn-sec" href="#">{ico("lapis")}Editar a proposta</a></div></section>')
    ex = (f'<section class="explica campo-ambar" aria-labelledby="t-pex"><p class="sobretitulo">Sem redigitar</p><h2 id="t-pex">A proposta aceita vira contrato.</h2><ul>'
          f'<li>{ico("pena")}<span>As condições de honorário passam para o contrato como estão. Lá só se confere e acrescenta o que faltar.</span></li>'
          f'<li>{ico("relogio")}<span>O retorno da proposta é o próximo contato do cliente: aparece na ficha e em Atendimentos.</span></li>'
          f'<li>{ico("historico")}<span>Mudou o valor? Edite a proposta. A versão anterior fica no histórico.</span></li></ul></section>')
    return cli + ex


def escopo(txt):
    return (f'<section class="folha" aria-labelledby="t-es"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-es">O que está incluído</h2></div></div>'
            f'<div class="cm-escopo">{txt}</div></section>')


ESC_GAB = ('<p>Petição de divórcio consensual com partilha de um apartamento e guarda compartilhada de um filho, até a averbação no cartório de registro civil.</p>'
           '<p class="hn-nota">Custas, certidões e taxas de cartório ficam por conta da cliente e não entram nos honorários.</p>')


def ficha_prop_gab(janela_=''):
    d = (f'<section class="dir campo-ambar" aria-labelledby="t-ret2"><p class="sobretitulo" id="t-ret2">Retorno</p>'
         f'<div class="hn-dir-linha"><p class="grande">18/11</p>{selo("ativo", "hoje")}</div>'
         f'<p class="hn-oque"><b>Responder à contraproposta: ela pediu 5 parcelas</b><br>com Marina Ribeiro</p>'
         f'<button class="btn btn-pri" type="button" data-janela="j-resposta">{ico("conversas")}Registrar resposta</button></section>')
    cab = ficha_cab_p('P-2026-016', 'Divórcio consensual', '<span class="selo selo-ativo">Em negociação</span>', 'Gabriela Teixeira', 'R$ 4.000,00', d)
    corpo = conds_ler(COND_GAB, sub='Passam para o contrato como estão.', acoes=f'<a class="btn btn-sec" href="#">{ico("lapis")}Editar</a>') + escopo(ESC_GAB) + hist_prop()
    return f'<div class="hn">{cab}<div class="hn-grade"><div class="hn-col">{corpo}</div><aside class="hn-col" aria-label="Sobre a proposta">{lateral_prop()}</aside></div></div>{janela_}'


COND_BEN = [
    cond_ler('parcelado', 'R$ 2.000,00 <small>em 3 parcelas: 2 de R$ 666,67 e 1 de R$ 666,66</small>', 'Todo dia 10, de 10/12/2026 a 10/02/2027.', 'Vira 3 recebimentos programados.'),
    cond_ler('exito', '30% <small>dos atrasados que o cliente receber</small>', 'Cobrado quando o caso chegar à etapa “Pagamento da RPV ou precatório”, com vencimento 15 dias depois.',
             'O valor só se sabe na etapa. Quando ela for marcada no caso, vira valor a receber e o Financeiro é avisado.'),
    cond_ler('recorrente', '30% <small>do benefício mensal, por 12 meses</small>', 'A partir da etapa “Benefício implantado”, todo dia 10. A base muda todo mês.',
             'Todo dia 5, o responsável recebe o lembrete para pedir o extrato do benefício.'),
]
ESC_BEN = ('<p>Pedido de aposentadoria por idade no INSS e, se for negado, a ação na Justiça Federal até o pagamento dos atrasados.</p>'
           '<p class="hn-nota">Se o pedido for concedido ainda no INSS, os honorários de êxito incidem sobre os atrasados pagos pelo INSS.</p>')


def ficha_prop_ben(sem_contratos=False):
    if sem_contratos:
        d = (f'<section class="dir campo-ambar" aria-labelledby="t-ac"><p class="sobretitulo" id="t-ac">Aceita em 17/11</p>'
             f'<p class="grande" style="font-size:30px">Falta o contrato</p>'
             f'<p class="hn-oque">Quem cria contratos é quem tem a área Contratos: <b>Marina Ribeiro e Felipe Matos</b>. O contrato nasce com estas condições.</p>'
             f'<button class="btn btn-pri" type="button">{ico("enviar")}Pedir o contrato</button></section>')
    else:
        d = (f'<section class="dir campo-ambar" aria-labelledby="t-ac"><p class="sobretitulo" id="t-ac">Aceita em 17/11</p>'
             f'<p class="grande" style="font-size:30px">Falta o contrato</p>'
             f'<p class="hn-oque"><b>As condições abaixo já entram no contrato.</b><br>Assinatura marcada para 20/11, com Diego Almeida.</p>'
             f'<a class="btn btn-pri" href="contratos.html?estado=novo">{ico("pena")}Gerar o contrato</a></section>')
    cab = ficha_cab_p('P-2026-014', 'Aposentadoria por idade', '<span class="selo selo-ativo">Aceita</span>', 'Benedito Souza Lima', 'R$ 2.000,00 mais êxito', d)
    aviso_ = ''
    if sem_contratos:
        aviso_ = aviso('info', 'Você vê a proposta, mas não cria o contrato.',
                       'A área Contratos não está liberada para você. Ao pedir, Marina e Felipe recebem um aviso com o link desta proposta. Quem libera áreas é Marina Ribeiro, a sócia dona.', icone='cadeado')
    hist = (f'<section class="folha" aria-labelledby="t-hp" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-hp">Histórico da proposta</h2></div></div>'
            f'<div class="eventos-dia"><h3>17/11/2026</h3><ol class="eventos"><li><time>11h30</time><span class="pto forte" aria-hidden="true"></span><div><p><b>Diego Almeida</b> registrou a resposta: aceitou{selo("ativo", "Aceita")}</p><small>No atendimento presencial. Assina o contrato na sexta, 20/11.</small></div></li></ol></div>'
            f'<div class="eventos-dia"><h3>12/11/2026</h3><ol class="eventos"><li><time>14h02</time><span class="pto" aria-hidden="true"></span><div><p><b>Diego Almeida</b> marcou como enviada{selo("andamento", "Enviada")}</p><small>Entregou a proposta impressa no escritório.</small></div></li></ol></div></section>')
    corpo = aviso_ + conds_ler(COND_BEN, sub='Passam para o contrato como estão.') + escopo(ESC_BEN) + hist
    lat = lateral_prop('Benedito Souza Lima', 'Google', 'Diego Almeida').replace('30/11/2026', '27/11/2026')
    return f'<div class="hn">{cab}<div class="hn-grade"><div class="hn-col">{corpo}</div><aside class="hn-col" aria-label="Sobre a proposta">{lat}</aside></div></div>'


def j_resposta(erro=False):
    res = aviso('urgencia', 'Falta acertar 1 ponto, marcado abaixo.', 'A resposta ainda não foi registrada.') if erro else ''
    def r(k, rot, sub, ch):
        return f'<label class="opcao"><input class="marcar" type="radio" name="rs" value="{k}"{" checked" if ch else ""}{" data-foco" if ch and not erro else ""}><span>{rot}<small>{sub}</small></span></label>'
    sel = 'recusou' if erro else 'aceitou'
    corpo = res + (f'<fieldset class="cm-resposta"><legend>Como Gabriela respondeu</legend><div class="cm-ops">'
                   + r('aceitou', 'Aceitou', 'Vira contrato', sel == 'aceitou') + r('mudanca', 'Pediu mudança', 'Você edita a proposta', False)
                   + r('recusou', 'Recusou', 'Pede o motivo', sel == 'recusou') + '</div></fieldset>')
    corpo += '<div class="cm-dois">' + campo('rs-data', 'Data da resposta', '18/11/2026', 'c3', im='numeric', ajuda='dd/mm/aaaa') + selecao('rs-canal', 'Por onde', ['WhatsApp', 'Telefone', 'Presencial', 'E-mail', 'Videochamada'], 'WhatsApp', 'c3') + '</div>'
    if erro:
        corpo += selecao('rs-motivo', 'Motivo da recusa', ['Achou o valor alto', 'Fechou com outro escritório', 'Desistiu de entrar com a ação', 'Não respondeu mais', 'Outro'], '', 'c6',
                         erro='Escolha o motivo. Ele entra na conta do Funil e ajuda a rever as próximas propostas.', foco=True)
        corpo += texto('rs-obs', 'Observação', '', opc=True)
        corpo += f'<p class="cm-efeito">{ico("historico")}<span>A proposta fica Recusada e guardada, com o motivo. O próximo contato de Gabriela (hoje) é encerrado.</span></p>'
        pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("check")}Registrar a recusa</button>'
    else:
        corpo += opcao('rs-cond', 'Aceitou com as condições da proposta', 'Se combinaram outra coisa (como as 5 parcelas), desmarque e edite a proposta antes.', True)
        corpo += f'<p class="cm-efeito">{ico("pena")}<span>A proposta fica Aceita e o próximo contato de hoje é encerrado. Em seguida você gera o contrato, já com as condições preenchidas.</span></p>'
        pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("check")}Registrar e gerar o contrato</button>'
    return janela('j-resposta', 'P-2026-016 · Gabriela Teixeira', 'Registrar resposta', 'Fica no histórico da proposta e no atendimento da cliente, com seu nome e a hora.', corpo, pe, abrir=True)


# ---------------------------------------------------------------- nova proposta
def proposta_nova():
    r = (f'<div class="hn-passo hn-primeiro"><span class="disco" aria-hidden="true"><span>1</span></span><div><h3>Para quem e o quê</h3><small>O cliente vem do cadastro único</small></div></div>'
         + f'<div class="hn-bloco"><p style="font-weight:500;margin-bottom:6px" id="pn-cli-r">Cliente</p><div class="hn-escolhido" role="group" aria-labelledby="pn-cli-r"><span class="av-p forte" aria-hidden="true">MD</span>'
         f'<div><strong>Marcos Vinícius Duarte</strong><small>Pessoa física · cadastrado hoje · origem: Indicação de cliente</small></div>'
         f'<button class="btn btn-sec btn-compacto" type="button">{ico("trocar")}Trocar cliente</button></div></div>'
         + campo('pn-srv', 'Serviço', 'Reclamação trabalhista · vínculo com aplicativo de transporte', 'c4', foco=True, ajuda='Aparece na lista e no título da proposta.')
         + selecao('pn-resp', 'Responsável', EQUIPE, 'Marina Ribeiro (você)', 'c2', ajuda='Acompanha o retorno.')
         + texto('pn-esc', 'O que está incluído', 'Ação na Justiça do Trabalho pedindo o reconhecimento do vínculo, verbas rescisórias e FGTS, até o pagamento ou acordo.', opc=False,
                 ajuda='Vai no arquivo da proposta e depois no contrato.')
         + f'<div class="hn-passo"><span class="disco" aria-hidden="true"><span>2</span></span><div><h3>Condições de honorário</h3><small>As mesmas peças do contrato: o que for aceito passa para lá</small></div></div>'
         + '<div class="hn-bloco">' + marcar_tipos(('fixo', 'exito'), titulo='Tipos de honorário', sub='Marque todos os tipos desta proposta. Cada tipo marcado abre o seu bloco logo abaixo, na ordem desta lista.')
         + cond_editar(1, 'fixo', campo('c1-valor', 'Valor', '500,00', 'c3', im='decimal', antes='R$') + campo('c1-venc', 'Vencimento', '10/12/2026', 'c3', im='numeric', ajuda='dd/mm/aaaa'),
                       'R$ 500,00 a receber em 10/12/2026.')
         + cond_editar(2, 'exito', campo('c2-pct', 'Percentual', '30', 'c2', im='decimal', depois_in='%')
                       + selecao('c2-sobre', 'Sobre o quê', ['O que o cliente receber (condenação ou acordo)', 'Valor da condenação', 'Valor do acordo', 'Proveito econômico', 'Outro'], 'O que o cliente receber (condenação ou acordo)', 'c4')
                       + selecao('c2-etapa', 'Vira cobrança quando o caso chegar a', ['Pagamento da condenação ou do acordo', 'Sentença', 'Acordo homologado', 'Alvará levantado', 'Pagamento da RPV ou precatório'], 'Pagamento da condenação ou do acordo', 'c4',
                                 ajuda='As etapas são as do Jurídico do escritório.')
                       + campo('c2-dias', 'Vencimento', '5', 'c2', im='numeric', depois_in='dias', ajuda='depois da etapa'),
                       '30% do que Marcos receber, cobrado 5 dias depois do pagamento. O valor só se sabe nessa hora.')
         + '</div>'
         + f'<div class="hn-passo"><span class="disco" aria-hidden="true"><span>3</span></span><div><h3>Validade e retorno</h3></div></div>'
         + campo('pn-val', 'Vale até', '02/12/2026', 'c2', im='numeric', ajuda='dd/mm/aaaa. Depois disso, ela fica como vencida.')
         + campo('pn-ret', 'Retorno', '25/11/2026', 'c2', im='numeric', ajuda='Vira o próximo contato do cliente.')
         + selecao('pn-ret-resp', 'Com quem', EQUIPE, 'Marina Ribeiro (você)', 'c2')
         + (f'<div class="form-pe"><span class="esq-pe">Os campos sem “(opcional)” são obrigatórios. A proposta fica no histórico, com seu nome e a hora.</span>'
            f'<a class="btn btn-fantasma" href="{U}propostas">Cancelar</a><button class="btn btn-sec" type="button">Salvar rascunho</button>'
            f'<button class="btn btn-pri" type="submit">{ico("check")}Salvar proposta</button></div>'))
    form = (f'<section class="folha" aria-labelledby="t-pn"><div class="folha-cab"><div><h2 id="t-pn">Dados da proposta</h2><p class="sub">Escreva uma vez. Se for aceita, o contrato sai com estas condições.</p></div></div>'
            f'<form class="form-folha" action="#" novalidate>{r}</form></section>')
    ex = (f'<section class="explica campo-ambar" aria-labelledby="t-pnx"><p class="sobretitulo">Proposta</p><h2 id="t-pnx">Clara para o cliente, pronta para o contrato.</h2><ul>'
          f'<li>{ico("pena")}<span>Os tipos de honorário são os mesmos do contrato: fixo, parcelado, mensal, êxito, sucumbência, por ato e percentual recorrente.</span></li>'
          f'<li>{ico("baixar")}<span>Depois de salvar, baixe o arquivo (.docx) no timbrado do escritório e envie como o escritório já envia.</span></li>'
          f'<li>{ico("escudo")}<span>Só para quem procurou o escritório. Não há envio em massa nem oferta a quem não pediu (Provimento 205/2021 da OAB).</span></li></ul></section>')
    cab = '<div class="pt-cab"><div><p class="sobretitulo">Propostas</p><h1>Nova proposta</h1><span class="fio" aria-hidden="true"></span></div></div>'
    return f'<div class="hn">{cab}<div class="hn-grade"><div class="hn-col">{form}</div><aside class="hn-col" aria-label="Como funciona a proposta">{ex}</aside></div></div>'


# ---------------------------------------------------------------- funil
def card(nome, sub, s=''):
    return f'<li class="cm-card"><a href="{FICHA_CL}">{nome}</a><small>{sub}</small>{s}</li>'


def periodo_chips(sel='90'):
    b = lambda k, r: f'<button type="button" aria-pressed="{"true" if k == sel else "false"}">{r}</button>'
    return f'<div class="chips" role="group" aria-label="Período">{b("30", "30 dias")}{b("90", "90 dias")}{b("12", "12 meses")}</div>'


def funil():
    def etapa(cls, w, n, rot, lado):
        return (f'<li class="{cls}"><div class="cm-f-faixa" style="--w:{w}"><b class="num">{n}</b><span>{rot}</span></div>'
                f'<p class="cm-f-lado">{lado}</p></li>')

    def passa(pct, perdeu, itens):
        li = ''.join(f'<li><b class="num">{q}</b><span>{t}</span></li>' for q, t in itens)
        return (f'<li class="cm-f-passa"><p class="cm-f-taxa"><b class="num">{pct}</b> passam</p>'
                f'<div class="cm-f-perda"><p><b>{perdeu}</b></p><ul>{li}</ul></div></li>')
    forma = (f'<div class="cm-funil"><ol class="cm-f" aria-label="Funil de 20/08 a 18/11/2026">'
             + etapa('e1', '100%', 24, 'primeiros contatos', 'Atendimentos registrados com cliente novo.')
             + passa('58%', '10 não receberam proposta', [(5, 'o escritório não pegou o caso'), (3, 'não voltaram depois do atendimento'), (2, 'ainda em atendimento, sem proposta')])
             + etapa('e2', '62%', 14, 'receberam proposta', 'Proposta enviada ao cliente, por qualquer valor.')
             + passa('64%', '5 ainda não fecharam', [(4, 'proposta em andamento (abaixo)'), (1, 'fechou com outro escritório')])
             + etapa('e3', '38%', 9, 'viraram contrato', 'Contrato criado no T3jus, assinado ou não.')
             + '</ol><p class="cm-f-total"><b class="num">38%</b> dos primeiros contatos viraram contrato no período.</p></div>')
    conv = (f'<section class="folha" aria-labelledby="t-cv"><div class="folha-cab"><div><h2 id="t-cv">Quanto vira contrato</h2>'
            f'<p class="sub">Primeiros contatos de 20/08 a 18/11/2026 e o que aconteceu com cada um.</p></div><div class="acoes">{periodo_chips()}</div></div>'
            f'{forma}</section>')
    def col(tit, n, desc, cards, cls='cm-coluna'):
        return (f'<div class="{cls}"><h3>{tit} <span class="disco" aria-hidden="true"><span>{n}</span></span><span class="sr">: {n}</span></h3>'
                f'<p>{desc}</p><ul>{cards}</ul></div>')
    cols = (f'<section class="folha" aria-labelledby="t-ag" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-ag">Agora no funil</h2>'
            f'<p class="sub">Ninguém arrasta cartão: a etapa sai do que foi registrado (atendimento, proposta, resposta e contrato).</p></div></div><div class="cm-colunas">'
            + col('Primeiro contato', 2, 'Atendido, ainda sem proposta enviada.',
                  card('Marcos Vinícius Duarte', 'Proposta em rascunho · Marina', selo('neutro', 'Rascunho')) + card('Eduardo Nascimento', 'Atendido em 04/11 · sem próximo contato', selo('atencao', 'Sem retorno marcado', 'relogio')))
            + col('Proposta enviada', 1, 'Esperando a resposta do cliente.', card('Daniela Rocha Mendes', 'P-2026-015 · R$ 1.500,00 + 20%', selo('urgente', 'retorno vencido', 'alerta')))
            + col('Em negociação', 2, 'O cliente pediu mudança.',
                  card('Gabriela Teixeira', 'P-2026-016 · R$ 4.000,00', selo('atencao', 'retorno hoje', 'relogio')) + card('Construtora Vale Alto', 'P-2026-013 · R$ 2.500,00 por mês', ''))
            + col('Aceita', 1, 'Falta criar ou assinar o contrato.', card('Benedito Souza Lima', 'P-2026-014 · assina em 20/11', ''))
            + col('Contrato no período', 9, 'Os 3 mais recentes.',
                  card('Antônia Ferreira Prado', 'C-2026-031 · 28/10') + card('Hélio Batista Corrêa', 'C-2026-022 · 06/10') + card('Irene Castro', 'C-2026-021 · 30/09'), 'cm-coluna cm-fim')
            + '</div></section>')
    oab = (f'<aside class="cm-oab" aria-label="Regra da OAB">{ico("escudo")}<div><b>Funil de quem já procurou o escritório.</b> O T3jus não faz anúncio, envio em massa nem lista de contatos comprada, '
           f'e não conta pontos de “chance de fechar”. A publicidade da advocacia segue o Provimento 205/2021 da OAB.</div></aside>')
    return f'<div class="hn"><div class="pt-cab"><div><p class="sobretitulo">Comercial</p><h1>Funil</h1><span class="fio" aria-hidden="true"></span></div></div>{conv}{cols}{oab}</div>'


# ---------------------------------------------------------------- origem
ORG = [('Indicação de cliente', 9, 5, 4, 2130000), ('Google', 6, 3, 2, 780000), ('Indicação de advogado ou parceiro', 3, 2, 2, 3350000),
       ('Instagram', 3, 2, 0, 0), ('Site do escritório', 2, 1, 1, 450000), ('Passou no escritório', 1, 1, 0, 0)]


def origem():
    linhas = []
    for nome, c, p, k, v in ORG:
        pct = round(100 * k / c)
        poucos = c < 5
        bar = (f'<div class="cm-org-barra" aria-hidden="true"><div class="tons"><i style="width:{100 * k / 9:.0f}%;background:var(--vinho)"></i>'
               f'<i style="width:{100 * (p - k) / 9:.0f}%;background:var(--vinho-4)"></i><i style="width:{100 * (c - p) / 9:.0f}%;background:var(--ambar-2)"></i></div></div>')
        pc = f'<span><span class="cm-pct num">{pct}%</span>' + (f'<span class="selo selo-neutro cm-poucos">poucos dados</span>' if poucos else '') + '</span>'
        linhas.append(([f'<b>{nome}</b>{bar}', f'<span class="num">{c}</span>', f'<span class="num">{p}</span>', f'<span class="num">{k}</span>', pc,
                        f'<span class="num hn-valor-c">{brl(v) if v else "—"}</span>'], ''))
    tab = tabela('Origem dos contatos', ['Origem', 'Contatos', 'Propostas', 'Contratos', 'Viram contrato', 'Contratado (valor certo)'], linhas,
                 ['31%', '11%', '11%', '11%', '17%', '19%'])
    leg = ('<div class="legenda" style="padding:0 24px 16px"><span><i style="background:var(--vinho)"></i>virou contrato</span>'
           '<span><i style="background:var(--vinho-4)"></i>recebeu proposta, não fechou</span><span><i style="background:var(--ambar-2)"></i>só o primeiro contato</span></div>')
    folha = (f'<section class="folha" aria-labelledby="t-or" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-or">De onde vêm os clientes</h2>'
             f'<p class="sub">24 primeiros contatos de 20/08 a 18/11/2026. A origem é a que foi marcada no cadastro do cliente.</p></div><div class="acoes">{periodo_chips()}</div></div>'
             f'{leg}{tab}<p class="hn-pe">{ico("ajuda")}<span>Com menos de 5 contatos, a porcentagem diz pouco: por isso o selo “poucos dados”. '
             f'O valor certo soma o fixo, as parcelas e 12 meses de mensalidade; êxito e sucumbência só entram quando viram cobrança.</span></p></section>')
    ind = (f'<section class="folha" aria-labelledby="t-qi"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-qi" style="font-size:20px">Quem mais indicou</h2>'
           f'<p class="sub">Do campo “Quem indicou” do cadastro.</p></div></div><ul class="cm-motivos">'
           f'<li><span>Rosa Almeida <small style="color:var(--texto-2)">· cliente</small></span><b class="num">3</b></li>'
           f'<li><span>Paulo Serra <small style="color:var(--texto-2)">· contador</small></span><b class="num">2</b></li>'
           f'<li><span>Outras 4 pessoas</span><b class="num">4</b></li></ul></section>')
    oab = (f'<aside class="cm-oab" aria-label="Regra da OAB">{ico("escudo")}<div><b>Para saber, não para captar.</b> Esta tela só conta de onde vieram os clientes que procuraram o escritório.'
           f'<ul><li>Não há campanha, anúncio nem envio em massa no T3jus.</li><li>A lista de origens é fixa nesta versão e não tem “comprou contatos”.</li>'
           f'<li>Publicidade da advocacia: Provimento 205/2021 da OAB.</li></ul></div></aside>')
    return (f'<div class="hn"><div class="pt-cab"><div><p class="sobretitulo">Comercial</p><h1>Origem dos contatos</h1><span class="fio" aria-hidden="true"></span></div></div>'
            f'<div class="hn-grade"><div class="hn-col">{folha}</div><aside class="hn-col" aria-label="Indicações e regras">{ind}{oab}</aside></div></div>')


# ---------------------------------------------------------------- estados
T = ''
A = lambda sec, trilha, titulo: dict(area='comercial', secao=sec, atual='comercial', trilha=trilha, titulo=titulo)
T += tpl('atendimentos', atendimentos(), **A('Atendimentos', 'Comercial|Atendimentos', 'Atendimentos'))
T += tpl('atendimentos-vazio', atendimentos_vazio(), **A('Atendimentos', 'Comercial|Atendimentos', 'Atendimentos'))
T += tpl('propostas', propostas(), **A('Propostas', 'Comercial|Propostas', 'Propostas'))
T += tpl('propostas-vazio', propostas_vazio(), **A('Propostas', 'Comercial|Propostas', 'Propostas'))
T += tpl('proposta', ficha_prop_gab(), **A('Propostas', 'Comercial|Propostas|P-2026-016', 'P-2026-016'))
T += tpl('resposta', ficha_prop_gab(j_resposta()), **A('Propostas', 'Comercial|Propostas|P-2026-016', 'P-2026-016'))
T += tpl('resposta-erro', ficha_prop_gab(j_resposta(True)), **A('Propostas', 'Comercial|Propostas|P-2026-016', 'P-2026-016'))
T += tpl('proposta-aceita', ficha_prop_ben(), **A('Propostas', 'Comercial|Propostas|P-2026-014', 'P-2026-014'))
T += tpl('proposta-sem-contratos', ficha_prop_ben(True), quem='comercial', **A('Propostas', 'Comercial|Propostas|P-2026-014', 'P-2026-014'))
T += tpl('proposta-nova', proposta_nova(), **A('Propostas', 'Comercial|Propostas|Nova proposta', 'Nova proposta'))
T += tpl('funil', funil(), **A('Funil', 'Comercial|Funil', 'Funil'))
T += tpl('origem', origem(), **A('Origem dos contatos', 'Comercial|Origem dos contatos', 'Origem dos contatos'))

URL = {'Atendimentos': U + 'atendimentos', 'Propostas': U + 'propostas', 'Funil': U + 'funil', 'Origem dos contatos': U + 'origem'}
out = montar('comercial.html', 'Comercial', 'Área Comercial do Portal: retornos, propostas, funil e origem dos contatos.',
             '{"estado":"atendimentos","atual":"comercial"}', T, barras('comercial', URL), CSS)
open(f'{SAIDA}/comercial.html', 'w', encoding='utf-8').write(out)
print('comercial ok', T.count('<template data-est='), 'estados')
