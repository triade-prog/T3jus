# Portal · Financeiro (FI-01 a FI-21, PD-03, PD-06, IN-02 a IN-05, IN-07, IN-09, IN-10, IN-14, VA-01).
# Reusa a moldura, o CSS e as peças do Portal v1 aprovado (comum.py, sem mudança) e o
# cabeçalho da ficha aprovada do Console v1, como a área Clientes aprovada. Peças novas com prefixo fi-.
# Uso: python3 financeiro.py <pasta-saida>
import sys, html
from comum import *

SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
H = html.escape
HOJE = '18/11/2026'
ARQ = 'financeiro.html?estado='


def R(v):
    """Valor em reais com centavos, sem quebrar entre o R$ e o número."""
    s = f'{v:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
    return f'R$ {s}'


# ---------------------------------------------------------------- CSS (cabeçalho da ficha aprovada + peças fi-)
_fi = open(APROV + 'console-v1/ficha.html', encoding='utf-8').read()
_cf = _fi[_fi.index('<style>') + 7:_fi.index('</style>')]
CSS_FICHA_CAB = '\n'.join(r.strip() + '}' for r in _cf.split('}')
                          if r.strip().startswith(('.ficha-cab', '.voltar', '.ident', '.meta', '.estatua', '.dir')))

CSS_FI = r"""
/* ===== Cabeçalho da ficha: o da ficha aprovada do Console v1, sem mudança ===== */
""" + CSS_FICHA_CAB + r"""

/* ==========================================================================
   Portal · Financeiro. Prefixo fi- nas peças novas. Só pares do contraste.md.
   Regra visual de FI-06: dinheiro do escritório fica na família vinho;
   valores de terceiros ficam sempre num campo âmbar ou numa faixa âmbar-3,
   com o escudo e o rótulo "De terceiros". Nunca dividem a mesma folha.
   ========================================================================== */
.fi{display:flex;flex-direction:column;gap:24px;min-width:0}
.fi-grade{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:24px;align-items:start}
.fi-col{display:flex;flex-direction:column;gap:24px;min-width:0}
.fi-v{text-align:right;white-space:nowrap;font-weight:500}
.fi-v.forte{font-family:var(--serifa);font-size:19px;color:var(--vinho)}
.fi-pq{font-size:12px;color:var(--texto-2)}
.fi-pq b{font-weight:500;color:var(--texto)}

/* Abertura do Resumo: o corte separa o escritório (vinho) dos terceiros (âmbar) */
.fi-hero{min-height:0}
.fi-hero .esq{gap:14px}
.fi-hero .esq .sobretitulo{color:var(--ambar-2)}
.fi-big{font-family:var(--serifa);font-size:54px;line-height:1;font-weight:500;color:var(--papel);font-variant-numeric:lining-nums tabular-nums}
.fi-hero .fi-de{font-size:15px;color:var(--sal)}
.fi-hero .fi-de b{font-weight:600}
.fi-trilha{position:relative;height:10px;border-radius:5px;background:var(--vinho-2);overflow:hidden;max-width:520px}
.fi-trilha i{position:absolute;left:0;top:0;bottom:0;border-radius:5px;background:var(--ambar)}
.fi-hero-num{display:flex;gap:28px;flex-wrap:wrap;font-size:13px;color:var(--sal)}
.fi-hero-num b{display:block;font-family:var(--serifa);font-size:22px;font-weight:500;color:var(--papel)}
.fi-hero .dir .grande{font-size:44px;color:var(--vinho-escuro)}
.fi-terc-rot{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:var(--vinho-escuro)}
.fi-terc-rot .ico{width:18px;height:18px}
.dir .fi-oque{font-size:13px;color:var(--tinta);line-height:1.5}
.dir .fi-oque b{font-weight:600}
.dir .btn{align-self:flex-start}

/* Faixa de terceiros dentro de qualquer folha (FI-06) */
.fi-terc-cab{display:flex;align-items:center;gap:10px;padding:10px 24px;background:var(--ambar-3);color:var(--vinho-escuro);font-size:12px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;border-radius:var(--raio-g) var(--raio-g) 0 0}
.fi-terc-cab .ico{width:18px;height:18px}
.folha.fi-terc{border-color:var(--ambar-2)}

/* Listas de linhas financeiras */
.fi-linhas{list-style:none;margin:0;padding:0}
.fi-linha{display:grid;grid-template-columns:60px minmax(0,1fr) auto;gap:16px;align-items:center;padding:14px 24px;border-top:1px solid var(--divisor)}
.fi-linha:first-child{border-top:0}
.fi-linha .data small{letter-spacing:.1em}
.fi-linha .data .disco{--d:46px;--f:21px}
.fi-quem a,.fi-quem strong{display:block;font-weight:500;color:var(--texto);text-decoration:none;line-height:1.35}
.fi-quem a{display:flex;align-items:center;min-height:44px;margin:-12px 0 -12px;width:fit-content}
.fi-h2-link{display:inline-flex;align-items:center;min-height:44px;margin:-10px 0;text-decoration:none}
.fi-quem a:hover{text-decoration:underline;color:var(--vinho)}
.fi-quem small{display:block;font-size:12px;color:var(--texto-2);line-height:1.45}
.fi-quem .fi-por{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin-top:6px}
.fi-lado{display:grid;justify-items:end;gap:6px;text-align:right}
.fi-venc{grid-template-columns:minmax(0,1fr) auto}
.fi-venc .fi-motivo{margin-top:6px;padding-left:10px;border-left:2px solid var(--vinho-3);font-size:13px;line-height:1.45}
.fi-venc .fi-motivo b{font-weight:500}
.fi-prox{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:6px;font-size:12px;color:var(--texto-2)}
.fi-prox .ico{width:16px;height:16px;color:var(--vinho)}
.fi-prox b{color:var(--texto);font-weight:500}
.fi-total{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:14px 24px 18px;border-top:1px solid var(--divisor);font-size:13px;color:var(--texto-2)}
.fi-total b{font-family:var(--serifa);font-size:22px;font-weight:500;color:var(--vinho)}

/* Gráficos: barras horizontais, sempre com o valor escrito ao lado */
.fi-barras{display:grid;gap:12px;padding:4px 24px 18px}
.fi-barra{display:grid;grid-template-columns:96px minmax(0,1fr) 150px;gap:12px;align-items:center;font-size:13px}
.fi-barra .rot{color:var(--texto);font-weight:500}
.fi-barra .rot small{display:block;font-weight:400;font-size:12px;color:var(--texto-2)}
.fi-barra .val{text-align:right;line-height:1.35}
.fi-barra .val b{display:block;font-weight:500}
.fi-barra .val small{display:block;font-size:12px;color:var(--texto-2)}
.fi-trilho{position:relative;height:14px;border-radius:4px;background:var(--sal)}
.fi-trilho i{position:absolute;left:0;top:0;bottom:0;border-radius:4px}
.fi-trilho i.real{background:var(--vinho)}
.fi-trilho i.prev{background:var(--ambar-3);box-shadow:inset 0 0 0 1.5px var(--vinho-4);border:0}
.fi-trilho i.urg{background:var(--vinho-3)}
.fi-trilho i.tipo2{background:var(--vinho-2)}
.fi-trilho i.tipo4{background:var(--vinho-4)}
.fi-duplo{display:grid;gap:4px}
.fi-duplo .fi-trilho{height:12px}
.fi-leg{padding:0 24px 16px}
.fi-tons{padding:0 24px}
.fi-tons .tons{height:14px;margin:14px 0 10px}
.fi-grande{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;padding:0 24px}
.fi-grande b{font-family:var(--serifa);font-size:40px;line-height:1;font-weight:500;color:var(--vinho);font-variant-numeric:lining-nums tabular-nums}
.fi-grande span{color:var(--texto-2)}
.fi-sub3{font-family:var(--sans);font-size:12px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--vinho-2);padding:14px 24px 10px;border-top:1px solid var(--divisor);margin-top:16px}
.fi-aviso-in{margin:0 24px 18px}
.fi-dl{margin:0;padding:0 24px 18px;display:grid;gap:0}
.fi-dl div{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:10px 0;border-top:1px solid var(--divisor);font-size:13px}
.fi-dl div:first-child{border-top:0}
.fi-dl dt{color:var(--texto-2)}
.fi-dl dd{margin:0;font-weight:500;text-align:right}
.fi-medidor{padding:0 24px 18px;display:grid;gap:8px}
.fi-medidor p{font-size:13px;line-height:1.5}
.fi-medidor p b{font-weight:600}
.fi-pct{font-family:var(--serifa);font-size:34px;line-height:1;color:var(--vinho);font-weight:500}

/* Números da seção (filtros) */
.fi-nums{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;background:var(--papel);border:1px solid var(--borda-folha);border-radius:var(--raio-g);box-shadow:var(--sombra);overflow:hidden}
.fi-nums button,.fi-nums a{position:relative;display:grid;gap:2px;align-content:center;text-align:left;min-height:88px;padding:16px 22px;border:0;border-left:1px solid var(--divisor);background:transparent;font:inherit;color:var(--texto);cursor:pointer;text-decoration:none}
.fi-nums>:first-child{border-left:0}
.fi-nums button:hover,.fi-nums a:hover{background:#FCF8F5}
.fi-nums .r{font-size:13px;color:var(--texto-2);display:flex;align-items:center;gap:6px}
.fi-nums .r .ico{width:16px;height:16px;color:var(--vinho-3)}
.fi-nums b{font-family:var(--serifa);font-size:26px;line-height:1.1;font-weight:500;color:var(--vinho);font-variant-numeric:lining-nums tabular-nums}
.fi-nums small{font-size:12px;color:var(--texto-2)}
.fi-nums [aria-pressed="true"]{background:#FCF8F5}
.fi-nums [aria-pressed="true"] .r{color:var(--vinho);font-weight:500}
.fi-nums [aria-pressed="true"]::after{content:"";position:absolute;left:22px;right:22px;bottom:0;height:3px;border-radius:3px 3px 0 0;background:var(--vinho)}

/* Tabelas */
.fi-tab td{vertical-align:top}
.fi-tab tbody td{padding-top:14px;padding-bottom:14px}
.fi-tab .fi-grupo th{padding:12px 16px 10px 24px;background:var(--sal-2);text-align:left;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--vinho-2);border-top:1px solid var(--divisor);border-bottom:1px solid var(--divisor)}
.fi-tab .fi-grupo th span{float:right;letter-spacing:0;text-transform:none;font-size:13px;color:var(--texto)}
.fi-tab .fi-grupo th span b{font-weight:600}
.fi-tab tr.fi-atraso td:first-child{box-shadow:inset 3px 0 0 var(--vinho-3)}
.fi-tab tr.fi-pago td{background:#FCFAF8}
.fi-dt{display:grid;gap:2px}
.fi-dt b{font-weight:500}
.fi-dt small{font-size:12px;color:var(--texto-2)}
.fi-forma{display:grid;gap:4px;justify-items:start;font-size:13px}
.fi-forma b{font-weight:500;display:inline-flex;align-items:center;gap:6px}
.fi-forma b .ico{width:16px;height:16px;color:var(--vinho-4)}
.fi-forma small{font-size:12px;color:var(--texto-2)}
.fi-sit{display:grid;gap:6px;justify-items:start}
.fi-sit .fi-motivo{font-size:12px;line-height:1.45;color:var(--texto)}
.fi-sit .fi-motivo b{font-weight:500}
.fi-docs{display:flex;flex-direction:column;align-items:flex-start;gap:0}
.fi-docs a{display:inline-flex;align-items:center;gap:6px;min-height:44px;font-size:13px;font-weight:500;text-decoration:none}
.fi-docs a:hover{text-decoration:underline}
.fi-docs a .ico{width:16px;height:16px}
.fi-tab .fi-acao{text-align:right}
.fi-cat{display:inline-flex;align-items:center;height:24px;padding:0 10px;border-radius:12px;background:var(--sal-2);color:var(--vinho);font-size:12px;font-weight:500;white-space:nowrap}
.fi-cat.terc{background:var(--ambar-3);color:var(--vinho-escuro)}
.fi-cat .ico{width:14px;height:14px;margin-right:4px}

/* Ficha: totais do contrato */
.fi-quatro{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid var(--divisor)}
.fi-quatro div{padding:14px 24px;border-left:1px solid var(--divisor)}
.fi-quatro div:first-child{border-left:0}
.fi-quatro dt{font-size:12px;color:var(--texto-2)}
.fi-quatro dd{margin:2px 0 0;font-family:var(--serifa);font-size:22px;font-weight:500;color:var(--vinho);font-variant-numeric:lining-nums tabular-nums}
.fi-quatro dd.urg{color:var(--vinho-3)}
.fi-quatro{margin:0}

/* Cobrança (FI-04) e Pix (FI-17) */
.fi-cob{padding:0 24px 16px;display:grid;gap:12px}
.fi-cob dl{margin:0;display:grid;gap:10px}
.fi-cob dt{font-size:12px;color:var(--texto-2)}
.fi-cob dd{margin:2px 0 0;font-weight:500;font-size:14px;line-height:1.45}
.fi-cob dd small{display:block;font-weight:400;font-size:12px;color:var(--texto-2)}
.fi-cob .btn{justify-self:start}
.fi-pix{margin:0 24px 18px;padding:14px;border-radius:var(--raio);background:var(--sal-2);display:grid;gap:10px}
.fi-pix code{display:block;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;color:var(--texto);overflow-wrap:anywhere;line-height:1.5}
.fi-pix p{font-size:13px;line-height:1.5}
.fi-pix .acoes{display:flex;gap:8px;flex-wrap:wrap}
.eventos small b{font-weight:500;color:var(--texto)}

/* Janela de registrar */
.janela.fi-larga{width:min(760px,calc(100vw - 32px))}
.fi-alvo{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2)}
.fi-alvo strong{display:block;font-weight:500}
.fi-alvo small{display:block;font-size:12px;color:var(--texto-2)}
.fi-alvo .fi-v{font-family:var(--serifa);font-size:22px;color:var(--vinho)}
.fi-alvo>.ico{color:var(--vinho)}
.fi-dois{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.janela .campo{max-width:none}
.fi-ref{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:var(--raio);border:1px solid var(--vinho-4);font-size:13px;line-height:1.5}
.fi-ref .ico{color:var(--vinho);flex:none;margin-top:1px}
.fi-ref b{font-weight:600}
.fi-anexo{display:flex;align-items:center;gap:12px;padding:8px 8px 8px 14px;border:1px solid var(--borda-folha);border-radius:var(--raio);background:var(--papel)}
.fi-anexo>.ico{color:var(--vinho)}
.fi-anexo span{flex:1;min-width:0;font-size:13px}
.fi-anexo span b{display:block;font-weight:500;overflow-wrap:anywhere}
.fi-anexo span small{font-size:12px;color:var(--texto-2)}
.fi-anexo .btn-icone,.fi-anexo .fi-x{width:44px;height:44px;display:grid;place-items:center;border:0;background:transparent;border-radius:var(--raio);color:var(--vinho);cursor:pointer}
.fi-anexo .fi-x:hover{background:var(--sal-2)}
.fi-rotulo{font-size:13px;font-weight:500;color:var(--texto)}
.fi-caixa-fixa{display:flex;gap:10px;align-items:center;font-size:13px;padding:10px 14px;border-radius:var(--raio);background:var(--sal-2)}
.fi-caixa-fixa .ico{color:var(--vinho)}
.fi-caixa-fixa b{font-weight:600}
.janela .opcao{margin:0}
.fi-grupo-op{border:0;margin:0;padding:0;min-width:0;display:grid;gap:4px}
.fi-grupo-op legend{padding:0;margin-bottom:6px;font-size:13px;font-weight:500}
.fi-sub-op{margin:4px 0 0 34px;padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);display:grid;gap:14px}

/* Destinação de um valor de terceiros (FI-05, VA-01) */
.fi-dest{width:100%}
.fi-dest td,.fi-dest th{vertical-align:top}
.fi-dest tfoot td,.fi-dest tfoot th{padding:14px 16px;border-top:2px solid var(--vinho-4);font-weight:600}
.fi-dest tfoot th{padding-left:24px;text-align:left}
.fi-dest .fi-sub-linha td{padding-top:0}
.fi-dest .fi-sub-linha td:first-child{padding-left:44px}
.fi-quem-d{display:flex;align-items:flex-start;gap:12px}
.fi-quem-d .av-p{width:36px;height:36px;font-size:12px}
.fi-quem-d strong{display:block;font-weight:500}
.fi-quem-d small{display:block;font-size:12px;color:var(--texto-2);line-height:1.45}
.fi-recuo{display:flex;align-items:flex-start;gap:8px;font-size:13px}
.fi-recuo .ico{width:16px;height:16px;color:var(--vinho-4);margin-top:2px}
.fi-split{padding:0 24px 6px}
.fi-split .tons{height:16px;margin:4px 0 10px}

/* Fechamento do caso (FI-08) */
.fi-fecha{padding:0 24px 20px;display:grid;gap:14px}
.fi-fecha-num{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;text-align:center}
.fi-fecha-num div{padding:12px 6px;border-radius:var(--raio);background:var(--sal-2)}
.fi-fecha-num div.falta{background:var(--papel);box-shadow:inset 0 0 0 1.5px var(--vinho-3)}
.fi-fecha-num b{display:block;font-family:var(--serifa);font-size:18px;font-weight:500;color:var(--vinho);font-variant-numeric:lining-nums tabular-nums;white-space:nowrap}
.fi-fecha-num div.falta b{color:var(--vinho-3)}
.fi-fecha-num small{font-size:12px;color:var(--texto-2)}
.fi-check{list-style:none;margin:0;padding:0;display:grid}
.fi-check li{display:grid;grid-template-columns:22px minmax(0,1fr);gap:10px;padding:8px 0;border-top:1px solid var(--divisor);font-size:13px;line-height:1.45}
.fi-check li:first-child{border-top:0}
.fi-check .ico{width:18px;height:18px;color:var(--vinho);margin-top:1px}
.fi-check li.falta .ico{color:var(--vinho-3)}
.fi-check li.falta b{color:var(--vinho-3);font-weight:600}
.fi-check small{display:block;font-size:12px;color:var(--texto-2)}

/* Prestação de contas pelo WhatsApp (FI-12) */
.fi-zap{padding:16px;border-radius:var(--raio);background:var(--sal-2);display:grid;gap:8px}
.fi-zap-cab{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--texto-2)}
.fi-zap-cab .ico{width:16px;height:16px;color:var(--vinho)}
.fi-balao{justify-self:end;max-width:440px;background:var(--papel);border:1px solid var(--borda-folha);border-radius:14px 14px 4px 14px;padding:12px 14px;font-size:13px;line-height:1.55;box-shadow:var(--sombra-1,0 1px 3px rgba(105,39,70,.08))}
.fi-balao table{table-layout:auto;margin:8px 0}
.fi-balao td{padding:2px 0;border:0;font-size:13px;vertical-align:baseline}
.fi-balao td:last-child{text-align:right;padding-left:16px;white-space:nowrap;font-variant-numeric:tabular-nums}
.fi-balao tr.fi-fica td{font-weight:600;border-top:1px solid var(--divisor);padding-top:6px}
.fi-balao tr:hover{background:transparent}
.fi-balao td:first-child{padding-left:0!important}
.fi-balao small{display:block;margin-top:6px;font-size:11px;color:var(--texto-2);text-align:right}

/* Saldos do Caixa (FI-06) */
.fi-saldos{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px}
.fi-saldo{border-radius:var(--raio-g);padding:22px 26px;display:grid;gap:8px;box-shadow:var(--sombra);min-height:170px;align-content:start}
.fi-saldo.campo-vinho .sobretitulo{color:var(--ambar-2)}
.fi-saldo.campo-vinho .fi-big{font-size:44px}
.fi-saldo.campo-vinho p{color:var(--sal);font-size:13px;line-height:1.5}
.fi-saldo.campo-ambar .fi-big{font-size:44px;color:var(--vinho-escuro)}
.fi-saldo.campo-ambar p{color:var(--tinta);font-size:13px;line-height:1.5}
.fi-saldo .estatua{width:170px;height:170px;right:16px;bottom:-34px}

/* Previsão de caixa: barras por mês */
.fi-meses{padding:4px 24px 18px;display:grid;gap:14px}
.fi-mes{display:grid;grid-template-columns:110px minmax(0,1fr) 200px;gap:14px;align-items:center}
.fi-mes .rot{font-weight:500}
.fi-mes .rot small{display:block;font-weight:400;font-size:12px;color:var(--texto-2)}
.fi-mes .val{font-size:12px;line-height:1.5;color:var(--texto-2);text-align:right}
.fi-mes .val b{font-weight:500;color:var(--texto);font-size:13px}
.fi-mes.fi-hoje .rot{color:var(--vinho)}
.fi-mes .fi-trilho i.rpv{background:var(--ambar)}
.fi-tab-caixa td,.fi-tab-caixa th{text-align:right}
.fi-tab-caixa td:first-child,.fi-tab-caixa th:first-child{text-align:left}
.fi-tab-caixa tr.fi-futuro td{color:var(--texto-2)}
.fi-tab-caixa tr.fi-futuro td:first-child{color:var(--texto)}
.fi-tab-caixa tbody td{padding-top:12px;padding-bottom:12px}

/* Lugar reservado (ideias [VAL]) */
.fi-reserva{margin:4px 24px 20px;padding:14px 16px;border:1.5px dashed var(--vinho-4);border-radius:var(--raio);display:flex;gap:10px;align-items:flex-start;font-size:13px;color:var(--texto-2);line-height:1.5}
.fi-reserva .ico{color:var(--vinho-4);flex:none;margin-top:1px}
.fi-reserva b{color:var(--texto);font-weight:500}

/* Primeiro uso */
.fi-passos{list-style:none;margin:0;padding:0 24px 22px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;counter-reset:p}
.fi-passos li{border:1px solid var(--borda-folha);border-radius:var(--raio-g);padding:18px;display:grid;gap:10px;align-content:start;background:var(--papel)}
.fi-passos .disco{--d:44px;--f:22px}
.fi-passos h3{font-size:20px;line-height:1.2}
.fi-passos p{font-size:13px;color:var(--texto-2);line-height:1.5}
.fi-passos .btn{justify-self:start}

.fi-cartao-v{font-family:var(--serifa);font-size:20px;color:var(--vinho);font-weight:500}

.ferramentas .campo-busca{flex:1 1 220px}
.fi-prox{display:block}
.fi-prox .ico{vertical-align:-3px;margin-right:4px}
.fi-forma b{display:flex;align-items:flex-start;gap:6px}
.fi-forma b .ico{margin-top:2px}
.fi .explica{padding-bottom:96px}
.fi-grade-meio{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
.fi-tab-caixa thead th{white-space:normal;line-height:1.35;vertical-align:bottom}
.fi-saldo .estatua{top:auto!important}
.fi-saldo.campo-ambar::before{-webkit-mask-image:radial-gradient(circle at 100% 0,#000 0,transparent 190px)!important;mask-image:radial-gradient(circle at 100% 0,#000 0,transparent 190px)!important}
.fi-hero .estatua{top:auto!important;bottom:-40px!important}
.fi-dest td.fi-v{padding-left:8px}
@media (max-width:760px){.fi-grade-meio{grid-template-columns:minmax(0,1fr)}}

@media (max-width:760px){
  .fi{gap:16px}
  .fi-grade{grid-template-columns:minmax(0,1fr);gap:16px}
  .fi-col{gap:16px}
  .fi-big{font-size:40px}
  .fi-hero .dir .grande{font-size:34px!important}
  .fi-hero-num{gap:16px}
  .fi-linha{grid-template-columns:52px minmax(0,1fr);padding:12px 16px;gap:12px}
  .fi-linha .fi-lado{grid-column:2;justify-items:start;text-align:left;grid-auto-flow:column;justify-content:start;align-items:center}
  .fi-venc{grid-template-columns:minmax(0,1fr)}
  .fi-venc .fi-lado{grid-column:1}
  .fi-total{padding:12px 16px 16px}
  .fi-barras{padding:4px 16px 16px}
  .fi-barra{grid-template-columns:minmax(0,1fr) auto;gap:6px 12px}
  .fi-barra>.fi-trilho,.fi-barra>.fi-duplo{grid-column:1/-1;grid-row:2}
  .fi-hero .estatua{width:120px!important;height:120px!important;right:-10px!important;bottom:-20px!important}
  .fi-leg,.fi-tons,.fi-grande,.fi-dl,.fi-medidor,.fi-cob,.fi-fecha,.fi-split{padding-left:16px;padding-right:16px}
  .fi-sub3{padding-left:16px;padding-right:16px}
  .fi-aviso-in,.fi-pix,.fi-reserva{margin-left:16px;margin-right:16px}
  .fi-terc-cab{padding:10px 16px}
  .fi-nums{grid-template-columns:1fr 1fr}
  .fi-nums button,.fi-nums a{padding:14px 16px;min-height:84px;border-top:1px solid var(--divisor)}
  .fi-nums>:nth-child(-n+2){border-top:0}
  .fi-nums>:nth-child(odd){border-left:0}
  .fi-nums b{font-size:21px}
  .fi-quatro{grid-template-columns:1fr 1fr}
  .fi-quatro div{padding:12px 16px}
  .fi-quatro div:nth-child(3){border-left:0}
  .fi-quatro div:nth-child(n+3){border-top:1px solid var(--divisor)}
  .fi-dois{grid-template-columns:1fr}
  .fi-saldos{grid-template-columns:1fr;gap:16px}
  .fi-saldo{padding:18px 16px;min-height:0}
  .fi-saldo .fi-big{font-size:36px!important}
  .fi-mes{grid-template-columns:minmax(0,1fr) auto;gap:6px 12px}
  .fi-mes .fi-duplo{grid-column:1/-1;grid-row:2}
  .fi-passos{grid-template-columns:1fr;padding:0 16px 16px}
  .fi-alvo{grid-template-columns:auto minmax(0,1fr)}
  .fi-alvo .fi-v{grid-column:2}
  .fi-fecha-num b{font-size:16px}
  .dir .btn{align-self:stretch}
  .ficha-cab .esq .ident h1{font-size:30px!important}
  .cabeca-ambar{padding:22px 16px 20px}
  .cabeca-ambar h1{font-size:34px}
  .pt-cab .btn{flex:1 1 100%}
  .fi-balao{max-width:100%}
  .fi-sub-op{margin-left:0}
}
"""

