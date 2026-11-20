# Portal · Clientes › Importar planilha (VA-05, a validar): clientes e contratos vindos de uma planilha
# Excel ou Google Planilhas, com ligação das colunas e prévia antes de salvar.
# Base sem mudança: comum.py (Portal v1), pecas.py (Comercial e Contratos), clientes.py (Clientes aprovado)
# e contratos.py (Contratos aprovado). Este arquivo carrega as definições do clientes.py e do contratos.py
# (sem gerar os HTML deles) e acrescenta as peças novas, com prefixo im-.
# Uso: python3 importacao.py <pasta-saida>
import sys, os, html

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
from pecas import *  # noqa: F401,F403  (traz também o comum.py)

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


CL = _carregar('clientes.py', "\nT = ''\n")
CT = _carregar('contratos.py', '# ---------------------------------------------------------------- estados')
cpf, cnpj = CL['cpf'], CL['cnpj']

U = 'importacao.html?estado='
CLI = '../portal-clientes/clientes.html?estado='
CTR = '../portal-comercial-contratos/contratos.html?estado='
FIN = '../portal-financeiro/financeiro.html?estado='
HOJE = '20/11/2026'
ARQ = 'clientes-e-contratos-2026.xlsx'
PRAZO = '27/11'

# ---------------------------------------------------------------- dados fictícios (dígitos válidos)
CPF_ROSA = cpf('529982247')
CPF_ANT = CL['CPF_ANT']
CPF_MARCIO_OK = cpf('734190285')
CPF_MARCIO_ERR = CPF_MARCIO_OK[:-1] + str((int(CPF_MARCIO_OK[-1]) + 4) % 10)
CNPJ_OFICINA = cnpj('283746510001')
CPF_VERA = cpf('615027394')
CNPJ_CLINICA = cnpj('391025870001')
CPF_LUCIA = cpf('408163952')
CPF_RENATO = cpf('170549386')
CPF_SILVIA = cpf('862301547')
CPF_JOAQUIM = cpf('357914620')

