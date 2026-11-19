# Portal · Escritório › WhatsApp e IA (PA-04, ideia nova; PA-01, PA-02, PT-03, PT-10, PT-11, EX-10, PD-07).
# Ligar o próprio número de WhatsApp do escritório (Cadastro Incorporado da Meta) e configurar a IA que atende.
# Parte da moldura do Portal v1 (comum.py, sem mudança), do extra.py e do CSS cv- aprovado das Conversas.
# Peças novas com prefixo wa-. Uso: python3 whatsapp.py <pasta-saida>
import sys, os
from extra import *

SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
U = 'whatsapp.html?estado='
CONV = '../portal-agenda-conversas/conversas.html?estado='

# CSS aprovado das Conversas (cv-), lido do conversas.py sem mudança
_cv = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'conversas.py'), encoding='utf-8').read()
CSS_CV = _cv[_cv.index('CSS_CV = r"""') + 13:_cv.index('"""', _cv.index('CSS_CV = r"""') + 13)]

# Ícones novos, no mesmo traço (grade 24, 1,6, cantos vivos)
SPRITE_WA = ('<svg xmlns="http://www.w3.org/2000/svg" style="display:none">'
             '<symbol id="i-ligar" viewBox="0 0 24 24"><path d="M12 3v9"/><path d="M7 6.2a7.5 7.5 0 1 0 10 0"/></symbol>'
             '<symbol id="i-pausa" viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></symbol>'
             '<symbol id="i-janela" viewBox="0 0 24 24"><path d="M3 4.5h18v15H3Z"/><path d="M3 8.5h18"/><path d="M13 13h5v4"/><path d="m18 13-6 6"/></symbol>'
             '<symbol id="i-chave" viewBox="0 0 24 24"><path d="M8.5 10a4.5 4.5 0 1 1 0 .1Z"/><path d="M13 12.5h8v3.5"/><path d="M17.5 12.5v2.5"/></symbol>'
             '<symbol id="i-medidor" viewBox="0 0 24 24"><path d="M3.5 17a8.5 8.5 0 1 1 17 0"/><path d="m12 17 4-6"/></symbol>'
             '<symbol id="i-selo" viewBox="0 0 24 24"><path d="M12 3 19 6v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/></symbol>'
             '<symbol id="i-livro" viewBox="0 0 24 24"><path d="M4 4.5h7v15H4Z"/><path d="M13 4.5h7v15h-7Z"/></symbol>'
             '<symbol id="i-celular" viewBox="0 0 24 24"><path d="M7 2.5h10v19H7Z"/><path d="M11 18.5h2"/></symbol>'
             '<symbol id="i-proibido" viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Z"/><path d="m5.6 5.6 12.8 12.8"/></symbol>'
             '<symbol id="i-fonte" viewBox="0 0 24 24"><path d="M5 3h10l4 4v14H5Z"/><path d="M8.5 11h7M8.5 15h7"/></symbol>'
             '</svg>')

