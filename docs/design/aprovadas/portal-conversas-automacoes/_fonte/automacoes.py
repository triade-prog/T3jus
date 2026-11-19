# Portal · Conversas › Automações (PA-03; EX-11, EX-14, FI-12, FI-04, PD-07, EX-10, PA-01, PT-03, PT-10).
# Parte do desenho aprovado de Conversas: moldura do Portal v1 (comum.py, sem mudança), extra.py e o CSS cv- aprovado.
# Peças novas com prefixo au-. Uso: python3 automacoes.py <pasta-saida>
import sys, os, re
from extra import *

SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
U = 'automacoes.html?estado='
CONV = 'conversas.html?estado='

# CSS aprovado das Conversas (cv-), lido do conversas.py sem mudança
_cv = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'conversas.py'), encoding='utf-8').read()
CSS_CV = _cv[_cv.index('CSS_CV = r"""') + 13:_cv.index('"""', _cv.index('CSS_CV = r"""') + 13)]

# Ícones novos, no mesmo traço (grade 24, 1,6, cantos vivos)
SPRITE_AU = ('<svg xmlns="http://www.w3.org/2000/svg" style="display:none">'
             '<symbol id="i-raio" viewBox="0 0 24 24"><path d="M13.5 3 5 13.5h6.5L10.5 21 19 10.5h-6.5L13.5 3Z"/></symbol>'
             '<symbol id="i-ramo" viewBox="0 0 24 24"><path d="M12 3v7"/><path d="m12 10-7 6.5V21"/><path d="m12 10 7 6.5V21"/><path d="M12 10v11"/></symbol>'
             '<symbol id="i-ligar" viewBox="0 0 24 24"><path d="M12 3v9"/><path d="M7 6.2a7.5 7.5 0 1 0 10 0"/></symbol>'
             '<symbol id="i-fluxo" viewBox="0 0 24 24"><path d="M4 3h7v5H4Z"/><path d="M13 16h7v5h-7Z"/><path d="M7.5 8v4h9v4"/></symbol>'
             '<symbol id="i-espera" viewBox="0 0 24 24"><path d="M6 3h12M6 21h12"/><path d="M7 3c0 5 10 5 10 9s-10 4-10 9"/><path d="M17 3c0 5-10 5-10 9s10 4 10 9"/></symbol>'
             '<symbol id="i-fim" viewBox="0 0 24 24"><path d="M5 5h14v14H5Z"/></symbol>'
             '<symbol id="i-celular" viewBox="0 0 24 24"><path d="M7 2.5h10v19H7Z"/><path d="M11 18.5h2"/></symbol>'
             '<symbol id="i-alvo" viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Z"/><path d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z"/></symbol>'
             '</svg>')

