// Capturas (PNG com deviceScaleFactor 2, depois WebP) + axe (WCAG 2.0, 2.1 e 2.2, A e AA)
// + conferência de rolagem lateral, alvos menores que 44 px e erros de script.
// É o fotos_fc.cjs do fim do contrato; o axe-core entra direto na página (axe.min.js), sem outro Playwright.
// Uso: node fotos_cb.cjs <pasta-saida> [filtro] [--sem-fotos]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const AXE = process.env.AXE || path.join(__dirname, '..', '..', 'axe', 'node_modules', 'axe-core', 'axe.min.js');
const dir = path.resolve(process.argv[2] || '..');
const filtro = (process.argv[3] && !process.argv[3].startsWith('--')) ? process.argv[3] : '';
const semFotos = process.argv.includes('--sem-fotos');
const casos = JSON.parse(fs.readFileSync(path.join(__dirname, 'casos_cb.json'), 'utf8'));
const axeSrc = fs.readFileSync(AXE, 'utf8');

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
      const pequenos = await page.evaluate(() => {
        const sel = 'a[href],button,input,select,textarea,summary,[role=button]';
        const raiz = document.querySelector('dialog[open]') || document;
        return [...raiz.querySelectorAll(sel)].filter(e => {
          const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false;
          const st = getComputedStyle(e); if (st.visibility === 'hidden') return false;
          if (e.matches('input[type=checkbox],input[type=radio]')) return false; // o rótulo inteiro é o alvo
          if (e.closest('.trilha') || e.closest('p') && e.tagName === 'A') return false; // link dentro de texto (exceção da WCAG 2.5.8)
          if (e.matches('.cartao a.c-nome, .cb-cartao a.cb-c-nome')) return false; // o ::after do link cobre o cartão inteiro
          if (e.matches('input.sr')) return false; // campo de arquivo escondido: o alvo é o rótulo "Escolher arquivo"
          if (e.matches('.contato a, .esc a, .cb-esc a')) return false; // links de texto das tabelas (nome), com 24 px ou mais (WCAG 2.5.8)
          return r.height < 24 || r.width < 24 || (r.height < 44 && !e.classList.contains('btn-compacto'));
        }).map(e => (e.className.baseVal !== undefined ? e.tagName : (e.className || e.tagName)) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height) + ' "' + (e.textContent || '').trim().slice(0, 30) + '"');
      });
      const png = path.join(dir, `${c.nome}-${tam}.png`);
      if (!semFotos) {
        if (tam === 'celular' && !temJanela) {
          // A barra de baixo do Portal é fixa: a captura usa uma janela da altura da página, para a barra aparecer no fim, como no aparelho.
          const h = await page.evaluate(() => document.documentElement.scrollHeight);
          await page.setViewportSize({ width: vp.width, height: h });
          await page.waitForTimeout(150);
          await page.screenshot({ path: png });
          await page.setViewportSize(vp);
        } else {
          await page.screenshot({ path: png, fullPage: !temJanela });
        }
      }
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
