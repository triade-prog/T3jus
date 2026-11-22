# Peças comuns aos três documentos A4 da cobrança do T3jus (fatura, recibo, carnê). Prefixo dp-.
# Documento do T3jus para o escritório: o logo oficial do T3jus em vinho (versão de impressão do LEIA-ME da marca),
# sem redesenho. A barra de cima e o aviso só aparecem na tela; na impressão e no PDF somem.
import re, html
from comum import CSS_BASE

H = html.escape
MARCA = '/home/claude/t3jus/docs/marca/svg/'

FONTES = '\n'.join(f for f in re.findall(r'@font-face\{[^}]*\}', CSS_BASE)
                   if not ('Alegreya' in f and ('font-weight:700' in f)))


def _svg(nome, cls, rotulo=None):
    s = open(MARCA + nome, encoding='utf-8').read()
    s = re.sub(r'<title>.*?</title>', '', s)
    s = re.sub(r' role="img" aria-label="[^"]*"', '', s, count=1)
    attrs = f'role="img" aria-label="{rotulo}"' if rotulo else 'aria-hidden="true" focusable="false"'
    return s.replace('<svg ', f'<svg class="{cls}" {attrs} ', 1)


LOGO = _svg('logo-completo-vinho.svg', 'dp-logo', 'T3jus, Sistema jurídico')
LOGO_C = _svg('logo-compacto-vinho.svg', 'dp-logo-c', 'T3jus')
SIMB = _svg('simbolo-vinho.svg', 'dp-simb')

_I = {
    'check': '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    'relogio': '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    'x': '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    'alerta': '<path d="M12 3.5 21 19.5H3Z"/><path d="M12 10v4.5M12 16.8v.2"/>',
    'agenda': '<path d="M4 6h16v14H4Z"/><path d="M4 10h16M8 3.5V8M16 3.5V8"/>',
    'mao': '<path d="M5 20.5h14M7 16.5h10l1.5-6H5.5Z"/><path d="M12 10.5V4"/>',
    'doc': '<path d="M6 3.5h8.5L18.5 8v12.5H6Z"/><path d="M14 3.5V8.5h4.5M9 12.5h6M9 16h6"/>',
    'tesoura': '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.6 7.5 20 18M8.6 16.5 20 6"/>',
    'imprimir': '<path d="M7 9V3.5h10V9"/><path d="M7 17H4V9h16v8h-3"/><path d="M7 14h10v6.5H7Z"/>',
    'envelope': '<path d="M3.5 6h17v12h-17Z"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
}


def ico(n, cls='dp-i'):
    return f'<svg class="{cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">{_I[n]}</svg>'


def ph(txt):
    """Marcador do que ainda não foi decidido (dados do T3jus como emissor)."""
    return f'<span class="dp-ph"><span class="dp-ph-r">a definir</span> {txt}</span>'


