# Portal · o que faltava no desenho aprovado da importação do Astrea e do ADVBOX (F3.56, VA-05):
#   1. a lista dos lembretes de contrato (Contratos › Contratos › Lembretes do sistema antigo), para onde leva o "Ver lembretes";
#   2. dispensar um lembrete à mão, na lista e na folha "Do Astrea" da ficha do cliente;
#   3. a linha "veio da importação" na ficha do caso e o caso importado como encerrado.
# Base sem mudança: sistemas.py (e, por ele, importacao.py, clientes.py, contratos.py, pecas.py e comum.py) e o
# juridico.py aprovado. Este arquivo carrega as definições deles (sem gerar o HTML deles) e acrescenta as peças il-.
# Gera três HTML: lembretes.html, dispensar.html e caso-importado.html.
# Uso: python3 sobras.py <pasta-saida>
import sys, os, html

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
H = html.escape


def _carregar(arq, corte):
    src = open(os.path.join(AQUI, arq), encoding='utf-8').read()
    src = src[:src.index(corte)]
    ns = {'__name__': 'base_' + arq[:-3], '__file__': os.path.join(AQUI, arq)}
    argv = sys.argv[:]
    exec(compile(src, arq, 'exec'), ns)
    sys.argv = argv
    return ns


IS = _carregar('sistemas.py', "# ---------------------------------------------------------------- estados\nT = ''")
JU = _carregar('juridico.py', "# ---------------------------------------------------------------- estados\nT = ''")
IM, CL, CT = IS['IM'], IS['CL'], IS['IM']['CT']
ico, tpl, estado, aviso, janela, selo, tabela = IS['ico'], IS['tpl'], IS['estado'], IS['aviso'], IS['janela'], IS['selo'], IS['tabela']
montar, barras, texto = IS['montar'], IS['barras'], IS['texto']

HOJE = '23/11/2026'
L = 'lembretes.html?estado='
D = 'dispensar.html?estado='
J = 'caso-importado.html?estado='
RES = '../portal-importacao-sistemas/sistemas.html?estado=resultado-sistema'
IMPS = '../portal-importacao-sistemas/sistemas.html?estado=importacoes'
CTR = '../portal-comercial-contratos/contratos.html?estado='
N1 = IS['N1']
N_LINS = IS['cnj'](1018845, 2025, 8, 26, 100)
N_LUME = IS['cnj'](1003377, 2022, 8, 26, 405)
N_CASTRO = IS['cnj'](1007702, 2025, 8, 26, 100)
N_MENDES = IS['cnj'](1000953, 2025, 5, 2, 30)
N_PRADO2 = IS['cnj'](1005561, 2024, 8, 26, 100)
N_QUEIROZ = IS['cnj'](1001190, 2021, 5, 2, 12)
CPF_MARCIO = IS['CPF_MARCIO']

# ---------------------------------------------------------------- CSS novo (prefixo il-)
CSS_IL = r"""
/* ==========================================================================
   Portal · sobras da importação de outros sistemas (F3.56, VA-05). Prefixo il-.
   Só pares do contraste.md e do conceito Gabinete. O resto é aprovado (hn-, ct-, im-, is-, ju-, cl-).
   ========================================================================== */
/* Selo da origem: o mesmo .is-orig aprovado, aqui com o nome il- para valer também no Jurídico */
.il-orig{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:13px;background:var(--ambar-3);color:var(--vinho-escuro);font-size:12px;font-weight:600;white-space:nowrap}
.il-orig .ico{width:14px;height:14px;color:var(--vinho)}
.il-orig-l{background:var(--sal-2);color:var(--vinho)}
/* Selo do caso que veio encerrado: neutro, com ícone e texto */
.il-selo-enc{display:inline-flex;align-items:center;gap:6px;min-height:24px;padding:2px 10px;border-radius:12px;background:var(--sal-2);color:var(--vinho);font-size:12px;font-weight:500;line-height:1.3;border:1px dashed var(--vinho-4)}
.il-selo-enc .ico{width:14px;height:14px}
.ficha-cab .esq .meta .il-selo-enc{background:var(--sal);border-color:var(--vinho-4)}

/* Lista dos lembretes */
.il-numeros{grid-template-columns:repeat(3,minmax(0,1fr))!important}
.il-numeros .r .il-soma{display:block;font-family:var(--serifa);font-size:20px;font-weight:500;color:var(--vinho);line-height:1.2;margin-top:2px}
.il-tab td{vertical-align:middle}
.il-tab .esc a{font-family:var(--serifa);font-size:18px;font-weight:500}
.il-valor{font-family:var(--serifa);font-size:22px;font-weight:500;color:var(--vinho);line-height:1.2;white-space:nowrap}
.il-tab td small.il-ja{display:flex;gap:6px;align-items:flex-start;margin-top:6px;color:var(--tinta);font-size:12px;line-height:1.4}
.il-tab td small.il-ja .ico{width:14px;height:14px;flex:none;color:var(--vinho);margin-top:1px}
.il-acoes{display:flex;flex-direction:column;gap:8px;align-items:stretch;max-width:200px;margin-left:auto}
.il-acoes .btn{min-height:44px;white-space:normal;text-align:center;justify-content:center;height:auto;padding-top:8px;padding-bottom:8px}
.il-tab tr.il-saiu td{background:#FCF8F5}
.il-tab tr.il-saiu td:first-child{box-shadow:inset 3px 0 0 var(--vinho-4)}
.il-motivo{display:block;margin-top:4px;font-family:var(--serifa);font-style:italic;font-size:15px;color:var(--tinta);line-height:1.35}
.il-ferr .entrada{min-height:44px}
.il-ferr select.entrada{width:auto;min-width:220px}
.il-de{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:0 24px 12px;font-size:13px;color:var(--texto-2)}
.il-de b{color:var(--texto);font-weight:500}
.il-de a{color:var(--vinho);font-weight:500;display:inline-flex;align-items:center;min-height:44px}

/* Esqueleto do carregando */
.il-esq{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,.9fr) minmax(0,1fr) 260px;gap:20px;align-items:center;padding:18px 24px;border-top:1px solid var(--divisor)}
.il-esq span{display:block;height:14px;border-radius:7px}
.il-esq .g{height:20px;width:70%}

/* Lateral */
.explica.il-explica{padding-bottom:116px}
.il-ver{display:inline-flex;align-items:center;min-height:44px;color:var(--vinho);font-weight:500}
.il-noesc{list-style:none;margin:0;padding:0 24px 16px}
.il-noesc li{display:grid;grid-template-columns:22px minmax(0,1fr);gap:10px;padding:10px 0;border-top:1px solid var(--divisor);font-size:13px}
.il-noesc li:first-child{border-top:0}
.il-noesc .ico{width:18px;height:18px;color:var(--vinho-4);margin-top:1px}
.il-noesc b{font-weight:500;display:block;font-size:14px}
.il-noesc small{display:block;font-size:12px;color:var(--texto-2)}
.il-lat-dl{margin:0;padding:0 24px 8px;display:grid;gap:0}
.il-lat-dl div{display:flex;justify-content:space-between;gap:12px;font-size:13px;padding:10px 0;border-top:1px solid var(--divisor)}
.il-lat-dl div:first-child{border-top:0;padding-top:0}
.il-lat-dl dt{color:var(--texto-2)}
.il-lat-dl dd{margin:0;font-weight:500;text-align:right}

/* Janela de dispensar */
.il-motivos{border:0;margin:0 0 4px;padding:0;min-width:0}
.il-motivos legend{padding:0;font-weight:500;margin-bottom:6px}
.il-motivos legend .ob{font-weight:400;color:var(--texto-2);font-size:12px;margin-left:6px}
.il-motivos .opcao{min-height:44px}
.il-motivos.il-erro{padding:10px 12px;border-radius:var(--raio);box-shadow:inset 3px 0 0 var(--vinho-3);background:#FCF6F2}
.il-lemb{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px 14px;border:1px solid var(--borda-folha);border-radius:var(--raio);background:#FCF8F5;margin:12px 0 14px}
.il-ci{flex:none;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--ambar-3);color:var(--vinho)}
.il-lemb strong{display:block;font-weight:500;line-height:1.3}
.il-lemb small{display:block;font-size:12px;color:var(--texto-2)}
.il-lemb .il-valor{font-size:20px}

/* Aviso com ação (toast com Desfazer) */
.il-toast .aviso-acoes .btn{min-height:44px}

/* Folha "Do Astrea" na ficha do cliente */
.il-antigo{padding:0 24px 20px;display:grid;gap:12px}
.il-antigo>p{margin:0;font-size:13px}
.il-antigo>p b{font-weight:600}
.il-lanc{list-style:none;margin:0;padding:0;display:grid;gap:0}
.il-lanc li{display:flex;gap:12px;justify-content:space-between;flex-wrap:wrap;padding:10px 0;border-top:1px solid var(--divisor);font-size:13px}
.il-lanc li:first-child{border-top:0}
.il-lanc small{display:block;font-size:12px;color:var(--texto-2)}
.il-lanc .v{text-align:right;font-weight:500}
.il-lanc .v small{font-weight:400}
.il-disp{display:flex;gap:10px;align-items:flex-start;margin:0;padding:10px 12px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.5}
.il-disp .ico{flex:none;color:var(--vinho);margin-top:2px}
.il-disp a{color:var(--vinho);font-weight:500}
.il-mais-l{justify-self:start}

/* A linha "veio da importação" na ficha do caso */
.il-origem{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:16px;align-items:center;padding:14px 20px;border:1px solid var(--borda-folha);border-radius:var(--raio-g);background:var(--papel)}
.il-origem-t{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.il-origem-t strong{font-family:var(--serifa);font-size:19px;font-weight:500;color:var(--vinho);line-height:1.2}
.il-origem dl{margin:6px 0 0;display:flex;flex-wrap:wrap;gap:4px 22px;font-size:13px}
.il-origem dl div{display:flex;gap:6px}
.il-origem dt{color:var(--texto-2)}
.il-origem dd{margin:0;font-weight:500}
.il-origem .btn{white-space:nowrap}
.il-sem-prazo{padding:4px 24px 20px}
.ju-hist li.il-imp em{font-style:normal;color:var(--texto-2)}
.il-res{padding:0 24px 18px;display:grid;gap:10px;font-size:13px;line-height:1.5}
.il-res p{color:var(--texto-2)}
.il-res .il-selo-enc{justify-self:start}

/* Encerrados */
.il-como{display:grid;gap:4px}
.il-como small{display:block;font-size:12px;color:var(--texto-2);line-height:1.4}

@media (max-width:760px){
  .il-numeros{grid-template-columns:1fr!important}
  .il-numeros a{border-left:0!important;border-top:1px solid var(--divisor)}
  .il-numeros a:first-child{border-top:0}
  .il-numeros a[aria-current="true"]::after{left:16px;right:auto;width:4px;top:12px;bottom:12px;height:auto;border-radius:0 3px 3px 0;left:0}
  .il-ferr select.entrada{width:100%;min-width:0}
  .il-de{padding:0 16px 10px}
  .il-acoes{flex-direction:row;flex-wrap:wrap;max-width:none;margin-left:0;width:100%}
  .il-acoes .btn{flex:1 1 140px;justify-content:center}
  .il-tab td.il-td-acoes::before{display:none}
  .il-tab td.il-td-acoes{display:block!important;padding-top:6px!important}
  .il-esq{grid-template-columns:1fr;gap:10px;padding:16px}
  .il-esq span:nth-child(n+3){display:none}
  .il-origem{grid-template-columns:minmax(0,1fr);padding:14px 16px}
  .il-origem>.il-ci{display:none}
  .il-origem .btn{justify-content:center}
  .il-origem dl{flex-direction:column}
  .il-antigo{padding:0 16px 16px}
  .il-lemb{grid-template-columns:44px minmax(0,1fr)}
  .il-lemb .il-valor{grid-column:2}
  .il-sem-prazo,.il-res{padding-left:16px;padding-right:16px}
}
"""

