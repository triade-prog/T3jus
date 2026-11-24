// A miniatura da primeira folha do carnê na janela "Gerar carnê" (no código, FolhasCarne reduzida).
// Tirada da página aprovada carne-recibo-razao-social/carne-a4.html, no estado de cada escritório.
// Uso: node miniaturas.cjs <pasta-saida>
const { chromium } = require('playwright');
const path = require('path');
const APROV = process.env.APROV || '/home/user/t3jus/docs/design/aprovadas/';
const dir = path.resolve(process.argv[2] || '..');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1000, height: 1200 }, deviceScaleFactor: 0.66 });
  for (const est of ['razao-vazia', 'sem-sociedade', 'completa']) {
    await p.goto('file://' + APROV + 'carne-recibo-razao-social/carne-a4.html?estado=' + est);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(200);
    await p.locator('.cn-folha').first().screenshot({ path: path.join(dir, `mini-carne-${est}.png`) });
  }
  await b.close();
  console.log('miniaturas ok');
})();