# ---------------------------------------------------------------- peças comuns
def folha(id_, titulo, corpo, sub='', acoes='', icone='', terc=False, h2style=''):
    i = ico(icone) if icone else ''
    s = f'<p class="sub">{sub}</p>' if sub else ''
    a = f'<div class="acoes">{acoes}</div>' if acoes else ''
    cab_t = (f'<div class="fi-terc-cab">{ico("escudo")}De terceiros · não é do escritório</div>' if terc else '')
    cls = 'folha fi-terc' if terc else 'folha'
    st = f' style="{h2style}"' if h2style else ''
    return (f'<section class="{cls}" aria-labelledby="{id_}">{cab_t}<div class="folha-cab"><div><h2 id="{id_}"{st}>{i}{titulo}</h2>{s}</div>{a}</div>'
            f'{corpo}</section>')


def ver(txt, href):
    return f'<a class="ver" href="{href}">{txt}{ico("dir", "ico ico-s")}</a>'


def cab_secao(sobre, titulo, lede, botao=''):
    return (f'<div class="pt-cab"><div><p class="sobretitulo">{sobre}</p><h1>{titulo}</h1><span class="fio" aria-hidden="true"></span>'
            f'<p class="lede">{lede}</p></div>{botao}</div>')


def data_disco(d, m, forte=False, urg=False):
    c = ' hoje' if forte else ''
    return f'<span class="data"><span class="disco{c}"><span>{d}</span></span><small>{m}</small></span>'


def selo(tipo, txt, icone=None):
    i = ico(icone) if icone else ''
    return f'<span class="selo selo-{tipo}">{i}{txt}</span>'


def campo(id_, rot, valor='', tipo='text', ajuda='', erro='', im='', foco=False, opc=False, ac='off'):
    o = ' <span class="opcional">(opcional)</span>' if opc else ''
    desc, a = [], ''
    aj = er = ''
    if ajuda and not erro:  # o erro ocupa o lugar da ajuda (D2)
        aj = f'<p class="ajuda" id="{id_}-aj">{ajuda}</p>'; desc.append(f'{id_}-aj')
    if erro:
        er = f'<p class="erro-msg" id="{id_}-er">{ico("alerta", "ico ico-s")}{erro}</p>'; desc.append(f'{id_}-er'); a += ' aria-invalid="true"'
    if desc:
        a += f' aria-describedby="{" ".join(desc)}"'
    if im:
        a += f' inputmode="{im}"'
    if foco:
        a += ' data-foco'
    v = f' value="{H(valor)}"' if valor else ''
    return f'<div class="campo"><label for="{id_}">{rot}{o}</label><input class="entrada" id="{id_}" type="{tipo}" autocomplete="{ac}"{v}{a}>{aj}{er}</div>'


