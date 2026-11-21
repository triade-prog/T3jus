// Tira um PNG de fundo transparente de cada logo fictício (logos/_logos.html), como o escritório enviaria.
// Uso: node logos.cjs
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1900, height: 900 }, deviceScaleFactor: 1 });
  await p.goto('file://' + path.join(__dirname, 'logos', '_logos.html'));
  await p.evaluate(() => document.fonts.ready);
  for (const id of ['largo', 'quadrado', 'claro']) {
    await p.locator('#' + id).screenshot({ path: path.join(__dirname, 'logos', `logo-${id}.png`), omitBackground: true });
  }
  await b.close();
  console.log('logos ok');
})();