CSS_WA = r"""
/* ==========================================================================
   Portal · Escritório › WhatsApp e IA. Prefixo wa- nas peças novas.
   ========================================================================== */
.wa{display:flex;flex-direction:column;gap:24px;min-width:0}
.wa-grade{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:24px;align-items:start}
.wa-col{display:flex;flex-direction:column;gap:24px;min-width:0}
.wa-cab{display:flex;align-items:flex-end;justify-content:space-between;gap:16px 24px;flex-wrap:wrap}
.wa-cab h1{font-size:40px;line-height:1.05;margin-top:6px}
.wa-cab .lede{margin-top:10px}
.wa-cab .fio{margin-top:14px}
.wa-abas a .selo{height:22px;font-size:11px;padding:0 8px}
.wa-corpo{padding:0 24px 22px;display:grid;gap:16px}
.wa-corpo>p{font-size:14px;line-height:1.55}
.wa-nota{display:flex;gap:10px;align-items:flex-start;font-size:12.5px;color:var(--texto-2);line-height:1.5}
.wa-nota .ico{width:16px;height:16px;color:var(--vinho-4);flex:none;margin-top:2px}
.wa-nota b{font-weight:500;color:var(--texto)}

/* Não ligado: o que ter em mãos e os dois caminhos */
.wa-abre{display:grid;grid-template-columns:auto minmax(0,1fr);gap:18px;align-items:start;padding:24px 24px 6px}
.wa-abre .icone-estado{display:grid;place-items:center;width:64px;height:64px;border-radius:50%;background:var(--ambar-3);color:var(--vinho)}
.wa-abre .icone-estado .ico{width:28px;height:28px}
.wa-abre h2{font-size:28px;line-height:1.15}
.wa-abre p{margin-top:8px;color:var(--texto-2);max-width:64ch}
.wa-maos{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:12px 20px}
.wa-maos li{display:grid;grid-template-columns:22px minmax(0,1fr);gap:10px;font-size:13.5px;line-height:1.5}
.wa-maos .ico{width:18px;height:18px;color:var(--vinho);margin-top:2px}
.wa-maos b{font-weight:600}
.wa-maos small{display:block;font-size:12.5px;color:var(--texto-2)}
.wa-caminhos{display:grid;grid-template-columns:1.25fr 1fr;gap:16px}
.wa-caminho{display:grid;gap:10px;align-content:start;padding:18px 20px 20px;border-radius:var(--raio-g);border:1px solid var(--borda-folha);background:var(--papel)}
.wa-caminho.pri{background:var(--ambar-3);border:1.5px solid var(--vinho)}
.wa-caminho h3{font-family:var(--serifa);font-size:21px;font-weight:500;color:var(--vinho);line-height:1.2;margin:0}
.wa-caminho .tempo{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:500;color:var(--vinho)}
.wa-caminho .tempo .ico{width:16px;height:16px}
.wa-caminho p{font-size:13.5px;line-height:1.5;color:var(--tinta)}
.wa-caminho .btn{justify-self:start}

/* Passos do assistente de ligar */
.wa-passos{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));background:var(--papel);border:1px solid var(--borda-folha);border-radius:var(--raio-g);overflow:hidden}
.wa-passos li{min-width:0}
.wa-passos li+li{border-left:1px solid var(--divisor)}
.wa-passos a,.wa-passos .p{position:relative;display:flex;align-items:center;gap:12px;min-height:64px;padding:10px 16px;text-decoration:none;color:var(--texto-2)}
.wa-passos a{color:var(--texto)}
.wa-passos a:hover{background:#FCF8F5}
.wa-passos .disco{--d:34px;--f:18px;--c:var(--sal-2);color:var(--texto-2)}
.wa-passos strong{display:block;font-weight:500;font-size:14px;line-height:1.25}
.wa-passos small{display:block;font-size:12px;color:var(--texto-2);line-height:1.35}
.wa-passos .feito .disco{--c:var(--papel);box-shadow:inset 0 0 0 1.5px var(--vinho-4);color:var(--vinho)}
.wa-passos .feito .disco .ico{width:16px;height:16px;stroke-width:2.2}
.wa-passos .feito strong{font-weight:600}
.wa-passos [aria-current="step"]{background:var(--ambar-3);color:var(--tinta)}
.wa-passos [aria-current="step"] .disco{--c:var(--vinho);color:var(--papel)}
.wa-passos [aria-current="step"] strong{color:var(--vinho);font-weight:600}
.wa-passos [aria-current="step"] small{color:var(--tinta)}
.wa-passos [aria-current="step"]::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:var(--vinho)}
.wa-passo-cab{padding:20px 24px 4px}
.wa-passo-cab h2{font-size:28px;line-height:1.15;margin-top:4px}
.wa-passo-cab p{margin-top:8px;color:var(--texto-2);max-width:66ch;font-size:14px}
.wa-meta{list-style:none;margin:0;padding:0;display:grid;gap:0;counter-reset:m}
.wa-meta li{display:grid;grid-template-columns:34px minmax(0,1fr);gap:12px;padding:14px 0;border-top:1px solid var(--divisor);font-size:13.5px;line-height:1.5}
.wa-meta li:first-child{border-top:0}
.wa-meta .disco{--d:32px;--f:17px}
.wa-meta b{font-weight:600}
.wa-meta small{display:block;font-size:12.5px;color:var(--texto-2);margin-top:2px}
.wa-meta .wa-copiar{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:6px;padding:8px 12px;border-radius:8px;background:var(--sal-2);font-size:12.5px}
.wa-meta .wa-copiar span b{font-weight:500}
.wa-meta li.aqui{background:linear-gradient(90deg,var(--ambar-3),transparent 70%);margin:0 -24px;padding:14px 24px}
.wa-acoes{display:flex;gap:10px;flex-wrap:wrap;align-items:center;padding:6px 24px 22px}
.wa-acoes .wa-nota{flex:1 1 260px}
.wa-resumo{margin:0;padding:0 24px 18px;display:grid;gap:0}
.wa-resumo>div{display:grid;grid-template-columns:minmax(0,1fr);gap:2px;padding:10px 0;border-top:1px solid var(--divisor)}
.wa-resumo>div:first-child{border-top:0}
.wa-resumo dt{font-size:12px;color:var(--texto-2)}
.wa-resumo dd{margin:0;font-weight:500;font-size:14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;line-height:1.4}
.wa-resumo dd small{font-weight:400;font-size:12px;color:var(--texto-2);flex-basis:100%}
.wa-form{padding:4px 24px 22px;display:grid;gap:18px}
.wa-form .x-ops-l{grid-template-columns:1fr 1fr}
.wa-form .wa-tres .x-ops-l{grid-template-columns:repeat(3,minmax(0,1fr))}

/* Saúde do número */
.wa-saude{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--divisor)}
.wa-ind{display:grid;grid-template-columns:40px minmax(0,1fr);gap:12px;padding:16px 24px 18px;border-bottom:1px solid var(--divisor)}
.wa-ind:nth-child(odd){border-right:1px solid var(--divisor)}
.wa-ind>.ic{width:40px;height:40px;border-radius:10px;display:grid;place-items:center;background:var(--sal-2);color:var(--vinho)}
.wa-ind>.ic .ico{width:20px;height:20px}
.wa-ind .dt{font-size:12px;color:var(--texto-2)}
.wa-ind .dd{margin:2px 0 0}
.wa-ind .val{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-family:var(--serifa);font-size:21px;font-weight:500;color:var(--vinho);line-height:1.2}
.wa-ind .val .selo{font-family:var(--fonte-texto,inherit)}
.wa-ind p{font-size:12.5px;color:var(--texto-2);line-height:1.5;margin-top:4px}
.wa-ind p b{font-weight:500;color:var(--texto)}
.wa-medida{position:relative;height:8px;border-radius:4px;background:var(--sal-2);margin-top:8px;overflow:hidden;box-shadow:inset 0 0 0 1px var(--borda-folha)}
.wa-medida span{position:absolute;left:0;top:0;bottom:0;border-radius:4px;background:var(--vinho)}
.wa-tab td{vertical-align:middle}
.wa-mod{display:flex;gap:12px;align-items:flex-start}
.wa-mod>.ico{color:var(--vinho);margin-top:3px;flex:none}
.wa-mod strong{display:block;font-family:var(--serifa);font-size:17px;font-weight:500;color:var(--vinho);line-height:1.25}
.wa-mod small{display:block;font-size:12.5px;color:var(--texto-2);line-height:1.45}
.wa-sit{display:grid;gap:4px;justify-items:start}
.wa-sit .selo{white-space:normal;height:auto;min-height:26px;padding:4px 10px;line-height:1.25}
.wa-sit small{font-size:12px;color:var(--texto-2);line-height:1.4}
.wa-tab tr.recusado td{background:#FCF6F2}
.wa-tab tr.recusado td:first-child{box-shadow:inset 3px 0 0 var(--vinho-3)}
.wa-hist{list-style:none;margin:0;padding:0 24px 18px;display:grid;gap:10px}
.wa-hist li{display:grid;grid-template-columns:78px minmax(0,1fr);gap:10px;font-size:12.5px;line-height:1.45}
.wa-hist time{color:var(--texto-2);font-variant-numeric:tabular-nums}
.wa-hist b{font-weight:500}
.wa-btns{display:flex;flex-direction:column;gap:10px;padding:4px 24px 22px}
.wa-btns .btn{width:100%}
.wa-duas{display:grid;grid-template-columns:1fr 1fr;gap:0;border-top:1px solid var(--divisor)}
.wa-duas>section{padding:16px 24px 20px}
.wa-duas>section+section{border-left:1px solid var(--divisor)}
.wa-duas h3{display:flex;align-items:center;gap:8px;font-size:13px;font-family:inherit;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--vinho-2);margin:0 0 10px}
.wa-duas h3 .ico{width:16px;height:16px}

/* Estado do número, cabeça vinho (mesma família da cabeça do assistente aprovado) */
.wa-num-cab{display:flex;align-items:center;gap:14px;padding:18px 24px;background:var(--vinho);color:var(--papel);flex-wrap:wrap}
.wa-num-cab .disco{--d:48px;--f:22px;--c:var(--vinho-2);color:var(--ambar-3)}
.wa-num-cab .disco .ico{width:24px;height:24px}
.wa-num-cab .sobretitulo{color:var(--ambar-2)}
.wa-num-cab h2{color:var(--papel);font-size:26px;line-height:1.15}
.wa-num-cab .num{font-variant-numeric:lining-nums tabular-nums}
.wa-num-cab .lado{margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:4px;font-size:12.5px;color:var(--ambar-3)}
.wa-num-cab .selo{background:var(--ambar-3);color:var(--vinho)}

/* Texto do aviso e sugestão da IA */
.wa-recusado{padding:12px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:13.5px;line-height:1.55;box-shadow:inset 3px 0 0 var(--vinho-3)}
.wa-recusado .de{display:block;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--vinho-3);margin-bottom:4px}
.wa-campo-v{color:var(--vinho);font-weight:600}
.wa-sug{display:grid;gap:8px;padding:12px 14px 14px;border-radius:12px;border:1.5px dashed var(--vinho-2);background:#FFFCFA}
.wa-sug .cab{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.wa-sug p{font-size:13.5px;line-height:1.55}
.wa-sug .bts{display:flex;gap:8px;flex-wrap:wrap}
.wa-prev{background:var(--sal-2);border-radius:var(--raio);padding:14px 12px;display:grid;gap:6px}
.wa-prev .b{justify-self:end;max-width:92%;background:var(--papel);border:1px solid var(--borda-folha);border-radius:14px 4px 14px 14px;padding:9px 12px 6px;font-size:13.5px;line-height:1.5}
.wa-prev .b .de{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:var(--vinho-2);margin-bottom:2px}
.wa-prev .b .de .ico{width:14px;height:14px}
.wa-prev .b time{display:block;text-align:right;font-size:11px;color:var(--texto-2)}
.wa-prev>small{font-size:12px;color:var(--texto-2);text-align:center}
.wa-rot{font-weight:500;font-size:13px}

/* IA: faixa de situação, seções e listas */
.wa-ia-faixa{display:flex;align-items:center;gap:14px 20px;flex-wrap:wrap;padding:16px 20px;border-radius:var(--raio-g);background:var(--papel);border:1px solid var(--borda-folha)}
.wa-ia-faixa.ligada{background:var(--vinho);border-color:var(--vinho);color:var(--papel)}
.wa-ia-faixa .disco{--d:44px;--f:20px}
.wa-ia-faixa .disco .ico{width:22px;height:22px}
.wa-ia-faixa.ligada .disco{--c:var(--vinho-2);color:var(--ambar-3)}
.wa-ia-faixa .txt{flex:1 1 320px;min-width:0}
.wa-ia-faixa strong{display:block;font-family:var(--serifa);font-size:21px;font-weight:500;color:var(--vinho);line-height:1.2}
.wa-ia-faixa.ligada strong{color:var(--papel)}
.wa-ia-faixa small{display:block;font-size:12.5px;color:var(--texto-2);line-height:1.45;margin-top:2px}
.wa-ia-faixa.ligada small{color:var(--ambar-3)}
.wa-ia-faixa .bts{display:flex;gap:8px;flex-wrap:wrap}
.wa-ia-faixa.ligada .btn-sec{background:var(--papel);color:var(--vinho);border-color:var(--papel)}
.wa-ia-nav{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));background:var(--papel);border:1px solid var(--borda-folha);border-radius:var(--raio-g);overflow:hidden}
.wa-ia-nav li{min-width:0}
.wa-ia-nav li+li{border-left:1px solid var(--divisor)}
.wa-ia-nav a{position:relative;display:flex;align-items:center;gap:12px;min-height:60px;padding:10px 16px;text-decoration:none;color:var(--texto)}
.wa-ia-nav a:hover{background:#FCF8F5}
.wa-ia-nav .ico{color:var(--vinho-4);flex:none}
.wa-ia-nav strong{display:block;font-weight:500;font-size:14px;line-height:1.25}
.wa-ia-nav small{display:block;font-size:12px;color:var(--texto-2);line-height:1.35}
.wa-ia-nav [aria-current="page"]{background:var(--ambar-3)}
.wa-ia-nav [aria-current="page"] .ico{color:var(--vinho)}
.wa-ia-nav [aria-current="page"] strong{color:var(--vinho);font-weight:600}
.wa-ia-nav [aria-current="page"] small{color:var(--tinta)}
.wa-ia-nav [aria-current="page"]::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:var(--vinho)}
.wa-pode{display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;padding:0 24px 18px}
.wa-pode .opcao{margin:0 -8px}
.wa-pode .opcao b{font-weight:500}
.wa-nunca{list-style:none;margin:0;padding:0 24px 18px;display:grid;grid-template-columns:1fr 1fr;gap:10px 20px}
.wa-nunca li{display:grid;grid-template-columns:22px minmax(0,1fr);gap:10px;font-size:13.5px;line-height:1.5}
.wa-nunca .ico{width:18px;height:18px;color:var(--vinho-3);margin-top:2px}
.wa-nunca b{font-weight:600}
.wa-nunca small{display:block;font-size:12.5px;color:var(--texto-2)}
.wa-fixo{display:flex;gap:10px;align-items:flex-start;margin:0 24px 20px;padding:10px 14px;border-radius:var(--raio);background:var(--sal-2);font-size:12.5px;line-height:1.5}
.wa-fixo .ico{width:16px;height:16px;color:var(--vinho);flex:none;margin-top:2px}
.wa-fixo b{font-weight:600}
.wa-quem{list-style:none;margin:0;padding:0 24px 18px;display:grid;gap:10px}
.wa-quem li{display:grid;grid-template-columns:40px minmax(0,1fr);gap:12px;align-items:start;padding:12px 14px;border-radius:var(--raio);border:1px solid var(--borda-folha);font-size:13px;line-height:1.5}
.wa-quem li.novo{border-style:dashed;border-color:var(--vinho-4)}
.wa-quem .av-p{width:40px;height:40px}
.wa-quem b{font-weight:600}
.wa-quem small{display:block;font-size:12.5px;color:var(--texto-2)}
.wa-palavras{display:flex;flex-wrap:wrap;gap:6px;list-style:none;margin:0;padding:0}
.wa-palavras li{display:inline-flex;align-items:center;gap:2px;padding-left:12px;border-radius:22px;background:var(--sal-2);font-size:13px;font-weight:500;color:var(--tinta)}
.wa-palavras button{width:44px;height:44px;display:grid;place-items:center;border:0;background:transparent;border-radius:22px;color:var(--vinho);cursor:pointer}
.wa-palavras button:hover{background:var(--ambar-3)}
.wa-palavras button .ico{width:16px;height:16px}
.wa-add{display:flex;gap:8px;align-items:flex-end}
.wa-add .campo{flex:1;margin:0}
.wa-regra{list-style:none;margin:0;padding:0 24px 18px;display:grid;gap:10px;counter-reset:r}
.wa-regra li{display:grid;grid-template-columns:30px minmax(0,1fr);gap:10px;font-size:13.5px;line-height:1.5}
.wa-regra .disco{--d:28px;--f:15px}
.wa-regra small{display:block;font-size:12.5px;color:var(--texto-2)}
.wa-regra b{font-weight:600}
.wa-hora{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.wa-dias{display:flex;flex-wrap:wrap;gap:4px 10px}
.wa-dias .opcao{margin:0;padding:10px 8px}
.wa-sempre{list-style:none;margin:0;padding:0 24px 16px;display:grid;grid-template-columns:1fr 1fr;gap:10px 20px}
.wa-sempre li{display:grid;grid-template-columns:22px minmax(0,1fr);gap:10px;font-size:13.5px;line-height:1.5}
.wa-sempre .ico{width:18px;height:18px;color:var(--vinho);margin-top:2px}
.wa-sempre b{font-weight:600}
.wa-sempre small{display:block;font-size:12.5px;color:var(--texto-2)}
.wa-resp{list-style:none;margin:0;padding:0 24px 18px;display:grid;gap:10px}
.wa-resp li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 12px;padding:14px 16px;border-radius:var(--raio);border:1px solid var(--borda-folha);background:var(--papel)}
.wa-resp h3{font-family:var(--serifa);font-size:18px;font-weight:500;color:var(--vinho);line-height:1.25;margin:0}
.wa-resp p{grid-column:1/-1;font-size:13.5px;line-height:1.55}
.wa-resp small{grid-column:1/-1;font-size:12px;color:var(--texto-2)}
.wa-resp .btn{grid-row:1;grid-column:2;align-self:start;margin:-6px -6px 0 0}
.wa-resp li.auto{background:var(--sal-2);border-color:var(--sal-2)}
.wa-fonte{align-self:flex-end;display:flex;align-items:flex-start;gap:6px;max-width:82%;margin-top:-4px;font-size:11.5px;color:var(--texto-2);line-height:1.4}
.wa-fonte .ico{width:14px;height:14px;color:var(--vinho-2);flex:none;margin-top:1px}
.wa-fonte b{font-weight:500;color:var(--texto)}
.wa-simfaixa{display:flex;gap:10px;align-items:center;padding:10px 24px;background:var(--ambar-3);font-size:13px;color:var(--tinta);line-height:1.45}
.wa-simfaixa .ico{color:var(--vinho);flex:none}
.wa-simfaixa b{font-weight:600}
.wa-sim-ctl{padding:0 24px 16px}
.wa-sim-ctl .x-ops-l{grid-template-columns:repeat(3,minmax(0,1fr))}
.wa-compor{display:flex;gap:8px;align-items:flex-end;padding:14px 24px 18px;border-top:1px solid var(--divisor)}
.wa-compor .campo{flex:1;margin:0}
.wa-por{list-style:none;margin:0;padding:0 24px 18px;display:grid;gap:12px}
.wa-por li{display:grid;grid-template-columns:28px minmax(0,1fr);gap:10px;font-size:13px;line-height:1.5}
.wa-por .disco{--d:28px;--f:15px}
.wa-por b{font-weight:600}
.wa-por small{display:block;font-size:12.5px;color:var(--texto-2)}
.wa-por .passa{padding:10px 12px;border-radius:var(--raio);border:1px solid var(--borda-folha);box-shadow:inset 3px 0 0 var(--vinho)}
.wa-frase{margin:0;padding:16px 18px;border-radius:var(--raio);background:var(--sal-2);font-family:var(--serifa);font-size:19px;line-height:1.45;color:var(--tinta)}
.wa-frase b{font-weight:600;color:var(--vinho)}
.wa-nums{display:flex;gap:22px;flex-wrap:wrap;padding:0 24px 18px}
.wa-nums div{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--texto-2);line-height:1.3}
.wa-nums .disco{--d:40px;--f:20px}
.wa-naosoube{list-style:none;margin:0;padding:0 24px 18px;display:grid;gap:10px}
.wa-naosoube li{display:grid;gap:6px;padding:12px 14px;border-radius:var(--raio);border:1px solid var(--borda-folha);font-size:13px;line-height:1.5}
.wa-naosoube q{font-weight:500}
.wa-naosoube small{font-size:12px;color:var(--texto-2)}
.wa-naosoube .btn{justify-self:start}
.janela .wa-frase{font-size:17px}
.janela .x-pe-nota{margin-top:2px}

@media (max-width:1180px){
  .wa-grade{grid-template-columns:minmax(0,1fr) 320px}
  .wa-passos small,.wa-ia-nav small{display:none}
}
@media (max-width:760px){
  .wa,.wa-col{gap:16px}
  .wa-grade{grid-template-columns:minmax(0,1fr);gap:16px}
  .wa-cab h1{font-size:30px}
  .wa-cab .btn{flex:1 1 100%}
  .wa-abas{grid-template-columns:1fr 1fr!important}
  .wa-abas a{flex-wrap:wrap;line-height:1.2;padding:6px!important;min-height:56px!important;text-align:center}
  .wa-abre{grid-template-columns:minmax(0,1fr);padding:18px 16px 4px;gap:12px}
  .wa-abre h2{font-size:24px}
  .wa-corpo{padding:0 16px 18px}
  .wa-maos{grid-template-columns:1fr}
  .wa-caminhos{grid-template-columns:1fr}
  .wa-caminho{padding:16px}
  .wa-caminho .btn{justify-self:stretch}
  .wa-sobre{margin-top:4px!important}
  .wa-passos{grid-template-columns:repeat(5,minmax(0,1fr))}
  .wa-passos a,.wa-passos .p{flex-direction:column;gap:4px;padding:8px 2px;min-height:68px;text-align:center}
  .wa-passos strong{font-size:11.5px}
  .wa-passos small{display:none}
  .wa-passo-cab{padding:16px 16px 4px}
  .wa-passo-cab h2{font-size:24px}
  .wa-meta li.aqui{margin:0 -16px;padding:14px 16px}
  .wa-acoes{padding:6px 16px 18px}
  .wa-acoes .btn{flex:1 1 100%}
  .wa-resumo{padding:0 16px 14px}
  .wa-form{padding:4px 16px 18px}
  .wa-form .x-ops-l,.wa-form .wa-tres .x-ops-l{grid-template-columns:1fr}
  .wa-acoes .btn-pri{order:-1}
  .wa-saude{grid-template-columns:1fr}
  .wa-ind{padding:14px 16px;border-right:0!important}
  .wa-hist{padding:0 16px 16px}
  .wa-btns{padding:4px 16px 18px}
  .wa-duas{grid-template-columns:1fr}
  .wa-duas>section{padding:14px 16px}
  .wa-duas>section+section{border-left:0;border-top:1px solid var(--divisor)}
  .wa-num-cab{padding:16px}
  .wa-num-cab h2{font-size:22px}
  .wa-num-cab .lado{margin-left:0;align-items:flex-start}
  .wa-ia-faixa{padding:14px 16px}
  .wa-ia-faixa .bts{width:100%}
  .wa-ia-faixa .bts .btn{flex:1 1 100%}
  .wa-ia-nav{grid-template-columns:repeat(2,minmax(0,1fr))}
  .wa-ia-nav li:nth-child(3){border-left:0}
  .wa-ia-nav li:nth-child(n+3){border-top:1px solid var(--divisor)}
  .wa-ia-nav a{padding:8px 12px;gap:8px;min-height:56px}
  .wa-ia-nav strong{font-size:13px}
  .wa-pode,.wa-nunca,.wa-sempre{grid-template-columns:1fr;padding-left:16px;padding-right:16px}
  .wa-fixo{margin:0 16px 16px}
  .wa-quem,.wa-regra,.wa-resp,.wa-por,.wa-naosoube{padding-left:16px;padding-right:16px}
  .wa-hora{grid-template-columns:1fr 1fr}
  .wa-simfaixa{padding:10px 16px}
  .wa-sim-ctl{padding:0 16px 14px}
  .wa-sim-ctl .x-ops-l{grid-template-columns:1fr}
  .wa-compor{padding:12px 16px 16px}
  .wa-nums{padding:0 16px 14px;gap:14px}
  .wa-resp .btn{margin:-4px -4px 0 0}
}
"""