# ---------------------------------------------------------------- CSS novo (prefixo im-)
CSS_IM = r"""
/* ==========================================================================
   Portal · Clientes › Importar planilha (VA-05). Prefixo im-. Só pares do contraste.md.
   Os passos repetem o desenho aprovado de Petições (pe-passos); a tabela que vira
   cartões e os números do alto são os de Comercial e Contratos (hn-).
   ========================================================================== */
.im{display:flex;flex-direction:column;gap:24px;min-width:0}
.im-cab-acoes{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:6px}
.im-cab-acoes .btn-sec{background:var(--papel)}

/* Passos */
.im-passos{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.im-passos li{position:relative;display:flex;align-items:center;gap:10px;min-height:56px;padding:8px 12px;border-radius:var(--raio);background:var(--papel);border:1px solid var(--borda-folha);font-size:13px;color:var(--texto-2);min-width:0}
.im-passos li>a,.im-passos li>span.im-pi{display:flex;align-items:center;gap:10px;min-width:0;color:inherit;text-decoration:none;min-height:44px;flex:1}
.im-passos li>a:hover b{text-decoration:underline}
.im-passos .im-n{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-family:var(--serifa);font-size:16px;font-weight:600;background:var(--sal-2);color:var(--vinho-2)}
.im-passos b{display:block;font-weight:500;color:var(--texto);line-height:1.25}
.im-passos small{display:block;font-size:12px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.im-passos li.feito .im-n{background:var(--vinho);color:var(--papel)}
.im-passos li[aria-current="step"]{border-color:var(--vinho);box-shadow:inset 0 -3px 0 var(--vinho);background:#FCF8F5}
.im-passos li[aria-current="step"] .im-n{background:var(--ambar);color:var(--vinho-escuro)}
.im-passos li[aria-current="step"] b{color:var(--vinho)}

/* Passo 1: o que importar, modelo e arquivo */
.im-bloco{padding:0 24px 20px;display:grid;gap:14px;min-width:0}
.im-bloco+.im-bloco{border-top:1px solid var(--divisor);padding-top:18px}
.im-bloco h3{font-size:19px;font-weight:600;color:var(--vinho);display:flex;align-items:center;gap:10px}
.im-bloco h3 .disco{--d:30px;--f:16px;--c:var(--vinho);color:var(--papel)}
.im-bloco>p{font-size:13px;color:var(--texto-2);line-height:1.5}
.im-opcoes{border:0;margin:0;padding:0;min-width:0}
.im-opcoes legend{padding:0;font-weight:500;margin-bottom:8px}
.im-ops{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.im-ops .opcao{border:1px solid var(--borda-folha);border-radius:var(--raio);padding:14px;margin:0;background:var(--papel);align-items:flex-start}
.im-ops .opcao:has(input:checked){border-color:var(--vinho);background:var(--ambar-3)}
.im-ops .opcao small{line-height:1.45}
.im-modelo{display:grid;grid-template-columns:44px minmax(0,1fr);gap:14px;align-items:center;padding:14px 16px;border:1px solid var(--borda-folha);border-radius:var(--raio);background:#FCF8F5}
.im-modelo .im-ci,.im-arq .im-ci{width:44px;height:44px;border-radius:10px;display:grid;place-items:center;background:var(--ambar-3);color:var(--vinho)}
.im-modelo strong,.im-arq strong{display:block;font-weight:500;line-height:1.35;overflow-wrap:anywhere}
.im-modelo small,.im-arq small{display:block;font-size:12px;color:var(--texto-2);line-height:1.45}
.im-modelo .im-mac{grid-column:2;display:flex;gap:8px;flex-wrap:wrap}
.im-arq{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:14px;align-items:center;padding:12px 16px;border:1px solid var(--borda-folha);border-radius:var(--raio);background:var(--papel)}
.im-arq.im-arq-erro{border-color:var(--vinho-3);box-shadow:inset 3px 0 0 var(--vinho-3)}
.im-arq.im-arq-erro .im-ci{background:var(--vinho-3);color:var(--papel)}
.im-lim{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.im-lim li{display:flex;gap:8px;align-items:flex-start;font-size:13px;line-height:1.45;padding:10px 12px;border-radius:var(--raio);background:var(--sal-2)}
.im-lim .ico{width:18px;height:18px;color:var(--vinho);flex:none;margin-top:1px}
.im-lim b{font-weight:600}
.im-lgpd{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:13px;line-height:1.5}
.im-lgpd .ico{color:var(--vinho);margin-top:1px;flex:none}
.im-lgpd b{font-weight:600}
.im-cadeado{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:var(--raio);border:1px dashed var(--vinho-4);font-size:13px;line-height:1.5;color:var(--texto-2)}
.im-cadeado .ico{color:var(--vinho-4);flex:none;margin-top:1px}
.im-cadeado b{color:var(--texto);font-weight:500}
.im-pe{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap;padding:16px 24px 20px;border-top:1px solid var(--divisor)}
.im-pe .im-pe-t{margin-right:auto;font-size:12px;color:var(--texto-2);flex:1 1 260px;min-width:0;line-height:1.5}
.im-msgs{list-style:none;margin:0;padding:0 24px 18px;display:grid;gap:0}
.im-resumo a{display:inline-flex;align-items:center;min-height:44px;color:var(--vinho);font-weight:500}
.im-msgs li{padding:12px 0;border-top:1px solid var(--divisor);font-size:13px;line-height:1.5}
.im-msgs li:first-child{border-top:0;padding-top:0}
.im-msgs b{display:block;font-weight:500;color:var(--vinho)}
.im-msgs code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;color:var(--texto-2)}

/* Passo 2: ligar as colunas */
.im-aba{display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap;padding:0 24px 16px}
.im-aba .campo{min-width:260px}
.im-aba p{font-size:13px;color:var(--texto-2);padding-bottom:12px}
.im-grupo-t{display:flex;align-items:center;gap:10px;font-size:12px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--vinho-2);padding:14px 24px 8px;border-top:1px solid var(--divisor)}
.im-grupo-t .ico{color:var(--vinho-4)}
.im-map td{vertical-align:middle}
.im-col{display:flex;align-items:center;gap:10px}
.im-letra{flex:none;width:30px;height:30px;border-radius:8px;display:grid;place-items:center;background:var(--sal-2);color:var(--vinho);font-weight:600;font-size:13px}
.im-col b{font-weight:500}
.im-ex{font-size:13px;color:var(--texto);overflow-wrap:break-word;background:var(--sal-2);border-radius:6px;padding:2px 8px;display:inline-block}
.im-map select{min-height:44px}
.im-ex-cel{display:none}
.im-map .campo{margin:0}
.im-map tr.im-ign td{color:var(--texto-2)}
.im-map tr.im-ign .im-letra{background:var(--sal);color:var(--texto-2)}
.im-map tr.im-err td{background:#FCF6F2}
.im-map tr.im-err td:first-child{box-shadow:inset 3px 0 0 var(--vinho-3)}
.im-map .erro-msg,.im-map .ajuda{margin-top:4px}
.im-sit{display:grid;gap:4px;justify-items:start}
.im-sit small{font-size:12px;color:var(--texto-2);line-height:1.4}
.im-pares{list-style:none;margin:0;padding:0 24px 16px;display:grid;gap:0}
.im-pares li{display:grid;grid-template-columns:minmax(0,1fr) 28px minmax(0,1fr);gap:12px;align-items:center;padding:10px 0;border-top:1px solid var(--divisor)}
.im-pares li:first-child{border-top:0}
.im-pares .im-de b{font-weight:500}
.im-pares .im-de small{display:block;font-size:12px;color:var(--texto-2)}
.im-pares .im-seta{color:var(--vinho-4)}
.im-pares .campo{margin:0}
.im-pares .ajuda{font-size:12px}
.im-ok{list-style:none;margin:0;padding:0 24px 16px}
.im-ok li{display:grid;grid-template-columns:22px minmax(0,1fr);gap:10px;padding:8px 0;border-top:1px solid var(--divisor);font-size:13px;line-height:1.45}
.im-ok li:first-child{border-top:0}
.im-ok .ico{width:18px;height:18px;color:var(--vinho);margin-top:1px}
.im-ok li small{display:block;color:var(--texto-2);font-size:12px}
.im-ok li.im-falta .ico{color:var(--vinho-3)}
.im-ok li.im-falta b{color:var(--vinho-3);font-weight:600}
.im-ok-t{font-size:12px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--vinho-2);padding:4px 24px 4px}

/* Passo 3: a prévia */
.im-nada{margin:0}
.im-ferr{display:flex;align-items:center;gap:12px;padding:16px 24px;flex-wrap:wrap}
.im-ferr .campo-busca{position:relative;flex:1 1 260px;max-width:360px}
.im-ferr .campo-busca .ico{position:absolute;left:14px;top:12px;color:var(--vinho-4);pointer-events:none}
.im-ferr .campo-busca input{padding-left:44px}
.im-ferr .chips{margin-left:auto;flex-wrap:wrap}
.im-cont{padding:0 24px 12px;font-size:13px;color:var(--texto-2)}
.im-cont b{color:var(--texto);font-weight:500}
.im-massa{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 24px 14px;padding:12px 14px;border-radius:var(--raio);background:var(--ambar-3);font-size:13px;line-height:1.5}
.im-massa .ico{color:var(--vinho);flex:none}
.im-massa span{flex:1 1 300px}
.im-cab-l,.im-linhas>li{display:grid;grid-template-columns:44px minmax(0,1fr) minmax(0,1.2fr) minmax(0,1.3fr);gap:18px;padding:14px 24px;align-items:start}
.im-cab-l{background:var(--sal-2);font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--texto-2);padding-top:10px;padding-bottom:10px}
.im-linhas{list-style:none;margin:0;padding:0}
.im-linhas>li{border-top:1px solid var(--divisor)}
.im-linhas>li.im-l-erro{background:#FCF6F2;box-shadow:inset 3px 0 0 var(--vinho-3)}
.im-linhas>li.im-l-aviso{background:#FDFAF7;box-shadow:inset 3px 0 0 var(--ambar)}
.im-linhas>li.im-l-pulada{color:var(--texto-2)}
.im-r{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.im-c{min-width:0;font-size:13px;line-height:1.45}
.im-c small{display:block;font-size:12px;color:var(--texto-2);overflow-wrap:anywhere}
.im-nl{font-family:var(--serifa);font-size:20px;font-weight:500;color:var(--vinho);line-height:1.2}
.im-nome{display:block;font-family:var(--serifa);font-size:17px;font-weight:500;color:var(--vinho);line-height:1.25}
.im-c .im-ctr{display:block;font-weight:500;color:var(--texto)}
.im-c .im-gera{display:flex;gap:6px;align-items:flex-start;margin-top:6px;padding-top:6px;border-top:1px dashed var(--divisor)}
.im-c .im-gera .ico{color:var(--vinho-4);flex:none;margin-top:2px}
.im-c .im-gera b{font-weight:500}
.im-c .im-gera small{display:inline;margin-left:4px}
.im-prob{display:grid;gap:6px;justify-items:start}
.im-prob .selo{white-space:normal;height:auto;min-height:24px;padding-top:3px;padding-bottom:3px;line-height:1.3;max-width:100%}
.im-prob p{font-size:13px;line-height:1.45}
.im-prob p a{color:var(--vinho);font-weight:500}
.im-acoes-l{display:flex;gap:8px;flex-wrap:wrap}
.im-errado{background:#F7DDE6;color:var(--vinho-escuro);border-radius:4px;padding:0 3px;font-weight:600}
.im-aberto{grid-column:1/-1;margin-top:2px;padding:16px;border:1px solid var(--borda-folha);border-radius:var(--raio-g);background:var(--papel);display:grid;gap:14px;min-width:0}
.im-aberto h4{font-family:var(--serifa);font-size:19px;font-weight:600;color:var(--vinho);line-height:1.25}
.im-aberto h4 small{display:block;font-family:var(--sans);font-size:12px;font-weight:400;color:var(--texto-2)}
.im-campos{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:14px 18px}
.im-campos .c6{grid-column:span 6}.im-campos .c4{grid-column:span 4}.im-campos .c3{grid-column:span 3}.im-campos .c2{grid-column:span 2}
.im-aberto-pe{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.im-aberto-pe .im-pe-t{margin-right:auto;font-size:12px;color:var(--texto-2)}
.im-aberto .comparar td,.im-aberto .comparar th{overflow-wrap:break-word}
.im-igual{display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--vinho-2);font-weight:500}
.im-igual .ico{width:14px;height:14px}
.im-entra{background:var(--ambar-3);border-radius:4px;padding:0 4px}
.im-decide{border:0;margin:0;padding:0;min-width:0;display:grid;gap:8px}
.im-decide legend{padding:0;font-weight:500;margin-bottom:6px}
.im-decide .opcao{margin:0;padding:12px 14px;border:1px solid var(--borda-folha);border-radius:var(--raio);background:var(--papel);align-items:flex-start}
.im-decide .opcao:has(input:checked){border-color:var(--vinho);background:var(--ambar-3)}
.im-decide .opcao small{line-height:1.45}
.im-gera-l{list-style:none;margin:0;padding:0;border:1px solid var(--borda-folha);border-radius:var(--raio);overflow:hidden}
.im-gera-l li{display:grid;grid-template-columns:110px minmax(0,1fr) auto auto;gap:12px;align-items:center;padding:10px 14px;border-top:1px solid var(--divisor);font-size:13px}
.im-gera-l li:first-child{border-top:0}
.im-gera-l time{color:var(--texto-2)}
.im-gera-l b{font-weight:500;white-space:nowrap}
.im-gera-l li.im-g-pago{background:var(--sal-2);color:var(--texto-2)}
.im-gera-l li.im-g-tot{background:#FCF8F5;font-weight:500}
.im-dl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px 18px;margin:0}
.im-dl div{min-width:0}
.im-dl dt{font-size:12px;color:var(--texto-2)}
.im-dl dd{margin:0;font-size:13px;font-weight:500;overflow-wrap:anywhere}

/* Resumo lateral da prévia */
.im-res .hn-res-bloco ul{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:4px;font-size:13px}
.im-res .hn-res-bloco li b{font-weight:600}
.im-res .im-res-acao{padding:4px 24px 22px;display:grid;gap:10px;border-top:1px solid var(--divisor);padding-top:16px}
.im-res .im-res-acao p{font-size:12px;color:var(--texto-2);line-height:1.5}

/* Importando e resultado */
.im-prog{padding:0 24px 22px;display:grid;gap:14px}
.im-prog .pt-gerando p{font-size:14px}
.im-barra{height:8px;border-radius:4px;background:var(--sal);overflow:hidden}
.im-barra span{display:block;height:100%;border-radius:4px;background:var(--vinho)}
.im-fim{align-items:center}
.im-fim .im-fim-num{display:flex;gap:28px;flex-wrap:wrap;margin-top:16px}
.im-fim .im-fim-num div{display:flex;align-items:center;gap:12px}
.im-fim .im-fim-num .disco{--d:64px;--f:26px}
.im-fim .im-fim-num b{display:block;font-weight:600;color:var(--tinta);font-size:14px}
.im-fim .im-fim-num small{display:block;font-size:13px;color:var(--tinta)}
.im-entrou{list-style:none;margin:0;padding:0 24px 12px}
.im-entrou li{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:14px;align-items:center;padding:12px 0;border-top:1px solid var(--divisor)}
.im-entrou li:first-child{border-top:0}
.im-entrou .im-ci{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--ambar-3);color:var(--vinho)}
.im-entrou strong{display:block;font-family:var(--serifa);font-size:19px;font-weight:500;color:var(--vinho);line-height:1.2}
.im-entrou small{display:block;font-size:12px;color:var(--texto-2);line-height:1.45}
.im-fora{list-style:none;margin:0;padding:0 24px 8px}
.im-fora li{display:grid;grid-template-columns:56px minmax(0,1fr);gap:12px;padding:10px 0;border-top:1px solid var(--divisor);font-size:13px;line-height:1.45}
.im-fora li:first-child{border-top:0}
.im-fora b{font-weight:500}
.im-fora small{display:block;color:var(--texto-2);font-size:12px}
.im-hist td{vertical-align:middle}
.im-hist tr.im-desfeita td{color:var(--texto-2)}
.im-desf{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:8px}
.im-desf li{display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.5}
.im-desf .ico{width:18px;height:18px;color:var(--vinho);flex:none;margin-top:2px}
.im-desf b{font-weight:600}

/* Janela da planilha-modelo */
.im-mod{width:100%;border-collapse:collapse;font-size:13px;table-layout:fixed}
.im-mod th,.im-mod td{text-align:left;padding:8px 10px;border-top:1px solid var(--borda-folha);vertical-align:top;overflow-wrap:break-word}
.im-mod thead th{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--texto-2);border-top:0}
.im-mod tbody th{font-weight:500}
.im-mod .im-mod-g th{background:var(--sal-2);color:var(--vinho);font-family:var(--serifa);font-size:16px;font-weight:600}
.im-regras{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.im-regras li{display:flex;gap:10px;font-size:13px;line-height:1.5}
.im-regras .ico{width:18px;height:18px;color:var(--vinho);flex:none;margin-top:2px}

@media (max-width:760px){
  .im{gap:16px}
  .im-cab-acoes{flex-direction:column;margin-bottom:0}
  .im-cab-acoes .btn{width:100%}
  .im-passos{gap:4px}
  .im-passos li{flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:6px 2px;min-height:64px;text-align:center}
  .im-passos li>a,.im-passos li>span.im-pi{flex-direction:column;gap:2px;min-height:52px;justify-content:center}
  .im-passos small{display:none}
  .im-passos b{font-size:12px}
  .im-bloco{padding:0 16px 16px}
  .im-ops{grid-template-columns:1fr}
  .im-modelo,.im-arq{grid-template-columns:44px minmax(0,1fr)}
  .im-modelo .im-mac,.im-arq>.btn,.im-arq>.im-mac{grid-column:1/-1;justify-content:stretch}
  .im-modelo .im-mac .btn,.im-arq>.btn{flex:1 1 100%;width:100%}
  .im-lim{grid-template-columns:1fr}
  .im-pe{padding:14px 16px 16px}
  .im-pe .btn{flex:1 1 100%}
  .im-pe .im-pe-t{flex-basis:100%}
  .im-msgs{padding:0 16px 14px}
  .im-aba{padding:0 16px 14px}
  .im-aba .campo{min-width:0;flex:1 1 100%}
  .im-grupo-t{padding:14px 16px 8px}
  .im-map td .campo{width:100%}
  .im-ex-cel{display:block;font-size:12px;color:var(--texto-2);overflow-wrap:break-word;font-weight:400}
  .im-map td[data-r="Primeiro valor"]{display:none!important}
  .im-map td:first-child{padding-bottom:6px!important}
  .im-map td:not(:first-child){display:block!important;text-align:left!important}
  .im-map td:not(:first-child)::before{display:block;max-width:none!important;margin-bottom:4px}
  .im-map .im-sit{justify-items:start}
  .im-hist td:not(:first-child){display:block!important;text-align:left!important}
  .im-hist td:not(:first-child)::before{display:block;max-width:none!important;margin-bottom:4px}
  .im-hist .im-acoes-l .btn{flex:1 1 100%}
  .im-map tr.im-err{border-color:var(--vinho-3);box-shadow:inset 3px 0 0 var(--vinho-3)}
  .im-map tr.im-err td{background:transparent!important;box-shadow:none!important}
  .im-map tbody tr td:has(.im-sit-nome),.im-map tbody tr td[data-r="Primeiro valor"]{display:none!important}
  .im-map td:has(.im-sit-nome){display:none!important}
  .im-map tr{gap:6px!important;padding:12px 14px!important}
  .im-map tbody{gap:8px!important}
  .im-pares{padding:0 16px 14px}
  .im-pares li{grid-template-columns:1fr}
  .im-pares .im-seta{display:none}
  .im-ok{padding:0 16px 14px}
  .im-ok-t{padding:4px 16px}
  .im-ferr{padding:16px;gap:10px}
  .im-ferr .campo-busca{flex-basis:100%;max-width:none}
  .im-ferr .chips{margin-left:0}
  .im-cont{padding:0 16px 10px}
  .im-massa{margin:0 16px 12px}
  .im-massa .btn{width:100%}
  .im-cab-l{display:none}
  .im-linhas{padding:0 16px 16px;display:grid;gap:12px}
  .im-linhas>li{grid-template-columns:minmax(0,1fr);gap:10px;padding:14px;border:1px solid var(--borda-folha);border-radius:var(--raio-g);background:var(--papel)}
  .im-linhas>li.im-l-erro{border-color:var(--vinho-3)}
  .im-linhas>li.im-l-aviso{border-color:var(--ambar)}
  .im-r{position:static;width:auto;height:auto;overflow:visible;clip:auto;display:block;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--texto-2);margin-bottom:2px}
  .im-c-n{display:flex;align-items:baseline;gap:8px;padding-bottom:8px;border-bottom:1px solid var(--divisor)}
  .im-c-n .im-r{display:inline;margin:0}
  .im-acoes-l .btn{flex:1 1 auto}
  .im-aberto{padding:14px 12px}
  .im-campos{grid-template-columns:1fr}
  .im-campos .c6,.im-campos .c4,.im-campos .c3,.im-campos .c2{grid-column:1/-1}
  .im-aberto-pe .btn{flex:1 1 100%}
  .im-gera-l li{grid-template-columns:minmax(0,1fr) auto;gap:4px 10px}
  .im-gera-l li>span:nth-child(2){grid-column:1/-1;grid-row:2}
  .im-dl{grid-template-columns:1fr 1fr}
  .im-res .im-res-acao{padding:14px 16px 18px}
  .im-prog{padding:0 16px 18px}
  .im-fim .im-fim-num{gap:16px}
  .im-fim .im-fim-num .disco{--d:52px;--f:22px}
  .im-entrou{padding:0 16px 10px}
  .im-entrou li{grid-template-columns:44px minmax(0,1fr)}
  .im-entrou li>.btn{grid-column:1/-1;width:100%}
  .im-fora{padding:0 16px 8px}
  .im-cmp,.im-cmp tbody,.im-cmp tr,.im-cmp th,.im-cmp td{display:block;width:auto!important}
  .im-cmp colgroup{display:none}
  .im-cmp thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
  .im-cmp tbody tr{padding:10px 0;border-top:1px solid var(--borda-folha)}
  .im-cmp tbody tr:first-child{border-top:0;padding-top:0}
  .im-cmp tbody th,.im-cmp tbody td{border:0!important;padding:2px 0!important}
  .im-cmp tbody th{font-weight:600;color:var(--vinho);font-size:13px}
  .im-cmp td::before{content:attr(data-r) ": ";color:var(--texto-2)}
  .im-cmp td{overflow-wrap:anywhere}
  .im-mod,.im-mod tbody,.im-mod tr,.im-mod th,.im-mod td{display:block;width:auto!important}
  .im-mod colgroup{display:none}
  .im-mod thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
  .im-mod tbody tr{padding:8px 0;border-top:1px solid var(--borda-folha)}
  .im-mod tbody th,.im-mod tbody td{border:0!important;padding:1px 0!important}
  .im-mod tbody td::before{content:attr(data-r) ": ";color:var(--texto-2)}
  .im-mod .im-mod-g th{padding:6px 8px!important;border-radius:6px}
}
"""