def selecao(id_, rot, opcoes, sel='', ajuda='', opc=False):
    o = ' <span class="opcional">(opcional)</span>' if opc else ''
    ops = ''.join(f'<option{" selected" if x == sel else ""}>{H(x)}</option>' for x in opcoes)
    aj, a = '', ''
    if ajuda:
        aj = f'<p class="ajuda" id="{id_}-aj">{ajuda}</p>'; a = f' aria-describedby="{id_}-aj"'
    return f'<div class="campo"><label for="{id_}">{rot}{o}</label><select class="entrada" id="{id_}"{a}>{ops}</select>{aj}</div>'


def anexo(nome, meta, rot_rem='Tirar o anexo'):
    return (f'<div class="fi-anexo">{ico("doc")}<span><b>{nome}</b><small>{meta}</small></span>'
            f'<button class="fi-x" type="button" aria-label="{rot_rem} {nome}">{ico("x")}</button></div>')


FORMAS = ['Pix', 'Boleto', 'Cartão', 'Débito automático', 'Dinheiro', 'Cheque pré-datado', 'Transferência']
CATEGORIAS = ['Honorários contratuais', 'Honorários de êxito', 'Reembolso de custas', 'Valores de terceiros', 'Fornecedores e sistemas',
              'Aluguel e condomínio', 'Impostos', 'Pessoal', 'Retiradas dos sócios', 'Taxas bancárias', 'Empréstimos', 'Custas adiantadas (a reembolsar)']

# ================================================================= 1. RESUMO
def hero():
    pct = round(31240 / 48300 * 100)
    esq = (f'<div class="esq campo-vinho">{ico("coluna", "ico estatua")}'
           f'<p class="sobretitulo">Dinheiro do escritório · novembro</p>'
           f'<p><span class="fi-big num">{R(31240)}</span></p>'
           f'<p class="fi-de">recebidos de <b>{R(48300)}</b> previstos para o mês ({pct}%)</p>'
           f'<div class="fi-trilha" role="img" aria-label="{pct}% do previsto já recebido"><i style="width:{pct}%"></i></div>'
           f'<div class="fi-hero-num"><span><b class="num">{R(7050)}</b>vencidos, 4 parcelas</span><span><b class="num">{R(8000)}</b>entram em 7 dias</span></div></div>')
    dir_ = (f'<section class="dir campo-ambar" aria-labelledby="t-terc"><p class="fi-terc-rot" id="t-terc">{ico("escudo")}De terceiros · na conta</p>'
            f'<p class="grande num">{R(30284.96)}</p>'
            f'<p class="fi-oque">Não é do escritório. Falta repassar a <b>2 clientes, 1 perito e 1 parceiro</b>, e transferir <b>{R(6469.97)}</b> de honorários para a conta do escritório.</p>'
            f'<a class="btn btn-pri" href="{ARQ}repasses">{ico("enviar")}Ver repasses</a></section>')
    return f'<div class="ficha-cab fi-hero">{esq}{dir_}</div>'


VENCIDAS = [
    # (dia, mes, cliente, contrato, parcela/ref, dias, motivo, prox_data, prox_oque, resp, valor, forma, cobranca)
    ('05', 'set', 'Daniela Rocha Mendes', 'Reclamação trabalhista', 'Entrada 2/5 · setembro', 74, 'Está desempregada e pediu para pagar depois do acordo.', '26/11', 'propor descontar do valor do acordo', 'Marina Ribeiro', 1200, 'Pix', 'Pix enviado 3 vezes'),
    ('25', 'out', 'Hélio Batista Corrêa', 'Ação revisional', 'Parcela 3/6 · outubro', 24, 'Não respondeu aos lembretes do WhatsApp.', '19/11', 'ligar para Marta Corrêa, a esposa', 'Diego Almeida', 850, 'Pix', 'Pix gerado em 25/10'),
    ('10', 'nov', 'Construtora Vale Alto Ltda.', 'Assessoria mensal', 'Mensalidade · novembro', 8, 'Vai pagar junto com a medição da obra, no dia 25.', '25/11', 'conferir se o boleto foi pago', 'Felipe Matos', 3200, 'Boleto', 'Boleto emitido em 01/11'),
    ('15', 'nov', 'Farmácia Bom Jesus Ltda.', 'Assessoria mensal', 'Mensalidade · novembro', 3, 'O banco recusou o débito automático.', 'hoje', 'mandar um Pix de cobrança', 'Diego Almeida', 1800, 'Débito automático', 'Recusado pelo banco em 15/11'),
]
PROXIMAS = [
    ('19', 'nov', 'Benedito Souza Lima', 'Revisão de aposentadoria', 'Parcela 2/4 · novembro', 'Pix', 'Pix enviado em 16/11', 1450, ('atencao', 'Amanhã', 'relogio')),
    ('20', 'nov', 'Gabriela Teixeira', 'Ação de cobrança', 'Entrada · novembro', 'Pix', 'Pix agendado pela cliente', 4000, ('neutro', 'Sexta', None)),
    ('23', 'nov', 'Irene Castro', 'Consultoria previdenciária', 'Parcela 1/3 · novembro', 'Boleto', 'Boleto enviado em 18/11', 1100, ('neutro', 'Segunda', None)),
    ('24', 'nov', 'Eduardo Nascimento', 'Consulta', 'Consulta de 10/11', 'Cartão', 'Link de cartão enviado', 600, ('neutro', 'Terça', None)),
    ('25', 'nov', 'Hélio Batista Corrêa', 'Ação revisional', 'Parcela 4/6 · novembro', 'Pix', 'Pix gerado em 18/11', 850, ('neutro', 'Quarta', None)),
]
DEPOIS = [
    ('28', 'nov', 'Construtora Vale Alto Ltda.', 'Ação de cobrança', 'Parcela 2/3 · novembro', 'Cheque pré-datado', 'Cheque guardado no cofre', 2400),
    ('30', 'nov', 'Antônia Ferreira Prado', 'Recurso administrativo (INSS)', 'Parcela 1/2 · novembro', 'Dinheiro', 'Vai pagar no escritório', 960),
    ('30', 'nov', 'Eduardo Nascimento', 'Inventário', 'Mensalidade · novembro', 'Débito automático', 'Débito programado', 700),
]
CONTRATO = ARQ + 'contrato'


def folha_vencido():
    faixas = [('Até 30 dias', '3 parcelas', 5850, 'urg'), ('31 a 60 dias', 'nenhuma', 0, 'urg'), ('61 a 90 dias', '1 parcela', 1200, 'urg'), ('Mais de 90', 'nenhuma', 0, 'urg')]
    mx = 5850
    bar = ''.join(f'<div class="fi-barra"><span class="rot">{r}</span><span class="fi-trilho"><i class="{c}" style="width:{v / mx * 100:.1f}%"></i></span>'
                  f'<span class="val"><b class="num">{R(v)}</b><small>{q}</small></span></div>' for r, q, v, c in faixas)
    linhas = ''
    for d, m, cli, ct, parc, dias, mot, pd, po, resp, v, forma, cob in VENCIDAS:
        linhas += (f'<li class="fi-linha fi-venc"><div class="fi-quem"><a href="{CONTRATO}">{cli}</a><small>{ct} · {parc} · venceu {d}/{ {"set": "09", "out": "10", "nov": "11"}[m] }</small>'
                   f'<p class="fi-motivo"><b>Motivo:</b> {mot}</p>'
                   f'<p class="fi-prox">{ico("relogio")}Próxima ação: <b>{pd}, {po}</b> · {resp}</p></div>'
                   f'<div class="fi-lado"><span class="fi-v forte num">{R(v)}</span>{selo("urgente", f"{dias} dias", "alerta")}</div></li>')
    corpo = (f'<p class="fi-sub3" style="margin-top:0;border-top:0;padding-top:0">Por idade do atraso</p><div class="fi-barras" role="group" aria-label="Vencido por idade do atraso">{bar}</div>'
             f'<p class="fi-sub3" style="margin-top:0">Cada atraso, com o motivo e o que fazer</p><ul class="fi-linhas">{linhas}</ul>'
             f'<p class="fi-total"><span>4 parcelas vencidas · todas têm responsável e próxima ação</span><b class="num">{R(7050)}</b></p>')
    return folha('t-venc', 'Vencido', corpo, sub='O que já devia ter entrado, do mais antigo ao mais recente', icone='alerta',
                 acoes=ver('A receber', ARQ + 'receber'))


def folha_previsto():
    tons = (f'<div class="tons" role="img" aria-label="Recebido {R(31240)}, vencido {R(5000)}, próximos 7 dias {R(8000)}, até o fim do mês {R(4060)}">'
            f'<i style="flex:31240;background:var(--vinho)"></i><i style="flex:5000;background:var(--vinho-3)"></i><i style="flex:8000;background:var(--ambar)"></i><i style="flex:4060;background:var(--ambar-3)"></i></div>')
    leg = (f'<p class="legenda"><span><i style="background:var(--vinho)"></i>Recebido {R(31240)}</span><span><i style="background:var(--vinho-3)"></i>Vencido {R(5000)}</span>'
           f'<span><i style="background:var(--ambar)"></i>Próximos 7 dias {R(8000)}</span><span><i style="background:var(--ambar-3);box-shadow:inset 0 0 0 1px var(--vinho-4)"></i>Até 30/11 {R(4060)}</span></p>')
    meses = [('Agosto', 44100, 42380), ('Setembro', 45600, 39910), ('Outubro', 47200, 45050), ('Novembro', 48300, 31240)]
    mx = 50000
    bar = ''
    for n, p, r in meses:
        sub = '<small>até hoje</small>' if n == 'Novembro' else ''
        bar += (f'<div class="fi-barra"><span class="rot">{n}{sub}</span><span class="fi-duplo" aria-hidden="true"><span class="fi-trilho"><i class="prev" style="width:{p / mx * 100:.1f}%"></i></span>'
                f'<span class="fi-trilho"><i class="real" style="width:{r / mx * 100:.1f}%"></i></span></span>'
                f'<span class="val"><b class="num">{R(r)}</b><small>de {R(p)} · {round(r / p * 100)}%</small></span></div>')
    corpo = (f'<p class="fi-grande"><b class="num">{R(31240)}</b><span>de {R(48300)} previstos</span></p><div class="fi-tons">{tons}{leg}</div>'
             f'<p class="fi-sub3">Comparado com os meses anteriores</p>'
             f'<div class="fi-barras" role="group" aria-label="Realizado contra previsto, de agosto a novembro">{bar}</div>'
             f'<p class="legenda fi-leg"><span><i style="background:var(--ambar-3);box-shadow:inset 0 0 0 1px var(--vinho-4)"></i>Previsto (barra de cima)</span><span><i style="background:var(--vinho)"></i>Realizado (barra de baixo)</span></p>'
             f'<div class="fi-aviso-in">' + aviso('atencao', 'Os honorários de êxito caíram neste mês.',
                                                f'Entraram {R(7200)} até hoje, 41% abaixo da média de agosto a outubro ({R(12300)}). Pode ser só a data dos alvarás: dois RPVs estão previstos para janeiro, em Caixa.',
                                                icone='alerta') + '</div>')
    return folha('t-prev', 'Previsto e realizado', corpo, sub='Honorários do escritório em novembro. Valores de terceiros ficam fora.', icone='moeda',
                 acoes=ver('Caixa', ARQ + 'caixa'))


def folha_proximos():
    li = ''
    for d, m, cli, ct, parc, forma, cob, v, s in PROXIMAS:
        li += (f'<li class="fi-linha">{data_disco(d, m, forte=(d == "19"))}<div class="fi-quem"><a href="{CONTRATO}">{cli}</a><small>{parc} · {forma}</small><span class="fi-por">{selo(s[0], s[1], s[2])}</span></div>'
               f'<div class="fi-lado"><span class="fi-v num">{R(v)}</span></div></li>')
    corpo = f'<ul class="fi-linhas">{li}</ul><p class="fi-total"><span>5 parcelas até 25/11</span><b class="num">{R(8000)}</b></p>'
    return folha('t-prox', 'Entra nos próximos 7 dias', corpo, sub='Cada uma com a cobrança já enviada', icone='agenda')


REPASSES_PEND = [
    ('BL', 'Benedito Souza Lima', 'cliente', 'RPV da revisão de aposentadoria', 15096.59, ('atencao', 'Até 20/11', 'relogio')),
    ('GT', 'Gabriela Teixeira', 'cliente', 'Acordo na ação de cobrança', 4900, ('urgente', 'Era 17/11', 'alerta')),
    ('OP', 'Oliveira &amp; Prates Advocacia', 'parceiro', 'RPV de Irene Castro · 20% dos honorários', 2318.40, ('neutro', 'Até 20/11', None)),
    ('RT', 'Dr. Rui Tavares', 'perito', 'RPV de Irene Castro · assistente técnico', 1500, ('neutro', 'Falta a nota', None)),
]


def folha_repasses_pend():
    li = ''
    for ini, n, papel, de, v, s in REPASSES_PEND:
        li += (f'<li class="fi-linha" style="grid-template-columns:40px minmax(0,1fr) auto"><span class="av-p forte" aria-hidden="true" style="width:40px;height:40px;font-size:13px">{ini}</span>'
               f'<div class="fi-quem"><strong>{n}</strong><small>{papel.capitalize()} · {de}</small></div>'
               f'<div class="fi-lado"><span class="fi-v num">{R(v)}</span>{selo(s[0], s[1], s[2])}</div></li>')
    corpo = (f'<ul class="fi-linhas">{li}</ul><p class="fi-total"><span>4 repasses a fazer</span><b class="num">{R(23814.99)}</b></p>'
             f'<p class="pt-pe-folha">{ico("moeda")}<span>Mais {R(6469.97)} de honorários do RPV de Benedito, a transferir para a conta do escritório depois do repasse a ele.</span></p>')
    return folha('t-rep', 'Repasses pendentes', corpo, sub='Quem ainda espera dinheiro que está com o escritório', icone='enviar', terc=True,
                 acoes=ver('Repasses', ARQ + 'repasses'))


