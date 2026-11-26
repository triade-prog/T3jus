# Portal · Clientes (AP-01, AP-02, AP-04, AP-06; PT-02, PT-03, PT-10, PT-11, PT-19).
# Reusa a moldura, o CSS e as peças do Portal v1 aprovado (comum.py, sem mudança).
# Peças novas com prefixo cl-. O cabeçalho da ficha é o da ficha aprovada do Console v1.
# Uso: python3 clientes.py <pasta-saida>
import sys, re, html
from comum import *

SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
H = html.escape

# ---------------------------------------------------------------- dados fictícios
def cpf(b):
    d = [int(x) for x in b]
    for n in (10, 11):
        s = sum(v * (n - i) for i, v in enumerate(d)) % 11
        d.append(0 if s < 2 else 11 - s)
    s = ''.join(map(str, d))
    return f'{s[:3]}.{s[3:6]}.{s[6:9]}-{s[9:]}'


def cnpj(b):
    d = [int(x) for x in b]
    for pesos in ([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]):
        s = sum(v * p for v, p in zip(d, pesos)) % 11
        d.append(0 if s < 2 else 11 - s)
    s = ''.join(map(str, d))
    return f'{s[:2]}.{s[2:5]}.{s[5:8]}/{s[8:12]}-{s[12:]}'


CPF_ANT = cpf('318547926')
CPF_RIC = cpf('204716385')
CNPJ_VA = cnpj('473820150001')
CPF_ERRADO = CPF_ANT[:-1] + str((int(CPF_ANT[-1]) + 3) % 10)
HOJE = '18/11/2026'

# (ini, nome, tipo, contato_nome, contato_papel, tel, origem, prox(data, rotulo, tipo), resp, situacao)
CLIENTES = [
    ('AP', 'Antônia Ferreira Prado', 'PF', 'Joana Prado', 'filha, acompanha o caso', '(11) 99123-4567', 'Indicação de cliente', ('13/11', 'vencido há 5 dias', 'vencido'), 'Diego', 'ativo'),
    ('BL', 'Benedito Souza Lima', 'PF', 'Benedito', 'o próprio', '(11) 97456-1180', 'Google', ('20/11', 'sex', 'futuro'), 'Diego', 'ativo'),
    ('CV', 'Construtora Vale Alto Ltda.', 'PJ', 'Ricardo Vale', 'sócio-administrador', '(11) 4438-2200', 'Indicação de advogado', ('25/11', 'qua', 'futuro'), 'Felipe', 'ativo'),
    ('DM', 'Daniela Rocha Mendes', 'PF', 'Daniela', 'a própria', '(11) 98830-2417', 'Instagram', ('17/11', 'vencido ontem', 'vencido'), 'Diego', 'ativo'),
    ('EN', 'Eduardo Nascimento', 'PF', 'Eduardo', 'o próprio', '(11) 3061-4402', 'Passou no escritório', None, '', 'ativo'),
    ('FB', 'Farmácia Bom Jesus Ltda.', 'PJ', 'Sueli Ramos', 'gerente', '(11) 2947-6610', 'Site do escritório', ('02/12', 'qua', 'futuro'), 'Felipe', 'ativo'),
    ('GT', 'Gabriela Teixeira', 'PF', 'Gabriela', 'a própria', '(11) 99602-7735', 'Indicação de cliente', ('18/11', 'hoje', 'hoje'), 'Marina', 'ativo'),
    ('HC', 'Hélio Batista Corrêa', 'PF', 'Marta Corrêa', 'esposa', '(11) 98114-3059', 'Google', ('10/11', 'vencido há 8 dias', 'vencido'), 'Diego', 'ativo'),
    ('IC', 'Irene Castro', 'PF', 'Irene', 'a própria', '(11) 97723-9081', 'Indicação de cliente', ('30/11', 'seg', 'futuro'), 'Marina', 'ativo'),
    ('JA', 'João Pedro Alves', 'PF', 'João Pedro', 'o próprio', '(11) 98007-6623', 'Google', None, '', 'inativo'),
    ('PN', 'Padaria Pão Nobre ME', 'PJ', 'Otávio Nobre', 'dono', '(11) 2215-0934', 'Passou no escritório', None, '', 'inativo'),
]
ATIVOS = [c for c in CLIENTES if c[9] == 'ativo']
INATIVOS = [c for c in CLIENTES if c[9] == 'inativo']
VENCIDOS = [c for c in ATIVOS if c[7] and c[7][2] == 'vencido']
TIPO = {'PF': 'Pessoa física', 'PJ': 'Pessoa jurídica'}
FICHA = 'clientes.html?estado=ficha'
FICHA_PJ = 'clientes.html?estado=ficha-pj'

# ---------------------------------------------------------------- CSS novo (prefixo cl-)
_fi = open(APROV + 'console-v1/ficha.html', encoding='utf-8').read()
_cf = _fi[_fi.index('<style>') + 7:_fi.index('</style>')]
CSS_FICHA_CAB = '\n'.join(r.strip() + '}' for r in _cf.split('}')
                          if r.strip().startswith(('.ficha-cab', '.voltar', '.ident', '.meta', '.estatua', '.dir')))