# ---------------------------------------------------------------- peças
PASSOS = [('O arquivo', 'enviar'), ('As colunas', 'colunas'), ('A prévia', 'previa'), ('Importar', 'confirmar')]


def passos(atual, escolhas=('', '', '', '')):
    li = ''
    for i, (nome, est) in enumerate(PASSOS, 1):
        sub = f'<small>{escolhas[i - 1]}</small>' if escolhas[i - 1] else ''
        n = f'<span class="im-n" aria-hidden="true">{i}</span>'
        txt = f'<span style="min-width:0"><b>{nome}</b>{sub}</span>'
        if i < atual:
            li += f'<li class="feito"><a href="{U}{est}">{n}{txt}<span class="sr"> (feito; voltar a este passo)</span></a></li>'
        elif i == atual:
            li += f'<li aria-current="step"><span class="im-pi">{n}{txt}<span class="sr"> (passo atual)</span></span></li>'
        else:
            li += f'<li><span class="im-pi">{n}{txt}</span></li>'
    return f'<ol class="im-passos" aria-label="Passo {min(atual, 4)} de 4">{li}</ol>'


ESC_FEITAS = (ARQ, '18 de 20 colunas ligadas', '148 linhas conferidas', '')


def cab_fluxo(titulo='Importar planilha', lede=''):
    l = f'<p class="lede">{lede}</p>' if lede else ''
    return f'<div class="pt-cab"><div><p class="sobretitulo">Clientes</p><h1>{titulo}</h1><span class="fio" aria-hidden="true"></span>{l}</div></div>'


def grade(principal, lateral, rot='Como funciona a importação'):
    return f'<div class="hn-grade"><div class="hn-col">{principal}</div><aside class="hn-col" aria-label="{rot}">{lateral}</aside></div>'


def folha(id_, titulo, sub, corpo, acoes='', estilo=''):
    s = f'<p class="sub">{sub}</p>' if sub else ''
    a = f'<div class="acoes">{acoes}</div>' if acoes else ''
    return (f'<section class="folha" aria-labelledby="{id_}"{estilo}><div class="folha-cab"><div><h2 id="{id_}">{titulo}</h2>{s}</div>{a}</div>{corpo}</section>')


def lgpd(texto):
    return f'<p class="im-lgpd">{ico("escudo")}<span>{texto}</span></p>'


LGPD_ARQ = ('<b>O arquivo não fica guardado.</b> Ele é lido no servidor, no Brasil, e apagado quando a importação termina ou é cancelada. '
            'Se você sair no meio, ele é apagado em 24 horas. Fica registrado só o nome do arquivo, quem enviou e quando.')


def explica_fluxo():
    return ('<section class="explica campo-ambar" aria-labelledby="t-ex"><p class="sobretitulo">Como funciona</p><h2 id="t-ex">Nada entra até você conferir.</h2><ul>'
            f'<li>{ico("enviar")}<span><b>1. O arquivo.</b> Envie a planilha do jeito que ela está, ou a planilha-modelo preenchida.</span></li>'
            f'<li>{ico("link")}<span><b>2. As colunas.</b> O T3jus liga cada coluna a um campo pelo nome dela. Você confere e ajusta.</span></li>'
            f'<li>{ico("olho")}<span><b>3. A prévia.</b> Cada linha aparece pronta, com aviso ou com erro. Corrija ali mesmo ou pule a linha.</span></li>'
            f'<li>{ico("check")}<span><b>4. Importar.</b> Entra tudo de uma vez. Dá para desfazer em até 7 dias, sem apagar nada em silêncio.</span></li>'
            '</ul></section>')


def quem_importa(contratos=True):
    c = ('<li>' + ico('pena') + '<span><b>Contratos:</b> quem tem a área Contratos.</span></li>') if contratos else ''
    return folha('t-quem', 'Quem pode importar', '',
                 f'<ul class="im-regras" style="padding:0 24px 20px">'
                 f'<li>{ico("pessoas")}<span><b>Clientes:</b> todos da equipe, como no cadastro de um por um.</span></li>{c}'
                 f'<li>{ico("historico")}<span><b>Desfazer:</b> quem importou ou a sócia dona, em até 7 dias.</span></li></ul>')


def soltar(regra_id='im-regra'):
    return (f'<div class="soltar">{ico("enviar")}<p><strong class="so-pc-t">Arraste a planilha para cá ou</strong></p>'
            f'<input class="sr" type="file" id="im-arq" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" aria-describedby="{regra_id}">'
            f'<label class="btn btn-sec" for="im-arq">{ico("mais")}Escolher a planilha</label>'
            f'<p class="ajuda" id="{regra_id}">Arquivo .xlsx ou .csv, até 5 MB e 2.000 linhas.</p></div>')


LIMITES = ('<ul class="im-lim" aria-label="Antes de enviar">'
           f'<li>{ico("doc")}<span><b>.xlsx ou .csv.</b> No Google Planilhas: Arquivo › Fazer download › Microsoft Excel.</span></li>'
           f'<li>{ico("filtro")}<span><b>Até 5 MB e 2.000 linhas.</b> Se passar, divida em duas planilhas e importe uma depois da outra.</span></li>'
           f'<li>{ico("funcoes")}<span><b>A primeira linha traz os nomes das colunas.</b> Se houver mais de uma aba, você escolhe no passo 2.</span></li></ul>')


def bloco_o_que(contratos=True, sel='ambos'):
    if not contratos:
        return (f'<div class="im-bloco"><h3><span class="disco" aria-hidden="true"><span>1</span></span>O que importar</h3>'
                f'<p>Você vai importar <b style="color:var(--texto);font-weight:500">clientes</b>: nome, contatos e a qualificação para procuração e contrato. Uma linha por cliente.</p>'
                f'<p class="im-cadeado">{ico("cadeado")}<span><b>Contratos ficam na área Contratos, que não está liberada para você.</b> Se a planilha tiver colunas de contrato ou de origem do cliente (área Comercial), elas ficam de fora, e a prévia mostra isso. Quem libera é Marina Ribeiro, a sócia dona.</span></p></div>')
    o = (opcao('im-oque', 'Só clientes', 'Nome, contatos e qualificação. Uma linha por cliente.', sel == 'cli', 'radio', 'cli')
         + opcao('im-oque', 'Clientes e contratos', 'Uma linha por contrato; o cliente se repete pelo CPF ou CNPJ. As parcelas vão para o Financeiro.', sel == 'ambos', 'radio', 'ambos'))
    return (f'<div class="im-bloco"><h3><span class="disco" aria-hidden="true"><span>1</span></span>O que importar</h3>'
            f'<fieldset class="im-opcoes"><legend class="sr">O que importar</legend><div class="im-ops">{o}</div></fieldset></div>')


def bloco_modelo(contratos=True):
    q = 'clientes e contratos' if contratos else 'clientes'
    return (f'<div class="im-bloco"><h3><span class="disco" aria-hidden="true"><span>2</span></span>A planilha</h3>'
            f'<p>Não precisa mudar a sua planilha: no próximo passo você liga as colunas dela aos campos do T3jus. Se for começar do zero, use a planilha-modelo.</p>'
            f'<div class="im-modelo"><span class="im-ci">{ico("doc")}</span><span><strong>Planilha-modelo de {q}</strong><small>Com os nomes das colunas, uma linha de exemplo e as listas (estado civil, UF, tipo de honorário). Abre no Excel e no Google Planilhas.</small></span>'
            f'<span class="im-mac"><a class="btn btn-fantasma" href="{U}modelo">{ico("olho")}Ver as colunas</a><a class="btn btn-sec" href="#">{ico("baixar")}Baixar (.xlsx)</a></span></div></div>')


def pe_passo1(rot='Enviar e continuar'):
    return (f'<div class="im-pe"><span class="im-pe-t">Ao escolher o arquivo, a leitura começa sozinha. Nada entra no cadastro neste passo.</span>'
            f'<a class="btn btn-fantasma" href="{CLI}lista">Cancelar</a><button class="btn btn-pri" type="button">{ico("dir")}{rot}</button></div>')


def pagina_enviar(contratos=True, arquivo_html='', abrir_modelo=False):
    arq = arquivo_html or (soltar() + LIMITES)
    principal = folha('t-env', 'Enviar a planilha', 'Clientes e contratos que já estão numa planilha entram de uma vez, sem redigitar.',
                      bloco_o_que(contratos) + bloco_modelo(contratos)
                      + f'<div class="im-bloco"><h3><span class="disco" aria-hidden="true"><span>3</span></span>O arquivo</h3>{arq}{lgpd(LGPD_ARQ)}</div>'
                      + pe_passo1())
    ultimas = folha('t-ult', 'Importações anteriores', '',
                    f'<ul class="im-ok"><li>{ico("historico")}<span><b>clientes-antigos.csv</b><small>12/11 · Paula Nunes · 23 clientes</small></span></li>'
                    f'<li>{ico("historico")}<span><b>planilha-teste.xlsx</b><small>11/11 · Paula Nunes · desfeita no mesmo dia</small></span></li></ul>'
                    f'<p class="hn-pe" style="padding-top:12px">{ico("dir")}<a href="{U}importacoes">Ver todas as importações</a></p>')
    return (f'<div class="im">{cab_fluxo(lede="Clientes e contratos de uma planilha do Excel ou do Google Planilhas, conferidos numa prévia antes de salvar.")}'
            f'{passos(1)}{grade(principal, explica_fluxo() + quem_importa(contratos) + ultimas)}</div>')


# ---------------------------------------------------------------- janela: a planilha-modelo
MOD_CLI = [
    ('Nome ou razão social', 'Sim', 'Rosa Almeida'),
    ('CPF ou CNPJ', 'Não', CPF_ROSA),
    ('Telefone ou WhatsApp', 'Telefone ou e-mail', '(11) 98451-2290'),
    ('E-mail', 'Telefone ou e-mail', 'rosa.almeida@exemplo.com.br'),
    ('Com quem falar e papel (empresa)', 'Não', 'Rogério Dias · sócio'),
    ('Nacionalidade, estado civil, profissão', 'Não', 'Brasileira · Casado(a) · Professora'),
    ('RG e órgão emissor', 'Não', '32.418.776-5 · SSP/SP'),
    ('CEP, endereço, bairro, cidade, UF', 'Não', '05425-070 · Rua Cardeal Arcoverde, 1200, ap. 54 · Pinheiros · São Paulo · SP'),
    ('Origem e quem indicou', 'Não (área Comercial)', 'Indicação de cliente · Irene Castro'),
]
MOD_CTR = [
    ('Objeto do contrato', 'Sim, se houver contrato', 'Aposentadoria por idade'),
    ('Tipo de honorário', 'Sim, se houver contrato', 'Fixo, Parcelado, Mensal ou Êxito'),
    ('Valor', 'Sim, se houver contrato', 'R$ 4.800,00 (total, mensal) ou 30% (êxito)'),
    ('Número de parcelas e 1º vencimento', 'No parcelado', '6 · 10/09/2026'),
    ('Parcelas já pagas', 'Não', '2'),
    ('Data da assinatura', 'Não', '02/09/2026 (sem ela, entra em elaboração)'),
    ('Responsável pelo contrato', 'Sim, ou um padrão no passo 2', 'Marina Ribeiro'),
]


