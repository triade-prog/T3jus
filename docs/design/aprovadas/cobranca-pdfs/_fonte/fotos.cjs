// Cobrança em PDF (CO-06, F1.21): os três PDFs de exemplo, as miniaturas, as capturas (computador 1440 e celular 390),
// a leitura de volta dos QR Codes dos PDFs e as conferências: axe (WCAG 2.0, 2.1 e 2.2, A e AA), rolagem lateral,
// alvos menores que 44 px e erros de script. Baseado no fotos.cjs do carnê aprovado (portal-carne).
// Uso: node fotos.cjs <pasta-saida> [--pdf | --capturas | filtro]
// AXE_DIR = pasta node_modules com @axe-core/playwright, jsqr e pngjs.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const AXE_DIR = process.env.AXE_DIR || path.join(__dirname, 'node_modules');
const { AxeBuilder } = require(path.join(AXE_DIR, '@axe-core/playwright'));
const jsQR = require(path.join(AXE_DIR, 'jsqr'));
const { PNG } = require(path.join(AXE_DIR, 'pngjs'));
const dir = path.resolve(process.argv[2] || '..');
const modo = process.argv[3] || '';
const filtro = modo.startsWith('--') ? '' : modo;
const casos = JSON.parse(fs.readFileSync(path.join(__dirname, 'casos.json'), 'utf8'));
const ESCALA = Number(process.env.ESCALA || 2);
const TMP = process.env.TMP_PDF || fs.mkdtempSync('/tmp/t3jus-cobpdf-');

function lerQRs(png) {
  // lê todos os QR de uma página: a página inteira e depois em recortes (3 faixas × 2 metades, com sobra),
  // porque o jsQR acha um código por imagem. Devolve os textos sem repetição.
  const img = PNG.sync.read(fs.readFileSync(png));
  const achados = new Set();
  const ler = (x0, y0, w, h) => {
    const d = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) d.set(img.data.subarray(((y0 + y) * img.width + x0) * 4, ((y0 + y) * img.width + x0 + w) * 4), y * w * 4);
    const r = jsQR(d, w, h, { inversionAttempts: 'dontInvert' });
    if (r && r.data.length >= 10) achados.add(r.data); // descarta leitura vazia (falso positivo do jsQR em recortes)
  };
  ler(0, 0, img.width, img.height);
  const H = Math.floor(img.height / 3), W = Math.floor(img.width / 2), s = Math.floor(img.height / 30);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
    const x0 = Math.max(0, c * W - s), y0 = Math.max(0, r * H - s);
    ler(x0, y0, Math.min(img.width - x0, W + 2 * s), Math.min(img.height - y0, H + 2 * s));
  }
  return [...achados];
}

