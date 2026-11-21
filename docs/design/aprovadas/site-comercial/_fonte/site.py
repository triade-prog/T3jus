# Site comercial do T3jus (F2.1, F2.2; SC-01, SC-02, SC-03, SC-06): desenho para a Carol aprovar.
# Gera inicio.html, como-funciona.html, para-quem-e.html e demonstracao.html (com os estados do formulário)
# e fontes.css (Alegreya e Poppins embutidas, as mesmas das telas aprovadas).
# Ponto de partida visual: a página "em breve" aprovada (sistema/apps/site/index.html).
# Uso: python3 site.py <pasta-saida>
import sys, os, re, html

SAIDA = sys.argv[1] if len(sys.argv) > 1 else '..'
APROV = '/home/claude/t3jus/docs/design/aprovadas/console-cobranca/cobranca.html'
H = html.escape
_ref = open(APROV, encoding='utf-8').read()

# ---------------------------------------------------------------- fontes e ícones das telas aprovadas
FONTES = '\n'.join(re.findall(r'@font-face\{[^}]*\}', _ref))
open(os.path.join(SAIDA, 'fontes.css'), 'w', encoding='utf-8').write(
    '/* Alegreya 500, 500 itálico, 600 e Poppins 400, 500, 600: as mesmas das telas aprovadas. No site em Astro, servidas pelo próprio site. */\n' + FONTES + '\n')
SIMB = dict(re.findall(r'<symbol id="(i-[a-z-]+)" viewBox="0 0 24 24">(.*?)</symbol>', _ref, flags=re.S))
EXTRA = {
    'i-repasse': '<path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/>',
    'i-pix': '<path d="m12 3 9 9-9 9-9-9Z"/><path d="m8 12 4-4 4 4-4 4Z"/>',
    'i-servidor': '<path d="M4 4.5h16v6H4ZM4 13.5h16v6H4Z"/><path d="M7.5 7.5h2M7.5 16.5h2"/>',
    'i-tracejado': '<circle cx="12" cy="12" r="8" stroke-dasharray="3 3"/>',
}
USADOS = ['i-whats', 'i-pena', 'i-moeda', 'i-carteira', 'i-balanca', 'i-coluna', 'i-envelope', 'i-relogio', 'i-agenda', 'i-conversas', 'i-ia',
          'i-carne', 'i-pessoas', 'i-escudo', 'i-cadeado', 'i-check', 'i-dir', 'i-seta', 'i-doc', 'i-maleta', 'i-menu', 'i-x', 'i-alerta',
          'i-reenviar', 'i-telefone', 'i-baixar', 'i-historico', 'i-fatura', 'i-qr', 'i-inicio', 'i-escritorios', 'i-ajuda', 'i-funcoes', 'i-sair', 'i-abrir']
SPRITE = ('<svg width="0" height="0" style="position:absolute" aria-hidden="true">'
          + ''.join(f'<symbol id="{k}" viewBox="0 0 24 24">{SIMB[k]}</symbol>' for k in USADOS if k in SIMB)
          + ''.join(f'<symbol id="{k}" viewBox="0 0 24 24">{v}</symbol>' for k, v in EXTRA.items()) + '</svg>')
for k in USADOS:
    assert k in SIMB, k


def ico(n, cls='ico'):
    return f'<svg class="{cls}" aria-hidden="true"><use href="#i-{n}"/></svg>'


# ---------------------------------------------------------------- selos de situação (SC-03: dizer o que existe)
def selo(tipo):
    t = {'pronto': ('check', 'No T3jus'), 'prep': ('relogio', 'Em preparação'), 'plan': ('tracejado', 'Planejado')}[tipo]
    return f'<span class="st st-{tipo}">{ico(t[0])}{t[1]}</span>'


PADRAO = ("url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22120%22%20height%3D%22120%22%20fill%3D%22none%22%20stroke%3D%22%23692746%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22square%22%3E%3Cg%20transform%3D%22translate%2812%2012%29%22%3E%3Cpath%20d%3D%22M12%203.5v16M7.5%2020.5h9M4.5%207h15%22%2F%3E%3Cpath%20d%3D%22M4.5%207%202%2013h5ZM19.5%207%2017%2013h5Z%22%2F%3E%3Cpath%20d%3D%22M2%2013a2.5%202.5%200%200%200%205%200M17%2013a2.5%202.5%200%200%200%205%200%22%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate%2872%2018%29%22%3E%3Cpath%20d%3D%22M4%204h16l-1.5%202.5h-13Z%22%2F%3E%3Cpath%20d%3D%22M7%206.5v11M10.3%206.5v11M13.7%206.5v11M17%206.5v11%22%2F%3E%3Cpath%20d%3D%22M5.5%2017.5h13L20%2020H4Z%22%2F%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate%2842%2070%29%22%3E%3Cpath%20d%3D%22M20%204C12%204%207.5%209%206.5%2016.5L5%2021%22%2F%3E%3Cpath%20d%3D%22M20%204c0%207.5-5%2011.5-12.5%2012.5%22%2F%3E%3Cpath%20d%3D%22M9.5%2011h6M8%2014h4.5%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E\")")
GRAO = ("url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%27200%27%20height%3D%27200%27%3E%3Cfilter%20id%3D%27n%27%3E%3CfeTurbulence%20type%3D%27fractalNoise%27%20baseFrequency%3D%27.85%27%20numOctaves%3D%273%27%20stitchTiles%3D%27stitch%27%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%27200%27%20height%3D%27200%27%20filter%3D%27url%28%23n%29%27%20opacity%3D%27.6%27%2F%3E%3C%2Fsvg%3E\")")