def j_modelo():
    def g(t, itens):
        return f'<tr class="im-mod-g"><th colspan="3" scope="colgroup">{t}</th></tr>' + ''.join(
            f'<tr><th scope="row">{H(a)}</th><td data-r="Obrigatória">{H(b)}</td><td data-r="Exemplo">{H(c)}</td></tr>' for a, b, c in itens)
    corpo = (f'<table class="im-mod"><caption class="sr">Colunas da planilha-modelo</caption><colgroup><col style="width:36%"><col style="width:24%"><col style="width:40%"></colgroup>'
             f'<thead><tr><th scope="col">Coluna</th><th scope="col">Obrigatória</th><th scope="col">Exemplo</th></tr></thead>'
             f'<tbody>{g("Cliente", MOD_CLI)}{g("Contrato (deixe vazio se a linha for só do cliente)", MOD_CTR)}</tbody></table>'
             f'<ul class="im-regras" style="margin-top:14px">'
             f'<li>{ico("doc")}<span><b>Uma linha por contrato.</b> Cliente com dois contratos: repita o CPF ou CNPJ em duas linhas. Cliente sem contrato: deixe as colunas de contrato vazias.</span></li>'
             f'<li>{ico("pena")}<span><b>Quatro dos sete tipos de honorário vêm da planilha:</b> fixo, parcelado, mensal e êxito em percentual. Sucumbência, por ato e percentual recorrente se completam na ficha do contrato, depois.</span></li>'
             f'<li>{ico("moeda")}<span><b>Valores com centavos.</b> “4800”, “4.800,00” e “R$ 4.800,00” valem o mesmo. O parcelado é dividido em centavos exatos, como no contrato feito à mão.</span></li></ul>')
    pe = (f'<button class="btn btn-sec" type="button" data-fechar>Fechar</button><a class="btn btn-pri" href="#">{ico("baixar")}Baixar a planilha-modelo</a>')
    return janela('janela-modelo', 'Importar planilha', 'Colunas da planilha-modelo',
                  'Os nomes das colunas não precisam ser estes: no passo 2 você liga cada coluna ao campo certo. Só o nome do cliente e um telefone ou e-mail são sempre obrigatórios.',
                  corpo, pe, abrir=True)


# ---------------------------------------------------------------- lendo e erro de arquivo
def arq_linha(nome, det, erro=False, acao=''):
    c = ' im-arq-erro' if erro else ''
    return f'<div class="im-arq{c}"><span class="im-ci">{ico("alerta" if erro else "doc")}</span><span><strong>{nome}</strong><small>{det}</small></span>{acao}</div>'


def pagina_lendo():
    arq = (arq_linha(ARQ, '412 KB · enviado agora') +
           '<div class="pt-gerando" role="status" aria-live="polite"><p><b>Lendo a planilha: 96 de 148 linhas.</b> Costuma levar poucos segundos; com 2.000 linhas, até um minuto.</p>'
           '<div class="pt-barra-indet" aria-hidden="true"></div></div>'
           f'<div><button class="btn btn-sec" type="button">{ico("x")}Cancelar e apagar o arquivo</button></div>')
    principal = folha('t-env', 'Enviar a planilha', 'Clientes e contratos que já estão numa planilha entram de uma vez, sem redigitar.',
                      bloco_o_que() + f'<div class="im-bloco" aria-busy="true"><h3><span class="disco" aria-hidden="true"><span>3</span></span>O arquivo</h3>{arq}{lgpd(LGPD_ARQ)}</div>')
    return f'<div class="im">{cab_fluxo()}{passos(1, (ARQ, "", "", ""))}{grade(principal, explica_fluxo())}</div>'


def pagina_arquivo_erro():
    err = aviso('urgencia', 'Este arquivo não é uma planilha.',
                '“contrato-modelo-honorarios.pdf” é um PDF. Envie a planilha em .xlsx ou .csv. No Google Planilhas: Arquivo › Fazer download › Microsoft Excel (.xlsx). Nada foi importado e o PDF já foi apagado.')
    arq = err + soltar('im-regra-e') + '<p class="ajuda" style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;color:var(--texto-2)">ARQUIVO_FORMATO</p>'
    principal = folha('t-env', 'Enviar a planilha', 'Clientes e contratos que já estão numa planilha entram de uma vez, sem redigitar.',
                      bloco_o_que() + f'<div class="im-bloco"><h3><span class="disco" aria-hidden="true"><span>3</span></span>O arquivo</h3>{arq}{lgpd(LGPD_ARQ)}</div>' + pe_passo1())
    msgs = [('Planilha vazia', 'A primeira aba não tem linhas abaixo dos nomes das colunas. Veja se os dados estão em outra aba: o passo 2 deixa escolher.', 'ARQUIVO_VAZIO'),
            ('Grande demais', 'Passa de 5 MB ou de 2.000 linhas. Divida em duas planilhas (por exemplo, clientes de A a L e de M a Z) e importe uma depois da outra.', 'ARQUIVO_GRANDE'),
            ('Protegida por senha', 'Abra no Excel, tire a senha em Arquivo › Informações e envie de novo. O T3jus não pede a senha.', 'ARQUIVO_PROTEGIDO'),
            ('Sem os nomes das colunas', 'A primeira linha precisa trazer o nome de cada coluna, como “Nome” e “CPF”. Sem eles, não dá para ligar as colunas.', 'SEM_CABECALHO')]
    lista = ''.join(f'<li><b>{a}</b>{b} <code>{c}</code></li>' for a, b, c in msgs)
    lat = folha('t-msgs', 'Outros problemas de arquivo', 'Cada um diz o que fazer. Em todos, nada é importado e o arquivo é apagado.', f'<ul class="im-msgs">{lista}</ul>')
    return f'<div class="im">{cab_fluxo()}{passos(1)}{grade(principal, lat + explica_fluxo())}</div>'


# ---------------------------------------------------------------- passo 2: colunas
CAMPOS_CLI = ['Não importar', 'Nome ou razão social', 'CPF ou CNPJ', 'Telefone ou WhatsApp', 'E-mail', 'Com quem falar', 'Papel do contato', 'Nacionalidade', 'Estado civil', 'Profissão',
              'RG', 'Órgão emissor do RG', 'CEP', 'Endereço', 'Bairro', 'Cidade', 'UF', 'Origem', 'Quem indicou']
CAMPOS_CTR = ['Não importar', 'Objeto do contrato', 'Tipo de honorário', 'Valor (total, mensal ou percentual)', 'Número de parcelas', 'Primeiro vencimento', 'Parcelas já pagas',
              'Data da assinatura', 'Responsável pelo contrato']

COL_CLI = [
    ('A', 'Nome do cliente', 'Rosa Almeida', 'Nome ou razão social', 'nome'),
    ('B', 'CPF/CNPJ', CPF_ROSA, 'CPF ou CNPJ', 'nome'),
    ('C', 'Celular', '(11) 98451-2290', 'Telefone ou WhatsApp', 'nome'),
    ('D', 'E-mail', 'rosa.almeida@exemplo.com.br', 'E-mail', 'nome'),
    ('E', 'Estado civil', 'casada', 'Estado civil', 'nome'),
    ('F', 'Profissão', 'professora', 'Profissão', 'nome'),
    ('G', 'Endereço', 'Rua Cardeal Arcoverde, 1200, ap. 54', 'Endereço', 'nome'),
    ('H', 'Cidade', 'São Paulo', 'Cidade', 'nome'),
    ('I', 'UF', 'SP', 'UF', 'nome'),
    ('J', 'Como chegou', 'indicação', 'Origem', 'voce'),
    ('K', 'Obs.', 'prefere WhatsApp', 'Não importar', 'ign:Observação livre não entra: pode trazer dado que o cadastro não pede (LGPD).'),
]
COL_CTR = [
    ('L', 'Serviço', 'Aposentadoria por idade', 'Objeto do contrato', 'nome'),
    ('M', 'Forma de cobrança', 'parcelado', 'Tipo de honorário', 'nome'),
    ('N', 'Valor', 'R$ 4.800,00', 'Valor (total, mensal ou percentual)', 'nome'),
    ('O', 'Parcelas', '6', 'Número de parcelas', 'nome'),
    ('P', '1º vencto', '10/09/2026', 'Primeiro vencimento', 'nome'),
    ('Q', 'Pagas', '2', 'Parcelas já pagas', 'voce'),
    ('R', 'Assinatura', '02/09/2026', 'Data da assinatura', 'nome'),
    ('S', 'Advogado', 'Dra. Marina', 'Responsável pelo contrato', 'nome'),
    ('T', 'Área', 'Previdenciário', 'Não importar', 'ign:A área entra no Jurídico, quando o caso for cadastrado.'),
]


def sel_campo(id_, rot_sr, opcoes, sel, erro=''):
    ops = ''.join(f'<option{" selected" if x == sel else ""}>{H(x)}</option>' for x in opcoes)
    a, er = '', ''
    if erro:
        er = f'<p class="erro-msg" id="{id_}-er">{ico("alerta", "ico ico-s")}{erro}</p>'
        a = f' aria-invalid="true" aria-describedby="{id_}-er"'
    return f'<div class="campo"><label class="sr" for="{id_}">{rot_sr}</label><select class="entrada" id="{id_}" name="{id_}"{a}>{ops}</select>{er}</div>'


def tab_colunas(cols, opcoes, cap, erros=None):
    erros = erros or {}
    linhas = []
    for letra, nome, ex, campo_, sit in cols:
        e = erros.get(letra)
        if e:
            campo_ = 'Não importar'
        cls = 'im-err' if e else ('im-ign' if campo_ == 'Não importar' else '')
        col = f'<div class="im-col"><span class="im-letra" aria-hidden="true">{letra}</span><span><b>{H(nome)}</b><span class="sr">, coluna {letra}</span><small class="im-ex-cel">1º valor: {H(ex).replace("@", "@<wbr>")}</small></span></div>'
        exh = f'<span class="im-ex">{H(ex).replace("@", "@<wbr>")}</span>'
        s = sel_campo(f'im-c-{letra}', f'Coluna {letra}, {nome}: vai para', opcoes, campo_, e or '')
        if e:
            st = f'<div class="im-sit">{selo("urgente", "Falta ligar", "alerta")}</div>'
        elif sit.startswith('ign'):
            st = f'<div class="im-sit">{selo("neutro", "Fica de fora", "x")}<small>{sit[4:]}</small></div>'
        elif sit == 'voce':
            st = f'<div class="im-sit"><span class="hn-selo">{ico("lapis")}Por você</span></div>'
        else:
            st = f'<div class="im-sit im-sit-nome"><span class="hn-selo">{ico("check")}Pelo nome</span></div>'
        linhas.append(([col, exh, s, st], cls))
    return tabela(cap, ['Coluna', 'Primeiro valor', 'Vai para', 'Como foi ligada'], linhas, ['22%', '20%', '38%', '20%'], 'im-map')