(async () => {
  const browser = await chromium.launch();
  const conf = { pdfs: [], capturas: [] };
  const antigo = path.join(dir, '_conferencia.json');
  // guarda o que as outras etapas já conferiram (PDFs ou capturas) e refaz só a etapa desta chamada
  if (fs.existsSync(antigo)) Object.assign(conf, JSON.parse(fs.readFileSync(antigo, 'utf8')));

  // 1. PDFs reais (Chromium), páginas, texto em cada página, QR lidos de volta; e as miniaturas das folhas
  if (!filtro && modo !== '--capturas') {
    conf.pdfs = [];
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 1200 }, deviceScaleFactor: 520 / 794 });
    const page = await ctx.newPage();
    for (const [arq, est, pdf] of [['fatura-a4.html', 'padrao', 'fatura-exemplo.pdf'], ['recibo-a4.html', 'padrao', 'recibo-exemplo.pdf'], ['carne-a4.html', 'padrao', 'carne-exemplo.pdf']]) {
      await page.goto('file://' + path.join(dir, arq) + '?estado=' + est);
      await page.evaluate(() => document.fonts.ready);
      const esperado = await page.evaluate(() => [...document.querySelectorAll('#slot code')].map(c => c.textContent).filter(t => t.startsWith('000201')));
      const folhas = await page.evaluate(() => document.querySelectorAll('#slot .dp-folha').length);
      await page.pdf({ path: path.join(dir, pdf), format: 'A4', printBackground: true, preferCSSPageSize: true });
      const info = execFileSync('pdfinfo', [path.join(dir, pdf)]).toString();
      const paginas = Number((info.match(/Pages:\s+(\d+)/) || [])[1]);
      const tamanho = (info.match(/Page size:\s+([^\n]+)/) || [])[1];
      const pre = path.join(TMP, pdf.replace('.pdf', ''));
      execFileSync('pdftoppm', ['-r', '200', '-png', path.join(dir, pdf), pre]);
      const pngs = fs.readdirSync(TMP).filter(f => f.startsWith(path.basename(pre) + '-') && f.endsWith('.png')).sort();
      const lidos = [], vazias = [];
      pngs.forEach((f, i) => {
        lidos.push(...lerQRs(path.join(TMP, f)));
        const t = execFileSync('pdftotext', ['-f', String(i + 1), '-l', String(i + 1), path.join(dir, pdf), '-']).toString().trim();
        if (t.length < 20) vazias.push(i + 1);
      });
      const certos = esperado.filter(e => lidos.includes(e)).length;
      const r = { pdf, folhas_no_html: folhas, paginas, tamanho, paginas_em_branco: vazias, qr_esperados: esperado.length, qr_lidos: lidos.length, qr_iguais_ao_copia_e_cola: certos };
      conf.pdfs.push(r);
      console.log(JSON.stringify(r));
    }
    // miniaturas da primeira folha de cada estado dos três modelos
    for (const c of casos.filter(c => c.a4)) {
      await page.goto('file://' + path.join(dir, c.url.split('?')[0]) + '?' + c.url.split('?')[1]);
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: '.dp-barra,.dp-var,.dp-aviso-tela{display:none!important}' });
      await page.locator('#slot .dp-folha').first().screenshot({ path: path.join(dir, c.nome + '-miniatura.png') });
    }
    await ctx.close();
    console.log('PDFs e miniaturas ok');
  }
  if (modo === '--pdf') { fs.writeFileSync(antigo, JSON.stringify(conf, null, 1)); await browser.close(); return; }

  // 2. Capturas e conferências
  const lista = casos.concat([{ nome: 'index', url: 'index.html', so_conferir: true }]);
  conf.capturas = filtro ? conf.capturas.filter(c => !c.nome.includes(filtro)) : [];
  for (const c of lista) {
    if (filtro && !c.nome.includes(filtro)) continue;
    for (const tam of ['computador', 'celular']) {
      const vp = tam === 'computador' ? { width: 1440, height: 900 } : { width: 390, height: 844 };
      const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: ESCALA, reducedMotion: 'reduce', locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
      const page = await ctx.newPage();
      const erros = [];
      page.on('pageerror', e => erros.push(String(e)));
      const [arq, qs] = c.url.split('?');
      await page.goto('file://' + path.join(dir, arq) + (qs ? '?' + qs : ''));
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(400);
      const rolagem = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const pequenos = await page.evaluate(() => {
        const sel = 'a[href],button,input,select,textarea,summary,[role=button]';
        return [...document.querySelectorAll(sel)].filter(e => {
          const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false;
          const st = getComputedStyle(e); if (st.visibility === 'hidden') return false;
          if (e.matches('input[type=checkbox],input[type=radio],input[type=file]')) return false;
          if (e.closest('.trilha') || (e.closest('p,td,dd,li,figcaption') && e.tagName === 'A' && !e.classList.contains('btn'))) return false; // link dentro de texto (exceção da WCAG 2.5.8)
          if (e.closest('.cartao a.c-nome') || e.closest('td a')) return false;
          return r.height < 24 || r.width < 24 || (r.height < 44 && !e.classList.contains('btn-compacto'));
        }).map(e => (e.className.baseVal !== undefined ? e.tagName : (e.className || e.tagName)) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height) + ' "' + (e.textContent || '').trim().slice(0, 30) + '"');
      });
      if (!c.so_conferir) {
        const png = path.join(dir, `${c.nome}-${tam}.png`);
        if (c.foco) {
          const el = page.locator(c.foco + ' >> visible=true').first();
          await el.scrollIntoViewIfNeeded();
          await page.evaluate(m => window.scrollBy(0, -m), tam === 'computador' ? 260 : 150);
          await page.waitForTimeout(150);
          await page.screenshot({ path: png });
        } else if (tam === 'celular') {
          const h = await page.evaluate(() => document.documentElement.scrollHeight);
          await page.setViewportSize({ width: vp.width, height: Math.min(h, 9000) });
          await page.waitForTimeout(150);
          await page.screenshot({ path: png });
          await page.setViewportSize(vp);
        } else {
          await page.screenshot({ path: png, fullPage: true });
        }
      }
      // o axe roda com a página no alto: rolada para a captura, a barra fixa do celular cobre parte dos alvos (falso target-size)
      if (c.foco) { await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(100); }
      let viol = [];
      try {
        const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        viol = r.violations.map(v => `${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')}`);
      } catch (e) { viol = ['axe falhou: ' + e.message]; }
      conf.capturas.push({ nome: c.nome, tam, rolagem, viol, erros, pequenos });
      console.log(`${c.nome} ${tam} rolagem=${rolagem} axe=${viol.length} pequenos=${pequenos.length}${viol.length ? '\n   ' + viol.join('\n   ') : ''}${pequenos.length ? '\n   alvos: ' + pequenos.join(' ; ') : ''}${erros.length ? '\n   JS: ' + erros.join(' ') : ''}`);
      await ctx.close();
    }
  }
  const cap = conf.capturas;
  conf.resumo = { capturas: cap.length, violacoes_axe: cap.reduce((s, c) => s + c.viol.length, 0), rolagem_lateral: cap.filter(c => c.rolagem > 0).length,
    erros_de_script: cap.reduce((s, c) => s + c.erros.length, 0), alvos_pequenos: cap.reduce((s, c) => s + c.pequenos.length, 0) };
  fs.writeFileSync(antigo, JSON.stringify(conf, null, 1));
  console.log('resumo', JSON.stringify(conf.resumo));
  await browser.close();
})();