CSS = r"""
:root{
  --vinho:#692746;--vinho-2:#87335B;--vinho-3:#AC3F6B;--vinho-4:#AC788D;
  --ambar:#DD9760;--ambar-2:#E9AE90;--ambar-3:#F2CDB3;
  --sal:#F1E6DF;--sal-2:#F2ECE8;
  --tinta:#2A1A22;--tinta-2:#6E5562;--vinho-escuro:#4F1D35;--papel:#FFFFFF;
  --serifa:"Alegreya","Iowan Old Style",Georgia,serif;
  --sans:"Poppins",system-ui,-apple-system,"Segoe UI",sans-serif;
  --raio:10px;--raio-g:16px;--larg:1200px;--gut:48px;
  --sombra:0 24px 60px -32px rgba(105,39,70,.45);
  --grao:__GRAO__;--padrao:__PADRAO__;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{margin:0;font-family:var(--sans);font-size:16px;line-height:1.65;color:var(--tinta);background:var(--sal);-webkit-font-smoothing:antialiased;overflow-x:hidden}
h1,h2,h3{font-family:var(--serifa);font-weight:500;margin:0;letter-spacing:-.01em;line-height:1.1}
p,ul,ol,dl,dd,figure,blockquote{margin:0}
ul,ol{padding:0;list-style:none}
a{color:var(--vinho)}
img{max-width:100%;height:auto}
:focus-visible{outline:3px solid var(--vinho-3);outline-offset:3px;border-radius:6px}
.sobre-vinho :focus-visible,.topo :focus-visible,.rodape :focus-visible{outline-color:var(--ambar-3)}
.ico{width:22px;height:22px;flex:none;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:square;stroke-linejoin:miter}
.sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.pular{position:absolute;left:16px;top:-80px;z-index:50;background:var(--papel);color:var(--vinho);padding:12px 18px;border-radius:var(--raio);font-weight:500}
.pular:focus{top:12px}
.miolo{width:100%;max-width:calc(var(--larg) + 2*var(--gut));margin:0 auto;padding:0 var(--gut)}
.sobretitulo{display:block;font-size:12px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:var(--vinho-2)}
.fio{display:block;width:64px;height:2px;background:var(--ambar);margin-top:20px}
.num{font-variant-numeric:lining-nums tabular-nums}

/* ---------- botões ---------- */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:52px;padding:0 24px;border-radius:var(--raio);font:500 15px/1.2 var(--sans);text-decoration:none;border:0;cursor:pointer;text-align:center}
.btn-pri{background:var(--vinho);color:var(--papel);box-shadow:inset 0 -2px 0 var(--vinho-escuro)}
.btn-pri:hover{background:var(--vinho-2)}
.btn-pri:active{background:var(--vinho-escuro)}
.btn-pri .ico{color:var(--ambar-3)}
.btn-claro{background:var(--ambar-3);color:var(--vinho);box-shadow:inset 0 -2px 0 var(--ambar-2)}
.btn-claro:hover{background:var(--papel)}
.btn-contorno{background:transparent;color:var(--sal);box-shadow:inset 0 0 0 1.5px var(--vinho-4)}
.btn-contorno:hover{box-shadow:inset 0 0 0 1.5px var(--ambar-3);color:var(--papel)}
.btn-sec{background:var(--papel);color:var(--vinho);box-shadow:inset 0 0 0 1.5px var(--vinho-4)}
.btn-sec:hover{box-shadow:inset 0 0 0 1.5px var(--vinho)}
.link-seta{display:inline-flex;align-items:center;gap:8px;min-height:44px;font-weight:500;color:var(--vinho);text-decoration:none}
.link-seta:hover{text-decoration:underline}
.link-seta .ico{width:18px;height:18px}

/* ---------- topo ---------- */
.topo{position:relative;z-index:5;background:var(--vinho);isolation:isolate}
.topo::after{content:"";position:absolute;inset:0;z-index:-1;opacity:.35;mix-blend-mode:soft-light;background-image:var(--grao);pointer-events:none}
.topo::before{content:"";position:absolute;left:0;right:0;bottom:0;height:1px;background:var(--vinho-2)}
.topo .miolo{display:flex;align-items:center;gap:28px;min-height:96px}
.topo .marca{display:block;flex:none;line-height:0}
.topo .marca img{width:188px;height:auto}
.menu{display:flex;align-items:center;gap:6px;margin-left:auto}
.menu a{display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border-radius:8px;color:var(--sal);text-decoration:none;font-size:15px;font-weight:500}
.menu a:hover{background:rgba(241,230,223,.1)}
.menu a[aria-current="page"]{color:var(--papel);box-shadow:inset 0 -2px 0 var(--ambar)}
.menu .entrar{gap:8px;color:var(--ambar-3)}
.menu .entrar .ico{width:18px;height:18px}
.menu a.btn-claro{color:var(--vinho)}
.menu a.btn-claro:hover{background:var(--papel)}
.menu .btn{margin-left:10px;min-height:46px;padding:0 20px;font-size:14.5px}
.menu-cel{display:none}

/* ---------- cabeçalho vinho com corte (abertura) ---------- */
.abertura{position:relative;isolation:isolate;overflow:hidden;background:var(--sal)}
.abertura::after{content:"";position:absolute;inset:0;z-index:-3;opacity:.35;mix-blend-mode:multiply;background-image:var(--grao);pointer-events:none}
.abertura .lado{position:absolute;inset:0;z-index:-2;background:var(--vinho);clip-path:polygon(0 0,64% 0,54% 100%,0 100%)}
.abertura .lado::after{content:"";position:absolute;inset:0;opacity:.35;mix-blend-mode:soft-light;background-image:var(--grao)}
.abertura .estatua{position:absolute;z-index:-1;left:44%;top:330px;width:260px;height:260px;color:var(--vinho-2);stroke-width:.8;pointer-events:none}
.heroi{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:56px;align-items:center;padding-top:56px;padding-bottom:112px}
.heroi .texto{color:var(--sal);max-width:620px}
.heroi .sobretitulo{color:var(--ambar-2)}
.heroi h1{margin-top:14px;font-size:clamp(44px,5vw,70px);line-height:1.03;color:var(--papel)}
.heroi h1 i{font-style:italic;color:var(--ambar-3)}
.heroi .lede{margin-top:24px;font-size:17px;line-height:1.65;max-width:50ch;color:var(--sal)}
.heroi .acoes{display:flex;flex-wrap:wrap;gap:14px;margin-top:34px}
.heroi .nota-h{display:flex;align-items:center;gap:10px;margin-top:26px;font-size:13.5px;color:var(--ambar-2)}
.heroi .nota-h .ico{width:18px;height:18px;color:var(--ambar)}
.fita{position:absolute;z-index:-1;left:0;bottom:0;width:59%;height:10px;display:flex}
.fita i{flex:1}

/* folhas sobrepostas (lado sal) */
.folhas{position:relative;width:100%;max-width:470px;justify-self:center;margin:16px 0}
.folhas .f-ambar{position:absolute;inset:18px -10px 26px 14px;border-radius:var(--raio-g);background:var(--ambar);transform:rotate(-5deg);box-shadow:0 30px 60px -30px rgba(42,26,34,.55);overflow:hidden}
.folhas .f-ambar::before{content:"";position:absolute;inset:0;background-image:var(--padrao);background-size:128px 128px;opacity:.55}
.folhas .f-timbre{position:absolute;inset:8px 0 14px 4px;border-radius:var(--raio-g);background:var(--papel);transform:rotate(2.5deg);box-shadow:0 20px 50px -30px rgba(42,26,34,.5);overflow:hidden}
.folhas .f-timbre::before{content:"";position:absolute;right:0;top:0;width:130px;height:10px;background:var(--vinho)}
.folhas .f-timbre::after{content:"";position:absolute;right:130px;top:0;width:44px;height:10px;background:var(--ambar)}
.folhas .selo-marca{position:absolute;z-index:2;left:-70px;bottom:-92px;width:136px;height:136px;filter:drop-shadow(0 14px 22px rgba(42,26,34,.35))}

/* cartão de exemplo do produto (ilustração com dados fictícios) */
.demo{position:relative;background:var(--papel);border-radius:var(--raio-g);box-shadow:var(--sombra);padding:26px 26px 22px;font-size:13.5px;line-height:1.5}
.demo-cab{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.demo-cab h2,.demo-cab h3,.demo-cab p.t{font-family:var(--serifa);font-size:24px;color:var(--vinho);font-weight:500;line-height:1.15}
.ex{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:12px;font-size:11.5px;font-weight:500;color:var(--vinho);box-shadow:inset 0 0 0 1px var(--vinho-4);white-space:nowrap;background:var(--papel)}
.ex::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--ambar)}
.demo .fio{margin-top:12px;width:44px}
.demo-lista{margin-top:14px;display:grid}
.demo-lista li{display:grid;grid-template-columns:40px minmax(0,1fr);gap:12px;padding:12px 0;border-top:1px solid var(--sal)}
.demo-lista li:first-child{border-top:0}
.demo-lista .bola{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:var(--ambar-3);color:var(--vinho)}
.demo-lista .bola.v{background:var(--vinho);color:var(--ambar-3)}
.demo-lista .bola.a{background:var(--ambar);color:var(--tinta)}
.demo-lista .bola .ico{width:20px;height:20px}
.demo-lista b{font-weight:600;color:var(--tinta)}
.demo-lista small{display:block;color:var(--tinta-2);font-size:12.5px;margin-top:1px}
.demo-lista .val{font-family:var(--serifa);font-size:17px;color:var(--vinho);font-weight:500}

/* ---------- faixa de fatos ---------- */
.fatos{background:var(--papel);border-bottom:1px solid var(--sal)}
.fatos ul{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0}
.fatos li{display:flex;align-items:center;gap:14px;padding:26px 24px;border-left:1px solid var(--sal);font-size:14px;line-height:1.45}
.fatos li:first-child{border-left:0;padding-left:0}
.fatos .ico{width:28px;height:28px;color:var(--vinho-4);stroke-width:1.4}
.fatos b{display:block;font-weight:600;color:var(--vinho)}

/* ---------- seções ---------- */
.secao{padding:104px 0}
.secao.clara{background:var(--papel)}
.secao.rebaixada{background:var(--sal-2)}
.sec-cab{max-width:720px}
.sec-cab h2{margin-top:12px;font-size:clamp(34px,3.6vw,48px);color:var(--vinho)}
.sec-cab p.lede{margin-top:22px;font-size:17px;color:var(--tinta-2);max-width:60ch}
.sec-cab.centro{margin:0 auto;text-align:center}
.sec-cab.centro .fio{margin-left:auto;margin-right:auto}

/* dores */
.dores{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;margin-top:56px}
.dor{background:var(--papel);border-radius:var(--raio-g);padding:30px 28px;box-shadow:0 1px 0 var(--sal-2),0 18px 40px -34px rgba(105,39,70,.5)}
.secao.clara .dor{background:var(--sal-2);box-shadow:none}
.dor .disco{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:var(--vinho);color:var(--ambar-3)}
.dor h3{margin-top:22px;font-size:24px;color:var(--vinho)}
.dor p{margin-top:10px;font-size:15px;color:var(--tinta-2)}

/* caminho (jornada em 5 passos) */
.caminho{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:0;margin-top:64px;counter-reset:passo}
.caminho li{position:relative;padding:0 18px 0 0}
.caminho li::before{content:"";position:absolute;left:64px;right:0;top:31px;height:2px;background:var(--ambar)}
.caminho li:last-child::before{display:none}
.caminho .disco{position:relative;width:64px;height:64px;border-radius:50%;display:grid;place-items:center;font-family:var(--serifa);font-size:28px;font-weight:500;line-height:1;background:var(--vinho);color:var(--papel)}
.caminho li:nth-child(2) .disco{background:var(--vinho-2)}
.caminho li:nth-child(3) .disco{background:var(--ambar);color:var(--tinta)}
.caminho li:nth-child(4) .disco{background:var(--ambar-2);color:var(--tinta)}
.caminho li:nth-child(5) .disco{background:var(--ambar-3);color:var(--vinho)}
.caminho h3{margin-top:22px;font-size:22px;color:var(--vinho)}
.caminho p{margin-top:8px;font-size:14.5px;color:var(--tinta-2);max-width:26ch}
.caminho-pe{margin-top:40px}

/* recursos */
.legenda{display:flex;flex-wrap:wrap;gap:12px 22px;margin-top:30px;font-size:13.5px;color:var(--tinta-2)}
.legenda li{display:flex;align-items:center;gap:10px}
.recursos{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;margin-top:40px}
.recurso{display:flex;flex-direction:column;gap:12px;background:var(--papel);border:1px solid var(--sal);border-radius:var(--raio-g);padding:28px 26px 24px}
.secao.clara .recurso{background:var(--papel);border-color:var(--sal)}
.recurso .topo-r{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.recurso .ic{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:var(--ambar-3);color:var(--vinho)}
.recurso h3{font-size:23px;color:var(--vinho);margin-top:6px}
.recurso p{font-size:14.5px;color:var(--tinta-2)}
.recurso ul.itens{display:grid;gap:6px;margin-top:2px;font-size:14px}
.recurso ul.itens li{display:flex;gap:8px;align-items:flex-start}
.recurso ul.itens .ico{width:16px;height:16px;color:var(--vinho-4);margin-top:4px}
.recurso .falta{margin-top:auto;padding-top:12px;border-top:1px dashed var(--vinho-4);font-size:13px;color:var(--tinta-2)}
.recurso .falta b{color:var(--tinta);font-weight:600}
.st{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 12px;border-radius:14px;font-size:12.5px;font-weight:500;white-space:nowrap}
.st .ico{width:15px;height:15px}
.st-pronto{background:var(--papel);color:var(--vinho);box-shadow:inset 0 0 0 1px var(--vinho-4)}
.st-prep{background:var(--ambar-3);color:var(--vinho-escuro)}
.st-plan{background:var(--sal-2);color:var(--tinta-2);box-shadow:inset 0 0 0 1px var(--vinho-4)}
.st-plan .ico{stroke-dasharray:none}

/* planejado */
.planejado{margin-top:48px;border:1.5px dashed var(--vinho-4);border-radius:var(--raio-g);padding:30px 32px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:32px;background:transparent}
.planejado h3{font-size:26px;color:var(--vinho)}
.planejado .sub{margin-top:10px;font-size:14.5px;color:var(--tinta-2)}
.planejado ul{display:grid;grid-template-columns:1fr 1fr;gap:12px 28px}
.planejado li{display:flex;gap:10px;align-items:flex-start;font-size:14.5px}
.planejado li .ico{width:18px;height:18px;color:var(--vinho-4);margin-top:3px}

/* faixa vinho: dados */
.faixa-vinho{position:relative;isolation:isolate;overflow:hidden;background:var(--vinho);color:var(--sal);padding:96px 0}
.faixa-vinho::after{content:"";position:absolute;inset:0;z-index:-1;opacity:.35;mix-blend-mode:soft-light;background-image:var(--grao)}
.faixa-vinho .estatua{position:absolute;right:4%;top:48px;width:300px;height:300px;color:var(--vinho-2);stroke-width:.8;z-index:-1}
.faixa-vinho .sobretitulo{color:var(--ambar-2)}
.faixa-vinho h2{margin-top:12px;font-size:clamp(34px,3.6vw,46px);color:var(--papel);max-width:20ch}
.faixa-vinho .lede{margin-top:20px;font-size:17px;max-width:58ch}
.dados{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px 36px;margin-top:52px}
.dados li{display:grid;grid-template-columns:48px minmax(0,1fr);gap:16px;align-items:start}
.dados .bola{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:var(--vinho-2);color:var(--ambar-3)}
.dados b{display:block;font-family:var(--serifa);font-size:21px;font-weight:500;color:var(--papel);line-height:1.2}
.dados span{display:block;margin-top:6px;font-size:14px;color:var(--ambar-3)}

/* preço */
.preco{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:48px;align-items:center}
.preco .cartao-p{background:var(--papel);border-radius:var(--raio-g);box-shadow:var(--sombra);padding:36px 36px 32px;position:relative;overflow:hidden}
.preco .cartao-p::before{content:"";position:absolute;right:0;top:0;width:120px;height:8px;background:var(--vinho)}
.preco .cartao-p::after{content:"";position:absolute;right:120px;top:0;width:40px;height:8px;background:var(--ambar)}
.preco .cartao-p h3{font-size:30px;color:var(--vinho)}
.preco .cartao-p p{margin-top:12px;color:var(--tinta-2);font-size:15px}
.preco .cartao-p ul{margin-top:18px;display:grid;gap:10px;font-size:14.5px}
.preco .cartao-p li{display:flex;gap:10px}
.preco .cartao-p li .ico{width:18px;height:18px;color:var(--vinho);margin-top:3px}
.preco .cartao-p .btn{margin-top:26px}

/* chamada final (campo âmbar com padrão vinho) */
.chamada{position:relative;isolation:isolate;overflow:hidden;background:var(--ambar);padding:88px 0}
.chamada::before{content:"";position:absolute;inset:0;z-index:-1;background-image:var(--padrao);background-size:128px 128px;opacity:.5;-webkit-mask-image:linear-gradient(90deg,transparent 30%,#000 75%);mask-image:linear-gradient(90deg,transparent 30%,#000 75%)}
.chamada .miolo{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:40px;align-items:center}
.chamada .sobretitulo{color:var(--vinho-escuro)}
.chamada h2{margin-top:12px;font-size:clamp(34px,3.6vw,48px);color:var(--vinho)}
.chamada p.lede{margin-top:18px;font-size:16.5px;color:var(--tinta);max-width:48ch}
.chamada .cartao-c{background:var(--papel);border-radius:var(--raio-g);box-shadow:var(--sombra);padding:30px;display:grid;gap:14px}
.chamada .cartao-c .btn{width:100%}
.chamada .cartao-c .ou{display:flex;align-items:center;gap:10px;font-size:13.5px;color:var(--tinta-2)}
.chamada .cartao-c .ou .ico{width:18px;height:18px;color:var(--vinho-4)}

/* ---------- rodapé ---------- */
.rodape{position:relative;isolation:isolate;background:var(--vinho);color:var(--sal);padding:64px 0 36px}
.rodape::after{content:"";position:absolute;inset:0;z-index:-1;opacity:.35;mix-blend-mode:soft-light;background-image:var(--grao)}
.rodape .fita9{position:absolute;left:0;right:0;top:0;height:8px;display:flex}
.rodape .fita9 i{flex:1}
.rodape .grade-r{display:grid;grid-template-columns:minmax(0,1.4fr) repeat(3,minmax(0,1fr));gap:36px}
.rodape img{width:200px;height:auto}
.rodape .sobre{margin-top:18px;font-size:14px;color:var(--ambar-3);max-width:34ch}
.rodape h2{font-family:var(--sans);font-size:12px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:var(--ambar-2)}
.rodape ul{margin-top:12px;display:grid;gap:2px}
.rodape li a{display:inline-flex;align-items:center;gap:8px;min-height:40px;color:var(--sal);text-decoration:none;font-size:14.5px}
.rodape li a:hover{text-decoration:underline}
.rodape li .ico{width:18px;height:18px;color:var(--ambar)}
.rodape li .depois{display:block;font-size:12.5px;color:var(--ambar-2);margin-top:-6px}
.rodape .pe{margin-top:48px;padding-top:22px;border-top:1px solid var(--vinho-2);display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;font-size:13px;color:var(--ambar-2)}

/* ---------- páginas internas ---------- */
.abertura.interna .lado{clip-path:polygon(0 0,100% 0,100% 78%,0 100%)}
.abertura.interna .estatua{left:auto;right:6%;top:70px;width:260px;height:260px}
.cab-int{padding-top:36px;padding-bottom:120px;color:var(--sal);max-width:780px}
.cab-int .sobretitulo{color:var(--ambar-2)}
.cab-int h1{margin-top:14px;font-size:clamp(42px,4.6vw,62px);color:var(--papel);line-height:1.05}
.cab-int h1 i{font-style:italic;color:var(--ambar-3)}
.cab-int .lede{margin-top:22px;font-size:17px;max-width:56ch}
.trilha-int{display:flex;gap:8px;align-items:center;font-size:13px;color:var(--ambar-2);margin-bottom:6px}
.trilha-int a{color:var(--ambar-3)}

/* passo detalhado (como funciona) */
.passo{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:72px;align-items:center;padding:88px 0;border-top:1px solid var(--sal-2)}
.passo:first-of-type{border-top:0}
.passo.inv .p-texto{order:2}
.p-num{display:flex;align-items:center;gap:16px}
.p-num .disco{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;font-family:var(--serifa);font-size:26px;line-height:1;background:var(--vinho);color:var(--papel)}
.p-texto h2{margin-top:22px;font-size:clamp(32px,3.2vw,42px);color:var(--vinho)}
.p-texto .lede{margin-top:16px;font-size:16.5px;color:var(--tinta-2)}
.p-texto ul.itens{margin-top:22px;display:grid;gap:10px;font-size:15px}
.p-texto ul.itens li{display:grid;grid-template-columns:22px minmax(0,1fr);gap:10px}
.p-texto ul.itens .ico{width:20px;height:20px;color:var(--vinho);margin-top:3px}
.p-texto ul.itens li.p-plan .ico{color:var(--vinho-4)}
.p-texto ul.itens li.p-plan span{color:var(--tinta-2)}
.p-texto .st-linha{display:flex;flex-wrap:wrap;gap:8px;margin-top:22px}
.p-fig{position:relative}
.p-fig .fundo{position:absolute;inset:22px -14px -18px 22px;border-radius:var(--raio-g);background:var(--ambar);transform:rotate(-2.5deg);overflow:hidden}
.p-fig .fundo::before{content:"";position:absolute;inset:0;background-image:var(--padrao);background-size:128px 128px;opacity:.5}
.p-fig .fundo.vinho{background:var(--vinho)}
.p-fig .fundo.vinho::before{opacity:.18;filter:invert(1)}
.p-fig .fundo.sal{background:var(--ambar-3)}
.p-fig .demo{z-index:1}

/* conversa de WhatsApp (ilustração) */
.conversa{display:grid;gap:10px;margin-top:16px}
.balao{max-width:86%;padding:10px 14px;border-radius:14px;font-size:13.5px;line-height:1.5}
.balao small{display:block;font-size:11.5px;color:var(--tinta-2);margin-top:4px}
.balao.cli{background:var(--sal-2);border-top-left-radius:4px}
.balao.ia{justify-self:end;background:var(--ambar-3);border-top-right-radius:4px}
.balao.ia .quem{display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;color:var(--vinho-escuro);margin-bottom:2px}
.balao.ia .quem .ico{width:14px;height:14px}
.passagem{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:12px;background:var(--papel);box-shadow:inset 0 0 0 1px var(--vinho-4);font-size:13px}
.passagem .ico{width:18px;height:18px;color:var(--vinho);margin-top:1px}
.passagem b{font-weight:600}

/* honorários (ilustração) */
.linhas{margin-top:14px;display:grid}
.linhas>div{display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-top:1px solid var(--sal);font-size:13.5px}
.linhas>div:first-child{border-top:0}
.linhas dt{color:var(--tinta-2)}
.linhas dd{font-weight:600;text-align:right;white-space:nowrap}
.linhas .tot{border-top:2px solid var(--vinho)}
.linhas .tot dd{font-family:var(--serifa);font-size:20px;font-weight:500;color:var(--vinho)}
.parcelas{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;margin-top:14px}
.parcelas span{height:38px;border-radius:8px;display:grid;place-items:center;font-size:12px;font-weight:600;background:var(--sal-2);color:var(--tinta-2)}
.parcelas span.paga{background:var(--vinho);color:var(--papel)}
.parcelas span.hoje{background:var(--ambar);color:var(--tinta)}
.carne-mini{display:grid;grid-template-columns:86px minmax(0,1fr);gap:14px;align-items:center;margin-top:14px;padding:14px;border:1.5px dashed var(--vinho-4);border-radius:12px}
.carne-mini .qr{width:86px;height:86px;border-radius:8px;background:var(--sal-2);display:grid;place-items:center;color:var(--vinho)}
.carne-mini .qr .ico{width:52px;height:52px;stroke-width:1.2}
.carne-mini b{font-family:var(--serifa);font-size:20px;font-weight:500;color:var(--vinho)}
.carne-mini small{display:block;font-size:12px;color:var(--tinta-2)}

/* áreas por pessoa (ilustração) */
.pessoas-areas{margin-top:14px;width:100%;border-collapse:collapse;font-size:13px}
.pessoas-areas th,.pessoas-areas td{padding:10px 6px;border-top:1px solid var(--sal);text-align:center}
.pessoas-areas th:first-child,.pessoas-areas td:first-child{text-align:left}
.pessoas-areas thead th{font-size:11px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:var(--tinta-2);border-top:0}
.pessoas-areas td .ico{width:18px;height:18px;color:var(--vinho)}
.pessoas-areas td.nao{color:var(--tinta-2)}

/* como começar */
.comecar{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px;margin-top:52px}
.comecar li{background:var(--papel);border-radius:var(--raio-g);padding:26px 24px;display:grid;gap:10px;align-content:start}
.comecar .disco{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-family:var(--serifa);font-size:21px;background:var(--ambar-3);color:var(--vinho)}
.comecar h3{font-size:21px;color:var(--vinho)}
.comecar p{font-size:14px;color:var(--tinta-2)}

/* para quem é */
.perfil{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;margin-top:52px}
.perfil li{background:var(--papel);border-radius:var(--raio-g);padding:30px 28px;box-shadow:0 18px 40px -34px rgba(105,39,70,.5)}
.perfil .grande{font-family:var(--serifa);font-size:46px;line-height:1;color:var(--vinho);font-weight:500}
.perfil h3{margin-top:14px;font-size:22px;color:var(--vinho)}
.perfil p{margin-top:8px;font-size:14.5px;color:var(--tinta-2)}
.encaixe{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:52px}
.encaixe section{border-radius:var(--raio-g);padding:30px 30px 26px}
.encaixe .sim{background:var(--papel);box-shadow:var(--sombra)}
.encaixe .nao{border:1.5px dashed var(--vinho-4)}
.encaixe h3{font-size:25px;color:var(--vinho)}
.encaixe ul{margin-top:18px;display:grid;gap:12px;font-size:15px}
.encaixe li{display:grid;grid-template-columns:22px minmax(0,1fr);gap:12px}
.encaixe li .ico{width:20px;height:20px;margin-top:3px}
.encaixe .sim li .ico{color:var(--vinho)}
.encaixe .nao li .ico{color:var(--vinho-4)}
.perguntas{margin-top:44px;display:grid;gap:12px;max-width:860px}
.perguntas details{background:var(--papel);border-radius:var(--raio);border:1px solid var(--sal)}
.perguntas summary{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:60px;padding:14px 22px;cursor:pointer;font-family:var(--serifa);font-size:20px;color:var(--vinho);list-style:none}
.perguntas summary::-webkit-details-marker{display:none}
.perguntas summary .ico{width:20px;height:20px;transition:transform .15s}
.perguntas details[open] summary .ico{transform:rotate(90deg)}
.perguntas details p{padding:0 22px 20px;font-size:15px;color:var(--tinta-2);max-width:70ch}

/* ---------- demonstração (formulário) ---------- */
.dem-grade{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:56px;align-items:start;margin-top:-88px;position:relative;z-index:2;padding-bottom:104px}
.form-cartao{background:var(--papel);border-radius:var(--raio-g);box-shadow:var(--sombra);padding:36px 36px 32px;position:relative}
.form-cartao::before{content:"";position:absolute;right:0;top:0;width:120px;height:8px;background:var(--vinho);border-top-right-radius:var(--raio-g)}
.form-cartao::after{content:"";position:absolute;right:120px;top:0;width:40px;height:8px;background:var(--ambar)}
.form-cartao h2{font-size:30px;color:var(--vinho)}
.form-cartao .sub{margin-top:8px;font-size:14px;color:var(--tinta-2)}
.form-d{display:grid;grid-template-columns:1fr 1fr;gap:20px 20px;margin-top:26px}
.campo{display:grid;gap:6px;align-content:start;min-width:0}
.campo.inteiro{grid-column:1/-1}
.campo label,.campo legend{font-size:14px;font-weight:500;color:var(--tinta)}
.campo .opc{font-weight:400;color:var(--tinta-2)}
.entrada{width:100%;min-height:50px;padding:12px 14px;border-radius:var(--raio);border:1.5px solid var(--vinho-4);background:var(--papel);font:400 15px/1.4 var(--sans);color:var(--tinta)}
.entrada::placeholder{color:#8A7480}
.entrada:hover{border-color:var(--vinho-2)}
.entrada:focus{outline:3px solid var(--vinho-3);outline-offset:1px;border-color:var(--vinho)}
textarea.entrada{min-height:104px;resize:vertical}
select.entrada{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='%23692746' stroke-width='1.6'%3E%3Cpath d='m7 10 5 5 5-5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:44px}
.entrada[aria-invalid="true"]{border-color:var(--vinho-3);box-shadow:inset 0 0 0 1px var(--vinho-3)}
.entrada[readonly]{background:var(--sal-2);color:var(--tinta-2)}
.ajuda{font-size:12.5px;color:var(--tinta-2);line-height:1.45}
.erro-msg{display:flex;gap:6px;align-items:flex-start;font-size:13px;color:var(--vinho-3);font-weight:500;line-height:1.45}
.erro-msg .ico{width:16px;height:16px;margin-top:2px}
fieldset.campo{border:0;padding:0;margin:0}
.tamanhos{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:4px}
.tamanhos label{position:relative;display:grid;place-items:center;min-height:50px;border-radius:var(--raio);border:1.5px solid var(--vinho-4);font-size:14px;font-weight:500;color:var(--tinta);cursor:pointer;text-align:center;padding:4px 6px;line-height:1.2}
.tamanhos input{position:absolute;opacity:0;inset:0;margin:0;cursor:pointer}
.tamanhos label:has(input:checked){background:var(--vinho);border-color:var(--vinho);color:var(--papel)}
.tamanhos label:has(input:focus-visible){outline:3px solid var(--vinho-3);outline-offset:2px}
.tamanhos.erro label{border-color:var(--vinho-3)}
.aceite{grid-column:1/-1;display:grid;grid-template-columns:28px minmax(0,1fr);gap:10px;align-items:start;padding:16px;border-radius:var(--raio);background:var(--sal-2)}
.aceite input{width:22px;height:22px;margin:2px 0 0;accent-color:var(--vinho)}
.aceite label{font-size:13.5px;line-height:1.55;color:var(--tinta);font-weight:400}
.aceite.erro{box-shadow:inset 0 0 0 1.5px var(--vinho-3);background:#FBF1F4}
.aceite .erro-msg{grid-column:2}
.isca{position:absolute!important;left:-9999px;width:1px;height:1px;overflow:hidden}
.form-pe{grid-column:1/-1;display:flex;flex-wrap:wrap;align-items:center;gap:16px 20px;margin-top:4px}
.form-pe .btn{min-width:260px}
.form-pe small{font-size:12.5px;color:var(--tinta-2);flex:1;min-width:200px}
.btn[aria-busy="true"]{background:var(--vinho-2);cursor:progress}
.giro{width:18px;height:18px;border-radius:50%;border:2px solid rgba(255,255,255,.35);border-top-color:var(--papel);animation:giro 1s linear infinite}
@keyframes giro{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.giro{animation:none;border-top-color:rgba(255,255,255,.35);border-right-color:var(--papel)}}
.aviso{display:grid;grid-template-columns:24px minmax(0,1fr);gap:12px;padding:16px 18px;border-radius:var(--raio);font-size:14px;line-height:1.5;margin-top:22px}
.aviso .ico{color:currentColor;margin-top:1px}
.aviso b{display:block;font-weight:600}
.aviso-erro{background:#FBF1F4;color:var(--tinta);box-shadow:inset 4px 0 0 var(--vinho-3)}
.aviso-erro .ico{color:var(--vinho-3)}
.aviso-erro a{color:var(--vinho)}
.sucesso{display:grid;gap:16px;justify-items:start;padding:8px 0 4px}
.sucesso .disco{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;background:var(--vinho);color:var(--ambar-3)}
.sucesso .disco .ico{width:30px;height:30px}
.sucesso h2{font-size:34px}
.sucesso p{font-size:15px;color:var(--tinta-2);max-width:52ch}
.sucesso .resumo{width:100%;margin-top:4px;padding:16px 18px;border-radius:var(--raio);background:var(--sal-2);display:grid;gap:6px;font-size:14px}
.sucesso .resumo div{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
.sucesso .resumo dt{color:var(--tinta-2)}
.sucesso .resumo dd{font-weight:500;overflow-wrap:anywhere}
.lado-d{display:grid;gap:24px;padding-top:120px}
.lado-d h2{font-size:28px;color:var(--vinho)}
.depois-lista{display:grid;gap:18px;margin-top:18px}
.depois-lista li{display:grid;grid-template-columns:44px minmax(0,1fr);gap:14px}
.depois-lista .disco{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-family:var(--serifa);font-size:20px;background:var(--ambar-3);color:var(--vinho)}
.depois-lista b{display:block;font-weight:600;font-size:15px}
.depois-lista span{display:block;font-size:14px;color:var(--tinta-2)}
.caixa-d{border-radius:var(--raio-g);padding:22px 24px;background:var(--papel);display:grid;gap:8px;font-size:14px}
.caixa-d h3{font-size:20px;color:var(--vinho)}
.caixa-d p{color:var(--tinta-2)}
.caixa-d .btn{justify-self:start;margin-top:6px}

/* ---------- tablet e celular ---------- */
@media (max-width:1020px){
  :root{--gut:24px}
  .topo .miolo{min-height:72px}
  .topo .marca img{width:150px}
  .menu{display:none}
  .menu-cel{display:block;margin-left:auto;position:relative}
  .menu-cel summary{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 14px;border-radius:var(--raio);color:var(--sal);font-weight:500;font-size:15px;cursor:pointer;list-style:none;box-shadow:inset 0 0 0 1.5px var(--vinho-4)}
  .menu-cel summary::-webkit-details-marker{display:none}
  .menu-cel .painel{position:absolute;right:0;top:54px;width:min(320px,calc(100vw - 32px));background:var(--papel);border-radius:var(--raio-g);box-shadow:var(--sombra);padding:10px;display:grid;gap:2px}
  .menu-cel .painel a{display:flex;align-items:center;gap:10px;min-height:48px;padding:0 14px;border-radius:8px;color:var(--tinta);text-decoration:none;font-weight:500}
  .menu-cel .painel a[aria-current="page"]{background:var(--sal-2);color:var(--vinho)}
  .menu-cel .painel .btn{color:var(--papel);justify-content:center;margin-top:6px}
  .abertura{background:var(--sal)}
  .abertura .lado{clip-path:none;bottom:auto;height:var(--alt-vinho,62%)}
  .abertura .estatua{display:none}
  .fita{display:none}
  .heroi{grid-template-columns:1fr;gap:20px;padding-top:24px;padding-bottom:56px}
  .heroi .texto{max-width:none;padding-bottom:64px;position:relative}
  .abertura.inicio .lado{height:auto;bottom:0;clip-path:polygon(0 0,100% 0,100% calc(var(--corte,56%) - 40px),0 var(--corte,56%))}
  .folhas{max-width:520px;padding:0 8px}
  .folhas .selo-marca{display:none}
  .fatos ul{grid-template-columns:1fr 1fr}
  .fatos li{padding:20px 16px 20px 0;border-left:0;border-top:1px solid var(--sal)}
  .fatos li:nth-child(-n+2){border-top:0}
  .secao{padding:72px 0}
  .dores,.recursos,.perfil{grid-template-columns:1fr 1fr}
  .caminho{grid-template-columns:1fr;gap:0}
  .caminho li{display:grid;grid-template-columns:64px minmax(0,1fr);column-gap:18px;padding:0 0 28px}
  .caminho li::before{left:31px;top:64px;bottom:0;right:auto;width:2px;height:auto}
  .caminho h3{margin-top:4px;grid-column:2}
  .caminho p{grid-column:2;max-width:none}
  .caminho .disco{grid-row:span 2}
  .planejado{grid-template-columns:1fr;gap:20px}
  .dados{grid-template-columns:1fr 1fr}
  .preco,.chamada .miolo{grid-template-columns:1fr}
  .rodape .grade-r{grid-template-columns:1fr 1fr}
  .rodape .grade-r>div:first-child{grid-column:1/-1}
  .passo{grid-template-columns:minmax(0,1fr);gap:40px;padding:64px 0}
  .passo.inv .p-texto{order:0}
  .comecar{grid-template-columns:1fr 1fr}
  .encaixe{grid-template-columns:1fr}
  .abertura.interna .lado{clip-path:polygon(0 0,100% 0,100% calc(100% - 36px),0 100%);height:auto;bottom:0}
  .cab-int{padding-bottom:110px}
  .dem-grade{grid-template-columns:1fr;gap:40px}
  .lado-d{padding-top:0}
}
@media (max-width:640px){
  :root{--gut:16px}
  body{font-size:15px}
  .topo .marca img{width:132px}
  .heroi h1{font-size:40px}
  .heroi .lede,.cab-int .lede{font-size:15.5px}
  .heroi .acoes .btn{width:100%}
  .heroi .texto{padding-bottom:56px}
  .demo{padding:20px 18px 16px}
  .demo-cab{flex-direction:column;gap:8px}
  .fatos ul{grid-template-columns:1fr}
  .fatos li{border-top:1px solid var(--sal)!important;padding:16px 0}
  .fatos li:first-child{border-top:0!important}
  .secao{padding:60px 0}
  .sec-cab h2{font-size:32px}
  .sec-cab p.lede{font-size:15.5px}
  .dores,.recursos,.perfil,.dados,.comecar{grid-template-columns:1fr}
  .dores{margin-top:36px}
  .planejado{padding:24px 20px}
  .planejado ul{grid-template-columns:1fr}
  .faixa-vinho{padding:64px 0}
  .faixa-vinho .estatua{width:160px;height:160px;top:24px;right:-20px}
  .chamada{padding:60px 0}
  .preco .cartao-p{padding:28px 22px}
  .preco .cartao-p .btn,.caixa-d .btn{width:100%}
  .rodape .grade-r{grid-template-columns:1fr}
  .cab-int{padding-bottom:100px}
  .cab-int h1{font-size:38px}
  .p-fig .fundo{inset:14px -4px -12px 12px}
  .p-fig{overflow:visible;margin-right:4px}
  .form-cartao{padding:28px 20px 24px}
  .form-d{grid-template-columns:1fr}
  .tamanhos{grid-template-columns:1fr 1fr}
  .form-pe .btn{width:100%;min-width:0}
  .parcelas span{height:32px;font-size:11px}
  .perguntas summary{font-size:18px;padding:12px 16px}
  .perguntas details p{padding:0 16px 16px}
  .pessoas-areas{font-size:12px}.pessoas-areas thead th{font-size:9.5px;letter-spacing:0}.pessoas-areas th,.pessoas-areas td{padding:8px 2px}
}
@media (prefers-reduced-motion:no-preference){.btn{transition:background-color .15s ease,box-shadow .15s ease}}
""".replace('__GRAO__', GRAO).replace('__PADRAO__', PADRAO)

