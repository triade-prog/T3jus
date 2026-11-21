# Carnê de pagamento dos honorários parcelados (FI-23): o modelo imprimível em A4.
# Documento do ESCRITÓRIO para o cliente dele: o escritório em destaque, o T3jus só no rodapé.
# Peças com prefixo cn-. Estados por ?estado= (padrao, vencida, uma, sem-pix, pb).
# Uso: python3 carne_a4.py <pasta-saida>
import sys, re, html
from comum import CSS_BASE
from carne_dados import *

SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
H = html.escape

# Fontes embutidas (as mesmas do D2): Alegreya 500/600 e Poppins 400/500/600
FONTES = '\n'.join(f for f in re.findall(r'@font-face\{[^}]*\}', CSS_BASE)
                   if not ('Alegreya' in f and ('font-weight:700' in f)))

_simb = open('/home/claude/t3jus/docs/marca/svg/simbolo-vinho.svg', encoding='utf-8').read()
_simb = re.sub(r'<title>.*?</title>', '', _simb)
SIMBOLO = _simb.replace('role="img" aria-label="T3jus"', 'aria-hidden="true" focusable="false" class="cn-simb"')

TESOURA = ('<svg class="cn-tesoura" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>'
           '<path d="M8.6 7.5 20 18M8.6 16.5 20 6M13.5 12h0"/></svg>')

