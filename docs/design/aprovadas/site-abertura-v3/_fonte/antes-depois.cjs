// Monta o antes x depois da abertura (site no ar, v2 recusada, v3) em três colunas, com as fontes do site.
// Uso: node antes-depois.cjs <pasta-da-entrega> <pasta-png>
const { chromium } = require(process.env.PW_MOD || '/home/claude/t3jus/sistema/node_modules/.pnpm/playwright@1.64.1/node_modules/playwright');
const path = require('path'), fs = require('fs');
const EXE = process.env.PW_CHROMIUM_PATH || '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const dir = path.resolve(process.argv[2]), png = path.resolve(process.argv[3]);
const f = (n) => 'file://' + path.join(dir, 'fontes', n);
const img = (n) => 'file://' + path.join(png, 'antes-depois', n);
const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:A;src:url(${f('alegreya-500.woff2')})}@font-face{font-family:P;src:url(${f('poppins-400.woff2')})}@font-face{font-family:P;font-weight:600;src:url(${f('poppins-600.woff2')})}
body{margin:0;background:#F1E6DF;font-family:P;color:#2A1A22}
.g{display:grid;grid-template-columns:repeat(3,960px);gap:40px;padding:48px}
h2{font:500 40px/1.1 A;color:#4F1D35;margin:0 0 6px}p{margin:0 0 20px;font-size:20px;color:#6E5562}
img{width:960px;height:600px;display:block;border-radius:14px;box-shadow:0 20px 50px -24px rgba(42,26,34,.5)}
b{display:inline-block;font-size:15px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#87335B;margin-bottom:10px}
</style><div class="g">
<div><b>Antes</b><h2>Site no ar</h2><p>Cartão desenhado, sem tela real</p><img src="${img('atual.png')}"></div>
<div><b>Tentativa recusada</b><h2>v2</h2><p>Telas reais, mas pequenas e em mosaico</p><img src="${img('v2.png')}"></div>
<div><b>Proposta</b><h2>v3</h2><p>Uma tela real, grande e legível</p><img src="${img('v3.png')}"></div></div>`;
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const p = await b.newPage({ viewport: { width: 3048, height: 900 } });
  const arq = path.join(png, 'antes-depois.html');
  fs.writeFileSync(arq, html);
  await p.goto('file://' + arq, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  const s = path.join(png, 'antes-depois.png');
  await (await p.$('.g')).screenshot({ path: s });
  await b.close();
  console.log('antes-depois ok');
})();
