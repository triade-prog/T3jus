# Portal · Pendências de Clientes: Início com os contatos do dia (F1.14, AP-06) e pedido de
# exclusão do titular (F1.15, PT-11). Parte do desenho aprovado de Clientes (clientes.py, sem
# mudança: as peças dele são lidas daqui) e do Portal v1 (comum.py, sem mudança).
# Peças novas com prefixo pd-. A marca é a de hoje (logo oficial, PR #11), tirada de
# sistema/packages/ui/src/logo-desenho.ts.
# Uso: python3 pendencias.py <pasta-saida>
import sys, os, re, html

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'

# Peças aprovadas de Clientes: executa o clientes.py até antes de gravar o HTML dele.
_src = open(os.path.join(AQUI, 'clientes.py'), encoding='utf-8').read()
_src = _src[:_src.index("out = pagina('Clientes'")]
NS = {'__name__': 'clientes_aprovado', '__file__': os.path.join(AQUI, 'clientes.py')}
_argv = sys.argv
sys.argv = [sys.argv[0], SAIDA]
exec(compile(_src, 'clientes.py', 'exec'), NS)
sys.argv = _argv
globals().update({k: v for k, v in NS.items() if not k.startswith('__') and k != 'T'})
H = html.escape
CLIENTES_APROV = '../portal-clientes/clientes.html'

# ---------------------------------------------------------------- marca de hoje (PR #11)
_logo = open(__import__('os').environ.get('T3JUS_LOGO', '/home/user/t3jus/sistema/packages/ui/src/logo-desenho.ts'), encoding='utf-8').read()
_sim = re.search(r'SIMBOLO = \{ w: (\d+), h: (\d+), d: "([^"]+)"', _logo).group(3)
_pal = re.search(r'PALAVRA = \{ w: (\d+), h: (\d+), d: "([^"]+)"', _logo).group(3)
_cp = re.search(r'COMPACTO = \{ w: (\d+), h: (\d+), palavra: \{ x: ([\d.]+), y: ([\d.]+), escala: ([\d.]+) \} \}', _logo)
CW, CH, PX, PY, PE = _cp.groups()
# LogoCompacto tom "sobre-vinho": coluna âmbar #DD9760 e letras sal #F1E6DF (Marca.tsx)
LOGO_SYMBOL = (f'<symbol id="pd-logo" viewBox="0 0 {CW} {CH}"><path fill="#DD9760" fill-rule="evenodd" d="{_sim}"/>'
               f'<path fill="#F1E6DF" fill-rule="evenodd" d="{_pal}" transform="translate({PX} {PY}) scale({PE})"/></symbol>')
LOGO = '<svg class="logo" viewBox="0 0 %s %s" aria-hidden="true" focusable="false"><use href="#pd-logo"/></svg>' % (CW, CH)
CSS_LOGO = r"""
/* Marca de hoje (LogoCompacto, tom sobre-vinho), como no Moldura.tsx e no portal.css */
.marca-palavra{line-height:0;width:max-content;border-radius:var(--raio)}
.marca-palavra .logo{height:36px;width:auto;display:block}
.barra-cel .marca-cel .logo{height:28px;width:auto;display:block;flex:none}
"""