# ---------------------------------------------------------------- peças
def selo(tipo, txt, i=None):
    return f'<span class="selo selo-{tipo}">{ico(i) if i else ""}{txt}</span>'


def folha(id_, titulo, sub, corpo, icone=None, cls=''):
    s = f'<p class="sub">{sub}</p>' if sub else ''
    i = ico(icone) if icone else ''
    return (f'<section class="folha {cls}" aria-labelledby="{id_}" style="overflow:hidden"><div class="folha-cab"><div><h2 id="{id_}">{i}{titulo}</h2>{s}</div></div>{corpo}</section>')


def lista_x(itens):
    return '<ul class="cv-lista-x">' + ''.join(f'<li>{ico(i)}<span>{t}</span></li>' for i, t in itens) + '</ul>'


NUM = '(11) 97405-2210'
NOME = 'Ribeiro &amp; Matos Advocacia'

SIT_NUM = {
    'nao': selo('neutro', 'Não ligado'),
    'ligando': selo('implant', 'Ligando'),
    'analise': selo('atencao', 'Esperando a Meta', 'relogio'),
    'ligado': selo('ativo', 'Ligado', 'check'),
    'recusado': selo('urgente', '1 aviso recusado', 'alerta'),
}
SIT_IA = {
    'off': selo('neutro', 'Desligada'),
    'on': selo('ativo', 'Ligada', 'check'),
}


def cab(sub_lede=None):
    lede = sub_lede or 'O número de WhatsApp do escritório e como a IA atende os clientes por ele.'
    return (f'<div class="wa-cab"><div><p class="sobretitulo">Escritório</p><h1>WhatsApp e IA</h1><span class="fio" aria-hidden="true"></span>'
            f'<p class="lede">{lede}</p></div></div>')


def abas(atual, num, ia_):
    a1 = f' aria-current="page"' if atual == 'num' else ''
    a2 = f' aria-current="page"' if atual == 'ia' else ''
    return (f'<nav class="abas wa-abas" aria-label="Partes da página"><a href="{U}ligado"{a1}>{ico("whats", "ico ico-s")}Número do WhatsApp{SIT_NUM[num]}</a>'
            f'<a href="{U}ia"{a2}>{ico("ia", "ico ico-s")}Como a IA atende{SIT_IA[ia_]}</a></nav>')


# ---------------------------------------------------------------- 1. não ligado
def tela_nao_ligado():
    maos = ('<ul class="wa-maos" aria-label="O que ter em mãos">'
            f'<li>{ico("celular")}<span><b>Um número só do escritório</b><small>Um chip novo ou o fixo do escritório. Não use o celular pessoal de ninguém: o número fica com o escritório, mesmo se a pessoa sair.</small></span></li>'
            f'<li>{ico("telefone")}<span><b>Esse telefone por perto</b><small>A Meta manda um código por SMS ou liga e dita o código. Número fixo recebe por ligação.</small></span></li>'
            f'<li>{ico("chave")}<span><b>A sua conta do Facebook</b><small>É com ela que a Meta (dona do WhatsApp) confirma quem você é. Nada é publicado no seu perfil, e o T3jus não vê a sua senha.</small></span></li>'
            f'<li>{ico("coluna")}<span><b>Nome e CNPJ do escritório</b><small>Ribeiro &amp; Matos Sociedade de Advogados · 41.276.839/0001-34. Já vêm preenchidos do Escritório.</small></span></li></ul>')
    caminhos = (f'<div class="wa-caminhos">'
                f'<div class="wa-caminho pri"><span class="tempo">{ico("relogio")}Uns 15 minutos</span><h3>Ligar agora, passo a passo</h3>'
                f'<p>Você faz sozinha, com o T3jus explicando cada tela, inclusive a janela da Meta. Dá para parar e continuar depois.</p>'
                f'<a class="btn btn-pri" href="{U}passos">{ico("ligar")}Começar a ligar</a></div>'
                f'<div class="wa-caminho"><span class="tempo">{ico("video")}30 minutos, por vídeo</span><h3>Marcar ligação com a equipe T3jus</h3>'
                f'<p>A equipe faz junto com você, com o telefone desse número em mãos.</p>'
                f'<a class="btn btn-sec" href="#">{ico("agenda")}Marcar a ligação</a></div></div>')
    principal = (f'<section class="folha" aria-labelledby="t-nl" style="overflow:hidden"><div class="wa-abre"><span class="icone-estado">{ico("whats")}</span>'
                 f'<div><h2 id="t-nl">Ligue o WhatsApp do escritório</h2><p>Os clientes escrevem para o número do escritório, as conversas aparecem em Conversas e, quando você quiser, a IA responde o que sabe e passa para a equipe o que não sabe.</p></div></div>'
                 f'<div class="wa-corpo"><h3 class="sobretitulo" style="margin-top:12px;font-family:inherit;font-weight:500">O que ter em mãos</h3>{maos}{caminhos}'
                 f'<p class="wa-nota">{ico("cadeado")}<span>Só <b>Marina Ribeiro</b>, a sócia dona, liga, muda e desliga. Fica no histórico do escritório quem fez e quando.</span></p></div></section>')
    muda = folha('t-muda', 'O que muda ao ligar', 'Nada sai para cliente sem você revisar', lista_x([
        ('conversas', '<b>As conversas chegam em Conversas.</b> Quem escrever para o número aparece lá, para a equipe responder.'),
        ('ia', '<b>A IA só responde depois que você ligar a IA</b>, em “Como a IA atende”. Dá para preparar antes.'),
        ('whats', '<b>Os avisos automáticos</b> (lembrete, cobrança, etapa do caso) saem depois que a Meta aprovar cada texto. Costuma levar até 1 dia.'),
        ('moeda', '<b>A Meta cobra pelos avisos que o escritório começa</b>, por mensagem, no cartão da conta da Meta do escritório. Responder ao cliente em até 24 horas da mensagem dele não é cobrado.'),
    ]))
    app = folha('t-app', 'Já usa o WhatsApp Business no celular?', None,
                f'<div class="wa-corpo"><p>Pode continuar. O mesmo número fica no app do celular e no T3jus. O que alguém responder pelo celular também aparece em Conversas, e a IA fica quieta naquela conversa.</p>'
                f'<p class="wa-nota">{ico("ajuda")}<span>Algumas funções do app ficam desligadas, como mensagens temporárias e listas de transmissão.</span></p></div>')
    return f'<div class="wa">{cab()}{abas("num", "nao", "off")}<div class="wa-grade"><div class="wa-col">{principal}</div><aside class="wa-col" aria-label="Antes de ligar">{muda}{app}</aside></div></div>'