def folha_numeros():
    tipos = [('Contratual', 12840, 'real'), ('Mensalidades', 9600, 'tipo2'), ('Êxito', 7200, 'urg'), ('Consultas', 1600, 'tipo4')]
    mx = 12840
    bar = ''.join(f'<div class="fi-barra" style="grid-template-columns:92px minmax(0,1fr) 106px"><span class="rot">{n}</span><span class="fi-trilho"><i class="{c}" style="width:{v / mx * 100:.1f}%"></i></span>'
                  f'<span class="val"><b class="num">{R(v)}</b></span></div>' for n, v, c in tipos)
    corpo = (f'<dl class="fi-dl"><div><dt>Contratado no mês</dt><dd class="num">{R(26500)}<br><span class="fi-pq">4 contratos novos</span></dd></div>'
             f'<div><dt>Clientes que receberam valores</dt><dd>2 clientes<br><span class="fi-pq num">{R(31428)} repassados</span></dd></div></dl>'
             f'<p class="fi-sub3" style="margin-top:0">Recebido por tipo de honorário</p><div class="fi-barras" role="group" aria-label="Recebido por tipo de honorário">{bar}</div>'
             f'<p class="fi-sub3" style="margin-top:0">Despesas fixas cobertas pela receita recorrente</p>'
             f'<div class="fi-medidor"><p><span class="fi-pct num">78%</span></p><span class="fi-trilho" role="img" aria-label="78% coberto"><i class="real" style="width:78%"></i></span>'
             f'<p>As mensalidades e parcelas previstas ({R(14800)}) cobrem <b>78%</b> das despesas fixas do mês ({R(18900)}). O resto depende de êxito e de contratos novos.</p></div>')
    return folha('t-num', 'Novembro em números', corpo, icone='funcoes')


def resumo():
    cab = cab_secao('Financeiro', 'Resumo', 'Do honorário contratado ao dinheiro recebido e repassado. Hoje, quarta-feira, 18 de novembro.')
    return (f'<div class="fi">{cab}{hero()}<div class="fi-grade"><div class="fi-col">{folha_vencido()}{folha_previsto()}</div>'
            f'<div class="fi-col">{folha_proximos()}{folha_repasses_pend()}{folha_numeros()}</div></div></div>')


def resumo_vazio():
    cab = cab_secao('Financeiro', 'Resumo', 'Do honorário contratado ao dinheiro recebido e repassado.')
    passos = [
        ('1', 'Cadastre os contratos', 'Cada contrato de honorários, na área Contratos, gera as parcelas daqui, com vencimento e forma de pagamento. Você não digita parcela.', f'<a class="btn btn-pri" href="#">{ico("pena")}Ir para Contratos</a>'),
        ('2', 'Lance as contas fixas', 'Aluguel, folha, impostos e sistemas. Marque "todo mês" e elas aparecem sozinhas nos meses seguintes.', f'<a class="btn btn-sec" href="{ARQ}nova-conta">{ico("mais")}Lançar conta</a>'),
        ('3', 'Registre alvarás e RPVs', 'Quando um valor de terceiros entrar, o sistema mostra quanto é de cada um e guarda até tudo ser repassado.', f'<a class="btn btn-sec" href="{ARQ}registrar-rpv">{ico("escudo")}Registrar valor</a>'),
    ]
    li = ''.join(f'<li><span class="disco"><span>{n}</span></span><h3>{t}</h3><p>{p}</p>{b}</li>' for n, t, p, b in passos)
    est = estado('O financeiro ainda está vazio', 'Ele se monta a partir dos contratos. Comece pelo primeiro passo; os outros podem vir quando acontecerem.', 'carteira', moldura=False)
    return f'<div class="fi">{cab}<section class="folha" aria-labelledby="t-vz"><h2 class="sr" id="t-vz">Primeiros passos</h2>{est}<ol class="fi-passos">{li}</ol></section></div>'


# ================================================================= 2. A RECEBER
def selo_dias(d):
    return selo('urgente', f'Vencida há {d} dias', 'alerta')


def receber():
    bot = f'<button class="btn btn-pri" type="button" data-janela="janela-registrar">{ico("moeda")}Registrar recebimento</button>'
    cab = cab_secao('Financeiro', 'A receber', 'As parcelas de todos os contratos, com a forma de pagamento e a cobrança de cada uma.', bot)
    nums = (f'<div class="fi-nums" role="group" aria-label="Mostrar">'
            f'<button type="button" aria-pressed="true"><span class="r">Em aberto</span><b class="num">{R(19110)}</b><small>12 parcelas</small></button>'
            f'<button type="button" aria-pressed="false"><span class="r">{ico("alerta")}Vencidas</span><b class="num">{R(7050)}</b><small>4 parcelas</small></button>'
            f'<button type="button" aria-pressed="false"><span class="r">Próximos 7 dias</span><b class="num">{R(8000)}</b><small>5 parcelas</small></button>'
            f'<button type="button" aria-pressed="false"><span class="r">Recebido em novembro</span><b class="num">{R(31240)}</b><small>19 parcelas</small></button></div>')
    ferr = (f'<form class="ferramentas" role="search" action="#" onsubmit="return false" style="flex-wrap:wrap">'
            f'<div class="campo-busca"><label class="sr" for="fi-busca">Buscar por cliente ou contrato</label>{ico("busca")}<input class="entrada" id="fi-busca" type="search" placeholder="Cliente ou contrato" autocomplete="off"></div>'
            f'<label class="sr" for="fi-resp">Responsável</label><select id="fi-resp"><option>Todos os responsáveis</option><option>Diego Almeida</option><option>Felipe Matos</option><option>Marina Ribeiro</option></select>'
            f'<label class="sr" for="fi-forma">Forma de pagamento</label><select id="fi-forma"><option>Todas as formas</option>' + ''.join(f'<option>{f}</option>' for f in FORMAS) + '</select>'
            f'<div class="chips" role="group" aria-label="Agrupar"><button type="button" aria-pressed="true">Por vencimento</button><button type="button" aria-pressed="false">Por cliente</button></div></form>')
    mes = {'set': '09', 'out': '10', 'nov': '11'}

    def linha(d, m, cli, ct, parc, forma, cob, v, sit, atraso=False):
        cls = ' class="fi-atraso"' if atraso else ''
        return (f'<tr{cls}><td><div class="fi-dt"><b class="num">{d}/{mes[m]}</b><small>{"2026"}</small></div></td>'
                f'<td><div class="fi-quem"><a href="{CONTRATO}">{cli}</a><small>{ct} · {parc}</small></div></td>'
                f'<td><div class="fi-forma"><b>{forma}</b><small>{cob}</small></div></td><td>{sit}</td>'
                f'<td class="fi-v num">{R(v)}</td><td class="fi-acao"><button class="btn btn-sec btn-compacto" type="button" data-janela="janela-registrar" aria-label="Registrar recebimento de {cli}, {parc}">Registrar</button></td></tr>')

    rows = f'<tr class="fi-grupo"><th colspan="6" scope="rowgroup">Vencidas · 4 <span><b class="num">{R(7050)}</b></span></th></tr>'
    for d, m, cli, ct, parc, dias, mot, pd, po, resp, v, forma, cob in VENCIDAS:
        sit = (f'<div class="fi-sit">{selo_dias(dias)}<p class="fi-motivo"><b>Motivo:</b> {mot}</p>'
               f'<p class="fi-motivo"><b>Próxima ação, {pd}:</b> {po} · {resp.split()[0]}</p></div>')
        rows += linha(d, m, cli, ct, parc, forma, cob, v, sit, True)
    rows += f'<tr class="fi-grupo"><th colspan="6" scope="rowgroup">Próximos 7 dias · 5 <span><b class="num">{R(8000)}</b></span></th></tr>'
    for d, m, cli, ct, parc, forma, cob, v, s in PROXIMAS:
        rows += linha(d, m, cli, ct, parc, forma, cob, v, f'<div class="fi-sit">{selo(s[0], s[1], s[2])}</div>')
    rows += f'<tr class="fi-grupo"><th colspan="6" scope="rowgroup">Até 30/11 · 3 <span><b class="num">{R(4060)}</b></span></th></tr>'
    for d, m, cli, ct, parc, forma, cob, v in DEPOIS:
        rows += linha(d, m, cli, ct, parc, forma, cob, v, f'<div class="fi-sit">{selo("neutro", "A vencer")}</div>')
    tab = (f'<table class="so-pc fi-tab"><caption class="sr">Parcelas a receber</caption>'
           f'<colgroup><col style="width:9%"><col style="width:25%"><col style="width:18%"><col style="width:26%"><col style="width:11%"><col style="width:11%"></colgroup>'
           f'<thead><tr><th scope="col">Vence</th><th scope="col">Cliente e contrato</th><th scope="col">Forma e cobrança</th><th scope="col">Situação</th><th scope="col" style="text-align:right">Valor</th><th scope="col"><span class="sr">Ação</span></th></tr></thead>'
           f'<tbody>{rows}</tbody></table>')
    # celular: cartões
    car = ''
    for d, m, cli, ct, parc, dias, mot, pd, po, resp, v, forma, cob in VENCIDAS:
        car += (f'<li class="cartao cl-venc" style="border-color:var(--vinho-3);box-shadow:inset 3px 0 0 var(--vinho-3)"><div class="c-topo"><div><a class="c-nome" href="{CONTRATO}">{cli}</a><small>{ct} · {parc}</small></div><span class="fi-cartao-v num" style="margin-left:auto">{R(v)}</span></div>'
                f'<dl class="c-dados"><dt>Venceu</dt><dd class="num">{d}/{mes[m]}</dd><dt>Forma</dt><dd>{forma}</dd><dt>Motivo</dt><dd>{mot}</dd><dt>Próxima ação</dt><dd>{pd}, {po} · {resp.split()[0]}</dd></dl>'
                f'<div class="c-selos">{selo_dias(dias)}</div></li>')
    for d, m, cli, ct, parc, forma, cob, v, s in PROXIMAS[:3]:
        car += (f'<li class="cartao"><div class="c-topo"><div><a class="c-nome" href="{CONTRATO}">{cli}</a><small>{ct} · {parc}</small></div><span class="fi-cartao-v num" style="margin-left:auto">{R(v)}</span></div>'
                f'<dl class="c-dados"><dt>Vence</dt><dd class="num">{d}/{mes[m]}</dd><dt>Forma</dt><dd>{forma}</dd><dt>Cobrança</dt><dd>{cob}</dd></dl><div class="c-selos">{selo(s[0], s[1], s[2])}</div></li>')
    cart = f'<ul class="cartoes so-cel" aria-label="Parcelas a receber">{car}</ul>'
    pe = (f'<p class="mais so-cel"><span>Mostrando 7 de 12 parcelas</span><button class="btn btn-sec" type="button">Mostrar mais</button></p>'
          f'<p class="pt-pe-folha">{ico("pena")}<span>As parcelas saem das condições de cada contrato, na área Contratos. Pix e boleto emitidos aqui dão baixa sozinhos quando o banco confirma; o resto se registra à mão.</span></p>')
    folha_ = f'<section class="folha" aria-labelledby="t-rec" style="overflow:hidden"><h2 class="sr" id="t-rec">Parcelas</h2>{ferr}<p class="cl-cont" role="status" style="padding:0 24px 12px;font-size:13px;color:var(--texto-2)"><b style="color:var(--texto);font-weight:500">12 parcelas em aberto</b> · da mais antiga para a mais nova</p>{tab}{cart}{pe}</section>'
    return f'<div class="fi">{cab}{nums}{folha_}</div>'


# ---------------------------------------------------------------- ficha do contrato (Hélio)
PARC_HELIO = [
    ('1/6', 'agosto', '25/08', 'pago', 'Paga em 25/08', '2026-0098'),
    ('2/6', 'setembro', '25/09', 'pago', 'Paga em 29/09 · 4 dias de atraso', '2026-0131'),
    ('3/6', 'outubro', '25/10', 'atraso', '', ''),
    ('4/6', 'novembro', '25/11', 'aberto', 'Pix gerado em 18/11', ''),
    ('5/6', 'dezembro', '25/12', 'futuro', '', ''),
    ('6/6', 'janeiro de 2027', '25/01/2027', 'futuro', '', ''),
]