NAV = [('como-funciona.html', 'Como funciona'), ('para-quem-e.html', 'Para quem é'), ('demonstracao.html', 'Demonstração')]
FITA9 = ''.join(f'<i style="background:{c}"></i>' for c in ['#692746', '#87335B', '#AC3F6B', '#AC788D', '#DD9760', '#E9AE90', '#F2CDB3', '#F2ECE8', '#F1E6DF'])


def topo(atual):
    links = ''.join(f'<a href="{h}"{" aria-current=" + chr(34) + "page" + chr(34) if h == atual else ""}>{t}</a>' for h, t in NAV if h != 'demonstracao.html')
    links_cel = ''.join(f'<a href="{h}"{" aria-current=" + chr(34) + "page" + chr(34) if h == atual else ""}>{t}</a>' for h, t in [('inicio.html', 'Início')] + NAV)
    return f'''<header class="topo"><div class="miolo">
  <a class="marca" href="inicio.html"><img src="marca/logo-completo-sobre-vinho.svg" width="1583" height="512" alt="T3jus, Sistema jurídico, página inicial"></a>
  <nav class="menu" aria-label="Principal">{links}<a class="entrar" href="https://app.t3jus.pro">{ico("sair")}Entrar</a><a class="btn btn-claro" href="demonstracao.html">Pedir demonstração</a></nav>
  <details class="menu-cel"><summary aria-label="Abrir o menu">{ico("menu")}Menu</summary><nav class="painel" aria-label="Principal">{links_cel}<a href="https://app.t3jus.pro">{ico("sair")}Entrar no T3jus</a><a class="btn btn-pri" href="demonstracao.html">Pedir demonstração</a></nav></details>
</div></header>'''


