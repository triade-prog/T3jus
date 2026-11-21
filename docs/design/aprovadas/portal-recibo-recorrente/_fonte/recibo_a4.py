# Recibo em PDF (FI-14, F3.19): o modelo imprimível em A4, uma página por recibo.
# Documento do ESCRITÓRIO para o cliente: timbrado do escritório no alto, o T3jus só no rodapé (como o carnê aprovado).
# No produto é a página /recibos/:id, e o PDF sai pela impressão do navegador ("Salvar como PDF").
# Peças com prefixo rb-. Variações por ?estado= (padrao, multa, terceiro, pb).
# Uso: python3 recibo_a4.py <pasta-saida>
import sys, re, html
from comum import CSS_BASE
from rr_dados import *

SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
H = html.escape

# Fontes embutidas (as mesmas do D2 e do carnê): Alegreya 500/600 e Poppins 400/500/600
FONTES = '\n'.join(f for f in re.findall(r'@font-face\{[^}]*\}', CSS_BASE)
                   if not ('Alegreya' in f and ('font-weight:700' in f)))

_simb = open('/home/claude/t3jus/docs/marca/svg/simbolo-vinho.svg', encoding='utf-8').read()
_simb = re.sub(r'<title>.*?</title>', '', _simb)
SIMBOLO = _simb.replace('role="img" aria-label="T3jus"', 'aria-hidden="true" focusable="false" class="rb-simb"')