def ficha_contrato(recebido=False):
    if recebido:
        dir_ = (f'<section class="dir campo-ambar" aria-labelledby="t-dir"><p class="sobretitulo" id="t-dir">Em dia</p>'
                f'<div class="cl-dir-linha" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><p class="grande num">{R(850)}</p>{selo("ativo", "25/11 · quarta")}</div>'
                f'<p class="fi-oque"><b>Próxima: parcela 4/6, de novembro.</b><br>Pix já gerado e enviado a Marta Corrêa.</p>'
                f'<button class="btn btn-pri" type="button" data-janela="janela-registrar">{ico("moeda")}Registrar recebimento</button></section>')
    else:
        dir_ = (f'<section class="dir campo-ambar" aria-labelledby="t-dir"><p class="sobretitulo" id="t-dir">Em atraso</p>'
                f'<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><p class="grande num">{R(850)}</p>{selo("urgente", "24 dias", "alerta")}</div>'
                f'<p class="fi-oque"><b>Parcela 3/6, de outubro.</b> Venceu em 25/10.<br>Próxima ação: amanhã, Diego liga para Marta Corrêa.</p>'
                f'<button class="btn btn-pri" type="button" data-janela="janela-registrar">{ico("moeda")}Registrar recebimento</button></section>')
    cab = (f'<div class="ficha-cab"><div class="esq campo-vinho">{ico("coluna", "ico estatua")}'
           f'<a class="voltar" href="{ARQ}receber">{ico("esq", "ico ico-s")}A receber</a>'
           f'<div class="ident"><div><p class="sobretitulo">Contrato de honorários · Ação revisional</p><h1>Hélio Batista Corrêa</h1>'
           f'<p class="meta"><span class="selo selo-ativo" style="background:var(--ambar-3);color:var(--vinho)">Vigente</span><span>6 parcelas de {R(850)} · Pix · dia 25</span><span class="sep" aria-hidden="true"></span><span>responsável Diego Almeida</span></p></div></div></div>{dir_}</div>')
    rows, car = '', ''
    for p, ref, venc, sit, txt, rec in PARC_HELIO:
        docs = '<span class="fi-pq">—</span>'
        if sit == 'pago' or (recebido and sit == 'atraso'):
            n = rec or '2026-0187'
            docs = (f'<div class="fi-docs"><a href="#">{ico("doc")}Recibo {n[-4:]}</a><a href="#">{ico("link")}Comprovante</a></div>')
        if sit == 'pago':
            s = (f'<div class="fi-sit">{selo("ok", txt.split(" · ")[0], "check")}' + (f'<p class="fi-motivo">{txt.split(" · ")[1]}; baixou {ref}.</p>' if ' · ' in txt else '') + '</div>')
        elif sit == 'atraso' and recebido:
            s = (f'<div class="fi-sit">{selo("ok", "Paga em 18/11", "check")}<p class="fi-motivo">24 dias de atraso. Baixou a parcela de outubro; no caixa, entrou em novembro.</p></div>')
        elif sit == 'atraso':
            s = (f'<div class="fi-sit">{selo_dias(24)}<p class="fi-motivo">Pix copia e cola enviado em 25/10.</p></div>')
            docs = f'<button class="btn btn-sec btn-compacto" type="button" data-janela="janela-registrar">Registrar</button>'
        elif sit == 'aberto':
            s = f'<div class="fi-sit">{selo("neutro", "A vencer")}<p class="fi-motivo">{txt}</p></div>'
        else:
            s = selo('neutro', 'A vencer')
        cls = ' class="fi-atraso"' if sit == 'atraso' and not recebido else (' class="fi-pago"' if sit == 'pago' or (recebido and sit == 'atraso') else '')
        rows += (f'<tr{cls}><td><div class="fi-dt"><b>{p}</b><small>{ref}</small></div></td><td class="num">{venc}</td><td>Pix</td><td>{s}</td>'
                 f'<td class="fi-v num">{R(850)}</td><td>{docs}</td></tr>')
        car += (f'<li class="cartao"><div class="c-topo"><div><strong class="c-nome" style="font-size:18px">Parcela {p}</strong><small>Mês de referência: {ref}</small></div><span class="fi-cartao-v num" style="margin-left:auto">{R(850)}</span></div>'
                f'<dl class="c-dados"><dt>Vence</dt><dd class="num">{venc}</dd><dt>Forma</dt><dd>Pix</dd></dl><div class="c-selos">{s if sit != "atraso" or recebido else selo_dias(24)}</div>'
                + (f'<div class="c-acoes">{docs}</div>' if 'fi-docs' in docs or 'btn' in docs else '') + '</li>')
    rec_v, atr_v, ven_v = (2550, 0, 2550) if recebido else (1700, 850, 2550)
    tot = (f'<dl class="fi-quatro"><div><dt>Contratado</dt><dd class="num">{R(5100)}</dd></div><div><dt>Recebido</dt><dd class="num">{R(rec_v)}</dd></div>'
           f'<div><dt>Em atraso</dt><dd class="num{"" if recebido else " urg"}">{R(atr_v)}</dd></div><div><dt>A vencer</dt><dd class="num">{R(ven_v)}</dd></div></dl>')
    tab = (f'<table class="so-pc fi-tab"><caption class="sr">Parcelas do contrato</caption><colgroup><col style="width:13%"><col style="width:12%"><col style="width:8%"><col style="width:31%"><col style="width:15%"><col style="width:21%"></colgroup>'
           f'<thead><tr><th scope="col">Parcela</th><th scope="col">Vence</th><th scope="col">Forma</th><th scope="col">Situação</th><th scope="col" style="text-align:right">Valor</th><th scope="col">Documentos</th></tr></thead><tbody>{rows}</tbody></table>'
           f'<ul class="cartoes so-cel" aria-label="Parcelas do contrato">{car}</ul>')
    parcelas = folha('t-parc', 'Parcelas', tot + tab, sub='Cada parcela guarda o mês a que se refere, mesmo quando é paga depois.',
                     acoes=f'<a class="btn btn-sec" href="#">{ico("pena")}Ver o contrato</a>')
    reemb = folha('t-reemb', 'Adiantado pelo escritório neste caso', (
        f'<ul class="fi-linhas"><li class="fi-linha" style="grid-template-columns:minmax(0,1fr) auto"><div class="fi-quem"><strong>Perícia contábil · honorários do perito judicial</strong>'
        f'<small>Paga pelo escritório em 03/11 · comprovante anexado · categoria "Custas adiantadas"</small>'
        f'<p class="fi-prox">{ico("relogio")}Reembolso combinado: <b>junto com a parcela 4/6</b></p></div>'
        f'<div class="fi-lado"><span class="fi-v num">{R(900)}</span>{selo("atencao", "A reembolsar")}</div></li></ul>'),
        sub='Vira valor a reembolsar pelo cliente, ligado a este caso.', icone='reenviar')
    if recebido:
        evs = ('<li><time>18/11</time><span class="pto forte" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> registrou o recebimento, às 15h20<span class="selo selo-ativo">Novo</span></p>'
               f'<small>Pix de {R(850)} · parcela 3/6 baixada · recibo nº 2026-0187 enviado a Marta Corrêa pelo WhatsApp</small></div></li>')
        motivo = (f'<div class="fi-cob"><p style="font-size:13px;line-height:1.5">Nenhuma parcela em atraso. A cobrança da parcela 3/6 foi encerrada com o recebimento.</p></div>')
    else:
        evs = ''
        motivo = (f'<div class="fi-cob"><dl><div><dt>Motivo do atraso</dt><dd>Não respondeu aos lembretes do WhatsApp<small>anotado por Diego Almeida em 08/11</small></dd></div>'
                  f'<div><dt>Próxima ação</dt><dd>Amanhã, 19/11: ligar para Marta Corrêa, a esposa<small>responsável: Diego Almeida</small></dd></div></dl>'
                  f'<button class="btn btn-sec" type="button">{ico("lapis")}Anotar cobrança</button></div>')
    evs += ('<li><time>08/11</time><span class="pto" aria-hidden="true"></span><div><p><b>Diego Almeida</b> ligou para Hélio, às 10h05</p><small>Ninguém atendeu. Motivo anotado: <b>não responde aos lembretes</b>.</small></div></li>'
            '<li><time>01/11</time><span class="pto" aria-hidden="true"></span><div><p>Segundo lembrete pelo WhatsApp, às 9h</p><small>Automático, com o Pix copia e cola. Entregue, sem resposta.</small></div></li>'
            '<li><time>26/10</time><span class="pto" aria-hidden="true"></span><div><p>Lembrete de atraso pelo WhatsApp, às 9h</p><small>Automático, um dia depois do vencimento.</small></div></li>')
    cob = folha('t-cob', 'Cobrança', motivo + f'<div class="eventos-dia" style="padding-top:0"><h3>Histórico de cobrança</h3><ol class="eventos">{evs}</ol></div>', icone='sino')
    if recebido:
        pix = folha('t-pix', 'Pix da parcela 4/6', (
            f'<div class="fi-pix"><p>Pix copia e cola de <b>{R(850)}</b>, gerado em 18/11 e enviado a Marta Corrêa. Dá baixa sozinho quando o banco confirmar.</p>'
            f'<code>00020126580014br.gov.bcb.pix0136a1f3c9e2-ribeiromatos-0004…6304B1C7</code>'
            f'<div class="acoes"><button class="btn btn-sec" type="button">{ico("copiar")}Copiar código</button><button class="btn btn-sec" type="button">{ico("whats")}Reenviar</button></div></div>'), icone='moeda')
    else:
        pix = folha('t-pix', 'Pix da parcela 3/6', (
            f'<div class="fi-pix"><p>Pix copia e cola de <b>{R(850)}</b>, gerado em 25/10. Dá baixa sozinho quando o banco confirmar. Se Hélio pagar de outro jeito, registre à mão.</p>'
            f'<code>00020126580014br.gov.bcb.pix0136a1f3c9e2-ribeiromatos-0003…6304A9F2</code>'
            f'<div class="acoes"><button class="btn btn-sec" type="button">{ico("copiar")}Copiar código</button><button class="btn btn-sec" type="button">{ico("whats")}Reenviar a Marta</button></div></div>'), icone='moeda')
    t = toast('Recebimento registrado.', 'A parcela 3/6 (outubro) foi baixada. O recibo nº 2026-0187 foi enviado a Marta Corrêa pelo WhatsApp.') if recebido else ''
    return f'<div class="fi">{cab}<div class="fi-grade"><div class="fi-col">{parcelas}{reemb}</div><aside class="fi-col" aria-label="Cobrança">{cob}{pix}</aside></div></div>{t}'


def j_registrar(abrir=False, erros=False):
    res = aviso('urgencia', 'Falta acertar 2 pontos, marcados abaixo.', 'O recebimento ainda não foi registrado.') if erros else ''
    valor = campo('rg-valor', 'Valor recebido', '1.700,00' if erros else '850,00', im='decimal', foco=not erros,
                  ajuda='Falta receber nesta parcela: R$ 850,00.',
                  erro='O valor passa do que falta nesta parcela (R$ 850,00). Se Hélio pagou duas parcelas, registre uma de cada vez. Multa e juros vão no campo de baixo.' if erros else '')
    data = campo('rg-data', 'Dia em que o dinheiro entrou', '21/11/2026' if erros else HOJE, im='numeric', ajuda='dd/mm/aaaa',
                 erro='Esta data é depois de hoje. Registre quando o dinheiro estiver na conta.' if erros else '')
    if erros:
        valor = valor.replace('<input', '<input data-foco', 1)
    corpo = (res
             + f'<div class="fi-alvo">{ico("carteira")}<div><strong>Hélio Batista Corrêa · parcela 3/6</strong><small>Ação revisional · venceu em 25/10/2026 · Pix</small></div><span class="fi-v num">{R(850)}</span></div>'
             + f'<div class="fi-dois">{valor}{data}</div>'
             + f'<p class="fi-ref">{ico("check")}<span>Este recebimento baixa a <b>parcela de outubro de 2026</b>, mesmo pago em novembro. No caixa, ele entra no dia em que o dinheiro entrou.</span></p>'
             + f'<div class="fi-dois">{selecao("rg-forma", "Forma de pagamento", FORMAS, "Pix")}'
             + campo('rg-multa', 'Multa e juros', '', im='decimal', opc=True, ajuda='O contrato prevê 2% de multa e 1% ao mês: R$ 23,80. Deixe em branco se não cobrou.') + '</div>'
             + f'<p class="fi-caixa-fixa">{ico("coluna")}<span>Entra no caixa <b>do escritório</b>: é honorário. Valores de terceiros se registram em Repasses.</span></p>'
             + f'<div class="campo"><span class="fi-rotulo" id="rg-comp-r">Comprovante <span class="opcional" style="font-weight:400;color:var(--texto-2)">(opcional)</span></span>'
             + anexo('pix-helio-corrêa-18-11.pdf', '84 KB · anexado agora') + '</div>'
             + f'<label class="opcao"><input class="marcar" type="checkbox" checked><span>Gerar o recibo e mandar pelo WhatsApp<small>Vai para Marta Corrêa, a contato principal, no número do escritório.</small></span></label>')
    pe = (f'<button class="btn btn-sec" type="button" data-fechar>Cancelar</button>'
          f'<button class="btn btn-pri" type="button">{ico("check")}Registrar recebimento</button>')
    return janela('janela-registrar', 'A receber', 'Registrar recebimento', 'Baixa a parcela, guarda o comprovante e gera o recibo.', corpo, pe, abrir=abrir or erros)


# ================================================================= 3. A PAGAR
CONTAS = [
    # (venc, desc, fornecedor, categoria, origem, doc, valor, terc)
    ('19/11', 'Custas recursais', 'Daniela Rocha Mendes · Reclamação trabalhista', 'Custas adiantadas', ('Adiantada pelo escritório', 'reenviar', 'Vira reembolso de Daniela'), ('Guia anexada', True), 485.00, True),
    ('20/11', 'Aluguel da sala', 'Imobiliária Paulista', 'Aluguel e condomínio', ('Recorrente · todo dia 20', 'reenviar', 'Lançada sozinha em 01/11'), ('Boleto anexado', True), 3600.00, False),
    ('20/11', 'Simples Nacional (DAS)', 'Receita Federal', 'Impostos', ('Recorrente · todo dia 20', 'reenviar', 'Valor muda todo mês'), ('Guia anexada', True), 2850.00, False),
    ('21/11', 'Sistema de petições', 'Fornecedor de software', 'Fornecedores e sistemas', ('Recorrente · todo dia 21', 'reenviar', 'Cartão do escritório'), ('Falta a nota fiscal', False), 189.90, False),
    ('25/11', 'Condomínio da sala', 'Condomínio Edifício Aurora', 'Aluguel e condomínio', ('Recorrente · todo dia 25', 'reenviar', 'Lançada sozinha em 01/11'), ('Boleto anexado', True), 700.00, False),
]