# ---------------------------------------------------------------- 2 e 3. assistente de ligar
PASSOS = [('numero', 'Número'), ('meta', 'Entrar com a Meta'), ('nome', 'Nome que aparece'), ('codigo', 'Código'), ('pronto', 'Pronto')]
PASSOS_CURTO = {'meta': 'Meta', 'nome': 'Nome'}


def passos_nav(atual, subs):
    h = ''
    idx = [k for k, _ in PASSOS].index(atual)
    for n, (k, nome) in enumerate(PASSOS, 1):
        curto = PASSOS_CURTO.get(k)
        rot = (f'<span class="so-pc-i">{nome}</span><span class="so-cel">{curto}</span>' if curto else nome)
        sub = f'<small>{subs.get(k, "")}</small>' if subs.get(k) else ''
        if n - 1 < idx:
            h += (f'<li><a class="feito" href="{U}numero-erro"><span class="disco">{ico("check")}</span><span><strong>{rot}<span class="sr">, feito</span></strong>{sub}</span></a></li>')
        elif n - 1 == idx:
            h += f'<li><span class="p" aria-current="step"><span class="disco"><span>{n}</span></span><span><strong>{rot}</strong>{sub}</span></span></li>'
        else:
            h += f'<li><span class="p"><span class="disco"><span>{n}</span></span><span><strong>{rot}</strong>{sub}</span></span></li>'
    return f'<nav aria-label="Passos para ligar o WhatsApp"><ol class="wa-passos">{h}</ol></nav>'


def resumo_lig(erro=False):
    num = '(11) 3032-4410' if erro else NUM
    return folha('t-res', 'O que você já informou', 'Fica salvo: dá para parar e continuar depois',
                 f'<dl class="wa-resumo"><div><dt>Número</dt><dd class="num">{num}{"" if erro else "<small>Chip só do escritório</small>"}</dd></div>'
                 f'<div><dt>Receber o código por</dt><dd>{"SMS" if erro else "SMS"}</dd></div>'
                 f'<div><dt>App WhatsApp Business no celular</dt><dd>{"Não usa" if erro else "Continua usando"}</dd></div>'
                 f'<div><dt>Escritório</dt><dd>Ribeiro &amp; Matos Sociedade de Advogados<small>CNPJ 41.276.839/0001-34</small></dd></div></dl>'
                 f'<div class="wa-corpo" style="padding-top:0"><p class="wa-nota">{ico("cracha")}<span>Travou em alguma tela? <a href="#">Marque a ligação com a equipe T3jus</a>: ela continua de onde você parou.</span></p></div>', 'escudo')


def tela_passos():
    meta = ('<ol class="wa-meta">'
            f'<li><span class="disco" aria-hidden="true"><span>a</span></span><span><b>Entrar com o Facebook.</b><small>Use a sua conta. Ela só serve para a Meta saber quem você é; nada aparece no seu perfil.</small></span></li>'
            f'<li><span class="disco" aria-hidden="true"><span>b</span></span><span><b>Escolher ou criar o “portfólio empresarial”.</b><small>É o cadastro do escritório na Meta. Se ainda não tiver, crie com estes dados:</small>'
            f'<span class="wa-copiar"><span>Nome: <b>Ribeiro &amp; Matos Sociedade de Advogados</b></span><span>Site: <b>ribeiromatos.adv.br</b></span><span>País: <b>Brasil</b></span></span></span></li>'
            f'<li><span class="disco" aria-hidden="true"><span>c</span></span><span><b>Escolher ou criar a conta do WhatsApp do escritório.</b><small>Se aparecer uma conta antiga, escolha a do escritório. Na dúvida, crie uma nova.</small></span></li>'
            f'<li><span class="disco" aria-hidden="true"><span>d</span></span><span><b>Confirmar o número e o nome que aparece para o cliente.</b><small>O número já vai preenchido: <span class="num">{NUM}</span>. O nome, você escolhe no próximo passo daqui.</small></span></li>'
            f'<li><span class="disco" aria-hidden="true"><span>e</span></span><span><b>Permitir que o T3jus envie e receba mensagens por esse número.</b><small>É o que liga o número às Conversas. Você pode tirar essa permissão depois, na própria Meta, ou desligando aqui.</small></span></li></ol>')
    corpo = (f'<div class="wa-passo-cab"><p class="sobretitulo">Passo 2 de 5 · Entrar com a Meta</p><h2 id="t-ps">Agora abrimos a janela da Meta</h2>'
             f'<p>O WhatsApp é da Meta, a empresa do Facebook. Para o número ficar no nome do escritório, a Meta pede que você entre numa janela dela. Veja antes o que vai aparecer, em ordem:</p></div>'
             f'<div class="wa-corpo">{meta}</div>'
             f'<div class="wa-acoes"><a class="btn btn-sec" href="{U}numero-erro">{ico("esq")}Voltar</a><button class="btn btn-pri" type="button">{ico("janela")}Abrir a janela da Meta</button>'
             f'<p class="wa-nota">{ico("ajuda")}<span>A janela abre por cima desta página. Se não abrir, permita janelas novas no navegador. Quando você terminar lá, esta página segue sozinha para o passo 3.</span></p></div>')
    principal = f'<section class="folha" aria-labelledby="t-ps" style="overflow:hidden">{corpo}</section>'
    subs = {'numero': NUM, 'meta': 'Janela da Meta', 'nome': 'Conferido pela Meta', 'codigo': 'Por SMS', 'pronto': 'Revisar a IA e os avisos'}
    return (f'<div class="wa">{cab("Ligar o número do escritório, passo a passo. Uns 15 minutos.")}{passos_nav("meta", subs)}'
            f'<div class="wa-grade"><div class="wa-col">{principal}</div><aside class="wa-col" aria-label="Resumo">{resumo_lig()}{depois_meta()}</aside></div></div>')


def depois_meta():
    return folha('t-dm', 'Depois da janela', None, '<ol class="cv-passos" style="padding:0 24px 20px;margin:0">'
                 f'<li><span class="disco"><span>3</span></span><span><b>Nome que aparece.</b><small>Ex.: “Ribeiro &amp; Matos Advocacia”. A Meta confere em 1 a 2 dias; até lá, aparece só o número.</small></span></li>'
                 f'<li><span class="disco"><span>4</span></span><span><b>Código.</b><small>Chega por SMS ou ligação. Se o número já está no app do celular, você confirma pelo próprio app.</small></span></li>'
                 f'<li><span class="disco"><span>5</span></span><span><b>Pronto.</b><small>O número liga. A IA e os avisos esperam a sua revisão.</small></span></li></ol>')


def tela_numero_erro():
    resumo = aviso('urgencia', '2 pontos para corrigir antes de continuar',
                   '<a href="#n-num">Número: já está ligado a outro sistema</a> · <a href="#n-cod-l">Código: número fixo não recebe SMS</a>')
    num = campo('n-num', 'Número do WhatsApp do escritório', '(11) 3032-4410', im='tel', foco=True,
                ajuda='Com DDD. Pode ser chip ou fixo, desde que seja do escritório.',
                erro='Este número já está ligado ao WhatsApp por outro sistema de atendimento (de outra empresa). Peça a quem cuida desse sistema para soltar o número e volte aqui, ou use outro número.')
    dono = marcar('n-dono', 'Confirmo que este número é do escritório, não o celular pessoal de alguém', 'Se a pessoa sair, o número continua com o escritório.', True)
    cod = (f'<fieldset class="x-ops" aria-describedby="n-cod-er" id="n-cod"><legend id="n-cod-l">Como receber o código da Meta</legend><div class="x-ops-l">'
           f'<label class="opcao"><input class="marcar" type="radio" name="n-cod" value="sms" checked aria-invalid="true"><span>Por SMS<small>Só para celular</small></span></label>'
           f'<label class="opcao"><input class="marcar" type="radio" name="n-cod" value="voz"><span>Por ligação de voz<small>A Meta liga e uma voz dita o código. Serve para fixo.</small></span></label></div>'
           f'<p class="erro-msg" id="n-cod-er">{ico("alerta", "ico ico-s")}Número fixo não recebe SMS. Escolha “Por ligação de voz”: atenda o fixo do escritório e anote os 6 números.</p></fieldset>')
    app = opcoes_radio('n-app', 'Este número já está no app WhatsApp Business de algum celular?', [
        ('nao', 'Não', 'O número passa a ser usado só pelo T3jus.'),
        ('sim', 'Sim, e quero continuar usando', 'O app continua no celular. O que for respondido por lá aparece em Conversas.')], 'nao')
    form = (f'<div class="wa-passo-cab"><p class="sobretitulo">Passo 1 de 5 · Número</p><h2 id="t-ne">Qual número os clientes vão usar?</h2></div>'
            f'<form class="wa-form" action="#" onsubmit="return false" novalidate>{resumo}{num}{dono}{cod}{app}'
            f'<div class="wa-acoes" style="padding:0"><a class="btn btn-sec" href="{U}nao-ligado">{ico("esq")}Voltar</a><button class="btn btn-pri" type="submit">Continuar{ico("dir")}</button></div></form>')
    principal = f'<section class="folha" aria-labelledby="t-ne" style="overflow:hidden">{form}</section>'
    ajuda = folha('t-qn', 'Que número usar?', None, lista_x([
        ('check', '<b>Melhor: um chip só do escritório</b>, num celular que fica no escritório.'),
        ('check', '<b>Pode: o fixo do escritório.</b> O código chega por ligação de voz.'),
        ('proibido', '<b>Evite o celular pessoal</b> de quem trabalha aqui. Se a pessoa sair, leva os clientes junto.'),
        ('sincronia', '<b>Número em outro sistema?</b> O sistema antigo precisa soltar o número antes. Isso não apaga as conversas de lá.'),
    ]))
    subs = {'numero': 'Com ajuste', 'meta': 'Janela da Meta', 'nome': 'Conferido pela Meta', 'codigo': 'SMS ou ligação', 'pronto': 'Revisar a IA e os avisos'}
    return (f'<div class="wa">{cab("Ligar o número do escritório, passo a passo. Uns 15 minutos.")}{passos_nav("numero", subs)}'
            f'<div class="wa-grade"><div class="wa-col">{principal}</div><aside class="wa-col" aria-label="Ajuda">{ajuda}{resumo_lig(True)}</aside></div></div>')


# ---------------------------------------------------------------- 4 a 7. número ligado
MODELOS = [
    ('moeda', 'Pagamento recebido', 'Financeiro · quando o recebimento é registrado'),
    ('moeda', 'Parcela vai vencer', 'Financeiro · 3 dias antes do vencimento'),
    ('alerta', 'Parcela em atraso', 'Financeiro · 1, 7 e 15 dias depois'),
    ('balanca', 'Etapa do caso', 'Jurídico · um texto por etapa (12 etapas)'),
    ('relogio', 'Lembrete de audiência', 'Jurídico · 1 dia e 2 horas antes'),
    ('carteira', 'Prestação de contas', 'Financeiro · quando o repasse é registrado'),
]
M_SIT = {
    'ap': lambda q: f'<div class="wa-sit">{selo("ativo", "Aprovado", "check")}<small>{q}</small></div>',
    'an': lambda q: f'<div class="wa-sit">{selo("atencao", "Em análise na Meta", "relogio")}<small>{q}</small></div>',
    're': lambda q: f'<div class="wa-sit">{selo("urgente", "Recusado", "alerta")}<small>{q}</small></div>',
}