RODAPE = f'''<footer class="rodape"><div class="fita9" aria-hidden="true">{FITA9}</div><div class="miolo">
  <div class="grade-r">
    <div><img src="marca/logo-completo-sobre-vinho.svg" width="1583" height="512" alt="T3jus, Sistema jurídico" loading="lazy"><p class="sobre">Gestão comercial e financeira ligada aos casos, para escritórios de advocacia.</p></div>
    <div><h2>O T3jus</h2><ul><li><a href="como-funciona.html">Como funciona</a></li><li><a href="para-quem-e.html">Para quem é</a></li><li><a href="demonstracao.html">Pedir demonstração</a></li></ul></div>
    <div><h2>Já é cliente</h2><ul><li><a href="https://app.t3jus.pro">{ico("sair")}Entrar no T3jus</a></li></ul></div>
    <div><h2>Contato</h2><ul><li><a href="mailto:contato@t3jus.pro">{ico("envelope")}contato@t3jus.pro</a></li><li><a href="privacidade.html">Política de privacidade</a><span class="depois">em preparação</span></li></ul></div>
  </div>
  <div class="pe"><span>© 2026 T3jus</span><span>Servidores no Brasil · São Paulo</span></div>
</div></footer>'''


def pagina(arq, titulo, descricao, url, corpo, atual, extra_head='', js=''):
    return f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titulo}</title>