CSS_CL = r"""
/* ===== Cabeçalho da ficha: o da ficha aprovada do Console v1, sem mudança ===== */
""" + CSS_FICHA_CAB + r"""

/* ==========================================================================
   Portal · Clientes (AP-01, AP-02, AP-04, AP-06). Prefixo cl- nas peças novas.
   ========================================================================== */
.cl{display:flex;flex-direction:column;gap:24px;min-width:0}
.cl-grade{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:24px;align-items:start}
.cl-col{display:flex;flex-direction:column;gap:24px;min-width:0}
.cl-cab-lista{align-items:flex-end}

/* Lista */
.cl-ferr{display:flex;align-items:center;gap:12px;padding:16px 24px;flex-wrap:wrap}
.cl-ferr .campo-busca{position:relative;flex:1 1 380px;max-width:460px}
.cl-ferr .campo-busca .ico{position:absolute;left:14px;top:12px;color:var(--vinho-4);pointer-events:none}
.cl-ferr .campo-busca input{padding-left:44px}
.cl-ferr .chips{margin-left:auto}
.cl-cont{padding:0 24px 12px;font-size:13px;color:var(--texto-2)}
.cl-cont b{color:var(--texto);font-weight:500}
.cl-tab td{vertical-align:middle}
.cl-tab .esc a{display:inline-flex;align-items:center;min-height:44px;margin:-10px 0 -12px}
.cl-tab .esc small{margin-top:0}
.cl-ct strong{display:block;font-weight:500;font-size:14px}
.cl-ct small{display:block;font-size:12px;color:var(--texto-2)}
.cl-prox{display:grid;gap:4px;justify-items:start}
.cl-prox b{font-weight:500}
.cl-prox small{font-size:12px;color:var(--texto-2)}
.cl-sem{font-size:13px;color:var(--texto-2)}
.cl-tab tr.cl-venc td{background:#FCF6F2}
.cl-tab tr.cl-venc td:first-child{box-shadow:inset 3px 0 0 var(--vinho-3)}
.cl-tab tr.cl-off td{color:var(--texto-2)}
.cl-tab tr.cl-off .av-p{background:var(--sal-2);color:var(--texto-2)}
mark.cl-m{background:var(--ambar-3);color:inherit;border-radius:3px;padding:0 1px}
.cartao.cl-venc{border-color:var(--vinho-3);box-shadow:inset 3px 0 0 var(--vinho-3)}

/* Formulário: tipo, mínimo e qualificação */
.cl-tipo{grid-column:1/-1;border:0;margin:0;padding:0;min-width:0}
.cl-tipo legend{font-weight:500;font-size:14px;margin-bottom:6px;padding:0}
.cl-tipo .cl-ops{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.cl-tipo .opcao{border:1px solid var(--borda-folha);border-radius:var(--raio);padding:12px 14px;margin:0;background:var(--papel)}
.cl-tipo .opcao:has(input:checked){border-color:var(--vinho);background:var(--ambar-3)}
.cl-sec{grid-column:1/-1;display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;padding-top:8px;border-top:1px solid var(--divisor);margin-top:4px}
.cl-sec h3{font-size:19px;font-weight:600;color:var(--vinho)}
.cl-sec small{font-size:12px;color:var(--texto-2)}
.cl-sec.cl-primeira{border-top:0;padding-top:0;margin-top:0}
.cl-uso{display:inline-flex;align-items:center;height:20px;padding:0 8px;margin-left:8px;border-radius:10px;background:var(--sal-2);color:var(--vinho);font-size:11px;font-weight:500;vertical-align:1px;white-space:nowrap}
.cl-qualif{grid-column:1/-1;border:1px solid var(--borda-folha);border-radius:var(--raio-g);background:var(--papel)}
.cl-qualif>summary{list-style:none;display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:14px;align-items:center;min-height:64px;padding:12px 16px;cursor:pointer;border-radius:var(--raio-g)}
.cl-qualif>summary::-webkit-details-marker{display:none}
.cl-qualif>summary:hover{background:#FCF8F5}
.cl-qualif>summary .cl-ic{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:var(--ambar-3);color:var(--vinho)}
.cl-qualif>summary strong{display:block;font-family:var(--serifa);font-size:19px;font-weight:600;color:var(--vinho);line-height:1.25}
.cl-qualif>summary small{display:block;font-size:12px;color:var(--texto-2)}
.cl-qualif>summary .cl-abre{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:500;color:var(--vinho);white-space:nowrap}
.cl-qualif>summary .cl-abre .ico{transition:transform var(--dur-media) var(--curva)}
.cl-qualif[open]>summary .cl-abre .ico{transform:rotate(180deg)}
.cl-qualif[open]>summary{border-bottom:1px solid var(--divisor);border-radius:var(--raio-g) var(--raio-g) 0 0}
.cl-qualif .cl-q-corpo{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:16px 20px;padding:16px}
.cl-qualif .c6{grid-column:span 6}.cl-qualif .c4{grid-column:span 4}.cl-qualif .c3{grid-column:span 3}.cl-qualif .c2{grid-column:span 2}
.cl-lgpd{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.5}
.cl-lgpd .ico{color:var(--vinho-4);margin-top:1px;flex:none}
.cl-ok{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--vinho-2);margin-top:6px}
.cl-ok .ico{width:16px;height:16px}
.cl-dup .aviso-acoes a{font-weight:500}

/* Ficha */
.ficha-cab .esq .meta .selo-ativo{background:var(--ambar-3);color:var(--vinho)}
.ficha-cab .esq .meta .selo-neutro{background:var(--sal);color:var(--vinho)}
.cl-grade .explica{padding-bottom:84px}
.cl .contato-edit{grid-template-columns:minmax(0,1fr) minmax(0,1fr) 44px}
.cl .contato-edit .remover{grid-column:3;grid-row:1}
.cl .cartao .c-dados{grid-template-columns:auto minmax(0,1fr)}
.cl-dir-linha{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.dir .cl-oque{font-size:13px;color:var(--tinta);line-height:1.45}
.dir .cl-oque b{font-weight:600}
.dir .btn{align-self:flex-start}
.cl-proc{list-style:none;margin:0;padding:0 24px 8px}
.cl-proc li{display:grid;grid-template-columns:22px minmax(0,1fr);gap:10px;padding:8px 0;border-top:1px solid var(--divisor);font-size:13px;align-items:start}
.cl-proc li:first-child{border-top:0}
.cl-proc .ico{width:18px;height:18px;color:var(--vinho);margin-top:1px}
.cl-proc li.cl-falta{color:var(--texto-2)}
.cl-proc li.cl-falta .ico{color:var(--vinho-3)}
.cl-proc li.cl-falta b{color:var(--vinho-3);font-weight:600}
.cl-proc-num{display:flex;align-items:baseline;gap:8px;padding:0 24px 10px}
.cl-proc-num strong{font-family:var(--serifa);font-size:34px;line-height:1;color:var(--vinho);font-weight:500}
.cl-proc-num span{font-size:13px;color:var(--texto-2)}
.cl-folha-acao{padding:4px 24px 20px;display:grid;gap:10px}
.cl-folha-acao>p{font-size:13px;color:var(--texto-2);line-height:1.5}
.cl-reserva{margin:4px 24px 20px;padding:16px;border:1.5px dashed var(--vinho-4);border-radius:var(--raio);display:grid;gap:10px;font-size:13px;color:var(--texto-2);line-height:1.5}
.cl-reserva div{display:flex;align-items:flex-start;gap:10px}
.cl-reserva .ico{color:var(--vinho-4);flex:none;margin-top:1px}
.cl-reserva b{color:var(--texto);font-weight:500}
.cl .contato a{min-height:44px}
.cl .contato .cl-papel{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.cl-falta-dd{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.cl-falta-dd .selo{font-style:normal}
.cl-origem{margin:0;padding:0 24px 18px;display:grid;gap:10px}
.cl-origem div{display:flex;justify-content:space-between;gap:12px;font-size:13px;padding-top:10px;border-top:1px solid var(--divisor)}
.cl-origem div:first-child{border-top:0;padding-top:0}
.cl-origem dt{color:var(--texto-2)}
.cl-origem dd{margin:0;font-weight:500;text-align:right}
.cl-sit{padding:0 24px 20px;display:grid;gap:12px}
.cl-sit p{font-size:13px;color:var(--texto-2);line-height:1.5}

/* Histórico de atendimento */
.cl-resumo{display:block;margin-top:6px;font-family:var(--serifa);font-style:italic;font-size:16px;line-height:1.45;color:var(--vinho);padding-left:12px;border-left:2px solid var(--ambar)}
.cl-pc{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:8px;font-size:12px;color:var(--texto-2)}
.cl-pc .ico{width:16px;height:16px;color:var(--vinho-4)}
.cl-pc b{font-weight:500;color:var(--texto)}
.eventos li.cl-novo{background:#FCF8F5;border-radius:var(--raio);margin:0 -10px;padding-left:10px;padding-right:10px}
.eventos .selo{margin-left:6px}
.cl-venc-aviso{margin:0 24px 8px}
.cl-dois{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.cl-prox-grupo{border:0;margin:0;padding:14px 16px;border-radius:var(--raio);background:var(--sal-2);display:grid;gap:14px;min-width:0}
.cl-prox-grupo legend{float:left;width:100%;padding:0;font-family:var(--serifa);font-size:19px;font-weight:600;color:var(--vinho)}
.cl-prox-grupo legend small{font-family:var(--sans);font-size:12px;font-weight:400;color:var(--texto-2);margin-left:8px}
.cl-prox-grupo .opcao{margin:0 -8px}
.janela .cl-lgpd{background:var(--sal-2)}

/* Inativo */
.cl-inativo-faixa{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center}

@media (max-width:760px){
  .cl{gap:16px}
  .cl-grade{grid-template-columns:minmax(0,1fr);gap:16px}
  .cl-col{gap:16px}
  .cl-cab-lista{flex-direction:column;align-items:stretch}
  .cl-cab-lista .btn{width:100%}
  .cabeca-ambar{padding:22px 16px 20px}
  .cabeca-ambar h1{font-size:34px}
  .cl-ferr{padding:16px;gap:10px}
  .cl-ferr .campo-busca{flex-basis:100%;max-width:none}
  .cl-ferr .chips{margin-left:0}
  .cl-cont{padding:0 16px 10px}
  .cl-tipo .cl-ops{grid-template-columns:1fr}
  .cl-qualif>summary{grid-template-columns:40px minmax(0,1fr);padding:12px}
  .cl-qualif>summary .cl-abre{grid-column:2}
  .cl-qualif .cl-q-corpo{grid-template-columns:1fr;padding:14px 12px}
  .cl-qualif .c6,.cl-qualif .c4,.cl-qualif .c3,.cl-qualif .c2{grid-column:1/-1}
  .cl-proc,.cl-proc-num{padding-left:16px;padding-right:16px}
  .cl-folha-acao{padding:4px 16px 16px}
  .cl-folha-acao .btn{width:100%}
  .cl-reserva{margin:4px 16px 16px}
  .cl-origem,.cl-sit{padding-left:16px;padding-right:16px}
  .cl-sit .btn{width:100%}
  .cl-venc-aviso{margin:0 16px 8px}
  .cl-dois{grid-template-columns:1fr}
  .cl .contato-edit{grid-template-columns:1fr 44px}
  .cl .contato-edit .remover{grid-column:2}
  .dir .btn{align-self:stretch}
  .ficha-cab .esq .ident h1{font-size:30px!important}
  .eventos li.cl-novo{margin:0 -8px;padding-left:8px;padding-right:8px}
  .cl-inativo-faixa{grid-template-columns:auto minmax(0,1fr)}
  .cl-inativo-faixa .btn{grid-column:1/-1}
}
"""

# ---------------------------------------------------------------- peças
def selo_sit(s):
    return (f'<span class="selo selo-ok">{ico("check")}Ativo</span>' if s == 'ativo'
            else f'<span class="selo selo-neutro">{ico("pasta")}Inativo</span>')


def prox_html(p, resp, curto=False):
    if not p:
        return '<span class="cl-sem">Sem próximo contato</span>'
    data, rot, t = p
    com = f'<small>com {resp}</small>' if resp else ''
    if t == 'vencido':
        return f'<div class="cl-prox"><span class="selo selo-urgente">{ico("alerta")}{data} · {rot}</span>{com}</div>'
    if t == 'hoje':
        return f'<div class="cl-prox"><span class="selo selo-atencao">{ico("relogio")}Hoje</span>{com}</div>'
    return f'<div class="cl-prox"><b class="num">{data} · {rot}</b>{com}</div>'


def marca(texto, termo):
    if not termo:
        return texto
    return re.sub('(' + re.escape(termo) + ')', r'<mark class="cl-m">\1</mark>', texto, flags=re.I)


def lista(itens, comercial=True, termo='', chip='ativos', cont=None):
    linhas, cartoes = '', ''
    for c in itens:
        ini, nome, tp, cn, cp, tel, org, prox, resp, sit = c
        href = FICHA_PJ if tp == 'PJ' else (FICHA if nome.startswith('Antônia') else ('clientes.html?estado=inativo' if sit == 'inativo' else FICHA))
        venc = comercial and prox and prox[2] == 'vencido' and sit == 'ativo'
        cls = ' class="cl-venc"' if venc else (' class="cl-off"' if sit == 'inativo' else '')
        n = marca(H(nome), termo)
        t_ = marca(tel, termo)
        ct = f'<div class="cl-ct"><strong>{H(cn)} <span style="font-weight:400;color:var(--texto-2)">· {H(cp)}</span></strong><small class="num">{t_}</small></div>'
        av = 'av-p forte' if sit == 'ativo' else 'av-p'
        col_com = (f'<td>{H(org)}</td><td>{prox_html(prox, resp) if sit == "ativo" else "<span class=cl-sem>—</span>"}</td>') if comercial else ''
        linhas += (f'<tr{cls}><td><div class="esc"><span class="{av}" aria-hidden="true">{ini}</span><div><a href="{href}">{n}</a><small>{TIPO[tp]}</small></div></div></td>'
                   f'<td>{ct}</td>{col_com}<td>{selo_sit(sit)}</td></tr>')
        dados = f'<dt>Contato</dt><dd>{H(cn)} · <span class="num" style="white-space:nowrap">{t_}</span></dd>'
        if comercial:
            dados += f'<dt>Origem</dt><dd>{H(org)}</dd>'
        pc = ''
        if comercial and sit == 'ativo':
            pc = prox_html(prox, resp)
        selos = (selo_sit(sit) if sit != 'ativo' else '') + pc
        cartoes += (f'<li class="cartao{" cl-venc" if venc else ""}"><div class="c-topo"><span class="{av}" aria-hidden="true">{ini}</span><div><a class="c-nome" href="{href}">{n}</a><small>{TIPO[tp]}</small></div>{ico("dir", "ico c-ir")}</div>'
                    f'<dl class="c-dados">{dados}</dl>' + (f'<div class="c-selos">{selos}</div>' if selos else '') + '</li>')
    th_com = '<th scope="col">Origem</th><th scope="col">Próximo contato</th>' if comercial else ''
    cols = ('<col style="width:26%"><col style="width:24%"><col style="width:15%"><col style="width:22%"><col style="width:13%">' if comercial
            else '<col style="width:42%"><col style="width:40%"><col style="width:18%">')
    return (f'<table class="so-pc cl-tab"><caption class="sr">Clientes</caption><colgroup>{cols}</colgroup>'
            f'<thead><tr><th scope="col">Cliente</th><th scope="col">Contato principal</th>{th_com}<th scope="col">Situação</th></tr></thead>'
            f'<tbody>{linhas}</tbody></table><ul class="cartoes so-cel" aria-label="Clientes">{cartoes}</ul>')