# ---------------------------------------------------------------- peças
ORIG = {'astrea': ('Astrea · backup', 'enviar'), 'advbox-pl': ('ADVBOX · planilha', 'doc')}


def orig(k='astrea', leve=False):
    n, i = ORIG[k]
    return f'<span class="il-orig{" il-orig-l" if leve else ""}">{ico(i)}<span class="sr">Origem: </span>{n}</span>'


def selo_enc(txt='Veio encerrado'):
    return f'<span class="il-selo-enc">{ico("pasta")}{txt}</span>'


def folha(id_, titulo, sub, corpo, acoes='', peq=False, cls=''):
    s = f'<p class="sub">{sub}</p>' if sub else ''
    a = f'<div class="acoes">{acoes}</div>' if acoes else ''
    st = ' style="font-size:20px"' if peq else ''
    pad = ' style="padding-bottom:8px"' if peq else ''
    return f'<section class="folha{cls}" aria-labelledby="{id_}"><div class="folha-cab"{pad}><div><h2 id="{id_}"{st}>{titulo}</h2>{s}</div>{a}</div>{corpo}</section>'


def toast_acao(titulo, txt, acao):
    return (f'<div class="aviso aviso-sucesso toast il-toast" role="status">{ico("check")}<div><strong class="aviso-titulo">{titulo}</strong><p>{txt}</p>'
            f'<div class="aviso-acoes">{acao}</div></div>'
            f'<button class="fechar" type="button" data-fechar aria-label="Fechar aviso">{ico("x")}</button></div>')


# ---------------------------------------------------------------- 1. a lista dos lembretes
# (cliente, href da ficha, caso ou None, responsável do caso, valor, lançamentos, o mais antigo, nota)
ABERTOS = [
    ('Transportadora Rota Sul Ltda.', '#', 'Rota Sul x Distribuidora Leste', 'Felipe Matos', '4.200,00', 3, '10/06/2026', ''),
    ('Márcio Tavares', D + 'ficha', 'Tavares x Metalúrgica Andrade', 'Felipe Matos', '3.750,00', 3, '15/11/2026', ''),
    ('Construtora Vale Alto Ltda.', '#', None, None, '2.800,00', 2, '05/08/2026', 'Já tem o contrato C-2026-024, ativo. Se este valor já entra nele, dispense o lembrete.'),
    ('Cristina Albuquerque', '#', None, None, '1.800,00', 1, '30/10/2026', ''),
    ('Osvaldo Pereira Lins', '#', 'Lins x Banco Horizonte', 'Larissa Costa', '1.250,00', 1, '15/11/2026', ''),
    ('Benedito Ramos Filho', '#', 'Ramos x INSS', 'Marina Ribeiro', '1.200,00', 2, '10/11/2026', ''),
]
VIRARAM = [
    ('Sueli Martins', 'Martins x Banco Horizonte', '900,00', 'C-2026-034', '22/11', 'Felipe Matos'),
    ('Rafael Couto', None, '600,00', 'C-2026-035', '22/11', 'Marina Ribeiro'),
    ('Padaria Trigo Bom Ltda.', 'Trigo Bom x Moinho Sul', '500,00', 'C-2026-036', '23/11', 'Felipe Matos'),
    ('Helena Duarte', None, '400,00', 'C-2026-037', '23/11', 'Marina Ribeiro'),
]
DISPENSADOS = [
    ('Nair Gonçalves', 'Gonçalves x Lojas Brilho', '750,00', 'Já negociado ou recebido fora do T3jus', 'Acordo de outubro, pago em dinheiro no escritório.', '22/11', 'Marina Ribeiro'),
    ('Jorge Batista', None, '500,00', 'O escritório perdoou o valor', 'Cliente de longa data; a sócia decidiu não cobrar.', '22/11', 'Marina Ribeiro'),
]
OSVALDO_D = ('Osvaldo Pereira Lins', 'Lins x Banco Horizonte', '1.250,00', 'Já negociado ou recebido fora do T3jus', 'Pagou em 18/11 por Pix, antes de mudarmos para o T3jus.', 'hoje', 'Marina Ribeiro')