CSS = r"""
:root{--vinho:#692746;--vinho-2:#87335B;--vinho-3:#AC3F6B;--ambar:#DD9760;--ambar-3:#F2CDB3;--sal:#F1E6DF;--sal-2:#F2ECE8;--tinta:#2A1A22;--tinta-2:#5E4A54;
  --serifa:Alegreya,Georgia,"Times New Roman",serif;--sans:Poppins,"Segoe UI",Arial,sans-serif;--mono:"DejaVu Sans Mono",Menlo,Consolas,monospace}
*{box-sizing:border-box}
html{background:#E7DCD5}
body{margin:0;background:#E7DCD5;color:var(--tinta);font-family:var(--sans);-webkit-print-color-adjust:exact;print-color-adjust:exact}
p,dl,dd,h1,h2,h3,ol,ul{margin:0}
ol,ul{padding:0}

/* ---------- barra da prévia (só na tela) ---------- */
.cn-barra{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:10px 24px;background:var(--vinho);color:#fff;font-size:14px}
.cn-barra h1{font-family:var(--serifa);font-weight:500;font-size:22px;line-height:1.2}
.cn-barra h1 small{display:block;font-family:var(--sans);font-size:12px;color:var(--ambar-3);letter-spacing:.04em}
.cn-barra nav{display:flex;gap:6px;flex-wrap:wrap;margin-left:auto}
.cn-barra a,.cn-barra button{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 14px;border-radius:22px;color:#fff;text-decoration:none;font:inherit;font-size:13px;font-weight:500;border:1px solid rgba(242,205,179,.45);background:transparent;cursor:pointer}
.cn-barra a[aria-current]{background:var(--ambar-3);color:var(--vinho);border-color:var(--ambar-3)}
.cn-barra button{background:#fff;color:var(--vinho);border-color:#fff}
.cn-barra a:focus-visible,.cn-barra button:focus-visible{outline:3px solid var(--ambar-3);outline-offset:2px}
.cn-aviso-tela{max-width:210mm;margin:16px auto 0;padding:10px 14px;border-radius:8px;background:#fff;border-left:4px solid var(--vinho);font-size:13px;line-height:1.5}
.cn-aviso-tela b{font-weight:600}
main{display:grid;gap:24px;justify-content:center;padding:24px 16px 48px}

/* ---------- a folha A4 ---------- */
.cn-folha{width:210mm;height:296.8mm;padding:10mm;background:#fff;box-shadow:0 10px 30px -12px rgba(42,26,34,.35);overflow:hidden;display:flex;flex-direction:column;position:relative}
.pb .cn-folha{filter:grayscale(1)}
.cn-faixa{position:relative;height:calc(277mm / 3);flex:none;display:grid;grid-template-columns:47mm 9mm minmax(0,1fr);padding:4mm 0 3.6mm;border-bottom:.3mm dashed #6E5562}
.cn-faixa:first-child{border-top:.3mm dashed #6E5562}
.cn-faixa.cn-sem-corte-topo{border-top:0}
.cn-corte-v{position:relative}
.cn-corte-v::before{content:"";position:absolute;left:50%;top:-4mm;bottom:-3.6mm;border-left:.3mm dashed #6E5562}
.cn-tesoura{width:4.2mm;height:4.2mm;fill:none;stroke:#2A1A22;stroke-width:1.6;stroke-linecap:round;background:#fff}
.cn-faixa>.cn-tesoura{position:absolute;left:3mm;bottom:-2.3mm;padding:0 .6mm}
.cn-faixa:first-child>.cn-tesoura-topo{position:absolute;left:3mm;top:-2.3mm;padding:0 .6mm}
.cn-corte-v .cn-tesoura{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(90deg);padding:.6mm 0}

/* ---------- canhoto do escritório ---------- */
.cn-canhoto{display:flex;flex-direction:column;gap:1.7mm;font-size:7.6pt;line-height:1.3;padding-right:1mm}
.cn-rot{font-size:6.2pt;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--tinta-2)}
.cn-canhoto .cn-esc-c{font-family:var(--serifa);font-size:11pt;font-weight:600;color:var(--vinho);line-height:1.1}
.cn-canhoto .cn-parc{font-family:var(--serifa);font-size:13pt;font-weight:600;line-height:1;color:var(--tinta)}
.cn-canhoto .cn-parc small{display:block;font-family:var(--sans);font-size:7pt;font-weight:400;color:var(--tinta-2);margin-top:.8mm}
.cn-canhoto dl{display:grid;gap:1.1mm}
.cn-canhoto dt{font-size:6.2pt;color:var(--tinta-2);text-transform:uppercase;letter-spacing:.08em}
.cn-canhoto dd{font-weight:500}
.cn-pago{margin-top:auto;display:grid;gap:2.6mm;padding-top:2mm;border-top:.25mm solid var(--vinho)}
.cn-pago span{display:flex;align-items:flex-end;gap:1.5mm;font-size:7pt;color:var(--tinta-2);white-space:nowrap}
.cn-pago span i{flex:1;border-bottom:.25mm solid var(--tinta);height:3.4mm}

/* ---------- via do cliente ---------- */
.cn-via{display:flex;flex-direction:column;gap:2mm;font-size:8pt;line-height:1.32;min-width:0}
.cn-cab{display:flex;align-items:flex-end;justify-content:space-between;gap:4mm}
.cn-marca{display:grid;gap:.4mm}
.cn-esc{font-family:var(--serifa);font-size:15pt;font-weight:600;line-height:1;color:var(--vinho)}
.cn-esc-sub{font-size:6pt;letter-spacing:.32em;text-transform:uppercase;color:var(--tinta-2);font-weight:500}
.cn-doc{font-size:6.6pt;color:var(--tinta-2);margin-top:.6mm}
.cn-num{text-align:right;display:grid;justify-items:end;gap:.6mm}
.cn-num .cn-rot{letter-spacing:.14em}
.cn-num b{font-family:var(--serifa);font-size:17pt;font-weight:600;line-height:1;color:var(--tinta)}
.cn-fio{position:relative;height:.35mm;background:var(--vinho)}
.cn-fio::before{content:"";position:absolute;left:0;top:-.45mm;width:14mm;height:1.25mm;background:var(--ambar)}
.cn-corpo{display:grid;grid-template-columns:minmax(0,1fr) 63mm;gap:4mm;align-items:start}
.cn-dados{display:grid;grid-template-columns:1fr 1fr;gap:1.7mm 3mm}
.cn-enc dd{font-size:7pt!important;font-weight:600!important;line-height:1.25;color:var(--vinho-3)}
.cn-dados div{min-width:0}
.cn-dados .cn-largo{grid-column:1/-1}
.cn-dados dt{font-size:6.2pt;color:var(--tinta-2);text-transform:uppercase;letter-spacing:.1em}
.cn-dados dd{font-weight:500;font-size:8.2pt}
.cn-dados dd small{font-weight:400;color:var(--tinta-2);font-size:7pt}
.cn-valor dd{white-space:nowrap;font-family:var(--serifa);font-size:18pt;font-weight:600;line-height:1.05;color:var(--tinta)}
.cn-valor dd small{display:inline;margin-left:1.5mm;font-family:var(--sans);font-size:7pt;font-weight:500;color:var(--tinta)}
.cn-venc-box{display:inline-flex;align-items:center;gap:1.2mm;margin-top:.6mm;padding:.5mm 1.6mm;border:.35mm solid var(--vinho-3);border-radius:1mm;color:var(--vinho-3);font-size:6.6pt;font-weight:600;letter-spacing:.06em;text-transform:uppercase}
.cn-pix{display:grid;grid-template-columns:27mm minmax(0,1fr);gap:2.6mm;align-items:start;padding:2mm;border:.25mm solid #CDBFC6;border-radius:1.6mm}
.cn-qr{display:block;width:27mm;height:27mm;shape-rendering:crispEdges}
.cn-pix-txt{display:grid;gap:1.3mm;font-size:7pt;line-height:1.3;min-width:0}
.cn-pix-txt .cn-pix-t{font-family:var(--serifa);font-size:10.5pt;font-weight:600;color:var(--vinho);line-height:1.05}
.cn-pix-txt dt{font-size:6pt;color:var(--tinta-2);text-transform:uppercase;letter-spacing:.08em}
.cn-pix-txt dd{font-weight:500;overflow-wrap:anywhere}
.cn-pix-txt .cn-nota{font-size:6.6pt;color:var(--tinta);font-weight:500}
.cn-cc{display:grid;grid-template-columns:auto minmax(0,1fr);gap:.6mm 2.5mm;align-items:baseline}
.cn-cc .cn-rot{grid-row:1/3}
.cn-cc code{font-family:var(--mono);font-size:6.3pt;line-height:1.3;color:var(--tinta);word-break:break-all}
.cn-id{display:flex;flex-wrap:wrap;gap:1mm 4mm;align-items:baseline;font-size:7pt}
.cn-id b{font-family:var(--mono);font-size:8pt;letter-spacing:.04em;font-weight:700}
.cn-pe{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;gap:4mm;padding-top:1.6mm;border-top:.2mm solid #CDBFC6;font-size:6.6pt;line-height:1.35;color:var(--tinta-2)}
.cn-pe b{color:var(--tinta);font-weight:600}
.cn-t3{display:inline-flex;align-items:center;gap:.8mm;white-space:nowrap;font-size:5.8pt;color:var(--tinta-2);letter-spacing:.06em}
.cn-simb{width:2.6mm;height:2.7mm}
.cn-como{padding:2.4mm 2.6mm;border:.25mm solid #CDBFC6;border-radius:1.6mm;display:grid;gap:1.4mm;font-size:7.2pt;line-height:1.4}
.cn-como .cn-pix-t{font-family:var(--serifa);font-size:10.5pt;font-weight:600;color:var(--vinho);line-height:1.05}

/* ---------- capa (primeira faixa) ---------- */
.cn-capa{grid-template-columns:56mm minmax(0,1fr) 56mm;gap:0 5mm}
.cn-capa .cn-col{display:flex;flex-direction:column;gap:2.2mm;min-width:0;font-size:7.6pt;line-height:1.38}
.cn-capa h2{font-family:var(--serifa);font-size:19pt;font-weight:600;line-height:1.02;color:var(--tinta);margin-top:1.4mm}
.cn-capa .cn-fio{margin:1mm 0 .6mm}
.cn-capa dl{display:grid;gap:1.3mm}
.cn-capa dt{font-size:6.2pt;color:var(--tinta-2);text-transform:uppercase;letter-spacing:.1em}
.cn-capa dd{font-weight:500}
.cn-capa h3{font-family:var(--serifa);font-size:11pt;font-weight:600;color:var(--vinho);line-height:1.1}
.cn-tab{width:100%;border-collapse:collapse;font-size:7.6pt}
.cn-tab th{padding-right:2mm!important;font-size:6pt;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--tinta-2);text-align:left;padding:0 0 1mm;border-bottom:.3mm solid var(--vinho)}
.cn-tab td{padding:1.15mm 0;border-bottom:.2mm solid #DDD0D6;vertical-align:top}
.cn-tab td:last-child,.cn-tab th:last-child{text-align:right;white-space:nowrap}
.cn-tab td:first-child{white-space:nowrap;padding-right:2mm}.cn-tab td:nth-child(3){white-space:nowrap;padding-right:2mm}.cn-tab td:nth-child(2){padding-right:2mm}
.cn-tab tfoot td{border-bottom:0;padding-top:1.6mm;font-weight:600}
.cn-tab tfoot td:last-child{font-family:var(--serifa);font-size:12pt}
.cn-tab .cn-v{white-space:normal;font-size:6.2pt;font-weight:600;color:var(--vinho-3);text-transform:uppercase;letter-spacing:.06em;display:block}
.cn-passos{list-style:none;counter-reset:p;display:grid;gap:1.3mm}
.cn-passos li{counter-increment:p;display:grid;grid-template-columns:4.2mm minmax(0,1fr);gap:1.6mm}
.cn-passos li::before{content:counter(p);display:grid;place-items:center;width:4.2mm;height:4.2mm;border-radius:50%;border:.3mm solid var(--vinho);color:var(--vinho);font-size:6.4pt;font-weight:600}
.cn-caixa{padding:2mm 2.4mm;border-radius:1.4mm;background:var(--sal-2);border-left:.8mm solid var(--ambar)}
.cn-caixa b{font-weight:600}

/* ---------- 1 parcela por folha ---------- */
.cn-uma{display:flex;flex-direction:column}
.cn-uma .cn-via{flex:1;padding:2mm 0 7mm;font-size:11pt;gap:6mm}
.cn-como-uma{display:grid;grid-template-columns:minmax(0,1fr) 70mm;gap:8mm;align-items:start;padding-top:4mm;border-top:.2mm solid #CDBFC6;font-size:9.5pt;line-height:1.45}
.cn-como-uma .cn-pix-t{font-family:var(--serifa);font-size:14pt;font-weight:600;color:var(--vinho);margin-bottom:2.5mm}
.cn-uma .cn-passos{gap:2.4mm}.cn-uma .cn-passos li{grid-template-columns:6mm minmax(0,1fr);gap:2.4mm}.cn-uma .cn-passos li::before{width:6mm;height:6mm;font-size:8.5pt}
.cn-uma .cn-caixa{padding:3.5mm 4mm}
.cn-uma .cn-esc{font-size:22pt}.cn-uma .cn-esc-sub{font-size:7.5pt}.cn-uma .cn-doc{font-size:8.5pt}
.cn-uma .cn-num b{font-size:26pt}
.cn-uma .cn-corpo{grid-template-columns:minmax(0,1fr) 98mm;gap:6mm}
.cn-uma .cn-dados{gap:4mm 5mm}
.cn-uma .cn-dados dt,.cn-uma .cn-rot{font-size:7.6pt}
.cn-uma .cn-dados dd{font-size:11pt}
.cn-uma .cn-valor dd{font-size:28pt}
.cn-uma .cn-pix{grid-template-columns:48mm minmax(0,1fr);padding:4mm}
.cn-uma .cn-qr{width:48mm;height:48mm}
.cn-uma .cn-pix-txt{font-size:8.6pt}.cn-uma .cn-pix-txt dt{font-size:7pt}.cn-uma .cn-pix-txt .cn-pix-t{font-size:14pt}
.cn-uma .cn-cc code{font-size:8pt}
.cn-uma .cn-id{font-size:9pt}.cn-uma .cn-id b{font-size:11pt}
.cn-uma .cn-pe{font-size:8pt}.cn-uma .cn-t3{font-size:7pt}.cn-uma .cn-simb{width:3.4mm;height:3.5mm}
.cn-uma .cn-corte-h{position:relative;border-top:.3mm dashed #6E5562;height:0;margin:0}
.cn-uma .cn-corte-h .cn-tesoura{position:absolute;left:3mm;top:-2.3mm;padding:0 .6mm}
.cn-uma .cn-canhoto{height:60mm;flex:none;padding:6mm 0 0;display:grid;grid-template-columns:56mm minmax(0,1fr);grid-template-areas:'rot rot' 'esc dl' 'parc dl' 'pago pago';grid-template-rows:auto auto 1fr auto;gap:2.5mm 8mm;font-size:9pt}
.cn-uma .cn-canhoto .cn-rot{grid-area:rot}.cn-uma .cn-canhoto .cn-esc-c{grid-area:esc}.cn-uma .cn-canhoto .cn-parc{grid-area:parc}
.cn-uma .cn-canhoto dl{grid-area:dl;grid-template-columns:repeat(3,minmax(0,1fr));gap:3mm 6mm;align-content:start}
.cn-uma .cn-canhoto dt{font-size:7pt}
.cn-uma .cn-pago{grid-area:pago;margin-top:0;grid-template-columns:repeat(3,minmax(0,1fr));gap:6mm;padding-top:5mm;align-self:end}
.cn-uma .cn-pago span{font-size:8.5pt}
.cn-uma .cn-canhoto .cn-esc-c{font-size:15pt}.cn-uma .cn-canhoto .cn-parc{font-size:18pt}

/* ---------- impressão ---------- */
@page{size:A4;margin:0}
@media print{
  html,body{background:#fff}
  .cn-barra,.cn-aviso-tela{display:none!important}
  main{display:block;padding:0}
  .cn-folha{box-shadow:none;break-after:page;page-break-after:always}
  .cn-folha:last-child{break-after:auto;page-break-after:auto}
}
/* No celular, a prévia mostra a folha inteira reduzida (o documento é o PDF) */
@media screen and (max-width:760px){
  .cn-barra{padding:10px 16px;gap:8px}
  .cn-barra h1{font-size:19px}
  .cn-barra nav{margin-left:0}
  .cn-barra a,.cn-barra button{padding:0 12px}
  main{padding:16px 16px 40px;gap:16px}
  .cn-folha{zoom:.45}
  .cn-aviso-tela{margin:12px 16px 0}
}
"""