CSS_AU = r"""
/* ==========================================================================
   Portal · Conversas › Automações. Prefixo au- nas peças novas.
   ========================================================================== */
.au{display:flex;flex-direction:column;gap:24px;min-width:0}
.au-grade{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:24px;align-items:start}
.au-col{display:flex;flex-direction:column;gap:24px;min-width:0}
.au-acoes-cab{display:flex;gap:10px;flex-wrap:wrap}

/* Lista */
.au-num{display:flex;gap:28px;flex-wrap:wrap;padding:0 24px 18px}
.au-num div{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--texto-2);line-height:1.3}
.au-num .disco{--d:40px;--f:20px}
.au-num .disco.urg{--c:var(--vinho-3);color:var(--papel)}
.au-tab td{vertical-align:middle}
.au-tab th[scope=rowgroup]{background:var(--sal-2);text-align:left;font-family:var(--serifa);font-size:17px;font-weight:600;color:var(--vinho);letter-spacing:0;text-transform:none;padding:12px 24px}
.au-tab th[scope=rowgroup] small{font-family:var(--fonte-texto,inherit);font-size:12px;font-weight:400;color:var(--texto-2);margin-left:8px}
.au-nome{display:flex;gap:12px;align-items:flex-start}
.au-nome>.ico{color:var(--vinho);margin-top:3px;flex:none}
.au-nome a{font-family:var(--serifa);font-size:17px;font-weight:500;color:var(--vinho);text-decoration:none;line-height:1.25;display:block;padding:12px 0 11px;margin:-12px 0 -9px}
.au-nome a:hover{text-decoration:underline}
.au-nome small{display:block;font-size:12.5px;color:var(--texto-2);line-height:1.45}
.au-sit{display:grid;gap:4px;justify-items:start}
.au-sit .selo{white-space:normal;height:auto;min-height:26px;padding:4px 10px;line-height:1.25}
.au-sit small{font-size:12px;color:var(--texto-2);line-height:1.4}
.au-7d{font-size:13px;line-height:1.45}
.au-7d b{font-weight:600;font-variant-numeric:tabular-nums}
.au-7d .falha{display:inline-flex;align-items:center;gap:4px;color:var(--vinho-3);font-weight:500}
.au-7d .falha .ico{width:14px;height:14px}
.au-quem{font-size:12.5px;color:var(--texto-2);line-height:1.45}
.au-quem b{font-weight:500;color:var(--texto)}
.au-tab tr.au-rasc td{background:#FFFBF8}
.au-tab tr.au-rasc td:first-child{box-shadow:inset 3px 0 0 var(--ambar)}
.au-lim{list-style:none;margin:0;padding:0 24px 18px;display:grid;gap:12px}
.au-lim li{display:grid;grid-template-columns:22px minmax(0,1fr);gap:10px;font-size:13px;line-height:1.5}
.au-lim .ico{width:18px;height:18px;color:var(--vinho);margin-top:1px}
.au-lim b{font-weight:600}
.au-lim small{display:block;font-size:12px;color:var(--texto-2)}
.au-vazio{padding:8px 24px 24px}
.au-ex{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:8px;text-align:left}
.au-ex button{width:100%;min-height:44px;display:flex;align-items:center;gap:10px;padding:8px 14px;border-radius:var(--raio);border:1px dashed var(--vinho-4);background:var(--papel);font:inherit;font-size:13px;color:var(--texto);text-align:left;cursor:pointer;line-height:1.4}
.au-ex button:hover{background:var(--ambar-3)}
.au-ex .ico{color:var(--vinho);flex:none}

/* Cabeçalho do editor e passos */
.au-ed-cab{display:flex;align-items:flex-end;justify-content:space-between;gap:16px 24px;flex-wrap:wrap}
.au-ed-cab h1{font-size:36px;line-height:1.08;margin-top:6px}
.au-ed-cab .selos{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;align-items:center}
.au-ed-cab .selos span.sub{font-size:12.5px;color:var(--texto-2)}
.au-passos{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));background:var(--papel);border:1px solid var(--borda-folha);border-radius:var(--raio-g);overflow:hidden}
.au-passos li{min-width:0}
.au-passos li+li{border-left:1px solid var(--divisor)}
.au-passos a,.au-passos .bloq{position:relative;display:flex;align-items:center;gap:12px;min-height:64px;padding:10px 16px;text-decoration:none;color:var(--texto)}
.au-passos a:hover{background:#FCF8F5}
.au-passos .disco{--d:34px;--f:18px}
.au-passos strong{display:block;font-weight:600;font-size:14px;line-height:1.25}
.au-passos small{display:block;font-size:12px;color:var(--texto-2);line-height:1.35}
.au-passos [aria-current="step"]{background:var(--ambar-3)}
.au-passos [aria-current="step"] .disco{--c:var(--vinho);color:var(--papel)}
.au-passos [aria-current="step"] strong{color:var(--vinho)}
.au-passos [aria-current="step"] small{color:var(--tinta)}
.au-passos [aria-current="step"]::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:var(--vinho)}
.au-passos .feito .disco{--c:var(--papel);box-shadow:inset 0 0 0 1.5px var(--vinho-4)}
.au-passos .bloq{color:var(--texto-2)}
.au-passos .bloq .disco{--c:var(--sal-2);color:var(--texto-2)}
.au-passos .bloq strong{color:var(--texto-2);font-weight:500}

.au-editor{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:24px;align-items:start}
.au-editor.largo{grid-template-columns:minmax(0,1fr) 400px}

/* Faixa das sugestões e legenda */
.au-faixa{display:flex;align-items:center;gap:12px 16px;flex-wrap:wrap;padding:14px 20px;background:var(--ambar-3);border-bottom:1px solid var(--ambar-2)}
.au-faixa>.ico{color:var(--vinho);flex:none}
.au-faixa p{flex:1 1 260px;min-width:0;font-size:13.5px;line-height:1.45;color:var(--tinta)}
.au-faixa p b{font-weight:600}
.au-faixa .bts{display:flex;gap:8px;flex-wrap:wrap}
.au-ferr{display:flex;align-items:center;gap:10px 18px;flex-wrap:wrap;padding:10px 20px;border-bottom:1px solid var(--divisor);font-size:12.5px;color:var(--texto-2)}
.au-leg{display:flex;gap:16px;flex-wrap:wrap;margin-right:auto}
.au-leg span{display:inline-flex;align-items:center;gap:8px}
.au-leg i{display:inline-block;width:26px;height:16px;border-radius:4px;border:1.5px solid var(--vinho-4);background:var(--papel)}
.au-leg i.t{border:1.5px dashed var(--vinho-2);background:#FFFCFA}
.au-leg i.e{border-color:var(--vinho-3);box-shadow:inset 3px 0 0 var(--vinho-3)}

/* O desenho do fluxo: lista ordenada, de cima para baixo, com ramos lado a lado */
.au-tela{padding:28px 20px 36px;background-color:#FCF8F5;background-image:radial-gradient(var(--borda-folha) 1.2px,transparent 1.3px);background-size:22px 22px;overflow:hidden}
.au-fluxo{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;align-items:center}
.au-fluxo>li{position:relative;width:min(380px,100%);padding-top:30px}
.au-fluxo>li.au-li-ramo{width:100%}
.au-fluxo>li::before{content:"";position:absolute;left:calc(50% - 1px);top:0;height:30px;width:2px;background:var(--vinho-4)}
.au-fluxo>li::after{content:"";position:absolute;left:calc(50% - 5px);top:24px;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid var(--vinho-4)}
.au-tela>.au-fluxo>li:first-child{padding-top:0}
.au-tela>.au-fluxo>li:first-child::before,.au-tela>.au-fluxo>li:first-child::after{display:none}
.au-fluxo>li.sug::before{background:repeating-linear-gradient(to bottom,var(--vinho-2) 0 5px,transparent 5px 9px)}
.au-fluxo>li.sug::after{border-top-color:var(--vinho-2)}
.au-li-ramo>.au-b{width:min(380px,100%);margin:0 auto}

.au-ramos{list-style:none;margin:0;padding:48px 0 0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;position:relative}
.au-ramos::after{content:"";position:absolute;left:calc(50% - 1px);top:0;height:24px;width:2px;background:var(--vinho-4)}
.au-ramos::before{content:"";position:absolute;top:24px;left:calc((100% - 28px)/6);right:calc((100% - 28px)/6);height:2px;background:var(--vinho-4)}
.au-ramos.sug::after{background:repeating-linear-gradient(to bottom,var(--vinho-2) 0 5px,transparent 5px 9px)}
.au-ramos.sug::before{background:repeating-linear-gradient(to right,var(--vinho-2) 0 5px,transparent 5px 9px)}
.au-ramos>li{position:relative;min-width:0;display:flex;flex-direction:column;align-items:center}
.au-ramos>li::before{content:"";position:absolute;left:calc(50% - 1px);top:-24px;height:24px;width:2px;background:var(--vinho-4)}
.au-ramos.sug>li::before{background:repeating-linear-gradient(to bottom,var(--vinho-2) 0 5px,transparent 5px 9px)}
.au-ramos .au-fluxo{width:100%}
.au-ramos .au-fluxo>li{width:100%;padding-top:22px}
.au-ramos .au-fluxo>li::before{height:22px}
.au-ramos .au-fluxo>li::after{top:16px}
.au-rot{display:inline-flex;align-items:center;gap:6px;min-height:30px;padding:4px 12px;border-radius:15px;background:var(--papel);border:1.5px solid var(--vinho-4);font-size:12.5px;font-weight:600;color:var(--vinho);text-align:center;line-height:1.25;max-width:100%}
.au-ramos.sug .au-rot{border-style:dashed;border-color:var(--vinho-2)}
.au-rot .ico{width:14px;height:14px;flex:none}

/* Bloco */
.au-b{position:relative;background:var(--papel);border:1.5px solid var(--vinho-4);border-radius:12px;padding:12px 14px 13px;display:grid;gap:6px;text-align:left;box-shadow:0 1px 0 rgba(42,26,34,.04),0 8px 18px -14px rgba(105,39,70,.45);scroll-margin:96px}
.au-b.sug{border-style:dashed;border-color:var(--vinho-2);background:#FFFCFA;box-shadow:none}
.au-b.erro{border-color:var(--vinho-3);border-width:2px;box-shadow:inset 4px 0 0 var(--vinho-3)}
.au-b.sel,.au-b:target{outline:3px solid var(--ambar);outline-offset:3px}
.au-b.eu{box-shadow:inset 0 0 0 1px var(--vinho-4),0 0 0 4px var(--ambar-3)}
.au-b-cab{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-height:30px}
.au-ic{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;background:var(--sal-2);color:var(--vinho);flex:none}
.au-ic .ico{width:18px;height:18px}
.au-b.t-gatilho .au-ic{background:var(--ambar);color:var(--tinta)}
.au-b.t-ia .au-ic{background:var(--ambar-3)}
.au-b.t-pessoa .au-ic{background:var(--vinho);color:var(--ambar-3)}
.au-tipo{font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--vinho-2);line-height:1.2}
.au-b-cab .selo{margin-left:auto;height:24px;font-size:11px;padding:0 8px}
.au-b h3{font-family:var(--serifa);font-size:18px;font-weight:500;color:var(--vinho);line-height:1.2;margin:0}
.au-det{font-size:12.5px;color:var(--texto-2);line-height:1.45}
.au-det b{font-weight:500;color:var(--texto)}
.au-cita{font-size:12.5px;line-height:1.45;color:var(--texto);background:var(--sal-2);border-radius:8px;padding:8px 10px}
.au-cond{list-style:none;margin:0;padding:0;display:grid;gap:4px}
.au-cond li{display:grid;grid-template-columns:16px minmax(0,1fr);gap:6px;font-size:12.5px;line-height:1.4;color:var(--texto)}
.au-cond .ico{width:14px;height:14px;color:var(--vinho-2);margin-top:2px}
.au-b-acoes{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}
.au-b-acoes .btn{flex:1 1 auto;min-height:44px;padding:0 10px;font-size:13px}
.au-ed{margin-left:auto;width:44px;height:44px;margin:-8px -8px -8px auto;display:grid;place-items:center;border-radius:var(--raio);color:var(--vinho);text-decoration:none}
.au-ed:hover{background:var(--sal-2)}
.au-b-cab .selo+.au-ed{margin-left:0}
.au-ramos .au-b-cab{display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:6px 8px}
.au-ramos .au-b-cab .selo,.au-ramos .au-b-cab .au-voce{grid-column:1/-1;grid-row:2;justify-self:start;margin:0}
.au-ramos .au-b-cab .au-ed{grid-column:3;grid-row:1;margin:-8px -8px -8px 0}
.au-err{display:flex;gap:6px;align-items:flex-start;font-size:12.5px;line-height:1.45;color:var(--vinho-3);font-weight:500}
.au-err .ico{width:16px;height:16px;flex:none;margin-top:1px}
.au-falta{display:grid;justify-items:center;gap:8px;padding:12px;border:2px dashed var(--vinho-3);border-radius:12px;background:var(--papel);text-align:center;width:100%}
.au-falta p{font-size:12.5px;line-height:1.45;color:var(--vinho-3);font-weight:500}
.au-falta .btn{min-height:44px;font-size:13px}
.au-fim{display:inline-flex;align-items:center;gap:6px;min-height:30px;padding:4px 14px;border-radius:15px;background:var(--sal-2);border:1px solid var(--borda-folha);font-size:12.5px;color:var(--texto);line-height:1.3;text-align:center;max-width:100%}
.au-fim .ico{width:14px;height:14px;color:var(--vinho-4);flex:none}
.au-fluxo>li.au-li-fim{display:flex;justify-content:center}
.au-voce{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:var(--vinho);background:var(--ambar-3);border-radius:10px;padding:2px 8px}
.au-tela-pe{display:flex;gap:10px;align-items:flex-start;padding:12px 20px 16px;border-top:1px solid var(--divisor);font-size:12.5px;color:var(--texto-2);line-height:1.5}
.au-tela-pe .ico{width:16px;height:16px;color:var(--vinho-4);flex:none;margin-top:2px}

/* Assistente */
.au-as{display:flex;flex-direction:column;min-width:0;overflow:hidden}
.au-as-cab{display:flex;align-items:center;gap:12px;padding:18px 20px 14px;border-bottom:1px solid var(--divisor);background:var(--vinho);color:var(--papel)}
.au-as-cab .sobretitulo{color:var(--ambar-2)}
.au-as-cab h2{color:var(--papel);font-size:22px;line-height:1.15}
.au-as-cab .disco{--d:40px;--f:20px;--c:var(--vinho-2);color:var(--ambar-3)}
.au-as-cab .disco .ico{width:20px;height:20px}
.au-as-sec{padding:16px 20px;border-bottom:1px solid var(--divisor);display:grid;gap:10px}
.au-as-sec h3{font-size:13px;font-family:inherit;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--vinho-2);margin:0}
.au-pedido{justify-self:end;max-width:92%;padding:10px 13px 8px;border-radius:14px 4px 14px 14px;background:var(--vinho);color:var(--papel);font-size:13.5px;line-height:1.5}
.au-pedido .de{display:block;font-size:11px;font-weight:600;color:var(--ambar-3);margin-bottom:2px}
.au-pedido time{display:block;text-align:right;font-size:11px;color:var(--ambar-3);margin-top:2px}
.au-fez{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.au-fez li{display:grid;grid-template-columns:22px minmax(0,1fr);gap:8px;font-size:13px;line-height:1.45}
.au-fez .ok{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:var(--sal-2);color:var(--vinho)}
.au-fez .ok .ico{width:14px;height:14px;stroke-width:2.2}
.au-fez .al{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:var(--vinho-3);color:var(--papel);font-weight:700;font-size:13px;line-height:1}
.au-fez li.alerta>div{padding:10px 12px;border-radius:var(--raio);background:var(--papel);border:1px solid var(--borda-folha);box-shadow:inset 3px 0 0 var(--vinho-3)}
.au-fez b{font-weight:600}
.au-mostrar{display:inline-flex;align-items:center;gap:6px;min-height:44px;margin:-6px 0 -10px;font-size:12.5px;font-weight:500;color:var(--vinho)}
.au-mostrar .ico{width:16px;height:16px}
.au-chips{display:flex;flex-wrap:wrap;gap:6px}
.au-chips button{min-height:44px;padding:6px 14px;border-radius:22px;border:1px solid var(--borda-folha);background:var(--papel);font:inherit;font-size:12.5px;color:var(--vinho);cursor:pointer;text-align:left;line-height:1.3}
.au-chips button:hover{background:var(--ambar-3)}
.au-pedir{display:grid;gap:8px}
.au-pedir textarea{min-height:72px;padding:10px 12px;resize:vertical}
.au-pedir .btn{justify-self:end}
.au-as-pe{display:flex;gap:10px;align-items:flex-start;padding:14px 20px 18px;background:var(--sal-2);font-size:12.5px;line-height:1.5}
.au-as-pe .ico{color:var(--vinho);flex:none;margin-top:1px}
.au-as-pe b{font-weight:600}

/* Editar bloco */
.au-bl-corpo{padding:4px 20px 20px;display:grid;gap:16px}
.au-campos{display:flex;flex-wrap:wrap;gap:6px}
.au-campos button{min-height:44px;padding:0 12px;border-radius:var(--raio);border:1px solid var(--vinho-4);background:var(--papel);font:inherit;font-size:12.5px;font-weight:500;color:var(--vinho);cursor:pointer;font-variant-numeric:tabular-nums}
.au-campos button:hover{background:var(--ambar-3)}
.au-rot-p{font-weight:500;font-size:13px}
.au-wpp{background:var(--sal-2);border-radius:var(--raio);padding:14px 12px;display:grid;gap:6px}
.au-wpp .b{justify-self:end;max-width:92%;background:var(--papel);border:1px solid var(--borda-folha);border-radius:14px 4px 14px 14px;padding:9px 12px 6px;font-size:13.5px;line-height:1.5}
.au-wpp .b .de{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:var(--vinho-2);margin-bottom:2px}
.au-wpp .b .de .ico{width:14px;height:14px}
.au-wpp .b time{display:block;text-align:right;font-size:11px;color:var(--texto-2)}
.au-wpp .b u{text-decoration:underline;color:var(--vinho)}
.au-wpp>small{font-size:12px;color:var(--texto-2);text-align:center}
.au-hist{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.au-hist li{display:grid;grid-template-columns:52px minmax(0,1fr);gap:8px;font-size:12.5px;line-height:1.45}
.au-hist time{color:var(--texto-2);font-variant-numeric:tabular-nums}
.au-hist b{font-weight:500}
.au-bl-pe{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;padding:14px 20px 18px;border-top:1px solid var(--divisor)}
.au-voltar-cel{display:none}

/* Testar */
.au-teste{display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:24px;align-items:start}
.au-sim-ctl{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;padding:0 24px 18px}
.au-simfaixa{display:flex;gap:10px;align-items:center;padding:10px 24px;background:var(--ambar-3);font-size:13px;color:var(--tinta);line-height:1.45}
.au-simfaixa .ico{color:var(--vinho);flex:none}
.au-simfaixa b{font-weight:600}
.au-caminho{list-style:none;margin:0;padding:12px 24px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;border-bottom:1px solid var(--divisor)}
.au-caminho li{display:inline-flex;align-items:center;gap:6px;font-size:12px;line-height:1.3}
.au-caminho li span{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:12px;background:var(--sal-2);color:var(--texto)}
.au-caminho li span .ico{width:13px;height:13px;color:var(--vinho-2)}
.au-caminho li.r span{background:var(--vinho);color:var(--papel)}
.au-caminho li.r span .ico{color:var(--ambar-3)}
.au-caminho li+li::before{content:"›";color:var(--texto-2);font-size:14px}
.au-quem-l{list-style:none;margin:0;padding:0 24px 8px}
.au-quem-l li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 12px;padding:12px 0;border-top:1px solid var(--divisor);align-items:center}
.au-quem-l li:first-child{border-top:0}
.au-quem-l strong{font-weight:500;font-size:13.5px}
.au-quem-l small{grid-column:1/-1;font-size:12px;color:var(--texto-2);line-height:1.45}
.au-quem-l .selo{height:24px;font-size:11.5px}
.au-quem-l .btn{grid-column:1/-1;justify-self:start}
.au-sub3{display:flex;align-items:center;gap:10px;padding:14px 24px 4px;font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--vinho-2)}
.au-sub3::after{content:"";flex:1;height:1px;background:var(--borda-folha)}

/* Ligar */
.au-frase{margin:0 24px 20px;padding:18px 20px;border-radius:var(--raio);background:var(--sal-2);font-family:var(--serifa);font-size:20px;line-height:1.45;color:var(--tinta)}
.au-frase b{font-weight:600;color:var(--vinho)}
.au-conf{display:grid;gap:14px;padding:0 24px 22px}
.au-conf .btn-pri{justify-self:start}

/* Histórico */
.au-path{display:flex;flex-wrap:wrap;gap:4px;align-items:center;list-style:none;margin:0;padding:0}
.au-path li{display:inline-flex;align-items:center;gap:4px;font-size:12px;line-height:1.3}
.au-path li span{padding:3px 8px;border-radius:10px;background:var(--sal-2)}
.au-path li.r span{background:var(--sal-2);color:var(--texto)}
.au-path li.x span{background:var(--vinho-3);color:var(--papel)}
.au-path li.w span{background:var(--papel);box-shadow:inset 0 0 0 1px var(--vinho-4);color:var(--vinho-2)}
.au-path li+li::before{content:"›";color:var(--texto-2)}
.au-hist-tab tr.falha td{background:#FCF6F2}
.au-hist-tab tr.falha td:first-child{box-shadow:inset 3px 0 0 var(--vinho-3)}

@media (max-width:1180px){
  .au-editor,.au-editor.largo{grid-template-columns:minmax(0,1fr) 320px}
}
@media (max-width:760px){
  .au{gap:16px}
  .au-grade,.au-editor,.au-editor.largo,.au-teste{grid-template-columns:minmax(0,1fr);gap:16px}
  .au-col{gap:16px}
  .au-ed-cab h1{font-size:28px}
  .au-ed-cab .au-acoes-cab{width:100%}
  .au-ed-cab .au-acoes-cab .btn{flex:1 1 100%}
  .au-acoes-cab .btn{flex:1 1 100%}
  .au-passos{grid-template-columns:repeat(2,minmax(0,1fr))}
  .au-passos li:nth-child(3){border-left:0}
  .au-passos li:nth-child(n+3){border-top:1px solid var(--divisor)}
  .au-passos a,.au-passos .bloq{padding:10px 12px;gap:10px;min-height:60px}
  .au-faixa{padding:14px 16px}
  .au-faixa .bts{width:100%}
  .au-faixa .bts .btn{flex:1 1 0}
  .au-ferr{padding:10px 16px}
  .au-tela{padding:20px 12px 24px}
  .au-ramos{grid-template-columns:minmax(0,1fr);gap:0;padding:0}
  .au-ramos::before,.au-ramos::after{display:none}
  .au-ramos>li{align-items:stretch;padding:24px 0 0 18px;border-left:2px solid var(--vinho-4);margin-left:12px}
  .au-ramos.sug>li{border-left:2px dashed var(--vinho-2)}
  .au-ramos>li::before{display:none}
  .au-ramos>li>.au-rot{align-self:flex-start}
  .au-ramos .au-fluxo>li::before{left:22px}
  .au-ramos .au-fluxo>li::after{left:18px}
  .au-ramos .au-fluxo>li.au-li-fim{justify-content:flex-start}
  .au-li-ramo>.au-b{width:100%}
  .au-num{gap:14px;padding:0 16px 14px}
  .au-lim{padding:0 16px 16px}
  .au-vazio{padding:4px 16px 18px}
  .au-as-cab{padding:16px}
  .au-as-sec{padding:14px 16px}
  .au-as-pe{padding:12px 16px 16px}
  .au-bl-corpo{padding:4px 16px 16px}
  .au-bl-pe{padding:12px 16px 16px}
  .au-bl-pe .btn{flex:1 1 100%}
  .au-editor.bloco-aberto .au-lado{order:-1}
  .au-voltar-cel{display:inline-flex;align-items:center;gap:6px;min-height:44px;color:var(--vinho);font-weight:500;font-size:13px;text-decoration:none;padding:0 16px}
  .au-sim-ctl{grid-template-columns:minmax(0,1fr);padding:0 16px 14px}
  .au-simfaixa{padding:10px 16px}
  .au-caminho{padding:12px 16px}
  .au-quem-l{padding:0 16px 6px}
  .au-sub3{padding:12px 16px 4px}
  .au-frase{margin:0 16px 16px;padding:14px 16px;font-size:18px}
  .au-conf{padding:0 16px 18px}
  .au-conf .btn-pri{justify-self:stretch}
  .au-tela-pe{padding:12px 16px 14px}
}
"""