CSS = r"""
:root{--vinho:#692746;--vinho-2:#87335B;--vinho-3:#AC3F6B;--ambar:#DD9760;--ambar-3:#F2CDB3;--sal:#F1E6DF;--sal-2:#F2ECE8;--tinta:#2A1A22;--tinta-2:#5E4A54;
  --linha:#CDBFC6;--serifa:Alegreya,Georgia,"Times New Roman",serif;--sans:Poppins,"Segoe UI",Arial,sans-serif}
*{box-sizing:border-box}
html{background:#E7DCD5}
body{margin:0;background:#E7DCD5;color:var(--tinta);font-family:var(--sans);-webkit-print-color-adjust:exact;print-color-adjust:exact}
p,dl,dd,h1,h2,h3,ol,ul{margin:0}
ol,ul{padding:0}

/* ---------- barra da página (só na tela; some na impressão) ---------- */
.rb-barra{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:12px 20px;flex-wrap:wrap;padding:10px 24px;background:var(--vinho);color:#fff;font-size:14px}
.rb-voltar{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 12px 0 6px;border-radius:8px;color:var(--ambar-3);text-decoration:none;font-weight:500;font-size:13px}
.rb-voltar svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.6}
.rb-barra h1{font-family:var(--serifa);font-weight:500;font-size:22px;line-height:1.2}
.rb-barra h1 small{display:block;font-family:var(--sans);font-size:12px;color:var(--ambar-3);letter-spacing:.02em}
.rb-acoes{display:flex;align-items:center;gap:10px;margin-left:auto;flex-wrap:wrap}
.rb-dica{font-size:12px;color:var(--ambar-3);max-width:250px;line-height:1.4}
.rb-barra button{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border-radius:8px;font:inherit;font-weight:500;cursor:pointer;background:#fff;color:var(--vinho);border:1px solid #fff}
.rb-barra button svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.6}
.rb-barra a:focus-visible,.rb-barra button:focus-visible,.rb-var a:focus-visible{outline:3px solid var(--ambar-3);outline-offset:2px}
.rb-var{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:8px 24px;background:#4F1D35;color:var(--ambar-3);font-size:12px}
.rb-var a{display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border-radius:22px;color:#fff;text-decoration:none;font-size:13px;font-weight:500;border:1px solid rgba(242,205,179,.45)}
.rb-var a[aria-current]{background:var(--ambar-3);color:var(--vinho);border-color:var(--ambar-3)}
.rb-aviso-tela{max-width:210mm;margin:16px auto 0;padding:10px 14px;border-radius:8px;background:#fff;border-left:4px solid var(--vinho);font-size:13px;line-height:1.5}
.rb-aviso-tela b{font-weight:600}
main{display:grid;gap:24px;justify-content:center;padding:24px 16px 48px}

/* ---------- a folha A4 ---------- */
.rb-folha{width:210mm;height:296.8mm;padding:16mm 18mm 12mm;background:#fff;box-shadow:0 10px 30px -12px rgba(42,26,34,.35);overflow:hidden;display:flex;flex-direction:column;position:relative}
.pb .rb-folha{filter:grayscale(1)}
.rb-folha::before{content:"";position:absolute;left:0;right:0;top:0;height:3.2mm;background:var(--vinho)}

/* timbrado */
.rb-timbre{display:grid;grid-template-columns:minmax(0,1fr) 96mm;gap:8mm;align-items:end}
.rb-marca{display:grid;gap:.6mm}
.rb-esc{font-family:var(--serifa);font-size:26pt;font-weight:600;line-height:1;color:var(--vinho)}
.rb-esc-sub{font-size:7.4pt;letter-spacing:.36em;text-transform:uppercase;color:var(--tinta-2);font-weight:500}
.rb-ender{font-size:7.8pt;line-height:1.5;color:var(--tinta-2);text-align:right}
.rb-ender b{color:var(--tinta);font-weight:500}
.rb-fio{position:relative;height:.5mm;background:var(--vinho);margin:5mm 0 0}
.rb-fio::before{content:"";position:absolute;left:0;top:-.45mm;width:18mm;height:1.25mm;background:var(--ambar)}

/* título, número e valor */
.rb-topo{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8mm;align-items:end;margin-top:8mm}
.rb-rot{font-size:7pt;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--tinta-2)}
.rb-titulo h2{font-family:var(--serifa);font-size:34pt;font-weight:600;line-height:.95;color:var(--tinta);margin-top:1.5mm}
.rb-titulo p{font-size:9pt;color:var(--tinta-2);margin-top:2mm}
.rb-titulo p b{font-weight:600;color:var(--tinta);font-size:11pt;letter-spacing:.02em}
.rb-valor{min-width:66mm;padding:4mm 5mm;border:.35mm solid var(--vinho);border-radius:2mm;text-align:right;display:grid;gap:1mm}
.rb-valor b{font-family:var(--serifa);font-size:26pt;font-weight:600;line-height:1;color:var(--tinta);white-space:nowrap}

/* o texto do recibo */
.rb-texto{margin-top:7mm;font-family:var(--serifa);font-size:12.5pt;line-height:1.55;color:var(--tinta);text-align:justify;hyphens:auto}
.rb-texto b{font-weight:600}
.rb-texto .rb-ext{font-style:italic}

/* discriminação */
.rb-sec{margin-top:6.5mm}
.rb-sec h3{font-family:var(--serifa);font-size:12.5pt;font-weight:600;color:var(--vinho);margin-bottom:2.5mm}
.rb-tab{width:100%;border-collapse:collapse;font-size:9pt}
.rb-tab th{font-size:6.8pt;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--tinta-2);text-align:left;padding:0 0 1.6mm;border-bottom:.3mm solid var(--vinho)}
.rb-tab td{padding:2.2mm 0;border-bottom:.2mm solid #DDD0D6;vertical-align:top}
.rb-tab td small{display:block;font-size:7.6pt;color:var(--tinta-2);margin-top:.4mm}
.rb-tab th:last-child,.rb-tab td:last-child{text-align:right;white-space:nowrap}
.rb-tab tfoot td{border-bottom:0;padding-top:2.6mm;font-weight:600}
.rb-tab tfoot td:last-child{font-family:var(--serifa);font-size:14pt}

/* dados do pagamento */
.rb-dados{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4mm 6mm;padding:4mm 5mm;border-radius:1.6mm;background:var(--sal-2)}
.rb-dados div{min-width:0}
.rb-dados dt{font-size:6.6pt;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--tinta-2)}
.rb-dados dd{font-size:9pt;font-weight:500;margin-top:.6mm;line-height:1.35}
.rb-dados dd small{display:block;font-weight:400;font-size:7.6pt;color:var(--tinta-2)}
.rb-dados .rb-largo{grid-column:span 2}

/* local, data e assinatura */
.rb-fim{margin-top:auto;padding-top:16mm;display:grid;grid-template-columns:minmax(0,1fr) 84mm;gap:10mm;align-items:end}
.rb-local{font-family:var(--serifa);font-size:12pt}
.rb-quit{font-size:7.8pt;color:var(--tinta-2);line-height:1.5;margin-top:3mm;max-width:80mm}
.rb-ass{text-align:center;display:grid;gap:1mm;font-size:8.4pt;line-height:1.4}
.rb-ass .rb-linha{border-top:.3mm solid var(--tinta);margin-bottom:1.5mm}
.rb-ass b{font-weight:600;font-size:9.2pt}
.rb-ass span{color:var(--tinta-2)}
.rb-reg{margin-top:2.5mm;padding:1.6mm 2.4mm;border-left:.8mm solid var(--ambar);background:var(--sal-2);border-radius:1mm;font-size:7.4pt;line-height:1.45;color:var(--tinta-2);text-align:left}
.rb-reg b{color:var(--tinta);font-weight:600;font-size:7.4pt}
.rb-pe{margin-top:8mm;padding-top:2mm;border-top:.2mm solid var(--linha);display:flex;justify-content:space-between;align-items:center;gap:6mm;font-size:6.8pt;color:var(--tinta-2)}
.rb-t3{display:inline-flex;align-items:center;gap:1mm;white-space:nowrap;letter-spacing:.06em}
.rb-simb{width:3mm;height:3.1mm}

/* ---------- impressão ---------- */
@page{size:A4;margin:0}
@media print{
  html,body{background:#fff}
  .rb-barra,.rb-var,.rb-aviso-tela{display:none!important}
  main{display:block;padding:0}
  .rb-folha{box-shadow:none}
}
/* No celular, a página mostra a folha inteira reduzida; o documento é o PDF */
@media screen and (max-width:760px){
  .rb-barra{padding:8px 16px;gap:6px 12px}
  .rb-barra h1{font-size:19px;flex:1 1 100%;order:2}
  .rb-voltar{order:1}
  .rb-acoes{order:3;margin-left:0;flex:1 1 100%}
  .rb-acoes button{flex:1 1 100%;justify-content:center}
  .rb-dica{max-width:none}
  .rb-var{padding:6px 16px}
  main{padding:16px 16px 40px}
  .rb-folha{zoom:.45}
  .rb-aviso-tela{margin:12px 16px 0}
}
"""