def esc_marca(doc=True):
    d = f'<span class="cn-doc">CNPJ {ESC["cnpj"]} · {ESC["oab"]}</span>' if doc else ''
    return f'<div class="cn-marca"><span class="cn-esc">{ESC["nome"]}</span><span class="cn-esc-sub">{ESC["sub"]}</span>{d}</div>'


def canhoto(n, ref, venc, vencida=False):
    v = f'{R(CT["valor"])}' + (' + encargos' if vencida else '')
    return (f'<div class="cn-canhoto"><p class="cn-rot">Canhoto · fica com o escritório</p>'
            f'<p class="cn-esc-c">{ESC["nome"]}</p>'
            f'<p class="cn-parc">Parcela {n} de {CT["total_parc"]}<small>{ref}</small></p>'
            f'<dl><div><dt>Cliente</dt><dd>{CLI["nome"]}</dd></div><div><dt>Contrato</dt><dd>{CT["numero"]}</dd></div>'
            f'<div><dt>Vencimento</dt><dd>{venc}{" (vencida)" if vencida else ""}</dd></div><div><dt>Valor</dt><dd>{v}</dd></div>'
            f'<div><dt>Identificador</dt><dd style="font-family:var(--mono);font-weight:700">{txid(n)}</dd></div></dl>'
            f'<div class="cn-pago"><span>Pago em <i></i>/<i></i>/<i></i></span><span>Forma <i></i></span><span>Visto <i></i></span></div></div>')