# ---------------------------------------------------------------- peças
def selo(tipo, txt, i=None):
    ic = ico(i) if i else ''
    return f'<span class="selo selo-{tipo}">{ic}{txt}</span>'

SIT = {
    'ligada': selo('ativo', 'Ligada', 'check'),
    'desligada': selo('neutro', 'Desligada', 'ligar'),
    'rascunho': selo('implant', 'Rascunho', 'lapis'),
    'aprovacao': selo('atencao', 'Em aprovação no WhatsApp', 'relogio'),
}
SUG = selo('implant', 'Sugerido pela IA', 'ia')


def bloco(id_, num, tipo, icone, titulo, corpo, cls='', sug=False, erro='', sel=False, ro=False, voce=False, editar=True, acoes=True):
    c = 'au-b t-' + cls + (' sug' if sug else '') + (' erro' if erro else '') + (' sel' if sel else '') + (' eu' if voce else '')
    tp = f'{num} · {tipo}' if num else tipo
    s = SUG if sug else ''
    if erro:
        s = selo('urgente', 'Precisa de ajuste', 'alerta')
    v = '<span class="au-voce">' + ico('pessoas', 'ico ico-s') + 'Você</span>' if voce else ''
    ed = ''
    if not sug and not ro and editar:
        ed = f'<a class="au-ed" href="{U}bloco" aria-label="Editar o passo {num}, {tipo}">{ico("lapis")}</a>'
    ac = ''
    if sug and acoes:
        ac = (f'<div class="au-b-acoes"><button class="btn btn-pri" type="button">{ico("check")}Aplicar<span class="sr"> o passo {num}, {tipo}</span></button>'
              f'<button class="btn btn-sec" type="button">{ico("x")}Recusar<span class="sr"> o passo {num}, {tipo}</span></button></div>')
    er = f'<p class="au-err" id="{id_}-er">{ico("alerta")}<span>{erro}</span></p>' if erro else ''
    sr = '<span class="sr">Sugerido pela IA, ainda não salvo. </span>' if sug else ''
    cur = ' aria-current="true"' if sel else ''
    return (f'<article class="{c}" id="{id_}" aria-labelledby="{id_}-t"{cur}><div class="au-b-cab"><span class="au-ic">{ico(icone)}</span>'
            f'<p class="au-tipo">{tp}</p>{v}{s}{ed}</div><h3 id="{id_}-t">{sr}{titulo}</h3>{corpo}{er}{ac}</article>')


def li(conteudo, sug=False, cls=''):
    c = ' '.join(x for x in [('sug' if sug else ''), cls] if x)
    return f'<li{f" class=\"{c}\"" if c else ""}>{conteudo}</li>'


def fim(txt='Fim'):
    return f'<li class="au-li-fim"><span class="au-fim">{ico("fim")}{txt}</span></li>'


def det(t):
    return f'<p class="au-det">{t}</p>'


MSG = ('Olá, {nome}. Aqui é do escritório Ribeiro & Matos. A parcela {parcela}, de {valor}, venceu em {vencimento} e ainda não aparece como paga. '
       'Se já pagou, pode desconsiderar esta mensagem. Para pagar, use o link: {link de pagamento}. Se precisar conversar sobre o pagamento, é só responder aqui.')
MSG_ERRO = MSG.replace('venceu em {vencimento}', 'venceu em {vencimento}, antes da {data da audiência}')