def ferramentas(valor='', chip='ativos', comercial=True, ocupado=False):
    v = f' value="{H(valor)}"' if valor else ''
    def b(k, rot):
        return f'<button type="button" aria-pressed="{"true" if chip == k else "false"}">{rot}</button>'
    chips = b('ativos', f'Ativos ({len(ATIVOS)})') + b('inativos', f'Inativos ({len(INATIVOS)})')
    if comercial:
        chips += b('vencidos', f'{ico("alerta", "ico ico-s")}Contato vencido ({len(VENCIDOS)})')
    bz = ' aria-busy="true"' if ocupado else ''
    return (f'<form class="cl-ferr" role="search" action="#" onsubmit="return false"{bz}>'
            f'<div class="campo-busca"><label class="sr" for="cl-busca">Buscar por nome, CPF, CNPJ ou telefone</label>{ico("busca")}'
            f'<input class="entrada" id="cl-busca" type="search" placeholder="Nome, CPF, CNPJ ou telefone" autocomplete="off" spellcheck="false"{v}></div>'
            f'<div class="chips" role="group" aria-label="Mostrar">{chips}</div></form>')


def folha_lista(miolo, cont='', **kw):
    c = f'<p class="cl-cont" role="status">{cont}</p>' if cont else ''
    return f'<section class="folha" aria-labelledby="t-lista" style="overflow:hidden"><h2 id="t-lista" class="sr">Lista de clientes</h2>{ferramentas(**kw)}{c}{miolo}</section>'


PE_SEM_COM = (f'<p class="pt-pe-folha">{ico("cadeado")}<span>Origem, próximo contato e histórico de atendimento ficam na área Comercial, que não está liberada para você. '
              f'Quem libera é Marina Ribeiro, a sócia dona.</span></p>')


def cab_lista(comercial=True):
    lede = ('Quem o escritório atende: contatos, qualificação para procuração e contrato, origem e histórico de atendimento. Todos da equipe veem esta lista.'
            if comercial else 'Quem o escritório atende: contatos e a qualificação para procuração e contrato. Todos da equipe veem esta lista.')
    return (f'<div class="cabeca-ambar campo-ambar cabeca-equipe cl-cab-lista"><div><p class="sobretitulo">Cadastro único</p><h1>Clientes</h1><span class="fio" aria-hidden="true"></span>'
            f'<p class="lede">{lede}</p></div>'
            f'<a class="btn btn-escuro" href="clientes.html?estado=novo" style="margin-bottom:6px">{ico("pessoa-mais")}Novo cliente</a></div>')


ESQ_LINHA = ('<div style="display:flex;gap:14px;align-items:center;padding:14px 24px;border-top:1px solid var(--sal)"><span class="esqueleto" style="width:40px;height:40px;border-radius:50%;flex:none"></span>'
             '<div style="flex:1;display:grid;gap:8px"><span class="esqueleto esq-linha" style="width:45%;height:13px"></span><span class="esqueleto esq-linha" style="width:25%;height:10px"></span></div>'
             '<span class="esqueleto esq-linha so-pc-i" style="width:120px;height:26px"></span></div>')


def carregando_lista():
    return (f'<section class="folha" style="overflow:hidden" aria-busy="true"><h2 class="sr">Lista de clientes</h2>{ferramentas(ocupado=True)}'
            f'<p class="sr" role="status">Carregando os clientes…</p><div aria-hidden="true">{ESQ_LINHA * 7}</div></section>')


# ---------------------------------------------------------------- formulário (novo e editar)
def campo(id_, rot, valor='', cls='c3', tipo='text', uso='', opc=False, ajuda='', erro='', extra='', ac='off', im='', foco=False, mudou=False, depois=''):
    o = ' <span class="opcional">(opcional)</span>' if opc else ''
    u = f'<span class="cl-uso">{uso}</span>' if uso else ''
    m = '<span class="mudou">Mudou</span>' if mudou else ''
    desc = []
    aj = ''
    if ajuda:
        aj = f'<p class="ajuda" id="{id_}-aj">{ajuda}</p>'
        desc.append(f'{id_}-aj')
    er = ''
    if erro:
        er = f'<p class="erro-msg" id="{id_}-er">{ico("alerta", "ico ico-s")}{erro}</p>'
        desc.append(f'{id_}-er')
    a = ''
    if desc:
        a += f' aria-describedby="{" ".join(desc)}"'
    if erro:
        a += ' aria-invalid="true"'
    if im:
        a += f' inputmode="{im}"'
    if foco:
        a += ' data-foco'
    v = f' value="{H(valor)}"' if valor else ''
    return (f'<div class="campo {cls}"><label for="{id_}">{rot}{o}{u}{m}</label>'
            f'<input class="entrada" id="{id_}" name="{id_}" type="{tipo}" autocomplete="{ac}"{v}{a}{extra}>{aj}{depois}{er}</div>')


def selecao(id_, rot, opcoes, sel='', cls='c3', uso='', opc=False, ajuda='', erro='', mudou=False):
    o = ' <span class="opcional">(opcional)</span>' if opc else ''
    u = f'<span class="cl-uso">{uso}</span>' if uso else ''
    m = '<span class="mudou">Mudou</span>' if mudou else ''
    ops = '<option value="">Escolha</option>' + ''.join(f'<option{" selected" if x == sel else ""}>{H(x)}</option>' for x in opcoes)
    desc, aj, er, a = [], '', '', ''
    if ajuda:
        aj = f'<p class="ajuda" id="{id_}-aj">{ajuda}</p>'; desc.append(f'{id_}-aj')
    if erro:
        er = f'<p class="erro-msg" id="{id_}-er">{ico("alerta", "ico ico-s")}{erro}</p>'; desc.append(f'{id_}-er'); a = ' aria-invalid="true"'
    if desc:
        a += f' aria-describedby="{" ".join(desc)}"'
    return f'<div class="campo {cls}"><label for="{id_}">{rot}{o}{u}{m}</label><select class="entrada" id="{id_}" name="{id_}"{a}>{ops}</select>{aj}{er}</div>'


UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split()
EST_CIVIL = ['Solteiro(a)', 'Casado(a)', 'União estável', 'Separado(a)', 'Divorciado(a)', 'Viúvo(a)']
ORIGENS = ['Indicação de cliente', 'Indicação de advogado ou parceiro', 'Google', 'Instagram', 'Site do escritório', 'Passou no escritório', 'Outra']
PROC = 'procuração'
CTR = 'contrato'


def qualif_pf(v, aberto=False, mudou=(), resumo_falta='', pref='q'):
    m = lambda k: k in mudou
    corpo = (
        f'<div class="c6 cl-lgpd">{ico("escudo")}<span><b>Só o que vai para a procuração e o contrato.</b> Cada dado abaixo tem essa finalidade, e por isso não pedimos mais nada '
        f'(nem data de nascimento, nem foto de documento). Quem guarda e responde por estes dados é o escritório (LGPD).</span></div>'
        + selecao(f'{pref}-nac', 'Nacionalidade', ['Brasileira', 'Outra'], v.get('nac', ''), 'c2', PROC)
        + selecao(f'{pref}-civil', 'Estado civil', EST_CIVIL, v.get('civil', ''), 'c2', PROC)
        + campo(f'{pref}-prof', 'Profissão', v.get('prof', ''), 'c2', uso=PROC, mudou=m('prof'))
        + campo(f'{pref}-rg', 'RG', v.get('rg', ''), 'c2', uso=PROC, im='numeric')
        + campo(f'{pref}-rg-org', 'Órgão emissor e UF', v.get('rgorg', ''), 'c2', ajuda='Ex.: SSP/SP')
        + campo(f'{pref}-cep', 'CEP', v.get('cep', ''), 'c2', uso=PROC, im='numeric', ac='postal-code', ajuda='Preenche rua, bairro e cidade.')
        + campo(f'{pref}-end', 'Endereço (rua, número e complemento)', v.get('end', ''), 'c4', uso=PROC, ac='street-address', mudou=m('end'))
        + campo(f'{pref}-bairro', 'Bairro', v.get('bairro', ''), 'c2', uso=PROC)
        + campo(f'{pref}-cidade', 'Cidade', v.get('cidade', ''), 'c4', uso=PROC, ac='address-level2')
        + selecao(f'{pref}-uf', 'UF', UFS, v.get('uf', ''), 'c2', PROC)
    )
    return qualif_box(corpo, 'Qualificação para procuração e contrato', resumo_falta or 'Nacionalidade, estado civil, profissão, RG e endereço. Pode completar depois.', aberto)


def qualif_pj(v, aberto=False, pref='q'):
    corpo = (
        f'<div class="c6 cl-lgpd">{ico("escudo")}<span><b>Só o que vai para a procuração e o contrato.</b> Endereço da sede e quem assina pela empresa. '
        f'Quem guarda e responde por estes dados é o escritório (LGPD).</span></div>'
        + campo(f'{pref}-cep', 'CEP da sede', v.get('cep', ''), 'c2', uso=PROC, im='numeric', ac='postal-code')
        + campo(f'{pref}-end', 'Endereço da sede', v.get('end', ''), 'c4', uso=PROC, ac='street-address')
        + campo(f'{pref}-cidade', 'Cidade', v.get('cidade', ''), 'c4', uso=PROC)
        + selecao(f'{pref}-uf', 'UF', UFS, v.get('uf', ''), 'c2', PROC)
        + f'<div class="cl-sec c6"><h3>Quem assina pela empresa</h3><small>Representante legal, como no contrato social</small></div>'
        + campo(f'{pref}-rep', 'Nome completo', v.get('rep', ''), 'c4', uso=PROC)
        + campo(f'{pref}-rep-cargo', 'Cargo', v.get('cargo', ''), 'c2', uso=PROC, ajuda='Ex.: sócio-administrador')
        + campo(f'{pref}-rep-cpf', 'CPF', v.get('repcpf', ''), 'c2', uso=PROC, im='numeric', ajuda='Conferimos os dígitos.')
        + selecao(f'{pref}-rep-civil', 'Estado civil', EST_CIVIL, v.get('repcivil', ''), 'c2', PROC)
        + campo(f'{pref}-rep-prof', 'Profissão', v.get('repprof', ''), 'c2', uso=PROC)
    )
    return qualif_box(corpo, 'Qualificação para procuração e contrato', 'Sede e representante legal. Pode completar depois.', aberto)


def qualif_box(corpo, titulo, sub, aberto):
    o = ' open' if aberto else ''
    return (f'<details class="cl-qualif"{o}><summary><span class="cl-ic">{ico("pena")}</span><span><strong>{titulo}</strong><small>{sub}</small></span>'
            f'<span class="cl-abre">{"Recolher" if aberto else "Preencher agora"}{ico("baixo", "ico ico-s")}</span></summary><div class="cl-q-corpo">{corpo}</div></details>')