# ---------------------------------------------------------------- CSS novo (prefixo pd-)
CSS_PD = CSS_LOGO + r"""
/* ==========================================================================
   Portal · Pendências de Clientes (F1.14 AP-06; F1.15 PT-11). Prefixo pd-.
   ========================================================================== */
.pd-inicio{display:flex;flex-direction:column;gap:24px;min-width:0}
.pd-folha-cab h2 .ico{color:var(--vinho-4)}
.pd-contatos .prazo{grid-template-columns:64px minmax(0,1fr) auto}
.pd-contatos .prazo .lado{min-width:190px}
.pd-contatos .prazo a{display:inline-flex;align-items:center;min-height:44px;margin:-12px 0 -10px}
.marca-palavra{min-height:44px;align-items:center}
.pd-oque{display:block;font-size:14px;color:var(--texto);margin-top:2px}
.pd-ct{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px;color:var(--texto-2);margin-top:4px}
.pd-ct .ico{width:14px;height:14px;color:var(--vinho-4)}
.pd-grupo{display:flex;align-items:center;gap:10px;padding:10px 24px 6px;font-size:11px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:var(--vinho-2);border-top:1px solid var(--divisor)}
.pd-grupo::after{content:"";flex:1;height:1px;background:var(--borda-folha)}
.pd-grupo:first-child{border-top:0}
.pd-contatos .prazo:first-child{border-top:0}
.data .pd-venc{--c:var(--vinho-3);color:var(--papel)}
.pd-chips{display:flex;gap:6px;padding:0 24px 14px;flex-wrap:wrap}
.pd-chips button{min-height:44px;padding:0 14px;border-radius:22px;border:1px solid var(--borda-folha);background:var(--papel);font:inherit;font-size:13px;color:var(--texto-2);cursor:pointer;display:flex;align-items:center;gap:6px}
.pd-chips button[aria-pressed="true"]{background:var(--vinho);border-color:var(--vinho);color:var(--papel)}
.pd-nada-meu{display:flex;align-items:flex-start;gap:10px;margin:0 24px 6px;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.5}
.pd-nada-meu .ico{color:var(--vinho-4);flex:none;margin-top:1px}
.pd-vazio{display:grid;justify-items:center;text-align:center;gap:10px;padding:30px 24px 30px}
.pd-vazio .pd-sol{width:72px;height:72px;border-radius:50%;display:grid;place-items:center;background:var(--ambar-3);color:var(--vinho);box-shadow:0 0 0 10px var(--sal-2)}
.pd-vazio .pd-sol .ico{width:32px;height:32px}
.pd-vazio h3{font-size:24px;color:var(--vinho);margin-top:10px}
.pd-vazio p{max-width:46ch;color:var(--texto-2)}
.pd-vazio .pd-prox{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:20px;background:var(--sal-2);color:var(--texto);font-size:13px}
.pd-vazio .pd-prox b{font-weight:500}
.pd-vazio .pd-prox .ico{width:16px;height:16px;color:var(--vinho-4)}
.pd-esq{display:grid;grid-template-columns:64px minmax(0,1fr) 150px;gap:16px;align-items:center;padding:14px 24px;border-top:1px solid var(--divisor)}
.pd-esq:first-child{border-top:0}
.hero .dia .pd-esq-dia{display:flex;align-items:center;gap:14px}
.pd-encaixe{border:1.5px dashed var(--vinho-4);border-radius:var(--raio-g);padding:18px 22px;display:grid;gap:6px;background:rgba(255,255,255,.35)}
.pd-encaixe .pd-rotulo{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:var(--vinho-2)}
.pd-encaixe h2{font-size:22px;color:var(--vinho);display:flex;align-items:center;gap:10px}
.pd-encaixe h2 .ico{color:var(--vinho-4)}
.pd-encaixe p{font-size:13px;color:var(--texto-2);line-height:1.5}
.pd-encaixe.pd-alto{min-height:260px;align-content:start}
.pd-encaixe.pd-medio{min-height:180px;align-content:start}
.pd-anot{display:flex;gap:10px;align-items:flex-start;padding:12px 16px;border-radius:var(--raio);background:var(--ambar-3);font-size:13px;line-height:1.5}
.pd-anot .ico{color:var(--vinho);flex:none;margin-top:1px}
.hero .dia .pd-res{opacity:.85}
.hero .dia .pd-res .disco{background:transparent;box-shadow:inset 0 0 0 1.5px var(--vinho-4);color:var(--ambar-3)}

/* Exclusão (LGPD) */
.pd-lgpd-acao{margin-top:6px;padding-top:14px;border-top:1px solid var(--divisor);display:grid;gap:8px}
.pd-lgpd-acao p{font-size:13px;color:var(--texto-2);line-height:1.5}
.pd-lgpd-acao p b{display:block;color:var(--texto);font-weight:500}
.pd-lgpd-acao .btn{justify-self:start}
.janela.pd-janela{width:min(980px,calc(100vw - 32px))}
.pd-janela .janela-pe{position:sticky;bottom:0;z-index:2;background:var(--superficie);border-top:1px solid var(--divisor);box-shadow:0 -10px 18px -14px rgba(42,26,34,.35)}
.pd-janela .janela-corpo{padding-bottom:20px}
.pd-j{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px 28px;align-items:start}
.pd-j>.pd-inteira{grid-column:1/-1}
.pd-col{display:grid;gap:14px;min-width:0}
.pd-lado{border-radius:var(--raio);padding:14px 16px;display:grid;gap:8px}
.pd-lado h3{font-size:18px;display:flex;align-items:center;gap:8px;color:var(--vinho)}
.pd-lado h3 .ico{width:20px;height:20px}
.pd-lado ul{list-style:none;margin:0;padding:0;display:grid;gap:7px}
.pd-lado li{font-size:13px;line-height:1.45;padding-left:14px;position:relative}
.pd-lado li::before{content:"";position:absolute;left:0;top:.6em;width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.55}
.pd-lado li small{display:block;font-size:12px;color:var(--texto-2)}
.pd-some{background:#FBF1F4;box-shadow:inset 3px 0 0 var(--vinho-3)}
.pd-some h3{color:var(--vinho-3)}
.pd-fica{background:var(--sal-2);box-shadow:inset 3px 0 0 var(--vinho-4)}
.pd-guarda{background:var(--ambar-3);box-shadow:inset 3px 0 0 var(--ambar)}
.pd-pedido{border:0;margin:0;padding:0;display:grid;gap:14px;min-width:0}
.pd-pedido>legend{padding:0;font-family:var(--serifa);font-size:19px;font-weight:600;color:var(--vinho);margin-bottom:2px}
.pd-dois{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.pd-confirma{padding:14px 16px;border-radius:var(--raio);border:1.5px solid var(--vinho-3);background:var(--papel);display:grid;gap:8px}
.pd-confirma .pd-nome{font-family:var(--serifa);font-size:18px;color:var(--vinho);font-weight:600}
.pd-irrev{display:flex;align-items:flex-start;gap:10px;font-size:13px;line-height:1.5;color:var(--texto)}
.pd-irrev .ico{color:var(--vinho-3);flex:none;margin-top:1px}
.btn.pd-perigo-cheio{background:var(--urgencia);border-color:var(--urgencia);color:var(--urgencia-sobre)}
.btn.pd-perigo-cheio:hover{background:var(--vinho);border-color:var(--vinho)}
.btn.pd-perigo-cheio .ico{color:inherit}
.pd-quem{border:0;margin:0;padding:0;display:grid;gap:2px;min-width:0}
.pd-quem legend{font-weight:500;font-size:14px;margin-bottom:4px;padding:0}
.pd-quem .opcao{margin:0 -8px}
.janela-pe .pd-pe-nota{margin-right:auto;font-size:12px;color:var(--texto-2);max-width:36ch;line-height:1.4}

/* Ficha de cliente excluído */
.ficha-cab .esq .meta .selo-excl{background:var(--sal);color:var(--vinho)}
.pd-excl-h1{font-style:italic}
.pd-registro{margin:0;padding:0 24px 8px;display:grid;gap:10px}
.pd-registro div{display:flex;justify-content:space-between;gap:12px;font-size:13px;padding-top:10px;border-top:1px solid var(--divisor)}
.pd-registro div:first-child{border-top:0;padding-top:0}
.pd-registro dt{color:var(--texto-2)}
.pd-registro dd{margin:0;font-weight:500;text-align:right}
.dados-ficha dd.pd-x{font-style:italic;color:var(--texto-2);font-weight:400;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pd-x-resumo{display:block;margin-top:6px;padding-left:12px;border-left:2px solid var(--borda-folha);font-size:13px;font-style:italic;color:var(--texto-2)}
.cl-tab tr.pd-excl td{color:var(--texto-2);background:#FBF8F6}
.cl-tab tr.pd-excl .esc span.av-p{background:var(--sal-2);color:var(--texto-2)}
.selo-excl{background:var(--sal);color:var(--vinho)}
.pd-futuro{display:flex;gap:10px;align-items:center;padding:10px 14px;border-radius:var(--raio);border:1.5px dashed var(--vinho-4);font-size:12px;color:var(--vinho-2);letter-spacing:.04em}
.pd-futuro .ico{color:var(--vinho-4);flex:none}

/* Decisões da Carol (18/11/2026): pedido pela equipe, faixa, aviso no Início, dica do resumo */
.pd-dica{display:flex;gap:8px;align-items:flex-start;margin-top:8px;padding:8px 10px;border-radius:8px;background:var(--papel);font-size:12px;line-height:1.45;color:var(--texto)}
.pd-dica .ico{width:16px;height:16px;color:var(--vinho-3);flex:none;margin-top:1px}
.pd-faixa .aviso{box-shadow:none}
.pd-faixa .aviso-titulo{font-weight:500}
.pd-faixa .aviso-acoes .btn{min-height:44px}
.pd-pedido-ini{display:flex;align-items:center;gap:14px;min-height:56px;padding:12px 20px;border-radius:var(--raio-g);background:var(--papel);border:1px solid var(--borda-folha);box-shadow:inset 5px 0 0 var(--ambar);color:var(--texto);text-decoration:none}
.pd-pedido-ini>.ico:first-child{color:var(--vinho-3);flex:none;width:24px;height:24px}
.pd-pedido-ini b{display:block;font-weight:500;color:var(--vinho);font-size:15px}
.pd-pedido-ini small{display:block;font-size:12px;color:var(--texto-2)}
.pd-pedido-ini .pd-ir{margin-left:auto;flex:none;color:var(--vinho-4)}
.pd-pedido-ini:hover b{text-decoration:underline}
.pd-pedido-ini:focus-visible{outline:3px solid var(--vinho-4);outline-offset:2px}
.pd-arq-nota{font-size:13px;line-height:1.5}

@media (max-width:760px){
  .pd-faixa .aviso-acoes .btn{flex:1 1 100%}
  .pd-pedido-ini{padding:12px 16px}
  .pd-inicio{gap:16px}
  .pd-contatos .prazo{grid-template-columns:52px minmax(0,1fr)}
  .pd-contatos .prazo .lado{min-width:0;flex-direction:row;flex-wrap:wrap;align-items:center}
  .pd-contatos .prazo .lado .btn{flex:1 1 100%;min-height:44px}
  .pd-grupo{padding:10px 16px 6px}
  .pd-chips{padding:0 16px 12px}
  .pd-chips button{flex:1 1 0;justify-content:center}
  .pd-nada-meu{margin:0 16px 6px}
  .pd-esq{grid-template-columns:52px minmax(0,1fr);padding:12px 16px}
  .pd-esq .so-pc-i{display:none}
  .pd-encaixe{padding:16px}
  .pd-j{grid-template-columns:minmax(0,1fr);gap:16px}
  .pd-dois{grid-template-columns:1fr}
  .pd-lgpd-acao .btn{justify-self:stretch}
  .janela-pe .pd-pe-nota{display:none}
  .pd-registro{padding-left:16px;padding-right:16px}
  .hero .dia{gap:12px!important}
}
"""

# ---------------------------------------------------------------- Início: dados
HOJE_LONGO = 'Quarta-feira, 18 de novembro'
FICHA_ANT = 'pendencias.html?estado=excluir-ficha'
VENC_LISTA = CLIENTES_APROV + '?estado=vencidos'

