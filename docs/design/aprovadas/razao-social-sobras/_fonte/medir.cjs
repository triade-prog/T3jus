// Mede o cabeçalho do .docx em cada estado e em 4 combinações: hoje (cabeçalho a 12,5 mm, logo de 18 mm),
// só o cabeçalho a 10 mm, só o logo de 12 mm e as duas propostas juntas. Grava _fonte/_medidas.json.
// Uso: node medir.cjs <pasta-saida>
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const dir = path.resolve(process.argv[2] || '..');
const estados = ['hoje', 'sem-logo', 'logo', 'logo-nome', 'sem-sociedade', 'razao-vazia-logo', 'razao-longa', 'razao-longa-logo', 'endereco-antigo'];
const combos = [['12.5', '18'], ['10', '18'], ['12.5', '12'], ['10', '12']];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const res = [];
  for (const e of estados) for (const [cab, logo] of combos) {
    if (e === 'hoje' && cab !== '12.5') continue;
    await p.goto('file://' + path.join(dir, 'docx.html') + `?estado=${e}&cab=${cab}&logo=${logo}`);
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(250);
    await p.evaluate(() => new Promise(r => setTimeout(r, 50)));
    const m = await p.evaluate(() => window.__medida);
    res.push(m); console.log(e, cab, logo, m.altura, m.corpo, m.perde);
  }
  fs.writeFileSync(path.join(__dirname, '_medidas.json'), JSON.stringify(res, null, 1));
  await b.close();
})();