def tipo_radios(tp='PF', nome='n-tipo'):
    def r(k, rot, sub):
        ch = ' checked' if tp == k else ''
        return f'<label class="opcao"><input class="marcar" type="radio" name="{nome}" value="{k}"{ch}><span>{rot}<small>{sub}</small></span></label>'
    return (f'<fieldset class="cl-tipo"><legend>Tipo de cliente</legend><div class="cl-ops">'
            + r('PF', 'Pessoa física', 'Pede CPF') + r('PJ', 'Pessoa jurídica', 'Empresa, associação ou condomínio; pede CNPJ') + '</div></fieldset>')


def form_novo(tp='PF', variante='', comercial=True):
    resumo, foco = '', True
    e_nome = e_ct = e_doc = ''
    nome = tel = mail = doc = ''
    ok_doc = ''
    dup = ''
    qual_aberto = False
    vq = {}
    if variante == 'erros':
        resumo = f'<div class="c6">{aviso("urgencia", "Falta acertar 3 pontos, marcados abaixo.", "O cliente ainda não foi cadastrado.")}</div>'
        e_nome = 'Escreva o nome completo do cliente.'
        e_ct = 'Escreva um telefone ou um e-mail. Sem contato, o escritório não tem como falar com o cliente.'
        doc = CPF_ERRADO
        e_doc = 'Confira o CPF: o último dígito não bate com os anteriores. Veja se algum número foi trocado, ou deixe em branco por agora.'
    elif variante == 'duplicado':
        nome, tel = 'Antonia F. Prado', '(11) 98765-4321'
        dup = ('<div class="c6 cl-dup">' + aviso('atencao', 'Já existe um cliente com este telefone: Antônia Ferreira Prado.',
               'Ativa, cliente desde 27/10/2026. Se for a mesma pessoa, abra a ficha dela para não ter dois cadastros. Se for outra pessoa (um parente que usa o mesmo número, por exemplo), pode cadastrar normalmente.',
               icone='pessoas', acoes=f'<a class="btn btn-sec" href="{FICHA}">{ico("dir")}Abrir a ficha de Antônia</a>', papel='status') + '</div>')
    elif variante == 'qualificacao':
        nome, tel, mail, doc = 'Marcos Vinícius Duarte', '(11) 97310-5582', 'marcos.duarte@exemplo.com.br', cpf('905318274')
        ok_doc = f'<p class="cl-ok">{ico("check")}Dígitos conferidos</p>'
        vq = dict(nac='Brasileira', civil='Casado(a)', prof='Motorista de aplicativo', rg='', cep='04117-030', end='Rua das Acácias, 418, casa 2', bairro='Vila Mariana', cidade='São Paulo', uf='SP')
        qual_aberto = True
    elif variante == 'pj':
        nome, tel = 'Oficina Irmãos Dias Ltda.', '(11) 2671-4408'
    r = resumo
    if tp == 'PF':
        r += tipo_radios('PF')
        r += f'<div class="cl-sec cl-primeira"><h3>Para começar</h3><small>Só isto é obrigatório</small></div>'
        r += campo('n-nome', 'Nome completo', nome, 'c6', uso=PROC, erro=e_nome, ac='off', foco=True,
                   ajuda='' if e_nome else 'Como está no documento. Vai na procuração e no contrato.')
        r += campo('n-tel', 'Telefone ou WhatsApp', tel, 'c3', tipo='tel', im='tel', erro=e_ct, ajuda='' if e_ct else 'Para falar com o cliente.')
        r += campo('n-email', 'E-mail', mail, 'c3', tipo='email', opc=True, ajuda='Para falar com o cliente.')
        r += dup
        r += campo('n-doc', 'CPF', doc, 'c3', uso=PROC, opc=True, im='numeric', erro=e_doc,
                   ajuda='' if e_doc else 'Conferimos os dígitos e avisamos se já houver cliente com este CPF.', depois=ok_doc)
    else:
        r += tipo_radios('PJ')
        r += f'<div class="cl-sec cl-primeira"><h3>Para começar</h3><small>Só isto é obrigatório</small></div>'
        r += campo('n-nome', 'Razão social', nome, 'c6', uso=PROC, foco=True, ajuda='Como está no CNPJ. Vai na procuração e no contrato.')
        r += campo('n-ct-nome', 'Com quem falar', 'Rogério Dias', 'c3', ajuda='Pessoa da empresa que fala com o escritório.')
        r += campo('n-ct-papel', 'Papel', 'Sócio', 'c3', opc=True, ajuda='Ex.: sócio, gerente, financeiro')
        r += campo('n-tel', 'Telefone ou WhatsApp', tel, 'c3', tipo='tel', im='tel', ajuda='Telefone ou e-mail: pelo menos um.')
        r += campo('n-email', 'E-mail', '', 'c3', tipo='email', opc=True)
        r += campo('n-doc', 'CNPJ', '', 'c3', uso=PROC, opc=True, im='numeric', ajuda='Conferimos os dígitos e avisamos se já houver cliente com este CNPJ.')
    if comercial:
        r += f'<div class="cl-sec"><h3>Como chegou ao escritório</h3><small>Origem do contato · área Comercial</small></div>'
        r += selecao('n-origem', 'Origem', ORIGENS, 'Indicação de cliente' if variante in ('qualificacao', 'duplicado') else '', 'c3', opc=True,
                     ajuda='Para saber de onde vêm os clientes. Não vai em documento.')
        r += campo('n-indicou', 'Quem indicou', 'Rosa Almeida' if variante == 'qualificacao' else '', 'c3', opc=True, ajuda='Só para indicação.')
    r += qualif_pf(vq, qual_aberto) if tp == 'PF' else qualif_pj({}, False)
    r += (f'<div class="form-pe"><span class="esq-pe">Os campos sem “(opcional)” são obrigatórios. O cadastro fica no histórico do escritório, com seu nome e a hora.</span>'
          f'<a class="btn btn-fantasma" href="clientes.html?estado=lista">Cancelar</a><button class="btn btn-pri" type="submit">{ico("check")}Cadastrar cliente</button></div>')
    return (f'<section class="folha" aria-labelledby="t-novo"><div class="folha-cab"><div><h2 id="t-novo">Dados do cliente</h2>'
            f'<p class="sub">Comece pelo nome e um contato. A qualificação pode ficar para quando for fazer a procuração.</p></div></div>'
            f'<form class="form-folha" action="#" novalidate>{r}</form></section>')


def explica_novo(comercial=True):
    return (f'<section class="explica campo-ambar" aria-labelledby="t-ex"><p class="sobretitulo">Cadastro mínimo</p><h2 id="t-ex">Pede só o que vai usar.</h2><ul>'
            f'<li>{ico("pessoa-mais")}<span>Para cadastrar bastam o nome e um telefone ou e-mail.</span></li>'
            f'<li>{ico("pena")}<span>A qualificação (estado civil, profissão, RG, endereço) serve à procuração e ao contrato. A ficha mostra o que falta.</span></li>'
            f'<li>{ico("pessoas")}<span>Se o CPF, o CNPJ ou o telefone já estiverem em outro cliente, avisamos. Você decide se é a mesma pessoa.</span></li>'
            f'<li>{ico("escudo")}<span>O escritório é o controlador destes dados (LGPD).</span></li>'
            '</ul></section>')


def cab_novo(tp='PF'):
    return (f'<div class="pt-cab"><div><p class="sobretitulo">Clientes</p><h1>Novo cliente</h1><span class="fio" aria-hidden="true"></span></div></div>')


def pagina_novo(tp='PF', variante='', comercial=True):
    return cab_novo(tp) + f'<div class="cl-grade"><div class="cl-col">{form_novo(tp, variante, comercial)}</div><aside class="cl-col" aria-label="Como funciona o cadastro">{explica_novo(comercial)}</aside></div>'


# ---------------------------------------------------------------- ficha
ANT = dict(nome='Antônia Ferreira Prado', tp='PF', desde='27/10/2026')


def ficha_cab(c, dir_html, situacao='ativo'):
    nome, tp, desde = c['nome'], c['tp'], c['desde']
    s = '<span class="selo selo-ativo">Ativo</span>' if situacao == 'ativo' else '<span class="selo selo-neutro">Inativo</span>'
    doc = c.get('doc', '')
    d = f'<span class="sep" aria-hidden="true"></span><span class="num">{doc}</span>' if doc else ''
    return (f'<div class="ficha-cab"><div class="esq campo-vinho">{ico("balanca", "ico estatua")}'
            f'<a class="voltar" href="clientes.html?estado=lista">{ico("esq", "ico ico-s")}Clientes</a>'
            f'<div class="ident"><div><p class="sobretitulo">Cliente · {TIPO[tp].lower()}</p><h1>{H(nome)}</h1>'
            f'<p class="meta">{s}<span>cliente desde {desde}</span>{d}</p></div></div></div>{dir_html}</div>')


def dir_prox(data, quando, oque, resp, tipo='vencido', botao=True):
    selo = (f'<span class="selo selo-urgente">{ico("alerta")}{quando}</span>' if tipo == 'vencido'
            else f'<span class="selo selo-ativo">{quando}</span>')
    b = f'<button class="btn btn-pri" type="button" data-janela="janela-registrar">{ico("mais")}Registrar atendimento</button>' if botao else ''
    return (f'<section class="dir campo-ambar" aria-labelledby="t-prox"><p class="sobretitulo" id="t-prox">Próximo contato</p>'
            f'<div class="cl-dir-linha"><p class="grande">{data}</p>{selo}</div>'
            f'<p class="cl-oque"><b>{oque}</b><br>com {resp}</p>{b}</section>')


def dir_proc(n, total, falta):
    return (f'<section class="dir campo-ambar" aria-labelledby="t-proc"><p class="sobretitulo" id="t-proc">Para a procuração</p>'
            f'<p class="grande">{n} de {total}<small>dados</small></p><p class="cl-oque">Falta: <b>{falta}</b></p>'
            f'<a class="btn btn-pri" href="clientes.html?estado=editar">{ico("lapis")}Completar qualificação</a></section>')


def abas(atual, n_at=3, comercial=True):
    a = f'<a data-aba="ficha" href="{FICHA}">Ficha</a>'
    if comercial:
        a += f'<a data-aba="atendimentos" href="clientes.html?estado=atendimentos">Atendimentos<span class="q">{n_at}</span></a>'
    return f'<nav class="abas" aria-label="Seções da ficha">{a}</nav>'