# (dia, mês, cliente, o que fazer, contato, papel, tel, tipo, rótulo, responsável, link)
C_HELIO = ('10', 'nov', 'Hélio Batista Corrêa', 'Cobrar os exames da perícia', 'Marta Corrêa', 'esposa', '(11) 98114-3059', 'vencido', 'vencido há 8 dias', 'Diego Almeida', '#')
C_ANT = ('13', 'nov', 'Antônia Ferreira Prado', 'Ligar para Joana sobre a carta do INSS', 'Joana Prado', 'filha', '(11) 99123-4567', 'vencido', 'vencido há 5 dias', 'Diego Almeida', CLIENTES_APROV + '?estado=ficha')
C_DAN = ('17', 'nov', 'Daniela Rocha Mendes', 'Mandar a proposta de honorários', 'Daniela', 'a própria', '(11) 98830-2417', 'vencido', 'vencido ontem', 'Diego Almeida', '#')
C_RAF = ('18', 'nov', 'Rafael Moura Santos', 'Confirmar a reunião de sexta, às 14h', 'Rafael', 'o próprio', '(11) 99487-2210', 'hoje', 'Hoje', 'Diego Almeida', '#')
C_LUC = ('18', 'nov', 'Lúcia Helena Barros', 'Pedir a carteira de trabalho digitalizada', 'Lúcia', 'a própria', '(11) 97651-0384', 'hoje', 'Hoje', 'Diego Almeida', '#')
C_GAB = ('18', 'nov', 'Gabriela Teixeira', 'Retorno sobre o acordo com o ex-empregador', 'Gabriela', 'a própria', '(11) 99602-7735', 'hoje', 'Hoje', 'Marina Ribeiro', '#')
C_SER = ('16', 'nov', 'Sérgio Nogueira Pires', 'Avisar sobre a audiência de conciliação', 'Sérgio', 'o próprio', '(11) 98275-6614', 'vencido', 'vencido há 2 dias', 'Felipe Matos', '#')
EXTRA = [
    ('04', 'nov', 'Otília Ramos Freitas', 'Pedir o extrato do FGTS', 'Otília', 'a própria', '(11) 97120-4483', 'vencido', 'vencido há 14 dias', 'Diego Almeida', '#'),
    ('06', 'nov', 'Mercearia Dois Irmãos ME', 'Enviar a minuta do acordo', 'Wagner Lima', 'sócio', '(11) 2734-1180', 'vencido', 'vencido há 12 dias', 'Diego Almeida', '#'),
    ('11', 'nov', 'Paulo César Moreira', 'Remarcar a reunião', 'Paulo César', 'o próprio', '(11) 98841-2207', 'vencido', 'vencido há 7 dias', 'Diego Almeida', '#'),
    ('18', 'nov', 'Tânia Ribeiro Lopes', 'Confirmar se recebeu o contrato', 'Tânia', 'a própria', '(11) 99318-5520', 'hoje', 'Hoje', 'Diego Almeida', '#'),
]
DIEGO = [C_HELIO, C_ANT, C_DAN, C_RAF, C_LUC]
EQUIPE = [C_HELIO, C_ANT, C_SER, C_DAN, C_GAB, C_RAF, C_LUC]
INI = lambda n: ''.join(p[0] for p in n.split()[:2])


def item(c, resp=False, n=0):
    dia_, mes, cli, oque, ct, papel, tel, tipo, rot, quem, link = c
    disco = 'disco pd-venc' if tipo == 'vencido' else 'disco hoje'
    selo = (f'<span class="selo selo-urgente">{ico("alerta")}{rot}</span>' if tipo == 'vencido'
            else f'<span class="selo selo-atencao">{ico("relogio")}Hoje</span>')
    r = f'<span class="resp"><i aria-hidden="true">{INI(quem)}</i>{quem}</span>' if resp else ''
    data_sr = f'<span class="sr">Marcado para {dia_}/11. </span>'
    whats = 'whats' if tel.startswith('(11) 9') else 'telefone'
    jan = ' data-janela="janela-registrar"' if cli.startswith('Antônia') else ''
    return (f'<li class="prazo"><div class="data" aria-hidden="true"><span class="{disco}"><span>{dia_}</span></span><small>{mes}</small></div>'
            f'<div>{data_sr}<a href="{link}">{H(cli)}</a><span class="pd-oque">{H(oque)}</span>'
            f'<span class="pd-ct">{ico(whats)}{H(ct)} · {H(papel)} · <span class="num">{tel}</span></span></div>'
            f'<div class="lado">{selo}{r}<button class="btn btn-sec btn-compacto" type="button"{jan}>{ico("mais", "ico ico-s")}Registrar atendimento<span class="sr"> de {H(cli)}</span></button></div></li>')


def lista_contatos(itens, resp=False):
    v = [c for c in itens if c[7] == 'vencido']
    h = [c for c in itens if c[7] == 'hoje']
    out = ''
    if v:
        out += f'<p class="pd-grupo" id="g-venc">Vencidos · {len(v)}</p><ol class="prazos pd-contatos" aria-labelledby="g-venc">{"".join(item(c, resp) for c in v)}</ol>'
    if h:
        out += f'<p class="pd-grupo" id="g-hoje">Para hoje · {len(h)}</p><ol class="prazos pd-contatos" aria-labelledby="g-hoje">{"".join(item(c, resp) for c in h)}</ol>'
    return out


def bloco(miolo, sub, pe='', chips='', ver=True, busy=False):
    v = (f'<a class="ver" href="{VENC_LISTA}">Ver todos<span class="sr"> os contatos vencidos em Clientes</span>{ico("dir", "ico ico-s")}</a>' if ver else '')
    b = ' aria-busy="true"' if busy else ''
    return (f'<section class="folha" id="contatos" aria-labelledby="t-contatos"{b}><div class="folha-cab pd-folha-cab"><div><h2 id="t-contatos">{ico("relogio")}Contatos de hoje</h2>'
            f'<p class="sub">{sub}</p></div>{v}</div>{chips}{miolo}{pe}</section>')


def hero(nome, dia_itens=None, atalhos=True, carregando=False):
    if carregando:
        dia_html = ('<ul class="dia" aria-hidden="true">' + ''.join(
            '<li><span class="pd-esq-dia"><span class="esqueleto" style="width:56px;height:56px;border-radius:50%;opacity:.35"></span>'
            '<span class="esqueleto esq-linha" style="width:110px;opacity:.35"></span></span></li>' for _ in range(2)) + '</ul>')
    elif dia_itens:
        dia_html = '<ul class="dia" aria-label="Os seus contatos de hoje">' + ''.join(
            f'<li><a href="#contatos"><span class="disco"><span>{n}</span></span><span><b>{t}</b>{s}</span></a></li>' for n, t, s in dia_itens) + '</ul>'
    else:
        dia_html = ''
    at = (f'<div class="dir campo-ambar"><p class="sobretitulo">Atalhos</p>'
          f'<a class="btn btn-escuro" href="{CLIENTES_APROV}?estado=novo">{ico("pessoa-mais")}Novo cliente</a>'
          f'<a class="btn btn-sec" href="{CLIENTES_APROV}?estado=lista">{ico("pessoas")}Abrir Clientes</a></div>') if atalhos else ''
    return (f'<div class="hero"><div class="esq campo-vinho">{ico("balanca", "ico estatua")}<p class="sobretitulo">{HOJE_LONGO}</p>'
            f'<h1>Bom dia, {nome}.</h1><span class="fio" aria-hidden="true"></span>{dia_html}</div>{at}</div>')


EXPLICA_INICIO = (f'<section class="explica campo-ambar" aria-labelledby="t-exi"><p class="sobretitulo">Contatos de hoje</p><h2 id="t-exi">O retorno combinado não se perde.</h2><ul>'
                  f'<li>{ico("relogio")}<span>Aqui ficam os próximos contatos em que você é o responsável: os vencidos, do mais antigo para o mais novo, e depois os de hoje.</span></li>'
                  f'<li>{ico("historico")}<span>Quem marca o próximo contato e o responsável é o atendimento registrado na ficha do cliente.</span></li>'
                  f'<li>{ico("check")}<span>Registrou o atendimento, o contato sai daqui. Se marcar outro, ele volta no dia certo.</span></li></ul></section>')