def caso_txt(caso, rsp=None):
    if not caso:
        return 'Sem caso ligado'
    return f'Caso {H(caso)}' + (f' · com {rsp}' if rsp else '')


def linhas_abertos(itens, sem=()):
    linhas = []
    for nome, href, caso, rsp, valor, n, antigo, nota in itens:
        if nome in sem:
            continue
        nt = f'<small class="il-ja">{ico("pena")}<span>{nota}</span></small>' if nota else ''
        cel = [f'<div class="esc"><div><a href="{href}">{H(nome)}</a><small>{caso_txt(caso, rsp)}</small>{nt}</div></div>',
               f'<div><span class="il-valor num">R$ {valor}</span><small>{n} {"lançamento" if n == 1 else "lançamentos"} · {"venceu em" if n == 1 else "o mais antigo venceu em"} {antigo}</small></div>',
               f'<div class="il-acoes"><a class="btn btn-pri" href="{CTR}novo-tipos">{ico("pena")}Criar o contrato<span class="sr"> de {H(nome)}</span></a>'
               f'<button class="btn btn-sec" type="button" data-janela="janela-dispensar">{ico("x")}Dispensar<span class="sr"> o lembrete de {H(nome)}</span></button></div>']
        linhas.append((cel, ''))
    t = tabela('Lembretes de contrato abertos', ['Cliente e caso', 'Em aberto no Astrea', 'Ações'], linhas, ['42%', '28%', '30%'], 'il-tab')
    return t.replace('<td data-r="Ações">', '<td data-r="Ações" class="il-td-acoes">')


def linhas_viraram():
    linhas = []
    for nome, caso, valor, num, quando, quem in VIRARAM:
        linhas.append(([f'<div class="esc"><div><a href="#">{H(nome)}</a><small>{caso_txt(caso)}</small></div></div>',
                        f'<div><span class="il-valor num">R$ {valor}</span><small>estava em aberto no Astrea</small></div>',
                        f'<div>{selo("ok", f"Contrato {num}", "check")}<small>criado em {quando} por {quem}</small></div>',
                        f'<div class="il-acoes"><a class="btn btn-sec" href="{CTR}contrato">{ico("pena")}Ver o contrato<span class="sr"> {num}</span></a></div>'], 'il-saiu'))
    t = tabela('Lembretes que viraram contrato', ['Cliente e caso', 'Valor do lembrete', 'Virou', 'Ações'], linhas, ['32%', '18%', '26%', '24%'], 'il-tab')
    return t.replace('<td data-r="Ações">', '<td data-r="Ações" class="il-td-acoes">')


def linhas_dispensados(extra=None):
    itens = ([extra] if extra else []) + DISPENSADOS
    linhas = []
    for nome, caso, valor, motivo, det, quando, quem in itens:
        q = 'hoje' if quando == 'hoje' else f'em {quando}'
        linhas.append(([f'<div class="esc"><div><a href="#">{H(nome)}</a><small>{caso_txt(caso)}</small></div></div>',
                        f'<div><span class="il-valor num">R$ {valor}</span><small>em aberto no Astrea</small></div>',
                        f'<div><b>{motivo}</b><span class="il-motivo">“{det}”</span><small>Dispensado {q} por {quem}</small></div>',
                        f'<div class="il-acoes"><button class="btn btn-sec" type="button">{ico("historico")}Trazer de volta<span class="sr"> o lembrete de {H(nome)}</span></button></div>'], 'il-saiu'))
    t = tabela('Lembretes dispensados', ['Cliente e caso', 'Valor', 'Motivo', 'Ações'], linhas, ['26%', '16%', '32%', '26%'], 'il-tab')
    return t.replace('<td data-r="Ações">', '<td data-r="Ações" class="il-td-acoes">')


def cab_lemb():
    return ('<div class="pt-cab"><div><p class="sobretitulo">Contratos</p><h1>Lembretes de contrato</h1><span class="fio" aria-hidden="true"></span>'
            '<p class="lede">Clientes com valor em aberto no sistema antigo. No T3jus, a cobrança nasce do contrato: crie o contrato e o lembrete sai daqui sozinho.</p></div></div>')


def nums(atual='abertos', ab=('81', 'R$ 45.250,00'), vir='4', disp='2'):
    def t(k, n, cls, titulo, sub, soma=''):
        cur = ' aria-current="true"' if k == atual else ''
        s = f'<span class="il-soma num">{soma}</span>' if soma else ''
        return (f'<a href="{L}{k}"{cur}><span class="disco{cls}" aria-hidden="true"><span>{n}</span></span>'
                f'<span class="r"><b>{titulo}</b>{sub}{s}</span><span class="sr">: {n}</span></a>')
    return ('<nav class="folha hn-numeros il-numeros" aria-label="Mostrar lembretes">'
            + t('abertos', ab[0], ' hn-d-hoje', 'Abertos', 'em aberto no Astrea', ab[1])
            + t('viraram', vir, ' hn-d-vinho', 'Viraram contrato', 'saíram da lista sozinhos')
            + t('dispensados', disp, '', 'Dispensados', 'com o motivo, dá para trazer de volta') + '</nav>')


def ferr(valor='', ordem='Maior valor primeiro', ocupado=False):
    v = f' value="{H(valor)}"' if valor else ''
    bz = ' aria-busy="true"' if ocupado else ''
    ops = ''.join(f'<option{" selected" if o == ordem else ""}>{o}</option>' for o in ['Maior valor primeiro', 'Lançamento mais antigo primeiro', 'Nome do cliente (A a Z)'])
    return (f'<form class="hn-ferr il-ferr" role="search" action="#" onsubmit="return false"{bz}><div class="campo-busca"><label class="sr" for="il-b">Buscar por cliente ou caso</label>{ico("busca")}'
            f'<input class="entrada" id="il-b" type="search" placeholder="Cliente ou caso" autocomplete="off"{v}></div>'
            f'<label class="sr" for="il-ord">Ordem</label><select class="entrada" id="il-ord">{ops}</select></form>')


def lateral():
    ex = (f'<section class="explica campo-ambar il-explica" aria-labelledby="t-ilx"><p class="sobretitulo">Como funciona</p><h2 id="t-ilx">A cobrança nasce do contrato.</h2><ul>'
          f'<li>{ico("pena")}<span><b>Criar o contrato</b> leva ao contrato novo com o cliente já escolhido. Criado, o lembrete sai da lista e da ficha sozinho.</span></li>'
          f'<li>{ico("x")}<span><b>Dispensar</b> é para o valor que o escritório não vai cobrar: já negociado fora, perdoado ou em outro contrato. Pede o motivo e dá para trazer de volta.</span></li>'
          f'<li>{ico("carteira")}<span>Nada aqui mexe no histórico do Astrea na ficha (“pago antes do T3jus”), no Caixa ou em A receber.</span></li></ul></section>')
    de = folha('t-ilde', 'De onde vieram', '', '<dl class="il-lat-dl">'
               f'<div><dt>Origem</dt><dd>{orig()}</dd></div><div><dt>Importado em</dt><dd>21/11/2026, 16h52</dd></div>'
               '<div><dt>Por</dt><dd>Marina Ribeiro</dd></div><div><dt>Lembretes criados</dt><dd>87 · R$ 48.900,00</dd></div></dl>'
               f'<div class="hn-folha-acao"><a class="btn btn-sec" href="{RES}">{ico("historico")}Ver o resultado da importação</a>'
               '<p>Só quem tem a área Contratos vê esta lista. Na ficha do cliente, quem tem Financeiro também vê o lembrete.</p></div>', peq=True)
    return de + ex