<meta name="description" content="{H(descricao)}">
<meta name="theme-color" content="#692746">
<link rel="canonical" href="https://t3jus.pro{url}">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="T3jus">
<meta property="og:url" content="https://t3jus.pro{url}">
<meta property="og:title" content="{H(titulo)}">
<meta property="og:description" content="{H(descricao)}">
<meta property="og:image" content="https://t3jus.pro/marca/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Logo do T3jus, Sistema jurídico, sobre fundo vinho">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="marca/icone-app.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="marca/apple-touch-icon.png">
<link rel="stylesheet" href="fontes.css">
{extra_head}<style>{CSS}</style>
</head>
<body>
{SPRITE}
<a class="pular" href="#conteudo">Pular para o conteúdo</a>
{corpo.replace("{{TOPO}}", topo(atual))}
{RODAPE}
{js}
</body>
</html>
'''


# =============================================================== INÍCIO
DEMO_HOJE = f'''<div class="demo" role="img" aria-label="Exemplo da tela Hoje no escritório, com dados fictícios: uma conversa respondida pela assistente virtual, uma parcela que vence hoje, um alvará com repasse a fazer e um prazo de contestação.">
  <div aria-hidden="true">
  <div class="demo-cab"><p class="t">Hoje no escritório</p><span class="ex">Exemplo com dados fictícios</span></div><span class="fio"></span>
  <ul class="demo-lista">
    <li><span class="bola">{ico("whats")}</span><span><b>Marta Corrêa perguntou do processo</b><small>A assistente respondeu com a etapa do caso. Ninguém precisou parar.</small></span></li>
    <li><span class="bola a">{ico("carne")}</span><span><b>Parcela 4 de 6 vence hoje</b><small>Hélio Batista · <span class="val">R$ 850,00</span> · carnê com o Pix do escritório</small></span></li>
    <li><span class="bola v">{ico("repasse")}</span><span><b>Alvará de R$ 18.400,00 entrou</b><small>Repassar R$ 12.880,00 a Ana Souza até 28/11</small></span></li>
    <li><span class="bola">{ico("agenda")}</span><span><b>Contestação até 25/11</b><small>Caso 0801234 · Dra. Marina Ribeiro</small></span></li>
  </ul></div>
</div>'''

INICIO = f'''<div class="abertura inicio" style="--corte:58%">
  <div class="lado" aria-hidden="true"></div>
  {ico("coluna", "ico estatua")}
  <div class="fita" aria-hidden="true">{FITA9}</div>
  {{{{TOPO}}}}
  <main id="conteudo">
  <div class="miolo heroi">
    <div class="texto sobre-vinho">
      <span class="sobretitulo">Gestão para escritórios de advocacia</span>
      <h1>Do primeiro atendimento ao <i>honorário recebido.</i></h1>
      <span class="fio" aria-hidden="true"></span>
      <p class="lede">O T3jus junta o comercial e o financeiro do escritório aos casos: o cliente atendido pelo WhatsApp do escritório, contratos com parcelas, carnê com o seu Pix, repasses, caixa, prazos e agenda. Num só lugar, e cada pessoa vê só a parte dela.</p>
      <div class="acoes"><a class="btn btn-claro" href="demonstracao.html">Pedir uma demonstração{ico("seta")}</a><a class="btn btn-contorno" href="como-funciona.html">Ver como funciona</a></div>
      <p class="nota-h">{ico("relogio")}Uma conversa com a nossa equipe, sem compromisso.</p>
    </div>
    <div class="folhas"><div class="f-ambar" aria-hidden="true"></div><div class="f-timbre" aria-hidden="true"></div>{DEMO_HOJE}<img class="selo-marca" src="marca/selo-cor.svg" width="150" height="150" alt=""></div>
  </div>
</div>
<section class="fatos" aria-label="O básico sobre o T3jus"><div class="miolo"><ul>
  <li>{ico("servidor")}<span><b>Servidores no Brasil</b>em São Paulo</span></li>
  <li>{ico("escudo")}<span><b>Cada escritório separado</b>conferido no servidor, sempre</span></li>
  <li>{ico("pessoas")}<span><b>Cada pessoa com o seu acesso</b>sem senha compartilhada</span></li>
  <li>{ico("baixar")}<span><b>Os dados são seus</b>exporte tudo quando quiser</span></li>
</ul></div></section>

<section class="secao" aria-labelledby="t-dores"><div class="miolo">
  <div class="sec-cab"><span class="sobretitulo">Quando tudo passa pelo sócio</span><h2 id="t-dores">O escritório cresce, e o dinheiro escapa nos intervalos.</h2><span class="fio" aria-hidden="true"></span>
  <p class="lede">Em escritórios de 3 a 10 pessoas, quem decide também atende, cobra e confere o caixa. O T3jus foi pensado para esses intervalos.</p></div>
  <ul class="dores">
    <li class="dor"><span class="disco">{ico("whats")}</span><h3>O cliente escreve no WhatsApp de alguém</h3><p>E a resposta depende de quem viu. A pergunta sobre o processo para o trabalho de quem estava no prazo.</p></li>
    <li class="dor"><span class="disco">{ico("moeda")}</span><h3>A parcela atrasa e ninguém percebe</h3><p>O contrato tinha entrada, parcelas e êxito. A planilha só mostra o que alguém lembrou de lançar.</p></li>
    <li class="dor"><span class="disco">{ico("repasse")}</span><h3>O alvará sai e o repasse fica para depois</h3><p>O dinheiro do cliente entra junto com o do escritório, e a conta só fecha quando alguém refaz tudo.</p></li>
  </ul>
</div></section>

<section class="secao clara" aria-labelledby="t-caminho"><div class="miolo">
  <div class="sec-cab"><span class="sobretitulo">Um caminho só</span><h2 id="t-caminho">Cada etapa leva à próxima, sem redigitar.</h2><span class="fio" aria-hidden="true"></span></div>
  <ol class="caminho">
    <li><span class="disco" aria-hidden="true">1</span><h3>Atendimento</h3><p>O cliente fala com o escritório, e cada retorno tem dono e data.</p></li>
    <li><span class="disco" aria-hidden="true">2</span><h3>Proposta</h3><p>Proposta no papel timbrado, com situação e responsável.</p></li>
    <li><span class="disco" aria-hidden="true">3</span><h3>Contrato e honorários</h3><p>Fixo, parcelado, mensal, êxito: as parcelas saem do contrato.</p></li>
    <li><span class="disco" aria-hidden="true">4</span><h3>Caso, prazos e agenda</h3><p>Etapas do seu jeito, prazos e audiências de toda a equipe.</p></li>
    <li><span class="disco" aria-hidden="true">5</span><h3>Recebido e repassado</h3><p>O que entrou, o que é do cliente e o que falta, sem somar o que não é seu.</p></li>
  </ol>
  <p class="caminho-pe"><a class="link-seta" href="como-funciona.html">Ver cada etapa em detalhe{ico("seta")}</a></p>
</div></section>

<section class="secao" aria-labelledby="t-recursos"><div class="miolo">
  <div class="sec-cab"><span class="sobretitulo">O que tem no T3jus</span><h2 id="t-recursos">O que já existe, e o que ainda não.</h2><span class="fio" aria-hidden="true"></span>
  <p class="lede">Preferimos dizer com clareza. Cada parte tem a sua situação de hoje.</p></div>
  <ul class="legenda" aria-label="O que cada situação quer dizer">
    <li>{selo("pronto")}<span>construído e testado</span></li>
    <li>{selo("prep")}<span>construído; falta ligar a um serviço de fora</span></li>
    <li>{selo("plan")}<span>ainda não existe</span></li>
  </ul>
  <ul class="recursos">
    <li class="recurso"><div class="topo-r"><span class="ic">{ico("whats")}</span>{selo("prep")}</div><h3>Atendimento pelo WhatsApp do escritório</h3>
      <p>O cliente fala com o número do próprio escritório. A assistente virtual responde com o que está no T3jus e passa para uma pessoa quando não sabe, com o motivo.</p>
      <p class="falta"><b>Falta:</b> a ligação oficial com a Meta, para o seu número funcionar de verdade.</p></li>
    <li class="recurso"><div class="topo-r"><span class="ic">{ico("pena")}</span>{selo("pronto")}</div><h3>Atendimentos e propostas</h3>
      <p>Cada contato com origem, retorno e responsável. Proposta em .docx no timbrado do escritório e, aceita, vira contrato com as mesmas condições.</p></li>
    <li class="recurso"><div class="topo-r"><span class="ic">{ico("moeda")}</span>{selo("pronto")}</div><h3>Contratos e honorários</h3>
      <p>Fixo, parcelado, mensal, êxito, sucumbência e percentual recorrente no mesmo contrato. As parcelas e as datas saem dele.</p></li>
    <li class="recurso"><div class="topo-r"><span class="ic">{ico("carne")}</span>{selo("pronto")}</div><h3>Carnê com o Pix do escritório</h3>
      <p>Um PDF com as parcelas destacáveis e o QR do Pix do próprio escritório, para imprimir ou mandar ao cliente. Sem boleto e sem intermediário.</p></li>
    <li class="recurso"><div class="topo-r"><span class="ic">{ico("carteira")}</span>{selo("pronto")}</div><h3>Financeiro e caixa</h3>
      <p>A receber, a pagar, contas do mês, reembolso de custas, previsto contra realizado e a exportação para o contador em planilha.</p></li>
    <li class="recurso"><div class="topo-r"><span class="ic">{ico("repasse")}</span>{selo("pronto")}</div><h3>Repasses</h3>
      <p>Alvará, RPV, precatório e acordo como dinheiro de terceiros, com a divisão do contrato e prazo para cada parte. O caso só fecha com tudo repassado.</p></li>
    <li class="recurso"><div class="topo-r"><span class="ic">{ico("balanca")}</span>{selo("pronto")}</div><h3>Casos, prazos e agenda</h3>
      <p>Casos com vários clientes, etapas definidas pelo escritório, prazos e tarefas com responsável, documentos que faltam e a agenda da equipe.</p></li>
    <li class="recurso"><div class="topo-r"><span class="ic">{ico("doc")}</span>{selo("pronto")}</div><h3>Petições a partir de modelos</h3>
      <p>Os modelos do escritório preenchidos com os dados do cliente e do caso, em .docx, para o advogado revisar.</p></li>
    <li class="recurso"><div class="topo-r"><span class="ic">{ico("pessoas")}</span>{selo("pronto")}</div><h3>Áreas liberadas por pessoa</h3>
      <p>O sócio dono convida a equipe e marca o que cada pessoa vê: Comercial, Contratos, Financeiro, Jurídico. Ele vê tudo.</p></li>
  </ul>
  <div class="planejado"><div><h3>Planejado</h3><p class="sub">Está na nossa lista, sem data prometida. Se algum destes é essencial para você, conte na demonstração.</p></div>
    <ul>
      <li>{ico("tracejado")}Cobrança por Pix ou boleto com baixa automática ao pagar</li>
      <li>{ico("tracejado")}Recibo em PDF de cada pagamento</li>
      <li>{ico("tracejado")}Leitura automática de publicações e intimações</li>
      <li>{ico("tracejado")}Assinatura eletrônica do contrato e da procuração</li>
      <li>{ico("tracejado")}Agenda ligada ao Google Agenda ou ao Outlook</li>
      <li>{ico("tracejado")}Importar direto de outros sistemas jurídicos (hoje, por planilha)</li>
    </ul></div>