def fluxo_cobranca(modo):
    """modo: sugestao, aplicado, erros, ro, bloco"""
    sug = modo == 'sugestao'
    ro = modo == 'ro'
    sel_msg = modo == 'bloco'
    erros = modo == 'erros'
    situ_txt = 'Rascunho da IA, falta você aprovar' if modo in ('sugestao', 'erros') else ('Aprovado por Marina · em aprovação no WhatsApp' if ro else 'Rascunho da IA, falta você aprovar')
    b1 = bloco('b-gatilho', 1, 'Gatilho', 'raio', 'Parcela chega a 3 dias de atraso',
               det('Vem do Financeiro: parcela sem pagamento registrado 3 dias depois do vencimento.'), 'gatilho', ro=ro)
    b2 = bloco('b-cond', 2, 'Condições', 'filtro', 'Só quem pode receber cobrança',
               f'<ul class="au-cond"><li>{ico("check")}<span>Parcela sem combinado de pagamento no Financeiro</span></li>'
               f'<li>{ico("check")}<span>Contato principal tem WhatsApp</span></li>'
               f'<li>{ico("cadeado")}<span>Quem pediu para não receber avisos fica de fora (regra fixa)</span></li></ul>', 'condicao', ro=ro)
    trecho = MSG_ERRO if erros else MSG
    trecho = H(trecho[:118]) + '…'
    b3 = bloco('b-msg', 3, 'Mensagem', 'whats', 'Cobrança gentil · 1º aviso',
               f'<p class="au-cita">“{trecho}”</p>' + det(f'<b>Texto:</b> {situ_txt}. Sai das 8h às 20h, em dia útil.'),
               'mensagem', sug=sug, sel=sel_msg, ro=ro,
               erro=('O campo {data da audiência} não existe para este gatilho. A parcela tem: {nome}, {parcela}, {valor}, {vencimento} e {link de pagamento}.' if erros else ''))
    b4 = bloco('b-espera', 4, 'Espera', 'espera', 'Esperar até 5 dias',
               det('Segue antes se o cliente pagar ou responder. A espera conta dias corridos.'), 'espera', sug=sug, ro=ro)
    b5 = bloco('b-ramo', 5, 'Ramos', 'ramo', 'O que o cliente fez?', det('Três caminhos. Cada um termina em fim ou numa pessoa.'), 'ramo', sug=sug, ro=ro)
    b6 = bloco('b-ia', 6, 'IA responde', 'ia', 'A IA conversa com o cliente',
               det('Só com o que está no T3jus: valor, vencimento e link. Acordo, desconto ou reclamação vão para Gustavo.'), 'ia', sug=sug, ro=ro)
    if erros:
        b7 = bloco('b-pessoa', 7, 'Passar para pessoa', 'mao', 'Passar para: ninguém escolhido',
                   det('Motivo: 5 dias sem pagamento nem resposta.'), 'pessoa',
                   erro='Escolha uma pessoa ativa ou uma regra (quem cuida do caso, quem tem o Financeiro, a sócia dona). A conversa não pode ficar sem responsável.')
    else:
        b7 = bloco('b-pessoa', 7, 'Passar para pessoa', 'mao', 'Passar para Gustavo Lima',
                   det('Área Financeiro. Motivo: 5 dias sem pagamento nem resposta. Se Gustavo estiver fora ou sair da equipe, vai para quem tem o Financeiro; sem ninguém, para Marina.'),
                   'pessoa', sug=sug, ro=ro, voce=ro)
    r1 = f'<li><span class="au-rot">{ico("moeda")}Se pagou</span><ol class="au-fluxo">{fim("Fim · o aviso “Pagamento recebido” agradece")}</ol></li>'
    if erros:
        r2 = (f'<li><span class="au-rot">{ico("conversas")}Se respondeu</span><ol class="au-fluxo"><li>'
              f'<div class="au-falta" id="b-resp" role="group" aria-labelledby="b-resp-t"><p id="b-resp-t">{ico("alerta", "ico ico-s")} Este caminho não leva a nenhum passo. Quem responder ficaria sem ninguém.</p>'
              f'<button class="btn btn-sec" type="button">{ico("mais")}Adicionar passo</button></div></li></ol></li>')
    else:
        r2 = f'<li><span class="au-rot">{ico("conversas")}Se respondeu</span><ol class="au-fluxo">{li(b6, sug)}{fim()}</ol></li>'
    r3 = f'<li><span class="au-rot">{ico("relogio")}Nem pagou, nem respondeu</span><ol class="au-fluxo">{li(b7, sug)}{fim()}</ol></li>'
    ramos = f'<ul class="au-ramos{" sug" if sug else ""}" aria-label="Caminhos depois do passo 5">{r1}{r2}{r3}</ul>'
    return (f'<ol class="au-fluxo" aria-label="Passos da automação, de cima para baixo">{li(b1)}{li(b2)}{li(b3, sug)}{li(b4, sug)}'
            f'<li class="au-li-ramo{" sug" if sug else ""}">{b5}{ramos}</li></ol>')


def passos(atual, sit='rascunho', bloq_testar='', bloq_ligar='', ro=False):
    subs = {
        'montar': {'rascunho': '7 passos', 'sugestao': '5 sugestões para revisar', 'erros': '3 ajustes', 'ro': 'Só ver'},
    }
    itens = [
        ('montar', '1', 'Montar', 'sugestao', {'sugestao': '5 sugestões para revisar', 'erros': '3 passos para ajustar', 'ro': 'Só ver'}.get(sit, '7 passos, todos salvos')),
        ('testar', '2', 'Testar', 'testar', 'Sem enviar nada' if sit != 'feito' else 'Testada hoje, 10:20'),
        ('ligar', '3', 'Ligar', 'ligar', 'Só a sócia dona' if ro else ('Ligada desde 02/11' if sit == 'feito' else 'Revisar e ligar')),
        ('historico', '4', 'Histórico', 'historico', 'Ainda nada saiu' if sit != 'feito' else '14 em 30 dias'),
    ]
    h = ''
    for k, n, nome, est, sub in itens:
        b = bloq_testar if k == 'testar' else bloq_ligar if k == 'ligar' else ('Ainda nada saiu' if (k == 'historico' and sit not in ('feito',)) else '')
        if b:
            h += (f'<li><span class="bloq" role="link" aria-disabled="true"><span class="disco"><span>{n}</span></span><span><strong>{nome}</strong><small>{b}</small></span></span></li>')
            continue
        cur = ' aria-current="step"' if k == atual else ''
        feito = ' class="feito"' if (sit == 'feito' and k != atual) else ''
        h += f'<li><a href="{U}{est}"{cur}{feito}><span class="disco"><span>{n}</span></span><span><strong>{nome}</strong><small>{sub}</small></span></a></li>'
    return f'<nav aria-label="Passos da automação"><ol class="au-passos">{h}</ol></nav>'


def cab_editor(nome, sobre, situ, sub, acoes):
    return (f'<div class="au-ed-cab"><div><p class="sobretitulo">{sobre}</p><h1>{nome}</h1>'
            f'<div class="selos">{situ}<span class="sub">{sub}</span></div></div><div class="au-acoes-cab">{acoes}</div></div>')


NOME_COB = 'Cobrança gentil de parcela em atraso'


def assistente():
    fez = [
        ('ok', 'Mantive o <b>gatilho</b> e as <b>condições</b> que você já aplicou.', 'b-gatilho'),
        ('ok', 'Escrevi o <b>rascunho do texto</b>, educado e com o link de pagamento. Ele só vale depois que você aprovar.', 'b-msg'),
        ('ok', '<b>Espera de 5 dias</b>, como você pediu. Se o cliente pagar ou responder antes, segue na hora.', 'b-espera'),
        ('ok', 'Se <b>responder</b>, a IA conversa com o que está no T3jus. Acordo ou desconto vão para Gustavo.', 'b-ia'),
        ('ok', 'Se <b>não pagar nem responder</b>, passa para <b>Gustavo Lima</b>, do Financeiro, com o motivo.', 'b-pessoa'),
    ]
    alertas = [
        ('Já existe a automação <b>Parcela em atraso</b> ligada (1, 7 e 15 dias). Com as duas, o cliente receberia duas cobranças na mesma semana, acima do limite de 1 por semana. Sugiro desligar a antiga quando ligar esta.',
         f'<a class="au-mostrar" href="{U}lista">{ico("dir", "ico ico-s")}Ver a automação antiga</a>'),
        ('O texto é um <b>modelo novo</b>. Ao ligar, ele vai para aprovação no WhatsApp (Meta), que costuma levar até 1 dia. Até lá, nada sai.',
         f'<a class="au-mostrar" href="#b-msg">{ico("alvo")}Mostrar no desenho</a>'),
    ]
    lis = ''.join(f'<li><span class="ok" aria-hidden="true">{ico("check")}</span><div>{t}<br><a class="au-mostrar" href="#{a}">{ico("alvo")}Mostrar no desenho<span class="sr">: {re.sub("<[^>]+>", "", t)[:40]}</span></a></div></li>' for _, t, a in fez)
    al = ''.join(f'<li class="alerta"><span class="al" aria-hidden="true">!</span><div><span class="sr">Atenção: </span>{t}<br>{a}</div></li>' for t, a in alertas)
    return (f'<aside class="folha au-as" aria-labelledby="as-t"><div class="au-as-cab"><span class="disco">{ico("ia")}</span><div><p class="sobretitulo">IA do escritório</p><h2 id="as-t">Assistente</h2></div></div>'
            f'<section class="au-as-sec" aria-labelledby="as-p"><h3 id="as-p">Você pediu</h3>'
            f'<p class="au-pedido"><span class="de">Marina Ribeiro</span>Quero cobrar com educação quem atrasar a parcela, e se não pagar em 5 dias passa para o Gustavo.<time>10:04</time></p></section>'
            f'<section class="au-as-sec" aria-labelledby="as-f"><h3 id="as-f">O que a IA fez</h3><ul class="au-fez">{lis}</ul></section>'
            f'<section class="au-as-sec" aria-labelledby="as-a"><h3 id="as-a">Para você decidir · 2</h3><ul class="au-fez">{al}</ul></section>'
            f'<section class="au-as-sec" aria-labelledby="as-e"><h3 id="as-e">Experimente a seguir</h3><div class="au-chips">'
            f'<button type="button">Não cobrar entre 20/12 e 06/01</button><button type="button">Só parcelas acima de R$ 300,00</button><button type="button">Avisar Marina quando passar para Gustavo</button></div></section>'
            f'<form class="au-as-sec au-pedir" action="#" onsubmit="return false"><label class="au-rot-p" for="as-txt">Peça uma mudança</label>'
            f'<textarea class="entrada" id="as-txt" placeholder="Ex.: espere 7 dias em vez de 5"></textarea>'
            f'<button class="btn btn-sec" type="submit">{ico("enviar")}Pedir à IA</button></form>'
            f'<p class="au-as-pe">{ico("escudo")}<span><b>A IA sugere, você aprova.</b> Aplicar muda só o rascunho. Nada sai para cliente antes de testar e você ligar.</span></p></aside>')