def dados_ant(edit_btn=True):
    falta = lambda: f'<dd class="falta cl-falta-dd">Falta<span class="selo selo-atencao">{ico("pena")}pede para a procuração</span></dd>'
    b = f'<div class="acoes"><a class="btn btn-sec" href="clientes.html?estado=editar">{ico("lapis")}Editar</a></div>' if edit_btn else ''
    return (f'<section class="folha" aria-labelledby="t-dados"><div class="folha-cab"><div><h2 id="t-dados">Dados e qualificação</h2>'
            f'<p class="sub">O que vai na procuração e no contrato.</p></div>{b}</div>'
            f'<dl class="dados-ficha">'
            f'<div class="inteira"><dt>Nome completo</dt><dd>Antônia Ferreira Prado</dd></div>'
            f'<div><dt>CPF</dt><dd><span class="num">{CPF_ANT}</span><span class="selo selo-ok">{ico("check")}Dígitos conferidos</span></dd></div>'
            f'<div><dt>RG</dt>{falta()}</div>'
            f'<div><dt>Nacionalidade</dt><dd>Brasileira</dd></div>'
            f'<div><dt>Estado civil</dt><dd>Viúva</dd></div>'
            f'<div><dt>Profissão</dt>{falta()}</div>'
            f'<div><dt>E-mail</dt><dd class="falta">Não tem</dd></div>'
            f'<div class="inteira"><dt>Endereço</dt><dd>Rua das Acácias, 418, casa 2, Vila Mariana, São Paulo, SP · CEP 04117-030</dd></div>'
            f'</dl></section>')


def contatos_ant():
    return (f'<section class="folha" aria-labelledby="t-ct"><div class="folha-cab"><div><h2 id="t-ct">Contatos</h2><p class="sub">2 contatos · o principal é quem o escritório procura primeiro</p></div>'
            f'<div class="acoes"><a class="btn btn-sec" href="clientes.html?estado=editar">{ico("mais")}Adicionar contato</a></div></div><ul class="lista">'
            f'<li class="contato"><div><strong>Joana Prado</strong><small class="cl-papel">Filha · acompanha o caso <span class="selo selo-ativo">Principal</span></small></div>'
            f'<a href="tel:+5511991234567">{ico("whats")}<span class="num">(11) 99123-4567</span></a><a href="mailto:joana.prado@exemplo.com.br">{ico("envelope")}joana.prado@exemplo.com.br</a></li>'
            f'<li class="contato"><div><strong>Antônia Ferreira Prado</strong><small>A própria cliente</small></div>'
            f'<a href="tel:+5511987654321">{ico("telefone")}<span class="num">(11) 98765-4321</span></a><span class="sem">Sem e-mail</span></li>'
            f'</ul></section>')


def proc_ant():
    it = [('Nome completo', 1), ('CPF', 1), ('Nacionalidade', 1), ('Estado civil', 1), ('Endereço', 1), ('Profissão', 0), ('RG', 0)]
    li = ''.join(f'<li>{ico("check")}<span>{n}<span class="sr">: preenchido</span></span></li>' if ok
                 else f'<li class="cl-falta">{ico("alerta")}<span><b>{n}</b>: falta</span></li>' for n, ok in it)
    return (f'<section class="folha" aria-labelledby="t-proc2"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-proc2" style="font-size:20px">Para gerar a procuração</h2></div></div>'
            f'<div class="cl-proc-num"><strong>5 de 7</strong><span>dados prontos</span></div><ul class="cl-proc">{li}</ul>'
            f'<div class="cl-folha-acao"><p>Quando a área Contratos chegar, a procuração sai com estes dados e os do advogado (nome e OAB).</p>'
            f'<a class="btn btn-sec" href="clientes.html?estado=editar">{ico("lapis")}Completar qualificação</a></div></section>')


def origem_ant():
    return (f'<section class="folha" aria-labelledby="t-org"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-org" style="font-size:20px">Origem</h2></div></div>'
            f'<dl class="cl-origem"><div><dt>Como chegou</dt><dd>Indicação de cliente</dd></div><div><dt>Quem indicou</dt><dd>Rosa Almeida</dd></div>'
            f'<div><dt>Primeiro contato</dt><dd>27/10/2026, por telefone</dd></div><div><dt>Cadastrado por</dt><dd>Paula Nunes</dd></div></dl></section>')


RESERVA = (f'<section class="folha" aria-labelledby="t-res"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-res" style="font-size:20px">Contratos e casos</h2></div></div>'
           f'<div class="cl-reserva"><div>{ico("pena")}<span><b>Contratos</b> de honorários deste cliente aparecem aqui quando a área Contratos tiver tela.</span></div>'
           f'<div>{ico("balanca")}<span><b>Casos e processos</b> aparecem aqui quando o Jurídico tiver tela. Um processo pode ter mais de um cliente, e cada um aparece na própria ficha.</span></div></div></section>')


def situacao_folha(ativo=True):
    if ativo:
        return (f'<section class="folha" aria-labelledby="t-sit"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-sit" style="font-size:20px">Situação</h2></div></div>'
                f'<div class="cl-sit"><p>Ativo desde 27/10/2026. Inativar tira o cliente da lista do dia a dia e encerra o próximo contato. Nada é apagado, e dá para reativar.</p>'
                f'<button class="btn btn-perigo" type="button" data-janela="janela-inativar">{ico("pasta")}Inativar cliente</button></div></section>')
    return ''


def grade_ficha(principal, lateral):
    return f'<div class="cl-grade"><div class="cl-col">{principal}</div><aside class="cl-col" aria-label="Contexto do cliente">{lateral}</aside></div>'


def ev(hora, quem, canal, com, resumo, prox='', novo=False, selo=''):
    p = f'<p class="cl-pc">{ico("relogio")}Próximo contato marcado: <b>{prox}</b></p>' if prox else ''
    cl = ' class="cl-novo"' if novo else ''
    return (f'<li{cl}><time>{hora}</time><span class="pto{" forte" if novo else ""}" aria-hidden="true"></span><div>'
            f'<p><b>{quem}</b> atendeu por {canal}<span class="selo selo-neutro">{canal}</span>{selo}</p><small>com {com}</small>'
            f'<span class="cl-resumo">“{resumo}”</span>{p}</div></li>')


def dia(t, evs):
    return f'<div class="eventos-dia"><h3>{t}</h3><ol class="eventos">{"".join(evs)}</ol></div>'


EV_NOVO = ev('15h10', 'Diego Almeida', 'telefone', 'Joana Prado (filha)',
             'Liguei para Joana. A carta de indeferimento do INSS chegou; ela traz na sexta, junto com o RG da mãe.',
             '20/11/2026 · receber os documentos no escritório · com Paula Nunes', novo=True, selo='<span class="selo selo-ativo">Novo</span>')
EVS = [
    dia('06/11/2026', [ev('16h20', 'Diego Almeida', 'WhatsApp', 'Joana Prado (filha)',
                          'Joana mandou a certidão de óbito e o comprovante de endereço. Falta a carta de indeferimento do INSS; ela vai procurar em casa.',
                          '13/11/2026 · ligar para Joana sobre a carta do INSS · com Diego Almeida')]),
    dia('28/10/2026', [ev('10h05', 'Marina Ribeiro', 'presencial', 'Antônia e Joana Prado',
                          'Primeira reunião. Pensão por morte negada em setembro. Explicamos o recurso administrativo e a ação; ficaram de juntar os documentos.',
                          '06/11/2026 · receber os documentos · com Diego Almeida (feito)')]),
    dia('27/10/2026', [ev('09h40', 'Paula Nunes', 'telefone', 'Joana Prado (filha)',
                          'Ligou por indicação de Rosa Almeida pedindo horário. Reunião marcada para 28/10, às 10h, com Marina.')]),
]


def historico(novo=False, vencido=True):
    av = ''
    if vencido and not novo:
        av = ('<div class="cl-venc-aviso">' + aviso('urgencia', 'O próximo contato venceu há 5 dias.',
              'Era 13/11: ligar para Joana sobre a carta do INSS, com Diego Almeida. Registre o atendimento ou marque outra data.', papel='status') + '</div>')
    d = (dia('18/11/2026 · hoje', [EV_NOVO]) if novo else '') + ''.join(EVS)
    return (f'<section class="folha" aria-labelledby="t-hist" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-hist">Histórico de atendimento</h2>'
            f'<p class="sub">Cada conversa com o cliente ou a família: quando, por onde, quem atendeu e o combinado. Nada aqui é apagado.</p></div>'
            f'<div class="acoes"><button class="btn btn-pri" type="button" data-janela="janela-registrar">{ico("mais")}Registrar atendimento</button></div></div>'
            f'{av}{d}<div class="mais"><span>Mostrando todos os {4 if novo else 3} atendimentos</span></div></section>')


def explica_hist():
    return (f'<section class="explica campo-ambar" aria-labelledby="t-exh"><p class="sobretitulo">Atendimentos</p><h2 id="t-exh">O que foi dito fica com o escritório.</h2><ul>'
            f'<li>{ico("relogio")}<span>Cada atendimento pode marcar o próximo contato, com data e responsável. Vencido, ele aparece em destaque aqui e na lista.</span></li>'
            f'<li>{ico("historico")}<span>Não se edita nem se apaga um atendimento. Para corrigir, registre outro dizendo o que mudou.</span></li>'
            f'<li>{ico("cadeado")}<span>O resumo é sigiloso: só quem tem a área Comercial vê esta aba.</span></li></ul></section>')


def ficha_ant(aba='ficha', novo=False, toast_=''):
    if novo:
        d = dir_prox('20/11', 'sexta', 'Receber os documentos no escritório', 'Paula Nunes', tipo='futuro')
    else:
        d = dir_prox('13/11', 'vencido há 5 dias', 'Ligar para Joana sobre a carta do INSS', 'Diego Almeida')
    cab = ficha_cab(dict(ANT, doc=''), d)
    if aba == 'ficha':
        corpo = grade_ficha(dados_ant() + contatos_ant(), proc_ant() + origem_ant() + RESERVA + situacao_folha())
    else:
        corpo = grade_ficha(historico(novo=novo), explica_hist())
    return f'<div class="cl">{cab}{abas(aba, 4 if novo else 3)}{corpo}</div>' + toast_