SVG_ESQ = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>'
SVG_IMP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9V3.5h10V9"/><path d="M7 17H4V9h16v8h-3"/><path d="M7 14h10v6.5H7Z"/></svg>'

R_ = RECIBO


def folha(multa=False, terceiro=False):
    base = CT['valor']
    total = base + (R_['multa'] + R_['juros'] if multa else 0)
    pag = MARTA if terceiro else CLI
    if terceiro:
        quem = (f'Recebemos de <b>{MARTA["nome"]}</b>, CPF {MARTA["cpf"]}, em favor de <b>{CLI["nome"]}</b>, '
                f'CPF {CLI["cpf"]}, a quantia de ')
    else:
        quem = f'Recebemos de <b>{CLI["nome"]}</b>, CPF {CLI["cpf"]}, a quantia de '
    enc = ', já com multa e juros pelo atraso' if multa else ''
    texto = (f'<p class="rb-texto">{quem}<b>{R(total)}</b> (<span class="rb-ext">{extenso(total)}</span>), '
             f'referente à <b>parcela {R_["parcela"]} de {CT["total"]}</b> dos honorários advocatícios do contrato '
             f'<b>{CT["numero"]}</b> ({CT["objeto"]}), mês de referência <b>{R_["ref"]}</b>{enc}, '
             f'paga por <b>{R_["forma"]}</b> em <b>{R_["pago"]}</b>. Por ser verdade, damos quitação do valor acima.</p>')
    linhas = (f'<tr><td>Honorários · parcela {R_["parcela"]} de {CT["total"]}<small>Mês de referência: {R_["ref"]} · vencimento {R_["venc"]}</small></td>'
              f'<td>{R(base)}</td></tr>')
    if multa:
        linhas += (f'<tr><td>Multa por atraso<small>{CT["multa"]} sobre a parcela, como no contrato</small></td><td>{R(R_["multa"])}</td></tr>'
                   f'<tr><td>Juros de mora<small>{CT["juros"]}, por {R_["dias"]} dias de atraso</small></td><td>{R(R_["juros"])}</td></tr>')
    tab = (f'<section class="rb-sec" aria-label="Discriminação do valor"><h3>Discriminação</h3><table class="rb-tab"><thead><tr><th scope="col">Descrição</th><th scope="col">Valor</th></tr></thead>'
           f'<tbody>{linhas}</tbody><tfoot><tr><td>Total recebido</td><td>{R(total)}</td></tr></tfoot></table></section>')
    pagador = ''
    if terceiro:
        pagador = f'<div><dt>Quem pagou</dt><dd>{MARTA["nome"]}<small>CPF {MARTA["cpf"]} · {MARTA["papel"]}</small></dd></div>'
    dados = (f'<section class="rb-sec" aria-label="Dados do pagamento"><dl class="rb-dados">'
             f'<div class="{"" if terceiro else "rb-largo"}"><dt>Cliente</dt><dd>{CLI["nome"]}<small>CPF {CLI["cpf"]}</small></dd></div>'
             f'{pagador}'
             f'<div><dt>Contrato</dt><dd>{CT["numero"]}<small>Honorários · {CT["objeto"]}</small></dd></div>'
             f'<div><dt>Parcela</dt><dd>{R_["parcela"]} de {CT["total"]}<small>{R_["ref"]}</small></dd></div>'
             f'<div><dt>Forma</dt><dd>{R_["forma"]}<small>comprovante guardado no escritório</small></dd></div>'
             f'<div><dt>Data do pagamento</dt><dd>{R_["pago"]}<small>vencia em {R_["venc"]}</small></dd></div></dl></section>')
    fim = (f'<div class="rb-fim"><div><p class="rb-local">{ESC["cidade"]}, 18 de novembro de 2026.</p>'
           f'<p class="rb-quit">Este recibo dá quitação somente da parcela e dos valores descritos acima. As demais parcelas do contrato seguem como combinado.</p></div>'
           f'<div class="rb-ass"><div class="rb-linha"></div><b>{ESC["razao"]}</b><span>CNPJ {ESC["cnpj"]} · {ESC["oab"]}</span>'
           f'<p class="rb-reg">Recebimento registrado por <b>{R_["quem"]}</b>, {R_["quem_oab"]}, em {R_["pago"]}, às {R_["hora"]}.</p></div></div>')
    pe = (f'<p class="rb-pe"><span>Recibo nº {R_["numero"]} · emitido pelo escritório em {R_["pago"]} · 1 página</span>'
          f'<span class="rb-t3">{SIMBOLO}Modelo T3jus</span></p>')
    timbre = (f'<header class="rb-timbre"><div class="rb-marca"><span class="rb-esc">{ESC["nome"]}</span><span class="rb-esc-sub">{ESC["sub"]}</span></div>'
              f'<p class="rb-ender"><b>{ESC["razao"]}</b><br>CNPJ {ESC["cnpj"]} · {ESC["oab"]}<br>{ESC["endereco"]}<br>WhatsApp {ESC["whats"]} · {ESC["email"]}</p></header>'
              f'<div class="rb-fio"></div>')
    topo = (f'<div class="rb-topo"><div class="rb-titulo"><p class="rb-rot">Recibo de honorários</p><h2>Recibo</h2><p>Nº <b>{R_["numero"]}</b></p></div>'
            f'<div class="rb-valor"><span class="rb-rot">Valor recebido</span><b>{R(total)}</b></div></div>')
    return f'<article class="rb-folha" aria-label="Recibo nº {R_["numero"]}">{timbre}{topo}{texto}{tab}{dados}{fim}{pe}</article>'