def grade_inicio(esq, dir_=EXPLICA_INICIO):
    return f'<div class="pt-inicio"><div class="pt-col">{esq}</div><aside class="pt-col" aria-label="Sobre o Início">{dir_}</aside></div>'


def inicio(h, b, dir_=EXPLICA_INICIO, extra='', antes=''):
    return f'<div class="pd-inicio">{h}{antes}{grade_inicio(b, dir_)}</div>{extra}'


DIA_DIEGO = [('3', 'contatos vencidos', 'o mais antigo, 10/11'), ('2', 'contatos hoje', 'Rafael e Lúcia')]
SUB_DIEGO = 'Os seus: 3 vencidos e 2 para hoje'

# Estados do Início
T = ''
I = dict(atual='inicio', trilha='Início', titulo='Início')
T += tpl('inicio', inicio(hero('Diego', DIA_DIEGO), bloco(lista_contatos(DIEGO), SUB_DIEGO)) + j_registrar(), quem='comercial', **I)

MUITOS = sorted(EXTRA + DIEGO, key=lambda c: (c[7] != 'vencido', c[0]))
pe_muitos = (f'<div class="mais"><span>Mostrando 5 de 9. Os outros 4: 3 vencidos e 1 de hoje.</span>'
             f'<a class="ver" href="{VENC_LISTA}">Ver todos os vencidos em Clientes{ico("dir", "ico ico-s")}</a></div>')
T += tpl('inicio-muitos', inicio(hero('Diego', [('7', 'contatos vencidos', 'o mais antigo, 04/11'), ('2', 'contatos hoje', 'Rafael e Lúcia')]),
                                 bloco(lista_contatos(MUITOS[:5]), 'Os seus: 7 vencidos e 2 para hoje', pe=pe_muitos)) + j_registrar(), quem='comercial', **I)


def chips_dona(meus, equipe, sel='meus'):
    b = lambda k, r: f'<button type="button" aria-pressed="{"true" if sel == k else "false"}">{r}</button>'
    return f'<div class="pd-chips" role="group" aria-label="Mostrar">{b("meus", f"Meus ({meus})")}{b("equipe", f"Da equipe ({equipe})")}</div>'


nada_meu = (f'<p class="pd-nada-meu">{ico("check")}<span>Nenhum contato seu está vencido. Na equipe há 4 vencidos: 3 com Diego Almeida e 1 com Felipe Matos. '
            f'Veja em “Da equipe”.</span></p>')
T += tpl('inicio-dona', inicio(hero('Marina', [('1', 'contato seu hoje', 'Gabriela Teixeira'), ('4', 'vencidos na equipe', 'Diego e Felipe')]),
                               bloco(nada_meu + lista_contatos([C_GAB]), 'Os seus: 1 para hoje', chips=chips_dona(1, 7))), **I)
T += tpl('inicio-dona-equipe', inicio(hero('Marina', [('1', 'contato seu hoje', 'Gabriela Teixeira'), ('4', 'vencidos na equipe', 'Diego e Felipe')]),
                                      bloco(lista_contatos(EQUIPE, resp=True), 'Da equipe: 4 vencidos e 3 para hoje, com o responsável de cada um', chips=chips_dona(1, 7, 'equipe'))), **I)

# Decisão 2: no Início da sócia dona, um aviso curto leva à ficha com o pedido esperando
AVISO_PEDIDO = (f'<a class="pd-pedido-ini" href="pendencias.html?estado=excluir-pedido-dona">{ico("escudo")}<span><b>1 pedido de exclusão esperando você</b>'
                f'<small>Antônia Ferreira Prado · pedido em 18/11 por Diego Almeida (LGPD)</small></span>{ico("dir", "ico ico-s pd-ir")}</a>')
T += tpl('inicio-dona-pedido', inicio(hero('Marina', [('1', 'contato seu hoje', 'Gabriela Teixeira'), ('4', 'vencidos na equipe', 'Diego e Felipe')]),
                                      bloco(nada_meu + lista_contatos([C_GAB]), 'Os seus: 1 para hoje', chips=chips_dona(1, 7)), antes=AVISO_PEDIDO), **I)

vazio = (f'<div class="pd-vazio" role="status"><span class="pd-sol">{ico("check")}</span><h3>Tudo em dia com os seus clientes.</h3>'
         f'<p>Nenhum contato vencido e nenhum para hoje. Quando um atendimento marcar você como responsável, o retorno aparece aqui no dia.</p>'
         f'<span class="pd-prox">{ico("agenda")}Próximo: <b>sexta, 20/11</b> · Benedito Souza Lima</span></div>')
T += tpl('inicio-vazio', inicio(hero('Diego', [('0', 'contatos vencidos', 'tudo em dia'), ('0', 'contatos hoje', 'próximo na sexta')]),
                                bloco(vazio, 'Os seus: nada vencido, nada para hoje', ver=False)), quem='comercial', **I)

esq = ''.join(f'<div class="pd-esq"><span class="esqueleto" style="width:48px;height:48px;border-radius:50%"></span><div style="display:grid;gap:8px">'
              f'<span class="esqueleto esq-linha" style="width:55%;height:13px"></span><span class="esqueleto esq-linha" style="width:40%;height:10px"></span></div>'
              f'<span class="esqueleto esq-linha so-pc-i" style="width:150px;height:28px"></span></div>' for _ in range(4))
T += tpl('inicio-carregando', inicio(hero('Diego', carregando=True),
                                     bloco(f'<p class="sr" role="status">Carregando os seus contatos de hoje…</p><div aria-hidden="true">{esq}</div>', 'Buscando os seus contatos…', ver=False, busy=True)),
         quem='comercial', **I)
T += tpl('inicio-erro', inicio(hero('Diego'), bloco(estado('Não deu para carregar os seus contatos',
         'O servidor não respondeu. Nenhum atendimento se perdeu, e o resto do Início continua funcionando. Se continuar, os vencidos também estão em Clientes, no filtro “Contato vencido”.',
         erro=True, moldura=False, acoes=f'<button class="btn btn-pri" type="button">{ico("reenviar")}Tentar de novo</button>'
         f'<a class="btn btn-sec" href="{VENC_LISTA}">{ico("pessoas")}Abrir Clientes</a>', codigo='Código para o suporte: PTL-7A31-0611'), 'Os seus contatos vencidos e de hoje', ver=False)),
         quem='comercial', **I)

sem_com = estado('O seu Início ganha blocos com as suas áreas',
                 'Os prazos e as tarefas do Jurídico vão aparecer aqui quando o Jurídico tiver tela, junto com as conversas e a agenda da equipe. Enquanto isso, os clientes e a qualificação para a procuração estão em Clientes.',
                 'inicio', moldura=True, h='h2', acoes=f'<a class="btn btn-pri" href="{CLIENTES_APROV}?estado=lista-sem-comercial">{ico("pessoas")}Abrir Clientes</a>')
T += tpl('inicio-sem-comercial', f'<div class="pd-inicio">{hero("Larissa")}{sem_com}</div>', quem='juridico', **I)

T += tpl('inicio-registrar', inicio(hero('Diego', DIA_DIEGO), bloco(lista_contatos(DIEGO), SUB_DIEGO)) + j_registrar(abrir=True), quem='comercial', **I)
T += tpl('inicio-registrado', inicio(hero('Diego', [('2', 'contatos vencidos', 'o mais antigo, 10/11'), ('2', 'contatos hoje', 'Rafael e Lúcia')]),
                                     bloco(lista_contatos([C_HELIO, C_DAN, C_RAF, C_LUC]), 'Os seus: 2 vencidos e 2 para hoje'),
                                     extra=toast('Atendimento de Antônia registrado.', 'Ela saiu dos seus contatos de hoje. O próximo é 20/11, com Paula Nunes.')) + j_registrar(),
         quem='comercial', **I)