</div></section>

<section class="faixa-vinho sobre-vinho" aria-labelledby="t-dados">{ico("balanca", "ico estatua")}<div class="miolo">
  <span class="sobretitulo">Seus dados</span><h2 id="t-dados">Sigilo profissional, levado a sério.</h2><span class="fio" aria-hidden="true"></span>
  <p class="lede">Os dados dos seus clientes são do escritório. O T3jus só guarda e trata o que o escritório pede, como manda a LGPD.</p>
  <ul class="dados">
    <li><span class="bola">{ico("escudo")}</span><span><b>Cada escritório separado</b><span>Toda leitura e toda gravação conferem o escritório no servidor, nunca no navegador.</span></span></li>
    <li><span class="bola">{ico("servidor")}</span><span><b>No Brasil</b><span>Banco de dados e arquivos em São Paulo.</span></span></li>
    <li><span class="bola">{ico("historico")}</span><span><b>Nada some em silêncio</b><span>Quem fez o quê, e quando, fica no histórico.</span></span></li>
    <li><span class="bola">{ico("cadeado")}</span><span><b>Acesso de cada um</b><span>Cada pessoa entra com o próprio e-mail. Ninguém da equipe T3jus vê a sua senha.</span></span></li>
    <li><span class="bola">{ico("baixar")}</span><span><b>Exportação completa</b><span>O sócio dono baixa todos os dados do escritório quando quiser.</span></span></li>
    <li><span class="bola">{ico("funcoes")}</span><span><b>Controlador e operador</b><span>O escritório é o controlador dos dados; o T3jus, o operador.</span></span></li>
  </ul>
</div></section>

<section class="secao" aria-labelledby="t-preco"><div class="miolo preco">
  <div class="sec-cab"><span class="sobretitulo">Valor</span><h2 id="t-preco">Combinado com você, na demonstração.</h2><span class="fio" aria-hidden="true"></span>
  <p class="lede">Os planos estão sendo definidos com os primeiros escritórios. Na conversa, entendemos o tamanho da equipe e o que vocês usam hoje, e combinamos o valor antes de qualquer compromisso.</p></div>
  <div class="cartao-p"><h3>Na demonstração, você vê</h3>
    <ul><li>{ico("check")}O T3jus com um exemplo parecido com o seu escritório</li><li>{ico("check")}Como trazer os clientes e contratos da sua planilha</li><li>{ico("check")}O que já existe e o que ainda é planejado</li><li>{ico("check")}O valor para o tamanho da sua equipe</li></ul>
    <a class="btn btn-pri" href="demonstracao.html">Pedir uma demonstração{ico("seta")}</a></div>
</div></section>
'''

CHAMADA = f'''<section class="chamada" aria-labelledby="t-chamada"><div class="miolo">
  <div><span class="sobretitulo">Vamos conversar</span><h2 id="t-chamada">Veja o T3jus com a rotina do seu escritório.</h2><p class="lede">Conte rapidinho como o escritório funciona hoje. A nossa equipe responde para marcar um horário.</p></div>
  <div class="cartao-c"><a class="btn btn-pri" href="demonstracao.html">Pedir uma demonstração{ico("seta")}</a><p class="ou">{ico("envelope")}<span>Prefere e-mail? <a href="mailto:contato@t3jus.pro">contato@t3jus.pro</a></span></p></div>
</div></section>'''

INICIO += CHAMADA + '\n</main>'

LD = '''<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"T3jus","url":"https://t3jus.pro/","logo":"https://t3jus.pro/marca/icone-app.svg","email":"contato@t3jus.pro"}</script>
'''

open(os.path.join(SAIDA, 'inicio.html'), 'w', encoding='utf-8').write(pagina(
    'inicio.html', 'T3jus · Gestão para escritórios de advocacia',
    'Do primeiro atendimento ao honorário recebido: atendimento pelo WhatsApp do escritório, contratos e parcelas, carnê com Pix, repasses, caixa, prazos e agenda num só lugar.',
    '/', INICIO, 'inicio.html', LD))


# =============================================================== COMO FUNCIONA
def cab_interna(sobre, titulo, lede, nome_pag):
    return f'''<div class="abertura interna"><div class="lado" aria-hidden="true"></div>{ico("coluna", "ico estatua")}
  {{{{TOPO}}}}
  <div class="miolo"><div class="cab-int sobre-vinho"><nav class="trilha-int" aria-label="Você está em"><a href="inicio.html">Início</a><span aria-hidden="true">/</span><span aria-current="page">{nome_pag}</span></nav>
  <span class="sobretitulo">{sobre}</span><h1>{titulo}</h1><span class="fio" aria-hidden="true"></span><p class="lede">{lede}</p></div></div>
</div>'''


def passo(n, sobre, titulo, lede, itens, fig, fundo='', inv=False, selos=''):
    li = ''.join(f'<li class="{"p-plan" if p else ""}">{ico("tracejado" if p else "check")}<span>{t}</span></li>' for t, p in itens)
    return f'''<section class="passo{' inv' if inv else ''}" aria-labelledby="t-p{n}">
  <div class="p-texto"><div class="p-num"><span class="disco" aria-hidden="true">{n}</span><span class="sobretitulo">{sobre}</span></div>
    <h2 id="t-p{n}">{titulo}</h2><p class="lede">{lede}</p><ul class="itens">{li}</ul>{('<p class="st-linha">' + selos + '</p>') if selos else ''}</div>
  <div class="p-fig"><div class="fundo {fundo}" aria-hidden="true"></div>{fig}</div>
</section>'''


FIG1 = f'''<div class="demo" role="img" aria-label="Exemplo de conversa com dados fictícios: a cliente pergunta do processo, a assistente virtual responde com a etapa do caso e, na pergunta sobre acordo, passa para a Dra. Marina Ribeiro com o motivo.">
<div aria-hidden="true"><div class="demo-cab"><p class="t">Conversa com Marta Corrêa</p><span class="ex">Exemplo</span></div>
<div class="conversa">
  <p class="balao cli">Bom dia! Teve alguma novidade no meu processo?<small>09h12</small></p>
  <p class="balao ia"><span class="quem">{ico("ia")}Assistente virtual do escritório</span>Bom dia, Marta! O seu caso está na etapa “Aguardando sentença” desde 10/11. Assim que mudar, avisamos por aqui.<small>09h12</small></p>
  <p class="balao cli">E se eles oferecerem um acordo, vale a pena?<small>09h14</small></p>
  <p class="passagem">{ico("pessoas")}<span><b>Passou para Dra. Marina Ribeiro</b>, que cuida do caso. Motivo: pergunta sobre acordo, que pede um advogado.</span></p>
</div></div></div>'''

FIG2 = f'''<div class="demo" role="img" aria-label="Exemplo de contrato com dados fictícios: entrada de R$ 1.500,00, seis parcelas de R$ 850,00 e êxito de 30 por cento; três parcelas pagas e a quarta vence hoje.">
<div aria-hidden="true"><div class="demo-cab"><p class="t">Contrato C-2026-014</p><span class="ex">Exemplo</span></div>
<dl class="linhas"><div><dt>Cliente</dt><dd>Hélio Batista Corrêa</dd></div><div><dt>Entrada</dt><dd class="num">R$ 1.500,00</dd></div><div><dt>Parcelado</dt><dd class="num">6 × R$ 850,00</dd></div><div><dt>Êxito</dt><dd>30% do que o cliente receber</dd></div><div class="tot"><dt>Fixo contratado</dt><dd class="num">R$ 6.600,00</dd></div></dl>
<div class="parcelas"><span class="paga">1</span><span class="paga">2</span><span class="paga">3</span><span class="hoje">4</span><span>5</span><span>6</span></div>
</div></div>'''

FIG3 = f'''<div class="demo" role="img" aria-label="Exemplo de via do carnê com dados fictícios: parcela 4 de 6, vencimento em 25/11, R$ 850,00, com o QR do Pix do escritório.">
<div aria-hidden="true"><div class="demo-cab"><p class="t">Carnê do escritório</p><span class="ex">Exemplo</span></div>
<div class="carne-mini"><span class="qr">{ico("qr")}</span><span><small>Ribeiro Advocacia · parcela 4 de 6</small><b class="num">R$ 850,00</b><small>Vence em 25/11/2026 · Pix do escritório</small></span></div>
<div class="carne-mini"><span class="qr">{ico("qr")}</span><span><small>Ribeiro Advocacia · parcela 5 de 6</small><b class="num">R$ 850,00</b><small>Vence em 25/12/2026 · Pix do escritório</small></span></div>
</div></div>'''

FIG4 = f'''<div class="demo" role="img" aria-label="Exemplo de agenda da semana com dados fictícios: contestação até 25/11, audiência de conciliação virtual em 26/11 e documento que falta do cliente.">
<div aria-hidden="true"><div class="demo-cab"><p class="t">Esta semana</p><span class="ex">Exemplo</span></div>
<ul class="demo-lista">
  <li><span class="bola a">{ico("relogio")}</span><span><b>Contestação até 25/11</b><small>Caso 0801234 · Dra. Marina Ribeiro · lembrete 2 dias antes</small></span></li>
  <li><span class="bola v">{ico("agenda")}</span><span><b>Audiência de conciliação, 26/11 às 14h</b><small>Virtual, com o link da sala · cliente Ana Souza</small></span></li>
  <li><span class="bola">{ico("doc")}</span><span><b>Falta o comprovante de residência</b><small>Pedido a João Prado em 18/11 · trava a petição inicial</small></span></li>