ESTADOS = [
    ('padrao', 'Padrão', 'Parcela 3 de 6, paga por Pix', folha(), ''),
    ('multa', 'Com multa e juros', 'A mesma parcela, com multa e juros cobrados', folha(multa=True),
     '<b>Com multa e juros.</b> Quando quem registra preenche "Multa e juros" (no exemplo, R$ 23,80 pelos 24 dias de atraso), o recibo soma ao valor e mostra cada parte.'),
    ('terceiro', 'Pago por outra pessoa', 'Marta Corrêa pagou pelo cliente', folha(terceiro=True),
     '<b>Quem pagou não é o cliente.</b> Marta Corrêa, a esposa e contato principal, fez o Pix. O recibo diz de quem o dinheiro veio e em favor de quem: o cliente continua sendo Hélio.'),
    ('pb', 'Preto e branco', 'Como sai numa impressora comum', folha(),
     '<b>Prévia em preto e branco.</b> Tudo o que informa está em texto escuro ou em linha. O âmbar é só o filete e o traço ao lado do registro.'),
]

nav = ''.join(f'<a href="recibo-a4.html?estado={e}" data-e="{e}">{n}</a>' for e, n, _, _, _ in ESTADOS)
tpls = ''.join(f'<template data-est="{e}" data-desc="{H(d)}"><main{" class=pb" if e == "pb" else ""}>{"<p class=rb-aviso-tela role=note>" + av + "</p>" if av else ""}{f}</main></template>\n'
               for e, n, d, f, av in ESTADOS)