# Encaixe: onde os vizinhos entram (anotação de desenho, não vai para o produto)
def encaixe(rot, titulo, icone, texto, cls='pd-medio'):
    return (f'<section class="pd-encaixe {cls}" aria-label="Lugar reservado: {titulo}"><p class="pd-rotulo">{ico("pasta", "ico ico-s")}{rot}</p>'
            f'<h2>{ico(icone)}{titulo}</h2><p>{texto}</p></section>')


anot = (f'<p class="pd-anot">{ico("ajuda")}<span><b>Anotação de desenho, não vai para o produto.</b> Os blocos tracejados são os do Início aprovado (portal-inicio), '
        f'que outra frente está desenhando. Cada um entra quando a área dele tiver dados, e só para quem tem a área. Nenhum aparece vazio.</span></p>')
hero_enc = hero('Diego', DIA_DIEGO).replace('</ul>', '<li class="pd-res" aria-hidden="true"><span class="pd-esq-dia"><span class="disco"><span>·</span></span>'
                                            '<span><b>prazos, agenda</b>e conversas entram aqui</span></span></li></ul>')
esq_enc = (encaixe('Jurídico · quem tem a área', 'Prazos da semana', 'balanca', 'Fica no alto da coluna: prazo é o que mais custa perder.')
           + bloco(lista_contatos(DIEGO), SUB_DIEGO)
           + encaixe('Financeiro · quem tem a área', 'Recebimentos do mês', 'carteira', 'Entra abaixo dos contatos.'))
dir_enc = (encaixe('Todos · parte comum', 'Esperando alguém', 'conversas', 'Conversas que a IA passou para a equipe.', 'pd-alto')
           + encaixe('Todos · parte comum', 'Agenda de hoje', 'agenda', 'Compromissos da equipe. A explicação “Contatos de hoje” deixa de aparecer quando esta coluna tiver blocos.', 'pd-alto'))
T += tpl('inicio-encaixe', f'<div class="pd-inicio">{anot}{hero_enc}<div class="pt-inicio"><div class="pt-col">{esq_enc}</div><div class="pt-col">{dir_enc}</div></div></div>' + j_registrar(),
         quem='comercial', **I)

# ---------------------------------------------------------------- Exclusão do titular (LGPD)
PROTOCOLO = 'EXC-2026-0007'
NOME = 'Antônia Ferreira Prado'


def sit_dona(pedido=False):
    return (f'<section class="folha" aria-labelledby="t-sit"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-sit" style="font-size:20px">Situação</h2></div></div>'
            f'<div class="cl-sit"><p>Ativo desde 27/10/2026. Inativar tira o cliente da lista do dia a dia e encerra o próximo contato. Nada é apagado, e dá para reativar.</p>'
            f'<button class="btn btn-perigo" type="button" data-janela="janela-inativar">{ico("pasta")}Inativar cliente</button>'
            + (f'<div class="pd-lgpd-acao"><p><b>Pedido de exclusão dos dados (LGPD)</b>Há um pedido esperando você, no alto da ficha.</p></div></div></section>' if pedido else
               f'<div class="pd-lgpd-acao"><p><b>Pedido de exclusão dos dados (LGPD)</b>Se a cliente pedir para apagar os dados dela, atenda aqui. Só a sócia dona vê esta ação.</p>'
               f'<button class="btn btn-fantasma" type="button" data-janela="janela-excluir">{ico("escudo")}Atender pedido de exclusão</button></div></div></section>'))


def sit_outro(pedido=False):
    return (f'<section class="folha" aria-labelledby="t-sit"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-sit" style="font-size:20px">Situação</h2></div></div>'
            f'<div class="cl-sit"><p>Ativo desde 27/10/2026. Inativar tira o cliente da lista do dia a dia e encerra o próximo contato. Nada é apagado, e dá para reativar.</p>'
            f'<button class="btn btn-perigo" type="button" data-janela="janela-inativar">{ico("pasta")}Inativar cliente</button>'
            + (f'<div class="pd-lgpd-acao"><p><b>Pedido de exclusão enviado</b>Marina Ribeiro, a sócia dona, já recebeu o pedido de 18/11. Não precisa pedir de novo.</p></div></div></section>' if pedido else
               f'<div class="pd-lgpd-acao"><p><b>A cliente pediu para apagar os dados?</b>Quem atende o pedido (LGPD) é Marina Ribeiro, a sócia dona. Registre o pedido aqui: ela recebe no Início e decide.</p>'
               f'<button class="btn btn-fantasma" type="button" data-janela="janela-pedir">{ico("escudo")}Pedir a exclusão à sócia dona</button></div></div></section>'))


def ficha_lgpd(sit, faixa_=''):
    f = ficha_ant()
    assert situacao_folha() in f and f.count('<nav class="abas"') == 1
    return f.replace(situacao_folha(), sit).replace('<nav class="abas"', faixa_ + '<nav class="abas"', 1)


# Decisão 2: a faixa do pedido, para todos; a sócia dona vê as duas ações
def faixa(dona=False, recusado=False):
    if recusado:
        return '<div class="pd-faixa">' + aviso('info', 'Pedido de exclusão recusado em 18/11 por Marina Ribeiro.',
            'Motivo: “Não deu para confirmar que a mensagem veio da cliente. Pedimos que ela confirme pelo telefone da ficha.” '
            'Os dados continuam como estavam. O pedido e a recusa ficam no histórico do escritório.', icone='escudo', papel='note') + '</div>'
    txt = 'O pedido chegou por WhatsApp em 18/11/2026. Observação: “Pediu por mensagem, do número que está na ficha.”'
    ac = ''
    if dona:
        txt += ' Quem decide é você: excluir os dados ou recusar o pedido, com o motivo.'
        ac = (f'<button class="btn btn-perigo" type="button" data-janela="janela-excluir">{ico("escudo")}Excluir os dados</button>'
              f'<button class="btn btn-sec" type="button" data-janela="janela-recusar">Recusar o pedido</button>')
    return '<div class="pd-faixa">' + aviso('atencao', 'Exclusão pedida em 18/11 por Diego Almeida, aguardando a sócia dona.', txt, icone='escudo', acoes=ac, papel='note') + '</div>'


def j_pedir(abrir=False):
    canais = ['E-mail', 'WhatsApp', 'Presencial', 'Telefone', 'Carta']
    corpo = ('<div class="pd-dois">' + campo('pe-data', 'Data do pedido', '18/11/2026', 'c3', im='numeric', ajuda='dd/mm/aaaa', foco=True)
             + selecao('pe-canal', 'Como o pedido chegou', canais, '', 'c3') + '</div>'
             + campo('pe-obs', 'Observação', '', 'c6', opc=True, ajuda='Sem dado pessoal. Ex.: “pediu por mensagem, do número que está na ficha”.')
             + f'<p class="pt-comuns">{ico("escudo")}<span>Nada é apagado agora. Marina Ribeiro, a sócia dona, recebe o pedido no Início e decide. '
               f'O prazo da LGPD conta da data do pedido, por isso registre no mesmo dia.</span></p>')
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="submit">{ico("check")}Enviar o pedido</button>'
    return janela('janela-pedir', 'Pedido do titular · LGPD', 'Pedir a exclusão à sócia dona',
                  'Antônia Ferreira Prado pediu para apagar os dados dela. Registre quando e como o pedido chegou.', corpo, pe, abrir=abrir)


def j_recusar(abrir=False):
    corpo = (f'<div class="campo"><label for="rc-mot">Motivo</label><textarea class="entrada" id="rc-mot" name="rc-mot" aria-describedby="rc-mot-aj" data-foco></textarea>'
             f'<p class="ajuda" id="rc-mot-aj">Obrigatório. Ex.: não deu para confirmar que o pedido veio da cliente. Não escreva dado pessoal.</p></div>'
             f'<p class="pt-comuns">{ico("historico")}<span>Nada é apagado. A faixa do pedido sai da ficha e a recusa fica no histórico do escritório, com o motivo. '
             f'Avise a cliente do motivo pelo canal do pedido.</span></p>')
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-perigo" type="submit">Recusar o pedido</button>'
    return janela('janela-recusar', 'Pedido do titular · LGPD', 'Recusar o pedido de exclusão?',
                  'O pedido de 18/11, registrado por Diego Almeida, é encerrado sem excluir os dados de Antônia.', corpo, pe, alerta=True, abrir=abrir)


