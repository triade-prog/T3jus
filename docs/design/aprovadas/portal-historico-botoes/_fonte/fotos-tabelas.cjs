// Capturas das abas: node _fonte/fotos-tabelas.cjs <pasta>. Folha de 1088 (1440), 712 (1024) e celular 390.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const dir = path.resolve(process.argv[2] || '.');
  const url = 'file://' + dir + '/abas-tabelas.html';
  const b = await chromium.launch();
  const med = {};
  for (const [tela, vw, w] of [['computador', 1440, 1088], ['computador-1280', 1280, 968], ['computador-1024', 1024, 712], ['celular', 390, 0]]) {
    const pg = await b.newPage({ viewport: { width: vw, height: 700 }, deviceScaleFactor: 2 });
    for (const v of ['antes', 'depois']) for (const c of ['propostas', 'contratos', 'elaboracao']) {
      await pg.goto(url + '?estado=' + v + '-' + c + (w ? '&w=' + w : ''));
      await pg.evaluate(() => document.fonts.ready);
      med[`${v}-${c}-${tela}`] = await pg.evaluate(() => {
        const f = document.querySelector('#principal .folha').getBoundingClientRect();
        const fora = [...document.querySelectorAll('#principal td *, #principal .cartao *')].filter((el) => el.offsetParent).filter((el) => el.getBoundingClientRect().right > f.right - 1).map((el) => el.className.baseVal ?? el.className ?? el.tagName);
        const td = document.querySelector('#principal td');
        return { folha: Math.round(f.width), foraDaFolha: [...new Set(fora)].slice(0, 6), padTd: td && td.offsetParent ? getComputedStyle(td).paddingLeft : null,
          altCod: [...document.querySelectorAll('.fl-num small,.c-topo small')].filter((x) => x.offsetParent).map((x) => Math.round(x.getBoundingClientRect().height)) };
      });
      const alvo = await pg.$('#principal .folha');
      const cx = await alvo.boundingBox();
      await pg.screenshot({ path: `${dir}/${v}-${c}-${tela}.png`, clip: { x: Math.max(0, cx.x - 16), y: cx.y - 44, width: cx.width + 32, height: cx.height + 60 } });
    }
    await pg.close();
  }
  console.log(JSON.stringify(med));
  await b.close();
})();