CSS = r"""
:root{--vinho:#692746;--vinho-2:#87335B;--vinho-3:#AC3F6B;--vinho-escuro:#4F1D35;--ambar:#DD9760;--ambar-2:#E9AE90;--ambar-3:#F2CDB3;--sal:#F1E6DF;--sal-2:#F2ECE8;
  --tinta:#2A1A22;--tinta-2:#5E4A54;--linha:#CDBFC6;--linha-2:#DDD0D6;
  --serifa:Alegreya,Georgia,"Times New Roman",serif;--sans:Poppins,"Segoe UI",Arial,sans-serif;--mono:"DejaVu Sans Mono",Menlo,Consolas,monospace}
*{box-sizing:border-box}
html{background:#E7DCD5}
body{margin:0;background:#E7DCD5;color:var(--tinta);font-family:var(--sans);-webkit-print-color-adjust:exact;print-color-adjust:exact}
p,dl,dd,h1,h2,h3,ol,ul{margin:0}
ol,ul{padding:0}

/* ---------- barra da prévia (só na tela) ---------- */
.dp-barra{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:10px 20px;flex-wrap:wrap;padding:10px 24px;background:var(--vinho);color:#fff;font-size:14px}
.dp-barra h1{font-family:var(--serifa);font-weight:500;font-size:22px;line-height:1.2}
.dp-barra h1 small{display:block;font-family:var(--sans);font-size:12px;color:var(--ambar-3);letter-spacing:.02em}
.dp-acoes{display:flex;align-items:center;gap:10px;margin-left:auto;flex-wrap:wrap}
.dp-dica{font-size:12px;color:var(--ambar-3);max-width:270px;line-height:1.4}
.dp-barra button{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border-radius:8px;font:inherit;font-weight:500;cursor:pointer;background:#fff;color:var(--vinho);border:1px solid #fff}
.dp-barra button svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.6}
.dp-barra button:focus-visible,.dp-var a:focus-visible{outline:3px solid var(--ambar-3);outline-offset:2px}
.dp-var{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:8px 24px;background:var(--vinho-escuro);color:var(--ambar-3);font-size:12px}
.dp-var a{display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border-radius:22px;color:#fff;text-decoration:none;font-size:13px;font-weight:500;border:1px solid rgba(242,205,179,.45)}
.dp-var a[aria-current]{background:var(--ambar-3);color:var(--vinho);border-color:var(--ambar-3)}
.dp-aviso-tela{max-width:210mm;margin:16px auto 0;padding:10px 14px;border-radius:8px;background:#fff;border-left:4px solid var(--vinho);font-size:13px;line-height:1.5}
.dp-aviso-tela b{font-weight:600}
main{display:grid;gap:24px;justify-content:center;padding:24px 16px 48px}

/* ---------- a folha A4 ---------- */
.dp-folha{width:210mm;height:296.8mm;background:#fff;box-shadow:0 10px 30px -12px rgba(42,26,34,.35);overflow:hidden;display:flex;flex-direction:column;position:relative}
.pb .dp-folha{filter:grayscale(1)}
.dp-doc{padding:12mm 15mm 9mm}
.dp-doc::before{content:"";position:absolute;left:0;right:0;top:0;height:3.2mm;background:var(--vinho)}
.dp-i{width:1em;height:1em;flex:none;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:square;vertical-align:-.12em}

/* timbrado do T3jus */
.dp-timbre{display:grid;grid-template-columns:minmax(0,1fr) 92mm;gap:8mm;align-items:end}
.dp-logo{display:block;width:46mm;height:auto}
.dp-ender{font-size:7.6pt;line-height:1.55;color:var(--tinta-2);text-align:right}
.dp-ender b{color:var(--tinta);font-weight:500}
.dp-fio{position:relative;height:.5mm;background:var(--vinho);margin:3.5mm 0 0}
.dp-fio::before{content:"";position:absolute;left:0;top:-.45mm;width:18mm;height:1.25mm;background:var(--ambar)}
.dp-ph{display:inline-block;padding:0 1.2mm;border:.25mm dashed var(--vinho-2);border-radius:.8mm;background:var(--sal-2);color:var(--tinta);font-style:italic;line-height:1.35}
.dp-ph-r{font-style:normal;font-size:.78em;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--vinho)}

/* título, número e valor */
.dp-rot{font-size:6.8pt;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--tinta-2)}
.dp-topo{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8mm;align-items:end;margin-top:5mm}
.dp-titulo h2{font-family:var(--serifa);font-size:28pt;font-weight:600;line-height:.95;color:var(--tinta);margin-top:1.5mm}
.dp-titulo .dp-num{font-size:9pt;color:var(--tinta-2);margin-top:2mm}
.dp-titulo .dp-num b{font-weight:600;color:var(--tinta);font-size:10.5pt;letter-spacing:.02em}
.dp-valor{min-width:68mm;padding:3.6mm 5mm;border:.35mm solid var(--vinho);border-radius:2mm;text-align:right;display:grid;gap:1mm;justify-items:end}
.dp-valor b{font-family:var(--serifa);font-size:26pt;font-weight:600;line-height:1;color:var(--tinta);white-space:nowrap}
.dp-valor .dp-venc{font-size:8.6pt}
.dp-valor .dp-venc strong{font-weight:600}
.dp-exemplo{display:inline-flex;align-items:center;gap:1mm;padding:.3mm 1.8mm;border:.25mm solid var(--vinho-2);border-radius:3mm;font-size:6.4pt;font-weight:500;color:var(--vinho)}
.dp-exemplo::before{content:"";width:1.3mm;height:1.3mm;border-radius:50%;background:var(--ambar)}

/* selo de situação: sempre texto e ícone */
.dp-selo{font-family:var(--sans);display:inline-flex;align-items:center;gap:1.2mm;padding:.6mm 2.2mm;border-radius:3mm;font-size:7.6pt;font-weight:600;line-height:1.3;vertical-align:middle;margin-left:2mm}
.dp-selo .dp-i{width:3.2mm;height:3.2mm}
.dp-selo-avencer{border:.3mm solid #AC788D;color:var(--vinho-2);background:#fff}
.dp-selo-atraso{background:var(--vinho-3);color:#fff}
.dp-selo-paga{background:var(--vinho);color:#fff}
.dp-selo-cancelada{border:.3mm solid var(--tinta);color:var(--tinta);background:var(--sal-2)}

/* faixa de aviso dentro do documento */
.dp-faixa{display:flex;gap:2.6mm;align-items:flex-start;margin-top:4mm;padding:2.4mm 3.4mm;border-radius:1.6mm;font-size:8.6pt;line-height:1.45}
.dp-faixa .dp-i{width:4.2mm;height:4.2mm;margin-top:.3mm;color:var(--vinho)}
.dp-faixa b{font-weight:600}
.dp-faixa-info{background:var(--sal-2);border-left:.9mm solid var(--ambar)}
.dp-faixa-urg{background:#fff;border:.3mm solid var(--vinho-3);border-left-width:1.2mm}
.dp-faixa-urg .dp-i{color:var(--vinho-3)}
.dp-faixa-paga{background:#fff;border:.3mm solid var(--vinho);border-left-width:1.2mm}
.dp-faixa-canc{background:var(--sal-2);border:.3mm solid var(--tinta);border-left-width:1.2mm}
.dp-faixa-canc .dp-i{color:var(--tinta)}

/* quem paga e dados */
.dp-dados{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:2.2mm 5mm;margin-top:4mm;padding:3mm 4.2mm;border-radius:1.6mm;background:var(--sal-2)}
.dp-dados div{min-width:0}
.dp-dados .dp-l2{grid-column:span 2}
.dp-dados dt{font-size:6.4pt;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--tinta-2)}
.dp-dados dd{font-size:8.8pt;font-weight:500;margin-top:.5mm;line-height:1.35;overflow-wrap:anywhere}
.dp-dados dd small{display:block;font-weight:400;font-size:7.4pt;color:var(--tinta-2)}

/* seções e tabela de itens */
.dp-sec{margin-top:3.8mm}
.dp-sec h3{font-family:var(--serifa);font-size:12.5pt;font-weight:600;color:var(--vinho);margin-bottom:1.4mm;display:flex;align-items:baseline;gap:3mm}
.dp-sec h3 small{font-family:var(--sans);font-size:7.4pt;font-weight:400;color:var(--tinta-2)}
.dp-tab{width:100%;border-collapse:collapse;font-size:8.8pt}
.dp-tab th{font-size:6.6pt;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--tinta-2);text-align:left;padding:0 0 1.5mm;border-bottom:.3mm solid var(--vinho)}
.dp-tab td{padding:1.3mm 0;border-bottom:.2mm solid var(--linha-2);vertical-align:top}
.dp-tab td small{display:block;font-size:7.4pt;color:var(--tinta-2);margin-top:.4mm}
.dp-tab td q{display:block;margin-top:.6mm;padding-left:2.4mm;border-left:.6mm solid var(--ambar);font-family:var(--serifa);font-style:italic;font-size:8.6pt;color:var(--tinta)}
.dp-tab th:last-child,.dp-tab td:last-child{text-align:right;white-space:nowrap;padding-left:4mm}
.dp-tab tfoot td{border-bottom:0;padding-top:2.4mm;font-weight:600}
.dp-tab tfoot td:last-child{font-family:var(--serifa);font-size:14pt}

/* como pagar: Pix e boleto */
.dp-pagar{display:grid;gap:2.4mm}
.dp-pix{display:grid;grid-template-columns:28mm minmax(0,1fr);gap:4mm;align-items:start;padding:2.6mm 3mm;border:.25mm solid var(--linha);border-radius:1.6mm}
.qr{display:block;width:28mm;height:28mm;shape-rendering:crispEdges}
.dp-cab-cod{display:flex;align-items:center;justify-content:space-between;gap:3mm}
.dp-cab-cod p{font-family:var(--serifa);font-size:11pt;font-weight:600;color:var(--vinho);line-height:1.1}
.dp-tag{font-size:6pt;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--tinta);border:.25mm dashed var(--tinta-2);border-radius:.8mm;padding:.2mm 1.2mm;white-space:nowrap}
.dp-pix-txt{display:grid;gap:1.2mm;font-size:7.6pt;line-height:1.4;min-width:0}
.dp-pix-txt code,.dp-bol code{font-family:var(--mono);color:var(--tinta);word-break:break-all}
.dp-pix-txt code{font-size:6.6pt;line-height:1.35;padding:1.4mm 1.8mm;background:var(--sal-2);border-radius:1mm}
.dp-bol{display:grid;gap:1.2mm;padding:2.6mm 3mm;border:.25mm solid var(--linha);border-radius:1.6mm;font-size:7.6pt;line-height:1.4}
.dp-bol code{font-size:10.2pt;font-weight:700;letter-spacing:.02em;word-break:normal;white-space:nowrap}
.barras{display:block;width:103mm;height:12mm;margin:.4mm 0 0 2mm}
.dp-nota-p{color:var(--tinta-2);font-size:7.2pt}
.dp-linha{display:flex;align-items:baseline;gap:3mm;flex-wrap:wrap}
.dp-sem{display:grid;grid-template-columns:minmax(0,1fr) 62mm;gap:5mm;padding:3.6mm 4mm;border:.3mm dashed var(--vinho-2);border-radius:1.6mm;font-size:8.6pt;line-height:1.5}
.dp-sem b{font-weight:600}
.dp-sem ol{list-style:none;counter-reset:p;display:grid;gap:1.6mm;margin-top:1.6mm}
.dp-sem li{counter-increment:p;display:grid;grid-template-columns:4.6mm minmax(0,1fr);gap:1.8mm}
.dp-sem li::before{content:counter(p);display:grid;place-items:center;width:4.6mm;height:4.6mm;border-radius:50%;border:.3mm solid var(--vinho);color:var(--vinho);font-size:6.6pt;font-weight:600}
.dp-sem .dp-ctt{padding:2.6mm 3mm;border-radius:1.2mm;background:var(--sal-2);display:grid;gap:1mm;align-content:start;font-size:8pt}
.dp-sem .dp-ctt b{font-size:9pt}

/* carimbo de situação (paga, cancelada) */
.dp-carimbo-w{display:grid;grid-template-columns:minmax(0,1fr) 60mm;gap:0 5mm;align-items:center}
.dp-carimbo-w>h3{grid-column:1/-1}
.dp-carimbo-w .dp-dados,.dp-carimbo-w .dp-sem{margin-top:0}
.dp-carimbo{justify-self:center;transform:rotate(-6deg);display:grid;justify-items:center;gap:.6mm;padding:2.4mm 5mm;border:.8mm double var(--vinho);border-radius:2mm;background:#fff;color:var(--vinho);text-align:center}
.dp-carimbo b{display:flex;align-items:center;gap:1.6mm;font-family:var(--serifa);font-size:20pt;font-weight:600;letter-spacing:.12em;text-transform:uppercase;line-height:1}
.dp-carimbo b .dp-i{width:6mm;height:6mm}
.dp-carimbo span{font-size:7.6pt;font-weight:500;color:var(--tinta)}
.dp-carimbo.canc{border-color:var(--tinta);color:var(--tinta)}

/* rodapé */
.dp-pe{margin-top:auto;padding-top:2mm;border-top:.2mm solid var(--linha);display:flex;justify-content:space-between;align-items:center;gap:6mm;font-size:6.8pt;line-height:1.45;color:var(--tinta-2)}
.dp-pe b{color:var(--tinta);font-weight:600}
.dp-t3{display:inline-flex;align-items:center;gap:1mm;white-space:nowrap;letter-spacing:.06em}
.dp-simb{width:3mm;height:3.1mm}
.dp-info{margin-top:3mm;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4mm;font-size:7.4pt;line-height:1.45;color:var(--tinta-2)}
.dp-info p b{display:block;color:var(--tinta);font-weight:600;font-size:7.6pt;margin-bottom:.4mm}

/* ---------- impressão ---------- */
@page{size:A4;margin:0}
@media print{
  html,body{background:#fff}
  .dp-barra,.dp-var,.dp-aviso-tela{display:none!important}
  main{display:block;padding:0}
  .dp-folha{box-shadow:none;break-after:page;page-break-after:always}
  .dp-folha:last-child{break-after:auto;page-break-after:auto}
}
/* No celular, a prévia mostra a folha inteira reduzida (o documento é o PDF) */
@media screen and (max-width:760px){
  .dp-barra{padding:8px 16px;gap:6px 12px}
  .dp-barra h1{font-size:19px;flex:1 1 100%}
  .dp-acoes{margin-left:0;flex:1 1 100%}
  .dp-acoes button{flex:1 1 100%;justify-content:center}
  .dp-dica{max-width:none}
  .dp-var{padding:6px 16px}
  main{padding:16px 16px 40px;gap:16px}
  .dp-folha{zoom:.45}
  .dp-aviso-tela{margin:12px 16px 0}
}
"""