def pagina_lemb(corpo, atual='abertos', n=None):
    n = n or nums(atual)
    return (f'<div class="hn">{cab_lemb()}{n}<div class="hn-grade"><div class="hn-col">'
            f'<section class="folha" aria-labelledby="t-ill" style="overflow:hidden"><h2 id="t-ill" class="sr">Lista de lembretes</h2>{corpo}</section>'
            f'</div><aside class="hn-col" aria-label="Sobre os lembretes">{lateral()}</aside></div></div>')


def corpo_abertos(sem=(), cont='<b>81 lembretes abertos</b> · R$ 45.250,00 · do maior valor para o menor', mostrando='Mostrando 6 de 81'):
    return (ferr() + f'<p class="hn-cont" role="status">{cont}</p>' + linhas_abertos(ABERTOS, sem)
            + f'<div class="mais"><span>{mostrando}</span><button class="btn btn-sec" type="button">{ico("baixo")}Mostrar mais 25</button></div>'
            + f'<p class="hn-pe">{ico("historico")}<span>Lembrete não se apaga. O que vira contrato ou é dispensado sai desta lista e fica nas outras duas, e no histórico do cliente.</span></p>')


def lista():
    return pagina_lemb(corpo_abertos())


def busca_vazia():
    e = estado('Nenhum lembrete para “Tavarez”', 'Confira o nome do cliente ou do caso. A busca olha só os lembretes abertos; os que viraram contrato ou foram dispensados ficam nos outros números acima.',
               'busca', moldura=False, acoes=f'<button class="btn btn-sec" type="button">{ico("x")}Limpar a busca</button>')
    return pagina_lemb(ferr('Tavarez') + '<p class="hn-cont" role="status"><b>Nenhum lembrete encontrado</b> para “Tavarez”</p>' + e)


def viraram():
    corpo = (ferr() + '<p class="hn-cont" role="status"><b>4 lembretes viraram contrato</b> · R$ 2.400,00 · do mais recente para o mais antigo</p>' + linhas_viraram()
             + f'<p class="hn-pe">{ico("pena")}<span>O lembrete sai sozinho quando um contrato do cliente é criado. O valor do Astrea não entra no contrato por conta própria: as condições são as que você escreveu nele.</span></p>')
    return pagina_lemb(corpo, 'viraram')


def dispensados(extra=None, n=None):
    t = '3 lembretes dispensados</b> · R$ 2.500,00' if extra else '2 lembretes dispensados</b> · R$ 1.250,00'
    corpo = (ferr() + f'<p class="hn-cont" role="status"><b>{t} · do mais recente para o mais antigo</p>' + linhas_dispensados(extra)
             + f'<p class="hn-pe">{ico("historico")}<span>“Trazer de volta” põe o lembrete de novo na lista e na ficha, sem prazo. Fica no histórico do cliente quem dispensou, quem trouxe de volta e o motivo.</span></p>')
    return pagina_lemb(corpo, 'dispensados', n)


def vazio():
    e = estado('Nenhum lembrete aberto', 'Os 87 lembretes da importação do Astrea de 21/11 viraram contrato ou foram dispensados. Não falta criar nenhum contrato pelo que estava em aberto no sistema antigo.',
               'check', moldura=False, acoes=f'<a class="btn btn-sec" href="{L}viraram">{ico("pena")}Ver os que viraram contrato</a>')
    return pagina_lemb(e, n=nums('abertos', ('0', 'R$ 0,00'), '80', '7'))


def carregando():
    esq = ''.join('<div class="il-esq" aria-hidden="true"><span class="esqueleto g"></span><span class="esqueleto"></span><span class="esqueleto"></span><span class="esqueleto" style="height:44px;border-radius:10px"></span></div>' for _ in range(5))
    corpo = ferr(ocupado=True) + '<p class="hn-cont" role="status">Carregando os lembretes…</p>' + esq
    n = ('<nav class="folha hn-numeros il-numeros" aria-label="Mostrar lembretes" aria-busy="true">'
         + ''.join(f'<div class="hn-num"><span class="esqueleto" style="width:52px;height:52px;border-radius:50%;flex:none"></span><span class="r" style="flex:1"><b>{t}</b><span class="esqueleto" style="display:block;height:12px;width:60%;margin-top:6px"></span></span></div>'
                   for t in ('Abertos', 'Viraram contrato', 'Dispensados')) + '</nav>')
    return pagina_lemb(corpo, n=n)


def erro():
    e = estado('Não deu para carregar os lembretes', 'A conexão com o T3jus caiu no meio. Nada mudou: os lembretes, os contratos e o histórico do Astrea continuam como estavam. Tente de novo; se continuar, avise o suporte pela Ajuda.',
               'alerta', erro=True, moldura=False, acoes=f'<button class="btn btn-pri" type="button">{ico("historico")}Tentar de novo</button>')
    n = ('<nav class="folha hn-numeros il-numeros" aria-label="Mostrar lembretes">'
         + ''.join(f'<div class="hn-num"><span class="disco" aria-hidden="true"><span>–</span></span><span class="r"><b>{t}</b>não carregou</span></div>' for t in ('Abertos', 'Viraram contrato', 'Dispensados')) + '</nav>')
    return pagina_lemb(e, n=n)


def entrada():
    """A lista de Contratos aprovada, com a faixa que leva aos lembretes."""
    base = CT['contratos']()
    faixa = aviso('atencao', '81 clientes têm valor em aberto no Astrea e ainda não têm contrato.',
                  'São R$ 45.250,00 que vieram da importação de 21/11. Crie o contrato de cada um para cobrar, ou dispense o que o escritório não vai cobrar.',
                  icone='pena', acoes=f'<a class="btn btn-sec" href="{L}lista">{ico("dir")}Ver os lembretes</a>')
    i = base.index('<section class="folha"')
    return base[:i] + faixa + base[i:]


# ---------------------------------------------------------------- 2. dispensar
MOTIVOS = ['Já negociado ou recebido fora do T3jus', 'O escritório perdoou o valor', 'Já está em outro contrato', 'Outro motivo']