</ul></div></div>'''

FIG5 = f'''<div class="demo" role="img" aria-label="Exemplo de repasse com dados fictícios: alvará de R$ 18.400,00; honorários de êxito de R$ 5.520,00 ficam com o escritório; R$ 12.880,00 vão para a cliente até 28/11.">
<div aria-hidden="true"><div class="demo-cab"><p class="t">Alvará do caso 0801234</p><span class="ex">Exemplo</span></div>
<dl class="linhas"><div><dt>Valor levantado</dt><dd class="num">R$ 18.400,00</dd></div><div><dt>Honorários de êxito (30%)</dt><dd class="num">R$ 5.520,00</dd></div><div><dt>Para Ana Souza, até 28/11</dt><dd class="num">R$ 12.880,00</dd></div><div class="tot"><dt>Falta destinar</dt><dd class="num">R$ 0,00</dd></div></dl>
<p class="passagem" style="margin-top:14px">{ico("carteira")}<span><b>No caixa, separado:</b> o que é do escritório aparece ao lado do dinheiro de terceiros, sem somar.</span></p>
</div></div>'''

FIG6 = f'''<div class="demo" role="img" aria-label="Exemplo de equipe com dados fictícios: a sócia dona vê todas as áreas; a advogada vê Contratos e Jurídico; a secretária vê Comercial e Financeiro.">
<div aria-hidden="true"><div class="demo-cab"><p class="t">Quem vê o quê</p><span class="ex">Exemplo</span></div>
<table class="pessoas-areas"><thead><tr><th>Pessoa</th><th>Comercial</th><th>Contratos</th><th>Financeiro</th><th>Jurídico</th></tr></thead><tbody>
<tr><td>Marina, sócia dona</td><td>{ico("check")}</td><td>{ico("check")}</td><td>{ico("check")}</td><td>{ico("check")}</td></tr>
<tr><td>Diego, advogado</td><td class="nao">não</td><td>{ico("check")}</td><td class="nao">não</td><td>{ico("check")}</td></tr>
<tr><td>Rita, secretária</td><td>{ico("check")}</td><td class="nao">não</td><td>{ico("check")}</td><td class="nao">não</td></tr>
</tbody></table></div></div>'''

COMO = cab_interna('Como funciona', 'Um caminho só, do primeiro contato ao <i>dinheiro no lugar certo.</i>',
                   'O T3jus segue o caminho que o honorário faz no escritório. O que uma etapa registra, a próxima já usa: ninguém digita duas vezes.', 'Como funciona')
COMO += '<main id="conteudo"><div class="secao clara" style="padding:0"><div class="miolo">'
COMO += passo(1, 'Atendimento', 'O cliente fala com o escritório, não com o celular de alguém.',
              'As conversas chegam pelo número de WhatsApp do próprio escritório. A assistente virtual se apresenta como assistente, responde o que está no T3jus e passa para uma pessoa quando não sabe.',
              [('A fila de quem espera alguém, com o motivo e quem vai responder', 0), ('Quem assume, escreve, devolve para a assistente ou passa para outra pessoa, tudo registrado', 0),
               ('As regras da assistente são do escritório: o que pode responder, o que nunca responde, o horário', 0),
               ('Atendimentos com origem, retorno e responsável, mesmo os que chegam por telefone', 0)],
              FIG1, selos=selo('prep') + '<span class="st st-plan">' + ico('relogio') + 'Falta ligar o número à Meta</span>')
COMO += passo(2, 'Proposta e contrato', 'A proposta aceita vira contrato com as mesmas condições.',
              'Proposta com situação e responsável, em .docx no papel timbrado. Aceita, ela gera o contrato com os honorários já preenchidos, e o arquivo assinado fica anexado.',
              [('Fixo, parcelado, mensal, êxito, sucumbência, por ato e percentual recorrente no mesmo contrato', 0), ('As parcelas e as datas saem do contrato, sem planilha à parte', 0),
               ('A OAB de cada advogado vai certa no documento', 0), ('Procuração e declaração geradas no timbrado', 1), ('Assinatura eletrônica', 1)],
              FIG2, fundo='vinho', inv=True)
COMO += passo(3, 'Parcelas e cobrança', 'Cada parcela com vencimento, forma de pagamento e quem cobra.',
              'O carnê sai do contrato, com o QR do Pix do próprio escritório em cada via. O dinheiro cai direto na sua conta: o T3jus não fica no meio.',
              [('Vencidas por idade, com o motivo do atraso e a próxima ação de cobrança', 0), ('O responsável vê a cobrança do dia na tela inicial', 0),
               ('Avisos automáticos de vencimento e atraso pelo WhatsApp, só em dia útil e em horário comercial', 0), ('Pix ou boleto com baixa automática ao pagar', 1), ('Recibo em PDF de cada pagamento', 1)],
              FIG3, fundo='sal', selos=selo('pronto') + '<span class="st st-prep">' + ico('relogio') + 'Avisos: falta ligar o WhatsApp</span>')
COMO += passo(4, 'Caso, prazos e agenda', 'O jurídico no mesmo lugar do contrato.',
              'Um caso pode ter vários clientes, cada um com os próprios honorários. As etapas são as do seu escritório, e a etapa certa avisa o financeiro.',
              [('Prazos cadastrados por vocês, com responsável e lembrete', 0), ('Agenda de mês, semana e dia, com audiência presencial ou virtual e o link da sala', 0),
               ('Documentos que faltam do cliente, para pedir de novo', 0), ('Petições a partir dos modelos do escritório, para revisar', 0), ('Leitura automática de publicações e intimações', 1)],
              FIG4, inv=True)
COMO += passo(5, 'Recebido e repassado', 'O que é do cliente não se mistura com o que é do escritório.',
              'Alvará, RPV, precatório e acordo entram como dinheiro de terceiros. A divisão vem do contrato, e cada parte tem prazo.',
              [('O caso só fecha no financeiro com tudo recebido e tudo repassado', 0), ('Caixa do mês ao lado do dinheiro de terceiros, sem somar', 0),
               ('Relatórios do sócio: por cliente, por área e por responsável', 0), ('Exportação do mês para o contador em planilha', 0), ('Prestação de contas ao cliente pelo WhatsApp', 1)],
              FIG5, fundo='vinho')
COMO += passo(6, 'Equipe', 'Cada pessoa vê só a parte dela.',
              'Não há cargos fixos. O sócio dono convida cada pessoa e marca as áreas que ela acessa. Pode mudar quando quiser, e a mudança fica no histórico.',
              [('Quando alguém sai, as tarefas, prazos e cobranças passam para quem o sócio escolher', 0), ('Cada pessoa com acesso próprio, por convite', 0), ('Tela inicial com o que cada um precisa fazer hoje', 0)],
              FIG6, fundo='sal', inv=True)
COMO += '</div></div>'
COMO += f'''<section class="secao rebaixada" aria-labelledby="t-comecar"><div class="miolo">
  <div class="sec-cab"><span class="sobretitulo">Para começar</span><h2 id="t-comecar">Do pedido ao primeiro dia de uso.</h2><span class="fio" aria-hidden="true"></span></div>
  <ol class="comecar">
    <li><span class="disco" aria-hidden="true">1</span><h3>Demonstração</h3><p>Uma conversa para ver o T3jus com a rotina do seu escritório e combinar o valor.</p></li>
    <li><span class="disco" aria-hidden="true">2</span><h3>Seus dados</h3><p>Clientes e contratos vêm da sua planilha. A nossa equipe ajuda na importação.</p></li>
    <li><span class="disco" aria-hidden="true">3</span><h3>A equipe</h3><p>O sócio dono convida cada pessoa e marca as áreas de cada uma.</p></li>
    <li><span class="disco" aria-hidden="true">4</span><h3>O WhatsApp</h3><p>O número do escritório é ligado pelo caminho oficial da Meta, passo a passo. {selo("prep")}</p></li>
  </ol>
</div></section>'''
COMO += CHAMADA + '</main>'
open(os.path.join(SAIDA, 'como-funciona.html'), 'w', encoding='utf-8').write(pagina(
    'como-funciona.html', 'Como funciona · T3jus',
    'Atendimento pelo WhatsApp do escritório, proposta e contrato, parcelas e carnê com Pix, casos e prazos, repasses e caixa: o caminho do honorário no T3jus, etapa por etapa.',
    '/como-funciona', COMO, 'como-funciona.html'))


# =============================================================== PARA QUEM É
PERG = [
    ('Preciso largar o sistema que uso hoje?', 'Não de uma vez. Clientes e contratos entram pela sua planilha, com a ajuda da nossa equipe. Importar direto de outros sistemas jurídicos ainda é planejado.'),
    ('O cliente vai falar com um robô?', 'A assistente virtual se apresenta como assistente e responde só o que está no T3jus, como a etapa do caso ou a data da parcela. O que ela não sabe, ou o que pede um advogado, ela passa para uma pessoa da equipe, com o motivo. O escritório decide as regras e pode pausar quando quiser. A ligação oficial do seu número com a Meta ainda está em preparação.'),
    ('O T3jus recebe o dinheiro dos meus clientes?', 'Não. O carnê leva o Pix do próprio escritório, e o dinheiro cai direto na sua conta. Quem registra o recebimento é a sua equipe.'),
    ('Onde ficam os dados?', 'Em servidores no Brasil, em São Paulo. Os dados de cada escritório ficam separados, e o sócio dono pode exportar tudo quando quiser.'),
    ('Funciona no celular?', 'Sim. As telas foram desenhadas para o computador e para o celular, no navegador, sem instalar nada.'),
    ('Quanto custa?', 'O valor é combinado na demonstração, de acordo com o tamanho da equipe. Os planos estão sendo definidos com os primeiros escritórios.'),
]
PQ = cab_interna('Para quem é', 'Para o escritório em que <i>o sócio cuida de tudo.</i>',
                 'O T3jus é feito para escritórios de advocacia pequenos, em que quem decide também atende, cobra e confere o caixa.', 'Para quem é')
PQ += f'''<main id="conteudo"><section class="secao" style="padding-top:72px" aria-labelledby="t-perfil"><div class="miolo">
  <div class="sec-cab"><span class="sobretitulo">O escritório que temos em mente</span><h2 id="t-perfil">Pequeno na equipe, grande na rotina.</h2><span class="fio" aria-hidden="true"></span></div>
  <ul class="perfil">
    <li><p class="grande">3 a 10</p><h3>pessoas na equipe</h3><p>Sócios, advogados, estagiários e secretaria, cada um com a sua parte.</p></li>
    <li><p class="grande">1</p><h3>sócio que centraliza</h3><p>Quem decide também responde cliente, aprova pagamento e confere o mês.</p></li>
    <li><p class="grande">{ico("moeda", "ico")}</p><h3>honorários que se repetem</h3><p>Fixos ou parcelados, com êxito, RPV ou precatório no fim do caminho.</p></li>
  </ul>
  <div class="encaixe">
    <section class="sim" aria-labelledby="t-sim"><h3 id="t-sim">Faz sentido se</h3><ul>
      <li>{ico("check")}<span>Os clientes escrevem no WhatsApp pessoal de quem atendeu</span></li>
      <li>{ico("check")}<span>As parcelas dos contratos vivem numa planilha</span></li>
      <li>{ico("check")}<span>Alvarás e acordos entram e o repasse depende da memória de alguém</span></li>
      <li>{ico("check")}<span>O sócio quer saber, numa tela, o que cobrar, o que repassar e o que vence</span></li>
      <li>{ico("check")}<span>Cada pessoa da equipe deve ver só a parte dela</span></li>
    </ul></section>
    <section class="nao" aria-labelledby="t-nao"><h3 id="t-nao">Talvez ainda não seja para você se</h3><ul>
      <li>{ico("tracejado")}<span>Você precisa hoje da leitura automática de publicações e intimações</span></li>
      <li>{ico("tracejado")}<span>A cobrança precisa sair por boleto registrado com baixa automática</span></li>
      <li>{ico("tracejado")}<span>O escritório tem muitas dezenas de advogados e departamentos</span></li>
    </ul><p class="ajuda" style="margin-top:16px;font-size:13.5px">Estes estão na lista do que é planejado. Se algum é essencial, conte na demonstração.</p></section>
  </div>
</div></section>
<section class="secao clara" aria-labelledby="t-perg"><div class="miolo">
  <div class="sec-cab"><span class="sobretitulo">Perguntas</span><h2 id="t-perg">O que costumam perguntar.</h2><span class="fio" aria-hidden="true"></span></div>
  <div class="perguntas">{"".join(f'<details><summary>{p}{ico("dir")}</summary><p>{r}</p></details>' for p, r in PERG)}</div>