def tabela_modelos(sits, so_ver=False):
    tr, cd = '', ''
    for (i, n, q), (s, sq, acao) in zip(MODELOS, sits):
        cls = ' class="recusado"' if s == 're' else ''
        ac = f'<a class="btn btn-sec btn-compacto" href="{U}modelo-recusado">{ico("lapis")}Ajustar o texto<span class="sr">: {n}</span></a>' if (acao and not so_ver) else ''
        tr += f'<tr{cls}><td><div class="wa-mod">{ico(i)}<div><strong>{n}</strong><small>{q}</small></div></div></td><td>{M_SIT[s](sq)}</td><td>{ac}</td></tr>'
        acc = f'<div class="c-acoes">{ac.replace(" btn-compacto", "")}</div>' if ac else ''
        cd += (f'<li class="cartao"{" style=\"box-shadow:inset 3px 0 0 var(--vinho-3)\"" if s == "re" else ""}><div class="wa-mod">{ico(i)}<div><strong>{n}</strong><small>{q}</small></div></div>{M_SIT[s](sq)}{acc}</li>')
    return (f'<table class="so-pc wa-tab"><caption class="sr">Avisos automáticos e a situação na Meta</caption><colgroup><col style="width:46%"><col style="width:34%"><col style="width:20%"></colgroup>'
            f'<thead><tr><th scope="col">Aviso</th><th scope="col">Situação na Meta</th><th scope="col"><span class="sr">Ação</span></th></tr></thead><tbody>{tr}</tbody></table>'
            f'<ul class="cartoes so-cel" aria-label="Avisos automáticos">{cd}</ul>')


def num_cab(titulo, sit, lado):
    return (f'<div class="wa-num-cab"><span class="disco">{ico("whats")}</span><div><p class="sobretitulo">Número do escritório</p><h2 id="t-num" class="num">{titulo}</h2></div>'
            f'<div class="lado">{sit}<span>{lado}</span></div></div>')


def tela_em_analise():
    duas = (f'<div class="wa-duas"><section aria-labelledby="t-ja"><h3 id="t-ja">{ico("check")}Já funciona</h3><ul class="cv-lista-x" style="padding:0">'
            f'<li>{ico("conversas")}<span><b>Receber e responder clientes.</b> As mensagens chegam em Conversas. Responder é livre até 24 horas depois da última mensagem do cliente.</span></li>'
            f'<li>{ico("celular")}<span><b>O app no celular continua.</b> O que alguém responder por lá aparece em Conversas.</span></li></ul></section>'
            f'<section aria-labelledby="t-esp"><h3 id="t-esp">{ico("relogio")}Espera a Meta</h3><ul class="cv-lista-x" style="padding:0">'
            f'<li>{ico("selo")}<span><b>O nome “{NOME}”.</b> Até a Meta conferir, o cliente vê só o número.</span></li>'
            f'<li>{ico("whats")}<span><b>4 dos 6 avisos automáticos.</b> Avisos que o escritório começa só saem com o texto aprovado pela Meta.</span></li></ul></section></div>')
    principal = (f'<section class="folha" aria-labelledby="t-num" style="overflow:hidden">{num_cab(NUM, SIT_NUM["analise"], "Ligado ontem, 16:05, por Marina")}{duas}</section>')
    mods = folha('t-mod', 'Avisos automáticos na Meta', 'Cada texto que o escritório começa passa pela Meta antes de sair',
                 tabela_modelos([('ap', 'Aprovado ontem, 16:40', 0), ('an', 'Enviado ontem, 16:06 · costuma levar até 1 dia', 0), ('an', 'Enviado ontem, 16:06', 0),
                                 ('an', 'Enviado ontem, 16:06 · 12 textos', 0), ('ap', 'Aprovado ontem, 16:22', 0), ('an', 'Enviado ontem, 16:06', 0)]), 'whats')
    lado = folha('t-prox', 'O que fazer agora', 'Enquanto a Meta confere', '<ol class="cv-passos" style="padding:0 24px 20px;margin:0">'
                 f'<li><span class="disco"><span>1</span></span><span><b>Prepare a IA.</b><small>Em “Como a IA atende”, revise como ela se apresenta e teste sem enviar nada.</small><a class="btn btn-sec" href="{U}ia" style="margin-top:8px">{ico("ia")}Preparar a IA</a></span></li>'
                 f'<li><span class="disco"><span>2</span></span><span><b>Confirme a empresa na Meta.</b><small>Com o CNPJ, a Meta confirma o escritório. Isso aumenta o limite de conversas por dia.</small><a class="btn btn-sec" href="#" style="margin-top:8px">{ico("janela")}Abrir a confirmação na Meta</a></span></li>'
                 f'<li><span class="disco"><span>3</span></span><span><b>Espere o aviso no sino.</b><small>Avisamos quando o nome e cada aviso forem aprovados ou recusados.</small></span></li></ol>')
    return f'<div class="wa">{cab()}{abas("num", "analise", "off")}<div class="wa-grade"><div class="wa-col">{principal}{mods}</div><aside class="wa-col" aria-label="Próximos passos">{lado}</aside></div></div>'


def saude(recusado=False):
    return ('<ul class="wa-saude" aria-label="Saúde do número">'
            f'<li class="wa-ind"><span class="ic">{ico("selo")}</span><div><p class="dt">Nome que o cliente vê</p><div class="dd"><span class="val">{NOME}</span><p>{ico("check", "ico ico-s")} Conferido pela Meta em 13/11.</p></div></div></li>'
            f'<li class="wa-ind"><span class="ic">{ico("medidor")}</span><div><p class="dt">Qualidade, segundo a Meta</p><div class="dd"><span class="val">Alta {selo("ativo", "Boa", "check")}</span><p>Quase ninguém bloqueou ou denunciou as mensagens. Se cair para média ou baixa, avisamos no sino: o limite por dia pode baixar.</p></div></div></li>'
            f'<li class="wa-ind"><span class="ic">{ico("whats")}</span><div><p class="dt">Limite de conversas que o escritório começa, por dia</p><div class="dd"><span class="val num">18 de 250 hoje</span>'
            f'<div class="wa-medida" role="img" aria-label="18 de 250 usadas hoje"><span style="width:7.2%"></span></div><p>Responder a cliente não conta. O limite sobe quando a Meta confirmar a empresa e a qualidade continuar boa.</p></div></div></li>'
            f'<li class="wa-ind"><span class="ic">{ico("coluna")}</span><div><p class="dt">Empresa confirmada na Meta</p><div class="dd"><span class="val">{selo("atencao", "Em análise", "relogio")}</span><p>CNPJ enviado em 14/11. A Meta costuma responder em alguns dias úteis.</p></div></div></li>'
            '</ul>')


def lado_ligado(ro=False):
    dados = (f'<dl class="wa-resumo"><div><dt>Conta na Meta</dt><dd>Ribeiro &amp; Matos Sociedade de Advogados<small>Portfólio empresarial do escritório</small></dd></div>'
             f'<div><dt>App WhatsApp Business no celular</dt><dd>Continua no celular da recepção<small>O que for respondido por lá aparece em Conversas</small></dd></div>'
             + ('' if ro else f'<div><dt>Pagamento à Meta</dt><dd>Cartão na conta da Meta do escritório<small>Este mês: 214 avisos entregues. O valor sai na fatura da Meta, não na do T3jus.</small></dd></div>') + '</dl>')
    if ro:
        acoes = f'<div class="wa-corpo" style="padding-top:0"><p class="wa-nota">{ico("cadeado")}<span>Quem cuida: <b>Marina Ribeiro</b>, a sócia dona. Só ela troca o número ou desliga.</span></p></div>'
    else:
        acoes = (f'<div class="wa-btns"><button class="btn btn-sec" type="button">{ico("trocar")}Trocar o número</button>'
                 f'<a class="btn btn-perigo" href="{U}desligar" data-janela="janela-desligar">{ico("ligar")}Desligar o WhatsApp</a>'
                 f'<p class="wa-nota">{ico("cadeado")}<span>Só a sócia dona troca e desliga. Nada é apagado.</span></p></div>')
    conta = folha('t-conta', 'Conta na Meta' if ro else 'Conta e pagamento', None, dados + acoes, 'escudo')
    hist = folha('t-hist', 'Histórico do número', 'Nada é apagado', '<ul class="wa-hist">'
                 f'<li><time>14/11, 10:30</time><span><b>Marina</b> enviou o CNPJ para a Meta confirmar a empresa.</span></li>'
                 f'<li><time>13/11, 09:12</time><span>A Meta aprovou o nome <b>{NOME}</b>.</span></li>'
                 f'<li><time>12/11, 17:02</time><span>A Meta aprovou os 6 avisos automáticos.</span></li>'
                 f'<li><time>12/11, 15:20</time><span><b>Marina</b> ligou o número <span class="num">{NUM}</span>.</span></li></ul>', 'historico')
    return conta + hist


def tela_ligado(recusado=False, ro=False, dialog=''):
    principal = (f'<section class="folha" aria-labelledby="t-num" style="overflow:hidden">{num_cab(NUM, SIT_NUM["ligado"], "Ligado desde 12/11 por Marina")}{saude()}</section>')
    sits = [('ap', 'Aprovado em 12/11', 0)] * 6
    if recusado:
        sits[2] = ('re', 'Texto novo recusado hoje, 09:40. O aviso não sai até ajustar.', 1)
    mods = folha('t-mod', 'Avisos automáticos na Meta', 'Só saem com o texto aprovado pela Meta. Recusado volta com o motivo.', tabela_modelos(sits, ro), 'whats')
    topo = ''
    if recusado:
        topo = aviso('urgencia', 'A Meta recusou o texto novo de “Parcela em atraso”',
                     'Até ajustar, esse aviso não sai, e o Financeiro mostra os atrasos normalmente. Os outros 5 avisos seguem saindo.',
                     acoes=f'<a class="btn btn-pri" href="{U}modelo-recusado">{ico("lapis")}Ajustar o texto</a>')
    ro_msg = ''
    if ro:
        ro_msg = aviso('info', 'Você vê esta página só para ler', 'Quem liga, muda e desliga o WhatsApp e a IA é <b>Marina Ribeiro</b>, a sócia dona. Se algo estiver errado, fale com ela.', icone='cadeado')
    sit = 'recusado' if recusado else 'ligado'
    return (f'<div class="wa">{cab()}{ro_msg}{abas("num", sit, "off" if not ro else "on")}{topo}<div class="wa-grade"><div class="wa-col">{principal}{mods}</div>'
            f'<aside class="wa-col" aria-label="Conta e histórico">{lado_ligado(ro)}</aside></div></div>{dialog}')