def tela_montar(modo):
    sug = modo == 'sugestao'
    erros = modo == 'erros'
    faixa = ''
    if sug:
        faixa = (f'<div class="au-faixa" role="region" aria-label="Sugestões da IA">{ico("ia")}<p><b>5 passos sugeridos pela IA</b>: revise antes de aplicar. Você também pode aplicar ou recusar um por um.</p>'
                 f'<div class="bts"><button class="btn btn-sec" type="button">{ico("x")}Recusar tudo</button><button class="btn btn-pri" type="button">{ico("check")}Aplicar tudo</button></div></div>')
    if erros:
        faixa = ('<div style="padding:16px 20px 4px">' + aviso('urgencia', '3 passos precisam de ajuste antes de testar',
                 f'<a href="#b-msg">Passo 3, Mensagem: campo que o gatilho não tem</a> · <a href="#b-resp">Caminho “Se respondeu”: sem próximo passo</a> · <a href="#b-pessoa">Passo 7: passar para ninguém</a>') + '</div>')
    leg = (f'<div class="au-ferr"><div class="au-leg" aria-label="Legenda"><span><i aria-hidden="true"></i>Contorno contínuo: salvo no rascunho</span>'
           f'<span><i class="t" aria-hidden="true"></i>Tracejado: sugerido pela IA, ainda não salvo</span>'
           + ('<span><i class="e" aria-hidden="true"></i>Filete: precisa de ajuste</span>' if erros else '') +
           f'</div><button class="btn btn-sec so-pc" type="button">{ico("mais")}Adicionar passo</button></div>')
    tela = (f'<section class="folha" aria-labelledby="t-des" style="overflow:hidden"><h2 class="sr" id="t-des">Desenho do fluxo</h2>{faixa}{leg}'
            f'<div class="au-tela">{fluxo_cobranca(modo)}</div>'
            f'<p class="au-tela-pe">{ico("celular")}<span class="so-cel">No celular dá para aplicar e recusar sugestões, aprovar o texto e ligar. Para adicionar, mover ou apagar passos, use o computador.</span>'
            f'<span class="so-pc-i">O desenho também é uma lista: leitores de tela leem os passos em ordem, com os caminhos de cada ramo.</span></p></section>')
    if erros:
        bt, bl = 'Ajuste os 3 passos antes', 'Teste antes de ligar'
        situ = SIT['rascunho']
        sub = 'Salvo às 10:31 · 3 passos com ajuste'
        acoes = f'<span class="btn btn-pri" role="link" aria-disabled="true">{ico("olho")}Testar sem enviar</span>'
    else:
        bt, bl = '', 'Aplique ou recuse as sugestões'
        situ = SIT['rascunho']
        sub = 'Salvo às 10:05 · 2 passos salvos, 5 sugeridos'
        acoes = f'<span class="btn btn-sec" role="link" aria-disabled="true">{ico("olho")}Testar sem enviar</span>'
    cab = cab_editor(NOME_COB, 'Automação · criada com a IA hoje', situ, sub, acoes)
    return (f'<div class="au">{cab}{passos("montar", "erros" if erros else "sugestao", bt, bl)}'
            f'<div class="au-editor"><div class="au-col">{tela}</div><div class="au-col au-lado">{assistente() if sug else lado_erros()}</div></div></div>')


def lado_erros():
    return (f'<aside class="folha au-as" aria-labelledby="as-t"><div class="au-as-cab"><span class="disco">{ico("ia")}</span><div><p class="sobretitulo">IA do escritório</p><h2 id="as-t">Assistente</h2></div></div>'
            f'<section class="au-as-sec" aria-labelledby="as-a"><h3 id="as-a">O que falta · 3</h3><ul class="au-fez">'
            f'<li class="alerta"><span class="al" aria-hidden="true">!</span><div><b>Mensagem com campo que não existe.</b> {{data da audiência}} é de compromisso, não de parcela. Tire o campo ou troque o gatilho.<br><a class="au-mostrar" href="#b-msg">{ico("alvo")}Mostrar no desenho</a></div></li>'
            f'<li class="alerta"><span class="al" aria-hidden="true">!</span><div><b>Caminho sem saída.</b> Quem responder ficaria sem ninguém. Sugestão: a IA conversa e passa para Gustavo quando não souber.<br><a class="au-mostrar" href="#b-resp">{ico("alvo")}Mostrar no desenho</a></div></li>'
            f'<li class="alerta"><span class="al" aria-hidden="true">!</span><div><b>Passar para ninguém.</b> Toda conversa que espera alguém precisa de responsável.<br><a class="au-mostrar" href="#b-pessoa">{ico("alvo")}Mostrar no desenho</a></div></li></ul></section>'
            f'<section class="au-as-sec"><button class="btn btn-sec" type="button">{ico("ia")}Pedir à IA para corrigir os 3</button></section>'
            f'<p class="au-as-pe">{ico("escudo")}<span><b>A IA sugere, você aprova.</b> A correção chega tracejada, como qualquer sugestão.</span></p></aside>')


def tela_bloco():
    txt = MSG
    corpo = (campo('bl-nome', 'Nome do modelo', 'Cobrança gentil · 1º aviso', ajuda='Só a equipe vê. Aparece no histórico e em Avisos automáticos.')
             + f'<div class="pt-cuidado">{ico("ia")}<span><b>Rascunho da IA, ainda não vale.</b> Depois que você aprovar, o texto fica fixo: só mudam os campos de cada cliente. A IA não escreve aviso por cliente.</span></div>'
             + f'<div class="campo"><div class="campo-linha"><label for="bl-txt">Texto da mensagem</label><span class="contador" id="bl-cont">{len(txt)} de 1.024 caracteres</span></div>'
             f'<textarea class="entrada" id="bl-txt" name="bl-txt" aria-describedby="bl-cont bl-aj" style="min-height:190px" data-foco>{H(txt)}</textarea>'
             f'<p class="ajuda" id="bl-aj">Os campos entre chaves são trocados pelo dado de cada cliente. Use linguagem simples, sem ameaça nem exposição (CDC, art. 42).</p></div>'
             + f'<div class="campo" role="group" aria-labelledby="bl-cp"><p class="au-rot-p" id="bl-cp">Inserir campo · os que a parcela tem</p><div class="au-campos">'
             + ''.join(f'<button type="button">{{{c}}}</button>' for c in ['nome', 'parcela', 'valor', 'vencimento', 'link de pagamento', 'nome do escritório'])
             + '</div></div>'
             + f'<div class="campo" role="group" aria-labelledby="bl-pv"><p class="au-rot-p" id="bl-pv">Prévia · como Sueli Ramos, da Farmácia Bom Jesus, veria</p><div class="au-wpp">'
             f'<p class="b"><span class="de">{ico("whats")}Ribeiro &amp; Matos</span>Olá, Sueli. Aqui é do escritório Ribeiro &amp; Matos. A parcela Mensalidade de novembro, de R$ 1.800,00, venceu em 15/11 e ainda não aparece como paga. '
             f'Se já pagou, pode desconsiderar esta mensagem. Para pagar, use o link: <u>pag.t3jus.pro/rm/8F2K</u>. Se precisar conversar sobre o pagamento, é só responder aqui.<time>10:00</time></p>'
             f'<small>Prévia, nada foi enviado.</small></div></div>'
             + aviso('atencao', 'Modelo novo do WhatsApp', 'O WhatsApp só deixa o escritório começar uma conversa com texto aprovado pela Meta. Ao ligar, este texto vai para aprovação (costuma levar até 1 dia) e a automação fica “Em aprovação no WhatsApp”. Mudar o texto depois pede nova aprovação.', icone='relogio')
             + f'<div class="campo" role="group" aria-labelledby="bl-h"><p class="au-rot-p" id="bl-h">Histórico do texto</p><ul class="au-hist">'
             f'<li><time>10:05</time><span>A IA escreveu o rascunho, a partir do pedido de Marina.</span></li>'
             f'<li><time>10:09</time><span><b>Marina Ribeiro</b> trocou “débito” por “parcela” e tirou “urgente”.</span></li></ul></div>')
    painel = (f'<section class="folha au-as" aria-labelledby="bl-t"><a class="au-voltar-cel" href="{U}sugestao">{ico("esq", "ico ico-s")}Voltar ao fluxo</a>'
              f'<div class="folha-cab"><div><p class="sobretitulo">Passo 3 · Mensagem</p><h2 id="bl-t">Editar a mensagem</h2></div>'
              f'<a class="btn btn-fantasma" href="{U}sugestao" aria-label="Fechar a edição do passo">{ico("x")}</a></div>'
              f'<form class="au-bl-corpo" action="#" onsubmit="return false">{corpo}</form>'
              f'<div class="au-bl-pe"><button class="btn btn-sec" type="button">Salvar no rascunho</button><button class="btn btn-pri" type="button">{ico("check")}Aprovar o texto</button></div></section>')
    leg = (f'<div class="au-ferr"><div class="au-leg" aria-label="Legenda"><span><i aria-hidden="true"></i>Contorno contínuo: salvo no rascunho</span>'
           f'<span><i class="t" aria-hidden="true"></i>Tracejado: sugerido pela IA, ainda não salvo</span></div>'
           f'<button class="btn btn-sec so-pc" type="button">{ico("mais")}Adicionar passo</button></div>')
    tela = (f'<section class="folha" aria-labelledby="t-des" style="overflow:hidden"><h2 class="sr" id="t-des">Desenho do fluxo</h2>'
            f'<div style="padding:16px 20px 4px">{aviso("sucesso", "5 passos aplicados", "Estão no rascunho. A automação continua desligada.")}</div>'
            f'{leg}<div class="au-tela">{fluxo_cobranca("bloco")}</div></section>')
    cab = cab_editor(NOME_COB, 'Automação · criada com a IA hoje', SIT['rascunho'], 'Salvo às 10:09 · 7 passos, texto por aprovar',
                     f'<a class="btn btn-sec" href="{U}testar">{ico("olho")}Testar sem enviar</a>')
    return (f'<div class="au">{cab}{passos("montar", "rascunho")}'
            f'<div class="au-editor largo bloco-aberto"><div class="au-col">{tela}</div><div class="au-col au-lado">{painel}</div></div></div>')