page = f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Recibo 2026-0187 · Hélio Batista Corrêa · Ribeiro &amp; Matos</title>
<meta name="description" content="Recibo de honorários em A4, modelo T3jus, emitido pelo escritório Ribeiro &amp; Matos ao registrar um recebimento. Para imprimir ou salvar em PDF.">
<style>
{FONTES}
{CSS}
</style>
</head>
<body>
<header class="rb-barra">
<a class="rb-voltar" href="financeiro.html?estado=rb-ficha">{SVG_ESQ}Voltar ao contrato</a>
<h1>Recibo nº 2026-0187<small>Hélio Batista Corrêa · {CT["numero"]} · parcela 3 de 6 · <span id="desc"></span></small></h1>
<div class="rb-acoes"><p class="rb-dica" id="rb-dica">Na janela que abrir, escolha <b>Salvar como PDF</b> para baixar, ou a impressora.</p>
<button type="button" onclick="window.print()" aria-describedby="rb-dica">{SVG_IMP}Baixar PDF ou imprimir</button></div>
</header>
<nav class="rb-var" aria-label="Variações do recibo (só no desenho)"><span>Variações do desenho:</span>{nav}</nav>
<div id="slot"></div>
{tpls}
<script>
(function(){{
  var q=new URLSearchParams(location.search), e=q.get('estado')||'padrao';
  var t=document.querySelector('template[data-est="'+e+'"]')||document.querySelector('template[data-est="padrao"]');
  document.getElementById('slot').appendChild(t.content.cloneNode(true));
  document.getElementById('desc').textContent=t.dataset.desc;
  document.querySelectorAll('.rb-var a').forEach(function(a){{ if(a.dataset.e===t.dataset.est) a.setAttribute('aria-current','page') }});
}})();
</script>
</body>
</html>
'''
open(f'{SAIDA}/recibo-a4.html', 'w', encoding='utf-8').write(page)
print('recibo-a4 ok', len(ESTADOS), 'estados')