def j_dispensar(nome='Osvaldo Pereira Lins', caso='Lins x Banco Horizonte', valor='1.250,00', n=1, abrir=False, err=False, conflito=False, idj='janela-dispensar'):
    alvo = (f'<div class="il-lemb"><span class="il-ci">{ico("pena")}</span><span><strong>{H(nome)}</strong><small>{caso_txt(caso)} · {n} {"lançamento" if n == 1 else "lançamentos"} em aberto no Astrea</small></span>'
            f'<span class="il-valor num">R$ {valor}</span></div>')
    sel = 'Outro motivo' if err else ''
    ops = ''.join(f'<label class="opcao"><input class="marcar" type="radio" name="il-mot" value="{i}"{" checked" if m == sel else ""}{" data-foco" if (i == 0 and not err) else ""}><span>{m}</span></label>'
                  for i, m in enumerate(MOTIVOS))
    er_fs = ''
    if err:
        er_fs = ''
    fs = (f'<fieldset class="il-motivos"><legend>Por que o escritório não vai cobrar?<span class="ob">obrigatório</span></legend>{ops}</fieldset>')
    if err:
        det = IS['campo']('il-det', 'Escreva o motivo', '', 'c6', erro='Escreva o motivo em poucas palavras. Ele fica no histórico do cliente.', foco=True,
                          ajuda='Até 140 caracteres. Ex.: “cliente faleceu, sem herdeiros”.')
    else:
        det = IS['campo']('il-det', 'Detalhe', '', 'c6', opc=True, ajuda='Até 140 caracteres. Fica junto do motivo, no histórico. Com “Outro motivo”, é obrigatório.')
    topo = ''
    if err:
        topo = aviso('urgencia', 'Falta escrever o motivo.', 'Com “Outro motivo”, diga em poucas palavras por que não vai cobrar. O lembrete continua aberto até você dispensar.')
    if conflito:
        topo = aviso('urgencia', 'Este lembrete já saiu da lista.', 'Felipe Matos criou o contrato C-2026-038 para Osvaldo há 2 minutos, e o lembrete saiu sozinho. Nada foi dispensado. Feche a janela para ver a lista atualizada.')
    acontece = ('<ul class="im-desf">'
                f'<li>{ico("x")}<span><b>Sai desta lista e da ficha de {H(nome.split()[0])}.</b> Não aparece mais como contrato a criar.</span></li>'
                f'<li>{ico("historico")}<span><b>Fica em Dispensados e no histórico do cliente</b>, com o motivo, quem dispensou e quando.</span></li>'
                f'<li>{ico("carteira")}<span><b>O histórico do Astrea não muda.</b> Os lançamentos continuam na ficha como estavam (“em aberto lá”), e nada entra no Caixa nem em A receber.</span></li>'
                f'<li>{ico("trocar")}<span><b>Dá para trazer de volta</b> quando quiser, em Dispensados.</span></li></ul>')
    corpo = (topo + alvo + fs + f'<div class="campos" style="display:block;margin-top:8px">{det}</div>'
             + f'<div style="margin-top:14px">{acontece}</div>')
    if conflito:
        corpo = topo + alvo
        pe = f'<button class="btn btn-pri" type="button" data-fechar data-foco>{ico("check")}Ver a lista atualizada</button>'
    else:
        pe = (f'<button class="btn btn-sec" type="button" data-fechar>Voltar</button>'
              f'<button class="btn btn-pri" type="submit">{ico("x")}Dispensar o lembrete</button>')
    j = janela(idj, 'Lembrete de contrato · Astrea', f'Dispensar o lembrete de {H(nome.split()[0])}?',
               'Use quando o escritório não vai cobrar este valor pelo T3jus. Para cobrar, crie o contrato.', corpo, pe, alerta=True, abrir=abrir)
    if err:
        j = j.replace('<fieldset class="il-motivos">', '<fieldset class="il-motivos" aria-describedby="il-det-er">', 1)
    if conflito:
        j = j.replace('<p id="' + idj + '-d">Use quando o escritório não vai cobrar este valor pelo T3jus. Para cobrar, crie o contrato.</p>',
                      '<p id="' + idj + '-d">Alguém mexeu neste lembrete enquanto a janela estava aberta.</p>')
    return j


def dispensado_lista():
    n = nums('abertos', ('80', 'R$ 44.000,00'), '4', '3')
    t = toast_acao('Lembrete de Osvaldo dispensado.', 'Saiu da lista e da ficha dele. Está em Dispensados, com o motivo, e no histórico do cliente.',
                   f'<button class="btn btn-sec" type="button">{ico("historico")}Desfazer</button>')
    corpo = corpo_abertos(sem=('Osvaldo Pereira Lins',), cont='<b>80 lembretes abertos</b> · R$ 44.000,00 · do maior valor para o menor', mostrando='Mostrando 5 de 80')
    return t + pagina_lemb(corpo, n=n)


# ---------------------------------------------------------------- 2b. a ficha do cliente com a folha "Do Astrea"
MARCIO = dict(nome='Márcio Tavares', tp='PF', desde='21/11/2026', doc=CPF_MARCIO)

LANC = [
    ('Honorários · parcela 4 de 4', '15/01/2027', 'Tavares x Metalúrgica Andrade', '1.250,00', 'aberto'),
    ('Honorários · parcela 3 de 4', '15/12/2026', 'Tavares x Metalúrgica Andrade', '1.250,00', 'aberto'),
    ('Honorários · parcela 2 de 4', '15/11/2026', 'Tavares x Metalúrgica Andrade', '1.250,00', 'aberto'),
    ('Honorários · parcela 1 de 4', '15/10/2026', 'Tavares x Metalúrgica Andrade', '1.250,00', 'pago'),
    ('Honorários iniciais', '15/08/2026', 'Tavares x Metalúrgica Andrade', '2.500,00', 'pago'),
]


def folha_astrea(estado_='aberto', pode=True):
    if estado_ == 'aberto':
        ac = ((f'<a class="btn btn-sec" href="{CTR}novo-tipos">{ico("pena")}Criar o contrato</a>' if pode else '')
              + f'<button class="btn btn-fantasma" type="button" data-janela="janela-dispensar-f">{ico("x")}Dispensar</button>')
        lemb = aviso('atencao', 'R$ 3.750,00 em aberto no Astrea, no caso Tavares x Metalúrgica Andrade.',
                     'No T3jus, a cobrança nasce do contrato. Crie o contrato para cobrar; este lembrete some quando ele é criado. Se o escritório não vai cobrar, dispense com o motivo.',
                     icone='pena', acoes=ac)
    else:
        lemb = (f'<p class="il-disp">{ico("historico")}<span>Lembrete de R$ 3.750,00 dispensado hoje por Marina Ribeiro: “Já negociado ou recebido fora do T3jus”. '
                f'<a href="{L}dispensados">Ver em Dispensados</a></span></p>')
    li = ''.join(f'<li><span>{d}<small>{("vence em" if dt[-4:] == "2027" or dt[3:5] == "12" else "venceu em") if s == "aberto" else "recebido em"} {dt} · {c}</small></span>'
                 f'<span class="v num">R$ {v}<small>{"em aberto lá" if s == "aberto" else "pago antes do T3jus"}</small></span></li>' for d, dt, c, v, s in LANC)
    corpo = (f'<div class="il-antigo">{lemb}<p><b>R$ 3.750,00</b> pagos antes do T3jus. Sem recibo e fora do Caixa.</p>'
             f'<ul class="il-lanc" aria-label="Lançamentos do Astrea">{li}</ul></div>')
    return folha('t-antigo', 'Do Astrea', 'Só informação: fora do Caixa, de A receber e dos relatórios do contador. Importado em 21/11/2026.', corpo, acoes=orig())


def dir_caso():
    return (f'<section class="dir campo-ambar" aria-labelledby="t-dcaso"><p class="sobretitulo" id="t-dcaso">Caso em andamento</p>'
            f'<p class="grande" style="font-size:30px">Tavares x Metalúrgica Andrade</p>'
            f'<p class="cl-oque"><b>Instrução, 4 de 8 · com Felipe Matos.</b><br>Sem contrato. Nenhum prazo aberto.</p>'
            f'<a class="btn btn-pri" href="{J}caso-importado">{ico("balanca")}Ver o caso</a></section>')


def dados_marcio():
    return (f'<section class="folha" aria-labelledby="t-dados"><div class="folha-cab"><div><h2 id="t-dados">Dados e qualificação</h2>'
            f'<p class="sub">O que vai na procuração e no contrato.</p></div><div class="acoes"><a class="btn btn-sec" href="#">{ico("lapis")}Editar</a></div></div>'
            f'<dl class="dados-ficha"><div class="inteira"><dt>Nome completo</dt><dd>Márcio Tavares</dd></div>'
            f'<div><dt>CPF</dt><dd><span class="num">{CPF_MARCIO}</span><span class="selo selo-ok">{ico("check")}Dígitos conferidos</span></dd></div>'
            f'<div><dt>Telefone</dt><dd><span class="num">(11) 97012-3348</span></dd></div>'
            f'<div class="inteira"><dt>Endereço</dt><dd>Rua Cel. Oliveira Lima, 902, Centro, Santo André, SP · CEP 09010-150</dd></div></dl></section>')


def lat_marcio():
    no = folha('t-noesc', 'No escritório', 'O que Márcio tem aqui.',
               '<ul class="il-noesc">'
               f'<li>{ico("balanca")}<span><b>Caso</b><small>Tavares x Metalúrgica Andrade · Instrução</small></span></li>'
               f'<li>{ico("pena")}<span><b>Contrato</b><small>Nenhum ainda</small></span></li></ul>', peq=True)
    og = folha('t-org', 'Origem', '', '<dl class="cl-origem">'
               f'<div><dt>Veio de</dt><dd>{orig("astrea", True)}</dd></div><div><dt>Importado em</dt><dd>21/11/2026, 16h52</dd></div>'
               '<div><dt>Por</dt><dd>Marina Ribeiro</dd></div><div><dt>Linha do backup</dt><dd>C7, aba Contatos</dd></div></dl>', peq=True)
    return no + og