def pares():
    def p(de, n, ops, sel, aj=''):
        return (de, n, ops, sel, aj)
    itens = [
        ('Advogado', [('Dra. Marina', 61, ['Marina Ribeiro', 'Felipe Matos', 'Larissa Costa'], 'Marina Ribeiro', ''),
                      ('Felipe', 37, ['Marina Ribeiro', 'Felipe Matos', 'Larissa Costa'], 'Felipe Matos', ''),
                      ('Dr. Paulo', 11, ['Marina Ribeiro', 'Felipe Matos', 'Larissa Costa'], 'Marina Ribeiro', 'Não está na Equipe. Os contratos dele ficam com quem você escolher.')]),
        ('Forma de cobrança', [('parcelado', 54, ['Fixo', 'Parcelado', 'Mensal', 'Êxito em percentual'], 'Parcelado', ''),
                               ('mensalidade', 18, ['Fixo', 'Parcelado', 'Mensal', 'Êxito em percentual'], 'Mensal', ''),
                               ('êxito', 22, ['Fixo', 'Parcelado', 'Mensal', 'Êxito em percentual'], 'Êxito em percentual', ''),
                               ('à vista', 15, ['Fixo', 'Parcelado', 'Mensal', 'Êxito em percentual'], 'Fixo', '')]),
        ('Como chegou', [('indicação', 47, CL['ORIGENS'], 'Indicação de cliente', ''),
                         ('amigo do Dr. Felipe', 9, CL['ORIGENS'], 'Indicação de advogado ou parceiro', ''),
                         ('insta', 12, CL['ORIGENS'], 'Instagram', '')]),
    ]
    out = ''
    k = 0
    for col, vals in itens:
        out += f'<p class="im-grupo-t">{ico("funcoes")}Coluna “{col}”</p><ul class="im-pares">'
        for v, n, ops, sel, aj in vals:
            k += 1
            id_ = f'im-p{k}'
            o = ''.join(f'<option{" selected" if x == sel else ""}>{H(x)}</option>' for x in ops)
            a = f'<p class="ajuda" id="{id_}-aj">{aj}</p>' if aj else ''
            ad = f' aria-describedby="{id_}-aj"' if aj else ''
            out += (f'<li><span class="im-de"><b>“{H(v)}”</b><small>{n} linhas</small></span><span class="im-seta" aria-hidden="true">{ico("seta")}</span>'
                    f'<div class="campo"><label class="sr" for="{id_}">“{H(v)}” vira</label><select class="entrada" id="{id_}"{ad}>{o}</select>{a}</div></li>')
        out += '</ul>'
    return folha('t-pares', 'Valores que viram itens das listas do T3jus', 'Cada valor diferente da planilha, com quantas linhas o usam. Estado civil e UF já foram reconhecidos sozinhos.', out)


def obrigatorios(falta=()):
    def it(nome, onde, k):
        if k in falta:
            return f'<li class="im-falta">{ico("alerta")}<span><b>{nome}</b><small>Nenhuma coluna ligada</small></span></li>'
        return f'<li>{ico("check")}<span>{nome}<small>{onde}</small></span></li>'
    corpo = ('<p class="im-ok-t">Cliente</p><ul class="im-ok">' + it('Nome ou razão social', 'Coluna A', 'nome') + it('Telefone ou e-mail', 'Colunas C e D', 'tel') + '</ul>'
             '<p class="im-ok-t">Contrato</p><ul class="im-ok">' + it('Objeto do contrato', 'Coluna L', 'obj') + it('Tipo de honorário', 'Coluna M', 'tipo')
             + it('Valor', 'Coluna N', 'valor') + it('Parcelas e 1º vencimento (no parcelado)', 'Colunas O e P', 'parc') + it('Responsável pelo contrato', 'Coluna S', 'resp') + '</ul>'
             + f'<p class="hn-pe">{ico("ajuda")}<span>Sem a coluna da data da assinatura, os contratos entram em elaboração e só vão ao Financeiro quando a assinatura for registrada, como no contrato feito à mão.</span></p>')
    n = len(falta)
    sub = 'Tudo ligado.' if not n else f'Falta ligar {n}.'
    return folha('t-obr', 'O que é obrigatório', sub, corpo)


def pagina_colunas(erro=False):
    erros = {}
    res = ''
    falta = ()
    if erro:
        erros = {'C': 'Esta coluna parece ser o telefone. Ligue a “Telefone ou WhatsApp”, ou ligue a coluna D a “E-mail”.',
                 'D': 'Sem telefone nem e-mail, o escritório não tem como falar com os clientes. Ligue esta coluna a “E-mail”, ou a coluna C ao telefone.',
                 'M': 'Sem o tipo de honorário, os contratos não entram. Ligue esta coluna a “Tipo de honorário”.'}
        falta = ('tel', 'tipo')
        res = ('<div style="padding:0 24px 16px">' + aviso('urgencia', 'Falta ligar 2 campos obrigatórios. A prévia ainda não foi feita.',
               acoes='<ul class="im-resumo" style="margin:4px 0 0;padding-left:18px"><li><a href="#im-c-C">Telefone ou e-mail: colunas C e D</a></li><li><a href="#im-c-M">Tipo de honorário: coluna M</a></li></ul>') + '</div>')
    aba = (f'<div class="im-aba">{selecao("im-aba", "Aba da planilha", ["Clientes e contratos (148 linhas)", "Resumo (12 linhas)"], "Clientes e contratos (148 linhas)", cls="", vazio="")}'
           f'<p>{"Ligamos 18 de 20 colunas pelo nome. Confira cada uma e ajuste o que precisar." if not erro else "Duas colunas ficaram como “Não importar” e eram obrigatórias."}</p></div>')
    tabs = (aba + res
            + f'<p class="im-grupo-t">{ico("pessoas")}Cliente · 11 colunas</p>' + tab_colunas(COL_CLI, CAMPOS_CLI, 'Colunas do cliente', erros)
            + f'<p class="im-grupo-t">{ico("pena")}Contrato · 9 colunas</p>' + tab_colunas(COL_CTR, CAMPOS_CTR, 'Colunas do contrato', erros))
    pe = (f'<div class="im-pe"><span class="im-pe-t">As colunas que ficam de fora não são lidas. Nada entrou no cadastro ainda.</span>'
          f'<a class="btn btn-fantasma" href="{U}enviar">{ico("esq")}Voltar</a><a class="btn btn-pri" href="{U}previa">{ico("olho")}Ver a prévia</a></div>')
    principal = folha('t-col', 'Ligue as colunas aos campos do T3jus', f'{ARQ} · 148 linhas · 20 colunas', tabs + pe, estilo=' style="overflow:hidden"') + pares()
    return f'<div class="im">{cab_fluxo()}{passos(2, (ARQ, "", "", ""))}{grade(principal, obrigatorios(falta) + explica_fluxo(), "O que é obrigatório")}</div>'


# ---------------------------------------------------------------- passo 3: a prévia
def numeros(itens, rot='Resumo da prévia'):
    corpo = ''
    for n, dc, r, sub, atual, href in itens:
        a = ' aria-current="true"' if atual else ''
        corpo += (f'<a href="{href}"{a}><span class="disco {dc}" aria-hidden="true"><span>{n}</span></span><span class="r"><b>{r}</b>{sub}</span><span class="sr">: {n}</span></a>')
    return f'<nav class="folha hn-numeros" aria-label="{rot}">{corpo}</nav>'


def nums_previa(atual='todas', final=False):
    if final:
        return numeros([('148', '', 'linhas lidas', 'da aba Clientes e contratos', atual == 'todas', U + 'previa'),
                        ('142', 'hn-d-vinho', 'vão entrar', '131 prontas, 3 corrigidas e 8 decididas', atual == 'prontas', U + 'previa'),
                        ('0', 'hn-d-hoje', 'com aviso', 'todas decididas', False, U + 'previa-duplicado'),
                        ('6', '', 'puladas', 'vão para a planilha de fora', False, U + 'previa')])
    return numeros([('148', '', 'linhas lidas', 'da aba Clientes e contratos', atual == 'todas', U + 'previa'),
                    ('131', 'hn-d-vinho', 'prontas', 'entram como estão', atual == 'prontas', U + 'previa'),
                    ('9', 'hn-d-hoje', 'com aviso', 'você decide', atual == 'aviso', U + 'previa-duplicado'),
                    ('8', 'hn-d-urg', 'com erro', 'corrija ou pule', atual == 'erro', U + 'previa-erros')])


def chips(atual):
    def b(k, rot):
        return f'<button type="button" aria-pressed="{"true" if atual == k else "false"}">{rot}</button>'
    return (f'<form class="im-ferr" role="search" action="#" onsubmit="return false"><div class="campo-busca"><label class="sr" for="im-b">Buscar na prévia por nome, CPF ou número da linha</label>{ico("busca")}'
            f'<input class="entrada" id="im-b" type="search" placeholder="Nome, CPF ou número da linha" autocomplete="off"></div>'
            f'<div class="chips" role="group" aria-label="Mostrar">{b("todas", "Todas (148)")}{b("erro", ico("alerta", "ico ico-s") + "Com erro (8)")}{b("aviso", "Com aviso (9)")}{b("prontas", "Prontas (131)")}</div></form>')


def linha(n, nome, sub, ctr, ctr_sub, gera, sit, cls='', aberto=''):
    c = f' class="{cls}"' if cls else ''
    return (f'<li{c}><div class="im-c im-c-n"><span class="im-r">Linha</span><span class="im-nl">{n}</span></div>'
            f'<div class="im-c"><span class="im-r">Cliente</span><span class="im-nome">{nome}</span><small>{sub}</small></div>'
            f'<div class="im-c"><span class="im-r">Contrato e o que gera</span>{ctr}<small>{ctr_sub}</small><span class="im-gera">{ico("carteira", "ico ico-s")}<span>{gera}</span></span></div>'
            f'<div class="im-c"><span class="im-r">Situação</span>{sit}</div>{aberto}</li>')


def lista_l(itens):
    cab = ('<div class="im-cab-l" aria-hidden="true"><span>Linha</span><span>Cliente</span><span>Contrato e o que gera no Financeiro</span><span>Situação</span></div>')
    return cab + f'<ul class="im-linhas" aria-label="Linhas da planilha">{"".join(itens)}</ul>'


def pronta(extra=''):
    return f'<div class="im-prob">{selo("ok", "Pronta", "check")}{extra}</div>'


def btns(*bs):
    return '<div class="im-acoes-l">' + ''.join(bs) + '</div>'


def b(rot, icone='', pri=False, href=''):
    cls = 'btn btn-pri' if pri else 'btn btn-sec'
    i = ico(icone) if icone else ''
    if href:
        return f'<a class="{cls}" href="{href}">{i}{rot}</a>'
    return f'<button class="{cls}" type="button">{i}{rot}</button>'


def ctr(t):
    return f'<span class="im-ctr">{t}</span>'


ROSA = linha('2', 'Rosa Almeida', f'CPF {CPF_ROSA} · (11) 98451-2290', ctr('Aposentadoria por idade'), 'Parcelado · 6 de R$ 800,00 · Marina Ribeiro',
             '<b>4 parcelas</b> a vencer, R$ 3.200,00<small>(2 pagas antes)</small>', pronta())
ANTONIA = linha('3', 'Antonia F. Prado', f'CPF {CPF_ANT} · (11) 99123-4567', ctr('Revisão da pensão'), 'Fixo · R$ 1.500,00 · Marina Ribeiro',
                '<b>1 parcela</b>, R$ 1.500,00<small>10/12/2026</small>',
                f'<div class="im-prob">{selo("atencao", "Possível duplicado", "pessoas")}<p>Mesmo CPF de <a href="{CLI}ficha">Antônia Ferreira Prado</a>, já cadastrada.</p>{btns(b("Decidir", "dir", href=U + "previa-duplicado"))}</div>', 'im-l-aviso')
MARCIO = linha('4', 'Márcio Tavares', f'CPF <span class="im-errado">{CPF_MARCIO_ERR}</span> · (11) 97012-3348', ctr('Reclamação trabalhista'), 'Êxito · 30% · Felipe Matos',
               'Depende do caso<small>a etapa se liga na ficha</small>',
               f'<div class="im-prob">{selo("urgente", "CPF com dígito errado", "alerta")}{btns(b("Corrigir", "lapis", href=U + "previa-erros"), b("Pular", "x"))}</div>', 'im-l-erro')