SOME = (f'<div class="pd-lado pd-some"><h3>{ico("x")}O que é apagado</h3><ul>'
        f'<li>Nome, CPF, RG e a qualificação<small>nacionalidade, estado civil, profissão e endereço</small></li>'
        f'<li>Os 2 contatos<small>Joana Prado e a própria cliente, com telefones e e-mails</small></li>'
        f'<li>Quem indicou<small>Rosa Almeida</small></li>'
        f'<li>Com quem se falou, nos 3 atendimentos<small>Joana Prado e a própria cliente</small></li>'
        f'<li>O próximo contato de 13/11<small>sai também do Início de Diego Almeida</small></li></ul></div>')
FICA = (f'<div class="pd-lado pd-fica"><h3>{ico("check")}O que fica, sem dado pessoal</h3><ul>'
        f'<li>O registro da exclusão<small>quem fez, quando, como o pedido chegou e o protocolo. Prova que o escritório atendeu o pedido (LGPD, art. 18 e 37).</small></li>'
        f'<li>Data, canal, quem atendeu e o resumo, nos 3 atendimentos<small>sem com quem se falou. O trabalho da equipe e o que foi tratado continuam no histórico.</small>'
        f'<span class="pd-dica">{ico("alerta")}<span>O resumo fica como foi escrito. Resumo de atendimento não deve ter dado pessoal desnecessário, como CPF, endereço ou saúde.</span></span></li>'
        f'<li>A origem, “Indicação de cliente”<small>sem quem indicou. Conta no relatório de origem.</small></li></ul></div>')
SEM_OBRIG = (f'<p class="pt-comuns">{ico("escudo")}<span><b>Nada aqui precisa ser guardado por lei.</b> Antônia ainda não tem contrato nem processo no T3jus; se tivesse, o pedido seria atendido arquivando, sem apagar. '
             f'Documentos dela fora do T3jus (papel, e-mail, pastas) ficam com o escritório, que é o controlador.</span></p>')
ARQ_ACONTECE = (f'<div class="pd-lado pd-fica"><h3>{ico("pasta")}O que acontece</h3><ul>'
                f'<li>Nada é apagado<small>dados, contatos e atendimentos ficam como estão</small></li>'
                f'<li>Antônia sai das listas comuns<small>de Ativos, de Contato vencido, da busca e do Início. Fica só em Inativos, como “Arquivado a pedido (LGPD)”.</small></li>'
                f'<li>A ficha fica só leitura<small>ninguém edita, reativa nem registra atendimento</small></li>'
                f'<li>O próximo contato de 13/11 é encerrado<small>sai também do Início de Diego Almeida</small></li>'
                f'<li>O pedido fica registrado<small>data, canal, quem pediu, quem arquivou e o protocolo</small></li></ul></div>')
ARQ_PORQUE = (f'<div class="pd-lado pd-guarda"><h3>{ico("cadeado")}Por que não exclui</h3><ul>'
              f'<li>Contrato de honorários 2026/031</li><li>Processo 0812345-67.2026.8.26.0100</li></ul>'
              f'<p class="pd-arq-nota">Com contrato ou processo, os dados continuam necessários para cumprir o contrato e defender a cliente (LGPD, art. 16). '
              f'Por isso o pedido é atendido arquivando, e não excluindo.</p></div>')
GUARDA = (f'<div class="pd-lado pd-guarda"><h3>{ico("cadeado")}O que a lei obriga a guardar</h3><ul>'
          f'<li>Contrato de honorários 2026/031<small>nome, CPF e endereço como estão no contrato e nas notas fiscais, até 11/2031</small></li>'
          f'<li>Processo 0812345-67.2026.8.26.0100<small>nome e CPF nas peças, enquanto o processo durar e no prazo de guarda depois dele</small></li></ul>'
          f'<p style="font-size:13px;line-height:1.5">Esses dados ficam <b>bloqueados</b>: saem da ficha, da busca e das listas, e só a sócia dona os vê dentro do contrato ou do processo. '
          f'Quando o prazo acabar, o T3jus avisa e a exclusão se completa.</p></div>')


def j_excluir(abrir=False, variante=''):
    erros = variante == 'erros'
    pronto = variante in ('confirmar', 'falhou', 'depois')
    if variante == 'pedido':
        topo = '<div class="pd-inteira">' + aviso('info', 'Pedido registrado por Diego Almeida em 18/11.', 'A data e o canal vêm do pedido. Confira quem pediu e confirme.', icone='escudo', papel='note') + '</div>'
    if variante != 'pedido':
        topo = ''
    if erros:
        topo = '<div class="pd-inteira">' + aviso('urgencia', 'Falta acertar 3 pontos, marcados abaixo.', 'Nada foi excluído.') + '</div>'
    if variante == 'falhou':
        topo = '<div class="pd-inteira">' + aviso('urgencia', 'A exclusão não foi feita, e nada foi apagado.',
                                                 'O servidor não respondeu. A exclusão acontece inteira ou não acontece, então os dados de Antônia estão como antes. '
                                                 'Tente de novo em instantes; se continuar, mande o código ao suporte: PTL-7A31-0733.') + '</div>'
    canais = ['E-mail', 'WhatsApp', 'Presencial', 'Telefone', 'Carta']
    canal = selecao('ex-canal', 'Como o pedido chegou', canais, 'WhatsApp' if variante == 'pedido' else ('' if erros or not pronto else 'E-mail'), 'c3',
                    erro='Escolha por onde o pedido chegou.' if erros else '')
    if erros:
        canal = canal.replace('id="ex-canal"', 'id="ex-canal" data-foco', 1)
    ch = ' checked' if pronto else ''
    a_conf = ' aria-invalid="true" aria-describedby="ex-conf-er"' if erros else ''
    e_conf = f'<p class="erro-msg" id="ex-conf-er">{ico("alerta", "ico ico-s")}Confirme quem pediu antes de excluir.</p>' if erros else ''
    nome_v = 'Antonia Prado' if erros else (NOME if pronto else '')
    ok_nome = f'<p class="cl-ok">{ico("check")}O nome confere</p>' if pronto else ''
    pedido = (f'<fieldset class="pd-pedido"><legend>O pedido</legend>'
              + '<div class="pd-dois">' + campo('ex-data', 'Data do pedido', '18/11/2026', 'c3', im='numeric', ajuda='dd/mm/aaaa', foco=variante in ('', 'falhou', 'depois', 'pedido')) + canal + '</div>'
              + '<fieldset class="pd-quem"><legend>Quem pediu</legend>'
              + '<label class="opcao"><input class="marcar" type="radio" name="ex-quem" checked><span>A própria cliente</span></label>'
              + '<label class="opcao"><input class="marcar" type="radio" name="ex-quem"><span>Alguém em nome dela<small>procurador ou responsável legal, com o documento que mostra isso</small></span></label></fieldset>'
              + f'<div><label class="opcao" style="margin:0 -8px"><input class="marcar" type="checkbox" name="ex-conf"{ch}{a_conf}><span>Conferi que o pedido veio da cliente ou de quem fala por ela'
              + f'<small>Pelo telefone ou e-mail que já estão na ficha, ou com documento.</small></span></label>{e_conf}</div>'
              + campo('ex-obs', 'Observação', '', 'c6', opc=True, ajuda='Não escreva dados pessoais: este texto fica guardado no registro da exclusão.')
              + '</fieldset>')
    a_nome = ''
    if erros:
        e_nome = f'<p class="erro-msg" id="ex-nome-er">{ico("alerta", "ico ico-s")}O nome não confere. Escreva exatamente: {NOME}.</p>'
        a_nome = ' aria-invalid="true" aria-describedby="ex-nome-aj ex-nome-er"'
    else:
        e_nome = ''
        a_nome = ' aria-describedby="ex-nome-aj"' + (' data-foco' if variante == 'confirmar' else '')
    v = f' value="{H(nome_v)}"' if nome_v else ''
    confirma = (f'<div class="pd-confirma"><p class="pd-irrev">{ico("alerta")}<span><b>Não dá para desfazer.</b> Nem a equipe do escritório nem o suporte T3jus conseguem recuperar os dados depois.</span></p>'
                f'<div class="campo"><label for="ex-nome">Para confirmar, escreva o nome da cliente</label>'
                f'<p class="pd-nome" id="ex-nome-aj">{NOME}</p>'
                f'<input class="entrada" id="ex-nome" name="ex-nome" autocomplete="off" spellcheck="false"{v}{a_nome}>{ok_nome}{e_nome}</div></div>')
    if variante == 'depois':
        esq = f'<div class="pd-col"><p class="pd-futuro">{ico("relogio")}Desenho do futuro: hoje ainda não há contratos nem processos no T3jus</p>{ARQ_ACONTECE}{ARQ_PORQUE}</div>'
        titulo = 'Arquivar Antônia Ferreira Prado a pedido (LGPD)?'
        desc = 'Antônia tem contrato e processo, então os dados não são excluídos: ela é arquivada, a ficha fica só leitura e o pedido fica registrado.'
        botao = 'Arquivar a pedido (LGPD)'
        confirma = ''
        pedido = pedido.replace('fica guardado no registro da exclusão', 'fica guardado no registro do pedido')
    else:
        esq = f'<div class="pd-col">{SOME}{FICA}{SEM_OBRIG}</div>'
        titulo = 'Excluir os dados de Antônia Ferreira Prado?'
        desc = 'A pedido da cliente, os dados pessoais dela são apagados agora e não voltam. Fica só o registro de que o pedido foi atendido.'
        botao = 'Excluir os dados para sempre'
    corpo = f'<div class="pd-j">{topo}{esq}<div class="pd-col">{pedido}{confirma}</div></div>'
    if variante == 'depois':
        pe = (f'<span class="pd-pe-nota">O arquivamento fica no histórico do escritório com o protocolo.</span>'
              f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button>'
              f'<button class="btn btn-pri" type="submit">{ico("pasta")}{botao}</button>')
    else:
        pe = (f'<span class="pd-pe-nota">A exclusão fica no histórico do escritório com o protocolo, sem dado pessoal.</span>'
              f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button>'
              f'<button class="btn pd-perigo-cheio" type="submit">{ico("x")}{botao}</button>')
    j = janela('janela-excluir', 'Pedido do titular · LGPD', titulo, desc, corpo, pe, alerta=True, abrir=abrir)
    return j.replace('<dialog class="janela"', '<dialog class="janela pd-janela"', 1)