def via(n, ref, venc, vencida=False, modo='pix', grande=False):
    tot = CT['total_parc']
    if vencida:
        valor = (f'<div class="cn-valor"><dt>Valor</dt><dd>{R(CT["valor"])}</dd></div>'
                 f'<div class="cn-enc"><dt>Encargos</dt><dd>+ multa e juros, valor a combinar com o escritório</dd></div>')
        vdd = venc
    else:
        valor = f'<div class="cn-valor"><dt>Valor</dt><dd>{R(CT["valor"])}</dd></div>'
        vdd = venc
    dados = (f'<dl class="cn-dados"><div class="cn-largo"><dt>Cliente</dt><dd>{CLI["nome"]} <small>· CPF {CLI["cpf"]}</small></dd></div>'
             f'<div class="cn-largo"><dt>Contrato</dt><dd>{CT["numero"]} <small>· {CT["objeto"]}</small></dd></div>'
             f'<div><dt>Mês de referência</dt><dd>{ref}</dd></div><div><dt>Vencimento</dt><dd>{vdd}</dd></div>'
             f'{valor}</dl>')
    if modo == 'pix':
        codigo = pix_parcela(n, sem_valor=vencida)
        rot_qr = f'QR Code do Pix da parcela {n} de {tot}' + (', sem valor definido' if vencida else f', {R(CT["valor"])}')
        nota = ''
        lado = (f'<div class="cn-pix">{qr_svg(codigo, rot_qr)}<div class="cn-pix-txt"><p class="cn-pix-t">Pague com Pix</p>'
                f'<dl><dt>Chave ({PIX["tipo"]})</dt><dd>{PIX["chave_vis"]}</dd><dt style="margin-top:1mm">Recebedor</dt><dd>{PIX["recebedor"]}</dd></dl>{nota}</div></div>')
        cc = (f'<div class="cn-cc"><span class="cn-rot">Pix copia<br>e cola</span><code>{codigo}</code></div>'
              f'<p class="cn-id"><span>Identificador da parcela: <b>{txid(n)}</b></span><span>{"O Pix abre sem valor: digite o valor combinado com o escritório." if vencida else "Confira no app: " + PIX["recebedor"] + ", " + R(CT["valor"]) + "."}</span></p>')
    else:
        lado = (f'<div class="cn-como"><p class="cn-pix-t">Como pagar</p><p>{INSTRUCOES}</p></div>')
        cc = f'<p class="cn-id"><span>Identificador da parcela: <b>{txid(n)}</b></span><span>Escreva-o na descrição da transferência.</span></p>'
    pe = (f'<p class="cn-pe"><span>Depois do vencimento: multa de <b>{CT["multa"]}</b> e juros de <b>{CT["juros"]}</b>, como no contrato. '
          f'Pagou? O recibo chega pelo WhatsApp do escritório, <b>{ESC["whats"]}</b>.</span>'
          f'<span class="cn-t3">{SIMBOLO}Modelo T3jus</span></p>')
    venc_box = f'<span class="cn-venc-box">Vencida em {venc[:5]}</span>' if vencida else ''
    extra = ''
    if grande:
        passos = (f'<ol class="cn-passos"><li><span>Abra o app do seu banco e escolha Pix: ler QR Code, ou Pix copia e cola.</span></li>'
                  f'<li><span>Leia o QR acima ou copie o código.</span></li>'
                  f'<li><span>Antes de confirmar, veja se aparece <b>{PIX["recebedor"]}</b> e o valor.</span></li></ol>') if modo == 'pix' else f'<p>{INSTRUCOES}</p>'
        extra = (f'<div class="cn-como-uma"><div><p class="cn-pix-t">Como pagar{" com Pix" if modo == "pix" else ""}</p>{passos}</div>'
                 f'<p class="cn-caixa">Depois de pagar, <b>o recibo chega pelo WhatsApp</b> do escritório. Dúvidas? Escreva para <b>{ESC["whats"]}</b>.</p></div>')
    return (f'<section class="cn-via" aria-label="Via do cliente, parcela {n} de {tot}">'
            f'<header class="cn-cab">{esc_marca()}<div class="cn-num"><span class="cn-rot">Via do cliente · parcela</span><b>{n} de {tot}</b>{venc_box}</div></header>'
            f'<div class="cn-fio"></div><div class="cn-corpo">{dados}{lado}</div>{cc}{extra}{pe}</section>')