</div></section>
{CHAMADA}</main>'''
FAQ_LD = '<script type="application/ld+json">' + __import__('json').dumps({'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
    {'@type': 'Question', 'name': p, 'acceptedAnswer': {'@type': 'Answer', 'text': r}} for p, r in PERG]}, ensure_ascii=False) + '</script>\n'
open(os.path.join(SAIDA, 'para-quem-e.html'), 'w', encoding='utf-8').write(pagina(
    'para-quem-e.html', 'Para quem é · T3jus',
    'Para escritórios de advocacia de 3 a 10 pessoas em que o sócio centraliza a gestão, com honorários fixos ou parcelados, êxito, RPV ou precatório.',
    '/para-quem-e', PQ, 'para-quem-e.html', FAQ_LD))


# =============================================================== DEMONSTRAÇÃO (F2.2, SC-02)
TAMS = ['Só eu', '2 a 5', '6 a 10', 'Mais de 10']
AREAS = ['Escolha, se quiser', 'Previdenciário', 'Trabalhista', 'Família e sucessões', 'Cível e consumidor', 'Empresarial e tributário', 'Criminal', 'Várias áreas', 'Outra']
VAL = dict(nome='Lívia Prado', esc='Jatobá Advocacia Previdenciária', email='livia@jatoba.adv.br', whats='(86) 99812-4410', tam='6 a 10', area='Previdenciário',
           msg='Hoje controlamos as parcelas numa planilha e os RPVs no caderno. Queremos ver o financeiro e o WhatsApp.', aceite=True)
VAZIO = dict(nome='', esc='', email='', whats='', tam='', area='Escolha, se quiser', msg='', aceite=False)


def erro(id_, txt):
    return f'<p class="erro-msg" id="{id_}-erro">{ico("alerta")}{txt}</p>'


def campo_d(id_, rotulo, valor, tipo='text', auto='', erro_txt='', ajuda='', opc=False, cls='', modo='', ro=False, ph=''):
    desc = ' '.join(x for x in (f'{id_}-erro' if erro_txt else '', f'{id_}-ajuda' if ajuda else '') if x)
    a = (f' aria-describedby="{desc}"' if desc else '') + (' aria-invalid="true"' if erro_txt else '') + ('' if opc else ' required aria-required="true"')
    a += f' autocomplete="{auto}"' if auto else ''
    a += f' inputmode="{modo}"' if modo else ''
    a += ' readonly' if ro else ''
    a += f' placeholder="{ph}"' if ph else ''
    o = ' <span class="opc">(opcional)</span>' if opc else ''
    return (f'<div class="campo {cls}"><label for="{id_}">{rotulo}{o}</label><input class="entrada" id="{id_}" name="{id_}" type="{tipo}" value="{H(valor)}"{a}>'
            + (erro(id_, erro_txt) if erro_txt else '') + (f'<p class="ajuda" id="{id_}-ajuda">{ajuda}</p>' if ajuda else '') + '</div>')


def formulario(v, erros=None, estado='branco'):
    e = erros or {}
    ro = estado == 'enviando'
    topo = ''
    if e:
        topo = (f'<div class="aviso aviso-erro" role="alert" tabindex="-1" id="resumo-erros">{ico("alerta")}<div><b>Falta acertar {len(e)} pontos, marcados abaixo.</b>'
                f'<p>Nada foi enviado ainda.</p></div></div>')
    if estado == 'falha':
        topo = (f'<div class="aviso aviso-erro" role="alert" tabindex="-1">{ico("alerta")}<div><b>Não deu para enviar agora.</b>'
                '<p>A conexão caiu antes de o pedido chegar. O que você escreveu continua aqui: tente de novo em instantes ou escreva para <a href="mailto:contato@t3jus.pro">contato@t3jus.pro</a>.</p></div></div>')
    tams = ''.join(f'<label><input type="radio" name="tamanho" value="{t}"{" checked" if v["tam"] == t else ""}{" disabled" if ro else ""} required'
                   f'{" aria-invalid=" + chr(34) + "true" + chr(34) if "tam" in e else ""}{" aria-describedby=" + chr(34) + "tam-erro" + chr(34) if "tam" in e else ""}>{t}</label>' for t in TAMS)
    areas = ''.join(f'<option{" selected" if v["area"] == a else ""}{" value=" + chr(34) + chr(34) if i == 0 else ""}>{a}</option>' for i, a in enumerate(AREAS))
    ace_desc = 'aceite-erro' if 'aceite' in e else ''
    if ro:
        botao = f'<button class="btn btn-pri" type="submit" aria-busy="true" aria-disabled="true"><span class="giro" aria-hidden="true"></span>Enviando o pedido…</button><p class="sr" role="status">Enviando o pedido…</p>'
    elif estado == 'falha':
        botao = f'<button class="btn btn-pri" type="submit">{ico("reenviar")}Tentar de novo</button>'
    else:
        botao = f'<button class="btn btn-pri" type="submit">Pedir demonstração{ico("seta")}</button>'
    return f'''<h2 id="t-form">Pedir uma demonstração</h2><p class="sub">Leva um minuto. Os campos sem “(opcional)” são obrigatórios.</p>{topo}
<form class="form-d" action="#" method="post" novalidate aria-labelledby="t-form">
  {campo_d("nome", "Seu nome", v["nome"], auto="name", erro_txt=e.get("nome", ""), ro=ro)}
  {campo_d("escritorio", "Nome do escritório", v["esc"], auto="organization", erro_txt=e.get("esc", ""), ro=ro)}
  {campo_d("email", "E-mail", v["email"], tipo="email", auto="email", erro_txt=e.get("email", ""), ro=ro, modo="email")}
  {campo_d("whats", "WhatsApp", v["whats"], tipo="tel", auto="tel-national", erro_txt=e.get("whats", ""), ajuda="Com DDD. Só usamos para falar sobre a demonstração.", ro=ro, modo="tel")}
  <fieldset class="campo inteiro"><legend>Quantas pessoas trabalham no escritório?</legend><div class="tamanhos{" erro" if "tam" in e else ""}">{tams}</div>{erro("tam", e["tam"]) if "tam" in e else ""}</fieldset>
  <div class="campo inteiro"><label for="area">Área principal de atuação <span class="opc">(opcional)</span></label><select class="entrada" id="area" name="area"{" disabled" if ro else ""}>{areas}</select></div>
  <div class="campo inteiro"><label for="msg">Como vocês se organizam hoje? <span class="opc">(opcional)</span></label><textarea class="entrada" id="msg" name="msg" rows="3" aria-describedby="msg-ajuda"{" readonly" if ro else ""}>{H(v["msg"])}</textarea><p class="ajuda" id="msg-ajuda">Planilha, outro sistema, caderno: o que ajudar a preparar a conversa. Não escreva dados de clientes.</p></div>
  <div class="isca" aria-hidden="true"><label for="site-x">Deixe este campo em branco</label><input id="site-x" name="site" type="text" tabindex="-1" autocomplete="off"></div>
  <div class="aceite{" erro" if "aceite" in e else ""}"><input type="checkbox" id="aceite" name="aceite" required aria-required="true"{" checked" if v["aceite"] else ""}{" disabled" if ro else ""}{" aria-invalid=" + chr(34) + "true" + chr(34) + " aria-describedby=" + chr(34) + ace_desc + chr(34) if ace_desc else ""}>
    <label for="aceite">Autorizo o T3jus a usar estes dados para responder ao meu pedido de demonstração, como diz a <a href="privacidade.html">Política de privacidade</a>.</label>{erro("aceite", e["aceite"]) if "aceite" in e else ""}</div>
  <div class="form-pe">{botao}<small>Não mandamos propaganda. Você pode pedir para apagar seus dados a qualquer momento.</small></div>
</form>'''


SUCESSO = f'''<div class="sucesso" role="status" tabindex="-1"><span class="disco">{ico("check")}</span><h2 id="t-form">Pedido recebido, Lívia.</h2>
<p>A nossa equipe responde em até 1 dia útil, pelo e-mail ou pelo WhatsApp que você deixou, para marcar um horário. Mandamos uma cópia do pedido para o seu e-mail.</p>
<dl class="resumo"><div><dt>Escritório</dt><dd>Jatobá Advocacia Previdenciária</dd></div><div><dt>E-mail</dt><dd>livia@jatoba.adv.br</dd></div><div><dt>WhatsApp</dt><dd>(86) 99812-4410</dd></div><div><dt>Equipe</dt><dd>6 a 10 pessoas</dd></div></dl>
<p>Enquanto isso, veja <a href="como-funciona.html">como o T3jus funciona</a>, etapa por etapa.</p></div>'''

ESTADOS = {
    'branco': formulario(VAZIO),
    'erros': formulario(dict(VAL, nome='', email='livia@jatoba', tam='', aceite=False),
                        {'nome': 'Escreva o seu nome.', 'email': 'Confira o e-mail: falta o final, como “.com.br”.', 'tam': 'Escolha o tamanho da equipe.',
                         'aceite': 'Para enviar, marque a autorização. Sem ela, não podemos guardar os seus dados.'}),
    'enviando': formulario(VAL, estado='enviando'),
    'enviado': SUCESSO,
    'falha': formulario(VAL, estado='falha'),
}
TPL = ''.join(f'<template data-est="{k}">{v}</template>' for k, v in ESTADOS.items())

DEM = cab_interna('Demonstração', 'Veja o T3jus com a rotina do <i>seu escritório.</i>',
                  'Conte um pouco sobre o escritório. A nossa equipe responde para marcar uma conversa por vídeo, sem compromisso.', 'Demonstração')
DEM += f'''<main id="conteudo"><div class="miolo dem-grade">
  <section class="form-cartao" aria-labelledby="t-form" id="cartao-form">{ESTADOS["branco"]}</section>
  <aside class="lado-d" aria-label="O que acontece depois">
    <section aria-labelledby="t-depois"><h2 id="t-depois">O que acontece depois</h2><ol class="depois-lista">
      <li><span class="disco" aria-hidden="true">1</span><span><b>Respondemos em até 1 dia útil</b><span>Por e-mail ou WhatsApp, para marcar o horário.</span></span></li>
      <li><span class="disco" aria-hidden="true">2</span><span><b>Uma conversa por vídeo</b><span>Mostramos o T3jus com um exemplo parecido com o seu escritório.</span></span></li>
      <li><span class="disco" aria-hidden="true">3</span><span><b>Valor combinado antes</b><span>Você decide depois de ver, sem compromisso.</span></span></li>
    </ol></section>
    <section class="caixa-d" aria-labelledby="t-dados-d"><h3 id="t-dados-d">Seus dados</h3><p>Usamos o que você escreveu só para responder a este pedido. Se não virar cliente, apagamos depois de 12 meses sem contato, ou antes, se você pedir.</p></section>
    <section class="caixa-d" aria-labelledby="t-email-d"><h3 id="t-email-d">Prefere escrever?</h3><p>Mande um e-mail com o nome do escritório e o melhor horário.</p><a class="btn btn-sec" href="mailto:contato@t3jus.pro">{ico("envelope")}contato@t3jus.pro</a></section>
  </aside>
</div></main>{TPL}'''
JS_DEM = '''<script>(function(){var e=new URLSearchParams(location.search).get("estado");if(!e||e==="branco")return;var t=document.querySelector('template[data-est="'+e+'"]');if(!t)return;var c=document.getElementById("cartao-form");c.innerHTML=t.innerHTML;
if(e==="enviado"){var s=c.querySelector(".sucesso");s&&s.focus()}else if(e==="erros"){var r=document.getElementById("resumo-erros");r&&r.focus()}else if(e==="falha"){var a=c.querySelector(".aviso");a&&a.focus()}})();</script>'''
open(os.path.join(SAIDA, 'demonstracao.html'), 'w', encoding='utf-8').write(pagina(
    'demonstracao.html', 'Pedir demonstração · T3jus',
    'Peça uma demonstração do T3jus: uma conversa por vídeo para ver o sistema com a rotina do seu escritório de advocacia e combinar o valor, sem compromisso.',
    '/demonstracao', DEM, 'demonstracao.html', js=JS_DEM))
print('site ok')