def ficha_marcio(estado_='aberto', extra=''):
    cab = CL['ficha_cab'](MARCIO, dir_caso())
    principal = dados_marcio() + folha_astrea(estado_)
    return f'<div class="cl">{cab}{CL["grade_ficha"](principal, lat_marcio())}</div>{extra}'


# ---------------------------------------------------------------- 3. o caso importado, no Jurídico
NOME_E, NE = JU['NOME_E'], JU['NE']


def cab_caso(nome, area, num, trib, et, desde_txt, selo_html, botao=True, encerrado=False):
    segs = ''.join(f'<li class="{"" if i < et - 1 else ("agora" if i == et - 1 else "falta")}"><span class="b" aria-hidden="true"></span>'
                   f'<span class="sr">{i + 1}. {NOME_E[i]}{": feita" if i < et - 1 else (": atual" if i == et - 1 else "")}</span></li>' for i in range(NE))
    b = f'<button class="btn btn-pri" type="button">{ico("seta")}Mudar etapa</button>' if botao else ''
    dir_ = (f'<section class="dir campo-ambar" aria-labelledby="t-etapa"><p class="sobretitulo" id="t-etapa">Etapa do caso</p>'
            f'<p class="grande">{et} de {NE}<small>{NOME_E[et - 1]}</small></p><ol class="etapas ju-et8">{segs}</ol>'
            f'<p class="ju-agora">{desde_txt}</p>{b}</section>')
    return (f'<div class="ficha-cab"><div class="esq campo-vinho">{ico("balanca", "ico estatua")}'
            f'<a class="voltar" href="{J}encerrados">{ico("esq", "ico ico-s")}Casos e processos</a>'
            f'<div class="ident"><div><p class="sobretitulo">Caso · {area.lower()}</p><h1>{H(nome)}</h1>'
            f'<p class="meta">{selo_html}<span class="num">{num}</span><span class="sep" aria-hidden="true"></span><span>{trib}</span></p></div></div></div>{dir_}</div>')


def linha_origem(k='astrea', quando='21/11/2026, 16h52', quem='Marina Ribeiro', etapa_antiga='“Audiência marcada”', ligada='4. Instrução', onde='Linha P14 da aba Processos', rot_etapa='Etapa no Astrea'):
    sistema = 'Astrea' if k == 'astrea' else 'ADVBOX'
    return (f'<section class="il-origem" aria-labelledby="t-ilo"><span class="il-ci" aria-hidden="true">{ico("enviar" if k == "astrea" else "doc")}</span>'
            f'<div><div class="il-origem-t"><h2 id="t-ilo" class="sr">Origem do caso</h2><strong aria-hidden="true">Veio da importação do {sistema}</strong>{orig(k)}</div>'
            f'<dl><div><dt>Importado em</dt><dd>{quando}</dd></div><div><dt>Por</dt><dd>{quem}</dd></div>'
            f'<div><dt>{rot_etapa}</dt><dd>{etapa_antiga}, ligada a {ligada}</dd></div><div><dt>No {sistema}</dt><dd>{onde}</dd></div></dl></div>'
            f'<a class="btn btn-sec" href="{RES}">{ico("historico")}Ver o resultado da importação</a></section>')


def dados(d):
    dl = ''.join(f'<div><dt>{k}</dt><dd>{v}</dd></div>' for k, v in d)
    return folha('t-dados', 'Dados do processo', 'O que identifica o caso.', f'<dl class="dados-ficha ju-dl">{dl}</dl>',
                 acoes=f'<a class="btn btn-sec" href="#">{ico("lapis")}Editar</a>')


def clientes_caso(nome, ini, papel, tel, hon, hon_sub, link_lemb=True):
    hs = f'<a class="il-ver" href="{D}ficha">{hon_sub}</a>' if link_lemb else hon_sub
    corpo = (f'<ul class="lista ju-clientes"><li><span class="av-p forte" aria-hidden="true">{ini}</span><div><a class="n" href="{D}ficha">{nome}</a><small>{papel}</small></div>'
             f'<a class="tel" href="#">{ico("whats")}<span class="num">{tel}</span></a><div class="ju-hon"><b>{hon}</b><small>{hs}</small></div></li></ul>')
    return folha('t-cli', 'Clientes do caso', '1 cliente', corpo, acoes=f'<a class="btn btn-sec" href="#">{ico("pessoa-mais")}Adicionar cliente</a>')


def prazos_vazio():
    corpo = (f'<div class="ju-sub"><h3>Prazos</h3><button class="btn btn-fantasma btn-compacto" type="button">{ico("mais")}Novo prazo</button></div>'
             f'<div class="il-sem-prazo">' + aviso('atencao', 'Nenhum prazo cadastrado.', 'A importação não traz prazos, audiências nem tarefas do Astrea. Confira o processo no tribunal e cadastre o próximo prazo.',
                                                    acoes=f'<button class="btn btn-pri" type="button">{ico("mais")}Cadastrar o próximo prazo</button>') + '</div>'
             f'<div class="ju-sub"><h3>Tarefas</h3><button class="btn btn-fantasma btn-compacto" type="button">{ico("mais")}Nova tarefa</button></div>'
             f'<p class="il-sem-prazo" style="font-size:13px;color:var(--texto-2)">Nenhuma tarefa aberta.</p>')
    return folha('t-pt', 'Prazos e tarefas', 'Nenhum prazo aberto · nenhuma tarefa', corpo)


def contratos_sem(nome1='Márcio'):
    corpo = (f'<ul class="ju-ctr"><li>{ico("pena")}<span><b>Nenhum contrato ligado</b><small>Veio do Astrea sem contrato, como todo caso importado.</small></span></li></ul>'
             f'<div class="hn-folha-acao" style="padding-top:0"><p>{nome1} tem um lembrete: <b>R$ 3.750,00</b> em aberto no Astrea.</p>'
             f'<a class="btn btn-sec" href="{CTR}novo-tipos">{ico("pena")}Criar o contrato</a></div>')
    return folha('t-ctr', 'Contratos ligados', '', corpo, peq=True)


def aviso_cli(nome1='Márcio'):
    corpo = (f'<div class="ju-aviso-cli"><span class="lig">{ico("whats")}Ligado para {nome1}</span>'
             f'<p>A importação não mandou mensagem. O primeiro aviso sai na próxima mudança de etapa, pela regra do escritório.</p></div>')
    return folha('t-avc', 'Aviso ao cliente', '', corpo, peq=True)


def hist_imp(data, etapa, sistema, quem, em):
    li = f'<li class="il-imp"><time>{data}</time><span>Entrou em <b>{etapa}</b> · pela importação do {sistema}, por {quem}<em>{em}</em></span></li>'
    return folha('t-hist', 'Mudanças de etapa', '', f'<ol class="ju-hist">{li}</ol>', peq=True)