def faixa(p, modo='pix', topo=False):
    n, ref, venc, sit = p
    t = TESOURA.replace('cn-tesoura', 'cn-tesoura cn-tesoura-topo') if topo else ''
    return (f'<article class="cn-faixa">{t}{canhoto(n, ref, venc, sit == "vencida")}<div class="cn-corte-v">{TESOURA}</div>'
            f'{via(n, ref, venc, sit == "vencida", modo)}{TESOURA}</article>')


def capa(parcelas, modo='pix'):
    linhas = ''
    for n, ref, venc, sit in parcelas:
        v = '<span class="cn-v">vencida</span>' if sit == 'vencida' else ''
        linhas += f'<tr><td>{n} de {CT["total_parc"]}</td><td>{ref}</td><td>{venc}{v}</td><td>{R(CT["valor"])}</td></tr>'
    total = R(CT['valor'] * len(parcelas))
    if modo == 'pix':
        como = (f'<h3>Como pagar com Pix</h3><ol class="cn-passos"><li><span>Abra o app do seu banco e escolha Pix: ler QR Code, ou Pix copia e cola.</span></li>'
                f'<li><span>Use o QR ou o código da parcela do mês, na via do cliente.</span></li>'
                f'<li><span>Antes de confirmar, veja se aparece <b>{PIX["recebedor"]}</b> e o valor da parcela.</span></li></ol>')
    else:
        como = f'<h3>Como pagar</h3><p>{INSTRUCOES}</p>'
    return (f'<article class="cn-faixa cn-capa">{TESOURA.replace("cn-tesoura", "cn-tesoura cn-tesoura-topo")}'
            f'<div class="cn-col">{esc_marca()}<div class="cn-fio"></div><h2>Carnê de honorários</h2>'
            f'<dl><div><dt>Cliente</dt><dd>{CLI["nome"]} · CPF {CLI["cpf"]}</dd></div><div><dt>Contrato</dt><dd>{CT["numero"]} · {CT["objeto"]}</dd></div>'
            f'<div><dt>Escritório</dt><dd style="font-weight:400">{ESC["razao"]}<br>{ESC["endereco"]}</dd></div></dl></div>'
            f'<div class="cn-col"><h3>As parcelas deste carnê</h3><table class="cn-tab"><thead><tr><th scope="col">Parcela</th><th scope="col">Referência</th><th scope="col">Vence</th><th scope="col">Valor</th></tr></thead>'
            f'<tbody>{linhas}</tbody><tfoot><tr><td colspan="3">Total deste carnê</td><td>{total}</td></tr></tfoot></table>'
            f'<p style="font-size:6.8pt;color:var(--tinta-2)">Gerado em {HOJE}. As parcelas já pagas não entram. Cada parcela tem o seu Pix; pague uma de cada vez.</p></div>'
            f'<div class="cn-col">{como}<p class="cn-caixa">Depois de pagar, <b>o recibo chega pelo WhatsApp</b> do escritório. Dúvidas? Escreva para <b>{ESC["whats"]}</b>.</p>'
            f'<p style="font-size:6.8pt;color:var(--tinta-2)">Pagando depois do vencimento: multa de {CT["multa"]} e juros de {CT["juros"]}, como no contrato. Fale antes com o escritório.</p></div>'
            f'{TESOURA}</article>')