FX = dict(atual='clientes', trilha='Clientes|Antônia Ferreira Prado', titulo='Antônia Ferreira Prado', aba='ficha')
T += tpl('excluir-ficha', ficha_lgpd(sit_dona()) + janelas() + j_excluir(), **FX)
T += tpl('excluir', ficha_lgpd(sit_dona()) + janelas() + j_excluir(True), **FX)
T += tpl('excluir-erros', ficha_lgpd(sit_dona()) + janelas() + j_excluir(True, 'erros'), **FX)
T += tpl('excluir-confirmar', ficha_lgpd(sit_dona()) + janelas() + j_excluir(True, 'confirmar'), **FX)
T += tpl('excluir-falhou', ficha_lgpd(sit_dona()) + janelas() + j_excluir(True, 'falhou'), **FX)
T += tpl('excluir-ficha-equipe', ficha_lgpd(sit_outro()) + janelas() + j_pedir(), quem='comercial', **FX)
T += tpl('excluir-pedir', ficha_lgpd(sit_outro()) + janelas() + j_pedir(True), quem='comercial', **FX)
T += tpl('excluir-pedido', ficha_lgpd(sit_outro(True), faixa()) + janelas()
         + toast('Pedido enviado a Marina Ribeiro.', 'Ela vê o pedido no Início. A faixa no alto da ficha mostra que ele está esperando.'), quem='comercial', **FX)
T += tpl('excluir-pedido-dona', ficha_lgpd(sit_dona(True), faixa(True)) + janelas() + j_excluir(False, 'pedido') + j_recusar(), **FX)
T += tpl('excluir-do-pedido', ficha_lgpd(sit_dona(True), faixa(True)) + janelas() + j_excluir(True, 'pedido') + j_recusar(), **FX)
T += tpl('excluir-recusar', ficha_lgpd(sit_dona(True), faixa(True)) + janelas() + j_excluir(False, 'pedido') + j_recusar(True), **FX)
T += tpl('excluir-recusado', ficha_lgpd(sit_outro(), faixa(recusado=True)) + janelas() + j_pedir(), quem='comercial', **FX)
T += tpl('excluir-depois', ficha_lgpd(sit_dona()) + janelas() + j_excluir(True, 'depois'), **FX)


# Depois da exclusão
def cab_excluido():
    d = (f'<section class="dir campo-ambar" aria-labelledby="t-reg"><p class="sobretitulo" id="t-reg">Excluído a pedido</p>'
         f'<p class="grande" style="font-size:30px">18/11/2026</p><p class="cl-oque"><b>Protocolo {PROTOCOLO}</b><br>feito por Marina Ribeiro, às 16h40</p></section>')
    return (f'<div class="ficha-cab"><div class="esq campo-vinho">{ico("escudo", "ico estatua")}'
            f'<a class="voltar" href="pendencias.html?estado=excluido-lista">{ico("esq", "ico ico-s")}Clientes</a>'
            f'<div class="ident"><div><p class="sobretitulo">Cliente · pessoa física</p><h1 class="pd-excl-h1">Cliente excluído</h1>'
            f'<p class="meta"><span class="selo selo-excl">{ico("escudo")}Excluído (LGPD)</span><span>a pedido do titular em 18/11/2026</span></p></div></div></div>{d}</div>')


def abas_excl(aba):
    a = (f'<a data-aba="ficha" href="pendencias.html?estado=excluido">Ficha</a>'
         f'<a data-aba="atendimentos" href="pendencias.html?estado=excluido-atendimentos">Atendimentos<span class="q">3</span></a>')
    return f'<nav class="abas" aria-label="Seções da ficha">{a}</nav>'


X = lambda t='Excluído': f'<dd class="pd-x">{t}</dd>'
DADOS_EXCL = (f'<section class="folha" aria-labelledby="t-dados"><div class="folha-cab"><div><h2 id="t-dados">Dados e qualificação</h2>'
              f'<p class="sub">Apagados a pedido da cliente. Não há o que editar.</p></div></div><dl class="dados-ficha">'
              f'<div class="inteira"><dt>Nome completo</dt>{X("Excluído a pedido (LGPD) em 18/11/2026")}</div>'
              f'<div><dt>CPF</dt>{X()}</div><div><dt>RG</dt>{X()}</div>'
              f'<div><dt>Nacionalidade, estado civil e profissão</dt>{X("Excluídos")}</div><div><dt>E-mail</dt>{X()}</div>'
              f'<div class="inteira"><dt>Endereço</dt>{X()}</div></dl></section>'
              f'<section class="folha" aria-labelledby="t-ct"><div class="folha-cab"><div><h2 id="t-ct">Contatos</h2><p class="sub">Os 2 contatos foram excluídos.</p></div></div></section>')