def ficha_importado(k='astrea'):
    if k == 'astrea':
        nome, area, num, trib = 'Tavares x Metalúrgica Andrade', 'Trabalhista', N1, 'TRT-2 · PJe'
        lo = linha_origem()
        d = [('Área', 'Trabalhista'), ('Parte contrária', 'Metalúrgica Andrade S.A.'), ('Valor da causa', '<span class="num">R$ 64.200,00</span>'),
             ('Tribunal', 'TRT da 2ª Região'), ('Vara', '<span class="hn-sem">Não veio do Astrea</span>'), ('Sistema', 'PJe'),
             ('Distribuído em', '<span class="num">12/05/2025</span>'), ('Responsável', 'Felipe Matos'), ('Também no caso', '<span class="hn-sem">Ninguém</span>')]
        cli = clientes_caso('Márcio Tavares', 'MT', 'Reclamante', '(11) 97012-3348', 'Sem contrato', 'R$ 3.750,00 em aberto no Astrea')
        hist = hist_imp('21/11', 'Instrução', 'Astrea', 'Marina Ribeiro', 'No Astrea: “Audiência marcada”. Nenhum aviso foi ao cliente.')
        et, desde = 4, 'Desde 21/11, pela importação. Próxima: <b>Sentença</b>.'
        lat = contratos_sem() + aviso_cli() + hist
    else:
        nome, area, num, trib = 'Lins x Banco Horizonte', 'Consumidor', N_LINS, 'TJSP · e-SAJ'
        lo = linha_origem('advbox-pl', '22/11/2026, 10h12', 'Marina Ribeiro', '“Em grau de recurso”', '6. Recurso', 'Registro 48213, relatório de processos', 'Etapa no ADVBOX')
        d = [('Área', 'Consumidor'), ('Parte contrária', 'Banco Horizonte S.A.'), ('Valor da causa', '<span class="num">R$ 18.900,00</span>'),
             ('Tribunal', 'TJSP'), ('Vara', '4ª Vara Cível do Foro Central'), ('Sistema', 'e-SAJ'),
             ('Distribuído em', '<span class="num">03/02/2025</span>'), ('Responsável', 'Larissa Costa'), ('Também no caso', '<span class="hn-sem">Ninguém</span>')]
        cli = clientes_caso('Osvaldo Pereira Lins', 'OL', 'Autor', '(11) 96231-0457', 'Sem contrato', 'Honorários na área Contratos', link_lemb=False)
        hist = hist_imp('22/11', 'Recurso', 'ADVBOX', 'Marina Ribeiro', 'No ADVBOX: “Em grau de recurso”. Nenhum aviso foi ao cliente.')
        et, desde = 6, 'Desde 22/11, pela importação. Próxima: <b>Cumprimento</b>.'
        ctr = folha('t-ctr', 'Contratos ligados', '', f'<ul class="ju-ctr"><li>{ico("pena")}<span><b>Nenhum contrato ligado</b><small>Veio do ADVBOX sem contrato, como todo caso importado.</small></span></li></ul>'
                    f'<div class="hn-folha-acao" style="padding-top:0"><a class="btn btn-sec" href="{CTR}novo-tipos">{ico("pena")}Criar o contrato</a></div>', peq=True)
        lat = ctr + aviso_cli('Osvaldo') + hist
    cab = cab_caso(nome, area, num, trib, et, desde, '<span class="selo selo-ativo">Em andamento</span>')
    pri = dados(d) + cli + prazos_vazio()
    return (f'<div class="ju">{cab}{lo}<div class="ju-grade ju-ficha-grade"><div class="ju-col">{pri}</div>'
            f'<aside class="ju-col" aria-label="Contexto do caso">{lat}</aside></div></div>')


def ficha_encerrado():
    nome = 'Queiroz x Construtora Lume'
    cab = cab_caso(nome, 'Trabalhista', N_QUEIROZ, 'TRT-2 · PJe', 8, 'Arquivado no Astrea em 14/03/2025. Entrou encerrado, sem resultado e sem acerto.',
                   '<span class="selo selo-neutro">Encerrado</span>' + selo_enc(), botao=False)
    lo = linha_origem(etapa_antiga='“Arquivado”', ligada='8. Encerrado', onde='Linha P203 da aba Processos (arquivados)')
    d = [('Área', 'Trabalhista'), ('Parte contrária', 'Construtora Lume Ltda.'), ('Valor da causa', '<span class="num">R$ 41.000,00</span>'),
         ('Tribunal', 'TRT da 2ª Região'), ('Vara', '<span class="hn-sem">Não veio do Astrea</span>'), ('Sistema', 'PJe'),
         ('Distribuído em', '<span class="num">22/03/2021</span>'), ('Responsável', 'Marina Ribeiro'), ('Arquivado em', '<span class="num">14/03/2025</span>')]
    corpo_cli = (f'<ul class="lista ju-clientes"><li><span class="av-p forte" aria-hidden="true">RQ</span><div><a class="n" href="#">Renata Queiroz</a><small>Reclamante</small></div>'
                 f'<a class="tel" href="#">{ico("whats")}<span class="num">(11) 98841-2073</span></a><div class="ju-hon"><b>Sem contrato</b><small>Veio encerrado: não pede contrato</small></div></li></ul>')
    cli = folha('t-cli', 'Clientes do caso', '1 cliente', corpo_cli)
    res = folha('t-res', 'Resultado', '', f'<div class="il-res">{selo_enc("Sem resultado")}'
                '<p>Veio encerrado do Astrea, que não diz se foi ganho, perda ou acordo. Fica fora das contas de resultado e não pede acerto no Financeiro.</p>'
                f'<button class="btn btn-sec" type="button">{ico("lapis")}Registrar o resultado</button></div>', peq=True)
    ctr = folha('t-ctr', 'Contratos ligados', '', f'<ul class="ju-ctr"><li>{ico("pena")}<span><b>Nenhum contrato ligado</b><small>Caso encerrado não ganha lembrete de contrato.</small></span></li></ul>', peq=True)
    hist = hist_imp('21/11', 'Encerrado', 'Astrea', 'Marina Ribeiro', 'No Astrea: “Arquivado” em 14/03/2025. Entrou como encerrado, porque a importação marcou “Importar como encerrados”.')
    pt = folha('t-pt', 'Prazos e tarefas', 'Caso encerrado', '<p class="il-sem-prazo" style="font-size:13px;color:var(--texto-2)">Nenhum prazo nem tarefa. A importação não traz prazos, e o caso já chegou encerrado.</p>')
    return (f'<div class="ju">{cab}{lo}<div class="ju-grade ju-ficha-grade"><div class="ju-col">{dados(d)}{cli}{pt}</div>'
            f'<aside class="ju-col" aria-label="Contexto do caso">{res}{ctr}{hist}</aside></div></div>')


ENC = [
    # (nome, número, área, cliente, como encerrou: ('res', tom, texto, sub) | ('imp', sub), responsável, href)
    ('Castro x Banco Horizonte', N_CASTRO, 'Cível', 'Irene Castro', ('res', 'ativo', 'Ganho', 'encerrado em 30/10/2026 · acerto feito'), 'Felipe Matos', '#'),
    ('Mendes x Viação Cometa', N_MENDES, 'Trabalhista', 'Paulo Mendes', ('res', 'ativo', 'Acordo', 'encerrado em 14/10/2026 · acerto feito'), 'Marina Ribeiro', '#'),
    ('Queiroz x Construtora Lume', N_QUEIROZ, 'Trabalhista', 'Renata Queiroz', ('imp', 'arquivado no Astrea em 14/03/2025'), 'Marina Ribeiro', J + 'encerrado-importado'),
    ('Prado x Seguradora Norte', N_PRADO2, 'Cível', 'Luís Prado', ('res', 'neutro', 'Perda', 'encerrado em 02/09/2026'), 'Larissa Costa', '#'),
    ('Ramos x Construtora Lume', N_LUME, 'Cível', 'Benedito Ramos Filho', ('imp', 'arquivado no Astrea em 02/12/2024'), 'Felipe Matos', '#'),
]