def folhas_3(parcelas, com_capa=True, modo='pix'):
    itens = ([('capa', None)] if com_capa else []) + [('p', p) for p in parcelas]
    fl = []
    for i in range(0, len(itens), 3):
        corpo = ''
        for k, (tipo, p) in enumerate(itens[i:i + 3]):
            corpo += capa(parcelas, modo) if tipo == 'capa' else faixa(p, modo, topo=(k == 0))
        fl.append(corpo)
    tot = len(fl)
    return ''.join(f'<div class="cn-folha" role="region" aria-label="Folha {j} de {tot}">{c}</div>' for j, c in enumerate(fl, 1))


def folhas_1(parcelas, modo='pix'):
    out, tot = '', len(parcelas)
    for j, (n, ref, venc, sit) in enumerate(parcelas, 1):
        out += (f'<div class="cn-folha cn-uma" role="region" aria-label="Folha {j} de {tot}">{via(n, ref, venc, sit == "vencida", modo, grande=True)}'
                f'<div class="cn-corte-h">{TESOURA}</div>{canhoto(n, ref, venc, sit == "vencida")}</div>')
    return out


A_VENCER = [p for p in PARCELAS if p[3] == 'a vencer']
COM_VENCIDA = [p for p in PARCELAS if p[3] != 'paga']

