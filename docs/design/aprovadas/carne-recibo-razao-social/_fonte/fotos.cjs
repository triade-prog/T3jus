// Timbrado no carnê e no recibo (F3.133): os PDFs de exemplo, as capturas (computador 1440 e celular 412)
// e as conferências: axe (WCAG 2.0, 2.1 e 2.2, A e AA), rolagem lateral, alvos menores que 44 px e erros de script.
// Cópia do fotos.cjs do carnê aprovado; mudam só os PDFs (no lugar das miniaturas) e a largura do celular (412).
// Uso: node fotos.cjs <pasta-saida> [--pdf | --capturas | filtro]   (AXE_DIR = pasta com node_modules/@axe-core/playwright)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const AXE_DIR = process.env.AXE_DIR || path.join(__dirname, 'node_modules');
const { AxeBuilder } = require(path.join(AXE_DIR, '@axe-core/playwright'));
const dir = path.resolve(process.argv[2] || '..');
const modo = process.argv[3] || '';
const filtro = modo.startsWith('--') ? '' : modo;
const casos = JSON.parse(fs.readFileSync(path.join(__dirname, 'casos.json'), 'utf8'));
const ESCALA = Number(process.env.ESCALA || 2);

(async () => {
  const browser = await chromium.launch();

  // 1. Os PDFs reais de exemplo (sociedade completa), pela impressão do Chromium
  if (!filtro && modo !== '--capturas') {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 1200 } });
    const page = await ctx.newPage();
    for (const [arq, nome] of [['carne-a4.html', 'carne-exemplo.pdf'], ['recibo-a4.html', 'recibo-exemplo.pdf']]) {
      await page.goto('file://' + path.join(dir, arq) + '?estado=completa');
      await page.evaluate(() => document.fonts.ready);
      await page.pdf({ path: path.join(dir, nome), format: 'A4', printBackground: true, preferCSSPageSize: true });
    }
    await ctx.close();
    console.log('PDFs ok');
  }
  if (modo === '--pdf') { await browser.close(); return; }

  const res = [];
  for (const c of casos) {
    if (filtro && !c.nome.includes(filtro)) continue;
    for (const tam of ['computador', 'celular']) {
      const vp = tam === 'computador' ? { width: 1440, height: 900 } : { width: 412, height: 915 };
      const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: ESCALA, reducedMotion: 'reduce', locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
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
        const sel = 'a[href],button,input,select,textarea,summary,[role=button]';
        const raiz = document.querySelector('dialog[open]') || document;
        return [...raiz.querySelectorAll(sel)].filter(e => {
          const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false;
          const st = getComputedStyle(e); if (st.visibility === 'hidden') return false;
          if (e.matches('input[type=checkbox],input[type=radio]')) return false; // o rótulo inteiro é o alvo
          if (e.closest('.trilha') || e.closest('p') && e.tagName === 'A') return false; // link dentro de texto (exceção da WCAG 2.5.8)
          if (e.matches('.cartao a.c-nome')) return false;
          return r.height < 24 || r.width < 24 || (r.height < 44 && !e.classList.contains('btn-compacto'));
        }).map(e => (e.className.baseVal !== undefined ? e.tagName : (e.className || e.tagName)) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height) + ' "' + (e.textContent || '').trim().slice(0, 30) + '"');
      });
      const png = path.join(dir, `${c.nome}-${tam}.png`);
      if (tam === 'celular' && !temJanela) {
        const h = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.setViewportSize({ width: vp.width, height: Math.min(h, 12000) });
        await page.waitForTimeout(150);
        await page.screenshot({ path: png });
        await page.setViewportSize(vp);
      } else {
        await page.screenshot({ path: png, fullPage: !temJanela });
      }
      let viol = [];
      try {
        const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
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