def tela_modelo_recusado():
    original = ('<p class="wa-recusado"><span class="de">Texto recusado · enviado ontem, 17:50</span>'
                '<span class="wa-campo-v">{nome}</span>, sua parcela <span class="wa-campo-v">{parcela}</span> de <span class="wa-campo-v">{valor}</span> venceu em <span class="wa-campo-v">{vencimento}</span>. Pague por este link: <span class="wa-campo-v">{link de pagamento}</span></p>')
    velho = '{nome}, sua parcela {parcela} de {valor} venceu em {vencimento}. Pague por este link: {link de pagamento}'
    novo = ('Olá, {nome}. Aqui é do escritório Ribeiro & Matos. A parcela {parcela}, de {valor}, venceu em {vencimento} e ainda não aparece como paga. '
            'Se já pagou, pode desconsiderar. Para pagar, use o link {link de pagamento}. Qualquer dúvida, é só responder esta mensagem.')
    sug = (f'<div class="wa-sug" role="group" aria-labelledby="t-sug"><div class="cab">{selo("implant", "Sugerido pela IA", "ia")}<strong id="t-sug" class="wa-rot">Texto ajustado para a regra da Meta</strong></div>'
           f'<p>{H(novo)}</p><div class="bts"><button class="btn btn-sec" type="button">{ico("check")}Usar esta sugestão</button></div>'
           f'<p class="wa-nota">{ico("escudo")}<span>Sugestão não vale até você aprovar. A IA não envia nada.</span></p></div>')
    corpo = (f'<div class="wa-corpo">'
             + aviso('urgencia', 'Motivo da Meta, em palavras simples', 'O texto começa com um campo ({nome}) e termina com outro ({link de pagamento}). A Meta pede que o texto não comece nem termine com um campo.', papel='status')
             + sug
             + f'<div class="campo"><div class="campo-linha"><label for="mr-txt">Texto do aviso</label><span class="contador" id="mr-cont">{len(velho)} de 1.024 caracteres</span></div>'
             f'<textarea class="entrada" id="mr-txt" name="mr-txt" aria-describedby="mr-cont mr-aj" style="min-height:110px" data-foco>{H(velho)}</textarea>'
             f'<p class="ajuda" id="mr-aj">Ainda é o texto recusado, enviado ontem às 17:50. Use a sugestão acima ou edite aqui. Os campos entre chaves trocam pelo dado de cada cliente; sem ameaça nem exposição (CDC, art. 42).</p></div>'
             f'<div class="wa-acoes" style="padding:0"><a class="btn btn-sec" href="{U}ligado">Cancelar</a><button class="btn btn-pri" type="button">{ico("check")}Aprovar o texto e mandar à Meta</button>'
             f'<p class="wa-nota">{ico("cadeado")}<span>Só a sócia dona aprova texto. Fica no histórico quem aprovou e quando.</span></p></div></div>')
    principal = folha('t-mr', 'Ajustar o texto: Parcela em atraso', 'Aviso do Financeiro · 1, 7 e 15 dias depois do vencimento', corpo, 'lapis')
    prev = folha('t-pv', 'Como Hélio veria', 'Com a sugestão da IA e uma parcela real',
                 f'<div class="wa-corpo"><div class="wa-prev" aria-label="Prévia da mensagem"><div class="b"><span class="de">{ico("whats")}{NOME}</span>'
                 f'Olá, Hélio. Aqui é do escritório Ribeiro &amp; Matos. A parcela 3 de 6, de R$ 500,00, venceu em 25/10 e ainda não aparece como paga. Se já pagou, pode desconsiderar. Para pagar, use o link pag.t3jus.pro/rm/8f2k. Qualquer dúvida, é só responder esta mensagem.<time>10:12</time></div>'
                 f'<small>Prévia. Nada foi enviado.</small></div></div>')
    dep = folha('t-dep', 'Depois de aprovar', None, '<ol class="cv-passos" style="padding:0 24px 20px;margin:0">'
                f'<li><span class="disco"><span>1</span></span><span><b>Vai para a Meta.</b><small>Costuma responder em minutos; às vezes, até 1 dia.</small></span></li>'
                f'<li><span class="disco"><span>2</span></span><span><b>Aprovado, volta a sair sozinho.</b><small>Você recebe um aviso no sino. Atrasos de hoje entram na próxima janela das 8h.</small></span></li>'
                f'<li><span class="disco"><span>3</span></span><span><b>Recusado de novo, volta para cá</b> com o motivo.<small>A versão antiga fica no histórico.</small></span></li></ol>')
    trilha_aviso = aviso('urgencia', 'Este aviso não sai até o texto ser aprovado', 'Os outros 5 avisos seguem saindo normalmente.')
    return f'<div class="wa">{cab()}{abas("num", "recusado", "off")}<div class="wa-grade"><div class="wa-col">{principal}</div><aside class="wa-col" aria-label="Prévia e o que acontece">{prev}{dep}</aside></div></div>'


def j_desligar(abrir=False):
    corpo = (f'<ul class="cv-lista-x" style="padding:0">'
             f'<li>{ico("pausa")}<span><b>Os avisos automáticos param agora.</b> Lembretes, cobranças e etapas ficam como “não enviados”, para a equipe avisar por conta própria.</span></li>'
             f'<li>{ico("ia")}<span><b>A IA para de responder.</b></span></li>'
             f'<li>{ico("conversas")}<span><b>Mensagens novas não chegam mais ao T3jus.</b> Se o app estiver no celular, chegam só lá.</span></li>'
             f'<li>{ico("historico")}<span><b>Nada é apagado.</b> Conversas, avisos enviados e histórico ficam guardados. O número continua do escritório, na conta da Meta, e dá para ligar de novo.</span></li></ul>'
             + area_texto('dl-motivo', 'Motivo', '', ajuda='Obrigatório. Fica no histórico do escritório, com o seu nome e a hora.', foco=True)
             + marcar('dl-ok', 'Entendi que os avisos aos clientes param agora', '', False))
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-perigo" type="button">{ico("ligar")}Desligar o WhatsApp</button>'
    return janela('janela-desligar', 'Número ' + NUM, 'Desligar o WhatsApp do escritório?', 'Leia o que acontece antes de confirmar.', corpo, pe, alerta=True, abrir=abrir)


# ---------------------------------------------------------------- 8 a 13. como a IA atende
IA_NAV = [('ia', 'apresentacao', 'Apresentação e assuntos', 'conversas'), ('ia-passar', 'passar', 'Quando passa para alguém', 'mao'),
          ('ia-saber', 'saber', 'O que ela sabe', 'livro'), ('ia-testar', 'testar', 'Testar sem enviar', 'olho')]


def ia_nav(atual, subs):
    h = ''
    for est, k, nome, i in IA_NAV:
        cur = ' aria-current="page"' if k == atual else ''
        h += f'<li><a href="{U}{est}"{cur}>{ico(i)}<span><strong>{nome}</strong><small>{subs.get(k, "")}</small></span></a></li>'
    return f'<nav aria-label="Partes da IA"><ol class="wa-ia-nav">{h}</ol></nav>'


def ia_faixa(ligada=False, ro=False):
    if ligada:
        acao = '' if ro else f'<div class="bts"><button class="btn btn-sec" type="button">{ico("pausa")}Pausar a IA agora</button></div>'
        return (f'<div class="wa-ia-faixa ligada" role="status"><span class="disco">{ico("ia")}</span><div class="txt"><strong>A IA está ligada</strong>'
                f'<small>Desde hoje, 10:12, por Marina. Pausar manda as conversas direto para a equipe, pela regra de responsável; volta quando você quiser.</small></div>{acao}</div>')
    acao = (f'<div class="bts"><a class="btn btn-sec" href="{U}ia-testar">{ico("olho")}Testar sem enviar</a>'
            f'<a class="btn btn-pri" href="{U}ia-ligar" data-janela="janela-ligar">{ico("ligar")}Ligar a IA</a></div>') if not ro else ''
    return (f'<div class="wa-ia-faixa"><span class="disco">{ico("ia")}</span><div class="txt"><strong>A IA ainda está desligada</strong>'
            f'<small>Prepare e teste à vontade: nada é enviado. Enquanto estiver desligada, toda conversa vai direto para a equipe.</small></div>{acao}</div>')


SUBS_IA = {'apresentacao': '6 de 6 assuntos', 'passar': '7 casos e quando não sabe', 'saber': '5 respostas', 'testar': 'Nada é enviado'}


def nunca():
    return ('<ul class="wa-nunca">'
            f'<li>{ico("proibido")}<span><b>Opinião jurídica ou chance de ganhar.</b><small>“Acho que vamos ganhar” nunca. Passa para quem cuida do caso.</small></span></li>'
            f'<li>{ico("proibido")}<span><b>Negociar honorários ou desconto.</b><small>Passa para a sócia dona ou para o Financeiro.</small></span></li>'
            f'<li>{ico("proibido")}<span><b>Falar de outro cliente.</b><small>Nem confirmar se alguém é cliente do escritório.</small></span></li>'
            f'<li>{ico("proibido")}<span><b>Prometer prazo.</b><small>Diz o que está registrado e que uma pessoa confirma.</small></span></li></ul>'
            f'<p class="wa-fixo">{ico("cadeado")}<span><b>Fixo no T3jus, não desliga.</b> Vale para todo escritório: protege o cliente e o sigilo profissional.</span></p>')


SALVAR = (f'<div class="wa-acoes" style="padding:0">'
          f'<button class="btn btn-pri" type="button">{ico("check")}Salvar</button><p class="wa-nota">{ico("historico")}<span>Cada mudança fica no histórico, com quem mudou e quando. Vale na próxima mensagem.</span></p></div>')


def tela_ia(dialog='', ro=False):
    ap = (f'<div class="wa-form">'
          + campo('ia-nome', 'Nome da assistente', 'Assistente virtual do Ribeiro & Matos', ajuda='Sempre começa com “Assistente virtual”. A IA nunca finge ser uma pessoa.')
          + area_texto('ia-ola', 'Como ela se apresenta na primeira mensagem', 'Olá! Sou a assistente virtual do escritório Ribeiro & Matos. Posso ajudar com o andamento do seu caso, compromissos, parcelas e documentos. Se precisar, passo para uma pessoa da equipe.', cont=300,
                       ajuda='Ela se apresenta assim a cada conversa nova e sempre que alguém perguntar “é robô?”.')
          + opcoes_radio('ia-tom', 'Tom', [('formal', 'Formal', '“Prezada Sra. Antônia”'), ('cordial', 'Cordial', 'Recomendado. “Bom dia, Antônia”'), ('proximo', 'Próximo', '“Oi, Antônia!”')], 'cordial', 'wa-tres')
          + '</div>')
    f_ap = folha('t-ap', 'Como ela se apresenta', 'Sempre diz que é assistente virtual', ap, 'ia')
    pode = ('<div class="wa-pode" role="group" aria-labelledby="t-pode">'
            + marcar('p-caso', '<b>Andamento do caso</b>, em linguagem simples', 'Do texto da etapa escrito pelo Jurídico. Nunca o processo inteiro.', True)
            + marcar('p-comp', '<b>Compromissos</b>', 'Audiência, reunião e perícia da Agenda, com data, hora e local.', True)
            + marcar('p-parc', '<b>Parcelas e segunda via</b>', 'Valor, vencimento e o link de pagamento do Financeiro.', True)
            + marcar('p-docs', '<b>Documentos pedidos</b>', 'O que falta mandar e se já chegou.', True)
            + marcar('p-end', '<b>Endereço e horário</b>', 'Das respostas do escritório.', True)
            + marcar('p-arq', '<b>Receber arquivos</b>', 'Guarda na conversa e passa para alguém conferir.', True)
            + '</div>')
    f_pode = folha('t-pode', 'O que ela pode responder', 'Só sobre o cliente que está escrevendo', pode, 'check')
    f_nunca = folha('t-nunca', 'O que ela nunca faz', None, nunca(), 'proibido')
    quem = ('<ul class="wa-quem">'
            f'<li><span class="av-p forte" aria-hidden="true">AP</span><span><b>Contato principal da ficha</b><small>Ex.: Antônia Ferreira Prado. Recebe tudo o que está marcado acima.</small></span></li>'
            f'<li><span class="av-p" aria-hidden="true">JP</span><span><b>Contatos autorizados na ficha</b><small>Ex.: Joana Prado, filha de Antônia. Recebe o mesmo, porque a ficha autoriza.</small></span></li>'
            f'<li class="novo"><span class="av-p" aria-hidden="true">?</span><span><b>Número que não está em nenhuma ficha</b><small>É contato novo. A IA se apresenta, pergunta nome e assunto, não fala de nenhum caso e passa para o Comercial (Diego Almeida).</small></span></li></ul>'
            f'<p class="wa-fixo">{ico("escudo")}<span><b>Dado sensível fica só na conversa.</b> Se o cliente contar algo de saúde, por exemplo, a IA não copia para a ficha nem para resumo (LGPD).</span></p>')
    f_quem = folha('t-quem', 'Quem pode falar com a IA', 'Só os números que estão na ficha do cliente', quem, 'pessoas')
    prev = folha('t-prev', 'Como o cliente vê', 'Primeira mensagem para Antônia',
                 f'<ol class="cv-msgs" aria-label="Prévia da conversa" style="background:var(--sal-2)">'
                 f'<li class="cv-m cli"><div class="cv-b"><span class="de">Antônia Ferreira</span>Bom dia, tem novidade do meu processo?<time>09:02</time></div></li>'
                 f'<li class="cv-m ia"><div class="cv-b"><span class="de">{ico("ia")}IA do escritório</span>Bom dia, Antônia! Sou a assistente virtual do escritório Ribeiro &amp; Matos. O escritório entrou com o recurso no INSS em 16/11. Agora o INSS tem até 30 dias para analisar. Não precisa fazer nada; avisamos quando houver resposta.<time>09:02</time></div></li></ol>'
                 f'<p class="wa-nota" style="padding:12px 24px 18px">{ico("ajuda")}<span>No T3jus, a resposta da IA aparece em âmbar claro com “IA do escritório”, como em Conversas.</span></p>')
    salvar = '' if ro else SALVAR
    return (f'<div class="wa">{cab()}{abas("ia", "ligado", "off")}{ia_faixa(ro=ro)}{ia_nav("apresentacao", SUBS_IA)}'
            f'<div class="wa-grade"><div class="wa-col">{f_ap}{f_pode}{f_nunca}{f_quem}{salvar}</div><aside class="wa-col" aria-label="Prévia">{prev}</aside></div></div>{dialog}')