def tela_testar():
    ctl = (selecao('ts-cli', 'Simular com', ['Farmácia Bom Jesus Ltda. · Mensalidade de novembro', 'Irene Castro · parcela 5 de 8', 'Hélio Batista Corrêa · parcela 3 de 6', 'Gabriela Teixeira · parcela 4 de 6'],
                   'Farmácia Bom Jesus Ltda. · Mensalidade de novembro', ajuda='Clientes com parcela em atraso hoje.')
           + opcoes_radio('ts-cam', 'E se o cliente', [('nada', 'Não pagar nem responder', ''), ('resp', 'Responder', ''), ('pagou', 'Pagar', '')], 'nada'))
    caminho = ''.join(f'<li class="{"r" if r else ""}"><span>{ico(i)}{t}</span></li>' for i, t, r in [
        ('raio', '1 Gatilho', True), ('filtro', '2 Condições', True), ('whats', '3 Mensagem', True), ('espera', '4 Espera', True),
        ('ramo', 'Nem pagou, nem respondeu', True), ('mao', '7 Passar para Gustavo', True), ('fim', 'Fim', True)])
    msgs = (f'<ol class="cv-msgs" aria-label="Conversa simulada">'
            f'<li class="cv-dia">Hoje, 18/11</li>'
            f'<li class="cv-sis">{ico("raio")}<span><b>Gatilho:</b> a mensalidade de novembro chegou a 3 dias de atraso. Condições conferidas: sem combinado, Sueli tem WhatsApp.<time>10:00</time></span></li>'
            f'<li class="cv-m eq"><div class="cv-b"><span class="de">Aviso automático · Cobrança gentil</span>Olá, Sueli. Aqui é do escritório Ribeiro &amp; Matos. A parcela Mensalidade de novembro, de R$ 1.800,00, venceu em 15/11 e ainda não aparece como paga. '
            f'Se já pagou, pode desconsiderar esta mensagem. Para pagar, use o link: pag.t3jus.pro/rm/8F2K. Se precisar conversar sobre o pagamento, é só responder aqui.<time>10:00</time></div></li>'
            f'<li class="cv-dia">Segunda, 23/11</li>'
            f'<li class="cv-sis">{ico("espera")}<span><b>5 dias</b> sem pagamento nem resposta.<time>10:00</time></span></li>'
            f'<li class="cv-sis">{ico("mao")}<span>A conversa passaria para <b>Gustavo Lima</b>, do Financeiro. Motivo: 5 dias sem pagamento nem resposta. Gustavo recebe aviso no sino e a conversa entra em “Precisa de alguém”.<time>10:00</time></span></li>'
            f'</ol>')
    sim = (f'<section class="folha" aria-labelledby="t-sim" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-sim">Simular sem enviar</h2><p class="sub">Escolha um cliente e o que ele faria. Nada sai pelo WhatsApp.</p></div></div>'
           f'<form class="au-sim-ctl" action="#" onsubmit="return false">{ctl}</form>'
           f'<p class="au-simfaixa">{ico("olho")}<span><b>Simulação.</b> Esta conversa não foi enviada. Os horários seguem os limites: 8h às 20h, em dia útil.</span></p>'
           f'<ol class="au-caminho" aria-label="Caminho percorrido no fluxo">{caminho}</ol>{msgs}</section>')
    entram = [('Farmácia Bom Jesus Ltda.', 'Mensalidade de novembro · R$ 1.800,00 · 3 dias', 'Para Sueli Ramos, gerente'),
              ('Irene Castro', 'Parcela 5 de 8 · R$ 600,00 · 5 dias', 'Para Irene, a própria'),
              ('Gabriela Teixeira', 'Parcela 4 de 6 · R$ 700,00 · 6 dias', 'Para Gabriela, a própria'),
              ('Hélio Batista Corrêa', 'Parcela 3 de 6 · R$ 850,00 · 24 dias', 'Para Marta Corrêa, esposa')]
    fora = [('Eduardo Nascimento', 'O número é fixo e não tem WhatsApp.', f'<a class="btn btn-sec" href="../portal-clientes/clientes.html?estado=ficha">{ico("pessoas")}Corrigir na ficha</a>'),
            ('Construtora Vale Alto Ltda.', 'Tem combinado no Financeiro: paga junto com a medição, em 25/11.', ''),
            ('Daniela Rocha Mendes', 'Tem combinado no Financeiro: paga depois do acordo.', ''),
            ('Antônia Ferreira Prado', 'Joana pediu em 03/11 para não receber avisos de cobrança.', '')]
    le = ''.join(f'<li><strong>{n}</strong>{selo("ok", "Entraria", "check")}<small>{d} · {p}</small></li>' for n, d, p in entram)
    lf = ''.join(f'<li><strong>{n}</strong>{selo("neutro", "Fica de fora")}<small>{d}</small>{a}</li>' for n, d, a in fora)
    quem = (f'<section class="folha" aria-labelledby="t-quem"><div class="folha-cab"><div><h2 id="t-quem">Quem entraria hoje</h2><p class="sub">8 parcelas com 3 dias ou mais de atraso: 4 entrariam, 4 ficam de fora</p></div></div>'
            f'<p class="au-sub3">Entrariam · 4</p><ul class="au-quem-l">{le}</ul><p class="au-sub3">Ficam de fora · 4</p><ul class="au-quem-l">{lf}</ul>'
            f'<p class="pt-pe-folha">{ico("ajuda")}<span>Quem já está em atraso só entra se você escolher isso ao ligar. Hélio tem conversa esperando Marina: a cobrança sairia mesmo assim, e a IA avisaria Marina.</span></p></section>')
    cab = cab_editor(NOME_COB, 'Automação · teste sem enviar', SIT['rascunho'], 'Texto aprovado por Marina às 10:14 · testada às 10:20',
                     f'<a class="btn btn-pri" href="{U}ligar">{ico("ligar")}Seguir para ligar</a>')
    return f'<div class="au">{cab}{passos("testar", "rascunho")}<div class="au-teste"><div class="au-col">{sim}</div><aside class="au-col" aria-label="Quem entraria">{quem}</aside></div></div>'


def tela_ligar():
    frase = ('<p class="au-frase">Toda parcela que chegar a <b>3 dias de atraso</b>, sem combinado de pagamento, recebe <b>uma mensagem educada</b> pelo WhatsApp com o link de pagamento. '
             'Se o cliente responder, <b>a IA conversa</b> com o que está no T3jus. Se em <b>5 dias</b> não pagar nem responder, a conversa <b>passa para Gustavo Lima</b>, do Financeiro.</p>')
    lim = (f'<ul class="au-lim">'
           f'<li>{ico("relogio")}<span><b>Só das 8h às 20h, em dia útil.</b><small>Fora disso, a mensagem espera o próximo horário. Feriado nacional conta como dia sem envio.</small></span></li>'
           f'<li>{ico("moeda")}<span><b>No máximo 1 cobrança por semana por parcela</b>, somando todas as automações.<small>Cobrança não pode expor nem constranger o cliente (CDC, art. 42).</small></span></li>'
           f'<li>{ico("cadeado")}<span><b>Quem pediu para não receber avisos fica de fora.</b><small>Hoje são 2 clientes. O pedido fica na ficha.</small></span></li>'
           f'<li>{ico("whats")}<span><b>Texto aprovado por você e pela Meta.</b><small>A IA conversa só depois que o cliente responde, dentro da janela de 24 horas do WhatsApp.</small></span></li></ul>')
    escolha = (opcoes_radio('lg-quem', 'Quem entra', [
        ('novas', 'Só as parcelas que atrasarem daqui em diante', 'Recomendado. Ninguém recebe cobrança de surpresa por algo antigo.'),
        ('todas', 'Também as 4 que já estão em atraso hoje', 'Farmácia Bom Jesus, Irene, Gabriela e Hélio. Saem a partir das 8h de amanhã.')], 'novas')
        + marcar('lg-antiga', 'Desligar a automação “Parcela em atraso” (1, 7 e 15 dias) quando esta ligar', 'Evita duas cobranças na mesma semana. Fica no histórico; dá para ligar de novo.', True)
        + marcar('lg-ok', 'Revisei o texto, os caminhos e quem entra', '', False))
    conf = (f'<section class="folha" aria-labelledby="t-lg"><div class="folha-cab"><div><h2 id="t-lg">Revise e ligue</h2><p class="sub">Em linguagem simples, o que vai acontecer</p></div></div>'
            f'{frase}<form class="au-conf" action="#" onsubmit="return false">{escolha}'
            f'<button class="btn btn-pri" type="submit">{ico("ligar")}Ligar a automação</button>'
            f'<p class="x-pe-nota">{ico("cadeado")}<span>Só Marina Ribeiro, a sócia dona, liga e desliga. Fica no histórico do escritório quem ligou e quando.</span></p></form></section>')
    depois = (f'<section class="folha" aria-labelledby="t-dep"><div class="folha-cab"><div><h2 id="t-dep">Depois de ligar</h2></div></div>'
              f'<ol class="cv-passos" style="padding:0 24px 22px;margin:0">'
              f'<li><span class="disco"><span>1</span></span><span><b>O texto vai para aprovação no WhatsApp.</b><small>A automação fica “Em aprovação no WhatsApp”. Costuma levar até 1 dia. Nada sai antes.</small></span></li>'
              f'<li><span class="disco"><span>2</span></span><span><b>Aprovado, ela começa sozinha.</b><small>Você recebe um aviso no sino. Se a Meta recusar, a automação volta a rascunho, com o motivo.</small></span></li>'
              f'<li><span class="disco"><span>3</span></span><span><b>Cada execução fica no histórico.</b><small>Por cliente, com o caminho e as falhas. Desligar é um botão, a qualquer hora.</small></span></li></ol></section>')
    limites = f'<section class="folha" aria-labelledby="t-lim"><div class="folha-cab"><div><h2 id="t-lim">Limites que valem sempre</h2><p class="sub">Fixos no T3jus; o escritório não afrouxa</p></div></div>{lim}</section>'
    cab = cab_editor(NOME_COB, 'Automação · ligar', SIT['rascunho'], 'Testada às 10:20 · texto aprovado por Marina',
                     f'<a class="btn btn-sec" href="{U}testar">{ico("esq")}Voltar ao teste</a>')
    return f'<div class="au">{cab}{passos("ligar", "rascunho")}<div class="au-grade" style="grid-template-columns:minmax(0,1fr) 380px"><div class="au-col">{conf}</div><aside class="au-col" aria-label="Limites e o que acontece depois">{limites}{depois}</aside></div></div>'


