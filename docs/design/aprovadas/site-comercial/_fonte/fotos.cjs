// Capturas (computador 1440 e celular 390) + axe (WCAG 2.0, 2.1, 2.2, A e AA) + rolagem lateral, alvos pequenos e erros de script.
// Uso: node fotos.cjs <pasta-saida> [filtro]
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const AXE = process.env.AXE || '/tmp/claude-0/axe/node_modules/axe-core/axe.min.js';
const dir = path.resolve(process.argv[2] || '..');
const filtro = process.argv[3] || '';
const casos = JSON.parse(fs.readFileSync(path.join(__dirname, 'casos.json'), 'utf8'));
const axeSrc = fs.readFileSync(AXE, 'utf8');
(async () => {
  const browser = await chromium.launch();
  const res = [];
  for (const c of casos) {
    if (filtro && !c.nome.includes(filtro)) continue;
    for (const tam of ['computador', 'celular']) {
      const site = c.grupo !== 'console';
      const vp = tam === 'computador' ? { width: 1440, height: 900 } : { width: 390, height: 844 };
      const dsf = tam === 'computador' ? 1 : (site ? 1.5 : 2);
      const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: dsf, reducedMotion: 'reduce', locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
      const page = await ctx.newPage();
      const erros = [];
      page.on('pageerror', e => erros.push(String(e)));
      const [arq, qs] = c.url.split('?');
      await page.goto('file://' + path.join(dir, arq) + (qs ? '?' + qs : ''));
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      const temJanela = await page.evaluate(() => !!document.querySelector('dialog[open]'));
      const rolagem = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const pequenos = await page.evaluate(() => {
        const raiz = document.querySelector('dialog[open]') || document;
        return [...raiz.querySelectorAll('a[href],button,input,select,textarea,summary')].filter(e => {
          const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false;
          if (e.matches('input[type=checkbox],input[type=radio]')) return false;
          if (e.closest('.trilha,.trilha-int,.isca') || (e.tagName === 'A' && e.closest('p,dd,label,small,.cb-esc,.sucesso'))) return false;
          if (e.matches('.cb-cartao a.cb-c-nome,.pular')) return false;
          return r.height < 24 || r.width < 24 || (r.height < 40 && !e.classList.contains('btn-compacto'));
        }).map(e => e.tagName + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height) + ' "' + (e.textContent || '').trim().slice(0, 30) + '"');
      });
      const png = path.join(dir, `${c.nome}-${tam}.png`);
      await page.screenshot({ path: png, fullPage: !temJanela });
      let viol = [];
      try {
        await page.addScriptTag({ content: axeSrc });
        const r = await page.evaluate(async () => await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
        viol = r.violations.map(v => `${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')}`);
      } catch (e) { viol = ['axe falhou: ' + e.message]; }
      res.push({ nome: c.nome, tam, rolagem, viol, erros, pequenos });
      console.log(`${c.nome} ${tam} rolagem=${rolagem} axe=${viol.length} pequenos=${pequenos.length}${viol.length ? '\n   ' + viol.join('\n   ') : ''}${pequenos.length ? '\n   alvos: ' + pequenos.join(' ; ') : ''}${erros.length ? '\n   JS: ' + erros.join(' ') : ''}`);
      await ctx.close();
    }
  }
  if (!filtro) fs.writeFileSync(path.join(dir, '_conferencia.json'), JSON.stringify(res, null, 1));
  await browser.close();
})();