OFICINA = linha('5', 'Oficina Irmãos Dias Ltda.', f'CNPJ {CNPJ_OFICINA} · Rogério Dias, sócio', ctr('Consultivo trabalhista'), 'Mensal · R$ 1.200,00 · Felipe Matos',
                '<b>Todo mês</b>, R$ 1.200,00<small>a partir de 10/12/2026</small>', pronta())
ROSA2 = linha('6', 'Rosa Almeida', 'mesmo CPF da linha 2: um cliente só', ctr('Revisão do benefício'), 'Êxito · 30% · Marina Ribeiro',
              'Depende do caso<small>a etapa se liga na ficha</small>', pronta('<p style="font-size:12px;color:var(--texto-2)">Entra como segundo contrato de Rosa.</p>'))
VERA = linha('7', 'Vera Lúcia Nunes', f'CPF {CPF_VERA} · vera.nunes@exemplo.com.br', ctr('Inventário'), 'Parcelado · R$ 5.000,00 em 3 · Marina Ribeiro',
             '<b>2 parcelas</b>, R$ 3.333,33<small>1 já vencida entra em atraso</small>', f'<div class="im-prob">{selo("ok", "Pronta", "check")}{btns(b("Ver o que gera", "olho", href=U + "previa-contrato"))}</div>')
CLINICA = linha('8', 'Clínica Sorriso Pleno Ltda.', f'CNPJ {CNPJ_CLINICA} · (11) 3256-7741', ctr('Defesa em ação de consumo'), 'Fixo · R$ 3.500,00 · Felipe Matos',
                '<b>1 parcela</b>, R$ 3.500,00<small>05/01/2027</small>',
                f'<div class="im-prob">{selo("ok", "Pronta", "check")}<p style="font-size:12px;color:var(--texto-2)">Corrigida por você: o valor era “3,500”.</p></div>')
LUCIA = linha('9', 'Lúcia Helena Barros', f'CPF {CPF_LUCIA} · sem telefone e sem e-mail', ctr('Divórcio consensual'), 'Parcelado · 4 de R$ 900,00 · Marina Ribeiro',
              '<b>4 parcelas</b>, R$ 3.600,00',
              f'<div class="im-prob">{selo("urgente", "Sem telefone e sem e-mail", "alerta")}{btns(b("Corrigir", "lapis"), b("Pular", "x"))}</div>', 'im-l-erro')


def previa_lateral(final=False):
    if final:
        topo = ('<div class="hn-res-bloco"><h3>Clientes</h3><p class="hn-res-grande">124</p><ul><li><b>118</b> novos</li><li><b>6</b> juntados a cadastros que já existiam (só os campos vazios)</li></ul></div>'
                '<div class="hn-res-bloco"><h3>Contratos</h3><p class="hn-res-grande">103</p><ul><li><b>96</b> ativos, com a data da assinatura</li><li><b>7</b> em elaboração, sem a data: não vão ao Financeiro ainda</li></ul></div>'
                '<div class="hn-res-bloco"><h3>No Financeiro</h3><p class="hn-res-grande">R$ 326.981,20</p><ul><li><b>401</b> parcelas a receber</li><li><b>12</b> já vencidas entram em atraso</li><li><b>18</b> mensalidades, todo mês</li><li><b>24</b> êxitos dependem do caso</li></ul></div>')
        n_imp = '142'
    else:
        topo = ('<div class="hn-res-bloco"><h3>Clientes</h3><p class="hn-res-grande">112</p><ul><li>novos, das linhas prontas</li><li>mais o que você decidir nos <b>9</b> avisos</li></ul></div>'
                '<div class="hn-res-bloco"><h3>Contratos</h3><p class="hn-res-grande">97</p><ul><li><b>91</b> ativos, com a data da assinatura</li><li><b>6</b> em elaboração, sem a data</li></ul></div>'
                '<div class="hn-res-bloco"><h3>No Financeiro</h3><p class="hn-res-grande">R$ 301.546,90</p><ul><li><b>372</b> parcelas a receber</li><li><b>11</b> já vencidas entram em atraso</li><li><b>17</b> mensalidades, todo mês</li><li><b>22</b> êxitos dependem do caso</li></ul></div>')
        n_imp = '131'
    meses = ('<div class="hn-res-bloco"><h3>Próximos três meses</h3><ul class="hn-prog">'
             '<li><time>dez/2026</time><span>parcelas e mensalidades</span><b>R$ 41.870,00</b></li>'
             '<li><time>jan/2027</time><span>parcelas e mensalidades</span><b>R$ 38.215,34</b></li>'
             '<li><time>fev/2027</time><span>parcelas e mensalidades</span><b>R$ 36.402,66</b></li></ul></div>')
    pago = ('<div class="hn-res-bloco"><h3>Pago antes do T3jus</h3><p><b style="font-weight:600">R$ 41.250,00</b> em 57 parcelas.</p>'
            '<p><small>Fica em cada contrato como informação. Não entra no Caixa nem gera recibo (pergunta 2).</small></p></div>')
    if final:
        acao = (f'<div class="im-res-acao"><a class="btn btn-pri" href="{U}confirmar">{ico("check")}Importar {n_imp} linhas</a>'
                f'<p>6 linhas puladas ficam de fora; no fim você baixa a planilha delas, com o motivo.</p></div>')
    else:
        acao = (f'<div class="im-res-acao"><a class="btn btn-pri" href="{U}confirmar">{ico("check")}Importar {n_imp} linhas prontas</a>'
                f'<p>As 8 com erro e as 9 com aviso ainda pedem você. Se importar agora, elas ficam de fora e vão para a planilha de linhas que não entraram.</p></div>')
    return (f'<section class="folha hn-resumo im-res" aria-labelledby="t-res"><div class="folha-cab" style="padding-bottom:8px"><div><h2 id="t-res">O que vai entrar</h2>'
            f'<p class="sub">Conta feita no servidor, em centavos exatos. Nada foi salvo.</p></div></div>{topo}{meses}{pago}{acao}</section>')


NADA = aviso('info', 'Nada foi salvo ainda.', 'Confira, corrija ou pule as linhas com problema. A prévia fica guardada por 24 horas só para você; depois, é apagada com o arquivo.', extra=' im-nada')


def pagina_previa(atual='todas', itens=None, cont='', massa='', final=False):
    corpo = chips(atual) + (f'<p class="im-cont" role="status">{cont}</p>' if cont else '') + massa + lista_l(itens)
    corpo += f'<div class="mais"><span>{"Mostrando 8 de 148" if atual == "todas" else cont_mais(atual)}</span><button class="btn btn-sec" type="button">{ico("baixo")}Mostrar mais</button></div>'
    principal = NADA + f'<section class="folha" aria-labelledby="t-prev" style="overflow:hidden"><h2 id="t-prev" class="sr">Linhas da planilha</h2>{corpo}</section>'
    return (f'<div class="im">{cab_fluxo()}{passos(3, ESC_FEITAS[:2] + ("", ""))}{nums_previa(atual, final)}'
            f'{grade(principal, previa_lateral(final), "O que vai entrar")}</div>')


def cont_mais(atual):
    return {'erro': 'Mostrando 4 de 8', 'aviso': 'Mostrando 4 de 9'}.get(atual, '')


def previa_padrao():
    return pagina_previa('todas', [ROSA, ANTONIA, MARCIO, OFICINA, ROSA2, VERA, CLINICA, LUCIA],
                         '<b>148 linhas</b> na ordem da planilha · a linha 1 tem os nomes das colunas')


def previa_erros():
    aberto = (f'<div class="im-aberto" role="group" aria-labelledby="im-ab-t"><h4 id="im-ab-t">Corrigir a linha 4<small>A correção vale só para esta importação. A sua planilha não muda.</small></h4>'
              f'<div class="im-campos">'
              + campo('im-cpf4', 'CPF', CPF_MARCIO_ERR, 'c3', im='numeric', foco=True,
                      erro='Confira o CPF: o último dígito não bate com os anteriores. Veja se algum número foi trocado, ou apague para importar sem CPF.')
              + campo('im-tel4', 'Telefone ou WhatsApp', '(11) 97012-3348', 'c3', tipo='tel', im='tel')
              + '</div><div class="im-aberto-pe"><span class="im-pe-t">Sem CPF, o cliente entra e a ficha mostra que falta para a procuração.</span>'
              + f'<button class="btn btn-fantasma" type="button">{ico("x")}Pular esta linha</button><button class="btn btn-pri" type="button">{ico("check")}Salvar a correção</button></div></div>')
    marcio = linha('4', 'Márcio Tavares', f'CPF <span class="im-errado">{CPF_MARCIO_ERR}</span> · (11) 97012-3348', ctr('Reclamação trabalhista'), 'Êxito · 30% · Felipe Matos',
                   'Depende do caso', f'<div class="im-prob">{selo("urgente", "CPF com dígito errado", "alerta")}<p>Corrigindo abaixo.</p></div>', 'im-l-erro', aberto)
    renato = linha('11', 'Renato Queiroz', f'CPF {CPF_RENATO} · (11) 98220-1764', ctr('Ação de cobrança'), 'Parcelado · 5 de R$ 700,00 · Felipe Matos', '—',
                   f'<div class="im-prob">{selo("urgente", "Data que não existe", "alerta")}<p>1º vencimento “<span class="im-errado">31/02/2026</span>”: fevereiro não tem dia 31.</p>{btns(b("Corrigir", "lapis"), b("Pular", "x"))}</div>', 'im-l-erro')
    silvia = linha('14', 'Sílvia Moraes', f'CPF {CPF_SILVIA} · silvia.moraes@exemplo.com.br', ctr('Revisional de aluguel'), 'Fixo · Marina Ribeiro', '—',
                   f'<div class="im-prob">{selo("urgente", "Valor ilegível", "alerta")}<p>“R$ <span class="im-errado">2.5OO</span>,00” tem a letra O no lugar do zero.</p>{btns(b("Corrigir", "lapis"), b("Pular", "x"))}</div>', 'im-l-erro')
    return pagina_previa('erro', [marcio, LUCIA, renato, silvia], '<b>8 linhas com erro.</b> Cada uma diz o que está errado. Linha com erro não entra até ser corrigida ou pulada.')


