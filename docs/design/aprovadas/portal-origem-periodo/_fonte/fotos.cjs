// Capturas: node _fonte/fotos.cjs <pasta>. Telas de 1600 (a largura do print da Carol), 1440 e 1024
// com o menu, e celular 390; deviceScaleFactor 2. Grava <antes|depois>-<origem|funil>-<tela>.png.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const dir = path.resolve(process.argv[2] || '.');
  const url = 'file://' + dir + '/origem-periodo.html';
  const b = await chromium.launch();
  for (const [tela, w, h] of [['1600', 1600, 900], ['1440', 1440, 900], ['1024', 1024, 900], ['celular', 390, 844]]) {
    const pg = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    for (const v of ['antes', 'depois']) for (const t of ['origem', 'funil']) {
      await pg.goto(url + '?estado=' + v + '-' + t);
      await pg.evaluate(() => document.fonts.ready);
      const sel = tela === 'celular' ? '#conteudo .folha' : (t === 'origem' ? '#conteudo .hn-grade' : '#conteudo .folha');
      const caixa = await (await pg.$(sel)).boundingBox();
      const alto = Math.min(caixa.height, tela === 'celular' ? 760 : 760);
      await pg.screenshot({ path: `${dir}/${v}-${t}-${tela}.png`, fullPage: true,
        clip: { x: Math.max(0, caixa.x - 16), y: caixa.y - 16, width: Math.min(caixa.width + 32, w - Math.max(0, caixa.x - 16)), height: alto + 32 } });
    }
    await pg.close();
  }
  await b.close();
})();
