// Confere, em várias larguras, que nada sai da folha, que a página não rola de lado, que os três
// botões do período ficam numa linha só e que cada um tem 44 px ou mais de altura.
// Uso: node _fonte/varrer.cjs <pasta>
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const dir = path.resolve(process.argv[2] || '.');
  const b = await chromium.launch(); let falhas = 0;
  for (const w of [1600, 1440, 1280, 1024, 900, 760, 390]) {
    const pg = await b.newPage({ viewport: { width: w, height: 900 } });
    for (const v of ['antes', 'depois']) for (const t of ['origem', 'funil']) {
      await pg.goto('file://' + dir + '/origem-periodo.html?estado=' + v + '-' + t);
      await pg.evaluate(() => document.fonts.ready);
      const r = await pg.evaluate(() => {
        const f = document.querySelector('#conteudo .folha'); const fr = f.getBoundingClientRect();
        const escondido = (el) => { for (let x = el; x && x !== f; x = x.parentElement) { const s = getComputedStyle(x); if (s.position === 'absolute' && s.clip !== 'auto') return true; if (s.display === 'none') return true; } return false; };
        const fora = [...f.querySelectorAll('*')].filter((el) => { const q = el.getBoundingClientRect(); return q.width && !escondido(el) && (q.right > fr.right + 0.5 || q.left < fr.left - 0.5); })
          .map((el) => el.tagName.toLowerCase() + ':' + Math.round(el.getBoundingClientRect().right - fr.right));
        const bt = [...f.querySelectorAll('.chips button')].map((x) => x.getBoundingClientRect());
        const t = f.querySelector('table'); const modo = t ? (getComputedStyle(t).display === 'table' ? 'tabela' : 'cartões') : '-';
        const tit = f.querySelector('h2').getBoundingClientRect();
        const lugar = bt[0].top < tit.bottom ? 'ao lado do título' : 'embaixo do subtítulo';
        return { folha: Math.round(fr.width), fora, linhas: new Set(bt.map((x) => Math.round(x.top))).size, menor: Math.min(...bt.map((x) => x.height)), rola: document.documentElement.scrollWidth > innerWidth, modo, lugar };
      });
      const ok = !r.fora.length && !r.rola && (v === 'antes' || (r.linhas === 1 && r.menor >= 44));
      if (!ok && v === 'depois') falhas++;
      console.log(ok ? 'ok   ' : 'FALHA', w, v, t, `folha ${r.folha}`, `período: ${r.linhas} linha(s), ${r.lugar}, altura ${Math.round(r.menor)}`, `tabela: ${r.modo}`, r.fora.length ? 'fora: ' + r.fora.slice(0, 4).join(' ') : '', r.rola ? 'ROLA DE LADO' : '');
    }
    await pg.close();
  }
  await b.close();
  console.log(falhas ? `${falhas} falha(s) no depois` : 'depois: nada sai da folha em nenhuma largura');
  process.exit(falhas ? 1 : 0);
})();