def pagar():
    bot = f'<a class="btn btn-pri" href="{ARQ}nova-conta">{ico("mais")}Lançar conta</a>'
    cab = cab_secao('Financeiro', 'A pagar', 'Contas do escritório, as que se repetem todo mês e o que foi adiantado por cliente.', bot)
    nums = (f'<div class="fi-nums" role="group" aria-label="Mostrar">'
            f'<button type="button" aria-pressed="true"><span class="r">Vencem esta semana</span><b class="num">{R(7824.90)}</b><small>5 contas</small></button>'
            f'<button type="button" aria-pressed="false"><span class="r">Vencidas</span><b class="num">{R(0)}</b><small>nenhuma</small></button>'
            f'<button type="button" aria-pressed="false"><span class="r">Recorrentes do mês</span><b class="num">8</b><small>lançadas sozinhas em 01/11</small></button>'
            f'<button type="button" aria-pressed="false"><span class="r">A reembolsar por clientes</span><b class="num">{R(1385)}</b><small>2 casos</small></button></div>')
    rows, car = '', ''
    for venc, desc, forn, cat, org, doc, v, terc in CONTAS:
        catc = ' terc' if False else ''
        org_h = f'<div class="fi-forma"><b>{ico(org[1])}{org[0]}</b><small>{org[2]}</small></div>'
        doc_h = (f'<span class="fi-docs"><a href="#">{ico("doc")}{doc[0]}</a></span>' if doc[1] else selo('atencao', doc[0], 'alerta'))
        rows += (f'<tr><td><div class="fi-dt"><b class="num">{venc}</b><small>{ {"19/11": "amanhã", "20/11": "sexta", "21/11": "sábado", "25/11": "quarta"}[venc] }</small></div></td>'
                 f'<td><div class="fi-quem"><strong>{desc}</strong><small>{forn}</small></div></td><td><span class="fi-cat">{cat}</span></td>'
                 f'<td>{org_h}</td><td>{doc_h}</td><td class="fi-v num">{R(v)}</td>'
                 f'<td class="fi-acao"><button class="btn btn-sec btn-compacto" type="button" aria-label="Marcar {desc} como paga">Paga</button></td></tr>')
        car += (f'<li class="cartao"><div class="c-topo"><div><strong class="c-nome">{desc}</strong><small>{forn}</small></div><span class="fi-cartao-v num" style="margin-left:auto">{R(v)}</span></div>'
                f'<dl class="c-dados"><dt>Vence</dt><dd class="num">{venc}</dd><dt>Categoria</dt><dd>{cat}</dd><dt>Origem</dt><dd>{org[0]}</dd></dl>'
                f'<div class="c-selos">{selo("ok", doc[0], "check") if doc[1] else selo("atencao", doc[0], "alerta")}</div>'
                f'<div class="c-acoes"><button class="btn btn-sec" type="button">Marcar como paga</button></div></li>')
    tab = (f'<table class="so-pc fi-tab"><caption class="sr">Contas desta semana</caption><colgroup><col style="width:9%"><col style="width:21%"><col style="width:16%"><col style="width:21%"><col style="width:15%"><col style="width:10%"><col style="width:8%"></colgroup>'
           f'<thead><tr><th scope="col">Vence</th><th scope="col">Conta</th><th scope="col">Categoria</th><th scope="col">Origem</th><th scope="col">Nota ou guia</th><th scope="col" style="text-align:right">Valor</th><th scope="col"><span class="sr">Ação</span></th></tr></thead>'
           f'<tbody>{rows}</tbody></table><ul class="cartoes so-cel" aria-label="Contas desta semana">{car}</ul>')
    contas = folha('t-contas', 'Vencem esta semana', tab + f'<p class="mais"><span>Mais 9 contas até 30/11, somando {R(10454.10)}</span><button class="btn btn-sec" type="button">Ver o mês todo</button></p>'
                   + f'<div class="fi-reserva">{ico("cadeado")}<span><b>Aprovação dos pagamentos pela sócia</b> (lista da semana, e quem lança diferente de quem paga) ainda está em validação com os escritórios piloto. O lugar dela é aqui, acima da lista.</span></div>',
                   sub='Da mais próxima para a mais distante', icone='agenda')
    reemb_rows = [
        ('Daniela Rocha Mendes', 'Reclamação trabalhista', 'Custas recursais · paga em 10/11', 485, 'Descontar do valor do acordo'),
        ('Hélio Batista Corrêa', 'Ação revisional', 'Perícia contábil · paga em 03/11', 900, 'Cobrar junto com a parcela 4/6'),
    ]
    li = ''.join(f'<li class="fi-linha" style="grid-template-columns:minmax(0,1fr) auto"><div class="fi-quem"><a href="{CONTRATO}">{c}</a><small>{caso} · {o}</small>'
                 f'<p class="fi-prox">{ico("relogio")}Como volta: <b>{como}</b></p></div><div class="fi-lado"><span class="fi-v num">{R(v)}</span>{selo("atencao", "A reembolsar")}</div></li>'
                 for c, caso, o, v, como in reemb_rows)
    reemb = folha('t-reemb2', 'Adiantado por cliente', f'<ul class="fi-linhas">{li}</ul><p class="fi-total"><span>2 casos</span><b class="num">{R(1385)}</b></p>',
                  sub='Custas e perícias pagas pelo escritório viram reembolso no caso', icone='reenviar')
    cats = [('Retiradas dos sócios', 22000, 'real'), ('Pessoal', 9800, 'real'), ('Aluguel e condomínio', 4300, 'tipo2'), ('Impostos', 2850, 'tipo2'),
            ('Custas adiantadas', 1385, 'tipo4'), ('Fornecedores e sistemas', 355, 'tipo4'), ('Taxas bancárias', 210, 'tipo4')]
    bar = ''.join(f'<div class="fi-barra" style="grid-template-columns:minmax(0,1fr) 110px"><span class="rot">{n}</span><span class="val"><b class="num">{R(v)}</b></span>'
                  f'<span class="fi-trilho" style="grid-column:1/-1"><i class="{c}" style="width:{max(v / 22000 * 100, 1.2):.1f}%"></i></span></div>' for n, v, c in cats)
    cat = folha('t-cat', 'Saídas de novembro por categoria', f'<div class="fi-barras" role="group" aria-label="Saídas por categoria">{bar}</div>'
                f'<p class="fi-total"><span>Pagas e a pagar no mês</span><b class="num">{R(40900)}</b></p>'
                f'<p class="pt-pe-folha">{ico("filtro")}<span>São as mesmas categorias da exportação para o contador. Repasses a terceiros não entram aqui: não são despesa do escritório.</span></p>', icone='funcoes')
    return f'<div class="fi">{cab}{nums}{contas}<div class="fi-grade fi-grade-meio"><div class="fi-col">{reemb}</div><aside class="fi-col" aria-label="Categorias">{cat}</aside></div></div>'


def j_nova_conta():
    corpo = (campo('nc-desc', 'O que é', 'Custas da apelação', foco=True, ajuda='Como vai aparecer na lista e para o contador.')
             + f'<div class="fi-dois">{campo("nc-valor", "Valor", "1.248,36", im="decimal")}{campo("nc-venc", "Vencimento", "21/11/2026", im="numeric", ajuda="dd/mm/aaaa")}</div>'
             + f'<div class="fi-dois">{selecao("nc-cat", "Categoria", CATEGORIAS, "Custas adiantadas (a reembolsar)")}{selecao("nc-forma", "Como vai pagar", ["Boleto", "Pix", "Cartão do escritório", "Débito automático", "Transferência"], "Boleto")}</div>'
             + f'<fieldset class="fi-grupo-op"><legend>Esta conta</legend>'
             + f'<label class="opcao"><input class="marcar" type="checkbox"><span>Repete todo mês<small>Ela aparece sozinha no dia 1º de cada mês, com o mesmo valor. Dá para mudar o valor no mês.</small></span></label>'
             + f'<label class="opcao"><input class="marcar" type="checkbox" checked><span>Foi adiantada para um cliente<small>Vira valor a reembolsar, ligado ao cliente e ao caso.</small></span></label>'
             + f'<div class="fi-sub-op"><div class="fi-dois">{selecao("nc-cli", "Cliente", ["Construtora Vale Alto Ltda.", "Daniela Rocha Mendes", "Hélio Batista Corrêa"], "Construtora Vale Alto Ltda.")}'
             + selecao('nc-caso', 'Caso', ['Ação de cobrança · 1009876-22.2025.8.26.0100', 'Assessoria mensal'], 'Ação de cobrança · 1009876-22.2025.8.26.0100') + '</div>'
             + selecao('nc-como', 'Como o dinheiro volta', ['Cobrar junto com a próxima parcela', 'Descontar quando houver levantamento', 'Cobrar à parte, com Pix'], 'Cobrar junto com a próxima parcela',
                       ajuda='A próxima parcela da Construtora vence em 28/11 e passa a mostrar este reembolso.') + '</div></fieldset>'
             + f'<div class="campo"><span class="fi-rotulo">Guia, boleto ou nota fiscal <span style="font-weight:400;color:var(--texto-2)">(opcional)</span></span>{anexo("guia-preparo-apelacao.pdf", "212 KB · anexado agora")}'
             + f'<p class="ajuda">Vai junto na exportação para o contador.</p></div>')
    pe = f'<button class="btn btn-sec" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="button">{ico("check")}Lançar conta</button>'
    return janela('janela-conta', 'A pagar', 'Lançar conta', 'Uma conta do escritório. Se foi paga por um cliente, marque abaixo.', corpo, pe, abrir=True)


# ================================================================= 4. REPASSES
def repasses():
    bot = f'<button class="btn btn-pri" type="button" data-janela="janela-rpv">{ico("escudo")}Registrar alvará ou RPV</button>'
    cab = cab_secao('Financeiro', 'Repasses', 'Dinheiro de terceiros que entra pelo escritório: quanto é de cada um, o que já foi repassado e o que falta.', bot)
    nums = (f'<div class="fi-nums" role="group" aria-label="Mostrar">'
            f'<button type="button" aria-pressed="true"><span class="r">A repassar</span><b class="num">{R(23814.99)}</b><small>4 repasses</small></button>'
            f'<button type="button" aria-pressed="false"><span class="r">Honorários a transferir</span><b class="num">{R(6469.97)}</b><small>para a conta do escritório</small></button>'
            f'<button type="button" aria-pressed="false"><span class="r">Casos para fechar</span><b class="num">3</b><small>esperam repasse</small></button>'
            f'<button type="button" aria-pressed="false"><span class="r">Repassado em novembro</span><b class="num">{R(31428)}</b><small>2 clientes</small></button></div>')

    def bloco(id_, tipo, cli, caso, data, total, linhas, situacao, acoes):
        li = ''
        for quem, papel, v, s, extra in linhas:
            li += (f'<li class="fi-linha" style="grid-template-columns:minmax(0,1fr) auto"><div class="fi-quem"><strong>{quem}</strong><small>{papel}</small>{extra}</div>'
                   f'<div class="fi-lado"><span class="fi-v num">{R(v)}</span>{s}</div></li>')
        return (f'<section class="folha fi-terc" aria-labelledby="{id_}"><div class="fi-terc-cab">{ico("escudo")}De terceiros · {tipo}</div>'
                f'<div class="folha-cab"><div><h2 id="{id_}"><a class="fi-h2-link" href="{ARQ}repasse">{cli}</a></h2><p class="sub">{caso} · entrou em {data}</p></div>'
                f'<div class="fi-lado"><span class="fi-v forte num">{R(total)}</span>{situacao}</div></div>'
                f'<ul class="fi-linhas">{li}</ul><div class="mais">{acoes}</div></section>')
    b1 = bloco('t-b1', 'RPV', 'Benedito Souza Lima', 'Revisão de aposentadoria × INSS', '17/11', 21566.56, [
        ('Benedito Souza Lima', 'Cliente · o que fica para ele', 15096.59, selo('atencao', 'Até 20/11', 'relogio'), f'<p class="fi-prox">{ico("whats")}Prestação de contas: <b>ainda não enviada</b></p>'),
        ('Honorários de êxito (30%)', 'Escritório · conforme o contrato', 6469.97, selo('neutro', 'Transferir depois'), ''),
    ], selo('urgente', '0 de 2 feitos', 'alerta'),
        f'<span>Nada repassado ainda. O prazo do escritório é de 3 dias úteis.</span><span style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-sec" type="button" data-janela="janela-prestacao">{ico("whats")}Prestação de contas</button><button class="btn btn-pri" type="button">{ico("enviar")}Registrar repasse</button></span>')
    b2 = bloco('t-b2', 'Depósito de acordo', 'Gabriela Teixeira', 'Ação de cobrança × Comercial Lima', '16/11', 7000, [
        ('Gabriela Teixeira', 'Cliente · o que fica para ela', 4900, selo('urgente', 'Era 17/11', 'alerta'),
         f'<p class="fi-prox">{ico("alerta")}<b>Motivo do atraso:</b> a cliente trocou de banco; esperando a chave Pix nova</p>'),
        ('Honorários (30%)', 'Escritório', 2100, selo('ok', 'Transferido 16/11', 'check'), ''),
    ], selo('atencao', '1 de 2 feitos'), f'<span>Prestação de contas enviada em 16/11, lida.</span><button class="btn btn-pri" type="button">{ico("enviar")}Registrar repasse</button>')
    b3 = bloco('t-b3', 'RPV', 'Irene Castro', 'Aposentadoria por incapacidade × INSS', '12/11', 38640, [
        ('Oliveira &amp; Prates Advocacia', 'Parceiro · 20% dos honorários', 2318.40, selo('neutro', 'Até 20/11'), ''),
        ('Dr. Rui Tavares', 'Perito · assistente técnico', 1500, selo('atencao', 'Falta a nota fiscal', 'alerta'), ''),
    ], selo('atencao', '3 de 5 feitos'), f'<span>Cliente, honorários e reembolso já feitos em 13/11.</span>{ver("Abrir e fechar o caso", ARQ + "repasse")}')
    feitos = folha('t-feitos', 'Repassado em novembro', (
        f'<ul class="fi-linhas"><li class="fi-linha" style="grid-template-columns:minmax(0,1fr) auto"><div class="fi-quem"><strong>Irene Castro</strong><small>RPV · Pix em 13/11 · comprovante anexado</small></div><span class="fi-v num">{R(25128)}</span></li>'
        f'<li class="fi-linha" style="grid-template-columns:minmax(0,1fr) auto"><div class="fi-quem"><strong>Construtora Vale Alto Ltda.</strong><small>Alvará · transferência em 05/11 · comprovante anexado</small></div><span class="fi-v num">{R(6300)}</span></li></ul>'
        f'<p class="fi-total"><span>2 clientes receberam valores</span><b class="num">{R(31428)}</b></p>'), icone='check', terc=True)
    regra = (f'<section class="explica campo-ambar" aria-labelledby="t-regra"><p class="sobretitulo">Como funciona</p><h2 id="t-regra">Nada fica parado sem dono.</h2><ul>'
             f'<li>{ico("escudo")}<span>Alvará, RPV, precatório e depósito de acordo entram como <b>valor de terceiros</b>, separados do caixa do escritório.</span></li>'
             f'<li>{ico("pena")}<span>O sistema propõe a divisão pelo contrato: honorários, reembolsos do caso, perito, parceiro e o que fica para o cliente.</span></li>'
             f'<li>{ico("whats")}<span>A prestação de contas vai ao cliente pelo WhatsApp do escritório, depois que alguém revisa.</span></li>'
             f'<li>{ico("cadeado")}<span>O caso só fecha no financeiro com tudo recebido e tudo repassado.</span></li></ul></section>')
    return (f'<div class="fi">{cab}{nums}<div class="fi-grade"><div class="fi-col">{b1}{b2}{b3}</div>'
            f'<aside class="fi-col" aria-label="Repassado e regras">{regra}{feitos}</aside></div></div>')


