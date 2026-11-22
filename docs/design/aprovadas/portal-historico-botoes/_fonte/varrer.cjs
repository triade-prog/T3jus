const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1440, height: 700 } });
  for (const v of ['antes','depois']) for (const c of ['propostas','contratos','elaboracao']) for (const w of [712, 879, 880, 968, 1088]) {
    await pg.goto('file://' + process.cwd() + '/abas-tabelas.html?estado=' + v + '-' + c + '&w=' + w);
    await pg.evaluate(() => document.fonts.ready);
    const r = await pg.evaluate(() => { const tb=document.querySelector('#principal table'); const f=document.querySelector('#principal .folha'); return [tb&&tb.offsetParent?'tabela '+Math.round(tb.getBoundingClientRect().width)+' / folha '+Math.round(f.getBoundingClientRect().width):'cartoes', ...[...document.querySelectorAll('#principal td')].filter(td=>td.offsetParent).flatMap((td) => { const t = td.getBoundingClientRect(); return [...td.querySelectorAll('*')].filter((el) => el.getBoundingClientRect().right > t.right + 0.5).map((el) => (el.className.baseVal ?? el.className) + ':' + Math.round(el.getBoundingClientRect().right - t.right)); })]; });
    console.log(v, c, w, JSON.stringify(r));
  }
  await b.close();
})();