# ---------------------------------------------------------------- janelas
def j_registrar(abrir=False, erros=False):
    resumo = aviso('urgencia', 'Falta acertar 2 pontos, marcados abaixo.', 'O atendimento ainda não foi registrado.') if erros else ''
    canais = ['WhatsApp', 'Telefone', 'Presencial', 'E-mail', 'Videochamada']
    com = ['Joana Prado (filha)', 'Antônia Ferreira Prado (cliente)', 'Outra pessoa']
    equipe = ['Diego Almeida', 'Felipe Matos', 'Marina Ribeiro (você)', 'Paula Nunes']
    res_v = '' if erros else 'Liguei para Joana. A carta de indeferimento do INSS chegou; ela traz na sexta, junto com o RG da mãe.'
    e_res = f'<p class="erro-msg" id="rg-res-er">{ico("alerta", "ico ico-s")}Escreva um resumo do que foi conversado, mesmo que curto.</p>' if erros else ''
    a_res = ' aria-invalid="true" aria-describedby="rg-res-aj rg-res-er"' if erros else ' aria-describedby="rg-res-aj"'
    corpo = (resumo
             + '<div class="cl-dois">' + campo('rg-data', 'Data', '18/11/2026', 'c3', im='numeric', foco=not erros, ajuda='dd/mm/aaaa') + campo('rg-hora', 'Hora', '15:10', 'c3', im='numeric', ajuda='hh:mm') + '</div>'
             + '<div class="cl-dois">' + selecao('rg-canal', 'Canal', canais, 'Telefone', 'c3') + selecao('rg-quem', 'Quem atendeu', equipe, 'Diego Almeida', 'c3') + '</div>'
             + selecao('rg-com', 'Com quem falou', com, 'Joana Prado (filha)', 'c6', ajuda='Os contatos da ficha. “Outra pessoa” pede o nome.')
             + f'<div class="campo"><div class="campo-linha"><label for="rg-res">Resumo</label><span class="contador" aria-hidden="true">{len(res_v)} de 2000</span></div>'
             + f'<textarea class="entrada" id="rg-res" name="rg-res"{a_res}{" data-foco" if erros else ""}>{H(res_v)}</textarea>'
             + f'<p class="ajuda" id="rg-res-aj">O que foi conversado e combinado. Fica no histórico e não se apaga.</p>{e_res}</div>'
             + '<fieldset class="cl-prox-grupo"><legend>Próximo contato<small>substitui o que está marcado (13/11)</small></legend>'
             + '<div class="cl-dois">'
             + campo('rg-pdata', 'Data', '12/11/2026' if erros else '20/11/2026', 'c3', im='numeric', ajuda='' if erros else 'dd/mm/aaaa',
                     erro='Esta data já passou. Escolha hoje ou um dia depois.' if erros else '')
             + selecao('rg-presp', 'Responsável', equipe, 'Paula Nunes', 'c3') + '</div>'
             + campo('rg-poque', 'O que fazer', 'Receber os documentos no escritório', 'c6', opc=True)
             + '<label class="opcao"><input class="marcar" type="checkbox" name="rg-sem"><span>Sem próximo contato<small>O acompanhamento deste cliente fica sem data.</small></span></label>'
             + '</fieldset>')
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("check")}Registrar</button>'
    return janela('janela-registrar', 'Antônia Ferreira Prado', 'Registrar atendimento',
                  'Fica no histórico de atendimento com seu nome e a hora. Não se edita nem se apaga depois.', corpo, pe, abrir=abrir or erros)


def j_inativar(abrir=False, erro=False):
    resumo = aviso('urgencia', 'Falta acertar 1 ponto, marcado abaixo.', 'Antônia continua ativa.') if erro else ''
    a = ' aria-invalid="true" aria-describedby="in-mot-aj in-mot-er"' if erro else ' aria-describedby="in-mot-aj"'
    e = f'<p class="erro-msg" id="in-mot-er">{ico("alerta", "ico ico-s")}Escreva o motivo. Ele fica no histórico e ajuda quem for reativar.</p>' if erro else ''
    corpo = (resumo
             + f'<div class="campo"><label for="in-mot">Motivo</label><textarea class="entrada" id="in-mot" name="in-mot"{a} data-foco></textarea>'
             + f'<p class="ajuda" id="in-mot-aj">Ex.: caso encerrado e sem novos serviços; desistiu da ação.</p>{e}</div>'
             + f'<p class="pt-comuns">{ico("historico")}<span>Nada é apagado: dados, contatos e atendimentos ficam guardados e aparecem no filtro “Inativos”. O próximo contato marcado (13/11) é encerrado. Para voltar, use Reativar na ficha.</span></p>')
    pe = '<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-perigo" type="submit">Inativar Antônia</button>'
    return janela('janela-inativar', 'Clientes · Ribeiro &amp; Matos', 'Inativar Antônia Ferreira Prado?',
                  'Ela sai da lista de clientes ativos e da busca do dia a dia.', corpo, pe, alerta=True, abrir=abrir or erro)


def j_reativar(abrir=False):
    corpo = (f'<div class="campo"><label for="re-mot">Motivo <span class="opcional">(opcional)</span></label><textarea class="entrada" id="re-mot" name="re-mot" data-foco></textarea>'
             f'<p class="ajuda">Ex.: voltou a procurar o escritório para um caso novo.</p></div>'
             f'<p class="pt-comuns">{ico("historico")}<span>João Pedro volta para a lista de ativos com os dados, contatos e atendimentos de antes. A reativação fica no histórico.</span></p>')
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("reenviar")}Reativar</button>'
    return janela('janela-reativar', 'Clientes · Ribeiro &amp; Matos', 'Reativar João Pedro Alves?', 'Ele volta a aparecer entre os clientes ativos.', corpo, pe, abrir=abrir)


def janelas(reg=False, reg_erro=False, inat=False, inat_erro=False):
    return j_registrar(reg, reg_erro) + j_inativar(inat, inat_erro)


# ---------------------------------------------------------------- editar e conflito
def contato_edit(n, nome, papel, tel, mail, principal=False):
    ch = ' checked' if principal else ''
    return (f'<div class="contato-edit" role="group" aria-label="Contato {n}: {nome}">'
            f'<div class="campo"><label for="ct{n}-nome">Nome</label><input class="entrada" id="ct{n}-nome" value="{nome}" autocomplete="off"></div>'
            f'<div class="campo"><label for="ct{n}-papel">Papel</label><input class="entrada" id="ct{n}-papel" value="{papel}" autocomplete="off"></div>'
            f'<div class="campo"><label for="ct{n}-tel">Telefone</label><input class="entrada" id="ct{n}-tel" type="tel" value="{tel}" autocomplete="off"></div>'
            f'<div class="campo"><label for="ct{n}-email">E-mail</label><input class="entrada" id="ct{n}-email" type="email" value="{mail}" autocomplete="off"></div>'
            f'<button class="remover" type="button" aria-label="Remover o contato {nome}">{ico("x")}</button>'
            f'<label class="opcao" style="grid-column:1/-1;margin:-6px -8px -8px"><input class="marcar" type="radio" name="ct-principal"{ch}><span>Contato principal</span></label></div>')


def form_editar(conflito=False):
    topo = ''
    if conflito:
        topo = ('<div class="c6">' + aviso('urgencia', 'Felipe Matos salvou esta ficha às 14h52, enquanto você editava.',
                'Nada do que você escreveu se perdeu. Compare os dois campos que mudaram e escolha qual versão fica.',
                acoes=('<table class="comparar"><caption class="sr">Campos que mudaram</caption><thead><tr><th scope="col">Campo</th><th scope="col">Salvo agora</th><th scope="col">O que você escreveu</th></tr></thead><tbody>'
                       '<tr><th scope="row">Profissão</th><td>Aposentada</td><td>Do lar</td></tr>'
                       '<tr><th scope="row">Endereço</th><td>Rua das Acácias, 418, casa 2</td><td>Rua das Acácias, 418, casa 3</td></tr></tbody></table>'
                       '<div class="aviso-acoes" style="width:100%"><button class="btn btn-pri" type="button">Salvar a minha versão</button><button class="btn btn-sec" type="button">Ficar com a versão salva</button></div>')) + '</div>')
    v = dict(nac='Brasileira', civil='Viúvo(a)', prof='Do lar', rg='28.471.093-6', rgorg='SSP/SP', cep='04117-030', end='Rua das Acácias, 418, casa 3' if conflito else 'Rua das Acácias, 418, casa 2',
             bairro='Vila Mariana', cidade='São Paulo', uf='SP')
    r = topo
    r += campo('e-nome', 'Nome completo', 'Antônia Ferreira Prado', 'c4', uso=PROC, foco=not conflito)
    r += campo('e-doc', 'CPF', CPF_ANT, 'c2', uso=PROC, im='numeric', ajuda='Dígitos conferidos.')
    r += campo('e-email', 'E-mail', '', 'c3', tipo='email', opc=True, ajuda='Para falar com a cliente. Vai no contrato, se houver.')
    r += selecao('e-origem', 'Origem', ORIGENS, 'Indicação de cliente', 'c3', opc=True, ajuda='Não vai em documento.')
    q = qualif_pf(v, True, mudou=('prof', 'end') if conflito else (), resumo_falta='7 de 7 dados para a procuração', pref='eq')
    r += q
    r += ('<fieldset class="contatos-edit"><legend>Contatos<small>Até 10. Cada um precisa de telefone ou e-mail. O principal é quem o escritório procura primeiro.</small></legend>'
          + contato_edit(1, 'Joana Prado', 'Filha, acompanha o caso', '(11) 99123-4567', 'joana.prado@exemplo.com.br', True)
          + contato_edit(2, 'Antônia Ferreira Prado', 'A própria cliente', '(11) 98765-4321', '')
          + f'<div><button class="btn btn-fantasma" type="button">{ico("mais")}Adicionar contato</button></div></fieldset>')
    r += (f'<div class="form-pe"><span class="esq-pe">Cada mudança vai para o histórico do escritório, com seu nome e os campos alterados.</span>'
          f'<a class="btn btn-fantasma" href="{FICHA}">Cancelar</a><button class="btn btn-pri" type="submit">{ico("check")}Salvar ficha</button></div>')
    return (f'<section class="folha" aria-labelledby="t-editar"><div class="folha-cab"><div><h2 id="t-editar">Editar ficha</h2>'
            f'<p class="sub">Os campos sem “(opcional)” são obrigatórios.</p></div></div><form class="form-folha" action="#" novalidate>{r}</form></section>')


