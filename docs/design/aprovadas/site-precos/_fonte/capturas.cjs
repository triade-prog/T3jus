// Capturas do desenho de "Planos e preços" (1440 e 390 px, deviceScaleFactor 2) e conferência:
// axe-core (WCAG 2.0, 2.1 e 2.2, A e AA), rolagem lateral, alvos de toque menores que 44 px,
// texto cortado ou sobreposto nos cartões, erros de script. Relógio parado em 27/11/2026, 10h00.
// Uso: node capturas.cjs <pasta-do-desenho> <pasta-png-temporaria>
const { chromium } = require(process.env.PW_MOD || 'playwright');
const path = require('path'), fs = require('fs');
const AXE = process.env.AXE || path.join(__dirname, 'node_modules/axe-core/axe.min.js');
const dir = path.resolve(process.argv[2] || '..');
const tmp = path.resolve(process.argv[3] || path.join(dir, '_png'));
fs.mkdirSync(tmp, { recursive: true });
const axeSrc = fs.existsSync(AXE) ? fs.readFileSync(AXE, 'utf8') : null;
const res = [], erros = [];

async function conferir(page, rotulo, tam) {
  const r0 = await page.evaluate((tam) => {
    const de = document.documentElement;
    const rolagem = de.scrollWidth - de.clientWidth;
    const min = tam === 'celular' ? 44 : 40;
    const pequenos = [...document.querySelectorAll('a[href],button,input,select,textarea,summary')].filter((e) => {
      const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false;
      if (e.matches('.pular')) return false;
      const st = getComputedStyle(e); if (st.visibility === 'hidden' || st.display === 'none') return false;
      // links dentro de texto corrido contam pela linha (WCAG 2.5.8, exceção de texto em linha)
      if (e.tagName === 'A' && getComputedStyle(e).display === 'inline') return false;
      return r.height < min;
    }).map((e) => e.tagName + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height) + ' "' + (e.textContent || '').trim().slice(0, 30) + '"');
    // texto que passa da caixa (cortado) em elementos com overflow escondido ou mais largo que a tela
    const largos = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.right > de.clientWidth + 1 && !e.closest('.abertura,.estatua,svg,.cham-bloco::before,.sr') && getComputedStyle(e).position !== 'fixed'; }).slice(0, 5).map((e) => e.tagName + '.' + e.className);
    return { rolagem, pequenos, largos };
  }, tam);
  let viol = [], inc = [];
  if (axeSrc) {
    if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: axeSrc });
    const r = await page.evaluate(async () => await axe.run(document, { preload: false, runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
    viol = r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ') + ' ' + (n.failureSummary || '').replace(/\s+/g, ' ').slice(0, 160)).join(' | ')}`);
    inc = r.incomplete.map((v) => v.id);
  }
  res.push({ estado: rotulo, tam, ...r0, viol, incompletas: inc });
  console.log(`${tam} ${rotulo}: rolagem=${r0.rolagem} axe=${viol.length} pequenos=${r0.pequenos.length} largos=${r0.largos.length}${viol.length ? '\n  ' + viol.join('\n  ') : ''}${r0.pequenos.length ? '\n  alvos: ' + r0.pequenos.join(' ; ') : ''}${r0.largos.length ? '\n  largos: ' + r0.largos.join(' ; ') : ''}`);
}

async function abrir(browser, tam, arq, movimento = 'reduce') {
  const vp = tam === 'computador' ? { width: 1440, height: 900 } : { width: 390, height: 844 };
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: tam === 'celular', hasTouch: tam === 'celular', reducedMotion: movimento, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-11-27T10:00:00-03:00'));
  page.on('pageerror', (e) => erros.push(`${tam} ${arq}: ${e}`));
  page.on('console', (m) => { if (m.type() === 'error') erros.push(`${tam} ${arq} console: ${m.text()}`); });
  await page.goto('file://' + path.join(dir, arq));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(movimento === 'reduce' ? 300 : 1400);
  return { ctx, page };
}

async function elemento(page, sel, nome, margem = 0) {
  await page.addStyleTag({ content: '.topo{position:relative!important}' });
  const el = await page.$(sel);
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  if (!margem) return el.screenshot({ path: path.join(tmp, nome + '.png') });
  const b = await el.boundingBox();
  await page.screenshot({ path: path.join(tmp, nome + '.png'), fullPage: true, clip: { x: 0, y: Math.max(0, b.y + (await page.evaluate(() => scrollY)) - margem), width: page.viewportSize().width, height: b.height + 2 * margem } });
}

(async () => {
  const browser = await chromium.launch();
  for (const tam of ['computador', 'celular']) {
    // 1. página inteira, estado de hoje (parada, "menos movimento": nada fica para entrar)
    let { ctx, page } = await abrir(browser, tam, 'precos.html');
    await page.screenshot({ path: path.join(tmp, `precos-hoje-${tam}.png`), fullPage: true });
    await conferir(page, 'página de hoje (sem formulário, sem teste, sem desconto)', tam);
    // 2. abertura e cartões de perto
    const fim = await page.evaluate(() => { const r = document.querySelector('.planos-pe').getBoundingClientRect(); return Math.ceil(r.bottom + scrollY + 24); });
    await page.screenshot({ path: path.join(tmp, `precos-abertura-planos-${tam}.png`), fullPage: true, clip: { x: 0, y: 0, width: page.viewportSize().width, height: fim } });
    // 3 a 6. seções de perto
    await elemento(page, '#incluido', `precos-incluido-${tam}`);
    await elemento(page, '#pagamento', `precos-pagamento-${tam}`);
    await elemento(page, '.cham', `precos-chamada-${tam}`);
    if (tam === 'celular') {
      await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(200);
      await page.click('.menu-cel summary'); await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(tmp, `precos-menu-${tam}.png`) });
      await conferir(page, 'menu do celular aberto', tam);
    }
    await ctx.close();

    // perguntas abertas
    ({ ctx, page } = await abrir(browser, tam, '_precos-perguntas-abertas.html'));
    await elemento(page, '#perguntas', `precos-perguntas-${tam}`);
    await conferir(page, 'perguntas frequentes abertas', tam);
    await ctx.close();

    // estado completo e a tabela com a frase do desconto
    ({ ctx, page } = await abrir(browser, tam, 'precos-completo.html'));
    await page.screenshot({ path: path.join(tmp, `precos-completo-${tam}.png`), fullPage: true });
    await conferir(page, 'página completa (teste, desconto, formulário e Inter ligados)', tam);
    await elemento(page, '#por-pessoas', `precos-tabela-${tam}`);
    await ctx.close();

    for (const [arq, nome] of [['chaves.html', 'chaves'], ['chamadas.html', 'chamadas']]) {
      ({ ctx, page } = await abrir(browser, tam, arq));
      await page.screenshot({ path: path.join(tmp, `precos-${nome}-${tam}.png`), fullPage: true });
      await conferir(page, `prancha ${nome}`, tam);
      await ctx.close();
    }

    // com movimento: a página no meio da rolagem, para conferir que nada fica escondido nem sobreposto
    ({ ctx, page } = await abrir(browser, tam, 'precos.html', 'no-preference'));
    const h = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < h; y += 300) { await page.evaluate((y) => scrollTo(0, y), y); await page.waitForTimeout(60); }
    await page.evaluate(() => { const e = document.querySelector('#por-pessoas'); scrollTo(0, e.getBoundingClientRect().top + scrollY - 140); });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(tmp, `precos-rolagem-${tam}.png`) });
    await conferir(page, 'com movimento, rolada até a tabela', tam);
    await ctx.close();
  }
  // menu do topo no computador: a prancha com os quadros em 1440, 1021 e 900 px
  {
    const { ctx, page } = await abrir(browser, 'computador', 'menu.html');
    await page.waitForTimeout(500);
    const alt = await page.evaluate(() => document.querySelector('main').getBoundingClientRect().bottom + scrollY);
    await page.screenshot({ path: path.join(tmp, 'precos-menu-computador.png'), fullPage: true, clip: { x: 0, y: 0, width: 1440, height: Math.ceil(alt) } });
    await ctx.close();
    for (const w of [1440, 1021]) {
      const c2 = await browser.newContext({ viewport: { width: w, height: 300 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
      const p2 = await c2.newPage(); await p2.goto('file://' + path.join(dir, 'precos.html'));
      const linha = await p2.evaluate(() => { const m = [...document.querySelectorAll('.menu a')].filter((a) => a.offsetWidth); const tops = new Set(m.map((a) => Math.round(a.getBoundingClientRect().top))); const r = document.querySelector('.menu').getBoundingClientRect(); return { itens: m.map((a) => a.textContent.trim()), linhas: tops.size, direita: Math.round(r.right), largura: innerWidth }; });
      console.log(`menu em ${w}px:`, JSON.stringify(linha));
      res.push({ estado: `menu em ${w}px`, ...linha });
      await c2.close();
    }
  }
  fs.writeFileSync(path.join(tmp, '_conferencia.json'), JSON.stringify({ quando: '2026-11-27T10:00:00-03:00', axe: axeSrc ? require(AXE.replace('axe.min.js', 'package.json')).version : 'ausente', regras: 'wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa', resultados: res, erros }, null, 1));
  console.log('erros de script:', erros.length ? erros : 'nenhum');
  await browser.close();
})();