def timbre():
    return (f'<header class="dp-timbre"><div>{LOGO}</div>'
            f'<p class="dp-ender">{ph("razão social do T3jus")}<br>CNPJ {ph("do T3jus")}<br>{ph("endereço do T3jus")}<br>'
            f'{ph("atendimento@exemplo.com.br")}</p></header><div class="dp-fio"></div>')


def pagina(arquivo, titulo, descricao, barra_h1, barra_sub, estados, css_extra='', dica='Na janela que abrir, escolha <b>Salvar como PDF</b> para baixar, ou a impressora.'):
    """estados: lista de (id, nome, descrição curta, html das folhas, aviso na tela)."""
    nav = ''.join(f'<a href="{arquivo}?estado={e}" data-e="{e}">{n}</a>' for e, n, _, _, _ in estados)
    tpls = ''.join(f'<template data-est="{e}" data-desc="{H(d)}"><main{" class=pb" if e == "pb" else ""}>'
                   f'{"<p class=dp-aviso-tela role=note>" + av + "</p>" if av else ""}{f}</main></template>\n'
                   for e, n, d, f, av in estados)
    return f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titulo}</title>
<meta name="description" content="{descricao}">
<style>
{FONTES}
{CSS}
{css_extra}
</style>
</head>
<body>
<header class="dp-barra"><h1>{barra_h1}<small>{barra_sub} · <span id="desc"></span></small></h1>
<div class="dp-acoes"><p class="dp-dica" id="dp-dica">{dica}</p>
<button type="button" onclick="window.print()" aria-describedby="dp-dica">{ico("imprimir")}Baixar PDF ou imprimir</button></div></header>
<nav class="dp-var" aria-label="Variações do documento (só no desenho)"><span>Variações do desenho:</span>{nav}</nav>
<div id="slot"></div>
{tpls}
<script>
(function(){{
  var q=new URLSearchParams(location.search), e=q.get('estado')||'{estados[0][0]}';
  var t=document.querySelector('template[data-est="'+e+'"]')||document.querySelector('template[data-est="{estados[0][0]}"]');
  document.getElementById('slot').appendChild(t.content.cloneNode(true));
  document.getElementById('desc').textContent=t.dataset.desc;
  document.querySelectorAll('.dp-var a').forEach(function(a){{ if(a.dataset.e===t.dataset.est) a.setAttribute('aria-current','page') }});
}})();
</script>
</body>
</html>
'''
