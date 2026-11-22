// Capturas: node _fonte/fotos.cjs <pasta>. Computador 1440 e celular 390, deviceScaleFactor 2.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const dir = path.resolve(process.argv[2] || '.');
  const url = 'file://' + dir + '/historico-botoes.html';
  const b = await chromium.launch();
  const medidas = {};
  for (const [tela, w, h] of [['computador', 1440, 600], ['celular', 390, 760]]) {
    const pg = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    for (const v of ['antes', 'depois']) for (const c of ['dois', 'um', 'longo']) {
      await pg.goto(url + '?estado=' + v + '-' + c);
      await pg.evaluate(() => document.fonts.ready);
      const m = await pg.evaluate(() => {
        const s = document.querySelector('#principal .folha');
        const r = (el) => { const x = el.getBoundingClientRect(); return [Math.round(x.left), Math.round(x.top), Math.round(x.width), Math.round(x.height)]; };
        return { folha: r(s), titulo: r(s.querySelector('h2')), botoes: [...s.querySelectorAll('.acoes .btn')].map(r) };
      });
      medidas[`${v}-${c}-${tela}`] = m;
      const alvo = tela === 'computador' ? await pg.$('.cl-grade') : await pg.$('#principal .folha');
      const caixa = await alvo.boundingBox();
      await pg.screenshot({ path: `${dir}/${v}-${c}-${tela}.png`, clip: { x: caixa.x - 16, y: caixa.y - 44, width: caixa.width + 32, height: Math.min(caixa.height, tela === 'computador' ? 470 : 640) + 60 } });
    }
    await pg.close();
  }
  console.log(JSON.stringify(medidas, null, 1));
  await b.close();
})();