def j_rpv():
    linhas = [
        ('Honorários de êxito', '30% do valor levantado, cláusula 4 do contrato', 3810.00, 'Escritório', ''),
        ('Reembolso de custas', 'Custas recursais adiantadas pelo escritório em 10/11', 485.00, 'Escritório', ''),
        ('Daniela Rocha Mendes', 'Cliente · o que fica para ela', 8405.00, 'Terceiros', ''),
    ]
    rows = ''.join(f'<tr><td><div class="fi-quem"><strong>{q}</strong><small>{r}</small></div></td><td><span class="fi-cat{" terc" if c == "Terceiros" else ""}">{ico("escudo") if c == "Terceiros" else ico("coluna")}{c}</span></td><td class="fi-v num">{R(v)}</td></tr>' for q, r, v, c, _ in linhas)
    corpo = (f'<div class="fi-dois">{selecao("rv-tipo", "O que entrou", ["Alvará", "RPV", "Precatório", "Depósito de acordo", "Êxito pago pela outra parte"], "Alvará")}'
             + selecao('rv-caso', 'Caso', ['Daniela Rocha Mendes · Reclamação trabalhista', 'Benedito Souza Lima · Revisão de aposentadoria'], 'Daniela Rocha Mendes · Reclamação trabalhista') + '</div>'
             + f'<div class="fi-dois">{campo("rv-valor", "Valor levantado", "12.700,00", im="decimal", foco=True)}{campo("rv-data", "Dia em que entrou", HOJE, im="numeric", ajuda="dd/mm/aaaa")}</div>'
             + f'<p class="fi-caixa-fixa">{ico("escudo")}<span>Entra como <b>valor de terceiros</b>. Só a parte do escritório passa para o caixa dele, quando for transferida.</span></p>'
             + f'<div class="campo"><span class="fi-rotulo">Alvará ou comprovante do levantamento</span>{anexo("alvara-0012384-daniela.pdf", "1,2 MB · anexado agora")}</div>'
             + f'<div><p class="fi-rotulo" style="margin-bottom:8px">Divisão proposta pelo contrato</p>'
             + f'<table class="fi-tab"><caption class="sr">Divisão proposta</caption><colgroup><col style="width:56%"><col style="width:22%"><col style="width:22%"></colgroup>'
             + f'<thead><tr><th scope="col">Para quem</th><th scope="col">Caixa</th><th scope="col" style="text-align:right">Valor</th></tr></thead><tbody>{rows}</tbody></table></div>'
             + f'<p class="fi-ref">{ico("check")}<span>Soma da divisão: <b>{R(12700)}</b>, igual ao valor levantado. Falta destinar: <b>{R(0)}</b>. A parcela de entrada em atraso ({R(1200)}) <b>não</b> é descontada sem o aceite de Daniela.</span></p>')
    pe = f'<button class="btn btn-sec" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="button">{ico("check")}Registrar e criar os repasses</button>'
    return janela('janela-rpv', 'Repasses', 'Registrar alvará ou RPV', 'Diga o que entrou e de qual caso. A divisão sai do contrato, e você pode ajustar antes de registrar.', corpo, pe, abrir=True).replace('class="janela"', 'class="janela fi-larga"', 1)


def j_prestacao():
    msg = (f'<div class="fi-balao"><p>Olá, Benedito. Aqui é o escritório Ribeiro &amp; Matos. O seu RPV foi pago, e esta é a conta de como ficou:</p>'
           f'<table><caption class="sr">Prestação de contas</caption><tbody>'
           f'<tr><td>Valor pago pelo INSS</td><td>{R(21566.56)}</td></tr>'
           f'<tr><td>Honorários (30%, do contrato)</td><td>− {R(6469.97)}</td></tr>'
           f'<tr class="fi-fica"><td>Fica para você</td><td>{R(15096.59)}</td></tr></tbody></table>'
           f'<p>Vamos transferir por Pix até 20/11, para a chave CPF que está no seu cadastro. Mandamos o comprovante por aqui. Qualquer dúvida, é só responder.</p><small>Prévia · ainda não enviada</small></div>')
    corpo = (f'<div class="fi-zap"><p class="fi-zap-cab">{ico("whats")}Para Benedito Souza Lima · (11) 97456-1180 · WhatsApp do escritório</p>{msg}</div>'
             + f'<p class="fi-ref">{ico("check")}<span>A conta fecha: {R(21566.56)} levantados = {R(6469.97)} de honorários + {R(15096.59)} para Benedito. Os valores vêm do registro; para mudar um número, corrija o registro do RPV.</span></p>'
             + f'<label class="opcao"><input class="marcar" type="checkbox" checked><span>Anexar o alvará e o cálculo em PDF<small>O cliente recebe o arquivo junto com a mensagem.</small></span></label>')
    pe = f'<button class="btn btn-sec" type="button" data-fechar>Voltar</button><button class="btn btn-pri" type="button" data-foco>{ico("whats")}Enviar a Benedito</button>'
    return janela('janela-prestacao', 'Repasses · prestação de contas', 'Prestação de contas a Benedito', 'Revise antes de enviar. A mensagem e o envio ficam no histórico do caso.', corpo, pe, abrir=True)


# ---------------------------------------------------------------- ficha do repasse (Irene) e fechamento do caso
def ficha_repasse():
    dir_ = (f'<section class="dir campo-ambar" aria-labelledby="t-dir"><p class="fi-terc-rot" id="t-dir">{ico("escudo")}Ainda com o escritório</p>'
            f'<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><p class="grande num">{R(3818.40)}</p>{selo("atencao", "2 repasses")}</div>'
            f'<p class="fi-oque"><b>Perito e parceiro.</b> O caso só fecha no financeiro quando os dois forem pagos.</p>'
            f'<button class="btn btn-pri" type="button">{ico("enviar")}Registrar repasse</button></section>')
    cab = (f'<div class="ficha-cab"><div class="esq campo-vinho">{ico("balanca", "ico estatua")}'
           f'<a class="voltar" href="{ARQ}repasses">{ico("esq", "ico ico-s")}Repasses</a>'
           f'<div class="ident"><div><p class="sobretitulo">RPV · Aposentadoria por incapacidade × INSS</p><h1>Irene Castro</h1>'
           f'<p class="meta"><span class="selo" style="background:var(--ambar-3);color:var(--vinho)">3 de 5 feitos</span><span>levantado em 12/11/2026</span><span class="sep" aria-hidden="true"></span><span class="num">{R(38640)}</span></p></div></div></div>{dir_}</div>')
    tons = (f'<div class="tons" role="img" aria-label="Cliente {R(25128)}, escritório {R(9693.60)}, parceiro {R(2318.40)}, perito {R(1500)}">'
            f'<i style="flex:25128;background:var(--vinho)"></i><i style="flex:9693.6;background:var(--vinho-2)"></i><i style="flex:2318.4;background:var(--vinho-3)"></i><i style="flex:1500;background:var(--vinho-4)"></i></div>'
            f'<p class="legenda"><span><i style="background:var(--vinho)"></i>Cliente {R(25128)}</span><span><i style="background:var(--vinho-2)"></i>Escritório {R(9693.60)}</span>'
            f'<span><i style="background:var(--vinho-3)"></i>Parceiro {R(2318.40)}</span><span><i style="background:var(--vinho-4)"></i>Perito {R(1500)}</span></p>')
    linhas = [
        ('IC', 'Irene Castro', 'Cliente · o que fica para ela', R(25128), selo('ok', 'Repassado 13/11', 'check'), f'<div class="fi-docs"><a href="#">{ico("link")}Comprovante</a></div>', ''),
        ('RM', 'Honorários de êxito (30%)', f'Escritório · {R(11592)} no total', R(9273.60), selo('ok', 'Transferido 13/11', 'check'), f'<div class="fi-docs"><a href="#">{ico("doc")}Recibo 0179</a></div>', 'sub'),
        ('OP', 'Oliveira &amp; Prates Advocacia', 'Parceiro · 20% dos honorários, combinado na entrada do caso', R(2318.40), selo('neutro', 'Até 20/11'), '<span class="fi-pq">—</span>', 'parte'),
        ('RM', 'Reembolso de custas', 'Laudo médico adiantado em 03/2025', R(420), selo('ok', 'Transferido 13/11', 'check'), '<span class="fi-pq">Despesa ligada</span>', ''),
        ('RT', 'Dr. Rui Tavares', 'Perito · assistente técnico', R(1500), selo('atencao', 'Falta a nota', 'alerta'), f'<button class="btn btn-sec btn-compacto" type="button">Pedir a nota</button>', ''),
    ]
    rows, car = '', ''
    for ini, q, r, v, s, d, k in linhas:
        pre = f'<span class="fi-recuo">{ico("dir")}' if k == 'parte' else ''
        pos = '</span>' if k == 'parte' else ''
        av = '' if k == 'parte' else f'<span class="av-p forte" aria-hidden="true">{ini}</span>'
        rows += (f'<tr><td>{pre}<div class="fi-quem-d">{av}<div><strong>{q}</strong><small>{r}</small></div></div>{pos}</td><td>{s}</td><td class="fi-v num">{v}</td><td>{d}</td></tr>')
        car += (f'<li class="cartao"><div class="c-topo"><div><strong class="c-nome" style="font-size:18px">{q}</strong><small>{r}</small></div></div>'
                f'<dl class="c-dados"><dt>Valor</dt><dd class="num">{v}</dd></dl><div class="c-selos">{s}</div></li>')
    tab = (f'<table class="so-pc fi-tab fi-dest"><caption class="sr">Para onde foi cada parte</caption><colgroup><col style="width:40%"><col style="width:23%"><col style="width:18%"><col style="width:19%"></colgroup>'
           f'<thead><tr><th scope="col">Para quem</th><th scope="col">Situação</th><th scope="col" style="text-align:right">Valor</th><th scope="col">Documento</th></tr></thead><tbody>{rows}</tbody>'
           f'<tfoot><tr><th scope="row">Levantado e destinado</th><td style="white-space:nowrap">Falta destinar {R(0)}</td><td class="fi-v num">{R(38640)}</td><td></td></tr></tfoot></table>'
           f'<ul class="cartoes so-cel" aria-label="Para onde foi cada parte">{car}</ul>')
    dest = folha('t-dest', 'Para onde vai cada parte', f'<div class="fi-split">{tons}</div>' + tab,
                 sub='A divisão saiu do contrato e foi revisada por Marina Ribeiro em 12/11.', icone='enviar', terc=True)
    zap = (f'<div class="fi-zap" style="margin:0 24px 20px"><p class="fi-zap-cab">{ico("whats")}Enviada a Irene em 13/11, às 10h42 · lida às 11h05</p>'
           f'<div class="fi-balao"><p>Olá, Irene. O seu RPV foi pago, e esta é a conta de como ficou:</p><table><caption class="sr">Prestação de contas enviada</caption><tbody>'
           f'<tr><td>Valor pago pelo INSS</td><td>{R(38640)}</td></tr><tr><td>Honorários (30%, do contrato)</td><td>− {R(11592)}</td></tr>'
           f'<tr><td>Laudo médico que adiantamos</td><td>− {R(420)}</td></tr><tr><td>Assistente técnico</td><td>− {R(1500)}</td></tr>'
           f'<tr class="fi-fica"><td>Fica para você</td><td>{R(25128)}</td></tr></tbody></table>'
           f'<p>Já transferimos por Pix. O comprovante vai logo abaixo.</p><small>13/11 · 10h42 · lida</small></div></div>')
    prest = folha('t-prest', 'Prestação de contas à cliente', zap, icone='whats', sub='Gerada no recebimento e enviada pelo WhatsApp do escritório')
    fecha = folha('t-fecha', 'Fechamento do caso', (
        f'<div class="fi-fecha"><div class="fi-fecha-num"><div><b class="num">{R(38640)}</b><small>entrou</small></div><div><b class="num">{R(34821.60)}</b><small>destinado e pago</small></div>'
        f'<div class="falta"><b class="num">{R(3818.40)}</b><small>falta pagar</small></div></div>'
        f'<ul class="fi-check">'
        f'<li>{ico("check")}<span>Alvará registrado, com o comprovante do levantamento</span></li>'
        f'<li>{ico("check")}<span>Parcelas do contrato todas recebidas<small>6 de 6, a última em 25/09</small></span></li>'
        f'<li>{ico("check")}<span>Cliente recebeu e a prestação de contas foi lida</span></li>'
        f'<li>{ico("check")}<span>Honorários e reembolso no caixa do escritório</span></li>'
        f'<li class="falta">{ico("alerta")}<span><b>Parceiro:</b> falta pagar {R(2318.40)}</span></li>'
        f'<li class="falta">{ico("alerta")}<span><b>Perito:</b> falta pagar {R(1500)}<small>esperando a nota fiscal dele</small></span></li></ul>'
        f'<button class="btn btn-sec" type="button" data-janela="janela-fechar">{ico("cadeado")}Encerrar o caso no financeiro</button></div>'), icone='cadeado', sub='Só encerra com tudo recebido e tudo repassado')
    hist = folha('t-hist', 'Histórico', (
        '<div class="eventos-dia" style="padding-top:0"><h3>13/11/2026</h3><ol class="eventos">'
        f'<li><time>11h05</time><span class="pto" aria-hidden="true"></span><div><p>Irene leu a prestação de contas</p><small>WhatsApp do escritório</small></div></li>'
        f'<li><time>10h40</time><span class="pto" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> repassou {R(25128)} a Irene</p><small>Pix · comprovante anexado</small></div></li></ol></div>'
        '<div class="eventos-dia"><h3>12/11/2026</h3><ol class="eventos">'
        f'<li><time>16h12</time><span class="pto" aria-hidden="true"></span><div><p><b>Marina Ribeiro</b> registrou o RPV</p><small>{R(38640)} · divisão do contrato aceita sem mudança</small></div></li></ol></div>'), icone='historico')
    return f'<div class="fi">{cab}<div class="fi-grade"><div class="fi-col">{dest}{prest}</div><aside class="fi-col" aria-label="Fechamento">{fecha}{hist}</aside></div></div>'


def j_fechar():
    corpo = (aviso('urgencia', 'Ainda há 2 repasses pendentes neste caso.', f'O financeiro do caso só encerra com tudo recebido e tudo repassado. Faltam {R(3818.40)}.')
             + f'<ul class="fi-check"><li class="falta">{ico("alerta")}<span><b>Oliveira &amp; Prates Advocacia:</b> {R(2318.40)}<small>parceiro · combinado para até 20/11</small></span></li>'
             + f'<li class="falta">{ico("alerta")}<span><b>Dr. Rui Tavares:</b> {R(1500)}<small>perito · esperando a nota fiscal</small></span></li></ul>'
             + f'<p class="fi-ref">{ico("ajuda")}<span>Registre os dois repasses e o caso fica pronto para encerrar. Se algum não vai acontecer (por exemplo, o perito abriu mão), registre isso no repasse, com o motivo. Assim nada some sem explicação.</span></p>')
    pe = (f'<button class="btn btn-sec" type="button" data-fechar data-foco>Voltar ao caso</button>'
          f'<button class="btn btn-pri" type="button">{ico("enviar")}Registrar repasse ao parceiro</button>')
    return janela('janela-fechar', 'Fechamento do caso', 'Ainda não dá para encerrar', 'Este é o caso de Irene Castro, RPV de 12/11/2026.', corpo, pe, alerta=True, abrir=True)


