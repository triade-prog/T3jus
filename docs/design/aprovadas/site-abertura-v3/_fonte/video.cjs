// Grava a rolagem da página em 1440 x 900 (Playwright recordVideo), para ver o movimento sem rolar.
// Uso: node video.cjs <pasta-da-entrega> <pasta-temporaria>   ->  <pasta-temporaria>/rolagem-bruta.webm
const { chromium } = require(process.env.PW_MOD || '/home/claude/t3jus/sistema/node_modules/.pnpm/playwright@1.64.1/node_modules/playwright');
const EXE = process.env.PW_CHROMIUM_PATH || '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const path = require('path'), fs = require('fs');
const dir = path.resolve(process.argv[2] || '..'), tmp = path.resolve(process.argv[3] || '/tmp/t3jus-video');
fs.mkdirSync(tmp, { recursive: true });
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: tmp, size: { width: 1440, height: 900 } } });
  const p = await ctx.newPage();
  await p.goto('file://' + path.join(dir, 'inicio.html'));
  await p.evaluate(async () => { document.querySelectorAll('img[loading=lazy]').forEach((i) => (i.loading = 'eager')); await Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))); });
  await p.waitForTimeout(3600);
  // rola até um ponto, numa velocidade (px/s), quadro a quadro
  const ate = (alvo, vel) => p.evaluate(([alvo, vel]) => new Promise((ok) => {
    let t0 = null; const y0 = window.scrollY, dist = alvo - y0, dur = Math.abs(dist) / vel * 1000;
    (function q(t) { if (t0 === null) t0 = t; const k = Math.min(1, (t - t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      window.scrollTo({ top: y0 + dist * e, behavior: 'instant' }); if (k < 1) requestAnimationFrame(q); else ok(); })(performance.now());
  }), [alvo, vel]);
  const topo = (sel, d) => p.evaluate(([s, d]) => Math.round(document.querySelector(s).getBoundingClientRect().top + window.scrollY + d), [sel, d]);
  await ate(620, 420); await p.waitForTimeout(900);
  for (const s of ['.d-ambar', '.d-vinho', '.d-papel']) { await ate(await topo(s, -110), 650); await p.waitForTimeout(900); }
  await ate(await topo('.retrato', -200), 600); await p.waitForTimeout(900);
  const ini = await topo('#trilho', -92), resto = await p.evaluate(() => document.querySelector('.trilho-resto').offsetHeight);
  await ate(ini, 650); await p.waitForTimeout(900);
  for (let i = 1; i <= 4; i++) { await ate(Math.round(ini + resto * Math.min(1, i / 4 + 0.05)), 420); await p.waitForTimeout(800); }
  await ate(await topo('.pronto', -200), 650); await p.waitForTimeout(900);
  await ate(await topo('.dados', -60), 650); await p.waitForTimeout(800);
  await ate(await topo('.bloco', -110), 600); await p.waitForTimeout(3200);
  const v = p.video(); await p.close();
  await v.saveAs(path.join(tmp, 'rolagem-bruta.webm')); await ctx.close(); await b.close();
  console.log('video', path.join(tmp, 'rolagem-bruta.webm'), fs.statSync(path.join(tmp, 'rolagem-bruta.webm')).size);
})();