def tela_historico():
    def path(itens):
        return '<ol class="au-path" aria-label="Caminho">' + ''.join(f'<li class="{c}"><span>{t}</span></li>' for c, t in itens) + '</ol>'
    linhas = [
        ('falha', 'Eduardo Nascimento', 'Conciliação 25/11, 14:00', 'hoje, 08:00',
         path([('r', 'Gatilho'), ('x', 'Lembrete 1 dia: não entregue'), ('r', 'Passou para Felipe')]),
         f'{selo("urgente", "Falhou", "alerta")}<small>Conferido ao marcar: o número é fixo e não tem WhatsApp.</small>',
         f'<a class="btn btn-sec btn-compacto" href="../portal-clientes/clientes.html?estado=ficha">Corrigir na ficha</a>'),
        ('', 'Hélio Batista Corrêa', 'Instrução 19/11, 13:30', '05/11, 16:20',
         path([('r', 'Gatilho'), ('w', 'Espera até hoje, 13:30')]), f'{selo("implant", "Em andamento", "relogio")}<small>Lembrete de 1 dia sai hoje às 13:30, para Marta.</small>', ''),
        ('', 'Gabriela Teixeira', 'Conciliação 18/11, 11:00', '17/11, 11:00',
         path([('r', 'Gatilho'), ('r', 'Lembrete 1 dia'), ('r', 'Confirmou'), ('r', 'Lembrete 2 h com link'), ('r', 'Fim')]), f'{selo("ok", "Concluída", "check")}<small>Respondeu “Confirmo”.</small>', ''),
        ('', 'Daniela Rocha Mendes', 'Conciliação 12/11, 10:00', '11/11, 10:00',
         path([('r', 'Gatilho'), ('r', 'Lembrete 1 dia'), ('r', 'Não respondeu'), ('r', 'Passou para Marina'), ('r', 'Fim')]), f'{selo("ok", "Concluída", "check")}<small>Marina ligou às 11:20 e registrou.</small>', ''),
        ('', 'Benedito Souza Lima', 'Perícia 10/11, 09:00', '09/11, 09:00',
         path([('r', 'Gatilho'), ('r', 'Lembrete 1 dia'), ('r', 'Respondeu'), ('r', 'IA respondeu'), ('r', 'Fim')]), f'{selo("ok", "Concluída", "check")}<small>Perguntou o endereço; a IA respondeu.</small>', ''),
    ]
    tr, cards = '', ''
    for c, cli, comp, ini, p, sit, ac in linhas:
        cl = ' class="falha"' if c else ''
        tr += (f'<tr{cl}><td><div class="cv-c"><strong>{cli}</strong><small>{comp}</small></div></td><td class="num">{ini}</td>'
               f'<td>{p}</td><td><div class="au-sit">{sit}{ac}</div></td></tr>')
        st = ' style="border-color:var(--vinho-3);box-shadow:inset 3px 0 0 var(--vinho-3)"' if c else ''
        cards += (f'<li class="cartao"{st}><div class="cv-c"><strong>{cli}</strong><small>{comp} · começou {ini}</small></div>{p}<div class="au-sit">{sit}{ac.replace(" btn-compacto", "")}</div></li>')
    tab = (f'<section class="folha" aria-labelledby="t-hist" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-hist">Execuções</h2><p class="sub">Últimos 30 dias · uma linha por audiência</p></div></div>'
           f'<div class="au-num"><div><span class="disco"><span>14</span></span>execuções</div><div><span class="disco"><span>11</span></span>concluídas</div>'
           f'<div><span class="disco"><span>2</span></span>em andamento</div><div><span class="disco urg"><span>1</span></span>com falha</div></div>'
           f'<table class="so-pc au-hist-tab cv-tab"><caption class="sr">Execuções da automação Lembrete de audiência</caption><colgroup><col style="width:24%"><col style="width:17%"><col style="width:33%"><col style="width:26%"></colgroup>'
           f'<thead><tr><th scope="col">Cliente</th><th scope="col">Começou</th><th scope="col">Caminho no fluxo</th><th scope="col">Situação</th></tr></thead><tbody>{tr}</tbody></table>'
           f'<ul class="cartoes so-cel" aria-label="Execuções">{cards}</ul>'
           f'<div class="mais"><span>Mostrando 5 de 14</span><button class="btn btn-sec" type="button">Carregar mais</button></div></section>')
    mud = (f'<section class="folha" aria-labelledby="t-mud"><div class="folha-cab"><div><h2 id="t-mud">Mudanças</h2><p class="sub">Nada é apagado; cada versão fica aqui</p></div></div>'
           f'<ul class="au-hist" style="padding:0 24px 20px;gap:10px">'
           f'<li><time>02/11</time><span><b>Marina Ribeiro</b> ligou a versão 2: lembrete de 2 h com o link da sala.</span></li>'
           f'<li><time>28/10</time><span><b>Marina Ribeiro</b> aplicou a sugestão da IA: “se não responder, passa para o responsável do compromisso”.</span></li>'
           f'<li><time>20/10</time><span>Versão 1, pronta do T3jus, ligada por <b>Marina Ribeiro</b>.</span></li></ul></section>')
    fal = (f'<section class="folha" aria-labelledby="t-fal"><div class="folha-cab"><div><h2 id="t-fal">Falha precisa de alguém</h2></div></div>'
           f'<div class="cv-prev">{aviso("urgencia", "Eduardo Nascimento não recebe lembretes", "O número da ficha é fixo e não tem WhatsApp. A conversa passou para Felipe Matos, responsável pela audiência de 25/11, para avisar por telefone.", papel="status")}'
           f'<a class="btn btn-sec" href="../portal-clientes/clientes.html?estado=ficha">{ico("pessoas")}Corrigir na ficha</a></div></section>')
    cab = cab_editor('Lembrete de audiência', 'Automação · pronta do T3jus', SIT['ligada'], 'Ligada desde 02/11 por Marina · versão 2',
                     f'<button class="btn btn-sec" type="button">{ico("ligar")}Desligar</button>')
    return f'<div class="au">{cab}{passos("historico", "feito")}<div class="au-grade" style="grid-template-columns:minmax(0,1fr) 360px"><div class="au-col">{tab}</div><aside class="au-col" aria-label="Falhas e mudanças">{fal}{mud}</aside></div></div>'


def tela_so_leitura():
    tela = (f'<section class="folha" aria-labelledby="t-des" style="overflow:hidden"><h2 class="sr" id="t-des">Desenho do fluxo</h2>'
            f'<div style="padding:16px 20px 4px">' + aviso('info', 'Você pode ver e testar, não mudar', 'Quem muda e liga as automações é Marina Ribeiro, a sócia dona. Se algo precisa mudar, mande uma sugestão: ela recebe no sino.', icone='cadeado',
                                                        acoes=f'<button class="btn btn-sec" type="button">{ico("conversas")}Sugerir mudança a Marina</button>') + '</div>'
            f'<div class="au-tela">{fluxo_cobranca("ro")}</div></section>')
    lado = (f'<aside class="folha au-as" aria-labelledby="ro-t"><div class="folha-cab"><div><p class="sobretitulo">Sobre esta automação</p><h2 id="ro-t">Você está neste fluxo</h2></div></div>'
            f'<div class="cv-prev"><p class="cv-por"><b>Passo 7 é com você.</b> Quando o cliente não paga nem responde em 5 dias, a conversa passa para você, com o motivo, e entra em “Precisa de alguém”.</p>'
            f'<dl class="cv-dl"><div><dt>Situação</dt><dd>Em aprovação no WhatsApp</dd></div><div><dt>Desde</dt><dd>hoje, 10:31</dd></div><div><dt>Montada por</dt><dd>Marina, com a IA</dd></div><div><dt>Versão</dt><dd>1</dd></div></dl>'
            f'<a class="btn btn-sec" href="{U}testar">{ico("olho")}Testar sem enviar</a>'
            f'<p class="cv-nota">{ico("cadeado")}<span>Só aparecem para você as automações das áreas que você tem (Financeiro) e as de Conversas.</span></p></div></aside>')
    cab = cab_editor(NOME_COB, 'Automação · só leitura', SIT['aprovacao'], 'Ligada por Marina às 10:31 · espera a Meta', '')
    return (f'<div class="au">{cab}{passos("montar", "ro", "", "Só a sócia dona", ro=True)}'
            f'<div class="au-editor"><div class="au-col">{tela}</div><div class="au-col">{lado}</div></div></div>')


# ---------------------------------------------------------------- lista
CRIADAS = [
    ('rasc', 'fluxo', 'Cobrança gentil de parcela em atraso', 'Quando a parcela chega a 3 dias de atraso. Se não pagar em 5 dias, passa para Gustavo.', 'rascunho', '<small>Montada com a IA · 5 sugestões por revisar</small>', '—', 'Marina Ribeiro', 'hoje, 10:05', U + 'sugestao'),
    ('', 'fluxo', 'Boas-vindas ao cliente novo', 'Quando um cliente é cadastrado: apresenta o escritório e o número.', 'aprovacao', '<small>Enviada à Meta ontem, 17:40</small>', '—', 'Marina Ribeiro', 'ontem, 17:40', U + 'so-leitura'),
    ('', 'fluxo', 'Pesquisa depois do caso encerrado', '7 dias depois que o caso é encerrado no Jurídico.', 'desligada', '<small>Motivo: “clientes estranharam a nota de 0 a 10”</small>', '0', 'Marina Ribeiro', '10/11, 18:02', U + 'so-leitura'),
]
PRONTAS = [
    ('moeda', 'Pagamento recebido', 'Quando o Financeiro registra o recebimento.', '5', '', U + 'historico'),
    ('moeda', 'Parcela vai vencer', '3 dias antes do vencimento.', '3', '', U + 'historico'),
    ('alerta', 'Parcela em atraso', '1, 7 e 15 dias depois do vencimento. Para quando é paga.', '3', '1', U + 'historico'),
    ('balanca', 'Etapa do caso', 'Quando a etapa muda no Jurídico, se a etapa tiver texto para o cliente.', '4', '', U + 'historico'),
    ('relogio', 'Lembrete de audiência', '1 dia e 2 horas antes. Se não responder, passa para o responsável.', '6', '', U + 'historico'),
    ('carteira', 'Prestação de contas', 'Quando o repasse ao cliente é registrado.', '2', '', U + 'historico'),
]


def linha_lista(nome, gat, sit, sit_sub, saiu, falhas, quem, quando, href, i, cls=''):
    f = f'<span class="falha">{ico("alerta")}{falhas} falha</span>' if falhas else '<small style="color:var(--texto-2)">sem falha</small>'
    s7 = f'<div class="au-7d"><b>{saiu}</b> {"enviada" if saiu == "1" else "enviadas"}<br>{f}</div>' if saiu != '—' else '<div class="au-7d" style="color:var(--texto-2)">Ainda não saiu</div>'
    return (f'<tr{f" class=\"{cls}\"" if cls else ""}><td><div class="au-nome">{ico(i)}<div><a href="{href}">{nome}</a><small>{gat}</small></div></div></td>'
            f'<td><div class="au-sit">{SIT[sit]}{sit_sub}</div></td><td>{s7}</td><td><p class="au-quem"><b>{quem}</b><br>{quando}</p></td></tr>',
            f'<li class="cartao"{" style=\"box-shadow:inset 3px 0 0 var(--ambar)\"" if cls else ""}><div class="au-nome">{ico(i)}<div><a href="{href}">{nome}</a><small>{gat}</small></div></div>'
            f'<div class="au-sit">{SIT[sit]}{sit_sub}</div><dl class="c-dados"><dt>Últimos 7 dias</dt><dd>{"Ainda não saiu" if saiu == "—" else saiu + " enviadas" + (", " + falhas + " falha" if falhas else "")}</dd><dt>Mexeu por último</dt><dd>{quem}, {quando}</dd></dl></li>')