# ================================================================= 5. CAIXA
MESES = [  # (mes, sub, E prev, E real, S prev, S real, saldo, futuro, rpv)
    ('Setembro', '', 45600, 39910, 41200, 41640, 28270, False, 0),
    ('Outubro', '', 47200, 45050, 41400, 40870, 32450, False, 0),
    ('Novembro', 'até hoje', 48300, 31240, 40900, 23380, 40310, False, 0),
    ('Dezembro', 'previsto', 46900, None, 46600, None, 40150, True, 0),
    ('Janeiro', 'previsto', 49660, None, 41300, None, 48510, True, 4860),
    ('Fevereiro', 'previsto', 45200, None, 41300, None, 52410, True, 0),
]


def caixa():
    bot = f'<button class="btn btn-pri" type="button" data-janela="janela-exportar">{ico("baixar")}Exportar para o contador</button>'
    cab = cab_secao('Financeiro', 'Caixa', 'O que entrou e saiu, o que está previsto e o saldo do escritório, sem misturar o que é de terceiros.', bot)
    saldos = (f'<div class="fi-saldos"><section class="fi-saldo campo-vinho" aria-labelledby="t-s1" style="position:relative">{ico("coluna", "ico estatua")}<p class="sobretitulo" id="t-s1">Do escritório · hoje</p>'
              f'<p><span class="fi-big num">{R(40310)}</span></p><p>Saldo do caixa do escritório. Se tudo o que está previsto entrar e sair, fecha novembro em <b>{R(39850)}</b>.</p></section>'
              f'<section class="fi-saldo campo-ambar" aria-labelledby="t-s2" style="position:relative"><p class="fi-terc-rot" id="t-s2">{ico("escudo")}De terceiros · hoje</p>'
              f'<p><span class="fi-big num">{R(30284.96)}</span></p><p>Está na conta, mas não é do escritório e <b>não entra na previsão</b>. É de 3 clientes, 1 perito e 1 parceiro, mais honorários a transferir.</p>'
              f'<a class="btn btn-escuro" href="{ARQ}repasses" style="justify-self:start;margin-top:4px">{ico("enviar")}Ver repasses</a></section></div>')
    mx = 50000
    bar = ''
    for m, sub, ep, er, sp, sr, saldo, fut, rpv in MESES:
        s = f'<small>{sub}</small>' if sub else ''
        cls = ' fi-hoje' if m == 'Novembro' else ''
        if fut:
            base = ep - rpv
            tr = (f'<span class="fi-duplo" aria-hidden="true"><span class="fi-trilho"><i class="prev" style="width:{ep / mx * 100:.1f}%"></i>'
                  + (f'<i class="rpv" style="left:{base / mx * 100:.1f}%;width:{rpv / mx * 100:.1f}%;border-radius:0 4px 4px 0"></i>' if rpv else '') + '</span></span>')
            val = f'<b class="num">{R(ep)}</b> previstos' + (f'<br>dos quais {R(rpv)} de RPV' if rpv else '')
        else:
            tr = (f'<span class="fi-duplo" aria-hidden="true"><span class="fi-trilho"><i class="prev" style="width:{ep / mx * 100:.1f}%"></i></span>'
                  f'<span class="fi-trilho"><i class="real" style="width:{er / mx * 100:.1f}%"></i></span></span>')
            val = f'<b class="num">{R(er)}</b> realizados<br>de {R(ep)} previstos'
        bar += f'<div class="fi-mes{cls}"><span class="rot">{m}{s}</span>{tr}<span class="val">{val}</span></div>'
    leg = (f'<p class="legenda fi-leg"><span><i style="background:var(--ambar-3);box-shadow:inset 0 0 0 1px var(--vinho-4)"></i>Previsto</span>'
           f'<span><i style="background:var(--vinho)"></i>Realizado</span><span><i style="background:var(--ambar)"></i>RPV ou precatório com data estimada</span></p>')
    rows = ''
    for m, sub, ep, er, sp, sr, saldo, fut, rpv in MESES:
        f = lambda v: R(v) if v is not None else '<span class="fi-pq">—</span>'
        cls = ' class="fi-futuro"' if fut else ''
        rows += (f'<tr{cls}><td><b style="font-weight:500">{m}</b>{" <span class=fi-pq>(" + sub + ")</span>" if sub else ""}</td><td class="num">{R(ep)}</td><td class="num">{f(er)}</td>'
                 f'<td class="num">{R(sp)}</td><td class="num">{f(sr)}</td><td class="num"><b style="font-weight:600">{R(saldo)}</b></td></tr>')
    tab = (f'<div style="overflow-x:auto" class="so-pc"><table class="fi-tab fi-tab-caixa"><caption class="sr">Entradas, saídas e saldo por mês</caption>'
           f'<colgroup><col style="width:18%"><col><col><col><col><col></colgroup>'
           f'<thead><tr><th scope="col">Mês</th><th scope="col">Entradas previstas</th><th scope="col">Entradas realizadas</th><th scope="col">Saídas previstas</th><th scope="col">Saídas realizadas</th><th scope="col">Saldo no fim</th></tr></thead>'
           f'<tbody>{rows}</tbody></table></div>')
    car = ''.join(f'<li class="cartao"><div class="c-topo"><div><strong class="c-nome" style="font-size:18px">{m}</strong><small>{sub or "realizado"}</small></div></div>'
                  f'<dl class="c-dados"><dt>Entradas</dt><dd class="num">{R(er) if er is not None else R(ep) + " prev."}</dd><dt>Saídas</dt><dd class="num">{R(sr) if sr is not None else R(sp) + " prev."}</dd><dt>Saldo no fim</dt><dd class="num">{R(saldo)}</dd></dl></li>'
                  for m, sub, ep, er, sp, sr, saldo, fut, rpv in MESES)
    prev = folha('t-prev', 'Previsto e realizado', f'<div class="fi-meses" role="group" aria-label="Entradas do escritório por mês, previstas e realizadas">{bar}</div>{leg}'
                 f'<p class="fi-sub3" style="margin-top:0">Mês a mês</p>{tab}<ul class="cartoes so-cel" aria-label="Mês a mês">{car}</ul>',
                 sub='Entradas do escritório, de setembro a fevereiro. Saldo de novembro em diante é previsão.', icone='moeda')
    rpvs = folha('t-rpvs', 'RPVs e precatórios a caminho', (
        f'<ul class="fi-linhas">'
        f'<li class="fi-linha" style="grid-template-columns:minmax(0,1fr) auto"><div class="fi-quem"><strong>Eduardo Nascimento · RPV</strong><small>Expedida em 02/10/2026 · TRF da 3ª Região · valor requisitado {R(16200)}</small>'
        f'<p class="fi-prox">{ico("agenda")}Data estimada: <b>janeiro de 2027</b> · conta em Caixa</p></div><div class="fi-lado"><span class="fi-v num">{R(4860)}</span><span class="fi-pq">honorários (30%)</span></div></li>'
        f'<li class="fi-linha" style="grid-template-columns:minmax(0,1fr) auto"><div class="fi-quem"><strong>Hélio Batista Corrêa · Precatório</strong><small>Inscrito em 2026 · TJSP · valor requisitado {R(71000)}</small>'
        f'<p class="fi-prox">{ico("agenda")}Data estimada: <b>até dezembro de 2027</b> · fora do gráfico</p></div><div class="fi-lado"><span class="fi-v num">{R(21300)}</span><span class="fi-pq">honorários (30%)</span></div></li></ul>'
        f'<div class="fi-reserva">{ico("cadeado")}<span><b>Atualização do valor</b> entre a requisição e o pagamento, com a diferença entre o previsto e o recebido, ainda está em validação com os pilotos.</span></div>'),
        sub='Só a parte do escritório entra na previsão. A do cliente vai para Repasses quando chegar.', icone='balanca')
    exp = folha('t-exp', 'Para o contador', (
        f'<dl class="fi-dl"><div><dt>Outubro de 2026</dt><dd>Enviado em 05/11<br><span class="fi-pq">por Marina Ribeiro</span></dd></div>'
        f'<div><dt>Novembro de 2026</dt><dd>Pronto a partir de 01/12</dd></div>'
        f'<div><dt>Para quem vai</dt><dd>Contabilidade Silva<br><span class="fi-pq">contato@exemplo.com.br</span></dd></div></dl>'
        f'<div class="fi-cob"><button class="btn btn-sec" type="button" data-janela="janela-exportar">{ico("baixar")}Exportar um mês</button></div>'), icone='doc',
        sub='Recebimentos, despesas, recibos e comprovantes do mês')
    conc = (f'<section class="folha" aria-labelledby="t-conc"><div class="folha-cab"><div><h2 id="t-conc">{ico("filtro")}Conferência com o extrato</h2></div></div>'
            f'<div class="fi-reserva">{ico("cadeado")}<span><b>Conferir com o extrato do banco</b>, apontando o que saiu sem lançamento, ainda está em validação com os pilotos. Este é o lugar dela.</span></div></section>')
    return (f'<div class="fi">{cab}{saldos}<div class="fi-grade"><div class="fi-col">{prev}</div>'
            f'<aside class="fi-col" aria-label="A caminho e contador">{rpvs}{exp}{conc}</aside></div></div>')


def j_exportar():
    corpo = (selecao('ex-mes', 'Mês', ['Novembro de 2026 (ainda aberto)', 'Outubro de 2026', 'Setembro de 2026'], 'Outubro de 2026')
             + f'<div><p class="fi-rotulo" style="margin-bottom:6px">O que vai no arquivo</p><ul class="fi-check">'
             + f'<li>{ico("check")}<span>42 recebimentos, por categoria de honorário<small>{R(45050)}</small></span></li>'
             + f'<li>{ico("check")}<span>31 despesas, por categoria<small>{R(40870)}</small></span></li>'
             + f'<li>{ico("check")}<span>40 recibos emitidos e 58 comprovantes, notas e guias</span></li>'
             + f'<li>{ico("escudo")}<span>Valores de terceiros numa aba à parte<small>{R(6300)} entraram e foram repassados. Não são receita do escritório.</small></span></li>'
             + f'<li class="falta">{ico("alerta")}<span><b>3 despesas sem nota fiscal</b><small>Sistema de petições, 21/10 · Táxi, 14/10 · Cartório, 08/10. Vão marcadas na planilha.</small></span></li></ul></div>'
             + f'<fieldset class="fi-grupo-op"><legend>Formato</legend><label class="opcao"><input class="marcar" type="radio" name="ex-f" checked><span>Planilha (.xlsx) e pasta com os arquivos (.zip)<small>O mais pedido pelos contadores</small></span></label>'
             + f'<label class="opcao"><input class="marcar" type="radio" name="ex-f"><span>Só a planilha (.csv)</span></label></fieldset>'
             + f'<label class="opcao"><input class="marcar" type="checkbox" checked><span>Mandar também por e-mail à Contabilidade Silva<small>contato@exemplo.com.br</small></span></label>'
             + f'<p class="fi-ref">{ico("historico")}<span>A exportação fica no histórico do escritório, com quem gerou e quando.</span></p>')
    pe = f'<button class="btn btn-sec" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="button" data-foco>{ico("baixar")}Exportar outubro</button>'
    return janela('janela-exportar', 'Caixa', 'Exportar para o contador', 'Tudo o que o contador pede do mês, num arquivo só.', corpo, pe, abrir=True)


# ================================================================= estados
def A(secao, titulo=None, trilha=None):
    return dict(area='financeiro', secao=secao, atual='financeiro', trilha=trilha or f'Financeiro|{secao}', titulo=titulo or secao)


T = ''
T += tpl('resumo', resumo(), **A('Resumo'))
T += tpl('resumo-vazio', resumo_vazio(), **A('Resumo'))
T += tpl('receber', receber() + j_registrar(), **A('A receber'))
T += tpl('contrato', ficha_contrato() + j_registrar(), **A('A receber', 'Hélio Batista Corrêa', 'Financeiro|A receber|Hélio Batista Corrêa'))
T += tpl('registrar', ficha_contrato() + j_registrar(abrir=True), **A('A receber', 'Hélio Batista Corrêa', 'Financeiro|A receber|Hélio Batista Corrêa'))
T += tpl('registrar-erro', ficha_contrato() + j_registrar(erros=True), **A('A receber', 'Hélio Batista Corrêa', 'Financeiro|A receber|Hélio Batista Corrêa'))
T += tpl('recebido', ficha_contrato(True) + j_registrar(), **A('A receber', 'Hélio Batista Corrêa', 'Financeiro|A receber|Hélio Batista Corrêa'))
T += tpl('pagar', pagar(), **A('A pagar'))
T += tpl('nova-conta', pagar() + j_nova_conta(), **A('A pagar', 'Lançar conta'))
T += tpl('repasses', repasses(), **A('Repasses'))
T += tpl('registrar-rpv', repasses() + j_rpv(), **A('Repasses', 'Registrar alvará ou RPV'))
T += tpl('prestacao', repasses() + j_prestacao(), **A('Repasses', 'Prestação de contas'))
T += tpl('repasse', ficha_repasse(), **A('Repasses', 'Irene Castro', 'Financeiro|Repasses|Irene Castro'))
T += tpl('fechar-bloqueado', ficha_repasse() + j_fechar(), **A('Repasses', 'Irene Castro', 'Financeiro|Repasses|Irene Castro'))
T += tpl('caixa', caixa(), **A('Caixa'))
T += tpl('exportar', caixa() + j_exportar(), **A('Caixa', 'Exportar para o contador'))

barras = ''.join(f'<template data-barra="financeiro|{s}">{barra_area("financeiro", s)}</template>\n' for s in AREA['financeiro'][3])
# Os links da barra de seções levam aos estados desta tela
for s, e in [('Resumo', 'resumo'), ('A receber', 'receber'), ('A pagar', 'pagar'), ('Repasses', 'repasses'), ('Caixa', 'caixa')]:
    barras = barras.replace(f'<a href="#">{H(s)}</a>', f'<a href="{ARQ}{e}">{H(s)}</a>').replace(f'<a href="#" aria-current="page">{H(s)}</a>', f'<a href="{ARQ}{e}" aria-current="page">{H(s)}</a>')

out = pagina('Financeiro', 'Financeiro do escritório no Portal: resumo, a receber, a pagar, repasses de valores de terceiros e caixa.',
             '{"estado":"resumo","atual":"financeiro"}', '', T, barras)
out = out.replace('</style>', CSS_FI + '\n</style>', 1)
open(f'{SAIDA}/financeiro.html', 'w', encoding='utf-8').write(out)
print('financeiro ok', T.count('<template data-est='), 'estados')