def tela_ia_passar():
    sempre = ('<ul class="wa-sempre">'
              f'<li>{ico("pessoas")}<span><b>Pediu para falar com advogado</b> ou com uma pessoa.</span></li>'
              f'<li>{ico("alerta")}<span><b>Reclamação.</b><small>Insatisfação com o escritório ou com o atendimento.</small></span></li>'
              f'<li>{ico("relogio")}<span><b>Urgência.</b><small>Prisão, liminar, audiência hoje, oficial de justiça na porta.</small></span></li>'
              f'<li>{ico("mao")}<span><b>Proposta de acordo.</b></span></li>'
              f'<li>{ico("doc")}<span><b>Documento novo.</b><small>Alguém precisa conferir.</small></span></li>'
              f'<li>{ico("pessoa-mais")}<span><b>Contato novo.</b><small>Número que não está em ficha: vai para o Comercial.</small></span></li>'
              f'<li>{ico("ajuda")}<span><b>Quando não sabe.</b><small>Se a resposta não está no T3jus nem nas respostas do escritório.</small></span></li></ul>'
              f'<p class="wa-fixo">{ico("cadeado")}<span><b>Fixo no T3jus.</b> O escritório pode acrescentar casos, não tirar.</span></p>')
    f_sempre = folha('t-sempre', 'Sempre passa para uma pessoa', None, sempre, 'mao')
    pal = ''.join(f'<li>{p}<button type="button" aria-label="Tirar “{p}”">{ico("x")}</button></li>' for p in ['penhora', 'bloqueio de conta', 'despejo', 'pensão atrasada', 'BO'])
    f_pal = folha('t-pal', 'Palavras do escritório', 'Se o cliente escrever uma destas, a IA passa para uma pessoa',
                  f'<div class="wa-form"><ul class="wa-palavras" aria-label="Palavras que fazem a IA passar">{pal}</ul>'
                  f'<div class="wa-add">{campo("pal-nova", "Nova palavra ou expressão", "", ph="Ex.: rescisão")}<button class="btn btn-sec" type="button">{ico("mais")}Acrescentar</button></div></div>', 'lapis')
    regra = ('<ol class="wa-regra">'
             f'<li><span class="disco"><span>1</span></span><span><b>Quem cuida do caso.</b><small>Ex.: Antônia → Larissa Costa (Prado x INSS).</small></span></li>'
             f'<li><span class="disco"><span>2</span></span><span><b>Senão, quem tem o próximo contato do cliente.</b></span></li>'
             f'<li><span class="disco"><span>3</span></span><span><b>Contato novo vai para o Comercial.</b><small>Hoje: Diego Almeida.</small></span></li>'
             f'<li><span class="disco"><span>4</span></span><span><b>Sem ninguém, vai para a sócia dona.</b><small>Marina Ribeiro. Quem sai da equipe nunca recebe.</small></span></li></ol>'
             f'<p class="wa-fixo">{ico("conversas")}<span>A mesma regra aprovada em Conversas. A conversa diz por que foi para aquela pessoa, e dá para passar para outra.</span></p>')
    f_regra = folha('t-regra', 'Para quem vai', 'Sempre há um responsável', regra, 'pessoas')
    hora = ('<div class="wa-form">'
            f'<fieldset class="x-ops"><legend>Dias de atendimento</legend><div class="wa-dias">'
            + ''.join(marcar(f'd-{d}', d, '', d not in ('Sáb', 'Dom')) for d in ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'])
            + '</div></fieldset>'
            f'<div class="wa-hora">{campo("h-ini", "Das", "9h")}{campo("h-fim", "Às", "18h")}</div>'
            f'<p class="wa-nota">{ico("agenda")}<span><b>Feriados nacionais e de São Paulo</b> entram sozinhos. Recesso do escritório: <b>21/12 a 06/01</b>, marcado na Agenda.</span></p>'
            + area_texto('h-fora', 'O que a IA diz fora do horário e em feriado', 'Recebi sua mensagem. Nossa equipe atende de segunda a sexta, das 9h às 18h. Uma pessoa vai ver {próximo atendimento}. Se eu souber responder antes, respondo por aqui.', cont=400,
                         ajuda='{próximo atendimento} vira, por exemplo, “segunda, 23/11, a partir das 9h”.')
            + campo('h-plantao', 'Telefone para urgência fora do horário', '(11) 98812-3040', opc=True, im='tel', ajuda='Só aparece quando a urgência for de prisão, liminar ou audiência no dia.')
            + '</div>')
    f_hora = folha('t-hora', 'Horário da equipe', 'Fora dele, a IA continua respondendo o que sabe', hora, 'relogio')
    prev = folha('t-prev', 'Sábado à noite', 'Como fica fora do horário',
                 f'<ol class="cv-msgs" aria-label="Prévia da conversa" style="background:var(--sal-2)">'
                 f'<li class="cv-dia">Sábado, 21/11</li>'
                 f'<li class="cv-m cli"><div class="cv-b"><span class="de">Joana Prado</span>Recebi uma carta do INSS pedindo perícia. O que eu faço?<time>21:34</time></div></li>'
                 f'<li class="cv-m ia"><div class="cv-b"><span class="de">{ico("ia")}IA do escritório</span>Oi, Joana. Recebi sua mensagem. Nossa equipe atende de segunda a sexta, das 9h às 18h. A Dra. Larissa vai ver na segunda, 23/11, a partir das 9h. Se puder, mande uma foto da carta por aqui.<time>21:34</time></div></li>'
                 f'<li class="cv-sis">{ico("mao")}<span>Passou para <b>Larissa Costa</b>, que cuida do caso. Motivo: documento novo. Ela vê na segunda.</span></li></ol>')
    return (f'<div class="wa">{cab()}{abas("ia", "ligado", "off")}{ia_faixa()}{ia_nav("passar", SUBS_IA)}'
            f'<div class="wa-grade"><div class="wa-col">{f_sempre}{f_pal}{f_regra}{f_hora}{SALVAR}</div><aside class="wa-col" aria-label="Prévia">{prev}</aside></div></div>')


def tela_ia_saber():
    resp = [
        ('Endereço e como chegar', 'Rua Cardeal Arcoverde, 1749, sala 92, Pinheiros, São Paulo. A 5 minutos a pé do metrô Fradique Coutinho (linha amarela).', 'Marina, 12/11'),
        ('Estacionamento', 'O prédio não tem estacionamento para visitantes. Há um estacionamento pago na Rua Fradique Coutinho, 1200, a 100 metros.', 'Paula, 12/11'),
        ('O que levar na primeira reunião', 'Documento com foto, CPF, comprovante de endereço e todos os papéis do caso (cartas, contratos, decisões). Pode ser cópia ou foto.', 'Marina, 12/11'),
        ('Formas de pagamento', 'Pix, boleto e cartão de crédito em até 6 vezes. A segunda via sai por aqui, com o link de pagamento.', 'Gustavo, 13/11'),
    ]
    lis = ''.join(f'<li><h3>{q}</h3><button class="btn btn-fantasma btn-icone" type="button" aria-label="Editar: {q}">{ico("lapis")}</button><p>{r}</p><small>Escrito por {w}</small></li>' for q, r, w in resp)
    lis += (f'<li class="auto"><h3>Horário de atendimento</h3><p>Segunda a sexta, das 9h às 18h. Recesso de 21/12 a 06/01.</p>'
            f'<small>Vem de “Quando passa para alguém”. Muda lá.</small></li>')
    f_resp = folha('t-resp', 'Respostas do escritório', 'A IA usa estas respostas como estão, sem inventar',
                   f'<ul class="wa-resp">{lis}</ul><div class="wa-acoes"><button class="btn btn-sec" type="button">{ico("mais")}Nova resposta</button>'
                   f'<p class="wa-nota">{ico("historico")}<span>Quem tem acesso ao Escritório sugere; só a sócia dona publica. Versões antigas ficam no histórico.</span></p></div>', 'livro')
    usa = lista_x([
        ('balanca', '<b>Jurídico:</b> o texto da etapa do caso, escrito pela equipe. Nunca peças, nem notas internas.'),
        ('agenda', '<b>Agenda:</b> compromissos do cliente com data, hora e local.'),
        ('moeda', '<b>Financeiro:</b> parcelas, vencimentos e o link da segunda via.'),
        ('doc', '<b>Clientes:</b> documentos pedidos e o que já chegou.'),
    ])
    f_usa = folha('t-usa', 'O que mais ela usa', 'Só do cliente que está escrevendo', usa + f'<p class="wa-fixo">{ico("escudo")}<span><b>A IA não aprende com as conversas</b> nem usa conversa de um cliente para responder a outro.</span></p>', 'fonte')
    ns = folha('t-ns', 'Perguntas que ela não soube', 'Para virar resposta', '<div class="wa-corpo">'
               + estado('Nada por enquanto', 'Quando a IA estiver ligada, as perguntas que ela não souber responder aparecem aqui. Com um clique, viram resposta do escritório.', 'ajuda', moldura=False, h='h3')
               + '</div>')
    return (f'<div class="wa">{cab()}{abas("ia", "ligado", "off")}{ia_faixa()}{ia_nav("saber", SUBS_IA)}'
            f'<div class="wa-grade"><div class="wa-col">{f_resp}{f_usa}</div><aside class="wa-col" aria-label="O que ela não soube">{ns}</aside></div></div>')


def tela_ia_testar():
    ctl = opcoes_radio('ts-quem', 'Conversar como', [
        ('antonia', 'Antônia Ferreira Prado', 'Cliente · contato principal'),
        ('joana', 'Joana Prado', 'Filha · contato autorizado'),
        ('novo', 'Número desconhecido', 'Fora de qualquer ficha')], 'antonia')
    msgs = (f'<ol class="cv-msgs" aria-label="Conversa de teste">'
            f'<li class="cv-m cli"><div class="cv-b"><span class="de">Antônia (teste)</span>Bom dia. Como está o meu processo do INSS?<time>10:12</time></div></li>'
            f'<li class="cv-m ia"><div class="cv-b"><span class="de">{ico("ia")}IA do escritório</span>Bom dia, Antônia! Sou a assistente virtual do escritório Ribeiro &amp; Matos. O escritório entrou com o recurso no INSS em 16/11. Agora o INSS tem até 30 dias para analisar. Não precisa fazer nada; avisamos quando houver resposta.<time>10:12</time></div></li>'
            f'<li class="wa-fonte">{ico("fonte")}<span>De onde veio: <b>Jurídico › Prado x INSS › etapa “Recurso enviado”</b>, texto escrito por Larissa.</span></li>'
            f'<li class="cv-m cli"><div class="cv-b"><span class="de">Antônia (teste)</span>E a senhora acha que eu ganho?<time>10:13</time></div></li>'
            f'<li class="cv-m ia"><div class="cv-b"><span class="de">{ico("ia")}IA do escritório</span>Essa pergunta precisa da advogada do seu caso, a Dra. Larissa Costa. Já passei para ela, e ela ou alguém da equipe responde por aqui.<time>10:13</time></div></li>'
            f'<li class="cv-sis">{ico("mao")}<span>Aqui a IA <b>passaria</b> a conversa para <b>Larissa Costa</b>, que cuida do caso. Motivo: pediu opinião sobre o resultado.</span></li></ol>')
    sim = (f'<section class="folha" aria-labelledby="t-ts" style="overflow:hidden"><div class="folha-cab"><div><h2 id="t-ts">{ico("olho")}Testar sem enviar</h2><p class="sub">Escreva como se fosse o cliente</p></div></div>'
           f'<div class="wa-sim-ctl">{ctl}</div><p class="wa-simfaixa">{ico("escudo")}<span><b>Simulação.</b> Nada é enviado a Antônia, e nada fica na ficha dela.</span></p>{msgs}'
           f'<form class="wa-compor" action="#" onsubmit="return false">{campo("ts-txt", "Escreva como Antônia", "", ph="Ex.: manda a segunda via do boleto")}<button class="btn btn-pri" type="submit">{ico("enviar")}Enviar no teste</button></form></section>')
    por = ('<ol class="wa-por">'
           f'<li><span class="disco"><span>1</span></span><span><b>Respondeu sozinha.</b><small>Assunto “Andamento do caso”, que está ligado. Antônia é contato principal da ficha.</small></span></li>'
           f'<li><span class="disco"><span>2</span></span><span class="passa"><b>Passaria para Larissa.</b><small>Regra fixa: nunca dá opinião sobre o resultado. Larissa cuida do caso (regra 1 de “Para quem vai”).</small></span></li></ol>')
    f_por = folha('t-por', 'Por que respondeu assim', 'Cada resposta, com a regra e a fonte', por, 'fonte')
    exp = folha('t-exp', 'Experimente também', None,
                f'<div class="wa-corpo"><div class="au-chips" style="display:flex;flex-wrap:wrap;gap:6px">'
                + ''.join(f'<button class="btn btn-sec" type="button" style="min-height:44px;font-size:13px">{t}</button>' for t in ['Manda a segunda via do boleto', 'Quero falar com a doutora', 'Meu filho foi preso agora', 'Quanto custa uma ação?'])
                + f'</div><p class="wa-nota">{ico("ajuda")}<span>Como “Número desconhecido”, a IA só se apresenta, pergunta nome e assunto e passa para Diego, do Comercial, sem falar de nenhum caso.</span></p></div>')
    return (f'<div class="wa">{cab()}{abas("ia", "ligado", "off")}{ia_faixa()}{ia_nav("testar", SUBS_IA)}'
            f'<div class="wa-grade"><div class="wa-col">{sim}</div><aside class="wa-col" aria-label="Explicação">{f_por}{exp}</aside></div></div>')


def j_ligar(abrir=False):
    frase = ('<p class="wa-frase">Quando um cliente da ficha escrever para <b class="num">' + NUM + '</b>, a <b>assistente virtual do Ribeiro &amp; Matos</b> responde '
             'andamento do caso, compromissos, parcelas, documentos pedidos, endereço e horário, sempre dizendo que é assistente virtual. '
             'Ela <b>passa para uma pessoa</b> nos 7 casos fixos, nas 5 palavras do escritório e quando não sabe. Fora do horário, responde e diz <b>quando alguém vai ver</b>.</p>')
    corpo = (frase
             + f'<ul class="cv-lista-x" style="padding:0"><li>{ico("conversas")}<span><b>Conversas abertas hoje</b> continuam com quem está; a IA entra só nas novas.</span></li>'
             f'<li>{ico("pausa")}<span><b>“Pausar a IA agora”</b> fica no alto desta página, a qualquer hora.</span></li></ul>'
             + marcar('lg-ok', 'Testei a IA e revisei o que ela responde', 'Último teste: hoje, 10:13, como Antônia.', True))
    pe = f'<button class="btn btn-fantasma" type="button" data-fechar>Cancelar</button><button class="btn btn-pri" type="button">{ico("ligar")}Ligar a IA</button>'
    return janela('janela-ligar', 'Como a IA atende', 'Ligar a IA do escritório', 'Em linguagem simples, o que vai acontecer. Só a sócia dona liga; fica no histórico.', corpo, pe, abrir=abrir)


def tela_ia_ligada():
    nums = ('<div class="wa-nums"><div><span class="disco"><span>4</span></span>conversas desde que ligou</div><div><span class="disco"><span>3</span></span>resolvidas pela IA</div>'
            '<div><span class="disco"><span>1</span></span>passada para a equipe</div></div>')
    hoje = folha('t-hoje', 'Hoje, desde 10:12', None, nums + f'<div class="wa-corpo" style="padding-top:0"><p><a href="{CONV}fila">Ver em Conversas</a>, na lista “Com a IA”.</p></div>', 'conversas')
    resumo = ('<ul class="cv-lista-x">'
              f'<li>{ico("conversas")}<p><b>Apresentação e assuntos.</b> Tom cordial; 6 de 6 assuntos ligados. <a href="{U}ia">Revisar</a></p></li>'
              f'<li>{ico("mao")}<p><b>Quando passa para alguém.</b> 7 casos fixos e 5 palavras; seg a sex, 9h às 18h. <a href="{U}ia-passar">Revisar</a></p></li>'
              f'<li>{ico("livro")}<p><b>O que ela sabe.</b> 5 respostas do escritório. <a href="{U}ia-saber">Revisar</a></p></li>'
              f'<li>{ico("olho")}<p><b>Testar sem enviar</b> continua aberto, mesmo com a IA ligada. <a href="{U}ia-testar">Testar</a></p></li></ul>')
    f_res = folha('t-res', 'Como ela está atendendo', 'Mudança vale na próxima mensagem', resumo, 'ia')
    ns = folha('t-ns', 'Perguntas que ela não soube', '1 hoje', '<ul class="wa-naosoube">'
               f'<li><q>Vocês atendem aos sábados?</q><small>Hélio Batista Corrêa, 10:31 · passou para Marina</small>'
               f'<button class="btn btn-sec" type="button">{ico("mais")}Virar resposta do escritório</button></li></ul>')
    hist = folha('t-hist', 'Histórico da IA', 'Nada é apagado', '<ul class="wa-hist">'
                 f'<li><time>hoje, 10:12</time><span><b>Marina</b> ligou a IA. Último teste: 10:13, como Antônia.</span></li>'
                 f'<li><time>hoje, 09:58</time><span><b>Marina</b> acrescentou a palavra “BO”.</span></li>'
                 f'<li><time>17/11, 18:20</time><span><b>Gustavo</b> sugeriu a resposta “Formas de pagamento”; Marina publicou.</span></li></ul>', 'historico')
    return (f'<div class="wa">{cab()}{abas("ia", "ligado", "on")}{ia_faixa(True)}{ia_nav("", dict(SUBS_IA, testar="Continua aberto"))}'
            f'<div class="wa-grade"><div class="wa-col">{hoje}{f_res}</div><aside class="wa-col" aria-label="Perguntas e histórico">{ns}{hist}</aside></div></div>')


def tela_so_leitura():
    return tela_ligado(ro=True)


# ---------------------------------------------------------------- estados
BARRA = (f'<template data-barra="escritorio|WhatsApp e IA"><div class="pt-barra-area"><p class="pt-area-nome">{ico("coluna")}Escritório</p>'
         f'<nav class="pt-secoes" aria-label="Seções do Escritório"><a href="../portal-v1/escritorio.html">Dados do escritório</a><a href="{U}ligado" aria-current="page">WhatsApp e IA</a></nav></div></template>\n')
C = dict(atual='escritorio', area='escritorio', secao='WhatsApp e IA', trilha='Escritório|WhatsApp e IA', titulo='WhatsApp e IA')
CL = dict(C, trilha='Escritório|WhatsApp e IA|Ligar o número', cont='0')
CI = dict(C, trilha='Escritório|WhatsApp e IA|Como a IA atende')
T = ''
T += tpl('nao-ligado', tela_nao_ligado(), **dict(C, cont='0'))
T += tpl('passos', tela_passos(), **CL)
T += tpl('numero-erro', tela_numero_erro(), **CL)
T += tpl('em-analise', tela_em_analise(), **C)
T += tpl('ligado', tela_ligado(dialog=j_desligar()), **C)
T += tpl('modelo-recusado', tela_modelo_recusado(), **dict(C, trilha='Escritório|WhatsApp e IA|Parcela em atraso'))
T += tpl('desligar', tela_ligado(dialog=j_desligar(True)), **C)
T += tpl('ia', tela_ia(dialog=j_ligar()), **CI)
T += tpl('ia-passar', tela_ia_passar(), **CI)
T += tpl('ia-saber', tela_ia_saber(), **CI)
T += tpl('ia-testar', tela_ia_testar(), **CI)
T += tpl('ia-ligar', tela_ia(dialog=j_ligar(True)), **CI)
T += tpl('ia-ligada', tela_ia_ligada(), **CI)
T += tpl('so-leitura', tela_so_leitura(), quem='sem-area', **C)

out = pagina('WhatsApp e IA', 'Escritório › WhatsApp e IA: ligar o número de WhatsApp do escritório e configurar a IA que atende os clientes.',
             '{"estado":"nao-ligado","atual":"escritorio"}', '', T, BARRA)
out = finalizar(out, CSS_CV + CSS_WA)
out = out.replace('<div class="app">', SPRITE_WA + '\n<div class="app">', 1)
out = out.replace('href="conversas.html" data-nav="conversas"', f'href="{CONV}fila" data-nav="conversas"')
out = out.replace('href="agenda.html" data-nav="agenda"', 'href="../portal-agenda-conversas/agenda.html" data-nav="agenda"')
out = out.replace('href="moldura.html', 'href="../portal-v1/moldura.html').replace('href="equipe.html"', 'href="../portal-v1/equipe.html"')
out = out.replace('href="escritorio.html" data-nav="escritorio"', f'href="{U}ligado" data-nav="escritorio"')
open(f'{SAIDA}/whatsapp.html', 'w', encoding='utf-8').write(out)
print('whatsapp ok', T.count('<template data-est='), 'estados')