def tela_lista(vazio=False, dialog=''):
    tr_c, cd_c, tr_p, cd_p = '', '', '', ''
    if not vazio:
        for cls, i, nome, gat, sit, sub, saiu, quem, quando, href in CRIADAS:
            a, b = linha_lista(nome, gat, sit, sub, saiu, '', quem, quando, href, i, 'au-rasc' if cls else '')
            tr_c += a; cd_c += b
    for i, nome, gat, saiu, falhas, href in PRONTAS:
        a, b = linha_lista(nome, gat, 'ligada', '', saiu, falhas, 'Marina Ribeiro', '02/11, 09:15', href, i)
        tr_p += a; cd_p += b
    if vazio:
        grupo_c = ''
        vz = (f'<div class="au-vazio">' + estado('Nenhuma automação criada ainda', 'As seis prontas abaixo já cobrem os avisos de sempre. Para algo do jeito do escritório, peça em linguagem simples: a IA monta o rascunho tracejado e você revisa.',
                                                'fluxo', moldura=False, acoes=f'<a class="btn btn-pri" href="{U}pedir">{ico("ia")}Pedir à IA</a><button class="btn btn-sec" type="button">{ico("mais")}Montar do zero</button>')
              + f'<ul class="au-ex" aria-label="Exemplos de pedido">'
              + ''.join(f'<li><button type="button">{ico("ia")}“{t}”</button></li>' for t in [
                  'Quero cobrar com educação quem atrasar a parcela, e se não pagar em 5 dias passa para o Gustavo.',
                  'Mande boas-vindas quando um cliente for cadastrado, com o nosso horário.',
                  'Lembre o cliente de mandar os documentos que faltam, uma vez por semana.'])
              + '</ul></div>')
    else:
        grupo_c = f'<tbody><tr><th colspan="4" scope="rowgroup">Criadas pelo escritório<small>3</small></th></tr>{tr_c}</tbody>'
        vz = ''
    tab = (f'<table class="so-pc au-tab cv-tab"><caption class="sr">Automações do escritório</caption><colgroup><col style="width:38%"><col style="width:25%"><col style="width:17%"><col style="width:20%"></colgroup>'
           f'<thead><tr><th scope="col">Automação e quando sai</th><th scope="col">Situação</th><th scope="col">Últimos 7 dias</th><th scope="col">Mexeu por último</th></tr></thead>'
           f'{grupo_c}<tbody><tr><th colspan="4" scope="rowgroup">Prontas do T3jus<small>6 · vieram dos avisos automáticos</small></th></tr>{tr_p}</tbody></table>')
    cel = ''
    if not vazio:
        cel += f'<p class="au-sub3 so-cel">Criadas pelo escritório · 3</p><ul class="cartoes so-cel" aria-label="Criadas pelo escritório">{cd_c}</ul>'
    cel += f'<p class="au-sub3 so-cel">Prontas do T3jus · 6</p><ul class="cartoes so-cel" aria-label="Prontas do T3jus">{cd_p}</ul>'
    nums = ('' if vazio else
            f'<div class="au-num"><div><span class="disco"><span>6</span></span>ligadas</div><div><span class="disco"><span>1</span></span>em aprovação</div>'
            f'<div><span class="disco"><span>1</span></span>rascunho</div><div><span class="disco urg"><span>1</span></span>falha em 7 dias</div></div>')
    sub = 'Ligada, desligada, rascunho ou em aprovação no WhatsApp' if not vazio else 'Só as prontas, por enquanto'
    principal = (f'<section class="folha" aria-labelledby="t-au" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-au">Automações</h2><p class="sub">{sub}</p></div></div>'
                 f'{nums}{vz}{tab}{cel}</section>')
    lim = (f'<section class="folha" aria-labelledby="t-lim"><div class="folha-cab"><div><h2 id="t-lim">Limites que valem sempre</h2><p class="sub">Para todas as automações</p></div></div><ul class="au-lim">'
           f'<li>{ico("relogio")}<span><b>8h às 20h, em dia útil.</b><small>Fora disso, espera o próximo horário.</small></span></li>'
           f'<li>{ico("moeda")}<span><b>1 cobrança por semana por parcela</b>, somando todas.<small>Sem expor nem constranger (CDC, art. 42).</small></span></li>'
           f'<li>{ico("cadeado")}<span><b>Quem pediu para não receber avisos fica de fora.</b><small>2 clientes hoje.</small></span></li>'
           f'<li>{ico("whats")}<span><b>Só sai texto aprovado</b> por Marina e pela Meta.<small>A IA rascunha; quem aprova é a sócia dona.</small></span></li>'
           f'<li>{ico("pessoas")}<span><b>Toda passagem tem responsável.</b><small>Pessoa ativa ou regra: quem cuida do caso, a área, a sócia dona.</small></span></li></ul></section>')
    reg = (f'<section class="folha" aria-labelledby="t-reg"><div class="folha-cab"><div><h2 id="t-reg">O que já saiu</h2></div></div>'
           f'<div class="cv-prev"><p style="font-size:13px;line-height:1.5">Cada mensagem enviada fica em Avisos automáticos, com a situação de entrega e o que a disparou.</p>'
           f'<a class="ver" href="{CONV}avisos">Abrir Avisos automáticos{ico("dir", "ico ico-s")}</a></div></section>')
    cab = (f'<div class="pt-cab"><div><p class="sobretitulo">Pelo WhatsApp do escritório</p><h1>Automações</h1><span class="fio" aria-hidden="true"></span>'
           f'<p class="lede">Mensagens que saem sozinhas, montadas em passos: quando sai, o texto, quanto esperar e para quem passa. A IA sugere; Marina revisa, testa e liga.</p></div>'
           f'<div class="au-acoes-cab"><button class="btn btn-sec" type="button">{ico("mais")}Nova automação</button><a class="btn btn-pri" href="{U}pedir" data-janela="janela-pedir">{ico("ia")}Pedir à IA</a></div></div>')
    return f'<div class="au">{cab}<div class="au-grade"><div class="au-col">{principal}</div><aside class="au-col" aria-label="Limites">{lim}{reg}</aside></div></div>{dialog}'


def j_pedir(abrir=False):
    corpo = (area_texto('pd-txt', 'O que você quer que aconteça', 'Quero cobrar com educação quem atrasar a parcela, e se não pagar em 5 dias passa para o Gustavo.', foco=True,
                        ajuda='Diga quando começa, o que dizer e para quem passa. A IA usa as áreas, a equipe e os modelos do escritório.')
             + f'<div class="campo" role="group" aria-labelledby="pd-ex"><p class="au-rot-p" id="pd-ex">Ou comece por um exemplo</p><div class="au-chips">'
             f'<button type="button">Boas-vindas ao cliente novo</button><button type="button">Cobrar documento que falta</button><button type="button">Aniversário do cliente</button></div></div>'
             + f'<p class="pt-comuns">{ico("escudo")}<span>A IA monta um rascunho com os passos tracejados. Nada é salvo antes de você aplicar, e nada sai antes de você testar e ligar.</span></p>')
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><a class="btn btn-pri" href="{U}sugestao">{ico("ia")}Pedir sugestão</a>'
    return janela('janela-pedir', 'Automações', 'Pedir à IA', 'Escreva como falaria com alguém da equipe.', corpo, pe, abrir=abrir)


def tela_nao_conectado():
    passos_ = (f'<ol class="cv-passos">'
               f'<li><span class="disco"><span>1</span></span><span><b>Monte e teste à vontade.</b><small>O desenho, a IA e a simulação funcionam sem o WhatsApp: nada é enviado no teste.</small></span></li>'
               f'<li><span class="disco"><span>2</span></span><span><b>Ligue o número do escritório.</b><small>Cerca de 30 minutos, por vídeo, com a equipe T3jus.</small></span></li>'
               f'<li><span class="disco"><span>3</span></span><span><b>Depois, ligue as automações.</b><small>Cada texto novo passa pela aprovação do WhatsApp antes de sair.</small></span></li></ol>')
    e = (f'<div class="estado" role="status"><span class="icone-estado">{ico("whats")}</span><h2 style="font-size:26px">Automações precisam do WhatsApp ligado</h2>'
         f'<p style="max-width:60ch">O WhatsApp do escritório ainda não está ligado. Você já pode montar e testar; ligar fica para depois que o número estiver pronto.</p>{passos_}'
         f'<div class="acoes"><a class="btn btn-pri" href="{CONV}nao-conectado">{ico("agenda")}Marcar a ligação com a equipe T3jus</a><a class="btn btn-sec" href="{U}pedir">{ico("ia")}Montar com a IA mesmo assim</a></div></div>')
    enq = (f'<section class="folha" aria-labelledby="t-enq"><div class="folha-cab"><div><h2 id="t-enq">As 6 prontas esperam</h2><p class="sub">Ligadas assim que o número estiver pronto</p></div></div><ul class="cv-lista-x">'
           + ''.join(f'<li>{ico(i)}<span><b>{n}</b> · {g}</span></li>' for i, n, g, *_ in PRONTAS) + '</ul></section>')
    return f'<div class="au"><div class="cv-nc"><div class="cv-col">{e}</div><aside class="cv-col" aria-label="Prontas">{enq}</aside></div></div>'


# ---------------------------------------------------------------- estados
def barra_au(sec_, chave, cont=True):
    q = '<span class="q" aria-label="3 esperando">3</span>' if cont else ''
    links = ''.join(f'<a href="{h}"{" aria-current=\"page\"" if s == sec_ else ""}>{s}{q if s == "Mensagens" else ""}</a>'
                    for s, h in [('Mensagens', CONV + 'fila'), ('Automações', U + 'lista'), ('Avisos automáticos', CONV + 'avisos')])
    return (f'<template data-barra="conversas|{chave}"><div class="pt-barra-area"><p class="pt-area-nome">{ico("conversas")}Conversas</p>'
            f'<nav class="pt-secoes" aria-label="Seções de Conversas">{links}</nav></div></template>\n')


BARRAS = barra_au('Automações', 'Automações') + barra_au('Automações', 'Automações0', False)
C = dict(atual='conversas', area='conversas', secao='Automações', trilha='Conversas|Automações', titulo='Automações')
TE = dict(C, trilha='Conversas|Automações|' + NOME_COB)
T = ''
T += tpl('lista', tela_lista(dialog=j_pedir()), **C)
T += tpl('pedir', tela_lista(dialog=j_pedir(True)), **C)
T += tpl('vazio', tela_lista(vazio=True, dialog=j_pedir()), **C)
T += tpl('nao-conectado', tela_nao_conectado(), cont='0', **dict(C, secao='Automações0'))
T += tpl('sugestao', tela_montar('sugestao'), **TE)
T += tpl('bloco', tela_bloco(), **TE)
T += tpl('erros', tela_montar('erros'), **TE)
T += tpl('testar', tela_testar(), **TE)
T += tpl('ligar', tela_ligar(), **TE)
T += tpl('historico', tela_historico(), **dict(C, trilha='Conversas|Automações|Lembrete de audiência'))
T += tpl('so-leitura', tela_so_leitura(), quem='financeiro', **TE)

out = pagina('Automações', 'Automações de mensagens do WhatsApp em Conversas: a IA sugere o fluxo, a sócia dona revisa, testa e liga.',
             '{"estado":"lista","atual":"conversas"}', '', T, BARRAS)
out = finalizar(out, CSS_CV + CSS_AU)
out = out.replace('<div class="app">', SPRITE_AU + '\n<div class="app">', 1)
# Gustavo Lima (só Financeiro) para o estado só leitura; o resto do script do Portal v1 fica igual
out = out.replace("'sem-area':{nome:'Paula Nunes'", "financeiro:{nome:'Gustavo Lima',ini:'G',papel:'Área: Financeiro',areas:['financeiro'],dono:false},\n    'sem-area':{nome:'Paula Nunes'", 1)
out = out.replace('href="#" data-nav="conversas"', f'href="{CONV}fila" data-nav="conversas"')
# Navegação dentro da página para "Mostrar no desenho": o bloco recebe foco
out = out.replace('</body>', '''<script>
document.addEventListener('click',function(e){var a=e.target.closest('a[href^="#b-"]');if(!a)return;var b=document.getElementById(a.getAttribute('href').slice(1));if(b){e.preventDefault();b.setAttribute('tabindex','-1');b.scrollIntoView({block:'center'});b.focus({preventScroll:true});history.replaceState(null,'',location.search+a.getAttribute('href'))}});
</script>
</body>''', 1)
open(f'{SAIDA}/automacoes.html', 'w', encoding='utf-8').write(out)
print('automacoes ok', T.count('<template data-est='), 'estados')