EXPLICA_EDIT = (f'<section class="explica campo-ambar" aria-labelledby="t-exe"><p class="sobretitulo">Editando</p><h2 id="t-exe">A ficha é do escritório.</h2><ul>'
                f'<li>{ico("historico")}<span>Cada mudança vai para o histórico, com seu nome e os campos alterados.</span></li>'
                f'<li>{ico("pessoas")}<span>Se outra pessoa salvar antes, avisamos quem foi e a hora, e você escolhe qual versão fica.</span></li>'
                f'<li>{ico("escudo")}<span>Cada dado da qualificação serve à procuração e ao contrato. Não peça o que não vai usar.</span></li></ul></section>')


def ficha_editar(conflito=False):
    d = dir_prox('13/11', 'vencido há 5 dias', 'Ligar para Joana sobre a carta do INSS', 'Diego Almeida', botao=False)
    return f'<div class="cl">{ficha_cab(ANT, d)}{abas("ficha")}{grade_ficha(form_editar(conflito), EXPLICA_EDIT)}</div>'


# ---------------------------------------------------------------- ficha PJ, inativo, sem Comercial
def ficha_pj():
    d = dir_prox('25/11', 'quarta', 'Enviar a minuta do contrato de honorários', 'Felipe Matos', tipo='futuro')
    c = dict(nome='Construtora Vale Alto Ltda.', tp='PJ', desde='14/08/2026')
    dados = (f'<section class="folha" aria-labelledby="t-dados"><div class="folha-cab"><div><h2 id="t-dados">Dados e qualificação</h2><p class="sub">O que vai na procuração e no contrato.</p></div>'
             f'<div class="acoes"><a class="btn btn-sec" href="#">{ico("lapis")}Editar</a></div></div><dl class="dados-ficha">'
             f'<div class="inteira"><dt>Razão social</dt><dd>Construtora Vale Alto Ltda.</dd></div>'
             f'<div><dt>CNPJ</dt><dd><span class="num">{CNPJ_VA}</span><span class="selo selo-ok">{ico("check")}Dígitos conferidos</span></dd></div>'
             f'<div><dt>E-mail</dt><dd>contato@valealto.exemplo.com.br</dd></div>'
             f'<div class="inteira"><dt>Sede</dt><dd>Avenida Industrial, 900, Jardim, Santo André, SP · CEP 09080-500</dd></div>'
             f'<div><dt>Representante legal</dt><dd>Ricardo Vale, sócio-administrador</dd></div>'
             f'<div><dt>CPF do representante</dt><dd><span class="num">{CPF_RIC}</span></dd></div>'
             f'<div><dt>Estado civil do representante</dt><dd>Casado</dd></div><div><dt>Profissão do representante</dt><dd>Engenheiro civil</dd></div></dl></section>')
    cts = (f'<section class="folha" aria-labelledby="t-ct"><div class="folha-cab"><div><h2 id="t-ct">Contatos</h2><p class="sub">2 contatos</p></div>'
           f'<div class="acoes"><a class="btn btn-sec" href="#">{ico("mais")}Adicionar contato</a></div></div><ul class="lista">'
           f'<li class="contato"><div><strong>Ricardo Vale</strong><small class="cl-papel">Sócio-administrador <span class="selo selo-ativo">Principal</span></small></div>'
           f'<a href="tel:+551144382200">{ico("telefone")}<span class="num">(11) 4438-2200</span></a><a href="mailto:ricardo@valealto.exemplo.com.br">{ico("envelope")}ricardo@valealto.exemplo.com.br</a></li>'
           f'<li class="contato"><div><strong>Sônia Martins</strong><small>Financeiro · boletos e notas</small></div>'
           f'<a href="tel:+5511974401123">{ico("whats")}<span class="num">(11) 97440-1123</span></a><a href="mailto:financeiro@valealto.exemplo.com.br">{ico("envelope")}financeiro@valealto.exemplo.com.br</a></li></ul></section>')
    proc = (f'<section class="folha" aria-labelledby="t-proc2"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-proc2" style="font-size:20px">Para gerar a procuração</h2></div></div>'
            f'<div class="cl-proc-num"><strong>6 de 6</strong><span>dados prontos</span></div>'
            f'<div class="cl-folha-acao"><p>Razão social, CNPJ, sede e o representante legal com CPF, estado civil e profissão. Tudo pronto para quando a área Contratos chegar.</p></div></section>')
    org = (f'<section class="folha" aria-labelledby="t-org"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-org" style="font-size:20px">Origem</h2></div></div>'
           f'<dl class="cl-origem"><div><dt>Como chegou</dt><dd>Indicação de advogado ou parceiro</dd></div><div><dt>Quem indicou</dt><dd>Paulo Serra, contador</dd></div>'
           f'<div><dt>Cadastrado por</dt><dd>Felipe Matos</dd></div></dl></section>')
    sit = situacao_folha().replace('Ativo desde 27/10/2026', 'Ativo desde 14/08/2026').replace('janela-inativar', 'janela-inativar-pj')
    return f'<div class="cl">{ficha_cab(c, d)}{abas("ficha", 5)}{grade_ficha(dados + cts, proc + org + RESERVA + sit)}</div>'


def ficha_inativo(toast_=''):
    d = (f'<section class="dir campo-ambar" aria-labelledby="t-prox"><p class="sobretitulo" id="t-prox">Próximo contato</p>'
         f'<p class="grande" style="font-size:30px">Nenhum</p><p class="cl-oque">Encerrado ao inativar, em 10/10/2026.</p></section>')
    c = dict(nome='João Pedro Alves', tp='PF', desde='03/02/2026')
    faixa = ('<div class="aviso aviso-info cl-inativo-faixa" role="status">' + ico('pasta') +
             '<div><strong class="aviso-titulo">Cliente inativo desde 10/10/2026.</strong><p>Marina Ribeiro inativou: “Acordo homologado e pago; caso encerrado sem novos serviços.” Os dados e os atendimentos continuam aqui.</p></div>'
             f'<button class="btn btn-sec" type="button" data-janela="janela-reativar">{ico("reenviar")}Reativar</button></div>')
    dados = (f'<section class="folha" aria-labelledby="t-dados"><div class="folha-cab"><div><h2 id="t-dados">Dados e qualificação</h2><p class="sub">Guardados como estavam ao inativar.</p></div></div><dl class="dados-ficha">'
             f'<div class="inteira"><dt>Nome completo</dt><dd>João Pedro Alves</dd></div><div><dt>CPF</dt><dd><span class="num">{cpf("612094837")}</span></dd></div>'
             f'<div><dt>RG</dt><dd>41.209.338-1 · SSP/SP</dd></div><div><dt>Estado civil</dt><dd>Solteiro</dd></div><div><dt>Profissão</dt><dd>Eletricista</dd></div>'
             f'<div class="inteira"><dt>Endereço</dt><dd>Rua Tomé de Souza, 77, Lapa, São Paulo, SP · CEP 05079-000</dd></div></dl></section>')
    lat = (f'<section class="folha" aria-labelledby="t-sit"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-sit" style="font-size:20px">Situação</h2></div></div>'
           f'<div class="cl-sit"><p>Inativo não aparece na lista do dia a dia nem gera próximo contato. Continua na busca, pelo filtro “Inativos”, e na exportação dos dados do escritório.</p></div></section>' + RESERVA)
    return f'<div class="cl">{ficha_cab(c, d, "inativo")}{abas("ficha", 7)}{faixa}{grade_ficha(dados, lat)}</div>' + j_reativar() + toast_


def ficha_sem_comercial():
    d = dir_proc(5, 7, 'profissão e RG')
    nota = (f'<section class="folha" aria-labelledby="t-semc"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-semc" style="font-size:20px">Atendimentos</h2></div></div>'
            f'<p class="pt-pe-folha" style="border-top:0">{ico("cadeado")}<span>O histórico de atendimento, a origem e o próximo contato ficam na área Comercial, que não está liberada para você. Quem libera é Marina Ribeiro, a sócia dona.</span></p></section>')
    return f'<div class="cl">{ficha_cab(ANT, d)}{abas("ficha", comercial=False)}{grade_ficha(dados_ant() + contatos_ant(), proc_ant() + nota + RESERVA)}</div>'


def ficha_carregando():
    return ('<div aria-busy="true"><p class="sr" role="status">Carregando a ficha do cliente…</p><div aria-hidden="true">'
            '<div class="folha cab-esq" style="min-height:236px"><span class="esqueleto esq-linha" style="width:120px"></span><span class="esqueleto esq-linha" style="width:55%;height:40px"></span>'
            '<span class="esqueleto esq-linha" style="width:35%"></span></div>'
            '<div class="cl-grade" style="margin-top:24px"><div class="cl-col"><section class="folha" style="padding:20px 24px"><span class="esqueleto esq-linha" style="width:220px;height:26px"></span>'
            + '<div style="margin-top:18px;display:grid;gap:14px">' + '<span class="esqueleto esq-linha" style="width:90%"></span>' * 6 + '</div></section></div>'
            '<div class="cl-col"><section class="folha" style="padding:20px 24px;display:grid;gap:12px"><span class="esqueleto esq-linha" style="width:60%;height:22px"></span>'
            + '<span class="esqueleto esq-linha"></span>' * 4 + '</section></div></div></div></div>')


# ---------------------------------------------------------------- estados
T = ''
B = dict(atual='clientes', trilha='Clientes', titulo='Clientes')
F = dict(atual='clientes', trilha='Clientes|Antônia Ferreira Prado', titulo='Antônia Ferreira Prado', aba='ficha')
FA = dict(F, aba='atendimentos')

def L(miolo):
    return f'<div class="cl">{cab_lista()}{miolo}</div>'

T += tpl('lista', L(folha_lista(lista(ATIVOS), cont=f'<b>{len(ATIVOS)} clientes ativos</b> · {len(VENCIDOS)} com o próximo contato vencido')), **B)
T += tpl('busca', L(folha_lista(lista([ATIVOS[0], ATIVOS[7]], termo='Prado'), valor='Prado', cont='<b>2 clientes</b> para “Prado”, no nome ou em um contato')), **B)
T += tpl('busca-cpf', L(folha_lista(lista([ATIVOS[0]]), valor=CPF_ANT, cont=f'<b>1 cliente</b> com o CPF {CPF_ANT}')), **B)
T += tpl('vencidos', L(folha_lista(lista(VENCIDOS), chip='vencidos', cont=f'<b>{len(VENCIDOS)} clientes</b> com o próximo contato vencido, do mais atrasado para o mais recente')), **B)
T += tpl('inativos', L(folha_lista(lista(INATIVOS), chip='inativos', cont=f'<b>{len(INATIVOS)} clientes inativos</b>. Nada foi apagado: abra a ficha para ver ou reativar.')), **B)
T += tpl('sem-resultado', L(folha_lista(estado('Nenhum cliente para “Antonia Pardo”',
        'Confira a grafia, tente só o sobrenome ou busque pelo telefone ou CPF. O cliente pode estar inativo: veja em “Inativos”.', 'busca', moldura=False,
        acoes=f'<button class="btn btn-sec" type="button">{ico("x")}Limpar busca</button><a class="btn btn-pri" href="clientes.html?estado=novo">{ico("pessoa-mais")}Cadastrar cliente</a>'),
        valor='Antonia Pardo')), **B)
