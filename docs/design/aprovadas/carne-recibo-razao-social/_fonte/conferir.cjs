// Confere que nada passa da faixa do carnê (via, canhoto e cada coluna da capa) nem da folha do recibo,
// e mede a folga que sobra, em mm. Uso: node conferir.cjs <pasta-saida>
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const dir = path.resolve(process.argv[2] || '..');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 1000 } });
  const out = [];
  const testes = JSON.parse(fs.readFileSync(path.join(__dirname, '_testes.json'), 'utf8'));
  for (const [arq, ests] of [[path.join('_fonte', '_teste-carne.html'), testes], ['carne-a4.html', ['completa', 'uma', 'sem-sociedade', 'logo', 'razao-vazia', 'sem-advocacia', 'razao-longa', 'razao-longa-logo']], ['recibo-a4.html', ['completa', 'sem-sociedade', 'logo', 'razao-vazia', 'sem-advocacia', 'razao-longa', 'razao-longa-logo']]]) {
    for (const e of ests) {
      await p.goto('file://' + path.join(dir, arq) + '?estado=' + e);
      await p.evaluate(() => document.fonts.ready);
      const r = await p.evaluate(() => {
        const mm = v => Math.round(v / 3.7795 * 10) / 10;
        const caixas = [...document.querySelectorAll('.cn-via,.cn-canhoto,.cn-capa .cn-col,.rb-folha')];
        const res = [];
        for (const c of caixas) {
          const h0 = c.getBoundingClientRect().height;
          // quanto passa do fundo útil da faixa (a faixa tem altura fixa; se o conteúdo cresce, a linha da grade cresce junto)
          const fx = c.closest('.cn-faixa');
          let passa = 0;
          if (fx) {
            const fs_ = getComputedStyle(fx), fr = fx.getBoundingClientRect();
            const fundo = fr.top + parseFloat(fs_.height) - parseFloat(fs_.paddingBottom) - parseFloat(fs_.borderBottomWidth);
            const altFixa = parseFloat(fs_.height);
            passa = c.getBoundingClientRect().bottom - (fr.top + altFixa - parseFloat(fs_.paddingBottom) - parseFloat(fs_.borderBottomWidth));
          }
          const st = c.getAttribute('style');
          c.style.height = 'auto'; c.style.alignSelf = 'start'; c.style.flex = 'none'; c.style.overflow = 'visible';
          const nat = c.getBoundingClientRect().height;
          if (st === null) c.removeAttribute('style'); else c.setAttribute('style', st);
          res.push({ c: c.className, folga: passa > 0.5 ? -mm(passa) : mm(h0 - nat) });
        }
        return res;
      });
      const pior = {};
      for (const x of r) { const k = x.c; if (!(k in pior) || x.folga < pior[k].folga) pior[k] = x; }
      if (arq.includes('_teste') && Object.values(pior).every(x => x.folga >= 1)) { out.push({ arq, e, pior: Object.values(pior) }); continue; }
      const linha = `${arq} ${e}: ` + Object.values(pior).map(x => `${x.c.split(' ')[0]} folga ${x.folga} mm${x.folga < 0 ? ' PASSA' : ''}`).join(' | ');
      console.log(linha); out.push({ arq, e, pior: Object.values(pior) });
    }
  }
  const ruins = out.filter(x => x.pior.some(y => y.folga < 1));
  console.log(`${out.length} casos conferidos; ${ruins.length} com menos de 1 mm de folga`);
  fs.writeFileSync(path.join(__dirname, '_faixas.json'), JSON.stringify(out, null, 1));
  await b.close();
})();