REG = (f'<section class="folha" aria-labelledby="t-regf"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-regf" style="font-size:20px">Registro da exclusão</h2></div></div>'
       f'<dl class="pd-registro"><div><dt>Protocolo</dt><dd class="num">{PROTOCOLO}</dd></div><div><dt>Pedido</dt><dd>18/11/2026, por e-mail</dd></div>'
       f'<div><dt>Quem pediu</dt><dd>A própria cliente</dd></div><div><dt>Pedido conferido</dt><dd>Sim</dd></div>'
       f'<div><dt>Feita por</dt><dd>Marina Ribeiro, sócia dona</dd></div><div><dt>Quando</dt><dd>18/11/2026, 16h40</dd></div></dl>'
       f'<div class="cl-folha-acao"><p>Este registro não tem dado pessoal e não se apaga: ele prova que o pedido foi atendido. Se a cliente perguntar, informe o protocolo.</p>'
       f'<button class="btn btn-sec" type="button">{ico("copiar")}Copiar o protocolo</button></div></section>')
ORIG_EXCL = (f'<section class="folha" aria-labelledby="t-org"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-org" style="font-size:20px">Origem</h2></div></div>'
             f'<dl class="cl-origem"><div><dt>Como chegou</dt><dd>Indicação de cliente</dd></div><div><dt>Quem indicou</dt><dd style="font-style:italic;font-weight:400;color:var(--texto-2)">Excluído</dd></div>'
             f'<div><dt>Cliente desde</dt><dd>27/10/2026</dd></div></dl></section>')
SIT_EXCL = (f'<section class="folha" aria-labelledby="t-sit"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-sit" style="font-size:20px">Situação</h2></div></div>'
            f'<div class="cl-sit"><p>Não dá para editar, reativar nem registrar atendimento em cliente excluído. Se a pessoa voltar a procurar o escritório, cadastre de novo, como cliente novo.</p></div></section>')
TOAST_EXCL = toast('Dados excluídos.', f'Protocolo {PROTOCOLO}. Informe à cliente que o pedido foi atendido. O registro ficou no histórico do escritório.')
FE = dict(atual='clientes', trilha='Clientes|Cliente excluído', titulo='Cliente excluído', aba='ficha')
T += tpl('excluido', f'<div class="cl">{cab_excluido()}{abas_excl("ficha")}{grade_ficha(DADOS_EXCL, REG + ORIG_EXCL + SIT_EXCL)}</div>{TOAST_EXCL}', **FE)


def ev_x(hora, quem, canal, resumo):
    return (f'<li><time>{hora}</time><span class="pto" aria-hidden="true"></span><div><p><b>{quem}</b> atendeu por {canal}<span class="selo selo-neutro">{canal}</span></p>'
            f'<span class="cl-resumo">“{resumo}”</span>'
            f'<span class="pd-x-resumo">Com quem se falou e o próximo contato excluídos a pedido do titular (LGPD).</span></div></li>')


HIST_X = (f'<section class="folha" aria-labelledby="t-hist" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-hist">Histórico de atendimento</h2>'
          f'<p class="sub">Ficam a data, o canal, quem atendeu e o resumo, como foi escrito. Com quem se falou foi excluído com os dados da cliente.</p></div></div>'
          + dia('06/11/2026', [ev_x('16h20', 'Diego Almeida', 'WhatsApp', 'Joana mandou a certidão de óbito e o comprovante de endereço. Falta a carta de indeferimento do INSS; ela vai procurar em casa.')])
          + dia('28/10/2026', [ev_x('10h05', 'Marina Ribeiro', 'presencial', 'Primeira reunião. Pensão por morte negada em setembro. Explicamos o recurso administrativo e a ação; ficaram de juntar os documentos.')])
          + dia('27/10/2026', [ev_x('09h40', 'Paula Nunes', 'telefone', 'Ligou por indicação de Rosa Almeida pedindo horário. Reunião marcada para 28/10, às 10h, com Marina.')])
          + '<div class="mais"><span>3 atendimentos, sem com quem se falou</span></div></section>')
FEA = dict(FE, aba='atendimentos')
T += tpl('excluido-atendimentos', f'<div class="cl">{cab_excluido()}{abas_excl("atendimentos")}{grade_ficha(HIST_X, REG)}</div>', **FEA)

# Lista: o excluído aparece em Inativos, sem nada pessoal
_lst = lista(INATIVOS)
_row = (f'<tr class="pd-excl"><td><div class="esc"><span class="av-p" aria-hidden="true">{ico("escudo", "ico ico-s")}</span><div><a href="pendencias.html?estado=excluido">Cliente excluído</a>'
        f'<small>Pessoa física · protocolo {PROTOCOLO}</small></div></div></td><td><span class="cl-sem">Excluído a pedido (LGPD) em 18/11/2026</span></td>'
        f'<td>Indicação de cliente</td><td><span class="cl-sem">—</span></td><td><span class="selo selo-excl">{ico("escudo")}Excluído</span></td></tr>')
_card = (f'<li class="cartao"><div class="c-topo"><span class="av-p" aria-hidden="true">{ico("escudo", "ico ico-s")}</span><div><a class="c-nome" href="pendencias.html?estado=excluido">Cliente excluído</a>'
         f'<small>Excluído a pedido (LGPD) em 18/11/2026</small></div>{ico("dir", "ico c-ir")}</div>'
         f'<div class="c-selos"><span class="selo selo-excl">{ico("escudo")}Excluído</span></div></li>')
_lst = _lst.replace('<tbody>', '<tbody>' + _row, 1).replace('<ul class="cartoes so-cel" aria-label="Clientes">', '<ul class="cartoes so-cel" aria-label="Clientes">' + _card, 1)
_lista_html = folha_lista(_lst, chip='inativos', cont='<b>3 clientes inativos</b>, 1 deles excluído a pedido (LGPD). Nada some em silêncio: o excluído fica só com o registro, sem dado pessoal.')
_lista_html = _lista_html.replace(f'Ativos ({len(ATIVOS)})', f'Ativos ({len(ATIVOS) - 1})').replace(f'Inativos ({len(INATIVOS)})', f'Inativos ({len(INATIVOS) + 1})').replace(f'Contato vencido ({len(VENCIDOS)})', f'Contato vencido ({len(VENCIDOS) - 1})')
T += tpl('excluido-lista', f'<div class="cl">{cab_lista()}{_lista_html}</div>', atual='clientes', trilha='Clientes', titulo='Clientes')

# ---------------------------------------------------------------- página
out = pagina('Início', 'Portal: o Início com os contatos do dia e o pedido de exclusão do titular (LGPD) na ficha do cliente.',
             '{"estado":"inicio","atual":"inicio"}', '', T)
out = out.replace('</style>', CSS_CL + '\n' + CSS_PD + '\n</style>', 1)
# Marca de hoje no trilho e na barra do celular
_sp = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">'
assert _sp in out
out = out.replace(_sp, _sp + LOGO_SYMBOL, 1)
out = re.sub(r'(<a class="marca-palavra"[^>]*>)T<b>3</b>jus(</a>)', r'\g<1>' + LOGO + r'\2', out)
out = out.replace('<b>T<i>3</i>jus</b><span>Portal</span>', LOGO + '<span>Portal</span>')
# Mais uma pessoa de exemplo: Diego, só com a área Comercial
out = out.replace("'sem-area':{", "comercial:{nome:'Diego Almeida',ini:'D',papel:'Área: Comercial',areas:['comercial'],dono:false},\n    'sem-area':{", 1)
# Os links do trilho apontam para os estados deste desenho e para os Clientes aprovados
out = out.replace('href="moldura.html?estado=sem-area" data-nav="inicio"', 'href="pendencias.html?estado=inicio" data-nav="inicio"')
out = out.replace('href="#" data-nav="clientes"', f'href="{CLIENTES_APROV}?estado=lista" data-nav="clientes"')
out = out.replace('href="moldura.html"', 'href="pendencias.html?estado=inicio"')
assert 'T<b>3</b>jus' not in out and 'T<i>3</i>jus' not in out
open(os.path.join(SAIDA, 'pendencias.html'), 'w', encoding='utf-8').write(out)
print('pendencias ok', T.count('<template data-est='), 'estados')
