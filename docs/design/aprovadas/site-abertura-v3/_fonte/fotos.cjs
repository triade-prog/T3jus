// Capturas da página (1440 e 390) e conferência: axe-core (WCAG 2.0, 2.1 e 2.2, A e AA) em cada aba,
// com e sem "menos movimento", rolagem lateral, alvos menores que 40 px, erros de script e teclado nas abas.
// Uso: node fotos.cjs <pasta-da-entrega> <pasta-png-temporaria>
const { chromium } = require(process.env.PW_MOD || '/home/claude/t3jus/sistema/node_modules/.pnpm/playwright@1.64.1/node_modules/playwright');
const path = require('path'), fs = require('fs');
const AXE = process.env.AXE || '/home/claude/t3jus/sistema/node_modules/.pnpm/axe-core@4.14.1/node_modules/axe-core/axe.min.js';
const EXE = process.env.PW_CHROMIUM_PATH || '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const dir = path.resolve(process.argv[2] || '..');
const tmp = path.resolve(process.argv[3] || path.join(dir, '_png'));
fs.mkdirSync(tmp, { recursive: true });
const axeSrc = fs.readFileSync(AXE, 'utf8');

async function conferir(page, rotulo, res, tam) {
  const rolagem = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const pequenos = await page.evaluate(() => [...document.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex="0"]')].filter((e) => {
    const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false;
    if (e.matches('[role=tabpanel],.pular')) return false;
    return r.height < 40 || r.width < 40;
  }).map((e) => e.tagName + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height) + ' "' + (e.textContent || '').trim().slice(0, 30) + '"'));
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: axeSrc });
  const r = await page.evaluate(async () => await axe.run(document, { preload: false, runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
  const viol = r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ') + ' ' + (n.failureSummary || '').replace(/\s+/g, ' ').slice(0, 160)).join(' | ')}`);
  res.push({ estado: rotulo, tam, rolagem, viol, pequenos, passaram: r.passes.length, incompletas: r.incomplete.map((v) => v.id) });
  console.log(`${tam} ${rotulo}: rolagem=${rolagem} axe=${viol.length} pequenos=${pequenos.length}${viol.length ? '\n  ' + viol.join('\n  ') : ''}${pequenos.length ? '\n  alvos: ' + pequenos.join(' ; ') : ''}`);
}

async function percorrer(page) {
  await page.evaluate(async () => { document.querySelectorAll('img[loading=lazy]').forEach((i) => (i.loading = 'eager')); await Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))); });
  const h = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 400) { await page.evaluate((y) => window.scrollTo(0, y), y); await page.waitForTimeout(90); }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1200);
}

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const res = [], erros = [], teclado = [];
  for (const tam of ['computador', 'celular']) {
    const vp = tam === 'computador' ? { width: 1440, height: 900 } : { width: 390, height: 844 };
    for (const movimento of ['no-preference', 'reduce']) {
      const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: tam === 'celular', hasTouch: tam === 'celular', reducedMotion: movimento, locale: 'pt-BR' });
      const page = await ctx.newPage();
      page.on('pageerror', (e) => erros.push(`${tam} ${movimento}: ${e}`));
      page.on('console', (m) => { if (m.type() === 'error') erros.push(`${tam} ${movimento} console: ${m.text()}`); });
      await page.goto('file://' + path.join(dir, 'inicio.html'));
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1800);
      await percorrer(page);
      const sufixo = movimento === 'reduce' ? '-menos-movimento' : '';
      await page.screenshot({ path: path.join(tmp, `site-abertura-${tam}${sufixo}.png`) });
      // A página inteira é fotografada parada (menos movimento): com a rolagem guiada, o que está fora da tela ainda não entrou.
      if (movimento === 'reduce') await page.screenshot({ path: path.join(tmp, `site-inicio-${tam}.png`), fullPage: true });
      if (movimento === 'no-preference') {
        // um pouco rolada: a tela da abertura já assentada
        await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' })); await page.waitForTimeout(700);
        await page.screenshot({ path: path.join(tmp, `site-abertura-rolada-${tam}.png`) });
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await page.waitForTimeout(400);
      }
      await conferir(page, `página inicial, aba Comercial (${movimento === 'reduce' ? 'menos movimento' : 'com movimento'})`, res, tam);
      if (movimento === 'no-preference') {
        // estados no meio da rolagem: destaque com o realce desenhado, retrato e (no computador) as abas guiadas pela rolagem
        const ir = async (sel, desloc) => { await page.evaluate(([s, d]) => window.scrollTo({ top: document.querySelector(s).getBoundingClientRect().top + window.scrollY + d, behavior: 'instant' }), [sel, desloc]); await page.waitForTimeout(900); };
        await ir('.d-vinho', -130);
        await conferir(page, 'rolagem: destaque Repasses com o realce', res, tam);
        await page.screenshot({ path: path.join(tmp, `site-rolagem-destaque-${tam}.png`) });
        await ir('.retrato', -260);
        await conferir(page, 'rolagem: retrato', res, tam);
        if (tam === 'computador') {
          const ini = await page.evaluate(() => document.getElementById('trilho').getBoundingClientRect().top + window.scrollY - 92);
          const resto = await page.evaluate(() => document.querySelector('.trilho-resto').offsetHeight);
          await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), Math.round(ini + resto * 0.6)); await page.waitForTimeout(900);
          const sel = await page.evaluate(() => document.querySelector('[role=tab][aria-selected=true]').id);
          await conferir(page, `rolagem: abas guiadas, 60% do trecho (${sel})`, res, tam);
          await page.screenshot({ path: path.join(tmp, `site-rolagem-abas-${tam}.png`) });
          await page.click('#a-contratos'); await page.waitForTimeout(1600);
          const depois = await page.evaluate(() => { const ini = document.getElementById('trilho').getBoundingClientRect().top + window.scrollY - 92, r = document.querySelector('.trilho-resto').offsetHeight; return document.querySelector('[role=tab][aria-selected=true]').id + ' trecho=' + ((window.scrollY - ini) / r).toFixed(2) + ' ' + location.hash; });
          teclado.push(`${tam} com movimento: rolagem até 60% do trecho -> ${sel}; clique em Contratos -> ${depois}`);
          await ir('.pronto', -300);
          await conferir(page, 'rolagem: o que existe', res, tam);
          await ir('.bloco', -120);
          await conferir(page, 'rolagem: chamada final', res, tam);
          await page.screenshot({ path: path.join(tmp, `site-rolagem-chamada-${tam}.png`) });
        }
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await page.waitForTimeout(400);
      }
      if (movimento === 'reduce') {
        await page.focus('#a-comercial');
        await page.keyboard.press('ArrowRight');
        const s1 = await page.evaluate(() => document.activeElement.id + ' selecionada=' + document.querySelector('[role=tab][aria-selected=true]').id + ' painel visível=' + !document.getElementById('p-contratos').hidden + ' imagem=' + document.querySelector('#p-contratos img').currentSrc.split('/').pop());
        await page.keyboard.press('End');
        const s2 = await page.evaluate(() => document.activeElement.id + ' ' + location.hash);
        await page.keyboard.press('Home');
        const s3 = await page.evaluate(() => document.activeElement.id);
        await page.keyboard.press('Tab');
        const s4 = await page.evaluate(() => document.activeElement.id);
        teclado.push(`${tam}: seta à direita -> ${s1}; End -> ${s2}; Home -> ${s3}; Tab sai das abas para -> ${s4}`);
        for (const aba of ['contratos', 'juridico', 'financeiro']) {
          await page.click('#a-' + aba);
          await page.waitForTimeout(250);
          await conferir(page, `aba ${aba}`, res, tam);
          if (aba === 'financeiro') await (await page.$('#por-dentro')).screenshot({ path: path.join(tmp, `site-abas-financeiro-${tam}.png`) });
        }
        await page.click('#a-comercial');
        await page.waitForTimeout(250);
        await (await page.$('#por-dentro')).screenshot({ path: path.join(tmp, `site-abas-comercial-${tam}.png`) });
        if (tam === 'celular') {
          await page.click('.menu-cel summary');
          await page.waitForTimeout(200);
          await conferir(page, 'menu do celular aberto', res, tam);
        }
      }
      await ctx.close();
    }
  }
  fs.writeFileSync(path.join(dir, '_conferencia.json'), JSON.stringify({ quando: new Date().toISOString(), axe: require(AXE.replace('axe.min.js', 'package.json')).version, regras: 'wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa', resultados: res, erros, teclado }, null, 1));
  console.log('erros de script:', erros.length ? erros : 'nenhum');
  console.log(teclado.join('\n'));
  await browser.close();
})();
