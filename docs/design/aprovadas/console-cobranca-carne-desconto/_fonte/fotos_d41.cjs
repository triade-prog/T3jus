// Capturas (PNG com deviceScaleFactor 2, depois WebP) + axe (WCAG 2.0, 2.1 e 2.2, A e AA)
// + conferência de rolagem lateral, alvos menores que 44 px e erros de script.
// Junta o fotos.cjs do Portal v1 (barra de baixo no fim da captura do celular) e o do Suporte (alvos).
// AXE_DIR = pasta node_modules com @axe-core/playwright, jsqr e pngjs. Uso: node fotos_177.cjs <pasta-saida> [filtro]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const AXE_DIR = process.env.AXE_DIR || path.join(__dirname, 'node_modules');
const { AxeBuilder } = require(path.join(AXE_DIR, '@axe-core/playwright'));
const jsQR = require(path.join(AXE_DIR, 'jsqr'));
const { PNG } = require(path.join(AXE_DIR, 'pngjs'));
const { execFileSync } = require('child_process');
const dir = path.resolve(process.argv[2] || '..');
const filtro = process.argv[3] || '';
const casos = JSON.parse(fs.readFileSync(path.join(__dirname, 'casos_d41.json'), 'utf8'));

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
      // Alvos visíveis menores que 44 px (o botão compacto das tabelas no computador tem 36 px, como no aprovado)
      const pequenos = await page.evaluate(() => {
        const sel = 'a[href],button,input,select,textarea,summary,[role=button]';
        const raiz = document.querySelector('dialog[open]') || document;
        return [...raiz.querySelectorAll(sel)].filter(e => {
          const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false;
          const st = getComputedStyle(e); if (st.visibility === 'hidden') return false;
          if (e.matches('input[type=checkbox],input[type=radio]')) return false; // o rótulo inteiro é o alvo
          if (e.closest('.trilha') || e.closest('p') && e.tagName === 'A') return false; // link dentro de texto (exceção da WCAG 2.5.8)
          if (e.matches('.cartao a.c-nome')) return false; // o ::after do link cobre o cartão inteiro: o alvo é o cartão (padrão aprovado do Console)
          return r.height < 24 || r.width < 24 || (r.height < 44 && !e.classList.contains('btn-compacto'));
        }).map(e => (e.className.baseVal !== undefined ? e.tagName : (e.className || e.tagName)) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height) + ' "' + (e.textContent || '').trim().slice(0, 30) + '"');
      });
      const png = path.join(dir, `${c.nome}-${tam}.png`);
      if (tam === 'celular' && !temJanela) {
        // A barra de baixo é fixa: a captura usa uma janela da altura da página, para a barra aparecer no fim, como no aparelho.
        const h = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.setViewportSize({ width: vp.width, height: h });
        await page.waitForTimeout(150);
        await page.screenshot({ path: png });
        await page.setViewportSize(vp);
      } else {
        if (temJanela) {
          // F3.156 (igual na F3.177): a captura é longa, com a janela inteira à vista (a peça nova fica no meio da coluna e sairia do quadro).
          // A janela cresce até caber o corpo sem rolagem; a conferência acima e o axe abaixo rodam no tamanho normal.
          const sobra = await page.evaluate(() => Math.max(0, ...[...document.querySelectorAll('dialog[open], dialog[open] *')].filter(e => /(auto|scroll)/.test(getComputedStyle(e).overflowY)).map(e => e.scrollHeight - e.clientHeight)));
          await page.setViewportSize({ width: vp.width, height: vp.height + sobra + 40 });
          await page.waitForTimeout(200);
          await page.evaluate(() => document.querySelectorAll('dialog[open], dialog[open] *').forEach(e => { if (e.scrollTop) e.scrollTop = 0; }));
          await page.screenshot({ path: png });
          await page.setViewportSize(vp);
          await page.waitForTimeout(150);
        } else {
          await page.screenshot({ path: png, fullPage: true });
        }
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
  // PDFs de exemplo (Chromium, A4)
  const pdfs = [];
  if (!filtro) {
    const ctx = await browser.newContext(); const page = await ctx.newPage();
    for (const [arq, est, pdf] of [['carne-a4.html', 'carne-desconto', 'carne-desconto-exemplo.pdf'], ['fatura-a4.html', 'fatura-carne-desconto', 'fatura-carne-desconto-exemplo.pdf'], ['recibo-a4.html', 'recibo-carne-desconto', 'recibo-carne-desconto-exemplo.pdf']]) {
      await page.goto('file://' + path.join(dir, arq) + '?estado=' + est); await page.evaluate(() => document.fonts.ready);
      const esperado = await page.evaluate(() => [...document.querySelectorAll('#slot code')].map(c => c.textContent).filter(t => t.startsWith('000201')));
      await page.pdf({ path: path.join(dir, pdf), format: 'A4', printBackground: true, preferCSSPageSize: true });
      const info = execFileSync('pdfinfo', [path.join(dir, pdf)]).toString();
      const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'd41-pdf-'));
      execFileSync('pdftoppm', ['-r', '200', '-png', path.join(dir, pdf), path.join(TMP, 'p')]);
      const lidos = [];
      fs.readdirSync(TMP).filter(f => f.endsWith('.png')).sort().forEach(f => lidos.push(...lerQRs(path.join(TMP, f))));
      fs.rmSync(TMP, { recursive: true, force: true });
      const r = { pdf, paginas: Number((info.match(/Pages:\s+(\d+)/) || [])[1]), tamanho: (info.match(/Page size:\s+([^\n]+)/) || [])[1],
        qr_esperados: esperado.length, qr_lidos: lidos.length, qr_iguais_ao_copia_e_cola: esperado.filter(e => lidos.includes(e)).length };
      console.log(JSON.stringify(r));
      pdfs.push(r);
    }
    await ctx.close();
  }
  // Contraste (WCAG 2.2 AA) dos pares de cor que o desenho acrescenta
  const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const rz = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100; };
  const contraste = [
    ['selo “com desconto de entrada”: #4F1D35 sobre #F2CDB3', '#4F1D35', '#F2CDB3', 4.5],
    ['selo no canhoto pago: #4F1D35 sobre branco', '#4F1D35', '#FFFFFF', 4.5],
    ['valor da parcela: #2A1A22 sobre branco', '#2A1A22', '#FFFFFF', 4.5],
    ['valor cancelado (riscado): #6E5562 sobre #F2ECE8', '#6E5562', '#F2ECE8', 4.5],
    ['nota e legenda das faixas: #6E5562 sobre branco', '#6E5562', '#FFFFFF', 4.5],
    ['motivo escrito pelo sistema: #2A1A22 sobre #F2ECE8', '#2A1A22', '#F2ECE8', 4.5],
    ['selo “Substituído”: #6E5562 sobre #F2ECE8', '#6E5562', '#F2ECE8', 4.5],
    ['PDF, marca “desc.”: #4F1D35 sobre #F2CDB3', '#4F1D35', '#F2CDB3', 4.5],
  ].map(([par, a, b, min]) => ({ par, razao: rz(a, b), minimo: min, ok: rz(a, b) >= min }));
  const resumo = { capturas: res.length, violacoes_axe: res.reduce((s, c) => s + c.viol.length, 0), rolagem_lateral: res.filter(c => c.rolagem > 0).length,
    erros_de_script: res.reduce((s, c) => s + c.erros.length, 0), alvos_menores_que_44: res.reduce((s, c) => s + c.pequenos.length, 0),
    contraste_ok: contraste.every(c => c.ok), qr_ok: pdfs.every(p => p.qr_esperados === p.qr_iguais_ao_copia_e_cola), pdfs };
  console.log('resumo', JSON.stringify(resumo));
  fs.writeFileSync(path.join(dir, '_conferencia.json'), JSON.stringify({ resumo, contraste, capturas: res }, null, 1));
  await browser.close();
})();