ESTADOS = [
    ('padrao', 'Padrão', '3 por folha, com capa, parcelas a vencer (4 a 6)', folhas_3(A_VENCER), ''),
    ('vencida', 'Com a vencida', 'A parcela 3, vencida, escolhida à mão', folhas_3(COM_VENCIDA),
     '<b>Parcela vencida no carnê.</b> Entra só se alguém escolher. Sai marcada "vencida em 25/10", com o Pix sem valor, para o valor com multa e juros combinado.'),
    ('uma', '1 por folha', '1 parcela por folha, sem capa', folhas_1(A_VENCER),
     '<b>1 parcela por folha.</b> Para quem manda uma parcela por mês ou imprime uma de cada vez. A via ocupa dois terços da folha; o canhoto fica embaixo.'),
    ('sem-pix', 'Sem Pix', 'Escritório sem chave Pix: instruções em texto', folhas_3(A_VENCER, modo='texto'),
     '<b>Sem chave Pix cadastrada.</b> No lugar do Pix vão as instruções de pagamento que a sócia dona escreveu em Escritório › Recebimento.'),
    ('pb', 'Preto e branco', 'Como sai numa impressora preto e branco', folhas_3(A_VENCER),
     '<b>Prévia em preto e branco.</b> Tudo o que informa está em texto escuro ou em linha. O âmbar é só um filete e some sem perder nada.'),
]