def previa_duplicado():
    cmp = (f'<table class="comparar im-cmp"><caption class="sr">Linha 3 comparada ao cadastro de Antônia Ferreira Prado</caption>'
           f'<colgroup><col style="width:22%"><col style="width:39%"><col style="width:39%"></colgroup>'
           f'<thead><tr><th scope="col">Campo</th><th scope="col">Na planilha (linha 3)</th><th scope="col">Já cadastrado</th></tr></thead><tbody>'
           f'<tr><th scope="row">Nome</th><td data-r="Na planilha">Antonia F. Prado</td><td data-r="Já cadastrado">Antônia Ferreira Prado <span class="im-igual">fica este</span></td></tr>'
           f'<tr><th scope="row">CPF</th><td class="num" data-r="Na planilha">{CPF_ANT}</td><td data-r="Já cadastrado"><span class="im-igual">{ico("check")}igual</span></td></tr>'
           f'<tr><th scope="row">Telefone</th><td data-r="Na planilha">(11) 99123-4567</td><td data-r="Já cadastrado"><span class="im-igual">{ico("check")}igual (Joana Prado, filha)</span></td></tr>'
           f'<tr><th scope="row">E-mail</th><td data-r="Na planilha"><span class="im-entra">antonia.prado@exemplo.com.br</span></td><td data-r="Já cadastrado">vazio · <b style="font-weight:500">entra o da planilha</b></td></tr>'
           f'<tr><th scope="row">Profissão</th><td data-r="Na planilha">aposentada</td><td data-r="Já cadastrado">Aposentada <span class="im-igual">fica este</span></td></tr>'
           f'</tbody></table>')
    dec = ('<fieldset class="im-decide"><legend>O que fazer com a linha 3?</legend>'
           + opcao('im-d3', 'Juntar ao cadastro de Antônia (recomendado)', 'O contrato entra na ficha dela. Da planilha, só entra o que está vazio no cadastro: aqui, o e-mail. Nada do cadastro é trocado.', True, 'radio', 'juntar')
           + opcao('im-d3', 'Criar outro cliente', 'Só se não for a mesma pessoa. As duas fichas ficam com o aviso de possível duplicado.', False, 'radio', 'novo')
           + opcao('im-d3', 'Pular a linha', 'A linha fica de fora e vai para a planilha de linhas que não entraram.', False, 'radio', 'pular')
           + '</fieldset>')
    aberto = (f'<div class="im-aberto" role="group" aria-labelledby="im-ab3"><h4 id="im-ab3">Linha 3 e Antônia Ferreira Prado<small>Ativa, cliente desde 27/10/2026, com o contrato C-2026-031</small></h4>'
              f'{cmp}{dec}<div class="im-aberto-pe"><span class="im-pe-t">A decisão fica registrada na importação.</span><button class="btn btn-pri" type="button">{ico("check")}Confirmar a decisão</button></div></div>')
    ant = linha('3', 'Antonia F. Prado', f'CPF {CPF_ANT} · (11) 99123-4567', ctr('Revisão da pensão'), 'Fixo · R$ 1.500,00 · Marina Ribeiro',
                '<b>1 parcela</b>, R$ 1.500,00', f'<div class="im-prob">{selo("atencao", "Possível duplicado: mesmo CPF", "pessoas")}<p>Decidindo abaixo.</p></div>', 'im-l-aviso', aberto)
    joaquim = linha('12', 'Joaquim Pereira Neto', f'CPF {CPF_JOAQUIM} · (11) 98114-3059', ctr('Aposentadoria especial'), 'Êxito · 30% · Marina Ribeiro', 'Depende do caso',
                    f'<div class="im-prob">{selo("atencao", "Mesmo telefone de outro cliente", "pessoas")}<p>É o de Marta Corrêa, contato de <a href="{CLI}ficha">Hélio Batista Corrêa</a>. Pode ser da família.</p>{btns(b("Decidir", "dir"))}</div>', 'im-l-aviso')
    sem_ass = linha('19', 'Gilberto Ramos', f'CPF {cpf("481736059")} · (11) 99540-2281', ctr('Usucapião'), 'Parcelado · 8 de R$ 1.250,00 · Felipe Matos', 'Nada por enquanto',
                    f'<div class="im-prob">{selo("atencao", "Sem a data da assinatura", "relogio")}<p>O contrato entra em elaboração e vai ao Financeiro quando a assinatura for registrada.</p>{btns(b("Pôr a data", "lapis"), b("Deixar assim", "check"))}</div>', 'im-l-aviso')
    civil = linha('23', 'Neusa Carvalho', f'CPF {cpf("209583147")} · (11) 97781-0956', ctr('Sem contrato'), 'a linha traz só o cliente', 'Nada',
                  f'<div class="im-prob">{selo("atencao", "Estado civil fora da lista", "relogio")}<p>“amasiada” não está na lista. O campo fica vazio, ou escolha “União estável”.</p>{btns(b("Escolher", "lapis"), b("Deixar vazio", "check"))}</div>', 'im-l-aviso')
    massa = (f'<p class="im-massa">{ico("pessoas")}<span><b>6 linhas</b> têm o mesmo CPF de um cliente já cadastrado. Dá para juntar todas de uma vez: só entram os campos vazios de cada cadastro.</span>'
             f'<button class="btn btn-sec" type="button">{ico("check")}Juntar as 6</button></p>')
    return pagina_previa('aviso', [ant, joaquim, sem_ass, civil], '<b>9 linhas com aviso.</b> Elas podem entrar como estão; o aviso pede que você confira antes.', massa)


def previa_contrato():
    p = parcelas(500000, 3)
    lis = (f'<li class="im-g-pago"><time>10/10/2026</time><span>Parcela 1 de 3 · paga antes do T3jus</span><span>{selo("neutro", "informação", "check")}</span><b>{brl(p[0])}</b></li>'
           f'<li><time>10/11/2026</time><span>Parcela 2 de 3 · vencida, entra em A receber como atrasada</span><span>{selo("urgente", "em atraso", "alerta")}</span><b>{brl(p[1])}</b></li>'
           f'<li><time>10/12/2026</time><span>Parcela 3 de 3</span><span>{selo("em-dia", "a vencer")}</span><b>{brl(p[2])}</b></li>'
           f'<li class="im-g-tot"><time>Total</time><span>soma das 3 parcelas</span><span></span><b>{brl(sum(p))}</b></li>')
    dl = ('<dl class="im-dl"><div><dt>Objeto</dt><dd>Inventário</dd></div><div><dt>Responsável</dt><dd>Marina Ribeiro</dd></div><div><dt>Assinado em</dt><dd>28/09/2026 · entra ativo</dd></div>'
          '<div><dt>Condição</dt><dd>Parcelado · R$ 5.000,00 em 3</dd></div><div><dt>1º vencimento</dt><dd>10/10/2026</dd></div><div><dt>Parcelas já pagas</dt><dd>1 (coluna Q)</dd></div></dl>')
    aberto = (f'<div class="im-aberto" role="group" aria-labelledby="im-ab7"><h4 id="im-ab7">O que a linha 7 gera<small>O número do contrato (C-2026-…) sai na importação, na sequência do escritório.</small></h4>{dl}'
              f'<ul class="im-gera-l" aria-label="Parcelas do contrato">{lis}</ul>'
              f'<p class="hn-gera">{ico("moeda")}<span>R$ 5.000,00 em 3 dá {resumo_parcelas(500000, 3)}: o centavo que sobra vai para as primeiras, e a soma fecha no total.</span></p>'
              f'<div class="aviso-acoes"><a class="btn btn-sec" href="{U}previa">{ico("x")}Fechar</a></div></div>')
    vera = linha('7', 'Vera Lúcia Nunes', f'CPF {CPF_VERA} · vera.nunes@exemplo.com.br', ctr('Inventário'), 'Parcelado · R$ 5.000,00 em 3 · Marina Ribeiro',
                 '<b>2 parcelas</b>, R$ 3.333,33<small>1 já vencida entra em atraso</small>', pronta(), '', aberto)
    return pagina_previa('todas', [OFICINA, ROSA2, vera, CLINICA], '<b>148 linhas</b> · abrindo a linha 7')


# ---------------------------------------------------------------- confirmar, importando, erro, resultado
def j_confirmar():
    corpo = ('<ul class="im-desf">'
             f'<li>{ico("pessoas")}<span><b>124 clientes:</b> 118 novos e 6 juntados a cadastros que já existiam (só os campos vazios).</span></li>'
             f'<li>{ico("pena")}<span><b>103 contratos:</b> 96 ativos e 7 em elaboração, que vão ao Financeiro quando a assinatura for registrada.</span></li>'
             f'<li>{ico("carteira")}<span><b>401 parcelas a receber, R$ 326.981,20.</b> 12 já vencidas entram em atraso. O que foi pago antes do T3jus (R$ 41.250,00) fica só como informação nos contratos.</span></li>'
             f'<li>{ico("x")}<span><b>6 linhas ficam de fora.</b> No fim você baixa a planilha delas, com o motivo.</span></li></ul>'
             + '<div style="margin-top:14px;display:grid;gap:10px">'
             + lgpd('<b>Ou entra tudo ou nada.</b> Se algo falhar no meio, nada fica pela metade. Ao terminar, o arquivo é apagado do servidor.')
             + f'<p class="im-lgpd">{ico("historico")}<span>Dá para desfazer até <b>{PRAZO}</b> (7 dias), em Clientes › Importações. A importação fica no histórico com o seu nome e a hora.</span></p></div>')
    pe = (f'<button class="btn btn-sec" type="button" data-fechar>{ico("esq")}Voltar à prévia</button><a class="btn btn-pri" href="{U}importando">{ico("check")}Importar 142 linhas</a>')
    return janela('janela-confirmar', 'Importar planilha', 'Importar 142 linhas?', f'Da planilha {ARQ}, com as correções e decisões que você fez na prévia.', corpo, pe, abrir=True)


def pagina_importando():
    corpo = (f'<div class="im-prog" aria-busy="true"><div class="pt-gerando" role="status" aria-live="polite"><p><b>Importando: 64 de 142 linhas.</b> Clientes primeiro, depois os contratos e as parcelas.</p>'
             f'<div class="im-barra" aria-hidden="true"><span style="width:45%"></span></div></div>'
             + lgpd('<b>Ou entra tudo ou nada.</b> Se algo falhar no meio, nada fica pela metade e a prévia continua guardada.')
             + f'<p class="im-lgpd">{ico("sino")}<span>Pode sair desta página. Quando terminar, avisamos no sino.</span></p></div>')
    principal = folha('t-imp', 'Importando', ARQ, corpo)
    return f'<div class="im">{cab_fluxo()}{passos(4, ESC_FEITAS[:3] + ("em andamento",))}{grade(principal, explica_fluxo())}</div>'


def pagina_importar_erro():
    e = estado('A importação não foi feita',
               'O servidor parou no meio e desfez tudo: nenhum cliente, contrato ou parcela entrou. As suas correções e decisões da prévia continuam guardadas por 24 horas. Tente de novo; se continuar, mande o código ao suporte.',
               erro=True, h='h2',
               acoes=f'<button class="btn btn-pri" type="button">{ico("reenviar")}Tentar de novo</button><a class="btn btn-sec" href="{U}previa">{ico("esq")}Voltar à prévia</a>',
               codigo='Código para o suporte: IMP-3F82-1120')
    return f'<div class="im">{cab_fluxo()}{passos(4, ESC_FEITAS[:3] + ("não feita",))}{e}</div>'


def pagina_resultado():
    cab = (f'<div class="cabeca-ambar campo-ambar cabeca-equipe im-fim"><div><p class="sobretitulo">Importação de hoje, 15h42</p><h1>Importação concluída</h1><span class="fio" aria-hidden="true"></span>'
           f'<div class="im-fim-num"><div><span class="disco hn-d-vinho" aria-hidden="true"><span>142</span></span><span><b>linhas entraram</b><small>124 clientes e 103 contratos</small></span></div>'
           f'<div><span class="disco" aria-hidden="true"><span>6</span></span><span><b>ficaram de fora</b><small>com o motivo na planilha abaixo</small></span></div></div>'
           f'<p class="sr">142 linhas entraram e 6 ficaram de fora.</p></div></div>')
    entrou = ('<ul class="im-entrou">'
              f'<li><span class="im-ci">{ico("pessoa-mais")}</span><span><strong>118 clientes novos</strong><small>Na lista, o filtro “Desta importação” mostra só eles. A ficha diz que vieram da planilha.</small></span><a class="btn btn-sec" href="{CLI}lista">Ver clientes</a></li>'
              f'<li><span class="im-ci">{ico("pessoas")}</span><span><strong>6 cadastros completados</strong><small>Só os campos vazios receberam o dado da planilha. O que mudou está no histórico de cada ficha.</small></span><a class="btn btn-sec" href="{CLI}lista">Ver os 6</a></li>'
              f'<li><span class="im-ci">{ico("pena")}</span><span><strong>103 contratos</strong><small>96 ativos e 7 em elaboração, à espera da assinatura. Nos 24 êxitos, a etapa que gera a cobrança se liga na ficha.</small></span><a class="btn btn-sec" href="{CTR}contratos">Ver contratos</a></li>'
              f'<li><span class="im-ci">{ico("carteira")}</span><span><strong>401 parcelas · R$ 326.981,20</strong><small>Em A receber. As 12 já vencidas aparecem como atrasadas, para a cobrança começar.</small></span><a class="btn btn-sec" href="{FIN}receber">Ver A receber</a></li></ul>')
    fora = ('<ul class="im-fora">'
            '<li><b>Linha 9</b><span>Lúcia Helena Barros<small>Sem telefone e sem e-mail · pulada</small></span></li>'
            '<li><b>Linha 14</b><span>Sílvia Moraes<small>Valor ilegível · pulada</small></span></li>'
            '<li><b>Linha 31</b><span>Edson Prates<small>CPF com dígito errado · pulada</small></span></li>'
            '<li><b>+ 3</b><span>Linhas 58, 77 e 120<small>dois com data que não existe e um aviso que você pulou</small></span></li></ul>'
            f'<div class="hn-folha-acao"><a class="btn btn-sec" href="#">{ico("baixar")}Baixar as 6 linhas, com o motivo (.xlsx)</a>'
            f'<p>Corrija na planilha e importe só elas. Este arquivo tem apenas as 6 linhas e fica disponível até {PRAZO}; depois, é apagado.</p></div>')
    principal = folha('t-entrou', 'O que entrou', 'Tudo já está no cadastro, nos contratos e no Financeiro.', entrou) + folha('t-fora', 'Ficaram de fora', '6 linhas', fora)
    lat = (folha('t-arq', 'O arquivo foi apagado', '', '<div style="padding:0 24px 20px">' + lgpd(f'<b>{ARQ}</b> foi apagado do servidor às 15h42. Ficou registrado só o nome do arquivo, quem importou e quando.') + '</div>')
           + folha('t-desf', 'Desfazer esta importação', f'Até {PRAZO}', f'<div class="hn-folha-acao"><p>Os clientes ficam inativos, os contratos encerrados e as parcelas canceladas, tudo com o motivo e no histórico. Nada é apagado em silêncio. O que alguém já mexeu depois fica como está.</p>'
                                                              f'<a class="btn btn-perigo" href="{U}desfazer">{ico("historico")}Desfazer importação</a></div>'))
    return f'<div class="im">{passos(5, ESC_FEITAS[:3] + ("feita hoje, 15h42",))}{cab}{grade(principal, lat, "Arquivo e desfazer")}</div>'