def lista_enc():
    R = JU['resp']
    linhas, cartoes = '', ''
    for nome, num, area, cli, como, rsp, href in ENC:
        if como[0] == 'res':
            c = f'<div class="il-como">{selo(como[1], como[2])}<small>{como[3]}</small></div>'
            c_cel = f'{como[2]} · {como[3]}'
            o = ''
        else:
            c = f'<div class="il-como">{selo_enc()}<small>sem resultado · {como[1]}</small></div>'
            c_cel = f'Veio encerrado · {como[1]}'
            o = f'<div style="margin-top:4px">{orig("astrea", True)}</div>'
        linhas += (f'<tr><td><div class="esc"><div><a href="{href}">{H(nome)}</a><small class="num">{num} · {area}</small>{o}</div></div></td>'
                   f'<td><div class="ju-cli"><strong>{H(cli)}</strong></div></td><td>{c}</td><td>{R(rsp)}</td></tr>')
        cartoes += (f'<li class="cartao"><div class="c-topo"><div><a class="c-nome" href="{href}">{H(nome)}</a><small class="num">{num}</small></div>{ico("dir", "ico c-ir")}</div>'
                    f'<dl class="c-dados"><dt>Cliente</dt><dd>{H(cli)}</dd><dt>Como encerrou</dt><dd>{c_cel}</dd><dt>Responsável</dt><dd>{rsp}</dd></dl>'
                    + (f'<div class="c-selos">{selo_enc()}{orig("astrea", True)}</div>' if o else '') + '</li>')
    cols = '<col style="width:36%"><col style="width:20%"><col style="width:26%"><col style="width:18%">'
    return (f'<table class="so-pc ju-tab"><caption class="sr">Casos encerrados</caption><colgroup>{cols}</colgroup>'
            f'<thead><tr><th scope="col">Caso e processo</th><th scope="col">Cliente</th><th scope="col">Como encerrou</th><th scope="col">Responsável</th></tr></thead>'
            f'<tbody>{linhas}</tbody></table><ul class="cartoes so-cel" aria-label="Casos encerrados">{cartoes}</ul>')


def pagina_encerrados():
    sel = JU['selecao']
    f = (f'<form class="ju-ferr" role="search" action="#" onsubmit="return false">'
         f'<div class="campo-busca"><label class="sr" for="ju-busca">Buscar por caso, número do processo, cliente ou parte contrária</label>{ico("busca")}'
         f'<input class="entrada" id="ju-busca" type="search" placeholder="Caso, número ou cliente" autocomplete="off" spellcheck="false"></div>'
         + sel('f-resp', 'Responsável', ['Todos'] + JU['EQUIPE'][:4], 'Todos', '', vazio='')
         + sel('f-como', 'Como encerrou', ['Todos', 'Com resultado', 'Veio encerrado da importação', 'Importação desfeita'], 'Todos', '', vazio='')
         + '<div class="chips" role="group" aria-label="Mostrar"><button type="button" aria-pressed="false">Em andamento (246)</button><button type="button" aria-pressed="true">Encerrados (85)</button></div></form>')
    cont = '<b>85 casos encerrados</b> · 14 com resultado e 71 que vieram encerrados do Astrea · do mais recente para o mais antigo'
    pe = (f'<p class="hn-pe">{ico("historico")}<span>Caso não se apaga. O que veio encerrado de outro sistema fica aqui sem resultado e sem acerto, '
          f'fora das contas de ganho, perda e acordo; se quiser, registre o resultado na ficha.</span></p>')
    mais = f'<div class="mais"><span>Mostrando 5 de 85</span><button class="btn btn-sec" type="button">{ico("baixo")}Mostrar mais 25</button></div>'
    return (f'<div class="ju">{JU["cab_casos"]()}<section class="folha" aria-labelledby="t-lista" style="overflow:hidden"><h2 id="t-lista" class="sr">Lista de casos</h2>'
            f'{f}<p class="ju-cont" role="status">{cont}</p>{lista_enc()}{mais}{pe}</section></div>')


# ---------------------------------------------------------------- estados e páginas
CSS_PAG = CL['CSS_CL'] + CT['CSS'] + IS['CSS_IM'] + IS['CSS_IS'] + CSS_IL
URL = {'Contratos': CTR + 'contratos', 'Honorários': CTR + 'honorarios', 'Procurações e modelos': CTR + 'procuracoes'}
A = dict(area='contratos', secao='Contratos', atual='contratos', trilha='Contratos|Contratos|Lembretes de contrato', titulo='Lembretes de contrato')
F = dict(atual='clientes', trilha='Clientes|Márcio Tavares', titulo='Márcio Tavares', aba='ficha')

T = ''
T += tpl('lista', lista() + j_dispensar(), **A)
T += tpl('busca-vazia', busca_vazia(), **A)
T += tpl('viraram', viraram(), **A)
T += tpl('dispensados', dispensados(), **A)
T += tpl('vazio', vazio(), **A)
T += tpl('carregando', carregando(), **A)
T += tpl('erro', erro(), **A)
T += tpl('entrada', entrada(), **dict(A, trilha='Contratos|Contratos', titulo='Contratos'))
out = montar('lembretes.html', 'Lembretes de contrato', 'Lista dos lembretes de contrato: clientes com valor em aberto no sistema antigo, para criar o contrato ou dispensar (F3.56).',
             '{"estado":"lista","atual":"contratos"}', T, barras('contratos', URL), CSS_PAG)
open(os.path.join(SAIDA, 'lembretes.html'), 'w', encoding='utf-8').write(out)
print('lembretes ok', T.count('<template data-est='), 'estados')

T = ''
T += tpl('dispensar', lista() + j_dispensar(abrir=True), **A)
T += tpl('dispensar-erro', lista() + j_dispensar(abrir=True, err=True), **A)
T += tpl('dispensar-conflito', lista() + j_dispensar(abrir=True, conflito=True), **A)
T += tpl('dispensado', dispensado_lista(), **A)
T += tpl('dispensados-hoje', dispensados(OSVALDO_D, nums('dispensados', ('80', 'R$ 44.000,00'), '4', '3')), **A)
JF = lambda **k: j_dispensar('Márcio Tavares', 'Tavares x Metalúrgica Andrade', '3.750,00', 3, idj='janela-dispensar-f', **k)
T += tpl('ficha', ficha_marcio(extra=JF()), **F)
T += tpl('ficha-dispensar', ficha_marcio(extra=JF(abrir=True)), **F)
T += tpl('ficha-dispensado', toast_acao('Lembrete de Márcio dispensado.', 'Saiu da ficha e da lista de lembretes. O histórico do Astrea continua aqui, como estava.',
                                        f'<button class="btn btn-sec" type="button">{ico("historico")}Desfazer</button>') + ficha_marcio('dispensado'), **F)
out = montar('dispensar.html', 'Dispensar lembrete', 'Dispensar à mão um lembrete de contrato, na lista e na ficha do cliente, com motivo e sem mexer no histórico do sistema antigo (F3.56).',
             '{"estado":"dispensar","atual":"contratos"}', T, barras('contratos', URL), CSS_PAG)
open(os.path.join(SAIDA, 'dispensar.html'), 'w', encoding='utf-8').write(out)
print('dispensar ok', T.count('<template data-est='), 'estados')

JA = JU['A']
T = ''
T += tpl('caso-importado', ficha_importado(), **JA('Casos e processos', 'Jurídico|Casos e processos|Tavares x Metalúrgica Andrade', 'Tavares x Metalúrgica Andrade'))
T += tpl('caso-advbox', ficha_importado('advbox'), **JA('Casos e processos', 'Jurídico|Casos e processos|Lins x Banco Horizonte', 'Lins x Banco Horizonte'))
T += tpl('encerrados', pagina_encerrados(), **JA('Casos e processos', 'Jurídico|Casos e processos', 'Casos e processos'))
T += tpl('encerrado-importado', ficha_encerrado(), **JA('Casos e processos', 'Jurídico|Casos e processos|Queiroz x Construtora Lume', 'Queiroz x Construtora Lume'))
out = JU['pagina']('Jurídico', 'O caso importado de outro sistema na ficha do Jurídico (origem, data, quem importou, etapa antiga) e o caso que veio encerrado (F3.56).',
                   '{"estado":"caso-importado","atual":"juridico"}', '', T, JU['BARRAS'])
out = out.replace('</style>', JU['CSS_JU'] + IS['CSS_HN'] + CSS_IL + '\n</style>', 1)
open(os.path.join(SAIDA, 'caso-importado.html'), 'w', encoding='utf-8').write(out)
print('caso-importado ok', T.count('<template data-est='), 'estados')