nav = ''.join(f'<a href="carne-a4.html?estado={e}" data-e="{e}">{n}</a>' for e, n, _, _, _ in ESTADOS)
tpls = ''.join(f'<template data-est="{e}" data-desc="{H(d)}"><main{" class=pb" if e == "pb" else ""}>{"<p class=cn-aviso-tela role=note>" + av + "</p>" if av else ""}{f}</main></template>\n'
               for e, n, d, f, av in ESTADOS)

page = f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Carnê · Hélio Batista Corrêa · C-2026-014</title>
<meta name="description" content="Carnê de pagamento dos honorários parcelados, modelo T3jus, gerado pelo escritório Ribeiro &amp; Matos: folhas A4 com canhoto e via do cliente, com o Pix do escritório.">
<style>
{FONTES}
{CSS}
</style>
</head>
<body>
<header class="cn-barra"><h1>Prévia do carnê<small>Hélio Batista Corrêa · C-2026-014 · <span id="desc"></span></small></h1>
<nav aria-label="Variações do carnê">{nav}</nav><button type="button" onclick="window.print()">Imprimir</button></header>
<div id="slot"></div>
{tpls}
<script>
(function(){{
  var q=new URLSearchParams(location.search), e=q.get('estado')||'padrao';
  var t=document.querySelector('template[data-est="'+e+'"]')||document.querySelector('template[data-est="padrao"]');
  document.getElementById('slot').appendChild(t.content.cloneNode(true));
  document.getElementById('desc').textContent=t.dataset.desc;
  document.querySelectorAll('.cn-barra a').forEach(function(a){{ if(a.dataset.e===t.dataset.est) a.setAttribute('aria-current','page') }});
}})();
</script>
</body>
</html>
'''
open(f'{SAIDA}/carne-a4.html', 'w', encoding='utf-8').write(page)
print('carne-a4 ok', len(ESTADOS), 'estados')