# ---------------------------------------------------------------- histórico e desfazer
def pagina_importacoes(com_janela=False):
    linhas = [
        ([f'<div class="esc"><div><b>{ARQ}</b><small>hoje, 15h42 · Marina Ribeiro</small></div></div>',
          '<div>124 clientes, 103 contratos, 401 parcelas<small>6 linhas de fora</small></div>',
          f'<div class="im-sit">{selo("ok", "Concluída", "check")}<small>desfazer até {PRAZO}</small></div>',
          f'<div class="im-acoes-l"><a class="btn btn-sec" href="#">{ico("baixar")}Linhas de fora</a><a class="btn btn-perigo" href="{U}desfazer">{ico("historico")}Desfazer</a></div>'], ''),
        ([f'<div class="esc"><div><b>clientes-antigos.csv</b><small>12/11/2026, 10h05 · Paula Nunes</small></div></div>',
          '<div>23 clientes<small>nenhuma linha de fora</small></div>',
          f'<div class="im-sit">{selo("ok", "Concluída", "check")}<small>o prazo de desfazer acabou em 19/11</small></div>', '<span class="hn-sem">—</span>'], ''),
        ([f'<div class="esc"><div><b>planilha-teste.xlsx</b><small>11/11/2026, 17h20 · Paula Nunes</small></div></div>',
          '<div>40 clientes<small>todos inativados ao desfazer</small></div>',
          f'<div class="im-sit">{selo("neutro", "Desfeita", "historico")}<small>11/11, 17h48, por Paula Nunes: “Importei a aba errada.”</small></div>', '<span class="hn-sem">—</span>'], 'im-desfeita'),
    ]
    tab = tabela('Importações do escritório', ['Arquivo', 'O que entrou', 'Situação', 'Ações'], linhas, ['30%', '24%', '24%', '22%'], 'im-hist')
    corpo = (tab + f'<p class="hn-pe">{ico("escudo")}<span>O arquivo enviado nunca fica guardado. Aqui ficam o nome dele, quem importou, quando e o que entrou. Cada cliente e contrato importado leva isso na própria ficha.</span></p>')
    cab = (f'<div class="cabeca-ambar campo-ambar cabeca-equipe hn-cab-ambar"><div><p class="sobretitulo">Clientes</p><h1>Importações</h1><span class="fio" aria-hidden="true"></span>'
           f'<p class="lede">Cada planilha importada pelo escritório, com quem, quando e o que entrou. Desfazer vale por 7 dias.</p></div>'
           f'<a class="btn btn-escuro" href="{U}enviar" style="margin-bottom:6px">{ico("enviar")}Importar planilha</a></div>')
    j = j_desfazer(com_janela)
    return f'<div class="im">{cab}<section class="folha" aria-labelledby="t-hist" style="overflow:hidden"><h2 id="t-hist" class="sr">Importações</h2>{corpo}</section></div>{j}'


def j_desfazer(abrir=False):
    corpo = ('<ul class="im-desf">'
             f'<li>{ico("pessoas")}<span><b>118 clientes novos ficam inativos</b>, com o motivo. Saem da lista do dia a dia e continuam no filtro Inativos.</span></li>'
             f'<li>{ico("trocar")}<span><b>Os 6 cadastros completados voltam ao que eram:</b> os campos que a planilha preencheu ficam vazios de novo.</span></li>'
             f'<li>{ico("pena")}<span><b>103 contratos ficam encerrados</b>, e as 401 parcelas, canceladas, com o motivo.</span></li></ul>'
             + '<div style="margin:14px 0">' + aviso('atencao', '4 itens já foram mexidos depois da importação e ficam como estão.',
                                                     '3 clientes têm atendimento registrado, e o contrato de Rosa Almeida tem uma parcela recebida em 20/11. A lista vem no fim, para você decidir um por um.') + '</div>'
             + texto('im-motivo', 'Motivo', '', 'c6', ajuda='Fica no histórico e em cada ficha. Ex.: “importei a aba errada”.', foco=True, cont=300))
    pe = (f'<button class="btn btn-sec" type="button" data-fechar>Voltar</button><button class="btn btn-perigo" type="submit">{ico("historico")}Desfazer importação</button>')
    return janela('janela-desfazer', 'Importação de hoje, 15h42', 'Desfazer a importação?',
                  f'Nada é apagado em silêncio. O que a importação de {ARQ} criou sai do uso do dia a dia e fica no histórico. Só quem importou ou a sócia dona pode desfazer, até {PRAZO}.',
                  corpo, pe, alerta=True, abrir=abrir)


# ---------------------------------------------------------------- entradas: Clientes e Contratos
def cab_clientes():
    return ('<div class="cabeca-ambar campo-ambar cabeca-equipe cl-cab-lista"><div><p class="sobretitulo">Cadastro único</p><h1>Clientes</h1><span class="fio" aria-hidden="true"></span>'
            '<p class="lede">Quem o escritório atende: contatos, qualificação para procuração e contrato, origem e histórico de atendimento. Todos da equipe veem esta lista.</p></div>'
            f'<div class="im-cab-acoes"><a class="btn btn-sec" href="{U}enviar">{ico("enviar")}Importar planilha</a>'
            f'<a class="btn btn-escuro" href="{CLI}novo">{ico("pessoa-mais")}Novo cliente</a></div></div>')


def rel_cli(s):
    return s.replace('href="clientes.html?', 'href="../portal-clientes/clientes.html?')


def clientes_lista():
    lst = rel_cli(CL['folha_lista'](CL['lista'](CL['ATIVOS']), cont=f'<b>{len(CL["ATIVOS"])} clientes ativos</b> · 3 com o próximo contato vencido'))
    pe = f'<p class="pt-pe-folha">{ico("historico")}<span>Clientes que vieram de planilha dizem isso na ficha. <a href="{U}importacoes">Ver as importações</a></span></p>'
    lst = lst[:lst.rindex('</section>')] + pe + '</section>'
    return f'<div class="cl">{cab_clientes()}{lst}</div>'


def clientes_vazio():
    e = estado('Nenhum cliente cadastrado ainda',
               'Se os clientes já estão numa planilha do Excel ou do Google Planilhas, importe todos de uma vez: você confere tudo numa prévia antes de salvar. Ou cadastre um por um.',
               'pessoas', moldura=False,
               acoes=f'<a class="btn btn-pri" href="{U}enviar">{ico("enviar")}Importar planilha</a><a class="btn btn-sec" href="{CLI}novo">{ico("pessoa-mais")}Cadastrar o primeiro cliente</a>')
    pe = f'<p class="pt-pe-folha">{ico("doc")}<span>Não sabe por onde começar? Baixe a <a href="{U}modelo">planilha-modelo</a>, cole os seus clientes e envie.</span></p>'
    return f'<div class="cl">{cab_clientes()}<section class="folha" aria-labelledby="t-lista" style="overflow:hidden"><h2 id="t-lista" class="sr">Lista de clientes</h2>{e}{pe}</section></div>'


def contratos_lista():
    s = CT['contratos']()
    velho = f'<a class="btn btn-escuro" href="contratos.html?estado=novo-tipos" style="margin-bottom:6px">'
    assert velho in s
    s = s.replace(velho, f'<div class="im-cab-acoes"><a class="btn btn-sec" href="{U}enviar-contratos">{ico("enviar")}Importar planilha</a><a class="btn btn-escuro" href="contratos.html?estado=novo-tipos">', 1)
    s = s.replace(f'{ico("mais")}Novo contrato</a></div>', f'{ico("mais")}Novo contrato</a></div></div>', 1)
    s = s.replace('href="contratos.html?', 'href="../portal-comercial-contratos/contratos.html?')
    return s


# ---------------------------------------------------------------- estados
T = ''
F = dict(atual='clientes', trilha='Clientes|Importar planilha', titulo='Importar planilha')
T += tpl('clientes-vazio', clientes_vazio(), atual='clientes', trilha='Clientes', titulo='Clientes')
T += tpl('clientes-lista', clientes_lista(), atual='clientes', trilha='Clientes', titulo='Clientes')
T += tpl('contratos-lista', contratos_lista(), area='contratos', secao='Contratos', atual='contratos', trilha='Contratos|Contratos', titulo='Contratos')
T += tpl('enviar', pagina_enviar(), **F)
T += tpl('enviar-contratos', pagina_enviar(), **F)
T += tpl('modelo', pagina_enviar() + j_modelo(), **F)
T += tpl('lendo', pagina_lendo(), **F)
T += tpl('arquivo-erro', pagina_arquivo_erro(), **F)
T += tpl('enviar-sem-contratos', pagina_enviar(contratos=False), quem='sem-area', **F)
T += tpl('colunas', pagina_colunas(), **F)
T += tpl('colunas-erro', pagina_colunas(True), **F)
T += tpl('previa', previa_padrao(), **F)
T += tpl('previa-erros', previa_erros(), **F)
T += tpl('previa-duplicado', previa_duplicado(), **F)
T += tpl('previa-contrato', previa_contrato(), **F)
T += tpl('confirmar', pagina_previa('todas', [ROSA, OFICINA, ROSA2, VERA], '<b>148 linhas</b> · todas conferidas', final=True) + j_confirmar(), **F)
T += tpl('importando', pagina_importando(), **F)
T += tpl('importar-erro', pagina_importar_erro(), **F)
T += tpl('resultado', pagina_resultado(), **F)
I = dict(atual='clientes', trilha='Clientes|Importações', titulo='Importações')
T += tpl('importacoes', pagina_importacoes(), **I)
T += tpl('desfazer', pagina_importacoes(True), **I)

URL = {'Contratos': CTR + 'contratos', 'Honorários': CTR + 'honorarios', 'Procurações e modelos': CTR + 'procuracoes'}
out = montar('importacao.html', 'Importar planilha', 'Importação de clientes e contratos de uma planilha, com prévia antes de salvar (VA-05).',
             '{"estado":"enviar","atual":"clientes"}', T, barras('contratos', URL), CL['CSS_CL'] + CT['CSS'] + CSS_IM)
open(os.path.join(SAIDA, 'importacao.html'), 'w', encoding='utf-8').write(out)
print('importacao ok', T.count('<template data-est='), 'estados')