T += tpl('vazio', L(f'<section class="folha" aria-labelledby="t-lista" style="overflow:hidden"><h2 id="t-lista" class="sr">Lista de clientes</h2>' + estado(
        'Nenhum cliente cadastrado ainda', 'Comece pelo nome e um telefone ou e-mail. A qualificação para a procuração pode ficar para depois, e a ficha mostra o que falta.',
        'pessoas', moldura=False, acoes=f'<a class="btn btn-pri" href="clientes.html?estado=novo">{ico("pessoa-mais")}Cadastrar o primeiro cliente</a>') + '</section>'), **B)
T += tpl('carregando', L(carregando_lista()), **B)
T += tpl('erro', L(folha_lista(estado('Não deu para carregar os clientes',
        'O servidor não respondeu. Nenhum dado foi perdido. Tente de novo em instantes; se continuar, mande o código ao suporte.', erro=True, moldura=False,
        acoes=f'<button class="btn btn-pri" type="button">{ico("reenviar")}Tentar de novo</button>', codigo='Código para o suporte: PTL-7A31-0418'))), **B)
T += tpl('lista-sem-comercial', f'<div class="cl">{cab_lista(False)}<section class="folha" aria-labelledby="t-lista" style="overflow:hidden"><h2 id="t-lista" class="sr">Lista de clientes</h2>'
         f'{ferramentas(comercial=False)}<p class="cl-cont" role="status"><b>{len(ATIVOS)} clientes ativos</b></p>{lista(ATIVOS, comercial=False)}{PE_SEM_COM}</section></div>', quem='juridico', **B)

N = dict(atual='clientes', trilha='Clientes|Novo cliente', titulo='Novo cliente')
T += tpl('novo', pagina_novo(), **N)
T += tpl('novo-qualificacao', pagina_novo(variante='qualificacao'), **N)
T += tpl('novo-erros', pagina_novo(variante='erros'), **N)
T += tpl('novo-duplicado', pagina_novo(variante='duplicado'), **N)
T += tpl('novo-pj', pagina_novo('PJ', variante='pj'), **N)

# Recém-cadastrado: ficha com o mínimo
def ficha_nova():
    d = (f'<section class="dir campo-ambar" aria-labelledby="t-prox"><p class="sobretitulo" id="t-prox">Próximo contato</p>'
         f'<p class="grande" style="font-size:30px">Nenhum</p><p class="cl-oque">Registre o primeiro atendimento e marque quando falar de novo.</p>'
         f'<button class="btn btn-pri" type="button" data-janela="janela-registrar">{ico("mais")}Registrar atendimento</button></section>')
    c = dict(nome='Marcos Vinícius Duarte', tp='PF', desde=HOJE)
    dados = (f'<section class="folha" aria-labelledby="t-dados"><div class="folha-cab"><div><h2 id="t-dados">Dados e qualificação</h2><p class="sub">O que vai na procuração e no contrato.</p></div>'
             f'<div class="acoes"><a class="btn btn-sec" href="clientes.html?estado=editar">{ico("lapis")}Editar</a></div></div><dl class="dados-ficha">'
             f'<div class="inteira"><dt>Nome completo</dt><dd>Marcos Vinícius Duarte</dd></div>'
             + ''.join(f'<div><dt>{n}</dt><dd class="falta cl-falta-dd">Falta<span class="selo selo-atencao">{ico("pena")}pede para a procuração</span></dd></div>'
                       for n in ['CPF', 'RG', 'Nacionalidade', 'Estado civil', 'Profissão', 'Endereço']) + '</dl></section>')
    cts = (f'<section class="folha" aria-labelledby="t-ct"><div class="folha-cab"><div><h2 id="t-ct">Contatos</h2><p class="sub">1 contato</p></div>'
           f'<div class="acoes"><a class="btn btn-sec" href="#">{ico("mais")}Adicionar contato</a></div></div><ul class="lista">'
           f'<li class="contato"><div><strong>Marcos Vinícius Duarte</strong><small class="cl-papel">O próprio cliente <span class="selo selo-ativo">Principal</span></small></div>'
           f'<a href="tel:+5511973105582">{ico("telefone")}<span class="num">(11) 97310-5582</span></a><span class="sem">Sem e-mail</span></li></ul></section>')
    proc = (f'<section class="folha" aria-labelledby="t-proc2"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-proc2" style="font-size:20px">Para gerar a procuração</h2></div></div>'
            f'<div class="cl-proc-num"><strong>1 de 7</strong><span>dados prontos</span></div><div class="cl-folha-acao"><p>Faltam CPF, RG, nacionalidade, estado civil, profissão e endereço. Complete quando for preparar a procuração.</p>'
            f'<a class="btn btn-sec" href="clientes.html?estado=editar">{ico("lapis")}Completar qualificação</a></div></section>')
    t = toast('Marcos Vinícius Duarte cadastrado.', 'A ficha está pronta para usar. A qualificação pode ficar para quando for preparar a procuração.')
    return f'<div class="cl">{ficha_cab(c, d)}{abas("ficha", 0)}{grade_ficha(dados + cts, proc + RESERVA)}</div>{t}'

T += tpl('cadastrado', ficha_nova() + j_registrar(), atual='clientes', trilha='Clientes|Marcos Vinícius Duarte', titulo='Marcos Vinícius Duarte', aba='ficha')
T += tpl('ficha', ficha_ant() + janelas(), **F)
T += tpl('atendimentos', ficha_ant('atendimentos') + janelas(), **FA)
T += tpl('registrar', ficha_ant('atendimentos') + janelas(reg=True), **FA)
T += tpl('registrar-erros', ficha_ant('atendimentos') + janelas(reg_erro=True), **FA)
T += tpl('registrado', ficha_ant('atendimentos', novo=True, toast_=toast('Atendimento registrado.', 'O próximo contato agora é 20/11, com Paula Nunes. O de 13/11 foi encerrado.')) + janelas(), **FA)
T += tpl('editar', ficha_editar(), **F)
T += tpl('conflito', ficha_editar(True), **F)
T += tpl('inativar', ficha_ant() + janelas(inat=True), **F)
T += tpl('inativar-erro', ficha_ant() + janelas(inat_erro=True), **F)
T += tpl('inativo', ficha_inativo(), atual='clientes', trilha='Clientes|João Pedro Alves', titulo='João Pedro Alves', aba='ficha')
T += tpl('reativar', ficha_inativo().replace('<dialog class="janela" id="janela-reativar"', '<dialog class="janela" id="janela-reativar" data-abrir'),
         atual='clientes', trilha='Clientes|João Pedro Alves', titulo='João Pedro Alves', aba='ficha')
T += tpl('reativado', '<div class="cl">' + ficha_cab(dict(nome='João Pedro Alves', tp='PF', desde='03/02/2026'),
         f'<section class="dir campo-ambar" aria-labelledby="t-prox"><p class="sobretitulo" id="t-prox">Próximo contato</p><p class="grande" style="font-size:30px">Nenhum</p>'
         f'<p class="cl-oque">Registre o atendimento que trouxe João Pedro de volta.</p><button class="btn btn-pri" type="button" data-janela="janela-registrar">{ico("mais")}Registrar atendimento</button></section>')
         + abas('ficha', 7) + grade_ficha(
             f'<section class="folha" aria-labelledby="t-dados"><div class="folha-cab"><div><h2 id="t-dados">Dados e qualificação</h2><p class="sub">Os mesmos de antes.</p></div></div><dl class="dados-ficha">'
             f'<div class="inteira"><dt>Nome completo</dt><dd>João Pedro Alves</dd></div><div><dt>CPF</dt><dd><span class="num">{cpf("612094837")}</span></dd></div>'
             f'<div><dt>RG</dt><dd>41.209.338-1 · SSP/SP</dd></div><div><dt>Estado civil</dt><dd>Solteiro</dd></div><div><dt>Profissão</dt><dd>Eletricista</dd></div>'
             f'<div class="inteira"><dt>Endereço</dt><dd>Rua Tomé de Souza, 77, Lapa, São Paulo, SP · CEP 05079-000</dd></div></dl></section>', RESERVA)
         + '</div>' + toast('João Pedro Alves reativado.', 'Ele voltou para a lista de ativos com tudo o que tinha. A reativação ficou no histórico.') + j_registrar(),
         atual='clientes', trilha='Clientes|João Pedro Alves', titulo='João Pedro Alves', aba='ficha')
T += tpl('ficha-pj', ficha_pj() + janelas().replace('id="janela-inativar"', 'id="janela-inativar-pj"').replace('janela-inativar-t', 'janela-inativar-pj-t').replace('janela-inativar-d', 'janela-inativar-pj-d'),
         atual='clientes', trilha='Clientes|Construtora Vale Alto Ltda.', titulo='Construtora Vale Alto Ltda.', aba='ficha')
T += tpl('ficha-sem-comercial', ficha_sem_comercial(), quem='juridico', **F)
T += tpl('ficha-carregando', ficha_carregando(), atual='clientes', trilha='Clientes|…', titulo='Clientes')
T += tpl('ficha-erro', '<div class="cl">' + estado('Não deu para abrir a ficha do cliente',
         'O servidor não respondeu. Nada foi mudado. Tente de novo em instantes; se continuar, mande o código ao suporte.', erro=True,
         acoes=f'<button class="btn btn-pri" type="button">{ico("reenviar")}Tentar de novo</button><a class="btn btn-sec" href="clientes.html?estado=lista">{ico("esq")}Voltar para Clientes</a>',
         codigo='Código para o suporte: PTL-7A31-0522') + '</div>', atual='clientes', trilha='Clientes|Ficha', titulo='Clientes')

out = pagina('Clientes', 'Clientes do escritório no Portal: lista, cadastro, ficha com qualificação, contatos e histórico de atendimento.',
             '{"estado":"lista","atual":"clientes"}', '', T)
out = out.replace('</style>', CSS_CL + '\n</style>', 1)
open(f'{SAIDA}/clientes.html', 'w', encoding='utf-8').write(out)
print('clientes ok', T.count('<template data-est='), 'estados')
