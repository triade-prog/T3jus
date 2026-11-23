// Capturas em PNG (computador 1440 e celular 412, deviceScaleFactor 2) + axe (WCAG 2.0, 2.1 e 2.2, A e AA,
// com o contraste de cor) + conferência de rolagem lateral, alvos menores que 44 px e erros de script.
// Parte do fotos.cjs aprovado do Financeiro. Diferença: com janela aberta, a captura cresce até mostrar a janela
// inteira (sem a rolagem interna), para a Carol ver todos os campos.
// Uso: node fotos.cjs <pasta-saida> [filtro]. O axe vem de @axe-core/playwright; aponte AXE_PW se não estiver no caminho do node.
const { chromium } = require('playwright');
const { AxeBuilder } = require(process.env.AXE_PW || '@axe-core/playwright');
const path = require('path');
const fs = require('fs');
const dir = path.resolve(process.argv[2] || '..');
const filtro = process.argv[3] || '';
const casos = JSON.parse(fs.readFileSync(path.join(__dirname, 'casos.json'), 'utf8'));

(async () => {
  const browser = await chromium.launch();
  const res = [];
  for (const c of casos) {
    if (filtro && !c.nome.includes(filtro)) continue;
    for (const tam of ['computador', 'celular']) {
      const vp = tam === 'computador' ? { width: 1440, height: 900 } : { width: 412, height: 915 };
      const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, reducedMotion: 'reduce', locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
      const page = await ctx.newPage();
      const erros = [];
      page.on('pageerror', e => erros.push(String(e)));
      const [arq, qs] = c.url.split('?');
      await page.goto('file://' + path.join(dir, arq) + (qs ? '?' + qs : ''));
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      const temJanela = await page.evaluate(() => !!document.querySelector('dialog[open]'));
      const rolagem = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const rolagemJanela = await page.evaluate(() => { const d = document.querySelector('dialog[open]'); if (!d) return 0; return Math.max(0, ...[...d.querySelectorAll('*')].map(e => e.scrollWidth - e.clientWidth).filter(x => x > 1 && x < 2000)) });
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
      let viol = [];
      try {
        const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        viol = r.violations.map(v => `${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 3).map(n => n.target.join(' ') + ' ' + (n.any[0] && n.any[0].message || '')).join(' | ')}`);
      } catch (e) { viol = ['axe falhou: ' + e.message]; }
      const png = path.join(dir, `${c.nome}-${tam}.png`);
      if (!temJanela) {
        // A barra de baixo do celular é fixa: a janela da captura tem a altura da página, para ela aparecer no fim.
        const h = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.setViewportSize({ width: vp.width, height: h });
        await page.waitForTimeout(150);
        await page.screenshot({ path: png });
      } else {
        // A janela tem rolagem própria: a captura cresce até caber a janela inteira.
        const extra = await page.evaluate(() => { const d = document.querySelector('dialog[open]'); const c = d.querySelector('.janela-corpo') || d; return c.scrollHeight - c.clientHeight + (d.scrollHeight - d.clientHeight); });
        if (extra > 0) { await page.setViewportSize({ width: vp.width, height: Math.min(vp.height + extra + 8, 4000) }); await page.waitForTimeout(150); }
        await page.screenshot({ path: png });
      }
      res.push({ nome: c.nome, tam, rolagem, rolagemJanela, viol, erros, pequenos });
      console.log(`${c.nome} ${tam} rolagem=${rolagem}/${rolagemJanela} axe=${viol.length} pequenos=${pequenos.length}${viol.length ? '\n   ' + viol.join('\n   ') : ''}${pequenos.length ? '\n   alvos: ' + pequenos.join(' ; ') : ''}${erros.length ? '\n   JS: ' + erros.join(' ') : ''}`);
      await ctx.close();
    }
  }
  if (!filtro) fs.writeFileSync(path.join(dir, '_conferencia.json'), JSON.stringify(res, null, 1));
  await browser.close();
})();
